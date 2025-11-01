import { useQuery } from "@tanstack/react-query";
import ProductCard from "./ProductCard";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  quantity: number;
}

interface OrderItemWithProduct {
  quantity: number;
  products: {
    id: string;
    name: string;
    price: number;
    category: string;
    image_url: string | null;
  } | null;
}

const BestSeller = () => {
  const { data: bestSeller, isLoading } = useQuery({
    queryKey: ['bestSeller'],
    queryFn: async () => {
      // Get the start and end of the previous month
      const now = new Date();
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

      // Fetch order items from previous month
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select(`
          quantity,
          product_id,
          orders!inner(created_at)
        `)
        .gte('orders.created_at', prevMonthStart.toISOString())
        .lt('orders.created_at', prevMonthEnd.toISOString());

      if (error) throw error;

      if (!orderItems || orderItems.length === 0) return null;

      // Aggregate quantities by product_id
      const productQuantities = new Map<string, number>();

      orderItems.forEach((item) => {
        const existing = productQuantities.get(item.product_id) || 0;
        productQuantities.set(item.product_id, existing + item.quantity);
      });

      // Find the product_id with the highest quantity >= 15
      let bestProductId = null;
      let maxQuantity = 0;

       for (const [productId, quantity] of productQuantities) {
         if (quantity > maxQuantity) {
           maxQuantity = quantity;
           bestProductId = productId;
         }
       }

      if (!bestProductId) return null;

      // Fetch the product details
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, price, category, image_url')
        .eq('id', bestProductId)
        .single();

      if (productError || !product) return null;

      // Get inventory for the product
      const { data: inventory } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('product_id', product.id)
        .single();

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image_url || '/placeholder.svg',
        category: product.category,
        quantity: inventory?.quantity || 0
      };
    }
  });

  if (isLoading) {
    return (
      <section className="py-16 bg-terracotta/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-charcoal mb-4">Best Seller</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our most popular piece from last month
            </p>
          </div>
          <div className="flex justify-center">
            <div className="animate-pulse">
              <div className="bg-gray-200 h-64 w-80 rounded-lg mb-4"></div>
              <div className="bg-gray-200 h-4 rounded mb-2"></div>
              <div className="bg-gray-200 h-4 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!bestSeller) {
    return null; // No best seller this month
  }

  return (
    <section className="py-16 bg-terracotta/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-charcoal mb-4">Best Seller</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our most popular piece from last month
          </p>
        </div>
        <div className="flex justify-center">
          <div className="max-w-sm">
            <ProductCard {...bestSeller} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default BestSeller;