import { describe, it, expect } from "vitest";

// Mirror of the client-side derivation in CartDrawer (line ~1389-1392):
// pickupWaEnabled = shipping?.pickupWaEnabled !== false (default: shown)
// pickupWaLink = waLink(socialLinks?.whatsapp, msg)
function waLink(phone: unknown, text: string | null): string | null {
  const digits = String(phone || "").replace(/[^\d]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text || "")}`;
}
function pickupWaDerivation(shipping: any, socialLinks: any) {
  const pickupWaEnabled = shipping?.pickupWaEnabled !== false;
  const pickupWaMsg = pickupWaEnabled && socialLinks?.whatsapp ? `مرحباً، بدي أستلم طلبي من المتجر — رقم الطلب: (يظهر بعد رفع الطلب)` : null;
  return pickupWaEnabled ? waLink(socialLinks?.whatsapp, pickupWaMsg) : null;
}

describe("pickup WhatsApp coordination button", () => {
  it("shows button by default when whatsapp is set", () => {
    const link = pickupWaDerivation({ enabled: true, companies: [] }, { whatsapp: "0779538304" });
    expect(link).toContain("wa.me/0779538304"); // digits-only as entered (matches the app's waLink helper)
    expect(link).toContain(encodeURIComponent("رقم الطلب:"));
  });

  it("hides button when whatsapp is empty", () => {
    const link = pickupWaDerivation({}, { whatsapp: "" });
    expect(link).toBeNull();
  });

  it("hides button when admin explicitly disables pickupWaEnabled", () => {
    const link = pickupWaDerivation({ pickupWaEnabled: false }, { whatsapp: "0779538304" });
    expect(link).toBeNull();
  });

  it("is tolerant of non-numeric characters in the whatsapp number", () => {
    const link = pickupWaDerivation({}, { whatsapp: "+962 779 538 304" });
    expect(link).toContain("wa.me/962779538304");
  });
});
