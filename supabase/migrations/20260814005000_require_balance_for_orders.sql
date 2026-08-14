-- Saldo positivo e suficiente passa a ser uma regra obrigatória para utilizadores.
update public.app_settings
set balance_policy='block', updated_at=now()
where singleton;

create or replace function public.enforce_required_balance_policy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.balance_policy := 'block';
  return new;
end;
$$;

drop trigger if exists app_settings_required_balance_policy on public.app_settings;
create trigger app_settings_required_balance_policy
before insert or update of balance_policy on public.app_settings
for each row execute function public.enforce_required_balance_policy();
