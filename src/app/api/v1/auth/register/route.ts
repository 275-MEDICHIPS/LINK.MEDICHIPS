import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { generatePin, hashPin } from "@/lib/auth/pin";
import {
  signAccessToken,
  signRefreshToken,
  generateCsrfToken,
  setAuthCookies,
} from "@/lib/auth/session";
import { success, handleError, ApiError } from "@/lib/utils/api-response";

const emailRegisterSchema = z.object({
  method: z.literal("email"),
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
});

const inviteRegisterSchema = z.object({
  method: z.literal("invite"),
  name: z.string().min(1, "Name is required").max(100),
  inviteCode: z.string().min(1, "Invite code is required"),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

const registerSchema = z.discriminatedUnion("method", [
  emailRegisterSchema,
  inviteRegisterSchema,
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = registerSchema.parse(body);

    if (input.method === "email") {
      // Check for existing email
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      });
      if (existingUser) {
        throw new ApiError("Email already registered", 409, "EMAIL_EXISTS");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 12);

      // Create user, auth method, and default membership in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: input.name,
            email: input.email,
            phone: input.phone,
          },
        });

        await tx.userAuth.create({
          data: {
            userId: user.id,
            method: "EMAIL_PASSWORD",
            identifier: input.email,
            credential: hashedPassword,
          },
        });

        return user;
      });

      // Create tokens and session
      const accessToken = signAccessToken({
        userId: result.id,
        role: "LEARNER",
        orgId: "",
      });
      const refreshToken = signRefreshToken(result.id);
      const csrfToken = generateCsrfToken();

      await prisma.userSession.create({
        data: {
          userId: result.id,
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

      return success(
        {
          user: {
            id: result.id,
            name: result.name,
            email: result.email,
          },
        },
        201
      );
    }

    if (input.method === "invite") {
      // Validate invite code
      const invite = await prisma.inviteCode.findUnique({
        where: { code: input.inviteCode },
        include: { organization: true },
      });

      if (!invite) {
        throw new ApiError("Invalid invite code", 404, "INVITE_NOT_FOUND");
      }

      if (invite.expiresAt < new Date()) {
        throw new ApiError("Invite code has expired", 410, "INVITE_EXPIRED");
      }

      if (invite.useCount >= invite.maxUses) {
        throw new ApiError(
          "Invite code has been fully used",
          410,
          "INVITE_EXHAUSTED"
        );
      }

      // Check for duplicate email if provided
      if (input.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: input.email },
        });
        if (existingUser) {
          throw new ApiError("Email already registered", 409, "EMAIL_EXISTS");
        }
      }

      // Generate PIN for invite-based registration
      const plainPin = generatePin();
      const hashedPinValue = await hashPin(plainPin);

      // Create user, auth, membership, and update invite in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: input.name,
            email: input.email,
            phone: input.phone,
          },
        });

        // Create INVITE_CODE auth method
        await tx.userAuth.create({
          data: {
            userId: user.id,
            method: "INVITE_CODE",
            identifier: invite.code,
            credential: hashedPinValue,
          },
        });

        // Also create PIN_CODE auth method so they can log in with PIN
        await tx.userAuth.create({
          data: {
            userId: user.id,
            method: "PIN_CODE",
            identifier: user.id,
            credential: hashedPinValue,
          },
        });

        // Create organization membership with the role from invite
        await tx.organizationMembership.create({
          data: {
            userId: user.id,
            organizationId: invite.organizationId,
            role: invite.role,
          },
        });

        // Update invite usage
        await tx.inviteCode.update({
          where: { id: invite.id },
          data: {
            useCount: { increment: 1 },
            usedBy: user.id,
            usedAt: new Date(),
          },
        });

        return user;
      });

      // Create tokens and session
      const accessToken = signAccessToken({
        userId: result.id,
        role: invite.role,
        orgId: invite.organizationId,
      });
      const refreshToken = signRefreshToken(result.id);
      const csrfToken = generateCsrfToken();

      await prisma.userSession.create({
        data: {
          userId: result.id,
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

      return success(
        {
          user: {
            id: result.id,
            name: result.name,
            email: result.email,
          },
          pin: plainPin,
          organization: {
            id: invite.organization.id,
            name: invite.organization.name,
          },
        },
        201
      );
    }

    throw new ApiError("Unsupported registration method", 400);
  } catch (error) {
    return handleError(error);
  }
}
