-- Record administrative balance deductions as signed ledger movements so they
-- remain auditable and cannot be overwritten by a stale monthly-balance sync.
alter table public.app_recharges
  drop constraint if exists app_recharges_amount_check;

alter table public.app_recharges
  add constraint app_recharges_amount_check
  check (amount <> 0 and abs(amount) <= 1000000);

create or replace function public.protect_balance_movement() returns trigger
language plpgsql set search_path = public as $$
begin
  if (old.amount < 0) <> (new.amount < 0) then
    raise exception 'balance movement direction cannot be changed';
  end if;
  if old.amount < 0 and (
    new.user_id is distinct from old.user_id
    or new.amount is distinct from old.amount
    or new.note is distinct from old.note
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'administrative balance deductions are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists app_recharges_movement_guard on public.app_recharges;
create trigger app_recharges_movement_guard
before update of user_id, amount, note, created_at on public.app_recharges
for each row execute function public.protect_balance_movement();

revoke all on function public.protect_balance_movement() from public;

-- A recharge may update only another positive recharge with the same key. A
-- negative movement is immutable and a reused key is reported as a conflict.
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

  begin
    recharge_key := left(trim(coalesce(payload->>'syncKey', '')), 160);
    target_user_id := nullif(payload->>'userId', '')::bigint;
    recharge_amount := nullif(payload->>'amount', '')::numeric;
    recharge_note := left(coalesce(nullif(trim(payload->>'note'), ''), 'Recarga'), 200);
  exception when invalid_text_representation or numeric_value_out_of_range then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end;

  if length(recharge_key) not between 8 and 160
    or target_user_id is null
    or recharge_amount is null
    or recharge_amount <= 0
    or recharge_amount > 1000000
    or recharge_amount <> round(recharge_amount, 2)
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
    and public.app_recharges.amount > 0
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

create or replace function public.admin_deduct_balance(p_admin_pin text, payload jsonb) returns jsonb
language plpgsql security definer
set search_path = public
set timezone = 'Africa/Maputo' as $$
declare
  movement_id bigint;
  movement_key text;
  movement_date timestamptz := now();
  target_user public.app_users;
  target_user_id bigint;
  deduction_amount numeric;
  deduction_note text;
  cutoff timestamptz;
  available numeric;
  existing_movement public.app_recharges;
begin
  if not public.private_check_admin_pin(p_admin_pin) then
    return jsonb_build_object('ok', false, 'reason', 'unauthorized');
  end if;
  if payload is null or jsonb_typeof(payload) <> 'object' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  movement_key := left(trim(coalesce(payload->>'syncKey', '')), 160);
  deduction_note := left(
    coalesce(nullif(trim(payload->>'note'), ''), 'Desconto administrativo'),
    200
  );

  begin
    target_user_id := nullif(payload->>'userId', '')::bigint;
    deduction_amount := nullif(payload->>'amount', '')::numeric;
  exception when invalid_text_representation or numeric_value_out_of_range then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end;

  if length(movement_key) not between 8 and 160
    or target_user_id is null
    or deduction_amount is null
    or deduction_amount <= 0
    or deduction_amount > 1000000
    or deduction_amount <> trunc(deduction_amount) then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select * into target_user
  from public.app_users
  where user_id = target_user_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  -- A retry with the same key is successful only when it is the same movement.
  select * into existing_movement
  from public.app_recharges
  where sync_key = movement_key;

  cutoff := greatest(
    date_trunc('month', now()),
    coalesce(target_user.balance_reset_at, '-infinity'::timestamptz)
  );
  available := target_user.monthly_balance
    + coalesce((
        select sum(r.amount)
        from public.app_recharges r
        where r.user_id = target_user_id and r.created_at >= cutoff
      ), 0)
    - coalesce((
        select sum(public.private_order_total(o))
        from public.app_orders o
        where o.user_id = target_user_id
          and o.ordered_at >= cutoff
          and o.status <> 'cancelled'
      ), 0)
    - coalesce((
        select sum(d.amount)
        from public.app_donations d
        where d.user_id = target_user_id and d.created_at >= cutoff
      ), 0);

  if existing_movement.id is not null then
    if existing_movement.user_id = target_user_id
      and existing_movement.amount = -deduction_amount
      and existing_movement.note = deduction_note then
      return jsonb_build_object(
        'ok', true,
        'id', existing_movement.id,
        'date', existing_movement.created_at,
        'amount', existing_movement.amount,
        'available', available
      );
    end if;
    return jsonb_build_object('ok', false, 'reason', 'conflict');
  end if;

  if available < deduction_amount then
    return jsonb_build_object(
      'ok', false,
      'reason', 'insufficient',
      'available', available
    );
  end if;

  insert into public.app_recharges(sync_key, user_id, created_at, amount, note, updated_at)
  values(movement_key, target_user_id, movement_date, -deduction_amount, deduction_note, movement_date)
  on conflict(sync_key) do nothing
  returning id into movement_id;

  if movement_id is null then
    return jsonb_build_object('ok', false, 'reason', 'conflict');
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', movement_id,
    'date', movement_date,
    'amount', -deduction_amount,
    'available', available - deduction_amount
  );
exception when others then
  return jsonb_build_object('ok', false, 'reason', 'server_error');
end;
$$;

revoke all on function public.admin_deduct_balance(text, jsonb) from public;
grant execute on function public.admin_deduct_balance(text, jsonb) to anon, authenticated;

-- Balance periods follow the same Maputo calendar month used by the browser.
-- This closes the two-hour UTC/Maputo gap around the first day of each month.
alter function public.submit_user_order(bigint, text, jsonb)
  set timezone to 'Africa/Maputo';
alter function public.enforce_new_user_order_balance()
  set timezone to 'Africa/Maputo';
alter function public.sync_user_operational_state(bigint, text, jsonb)
  set timezone to 'Africa/Maputo';
