-- Bread is now sold only at 14 MT.
update public.app_products
set price = 14,
    allowed_prices = array[14]::numeric[],
    options = '[]'::jsonb,
    updated_at = now()
where product_id = 1;
