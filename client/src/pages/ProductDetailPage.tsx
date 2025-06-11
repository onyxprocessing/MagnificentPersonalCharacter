import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useProductDetail, useUpdateProduct } from "@/hooks/use-products";
import { formatCurrency } from "@/lib/utils";
import type { Product, SupplierCostItem } from "@shared/schema";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MobileSidebar from "@/components/layout/MobileSidebar";
import ProductEditModal from "@/components/Products/ProductEditModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Edit, 
  Copy, 
  Trash, 
  Tag, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Package,
  ChevronRight,
  ShoppingCart,
  Truck,
  DollarSign,
  BarChart
} from "lucide-react";

export default function ProductDetailPage() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const productId = parseInt(id);
  const { toast } = useToast();
  
  // Load the product details
  const { product, isLoading, error, refetch } = useProductDetail({ 
    productId: !isNaN(productId) ? productId : undefined
  });
  
  // Update product mutation
  const updateProductMutation = useUpdateProduct();

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <MobileSidebar 
          isOpen={isMobileSidebarOpen} 
          onClose={() => setIsMobileSidebarOpen(false)} 
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            onToggleMobileMenu={() => setIsMobileSidebarOpen(true)}
            title="Product Details"
          />
          <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
            <div className="animate-pulse space-y-6">
              <div className="h-8 w-1/4 bg-gray-200 rounded"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="h-96 bg-gray-200 rounded"></div>
                <div className="space-y-4">
                  <div className="h-10 w-3/4 bg-gray-200 rounded"></div>
                  <div className="h-6 w-1/4 bg-gray-200 rounded"></div>
                  <div className="h-8 w-1/3 bg-gray-200 rounded"></div>
                  <div className="h-32 w-full bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <MobileSidebar 
          isOpen={isMobileSidebarOpen} 
          onClose={() => setIsMobileSidebarOpen(false)} 
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            onToggleMobileMenu={() => setIsMobileSidebarOpen(true)}
            title="Product Details"
          />
          <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
            <div className="flex flex-col items-center justify-center h-full">
              <h2 className="text-2xl font-bold text-red-600 mb-2">Product Not Found</h2>
              <p className="text-gray-500 mb-4">The product you're looking for doesn't exist or has been removed.</p>
              <Button onClick={() => navigate("/products")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Products
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Helper functions
  // Calculate total inventory from all weight options
  const totalInventory = product.inventory ? 
    product.inventory.reduce((total, item) => total + item.quantity, 0) : 0;
  
  // Calculate if any inventory items have stock, even if total stock is low
  const hasAnyInventoryStock = product.inventory && product.inventory.some(item => item.quantity > 0);
  
  // Check if any inventory is at or below low stock threshold, but not zero
  const hasLowInventoryStock = product.inventory && product.inventory.some(
    item => item.quantity > 0 && item.quantity <= (product.lowStockThreshold ?? 5)
  );
  
  // Legacy "general" stock level check
  const isLowStock = (totalInventory > 0 && 
                     totalInventory <= (product.lowStockThreshold ?? 5));

  const getStockStatus = () => {
    // Use the calculated total inventory from all weight options
    
    // Even if total stock is 0, if any inventory items have stock, show Low Stock instead of Out of Stock
    if (totalInventory <= 0) {
      return (
        <div className="flex items-center text-red-500">
          <AlertTriangle className="w-5 h-5 mr-2" />
          <span className="font-medium">Out of Stock</span>
        </div>
      );
    }

    // Show Low Stock if total stock is low or any inventory items are low
    if (isLowStock || hasLowInventoryStock) {
      return (
        <div className="flex items-center text-amber-500">
          <Clock className="w-5 h-5 mr-2" />
          <span className="font-medium">Low Stock ({totalInventory} total units)</span>
        </div>
      );
    }

    return (
      <div className="flex items-center text-emerald-600">
        <CheckCircle className="w-5 h-5 mr-2" />
        <span className="font-medium">In Stock ({totalInventory} available)</span>
      </div>
    );
  };

  // Handle editing
  const handleEdit = () => {
    setIsEditModalOpen(true);
  };
  
  // Handle saving product edits
  const handleSaveProduct = async (updatedProduct: Product) => {
    try {
      await updateProductMutation.mutateAsync(updatedProduct);
      toast({
        title: "Product updated",
        description: "The product has been successfully updated.",
      });
      setIsEditModalOpen(false);
      refetch(); // Refresh product data
    } catch (error: any) {
      toast({
        title: "Error updating product",
        description: error.message || "There was an error updating the product.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <MobileSidebar 
        isOpen={isMobileSidebarOpen} 
        onClose={() => setIsMobileSidebarOpen(false)} 
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onToggleMobileMenu={() => setIsMobileSidebarOpen(true)}
          title="Product Details"
        />
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          {/* Breadcrumb */}
          <div className="flex items-center text-sm text-gray-500 mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              className="hover:bg-transparent p-0 h-auto"
              onClick={() => navigate("/products")}
            >
              Products
            </Button>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="text-gray-800 font-medium truncate max-w-[200px]">{product.name}</span>
          </div>
          
          {/* Product Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column - Image and basic info */}
            <div className="space-y-6">
              {/* Product Image */}
              <Card className="overflow-hidden border border-gray-200">
                <div className="w-full h-80 bg-gray-100 flex items-center justify-center relative">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.imageAlt || product.name}
                      className="w-full h-full object-contain p-4"
                      onError={(e) => {
                        // Set a fallback image on error
                        e.currentTarget.src = "https://via.placeholder.com/600x400?text=Product+Image+Not+Available";
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Package className="w-16 h-16 mb-2 opacity-20" />
                      <span>No image available</span>
                    </div>
                  )}
                  <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${
                    product.status === 'active' ? 'bg-green-100 text-green-800' :
                    product.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {product.status ? product.status.charAt(0).toUpperCase() + product.status.slice(1) : 'Unknown'}
                  </div>
                </div>
              </Card>
              
              {/* Product Quick Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center text-gray-700">
                      <Tag className="w-5 h-5 mr-2 text-blue-500" />
                      <div>
                        <div className="text-sm font-medium text-gray-500">SKU</div>
                        <div className="font-medium">{product.sku || 'N/A'}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center text-gray-700">
                      <Package className="w-5 h-5 mr-2 text-blue-500" />
                      <div>
                        <div className="text-sm font-medium text-gray-500">Weight</div>
                        <div className="font-medium">{product.weight || 'N/A'}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center text-gray-700">
                      <Truck className="w-5 h-5 mr-2 text-blue-500" />
                      <div>
                        <div className="text-sm font-medium text-gray-500">Ship From</div>
                        <div className="font-medium">US Warehouse</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center text-gray-700">
                      <ShoppingCart className="w-5 h-5 mr-2 text-blue-500" />
                      <div>
                        <div className="text-sm font-medium text-gray-500">Total Sales</div>
                        <div className="font-medium">
                          {product.salesData ? product.salesData.totalSales : 0} units
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center text-gray-700">
                      <DollarSign className="w-5 h-5 mr-2 text-green-500" />
                      <div>
                        <div className="text-sm font-medium text-gray-500">Total Profit</div>
                        <div className="font-medium">
                          {(() => {
                            let totalProfit = 0;
                            // Calculate profit based on sales by weight and supplier costs
                            if (product.salesData && product.weightOptions && product.supplierCost) {
                              Object.entries(product.salesData.salesByWeight).forEach(([weight, count]) => {
                                // Find price for this weight
                                const priceObj = product.weightOptions.find(w => w.weight === weight);
                                const price = priceObj ? parseFloat(priceObj.price) : 0;
                                
                                // Find supplier cost for this weight
                                const costObj = product.supplierCost.find(c => c.weight === weight);
                                const cost = costObj ? costObj.cost : 0;
                                
                                // Calculate profit for this weight and add to total
                                const profit = (price - cost) * count;
                                totalProfit += profit;
                              });
                            }
                            return formatCurrency(totalProfit);
                          })()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Right Column - Details */}
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
                
                <div className="flex items-center space-x-2 mb-4">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {product.category || 'Uncategorized'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="text-3xl font-bold text-gray-900">
                    {formatCurrency(parseFloat(product.price || '0'))}
                  </div>
                  {getStockStatus()}
                </div>
                
                {product.lowStockThreshold !== undefined && (
                  <div className="text-sm text-gray-500 mb-4">
                    Low stock alert when quantity below {product.lowStockThreshold}
                  </div>
                )}
              </div>
              
              {/* Tabs for Different Information */}
              <Tabs defaultValue="description" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="description">Description</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="weights">Weights & Prices</TabsTrigger>
                  <TabsTrigger value="inventory">Inventory</TabsTrigger>
                  <TabsTrigger value="sales">Sales & Profit</TabsTrigger>
                </TabsList>
                
                <TabsContent value="description" className="mt-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="prose max-w-none">
                        {product.description ? (
                          <div className="whitespace-pre-line">{product.description}</div>
                        ) : (
                          <p className="text-gray-500 italic">No description available for this product.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="details" className="mt-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Product Name</h3>
                          <p className="font-medium">{product.name}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">SKU</h3>
                          <p className="font-medium">{product.sku || 'N/A'}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Category</h3>
                          <p className="font-medium">{product.category || 'Uncategorized'}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Weight</h3>
                          <p className="font-medium">{product.weight || 'N/A'}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Status</h3>
                          <p className="font-medium capitalize">{product.status || 'Unknown'}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Price</h3>
                          <p className="font-medium">{formatCurrency(parseFloat(product.price || '0'))}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="weights" className="mt-4">
                  <Card>
                    <CardContent className="p-6">
                      {product.weightOptions && product.weightOptions.length > 0 ? (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Weight & Price Options</h3>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleEdit}
                              className="flex items-center"
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" />
                              Edit Options
                            </Button>
                          </div>
                          
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Weight
                                  </th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Price
                                  </th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Supplier Cost
                                  </th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Profit Margin
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {product.weightOptions.map((option, index) => {
                                  const supplierCostItem = product.supplierCost?.find(item => item.weight === option.weight);
                                  const supplierCost = supplierCostItem?.cost || 0;
                                  const price = parseFloat(option.price) || 0;
                                  // Calculate profit margin
                                  let profitMargin = 0;
                                  if (price > 0 && supplierCost > 0) {
                                    if (supplierCost >= price) {
                                      profitMargin = 0; // No profit if cost is equal to or higher than price
                                    } else {
                                      profitMargin = ((price - supplierCost) / price) * 100;
                                    }
                                  }
                                    
                                  return (
                                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {option.weight}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatCurrency(price)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {supplierCost > 0 ? formatCurrency(supplierCost) : 'Not set'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {price > 0 && supplierCost > 0 
                                          ? (supplierCost >= price 
                                              ? (
                                                <span className="text-red-600 font-medium">
                                                  0.00% (Loss)
                                                </span>
                                              )
                                              : (
                                                <span className={profitMargin < 15 ? "text-amber-600" : "text-emerald-600"}>
                                                  {profitMargin.toFixed(2)}%
                                                </span>
                                              )
                                            )
                                          : 'N/A'
                                        }
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-gray-500 mb-4">No weight options configured for this product</p>
                          <Button variant="outline" onClick={handleEdit}>
                            <Edit className="h-4 w-4 mr-2" />
                            Add Weight Options
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="inventory" className="mt-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Total Stock</h3>
                          <p className="font-medium">{totalInventory} units</p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Low Stock Threshold</h3>
                          <p className="font-medium">{product.lowStockThreshold || 'Not set'}</p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Track Inventory</h3>
                          <p className="font-medium">{product.trackInventory ? 'Yes' : 'No'}</p>
                        </div>
                      </div>
                      
                      {/* Weight-specific inventory table */}
                      <div className="mt-6">
                        <h3 className="font-medium text-gray-900 mb-3">Inventory by Weight</h3>
                        
                        {product.inventory && product.inventory.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Weight
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Quantity
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Price
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {product.inventory.map((item, index) => {
                                  const matchingOption = product.weightOptions?.find(
                                    option => option.weight === item.weight
                                  );
                                  
                                  return (
                                    <tr key={index}>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{item.weight}</div>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{item.quantity}</div>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                          item.quantity === 0 
                                            ? 'bg-red-100 text-red-800' 
                                            : item.quantity <= (product.lowStockThreshold || 5)
                                              ? 'bg-yellow-100 text-yellow-800' 
                                              : 'bg-green-100 text-green-800'
                                        }`}>
                                          {item.quantity === 0 
                                            ? 'Out of Stock' 
                                            : item.quantity <= (product.lowStockThreshold || 5)
                                              ? `Low Stock (${item.quantity})` 
                                              : 'In Stock'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                          {matchingOption ? `$${matchingOption.price}` : 'N/A'}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-md">
                            No weight-specific inventory data available. Add inventory for each weight option by editing this product.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="sales" className="mt-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h2 className="text-lg font-semibold text-gray-900">Sales & Profit Analytics</h2>
                          <div className="text-sm text-gray-500">Updated {new Date().toLocaleDateString()}</div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center mb-4">
                              <ShoppingCart className="h-5 w-5 text-blue-500 mr-2" />
                              <h3 className="font-medium text-gray-900">Total Sales</h3>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">
                              {product.salesData?.totalSales || 0}
                            </div>
                            <p className="text-sm text-gray-500">Total units sold across all weights</p>
                          </div>
                          
                          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center mb-4">
                              <DollarSign className="h-5 w-5 text-green-500 mr-2" />
                              <h3 className="font-medium text-gray-900">Total Profit</h3>
                            </div>
                            <div className="text-3xl font-bold text-green-600 mb-2">
                              {(() => {
                                let totalProfit = 0;
                                // Calculate profit based on sales by weight and supplier costs
                                if (product.salesData && product.weightOptions && product.supplierCost) {
                                  Object.entries(product.salesData.salesByWeight).forEach(([weight, count]) => {
                                    // Find price for this weight
                                    const priceObj = product.weightOptions?.find(w => w.weight === weight);
                                    const price = priceObj ? parseFloat(priceObj.price) : 0;
                                    
                                    // Find supplier cost for this weight
                                    const costObj = product.supplierCost?.find(c => c.weight === weight);
                                    const cost = costObj ? costObj.cost : 0;
                                    
                                    // Calculate profit for this weight and add to total
                                    const profit = (price - cost) * (count as number);
                                    totalProfit += profit;
                                  });
                                }
                                return formatCurrency(totalProfit);
                              })()}
                            </div>
                            <p className="text-sm text-gray-500">Based on sales data and supplier costs</p>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="font-medium text-gray-900 mb-4">Sales by Weight</h3>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Weight
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Units Sold
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Unit Price
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Unit Cost
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Profit Per Unit
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total Revenue
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total Profit
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {product.weightOptions?.map((option, index) => {
                                  const weight = option.weight;
                                  const price = parseFloat(option.price) || 0;
                                  
                                  // Find supplier cost
                                  const costObj = product.supplierCost?.find(c => c.weight === weight);
                                  const cost = costObj ? costObj.cost : 0;
                                  
                                  // Find sales count
                                  const salesCount = product.salesData?.salesByWeight[weight] as number || 0;
                                  
                                  // Calculate profit metrics
                                  const profitPerUnit = price - cost;
                                  const totalRevenue = price * salesCount;
                                  const totalProfit = profitPerUnit * salesCount;
                                  
                                  return (
                                    <tr key={index}>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {weight}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                        {salesCount}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                        {formatCurrency(price)}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                        {formatCurrency(cost)}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                        <span className={`font-medium ${profitPerUnit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {formatCurrency(profitPerUnit)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                        {formatCurrency(totalRevenue)}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                        <span className={`font-medium ${totalProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {formatCurrency(totalProfit)}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                                {(!product.weightOptions || product.weightOptions.length === 0) && (
                                  <tr>
                                    <td colSpan={7} className="px-4 py-4 text-center text-sm text-gray-500">
                                      No weight options available for this product.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
              
              {/* Action Buttons */}
              <div className="flex space-x-4 mt-8">
                <Button 
                  variant="default" 
                  onClick={handleEdit}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Product
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/products")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Products
                </Button>
              </div>
            </div>
          </div>
        </main>
        
        {/* Edit Product Modal */}
        <ProductEditModal 
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          product={product}
          onSave={handleSaveProduct}
        />
      </div>
    </div>
  );
}