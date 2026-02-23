import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, type JwtPayload } from "./session";
import type { UserRole } from "@prisma/client";

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Extract and verify JWT from request.
 * Also validates CSRF token for mutating requests.
 */
export function authenticate(req: NextRequest): JwtPayload {
  const token = req.cookies.get("access_token")?.value;
  if (!token) {
    throw new AuthError("Authentication required");
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    throw new AuthError("Invalid or expired token");
  }

  // CSRF check for mutating methods
  const method = req.method.toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrfCookie = req.cookies.get("csrf_token")?.value;
    const csrfHeader = req.headers.get("x-csrf-token");
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      throw new AuthError("CSRF token mismatch", 403);
    }
  }

  return payload;
}

/**
 * Require specific role(s).
 */
export function requireRole(
  payload: JwtPayload,
  ...roles: UserRole[]
): void {
  if (!roles.includes(payload.role)) {
    throw new AuthError(
      `Requires role: ${roles.join(" or ")}`,
      403
    );
  }
}

/**
 * Require user belongs to the specified organization.
 */
export function requireOrg(
  payload: JwtPayload,
  organizationId: string
): void {
  if (payload.role === "SUPER_ADMIN") return; // Super admin bypasses
  if (payload.orgId !== organizationId) {
    throw new AuthError("Access denied for this organization", 403);
  }
}

/**
 * Helper to create error responses from auth errors.
 */
export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
