import { useState, useMemo } from 'react';
import { useAffiliates, useAffiliateOrders, useAffiliateStats } from '@/hooks/use-affiliates';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, Users, DollarSign, ShoppingCart, Eye, Plus, Menu } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import Sidebar from '@/components/layout/Sidebar';
import MobileSidebar from '@/components/layout/MobileSidebar';
import Header from '@/components/layout/Header';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'wouter';

interface AffiliateDetailsModalProps {
  affiliate: {
    id: string;
    fields: {
      'First Name': string;
      'Last Name': string;
      Email: string;
      Code: string;
    };
  };
}

interface AddAffiliateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function AddAffiliateModal({ open, onOpenChange, onSuccess }: AddAffiliateModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    code: '',
    share: '',
    discount: '',
    payoutMethod: '',
    password: 'Password!',
    addedby: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/affiliates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          'First Name': formData.firstName,
          'Last Name': formData.lastName,
          Email: formData.email,
          Phone: formData.phone,
          Code: formData.code,
          share: parseFloat(formData.share) || 0,
          discount: parseFloat(formData.discount) || 0,
          'Payout Method': formData.payoutMethod,
          password: formData.password,
          addedby: formData.addedby,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create affiliate');
      }

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        code: '',
        share: '',
        discount: '',
        payoutMethod: '',
        password: 'Password!',
        addedby: '',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating affiliate:', error);
      alert('Failed to create affiliate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Affiliate</DialogTitle>
          <DialogDescription>
            Create a new affiliate account with commission and discount settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Affiliate Code</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="share">Commission Rate (%)</Label>
              <Input
                id="share"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.share}
                onChange={(e) => handleChange('share', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Discount Rate (%)</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.discount}
                onChange={(e) => handleChange('discount', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payoutMethod">Payout Method</Label>
            <Select value={formData.payoutMethod} onValueChange={(value) => handleChange('payoutMethod', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select payout method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="crypto">Cryptocurrency</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="addedby">Added By (Staff Member)</Label>
            <Input
              id="addedby"
              value={formData.addedby}
              onChange={(e) => handleChange('addedby', e.target.value)}
              placeholder="Enter staff member name"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Affiliate'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AffiliateDetailsModal({ affiliate }: AffiliateDetailsModalProps) {
  const [ordersPage, setOrdersPage] = useState(1);
  const { data: ordersData, isLoading: ordersLoading } = useAffiliateOrders({
    affiliateCode: affiliate.fields.Code,
    page: ordersPage,
    limit: 10,
  });
  const { data: statsData, isLoading: statsLoading } = useAffiliateStats(affiliate.fields.Code);

  const stats = statsData?.data;
  const orders = ordersData?.data || [];
  const ordersPagination = ordersData?.pagination;

  return (
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {affiliate.fields['First Name']} {affiliate.fields['Last Name']}
        </DialogTitle>
        <DialogDescription>
          Affiliate Code: <strong>{affiliate.fields.Code}</strong> | Email: {affiliate.fields.Email}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.totalOrders || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : formatCurrency(stats?.totalSales || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commission Earned</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : formatCurrency(stats?.totalCommission || 0)}
              </div>
              <p className="text-xs text-muted-foreground">10% commission rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Affiliate Orders</h3>
            <div className="flex items-center space-x-2">
              {ordersPagination && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOrdersPage(Math.max(1, ordersPage - 1))}
                    disabled={ordersPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {ordersPage} of {Math.ceil(ordersPagination.total / ordersPagination.limit)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOrdersPage(ordersPage + 1)}
                    disabled={ordersPage >= Math.ceil(ordersPagination.total / ordersPagination.limit)}
                  >
                    Next
                  </Button>
                </>
              )}
            </div>
          </div>

          {ordersLoading ? (
            <div className="text-center py-8">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders found for this affiliate code.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">
                        {order.id.slice(-8)}
                      </TableCell>
                      <TableCell>
                        {order.fields.firstname} {order.fields.lastname}
                      </TableCell>
                      <TableCell>{order.fields.email}</TableCell>
                      <TableCell>
                        {formatCurrency(order.fields.total || order.fields.totalammount || '0')}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.fields.status === 'completed' 
                              ? 'default' 
                              : order.fields.status === 'pending'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {order.fields.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(new Date(order.fields.createdat))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </DialogContent>
  );
}

export default function AffiliatesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [inactivePage, setInactivePage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  

  // Fetch all active affiliates (no pagination)
  const { data: activeData, isLoading: activeLoading, error: activeError, refetch: refetchActive } = useAffiliates({
    page: 1,
    limit: 1000, // Large limit to get all active affiliates
    search,
    status: 'active',
  });

  // Fetch inactive affiliates with pagination
  const { data: inactiveData, isLoading: inactiveLoading, error: inactiveError, refetch: refetchInactive } = useAffiliates({
    page: inactivePage,
    limit: 10,
    search,
    status: 'inactive',
  });

  const activeAffiliates = (activeData?.data || []).sort((a, b) => {
    const nameA = `${a.fields['First Name']} ${a.fields['Last Name']}`.toLowerCase();
    const nameB = `${b.fields['First Name']} ${b.fields['Last Name']}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const inactiveAffiliates = (inactiveData?.data || []).sort((a, b) => {
    const nameA = `${a.fields['First Name']} ${a.fields['Last Name']}`.toLowerCase();
    const nameB = `${b.fields['First Name']} ${b.fields['Last Name']}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });

  

  // Combine active and inactive affiliates for display
  const affiliates = [...activeAffiliates, ...inactiveAffiliates];
  const isLoading = activeLoading || inactiveLoading;
  const error = activeError || inactiveError;
  const inactivePagination = inactiveData?.pagination;
  
  // Calculate total count for stats
  const totalActive = activeData?.pagination?.total || 0;
  const totalInactive = inactiveData?.pagination?.total || 0;
  const totalAffiliates = totalActive + totalInactive;

  const handleSearch = (value: string) => {
    setSearch(value);
    setInactivePage(1); // Reset inactive page when searching
  };

  const handleStatusFilter = (value: string) => {
    setStatus(value === 'all' ? '' : value);
    setInactivePage(1); // Reset inactive page when filtering
  };

  const handleAffiliateCreated = () => {
    refetchActive();
    refetchInactive();
  };

  if (error) {
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
            title="Affiliates"
          />
          
          <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
            <Card className="w-full max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="text-red-600">Error Loading Affiliates</CardTitle>
                <CardDescription>
                  Unable to load affiliate data. Please check your connection and try again.
                </CardDescription>
              </CardHeader>
            </Card>
          </main>
        </div>
      </div>
    );
  }

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
          title="Affiliates"
        />
        
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          {/* Search and Filter Controls */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Affiliates</h1>
                <p className="text-muted-foreground">Manage affiliate accounts and track their performance</p>
              </div>
              <Button 
                onClick={() => setShowAddModal(true)} 
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Affiliate
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by name, email, or code..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={status || 'all'} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

        {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Affiliates</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAffiliates}</div>
                <p className="text-xs text-muted-foreground">{totalActive} active, {totalInactive} inactive</p>
              </CardContent>
            </Card>
          </div>

          {/* Affiliates Table/Cards */}
          <Card>
            <CardHeader>
              <CardTitle>Affiliate Accounts</CardTitle>
              <CardDescription>
                Search and manage your affiliate partners
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading affiliates...</div>
              ) : affiliates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {search ? 'No affiliates found matching your search.' : 'No affiliates found.'}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mobile Cards View */}
                  <div className="block md:hidden space-y-4">
                    {affiliates.map((affiliate) => (
                      <Card key={affiliate.id} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-sm">
                                {affiliate.fields['First Name']} {affiliate.fields['Last Name']}
                              </p>
                              <p className="text-xs text-muted-foreground">{affiliate.fields.Email}</p>
                            </div>
                            <Badge 
                              variant={affiliate.fields.status === 'Active' ? 'default' : 'secondary'}
                              className={affiliate.fields.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                            >
                              {affiliate.fields.status || 'Inactive'}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground">Code</p>
                              <Badge variant="outline" className="font-mono text-xs">
                                {affiliate.fields.Code}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Joined</p>
                              <p className="text-xs">{formatDate(new Date(affiliate.createdTime))}</p>
                            </div>
                          </div>
                          
                          <Link href={`/affiliates/${affiliate.fields.Code}`}>
                            <Button variant="outline" size="sm" className="w-full">
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Affiliate Code</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Added By</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {affiliates.map((affiliate) => (
                            <TableRow key={affiliate.id}>
                              <TableCell className="font-medium">
                                {affiliate.fields['First Name']} {affiliate.fields['Last Name']}
                              </TableCell>
                              <TableCell>{affiliate.fields.Email}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-mono">
                                  {affiliate.fields.Code}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={affiliate.fields.status === 'Active' ? 'default' : 'secondary'}
                                  className={affiliate.fields.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                                >
                                  {affiliate.fields.status || 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {affiliate.fields.addedby || 'N/A'}
                              </TableCell>
                              <TableCell>
                                {formatDate(new Date(affiliate.createdTime))}
                              </TableCell>
                              <TableCell>
                                <Link href={`/affiliates/${affiliate.fields.Code}`}>
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Pagination - only show if there are inactive affiliates to paginate */}
                  {inactivePagination && inactivePagination.total > inactivePagination.limit && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {totalActive} active affiliates and {((inactivePage - 1) * inactivePagination.limit) + 1} to{' '}
                        {Math.min(inactivePage * inactivePagination.limit, inactivePagination.total)} of{' '}
                        {inactivePagination.total} inactive affiliates
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setInactivePage(Math.max(1, inactivePage - 1))}
                          disabled={inactivePage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {inactivePage} of {Math.ceil(inactivePagination.total / inactivePagination.limit)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setInactivePage(inactivePage + 1)}
                          disabled={inactivePage >= Math.ceil(inactivePagination.total / inactivePagination.limit)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      <AddAffiliateModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={handleAffiliateCreated}
      />
    </div>
  );
}