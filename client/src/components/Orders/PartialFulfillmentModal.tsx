import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Check, AlertCircle } from "lucide-react";
import { Order } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface PartialFulfillmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onOrderUpdate: (updatedOrder: Order) => void;
}

interface FulfillmentItem {
  productId: number;
  productName: string;
  selectedWeight: string;
  totalQuantity: number;
  fulfilledQuantity: number;
}

export default function PartialFulfillmentModal({
  isOpen,
  onClose,
  order,
  onOrderUpdate
}: PartialFulfillmentModalProps) {
  const [fulfillmentItems, setFulfillmentItems] = useState<FulfillmentItem[]>([]);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize fulfillment items and tracking number from order data
  useEffect(() => {
    if (!order || !order.cartItems) {
      setFulfillmentItems([]);
      setTrackingNumber('');
      return;
    }

    // Initialize tracking number
    setTrackingNumber(order.tracking || '');

    const items: FulfillmentItem[] = order.cartItems.map(item => {
      const itemKey = `${item.productId}-${item.selectedWeight}`;
      const partialData = order.partialDetails?.[itemKey];

      return {
        productId: item.productId,
        productName: item.product?.name || 'Unknown Product',
        selectedWeight: item.selectedWeight || '',
        totalQuantity: item.quantity,
        fulfilledQuantity: partialData?.fulfilled || 0
      };
    });

    setFulfillmentItems(items);
  }, [order]);

  const updateFulfillment = (index: number, newFulfilledQuantity: number) => {
    setFulfillmentItems(prev => 
      prev.map((item, i) => 
        i === index 
          ? { ...item, fulfilledQuantity: Math.max(0, Math.min(newFulfilledQuantity, item.totalQuantity)) }
          : item
      )
    );
  };

  const handleSave = async () => {
    if (!order) return;

    setSaving(true);
    try {
      // Build partial details object
      const partialDetails: {[key: string]: { fulfilled: number; total: number }} = {};
      let hasPartialFulfillment = false;
      let allItemsFulfilled = true;

      fulfillmentItems.forEach(item => {
        const itemKey = `${item.productId}-${item.selectedWeight}`;
        partialDetails[itemKey] = {
          fulfilled: item.fulfilledQuantity,
          total: item.totalQuantity
        };

        if (item.fulfilledQuantity > 0 && item.fulfilledQuantity < item.totalQuantity) {
          hasPartialFulfillment = true;
        }
        if (item.fulfilledQuantity < item.totalQuantity) {
          allItemsFulfilled = false;
        }
      });

      // Determine if order is partially fulfilled (not 100% complete but has some fulfillment)
      const totalProgress = getTotalProgress();
      const isPartiallyFulfilled = totalProgress > 0 && totalProgress < 100;

      // Update order with partial details and tracking
      const updates: Partial<Order> = {
        partialDetails,
        partial: isPartiallyFulfilled,
        completed: allItemsFulfilled,
        tracking: trackingNumber || null
      };

      const response = await apiRequest('PATCH', `/api/orders/${order.id}`, updates);

      if (response.ok) {
        const updatedOrder = await response.json();
        onOrderUpdate(updatedOrder.data);
        onClose();
      } else {
        alert('Failed to save fulfillment data');
      }
    } catch (error) {
      console.error('Error saving fulfillment data:', error);
      alert('Failed to save fulfillment data');
    } finally {
      setSaving(false);
    }
  };

  const getTotalProgress = () => {
    const totalItems = fulfillmentItems.reduce((sum, item) => sum + item.totalQuantity, 0);
    const fulfilledItems = fulfillmentItems.reduce((sum, item) => sum + item.fulfilledQuantity, 0);
    return totalItems > 0 ? Math.round((fulfilledItems / totalItems) * 100) : 0;
  };

  const getItemStatus = (item: FulfillmentItem) => {
    if (item.fulfilledQuantity === 0) return 'pending';
    if (item.fulfilledQuantity === item.totalQuantity) return 'complete';
    return 'partial';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': return <Check className="w-4 h-4" />;
      case 'partial': return <AlertCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Manage Partial Fulfillment - {order?.checkoutId}
          </DialogTitle>
        </DialogHeader>

        {order && (
          <div className="space-y-6">
            {/* Progress Overview */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Fulfillment Progress</h3>
                <span className="text-2xl font-bold text-primary">{getTotalProgress()}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${getTotalProgress()}%` }}
                ></div>
              </div>
            </div>

            {/* Tracking Number */}
            <div className="space-y-2">
              <Label htmlFor="trackingNumber" className="text-sm font-medium text-gray-700">
                Shipping Tracking Number
              </Label>
              <Input
                id="trackingNumber"
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number (optional)"
                className="w-full"
              />
            </div>

            {/* Items List */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Order Items</h3>
              {fulfillmentItems.map((item, index) => {
                const status = getItemStatus(item);
                return (
                  <div key={`${item.productId}-${item.selectedWeight}`} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.productName}</h4>
                        <p className="text-sm text-gray-500">Weight: {item.selectedWeight}</p>
                      </div>
                      <Badge className={`${getStatusColor(status)} flex items-center gap-1`}>
                        {getStatusIcon(status)}
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 items-end">
                      <div>
                        <Label className="text-xs text-gray-500">Total Ordered</Label>
                        <div className="text-lg font-semibold">{item.totalQuantity}</div>
                      </div>

                      <div>
                        <Label htmlFor={`fulfilled-${index}`} className="text-xs text-gray-500">
                          Fulfilled Quantity
                        </Label>
                        <Input
                          id={`fulfilled-${index}`}
                          type="number"
                          min="0"
                          max={item.totalQuantity}
                          value={item.fulfilledQuantity}
                          onChange={(e) => updateFulfillment(index, parseInt(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-gray-500">Remaining</Label>
                        <div className="text-lg font-semibold text-orange-600">
                          {item.totalQuantity - item.fulfilledQuantity}
                        </div>
                      </div>
                    </div>

                    {/* Progress bar for this item */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            status === 'complete' ? 'bg-green-500' : 
                            status === 'partial' ? 'bg-yellow-500' : 'bg-gray-400'
                          }`}
                          style={{ 
                            width: `${item.totalQuantity > 0 ? (item.fulfilledQuantity / item.totalQuantity) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-end space-x-3 border-t border-gray-200 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-primary hover:bg-primary/90"
          >
            {saving ? 'Saving...' : 'Save Fulfillment Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}