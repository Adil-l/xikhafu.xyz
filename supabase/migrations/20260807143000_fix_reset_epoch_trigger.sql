create or replace function public.reject_stale_operational_data() returns trigger
language plpgsql security definer set search_path = public as $$
declare reset_at timestamptz;
begin
  select operational_reset_at into reset_at from public.app_settings where singleton;
  if TG_TABLE_NAME = 'app_orders' then
    if NEW.ordered_at < reset_at then raise exception 'stale operational order rejected'; end if;
  elsif TG_TABLE_NAME in ('app_recharges', 'app_donations') then
    if NEW.created_at < reset_at then raise exception 'stale operational record rejected'; end if;
  end if;
  return NEW;
end;
$$;

revoke all on function public.reject_stale_operational_data() from public;
