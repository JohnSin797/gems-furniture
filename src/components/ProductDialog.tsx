import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ImageUploadSelector } from "./ImageUploadSelector";

// ----------------------
// Define Product types
// ----------------------
export type ProductStatus = "active" | "inactive" | "discontinued";

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  type?: string;
  image_url?: string;
  status: ProductStatus;
}

export interface ProductWithInventory extends Product {
  inventory?: { quantity: number }[];
}

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductWithInventory;
  onSave: () => void;
}

// ----------------------
// Component
// ----------------------
export const ProductDialog = ({ open, onOpenChange, product, onSave }: ProductDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    price: string;
    category: string;
    type: string;
    image_url: string;
    status: ProductStatus;
    stock: string;
  }>({
    name: "",
    description: "",
    price: "",
    category: "",
    type: "",
    image_url: "",
    status: "active",
    stock: "",
  });

  // Load product data into form when editing
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name ?? "",
        description: product.description ?? "",
        price: product.price.toString(),
        category: product.category ?? "",
        type: product.type ?? "",
        image_url: product.image_url ?? "",
        status: product.status ?? "active",
        stock: product.inventory?.[0]?.quantity?.toString() ?? "0",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        price: "",
        category: "",
        type: "",
        image_url: "",
        status: "active",
        stock: "",
      });
    }
  }, [product, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.category) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        type: formData.type,
        image_url: formData.image_url,
        status: formData.status,
      };

      if (product) {
        // Update existing product
        const { error: productError } = await supabase
          .from("products")
          .update(productData)
          .eq("id", product.id);

        if (productError) throw productError;

        const { error: inventoryError } = await supabase
          .from("inventory")
          .update({ quantity: parseInt(formData.stock, 10) })
          .eq("product_id", product.id);

        if (inventoryError) throw inventoryError;

        toast({ title: "Success", description: "Product updated successfully" });
      } else {
        // Create new product
        const { data: newProduct, error: productError } = await supabase
          .from("products")
          .insert(productData)
          .select()
          .single<Product>();

        if (productError) throw productError;
        if (!newProduct) throw new Error("Product insert failed");

        const { error: inventoryError } = await supabase
          .from("inventory")
          .insert({ product_id: newProduct.id, quantity: parseInt(formData.stock, 10) });

        if (inventoryError) throw inventoryError;

        toast({ title: "Success", description: "Product created successfully" });
      }

      onSave();
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        title: "Error",
        description: "Failed to save product",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add New Product"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter product name"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Enter product description"
              rows={3}
            />
          </div>

          {/* Price + Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Stock Quantity</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData((prev) => ({ ...prev, stock: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Living Room">Living Room</SelectItem>
                <SelectItem value="Bedroom">Bedroom</SelectItem>
                <SelectItem value="Dining">Dining</SelectItem>
                <SelectItem value="Office">Office</SelectItem>
                <SelectItem value="Storage">Storage</SelectItem>
                <SelectItem value="Lighting">Lighting</SelectItem>
                <SelectItem value="Decor">Decor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Input
              id="type"
              value={formData.type}
              onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
              placeholder="e.g., Sofa, Chair, Table"
            />
          </div>

          {/* Image Upload */}
          <ImageUploadSelector
            value={formData.image_url}
            onChange={(url) => setFormData((prev) => ({ ...prev, image_url: url }))}
          />

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: ProductStatus) => setFormData((prev) => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : product ? "Update Product" : "Create Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
