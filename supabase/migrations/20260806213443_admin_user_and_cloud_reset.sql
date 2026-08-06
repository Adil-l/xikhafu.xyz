create function public.admin_upsert_app_user(p_admin_pin text, p_user_id bigint, p_user_name text, p_avatar text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.private_check_admin_pin(p_admin_pin) then return false; end if;
  if p_user_id is null or length(trim(coalesce(p_user_name,''))) < 2 then return false; end if;
  insert into public.app_users (user_id,user_name,avatar)
  values (p_user_id,left(trim(p_user_name),100),left(coalesce(nullif(trim(p_avatar),''),'🙂'),16))
  on conflict (user_id) do update set user_name=excluded.user_name,avatar=excluded.avatar,updated_at=now();
  return true;
end;
$$;

revoke all on function public.admin_upsert_app_user(text,bigint,text,text) from public;
grant execute on function public.admin_upsert_app_user(text,bigint,text,text) to anon, authenticated;
