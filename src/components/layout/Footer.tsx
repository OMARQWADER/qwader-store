import React from 'react';
import { useStore } from '../../context/StoreContext';
import {
  Gamepad2,
  Zap,
  ShieldCheck,
  Headphones,
  Clock,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Heart,
  Sparkles,
  CreditCard
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { state, language, navigateTo, t } = useStore();

  const handleWhatsApp = () => {
    const text = encodeURIComponent('مرحباً متجر قويدر ستور، أود الاستفسار عن كود أو لعبة رقمية!');
    window.open(`https://wa.me/${state.settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
  };

  return (
    <footer className="mt-20 border-t border-white/10 bg-[#020617] text-slate-300 relative overflow-hidden transition-colors">
      {/* Ambient background glow */}
      <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Trust Badges Strip */}
      <div className="border-b border-white/10 bg-white/[0.02] py-8 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3.5 p-3 rounded-2xl glass-card border border-white/10">
            <div className="p-3 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Zap className="w-6 h-6 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 font-cairo">
                {language === 'ar' ? 'تسليم فوري ومباشر' : 'Instant Delivery'}
              </h4>
              <p className="text-xs text-slate-400">
                {language === 'ar' ? 'أكوادك وحسابك بدقائق عبر واتساب' : 'Codes sent in minutes via WhatsApp'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-2xl glass-card border border-white/10">
            <div className="p-3 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <CreditCard className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 font-cairo">
                {language === 'ar' ? 'دفع محلي عبر كليك (CliQ)' : 'Jordan CliQ Payment'}
              </h4>
              <p className="text-xs text-slate-400">
                {language === 'ar' ? 'تحويل فوري بدون عمولات أو رسوم' : 'Zero fees direct instant local pay'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-2xl glass-card border border-white/10">
            <div className="p-3 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <ShieldCheck className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 font-cairo">
                {language === 'ar' ? 'ضمان أمان 100%' : '100% Guaranteed'}
              </h4>
              <p className="text-xs text-slate-400">
                {language === 'ar' ? 'أكواد رسمية وأصلية مع ضمان دائم' : 'Authentic official codes with warranty'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-2xl glass-card border border-white/10">
            <div className="p-3 rounded-xl bg-pink-600/20 text-pink-400 border border-pink-500/30">
              <Headphones className="w-6 h-6 text-pink-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 font-cairo">
                {language === 'ar' ? 'دعم فني أردني 24/7' : '24/7 Jordan Support'}
              </h4>
              <p className="text-xs text-slate-400">
                {language === 'ar' ? 'خدمة عملاء ومساعدة فورية بالتفعيل' : 'Assistance with console activation'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
        
        {/* Col 1 & 2: Brand Info */}
        <div className="lg:col-span-2 space-y-4">
          <div
            onClick={() => navigateTo('#home')}
            role="button"
            tabIndex={0}
            aria-label={language === 'ar' ? 'الذهاب إلى الصفحة الرئيسية' : 'Go to Home'}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateTo('#home'); } }}
            className="flex items-center gap-3 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-xl"
          >
            {state.settings.branding?.logoUrl ? (
              <img
                src={state.settings.branding.logoUrl}
                alt={language === 'ar' ? 'شعار المتجر' : 'Store Logo'}
                className="w-10 h-10 object-contain rounded-xl shadow-[0_0_15px_rgba(124,58,237,0.5)] bg-black/20"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl shadow-[0_0_15px_rgba(124,58,237,0.5)] flex items-center justify-center font-black text-xl text-white" aria-hidden="true">
                Q
              </div>
            )}
            <div>
              <span className="text-xl font-black text-slate-100 font-display">
                {language === 'ar'
                  ? (state.settings.branding?.customHeaderTitleAr || state.settings.storeNameAr)
                  : (state.settings.branding?.customHeaderTitleEn || state.settings.storeNameEn)}
              </span>
              <p className="text-xs text-purple-400 font-bold">
                {language === 'ar'
                  ? (state.settings.branding?.sloganAr || 'متجر قويدر الرقمي الأردني')
                  : (state.settings.branding?.sloganEn || 'Digital Gaming Store')}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed max-w-md">
            {language === 'ar' ? state.settings.descriptionAr : state.settings.descriptionEn}
          </p>

          {/* Social Links Dynamic Icons */}
          {state.settings.socialLinks && (
            <div className="pt-2">
              <span className="text-[11px] text-slate-400 font-bold block mb-2 font-cairo">
                {language === 'ar' ? 'تابعنا على مواقع التواصل الاجتماعي:' : 'Follow Us:'}
              </span>
              <div className="flex flex-wrap items-center gap-2" role="list" aria-label={language === 'ar' ? 'روابط التواصل الاجتماعي' : 'Social media links'}>
                {state.settings.socialLinks.whatsapp && (
                  <a
                    href={
                      state.settings.socialLinks.whatsapp.startsWith('http')
                        ? state.settings.socialLinks.whatsapp
                        : `https://wa.me/${state.settings.socialLinks.whatsapp.replace(/[^0-9]/g, '')}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    aria-label="WhatsApp Contact"
                    className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  </a>
                )}
                {state.settings.socialLinks.instagram && (
                  <a
                    href={
                      state.settings.socialLinks.instagram.startsWith('http')
                        ? state.settings.socialLinks.instagram
                        : `https://${state.settings.socialLinks.instagram}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram Page"
                    className="p-2 rounded-xl bg-pink-950/60 border border-pink-500/30 text-pink-400 hover:bg-pink-600 hover:text-white transition-all shadow-sm"
                    title="Instagram"
                  >
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                  </a>
                )}
                {state.settings.socialLinks.facebook && (
                  <a
                    href={
                      state.settings.socialLinks.facebook.startsWith('http')
                        ? state.settings.socialLinks.facebook
                        : `https://${state.settings.socialLinks.facebook}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Facebook Page"
                    className="p-2 rounded-xl bg-blue-950/60 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                    title="Facebook"
                  >
                    <Zap className="w-4 h-4" aria-hidden="true" />
                  </a>
                )}
                {state.settings.socialLinks.tiktok && (
                  <a
                    href={
                      state.settings.socialLinks.tiktok.startsWith('http')
                        ? state.settings.socialLinks.tiktok
                        : `https://${state.settings.socialLinks.tiktok}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    aria-label="TikTok Profile"
                    className="p-2 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-300 hover:bg-purple-600 hover:text-white transition-all shadow-sm"
                    title="TikTok"
                  >
                    <Gamepad2 className="w-4 h-4" aria-hidden="true" />
                  </a>
                )}
                {state.settings.socialLinks.youtube && (
                  <a
                    href={
                      state.settings.socialLinks.youtube.startsWith('http')
                        ? state.settings.socialLinks.youtube
                        : `https://${state.settings.socialLinks.youtube}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    aria-label="YouTube Channel"
                    className="p-2 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                    title="YouTube"
                  >
                    <Headphones className="w-4 h-4" aria-hidden="true" />
                  </a>
                )}
                {state.settings.socialLinks.discord && (
                  <a
                    href={
                      state.settings.socialLinks.discord.startsWith('http')
                        ? state.settings.socialLinks.discord
                        : `https://${state.settings.socialLinks.discord}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Discord Server"
                    className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                    title="Discord"
                  >
                    <Clock className="w-4 h-4" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/5 border border-purple-500/30 text-purple-300">
              ⚡ كليك الأردن: {state.settings.cliqAlias}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-slate-300">
              🏦 بنك الاتحاد / العربي / زين كاش
            </span>
          </div>
        </div>

        {/* Col 3: Quick Shop Links */}
        <div>
          <h4 className="text-sm font-bold text-slate-100 mb-4 font-cairo border-b border-purple-500/30 pb-2 inline-block">
            {language === 'ar' ? 'أقسام المتجر' : 'Store Categories'}
          </h4>
          <ul className="space-y-2.5 text-xs text-slate-400" aria-label="Store category links">
            <li>
              <button onClick={() => navigateTo('#store')} aria-label={t.cat_games} className="hover:text-purple-400 transition-colors">
                🎮 {t.cat_games}
              </button>
            </li>
            <li>
              <button onClick={() => navigateTo('#store')} aria-label={t.cat_subscriptions} className="hover:text-purple-400 transition-colors">
                🌟 {t.cat_subscriptions}
              </button>
            </li>
            <li>
              <button onClick={() => navigateTo('#store')} aria-label={t.cat_psn_cards} className="hover:text-purple-400 transition-colors">
                💳 {t.cat_psn_cards}
              </button>
            </li>
            <li>
              <button onClick={() => navigateTo('#store')} aria-label={t.cat_steam_cards} className="hover:text-purple-400 transition-colors">
                🚀 {t.cat_steam_cards}
              </button>
            </li>
          </ul>
        </div>

        {/* Col 4: Customer Services */}
        <div>
          <h4 className="text-sm font-bold text-slate-100 mb-4 font-cairo border-b border-purple-500/30 pb-2 inline-block">
            {language === 'ar' ? 'خدمات الزبائن' : 'Customer Service'}
          </h4>
          <ul className="space-y-2.5 text-xs text-slate-400" aria-label="Customer service links">
            <li>
              <button onClick={() => navigateTo('#orders')} aria-label={t.myOrders} className="hover:text-purple-400 transition-colors">
                📦 {t.myOrders}
              </button>
            </li>
            <li>
              <button onClick={() => navigateTo('#track-order')} aria-label={t.trackOrder} className="hover:text-purple-400 transition-colors text-purple-300 font-bold">
                📍 {t.trackOrder}
              </button>
            </li>
            <li>
              <button onClick={() => navigateTo('#compare')} aria-label={t.compare} className="hover:text-purple-400 transition-colors">
                ⚖️ {t.compare}
              </button>
            </li>
            <li>
              <button onClick={() => navigateTo('#favorites')} aria-label={t.favorites} className="hover:text-purple-400 transition-colors">
                ❤️ {t.favorites}
              </button>
            </li>
            <li>
              <button onClick={() => navigateTo('#payment-methods')} aria-label={t.paymentMethods} className="hover:text-purple-400 transition-colors">
                💳 {t.paymentMethods}
              </button>
            </li>
            <li>
              <button onClick={() => navigateTo('#support')} aria-label={t.support} className="hover:text-purple-400 transition-colors">
                💬 {t.support}
              </button>
            </li>
          </ul>
        </div>

        {/* Col 5: Contact & Location */}
        <div>
          <h4 className="text-sm font-bold text-slate-100 mb-4 font-cairo border-b border-purple-500/30 pb-2 inline-block">
            {language === 'ar' ? 'تواصل معنا' : 'Contact Us'}
          </h4>
          <ul className="space-y-3 text-xs text-slate-400">
            <li className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-400 flex-shrink-0" aria-hidden="true" />
              <span>{language === 'ar' ? state.settings.locationAr : state.settings.locationEn}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-purple-400 flex-shrink-0" aria-hidden="true" />
              <span dir="ltr">{state.settings.contactPhone}</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-400 flex-shrink-0" aria-hidden="true" />
              <span>{state.settings.contactEmail}</span>
            </li>
            <li className="pt-2">
              <button
                id="footer-whatsapp-chat-btn"
                onClick={handleWhatsApp}
                aria-label={language === 'ar' ? 'فتح محادثة واتساب مباشرة' : 'Open direct WhatsApp chat'}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all hover:scale-105"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                <span>{language === 'ar' ? 'محادثة واتساب مباشرة' : 'Direct WhatsApp Chat'}</span>
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10 bg-black/40 py-6 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            {t.allRightsReserved} {new Date().getFullYear()} — {language === 'ar' ? state.settings.storeNameAr : state.settings.storeNameEn}
          </p>
          <div className="flex items-center gap-1.5 text-purple-400 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>{t.jordanianPride}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
