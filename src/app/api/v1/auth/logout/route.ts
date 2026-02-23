import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { clearAuthCookies } from "@/lib/auth/session";
import { success, handleError } from "@/lib/utils/api-response";

export async function POST(req: NextRequest) {
  try {
    // Try to find and delete the session by refresh token
    const refreshToken = req.cookies.get("refresh_token")?.value;

    if (refreshToken) {
      // Delete the session from the database
      // Use deleteMany to avoid throwing if session doesn't exist
      await prisma.userSession.deleteMany({
        where: { refreshToken },
      });
    }

    // Clear all auth cookies regardless
    await clearAuthCookies();

    return success({ message: "Logged out successfully" });
  } catch (error) {
    // Even if DB deletion fails, still clear cookies
    try {
      await clearAuthCookies();
    } catch {
      // Silently ignore cookie clearing errors
    }
    return handleError(error);
  }
}
