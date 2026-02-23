import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Generate a random 8-character alphanumeric PIN.
 * ~2.8 billion combinations (36^8 ≈ 2.8T actually).
 */
export function generatePin(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1 for readability
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join("");
}

/**
 * Hash PIN using bcrypt with 12 rounds.
 */
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_ROUNDS);
}

/**
 * Verify PIN against hash.
 */
export async function verifyPin(
  pin: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

/**
 * Check if account is locked due to failed attempts.
 */
export function isAccountLocked(
  failedAttempts: number,
  lockedUntil: Date | null
): boolean {
  if (failedAttempts < MAX_FAILED_ATTEMPTS) return false;
  if (!lockedUntil) return false;
  return new Date() < lockedUntil;
}

/**
 * Check if a character is in the readable character set (no I, O, 0, 1).
 */
export function isReadableChar(char: string): boolean {
  return "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".includes(char);
}

/**
 * Calculate lockout expiry with exponential backoff.
 * 5 fails = 15 min, 10 fails = 60 min, 15 fails = 240 min
 */
export function calculateLockoutExpiry(failedAttempts: number): Date {
  const multiplier = Math.floor(failedAttempts / MAX_FAILED_ATTEMPTS);
  const durationMs = LOCKOUT_DURATION_MS * Math.pow(2, multiplier - 1);
  return new Date(Date.now() + durationMs);
}
