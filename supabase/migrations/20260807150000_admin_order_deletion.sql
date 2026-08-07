create table if not exists public.app_order_tombstones (
  sync_key text primary key,
  deleted_at timestamptz not null default now()
);

alter table public.app_order_tombstones enable row level security;
revoke all on public.app_order_tombstones from anon, authenticated;

create or replace function public.reject_deleted_operational_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_TABLE_NAME = 'app_orders' then
    if exists (
      select 1 from public.app_order_tombstones
      where sync_key = NEW.sync_key
    ) then
      return null;
    end if;
  elsif TG_TABLE_NAME = 'app_donations' then
    if NEW.order_sync_key is not null and exists (
      select 1 from public.app_order_tombstones
      where sync_key = NEW.order_sync_key
    ) then
      return null;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists app_orders_deleted_order_guard on public.app_orders;
create trigger app_orders_deleted_order_guard
before insert or update on public.app_orders
for each row execute function public.reject_deleted_operational_order();

drop trigger if exists app_donations_deleted_order_guard on public.app_donations;
create trigger app_donations_deleted_order_guard
before insert or update on public.app_donations
for each row execute function public.reject_deleted_operational_order();

create or replace function public.admin_delete_order(p_admin_pin text, p_sync_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_key text := left(trim(coalesce(p_sync_key, '')), 160);
  affected integer;
begin
  if not public.private_check_admin_pin(p_admin_pin)
     or length(normalized_key) not between 8 and 160 then
    return false;
  end if;

  insert into public.app_order_tombstones(sync_key)
  values (normalized_key)
  on conflict (sync_key) do nothing;

  delete from public.app_donations
  where order_sync_key = normalized_key;

  delete from public.app_orders
  where sync_key = normalized_key;

  get diagnostics affected = row_count;
  return affected > 0;
exception when others then
  return false;
end;
$$;

revoke all on function public.reject_deleted_operational_order() from public;
revoke all on function public.admin_delete_order(text,text) from public;
grant execute on function public.admin_delete_order(text,text) to anon, authenticated;
