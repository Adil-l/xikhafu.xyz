-- Dilma Lineco starts with a balance of -72 MT.
alter table public.app_users
  drop constraint if exists app_users_monthly_balance_check;

update public.app_users
set monthly_balance = -72,
    updated_at = now()
where user_id = 15;
