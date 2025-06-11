import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Product } from "@shared/schema";
import { Edit, Copy, Trash, Image } from "lucide-react";
import { useLocation } from "wouter";

interface ProductCardProps {
  product: Product;
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDuplicate: (product: Product) => void;
  onDelete: (productId: number) => void;
}

export default function ProductCard({
  product,
  onView,
  onEdit,
  onDuplicate,
  onDelete
}: ProductCardProps) {
  const getStockBadge = () => {
    // Calculate total inventory across all weights
    const totalInventory = product.inventory?.reduce((sum, item) => {
      return sum + (item.quantity || 0);
    }, 0) || 0;
    
    // Handle null values safely
    const threshold = product.lowStockThreshold ?? 5;  // Default threshold of 5
    
    if (totalInventory <= 0) {
      return <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">Out of Stock</span>;
    }
    
    if (totalInventory <= threshold) {
      return <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">Low Stock</span>;
    }
    
    return <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">In Stock</span>;
  };

  // Get the location for navigation
  const [, navigate] = useLocation();
  
  // Handle clicks on card to view product details
  const handleCardClick = (e: React.MouseEvent) => {
    // Only trigger if not clicking on one of the buttons
    if (!(e.target as HTMLElement).closest('button')) {
      // Navigate to the product detail page instead of showing modal
      navigate(`/products/${product.id}`);
    }
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-md transition-all cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="w-full h-48 bg-gray-100 relative overflow-hidden">
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.imageAlt || product.name}
            className="w-full h-full object-contain p-4"
            onError={(e) => {
              // Set a fallback image on error
              const url = `https://via.placeholder.com/300x200/e2e8f0/1e293b?text=${encodeURIComponent(product.name || 'Product')}`;
              e.currentTarget.src = url;
              console.log(`Image error for ${product.name}, using fallback: ${url}`);
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4">
            <Image className="w-16 h-16 opacity-40 mb-2" />
            <span className="text-sm text-center font-medium">
              {product.name.length > 20 ? product.name.substring(0, 20) + '...' : product.name}
            </span>
          </div>
        )}
      </div>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-medium text-gray-900 text-lg">{product.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{product.category || 'Uncategorized'}</p>
          </div>
          {getStockBadge()}
        </div>
        <div className="flex justify-between items-center">
          <div>
            <span className="font-semibold text-gray-900 text-xl">
              ${parseFloat(product.price || '0').toFixed(2)}
            </span>
            <span className="text-sm text-gray-500 ml-2">{product.weight}</span>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => {
                e.stopPropagation();
                onEdit(product);
              }}
              className="text-primary hover:bg-primary/10 hover:text-primary"
              title="Edit Product"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(product);
              }}
              className="text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              title="Duplicate Product"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(product.id);
              }}
              className="text-red-500 hover:bg-red-50 hover:text-red-600"
              title="Delete Product"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
