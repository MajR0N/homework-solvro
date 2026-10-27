"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } }));
  return (
    <QueryClientProvider client={client}>
      {children}
      {/* panel podglądu cache'u; w buildzie produkcyjnym nic nie renderuje */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
