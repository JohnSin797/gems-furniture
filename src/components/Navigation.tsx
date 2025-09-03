import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingBag, Menu, Search, Camera, Bell, User, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";

const Navigation = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, userRole, signOut } = useAuth();
  const { getItemCount } = useCart();

  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Image captured for search:", file);
      toast({
        title: "Image captured",
        description: "Processing your image for search...",
      });
    }
  };

  const handleNotificationClick = () => {
    toast({
      title: "Notifications",
      description: "You have 3 new notifications",
    });
  };

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold text-charcoal hover:text-sage transition-colors">
              Gemms Furniture
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
                onClick={handleCameraClick}
              >
                <Camera className="h-4 w-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageCapture}
              />
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-6">
            <Link to="/products" className="text-foreground hover:text-sage transition-colors hidden md:block">
              Products
            </Link>
            {user && (
              <Link to="/orders" className="text-foreground hover:text-sage transition-colors hidden md:block">
                Orders
              </Link>
            )}
            {userRole === 'admin' && (
              <Link to="/admin" className="text-foreground hover:text-sage transition-colors hidden md:block">
                Admin
              </Link>
            )}
            
            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="relative p-2 h-10 w-10"
              onClick={handleNotificationClick}
            >
              <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-xs font-medium"
              >
                3
              </Badge>
            </Button>

            {/* Cart */}
            <Button
              variant="ghost"
              size="sm"
              className="relative p-2 h-10 w-10"
              asChild
            >
              <Link to="/cart">
                <ShoppingBag className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                {getItemCount() > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-xs font-medium bg-primary text-primary-foreground"
                  >
                    {getItemCount()}
                  </Badge>
                )}
              </Link>
            </Button>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center space-x-2">
              {user ? (
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              ) : (
                <>
                  <Link to="/auth">
                    <Button variant="ghost" size="sm">
                      <User className="h-4 w-4 mr-2" />
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
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