import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, MapPin } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
  };
}

interface AddressData {
  street_address: string | null;
  barangay: string | null;
  city: string | null;
  province: string | null;
  zip_code: string | null;
}

const PurchaseModal = ({ isOpen, onClose, product }: PurchaseModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState<AddressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editedAddress, setEditedAddress] = useState({
    street_address: "",
    barangay: "",
    city: "",
    province: "",
    zip_code: "",
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const { createNotification } = useNotifications();

  const subtotal = product.price * quantity;
  const shipping = 0; // No shipping
  const total = subtotal;

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
    if (isOpen && user) {
      fetchAddress();
    }
  }, [isOpen, user, fetchAddress]);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, quantity + delta);
    setQuantity(newQuantity);
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

  const handleConfirmPurchase = () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to make a purchase.",
        variant: "destructive"
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleFinalConfirmPurchase = async () => {
    setShowConfirmDialog(false);
    setLoading(true);
    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          status: 'pending',
          subtotal: subtotal,
           shipping_amount: 0,
          total_amount: total,
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

      // Create order item
      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: product.id,
          product_name: product.name,
          product_image: product.image,
          quantity: quantity,
          unit_price: product.price,
          total_price: subtotal
        });

      if (itemError) throw itemError;

      toast({
        title: "Purchase confirmed!",
        description: `Order ${order.order_number} has been placed successfully.`,
      });

      // Create purchase notification
      await createNotification(
        user.id,
        "New Pending Order",
        `Your order ${order.order_number} for ${quantity} × ${product.name} has been placed successfully.`,
        "info"
      );

      // Notify admins about the new order
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      const admins = adminRoles?.map(role => ({ id: role.user_id })) || [];

      if (admins && admins.length > 0) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user?.id)
          .single();

        const userName = userProfile ? `${userProfile.first_name} ${userProfile.last_name}`.trim() : 'Unknown User';

        // Create notification for each admin
        for (const admin of admins) {
          await createNotification(
            admin.id,
            "New Pending Order",
            `New order ${order.order_number} placed by ${userName}`,
            "info"
          );
        }
      }

      onClose();
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Purchase</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Info */}
          <div className="flex items-center space-x-4">
            <img
              src={product.image}
              alt={product.name}
              className="w-16 h-16 object-cover rounded-md"
            />
            <div>
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-sm text-muted-foreground">${product.price}</p>
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="space-y-2">
            <Label>Quantity</Label>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center"
                min="1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuantityChange(1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

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

          <Separator />

          {/* Order Summary */}
          <div className="space-y-2">
            <h4 className="font-semibold">Order Summary</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal ({quantity} × ${product.price})</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmPurchase}
            disabled={loading || (isEditingAddress ? isAddressEmpty({
              street_address: editedAddress.street_address || null,
              barangay: editedAddress.barangay || null,
              city: editedAddress.city || null,
              province: editedAddress.province || null,
              zip_code: editedAddress.zip_code || null,
            }) : isAddressEmpty(address))}
          >
            {loading ? "Processing..." : "Confirm Purchase"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Your Purchase</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to proceed with this purchase? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalConfirmPurchase}>
              Yes, Confirm Purchase
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default PurchaseModal;