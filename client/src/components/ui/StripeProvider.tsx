import { ReactNode, useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

interface StripeProviderProps {
  children: ReactNode;
}

export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function StripeProvider({ children }: StripeProviderProps) {
  const [stripeLoaded, setStripeLoaded] = useState(false);
  
  useEffect(() => {
    if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
      console.warn('Missing Stripe public key (VITE_STRIPE_PUBLIC_KEY)');
      return;
    }
    
    // Init Stripe
    stripePromise.then(() => {
      setStripeLoaded(true);
      console.log('Stripe initialized successfully');
    }).catch(err => {
      console.error('Failed to initialize Stripe:', err);
    });
  }, []);
  
  return <>{children}</>;
}