import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, Plus } from "lucide-react";
import { Product } from "@shared/schema";
import ProductCard from "./ProductCard";
import ProductDetailModal from "./ProductDetailModal";

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  page: number;
  limit: number;
  totalProducts: number;
  onPageChange: (page: number) => void;
  onCategoryFilter: (category: string) => void;
  onSearch: (query: string) => void;
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDuplicateProduct: (product: Product) => void;
  onDeleteProduct: (productId: number) => void;
}

export default function ProductGrid({
  products,
  loading = false,
  page,
  limit,
  totalProducts,
  onPageChange,
  onCategoryFilter,
  onSearch,
  onAddProduct,
  onEditProduct,
  onDuplicateProduct,
  onDeleteProduct
}: ProductGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };
  
  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  const totalPages = Math.ceil(totalProducts / limit);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalProducts);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <CardTitle className="text-xl font-semibold">Product Management</CardTitle>
            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
              <div className="flex">
                <Select onValueChange={onCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Peptide">Peptides</SelectItem>
                    <SelectItem value="Supplement">Supplements</SelectItem>
                    <SelectItem value="Accessory">Accessories</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <form onSubmit={handleSearchSubmit}>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search products..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </form>
              </div>
              <Button
                onClick={onAddProduct}
                className="flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          // Skeleton loading state
          [...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <Skeleton className="h-6 w-32 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <div className="flex space-x-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          // Actual product cards
          products.map((product) => (
            <ProductCard 
              key={product.id}
              product={product}
              onView={handleViewProduct}
              onEdit={onEditProduct}
              onDuplicate={onDuplicateProduct}
              onDelete={onDeleteProduct}
            />
          ))
        )}
      </div>
      
      {/* Pagination */}
      <Card>
        <CardFooter className="px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium">{startItem}</span> to{" "}
            <span className="font-medium">{endItem}</span> of{" "}
            <span className="font-medium">{totalProducts}</span> products
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
            {[...Array(Math.min(totalPages, 3))].map((_, i) => (
              <Button
                key={i}
                variant={page === i + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
            {totalPages > 3 && page < totalPages && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
              >
                Next
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Product Detail Modal */}
      <ProductDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        product={selectedProduct}
        onEdit={onEditProduct}
      />
    </div>
  );
}
