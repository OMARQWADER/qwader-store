import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  CreditCard,
  Copy,
  Loader2,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Smartphone,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

/* =================================================================
   صفحة طرق الدفع — تُعرض جميع وسائل الدفع المتاحة مع أرقام التحويل
   وزر تواصل مباشر بواتساب المتجر لإرسال إثبات التحويل.
   البيانات تُقرأ من site_content (paymentInfo + socialLinks) —
   يُعدّلها المالك من لوحة الإدارة.
================================================================= */

interface PaymentInfo {
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  cliqName?: string;
  cliqNumber?: string;
  zainCashName?: string;
  zainCashNumber?: string;
  stcPayName?: string;
  stcPayNumber?: string;
  orangeMoneyName?: string;
  orangeMoneyNumber?: string;
  codEnabled?: boolean;
  notes?: string;
}

const DEFAULT_PAYMENT_INFO: PaymentInfo = {
  bankAccountName: "",
  bankAccountNumber: "",
  bankName: "",
  cliqName: "",
  cliqNumber: "",
  zainCashNumber: "",
  zainCashName: "",
  stcPayName: "",
  stcPayNumber: "",
  orangeMoneyNumber: "",
  orangeMoneyName: "",
  codEnabled: false,
  notes: "",
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

type CardProps = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  accent: string;
  rows: { label: string; value: string }[];
  copyable?: boolean;
};

function DetailRow({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value.trim());
      toast.success("تم النسخ");
    } catch {
      toast.error("ما انسخ — انسخ الرقم يدويًا");
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 py-1.5" style={{ borderBottom: "1px solid rgba(59,130,246,0.12)" }}>
      <div>
        <p className="text-[11px] font-bold" style={{ color: muted }}>{label}</p>
        <p className="text-sm font-black mt-0.5" style={{ color: "#e9ecf8", direction: "ltr", textAlign: "right" }}>{value}</p>
      </div>
      {copyable && value.trim() && (
        <button
          onClick={copy}
          aria-label={`نسخ ${label}`}
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-150 active:scale-95"
          style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.35)" }}
        >
          <Copy size={13} color={VIOLET} />
        </button>
      )}
    </div>
  );
}

