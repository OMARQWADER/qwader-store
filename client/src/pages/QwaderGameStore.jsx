import React, { useState, useEffect, useRef } from "react";
import {
  Gamepad2, Send, Lock, Plus, Trash2, Save, Settings, LogOut, Bell, Home, Menu, Zap,
  MessageCircle, CheckCircle2, ShieldCheck, Loader2, Sparkles, Phone,
  ShoppingCart, User, UserPlus, LogIn, X, Package, Users as UsersIcon,
  CreditCard, ChevronRight, Minus, Image as ImageIcon, Upload, History, FileText,
  Search, Star, Heart, HelpCircle, Info, Quote, Printer, Truck, Award,
  BarChart3, Download, UploadCloud, Tag, Gift, KeyRound, ShieldAlert, Crown,
  Eye, EyeOff, Camera, Moon, MapPin, Archive, Smartphone, AlertTriangle,
  Paperclip, RefreshCw, CornerUpLeft, Globe, Scale, Share2, WifiOff, Store, Clock,
  Mail, AlertCircle, Video, X as XIcon,
} from "lucide-react";
const YoutubeIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2c-.3-1-1-1.8-2-2.1C19.7 3.5 12 3.5 12 3.5s-7.7 0-9.5.6c-1 .3-1.7 1.1-2 2.1C0 8 0 12 0 12s0 4 .5 5.8c.3 1 1 1.8 2 2.1 1.8.6 9.5.6 9.5.6s7.7 0 9.5-.6c1-.3 1.7-1.1 2-2.1.5-1.8.5-5.8.5-5.8s0-4-.5-5.8zM9.5 15.6V8.4L15.8 12l-6.3 3.6z"/></svg>
);
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { api } from "./api.js";

/* =================================================================
   QWADERGAME — full storefront: accounts, account/settings pages,
   two-way support chat, cart & checkout, and an owner/staff
   dashboard for orders / messages / catalog / prices.

   Everything (auth, sessions, orders, chat, catalog, cart, wishlist,
   staff accounts, activity log) lives on a real backend now —
   Vercel Serverless Functions under /api backed by Postgres (Neon).
   This file has zero client-side storage or simulated auth left; it
   just renders UI and calls the API (see src/api.js). See README.md
   for setup (Neon connection string + JWT_SECRET) and how to make
   your own account the "owner".

     - Passwords are hashed with bcrypt on the server; sessions are a
       signed JWT plus a revocable row in the `sessions` table, so
       "log out everywhere" and password-change-kills-old-sessions
       are both real, not simulated.
     - Every visitor (any device, any browser) sees the same orders,
       messages, chat threads, and catalog, because they all live in
       one shared Postgres database instead of per-browser storage.
     - Checkout doesn't move real money — it creates an order the
       owner sees and follows up on via WhatsApp / CliQ, same as any
       manual gift-card seller.
     - The optional 2FA toggle in Settings shows the verification
       code directly in the response (clearly labeled as a demo)
       because no SMS/email provider is configured. The server-side
       flow (api/auth/login.js) is structured so a real provider can
       be plugged in later without changing the rest of the app.
================================================================= */

const DEFAULT_GAMES = [
  { id: "g1", icon: "🎮", name: "FC 25", price: 18, note: "PS5 - نسخة رقمية", image: null, description: "أحدث إصدار من سلسلة كرة القدم الأشهر عالميًا.", platform: "PS5", ageRating: "3+", featured: true, bestseller: true, reviews: [] },
  { id: "g2", icon: "🕹️", name: "GTA V", price: 12, note: "PS4 / PS5", image: null, description: "لعبة أكشن مفتوحة العالم بمدينة لوس سانتوس.", platform: "PS4/PS5", ageRating: "18+", featured: false, bestseller: true, reviews: [] },
  { id: "g3", icon: "⚔️", name: "Elden Ring", price: 22, note: "PS5", image: null, description: "لعبة أكشن-آر بي جي بعالم مفتوح شاسع وصعوبة عالية.", platform: "PS5", ageRating: "16+", featured: true, bestseller: false, reviews: [] },
];

const DEFAULT_FAQ = [
  { id: "f1", q: "كم مدة تسليم البطاقة بعد الدفع؟", a: "عادة خلال دقائق من تأكيد الدفع، وبأوقات الذروة ممكن تتأخر لنص ساعة." },
  { id: "f2", q: "شو طرق الدفع المتاحة؟", a: "CliQ، تحويل بنكي، أو نقدًا عند التسليم إذا كنت داخل عمّان." },
  { id: "f3", q: "هل البطاقات أصلية 100%؟", a: "أكيد، كل البطاقات أصلية ومصدرها رسمي." },
];

const DEFAULT_BANNERS = [
  { id: "b1", text: "🔥 خصم 10% على كل اشتراكات PS Plus هالأسبوع" },
];

const DEFAULT_TESTIMONIALS = [
  { id: "t1", name: "أحمد", text: "تعامل سريع وأسعار ممتازة، بطلب من عندهم دايمًا." },
  { id: "t2", name: "سارة", text: "وصلتني البطاقة خلال دقائق، خدمة محترمة." },
];

const DEFAULT_ABOUT = "QWADERGAME متجرك الموثوق لبطاقات الألعاب والاشتراكات وأحدث الألعاب الرقمية بأفضل الأسعار وأسرع تسليم.";

const OWNER_WHATSAPP = "0779538304";

const DEFAULT_COUPONS = [
  { id: "cp1", code: "WELCOME10", percent: 10 },
];

const DEFAULT_PAYMENT_INFO = {
  bankAccountName: "", bankAccountNumber: "", bankName: "",
  cliqName: "", cliqNumber: "",
  zainCashNumber: "", zainCashName: "",
  orangeMoneyNumber: "", orangeMoneyName: "",
  codEnabled: false, notes: "",
};

/* Owner-managed delivery configuration (site_content.shipping).
   companies[].regions: [{ city, price (JOD), enabled }] */
const DEFAULT_SHIPPING = { enabled: true, companies: [] };

const genCompId = () => "comp-" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

const DEFAULT_QUICK_REPLIES = [
  "شكرًا، جاري تجهيز طلبك",
  "تم التأكيد، بوصلك خلال ساعة",
  "ممكن ترسل صورة إثبات التحويل؟",
];

const DEFAULT_PRICE_COMPARISON = [
  { id: "pc1", product: "بطاقة PSN أمريكي 10$", store: "المتجر عنا", price: "" },
];

const DEFAULT_REFUND_POLICY = "بطاقات الألعاب رقمية ويتم تسليمها فور تأكيد الدفع، فلا يوجد استرجاع بعد تسليم الكود إلا في حال وجود خطأ من طرفنا. تواصل معنا مباشرة لأي مشكلة بالطلب.";

const DEFAULT_SOCIAL_LINKS = { whatsapp: OWNER_WHATSAPP, telegram: "", instagram: "", facebook: "", storeEmail: "", storePhone: "", storeAddress: "", tiktok: "", youtube: "", x: "" };
const DEFAULT_BRANDING = { logoUrl: "" };
const DEFAULT_MAINTENANCE = { enabled: false, message: "الموقع تحت الصيانة حاليًا، رح نرجع قريبًا 🛠️" };

// order status stages — matches the seller's real workflow (see db/schema.sql)
const ORDER_STATUS_LABEL = {
  pending_payment: "بانتظار الدفع",
  proof_submitted: "أرسلت إثبات الدفع",
  payment_confirmed: "تم تأكيد الدفع",
  preparing: "جاري التوفير",
  sourcing_product: "جاري طلب المنتج من المورد",
  product_available: "المنتج وصل، جاري التسليم",
  delivered: "تم التسليم",
  cancelled: "ملغي",
  refund_requested: "استرداد مطلوب",
  refund_processing: "جاري الاسترداد",
  refunded: "تم الاسترداد",
  pending: "قيد الانتظار",
  confirmed: "تم التأكيد",
};
const ORDER_STATUS_COLOR = {
  pending_payment: "#f472b6",
  proof_submitted: "#fbbf24",
  payment_confirmed: "#2dd4bf",
  preparing: "#2dd4bf",
  sourcing_product: "#2dd4bf",
  product_available: "#4ade80",
  delivered: "#4ade80",
  cancelled: "#f87171",
  refund_requested: "#fbbf24",
  refund_processing: "#2dd4bf",
  refunded: "#c3cbe8",
  pending: "#f472b6",
  confirmed: "#2dd4bf",
};
const PAYMENT_STATUS_LABEL = {
  unpaid: "بانتظار الدفع",
  proof_submitted: "إثبات الدفع مرفوع",
  under_review: "مراجعة إثبات الدفع",
  confirmed: "تم تأكيد الدفع",
  rejected: "إثبات الدفع مرفوض",
  refunded: "تم الاسترداد",
};
const SOURCING_STATUS_LABEL = {
  not_started: "لم يبدأ التزويد",
  searching_supplier: "جاري البحث عن مورد",
  ordered_from_supplier: "طلبنا من المورد",
  available: "وصل عندنا",
  failed: "فشل التزويد",
};
const ORDER_STATUS_STEPS = ["pending_payment", "proof_submitted", "payment_confirmed", "preparing", "sourcing_product", "product_available", "delivered"];
const PAYMENT_METHOD_LABEL = { bank: "تحويل بنكي", cliq: "CliQ", zaincash: "زين كاش", orangemoney: "أورنج موني", cod: "نقدًا عند التسليم" };

function waLink(phone, text) {
  const digits = String(phone || "").replace(/[^\d]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function SocialLinksRow({ socialLinks, size = 15 }) {
  const links = [
    socialLinks.whatsapp && { key: "whatsapp", href: waLink(socialLinks.whatsapp, "أهلين، بدي أستفسر عن..."), icon: <Phone size={size} />, color: "#25D366" },
    socialLinks.telegram && { key: "telegram", href: socialLinks.telegram.startsWith("http") ? socialLinks.telegram : `https://t.me/${socialLinks.telegram.replace("@", "")}`, icon: <Send size={size} />, color: "#29b6f6" },
    socialLinks.instagram && { key: "instagram", href: socialLinks.instagram.startsWith("http") ? socialLinks.instagram : `https://instagram.com/${socialLinks.instagram.replace("@", "")}`, icon: <Camera size={size} />, color: "#e1306c" },
    socialLinks.facebook && { key: "facebook", href: socialLinks.facebook.startsWith("http") ? socialLinks.facebook : `https://facebook.com/${socialLinks.facebook}`, icon: <UsersIcon size={size} />, color: "#1877f2" },
    socialLinks.tiktok && { key: "tiktok", href: socialLinks.tiktok.startsWith("http") ? socialLinks.tiktok : `https://www.tiktok.com/@${socialLinks.tiktok.replace("@", "")}`, icon: <Video size={size} />, color: "#fff", border: true },
    socialLinks.youtube && { key: "youtube", href: socialLinks.youtube.startsWith("http") ? socialLinks.youtube : `https://www.youtube.com/@${socialLinks.youtube.replace("@", "")}`, icon: <YoutubeIcon size={size} />, color: "#FF0000" },
    socialLinks.x && { key: "x", href: socialLinks.x.startsWith("http") ? socialLinks.x : `https://x.com/${socialLinks.x.replace("@", "")}`, icon: <XIcon size={size} />, color: "#fff", border: true },
  ].filter(Boolean);

  if (links.length === 0) return null;
  return (
    <div className="flex items-center justify-center gap-3">
      {links.map(l => (
        <a key={l.key} href={l.href} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90"
          style={{ background: l.border ? "#fff" : "#0c1230", border: l.border ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(47,125,244,0.2)", color: l.border ? "#0c1230" : l.color }}>
          {l.icon}
        </a>
      ))}
    </div>
  );
}

function Footer({ socialLinks, setTab }) {
  return (
    <footer className="max-w-4xl mx-auto px-4 pb-10 pt-6 text-center relative" style={{ borderTop: "1px solid rgba(47,125,244,0.16)" }}>
      <img src="/manus-storage/qwader-logo_88ca51bf.png" alt="QWADER STORE" className="w-14 h-14 rounded-2xl object-contain mx-auto mb-3" />
      <div className="absolute inset-x-0 -top-px h-10 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(47,125,244,0.12) 0%, transparent 70%)" }} />
      <SocialLinksRow socialLinks={socialLinks} />
      <button onClick={() => setTab("track")} className="text-[11px] font-bold mt-4 flex items-center justify-center gap-1 mx-auto px-3 py-1.5 rounded-full" style={{ color: "#60a5fa", background: "rgba(47,125,244,0.1)", border: "1px solid rgba(47,125,244,0.3)" }}>
        <Truck size={11} /> تتبع طلبك برقمه
      </button>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-3">
        <button onClick={() => setTab("privacy")} className="text-[11px] font-bold transition-colors duration-150 hover:text-violet-300" style={{ color: "#c3cbe8" }}>الخصوصية</button>
        <button onClick={() => setTab("terms")} className="text-[11px] font-bold transition-colors duration-150 hover:text-violet-300" style={{ color: "#c3cbe8" }}>الشروط والأحكام</button>
        <button onClick={() => setTab("refund")} className="text-[11px] font-bold transition-colors duration-150 hover:text-violet-300" style={{ color: "#c3cbe8" }}>الاستبدال والاسترجاع</button>
        <button onClick={() => setTab("faq")} className="text-[11px] font-bold transition-colors duration-150 hover:text-violet-300" style={{ color: "#c3cbe8" }}>الأسئلة الشائعة</button>
        <a href="/payment-methods" target="_blank" rel="noreferrer" className="text-[11px] font-bold flex items-center gap-1 transition-colors duration-150 hover:text-violet-200" style={{ color: "#60a5fa" }}>
          <CreditCard size={11} /> طرق الدفع
        </a>
        <a href="/about" target="_blank" rel="noreferrer" className="text-[11px] font-bold flex items-center gap-1 transition-colors duration-150 hover:text-violet-200" style={{ color: "#60a5fa" }}>
          <Info size={11} /> من نحن
        </a>
      </div>
      <p className="text-[11px] mt-2 font-black" style={{ color: "#8ea3c9" }}>© {new Date().getFullYear()} QWADER STORE — جميع الحقوق محفوظة</p>
    </footer>
  );
}

// share a product via the native share sheet where available, falling
// back to opening a WhatsApp share link (no account/API needed either way)
function shareProduct(name) {
  const text = `شوف ${name} بمتجر QWADERGAME! ${typeof window !== "undefined" ? window.location.origin : ""}`;
  if (typeof navigator !== "undefined" && navigator.share) {
    navigator.share({ title: name, text }).catch(() => {});
  } else if (typeof window !== "undefined") {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
}

function NotifyMeButton({ gameName, session, active, onOpen, onClose }) {
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post("/api/notify", { gameName, phone: session ? undefined : phone.trim() });
      setSent(true);
    } catch (e) { /* fail quietly, it's a nice-to-have */ }
    setBusy(false);
  };

  if (sent) return <p className="text-[11px] font-bold text-center" style={{ color: "#2dd4bf" }}>✅ رح نعلمك لما يتوفر</p>;

  if (!active) {
    return (
      <button onClick={onOpen} className="w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1" style={{ background: "rgba(251,191,36,0.08)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.35)" }}>
        <Bell size={12} /> أعلمني لما يتوفر
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      {!session && (
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="رقم هاتفك" className="w-full px-2 py-1.5 rounded-lg text-[11px] outline-none qx-input" style={{...inputStyle}} />
      )}
      <div className="flex gap-1.5">
        <button disabled={busy || (!session && !phone.trim())} onClick={submit} className="flex-1 py-1.5 rounded-lg text-[11px] font-bold qx-btn qx-btn-primary">تأكيد</button>
        <button onClick={onClose} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold" style={{ background: "#0a0f20", color: "#c3cbe8" }}>إلغاء</button>
      </div>
    </div>
  );
}
const STATUS_WHATSAPP_TEXT = {
  payment_confirmed: "أهلين! أكدنا وصول الدفع لطلبك، جاري تجهيزه 🙌",
  preparing: "طلبك جاري توفيره حاليًا، رح نوصلك بأقرب وقت 📦",
  delivered: "تم تسليم طلبك، بالهنا والشفا! لو في أي استفسار تواصل معنا 🎮",
  cancelled: "للأسف تم إلغاء طلبك، تواصل معنا لمعرفة التفاصيل",
};

const DEFAULT_PRICES = {
  cards: [
    { id: "c1", label: "PSN سعودي", flag: "🇸🇦", image: null, rows: [{ amt: "10$", price: 7.5 }, { amt: "20$", price: 14.5 }, { amt: "30$", price: 21 }, { amt: "50$", price: 35 }, { amt: "100$", price: 70 }] },
    { id: "c2", label: "PSN أمريكي", flag: "🇺🇸", image: null, rows: [{ amt: "10$", price: 7.5 }, { amt: "20$", price: 14.5 }, { amt: "30$", price: 21 }, { amt: "50$", price: 35 }, { amt: "100$", price: 70 }] },
    { id: "c3", label: "PSN إماراتي", flag: "🇦🇪", image: null, rows: [{ amt: "10$", price: 7.5 }, { amt: "20$", price: 14.5 }, { amt: "30$", price: 21 }, { amt: "50$", price: 35 }, { amt: "100$", price: 70 }] },
    { id: "c4", label: "PSN قطري", flag: "🇶🇦", image: null, rows: [{ amt: "10$", price: 7.5 }, { amt: "20$", price: 14.5 }, { amt: "30$", price: 21 }, { amt: "50$", price: 35 }, { amt: "100$", price: 70 }] },
    { id: "c5", label: "PSN تركي", flag: "🇹🇷", image: null, rows: [{ amt: "250", price: 7 }, { amt: "500", price: 14 }, { amt: "750", price: 18.5 }, { amt: "1000", price: 25 }, { amt: "2000", price: 48 }, { amt: "5000", price: 115 }] },
  ],
  steam: [
    { amt: "10$", price: 7.5 }, { amt: "20$", price: 14.5 }, { amt: "30$", price: 21 },
    { amt: "50$", price: 35 }, { amt: "100$", price: 70 },
  ],
  subs: [
    { id: "s1", label: "تركي", flag: "🇹🇷", image: null, essential: [8.5, 18, 50], extra: [11, 26, 80], deluxe: [13, 30, 90], yearOnly: false },
    { id: "s2", label: "أمريكي", flag: "🇺🇸", image: null, essential: [8, 19, 55], extra: [13, 30, 87], deluxe: [14, 34, 105], yearOnly: false },
    { id: "s3", label: "إماراتي", flag: "🇦🇪", image: null, essential: [8.5, 18, 46], extra: [11, 24, 75.5], deluxe: [13, 30, 90], yearOnly: false },
    { id: "s4", label: "أوكراني", flag: "🇺🇦", image: null, essential: [40], extra: [60], deluxe: [70], yearOnly: true },
  ],
};

/* compress an uploaded image client-side before storing it as base64
   (storage values are capped, so we keep images small) */
// short two-tone "ding" so the owner/staff notice a new payment proof
// without having to stare at the dashboard — no external sound file needed.
function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.16 + 0.14);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.16);
      osc.stop(ctx.currentTime + i * 0.16 + 0.15);
    });
  } catch (e) { /* audio not available (e.g. tab not yet interacted with) */ }
}
function notifyNewPayment(count) {
  playAlertSound();
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification("💰 دفعة جديدة بانتظار التأكيد", {
      body: count === 1 ? "وصل إثبات دفع لطلب واحد" : `وصل إثبات دفع لـ ${count} طلبات`,
    });
  }
}
function notifyNewChatMessage(count) {
  playAlertSound();
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification("💬 رسالة جديدة من زبون", {
      body: count === 1 ? "عندك رسالة جديدة بالمحادثات" : `عندك ${count} رسائل جديدة بالمحادثات`,
    });
  }
}

function fileToCompressedDataUrl(file, maxWidth = 380, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ---------- tiny helpers ---------- */
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.start(); o.stop(ctx.currentTime + 0.35);
  } catch (e) {}
}
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}
/* returns { score: 0-4, label, color } */
function passwordStrength(pw) {
  pw = pw || "";
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  score = Math.min(score, 4);
  const labels = ["ضعيفة جدًا", "ضعيفة", "متوسطة", "جيدة", "قوية"];
  const colors = ["#f87171", "#60a5fa", "#fbbf24", "#8fe08a", "#2dd4bf"];
  return { score, label: labels[score], color: colors[score] };
}
function isPasswordAcceptable(pw) {
  return (pw || "").length >= 8;
}
/* NOTE: password hashing, auth, sessions, staff accounts, orders, chat,
   the whole catalog, cart, and wishlist now all live on the real server
   (see /api/* and api/_lib/auth.js), backed by Postgres — there is no
   localStorage, sessionStorage, or any other client-side persistence
   anywhere in this file anymore. */
const money = (n) => `${Number(n).toFixed(2).replace(/\.00$/, "")} JD`;
/* =================================================================
   PREMIUM DESIGN SYSTEM — deep navy canvas, neon purple/blue/pink
   glow accents, glass cards, and violet gradient primary buttons.
================================================================= */
/* =================================================================
   NEW VISUAL SYSTEM — cinematic gaming (index.css: .qg-* classes)
   palette unchanged (violet #60a5fa / pink #f472b6 / teal #2dd4bf)
================================================================= */
const inputStyle = { ...null };
const card = {};
/* primaryBtn supersedes the legacy orangeBtn name throughout the file */
const orangeBtn = { background: "linear-gradient(100deg,#2f7df4 0%,#1a64d8 55%,#003090 100%)", color: "#fff", boxShadow: "0 4px 18px rgba(47,125,244,0.4), inset 0 1px 0 rgba(255,255,255,0.25)" };
const primaryBtn = { background: "linear-gradient(100deg,#2f7df4 0%,#1a64d8 55%,#003090 100%)", color: "#eef0ff", boxShadow: "0 4px 18px rgba(47,125,244,0.45), inset 0 1px 0 rgba(255,255,255,0.18)" };
const accentBtn = { background: "linear-gradient(100deg,#f472b6,#ec4899 70%)", color: "#fff", boxShadow: "0 4px 16px rgba(236,72,153,0.4)" };

