import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  verifyRefreshToken,
  signAccessToken,
  generateCsrfToken,
  setAuthCookies,
} from "@/lib/auth/session";
import { success, handleError, ApiError } from "@/lib/utils/api-response";

export async function POST(req: NextRequest) {
  try {
    const refreshTokenCookie = req.cookies.get("refresh_token")?.value;

    if (!refreshTokenCookie) {
      throw new ApiError("Refresh token required", 401, "NO_REFRESH_TOKEN");
    }

    // Verify the refresh token JWT
    const payload = verifyRefreshToken(refreshTokenCookie);
    if (!payload) {
      throw new ApiError(
        "Invalid or expired refresh token",
        401,
        "INVALID_REFRESH_TOKEN"
      );
    }

    // Find the session in the database
    const session = await prisma.userSession.findUnique({
      where: { refreshToken: refreshTokenCookie },
      include: {
        user: {
          include: {
            memberships: {
              where: { isActive: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!session) {
      throw new ApiError(
        "Session not found",
        401,
        "SESSION_NOT_FOUND"
      );
    }

    // Check if session has expired
    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await prisma.userSession.delete({ where: { id: session.id } });
      throw new ApiError(
        "Session expired",
        401,
        "SESSION_EXPIRED"
      );
    }

    // Check if user is still active
    if (!session.user.isActive) {
      await prisma.userSession.delete({ where: { id: session.id } });
      throw new ApiError(
        "Account deactivated",
        403,
        "ACCOUNT_DEACTIVATED"
      );
    }

    const membership = session.user.memberships[0];
    const role = membership?.role || "LEARNER";
    const orgId = membership?.organizationId || "";

    // Generate new access token and CSRF token
    const newAccessToken = signAccessToken({
      userId: session.userId,
      role,
      orgId,
    });
    const newCsrfToken = generateCsrfToken();

    // Update session's CSRF token and last activity
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        csrfToken: newCsrfToken,
        lastActivityAt: new Date(),
      },
    });

    // Set cookies — refresh token stays the same, only access + csrf rotate
    await setAuthCookies(newAccessToken, refreshTokenCookie, newCsrfToken);

    // Update user's last active timestamp
    await prisma.user.update({
      where: { id: session.userId },
      data: { lastActiveAt: new Date() },
    });

    return success({
      userId: session.userId,
      role,
      orgId,
    });
  } catch (error) {
    return handleError(error);
  }
}
