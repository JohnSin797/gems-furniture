-- Migration: Admin Product Management Enhancement
-- Description: Ensures admins have full CRUD access to products and related functionality
-- Date: 2025-01-20

-- Ensure products table exists with all necessary columns
DO $$
BEGIN
    -- Add featured column to products table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'featured'
    ) THEN
        ALTER TABLE public.products ADD COLUMN featured BOOLEAN DEFAULT false;
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.products ADD COLUMN status product_status DEFAULT 'active';
    END IF;
END $$;

-- Ensure inventory table exists
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    reorder_level INTEGER NOT NULL DEFAULT 10,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(product_id)
);

-- Ensure featured_collections table exists for homepage featured products
CREATE TABLE IF NOT EXISTS public.featured_collections (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(product_id)
);

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_collections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Only admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Only admins can update products" ON public.products;
DROP POLICY IF EXISTS "Only admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Anyone can view inventory" ON public.inventory;
DROP POLICY IF EXISTS "Only admins can manage inventory" ON public.inventory;
DROP POLICY IF EXISTS "Admins can manage featured collections" ON public.featured_collections;
DROP POLICY IF EXISTS "Anyone can view featured collections" ON public.featured_collections;

-- Create comprehensive RLS policies for products table
-- Public can view active products
CREATE POLICY "Public can view active products"
ON public.products
FOR SELECT
USING (status = 'active');

-- Admins can view all products (including inactive ones)
CREATE POLICY "Admins can view all products"
ON public.products
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert products
CREATE POLICY "Admins can insert products"
ON public.products
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can update products
CREATE POLICY "Admins can update products"
ON public.products
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete products
CREATE POLICY "Admins can delete products"
ON public.products
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for inventory table
-- Public can view inventory quantities
CREATE POLICY "Public can view inventory"
ON public.inventory
FOR SELECT
USING (true);

-- Admins can manage inventory
CREATE POLICY "Admins can manage inventory"
ON public.inventory
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for featured_collections table
-- Public can view featured collections
CREATE POLICY "Public can view featured collections"
ON public.featured_collections
FOR SELECT
USING (true);