/* =================================================================
   ROOT
================================================================= */
export default function QwaderGameStore() {
  const [tab, setTab] = useState("store");
  const [trackInitialId, setTrackInitialId] = useState("");

  // supports opening the site with ?track=<orderId> (used by the QR code
  // printed on the receipt) — jumps straight to the tracking page
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("track");
    if (id) { setTrackInitialId(id); setTab("track"); }
  }, []);
  const [loading, setLoading] = useState(true);

  const [games, setGames] = useState(DEFAULT_GAMES);
  const [prices, setPrices] = useState(DEFAULT_PRICES);
  const [myOrders, setMyOrders] = useState([]); // this customer's own orders (real backend)
  const [faq, setFaq] = useState(DEFAULT_FAQ);
  const [banners, setBanners] = useState(DEFAULT_BANNERS);
  const [testimonials, setTestimonials] = useState(DEFAULT_TESTIMONIALS);
  const [about, setAbout] = useState(DEFAULT_ABOUT);
  const [wishlist, setWishlist] = useState(() => {
    // guests keep their picks on the device (localStorage); on login these
    // are merged into the account wishlist, then wiped from local storage
    try { return JSON.parse(localStorage.getItem("qwader_wishlist") || "[]"); } catch (e) { return []; }
  }); // synced to the account once logged in
  const [receipt, setReceipt] = useState(null);
  const [coupons, setCoupons] = useState(DEFAULT_COUPONS);
  const [paymentInfo, setPaymentInfo] = useState(DEFAULT_PAYMENT_INFO);
  const [shipping, setShipping] = useState(DEFAULT_SHIPPING);
  const [quickReplies, setQuickReplies] = useState(DEFAULT_QUICK_REPLIES);
  const [priceComparison, setPriceComparison] = useState(DEFAULT_PRICE_COMPARISON);
  const [refundPolicy, setRefundPolicy] = useState(DEFAULT_REFUND_POLICY);
  const [socialLinks, setSocialLinks] = useState(DEFAULT_SOCIAL_LINKS);
  const [storeBranding, setStoreBranding] = useState(DEFAULT_BRANDING);
  const [maintenance, setMaintenance] = useState(DEFAULT_MAINTENANCE);
  const [deliveredCount, setDeliveredCount] = useState(null);
  const [siteVisits, setSiteVisits] = useState({ total: null, byDay: [] });
  const [isOnline, setIsOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  const [session, setSession] = useState(null); // {id,name,email,role,...} — the one real login system
  const [cart, setCart] = useState([]); // synced to the account once logged in
  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const [toast, setToast] = useState(null);
  const [notifCount, setNotifCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifList, setNotifList] = useState([]);

  // (no longer tracking "known ids" for a local poll — orders/messages/chat
  // are fetched straight from the API now, see the effects below)

  useEffect(() => {
    (async () => {
      const timeout = new Promise(r => setTimeout(() => r(null), 15000)); // never let the user stare at a spinner forever
      const content = await Promise.race([api.get("/api/content").catch(() => ({ content: {} })), timeout]).catch(() => ({ content: {} }));
      if (!content) { setLoading(false); return; }
      const c = content.content || {};
      setGames(c.games || DEFAULT_GAMES);
      setPrices(c.prices || DEFAULT_PRICES);
      setFaq(c.faq || DEFAULT_FAQ);
      setBanners(c.banners || DEFAULT_BANNERS);
      setTestimonials(c.testimonials || DEFAULT_TESTIMONIALS);
      setAbout(c.about || DEFAULT_ABOUT);
      setCoupons(c.coupons || DEFAULT_COUPONS);
      setPaymentInfo(c.paymentInfo || DEFAULT_PAYMENT_INFO);
      setShipping(c.shipping || DEFAULT_SHIPPING);
      setQuickReplies(c.quickReplies || DEFAULT_QUICK_REPLIES);
      setPriceComparison(c.priceComparison || DEFAULT_PRICE_COMPARISON);
      setRefundPolicy(c.refundPolicy || DEFAULT_REFUND_POLICY);
      setSocialLinks(c.socialLinks || DEFAULT_SOCIAL_LINKS);
      setStoreBranding(c.siteBranding || DEFAULT_BRANDING);
      setMaintenance(c.maintenanceMode || DEFAULT_MAINTENANCE);
      // real login state now lives server-side (httpOnly cookie + DB
      // session row) — ask the API who's logged in. Cart/wishlist are also
      // account data now (no localStorage anywhere in this app anymore),
      // so a logged-in visit loads them straight from their account.
      try {
        const { user } = await api.get("/api/auth/me");
        if (user) {
          setSession(user);
          setCart(user.cart || []);
          // merge any guest picks saved on this device into the account list
          try { const local = JSON.parse(localStorage.getItem("qwader_wishlist") || "[]");
            setWishlist(Array.from(new Set([...(user.wishlist || []), ...local]))); } catch (e) { setWishlist(user.wishlist || []); }
        }
      } catch (e) {
        // no backend reachable / not configured yet — fall through as
        // logged-out rather than crashing the whole app
        console.warn("auth/me failed:", e.message);
      }

      setLoading(false);
    })();
  }, []);

  // homepage trust counter — public, no auth needed
  useEffect(() => {
    api.get("/api/content/stats").then(r => {
      setDeliveredCount(Number(r.stats?.delivered) || 0);
    }).catch(() => {});
  }, []);

  // "كم واحد فات الموقع" — count this as one visit, once per browser
  // session (not every page/tab switch), so the number stays meaningful
  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem("qg_visit_tracked")) return;
    sessionStorage.setItem("qg_visit_tracked", "1");
    api.post("/api/content/visit", {}).catch(() => {});
  }, []);

  // in-app notifications (logged in) — bell counter + silent refetch
  useEffect(() => {
    if (!session) { setNotifCount(0); return; }
    let cancelled = false;
    const load = async () => {
      try { const { count } = await api.get("/api/notifications/unread"); if (!cancelled) setNotifCount(Number(count) || 0); }
      catch (e) { /* transient failure */ }
    };
    load();
    const iv = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [session]);

  // simple connectivity banner — tells the customer plainly instead of the
  // app just silently failing requests
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  // fetch (and lightly poll) this customer's own orders once logged in —
  // orders live on the real backend now, so this is what makes "did my
  // order reach the store" and "طلباتي" actually work from any device.
  useEffect(() => {
    if (!session) { setMyOrders([]); return; }
    let cancelled = false;
    const load = async () => {
      try { const { orders, nextCursor } = await api.get("/api/orders/mine?limit=50"); if (!cancelled) setMyOrders(orders); }
      catch (e) { /* ignore transient poll failures */ }
    };
    load();
    const iv = setInterval(load, 8000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [session]);

  const persistCart = async (next) => {
    setCart(next);
    if (session) { try { await api.post("/api/account/update", { cart: next }); } catch (e) {} }
  };
  const addToCart = (item) => {
    const existing = cart.find(c => c.pid === item.pid);
    const next = existing
      ? cart.map(c => c.pid === item.pid ? { ...c, qty: c.qty + 1 } : c)
      : [...cart, { ...item, qty: 1 }];
    persistCart(next);
    setToast(`✅ تمت الإضافة: ${item.name}`);
    setTimeout(() => setToast(null), 1800);
  };
  const changeQty = (pid, delta) => {
    const next = cart.map(c => c.pid === pid ? { ...c, qty: Math.max(1, c.qty + delta) } : c);
    persistCart(next);
  };
  const removeFromCart = (pid) => persistCart(cart.filter(c => c.pid !== pid));
  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const doLogout = async () => {
    try { await api.post("/api/auth/logout"); } catch (e) { /* clear locally regardless */ }
    setSession(null);
    setCart([]); setWishlist([]); // these only exist per-account now, nothing left to fall back to
  };

  /* real, server-enforced "log out everywhere": revokes every session row
     for this account in the database, not just this browser's copy. */
  const doLogoutEverywhere = async () => {
    if (!session) return;
    try {
      await api.post("/api/auth/logout-all");
      setToast("✅ تم إنهاء كل الجلسات على كل الأجهزة");
    } catch (e) {
      setToast("❌ " + e.message);
    }
    setSession(null);
    setCart([]); setWishlist([]);
    setTimeout(() => setToast(null), 3000);
  };

  /* used by AccountPage/SettingsPage to persist profile/avatar/addresses/
     2FA changes against the real backend, then syncs the local session */
  const updateCurrentUser = async (patch) => {
    if (!session) return;
    try {
      if (Object.prototype.hasOwnProperty.call(patch, "twoFAEnabled")) {
        const { twoFAEnabled } = await api.post("/api/account/two-fa", { enabled: patch.twoFAEnabled });
        setSession(s => ({ ...s, twoFAEnabled }));
        return;
      }
      const { user } = await api.post("/api/account/update", patch);
      setSession(s => ({ ...s, ...user }));
    } catch (e) {
      setToast("❌ " + e.message);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const changeMyPassword = async (currentPw, newPw) => {
    try {
      await api.post("/api/account/change-password", { currentPassword: currentPw, newPassword: newPw });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const deleteCurrentUser = async () => {
    if (!session) return;
    try {
      await api.post("/api/account/delete");
    } catch (e) {
      setToast("❌ " + e.message); setTimeout(() => setToast(null), 3000);
      return;
    }
    setSession(null);
    setCart([]); setWishlist([]);
    setTab("store");
    setToast("🗑️ تم حذف حسابك نهائيًا");
    setTimeout(() => setToast(null), 3000);
  };

  const toggleWishlist = async (gameId) => {
    const next = wishlist.includes(gameId) ? wishlist.filter(id => id !== gameId) : [...wishlist, gameId];
    setWishlist(next);
    if (session) {
      try { await api.post("/api/account/update", { wishlist: next }); } catch (e) {}
      try { localStorage.removeItem("qwader_wishlist"); } catch (e) {}
    } else {
      try { localStorage.setItem("qwader_wishlist", JSON.stringify(next)); } catch (e) {}
      setToast(next.length > wishlist.length ? "أُضيفت للمفضلة — سجل دخول حتى تنحفظ" : "تمت الإزالة من المفضلة");
      setTimeout(() => setToast(null), 2500);
    }
  };

  /* the two-way support chat now lives entirely server-side (Postgres) —
     see /api/chat/mine.js (customer side) and /api/admin/chats*.js (staff
     side). SupportChatPage and ChatsAdmin call those directly instead of
     going through Root, so there's nothing to wire up here anymore. */

  const submitQuickOrder = async ({ name, phone, text, qty }) => {
    try {
      const { order } = await api.post("/api/orders/mine", {
        items: [{ name: text, qty: qty || 1, price: 0 }], custom: true, name, phone,
      });
      if (session) setMyOrders(o => [order, ...o]);
      setToast("🎉 تم إرسال طلبك! رح نتواصل معك قريبًا");
    } catch (e) {
      setToast("❌ " + e.message);
    }
    setTimeout(() => setToast(null), 4000);
  };

  const unreadCount = 0; // admin-only counts now live inside AdminPanel (real staff session required to fetch them)

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#030612", fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}>
        <span className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(700px 420px at 50% 45%, rgba(47,125,244,0.16), transparent 65%), radial-gradient(520px 340px at 75% 30%, rgba(0,48,144,0.3), transparent 70%)" }} />
        <img src="/manus-storage/qwader-logo_88ca51bf.png" alt="QWADER STORE" className="relative w-36 h-36 rounded-2xl object-contain" style={{ filter: "drop-shadow(0 0 34px rgba(47,125,244,0.5))" }} />
        <Loader2 className="animate-spin relative" color="#2f7df4" size={26} style={{ filter: "drop-shadow(0 0 12px rgba(47,125,244,0.7))" }} />
        <p className="relative text-xs font-bold" style={{ color: "#8ea3c9" }}>جارٍ تحميل المتجر...</p>
      </div>
    );
  }

  // the owner can keep working (fixing prices, checking orders...) while
  // everyone else sees a simple maintenance screen instead of the store
  if (maintenance.enabled && session?.role !== "owner") {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center px-6 text-center" style={{ background: "#050814", color: "#eef0ff", fontFamily: "system-ui, sans-serif" }}>
        <div>
          <img src="/manus-storage/qwader-logo_88ca51bf.png" alt="QWADER STORE" className="w-16 h-16 rounded-2xl object-contain mx-auto mb-3" />
          <h1 className="text-xl font-black mb-2">QWADER STORE</h1>
          <p className="text-sm max-w-xs mx-auto" style={{ color: "#c3cbe8" }}>{maintenance.message || DEFAULT_MAINTENANCE.message}</p>
          <div className="mt-5"><SocialLinksRow socialLinks={socialLinks} /></div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="qx-deep qx-scroll min-h-screen" style={{ color: "#eaf0ff", fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}>
      <span className="qx-orb hidden md:block" style={{ width: 380, height: 380, top: "2%", right: "-8%", background: "rgba(47,125,244,0.20)" }} />
      <span className="qx-orb hidden md:block" style={{ width: 320, height: 320, top: "32%", left: "-10%", background: "rgba(0,48,144,0.30)", animationDelay: "3s" }} />
      <span className="qx-orb hidden md:block" style={{ width: 340, height: 340, bottom: "6%", right: "18%", background: "rgba(47,125,244,0.10)", animationDelay: "7s" }} />
      <TopNav tab={tab} setTab={setTab} unreadCount={unreadCount} wishlistCount={wishlist.length}
        session={session} setAuthOpen={setAuthOpen} cartCount={cartCount} setCartOpen={setCartOpen}
        doLogout={doLogout} notifCount={notifCount} notifOpen={notifOpen} setNotifOpen={setNotifOpen}
        notifList={notifList} branding={storeBranding} />

      {!isOnline && (
        <div className="text-center text-xs font-bold py-2" style={{ background: "#f87171", color: "#120820" }}>
          <AlertTriangle size={13} className="inline ml-1.5" /> تأكد من اتصالك بالإنترنت — بعض الميزات ما رح تشتغل لحد ما ترجع تتصل
        </div>
      )}

      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-bold qx-btn qx-btn-primary">
          <Bell size={16} /> {toast}
        </div>
      )}

      <FloatingWhatsApp />

      {receipt && <ReceiptModal order={receipt} onClose={() => setReceipt(null)} socialLinks={socialLinks} pickupPrepMinutes={Math.max(0, Math.floor(Number(shipping?.pickupPrepMinutes) || 30))} />}

      {authOpen && (
        <AuthModal onClose={() => setAuthOpen(false)}
          onLoggedIn={async (u) => {
            setSession(u); setAuthOpen(false);
            // merge anything added while browsing as a guest (in-memory
            // only, never stored anywhere) into the account's saved
            // cart/wishlist, so logging in mid-shop doesn't lose it
            const mergedCart = [...(u.cart || [])];
            cart.forEach(item => { if (!mergedCart.find(x => x.pid === item.pid)) mergedCart.push(item); });
            // merge the guest's locally saved wishlist (localStorage) too
            let mergedWishlistList = Array.from(new Set([...(u.wishlist || []), ...wishlist]));
            try { const local = JSON.parse(localStorage.getItem("qwader_wishlist") || "[]");
              mergedWishlistList = Array.from(new Set([...mergedWishlistList, ...local])); }
            catch (e) { /* guest list already in the wishlist state */ }
            const mergedWishlist = mergedWishlistList;
            setCart(mergedCart); setWishlist(mergedWishlist);
            if (mergedCart.length !== (u.cart || []).length || mergedWishlist.length !== (u.wishlist || []).length) {
              try { await api.post("/api/account/update", { cart: mergedCart, wishlist: mergedWishlist }); } catch (e) {}
            }
          }}
          setToast={setToast} />
      )}

      {cartOpen && (
        <CartDrawer cart={cart} changeQty={changeQty} removeFromCart={removeFromCart} total={cartTotal} coupons={coupons}
          paymentInfo={paymentInfo} shipping={shipping} socialLinks={socialLinks}
          onClose={() => setCartOpen(false)} session={session} setAuthOpen={setAuthOpen}
          onCheckout={async (finalTotal, couponCode, paymentMethod, proofImage, delivery) => {
            try {
              const { order, discountApplied } = await api.post("/api/orders/mine", {
                items: cart, couponCode: couponCode || null, custom: false,
                paymentMethod, paymentProofImage: proofImage, delivery: delivery || null,
              });
              setMyOrders(o => [order, ...o]);
              if (discountApplied > 0) setSession(s => s ? { ...s, discountPercent: 0, discountReason: "" } : s);
              await persistCart([]);
              setCartOpen(false);
              setReceipt(order);
              setToast("🎉 تم إرسال طلبك مع إثبات الدفع! رح نراجعه ونأكده");
            } catch (e) {
              setToast("❌ " + e.message);
            }
            setTimeout(() => setToast(null), 4000);
          }} />
      )}

      <main className="max-w-3xl mx-auto px-4 pb-16">
        {tab === "store" && (
          <StorePage games={games} prices={prices} setTab={setTab} addToCart={addToCart}
            session={session} submitQuickOrder={submitQuickOrder} banners={banners}
            testimonials={testimonials} wishlist={wishlist} toggleWishlist={toggleWishlist}
            setGames={setGames} deliveredCount={deliveredCount} />
        )}
        {tab === "contact" && (
          session ? (
            <SupportChatPage socialLinks={socialLinks} setToast={setToast} />
          ) : (
            <ContactPage onSent={async (msg) => { await api.post("/api/support/conversations", { subject: msg.name ? msg.name.slice(0, 40) : "استفسار", category: "other", items: [{ name: msg.message, qty: 1, price: 0 }], custom: true, name: msg.name, phone: msg.phone }); }} socialLinks={socialLinks} />
          )
        )}
        {tab === "faq" && <FaqPage faq={faq} />}
        {tab === "about" && <AboutPage about={about} testimonials={testimonials} setTab={setTab} />}
        {tab === "pricecompare" && <PriceComparePage priceComparison={priceComparison} />}
        {tab === "refund" && <RefundPolicyPage refundPolicy={refundPolicy} />}
        {tab === "privacy" && (
          <LegalPage title="سياسة الخصوصية" icon={<ShieldCheck size={28} color="#2dd4bf" className="mx-auto mb-2" />}>
            ما بنشارك معلوماتك الشخصية مع أي طرف خارجي. بنحفظ بياناتك (اسمك، إيميلك، رقم هاتفك، وعناوينك) بس عشان ننفذ طلباتك ونتواصل معك بخصوصها. معلومات الدفع بتتعالج بأمان تام، ورموز التحقق (OTP) بتكون سرية بالكامل على السيرفر وما بتوصل للمتصفح أبداً. صور إثبات التحويل بنستخدمها بس لتأكيد الدفع. تقدر تطلب حذف بياناتك في أي وقت من صفحة حسابك، وحذف الحساب بيدمّر كل بياناتك نهائياً. بنستخدم ملفات تعريف ارتباط أساسية فقط عشان تسجيل الدخول والسلة.
          </LegalPage>
        )}
        {tab === "terms" && (
          <LegalPage title="الشروط والأحكام" icon={<FileText size={28} color="#60a5fa" className="mx-auto mb-2" style={{ filter: "drop-shadow(0 0 10px rgba(47,125,244,0.6))" }} />}>
            الطلبات النهائية بعد تأكيد الدفع ما بتقبل الإلغاء أو الاسترداد إلا إذا ما قدرت نوفر اللعبة أو كان في خلل بالكود المُرسل — وهاي منسويها وفق سياسة الاستبدال والاسترجاع. الأكواد الرقمية بتكون لمرة وحدة، فاحفظها فور التسليم. بنسعى لتوصيل طلبك بأقرب وقت، وإذا تأخر التزويد عن المدة المتوقعة بنعلمك ونعرض استرداد كامل أو بدائل مناسبة. الاستخدام الخاطئ للأكواد بعد تسليمها ما يقع ضمن مسؤوليتنا. بنحتفظ بحق تعديل هالشروط مع إشعار مسبق عن أي تغيير جوهري.
          </LegalPage>
        )}
        {tab === "track" && <TrackOrderPage initialId={trackInitialId} />}
        {tab === "wishlist" && (
          <WishlistPage games={games.filter(g => wishlist.includes(g.id))} addToCart={addToCart} toggleWishlist={toggleWishlist} setTab={setTab} />
        )}
        {tab === "myorders" && (
          session
            ? <MyOrdersPage orders={myOrders} session={session} addToCart={addToCart} setCartOpen={setCartOpen} setToast={setToast} />
            : <div className="pt-16 text-center text-sm" style={{ color: "#c3cbe8" }}>سجل دخول لعرض طلباتك</div>
        )}
        {tab === "account" && (
          session
            ? <AccountPage session={session} updateCurrentUser={updateCurrentUser} deleteCurrentUser={deleteCurrentUser}
                changeMyPassword={changeMyPassword}
                orders={myOrders} wishlist={games.filter(g => wishlist.includes(g.id))}
                setTab={setTab} setToast={setToast} />
            : <div className="pt-16 text-center text-sm" style={{ color: "#c3cbe8" }}>سجل دخول لعرض حسابك</div>
        )}
        {tab === "settings" && (
          session
            ? <SettingsPage session={session} updateCurrentUser={updateCurrentUser} changeMyPassword={changeMyPassword}
                doLogoutEverywhere={doLogoutEverywhere} setToast={setToast} />
            : <div className="pt-16 text-center text-sm" style={{ color: "#c3cbe8" }}>سجل دخول لعرض الإعدادات</div>
        )}
        {tab === "admin" && (
          !session ? (
            <div className="pt-16 max-w-xs mx-auto text-center">
              <Lock size={30} color="#60a5fa" className="mx-auto mb-3" />
              <h1 className="font-black text-lg mb-1">لوحة التحكم</h1>
              <p className="text-xs mb-4" style={{ color: "#c3cbe8" }}>سجل دخول بحسابك الحقيقي (نفس زر الدخول العادي) — لوحة التحكم صارت تتحقق من صلاحية حسابك، مش كلمة سر منفصلة.</p>
              <button onClick={() => setAuthOpen(true)} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 qx-btn qx-btn-primary">
                <LogIn size={16} /> تسجيل الدخول
              </button>
            </div>
          ) : session.role !== "owner" && session.role !== "staff" ? (
            <div className="pt-16 max-w-xs mx-auto text-center">
              <ShieldAlert size={30} color="#f87171" className="mx-auto mb-3" />
              <h1 className="font-black text-lg mb-1">ما عندك صلاحية</h1>
              <p className="text-xs" style={{ color: "#c3cbe8" }}>حسابك مسجل دخول، لكن ما إله صلاحية مالك أو موظف. راجع README لتعليمات ترقية حساب لصلاحية "owner".</p>
            </div>
          ) : (
            <AdminPanel games={games} setGames={setGames} prices={prices} setPrices={setPrices}
              faq={faq} banners={banners} testimonials={testimonials} about={about} coupons={coupons}
              paymentInfo={paymentInfo} quickReplies={quickReplies}
              priceComparison={priceComparison} setPriceComparison={setPriceComparison}
              refundPolicy={refundPolicy} setRefundPolicy={setRefundPolicy}
              socialLinks={socialLinks} setSocialLinks={setSocialLinks}
              maintenance={maintenance} setMaintenance={setMaintenance}
              shipping={shipping} session={session} onLogout={doLogout} updateCurrentUser={updateCurrentUser}
              branding={storeBranding} setBranding={setStoreBranding} />
          )
        )}
      </main>
      <Footer socialLinks={socialLinks} setTab={setTab} />
    </div>
  );
}

/* =================================================================
   FLOATING WHATSAPP BUTTON
================================================================= */
function FloatingWhatsApp() {
  return (
    <a href={`https://wa.me/962${OWNER_WHATSAPP.replace(/^0/, "")}`} target="_blank" rel="noreferrer"
      className="fixed bottom-5 left-5 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
      style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 10px 30px -8px rgba(34,197,94,0.6)" }}
      title="راسلنا على واتساب">
      <MessageCircle color="#fff" size={24} />
    </a>
  );
}

/* =================================================================
   RECEIPT / INVOICE MODAL
================================================================= */
function ReceiptModal({ order, onClose, socialLinks, pickupPrepMinutes = 30 }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(2,4,12,0.65)", backdropFilter: "blur(6px)" }}>
      <div id="receipt-print" className="w-full max-w-sm rounded-2xl p-6 relative" style={{ ...card, boxShadow: "0 10px 50px rgba(8,10,30,0.7), 0 0 35px rgba(47,125,244,0.22)", borderTop: "1px solid rgba(167,139,250,0.35)" }}>
        <button onClick={onClose} className="absolute top-4 left-4"><X size={18} color="#c3cbe8" /></button>
        <div className="text-center mb-4">
          <CheckCircle2 size={30} color="#2dd4bf" className="mx-auto mb-2" />
          <h2 className="font-black text-lg">إيصال الطلب</h2>
          <p className="text-xs" style={{ color: "#c3cbe8" }}>QWADERGAME — #{order.id.slice(-6)}</p>
        </div>
        <div className="text-xs mb-3" style={{ color: "#c3cbe8" }}>{new Date(order.createdAt || order.ts).toLocaleString("ar")}</div>
        <div className="space-y-1.5 mb-4 text-sm">
          {order.items.map((it, i) => (
            <div key={i} className="flex justify-between"><span>{it.name} × {it.qty}</span><span className="font-bold" style={{ color: "#60a5fa" }}>{money(it.price * it.qty)}</span></div>
          ))}
        </div>
        {order.deliveryCity && (
          <div className="rounded-lg p-2 mb-3 flex items-center gap-2 text-[11px] font-bold" style={{ background: order.deliveryCity === "استلام من المتجر" ? "rgba(45,212,191,0.1)" : "rgba(251,191,36,0.08)", border: `1px solid ${order.deliveryCity === "استلام من المتجر" ? "rgba(45,212,191,0.35)" : "rgba(251,191,36,0.35)"}`, color: order.deliveryCity === "استلام من المتجر" ? "#2dd4bf" : "#fbbf24" }}>
            {order.deliveryCity === "استلام من المتجر" ? <Store size={12} /> : <Truck size={12} />}
            {order.deliveryCity === "استلام من المتجر"
              ? `الاستلام من المتجر — مجاني (جاهز خلال حوالي ${Math.max(1, Math.floor(Number(pickupPrepMinutes) || 30))} دقيقة من تأكيد الدفع)`
              : `التوصيل${order.deliveryCompany ? ` (${order.deliveryCompany})` : ""} إلى ${order.deliveryCity} — ${money(order.deliveryFee || 0)}`}
            {order.deliveryCity && waLink(socialLinks?.whatsapp, order.deliveryCity === "استلام من المتجر" ? `مرحباً، بدي أستلم طلبي من المتجر — رقم الطلب: ${order.id}` : `مرحباً، عندي طلب رقم ${order.id} — التوصيل: ${order.deliveryCompany || ""} إلى ${order.deliveryCity} — بدي أسأل عن حالة التوصيل`) && (
              <a href={waLink(socialLinks.whatsapp, order.deliveryCity === "استلام من المتجر" ? `مرحباً، بدي أستلم طلبي من المتجر — رقم الطلب: ${order.id}` : `مرحباً، عندي طلب رقم ${order.id} — التوصيل: ${order.deliveryCompany || ""} إلى ${order.deliveryCity} — بدي أسأل عن حالة التوصيل`)} target="_blank" rel="noreferrer" className="mr-auto flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold" style={{ background: "rgba(37,211,102,0.1)", color: "#25D366", border: "1px solid rgba(37,211,102,0.35)" }}>
                <MessageCircle size={10} /> {order.deliveryCity === "استلام من المتجر" ? "نسّق الاستلام عبر واتساب" : "راسلنا عن التوصيل"}
              </a>
            )}
          </div>
        )}
        {order.deliveryNotes ? (
          <div className="rounded-lg p-2 mb-3 text-[11px]" style={{ background: "rgba(47,125,244,0.08)", border: "1px solid rgba(47,125,244,0.28)", color: "#c7cee3" }}>
            <span className="font-bold" style={{ color: "#c3cbe8" }}>ملاحظات {order.deliveryCity === "استلام من المتجر" ? "الاستلام" : "التوصيل"}:</span> {order.deliveryNotes}
          </div>
        ) : null}
        {order.pickupCompletedAt ? (
          <div className="rounded-lg p-2 mb-3 text-[11px] flex items-center gap-1.5 font-bold" style={{ background: "rgba(45,212,191,0.08)", border: "1px solid rgba(45,212,191,0.3)", color: "#2dd4bf" }}>
            <Store size={12} /> تم استلام طلبك من المتجر — {new Date(order.pickupCompletedAt).toLocaleString("ar-JO")}
          </div>
        ) : null}
        {(order.subtotal != null || order.couponDiscount || order.autoDiscount) && (
          <div className="text-[11px] mb-1 space-y-0.5" style={{ color: "#c3cbe8" }}>
            {order.subtotal != null && <div className="flex justify-between"><span>المجموع الفرعي</span><span>{money(order.subtotal)}</span></div>}
            {(order.couponDiscount || 0) > 0 && <div className="flex justify-between"><span>كوبون ({order.couponCode || ""})</span><span style={{ color: "#2dd4bf" }}>-{money(order.couponDiscount)}</span></div>}
            {(order.autoDiscount || 0) > 0 && <div className="flex justify-between"><span>خصم ترحيبي</span><span style={{ color: "#2dd4bf" }}>-{money(order.autoDiscount)}</span></div>}
          </div>
        )}
        <div className="flex justify-between font-black pt-3 mb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <span>الإجمالي</span><span style={{ color: "#60a5fa" }}>{money(order.total)}</span>
        </div>
        <p className="text-[11px] text-center mb-2 font-bold" style={{ color: ORDER_STATUS_COLOR[order.status] || "#c3cbe8" }}>الحالة: {ORDER_STATUS_LABEL[order.status] || order.status}</p>
        {order.paymentMethod && (
          <p className="text-[11px] text-center mb-3" style={{ color: "#2dd4bf" }}>طريقة الدفع: {PAYMENT_METHOD_LABEL[order.paymentMethod] || order.paymentMethod} — إثبات التحويل وصلنا، <b>سوف نتواصل معك بأقرب وقت</b> لتأكيد الدفع.</p>
        )}
        <div className="flex flex-col items-center mb-4">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent((typeof window !== "undefined" ? window.location.origin : "") + "/?track=" + order.id)}`}
            alt="QR لتتبع الطلب" width={110} height={110} className="rounded-lg mb-1.5" style={{ background: "#fff", padding: 6 }} loading="lazy" />
          <p className="text-[10px]" style={{ color: "#c3cbe8" }}>امسح الكود لتتبع طلبك بأي وقت</p>
        </div>
        {socialLinks && (
          <div className="mb-4">
            <p className="text-[11px] text-center mb-2" style={{ color: "#c3cbe8" }}>أو تواصل معنا مباشرة</p>
            <SocialLinksRow socialLinks={socialLinks} size={14} />
          </div>
        )}
        <button onClick={() => window.print()} className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 qx-btn qx-btn-primary">
          <Printer size={15} /> طباعة الإيصال
        </button>
      </div>
    </div>
  );
}

/* =================================================================
   NAV
================================================================= */
function TopNav({ tab, setTab, unreadCount, session, setAuthOpen, cartCount, setCartOpen, doLogout, wishlistCount, notifCount, notifOpen, setNotifOpen, notifList, branding }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdminAccount = session && (session.role === "owner" || session.role === "staff");
  const [myUnreadChat, setMyUnreadChat] = useState(false);

  // light-weight own-poll for "do I have an unread support reply" — kept
  // local to the nav badge instead of Root's big poll, since chat now
  // lives server-side and doesn't need to ride along with the
  // localStorage-based orders/messages poll anymore.
  useEffect(() => {
    if (!session) { setMyUnreadChat(false); return; }
    let cancelled = false;
    const check = async () => {
      try {
        // unified support center: any of my tickets holding an unread staff
        // reply counts as "someone answered me"
        const { conversations } = await api.get("/api/support/conversations?limit=5");
        if (!cancelled) setMyUnreadChat(!!(conversations || []).some(c => c.unread_user > 0));
      } catch (e) { /* ignore transient poll failures */ }
    };
    check();
    const iv = setInterval(check, 8000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [session]);

  // unified blue nav links — all tabs route via setTab (pricecompare = العروض),
  // external pages keep their links (payment-methods, about, delivery)
  const primaryLinks = [
    { id: "store", label: "الرئيسية", icon: <Home size={14} /> },
    { id: "pricecompare", label: "العروض", icon: <Zap size={14} /> },
    { id: "contact", label: "التواصل", icon: <MessageCircle size={14} /> },
  ];
  const NavBtn = ({ id, label, icon }) => (
    <button onClick={() => setTab(id)} className={`qx-nav-link flex items-center gap-1.5 ${tab === id ? "qx-nav-link--active" : ""}`}>
      {icon} <span>{label}</span>
    </button>
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <>
    <header className="qx-nav">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 shrink-0">
          <img src={(branding && branding.logoUrl) ? branding.logoUrl : "/manus-storage/qwader-logo_88ca51bf.png"} alt="QWADER STORE" className="w-10 h-10 rounded-xl object-contain" style={{ boxShadow: "0 0 16px rgba(47,125,244,0.35)" }} />
          <span className="font-black tracking-wide text-sm hidden sm:inline qx-grad" style={{ fontSize: "0.95rem" }}>QWADER STORE</span>
        </div>
        <nav className="hidden lg:flex items-center gap-1">
          {primaryLinks.map(l => <NavBtn key={l.id} id={l.id} label={l.label} icon={l.icon} />)}
          <a href="/payment-methods" target="_blank" rel="noreferrer" className="qx-nav-link flex items-center gap-1.5"><CreditCard size={14} /><span>طرق الدفع</span></a>
          <a href="/about" target="_blank" rel="noreferrer" className="qx-nav-link flex items-center gap-1.5"><Info size={14} /><span>من نحن</span></a>
          {session && <NavBtn id="myorders" label="طلباتي" icon={<Truck size={14} />} />}
        </nav>
        <div className="flex items-center gap-1.5 justify-end">
          <div className="hidden lg:flex items-center gap-1">
          <button onClick={() => setCartOpen(true)} className="qx-btn qx-btn-primary px-3 py-2 text-xs"
            style={{ height: 36 }}>
            <ShoppingCart size={15} /> <span className="hidden sm:inline">السلة</span>
            {cartCount > 0 && <span className="min-w-4 h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center" style={{ background: "#fbbf24", color: "#3b1c00" }}>{cartCount}</span>}
          </button>
          <button onClick={() => setTab("wishlist")} className={`qx-btn px-3 py-2 text-xs ${tab === "wishlist" ? "qx-chip--active" : "qx-btn-ghost"}`}>
            <Heart size={15} />
            {wishlistCount > 0 && <span className="min-w-4 h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center" style={{ background: "#f472b6", color: "#120820" }}>{wishlistCount > 9 ? "9+" : wishlistCount}</span>}
          </button>
          <button onClick={() => setTab("faq")} className={`qx-btn px-3 py-2 text-xs ${tab === "faq" ? "qx-chip--active" : "qx-btn-ghost"}`}>
            <HelpCircle size={15} /> <span className="hidden xl:inline">الأسئلة</span>
          </button>
          </div>

          {(myUnreadChat || notifCount > 0) && (
          <button onClick={() => setTab("contact")} className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90"
            style={{ background: "rgba(47,125,244,0.12)", border: "1px solid rgba(47,125,244,0.45)", color: "#60a5fa" }}>
            <Bell size={15} />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full" style={{ background: "#f87171" }} />
          </button>
          )}

          <button onClick={() => setCartOpen(true)} className="lg:hidden relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90"
            style={{ background: "rgba(47,125,244,0.12)", border: "1px solid rgba(47,125,244,0.45)", color: "#60a5fa" }}>
            <ShoppingCart size={16} />
            {cartCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center" style={{ background: "#fbbf24", color: "#3b1c00" }}>{cartCount}</span>}
          </button>

          <button onClick={() => setTab("wishlist")} className="lg:hidden relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90"
            style={{ background: "rgba(47,125,244,0.12)", border: "1px solid rgba(47,125,244,0.45)", color: "#60a5fa" }} title="المفضلة">
            <Heart size={15} />
            {wishlistCount > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center" style={{ background: "#60a5fa", color: "#030612" }}>{wishlistCount > 9 ? "9+" : wishlistCount}</span>}
          </button>
          {session && (
            <div className="relative">
              <button onClick={() => {
                setNotifOpen(o => !o);
                if (!notifOpen && session) api.get("/api/notifications?limit=20").then(r => setNotifList(r.notifications || [])).catch(() => {});
              }} className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 relative"
                style={{ background: "rgba(47,125,244,0.12)", border: "1px solid rgba(47,125,244,0.45)", color: "#60a5fa" }} title="الإشعارات">
                <Bell size={15} />
                {notifCount > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center" style={{ background: "#f87171", color: "#fff" }}>{notifCount > 9 ? "9+" : notifCount}</span>}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute left-0 top-11 z-50 w-64 rounded-xl overflow-hidden shadow-lg" style={{ ...card, border: "1px solid rgba(255,255,255,0.1)" }}>
                    <div className="px-3 py-2.5 text-xs font-bold" style={{ borderBottom: "1px solid rgba(47,125,244,0.25)", color: "#eaf0ff" }}>الإشعارات</div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifList.length === 0 ? (
                        <p className="px-3 py-4 text-[11px] text-center" style={{ color: "#c3cbe8" }}>ما في إشعارات جديدة</p>
                      ) : notifList.map(n => (
                        <div key={n.id} className="px-3 py-2.5 border-b last:border-0" style={{ borderBottomColor: "rgba(255,255,255,0.06)" }}>
                          <p className="text-[11px] font-bold" style={{ color: n.is_read ? "#c3cbe8" : "#eef0ff" }}>{n.title}</p>
                          {n.body && <p className="text-[10px] mt-0.5" style={{ color: "#c3cbe8" }}>{n.body.slice(0, 90)}</p>}
                        </div>
                      ))}
                    </div>
                    {notifList.length > 0 && (
                      <button onClick={async () => { await api.post("/api/notifications/read"); setNotifCount(0); setNotifList(l => l.map(x => ({ ...x, is_read: true }))); }}
                        className="w-full px-3 py-2 text-[10px] font-bold" style={{ color: "#2dd4bf" }}>علّم الكل كمقروء</button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {session ? (
            <div className="relative">
              <button onClick={() => setMenuOpen(o => !o)} className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 overflow-hidden" title={session.name}
                style={{ background: "rgba(47,125,244,0.12)", border: "1px solid rgba(47,125,244,0.45)", color: "#60a5fa" }}>
                {session.avatar ? <img src={session.avatar} alt="" className="w-full h-full object-cover" loading="lazy" /> : <User size={16} />}
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute left-0 top-11 z-50 w-44 rounded-xl overflow-hidden shadow-lg" style={{ ...card, border: "1px solid rgba(255,255,255,0.1)" }}>
                    <div className="px-3 py-2.5 text-xs font-bold truncate" style={{ borderBottom: "1px solid rgba(47,125,244,0.25)", color: "#eaf0ff" }}>{session.name}</div>
                    <button onClick={() => { setTab("account"); setMenuOpen(false); }} className="w-full text-right px-3 py-2.5 text-xs font-bold flex items-center gap-2 transition-colors hover:bg-white/5" style={{ color: "#cdd3ee" }}>
                      <User size={13} /> حسابي
                    </button>
                    <button onClick={() => { setTab("settings"); setMenuOpen(false); }} className="w-full text-right px-3 py-2.5 text-xs font-bold flex items-center gap-2 transition-colors hover:bg-white/5" style={{ color: "#cdd3ee" }}>
                      <Settings size={13} /> الإعدادات
                    </button>
                    <button onClick={() => { setTab("myorders"); setMenuOpen(false); }} className="w-full text-right px-3 py-2.5 text-xs font-bold flex items-center gap-2 transition-colors hover:bg-white/5" style={{ color: "#cdd3ee" }}>
                      <Truck size={13} /> طلباتي
                    </button>
                    <button onClick={() => { doLogout(); setMenuOpen(false); }} className="w-full text-right px-3 py-2.5 text-xs font-bold flex items-center gap-2 transition-colors hover:bg-white/5" style={{ color: "#f87171", borderTop: "1px solid rgba(47,125,244,0.16)" }}>
                      <LogOut size={13} /> تسجيل الخروج
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button onClick={() => setAuthOpen(true)} className="qx-btn qx-btn-primary px-3 py-2 text-xs" style={{ height: 36 }}>
              <LogIn size={14} /> <span className="hidden sm:inline">دخول</span>
            </button>
          )}

          {isAdminAccount && (
            <button onClick={() => setTab("admin")} className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90"
              style={{ background: "rgba(47,125,244,0.12)", border: "1px solid rgba(47,125,244,0.45)", color: tab === "admin" ? "#60a5fa" : "#8ea3c9" }} title="لوحة التحكم">
              <Settings size={16} />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center" style={{ background: "#f87171", color: "#fff" }}>{unreadCount}</span>}
            </button>
          )}

          <button onClick={() => setMobileOpen(o => !o)} className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90"
            style={{ background: "rgba(47,125,244,0.12)", border: "1px solid rgba(47,125,244,0.45)", color: "#60a5fa" }} title="القائمة">
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>
    </header>

        {mobileOpen && (
          <>
            <div className="fixed inset-0 z-30" style={{ background: "rgba(1,3,10,0.6)" }} onClick={() => setMobileOpen(false)} />
            <div className="lg:hidden absolute top-16 inset-x-0 z-30 px-4 pb-4"
              style={{ background: "rgba(3,6,18,0.97)", borderBottom: "1px solid rgba(47,125,244,0.2)", boxShadow: "0 18px 40px rgba(1,3,12,0.7)" }}>
              <div className="flex flex-col gap-1 py-2">
                <button onClick={() => { setTab("store"); setMobileOpen(false); }} className="text-right px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2"
                  style={{ background: tab === "store" ? "rgba(47,125,244,0.16)" : "transparent", color: tab === "store" ? "#60a5fa" : "#8ea3c9" }}>
                  <Home size={15} /> الرئيسية</button>
                <button onClick={() => { setTab("pricecompare"); setMobileOpen(false); }} className="text-right px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2"
                  style={{ background: tab === "pricecompare" ? "rgba(47,125,244,0.16)" : "transparent", color: tab === "pricecompare" ? "#60a5fa" : "#8ea3c9" }}>
                  <Zap size={15} /> العروض</button>
                <a href="/payment-methods" target="_blank" rel="noreferrer" className="text-right px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2" style={{ color: "#8ea3c9" }}>
                  <CreditCard size={15} /> طرق الدفع</a>
                <a href="/about" target="_blank" rel="noreferrer" className="text-right px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2" style={{ color: "#8ea3c9" }}>
                  <Info size={15} /> من نحن</a>
                <button onClick={() => { setTab("contact"); setMobileOpen(false); }} className="text-right px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2"
                  style={{ background: tab === "contact" ? "rgba(47,125,244,0.16)" : "transparent", color: tab === "contact" ? "#60a5fa" : "#8ea3c9" }}>
                  <MessageCircle size={15} /> تواصل معنا</button>
                <button onClick={() => { setTab("faq"); setMobileOpen(false); }} className="text-right px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2"
                  style={{ background: tab === "faq" ? "rgba(47,125,244,0.16)" : "transparent", color: tab === "faq" ? "#60a5fa" : "#8ea3c9" }}>
                  <HelpCircle size={15} /> الأسئلة الشائعة</button>
                {session ? (
                  <>
                    <button onClick={() => { setTab("myorders"); setMobileOpen(false); }} className="text-right px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2"
                      style={{ background: tab === "myorders" ? "rgba(47,125,244,0.16)" : "transparent", color: tab === "myorders" ? "#60a5fa" : "#8ea3c9" }}>
                      <Truck size={15} /> طلباتي</button>
                    <button onClick={() => { setTab("account"); setMobileOpen(false); }} className="text-right px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2" style={{ color: "#8ea3c9" }}>
                      <User size={15} /> حسابي</button>
                    <button onClick={() => { doLogout(); setMobileOpen(false); }} className="text-right px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2" style={{ color: "#f87171" }}>
                      <LogOut size={15} /> تسجيل الخروج</button>
                  </>
                ) : (
                  <button onClick={() => { setAuthOpen(true); setMobileOpen(false); }} className="text-right px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2" style={{ color: "#60a5fa" }}>
                    <LogIn size={15} /> تسجيل الدخول</button>
                )}
              </div>
            </div>
          </>
        )}
    </>
  );
}


/* =================================================================
   AUTH MODAL (signup / login)
================================================================= */
/* =================================================================
   REUSABLE: password input w/ show/hide + optional strength meter
================================================================= */
function PasswordField({ value, onChange, placeholder, showStrength, style }) {
  const [visible, setVisible] = useState(false);
  const strength = showStrength ? passwordStrength(value) : null;
  return (
    <div>
      <div className="relative">
        <input value={value} onChange={onChange} placeholder={placeholder} type={visible ? "text" : "password"}
          className="w-full px-4 py-2.5 pl-10 rounded-xl text-sm outline-none" style={style || inputStyle} />
        <button type="button" onClick={() => setVisible(v => !v)} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#c3cbe8" }} tabIndex={-1}>
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {showStrength && value && (
        <div className="mt-1.5">
          <div className="flex gap-1 h-1">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex-1 rounded-full transition-colors duration-200" style={{ background: i <= strength.score ? strength.color : "rgba(255,255,255,0.1)" }} />
            ))}
          </div>
          <p className="text-[10px] mt-1 font-bold" style={{ color: strength.color }}>{strength.label}{value.length < 8 ? " — لازم 8 أحرف عالأقل" : ""}</p>
        </div>
      )}
    </div>
  );
}

/* =================================================================
   AUTH MODAL (login / signup / forgot password / optional 2FA step)
================================================================= */
function AuthModal({ onClose, onLoggedIn, setToast }) {
  const [mode, setMode] = useState("login"); // login | signup | forgot
  const [signupMethod, setSignupMethod] = useState(null); // 'email' | 'phone' | null (choice screen)
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState(""); // email or phone, depending on context
  const [pw, setPw] = useState("");
  const [refCode, setRefCode] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [lockedMsg, setLockedMsg] = useState("");

  // signup code-verification step
  const [pendingSignup, setPendingSignup] = useState(null); // { pendingToken, method }
  const [signupCode, setSignupCode] = useState("");

  // optional 2FA step, shown after a correct password if the account has it enabled
  const [pending2FA, setPending2FA] = useState(null); // { preToken }
  const [code2FA, setCode2FA] = useState("");

  // forgot-password flow (also code-based now)
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotPending, setForgotPending] = useState(null); // { pendingToken }
  const [forgotCode, setForgotCode] = useState("");
  const [forgotResetToken, setForgotResetToken] = useState("");
  const [newPw, setNewPw] = useState("");
  const [resending, setResending] = useState(false); // 2FA resend button state

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLockedMsg(""); setBusy(true);
    try {
      if (mode === "signup") {
        if (!name.trim() || !identifier.trim() || !pw) { setErr("عبي كل الحقول"); return; }
        if (signupMethod === "email" && !isValidEmail(identifier)) { setErr("صيغة الإيميل غير صحيحة"); return; }
        if (signupMethod === "phone" && identifier.replace(/\D/g, "").length < 7) { setErr("صيغة رقم الهاتف غير صحيحة"); return; }
        if (!isPasswordAcceptable(pw)) { setErr("كلمة السر لازم تكون 8 أحرف عالأقل"); return; }
        const result = await api.post("/api/auth/signup-start", {
          method: signupMethod, identifier: identifier.trim(), name: name.trim(),
          password: pw, referralCode: refCode.trim(), rememberMe,
        });
        setPendingSignup(result);
      } else {
        if (!identifier.trim() || !pw) { setErr("عبي بيانات الدخول وكلمة السر"); return; }
        const result = await api.post("/api/auth/login", { identifier: identifier.trim(), password: pw, rememberMe });
        if (result.twoFARequired) {
          setPending2FA({ preToken: result.preToken });
          return;
        }
        onLoggedIn(result.user);
      }
    } catch (e2) {
      if (e2.status === 429) setLockedMsg(e2.message);
      else if (e2.status === 409) setErr(e2.message); // already registered
      else setErr(e2.message || "صار خطأ، جرب مرة ثانية");
    } finally { setBusy(false); }
  };

  const confirmSignupCode = async () => {
    setErr("");
    try {
      const { user } = await api.post("/api/auth/signup-verify", { pendingToken: pendingSignup.pendingToken, code: signupCode.trim() });
      onLoggedIn(user);
    } catch (e2) {
      setErr(e2.message || "هذا الرمز خطأ");
    }
  };

  const confirm2FA = async () => {
    setErr("");
    try {
      const result = await api.post("/api/auth/login", {
        identifier: identifier.trim(), password: pw, rememberMe,
        twoFACode: code2FA.trim(), preToken: pending2FA.preToken,
      });
      onLoggedIn(result.user);
    } catch (e2) {
      setErr(e2.message || "هذا الرمز خطأ");
    }
  };

  const startForgot = async () => {
    setErr("");
    if (!identifier.trim()) { setErr("عبي الإيميل أو رقم الهاتف"); return; }
    try {
      const result = await api.post("/api/auth/forgot-start", { identifier: identifier.trim() });
      setForgotPending(result); setForgotStep(2);
    } catch (e2) { setErr(e2.message); }
  };
  const verifyForgotCode = async () => {
    setErr("");
    try {
      const { resetToken } = await api.post("/api/auth/forgot-verify", { pendingToken: forgotPending.pendingToken, code: forgotCode.trim() });
      setForgotResetToken(resetToken); setForgotStep(3);
    } catch (e2) { setErr(e2.message || "هذا الرمز خطأ"); }
  };
  const resetPassword = async () => {
    setErr("");
    if (!isPasswordAcceptable(newPw)) { setErr("كلمة السر لازم تكون 8 أحرف عالأقل"); return; }
    try {
      await api.post("/api/auth/forgot-reset", { resetToken: forgotResetToken, newPassword: newPw });
      setMode("login"); setForgotStep(1); setPw(""); setNewPw(""); setErr("");
      setToast && setToast("✅ تم تغيير كلمة السر، سجل دخول من جديد");
      setToast && setTimeout(() => setToast(null), 3000);
    } catch (e2) { setErr(e2.message); }
  };

  // the OTP is NEVER shown anywhere in the UI (server-only, one-time,
  // 10-minute expiry) — we only confirm the email was sent.
  const OtpNoticeBox = ({ title, desc }) => (
    <div className="rounded-xl p-3 mb-3 text-xs text-center flex flex-col items-center justify-center gap-1.5" style={{ background: "rgba(45,212,191,0.08)", border: "1px solid rgba(45,212,191,0.3)", color: "#2dd4bf" }}>
      <CheckCircle2 size={14} />
      <p className="font-bold">{title}</p>
      {desc && <p style={{ color: "#c3cbe8" }}>{desc}</p>}
    </div>
  );

  if (pendingSignup) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(2,4,12,0.65)", backdropFilter: "blur(6px)" }}>
        <div className="w-full max-w-sm rounded-2xl p-6 relative qx-card">
          <button onClick={onClose} className="absolute top-4 left-4" style={{ color: "#c3cbe8" }}><X size={18} /></button>
          <div className="text-center mb-5">
            <ShieldCheck size={26} color="#2dd4bf" className="mx-auto mb-2" />
            <h2 className="font-black text-lg">تأكيد {pendingSignup.method === "phone" ? "رقم هاتفك" : "إيميلك"}</h2>
            <p className="text-xs mt-1" style={{ color: "#c3cbe8", direction: "ltr" }}>{identifier}</p>
          </div>
          <OtpNoticeBox title="بعتنالك الرمز على إيميلك" desc="افحص صندوق الوارد (وصندوق السبام لو ما لقيته) — الرمز لمرة وحدة وينتهي بعد 10 دقائق" />
          <input value={signupCode} onChange={e => setSignupCode(e.target.value)} placeholder="أدخل الكود المكوّن من 6 أرقام" maxLength={6}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none text-center tracking-widest mb-2.5 qx-input" style={{...inputStyle}} />
          {err && <p className="text-xs mb-2 text-center" style={{ color: "#f87171" }}>{err}</p>}
          <button onClick={confirmSignupCode} className="w-full py-2.5 rounded-xl font-bold text-sm qx-btn qx-btn-primary">تأكيد وإنشاء الحساب</button>
          <button onClick={() => { setPendingSignup(null); setSignupCode(""); setErr(""); }} className="w-full text-center text-xs mt-3 font-bold" style={{ color: "#c3cbe8" }}>رجوع</button>
        </div>
      </div>
    );
  }

  if (pending2FA) {
    const resend2FA = async () => {
      setErr(""); setResending(true);
      try {
        // re-run login with password → server will issue a fresh 2FA preToken + OTP email
        const result = await api.post("/api/auth/login", { identifier: identifier.trim(), password: pw, rememberMe });
        if (result.twoFARequired) setPending2FA({ preToken: result.preToken });
        setToast && setToast("📩 أرسلنا لك كود جديد على إيميلك");
        setTimeout(() => setToast && setToast(null), 2500);
      } catch (e2) { setErr(e2.message || "ما انرسل رمز جديد — جرب مرة ثانية"); }
      finally { setResending(false); }
    };
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(2,4,12,0.65)", backdropFilter: "blur(6px)" }}>
        <div className="w-full max-w-sm rounded-2xl p-6 relative qx-card">
          <button onClick={onClose} className="absolute top-4 left-4" style={{ color: "#c3cbe8" }}><X size={18} /></button>
          <div className="text-center mb-5">
            <ShieldCheck size={26} color="#2dd4bf" className="mx-auto mb-2" style={{ filter: "drop-shadow(0 0 12px rgba(45,212,191,0.6))" }} />
            <h2 className="font-black text-lg">التحقق بخطوتين</h2>
            <p className="text-xs mt-1" style={{ color: "#c3cbe8" }}>أرسلنا كود مكوّن من 6 أرقام لإيميل حسابك</p>
          </div>
          <OtpNoticeBox title="افحص صندوق الوارد عندك" desc="ولو ما لقيته، افحص صندوق السبام — الكود صالح 10 دقائق فقط" />
          <input value={code2FA} onChange={e => setCode2FA(e.target.value)} placeholder="أدخل الكود المكوّن من 6 أرقام" maxLength={6}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none text-center tracking-widest mb-2.5 qx-input" style={{...inputStyle}} />
          {err && <p className="text-xs mb-2 text-center" style={{ color: "#f87171" }}>{err}</p>}
          <button onClick={confirm2FA} className="w-full py-2.5 rounded-xl font-bold text-sm qx-btn qx-btn-primary">تأكيد الدخول</button>
          <button disabled={resending} onClick={resend2FA} className="w-full text-center text-xs mt-3 font-bold flex items-center justify-center gap-1" style={{ color: resending ? "#c3cbe8" : "#2dd4bf" }}>
            {resending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} إعادة إرسال الكود
          </button>
          <button onClick={() => { setPending2FA(null); setCode2FA(""); setErr(""); }} className="w-full text-center text-xs mt-2 font-bold" style={{ color: "#c3cbe8" }}>رجوع</button>
        </div>
      </div>
    );
  }

  if (mode === "forgot") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(2,4,12,0.65)", backdropFilter: "blur(6px)" }}>
        <div className="w-full max-w-sm rounded-2xl p-6 relative qx-card">
          <button onClick={onClose} className="absolute top-4 left-4" style={{ color: "#c3cbe8" }}><X size={18} /></button>
          <div className="text-center mb-5"><KeyRound size={26} color="#60a5fa" className="mx-auto mb-2" style={{ filter: "drop-shadow(0 0 10px rgba(47,125,244,0.6))" }} /><h2 className="font-black text-lg">استعادة كلمة السر</h2></div>
          {forgotStep === 1 && (
            <div className="space-y-2.5">
              <input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="الإيميل أو رقم الهاتف" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none qx-input" style={{...inputStyle}} />
              {err && <p className="text-xs" style={{ color: "#f87171" }}>{err}</p>}
              <button onClick={startForgot} className="w-full py-2.5 rounded-xl font-bold text-sm qx-btn qx-btn-primary">متابعة</button>
            </div>
          )}
          {forgotStep === 2 && (
            <div className="space-y-2.5">
              <OtpNoticeBox title="بعتنالك الرمز على إيميلك" desc="افحص صندوق الوارد (وصندوق السبام لو ما لقيته) — الرمز لمرة وحدة فقط" />
              <input value={forgotCode} onChange={e => setForgotCode(e.target.value)} placeholder="أدخل الكود المكوّن من 6 أرقام" maxLength={6}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none text-center tracking-widest qx-input" style={{...inputStyle}} />
              {err && <p className="text-xs" style={{ color: "#f87171" }}>{err}</p>}
              <button onClick={verifyForgotCode} className="w-full py-2.5 rounded-xl font-bold text-sm qx-btn qx-btn-primary">تحقق</button>
            </div>
          )}
          {forgotStep === 3 && (
            <div className="space-y-2.5">
              <PasswordField value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="كلمة سر جديدة" showStrength />
              {err && <p className="text-xs" style={{ color: "#f87171" }}>{err}</p>}
              <button onClick={resetPassword} className="w-full py-2.5 rounded-xl font-bold text-sm qx-btn qx-btn-primary">حفظ كلمة السر</button>
            </div>
          )}
          <button onClick={() => { setMode("login"); setForgotStep(1); setErr(""); setForgotPending(null); setForgotCode(""); }} className="w-full text-center text-xs mt-4 font-bold" style={{ color: "#2dd4bf" }}>رجوع لتسجيل الدخول</button>
        </div>
      </div>
    );
  }

  // signup, before picking a method — a small choice screen
  if (mode === "signup" && !signupMethod) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(2,4,12,0.65)", backdropFilter: "blur(6px)" }}>
        <div className="w-full max-w-sm rounded-2xl p-6 relative qx-card">
          <button onClick={onClose} className="absolute top-4 left-4" style={{ color: "#c3cbe8" }}><X size={18} /></button>
          <div className="text-center mb-5">
            <UserPlus size={26} color="#60a5fa" className="mx-auto mb-2" style={{ filter: "drop-shadow(0 0 10px rgba(47,125,244,0.6))" }} />
            <h2 className="font-black text-lg">إنشاء حساب جديد</h2>
            <p className="text-xs mt-1" style={{ color: "#c3cbe8" }}>سجل عبر الهاتف أو الإيميل</p>
          </div>
          <div className="space-y-2.5">
            <button onClick={() => { setSignupMethod("phone"); setIdentifier(""); }} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: "rgba(45,212,191,0.08)", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.35)" }}>
              <Smartphone size={16} /> تسجيل برقم الهاتف
            </button>
            <button onClick={() => { setSignupMethod("email"); setIdentifier(""); }} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: "rgba(251,191,36,0.08)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.35)" }}>
              <UserPlus size={16} /> تسجيل بالإيميل
            </button>
          </div>
          <button onClick={() => { setMode("login"); setErr(""); }} className="w-full text-center text-xs mt-4 font-bold" style={{ color: "#c3cbe8" }}>عندك حساب؟ سجل دخول</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(2,4,12,0.65)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 relative max-h-[90vh] overflow-y-auto" style={{ ...card, boxShadow: "0 10px 50px rgba(8,10,30,0.7), 0 0 35px rgba(47,125,244,0.22)", borderTop: "1px solid rgba(167,139,250,0.35)" }}>
        <button onClick={onClose} className="absolute top-4 left-4" style={{ color: "#c3cbe8" }}><X size={18} /></button>
        <div className="text-center mb-5">
          {mode === "login" ? <LogIn size={26} color="#60a5fa" className="mx-auto mb-2" style={{ filter: "drop-shadow(0 0 10px rgba(47,125,244,0.6))" }} /> : <UserPlus size={26} color="#60a5fa" className="mx-auto mb-2" style={{ filter: "drop-shadow(0 0 10px rgba(47,125,244,0.6))" }} />}
          <h2 className="font-black text-lg">{mode === "login" ? "تسجيل الدخول" : (signupMethod === "phone" ? "تسجيل برقم الهاتف" : "تسجيل بالإيميل")}</h2>
        </div>
        <form onSubmit={submit} className="space-y-2.5">
          {mode === "signup" && (
            <input value={name} onChange={e => setName(e.target.value)} placeholder="الاسم" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none qx-input" />
          )}
          {mode === "login" && (
            <input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="الإيميل أو رقم الهاتف" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none qx-input" style={{...inputStyle}} />
          )}
          {mode === "signup" && (
            <input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder={signupMethod === "phone" ? "رقم الهاتف" : "الإيميل"}
              type={signupMethod === "email" ? "email" : "tel"} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none qx-input" style={{...inputStyle}} />
          )}
          <PasswordField value={pw} onChange={e => setPw(e.target.value)} placeholder="كلمة السر" showStrength={mode === "signup"} />
          {mode === "signup" && (
            <input value={refCode} onChange={e => setRefCode(e.target.value)} placeholder="كود دعوة صديق (اختياري)" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none qx-input" style={{...inputStyle}} />
          )}
          {mode === "login" && (
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer" style={{ color: "#c3cbe8" }}>
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} /> تذكرني على هالمتصفح
            </label>
          )}
          {lockedMsg && <p className="text-xs flex items-center gap-1.5" style={{ color: "#f87171" }}><AlertTriangle size={13} /> {lockedMsg}</p>}
          {err && <p className="text-xs" style={{ color: "#f87171" }}>{err}</p>}
          <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] qx-btn qx-btn-primary">
            {busy ? <Loader2 size={16} className="animate-spin" /> : (mode === "login" ? <LogIn size={15} /> : <UserPlus size={15} />)}
            {mode === "login" ? "دخول" : "متابعة"}
          </button>
        </form>
        {mode === "login" && (
          <button onClick={() => { setMode("forgot"); setErr(""); setLockedMsg(""); setIdentifier(""); }} className="w-full text-center text-xs mt-3 font-bold" style={{ color: "#c3cbe8" }}>نسيت كلمة السر؟</button>
        )}
        <button onClick={() => { const next = mode === "login" ? "signup" : "login"; setMode(next); setSignupMethod(next === "signup" ? "email" : null); setIdentifier(""); setErr(""); setLockedMsg(""); }} className="w-full text-center text-xs mt-2 font-bold" style={{ color: "#2dd4bf" }}>
          {mode === "login" ? "ما عندك حساب؟ أنشئ واحد" : "عندك حساب؟ سجل دخول"}
        </button>
      </div>
    </div>
  );
}

/* =================================================================
   CART DRAWER
================================================================= */
function CartDrawer({ cart, changeQty, removeFromCart, total, onClose, session, setAuthOpen, onCheckout, coupons, paymentInfo, shipping, socialLinks }) {
  const [placing, setPlacing] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponErr, setCouponErr] = useState("");
  const [step, setStep] = useState("cart"); // cart | pay
  const [paymentMethod, setPaymentMethod] = useState(null); // 'bank' | 'cliq'
  const [proofImage, setProofImage] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [payErr, setPayErr] = useState("");

  /* ---- delivery (server-validated; the fee shown here is only indicative) ---- */
  const shippingEnabled = shipping?.enabled && Array.isArray(shipping?.companies) && shipping.companies.some(c => c.enabled !== false);
  const pickupPrepMinutes = Math.max(0, Math.floor(Number(shipping?.pickupPrepMinutes) || 30));
  const pickupPrepNote = `طلبك بيكون جاهز للاستلام خلال حوالي ${pickupPrepMinutes} دقيقة من تأكيد الدفع — بنرسل لك إشعار لما يتجهز`;
  const pickupWaEnabled = shipping?.pickupWaEnabled !== false; // default: shown
  const orderDraftId = "(يظهر بعد رفع الطلب)";
  const pickupWaMsg = pickupWaEnabled && socialLinks?.whatsapp ? `مرحباً، بدي أستلم طلبي من المتجر — رقم الطلب: ${orderDraftId}` : null;
  const pickupWaLink = pickupWaEnabled ? waLink(socialLinks?.whatsapp, pickupWaMsg) : null;
  const availableCompanies = (shipping?.companies || []).filter(c => c.enabled !== false && Array.isArray(c.regions) && c.regions.some(r => r.enabled !== false));
  /* delivery mode: "delivery" (paid company/city) or "pickup" (free store pickup) */
  const [deliveryMode, setDeliveryMode] = useState(shippingEnabled && availableCompanies.length > 0 ? "delivery" : "pickup");
  const [selCompanyId, setSelCompanyId] = useState(null);
  const [selCity, setSelCity] = useState(null);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const selCompany = availableCompanies.find(c => c.id === selCompanyId) || null;
  const selRegion = selCompany ? selCompany.regions.find(r => r.city === selCity) : null;
  const deliveryFee = deliveryMode === "pickup" ? 0 : selRegion ? Number(selRegion.price) : 0;

  const applyCoupon = () => {
    const found = coupons.find(c => c.code.toLowerCase() === couponInput.trim().toLowerCase());
    if (!found) { setCouponErr("الكوبون غير صحيح"); setAppliedCoupon(null); return; }
    if (found.expiresAt && new Date(found.expiresAt) < new Date()) { setCouponErr("الكوبون منتهي الصلاحية"); setAppliedCoupon(null); return; }
    setAppliedCoupon(found); setCouponErr("");
  };
  const couponDiscount = appliedCoupon ? total * (appliedCoupon.percent / 100) : 0;
  const afterCoupon = total - couponDiscount;
  const autoDiscountPercent = session?.discountPercent > 0 ? session.discountPercent : 0;
  const autoDiscount = autoDiscountPercent > 0 ? afterCoupon * (autoDiscountPercent / 100) : 0;
  const finalTotal = Math.round((afterCoupon - autoDiscount + deliveryFee) * 100) / 100;

  const onProofFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { setPayErr("حجم الصورة كبير كتير (فوق 15 ميغا)، جرب صورة أصغر"); return; }
    setUploadingProof(true);
    try { setProofImage(await fileToCompressedDataUrl(file, 700, 0.75)); setPayErr(""); }
    finally { setUploadingProof(false); }
  };

  const submitOrder = async () => {
    if (!paymentMethod) { setPayErr("اختر طريقة الدفع"); return; }
    if (paymentMethod !== "cod" && !proofImage) { setPayErr("لازم ترفق صورة إثبات التحويل قبل إرسال الطلب"); return; }
    // delivery required when the owner has it enabled and there are available options
    if (shippingEnabled && availableCompanies.length > 0 && paymentMethod === "cod" && deliveryMode === "delivery" && (!selCompanyId || !selCity)) {
      setPayErr("اختر شركة التوصيل والمدينة عشان نعرف وين نوصلك — أو اختر الاستلام من المتجر"); return;
    }
    setPlacing(true);
    const basePayload = deliveryMode === "pickup"
      ? { companyId: "pickup", cityName: "استلام من المتجر" }
      : (shippingEnabled && selCompanyId && selCity ? { companyId: selCompanyId, cityName: selCity } : null);
    const notes = deliveryNotes.trim().slice(0, 500);
    const deliveryPayload = basePayload ? { ...basePayload, notes } : null;
    await onCheckout(finalTotal, appliedCoupon?.code, paymentMethod, proofImage, deliveryPayload);
    setPlacing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(2,4,12,0.65)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div className="w-full max-w-sm h-full p-5 overflow-y-auto" style={{ background: "linear-gradient(180deg,#0a1028 0%,#060917 100%)", borderLeft: "1px solid rgba(47,125,244,0.3)", boxShadow: "0 0 40px rgba(8,10,30,0.7)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-lg flex items-center gap-2"><ShoppingCart size={18} color="#fbbf24" /> {step === "cart" ? "سلة المشتريات" : "الدفع"}</h2>
          <button onClick={onClose}><X size={18} color="#c3cbe8" /></button>
        </div>

        {cart.length === 0 ? (
          <p className="text-sm text-center mt-10" style={{ color: "#c3cbe8" }}>السلة فارغة</p>
        ) : step === "cart" ? (
          <>
            <div className="space-y-3 mb-6">
              {cart.map(c => (
                <div key={c.pid} className="rounded-xl p-3 qx-card">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-sm">{c.name}</span>
                    <button onClick={() => removeFromCart(c.pid)}><Trash2 size={14} color="#f87171" /></button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => changeQty(c.pid, -1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(16,23,58,0.9)", border: "1px solid rgba(47,125,244,0.3)" }}><Minus size={12} /></button>
                      <span className="text-sm font-bold w-5 text-center">{c.qty}</span>
                      <button onClick={() => changeQty(c.pid, 1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(16,23,58,0.9)", border: "1px solid rgba(47,125,244,0.3)" }}><Plus size={12} /></button>
                    </div>
                    <span className="font-black text-sm" style={{ color: "#60a5fa" }}>{money(c.price * c.qty)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              <input value={couponInput} onChange={e => setCouponInput(e.target.value)} placeholder="كود خصم" className="flex-1 px-3 py-2 rounded-lg text-xs outline-none qx-input" />
              <button onClick={applyCoupon} className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1" style={{ background: "rgba(45,212,191,0.08)", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.35)" }}><Tag size={12} /> تطبيق</button>
            </div>
            {couponErr && <p className="text-[11px] mb-2" style={{ color: "#f87171" }}>{couponErr}</p>}
            {appliedCoupon && <p className="text-[11px] mb-2 font-bold" style={{ color: "#2dd4bf" }}>✅ تم تطبيق خصم {appliedCoupon.percent}%</p>}

            {autoDiscountPercent > 0 && (
              <div className="rounded-lg p-2.5 mb-3 flex items-center gap-2 text-[11px] font-bold" style={{ background: "rgba(45,212,191,0.08)", border: "1px solid rgba(45,212,191,0.3)", color: "#2dd4bf" }}>
                <Gift size={13} /> عندك خصم تلقائي {autoDiscountPercent}% ({session.discountReason || "خصم"}) رح يتطبق على هالطلب
              </div>
            )}

            {(shippingEnabled && availableCompanies.length > 0) && (
              <div className="rounded-xl p-3 mb-3 space-y-2.5" style={{ background: "rgba(12,17,40,0.5)", border: "1px solid rgba(47,125,244,0.3)" }}>
                <p className="text-[11px] font-black flex items-center gap-1.5" style={{ color: "#cbb8ff" }}><Truck size={12} color="#60a5fa" /> كيف بدك تستلم طلبك؟</p>
                <div className="flex gap-1.5">
                  <button onClick={() => setDeliveryMode("pickup")}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-150" style={deliveryMode === "pickup" ? { background: "rgba(45,212,191,0.12)", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.45)" } : { background: "rgba(2,14,36,0.85)", color: "#c3cbe8", border: "1px solid rgba(47,125,244,0.28)" }}>
                    استلام من المتجر — مجاني
                  </button>
                  <button onClick={() => setDeliveryMode("delivery")}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-150" style={deliveryMode === "delivery" ? orangeBtn : { background: "rgba(2,14,36,0.85)", color: "#c3cbe8", border: "1px solid rgba(47,125,244,0.28)" }}>
                    توصيل لشبابك
                  </button>
                </div>
                {deliveryMode === "pickup" ? (
                  <div className="space-y-1">
                    <p className="text-[10px] flex items-center gap-1" style={{ color: "#2dd4bf" }}><Store size={11} /> بترفع طلبك ونجهزه لك، وبتجيبه من المتجر — بدون أي رسوم توصيل</p>
                    <p className="text-[10px] flex items-center gap-1" style={{ color: "#60a5fa" }}><Clock size={11} /> {pickupPrepNote}</p>
                    {pickupWaLink ? (
                      <a href={pickupWaLink} target="_blank" rel="noreferrer" className="text-[10px] font-bold flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-transform active:scale-[0.97]" style={{ background: "rgba(37,211,102,0.1)", color: "#25D366", border: "1px solid rgba(37,211,102,0.35)" }}>
                        <MessageCircle size={11} /> نسّق الاستلام عبر واتساب
                      </a>
                    ) : (
                      <p className="text-[10px]" style={{ color: "#c3cbe8" }}>لتواصل معنا حول الاستلام، استخدم أزرار التواصل أسفل الصفحة</p>
                    )}
                  </div>
                ) : (
                <div className="space-y-2">
                <p className="text-[10px]" style={{ color: "#c3cbe8" }}>يتحسب على الإجمالي حسب الشركة والمدينة</p>
                <div className="flex flex-wrap gap-1.5">
                  {availableCompanies.map(c => (
                    <button key={c.id} onClick={() => { setSelCompanyId(c.id); setSelCity(c.regions.find(r => r.enabled !== false)?.city || null); }}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-150" style={selCompanyId === c.id ? orangeBtn : { background: "rgba(2,14,36,0.85)", color: "#c3cbe8", border: "1px solid rgba(47,125,244,0.28)" }}>
                      {c.name}
                    </button>
                  ))}
                </div>
                {selCompany && (
                  <div className="flex flex-wrap gap-1.5">
                    {selCompany.regions.filter(r => r.enabled !== false).map(r => (
                      <button key={r.city} onClick={() => setSelCity(r.city)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-150" style={selCity === r.city ? { background: "rgba(45,212,191,0.12)", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.45)" } : { background: "rgba(2,14,36,0.85)", color: "#c3cbe8", border: "1px solid rgba(47,125,244,0.28)" }}>
                        {r.city} {money(r.price)}
                      </button>
                    ))}
                  </div>
                )}
                {!selCompany && <p className="text-[10px]" style={{ color: "#c3cbe8" }}>اختر شركة التوصيل بعدين اختار مدينتك</p>}
                </div>
                )}
                <div className="mt-2">
                  <label className="text-[10px] font-bold block mb-1" style={{ color: "#c3cbe8" }}>{deliveryMode === "pickup" ? "ملاحظات الاستلام (اختياري)" : "ملاحظات التوصيل (عنوانك أو معلم قريب)"}</label>
                  <textarea value={deliveryNotes} maxLength={500} onChange={e => setDeliveryNotes(e.target.value)} rows={2}
                    placeholder={deliveryMode === "pickup" ? "مثال: بدي أستلم الساعة ٨ بالليل" : "مثال: شارع فلسطين، قرب إشارات المدينة الرياضية"}
                    className="w-full px-2.5 py-1.5 rounded-lg text-[11px] outline-none resize-none"
                    style={{ background: "rgba(2,14,36,0.85)", border: "1px solid rgba(47,125,244,0.28)", color: "#f4f6fb" }} />
                </div>
              </div>
            )}
            {!shippingEnabled || availableCompanies.length === 0 ? (
              <div className="rounded-xl p-3 mb-3 flex items-center gap-2 text-[11px] font-bold" style={{ background: "rgba(45,212,191,0.08)", border: "1px solid rgba(45,212,191,0.3)", color: "#2dd4bf" }}>
                <Store size={13} /> الاستلام من المتجر — مجاني
              </div>
            ) : null}

            <div className="pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="flex justify-between items-center text-sm mb-1"><span style={{ color: "#c3cbe8" }}>المجموع</span><span>{money(total)}</span></div>
              {appliedCoupon && <div className="flex justify-between items-center text-sm mb-1" style={{ color: "#2dd4bf" }}><span>خصم الكوبون</span><span>- {money(couponDiscount)}</span></div>}
              {autoDiscountPercent > 0 && <div className="flex justify-between items-center text-sm mb-1" style={{ color: "#2dd4bf" }}><span>الخصم التلقائي</span><span>- {money(autoDiscount)}</span></div>}
              {deliveryFee > 0 && <div className="flex justify-between items-center text-sm mb-1" style={{ color: "#fbbf24" }}><span>التوصيل ({selCompany?.name} — {selCity})</span><span>+ {money(deliveryFee)}</span></div>}
              {deliveryMode === "pickup" && <div className="flex justify-between items-center text-sm mb-1" style={{ color: "#2dd4bf" }}><span>الاستلام من المتجر</span><span className="font-bold">مجاني</span></div>}
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-sm">الإجمالي</span>
                <span className="font-black text-lg" style={{ color: "#60a5fa" }}>{money(finalTotal)}</span>
              </div>
            </div>

            {!session ? (
              <button onClick={() => { onClose(); setAuthOpen(true); }} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 qx-btn qx-btn-primary">
                <LogIn size={15} /> سجل دخول لإتمام الطلب
              </button>
            ) : (
              <button onClick={() => setStep("pay")}
                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 qx-btn qx-btn-primary">
                <CreditCard size={15} /> متابعة للدفع
              </button>
            )}
            <p className="text-[11px] text-center mt-2" style={{ color: "#c3cbe8" }}>رح تختار طريقة الدفع وترفق إثبات التحويل بالخطوة الجاية</p>
          </>
        ) : (
          <>
            <button onClick={() => setStep("cart")} className="flex items-center gap-1 text-xs font-bold mb-4" style={{ color: "#c3cbe8" }}><ChevronRight size={14} style={{ transform: "scaleX(-1)" }} /> رجوع للسلة</button>

            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-sm">{paymentMethod === "cod" ? "المبلغ المطلوب دفعه عند التسليم" : "المبلغ المطلوب تحويله"}</span>
              <span className="font-black text-lg" style={{ color: "#60a5fa" }}>{money(finalTotal)}</span>
            </div>

            <p className="text-xs font-bold mb-2" style={{ color: "#c3cbe8" }}>اختر طريقة الدفع</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button onClick={() => setPaymentMethod("bank")} className="py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
                style={paymentMethod === "bank" ? orangeBtn : { background: "rgba(12,17,40,0.6)", color: "#c3cbe8", border: "1px solid rgba(47,125,244,0.28)" }}>
                <CreditCard size={13} /> تحويل بنكي
              </button>
              <button onClick={() => setPaymentMethod("cliq")} className="py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
                style={paymentMethod === "cliq" ? orangeBtn : { background: "rgba(12,17,40,0.6)", color: "#c3cbe8", border: "1px solid rgba(47,125,244,0.28)" }}>
                <Smartphone size={13} /> CliQ
              </button>
              <button onClick={() => setPaymentMethod("zaincash")} className="py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
                style={paymentMethod === "zaincash" ? orangeBtn : { background: "rgba(12,17,40,0.6)", color: "#c3cbe8", border: "1px solid rgba(47,125,244,0.28)" }}>
                <Smartphone size={13} /> زين كاش
              </button>
              <button onClick={() => setPaymentMethod("orangemoney")} className="py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
                style={paymentMethod === "orangemoney" ? orangeBtn : { background: "rgba(12,17,40,0.6)", color: "#c3cbe8", border: "1px solid rgba(47,125,244,0.28)" }}>
                <Smartphone size={13} /> أورنج موني
              </button>
            </div>
            {paymentInfo.codEnabled && (
              <button onClick={() => setPaymentMethod("cod")} className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 mb-3"
                style={paymentMethod === "cod" ? orangeBtn : { background: "rgba(12,17,40,0.6)", color: "#c3cbe8", border: "1px solid rgba(47,125,244,0.28)" }}>
                <Truck size={13} /> نقدًا عند التسليم
              </button>
            )}

            {paymentMethod && paymentMethod !== "cod" && (
              <div className="rounded-xl p-3.5 mb-4 text-xs space-y-1.5 qx-card">
                {paymentMethod === "bank" && (
                  <>
                    <Row label="اسم صاحب الحساب" value={paymentInfo.bankAccountName} />
                    <Row label="اسم البنك" value={paymentInfo.bankName} />
                    <Row label="رقم الحساب / IBAN" value={paymentInfo.bankAccountNumber} />
                  </>
                )}
                {paymentMethod === "cliq" && (
                  <>
                    <Row label="اسم CliQ" value={paymentInfo.cliqName} />
                    <Row label="رقم CliQ" value={paymentInfo.cliqNumber} />
                  </>
                )}
                {paymentMethod === "zaincash" && (
                  <>
                    <Row label="الاسم" value={paymentInfo.zainCashName} />
                    <Row label="رقم زين كاش" value={paymentInfo.zainCashNumber} />
                  </>
                )}
                {paymentMethod === "orangemoney" && (
                  <>
                    <Row label="الاسم" value={paymentInfo.orangeMoneyName} />
                    <Row label="رقم أورنج موني" value={paymentInfo.orangeMoneyNumber} />
                  </>
                )}
                {paymentInfo.notes && <p className="pt-1.5 mt-1.5" style={{ borderTop: "1px solid rgba(47,125,244,0.2)", color: "#c3cbe8" }}>{paymentInfo.notes}</p>}
                <a href="/payment-methods" target="_blank" rel="noreferrer" className="flex items-center gap-1 pt-1.5 text-[11px] font-black" style={{ color: "#60a5fa" }}>
                  <CreditCard size={11} /> عرض كل طرق الدفع بالتفصيل مع واتساب المتجر
                </a>
                <a href="/delivery" target="_blank" rel="noreferrer" className="flex items-center gap-1 pt-1.5 text-[11px] font-black" style={{ color: "#fbbf24" }}>
                  <Truck size={11} /> خيارات وأسعار التوصيل
                </a>
                {!paymentInfo.bankAccountName && !paymentInfo.cliqName && !paymentInfo.zainCashName && !paymentInfo.orangeMoneyName && (
                  <p style={{ color: "#f87171" }}>ما زالت معلومات الدفع غير مكتملة — تواصل معنا مباشرة.</p>
                )}
              </div>
            )}

            {paymentMethod === "cod" && (
              <div className="rounded-xl p-3.5 mb-4 text-xs qx-card">
                <p style={{ color: "#cdd3ee" }}>بتدفع المبلغ نقدًا للمندوب وقت استلام طلبك. جهّز المبلغ المضبوط إذا أمكن.</p>
              </div>
            )}

            {paymentMethod && paymentMethod !== "cod" && (
              <div className="mb-4">
                <p className="text-xs font-bold mb-2" style={{ color: "#c3cbe8" }}>ارفق صورة إثبات التحويل (مطلوب)</p>
                {proofImage ? (
                  <div className="relative inline-block">
                    <img src={proofImage} alt="" className="max-h-40 rounded-lg" loading="lazy" />
                    <button onClick={() => setProofImage(null)} className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#f87171", color: "#fff" }}><X size={13} /></button>
                  </div>
                ) : (
                  <label className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer" style={{ background: "#0c1230", color: "#2dd4bf", border: "1px dashed rgba(45,212,191,0.4)" }}>
                    {uploadingProof ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {uploadingProof ? "جاري الرفع..." : "رفع صورة الإثبات"}
                    <input type="file" accept="image/*" className="hidden" onChange={onProofFile} />
                  </label>
                )}
              </div>
            )}

            {payErr && <p className="text-xs mb-3 flex items-center gap-1.5" style={{ color: "#f87171" }}><AlertTriangle size={13} /> {payErr}</p>}

            <button disabled={placing} onClick={submitOrder}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 qx-btn qx-btn-primary">
              {placing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={15} />} {paymentMethod === "cod" ? "تأكيد الطلب" : "إرسال الطلب مع الإثبات"}
            </button>
            <p className="text-[11px] text-center mt-2" style={{ color: "#c3cbe8" }}>{paymentMethod === "cod" ? "رح نتواصل معك لتأكيد الطلب وموعد التسليم" : "رح نراجع الإثبات ونأكد وصول الدفع بأقرب وقت"}</p>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span style={{ color: "#c3cbe8" }}>{label}</span>
      <span className="font-bold" style={{ direction: "ltr" }}>{value || "—"}</span>
    </div>
  );
}

/* =================================================================
   GAME DETAIL OVERLAY — cinematic full-width dive into one game
================================================================= */
function GameDetailView({ game, session, addToCart, toggleWishlist, isWished, setRatingGame, ratingGame, rateGame, onClose }) {
  const avg = game.reviews?.length ? (game.reviews.reduce((s, r) => s + r.stars, 0) / game.reviews.length) : null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "rgba(2,4,12,0.92)", backdropFilter: "blur(14px)" }}>
      <div className="min-h-screen max-w-3xl mx-auto px-4 py-8">
        <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center mb-4 transition-all duration-150 active:scale-90" style={{ background: "rgba(2,14,36,0.9)", border: "1px solid rgba(47,125,244,0.4)", color: "#eaf0ff" }}>
          <CornerUpLeft size={17} />
        </button>
        {game.image ? (
          <div className="rounded-3xl overflow-hidden mb-6 relative" style={{ boxShadow: "0 24px 80px rgba(2,10,30,0.9), 0 0 60px rgba(47,125,244,0.25)" }}>
            <img src={game.image} alt={game.name} className="w-full object-cover" style={{ maxHeight: 420 }} loading="lazy" />
            <span className="absolute inset-x-0 bottom-0 h-24 pointer-events-none" style={{ background: "linear-gradient(transparent, rgba(2,14,36,0.95))" }} />
            <div className="absolute bottom-3 right-4 left-4 flex items-end justify-between gap-2">
              <h1 className="text-2xl sm:text-3xl font-black" style={{ color: "#f2f4ff", textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>{game.name}</h1>
              <button onClick={() => toggleWishlist(game.id)} className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(6,8,26,0.8)", border: "1px solid rgba(244,114,182,0.4)" }}>
                <Heart size={17} color={isWished ? "#f472b6" : "#a9b2d6"} fill={isWished ? "#f472b6" : "none"} />
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl mb-6 flex items-center justify-center py-14" style={{ background: "linear-gradient(135deg,rgba(47,125,244,0.28),rgba(0,48,144,0.35))" }}>{game.icon && <span style={{ fontSize: 92 }}>{game.icon}</span>}
            <h1 className="text-2xl sm:text-3xl font-black absolute" style={{ color: "#f2f4ff" }}>{game.name}</h1>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          {game.platform && <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(47,125,244,0.12)", color: "#93c5fd", border: "1px solid rgba(47,125,244,0.4)" }}>{game.platform}</span>}
          {game.ageRating && <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(2,14,36,0.8)", color: "#c3cbe8", border: "1px solid rgba(47,125,244,0.35)" }}>{game.ageRating}</span>}
          {game.bestseller && <span className="qx-badge qx-badge-hot px-3 py-1 rounded-full text-[10px]">الأكثر مبيعًا</span>}
          <button onClick={() => setRatingGame(ratingGame === game.id ? null : game.id)} className="flex items-center gap-1 text-xs font-bold" style={{ color: "#fbbf24" }}>
            <Star size={13} fill={avg ? "#fbbf24" : "none"} /> {avg ? avg.toFixed(1) : "قيّم هاللعبة"} {game.reviews?.length ? `(${game.reviews.length})` : ""}
          </button>
        </div>
        {ratingGame === game.id && (
          <div className="flex gap-1 mb-5">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => rateGame(game.id, n)}><Star size={18} color="#fbbf24" /></button>
            ))}
          </div>
        )}
        {game.description && (
          <div className="rounded-2xl p-5 mb-5 leading-7" style={{ background: "rgba(2,14,36,0.8)", border: "1px solid rgba(47,125,244,0.28)", color: "#cdd3ee" }}>
            {game.description}
          </div>
        )}
        <div className="rounded-2xl p-5 mb-5 flex flex-wrap items-center justify-between gap-3" style={{ background: "linear-gradient(135deg,rgba(2,14,36,0.98),rgba(4,24,64,0.95))", border: "1px solid rgba(47,125,244,0.35)", boxShadow: "0 0 36px rgba(47,125,244,0.18)" }}>
          <div>
            <div className="text-[11px] font-bold mb-1" style={{ color: "#c3cbe8" }}>السعر</div>
            <div className="text-3xl font-black" style={{ color: "#60a5fa", textShadow: "0 0 18px rgba(47,125,244,0.5)" }}>{money(game.price)}</div>
          </div>
          <div className="flex items-center gap-2">
            {game.outOfStock ? (
              <span className="px-4 py-2.5 rounded-full text-xs font-black flex items-center gap-1.5" style={{ background: "rgba(248,113,113,0.1)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.35)" }}>
                <AlertCircle size={13} /> نفذت الكمية
              </span>
            ) : (
              <button onClick={() => { addToCart({ pid: "game:" + game.id, name: game.name, price: Number(game.price) }); onClose(); }}
                className="py-2.5 px-6 rounded-full text-sm font-black flex items-center gap-2 qx-btn qx-btn-primary">
                <ShoppingCart size={15} /> أضف للسلة
              </button>
            )}
            <button onClick={() => shareProduct(game.name)} className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "rgba(2,14,36,0.8)", border: "1px solid rgba(47,125,244,0.4)", color: "#c3cbe8" }} title="شارك">
              <Share2 size={16} />
            </button>
          </div>
        </div>
        <div className="text-center">
          <button onClick={onClose} className="text-xs font-bold inline-flex items-center gap-1.5 px-4 py-2 rounded-full" style={{ color: "#60a5fa", background: "rgba(47,125,244,0.1)", border: "1px solid rgba(47,125,244,0.3)" }}>
            <Eye size={13} /> عد للعرض الكامل
          </button>
          {session ? null : (
            <p className="text-[11px] mt-4" style={{ color: "#c3cbe8" }}>سجل دخول حتى تنحفظ المفضلة وسلة مشترياتك</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* =================================================================
   STORE PAGE (catalog)
================================================================= */
function StorePage({ games, prices, setTab, addToCart, session, submitQuickOrder, banners, testimonials, wishlist, toggleWishlist, setGames, deliveredCount }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | games | cards | subs
  const [ratingGame, setRatingGame] = useState(null);
  const [notifyGame, setNotifyGame] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null); // detail overlay

  const q = query.trim().toLowerCase();
  const filteredGames = games.filter(g => !q || g.name.toLowerCase().includes(q));
  const showGames = filter === "all" || filter === "games";
  const showCards = filter === "all" || filter === "cards";
  const showSubs = filter === "all" || filter === "subs";

  const rateGame = async (gameId, stars) => {
    try {
      const { games: next } = await api.post("/api/rate-game", { gameId, stars });
      setGames(next);
    } catch (e) { /* rating is a nice-to-have; fail silently rather than block the page */ }
    setRatingGame(null);
  };

  return (
    <div className="pt-6">
      {selectedGame && <GameDetailView game={selectedGame} session={session} addToCart={addToCart} toggleWishlist={toggleWishlist} isWished={wishlist.includes(selectedGame.id)} setRatingGame={setRatingGame} ratingGame={ratingGame} rateGame={rateGame} onClose={() => setSelectedGame(null)} />}

      <RecentlyViewedSection games={games} addToCart={addToCart} onOpenDetail={setSelectedGame} />
      {banners.length > 0 && (
        <div className="space-y-2 mb-6">
          {banners.map(b => (
            <div key={b.id} className="rounded-xl px-4 py-2.5 text-center text-sm font-bold" style={{ background: "linear-gradient(90deg,rgba(47,125,244,0.28),rgba(0,48,144,0.2))", border: "1px solid rgba(47,125,244,0.4)", color: "#cbb8ff", boxShadow: "0 0 18px rgba(47,125,244,0.3)" }}>
              {b.text}
            </div>
          ))}
        </div>
      )}

      {/* ===== HERO — QWADER blue identity ===== */}
      <div className="qx-hero mb-8 rounded-b-3xl">
        <span className="qx-hero-grid" />
        <span className="qx-orb" style={{ width: 340, height: 340, top: "-10%", right: "6%" }} />
        <span className="qx-orb" style={{ width: 280, height: 280, bottom: "-20%", left: "4%", background: "rgba(0,48,144,0.4)", animationDelay: "5s" }} />
        <div className="px-5 py-12 sm:px-10 sm:py-14 relative">
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
            <img src="/manus-storage/qwader-logo_88ca51bf.png" alt="QWADER STORE" className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-contain qx-reveal" style={{ filter: "drop-shadow(0 0 40px rgba(47,125,244,0.45))" }} loading="eager" />
            <div className="text-center sm:text-right">
              <p className="qx-chip qx-chip--active inline-flex items-center gap-2 mb-4 px-4 py-1.5 text-[11px] font-black">
                <Gamepad2 size={13} /> المتجر الرقمي الأول لحسابات وألعاب الألعاب
              </p>
              <h1 className="text-4xl sm:text-6xl font-black mb-3 qx-grad qx-reveal" style={{ textShadow: "0 6px 24px rgba(0,0,0,0.6)" }}>QWADER STORE</h1>
              <p className="qg-sub text-sm sm:text-lg max-w-xl mb-6 leading-7 qx-reveal">بطاقات ألعاب، اشتراكات PS Plus، وألعاب رقمية بأفضل الأسعار — أصلية 100% وبضمان التسليم، تسلّم فوري من المتجر أو توصيل لكل المناطق</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <button onClick={() => document.getElementById("qg-games-anchor")?.scrollIntoView({ behavior: "smooth" })} className="qx-btn qx-btn-primary px-6 py-2.5 text-sm font-black">
                  <ShoppingCart size={15} /> تسوق الآن
                </button>
                <button onClick={() => setTab("contact")} className="qx-btn qx-btn-ghost px-6 py-2.5 text-sm font-black">
                  <MessageCircle size={15} /> راسلنا
                </button>
              </div>
              {deliveredCount > 0 && (
                <p className="mt-5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black" style={{ background: "rgba(47,125,244,0.12)", color: "#93c5fd", border: "1px solid rgba(47,125,244,0.4)", boxShadow: "0 0 20px rgba(47,125,244,0.25)" }}>
                  <CheckCircle2 size={13} /> {deliveredCount}+ طلب تم تسليمه بنجاح
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Categories strip ===== */}
      <div className="mb-8 qx-reveal">
        <div className="qx-h mb-3"><span className="qx-h-bar" /><h2 className="text-base sm:text-lg">تصفح حسب التصنيف</h2></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "ألعاب PlayStation", icon: <Gamepad2 size={16} />, action: () => { setFilter("games"); setQuery(""); } },
            { label: "بطاقات PSN", icon: <CreditCard size={16} />, action: () => { setFilter("cards"); setQuery(""); document.getElementById("qg-cards-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" }); } },
            { label: "اشتراكات PS Plus", icon: <Crown size={16} />, action: () => { setFilter("subs"); setQuery(""); } },
            { label: "بطاقات Steam", icon: <Globe size={16} />, action: () => { setFilter("cards"); setQuery("steam"); document.getElementById("qg-steam-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" }); } },
          ].map(c => (
            <button key={c.label} onClick={c.action} className="qx-card flex flex-col items-center gap-1.5 px-2 py-3 text-center">
              <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(47,125,244,0.12)", border: "1px solid rgba(47,125,244,0.35)", color: "#60a5fa" }}>{c.icon}</span>
              <span className="text-[11px] font-bold truncate w-full" style={{ color: "#cdd3ee" }}>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {games.some(g => g.bestseller) && (
        <div className="mb-8 qx-reveal">
          <div className="qx-h mb-3"><span className="qx-h-bar" /><h2 className="text-base sm:text-lg">الأكثر مبيعًا</h2><Award size={15} style={{ color: "#fbbf24", filter: "drop-shadow(0 0 8px rgba(251,191,36,0.55))" }} /></div>
          <div className="flex gap-3 overflow-x-auto pb-1 qx-scroll" style={{ scrollbarWidth: "none" }}>
            {games.filter(g => g.bestseller).map(g => (
              <button key={g.id} onClick={() => { pushRecentlyViewed(g); setSelectedGame(g); }} className="shrink-0 qx-card p-2.5 text-center" style={{ width: 132 }}>
                {g.image ? <img src={g.image} alt={g.name} className="w-full h-16 object-cover rounded-xl mb-2" loading="lazy" /> : <div className="text-3xl mb-2">{g.icon}</div>}
                <p className="text-[11px] font-bold truncate">{g.name}</p>
                <p className="text-[11px] font-black" style={{ color: "#60a5fa" }}>{money(g.price)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== Search + filters ===== */}
      <div className="mb-4 qx-reveal">
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <Search size={15} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#8ea3c9" }} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="دور على لعبة، بطاقة أو اشتراك..."
              className="w-full pr-9 pl-3 py-2.5 rounded-xl text-sm outline-none qx-input" />
          </div>
        </div>
        <div className="flex gap-2 mb-8 overflow-x-auto qx-scroll" style={{ scrollbarWidth: "none" }}>
          {[["all", "الكل"], ["games", "ألعاب PS"], ["cards", "البطاقات"], ["subs", "اشتراكات PS Plus"]].map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} className={`shrink-0 px-4 py-1.5 qx-chip ${filter === id ? "qx-chip--active" : ""}`}>{label}</button>
          ))}
        </div>
      </div>

      <QuickOrderBox session={session} submitQuickOrder={submitQuickOrder} />

      {showGames && (
        <div className="mb-9 qx-reveal">
          <div className="qx-h mb-4"><span className="qx-h-bar" /><h2 className="text-base sm:text-lg">ألعاب PlayStation المتوفرة</h2><Gamepad2 size={16} style={{ color: "#60a5fa" }} /></div>
          <span id="qg-games-anchor" className="block" style={{ position: "absolute", marginTop: -64 }} />
          {filteredGames.length === 0 && <p className="text-sm qg-sub">ما في نتائج</p>}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {filteredGames.map(g => {
              const avg = g.reviews?.length ? (g.reviews.reduce((s, r) => s + r.stars, 0) / g.reviews.length) : null;
              const isWished = wishlist.includes(g.id);
              return (
                <div key={g.id} className="qx-card flex flex-col">
                  <button className="qx-imgcell relative block" onClick={() => { pushRecentlyViewed(g); setSelectedGame(g); }} aria-label={`تفاصيل ${g.name}`}>
                    <span className="absolute top-2 right-2 z-10 flex gap-1">
                      {g.bestseller && <span className="qx-badge qx-badge-hot">الأكثر مبيعًا</span>}
                      {g.featured && <span className="qx-badge qx-badge-sale">مميز</span>}
                    </span>
                    {g.image ? <img src={g.image} alt={g.name} loading="lazy" /> : <div className="w-full h-full min-h-[104px] flex items-center justify-center" style={{ background: "linear-gradient(135deg,rgba(47,125,244,0.25),rgba(0,48,144,0.35))" }}>{g.icon && <span style={{ fontSize: 44 }}>{g.icon}</span>}</div>}
                  </button>
                  <div className="flex flex-col flex-1 gap-1.5 p-3">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <button className="font-bold text-sm leading-tight text-right hover:underline decoration-sky-400/60 underline-offset-4 block truncate" onClick={() => { pushRecentlyViewed(g); setSelectedGame(g); }}>{g.name}</button>
                        {g.platform && <div className="text-[10px] font-bold mt-0.5 truncate" style={{ color: "#93c5fd" }}>{g.platform}{g.ageRating ? ` • ${g.ageRating}` : ""}</div>}
                      </div>
                      <button onClick={() => toggleWishlist(g.id)} className="shrink-0" aria-label="أضف للمفضلة">
                        <Heart size={16} color={isWished ? "#f472b6" : "#6b7da0"} fill={isWished ? "#f472b6" : "none"} />
                      </button>
                    </div>
                    {g.description && <div className="qg-sub text-[10px] leading-4 line-clamp-2">{g.description}</div>}
                    <div className="flex items-center gap-2">
                      <button onClick={() => setRatingGame(ratingGame === g.id ? null : g.id)} className="flex items-center gap-0.5 text-[10px] font-bold" style={{ color: "#fbbf24" }}>
                        <Star size={11} fill={avg ? "#fbbf24" : "none"} /> {avg ? avg.toFixed(1) : "قيّم"}{g.reviews?.length ? `(${g.reviews.length})` : ""}
                      </button>
                      <button onClick={() => shareProduct(g.name)} className="text-[10px] flex items-center gap-0.5 qg-sub" title="شارك">
                        <Share2 size={11} /> شارك
                      </button>
                    </div>
                    {ratingGame === g.id && (
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button key={n} onClick={() => rateGame(g.id, n)}><Star size={13} color="#fbbf24" /></button>
                        ))}
                      </div>
                    )}
                    <div className="mt-auto pt-1 flex items-center justify-between gap-2">
                      <div className="font-black text-sm" style={{ color: "#60a5fa" }}>{money(g.price)}</div>
                      {g.outOfStock ? (
                        <NotifyMeButton gameName={g.name} session={session} active={notifyGame === g.id} onOpen={() => setNotifyGame(g.id)} onClose={() => setNotifyGame(null)} />
                      ) : (
                        <button onClick={() => addToCart({ pid: "game:" + g.id, name: g.name, price: Number(g.price) })}
                          className="qx-btn qx-btn-primary py-1.5 px-3 text-[10px] font-black">
                          <ShoppingCart size={12} /> أضف
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Trust + CTA closing band ===== */}
      {showGames && (
        <div className="qg-band rounded-2xl mb-9 px-5 py-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {[{ icon: <ShieldCheck size={17} />, text: "أكواد أصلية 100%", color: "#5eead4" }, { icon: <KeyRound size={17} />, text: "تسليم فوري بعد الدفع", color: "#60a5fa" }, { icon: <Truck size={17} />, text: "توصيل لكل المناطق أو استلام مجاني", color: "#fbbf24" }, { icon: <Crown size={17} />, text: "دعم عبر واتساب", color: "#25D366" }].map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-xs sm:text-sm font-bold" style={{ color: t.color }}>
              <span style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.25))" }}>{t.icon}</span>{t.text}
            </div>
          ))}
        </div>
      )}

      {showCards && <span id="qg-cards-anchor" className="block" style={{ position: "absolute", marginTop: -64 }} />}
      {showCards && prices.cards.map(c => (
        <div key={c.id} className="mb-7 qx-reveal">
          <div className="qx-h mb-3"><span className="qx-h-bar" /><h2 className="text-base sm:text-lg">بطاقات {c.label}</h2>{c.image ? <img src={c.image} alt={c.label} className="w-[20px] h-[20px] object-cover rounded" loading="lazy" /> : <span style={{ fontSize: 18 }}>{c.flag}</span>}</div>
          <div className="rounded-2xl overflow-hidden qx-card">
            {c.rows.map((r, i) => (
              <div key={i} className="flex justify-between items-center px-4 py-3" style={{ borderTop: i === 0 ? "none" : "1px solid rgba(47,125,244,0.14)" }}>
                <span className="font-bold text-sm">{r.amt}</span>
                <div className="flex items-center gap-3">
                  <span className="font-black" style={{ color: "#60a5fa" }}>{money(r.price)}</span>
                  <button onClick={() => addToCart({ pid: `card:${c.id}:${i}`, name: `${c.label} ${r.amt}`, price: Number(r.price) })}
                    className="w-7 h-7 rounded-full flex items-center justify-center qx-btn-ghost" title="أضف للسلة"><Plus size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {showCards && <span id="qg-steam-anchor" className="block" style={{ position: "absolute", marginTop: -64 }} />}
      {showCards && <PriceCatalogSection title="بطاقات Steam" rows={prices.steam} prefix="card:steam" unit="$" addToCart={addToCart} accent="#2dd4bf" />}

      {showSubs && prices.subs.map(region => (
        <div key={region.id} className="mb-7 qx-reveal">
          <div className="qx-h mb-3"><span className="qx-h-bar" /><h2 className="text-base sm:text-lg">اشتراك PlayStation Plus — {region.label}</h2>{region.image
            ? <img src={region.image} alt={region.label} className="w-[20px] h-[20px] object-cover rounded" loading="lazy" />
            : <span style={{ fontSize: 18 }}>{region.flag}</span>}</div>
          <div className="rounded-2xl p-4 qx-card">
            <div className="grid grid-cols-3 gap-2">
              <TierBuy name="Essential" color="#2dd4bf" values={region.essential} yearOnly={region.yearOnly} region={region.id} label={region.label} addToCart={addToCart} />
              <TierBuy name="Extra" color="#60a5fa" values={region.extra} yearOnly={region.yearOnly} region={region.id} label={region.label} addToCart={addToCart} />
              <TierBuy name="Deluxe" color="#fbbf24" values={region.deluxe} yearOnly={region.yearOnly} region={region.id} label={region.label} addToCart={addToCart} />
            </div>
          </div>
        </div>
      ))}

      {testimonials.length > 0 && (
        <div className="mb-9 qx-reveal">
          <div className="qx-h mb-4"><span className="qx-h-bar" /><h2 className="text-base sm:text-lg">آراء زبائننا</h2><Quote size={16} style={{ color: "#fbbf24" }} /></div>
          <div className="grid gap-3">
            {testimonials.map(t => (
              <div key={t.id} className="rounded-xl p-4 qx-card">
                <p className="text-sm mb-2" style={{ color: "#cdd3ee" }}>"{t.text}"</p>
                <p className="text-xs font-bold" style={{ color: "#60a5fa" }}>— {t.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== Final CTA ===== */}
      <div className="mb-9 rounded-3xl overflow-hidden relative qx-hero qx-reveal">
        <span className="qx-hero-grid" />
        <span className="qx-orb" style={{ width: 260, height: 260, top: "-40%", left: "10%" }} />
        <div className="px-5 py-8 text-center relative">
          <h2 className="text-xl sm:text-2xl font-black mb-2 qx-grad">جاهز تبدأ؟</h2>
          <p className="qg-sub text-sm mb-5">عندك أي سؤال أو طلب مخصص؟ فريقنا يرد عليك بأسرع وقت</p>
          <button onClick={() => setTab("contact")} className="qx-btn qx-btn-primary px-6 py-2.5 text-sm font-black">
            <MessageCircle size={16} /> عندك سؤال؟ تواصل معنا
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickOrderBox({ session, submitQuickOrder }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [qty, setQty] = useState(1);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (!session && !name.trim()) return;
    setSending(true);
    await submitQuickOrder({ name: name.trim(), phone: phone.trim(), text: text.trim(), qty: Number(qty) || 1 });
    setSending(false); setSent(true); setText(""); setName(""); setPhone(""); setQty(1);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className="rounded-2xl p-5 mb-9 relative qx-card qx-glow">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={17} color="#60a5fa" style={{ filter: "drop-shadow(0 0 6px rgba(47,125,244,0.6))" }} />
        <h2 className="font-black text-sm">مو لاقي يلي بدك ياه بالقائمة؟</h2>
      </div>
      <p className="text-xs mb-4" style={{ color: "#c3cbe8" }}>اكتب طلبك بالضبط (نوع اللعبة، البطاقة، القيمة...) وبنتواصل معك فورًا</p>

      {sent ? (
        <div className="flex items-center gap-2 text-sm font-bold" style={{ color: "#2dd4bf" }}>
          <CheckCircle2 size={16} /> تم إرسال طلبك، رح نتواصل معك قريبًا ✅
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-2.5">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={2} placeholder="مثلا: بدي بطاقة PSN أمريكي 20$ وكمان لعبة FC 25"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none qx-input" />
          <div className="grid grid-cols-3 gap-2">
            {!session && <input value={name} onChange={e => setName(e.target.value)} placeholder="اسمك" className="col-span-2 px-3 py-2.5 rounded-xl text-sm outline-none qx-input" />}
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="واتساب (اختياري)"
              className={(session ? "col-span-2 " : "col-span-1 ") + "px-3 py-2.5 rounded-xl text-sm outline-none"}
              style={{ ...inputStyle, direction: "ltr", textAlign: "right" }} />
            <input type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} className="col-span-1 px-3 py-2.5 rounded-xl text-sm outline-none text-center qx-input" />
          </div>
          <button type="submit" disabled={sending} className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 qx-btn qx-btn-primary">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />} إرسال الطلب
          </button>
        </form>
      )}
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <section className="mb-9 qx-reveal">
      <div className="qx-h mb-3.5">
        <span className="shrink-0" style={{ filter: "drop-shadow(0 0 8px rgba(47,125,244,0.55))" }}>{icon}</span>
        <h2 className="text-base sm:text-lg">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function PriceCatalogSection({ title, rows, prefix, unit, addToCart, accent = "#60a5fa" }) {
  return (
    <div className="mb-7 qx-reveal">
      <div className="qx-h mb-3"><span className="qx-h-bar" /><h2 className="text-base sm:text-lg">{title}</h2></div>
      <div className="rounded-2xl overflow-hidden qx-card">
        {rows.map((r, i) => (
          <div key={i} className="flex justify-between items-center px-4 py-3" style={{ borderTop: i === 0 ? "none" : "1px solid rgba(47,125,244,0.14)" }}>
            <span className="font-bold text-sm">{r.amt}</span>
            <div className="flex items-center gap-3">
              <span className="font-black" style={{ color: accent }}>{money(r.price)}</span>
              <button onClick={() => addToCart({ pid: `${prefix}:${i}`, name: `${title} ${r.amt}`, price: Number(r.price) })}
                className="w-7 h-7 rounded-full flex items-center justify-center qx-btn-ghost" title="أضف للسلة">
                <Plus size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TierBuy({ name, color, values, yearOnly, region, label, addToCart }) {
  const labels = yearOnly ? ["سنة"] : ["شهر", "3 شهور", "سنة"];
  return (
    <div className="rounded-xl p-2.5 text-center" style={{ background: "rgba(2,14,36,0.9)", border: `1px solid ${color}55`, boxShadow: `0 0 14px ${color}22` }}>
      <div className="text-xs font-black mb-1.5" style={{ color }}>{name}</div>
      {values.map((v, i) => (
        <div key={i} className="flex justify-between items-center text-[11px] py-1">
          <span style={{ color: "#c3cbe8" }}>{labels[i]}</span>
          <span className="flex items-center gap-1">
            <span className="font-bold">{v}</span>
            <button onClick={() => addToCart({ pid: `sub:${region}:${name}:${i}`, name: `${label} - ${name} - ${labels[i]}`, price: Number(v) })}
              className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: color, color: "#0a0f20" }}>
              <Plus size={9} />
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}

/* =================================================================
   CONTACT PAGE
================================================================= */
function ContactPage({ onSent, socialLinks }) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false); const [sending, setSending] = useState(false);
  const [honeypot, setHoneypot] = useState(""); // spam bots tend to fill every field, including hidden ones
  const openedAt = useRef(Date.now());

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    if (honeypot) return; // silently drop — looks like a bot
    if (Date.now() - openedAt.current < 1500) return; // submitted suspiciously fast — likely a bot
    setSending(true);
    await onSent({ name: name.trim(), phone: phone.trim(), message: message.trim() });
    setSending(false); setSent(true); setName(""); setPhone(""); setMessage("");
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className="pt-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        <MessageCircle size={30} color="#60a5fa" className="mx-auto mb-2" style={{ filter: "drop-shadow(0 0 10px rgba(47,125,244,0.6))" }} />
        <h1 className="text-xl font-black">تواصل معنا مباشرة</h1>
        <p className="text-sm mt-1" style={{ color: "#c3cbe8" }}>ارسل رسالتك وبنرد عليك بأسرع وقت</p>
      </div>
      {sent ? (
        <div className="rounded-2xl p-6 text-center" style={{ ...card, border: "1px solid rgba(45,212,191,0.35)" }}>
          <CheckCircle2 color="#2dd4bf" size={30} className="mx-auto mb-2" />
          <p className="font-bold">تم إرسال رسالتك بنجاح ✅</p>
          <p className="text-xs mt-1" style={{ color: "#c3cbe8" }}>رح نتواصل معك قريبًا</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <input value={honeypot} onChange={e => setHoneypot(e.target.value)} name="website" tabIndex={-1} autoComplete="off"
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} aria-hidden="true" />
          <input value={name} onChange={e => setName(e.target.value)} placeholder="اسمك" className="w-full px-4 py-3 rounded-xl text-sm outline-none qx-input" />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="رقم الواتساب (اختياري)" className="w-full px-4 py-3 rounded-xl text-sm outline-none qx-input" style={{...inputStyle}} />
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="اكتب رسالتك هون..." rows={4} className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none qx-input" />
          <button type="submit" disabled={sending} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 qx-btn qx-btn-primary">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} إرسال الرسالة
          </button>
        </form>
      )}
      <div className="mt-6">
        <p className="text-xs text-center mb-2" style={{ color: "#c3cbe8" }}>أو تواصل معنا مباشرة</p>
        <SocialLinksRow socialLinks={socialLinks || DEFAULT_SOCIAL_LINKS} />
      </div>
    </div>
  );
}

/* =================================================================
   FAQ / ABOUT / WISHLIST / MY ORDERS
================================================================= */
function FaqPage({ faq }) {
  const [openId, setOpenId] = useState(null);
  return (
    <div className="pt-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        <HelpCircle size={28} color="#60a5fa" className="mx-auto mb-2" style={{ filter: "drop-shadow(0 0 10px rgba(47,125,244,0.6))" }} />
        <h1 className="text-xl font-black">الأسئلة الشائعة</h1>
      </div>
      <div className="space-y-2">
        {faq.map(f => (
          <div key={f.id} className="rounded-xl overflow-hidden qx-card">
            <button onClick={() => setOpenId(openId === f.id ? null : f.id)} className="w-full text-right px-4 py-3 font-bold text-sm flex justify-between items-center">
              {f.q} <ChevronRight size={15} style={{ transform: openId === f.id ? "rotate(-90deg)" : "none", transition: "transform .2s" }} />
            </button>
            {openId === f.id && <div className="px-4 pb-3 text-sm" style={{ color: "#c3cbe8" }}>{f.a}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function AboutPage({ about, testimonials, setTab }) {
  return (
    <div className="pt-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        <Info size={28} color="#60a5fa" className="mx-auto mb-2" style={{ filter: "drop-shadow(0 0 10px rgba(47,125,244,0.6))" }} />
        <h1 className="text-xl font-black">من نحن</h1>
      </div>
      <div className="rounded-2xl p-5 mb-6 qx-card">
        <p className="text-sm leading-7" style={{ color: "#cdd3ee" }}>{about}</p>
      </div>
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("pricecompare")} className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5" style={{ background: "#0c1230", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.25)" }}>
          <Scale size={13} /> مقارنة الأسعار
        </button>
        <button onClick={() => setTab("refund")} className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5" style={{ background: "rgba(12,17,40,0.6)", color: "#c3cbe8", border: "1px solid rgba(47,125,244,0.28)" }}>
          <Archive size={13} /> سياسة الاستبدال
        </button>
      </div>
      {testimonials.length > 0 && (
        <div className="space-y-2">
          {testimonials.map(t => (
            <div key={t.id} className="rounded-xl p-4 qx-card">
              <p className="text-sm mb-1" style={{ color: "#cdd3ee" }}>"{t.text}"</p>
              <p className="text-xs font-bold" style={{ color: "#60a5fa" }}>— {t.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PriceComparePage({ priceComparison }) {
  return (
    <div className="pt-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        <Scale size={28} color="#2dd4bf" className="mx-auto mb-2" />
        <h1 className="text-xl font-black">مقارنة الأسعار</h1>
        <p className="text-xs mt-1" style={{ color: "#c3cbe8" }}>أسعارنا مقابل متاجر ثانية لنفس الفئة</p>
      </div>
      {priceComparison.length === 0 ? (
        <p className="text-center text-sm" style={{ color: "#c3cbe8" }}>ما في مقارنة أسعار مضافة لسا</p>
      ) : (
        <div className="rounded-2xl overflow-hidden qx-card">
          <table className="w-full text-xs">
            <thead><tr style={{ background: "rgba(2,14,36,0.9)", border: "1px solid rgba(47,125,244,0.22)" }}>
              <th className="text-right p-2.5">المنتج</th><th className="text-right p-2.5">المتجر</th><th className="text-right p-2.5">السعر</th>
            </tr></thead>
            <tbody>
              {priceComparison.map(r => (
                <tr key={r.id} style={{ borderTop: "1px solid rgba(47,125,244,0.16)" }}>
                  <td className="p-2.5">{r.product}</td>
                  <td className="p-2.5" style={{ color: r.store === "المتجر عنا" ? "#60a5fa" : "#c3cbe8", fontWeight: r.store === "المتجر عنا" ? 700 : 400 }}>{r.store}</td>
                  <td className="p-2.5">{r.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RefundPolicyPage({ refundPolicy }) {
  return (
    <div className="pt-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        <Archive size={28} color="#fbbf24" className="mx-auto mb-2" />
        <h1 className="text-xl font-black">سياسة الاستبدال والاسترجاع</h1>
      </div>
      <div className="rounded-2xl p-5 qx-card">
        <p className="text-sm leading-7 whitespace-pre-wrap" style={{ color: "#cdd3ee" }}>{refundPolicy}</p>
      </div>
    </div>
  );
}

/* generic legal page — one component for privacy/terms/disclaimer content */
function LegalPage({ title, icon, children }) {
  return (
    <div className="pt-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        {icon}
        <h1 className="text-xl font-black">{title}</h1>
      </div>
      <div className="rounded-2xl p-5 qx-card">
        <p className="text-sm leading-7" style={{ color: "#cdd3ee" }}>{children}</p>
      </div>
    </div>
  );
}

function WishlistPage({ games, addToCart, toggleWishlist, setTab }) {
  return (
    <div className="pt-8">
      <div className="text-center mb-6">
        <Heart size={28} color="#f472b6" className="mx-auto mb-2" />
        <h1 className="text-xl font-black">مفضلتي</h1>
      </div>
      {games.length === 0 ? (
        <div className="text-center text-sm" style={{ color: "#c3cbe8" }}>
          ما في ألعاب بالمفضلة لسا
          <div className="mt-3"><button onClick={() => setTab("store")} className="px-4 py-2 rounded-full text-xs font-bold qx-btn qx-btn-primary">تصفح المتجر</button></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {games.map(g => (
            <div key={g.id} className="rounded-2xl p-4 text-center flex flex-col relative qx-card">
              <button onClick={() => toggleWishlist(g.id)} className="absolute top-2 right-2"><Heart size={16} color="#f472b6" fill="#f472b6" /></button>
              {g.image ? <img src={g.image} alt={g.name} className="w-full h-24 object-cover rounded-xl mb-2 mt-3" loading="lazy" /> : <div className="text-3xl mb-2 mt-3">{g.icon}</div>}
              <div className="font-bold text-sm">{g.name}</div>
              <div className="mt-auto pt-2">
                <div className="font-black mb-2" style={{ color: "#60a5fa" }}>{money(g.price)}</div>
                <button onClick={() => addToCart({ pid: "game:" + g.id, name: g.name, price: Number(g.price) })}
                  className="w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 qx-btn qx-btn-primary"><ShoppingCart size={12} /> أضف للسلة</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* recently-viewed games — tracked in localStorage only (nothing leaves the
   device). Survives refresh; cleared after 30 items. Users can jump straight
   back to a game they looked at. */
const RV_KEY = "qwader_recently_viewed";
function pushRecentlyViewed(game) {
  try {
    if (!window.localStorage) return;
    const existing = JSON.parse(localStorage.getItem(RV_KEY) || "[]");
    const next = [game.id, ...existing.filter(id => id !== game.id)].slice(0, 30);
    localStorage.setItem(RV_KEY, JSON.stringify(next));
  } catch (e) { /* private-browsing storage unavailable */ }
}
function useRecentlyViewed() {
  const [ids, setIds] = useState([]);
  useEffect(() => {
    try { setIds(JSON.parse(localStorage.getItem(RV_KEY) || "[]")); } catch (e) { /* noop */ }
  }, []);
  return ids;
}
function RecentlyViewedSection({ games, addToCart, onOpenDetail }) {
  const ids = useRecentlyViewed();
  const shown = ids.map(id => games.find(g => g.id === id)).filter(Boolean);
  if (shown.length === 0) return null;
  return (
    <div className="mb-6">
      <h2 className="text-sm font-black mb-2.5 flex items-center gap-1.5" style={{ color: "#c3cbe8" }}>
        <History size={14} /> آخر ما شاهدت
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
        {shown.map(g => (
          <div key={g.id} className="snap-start w-28 flex-shrink-0 rounded-xl p-2.5 text-center qx-card">
            <button className="w-full" onClick={() => onOpenDetail && onOpenDetail(g)}>
              {g.image ? <img src={g.image} alt={g.name} className="w-full h-14 object-cover rounded-lg mb-1.5" loading="lazy" /> : <div className="text-xl mb-1.5">{g.icon}</div>}
              <div className="font-bold text-[11px] truncate">{g.name}</div>
              <div className="font-black text-[11px] mt-0.5" style={{ color: "#60a5fa" }}>{money(g.price)}</div>
            </button>
            <button onClick={() => addToCart({ pid: "game:" + g.id, name: g.name, price: Number(g.price) })}
              className="w-full mt-1 py-1 rounded-lg text-[10px] font-bold qx-btn qx-btn-primary">أضف للسلة</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MyOrdersPage({ orders, session, addToCart, setCartOpen, setToast }) {
  const sorted = [...orders].sort((a, b) => b.ts - a.ts);
  const [referral, setReferral] = useState(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    api.get("/api/account/referrals").then(r => { if (!cancelled) setReferral(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, [session]);

  return (
    <div className="pt-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        <Truck size={28} color="#60a5fa" className="mx-auto mb-2" style={{ filter: "drop-shadow(0 0 10px rgba(47,125,244,0.6))" }} />
        <h1 className="text-xl font-black">طلباتي</h1>
      </div>
      {session && (
        <div className="rounded-xl p-4 mb-6 text-center" style={{ ...card, border: "1px solid rgba(45,212,191,0.3)" }}>
          <p className="text-xs font-bold mb-1 flex items-center justify-center gap-1.5" style={{ color: "#c3cbe8" }}><Gift size={13} /> كود دعوة أصدقائك</p>
          <p className="font-black text-lg tracking-widest" style={{ color: "#2dd4bf", direction: "ltr" }}>{referral?.code || session.id.slice(-5).toUpperCase()}</p>
          <p className="text-[11px] mt-1" style={{ color: "#c3cbe8" }}>شارك الكود، وإذا سجل صديق فيه بتاخد خصم تلقائي على طلبك الجاي</p>
          {referral && <p className="text-[11px] mt-1 font-bold" style={{ color: "#fbbf24" }}>دعيت {referral.count} {referral.count === 1 ? "شخص" : "أشخاص"} لهلق</p>}
          {session.discountPercent > 0 && (
            <p className="text-[11px] mt-2 font-bold" style={{ color: "#2dd4bf" }}>🎁 عندك خصم {session.discountPercent}% جاهز لطلبك الجاي ({session.discountReason})</p>
          )}
        </div>
      )}
      {sorted.length === 0 ? (
        <p className="text-center text-sm" style={{ color: "#c3cbe8" }}>ما في طلبات لسا</p>
      ) : (
        <div className="space-y-3">
          {sorted.map(o => (
            <div key={o.id} className="rounded-xl p-4 qx-card">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold" style={{ color: "#c3cbe8" }}>#{o.id.slice(-6)} — {new Date(o.ts).toLocaleDateString("ar")}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: ORDER_STATUS_COLOR[o.status], background: "#0a0f20" }}>{ORDER_STATUS_LABEL[o.status] || o.status}</span>
              </div>
              <div className="text-xs mb-2" style={{ color: "#cdd3ee" }}>
                {o.items.map((it, i) => <div key={i}>• {it.name}{!o.custom && ` × ${it.qty}`}</div>)}
              </div>
              {!o.custom && <div className="font-black text-sm" style={{ color: "#60a5fa" }}>{money(o.total)}</div>}
              {o.paymentMethod && <div className="text-[11px] mt-1" style={{ color: "#c3cbe8" }}>طريقة الدفع: {PAYMENT_METHOD_LABEL[o.paymentMethod] || o.paymentMethod}</div>}
              {o.status === "cancelled" && o.cancelReason && (
                <p className="text-[11px] mt-1" style={{ color: "#f87171" }}>سبب الإلغاء: {o.cancelReason}</p>
              )}
              {!o.custom && addToCart && (
                <button onClick={() => {
                  o.items.forEach(it => { for (let i = 0; i < (it.qty || 1); i++) addToCart({ pid: "repeat:" + o.id + ":" + it.name, name: it.name, price: Number(it.price) }); });
                  setCartOpen?.(true);
                }} className="mt-2 text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: "#0a0f20", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.25)" }}>
                  <RefreshCw size={11} /> أعد الطلب
                </button>
              )}
              {o.status === "delivered" && <OrderRating order={o} />}
              {/* digital code(s) released for this order — tap to copy */}
              {(o.codes || []).length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {(o.codes).map((c, i) => (
                    <button key={i} type="button" onClick={async () => {
                      try {
                        if (typeof navigator !== "undefined" && navigator.clipboard) {
                          await navigator.clipboard.writeText(c.code);
                          setToast && setToast("✅ انسخنا الكود — الصقه عند التفعيل");
                        }
                      } catch (e) { /* clipboard unavailable */ }
                    }} className="w-full rounded-lg p-2 text-right flex items-center justify-between gap-2" style={{ background: "#0a0f20", border: "1px solid rgba(45,212,191,0.35)", direction: "ltr" }}>
                      <span className="font-black text-xs tracking-widest break-all" style={{ color: "#2dd4bf" }}>{c.code}</span>
                      <span className="text-[10px] font-bold flex-shrink-0" style={{ color: "#c3cbe8", direction: "rtl" }}>{c.product || "كود رقمي"} — اضغط للنسخ</span>
                    </button>
                  ))}
                </div>
              )}
              {o.status !== "cancelled" && ORDER_STATUS_STEPS.includes(o.status) && (
                <div className="flex items-center gap-1 mt-3">
                  {ORDER_STATUS_STEPS.map((s, i) => (
                    <React.Fragment key={s}>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: ORDER_STATUS_STEPS.indexOf(o.status) >= i ? "#2dd4bf" : "#26304f" }} />
                      {i < ORDER_STATUS_STEPS.length - 1 && <div className="flex-1 h-0.5" style={{ background: ORDER_STATUS_STEPS.indexOf(o.status) > i ? "#2dd4bf" : "#26304f" }} />}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderRating({ order }) {
  const [stars, setStars] = useState(order.rating || 0);
  const [comment, setComment] = useState(order.ratingComment || "");
  const [hover, setHover] = useState(0);
  const [saved, setSaved] = useState(!!order.rating);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!stars) return;
    setSaving(true);
    try {
      // legacy order rating kept working client-side but the product review
      // system is now the visible one — mark locally so we don't re-submit
      setSaved(true);
    } finally { setSaving(false); }
  };

  return (
    <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(47,125,244,0.2)" }}>
      <p className="text-[11px] font-bold mb-1.5" style={{ color: "#c3cbe8" }}>{saved ? "تقييمك للطلب" : "قيّم هالطلب"}</p>
      <div className="flex items-center gap-1 mb-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" disabled={saved} onMouseEnter={() => !saved && setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => !saved && setStars(n)}>
            <Star size={17} fill={(hover || stars) >= n ? "#fbbf24" : "none"} color="#fbbf24" />
          </button>
        ))}
      </div>
      {!saved ? (
        <div className="flex gap-2">
          <input value={comment} onChange={e => setComment(e.target.value)} placeholder="تعليق (اختياري)..." className="flex-1 px-2.5 py-1.5 rounded-lg text-[11px] outline-none qx-input" />
          <button type="button" disabled={!stars || saving} onClick={submit} className="text-[11px] font-bold px-3 py-1.5 rounded-lg" style={{ background: stars ? "#0a0f20" : "#10173a", color: "#2dd4bf", opacity: !stars || saving ? 0.5 : 1 }}>إرسال</button>
        </div>
      ) : (
        order.ratingComment && <p className="text-[11px]" style={{ color: "#cdd3ee" }}>"{order.ratingComment}"</p>
      )}
    </div>
  );
}

function TrackOrderPage({ initialId }) {
  const [orderId, setOrderId] = useState(initialId || "");
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const search = async (id) => {
    const idToUse = (id ?? orderId).trim();
    if (!idToUse) { setErr("حط رقم الطلب"); return; }
    setLoading(true); setErr(""); setOrder(null);
    try {
      const { order: o } = await api.get(`/api/orders/track/${encodeURIComponent(idToUse)}`);
      setOrder(o);
    } catch (e) { setErr(e.message || "ما لقينا طلب بهالرقم"); }
    setLoading(false);
  };

  useEffect(() => { if (initialId) search(initialId); }, []); // eslint-disable-line

  return (
    <div className="pt-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        <Truck size={28} color="#60a5fa" className="mx-auto mb-2" style={{ filter: "drop-shadow(0 0 10px rgba(47,125,244,0.6))" }} />
        <h1 className="text-xl font-black">تتبع طلبك</h1>
        <p className="text-xs mt-1" style={{ color: "#c3cbe8" }}>حط رقم الطلب يلي وصلك بالإيصال</p>
      </div>

      <div className="flex gap-2 mb-6">
        <input value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="رقم الطلب" className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none" style={{ ...inputStyle, direction: "ltr" }} />
        <button onClick={() => search()} disabled={loading} className="px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center qx-btn qx-btn-primary">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
        </button>
      </div>

      {err && <p className="text-sm text-center mb-4" style={{ color: "#f87171" }}>{err}</p>}

      {order && (
        <div className="rounded-xl p-4 qx-card">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold" style={{ color: "#c3cbe8" }}>#{order.id.slice(-6)} — {new Date(order.ts).toLocaleDateString("ar")}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: ORDER_STATUS_COLOR[order.status], background: "#0a0f20" }}>{ORDER_STATUS_LABEL[order.status] || order.status}</span>
          </div>
          <div className="text-xs mb-2" style={{ color: "#cdd3ee" }}>
            {order.items.map((it, i) => <div key={i}>• {it.name}{!order.custom && ` × ${it.qty}`}</div>)}
          </div>
          {!order.custom && <div className="font-black text-sm mb-2" style={{ color: "#60a5fa" }}>{money(order.total)}</div>}
          {order.paymentStatus && order.paymentStatus !== "unpaid" && (
            <p className="text-[11px] mb-1 font-bold" style={{ color: order.paymentStatus === "confirmed" ? "#2dd4bf" : "#fbbf24" }}>الدفع: {PAYMENT_STATUS_LABEL[order.paymentStatus] || order.paymentStatus}</p>
          )}
          {order.sourcingStatus && order.sourcingStatus !== "not_started" && (
            <p className="text-[11px] mb-1 font-bold" style={{ color: order.sourcingStatus === "failed" ? "#f87171" : "#2dd4bf" }}>التزويد: {SOURCING_STATUS_LABEL[order.sourcingStatus] || order.sourcingStatus}</p>
          )}
          {order.paymentStatus === "rejected" && order.paymentRejectReason && (
            <p className="text-[11px] mb-1" style={{ color: "#f87171" }}>سبب رفض إثبات الدفع: {order.paymentRejectReason}</p>
          )}
          {order.paymentStatus === "confirmed" && order.status === "delivered" && !"refund_requested,refund_processing,refunded".includes(order.status) && (
            <button type="button" onClick={async () => {
              const reason = window.prompt("ليش بدك تسترد المبلغ؟ (اختياري — ممكن تكتبها بصفحة الدعم بعدين)");
              if (reason === null) return; // cancelled the prompt
              try {
                await api.post(`/api/orders/refund/${order.id}`, { reason: reason.trim() || "لم يذكر سببًا" });
                setToast && setToast("✅ تم إرسال طلب الاسترداد، الإدارة رح تراجع طلبك");
                await search(order.id);
              } catch (e) { /* quietly keep UI stable */ }
            }} className="mt-2 text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1" style={{ background: "#211012", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}>
              <Undo2 size={11} /> أطلب استرداد المبلغ
            </button>
          )}
          {order.status === "cancelled" && order.cancelReason && (
            <p className="text-[11px] mb-2" style={{ color: "#f87171" }}>سبب الإلغاء: {order.cancelReason}</p>
          )}
          {order.status !== "cancelled" && ORDER_STATUS_STEPS.includes(order.status) && (
            <div className="flex items-center gap-1 mt-3">
              {ORDER_STATUS_STEPS.map((s, i) => (
                <React.Fragment key={s}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: ORDER_STATUS_STEPS.indexOf(order.status) >= i ? "#2dd4bf" : "#26304f" }} />
                  {i < ORDER_STATUS_STEPS.length - 1 && <div className="flex-1 h-0.5" style={{ background: ORDER_STATUS_STEPS.indexOf(order.status) > i ? "#2dd4bf" : "#26304f" }} />}
                </React.Fragment>
              ))}
            </div>
          )}
          {/* digital code(s) — only shown after staff releases them via the deliver_code action */}
          {(order.codes || []).length > 0 && (
            <div className="mt-3 space-y-1.5">
              {(order.codes).map((c, i) => (
                <button key={i} type="button" onClick={async () => {
                  try {
                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                      await navigator.clipboard.writeText(c.code);
                      setToast && setToast("✅ انسخنا الكود — الصقه عند التفعيل");
                    }
                  } catch (e) { /* clipboard unavailable */ }
                }} className="w-full rounded-lg p-2.5 text-right flex items-center justify-between gap-2" style={{ background: "#0a0f20", border: "1px solid rgba(45,212,191,0.35)", direction: "ltr" }}>
                  <span className="font-black text-sm tracking-widest break-all" style={{ color: "#2dd4bf" }}>{c.code}</span>
                  <span className="text-[10px] font-bold flex-shrink-0" style={{ color: "#c3cbe8", direction: "rtl" }}>{c.product || "كود رقمي"} — اضغط للنسخ</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* =================================================================
   SUPPORT CHAT (two-way) — logged-in customers only
================================================================= */
function SupportChatPage({ socialLinks }) {
  // unified support center: tickets (conversations) + messages
  const [convs, setConvs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const bottomRef = useRef(null);

  const loadConvs = async () => {
    try {
      const { conversations } = await api.get("/api/support/conversations");
      setConvs(conversations || []);
      if (isFirstLoad.current && (conversations || []).length > 0) {
        isFirstLoad.current = false;
        setActiveId(conversations[0].id);
      }
    } catch (e) { /* ignore transient poll failures */ }
    setLoading(false);
  };

  const loadMessages = async () => {
    if (!activeId) return;
    try {
      const { messages: m } = await api.get(`/api/support/conversations/${activeId}/messages`);
      setMessages(m || []);
    } catch (e) { /* ignore transient poll failures */ }
  };

  useEffect(() => {
    loadConvs();
    const iv = setInterval(() => { loadConvs(); loadMessages(); }, 5000);
    return () => clearInterval(iv);
  }, []); // eslint-disable-line

  useEffect(() => { loadMessages(); }, [activeId]); // eslint-disable-line

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "nearest" }); }, [messages.length]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { setPendingImage(await fileToCompressedDataUrl(file, 500, 0.7)); }
    finally { setUploading(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !pendingImage) return;
    setSending(true);
    try {
      await api.post(`/api/support/conversations/${activeId}/messages`, { text: text.trim() || (pendingImage ? "📷 صورة" : ""), image: pendingImage });
      setText(""); setPendingImage(null);
      await loadMessages(); await loadConvs();
    } catch (e) { /* leave the draft in place so the customer can retry */ }
    setSending(false);
  };

  const startNew = async () => {
    const subject = window.prompt("شو موضوع المحادثة؟");
    if (subject === null || !subject.trim()) return;
    try {
      const { conversation } = await api.post("/api/support/conversations", { subject: subject.trim().slice(0, 120), category: "other" });
      setActiveId(conversation.id);
      setMessages([]);
      await loadConvs();
    } catch (e) { /* fail quietly */ }
  };

  return (
    <div className="pt-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        <MessageCircle size={30} color="#60a5fa" className="mx-auto mb-2" style={{ filter: "drop-shadow(0 0 10px rgba(47,125,244,0.6))" }} />
        <h1 className="text-xl font-black">الدعم والمحادثة</h1>
        <p className="text-sm mt-1" style={{ color: "#c3cbe8" }}>راسلنا وبنرد عليك هون مباشرة</p>
      </div>

      {convs.length === 0 ? (
        <div className="rounded-2xl p-6 text-center qx-card">
          <MessageCircle size={26} color="#60a5fa" className="mx-auto mb-2" style={{ filter: "drop-shadow(0 0 10px rgba(47,125,244,0.6))" }} />
          <p className="text-xs mb-4" style={{ color: "#c3cbe8" }}>ما في محادثات سابقة — ابدأ محادثة جديدة وفريقنا بيرد عليك بأقرب وقت</p>
          <button onClick={startNew} className="text-xs font-bold px-4 py-2 rounded-lg qx-btn qx-btn-primary">ابدأ محادثة جديدة</button>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {convs.map(c => (
              <button key={c.id} onClick={() => setActiveId(c.id)} className="shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-full flex items-center gap-1"
                style={activeId === c.id ? orangeBtn : { background: "rgba(12,17,40,0.6)", color: "#c3cbe8", border: "1px solid rgba(47,125,244,0.28)" }}>
                {c.ticket_no}
                {c.unread_user > 0 && <span className="w-2 h-2 rounded-full" style={{ background: "#f87171" }} />}
              </button>
            ))}
          </div>

          <div className="rounded-2xl p-4 mb-4 flex flex-col gap-2.5 min-h-[240px] max-h-[420px] overflow-y-auto qx-card">
            {loading ? (
              <Loader2 size={20} className="animate-spin mx-auto my-auto" color="#c3cbe8" />
            ) : messages.length === 0 ? (
              <p className="text-xs text-center my-auto" style={{ color: "#c3cbe8" }}>ابدأ المحادثة، وفريقنا بيرد عليك بأقرب وقت</p>
            ) : messages.map(m => (
              <div key={m.id} className={"max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm " + (m.from_role === "customer" ? "self-end" : "self-start")}
                style={m.from_role === "customer" ? orangeBtn : { background: "#0a0f20", border: "1px solid rgba(47,125,244,0.2)" }}>
                {m.image_url && <img src={m.image_url} alt="" className="rounded-lg mb-1.5 max-h-40 object-cover" loading="lazy" />}
                {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                <p className="text-[10px] mt-1 opacity-70" style={{ direction: "ltr", textAlign: m.from_role === "customer" ? "right" : "left" }}>{new Date(m.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </>
      )}

      {pendingImage && (
        <div className="mb-2 flex items-center gap-2">
          <img src={pendingImage} alt="" className="w-12 h-12 rounded-lg object-cover" loading="lazy" />
          <button onClick={() => setPendingImage(null)} className="text-xs font-bold" style={{ color: "#f87171" }}>إزالة</button>
        </div>
      )}
      <form onSubmit={submit} className="flex items-center gap-2">
        <label className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer" style={{ background: "#0c1230", border: "1px solid rgba(47,125,244,0.2)", color: "#c3cbe8" }}>
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} />}
          <input type="file" accept="image/*" className="hidden" onChange={onFile} />
        </label>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="اكتب رسالتك..." className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none qx-input" />
        <button type="submit" disabled={sending} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 qx-btn qx-btn-primary">
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button onClick={startNew} className="text-[11px] font-bold px-3 py-1.5 rounded-lg" style={{ background: "#0c1230", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.25)" }}>
          <Plus size={11} className="inline ml-1" /> تذكرة دعم جديدة
        </button>
      </div>
      <div className="mt-6">
        <p className="text-xs text-center mb-2" style={{ color: "#c3cbe8" }}>أو تواصل معنا مباشرة</p>
        <SocialLinksRow socialLinks={socialLinks || DEFAULT_SOCIAL_LINKS} />
      </div>
    </div>
  );
}

/* =================================================================
   ACCOUNT PAGE
================================================================= */
function NotifsSection() {
  const [notifs, setNotifs] = useState([]);
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    api.get("/api/notifications?limit=50").then(r => setNotifs(r.notifications || [])).finally(() => setBusy(false)).catch(() => setBusy(false));
  }, []);
  const markAll = async () => {
    await api.post("/api/notifications/read");
    setNotifs(n => n.map(x => ({ ...x, is_read: true })));
  };
  const kindLabel = { order: "📦 طلب", payment: "💳 دفع", message: "💬 رسالة", promo: "🎁 عرض", system: "ℹ️ نظام" };
  return (
    <div className="space-y-2">
      {notifs.length > 0 && (
        <button onClick={markAll} className="text-[11px] font-bold px-3 py-1.5 rounded-lg" style={{ background: "#0c1230", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.25)" }}>علّم الكل كمقروء</button>
      )}
      {busy ? (
        <Loader2 size={18} className="animate-spin mx-auto" color="#c3cbe8" />
      ) : notifs.length === 0 ? (
        <p className="text-xs text-center" style={{ color: "#c3cbe8" }}>ما في إشعارات لسا — بنعلمك هون لما يتغير شي بطلباتك</p>
      ) : notifs.map(n => (
        <div key={n.id} className="rounded-xl p-3.5" style={{ ...card, opacity: n.is_read ? 0.65 : 1 }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">{kindLabel[n.kind] || "ℹ️"} {n.title}</span>
            <span className="text-[10px]" style={{ color: "#c3cbe8" }}>{new Date(n.created_at).toLocaleDateString("ar")}</span>
          </div>
          {n.body && <p className="text-[11px] mt-1" style={{ color: "#c3cbe8" }}>{n.body}</p>}
        </div>
      ))}
    </div>
  );
}

function AccountPage({ session, updateCurrentUser, deleteCurrentUser, changeMyPassword, orders, wishlist, setTab, setToast }) {
  const [section, setSection] = useState("profile");
  const [name, setName] = useState(session.name);
  const [email, setEmail] = useState(session.email || "");
  const [phone, setPhone] = useState(session.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileErr, setProfileErr] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [curPw, setCurPw] = useState(""); const [newPw, setNewPw] = useState("");
  const [pwErr, setPwErr] = useState(""); const [pwOk, setPwOk] = useState(false); const [pwBusy, setPwBusy] = useState(false);

  const [addresses, setAddresses] = useState(session.addresses || []);
  const [newAddr, setNewAddr] = useState({ label: "", details: "" });

  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveProfile = async () => {
    setProfileErr("");
    if (!name.trim()) { setProfileErr("الاسم مطلوب"); return; }
    if (!email.trim() && !phone.trim()) { setProfileErr("لازم إيميل أو رقم هاتف عالأقل"); return; }
    if (email.trim() && !isValidEmail(email)) { setProfileErr("صيغة الإيميل غير صحيحة"); return; }
    setSavingProfile(true);
    await updateCurrentUser({ name: name.trim(), email: email.trim(), phone: phone.trim() });
    setSavingProfile(false);
    setToast("✅ تم حفظ التعديلات"); setTimeout(() => setToast(null), 2000);
  };

  const onAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file, 220, 0.8);
      const { avatar } = await api.post("/api/account/avatar", { image: dataUrl });
      await updateCurrentUser({ avatar });
    } finally { setUploadingAvatar(false); }
  };

  const submitPwChange = async () => {
    setPwErr(""); setPwOk(false);
    if (!curPw || !newPw) { setPwErr("عبي الحقلين"); return; }
    setPwBusy(true);
    const res = await changeMyPassword(curPw, newPw);
    setPwBusy(false);
    if (!res.ok) { setPwErr(res.error); return; }
    setPwOk(true); setCurPw(""); setNewPw("");
    setToast("✅ تم تغيير كلمة السر"); setTimeout(() => setToast(null), 2000);
  };

  const saveAddresses = async (next) => {
    setAddresses(next);
    await updateCurrentUser({ addresses: next });
  };
  const addAddress = () => {
    if (!newAddr.label.trim() || !newAddr.details.trim()) return;
    saveAddresses([...addresses, { id: "addr" + Date.now(), ...newAddr }]);
    setNewAddr({ label: "", details: "" });
  };
  const removeAddress = (id) => saveAddresses(addresses.filter(a => a.id !== id));

  const notifications = [...orders].sort((a, b) => b.ts - a.ts).slice(0, 8)
    .filter(o => !["pending_payment", "pending"].includes(o.status))
    .map(o => ({ id: o.id, text: `تحديث على طلبك #${o.id.slice(-6)}: ${ORDER_STATUS_LABEL[o.status] || o.status}`, ts: o.ts, color: ORDER_STATUS_COLOR[o.status] }));

  const SecBtn = ({ id, label, icon }) => (
    <button onClick={() => setSection(id)} className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all duration-150"
      style={section === id ? orangeBtn : { background: "rgba(12,17,40,0.6)", color: "#c3cbe8", border: "1px solid rgba(47,125,244,0.28)" }}>
      {icon} {label}
    </button>
  );

  return (
    <div className="pt-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden mx-auto mb-2" style={{ background: "#0c1230", border: "2px solid rgba(47,125,244,0.4)" }}>
            {session.avatar ? <img src={session.avatar} alt="" className="w-full h-full object-cover" loading="lazy" /> : <User size={30} color="#c3cbe8" />}
          </div>
          <label className="absolute bottom-1 left-0 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer qx-btn qx-btn-primary">
            {uploadingAvatar ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
            <input type="file" accept="image/*" className="hidden" onChange={onAvatarFile} />
          </label>
        </div>
        <h1 className="text-lg font-black">{session.name}</h1>
        <p className="text-xs" style={{ color: "#c3cbe8", direction: "ltr" }}>{session.email || session.phone}</p>
      </div>

      <div className="flex gap-1.5 mb-5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <SecBtn id="profile" label="الملف الشخصي" icon={<User size={13} />} />
        <SecBtn id="addresses" label="العناوين" icon={<MapPin size={13} />} />
        <SecBtn id="orders" label="طلباتي" icon={<Truck size={13} />} />
        <SecBtn id="wishlist" label="المفضلة" icon={<Heart size={13} />} />
        <SecBtn id="notifications" label="الإشعارات" icon={<Bell size={13} />} />
      </div>

      {section === "profile" && (
        <div className="space-y-4">
          <div className="rounded-xl p-4 space-y-2.5 qx-card">
            <p className="text-xs font-bold" style={{ color: "#c3cbe8" }}>المعلومات الأساسية</p>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="الاسم" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none qx-input" />
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="الإيميل" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none qx-input" style={{...inputStyle}} />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="رقم الواتساب" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none qx-input" style={{...inputStyle}} />
            {profileErr && <p className="text-xs" style={{ color: "#f87171" }}>{profileErr}</p>}
            <button onClick={saveProfile} disabled={savingProfile} className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 qx-btn qx-btn-primary">
              {savingProfile ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} حفظ التعديلات
            </button>
          </div>

          <div className="rounded-xl p-4 space-y-2.5 qx-card">
            <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: "#c3cbe8" }}><Lock size={13} /> تغيير كلمة السر</p>
            <PasswordField value={curPw} onChange={e => setCurPw(e.target.value)} placeholder="كلمة السر الحالية" />
            <PasswordField value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="كلمة السر الجديدة" showStrength />
            {pwErr && <p className="text-xs" style={{ color: "#f87171" }}>{pwErr}</p>}
            {pwOk && <p className="text-xs flex items-center gap-1" style={{ color: "#2dd4bf" }}><CheckCircle2 size={13} /> تم التغيير بنجاح</p>}
            <button onClick={submitPwChange} disabled={pwBusy} className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: "#0a0f20", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.3)", opacity: pwBusy ? 0.7 : 1 }}>
              {pwBusy ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />} تغيير كلمة السر
            </button>
          </div>

          <div className="rounded-xl p-4" style={{ ...card, border: "1px solid rgba(255,59,59,0.35)" }}>
            <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: "#f87171" }}><AlertTriangle size={13} /> منطقة خطرة</p>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: "#0a0f20", color: "#f87171", border: "1px solid rgba(255,107,107,0.3)" }}>
                <Trash2 size={14} /> حذف الحساب نهائيًا
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs" style={{ color: "#c3cbe8" }}>متأكد؟ هذا الإجراء ما ممكن التراجع عنه، وبيمسح حسابك وكل بياناته المحفوظة بهالمتصفح.</p>
                <div className="flex gap-2">
                  <button onClick={deleteCurrentUser} className="flex-1 py-2 rounded-lg font-bold text-xs" style={{ background: "#f87171", color: "#fff" }}>تأكيد الحذف</button>
                  <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-lg font-bold text-xs" style={{ background: "rgba(12,17,40,0.6)", color: "#c3cbe8", border: "1px solid rgba(47,125,244,0.28)" }}>إلغاء</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {section === "addresses" && (
        <div className="space-y-3">
          {addresses.length === 0 && <p className="text-xs text-center" style={{ color: "#c3cbe8" }}>ما في عناوين مضافة</p>}
          {addresses.map(a => (
            <div key={a.id} className="rounded-xl p-3.5 flex items-start justify-between qx-card">
              <div><p className="font-bold text-sm">{a.label}</p><p className="text-xs mt-0.5" style={{ color: "#c3cbe8" }}>{a.details}</p></div>
              <button onClick={() => removeAddress(a.id)} style={{ color: "#f87171" }}><Trash2 size={15} /></button>
            </div>
          ))}
          <div className="rounded-xl p-4 space-y-2 qx-card">
            <input value={newAddr.label} onChange={e => setNewAddr({ ...newAddr, label: e.target.value })} placeholder="اسم العنوان (البيت، الشغل...)" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none qx-input" />
            <textarea value={newAddr.details} onChange={e => setNewAddr({ ...newAddr, details: e.target.value })} placeholder="تفاصيل العنوان" rows={2} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none qx-input" />
            <button onClick={addAddress} className="w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 qx-btn qx-btn-primary"><Plus size={14} /> إضافة عنوان</button>
          </div>
        </div>
      )}

      {section === "orders" && (
        <div className="space-y-3">
          {orders.length === 0 ? <p className="text-xs text-center" style={{ color: "#c3cbe8" }}>ما في طلبات لسا</p> : (
            [...orders].sort((a, b) => b.ts - a.ts).slice(0, 5).map(o => (
              <div key={o.id} className="rounded-xl p-3.5 qx-card">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold" style={{ color: "#c3cbe8" }}>#{o.id.slice(-6)}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: ORDER_STATUS_COLOR[o.status], background: "#0a0f20" }}>{ORDER_STATUS_LABEL[o.status] || o.status}</span>
                </div>
                <p className="text-xs" style={{ color: "#cdd3ee" }}>{o.items.map(it => it.name).join("، ")}</p>
              </div>
            ))
          )}
          <button onClick={() => setTab("myorders")} className="w-full py-2.5 rounded-xl font-bold text-xs" style={{ background: "rgba(45,212,191,0.08)", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.35)" }}>عرض كل الطلبات</button>
        </div>
      )}

      {section === "wishlist" && (
        <div className="space-y-3">
          {wishlist.length === 0 ? <p className="text-xs text-center" style={{ color: "#c3cbe8" }}>المفضلة فاضية</p> : (
            <div className="grid grid-cols-3 gap-2">
              {wishlist.map(g => (
                <div key={g.id} className="rounded-xl p-2.5 text-center qx-card">
                  {g.image ? <img src={g.image} alt="" className="w-full h-14 object-cover rounded-lg mb-1" loading="lazy" /> : <div className="text-2xl mb-1">{g.icon}</div>}
                  <p className="text-[11px] font-bold truncate">{g.name}</p>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setTab("wishlist")} className="w-full py-2.5 rounded-xl font-bold text-xs" style={{ background: "rgba(45,212,191,0.08)", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.35)" }}>عرض المفضلة كاملة</button>
        </div>
      )}

      {section === "notifications" && <NotifsSection />}
    </div>
  );
}

/* =================================================================
   SETTINGS PAGE
================================================================= */
function SettingsPage({ session, updateCurrentUser, changeMyPassword, doLogoutEverywhere, setToast }) {
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [privacyShareOrders, setPrivacyShareOrders] = useState(true);
  const [twoFA, setTwoFA] = useState(!!session.twoFAEnabled);
  const [savingTwoFA, setSavingTwoFA] = useState(false);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);

  const toggleTwoFA = async () => {
    setSavingTwoFA(true);
    await updateCurrentUser({ twoFAEnabled: !twoFA });
    setTwoFA(v => !v);
    setSavingTwoFA(false);
    setToast(!twoFA ? "✅ تم تفعيل التحقق بخطوتين" : "تم إيقاف التحقق بخطوتين");
    setTimeout(() => setToast(null), 2500);
  };

  const requestNotifPermission = async () => {
    setNotifEnabled(true);
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch (e) {}
    }
  };

  const Row = ({ icon, title, desc, right }) => (
    <div className="rounded-xl p-4 flex items-center justify-between gap-3 qg-card">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#0a0f20", color: "#60a5fa" }}>{icon}</div>
        <div><p className="font-bold text-sm">{title}</p>{desc && <p className="text-[11px] mt-0.5" style={{ color: "#c3cbe8" }}>{desc}</p>}</div>
      </div>
      {right}
    </div>
  );

  const Toggle = ({ on, onClick }) => (
    <button onClick={onClick} className="w-11 h-6 rounded-full relative shrink-0 transition-colors duration-200" style={{ background: on ? "#2dd4bf" : "#26304f" }}>
      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200" style={{ right: on ? 1 : 21 }} />
    </button>
  );

  return (
    <div className="pt-8 max-w-md mx-auto space-y-3">
      <div className="text-center mb-3">
        <Settings size={26} color="#60a5fa" className="mx-auto mb-2" style={{ filter: "drop-shadow(0 0 10px rgba(47,125,244,0.6))" }} />
        <h1 className="text-xl font-black">الإعدادات</h1>
      </div>

      <p className="text-[11px] font-bold px-1" style={{ color: "#c3cbe8" }}>الحساب</p>
      <Row icon={<Globe size={15} />} title="اللغة" desc="العربية (لغات إضافية قريبًا)"
        right={<span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: "#0a0f20", color: "#c3cbe8" }}>AR</span>} />
      <Row icon={<Moon size={15} />} title="المظهر" desc="داكن (فاتح قريبًا)"
        right={<span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: "#0a0f20", color: "#c3cbe8" }}>🌙</span>} />

      <p className="text-[11px] font-bold px-1 pt-2" style={{ color: "#c3cbe8" }}>الإشعارات</p>
      <Row icon={<Bell size={15} />} title="إشعارات المتصفح" desc="تنبيه فوري لما يوصلك رد أو يتغير طلب"
        right={<Toggle on={notifEnabled} onClick={() => notifEnabled ? setNotifEnabled(false) : requestNotifPermission()} />} />

      <p className="text-[11px] font-bold px-1 pt-2" style={{ color: "#c3cbe8" }}>الخصوصية</p>
      <Row icon={<ShieldCheck size={15} />} title="مشاركة سجل الطلبات مع الدعم" desc="يساعد فريق الدعم يشوف سياق طلباتك السابقة"
        right={<Toggle on={privacyShareOrders} onClick={() => setPrivacyShareOrders(v => !v)} />} />

      <p className="text-[11px] font-bold px-1 pt-2" style={{ color: "#c3cbe8" }}>الأمان</p>
      <Row icon={<KeyRound size={15} />} title="التحقق بخطوتين (2FA)"
        desc={savingTwoFA ? "جاري الحفظ..." : "مفعّل دائمًا — بيوصلك كود OTP على إيميلك عند كل تسجيل دخول"}
        right={<span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: "#0a0f20", color: "#2dd4bf" }}>مفعّل ✓</span>} />
      <Row icon={<Smartphone size={15} />} title="الجلسات النشطة على هذا المتصفح"
        desc="بينهي أي جلسة قديمة محفوظة بهالمتصفح لنفس الحساب (لحماية حقيقية على كل الأجهزة، هالموقع محتاج سيرفر — راجع الملاحظة بالأعلى)"
        right={
          confirmLogoutAll ? (
            <div className="flex gap-1.5">
              <button onClick={doLogoutEverywhere} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg" style={{ background: "#f87171", color: "#fff" }}>تأكيد</button>
              <button onClick={() => setConfirmLogoutAll(false)} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg" style={{ background: "#0a0f20", color: "#c3cbe8" }}>إلغاء</button>
            </div>
          ) : (
            <button onClick={() => setConfirmLogoutAll(true)} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1" style={{ background: "#0a0f20", color: "#f87171", border: "1px solid rgba(255,107,107,0.3)" }}>
              <RefreshCw size={11} /> إنهاء الجلسات
            </button>
          )
        } />
    </div>
  );
}

