-- Create featured_collections table
CREATE TABLE public.featured_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  featured_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.featured_collections ENABLE ROW LEVEL SECURITY;

-- Create policies for featured collections
CREATE POLICY "Anyone can view featured collections" 
ON public.featured_collections 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage featured collections" 
ON public.featured_collections 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_featured_collections_updated_at
BEFORE UPDATE ON public.featured_collections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_featured_collections_display_order ON public.featured_collections(display_order);
CREATE INDEX idx_featured_collections_featured_until ON public.featured_collections(featured_until);

-- Insert some sample featured products (assuming we have products in the database)
INSERT INTO public.featured_collections (product_id, display_order) 
SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) 
FROM public.products 
WHERE status = 'active' 
LIMIT 6;