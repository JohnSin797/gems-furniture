import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Package, Eye } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface Order {
   id: string;
   order_number: string;
   status: OrderStatus;
   total_amount: number;
   subtotal: number;
   shipping_amount: number;
   created_at: string;
   user_id: string;
   order_items: OrderItem[];
 }

const Orders = () => {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("active");
  const { user, userRole } = useAuth();
  const { createNotification } = useNotifications();
  const { toast } = useToast();

  const fetchActiveOrders = useCallback(async () => {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .in('status', ['pending', 'confirmed'])
        .order('created_at', { ascending: false });

      // Only filter by user_id if not admin
      if (userRole !== 'admin') {
        query = query.eq('user_id', user?.id);
      }

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) throw ordersError;
      setActiveOrders(ordersData || []);
    } catch (error) {
      console.error('Error fetching active orders:', error);
      toast({
        title: "Error",
        description: "Failed to load active orders. Please try again.",
        variant: "destructive",
      });
    }
  }, [user, userRole, toast]);

  const fetchOrderHistory = useCallback(async () => {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .in('status', ['received', 'cancelled'])
        .order('created_at', { ascending: false });

      // Only filter by user_id if not admin
      if (userRole !== 'admin') {
        query = query.eq('user_id', user?.id);
      }

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) {
        // only show toast if actual error
        throw ordersError;
      }

      // if no data, just set empty array (no toast)
      setOrderHistory(ordersData ?? []);
    } catch (error) {
      console.error('Error fetching order history:', error);

      // show toast only if it's not the "no rows" case
      if ((error as any).code !== 'PGRST116') {
        toast({
          title: "Error",
          description: "Failed to load order history. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [user, userRole, toast]);

  const fetchAllOrders = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchActiveOrders(), fetchOrderHistory()]);
    setLoading(false);
  }, [fetchActiveOrders, fetchOrderHistory]);

  const updateOrderStatus = useCallback(async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state - remove from active orders if status changes to received/cancelled
      if (newStatus === 'received' || newStatus === 'cancelled') {
        setActiveOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
        // Add to order history
        const order = activeOrders.find(o => o.id === orderId);
        if (order) {
          setOrderHistory(prevHistory => [{ ...order, status: newStatus }, ...prevHistory]);
        }
      } else {
        // Update in active orders
        setActiveOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === orderId ? { ...order, status: newStatus } : order
          )
        );
      }

      // Create notification for the user based on status change
      if (newStatus === 'confirmed') {
        const order = activeOrders.find(o => o.id === orderId);
        if (order) {
          await createNotification(
            order.user_id,
            "Order Confirmed",
            `Your order ${order.order_number} has been confirmed.`,
            "success"
          );
        }
      } else if (newStatus === 'received') {
        const order = activeOrders.find(o => o.id === orderId);
        if (order) {
          await createNotification(
            order.user_id,
            "Order Received",
            `Your order ${order.order_number} has been received.`,
            "success"
          );
        }
      } else if (newStatus === 'cancelled') {
        const order = activeOrders.find(o => o.id === orderId);
        if (order) {
          await createNotification(
            order.user_id,
            "Order Cancelled",
            `Your order ${order.order_number} has been cancelled.`,
            "error"
          );
        }
      }

      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast, activeOrders, createNotification]);

  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  useEffect(() => {
    if (user) {
      fetchAllOrders();
    }
  }, [user, userRole, fetchAllOrders]);

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
            {userRole === 'admin' ? 'Orders' : 'My Orders'}
          </h1>
          <p className="text-muted-foreground">
            {userRole === 'admin' ? 'View and manage all orders' : 'Track and manage your orders'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">Active Orders</TabsTrigger>
            <TabsTrigger value="history">Order History</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {activeOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {userRole === 'admin' ? 'No active orders' : 'No active orders yet'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {userRole === 'admin'
                    ? 'There are no pending or confirmed orders at the moment.'
                    : 'Your active orders will appear here.'
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
                {activeOrders.map((order) => (
               <Card key={order.id} className="overflow-hidden">
                  <CardContent className="p-4">
                   {/* Order Header */}
                   <div className="flex flex-col sm:flex-row mb-4">
                      <div className="flex items-center space-x-4 mr-10 mb-2 sm:mb-0">
                        <div>
                          <h3 className="font-semibold text-foreground">
                            Order {order.order_number}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Placed on {format(new Date(order.created_at), 'MMM dd, yyyy')}
                          </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-sm text-muted-foreground">Status:</span>
                               <Badge className={
                                 order.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                 order.status === 'confirmed' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                 order.status === 'cancelled' ? 'bg-red-100 text-red-800 border-red-200' :
                                 order.status === 'received' ? 'bg-green-100 text-green-800 border-green-200' :
                                 'bg-gray-100 text-gray-800 border-gray-200'
                               }>
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </Badge>
                              {userRole === 'admin' && (
                                <Button
                                  size="sm"
                                  onClick={() => updateOrderStatus(order.id, "confirmed")}
                                  disabled={order.status === 'confirmed'}
                                >
                                  Confirm
                                </Button>
                              )}
                              {userRole !== 'admin' && order.status === 'confirmed' && (
                                <Button
                                  size="sm"
                                  onClick={() => updateOrderStatus(order.id, "received")}
                                >
                                  Receive
                                </Button>
                              )}
                           </div>
                        </div>
                      </div>
                     <div className="flex-1 flex justify-center mb-2 sm:mb-0 md:px-8 sm:px-4">
                       <div className="grid grid-cols-3 w-full md:px-4 gap-4">
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
                            <p className="font-semibold">${order.total_amount.toFixed(2)}</p>
                          </div>
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
          </TabsContent>

           <TabsContent value="history" className="mt-6">
             {orderHistory.length === 0 ? (
               <div className="text-center py-12">
                 <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                 <h3 className="text-xl font-semibold text-foreground mb-2">
                   {userRole === 'admin' ? 'No order history' : 'No order history yet'}
                 </h3>
                 <p className="text-muted-foreground mb-6">
                   {userRole === 'admin'
                     ? 'Completed and cancelled orders will appear here.'
                     : 'Your completed and cancelled orders will appear here.'
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
                 {orderHistory.map((order) => (
                   <Card key={order.id} className="overflow-hidden">
                     <CardContent className="p-4">
                       {/* Order Header */}
                       <div className="flex flex-col sm:flex-row mb-4">
                         <div className="flex items-center space-x-4 mr-10 mb-2 sm:mb-0">
                           <div>
                             <h3 className="font-semibold text-foreground">
                               Order {order.order_number}
                             </h3>
                             <p className="text-sm text-muted-foreground">
                               Placed on {format(new Date(order.created_at), 'MMM dd, yyyy')}
                             </p>
                             <div className="flex items-center space-x-2 mt-1">
                               <span className="text-sm text-muted-foreground">Status:</span>
                               <Badge className={
                                 order.status === 'cancelled' ? 'bg-red-100 text-red-800 border-red-200' :
                                 order.status === 'received' ? 'bg-green-100 text-green-800 border-green-200' :
                                 'bg-gray-100 text-gray-800 border-gray-200'
                               }>
                                 {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                               </Badge>
                             </div>
                           </div>
                         </div>
                         <div className="flex-1 flex justify-center mb-2 sm:mb-0 md:px-8 sm:px-4">
                           <div className="grid grid-cols-3 w-full md:px-4 gap-4">
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
                               <p className="font-semibold">${order.total_amount.toFixed(2)}</p>
                             </div>
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
           </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Orders;