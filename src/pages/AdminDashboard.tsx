import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, ShoppingCart, Users, TrendingUp, Plus, Edit, Trash2 } from "lucide-react";
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
  inventory?: { quantity: number }[];
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

type SupabaseOrderWithRelations = {
  id: string;
  order_number: string;
  total_amount: number;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  created_at: string;
  user_id: string;
  order_items: Array<{ product_name: string; quantity: number }>;
  profiles: { first_name: string | null; last_name: string | null } | null;
};

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
  const [editingProduct, setEditingProduct] = useState<ProductWithInventory | null>(null);
  const [featuredCollections, setFeaturedCollections] = useState<FeaturedCollection[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  // Restrict access to admin
  useEffect(() => {
    if (userRole && userRole !== "admin") {
      toast({ title: "Access Denied", description: "You need admin privileges to access this page", variant: "destructive" });
      window.location.href = "/";
    }
  }, [userRole, toast]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      const normalizedData: ProductWithInventory[] = (data as any[]).map(p => ({
        ...p,
        inventory: Array.isArray(p.inventory)
          ? p.inventory.map(inv => ({ quantity: inv.quantity })) // keep only quantity if needed
          : [], // if inventory is null or not an array, default to empty array
        status: p.status as "active" | "inactive" | "discontinued", // cast for TS
      }));

      setProducts(normalizedData);
    } catch (error) {
      console.error('Error fetching products:', error);
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
      const { data: productsCount } = await supabase.from("products").select("id", { count: "exact" });
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: todaysOrders } = await supabase.from("orders").select("id", { count: "exact" }).gte("created_at", today.toISOString());

      setStats(prev => prev.map(stat => {
        if (stat.title === "Total Products") return { ...stat, value: productsCount?.length?.toString() || "0" };
        if (stat.title === "Orders Today") return { ...stat, value: todaysOrders?.length?.toString() || "0" };
        return stat;
      }));
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  // Fetch featured collections
  const fetchFeaturedCollections = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("featured_collections")
        .select(`
          *,
          products (
            id,
            name,
            image_url,
            price,
            category
          )
        `)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setFeaturedCollections((data as FeaturedCollection[]) || []);
    } catch (error) {
      console.error("Error fetching featured collections:", error);
      toast({ title: "Error", description: "Failed to fetch featured collections", variant: "destructive" });
    }
  }, [toast]);

  // Fetch available products
  const fetchAvailableProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("products").select("id, name, category").eq("status", "active");
      if (error) throw error;
      setAvailableProducts((data as Product[]) || []);
    } catch (error) {
      console.error("Error fetching available products:", error);
    }
  }, []);

  // Fetch recent orders
  const fetchRecentOrders = useCallback(async () => {
    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
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
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Fetch users separately
      const userIds = Array.from(new Set(ordersData.map(o => o.user_id)));
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      const recentOrders: RecentOrder[] = ordersData.map(order => {
        const user = usersData?.find(u => u.id === order.user_id);
        return {
          id: order.id,
          order_number: order.order_number,
          customer_name: user ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() : 'Unknown Customer',
          product_name: order.order_items?.[0]?.product_name ?? 'Unknown Product',
          total_amount: order.total_amount,
          status: order.status,
          created_at: order.created_at
        };
      });

      setRecentOrders(recentOrders);

    } catch (error) {
      console.error('Error fetching recent orders:', error);
      // Only show toast if it's a real error, not just empty results
      if ((error as any)?.code !== 'PGRST200') {
        toast({
          title: "Error",
          description: "Failed to fetch recent orders",
          variant: "destructive",
        });
      } else {
        setRecentOrders([]);
      }
    }
  }, [toast]);

  // Handle product actions
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) throw error;
      toast({ title: "Success", description: "Product deleted successfully" });
      fetchProducts();
      fetchStats();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" });
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
      const maxOrder = Math.max(0, ...featuredCollections.map(fc => fc.display_order || 0));
      const { error } = await supabase.from("featured_collections").insert({
        product_id: productId,
        display_order: maxOrder + 1,
        created_by: user?.id
      });
      if (error) throw error;
      toast({ title: "Success", description: "Product added to featured collections" });
      fetchFeaturedCollections();
    } catch (error) {
      console.error("Error adding to featured collections:", error);
      toast({ title: "Error", description: "Failed to add product to featured collections", variant: "destructive" });
    }
  };

  const handleRemoveFromFeatured = async (featuredId: string) => {
    try {
      const { error } = await supabase.from("featured_collections").delete().eq("id", featuredId);
      if (error) throw error;
      toast({ title: "Success", description: "Product removed from featured collections" });
      fetchFeaturedCollections();
    } catch (error) {
      console.error("Error removing from featured collections:", error);
      toast({ title: "Error", description: "Failed to remove product from featured collections", variant: "destructive" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "bg-green-100 text-green-800";
      case "shipped": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
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
  }, [userRole, fetchProducts, fetchStats, fetchFeaturedCollections, fetchAvailableProducts, fetchRecentOrders]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-charcoal mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your furniture store</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, idx) => {
            const bgColors = [
              "bg-sage/10",
              "bg-terracotta/10",
              "bg-blue-50",
              "bg-green-50"
            ];
            return (
              <Card key={idx} className={bgColors[idx]}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-sage" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-charcoal">{stat.value}</div>
                  <p className="text-xs text-sage font-medium">{stat.change} from last month</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Orders & Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="text-charcoal">Recent Orders</CardTitle>
              <CardDescription>Latest customer orders</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
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
                      <TableCell colSpan={4} className="text-center">No recent orders</TableCell>
                    </TableRow>
                  ) : recentOrders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell>${order.total_amount}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Product Management */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-charcoal">Products</CardTitle>
                <CardDescription>Manage your inventory</CardDescription>
              </div>
              <Button className="bg-sage hover:bg-sage/90" onClick={handleAddProduct}>
                <Plus className="h-4 w-4 mr-2" /> Add Product
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">Loading products...</TableCell>
                    </TableRow>
                  ) : products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">No products found</TableCell>
                    </TableRow>
                  ) : products.map(product => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">{product.category}</div>
                        </div>
                      </TableCell>
                      <TableCell>${product.price}</TableCell>
                      <TableCell>{product.inventory?.[0]?.quantity || 0}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditProduct(product)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteProduct(product.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Featured Collections */}
        <Card className="mt-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-charcoal">Featured Collections</CardTitle>
              <CardDescription>Manage products displayed on the homepage</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select onValueChange={handleAddToFeatured}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Add product..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts
                    .filter(product => !featuredCollections.some(fc => fc.product_id === product.id))
                    .map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.category})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Display Order</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {featuredCollections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">No featured products</TableCell>
                  </TableRow>
                ) : featuredCollections.map(featured => (
                  <TableRow key={featured.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={featured.products?.image_url || "/placeholder.svg"}
                          alt={featured.products?.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                        <span className="font-medium">{featured.products?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{featured.products?.category}</TableCell>
                    <TableCell>${featured.products?.price}</TableCell>
                    <TableCell>{featured.display_order}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleRemoveFromFeatured(featured.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Product Dialog */}
        <ProductDialog
          open={productDialogOpen}
          onOpenChange={setProductDialogOpen}
          product={editingProduct || undefined}
          onSave={handleProductSaved}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
