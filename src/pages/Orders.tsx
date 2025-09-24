import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Package, Eye } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  subtotal: number;
  shipping_amount: number;
  created_at: string;
  order_items: OrderItem[];
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .order('created_at', { ascending: false });

      // Only filter by user_id if not admin
      if (userRole !== 'admin') {
        query = query.eq('user_id', user?.id);
      }

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, userRole, toast]);



  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, userRole, fetchOrders]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading orders...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            {userRole === 'admin' ? 'All Orders' : 'My Orders'}
          </h1>
          <p className="text-muted-foreground">
            {userRole === 'admin' ? 'View and manage all customer orders' : 'Track and manage your order history'}
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {userRole === 'admin' ? 'No orders found' : 'No orders yet'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {userRole === 'admin'
                ? 'There are no orders in the system yet.'
                : 'Start shopping to see your orders here.'
              }
            </p>
            {userRole !== 'admin' && (
              <Button asChild>
                <a href="/products">Browse Products</a>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-6">
                  {/* Order Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div className="flex items-center space-x-4 mb-2 sm:mb-0">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          Order {order.order_number}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Placed on {format(new Date(order.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                     <div className="flex items-center space-x-4">
                       <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleOrderDetails(order.id)}
                        className="flex items-center space-x-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span>{expandedOrder === order.id ? 'Hide' : 'View'} Details</span>
                      </Button>
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Items</p>
                      <p className="font-semibold">{order.order_items?.length || 0}</p>
                    </div>
                     <div>
                       <p className="text-sm text-muted-foreground">Subtotal</p>
                       <p className="font-semibold">${order.subtotal.toFixed(2)}</p>
                     </div>
                     <div>
                       <p className="text-sm text-muted-foreground">Total</p>
                       <p className="font-semibold text-lg">${order.total_amount.toFixed(2)}</p>
                     </div>
                  </div>

                  {/* Order Details */}
                  {expandedOrder === order.id && (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <h4 className="font-semibold mb-4">Order Items</h4>
                        <div className="space-y-3">
                          {order.order_items?.map((item) => (
                            <div key={item.id} className="flex items-center space-x-4 p-3 bg-muted/30 rounded-lg">
                              <img
                                src={item.product_image || '/placeholder.svg'}
                                alt={item.product_name}
                                className="w-16 h-16 object-cover rounded-md"
                              />
                              <div className="flex-1">
                                <h5 className="font-medium text-foreground">{item.product_name}</h5>
                                <p className="text-sm text-muted-foreground">
                                  Quantity: {item.quantity} × ${item.unit_price.toFixed(2)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">${item.total_price.toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Orders;