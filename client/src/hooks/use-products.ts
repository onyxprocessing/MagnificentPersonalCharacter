import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Product } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface UseProductsOptions {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}

export function useProducts({
  page = 1,
  limit = 8,
  category = "",
  search = ""
}: UseProductsOptions = {}) {
  // Build query params
  const queryParams = new URLSearchParams();
  queryParams.append("page", page.toString());
  queryParams.append("limit", limit.toString());
  
  if (category) {
    queryParams.append("category", category);
  }
  
  if (search) {
    queryParams.append("search", search);
  }

  // Fetch products with query params
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/products', page, limit, category, search],
    keepPreviousData: true,
  });

  const products: Product[] = data?.data || [];
  const totalProducts: number = data?.pagination?.total || 0;

  return {
    products,
    totalProducts,
    isLoading,
    error,
    refetch,
  };
}

interface UseProductDetailOptions {
  productId?: number;
  initialData?: Product | null;
}

export function useProductDetail({ 
  productId, 
  initialData = null 
}: UseProductDetailOptions = {}) {
  const enabled = productId !== undefined;
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/products', productId],
    queryFn: () => fetch(`/api/products/${productId}`).then(res => res.json()),
    enabled,
    initialData: initialData ? { data: initialData } : undefined,
  });

  const product: Product | null = data?.data || null;

  return {
    product,
    isLoading,
    error,
    refetch,
  };
}

export function usePopularProducts() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/dashboard/popular-products'],
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const products: Product[] = data?.data || [];

  return {
    products,
    isLoading,
    error,
  };
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: Partial<Product>) => {
      const url = `/api/products/${product.id}`;
      const response = await apiRequest('PATCH', url, product);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update product');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/popular-products'] });
    },
  });
}