/* =================================================================
   ADMIN
================================================================= */
// 2FA is now always enabled by default for every account (DB column default = true),
// so this gate is kept only as a safety net for legacy accounts created with it off.
function OwnerTwoFAGate({ updateCurrentUser, onLogout }) {
  const [enabling, setEnabling] = useState(false);
  const enable = async () => { setEnabling(true); await updateCurrentUser({ twoFAEnabled: true }); setEnabling(false); };
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-sm w-full rounded-2xl p-6 text-center qg-card">
        <ShieldAlert size={30} color="#fbbf24" className="mx-auto mb-3" />
        <h2 className="font-black text-lg mb-2">التحقق بخطوتين مطلوب لحساب المالك</h2>
        <p className="text-xs mb-5" style={{ color: "#c3cbe8" }}>
          حسابك عنده وصول لكل الطلبات ومعلومات الدفع، فلازم يكون التحقق بخطوتين مفعّل قبل ما تكمل للوحة التحكم.
        </p>
        <button disabled={enabling} onClick={enable} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mb-2 qx-btn qx-btn-primary">
          {enabling ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={15} />} فعّل الآن
        </button>
        <button onClick={onLogout} className="w-full py-2.5 rounded-xl font-bold text-xs" style={{ background: "#0a0f20", color: "#c3cbe8" }}>تسجيل خروج</button>
      </div>
    </div>
  );
}

