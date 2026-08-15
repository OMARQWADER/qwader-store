import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Award,
  Clock,
  Gamepad2,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Zap,
} from "lucide-react";

/* =================================================================
   صفحة من نحن — قصة المتجر وساعات العمل التفاعلية.
   البيانات تُقرأ من site_content.aboutPage — يعدّلها المالك من
   لوحة الإدارة (تبويب الإعدادات ← صفحة من نحن).
================================================================= */

interface AboutDay {
  day: string;
  en: string;
  open: string; // HH:mm
  close: string; // HH:mm
  enabled: boolean;
}

interface AboutPageData {
  headline?: string;
  story?: string;
  hours: AboutDay[];
}

const DEFAULT_ABOUT: AboutPageData = {
  headline: "متجرك الأول للبطاقات والاشتراكات الرقمية",
  story: "",
  hours: [],
};

const waUrl = (phone: string, text?: string) => {
  const digits = phone.replace(/^0/, "962").replace(/[^\d]/g, "");
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};

const VIOLET = "#3b82f6";
const TEAL = "#60a5fa";
const muted = "#8ea3c9";
const card: React.CSSProperties = {
  background: "rgba(16,23,58,0.6)",
  border: "1px solid rgba(59,130,246,0.2)",
  borderRadius: 18,
};
const glassBg: React.CSSProperties = {
  background: "linear-gradient(180deg,#0a1028 0%,#060917 100%)",
  color: "#e9ecf8",
};

/* convert "HH:mm" to minutes-since-midnight in the visitor's timezone */
function minutesOf(ts: Date): number {
  return ts.getHours() * 60 + ts.getMinutes();
}

function parseTime(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || "");
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 24 || mm > 59) return null;
  // midnight-close like "24:00" counts as end of day
  return h * 60 + mm;
}

/** Interactive: given the server-side hours (visitor timezone),
 *  returns true if the store is currently open, or null when undetermined. */
export function isStoreOpenNow(hours: AboutDay[]): boolean | null {
  if (!Array.isArray(hours) || hours.length === 0) return null;
  const now = new Date();
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const today = hours.find((h) => h.en === days[now.getDay()]);
  if (!today || !today.enabled) return false;
  const openMin = parseTime(today.open);
  const closeMin = parseTime(today.close);
  if (openMin === null || closeMin === null) return false;
  const nowMin = minutesOf(now);
  // handle overnight spans (e.g. 14:00 → 24:00 via midnight = openMin > closeMin)
  if (openMin <= closeMin) return nowMin >= openMin && nowMin < closeMin;
  return nowMin >= openMin || nowMin < closeMin;
}

function NextCloseMsg({ openMin, closeMin }: { openMin: number; closeMin: number }) {
  const now = new Date();
  const nowMin = minutesOf(now);
  let until: number;
  if (closeMin >= openMin) {
    until = closeMin - nowMin;
  } else if (nowMin >= openMin) {
    until = 24 * 60 - nowMin + closeMin;
  } else {
    until = closeMin - nowMin;
  }
  if (until <= 0) until = 24 * 60;
  const h = Math.floor(until / 60);
  const mm = until % 60;
  const label = h > 0 ? `حوالي ${h} ساعة و${mm} دقيقة` : `${mm} دقيقة`;
  return <span>— بنقفل بعد {label}</span>;
}

function TodayRow({ day, accent }: { day: AboutDay; accent: string }) {
  const nowMin = minutesOf(new Date());
  const openMin = parseTime(day.open);
  const closeMin = parseTime(day.close);
  const within =
    openMin !== null && closeMin !== null &&
    (openMin <= closeMin
      ? nowMin >= openMin && nowMin < closeMin
      : nowMin >= openMin || nowMin < closeMin);
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-xl px-3 py-2"
      style={{ background: within ? `color-mix(in oklch, ${accent} 16%, transparent)` : "transparent" }}
    >
      <span className="text-sm font-black" style={{ color: within ? accent : "#e9ecf8" }}>
        {day.day} {within && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full mr-1" style={{ background: "rgba(96,165,250,0.15)", color: TEAL }}>اليوم ✓</span>}
      </span>
      {day.enabled ? (
        <span className="text-xs font-bold flex items-center gap-1" style={{ color: within ? accent : "#eaf0ff", direction: "ltr" }}>
          <Clock size={12} /> {day.open === "24:00" || day.close === "24:00" ? `${day.open} → منتصف الليل` : `${day.open} → ${day.close}`}
        </span>
      ) : (
        <span className="text-xs font-bold" style={{ color: "#f87171" }}>إجازة</span>
      )}
    </div>
  );
}

interface LiveCounters {
  delivered: number;
  served_customers: number;
  completed: number;
}

