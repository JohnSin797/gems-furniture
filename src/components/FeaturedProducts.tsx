import ProductCard from "./ProductCard";
import chairImage from "@/assets/chair-oak.jpg";
import sofaImage from "@/assets/sofa-sage.jpg";
import tableImage from "@/assets/table-walnut.jpg";
import nightstandImage from "@/assets/nightstand-wood.jpg";
import armchairImage from "@/assets/armchair-cream.jpg";
import bookshelfImage from "@/assets/bookshelf-oak.jpg";

const FeaturedProducts = () => {
  const products = [
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