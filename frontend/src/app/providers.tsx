"use client";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { HttpError } from "@/lib/api";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => {
    // 401 z zapytania "moje..." = ciasteczka wygasły w trakcie pracy; pytamy serwer o sesję jeszcze raz (wróci "niezalogowany")
    const cache: QueryCache = new QueryCache({
      onError: (e, query) => {
        if (e instanceof HttpError && e.status === 401 && query.queryKey[0] === "my") cache.findAll({ queryKey: ["session"] }).forEach((q) => q.fetch());
      },
    });
    return new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } }, queryCache: cache });
  });
  return (
    <QueryClientProvider client={client}>
      {children}
      {/* panel podglądu cache'u; w buildzie produkcyjnym nic nie renderuje */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
