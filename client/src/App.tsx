import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import OrdersPage from "./pages/OrdersPage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CustomersPage from "./pages/CustomersPage";
import AffiliatesPage from "./pages/AffiliatesPage";
import AffiliateDetailPage from "./pages/AffiliateDetailPage";
import SettingsPage from "./pages/SettingsPage";
import CheckoutPage from "./pages/CheckoutPage";
import NotFound from "@/pages/not-found";
import StripeProvider from "@/components/ui/StripeProvider";

function Router() {
  // Check if we're on the root path or login path
  const path = window.location.pathname;
  
  // If on the root or login path, show login page
  if (path === "/" || path === "/login") {
    return (
      <Switch>
        <Route path="/" component={LoginPage} />
        <Route path="/login" component={LoginPage} />
      </Switch>
    );
  }

  // For all other paths, show the protected routes without authentication check
  return (
    <Switch>
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/products" component={ProductsPage} />
      <Route path="/products/:id" component={ProductDetailPage} />
      <Route path="/customers" component={CustomersPage} />
      <Route path="/affiliates" component={AffiliatesPage} />
      <Route path="/affiliates/:code" component={AffiliateDetailPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StripeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </StripeProvider>
    </QueryClientProvider>
  );
}

export default App;
