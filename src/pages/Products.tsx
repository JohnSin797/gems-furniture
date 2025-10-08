import Navigation from "@/components/Navigation";
import AdminLayout from "@/components/AdminLayout";
import ProductCard from "@/components/ProductCard";
import FeaturedProducts from "@/components/FeaturedProducts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string;
  type: string | null;
  created_at: string;
  description?: string;
  stock: number;
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const { toast } = useToast();
  const location = useLocation();
  const [imageSearchActive, setImageSearchActive] = useState(false);
  const [textSearchActive, setTextSearchActive] = useState(false);
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [textSearchQuery, setTextSearchQuery] = useState("");
  const { userRole } = useAuth();

  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          inventory!inner(quantity)
        `)
        .eq('status', 'active');
      if (error) throw error;

      // Transform data to include stock from inventory
      const productsWithStock = (data || []).map(product => ({
        ...product,
        stock: product.inventory?.[0]?.quantity || 0
      }));

      setProducts(productsWithStock);
      setFilteredProducts(productsWithStock);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({ title: "Error", description: "Failed to load products.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Handle navigation state
  useEffect(() => {
    const state = location.state as { imageSearchResults?: Product[]; searchTerms?: string[]; searchQuery?: string; matchingProducts?: Product[] } | null;
    if (state?.imageSearchResults) {
      setFilteredProducts(state.imageSearchResults);
      setSearchTerms(state.searchTerms || []);
      setImageSearchActive(true);
      setTextSearchActive(false);
      toast({ title: "Image search results", description: `Showing ${state.imageSearchResults.length} products` });
    } else if (state?.matchingProducts) {
      setFilteredProducts(state.matchingProducts);
      setTextSearchQuery(state.searchQuery || "");
      setTextSearchActive(true);
      setImageSearchActive(false);
      setSearchTerms(state.searchTerms || []);
      toast({ title: "Search results", description: `Showing ${state.matchingProducts.length} products matching "${state.searchQuery}"` });
    }
  }, [location.state, toast]);

  const filterAndSortProducts = useCallback(() => {
    let filtered = [...products];

    if (!imageSearchActive && !textSearchActive) {
      if (categoryFilter !== "all") filtered = filtered.filter(p => p.category.toLowerCase().replace(' ', '-') === categoryFilter);
      if (typeFilter !== "all") filtered = filtered.filter(p => p.type?.toLowerCase() === typeFilter);

      switch (sortBy) {
        case "price-low": filtered.sort((a, b) => a.price - b.price); break;
        case "price-high": filtered.sort((a, b) => b.price - a.price); break;
        case "newest": filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
        default: break;
      }

      setFilteredProducts(filtered);
    }
  }, [products, categoryFilter, typeFilter, sortBy, imageSearchActive, textSearchActive]);

  useEffect(() => { filterAndSortProducts(); }, [products, categoryFilter, typeFilter, sortBy, filterAndSortProducts]);

  if (loading) return (
    <div className="min-h-screen bg-background">
      {userRole === 'admin' ? <AdminLayout><div className="text-center">Loading products...</div></AdminLayout> : <><Navigation /><main className="max-w-7xl mx-auto px-4 py-8 text-center">Loading products...</main></>}
    </div>
  );

  const content = (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">{imageSearchActive ? "Image Search Results" : textSearchActive ? "Search Results" : "Products"}</h1>
          <p className="text-muted-foreground mb-4">{imageSearchActive ? "Products matching your uploaded image" : textSearchActive ? `Products matching "${textSearchQuery}"` : "Discover our curated collection of premium furniture"}</p>

          {imageSearchActive && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium">Detected terms:</span>
                {searchTerms.map((term, idx) => <Badge key={idx} variant="secondary" className="text-xs">{term}</Badge>)}
              </div>
              <button onClick={() => { setImageSearchActive(false); setSearchTerms([]); filterAndSortProducts(); }} className="text-sm text-primary hover:underline">← Back to all products</button>
            </div>
          )}

          {textSearchActive && (
            <div className="mb-6">
              <button onClick={() => { setTextSearchActive(false); setTextSearchQuery(""); filterAndSortProducts(); }} className="text-sm text-primary hover:underline">← Back to all products</button>
            </div>
          )}
         </div>

          {/* Featured Collection */}
          {!imageSearchActive && !textSearchActive && <FeaturedProducts showViewAllButton={false} maxItems={6} showPagination={true} />}

         {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex items-center gap-2"><Filter className="h-4 w-4" /><span className="text-sm font-medium">Filter by:</span></div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger><SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="living-room">Living Room</SelectItem>
            <SelectItem value="bedroom">Bedroom</SelectItem>
            <SelectItem value="dining">Dining</SelectItem>
            <SelectItem value="office">Office</SelectItem>
          </SelectContent></Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="chair">Chair</SelectItem>
            <SelectItem value="table">Table</SelectItem>
            <SelectItem value="sofa">Sofa</SelectItem>
            <SelectItem value="storage">Storage</SelectItem>
          </SelectContent></Select>

          <Select value={sortBy} onValueChange={setSortBy}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort by" /></SelectTrigger><SelectContent>
            <SelectItem value="featured">Featured</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
          </SelectContent></Select>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} id={product.id} name={product.name} price={product.price} image={product.image_url || '/placeholder.svg'} category={product.category} stock={product.stock} />
          ))}
        </div>

        {filteredProducts.length === 0 && <div className="text-center py-12"><p className="text-muted-foreground">No products found matching your criteria.</p></div>}
      </main>
  );

  return userRole === 'admin' ? <AdminLayout>{content}</AdminLayout> : (
    <div className="min-h-screen bg-background">
      <Navigation />
      {content}
    </div>
  );
};

export default Products;
