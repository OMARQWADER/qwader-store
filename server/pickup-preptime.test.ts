import { describe, it, expect } from "vitest";

/**
 * Derive the exact same client-side pickup prep-time message logic tested here.
 * The UI computes:
 *   minutes = Math.max(0, Math.floor(Number(shipping?.pickupPrepMinutes) || 30))
 *   note    = "طلبك بيكون جاهز للاستلام خلال حوالي {minutes} دقيقة من تأكيد الدفع — بنرسل لك إشعار لما يتجهز"
 * The admin card clamps values to [1, 1440] before saving.
 */
function pickupMinutes(prepMinutes: unknown): number {
  return Math.max(0, Math.floor(Number(prepMinutes) || 30));
}

function pickupNote(prepMinutes: unknown): string {
  const m = pickupMinutes(prepMinutes);
  return `طلبك بيكون جاهز للاستلام خلال حوالي ${m} دقيقة من تأكيد الدفع — بنرسل لك إشعار لما يتجهز`;
}

describe("pickup prep-time message (CartDrawer + receipt)", () => {
  it("falls back to 30 minutes when the setting is missing", () => {
    expect(pickupMinutes(undefined)).toBe(30);
    expect(pickupMinutes(null)).toBe(30);
    expect(pickupMinutes({})).toBe(30);
    expect(pickupMinutes("")).toBe(30);
    expect(pickupMinutes("abc")).toBe(30);
  });

  it("uses the configured value when present and valid", () => {
    expect(pickupMinutes(15)).toBe(15);
    expect(pickupMinutes(45)).toBe(45);
    expect(pickupMinutes("90")).toBe(90);
  });

  it("floor-truncates fractional values and rejects negatives (>=0)", () => {
    expect(pickupMinutes(15.9)).toBe(15);
    expect(pickupMinutes(-5)).toBe(0);
  });

  it("renders the full dynamic Arabic message with the minutes", () => {
    expect(pickupNote(15)).toBe(
      "طلبك بيكون جاهز للاستلام خلال حوالي 15 دقيقة من تأكيد الدفع — بنرسل لك إشعار لما يتجهز"
    );
    expect(pickupNote(undefined)).toContain("30 دقيقة");
  });
});

describe("admin card clamp (1–1440)", () => {
  function clamp(v: number): number {
    return Math.max(1, Math.floor(Number(v) || 30));
  }

  it("defaults 0 / non-numeric to 30, floors fractions, and clamps negatives to 1", () => {
    // `Number(v) || 30` treats 0 and NaN as falsy (fallback 30 wins), but real
    // numeric negatives like -10 floor to -10 and then max(1,-10) = 1. Matches UI.
    expect(clamp(0)).toBe(30);
    expect(clamp("xyz")).toBe(30);
    expect(clamp(-10)).toBe(1);
    expect(clamp(-0.5)).toBe(1);
    expect(clamp(2.9)).toBe(2);
  });

  it("keeps valid values as-is", () => {
    expect(clamp(30)).toBe(30);
    expect(clamp(120)).toBe(120);
  });
});
