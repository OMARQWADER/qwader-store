import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Order, OrderStatus } from '../types';
import {
  Search,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  MessageCircle,
  Printer,
  RefreshCw,
  CreditCard,
  Truck,
  Store,
  User,
  Phone,
  Mail,
  FileText,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  ChevronRight,
  CheckCircle,
  Zap,
  HelpCircle
} from 'lucide-react';

interface OrderTrackingViewProps {
  initialOrderId?: string;
}

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({ initialOrderId }) => {
  const {
    state,
    currentUser,
    formatPrice,
    updateOrderStatus,
    language,
    currentRoute,
    navigateTo,
    t
  } = useStore();

  // Extract order ID from prop or route hash (e.g. #track-order/ORD-1001 or #track/ORD-1001)
  const routeOrderId = useMemo(() => {
    if (initialOrderId) return initialOrderId;
    if (currentRoute.startsWith('#track-order/')) {
      return decodeURIComponent(currentRoute.replace('#track-order/', '').trim());
    }
    if (currentRoute.startsWith('#track/')) {
      return decodeURIComponent(currentRoute.replace('#track/', '').trim());
    }
    return '';
  }, [initialOrderId, currentRoute]);

  const [searchInput, setSearchInput] = useState(routeOrderId || '');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showCredentials, setShowCredentials] = useState<Record<number, boolean>>({});
  const [paymentRefInput, setPaymentRefInput] = useState('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [proofSubmittedSuccess, setProofSubmittedSuccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync with route or state updates
  useEffect(() => {
    if (routeOrderId) {
      setSearchInput(routeOrderId);
      findAndSetOrder(routeOrderId);
    } else if (!hasSearched && state.orders.length > 0) {
      // If user has orders and didn't specify one, default to their latest order if logged in
      const userOrders = currentUser
        ? state.orders.filter((o) => o.userId === currentUser.id || o.customerPhone === currentUser.phone)
        : [];
      if (userOrders.length > 0) {
        const latest = userOrders[0];
        setSearchInput(latest.orderNumber);
        setActiveOrder(latest);
        setHasSearched(true);
      }
    }
  }, [routeOrderId, state.orders, currentUser]);

  const findAndSetOrder = (queryStr: string) => {
    const q = queryStr.trim().toLowerCase();
    if (!q) {
      setActiveOrder(null);
      setHasSearched(true);
      return;
    }

    const found = state.orders.find(
      (o) =>
        o.id.toLowerCase() === q ||
        o.orderNumber.toLowerCase() === q ||
        o.orderNumber.toLowerCase() === `ord-${q}` ||
        `ord-${o.orderNumber.toLowerCase()}` === q ||
        o.customerPhone.replace(/[^0-9]/g, '') === q.replace(/[^0-9]/g, '') ||
        (o.paymentReference && o.paymentReference.toLowerCase() === q)
    );

    setActiveOrder(found || null);
    setHasSearched(true);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    findAndSetOrder(searchInput);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      if (searchInput) {
        findAndSetOrder(searchInput);
      }
      setIsRefreshing(false);
    }, 600);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleCredentialVisibility = (idx: number) => {
    setShowCredentials((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSendPaymentProof = () => {
    if (!activeOrder || !paymentRefInput.trim()) return;
    setIsSubmittingProof(true);
    try {
      updateOrderStatus(
        activeOrder.id,
        'processing',
        `تم إرفاق الرقم المرجعي للدفع من صفحة التتبع: ${paymentRefInput.trim()}`,
        `Payment reference added from tracking view: ${paymentRefInput.trim()}`
      );
      setProofSubmittedSuccess(true);
      setPaymentRefInput('');
      setTimeout(() => {
        setProofSubmittedSuccess(false);
        findAndSetOrder(activeOrder.orderNumber);
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const handleWhatsAppInquiry = () => {
    if (!activeOrder) return;
    const msg = encodeURIComponent(
      `مرحباً متجر قويدر ستور 🎮🇯🇴\nأود الاستفسار عن حالة طلبي:\n- رقم الطلب: ${activeOrder.orderNumber}\n- العميل: ${activeOrder.customerName}\n- الحالة الحالية: ${activeOrder.status}`
    );
    window.open(`https://wa.me/${state.settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${msg}`, '_blank');
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  // Status visual mapping helper
  const getStatusDetails = (status: OrderStatus) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return {
          titleAr: 'تم التسليم بنجاح ✅',
          titleEn: 'Delivered & Fulfilled ✅',
          descAr: 'تم تسليم الأكواد الرقمية وبيانات التفعيل لحسابك والواتساب بنجاح.',
          descEn: 'Digital codes and activation instructions have been delivered successfully.',
          badgeBg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
          stepIndex: 4,
          icon: CheckCircle2,
          color: 'emerald'
        };
      case 'processing':
        return {
          titleAr: 'جاري التجهيز والشراء ⚡',
          titleEn: 'Processing & Purchasing ⚡',
          descAr: 'تم تأكيد الدفع وجاري تجهيز الكود وشراء البطاقة لك مباشرة.',
          descEn: 'Payment confirmed! We are purchasing and preparing your digital key.',
          badgeBg: 'bg-purple-950/80 border-purple-500/50 text-purple-300',
          stepIndex: 3,
          icon: Zap,
          color: 'purple'
        };
      case 'payment_confirmed':
        return {
          titleAr: 'تم تأكيد الدفع (كليك) 💳',
          titleEn: 'Payment Confirmed (CliQ) 💳',
          descAr: 'تم استلام وتأكيد الحوالة بنجاح، جاري تحويل الطلب لقسم التجهيز الفوري.',
          descEn: 'Payment received successfully. Routing to provisioning team.',
          badgeBg: 'bg-blue-950/80 border-blue-500/50 text-blue-300',
          stepIndex: 2,
          icon: Check,
          color: 'blue'
        };
      case 'payment_proof':
        return {
          titleAr: 'تم إرفاق إثبات الدفع ⏳',
          titleEn: 'Payment Proof Submitted ⏳',
          descAr: 'تم استلام الرقم المرجعي أو الإشعار وجاري التحقق من كليك / الحساب البنكي.',
          descEn: 'Payment reference submitted. Verifying bank transaction.',
          badgeBg: 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300',
          stepIndex: 2,
          icon: Clock,
          color: 'cyan'
        };
      case 'cancelled':
        return {
          titleAr: 'تم إلغاء الطلب ❌',
          titleEn: 'Order Cancelled ❌',
          descAr: 'تم إلغاء هذا الطلب. يرجى التواصل معنا عبر واتساب لأي استفسار.',
          descEn: 'This order has been cancelled. Contact support for assistance.',
          badgeBg: 'bg-rose-950/80 border-rose-500/50 text-rose-300',
          stepIndex: 0,
          icon: AlertCircle,
          color: 'rose'
        };
      case 'refunded':
        return {
          titleAr: 'تم استرداد المبلغ ↩️',
          titleEn: 'Order Refunded ↩️',
          descAr: 'تم إعادة وتحويل المبلغ لحساب المشتري بنجاح.',
          descEn: 'The order amount has been refunded to your payment source.',
          badgeBg: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
          stepIndex: 0,
          icon: RefreshCw,
          color: 'amber'
        };
      case 'pending':
      case 'pending_payment':
      default:
        return {
          titleAr: 'بانتظار تأكيد الدفع ⏳',
          titleEn: 'Awaiting Payment ⏳',
          descAr: 'تم تسجيل الطلب وبانتظار تحويل كليك أو الدفع لتأكيد التجهيز الفوري.',
          descEn: 'Order placed. Awaiting CliQ or bank transfer confirmation to start processing.',
          badgeBg: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
          stepIndex: 1,
          icon: Clock,
          color: 'amber'
        };
    }
  };

  // Recent orders list for quick 1-click lookup
  const recentOrders = useMemo(() => {
    if (!state.orders || state.orders.length === 0) return [];
    if (currentUser) {
      return state.orders.filter(
        (o) => o.userId === currentUser.id || o.customerPhone === currentUser.phone
      ).slice(0, 4);
    }
    return state.orders.slice(0, 3);
  }, [state.orders, currentUser]);

  const activeStatusMeta = activeOrder ? getStatusDetails(activeOrder.status) : null;

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
      
      {/* Top Header Card */}
      <div className="relative p-6 sm:p-8 rounded-3xl glass-card border border-white/10 overflow-hidden shadow-2xl">
        <div className="absolute top-0 end-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 bg-purple-950/60 px-3 py-1 rounded-full border border-purple-500/30">
              <Package className="w-4 h-4" />
              <span>{language === 'ar' ? 'نظام التتبع المباشر للطلبات' : 'Live Order Tracking System'}</span>
            </div>
            
            <button
              onClick={() => navigateTo('#orders')}
              className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <span>{language === 'ar' ? 'عرض كافة طلباتي' : 'View All My Orders'}</span>
              {language === 'ar' ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100 font-cairo">
              {language === 'ar' ? 'تتبع حالة طلبك والأكواد الرقمية 📍' : 'Track Your Order & Digital Keys 📍'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {language === 'ar'
                ? 'أدخل رقم الطلب الصادر لك (مثل ORD-1001) أو رقم هاتفك لمتابعة حالة الشراء والتجهيز واستلام بيانات التفعيل فوراً.'
                : 'Enter your Order ID (e.g. ORD-1001) or phone number to view real-time processing status and digital activation keys.'}
            </p>
          </div>

          {/* Search Box Form */}
          <form onSubmit={handleSearchSubmit} className="pt-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 bg-white/5 p-1.5 sm:p-2 rounded-2xl sm:rounded-full border border-white/15 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/30 transition-all shadow-inner">
              <div className="flex items-center gap-2 flex-1 px-3 py-1">
                <Search className="w-5 h-5 text-purple-400 flex-shrink-0" />
                <input
                  id="order-tracking-search-input"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={
                    language === 'ar'
                      ? 'أدخل رقم الطلب (مثال: ORD-1001) أو رقم الواتساب...'
                      : 'Enter Order Number (e.g. ORD-1001) or Phone...'
                  }
                  className="w-full min-h-[44px] bg-transparent text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none uppercase font-mono"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setActiveOrder(null);
                      setHasSearched(false);
                    }}
                    className="p-1 rounded-full text-slate-400 hover:text-white"
                  >
                    ×
                  </button>
                )}
              </div>

              <button
                id="order-tracking-submit-btn"
                type="submit"
                className="min-h-[44px] px-6 py-2.5 rounded-xl sm:rounded-full bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-purple-900/40 active:scale-98 transition-all flex items-center justify-center gap-2 font-cairo flex-shrink-0"
              >
                <Search className="w-4 h-4" />
                <span>{language === 'ar' ? 'تتبع الطلب الآن' : 'Track Order'}</span>
              </button>
            </div>
          </form>

          {/* Quick Select Recent Orders Chips */}
          {recentOrders.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-purple-400" />
                <span>{language === 'ar' ? 'طلبات سريعة:' : 'Quick Select:'}</span>
              </span>
              {recentOrders.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    setSearchInput(o.orderNumber);
                    setActiveOrder(o);
                    setHasSearched(true);
                  }}
                  className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                    activeOrder?.id === o.id
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  <span>{o.orderNumber}</span>
                  <span className="text-[10px] opacity-75">
                    ({formatPrice(o.totalJOD, o.totalUSD)})
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Order Details View */}
      {activeOrder && activeStatusMeta ? (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          
          {/* Real-time Status Card with Pulse Indicator */}
          <div className="p-5 sm:p-7 rounded-3xl glass-card border border-white/10 space-y-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-slate-400 font-semibold">{t.orderNumber}:</span>
                  <span className="font-mono text-base sm:text-xl font-black text-purple-300">
                    {activeOrder.orderNumber}
                  </span>
                  <button
                    onClick={() => copyToClipboard(activeOrder.orderNumber, 'order_id_top')}
                    className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                    title={language === 'ar' ? 'نسخ رقم الطلب' : 'Copy Order ID'}
                  >
                    {copiedKey === 'order_id_top' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <div className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-2">
                  <span>{language === 'ar' ? 'تاريخ الإنشاء:' : 'Created on:'}</span>
                  <span className="text-slate-300 font-semibold">
                    {new Date(activeOrder.createdAt).toLocaleString(language === 'ar' ? 'ar-JO' : 'en-US')}
                  </span>
                </div>
              </div>

              {/* Status Badge & Refresh Button */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition-all ${
                    isRefreshing ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                  title={language === 'ar' ? 'تحديث الحالة لحظياً' : 'Live Refresh'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
                </button>

                <div className={`px-4 py-2 rounded-2xl border text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg ${activeStatusMeta.badgeBg}`}>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-current" />
                  </span>
                  <span>{language === 'ar' ? activeStatusMeta.titleAr : activeStatusMeta.titleEn}</span>
                </div>
              </div>
            </div>

            {/* Interactive Visual Progress Stepper */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                <span>{language === 'ar' ? 'مراحل تنفيذ وتجهيز الطلب:' : 'Fulfillment Stages:'}</span>
                <span className="text-purple-300 font-mono">
                  {language === 'ar' ? `المرحلة ${Math.min(activeStatusMeta.stepIndex, 4)} من 4` : `Step ${Math.min(activeStatusMeta.stepIndex, 4)} of 4`}
                </span>
              </div>

              {/* Stepper Bar */}
              <div className="relative">
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-emerald-500 transition-all duration-500 rounded-full"
                    style={{
                      width: `${(Math.min(activeStatusMeta.stepIndex, 4) / 4) * 100}%`
                    }}
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 pt-4 text-center">
                  
                  {/* Step 1 */}
                  <div className="space-y-1.5 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-lg shadow-purple-900/50">
                      ✓
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-slate-200">
                      {language === 'ar' ? 'استلام الطلب' : 'Received'}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 hidden sm:block">
                      {language === 'ar' ? 'تم تسجيل البيانات' : 'Order Placed'}
                    </span>
                  </div>

                  {/* Step 2 */}
                  <div className="space-y-1.5 flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        activeStatusMeta.stepIndex >= 2
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50'
                          : activeOrder.paymentReference
                          ? 'bg-amber-600 text-white animate-pulse'
                          : 'bg-slate-800 text-slate-500 border border-white/10'
                      }`}
                    >
                      {activeStatusMeta.stepIndex >= 2 ? '✓' : '2'}
                    </div>
                    <span className={`text-[10px] sm:text-xs font-bold ${activeStatusMeta.stepIndex >= 2 ? 'text-slate-200' : 'text-slate-400'}`}>
                      {language === 'ar' ? 'تأكيد الدفع' : 'Payment Verified'}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 hidden sm:block">
                      {language === 'ar' ? 'كليك / تحويل بنكي' : 'CliQ / Bank'}
                    </span>
                  </div>

                  {/* Step 3 */}
                  <div className="space-y-1.5 flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        activeStatusMeta.stepIndex >= 3
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50'
                          : 'bg-slate-800 text-slate-500 border border-white/10'
                      }`}
                    >
                      {activeStatusMeta.stepIndex >= 3 ? '✓' : '3'}
                    </div>
                    <span className={`text-[10px] sm:text-xs font-bold ${activeStatusMeta.stepIndex >= 3 ? 'text-slate-200' : 'text-slate-400'}`}>
                      {language === 'ar' ? 'الشراء والتجهيز' : 'Purchasing Key'}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 hidden sm:block">
                      {language === 'ar' ? 'توليد كود التفعيل' : 'Generating code'}
                    </span>
                  </div>

                  {/* Step 4 */}
                  <div className="space-y-1.5 flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        activeStatusMeta.stepIndex >= 4
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50 ring-2 ring-emerald-400/40'
                          : 'bg-slate-800 text-slate-500 border border-white/10'
                      }`}
                    >
                      {activeStatusMeta.stepIndex >= 4 ? '✓' : '4'}
                    </div>
                    <span className={`text-[10px] sm:text-xs font-bold ${activeStatusMeta.stepIndex >= 4 ? 'text-emerald-300' : 'text-slate-400'}`}>
                      {language === 'ar' ? 'تم التسليم' : 'Delivered'}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 hidden sm:block">
                      {language === 'ar' ? 'واتساب / إيميل' : 'WhatsApp / Email'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Explanation Box */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-slate-300 flex items-start gap-3">
                <activeStatusMeta.icon className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-slate-100">
                    {language === 'ar' ? activeStatusMeta.titleAr : activeStatusMeta.titleEn}
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    {language === 'ar' ? activeStatusMeta.descAr : activeStatusMeta.descEn}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Payment Action: Attach CliQ Reference */}
          {(activeOrder.status === 'pending' || activeOrder.status === 'pending_payment') && (
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-amber-950/40 border border-amber-500/40 space-y-4 shadow-xl">
              <div className="flex items-center gap-2.5 text-amber-300 font-bold text-sm font-cairo">
                <CreditCard className="w-5 h-5 text-amber-400" />
                <span>
                  {language === 'ar'
                    ? 'هل قمت بالتحويل عبر كليك (CliQ) أو البنك؟ أرسل الرقم المرجعي للتأكيد الفوري:'
                    : 'Transferred via CliQ? Submit your transaction reference for instant confirmation:'}
                </span>
              </div>

              <div className="text-xs text-slate-300 leading-relaxed">
                <p>
                  {language === 'ar'
                    ? `يرجى إرسال مبلغ ${formatPrice(activeOrder.totalJOD, activeOrder.totalUSD)} إلى الاسم المستعار (Alias): `
                    : `Please transfer ${formatPrice(activeOrder.totalJOD, activeOrder.totalUSD)} to CliQ Alias: `}
                  <span className="font-mono font-bold text-purple-300 bg-white/10 px-2 py-0.5 rounded-md">
                    {state.settings.cliqAlias}
                  </span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={paymentRefInput}
                  onChange={(e) => setPaymentRefInput(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: رقم العملية 92837492 أو اسم المحوّل...' : 'e.g. Transaction Ref or Sender Name...'}
                  className="flex-1 min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-900 border border-amber-500/40 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSendPaymentProof}
                  disabled={isSubmittingProof || !paymentRefInput.trim()}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 flex-shrink-0"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{language === 'ar' ? 'إرسال الرقم المرجعي' : 'Submit Reference'}</span>
                </button>
              </div>

              {proofSubmittedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{language === 'ar' ? 'تم استلام الرقم المرجعي بنجاح وجاري التحقق والتجهيز!' : 'Reference received successfully!'}</span>
                </div>
              )}
            </div>
          )}

          {/* Delivered Digital Codes & Accounts Box (If Delivered) */}
          {(activeOrder.digitalDeliveries && activeOrder.digitalDeliveries.length > 0) || activeOrder.status === 'delivered' || activeOrder.status === 'completed' ? (
            <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-teal-950/30 to-purple-950/40 border border-emerald-500/50 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-emerald-300 font-bold text-sm sm:text-base font-cairo">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <span>{language === 'ar' ? 'بيانات التفعيل والأكواد الرقمية المستلمة 🔑' : 'Delivered Digital Keys & Credentials 🔑'}</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-300 bg-emerald-900/60 px-3 py-1 rounded-full border border-emerald-500/40">
                  {language === 'ar' ? 'تسليم رسمي ومضمون' : 'Guaranteed Official'}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {language === 'ar'
                  ? 'يمكنك نسخ كود التفعيل مباشرة أو استخدام بيانات الحساب المرفقة. تم إرسال نسخة مطابقة إلى رقم الواتساب والإيميل الخاص بك أيضاً.'
                  : 'You can copy your code directly or use the credentials below. A backup was also sent to your WhatsApp.'}
              </p>

              {/* Digital Items List */}
              {activeOrder.digitalDeliveries && activeOrder.digitalDeliveries.length > 0 ? (
                <div className="space-y-3 pt-2">
                  {activeOrder.digitalDeliveries.map((deliv, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                        <span>{deliv.itemTitle}</span>
                        <span className="text-[11px] text-emerald-400">#Code-{idx + 1}</span>
                      </div>

                      {/* Code Box */}
                      <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-900 border border-emerald-500/40">
                        <div className="font-mono text-sm sm:text-base font-black text-emerald-300 tracking-wider break-all">
                          {showCredentials[idx] ? deliv.codeOrAccount : '••••••••••••••••••••'}
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleCredentialVisibility(idx)}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                            title={showCredentials[idx] ? 'إخفاء' : 'إظهار'}
                          >
                            {showCredentials[idx] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => copyToClipboard(deliv.codeOrAccount, `deliv_${idx}`)}
                            className="min-h-[36px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition-all"
                          >
                            {copiedKey === `deliv_${idx}` ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>{t.copied}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>{t.copyCode}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Instructions */}
                      {(deliv.instructionsAr || deliv.instructionsEn) && (
                        <div className="text-[11px] text-slate-400 bg-white/5 p-2.5 rounded-xl border border-white/5 space-y-1">
                          <span className="font-bold text-slate-300 block">
                            {language === 'ar' ? 'تعليمات التفعيل:' : 'Activation Guide:'}
                          </span>
                          <p>{language === 'ar' ? deliv.instructionsAr : deliv.instructionsEn}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 text-xs text-slate-300">
                  <p>
                    {language === 'ar'
                      ? 'تم إرسال الكود وبيانات الحساب مباشرة إلى رقم الواتساب المسجل في الطلب. تواصل معنا في حال احتجت أي مساعدة في التفعيل!'
                      : 'Digital codes were dispatched directly to your registered WhatsApp number.'}
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {/* 2-Column Grid: Left: Items Ordered & Timeline, Right: Customer & Payment Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column (7 Cols): Items & Timeline */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Items Card */}
              <div className="p-5 sm:p-6 rounded-3xl glass-card border border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm sm:text-base font-bold text-slate-100 font-cairo flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-400" />
                    <span>{language === 'ar' ? 'المنتجات والبطاقات المطلوبة:' : 'Ordered Items:'}</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {activeOrder.items.length} {language === 'ar' ? 'منتجات' : 'items'}
                  </span>
                </div>

                <div className="space-y-3">
                  {activeOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3 hover:border-purple-500/30 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.productNameAr}
                            className="w-12 h-12 rounded-xl object-cover border border-white/10 flex-shrink-0 bg-slate-800"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
                            <Package className="w-6 h-6" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                            {language === 'ar' ? item.productNameAr : item.productNameEn}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="font-mono font-bold text-purple-300">
                              {formatPrice(item.priceJOD, item.priceUSD)}
                            </span>
                            <span>×</span>
                            <span className="font-bold text-slate-300">{item.quantity}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-end flex-shrink-0">
                        <span className="text-xs sm:text-sm font-black text-emerald-400 font-display">
                          {formatPrice(item.priceJOD * item.quantity, item.priceUSD * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Timeline Events Card */}
              {activeOrder.timeline && activeOrder.timeline.length > 0 && (
                <div className="p-5 sm:p-6 rounded-3xl glass-card border border-white/10 space-y-4">
                  <h3 className="text-sm sm:text-base font-bold text-slate-100 font-cairo flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span>{language === 'ar' ? 'سجل وتاريخ الأحداث للطلب:' : 'Order Activity Log:'}</span>
                  </h3>

                  <div className="relative border-s border-purple-500/30 ms-3 space-y-4 ps-4 pt-1">
                    {activeOrder.timeline.map((event, idx) => (
                      <div key={idx} className="relative space-y-1">
                        <span className="absolute -start-[21px] top-1 w-2.5 h-2.5 rounded-full bg-purple-500 ring-4 ring-slate-900" />
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-purple-300">
                            {language === 'ar' ? event.noteAr : event.noteEn}
                          </span>
                          <span className="text-slate-500 font-mono">
                            {new Date(event.timestamp).toLocaleTimeString(language === 'ar' ? 'ar-JO' : 'en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {new Date(event.timestamp).toLocaleDateString(language === 'ar' ? 'ar-JO' : 'en-US')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (5 Cols): Customer, Payment & Actions */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Payment & Invoice Summary */}
              <div className="p-5 sm:p-6 rounded-3xl glass-card border border-white/10 space-y-4">
                <h3 className="text-sm sm:text-base font-bold text-slate-100 font-cairo flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span>{language === 'ar' ? 'ملخص الفاتورة والحساب:' : 'Invoice Summary:'}</span>
                </h3>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t.subtotal}:</span>
                    <span>{formatPrice(activeOrder.subtotalJOD, activeOrder.subtotalUSD)}</span>
                  </div>

                  {activeOrder.discountJOD > 0 && (
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>{t.promoDiscount}:</span>
                      <span>-{formatPrice(activeOrder.discountJOD, activeOrder.discountUSD)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-1.5 border-t border-white/10">
                    <span className="text-slate-400 flex items-center gap-1">
                      {activeOrder.fulfillmentType === 'pickup' ? (
                        <Store className="w-3.5 h-3.5 text-purple-400" />
                      ) : (
                        <Truck className="w-3.5 h-3.5 text-purple-400" />
                      )}
                      <span>
                        {activeOrder.fulfillmentType === 'pickup'
                          ? language === 'ar'
                            ? 'استلام من الفرع'
                            : 'Store Pickup'
                          : language === 'ar'
                          ? `توصيل (${activeOrder.shippingGovernorate || 'الأردن'})`
                          : 'Delivery'}
                      </span>
                    </span>
                    <span>
                      {activeOrder.shippingCostJOD === 0
                        ? language === 'ar'
                          ? 'مجاناً ⚡'
                          : 'FREE'
                        : `+${formatPrice(activeOrder.shippingCostJOD, activeOrder.shippingCostUSD)}`}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-300">{language === 'ar' ? 'المجموع النهائي:' : 'Final Total:'}</span>
                    <div className="text-xl sm:text-2xl font-black text-emerald-400 font-display">
                      {formatPrice(activeOrder.totalJOD, activeOrder.totalUSD)}
                    </div>
                  </div>
                </div>

                {/* Payment Method Details */}
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">{language === 'ar' ? 'طريقة الدفع:' : 'Payment Method:'}</span>
                    <span className="font-bold text-purple-300 uppercase">
                      {activeOrder.paymentMethod === 'cliq'
                        ? 'CliQ (Jordan)'
                        : activeOrder.paymentMethod === 'bank_transfer'
                        ? 'Bank Transfer'
                        : 'Cash'}
                    </span>
                  </div>
                  {activeOrder.paymentReference && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{language === 'ar' ? 'الرقم المرجعي:' : 'Reference:'}</span>
                      <span className="font-mono text-slate-200 font-bold">
                        {activeOrder.paymentReference}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer & Fulfillment Info Card */}
              <div className="p-5 sm:p-6 rounded-3xl glass-card border border-white/10 space-y-4">
                <h3 className="text-sm sm:text-base font-bold text-slate-100 font-cairo flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-400" />
                  <span>{language === 'ar' ? 'بيانات المشتري والتسليم:' : 'Customer & Delivery:'}</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span className="font-bold text-slate-200">{activeOrder.customerName}</span>
                  </div>

                  <div className="flex items-center gap-2.5 text-slate-300">
                    <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="font-mono text-slate-200" dir="ltr">
                      {activeOrder.customerPhone}
                    </span>
                  </div>

                  {activeOrder.customerEmail && (
                    <div className="flex items-center gap-2.5 text-slate-300">
                      <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <span className="font-mono text-slate-200">{activeOrder.customerEmail}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/10 space-y-1 text-slate-400">
                    <span className="font-bold text-slate-300 block">
                      {language === 'ar' ? 'قناة الاستلام المفضلة:' : 'Preferred Channel:'}
                    </span>
                    <span className="capitalize text-purple-300 font-semibold">
                      {activeOrder.preferredDeliveryMethod === 'both'
                        ? language === 'ar' ? 'واتساب وإيميل معاً' : 'WhatsApp & Email'
                        : activeOrder.preferredDeliveryMethod === 'whatsapp'
                        ? language === 'ar' ? 'عبر واتساب فقط' : 'WhatsApp Only'
                        : language === 'ar' ? 'عبر الإيميل فقط' : 'Email Only'}
                    </span>
                  </div>

                  {activeOrder.shippingAddress && (
                    <div className="pt-2 border-t border-white/10 space-y-1 text-slate-400">
                      <span className="font-bold text-slate-300 block">
                        {language === 'ar' ? 'عنوان التوصيل:' : 'Delivery Address:'}
                      </span>
                      <p className="text-slate-200">{activeOrder.shippingAddress}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Box */}
              <div className="space-y-3">
                <button
                  id="tracking-whatsapp-help-btn"
                  onClick={handleWhatsAppInquiry}
                  className="w-full min-h-[44px] py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 font-cairo"
                >
                  <MessageCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{language === 'ar' ? 'استفسار عن الطلب عبر الواتساب' : 'Chat on WhatsApp about this Order'}</span>
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={handlePrintInvoice}
                    className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl glass-panel text-slate-300 hover:text-white border border-white/10 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'طباعة الإيصال' : 'Print Receipt'}</span>
                  </button>

                  <button
                    onClick={() => navigateTo('#support')}
                    className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl glass-panel text-slate-300 hover:text-white border border-white/10 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                    <span>{language === 'ar' ? 'تذكرة دعم' : 'Support Ticket'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : hasSearched ? (
        /* Empty / Not Found State */
        <div className="p-10 sm:p-14 rounded-3xl glass-card border border-white/10 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto shadow-lg shadow-rose-900/30">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold text-slate-100 font-cairo">
              {language === 'ar' ? 'لم يتم العثور على طلب بهذا الرقم' : 'No Order Found'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
              {language === 'ar'
                ? `لم نتمكن من إيجاد طلب مطابق لـ "${searchInput}". يرجى التأكد من الرقم أو البحث برقم الواتساب أو التواصل مع فريقنا مباشرة.`
                : `We couldn't find an order matching "${searchInput}". Please check your order number or phone.`}
            </p>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleWhatsAppInquiry}
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{language === 'ar' ? 'تواصل مع الدعم عبر واتساب' : 'Contact WhatsApp Support'}</span>
            </button>

            <button
              onClick={() => navigateTo('#orders')}
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-full glass-panel text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-all"
            >
              {language === 'ar' ? 'تصفح قائمة طلباتي' : 'View My Orders List'}
            </button>
          </div>
        </div>
      ) : (
        /* Initial Guide / How-to card */
        <div className="p-8 sm:p-12 rounded-3xl glass-panel border border-white/10 text-center max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mx-auto">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-200 font-cairo">
            {language === 'ar' ? 'بانتظار إدخال رقم الطلب للبحث' : 'Enter Order Number to Track'}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {language === 'ar'
              ? 'تصلك أرقام الطلبات فور إتمام الشراء عبر الواتساب والإيميل وتبدأ عادة بـ ORD-'
              : 'Order IDs are generated at checkout and sent to your WhatsApp/Email starting with ORD-'}
          </p>
        </div>
      )}
    </div>
  );
};
