import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, X } from "lucide-react";

// Sample cart data
const cartItems = [
  {
    id: 1,
    name: "Modern Oak Dining Table",
    price: 899,
    quantity: 1,
    image: "/src/assets/table-walnut.jpg"
  },
  {
    id: 2,
    name: "Velvet Sage Sofa",
    price: 1299,
    quantity: 1,
    image: "/src/assets/sofa-sage.jpg"
  }
];

const Cart = () => {
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = 0; // Free shipping
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + shipping + tax;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-foreground mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-md"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{item.name}</h3>
                      <p className="text-muted-foreground">${item.price}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${item.price * item.quantity}</p>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Order Summary</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                <Button className="w-full mt-6" size="lg">
                  Proceed to Checkout
                </Button>
                
                <Button variant="outline" className="w-full mt-2">
                  Continue Shopping
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Cart;