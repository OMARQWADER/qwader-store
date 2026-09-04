import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  ReactNode,
} from "react";
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
  SimulatedEmailMessage,
} from "../types";
import { INITIAL_STATE } from "../data/initialData";
import { getT } from "../utils/translations";
import {
  verifyTOTPCode,
  generateBackupCodes,
  generateNumericOTP,
  playNotificationSound,
} from "../utils/twoFactor";
import { api } from "../lib/api";
import { normalizeProduct } from "../lib/productNormalize";

const STORAGE_KEY_SESSION = "qwader_store_auth_session";
const STORAGE_KEY_CART = "qwader_store_cart_v1";
const STORAGE_KEY_WISHLIST = "qwader_store_wishlist_v1";
const STORAGE_KEY_COMPARE = "qwader_store_compare_v1";
const STORAGE_KEY_LANG = "qwader_lang";
const STORAGE_KEY_THEME = "qwader_theme_mode";
const STORAGE_KEY_CURRENCY = "qwader_currency";
const STORAGE_KEY_STATE = "qwader_store_state_v1";

const readSavedStoreState = (): StoreState | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_STATE);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Partial<StoreState>;
    if (!parsed || typeof parsed !== "object") return null;

    return {
      ...INITIAL_STATE,
      ...parsed,
      settings: {
        ...INITIAL_STATE.settings,
        ...(parsed.settings || {}),
        fulfillment: {
          ...INITIAL_STATE.settings.fulfillment,
          ...((parsed.settings && parsed.settings.fulfillment) || {}),
        },
        socialLinks: {
          ...INITIAL_STATE.settings.socialLinks,
          ...((parsed.settings && parsed.settings.socialLinks) || {}),
        },
        branding: {
          ...INITIAL_STATE.settings.branding,
          ...((parsed.settings && parsed.settings.branding) || {}),
        },
      },
      products: Array.isArray(parsed.products) && parsed.products.length > 0
        ? parsed.products
        : INITIAL_STATE.products,
      orders: Array.isArray(parsed.orders) ? parsed.orders : INITIAL_STATE.orders,
      users: Array.isArray(parsed.users) ? parsed.users : INITIAL_STATE.users,
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : INITIAL_STATE.reviews,
      promoCodes: Array.isArray(parsed.promoCodes) ? parsed.promoCodes : INITIAL_STATE.promoCodes,
    };
  } catch (error) {
    console.error("Failed to load saved store state:", error);
    return null;
  }
};

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: "success" | "info" | "warning" | "error";
}

interface StoreContextType {
  state: StoreState;
  currentUser: User | null;
  pendingTwoFactorUser: User | null;
  activeSensitiveChallenge: SensitiveVerificationChallenge | null;
  simulatedEmailMessage: SimulatedEmailMessage | null;
  isAdminSessionVerified: boolean;
  cart: CartItem[];
  cartPromptProduct: Product | null;
  wishlist: string[];
  compareList: string[];
  language: Language;
  theme: ThemeMode;
  currency: Currency;
  isCartOpen: boolean;
  currentRoute: string;
  toasts: ToastMessage[];
  appliedPromo: {
    code: string;
    discountPercent?: number;
    discountFixedJOD?: number;
  } | null;
  t: ReturnType<typeof getT>;
  bestSellerProductIds: string[];
  unreadNotificationsCount: number;
  isOrdersLoading: boolean;