/** Animated count-up: rises from 0 to target over ~1.4s with ease-out, triggers when visible. */
function CountUp({ target, accent, from }: { target: number; accent: string; from?: number }) {
  const [value, setValue] = useState(from ?? 0);
  const started = useRef(false);

  useEffect(() => {
    const el = document.getElementById(`counter-${accent}-${from ?? 0}`);
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const dur = Math.max(600, Math.min(1400, 10 * target));
          const t0 = performance.now();
          const step = (now: number) => {
            const p = Math.min(1, (now - t0) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            setValue(Math.round((from ?? 0) + (target - (from ?? 0)) * eased));
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, accent, from]);

  return <span id={`counter-${accent}-${from ?? 0}`}>{value.toLocaleString("en-US")}</span>;
}

export default function About() {
  const [data, setData] = useState<AboutPageData | null>(null);
  const [whatsapp, setWhatsapp] = useState("0779538304");
  const [loading, setLoading] = useState(true);
  const [counters, setCounters] = useState<LiveCounters | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/content", { credentials: "same-origin" });
        const j = await res.json();
        const c = j?.content || {};
        setData(c.aboutPage ? { ...DEFAULT_ABOUT, ...(c.aboutPage as AboutPageData) } : DEFAULT_ABOUT);
        setWhatsapp((c.socialLinks && c.socialLinks.whatsapp) || "0779538304");
      } catch {
        setData(DEFAULT_ABOUT);
      } finally {
        setLoading(false);
      }
      // إحصاءات حية (بشكل مستقل، فشلها لا يمنع عرض الصفحة)
      try {
        const res = await fetch("/api/content/stats", { credentials: "same-origin" });
        const j = await res.json();
        if (j?.stats && typeof j.stats.delivered === "number") {
          setCounters({
            delivered: Math.max(0, Math.floor(j.stats.delivered || 0)),
            served_customers: Math.max(0, Math.floor(j.stats.served_customers || 0)),
            completed: Math.max(0, Math.floor((j.stats.completed ?? j.stats.delivered) || 0)),
          });
        }
      } catch {
        setCounters(null);
      }
    })();
  }, []);

  const openNow = data ? isStoreOpenNow(data.hours) : null;
  const todayEn = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date().getDay()];
  const today = data?.hours.find((h) => h.en === todayEn);
  const whatsappText = "مرحبًا QWADERGAME، شايف صفحة من نحن على الموقع وبدي أستفسر عن طلب.";

  return (
    <div className="min-h-screen" style={glassBg}>
      {/* خلفية متوهجة */}
      <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: "#3b82f6" }} />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10" style={{ background: TEAL }} />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 pt-6 pb-16">
        {/* ترويسة */}
        <header className="flex items-center justify-between mb-8">
          <Link href="/" aria-label="العودة للمتجر" className="flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-xl transition-transform duration-150 active:scale-95 qx-chip" style={{ color: muted, background: "rgba(16,23,58,0.6)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <ArrowRight size={15} style={{ transform: "scaleX(-1)" }} /> المتجر
          </Link>
          <Link href="/" aria-label="QWADER STORE" className="font-black text-lg qx-grad">
            QWADER STORE
          </Link>
        </header>

        {/* العنوان */}
        <div className="qx-hero mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black mb-4" style={{ background: "rgba(59,130,246,0.14)", color: VIOLET, border: "1px solid rgba(59,130,246,0.35)" }}>
            <Store size={13} /> من نحن
          </div>
          <h1 className="font-black text-3xl sm:text-4xl mb-3 qx-grad">QWADERGAME</h1>
          {data?.headline && <p className="text-sm font-bold" style={{ color: "#cfe0ff" }}>{data.headline}</p>}
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 size={26} className="animate-spin" style={{ color: VIOLET }} />
            <p className="text-xs" style={{ color: muted }}>جاري التحميل...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* قصة المتجر */}
            <section className="rounded-2xl p-5 relative overflow-hidden qx-card">
              <div aria-hidden className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-25 pointer-events-none" style={{ background: VIOLET }} />
              <h3 className="font-black text-sm mb-3 flex items-center gap-2">
                <Gamepad2 size={16} style={{ color: VIOLET }} /> قصتنا
              </h3>
              <p className="text-sm leading-7" style={{ color: "#eaf0ff" }}>
                {data?.story || "QWADERGAME متجرك الموثوق لبطاقات الألعاب والاشتراكات وأحدث الألعاب الرقمية بأفضل الأسعار وأسرع تسليم."}
              </p>
            </section>

            {/* العدادات الحية */}
            {counters && (counters.completed > 0 || counters.served_customers > 0) && (
              <section className="rounded-2xl p-5 relative overflow-hidden qx-card">
                <div aria-hidden className="absolute -top-12 -left-10 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none" style={{ background: "#fbbf24" }} />
                <h3 className="font-black text-sm mb-4 flex items-center gap-2">
                  <Award size={16} style={{ color: "#fbbf24" }} /> إنجازاتنا بالأرقام
                </h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { value: counters.completed, label: "طلب منجز", accent: VIOLET },
                    { value: counters.served_customers, label: "عميل مخدوم", accent: TEAL },
                    { value: counters.delivered + counters.served_customers + counters.completed, label: "عملية تسليم", accent: "#fbbf24" },
                  ].map((c) => (
                    <div key={c.label} className="rounded-xl py-4" style={{ background: `color-mix(in oklch, ${c.accent} 10%, transparent)`, border: `1px solid color-mix(in oklch, ${c.accent} 30%, transparent)` }}>
                      <div className="font-black text-2xl mb-1" style={{ color: c.accent }}>
                        <CountUp target={c.value} accent={c.accent} />
                      </div>
                      <div className="text-[10px] font-black" style={{ color: "#eaf0ff" }}>{c.label}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] mt-3 text-center" style={{ color: muted }}>أرقام حقيقية تتحدث تلقائيًا من نظام الطلبات</p>
              </section>
            )}

            {/* شارات لماذا نحن */}
            <section className="grid grid-cols-3 gap-3">
              {[
                { icon: <ShieldCheck size={18} />, title: "أصلية 100%", accent: TEAL },
                { icon: <Zap size={18} />, title: "تسليم سريع", accent: "#fbbf24" },
                { icon: <Sparkles size={18} />, title: "أسعار منافسة", accent: "#fbbf24" },
                { icon: <Users size={18} />, title: "ثقة العملاء", accent: VIOLET },
              ].map((f) => (
                <div key={String(f.title)} className="rounded-2xl p-4 text-center qx-card qg-tilt">
                  <div className="mx-auto w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: `color-mix(in oklch, ${f.accent} 18%, transparent)`, border: `1px solid color-mix(in oklch, ${f.accent} 45%, transparent)`, color: f.accent, boxShadow: `0 0 14px color-mix(in oklch, ${f.accent} 35%, transparent)` }}>
                    {f.icon}
                  </div>
                  <p className="text-[11px] font-black" style={{ color: "#e9ecf8" }}>{f.title}</p>
                </div>
              ))}
            </section>

            {/* ساعات العمل */}
            <section className="rounded-2xl p-5 relative overflow-hidden qx-card">
              <div aria-hidden className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none" style={{ background: TEAL }} />
              <h3 className="font-black text-sm mb-1 flex items-center gap-2">
                <Clock size={16} style={{ color: TEAL }} /> ساعات العمل
              </h3>
              <p className="text-xs mb-4" style={{ color: muted }}>
                {openNow === true ? (
                  <span className="font-bold flex items-center gap-1.5" style={{ color: "#60a5fa" }}>
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#60a5fa" }} /> المتجر مفتوح حاليًا
                    {today && today.enabled && parseTime(today.open) !== null && parseTime(today.close) !== null && <NextCloseMsg openMin={parseTime(today.open)!} closeMin={parseTime(today.close)!} />}
                  </span>
                ) : openNow === false ? (
                  <span className="font-bold flex items-center gap-1.5" style={{ color: "#f87171" }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: "#f87171" }} /> المتجر مغلق حاليًا — نرد عليك بأول وقت عمل
                  </span>
                ) : "ساعات العمل غير محددة بعد"}
              </p>
              {(!Array.isArray(data?.hours) || data!.hours.length === 0) ? (
                <p className="text-xs text-center py-4" style={{ color: muted }}>لا توجد ساعات عمل محددة</p>
              ) : (
                <div className="space-y-1.5">
                  {/* Saturday first (week starts Saturday in Jordan) */}
                  {[...data!.hours].sort((a, b) => {
                    const order: Record<string, number> = { sat: 0, sun: 1, mon: 2, tue: 3, wed: 4, thu: 5, fri: 6 };
                    return (order[a.en] ?? 9) - (order[b.en] ?? 9);
                  }).map((h) => (
                    <TodayRow key={h.en} day={h} accent={TEAL} />
                  ))}
                </div>
              )}
            </section>

            {/* تواصل */}
            <section className="rounded-2xl p-5 relative overflow-hidden" style={{ ...card, border: "1px solid rgba(37,211,102,0.4)" }}>
              <div aria-hidden className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full blur-2xl opacity-25 pointer-events-none" style={{ background: "#25d366" }} />
              <h3 className="font-black text-sm mb-1 flex items-center gap-2">
                <MessageCircle size={16} style={{ color: "#25d366" }} /> عندك سؤال؟
              </h3>
              <p className="text-xs mb-4" style={{ color: muted }}>
                فريقنا جاهز يرد عليك على واتساب المتجر — اسأل عن أي لعبة أو بطاقة أو اشتراك.
              </p>
              <a
                href={waUrl(whatsapp, whatsappText)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white transition-transform duration-150 active:scale-95 qg-shimmer-btn"
                style={{ background: "#25d366" }}
              >
                <MessageCircle size={16} /> راسلنا على واتساب
              </a>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
