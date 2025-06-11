import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MobileSidebar from "@/components/layout/MobileSidebar";
import StatsCard from "@/components/Dashboard/StatsCard";
import RecentOrders from "@/components/Dashboard/RecentOrders";
import SalesChart from "@/components/Dashboard/SalesChart";
import PopularProducts from "@/components/Dashboard/PopularProducts";
import OrderDetailModal from "@/components/Orders/OrderDetailModal";
import { Order } from "@shared/schema";

export default function DashboardPage() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [, navigate] = useLocation();

  // Fetch dashboard stats
  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch sales data
  const { data: salesData, isLoading: isSalesLoading } = useQuery({
    queryKey: ['/api/dashboard/sales'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch recent orders
  const { data: recentOrdersData, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['/api/orders'],
    select: (data: any) => ({
      ...data,
      data: data.data.slice(0, 5) // Only show first 5 orders
    }),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Fetch popular products
  const { data: popularProductsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ['/api/dashboard/popular-products'],
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Fetch order details when an order is selected - removing onSuccess/onError due to typing issues
  const { data: orderDetail, isLoading: isOrderDetailLoading } = useQuery({
    queryKey: ['/api/orders', selectedOrder?.id],
    enabled: !!selectedOrder?.id,
    staleTime: 1000 * 60 * 1 // 1 minute
  });

  // Handle view order
  const handleViewOrder = (orderId: string) => {
    console.log('Viewing order with ID:', orderId);
    // Find the order in the recent orders data
    if (recentOrdersData?.data) {
      const order = recentOrdersData.data.find((o: any) => String(o.id) === orderId);
      if (order) {
        console.log('Found order in recent orders list:', order);
        // Set selected order
        setSelectedOrder(order);
        // Open the modal
        setIsOrderDetailOpen(true);
      } else {
        console.error('Could not find order with ID:', orderId);
      }
    } else {
      console.error('No recent orders data available');
    }
  };

  // Handle order status update
  const handleUpdateOrderStatus = async (id: string, status: string) => {
    try {
      await apiRequest('PATCH', `/api/orders/${id}`, { status });
      setIsOrderDetailOpen(false);
      // Invalidate queries to refresh data
      navigate('/dashboard');
    } catch (error) {
      console.error('Error updating order status:', error);
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
          title="Dashboard"
        />
        
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <StatsCard
                title="Total Orders"
                value={isStatsLoading ? "Loading..." : (statsData?.data?.totalOrders || 0).toString()}
                trend={{
                  value: "12% from last month",
                  direction: "up"
                }}
                type="orders"
                loading={isStatsLoading}
              />
              
              <StatsCard
                title="Total Revenue"
                value={isStatsLoading ? "Loading..." : `$${(statsData?.data?.totalRevenue || 0).toLocaleString()}`}
                trend={{
                  value: "8% from last month",
                  direction: "up"
                }}
                type="revenue"
                loading={isStatsLoading}
              />
              
              <StatsCard
                title="Active Customers"
                value={isStatsLoading ? "Loading..." : (statsData?.data?.activeCustomers || 0).toString()}
                trend={{
                  value: "5% from last month",
                  direction: "up"
                }}
                type="customers"
                loading={isStatsLoading}
              />
              
              <StatsCard
                title="Total Products"
                value={isStatsLoading ? "Loading..." : (statsData?.data?.totalProducts || 0).toString()}
                trend={{
                  value: `${statsData?.data?.lowStockProducts || 0} low stock items`,
                  direction: (statsData?.data?.lowStockProducts || 0) > 0 ? "down" : "neutral"
                }}
                type="products"
                loading={isStatsLoading}
              />
            </div>
            
            {/* Recent Orders and Sales Chart */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {/* Recent Orders */}
              <div className="md:col-span-2">
                <RecentOrders
                  orders={recentOrdersData?.data || []}
                  loading={isOrdersLoading}
                  onViewOrder={handleViewOrder}
                />
              </div>
              
              {/* Sales Chart */}
              <div>
                <SalesChart
                  data={salesData?.data?.dailySales || []}
                  weeklyTotal={salesData?.data?.weeklySales || 0}
                  avgOrderValue={salesData?.data?.avgOrderValue || 0}
                  loading={isSalesLoading}
                />
              </div>
            </div>
            
            {/* Popular Products */}
            <PopularProducts
              products={popularProductsData?.data || []}
              loading={isProductsLoading}
            />
          </div>
        </main>
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        isOpen={isOrderDetailOpen}
        onClose={() => {
          setIsOrderDetailOpen(false);
          // Wait a bit before clearing the selected order to avoid visual flicker
          setTimeout(() => setSelectedOrder(null), 300);
        }}
        order={selectedOrder}
        loading={false}
        onUpdateStatus={handleUpdateOrderStatus}
      />
    </div>
  );
}
