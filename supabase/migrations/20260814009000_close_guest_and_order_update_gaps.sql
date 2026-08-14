-- Guest orders can only be created by the authenticated administrative flow.
update public.app_settings
set guest_ordering = false,
    updated_at = now()
where singleton;

revoke all on function public.submit_guest_order(jsonb) from public, anon, authenticated;

-- Keep the public Hall aligned with the reduced menu (no removed drink category).
create or replace function public.load_public_app_hall() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', user_id,
    'status', status,
    'total', total,
    'bread_qty', bread_qty,
    'badjia_qty', badjia_qty,
    'salgados_qty', salgados_qty
  )), '[]'::jsonb)
  from (
    select o.user_id, o.status, sum(public.private_order_total(o)) total,
      sum((select coalesce(sum((item->>'qty')::integer), 0) from jsonb_array_elements(o.items) item where (item->>'productId')::bigint = 1)) bread_qty,
      sum((select coalesce(sum((item->>'qty')::integer), 0) from jsonb_array_elements(o.items) item where (item->>'productId')::bigint = 2)) badjia_qty,
      sum((select coalesce(sum((item->>'qty')::integer), 0) from jsonb_array_elements(o.items) item where (item->>'productId')::bigint in (5, 6))) salgados_qty
    from public.app_orders o
    where o.order_type = 'user' and o.user_id is not null and o.status <> 'cancelled'
    group by o.user_id, o.status
  ) grouped;
$$;

-- Recheck the user's available balance whenever an existing order changes its
-- billable value or returns from cancelled to an active state.
create or replace function public.enforce_new_user_order_balance() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  u public.app_users;
  cutoff timestamptz;
  available numeric;
begin
  if new.order_type <> 'user' or new.user_id is null or new.status = 'cancelled' then
    return new;
  end if;

  select * into u from public.app_users where user_id = new.user_id for update;
  if not found or not u.active then
    raise exception 'user is not allowed to place orders';
  end if;

  cutoff := greatest(date_trunc('month', now()), coalesce(u.balance_reset_at, '-infinity'::timestamptz));
  available := u.monthly_balance
    + coalesce((select sum(amount) from public.app_recharges where user_id = new.user_id and created_at >= cutoff), 0)
    - coalesce((select sum(public.private_order_total(o)) from public.app_orders o where o.user_id = new.user_id and o.ordered_at >= cutoff and o.status <> 'cancelled'), 0)
    - coalesce((select sum(amount) from public.app_donations where user_id = new.user_id and created_at >= cutoff), 0);

  if tg_op = 'UPDATE'
    and old.order_type = 'user'
    and old.user_id = new.user_id
    and old.status <> 'cancelled'
    and old.ordered_at >= cutoff then
    available := available + public.private_order_total(old);
  end if;

  if available <= 0 or public.private_order_total(new) > available then
    raise exception 'insufficient positive balance for this order';
  end if;
  return new;
end;
$$;

drop trigger if exists app_orders_required_balance_guard on public.app_orders;
create trigger app_orders_required_balance_guard
before insert or update of order_type, user_id, ordered_at, status, items, custom_price
on public.app_orders
for each row execute function public.enforce_new_user_order_balance();
