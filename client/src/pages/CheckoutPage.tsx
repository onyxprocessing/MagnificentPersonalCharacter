import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment Successful",
          description: "Thank you for your purchase!",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          'Complete Payment'
        )}
      </Button>
    </form>
  );
};

export default function CheckoutPage() {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have a clientSecret in the URL (for return from successful payment)
    const searchParams = new URLSearchParams(window.location.search);
    const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');
    const paymentIntentStatus = searchParams.get('redirect_status');

    if (paymentIntentClientSecret && paymentIntentStatus) {
      // Set the client secret from the URL for Stripe Elements to work with
      setClientSecret(paymentIntentClientSecret);
      setIsLoading(false);
      
      // Handle return from Stripe redirect
      if (paymentIntentStatus === 'succeeded') {
        toast({
          title: "Payment Successful",
          description: "Your payment has been processed successfully!",
        });
        
        // After a successful payment, update the order status
        const orderId = sessionStorage.getItem('stripeOrderId');
        if (orderId) {
          // Update the order status to "paid" or another status that indicates successful payment
          apiRequest('PATCH', `/api/orders/${orderId}`, {
            status: 'ordered', // Use the appropriate status in your system
            // Set stripe payment verification flag if needed
            // stripePaymentVerified: true
          }).catch(err => {
            console.error('Failed to update order status:', err);
          });
          
          // Clear the sessionStorage
          sessionStorage.removeItem('stripeOrderId');
        }
      } else {
        toast({
          title: "Payment Failed",
          description: "There was an issue with your payment. Please try again.",
          variant: "destructive"
        });
      }
      return;
    }

    // Get the order ID from sessionStorage
    const orderId = sessionStorage.getItem('stripeOrderId');
    if (!orderId) {
      toast({
        title: "No Order Selected",
        description: "No order was selected for payment",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    // Fetch the client secret for this order's payment intent
    const getClientSecret = async () => {
      try {
        // Get order details to determine amount
        const orderResponse = await apiRequest('GET', `/api/orders/${orderId}`);
        const orderData = await orderResponse.json();
        
        if (!orderData.success || !orderData.data) {
          throw new Error("Could not retrieve order details");
        }
        
        const order = orderData.data;
        const amount = parseFloat(order.total || '0');
        
        if (!amount || isNaN(amount) || amount <= 0) {
          throw new Error("Invalid order amount");
        }
        
        // Create a payment intent
        const paymentResponse = await apiRequest('POST', '/api/create-payment-intent', {
          amount,
          orderId,
          customerEmail: order.email,
          metadata: {
            customerName: `${order.firstname || ''} ${order.lastname || ''}`.trim(),
            orderRef: order.checkoutId
          }
        });
        
        const paymentData = await paymentResponse.json();
        
        if (!paymentData.success || !paymentData.clientSecret) {
          throw new Error(paymentData.message || "Failed to create payment intent");
        }
        
        setClientSecret(paymentData.clientSecret);
      } catch (error: any) {
        toast({
          title: "Payment Setup Failed",
          description: error.message || "Could not set up payment. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    getClientSecret();
  }, [toast]);

  // Check if we have URL parameters indicating a return from Stripe
  const searchParams = new URLSearchParams(window.location.search);
  const paymentIntentStatus = searchParams.get('redirect_status');
  const isReturnFromPayment = searchParams.get('payment_intent_client_secret') !== null;

  if (isReturnFromPayment) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
        <h1 className="text-2xl font-bold text-center mb-6">
          {paymentIntentStatus === 'succeeded' ? 'Payment Successful' : 'Payment Failed'}
        </h1>
        <div className={`text-center p-4 mb-6 rounded-md ${
          paymentIntentStatus === 'succeeded' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <p>
            {paymentIntentStatus === 'succeeded' 
              ? 'Your payment has been processed successfully!'
              : 'There was an issue with your payment. Please try again.'}
          </p>
        </div>
        <div className="flex justify-center">
          <Button 
            onClick={() => window.location.href = '/orders'}
            className="w-full"
          >
            Return to Orders
          </Button>
        </div>
      </div>
    );
  }

  // Check if we have an order to pay for
  const orderId = sessionStorage.getItem('stripeOrderId');
  if (!orderId && !isLoading) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
        <h1 className="text-2xl font-bold text-center mb-6">No Order Selected</h1>
        <p className="text-center text-gray-600 mb-6">
          No order was selected for payment. Please return to your orders and select an order to pay.
        </p>
        <div className="flex justify-center">
          <Button 
            onClick={() => window.location.href = '/orders'}
            className="w-full"
          >
            View Orders
          </Button>
        </div>
      </div>
    );
  }

  // Return the payment form
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h1 className="text-2xl font-bold text-center mb-6">Complete Payment</h1>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Setting up your payment...</p>
        </div>
      ) : clientSecret ? (
        <>
          <p className="text-center text-gray-600 mb-6">
            Complete your purchase securely with Stripe
          </p>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm />
          </Elements>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-red-500 mb-4">Unable to initialize payment. Please try again later.</p>
          <Button 
            onClick={() => window.location.href = '/orders'}
            variant="outline"
          >
            Return to Orders
          </Button>
        </div>
      )}
    </div>
  );
};