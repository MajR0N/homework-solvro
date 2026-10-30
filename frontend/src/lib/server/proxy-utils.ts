// Czyste funkcje serwerowego proxy (bez Next.js i bez sieci), żeby dało się je sprawdzić testem.

// Segment adresu, który wolno przekazać dalej: litery, cyfry, myślnik i podkreślenie. Żadnych kropek ani ukośników,
// więc "..", "%2e%2e" czy "//evil.example" nie wyjdą poza adres API (to byłoby SSRF: proxy wołałoby cudzy serwer).
const SEGMENT = /^[A-Za-z0-9_-]+$/;

/** Adres w backendzie dla ścieżki z proxy, albo null, gdy ścieżka jest niedozwolona. Django wymaga ukośnika na końcu. */
export function targetUrl(base: string, segments: string[], search = ""): URL | null {
  if (segments.length === 0 || !segments.every((s) => SEGMENT.test(s))) return null;
  const url = new URL(`${base.replace(/\/+$/, "")}/${segments.join("/")}/`);
  if (search) url.search = search;
  return url;
}

// Adres klienta z nagłówków hostingu. Vercel ustawia x-real-ip i x-forwarded-for (pierwszy wpis to klient).
// Wartość i tak sprawdza backend (zły adres ignoruje), tu odrzucamy tylko oczywiste śmieci.
const IP_CHARS = /^[0-9a-fA-F:.]{2,45}$/;
export function clientIp(headers: Headers): string | null {
  const raw = headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0] ?? "";
  const ip = raw.trim();
  return IP_CHARS.test(ip) ? ip : null;
}

/** Ochrona przed CSRF dla żądań zmieniających dane: przeglądarka zawsze wysyła Origin, a musi to być nasza własna strona. */
export function sameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  const host = headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Czy ogólne proxy może przekazać taką ścieżkę. Punkty logowania (login, refresh, logout, register) mają własne
 * trasy, które trzymają tokeny w ciasteczkach: przez ogólne proxy odpowiedź z tokenami trafiłaby do JavaScriptu,
 * a o to właśnie chodziło, żeby nie trafiała. Z grupy "auth" przepuszczamy tylko "me" (i to, co pod nim).
 */
export function proxyAllowed(segments: string[]): boolean {
  return segments[0] !== "auth" || segments[1] === "me";
}

export const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];
