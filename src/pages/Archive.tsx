import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Archive as ArchiveIcon, RotateCcw, Trash2, Package } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import ConfirmationDialog from "@/components/ConfirmationDialog";

export interface ArchivedProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  status: "active" | "inactive" | "discontinued";
  type?: string;
  description?: string;
  image_url?: string;
  created_at: string;
  inventory?: { quantity: number }[];
}

const Archive = () => {
  const { userRole } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<ArchivedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "restore" | "delete" | null;
    productId: string | null;
  }>({ open: false, type: null, productId: null });

  // Restrict access to admin
  useEffect(() => {
    if (userRole && userRole !== "admin") {
      toast({ title: "Access Denied", description: "You need admin privileges to access this page", variant: "destructive" });
      window.location.href = "/";
    }
  }, [userRole, toast]);

  // Fetch archived products
  const fetchArchivedProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          inventory (
            id,
            product_id,
            quantity,
            reorder_level,
            reserved_quantity,
            updated_at
          )
        `)
        .eq('status', 'inactive')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const normalizedData: ArchivedProduct[] = (data || []).map((p: any) => ({
        ...p,
        inventory: Array.isArray(p.inventory)
          ? p.inventory.map((inv: any) => ({ quantity: inv.quantity }))
          : [],
        status: p.status as "active" | "inactive" | "discontinued",
      }));

      setProducts(normalizedData);
    } catch (error) {
      console.error('Error fetching archived products:', error);
      toast({
        title: "Error",
        description: "Failed to fetch archived products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Handle restore product
  const handleRestoreProduct = (productId: string) => {
    setConfirmDialog({ open: true, type: "restore", productId });
  };

  // Confirm restore product
  const confirmRestoreProduct = async () => {
    if (!confirmDialog.productId) return;
    try {
      const { error } = await supabase
        .from("products")
        .update({ status: 'active' })
        .eq("id", confirmDialog.productId);

      if (error) throw error;
      toast({ title: "Success", description: "Product restored successfully" });
      fetchArchivedProducts();
    } catch (error: any) {
      console.error("Error restoring product:", error);
      toast({ title: "Error", description: "Failed to restore product", variant: "destructive" });
    }
  };

  // Handle permanent delete
  const handlePermanentDelete = (productId: string) => {
    setConfirmDialog({ open: true, type: "delete", productId });
  };

  // Confirm permanent delete
  const confirmPermanentDelete = async () => {
    if (!confirmDialog.productId) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", confirmDialog.productId);
      if (error) throw error;
      toast({ title: "Success", description: "Product permanently deleted" });
      fetchArchivedProducts();
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (userRole === "admin") {
      fetchArchivedProducts();
    }
  }, [userRole, fetchArchivedProducts]);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ArchiveIcon className="h-8 w-8 text-muted-foreground" />
            <h1 className="text-3xl font-bold text-charcoal">Product Archive</h1>
          </div>
          <p className="text-muted-foreground">Manage archived products - restore or permanently delete</p>
        </div>

        {/* Archive Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-charcoal flex items-center gap-2">
              <Package className="h-5 w-5" />
              Archived Products ({products.length})
            </CardTitle>
            <CardDescription>Products that have been archived but can be restored</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Product</TableHead>
                    <TableHead className="min-w-[100px]">Price</TableHead>
                    <TableHead className="min-w-[80px]">Stock</TableHead>
                    <TableHead className="min-w-[120px]">Archived Date</TableHead>
                    <TableHead className="min-w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">Loading archived products...</TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <ArchiveIcon className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">No archived products found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : products.map(product => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">{product.category}</div>
                      </div>
                    </TableCell>
                    <TableCell>₱{product.price}</TableCell>
                    <TableCell>{product.inventory?.[0]?.quantity || 0}</TableCell>
                    <TableCell>
                      {new Date(product.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestoreProduct(product.id)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Restore
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePermanentDelete(product.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
               </TableBody>
               </Table>
             </div>
           </CardContent>
        </Card>

        <ConfirmationDialog
          open={confirmDialog.open}
          onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
          title={
            confirmDialog.type === "restore"
              ? "Restore Product"
              : "Delete Product Permanently"
          }
          description={
            confirmDialog.type === "restore"
              ? "Are you sure you want to restore this product? It will become active again."
              : "Are you sure you want to permanently delete this product? This action cannot be undone."
          }
          confirmText={confirmDialog.type === "restore" ? "Restore" : "Delete"}
          cancelText="Cancel"
          onConfirm={
            confirmDialog.type === "restore" ? confirmRestoreProduct : confirmPermanentDelete
          }
          variant={confirmDialog.type === "delete" ? "destructive" : "default"}
        />
      </div>
    </AdminLayout>
  );
};

export default Archive;