import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-site-locale", request.nextUrl.pathname.startsWith("/zh") ? "zh" : "en");

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|brand).*)"],
};
