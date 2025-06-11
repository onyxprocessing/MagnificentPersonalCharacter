import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Edit, Search, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Order } from "@shared/schema";
import { format } from "date-fns";

interface OrderListProps {
  orders: Order[];
  loading?: boolean;
  page: number;
  limit: number;
  totalOrders: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onStatusFilter: (status: string) => void;
  onSearch: (query: string) => void;
  onViewOrder: (orderId: string) => void;
  onEditOrder: (orderId: string) => void;
  onManageFulfillment?: (orderId: string) => void;
}

export default function OrderList({
  orders,
  loading = false,
  page,
  limit,
  totalOrders,
  onPageChange,
  onLimitChange,
  onStatusFilter,
  onSearch,
  onViewOrder,
  onEditOrder,
  onManageFulfillment
}: OrderListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // State to track payment status for each order
  const [paymentStatus, setPaymentStatus] = useState<Record<string, boolean>>({});

  // Function to check payment status for an order
  const checkPaymentStatus = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/payment-status`);
      const data = await response.json();
      
      if (data.success) {
        setPaymentStatus(prev => ({
          ...prev,
          [orderId]: data.data.paymentVerified
        }));
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  // Check payment status for all orders when they load
  useEffect(() => {
    if (orders.length > 0) {
      orders.forEach(order => {
        if (typeof order.id === 'string') {
          checkPaymentStatus(order.id);
        }
      });
    }
  }, [orders]);

  const getStatusBadge = (status: string, order: Order) => {
    // Use "ordered" label instead of "payment_selection"
    let displayStatus = status === 'payment_selection' ? 'ordered' : status.replace('_', ' ');
    const statusClass = `status-badge status-badge-${status.toLowerCase()}`;
    
    // Check payment status from our state
    const isPaid = order && paymentStatus[order.id];
    
    return (
      <div className="flex items-center gap-2">
        <span className={statusClass}>{displayStatus}</span>
        {status === 'payment_selection' && (
          <span className={`status-badge ${isPaid ? 'status-badge-paid' : 'status-badge-unpaid'}`}>
            {isPaid ? 'PAID' : 'UNPAID'}
          </span>
        )}
      </div>
    );
  };

  const getFulfillmentBadge = (order: Order) => {
    // Check if order has partial fulfillment field
    const isPartialFulfillment = order.partial;
    const isCompleted = order.completed;
    
    if (isCompleted) {
      return <Badge className="bg-green-500 text-white">Fulfilled</Badge>;
    } else if (isPartialFulfillment) {
      return <Badge className="bg-yellow-500 text-white">Partially Fulfilled</Badge>;
    } else {
      return <Badge variant="outline" className="bg-gray-200">Unfulfilled</Badge>;
    }
  };

  const formatDate = (dateString: Date | string) => {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return format(date, 'MMM d, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
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

  const totalPages = Math.ceil(totalOrders / limit);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalOrders);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <CardTitle className="text-xl font-semibold">Order Management</CardTitle>
            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
              <div className="flex space-x-2">
                <Select onValueChange={onStatusFilter} defaultValue="payment_selection">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payment_selection">Ordered</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Select onValueChange={(value) => onLimitChange(parseInt(value))} defaultValue={limit.toString()}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Per page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="20">20 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <form onSubmit={handleSearchSubmit}>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search orders..."
                    className="pl-10 pr-20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Button type="submit" size="sm" className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8">
                    Search
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Fulfillment</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                      {`${order.firstname || ''} ${order.lastname || ''}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.address ? 
                        `${order.address}, ${order.city || ''}, ${order.state || ''}` : 
                        'Not provided'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status, order)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getFulfillmentBadge(order)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.createdAt ? formatDate(order.createdAt) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getProductName(order)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="text-xs text-gray-400">
                        Click row to view
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination */}
        <CardFooter className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium">{startItem}</span> to{" "}
            <span className="font-medium">{endItem}</span> of{" "}
            <span className="font-medium">{totalOrders}</span> results
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            
            {/* Show first page */}
            {page > 3 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(1)}
                >
                  1
                </Button>
                {page > 4 && <span className="px-2">...</span>}
              </>
            )}
            
            {/* Show pages around current page */}
            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              
              if (pageNum >= 1 && pageNum <= totalPages) {
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              }
              return null;
            })}
            
            {/* Show last page */}
            {page < totalPages - 2 && totalPages > 5 && (
              <>
                {page < totalPages - 3 && <span className="px-2">...</span>}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(totalPages)}
                >
                  {totalPages}
                </Button>
              </>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
