-- Keep recharge creation independent from the full administrative state sync.
-- This makes the operation idempotent and prevents an unrelated stale order
-- from rolling back a valid recharge.
create or replace function public.admin_add_recharge(p_admin_pin text, payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  recharge_id bigint;
  recharge_key text;
  target_user_id bigint;
  recharge_amount numeric;
  recharge_note text;
  recharge_date timestamptz := now();
begin
  if not public.private_check_admin_pin(p_admin_pin) then
    return jsonb_build_object('ok', false, 'reason', 'unauthorized');
  end if;
  if payload is null or jsonb_typeof(payload) <> 'object' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  recharge_key := left(trim(coalesce(payload->>'syncKey', '')), 160);
  target_user_id := nullif(payload->>'userId', '')::bigint;
  recharge_amount := nullif(payload->>'amount', '')::numeric;
  recharge_note := left(coalesce(nullif(trim(payload->>'note'), ''), 'Recarga'), 200);

  if length(recharge_key) not between 8 and 160
    or target_user_id is null
    or recharge_amount is null
    or recharge_amount <= 0
    or recharge_amount > 1000000
    or not exists (select 1 from public.app_users where user_id = target_user_id) then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  insert into public.app_recharges(sync_key, user_id, created_at, amount, note, updated_at)
  values(recharge_key, target_user_id, recharge_date, recharge_amount, recharge_note, recharge_date)
  on conflict(sync_key) do update
    set amount = excluded.amount,
        note = excluded.note,
        updated_at = excluded.updated_at
  where public.app_recharges.user_id = excluded.user_id
  returning id, created_at into recharge_id, recharge_date;

  if recharge_id is null then
    return jsonb_build_object('ok', false, 'reason', 'conflict');
  end if;
  return jsonb_build_object('ok', true, 'id', recharge_id, 'date', recharge_date);
exception when others then
  return jsonb_build_object('ok', false, 'reason', 'server_error');
end;
$$;

revoke all on function public.admin_add_recharge(text, jsonb) from public;
grant execute on function public.admin_add_recharge(text, jsonb) to anon, authenticated;
