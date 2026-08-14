-- Clear Dilma Lineco's debt without deleting her order, recharge or donation history.
-- The monthly balance is adjusted so the current available balance cannot stay negative.
update public.app_users u
set monthly_balance = greatest(
      0,
      coalesce((
        select sum(public.private_order_total(o))
        from public.app_orders o
        where o.user_id = u.user_id
          and o.ordered_at >= greatest(date_trunc('month', now()), coalesce(u.balance_reset_at, '-infinity'::timestamptz))
          and o.status <> 'cancelled'
      ), 0)
      + coalesce((
        select sum(d.amount)
        from public.app_donations d
        where d.user_id = u.user_id
          and d.created_at >= greatest(date_trunc('month', now()), coalesce(u.balance_reset_at, '-infinity'::timestamptz))
      ), 0)
      - coalesce((
        select sum(r.amount)
        from public.app_recharges r
        where r.user_id = u.user_id
          and r.created_at >= greatest(date_trunc('month', now()), coalesce(u.balance_reset_at, '-infinity'::timestamptz))
      ), 0)
    ),
    updated_at = now()
where u.user_id = 15;
