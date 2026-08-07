alter table public.app_settings
  add column if not exists operational_reset_at timestamptz not null default now();

create or replace function public.reject_stale_operational_data() returns trigger
language plpgsql security definer set search_path = public as $$
declare reset_at timestamptz;
begin
  select operational_reset_at into reset_at from public.app_settings where singleton;
  if TG_TABLE_NAME = 'app_orders' and NEW.ordered_at < reset_at then
    raise exception 'stale operational order rejected';
  end if;
  if TG_TABLE_NAME in ('app_recharges', 'app_donations') and NEW.created_at < reset_at then
    raise exception 'stale operational record rejected';
  end if;
  return NEW;
end;
$$;

drop trigger if exists app_orders_reset_epoch_guard on public.app_orders;
create trigger app_orders_reset_epoch_guard
before insert or update on public.app_orders
for each row execute function public.reject_stale_operational_data();

drop trigger if exists app_recharges_reset_epoch_guard on public.app_recharges;
create trigger app_recharges_reset_epoch_guard
before insert or update on public.app_recharges
for each row execute function public.reject_stale_operational_data();

drop trigger if exists app_donations_reset_epoch_guard on public.app_donations;
create trigger app_donations_reset_epoch_guard
before insert or update on public.app_donations
for each row execute function public.reject_stale_operational_data();

revoke all on function public.reject_stale_operational_data() from public;
