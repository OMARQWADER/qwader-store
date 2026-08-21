import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  Smartphone,
  MessageCircle,
  RefreshCw,
  Zap,
  AlertTriangle,
  X,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Clock
} from 'lucide-react';

export const TwoStepVerificationModal: React.FC = () => {
  const {
    activeSensitiveChallenge,
    verifySensitiveActionCode,
    cancelSensitiveActionVerification,
    resendSensitiveActionCode,
    language
  } = useStore();

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(300); // 5 minutes
  const [resendCooldown, setResendCooldown] = useState(30);
  const [selectedChannel, setSelectedChannel] = useState<'email' | 'sms' | 'whatsapp'>('email');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize or reset when challenge changes
  useEffect(() => {
    if (!activeSensitiveChallenge) {
      setDigits(['', '', '', '', '', '']);
      setErrorMsg('');
      setIsVerifying(false);
      return;
    }

    setSelectedChannel(activeSensitiveChallenge.deliveryChannel || 'email');
    setDigits(['', '', '', '', '', '']);
    setErrorMsg('');
    setIsVerifying(false);
    setResendCooldown(30);

    // Calculate remaining seconds
    const diff = Math.max(0, Math.floor((activeSensitiveChallenge.expiresAt - Date.now()) / 1000));
    setSecondsRemaining(diff || 300);

    // Auto-focus first input after small delay
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 150);
  }, [activeSensitiveChallenge]);

  // Countdown timer
  useEffect(() => {
    if (!activeSensitiveChallenge) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });

      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSensitiveChallenge]);

  if (!activeSensitiveChallenge) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleDigitChange = (index: number, value: string) => {
    setErrorMsg('');
    // Only accept numeric
    const cleanValue = value.replace(/[^0-9]/g, '');

    // Handle paste of 6 digits
    if (cleanValue.length > 1) {
      const pastedDigits = cleanValue.slice(0, 6).split('');
      const newDigits = [...digits];
      pastedDigits.forEach((d, i) => {
        if (index + i < 6) newDigits[index + i] = d;
      });
      setDigits(newDigits);
      const nextIndex = Math.min(5, index + pastedDigits.length);
      inputRefs.current[nextIndex]?.focus();

      // If all 6 filled, trigger verification
      if (newDigits.every((d) => d !== '')) {
        submitCode(newDigits.join(''));
      }
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleanValue ? cleanValue[cleanValue.length - 1] : '';
    setDigits(newDigits);

    // If single digit entered, focus next input
    if (cleanValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // If all 6 digits are entered, submit automatically
    if (cleanValue && index === 5 && newDigits.every((d) => d !== '')) {
      submitCode(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...digits];
    pastedData.split('').forEach((char, i) => {
      if (i < 6) newDigits[i] = char;
    });
    setDigits(newDigits);

    if (newDigits.every((d) => d !== '')) {
      submitCode(newDigits.join(''));
    } else {
      const nextFocus = Math.min(5, pastedData.length);
      inputRefs.current[nextFocus]?.focus();
    }
  };

  const submitCode = (codeToVerify: string) => {
    if (codeToVerify.length !== 6) {
      setErrorMsg(
        language === 'ar'
          ? 'يرجى إدخال الرمز كاملاً المكون من 6 أرقام'
          : 'Please enter all 6 digits'
      );
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    setTimeout(() => {
      const res = verifySensitiveActionCode(codeToVerify);
      setIsVerifying(false);
      if (!res.success && res.error) {
        setErrorMsg(res.error);
        // Clear digits on error
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    }, 350);
  };

  const handleAutofillActiveCode = () => {
    if (activeSensitiveChallenge?.code) {
      const chars = activeSensitiveChallenge.code.split('');
      setDigits(chars);
      submitCode(activeSensitiveChallenge.code);
    }
  };

  const handleResend = (channel?: 'email' | 'sms' | 'whatsapp') => {
    if (resendCooldown > 0) return;
    const targetChannel = channel || selectedChannel;
    setSelectedChannel(targetChannel);
    resendSensitiveActionCode(targetChannel);
    setResendCooldown(30);
    setDigits(['', '', '', '', '', '']);
    setErrorMsg('');
    inputRefs.current[0]?.focus();
  };

  return (
    <div
      id="two-step-verification-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="two-step-verification-modal"
        className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-purple-500/40 p-6 sm:p-8 shadow-[0_0_50px_rgba(139,92,246,0.25)] text-slate-100 space-y-6"
      >
        {/* Close / Cancel Button */}
        <button
          id="close-two-step-modal-btn"
          onClick={cancelSensitiveActionVerification}
          className="absolute top-5 end-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title={language === 'ar' ? 'إلغاء العملية' : 'Cancel'}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="relative inline-block mx-auto mb-2">
            <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border-2 border-purple-500/50 text-purple-300 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.3)] animate-pulse">
              <ShieldCheck className="w-8 h-8 text-purple-400" />
            </div>
            <div className="absolute -bottom-1 -end-1 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black shadow-lg">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-100 font-cairo">
            {language === 'ar' ? 'التحقق بخطوتين لتأكيد الإجراء' : 'Two-Step Verification'}
          </h2>

          <div className="inline-block px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-bold font-cairo">
            {language === 'ar' ? activeSensitiveChallenge.titleAr : activeSensitiveChallenge.titleEn}
          </div>

          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed pt-1">
            {language === 'ar'
              ? activeSensitiveChallenge.descriptionAr
              : activeSensitiveChallenge.descriptionEn}
          </p>
        </div>

        {/* Delivery Destination & Channel Switcher */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Mail className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <span>{language === 'ar' ? 'الوجهة المسجلة:' : 'Sent to:'}</span>
              <strong className="text-amber-300 font-mono font-bold truncate">
                {activeSensitiveChallenge.targetEmail}
              </strong>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span
                className={`text-xs font-mono font-bold ${
                  secondsRemaining < 60 ? 'text-rose-400 animate-pulse' : 'text-slate-300'
                }`}
              >
                {formatTime(secondsRemaining)}
              </span>
            </div>
          </div>

          {/* Delivery Channels Toggle */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5">
            <button
              type="button"
              onClick={() => handleResend('email')}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                selectedChannel === 'email'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'البريد' : 'Email'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleResend('sms')}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                selectedChannel === 'sms'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>SMS</span>
            </button>

            <button
              type="button"
              onClick={() => handleResend('whatsapp')}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                selectedChannel === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
            </button>
          </div>
        </div>

        {/* 6-Digit PIN Input Fields */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-200 text-center font-cairo">
            {language === 'ar'
              ? 'أدخل رمز التحقق المكون من 6 أرقام (OTP):'
              : 'Enter the 6-digit verification code (OTP):'}
          </label>

          <div
            className="flex justify-center items-center gap-2 sm:gap-3 dir-ltr"
            dir="ltr"
          >
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                id={`digit-input-${idx}`}
                className={`w-11 h-13 sm:w-13 sm:h-15 text-center text-xl sm:text-2xl font-mono font-black rounded-2xl border-2 transition-all outline-none ${
                  digit
                    ? 'border-purple-400 bg-purple-950/60 text-amber-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                    : 'border-slate-700 bg-slate-900/80 text-white hover:border-slate-500 focus:border-purple-500 focus:bg-slate-900'
                }`}
              />
            ))}
          </div>

          {/* Error Message Display */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs flex items-center justify-center gap-2 animate-shake">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Quick Testing & Autofill Button */}
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>
              {language === 'ar'
                ? 'وصلك رمز التحقق في الإشعار العلوي؟'
                : 'Received the verification code in your notification?'}
            </span>
          </div>

          <button
            type="button"
            id="autofill-active-code-btn"
            onClick={handleAutofillActiveCode}
            className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 fill-amber-300" />
            <span>{language === 'ar' ? 'تعبئة الرمز تلقائياً' : 'Autofill Code'}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            id="confirm-two-step-verification-btn"
            disabled={isVerifying || digits.some((d) => d === '')}
            onClick={() => submitCode(digits.join(''))}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm shadow-xl shadow-purple-900/40 hover:scale-[1.01] active:scale-95 transition-all font-cairo flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>{language === 'ar' ? 'جارٍ التحقق الأمني...' : 'Verifying Code...'}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>{language === 'ar' ? 'تأكيد وإتمام الإجراء' : 'Confirm & Proceed'}</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <button
              type="button"
              id="resend-code-btn"
              disabled={resendCooldown > 0}
              onClick={() => handleResend()}
              className="hover:text-purple-300 disabled:opacity-40 disabled:hover:text-slate-400 transition-colors flex items-center gap-1.5 font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? '' : 'text-purple-400'}`} />
              <span>
                {resendCooldown > 0
                  ? language === 'ar'
                    ? `إعادة الإرسال خلال (${resendCooldown} ثانية)`
                    : `Resend code in (${resendCooldown}s)`
                  : language === 'ar'
                  ? 'إعادة إرسال رمز جديد'
                  : 'Resend New Code'}
              </span>
            </button>

            <button
              type="button"
              id="cancel-two-step-btn"
              onClick={cancelSensitiveActionVerification}
              className="text-slate-400 hover:text-rose-400 underline transition-colors"
            >
              {language === 'ar' ? 'إلغاء الأمر' : 'Cancel Action'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
