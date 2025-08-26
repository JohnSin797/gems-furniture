import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingBag, Menu, Search, Camera } from "lucide-react";
import { Link } from "react-router-dom";

const Navigation = () => {
  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold text-charcoal hover:text-sage transition-colors">
              Luxe Home
            </Link>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-12"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-6">
            <Link to="/products" className="text-foreground hover:text-sage transition-colors hidden md:block">
              Products
            </Link>
            
            {/* Cart */}
            <Link to="/cart" className="relative">
              <ShoppingBag className="h-5 w-5 text-muted-foreground hover:text-sage cursor-pointer" />
              <span className="absolute -top-2 -right-2 bg-sage text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">2</span>
            </Link>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center space-x-2">
              <Link to="/signin">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="sm">
                  Sign Up
                </Button>
              </Link>
            </div>

            {/* Mobile Menu */}
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