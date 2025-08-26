import Navigation from "@/components/Navigation";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

// Sample products data
const products = [
  {
    id: "1",
    name: "Modern Oak Dining Table",
    price: 899,
    originalPrice: 1199,
    image: "/src/assets/table-walnut.jpg",
    category: "Dining"
  },
  {
    id: "2",
    name: "Velvet Sage Sofa",
    price: 1299,
    image: "/src/assets/sofa-sage.jpg",
    category: "Living Room"
  },
  {
    id: "3",
    name: "Cream Armchair",
    price: 599,
    image: "/src/assets/armchair-cream.jpg",
    category: "Living Room"
  },
  {
    id: "4",
    name: "Oak Bookshelf",
    price: 449,
    image: "/src/assets/bookshelf-oak.jpg",
    category: "Office"
  },
  {
    id: "5",
    name: "Wooden Nightstand",
    price: 299,
    image: "/src/assets/nightstand-wood.jpg",
    category: "Bedroom"
  },
  {
    id: "6",
    name: "Oak Accent Chair",
    price: 399,
    image: "/src/assets/chair-oak.jpg",
    category: "Living Room"
  }
];

const Products = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Products</h1>
          <p className="text-muted-foreground">Discover our curated collection of premium furniture</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filter by:</span>
          </div>
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="living-room">Living Room</SelectItem>
              <SelectItem value="bedroom">Bedroom</SelectItem>
              <SelectItem value="dining">Dining</SelectItem>
              <SelectItem value="office">Office</SelectItem>
            </SelectContent>
          </Select>
          
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {products.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>

        {/* Load More */}
        <div className="text-center">
          <Button variant="outline" size="lg">
            Load More Products
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Products;