import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
}

const ProductCard = ({ id, name, price, originalPrice, image, category }: ProductCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [buying, setBuying] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleBuyNow = async () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to make a purchase.",
        variant: "destructive"
      });
      return;
    }

    setBuying(true);
    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          status: 'pending',
          subtotal: price,
          tax_amount: price * 0.1, // 10% tax
          shipping_amount: 10, // $10 shipping
          total_amount: price + (price * 0.1) + 10,
          order_number: `ORD-${Date.now()}`
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order item
      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: id,
          product_name: name,
          product_image: image,
          quantity: 1,
          unit_price: price,
          total_price: price
        });

      if (itemError) throw itemError;

      toast({
        title: "Order placed successfully!",
        description: `Order ${order.order_number} has been created.`
      });
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setBuying(false);
    }
  };

  return (
    <Card className="group relative overflow-hidden border-0 shadow-none hover:shadow-product transition-all duration-300 bg-card">
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img 
          src={image} 
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
        
        {/* Heart icon */}
        <button 
          onClick={() => setIsLiked(!isLiked)}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white"
        >
          <Heart 
            className={`h-4 w-4 transition-colors ${isLiked ? 'fill-terracotta text-terracotta' : 'text-charcoal'}`} 
          />
        </button>

        {/* Buy now button */}
        <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
          <Button 
            onClick={handleBuyNow}
            disabled={buying}
            className="w-full bg-white text-charcoal hover:bg-white/90 font-semibold"
          >
            {buying ? "Processing..." : "Buy Now"}
          </Button>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-6">
        <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">{category}</p>
        <h3 className="text-lg font-semibold text-foreground mb-3 group-hover:text-sage transition-colors">
          {name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-charcoal">${price}</span>
          {originalPrice && (
            <span className="text-lg text-muted-foreground line-through">${originalPrice}</span>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ProductCard;