import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingBag, Menu, X, Search, Camera, Bell, User, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";
import Notifications from "@/components/Notifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Navigation = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, userRole, signOut } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { unreadCount } = useNotifications();

  const handleCameraClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleImageCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    toast({ title: "Processing image", description: "Analyzing your image..." });

    try {
      const formData = new FormData();
      formData.append("image", file);

      console.log("Sending image search request...");
      const res = await fetch(
        "https://zdktmnzetynreahdpjim.supabase.co/functions/v1/image-search",
        { method: "POST", body: formData }
      );

      const data = await res.json();

      const { searchTerms, matchingProducts } = data;

      navigate("/products", {
        state: {
          imageSearchResults: matchingProducts || [],
          searchTerms: searchTerms || [],
        },
      });

      toast({
        title: "Image search completed",
        description: matchingProducts?.length
          ? `Found ${matchingProducts.length} similar products`
          : "No products found",
      });
    } catch (error) {
      console.error("Image search error:", error);
      toast({ title: "Search failed", description: "Failed to analyze image.", variant: "destructive" });
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSearch = async () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("Error fetching session:", error);

      const token = data?.session?.access_token;
      console.log("Text search query:", trimmedQuery, "User token:", token);

      const res = await fetch(
        "https://zdktmnzetynreahdpjim.supabase.co/functions/v1/text-search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ query: trimmedQuery }),
        }
      );

      const dataResponse = await res.json();
      console.log("Text search response:", dataResponse);

      const { searchTerms, matchingProducts } = dataResponse;

      navigate("/products", {
        state: {
          searchQuery: trimmedQuery,
          searchTerms: searchTerms || [],
          matchingProducts: matchingProducts || [],
        },
      });

      toast({
        title: "Search completed",
        description: matchingProducts?.length
          ? `Found ${matchingProducts.length} products`
          : "No products found",
      });
    } catch (error) {
      console.error("Text search error:", error);
      toast({ title: "Search failed", description: "Failed to search products.", variant: "destructive" });
    }
  };

  const handleNotificationClick = () => setNotificationsOpen(!notificationsOpen);
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") handleSearch(); };

  return (
    <nav className="bg-sage-light border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold text-charcoal hover:text-sage transition-colors">
              Gems Furniture
            </Link>
          </div>

            {userRole !== "admin" && (
              <div className="flex-1 max-w-xl mx-8 hidden sm:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search products..."
                    className="w-full pl-10 pr-12"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-10 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={handleSearch}
                    disabled={!searchQuery.trim()}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={handleCameraClick}
                    disabled={isProcessingImage}
                  >
                    <Camera className={`h-4 w-4 ${isProcessingImage ? "animate-pulse" : ""}`} />
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
            )}

          <div className="flex items-center space-x-2 sm:space-x-6">
              <Link to="/products" className="text-foreground hover:text-sage transition-colors hidden md:block">Products</Link>
              {user && <Link to="/orders" className="text-foreground hover:text-sage transition-colors hidden md:block">Orders</Link>}
               {userRole === "admin" && <Link to="/admin" className="text-foreground hover:text-sage transition-colors hidden md:block">Dashboard</Link>}

             <Button variant="ghost" size="sm" className="relative p-2 h-10 w-10 rounded-full hover:bg-terracotta/10" onClick={() => navigate('/cart')}>
               <ShoppingBag className="h-5 w-5 text-muted-foreground hover:text-terracotta" />
               {totalItems > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-xs font-medium">{totalItems > 99 ? "99+" : totalItems}</Badge>}
             </Button>

             <Button variant="ghost" size="sm" className="relative p-2 h-10 w-10 rounded-full hover:bg-terracotta/10" onClick={handleNotificationClick}>
               <Bell className="h-5 w-5 text-muted-foreground hover:text-terracotta" />
               {unreadCount > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-xs font-medium">{unreadCount > 99 ? "99+" : unreadCount}</Badge>}
             </Button>

             <div className="hidden md:flex items-center space-x-2">
               {user ? (
                  <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-terracotta/10">
                          <User className="h-4 w-4 text-muted-foreground hover:text-terracotta" />
                        </Button>
                     </DropdownMenuTrigger>
                   <DropdownMenuContent align="end">
                     <DropdownMenuItem asChild>
                       <Link to="/profile">Profile</Link>
                     </DropdownMenuItem>
                     <DropdownMenuItem onClick={signOut}>
                       <LogOut className="h-4 w-4 mr-2" />Sign Out
                     </DropdownMenuItem>
                   </DropdownMenuContent>
                 </DropdownMenu>
               ) : (
                   <Link to="/auth"><Button variant="ghost" size="icon" className="rounded-full hover:bg-terracotta/10"><User className="h-4 w-4 text-muted-foreground hover:text-terracotta" /></Button></Link>
               )}
             </div>

             {/* Mobile Menu */}
             <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
               <SheetTrigger asChild>
                 <Button variant="ghost" size="sm" className="md:hidden">
                   <Menu className="h-5 w-5" />
                 </Button>
               </SheetTrigger>
               <SheetContent side="right" className="w-80">
                 <div className="flex flex-col space-y-6 mt-6">
                   {/* Mobile Search */}
                   {userRole !== "admin" && (
                     <div className="relative">
                       <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                       <Input
                         type="text"
                         placeholder="Search products..."
                         className="w-full pl-10 pr-12"
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         onKeyDown={handleSearchKeyDown}
                       />
                       <Button
                         variant="ghost"
                         size="sm"
                         className="absolute right-10 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                         onClick={handleSearch}
                         disabled={!searchQuery.trim()}
                       >
                         <Search className="h-4 w-4" />
                       </Button>
                       <Button
                         variant="ghost"
                         size="sm"
                         className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                         onClick={handleCameraClick}
                         disabled={isProcessingImage}
                       >
                         <Camera className={`h-4 w-4 ${isProcessingImage ? "animate-pulse" : ""}`} />
                       </Button>
                     </div>
                   )}

                   {/* Mobile Navigation Links */}
                   <div className="flex flex-col space-y-4">
                     <Link
                       to="/products"
                       className="text-foreground hover:text-sage transition-colors py-2"
                       onClick={() => setMobileMenuOpen(false)}
                     >
                       Products
                     </Link>
                     {user && (
                       <Link
                         to="/orders"
                         className="text-foreground hover:text-sage transition-colors py-2"
                         onClick={() => setMobileMenuOpen(false)}
                       >
                         Orders
                       </Link>
                     )}
                     {userRole === "admin" && (
                       <Link
                         to="/admin"
                         className="text-foreground hover:text-sage transition-colors py-2"
                         onClick={() => setMobileMenuOpen(false)}
                       >
                         Dashboard
                       </Link>
                     )}
                   </div>

                   {/* Mobile User Actions */}
                   <div className="border-t pt-4">
                     {user ? (
                       <div className="flex flex-col space-y-2">
                         <Link
                           to="/profile"
                           className="text-foreground hover:text-sage transition-colors py-2"
                           onClick={() => setMobileMenuOpen(false)}
                         >
                           Profile
                         </Link>
                         <Button
                           variant="ghost"
                           onClick={() => {
                             signOut();
                             setMobileMenuOpen(false);
                           }}
                           className="justify-start p-0 h-auto"
                         >
                           <LogOut className="h-4 w-4 mr-2" />
                           Sign Out
                         </Button>
                       </div>
                     ) : (
                       <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                         <Button className="w-full">Sign In</Button>
                       </Link>
                     )}
                   </div>
                 </div>
               </SheetContent>
             </Sheet>
          </div>
        </div>
      </div>
      <Notifications isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </nav>
  );
};

export default Navigation;
