import {
  generateCertificateHash,
  generateProgressChecksum,
  verifyProgressChecksum,
  generateInviteCode,
  generateCertificateNumber,
} from "@/lib/utils/crypto";

describe("Crypto Utilities", () => {
  describe("generateCertificateHash", () => {
    it("generates consistent hash for same inputs", () => {
      const params = {
        certificateId: "cert-123",
        userId: "user-456",
        courseId: "course-789",
        issuedAt: new Date("2026-03-01T00:00:00Z"),
      };
      const hash1 = generateCertificateHash(params);
      const hash2 = generateCertificateHash(params);
      expect(hash1).toBe(hash2);
    });

    it("generates different hash for different inputs", () => {
      const hash1 = generateCertificateHash({
        certificateId: "cert-1",
        userId: "user-1",
        courseId: "course-1",
        issuedAt: new Date(),
      });
      const hash2 = generateCertificateHash({
        certificateId: "cert-2",
        userId: "user-1",
        courseId: "course-1",
        issuedAt: new Date(),
      });
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("progress checksum", () => {
    it("generates and verifies checksum", () => {
      const userId = "user-123";
      const data = { lessonId: "lesson-1", score: 85 };
      const timestamp = Date.now();
      const secret = "device-secret-key";

      const checksum = generateProgressChecksum({ userId, data, timestamp, deviceSecret: secret });
      expect(verifyProgressChecksum(checksum, userId, data, timestamp, secret)).toBe(true);
    });

    it("rejects tampered data", () => {
      const userId = "user-123";
      const data = { lessonId: "lesson-1", score: 85 };
      const timestamp = Date.now();
      const secret = "device-secret-key";

      const checksum = generateProgressChecksum({ userId, data, timestamp, deviceSecret: secret });
      const tamperedData = { lessonId: "lesson-1", score: 100 }; // Changed score
      expect(verifyProgressChecksum(checksum, userId, tamperedData, timestamp, secret)).toBe(false);
    });
  });

  describe("generateInviteCode", () => {
    it("generates an 8-character code", () => {
      const code = generateInviteCode();
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[A-Z0-9_-]+$/);
    });
  });

  describe("generateCertificateNumber", () => {
    it("follows ML-YYYYMM-XXXXX format", () => {
      const number = generateCertificateNumber();
      expect(number).toMatch(/^ML-\d{6}-[A-F0-9]{5}$/);
    });
  });
});
