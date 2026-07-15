import { NextResponse, type NextRequest } from "next/server";

const productionHost = "auctusheritage.com";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0].toLowerCase() || "";

  if (
    hostname === "www.auctusheritage.com" ||
    hostname === "little-treasures-from-china.vercel.app" ||
    (hostname.endsWith(".vercel.app") && hostname.includes("little-treasures-from-china"))
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.protocol = "https:";
    redirectUrl.hostname = productionHost;
    redirectUrl.port = "";
    return NextResponse.redirect(redirectUrl, 301);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-site-locale", request.nextUrl.pathname.startsWith("/zh") ? "zh" : "en");

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|brand).*)"],
};
