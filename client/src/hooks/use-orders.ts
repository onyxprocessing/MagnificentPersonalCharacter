import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Order } from "@shared/schema";

interface UseOrdersOptions {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export function useOrders({
  page = 1,
  limit = 10,
  status = "payment_selection", // Always default to payment_selection
  search = ""
}: UseOrdersOptions = {}) {
  // Build query params
  const queryParams = new URLSearchParams();
  queryParams.append("page", page.toString());
  queryParams.append("limit", limit.toString());
  
  // Always include status filter for payment_selection
  queryParams.append("status", "payment_selection");
  
  if (search) {
    queryParams.append("search", search);
  }

  // Fetch orders with query params
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/orders', page, limit, status, search],
    queryFn: async () => {
      const response = await fetch(`/api/orders?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      return response.json();
    },
  });

  const orders: Order[] = data?.data || [];
  const totalOrders: number = data?.pagination?.total || 0;

  return {
    orders,
    totalOrders,
    isLoading,
    error,
    refetch,
  };
}

interface UseOrderDetailOptions {
  orderId?: string;
  initialData?: Order | null;
}

export function useOrderDetail({ 
  orderId, 
  initialData = null 
}: UseOrderDetailOptions = {}) {
  const enabled = !!orderId;
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/orders', orderId],
    enabled,
    initialData: initialData ? { data: initialData } : undefined,
  });

  const order: Order | null = data?.data || null;

  return {
    order,
    isLoading,
    error,
    refetch,
  };
}
