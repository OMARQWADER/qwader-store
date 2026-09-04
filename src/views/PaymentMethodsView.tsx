import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  CreditCard,
  Zap,
  Building,
  DollarSign,
  Copy,
  Check,
  ShieldCheck,
  MessageCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';

export const PaymentMethodsView: React.FC = () => {
  const { state, language, t } = useStore();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      
      {/* Header */}
      <div className="p-8 rounded-3xl glass-card border border-violet-500/30 text-center relative overflow-hidden">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-violet-300 bg-violet-950/80 border border-violet-500/30 mb-3">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>{language === 'ar' ? 'طرق دفع أردنية سهلة وسريعة 🇯🇴' : 'Jordanian Payment Methods 🇯🇴'}</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-100 mb-2 font-cairo">
          {t.paymentMethods}
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
          {language === 'ar'
            ? 'نوفر في متجر قويدر وسائل دفع محلية مباشرة بدون أي عمولات إضافية مع تسليم فوري للأكواد الرقمية.'
            : 'Fast, secure local Jordan payment methods with 0% extra processing fees.'}
        </p>
      </div>

      {/* Payment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 1. CliQ Jordan */}
        <div className="p-6 rounded-3xl glass-card border border-violet-500/40 space-y-4 relative">
          <div className="w-12 h-12 rounded-2xl bg-violet-600/20 text-violet-400 flex items-center justify-center border border-violet-500/30">
            <Zap className="w-6 h-6 text-amber-400" />
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-100 font-cairo">
              {t.pay_cliq}
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
              الأكثر استخداماً
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {t.pay_cliq_desc}
          </p>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{language === 'ar' ? 'الاسم المستعار (Alias):' : 'CliQ Alias:'}</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-violet-300">{state.settings.cliqAlias}</span>
                <button
                  onClick={() => copyToClipboard(state.settings.cliqAlias, 'cliqAlias')}
                  className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                >
                  {copiedField === 'cliqAlias' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">{language === 'ar' ? 'رقم الهاتف (Mobile):' : 'Mobile:'}</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-slate-200" dir="ltr">{state.settings.cliqMobile}</span>
                <button
                  onClick={() => copyToClipboard(state.settings.cliqMobile, 'cliqMobile')}
                  className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                >
                  {copiedField === 'cliqMobile' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Bank Transfer */}
        <div className="p-6 rounded-3xl glass-card border border-violet-500/40 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Building className="w-6 h-6" />
          </div>

          <h3 className="text-base font-black text-slate-100 font-cairo">
            {t.pay_bank}
          </h3>

          <p className="text-xs text-slate-300 leading-relaxed">
            {t.pay_bank_desc}
          </p>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{language === 'ar' ? 'البنك:' : 'Bank:'}</span>
              <span className="font-bold text-slate-200">{language === 'ar' ? state.settings.bankNameAr : state.settings.bankNameEn}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{language === 'ar' ? 'اسم المستفيد:' : 'Account holder:'}</span>
              <span className="font-bold text-slate-200">{state.settings.bankAccountName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{language === 'ar' ? 'الآيبان:' : 'IBAN:'}</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-slate-300 truncate max-w-[110px]" dir="ltr">{state.settings.bankIban}</span>
                <button
                  onClick={() => copyToClipboard(state.settings.bankIban, 'iban')}
                  className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                >
                  {copiedField === 'iban' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Cash in Amman */}
        <div className="p-6 rounded-3xl glass-card border border-violet-500/40 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-fuchsia-600/20 text-fuchsia-400 flex items-center justify-center border border-fuchsia-500/30">
            <DollarSign className="w-6 h-6" />
          </div>

          <h3 className="text-base font-black text-slate-100 font-cairo">
            {t.pay_cash}
          </h3>

          <p className="text-xs text-slate-300 leading-relaxed">
            {t.pay_cash_desc}
          </p>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
            <div className="text-slate-300 font-bold">📍 {language === 'ar' ? 'عمان - الأردن' : 'Amman, Jordan'}</div>
            <div className="text-slate-400 text-[11px]">{language === 'ar' ? 'التنسيق المسبق عبر الواتساب قبل الاستلام.' : 'Please coordinate via WhatsApp before pickup.'}</div>
          </div>
        </div>
      </div>

      {/* FAQ & Guarantees Strip */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-slate-100 font-cairo flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>{language === 'ar' ? 'ضمانات الدفع والتسليم' : 'Payment Guarantees'}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <h5 className="font-bold text-slate-100 mb-1 font-cairo">⚡ متى أستلم الكود بعد التحويل؟</h5>
            <p className="text-slate-400 text-[11px]">
              يتم تسليم الكود تلقائياً خلال 3 إلى 5 دقائق من تأكيد التحويل عبر كليك أو إرسال الإشعار على الواتساب.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <h5 className="font-bold text-slate-100 mb-1 font-cairo">🔒 هل الأكواد والحسابات مضمونة؟</h5>
            <p className="text-slate-400 text-[11px]">
              نعم، جميع الأكواد أصلية 100% ورسمية مع ضمان دائم ومساعدة كاملة في حال واجهتك أي مشكلة أثناء التفعيل.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
