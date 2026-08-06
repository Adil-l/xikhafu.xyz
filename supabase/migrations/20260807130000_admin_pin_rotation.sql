create or replace function public.admin_change_pin(p_current_pin text, p_new_pin text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_new_pin is null or p_new_pin !~ '^[0-9]{4,8}$' or not public.private_check_admin_pin(p_current_pin) then return false; end if;
  update public.app_settings set admin_pin_hash=crypt(p_new_pin, gen_salt('bf')), admin_failed_attempts=0,
    admin_locked_until=null, updated_at=now() where singleton;
  return found;
end;
$$;

revoke all on function public.admin_change_pin(text,text) from public;
grant execute on function public.admin_change_pin(text,text) to anon, authenticated;
