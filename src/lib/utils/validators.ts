import { z } from "zod";

/**
 * Common validation schemas used across API routes.
 */

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const uuidSchema = z.string().uuid("Invalid ID format");

export const localeSchema = z.enum(["en", "ko", "km", "sw", "fr"]);

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const emailSchema = z.string().email("Invalid email address").max(255);

export const phoneSchema = z.string().regex(
  /^\+?[1-9]\d{1,14}$/,
  "Invalid phone number (E.164 format)"
);

export const pinSchema = z.string().regex(
  /^[A-HJ-NP-Za-hj-np-z2-9]{8}$/,
  "PIN must be 8 alphanumeric characters"
);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/[a-z]/, "Must include a lowercase letter")
  .regex(/[A-Z]/, "Must include an uppercase letter")
  .regex(/[0-9]/, "Must include a number");

export const riskLevelSchema = z.enum(["L1", "L2", "L3"]);

export const contentStatusSchema = z.enum([
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "ARCHIVED",
]);

export const userRoleSchema = z.enum([
  "SUPER_ADMIN",
  "ORG_ADMIN",
  "INSTRUCTOR",
  "SUPERVISOR",
  "LEARNER",
]);

// File upload validation
export const fileUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().regex(/^[\w-]+\/[\w.+-]+$/, "Invalid content type"),
  fileSize: z.number().int().positive().max(100 * 1024 * 1024), // 100MB max
});

// Allowed file types per upload context
export const ALLOWED_FILE_TYPES = {
  image: ["image/jpeg", "image/png", "image/webp"],
  document: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  evidence: ["image/jpeg", "image/png", "video/mp4", "application/pdf"],
} as const;

export function validateFileType(
  contentType: string,
  context: keyof typeof ALLOWED_FILE_TYPES
): boolean {
  return (ALLOWED_FILE_TYPES[context] as readonly string[]).includes(contentType);
}
