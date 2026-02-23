import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, handleAuthError } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);

    const sessions = await prisma.userSession.findMany({
      where: { userId: payload.sub, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        lastActivityAt: true,
        createdAt: true,
      },
      orderBy: { lastActivityAt: "desc" },
    });

    return success(sessions);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}

const revokeSchema = z.object({
  sessionId: z.string().uuid(),
});

export async function DELETE(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const body = await req.json();
    const { sessionId } = revokeSchema.parse(body);

    await prisma.userSession.update({
      where: { id: sessionId, userId: payload.sub },
      data: { expiresAt: new Date(0) },
    });

    return success({ message: "Session revoked" });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}
