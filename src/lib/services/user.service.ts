import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/utils/api-response";

export const userService = {
  async getUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: {
        memberships: {
          where: { isActive: true },
          include: { organization: true },
        },
        streaks: true,
      },
    });
    if (!user) throw new ApiError("User not found", 404);
    return user;
  },

  async updateProfile(
    userId: string,
    data: {
      name?: string;
      preferredLocale?: string;
      avatarUrl?: string;
      connectivityLevel?: "HIGH" | "MEDIUM" | "LOW" | "OFFLINE";
    }
  ) {
    return prisma.user.update({
      where: { id: userId },
      data,
    });
  },

  async getUserDevices(userId: string) {
    return prisma.userSession.findMany({
      where: { userId },
      orderBy: { lastActivityAt: "desc" },
      take: 10,
    });
  },

  async revokeDevice(userId: string, sessionId: string) {
    return prisma.userSession.deleteMany({
      where: { id: sessionId, userId },
    });
  },

  async deactivateUser(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { isActive: false, deletedAt: new Date() },
    });
  },

  async searchUsers(
    orgId: string,
    query: string,
    page = 1,
    pageSize = 20
  ) {
    const where = {
      deletedAt: null,
      memberships: {
        some: { organizationId: orgId, isActive: true },
      },
      OR: [
        { name: { contains: query, mode: "insensitive" as const } },
        { email: { contains: query, mode: "insensitive" as const } },
      ],
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          memberships: {
            where: { organizationId: orgId },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: "asc" },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total };
  },
};
