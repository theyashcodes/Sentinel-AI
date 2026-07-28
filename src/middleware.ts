import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const isProtectedRoute = request.nextUrl.pathname.startsWith("/dashboard");

  const sessionCookie = request.cookies.get("better-auth.session_token") || request.cookies.get("__Secure-better-auth.session_token");

  if (isProtectedRoute && !sessionCookie) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  if (request.nextUrl.pathname === "/") {
    if (sessionCookie) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
