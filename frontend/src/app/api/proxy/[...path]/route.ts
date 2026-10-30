import { NextRequest, NextResponse } from "next/server";
import { authedFetch, clearSessionCookies, setSessionCookies } from "@/lib/server/backend";
import { SAFE_METHODS, proxyAllowed, sameOrigin } from "@/lib/server/proxy-utils";

// Ogólne proxy dla wywołań, które wymagają zalogowania (zapisy, "moje" dane). Przeglądarka woła /api/proxy/cocktails/...,
// serwer dokłada token z ciasteczka i przekazuje dalej. Odczyty publiczne nie idą tędy: zostają bezpośrednio do backendu.
async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  if (!SAFE_METHODS.includes(req.method) && !sameOrigin(req.headers)) return NextResponse.json({ detail: "Niedozwolone źródło żądania" }, { status: 403 });
  const { path } = await ctx.params;
  if (!proxyAllowed(path)) return NextResponse.json({ detail: "Niedozwolona ścieżka" }, { status: 403 });
  const body = SAFE_METHODS.includes(req.method) ? undefined : await req.text();

  const { response, fresh, expired } = await authedFetch(req, path, { method: req.method, body, search: req.nextUrl.search });
  if (!response) return NextResponse.json({ detail: "Niedozwolona ścieżka" }, { status: 400 });

  // odpowiedzi bez treści (204) muszą zostać bez treści
  const noBody = [204, 205, 304].includes(response.status);
  const res = new NextResponse(noBody ? null : await response.text(), { status: response.status });
  for (const name of ["content-type", "retry-after"]) {
    const value = response.headers.get(name);
    if (value) res.headers.set(name, value);
  }
  res.headers.set("Cache-Control", "no-store");
  if (fresh) setSessionCookies(res, fresh);
  if (expired) clearSessionCookies(res);
  return res;
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
