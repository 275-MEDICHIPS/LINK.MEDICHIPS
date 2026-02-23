import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/utils/api-response";
import type { TaskStatus, Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateTaskData {
  lessonId?: string;
  assigneeId: string;
  creatorId: string;
  title: string;
  description?: string;
  checklist?: Array<{ label: string; done: boolean }>;
  dueDate?: Date;
}

interface SubmitEvidenceData {
  fileUrl: string;
  fileType: string;
  gpsLat?: number;
  gpsLng?: number;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Task generation from lesson content
// ---------------------------------------------------------------------------

/**
 * Auto-generate tasks from a lesson's published content.
 * Looks at ContentVersion body for mission/task definitions.
 */
export async function generateTasksForLesson(
  lessonId: string,
  userId: string
) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      translations: true,
      versions: {
        where: { status: "PUBLISHED" },
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  if (!lesson) {
    throw new ApiError("Lesson not found", 404);
  }

  const publishedVersion = lesson.versions[0];
  if (!publishedVersion) {
    throw new ApiError("No published content version for this lesson", 404);
  }

  const body = publishedVersion.body as Record<string, unknown>;
  const taskDefinitions = (body.tasks ?? body.missions ?? []) as Array<{
    title: string;
    description?: string;
    checklist?: Array<{ label: string; done: boolean }>;
  }>;

  // If no explicit tasks in content, auto-generate a completion task
  if (taskDefinitions.length === 0) {
    const title = lesson.translations[0]?.title ?? `Lesson ${lesson.orderIndex + 1}`;
    taskDefinitions.push({
      title: `Complete: ${title}`,
      description: `Complete all activities in this lesson and submit evidence of completion.`,
    });
  }

  const tasks = await prisma.$transaction(
    taskDefinitions.map((def) =>
      prisma.task.create({
        data: {
          lessonId,
          assigneeId: userId,
          source: "AUTO_GENERATED",
          status: "PENDING",
          title: def.title,
          description: def.description,
          checklist: def.checklist as Prisma.InputJsonValue ?? undefined,
        },
      })
    )
  );

  return tasks;
}

// ---------------------------------------------------------------------------
// Task assignment
// ---------------------------------------------------------------------------

/**
 * Assign a task to a learner (supervisor action).
 */
export async function assignTask(
  taskId: string,
  assigneeId: string,
  supervisorId: string
) {
  const assignee = await prisma.user.findUnique({
    where: { id: assigneeId },
  });
  if (!assignee) {
    throw new ApiError("Assignee not found", 404);
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      assigneeId,
      creatorId: supervisorId,
      source: "SUPERVISOR_ASSIGNED",
    },
  });

  return task;
}

// ---------------------------------------------------------------------------
// Task queries
// ---------------------------------------------------------------------------

/**
 * Get tasks assigned to a user, optionally filtered by status.
 */
export async function getMyTasks(
  userId: string,
  status?: TaskStatus,
  page = 1,
  pageSize = 20
) {
  const where: Prisma.TaskWhereInput = {
    assigneeId: userId,
    ...(status ? { status } : {}),
  };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        lesson: {
          select: {
            id: true,
            contentType: true,
            translations: { select: { locale: true, title: true } },
          },
        },
        evidence: true,
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.task.count({ where }),
  ]);

  return { tasks, total, page, pageSize };
}

/**
 * Get a single task with full details.
 */
export async function getTask(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      lesson: {
        include: {
          translations: true,
          module: {
            include: {
              course: {
                include: { translations: true },
              },
            },
          },
        },
      },
      assignee: {
        select: { id: true, name: true, avatarUrl: true },
      },
      creator: {
        select: { id: true, name: true, avatarUrl: true },
      },
      evidence: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!task) {
    throw new ApiError("Task not found", 404);
  }

  return task;
}

// ---------------------------------------------------------------------------
// Task status updates
// ---------------------------------------------------------------------------

/**
 * Update task status. Enforces valid transitions.
 */
export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new ApiError("Task not found", 404);
  }

  // Valid status transitions
  const validTransitions: Record<TaskStatus, TaskStatus[]> = {
    PENDING: ["IN_PROGRESS"],
    IN_PROGRESS: ["SUBMITTED", "PENDING"],
    SUBMITTED: ["VERIFIED", "REJECTED"],
    VERIFIED: [], // Terminal state
    REJECTED: ["IN_PROGRESS", "SUBMITTED"],
  };

  if (!validTransitions[task.status].includes(status)) {
    throw new ApiError(
      `Invalid status transition: ${task.status} -> ${status}`,
      400
    );
  }

  const updateData: Prisma.TaskUpdateInput = {
    status,
    ...(status === "VERIFIED" ? { completedAt: new Date() } : {}),
  };

  return prisma.task.update({
    where: { id: taskId },
    data: updateData,
  });
}

