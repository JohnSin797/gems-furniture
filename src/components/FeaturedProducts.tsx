import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
}

const FeaturedProducts = () => {
  const { data: featuredProducts, isLoading } = useQuery({
    queryKey: ['featuredProducts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('featured_collections')
        .select(`
          id,
          display_order,
          products (
            id,
            name,
            price,
            category,
            image_url
          )
        `)
        .order('display_order', { ascending: true });

      if (error) throw error;

      return data?.map(item => ({
        id: item.products.id,
        name: item.products.name,
        price: item.products.price,
        image: item.products.image_url || '/placeholder.svg',
        category: item.products.category
      })) || [];
    }
  });

  const products = featuredProducts || [];

  if (isLoading) {
    return (
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-charcoal mb-4">Featured Collection</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Handpicked pieces that bring elegance and comfort to every corner of your home
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="bg-gray-200 h-64 rounded-lg mb-4"></div>
                <div className="bg-gray-200 h-4 rounded mb-2"></div>
                <div className="bg-gray-200 h-4 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!products.length) {
    return null;
  }

  return (
    <section className="py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-charcoal mb-4">Featured Collection</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Handpicked pieces that bring elegance and comfort to every corner of your home
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <Link
            to="/products"
            className="inline-flex items-center px-8 py-3 text-lg font-semibold text-sage border-2 border-sage hover:bg-sage hover:text-white transition-all duration-300"
          >
            View All Products
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;