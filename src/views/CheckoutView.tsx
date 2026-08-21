import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { PaymentMethod } from '../types';
import confetti from 'canvas-confetti';
import {
  ShoppingBag,
  CreditCard,
  CheckCircle2,
  Copy,
  Check,
  Zap,
  MessageCircle,
  Phone,
  Mail,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  HelpCircle,
  Truck,
  Building,
  DollarSign,
  MapPin,
  Store,
  Clock,
  Info,
  Navigation
} from 'lucide-react';

export const CheckoutView: React.FC = () => {
  const {
    state,
    currentUser,
    cart,
    clearCart,
    formatPrice,
    appliedPromo,
    applyPromoCode,
    removePromoCode,
    createOrder,
    language,
    navigateTo,
    t,
  } = useStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email || '');
  const [deliveryMethod, setDeliveryMethod] = useState<'whatsapp' | 'email' | 'both'>('whatsapp');
  
  // Fulfillment state (Pickup vs Delivery)
  const [fulfillmentType, setFulfillmentType] = useState<'pickup' | 'delivery'>(
    state.settings.fulfillment?.allowDelivery ? 'delivery' : 'pickup'
  );
  const activeGovernorates = (state.settings.fulfillment?.governorates || []).filter((g) => g.active);
  const [selectedGovId, setSelectedGovId] = useState<string>(
    activeGovernorates[0]?.id || 'gov-amman'
  );
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');
  const activeDeliveryCompanies = (state.settings.fulfillment?.deliveryCompanies || []).filter((c) => c.active);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    activeDeliveryCompanies[0]?.id || ''
  );

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cliq');
  const [paymentReference, setPaymentReference] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const subtotalJOD = cart.reduce((acc, item) => acc + item.product.priceJOD * item.quantity, 0);
  const subtotalUSD = cart.reduce((acc, item) => acc + item.product.priceUSD * item.quantity, 0);

  let discountJOD = 0;
  let discountUSD = 0;
  if (appliedPromo) {
    if (appliedPromo.discountPercent) {
      discountJOD = (subtotalJOD * appliedPromo.discountPercent) / 100;
      discountUSD = (subtotalUSD * appliedPromo.discountPercent) / 100;
    } else if (appliedPromo.discountFixedJOD) {
      discountJOD = Math.min(appliedPromo.discountFixedJOD, subtotalJOD);
      discountUSD = discountJOD * 1.41;
    }
  }

  // Calculate Shipping / Fulfillment Cost
  const selectedGovRate = activeGovernorates.find((g) => g.id === selectedGovId);
  const isFreeDeliveryQualified =
    state.settings.fulfillment?.freeDeliveryThresholdJOD &&
    subtotalJOD >= state.settings.fulfillment.freeDeliveryThresholdJOD;

  let shippingCostJOD = 0;
  if (fulfillmentType === 'delivery') {
    if (isFreeDeliveryQualified) {
      shippingCostJOD = 0;
    } else {
      shippingCostJOD = selectedGovRate ? selectedGovRate.priceJOD : 2.0;
    }
  }
  const shippingCostUSD = shippingCostJOD * 1.41;

  const totalJOD = Math.max(0, subtotalJOD - discountJOD + shippingCostJOD);
  const totalUSD = Math.max(0, subtotalUSD - discountUSD + shippingCostUSD);

  const selectedCompany = activeDeliveryCompanies.find((c) => c.id === selectedCompanyId);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    const res = applyPromoCode(promoInput);
    if (!res.success) {
      setPromoError(res.message);
    } else {
      setPromoError('');
      setPromoInput('');
    }
  };

  const handlePlaceOrder = () => {
    if (!customerName.trim()) {
      setErrorMessage(language === 'ar' ? 'يرجى إدخال اسمك الكامل' : 'Please enter your full name');
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMessage(language === 'ar' ? 'يرجى إدخال رقم الهاتف / الواتساب' : 'Please enter your WhatsApp/Phone number');
      return;
    }
    if (fulfillmentType === 'delivery' && !shippingAddress.trim()) {
      setErrorMessage(
        language === 'ar'
          ? 'يرجى كتابة عنوان التوصيل بالتفصيل (المنطقة / الشارع / رقم المبنى)'
          : 'Please enter your detailed delivery address'
      );
      return;
    }

    setErrorMessage('');

    const newOrder = createOrder({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim() || 'customer@qwaderstore.jo',
      preferredDeliveryMethod: deliveryMethod,
      fulfillmentType,
      shippingGovernorate:
        fulfillmentType === 'delivery' && selectedGovRate
          ? language === 'ar'
            ? selectedGovRate.nameAr
            : selectedGovRate.nameEn
          : undefined,
      shippingAddress: fulfillmentType === 'delivery' ? shippingAddress.trim() : undefined,
      shippingNotes: fulfillmentType === 'delivery' ? shippingNotes.trim() : undefined,
      shippingCostJOD,
      shippingCostUSD,
      deliveryCompanyId: fulfillmentType === 'delivery' ? selectedCompanyId : undefined,
      deliveryCompanyName:
        fulfillmentType === 'delivery' && selectedCompany
          ? language === 'ar'
            ? selectedCompany.nameAr
            : selectedCompany.nameEn
          : undefined,
      paymentMethod,
      paymentReference: paymentReference.trim() || undefined,
      notes: orderNotes.trim() || undefined,
    });

    if (newOrder && newOrder.orderNumber) {
      setCreatedOrderNumber(newOrder.orderNumber);
      setStep(3);

      // Trigger Confetti Celebration!
      try {
        confetti({
          particleCount: 130,
          spread: 85,
          origin: { y: 0.6 },
          colors: ['#8b5cf6', '#d946ef', '#06b6d4', '#10b981', '#f59e0b'],
        });
      } catch (e) {
        // Safe fallback
      }
    }
  };

  const handleWhatsAppSendOrder = () => {
    if (!createdOrderNumber) return;
    const order = state.orders.find((o) => o.orderNumber === createdOrderNumber);
    if (!order) return;

    const itemsSummary = order.items
      .map(
        (item) =>
          `• ${language === 'ar' ? item.productNameAr : item.productNameEn} (العدد: ${item.quantity}) - ${(item.priceJOD * item.quantity).toFixed(2)} د.أ`
      )
      .join('\n');

    let fulfillmentSummary = '';
    if (order.fulfillmentType === 'pickup') {
      fulfillmentSummary = `🏪 طريقة الاستلام: استلام مباشر من المتجر\n📍 العنوان: ${state.settings.fulfillment?.pickupAddressAr || 'مقر كوادر ستور'}\n⏰ أوقات الاستلام: ${state.settings.fulfillment?.pickupHoursAr || '10:00 صباحاً - 11:00 مساءً'}`;
    } else {
      fulfillmentSummary = `🚚 طريقة الاستلام: توصيل وشحن منزلي\n🏛️ المحافظة: ${order.shippingGovernorate || 'عمان'}\n📍 العنوان التفصيلي: ${order.shippingAddress || 'لم يحدد'}\n🏢 شركة التوصيل: ${order.deliveryCompanyName || 'مندوب التوصيل'}\n📦 أجور التوصيل: ${order.shippingCostJOD > 0 ? `${order.shippingCostJOD.toFixed(2)} د.أ` : 'مجاناً ⚡'}`;
    }

    const message = `مرحباً متجر كوادر ستور 🇯🇴🎮\n\nأود تأكيد طلبي الجديد:\n📋 رقم الطلب: ${order.orderNumber}\n👤 العميل: ${order.customerName}\n📱 الهاتف: ${order.customerPhone}\n\n${fulfillmentSummary}\n\n📦 تفاصيل المنتجات المطلوبة:\n${itemsSummary}\n\n💰 المجموع الفرعي: ${order.subtotalJOD.toFixed(2)} د.أ\n${order.discountJOD > 0 ? `🎁 الخصم: -${order.discountJOD.toFixed(2)} د.أ\n` : ''}${order.shippingCostJOD > 0 ? `🚚 التوصيل: +${order.shippingCostJOD.toFixed(2)} د.أ\n` : ''}💳 الإجمالي النهائي: ${order.totalJOD.toFixed(2)} د.أ (${order.paymentMethod.toUpperCase()})\n${order.paymentReference ? `🔢 الرقم المرجعي للتحويل: ${order.paymentReference}\n` : ''}\nأرجو تأكيد الاستلام والبدء بالتجهيز فوراً. شكراً لكم!`;

    const url = `https://wa.me/${state.settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (cart.length === 0 && step !== 3) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="p-10 rounded-3xl glass-card border border-white/10">
          <ShoppingBag className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-100 mb-2 font-cairo">{t.emptyCartTitle}</h2>
          <p className="text-xs text-slate-400 mb-6">{t.emptyCartDesc}</p>
          <button
            id="checkout-empty-browse-btn"
            onClick={() => navigateTo('#store')}
            className="px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 transition-all hover:scale-105"
          >
            {t.exploreStore}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-28 lg:pb-8 space-y-6 sm:space-y-8">
      
      {/* Stepper Progress Bar */}
      <div className="flex items-center justify-center gap-2 sm:gap-6">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center transition-all ${
              step >= 1
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                : 'bg-white/5 border border-white/10 text-slate-500'
            }`}
          >
            1
          </div>
          <span className="text-xs font-bold text-slate-200 hidden sm:inline font-cairo">
            {language === 'ar' ? 'مراجعة السلة' : 'Cart Review'}
          </span>
        </div>

        <div className={`w-8 sm:w-16 h-0.5 ${step >= 2 ? 'bg-purple-600' : 'bg-white/10'}`} />

        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center transition-all ${
              step >= 2
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                : 'bg-white/5 border border-white/10 text-slate-500'
            }`}
          >
            2
          </div>
          <span className="text-xs font-bold text-slate-200 hidden sm:inline font-cairo">
            {language === 'ar' ? 'الاستلام والتوصيل والدفع' : 'Fulfillment & Payment'}
          </span>
        </div>

        <div className={`w-8 sm:w-16 h-0.5 ${step === 3 ? 'bg-emerald-500' : 'bg-white/10'}`} />

        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center transition-all ${
              step === 3
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40'
                : 'bg-white/5 border border-white/10 text-slate-500'
            }`}
          >
            3
          </div>
          <span className="text-xs font-bold text-slate-200 hidden sm:inline font-cairo">
            {language === 'ar' ? 'تأكيد الطلب والتسليم' : 'Order Done'}
          </span>
        </div>
      </div>

      {/* Step 1: Review Cart */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Items list (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="p-4 sm:p-6 rounded-3xl glass-card border border-white/10">
              <h2 className="text-base sm:text-lg font-bold text-slate-100 mb-4 font-cairo flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-purple-400" />
                <span>{language === 'ar' ? 'المنتجات في سلة الشراء' : 'Order Items'}</span>
              </h2>

              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 sm:gap-4"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <img
                        src={item.product.image}
                        alt={item.product.nameAr}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-white/10 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[9px] sm:text-[10px] font-bold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-500/30 inline-block truncate max-w-[120px]">
                          {item.product.platform}
                        </span>
                        <h4 className="text-xs font-bold text-slate-100 truncate max-w-[160px] sm:max-w-xs mt-1">
                          {language === 'ar' ? item.product.nameAr : item.product.nameEn}
                        </h4>
                        <span className="text-[10px] sm:text-[11px] text-slate-400 block">
                          {item.quantity} × {formatPrice(item.product.priceJOD, item.product.priceUSD)}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs sm:text-sm font-black text-purple-300 font-display whitespace-nowrap flex-shrink-0">
                      {formatPrice(item.product.priceJOD * item.quantity, item.product.priceUSD * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Price Summary & Promo Code (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 sm:p-6 rounded-3xl glass-card border border-white/10 space-y-4">
              <h3 className="text-base font-bold text-slate-100 font-cairo">
                {language === 'ar' ? 'ملخص الحساب' : 'Order Summary'}
              </h3>

              {/* Promo code */}
              <div>
                {appliedPromo ? (
                  <div className="flex items-center justify-between p-2.5 min-h-[44px] rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                    <span className="truncate max-w-[180px]">
                      {appliedPromo.code} (
                      {appliedPromo.discountPercent ? `${appliedPromo.discountPercent}%` : `${appliedPromo.discountFixedJOD} JOD`}
                      )
                    </span>
                    <button
                      onClick={removePromoCode}
                      className="min-h-[44px] px-2 text-rose-400 hover:underline text-xs flex-shrink-0 flex items-center"
                    >
                      {language === 'ar' ? 'إلغاء' : 'Remove'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyPromo} className="flex gap-2">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder={t.enterPromoCode}
                      className="flex-1 min-w-0 min-h-[44px] px-3.5 py-2.5 rounded-full text-xs sm:text-sm bg-white/5 border border-white/10 text-slate-100 uppercase focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="min-h-[44px] px-4 py-2 rounded-full text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors flex-shrink-0 flex items-center justify-center"
                    >
                      {t.applyPromo}
                    </button>
                  </form>
                )}
                {promoError && <p className="text-[11px] text-rose-400 mt-1">{promoError}</p>}
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-2 text-xs text-slate-300 pt-2 border-t border-white/10">
                <div className="flex justify-between">
                  <span className="text-slate-400">{t.subtotal}</span>
                  <span>{formatPrice(subtotalJOD, subtotalUSD)}</span>
                </div>
                {discountJOD > 0 && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>{t.promoDiscount}</span>
                    <span>-{formatPrice(discountJOD, discountUSD)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm sm:text-base font-extrabold text-slate-100 pt-2 border-t border-white/10">
                  <span className="font-cairo">{t.cartTotal}</span>
                  <span className="text-xl sm:text-2xl text-purple-300 font-display font-black">
                    {formatPrice(totalJOD, totalUSD)}
                  </span>
                </div>
              </div>

              <button
                id="checkout-step1-continue-btn"
                onClick={() => setStep(2)}
                className="w-full min-h-[48px] py-3.5 px-6 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-purple-900/30 transition-all hover:scale-[1.02] active:scale-98 flex items-center justify-center gap-2 font-cairo"
              >
                <span>{language === 'ar' ? 'المتابعة لطريقة الاستلام والدفع' : 'Proceed to Fulfillment & Payment'}</span>
                {language === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Customer Contact, Fulfillment & Payment Details */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Main Form (8 cols) */}
          <div className="lg:col-span-8 space-y-5 sm:space-y-6">
            
            {/* Customer Contact Card */}
            <div className="p-4 sm:p-6 rounded-3xl glass-card border border-white/10 space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 font-cairo flex items-center gap-2">
                <Phone className="w-4 h-4 text-purple-400" />
                <span>{language === 'ar' ? 'بيانات المشتري والتواصل' : 'Customer & Contact Info'}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1.5">
                    {t.fullName} *
                  </label>
                  <input
                    id="checkout-customer-name-input"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={language === 'ar' ? 'مثال: محمد العمري' : 'e.g. Mohammad Al-Omari'}
                    className="w-full min-h-[44px] px-3.5 py-3 rounded-xl text-xs sm:text-sm bg-white/5 border border-white/10 text-slate-100 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                    <span>{t.whatsappNumber} *</span>
                    <span className="text-[10px] text-emerald-400 font-bold">الأردن 🇯🇴</span>
                  </label>
                  <input
                    id="checkout-whatsapp-input"
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="079XXXXXXXX"
                    className="w-full min-h-[44px] px-3.5 py-3 rounded-xl text-xs sm:text-sm bg-white/5 border border-white/10 text-slate-100 focus:border-purple-500 focus:outline-none text-start"
                    dir="ltr"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-300 font-semibold mb-1.5">
                    {t.email} ({language === 'ar' ? 'اختياري لنسخة الفاتورة' : 'Optional for invoice copy'})
                  </label>
                  <input
                    id="checkout-email-input"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full min-h-[44px] px-3.5 py-3 rounded-xl text-xs sm:text-sm bg-white/5 border border-white/10 text-slate-100 focus:border-purple-500 focus:outline-none text-start"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Delivery Channel Preference */}
              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-2">
                  {language === 'ar' ? 'طريقة استلام الكود والمعلومات الرقمية:' : 'Digital Delivery Channel:'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('whatsapp')}
                    className={`min-h-[44px] p-2 sm:p-2.5 rounded-xl border text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                      deliveryMethod === 'whatsapp'
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>واتساب</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('email')}
                    className={`min-h-[44px] p-2 sm:p-2.5 rounded-xl border text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                      deliveryMethod === 'email'
                        ? 'bg-blue-950/70 border-blue-500 text-blue-300'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span>إيميل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('both')}
                    className={`min-h-[44px] p-2 sm:p-2.5 rounded-xl border text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                      deliveryMethod === 'both'
                        ? 'bg-purple-950/70 border-purple-500 text-purple-300'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <span>كلاهما</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Fulfillment Selection Card (Pickup from Store vs Home Delivery by Governorate) */}
            <div className="p-4 sm:p-6 rounded-3xl glass-card border border-white/10 space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 font-cairo flex items-center gap-2">
                <Truck className="w-4 h-4 text-purple-400" />
                <span>{language === 'ar' ? 'طريقة الاستلام والتوصيل' : 'Fulfillment & Delivery Method'}</span>
              </h3>

              {/* Two Option Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Store Pickup */}
                <div
                  onClick={() => setFulfillmentType('pickup')}
                  className={`min-h-[44px] p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all ${
                    fulfillmentType === 'pickup'
                      ? 'bg-purple-950/60 border-purple-400 shadow-lg shadow-purple-950/40 ring-1 ring-purple-400/50'
                      : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Store className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 flex-shrink-0" />
                      <span className="font-bold text-xs sm:text-sm text-slate-100 font-cairo truncate">
                        {language === 'ar' ? 'استلام مباشر من المتجر' : 'Store Pickup'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30 whitespace-nowrap flex-shrink-0">
                      {language === 'ar' ? 'مجاني (0 د.أ)' : 'FREE (0 JOD)'}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    {language === 'ar'
                      ? 'تفضل بزيارة مقرنا في عمان للاستلام المباشر والدفع نقداً أو عبر كليك.'
                      : 'Visit our physical branch in Amman to pick up your order directly.'}
                  </p>
                </div>

                {/* 2. Home Delivery to Governorate */}
                <div
                  onClick={() => setFulfillmentType('delivery')}
                  className={`min-h-[44px] p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all ${
                    fulfillmentType === 'delivery'
                      ? 'bg-purple-950/60 border-purple-400 shadow-lg shadow-purple-950/40 ring-1 ring-purple-400/50'
                      : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 flex-shrink-0" />
                      <span className="font-bold text-xs sm:text-sm text-slate-100 font-cairo truncate">
                        {language === 'ar' ? 'توصيل لباب المنزل (المحافظات)' : 'Home Delivery'}
                      </span>
                    </div>
                    {isFreeDeliveryQualified ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30 whitespace-nowrap flex-shrink-0">
                        {language === 'ar' ? 'توصيل مجاني ⚡' : 'Free Shipping ⚡'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-500/30 whitespace-nowrap flex-shrink-0">
                        {selectedGovRate ? `${selectedGovRate.priceJOD.toFixed(2)} د.أ` : 'حسب المحافظة'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    {language === 'ar'
                      ? 'شحن سريع لكافة محافظات المملكة عبر شركات الشحن المعتمدة ومندوب كوادر.'
                      : 'Fast doorstep delivery to all 12 Jordanian governorates.'}
                  </p>
                </div>
              </div>

              {/* Conditional Pickup Details */}
              {fulfillmentType === 'pickup' && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-xs space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-200 block mb-0.5 text-xs">
                        {language === 'ar' ? 'عنوان الاستلام المباشر:' : 'Pickup Location:'}
                      </span>
                      <p className="text-slate-300 text-[11px] sm:text-xs">
                        {language === 'ar'
                          ? state.settings.fulfillment?.pickupAddressAr || state.settings.locationAr
                          : state.settings.fulfillment?.pickupAddressEn || state.settings.locationEn}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 text-slate-300 text-[11px] sm:text-xs">
                    <Clock className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>
                      {language === 'ar'
                        ? `ساعات العمل للاستلام: ${state.settings.fulfillment?.pickupHoursAr || 'يومياً 10:00 ص - 11:00 م'}`
                        : `Working Hours: ${state.settings.fulfillment?.pickupHoursEn || 'Daily 10:00 AM - 11:00 PM'}`}
                    </span>
                  </div>

                  <p className="text-[10px] sm:text-[11px] text-slate-400 pt-1 border-t border-purple-500/20">
                    {language === 'ar'
                      ? state.settings.fulfillment?.pickupInstructionsAr ||
                        '💡 بعد إتمام الطلب، سيتم إرسال رقم الطلب إليك ويمكنك الحضور فوراً لاستلامه.'
                      : '💡 After confirming, bring your order number to our desk for immediate pickup.'}
                  </p>
                </div>
              )}

              {/* Conditional Delivery Form (Governorate, Delivery Company, Address) */}
              {fulfillmentType === 'delivery' && (
                <div className="space-y-3.5 p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/10 animate-in fade-in duration-200">
                  
                  {/* Governorate Dropdown */}
                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-purple-400" />
                        <span>{language === 'ar' ? 'اختر المحافظة *' : 'Select Governorate *'}</span>
                      </span>
                      {isFreeDeliveryQualified ? (
                        <span className="text-[10px] text-emerald-400 font-bold">
                          {language === 'ar' ? 'مؤهل للشحن المجاني! 🎉' : 'Eligible for Free Delivery! 🎉'}
                        </span>
                      ) : (
                        <span className="text-[10px] sm:text-[11px] text-purple-300 font-bold">
                          {language === 'ar'
                            ? `أجرة التوصيل: ${selectedGovRate?.priceJOD.toFixed(2)} د.أ`
                            : `Rate: ${selectedGovRate?.priceJOD.toFixed(2)} JOD`}
                        </span>
                      )}
                    </label>
                    <select
                      id="checkout-governorate-select"
                      value={selectedGovId}
                      onChange={(e) => setSelectedGovId(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-900 border border-white/10 text-slate-100 focus:border-purple-500 focus:outline-none"
                    >
                      {activeGovernorates.map((gov) => (
                        <option key={gov.id} value={gov.id}>
                          {language === 'ar' ? gov.nameAr : gov.nameEn} — (
                          {isFreeDeliveryQualified ? (language === 'ar' ? 'توصيل مجاني' : 'FREE') : `${gov.priceJOD.toFixed(2)} د.أ`}
                          )
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Delivery Company Selection (if multiple) */}
                  {activeDeliveryCompanies.length > 0 && (
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-purple-400" />
                        <span>{language === 'ar' ? 'شركة أو مندوب التوصيل المفضل:' : 'Preferred Delivery Courier:'}</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeDeliveryCompanies.map((comp) => (
                          <div
                            key={comp.id}
                            onClick={() => setSelectedCompanyId(comp.id)}
                            className={`min-h-[44px] p-2.5 sm:p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                              selectedCompanyId === comp.id
                                ? 'bg-purple-950/70 border-purple-400 text-slate-100'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                            }`}
                          >
                            <span className="font-bold truncate max-w-[130px]">{language === 'ar' ? comp.nameAr : comp.nameEn}</span>
                            <span className="text-[10px] text-purple-300 bg-purple-900/50 px-2 py-0.5 rounded-full whitespace-nowrap">
                              {language === 'ar' ? comp.estimatedDaysAr : comp.estimatedDaysEn}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detailed Address */}
                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1.5">
                      {language === 'ar' ? 'العنوان التفصيلي (المدينة / الحي / الشارع / المبنى) *' : 'Detailed Address (Area / Street / Building) *'}
                    </label>
                    <input
                      id="checkout-shipping-address-input"
                      type="text"
                      required
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder={
                        language === 'ar'
                          ? 'مثال: عمان - الجبيهة - شارع أحمد الطراونة - بناية 14 شقة 3'
                          : 'e.g. Amman - Jubaiha - Street 14, Apt 3'
                      }
                      className="w-full min-h-[44px] px-3.5 py-3 rounded-xl text-xs sm:text-sm bg-slate-900 border border-white/10 text-slate-100 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Shipping Notes */}
                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1.5">
                      {language === 'ar' ? 'ملاحظات لمندوب التوصيل (اختياري):' : 'Delivery Instructions (Optional):'}
                    </label>
                    <input
                      id="checkout-shipping-notes-input"
                      type="text"
                      value={shippingNotes}
                      onChange={(e) => setShippingNotes(e.target.value)}
                      placeholder={
                        language === 'ar'
                          ? 'مثال: يرجى الاتصال قبل الوصول بنصف ساعة'
                          : 'e.g. Please call 30 mins before arrival'
                      }
                      className="w-full min-h-[44px] px-3.5 py-3 rounded-xl text-xs sm:text-sm bg-slate-900 border border-white/10 text-slate-100 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method Selection Card */}
            <div className="p-4 sm:p-6 rounded-3xl glass-card border border-white/10 space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 font-cairo flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-400" />
                <span>{language === 'ar' ? 'اختر وسيلة الدفع المحلية' : 'Select Payment Method'}</span>
              </h3>

              <div className="space-y-3">
                {/* 1. CliQ Jordan */}
                <div
                  onClick={() => setPaymentMethod('cliq')}
                  className={`min-h-[44px] p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === 'cliq'
                      ? 'bg-purple-950/50 border-purple-400 shadow-lg shadow-purple-950/50'
                      : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="w-5 h-5 rounded-full border-2 border-purple-400 flex items-center justify-center flex-shrink-0">
                        {paymentMethod === 'cliq' && <div className="w-2.5 h-2.5 bg-purple-400 rounded-full" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-100 font-cairo flex items-center gap-1.5 flex-wrap">
                          <span>{t.pay_cliq}</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/40 font-semibold">
                            فوري ومجاني
                          </span>
                        </h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                          {t.pay_cliq_desc}
                        </p>
                      </div>
                    </div>
                  </div>

                  {paymentMethod === 'cliq' && (
                    <div className="mt-3 pt-3 border-t border-purple-500/20 text-xs bg-slate-950/60 p-3 sm:p-3.5 rounded-xl space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-slate-400 text-[11px]">اسم مستعار كليك (CliQ Alias):</span>
                        <div className="flex items-center justify-between sm:justify-end gap-2">
                          <span className="font-mono font-black text-purple-300 text-xs sm:text-sm">{state.settings.cliqAlias}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(state.settings.cliqAlias, 'cliqAlias');
                            }}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-full bg-white/10 text-slate-300 hover:text-white"
                          >
                            {copiedField === 'cliqAlias' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-slate-400 text-[11px]">رقم الهاتف (CliQ Mobile):</span>
                        <div className="flex items-center justify-between sm:justify-end gap-2">
                          <span className="font-mono font-bold text-slate-200 text-xs sm:text-sm" dir="ltr">{state.settings.contactPhone || state.settings.whatsappNumber}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(state.settings.contactPhone || state.settings.whatsappNumber, 'cliqMobile');
                            }}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-full bg-white/10 text-slate-300 hover:text-white"
                          >
                            {copiedField === 'cliqMobile' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Bank Transfer */}
                <div
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`min-h-[44px] p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === 'bank_transfer'
                      ? 'bg-purple-950/50 border-purple-400 shadow-lg shadow-purple-950/50'
                      : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="w-5 h-5 rounded-full border-2 border-purple-400 flex items-center justify-center flex-shrink-0">
                        {paymentMethod === 'bank_transfer' && <div className="w-2.5 h-2.5 bg-purple-400 rounded-full" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-100 font-cairo">
                          {t.pay_bank}
                        </h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                          {t.pay_bank_desc}
                        </p>
                      </div>
                    </div>
                  </div>

                  {paymentMethod === 'bank_transfer' && (
                    <div className="mt-3 pt-3 border-t border-purple-500/20 text-xs bg-slate-950/60 p-3 sm:p-3.5 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">البنك:</span>
                        <span className="font-bold text-slate-200 text-xs">{state.settings.bankNameAr}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">اسم الحساب:</span>
                        <span className="font-bold text-slate-200 text-xs truncate max-w-[170px]">{state.settings.bankAccountName}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-slate-400 text-[11px]">رقم الآيبان (IBAN):</span>
                        <div className="flex items-center justify-between sm:justify-end gap-2">
                          <span className="font-mono text-[10px] sm:text-[11px] text-slate-300 truncate max-w-[180px] sm:max-w-[200px]" dir="ltr">{state.settings.bankIBAN}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(state.settings.bankIBAN, 'iban');
                            }}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-full bg-white/10 text-slate-300 hover:text-white"
                          >
                            {copiedField === 'iban' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Cash on Pickup / Delivery */}
                <div
                  onClick={() => setPaymentMethod('cash_pickup')}
                  className={`min-h-[44px] p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === 'cash_pickup'
                      ? 'bg-purple-950/50 border-purple-400 shadow-lg shadow-purple-950/50'
                      : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="w-5 h-5 rounded-full border-2 border-purple-400 flex items-center justify-center flex-shrink-0">
                        {paymentMethod === 'cash_pickup' && <div className="w-2.5 h-2.5 bg-purple-400 rounded-full" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-100 font-cairo">
                          {fulfillmentType === 'pickup'
                            ? (language === 'ar' ? 'الدفع نقداً عند الاستلام من المتجر' : 'Cash at Store Pickup')
                            : (language === 'ar' ? 'الدفع عند الاستلام لمندوب التوصيل' : 'Cash on Doorstep Delivery')}
                        </h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                          {fulfillmentType === 'pickup'
                            ? (language === 'ar' ? 'ادفع المبلغ كاش مباشرة عند حضورك لفرعنا' : 'Pay cash at our branch')
                            : (language === 'ar' ? 'ادفع للمندوب عند وصول الشحنة لباب بيتك' : 'Pay courier upon arrival')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reference ID input */}
              <div className="pt-2">
                <label className="block text-xs text-slate-300 font-semibold mb-1.5">
                  {language === 'ar' ? 'الرقم المرجعي للتحويل أو إشعار البنك (اختياري للتدقيق الفوري):' : 'Transaction / Reference ID (Optional):'}
                </label>
                <input
                  id="checkout-payment-ref-input"
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="مثال: REF-92837482"
                  className="w-full min-h-[44px] px-3.5 py-3 rounded-xl text-xs sm:text-sm bg-white/5 border border-white/10 text-slate-100 focus:border-purple-500 focus:outline-none font-mono"
                />
              </div>

              {/* Order Notes */}
              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1.5">
                  {language === 'ar' ? 'ملاحظات إضافية على الطلب:' : 'Order Notes:'}
                </label>
                <textarea
                  id="checkout-order-notes-textarea"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  rows={2}
                  placeholder={language === 'ar' ? 'أي تعليمات تود إضافتها لفريق متجر قويدر...' : 'Special instructions...'}
                  className="w-full min-h-[60px] p-3 rounded-xl text-xs sm:text-sm bg-white/5 border border-white/10 text-slate-100 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-bold">
                {errorMessage}
              </div>
            )}

            {/* Form Action Buttons: Back & Place Order (Desktop / Embedded) */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="min-h-[44px] py-3 px-6 rounded-full glass-panel text-slate-300 hover:text-white border border-white/10 text-xs font-bold text-center flex items-center justify-center"
              >
                {language === 'ar' ? 'العودة للسلة' : 'Back to Cart'}
              </button>

              <button
                id="checkout-confirm-place-order-btn"
                type="button"
                onClick={handlePlaceOrder}
                className="min-h-[48px] py-3.5 px-6 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-emerald-600/40 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-2 font-cairo"
              >
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>{language === 'ar' ? 'تأكيد وإرسال الطلب الآن' : 'Confirm & Place Order'}</span>
              </button>
            </div>
          </div>

          {/* Right Summary Sidebar (4 cols) - Vertically Stacked on Mobile & Embedded on Desktop */}
          <div className="lg:col-span-4 space-y-4 w-full">
            <div className="p-4 sm:p-6 rounded-3xl glass-card border border-white/10 space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 font-cairo">
                {language === 'ar' ? 'ملخص الفاتورة والمطلوب' : 'Total & Breakdown'}
              </h3>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">{t.subtotal}</span>
                  <span>{formatPrice(subtotalJOD, subtotalUSD)}</span>
                </div>
                {discountJOD > 0 && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>{t.promoDiscount}</span>
                    <span>-{formatPrice(discountJOD, discountUSD)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-1.5 border-t border-white/10">
                  <span className="text-slate-400 flex items-center gap-1">
                    {fulfillmentType === 'pickup' ? <Store className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" /> : <Truck className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
                    <span>{fulfillmentType === 'pickup' ? (language === 'ar' ? 'استلام من المتجر' : 'Pickup') : (language === 'ar' ? `شحن (${selectedGovRate?.nameAr || 'المحافظة'})` : 'Shipping')}</span>
                  </span>
                  {shippingCostJOD === 0 ? (
                    <span className="text-emerald-400 font-bold">{language === 'ar' ? 'مجاناً ⚡' : 'FREE ⚡'}</span>
                  ) : (
                    <span className="text-slate-200 font-bold">+{formatPrice(shippingCostJOD, shippingCostUSD)}</span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <span className="text-xs text-slate-400 block mb-1 font-semibold">{language === 'ar' ? 'الإجمالي المطلوب دفعه:' : 'Final Total:'}</span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-display">
                  {formatPrice(totalJOD, totalUSD)}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-300 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{language === 'ar' ? 'ضمان الخدمة والتجهيز' : 'Quality Guarantee'}</span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 leading-relaxed">
                  {language === 'ar'
                    ? 'بعد الضغط على تأكيد الطلب، سيتم توجيهك لرقم الطلب ويمكنك إرساله بنقرة واحدة إلى الواتساب للبدء بالتنفيذ والتسليم فوراً.'
                    : 'Your order request will be prepared and confirmed via WhatsApp instantly.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Mobile Bottom Action Bar (Fixed at Viewport Bottom with Safe-Area Layout Guides) */}
      {(step === 1 || step === 2) && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#020617]/95 backdrop-blur-xl border-t border-purple-500/30 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,0.7)] transition-all">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 font-semibold block leading-tight">
                {step === 1 ? (language === 'ar' ? 'الإجمالي:' : 'Total:') : (language === 'ar' ? 'المبلغ المستحق:' : 'Total Due:')}
              </span>
              <div className="text-base sm:text-lg font-black text-emerald-400 font-display">
                {formatPrice(totalJOD, totalUSD)}
              </div>
            </div>

            {step === 1 ? (
              <button
                id="mobile-sticky-continue-btn"
                onClick={() => {
                  setStep(2);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="min-h-[44px] px-5 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-purple-900/40 active:scale-95 transition-all flex items-center justify-center gap-1.5 font-cairo flex-shrink-0"
              >
                <span>{language === 'ar' ? 'المتابعة للدفع' : 'Proceed'}</span>
                {language === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            ) : (
              <button
                id="mobile-sticky-place-order-btn"
                onClick={handlePlaceOrder}
                className="min-h-[44px] px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/40 active:scale-95 transition-all flex items-center justify-center gap-1.5 font-cairo flex-shrink-0"
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{language === 'ar' ? 'تأكيد الطلب الآن' : 'Place Order'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Order Placed Success */}
      {step === 3 && createdOrderNumber && (
        <div className="max-w-2xl mx-auto p-5 sm:p-10 rounded-3xl glass-card border border-emerald-500/40 shadow-2xl text-center space-y-5 sm:space-y-6 animate-in zoom-in-95 duration-200">
          
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>

          <div>
            <span className="inline-block px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 mb-2">
              {language === 'ar' ? 'تم استلام طلبك بنجاح ⚡' : 'Order Received Successfully ⚡'}
            </span>
            <h2 className="text-xl sm:text-3xl font-black text-slate-100 font-cairo">
              {t.orderPlacedSuccess}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              {language === 'ar'
                ? 'تم تسجيل طلبك في النظام بنجاح. يرجى إرسال تفاصيل الطلب عبر واتساب للبدء في التجهيز فوراً.'
                : t.orderPlacedDesc}
            </p>
          </div>

          {/* Order Number Box */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-purple-500/30 flex items-center justify-between max-w-md mx-auto gap-2">
            <div className="text-start">
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold">{t.orderNumber}:</span>
              <div className="font-mono text-sm sm:text-lg font-black text-purple-300">
                {createdOrderNumber}
              </div>
            </div>

            <button
              onClick={() => copyToClipboard(createdOrderNumber, 'orderNum')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 text-slate-300 hover:text-white text-xs font-bold flex-shrink-0"
            >
              {copiedField === 'orderNum' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t.copy}</span>
                </>
              )}
            </button>
          </div>

          {/* Direct WhatsApp Confirmation Button */}
          <div className="space-y-3 pt-2">
            <button
              id="order-send-whatsapp-btn"
              onClick={handleWhatsAppSendOrder}
              className="w-full py-3.5 sm:py-4 px-4 sm:px-6 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-emerald-600/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 font-cairo"
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>{language === 'ar' ? 'إرسال تفاصيل الطلب عبر واتساب للتجهيز الفوري 📲' : 'Send Order to WhatsApp for Instant Processing 📲'}</span>
            </button>

            <button
              id="order-track-live-btn"
              onClick={() => navigateTo(`#track-order/${createdOrderNumber}`)}
              className="w-full py-3.5 px-6 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-purple-900/40 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 font-cairo"
            >
              <span>{language === 'ar' ? 'تتبع مسار الطلب واستلام الأكواد لحظياً 📍' : 'Track Order Live & Digital Keys 📍'}</span>
            </button>

            <button
              id="order-view-my-orders-btn"
              onClick={() => navigateTo('#orders')}
              className="w-full py-3 px-6 rounded-full glass-panel text-slate-200 hover:text-white border border-white/10 text-xs font-bold transition-all"
            >
              {language === 'ar' ? 'متابعة الطلب في صفحة طلباتي' : 'View in My Orders'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

