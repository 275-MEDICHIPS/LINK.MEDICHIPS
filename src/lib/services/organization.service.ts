import { prisma } from "@/lib/db/prisma";
import type { UserRole } from "@prisma/client";
import { ApiError } from "@/lib/utils/api-response";

export const organizationService = {
  async getOrganization(orgId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId, deletedAt: null },
      include: {
        children: { where: { deletedAt: null } },
        programs: { where: { deletedAt: null } },
        _count: {
          select: {
            memberships: { where: { isActive: true } },
            courses: { where: { deletedAt: null } },
          },
        },
      },
    });
    if (!org) throw new ApiError("Organization not found", 404);
    return org;
  },

  async listOrganizations(parentId?: string) {
    return prisma.organization.findMany({
      where: { parentId: parentId || null, deletedAt: null },
      include: {
        _count: {
          select: { memberships: { where: { isActive: true } } },
        },
      },
      orderBy: { name: "asc" },
    });
  },

  async createOrganization(data: {
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
    parentId?: string;
  }) {
    const existing = await prisma.organization.findUnique({
      where: { slug: data.slug },
    });
    if (existing) throw new ApiError("Slug already taken", 409);
    return prisma.organization.create({ data });
  },

  async addMember(orgId: string, userId: string, role: UserRole) {
    return prisma.organizationMembership.upsert({
      where: {
        userId_organizationId: { userId, organizationId: orgId },
      },
      update: { role, isActive: true },
      create: {
        userId,
        organizationId: orgId,
        role,
      },
    });
  },

  async removeMember(orgId: string, userId: string) {
    return prisma.organizationMembership.update({
      where: {
        userId_organizationId: { userId, organizationId: orgId },
      },
      data: { isActive: false },
    });
  },

  async getMembers(orgId: string, role?: UserRole) {
    return prisma.organizationMembership.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        ...(role ? { role } : {}),
      },
      include: { user: true },
      orderBy: { joinedAt: "desc" },
    });
  },

  async createProgram(data: {
    organizationId: string;
    name: string;
    description?: string;
    country: string;
    startDate: Date;
    endDate?: Date;
  }) {
    return prisma.program.create({ data });
  },

  async enrollInProgram(programId: string, userId: string) {
    return prisma.programEnrollment.upsert({
      where: {
        userId_programId: { userId, programId },
      },
      update: {},
      create: { userId, programId },
    });
  },

  async bulkEnrollInProgram(programId: string, userIds: string[]) {
    const data = userIds.map((userId) => ({
      userId,
      programId,
    }));
    return prisma.programEnrollment.createMany({
      data,
      skipDuplicates: true,
    });
  },
};
