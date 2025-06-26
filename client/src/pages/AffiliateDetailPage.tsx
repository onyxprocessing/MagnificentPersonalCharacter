import { useParams } from "wouter";
import { ArrowLeft, DollarSign, Users, ShoppingCart, Percent, CalendarIcon, Download } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAffiliates, useAffiliateOrders, useAffiliateStats } from "@/hooks/use-affiliates";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths } from "date-fns";
import { useState } from "react";
import React from "react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Sidebar from '@/components/layout/Sidebar';
import MobileSidebar from '@/components/layout/MobileSidebar';
import Header from '@/components/layout/Header';
import { useIsMobile } from '@/hooks/use-mobile';

export default function AffiliateDetailPage() {
  const { code } = useParams();
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const { data: affiliatesData } = useAffiliates({ limit: 100 });
  const { data: ordersData } = useAffiliateOrders({ affiliateCode: code || '', limit: 200 });
  const { data: statsData } = useAffiliateStats(code || '');

  // Function to get date range based on filter
  const getDateRange = (filter: string) => {
    const now = new Date();
    switch (filter) {
      case 'today':
        return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end: now };
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'year':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'last7':
        return { start: subDays(now, 7), end: now };
      case 'last30':
        return { start: subDays(now, 30), end: now };
      case 'last90':
        return { start: subDays(now, 90), end: now };
      case 'january':
        return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 0, 31, 23, 59, 59) };
      case 'february':
        return { start: new Date(now.getFullYear(), 1, 1), end: new Date(now.getFullYear(), 1, 28, 23, 59, 59) };
      case 'march':
        return { start: new Date(now.getFullYear(), 2, 1), end: new Date(now.getFullYear(), 2, 31, 23, 59, 59) };
      case 'april':
        return { start: new Date(now.getFullYear(), 3, 1), end: new Date(now.getFullYear(), 3, 30, 23, 59, 59) };
      case 'may':
        return { start: new Date(now.getFullYear(), 4, 1), end: new Date(now.getFullYear(), 4, 31, 23, 59, 59) };
      case 'june':
        return { start: new Date(now.getFullYear(), 5, 1), end: new Date(now.getFullYear(), 5, 30, 23, 59, 59) };
      case 'july':
        return { start: new Date(now.getFullYear(), 6, 1), end: new Date(now.getFullYear(), 6, 31, 23, 59, 59) };
      case 'august':
        return { start: new Date(now.getFullYear(), 7, 1), end: new Date(now.getFullYear(), 7, 31, 23, 59, 59) };
      case 'september':
        return { start: new Date(now.getFullYear(), 8, 1), end: new Date(now.getFullYear(), 8, 30, 23, 59, 59) };
      case 'october':
        return { start: new Date(now.getFullYear(), 9, 1), end: new Date(now.getFullYear(), 9, 31, 23, 59, 59) };
      case 'november':
        return { start: new Date(now.getFullYear(), 10, 1), end: new Date(now.getFullYear(), 10, 30, 23, 59, 59) };
      case 'december':
        return { start: new Date(now.getFullYear(), 11, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59) };
      default:
        return null;
    }
  };

  // Filter orders based on date range
  const filterOrdersByDate = (orders: any[]) => {
    if (dateFilter === 'all') return orders;

    const dateRange = getDateRange(dateFilter);
    if (!dateRange) return orders;

    return orders.filter((order: any) => {
      const orderDate = new Date(order.fields.createdat);
      return orderDate >= dateRange.start && orderDate <= dateRange.end;
    });
  };

  // Find the specific affiliate
  const affiliate = affiliatesData?.data?.find((a: any) => a.fields.Code === code);


  if (!affiliate) {
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
            title="Affiliate Details"
          />

          <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
            <div className="flex items-center gap-4 mb-6">
              <Link href="/affiliates">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Affiliates
                </Button>
              </Link>
            </div>
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">Affiliate Not Found</h3>
              <p className="text-muted-foreground">The affiliate with code "{code}" could not be found.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const stats = statsData?.data || { totalOrders: 0, totalCommission: 0, totalSales: 0 };
  const allOrders = ordersData?.data || [];
  const orders = filterOrdersByDate(allOrders);

  // Calculate commission based on 85% profit margin of items total (excluding shipping)
  const calculateOrderCommission = (order: any) => {
    if (!order.fields.cartitems) return 0;

    const cartItems = JSON.parse(order.fields.cartitems);
    let itemsTotal = 0;

    // Calculate total items cost
    cartItems.forEach((item: any) => {
      const itemPrice = parseFloat(item.product?.price || '0') * item.quantity;
      itemsTotal += itemPrice;
    });

    // Apply affiliate discount first
    const affiliateDiscount = parseFloat(affiliate.fields.discount || '0');
    const discountAmount = (itemsTotal * affiliateDiscount) / 100;
    const subtotalAfterDiscount = itemsTotal - discountAmount;

    // Apply 85% profit margin to get commission base (company keeps 15% for costs)
    const profitBase = subtotalAfterDiscount * 0.85;

    // Calculate affiliate commission from the profit
    return profitBase * (parseFloat(affiliate.fields.share || '0') / 100);
  };

  // Calculate filtered stats
  const filteredStats = {
    totalOrders: orders.length,
    totalSales: orders.reduce((sum: number, order: any) => {
      const total = parseFloat(order.fields.total || '0');
      return sum + (isNaN(total) ? 0 : total);
    }, 0),
    totalCommission: orders.reduce((sum: number, order: any) => {
      const commission = calculateOrderCommission(order);
      return sum + (isNaN(commission) ? 0 : commission);
    }, 0)
  };

  // Download PDF report function
  const downloadReport = () => {
    if (!affiliate || orders.length === 0) return;

    const doc = new jsPDF();

    // Header - Company Logo and Info
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185); // Blue color
    doc.text('TrueAminos', 20, 25);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0); // Black
    doc.text('Affiliate Commission Statement', 20, 35);

    // Statement Period
    const periodLabel = dateFilter === 'all' ? 'All Time' : 
                       dateFilter === 'today' ? 'Today' :
                       dateFilter === 'last7' ? 'Last 7 Days' :
                       dateFilter === 'last30' ? 'Last 30 Days' :
                       dateFilter === 'last90' ? 'Last 90 Days' :
                       dateFilter === 'week' ? 'This Week' :
                       dateFilter === 'month' ? 'This Month' :
                       dateFilter === 'year' ? 'This Year' : 
                       dateFilter.charAt(0).toUpperCase() + dateFilter.slice(1);

    doc.text(`Statement Period: ${periodLabel}`, 20, 45);
    doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy')}`, 20, 55);

    // Affiliate Information Box
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, 65, 170, 35);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Affiliate Information', 25, 75);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${affiliate.fields['First Name']} ${affiliate.fields['Last Name']}`, 25, 85);
    doc.text(`Code: ${affiliate.fields.Code}`, 25, 92);
    doc.text(`Email: ${affiliate.fields.Email}`, 100, 85);
    doc.text(`Commission Rate: ${affiliate.fields.share || 'N/A'}%`, 100, 92);

    // Summary Box
    doc.rect(20, 110, 170, 25);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 25, 120);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Orders: ${filteredStats.totalOrders}`, 25, 128);
    doc.text(`Total Sales: $${filteredStats.totalSales.toFixed(2)}`, 75, 128);
    doc.text(`Total Commission: $${filteredStats.totalCommission.toFixed(2)}`, 130, 128);

    // Detailed Orders Section
    let currentY = 145;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Recent Orders', 20, currentY);
    currentY += 15;

    orders.forEach((order: any, index: number) => {
      const cartItems = order.fields.cartitems ? JSON.parse(order.fields.cartitems) : [];
      const itemsTotal = cartItems.reduce((sum: number, item: any) => {
        const itemPrice = parseFloat(item.product?.price || '0') * item.quantity;
        return sum + itemPrice;
      }, 0);

      const affiliateDiscount = parseFloat(affiliate.fields.discount || '0');
      const discountAmount = (itemsTotal * affiliateDiscount) / 100;
      const subtotalAfterDiscount = itemsTotal - discountAmount;
      const availableForCommission = subtotalAfterDiscount * 0.85;
      const shippingCost = 9.99;
      const calculatedTotal = subtotalAfterDiscount + shippingCost;
      const checkoutTotal = parseFloat(order.fields.total || '0');
      const commission = calculateOrderCommission(order);

      // Estimate space needed for this order
      const estimatedHeight = 45 + (cartItems.length * 5) + 45; // Header + items + breakdown

      if (currentY + estimatedHeight > 270) {
        doc.addPage();
        currentY = 20;
      }

      // Order Header Box
      doc.setFillColor(248, 249, 250);
      doc.setDrawColor(218, 220, 224);
      doc.setLineWidth(0.5);
      doc.rect(20, currentY - 3, 170, 18, 'FD');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 37, 41);
      doc.text(`${order.fields.firstname} ${order.fields.lastname}`, 25, currentY + 3);

      // Status text
      const statusText = order.fields.status === 'payment_selection' ? 'Ordered' : order.fields.status;
      doc.setTextColor(33, 37, 41);
      doc.setFontSize(9);
      doc.text(statusText, 165, currentY + 3, { align: 'right' });

      doc.setTextColor(108, 117, 125);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(order.fields.email, 25, currentY + 8);
      doc.text(format(new Date(order.fields.createdat), 'MMM d, yyyy h:mm a'), 25, currentY + 13);

      currentY += 22;

      // Order Items Box
      const itemsBoxHeight = (cartItems.length * 4) + 8;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(218, 220, 224);
      doc.setLineWidth(0.5);
      doc.rect(20, currentY - 2, 170, itemsBoxHeight, 'FD');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 37, 41);
      doc.text('Order Items:', 25, currentY + 3);
      currentY += 8;

      cartItems.forEach((item: any) => {
        const itemPrice = parseFloat(item.product?.price || '0') * item.quantity;
        const itemCost = itemPrice * 0.15;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(73, 80, 87);
        doc.text(`${item.product?.name || 'Unknown'} - ${item.selectedWeight} (Qty: ${item.quantity})`, 30, currentY);
        doc.setTextColor(33, 37, 41);
        doc.text(`$${itemPrice.toFixed(2)}`, 125, currentY, { align: 'right' });
        doc.setTextColor(134, 142, 150);
        doc.text(`Cost: $${itemCost.toFixed(2)}`, 175, currentY, { align: 'right' });
        currentY += 4;
      });

      currentY += 5;

      // Financial Breakdown Box
      const breakdownLines = 7 + (affiliateDiscount > 0 ? 1 : 0) + (Math.abs(checkoutTotal - calculatedTotal) > 0.01 ? 1 : 0);
      const breakdownBoxHeight = (breakdownLines * 3) + 8;
      doc.setFillColor(252, 253, 254);
      doc.setDrawColor(218, 220, 224);
      doc.setLineWidth(0.5);
      doc.rect(20, currentY - 2, 170, breakdownBoxHeight, 'FD');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(73, 80, 87);
      currentY += 2;

      doc.text('Items Total:', 30, currentY);
      doc.setTextColor(33, 37, 41);
      doc.text(`$${itemsTotal.toFixed(2)}`, 175, currentY, { align: 'right' });
      currentY += 3;

      doc.setTextColor(73, 80, 87);
      doc.text('Total Product Cost (15%):', 30, currentY);
      doc.setTextColor(220, 53, 69);
      doc.text(`$${(itemsTotal * 0.15).toFixed(2)}`, 175, currentY, { align: 'right' });
      currentY += 3;

      if (affiliateDiscount > 0) {
        doc.setTextColor(73, 80, 87);
        doc.text(`Affiliate Discount (${affiliateDiscount}%):`, 30, currentY);
        doc.setTextColor(40, 167, 69);
        doc.text(`-$${discountAmount.toFixed(2)}`, 175, currentY, { align: 'right' });
        currentY += 3;
      }

      doc.setTextColor(73, 80, 87);
      doc.text('Subtotal:', 30, currentY);
      doc.setTextColor(33, 37, 41);
      doc.text(`$${subtotalAfterDiscount.toFixed(2)}`, 175, currentY, { align: 'right' });
      currentY += 3;

      doc.setTextColor(73, 80, 87);
      doc.text('Available for Commission (85%):', 30, currentY);
      doc.setTextColor(13, 110, 253);
      doc.text(`$${availableForCommission.toFixed(2)}`, 175, currentY, { align: 'right' });
      currentY += 3;

      doc.setTextColor(73, 80, 87);
      doc.text('Shipping:', 30, currentY);
      doc.setTextColor(33, 37, 41);
      doc.text(`$${shippingCost.toFixed(2)}`, 175, currentY, { align: 'right' });
      currentY += 3;

      // Separator line
      doc.setDrawColor(218, 220, 224);
      doc.line(30, currentY + 1, 175, currentY + 1);
      currentY += 3;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 37, 41);
      doc.text('Calculated Total:', 30, currentY);
      doc.text(`$${calculatedTotal.toFixed(2)}`, 175, currentY, { align: 'right' });
      currentY += 3;

      if (Math.abs(checkoutTotal - calculatedTotal) > 0.01) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(255, 193, 7);
        doc.text('Checkout Total:', 30, currentY);
        doc.text(`$${checkoutTotal.toFixed(2)}`, 175, currentY, { align: 'right' });
        currentY += 3;
      }

      // Commission earned
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 167, 69);
      doc.text('Commission Earned:', 30, currentY);
      doc.text(`$${commission.toFixed(2)}`, 175, currentY, { align: 'right' });

      currentY += 15;
    });

    // Footer
    const finalY = currentY + 20;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Commission calculated at 85% profit margin after affiliate discount', 20, finalY);
    doc.text('Only completed orders (payment_selection status) are included in commission calculations', 20, finalY + 8);

    // Page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, 180, doc.internal.pageSize.height - 10);
    }

    // Save the PDF
    const filename = `${affiliate.fields.Code}_Commission_Statement_${periodLabel.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
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
          title="Affiliate Details"
        />

        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link href="/affiliates">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Affiliates
              </Button>
            </Link>
          </div>

          {/* Affiliate Info */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Affiliate Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-lg font-semibold">
                      {affiliate.fields['First Name']} {affiliate.fields['Last Name']}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-lg break-words">{affiliate.fields.Email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Affiliate Code</label>
                    <Badge variant="outline" className="text-lg font-mono">
                      {affiliate.fields.Code}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Commission Rate</label>
                    <div className="flex items-center gap-1">
                      <Percent className="h-4 w-4" />
                      <span className="text-lg font-semibold">
                        {affiliate.fields.share || 'N/A'}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Customer Discount</label>
                    <div className="flex items-center gap-1">
                      <Percent className="h-4 w-4" />
                      <span className="text-lg font-semibold">
                        {affiliate.fields.discount || 'N/A'}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{filteredStats.totalOrders}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${filteredStats.totalSales.toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      ${filteredStats.totalSales.toFixed(2)} × {affiliate.fields.share || '0'}%
                    </div>
                    <div className="text-2xl font-bold text-green-600">${filteredStats.totalCommission.toFixed(2)}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Top Performers Leaderboard */}


      {/* Recent Orders */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>
                    Orders placed using affiliate code "{code}"
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by date" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="last7">Last 7 Days</SelectItem>
                        <SelectItem value="last30">Last 30 Days</SelectItem>
                        <SelectItem value="last90">Last 90 Days</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                        <SelectItem value="january">January</SelectItem>
                        <SelectItem value="february">February</SelectItem>
                        <SelectItem value="march">March</SelectItem>
                        <SelectItem value="april">April</SelectItem>
                        <SelectItem value="may">May</SelectItem>
                        <SelectItem value="june">June</SelectItem>
                        <SelectItem value="july">July</SelectItem>
                        <SelectItem value="august">August</SelectItem>
                        <SelectItem value="september">September</SelectItem>
                        <SelectItem value="october">October</SelectItem>
                        <SelectItem value="november">November</SelectItem>
                        <SelectItem value="december">December</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={downloadReport}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 w-full sm:w-auto"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Download PDF Statement</span>
                    <span className="sm:hidden">Download PDF</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order: any) => (
                    <div key={order.id} className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 border rounded-lg space-y-4 lg:space-y-0">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {order.fields.firstname} {order.fields.lastname}
                          </span>
                          <Badge variant="outline">
                            {order.fields.status === 'payment_selection' ? 'Ordered' : order.fields.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground break-words">{order.fields.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.fields.createdat), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>

                      <div className="flex-1 lg:px-4">
                        <div className="text-sm">
                          <p className="font-medium text-muted-foreground mb-1">Order Items:</p>
                          <div className="space-y-1">
                            {(() => {
                              const cartItems = order.fields.cartitems ? JSON.parse(order.fields.cartitems) : [];
                              const itemsTotal = cartItems.reduce((sum: number, item: any) => {
                                const itemPrice = parseFloat(item.product?.price || '0') * item.quantity;
                                return sum + itemPrice;
                              }, 0);
                              const shippingCost = 9.99;

                              // Calculate affiliate discount
                              const affiliateDiscount = parseFloat(affiliate.fields.discount || '0');
                              const discountAmount = (itemsTotal * affiliateDiscount) / 100;
                              const subtotalAfterDiscount = itemsTotal - discountAmount;
                              const calculatedTotal = subtotalAfterDiscount + shippingCost;

                              const orderTotal = parseFloat(order.fields.total || '0');

                              return (
                                <>
                                  {cartItems.map((item: any, index: number) => (
                                    <div key={index} className="text-sm flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-1 sm:space-y-0">
                                      <div className="flex-1">
                                        <span className="font-medium">{item.product?.name || 'Unknown Product'}</span>
                                        {item.selectedWeight && (
                                          <span className="text-muted-foreground"> - {item.selectedWeight}</span>
                                        )}
                                        <span className="text-muted-foreground"> (Qty: {item.quantity})</span>
                                      </div>
                                      <div className="text-left sm:text-right">
                                        <div className="font-medium">${(parseFloat(item.product?.price || '0') * item.quantity).toFixed(2)}</div>
                                        <div className="text-xs text-red-600">
                                          Cost: ${(parseFloat(item.product?.price || '0') * item.quantity * 0.15).toFixed(2)}
                                        </div>
                                        {item.product?.type && (
                                          <div className="text-xs text-muted-foreground">
                                            Type: {item.product.type}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}

                                  {/* Order totals breakdown */}
                                  <div className="mt-2 pt-2 border-t border-gray-200 text-xs space-y-1">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Items Total:</span>
                                      <span>${itemsTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-red-600">
                                      <span>Total Product Cost (15%):</span>
                                      <span>${(itemsTotal * 0.15).toFixed(2)}</span>
                                    </div>
                                    {affiliateDiscount > 0 && (
                                      <div className="flex justify-between text-green-600">
                                        <span>Affiliate Discount ({affiliateDiscount}%):</span>
                                        <span>-${discountAmount.toFixed(2)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Subtotal:</span>
                                      <span>${subtotalAfterDiscount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-blue-600">
                                      <span>Available for Commission (85%):</span>
                                      <span>${(subtotalAfterDiscount * 0.85).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Shipping:</span>
                                      <span>${shippingCost.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between font-medium">
                                      <span>Calculated Total:</span>
                                      <span>${calculatedTotal.toFixed(2)}</span>
                                    </div>
                                    {Math.abs(orderTotal - calculatedTotal) > 0.01 && (
                                      <div className="flex justify-between text-orange-600">
                                        <span>Checkout Total:</span>
                                        <span>${orderTotal.toFixed(2)}</span>
                                      </div>
                                    )}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className="text-left lg:text-right border-t lg:border-t-0 pt-2 lg:pt-0">
                        <div className="font-semibold">${parseFloat(order.fields.total || '0').toFixed(2)}</div>
                        <div className="text-sm text-green-600">
                          Commission: ${calculateOrderCommission(order).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
                  <p className="text-muted-foreground">
                    No orders have been placed using affiliate code "{code}" yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}