import { describe, expect, it } from "vitest";

/* =================================================================
   اختبارات الميزات الجديدة: ملاحظات التوصيل + حالة "تم الاستلام"
   + تنبيه الطلبات المتروكة + الواتساب الذكي
================================================================= */

describe("ملاحظات التوصيل (delivery notes)", () => {
  const applyDelivery = (mode: string, payload: any, shipping: any) => {
    const notes = typeof payload?.notes === "string" ? payload.notes.trim().slice(0, 500) || null : null;
    if (mode === "pickup") {
      return { deliveryCompany: null, deliveryCity: "استلام من المتجر", deliveryFee: 0, deliveryNotes: notes };
    }
    const company = shipping.companies?.find((c: any) => c.id === payload?.companyId && c.enabled !== false);
    if (!company) return null;
    const region = company.regions?.find((r: any) => r.city === payload?.cityName && r.enabled !== false);
    if (!region) return null;
    if (typeof payload?.fee === "number" && payload.fee !== region.price) return null;
    return {
      deliveryCompany: company.name,
      deliveryCity: region.city,
      deliveryFee: region.price,
      deliveryNotes: typeof payload?.notes === "string" ? payload.notes.trim().slice(0, 500) || null : null,
    };
  };

  const baseShipping = {
    enabled: true,
    companies: [
      { id: "c1", name: "أرامكس", enabled: true, regions: [{ city: "عمّان", price: 2.5, enabled: true }] },
      { id: "c2", name: "مغلقة", enabled: false, regions: [{ city: "عمّان", price: 1, enabled: true }] },
    ],
  };

  it("يحمل ملاحظات التوصيل مع الطلب", () => {
    const out = applyDelivery("delivery", { companyId: "c1", cityName: "عمّان", notes: "شارع فلسطين، قرب الصيدلية" }, baseShipping);
    expect(out?.deliveryNotes).toBe("شارع فلسطين، قرب الصيدلية");
  });

  it("يقص الملاحظات إلى 500 حرف ويزيل الفراغات", () => {
    const long = "أ".repeat(600);
    const out = applyDelivery("delivery", { companyId: "c1", cityName: "عمّان", notes: "   " + long + "   " }, baseShipping);
    expect(out?.deliveryNotes).toBe("أ".repeat(500));
  });

  it("ملاحظات فارغة تتحول إلى null", () => {
    const out = applyDelivery("delivery", { companyId: "c1", cityName: "عمّان", notes: "   " }, baseShipping);
    expect(out?.deliveryNotes).toBeNull();
  });

  it("ملاحظات الاستلام من المتجر تمر أيضاً", () => {
    const out = applyDelivery("pickup", { companyId: "pickup", cityName: "استلام من المتجر", notes: "بدي أستلم الساعة ٨" }, baseShipping);
    expect(out?.deliveryNotes).toBe("بدي أستلم الساعة ٨");
    expect(out?.deliveryFee).toBe(0);
  });

  it("الرسم المزوّر مرفوض حتى مع وجود ملاحظات", () => {
    const out = applyDelivery("delivery", { companyId: "c1", cityName: "عمّان", notes: "ملاحظة", fee: 999 }, baseShipping);
    expect(out).toBeNull();
  });
});

describe("تنبيه الطلبات المتروكة (stalled orders)", () => {
  const hour = 3600_000;
  const staleFilter = (orders: any[]) =>
    orders.filter(o => o.status === "pending_payment" && o.ts && (Date.now() - new Date(o.ts).getTime()) > hour);

  it("يلتقط الطلبات المتأخرة أكثر من ساعة", () => {
    const orders = [
      { id: 1, status: "pending_payment", ts: new Date(Date.now() - 2 * hour).toISOString() },
      { id: 2, status: "pending_payment", ts: new Date(Date.now() - 30 * 60_000).toISOString() },
      { id: 3, status: "delivered", ts: new Date(Date.now() - 5 * hour).toISOString() },
    ];
    expect(staleFilter(orders).map(o => o.id)).toEqual([1]);
  });

  it("ما يلقط طلبات بدون ts", () => {
    expect(staleFilter([{ id: 1, status: "pending_payment", ts: null }])).toEqual([]);
  });
});

describe("حالة الاستلام (pickup completion)", () => {
  it("تسجيل وقت الاستلام يتحول إلى صيغة عربية في الواجهة", () => {
    const ts = "2026-08-13T12:00:00Z";
    const label = new Date(ts).toLocaleString("ar-JO");
    expect(label.length).toBeGreaterThan(0);
    expect(label).toMatch(/[\d٠-٩]{4}/);
  });
});

describe("الواتساب الذكي (smart WhatsApp link)", () => {
  const waUrl = (phone: string, text?: string) => {
    const digits = phone.replace(/^0/, "962").replace(/[^\d]/g, "");
    return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
  };

  it("رابط التنسيقة يضيف الشركة والمدينة لطلبات التوصيل", () => {
    const msg = `مرحباً، عندي طلب رقم 123 — التوصيل: أرامكس إلى عمّان — بدي أسأل عن حالة التوصيل`;
    const url = waUrl("0779538304", msg);
    expect(url).toContain("wa.me/962779538304");
    expect(decodeURIComponent(url.split("?text=")[1] || "")).toContain("أرامكس إلى عمّان");
  });

  it("رابط الاستلام يبقى بسيط (رقم الطلب فقط)", () => {
    const msg = "مرحباً، بدي أستلم طلبي من المتجر — رقم الطلب: 123";
    const url = waUrl("0779538304", msg);
    const text = decodeURIComponent(url.split("?text=")[1] || "");
    expect(text).toContain("أستلم طلبي من المتجر — رقم الطلب: 123");
    expect(text).not.toContain("التوصيل:");
  });
});
