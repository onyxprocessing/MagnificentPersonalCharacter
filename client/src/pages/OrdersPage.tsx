import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MobileSidebar from "@/components/layout/MobileSidebar";
import OrderList from "@/components/Orders/OrderList";
import OrderDetailModal from "@/components/Orders/OrderDetailModal";
import OrderFulfillmentModal from "@/components/Orders/OrderFulfillmentModal";
import { useOrders } from "@/hooks/use-orders";
import { Order } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function OrdersPage() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  // Default to showing only payment_selection orders
  const [statusFilter, setStatusFilter] = useState("payment_selection");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [isFulfillmentModalOpen, setIsFulfillmentModalOpen] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Fetch orders with pagination and filters - always filter by payment_selection
  const { 
    orders, 
    totalOrders, 
    isLoading: isOrdersLoading,
    refetch: refetchOrders
  } = useOrders({
    page,
    limit,
    status: "payment_selection", // Force payment_selection filter
    search: searchQuery
  });

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Handle page size change
  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset page when limit changes
  };

  // Handle status filter change
  const handleStatusFilter = (status: string) => {
    // Only allow payment_selection or completed status
    setStatusFilter(status);
    setPage(1); // Reset page when filter changes
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1); // Reset page when search changes
  };

  // Handle view order
  const handleViewOrder = (orderId: string) => {
    // Use toString() to ensure we compare string IDs correctly
    const order = orders.find(o => String(o.id) === String(orderId)) || null;
    setSelectedOrder(order);
    setIsOrderDetailOpen(true);
  };

  // Handle edit order (for now, just view the order)
  const handleEditOrder = (orderId: string) => {
    handleViewOrder(orderId);
  };

  // Handle order status update
  const handleUpdateOrderStatus = async (id: string, status: string) => {
    try {
      await apiRequest('PATCH', `/api/orders/${id}`, { status });
      
      toast({
        title: "Order Updated",
        description: `Order status changed to ${status.replace('_', ' ')}`
      });
      
      // Close the modal
      setIsOrderDetailOpen(false);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Update Failed",
        description: "There was an error updating the order status.",
        variant: "destructive"
      });
    }
  };

  // Handle fulfillment management
  const handleManageFulfillment = (orderId: string) => {
    const order = orders.find(o => String(o.id) === String(orderId)) || null;
    setSelectedOrder(order);
    setIsFulfillmentModalOpen(true);
  };

  // Handle fulfillment update
  const handleUpdateFulfillment = async (orderId: string, updates: { completed?: boolean; partial?: boolean }) => {
    try {
      await apiRequest('PATCH', `/api/orders/${orderId}`, updates);
      
      toast({
        title: "Fulfillment Updated",
        description: "Order fulfillment status has been updated successfully"
      });
      
      // Close the modal
      setIsFulfillmentModalOpen(false);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    } catch (error) {
      console.error('Error updating fulfillment:', error);
      toast({
        title: "Update Failed",
        description: "There was an error updating the fulfillment status.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar for desktop */}
      <Sidebar />
      
      {/* Mobile Sidebar */}
      <MobileSidebar 
        isOpen={isMobileSidebarOpen} 
        onClose={() => setIsMobileSidebarOpen(false)} 
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onToggleMobileMenu={() => setIsMobileSidebarOpen(true)}
          title="Orders"
        />
        
        {/* Refresh Button */}
        <div className="px-4 md:px-6 py-2 border-b">
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
              refetchOrders();
              toast({
                title: "Refreshing Orders",
                description: "Order list updated with latest payment status and sorting"
              });
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Refresh Order List
          </button>
        </div>
        
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          <OrderList
            orders={orders}
            loading={isOrdersLoading}
            page={page}
            limit={limit}
            totalOrders={totalOrders}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            onStatusFilter={handleStatusFilter}
            onSearch={handleSearch}
            onViewOrder={handleViewOrder}
            onEditOrder={handleEditOrder}
            onManageFulfillment={handleManageFulfillment}
          />
        </main>
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        isOpen={isOrderDetailOpen}
        onClose={() => setIsOrderDetailOpen(false)}
        order={selectedOrder}
        loading={false}
        onUpdateStatus={handleUpdateOrderStatus}
      />

      {/* Order Fulfillment Modal */}
      <OrderFulfillmentModal
        isOpen={isFulfillmentModalOpen}
        onClose={() => setIsFulfillmentModalOpen(false)}
        order={selectedOrder}
        onUpdateFulfillment={handleUpdateFulfillment}
      />
    </div>
  );
}
