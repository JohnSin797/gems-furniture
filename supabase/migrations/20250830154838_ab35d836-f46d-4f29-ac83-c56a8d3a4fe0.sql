-- Create enum for product status
CREATE TYPE public.product_status AS ENUM ('active', 'inactive', 'discontinued');

-- Create enum for purchase order status  
CREATE TYPE public.purchase_order_status AS ENUM ('pending', 'approved', 'shipped', 'delivered', 'cancelled');

-- Create products table
CREATE TABLE public.products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category TEXT NOT NULL,
    type TEXT,
    image_url TEXT,
    status product_status NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory table
CREATE TABLE public.inventory (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    reorder_level INTEGER NOT NULL DEFAULT 10,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(product_id)
);

-- Create purchase orders table
CREATE TABLE public.purchase_orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    supplier_name TEXT NOT NULL,
    supplier_email TEXT,
    status purchase_order_status NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase order items table
CREATE TABLE public.purchase_order_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products table
-- Everyone can view active products
CREATE POLICY "Anyone can view active products" 
ON public.products 
FOR SELECT 
USING (status = 'active' OR has_role(auth.uid(), 'admin'));

-- Only admins can insert products
CREATE POLICY "Only admins can insert products" 
ON public.products 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can update products
CREATE POLICY "Only admins can update products" 
ON public.products 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Only admins can delete products
CREATE POLICY "Only admins can delete products" 
ON public.products 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for inventory table
-- Everyone can view inventory
CREATE POLICY "Anyone can view inventory" 
ON public.inventory 
FOR SELECT 
USING (true);

-- Only admins can manage inventory
CREATE POLICY "Only admins can manage inventory" 
ON public.inventory 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for purchase orders table
-- Only admins can manage purchase orders
CREATE POLICY "Only admins can manage purchase orders" 
ON public.purchase_orders 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for purchase order items table
-- Only admins can manage purchase order items
CREATE POLICY "Only admins can manage purchase order items" 
ON public.purchase_order_items 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Create triggers for updated_at columns
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON public.inventory
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at
    BEFORE UPDATE ON public.purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically create inventory record when product is created
CREATE OR REPLACE FUNCTION public.create_inventory_for_product()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.inventory (product_id, quantity, reserved_quantity, reorder_level)
    VALUES (NEW.id, 0, 0, 10);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create inventory
CREATE TRIGGER auto_create_inventory
    AFTER INSERT ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.create_inventory_for_product();

-- Create function to update purchase order total
CREATE OR REPLACE FUNCTION public.update_purchase_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.purchase_orders 
    SET total_amount = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM public.purchase_order_items 
        WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)
    )
    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to update purchase order total
CREATE TRIGGER update_po_total_on_insert
    AFTER INSERT ON public.purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_purchase_order_total();

CREATE TRIGGER update_po_total_on_update
    AFTER UPDATE ON public.purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_purchase_order_total();

CREATE TRIGGER update_po_total_on_delete
    AFTER DELETE ON public.purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_purchase_order_total();