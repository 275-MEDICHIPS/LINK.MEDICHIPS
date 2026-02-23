import * as crypto from "crypto";

/**
 * Generate a verification hash for certificates.
 * SHA-256(certificateId + userId + courseId + issuedAt + salt)
 */
export function generateCertificateHash(params: {
  certificateId: string;
  userId: string;
  courseId: string;
  issuedAt: Date;
}): string {
  const salt = process.env.CERTIFICATE_HASH_SALT || "medichips-link-certs";
  const payload = `${params.certificateId}:${params.userId}:${params.courseId}:${params.issuedAt.toISOString()}:${salt}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/**
 * Generate HMAC-SHA256 checksum for offline progress data.
 * Used to verify data integrity during sync (FIX-5).
 */
export function generateProgressChecksum(params: {
  userId: string;
  data: Record<string, unknown>;
  timestamp: number;
  deviceSecret: string;
}): string {
  const payload = `${params.userId}:${JSON.stringify(params.data)}:${params.timestamp}`;
  return crypto
    .createHmac("sha256", params.deviceSecret)
    .update(payload)
    .digest("hex");
}

/**
 * Verify a progress checksum.
 */
export function verifyProgressChecksum(
  checksum: string,
  userId: string,
  data: Record<string, unknown>,
  timestamp: number,
  deviceSecret: string
): boolean {
  const expected = generateProgressChecksum({ userId, data, timestamp, deviceSecret });
  return crypto.timingSafeEqual(
    Buffer.from(checksum, "hex"),
    Buffer.from(expected, "hex")
  );
}

/**
 * Generate a random invite code.
 */
export function generateInviteCode(): string {
  return crypto.randomBytes(6).toString("base64url").slice(0, 8).toUpperCase();
}

/**
 * Generate a certificate issue number.
 * Format: ML-YYYYMM-XXXXX (e.g., ML-202603-A1B2C)
 */
export function generateCertificateNumber(): string {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const random = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 5);
  return `ML-${yearMonth}-${random}`;
}

/**
 * Generate a CSRF token.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generate a device fingerprint from request headers.
 */
export function generateDeviceFingerprint(
  userAgent: string,
  ip: string
): string {
  return crypto
    .createHash("sha256")
    .update(`${userAgent}:${ip}`)
    .digest("hex")
    .slice(0, 16);
}
