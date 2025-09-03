import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ProductCard from "./ProductCard";
import { supabase } from "@/integrations/supabase/client";
import chairImage from "@/assets/chair-oak.jpg";
import sofaImage from "@/assets/sofa-sage.jpg";
import tableImage from "@/assets/table-walnut.jpg";
import nightstandImage from "@/assets/nightstand-wood.jpg";
import armchairImage from "@/assets/armchair-cream.jpg";
import bookshelfImage from "@/assets/bookshelf-oak.jpg";

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
}

// Asset mapping for the static images
const imageAssetMap: Record<string, string> = {
  "/src/assets/chair-oak.jpg": chairImage,
  "/src/assets/sofa-sage.jpg": sofaImage,
  "/src/assets/table-walnut.jpg": tableImage,
  "/src/assets/nightstand-wood.jpg": nightstandImage,
  "/src/assets/armchair-cream.jpg": armchairImage,
  "/src/assets/bookshelf-oak.jpg": bookshelfImage,
};

const FeaturedProducts = () => {
  const { data: featuredProducts, isLoading, error } = useQuery({
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
        originalPrice: item.products.name === "Oslo Dining Chair" ? 399 : undefined,
        image: imageAssetMap[item.products.image_url] || item.products.image_url,
        category: item.products.category
      })) || [];
    }
  });

  // Fallback data in case database is empty
  const fallbackProducts: Product[] = [
    {
      id: "1",
      name: "Oslo Dining Chair",
      price: 299,
      originalPrice: 399,
      image: chairImage,
      category: "Dining"
    },
    {
      id: "2", 
      name: "Sage Velvet Sectional",
      price: 1899,
      image: sofaImage,
      category: "Living Room"
    },
    {
      id: "3",
      name: "Walnut Coffee Table",
      price: 649,
      image: tableImage,
      category: "Living Room"
    },
    {
      id: "4",
      name: "Brass Nightstand",
      price: 429,
      image: nightstandImage,
      category: "Bedroom"
    },
    {
      id: "5",
      name: "Luna Accent Chair",
      price: 799,
      image: armchairImage,
      category: "Living Room"
    },
    {
      id: "6",
      name: "Oak Modular Shelf",
      price: 549,
      image: bookshelfImage,
      category: "Office"
    }
  ];

  const products = featuredProducts && featuredProducts.length > 0 ? featuredProducts : fallbackProducts;

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
          <button className="inline-flex items-center px-8 py-3 text-lg font-semibold text-sage border-2 border-sage hover:bg-sage hover:text-white transition-all duration-300">
            View All Products
          </button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;