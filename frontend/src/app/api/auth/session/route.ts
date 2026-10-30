import { NextRequest, NextResponse } from "next/server";
import { authedFetch, clearSessionCookies, setSessionCookies } from "@/lib/server/backend";

// Kto jest zalogowany. Przeglądarka nie widzi tokenów, więc pyta o to tutaj. Zawsze 200: brak sesji to {user: null},
// a nie błąd (inaczej każde wejście na stronę gościa zostawiałoby czerwony błąd 401 w konsoli).
export async function GET(req: NextRequest) {
  const { response, fresh, expired } = await authedFetch(req, ["auth", "me"]);
  const data = response?.ok ? await response.json().catch(() => null) : null;
  const user = typeof data?.username === "string" && typeof data?.role === "string" ? { username: data.username, role: data.role } : null;
  const res = NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
  if (fresh && user) setSessionCookies(res, fresh);
  if (expired || (!user && fresh)) clearSessionCookies(res);
  return res;
}
