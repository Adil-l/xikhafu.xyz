revoke all on public.ranking_orders from anon, authenticated;
revoke all on function public.sync_user_ranking_orders(bigint,text,jsonb) from anon, authenticated;
revoke all on function public.sync_admin_ranking_orders(text,jsonb) from anon, authenticated;
