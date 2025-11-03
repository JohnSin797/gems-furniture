import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;

export const useBestSeller = () => {
  return useQuery({
    queryKey: ['best-seller'],
    queryFn: async (): Promise<Product | null> => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch order items from the last 30 days
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity, orders!inner(created_at)')
        .gte('orders.created_at', thirtyDaysAgo.toISOString());

      if (orderItemsError) throw orderItemsError;

      if (!orderItems || orderItems.length === 0) return null;

      // Aggregate quantities by product_id
      const productCounts: Record<string, number> = {};
      orderItems.forEach(item => {
        productCounts[item.product_id] = (productCounts[item.product_id] || 0) + item.quantity;
      });

      // Find the product with the highest quantity
      const bestProductId = Object.entries(productCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0];

      if (!bestProductId) return null;

      // Fetch the product details
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', bestProductId)
        .single();

      if (productError) throw productError;

      return product;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};