import { NextRequest, NextResponse } from "next/server";
import { backendFetch, setSessionCookies } from "@/lib/server/backend";
import { clientIp, sameOrigin } from "@/lib/server/proxy-utils";

// Logowanie: przeglądarka wysyła login i hasło tutaj, serwer Next.js prosi backend o tokeny i zapisuje je w ciasteczkach
// httpOnly. Do przeglądarki wraca tylko nazwa i rola. Zły login to ten sam kod co w backendzie (400, 401, 429), bez szczegółów.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req.headers)) return NextResponse.json({ detail: "Niedozwolone źródło żądania" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (typeof body?.username !== "string" || typeof body?.password !== "string") return NextResponse.json({ detail: "Nieprawidłowe dane" }, { status: 400 });
  const ip = clientIp(req.headers);

  const login = await backendFetch(["auth", "login"], { method: "POST", body: JSON.stringify({ username: body.username, password: body.password }), ip });
  if (!login?.ok) {
    const res = NextResponse.json({ status: login?.status ?? 502 }, { status: login?.status ?? 502 });
    const retry = login?.headers.get("Retry-After");
    if (retry) res.headers.set("Retry-After", retry);
    return res;
  }
  const tokens = await login.json().catch(() => null);
  if (typeof tokens?.access !== "string" || typeof tokens?.refresh !== "string") return NextResponse.json({ status: 502 }, { status: 502 });

  // login zwraca tylko tokeny; nazwę i rolę bierzemy z /auth/me/
  const me = await backendFetch(["auth", "me"], { token: tokens.access, ip });
  const user = me?.ok ? await me.json().catch(() => null) : null;
  if (typeof user?.username !== "string" || typeof user?.role !== "string") return NextResponse.json({ status: 502 }, { status: 502 });

  const res = NextResponse.json({ username: user.username, role: user.role });
  setSessionCookies(res, tokens);
  return res;
}
