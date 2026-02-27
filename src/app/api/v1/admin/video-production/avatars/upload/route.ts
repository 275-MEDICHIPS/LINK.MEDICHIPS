/**
 * POST /api/v1/admin/video-production/avatars/upload
 * Server-side avatar image upload + DB record creation (single step)
 *
 * Accepts FormData: { file: File, name: string, gender?: "male"|"female" }
 * Returns: { id, name, imageUrl, gcsPath, gender }
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { uploadBuffer } from "@/lib/storage/gcs";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const formData = await req.formData();
    const file = formData.get("file");
    const name = formData.get("name");
    const gender = formData.get("gender");

    // Validate inputs
    if (!(file instanceof File)) {
      return new Response(
        JSON.stringify({ data: null, error: { message: "file is required" } }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (typeof name !== "string" || !name.trim()) {
      return new Response(
        JSON.stringify({ data: null, error: { message: "name is required" } }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return new Response(
        JSON.stringify({
          data: null,
          error: { message: "Only JPEG, PNG, and WebP images are allowed" },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (file.size > MAX_SIZE) {
      return new Response(
        JSON.stringify({
          data: null,
          error: { message: "File size must be under 5 MB" },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Upload to GCS
    const orgId = payload.orgId || "global";
    const ext = file.name.split(".").pop() || "jpg";
    const gcsPath = `avatars/${orgId}/${Date.now()}-${name.trim().replace(/\s+/g, "_")}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const publicUrl = await uploadBuffer("media", gcsPath, buffer, file.type);

    // Create DB record
    const avatar = await prisma.avatar.create({
      data: {
        name: name.trim(),
        imageUrl: publicUrl,
        gcsPath,
        gender: gender === "male" || gender === "female" ? gender : undefined,
        tags: [],
        organizationId: payload.orgId || undefined,
        isGlobal: !payload.orgId,
        createdBy: payload.sub,
      },
    });

    return success(
      {
        id: avatar.id,
        name: avatar.name,
        imageUrl: avatar.imageUrl,
        gcsPath: avatar.gcsPath,
        gender: avatar.gender,
      },
      201
    );
  } catch (error) {
    return handleError(error);
  }
}
