import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Clock, Loader2, MessageCircle, Store, Truck } from "lucide-react";
import { toast } from "sonner";

/* =================================================================
   صفحة خيارات التوصيل — تعرض جميع شركات التوصيل المتاحة والمناطق
   والأسعار + خيار الاستلام من المتجر (مجاني) + التواصل المباشر عبر واتساب.
   البيانات تُقرأ من /api/content (shipping + socialLinks) —
   يُعدّلها المالك من تبويب "التوصيل" بلوحة الإدارة.
================================================================= */

interface Region {
  city: string;
  price: number;
  enabled?: boolean;
}
interface Company {
  id: string;
  name: string;
  phone?: string;
  enabled?: boolean;
  regions?: Region[];
}
interface ShippingConfig {
  enabled?: boolean;
  pickupPrepMinutes?: number;
  companies?: Company[];
}
interface SocialLinks {
  whatsapp?: string;
}

const waUrl = (phone: string, text?: string) => {
  const digits = phone.replace(/^0/, "962").replace(/[^\d]/g, "");
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};

const money = (n: number) => `${Number(n || 0).toFixed(2)} د.أ`;

export default function DeliveryInfo() {
  const [shipping, setShipping] = useState<ShippingConfig>({ enabled: false });
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/content");
        const data = await res.json();
        if (!alive) return;
        const c = data?.content || {};
        setShipping(c.shipping || { enabled: false });
        setSocialLinks(c.socialLinks || {});
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#060917" }}>
        <Loader2 className="animate-spin" size={28} style={{ color: "#3b82f6" }} />
      </div>
    );
  }

  const companies = (shipping.companies || [])
    .filter((c: Company) => c.enabled !== false && Array.isArray(c.regions) && c.regions.some((r) => r.enabled !== false));
  const pickupPrepMinutes = Math.max(0, Math.floor(Number(shipping.pickupPrepMinutes) || 30));

  return (
    <div className="min-h-screen qg-deep-bg" style={{ color: "#f4f6fb", fontFamily: "'Tajawal', system-ui, sans-serif" }}>
      <div className="max-w-3xl mx-auto px-4 py-10" dir="rtl">
        {/* header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-xs font-bold flex items-center gap-1" style={{ color: "#8ea3c9" }}>
            <ArrowRight size={13} style={{ transform: "scaleX(-1)" }} /> العودة للمتجر
          </Link>
          <span className="text-[11px] font-black qx-grad">QWADER STORE</span>
        </div>
        <div className="qx-hero mb-8">
        <h1 className="text-3xl font-black mb-3 qx-grad">خيارات التوصيل والأسعار</h1>
        <p className="text-sm" style={{ color: "#8ea3c9" }}>هون كل خيارات استلام طلباتك — شفنا إن الوضوح بيوفر وقتك ووقتنا.</p>
        </div>

        {/* store pickup card */}
        <div className="rounded-2xl p-5 mb-5 qx-card" style={{ border: "1px solid rgba(96,165,250,0.3)", boxShadow: "0 0 30px rgba(96,165,250,0.08)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Store size={18} style={{ color: "#60a5fa" }} />
            <h2 className="text-lg font-black" style={{ color: "#60a5fa" }}>الاستلام من المتجر — مجاني</h2>
          </div>
          <p className="text-xs mb-1.5" style={{ color: "#c7cee3" }}>
            بترفع طلبك بالموقع، وبنجهزه لك خلال حوالي {pickupPrepMinutes} دقيقة من تأكيد الدفع — وبنرسل لك إشعار لما يتجهز.
          </p>
          {socialLinks?.whatsapp ? (
            <a
              href={waUrl(socialLinks.whatsapp, "مرحباً، بدي أستلم طلبي من المتجر — بدي أسأل عن التفاصيل")}
              target="_blank" rel="noreferrer"
              className="text-xs font-bold inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition-transform active:scale-[0.97] mt-1 qg-shimmer-btn"
              style={{ background: "rgba(37,211,102,0.1)", color: "#25D366", border: "1px solid rgba(37,211,102,0.35)" }}>
              <MessageCircle size={13} /> نسّق الاستلام عبر واتساب
            </a>
          ) : (
            <p className="text-[11px]" style={{ color: "#8ea3c9" }}>التواصل عبر أزرار الواتساب أسفل الصفحة.</p>
          )}
        </div>

        {/* delivery companies */}
        {!shipping.enabled || companies.length === 0 ? (
          <div className="rounded-2xl p-5 text-sm font-bold qx-card" style={{ color: "#8ea3c9" }}>
            <Clock size={14} className="inline ml-1.5" /> التوصيل غير متاح حالياً — متاح الاستلام من المتجر فقط.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Truck size={18} style={{ color: "#fbbf24" }} />
              <h2 className="text-lg font-black" style={{ color: "#fbbf24" }}>شركات التوصيل المتاحة</h2>
            </div>
            {companies.map((c) => (
              <div key={c.id} className="rounded-2xl p-5 qx-card" style={{ border: "1px solid rgba(251,191,36,0.2)", boxShadow: "0 0 24px rgba(251,191,36,0.07)" }}>
                <h3 className="text-base font-black mb-3" style={{ color: "#f4f6fb" }}>{c.name}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(c.regions || []).filter((r) => r.enabled !== false).map((r) => (
                    <div key={r.city} className="flex items-center justify-between rounded-xl px-3.5 py-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.15)" }}>
                      <span className="text-sm font-bold" style={{ color: "#c7cee3" }}>{r.city}</span>
                      <span className="text-sm font-black" style={{ color: "#fbbf24" }}>{money(r.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-[11px]" style={{ color: "#8ea3c9" }}>
              الأسعار تُضاف للإجمالي تلقائياً عند اختيارك للتوصيل وقت الطلب — وتقدر تختار الشركة والمدينة من سلة المشتريات مباشرة.
            </p>
          </div>
        )}

        {/* footer actions */}
        <div className="mt-8 pt-5 flex flex-wrap gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Link href="/" className="text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 qg-shimmer-btn" style={{ background: "linear-gradient(90deg,#ff8a2b,#ff6b1a)", color: "#0a0f20" }}>
            <ArrowRight size={13} style={{ transform: "scaleX(-1)" }} /> ابدأ التسوق
          </Link>
          <Link href="/payment-methods" className="text-xs font-bold px-4 py-2.5 rounded-xl" style={{ background: "rgba(59,130,246,0.12)", color: "#a78bfa", border: "1px solid rgba(59,130,246,0.3)" }}>
            طرق الدفع المتاحة
          </Link>
          {socialLinks?.whatsapp && (
            <a href={waUrl(socialLinks.whatsapp)} target="_blank" rel="noreferrer"
              className="text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 qg-shimmer-btn" style={{ background: "rgba(37,211,102,0.1)", color: "#25D366", border: "1px solid rgba(37,211,102,0.35)" }}>
              <MessageCircle size={13} /> تواصل معنا
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
