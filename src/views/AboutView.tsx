import React from 'react';
import { useStore } from '../context/StoreContext';
import { Gamepad2, ShieldCheck, Zap, Award, Sparkles, MapPin, Phone, Mail, MessageCircle } from 'lucide-react';

export const AboutView: React.FC = () => {
  const { state, language, navigateTo, t } = useStore();

  const handleWhatsApp = () => {
    const text = encodeURIComponent('مرحباً متجر قويدر ستور 🇯🇴🎮');
    window.open(`https://wa.me/${state.settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      
      {/* Hero */}
      <div className="p-8 sm:p-12 rounded-3xl glass-card border border-white/10 text-center relative overflow-hidden">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5 shadow-xl shadow-purple-900/30 mx-auto mb-4">
          <div className="w-full h-full bg-[#020617] rounded-full flex items-center justify-center">
            <Gamepad2 className="w-8 h-8 text-purple-400" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-slate-100 mb-3 font-cairo">
          {language === 'ar' ? state.settings.storeNameAr : state.settings.storeNameEn}
        </h1>

        <p className="text-xs sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          {language === 'ar' ? state.settings.descriptionAr : state.settings.descriptionEn}
        </p>
      </div>

      {/* Values Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl glass-card border border-white/10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center mx-auto">
            <Zap className="w-6 h-6 text-amber-400" />
          </div>
          <h3 className="text-base font-bold text-slate-100 font-cairo">
            {language === 'ar' ? 'السرعة الفائقة' : 'Ultra-Fast Delivery'}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {language === 'ar'
              ? 'نظام تسليم فوري للأكواد الرقمية خلال دقائق معدودة عبر واتساب والإيميل.'
              : 'Direct code delivery in minutes to keep your gaming session uninterrupted.'}
          </p>
        </div>

        <div className="p-6 rounded-3xl glass-card border border-white/10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100 font-cairo">
            {language === 'ar' ? 'أمان وضمان 100%' : '100% Guaranteed'}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {language === 'ar'
              ? 'كافة البطاقات والألعاب رسمية وقانونية مع ضمان استبدال أو استرجاع كامل.'
              : 'All digital keys and accounts are 100% authentic with full warranty.'}
          </p>
        </div>

        <div className="p-6 rounded-3xl glass-card border border-white/10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-pink-600/20 text-pink-400 flex items-center justify-center mx-auto">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100 font-cairo">
            {language === 'ar' ? 'دعم فني أردني متخصص' : 'Jordanian Support'}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {language === 'ar'
              ? 'فريق من أمهر اللاعبين الأردنيين لمساعدتك في خطوات التفعيل والإعداد.'
              : 'Dedicated local Jordanian support team ready to assist with console settings.'}
          </p>
        </div>
      </div>

      {/* Direct Contact CTA */}
      <div className="p-8 rounded-3xl glass-panel border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-lg font-bold text-slate-100 font-cairo mb-1">
            {language === 'ar' ? 'هل لديك أي استفسار أو طلب خاص؟' : 'Have a Question or Custom Request?'}
          </h3>
          <p className="text-xs text-slate-400">
            {language === 'ar' ? 'تواصل معنا مباشرة عبر الواتساب وسنرد عليك فوراً' : 'Contact our support team anytime'}
          </p>
        </div>

        <button
          onClick={handleWhatsApp}
          className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all hover:scale-105"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{language === 'ar' ? 'محادثة واتساب مباشرة' : 'WhatsApp Support'}</span>
        </button>
      </div>
    </div>
  );
};
