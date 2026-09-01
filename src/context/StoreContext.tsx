import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  StoreState,
  User,
  CartItem,
  Product,
  Order,
  Review,
  SupportTicket,
  SupportMessage,
  NotificationItem,
  StoreSettings,
  UserRole,
  Language,
  ThemeMode,
  Currency,
  OrderStatus,
  PaymentMethodType,
  SensitiveActionType,
  SensitiveVerificationChallenge,
  SimulatedEmailMessage
} from '../types';
import { INITIAL_STATE } from '../data/initialData';
import { getT } from '../utils/translations';
import { verifyTOTPCode, generateBackupCodes, generateNumericOTP, playNotificationSound } from '../utils/twoFactor';
const STORAGE_KEY_DB = 'qwader_store_db_v1';
const STORAGE_KEY_SESSION = 'qwader_store_auth_session';
const STORAGE_KEY_CART = 'qwader_store_cart_v1';
const STORAGE_KEY_WISHLIST = 'qwader_store_wishlist_v1';
const STORAGE_KEY_COMPARE = 'qwader_store_compare_v1';
const STORAGE_KEY_LANG = 'qwader_lang';
const STORAGE_KEY_THEME = 'qwader_theme_mode';
const STORAGE_KEY_CURRENCY = 'qwader_currency';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface StoreContextType {
  state: StoreState;
  currentUser: User | null;
  pendingTwoFactorUser: User | null;
  activeSensitiveChallenge: SensitiveVerificationChallenge | null;
  simulatedEmailMessage: SimulatedEmailMessage | null;
  isAdminSessionVerified: boolean;
  cart: CartItem[];
  wishlist: string[];
  compareList: string[];
  language: Language;
  theme: ThemeMode;
  currency: Currency;
  isCartOpen: boolean;
  currentRoute: string;
  toasts: ToastMessage[];
  appliedPromo: { code: string; discountPercent?: number; discountFixedJOD?: number } | null;
  t: ReturnType<typeof getT>;
  bestSellerProductIds: string[];
  unreadNotificationsCount: number;
  isOrdersLoading: boolean;
  
  // Navigation
  navigateTo: (route: string) => void;
  
  // Auth & 2FA
  login: (email: string) => Promise<{ success: boolean; requires2FA?: boolean; method?: 'authenticator' | 'whatsapp' | 'sms' | 'email'; error?: string }>;
  completePasswordlessLogin: (email: string, code: string) => { success: boolean; requiresProfile?: boolean; error?: string };
  createCustomerAccount: (data: { firstName: string; lastName: string; phone: string; email: string; promotionalEmails: boolean; authUid?: string; avatar?: string }) => { success: boolean; error?: string };
  signInCustomer: (user: User) => void;
  requestAdminLoginLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  completeAdminLoginFromLink: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUserRole: (userId: string, newRole: UserRole) => void;
  updateUserProfile: (data: Partial<User>) => void;
  completeTwoFactorLogin: (code: string) => { success: boolean; error?: string };
  cancelTwoFactorLogin: () => void;
  resendTwoFactorLoginOTP: () => { success: boolean; error?: string };
  enableTwoFactor: (method: 'authenticator' | 'whatsapp' | 'sms' | 'email', secret: string, code: string, expectedCode: string, backupCodes: string[], phone?: string) => { success: boolean; error?: string };
  disableTwoFactor: () => { success: boolean; error?: string };
  regenerateBackupCodes: () => { success: boolean; backupCodes?: string[]; error?: string };

  // Step-Up Two-Step Sensitive Verification
  requestSensitiveActionVerification: (options: {
    actionType: SensitiveActionType;
    titleAr: string;
    titleEn: string;
    descriptionAr: string;
    descriptionEn: string;
    targetEmail?: string;
    targetPhone?: string;
    deliveryChannel?: 'email' | 'sms' | 'whatsapp';
    metadata?: Record<string, any>;
    onSuccess: () => void;
  }) => void;
  verifySensitiveActionCode: (code: string) => { success: boolean; error?: string };
  cancelSensitiveActionVerification: () => void;
  resendSensitiveActionCode: (channel?: 'email' | 'sms' | 'whatsapp') => void;
  clearSimulatedEmailMessage: () => void;
  lockAdminSession: () => void;
  
  // Promo codes
  addPromoCode: (promo: { code: string; discountPercent?: number; discountFixedJOD?: number }) => void;
  togglePromoCode: (code: string) => void;
  deletePromoCode: (code: string) => void;
  
  // Cart
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setIsCartOpen: (open: boolean) => void;
  applyPromoCode: (code: string) => { success: boolean; message: string };
  removePromoCode: () => void;
  
  // Wishlist & Compare
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  toggleCompare: (productId: string) => boolean;
  isInCompare: (productId: string) => boolean;
  removeFromCompare: (productId: string) => void;
  clearCompare: () => void;
  
  // Orders
  createOrder: (data: {
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    preferredDeliveryMethod: 'whatsapp' | 'email' | 'both';
    fulfillmentType?: 'pickup' | 'delivery';
    shippingGovernorate?: string;
    shippingAddress?: string;
    shippingNotes?: string;
    shippingCostJOD?: number;
    shippingCostUSD?: number;
    deliveryCompanyId?: string;
    deliveryCompanyName?: string;
    paymentMethod: PaymentMethodType;
    paymentProofImage?: string;
    paymentProofFileName?: string;
    paymentProofFileSize?: number;
    paymentReference?: string;
    notes?: string;
  }) => Order;
  updateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    noteAr: string,
    noteEn: string,
    digitalDeliveries?: Order['digitalDeliveries']
  ) => void;
  addPaymentProofToOrder: (orderId: string, referenceNumber: string) => void;
  
  // Products
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'rating' | 'reviewsCount'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  updateProductStock: (productId: string, newStock: number) => void;
  
  // Reviews
  addReview: (productId: string, rating: number, comment: string) => { success: boolean; message?: string };
  deleteReview: (reviewId: string) => void;
  
  // Support
  createSupportTicket: (subject: string, message: string, orderNumber?: string) => string;
  sendSupportMessage: (ticketId: string, message: string) => void;
  updateTicketStatus: (ticketId: string, status: 'open' | 'closed' | 'resolved') => void;
  
  // Settings & System
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  exportBackupJson: () => void;
  importBackupJson: (jsonData: string) => { success: boolean; error?: string };
  exportDataJson: () => void;
  importDataJson: (jsonData: string) => { success: boolean; error?: string };
  resetToFactoryDefaults: () => void;
  resetToFactoryData: () => void;
  
  // Notifications
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  
  // Toasts
  addToast: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
  
  // Customization
  setLanguage: (lang: Language) => void;
  setTheme: (theme: ThemeMode) => void;
  setCurrency: (curr: Currency) => void;
  
  // Helpers
  formatPrice: (priceJOD: number, priceUSD?: number) => string;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load State from localStorage
  const [state, setState] = useState<StoreState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DB);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_STATE,
          ...parsed,
          orders: Array.isArray(parsed.orders) ? parsed.orders : INITIAL_STATE.orders,
          products: Array.isArray(parsed.products) ? parsed.products : INITIAL_STATE.products,
          users: Array.isArray(parsed.users) ? parsed.users : INITIAL_STATE.users,
          reviews: Array.isArray(parsed.reviews) ? parsed.reviews : INITIAL_STATE.reviews,
          supportTickets: Array.isArray(parsed.supportTickets) ? parsed.supportTickets : INITIAL_STATE.supportTickets,
          notifications: Array.isArray(parsed.notifications) ? parsed.notifications : INITIAL_STATE.notifications,
          activityLogs: Array.isArray(parsed.activityLogs) ? parsed.activityLogs : INITIAL_STATE.activityLogs,
          promoCodes: Array.isArray(parsed.promoCodes) ? parsed.promoCodes : INITIAL_STATE.promoCodes,
          settings: {
            ...INITIAL_STATE.settings,
            ...(parsed.settings || {}),
            socialLinks: {
              ...INITIAL_STATE.settings.socialLinks,
              ...((parsed.settings && parsed.settings.socialLinks) || {}),
            },
            branding: {
              ...INITIAL_STATE.settings.branding,
              ...((parsed.settings && parsed.settings.branding) || {}),
            },
            fulfillment: {
              ...INITIAL_STATE.settings.fulfillment,
              ...((parsed.settings && parsed.settings.fulfillment) || {}),
              governorates: (parsed.settings?.fulfillment?.governorates && Array.isArray(parsed.settings.fulfillment.governorates) && parsed.settings.fulfillment.governorates.length > 0)
                ? parsed.settings.fulfillment.governorates
                : INITIAL_STATE.settings.fulfillment.governorates,
              deliveryCompanies: (parsed.settings?.fulfillment?.deliveryCompanies && Array.isArray(parsed.settings.fulfillment.deliveryCompanies) && parsed.settings.fulfillment.deliveryCompanies.length > 0)
                ? parsed.settings.fulfillment.deliveryCompanies
                : INITIAL_STATE.settings.fulfillment.deliveryCompanies,
            },
          },
        };
      }
    } catch (e) {
      console.error('Failed to load store database:', e);
    }
      return INITIAL_STATE;
  });

  // Current Session User
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SESSION);
      if (saved) {
        const savedSession = JSON.parse(saved) as Partial<User>;
        const canonicalUser = state.users.find(
          (user) => user.id === savedSession.id && user.email.toLowerCase() === savedSession.email?.toLowerCase()
        );
        if (canonicalUser) {
          return canonicalUser;
        }
        localStorage.removeItem(STORAGE_KEY_SESSION);
      }
    } catch (e) {
      console.error('Failed to load session:', e);
    }
    // Default to null (visitor/guest) on fresh start
    return null;
  });

  // Cart
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CART);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load cart:', e);
    }
    return [];
  });

  // Wishlist
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WISHLIST);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load wishlist:', e);
    }
    return ['prod-ea-fc25'];
  });

  // Compare List
  const [compareList, setCompareList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COMPARE);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load compare:', e);
    }
    return [];
  });

  // Language & Theme & Currency
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LANG);
    return (saved === 'en' || saved === 'ar') ? saved : 'ar';
  });

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CURRENCY);
    return (saved === 'USD' || saved === 'JOD') ? saved : 'JOD';
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPercent?: number; discountFixedJOD?: number } | null>(null);
  const [pendingTwoFactorUser, setPendingTwoFactorUser] = useState<User | null>(null);

  // Sensitive Action Two-Step Verification State
  const [activeSensitiveChallenge, setActiveSensitiveChallenge] = useState<SensitiveVerificationChallenge | null>(null);
  const [simulatedEmailMessage, setSimulatedEmailMessage] = useState<SimulatedEmailMessage | null>(null);
  const [adminVerifiedUntil, setAdminVerifiedUntil] = useState<number>(0);
  const [pendingPasswordlessOTP, setPendingPasswordlessOTP] = useState<{
    email: string;
    code: string;
    expiresAt: number;
  } | null>(null);
  const [pending2FALoginOTP, setPending2FALoginOTP] = useState<string | null>(null);

  const isAdminSessionVerified = useMemo(() => {
    if (currentUser && (currentUser.role === 'owner' || currentUser.role === 'staff')) {
      return true;
    }
    return Date.now() < adminVerifiedUntil;
  }, [currentUser, adminVerifiedUntil]);

  // Hash-based routing
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.hash || '#home';
  });

  useEffect(() => {
    console.count('[StoreContext] hash listener effect');
    const handleHashChange = () => {
      const hash = window.location.hash || '#home';
      setCurrentRoute(hash);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (route: string) => {
    setIsCartOpen(false);
    window.location.hash = route.startsWith('#') ? route : `#${route}`;
  };

  // Sync state to localStorage
  useEffect(() => {
    console.count('[StoreContext] state persistence effect');
    const serializedFullState = JSON.stringify(state);
    console.log('[StoreContext] full state size:', serializedFullState.length);
    const stateForStorage = {
      ...state,
      users: [],
      orders: [],
    };
    const serializedState = JSON.stringify(stateForStorage);
    console.log('[StoreContext] state size for localStorage:', serializedState.length);
    const saveTimer = window.setTimeout(() => {
      console.time('[StoreContext] state persistence');
      try {
        localStorage.setItem(STORAGE_KEY_DB, serializedState);
      } catch (e) {
        console.error('Failed to save store db to localStorage:', e);
      } finally {
        console.timeEnd('[StoreContext] state persistence');
      }
    }, 1000);

    return () => window.clearTimeout(saveTimer);
  }, [state]);

  const [isOrdersLoading, setIsOrdersLoading] = useState<boolean>(false);

  // Sync cart to localStorage
  useEffect(() => {
    console.count('[StoreContext] cart persistence effect');
    try {
      localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage:', e);
    }
  }, [cart]);

  // Sync wishlist
  useEffect(() => {
    console.count('[StoreContext] wishlist persistence effect');
    try {
      localStorage.setItem(STORAGE_KEY_WISHLIST, JSON.stringify(wishlist));
    } catch (e) {
      console.error('Failed to save wishlist:', e);
    }
  }, [wishlist]);

  // Sync compare
  useEffect(() => {
    console.count('[StoreContext] compare persistence effect');
    try {
      localStorage.setItem(STORAGE_KEY_COMPARE, JSON.stringify(compareList));
    } catch (e) {
      console.error('Failed to save compare list:', e);
    }
  }, [compareList]);

  // Sync session
  useEffect(() => {
    console.count('[StoreContext] session persistence effect');
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEY_SESSION);
      }
    } catch (e) {
      console.error('Failed to save session:', e);
    }
  }, [currentUser]);

  // Sync Language & RTL/LTR
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY_LANG, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  };

  useEffect(() => {
    console.count('[StoreContext] language effect');
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  // Sync Theme
  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY_THEME, newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.remove('light-theme', 'light-mode');
      document.body.classList.add('dark-theme', 'dark-mode');
      document.body.style.backgroundColor = '#020617';
      document.body.style.color = '#f8fafc';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.classList.remove('dark-theme', 'dark-mode');
      document.body.classList.add('light-theme', 'light-mode');
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#0f172a';
    }
  };

  useEffect(() => {
    console.count('[StoreContext] theme effect');
    setTheme(theme);
  }, [theme]);

  const setCurrency = (curr: Currency) => {
    setCurrencyState(curr);
    localStorage.setItem(STORAGE_KEY_CURRENCY, curr);
  };

  // Toast System
  const addToast = (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Translation instance
  const t = useMemo(() => getT(language), [language]);

  // Price Formatter
  const formatPrice = (priceJOD: number, priceUSD?: number) => {
    if (currency === 'USD') {
      const val = priceUSD ?? priceJOD * state.settings.usdExchangeRate;
      return `$${val.toFixed(2)}`;
    }
    return `${priceJOD.toFixed(2)} ${t.jordanianCurrency}`;
  };

  // Best Sellers Calculation: dynamically counts sales in orders
  const bestSellerProductIds = useMemo(() => {
    const countMap: Record<string, number> = {};
    
    // Seed counts from initial sales
    state.orders.forEach((order) => {
      order.items.forEach((item) => {
        countMap[item.productId] = (countMap[item.productId] || 0) + item.quantity;
      });
    });

    // Add baseline counts so initial products shine
    countMap['prod-ea-fc25'] = (countMap['prod-ea-fc25'] || 0) + 42;
    countMap['prod-psplus-deluxe-12m'] = (countMap['prod-psplus-deluxe-12m'] || 0) + 36;
    countMap['prod-psn-50-us'] = (countMap['prod-psn-50-us'] || 0) + 29;
    countMap['prod-steam-50-global'] = (countMap['prod-steam-50-global'] || 0) + 25;
    countMap['prod-wukong'] = (countMap['prod-wukong'] || 0) + 18;

    return Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
  }, [state.orders]);

  // Unread Notifications Count for current user
  const unreadNotificationsCount = useMemo(() => {
    return state.notifications.filter(
      (n) => !n.isRead && (n.userId === 'all' || n.userId === currentUser?.id)
    ).length;
  }, [state.notifications, currentUser]);

  // Auth & 2FA Methods
  const requestPasswordlessOTP = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: language === 'ar' ? 'يرجى إدخال البريد الإلكتروني' : 'Please enter your email' };
    }

    const code = generateNumericOTP(6);
    const expiresAt = Date.now() + 10 * 60 * 1000;
    setPendingPasswordlessOTP({ email: cleanEmail, code, expiresAt });

    const result = { success: true };
    if (!result.success) {
      return { success: false, error: result.error || (language === 'ar' ? 'تعذر إرسال رمز التحقق' : 'Could not send the verification code') };
    }
    addToast(
      language === 'ar' ? 'تم إرسال رمز التحقق' : 'Verification code sent',
      language === 'ar' ? `تفقد بريدك الإلكتروني: ${cleanEmail}` : `Check your inbox at ${cleanEmail}`,
      'info'
    );
    return { success: true };
  };

  const login = async (email: string) => {
    const result = await requestPasswordlessOTP(email);
    return { ...result, codeSent: result.success };
  };

  const completePasswordlessLogin = (email: string, code: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const challenge = pendingPasswordlessOTP;
    if (!challenge || challenge.email !== cleanEmail || challenge.code !== code.trim() || Date.now() > challenge.expiresAt) {
      return { success: false, error: language === 'ar' ? 'رمز التحقق غير صحيح أو انتهت صلاحيته' : 'Invalid or expired verification code' };
    }

    const existingUser = state.users.find((candidate) => candidate.email.toLowerCase() === cleanEmail);
    setPendingPasswordlessOTP(null);
    if (!existingUser) {
      return { success: true, requiresProfile: true };
    }
    signInCustomer(existingUser);
    return { success: true };
  };

  const signInCustomer = (user: User) => {
    setCurrentUser(user);
    addToast(language === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Signed in successfully', language === 'ar' ? `أهلاً بك ${user.name}` : `Welcome ${user.name}`, 'success');
  };

  const createCustomerAccount = (data: { firstName: string; lastName: string; phone: string; email: string; promotionalEmails: boolean; authUid?: string; avatar?: string }) => {
    const cleanEmail = data.email.trim().toLowerCase();
    const firstName = data.firstName.trim();
    const lastName = data.lastName.trim();
    const phone = data.phone.trim();
    if (!firstName || !lastName || !phone) {
      return { success: false, error: language === 'ar' ? 'يرجى تعبئة جميع الحقول المطلوبة' : 'Please complete all required fields' };
    }
    const existingUser = state.users.find((candidate) => candidate.email.toLowerCase() === cleanEmail);
    if (existingUser) {
      signInCustomer(existingUser);
      return { success: true };
    }
    const user: User = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: `${firstName} ${lastName}`,
      email: cleanEmail,
      phone,
      role: 'customer',
      authUid: data.authUid,
      avatar: data.avatar,
      registeredAt: new Date().toISOString(),
      twoFactorEnabled: false,
      promotionalEmails: data.promotionalEmails,
    };
    setState((prev) => ({ ...prev, users: [...prev.users, user] }));
    signInCustomer(user);
    return { success: true };
  };

  const requestAdminLoginLink = async (_email: string) => {
    return { success: false, error: language === 'ar' ? 'تم إلغاء تسجيل الدخول الإداري في الوضع المحلي' : 'Admin sign-in is disabled in local-only mode' };
  };

  const completeAdminLoginFromLink = async () => {
    return { success: false, error: language === 'ar' ? 'تم إلغاء تسجيل الدخول الإداري في الوضع المحلي' : 'Admin sign-in is disabled in local-only mode' };
  };

  const completeTwoFactorLogin = (code: string) => {
    if (!pendingTwoFactorUser) {
      return { success: false, error: language === 'ar' ? 'لا يوجد جلسة تحقق معلقة' : 'No pending 2FA session' };
    }

    const user = pendingTwoFactorUser;
    const cleanCode = code.trim().toUpperCase();

    // Check 1: One-time Backup Recovery Code (e.g. QW9X-4421)
    if (user.twoFactorBackupCodes && user.twoFactorBackupCodes.includes(cleanCode)) {
      const remainingCodes = user.twoFactorBackupCodes.filter((c) => c !== cleanCode);
      const updatedUser: User = {
        ...user,
        twoFactorBackupCodes: remainingCodes,
      };

      setState((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === user.id ? updatedUser : u)),
      }));

      setCurrentUser(updatedUser);
      setPendingTwoFactorUser(null);
      setPending2FALoginOTP(null);
      setSimulatedEmailMessage(null);
      addToast(
        language === 'ar' ? 'تم الدخول برمز الاسترداد 🛡️' : 'Backup code used 🛡️',
        language === 'ar' ? `تبقى لديك ${remainingCodes.length} من رموز الطوارئ` : `${remainingCodes.length} backup codes remaining`,
        'warning'
      );
      return { success: true };
    }

    // Check 2: Dynamic Email/SMS/WhatsApp OTP or TOTP code
    const isEmailOrDirectMatch = pending2FALoginOTP && cleanCode === pending2FALoginOTP;
    const isTOTPValid = user.twoFactorSecret ? verifyTOTPCode(user.twoFactorSecret, cleanCode) : false;
    if (isEmailOrDirectMatch || isTOTPValid) {
      setCurrentUser(user);
      setPendingTwoFactorUser(null);
      setPending2FALoginOTP(null);
      setSimulatedEmailMessage(null);
      addToast(
        language === 'ar' ? 'تم التحقق بخطوتين بنجاح 🛡️' : '2FA Verified 🛡️',
        language === 'ar' ? `أهلاً بك مجدداً، ${user.name}` : `Welcome back, ${user.name}`,
        'success'
      );
      return { success: true };
    }

    return {
      success: false,
      error: language === 'ar' ? 'رمز التحقق غير صحيح أو انتهت صلاحيته' : 'Invalid or expired verification code',
    };
  };

  const resendTwoFactorLoginOTP = () => {
    if (!pendingTwoFactorUser) {
      return { success: false, error: 'No pending 2FA' };
    }

    const otpCode = generateNumericOTP(6);
    setPending2FALoginOTP(otpCode);

    const targetChannel = pendingTwoFactorUser.twoFactorMethod === 'whatsapp' ? 'whatsapp' : (pendingTwoFactorUser.twoFactorMethod === 'sms' ? 'sms' : 'email');

    const emailMsg: SimulatedEmailMessage = {
      id: `sim-2fa-${Date.now()}`,
      toEmail: pendingTwoFactorUser.email,
      subjectAr: `🛡️ رمز التحقق الجديد لتسجيل الدخول`,
      subjectEn: `🛡️ New Two-Factor Login Code`,
      code: '',
      actionNameAr: 'تسجيل الدخول بالتحقق بخطوتين',
      actionNameEn: '2FA Login Verification',
      timestamp: new Date().toLocaleTimeString(language === 'ar' ? 'ar-JO' : 'en-US'),
      expiresInSeconds: 300,
      channel: targetChannel,
    };
    setSimulatedEmailMessage(emailMsg);
    playNotificationSound();

    // OTP sent via console log (dev mode)
    console.log('OTP Code:', otpCode);

    addToast(
      language === 'ar' ? 'تم إرسال رمز أمان جديد 🔄' : 'New code sent 🔄',
      language === 'ar' ? 'تم إرسال رمز التحقق الجديد إلى بريدك الإلكتروني.' : `A new verification code has been sent to ${pendingTwoFactorUser.email}.`,
      'info'
    );
    return { success: true };
  };

  const cancelTwoFactorLogin = () => {
    setPendingTwoFactorUser(null);
    setPending2FALoginOTP(null);
    setSimulatedEmailMessage(null);
  };

  const enableTwoFactor = (
    method: 'authenticator' | 'whatsapp' | 'sms' | 'email',
    secret: string,
    code: string,
    expectedCode: string,
    backupCodes: string[],
    phone?: string
  ) => {
    if (!currentUser) {
      return { success: false, error: 'User must be logged in' };
    }

    const cleanCode = code.trim();
    const cleanExpectedCode = expectedCode.trim();
    if (method !== 'authenticator' && !cleanExpectedCode) {
      return {
        success: false,
        error: language === 'ar' ? 'تعذر التحقق: لم يتم إنشاء رمز أمان صالح' : 'Verification failed: no valid security code was generated',
      };
    }

    const isValid = method === 'authenticator' ? verifyTOTPCode(secret, cleanCode) : cleanCode === cleanExpectedCode;
    if (!isValid) {
      return {
        success: false,
        error: language === 'ar' ? 'رمز التحقق غير صحيح. تأكد من إدخال الرمز المكون من 6 أرقام' : 'Invalid code',
      };
    }

    const updatedUser: User = {
      ...currentUser,
      twoFactorEnabled: true,
      twoFactorMethod: method,
      twoFactorSecret: secret,
      twoFactorBackupCodes: backupCodes,
      twoFactorPhone: phone || currentUser.phone,
      twoFactorCreatedAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === currentUser.id ? updatedUser : u)),
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'تفعيل التحقق بخطوتين 2FA',
          details: `تم تفعيل 2FA بطريقة ${method === 'authenticator' ? 'تطبيق المصادقة' : method === 'email' ? 'البريد الإلكتروني' : 'الواتساب'}`,
          timestamp: new Date().toISOString(),
        },
        ...prev.activityLogs,
      ],
    }));

    setCurrentUser(updatedUser);
    addToast(
      language === 'ar' ? 'تم تفعيل التحقق بخطوتين 🛡️' : '2FA Enabled 🛡️',
      language === 'ar' ? 'حسابك الآن مؤمن بأعلى معايير الحماية' : 'Your account is now fully protected',
      'success'
    );
    return { success: true };
  };

  const disableTwoFactor = () => {
    if (!currentUser) return { success: false, error: 'Not logged in' };

    const updatedUser: User = {
      ...currentUser,
      twoFactorEnabled: false,
      twoFactorSecret: undefined,
      twoFactorBackupCodes: undefined,
      twoFactorMethod: undefined,
      twoFactorPhone: undefined,
    };

    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === currentUser.id ? updatedUser : u)),
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'تعطيل التحقق بخطوتين 2FA',
          details: `تم إيقاف تفعيل 2FA للحساب`,
          timestamp: new Date().toISOString(),
        },
        ...prev.activityLogs,
      ],
    }));

    setCurrentUser(updatedUser);
    addToast(
      language === 'ar' ? 'تم إيقاف التحقق بخطوتين' : '2FA Disabled',
      language === 'ar' ? 'تم تعطيل التحقق بخطوتين لحسابك' : '2FA has been disabled for your account',
      'info'
    );
    return { success: true };
  };

  const regenerateBackupCodes = () => {
    if (!currentUser || !currentUser.twoFactorEnabled) {
      return { success: false, error: '2FA is not enabled' };
    }
    const newCodes = generateBackupCodes(8);
    const updatedUser: User = {
      ...currentUser,
      twoFactorBackupCodes: newCodes,
    };

    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === currentUser.id ? updatedUser : u)),
    }));

    setCurrentUser(updatedUser);
    addToast(
      language === 'ar' ? 'رموز استرداد جديدة 🔑' : 'New Backup Codes 🔑',
      language === 'ar' ? 'تم إنشاء 8 رموز طوارئ احتياطية جديدة بنجاح' : 'Generated 8 new backup codes',
      'success'
    );
    return { success: true, backupCodes: newCodes };
  };

  // Step-Up Two-Step Verification for Sensitive Actions
  const requestSensitiveActionVerification = (options: {
    actionType: SensitiveActionType;
    titleAr: string;
    titleEn: string;
    descriptionAr: string;
    descriptionEn: string;
    targetEmail?: string;
    targetPhone?: string;
    deliveryChannel?: 'email' | 'sms' | 'whatsapp';
    metadata?: Record<string, any>;
    onSuccess: () => void;
  }) => {
    const code = generateNumericOTP(6);
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    const targetEmail = options.targetEmail || currentUser?.email || 'gmail';
    const targetPhone = options.targetPhone || currentUser?.phone || '+962 7 9000 0000';
    const channel = options.deliveryChannel || 'email';

    const challenge: SensitiveVerificationChallenge = {
      id: `chal-${Date.now()}`,
      actionType: options.actionType,
      titleAr: options.titleAr,
      titleEn: options.titleEn,
      descriptionAr: options.descriptionAr,
      descriptionEn: options.descriptionEn,
      targetEmail,
      targetPhone,
      code,
      expiresAt,
      deliveryChannel: channel,
      attemptsCount: 0,
      metadata: options.metadata,
      onSuccess: options.onSuccess,
    };

    setActiveSensitiveChallenge(challenge);

    // Trigger simulated incoming email / notification banner
    const emailMsg: SimulatedEmailMessage = {
      id: `sim-mail-${Date.now()}`,
      toEmail: targetEmail,
      subjectAr: `رمز التحقق بخطوتين لتأكيد: ${options.titleAr}`,
      subjectEn: `Security Verification Code for: ${options.titleEn}`,
      code: '',
      actionNameAr: options.titleAr,
      actionNameEn: options.titleEn,
      timestamp: new Date().toLocaleTimeString(language === 'ar' ? 'ar-JO' : 'en-US'),
      expiresInSeconds: 300,
      channel,
    };
    setSimulatedEmailMessage(emailMsg);

    // OTP sent via console log (dev mode)
    console.log('OTP Code:', otpCode);

    // Play subtle chime sound
    playNotificationSound();

    // Log to in-app notification center as well
    const notifItem: NotificationItem = {
      id: `notif-sec-${Date.now()}`,
      userId: currentUser?.id || 'all',
      titleAr: 'رمز أمان جديد',
      titleEn: 'Security OTP',
      messageAr: `تم إرسال رمز التحقق بخطوتين لتأكيد ${options.titleAr}. صالح لمدة 5 دقائق.`,
      messageEn: `Two-step verification code sent for ${options.titleEn}. Valid for 5 minutes.`,
      type: 'system',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      notifications: [notifItem, ...prev.notifications],
    }));

    addToast(
      language === 'ar' ? 'تم إرسال رمز التحقق الأمني 📧' : 'Security OTP Sent 📧',
      language === 'ar'
        ? `تم إرسال كود التحقق (6 أرقام) إلى بريدك المسجل (${targetEmail})`
        : `6-digit verification code sent to ${targetEmail}`,
      'info'
    );
  };

  const verifySensitiveActionCode = (enteredCode: string) => {
    if (!activeSensitiveChallenge) {
      return {
        success: false,
        error: language === 'ar' ? 'لا يوجد طلب تحقق معلق' : 'No active verification challenge',
      };
    }

    const clean = enteredCode.trim().replace(/\s+/g, '');
    if (Date.now() > activeSensitiveChallenge.expiresAt) {
      return {
        success: false,
        error: language === 'ar' ? 'انتهت صلاحية الرمز، يرجى طلب رمز جديد' : 'Code has expired, please resend',
      };
    }

    const isMatch = clean === activeSensitiveChallenge.code;
    if (!isMatch) {
      return {
        success: false,
        error: language === 'ar' ? 'رمز التحقق غير صحيح، يرجى التأكد والمحاولة ثانية' : 'Invalid verification code',
      };
    }

    // Success!
    if (activeSensitiveChallenge.actionType === 'admin_access') {
      setAdminVerifiedUntil(Date.now() + 30 * 60 * 1000); // 30 minutes validity
    }

    const callback = activeSensitiveChallenge.onSuccess;
    setActiveSensitiveChallenge(null);
    setSimulatedEmailMessage(null);

    if (callback) {
      callback();
    }

    addToast(
      language === 'ar' ? 'تم التحقق بنجاح 🛡️' : 'Verified Successfully 🛡️',
      language === 'ar' ? 'تم تأكيد الإجراء الحساس بنجاح' : 'Sensitive action confirmed',
      'success'
    );

    return { success: true };
  };

  const cancelSensitiveActionVerification = () => {
    setActiveSensitiveChallenge(null);
    setSimulatedEmailMessage(null);
  };

  const resendSensitiveActionCode = (channel?: 'email' | 'sms' | 'whatsapp') => {
    if (!activeSensitiveChallenge) return;
    const newCode = generateNumericOTP(6);
    const newExpiresAt = Date.now() + 5 * 60 * 1000;
    const targetChannel = channel || activeSensitiveChallenge.deliveryChannel;

    const updated: SensitiveVerificationChallenge = {
      ...activeSensitiveChallenge,
      code: newCode,
      expiresAt: newExpiresAt,
      deliveryChannel: targetChannel,
    };
    setActiveSensitiveChallenge(updated);

    const emailMsg: SimulatedEmailMessage = {
      id: `sim-mail-${Date.now()}`,
      toEmail: updated.targetEmail,
      subjectAr: `رمز التحقق الجديد: ${updated.titleAr}`,
      subjectEn: `New Verification Code: ${updated.titleEn}`,
      code: '',
      actionNameAr: updated.titleAr,
      actionNameEn: updated.titleEn,
      timestamp: new Date().toLocaleTimeString(language === 'ar' ? 'ar-JO' : 'en-US'),
      expiresInSeconds: 300,
      channel: targetChannel,
    };
    setSimulatedEmailMessage(emailMsg);
    playNotificationSound();

    // OTP sent via console log (dev mode)
    console.log('OTP Code:', otpCode);

    addToast(
      language === 'ar' ? 'تم إرسال رمز جديد 🔄' : 'New Code Sent 🔄',
      language === 'ar' ? 'تم إرسال رمز التحقق الجديد إلى بريدك الإلكتروني.' : `A new verification code has been sent to ${updated.targetEmail}.`,
      'info'
    );
  };

  const clearSimulatedEmailMessage = () => {
    setSimulatedEmailMessage(null);
  };

  const lockAdminSession = () => {
    setAdminVerifiedUntil(0);
    addToast(
      language === 'ar' ? 'تم قفل جلسة الإدارة 🔒' : 'Admin Session Locked 🔒',
      language === 'ar' ? 'يتطلب الدخول مجدداً التحقق بالرمز المكون من 6 أرقام' : 'Re-entry requires 6-digit verification code',
      'info'
    );
  };

  const updateUserProfile = (data: Partial<User>) => {
    if (!currentUser) return;
    const updatedUser: User = {
      ...currentUser,
      ...data,
    };

    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === currentUser.id ? updatedUser : u)),
    }));

    setCurrentUser(updatedUser);
    addToast(
      language === 'ar' ? 'تم تحديث الملف الشخصي' : 'Profile Updated',
      language === 'ar' ? 'تم حفظ التغييرات بنجاح' : 'Your changes have been saved',
      'success'
    );
  };

  const logout = () => {
    setCurrentUser(null);
    addToast(
      language === 'ar' ? 'تم تسجيل الخروج' : 'Signed out',
      language === 'ar' ? 'نتشرف بزيارتك القادمة دائماً يا غالي' : 'See you next time!',
      'info'
    );
  };

  const updateUserRole = (userId: string, newRole: UserRole) => {
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
    }));
    if (currentUser?.id === userId) {
      setCurrentUser((prev) => prev ? { ...prev, role: newRole } : null);
    }
    addToast(
      language === 'ar' ? 'تحديث الصلاحية' : 'Role Updated',
      language === 'ar' ? `تم تغيير صلاحية المستخدم بنجاح` : `User role changed to ${newRole}`,
      'success'
    );
  };

  // Cart Management
  const addToCart = (product: Product, quantity = 1) => {
    if (product.stockQuantity <= 0) {
      addToast(
        language === 'ar' ? 'عذراً، نفد المخزون' : 'Out of stock',
        language === 'ar' ? `المنتج "${product.nameAr}" غير متوفر حالياً` : `Product is currently out of stock`,
        'warning'
      );
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, product.stockQuantity);
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prev, { product, quantity: Math.min(quantity, product.stockQuantity) }];
    });

    addToast(
      language === 'ar' ? 'أُضيف إلى السلة 🛒' : 'Added to cart 🛒',
      language === 'ar' ? `تمت إضافة "${product.nameAr}" إلى سلتك` : `Added ${product.nameEn} to your cart`,
      'success'
    );
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const maxStock = item.product.stockQuantity;
          return { ...item, quantity: Math.min(quantity, maxStock) };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedPromo(null);
  };

  const applyPromoCode = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const found = state.promoCodes.find((p) => p.code.toUpperCase() === cleanCode && p.active);
    if (found) {
      setAppliedPromo(found);
      addToast(
        language === 'ar' ? 'تم تطبيق كود الخصم! 🎉' : 'Promo code applied! 🎉',
        language === 'ar'
          ? `حصلت على ${found.discountPercent ? `${found.discountPercent}% خصم` : `${found.discountFixedJOD} د.أ خصم`}`
          : `You received ${found.discountPercent ? `${found.discountPercent}% discount` : `${found.discountFixedJOD} JOD discount`}`,
        'success'
      );
      return { success: true, message: 'Applied successfully' };
    }
    return {
      success: false,
      message: language === 'ar' ? 'كود الخصم غير صالح أو منتهي الصلاحية' : 'Invalid or expired promo code',
    };
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
  };

  const addPromoCode = (promo: { code: string; discountPercent?: number; discountFixedJOD?: number }) => {
    const cleanCode = promo.code.trim().toUpperCase();
    if (!cleanCode) return;
    setState((prev) => ({
      ...prev,
      promoCodes: [
        ...prev.promoCodes.filter((p) => p.code.toUpperCase() !== cleanCode),
        {
          code: cleanCode,
          discountPercent: promo.discountPercent,
          discountFixedJOD: promo.discountFixedJOD,
          active: true,
        },
      ],
    }));
    addToast(
      language === 'ar' ? 'تمت إضافة كود الخصم 🏷️' : 'Promo Code Added 🏷️',
      language === 'ar' ? `الكود ${cleanCode} جاهز للاستخدام الآن` : `Promo code ${cleanCode} is now active`,
      'success'
    );
  };

  const togglePromoCode = (code: string) => {
    setState((prev) => ({
      ...prev,
      promoCodes: prev.promoCodes.map((p) =>
        p.code.toUpperCase() === code.toUpperCase() ? { ...p, active: !p.active } : p
      ),
    }));
  };

  const deletePromoCode = (code: string) => {
    setState((prev) => ({
      ...prev,
      promoCodes: prev.promoCodes.filter((p) => p.code.toUpperCase() !== code.toUpperCase()),
    }));
    if (appliedPromo?.code.toUpperCase() === code.toUpperCase()) {
      setAppliedPromo(null);
    }
    addToast(
      language === 'ar' ? 'تم حذف كود الخصم' : 'Promo Code Deleted',
      language === 'ar' ? `تم حذف الكود ${code} من النظام` : `Promo code ${code} was removed`,
      'info'
    );
  };

  // Wishlist
  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        addToast(
          language === 'ar' ? 'تمت الإزالة من المفضلة' : 'Removed from wishlist',
          language === 'ar' ? 'تمت إزالة المنتج من قائمة أمنياتك' : 'Removed from wishlist',
          'info'
        );
        return prev.filter((id) => id !== productId);
      } else {
        addToast(
          language === 'ar' ? 'أُضيف إلى المفضلة ❤️' : 'Added to wishlist ❤️',
          language === 'ar' ? 'يمكنك الوصول له بأي وقت من صفحة المفضلة' : 'Saved to your wishlist',
          'success'
        );
        return [...prev, productId];
      }
    });
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  // Compare
  const toggleCompare = (productId: string) => {
    if (compareList.includes(productId)) {
      setCompareList((prev) => prev.filter((id) => id !== productId));
      return false;
    } else {
      if (compareList.length >= 4) {
        addToast(
          language === 'ar' ? 'حد المقارنة أقصى 4 منتجات' : 'Comparison limit is 4 items',
          language === 'ar' ? 'يرجى إزالة منتج أولاً لإضافة منتج آخر' : 'Remove an item first to add a new one',
          'warning'
        );
        return false;
      }
      setCompareList((prev) => [...prev, productId]);
      addToast(
        language === 'ar' ? 'أُضيف للمقارنة ⚖️' : 'Added to compare ⚖️',
        language === 'ar' ? 'يمكنك رؤية المواصفات جنباً إلى جنب في صفحة المقارنة' : 'Compare side by side in Compare page',
        'info'
      );
      return true;
    }
  };

  const isInCompare = (productId: string) => compareList.includes(productId);
  const removeFromCompare = (productId: string) => setCompareList((prev) => prev.filter((id) => id !== productId));
  const clearCompare = () => setCompareList([]);

  // Orders
  const createOrder = (data: {
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    preferredDeliveryMethod: 'whatsapp' | 'email' | 'both';
    fulfillmentType?: 'pickup' | 'delivery';
    shippingGovernorate?: string;
    shippingAddress?: string;
    shippingNotes?: string;
    shippingCostJOD?: number;
    shippingCostUSD?: number;
    deliveryCompanyId?: string;
    deliveryCompanyName?: string;
    paymentMethod: PaymentMethodType;
    paymentProofImage?: string;
    paymentProofFileName?: string;
    paymentProofFileSize?: number;
    paymentReference?: string;
    notes?: string;
  }): Order => {
    const subtotalJOD = cart.reduce((acc, item) => acc + item.product.priceJOD * item.quantity, 0);
    const subtotalUSD = cart.reduce((acc, item) => acc + item.product.priceUSD * item.quantity, 0);

    let discountJOD = 0;
    let discountUSD = 0;
    if (appliedPromo) {
      if (appliedPromo.discountPercent) {
        discountJOD = (subtotalJOD * appliedPromo.discountPercent) / 100;
        discountUSD = (subtotalUSD * appliedPromo.discountPercent) / 100;
      } else if (appliedPromo.discountFixedJOD) {
        discountJOD = Math.min(appliedPromo.discountFixedJOD, subtotalJOD);
        discountUSD = discountJOD * state.settings.usdExchangeRate;
      }
    }

    const shippingCostJOD = data.shippingCostJOD || 0;
    const shippingCostUSD = data.shippingCostUSD !== undefined ? data.shippingCostUSD : (shippingCostJOD * state.settings.usdExchangeRate);

    const totalJOD = Math.max(0, subtotalJOD - discountJOD + shippingCostJOD);
    const totalUSD = Math.max(0, subtotalUSD - discountUSD + shippingCostUSD);

    const orderNumber = `QWD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const orderItems = cart.map((item) => ({
      productId: item.product.id,
      productNameAr: item.product.nameAr,
      productNameEn: item.product.nameEn,
      category: item.product.category,
      priceJOD: item.product.priceJOD,
      priceUSD: item.product.priceUSD,
      quantity: item.quantity,
      image: item.product.image,
    }));

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      userId: currentUser ? currentUser.id : `guest-${Date.now()}`,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      preferredDeliveryMethod: data.preferredDeliveryMethod,
      fulfillmentType: data.fulfillmentType || 'pickup',
      shippingGovernorate: data.shippingGovernorate,
      shippingAddress: data.shippingAddress,
      shippingNotes: data.shippingNotes,
      shippingCostJOD,
      shippingCostUSD,
      deliveryCompanyId: data.deliveryCompanyId,
      deliveryCompanyName: data.deliveryCompanyName,
      paymentMethod: data.paymentMethod,
      paymentProofImage: data.paymentProofImage,
      paymentProofFileName: data.paymentProofFileName,
      paymentProofFileSize: data.paymentProofFileSize,
      paymentReference: data.paymentReference,
      items: orderItems,
      subtotalJOD,
      subtotalUSD,
      discountJOD,
      discountUSD,
      totalJOD,
      totalUSD,
      appliedPromoCode: appliedPromo?.code,
      notes: data.notes,
      status: 'pending_payment',
      timeline: [
        {
          status: 'pending_payment',
          timestamp: new Date().toISOString(),
          noteAr: 'تم تسجيل الطلب بنجاح بانتظار تحويل الدفعة',
          noteEn: 'Order placed, awaiting payment confirmation',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add order to state without artificial stock deduction
    setState((prev) => {
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        userId: newOrder.userId,
        titleAr: `تم استلام طلبك #${orderNumber} بنجاح ⚡`,
        titleEn: `Order request received #${orderNumber} ⚡`,
        messageAr: `طلبك بقيمة ${totalJOD.toFixed(2)} د.أ بانتظار تحويل الدفعة عبر ${data.paymentMethod === 'cliq' ? 'كليك (CliQ)' : 'التحويل البنكي'} لشراء وتجهيز طلبك فوراً.`,
        messageEn: `Order request of ${totalJOD.toFixed(2)} JOD awaiting payment confirmation to process immediately.`,
        type: 'order',
        linkHash: '#orders',
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      return {
        ...prev,
        orders: [newOrder, ...prev.orders],
        notifications: [newNotif, ...prev.notifications],
        activityLogs: [
          {
            id: `act-${Date.now()}`,
            userId: newOrder.userId,
            userName: data.customerName,
            userRole: currentUser?.role || 'customer',
            action: 'طلب شراء جديد (عند الطلب)',
            details: `طلب رقم ${orderNumber} بمبلغ ${totalJOD.toFixed(2)} د.أ`,
            timestamp: new Date().toISOString(),
          },
          ...prev.activityLogs,
        ],
      };
    });

    clearCart();
    return newOrder;
  };

  const updateOrderStatus = (
    orderId: string,
    status: OrderStatus,
    noteAr: string,
    noteEn: string,
    digitalDeliveries?: Order['digitalDeliveries']
  ) => {
    setState((prev) => {
      const order = prev.orders.find((o) => o.id === orderId);
      if (!order) return prev;

      const timelineEvent = {
        status,
        timestamp: new Date().toISOString(),
        noteAr: noteAr || `تم تحديث الحالة إلى ${status}`,
        noteEn: noteEn || `Status updated to ${status}`,
      };

      const updatedOrder: Order = {
        ...order,
        status,
        updatedAt: new Date().toISOString(),
        timeline: [...order.timeline, timelineEvent],
        ...(digitalDeliveries ? { digitalDeliveries } : {}),
      };

      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        userId: order.userId,
        titleAr: `تحديث لحالة طلبك #${order.orderNumber} 🔔`,
        titleEn: `Order Status Update #${order.orderNumber} 🔔`,
        messageAr: noteAr || `تم تغيير حالة طلبك إلى: ${status}`,
        messageEn: noteEn || `Your order status changed to: ${status}`,
        type: 'order',
        linkHash: '#orders',
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      return {
        ...prev,
        orders: prev.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
        notifications: [newNotif, ...prev.notifications],
      };
    });

    addToast(
      language === 'ar' ? 'تم تحديث حالة الطلب' : 'Order status updated',
      noteAr || `Status set to ${status}`,
      'success'
    );
  };

  const addPaymentProofToOrder = (orderId: string, referenceNumber: string) => {
    updateOrderStatus(
      orderId,
      'payment_proof',
      `تم إرفاق الرقم المرجعي للدفع: ${referenceNumber}`,
      `Payment proof reference provided: ${referenceNumber}`
    );
  };

  // Product Management
  const addProduct = (productData: Omit<Product, 'id' | 'createdAt' | 'rating' | 'reviewsCount'>) => {
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      rating: 5.0,
      reviewsCount: 0,
      createdAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      products: [newProduct, ...prev.products],
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          userId: currentUser?.id || 'admin',
          userName: currentUser?.name || 'Admin',
          userRole: currentUser?.role || 'owner',
          action: 'إضافة منتج جديد',
          details: `إضافة المنتج: ${newProduct.nameAr}`,
          timestamp: new Date().toISOString(),
        },
        ...prev.activityLogs,
      ],
    }));

    addToast(
      language === 'ar' ? 'تم إضافة المنتج بنجاح' : 'Product added successfully',
      newProduct.nameAr,
      'success'
    );
  };

  const updateProduct = (product: Product) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === product.id ? product : p)),
    }));
    addToast(
      language === 'ar' ? 'تم تحديث بيانات المنتج' : 'Product updated',
      product.nameAr,
      'success'
    );
  };

  const deleteProduct = (productId: string) => {
    const prod = state.products.find((p) => p.id === productId);
    setState((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== productId),
    }));
    addToast(
      language === 'ar' ? 'تم حذف المنتج' : 'Product deleted',
      prod?.nameAr || '',
      'info'
    );
  };

  const updateProductStock = (productId: string, newStock: number) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === productId ? { ...p, stockQuantity: Math.max(0, newStock) } : p)),
    }));
    addToast(
      language === 'ar' ? 'تم تحديث المخزون' : 'Stock updated',
      `الكمية الجديدة: ${newStock}`,
      'success'
    );
  };

  // Reviews
  const addReview = (productId: string, rating: number, comment: string) => {
    if (!currentUser) {
      return { success: false, message: language === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Must login first' };
    }

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      productId,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    };

    setState((prev) => {
      const allProductReviews = [...prev.reviews.filter((r) => r.productId === productId), newReview];
      const avgRating = allProductReviews.reduce((sum, r) => sum + r.rating, 0) / allProductReviews.length;

      const updatedProducts = prev.products.map((p) => {
        if (p.id === productId) {
          return {
            ...p,
            rating: Number(avgRating.toFixed(1)),
            reviewsCount: allProductReviews.length,
          };
        }
        return p;
      });

      return {
        ...prev,
        reviews: [newReview, ...prev.reviews],
        products: updatedProducts,
      };
    });

    addToast(
      language === 'ar' ? 'شكراً على تقييمك! ⭐' : 'Thank you for your review! ⭐',
      language === 'ar' ? 'تم نشر مراجعتك بنجاح' : 'Review published',
      'success'
    );
    return { success: true };
  };

  const deleteReview = (reviewId: string) => {
    setState((prev) => {
      const review = prev.reviews.find((r) => r.id === reviewId);
      if (!review) return prev;

      const remainingReviews = prev.reviews.filter((r) => r.id !== reviewId);
      const productReviews = remainingReviews.filter((r) => r.productId === review.productId);
      const avgRating = productReviews.length > 0
        ? productReviews.reduce((s, r) => s + r.rating, 0) / productReviews.length
        : 5.0;

      const updatedProducts = prev.products.map((p) => {
        if (p.id === review.productId) {
          return {
            ...p,
            rating: Number(avgRating.toFixed(1)),
            reviewsCount: productReviews.length,
          };
        }
        return p;
      });

      return {
        ...prev,
        reviews: remainingReviews,
        products: updatedProducts,
      };
    });

    addToast(
      language === 'ar' ? 'تم حذف التقييم' : 'Review deleted',
      '',
      'info'
    );
  };

  // Support System
  const createSupportTicket = (subject: string, message: string, orderNumber?: string): string => {
    const ticketId = `tkt-${Date.now()}`;
    const user = currentUser || {
      id: `guest-${Date.now()}`,
      name: 'عميل زائر',
      email: 'guest@qwader.jo',
      phone: '+962 7 9000 0000',
      role: 'customer' as UserRole,
      registeredAt: new Date().toISOString(),
    };

    const newTicket: SupportTicket = {
      id: ticketId,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userPhone: user.phone,
      subject,
      orderNumber,
      status: 'open',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    const firstMsg: SupportMessage = {
      id: `msg-${Date.now()}`,
      ticketId,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      recipientId: 'admin',
      message,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    setState((prev) => ({
      ...prev,
      supportTickets: [newTicket, ...prev.supportTickets],
      supportMessages: [...prev.supportMessages, firstMsg],
    }));

    addToast(
      language === 'ar' ? 'تم إرسال تذكرتك للدعم الفني 💬' : 'Support ticket submitted 💬',
      language === 'ar' ? 'سيقوم فريق قويدر بالرد عليك خلال دقائق' : 'Our team will respond shortly',
      'success'
    );

    return ticketId;
  };

  const sendSupportMessage = (ticketId: string, message: string) => {
    if (!message.trim()) return;

    const sender = currentUser || {
      id: 'guest-user',
      name: 'عميل زائر',
      role: 'customer' as UserRole,
    };

    const newMsg: SupportMessage = {
      id: `msg-${Date.now()}`,
      ticketId,
      senderId: sender.id,
      senderName: sender.name,
      senderRole: sender.role,
      message,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    setState((prev) => ({
      ...prev,
      supportMessages: [...prev.supportMessages, newMsg],
      supportTickets: prev.supportTickets.map((t) =>
        t.id === ticketId ? { ...t, lastActivity: new Date().toISOString() } : t
      ),
    }));
  };

  const updateTicketStatus = (ticketId: string, status: 'open' | 'closed' | 'resolved') => {
    setState((prev) => ({
      ...prev,
      supportTickets: prev.supportTickets.map((t) =>
        t.id === ticketId ? { ...t, status, lastActivity: new Date().toISOString() } : t
      ),
    }));
    addToast(
      language === 'ar' ? 'تم تحديث حالة التذكرة' : 'Ticket status updated',
      '',
      'info'
    );
  };

  // Settings
  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings },
    }));
    addToast(
      language === 'ar' ? 'تم حفظ إعدادات المتجر' : 'Settings saved',
      '',
      'success'
    );
  };

  // Backup & Restore
  const exportBackupJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `qwader_store_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addToast(
      language === 'ar' ? 'تم تصدير النسخة الاحتياطية بنجاح 💾' : 'Backup exported successfully 💾',
      'JSON file saved',
      'success'
    );
  };

  const importBackupJson = (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (!parsed.products || !parsed.settings) {
        return { success: false, error: 'الملف لا يحتوي على بنية بيانات متجر قويدر الصحيحة' };
      }
      setState(parsed);
      addToast(
        language === 'ar' ? 'تم استيراد النسخة الاحتياطية بنجاح 🔄' : 'Backup imported successfully 🔄',
        'All data restored',
        'success'
      );
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'خطأ في قراءة ملف الـ JSON' };
    }
  };

  const resetToFactoryDefaults = () => {
    setState(INITIAL_STATE);
    setCart([]);
    setWishlist(['prod-ea-fc25']);
    setCompareList([]);
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY_DB);
    localStorage.removeItem(STORAGE_KEY_SESSION);
    localStorage.removeItem(STORAGE_KEY_CART);
    localStorage.removeItem(STORAGE_KEY_WISHLIST);
    localStorage.removeItem(STORAGE_KEY_COMPARE);
    addToast(
      language === 'ar' ? 'تم إعادة ضبط المتجر بالكامل بنجاح 🔄' : 'Factory reset complete 🔄',
      language === 'ar' ? 'تمت استعادة كافة المنتجات والبيانات للوضع الأولي النظيف' : 'Restored clean initial state',
      'warning'
    );
  };

  // Notifications
  const markNotificationAsRead = (id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    }));
  };

  const markAllNotificationsAsRead = () => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
    }));
  };

  return (
    <StoreContext.Provider
      value={{
        state,
        currentUser,
        pendingTwoFactorUser,
        activeSensitiveChallenge,
        simulatedEmailMessage,
        isAdminSessionVerified,
        cart,
        wishlist,
        compareList,
        language,
        theme,
        currency,
        isCartOpen,
        currentRoute,
        toasts,
        appliedPromo,
        t,
        bestSellerProductIds,
        unreadNotificationsCount,
        navigateTo,
        login,
        completePasswordlessLogin,
        createCustomerAccount,
        signInCustomer,
        requestAdminLoginLink,
        completeAdminLoginFromLink,
        logout,
        updateUserRole,
        updateUserProfile,
        completeTwoFactorLogin,
        cancelTwoFactorLogin,
        resendTwoFactorLoginOTP,
        enableTwoFactor,
        disableTwoFactor,
        regenerateBackupCodes,
        requestSensitiveActionVerification,
        verifySensitiveActionCode,
        cancelSensitiveActionVerification,
        resendSensitiveActionCode,
        clearSimulatedEmailMessage,
        lockAdminSession,
        addPromoCode,
        togglePromoCode,
        deletePromoCode,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        setIsCartOpen,
        applyPromoCode,
        removePromoCode,
        toggleWishlist,
        isInWishlist,
        toggleCompare,
        isInCompare,
        removeFromCompare,
        clearCompare,
        createOrder,
        updateOrderStatus,
        addPaymentProofToOrder,
        addProduct,
        updateProduct,
        deleteProduct,
        updateProductStock,
        addReview,
        deleteReview,
        createSupportTicket,
        sendSupportMessage,
        updateTicketStatus,
        updateSettings,
        exportBackupJson,
        importBackupJson,
        resetToFactoryDefaults,
        exportDataJson: exportBackupJson,
        importDataJson: importBackupJson,
        resetToFactoryData: resetToFactoryDefaults,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        addToast,
        removeToast,
        setLanguage,
        setTheme,
        setCurrency,
        formatPrice,
        isOrdersLoading,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};


