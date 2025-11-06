import Navigation from "@/components/Navigation";
import AdminLayout from "@/components/AdminLayout";
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
import { format, subDays } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import type { NotificationType } from "@/hooks/useNotifications";
import type { Json } from "@/integrations/supabase/types";

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
     shipping_address: Json | null;
     order_items: OrderItem[];
      profiles?: {
        first_name: string | null;
        last_name: string | null;
        phone_number: string | null;
        street_address: string | null;
        barangay: string | null;
        city: string | null;
        province: string | null;
        zip_code: string | null;
      } | null;
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
      const activeStatuses = userRole === 'admin' ? ['pending', 'confirmed', 'to_deliver'] as const : ['pending', 'confirmed', 'to_deliver'] as const;
      let query = supabase
        .from('orders')
        .select(`
          *,
          shipping_address,
          order_items (*)
        `)
        .in('status', activeStatuses)
        .order('created_at', { ascending: false });

      // Only filter by user_id if not admin
      if (userRole !== 'admin') {
        query = query.eq('user_id', user?.id);
      }

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) throw ordersError;

      // Fetch profiles for the orders
      const userIds = ordersData?.map(order => order.user_id) || [];
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, phone_number, street_address, barangay, city, province, zip_code')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        // Merge profiles with orders
        const ordersWithProfiles = ordersData?.map(order => ({
          ...order,
          profiles: profilesData?.find(profile => profile.user_id === order.user_id) || null
        })) || [];
        setActiveOrders(ordersWithProfiles);
      } else {
        setActiveOrders(ordersData || []);
      }
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
      const thirtyDaysAgo = subDays(new Date(), 30);
      const historyStatuses = ['delivered', 'received', 'cancelled'] as const;
      let query = supabase
        .from('orders')
        .select(`
          *,
          shipping_address,
          order_items (*)
        `)
        .in('status', historyStatuses)
        .gte('created_at', thirtyDaysAgo.toISOString())
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

      // Fetch profiles for the orders
      const userIds = ordersData?.map(order => order.user_id) || [];
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, phone_number, street_address, barangay, city, province, zip_code')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        // Merge profiles with orders
        const ordersWithProfiles = ordersData?.map(order => ({
          ...order,
          profiles: profilesData?.find(profile => profile.user_id === order.user_id) || null
        })) || [];
        setOrderHistory(ordersWithProfiles);
      } else {
        // if no data, just set empty array (no toast)
        setOrderHistory(ordersData ?? []);
      }
    } catch (error) {
      console.error('Error fetching order history:', error);

      // show toast only if it's not the "no rows" case
      if ((error as { code?: string }).code !== 'PGRST116') {
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
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Update inventory when order is confirmed
      if (newStatus === 'confirmed') {
        // Fetch order items to get product quantities
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', orderId);

        if (itemsError) {
          console.error('Error fetching order items for inventory update:', itemsError);
          // Continue with the rest of the function even if inventory update fails
        } else if (orderItems) {
          // Update inventory for each product
          for (const item of orderItems) {
            // First fetch current inventory
            const { data: currentInventory, error: fetchError } = await supabase
              .from('inventory')
              .select('quantity')
              .eq('product_id', item.product_id)
              .single();

            if (fetchError) {
              console.error(`Error fetching inventory for product ${item.product_id}:`, fetchError);
              continue;
            }

            if (currentInventory && currentInventory.quantity >= item.quantity) {
              const newQuantity = currentInventory.quantity - item.quantity;
              const { error: inventoryError } = await supabase
                .from('inventory')
                .update({
                  quantity: newQuantity,
                  updated_at: new Date().toISOString()
                })
                .eq('product_id', item.product_id);

              if (inventoryError) {
                console.error(`Error updating inventory for product ${item.product_id}:`, inventoryError);
                // Continue with other items even if one fails
              }
            } else {
              console.warn(`Insufficient inventory for product ${item.product_id}. Current: ${currentInventory?.quantity}, Required: ${item.quantity}`);
              // Still continue with other items
            }
          }
        }
      }

      // Find the affected order
      const order = activeOrders.find(o => o.id === orderId);
      if (!order) return;

      // Update local state reactively
      if (['delivered', 'received', 'cancelled'].includes(newStatus) || (userRole === 'admin' && newStatus === 'to_deliver')) {
        setActiveOrders(prev => prev.filter(o => o.id !== orderId));
        setOrderHistory(prev => [{ ...order, status: newStatus }, ...prev]);
      } else {
        setActiveOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o)));
      }

       // Determine notification message for user
       const userNotificationsByStatus: Record<OrderStatus, { title: string; message: string; type: NotificationType }> = {
         pending: { title: "Order Pending", message: `Your order ${order.order_number} is pending.`, type: "info" },
         confirmed: { title: "Order Confirmed", message: `Your order ${order.order_number} has been confirmed.`, type: "success" },
         to_deliver: { title: "Order Ready for Delivery", message: `Your order ${order.order_number} is ready for delivery.`, type: "info" },
         delivered: { title: "Order Delivered", message: `Your order ${order.order_number} has been delivered.`, type: "success" },
         received: { title: "Order Received", message: `Your order ${order.order_number} has been received.`, type: "success" },
         cancelled: { title: "Order Cancelled", message: `Your order ${order.order_number} has been cancelled.`, type: "error" },
       };

       // Determine notification message for admin
       const adminNotificationsByStatus: Record<OrderStatus, { title: string; message: string; type: NotificationType }> = {
         pending: { title: "Order Pending", message: `Order ${order.order_number} is pending (Customer ID: ${order.user_id}).`, type: "info" },
         confirmed: { title: "Order Confirmed", message: `Order ${order.order_number} has been confirmed (Customer ID: ${order.user_id}).`, type: "success" },
         to_deliver: { title: "Order Ready for Delivery", message: `Order ${order.order_number} is ready for delivery (Customer ID: ${order.user_id}).`, type: "info" },
         delivered: { title: "Order Delivered", message: `Order ${order.order_number} has been delivered (Customer ID: ${order.user_id}).`, type: "success" },
         received: { title: "Order Received", message: `Order ${order.order_number} has been received (Customer ID: ${order.user_id}).`, type: "success" },
         cancelled: { title: "Order Cancelled", message: `Order ${order.order_number} has been cancelled (Customer ID: ${order.user_id}).`, type: "error" },
       };

       const userNotif = userNotificationsByStatus[newStatus];
       const adminNotif = adminNotificationsByStatus[newStatus];
       if (!userNotif || !adminNotif) return;

       // Send notification to the user
       await createNotification(order.user_id, userNotif.title, userNotif.message, userNotif.type);

       // Fetch all admin users (to include current admin too)
       const { data: adminRoles, error: adminError } = await supabase
         .from('user_roles')
         .select('user_id')
         .eq('role', 'admin');

       if (adminError) console.warn('Admin fetch error:', adminError);

       const admins = adminRoles?.map(r => r.user_id) ?? [];

       // Admin gets properly addressed notification
       const adminNotifications = admins.map(adminId => ({
         user_id: adminId,
         title: adminNotif.title,
         message: adminNotif.message,
         type: adminNotif.type,
       }));

       await supabase.from('notifications').insert(adminNotifications);

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
  }, [toast, activeOrders, createNotification, userRole]);

  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const formatShippingAddress = (shippingAddress: Json | null, profiles: Order['profiles']) => {
    let addr: { street?: string; barangay?: string; city?: string; province?: string; zip_code?: string };

    if (shippingAddress) {
      addr = shippingAddress as { street?: string; barangay?: string; city?: string; province?: string; zip_code?: string };
    } else if (profiles) {
      // Use personal address as fallback
      addr = {
        street: profiles.street_address || undefined,
        barangay: profiles.barangay || undefined,
        city: profiles.city || undefined,
        province: profiles.province || undefined,
        zip_code: profiles.zip_code || undefined,
      };
    } else {
      return "No shipping address provided";
    }

    const parts = [
      addr.street,
      addr.barangay,
      addr.city,
      addr.province,
      addr.zip_code
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : "No shipping address provided";
  };

  useEffect(() => {
    if (user) {
      fetchAllOrders();
    }
  }, [user, userRole, fetchAllOrders]);

  if (loading) {
    return userRole === 'admin' ? (
      <AdminLayout>
        <div className="text-center">Loading orders...</div>
      </AdminLayout>
    ) : (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading orders...</div>
        </main>
      </div>
    );
  }

  const content = (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            {userRole === 'admin' ? 'Orders' : 'My Orders'}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
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
                    <div className="flex flex-col lg:flex-row mb-4">
                       <div className="flex-1 mb-4 lg:mb-0 lg:mr-4">
                         <div>
                           <h3 className="font-semibold text-foreground text-lg">
                             Order {order.order_number}
                           </h3>
                           <p className="text-sm text-muted-foreground">
                             Placed on {format(new Date(order.created_at), 'MMM dd, yyyy')}
                           </p>
                             <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                               <div className="flex items-center space-x-2">
                                 <span className="text-sm text-muted-foreground">Status:</span>
                                    <Badge className={
                                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                      order.status === 'confirmed' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                      order.status === 'to_deliver' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                      order.status === 'delivered' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                      order.status === 'cancelled' ? 'bg-red-100 text-red-800 border-red-200' :
                                      order.status === 'received' ? 'bg-green-100 text-green-800 border-green-200' :
                                      'bg-gray-100 text-gray-800 border-gray-200'
                                    }>
                                   {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                 </Badge>
                               </div>
                               <div className="flex flex-wrap gap-2">
                                 {userRole === 'admin' && order.status === 'pending' && (
                                   <Button
                                     size="sm"
                                     onClick={() => updateOrderStatus(order.id, "confirmed")}
                                   >
                                     Confirm
                                   </Button>
                                 )}
                                  {userRole === 'admin' && order.status === 'confirmed' && (
                                    <Button
                                      size="sm"
                                      onClick={() => updateOrderStatus(order.id, "to_deliver")}
                                    >
                                      To Deliver
                                    </Button>
                                  )}
                                  {userRole === 'admin' && order.status === 'to_deliver' && (
                                    <Button
                                      size="sm"
                                      onClick={() => updateOrderStatus(order.id, "delivered")}
                                    >
                                      Mark Delivered
                                    </Button>
                                  )}
                                  {userRole !== 'admin' && order.status === 'to_deliver' && (
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
                       </div>
                       <div className="flex flex-col sm:flex-row gap-4 mb-4 lg:mb-0">
                         <div className="grid grid-cols-3 gap-4 flex-1">
                          <div className="text-center">
                            <p className="text-xs sm:text-sm text-muted-foreground">Items</p>
                            <p className="font-semibold text-sm sm:text-base">{order.order_items?.length || 0}</p>
                          </div>
                           <div className="text-center">
                             <p className="text-xs sm:text-sm text-muted-foreground">Subtotal</p>
                             <p className="font-semibold text-sm sm:text-base">₱{order.subtotal.toFixed(2)}</p>
                           </div>
                           <div className="text-center">
                             <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
                             <p className="font-semibold text-sm sm:text-base">₱{order.total_amount.toFixed(2)}</p>
                           </div>
                        </div>
                        <div className="flex justify-center lg:justify-end">
                          <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => toggleOrderDetails(order.id)}
                           className="flex items-center space-x-1"
                          >
                           <Eye className="h-4 w-4" />
                           <span className="text-sm">{expandedOrder === order.id ? 'Hide' : 'View'}</span>
                         </Button>
                       </div>
                      </div>
                    </div>

                   {/* Order Details */}
                   {expandedOrder === order.id && (
                     <>
                       <Separator className="my-4" />
                       {userRole === 'admin' && order.profiles && (
                         <div className="mb-6">
                           <h4 className="font-semibold mb-4">Customer Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                              <div>
                                <p className="text-sm text-muted-foreground">Name</p>
                                <p className="font-medium">
                                  {order.profiles.first_name && order.profiles.last_name
                                    ? `${order.profiles.first_name} ${order.profiles.last_name}`
                                    : order.profiles.first_name || order.profiles.last_name || 'Not provided'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Phone Number</p>
                                <p className="font-medium">{order.profiles.phone_number || 'Not provided'}</p>
                              </div>
                                 <div>
                                   <p className="text-sm text-muted-foreground">Shipping Address</p>
                                   <div className="font-medium">
                                     <p>{formatShippingAddress(order.shipping_address, order.profiles)}</p>
                                   </div>
                                 </div>
                           </div>
                         </div>
                       )}
                       <div>
                         <h4 className="font-semibold mb-4">Order Items</h4>
                         <div className="space-y-3">
                           {order.order_items?.map((item) => (
                             <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-muted/30 rounded-lg">
                               <div className="flex items-center gap-3 flex-1">
                                 <img
                                   src={item.product_image || '/placeholder.svg'}
                                   alt={item.product_name}
                                   className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md flex-shrink-0"
                                 />
                                 <div className="flex-1 min-w-0">
                                   <h5 className="font-medium text-foreground text-sm sm:text-base truncate">{item.product_name}</h5>
                                   <p className="text-xs sm:text-sm text-muted-foreground">
                                     Quantity: {item.quantity} × ₱{item.unit_price.toFixed(2)}
                                   </p>
                                 </div>
                               </div>
                               <div className="text-left sm:text-right">
                                 <p className="font-semibold text-sm sm:text-base">₱{item.total_price.toFixed(2)}</p>
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
                        ? 'Delivered, received, and cancelled orders will appear here.'
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
                        <div className="flex flex-col lg:flex-row mb-4">
                          <div className="flex-1 mb-4 lg:mb-0 lg:mr-4">
                            <div>
                              <h3 className="font-semibold text-foreground text-lg">
                                Order {order.order_number}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Placed on {format(new Date(order.created_at), 'MMM dd, yyyy')}
                              </p>
                              <div className="flex items-center space-x-2 mt-2">
                                <span className="text-sm text-muted-foreground">Status:</span>
                                  <Badge className={
                                    order.status === 'cancelled' ? 'bg-red-100 text-red-800 border-red-200' :
                                    order.status === 'received' ? 'bg-green-100 text-green-800 border-green-200' :
                                    order.status === 'delivered' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                    order.status === 'to_deliver' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                    'bg-gray-100 text-gray-800 border-gray-200'
                                  }>
                                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-4 mb-4 lg:mb-0">
                            <div className="grid grid-cols-3 gap-4 flex-1">
                              <div className="text-center">
                                <p className="text-xs sm:text-sm text-muted-foreground">Items</p>
                                <p className="font-semibold text-sm sm:text-base">{order.order_items?.length || 0}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs sm:text-sm text-muted-foreground">Subtotal</p>
                                <p className="font-semibold text-sm sm:text-base">₱{order.subtotal.toFixed(2)}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
                                <p className="font-semibold text-sm sm:text-base">₱{order.total_amount.toFixed(2)}</p>
                              </div>
                            </div>
                            <div className="flex justify-center lg:justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleOrderDetails(order.id)}
                                className="flex items-center space-x-1"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="text-sm">{expandedOrder === order.id ? 'Hide' : 'View'}</span>
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Order Details */}
                        {expandedOrder === order.id && (
                          <>
                            <Separator className="my-4" />
                            {userRole === 'admin' && order.profiles && (
                              <div className="mb-6">
                                <h4 className="font-semibold mb-4">Customer Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Name</p>
                                    <p className="font-medium">
                                      {order.profiles.first_name && order.profiles.last_name
                                        ? `${order.profiles.first_name} ${order.profiles.last_name}`
                                        : order.profiles.first_name || order.profiles.last_name || 'Not provided'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Phone Number</p>
                                    <p className="font-medium">{order.profiles.phone_number || 'Not provided'}</p>
                                  </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Shipping Address</p>
                                      <div className="font-medium">
                                        <p>{formatShippingAddress(order.shipping_address, order.profiles)}</p>
                                      </div>
                                    </div>
                                </div>
                              </div>
                            )}
                            <div>
                              <h4 className="font-semibold mb-4">Order Items</h4>
                              <div className="space-y-3">
                                {order.order_items?.map((item) => (
                                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-muted/30 rounded-lg">
                                    <div className="flex items-center gap-3 flex-1">
                                      <img
                                        src={item.product_image || '/placeholder.svg'}
                                        alt={item.product_name}
                                        className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md flex-shrink-0"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <h5 className="font-medium text-foreground text-sm sm:text-base truncate">{item.product_name}</h5>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                          Quantity: {item.quantity} × ₱{item.unit_price.toFixed(2)}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-left sm:text-right">
                                      <p className="font-semibold text-sm sm:text-base">₱{item.total_price.toFixed(2)}</p>
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
  );

  return userRole === 'admin' ? <AdminLayout>{content}</AdminLayout> : (
    <div className="min-h-screen bg-background">
      <Navigation />
      {content}
    </div>
  );
};

export default Orders;