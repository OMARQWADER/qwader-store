import React from 'react';
import { useStore } from '../../context/StoreContext';
import { Wrench, MessageCircle, Phone, ArrowLeft, ShieldAlert } from 'lucide-react';

export const MaintenanceScreen: React.FC = () => {
  const { state, language, switchDemoRole } = useStore();

  const handleWhatsApp = () => {
    const text = encodeURIComponent('مرحباً متجر كوادر، أود الاستفسار عن توفر الألعاب وبطاقات الستور!');
    window.open(`https://wa.me/${state.settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-xl w-full glass-card p-8 md:p-12 rounded-3xl border border-violet-500/30 shadow-2xl relative overflow-hidden">
        {/* Glowing backdrop decorative circle */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-violet-500/20 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10 animate-bounce">
            <Wrench className="w-10 h-10 text-amber-400" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 mb-4">
            {language === 'ar' ? 'أعمال صيانة وتحديث' : 'Maintenance & Upgrades'}
          </span>

          <h1 className="text-2xl md:text-3xl font-black text-slate-100 mb-4 font-cairo">
            {language === 'ar' ? state.settings.storeNameAr : state.settings.storeNameEn}
          </h1>

          <p className="text-sm md:text-base text-slate-300 mb-8 leading-relaxed">
            {language === 'ar' ? state.settings.maintenanceMessageAr : state.settings.maintenanceMessageEn}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <button
              id="maintenance-whatsapp-btn"
              onClick={handleWhatsApp}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all hover:scale-105"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{language === 'ar' ? 'تواصل معنا واتساب فوراً' : 'Contact us via WhatsApp'}</span>
            </button>

            <a
              id="maintenance-call-btn"
              href={`tel:${state.settings.contactPhone}`}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl glass-panel text-slate-200 hover:text-white border border-slate-700 font-bold text-sm transition-all"
            >
              <Phone className="w-4 h-4 text-violet-400" />
              <span>{state.settings.contactPhone}</span>
            </a>
          </div>

          <div className="pt-6 border-t border-slate-800 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldAlert className="w-4 h-4 text-violet-400" />
              <span>{language === 'ar' ? 'هل أنت مسؤول بالمتجر؟' : 'Are you an admin?'}</span>
            </div>
            <button
              id="maintenance-switch-to-owner-btn"
              onClick={() => switchDemoRole('owner')}
              className="text-xs text-violet-400 hover:text-violet-300 font-bold underline transition-colors"
            >
              {language === 'ar' ? 'الدخول كمسؤول (مالك المتجر) لإلغاء وضع الصيانة' : 'Switch to Owner role to disable maintenance'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
