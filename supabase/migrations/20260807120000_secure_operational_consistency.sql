alter table public.app_settings
  add column if not exists admin_failed_attempts integer not null default 0,
  add column if not exists admin_locked_until timestamptz;

create table if not exists public.app_products (
  product_id bigint primary key,
  product_name text not null,
  icon text not null default '🍞',
  price numeric(12,2) not null default 0 check (price >= 0),
  allowed_prices numeric[] not null default '{}',
  category text not null default 'Outros',
  active boolean not null default true,
  friday_only boolean not null default false,
  contact_for_flavor boolean not null default false,
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  updated_at timestamptz not null default now()
);

insert into public.app_products
  (product_id, product_name, icon, price, allowed_prices, category, active, friday_only, contact_for_flavor, options)
select x.product_id, x.product_name, x.icon, x.price, x.allowed_prices, x.category, true, x.friday_only,
  x.contact_for_flavor, x.options
from jsonb_to_recordset($json$
[
  {"product_id":1,"product_name":"Bread","icon":"🥖","price":12,"allowed_prices":[12,14],"category":"Breads","friday_only":false,"contact_for_flavor":false,"options":[{"key":"preco","label":"Escolhe o preço","choices":[{"label":"12 MT","price":12},{"label":"14 MT","price":14}]}]},
  {"product_id":2,"product_name":"Badjia","icon":"🥟","price":2,"allowed_prices":[2],"category":"Salgados","friday_only":false,"contact_for_flavor":false,"options":[{"key":"piri","label":"Piri-piri","choices":[{"label":"Sem piri-piri"},{"label":"Com piri-piri"}]}]},
  {"product_id":5,"product_name":"Chamuça","icon":"🔺","price":5,"allowed_prices":[5,10],"category":"Salgados","friday_only":false,"contact_for_flavor":false,"options":[{"key":"preco","label":"Escolhe o preço","choices":[{"label":"5 MT","price":5},{"label":"10 MT","price":10}]},{"key":"piri","label":"Piri-piri","choices":[{"label":"Sem piri-piri"},{"label":"Com piri-piri"}]}]},
  {"product_id":6,"product_name":"Rissol","icon":"🥐","price":10,"allowed_prices":[10],"category":"Salgados","friday_only":false,"contact_for_flavor":false,"options":[{"key":"piri","label":"Piri-piri","choices":[{"label":"Sem piri-piri"},{"label":"Com piri-piri"}]}]},
  {"product_id":9,"product_name":"Maçã","icon":"🍎","price":20,"allowed_prices":[20],"category":"Frutas","friday_only":false,"contact_for_flavor":false,"options":[{"key":"cor","label":"Escolhe a maçã","choices":[{"label":"Verde"},{"label":"Vermelha"}]}]},
  {"product_id":10,"product_name":"Laranja","icon":"🍊","price":20,"allowed_prices":[20],"category":"Frutas","friday_only":false,"contact_for_flavor":false,"options":[]},
  {"product_id":11,"product_name":"Bolachas","icon":"🍪","price":0,"allowed_prices":[0],"category":"Doces","friday_only":false,"contact_for_flavor":true,"options":[]},
  {"product_id":12,"product_name":"Bolos","icon":"🍰","price":0,"allowed_prices":[0],"category":"Doces","friday_only":false,"contact_for_flavor":true,"options":[]},
  {"product_id":3,"product_name":"Coca-Cola","icon":"🥤","price":0,"allowed_prices":[0],"category":"Refrescos","friday_only":true,"contact_for_flavor":true,"options":[]},
  {"product_id":4,"product_name":"Fanta","icon":"🧃","price":0,"allowed_prices":[0],"category":"Refrescos","friday_only":true,"contact_for_flavor":true,"options":[]},
  {"product_id":13,"product_name":"Sprite","icon":"🥤","price":0,"allowed_prices":[0],"category":"Refrescos","friday_only":true,"contact_for_flavor":true,"options":[]},
  {"product_id":14,"product_name":"Simba","icon":"🍟","price":0,"allowed_prices":[0],"category":"Snacks","friday_only":true,"contact_for_flavor":true,"options":[]},
  {"product_id":15,"product_name":"Doritos","icon":"🔻","price":0,"allowed_prices":[0],"category":"Snacks","friday_only":true,"contact_for_flavor":true,"options":[]},
  {"product_id":16,"product_name":"Cappy","icon":"🧃","price":0,"allowed_prices":[0],"category":"Sumos","friday_only":true,"contact_for_flavor":true,"options":[]},
  {"product_id":17,"product_name":"Ceres","icon":"🧃","price":0,"allowed_prices":[0],"category":"Sumos","friday_only":true,"contact_for_flavor":true,"options":[]},
  {"product_id":18,"product_name":"Compal","icon":"🧃","price":0,"allowed_prices":[0],"category":"Sumos","friday_only":true,"contact_for_flavor":true,"options":[]},
  {"product_id":19,"product_name":"Switch","icon":"⚡","price":0,"allowed_prices":[0],"category":"Energéticos","friday_only":true,"contact_for_flavor":true,"options":[]},
  {"product_id":20,"product_name":"Red Bull","icon":"⚡","price":0,"allowed_prices":[0],"category":"Energéticos","friday_only":true,"contact_for_flavor":true,"options":[]},
  {"product_id":21,"product_name":"Predator","icon":"⚡","price":0,"allowed_prices":[0],"category":"Energéticos","friday_only":true,"contact_for_flavor":true,"options":[]},
  {"product_id":22,"product_name":"Nasty","icon":"⚡","price":0,"allowed_prices":[0],"category":"Energéticos","friday_only":true,"contact_for_flavor":true,"options":[]},
  {"product_id":23,"product_name":"Monster","icon":"👹","price":0,"allowed_prices":[0],"category":"Energéticos","friday_only":true,"contact_for_flavor":true,"options":[]},
  {"product_id":24,"product_name":"Coronita","icon":"🍺","price":0,"allowed_prices":[0],"category":"Bebidas","friday_only":true,"contact_for_flavor":true,"options":[]},
  {"product_id":25,"product_name":"2M lata","icon":"🍺","price":0,"allowed_prices":[0],"category":"Bebidas","friday_only":true,"contact_for_flavor":true,"options":[]},
  {"product_id":26,"product_name":"Mayfair","icon":"🍺","price":0,"allowed_prices":[0],"category":"Bebidas","friday_only":true,"contact_for_flavor":true,"options":[]},
  {"product_id":27,"product_name":"Heineken","icon":"🍺","price":0,"allowed_prices":[0],"category":"Bebidas","friday_only":true,"contact_for_flavor":true,"options":[]},
  {"product_id":28,"product_name":"Pretinha","icon":"🍺","price":0,"allowed_prices":[0],"category":"Bebidas","friday_only":true,"contact_for_flavor":true,"options":[]},
  {"product_id":29,"product_name":"Hunters Gold","icon":"🍺","price":0,"allowed_prices":[0],"category":"Bebidas","friday_only":true,"contact_for_flavor":true,"options":[]},
  {"product_id":30,"product_name":"Txilar","icon":"🍺","price":0,"allowed_prices":[0],"category":"Bebidas","friday_only":true,"contact_for_flavor":true,"options":[]},
  {"product_id":31,"product_name":"Lite","icon":"🍺","price":0,"allowed_prices":[0],"category":"Bebidas","friday_only":true,"contact_for_flavor":true,"options":[]},
  {"product_id":32,"product_name":"Flying Fish","icon":"🍺","price":0,"allowed_prices":[0],"category":"Bebidas","friday_only":true,"contact_for_flavor":true,"options":[]}
]$json$::jsonb) as x(
  product_id bigint, product_name text, icon text, price numeric, allowed_prices numeric[], category text,
  friday_only boolean, contact_for_flavor boolean, options jsonb
)
on conflict (product_id) do nothing;

