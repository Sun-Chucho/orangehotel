import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Normalize staff portal URL casing so /STAFF (and variants) always resolve.
  if (pathname.toLowerCase() === "/staff" && pathname !== "/staff") {
    const url = request.nextUrl.clone();
    url.pathname = "/staff";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
