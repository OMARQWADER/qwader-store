import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Order, OrderStatus } from '../types';
import {
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  MessageCircle,
  Send,
  Sparkles,
  Zap,
  Key,
  ShieldCheck,
  CreditCard,
  RefreshCw
} from 'lucide-react';

export const OrdersView: React.FC = () => {
  const { state, currentUser, formatPrice, updateOrderStatus, isOrdersLoading, language, navigateTo, t } = useStore();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [paymentProofInputs, setPaymentProofInputs] = useState<Record<string, string>>({});

  // Filter orders for current user or show all if guest/admin
  const userOrders = (state?.orders || []).filter((o) => {
    if (currentUser?.role === 'customer') {
      return o.userId === currentUser.id || o.customerPhone === currentUser.phone;
    }
    return true;
  });

  const filteredOrders = userOrders.filter((o) => {
    if (selectedStatus !== 'all' && o.status !== selectedStatus) return false;
    return true;
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSendProof = (orderId: string) => {
    const proof = paymentProofInputs[orderId];
    if (!proof || !proof.trim()) return;
    updateOrderStatus(orderId, 'processing', undefined, proof.trim());
    setPaymentProofInputs((prev) => ({ ...prev, [orderId]: '' }));
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t.status_completed}</span>
          </span>
        );
      case 'processing':
        return (
          <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-violet-950/80 border border-violet-500/40 text-violet-300 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" />
            <span>{t.status_processing}</span>
          </span>
        );
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-950/80 border border-amber-500/40 text-amber-300 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{t.status_pending}</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-950/80 border border-rose-500/40 text-rose-300 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{t.status_cancelled}</span>
          </span>
        );
    }
  };

  const handleWhatsAppInquiry = (order: Order) => {
    const text = encodeURIComponent(
      `مرحباً متجر قويدر ستور 🎮\nأستفسر عن طلبي رقم: ${order.orderNumber}\nباسم: ${order.customerName}`
    );
    window.open(`https://wa.me/${state.settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl glass-card border border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400 mb-1">
            <Package className="w-4 h-4" />
            <span>{t.myOrders}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 font-cairo">
            {language === 'ar' ? 'سجل وتتبع الطلبات والأكواد' : 'Order Tracking & Keys'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {language === 'ar'
              ? 'متابعة حالة المعالجة واستلام الأكواد الرقمية والحسابات فوراً'
              : 'Track order timeline and copy your digital game keys instantly'}
          </p>
        </div>

        {/* Filter Status Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(['all', 'pending', 'processing', 'completed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                selectedStatus === st
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                  : 'glass-panel border border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'all'
                ? language === 'ar'
                  ? 'الكل'
                  : 'All'
                : st === 'pending'
                ? t.status_pending
                : st === 'processing'
                ? t.status_processing
                : t.status_completed}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {isOrdersLoading && filteredOrders.length === 0 ? (
        <div className="p-12 rounded-3xl glass-panel border border-white/10 text-center max-w-lg mx-auto space-y-3">
          <RefreshCw className="w-8 h-8 text-purple-400 mx-auto animate-spin" />
          <p className="text-xs font-bold text-slate-300 font-cairo">
            {language === 'ar' ? 'جاري تحميل سجل الطلبات...' : 'Loading orders...'}
          </p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 rounded-3xl glass-panel border border-white/10 text-center max-w-lg mx-auto">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-100 mb-2 font-cairo">
            {language === 'ar' ? 'لا توجد طلبات مسجلة بهذا الفلتر' : 'No orders found'}
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            {language === 'ar'
              ? 'تصفح المتجر الآن واختر ألعابك المفضلة لتصلك أكوادها بدقائق!'
              : 'Browse our catalog and place your first digital order!'}
          </p>
          <button
            onClick={() => navigateTo('#store')}
            className="px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 transition-all"
          >
            {t.exploreStore}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              id={`order-card-${order.id}`}
              className="p-6 rounded-3xl glass-card border border-white/10 space-y-6"
            >
              {/* Top Order Info Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold">{t.orderNumber}:</span>
                    <span className="font-mono text-sm font-black text-purple-300">{order.orderNumber}</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {new Date(order.createdAt).toLocaleString(language === 'ar' ? 'ar-JO' : 'en-US')}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-end">
                    <span className="text-[11px] text-slate-400 font-semibold block">{t.cartTotal}</span>
                    <span className="text-base font-black text-slate-100 font-display">
                      {formatPrice(order.totalJOD, order.totalUSD)}
                    </span>
                  </div>
                  <div>{getStatusBadge(order.status)}</div>
                </div>
              </div>

              {/* Timeline Stepper for On-Demand Purchasing */}
              <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                <div className="space-y-1">
                  <div className="w-7 h-7 mx-auto rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
                    ✓
                  </div>
                  <span className="font-bold text-slate-300">{language === 'ar' ? 'استلام الطلب' : 'Request Received'}</span>
                </div>

                <div className="space-y-1">
                  <div
                    className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold ${
                      order.status === 'payment_confirmed' || order.status === 'processing' || order.status === 'delivered' || order.status === 'completed'
                        ? 'bg-purple-600 text-white'
                        : order.paymentReference
                        ? 'bg-amber-600 text-white animate-pulse'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    2
                  </div>
                  <span className="font-bold text-slate-300">{language === 'ar' ? 'تأكيد الدفع (كليك)' : 'Payment Verified'}</span>
                </div>

                <div className="space-y-1">
                  <div
                    className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold ${
                      order.status === 'processing' || order.status === 'delivered' || order.status === 'completed'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    3
                  </div>
                  <span className="font-bold text-slate-300">{language === 'ar' ? 'جاري الشراء والتجهيز' : 'Purchasing Item'}</span>
                </div>

                <div className="space-y-1">
                  <div
                    className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold ${
                      order.status === 'delivered' || order.status === 'completed'
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    4
                  </div>
                  <span className="font-bold text-slate-300">{language === 'ar' ? 'تم التسليم عبر الواتساب' : 'Delivered to You'}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 glass-panel p-4 rounded-2xl border border-white/10">
                <h4 className="text-xs font-bold text-slate-400 font-cairo">
                  {language === 'ar' ? 'المنتجات المطلوبة للشراء:' : 'Requested Items for Purchase:'}
                </h4>
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      <span className="text-slate-200 font-semibold">
                        {language === 'ar' ? item.productNameAr : item.productNameEn}
                      </span>
                      <span className="text-[11px] text-slate-400">({item.quantity}×)</span>
                    </div>
                    <span className="font-bold text-purple-300 font-display">
                      {formatPrice(item.priceJOD * item.quantity, item.priceUSD * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Delivered Note Box */}
              {(order.status === 'delivered' || order.status === 'completed') && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/40 space-y-2 animate-in zoom-in-95">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 font-cairo">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>{language === 'ar' ? 'تم شراء وتجهيز طلبك وتسليمه بنجاح 🎉' : 'Order Purchased & Delivered Successfully 🎉'}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      {language === 'ar' ? 'مكتمل' : 'Fulfilled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {language === 'ar'
                      ? 'تم إرسال كافة التفاصيل والتفعيل مباشرة إلى رقم الواتساب أو الإيميل الخاص بك. لأي مساعدة إضافية لا تتردد بالتواصل معنا!'
                      : 'All details and activation info were delivered to your WhatsApp/Email. Reach out if you need further help!'}
                  </p>
                </div>
              )}

              {/* Pending Payment Proof Action */}
              {order.status === 'pending' && (
                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    <span>
                      {language === 'ar' ? 'هل قمت بالتحويل عبر كليك؟ أدخل الرقم المرجعي لتأكيد فوري:' : 'Paid via CliQ? Enter your transaction reference:'}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={paymentProofInputs[order.id] || ''}
                      onChange={(e) =>
                        setPaymentProofInputs((prev) => ({ ...prev, [order.id]: e.target.value }))
                      }
                      placeholder={language === 'ar' ? 'رقم عملية التحويل أو كود كليك...' : 'Reference ID / Note...'}
                      className="flex-1 p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100 focus:border-purple-500 focus:outline-none font-mono"
                    />
                    <button
                      onClick={() => handleSendProof(order.id)}
                      className="px-4 py-2 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-all"
                    >
                      {language === 'ar' ? 'إرسال الإشعار' : 'Submit'}
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>طريقة الدفع:</span>
                  <span className="font-bold text-slate-200 uppercase">{order.paymentMethod}</span>
                  {order.paymentReference && (
                    <span className="text-[11px] text-slate-500 font-mono">({order.paymentReference})</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateTo(`#track-order/${order.orderNumber}`)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all"
                  >
                    <span>{language === 'ar' ? 'تتبع مباشر 📍' : 'Track Live 📍'}</span>
                  </button>

                  <button
                    onClick={() => handleWhatsAppInquiry(order)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'متابعة الطلب عبر واتساب' : 'WhatsApp Status'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
