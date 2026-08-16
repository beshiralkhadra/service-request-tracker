"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: {
        gcTime: 10 * 60 * 1_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          const status =
            typeof error === "object" && error !== null && "status" in error
              ? error.status
              : undefined;
          return status !== 401 && status !== 403 && failureCount < 2;
        },
        staleTime: 30_000,
      },
    },
  });

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
