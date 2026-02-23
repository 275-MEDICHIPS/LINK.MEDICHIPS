import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/invite",
  "/verify",
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
  "/api/v1/auth/invite",
  "/api/v1/health",
];

const SUPPORTED_LOCALES = ["en", "ko", "km", "sw", "fr"];
const DEFAULT_LOCALE = "ko";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/locales") ||
    pathname.includes(".") // static files
  ) {
    return NextResponse.next();
  }

  // Locale detection for non-API routes
  if (!pathname.startsWith("/api")) {
    const cookieLocale = request.cookies.get("locale")?.value;
    const acceptLang = request.headers.get("accept-language");
    const detectedLocale = cookieLocale ||
      SUPPORTED_LOCALES.find((l) => acceptLang?.startsWith(l)) ||
      DEFAULT_LOCALE;

    const response = NextResponse.next();
    response.headers.set("x-locale", detectedLocale);

    // Auth check for protected routes
    const isPublic = PUBLIC_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );

    if (!isPublic) {
      const token = request.cookies.get("access_token")?.value;
      if (!token) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    return response;
  }

  // API routes — CORS headers
  const response = NextResponse.next();
  response.headers.set("X-Request-Id", crypto.randomUUID());
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
