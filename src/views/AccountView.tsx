import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  User as UserIcon,
  Crown,
  ShieldCheck,
  Package,
  Heart,
  LogOut,
  Mail,
  Phone,
  Lock,
  Check,
  Layers,
  ArrowRight,
  ArrowLeft,
  Shield,
  KeyRound,
  QrCode,
  Smartphone,
  Copy,
  Download,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  MapPin,
  Camera,
  CheckCircle2,
  X
} from 'lucide-react';
import {
  generate2FASecret,
  generateBackupCodes,
  getOTPAuthUri,
  generateQRCodeSVG,
  calculateCurrentTOTP,
  generateNumericOTP
} from '../utils/twoFactor';
export const AccountView: React.FC = () => {
  const {
    currentUser,
    pendingTwoFactorUser,
    login,
    logout,
    completePasswordlessLogin,
    createCustomerAccount,
    signInCustomer,
    completeTwoFactorLogin,
    cancelTwoFactorLogin,
    resendTwoFactorLoginOTP,
    enableTwoFactor,
    disableTwoFactor,
    regenerateBackupCodes,
    requestSensitiveActionVerification,
    updateUserProfile,
    formatPrice,
    wishlist,
    state,
    language,
    navigateTo,
    t,
  } = useStore();

  // Mode & Tabs
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'orders'>('profile');

  // Auth Inputs
  const [email, setEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [authStep, setAuthStep] = useState<'email' | 'code'>('email');
  const [twoFactorInputCode, setTwoFactorInputCode] = useState('');
  const [isUsingBackupCode, setIsUsingBackupCode] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileCountryCode, setProfileCountryCode] = useState('+962');
  const [profilePromotionalEmails, setProfilePromotionalEmails] = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<{ email: string; authUid: string; avatar?: string } | null>(null);


  // Profile Edit Inputs
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '');
  const [editCity, setEditCity] = useState(currentUser?.city || '');
  const [editAvatar, setEditAvatar] = useState(currentUser?.avatar || '');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // 2FA Setup Wizard State
  const [is2FASetupModalOpen, setIs2FASetupModalOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<'choose' | 'scan' | 'verify' | 'backup'>('choose');
  const [selectedMethod, setSelectedMethod] = useState<'authenticator' | 'whatsapp' | 'email'>('authenticator');
  const [tempSecret, setTempSecret] = useState('');
  const [tempBackupCodes, setTempBackupCodes] = useState<string[]>([]);
  const [setupOtpCode, setSetupOtpCode] = useState('');
  const [verifyCodeInput, setVerifyCodeInput] = useState('');
  const [setupError, setSetupError] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  // 2FA Disable State
  const [disableError, setDisableError] = useState<string>('');

  const userOrders = (state?.orders || []).filter(
    (o) => o.userId === currentUser?.id || o.customerPhone === currentUser?.phone
  );

  // Start 2FA Setup
  const handleStart2FASetup = () => {
    const secret = generate2FASecret();
    const backupCodes = generateBackupCodes(8);
    setTempSecret(secret);
    setTempBackupCodes(backupCodes);
    setSetupOtpCode('');
    setVerifyCodeInput('');
    setSetupError('');
    setSetupStep('choose');
    setIs2FASetupModalOpen(true);
  };

  const sendSetupOtp = async () => {
    const otpCode = generateNumericOTP(6);
    setSetupOtpCode(otpCode);
    setSetupError('');

    const result = // await sendOtpEmail({
      toEmail: currentUser?.email || '',
      code: otpCode,
      purpose: language === 'ar' ? 'تفعيل التحقق بخطوتين' : 'Two-factor activation verification'
    });

    if (!result.success) {
      setSetupOtpCode('');
      setSetupError(
        result.error || (language === 'ar' ? 'تعذر إرسال رمز التحقق إلى بريدك الإلكتروني' : 'Could not send the verification code to your email.')
      );
      return false;
    }

    return true;
  };

  // Submit 2FA Verification
  const handleConfirm2FAEnable = (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');
    const res = enableTwoFactor(
      selectedMethod,
      tempSecret,
      verifyCodeInput,
      setupOtpCode,
      tempBackupCodes,
      currentUser?.phone
    );

    if (res.success) {
      setSetupStep('backup');
    } else if (res.error) {
      setSetupError(res.error);
    }
  };

  // Download Backup Codes as .txt
  const handleDownloadBackupCodes = () => {
    const codes = currentUser?.twoFactorBackupCodes || tempBackupCodes;
    const text = `=== قويدر ستور | QWADER STORE ===\nرموز الاسترداد الاحتياطية للتحقق بخطوتين (2FA Backup Codes)\nالحساب: ${currentUser?.email}\nالتاريخ: ${new Date().toLocaleDateString()}\n\nاحتفظ بهذه الرموز في مكان آمن جداً. كل رمز يستخدم لمرة واحدة فقط للدخول في حال فقدان هاتفك:\n\n${codes.join('\n')}\n\n=== https://qwaderstore.jo ===`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qwader-2fa-backup-codes-${currentUser?.email || 'user'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy backup codes to clipboard
  const handleCopyBackupCodes = () => {
    const codes = currentUser?.twoFactorBackupCodes || tempBackupCodes;
    navigator.clipboard?.writeText(codes.join('\n'));
    setCopiedBackupCodes(true);
    setTimeout(() => setCopiedBackupCodes(false), 2500);
  };

  // Handle Main Auth Submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (authStep === 'email') {
      const res = await login(email.trim());
      if (res.success) {
        setAuthStep('code');
        setAuthCode('');
      } else if (res.error) {
        setAuthError(res.error);
      }
      return;
    }

    const res = completePasswordlessLogin(email.trim(), authCode.trim());
    if (res.success && res.requiresProfile) {
      setProfileFirstName('');
      setProfileLastName('');
      setProfilePhone('');
      setProfileCountryCode('+962');
      setProfilePromotionalEmails(false);
      setPendingGoogleUser(null);
      setIsProfileModalOpen(true);
    } else if (!res.success && res.error) {
      setAuthError(res.error);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(language === 'ar' ? 'تم تعطيل تسجيل الدخول عبر Google في الوضع المحلي.' : 'Google sign-in is disabled in local-only mode.');
  };

  const handleProfileSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = createCustomerAccount({
      firstName: profileFirstName,
      lastName: profileLastName,
      phone: `${profileCountryCode} ${profilePhone}`,
      email: pendingGoogleUser?.email || email,
      promotionalEmails: profilePromotionalEmails,
      authUid: pendingGoogleUser?.authUid,
      avatar: pendingGoogleUser?.avatar,
    });
    if (!result.success) {
      setAuthError(result.error || '');
      return;
    }
    setIsProfileModalOpen(false);
    setPendingGoogleUser(null);
  };

  // Handle 2FA Login Completion
  const handle2FALoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!twoFactorInputCode.trim()) {
      setAuthError(language === 'ar' ? 'يرجى إدخال الرمز' : 'Please enter the code');
      return;
    }
    const res = completeTwoFactorLogin(twoFactorInputCode.trim());
    if (!res.success && res.error) {
      setAuthError(res.error);
    }
  };

  // Handle Save Profile with Two-Step Verification
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    requestSensitiveActionVerification({
      actionType: 'profile_update',
      titleAr: 'تأكيد تعديل بيانات الملف الشخصي',
      titleEn: 'Confirm Profile Update',
      descriptionAr: 'لحماية حسابك وتأكيد هويتك، يرجى إدخال رمز التحقق المكون من 6 أرقام المرسل إلى بريدك الإلكتروني.',
      descriptionEn:
        'To protect your account, please enter the 6-digit verification code sent to your registered email.',
      onSuccess: () => {
        updateUserProfile({
          name: editName.trim() || currentUser?.name,
          phone: editPhone.trim() || currentUser?.phone,
          city: editCity.trim(),
          avatar: editAvatar.trim() || currentUser?.avatar,
        });
        setIsEditingProfile(false);
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* CASE 1: 2FA Login Verification Challenge */}
      {pendingTwoFactorUser && !currentUser ? (
        <div className="max-w-md mx-auto p-8 rounded-3xl glass-card border border-white/10 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-100 font-cairo">
              {language === 'ar' ? 'التحقق بخطوتين (2FA)' : 'Two-Factor Authentication'}
            </h2>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {isUsingBackupCode
                ? language === 'ar'
                  ? 'أدخل أحد رموز الاسترداد الاحتياطية (8 أحرف مثل QW9X-4421)'
                  : 'Enter one of your 8-character backup recovery codes'
                : pendingTwoFactorUser.twoFactorMethod === 'email'
                ? language === 'ar'
                  ? `أدخل رمز الأمان المكون من 6 أرقام المرسل إلى بريدك الإلكتروني (${pendingTwoFactorUser.email})`
                  : `Enter the 6-digit security code sent to your email (${pendingTwoFactorUser.email})`
                : pendingTwoFactorUser.twoFactorMethod === 'whatsapp'
                ? language === 'ar'
                  ? `أدخل رمز التحقق المرسل عبر الواتساب إلى رقمك (${pendingTwoFactorUser.twoFactorPhone || pendingTwoFactorUser.phone})`
                  : `Enter verification code sent via WhatsApp`
                : language === 'ar'
                ? 'أدخل الرمز المكون من 6 أرقام من تطبيق المصادقة أو بريدك الإلكتروني'
                : 'Enter the 6-digit code from your Authenticator App or Email'}
            </p>
          </div>

          <form onSubmit={handle2FALoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-300 font-semibold mb-2 text-center">
                {isUsingBackupCode
                  ? language === 'ar' ? 'رمز الاسترداد الاحتياطي' : 'Backup Recovery Code'
                  : language === 'ar' ? 'رمز التحقق (6 أرقام)' : '6-Digit Security Code'}
              </label>
              <input
                type="text"
                autoFocus
                required
                value={twoFactorInputCode}
                onChange={(e) => setTwoFactorInputCode(e.target.value)}
                placeholder={isUsingBackupCode ? 'QW9X-4421' : '123456'}
                className="w-full p-4 rounded-2xl text-center text-xl tracking-widest font-mono font-bold bg-white/10 border border-purple-500/40 text-white focus:border-purple-400 focus:outline-none shadow-inner"
              />
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold text-center">
                {authError}
              </div>
            )}

            <button
              id="submit-2fa-login-btn"
              type="submit"
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-purple-900/30 transition-all font-cairo"
            >
              {language === 'ar' ? 'تأكيد ودخول الحساب 🛡️' : 'Verify & Sign In 🛡️'}
            </button>
          </form>

          <div className="flex flex-col gap-2 pt-4 border-t border-white/10 text-center">
            <button
              type="button"
              onClick={() => resendTwoFactorLoginOTP()}
              className="text-xs text-amber-300 hover:text-amber-200 font-semibold flex items-center justify-center gap-1.5 py-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'لم يصلك الرمز؟ أعد إرسال رمز الأمان إلى البريد الإلكتروني' : 'Resend security code via email'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsUsingBackupCode(!isUsingBackupCode);
                setAuthError('');
                setTwoFactorInputCode('');
              }}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
            >
              {isUsingBackupCode
                ? language === 'ar'
                  ? 'الرجوع لاستخدام رمز التحقق المباشر 📲'
                  : 'Use verification code instead'
                : language === 'ar'
                ? 'فقدت هاتفك؟ استخدم رمز الاسترداد الاحتياطي 🔑'
                : 'Lost phone? Use backup recovery code'}
            </button>

            <button
              type="button"
              onClick={cancelTwoFactorLogin}
              className="text-xs text-slate-400 hover:text-slate-200 mt-1"
            >
              {language === 'ar' ? 'إلغاء والعودة لتسجيل الدخول' : 'Cancel & return to login'}
            </button>
          </div>
        </div>
      ) : currentUser ? (
        /* CASE 2: Logged In Account Dashboard */
        <div className="space-y-6">

          {/* User Profile Header Card */}
          <div className="p-6 sm:p-8 rounded-3xl glass-card border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <img
                src={currentUser.avatar || '/images/avatar-placeholder.svg'}
                alt={currentUser.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-400/50 shadow-lg"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-100 font-cairo">{currentUser.name}</h1>
                  <span
                    className={`px-3 py-0.5 rounded-full text-xs font-black uppercase border ${
                      currentUser.role === 'owner'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                        : currentUser.role === 'staff'
                        ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {currentUser.role === 'owner' ? '👑 Owner' : currentUser.role === 'staff' ? '🛡️ Staff' : '👤 Customer'}
                  </span>

                  {currentUser.twoFactorEnabled ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-amber-400" />
                      <span>2FA محمي</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-white/10 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      <span>2FA غير مفعل</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5" dir="ltr">
                  <Mail className="w-3.5 h-3.5 text-purple-400" />
                  <span>{currentUser.email}</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5" dir="ltr">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{currentUser.phone}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {(currentUser.role === 'owner' || currentUser.role === 'staff') && (
                <button
                  id="account-go-to-admin-btn"
                  onClick={() => navigateTo('#admin')}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 transition-all font-cairo"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t.adminDashboard}</span>
                </button>
              )}

              <button
                id="account-logout-btn"
                onClick={logout}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full glass-panel border border-white/10 text-rose-400 hover:bg-rose-950/30 text-xs font-bold transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.logout}</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 font-cairo whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>{language === 'ar' ? 'الملف الشخصي' : 'Profile Details'}</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 font-cairo whitespace-nowrap ${
                activeTab === 'security'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>{language === 'ar' ? 'الأمان والتحقق بخطوتين (2FA)' : 'Security & 2FA'}</span>
              {currentUser.twoFactorEnabled && (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 font-cairo whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>{t.myOrders} ({userOrders.length})</span>
            </button>
          </div>

          {/* TAB 1: PROFILE DETAILS */}
          {activeTab === 'profile' && (
            <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-white/10 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-cairo">
                    {language === 'ar' ? 'بيانات الحساب والمعلومات الشخصية' : 'Personal Information'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'ar' ? 'يمكنك تحديث اسمك، رقم الهاتف وعنوان التوصيل' : 'Update your profile information'}
                  </p>
                </div>

                {!isEditingProfile ? (
                  <button
                    onClick={() => {
                      setEditName(currentUser.name);
                      setEditPhone(currentUser.phone);
                      setEditCity(currentUser.city || '');
                      setEditAvatar(currentUser.avatar || '');
                      setIsEditingProfile(true);
                    }}
                    className="px-4 py-2 rounded-full bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-300 text-xs font-bold transition-all"
                  >
                    {language === 'ar' ? 'تعديل البيانات' : 'Edit Profile'}
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold transition-all"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                )}
              </div>

              {isEditingProfile ? (
                <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">{t.fullName}</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full p-3 rounded-2xl text-xs bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">{t.phone}</label>
                      <input
                        type="tel"
                        required
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full p-3 rounded-2xl text-xs bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        {language === 'ar' ? 'المدينة / العنوان' : 'City / Location'}
                      </label>
                      <input
                        type="text"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder="عمان - خلدا"
                        className="w-full p-3 rounded-2xl text-xs bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 font-semibold mb-1">
                        {language === 'ar' ? 'رابط الصورة الشخصية (Avatar URL)' : 'Avatar Image URL'}
                      </label>
                      <input
                        type="url"
                        value={editAvatar}
                        onChange={(e) => setEditAvatar(e.target.value)}
                        placeholder="https://..."
                        className="w-full p-3 rounded-2xl text-xs bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>

                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 transition-all font-cairo"
                  >
                    {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                  </button>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                    <span className="text-[11px] text-slate-400 font-semibold block">{t.fullName}</span>
                    <span className="text-sm font-bold text-slate-200">{currentUser.name}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                    <span className="text-[11px] text-slate-400 font-semibold block">{t.email}</span>
                    <span className="text-sm font-bold text-slate-200 font-mono" dir="ltr">{currentUser.email}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                    <span className="text-[11px] text-slate-400 font-semibold block">{t.phone}</span>
                    <span className="text-sm font-bold text-slate-200 font-mono" dir="ltr">{currentUser.phone}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                    <span className="text-[11px] text-slate-400 font-semibold block">{language === 'ar' ? 'المدينة / المنطقة' : 'City'}</span>
                    <span className="text-sm font-bold text-slate-200">{currentUser.city || 'عمان - الأردن 🇯🇴'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SECURITY & 2FA (التحقق بخطوتين) */}
          {activeTab === 'security' && (
            <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-white/10 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-cairo flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                    <span>{language === 'ar' ? 'التحقق بخطوتين (Two-Factor Authentication - 2FA)' : 'Two-Factor Authentication (2FA)'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {language === 'ar'
                      ? 'طبقة أمان إضافية تحمي حسابك من الاختراق وتطلب رمز أمان عند كل تسجيل دخول'
                      : 'Add an extra layer of security requiring a 6-digit code when signing in'}
                  </p>
                </div>

                {currentUser.twoFactorEnabled ? (
                  <button
                    onClick={() => {
                      const result = disableTwoFactor();
                      if (!result.success) setDisableError(result.error || 'Unable to disable 2FA');
                    }}
                    className="px-4 py-2 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all"
                  >
                    {language === 'ar' ? 'تعطيل التحقق بخطوتين' : 'Disable 2FA'}
                  </button>
                ) : (
                  <button
                    id="enable-2fa-btn"
                    onClick={handleStart2FASetup}
                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-purple-900/30 transition-all font-cairo flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-300" />
                    <span>{language === 'ar' ? 'تفعيل التحقق بخطوتين الآن 🛡️' : 'Enable 2FA Now 🛡️'}</span>
                  </button>
                )}
              </div>

              {currentUser.twoFactorEnabled ? (
                /* 2FA Enabled Status Card */
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 mt-0.5">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-emerald-300 font-cairo">
                        {language === 'ar' ? 'حسابك محمي بالتحقق بخطوتين (2FA Active)' : '2FA Protection is Active'}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1">
                        {language === 'ar'
                          ? `طريقة التحقق النشطة: ${currentUser.twoFactorMethod === 'whatsapp' ? 'الواتساب (WhatsApp OTP)' : 'تطبيق المصادقة (Google Authenticator)'}`
                          : `Active Method: ${currentUser.twoFactorMethod || 'Authenticator App'}`}
                      </p>
                      {currentUser.twoFactorCreatedAt && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {language === 'ar' ? 'تاريخ التفعيل:' : 'Enabled on:'}{' '}
                          {new Date(currentUser.twoFactorCreatedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Backup Codes Section */}
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-bold text-slate-200 font-cairo">
                          {language === 'ar' ? 'رموز الطوارئ والاسترداد الاحتياطية (Backup Codes)' : 'Emergency Backup Codes'}
                        </h4>
                      </div>
                      <span className="text-xs font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                        {currentUser.twoFactorBackupCodes?.length || 0} {language === 'ar' ? 'رموز متبقية' : 'codes left'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">
                      {language === 'ar'
                        ? 'تستخدم هذه الرموز لمرة واحدة في حال فقدت الوصول لهاتفك أو تطبيق المصادقة.'
                        : 'Use these one-time codes if you lose access to your phone or authenticator app.'}
                    </p>

                    {currentUser.twoFactorBackupCodes && currentUser.twoFactorBackupCodes.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
                        {currentUser.twoFactorBackupCodes.map((code, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-center font-bold text-slate-200"
                          >
                            {code}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={handleCopyBackupCodes}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold transition-all"
                      >
                        {copiedBackupCodes ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedBackupCodes ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') : (language === 'ar' ? 'نسخ الرموز' : 'Copy Codes')}</span>
                      </button>

                      <button
                        onClick={handleDownloadBackupCodes}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'تحميل كملف نصي (.txt)' : 'Download .txt'}</span>
                      </button>

                      <button
                        onClick={() => regenerateBackupCodes()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'إنشاء رموز جديدة' : 'Regenerate Codes'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* 2FA Inactive Promo Banner */
                <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-amber-300 font-cairo">
                        {language === 'ar' ? 'التحقق بخطوتين غير مفعّل حالياً' : '2FA is currently disabled'}
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {language === 'ar'
                          ? 'نوصي بشدة بتفعيل التحقق بخطوتين لحماية مشترياتك وأكواد الألعاب ومحفظتك الرقمية.'
                          : 'We strongly recommend enabling 2FA to protect your orders, game keys, and account.'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleStart2FASetup}
                    className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all font-cairo whitespace-nowrap"
                  >
                    {language === 'ar' ? 'بدء الإعداد الآن' : 'Set Up 2FA'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-100 font-cairo">
                  {language === 'ar' ? 'طلباتي ومشترياتي الرقمية' : 'My Digital Orders'}
                </h3>
                <button
                  onClick={() => navigateTo('#orders')}
                  className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
                >
                  <span>{language === 'ar' ? 'عرض كافة تفاصيل الطلبات والتايم لاين' : 'View full timeline'}</span>
                  {language === 'ar' ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>

              {userOrders.length === 0 ? (
                <div className="p-8 rounded-3xl glass-panel border border-white/10 text-center space-y-3">
                  <Package className="w-12 h-12 text-slate-500 mx-auto" />
                  <p className="text-sm font-bold text-slate-300 font-cairo">
                    {language === 'ar' ? 'لا توجد طلبات مسجلة بعد' : 'No orders yet'}
                  </p>
                  <button
                    onClick={() => navigateTo('#store')}
                    className="px-5 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                  >
                    {language === 'ar' ? 'تصفح المتجر الآن' : 'Browse Store'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {userOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => navigateTo('#orders')}
                      className="p-5 rounded-2xl glass-panel border border-white/10 hover:border-purple-500/40 cursor-pointer transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-purple-400 font-mono">{order.orderNumber}</span>
                          <span className="text-xs text-slate-400">• {new Date(order.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-100 mt-1 font-cairo">
                          {(order.items || []).map((i) => language === 'ar' ? i.productNameAr : i.productNameEn).join(' + ')}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <span className="text-sm font-bold text-emerald-400">
                          {formatPrice(order.totalJOD, order.totalUSD)}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-600/30 text-purple-300 border border-purple-500/40">
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      ) : (
        /* CASE 3: Logged Out Login / Register View */
        <div className="max-w-md mx-auto space-y-6">
          <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-400 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-100 font-cairo">
                {language === 'ar' ? 'تسجيل الدخول' : 'Sign in'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'ar' ? 'سجل دخولك لمتابعة مشترياتك وحسابك الرقمي' : 'Sign in to access your digital orders'}
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">{t.email}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@gmail.com"
                  className="w-full p-3.5 rounded-2xl text-xs bg-white/5 border border-white/10 text-slate-100 focus:border-purple-500 focus:outline-none text-start"
                  dir="ltr"
                />
              </div>

              {authStep === 'code' && (
                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">
                    {language === 'ar' ? 'رمز التحقق المرسل إلى بريدك' : 'Verification code sent to your email'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={6}
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    placeholder="123456"
                    className="w-full p-3.5 rounded-2xl text-center text-lg tracking-widest font-mono font-bold bg-white/10 border border-purple-500/40 text-white focus:border-purple-400 focus:outline-none"
                  />
                </div>
              )}

              {authError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold text-center">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 transition-all font-cairo"
              >
                {authStep === 'email'
                  ? (language === 'ar' ? 'إرسال رمز التحقق' : 'Send verification code')
                  : (language === 'ar' ? 'تأكيد الدخول' : 'Verify and sign in')}
              </button>
              {authStep === 'code' && (
                <button type="button" onClick={() => setAuthStep('email')} className="w-full text-xs text-slate-400 hover:text-white">
                  {language === 'ar' ? 'تغيير البريد الإلكتروني' : 'Use a different email'}
                </button>
              )}
            </form>
            <div className="relative border-t border-white/10 pt-5">
              <span className="absolute -top-2.5 start-1/2 -translate-x-1/2 bg-slate-900 px-3 text-[10px] text-slate-500">
                {language === 'ar' ? 'أو' : 'OR'}
              </span>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 py-3.5 text-xs font-bold text-white transition-all hover:bg-white/10"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-black text-[#4285F4]">G</span>
                {language === 'ar' ? 'تسجيل الدخول عبر Google' : 'Sign in with Google'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <form onSubmit={handleProfileSubmit} className="w-full max-w-md space-y-5 rounded-3xl border border-purple-500/40 bg-slate-900 p-6 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white font-cairo">{language === 'ar' ? 'بياناتك الأساسية' : 'Basic information'}</h3>
              <p className="mt-1 text-xs text-slate-400">{language === 'ar' ? 'أكمل بياناتك للمتابعة إلى حسابك' : 'Complete your details to continue'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input required value={profileFirstName} onChange={(e) => setProfileFirstName(e.target.value)} placeholder={language === 'ar' ? 'الاسم الأول' : 'First name'} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-purple-500" />
              <input required value={profileLastName} onChange={(e) => setProfileLastName(e.target.value)} placeholder={language === 'ar' ? 'الاسم الأخير' : 'Last name'} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-purple-500" />
            </div>
            <div className="flex gap-2">
              <select value={profileCountryCode} onChange={(e) => setProfileCountryCode(e.target.value)} className="rounded-xl border border-white/10 bg-slate-800 p-3 text-sm text-white outline-none">
                <option value="+962">+962</option><option value="+966">+966</option><option value="+971">+971</option><option value="+20">+20</option><option value="+1">+1</option><option value="+44">+44</option>
              </select>
              <input required value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder={language === 'ar' ? 'رقم الهاتف' : 'Phone number'} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-purple-500" dir="ltr" />
            </div>
            <label className="flex items-start gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={profilePromotionalEmails} onChange={(e) => setProfilePromotionalEmails(e.target.checked)} className="mt-0.5 accent-purple-500" />
              <span>{language === 'ar' ? 'أرغب في تلقي الرسائل الترويجية عبر البريد الإلكتروني' : 'I would like to receive promotional emails'}</span>
            </label>
            {authError && <div className="rounded-xl border border-rose-500/40 bg-rose-500/20 p-3 text-center text-xs text-rose-300">{authError}</div>}
            <button type="submit" className="w-full rounded-full bg-purple-600 py-3.5 text-xs font-bold text-white transition hover:bg-purple-500">
              {language === 'ar' ? 'التسجيل' : 'Register'}
            </button>
          </form>
        </div>
      )}

      {/* 2FA SETUP WIZARD MODAL */}
      {is2FASetupModalOpen && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg p-6 sm:p-8 rounded-3xl glass-card border border-purple-500/40 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIs2FASetupModalOpen(false)}
              className="absolute top-5 left-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400"
              title={language === 'ar' ? 'إغلاق النافذة' : 'Close window'}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Step 1: Choose 2FA Method */}
            {setupStep === 'choose' && (
              <div className="space-y-5 text-center">
                <div className="w-14 h-14 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-cairo">
                    {language === 'ar' ? 'اختر طريقة التحقق بخطوتين' : 'Choose 2FA Method'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    {language === 'ar'
                      ? 'حدد الطريقة المفضلة لتلقي رموز الأمان وتسجيل الدخول'
                      : 'Select your preferred two-factor verification method'}
                  </p>
                </div>

                <div className="space-y-3 text-start">
                  <div
                    onClick={() => setSelectedMethod('authenticator')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-4 ${
                      selectedMethod === 'authenticator'
                        ? 'bg-purple-600/20 border-purple-500 text-white'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="p-3 rounded-xl bg-purple-600/30 text-purple-300">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold font-cairo text-white">
                        {language === 'ar' ? 'تطبيق المصادقة (مُوصى به)' : 'Authenticator App (Recommended)'}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {language === 'ar'
                          ? 'Google Authenticator, Microsoft, Apple Passwords, Authy'
                          : 'Use Google Authenticator, Authy, or Apple Passwords'}
                      </p>
                    </div>
                    {selectedMethod === 'authenticator' && <CheckCircle2 className="w-5 h-5 text-purple-400" />}
                  </div>

                  <div
                    onClick={() => setSelectedMethod('whatsapp')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-4 ${
                      selectedMethod === 'whatsapp'
                        ? 'bg-emerald-600/20 border-emerald-500 text-white'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="p-3 rounded-xl bg-emerald-600/30 text-emerald-300">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold font-cairo text-white">
                        {language === 'ar' ? 'رمز عبر الواتساب (WhatsApp OTP)' : 'WhatsApp OTP'}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {language === 'ar'
                          ? `إرسال رمز فوري على رقمك: ${currentUser.phone || 'غير مسجل'}`
                          : `Receive 6-digit code on ${currentUser.phone || 'Not set'}`}
                      </p>
                    </div>
                    {selectedMethod === 'whatsapp' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  </div>

                  <div
                    onClick={() => setSelectedMethod('email')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-4 ${
                      selectedMethod === 'email'
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="p-3 rounded-xl bg-blue-600/30 text-blue-300">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold font-cairo text-white">
                        {language === 'ar' ? 'رمز عبر البريد الإلكتروني (Email OTP)' : 'Email Security Code'}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {language === 'ar'
                          ? `إرسال رمز فوري إلى بريدك: ${currentUser.email}`
                          : `Receive 6-digit code on ${currentUser.email}`}
                      </p>
                    </div>
                    {selectedMethod === 'email' && <CheckCircle2 className="w-5 h-5 text-blue-400" />}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    if (selectedMethod === 'authenticator') {
                      setSetupStep('scan');
                    } else {
                      const sent = await sendSetupOtp();
                      if (sent) {
                        setSetupStep('verify');
                      }
                    }
                  }}
                  className="w-full py-3.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 font-cairo"
                >
                  {language === 'ar' ? 'المتابعة للخطوة التالية' : 'Continue'}
                </button>
              </div>
            )}

            {/* Step 2: Scan QR & View Secret */}
            {setupStep === 'scan' && (
              <div className="space-y-5 text-center">
                <div>
                  <h3 className="text-lg font-bold text-white font-cairo">
                    {selectedMethod === 'authenticator'
                      ? (language === 'ar' ? 'امسح رمز الاستجابة السريعة (QR Code)' : 'Scan QR Code')
                      : selectedMethod === 'whatsapp'
                      ? (language === 'ar' ? 'تأكيد رقم الواتساب' : 'Confirm WhatsApp Number')
                      : (language === 'ar' ? 'تأكيد البريد الإلكتروني' : 'Confirm Email Address')}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    {selectedMethod === 'authenticator'
                      ? (language === 'ar' ? 'افتح تطبيق المصادقة على هاتفك وامسح الرمز أدناه أو اكتب المفتاح السري' : 'Scan this code with Google Authenticator or Authy')
                      : selectedMethod === 'whatsapp'
                      ? (language === 'ar' ? `سيتم إرسال رمز التحقق إلى ${currentUser.phone || 'رقم هاتفك'}` : `Code will be sent to ${currentUser.phone}`)
                      : (language === 'ar' ? `سيتم إرسال رمز التحقق الأمني إلى ${currentUser.email}` : `Security code will be sent to ${currentUser.email}`)}
                  </p>
                </div>

                {selectedMethod === 'authenticator' ? (
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className="p-3 bg-slate-900 rounded-2xl border border-white/20 shadow-xl"
                      dangerouslySetInnerHTML={{
                        __html: generateQRCodeSVG(
                          getOTPAuthUri(currentUser.email, 'QWADER STORE', tempSecret),
                          180
                        ),
                      }}
                    />

                    <div className="w-full p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-2 text-start">
                      <div className="overflow-hidden">
                        <span className="text-[10px] text-slate-400 block font-semibold">
                          {language === 'ar' ? 'المفتاح السري للإدخال اليدوي:' : 'Manual Entry Key:'}
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-300 tracking-wider">
                          {tempSecret}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(tempSecret);
                          setCopiedSecret(true);
                          setTimeout(() => setCopiedSecret(false), 2000);
                        }}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 flex-shrink-0"
                      >
                        {copiedSecret ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ) : selectedMethod === 'whatsapp' ? (
                  <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
                    <Smartphone className="w-10 h-10 text-emerald-400 mx-auto" />
                    <p className="text-sm font-bold text-slate-100 font-mono" dir="ltr">{currentUser.phone || '079XXXXXXX'}</p>
                    <p className="text-xs text-slate-400">
                      {language === 'ar' ? 'تم تجهيز خادم إرسال رسائل الواتساب الفوري' : 'WhatsApp gateway ready'}
                    </p>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-center space-y-2">
                    <Mail className="w-10 h-10 text-blue-400 mx-auto" />
                    <p className="text-sm font-bold text-slate-100 font-mono" dir="ltr">{currentUser.email}</p>
                    <p className="text-xs text-slate-400">
                      {language === 'ar' ? 'جاهز لإرسال رمز التحقق الأمني إلى صندوق الوارد الخاص بك' : 'Ready to send 6-digit security code to your inbox'}
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setSetupStep('choose')}
                    className="flex-1 py-3 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs"
                  >
                    {language === 'ar' ? 'رجوع' : 'Back'}
                  </button>
                  <button
                    onClick={() => setSetupStep('verify')}
                    className="flex-1 py-3 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg font-cairo"
                  >
                    {language === 'ar' ? 'التالي: إدخال الرمز' : 'Next: Verify'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Enter 6-Digit Code to verify */}
            {setupStep === 'verify' && (
              <form onSubmit={handleConfirm2FAEnable} className="space-y-5 text-center">
                <div>
                  <h3 className="text-lg font-bold text-white font-cairo">
                    {language === 'ar' ? 'تأكيد وتفعيل الرمز' : 'Verify Code'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    {language === 'ar'
                      ? 'أدخل الرمز المكون من 6 أرقام للتحقق من صحة الربط'
                      : 'Enter the 6-digit verification code to complete setup'}
                  </p>
                </div>

                <div>
                  <input
                    type="text"
                    autoFocus
                    required
                    maxLength={6}
                    value={verifyCodeInput}
                    onChange={(e) => setVerifyCodeInput(e.target.value)}
                    placeholder="123456"
                    className="w-full p-4 rounded-2xl text-center text-2xl tracking-widest font-mono font-bold bg-white/10 border border-purple-500/40 text-white focus:border-purple-400 focus:outline-none"
                  />
                </div>

                {setupError && (
                  <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                    {setupError}
                  </div>
                )}

                {selectedMethod !== 'authenticator' && (
                  <button
                    type="button"
                    onClick={sendSetupOtp}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                  >
                    {language === 'ar' ? 'إعادة إرسال الرمز 🔄' : 'Resend verification code 🔄'}
                  </button>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSetupStep('scan')}
                    className="flex-1 py-3 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs"
                  >
                    {language === 'ar' ? 'رجوع' : 'Back'}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg font-cairo"
                  >
                    {language === 'ar' ? 'تأكيد التفعيل 🛡️' : 'Confirm 🛡️'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 4: Backup Codes Generated */}
            {setupStep === 'backup' && (
              <div className="space-y-5 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-emerald-300 font-cairo">
                    {language === 'ar' ? 'تم تفعيل التحقق بخطوتين بنجاح!' : '2FA Enabled Successfully!'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    {language === 'ar'
                      ? 'احفظ رموز الطوارئ الاحتياطية هذه في مكان آمن. ستحتاجها إذا تعذر الوصول لهاتفك:'
                      : 'Save these backup recovery codes in a safe place:'}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                  {tempBackupCodes.map((code, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-center font-bold text-amber-300"
                    >
                      {code}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={handleCopyBackupCodes}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold"
                  >
                    {copiedBackupCodes ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedBackupCodes ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') : (language === 'ar' ? 'نسخ كافة الرموز' : 'Copy All')}</span>
                  </button>

                  <button
                    onClick={handleDownloadBackupCodes}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold"
                  >
                    <Download className="w-4 h-4" />
                    <span>{language === 'ar' ? 'تحميل كملف .txt' : 'Download .txt'}</span>
                  </button>
                </div>

                <button
                  onClick={() => setIs2FASetupModalOpen(false)}
                  className="w-full py-3.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg font-cairo"
                >
                  {language === 'ar' ? 'إنهاء وحفظ' : 'Finish & Close'}
                </button>
              </div>
            )}

          </div>
        </div>
      )}


    </div>
  );
};

