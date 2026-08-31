import React, { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  Mail,
  Copy,
  Check,
  X,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Clock,
  Smartphone,
  MessageCircle
} from 'lucide-react';

export const SimulatedEmailNotification: React.FC = () => {
  const {
    simulatedEmailMessage,
    clearSimulatedEmailMessage,
    language
  } = useStore();

  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(100);

  // Auto-dismiss countdown progress
  useEffect(() => {
    if (!simulatedEmailMessage) {
      setProgress(100);
      setCopied(false);
      return;
    }

    const duration = 25000; // 25 seconds
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remainingPct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remainingPct);
      if (remainingPct <= 0) {
        clearInterval(interval);
        clearSimulatedEmailMessage();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [simulatedEmailMessage, clearSimulatedEmailMessage]);

  if (!simulatedEmailMessage) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText('');
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <aside
      id="simulated-email-notification-banner"
      aria-label="Simulation Notification Banner"
      className="fixed top-20 end-4 sm:end-6 z-50 max-w-md w-[calc(100vw-2rem)] animate-in slide-in-from-top-4 duration-300 pointer-events-auto"
    >
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/95 backdrop-blur-xl border-2 border-purple-500/60 shadow-[0_10px_40px_rgba(139,92,246,0.35)] text-slate-100 p-4 space-y-3">
        
        {/* Progress Bar Header */}
        <div
          className="absolute top-0 start-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />

        {/* Sender & Badge Info */}
        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-400/50 flex items-center justify-center text-purple-300 flex-shrink-0 shadow-inner">
              {simulatedEmailMessage.channel === 'whatsapp' ? (
                <MessageCircle className="w-5 h-5 text-emerald-400" />
              ) : simulatedEmailMessage.channel === 'sms' ? (
                <Smartphone className="w-5 h-5 text-cyan-400" />
              ) : (
                <Mail className="w-5 h-5 text-purple-300" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black uppercase text-purple-300 tracking-wider">
                  {simulatedEmailMessage.channel === 'whatsapp'
                    ? (language === 'ar' ? '📱 إشعار واتساب جديد' : '📱 New WhatsApp Message')
                    : simulatedEmailMessage.channel === 'sms'
                    ? (language === 'ar' ? '💬 رسالة SMS نصية' : '💬 New SMS Text')
                    : (language === 'ar' ? '📧 بريد إلكتروني أمني جديد' : '📧 New Security Email')}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  {language === 'ar' ? 'إشعار أمني رسمي' : 'Official Security Notice'}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-200 truncate mt-0.5">
                {language === 'ar' ? 'أمان متجر قويدر ستور' : 'Qwader Store Security'} &lt;security@qwaderstore.jo&gt;
              </p>
            </div>
          </div>

          <button
            title={language === 'ar' ? 'إغلاق الإشعار' : 'Close'}
            id="dismiss-email-notification-btn"
            onClick={clearSimulatedEmailMessage}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Email Content Box */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-white/5 pb-1.5">
            <span className="truncate">
              {language === 'ar' ? 'إلى:' : 'To:'} <strong className="text-slate-200">{simulatedEmailMessage.toEmail}</strong>
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1 flex-shrink-0">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{language === 'ar' ? 'الآن' : 'Just now'}</span>
            </span>
          </div>

          <p className="text-xs text-slate-300 font-medium leading-relaxed">
            {language === 'ar'
              ? `طلب التحقق لتأكيد: ${simulatedEmailMessage.actionNameAr}`
              : `Security verification request for: ${simulatedEmailMessage.actionNameEn}`}
          </p>

          {/* Security Notice */}
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-purple-950/70 border border-purple-500/40 shadow-inner">
            <div>
              <span className="block text-[10px] text-purple-300 font-semibold">
                {language === 'ar' ? 'حالة الإرسال:' : 'Delivery status:'}
              </span>
              <span className="block text-base font-bold text-emerald-300">
                {language === 'ar' ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.' : 'Verification code has been sent to your email.'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                title={language === 'ar' ? 'نسخ' : 'Copy'}
                id="copy-simulated-code-btn"
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition-all active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[11px]">{copied ? (language === 'ar' ? 'تم النسخ' : 'Copied') : (language === 'ar' ? 'نسخ' : 'Copy')}</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 text-center">
          {language === 'ar'
            ? '💡 تم إرسال الرمز إلى بريدك الإلكتروني الرسمي فقط. لا تشارك أي رمز أمان مع أي شخص.'
            : '💡 The code has been sent to your official email only. Never share any verification code with anyone.'}
        </p>
      </div>
    </aside>
  );
};
