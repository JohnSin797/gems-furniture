import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingBag, Menu, Search, Camera, Bell, User, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";


const Navigation = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  

  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessingImage(true);
      
      toast({
        title: "Processing image",
        description: "Analyzing your image to find similar products...",
      });

      try {
        const formData = new FormData();
        formData.append('image', file);

        const { data, error } = await supabase.functions.invoke('image-search', {
          body: formData,
        });

        if (error) throw error;

        const { searchTerms, matchingProducts, analysis } = data;
        
        console.log('Image analysis results:', { searchTerms, matchingProducts, analysis });

        if (matchingProducts && matchingProducts.length > 0) {
          toast({
            title: "Found matching products!",
            description: `Found ${matchingProducts.length} similar items`,
          });
          
          // Navigate to products page with search results
          navigate('/products', { 
            state: { 
              imageSearchResults: matchingProducts,
              searchTerms: searchTerms
            }
          });
        } else {
          toast({
            title: "No matches found",
            description: "Try capturing a clearer image of furniture items",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Image search error:', error);
        toast({
          title: "Search failed",
          description: "Failed to analyze image. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsProcessingImage(false);
        // Reset the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
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
                disabled={isProcessingImage}
              >
                <Camera className={`h-4 w-4 ${isProcessingImage ? 'animate-pulse' : ''}`} />
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