alter table public.app_products enable row level security;
revoke all on public.app_products from anon, authenticated;
revoke all on public.ranking_orders from anon, authenticated;
revoke all on function public.sync_user_ranking_orders(bigint,text,jsonb) from anon, authenticated;
revoke all on function public.sync_admin_ranking_orders(text,jsonb) from anon, authenticated;

create or replace function public.private_check_admin_pin(p_pin text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare stored_hash text; attempts integer; lock_time timestamptz;
begin
  select admin_pin_hash, admin_failed_attempts, admin_locked_until
    into stored_hash, attempts, lock_time
    from public.app_settings where singleton for update;
  if lock_time is not null and lock_time > now() then return false; end if;
  if stored_hash = crypt(coalesce(p_pin, ''), stored_hash) then
    update public.app_settings set admin_failed_attempts=0, admin_locked_until=null, updated_at=now() where singleton;
    return true;
  end if;
  attempts := coalesce(attempts, 0) + 1;
  update public.app_settings set admin_failed_attempts=attempts,
    admin_locked_until=case when attempts >= 5 then now() + interval '15 minutes' else null end,
    updated_at=now() where singleton;
  return false;
end;
$$;

create or replace function public.private_check_user_pin(p_user_id bigint, p_pin text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare current_hash text; current_status text; current_active boolean; attempts integer; lock_time timestamptz;
begin
  select pin_hash, pin_status, active, failed_attempts, locked_until
    into current_hash, current_status, current_active, attempts, lock_time
    from public.app_users where user_id = p_user_id for update;
  if not found then return 'missing'; end if;
  if current_active is false then return 'blocked'; end if;
  if current_status <> 'active' then return current_status; end if;
  if lock_time is not null and lock_time > now() then return 'locked'; end if;
  if current_hash = crypt(coalesce(p_pin, ''), current_hash) then
    update public.app_users set failed_attempts = 0, locked_until = null, updated_at = now() where user_id = p_user_id;
    return 'ok';
  end if;
  attempts := coalesce(attempts, 0) + 1;
  update public.app_users set failed_attempts = attempts,
    locked_until = case when attempts >= 5 then now() + interval '15 minutes' else null end,
    updated_at = now() where user_id = p_user_id;
  return case when attempts >= 5 then 'locked' else 'invalid' end;
end;
$$;

create or replace function public.user_pin_status(p_user_id bigint) returns text
language sql security definer set search_path = public as $$
  select coalesce((select case when not active then 'blocked' else pin_status end from public.app_users where user_id = p_user_id), 'missing');
$$;

create or replace function public.user_session_status(p_user_id bigint, p_pin text) returns text
language sql security definer set search_path = public, extensions as $$
  select coalesce((select case when not active then 'blocked' when pin_status <> 'active' then pin_status
    when pin_hash = crypt(coalesce(p_pin, ''), pin_hash) then 'ok' else 'invalid' end
    from public.app_users where user_id = p_user_id), 'missing');
$$;

create or replace function public.private_order_total(o public.app_orders) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((select sum(greatest(0, coalesce((item->>'qty')::numeric, 0)) *
    coalesce((item->>'unitPrice')::numeric, p.price))
    from jsonb_array_elements(o.items) item
    left join public.app_products p on p.product_id = (item->>'productId')::bigint), 0)
    + coalesce(o.custom_price, 0) + coalesce(o.guest_donation, 0);
$$;

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

create or replace function public.load_public_app_bootstrap() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'users', coalesce((select jsonb_agg(jsonb_build_object(
      'id', u.user_id, 'name', u.user_name, 'avatar', u.avatar, 'active', u.active
    ) order by u.user_name) from public.app_users u), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(jsonb_build_object(
      'id', p.product_id, 'name', p.product_name, 'icon', p.icon, 'price', p.price,
      'category', p.category, 'active', p.active, 'fridayOnly', p.friday_only,
      'contactForFlavor', p.contact_for_flavor, 'options', p.options, 'updatedAt', p.updated_at
    ) order by p.product_name) from public.app_products p), '[]'::jsonb),
    'settings', public.private_settings_json()
  );
