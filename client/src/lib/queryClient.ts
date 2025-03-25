import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Cache for the CSRF token
let csrfTokenCache: string | null = null;

// Helper function to get the CSRF token from the server
export async function fetchCsrfToken(): Promise<string | null> {
  try {
    // Return cached token if available
    if (csrfTokenCache) {
      return csrfTokenCache;
    }
    
    // Otherwise fetch it from the server
    const response = await fetch('/api/csrf-token', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      console.error('Failed to fetch CSRF token:', response.status);
      return null;
    }
    
    const data = await response.json();
    csrfTokenCache = data.csrfToken;
    return csrfTokenCache;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    return null;
  }
}

// Original apiRequest function with CSRF token support
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get CSRF token from server
  const csrfToken = await fetchCsrfToken();
  
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add CSRF token header if available
  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// Enhanced function for JSON API requests using object options with CSRF token
export async function fetchApi<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  // Get CSRF token from server
  const csrfToken = await fetchCsrfToken();
  
  // Create a new headers object by merging the existing headers with the CSRF token
  const headers = new Headers(options?.headers || {});
  
  // Add CSRF token header if available and not already set
  if (csrfToken && !headers.has('X-CSRF-Token')) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get CSRF token from server
    const csrfToken = await fetchCsrfToken();
    
    // Create headers and add CSRF token
    const headers: Record<string, string> = {};
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers
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
