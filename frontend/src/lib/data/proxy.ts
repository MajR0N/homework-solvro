import { HttpError } from "../api";

/**
 * Wywołanie backendu jako zalogowany, przez nasze proxy (/api/proxy/...): serwer dokłada token z ciasteczka httpOnly,
 * więc przeglądarka go nie widzi. `path` bez ukośnika na początku i na końcu, np. "me/stats" albo "cocktails/12".
 * Zwraca null dla odpowiedzi bez treści (204). Rzuca HttpError ze statusem (401 = sesja wygasła, 403 = brak uprawnień).
 */
export async function proxyJson<T>(path: string, init: { method?: string; body?: unknown; query?: Record<string, string> } = {}): Promise<T | null> {
  const query = init.query ? `?${new URLSearchParams(init.query)}` : "";
  const hasBody = init.body !== undefined;
  const res = await fetch(`/api/proxy/${path}${query}`, {
    method: init.method ?? "GET",
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) throw new HttpError(res.status);
  return res.status === 204 ? null : ((await res.json()) as T);
}