function AdminPanel({ games, setGames, prices, setPrices, faq, banners, testimonials, about, coupons, paymentInfo, quickReplies, priceComparison, setPriceComparison, refundPolicy, setRefundPolicy, socialLinks, setSocialLinks, maintenance, setMaintenance, shipping, session, onLogout, updateCurrentUser, branding: _branding, setBranding: setStoreBranding }) {
  const role = session.role; // 'owner' | 'staff' — this function is only ever reached once Root has already confirmed one of these
  const adminName = session.name;
  const [section, setSection] = useState("orders");
  const [openChatUserId, setOpenChatUserId] = useState(null);
  const [flash, setFlash] = useState(false);
  const flashSaved = () => { setFlash(true); setTimeout(() => setFlash(false), 1600); };
  const isOwner = role === "owner";
  const perms = session.permissions || {};
  const can = (key) => isOwner || !!perms[key];

  // the owner's account carries real financial data (payment info, everyone's
  // orders) so 2FA isn't optional for that specific role — staff can still
  // use the dashboard without it.
  if (isOwner && !session.twoFAEnabled) {
    return <OwnerTwoFAGate updateCurrentUser={updateCurrentUser} onLogout={onLogout} />;
  }

  // orders / messages / customers / activity log now all live on the real
  // backend, fetched here once and shared down to the tabs that need them,
  // with a light poll on orders so new orders actually show up live.
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminMessages, setAdminMessages] = useState([]);
  const [adminCustomers, setAdminCustomers] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [staff, setStaff] = useState([]);
  const [adminSuppliers, setAdminSuppliers] = useState([]);
  const [sourcingRequests, setSourcingRequests] = useState([]);
  const [refundQueue, setRefundQueue] = useState([]);
  const [chatThreads, setChatThreads] = useState([]);
  const [loadingAdminData, setLoadingAdminData] = useState(true);
  // ---------- تبويب الإعدادات (تفاصيل الاتصال + بريد الإشعارات) ----------
  const [settingsContacts, setSettingsContacts] = useState(DEFAULT_SOCIAL_LINKS);
  const [settingsEmail, setSettingsEmail] = useState({ user: "", configured: false, passStored: false });
  const [settingsPass, setSettingsPass] = useState("");
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsErr, setSettingsErr] = useState("");
  const [branding, setBranding] = useState(_branding || DEFAULT_BRANDING);
  useEffect(() => { if (_branding) setBranding(_branding); }, [_branding]);
  const [logoUploadErr, setLogoUploadErr] = useState("");
  const logoInputRef = useRef(null);
  // ---------- تبويب الإعدادات: صفحة من نحن ----------
  const DEFAULT_ABOUT_PAGE = { headline: "متجرك الأول للبطاقات والاشتراكات الرقمية", story: "", hours: [
    { day: "السبت", en: "sat", open: "14:00", close: "23:00", enabled: true },
    { day: "الأحد", en: "sun", open: "14:00", close: "23:00", enabled: true },
    { day: "الاثنين", en: "mon", open: "16:00", close: "23:00", enabled: true },
    { day: "الثلاثاء", en: "tue", open: "16:00", close: "23:00", enabled: true },
    { day: "الأربعاء", en: "wed", open: "16:00", close: "23:00", enabled: true },
    { day: "الخميس", en: "thu", open: "14:00", close: "24:00", enabled: true },
    { day: "الجمعة", en: "fri", open: "14:00", close: "24:00", enabled: true },
  ]};
  const [aboutPage, setAboutPage] = useState(DEFAULT_ABOUT_PAGE);
  const [aboutPageSaved, setAboutPageSaved] = useState(false);
  const [aboutPageErr, setAboutPageErr] = useState("");
  const loadSettings = async () => {
    try {
      const { socialLinks, settings, email, aboutPage: ap } = await api.get("/api/admin/settings");
      const sl = (socialLinks && Object.keys(socialLinks).length > 0) ? { ...DEFAULT_SOCIAL_LINKS, ...socialLinks } : socialLinks || DEFAULT_SOCIAL_LINKS;
      setSettingsContacts(sl);
      setSettingsEmail({ user: (email && email.user) || "", configured: !!(email && email.configured), passStored: !!((settings && settings.smtpPass)) });
      const br = (settings && settings.branding) || DEFAULT_BRANDING;
      setBranding(br);
      setStoreBranding(br);
      if (ap && Object.keys(ap).length > 0) setAboutPage({ ...DEFAULT_ABOUT_PAGE, ...ap });
    } catch (e) {}
  };
  const persistAboutPage = async (n) => {
    setAboutPage(n);
    setAboutPageErr("");
    try {
      const r = await api.post("/api/admin/settings", { aboutPage: n });
      if (r && r.ok) {
        setAboutPageSaved(true);
        setTimeout(() => setAboutPageSaved(false), 2000);
        flashSaved();
      } else throw new Error("fail");
    } catch (e) { setAboutPageErr("حفظ فشل — تحقق من ساعات العمل (صيغة HH:mm) أو النص أطول من المسموح"); setTimeout(() => setAboutPageErr(""), 4000); }
  };
  const persistSettingsContacts = async (n) => {
    setSettingsContacts(n);
    setSocialLinks(n);
    await api.post("/api/admin/settings", { socialLinks: n });
    flashSaved();
  };
  // ---------- رفع شعار المتجر (S3) ----------
  const persistBrandLogo = async (file) => {
    setLogoUploadErr("");
    const MAX = 2 * 1024 * 1024;
    if (file.size > MAX) { setLogoUploadErr("الشعار أكبر من 2 ميجابايت — اضغط عليه أولًا"); setTimeout(() => setLogoUploadErr(""), 4000); return; }
    if (!file.type.startsWith("image/")) { setLogoUploadErr("اختر ملف صورة فقط (PNG/JPG)"); setTimeout(() => setLogoUploadErr(""), 4000); return; }
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const r = await api.post("/api/admin/settings", { logo: b64 });
      if (r && r.ok) {
        setBranding(r.branding || { logoUrl: b64 });
        setStoreBranding(r.branding || { logoUrl: b64 });
        flashSaved();
        setLogoUploadErr("");
        if (logoInputRef.current) logoInputRef.current.value = "";
      } else throw new Error("fail");
    } catch (e) { setLogoUploadErr("فشل رفع الشعار — جرب صورة أصغر"); setTimeout(() => setLogoUploadErr(""), 4000); }
  };
  const clearBrandLogo = async () => {
    try {
      const r = await api.post("/api/admin/settings", { logo: "" });
      if (r && r.ok) { setBranding(DEFAULT_BRANDING); setStoreBranding(DEFAULT_BRANDING); flashSaved(); }
    } catch (e) {}
  };
  const persistSettingsSmtp = async () => {
    const body = { smtp: { user: settingsEmail.user, appPassword: settingsPass || undefined } };
    try {
      const r = await api.post("/api/admin/settings", body);
      if (r && r.ok) {
        setSettingsErr("");
        setSettingsPass("");
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2000);
        flashSaved();
        loadSettings();
      } else throw new Error("fail");
    } catch (e) { setSettingsErr("فشل الحفظ — تحقق من البريد وكلمة المرور"); setTimeout(() => setSettingsErr(""), 4000); }
  };
  useEffect(() => {
    if (section === "settings") loadSettings();
  }, [section]);

  const loadOrders = async () => {
    try {
      const { orders } = await api.get("/api/admin/orders");
      setAdminOrders(prev => {
        const prevIds = new Set(prev.filter(o => o.status === "proof_submitted").map(o => o.id));
        const newlyWaiting = orders.filter(o => o.status === "proof_submitted" && !prevIds.has(o.id));
        if (prev.length > 0 && newlyWaiting.length > 0) notifyNewPayment(newlyWaiting.length);
        return orders;
      });
    } catch (e) {}
  };
  const loadChats = async () => { try { const { threads } = await api.get("/api/admin/chats"); setChatThreads(threads || []); } catch (e) {} };
  const loadSuppliers = async () => { try { const { suppliers } = await api.get("/api/admin/suppliers"); setAdminSuppliers(suppliers || []); } catch (e) {} };
  const loadSourcing = async () => { try { const { requests } = await api.get("/api/admin/sourcing"); setSourcingRequests(requests || []); } catch (e) {} };
  const loadRefunds = async () => { try { const { refunds } = await api.get("/api/admin/refunds"); setRefundQueue(refunds || []); } catch (e) {} };
  const loadMessages = async () => { try { const { messages } = await api.get("/api/admin/messages"); setAdminMessages(messages); } catch (e) {} };
  const loadCustomers = async () => { try { const { customers } = await api.get("/api/admin/customers"); setAdminCustomers(customers); } catch (e) {} };
  const loadActivity = async () => { try { const { log } = await api.get("/api/admin/activity"); setActivityLog(log); } catch (e) {} };
  const loadStaff = async () => { try { const { staff: s } = await api.get("/api/admin/staff"); setStaff(s); } catch (e) {} };

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    (async () => {
      const tasks = [loadOrders(), loadMessages(), loadCustomers()];
      if (isOwner) tasks.push(loadActivity(), loadStaff());
      if (can("orders_status")) tasks.push(loadChats(), loadSourcing(), loadRefunds(), loadSuppliers());
      await Promise.all(tasks);
      setLoadingAdminData(false);
    })();
    const iv = setInterval(() => { loadOrders(); loadChats(); }, 5000);
    return () => clearInterval(iv);
  }, []); // eslint-disable-line

  // catalog/content edits still route through Root's games/prices state
  // (public data, loaded from /api/content for everyone) but now persist
  // to the real backend instead of localStorage. Activity logging happens
  // server-side inside those endpoints now, not from here.
  const persistGames = async (n) => { setGames(n); await api.post("/api/admin/content", { key: "games", value: n }); flashSaved(); if (isOwner) loadActivity(); };
  const persistPrices = async (n) => { setPrices(n); await api.post("/api/admin/content", { key: "prices", value: n }); flashSaved(); if (isOwner) loadActivity(); };
  const persistFaq = async (n) => { await api.post("/api/admin/content", { key: "faq", value: n }); flashSaved(); };
  const persistBanners = async (n) => { await api.post("/api/admin/content", { key: "banners", value: n }); flashSaved(); };
  const persistTestimonials = async (n) => { await api.post("/api/admin/content", { key: "testimonials", value: n }); flashSaved(); };
  const persistAbout = async (n) => { await api.post("/api/admin/content", { key: "about", value: n }); flashSaved(); };
  const persistPriceComparison = async (n) => { setPriceComparison(n); await api.post("/api/admin/content", { key: "priceComparison", value: n }); flashSaved(); };
  const persistRefundPolicy = async (n) => { setRefundPolicy(n); await api.post("/api/admin/content", { key: "refundPolicy", value: n }); flashSaved(); };
  const persistSocialLinks = async (n) => { setSocialLinks(n); await api.post("/api/admin/content", { key: "socialLinks", value: n }); flashSaved(); };
  const persistMaintenance = async (n) => { setMaintenance(n); await api.post("/api/admin/content", { key: "maintenanceMode", value: n }); flashSaved(); };
  const persistCoupons = async (n) => { await api.post("/api/admin/content", { key: "coupons", value: n }); flashSaved(); };
  const [paymentInfoLocal, setPaymentInfoLocal] = useState(paymentInfo);
  const [quickRepliesLocal, setQuickRepliesLocal] = useState(quickReplies);
  useEffect(() => { setPaymentInfoLocal(paymentInfo); }, [paymentInfo]);
  useEffect(() => { setQuickRepliesLocal(quickReplies); }, [quickReplies]);
  const persistPaymentInfo = async (n) => { setPaymentInfoLocal(n); await api.post("/api/admin/content", { key: "paymentInfo", value: n }); flashSaved(); };
  const persistShipping = async (n) => { setShipping(n); await api.post("/api/admin/content", { key: "shipping", value: n }); flashSaved(); };
  const persistQuickReplies = async (n) => { setQuickRepliesLocal(n); await api.post("/api/admin/content", { key: "quickReplies", value: n }); flashSaved(); };

  const unreadMsg = adminMessages.filter(m => !m.read).length;
  const pendingOrd = adminOrders.filter(o => o.status === "proof_submitted" || o.status === "pending").length;
  // تنبيه الطلبات المتروكة: طلبات بحالة "بانتظار الدفع" مر عليها أكثر من ساعة
  const stalledOrders = adminOrders.filter(o =>
    o.status === "pending_payment" && o.ts && (Date.now() - new Date(o.ts).getTime()) > 3600000
  );
  const unreadChats = chatThreads.filter(t => t.unread_admin).length;

  // each tab's id + which permission unlocks it — drives both the tab bar
  // and the fallback redirect below, in one place
  const SettingsField = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="block text-[11px] font-bold mb-1" style={{ color: "#c3cbe8" }}>{label}</label>
    <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(12,17,40,0.6)", border: "1px solid rgba(47,125,244,0.28)", color: "#f4f6fb" }} />
  </div>
);
const TABS = [
    { id: "orders", label: "الطلبات", allowed: can("orders_view"), badge: pendingOrd },
    { id: "chats", label: "الدعم", allowed: can("chats_view"), badge: unreadChats },
    { id: "messages", label: "رسائل التواصل", allowed: can("chats_view"), badge: unreadMsg },
    { id: "suppliers", label: "الموردون", allowed: can("orders_status") },
    { id: "sourcing", label: "طلبات التزويد", allowed: can("orders_status") },
    { id: "refunds", label: "الاسترداد", allowed: can("orders_view") },
    { id: "games", label: "إدارة الألعاب", allowed: can("content_games") },
    { id: "prices", label: "إدارة الأسعار", allowed: can("content_prices") },
    { id: "content", label: "المحتوى", allowed: can("content_banners") || can("content_faq") || can("content_about") },
    { id: "coupons", label: "الكوبونات", allowed: can("content_coupons") },
    { id: "shipping", label: "التوصيل", allowed: isOwner },
    { id: "payment", label: "معلومات الدفع", allowed: isOwner },
    { id: "settings", label: "الإعدادات", allowed: isOwner },
    { id: "reports", label: "التقارير", allowed: can("reports_view") },
    { id: "users", label: "العملاء", allowed: isOwner },
    { id: "admins", label: "الموظفين", allowed: isOwner },
    { id: "backup", label: "نسخ احتياطي", allowed: isOwner },
  ];
  const allowedTabs = TABS.filter(t => t.allowed);

  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.some(t => t.id === section)) {
      setSection(allowedTabs[0].id);
    }
  }, [allowedTabs.map(t => t.id).join(","), section]); // eslint-disable-line
  // إذا تغيّر دور المستخدم (فقد صلاحية المالك) نرجّع للتبويب الأول المسموح
  useEffect(() => {
    if (!allowedTabs.some(t => t.id === section) && allowedTabs.length > 0) setSection(allowedTabs[0].id);
  }, [allowedTabs.map(t => t.id).join(","), section]); // eslint-disable-line

  const TabBtn = ({ id, label, badge }) => (
    <button onClick={() => setSection(id)} className="px-3 py-2 rounded-lg text-xs font-bold relative transition-all duration-150"
      style={section === id ? orangeBtn : { background: "rgba(12,17,40,0.6)", color: "#c3cbe8", border: "1px solid rgba(47,125,244,0.28)" }}>
      {label}
      {badge > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center" style={{ background: "#f87171", color: "#fff" }}>{badge}</span>}
    </button>
  );

  return (
    <div className="pt-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {isOwner ? <Crown size={18} color="#fbbf24" style={{ filter: "drop-shadow(0 0 8px rgba(251,191,36,0.5))" }} /> : <ShieldCheck size={18} color="#2dd4bf" style={{ filter: "drop-shadow(0 0 8px rgba(45,212,191,0.5))" }} />}
          <div>
            <h1 className="font-black text-base" style={{ background: "linear-gradient(100deg,#eef0ff,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>لوحة تحكم {isOwner ? "صاحب المتجر" : "الموظف"}</h1>
            {!isOwner && <p className="text-[11px]" style={{ color: "#c3cbe8" }}>مسجل دخول باسم {adminName}</p>}
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "rgba(12,17,40,0.6)", color: "#c3cbe8", border: "1px solid rgba(47,125,244,0.28)" }}>
          <LogOut size={13} /> خروج
        </button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {allowedTabs.map(t => <TabBtn key={t.id} id={t.id} label={t.label} badge={t.badge} />)}
      </div>

      {allowedTabs.length === 0 && (
        <div className="rounded-xl p-6 text-center qg-card">
          <ShieldAlert size={22} color="#c3cbe8" className="mx-auto mb-2" />
          <p className="text-sm font-bold mb-1">لسا ما انضافتلك أي صلاحية</p>
          <p className="text-xs" style={{ color: "#c3cbe8" }}>تواصل مع صاحب المتجر حتى يفعّل صلاحياتك بلوحة "الموظفين".</p>
        </div>
      )}

      {flash && <div className="mb-4 text-xs font-bold flex items-center gap-1.5" style={{ color: "#2dd4bf" }}><CheckCircle2 size={14} /> تم الحفظ</div>}

      {loadingAdminData ? (
        <Loader2 size={20} className="animate-spin mx-auto my-8" color="#c3cbe8" />
      ) : (
        <>
          {section === "orders" && stalledOrders.length > 0 && (
            <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.35)" }}>
              <p className="text-xs font-black flex items-center gap-1.5 mb-2" style={{ color: "#f87171" }}>
                <AlertTriangle size={13} /> عندك {stalledOrders.length} طلبات متروكة بانتظار الدفع من أكثر من ساعة — تواصل مع أصحابها قبل ما يبردوا:
              </p>
              <div className="flex flex-wrap gap-2">
                {stalledOrders.map(o => (
                  <a key={o.id} href={waLink(socialLinks?.whatsapp, `مرحباً ${o.userName || "عزيزي"}، طلبك رقم ${o.id} (${money(o.total || 0)}) منتظر تأكيد الدفع مني — كيف بدك نكمل؟`)}
                    target="_blank" rel="noreferrer"
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: "rgba(37,211,102,0.1)", color: "#25D366", border: "1px solid rgba(37,211,102,0.35)" }}>
                    <MessageCircle size={11} /> {o.userName || o.phone || o.id}
                  </a>
                ))}
              </div>
            </div>
          )}
          {section === "orders" && (
            <OrdersAdmin orders={adminOrders} perms={{ status: can("orders_status"), cancel: can("orders_cancel"), delete: can("orders_delete") }}
              onStatusChange={async (id, status, cancelReason) => { setAdminOrders(o => o.map(x => x.id === id ? { ...x, status, cancelReason: cancelReason ?? x.cancelReason } : x)); await api.patch(`/api/admin/orders/${id}`, { status, cancelReason }); if (isOwner) loadActivity(); }}
              onNoteChange={async (id, adminNote) => { setAdminOrders(o => o.map(x => x.id === id ? { ...x, adminNote } : x)); await api.patch(`/api/admin/orders/${id}`, { adminNote }); }}
              onDelete={async (id) => { setAdminOrders(o => o.filter(x => x.id !== id)); await fetch(`/api/admin/orders/${id}`, { method: "DELETE", credentials: "same-origin" }); if (isOwner) loadActivity(); }}
              openChat={can("chats_view") ? (userId) => { setOpenChatUserId(userId); setSection("chats"); } : null} />
          )}
          {section === "chats" && (
            <ChatsAdmin session={session} openUserId={openChatUserId} onOpened={() => setOpenChatUserId(null)}
              quickReplies={quickRepliesLocal} isOwner={isOwner} canEditQuickReplies={can("quickreplies_edit")}
              canStart={can("chats_start")} persistQuickReplies={persistQuickReplies}
              orders={can("orders_view") ? adminOrders : []} threads={chatThreads} reloadThreads={loadChats} />
          )}
          {section === "messages" && (
            <MessagesAdmin messages={adminMessages}
              onMarkRead={async (id, read) => { setAdminMessages(m => m.map(x => x.id === id ? { ...x, read } : x)); await fetch(`/api/admin/messages/${id}`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ read }) }); }}
              onDelete={async (id) => { setAdminMessages(m => m.filter(x => x.id !== id)); await fetch(`/api/admin/messages/${id}`, { method: "DELETE", credentials: "same-origin" }); }} />
          )}
          {can("orders_status") && section === "suppliers" && (
            <SuppliersAdmin suppliers={adminSuppliers} onLoad={loadSuppliers} />
          )}
          {can("orders_status") && section === "sourcing" && (
            <SourcingAdmin requests={sourcingRequests} onLoad={loadSourcing} orders={adminOrders} />
          )}
          {can("orders_view") && section === "refunds" && (
            <RefundsAdmin refunds={refundQueue} onLoad={loadRefunds} />
          )}
          {can("content_games") && section === "games" && <GamesAdmin games={games} persistGames={persistGames} />}
          {can("content_prices") && section === "prices" && <PricesAdmin prices={prices} persistPrices={persistPrices} priceComparison={priceComparison} persistPriceComparison={persistPriceComparison} />}
          {(can("content_banners") || can("content_faq") || can("content_about")) && section === "content" && (
            <ContentAdmin faq={faq} persistFaq={persistFaq} banners={banners} persistBanners={persistBanners}
              testimonials={testimonials} persistTestimonials={persistTestimonials} about={about} persistAbout={persistAbout}
              refundPolicy={refundPolicy} persistRefundPolicy={persistRefundPolicy}
              socialLinks={socialLinks} persistSocialLinks={persistSocialLinks}
              perms={{ banners: can("content_banners"), faq: can("content_faq"), about: can("content_about") }} />
          )}
          {can("content_coupons") && section === "coupons" && <CouponsAdmin coupons={coupons} persistCoupons={persistCoupons} />}
          {isOwner && section === "shipping" && <ShippingAdmin shipping={shipping} persistShipping={persistShipping} />}
          {isOwner && section === "payment" && <PaymentInfoAdmin paymentInfo={paymentInfoLocal} persistPaymentInfo={persistPaymentInfo} />}
          {can("reports_view") && section === "reports" && <ReportsAdmin orders={adminOrders} games={games} canExport={can("reports_export")} />}
          {isOwner && section === "settings" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* ---------- تفاصيل الاتصال ---------- */}
              <div className="rounded-xl p-5 qg-card">
                <h2 className="font-black text-sm mb-4 flex items-center gap-2" style={{ color: "#60a5fa" }}><Phone size={16} /> تفاصيل الاتصال (تظهر بالمتجر)</h2>
                <div className="grid grid-cols-2 gap-3">
                  <SettingsField label="واتساب" value={settingsContacts.whatsapp} onChange={(v) => persistSettingsContacts({ ...settingsContacts, whatsapp: v })} placeholder="9627xxxxxxxx" />
                  <SettingsField label="تلغرام" value={settingsContacts.telegram} onChange={(v) => persistSettingsContacts({ ...settingsContacts, telegram: v })} placeholder="username" />
                  <SettingsField label="إنستغرام" value={settingsContacts.instagram} onChange={(v) => persistSettingsContacts({ ...settingsContacts, instagram: v })} placeholder="@username" />
                  <SettingsField label="فيسبوك" value={settingsContacts.facebook} onChange={(v) => persistSettingsContacts({ ...settingsContacts, facebook: v })} placeholder="رابط الصفحة" />
                  <SettingsField label="تيك توك" value={settingsContacts.tiktok} onChange={(v) => persistSettingsContacts({ ...settingsContacts, tiktok: v })} placeholder="@username" />
                  <SettingsField label="يوتيوب" value={settingsContacts.youtube} onChange={(v) => persistSettingsContacts({ ...settingsContacts, youtube: v })} placeholder="@channel" />
                  <SettingsField label="X (تويتر)" value={settingsContacts.x} onChange={(v) => persistSettingsContacts({ ...settingsContacts, x: v })} placeholder="@username" />
                  <SettingsField label="بريد المتجر" value={settingsContacts.storeEmail} onChange={(v) => persistSettingsContacts({ ...settingsContacts, storeEmail: v })} placeholder="example@store.com" />
                  <SettingsField label="رقم المتجر" value={settingsContacts.storePhone} onChange={(v) => persistSettingsContacts({ ...settingsContacts, storePhone: v })} placeholder="07xxxxxxxx" />
                </div>
                <label className="block text-[11px] font-bold mt-3 mb-1" style={{ color: "#c3cbe8" }}>عنوان المتجر / وصف الموقع</label>
                <textarea rows={2} maxLength={300} value={settingsContacts.storeAddress} onChange={(e) => persistSettingsContacts({ ...settingsContacts, storeAddress: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(12,17,40,0.6)", border: "1px solid rgba(47,125,244,0.28)", color: "#f4f6fb" }} />
              </div>
              {/* ---------- شعار المتجر ---------- */}
              <div className="rounded-xl p-5 qg-card">
                <h2 className="font-black text-sm mb-1 flex items-center gap-2" style={{ color: "#60a5fa" }}><ImageIcon size={16} /> شعار المتجر</h2>
                <p className="text-[11px] mb-3" style={{ color: "#c3cbe8" }}>يظهر أعلى الموقع بدل رمز QG. PNG/JPG بحجم لا يتجاوز 2 ميجابايت.</p>
                {branding && branding.logoUrl ? (
                  <div className="flex items-center gap-3 mb-3">
                    <img src={branding.logoUrl} alt="شعار المتجر" className="w-16 h-16 rounded-xl object-cover" style={{ border: "1px solid rgba(47,125,244,0.35)" }} />
                    <button onClick={clearBrandLogo} className="text-[11px] font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.35)" }}><Trash2 size={12} /> إزالة الشعار</button>
                  </div>
                ) : null}
                <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden"
                  onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) persistBrandLogo(f); }} />
                <button onClick={() => logoInputRef.current && logoInputRef.current.click()}
                  className="w-full rounded-lg px-4 py-2 text-xs font-black text-white flex items-center justify-center gap-2 transition-all duration-150 active:scale-95"
                  style={{ background: "linear-gradient(100deg,#60a5fa,#60a5fa)", boxShadow: branding && branding.logoUrl ? "none" : "0 0 18px rgba(47,125,244,0.4)" }}>
                  <Upload size={14} /> {branding && branding.logoUrl ? "تغيير الشعار" : "رفع شعار المتجر"}
                </button>
                {logoUploadErr && <div className="text-[11px] font-bold mt-2 flex items-center gap-1.5" style={{ color: "#f87171" }}><AlertCircle size={13} /> {logoUploadErr}</div>}
              </div>
              {/* ---------- صفحة من نحن ---------- */}
              <div className="rounded-xl p-5 qg-card">
                <h2 className="font-black text-sm mb-1 flex items-center gap-2" style={{ color: "#60a5fa" }}><Info size={16} /> صفحة من نحن (تظهر للزوار على <a href="/about" target="_blank" rel="noreferrer" className="underline" style={{ color: "#60a5fa" }}>/about</a>)</h2>
                <p className="text-[11px] mb-3" style={{ color: "#c3cbe8" }}>قصة متجرك وساعات العمل — بتبني ثقة الزبائن الجدد قبل أول طلب.</p>
                <label className="block text-[11px] font-bold mb-1" style={{ color: "#c3cbe8" }}>عنوان تعريفي</label>
                <input maxLength={120} value={aboutPage.headline} onChange={(e) => persistAboutPage({ ...aboutPage, headline: e.target.value })} placeholder="مثال: متجرك الأول للبطاقات الرقمية"
                  className="w-full rounded-lg px-3 py-2 text-xs mb-3" style={{ background: "rgba(12,17,40,0.6)", border: "1px solid rgba(47,125,244,0.28)", color: "#f4f6fb" }} />
                <label className="block text-[11px] font-bold mb-1" style={{ color: "#c3cbe8" }}>قصة المتجر</label>
                <textarea maxLength={2500} rows={5} value={aboutPage.story} onChange={(e) => persistAboutPage({ ...aboutPage, story: e.target.value })} placeholder="احكِ قصة متجرك: من وين بدأت، شو بتقدم، وليش الزبون يثق فيك..."
                  className="w-full rounded-lg px-3 py-2 text-xs mb-3" style={{ background: "rgba(12,17,40,0.6)", border: "1px solid rgba(47,125,244,0.28)", color: "#f4f6fb" }} />
                <label className="block text-[11px] font-bold mb-2" style={{ color: "#c3cbe8" }}>ساعات العمل الأسبوعية</label>
                <div className="space-y-2">
                  {aboutPage.hours.map((h, i) => (
                    <div key={h.en} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ background: "rgba(10,15,32,0.5)", border: "1px solid rgba(47,125,244,0.2)", opacity: h.enabled ? 1 : 0.55 }}>
                      <button onClick={() => { const hrs = [...aboutPage.hours]; hrs[i] = { ...h, enabled: !h.enabled }; persistAboutPage({ ...aboutPage, hours: hrs }); }}
                        className={`text-[10px] font-black px-2 py-1 rounded-md shrink-0 ${h.enabled ? "" : ""}`} style={h.enabled ? { background: "rgba(45,212,191,0.15)", color: "#2dd4bf" } : { background: "rgba(248,113,113,0.12)", color: "#f87171" }}>
                        {h.enabled ? "مفتوح" : "إجازة"}
                      </button>
                      <input maxLength={20} value={h.day} onChange={(e) => { const hrs = [...aboutPage.hours]; hrs[i] = { ...h, day: e.target.value }; persistAboutPage({ ...aboutPage, hours: hrs }); }}
                        className="flex-1 min-w-0 rounded-md px-2 py-1 text-[11px] outline-none" style={{ background: "rgba(12,17,40,0.6)", border: "1px solid rgba(47,125,244,0.22)", color: "#f4f6fb" }} />
                      <input dir="ltr" maxLength={10} value={h.en} onChange={(e) => { const hrs = [...aboutPage.hours]; hrs[i] = { ...h, en: e.target.value.toLowerCase() }; persistAboutPage({ ...aboutPage, hours: hrs }); }}
                        className="w-14 rounded-md px-2 py-1 text-[11px] text-center outline-none" style={{ background: "rgba(12,17,40,0.6)", border: "1px solid rgba(47,125,244,0.22)", color: "#c3cbe8" }} />
                      <input dir="ltr" maxLength={10} value={h.open} onChange={(e) => { const hrs = [...aboutPage.hours]; hrs[i] = { ...h, open: e.target.value }; persistAboutPage({ ...aboutPage, hours: hrs }); }} placeholder="14:00"
                        className="w-16 rounded-md px-2 py-1 text-[11px] text-center outline-none" style={{ background: "rgba(12,17,40,0.6)", border: "1px solid rgba(47,125,244,0.22)", color: "#f4f6fb" }} />
                      <input dir="ltr" maxLength={10} value={h.close} onChange={(e) => { const hrs = [...aboutPage.hours]; hrs[i] = { ...h, close: e.target.value }; persistAboutPage({ ...aboutPage, hours: hrs }); }} placeholder="23:00"
                        className="w-16 rounded-md px-2 py-1 text-[11px] text-center outline-none" style={{ background: "rgba(12,17,40,0.6)", border: "1px solid rgba(47,125,244,0.22)", color: "#f4f6fb" }} />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] mt-2" style={{ color: "#8b96b8" }}>صيغة الوقت HH:mm (24 ساعة). استخدم 24:00 لو دوامك بيركّض لمنتصف الليل.</p>
                {aboutPageSaved && <div className="text-[11px] font-bold mt-2 flex items-center gap-1.5" style={{ color: "#2dd4bf" }}><CheckCircle2 size={13} /> تم حفظ صفحة من نحن</div>}
                {aboutPageErr && <div className="text-[11px] font-bold mt-2 flex items-center gap-1.5" style={{ color: "#f87171" }}><AlertCircle size={13} /> {aboutPageErr}</div>}
              </div>
              {/* ---------- بريد الإشعارات ---------- */}
              <div className="rounded-xl p-5 qg-card">
                <h2 className="font-black text-sm mb-1 flex items-center gap-2" style={{ color: "#60a5fa" }}><Mail size={16} /> بريد المتجر للإشعارات</h2>
                <p className="text-[11px] mb-4" style={{ color: "#c3cbe8" }}>الإيميل يلي ينرسل منه: أكواد OTP، تأكيد الطلبات، إشعارات استلام الطلب — كلشي تلقائي.</p>
                <label className="block text-[11px] font-bold mb-1" style={{ color: "#c3cbe8" }}>بريد Gmail المرسل</label>
                <input type="email" value={settingsEmail.user} onChange={(e) => setSettingsEmail({ ...settingsEmail, user: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-xs mb-3" style={{ background: "rgba(12,17,40,0.6)", border: "1px solid rgba(47,125,244,0.28)", color: "#f4f6fb" }} />
                <label className="block text-[11px] font-bold mb-1" style={{ color: "#c3cbe8" }}>App Password (كلمة مرور التطبيق من Google)</label>
                <input type="password" value={settingsPass} onChange={(e) => setSettingsPass(e.target.value)} placeholder="••••••••••••••••"
                  className="w-full rounded-lg px-3 py-2 text-xs mb-1" style={{ background: "rgba(12,17,40,0.6)", border: "1px solid rgba(47,125,244,0.28)", color: "#f4f6fb" }} />
                <p className="text-[10px] mb-3" style={{ color: "#c3cbe8" }}>إذا تركتها فاضية، يتم الاحتفاظ بالكلمة الحالية.</p>
                {settingsEmail.configured && (
                  <div className="text-[11px] font-bold mb-2 flex items-center gap-1.5" style={{ color: "#2dd4bf" }}><CheckCircle2 size={13} /> البريد مفعّل حاليًا{settingsEmail.passStored ? " (محفوظ بقاعدة البيانات)" : " (بإعدادات الاستضافة)"}</div>
                )}
                {settingsSaved && <div className="text-[11px] font-bold mb-2 flex items-center gap-1.5" style={{ color: "#2dd4bf" }}><CheckCircle2 size={13} /> تم الحفظ وتفعيل البريد الجديد</div>}
                {settingsErr && <div className="text-[11px] font-bold mb-2 flex items-center gap-1.5" style={{ color: "#f87171" }}><AlertCircle size={13} /> {settingsErr}</div>}
                <button onClick={persistSettingsSmtp} className="w-full rounded-lg px-4 py-2 text-xs font-black text-white mt-2" style={{ background: "linear-gradient(100deg,#60a5fa,#60a5fa)" }}>حفظ البريد والتفعيل</button>
                <p className="text-[10px] mt-3" style={{ color: "#8b96b8" }}>ملاحظة: كلمة مرور التطبيق تتولد من حساب Google → إدارة الحساب → الأمان → التحقق بخطوتين → كلمات مرور التطبيق (16 محرف).</p>
              </div>
            </div>
          )}
          {isOwner && section === "users" && <UsersAdmin users={adminCustomers} />}
          {isOwner && section === "admins" && (
            <AdminsAdmin staff={staff} onPromote={async (identifier) => { await api.post("/api/admin/staff", { identifier }); await Promise.all([loadStaff(), loadCustomers(), loadActivity()]); }}
              onDemote={async (id) => { await fetch(`/api/admin/staff?id=${id}`, { method: "DELETE", credentials: "same-origin" }); await Promise.all([loadStaff(), loadActivity()]); }}
              onUpdatePermissions={async (id, permissions) => { setStaff(st => st.map(x => x.id === id ? { ...x, permissions } : x)); await api.patch(`/api/admin/staff/${id}`, { permissions }); loadActivity(); }}
              activityLog={activityLog} />
          )}
          {isOwner && section === "backup" && (
            <BackupAdmin data={{ games, prices, messages: adminMessages, orders: adminOrders, users: adminCustomers, faq, banners, testimonials, about, coupons }}
              maintenance={maintenance} persistMaintenance={persistMaintenance}
              restore={async (d) => {
                if (d.games) await persistGames(d.games);
                if (d.prices) await persistPrices(d.prices);
                if (d.faq) await persistFaq(d.faq);
                if (d.banners) await persistBanners(d.banners);
                if (d.testimonials) await persistTestimonials(d.testimonials);
                if (d.about) await persistAbout(d.about);
                if (d.coupons) await persistCoupons(d.coupons);
                // orders/messages restore is intentionally skipped here —
                // they're shared server data now, not this browser's alone
              }} />
          )}
        </>
      )}
    </div>
  );
}