  navigateTo: (route: string) => void;
  login: (email: string) => Promise<{
    success: boolean;
    requires2FA?: boolean;
    method?: "authenticator" | "whatsapp" | "sms" | "email";
    error?: string;
  }>;
  completePasswordlessLogin: (
    email: string,
    code: string,
  ) => { success: boolean; requiresProfile?: boolean; error?: string };
  createCustomerAccount: (data: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    promotionalEmails: boolean;
    authUid?: string;
    avatar?: string;
    city?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  signInCustomer: (user: User) => void;
  requestAdminLoginLink: (
    email: string,
  ) => Promise<{ success: boolean; error?: string }>;
  completeAdminLoginFromLink: () => Promise<{
    success: boolean;
    error?: string;
  }>;
  logout: () => void;
  updateUserRole: (userId: string, newRole: UserRole, permissions?: string[]) => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  completeTwoFactorLogin: (code: string) => {
    success: boolean;
    error?: string;
  };
  cancelTwoFactorLogin: () => void;
  resendTwoFactorLoginOTP: () => { success: boolean; error?: string };
  enableTwoFactor: (
    method: "authenticator" | "whatsapp" | "sms" | "email",
    secret: string,
    code: string,
    expectedCode: string,
    backupCodes: string[],
    phone?: string,
  ) => { success: boolean; error?: string };
  disableTwoFactor: () => { success: boolean; error?: string };
  regenerateBackupCodes: () => {
    success: boolean;
    backupCodes?: string[];
    error?: string;
  };
  requestSensitiveActionVerification: (options: {
    actionType: SensitiveActionType;
    titleAr: string;
    titleEn: string;
    descriptionAr: string;
    descriptionEn: string;
    targetEmail?: string;
    targetPhone?: string;
    deliveryChannel?: "email" | "sms" | "whatsapp";
    metadata?: Record<string, any>;
    onSuccess: () => void;
  }) => void;
  verifySensitiveActionCode: (code: string) => {
    success: boolean;
    error?: string;
  };
  cancelSensitiveActionVerification: () => void;
  resendSensitiveActionCode: (channel?: "email" | "sms" | "whatsapp") => void;
  clearSimulatedEmailMessage: () => void;
  lockAdminSession: () => void;
  addPromoCode: (promo: {
    code: string;
    discountPercent?: number;
    discountFixedJOD?: number;
  }) => void;
  togglePromoCode: (code: string) => void;
  deletePromoCode: (code: string) => void;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setIsCartOpen: (open: boolean) => void;
  confirmOpenCart: () => void;
  continueShopping: () => void;
  applyPromoCode: (code: string) => { success: boolean; message: string };
  removePromoCode: () => void;
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  toggleCompare: (productId: string) => boolean;
  isInCompare: (productId: string) => boolean;
  removeFromCompare: (productId: string) => void;
  clearCompare: () => void;
  createOrder: (data: {
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    preferredDeliveryMethod: "whatsapp" | "email" | "both";
    fulfillmentType?: "pickup" | "delivery";
    deliveryContactChannel?: string;
    deliveryContactUrl?: string;
    shippingCountry?: string;
    shippingCity?: string;
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
  }) => Promise<Order>;
  updateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    noteAr?: string,
    noteEn?: string,
    digitalDeliveries?: Order["digitalDeliveries"],
    digitalKeys?: string[],
  ) => Promise<void>;
  addPaymentProofToOrder: (orderId: string, referenceNumber: string) => void;
  addProduct: (
    product: Omit<Product, "id" | "createdAt" | "rating" | "reviewsCount">,
  ) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  updateProductStock: (productId: string, newStock: number) => Promise<void>;
  addReview: (
    productId: string,
    rating: number,
    comment: string,
  ) => Promise<{ success: boolean; message?: string }>;
  deleteReview: (reviewId: string) => Promise<void>;
  createSupportTicket: (
    subject: string,
    messageOrCategory?: string,
    messageOrOrderNumber?: string,
    orderNumber?: string,
  ) => Promise<
    | string
    | { success: boolean; ticket?: SupportTicket; error?: string }
  >;
  addSupportMessage: (ticketId: string, message: string) => Promise<boolean>;
  sendSupportMessage: (ticketId: string, message: string) => Promise<boolean>;
  updateTicketStatus: (
    ticketId: string,
    status: "open" | "closed" | "resolved",
  ) => Promise<void>;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  exportBackupJson: () => void;
  importBackupJson: (jsonData: string) => { success: boolean; error?: string };
  exportDataJson: () => void;
  importDataJson: (jsonData: string) => { success: boolean; error?: string };
  resetToFactoryDefaults: () => void;
  resetToFactoryData: () => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  addToast: (
    title: string,
    message: string,
    type?: "success" | "info" | "warning" | "error",
  ) => void;
  removeToast: (id: string) => void;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: ThemeMode) => void;
  setCurrency: (curr: Currency) => void;
  formatPrice: (priceJOD: number, priceUSD?: number) => string;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<StoreState>(() => readSavedStoreState() || INITIAL_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(state));
    } catch (error) {
      console.error("Failed to persist store state:", error);
    }
  }, [state]);

  // Load data from API on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedState = readSavedStoreState();
        if (savedState) {
          setState(savedState);
          setLoading(false);
          return;
        }

        const [products, storeConfig, reviewsData] = await Promise.all([
          api.getProducts().catch(() => []),
          api.getStoreConfig().catch(() => ({})),
          api.getReviews().catch(() => []),
        ]);

        const mergedSettings = {
          ...INITIAL_STATE.settings,
          ...(storeConfig && typeof storeConfig === "object" ? storeConfig.settings || storeConfig : {}),
        };

        const mergedState = {
          ...INITIAL_STATE,
          settings: {
            ...INITIAL_STATE.settings,
            ...mergedSettings,
            fulfillment: {
              ...INITIAL_STATE.settings.fulfillment,
              ...(storeConfig && typeof storeConfig === "object" ? storeConfig.settings?.fulfillment || storeConfig.fulfillment || {} : {}),
            },
            socialLinks: {
              ...INITIAL_STATE.settings.socialLinks,
              ...(storeConfig && typeof storeConfig === "object" ? storeConfig.settings?.socialLinks || storeConfig.socialLinks || {} : {}),
            },
            branding: {
              ...INITIAL_STATE.settings.branding,
              ...(storeConfig && typeof storeConfig === "object" ? storeConfig.settings?.branding || storeConfig.branding || {} : {}),
            },
          },
          products: Array.isArray(products) && products.length > 0
            ? products.map(normalizeProduct)
            : INITIAL_STATE.products,
          orders: INITIAL_STATE.orders,
          users: INITIAL_STATE.users,
          reviews: Array.isArray(reviewsData) ? reviewsData : [],
          promoCodes:
            storeConfig && Array.isArray(storeConfig.promoCodes)
              ? storeConfig.promoCodes
              : INITIAL_STATE.promoCodes,
        };

        setState(mergedState);
      } catch (error) {
        console.error("Failed to load data from API:", error);
        setState((prev) => prev && prev !== INITIAL_STATE ? prev : { ...INITIAL_STATE, products: [], orders: [], users: [], reviews: [] });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Current Session User
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SESSION);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load session:", e);
    }
    return null;
  });
  const remoteListsReadyUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    api.syncUser(currentUser).then(async (response) => {
      const canonicalUser = response?.user || currentUser;
      if (
        canonicalUser.role !== currentUser.role ||
        JSON.stringify(canonicalUser.permissions || []) !== JSON.stringify(currentUser.permissions || [])
      ) {
        setCurrentUser(canonicalUser);
      }
      const hasAdminSession =
        currentUser.role === "owner" ||
        currentUser.role === "staff" ||
        canonicalUser.role === "owner" ||
        canonicalUser.role === "staff";
      if (hasAdminSession) {
        const results = await Promise.allSettled([
          api.getUsers(),
          api.getOrders(),
          api.getSupportTickets(),
        ]);
        const users = results[0].status === "fulfilled" ? results[0].value : null;
        const orders = results[1].status === "fulfilled" ? results[1].value : null;
        const supportTickets = results[2].status === "fulfilled" ? results[2].value : null;
        setState((prev) => ({
          ...prev,
          ...(users ? { users } : {}),
          ...(orders ? { orders } : {}),
          ...(supportTickets ? {
            supportTickets,
            supportMessages: supportTickets.flatMap((ticket: SupportTicket) => (ticket.messages || []).map((message) => ({ id: message.id, ticketId: ticket.id, senderId: message.senderId, senderName: message.senderName, senderRole: message.senderRole, message: message.text, timestamp: message.createdAt, isRead: true }))),
          } : {}),
        }));
        results.forEach((result, index) => {
          if (result.status === "rejected") console.error(`Failed to load admin resource ${index}:`, result.reason);
        });
        return;
      }

      const [userOrdersResult, supportTicketsResult] = await Promise.allSettled([
        api.getOrdersByUser(currentUser.id),
        api.getSupportTickets(),
      ]);
      const userOrders = userOrdersResult.status === "fulfilled" ? userOrdersResult.value : null;
      const supportTickets = supportTicketsResult.status === "fulfilled" ? supportTicketsResult.value : null;
      setState((prev) => {
        const otherOrders = prev.orders.filter((order) => order.userId !== currentUser.id);
        return {
          ...prev,
          ...(userOrders ? { orders: [...userOrders, ...otherOrders] } : {}),
          ...(supportTickets ? {
            supportTickets,
            supportMessages: supportTickets.flatMap((ticket: SupportTicket) => (ticket.messages || []).map((message) => ({ id: message.id, ticketId: ticket.id, senderId: message.senderId, senderName: message.senderName, senderRole: message.senderRole, message: message.text, timestamp: message.createdAt, isRead: true }))),
          } : {}),
        };
      });
    }).catch((error) => {
      console.error("Failed to reload authenticated data:", error);
    });
  }, [currentUser]);

  // Cart
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CART);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load cart:", e);
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
      console.error("Failed to load wishlist:", e);
    }
    return [];
  });

  useEffect(() => {
    const userId = currentUser?.id;
    if (!userId) {
      remoteListsReadyUserId.current = null;
      return;
    }
    if (remoteListsReadyUserId.current === userId) return;

    let cancelled = false;
    const loadRemoteLists = async () => {
      const [remoteCartResult, remoteWishlistResult] = await Promise.allSettled([
        api.getCart(userId),
        api.getWishlist(userId),
      ]);
      if (cancelled) return;

      const remoteCart = remoteCartResult.status === "fulfilled" && Array.isArray(remoteCartResult.value?.items)
        ? remoteCartResult.value.items
        : null;
      const remoteWishlist = remoteWishlistResult.status === "fulfilled" && Array.isArray(remoteWishlistResult.value?.product_ids)
        ? remoteWishlistResult.value.product_ids
        : null;

      if (remoteCart && remoteCart.length > 0) {
        setCart(remoteCart);
      } else if (cart.length > 0) {
        api.updateCart(userId, cart).catch(console.error);
      }
      if (remoteWishlist && remoteWishlist.length > 0) {
        setWishlist(remoteWishlist);
      } else if (wishlist.length > 0) {
        api.updateWishlist(userId, wishlist).catch(console.error);
      }
      remoteListsReadyUserId.current = userId;
    };

    void loadRemoteLists();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  // Compare List
  const [compareList, setCompareList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COMPARE);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load compare:", e);
    }
    return [];
  });

  // Language & Theme & Currency
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LANG);
    return saved === "en" || saved === "ar" ? saved : "ar";
  });

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    return saved === "light" || saved === "dark" ? saved : "dark";
  });

  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CURRENCY);
    return saved === "USD" || saved === "JOD" ? saved : "JOD";
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartPromptProduct, setCartPromptProduct] = useState<Product | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountPercent?: number;
    discountFixedJOD?: number;
  } | null>(null);
  const [pendingTwoFactorUser, setPendingTwoFactorUser] = useState<User | null>(
    null,
  );
  const [activeSensitiveChallenge, setActiveSensitiveChallenge] =
    useState<SensitiveVerificationChallenge | null>(null);
  const [simulatedEmailMessage, setSimulatedEmailMessage] =
    useState<SimulatedEmailMessage | null>(null);
  const [adminVerifiedUntil, setAdminVerifiedUntil] = useState<number>(0);
  const [pendingPasswordlessOTP, setPendingPasswordlessOTP] = useState<{
    email: string;
    code: string;
    expiresAt: number;
  } | null>(null);
  const [pending2FALoginOTP, setPending2FALoginOTP] = useState<string | null>(
    null,
  );
  const [isOrdersLoading, setIsOrdersLoading] = useState<boolean>(false);
  const storeConfigSaveTimer = useRef<number | null>(null);

  const isAdminSessionVerified = useMemo(() => {
    if (
      currentUser &&
      (currentUser.role === "owner" || currentUser.role === "staff")
    ) {
      return true;
    }
    return Date.now() < adminVerifiedUntil;
  }, [currentUser, adminVerifiedUntil]);

  // Keep the existing internal route format while using clean browser URLs.
  const getRouteFromLocation = () => {
    const hashRoute = window.location.hash.replace(/^#/, "");
    if (hashRoute) return `#${hashRoute}`;

    const path = `${window.location.pathname}${window.location.search}`.replace(
      /^\/+/,
      "",
    );
    return path ? `#${path}` : "#home";
  };

  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return getRouteFromLocation();
  });

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentRoute(getRouteFromLocation());
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("hashchange", handleLocationChange);
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("hashchange", handleLocationChange);
    };
  }, []);

  const navigateTo = (route: string) => {
    setIsCartOpen(false);
    const cleanRoute = route.replace(/^#/, "");
    const targetPath = cleanRoute === "home" ? "/" : `/${cleanRoute}`;
    window.history.pushState({}, "", targetPath);
    setCurrentRoute(`#${cleanRoute || "home"}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(cart));
      if (currentUser?.id && remoteListsReadyUserId.current === currentUser.id) {
        api.updateCart(currentUser.id, cart).catch(console.error);
      }
    } catch (e) {
      console.error("Failed to save cart:", e);
    }
  }, [cart, currentUser]);

  // Sync wishlist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_WISHLIST, JSON.stringify(wishlist));
      if (currentUser?.id && remoteListsReadyUserId.current === currentUser.id) {
        api.updateWishlist(currentUser.id, wishlist).catch(console.error);
      }
    } catch (e) {
      console.error("Failed to save wishlist:", e);
    }
  }, [wishlist, currentUser]);

  // Sync compare
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COMPARE, JSON.stringify(compareList));
    } catch (e) {
      console.error("Failed to save compare list:", e);
    }
  }, [compareList]);

  // Sync session
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEY_SESSION);
      }
    } catch (e) {
      console.error("Failed to save session:", e);
    }
  }, [currentUser]);

  // Sync Language & RTL/LTR
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY_LANG, lang);
    } catch (e) {
      console.error("Failed to persist language:", e);
    }
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    try {
      localStorage.setItem(STORAGE_KEY_LANG, language);
    } catch (e) {
      console.error("Failed to sync language:", e);
    }
  }, [language]);

  // Sync Theme
  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY_THEME, newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.classList.remove("light-theme", "light-mode");
      document.body.classList.add("dark-theme", "dark-mode");
      document.body.style.backgroundColor = "#020617";
      document.body.style.color = "#f8fafc";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      document.body.classList.remove("dark-theme", "dark-mode");
      document.body.classList.add("light-theme", "light-mode");
      document.body.style.backgroundColor = "#f8fafc";
      document.body.style.color = "#0f172a";
    }
  };

  useEffect(() => {
    setTheme(theme);
  }, [theme]);

  const setCurrency = (curr: Currency) => {
    setCurrencyState(curr);
    try {
      localStorage.setItem(STORAGE_KEY_CURRENCY, curr);
    } catch (e) {
      console.error("Failed to persist currency:", e);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CURRENCY, currency);
    } catch (e) {
      console.error("Failed to sync currency:", e);
    }
  }, [currency]);

  // Toast System
  const addToast = (
    title: string,
    message: string,
    type: "success" | "info" | "warning" | "error" = "info",
  ) => {
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
    const safePriceJOD = Number(priceJOD) || 0;
    if (currency === "USD") {
      const val =
        Number(priceUSD) || safePriceJOD * state.settings.usdExchangeRate;
      return `$${val.toFixed(2)}`;
    }
    return `${safePriceJOD.toFixed(2)} ${t.jordanianCurrency}`;
  };

  // ============================================
  // 🔥 FIXED: bestSellerProductIds with full protection
  // ============================================
  const bestSellerProductIds = useMemo(() => {
    const countMap: Record<string, number> = {};

    // ✅ Safe array handling - prevents "forEach is not a function" error
    const orders = Array.isArray(state.orders) ? state.orders : [];

    orders.forEach((order) => {
      if (!order || typeof order !== "object") return;
      const items = order.items || [];
      if (!Array.isArray(items)) return;
      items.forEach((item) => {
        if (item?.productId) {
          countMap[item.productId] =
            (countMap[item.productId] || 0) + (item.quantity || 0);
        }
      });
    });

    // Add baseline counts so initial products shine
    countMap["prod-ea-fc25"] = (countMap["prod-ea-fc25"] || 0) + 42;
    countMap["prod-psplus-deluxe-12m"] =
      (countMap["prod-psplus-deluxe-12m"] || 0) + 36;
    countMap["prod-psn-50-us"] = (countMap["prod-psn-50-us"] || 0) + 29;
    countMap["prod-steam-50-global"] =
      (countMap["prod-steam-50-global"] || 0) + 25;
    countMap["prod-wukong"] = (countMap["prod-wukong"] || 0) + 18;

    return Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
  }, [state.orders]);

  // ============================================
  // 🔥 FIXED: unreadNotificationsCount with full protection
  // ============================================
  const unreadNotificationsCount = useMemo(() => {
    // ✅ Safe array handling
    const notifications = state.notifications || [];
    if (!Array.isArray(notifications)) return 0;

    return notifications.filter(
      (n) => !n.isRead && (n.userId === "all" || n.userId === currentUser?.id),
    ).length;
  }, [state.notifications, currentUser]);

  // Auth Methods
  const requestPasswordlessOTP = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return {
        success: false,
        error:
          language === "ar"
            ? "يرجى إدخال البريد الإلكتروني"
            : "Please enter your email",
      };
    }

    const code = generateNumericOTP(6);
    const expiresAt = Date.now() + 10 * 60 * 1000;
    setPendingPasswordlessOTP({ email: cleanEmail, code, expiresAt });

    addToast(
      language === "ar" ? "تم إرسال رمز التحقق" : "Verification code sent",
      language === "ar"
        ? `تفقد بريدك الإلكتروني: ${cleanEmail}`
        : `Check your inbox at ${cleanEmail}`,
      "info",
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
    if (
      !challenge ||
      challenge.email !== cleanEmail ||
      challenge.code !== code.trim() ||
      Date.now() > challenge.expiresAt
    ) {
      return {
        success: false,
        error:
          language === "ar"
            ? "رمز التحقق غير صحيح أو انتهت صلاحيته"
            : "Invalid or expired verification code",
      };
    }

    const existingUser = state.users.find(
      (candidate) => candidate.email.toLowerCase() === cleanEmail,
    );
    setPendingPasswordlessOTP(null);
    if (!existingUser) {
      return { success: true, requiresProfile: true };
    }
    signInCustomer(existingUser);
    return { success: true };
  };

  const signInCustomer = (user: User) => {
    setCurrentUser(user);
    addToast(
      language === "ar" ? "تم تسجيل الدخول بنجاح" : "Signed in successfully",
      language === "ar" ? `أهلاً بك ${user.name}` : `Welcome ${user.name}`,
      "success",
    );
  };

  const createCustomerAccount = async (data: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    promotionalEmails: boolean;
    authUid?: string;
    avatar?: string;
    city?: string;
  }) => {
    const cleanEmail = data.email.trim().toLowerCase();
    const firstName = data.firstName.trim();
    const lastName = data.lastName.trim();
    const phone = data.phone.trim();
    if (!firstName || !lastName) {
      return {
        success: false,
        error:
          language === "ar"
            ? "يرجى تعبئة جميع الحقول المطلوبة"
            : "Please complete all required fields",
      };
    }
    const existingUser = state.users.find(
      (candidate) => candidate.email.toLowerCase() === cleanEmail,
    );
    if (existingUser) {
      signInCustomer(existingUser);
      return { success: true };
    }
    const newUser: User = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: `${firstName} ${lastName}`,
      email: cleanEmail,
      phone,
      role: "customer",
      authUid: data.authUid,
      avatar: data.avatar,
      city: data.city,
      registeredAt: new Date().toISOString(),
      twoFactorEnabled: false,
      promotionalEmails: data.promotionalEmails,
    };
    try {
      const response = await api.syncUser(newUser);
      const syncedUser: User = {
        ...newUser,
        ...(response?.user || {}),
        registeredAt:
          response?.user?.registeredAt ||
          response?.user?.registered_at ||
          newUser.registeredAt,
      };
      setState((prev) => ({
        ...prev,
        users: [
          ...prev.users.filter(
            (candidate) => candidate.email.toLowerCase() !== cleanEmail,
          ),
          syncedUser,
        ],
      }));
      signInCustomer(syncedUser);
      return { success: true };
    } catch (error) {
      console.error("Failed to sync user with database:", error);
      setState((prev) => ({
        ...prev,
        users: [
          ...prev.users.filter(
            (candidate) => candidate.email.toLowerCase() !== cleanEmail,
          ),
          newUser,
        ],
      }));
      signInCustomer(newUser);
      addToast(
        language === "ar"
          ? "تم إنشاء الحساب محلياً"
          : "Account created locally",
        language === "ar"
          ? "تعذر حفظ الحساب في قاعدة البيانات حالياً"
          : "The account could not be saved to the database yet",
        "warning",
      );
      return { success: true };
    }
  };

  const requestAdminLoginLink = async (_email: string) => {
    return {
      success: false,
      error:
        language === "ar"
          ? "تم إلغاء تسجيل الدخول الإداري في الوضع المحلي"
          : "Admin sign-in is disabled in local-only mode",
    };
  };

  const completeAdminLoginFromLink = async () => {
    return {
      success: false,
      error:
        language === "ar"
          ? "تم إلغاء تسجيل الدخول الإداري في الوضع المحلي"
          : "Admin sign-in is disabled in local-only mode",
    };
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!currentUser) return;
    const updatedUser: User = {
      ...currentUser,
      ...data,
    };

    try {
      const response = await api.updateUser(currentUser.id, {
        name: updatedUser.name,
        phone: updatedUser.phone,
        promotional_emails: updatedUser.promotionalEmails,
      });
      const savedUser: User = {
        ...updatedUser,
        ...(response || {}),
      };
      setState((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === currentUser.id ? savedUser : u)),
      }));

      setCurrentUser(savedUser);
      addToast(
        language === "ar" ? "تم تحديث الملف الشخصي" : "Profile Updated",
        language === "ar"
          ? "تم حفظ التغييرات بنجاح"
          : "Your changes have been saved",
        "success",
      );
    } catch (error) {
      console.error("Failed to persist user profile:", error);
      addToast(
        language === "ar" ? "تعذر حفظ الملف الشخصي" : "Profile update failed",
        language === "ar"
          ? "لم يتم حفظ التغييرات في قاعدة البيانات"
          : "The changes were not saved to the database",
        "error",
      );
    }
  };

  const logout = () => {
    setCurrentUser(null);
    addToast(
      language === "ar" ? "تم تسجيل الخروج" : "Signed out",
      language === "ar"
        ? "نتشرف بزيارتك القادمة دائماً يا غالي"
        : "See you next time!",
      "info",
    );
  };

  const updateUserRole = async (userId: string, newRole: UserRole, permissions: string[] = []) => {
    try {
      const response = await api.updateUserRole(userId, newRole, permissions);
      const savedRole = response?.role || newRole;
      setState((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === userId ? { ...u, role: savedRole, permissions: response?.permissions || permissions } : u,
        ),
      }));
      if (currentUser?.id === userId) {
        setCurrentUser((prev) => (prev ? { ...prev, role: savedRole, permissions: response?.permissions || permissions } : null));
      }
      addToast(
        language === "ar" ? "تحديث الصلاحية" : "Role Updated",
        language === "ar"
          ? `تم تغيير صلاحية المستخدم بنجاح`
          : `User role changed to ${savedRole}`,
        "success",
      );
    } catch (error) {
      console.error("Failed to persist user role:", error);
      addToast(
        language === "ar" ? "تعذر تحديث الصلاحية" : "Role update failed",
        language === "ar"
          ? "لم يتم حفظ التغيير في قاعدة البيانات"
          : "The change was not saved to the database",
        "error",
      );
    }
  };

  // 2FA Methods
  const completeTwoFactorLogin = (code: string) => {
    if (!pendingTwoFactorUser) {
      return {
        success: false,
        error:
          language === "ar"
            ? "لا يوجد جلسة تحقق معلقة"
            : "No pending 2FA session",
      };
    }

    const user = pendingTwoFactorUser;
    const cleanCode = code.trim().toUpperCase();

    if (
      user.twoFactorBackupCodes &&
      user.twoFactorBackupCodes.includes(cleanCode)
    ) {
      const remainingCodes = user.twoFactorBackupCodes.filter(
        (c) => c !== cleanCode,
      );
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
        language === "ar"
          ? "تم الدخول برمز الاسترداد 🛡️"
          : "Backup code used 🛡️",
        language === "ar"
          ? `تبقى لديك ${remainingCodes.length} من رموز الطوارئ`
          : `${remainingCodes.length} backup codes remaining`,
        "warning",
      );
      return { success: true };
    }

    const isEmailOrDirectMatch =
      pending2FALoginOTP && cleanCode === pending2FALoginOTP;
    const isTOTPValid = user.twoFactorSecret
      ? verifyTOTPCode(user.twoFactorSecret, cleanCode)
      : false;
    if (isEmailOrDirectMatch || isTOTPValid) {
      setCurrentUser(user);
      setPendingTwoFactorUser(null);
      setPending2FALoginOTP(null);
      setSimulatedEmailMessage(null);
      addToast(
        language === "ar" ? "تم التحقق بخطوتين بنجاح 🛡️" : "2FA Verified 🛡️",
        language === "ar"
          ? `أهلاً بك مجدداً، ${user.name}`
          : `Welcome back, ${user.name}`,
        "success",
      );
      return { success: true };
    }

    return {
      success: false,
      error:
        language === "ar"
          ? "رمز التحقق غير صحيح أو انتهت صلاحيته"
          : "Invalid or expired verification code",
    };
  };

  const cancelTwoFactorLogin = () => {
    setPendingTwoFactorUser(null);
    setPending2FALoginOTP(null);
    setSimulatedEmailMessage(null);
  };

  const resendTwoFactorLoginOTP = () => {
    if (!pendingTwoFactorUser) {
      return { success: false, error: "No pending 2FA" };
    }

    const otpCode = generateNumericOTP(6);
    setPending2FALoginOTP(otpCode);

    const targetChannel =
      pendingTwoFactorUser.twoFactorMethod === "whatsapp"
        ? "whatsapp"
        : pendingTwoFactorUser.twoFactorMethod === "sms"
          ? "sms"
          : "email";

    const emailMsg: SimulatedEmailMessage = {
      id: `sim-2fa-${Date.now()}`,
      toEmail: pendingTwoFactorUser.email,
      subjectAr: `🛡️ رمز التحقق الجديد لتسجيل الدخول`,
      subjectEn: `🛡️ New Two-Factor Login Code`,
      code: "",
      actionNameAr: "تسجيل الدخول بالتحقق بخطوتين",
      actionNameEn: "2FA Login Verification",
      timestamp: new Date().toLocaleTimeString(
        language === "ar" ? "ar-JO" : "en-US",
      ),
      expiresInSeconds: 300,
      channel: targetChannel,
    };
    setSimulatedEmailMessage(emailMsg);
    playNotificationSound();


    addToast(
      language === "ar" ? "تم إرسال رمز أمان جديد 🔄" : "New code sent 🔄",
      language === "ar"
        ? "تم إرسال رمز التحقق الجديد إلى بريدك الإلكتروني."
        : `A new verification code has been sent to ${pendingTwoFactorUser.email}.`,
      "info",
    );
    return { success: true };
  };

  const enableTwoFactor = (
    method: "authenticator" | "whatsapp" | "sms" | "email",
    secret: string,
    code: string,
    expectedCode: string,
    backupCodes: string[],
    phone?: string,
  ) => {
    if (!currentUser) {
      return { success: false, error: "User must be logged in" };
    }

    const cleanCode = code.trim();
    const cleanExpectedCode = expectedCode.trim();
    if (method !== "authenticator" && !cleanExpectedCode) {
      return {
        success: false,
        error:
          language === "ar"
            ? "تعذر التحقق: لم يتم إنشاء رمز أمان صالح"
            : "Verification failed: no valid security code was generated",
      };
    }

    const isValid =
      method === "authenticator"
        ? verifyTOTPCode(secret, cleanCode)
        : cleanCode === cleanExpectedCode;
    if (!isValid) {
      return {
        success: false,
        error:
          language === "ar"
            ? "رمز التحقق غير صحيح. تأكد من إدخال الرمز المكون من 6 أرقام"
            : "Invalid code",
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
          action: "تفعيل التحقق بخطوتين 2FA",
          details: `تم تفعيل 2FA بطريقة ${method === "authenticator" ? "تطبيق المصادقة" : method === "email" ? "البريد الإلكتروني" : "الواتساب"}`,
          timestamp: new Date().toISOString(),
        },
        ...prev.activityLogs,
      ],
    }));

    setCurrentUser(updatedUser);
    addToast(
      language === "ar" ? "تم تفعيل التحقق بخطوتين 🛡️" : "2FA Enabled 🛡️",
      language === "ar"
        ? "حسابك الآن مؤمن بأعلى معايير الحماية"
        : "Your account is now fully protected",
      "success",
    );
    return { success: true };
  };

  const disableTwoFactor = () => {
    if (!currentUser) return { success: false, error: "Not logged in" };

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
          action: "تعطيل التحقق بخطوتين 2FA",
          details: `تم إيقاف تفعيل 2FA للحساب`,
          timestamp: new Date().toISOString(),
        },
        ...prev.activityLogs,
      ],
    }));

    setCurrentUser(updatedUser);
    addToast(
      language === "ar" ? "تم إيقاف التحقق بخطوتين" : "2FA Disabled",
      language === "ar"
        ? "تم تعطيل التحقق بخطوتين لحسابك"
        : "2FA has been disabled for your account",
      "info",
    );
    return { success: true };
  };

  const regenerateBackupCodes = () => {
    if (!currentUser || !currentUser.twoFactorEnabled) {
      return { success: false, error: "2FA is not enabled" };
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
      language === "ar" ? "رموز استرداد جديدة 🔑" : "New Backup Codes 🔑",
      language === "ar"
        ? "تم إنشاء 8 رموز طوارئ احتياطية جديدة بنجاح"
        : "Generated 8 new backup codes",
      "success",
    );
    return { success: true, backupCodes: newCodes };
  };

  // Sensitive Action Verification
  const requestSensitiveActionVerification = (options: {
    actionType: SensitiveActionType;
    titleAr: string;
    titleEn: string;
    descriptionAr: string;
    descriptionEn: string;
    targetEmail?: string;
    targetPhone?: string;
    deliveryChannel?: "email" | "sms" | "whatsapp";
    metadata?: Record<string, any>;
    onSuccess: () => void;
  }) => {
    const code = generateNumericOTP(6);
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const targetEmail = options.targetEmail || currentUser?.email || "gmail";
    const targetPhone =
      options.targetPhone || currentUser?.phone || "+962 7 9000 0000";
    const channel = options.deliveryChannel || "email";

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

    const emailMsg: SimulatedEmailMessage = {
      id: `sim-mail-${Date.now()}`,
      toEmail: targetEmail,
      subjectAr: `رمز التحقق بخطوتين لتأكيد: ${options.titleAr}`,
      subjectEn: `Security Verification Code for: ${options.titleEn}`,
      code: "",
      actionNameAr: options.titleAr,
      actionNameEn: options.titleEn,
      timestamp: new Date().toLocaleTimeString(
        language === "ar" ? "ar-JO" : "en-US",
      ),
      expiresInSeconds: 300,
      channel,
    };
    setSimulatedEmailMessage(emailMsg);


    playNotificationSound();

    const notifItem: NotificationItem = {
      id: `notif-sec-${Date.now()}`,
      userId: currentUser?.id || "all",
      titleAr: "رمز أمان جديد",
      titleEn: "Security OTP",
      messageAr: `تم إرسال رمز التحقق بخطوتين لتأكيد ${options.titleAr}. صالح لمدة 5 دقائق.`,
      messageEn: `Two-step verification code sent for ${options.titleEn}. Valid for 5 minutes.`,
      type: "system",
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      notifications: [notifItem, ...prev.notifications],
    }));

    addToast(
      language === "ar"
        ? "تم إرسال رمز التحقق الأمني 📧"
        : "Security OTP Sent 📧",
      language === "ar"
        ? `تم إرسال كود التحقق (6 أرقام) إلى بريدك المسجل (${targetEmail})`
        : `6-digit verification code sent to ${targetEmail}`,
      "info",
    );
  };

  const verifySensitiveActionCode = (enteredCode: string) => {
    if (!activeSensitiveChallenge) {
      return {
        success: false,
        error:
          language === "ar"
            ? "لا يوجد طلب تحقق معلق"
            : "No active verification challenge",
      };
    }

    const clean = enteredCode.trim().replace(/\s+/g, "");
    if (Date.now() > activeSensitiveChallenge.expiresAt) {
      return {
        success: false,
        error:
          language === "ar"
            ? "انتهت صلاحية الرمز، يرجى طلب رمز جديد"
            : "Code has expired, please resend",
      };
    }

    const isMatch = clean === activeSensitiveChallenge.code;
    if (!isMatch) {
      return {
        success: false,
        error:
          language === "ar"
            ? "رمز التحقق غير صحيح، يرجى التأكد والمحاولة ثانية"
            : "Invalid verification code",
      };
    }

    if (activeSensitiveChallenge.actionType === "admin_access") {
      setAdminVerifiedUntil(Date.now() + 30 * 60 * 1000);
    }

    const callback = activeSensitiveChallenge.onSuccess;
    setActiveSensitiveChallenge(null);
    setSimulatedEmailMessage(null);

    if (callback) {
      callback();
    }

    addToast(
      language === "ar" ? "تم التحقق بنجاح 🛡️" : "Verified Successfully 🛡️",
      language === "ar"
        ? "تم تأكيد الإجراء الحساس بنجاح"
        : "Sensitive action confirmed",
      "success",
    );

    return { success: true };
  };

  const cancelSensitiveActionVerification = () => {
    setActiveSensitiveChallenge(null);
    setSimulatedEmailMessage(null);
  };

  const resendSensitiveActionCode = (
    channel?: "email" | "sms" | "whatsapp",
  ) => {
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
      code: "",
      actionNameAr: updated.titleAr,
      actionNameEn: updated.titleEn,
      timestamp: new Date().toLocaleTimeString(
        language === "ar" ? "ar-JO" : "en-US",
      ),
      expiresInSeconds: 300,
      channel: targetChannel,
    };
    setSimulatedEmailMessage(emailMsg);
    playNotificationSound();


    addToast(
      language === "ar" ? "تم إرسال رمز جديد 🔄" : "New Code Sent 🔄",
      language === "ar"
        ? "تم إرسال رمز التحقق الجديد إلى بريدك الإلكتروني."
        : `A new verification code has been sent to ${updated.targetEmail}.`,
      "info",
    );
  };

  const clearSimulatedEmailMessage = () => {
    setSimulatedEmailMessage(null);
  };

  const lockAdminSession = () => {
    setAdminVerifiedUntil(0);
    addToast(
      language === "ar" ? "تم قفل جلسة الإدارة 🔒" : "Admin Session Locked 🔒",
      language === "ar"
        ? "يتطلب الدخول مجدداً التحقق بالرمز المكون من 6 أرقام"
        : "Re-entry requires 6-digit verification code",
      "info",
    );
  };

  // Promo Codes
  const persistStoreConfig = (settings: StoreSettings, promoCodes: StoreState["promoCodes"]) => {
    if (storeConfigSaveTimer.current !== null) {
      window.clearTimeout(storeConfigSaveTimer.current);
    }
    storeConfigSaveTimer.current = window.setTimeout(() => {
      api.saveStoreConfig({ settings, promoCodes }).catch((error) => {
        console.error("Failed to persist store configuration:", error);
      });
    }, 350);
  };

  const addPromoCode = (promo: {
    code: string;
    discountPercent?: number;
    discountFixedJOD?: number;
  }) => {
    const cleanCode = promo.code.trim().toUpperCase();
    if (!cleanCode) return;
    setState((prev) => {
      const promoCodes = [
        ...prev.promoCodes.filter((p) => p.code.toUpperCase() !== cleanCode),
        {
          code: cleanCode,
          discountPercent: promo.discountPercent,
          discountFixedJOD: promo.discountFixedJOD,
          active: true,
        },
      ];
      persistStoreConfig(prev.settings, promoCodes);
      return { ...prev, promoCodes };
    });
    addToast(
      language === "ar" ? "تمت إضافة كود الخصم 🏷️" : "Promo Code Added 🏷️",
      language === "ar"
        ? `الكود ${cleanCode} جاهز للاستخدام الآن`
        : `Promo code ${cleanCode} is now active`,
      "success",
    );
  };

  const togglePromoCode = (code: string) => {
    setState((prev) => {
      const promoCodes = prev.promoCodes.map((p) =>
        p.code.toUpperCase() === code.toUpperCase()
          ? { ...p, active: !p.active }
          : p,
      );
      persistStoreConfig(prev.settings, promoCodes);
      return { ...prev, promoCodes };
    });
  };

  const deletePromoCode = (code: string) => {
    setState((prev) => {
      const promoCodes = prev.promoCodes.filter(
        (p) => p.code.toUpperCase() !== code.toUpperCase(),
      );
      persistStoreConfig(prev.settings, promoCodes);
      return { ...prev, promoCodes };
    });
    if (appliedPromo?.code.toUpperCase() === code.toUpperCase()) {
      setAppliedPromo(null);
    }
    addToast(
      language === "ar" ? "تم حذف كود الخصم" : "Promo Code Deleted",
      language === "ar"
        ? `تم حذف الكود ${code} من النظام`
        : `Promo code ${code} was removed`,
      "info",
    );
  };

  // Cart Management
  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + quantity;
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item,
        );
      }
      return [
        ...prev,
        { product, quantity },
      ];
    });

    addToast(
      language === "ar" ? "أُضيف إلى السلة 🛒" : "Added to cart 🛒",
      language === "ar"
        ? `تمت إضافة "${product.nameAr}" إلى سلتك`
        : `Added ${product.nameEn} to your cart`,
      "success",
    );
    setCartPromptProduct(product);
  };

  const confirmOpenCart = () => {
    setCartPromptProduct(null);
    setIsCartOpen(true);
  };

  const continueShopping = () => {
    setCartPromptProduct(null);
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
          return { ...item, quantity };
        }
        return item;
      }),
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedPromo(null);
  };

  const applyPromoCode = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const found = state.promoCodes.find(
      (p) => p.code.toUpperCase() === cleanCode && p.active,
    );
    if (found) {
      setAppliedPromo(found);
      addToast(
        language === "ar" ? "تم تطبيق كود الخصم! 🎉" : "Promo code applied! 🎉",
        language === "ar"
          ? `حصلت على ${found.discountPercent ? `${found.discountPercent}% خصم` : `${found.discountFixedJOD} د.أ خصم`}`
          : `You received ${found.discountPercent ? `${found.discountPercent}% discount` : `${found.discountFixedJOD} JOD discount`}`,
        "success",
      );
      return { success: true, message: "Applied successfully" };
    }
    return {
      success: false,
      message:
        language === "ar"
          ? "كود الخصم غير صالح أو منتهي الصلاحية"
          : "Invalid or expired promo code",
    };
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
  };

  // Wishlist
  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        addToast(
          language === "ar"
            ? "تمت الإزالة من المفضلة"
            : "Removed from wishlist",
          language === "ar"
            ? "تمت إزالة المنتج من قائمة أمنياتك"
            : "Removed from wishlist",
          "info",
        );
        return prev.filter((id) => id !== productId);
      } else {
        addToast(
          language === "ar" ? "أُضيف إلى المفضلة ❤️" : "Added to wishlist ❤️",
          language === "ar"
            ? "يمكنك الوصول له بأي وقت من صفحة المفضلة"
            : "Saved to your wishlist",
          "success",
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
          language === "ar"
            ? "حد المقارنة أقصى 4 منتجات"
            : "Comparison limit is 4 items",
          language === "ar"
            ? "يرجى إزالة منتج أولاً لإضافة منتج آخر"
            : "Remove an item first to add a new one",
          "warning",
        );
        return false;
      }
      setCompareList((prev) => [...prev, productId]);
      addToast(
        language === "ar" ? "أُضيف للمقارنة ⚖️" : "Added to compare ⚖️",
        language === "ar"
          ? "يمكنك رؤية المواصفات جنباً إلى جنب في صفحة المقارنة"
          : "Compare side by side in Compare page",
        "info",
      );
      return true;
    }
  };

  const isInCompare = (productId: string) => compareList.includes(productId);
  const removeFromCompare = (productId: string) =>
    setCompareList((prev) => prev.filter((id) => id !== productId));
  const clearCompare = () => setCompareList([]);

  // ============================================
  // 🔥 FIXED: createOrder with safe array handling
  // ============================================
  const createOrder = async (data: {
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    preferredDeliveryMethod: "whatsapp" | "email" | "both";
    fulfillmentType?: "pickup" | "delivery";
    deliveryContactChannel?: string;
    deliveryContactUrl?: string;
    shippingCountry?: string;
    shippingCity?: string;
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
  }): Promise<Order> => {
    if (data.fulfillmentType === "delivery" && data.deliveryContactChannel && data.paymentMethod === "cash_pickup") {
      throw new Error(
        language === "ar"
          ? "الدفع عند الاستلام غير متاح للطلبات الرقمية أو عن بُعد."
          : "Cash on delivery is unavailable for digital or remote orders.",
      );
    }

    const subtotalJOD = cart.reduce(
      (acc, item) => acc + item.product.priceJOD * item.quantity,
      0,
    );
    const subtotalUSD = cart.reduce(
      (acc, item) => acc + item.product.priceUSD * item.quantity,
      0,
    );

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
    const shippingCostUSD =
      data.shippingCostUSD !== undefined
        ? data.shippingCostUSD
        : shippingCostJOD * state.settings.usdExchangeRate;

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

    try {
      const newOrder = await api.createOrder({
        user_id: currentUser ? currentUser.id : `guest-${Date.now()}`,
        order_number: orderNumber,
        items: orderItems,
        subtotal_jod: subtotalJOD,
        subtotal_usd: subtotalUSD,
        discount_jod: discountJOD,
        discount_usd: discountUSD,
        shipping_cost_jod: shippingCostJOD,
        shipping_cost_usd: shippingCostUSD,
        total_jod: totalJOD,
        total_usd: totalUSD,
        payment_method: data.paymentMethod,
        status: "pending_payment",
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        customer_email: data.customerEmail,
        fulfillment_type: data.fulfillmentType || "pickup",
        delivery_contact_channel: data.deliveryContactChannel || "",
        delivery_contact_url: data.deliveryContactUrl || "",
        shipping_country: data.shippingCountry || "",
        shipping_city: data.shippingCity || "",
        shipping_governorate: data.shippingGovernorate || "",
        shipping_address: data.shippingAddress || "",
        shipping_notes: data.shippingNotes || "",
      });

      setState((prev) => {
        const currentOrders = Array.isArray(prev.orders) ? prev.orders : [];
        const staffNotifications = prev.users
          .filter((user) => user.role === "owner" || user.role === "staff")
          .map((user) => ({
            id: `notif-admin-order-${newOrder.id}-${user.id}`,
            userId: user.id,
            titleAr: `طلب جديد #${orderNumber}`,
            titleEn: `New order #${orderNumber}`,
            messageAr: `تم استلام طلب جديد بقيمة ${totalJOD.toFixed(2)} د.أ`,
            messageEn: `A new order worth ${totalJOD.toFixed(2)} JOD was received`,
            type: "order" as const,
            linkHash: "#admin",
            isRead: false,
            createdAt: new Date().toISOString(),
          }));
        return {
          ...prev,
          orders: [newOrder, ...currentOrders],
          notifications: [...staffNotifications, ...prev.notifications],
        };
      });

      clearCart();
      addToast(
        language === "ar"
          ? "تم إنشاء الطلب بنجاح ✅"
          : "Order created successfully ✅",
        language === "ar"
          ? `رقم الطلب: ${orderNumber}`
          : `Order #: ${orderNumber}`,
        "success",
      );

      return newOrder;
    } catch (err: any) {
      addToast(
        language === "ar" ? "خطأ في إنشاء الطلب ❌" : "Error creating order ❌",
        err.message || "Unknown error",
        "error",
      );
      throw err;
    }
  };

  // ============================================
  // 🔥 FIXED: updateOrderStatus with safe array handling
  // ============================================
  const updateOrderStatus = (
    orderId: string,
    status: OrderStatus,
    noteAr = "",
    noteEn = "",
    digitalDeliveries?: Order["digitalDeliveries"],
    digitalKeys?: string[],
  ): Promise<void> => {
    try {
      let updated = false;
      setState((prev) => {
        try {
          const currentOrders = Array.isArray(prev.orders) ? prev.orders : [];
          const orderIndex = currentOrders.findIndex(
            (order) =>
              order && typeof order === "object" && order.id === orderId,
          );
          if (orderIndex === -1) {
            console.warn("Order not found:", orderId);
            return prev;
          }

          const order = currentOrders[orderIndex];
          const timeline = Array.isArray(order.timeline) ? order.timeline : [];
          const timestamp = new Date().toISOString();
          const safeOrderNumber = String(order.orderNumber || orderId);
          const timelineEvent = {
            status,
            timestamp,
            noteAr: noteAr || `تم تحديث الحالة إلى ${status}`,
            noteEn: noteEn || `Status updated to ${status}`,
          };

          const updatedOrder: Order = {
            ...order,
            status,
            updatedAt: timestamp,
            timeline: [...timeline, timelineEvent],
            ...(digitalDeliveries ? { digitalDeliveries } : {}),
            ...(digitalKeys ? { digitalKeys } : {}),
          };
          const newNotif: NotificationItem = {
            id: `notif-${Date.now()}`,
            userId: String(order.userId || ""),
            titleAr: `تحديث لحالة طلبك #${safeOrderNumber} 🔔`,
            titleEn: `Order Status Update #${safeOrderNumber} 🔔`,
            messageAr: noteAr || `تم تغيير حالة طلبك إلى: ${status}`,
            messageEn: noteEn || `Your order status changed to: ${status}`,
            type: "order",
            linkHash: "#orders",
            isRead: false,
            createdAt: timestamp,
          };

          const updatedOrders = [...currentOrders];
          updatedOrders[orderIndex] = updatedOrder;
          const currentNotifications = Array.isArray(prev.notifications)
            ? prev.notifications
            : [];
          updated = true;

          return {
            ...prev,
            orders: updatedOrders,
            notifications: [newNotif, ...currentNotifications],
          };
        } catch (error) {
          console.error("Error updating order state:", error);
          return prev;
        }
      });

      if (!updated) return Promise.resolve();

      return api
        .updateOrderStatus(orderId, status)
        .then(() => {
          addToast(
            language === "ar" ? "تم تحديث حالة الطلب" : "Order status updated",
            noteAr || `Status set to ${status}`,
            "success",
          );
        })
        .catch((error: Error) => {
          console.error("Failed to persist order status:", error);
          addToast(
            language === "ar"
              ? "تم تحديث الطلب محلياً"
              : "Order updated locally",
            language === "ar"
              ? "تعذر حفظ التغيير في قاعدة البيانات حالياً"
              : "The database could not be updated right now",
            "warning",
          );
        });
    } catch (error) {
      console.error("Error in updateOrderStatus:", error);
      addToast(
        language === "ar" ? "حدث خطأ في تحديث الطلب" : "Error updating order",
        error instanceof Error ? error.message : "Unknown error",
        "error",
      );
      return Promise.resolve();
    }
  };

  const addPaymentProofToOrder = (orderId: string, referenceNumber: string) => {
    updateOrderStatus(
      orderId,
      "payment_proof",
      `تم إرفاق الرقم المرجعي للدفع: ${referenceNumber}`,
      `Payment proof reference provided: ${referenceNumber}`,
    );
  };

  // Product Management
  const addProduct = async (
    productData: Omit<Product, "id" | "createdAt" | "rating" | "reviewsCount">,
  ) => {
    try {
      const newProduct = await api.createProduct({
        name_ar: productData.nameAr,
        name_en: productData.nameEn,
        description_ar: productData.descriptionAr || "",
        description_en: productData.descriptionEn || "",
        price_jod: productData.priceJOD,
        price_usd:
          productData.priceUSD ||
          productData.priceJOD * state.settings.usdExchangeRate,
        category: productData.category,
        image: productData.image || "",
        original_price_jod: productData.originalPriceJOD,
        original_price_usd: productData.originalPriceUSD,
        stock_quantity: productData.stockQuantity || 0,
        low_stock_threshold: productData.lowStockThreshold,
        is_featured: productData.isFeatured,
        badge_ar: productData.badgeAr,
        badge_en: productData.badgeEn,
        platform: productData.platform,
        region_ar: productData.regionAr,
        region_en: productData.regionEn,
        delivery_type_ar: productData.deliveryTypeAr,
        delivery_type_en: productData.deliveryTypeEn,
        short_desc_ar: productData.shortDescAr,
        short_desc_en: productData.shortDescEn,
        features_ar: productData.featuresAr,
        features_en: productData.featuresEn,
      });

      setState((prev) => ({
        ...prev,
        products: [newProduct, ...prev.products],
      }));

      addToast(
        language === "ar"
          ? "تم إضافة المنتج بنجاح"
          : "Product added successfully",
        newProduct.nameAr,
        "success",
      );
    } catch (err: any) {
      addToast(
        language === "ar" ? "خطأ في إضافة المنتج" : "Error adding product",
        err.message || "Unknown error",
        "error",
      );
    }
  };

  const updateProduct = async (product: Product) => {
    try {
      const updated = await api.updateProduct(product.id, {
        name_ar: product.nameAr,
        name_en: product.nameEn,
        description_ar: product.descriptionAr || "",
        description_en: product.descriptionEn || "",
        price_jod: product.priceJOD,
        price_usd: product.priceUSD,
        category: product.category,
        image: product.image || "",
        original_price_jod: product.originalPriceJOD,
        original_price_usd: product.originalPriceUSD,
        stock_quantity: product.stockQuantity || 0,
        low_stock_threshold: product.lowStockThreshold,
        is_featured: product.isFeatured,
        badge_ar: product.badgeAr,
        badge_en: product.badgeEn,
        platform: product.platform,
        region_ar: product.regionAr,
        region_en: product.regionEn,
        delivery_type_ar: product.deliveryTypeAr,
        delivery_type_en: product.deliveryTypeEn,
        short_desc_ar: product.shortDescAr,
        short_desc_en: product.shortDescEn,
        features_ar: product.featuresAr,
        features_en: product.featuresEn,
      });

      setState((prev) => ({
        ...prev,
        products: prev.products.map((p) => (p.id === product.id ? updated : p)),
      }));

      addToast(
        language === "ar" ? "تم تحديث بيانات المنتج" : "Product updated",
        product.nameAr,
        "success",
      );
    } catch (err: any) {
      addToast(
        language === "ar" ? "خطأ في تحديث المنتج" : "Error updating product",
        err.message || "Unknown error",
        "error",
      );
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      await api.deleteProduct(productId);
      const prod = state.products.find((p) => p.id === productId);
      setState((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== productId),
      }));
      addToast(
        language === "ar" ? "تم حذف المنتج" : "Product deleted",
        prod?.nameAr || "",
        "info",
      );
    } catch (err: any) {
      addToast(
        language === "ar" ? "خطأ في حذف المنتج" : "Error deleting product",
        err.message || "Unknown error",
        "error",
      );
    }
  };

  const updateProductStock = async (productId: string, newStock: number) => {
    try {
      const updated = await api.updateStock(productId, newStock);
      setState((prev) => ({
        ...prev,
        products: prev.products.map((p) => (p.id === productId ? updated : p)),
      }));
      addToast(
        language === "ar" ? "تم تحديث المخزون" : "Stock updated",
        `الكمية الجديدة: ${newStock}`,
        "success",
      );
    } catch (err: any) {
      addToast(
        language === "ar" ? "خطأ في تحديث المخزون" : "Error updating stock",
        err.message || "Unknown error",
        "error",
      );
    }
  };

  // Reviews
  const addReview = async (
    productId: string,
    rating: number,
    comment: string,
  ) => {
    if (!currentUser) {
      return {
        success: false,
        message:
          language === "ar" ? "يجب تسجيل الدخول أولاً" : "Must login first",
      };
    }

    try {
      const newReview = await api.addReview({
        product_id: productId,
        user_id: currentUser.id,
        rating,
        comment,
      });

      setState((prev) => {
        const allProductReviews = [
          ...prev.reviews.filter((r) => r.productId === productId),
          newReview,
        ];
        const avgRating =
          allProductReviews.reduce((sum, r) => sum + r.rating, 0) /
          allProductReviews.length;

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
        language === "ar"
          ? "شكراً على تقييمك! ⭐"
          : "Thank you for your review! ⭐",
        language === "ar" ? "تم نشر مراجعتك بنجاح" : "Review published",
        "success",
      );
      return { success: true };
    } catch (err: any) {
      addToast(
        language === "ar" ? "خطأ في إضافة التقييم" : "Error adding review",
        err.message || "Unknown error",
        "error",
      );
      return { success: false, message: err.message };
    }
  };

  const deleteReview = async (reviewId: string) => {
    try {
      await api.deleteReview(reviewId);
      setState((prev) => {
        const review = prev.reviews.find((r) => r.id === reviewId);
        if (!review) return prev;

        const remainingReviews = prev.reviews.filter((r) => r.id !== reviewId);
        const productReviews = remainingReviews.filter(
          (r) => r.productId === review.productId,
        );
        const avgRating =
          productReviews.length > 0
            ? productReviews.reduce((s, r) => s + r.rating, 0) /
              productReviews.length
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
        language === "ar" ? "تم حذف التقييم" : "Review deleted",
        "",
        "info",
      );
    } catch (err: any) {
      addToast(
        language === "ar" ? "خطأ في حذف التقييم" : "Error deleting review",
        err.message || "Unknown error",
        "error",
      );
    }
  };

  // Support System
  const refreshSupportTickets = async () => {
    const supportTickets = await api.getSupportTickets();
    const supportMessages = supportTickets.flatMap((ticket: SupportTicket) =>
      (ticket.messages || []).map((message) => ({
        id: message.id,
        ticketId: ticket.id,
        senderId: message.senderId,
        senderName: message.senderName,
        senderRole: message.senderRole,
        message: message.text,
        timestamp: message.createdAt,
        isRead: true,
      })),
    );
    setState((prev) => ({ ...prev, supportTickets, supportMessages }));
    return supportTickets;
  };

  const createSupportTicket = async (
    subject: string,
    messageOrCategory?: string,
    messageOrOrderNumber?: string,
    orderNumber?: string,
  ): Promise<string | { success: boolean; ticket?: SupportTicket; error?: string }> => {
    const categoryOptions: Array<SupportTicket["category"]> = [
      "order_inquiry",
      "technical_help",
      "activation_help",
      "general",
    ];
    const category =
      messageOrCategory && categoryOptions.includes(messageOrCategory as any)
        ? (messageOrCategory as SupportTicket["category"])
        : "general";
    const hasCategoryInput =
      !!messageOrCategory && categoryOptions.includes(messageOrCategory as any);

    const resolvedMessage = hasCategoryInput
      ? (messageOrOrderNumber || "")
      : (messageOrCategory || "");
    const resolvedOrderNumber = hasCategoryInput
      ? orderNumber
      : (typeof messageOrOrderNumber === "string" ? messageOrOrderNumber : undefined);

    if (!subject.trim() || !resolvedMessage.trim()) {
      return {
        success: false,
        error:
          language === "ar"
            ? "يرجى ملء عنوان التذكرة ورسالتها"
            : "Subject and message are required",
      };
    }

    if (!currentUser) {
      return {
        success: false,
        error: language === "ar" ? "يرجى تسجيل الدخول لفتح تذكرة محفوظة" : "Please sign in to create a persisted ticket",
      };
    }

    try {
      await api.syncUser(currentUser);
      await api.createSupportTicket({
        subject,
        message: resolvedMessage,
        category,
        orderNumber: resolvedOrderNumber,
      });
      setState((prev) => ({
        ...prev,
        notifications: [
          ...prev.users
            .filter((user) => user.role === "owner" || user.role === "staff")
            .map((user) => ({
              id: `notif-admin-support-${Date.now()}-${user.id}`,
              userId: user.id,
              titleAr: "استفسار دعم جديد",
              titleEn: "New support request",
              messageAr: subject,
              messageEn: subject,
              type: "support" as const,
              linkHash: "#admin",
              isRead: false,
              createdAt: new Date().toISOString(),
            })),
          ...prev.notifications,
        ],
      }));
      const supportTickets = await refreshSupportTickets();
      const ticket = supportTickets[0];
      addToast(
        language === "ar" ? "تم إرسال تذكرتك للدعم الفني 💬" : "Support ticket submitted 💬",
        language === "ar" ? "تم حفظ التذكرة في قاعدة البيانات" : "The ticket was saved to the database",
        "success",
      );
      return { success: true, ticket };
    } catch (error) {
      console.error("Failed to persist support ticket:", error);
      return {
        success: false,
        error: language === "ar" ? "تعذر حفظ التذكرة في قاعدة البيانات" : "The ticket could not be saved",
      };
    }

    /* Local-only ticket construction is retained below as a compatibility fallback for legacy callers. */
    const ticketId = `tkt-${Date.now()}`;
    const user = currentUser || {
      id: `guest-${Date.now()}`,
      name: "عميل زائر",
      email: "guest@qwader.jo",
      phone: "+962 7 9000 0000",
      role: "customer" as UserRole,
      registeredAt: new Date().toISOString(),
    };

    const createdAt = new Date().toISOString();
    const firstMsg: SupportMessage = {
      id: `msg-${Date.now()}`,
      ticketId,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      recipientId: "admin",
      message: resolvedMessage,
      timestamp: createdAt,
      isRead: false,
    };

    const newTicket: SupportTicket = {
      id: ticketId,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userPhone: user.phone,
      subject,
      orderNumber: resolvedOrderNumber,
      category,
      status: "open",
      createdAt,
      lastActivity: createdAt,
      updatedAt: createdAt,
      messages: [
        {
          id: firstMsg.id,
          senderId: firstMsg.senderId,
          senderName: firstMsg.senderName,
          senderRole: firstMsg.senderRole,
          text: firstMsg.message,
          createdAt: firstMsg.timestamp,
        },
      ],
    };

    setState((prev) => ({
      ...prev,
      supportTickets: [newTicket, ...prev.supportTickets],
      supportMessages: [...prev.supportMessages, firstMsg],
    }));

    addToast(
      language === "ar"
        ? "تم إرسال تذكرتك للدعم الفني 💬"
        : "Support ticket submitted 💬",
      language === "ar"
        ? "سيقوم فريق قويدر بالرد عليك خلال دقائق"
        : "Our team will respond shortly",
      "success",
    );

    return { success: true, ticket: newTicket };
  };

  const addSupportMessage = async (ticketId: string, message: string) => {
    if (!ticketId || !message.trim()) return false;

    if (currentUser) {
      try {
        const ticketOwnerId = state.supportTickets.find((ticket) => ticket.id === ticketId)?.userId;
        await api.syncUser(currentUser);
        await api.addSupportMessage(ticketId, message.trim());
        if (ticketOwnerId && ticketOwnerId !== currentUser.id) {
          setState((prev) => ({
            ...prev,
            notifications: [{
              id: `notif-support-reply-${Date.now()}`,
              userId: ticketOwnerId,
              titleAr: "تم الرد على طلب الدعم",
              titleEn: "Support request answered",
              messageAr: "تمت إضافة رد جديد إلى محادثة الدعم الخاصة بك.",
              messageEn: "A new reply was added to your support conversation.",
              type: "support",
              linkHash: "#support",
              isRead: false,
              createdAt: new Date().toISOString(),
            }, ...prev.notifications],
          }));
        }
        await refreshSupportTickets();
        return true;
      } catch (error) {
        console.error("Failed to persist support message:", error);
        addToast(
          language === "ar" ? "تعذر حفظ الرسالة" : "Message could not be saved",
          language === "ar" ? "تحقق من تسجيل الدخول وحاول مرة أخرى" : "Please verify your session and try again",
          "error",
        );
        return false;
      }
    }

    const sender = currentUser || {
      id: "guest-user",
      name: "عميل زائر",
      role: "customer" as UserRole,
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
        t.id === ticketId
          ? {
              ...t,
              lastActivity: newMsg.timestamp,
              updatedAt: newMsg.timestamp,
              messages: [
                ...(t.messages || []),
                {
                  id: newMsg.id,
                  senderId: newMsg.senderId,
                  senderName: newMsg.senderName,
                  senderRole: newMsg.senderRole,
                  text: newMsg.message,
                  createdAt: newMsg.timestamp,
                },
              ],
            }
          : t,
      ),
    }));

    return true;
  };

  const sendSupportMessage = async (ticketId: string, message: string) => {
    return addSupportMessage(ticketId, message);
  };

  const updateTicketStatus = async (
    ticketId: string,
    status: "open" | "closed" | "resolved",
  ) => {
    if (currentUser && (currentUser.role === "owner" || currentUser.role === "staff")) {
      try {
        await api.updateSupportTicketStatus(ticketId, status);
        await refreshSupportTickets();
        addToast(
          language === "ar" ? "تم تحديث حالة التذكرة" : "Ticket status updated",
          "",
          "info",
        );
        return;
      } catch (error) {
        console.error("Failed to persist ticket status:", error);
        addToast(
          language === "ar" ? "تعذر حفظ حالة التذكرة" : "Ticket status could not be saved",
          "",
          "error",
        );
        return;
      }
    }

    setState((prev) => ({
      ...prev,
      supportTickets: prev.supportTickets.map((t) =>
        t.id === ticketId
          ? { ...t, status, lastActivity: new Date().toISOString() }
          : t,
      ),
    }));
    addToast(
      language === "ar" ? "تم تحديث حالة التذكرة" : "Ticket status updated",
      "",
      "info",
    );
  };

  // Settings
  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    const nextSettings = { ...state.settings, ...newSettings };
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...newSettings } }));
    persistStoreConfig(nextSettings, state.promoCodes);
    addToast(
      language === "ar" ? "تم حفظ إعدادات المتجر" : "Settings saved",
      "",
      "success",
    );
  };

  // Backup & Restore
  const exportBackupJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `qwader_store_backup_${new Date().toISOString().split("T")[0]}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addToast(
      language === "ar"
        ? "تم تصدير النسخة الاحتياطية بنجاح 💾"
        : "Backup exported successfully 💾",
      "JSON file saved",
      "success",
    );
  };

  const importBackupJson = (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (!parsed.products || !parsed.settings) {
        return {
          success: false,
          error: "الملف لا يحتوي على بنية بيانات متجر قويدر الصحيحة",
        };
      }
      setState(parsed);
      addToast(
        language === "ar"
          ? "تم استيراد النسخة الاحتياطية بنجاح 🔄"
          : "Backup imported successfully 🔄",
        "All data restored",
        "success",
      );
      return { success: true };
    } catch (e: any) {
      return {
        success: false,
        error: e.message || "خطأ في قراءة ملف الـ JSON",
      };
    }
  };

  const resetToFactoryDefaults = () => {
    setState(INITIAL_STATE);
    setCart([]);
    setWishlist([]);
    setCompareList([]);
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY_SESSION);
    localStorage.removeItem(STORAGE_KEY_CART);
    localStorage.removeItem(STORAGE_KEY_WISHLIST);
    localStorage.removeItem(STORAGE_KEY_COMPARE);
    addToast(
      language === "ar"
        ? "تم إعادة ضبط المتجر بالكامل بنجاح 🔄"
        : "Factory reset complete 🔄",
      language === "ar"
        ? "تمت استعادة كافة المنتجات والبيانات للوضع الأولي النظيف"
        : "Restored clean initial state",
      "warning",
    );
  };

  // Notifications
  const markNotificationAsRead = (id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n,
      ),
    }));
  };

  const markAllNotificationsAsRead = () => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
    }));
  };

  const resetToFactoryData = resetToFactoryDefaults;
  const exportDataJson = exportBackupJson;
  const importDataJson = importBackupJson;

  // ✅ Show loading screen while data is being fetched
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#020617] text-white text-xl font-cairo">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>
            {language === "ar" ? "جاري تحميل المتجر..." : "Loading store..."}
          </p>
        </div>
      </div>
    );
  }

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
        cartPromptProduct,
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
        isOrdersLoading,
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
        confirmOpenCart,
        continueShopping,
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
        addSupportMessage,
        sendSupportMessage,
        updateTicketStatus,
        updateSettings,
        exportBackupJson,
        importBackupJson,
        resetToFactoryDefaults,
        exportDataJson,
        importDataJson,
        resetToFactoryData,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        addToast,
        removeToast,
        setLanguage,
        setTheme,
        setCurrency,
        formatPrice,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
};
