import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import BestSeller from "@/components/BestSeller";
import FeaturedProducts from "@/components/FeaturedProducts";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <BestSeller />
      <FeaturedProducts />
      <Footer />
    </div>
  );
};

export default Index;
