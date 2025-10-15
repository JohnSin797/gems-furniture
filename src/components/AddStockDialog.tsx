import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

interface Product {
  id: string;
  name: string;
  inventory?: {
    quantity: number;
  } | null;
}

interface AddStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onStockAdded: () => void;
}

export const AddStockDialog = ({ open, onOpenChange, product, onStockAdded }: AddStockDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { createNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [quantityToAdd, setQuantityToAdd] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product || !quantityToAdd || parseInt(quantityToAdd, 10) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid quantity to add",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const currentQuantity = product.inventory?.quantity || 0;
      const newQuantity = currentQuantity + parseInt(quantityToAdd, 10);

      const { error } = await supabase
        .from("inventory")
        .upsert(
          {
            product_id: product.id,
            quantity: newQuantity,
            reorder_level: 10, // Default if not set
            reserved_quantity: 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "product_id" }
        );

      if (error) throw error;

      toast({
        title: "Success",
        description: `Added ${quantityToAdd} units to ${product.name}. New stock: ${newQuantity}`,
      });

      // Create notification for stock addition
      if (user?.id) {
        await createNotification(
          user.id,
          "Stock Added",
          `Successfully added ${quantityToAdd} units to ${product.name}. New stock level: ${newQuantity}`,
          "success"
        );
      }

      setQuantityToAdd("");
      onStockAdded();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding stock:", error);
      toast({
        title: "Error",
        description: "Failed to add stock",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setQuantityToAdd("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Stock to {product?.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-stock">Current Stock</Label>
            <div className="text-sm text-muted-foreground">
              {product?.inventory?.quantity || 0} units
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity-to-add">Quantity to Add *</Label>
            <Input
              id="quantity-to-add"
              type="number"
              min="1"
              value={quantityToAdd}
              onChange={(e) => setQuantityToAdd(e.target.value)}
              placeholder="Enter quantity to add"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>New Stock Total</Label>
            <div className="text-sm text-muted-foreground">
              {(product?.inventory?.quantity || 0) + (parseInt(quantityToAdd, 10) || 0)} units
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Stock"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};