// ---------------------------------------------------------------------------
// Evidence submission
// ---------------------------------------------------------------------------

/**
 * Submit evidence for a task. Task must be in valid state.
 */
export async function submitTaskEvidence(
  taskId: string,
  evidence: SubmitEvidenceData
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new ApiError("Task not found", 404);
  }

  if (!["PENDING", "IN_PROGRESS", "REJECTED"].includes(task.status)) {
    throw new ApiError(
      "Evidence can only be submitted for pending, in-progress, or rejected tasks",
      400
    );
  }

  const created = await prisma.taskEvidence.create({
    data: {
      taskId,
      fileUrl: evidence.fileUrl,
      fileType: evidence.fileType,
      gpsLat: evidence.gpsLat,
      gpsLng: evidence.gpsLng,
      metadata: evidence.metadata as Prisma.InputJsonValue ?? undefined,
    },
  });

  // Auto-transition to IN_PROGRESS if PENDING
  if (task.status === "PENDING") {
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "IN_PROGRESS" },
    });
  }

  return created;
}

// ---------------------------------------------------------------------------
// Task verification
// ---------------------------------------------------------------------------

/**
 * Verify a task (supervisor/mentor action).
 * Optionally includes digital signature for audit trail.
 */
export async function verifyTask(
  taskId: string,
  verifierId: string,
  result: "VERIFIED" | "REJECTED",
  digitalSignature?: string
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new ApiError("Task not found", 404);
  }

  if (task.status !== "SUBMITTED") {
    throw new ApiError("Task must be in SUBMITTED status to verify", 400);
  }

  // Verify the verifier has appropriate role
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      userId: verifierId,
      role: { in: ["SUPERVISOR", "MENTOR", "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN"] },
      isActive: true,
    },
  });

  if (!membership) {
    throw new ApiError("User is not authorized to verify tasks", 403);
  }

  const newStatus: TaskStatus = result;
  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: newStatus,
      digitalSignature,
      completedAt: result === "VERIFIED" ? new Date() : undefined,
    },
  });

  // Award XP on verification
  if (result === "VERIFIED") {
    const xpKey = `task_complete:${task.assigneeId}:${taskId}`;
    const existingXp = await prisma.xpLedger.findUnique({
      where: { idempotencyKey: xpKey },
    });

    if (!existingXp) {
      await prisma.xpLedger.create({
        data: {
          userId: task.assigneeId,
          action: "TASK_COMPLETE",
          amount: 30,
          entityType: "Task",
          entityId: taskId,
          idempotencyKey: xpKey,
        },
      });
    }
  }

  return updatedTask;
}

// ---------------------------------------------------------------------------
// Supervisor review queue
// ---------------------------------------------------------------------------

/**
 * Get tasks pending review for a supervisor.
 * Shows tasks in SUBMITTED status from the supervisor's organization.
 */
export async function getTasksForReview(
  supervisorId: string,
  page = 1,
  pageSize = 20
) {
  // Find supervisor's organization
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      userId: supervisorId,
      role: { in: ["SUPERVISOR", "MENTOR", "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN"] },
      isActive: true,
    },
  });

  if (!membership) {
    throw new ApiError("User is not authorized to review tasks", 403);
  }

  // Get all learners in the same organization
  const orgMembers = await prisma.organizationMembership.findMany({
    where: {
      organizationId: membership.organizationId,
      isActive: true,
    },
    select: { userId: true },
  });

  const memberIds = orgMembers.map((m) => m.userId);

  const where: Prisma.TaskWhereInput = {
    assigneeId: { in: memberIds },
    status: "SUBMITTED",
  };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: { id: true, name: true, avatarUrl: true },
        },
        lesson: {
          select: {
            id: true,
            translations: { select: { locale: true, title: true } },
          },
        },
        evidence: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { updatedAt: "asc" }, // Oldest first for FIFO review
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.task.count({ where }),
  ]);

  return { tasks, total, page, pageSize };
}

/**
 * Create a task manually (supervisor creates and assigns).
 */
export async function createTask(data: CreateTaskData) {
  const assignee = await prisma.user.findUnique({
    where: { id: data.assigneeId },
  });
  if (!assignee) {
    throw new ApiError("Assignee not found", 404);
  }

  if (data.lessonId) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: data.lessonId },
    });
    if (!lesson) {
      throw new ApiError("Lesson not found", 404);
    }
  }

  return prisma.task.create({
    data: {
      lessonId: data.lessonId,
      assigneeId: data.assigneeId,
      creatorId: data.creatorId,
      source: "SUPERVISOR_ASSIGNED",
      status: "PENDING",
      title: data.title,
      description: data.description,
      checklist: data.checklist as Prisma.InputJsonValue ?? undefined,
      dueDate: data.dueDate,
    },
  });
}
