import type { NextRequest, NextResponse } from "next/server";
import { clientIp, targetUrl } from "./proxy-utils";

// Rozmowa serwera Next.js z własnym backendem (Django). Tokeny JWT żyją tylko tutaj i w ciasteczkach httpOnly:
// JavaScript w przeglądarce ich nigdy nie widzi, więc XSS nie może ich ukraść.
// BACKEND_URL (tylko serwer) ma pierwszeństwo; lokalnie wystarczy NEXT_PUBLIC_BACKEND_URL, którego używa też reszta aplikacji.
export const BACKEND = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL;
// Wspólny sekret z backendem: z nim backend uwierzy w nagłówek X-Client-IP (limity i wyświetlenia liczą prawdziwych ludzi).
const PROXY_SECRET = process.env.PROXY_SECRET;

export const ACCESS = "access";
export const REFRESH = "refresh";
const ACCESS_MAX_AGE = 10 * 60; // tyle samo co ważność tokenu access w backendzie
const REFRESH_MAX_AGE = 7 * 24 * 3600; // tyle samo co ważność tokenu refresh

export type Tokens = { access: string; refresh: string };

// Path "/api": ciasteczka jadą tylko z żądaniami do naszych tras /api/..., nie z każdą nawigacją po stronie.
// SameSite=Lax: przeglądarka nie dołącza ich do żądań z obcych stron (pierwsza warstwa ochrony przed CSRF; drugą jest sameOrigin).
const cookieOptions = (maxAge: number) => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/api", maxAge });

export function setSessionCookies(res: NextResponse, t: Tokens) {
  res.cookies.set(ACCESS, t.access, cookieOptions(ACCESS_MAX_AGE));
  res.cookies.set(REFRESH, t.refresh, cookieOptions(REFRESH_MAX_AGE));
}

export function clearSessionCookies(res: NextResponse) {
  res.cookies.set(ACCESS, "", cookieOptions(0));
  res.cookies.set(REFRESH, "", cookieOptions(0));
}

type Init = { method?: string; body?: string; token?: string; ip?: string | null; search?: string };

/** Wołanie backendu. `segments` to ścieżka po /api/v1 (np. ["auth", "me"]); zwraca null, gdy ścieżka jest niedozwolona. */
export async function backendFetch(segments: string[], init: Init = {}): Promise<Response | null> {
  if (!BACKEND) return Response.json({ detail: "Brak adresu backendu (BACKEND_URL)" }, { status: 503 });
  const url = targetUrl(BACKEND, segments, init.search);
  if (!url) return null;
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  if (PROXY_SECRET && init.ip) {
    headers["X-Client-IP"] = init.ip;
    headers["X-Proxy-Secret"] = PROXY_SECRET;
  }
  try {
    return await fetch(url, { method: init.method ?? "GET", headers, body: init.body, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  } catch {
    return Response.json({ detail: "Backend nie odpowiada" }, { status: 502 });
  }
}

// Odświeżenie tokenów. Refresh jest jednorazowy: backend po użyciu unieważnia stary i wydaje nowy. Gdy kilka żądań naraz
// zauważy wygasły access (np. strona woła trzy rzeczy równolegle), tylko pierwsze odświeża, a pozostałe dostają ten sam wynik;
// inaczej drugie użyłoby już martwego refresh i wylogowało człowieka. Wynik trzymamy 10 s, żeby spóźnione żądanie też go dostało.
// ponytail: mapa jest w pamięci jednej instancji serwera; dwa żądania na dwóch instancjach Vercela mogą się jeszcze ścigać
// (jedno z nich dostanie 401 i człowiek zaloguje się ponownie). Pełne rozwiązanie wymagałoby wspólnego magazynu (np. bazy).
const inflight = new Map<string, Promise<Tokens | null>>();

export function refreshTokens(refresh: string, ip: string | null): Promise<Tokens | null> {
  let pending = inflight.get(refresh);
  if (!pending) {
    pending = (async () => {
      const res = await backendFetch(["auth", "refresh"], { method: "POST", body: JSON.stringify({ refresh }), ip });
      if (!res?.ok) return null;
      const data = await res.json().catch(() => null);
      return typeof data?.access === "string" && typeof data?.refresh === "string" ? { access: data.access, refresh: data.refresh } : null;
    })();
    inflight.set(refresh, pending);
    setTimeout(() => inflight.delete(refresh), 10_000);
  }
  return pending;
}

export type Authed = {
  response: Response | null; // null = niedozwolona ścieżka
  fresh: Tokens | null; // nowe tokeny po odświeżeniu: trzeba je zapisać w ciasteczkach odpowiedzi
  expired: boolean; // sesji nie da się uratować: trzeba wyczyścić ciasteczka
};

/** Żądanie do backendu jako zalogowany: gdy access wygasł, odświeża raz i ponawia. */
export async function authedFetch(req: NextRequest, segments: string[], init: Omit<Init, "token" | "ip"> = {}): Promise<Authed> {
  const ip = clientIp(req.headers);
  const access = req.cookies.get(ACCESS)?.value;
  const refresh = req.cookies.get(REFRESH)?.value;
  if (access) {
    const response = await backendFetch(segments, { ...init, token: access, ip });
    if (response?.status !== 401) return { response, fresh: null, expired: false };
  }
  if (!refresh) return { response: Response.json({ detail: "Brak sesji" }, { status: 401 }), fresh: null, expired: Boolean(access) };
  const fresh = await refreshTokens(refresh, ip);
  if (!fresh) return { response: Response.json({ detail: "Sesja wygasła" }, { status: 401 }), fresh: null, expired: true };
  return { response: await backendFetch(segments, { ...init, token: fresh.access, ip }), fresh, expired: false };
}
