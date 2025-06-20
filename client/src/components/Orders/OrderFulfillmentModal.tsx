import React, { useState, useEffect, useCallback } from 'react';
import type { Order, CartItem } from '@shared/schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { debounce } from '@/lib/utils';
import { formatCurrency } from '../../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Package, CheckCircle, Download, PrinterIcon } from 'lucide-react';

interface OrderFulfillmentModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateFulfillment: (orderId: string, updates: { completed?: boolean; partial?: boolean }) => void;
}

interface FulfillmentItem {
  cartItemIndex: number;
  productName: string;
  quantity: number;
  weight: string;
  fulfilled: boolean;
}

export default function OrderFulfillmentModal({
  order,
  isOpen,
  onClose,
  onUpdateFulfillment
}: OrderFulfillmentModalProps) {
  const [fulfillmentItems, setFulfillmentItems] = useState<FulfillmentItem[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [tracking, setTracking] = useState<string>('');
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [serviceType, setServiceType] = useState<'Ground' | 'Priority' | 'Express'>('Ground');
  const [labelData, setLabelData] = useState<{
    trackingNumber: string;
    labelUrl: string;
    postage: number;
  } | null>(null);

  // Auto-save function with debounce
  const autoSaveOrder = useCallback(
    debounce(async (orderId: string, updates: { notes?: string; tracking?: string }) => {
      setIsAutoSaving(true);
      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        if (!response.ok) {
          console.error('Failed to auto-save order');
        }
      } catch (error) {
        console.error('Auto-save error:', error);
      } finally {
        setIsAutoSaving(false);
      }
    }, 1000),
    []
  );

  React.useEffect(() => {
    if (order && order.cartItems) {
      const items = order.cartItems.map((item: CartItem, index: number) => ({
        cartItemIndex: index,
        productName: item.product?.name || 'Unknown Product',
        quantity: item.quantity,
        weight: item.selectedWeight || 'N/A',
        fulfilled: false // Start with all items unfulfilled
      }));
      setFulfillmentItems(items);

      // Initialize notes and tracking from order data
      setNotes(order.notes || '');
      setTracking(order.tracking || '');
    }
  }, [order]);

  // Handle notes change with auto-save
  const handleNotesChange = (value: string) => {
    setNotes(value);
    if (order) {
      autoSaveOrder(String(order.id), { notes: value });
    }
  };

  // Handle tracking change with auto-save
  const handleTrackingChange = (value: string) => {
    setTracking(value);
    if (order) {
      autoSaveOrder(String(order.id), { tracking: value });
    }
  };

  const handleItemFulfillmentChange = (index: number, fulfilled: boolean) => {
    setFulfillmentItems(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, fulfilled } : item
      )
    );
  };

  const handleSaveFulfillment = () => {
    if (!order) return;

    const fulfilledCount = fulfillmentItems.filter(item => item.fulfilled).length;
    const totalCount = fulfillmentItems.length;

    let updates: { completed?: boolean; partial?: boolean } = {};

    if (fulfilledCount === 0) {
      // No items fulfilled
      updates = { completed: false, partial: false };
    } else if (fulfilledCount === totalCount) {
      // All items fulfilled
      updates = { completed: true, partial: false };
    } else {
      // Some items fulfilled
      updates = { completed: false, partial: true };
    }

    onUpdateFulfillment(String(order.id), updates);
    onClose();
  };

  const fulfilledCount = fulfillmentItems.filter(item => item.fulfilled).length;
  const totalCount = fulfillmentItems.length;

   const createShippingLabel = async () => {
    if (!order) return;

    setIsCreatingLabel(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/create-shipping-label`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceType })
      });

      if (response.ok) {
        const result = await response.json();
        setLabelData({
          trackingNumber: result.data.trackingNumber,
          labelUrl: result.data.labelUrl,
          postage: result.data.postage
        });
        setTracking(result.data.trackingNumber);
        autoSaveOrder(order.id, { tracking: result.data.trackingNumber });
      } else {
        const errorData = await response.json();
        console.error('Failed to create shipping label:', errorData.message);
        alert(`Failed to create shipping label: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error creating shipping label:', error);
      alert('Error creating shipping label. Please try again.');
    } finally {
      setIsCreatingLabel(false);
    }
  };

  const downloadLabel = () => {
    if (!labelData) return;
    window.open(labelData.labelUrl, '_blank');
  };

  const printLabel = () => {
    if (!labelData) return;
    const printWindow = window.open(labelData.labelUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Order Fulfillment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">
                {order.firstname} {order.lastname}
              </h3>
              <p className="text-sm text-gray-600">{order.email}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">{formatCurrency(order.total || '0')}</div>
              <Badge 
                variant={order.completed ? "default" : order.partial ? "secondary" : "outline"}
                className={
                  order.completed 
                    ? "bg-green-500 text-white" 
                    : order.partial 
                    ? "bg-yellow-500 text-white" 
                    : "bg-gray-200"
                }
              >
                {order.completed ? "Fulfilled" : order.partial ? "Partially Fulfilled" : "Unfulfilled"}
              </Badge>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">Order Items ({fulfilledCount}/{totalCount} fulfilled)</h4>
            <div className="space-y-3">
              {fulfillmentItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={item.fulfilled}
                      onCheckedChange={(checked) => 
                        handleItemFulfillmentChange(index, Boolean(checked))
                      }
                    />
                    <div>
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-sm text-gray-600">
                        Quantity: {item.quantity} | Weight: {item.weight}
                      </div>
                    </div>
                  </div>
                  <Badge variant={item.fulfilled ? "default" : "outline"}>
                    {item.fulfilled ? "Fulfilled" : "Pending"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Order Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Order ID</Label>
              <p className="text-sm">{order.checkoutId || order.id}</p>
            </div>
            {order.affiliateCode && (
              <div>
                <Label className="text-sm font-medium text-gray-700">Affiliate Code</Label>
                <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{order.affiliateCode}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Shipping Label Creation */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Create Shipping Label</Label>
            <div className="flex items-center space-x-4">
              <Select value={serviceType} onValueChange={(value: 'Ground' | 'Priority' | 'Express') => setServiceType(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ground">USPS Ground Advantage</SelectItem>
                  <SelectItem value="Priority">USPS Priority Mail</SelectItem>
                  <SelectItem value="Express">USPS Priority Express</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={createShippingLabel}
                disabled={isCreatingLabel}
                className="bg-blue-500 text-white hover:bg-blue-700"
              >
                {isCreatingLabel ? "Creating..." : "Create Label"}
              </Button>
            </div>
          </div>

          {labelData && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Shipping Label Actions</Label>
              <div className="flex items-center space-x-4">
                <Button onClick={downloadLabel} className="bg-green-500 text-white hover:bg-green-700">
                  <Download className="mr-2 h-4 w-4" />
                  Download Label
                </Button>
                <Button onClick={printLabel} className="bg-purple-500 text-white hover:bg-purple-700">
                  <PrinterIcon className="mr-2 h-4 w-4" />
                  Print Label
                </Button>
                <div>Postage: ${labelData.postage}</div>
              </div>
            </div>
          )}

          <Separator />

          {/* Tracking Number */}
          <div className="space-y-2">
            <Label htmlFor="tracking" className="text-sm font-medium">
              USPS Tracking Number
              {isAutoSaving && <span className="text-xs text-gray-500 ml-2">(Auto-saving...)</span>}
            </Label>
            <Input
              id="tracking"
              value={tracking}
              onChange={(e) => handleTrackingChange(e.target.value)}
              placeholder="Enter USPS tracking number"
              className="font-mono"
            />
            <div className="text-xs text-gray-500">
              {tracking ? (
                <span className="text-green-600">✓ Shipped</span>
              ) : (
                <span className="text-orange-600">Not shipped</span>
              )}
            </div>
          </div>

          <Separator />

          {/* Notes Section */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes
              {isAutoSaving && <span className="text-xs text-gray-500 ml-2">(Auto-saving...)</span>}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add notes about this order..."
              className="min-h-[100px] resize-none"
            />
            <div className="text-xs text-gray-500">
              Notes are automatically saved as you type
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {fulfilledCount === 0 && "No items fulfilled"}
              {fulfilledCount > 0 && fulfilledCount < totalCount && `${fulfilledCount} of ${totalCount} items fulfilled`}
              {fulfilledCount === totalCount && "All items fulfilled"}
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSaveFulfillment}>
                Save Fulfillment Status
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}