create extension if not exists pgcrypto with schema extensions;

create table public.app_users (
  user_id bigint primary key,
  user_name text not null,
  avatar text not null default '🙂',
  pin_status text not null default 'unset' check (pin_status in ('unset', 'pending', 'active')),
  pin_hash text,
  pending_pin_hash text,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.app_users (user_id, user_name, avatar) values
  (1, 'Adilson Gavumende', '👨🏽‍💻'), (8, 'Daniel Jacinto', '🐯'),
  (11, 'Deolinda Nguenha', '🌻'), (15, 'Dilma Lineco', '🌺'),
  (9, 'Edson Mangaho', '😎'), (16, 'Edson Vasconcelos', '🧑🏽‍💼'),
  (7, 'Elias Bernado', '🦅'), (3, 'Gisela Capitine', '🐼'),
  (17, 'Isabel Pedro', '💐'), (12, 'Jorge Pacule', '🐻'),
  (2, 'Kelton Tesoura', '🦁'), (13, 'Luisa Matola', '🦋'),
  (18, 'Mr Guze', '👑'), (10, 'Nehemias Tovela', '🐺'),
  (14, 'Wesley Ussene', '⚡');

create table public.app_settings (
  singleton boolean primary key default true check (singleton),
  admin_pin_hash text not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (singleton, admin_pin_hash)
values (true, extensions.crypt('1234', extensions.gen_salt('bf')));

create table public.ranking_orders (
  sync_key text primary key,
  user_id bigint not null references public.app_users(user_id),
  ordered_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'debt', 'cancelled')),
  total numeric(12,2) not null default 0 check (total >= 0),
  bread_qty integer not null default 0 check (bread_qty >= 0),
  badjia_qty integer not null default 0 check (badjia_qty >= 0),
  drink_qty integer not null default 0 check (drink_qty >= 0),
  updated_at timestamptz not null default now()
);

alter table public.app_users enable row level security;
alter table public.app_settings enable row level security;
alter table public.ranking_orders enable row level security;

create policy "Hall da Fome visivel para todos" on public.ranking_orders
for select to anon, authenticated using (true);

grant select on public.ranking_orders to anon, authenticated;
revoke all on public.app_users from anon, authenticated;
revoke all on public.app_settings from anon, authenticated;
revoke insert, update, delete on public.ranking_orders from anon, authenticated;

create function public.private_check_admin_pin(p_pin text) returns boolean
language sql security definer set search_path = public, extensions as $$
  select coalesce((select admin_pin_hash = crypt(p_pin, admin_pin_hash) from public.app_settings where singleton), false);
$$;

create function public.user_pin_status(p_user_id bigint) returns text
language sql security definer set search_path = public as $$
  select coalesce((select pin_status from public.app_users where user_id = p_user_id), 'missing');
$$;

