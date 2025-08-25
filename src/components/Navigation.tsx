import { Button } from "@/components/ui/button";
import { ShoppingBag, Menu, Search } from "lucide-react";

const Navigation = () => {
  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-charcoal">Luxe Home</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <a href="#" className="text-foreground hover:text-sage transition-colors">Living Room</a>
              <a href="#" className="text-foreground hover:text-sage transition-colors">Bedroom</a>
              <a href="#" className="text-foreground hover:text-sage transition-colors">Dining</a>
              <a href="#" className="text-foreground hover:text-sage transition-colors">Office</a>
              <a href="#" className="text-foreground hover:text-sage transition-colors">Sale</a>
            </div>
          </div>

          {/* Right side icons */}
          <div className="flex items-center space-x-4">
            <Search className="h-5 w-5 text-muted-foreground hover:text-sage cursor-pointer" />
            <div className="relative">
              <ShoppingBag className="h-5 w-5 text-muted-foreground hover:text-sage cursor-pointer" />
              <span className="absolute -top-2 -right-2 bg-sage text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">2</span>
            </div>
            <Button variant="ghost" size="sm" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;