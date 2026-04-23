
-- Fix function search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Tighten orders INSERT policy with basic validation
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    length(customer_name) BETWEEN 1 AND 100
    AND length(phone) BETWEEN 5 AND 30
    AND (address IS NULL OR length(address) <= 500)
    AND (comment IS NULL OR length(comment) <= 1000)
    AND total >= 0 AND total <= 10000000
    AND status = 'new'
    AND admin_notes IS NULL
  );

-- Tighten order_items INSERT
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
CREATE POLICY "Anyone can create order items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    length(product_name) BETWEEN 1 AND 200
    AND quantity > 0 AND quantity <= 10000
    AND price >= 0 AND price <= 10000000
    AND EXISTS (SELECT 1 FROM public.orders WHERE id = order_id)
  );

-- Restrict storage listing: replace broad SELECT with no listing (files still accessible by direct URL since bucket is public)
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
-- No SELECT policy means files cannot be listed via API, but public bucket URLs still work for direct access
CREATE POLICY "Admins can list product images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
