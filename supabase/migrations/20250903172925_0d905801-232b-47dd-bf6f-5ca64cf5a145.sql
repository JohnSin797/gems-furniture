-- Insert sample products first
INSERT INTO public.products (name, description, category, price, image_url, status) VALUES
('Oslo Dining Chair', 'Elegant dining chair with oak frame and comfortable upholstery', 'Dining', 299.00, '/assets/chair-oak.jpg', 'active'),
('Sage Velvet Sectional', 'Luxurious sectional sofa in sage green velvet', 'Living Room', 1899.00, '/assets/sofa-sage.jpg', 'active'),
('Walnut Coffee Table', 'Modern coffee table crafted from premium walnut wood', 'Living Room', 649.00, '/assets/table-walnut.jpg', 'active'),
('Brass Nightstand', 'Stylish nightstand with brass accents and ample storage', 'Bedroom', 429.00, '/assets/nightstand-wood.jpg', 'active'),
('Luna Accent Chair', 'Comfortable accent chair perfect for any living space', 'Living Room', 799.00, '/assets/armchair-cream.jpg', 'active'),
('Oak Modular Shelf', 'Versatile modular shelving system in solid oak', 'Office', 549.00, '/assets/bookshelf-oak.jpg', 'active')
ON CONFLICT DO NOTHING;

-- Now add these products to featured collections
INSERT INTO public.featured_collections (product_id, display_order)
SELECT p.id, ROW_NUMBER() OVER (ORDER BY p.name)
FROM public.products p
WHERE p.name IN (
  'Oslo Dining Chair',
  'Sage Velvet Sectional', 
  'Walnut Coffee Table',
  'Brass Nightstand',
  'Luna Accent Chair',
  'Oak Modular Shelf'
)
ON CONFLICT DO NOTHING;