$$;

create or replace function public.load_public_app_hall() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('user_id', user_id, 'status', status, 'total', total,
    'bread_qty', bread_qty, 'badjia_qty', badjia_qty, 'drink_qty', drink_qty)), '[]'::jsonb)
  from (
    select o.user_id, o.status, sum(public.private_order_total(o)) total,
      sum((select coalesce(sum((item->>'qty')::integer),0) from jsonb_array_elements(o.items) item where (item->>'productId')::bigint=1)) bread_qty,
      sum((select coalesce(sum((item->>'qty')::integer),0) from jsonb_array_elements(o.items) item where (item->>'productId')::bigint=2)) badjia_qty,
      sum((select coalesce(sum((item->>'qty')::integer),0) from jsonb_array_elements(o.items) item join public.app_products p on p.product_id=(item->>'productId')::bigint where p.category in ('Refrescos','Sumos','Energéticos','Bebidas'))) drink_qty
    from public.app_orders o where o.order_type='user' and o.user_id is not null and o.status <> 'cancelled'
    group by o.user_id, o.status
  ) grouped;
$$;

create or replace function public.admin_upsert_product(p_admin_pin text, p_product jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.private_check_admin_pin(p_admin_pin) or p_product is null
    or length(trim(coalesce(p_product->>'name',''))) < 2 then return false; end if;
  insert into public.app_products(product_id, product_name, icon, price, allowed_prices, category, active, friday_only, contact_for_flavor, options, updated_at)
  values(coalesce((p_product->>'id')::bigint, (select coalesce(max(product_id),0)+1 from public.app_products)),
    left(trim(p_product->>'name'),100), left(coalesce(nullif(trim(p_product->>'icon'),''),'🍞'),16),
    greatest(0,least(coalesce((p_product->>'price')::numeric,0),1000000)),
    coalesce((select array_agg(distinct (choice->>'price')::numeric)
      from jsonb_array_elements(coalesce(p_product->'options','[]'::jsonb)) group_data
      cross join lateral jsonb_array_elements(coalesce(group_data->'choices','[]'::jsonb)) choice
      where choice ? 'price'), array[greatest(0,least(coalesce((p_product->>'price')::numeric,0),1000000))]),
    left(coalesce(nullif(trim(p_product->>'category'),''),'Outros'),80), coalesce((p_product->>'active')::boolean,true),
    coalesce((p_product->>'fridayOnly')::boolean,false), coalesce((p_product->>'contactForFlavor')::boolean,false),
    case when jsonb_typeof(p_product->'options')='array' then p_product->'options' else '[]'::jsonb end, now())
  on conflict(product_id) do update set product_name=excluded.product_name, icon=excluded.icon, price=excluded.price,
    allowed_prices=excluded.allowed_prices, category=excluded.category, active=excluded.active, friday_only=excluded.friday_only,
    contact_for_flavor=excluded.contact_for_flavor, options=excluded.options, updated_at=now();
  return true;
exception when others then return false;
end;
$$;

create or replace function public.admin_toggle_product(p_admin_pin text, p_product_id bigint, p_active boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.private_check_admin_pin(p_admin_pin) then return false; end if;
  update public.app_products set active=coalesce(p_active,false), updated_at=now() where product_id=p_product_id;
  return found;
end;
$$;

create or replace function public.admin_change_pin(p_current_pin text, p_new_pin text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_new_pin is null or p_new_pin !~ '^[0-9]{4,8}$' or not public.private_check_admin_pin(p_current_pin) then return false; end if;
  update public.app_settings set admin_pin_hash=crypt(p_new_pin, gen_salt('bf')), admin_failed_attempts=0,
    admin_locked_until=null, updated_at=now() where singleton;
  return found;
end;
$$;

create or replace function public.sync_user_operational_state(p_user_id bigint, p_pin text, payload jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if public.private_check_user_pin(p_user_id, p_pin) <> 'ok' then return false; end if;
  if payload is null or jsonb_typeof(payload) <> 'object' then return false; end if;
  insert into public.app_donations(sync_key, order_sync_key, user_id, donor_name, amount, created_at, updated_at)
  select left(x.sync_key,160), left(x.order_sync_key,160), p_user_id, left(coalesce(x.donor_name,'Utilizador'),100),
    greatest(0.01,least(x.amount,1000000)), x.created_at, coalesce(x.updated_at,x.created_at,now())
  from jsonb_to_recordset(coalesce(payload->'donations','[]'::jsonb)) as x(
    sync_key text, order_sync_key text, donor_name text, amount numeric, created_at timestamptz, updated_at timestamptz)
  where x.sync_key is not null and length(x.sync_key) between 8 and 160 and x.amount > 0 and x.created_at is not null
  on conflict(sync_key) do nothing;
  return true;
end;
$$;

create or replace function public.admin_sync_operational_state(p_admin_pin text, payload jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.private_check_admin_pin(p_admin_pin) or payload is null or jsonb_typeof(payload)<>'object' then return false; end if;

  update public.app_settings set
    guest_ordering=coalesce((payload->'settings'->>'guestOrdering')::boolean,guest_ordering),
    balance_policy=case when payload->'settings'->>'balancePolicy' in ('block','allow-negative') then payload->'settings'->>'balancePolicy' else balance_policy end,
    donation_day=greatest(1,least(coalesce((payload->'settings'->>'donationDay')::integer,donation_day),28)),
    donation_goal=left(coalesce(nullif(trim(payload->'settings'->>'donationGoal'),''),donation_goal),200),
    updated_at=coalesce((payload->'settings'->>'updatedAt')::timestamptz, now())
  where singleton and coalesce((payload->'settings'->>'updatedAt')::timestamptz, now()) >= updated_at;

  update public.app_users u set monthly_balance=greatest(0,least(coalesce(x.monthly_balance,0),1000000)),
    balance_reset_at=x.balance_reset_at, active=coalesce(x.active,true), updated_at=coalesce(x.updated_at,now())
  from jsonb_to_recordset(coalesce(payload->'users','[]'::jsonb)) as x(
    user_id bigint, monthly_balance numeric, balance_reset_at timestamptz, active boolean, updated_at timestamptz)
  where u.user_id=x.user_id and coalesce(x.updated_at,now()) >= u.updated_at;

  insert into public.app_orders(sync_key,order_type,user_id,guest_name,guest_phone,ordered_at,status,items,
    custom_request,custom_price,needs_contact,guest_donation,updated_at)
  select left(x.sync_key,160),case when x.order_type='guest' then 'guest' else 'user' end,
    case when x.order_type='guest' then null else x.user_id end,left(x.guest_name,100),left(x.guest_phone,40),x.ordered_at,
    case when x.status in ('pending','paid','debt','cancelled') then x.status else 'pending' end,
    coalesce(x.items,'[]'::jsonb),left(coalesce(x.custom_request,''),500),greatest(0,least(coalesce(x.custom_price,0),1000000)),
    coalesce(x.needs_contact,false),greatest(0,least(coalesce(x.guest_donation,0),1000000)),coalesce(x.updated_at,now())
  from jsonb_to_recordset(coalesce(payload->'orders','[]'::jsonb)) as x(
    sync_key text,order_type text,user_id bigint,guest_name text,guest_phone text,ordered_at timestamptz,
    status text,items jsonb,custom_request text,custom_price numeric,needs_contact boolean,guest_donation numeric,updated_at timestamptz)
  left join public.app_users u on u.user_id=x.user_id
  where x.sync_key is not null and length(x.sync_key) between 8 and 160 and x.ordered_at is not null
    and jsonb_typeof(coalesce(x.items,'[]'::jsonb))='array' and (x.order_type='guest' or u.user_id is not null)
  on conflict(sync_key) do update set status=excluded.status,items=excluded.items,custom_request=excluded.custom_request,
    custom_price=excluded.custom_price,needs_contact=excluded.needs_contact,guest_donation=excluded.guest_donation,
    updated_at=excluded.updated_at where excluded.updated_at >= public.app_orders.updated_at;

  insert into public.app_recharges(sync_key,user_id,created_at,amount,note,updated_at)
  select left(x.sync_key,160),x.user_id,x.created_at,greatest(0.01,least(x.amount,1000000)),left(coalesce(x.note,'Recarga'),200),coalesce(x.updated_at,now())
  from jsonb_to_recordset(coalesce(payload->'recharges','[]'::jsonb)) as x(
    sync_key text,user_id bigint,created_at timestamptz,amount numeric,note text,updated_at timestamptz)
  join public.app_users u on u.user_id=x.user_id
  where x.sync_key is not null and length(x.sync_key) between 8 and 160 and x.amount>0 and x.created_at is not null
  on conflict(sync_key) do update set amount=excluded.amount,note=excluded.note,updated_at=excluded.updated_at
    where excluded.updated_at >= public.app_recharges.updated_at;

  insert into public.app_donations(sync_key,order_sync_key,user_id,donor_name,amount,created_at,updated_at)
  select left(x.sync_key,160),left(x.order_sync_key,160),x.user_id,left(coalesce(x.donor_name,'Convidado'),100),
    greatest(0.01,least(x.amount,1000000)),x.created_at,coalesce(x.updated_at,now())
  from jsonb_to_recordset(coalesce(payload->'donations','[]'::jsonb)) as x(
    sync_key text,order_sync_key text,user_id bigint,donor_name text,amount numeric,created_at timestamptz,updated_at timestamptz)
  where x.sync_key is not null and length(x.sync_key) between 8 and 160 and x.amount>0 and x.created_at is not null
  on conflict(sync_key) do update set amount=excluded.amount,updated_at=excluded.updated_at
    where excluded.updated_at >= public.app_donations.updated_at;
  return true;
exception when others then return false;
end;
$$;

create or replace function public.submit_guest_order(payload jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare order_id bigint; item jsonb; p public.app_products; qty numeric; unit_price numeric;
begin
  if payload is null or jsonb_typeof(payload) <> 'object'
    or length(trim(coalesce(payload->>'syncKey',''))) not between 8 and 160
    or length(trim(coalesce(payload->>'guestName',''))) not between 2 and 100
    or jsonb_typeof(coalesce(payload->'items','[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(payload->'items','[]'::jsonb)) > 50 then return null; end if;
  for item in select value from jsonb_array_elements(payload->'items') loop
    select * into p from public.app_products where product_id=(item->>'productId')::bigint and active;
    qty := coalesce((item->>'qty')::numeric, 0); unit_price := coalesce((item->>'unitPrice')::numeric, 0);
    if not found or qty < 1 or qty > 100 or unit_price <> all(p.allowed_prices) then return null; end if;
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

revoke all on function public.user_session_status(bigint,text) from public;
revoke all on function public.private_order_total(public.app_orders) from public;
revoke all on function public.submit_user_order(bigint,text,jsonb) from public;
revoke all on function public.load_public_app_hall() from public;
revoke all on function public.admin_upsert_product(text,jsonb) from public;
revoke all on function public.admin_toggle_product(text,bigint,boolean) from public;
revoke all on function public.admin_change_pin(text,text) from public;
grant execute on function public.user_session_status(bigint,text) to anon, authenticated;
grant execute on function public.submit_user_order(bigint,text,jsonb) to anon, authenticated;
grant execute on function public.load_public_app_hall() to anon, authenticated;
grant execute on function public.admin_upsert_product(text,jsonb) to anon, authenticated;
grant execute on function public.admin_toggle_product(text,bigint,boolean) to anon, authenticated;
grant execute on function public.admin_change_pin(text,text) to anon, authenticated;
