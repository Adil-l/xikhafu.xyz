-- Keep the mandatory positive-balance rule and tomorrow-at-06:00 schedule
-- enforced by the database, not only by the browser.
create or replace function public.submit_user_order(p_user_id bigint, p_pin text, payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  u public.app_users;
  existing public.app_orders;
  total numeric := 0;
  available numeric := 0;
  cutoff timestamptz;
  item jsonb;
  p public.app_products;
  qty numeric;
  unit_price numeric;
  requested_at timestamptz;
  scheduled_at timestamptz;
begin
  if public.private_check_user_pin(p_user_id, p_pin) <> 'ok' then
    return jsonb_build_object('ok', false, 'reason', 'unauthorized');
  end if;
  if payload is null or jsonb_typeof(payload) <> 'object'
    or length(coalesce(payload->>'syncKey','')) not between 8 and 160
    or jsonb_typeof(coalesce(payload->'items','[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(payload->'items','[]'::jsonb)) > 50 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select * into existing from public.app_orders where sync_key = left(payload->>'syncKey', 160);
  if found then
    return jsonb_build_object('ok', true, 'id', existing.id, 'status', existing.status, 'total', public.private_order_total(existing));
  end if;

  requested_at := coalesce(nullif(payload->>'date','')::timestamptz, now());
  scheduled_at := (date_trunc('day', timezone('Africa/Maputo', now())) + interval '1 day 6 hours') at time zone 'Africa/Maputo';
  if timezone('Africa/Maputo', requested_at)::date = timezone('Africa/Maputo', now())::date then
    requested_at := now();
  elsif abs(extract(epoch from requested_at - scheduled_at)) <= 300 then
    requested_at := scheduled_at;
  else
    return jsonb_build_object('ok', false, 'reason', 'invalid_schedule');
  end if;

  select * into u from public.app_users where user_id = p_user_id for update;
  if not found or not u.active then
    return jsonb_build_object('ok', false, 'reason', 'blocked');
  end if;
  for item in select value from jsonb_array_elements(payload->'items') loop
    select * into p from public.app_products where product_id = (item->>'productId')::bigint and active;
    qty := coalesce((item->>'qty')::numeric, 0);
    unit_price := coalesce((item->>'unitPrice')::numeric, 0);
    if not found or qty < 1 or qty > 100 or unit_price <> all(p.allowed_prices) then
      return jsonb_build_object('ok', false, 'reason', 'invalid_price');
    end if;
    total := total + qty * unit_price;
  end loop;

  cutoff := greatest(date_trunc('month', now()), coalesce(u.balance_reset_at, '-infinity'::timestamptz));
  available := u.monthly_balance
    + coalesce((select sum(amount) from public.app_recharges where user_id = p_user_id and created_at >= cutoff), 0)
    - coalesce((select sum(public.private_order_total(o)) from public.app_orders o where o.user_id = p_user_id and o.ordered_at >= cutoff and o.status <> 'cancelled'), 0)
    - coalesce((select sum(amount) from public.app_donations where user_id = p_user_id and created_at >= cutoff), 0);
  if available <= 0 or total > available then
    return jsonb_build_object('ok', false, 'reason', 'insufficient', 'available', available, 'total', total);
  end if;

  insert into public.app_orders(sync_key, order_type, user_id, ordered_at, status, items, custom_request,
    custom_price, needs_contact, guest_donation, updated_at)
  values(left(payload->>'syncKey',160), 'user', p_user_id, requested_at, 'pending', payload->'items',
    left(coalesce(payload->>'customRequest',''),500), 0, coalesce((payload->>'needsContact')::boolean,false), 0, now())
  returning * into existing;
  return jsonb_build_object('ok', true, 'id', existing.id, 'status', existing.status, 'total', total, 'available', available - total);
exception when others then
  return jsonb_build_object('ok', false, 'reason', 'server_error');
end;
$$;

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
  if available <= 0 or public.private_order_total(new) > available then
    raise exception 'insufficient positive balance for this order';
  end if;
  return new;
end;
$$;

drop trigger if exists app_orders_required_balance_guard on public.app_orders;
create trigger app_orders_required_balance_guard
before insert on public.app_orders
for each row execute function public.enforce_new_user_order_balance();
