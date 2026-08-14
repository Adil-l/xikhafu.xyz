-- Update the fixed menu prices.
update public.app_products
set price = case product_id
  when 1 then 16
  when 2 then 3
  when 5 then 12
  when 6 then 12
end,
allowed_prices = case product_id
  when 1 then array[16]::numeric[]
  when 2 then array[3]::numeric[]
  when 5 then array[12]::numeric[]
  when 6 then array[12]::numeric[]
end,
updated_at = now()
where product_id in (1, 2, 5, 6);
