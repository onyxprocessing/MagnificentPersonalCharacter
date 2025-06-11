import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MobileSidebar from "@/components/layout/MobileSidebar";
import ProductGrid from "@/components/Products/ProductGrid";
import ProductEditModal from "@/components/Products/ProductEditModal";
import { useProducts } from "@/hooks/use-products";
import { Product, InsertProduct } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ProductsPage() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Fetch products with pagination and filters
  const { 
    products, 
    totalProducts, 
    isLoading: isProductsLoading 
  } = useProducts({
    page,
    limit,
    category: categoryFilter,
    search: searchQuery
  });

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Handle category filter change
  const handleCategoryFilter = (category: string) => {
    // If "all" is selected, we want to clear the filter
    setCategoryFilter(category === "all" ? "" : category);
    setPage(1); // Reset page when filter changes
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1); // Reset page when search changes
  };

  // Handle add product
  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsNewProduct(true);
    setIsProductModalOpen(true);
  };

  // Handle edit product
  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsNewProduct(false);
    setIsProductModalOpen(true);
  };

  // Handle duplicate product
  const handleDuplicateProduct = (product: Product) => {
    // Create a copy with a new name and without an ID
    const duplicatedProduct = {
      ...product,
      name: `${product.name} (Copy)`,
    };
    delete (duplicatedProduct as any).id;
    setSelectedProduct(duplicatedProduct as Product);
    setIsNewProduct(true);
    setIsProductModalOpen(true);
  };

  // Handle delete product confirmation
  const handleDeleteProduct = (productId: number) => {
    setProductToDelete(productId);
  };

  // Handle save product (create or update)
  const handleSaveProduct = async (product: Product | InsertProduct) => {
    try {
      if ('id' in product) {
        // Update existing product
        await apiRequest('PATCH', `/api/products/${product.id}`, product);
        toast({
          title: "Product Updated",
          description: `${product.name} has been updated successfully.`
        });
      } else {
        // Create new product
        await apiRequest('POST', '/api/products', product);
        toast({
          title: "Product Created",
          description: `${product.name} has been created successfully.`
        });
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: "Error",
        description: "There was an error saving the product.",
        variant: "destructive"
      });
      return Promise.reject(error);
    }
  };

  // Confirm product deletion
  const confirmDeleteProduct = async () => {
    if (productToDelete === null) return;
    
    try {
      await apiRequest('DELETE', `/api/products/${productToDelete}`, null);
      
      toast({
        title: "Product Deleted",
        description: "The product has been deleted successfully."
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      // Reset state
      setProductToDelete(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "There was an error deleting the product.",
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
          title="Products"
        />
        
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          <ProductGrid
            products={products}
            loading={isProductsLoading}
            page={page}
            limit={limit}
            totalProducts={totalProducts}
            onPageChange={handlePageChange}
            onCategoryFilter={handleCategoryFilter}
            onSearch={handleSearch}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onDuplicateProduct={handleDuplicateProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        </main>
      </div>

      {/* Product Edit Modal */}
      <ProductEditModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={selectedProduct}
        onSave={handleSaveProduct}
        isNew={isNewProduct}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={productToDelete !== null} 
        onOpenChange={(open) => !open && setProductToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              product and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteProduct}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