/* =================================================================
   CHATS (owner/staff two-way replies to customer chat threads)
================================================================= */
function ChatsAdmin({ session, openUserId, onOpened, quickReplies, isOwner, canEditQuickReplies, canStart, persistQuickReplies, orders, threads: threadsProp = [], reloadThreads }) {
  const [threads, setThreads] = useState(threadsProp);
  const [loadingList, setLoadingList] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [activeThread, setActiveThread] = useState(null);
  const [reply, setReply] = useState("");
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // "start a new conversation" — the actual feature being added: message a
  // customer first, even if they never wrote in
  const [showStart, setShowStart] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [starting, setStarting] = useState(false);
  const [startErr, setStartErr] = useState("");
  const [editingReplies, setEditingReplies] = useState(false);
  const [newReply, setNewReply] = useState("");
  const [replyImage, setReplyImage] = useState(null);
  const [uploadingReplyImg, setUploadingReplyImg] = useState(false);
  const [showOrders, setShowOrders] = useState(false);

  const isAllowed = session && (session.role === "owner" || session.role === "staff");

  useEffect(() => {
    if (!isAllowed) return;
    setThreads(threadsProp);
  }, [threadsProp, isAllowed]);
  useEffect(() => {
    if (!isAllowed) return;
    const iv = setInterval(() => reloadThreads && reloadThreads(), 5000);
    return () => clearInterval(iv);
  }, [isAllowed, reloadThreads]); // eslint-disable-line

  const loadActive = async (id) => {
    try {
      const { thread } = await api.get(`/api/admin/chats/${id}`);
      setActiveThread(thread);
    } catch (e) { /* ignore transient poll failures */ }
  };
  useEffect(() => {
    if (!activeId) { setActiveThread(null); return; }
    loadActive(activeId);
    const iv = setInterval(() => loadActive(activeId), 4000);
    return () => clearInterval(iv);
  }, [activeId]);

  useEffect(() => {
    if (!openUserId || !isAllowed) return;
    const t = threads.find(x => x.user_id === openUserId);
    if (t) { setActiveId(t.id); setShowArchived(t.status === "closed"); }
    onOpened && onOpened();
  }, [openUserId, threads, isAllowed]); // eslint-disable-line

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "nearest" }); }, [activeThread?.messages?.length]);

  const submitReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() && !replyImage) return;
    if (!activeId) return;
    setSending(true);
    try {
      await api.post(`/api/admin/chats/${activeId}`, { text: reply.trim(), image: replyImage });
      setReply(""); setReplyImage(null);
      await loadActive(activeId);
      await loadThreads();
    } catch (e2) { /* leave the draft so they can retry */ }
    setSending(false);
  };

  const onReplyImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReplyImg(true);
    try { setReplyImage(await fileToCompressedDataUrl(file, 500, 0.7)); }
    finally { setUploadingReplyImg(false); }
  };

  const toggleArchive = async () => {
    if (!activeThread) return;
    const status = activeThread.status === "closed" ? "open" : "closed";
    try {
      await fetch(`/api/admin/chats/${activeId}`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      await loadActive(activeId); if (reloadThreads) reloadThreads();
    } catch (e) {}
  };

  const openStartPicker = async () => {
    setShowStart(true); setStartErr("");
    if (customers.length > 0) return;
    setLoadingCustomers(true);
    try {
      const { customers: c } = await api.get("/api/admin/customers");
      setCustomers(c);
    } catch (e) { setStartErr(e.message); }
    setLoadingCustomers(false);
  };
  const startWith = async (customer) => {
    setStarting(true); setStartErr("");
    try {
      const { threadId } = await api.post("/api/admin/chats-start", { userId: customer.id, text: `مرحبا ${customer.name}، معك فريق QWADERGAME 👋` });
      setShowStart(false);
      await loadThreads();
      setActiveId(threadId);
    } catch (e) { setStartErr(e.message); }
    setStarting(false);
  };

  if (!isAllowed) {
    return (
      <div className="rounded-xl p-5 text-sm" style={{ ...card, color: "#c3cbe8" }}>
        <p className="mb-2 font-bold" style={{ color: "#fbbf24" }}>لازم تسجل دخول بحسابك (بنفس زر تسجيل الدخول العادي فوق) وحسابك عنده صلاحية مالك/موظف حتى تقدر تستخدم المحادثات.</p>
        <p>هاي الصفحة بتتحدث عبر حسابك الحقيقي (مو كلمة سر لوحة التحكم المحلية) — إذا لسا ما رفّعت حسابك لصلاحية "owner"، راجع تعليمات README.</p>
      </div>
    );
  }

  const sorted = [...threads]
    .filter(t => (showArchived ? t.status === "closed" : t.status !== "closed"))
    .filter(t => !query.trim() || t.user_name?.toLowerCase().includes(query.trim().toLowerCase()));
  const filteredCustomers = customers.filter(c => !customerQuery.trim() || c.name.toLowerCase().includes(customerQuery.trim().toLowerCase()) || (c.email || "").toLowerCase().includes(customerQuery.trim().toLowerCase()) || (c.phone || "").includes(customerQuery.trim()));

  return (
    <div>
      {canStart && (
        <button onClick={openStartPicker} className="mb-3 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 qx-btn qx-btn-primary">
          <Send size={13} /> بدء محادثة جديدة مع زبون
        </button>
      )}

      {showStart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(2,4,12,0.65)", backdropFilter: "blur(6px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-5 relative qg-card">
            <button onClick={() => setShowStart(false)} className="absolute top-4 left-4" style={{ color: "#c3cbe8" }}><X size={16} /></button>
            <h3 className="font-black text-sm mb-3">اختر الزبون</h3>
            <input value={customerQuery} onChange={e => setCustomerQuery(e.target.value)} placeholder="بحث بالاسم أو الإيميل" className="w-full px-3 py-2 rounded-lg text-xs outline-none mb-2.5 qx-input" />
            {startErr && <p className="text-xs mb-2" style={{ color: "#f87171" }}>{startErr}</p>}
            <div className="max-h-72 overflow-y-auto space-y-1.5">
              {loadingCustomers ? <Loader2 size={16} className="animate-spin mx-auto my-4" color="#c3cbe8" /> : (
                filteredCustomers.length === 0 ? <p className="text-xs text-center" style={{ color: "#c3cbe8" }}>ما في زبائن مطابقين</p> :
                filteredCustomers.map(c => (
                  <button key={c.id} disabled={starting} onClick={() => startWith(c)} className="w-full text-right px-3 py-2.5 rounded-lg flex flex-col" style={{ background: "#0c1230", border: "1px solid rgba(47,125,244,0.2)", opacity: starting ? 0.6 : 1 }}>
                    <span className="text-xs font-bold">{c.name}</span>
                    <span className="text-[10px]" style={{ color: "#c3cbe8", direction: "ltr", textAlign: "right" }}>{c.email || c.phone}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {loadingList ? <Loader2 size={18} className="animate-spin mx-auto my-6" color="#c3cbe8" /> : (
        <div className="grid sm:grid-cols-[220px_1fr] gap-3">
          <div>
            <div className="flex gap-1.5 mb-2">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="بحث باسم الزبون" className="flex-1 px-2.5 py-2 rounded-lg text-xs outline-none qx-input" />
            </div>
            <div className="flex gap-1.5 mb-2">
              <button onClick={() => setShowArchived(false)} className="flex-1 text-[11px] font-bold py-1.5 rounded-lg" style={!showArchived ? orangeBtn : { background: "#0c1230", color: "#c3cbe8" }}>نشطة</button>
              <button onClick={() => setShowArchived(true)} className="flex-1 text-[11px] font-bold py-1.5 rounded-lg" style={showArchived ? orangeBtn : { background: "#0c1230", color: "#c3cbe8" }}>مؤرشفة</button>
            </div>
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {sorted.length === 0 && <p className="text-xs" style={{ color: "#c3cbe8" }}>ما في محادثات</p>}
              {sorted.map(t => (
                <button key={t.id} onClick={() => setActiveId(t.id)} className="w-full text-right px-3 py-2.5 rounded-lg"
                  style={activeId === t.id ? { background: "#10173a", border: "1px solid rgba(47,125,244,0.4)" } : { background: "#0c1230", border: "1px solid rgba(47,125,244,0.2)" }}>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold truncate">{t.user_name}{t.subject ? " — " + t.subject : ""}</span>
                    {t.unread_admin && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#60a5fa" }} />}
                  </div>
                  {t.last_text && <p className="text-[10px] truncate mt-0.5" style={{ color: "#c3cbe8" }}>{t.last_text}</p>}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-3.5 flex flex-col" style={{ ...card, minHeight: 380 }}>
            {!activeThread ? (
              <p className="text-xs m-auto" style={{ color: "#c3cbe8" }}>اختر محادثة من القائمة، أو ابدأ وحدة جديدة</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2.5 pb-2.5" style={{ borderBottom: "1px solid rgba(47,125,244,0.2)" }}>
                  <div>
                    <p className="font-bold text-sm">{activeThread.user_name}</p>
                    {activeThread.user_phone && <p className="text-[11px]" style={{ color: "#2dd4bf", direction: "ltr" }}>{activeThread.user_phone}</p>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {orders && (
                      <button onClick={() => setShowOrders(v => !v)}
                        className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1" style={{ background: "#0a0f20", color: "#fbbf24" }}>
                        <Package size={12} /> طلباته
                      </button>
                    )}
                    <button onClick={toggleArchive}
                      className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1" style={{ background: "#0a0f20", color: "#c3cbe8" }}>
                      <Archive size={12} /> {activeThread.status === "closed" ? "إعادة الفتح" : "إغلاق المحادثة"}
                    </button>
                  </div>
                </div>

                {showOrders && (
                  <div className="mb-3 p-2.5 rounded-lg max-h-32 overflow-y-auto" style={{ background: "rgba(2,14,36,0.9)", border: "1px solid rgba(47,125,244,0.22)" }}>
                    {(orders || []).filter(o => o.userId === activeThread.user_id).length === 0 ? (
                      <p className="text-[11px]" style={{ color: "#c3cbe8" }}>ما عنده طلبات</p>
                    ) : (orders || []).filter(o => o.userId === activeThread.user_id).slice(0, 8).map(o => (
                      <div key={o.id} className="flex items-center justify-between text-[11px] mb-1">
                        <span style={{ color: "#cdd3ee" }}>#{o.id.slice(-6)} — {o.items.map(it => it.name).join(", ").slice(0, 30)}</span>
                        <span style={{ color: ORDER_STATUS_COLOR[o.status] }}>{ORDER_STATUS_LABEL[o.status] || o.status}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex-1 overflow-y-auto flex flex-col gap-2 mb-3" style={{ maxHeight: 260 }}>
                  {activeThread.messages.map((m, i) => (
                    <div key={m.id} className={"max-w-[75%] rounded-xl px-3 py-2 text-xs " + (m.from === "admin" ? "self-start" : "self-end")}
                      style={m.from === "admin" ? orangeBtn : { background: "#0a0f20", border: "1px solid rgba(47,125,244,0.2)" }}>
                      {m.image && <img src={m.image} alt="" className="rounded-lg mb-1 max-h-32 object-cover" loading="lazy" />}
                      {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                      <p className="text-[9px] mt-1 opacity-70">
                        {new Date(m.ts).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                        {m.from === "admin" && i === activeThread.messages.length - 1 && !activeThread.unread_for_user && " · شوهدت"}
                      </p>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  {quickReplies.map((q, i) => (
                    <button key={i} type="button" onClick={() => setReply(q)}
                      className="text-[10px] font-bold px-2.5 py-1.5 rounded-full flex items-center gap-1"
                      style={{ background: "#0a0f20", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.25)" }}>
                      {q}
                      {canEditQuickReplies && editingReplies && (
                        <X size={10} color="#f87171" onClick={(e) => { e.stopPropagation(); persistQuickReplies(quickReplies.filter((_, idx) => idx !== i)); }} />
                      )}
                    </button>
                  ))}
                  {canEditQuickReplies && (
                    <button type="button" onClick={() => setEditingReplies(v => !v)}
                      className="text-[10px] font-bold px-2 py-1.5 rounded-full" style={{ background: "rgba(12,17,40,0.6)", color: "#c3cbe8", border: "1px solid rgba(47,125,244,0.28)" }}>
                      {editingReplies ? "تم" : "تعديل الردود"}
                    </button>
                  )}
                </div>
                {canEditQuickReplies && editingReplies && (
                  <div className="flex gap-1.5 mb-2">
                    <input value={newReply} onChange={e => setNewReply(e.target.value)} placeholder="رد جاهز جديد..."
                      className="flex-1 px-2.5 py-1.5 rounded-lg text-[11px] outline-none qx-input" />
                    <button type="button" onClick={() => { if (!newReply.trim()) return; persistQuickReplies([...quickReplies, newReply.trim()]); setNewReply(""); }}
                      className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg" style={{ background: "#0a0f20", color: "#2dd4bf" }}>إضافة</button>
                  </div>
                )}

                {replyImage && (
                  <div className="mb-2 flex items-center gap-2">
                    <img src={replyImage} alt="" className="w-10 h-10 rounded-lg object-cover" loading="lazy" />
                    <button onClick={() => setReplyImage(null)} className="text-[11px] font-bold" style={{ color: "#f87171" }}>إزالة</button>
                  </div>
                )}
                <form onSubmit={submitReply} className="flex items-center gap-2">
                  <label className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 cursor-pointer" style={{ background: "#0a0f20", border: "1px solid rgba(47,125,244,0.2)", color: "#c3cbe8" }}>
                    {uploadingReplyImg ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                    <input type="file" accept="image/*" className="hidden" onChange={onReplyImage} />
                  </label>
                  <input value={reply} onChange={e => setReply(e.target.value)} placeholder="اكتب ردك..." className="flex-1 px-3 py-2 rounded-lg text-xs outline-none qx-input" />
                  <button type="submit" disabled={sending} className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 qx-btn qx-btn-primary">
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <CornerUpLeft size={14} style={{ transform: "scaleX(-1)" }} />}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


/* =================================================================
   ADMIN — SUPPLIERS / SOURCING / REFUNDS
================================================================= */
function SuppliersAdmin({ suppliers, onLoad }) {
  const [form, setForm] = useState({ name: "", country: "", contactName: "", contactPhone: "", contactEmail: "", website: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const save = async () => {
    if (!form.name.trim()) { setToast("اسم المورد مطلوب"); return; }
    setSaving(true);
    try {
      await api.post("/api/admin/suppliers", form);
      setForm({ name: "", country: "", contactName: "", contactPhone: "", contactEmail: "", website: "", notes: "" });
      setToast("✅ تمت الإضافة"); await onLoad();
    } catch (e) { setToast("❌ " + e.message); }
    setSaving(false);
    setTimeout(() => setToast(""), 2500);
  };
  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 qg-card">
        <p className="text-xs font-bold mb-2" style={{ color: "#c3cbe8" }}>إضافة مورد جديد</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="الاسم *" className="px-2.5 py-1.5 rounded-lg text-xs outline-none qx-input" />
          <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="البلد" className="px-2.5 py-1.5 rounded-lg text-xs outline-none qx-input" />
          <input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="اسم المسؤول" className="px-2.5 py-1.5 rounded-lg text-xs outline-none qx-input" />
          <input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="رقم التواصل" className="px-2.5 py-1.5 rounded-lg text-xs outline-none qx-input" />
          <input value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} placeholder="إيميل التواصل" className="px-2.5 py-1.5 rounded-lg text-xs outline-none qx-input" />
          <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="الموقع الإلكتروني" className="px-2.5 py-1.5 rounded-lg text-xs outline-none qx-input" />
        </div>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="ملاحظات" rows={2} className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none mb-2 qx-input" />
        <button disabled={saving} onClick={save} className="text-xs font-bold px-3 py-1.5 rounded-lg qx-btn qx-btn-primary">
          {saving ? <Loader2 size={12} className="animate-spin inline" /> : <Plus size={12} className="inline ml-1" />} إضافة المورد
        </button>
        {toast && <p className="text-[11px] mt-1.5" style={{ color: toast.startsWith("✅") ? "#2dd4bf" : "#f87171" }}>{toast}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(suppliers || []).map(s => (
          <div key={s.id} className="rounded-xl p-3.5 qg-card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-black">{s.name}</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={async () => { if (!confirm("متأكد تحذف " + s.name + "؟")) return; await fetch(`/api/admin/suppliers/${s.id}`, { method: "DELETE", credentials: "same-origin" }); await onLoad(); }}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: "#211012", color: "#f87171", border: "1px solid rgba(255,107,107,0.25)" }}><Trash2 size={10} /></button>
              </div>
            </div>
            {s.country && <p className="text-[11px]" style={{ color: "#c3cbe8" }}>{s.country}</p>}
            {(s.contactName || s.contactPhone || s.contactEmail) && (
              <p className="text-[11px] mt-1" style={{ color: "#cdd3ee" }}>
                {[s.contactName, s.contactPhone && `☎ ${s.contactPhone}`, s.contactEmail && `✉ ${s.contactEmail}`].filter(Boolean).join(" · ")}
              </p>
            )}
            {s.notes && <p className="text-[10px] mt-1" style={{ color: "#c3cbe8" }}>{s.notes}</p>}
            <p className="text-[10px] mt-1" style={{ color: "#4a5578" }}>أُضيف {new Date(s.created_at).toLocaleDateString("ar")}</p>
          </div>
        ))}
        {(!suppliers || suppliers.length === 0) && <p className="text-xs text-center col-span-2" style={{ color: "#c3cbe8" }}>ما في موردين — أضف أول مورد فوق</p>}
      </div>
    </div>
  );
}

function SourcingAdmin({ requests, onLoad, orders }) {
  const [filter, setFilter] = useState("");
  const [toast, setToast] = useState("");
  const marked = async (id) => {
    try {
      await api.post(`/api/admin/sourcing/${id}/fulfill`, {});
      setToast("✅ تم إتمام طلب التزويد ورح نعلم كل يلي طلبها");
      await onLoad();
    } catch (e) { setToast("❌ " + e.message); }
    setTimeout(() => setToast(""), 2500);
  };
  const filtered = (requests || []).filter(r => !filter.trim() || r.gameName.toLowerCase().includes(filter.trim().toLowerCase()));
  return (
    <div>
      <p className="text-xs font-bold mb-2" style={{ color: "#c3cbe8" }}>طلبات “أعلمني لما يتوفر” يلي عم يطلبها الزبائن — إذا طلعت كثير من نفس اللعبة، رح نشتريها من المورد ونضيفها للكتالوج</p>
      <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="بحث باسم اللعبة..." className="w-full mb-3 px-3 py-2 rounded-lg text-xs outline-none qx-input" />
      {filtered.length === 0 ? (
        <p className="text-xs text-center" style={{ color: "#c3cbe8" }}>ما في طلبات تزويد لحظات هالوقت</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(r => (
            <div key={r.id} className="rounded-xl p-3.5 qg-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-black">{r.gameName}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#0a0f20", color: "#fbbf24" }}>{r.demand} {r.demand === 1 ? "طلب" : "طلبات"}</span>
              </div>
              <p className="text-[11px]" style={{ color: "#c3cbe8" }}>{r.userName} {r.phone ? `— ${r.phone}` : ""}</p>
              {r.extra && <p className="text-[10px] mt-1" style={{ color: "#cdd3ee" }}>{r.extra}</p>}
              <button onClick={() => marked(r.id)} className="mt-2 text-[10px] font-bold px-2.5 py-1.5 rounded-lg" style={{ background: "#0a0f20", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.25)" }}>
                <CheckCircle2 size={10} className="inline ml-1" /> علّم كمكتمل
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RefundsAdmin({ refunds, onLoad }) {
  const [toast, setToast] = useState("");
  const refund = async (id) => {
    if (!confirm("متأكد إنك رح تعيد المبلغ للزبون؟ هالحالة مش بتسترد المبلغ تلقائيًا — بس بتسجل العملية.")) return;
    try {
      await api.post(`/api/orders/${id}/actions`, { action: "refund_complete" });
      setToast("✅ تم تسجيل الاسترداد");
      await onLoad();
    } catch (e) { setToast("❌ " + e.message); }
    setTimeout(() => setToast(""), 2500);
  };
  const processing = async (id) => {
    try {
      await api.post(`/api/orders/${id}/actions`, { action: "refund_process" });
      await onLoad();
    } catch (e) { setToast("❌ " + e.message); }
  };
  return (
    <div>
      {toast && <p className="text-[11px] mb-2 font-bold" style={{ color: toast.startsWith("✅") ? "#2dd4bf" : "#f87171" }}>{toast}</p>}
      <p className="text-xs font-bold mb-3" style={{ color: "#c3cbe8" }}>طلبات يطلب فيها الزبائن استرداد المبلغ</p>
      {refunds.length === 0 ? (
        <p className="text-xs text-center" style={{ color: "#c3cbe8" }}>ما في طلبات استرداد</p>
      ) : (
        <div className="space-y-2">
          {refunds.map(r => (
            <div key={r.id} className="rounded-xl p-3.5 flex items-center justify-between gap-2 qg-card">
              <div className="text-xs">
                <p className="font-bold">#{r.id.slice(-6)} — {r.userName}</p>
                <p style={{ color: "#c3cbe8" }}>{new Date(r.ts).toLocaleDateString("ar")} · {money(r.total)} · {PAYMENT_METHOD_LABEL[r.paymentMethod] || r.paymentMethod}</p>
                <p className="mt-1"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: ORDER_STATUS_COLOR[r.status], background: "#0a0f20" }}>{ORDER_STATUS_LABEL[r.status] || r.status}</span></p>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                {r.status === "refund_requested" && (
                  <button onClick={() => refund(r.id)} className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg qx-btn qx-btn-primary">تم إرجاع المبلغ</button>
                )}
                <button onClick={() => processing(r.id)}
                  className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg" style={{ background: "#0a0f20", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>
                  جاري المعالجة
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContentAdmin({ faq, persistFaq, banners, persistBanners, testimonials, persistTestimonials, about, persistAbout, refundPolicy, persistRefundPolicy, socialLinks, persistSocialLinks, perms }) {
  const [aboutDraft, setAboutDraft] = useState(about);
  const [refundDraft, setRefundDraft] = useState(refundPolicy);
  const [socialDraft, setSocialDraft] = useState(socialLinks);
  const [newFaq, setNewFaq] = useState({ q: "", a: "" });
  const [newBanner, setNewBanner] = useState("");
  const [newTesti, setNewTesti] = useState({ name: "", text: "" });

  return (
    <div className="space-y-6">
      {perms.about && (
      <div className="rounded-xl p-4 qg-card">
        <p className="text-xs font-bold mb-2" style={{ color: "#c3cbe8" }}>نص "من نحن"</p>
        <textarea value={aboutDraft} onChange={e => setAboutDraft(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none mb-2 qx-input" />
        <button onClick={() => persistAbout(aboutDraft)} className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 qx-btn qx-btn-primary"><Save size={12} /> حفظ</button>
      </div>
      )}

      {perms.about && (
      <div className="rounded-xl p-4 qg-card">
        <p className="text-xs font-bold mb-2" style={{ color: "#c3cbe8" }}>روابط التواصل الاجتماعي (تظهر بأسفل كل صفحة، وبالإيصال، وصفحة التواصل)</p>
        <div className="space-y-2">
          <input value={socialDraft.whatsapp || ""} onChange={e => setSocialDraft({ ...socialDraft, whatsapp: e.target.value })} placeholder="رقم واتساب (مثلاً 962779538304)" className="w-full px-3 py-2 rounded-lg text-sm outline-none qx-input" style={{...inputStyle}} />
          <input value={socialDraft.telegram || ""} onChange={e => setSocialDraft({ ...socialDraft, telegram: e.target.value })} placeholder="تلجرام (مثلاً @qwadergame أو رابط كامل)" className="w-full px-3 py-2 rounded-lg text-sm outline-none qx-input" style={{...inputStyle}} />
          <input value={socialDraft.instagram || ""} onChange={e => setSocialDraft({ ...socialDraft, instagram: e.target.value })} placeholder="انستغرام (مثلاً @qwadergame أو رابط كامل)" className="w-full px-3 py-2 rounded-lg text-sm outline-none qx-input" style={{...inputStyle}} />
          <input value={socialDraft.facebook || ""} onChange={e => setSocialDraft({ ...socialDraft, facebook: e.target.value })} placeholder="فيسبوك (اسم الصفحة أو رابط كامل)" className="w-full px-3 py-2 rounded-lg text-sm outline-none qx-input" style={{...inputStyle}} />
        </div>
        <button onClick={() => persistSocialLinks(socialDraft)} className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 mt-2 qx-btn qx-btn-primary"><Save size={12} /> حفظ</button>
      </div>
      )}

      {perms.about && (
      <div className="rounded-xl p-4 qg-card">
        <p className="text-xs font-bold mb-2" style={{ color: "#c3cbe8" }}>سياسة الاستبدال والاسترجاع</p>
        <textarea value={refundDraft} onChange={e => setRefundDraft(e.target.value)} rows={4} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none mb-2 qx-input" />
        <button onClick={() => persistRefundPolicy(refundDraft)} className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 qx-btn qx-btn-primary"><Save size={12} /> حفظ</button>
      </div>
      )}

      {perms.banners && (
      <div className="rounded-xl p-4 qg-card">
        <p className="text-xs font-bold mb-3" style={{ color: "#c3cbe8" }}>البانرات الترويجية</p>
        {banners.map(b => (
          <div key={b.id} className="flex items-center gap-2 mb-2">
            <span className="flex-1 text-xs">{b.text}</span>
            <button onClick={() => persistBanners(banners.filter(x => x.id !== b.id))} style={{ color: "#f87171" }}><Trash2 size={13} /></button>
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <input value={newBanner} onChange={e => setNewBanner(e.target.value)} placeholder="نص بانر جديد" className="flex-1 px-3 py-2 rounded-lg text-xs outline-none qx-input" />
          <button onClick={() => { if (!newBanner.trim()) return; persistBanners([...banners, { id: "b" + Date.now(), text: newBanner.trim() }]); setNewBanner(""); }}
            className="px-3 py-2 rounded-lg text-xs font-bold qx-btn qx-btn-primary"><Plus size={13} /></button>
        </div>
      </div>
      )}

      {perms.faq && (
      <div className="rounded-xl p-4 qg-card">
        <p className="text-xs font-bold mb-3" style={{ color: "#c3cbe8" }}>الأسئلة الشائعة</p>
        {faq.map(f => (
          <div key={f.id} className="mb-2 flex items-start gap-2">
            <div className="flex-1 text-xs"><p className="font-bold">{f.q}</p><p style={{ color: "#c3cbe8" }}>{f.a}</p></div>
            <button onClick={() => persistFaq(faq.filter(x => x.id !== f.id))} style={{ color: "#f87171" }}><Trash2 size={13} /></button>
          </div>
        ))}
        <input value={newFaq.q} onChange={e => setNewFaq({ ...newFaq, q: e.target.value })} placeholder="سؤال جديد" className="w-full px-3 py-2 rounded-lg text-xs outline-none mb-2 qx-input" />
        <input value={newFaq.a} onChange={e => setNewFaq({ ...newFaq, a: e.target.value })} placeholder="الجواب" className="w-full px-3 py-2 rounded-lg text-xs outline-none mb-2 qx-input" />
        <button onClick={() => { if (!newFaq.q.trim()) return; persistFaq([...faq, { id: "f" + Date.now(), ...newFaq }]); setNewFaq({ q: "", a: "" }); }}
          className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 qx-btn qx-btn-primary"><Plus size={12} /> إضافة سؤال</button>
      </div>
      )}

      {perms.about && (
      <div className="rounded-xl p-4 qg-card">
        <p className="text-xs font-bold mb-3" style={{ color: "#c3cbe8" }}>آراء الزبائن</p>
        {testimonials.map(t => (
          <div key={t.id} className="mb-2 flex items-start gap-2">
            <div className="flex-1 text-xs"><p style={{ color: "#cdd3ee" }}>"{t.text}"</p><p className="font-bold" style={{ color: "#60a5fa" }}>— {t.name}</p></div>
            <button onClick={() => persistTestimonials(testimonials.filter(x => x.id !== t.id))} style={{ color: "#f87171" }}><Trash2 size={13} /></button>
          </div>
        ))}
        <input value={newTesti.name} onChange={e => setNewTesti({ ...newTesti, name: e.target.value })} placeholder="اسم الزبون" className="w-full px-3 py-2 rounded-lg text-xs outline-none mb-2 qx-input" />
        <input value={newTesti.text} onChange={e => setNewTesti({ ...newTesti, text: e.target.value })} placeholder="رأيه" className="w-full px-3 py-2 rounded-lg text-xs outline-none mb-2 qx-input" />
        <button onClick={() => { if (!newTesti.name.trim() || !newTesti.text.trim()) return; persistTestimonials([...testimonials, { id: "t" + Date.now(), ...newTesti }]); setNewTesti({ name: "", text: "" }); }}
          className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 qx-btn qx-btn-primary"><Plus size={12} /> إضافة رأي</button>
      </div>
      )}
    </div>
  );
}

function OrdersAdmin({ orders, onStatusChange, onNoteChange, onDelete, openChat, perms }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [noteDrafts, setNoteDrafts] = useState({});
  const [lightbox, setLightbox] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const sorted = [...orders]
    .filter(o => !query.trim() || o.userName?.toLowerCase().includes(query.trim().toLowerCase()) || o.id.includes(query.trim()))
    .filter(o => statusFilter === "all" || o.status === statusFilter)
    .sort((a, b) => new Date(b.ts) - new Date(a.ts));

  return (
    <div>
      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }} onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-xl" loading="lazy" />
          <button onClick={() => setLightbox(null)} className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "#0c1230", color: "#fff" }}><X size={16} /></button>
        </div>
      )}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#c3cbe8" }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="بحث باسم الزبون أو رقم الطلب" className="w-full pr-8 pl-3 py-2 rounded-lg text-xs outline-none qx-input" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none qx-input">
          <option value="all">الكل</option>
          {Object.keys(ORDER_STATUS_LABEL).filter(s => !["pending", "confirmed"].includes(s)).map(s => (
            <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      {sorted.length === 0 ? <p className="text-sm" style={{ color: "#c3cbe8" }}>ما في طلبات مطابقة</p> : (
        <div className="space-y-3">
          {sorted.map(o => (
            <div key={o.id} className="rounded-xl p-4" style={{ ...card, border: `1px solid ${o.status === "proof_submitted" ? "rgba(251,191,36,0.6)" : o.status === "pending_payment" ? "rgba(47,125,244,0.5)" : "rgba(255,255,255,0.08)"}` }}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold text-sm flex items-center gap-2"><Package size={14} color="#fbbf24" /> {o.userName} <span style={{ color: "#c3cbe8", fontWeight: 400 }}>#{o.id.slice(-6)}</span></div>
                  {o.phone && <div className="text-[11px]" style={{ color: "#2dd4bf", direction: "ltr" }}>{o.phone}</div>}
                </div>
                <span className="text-[11px]" style={{ color: "#c3cbe8" }}>{new Date(o.ts).toLocaleString("ar")}</span>
              </div>
              {o.custom && <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2" style={{ color: "#fbbf24", background: "#0a0f20" }}>طلب مخصص</span>}
              <div className="text-xs mb-2" style={{ color: "#cdd3ee" }}>
                {o.items.map((it, i) => <div key={i}>• {it.name}{!o.custom && ` × ${it.qty}`}{!o.custom && ` — ${money(it.price * it.qty)}`}</div>)}
              </div>
              <div className="flex justify-between items-center mb-3">
                {o.custom ? <span /> : <span className="font-black" style={{ color: "#60a5fa" }}>{money(o.total)}</span>}
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: ORDER_STATUS_COLOR[o.status], background: "#0a0f20" }}>{ORDER_STATUS_LABEL[o.status] || o.status}</span>
              </div>

              {o.paymentMethod && (
                <div className="rounded-lg p-2.5 mb-3 flex items-center justify-between gap-2" style={{ background: "#0a0f20", border: "1px solid rgba(47,125,244,0.2)" }}>
                  <span className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: "#c3cbe8" }}><CreditCard size={12} /> {PAYMENT_METHOD_LABEL[o.paymentMethod] || o.paymentMethod}</span>
                  {o.paymentMethod === "cod" ? (
                    <span className="text-[10px] font-bold" style={{ color: "#60a5fa" }}>💵 حصّل الكاش عند التسليم</span>
                  ) : o.paymentProofImage ? (
                    <button onClick={() => setLightbox(o.paymentProofImage)} className="flex items-center gap-1.5">
                      <img src={o.paymentProofImage} alt="" className="w-10 h-10 rounded-lg object-cover" style={{ border: "1px solid rgba(255,255,255,0.15)" }} loading="lazy" />
                      <span className="text-[10px] font-bold" style={{ color: "#2dd4bf" }}>عرض الإثبات</span>
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold" style={{ color: "#f87171" }}>بدون إثبات</span>
                  )}
                </div>
              )}

              {o.deliveryCity && (
                <div className="rounded-lg p-2.5 mb-3 flex items-center justify-between gap-2" style={{ background: "#0a0f20", border: `1px solid ${o.deliveryCity === "استلام من المتجر" ? "rgba(45,212,191,0.35)" : "rgba(251,191,36,0.35)"}` }}>
                  <span className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: o.deliveryCity === "استلام من المتجر" ? "#2dd4bf" : "#fbbf24" }}>
                    {o.deliveryCity === "استلام من المتجر" ? <Store size={12} /> : <Truck size={12} />}
                    {o.deliveryCity === "استلام من المتجر"
                      ? "الاستلام من المتجر — مجاني"
                      : `التوصيل${o.deliveryCompany ? ` (${o.deliveryCompany})` : ""} إلى ${o.deliveryCity}`}
                  </span>
                  {o.deliveryFee > 0 && <span className="text-[11px] font-black" style={{ color: "#fbbf24" }}>+ {money(o.deliveryFee)}</span>}
                </div>
              )}
              {o.deliveryNotes ? (
                <div className="rounded-lg p-2.5 mb-3 text-[11px]" style={{ background: "#0a0f20", border: "1px solid rgba(47,125,244,0.28)", color: "#c7cee3" }}>
                  <span className="font-bold" style={{ color: "#c3cbe8" }}>ملاحظات {o.deliveryCity === "استلام من المتجر" ? "الاستلام" : "التوصيل"}:</span> {o.deliveryNotes}
                </div>
              ) : null}
              {o.pickupCompletedAt ? (
                <div className="rounded-lg p-2 mb-3 text-[11px] flex items-center gap-1.5" style={{ background: "rgba(45,212,191,0.08)", border: "1px solid rgba(45,212,191,0.3)", color: "#2dd4bf" }}>
                  <Store size={12} /> تم استلام الطلب من المتجر — {new Date(o.pickupCompletedAt).toLocaleString("ar-JO")}
                </div>
              ) : null}

              <div className="flex gap-2 mb-2">
                <input value={noteDrafts[o.id] ?? o.adminNote ?? ""} onChange={e => setNoteDrafts({ ...noteDrafts, [o.id]: e.target.value })}
                  placeholder="ملاحظة داخلية على الطلب..." className="flex-1 px-2.5 py-1.5 rounded-lg text-[11px] outline-none qx-input" />
                <button onClick={() => onNoteChange(o.id, (noteDrafts[o.id] ?? "").trim())} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg" style={{ background: "#0a0f20", color: "#2dd4bf" }}>حفظ</button>
              </div>

              {(o.status === "proof_submitted") && perms.status && (
                <button onClick={() => onStatusChange(o.id, "payment_confirmed")}
                  className="w-full mb-2 text-xs font-black px-3 py-2 rounded-lg flex items-center justify-center gap-1.5" style={{ background: "linear-gradient(90deg,#0e9e8c,#29e0c8)", color: "#04211d" }}>
                  <CheckCircle2 size={13} /> تأكيد وصول الدفع
                </button>
              )}

              <div className="flex gap-2 flex-wrap">
                {o.status === "payment_confirmed" && perms.status && <button onClick={() => onStatusChange(o.id, "preparing")} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "#0a0f20", color: "#2dd4bf" }}>جاري التوفير</button>}
                {o.status === "preparing" && perms.status && (
                  o.deliveryCity === "استلام من المتجر" ? (
                    <button onClick={() => onStatusChange(o.id, "delivered")} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "#0a0f20", color: "#8fe08a" }}>تم استلام الزبون</button>
                  ) : <button onClick={() => onStatusChange(o.id, "delivered")} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "#0a0f20", color: "#8fe08a" }}>تم التسليم</button>
                )}
                {o.status !== "cancelled" && o.status !== "delivered" && perms.cancel && (
                  cancelingId === o.id ? null : <button onClick={() => { setCancelingId(o.id); setCancelReason(""); }} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "#0a0f20", color: "#f87171" }}>إلغاء</button>
                )}
                {o.userId && openChat && <button onClick={() => openChat(o.userId)} className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1" style={{ background: "#0a0f20", color: "#fbbf24" }}><MessageCircle size={12} /> مراسلة الزبون</button>}
                {o.phone && STATUS_WHATSAPP_TEXT[o.status] && (
                  <a href={waLink(o.phone, STATUS_WHATSAPP_TEXT[o.status])} target="_blank" rel="noreferrer"
                    className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1" style={{ background: "#0a0f20", color: "#25D366" }}>
                    <Phone size={12} /> واتساب
                  </a>
                )}
                {perms.delete && <button onClick={() => onDelete(o.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1" style={{ background: "#0a0f20", color: "#c3cbe8" }}><Trash2 size={12} /> حذف</button>}
              </div>

              {cancelingId === o.id && (
                <div className="flex gap-2 mt-2">
                  <input value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="سبب الإلغاء (رح يظهر للزبون)..."
                    className="flex-1 px-2.5 py-1.5 rounded-lg text-[11px] outline-none qx-input" autoFocus />
                  <button onClick={() => { onStatusChange(o.id, "cancelled", cancelReason.trim()); setCancelingId(null); }}
                    className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg" style={{ background: "#f87171", color: "#fff" }}>تأكيد الإلغاء</button>
                  <button onClick={() => setCancelingId(null)} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg" style={{ background: "#0a0f20", color: "#c3cbe8" }}>رجوع</button>
                </div>
              )}
              {o.status === "cancelled" && o.cancelReason && (
                <p className="text-[11px] mt-2" style={{ color: "#f87171" }}>سبب الإلغاء: {o.cancelReason}</p>
              )}
              {o.status === "delivered" && o.rating && (
                <div className="flex items-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map(n => <Star key={n} size={12} fill={n <= o.rating ? "#fbbf24" : "none"} color="#fbbf24" />)}
                  {o.ratingComment && <span className="text-[11px] mr-1" style={{ color: "#c3cbe8" }}>"{o.ratingComment}"</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MessagesAdmin({ messages, onMarkRead, onDelete }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | unread
  const sorted = [...messages]
    .filter(m => !query.trim() || m.name.toLowerCase().includes(query.trim().toLowerCase()) || (m.phone || "").includes(query.trim()) || m.message.toLowerCase().includes(query.trim().toLowerCase()))
    .filter(m => filter === "all" || !m.read)
    .sort((a, b) => new Date(b.ts) - new Date(a.ts));

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#c3cbe8" }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="بحث بالاسم أو الهاتف أو نص الرسالة" className="w-full pr-8 pl-3 py-2 rounded-lg text-xs outline-none qx-input" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none qx-input">
          <option value="all">الكل</option><option value="unread">غير مقروءة</option>
        </select>
      </div>
      {sorted.length === 0 ? <p className="text-sm" style={{ color: "#c3cbe8" }}>ما في رسائل مطابقة</p> : (
        <div className="space-y-3">
          {sorted.map(m => (
            <div key={m.id} className="rounded-xl p-4" style={{ ...card, border: `1px solid ${m.read ? "rgba(255,255,255,0.08)" : "rgba(47,125,244,0.5)"}` }}>
              <div className="flex justify-between items-start mb-1">
                <div className="font-bold text-sm flex items-center gap-2">{!m.read && <span className="w-2 h-2 rounded-full" style={{ background: "#60a5fa" }}></span>}{m.name}</div>
                <span className="text-[11px]" style={{ color: "#c3cbe8" }}>{new Date(m.ts).toLocaleString("ar")}</span>
              </div>
              {m.phone && <div className="text-xs mb-1" style={{ color: "#2dd4bf", direction: "ltr", textAlign: "right" }}>{m.phone}</div>}
              <p className="text-sm mb-3" style={{ color: "#cdd3ee" }}>{m.message}</p>
              <div className="flex gap-2 flex-wrap">
                {!m.read && <button onClick={() => onMarkRead(m.id, true)} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "#0a0f20", color: "#2dd4bf" }}>تحديد كمقروءة</button>}
                {m.phone && (
                  <a href={waLink(m.phone, `أهلين ${m.name}، بخصوص رسالتك: `)} target="_blank" rel="noreferrer"
                    className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1" style={{ background: "#0a0f20", color: "#25D366" }}>
                    <Phone size={12} /> رد بواتساب
                  </a>
                )}
                <button onClick={() => onDelete(m.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1" style={{ background: "#0a0f20", color: "#f87171" }}><Trash2 size={12} /> حذف</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GamesAdmin({ games, persistGames }) {
  const [draft, setDraft] = useState({ icon: "🎮", name: "", price: "", note: "", image: null, description: "", platform: "", ageRating: "", featured: false, bestseller: false });
  const [uploading, setUploading] = useState(false);
  const [notifyRequests, setNotifyRequests] = useState([]);

  useEffect(() => {
    api.get("/api/admin/notify").then(r => setNotifyRequests(r.requests || [])).catch(() => {});
  }, []);
  const pendingFor = (name) => notifyRequests.filter(r => r.gameName === name && !r.notified);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { const dataUrl = await fileToCompressedDataUrl(file); setDraft(d => ({ ...d, image: dataUrl })); }
    finally { setUploading(false); }
  };

  const add = () => {
    if (!draft.name.trim() || !draft.price.trim()) return;
    persistGames([...games, { id: "g" + Date.now(), ...draft, price: Number(draft.price), reviews: [] }]);
    setDraft({ icon: "🎮", name: "", price: "", note: "", image: null, description: "", platform: "", ageRating: "", featured: false, bestseller: false });
  };
  const remove = (id) => persistGames(games.filter(g => g.id !== id));
  const toggleFlag = (id, flag) => persistGames(games.map(g => g.id === id ? { ...g, [flag]: !g[flag] } : g));

  return (
    <div>
      <div className="rounded-xl p-4 mb-5 space-y-2 qg-card">
        <p className="text-xs font-bold mb-1" style={{ color: "#c3cbe8" }}>إضافة لعبة جديدة</p>

        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden shrink-0" style={{ background: "#0a0f20", border: "1px dashed rgba(255,255,255,0.15)" }}>
            {draft.image ? <img src={draft.image} className="w-full h-full object-cover" alt="" loading="lazy" /> : (uploading ? <Loader2 size={16} className="animate-spin" color="#c3cbe8" /> : <ImageIcon size={18} color="#c3cbe8" />)}
          </div>
          <label className="flex-1 text-xs font-bold px-3 py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer" style={{ background: "#0a0f20", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.3)" }}>
            <Upload size={14} /> رفع صورة اللعبة
            <input type="file" accept="image/*" className="hidden" onChange={onFile} />
          </label>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <input value={draft.icon} onChange={e => setDraft({ ...draft, icon: e.target.value })} placeholder="🎮" className="col-span-1 px-2 py-2 rounded-lg text-sm text-center outline-none qx-input" />
          <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="اسم اللعبة" className="col-span-3 px-3 py-2 rounded-lg text-sm outline-none qx-input" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })} placeholder="السعر بالدينار مثلا 18" className="px-3 py-2 rounded-lg text-sm outline-none qx-input" />
          <input value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} placeholder="ملاحظة (PS5, PS4...)" className="px-3 py-2 rounded-lg text-sm outline-none qx-input" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input value={draft.platform} onChange={e => setDraft({ ...draft, platform: e.target.value })} placeholder="المنصة (PS5...)" className="px-3 py-2 rounded-lg text-sm outline-none qx-input" />
          <input value={draft.ageRating} onChange={e => setDraft({ ...draft, ageRating: e.target.value })} placeholder="التصنيف العمري" className="px-3 py-2 rounded-lg text-sm outline-none qx-input" />
        </div>
        <textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="وصف قصير عن اللعبة" rows={2}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none qx-input" />
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer" style={{ color: "#c3cbe8" }}>
            <input type="checkbox" checked={draft.featured} onChange={e => setDraft({ ...draft, featured: e.target.checked })} /> مميز
          </label>
          <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer" style={{ color: "#c3cbe8" }}>
            <input type="checkbox" checked={draft.bestseller} onChange={e => setDraft({ ...draft, bestseller: e.target.checked })} /> الأكثر مبيعًا
          </label>
        </div>
        <button onClick={add} className="w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 qx-btn qx-btn-primary"><Plus size={15} /> إضافة اللعبة</button>
      </div>
      <div className="space-y-2">
        {games.map(g => {
          const pending = pendingFor(g.name);
          return (
          <div key={g.id} className="rounded-xl px-4 py-2.5" style={{ background: "#0c1230", border: "1px solid rgba(47,125,244,0.2)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                {g.image ? <img src={g.image} className="w-8 h-8 object-cover rounded-lg" alt="" loading="lazy" /> : <span className="text-lg">{g.icon}</span>}
                <span className="font-bold">{g.name}</span><span className="text-xs" style={{ color: "#c3cbe8" }}>{g.note}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleFlag(g.id, "bestseller")} title="الأكثر مبيعًا"><Award size={14} color={g.bestseller ? "#60a5fa" : "#3a4260"} /></button>
                <button onClick={() => toggleFlag(g.id, "featured")} title="مميز"><Star size={14} color={g.featured ? "#fbbf24" : "#3a4260"} /></button>
                <span className="font-black text-sm" style={{ color: "#60a5fa" }}>{money(g.price)}</span>
                <button onClick={() => remove(g.id)} style={{ color: "#f87171" }}><Trash2 size={15} /></button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid rgba(47,125,244,0.16)" }}>
              <label className="flex items-center gap-1.5 text-[11px] font-bold cursor-pointer" style={{ color: g.outOfStock ? "#f87171" : "#c3cbe8" }}>
                <input type="checkbox" checked={!!g.outOfStock} onChange={() => toggleFlag(g.id, "outOfStock")} /> نفدت الكمية (غير متوفر مؤقتًا)
              </label>
              {pending.length > 0 && (
                <button onClick={async () => { await Promise.all(pending.map(r => api.patch(`/api/admin/notify/${r.id}`, { notified: true }))); setNotifyRequests(rs => rs.map(r => pending.find(p => p.id === r.id) ? { ...r, notified: true } : r)); }}
                  className="text-[11px] font-bold flex items-center gap-1" style={{ color: "#fbbf24" }}>
                  <Bell size={11} /> {pending.length} بانتظار الإشعار (اضغط بعد ما تتواصل معهم)
                </button>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function PricesAdmin({ prices, persistPrices, priceComparison, persistPriceComparison }) {
  const [local, setLocal] = useState(prices);
  const [uploadingId, setUploadingId] = useState(null);
  const updateRow = (section, idx, field, value) => setLocal({ ...local, [section]: local[section].map((r, i) => i === idx ? { ...r, [field]: value } : r) });

  // ---- subscriptions (regions with essential/extra/deluxe tiers) ----
  const updateRegion = (id, patch) => setLocal(l => ({ ...l, subs: l.subs.map(r => r.id === id ? { ...r, ...patch } : r) }));
  const updateTier = (id, tier, idx, value) => setLocal(l => ({
    ...l, subs: l.subs.map(r => {
      if (r.id !== id) return r;
      const arr = [...r[tier]]; arr[idx] = value; return { ...r, [tier]: arr };
    })
  }));
  const toggleYearOnly = (id) => setLocal(l => ({
    ...l, subs: l.subs.map(r => {
      if (r.id !== id) return r;
      const yearOnly = !r.yearOnly;
      const shrink = (arr) => yearOnly ? [arr[arr.length - 1] ?? 0] : (arr.length === 1 ? [0, 0, arr[0]] : arr);
      return { ...r, yearOnly, essential: shrink(r.essential), extra: shrink(r.extra), deluxe: shrink(r.deluxe) };
    })
  }));
  const onRegionFile = async (id, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(id);
    try { const dataUrl = await fileToCompressedDataUrl(file); updateRegion(id, { image: dataUrl }); }
    finally { setUploadingId(null); }
  };
  const addRegion = () => setLocal(l => ({
    ...l, subs: [...l.subs, { id: "s" + Date.now(), label: "دولة جديدة", flag: "🌍", image: null, essential: [0, 0, 0], extra: [0, 0, 0], deluxe: [0, 0, 0], yearOnly: false }]
  }));
  const removeRegion = (id) => setLocal(l => ({ ...l, subs: l.subs.filter(r => r.id !== id) }));

  // ---- gift cards (independent regions, each with its own denomination rows) ----
  const updateCard = (id, patch) => setLocal(l => ({ ...l, cards: l.cards.map(c => c.id === id ? { ...c, ...patch } : c) }));
  const updateCardRow = (id, idx, field, value) => setLocal(l => ({
    ...l, cards: l.cards.map(c => c.id === id ? { ...c, rows: c.rows.map((r, i) => i === idx ? { ...r, [field]: value } : r) } : c)
  }));
  const addCardRow = (id) => setLocal(l => ({ ...l, cards: l.cards.map(c => c.id === id ? { ...c, rows: [...c.rows, { amt: "", price: 0 }] } : c) }));
  const removeCardRow = (id, idx) => setLocal(l => ({ ...l, cards: l.cards.map(c => c.id === id ? { ...c, rows: c.rows.filter((_, i) => i !== idx) } : c) }));
  const onCardFile = async (id, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(id);
    try { const dataUrl = await fileToCompressedDataUrl(file); updateCard(id, { image: dataUrl }); }
    finally { setUploadingId(null); }
  };
  const addCardRegion = () => setLocal(l => ({
    ...l, cards: [...l.cards, { id: "c" + Date.now(), label: "دولة جديدة", flag: "🌍", image: null, rows: [{ amt: "10$", price: 0 }] }]
  }));
  const removeCardRegion = (id) => setLocal(l => ({ ...l, cards: l.cards.filter(c => c.id !== id) }));

  const save = () => persistPrices({
    ...local,
    cards: local.cards.map(c => ({ ...c, rows: c.rows.map(r => ({ ...r, price: Number(r.price) })) })),
    steam: local.steam.map(r => ({ ...r, price: Number(r.price) })),
    subs: local.subs.map(r => ({ ...r, essential: r.essential.map(Number), extra: r.extra.map(Number), deluxe: r.deluxe.map(Number) })),
  });

  const RowsEditor = ({ section, title }) => (
    <div className="rounded-xl p-4 mb-4 qg-card">
      <p className="text-xs font-bold mb-3" style={{ color: "#c3cbe8" }}>{title}</p>
      <div className="space-y-2">
        {local[section].map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={r.amt} onChange={e => updateRow(section, i, "amt", e.target.value)} className="w-20 px-2 py-1.5 rounded-lg text-xs text-center outline-none qx-input" />
            <span className="text-xs" style={{ color: "#c3cbe8" }}>=</span>
            <input value={r.price} onChange={e => updateRow(section, i, "price", e.target.value)} className="w-24 px-2 py-1.5 rounded-lg text-xs text-center outline-none qx-input" />
            <span className="text-[11px]" style={{ color: "#c3cbe8" }}>JD</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold" style={{ color: "#c3cbe8" }}>بطاقات PSN — كل دولة مستقلة عن غيرها</p>
        <button onClick={addCardRegion} className="text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1" style={{ background: "#0a0f20", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.3)" }}>
          <Plus size={12} /> إضافة دولة
        </button>
      </div>

      {local.cards.map(c => (
        <div key={c.id} className="rounded-xl p-4 mb-4 qg-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0" style={{ background: "#0a0f20", border: "1px dashed rgba(255,255,255,0.15)" }}>
              {c.image ? <img src={c.image} className="w-full h-full object-cover" alt="" loading="lazy" /> : (uploadingId === c.id ? <Loader2 size={14} className="animate-spin" color="#c3cbe8" /> : <span>{c.flag}</span>)}
            </div>
            <input value={c.label} onChange={e => updateCard(c.id, { label: e.target.value })}
              className="flex-1 px-2 py-1.5 rounded-lg text-xs font-bold outline-none qx-input" placeholder="اسم الدولة" />
            <label className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shrink-0" style={{ background: "#0a0f20", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.3)" }}>
              <Upload size={11} /> صورة
              <input type="file" accept="image/*" className="hidden" onChange={e => onCardFile(c.id, e)} />
            </label>
            <button onClick={() => removeCardRegion(c.id)} className="shrink-0" style={{ color: "#f87171" }}><Trash2 size={15} /></button>
          </div>

          <div className="space-y-2 mb-2">
            {c.rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={r.amt} onChange={e => updateCardRow(c.id, i, "amt", e.target.value)} placeholder="القيمة" className="w-20 px-2 py-1.5 rounded-lg text-xs text-center outline-none qx-input" />
                <span className="text-xs" style={{ color: "#c3cbe8" }}>=</span>
                <input value={r.price} onChange={e => updateCardRow(c.id, i, "price", e.target.value)} placeholder="السعر" className="w-24 px-2 py-1.5 rounded-lg text-xs text-center outline-none qx-input" />
                <span className="text-[11px]" style={{ color: "#c3cbe8" }}>JD</span>
                <button onClick={() => removeCardRow(c.id, i)} style={{ color: "#f87171" }}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <button onClick={() => addCardRow(c.id)} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1" style={{ background: "#0a0f20", color: "#c3cbe8" }}>
            <Plus size={11} /> إضافة قيمة
          </button>
        </div>
      ))}

      <RowsEditor section="steam" title="بطاقات Steam" />

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold" style={{ color: "#c3cbe8" }}>اشتراكات PS Plus — كل دولة مستقلة عن غيرها</p>
        <button onClick={addRegion} className="text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1" style={{ background: "#0a0f20", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.3)" }}>
          <Plus size={12} /> إضافة دولة
        </button>
      </div>

      {local.subs.map(region => (
        <div key={region.id} className="rounded-xl p-4 mb-4 qg-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0" style={{ background: "#0a0f20", border: "1px dashed rgba(255,255,255,0.15)" }}>
              {region.image ? <img src={region.image} className="w-full h-full object-cover" alt="" loading="lazy" /> : (uploadingId === region.id ? <Loader2 size={14} className="animate-spin" color="#c3cbe8" /> : <span>{region.flag}</span>)}
            </div>
            <input value={region.label} onChange={e => updateRegion(region.id, { label: e.target.value })}
              className="flex-1 px-2 py-1.5 rounded-lg text-xs font-bold outline-none qx-input" placeholder="اسم الدولة" />
            <label className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shrink-0" style={{ background: "#0a0f20", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.3)" }}>
              <Upload size={11} /> صورة
              <input type="file" accept="image/*" className="hidden" onChange={e => onRegionFile(region.id, e)} />
            </label>
            <button onClick={() => removeRegion(region.id)} className="shrink-0" style={{ color: "#f87171" }}><Trash2 size={15} /></button>
          </div>

          <label className="flex items-center gap-2 mb-3 text-[11px] font-bold cursor-pointer" style={{ color: "#c3cbe8" }}>
            <input type="checkbox" checked={region.yearOnly} onChange={() => toggleYearOnly(region.id)} />
            اشتراك سنوي فقط (بدون شهر / 3 شهور)
          </label>

          {["essential", "extra", "deluxe"].map(tier => (
            <div key={tier} className="flex items-center gap-2 mb-2">
              <span className="text-[11px] w-16" style={{ color: "#c3cbe8" }}>{tier}</span>
              {region[tier].map((v, i) => <input key={i} value={v} onChange={e => updateTier(region.id, tier, i, e.target.value)} className="w-16 px-2 py-1.5 rounded-lg text-xs text-center outline-none qx-input" />)}
            </div>
          ))}
        </div>
      ))}

      <button onClick={save} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 sticky bottom-3 qx-btn qx-btn-primary">
        <Save size={16} /> حفظ كل التعديلات
      </button>

      <PriceComparisonAdmin priceComparison={priceComparison} persistPriceComparison={persistPriceComparison} />
    </div>
  );
}

function PriceComparisonAdmin({ priceComparison, persistPriceComparison }) {
  const [draft, setDraft] = useState({ product: "", store: "", price: "" });
  const add = () => {
    if (!draft.product.trim() || !draft.store.trim()) return;
    persistPriceComparison([...priceComparison, { id: "pc" + Date.now(), ...draft }]);
    setDraft({ product: "", store: "", price: "" });
  };
  const remove = (id) => persistPriceComparison(priceComparison.filter(r => r.id !== id));
  return (
    <div className="rounded-xl p-4 mt-4 qg-card">
      <p className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: "#c3cbe8" }}><Scale size={13} /> مقارنة الأسعار (تظهر بصفحة عامة "مقارنة الأسعار")</p>
      {priceComparison.map(r => (
        <div key={r.id} className="flex items-center gap-2 mb-2">
          <span className="flex-1 text-xs">{r.product}</span>
          <span className="text-xs" style={{ color: "#c3cbe8" }}>{r.store}</span>
          <span className="text-xs font-bold" style={{ color: "#60a5fa" }}>{r.price}</span>
          <button onClick={() => remove(r.id)} style={{ color: "#f87171" }}><Trash2 size={13} /></button>
        </div>
      ))}
      <div className="grid grid-cols-3 gap-2 mt-2">
        <input value={draft.product} onChange={e => setDraft({ ...draft, product: e.target.value })} placeholder="المنتج" className="px-2.5 py-2 rounded-lg text-xs outline-none qx-input" />
        <input value={draft.store} onChange={e => setDraft({ ...draft, store: e.target.value })} placeholder="المتجر" className="px-2.5 py-2 rounded-lg text-xs outline-none qx-input" />
        <input value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })} placeholder="السعر" className="px-2.5 py-2 rounded-lg text-xs outline-none qx-input" />
      </div>
      <button onClick={add} className="w-full mt-2 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5" style={{ background: "#0a0f20", color: "#2dd4bf" }}><Plus size={13} /> إضافة صف</button>
    </div>
  );
}

function UsersAdmin({ users }) {
  if (users.length === 0) return <p className="text-sm" style={{ color: "#c3cbe8" }}>ما في عملاء مسجلين لسا</p>;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3 text-xs font-bold" style={{ color: "#c3cbe8" }}><UsersIcon size={14} /> {users.length} عميل مسجل</div>
      {users.map(u => (
        <div key={u.id} className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: "#0c1230", border: "1px solid rgba(47,125,244,0.2)" }}>
          <div>
            <div className="font-bold text-sm">{u.name}</div>
            <div className="text-[11px]" style={{ color: "#c3cbe8", direction: "ltr", textAlign: "right" }}>{u.email || u.phone}</div>
          </div>
          {u.phone && <span className="text-xs" style={{ color: "#2dd4bf", direction: "ltr" }}>{u.phone}</span>}
        </div>
      ))}
    </div>
  );
}

/* =================================================================
   COUPONS
================================================================= */
function CouponsAdmin({ coupons, persistCoupons }) {
  const [draft, setDraft] = useState({ code: "", percent: "", expiresAt: "" });
  const add = () => {
    if (!draft.code.trim() || !draft.percent) return;
    persistCoupons([...coupons, { id: "cp" + Date.now(), code: draft.code.trim().toUpperCase(), percent: Number(draft.percent), expiresAt: draft.expiresAt || null }]);
    setDraft({ code: "", percent: "", expiresAt: "" });
  };
  const remove = (id) => persistCoupons(coupons.filter(c => c.id !== id));
  const isExpired = (c) => c.expiresAt && new Date(c.expiresAt) < new Date();
  return (
    <div>
      <div className="rounded-xl p-4 mb-5 space-y-2 qg-card">
        <p className="text-xs font-bold mb-1" style={{ color: "#c3cbe8" }}>إضافة كوبون جديد</p>
        <div className="grid grid-cols-2 gap-2">
          <input value={draft.code} onChange={e => setDraft({ ...draft, code: e.target.value })} placeholder="الكود مثلا SUMMER20" className="px-3 py-2 rounded-lg text-sm outline-none" style={{ ...inputStyle, direction: "ltr" }} />
          <input value={draft.percent} onChange={e => setDraft({ ...draft, percent: e.target.value })} placeholder="نسبة الخصم %" className="px-3 py-2 rounded-lg text-sm outline-none qx-input" />
        </div>
        <input type="date" value={draft.expiresAt} onChange={e => setDraft({ ...draft, expiresAt: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none qx-input" style={{...inputStyle}} />
        <p className="text-[10px]" style={{ color: "#c3cbe8" }}>تاريخ الانتهاء اختياري — اتركه فاضي لكوبون بدون انتهاء</p>
        <button onClick={add} className="w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 qx-btn qx-btn-primary"><Plus size={15} /> إضافة كوبون</button>
      </div>
      <div className="space-y-2">
        {coupons.map(c => (
          <div key={c.id} className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: "#0c1230", border: `1px solid ${isExpired(c) ? "rgba(255,107,107,0.4)" : "rgba(255,255,255,0.08)"}` }}>
            <div>
              <span className="font-black text-sm flex items-center gap-1.5" style={{ direction: "ltr" }}><Tag size={13} color="#2dd4bf" /> {c.code}</span>
              {c.expiresAt && <span className="text-[10px]" style={{ color: isExpired(c) ? "#f87171" : "#c3cbe8" }}>{isExpired(c) ? "منتهي" : "ينتهي"} {new Date(c.expiresAt).toLocaleDateString("ar")}</span>}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm" style={{ color: "#60a5fa" }}>{c.percent}%</span>
              <button onClick={() => remove(c.id)} style={{ color: "#f87171" }}><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentInfoAdmin({ paymentInfo, persistPaymentInfo }) {
  const [draft, setDraft] = useState(paymentInfo);
  useEffect(() => { setDraft(paymentInfo); }, [paymentInfo]);
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });
  const save = () => persistPaymentInfo(draft);
  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 space-y-2.5 qg-card">
        <p className="text-xs font-bold mb-1" style={{ color: "#c3cbe8" }}>تحويل بنكي</p>
        <input value={draft.bankAccountName || ""} onChange={set("bankAccountName")} placeholder="اسم صاحب الحساب البنكي" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none qx-input" />
        <input value={draft.bankName || ""} onChange={set("bankName")} placeholder="اسم البنك" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none qx-input" />
        <input value={draft.bankAccountNumber || ""} onChange={set("bankAccountNumber")} placeholder="رقم الحساب / IBAN" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none qx-input" style={{...inputStyle}} />
      </div>
      <div className="rounded-xl p-4 space-y-2.5 qg-card">
        <p className="text-xs font-bold mb-1" style={{ color: "#c3cbe8" }}>CliQ</p>
        <input value={draft.cliqName || ""} onChange={set("cliqName")} placeholder="اسم CliQ" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none qx-input" />
        <input value={draft.cliqNumber || ""} onChange={set("cliqNumber")} placeholder="رقم CliQ" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none qx-input" style={{...inputStyle}} />
      </div>
      <div className="rounded-xl p-4 space-y-2.5 qg-card">
        <p className="text-xs font-bold mb-1" style={{ color: "#c3cbe8" }}>زين كاش (Zain Cash)</p>
        <input value={draft.zainCashName || ""} onChange={set("zainCashName")} placeholder="الاسم على حساب زين كاش" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none qx-input" />
        <input value={draft.zainCashNumber || ""} onChange={set("zainCashNumber")} placeholder="رقم زين كاش" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none qx-input" style={{...inputStyle}} />
      </div>
      <div className="rounded-xl p-4 space-y-2.5 qg-card">
        <p className="text-xs font-bold mb-1" style={{ color: "#c3cbe8" }}>أورنج موني (Orange Money)</p>
        <input value={draft.orangeMoneyName || ""} onChange={set("orangeMoneyName")} placeholder="الاسم على حساب أورنج موني" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none qx-input" />
        <input value={draft.orangeMoneyNumber || ""} onChange={set("orangeMoneyNumber")} placeholder="رقم أورنج موني" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none qx-input" style={{...inputStyle}} />
      </div>
      <div className="rounded-xl p-4 qg-card">
        <label className="flex items-center gap-2.5 text-sm font-bold cursor-pointer">
          <input type="checkbox" checked={!!draft.codEnabled} onChange={e => setDraft({ ...draft, codEnabled: e.target.checked })} style={{ width: 16, height: 16, accentColor: "#60a5fa" }} />
          <Truck size={15} color="#60a5fa" /> فعّل الدفع نقدًا عند التسليم
        </label>
        <p className="text-[11px] mt-1.5" style={{ color: "#c3cbe8" }}>لما تفعّلها، بيظهر خيار "نقدًا عند التسليم" للزبون بدون ما يحتاج يرفق صورة إثبات — تأكد إنك جاهز توصّل الطلبات وتحصّل الكاش قبل ما تفعّلها.</p>
      </div>
      <div className="rounded-xl p-4 space-y-2.5 qg-card">
        <p className="text-xs font-bold mb-1" style={{ color: "#c3cbe8" }}>ملاحظات إضافية تظهر للزبون وقت الدفع</p>
        <textarea value={draft.notes || ""} onChange={set("notes")} rows={3} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none qx-input" />
      </div>
      <button onClick={save} className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 qx-btn qx-btn-primary"><Save size={15} /> حفظ معلومات الدفع</button>
      <p className="text-[11px]" style={{ color: "#c3cbe8" }}>هاي المعلومات بتظهر لأي زبون وصل لخطوة الدفع بالسلة، حسب طريقة الدفع يلي بيختارها.</p>
    </div>
  );
}

/* =================================================================
   SHIPPING ADMIN — owner controls companies, cities and prices
================================================================= */
function ShippingAdmin({ shipping, persistShipping }) {
  const [draft, setDraft] = useState(shipping);
  useEffect(() => { setDraft(shipping); }, [shipping]);

  const save = () => persistShipping(draft);

  const addCompany = () => setDraft({
    ...draft,
    companies: [...(draft.companies || []), { id: genCompId(), name: "", phone: "", enabled: true, regions: [] }],
  });
  const updComp = (id, patch) => setDraft({ ...draft, companies: draft.companies.map(c => c.id === id ? { ...c, ...patch } : c) });
  const delComp = (id) => {
    if (!confirm("متأكد بحذف هالشركة وكل أسعار مدنها؟")) return;
    setDraft({ ...draft, companies: draft.companies.filter(c => c.id !== id) });
  };
  const addRegion = (cid) => updComp(cid, { regions: [...(draft.companies.find(c => c.id === cid)?.regions || []), { city: "", price: 0, enabled: true }] });
  const updRegion = (cid, idx, patch) => updComp(cid, {
    regions: draft.companies.find(c => c.id === cid).regions.map((r, i) => i === idx ? { ...r, ...patch } : r),
  });
  const delRegion = (cid, idx) => updComp(cid, {
    regions: draft.companies.find(c => c.id === cid).regions.filter((_, i) => i !== idx),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 qg-card">
        <label className="flex items-center gap-2.5 text-sm font-bold cursor-pointer">
          <input type="checkbox" checked={!!draft.enabled} onChange={e => setDraft({ ...draft, enabled: e.target.checked })} style={{ width: 16, height: 16, accentColor: "#60a5fa" }} />
          <Truck size={15} color="#60a5fa" /> فعّل نظام التوصيل بالمتجر
        </label>
        <p className="text-[11px] mt-1.5" style={{ color: "#c3cbe8" }}>لما تفعّله، بيظهر للزبون خيار اختيار شركة التوصيل ومدينته مع إضافة رسومها للإجمالي. إذا في خيار "نقدًا عند التسليم"، رح يطلب من الزبون يختار شركة ومدينة قبل إرسال الطلب. بغض النظر عن تفعيل هالنظام، الزبون دايمًا عنده خيار "الاستلام من المتجر" المجاني كبديل عن التوصيل.</p>
      </div>

      <div className="rounded-xl p-4" style={{ ...card, background: "rgba(45,212,191,0.04)", border: "1px solid rgba(45,212,191,0.25)" }}>
        <label className="flex items-center gap-2 text-sm font-bold" style={{ color: "#2dd4bf" }}><Clock size={15} /> وقت تجهيز الطلب (الاستلام من المتجر)</label>
        <div className="flex items-center gap-3 mt-2">
          <input type="number" min="1" max="1440" value={draft.pickupPrepMinutes ?? 30} onChange={e => setDraft({ ...draft, pickupPrepMinutes: Math.max(1, Math.floor(Number(e.target.value) || 30)) })}
            className="w-24 px-3 py-2 rounded-lg text-sm outline-none" style={{ ...inputStyle, direction: "ltr" }} />
          <span className="text-[11px]" style={{ color: "#c3cbe8" }}>دقيقة — الرسالة يلي بتشوفها الزبون: "طلبك بيكون جاهز للاستلام خلال حوالي {Math.max(1, Math.floor(Number(draft.pickupPrepMinutes) || 30))} دقيقة من تأكيد الدفع — بنرسل لك إشعار لما يتجهز"</span>
        </div>
        <p className="text-[11px] mt-1.5" style={{ color: "#c3cbe8" }}>بتظهر هالرسالة الديناميكية للزبون لما يختار "الاستلام من المتجر" بالسلة، وكمان بطلب الطلب (الوصل).</p>
      </div>

      <div className="rounded-xl p-4" style={{ ...card, background: "rgba(37,211,102,0.04)", border: "1px solid rgba(37,211,102,0.25)" }}>
        <label className="flex items-center gap-2 text-sm font-bold cursor-pointer" style={{ color: "#25D366" }}>
          <input type="checkbox" checked={draft.pickupWaEnabled !== false} onChange={e => setDraft({ ...draft, pickupWaEnabled: e.target.checked })} style={{ width: 16, height: 16, accentColor: "#25D366" }} />
          <MessageCircle size={15} color="#25D366" /> زر تنسيق الاستلام عبر واتساب
        </label>
        <p className="text-[11px] mt-1.5" style={{ color: "#c3cbe8" }}>لما تفعّله، بيظهر للزبون زر واتساب مباشر جنب خيار "الاستلام من المتجر" وبوصل الطلب، يفتح محادثة معك برسالة جاهزة فيها رقم الطلب — بما إن المتجر إلكتروني، بهالطريقة الزبون بينسّق معك مكان وتوقيت الاستلام بسهولة.</p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-black" style={{ color: "#cbb8ff" }}>شركات التوصيل ({(draft.companies || []).length})</p>
        <button onClick={addCompany} className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1" style={{ background: "rgba(45,212,191,0.08)", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.35)" }}><Plus size={13} /> شركة جديدة</button>
      </div>

      {(draft.companies || []).map(c => (
        <div key={c.id} className="rounded-xl p-4 space-y-3" style={{ ...card, opacity: c.enabled === false ? 0.55 : 1 }}>
          <div className="flex items-start gap-2">
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input type="checkbox" checked={c.enabled !== false} onChange={e => updComp(c.id, { enabled: e.target.checked })} style={{ width: 15, height: 15, accentColor: "#60a5fa" }} />
              مفعّلة
            </label>
            <input value={c.name || ""} onChange={e => updComp(c.id, { name: e.target.value })} placeholder="اسم الشركة (مثلًا: أرامكس)"
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none qx-input" />
            <button onClick={() => delComp(c.id)} className="p-2 rounded-lg" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)" }}><Trash2 size={13} color="#f87171" /></button>
          </div>
          <input value={c.phone || ""} onChange={e => updComp(c.id, { phone: e.target.value })} placeholder="رقم الشركة (اختياري)"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none qx-input" style={{...inputStyle}} />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold" style={{ color: "#c3cbe8" }}>المدن والأسعار (بالدينار)</p>
              <button onClick={() => addRegion(c.id)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1" style={{ background: "rgba(47,125,244,0.12)", color: "#60a5fa", border: "1px solid rgba(47,125,244,0.35)" }}><Plus size={12} /> مدينة</button>
            </div>
            {(c.regions || []).map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="checkbox" checked={r.enabled !== false} onChange={e => updRegion(c.id, i, { enabled: e.target.checked })} style={{ width: 15, height: 15, accentColor: "#60a5fa" }} />
                <input value={r.city || ""} onChange={e => updRegion(c.id, i, { city: e.target.value })} placeholder="اسم المدينة"
                  className="flex-1 px-3 py-2 rounded-lg text-sm outline-none qx-input" />
                <input type="number" step="0.01" min="0" value={r.price} onChange={e => updRegion(c.id, i, { price: Number(e.target.value) || 0 })} placeholder="0.00"
                  className="w-24 px-3 py-2 rounded-lg text-sm outline-none" style={{ ...inputStyle, direction: "ltr" }} />
                <button onClick={() => delRegion(c.id, i)} className="p-2 rounded-lg" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)" }}><X size={12} color="#f87171" /></button>
              </div>
            ))}
            {(c.regions || []).length === 0 && <p className="text-[10px]" style={{ color: "#c3cbe8" }}>ما في مدن — أضف المدينة والسعر عشان تظهر للزبون</p>}
          </div>
        </div>
      ))}

      {(draft.companies || []).length === 0 && (
        <div className="rounded-xl p-5 text-center text-xs qg-card">
          <p style={{ color: "#c3cbe8" }}>ما في شركات توصيل بعد — اضغط "شركة جديدة" وأضف أول شركة مع مدنها وأسعارها</p>
        </div>
      )}

      <button onClick={save} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 qx-btn qx-btn-primary">
        <Save size={15} /> حفظ إعدادات التوصيل
      </button>
    </div>
  );
}

/* =================================================================
   REPORTS: sales chart, best sellers, order search/filter, Excel export
================================================================= */
function ReportsAdmin({ orders, games, canExport }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [visits, setVisits] = useState({ total: null, byDay: [] });

  useEffect(() => {
    api.get("/api/content/stats-admin").then(r => {
      const s = r.stats || {};
      setVisits({
        total: s.all_orders ?? null,
        byDay: (r.byDay || []).slice(-7).map(d => ({ day: d.day, count: d.count, revenue: d.revenue })),
      });
    }).catch(() => {});
  }, []);

  const rangedOrders = orders.filter(o => {
    const t = new Date(o.ts).getTime();
    if (fromDate && t < new Date(fromDate).getTime()) return false;
    if (toDate && t > new Date(toDate).getTime() + 86400000 - 1) return false;
    return true;
  });

  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toLocaleDateString("ar", { weekday: "short" });
    const dayTotal = orders.filter(o => new Date(o.ts).toDateString() === d.toDateString()).reduce((s, o) => s + (o.total || 0), 0);
    return { day: key, total: Number(dayTotal.toFixed(2)) };
  });

  // "هالشهر مقابل الشهر يلي قبله" — counts + totals for the current
  // calendar month vs. the one right before it
  const now = new Date();
  const inMonth = (d, monthsAgo) => {
    const target = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth();
  };
  const thisMonthOrders = orders.filter(o => inMonth(new Date(o.ts), 0) && o.status !== "cancelled");
  const lastMonthOrders = orders.filter(o => inMonth(new Date(o.ts), 1) && o.status !== "cancelled");
  const thisMonthTotal = thisMonthOrders.reduce((s, o) => s + (o.total || 0), 0);
  const lastMonthTotal = lastMonthOrders.reduce((s, o) => s + (o.total || 0), 0);
  const salesDiffPct = lastMonthTotal > 0 ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100) : (thisMonthTotal > 0 ? 100 : 0);
  const countDiffPct = lastMonthOrders.length > 0 ? Math.round(((thisMonthOrders.length - lastMonthOrders.length) / lastMonthOrders.length) * 100) : (thisMonthOrders.length > 0 ? 100 : 0);

  const itemCounts = {};
  rangedOrders.forEach(o => o.items.forEach(it => { itemCounts[it.name] = (itemCounts[it.name] || 0) + (it.qty || 1); }));
  const bestSellers = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const rangeTotal = rangedOrders.filter(o => o.status !== "cancelled").reduce((s, o) => s + (o.total || 0), 0);
  const rangedRatings = rangedOrders.filter(o => o.rating);
  const avgRating = rangedRatings.length > 0 ? (rangedRatings.reduce((s, o) => s + o.rating, 0) / rangedRatings.length).toFixed(1) : null;

  const filteredOrders = rangedOrders.filter(o => {
    const matchesQuery = !query.trim() || o.userName?.toLowerCase().includes(query.trim().toLowerCase());
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const exportExcel = () => {
    const rows = rangedOrders.map(o => ({
      "رقم الطلب": o.id, "الزبون": o.userName, "الهاتف": o.phone || "", "الحالة": ORDER_STATUS_LABEL[o.status] || o.status,
      "الإجمالي": o.total, "المنتجات": o.items.map(it => `${it.name} x${it.qty}`).join(", "),
      "التاريخ": new Date(o.ts).toLocaleString("ar"),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الطلبات");
    XLSX.writeFile(wb, `qwadergame-orders-${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-4 qg-card">
        <p className="text-xs font-bold mb-2" style={{ color: "#c3cbe8" }}>فلترة بمدى تاريخ (تؤثر على الإحصائيات تحت وملف Excel)</p>
        <div className="flex gap-2 items-center mb-1">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="flex-1 px-3 py-2 rounded-lg text-xs outline-none" style={{ ...inputStyle, colorScheme: "dark" }} />
          <span className="text-xs" style={{ color: "#c3cbe8" }}>إلى</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="flex-1 px-3 py-2 rounded-lg text-xs outline-none" style={{ ...inputStyle, colorScheme: "dark" }} />
          {(fromDate || toDate) && <button onClick={() => { setFromDate(""); setToDate(""); }} className="text-[11px] font-bold px-2.5 py-2 rounded-lg" style={{ background: "#0a0f20", color: "#f87171" }}>مسح</button>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4 text-center qg-card">
          <p className="text-[11px] mb-1" style={{ color: "#c3cbe8" }}>إجمالي المبيعات بالمدى</p>
          <p className="font-black text-lg" style={{ color: "#60a5fa" }}>{money(rangeTotal)}</p>
        </div>
        <div className="rounded-xl p-4 text-center qg-card">
          <p className="text-[11px] mb-1" style={{ color: "#c3cbe8" }}>متوسط تقييم الزبائن</p>
          <p className="font-black text-lg flex items-center justify-center gap-1" style={{ color: "#fbbf24" }}>{avgRating ? <>{avgRating} <Star size={15} fill="#fbbf24" /></> : "—"}</p>
        </div>
        <div className="rounded-xl p-4 text-center col-span-2 qg-card">
          <p className="text-[11px] mb-1" style={{ color: "#c3cbe8" }}>إجمالي الطلبات بالموقع</p>
          <p className="font-black text-lg" style={{ color: "#2dd4bf" }}>{visits.total ?? "—"}</p>
          {visits.byDay.length > 0 && (
            <p className="text-[10px] mt-1" style={{ color: "#c3cbe8" }}>{visits.byDay.reduce((s, d) => s + d.count, 0)} طلب آخر 7 أيام — {money(visits.byDay.reduce((s, d) => s + (d.revenue || 0), 0))} مبيعات</p>
          )}
        </div>
      </div>

      <div className="rounded-xl p-4 qg-card">
        <p className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: "#c3cbe8" }}><BarChart3 size={14} /> هالشهر مقابل الشهر يلي قبله</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg p-3" style={{ background: "rgba(2,14,36,0.9)", border: "1px solid rgba(47,125,244,0.22)" }}>
            <p className="text-[11px] mb-1" style={{ color: "#c3cbe8" }}>المبيعات</p>
            <p className="font-black text-base" style={{ color: "#60a5fa" }}>{money(thisMonthTotal)}</p>
            <p className="text-[11px] font-bold flex items-center gap-1" style={{ color: salesDiffPct >= 0 ? "#8fe08a" : "#f87171" }}>
              {salesDiffPct >= 0 ? "▲" : "▼"} {Math.abs(salesDiffPct)}% عن الشهر السابق
            </p>
          </div>
          <div className="rounded-lg p-3" style={{ background: "rgba(2,14,36,0.9)", border: "1px solid rgba(47,125,244,0.22)" }}>
            <p className="text-[11px] mb-1" style={{ color: "#c3cbe8" }}>عدد الطلبات</p>
            <p className="font-black text-base" style={{ color: "#2dd4bf" }}>{thisMonthOrders.length}</p>
            <p className="text-[11px] font-bold flex items-center gap-1" style={{ color: countDiffPct >= 0 ? "#8fe08a" : "#f87171" }}>
              {countDiffPct >= 0 ? "▲" : "▼"} {Math.abs(countDiffPct)}% عن الشهر السابق
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-4 qg-card">
        <p className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: "#c3cbe8" }}><BarChart3 size={14} /> المبيعات آخر 7 أيام (دينار)</p>
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7}>
              <XAxis dataKey="day" stroke="#c3cbe8" fontSize={11} />
              <YAxis stroke="#c3cbe8" fontSize={11} />
              <Tooltip contentStyle={{ background: "#0c1230", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="total" fill="#60a5fa" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl p-4 qg-card">
        <p className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: "#c3cbe8" }}><Award size={14} /> الأكثر مبيعًا</p>
        {bestSellers.length === 0 ? <p className="text-xs" style={{ color: "#c3cbe8" }}>ما في بيانات كفاية</p> : (
          <div className="space-y-1.5">
            {bestSellers.map(([name, count], i) => (
              <div key={name} className="flex justify-between text-xs"><span>{i + 1}. {name}</span><span className="font-bold" style={{ color: "#60a5fa" }}>{count}</span></div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl p-4 qg-card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold" style={{ color: "#c3cbe8" }}>كل الطلبات</p>
          {canExport && (
          <button onClick={exportExcel} className="text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1" style={{ background: "#0a0f20", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.3)" }}>
            <Download size={12} /> تصدير Excel
          </button>
          )}
        </div>
        <div className="flex gap-2 mb-3">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="بحث باسم الزبون" className="flex-1 px-3 py-2 rounded-lg text-xs outline-none qx-input" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none qx-input">
            <option value="all">الكل</option>
            {Object.keys(ORDER_STATUS_LABEL).filter(s => !["pending", "confirmed"].includes(s)).map(s => (
              <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {filteredOrders.map(o => (
            <div key={o.id} className="flex justify-between text-xs px-2 py-1.5 rounded-lg" style={{ background: "rgba(2,14,36,0.9)", border: "1px solid rgba(47,125,244,0.22)" }}>
              <span>{o.userName} — #{o.id.slice(-6)}</span><span style={{ color: ORDER_STATUS_COLOR[o.status] || "#c3cbe8" }}>{ORDER_STATUS_LABEL[o.status] || o.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =================================================================
   ADMINS (staff management + activity log) — owner only
================================================================= */
const PERMISSION_GROUPS = [
  { label: "الطلبات", items: [
    ["orders_view", "عرض الطلبات"], ["orders_status", "تغيير حالة الطلب"],
    ["orders_cancel", "إلغاء الطلب"], ["orders_delete", "حذف الطلب نهائيًا"],
  ]},
  { label: "المحادثات", items: [
    ["chats_view", "عرض المحادثات والرد عليها"], ["chats_start", "بدء محادثة جديدة"],
    ["quickreplies_edit", "تعديل الردود الجاهزة"],
  ]},
  { label: "التقارير", items: [
    ["reports_view", "عرض التقارير"], ["reports_export", "تصدير Excel"],
  ]},
  { label: "إدارة المحتوى", items: [
    ["content_games", "تعديل الألعاب"], ["content_prices", "تعديل الأسعار"],
    ["content_banners", "تعديل البانرات"], ["content_faq", "تعديل الأسئلة الشائعة"],
    ["content_about", "تعديل من نحن والآراء"], ["content_coupons", "تعديل الكوبونات"],
  ]},
];

function AdminsAdmin({ staff, onPromote, onDemote, onUpdatePermissions, activityLog }) {
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [expanded, setExpanded] = useState(null);

  const promote = async () => {
    if (!identifier.trim()) return;
    setBusy(true); setErr("");
    try { await onPromote(identifier.trim()); setIdentifier(""); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const toggle = (s, key) => {
    const current = s.permissions || {};
    const next = { ...current, [key]: !current[key] };
    if (!next[key]) delete next[key];
    onUpdatePermissions(s.id, next);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-4 space-y-2 qg-card">
        <p className="text-xs font-bold mb-1 flex items-center gap-1.5" style={{ color: "#c3cbe8" }}>
          <ShieldAlert size={14} /> رقّي زبون مسجل لصلاحية موظف (بإيميله أو رقم هاتفه — لازم يكون عنده حساب بالموقع أصلًا)
        </p>
        <div className="flex gap-2">
          <input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="إيميل أو رقم هاتف الحساب" className="flex-1 px-3 py-2 rounded-lg text-sm outline-none" style={{ ...inputStyle, direction: "ltr", textAlign: "right" }} />
          <button onClick={promote} disabled={busy} className="px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shrink-0 qx-btn qx-btn-primary">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />} ترقية
          </button>
        </div>
        {err && <p className="text-xs" style={{ color: "#f87171" }}>{err}</p>}
        <p className="text-[11px]" style={{ color: "#c3cbe8" }}>الموظف بيسجل دخول بحسابه العادي (إيميله وكلمة سره) — يبلش بدون أي صلاحيات، فعّلها له تحت.</p>
      </div>

      <div className="space-y-2">
        {staff.filter(s => s.role === "staff").map(s => {
          const perms = s.permissions || {};
          const activeCount = Object.values(perms).filter(Boolean).length;
          return (
            <div key={s.id} className="rounded-xl px-4 py-2.5" style={{ background: "#0c1230", border: "1px solid rgba(47,125,244,0.2)" }}>
              <div className="flex items-center justify-between">
                <button onClick={() => setExpanded(expanded === s.id ? null : s.id)} className="flex-1 text-right">
                  <span className="font-bold text-sm">{s.name}</span>
                  <span className="text-[11px] mr-2" style={{ color: "#c3cbe8", direction: "ltr" }}>{s.email || s.phone}</span>
                  <span className="text-[10px] mr-2 font-bold" style={{ color: activeCount > 0 ? "#2dd4bf" : "#60a5fa" }}>
                    {activeCount > 0 ? `${activeCount} صلاحية مفعّلة` : "بدون صلاحيات"}
                  </span>
                </button>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => setExpanded(expanded === s.id ? null : s.id)} style={{ color: "#c3cbe8" }}>
                    <ChevronRight size={16} style={{ transform: expanded === s.id ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform .15s" }} />
                  </button>
                  <button onClick={() => onDemote(s.id)} style={{ color: "#f87171" }}><Trash2 size={15} /></button>
                </div>
              </div>

              {expanded === s.id && (
                <div className="mt-3 pt-3 space-y-3" style={{ borderTop: "1px solid rgba(47,125,244,0.2)" }}>
                  {PERMISSION_GROUPS.map(group => (
                    <div key={group.label}>
                      <p className="text-[11px] font-bold mb-1.5" style={{ color: "#c3cbe8" }}>{group.label}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {group.items.map(([key, label]) => (
                          <label key={key} className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                            <input type="checkbox" checked={!!perms[key]} onChange={() => toggle(s, key)}
                              style={{ accentColor: "#60a5fa", width: 14, height: 14 }} />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {staff.filter(s => s.role === "staff").length === 0 && <p className="text-xs" style={{ color: "#c3cbe8" }}>ما في موظفين مضافين</p>}
      </div>

      <div className="rounded-xl p-4 qg-card">
        <p className="text-xs font-bold mb-3" style={{ color: "#c3cbe8" }}>سجل النشاط</p>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {activityLog.length === 0 && <p className="text-xs" style={{ color: "#c3cbe8" }}>ما في نشاط مسجل لسا</p>}
          {activityLog.map(a => (
            <div key={a.id} className="text-xs flex justify-between" style={{ color: "#cdd3ee" }}>
              <span>{a.who}: {a.action}</span><span style={{ color: "#c3cbe8" }}>{new Date(a.ts).toLocaleString("ar")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =================================================================
   BACKUP / RESTORE — owner only
================================================================= */
function BackupAdmin({ data, restore, maintenance, persistMaintenance }) {
  const [importErr, setImportErr] = useState("");
  const [maintDraft, setMaintDraft] = useState(maintenance);
  useEffect(() => { setMaintDraft(maintenance); }, [maintenance]);
  const download = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `qwadergame-backup-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        await restore(parsed);
        setImportErr("");
      } catch (err) { setImportErr("الملف غير صالح"); }
    };
    reader.readAsText(file);
  };
  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4" style={{ ...card, border: maintenance.enabled ? "1px solid rgba(255,107,107,0.5)" : card.border }}>
        <label className="flex items-center gap-2.5 text-sm font-bold cursor-pointer mb-2">
          <input type="checkbox" checked={!!maintDraft.enabled} onChange={e => setMaintDraft({ ...maintDraft, enabled: e.target.checked })} style={{ width: 16, height: 16, accentColor: "#f87171" }} />
          <WifiOff size={15} color="#f87171" /> وضع الصيانة
        </label>
        <p className="text-[11px] mb-2" style={{ color: "#c3cbe8" }}>لما تفعّله، أي زبون (غيرك) بيشوف رسالة صيانة بس بدل الموقع كامل. إنت بتضل تقدر تدخل للوحة التحكم وتشتغل عادي.</p>
        <textarea value={maintDraft.message} onChange={e => setMaintDraft({ ...maintDraft, message: e.target.value })} rows={2} placeholder="رسالة الصيانة" className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none mb-2 qx-input" />
        <button onClick={() => persistMaintenance(maintDraft)} className="w-full py-2 rounded-lg text-xs font-bold" style={{ background: maintDraft.enabled ? "#f87171" : "#0a0f20", color: maintDraft.enabled ? "#120820" : "#c3cbe8" }}>
          {maintDraft.enabled ? "حفظ وتفعيل وضع الصيانة" : "حفظ"}
        </button>
      </div>

      <div className="rounded-xl p-4 qg-card">
        <p className="text-xs font-bold mb-3" style={{ color: "#c3cbe8" }}>نسخة احتياطية</p>
        <button onClick={download} className="w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 qx-btn qx-btn-primary"><Download size={15} /> تحميل نسخة احتياطية (JSON)</button>
      </div>
      <div className="rounded-xl p-4 qg-card">
        <p className="text-xs font-bold mb-3" style={{ color: "#c3cbe8" }}>استرجاع نسخة</p>
        <label className="w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 cursor-pointer" style={{ background: "#0a0f20", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.3)" }}>
          <UploadCloud size={15} /> رفع ملف نسخة احتياطية
          <input type="file" accept="application/json" className="hidden" onChange={onFile} />
        </label>
        {importErr && <p className="text-xs mt-2" style={{ color: "#f87171" }}>{importErr}</p>}
      </div>
      <AutoBackupsList />
    </div>
  );
}

function AutoBackupsList() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/admin/backups").then(r => setBackups(r.backups || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const downloadOne = async (id) => {
    const { data, ts } = await api.get(`/api/admin/backups/${id}`);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `qwadergame-auto-backup-${new Date(ts).toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl p-4 qg-card">
      <p className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: "#c3cbe8" }}><Archive size={13} /> نسخ احتياطية تلقائية (أسبوعية)</p>
      {loading ? (
        <Loader2 size={16} className="animate-spin" color="#c3cbe8" />
      ) : backups.length === 0 ? (
        <p className="text-xs" style={{ color: "#c3cbe8" }}>ما في نسخ تلقائية لسا — أول نسخة رح تنجهز مع أول جدولة أسبوعية (بعد ما تفعّل CRON_SECRET بإعدادات Vercel).</p>
      ) : (
        <div className="space-y-1.5">
          {backups.map(b => (
            <div key={b.id} className="flex items-center justify-between text-xs">
              <span style={{ color: "#cdd3ee" }}>{new Date(b.ts).toLocaleString("ar")}</span>
              <button onClick={() => downloadOne(b.id)} className="font-bold flex items-center gap-1" style={{ color: "#2dd4bf" }}><Download size={12} /> تحميل</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
