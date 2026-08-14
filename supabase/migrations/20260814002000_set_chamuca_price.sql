-- Chamuça is now sold only at 10 MT.
update public.app_products
set price = 10,
    allowed_prices = array[10]::numeric[],
    options = jsonb_build_array(jsonb_build_object(
      'key', 'piri',
      'label', 'Piri-piri',
      'choices', jsonb_build_array(
        jsonb_build_object('label', 'Sem piri-piri'),
        jsonb_build_object('label', 'Com piri-piri')
      )
    )),
    updated_at = now()
where product_id = 5;
