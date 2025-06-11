import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';

interface Affiliate {
  id: string;
  fields: {
    'First Name': string;
    'Last Name': string;
    Email: string;
    Code: string;
  };
  createdTime: string;
}

interface AffiliateStats {
  totalOrders: number;
  totalCommission: number;
  totalSales: number;
}

interface AffiliateOrder {
  id: string;
  fields: {
    firstname: string;
    lastname: string;
    email: string;
    total: string;
    totalammount: string;
    status: string;
    affiliatecode: string;
    createdat: string;
  };
}

interface AffiliatesResponse {
  success: boolean;
  data: Affiliate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

interface AffiliateOrdersResponse {
  success: boolean;
  data: AffiliateOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

interface UseAffiliatesOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export function useAffiliates({
  page = 1,
  limit = 10,
  search = '',
  status = '',
}: UseAffiliatesOptions = {}) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
    ...(status && { status }),
  });

  return useQuery({
    queryKey: [`/api/affiliates?${params}`, { page, limit, search, status }],
    queryFn: getQueryFn({ on401: 'throw' }),
  });
}

interface UseAffiliateOrdersOptions {
  affiliateCode: string;
  page?: number;
  limit?: number;
}

export function useAffiliateOrders({
  affiliateCode,
  page = 1,
  limit = 10,
}: UseAffiliateOrdersOptions) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  return useQuery({
    queryKey: [`/api/affiliates/${affiliateCode}/orders?${params}`, affiliateCode, { page, limit }],
    queryFn: getQueryFn({ on401: 'throw' }),
    enabled: !!affiliateCode,
  });
}

export function useAffiliateStats(affiliateCode: string) {
  return useQuery({
    queryKey: [`/api/affiliates/${affiliateCode}/stats`, affiliateCode],
    queryFn: getQueryFn({ on401: 'throw' }),
    enabled: !!affiliateCode,
  });
}