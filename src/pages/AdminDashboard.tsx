import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart, Users, TrendingUp, Plus, Edit, Trash2 } from "lucide-react";

const AdminDashboard = () => {
  const stats = [
    { title: "Total Products", value: "124", icon: Package, change: "+12%" },
    { title: "Orders Today", value: "23", icon: ShoppingCart, change: "+8%" },
    { title: "Active Users", value: "1,832", icon: Users, change: "+15%" },
    { title: "Revenue", value: "$12,450", icon: TrendingUp, change: "+23%" },
  ];

  const recentOrders = [
    { id: "#1234", customer: "John Doe", product: "Oak Dining Table", amount: "$899", status: "pending" },
    { id: "#1235", customer: "Jane Smith", product: "Sage Green Sofa", amount: "$1,299", status: "shipped" },
    { id: "#1236", customer: "Mike Johnson", product: "Cream Armchair", amount: "$649", status: "delivered" },
    { id: "#1237", customer: "Sarah Wilson", product: "Walnut Nightstand", amount: "$329", status: "pending" },
  ];

  const products = [
    { id: 1, name: "Oak Dining Table", category: "Dining", price: "$899", stock: 12 },
    { id: 2, name: "Sage Green Sofa", category: "Living Room", price: "$1,299", stock: 8 },
    { id: 3, name: "Cream Armchair", category: "Living Room", price: "$649", stock: 15 },
    { id: 4, name: "Walnut Nightstand", category: "Bedroom", price: "$329", stock: 23 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "bg-green-100 text-green-800";
      case "shipped": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-charcoal mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your furniture store</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-sage" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-charcoal">{stat.value}</div>
                <p className="text-xs text-sage font-medium">{stat.change} from last month</p>
              </CardContent>
            </Card>
          ))}
        </div>

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
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{order.customer}</TableCell>
                      <TableCell>{order.amount}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
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
              <Button className="bg-sage hover:bg-sage/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
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
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">{product.category}</div>
                        </div>
                      </TableCell>
                      <TableCell>{product.price}</TableCell>
                      <TableCell>{product.stock}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm">
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
      </div>
    </div>
  );
};

export default AdminDashboard;