import { useState } from 'react';
import { Link } from 'wouter';
import { useCustomers } from '@/hooks/use-customers';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MobileSidebar from "@/components/layout/MobileSidebar";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Mail,
  MapPin,
  Phone,
  Search,
  ShoppingBag,
  User,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function CustomersPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const isMobile = useIsMobile();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const { data, isLoading, error } = useCustomers({ page, limit, search });

  // Safely handle the data with proper fallbacks
  const customers = data?.data || [];
  const pagination = data?.pagination || { page, limit, total: 0 };
  const totalCustomers = pagination.total || 0;
  const totalPages = Math.ceil(totalCustomers / limit);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (value: string) => {
    setLimit(parseInt(value));
    setPage(1);
  };

  const renderPagination = () => {
    const pageNumbers = [];
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, page + 2);

    if (endPage - startPage < 4 && totalPages > 5) {
      if (startPage === 1) {
        endPage = Math.min(5, totalPages);
      } else {
        startPage = Math.max(1, endPage - 4);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => page > 1 && handlePageChange(page - 1)}
              className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>

          {startPage > 1 && (
            <>
              <PaginationItem>
                <PaginationLink onClick={() => handlePageChange(1)}>1</PaginationLink>
              </PaginationItem>
              {startPage > 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
            </>
          )}

          {pageNumbers.map(number => (
            <PaginationItem key={number}>
              <PaginationLink
                onClick={() => handlePageChange(number)}
                isActive={page === number}
              >
                {number}
              </PaginationLink>
            </PaginationItem>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink onClick={() => handlePageChange(totalPages)}>
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}

          <PaginationItem>
            <PaginationNext
              onClick={() => page < totalPages && handlePageChange(page + 1)}
              className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  const renderCustomerDetails = (customer: any) => {
    const fullName = `${customer.firstname} ${customer.lastname}`.trim();
    const displayName = fullName || customer.email || 'Unknown Customer';

    return (
      <div className="space-y-1">
        <div className="font-medium">{displayName}</div>
        {customer.email && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Mail className="mr-1 h-3 w-3" />
            <span>{customer.email}</span>
          </div>
        )}
        {customer.phone && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Phone className="mr-1 h-3 w-3" />
            <span>{customer.phone}</span>
          </div>
        )}
      </div>
    );
  };

  const renderCustomerAddress = (customer: any) => {
    const hasAddress = customer.address || customer.city || customer.state || customer.zip;
    if (!hasAddress) return <span className="text-muted-foreground">No address</span>;

    const addressParts = [];
    if (customer.address) addressParts.push(customer.address);
    if (customer.city) addressParts.push(customer.city);
    if (customer.state) addressParts.push(customer.state);
    if (customer.zip) addressParts.push(customer.zip);

    return (
      <div className="flex items-start text-sm">
        <MapPin className="mr-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <span>{addressParts.join(', ')}</span>
      </div>
    );
  };

  if (error) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              There was an error loading customers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
            <Button 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderCustomerRow = (customer: any) => {
    return (
      <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50">
        <TableCell className="font-medium">
          {renderCustomerDetails(customer)}
        </TableCell>
        <TableCell className="hidden md:table-cell">
          {renderCustomerAddress(customer)}
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          {formatDate(customer.lastOrderDate, { month: 'short', day: 'numeric', year: 'numeric' })}
        </TableCell>
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            <span>{customer.totalOrders}</span>
          </div>
        </TableCell>
        <TableCell className="text-right font-medium">
          {formatCurrency(customer.totalSpent)}
        </TableCell>
      </TableRow>
    );
  };

  const renderSkeletonRow = (index: number) => {
    return (
      <TableRow key={`skeleton-${index}`}>
        <TableCell>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <Skeleton className="h-4 w-40" />
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          <Skeleton className="h-4 w-24" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-6 mx-auto" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-16 ml-auto" />
        </TableCell>
      </TableRow>
    );
  };

  const renderMobileCustomerCard = (customer: any) => {
    return (
      <Card key={customer.id} className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {`${customer.firstname} ${customer.lastname}`.trim() || customer.email || 'Unknown Customer'}
          </CardTitle>
          {customer.email && (
            <CardDescription>
              <div className="flex items-center">
                <Mail className="mr-1 h-3 w-3" />
                <span>{customer.email}</span>
              </div>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          <div className="space-y-2">
            {customer.phone && (
              <div className="flex items-center text-sm">
                <Phone className="mr-1 h-3 w-3" />
                <span>{customer.phone}</span>
              </div>
            )}
            {renderCustomerAddress(customer)}
            <div className="flex justify-between pt-2 border-t">
              <div>
                <div className="text-sm text-muted-foreground">Last Order</div>
                <div>{formatDate(customer.lastOrderDate, { month: 'short', day: 'numeric' })}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Orders</div>
                <div className="text-center">{customer.totalOrders}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Spent</div>
                <div className="font-medium">{formatCurrency(customer.totalSpent)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMobileSkeletonCard = (index: number) => {
    return (
      <Card key={`mobile-skeleton-${index}`} className="mb-4">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-40" />
            <div className="flex justify-between pt-2 mt-2 border-t">
              <div>
                <Skeleton className="h-3 w-16 mb-1" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div>
                <Skeleton className="h-3 w-12 mb-1" />
                <Skeleton className="h-4 w-6 mx-auto" />
              </div>
              <div>
                <Skeleton className="h-3 w-16 mb-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
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
          title="Customers"
        />

        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
                <p className="text-muted-foreground">
                  Manage and view customer information and order history
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search customers..."
                    className="pl-8 w-full sm:w-[260px]"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                </div>
                <Button type="button" onClick={handleSearch}>
                  Search
                </Button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div>
                {!isLoading && (
                  <p className="text-sm text-muted-foreground">
                    Showing {customers.length} of {totalCustomers} customers
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground hidden sm:block">Show</p>
                <Select
                  value={limit.toString()}
                  onValueChange={handleLimitChange}
                >
                  <SelectTrigger className="h-8 w-16">
                    <SelectValue placeholder={limit} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground hidden sm:block">per page</p>
              </div>
            </div>

            {isMobile ? (
              <div className="mt-4 space-y-4">
                {isLoading ? (
                  Array.from({ length: limit }).map((_, index) => renderMobileSkeletonCard(index))
                ) : customers.length > 0 ? (
                  customers.map(customer => (
                    <Card key={customer.id} className="mb-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          {`${customer.firstname} ${customer.lastname}`.trim() || customer.email || 'Unknown Customer'}
                        </CardTitle>
                        {customer.email && (
                          <CardDescription>
                            <div className="flex items-center">
                              <Mail className="mr-1 h-3 w-3" />
                              <span>{customer.email}</span>
                            </div>
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="pb-3 pt-0">
                        <div className="space-y-2">
                          {customer.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="mr-1 h-3 w-3" />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                          {renderCustomerAddress(customer)}
                          {customer.affiliateCodes && customer.affiliateCodes.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {customer.affiliateCodes.map((code, index) => (
                                <Badge key={index} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                  {code}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t">
                            <div>
                              <div className="text-sm text-muted-foreground">Last Order</div>
                              <div>{formatDate(customer.lastOrderDate, { month: 'short', day: 'numeric' })}</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Orders</div>
                              <div className="text-center">{customer.totalOrders}</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Total Spent</div>
                              <div className="font-medium">{formatCurrency(customer.totalSpent)}</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="py-10 text-center">
                      <User className="mx-auto h-10 w-10 text-muted-foreground mb-3 opacity-50" />
                      <h3 className="text-lg font-medium">No customers found</h3>
                      <p className="text-muted-foreground mt-1">
                        {search ? 'Try adjusting your search query.' : 'Customer data will appear here once available.'}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead className="hidden md:table-cell">Address</TableHead>
                      <TableHead className="hidden lg:table-cell">Last Order</TableHead>
                      <TableHead className="text-center">Orders</TableHead>
                      <TableHead className="text-right">Total Spent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: limit }).map((_, index) => renderSkeletonRow(index))
                    ) : customers.length > 0 ? (
                      customers.map(customer => renderCustomerRow(customer))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <User className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
                            <h3 className="text-lg font-medium">No customers found</h3>
                            <p className="text-muted-foreground mt-1">
                              {search ? 'Try adjusting your search query.' : 'Customer data will appear here once available.'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center">
                {renderPagination()}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}