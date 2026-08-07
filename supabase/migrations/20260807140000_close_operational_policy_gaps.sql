create or replace function public.submit_user_order(p_user_id bigint, p_pin text, payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u public.app_users; existing public.app_orders; total numeric := 0; available numeric := 0;
  cutoff timestamptz; policy text; item jsonb; p public.app_products; qty numeric; unit_price numeric;
begin
  if public.private_check_user_pin(p_user_id, p_pin) <> 'ok' then return jsonb_build_object('ok', false, 'reason', 'unauthorized'); end if;
  if payload is null or jsonb_typeof(payload) <> 'object'
    or length(coalesce(payload->>'syncKey','')) not between 8 and 160
    or jsonb_typeof(coalesce(payload->'items','[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(payload->'items','[]'::jsonb)) > 50 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  select * into existing from public.app_orders where sync_key=left(payload->>'syncKey',160);
  if found then return jsonb_build_object('ok', true, 'id', existing.id, 'status', existing.status, 'total', public.private_order_total(existing)); end if;
  select * into u from public.app_users where user_id=p_user_id for update;
  if not found or not u.active then return jsonb_build_object('ok', false, 'reason', 'blocked'); end if;
  for item in select value from jsonb_array_elements(payload->'items') loop
    select * into p from public.app_products where product_id=(item->>'productId')::bigint and active;
    qty := coalesce((item->>'qty')::numeric, 0); unit_price := coalesce((item->>'unitPrice')::numeric, 0);
    if not found or qty < 1 or qty > 100 or unit_price <> all(p.allowed_prices) then
      return jsonb_build_object('ok', false, 'reason', 'invalid_price');
    end if;
    if p.friday_only and extract(isodow from timezone('Africa/Maputo', now())) <> 5 then
      return jsonb_build_object('ok', false, 'reason', 'friday_only');
    end if;
    total := total + qty * unit_price;
  end loop;
  cutoff := greatest(date_trunc('month', now()), coalesce(u.balance_reset_at, '-infinity'::timestamptz));
  available := u.monthly_balance
    + coalesce((select sum(amount) from public.app_recharges where user_id=p_user_id and created_at >= cutoff),0)
    - coalesce((select sum(public.private_order_total(o)) from public.app_orders o where o.user_id=p_user_id and o.ordered_at >= cutoff and o.status <> 'cancelled'),0)
    - coalesce((select sum(amount) from public.app_donations where user_id=p_user_id and created_at >= cutoff),0);
  select balance_policy into policy from public.app_settings where singleton;
  if policy = 'block' and total > available then
    return jsonb_build_object('ok', false, 'reason', 'insufficient', 'available', available, 'total', total);
  end if;
  insert into public.app_orders(sync_key, order_type, user_id, ordered_at, status, items, custom_request,
    custom_price, needs_contact, guest_donation, updated_at)
  values(left(payload->>'syncKey',160), 'user', p_user_id,
    coalesce((payload->>'date')::timestamptz, now()), case when total > available then 'debt' else 'pending' end,
    payload->'items', left(coalesce(payload->>'customRequest',''),500), 0,
    coalesce((payload->>'needsContact')::boolean,false), 0, now())
  returning * into existing;
  return jsonb_build_object('ok', true, 'id', existing.id, 'status', existing.status, 'total', total, 'available', available-total);
exception when others then
  return jsonb_build_object('ok', false, 'reason', 'server_error');
end;
$$;

create or replace function public.sync_user_operational_state(p_user_id bigint, p_pin text, payload jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
declare u public.app_users; item jsonb; donation_key text; donation_amount numeric; requested numeric := 0;
  cutoff timestamptz; available numeric := 0; donation_created_at timestamptz;
begin
  if public.private_check_user_pin(p_user_id, p_pin) <> 'ok' then return false; end if;
  if payload is null or jsonb_typeof(payload) <> 'object'
    or jsonb_typeof(coalesce(payload->'donations','[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(payload->'donations','[]'::jsonb)) > 100 then return false; end if;
  select * into u from public.app_users where user_id=p_user_id for update;
  if not found or not u.active then return false; end if;
  cutoff := greatest(date_trunc('month', now()), coalesce(u.balance_reset_at, '-infinity'::timestamptz));
  available := u.monthly_balance
    + coalesce((select sum(amount) from public.app_recharges where user_id=p_user_id and created_at >= cutoff),0)
    - coalesce((select sum(public.private_order_total(o)) from public.app_orders o where o.user_id=p_user_id and o.ordered_at >= cutoff and o.status <> 'cancelled'),0)
    - coalesce((select sum(amount) from public.app_donations where user_id=p_user_id and created_at >= cutoff),0);
  for item in select value from jsonb_array_elements(coalesce(payload->'donations','[]'::jsonb)) loop
    donation_key := left(trim(item->>'sync_key'),160);
    donation_amount := (item->>'amount')::numeric;
    if length(donation_key) not between 8 and 160 or donation_amount is null or donation_amount <= 0 or donation_amount > 1000
      or ((item ? 'user_id') and nullif(item->>'user_id','') is not null and (item->>'user_id')::bigint <> p_user_id)
      or ((item->>'created_at')::timestamptz > now() + interval '5 minutes') then return false; end if;
    if not exists (select 1 from public.app_donations d where d.sync_key=donation_key) then requested := requested + donation_amount; end if;
  end loop;
  if requested > available then return false; end if;
  for item in select value from jsonb_array_elements(coalesce(payload->'donations','[]'::jsonb)) loop
    donation_key := left(trim(item->>'sync_key'),160);
    donation_amount := (item->>'amount')::numeric;
    donation_created_at := greatest(cutoff, least(coalesce((item->>'created_at')::timestamptz, now()), now()));
    insert into public.app_donations(sync_key, order_sync_key, user_id, donor_name, amount, created_at, updated_at)
    values(donation_key, left(nullif(item->>'order_sync_key',''),160), p_user_id,
      left(coalesce(nullif(trim(item->>'donor_name'),''),u.user_name),100), donation_amount, donation_created_at, now())
    on conflict(sync_key) do nothing;
  end loop;
  return true;
exception when others then return false;
end;
$$;

create or replace function public.submit_user_donation(p_user_id bigint, p_pin text, payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  if public.sync_user_operational_state(p_user_id, p_pin, jsonb_build_object('donations', jsonb_build_array(payload))) then
    return jsonb_build_object('ok', true);
  end if;
  return jsonb_build_object('ok', false, 'reason', 'insufficient_or_invalid');
end;
$$;

create or replace function public.submit_guest_order(payload jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare order_id bigint; item jsonb; p public.app_products; qty numeric; unit_price numeric; guest_ordering_enabled boolean;
begin
  select guest_ordering into guest_ordering_enabled from public.app_settings where singleton;
  if not coalesce(guest_ordering_enabled,false) then return null; end if;
  if payload is null or jsonb_typeof(payload) <> 'object'
    or length(trim(coalesce(payload->>'syncKey',''))) not between 8 and 160
    or length(trim(coalesce(payload->>'guestName',''))) not between 2 and 100
    or jsonb_typeof(coalesce(payload->'items','[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(payload->'items','[]'::jsonb)) > 50 then return null; end if;
  for item in select value from jsonb_array_elements(payload->'items') loop
    select * into p from public.app_products where product_id=(item->>'productId')::bigint and active;
    qty := coalesce((item->>'qty')::numeric, 0); unit_price := coalesce((item->>'unitPrice')::numeric, 0);
    if not found or qty < 1 or qty > 100 or unit_price <> all(p.allowed_prices) then return null; end if;
    if p.friday_only and extract(isodow from timezone('Africa/Maputo', now())) <> 5 then return null; end if;
  end loop;
  insert into public.app_orders(sync_key,order_type,guest_name,guest_phone,ordered_at,status,items,
    custom_request,custom_price,needs_contact,guest_donation,updated_at)
  values(left(payload->>'syncKey',160),'guest',left(trim(payload->>'guestName'),100),
    left(trim(coalesce(payload->>'guestPhone','')),40),coalesce((payload->>'date')::timestamptz,now()),'pending',
    payload->'items',left(coalesce(payload->>'customRequest',''),500),0,
    coalesce((payload->>'needsContact')::boolean,false),0,now())
  on conflict(sync_key) do update set guest_phone=excluded.guest_phone
  returning id into order_id;
  return order_id;
exception when others then return null;
end;
$$;

revoke all on function public.submit_user_donation(bigint,text,jsonb) from public;
grant execute on function public.submit_user_donation(bigint,text,jsonb) to anon, authenticated;
