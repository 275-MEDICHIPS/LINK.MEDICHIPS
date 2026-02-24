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

const SUPPORTED_LOCALES = [
  "en", "ko", "km", "sw", "fr",
  "es", "pt", "ar", "hi", "zh",
  "ja", "id", "vi", "th", "bn",
  "am", "my", "de", "ru", "tr",
];
const DEFAULT_LOCALE = "en";

function parseAcceptLanguage(header: string): string | undefined {
  // Parse Accept-Language header and match against supported locales
  // e.g. "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7" → "ko"
  const entries = header.split(",").map((part) => {
    const [langTag, qPart] = part.trim().split(";");
    const q = qPart ? parseFloat(qPart.replace("q=", "")) : 1;
    return { lang: langTag.trim().toLowerCase(), q };
  });

  // Sort by quality descending
  entries.sort((a, b) => b.q - a.q);

  for (const { lang } of entries) {
    // Exact match (e.g. "en", "ko")
    if (SUPPORTED_LOCALES.includes(lang)) return lang;

    // Primary subtag match (e.g. "zh-CN" → "zh", "pt-BR" → "pt")
    const primary = lang.split("-")[0];
    if (SUPPORTED_LOCALES.includes(primary)) return primary;
  }

  return undefined;
}

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
      (acceptLang ? parseAcceptLanguage(acceptLang) : undefined) ||
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
