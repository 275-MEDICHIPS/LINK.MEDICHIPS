import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifyPin, isAccountLocked, calculateLockoutExpiry } from "@/lib/auth/pin";
import {
  signAccessToken,
  signRefreshToken,
  generateCsrfToken,
  setAuthCookies,
} from "@/lib/auth/session";
import { success, handleError, ApiError } from "@/lib/utils/api-response";

const pinLoginSchema = z.object({
  method: z.literal("pin"),
  pin: z.string().length(8),
});

const emailLoginSchema = z.object({
  method: z.literal("email"),
  email: z.string().email(),
  password: z.string().min(1),
});

const loginSchema = z.discriminatedUnion("method", [
  pinLoginSchema,
  emailLoginSchema,
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = loginSchema.parse(body);

    if (input.method === "pin") {
      // Find user auth with PIN method
      const userAuth = await prisma.userAuth.findFirst({
        where: {
          method: "PIN_CODE",
          isActive: true,
        },
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

      // Generic error to prevent user enumeration
      if (!userAuth) {
        throw new ApiError("Invalid credentials", 401);
      }

      // Check lockout
      if (
        isAccountLocked(userAuth.failedAttempts, userAuth.lockedUntil)
      ) {
        throw new ApiError(
          "Account locked. Try again later.",
          429
        );
      }

      // Verify PIN
      const valid = await verifyPin(input.pin, userAuth.credential);
      if (!valid) {
        const newAttempts = userAuth.failedAttempts + 1;
        const lockedUntil =
          newAttempts >= 5
            ? calculateLockoutExpiry(newAttempts)
            : null;

        await prisma.userAuth.update({
          where: { id: userAuth.id },
          data: {
            failedAttempts: newAttempts,
            lockedUntil,
          },
        });

        throw new ApiError("Invalid credentials", 401);
      }

      // Reset failed attempts on success
      await prisma.userAuth.update({
        where: { id: userAuth.id },
        data: { failedAttempts: 0, lockedUntil: null },
      });

      const orgId = userAuth.user.memberships[0]?.organizationId || "";

      // Create tokens
      const accessToken = signAccessToken({
        userId: userAuth.userId,
        role: userAuth.user.memberships[0]?.role || "LEARNER",
        orgId,
      });
      const refreshToken = signRefreshToken(userAuth.userId);
      const csrfToken = generateCsrfToken();

      // Store session
      await prisma.userSession.create({
        data: {
          userId: userAuth.userId,
          deviceInfo: {
            userAgent: req.headers.get("user-agent") || "unknown",
          },
          ipAddress:
            req.headers.get("x-forwarded-for") || "unknown",
          csrfToken,
          refreshToken,
          expiresAt: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ),
        },
      });

      await setAuthCookies(accessToken, refreshToken, csrfToken);

      // Update last active
      await prisma.user.update({
        where: { id: userAuth.userId },
        data: { lastActiveAt: new Date() },
      });

      return success({
        userId: userAuth.userId,
        user: {
          id: userAuth.userId,
          name: userAuth.user.name,
          email: userAuth.user.email,
          role: userAuth.user.memberships[0]?.role || "LEARNER",
          orgId,
          avatarUrl: userAuth.user.avatarUrl,
          locale: userAuth.user.preferredLocale || "en",
        },
      });
    }

    // Email login
    if (input.method === "email") {
      const userAuth = await prisma.userAuth.findFirst({
        where: {
          method: "EMAIL_PASSWORD",
          identifier: input.email,
          isActive: true,
        },
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

      if (!userAuth) {
        throw new ApiError("Invalid credentials", 401);
      }

      if (
        isAccountLocked(userAuth.failedAttempts, userAuth.lockedUntil)
      ) {
        throw new ApiError("Account locked. Try again later.", 429);
      }

      const { compare } = await import("bcryptjs");
      const valid = await compare(input.password, userAuth.credential);
      if (!valid) {
        await prisma.userAuth.update({
          where: { id: userAuth.id },
          data: {
            failedAttempts: userAuth.failedAttempts + 1,
            lockedUntil:
              userAuth.failedAttempts + 1 >= 5
                ? calculateLockoutExpiry(userAuth.failedAttempts + 1)
                : null,
          },
        });
        throw new ApiError("Invalid credentials", 401);
      }

      await prisma.userAuth.update({
        where: { id: userAuth.id },
        data: { failedAttempts: 0, lockedUntil: null },
      });

      const orgId = userAuth.user.memberships[0]?.organizationId || "";

      const accessToken = signAccessToken({
        userId: userAuth.userId,
        role: userAuth.user.memberships[0]?.role || "LEARNER",
        orgId,
      });
      const refreshToken = signRefreshToken(userAuth.userId);
      const csrfToken = generateCsrfToken();

      await prisma.userSession.create({
        data: {
          userId: userAuth.userId,
          deviceInfo: {
            userAgent: req.headers.get("user-agent") || "unknown",
          },
          ipAddress: req.headers.get("x-forwarded-for") || "unknown",
          csrfToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await setAuthCookies(accessToken, refreshToken, csrfToken);

      await prisma.user.update({
        where: { id: userAuth.userId },
        data: { lastActiveAt: new Date() },
      });

      return success({
        userId: userAuth.userId,
        user: {
          id: userAuth.userId,
          name: userAuth.user.name,
          email: userAuth.user.email,
          role: userAuth.user.memberships[0]?.role || "LEARNER",
          orgId,
          avatarUrl: userAuth.user.avatarUrl,
          locale: userAuth.user.preferredLocale || "en",
        },
      });
    }

    throw new ApiError("Unsupported auth method", 400);
  } catch (error) {
    return handleError(error);
  }
}
