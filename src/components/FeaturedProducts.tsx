import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import ProductCard from "./ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useBestSeller } from "@/hooks/useBestSeller";

interface Product {
   id: string;
   name: string;
   price: number;
   image: string;
   category: string;
   quantity: number;
   description?: string;
}

interface FeaturedProductsProps {
  showViewAllButton?: boolean;
  maxItems?: number;
  showPagination?: boolean;
}

const FeaturedProducts = ({ showViewAllButton = true, maxItems, showPagination = false }: FeaturedProductsProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const { data: bestSeller } = useBestSeller();

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
            image_url,
            description,
            inventory(quantity)
          )
        `)
        .order('display_order', { ascending: true });

      if (error) throw error;

        return data?.map(item => ({
          id: item.products.id,
          name: item.products.name,
          price: item.products.price,
          image: item.products.image_url || '/placeholder.svg',
          category: item.products.category,
          description: item.products.description,
          quantity: item.products.inventory?.quantity || 0
        })).filter(product => product.quantity > 0) || [];
    }
  });

  const allProducts = featuredProducts || [];
  const itemsPerPage = maxItems || allProducts.length;
  const totalPages = Math.ceil(allProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const products = maxItems ? allProducts.slice(startIndex, endIndex) : allProducts;

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
            {Array.from({ length: maxItems || 6 }).map((_, index) => (
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
            <ProductCard key={product.id} {...product} isBestSeller={bestSeller?.id === product.id} />
          ))}
        </div>

        {/* Pagination */}
        {showPagination && totalPages > 1 && (
          <div className="mt-8">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {/* View All Button */}
        {showViewAllButton && (
          <div className="text-center mt-12">
            <Link
              to="/products"
              className="inline-flex items-center px-8 py-3 text-lg font-semibold text-sage border-2 border-sage hover:bg-sage hover:text-white transition-all duration-300"
            >
              View All Products
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProducts;