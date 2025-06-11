import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  methodOrUrl: string,
  urlOrData?: string | unknown,
  data?: unknown | undefined
): Promise<Response> {
  // Handle the case where only URL is passed
  let method: string = 'GET';
  let url: string = '';
  let payload: unknown | undefined = undefined;
  
  // If first parameter doesn't look like a HTTP method, treat it as the URL
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(methodOrUrl.toUpperCase())) {
    url = methodOrUrl; // First param is the URL
    payload = urlOrData as unknown; // Second param is the data
  } else {
    method = methodOrUrl; // First param is the method
    url = urlOrData as string; // Second param is the URL
    payload = data; // Third param is the data
  }
  
  console.log("API Request:", method, url, payload);
  
  // Safety check for URL
  if (typeof url !== 'string') {
    console.error('URL is not a string:', url);
    throw new Error('Invalid URL');
  }
  
  // Make sure the URL starts with / or http
  if (url && typeof url === 'string' && !url.startsWith('/') && !url.startsWith('http')) {
    url = '/' + url;
  }
  
  const res = await fetch(url, {
    method,
    headers: payload ? { "Content-Type": "application/json" } : {},
    body: payload ? JSON.stringify(payload) : undefined,
    credentials: "include",
  });

  // Don't throw error for auth endpoints, let the caller handle it
  if (url && url.includes && url.includes('/api/auth/login')) {
    return res;
  }
  
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
