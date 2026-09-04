import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { SearchAutocomplete } from '../common/SearchAutocomplete';
import {
  Gamepad2,
  Zap,
  ShoppingCart,
  Heart,
  SlidersHorizontal,
  Bell,
  Sun,
  Moon,
  Globe,
  User as UserIcon,
  Menu,
  X,
  ShieldCheck,
  Crown,
  ChevronDown,
  LogOut,
  Package,
  PackageCheck,
  Headphones,
  CheckCircle2,
  Sparkles,
  Info,
  DollarSign,
  MessageCircle,
  Shield,
  Home,
  Store,
  CreditCard,
  HelpCircle,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    state,
    currentUser,
    cart,
    wishlist,
    compareList,
    language,
    theme,
    currency,
    isCartOpen,
    setIsCartOpen,
    currentRoute,
    navigateTo,
    setLanguage,
    setTheme,
    setCurrency,
    logout,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    t,
  } = useStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Handle ESC key to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsUserMenuOpen(false);
        setIsNotificationsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const navLinks = [
    { hash: '#home', label: t.home, icon: Home },
    { hash: '#store', label: t.store, icon: Store },
    { hash: '#compare', label: t.compare, badge: compareList.length, icon: SlidersHorizontal },
    { hash: '#favorites', label: t.favorites, badge: wishlist.length, icon: Heart },
    { hash: '#orders', label: t.myOrders, icon: Package },
    { hash: '#track-order', label: t.trackOrder, icon: PackageCheck },
    { hash: '#support', label: t.support, icon: Headphones },
    { hash: '#payment-methods', label: t.paymentMethods, icon: CreditCard },
    { hash: '#about', label: t.aboutUs, icon: Info },
  ];

  // If user is owner or staff, show admin link
  if (currentUser && (currentUser.role === 'owner' || currentUser.role === 'staff')) {
    navLinks.push({ hash: '#admin', label: t.adminDashboard, badge: 0, icon: ShieldCheck });
  }

  const userNotifications = state.notifications.filter(
    (n) => n.userId === 'all' || n.userId === currentUser?.id
  );

  const handleMobileNavClick = (hash: string) => {
    navigateTo(hash);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full transition-all duration-300">
      {/* Top Announcement Bar */}
      {state.settings.showPromoBanner !== false && (() => {
        const featuredPromo = state.settings.featuredPromoCode
          ? state.promoCodes.find((promo) => promo.code === state.settings.featuredPromoCode && promo.active)
          : state.promoCodes.find((promo) => promo.active);
        if (!featuredPromo) return null;
        return <div className="bg-gradient-to-r from-violet-900/90 via-purple-900/90 to-fuchsia-900/90 text-white text-[11px] font-semibold py-1 sm:py-1.5 px-3 sm:px-4 text-center border-b border-violet-500/20 backdrop-blur-md flex items-center justify-between">
        <div className="hidden sm:flex items-center gap-2 text-violet-200">
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>{language === 'ar' ? 'متجر أردني رسمي 🇯🇴 — تسليم فوري للأكواد خلال دقائق عبر كليك والواتساب' : 'Jordan’s Premier Digital Hub 🇯🇴 — Instant WhatsApp & CliQ Delivery'}</span>
        </div>

        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-violet-300 text-[10px] sm:text-xs">{language === 'ar' ? 'كود خصم:' : 'Promo:'}</span>
            <span className="bg-white/20 text-white px-1.5 sm:px-2 py-0.5 rounded font-black tracking-wider text-[10px] border border-white/30 cursor-pointer hover:bg-white/30" onClick={() => navigator.clipboard?.writeText(featuredPromo.code)}>
              {featuredPromo.code}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={`https://wa.me/${state.settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('مرحباً متجر قويدر ستور، أحتاج مساعدة بخصوص طلب أو لعبة')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold transition-all"
            >
              <MessageCircle className="w-3 h-3 text-emerald-400" />
              <span>{language === 'ar' ? 'خدمة العملاء' : 'Support'}</span>
            </a>
            {currentUser?.twoFactorEnabled && (
              <span className="hidden md:flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                <Shield className="w-3 h-3 text-amber-400" />
                <span>2FA مفعّل</span>
              </span>
            )}
          </div>
        </div>
      </div>;
      })()}

      {/* Main Navigation Glass Bar */}
      <div className={`${theme === 'dark' ? 'glass-nav bg-[#020617]/80' : 'glass-nav-light'} px-3 sm:px-4 lg:px-8 py-2.5 sm:py-3 transition-colors border-b border-white/10 backdrop-blur-md`} role="navigation" aria-label="Main Navigation">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo & Brand */}
          <div
            id="brand-logo-btn"
            onClick={() => navigateTo('#home')}
            role="button"
            tabIndex={0}
            aria-label={language === 'ar' ? 'الانتقال إلى الصفحة الرئيسية' : 'Go to Home page'}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateTo('#home'); } }}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-xl min-w-0"
          >
            {state.settings.branding?.logoUrl ? (
              <img
                src={state.settings.branding.logoUrl}
                alt={language === 'ar' ? 'شعار متجر قويدر' : 'Qwader Store Logo'}
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-xl shadow-[0_0_15px_rgba(124,58,237,0.4)] group-hover:scale-105 transition-transform bg-black/20 flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl shadow-[0_0_15px_rgba(124,58,237,0.5)] flex items-center justify-center font-black text-base sm:text-xl text-white group-hover:scale-105 transition-transform flex-shrink-0" aria-hidden="true">
                Q
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="text-sm sm:text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-l from-white to-purple-400 font-display truncate">
                  {language === 'ar'
                    ? (state.settings.branding?.customHeaderTitleAr || state.settings.storeNameAr)
                    : (state.settings.branding?.customHeaderTitleEn || state.settings.storeNameEn)}
                </span>
                <span className="text-[9px] sm:text-[10px] font-black text-pink-400 bg-pink-950/60 px-1 sm:px-1.5 py-0.5 rounded-full border border-pink-500/30 flex-shrink-0">
                  🇯🇴
                </span>
              </div>
              <p className="hidden sm:block text-[10px] text-purple-400 font-semibold truncate max-w-[140px] sm:max-w-none">
                {language === 'ar'
                  ? (state.settings.branding?.sloganAr || 'متجر الألعاب والبطاقات الرقمية')
                  : (state.settings.branding?.sloganEn || 'Digital Gaming Hub')}
              </p>
            </div>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <SearchAutocomplete />
          </div>

          {/* Right Action Icons & Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            
            {/* Currency Selector (JOD / USD) - Desktop / Tablet */}
            <div className="relative hidden md:block">
              <button
                id="currency-toggle-btn"
                onClick={() => setCurrency(currency === 'JOD' ? 'USD' : 'JOD')}
                aria-label={language === 'ar' ? `تغيير العملة الحالية (${currency})` : `Change current currency (${currency})`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-500/50 text-xs font-bold text-slate-200 transition-all backdrop-blur-sm"
                title={language === 'ar' ? 'تبديل العملة (د.أ / $)' : 'Switch Currency (JOD / USD)'}
              >
                <DollarSign className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />
                <span>{currency}</span>
              </button>
            </div>

            {/* Language Switcher (AR / EN) - Desktop / Tablet */}
            <button
              id="lang-toggle-btn"
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              aria-label={language === 'ar' ? 'Switch website language to English' : 'تغيير لغة الموقع إلى العربية'}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-500/50 text-xs font-bold text-slate-200 transition-all backdrop-blur-sm"
              title={language === 'ar' ? 'Switch to English' : 'التحويل للغة العربية'}
            >
              <Globe className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />
              <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            {/* Theme Switcher (Dark / Light) - Desktop / Tablet */}
            <button
              id="theme-toggle-btn"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'التحويل إلى الوضع الفاتح (Light Mode)' : 'التحويل إلى الوضع الليلي (Dark Mode)'}
              className="hidden sm:flex p-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-500/50 text-slate-200 hover:text-amber-400 transition-all backdrop-blur-sm"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" /> : <Moon className="w-4 h-4 text-purple-400" aria-hidden="true" />}
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                id="notifications-toggle-btn"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                aria-expanded={isNotificationsOpen}
                aria-haspopup="true"
                aria-label={language === 'ar' ? `الإشعارات والتنبيهات (${unreadNotificationsCount} غير مقروءة)` : `Notifications (${unreadNotificationsCount} unread)`}
                className="relative p-2 sm:p-2.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-500/50 text-slate-200 hover:text-purple-300 transition-all backdrop-blur-sm"
                title={language === 'ar' ? 'الإشعارات' : 'Notifications'}
              >
                <Bell className="w-4 h-4" aria-hidden="true" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-pink-600 text-white text-[10px] font-black flex items-center justify-center shadow-lg shadow-pink-600/50 animate-pulse" aria-hidden="true">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {isNotificationsOpen && (
                <div
                  id="notifications-dropdown"
                  role="region"
                  aria-label={language === 'ar' ? 'قائمة الإشعارات' : 'Notifications List'}
                  className="absolute z-50 mt-2 end-0 w-72 sm:w-80 rounded-2xl glass-panel p-3 shadow-2xl border border-purple-500/30 text-slate-100 animate-in fade-in"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                    <span className="text-xs font-bold text-purple-300">
                      {language === 'ar' ? 'الإشعارات والتنبيهات' : 'Notifications'}
                    </span>
                    {unreadNotificationsCount > 0 && (
                      <button
                        id="mark-all-read-btn"
                        onClick={markAllNotificationsAsRead}
                        aria-label={language === 'ar' ? 'تحديد كافة الإشعارات كمقروءة' : 'Mark all notifications as read'}
                        className="text-[11px] text-slate-400 hover:text-purple-400 underline"
                      >
                        {language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all read'}
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {userNotifications.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">
                        {language === 'ar' ? 'لا توجد إشعارات جديدة' : 'No notifications'}
                      </p>
                    ) : (
                      userNotifications.map((notif) => (
                        <div
                          key={notif.id}
                          id={`notif-item-${notif.id}`}
                          role="button"
                          tabIndex={0}
                          aria-label={`${notif.titleAr}: ${notif.messageAr}`}
                          onClick={() => {
                            markNotificationAsRead(notif.id);
                            if (notif.linkHash) {
                              navigateTo(notif.linkHash);
                              setIsNotificationsOpen(false);
                            }
                          }}
                          className={`p-2.5 rounded-xl cursor-pointer transition-all ${
                            notif.isRead ? 'bg-white/[0.02] text-slate-400' : 'bg-purple-950/40 border border-purple-500/30 text-slate-100'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-bold truncate">
                                {language === 'ar' ? notif.titleAr : notif.titleEn}
                              </h5>
                              <p className="text-[11px] opacity-90 line-clamp-2 mt-0.5">
                                {language === 'ar' ? notif.messageAr : notif.messageEn}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Wishlist Link Button */}
            <button
              id="nav-wishlist-btn"
              onClick={() => navigateTo('#favorites')}
              aria-label={language === 'ar' ? `قائمة المفضلة (${wishlist.length} منتجات)` : `Wishlist (${wishlist.length} items)`}
              className="relative hidden sm:flex p-2 sm:p-2.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-pink-500/50 text-slate-200 hover:text-pink-400 transition-all backdrop-blur-sm"
              title={t.favorites}
            >
              <Heart className="w-4 h-4" aria-hidden="true" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-pink-600 text-white text-[10px] font-black flex items-center justify-center shadow-lg shadow-pink-600/50" aria-hidden="true">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Compare Link Button */}
            <button
              id="nav-compare-btn"
              onClick={() => navigateTo('#compare')}
              aria-label={language === 'ar' ? `المقارنة (${compareList.length} منتجات)` : `Compare list (${compareList.length} items)`}
              className="relative hidden sm:flex p-2 sm:p-2.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-500/50 text-slate-200 hover:text-purple-300 transition-all backdrop-blur-sm"
              title={t.compare}
            >
              <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
              {compareList.length > 0 && (
                <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center shadow-lg shadow-purple-600/50" aria-hidden="true">
                  {compareList.length}
                </span>
              )}
            </button>

            {/* Cart Drawer Trigger Button */}
            <button
              id="nav-cart-btn"
              onClick={() => setIsCartOpen(true)}
              aria-label={language === 'ar' ? `سلة الشراء تحتوي على ${totalCartCount} عناصر` : `Shopping Cart with ${totalCartCount} items`}
              className="relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 hover:scale-105 active:scale-95 transition-all"
            >
              <ShoppingCart className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline font-cairo">{t.cart}</span>
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-pink-600 text-white font-black text-[10px] sm:text-[11px] flex items-center justify-center shadow-inner" aria-hidden="true">
                {totalCartCount}
              </span>
            </button>

            {/* User Profile / Login Dropdown - Desktop */}
            <div className="relative hidden md:block">
              {currentUser ? (
                <div>
                  <button
                    id="nav-user-menu-btn"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    aria-expanded={isUserMenuOpen}
                    aria-haspopup="true"
                    aria-label={language === 'ar' ? `حساب المستخدم: ${currentUser.name}` : `User menu for ${currentUser.name}`}
                    className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-500/50 text-slate-200 transition-all"
                  >
                    <img
                      src={currentUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'}
                      alt={language === 'ar' ? `صورة حساب ${currentUser.name}` : `${currentUser.name} avatar`}
                      className="w-6 h-6 rounded-full object-cover border border-purple-400/40 bg-slate-800"
                    />
                    <span className="hidden lg:inline text-xs font-bold max-w-[90px] truncate">
                      {currentUser.name}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" aria-hidden="true" />
                  </button>

                  {isUserMenuOpen && (
                    <div
                      id="user-dropdown-menu"
                      role="menu"
                      aria-label="User profile options"
                      className="absolute z-50 mt-2 end-0 w-56 rounded-2xl glass-panel p-2 shadow-2xl border border-purple-500/30 text-slate-100 animate-in fade-in"
                    >
                      <div className="p-2 border-b border-white/10 mb-1">
                        <p className="text-xs font-bold text-slate-100 truncate">{currentUser.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                        <div className="mt-1.5 inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-950/80 text-purple-300 border border-purple-500/30">
                          {currentUser.role === 'owner' ? '👑 Owner' : currentUser.role === 'staff' ? '🛡️ Staff' : '👤 Customer'}
                        </div>
                      </div>

                      <button
                        id="user-menu-account-btn"
                        role="menuitem"
                        onClick={() => {
                          navigateTo('#account');
                          setIsUserMenuOpen(false);
                        }}
                        aria-label={t.account}
                        className="w-full flex items-center gap-2 p-2 rounded-xl text-xs hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-purple-400" aria-hidden="true" />
                        <span>{t.account}</span>
                      </button>

                      <button
                        id="user-menu-orders-btn"
                        role="menuitem"
                        onClick={() => {
                          navigateTo('#orders');
                          setIsUserMenuOpen(false);
                        }}
                        aria-label={t.myOrders}
                        className="w-full flex items-center gap-2 p-2 rounded-xl text-xs hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                      >
                        <Package className="w-4 h-4 text-purple-400" aria-hidden="true" />
                        <span>{t.myOrders}</span>
                      </button>

                      <button
                        id="user-menu-track-order-btn"
                        role="menuitem"
                        onClick={() => {
                          navigateTo('#track-order');
                          setIsUserMenuOpen(false);
                        }}
                        aria-label={t.trackOrder}
                        className="w-full flex items-center gap-2 p-2 rounded-xl text-xs hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                      >
                        <PackageCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                        <span>{t.trackOrder}</span>
                      </button>

                      {(currentUser.role === 'owner' || currentUser.role === 'staff') && (
                        <button
                          id="user-menu-admin-btn"
                          role="menuitem"
                          onClick={() => {
                            navigateTo('#admin');
                            setIsUserMenuOpen(false);
                          }}
                          aria-label={t.adminDashboard}
                          className="w-full flex items-center gap-2 p-2 rounded-xl text-xs bg-purple-950/50 hover:bg-purple-900/60 text-purple-200 transition-colors font-bold"
                        >
                          <ShieldCheck className="w-4 h-4 text-purple-400" aria-hidden="true" />
                          <span>{t.adminDashboard}</span>
                        </button>
                      )}

                      <div className="pt-1 mt-1 border-t border-white/10">
                        <button
                          id="user-menu-logout-btn"
                          role="menuitem"
                          onClick={() => {
                            logout();
                            setIsUserMenuOpen(false);
                          }}
                          aria-label={t.logout}
                          className="w-full flex items-center gap-2 p-2 rounded-xl text-xs text-rose-400 hover:bg-rose-950/30 transition-colors font-semibold"
                        >
                          <LogOut className="w-4 h-4" aria-hidden="true" />
                          <span>{t.logout}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  id="nav-login-btn"
                  onClick={() => navigateTo('#account')}
                  aria-label={language === 'ar' ? 'تسجيل الدخول إلى حسابك' : 'Log in to your account'}
                  className="px-4 py-1.5 rounded-full border border-purple-500/40 bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 text-xs font-bold transition-all"
                >
                  {t.login}
                </button>
              )}
            </div>

            {/* Mobile Drawer Hamburger Toggle Button */}
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav-drawer"
              aria-label={language === 'ar' ? 'فتح القائمة الجانبية للتنقل' : 'Open mobile navigation drawer'}
              className="lg:hidden p-2 sm:p-2.5 rounded-full border border-white/10 bg-white/5 hover:bg-purple-600/20 text-slate-200 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-center"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="mt-3 md:hidden">
          <SearchAutocomplete />
        </div>

        {/* Desktop Secondary Categories & Links Bar */}
        <div className="hidden lg:flex items-center justify-between pt-3 mt-2 border-t border-white/10 text-xs font-semibold">
          <div className="flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = currentRoute === link.hash || (link.hash === '#home' && currentRoute === '');
              return (
                <button
                  key={link.hash}
                  id={`nav-link-${link.hash.replace('#', '')}`}
                  onClick={() => navigateTo(link.hash)}
                  className={`flex items-center gap-1.5 py-1 transition-all relative font-cairo ${
                    isActive
                      ? 'text-purple-300 font-extrabold'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <span>{link.label}</span>
                  {Boolean(link.badge) && (
                    <span className="w-4 h-4 rounded-full bg-pink-600 text-white text-[10px] font-black flex items-center justify-center">
                      {link.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute -bottom-3 inset-x-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-slate-400 text-xs">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {language === 'ar' ? 'دفع آمن عبر كليك بالأردن' : 'Instant Jordan CliQ'}
            </span>
            <span className="opacity-40">|</span>
            <span className="text-purple-300 font-medium">
              {language === 'ar' ? 'أكواد أصلية 100%' : '100% Verified Digital'}
            </span>
          </div>
        </div>
      </div>

      {/* Full-Screen Professional Mobile Drawer Menu with Backdrop */}
      {isMobileMenuOpen && (
        <div
          id="mobile-nav-modal"
          role="dialog"
          aria-modal="true"
          aria-label={language === 'ar' ? 'قائمة التنقل الجانبية' : 'Mobile Navigation Menu'}
          className="fixed inset-0 z-50 overflow-hidden lg:hidden"
        >
          {/* Backdrop Blur Overlay */}
          <div
            id="mobile-nav-backdrop"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
            className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
          />

          {/* Slide-in Drawer Container */}
          <div className="fixed inset-y-0 start-0 max-w-full flex">
            <div
              id="mobile-nav-drawer"
              className="mobile-nav-drawer w-screen max-w-xs sm:max-w-sm bg-gradient-to-b from-[#0f172a] via-[#090d16] to-[#020617] text-slate-100 shadow-2xl border-e border-purple-500/20 flex flex-col h-full overflow-hidden animate-in slide-in-from-start duration-300"
            >
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  {state.settings.branding?.logoUrl ? (
                    <img
                      src={state.settings.branding.logoUrl}
                      alt={language === 'ar' ? 'شعار قويدر ستور' : 'Qwader Logo'}
                      className="w-9 h-9 object-contain rounded-xl bg-black/40 border border-purple-500/30"
                    />
                  ) : (
                    <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg">
                      Q
                    </div>
                  )}
                  <div>
                    <h3 className="font-black text-sm text-slate-100 font-display tracking-tight flex items-center gap-1.5">
                      <span>{language === 'ar' ? state.settings.storeNameAr : state.settings.storeNameEn}</span>
                      <span className="text-[9px] font-black text-pink-400 bg-pink-950/60 px-1.5 py-0.5 rounded-full border border-pink-500/30">
                        🇯🇴
                      </span>
                    </h3>
                    <p className="text-[10px] text-purple-400 font-medium truncate max-w-[150px]">
                      {language === 'ar' ? 'الألعاب والبطاقات الرقمية' : 'Digital Gaming Hub'}
                    </p>
                  </div>
                </div>

                <button
                  id="close-mobile-menu-btn"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label={language === 'ar' ? 'إغلاق القائمة' : 'Close menu'}
                  className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                
                {/* User Profile Card / Login Prompt */}
                {currentUser ? (
                  <div className="p-3.5 rounded-2xl glass-card border border-purple-500/30 bg-purple-950/20 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={currentUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'}
                        alt={currentUser.name}
                        className="w-10 h-10 rounded-full object-cover border border-purple-400/50 bg-slate-800 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-100 truncate">{currentUser.name}</h4>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-purple-900/60 text-purple-300 border border-purple-500/30">
                            {currentUser.role === 'owner' ? '👑 Owner' : currentUser.role === 'staff' ? '🛡️ Staff' : '👤 Customer'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{currentUser.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                      }}
                      title={t.logout}
                      aria-label={t.logout}
                      className="p-2 rounded-xl text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/50 to-indigo-950/50 border border-purple-500/30 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-100 font-cairo">
                        {language === 'ar' ? 'مرحباً بك في قويدر ستور' : 'Welcome to QWADER'}
                      </h4>
                      <p className="text-[10px] text-purple-300 mt-0.5">
                        {language === 'ar' ? 'سجل دخولك لتتبع طلباتك والأكواد' : 'Log in to track orders & keys'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleMobileNavClick('#account')}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 whitespace-nowrap transition-all"
                    >
                      {t.login}
                    </button>
                  </div>
                )}

                {/* Main Navigation Links */}
                <div className="space-y-1.5" role="list">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ps-1 mb-1">
                    {language === 'ar' ? 'أقسام المتجر الرئيسية:' : 'Main Navigation:'}
                  </span>
                  {navLinks.map((link) => {
                    const isActive = currentRoute === link.hash || (link.hash === '#home' && currentRoute === '');
                    const IconComponent = link.icon;
                    return (
                      <button
                        key={link.hash}
                        id={`mobile-nav-item-${link.hash.replace('#', '')}`}
                        role="listitem"
                        onClick={() => handleMobileNavClick(link.hash)}
                        aria-label={link.label}
                        className={`w-full min-h-[48px] flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40'
                            : 'bg-white/[0.03] hover:bg-white/[0.08] text-slate-200 border border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl ${
                              isActive ? 'bg-white/20 text-white' : 'bg-purple-950/40 text-purple-400 border border-purple-500/20'
                            }`}
                          >
                            <IconComponent className="w-4 h-4" aria-hidden="true" />
                          </div>
                          <span className="font-cairo text-xs font-bold">{link.label}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {Boolean(link.badge) && (
                            <span className="px-2 py-0.5 rounded-full bg-pink-600 text-white text-[10px] font-black">
                              {link.badge}
                            </span>
                          )}
                          {language === 'ar' ? (
                            <ArrowLeft className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                          ) : (
                            <ArrowRight className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Controls: Currency, Language, Theme */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ps-1">
                    {language === 'ar' ? 'إعدادات العرض والتفضيلات:' : 'Preferences:'}
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Currency */}
                    <button
                      onClick={() => setCurrency(currency === 'JOD' ? 'USD' : 'JOD')}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center justify-center gap-1 text-slate-200 transition-colors"
                      title={language === 'ar' ? 'تبديل العملة' : 'Switch Currency'}
                    >
                      <DollarSign className="w-4 h-4 text-purple-400" />
                      <span className="text-[11px] font-bold">{currency}</span>
                    </button>

                    {/* Language */}
                    <button
                      onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center justify-center gap-1 text-slate-200 transition-colors"
                      title={language === 'ar' ? 'تبديل اللغة' : 'Switch Language'}
                    >
                      <Globe className="w-4 h-4 text-purple-400" />
                      <span className="text-[11px] font-bold">{language === 'ar' ? 'English' : 'عربي'}</span>
                    </button>

                    {/* Theme */}
                    <button
                      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center justify-center gap-1 text-slate-200 transition-colors"
                      title={language === 'ar' ? 'تبديل المظهر' : 'Switch Theme'}
                    >
                      {theme === 'dark' ? (
                        <>
                          <Sun className="w-4 h-4 text-amber-400" />
                          <span className="text-[11px] font-bold">{language === 'ar' ? 'نهاري' : 'Light'}</span>
                        </>
                      ) : (
                        <>
                          <Moon className="w-4 h-4 text-purple-400" />
                          <span className="text-[11px] font-bold">{language === 'ar' ? 'ليلي' : 'Dark'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Direct Contact & CliQ Delivery Badge */}
                <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{language === 'ar' ? 'تسليم فوري ومباشر في الأردن 🇯🇴' : 'Direct & Instant Jordan Delivery 🇯🇴'}</span>
                  </div>
                  <a
                    href={`https://wa.me/${state.settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('مرحباً متجر قويدر ستور، أحتاج مساعدة بخصوص منتج')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-200 font-bold transition-all text-xs"
                  >
                    <span className="flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{state.settings.whatsappNumber}</span>
                    </span>
                    <span className="text-[10px] underline">{language === 'ar' ? 'تواصل معنا' : 'Chat'}</span>
                  </a>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

