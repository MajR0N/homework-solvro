import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HttpError } from "./api";
import { ownAvailable } from "./source";

// Sesja zalogowanego użytkownika własnego backendu. Tokeny JWT są w ciasteczkach httpOnly, ustawianych przez serwer
// Next.js (trasy /api/auth/...). JavaScript w przeglądarce ich nie widzi, więc zna tylko nazwę i rolę i pyta o nie serwer.
// Hasło nigdy nie jest zapisywane.
export type Session = { username: string; role: string };

const SESSION = ["session"];

async function fetchSession(): Promise<Session | null> {
  localStorage.removeItem("session"); // ślad po starej wersji, która trzymała tokeny w localStorage (czytelne dla XSS)
  const res = await fetch("/api/auth/session", { cache: "no-store" });
  if (!res.ok) throw new HttpError(res.status);
  return (await res.json()).user ?? null;
}

// loading = jeszcze nie wiemy; pasek nie pokazuje wtedy ani "Zaloguj", ani nazwy (żeby nie migało)
export function useSession(): { session: Session | null; loading: boolean } {
  const q = useQuery({ queryKey: SESSION, queryFn: fetchSession, enabled: ownAvailable, staleTime: 60_000, retry: 1 });
  return { session: q.data ?? null, loading: ownAvailable && q.isPending };
}

// Rzuca HttpError (401 = zły login lub hasło, 429 = blokada po zbyt wielu próbach)
export function useLogin() {
  const client = useQueryClient();
  return async (username: string, password: string) => {
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    if (!res.ok) throw new HttpError(res.status);
    const user = await res.json();
    if (typeof user?.username !== "string" || typeof user?.role !== "string") throw new HttpError(502);
    client.setQueryData(SESSION, { username: user.username, role: user.role } satisfies Session);
  };
}

export function useLogout() {
  const client = useQueryClient();
  return async () => {
    client.setQueryData(SESSION, null); // wylogowanie w interfejsie działa od razu, nawet gdy serwer nie odpowie
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  };
}