create function public.request_user_pin(p_user_id bigint, p_pin text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare current_status text;
begin
  if p_pin !~ '^[0-9]{4}$' then return 'invalid'; end if;
  select pin_status into current_status from public.app_users where user_id = p_user_id for update;
  if not found then return 'missing'; end if;
  if current_status <> 'unset' then return current_status; end if;
  update public.app_users set
    pending_pin_hash = crypt(p_pin, gen_salt('bf')),
    pin_status = 'pending', updated_at = now()
  where user_id = p_user_id;
  return 'pending';
end;
$$;

create function public.private_check_user_pin(p_user_id bigint, p_pin text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare current_hash text; current_status text; attempts integer; lock_time timestamptz;
begin
  select pin_hash, pin_status, failed_attempts, locked_until
  into current_hash, current_status, attempts, lock_time
  from public.app_users where user_id = p_user_id for update;
  if not found then return 'missing'; end if;
  if current_status <> 'active' then return current_status; end if;
  if lock_time is not null and lock_time > now() then return 'locked'; end if;
  if current_hash = crypt(p_pin, current_hash) then
    update public.app_users set failed_attempts = 0, locked_until = null, updated_at = now() where user_id = p_user_id;
    return 'ok';
  end if;
  attempts := attempts + 1;
  update public.app_users set
    failed_attempts = attempts,
    locked_until = case when attempts >= 5 then now() + interval '15 minutes' else null end,
    updated_at = now()
  where user_id = p_user_id;
  return case when attempts >= 5 then 'locked' else 'invalid' end;
end;
$$;

create function public.verify_user_pin(p_user_id bigint, p_pin text) returns text
language sql security definer set search_path = public as $$
  select public.private_check_user_pin(p_user_id, p_pin);
$$;

create function public.admin_pin_states(p_admin_pin text)
returns table(user_id bigint, pin_status text, failed_attempts integer, locked_until timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.private_check_admin_pin(p_admin_pin) then return; end if;
  return query select u.user_id, u.pin_status, u.failed_attempts, u.locked_until from public.app_users u order by u.user_name;
end;
$$;

create function public.approve_user_pin(p_admin_pin text, p_user_id bigint) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.private_check_admin_pin(p_admin_pin) then return false; end if;
  update public.app_users set pin_hash = pending_pin_hash, pending_pin_hash = null,
    pin_status = 'active', failed_attempts = 0, locked_until = null, updated_at = now()
  where user_id = p_user_id and pin_status = 'pending' and pending_pin_hash is not null;
  return found;
end;
$$;

create function public.reset_user_pin(p_admin_pin text, p_user_id bigint) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.private_check_admin_pin(p_admin_pin) then return false; end if;
  update public.app_users set pin_hash = null, pending_pin_hash = null, pin_status = 'unset',
    failed_attempts = 0, locked_until = null, updated_at = now() where user_id = p_user_id;
  return found;
end;
$$;

create function public.sync_user_ranking_orders(p_user_id bigint, p_pin text, payload jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if public.private_check_user_pin(p_user_id, p_pin) <> 'ok' then return false; end if;
  if payload is null or jsonb_typeof(payload) <> 'array' or jsonb_array_length(payload) > 200 then return false; end if;
  insert into public.ranking_orders (sync_key, user_id, ordered_at, status, total, bread_qty, badjia_qty, drink_qty, updated_at)
  select left(x.sync_key, 160), p_user_id, x.ordered_at,
    case when x.status in ('pending','paid','debt','cancelled') then x.status else 'pending' end,
    greatest(0, least(coalesce(x.total,0),1000000)),
    greatest(0, least(coalesce(x.bread_qty,0),100000)),
    greatest(0, least(coalesce(x.badjia_qty,0),100000)),
    greatest(0, least(coalesce(x.drink_qty,0),100000)), now()
  from jsonb_to_recordset(payload) as x(sync_key text, ordered_at timestamptz, status text, total numeric, bread_qty integer, badjia_qty integer, drink_qty integer)
  where x.sync_key is not null and length(x.sync_key) between 8 and 160 and x.ordered_at is not null
  on conflict (sync_key) do update set ordered_at=excluded.ordered_at, status=excluded.status,
    total=excluded.total, bread_qty=excluded.bread_qty, badjia_qty=excluded.badjia_qty,
    drink_qty=excluded.drink_qty, updated_at=now()
  where public.ranking_orders.user_id = p_user_id;
  return true;
end;
$$;

create function public.sync_admin_ranking_orders(p_admin_pin text, payload jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.private_check_admin_pin(p_admin_pin) then return false; end if;
  if payload is null or jsonb_typeof(payload) <> 'array' or jsonb_array_length(payload) > 500 then return false; end if;
  insert into public.ranking_orders (sync_key,user_id,ordered_at,status,total,bread_qty,badjia_qty,drink_qty,updated_at)
  select left(x.sync_key,160),x.user_id,x.ordered_at,
    case when x.status in ('pending','paid','debt','cancelled') then x.status else 'pending' end,
    greatest(0,least(coalesce(x.total,0),1000000)),greatest(0,least(coalesce(x.bread_qty,0),100000)),
    greatest(0,least(coalesce(x.badjia_qty,0),100000)),greatest(0,least(coalesce(x.drink_qty,0),100000)),now()
  from jsonb_to_recordset(payload) as x(sync_key text,user_id bigint,ordered_at timestamptz,status text,total numeric,bread_qty integer,badjia_qty integer,drink_qty integer)
  join public.app_users u on u.user_id=x.user_id
  where x.sync_key is not null and length(x.sync_key) between 8 and 160 and x.ordered_at is not null
  on conflict (sync_key) do update set user_id=excluded.user_id,ordered_at=excluded.ordered_at,
    status=excluded.status,total=excluded.total,bread_qty=excluded.bread_qty,
    badjia_qty=excluded.badjia_qty,drink_qty=excluded.drink_qty,updated_at=now();
  return true;
end;
$$;

revoke all on function public.private_check_admin_pin(text) from public;
revoke all on function public.private_check_user_pin(bigint,text) from public;
revoke all on function public.user_pin_status(bigint) from public;
revoke all on function public.request_user_pin(bigint,text) from public;
revoke all on function public.verify_user_pin(bigint,text) from public;
revoke all on function public.admin_pin_states(text) from public;
revoke all on function public.approve_user_pin(text,bigint) from public;
revoke all on function public.reset_user_pin(text,bigint) from public;
revoke all on function public.sync_user_ranking_orders(bigint,text,jsonb) from public;
revoke all on function public.sync_admin_ranking_orders(text,jsonb) from public;
grant execute on function public.user_pin_status(bigint) to anon, authenticated;
grant execute on function public.request_user_pin(bigint,text) to anon, authenticated;
grant execute on function public.verify_user_pin(bigint,text) to anon, authenticated;
grant execute on function public.admin_pin_states(text) to anon, authenticated;
grant execute on function public.approve_user_pin(text,bigint) to anon, authenticated;
grant execute on function public.reset_user_pin(text,bigint) to anon, authenticated;
grant execute on function public.sync_user_ranking_orders(bigint,text,jsonb) to anon, authenticated;
grant execute on function public.sync_admin_ranking_orders(text,jsonb) to anon, authenticated;

create index ranking_orders_user_id_idx on public.ranking_orders(user_id);
create index ranking_orders_status_idx on public.ranking_orders(status);
