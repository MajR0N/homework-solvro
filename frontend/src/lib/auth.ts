import { useSyncExternalStore } from "react";
import { HttpError } from "./api";
import { OWN_BASE } from "./source";

// Sesja zalogowanego użytkownika własnego backendu (JWT). Ten sam wzorzec co przy ulubionych:
// dane w localStorage + useSyncExternalStore. Hasło nigdy nie jest zapisywane, tylko tokeny.
// ponytail: access żyje 10 minut, a odświeżania (refresh) jeszcze nie ma, bo nic w interfejsie nie wywołuje
// chronionych endpointów; przy pierwszym takim wywołaniu dopisać POST /auth/refresh/.
// Tokeny w localStorage może odczytać złośliwy skrypt (XSS); alternatywa to ciasteczka httpOnly ustawiane przez serwer.
export type Session = { access: string; refresh: string; username: string; role: string };

const KEY = "session";
const listeners = new Set<() => void>();
let cache: { raw: string | null; session: Session | null } = { raw: null, session: null };

function read(): Session | null {
  const raw = localStorage.getItem(KEY);
  if (raw !== cache.raw) {
    let session: Session | null = null;
    try {
      const p = JSON.parse(raw ?? "null");
      if ([p?.access, p?.refresh, p?.username, p?.role].every((v) => typeof v === "string")) session = p;
    } catch {} // uszkodzony zapis = niezalogowany
    cache = { raw, session };
  }
  return cache.session;
}

function notify() {
  listeners.forEach((l) => l());
}

export function useSession(): Session | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      window.addEventListener("storage", cb); // inne karty
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", cb);
      };
    },
    read,
    () => null,
  );
}

async function post(path: string, body: object, token?: string): Promise<Response> {
  return fetch(`${OWN_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: JSON.stringify(body),
  });
}

// Rzuca HttpError (401 = zły login lub hasło, 429 = blokada po zbyt wielu próbach)
export async function login(username: string, password: string) {
  const res = await post("/auth/login/", { username, password });
  if (!res.ok) throw new HttpError(res.status);
  const { access, refresh } = await res.json();
  if (typeof access !== "string" || typeof refresh !== "string") throw new HttpError(502);

  // login zwraca tylko tokeny; nazwę i rolę bierzemy z /auth/me/
  const me = await fetch(`${OWN_BASE}/auth/me/`, { headers: { Authorization: `Bearer ${access}` } });
  if (!me.ok) throw new HttpError(me.status);
  const { username: name, role } = await me.json();
  if (typeof name !== "string" || typeof role !== "string") throw new HttpError(502);

  localStorage.setItem(KEY, JSON.stringify({ access, refresh, username: name, role } satisfies Session));
  notify();
}

export async function logout() {
  const s = read();
  localStorage.removeItem(KEY); // wylogowanie lokalne działa zawsze, nawet gdy serwer nie odpowie
  notify();
  if (s) await post("/auth/logout/", { refresh: s.refresh }, s.access).catch(() => {}); // unieważnia refresh po stronie serwera
}
