import { NextRequest, NextResponse } from "next/server";
import { ACCESS, REFRESH, backendFetch, clearSessionCookies } from "@/lib/server/backend";
import { clientIp, sameOrigin } from "@/lib/server/proxy-utils";

// Wylogowanie: ciasteczka znikają zawsze, a unieważnienie refresh w backendzie jest "w miarę możliwości"
// (wylogowanie lokalne ma działać także wtedy, gdy backend akurat nie odpowiada).
export async function POST(req: NextRequest) {
  if (!sameOrigin(req.headers)) return NextResponse.json({ detail: "Niedozwolone źródło żądania" }, { status: 403 });
  const refresh = req.cookies.get(REFRESH)?.value;
  const access = req.cookies.get(ACCESS)?.value;
  if (refresh) await backendFetch(["auth", "logout"], { method: "POST", body: JSON.stringify({ refresh }), token: access, ip: clientIp(req.headers) });
  const res = new NextResponse(null, { status: 204 });
  clearSessionCookies(res);
  return res;
}
