import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface Customer {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  createdAt: string;
  orders: {
    id: string;
    status: string;
    total: number;
    items: number;
    createdAt: string;
  }[];
}

interface CustomersResponse {
  success: boolean;
  data: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

interface UseCustomersOptions {
  page?: number;
  limit?: number;
  search?: string;
}

export function useCustomers({
  page = 1,
  limit = 10,
  search = ''
}: UseCustomersOptions = {}) {
  return useQuery<CustomersResponse>({
    queryKey: ['/api/customers', page, limit, search],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());
      if (search) queryParams.append('search', search);
      
      const url = `/api/customers?${queryParams.toString()}`;
      
      try {
        const response = await apiRequest('GET', url);
        
        // Parse the JSON response
        const jsonData = await response.json() as {
          success?: boolean;
          data?: any[];
          pagination?: { page: number; limit: number; total: number };
        };
        
        if (jsonData && jsonData.success && Array.isArray(jsonData.data)) {
          // Convert string dates to Date objects
          const customers = jsonData.data.map((customer: any) => {
            // Make sure the customer object has valid data
            if (!customer) return null;
            
            return {
              ...customer,
              // Use optional chaining and fallbacks
              lastOrderDate: customer.lastOrderDate ? new Date(customer.lastOrderDate) : new Date(),
              createdAt: customer.createdAt ? new Date(customer.createdAt) : new Date(),
              orders: Array.isArray(customer.orders) 
                ? customer.orders.map((order: any) => ({
                    ...order,
                    createdAt: order.createdAt ? new Date(order.createdAt) : new Date()
                  }))
                : []
            };
          }).filter(Boolean) as Customer[];
          
          return {
            success: true,
            data: customers,
            pagination: jsonData.pagination || { page, limit, total: customers.length }
          };
        }
        
        // Return empty data if the response format is unexpected
        return {
          success: jsonData?.success || false,
          data: [],
          pagination: jsonData?.pagination || { page, limit, total: 0 }
        };
      } catch (error) {
        console.error('Error fetching customers:', error);
        return {
          success: false,
          data: [],
          pagination: { page, limit, total: 0 }
        };
      }
    }
  });
}