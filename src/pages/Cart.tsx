import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, Trash2, ShoppingBag, MapPin } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { formatPrice } from "@/lib/utils";

interface AddressData {
  street_address: string | null;
  barangay: string | null;
  city: string | null;
  province: string | null;
  zip_code: string | null;
}

const Cart = () => {
  const { user } = useAuth();
  const { items, totalItems, totalPrice, updateQuantity, removeFromCart, clearCart, isLoading } = useCart();
  const { toast } = useToast();
  const { createNotification } = useNotifications();
  const navigate = useNavigate();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [address, setAddress] = useState<AddressData | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editedAddress, setEditedAddress] = useState({
    street_address: "",
    barangay: "",
    city: "",
    province: "",
    zip_code: "",
  });

  const fetchAddress = useCallback(async () => {
    setAddressLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('street_address, barangay, city, province, zip_code')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      setAddress(data || null);
      if (data) {
        setEditedAddress({
          street_address: data.street_address || "",
          barangay: data.barangay || "",
          city: data.city || "",
          province: data.province || "",
          zip_code: data.zip_code || "",
        });
      }
    } catch (error) {
      console.error('Error fetching address:', error);
      toast({
        title: "Error",
        description: "Failed to load address information.",
        variant: "destructive",
      });
    } finally {
      setAddressLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    if (user) {
      fetchAddress();
    }
  }, [user, fetchAddress]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold text-charcoal mb-4">Please Sign In</h1>
          <p className="text-muted-foreground mb-8">You need to be signed in to view your cart.</p>
          <Link to="/auth">
            <Button>Sign In</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-8"></div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16 text-center">
          <ShoppingBag className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-charcoal mb-4">Your Cart is Empty</h1>
          <p className="text-muted-foreground mb-8">Add some beautiful furniture pieces to get started!</p>
          <Link to="/products">
            <Button>Browse Products</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const handleQuantityChange = async (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    await updateQuantity(productId, newQuantity);
  };

  const handleRemoveItem = async (productId: string) => {
    await removeFromCart(productId);
  };

  const processCheckout = async () => {
    setIsCheckingOut(true);
    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          status: 'pending',
          subtotal: totalPrice,
          shipping_amount: 0,
          total_amount: totalPrice,
          order_number: `ORD-${Date.now()}`,
          shipping_address: isEditingAddress ? {
            street: editedAddress.street_address,
            barangay: editedAddress.barangay,
            city: editedAddress.city,
            province: editedAddress.province,
            zip_code: editedAddress.zip_code,
          } : address ? {
            street: address.street_address,
            barangay: address.barangay,
            city: address.city,
            province: address.province,
            zip_code: address.zip_code,
          } : null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_image: item.product_image,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update inventory for each item
      for (const item of items) {
        const { data: currentInventory, error: fetchInventoryError } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('product_id', item.product_id)
          .single();

        if (fetchInventoryError) throw fetchInventoryError;

        const newQuantity = (currentInventory?.quantity || 0) - item.quantity;

        const { error: inventoryError } = await supabase
          .from('inventory')
          .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
          .eq('product_id', item.product_id);

        if (inventoryError) throw inventoryError;
      }

      // Clear the cart
      await clearCart();

      toast({
        title: "Order placed successfully!",
        description: `Order ${order.order_number} has been created.`,
      });

      // Create notification
      await createNotification(
        user.id,
        "New Pending Order",
        `Your order ${order.order_number} for ${totalItems} items has been placed successfully.`,
        "info"
      );

      // Notify admins
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      const admins = adminRoles?.map(role => ({ id: role.user_id })) || [];

      if (admins && admins.length > 0) {
        const userName = user.email || 'Unknown User';

        for (const admin of admins) {
          await createNotification(
            admin.id,
            "New Pending Order",
            `New order ${order.order_number} placed by ${userName}`,
            "info"
          );
        }
      }

      // Navigate to orders page
      navigate('/orders');
    } catch (error) {
      console.error('Error during checkout:', error);
      toast({
        title: "Checkout failed",
        description: "There was an error processing your order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCheckingOut(false);
    }
   };

   const handleEditAddress = () => {
    setIsEditingAddress(true);
  };

  const handleSaveAddress = () => {
    setAddress({
      street_address: editedAddress.street_address || null,
      barangay: editedAddress.barangay || null,
      city: editedAddress.city || null,
      province: editedAddress.province || null,
      zip_code: editedAddress.zip_code || null,
    });
    setIsEditingAddress(false);
  };

  const handleCancelEdit = () => {
    // Reset edited address to current address
    if (address) {
      setEditedAddress({
        street_address: address.street_address || "",
        barangay: address.barangay || "",
        city: address.city || "",
        province: address.province || "",
        zip_code: address.zip_code || "",
      });
    }
    setIsEditingAddress(false);
  };

  const isAddressEmpty = (addr: AddressData | null) => {
    if (!addr) return true;

    const parts = [
      addr.street_address,
      addr.barangay,
      addr.city,
      addr.province,
      addr.zip_code
    ].filter(Boolean);

    return parts.length === 0;
  };

  const formatAddress = (addr: AddressData | null) => {
    if (!addr) return "No address on file";

    const parts = [
      addr.street_address,
      addr.barangay,
      addr.city,
      addr.province,
      addr.zip_code
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : "No address on file";
  };

  const handleCheckout = () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to checkout.",
        variant: "destructive"
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Add items to your cart before checking out.",
        variant: "destructive"
      });
      return;
    }

    if (isAddressEmpty(address) && !isEditingAddress) {
      toast({
        title: "Address required",
        description: "Please provide a shipping address before checking out.",
        variant: "destructive"
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-charcoal">Shopping Cart</h1>
              <p className="text-muted-foreground mt-2">
                {totalItems} {totalItems === 1 ? 'item' : 'items'} in your cart
              </p>
            </div>
            <Button
              variant="outline"
              onClick={clearCart}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cart
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-20 h-20 object-cover rounded-md"
                      />
                       <div className="flex-1">
                         <h3 className="font-semibold text-charcoal">{item.product_name}</h3>
                         <p className="text-sm text-muted-foreground">{formatPrice(item.unit_price)}</p>
                       </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(item.product_id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(item.product_id, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                       <div className="text-right">
                         <p className="font-semibold text-charcoal">{formatPrice(item.total_price)}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.product_id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-0 h-auto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Subtotal ({totalItems} items)</span>
                    <span>₱{totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>Free</span>
                  </div>
                  <Separator />

                  {/* Address */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span>Shipping Address</span>
                      </Label>
                      {!addressLoading && !isEditingAddress && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEditAddress}
                        >
                          Edit
                        </Button>
                      )}
                    </div>

                    {isEditingAddress ? (
                      <div className="space-y-3 p-3 border rounded-md">
                        <div className="grid grid-cols-1 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="street_address" className="text-xs">Street Address</Label>
                            <Input
                              id="street_address"
                              value={editedAddress.street_address}
                              onChange={(e) => setEditedAddress(prev => ({ ...prev, street_address: e.target.value }))}
                              placeholder="Enter street address"
                              className="h-8"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor="barangay" className="text-xs">Barangay</Label>
                              <Input
                                id="barangay"
                                value={editedAddress.barangay}
                                onChange={(e) => setEditedAddress(prev => ({ ...prev, barangay: e.target.value }))}
                                placeholder="Barangay"
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="city" className="text-xs">City</Label>
                              <Input
                                id="city"
                                value={editedAddress.city}
                                onChange={(e) => setEditedAddress(prev => ({ ...prev, city: e.target.value }))}
                                placeholder="City"
                                className="h-8"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor="province" className="text-xs">Province</Label>
                              <Input
                                id="province"
                                value={editedAddress.province}
                                onChange={(e) => setEditedAddress(prev => ({ ...prev, province: e.target.value }))}
                                placeholder="Province"
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="zip_code" className="text-xs">ZIP Code</Label>
                              <Input
                                id="zip_code"
                                value={editedAddress.zip_code}
                                onChange={(e) => setEditedAddress(prev => ({ ...prev, zip_code: e.target.value }))}
                                placeholder="ZIP Code"
                                className="h-8"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveAddress}
                          >
                            Save Address
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-muted rounded-md">
                        {addressLoading ? (
                          <p className="text-sm text-muted-foreground">Loading address...</p>
                        ) : (
                          <p className="text-sm">{formatAddress(address)}</p>
                        )}
                      </div>
                    )}

                    {!address && !addressLoading && !isEditingAddress && (
                      <p className="text-xs text-muted-foreground">
                        Please update your address in your profile settings or click Edit to add one.
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>₱{totalPrice.toFixed(2)}</span>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={isCheckingOut || (isEditingAddress ? isAddressEmpty({
                      street_address: editedAddress.street_address || null,
                      barangay: editedAddress.barangay || null,
                      city: editedAddress.city || null,
                      province: editedAddress.province || null,
                      zip_code: editedAddress.zip_code || null,
                    }) : isAddressEmpty(address))}
                  >
                    {isCheckingOut ? "Processing..." : "Proceed to Checkout"}
                  </Button>
                  <Link to="/products">
                    <Button variant="outline" className="w-full">
                      Continue Shopping
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      <ConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Confirm Purchase"
        description={`Are you sure you want to place this order for ₱${totalPrice.toFixed(2)}? This action cannot be undone.`}
        confirmText="Place Order"
        cancelText="Cancel"
        onConfirm={processCheckout}
      />
    </div>
  );
};

export default Cart;