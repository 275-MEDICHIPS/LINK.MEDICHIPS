import { prisma } from "@/lib/db/prisma";

export class AuditService {
  /**
   * Log a content audit event.
   */
  async logContentAction(params: {
    entityType: string;
    entityId: string;
    action: string;
    userId: string;
    previousState?: Record<string, unknown>;
    newState?: Record<string, unknown>;
    ipAddress?: string;
  }): Promise<void> {
    await prisma.contentAuditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        userId: params.userId,
        previousState: params.previousState ? JSON.parse(JSON.stringify(params.previousState)) : undefined,
        newState: params.newState ? JSON.parse(JSON.stringify(params.newState)) : undefined,
        ipAddress: params.ipAddress,
      },
    });
  }

  /**
   * Get audit trail for an entity.
   */
  async getAuditTrail(entityType: string, entityId: string) {
    return prisma.contentAuditLog.findMany({
      where: { entityType, entityId },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Get recent audit logs.
   */
  async getRecentLogs(params: {
    action?: string;
    limit?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (params.action) where.action = params.action;

    return prisma.contentAuditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
      },
      take: params.limit || 50,
      orderBy: { createdAt: "desc" },
    });
  }
}
