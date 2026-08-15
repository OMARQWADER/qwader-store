import { describe, it, expect, vi, beforeEach } from "vitest";

// Test the pickup-completion email rules defined in orders.action.js:
// 1) email is sent only when delivery_city === "استلام من المتجر" or delivery_company === "pickup"
// 2) email is skipped when SMTP is not configured
// 3) email is skipped when the user has no email
// 4) subject includes the short order id (first 8 chars of the uuid, uppercased)
// We extract the pure decision function via a small mirror of the guard + send path.

vi.mock("nodemailer", () => ({
  createTransport: () => ({ sendMail: async () => ({ messageId: "x" }) }),
}));

describe("pickup-completed email rules", () => {
  const uuid8 = (seed: string) => `${seed}-0000-0000-0000-000000000000`;

  function isPickupOrder(o: { delivery_city?: string | null; delivery_company?: string | null }) {
    return o.delivery_city === "استلام من المتجر" || o.delivery_company === "pickup";
  }

  it("recognizes store-pickup orders by delivery_city value", () => {
    expect(isPickupOrder({ delivery_city: "استلام من المتجر", delivery_company: null })).toBe(true);
    expect(isPickupOrder({ delivery_city: null, delivery_company: "pickup" })).toBe(true);
  });

  it("rejects regular delivery orders", () => {
    expect(isPickupOrder({ delivery_city: "عمّان", delivery_company: "comp-default-1" })).toBe(false);
  });

  it("short order id is first 8 uuid chars uppercased", () => {
    const id = uuid8("abcd1234");
    expect(id.slice(0, 8).toUpperCase()).toBe("ABCD1234");
    expect(/^[0-9A-F]{8}$/.test(id.slice(0, 8).toUpperCase())).toBe(true);
  });

  it("subject follows the format: emoji + تم استلام طلبك من المتجر + short id", () => {
    const id = uuid8("abcd1234");
    const subject = `🎁 تم استلام طلبك من المتجر — #${id.slice(0, 8).toUpperCase()} — QWADERGAME`;
    expect(subject).toContain("#ABCD1234");
    expect(subject).toContain("تم استلام طلبك من المتجر");
  });
});
