import React from 'react';
import { FileText, ShieldCheck, RotateCcw } from 'lucide-react';
import { useStore } from '../context/StoreContext';

type LegalPage = 'terms' | 'privacy' | 'returns';

const pageMeta = {
  terms: { icon: FileText, ar: 'الشروط والأحكام', en: 'Terms and Conditions' },
  privacy: { icon: ShieldCheck, ar: 'سياسة الخصوصية', en: 'Privacy Policy' },
  returns: { icon: RotateCcw, ar: 'سياسة الإرجاع والاسترداد', en: 'Returns and Refunds Policy' },
} as const;

export const LegalView: React.FC<{ page: LegalPage }> = ({ page }) => {
  const { state, language } = useStore();
  const meta = pageMeta[page];
  const Icon = meta.icon;
  const contentKey = `${page === 'terms' ? 'terms' : page === 'privacy' ? 'privacy' : 'returns'}${language === 'ar' ? 'Ar' : 'En'}` as keyof NonNullable<typeof state.settings.legalContent>;
  const fallback = language === 'ar' ? meta.ar : meta.en;
  const content = state.settings.legalContent?.[contentKey] || fallback;

  return (
    <article dir={language === 'ar' ? 'rtl' : 'ltr'} className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <header className="mb-8 rounded-3xl border border-white/10 bg-slate-950/40 p-6 shadow-xl sm:p-10">
        <div className="mb-4 flex items-center gap-3 text-purple-400">
          <Icon className="h-7 w-7" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-wider">QWADER STORE</span>
        </div>
        <h1 className="text-3xl font-black text-slate-100 sm:text-4xl">{language === 'ar' ? meta.ar : meta.en}</h1>
        <p className="mt-3 text-sm text-slate-400">
          {language === 'ar' ? 'آخر تحديث: سبتمبر 2026' : 'Last updated: September 2026'}
        </p>
      </header>
      <div className="whitespace-pre-line rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm leading-8 text-slate-300 shadow-lg sm:p-10">
        {content}
      </div>
    </article>
  );
};
