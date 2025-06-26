
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Truck, Package2 } from 'lucide-react';
import { Order } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface ShippingLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onOrderUpdate: (orderId: string, status: string) => void;
}

export default function ShippingLabelModal({
  isOpen,
  onClose,
  order,
  onOrderUpdate
}: ShippingLabelModalProps) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState<'USPS' | 'FedEx' | 'UPS'>('USPS');
  const [serviceType, setServiceType] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!order || !trackingNumber.trim()) {
      alert('Please enter a tracking number');
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiRequest('PATCH', `/api/orders/${order.id}`, {
        tracking: trackingNumber.trim(),
        shippingCarrier: carrier,
        shippingService: serviceType,
        shippingLabelCreated: true,
        shipped: true,
        notes: notes ? `${order.notes || ''}\n\nShipping Label Created:\nCarrier: ${carrier}\nService: ${serviceType}\nTracking: ${trackingNumber}\nNotes: ${notes}`.trim() : order.notes
      });

      if (res.ok) {
        onOrderUpdate(order.id, order.status || '');
        onClose();
        // Reset form
        setTrackingNumber('');
        setCarrier('USPS');
        setServiceType('');
        setNotes('');
      } else {
        const errorData = await res.json();
        alert(errorData.message || 'Failed to save shipping label information');
      }
    } catch (error) {
      console.error('Error saving shipping label:', error);
      alert('Error saving shipping label information');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setTrackingNumber('');
    setCarrier('USPS');
    setServiceType('');
    setNotes('');
    onClose();
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package2 className="w-5 h-5" />
            Create Shipping Label
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-gray-700">Order: {order.checkoutId}</p>
            <p className="text-sm text-gray-600">{order.firstname} {order.lastname}</p>
            <p className="text-xs text-gray-500">{order.address}, {order.city}, {order.state} {order.zip}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="carrier">Shipping Carrier</Label>
            <Select value={carrier} onValueChange={(value: 'USPS' | 'FedEx' | 'UPS') => setCarrier(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select carrier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USPS">USPS</SelectItem>
                <SelectItem value="FedEx">FedEx</SelectItem>
                <SelectItem value="UPS">UPS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceType">Service Type</Label>
            <Input
              id="serviceType"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              placeholder="e.g., Priority Mail, Ground, Express"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trackingNumber">Tracking Number *</Label>
            <Input
              id="trackingNumber"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number"
              className="font-mono"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="labelNotes">Notes (Optional)</Label>
            <Textarea
              id="labelNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about the shipping label..."
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !trackingNumber.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Truck className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Label & Mark Shipped'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
