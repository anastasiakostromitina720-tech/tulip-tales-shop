CREATE OR REPLACE FUNCTION public.order_exists(_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders
    WHERE id = _order_id
  );
$$;

DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

CREATE POLICY "Anyone can create order items"
  ON public.order_items FOR INSERT
  TO public
  WITH CHECK (
    length(product_name) BETWEEN 1 AND 200
    AND quantity > 0 AND quantity <= 10000
    AND price >= 0 AND price <= 10000000
    AND public.order_exists(order_id)
  );