
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye } from "lucide-react";
import { Order } from "@shared/schema";
import { format } from "date-fns";

interface RecentOrdersProps {
  orders: Order[];
  loading?: boolean;
  onViewOrder: (id: string) => void;
}

export default function RecentOrders({ orders, loading = false, onViewOrder }: RecentOrdersProps) {
  const [, navigate] = useLocation();

  const getStatusBadge = (status: string) => {
    let displayStatus = status === 'payment_selection' ? 'ordered' : status.replace('_', ' ');
    const statusClass = `status-badge status-badge-${status.toLowerCase()}`;
    return <span className={statusClass}>{displayStatus}</span>;
  };

  const formatDate = (dateString: Date | string | null) => {
    if (!dateString) return 'Invalid date';
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return format(date, 'MMM d, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getItemsCount = (order: Order) => {
    if (!order.cartItems || !Array.isArray(order.cartItems)) return 0;
    return order.cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  };
  
  const getProductName = (order: Order) => {
    if (!order.cartItems || !Array.isArray(order.cartItems) || order.cartItems.length === 0) {
      return "No products";
    }

    const firstItem = order.cartItems[0];
    if (!firstItem.product) return "Unknown product";

    let productText = `${firstItem.product.name}`;
    if (firstItem.selectedWeight) productText += ` (${firstItem.selectedWeight})`;
    
    if (order.cartItems.length > 1) {
      productText += ` + ${order.cartItems.length - 1} more`;
    }
    
    return productText;
  };

  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
        <Button 
          variant="link" 
          className="text-primary p-0" 
          onClick={() => navigate("/orders")}
        >
          View All
        </Button>
      </CardHeader>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24 hidden sm:block" />
                <Skeleton className="h-6 w-8 hidden sm:block" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr 
                      key={order.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => onViewOrder(String(order.id))}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                        {getProductName(order)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {`${order.firstname || ''} ${order.lastname || ''}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getItemsCount(order)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="block md:hidden">
              <div className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <div 
                    key={order.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => onViewOrder(String(order.id))}
                  >
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-primary">{getProductName(order)}</span>
                      <span className="text-xs">{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        {`${order.firstname || ''} ${order.lastname || ''}`}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Qty: {getItemsCount(order)}</span>
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
