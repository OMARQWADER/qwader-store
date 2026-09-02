import React, { useState, useEffect } from 'react';
import { User as UserIcon, ShieldCheck, Package, LogOut, Mail, Phone, X, Settings, Bell, Key, Trash2, Edit2, Save, Camera } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { authClient } from '../lib/authClient';

export const AccountView = () => {
  const {
    currentUser,
    language,
    createCustomerAccount,
    signInCustomer,
    logout,
    navigateTo,
    state,
    updateUserProfile,
    addToast,
  } = useStore() as any;

  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'settings'>('profile');

  // Passwordless email OTP state
  const [authStep, setAuthStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pending social/OTP user needing profile completion (phone/name)
  const [pendingAuthUser, setPendingAuthUser] = useState<{ authUid: string; email: string; name?: string; avatar?: string } | null>(null);
  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  const [profileCountryCode, setProfileCountryCode] = useState('+962');
  const [profilePhone, setProfilePhone] = useState('');

  // Profile edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCountryCode, setEditCountryCode] = useState('+962');

  // Settings state
  const [notificationsEmail, setNotificationsEmail] = useState(true);
  const [notificationsWhatsapp, setNotificationsWhatsapp] = useState(true);
  const [promotionalEmails, setPromotionalEmails] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const userOrders = (state?.orders || []).filter((o: any) => o.userId === currentUser?.id);

  // On mount: check for an existing Neon Auth session
  useEffect(() => {
    if (currentUser) return;
    (async () => {
      const { data } = await authClient.getSession();
      if (data?.user) {
        syncAuthenticatedUser({
          authUid: data.user.id,
          email: data.user.email,
          name: data.user.name,
          avatar: data.user.image,
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load user data when editing
  useEffect(() => {
    if (currentUser && isEditing) {
      setEditName(currentUser.name || '');
      setEditPhone(currentUser.phone?.replace(/^\+962/, '') || '');
      setEditCountryCode(currentUser.phone?.startsWith('+962') ? '+962' : '+962');
      // Load settings from user data
      if (currentUser.promotionalEmails !== undefined) {
        setPromotionalEmails(currentUser.promotionalEmails);
      }
    }
  }, [currentUser, isEditing]);

  const syncAuthenticatedUser = (authUser: { authUid: string; email: string; name?: string; avatar?: string }) => {
    const cleanEmail = authUser.email.trim().toLowerCase();
    const existingUser = (state?.users || []).find((u: any) => u.email.toLowerCase() === cleanEmail);
    if (existingUser) {
      signInCustomer(existingUser);
    } else {
      const [first, ...rest] = (authUser.name || '').split(' ');
      setProfileFirstName(first || '');
      setProfileLastName(rest.join(' ') || '');
      setPendingAuthUser(authUser);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);
    const cleanEmail = email.trim().toLowerCase();
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: cleanEmail, type: 'sign-in' });
    setIsSubmitting(false);
    if (error) {
      setAuthError(language === 'ar' ? 'تعذر إرسال رمز التحقق' : 'Could not send the verification code');
      return;
    }
    setAuthStep('code');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await authClient.signIn.emailOtp({ email: cleanEmail, otp: authCode.trim() });
    setIsSubmitting(false);
    if (error || !data?.user) {
      setAuthError(language === 'ar' ? 'رمز التحقق غير صحيح أو منتهي الصلاحية' : 'Invalid or expired code');
      return;
    }
    syncAuthenticatedUser({
      authUid: data.user.id,
      email: data.user.email,
      name: data.user.name,
      avatar: data.user.image,
    });
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    if (authStep === 'email') return handleSendOtp(e);
    return handleVerifyOtp(e);
  };

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: window.location.origin + '/#account',
    });
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingAuthUser) return;
    createCustomerAccount({
      firstName: profileFirstName.trim(),
      lastName: profileLastName.trim(),
      phone: `${profileCountryCode}${profilePhone.trim()}`,
      email: pendingAuthUser.email,
      promotionalEmails: promotionalEmails,
      authUid: pendingAuthUser.authUid,
      avatar: pendingAuthUser.avatar,
    });
    setPendingAuthUser(null);
  };

  const handleLogout = async () => {
    await authClient.signOut();
    logout();
  };

  // Save profile changes
  const handleSaveProfile = () => {
    if (!currentUser) return;
    const fullPhone = `${editCountryCode}${editPhone.trim()}`;
    updateUserProfile({
      name: editName.trim(),
      phone: fullPhone,
      promotionalEmails: promotionalEmails,
    });
    setIsEditing(false);
    addToast(
      language === 'ar' ? 'تم تحديث الملف الشخصي ✅' : 'Profile updated ✅',
      language === 'ar' ? 'تم حفظ التغييرات بنجاح' : 'Changes saved successfully',
      'success'
    );
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== currentUser?.email) {
      addToast(
        language === 'ar' ? '❌ البريد الإلكتروني غير صحيح' : '❌ Email does not match',
        language === 'ar' ? 'يرجى كتابة البريد الإلكتروني بشكل صحيح' : 'Please type the email correctly',
        'error'
      );
      return;
    }
    
    // Delete from Neon Auth
    await authClient.deleteUser();
    
    // Delete from local state
    logout();
    setShowDeleteConfirm(false);
    addToast(
      language === 'ar' ? '🗑️ تم حذف الحساب' : '🗑️ Account deleted',
      language === 'ar' ? 'نأسف لفراقك، نتمنى رؤيتك مجدداً' : 'Sorry to see you go, hope to see you again',
      'info'
    );
    navigateTo('#home');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-cairo" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {currentUser ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="p-6 sm:p-8 rounded-3xl glass-card border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-center sm:text-right">
              <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-400 flex items-center justify-center shrink-0 text-xl font-bold overflow-hidden relative group">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-8 h-8" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">{currentUser.name}</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{currentUser.email}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-600/30 text-purple-300 mt-1 inline-block">
                  {language === 'ar' ? 'عميل' : 'Customer'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>{language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'profile' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <UserIcon className="w-4 h-4" />
              <span>{language === 'ar' ? 'البيانات الشخصية' : 'Personal Profile'}</span>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'orders' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <Package className="w-4 h-4" />
              <span>{language === 'ar' ? 'سجل الطلبات' : 'Order History'}</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'settings' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <Settings className="w-4 h-4" />
              <span>{language === 'ar' ? 'الإعدادات' : 'Settings'}</span>
            </button>
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-white/10 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200">
                  {language === 'ar' ? 'معلومات الحساب' : 'Account Information'}
                </h3>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all"
                    >
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'حفظ' : 'Save'}</span>
                    </button>
                  </div>
                )}
              </div>

              {!isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                    <span className="text-[11px] text-slate-400 block">{language === 'ar' ? 'الاسم' : 'Name'}</span>
                    <p className="text-sm font-semibold text-slate-200">{currentUser.name}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                    <span className="text-[11px] text-slate-400 block">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</span>
                    <p className="text-sm font-semibold text-slate-200 font-mono">{currentUser.email}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                    <span className="text-[11px] text-slate-400 block">{language === 'ar' ? 'الهاتف' : 'Phone'}</span>
                    <p className="text-sm font-semibold text-slate-200 font-mono" dir="ltr">{currentUser.phone || '—'}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                    <span className="text-[11px] text-slate-400 block">{language === 'ar' ? 'عضو منذ' : 'Member Since'}</span>
                    <p className="text-sm font-semibold text-slate-200">
                      {new Date(currentUser.registeredAt).toLocaleDateString(language === 'ar' ? 'ar-JO' : 'en-US')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1.5">
                      {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full p-3 rounded-2xl text-sm bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1.5">
                      {language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={editCountryCode}
                        onChange={(e) => setEditCountryCode(e.target.value)}
                        className="p-3 rounded-2xl text-sm bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                      >
                        <option value="+962" className="bg-slate-900">+962 (🇯🇴)</option>
                        <option value="+966" className="bg-slate-900">+966 (🇸🇦)</option>
                        <option value="+971" className="bg-slate-900">+971 (🇦🇪)</option>
                        <option value="+20" className="bg-slate-900">+20 (🇪🇬)</option>
                        <option value="+212" className="bg-slate-900">+212 (🇲🇦)</option>
                      </select>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="791234567"
                        className="flex-1 p-3 rounded-2xl text-sm bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-slate-200">
                {language === 'ar' ? 'طلباتي' : 'My Orders'}
                <span className="text-xs text-slate-400 font-normal mr-2">({userOrders.length})</span>
              </h3>
              {userOrders.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white/5 border border-white/5 space-y-3">
                  <Package className="w-12 h-12 text-slate-500 mx-auto" />
                  <p className="text-sm text-slate-400 font-medium">
                    {language === 'ar' ? 'لا توجد طلبات سابقة' : 'No previous orders'}
                  </p>
                  <button
                    onClick={() => navigateTo('#products')}
                    className="px-5 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                  >
                    {language === 'ar' ? 'تصفح المتجر' : 'Browse Store'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {userOrders.slice(0, 10).map((order: any) => (
                    <div key={order.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold text-purple-300">#{order.orderNumber || order.id}</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString(language === 'ar' ? 'ar-JO' : 'en-US')}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-300">
                          {order.totalJOD.toFixed(2)} {language === 'ar' ? 'د.أ' : 'JOD'}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {order.items.length} {language === 'ar' ? 'منتج' : 'items'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {userOrders.length > 10 && (
                    <p className="text-[10px] text-slate-400 text-center">
                      +{userOrders.length - 10} {language === 'ar' ? 'طلب إضافي' : 'more orders'}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-white/10 space-y-6">
              <h3 className="text-sm font-bold text-slate-200">
                {language === 'ar' ? 'الإعدادات والتفضيلات' : 'Settings & Preferences'}
              </h3>

              {/* Notification Settings */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  {language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}
                </h4>
                <label className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-xs text-slate-300">{language === 'ar' ? 'إشعارات البريد الإلكتروني' : 'Email Notifications'}</span>
                  <input
                    type="checkbox"
                    checked={notificationsEmail}
                    onChange={(e) => setNotificationsEmail(e.target.checked)}
                    className="w-4 h-4 accent-purple-600"
                  />
                </label>
                <label className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-xs text-slate-300">{language === 'ar' ? 'إشعارات الواتساب' : 'WhatsApp Notifications'}</span>
                  <input
                    type="checkbox"
                    checked={notificationsWhatsapp}
                    onChange={(e) => setNotificationsWhatsapp(e.target.checked)}
                    className="w-4 h-4 accent-purple-600"
                  />
                </label>
                <label className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-xs text-slate-300">{language === 'ar' ? 'رسائل ترويجية' : 'Promotional Emails'}</span>
                  <input
                    type="checkbox"
                    checked={promotionalEmails}
                    onChange={(e) => setPromotionalEmails(e.target.checked)}
                    className="w-4 h-4 accent-purple-600"
                  />
                </label>
              </div>

              {/* Danger Zone */}
              <div className="border-t border-rose-500/20 pt-4">
                <h4 className="text-xs font-bold text-rose-400 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  {language === 'ar' ? 'منطقة الخطر' : 'Danger Zone'}
                </h4>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="mt-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all"
                >
                  {language === 'ar' ? '🗑️ حذف الحساب' : '🗑️ Delete Account'}
                </button>
                <p className="text-[10px] text-slate-500 mt-1">
                  {language === 'ar' ? 'سيتم حذف جميع بياناتك بشكل نهائي' : 'All your data will be permanently deleted'}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Login Form (unchanged)
        <div className="max-w-md mx-auto p-8 rounded-3xl glass-card border border-white/10 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-400 flex items-center justify-center mx-auto mb-4">
              <UserIcon className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-100 font-cairo">
              {language === 'ar' ? 'تسجيل الدخول / حساب جديد' : 'Sign In / Register'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {language === 'ar' ? 'أدخل بريدك الإلكتروني لتلقي رمز الدخول الآمن' : 'Enter your email to receive a passwordless code'}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authStep === 'email' ? (
              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1.5">
                  {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full py-3 pr-10 pl-4 rounded-2xl text-xs bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                    dir="ltr"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1.5 text-center">
                  {language === 'ar' ? 'رمز الدخول (OTP)' : 'Access Code (OTP)'}
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="123456"
                  className="w-full p-3.5 rounded-2xl text-center text-xl tracking-widest font-mono font-bold bg-white/10 border border-purple-500/40 text-white focus:border-purple-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setAuthStep('email')}
                  className="text-[11px] text-purple-400 hover:underline mt-2 block mx-auto"
                >
                  {language === 'ar' ? 'تغيير البريد الإلكتروني' : 'Change email'}
                </button>
              </div>
            )}

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold text-center">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-purple-900/30 transition-all font-cairo disabled:opacity-50"
            >
              {authStep === 'email'
                ? language === 'ar' ? 'إرسال رمز الدخول 📧' : 'Send Code 📧'
                : language === 'ar' ? 'التحقق والدخول 🚀' : 'Verify & Sign In 🚀'}
            </button>
          </form>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <span className="relative px-3 bg-[#0d0914] text-[11px] text-slate-400">
              {language === 'ar' ? 'أو عبر التواصل الاجتماعي' : 'Or via Social'}
            </span>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <span>{language === 'ar' ? 'الدخول عبر Google' : 'Continue with Google'}</span>
          </button>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl glass-card border border-rose-500/30 space-y-6 relative">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute left-4 top-4 p-2 rounded-full bg-white/5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-rose-400 font-cairo">
                {language === 'ar' ? '⚠️ تحذير: حذف الحساب' : '⚠️ Delete Account'}
              </h3>
              <p className="text-xs text-slate-400 mt-2">
                {language === 'ar' 
                  ? 'سيتم حذف جميع بياناتك بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه.' 
                  : 'All your data will be permanently deleted. This action cannot be undone.'}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                {language === 'ar' 
                  ? `اكتب بريدك الإلكتروني لتأكيد الحذف: ${currentUser?.email}` 
                  : `Type your email to confirm: ${currentUser?.email}`}
              </p>
            </div>
            <input
              type="email"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={currentUser?.email}
              className="w-full p-3 rounded-2xl text-xs bg-white/5 border border-white/10 text-white focus:border-rose-500 focus:outline-none text-center"
              dir="ltr"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-all"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 py-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all"
              >
                {language === 'ar' ? '🗑️ تأكيد الحذف' : '🗑️ Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Completion Modal */}
      {pendingAuthUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl glass-card border border-white/10 space-y-6 relative">
            <button
              onClick={() => setPendingAuthUser(null)}
              className="absolute left-4 top-4 p-2 rounded-full bg-white/5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-100 font-cairo">
                {language === 'ar' ? 'استكمال بيانات الحساب' : 'Complete Your Profile'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'ar' ? 'أدخل اسمك ورقم هاتفك لإكمال إنشاء الحساب' : 'Enter your name and phone to finish'}
              </p>
            </div>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">{language === 'ar' ? 'الاسم الأول' : 'First Name'}</label>
                  <input
                    type="text"
                    required
                    value={profileFirstName}
                    onChange={(e) => setProfileFirstName(e.target.value)}
                    className="w-full p-3 rounded-2xl text-xs bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">{language === 'ar' ? 'اسم العائلة' : 'Last Name'}</label>
                  <input
                    type="text"
                    required
                    value={profileLastName}
                    onChange={(e) => setProfileLastName(e.target.value)}
                    className="w-full p-3 rounded-2xl text-xs bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">{language === 'ar' ? 'رقم الهاتف' : 'Phone'}</label>
                <div className="flex gap-2">
                  <select
                    value={profileCountryCode}
                    onChange={(e) => setProfileCountryCode(e.target.value)}
                    className="p-3 rounded-2xl text-xs bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="+962" className="bg-slate-900">+962 (🇯🇴)</option>
                    <option value="+966" className="bg-slate-900">+966 (🇸🇦)</option>
                    <option value="+971" className="bg-slate-900">+971 (🇦🇪)</option>
                    <option value="+20" className="bg-slate-900">+20 (🇪🇬)</option>
                    <option value="+212" className="bg-slate-900">+212 (🇲🇦)</option>
                  </select>
                  <input
                    type="tel"
                    required
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="791234567"
                    className="flex-1 p-3 rounded-2xl text-xs bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                    dir="ltr"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 transition-all font-cairo"
              >
                {language === 'ar' ? 'حفظ وإنشاء الحساب 🚀' : 'Create Account 🚀'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};