function MethodCard({ icon, title, subtitle, accent, rows, copyable }: CardProps) {
  return (
    <section aria-labelledby={`pm-${title}`} className="rounded-2xl p-5 relative overflow-hidden qx-card">
      <div
        className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-25 blur-2xl pointer-events-none"
        style={{ background: accent }}
      />
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center"
          style={{ background: `color-mix(in oklch, ${accent} 14%, transparent)`, border: `1px solid color-mix(in oklch, ${accent} 40%, transparent)` }}
        >
          {icon}
        </div>
        <div>
          <h3 id={`pm-${title}`} className="font-black text-base">{title}</h3>
          {subtitle && <p className="text-[11px] mt-0.5" style={{ color: muted }}>{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-0">
        {rows.map((r) => (
          <DetailRow key={r.label} label={r.label} value={r.value} copyable={copyable} />
        ))}
      </div>
    </section>
  );
}

export default function PaymentMethods() {
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [socials, setSocials] = useState<{ whatsapp?: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/content", { credentials: "same-origin" });
        const data = await res.json();
        const c = data?.content || {};
        setPaymentInfo(c.paymentInfo || DEFAULT_PAYMENT_INFO);
        setSocials(c.socialLinks || {});
      } catch {
        setPaymentInfo(DEFAULT_PAYMENT_INFO);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const whatsappNumber = socials.whatsapp || "0779538304";
  const whatsappProofText = "مرحبًا QWADER STORE، أرسلت إثبات التحويل عبر الموقع وأرجو تأكيد الطلب. رقم طلبي: ";
  const whatsappSupportText = "مرحبًا QWADER STORE، عندي استفسار بخصوص طرق الدفع.";

  const info = paymentInfo || DEFAULT_PAYMENT_INFO;
  const hasBank = !!info.bankAccountName || !!info.bankAccountNumber || !!info.bankName;
  const hasCliq = !!info.cliqName || !!info.cliqNumber;
  const hasZain = !!info.zainCashName || !!info.zainCashNumber;
  const hasStc = !!info.stcPayName || !!info.stcPayNumber;
  const hasOrange = !!info.orangeMoneyName || !!info.orangeMoneyNumber;
  const hasAny = hasBank || hasCliq || hasZain || hasStc || hasOrange || !!info.codEnabled;

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
            <ShieldCheck size={13} /> دفع آمن وموثوق
          </div>
          <h1 className="font-black text-3xl sm:text-4xl mb-3 qx-grad">طرق الدفع المتاحة</h1>
          <p className="text-sm" style={{ color: muted }}>
            اختر وسيلة التحويل المناسبة لك، ثم أرسل إثبات الدفع على واتساب المتجر لتأكيد طلبك بأقرب وقت.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 size={26} className="animate-spin" style={{ color: VIOLET }} />
            <p className="text-xs" style={{ color: muted }}>جاري تحميل طرق الدفع...</p>
          </div>
        ) : !hasAny ? (
          <div className="rounded-2xl p-6 text-center qx-card">
            <CreditCard size={26} style={{ color: VIOLET }} />
            <p className="font-bold text-sm mt-3 mb-1">طرق الدفع غير مفعّلة بعد</p>
            <p className="text-xs mb-5" style={{ color: muted }}>
              تواصل معنا مباشرة على واتساب لمعرفة أحدث وسائل الدفع المتاحة.
            </p>
            <a
              href={waUrl(whatsappNumber, whatsappSupportText)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white transition-transform duration-150 active:scale-95 qg-shimmer-btn"
              style={{ background: "#25d366" }}
            >
              <MessageCircle size={16} /> تواصل معنا على واتساب
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {hasBank && (
              <MethodCard
                icon={<Banknote size={20} color="#60a5fa" />}
                title="تحويل بنكي"
                subtitle="تحويل مباشر لحساب المتجر البنكي"
                accent={TEAL}
                copyable
                rows={[
                  { label: "اسم صاحب الحساب", value: info.bankAccountName || "—" },
                  { label: "اسم البنك", value: info.bankName || "—" },
                  { label: "رقم الحساب / IBAN", value: info.bankAccountNumber || "—" },
                ]}
              />
            )}

            {hasCliq && (
              <MethodCard
                icon={<QrCode size={20} color="#3b82f6" />}
                title="CliQ"
                subtitle="تحويل فوري عبر شبكة CliQ الأردنية"
                accent={VIOLET}
                copyable
                rows={[
                  { label: "اسم CliQ", value: info.cliqName || "—" },
                  { label: "رقم CliQ", value: info.cliqNumber || "—" },
                ]}
              />
            )}

            {hasStc && (
              <MethodCard
                icon={<Smartphone size={20} color="#4f46e5" />}
                title="STC Pay"
                subtitle="تحويل عبر محفظة STC Pay"
                accent="#6366f1"
                copyable
                rows={[
                  { label: "الاسم", value: info.stcPayName || "—" },
                  { label: "رقم STC Pay", value: info.stcPayNumber || "—" },
                ]}
              />
            )}

            {hasZain && (
              <MethodCard
                icon={<Smartphone size={20} color="#eab308" />}
                title="زين كاش"
                subtitle="محفظة زين كاش"
                accent="#eab308"
                copyable
                rows={[
                  { label: "الاسم", value: info.zainCashName || "—" },
                  { label: "رقم زين كاش", value: info.zainCashNumber || "—" },
                ]}
              />
            )}

            {hasOrange && (
              <MethodCard
                icon={<Smartphone size={20} color="#f97316" />}
                title="أورنج موني"
                subtitle="محفظة أورنج موني"
                accent="#f97316"
                copyable
                rows={[
                  { label: "الاسم", value: info.orangeMoneyName || "—" },
                  { label: "رقم أورنج موني", value: info.orangeMoneyNumber || "—" },
                ]}
              />
            )}

            {info.codEnabled && (
              <MethodCard
                icon={<Truck size={20} color="#fbbf24" />}
                title="نقدًا عند التسليم"
                subtitle="ادفع للمندوب نقدًا عند استلام طلبك"
                accent="#fbbf24"
                rows={[{ label: "القيمة", value: "تُدفع للمندوب عند الاستلام" }]}
              />
            )}

            {info.notes && (
              <div className="rounded-2xl p-4 text-xs leading-relaxed qx-card" style={{ color: muted }}>
                <p className="font-bold mb-1" style={{ color: "#e9ecf8" }}>ملاحظات مهمة</p>
                {info.notes}
              </div>
            )}

            {/* خطوات الدفع */}
            <section className="rounded-2xl p-5 qx-card">
              <h3 className="font-black text-sm mb-3 flex items-center gap-2">
                <BadgeCheck size={16} style={{ color: VIOLET }} /> خطوات إتمام الطلب
              </h3>
              <ol className="space-y-2.5 text-xs">
                {[
                  "اختر اللعبة وأضفها للسلة ثم أرسل الطلب",
                  "حوّل المبلغ على وسيلة الدفع اللي اخترتها",
                  "ارفق صورة إثبات التحويل وقت إرسال الطلب",
                  "أو أرسل الإثبات على واتساب المتجر بالرقم اللي تحت",
                  "نتأكد من الدفع ونزوّدك بالمنتج بأقرب وقت",
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span
                      className="shrink-0 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center mt-px"
                      style={{ background: "rgba(59,130,246,0.15)", color: VIOLET, border: `1px solid rgba(59,130,246,0.4)` }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ color: "#eaf0ff" }}>{t}</span>
                  </li>
                ))}
              </ol>
            </section>

            {/* واتساب المتجر */}
            <section className="rounded-2xl p-5 relative overflow-hidden qx-card" style={{ border: "1px solid rgba(37,211,102,0.4)" }}>
              <div aria-hidden className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full blur-2xl opacity-25 pointer-events-none" style={{ background: "#25d366" }} />
              <h3 className="font-black text-sm mb-1 flex items-center gap-2">
                <MessageCircle size={16} style={{ color: "#25d366" }} /> أرسل إثبات التحويل عبر واتساب
              </h3>
              <p className="text-xs mb-4" style={{ color: muted }}>
                اضغط الزر تحت ليفتح واتساب مع رسالة جاهزة — بس أضف رقم طلبك أو صورة الإيصال وأرسلها.
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href={waUrl(whatsappNumber, whatsappProofText)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-transform duration-150 active:scale-95 qg-shimmer-btn"
                  style={{ background: "#25d366" }}
                >
                  <MessageCircle size={16} /> إرسال إثبات التحويل على واتساب
                </a>
                <a
                  href={waUrl(whatsappNumber, whatsappSupportText)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-transform duration-150 active:scale-95"
                  style={{ background: "rgba(37,211,102,0.1)", color: "#25d366", border: "1px solid rgba(37,211,102,0.35)" }}
                >
                  <MessageCircle size={14} /> استفسار عام عن طرق الدفع
                </a>
              </div>
              <p className="text-[11px] text-center mt-3" style={{ color: muted }}>
                واتساب المتجر: <b className="font-black" style={{ color: "#25d366", direction: "ltr", display: "inline-block" }}>{whatsappNumber}</b>
              </p>
            </section>

            {/* تأكيد أمان */}
            <div className="flex items-center gap-2 text-[11px] justify-center" style={{ color: muted }}>
              <CheckCircle2 size={13} style={{ color: TEAL }} />
              لا تشارك بيانات حسابك مع أحد — المتجر لن يطلب كلمة سر حسابك أبدًا
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
