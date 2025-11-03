import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import PurchaseModal from "./PurchaseModal";

interface ProductCardProps {
   id: string;
   name: string;
   price: number;
   originalPrice?: number;
   image: string;
   category: string;
   quantity?: number;
   description?: string;
}

const ProductCard = ({ id, name, price, originalPrice, image, category, quantity = 0, description }: ProductCardProps) => {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { addToCart } = useCart();

  const handleBuyNow = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setIsModalOpen(true);
  };

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    try {
      await addToCart(id, 1);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  return (
    <Card className="group relative overflow-hidden border-0 shadow-none hover:shadow-product transition-all duration-300 bg-sage-light">
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img 
          src={image} 
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />

        {/* Sold Out overlay */}
        {quantity === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-600 text-white px-4 py-2 rounded-full font-semibold text-lg">
              Sold Out
            </span>
          </div>
        )}


        {/* Action buttons */}
        {userRole !== 'admin' && quantity > 0 && (
          <div className="absolute bottom-4 left-4 right-4 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 md:transform md:translate-y-2 md:group-hover:translate-y-0">
            <div className="flex gap-2">
              <Button
                onClick={handleAddToCart}
                variant="outline"
                className="flex-1"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
              <Button
                onClick={handleBuyNow}
                className="flex-1"
              >
                Buy Now
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-6">
        <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">{category}</p>
        <h3 className="text-lg font-semibold text-foreground mb-3 group-hover:text-sage transition-colors">
          {name}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground mb-3">
            {isDescriptionExpanded ? description : `${description.slice(0, 100)}${description.length > 100 ? '...' : ''}`}
            {(isDescriptionExpanded || (description && description.length > 100)) && (
              <span
                className="text-xs text-sage hover:text-sage-dark cursor-pointer ml-1"
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              >
                {isDescriptionExpanded ? 'Read Less' : 'Read More'}
              </span>
            )}
          </p>
        )}
        <div className="flex items-center gap-2">
           <span className="text-xl font-bold text-charcoal">₱{price}</span>
           {originalPrice && (
             <span className="text-lg text-muted-foreground line-through">₱{originalPrice}</span>
           )}
         </div>
         <div className="text-sm text-muted-foreground">
           {quantity > 0 ? `${quantity} in stock` : 'Out of stock'}
         </div>
      </div>

      <PurchaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={{ id, name, price, image, quantity }}
      />
    </Card>
  );
};

export default ProductCard;