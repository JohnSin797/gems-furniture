import AdminLayout from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ProductDialog, ProductStatus } from "@/components/ProductDialog";
import { useToast } from "@/hooks/use-toast";

export interface ProductWithInventory {
  id: string;
  name: string;
  price: number;
  category: string;
  status: ProductStatus;
  type?: string;
  description?: string;
  image_url?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  inventory?: {
    id: string;
    product_id: string;
    quantity: number;
    reorder_level: number;
    reserved_quantity: number;
    updated_at: string;
  } | null;
}

interface FeaturedCollection {
  id: string;
  product_id: string;
  display_order: number;
  created_at: string;
  products: {
    id: string;
    name: string;
    image_url: string | null;
    price: number;
    category: string;
  } | null;
}

interface Product {
  id: string;
  name: string;
  category: string;
}

interface RecentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  product_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

const AdminDashboard = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [stats, setStats] = useState([
    { title: "Total Products", value: "0", icon: Package, change: "+0%" },
    { title: "Orders Today", value: "0", icon: ShoppingCart, change: "+0%" },
    { title: "Active Users", value: "0", icon: Users, change: "+0%" },
    { title: "Revenue", value: "$0", icon: TrendingUp, change: "+0%" },
  ]);
  const [loading, setLoading] = useState(true);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<ProductWithInventory | null>(null);
  const [featuredCollections, setFeaturedCollections] = useState<
    FeaturedCollection[]
  >([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  // Restrict access to admin
  useEffect(() => {
    if (userRole && userRole !== "admin") {
      toast({
        title: "Access Denied",
        description: "You need admin privileges to access this page",
        variant: "destructive",
      });
      window.location.href = "/";
    }
  }, [userRole, toast]);

  // Fetch products with inventory (1-to-1)
  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          inventory (
            id,
            product_id,
            quantity,
            reorder_level,
            reserved_quantity,
            updated_at
          )
        `
        )
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalizedData: ProductWithInventory[] = data.map((p: any) => ({
        ...p,
        inventory: Array.isArray(p.inventory)
          ? p.inventory[0] || null
          : p.inventory || null,
        status: p.status as "active" | "inactive" | "discontinued",
      }));

      setProducts(normalizedData);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const { data: productsCount } = await supabase
        .from("products")
        .select("id", { count: "exact" });
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: todaysOrders } = await supabase
        .from("orders")
        .select("id", { count: "exact" })
        .gte("created_at", today.toISOString());

      setStats((prev) =>
        prev.map((stat) => {
          if (stat.title === "Total Products")
            return {
              ...stat,
              value: productsCount?.length?.toString() || "0",
            };
          if (stat.title === "Orders Today")
            return { ...stat, value: todaysOrders?.length?.toString() || "0" };
          return stat;
        })
      );
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  // Fetch featured collections
  const fetchFeaturedCollections = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("featured_collections")
        .select(
          `
          *,
          products (
            id,
            name,
            image_url,
            price,
            category
          )
        `
        )
        .order("display_order", { ascending: true });

      if (error) throw error;
      setFeaturedCollections((data as FeaturedCollection[]) || []);
    } catch (error) {
      console.error("Error fetching featured collections:", error);
      toast({
        title: "Error",
        description: "Failed to fetch featured collections",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Fetch available products
  const fetchAvailableProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, category")
        .eq("status", "active");
      if (error) throw error;
      setAvailableProducts((data as Product[]) || []);
    } catch (error) {
      console.error("Error fetching available products:", error);
    }
  }, []);

  // Fetch recent orders
  const fetchRecentOrders = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          order_number,
          total_amount,
          status,
          created_at,
          user_id,
          order_items (
            product_name,
            quantity
          )
        `
        )
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      const userIds = Array.from(new Set(ordersData.map((o) => o.user_id)));
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", userIds);

      const recentOrders: RecentOrder[] = ordersData.map((order) => {
        const user = usersData?.find((u) => u.id === order.user_id);
        return {
          id: order.id,
          order_number: order.order_number,
          customer_name: user
            ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
            : "Unknown Customer",
          product_name: order.order_items?.[0]?.product_name ?? "Unknown Product",
          total_amount: order.total_amount,
          status: order.status,
          created_at: order.created_at,
        };
      });

      setRecentOrders(recentOrders);
    } catch (error) {
      console.error("Error fetching recent orders:", error);
      toast({
        title: "Error",
        description: "Failed to fetch recent orders",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Handle product actions
  const handleArchiveProduct = async (productId: string) => {
    if (
      !confirm(
        "Are you sure you want to archive this product? It will be moved to the archive and can be restored later."
      )
    )
      return;
    try {
      const { error } = await supabase
        .from("products")
        .update({ status: "inactive" })
        .eq("id", productId);
      if (error) throw error;
      toast({ title: "Success", description: "Product archived successfully" });
      fetchProducts();
      fetchStats();
    } catch (error) {
      console.error("Error archiving product:", error);
      toast({
        title: "Error",
        description: "Failed to archive product",
        variant: "destructive",
      });
    }
  };

  const handleEditProduct = (product: ProductWithInventory) => {
    setEditingProduct(product);
    setProductDialogOpen(true);
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setProductDialogOpen(true);
  };

  const handleProductSaved = () => {
    fetchProducts();
    fetchStats();
    setProductDialogOpen(false);
    setEditingProduct(null);
  };

  const handleAddToFeatured = async (productId: string) => {
    try {
      const maxOrder = Math.max(
        0,
        ...featuredCollections.map((fc) => fc.display_order || 0)
      );
      const { error } = await supabase.from("featured_collections").insert({
        product_id: productId,
        display_order: maxOrder + 1,
        created_by: user?.id,
      });
      if (error) throw error;
      toast({
        title: "Success",
        description: "Product added to featured collections",
      });
      fetchFeaturedCollections();
    } catch (error) {
      console.error("Error adding to featured collections:", error);
      toast({
        title: "Error",
        description: "Failed to add product to featured collections",
        variant: "destructive",
      });
    }
  };

  const handleRemoveFromFeatured = async (featuredId: string) => {
    try {
      const { error } = await supabase
        .from("featured_collections")
        .delete()
        .eq("id", featuredId);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Product removed from featured collections",
      });
      fetchFeaturedCollections();
    } catch (error) {
      console.error("Error removing from featured collections:", error);
      toast({
        title: "Error",
        description: "Failed to remove product from featured collections",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "received":
        return "bg-green-100 text-green-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  useEffect(() => {
    if (userRole === "admin") {
      fetchProducts();
      fetchStats();
      fetchFeaturedCollections();
      fetchAvailableProducts();
      fetchRecentOrders();
    }
  }, [
    userRole,
    fetchProducts,
    fetchStats,
    fetchFeaturedCollections,
    fetchAvailableProducts,
    fetchRecentOrders,
  ]);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="mb-6 md:mb-8 text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-charcoal mb-1">
            Admin Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your furniture store
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8">
          {stats.map((stat, idx) => {
            const bgColors = [
              "bg-sage/10",
              "bg-terracotta/10",
              "bg-blue-50",
              "bg-green-50",
            ];
            return (
              <Card key={idx} className={bgColors[idx]}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-sage shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-charcoal">
                    {stat.value}
                  </div>
                  <p className="text-xs text-sage font-medium">
                    {stat.change} from last month
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Orders + Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
          {/* Recent Orders */}
          <Card className="min-h-[400px]">
            <CardHeader>
              <CardTitle className="text-charcoal text-lg sm:text-xl">
                Recent Orders
              </CardTitle>
              <CardDescription>Latest customer orders</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[250px] sm:h-[300px]">
                <div className="overflow-x-auto">
                  <Table className="min-w-full text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">
                            No recent orders
                          </TableCell>
                        </TableRow>
                      ) : (
                        recentOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">
                              {order.order_number}
                            </TableCell>
                            <TableCell>{order.customer_name}</TableCell>
                            <TableCell>${order.total_amount}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(order.status)}>
                                {order.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Products */}
          <Card className="min-h-[400px]">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-charcoal text-lg sm:text-xl">
                  Products
                </CardTitle>
                <CardDescription>Manage your inventory</CardDescription>
              </div>
              <Button
                className="w-full sm:w-auto bg-sage hover:bg-sage/90"
                onClick={handleAddProduct}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Product
              </Button>
            </CardHeader>

            <CardContent>
              <ScrollArea className="h-[250px] sm:h-[300px]">
                <Table className="w-full table-fixed text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Product</TableHead>
                      <TableHead className="w-[20%]">Price</TableHead>
                      <TableHead className="w-[20%]">Stock</TableHead>
                      <TableHead className="w-[20%]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          Loading products...
                        </TableCell>
                      </TableRow>
                    ) : products.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          No products found
                        </TableCell>
                      </TableRow>
                    ) : (
                      products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="truncate">
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-xs sm:text-sm text-muted-foreground truncate">
                                {product.category}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>${product.price}</TableCell>
                          <TableCell>
                            {product.inventory?.quantity ?? 0}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2 justify-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditProduct(product)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleArchiveProduct(product.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Featured Collections */}
        <Card className="mt-6 lg:mt-8">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-charcoal text-lg sm:text-xl">
                Featured Collections
              </CardTitle>
              <CardDescription>
                Manage products displayed on the homepage
              </CardDescription>
            </div>
            <Select onValueChange={handleAddToFeatured}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Add product..." />
              </SelectTrigger>
              <SelectContent>
                {availableProducts
                  .filter(
                    (product) =>
                      !featuredCollections.some(
                        (fc) => fc.product_id === product.id
                      )
                  )
                  .map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-full text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px] sm:min-w-[200px]">
                      Product
                    </TableHead>
                    <TableHead className="min-w-[100px] sm:min-w-[120px]">
                      Category
                    </TableHead>
                    <TableHead className="min-w-[80px] sm:min-w-[100px]">
                      Price
                    </TableHead>
                    <TableHead className="min-w-[80px] sm:min-w-[100px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featuredCollections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        No featured products
                      </TableCell>
                    </TableRow>
                  ) : (
                    featuredCollections.map((fc) => (
                      <TableRow key={fc.id}>
                        <TableCell>
                          {fc.products?.name ?? "Unknown Product"}
                        </TableCell>
                        <TableCell>
                          {fc.products?.category ?? "Unknown"}
                        </TableCell>
                        <TableCell>
                          ${fc.products?.price ?? "N/A"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveFromFeatured(fc.id)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <ProductDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        onSave={handleProductSaved}
        product={editingProduct}
      />
    </AdminLayout>
  );
};

export default AdminDashboard;
