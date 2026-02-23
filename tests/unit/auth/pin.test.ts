import { generatePin, hashPin, verifyPin, isReadableChar } from "@/lib/auth/pin";

describe("PIN System", () => {
  describe("generatePin", () => {
    it("generates an 8-character PIN", () => {
      const pin = generatePin();
      expect(pin).toHaveLength(8);
    });

    it("only contains readable characters (no I, O, 0, 1)", () => {
      for (let i = 0; i < 100; i++) {
        const pin = generatePin();
        for (const char of pin) {
          expect(isReadableChar(char)).toBe(true);
        }
        expect(pin).not.toMatch(/[IO01]/);
      }
    });

    it("generates unique PINs", () => {
      const pins = new Set<string>();
      for (let i = 0; i < 50; i++) {
        pins.add(generatePin());
      }
      // At least 45 unique PINs out of 50 (statistically near-certain)
      expect(pins.size).toBeGreaterThan(45);
    });
  });

  describe("hashPin and verifyPin", () => {
    it("correctly hashes and verifies a PIN", async () => {
      const pin = "Abc23XyZ";
      const hash = await hashPin(pin);
      expect(hash).not.toBe(pin);
      expect(await verifyPin(pin, hash)).toBe(true);
    });

    it("rejects wrong PIN", async () => {
      const hash = await hashPin("Abc23XyZ");
      expect(await verifyPin("WrongPIN", hash)).toBe(false);
    });
  });
});
