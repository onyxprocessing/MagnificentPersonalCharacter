import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Product } from "@shared/schema";

interface PopularProductsProps {
  products: Product[];
  loading?: boolean;
}

export default function PopularProducts({ products, loading = false }: PopularProductsProps) {
  const [, navigate] = useLocation();

  // Sort products by sales data (descending) and limit to 4
  const sortedProducts = [...products]
    .filter(product => product.salesData && product.salesData.totalSales > 0)
    .sort((a, b) => {
      const aSales = a.salesData?.totalSales || 0;
      const bSales = b.salesData?.totalSales || 0;
      return bSales - aSales; // Sort in descending order
    })
    .slice(0, 4); // Get only the top 4 products

  const handleProductClick = (productId: number) => {
    navigate(`/products/${productId}`);
  };

  const getStockBadge = (product: Product) => {
    const isLowStock = product.stock != null && 
                       product.lowStockThreshold != null && 
                       product.stock <= product.lowStockThreshold;
    
    if (isLowStock) {
      return <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">Low Stock</span>;
    }
    
    return <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">In Stock</span>;
  };

  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <CardTitle className="text-base font-semibold">Popular Products</CardTitle>
        <Button 
          variant="link" 
          className="text-primary p-0" 
          onClick={() => navigate("/products")}
        >
          View All
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                <Skeleton className="w-full h-32" />
                <div className="p-4">
                  <Skeleton className="h-6 w-24 mb-1" />
                  <Skeleton className="h-4 w-20 mb-3" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {sortedProducts.length > 0 ? (
              sortedProducts.map((product) => (
                <div 
                  key={product.id} 
                  className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleProductClick(product.id)}
                >
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.imageAlt || product.name}
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-400">
                      No image
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {product.weight} {product.category?.toLowerCase()}
                      <span className="ml-2 text-primary-600 font-medium">
                        {product.salesData?.totalSales || 0} sold
                      </span>
                    </p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="font-semibold text-gray-900">${parseFloat(product.price || '0').toFixed(2)}</span>
                      {getStockBadge(product)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // Fallback to regular products if no sales data is available
              products.slice(0, 4).map((product) => (
                <div 
                  key={product.id} 
                  className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleProductClick(product.id)}
                >
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.imageAlt || product.name}
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-400">
                      No image
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{product.weight} {product.category?.toLowerCase()}</p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="font-semibold text-gray-900">${parseFloat(product.price || '0').toFixed(2)}</span>
                      {getStockBadge(product)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
