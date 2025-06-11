import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Order } from "@shared/schema";

interface PayWithStripeButtonProps {
  order: Order;
  disabled?: boolean;
  className?: string;
}

export default function PayWithStripeButton({ 
  order, 
  disabled = false,
  className = "" 
}: PayWithStripeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handlePayment = async () => {
    if (!order.total) {
      toast({
        title: "Error",
        description: "Order total is not available",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      // Create a payment intent with the order amount
      const response = await apiRequest("POST", "/api/create-payment-intent", {
        amount: parseFloat(order.total),
        orderId: order.id,
        customerEmail: order.email,
        // Include additional metadata that might be useful
        metadata: {
          orderId: order.id,
          customerName: `${order.firstname || ''} ${order.lastname || ''}`.trim(),
          customerEmail: order.email
        }
      });

      const data = await response.json();
      
      if (data.success && data.clientSecret) {
        // Store the payment intent client secret in sessionStorage
        sessionStorage.setItem('stripeOrderId', order.id.toString());
        
        // Navigate to the checkout page
        navigate('/checkout');
      } else {
        throw new Error(data.message || "Failed to initialize payment");
      }
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

  return (
    <Button 
      onClick={handlePayment} 
      disabled={disabled || isLoading}
      className={`${className}`}
      variant="default"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Setting up payment...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          Pay with Stripe
        </>
      )}
    </Button>
  );
}