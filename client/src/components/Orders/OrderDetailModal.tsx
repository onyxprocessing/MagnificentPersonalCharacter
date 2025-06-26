import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Ban, Check, CreditCard, Mail, Truck, Package, PrinterIcon } from "lucide-react";
import { Order } from "@shared/schema";
import { format } from "date-fns";
import { useEffect, useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import PayWithStripeButton from "./PayWithStripeButton";
import PartialFulfillmentModal from "./PartialFulfillmentModal";
import ShippingLabelModal from "./ShippingLabelModal";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  loading?: boolean;
  onUpdateStatus: (id: string, status: string) => void;
}

// Get the correct price based on the selected weight
const getItemPrice = (item: any) => {
  if (!item || !item.product) return 0;

  // Get the selected weight from the item
  const selectedWeight = item.selectedWeight;
  if (!selectedWeight) return parseFloat(item.product.price || '0');

  // Convert weight to a valid property name (e.g., "10mg" -> "price10mg")
  const priceField = `price${selectedWeight}`;

  // Get the price for the selected weight
  const price = item.product[priceField];
  return price ? parseFloat(price) : 0;
};

export default function OrderDetailModal({
  isOpen,
  onClose,
  order,
  loading = false,
  onUpdateStatus
}: OrderDetailModalProps) {
  const [paymentStatus, setPaymentStatus] = useState<{
    loading: boolean;
    paymentVerified: boolean;
    message?: string;
    paymentDetails?: {
      amount?: number;
      currency?: string;
      paymentMethod?: string;
      createdAt?: string;
    };
    stripeStatus?: string;
    error?: string;
  }>({
    loading: false,
    paymentVerified: false
  });

  // Function to fetch payment status from Stripe
  const fetchPaymentStatus = async () => {
    if (!order || !order.id) return;

    setPaymentStatus(prev => ({ ...prev, loading: true }));

    try {
      const res = await apiRequest('GET', `/api/orders/${order.id}/payment-status`);
      const data = await res.json();

      if (data.success) {
        setPaymentStatus({
          loading: false,
          paymentVerified: data.data.paymentVerified,
          message: data.data.message,
          paymentDetails: data.data.paymentDetails,
          stripeStatus: data.data.stripeStatus
        });
      } else {
        setPaymentStatus({
          loading: false,
          paymentVerified: false,
          message: data.message || 'Failed to verify payment with Stripe',
          error: data.error
        });
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      setPaymentStatus({
        loading: false,
        paymentVerified: false,
        message: 'Error connecting to payment verification service',
        error: error.message || 'Unknown error'
      });
    }
  };

  // State for tracking order fulfillment process
  const [completingOrder, setCompletingOrder] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<{
    confirmation: boolean;
    shipping: boolean;
  }>({
    confirmation: false,
    shipping: false
  });
  const [partialFulfillmentModalOpen, setPartialFulfillmentModalOpen] = useState(false);
  const [shippingLabelModalOpen, setShippingLabelModalOpen] = useState(false);
  const [markingShipped, setMarkingShipped] = useState(false);

  // Notes state and auto-save functionality
  const [notes, setNotes] = useState(order?.notes || '');
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Shipping Label
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [serviceType, setServiceType] = useState<'Ground' | 'Priority' | 'Express'>('Ground');
  const [labelData, setLabelData] = useState<{
    trackingNumber: string;
    labelUrl: string;
    postage: number;
  } | null>(null);

  // Log the order object for debugging
  useEffect(() => {
    if (isOpen) {
      console.log('OrderDetailModal is open, order data:', order);
    }
  }, [isOpen, order]);

  // Check payment status with Stripe when an order is opened
  useEffect(() => {
    if (order && order.id && isOpen) {
      console.log('OrderDetailModal checking payment status for order:', order.id);
      if (order.status === 'payment_selection') {
        fetchPaymentStatus();
      }
    }
  }, [order, isOpen]);

  // Update notes state when order changes
  useEffect(() => {
    if (order) {
      setNotes(order.notes || '');
    }
  }, [order]);

  // Auto-save notes functionality
  const saveNotes = useCallback(async (notesText: string) => {
    if (!order || !order.id) return;

    setIsAutoSaving(true);
    try {
      const res = await apiRequest('PATCH', `/api/orders/${order.id}`, {
        notes: notesText
      });

      if (res.ok) {
        console.log('Notes saved successfully');
      } else {
        console.error('Failed to save notes');
      }
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [order]);

  const handleNotesChange = useCallback((value: string) => {
    setNotes(value);

    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Set new timeout for auto-save (debounce for 1 second)
    const timeout = setTimeout(() => {
      saveNotes(value);
    }, 1000);

    setSaveTimeout(timeout);
  }, [saveTimeout, saveNotes]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  if (!isOpen) return null;

  const formatDate = (dateString: Date | string, includeTime = false) => {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return format(date, includeTime ? 'MMM d, yyyy - HH:mm:ss' : 'MMM d, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getOrderTotal = (order: Order) => {
    if (order.total) return parseFloat(order.total);

    if (!order.cartItems || !Array.isArray(order.cartItems)) return 0;

    return order.cartItems.reduce((sum, item) => {
      const price = getItemPrice(item);
      const quantity = item.quantity || 1;
      return sum + (price * quantity);
    }, 0);
  };

  const getSubtotal = (order: Order) => {
    if (!order.cartItems || !Array.isArray(order.cartItems)) return 0;

    return order.cartItems.reduce((sum, item) => {
      const price = getItemPrice(item);
      const quantity = item.quantity || 1;
      return sum + (price * quantity);
    }, 0);
  };

  const getShippingCost = () => {
    // Assuming $9.99 shipping cost for simplicity
    return 9.99;
  };

  const handleMarkAsComplete = async () => {
    if (!order) return;

    setCompletingOrder(true);
    try {
      // Update the order's completed field in Airtable
      const res = await apiRequest('PATCH', `/api/orders/${order.id}`, {
        completed: true
      });

      if (res.ok) {
        // If successful, notify the parent component that the status has changed
        onUpdateStatus(order.id, order.status);
        onClose(); // Close the modal
      } else {
        console.error('Failed to mark order as fulfilled');
      }
    } catch (error) {
      console.error('Error completing order:', error);
    } finally {
      setCompletingOrder(false);
    }
  };

  // Handle marking an order as shipped
  const handleMarkAsShipped = async () => {
    if (!order) return;

    setMarkingShipped(true);
    try {
      const res = await apiRequest('PATCH', `/api/orders/${order.id}`, {
        shipped: true
      });

      if (res.ok) {
        // If successful, notify the parent component that the order has been updated
        onUpdateStatus(order.id, order.status || '');
        console.log('Order marked as shipped successfully');
      } else {
        console.error('Failed to mark order as shipped');
      }
    } catch (error) {
      console.error('Error marking order as shipped:', error);
    } finally {
      setMarkingShipped(false);
    }
  };

  const createShippingLabel = async () => {
    if (!order) return;

    setIsCreatingLabel(true);
    try {
      const res = await apiRequest('POST', `/api/orders/${order.id}/create-shipping-label`, {
        serviceType: serviceType
      });

      if (res.ok) {
        const result = await res.json();
        setLabelData({
          trackingNumber: result.data.trackingNumber,
          labelUrl: result.data.labelUrl,
          postage: result.data.postage
        });

        // Update the order with the tracking number
        const updatedOrder = { ...order, tracking: result.data.trackingNumber };
        onUpdateStatus(updatedOrder.id, updatedOrder.status || '');
      } else {
        const errorData = await res.json();
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

  // Handle canceling an order
  const handleCancelOrder = async () => {
    if (!order) return;

    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        const res = await apiRequest('PATCH', `/api/orders/${order.id}`, {
          status: 'cancelled'
        });

        if (res.ok) {
          onUpdateStatus(order.id, 'cancelled');
          onClose(); // Close the modal
        }
      } catch (error) {
        console.error('Error canceling order:', error);
      }
    }
  };

  // Handle sending confirmation email
  const handleSendConfirmationEmail = async () => {
    if (!order) return;

    // If email already sent, show confirmation dialog
    if (order.confirmationEmailSent) {
      const confirmResend = window.confirm('A confirmation email has already been sent. Do you want to send it again?');
      if (!confirmResend) return;
    }

    setSendingEmail(prev => ({ ...prev, confirmation: true }));

    try {
      const res = await apiRequest('POST', `/api/orders/${order.id}/send-confirmation`, {});

      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Confirmation email sent successfully!');
        // Refresh the order data to show updated status
        onUpdateStatus(order.id, order.status || '');
      } else {
        const errorData = await res.json();
        alert(errorData.message || 'Failed to send confirmation email');
      }
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      alert('Failed to send confirmation email');
    } finally {
      setSendingEmail(prev => ({ ...prev, confirmation: false }));
    }
  };

  // Handle sending shipping notification email
  const handleSendShippingEmail = async () => {
    if (!order) return;

    // If email already sent, show confirmation dialog
    if (order.shippingEmailSent) {
      const confirmResend = window.confirm('A shipping notification has already been sent. Do you want to send it again?');
      if (!confirmResend) return;
    }

    setSendingEmail(prev => ({ ...prev, shipping: true }));

    try {
      const res = await apiRequest('POST', `/api/orders/${order.id}/send-shipping`, {});

      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Shipping notification sent successfully!');
        // Refresh the order data to show updated status
        onUpdateStatus(order.id, order.status || '');
      } else {
        const errorData = await res.json();
        alert(errorData.message || 'Failed to send shipping notification');
      }
    } catch (error) {
      console.error('Error sending shipping notification:', error);
      alert('Failed to send shipping notification');
    } finally {
      setSendingEmail(prev => ({ ...prev, shipping: false }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Order Details - <span className="text-primary">{order?.checkoutId}</span>
          </DialogTitle>
        </DialogHeader>

        {loading || !order ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
            <Skeleton className="h-60" />
            <Skeleton className="h-40" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Customer and Shipping Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Customer Information</h3>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="text-gray-500">Name:</span> {order.firstname} {order.lastname}
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-500">Email:</span> {order.email || 'Not provided'}
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-500">Phone:</span> {order.phone || 'Not provided'}
                  </p>
                  {order.affiliateCode && (
                    <p className="text-sm">
                      <span className="text-gray-500">Affiliate Code:</span> 
                      <span className="ml-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                        {order.affiliateCode}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Shipping Information</h3>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="text-gray-500">Address:</span> {order.address || 'Not provided'}
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-500">City:</span> {order.city || 'Not provided'}
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-500">State:</span> {order.state || 'Not provided'}
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-500">ZIP:</span> {order.zip || 'Not provided'}
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-500">Shipping Method:</span> {order.shippingMethod || 'Standard'}
                  </p>
                  {order.tracking ? (
                    <p className="text-sm">
                      <span className="text-gray-500">Tracking Number:</span> 
                      <span className="font-mono text-blue-600 ml-1">{order.tracking}</span>
                      <span className="text-green-600 text-xs ml-2">✓ Shipped</span>
                    </p>
                  ) : (
                    <p className="text-sm">
                      <span className="text-gray-500">Tracking Number:</span> 
                      <span className="text-orange-600 ml-1">Not shipped</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Shipping Label Creation */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 mb-3">Shipping Label</h3>

              {!labelData && (
                <div className="space-y-3 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-center space-x-4">
                    <Select value={serviceType} onValueChange={(value: 'Ground' | 'Priority' | 'Express') => setServiceType(value)}>
                      <SelectTrigger className="w-[200px]">
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
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <Truck className="w-4 h-4 mr-2" />
                      {isCreatingLabel ? "Creating Label..." : "Generate Label"}
                    </Button>
                  </div>
                </div>
              )}

            </div>

            {/* Order Items */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Order Items</h3>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100 text-left">
                    <tr>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.cartItems && Array.isArray(order.cartItems) ? (
                      order.cartItems.map((item, index) => {
                        // Get fulfillment status for this item
                        const getFulfillmentStatus = () => {
                          if (!order.partialDetails || !item.productId || !item.selectedWeight) {
                            return { fulfilled: 0, total: item.quantity || 1 };
                          }
                          const itemKey = `${item.productId}-${item.selectedWeight}`;
                          return order.partialDetails[itemKey] || { fulfilled: 0, total: item.quantity || 1 };
                        };

                        const fulfillmentStatus = getFulfillmentStatus();
                        const isFullyFulfilled = fulfillmentStatus.fulfilled === fulfillmentStatus.total;
                        const isPartiallyFulfilled = fulfillmentStatus.fulfilled > 0 && fulfillmentStatus.fulfilled < fulfillmentStatus.total;

                        // Determine text color based on fulfillment status
                        let productNameColor = "text-gray-700"; // Default unfulfilled
                        if (isFullyFulfilled) {
                          productNameColor = "text-green-600 font-medium"; // Fulfilled
                        } else if (isPartiallyFulfilled) {
                          productNameColor = "text-yellow-600"; // Partially fulfilled
                        }

                        return (
                          <tr key={index}>
                            <td className={`px-4 py-3 whitespace-nowrap text-sm ${productNameColor}`}>
                              {item.product?.name || 'Unknown Product'}
                              {fulfillmentStatus.fulfilled > 0 && (
                                <span className="ml-2 text-xs text-gray-500">
                                  [{fulfillmentStatus.fulfilled}/{fulfillmentStatus.total}]
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {item.selectedWeight || 'N/A'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {item.quantity || 1}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                              ${getItemPrice(item) || '0.00'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-sm text-gray-500 text-center">
                          No items found for this order
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-sm font-medium text-gray-500 text-right">Subtotal</td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-700 text-right">
                        ${getSubtotal(order).toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-sm font-medium text-gray-500 text-right">Shipping</td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-700 text-right">
                        ${getShippingCost().toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-sm font-medium text-gray-600 text-right">Total</td>
                      <td className="px-4 py-2 text-base font-bold text-gray-900 text-right">
                        ${getOrderTotal(order).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Payment Verification Status */}
            {order.status === 'payment_selection' && (
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Payment Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {paymentStatus.loading ? (
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                    </div>
                  ) : paymentStatus.paymentVerified ? (
                    <div className="border-l-4 border-green-500 pl-4">
                      <div className="flex items-center mb-2">
                        <div className="bg-green-100 p-1.5 rounded-full mr-3">
                          <Check className="w-5 h-5 text-green-600" />
                        </div>
                        <h4 className="font-medium text-green-700">PAYMENT VERIFIED ✓</h4>
                      </div>
                      <div className="ml-11">
                        <p className="text-sm text-green-600 font-medium mb-2">{paymentStatus.message || 'Payment was successfully verified'}</p>

                        {paymentStatus.paymentDetails && (
                          <div className="text-sm text-gray-600 space-y-1 pt-2 border-t border-gray-200">
                            <p><span className="font-medium">Amount:</span> ${paymentStatus.paymentDetails.amount?.toFixed(2)}</p>
                            <p><span className="font-medium">Method:</span> {paymentStatus.paymentDetails.paymentMethod}</p>
                            <p><span className="font-medium">Date:</span> {paymentStatus.paymentDetails.createdAt ? formatDate(new Date(paymentStatus.paymentDetails.createdAt), true) : 'Unknown'}</p>
                            <p><span className="font-medium">Status:</span> <span className="text-green-600 font-medium">{paymentStatus.stripeStatus || 'Completed'}</span></p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-center mb-2">
                        <div className="bg-blue-100 p-1.5 rounded-full mr-3">
                          <CreditCard className="w-5 h-5 text-blue-600" />
                        </div>
                        <h4 className="font-medium text-blue-700">Payment Status</h4>
                      </div>
                      <div className="text-sm text-gray-600 ml-11">
                        <p>{paymentStatus.message || 'Order has payment_selection status, but no Stripe payment ID was found.'}</p>
                        <p className="mt-2"><span className="font-medium">Order Total:</span> ${getOrderTotal(order)}</p>
                        <p><span className="font-medium">Status:</span> Ready for payment verification</p>
                        <p className="mt-2 text-gray-500">Customer: {order.firstname} {order.lastname}</p>
                        <p className="text-gray-500">Email: {order.email}</p>
                        <button 
                          onClick={() => fetchPaymentStatus()} 
                          className="mt-2 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                        >
                          Search Stripe by Customer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Email Notifications */}
            {order.email && (
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Email Notifications</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendConfirmationEmail}
                      disabled={sendingEmail.confirmation || order.confirmationEmailSent}
                      className={`flex items-center ${order.confirmationEmailSent ? 'bg-green-50 border-green-200' : ''}`}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      {sendingEmail.confirmation ? 'Sending...' : 
                       order.confirmationEmailSent ? 'Confirmation Email Sent' : 'Send Order Confirmation'}
                      {order.confirmationEmailSent && <span className="ml-2 text-green-600 font-bold">✓</span>}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendShippingEmail}
                      disabled={sendingEmail.shipping || order.shippingEmailSent}
                      className={`flex items-center ${order.shippingEmailSent ? 'bg-green-50 border-green-200' : ''}`}
                    >
                      <Truck className="w-4 h-4 mr-2" />
                      {sendingEmail.shipping ? 'Sending...' : 
                       order.shippingEmailSent ? 'Shipping Email Sent' : 'Send Shipping Notification'}
                      {order.shippingEmailSent && <span className="ml-2 text-green-600 font-bold">✓</span>}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Customer email: {order.email}
                  </p>
                </div>
              </div>
            )}

            {/* Order Timeline */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Order Timeline</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-4">
                  <div className="flex">
                    <div className="flex flex-col items-center mr-4">
                      <div className="bg-primary w-3 h-3 rounded-full"></div>
                      <div className="bg-gray-300 w-0.5 h-full"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Started Checkout</p>
                      <p className="text-xs text-gray-500">{formatDate(order.createdAt, true)}</p>
                    </div>
                  </div>

                  {order.status === 'personal_info' || order.status === 'shipping_info' || order.status === 'payment_selection' || order.status === 'completed' ? (
                    <div className="flex">
                      <div className="flex flex-col items-center mr-4">
                        <div className="bg-primary w-3 h-3 rounded-full"></div>
                        <div className="bg-gray-300 w-0.5 h-full"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Personal Information Entered</p>
                        <p className="text-xs text-gray-500">{formatDate(order.updatedAt, true)}</p>
                      </div>
                    </div>
                  ) : null}

                  {order.status === 'shipping_info' || order.status === 'payment_selection' || order.status === 'completed' ? (
                    <div className="flex">
                      <div className="flex flex-col items-center mr-4">
                        <div className="bg-primary w-3 h-3 rounded-full"></div>
                        <div className="bg-gray-300 w-0.5 h-full"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Shipping Information Entered</p>
                        <p className="text-xs text-gray-500">{formatDate(order.updatedAt, true)}</p>
                      </div>
                    </div>
                  ) : null}

                  {order.status === 'payment_selection' || order.status === 'completed' ? (
                    <div className="flex">
                      <div className="flex flex-col items-center mr-4">
                        <div className="bg-primary w-3 h-3 rounded-full"></div>
                        <div className="bg-gray-300 w-0.5 h-full"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Payment Method Selected</p>
                        <p className="text-xs text-gray-500">{formatDate(order.updatedAt, true)}</p>
                      </div>
                    </div>
                  ) : null}

                  {order.status === 'completed' ? (
                    <div className="flex">
                      <div className="flex flex-col items-center mr-4">
                        <div className="bg-primary w-3 h-3 rounded-full"></div>
                        <div className="bg-gray-300 w-0.5 h-0"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Order Completed</p>
                        <p className="text-xs text-gray-500">{formatDate(order.updatedAt, true)}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Notes</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="order-notes" className="text-sm font-medium">
                    Order Notes
                    {isAutoSaving && <span className="text-xs text-gray-500 ml-2">(Auto-saving...)</span>}
                  </Label>
                  <Textarea
                    id="order-notes"
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Add notes about this order..."
                    className="min-h-[100px] resize-none bg-white"
                  />
                  <div className="text-xs text-gray-500">
                    Notes are automatically saved as you type
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-end space-x-3 border-t border-gray-200 pt-4">
          <Button 
            variant="default" 
            className="flex items-center bg-blue-600 hover:bg-blue-700"
            onClick={() => setPartialFulfillmentModalOpen(true)}
            disabled={loading || !order}
          >
            <Package className="w-4 h-4 mr-2" />
            Manage Fulfillment
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center border-blue-600 text-blue-600 hover:bg-blue-50"
            onClick={() => setShippingLabelModalOpen(true)}
            disabled={loading || !order}
          >
            <Package className="w-4 h-4 mr-2" />
            Create Shipping Label
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={handleCancelOrder}
            disabled={loading || !order}
          >
            <Ban className="w-4 h-4 mr-2" />
            Cancel Order
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Partial Fulfillment Modal */}
      <PartialFulfillmentModal
        isOpen={partialFulfillmentModalOpen}
        onClose={() => setPartialFulfillmentModalOpen(false)}
        order={order}
        onOrderUpdate={(updatedOrder) => {
          // Update the order data and trigger re-fetch if needed
          onUpdateStatus(updatedOrder.id, updatedOrder.status || '');
        }}
      />

      {/* Shipping Label Modal */}
      <ShippingLabelModal
        isOpen={shippingLabelModalOpen}
        onClose={() => setShippingLabelModalOpen(false)}
        order={order}
        onOrderUpdate={(orderId, status) => {
          onUpdateStatus(orderId, status);
        }}
      />
    </Dialog>
  );
}