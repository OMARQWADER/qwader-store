import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, MapPin, Phone, Sparkles, UserRound } from 'lucide-react';

interface WelcomeViewProps {
  language: 'ar' | 'en';
  email: string;
  initialName: string;
  avatar?: string;
  onComplete: (data: { name: string; phone: string; city: string }) => void;
  onSkip: () => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ language, email, initialName, avatar, onComplete, onSkip }) => {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const isArabic = language === 'ar';
  const Arrow = isArabic ? ArrowLeft : ArrowRight;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    onComplete({ name: name.trim(), phone: phone.trim(), city: city.trim() });
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-10 font-cairo">
      <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-purple-400/20 bg-[#120d1d]/90 shadow-2xl shadow-purple-950/40">
        <div className="relative px-6 pb-8 pt-10 text-center sm:px-12">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500 via-purple-400 to-indigo-500" />
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-purple-300/40 bg-purple-500/15 shadow-lg shadow-purple-900/30">
            {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-10 w-10 text-purple-300" />}
          </div>
          <div className="mb-3 flex items-center justify-center gap-2 text-purple-300">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-bold tracking-wide">{isArabic ? 'أهلاً بك في عائلة قويدر' : 'Welcome to the QWADER family'}</span>
          </div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">
            {isArabic ? `نورتنا${initialName ? ` يا ${initialName}` : ''}` : `Great to have you${initialName ? `, ${initialName}` : ''}`}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400">
            {isArabic ? 'خلّينا نجهز حسابك لتصلك طلباتك وأكوادك بسرعة.' : 'Let us set up your profile so your orders and digital codes reach you faster.'}
          </p>
          <p className="mt-2 text-xs text-purple-300/80" dir="ltr">{email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 border-t border-white/10 px-6 py-7 sm:px-12">
          <label className="block text-xs font-bold text-slate-300">
            {isArabic ? 'الاسم الكامل' : 'Full name'}
            <div className="relative mt-2">
              <UserRound className="absolute start-3 top-3.5 h-4 w-4 text-slate-500" />
              <input required value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 ps-10 text-sm text-white outline-none transition focus:border-purple-400" />
            </div>
          </label>
          <label className="block text-xs font-bold text-slate-300">
            {isArabic ? 'رقم الهاتف' : 'Phone number'}
            <div className="relative mt-2">
              <Phone className="absolute start-3 top-3.5 h-4 w-4 text-slate-500" />
              <input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+962 7 9123 4567" dir="ltr" className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 ps-10 text-sm text-white outline-none transition focus:border-purple-400" />
            </div>
          </label>
          <label className="block text-xs font-bold text-slate-300">
            {isArabic ? 'المدينة (اختياري)' : 'City (optional)'}
            <div className="relative mt-2">
              <MapPin className="absolute start-3 top-3.5 h-4 w-4 text-slate-500" />
              <input value={city} onChange={(event) => setCity(event.target.value)} placeholder={isArabic ? 'عمّان' : 'Amman'} className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 ps-10 text-sm text-white outline-none transition focus:border-purple-400" />
            </div>
          </label>
          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3.5 text-sm font-black text-white shadow-lg shadow-purple-900/30 transition hover:brightness-110">
            <span>{isArabic ? 'انضم إلينا الآن' : 'Join QWADER now'}</span>
            <Arrow className="h-4 w-4" />
          </button>
          <button type="button" onClick={onSkip} className="w-full py-2 text-xs font-bold text-slate-500 transition hover:text-slate-300">
            {isArabic ? 'تخطي الآن وإكمال الملف لاحقاً' : 'Skip for now and finish later'}
          </button>
          <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-300/80">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{isArabic ? 'بياناتك محفوظة بأمان' : 'Your information is kept secure'}</span>
          </div>
        </form>
      </div>
    </div>
  );
};