-- Admins can manage featured collections
CREATE POLICY "Admins can manage featured collections"
ON public.featured_collections
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create or replace function to automatically create inventory record when product is created
CREATE OR REPLACE FUNCTION public.create_inventory_for_product()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.inventory (product_id, quantity, reserved_quantity, reorder_level)
    VALUES (NEW.id, 0, 0, 10)
    ON CONFLICT (product_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create inventory (drop if exists first)
DROP TRIGGER IF EXISTS auto_create_inventory ON public.products;
CREATE TRIGGER auto_create_inventory
    AFTER INSERT ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.create_inventory_for_product();

-- Create or replace function to update inventory timestamp
CREATE OR REPLACE FUNCTION public.update_inventory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory timestamp updates
DROP TRIGGER IF EXISTS update_inventory_timestamp ON public.inventory;
CREATE TRIGGER update_inventory_timestamp
    BEFORE UPDATE ON public.inventory
    FOR EACH ROW
    EXECUTE FUNCTION public.update_inventory_timestamp();

-- Create trigger for featured_collections timestamp updates
DROP TRIGGER IF EXISTS update_featured_collections_timestamp ON public.featured_collections;
CREATE TRIGGER update_featured_collections_timestamp
    BEFORE UPDATE ON public.featured_collections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON public.inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_featured_collections_product_id ON public.featured_collections(product_id);
CREATE INDEX IF NOT EXISTS idx_featured_collections_display_order ON public.featured_collections(display_order);

-- Insert sample data if tables are empty
DO $$
BEGIN
    -- Only insert if products table is empty
    IF NOT EXISTS (SELECT 1 FROM public.products LIMIT 1) THEN
        -- Insert sample products
        INSERT INTO public.products (name, description, category, price, image_url, status, featured) VALUES
        ('Oslo Dining Chair', 'Elegant dining chair with oak frame and comfortable upholstery', 'Dining', 299.00, '/src/assets/chair-oak.jpg', 'active', true),
        ('Sage Velvet Sectional', 'Luxurious sectional sofa in sage green velvet', 'Living Room', 1899.00, '/src/assets/sofa-sage.jpg', 'active', true),
        ('Walnut Coffee Table', 'Modern coffee table crafted from premium walnut wood', 'Living Room', 649.00, '/src/assets/table-walnut.jpg', 'active', false),
        ('Brass Nightstand', 'Stylish nightstand with brass accents and ample storage', 'Bedroom', 429.00, '/src/assets/nightstand-wood.jpg', 'active', false),
        ('Luna Accent Chair', 'Comfortable accent chair perfect for any living space', 'Living Room', 799.00, '/src/assets/armchair-cream.jpg', 'active', true),
        ('Oak Modular Shelf', 'Versatile modular shelving system in solid oak', 'Office', 549.00, '/src/assets/bookshelf-oak.jpg', 'active', false)
        ON CONFLICT DO NOTHING;

        -- Add featured products to featured_collections
        INSERT INTO public.featured_collections (product_id, display_order)
        SELECT p.id, ROW_NUMBER() OVER (ORDER BY p.name)
        FROM public.products p
        WHERE p.featured = true
        ON CONFLICT (product_id) DO NOTHING;
    END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.inventory TO authenticated;
GRANT ALL ON public.featured_collections TO authenticated;

-- Create a view for admin product management
CREATE OR REPLACE VIEW public.admin_products_view AS
SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    p.category,
    p.image_url,
    p.status,
    p.featured,
    p.created_at,
    p.updated_at,
    i.quantity,
    i.reserved_quantity,
    i.reorder_level,
    fc.display_order as featured_order
FROM public.products p
LEFT JOIN public.inventory i ON p.id = i.product_id
LEFT JOIN public.featured_collections fc ON p.id = fc.product_id;

-- Grant access to the view
GRANT SELECT ON public.admin_products_view TO authenticated;

-- Create a function to get admin product statistics
CREATE OR REPLACE FUNCTION public.get_admin_product_stats()
RETURNS TABLE (
    total_products BIGINT,
    active_products BIGINT,
    featured_products BIGINT,
    low_stock_products BIGINT,
    total_inventory_value DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.products) as total_products,
        (SELECT COUNT(*) FROM public.products WHERE status = 'active') as active_products,
        (SELECT COUNT(*) FROM public.products WHERE featured = true) as featured_products,
        (SELECT COUNT(*) FROM public.inventory WHERE quantity <= reorder_level) as low_stock_products,
        (SELECT COALESCE(SUM(p.price * i.quantity), 0)
         FROM public.products p
         JOIN public.inventory i ON p.id = i.product_id) as total_inventory_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to toggle featured status
CREATE OR REPLACE FUNCTION public.toggle_product_featured(product_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_featured BOOLEAN;
    max_order INTEGER;
BEGIN
    -- Get current featured status
    SELECT featured INTO current_featured
    FROM public.products
    WHERE id = product_uuid;

    IF current_featured IS NULL THEN
        RETURN false;
    END IF;

    IF current_featured THEN
        -- Remove from featured
        DELETE FROM public.featured_collections WHERE product_id = product_uuid;
        UPDATE public.products SET featured = false WHERE id = product_uuid;
    ELSE
        -- Add to featured
        SELECT COALESCE(MAX(display_order), 0) + 1 INTO max_order
        FROM public.featured_collections;

        INSERT INTO public.featured_collections (product_id, display_order)
        VALUES (product_uuid, max_order);

        UPDATE public.products SET featured = true WHERE id = product_uuid;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to document the migration
COMMENT ON TABLE public.products IS 'Products table with full admin CRUD capabilities';
COMMENT ON TABLE public.inventory IS 'Product inventory tracking for admin management';
COMMENT ON TABLE public.featured_collections IS 'Featured products collection for homepage display';
COMMENT ON VIEW public.admin_products_view IS 'Admin view combining products, inventory, and featured status';
COMMENT ON FUNCTION public.get_admin_product_stats() IS 'Returns comprehensive product statistics for admin dashboard';
COMMENT ON FUNCTION public.toggle_product_featured(UUID) IS 'Toggles featured status for a product';