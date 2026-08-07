create or replace function public.admin_set_guest_ordering(p_admin_pin text, p_enabled boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.private_check_admin_pin(p_admin_pin) then return false; end if;
  update public.app_settings
    set guest_ordering=coalesce(p_enabled,false), updated_at=now()
    where singleton;
  return found;
exception when others then return false;
end;
$$;

revoke all on function public.admin_set_guest_ordering(text,boolean) from public;
grant execute on function public.admin_set_guest_ordering(text,boolean) to anon, authenticated;
