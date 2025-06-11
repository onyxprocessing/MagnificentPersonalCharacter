
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Product } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { Edit, ArrowDownToLine, Tag, CheckCircle, Clock, AlertTriangle } from "lucide-react";

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onEdit: (product: Product) => void;
}

export default function ProductDetailModal({
  isOpen,
  onClose,
  product,
  onEdit
}: ProductDetailModalProps) {
  if (!product) return null;

  const isLowStock = product.stock !== undefined && 
                     product.stock !== null &&
                     product.lowStockThreshold !== undefined && 
                     product.lowStockThreshold !== null &&
                     product.stock <= product.lowStockThreshold;

  const getStockStatus = () => {
    // Return a default status if stock is undefined or null
    if (product.stock === undefined || product.stock === null) {
      return (
        <div className="flex items-center text-gray-500">
          <Clock className="w-4 h-4 mr-1" />
          <span>Stock status unavailable</span>
        </div>
      );
    }
    
    if (product.stock === 0) {
      return (
        <div className="flex items-center text-red-500">
          <AlertTriangle className="w-4 h-4 mr-1" />
          <span>Out of Stock</span>
        </div>
      );
    }

    if (isLowStock) {
      return (
        <div className="flex items-center text-amber-500">
          <Clock className="w-4 h-4 mr-1" />
          <span>Low Stock ({product.stock} left)</span>
        </div>
      );
    }

    return (
      <div className="flex items-center text-emerald-600">
        <CheckCircle className="w-4 h-4 mr-1" />
        <span>In Stock ({product.stock} available)</span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Product Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          {/* Product Image */}
          <div className="space-y-4">
            {product.image ? (
              <img 
                src={product.image} 
                alt={product.imageAlt || product.name}
                className="w-full rounded-lg object-cover max-h-80"
              />
            ) : (
              <div className="w-full h-80 bg-gray-100 flex items-center justify-center rounded-lg">
                <span className="text-gray-400">No image available</span>
              </div>
            )}

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center text-gray-600">
                <Tag className="w-4 h-4 mr-2" />
                <span>SKU: {product.sku || 'N/A'}</span>
              </div>
              
              <div className="flex items-center text-gray-600">
                <ArrowDownToLine className="w-4 h-4 mr-2" />
                <span>Weight: {product.weight || 'N/A'}</span>
              </div>
            </div>
          </div>
          
          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
              <div className="flex items-center mt-2">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                  {product.category || 'Uncategorized'}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-3xl font-bold text-gray-900">
                  {formatCurrency(parseFloat(product.price || '0'))}
                </span>
                {getStockStatus()}
              </div>
              
              {product.lowStockThreshold !== undefined && (
                <div className="text-sm text-gray-500">
                  Low stock alert when quantity below {product.lowStockThreshold}
                </div>
              )}
              
              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600 whitespace-pre-line">
                  {product.description || 'No description available'}
                </p>
              </div>
              
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-900">Weight Options & Inventory</h3>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="font-medium text-gray-700">Weight</div>
                  <div className="font-medium text-gray-700">Price</div>
                  <div className="font-medium text-gray-700">Inventory</div>
                  
                  {product.weightOptions && product.weightOptions.map((option, index) => {
                    // Find inventory for this weight
                    const inventoryItem = product.inventory && product.inventory.find(
                      item => item.weight === option.weight
                    );
                    const quantity = inventoryItem ? inventoryItem.quantity : 0;
                    
                    // Determine status color based on quantity
                    const inventoryStatusColor = 
                      quantity <= 0 ? 'text-red-500' :
                      quantity <= 5 ? 'text-amber-500' : 'text-emerald-600';
                    
                    return (
                      <div key={index} className="contents">
                        <div className="text-gray-600">{option.weight}</div>
                        <div className="text-gray-600">{formatCurrency(parseFloat(option.price || '0'))}</div>
                        <div className={inventoryStatusColor}>{quantity} in stock</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="space-y-2 pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-900">Product Status</h3>
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${
                    product.status === 'active' ? 'bg-green-500' : 
                    product.status === 'draft' ? 'bg-gray-400' : 'bg-red-500'
                  }`}></span>
                  <span className="capitalize text-gray-700">{product.status || 'Unknown'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
          >
            Close
          </Button>
          <Button 
            onClick={() => {
              onEdit(product);
              onClose();
            }}
            className="flex items-center"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}