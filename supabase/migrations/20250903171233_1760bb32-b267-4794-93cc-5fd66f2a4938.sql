-- Fix the generate_order_number function with proper search_path
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    order_num TEXT;
    counter INTEGER;
BEGIN
    -- Get today's date in YYYYMMDD format
    order_num := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-';
    
    -- Get count of orders created today
    SELECT COUNT(*) + 1 INTO counter
    FROM public.orders 
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- Pad with zeros to make it 4 digits
    order_num := order_num || LPAD(counter::TEXT, 4, '0');
    
    RETURN order_num;
END;
$$;