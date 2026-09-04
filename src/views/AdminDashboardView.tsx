import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, Order, OrderStatus, UserRole, ProductCategory, Review, GovernorateRate, DeliveryCompany } from '../types';
import { exportOrdersToCsv } from '../utils/exportCsv';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  ShieldCheck,
  Crown,
  Package,
  ShoppingBag,
  Users,
  Settings,
  Database,
  Star,
  Headphones,
  TrendingUp,
  AlertTriangle,
  Plus,
  Trash2,
  Edit,
  Download,
  Upload,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Zap,
  Key,
  DollarSign,
  Lock,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  Send,
  SlidersHorizontal,
  Flame,
  Tag,
  Shield,
  Palette,
  Share2,
  Truck,
  MapPin,
  Building,
  Store,
  ExternalLink,
  Globe,
  Phone,
  MessageCircle,
  Image as ImageIcon,
  Copy,
  Info,
  Save,
} from 'lucide-react';

export const AdminDashboardView: React.FC = () => {
  const {
    state,
    currentUser,
    requestAdminLoginLink,
    isAdminSessionVerified,
    requestSensitiveActionVerification,
    lockAdminSession,
    formatPrice,
    addProduct,
    updateProduct,
    deleteProduct,
    updateProductStock,
    updateOrderStatus,
    updateUserRole,
    deleteReview,
    addSupportMessage,
    updateTicketStatus,
    updateSettings,
    exportDataJson,
    importDataJson,
    resetToFactoryData,
    addPromoCode,
    togglePromoCode,
    deletePromoCode,
    isOrdersLoading,
    language,
    navigateTo,
    t,
  } = useStore();

  // Admin Portal Direct Login Form State
  const [adminEmail, setAdminEmail] = useState('owner@qwaderstore.jo');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [isAdminLoggingIn, setIsAdminLoggingIn] = useState(false);
  const [adminLinkSent, setAdminLinkSent] = useState(false);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'orders' | 'products' | 'promos' | 'branding' | 'socials' | 'fulfillment' | 'users' | 'reviews' | 'support' | 'settings' | 'backup'
  >('overview');

  // Promo Code Form State
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState<number>(10);
  const [isPromoPercent, setIsPromoPercent] = useState(true);
  const [newPromoMinOrder, setNewPromoMinOrder] = useState<number>(0);

  // New Governorate state
  const [newGovNameAr, setNewGovNameAr] = useState('');
  const [newGovNameEn, setNewGovNameEn] = useState('');
  const [newGovPrice, setNewGovPrice] = useState<number>(3);
  const [showAddGovForm, setShowAddGovForm] = useState(false);

  // New Delivery Company state
  const [newCompNameAr, setNewCompNameAr] = useState('');
  const [newCompNameEn, setNewCompNameEn] = useState('');
  const [newCompPhone, setNewCompPhone] = useState('');
  const [newCompTracking, setNewCompTracking] = useState('');
  const [newCompDaysAr, setNewCompDaysAr] = useState('خلال 24-48 ساعة');
  const [newCompDaysEn, setNewCompDaysEn] = useState('24-48 Hours');
  const [showAddCompForm, setShowAddCompForm] = useState(false);

  // Save feedback state
  const [savedSectionToast, setSavedSectionToast] = useState<string | null>(null);

  const triggerSaveNotification = (sectionName: string) => {
    setSavedSectionToast(sectionName);
    setTimeout(() => setSavedSectionToast(null), 3000);
  };

  // Products state & modal
  const [productSearch, setProductSearch] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // New/Edit Product Form state
  const [formData, setFormData] = useState({
    nameAr: '',
    nameEn: '',
    category: 'games' as ProductCategory,
    platform: 'PS5',
    regionAr: 'حساب تركي / عالمي',
    regionEn: 'Turkey / Global Account',
    priceJOD: 15,
    priceUSD: 21,
    originalPriceJOD: 25,
    originalPriceUSD: 35,
    stockQuantity: 10,
    lowStockThreshold: 5,
    deliveryTypeAr: 'حساب أساسي فوري',
    deliveryTypeEn: 'Instant Primary Account',
    image: '/images/hero-subscriptions.svg',
    shortDescAr: 'لعبة أصلية مع تفعيل مباشر',
    shortDescEn: 'Original game with instant activation',
    descriptionAr: 'لعبة بلايستيشن أصلية 100% مع ضمان دائم ودعم كامل للتفعيل.',
    descriptionEn: '100% authentic PlayStation title with full support and warranty.',
    featuresAr: 'حساب رئيسي Primary, تفعيل دائم, يدعم اللغة العربية',
    featuresEn: 'Primary Account, Lifetime Warranty, Arabic Supported',
    isFeatured: true,
  });

  // Orders Filter & State
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [digitalKeyInputs, setDigitalKeyInputs] = useState<Record<string, string>>({});

  // Support replies
  const [selectedSupportTicketId, setSelectedSupportTicketId] = useState<string | null>(
    (state?.supportTickets || [])[0]?.id || null
  );
  const [adminReplyText, setAdminReplyText] = useState('');
  const orders = Array.isArray(state?.orders) ? state.orders : [];

  // Unconditional useMemo hooks and analytics calculations
  const filteredOrders = useMemo(() => {
    try {
      return orders.filter((o) => {
        if (!o || typeof o !== 'object') return false;
        if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
        if (orderSearch.trim()) {
          const q = orderSearch.toLowerCase();
          return [o.orderNumber, o.customerName, o.customerPhone]
            .some((value) => String(value || '').toLowerCase().includes(q));
        }
        return true;
      });
    } catch (error) {
      console.error('Failed to filter admin orders:', error);
      return [];
    }
  }, [orders, orderStatusFilter, orderSearch]);

  const filteredProducts = useMemo(() => {
    return (state?.products || []).filter((p) => {
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase();
        return (
          p.nameAr.toLowerCase().includes(q) ||
          p.nameEn.toLowerCase().includes(q) ||
          p.platform.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [state?.products, productSearch]);

  // Calculate Overview Analytics
  const { totalRevenueJOD, totalRevenueUSD, lowStockProducts } = useMemo(() => {
    try {
      const completedOrders = orders.filter(
        (o) => o && (o.status === 'completed' || o.status === 'delivered')
      );

      return {
        totalRevenueJOD: completedOrders.reduce((sum, o) => sum + (Number(o.totalJOD) || 0), 0),
        totalRevenueUSD: completedOrders.reduce((sum, o) => sum + (Number(o.totalUSD) || 0), 0),
        lowStockProducts: (state?.products || []).filter(
          (p) => p && p.stockQuantity <= p.lowStockThreshold
        ),
      };
    } catch (error) {
      console.error('Failed to calculate admin order analytics:', error);
      return { totalRevenueJOD: 0, totalRevenueUSD: 0, lowStockProducts: [] };
    }
  }, [orders, state?.products]);

  // Sales Trends Data
  const salesChartData = [
    { day: 'السبت', sales: 120, orders: 4 },
    { day: 'الأحد', sales: 210, orders: 7 },
    { day: 'الاثنين', sales: 180, orders: 5 },
    { day: 'الثلاثاء', sales: 290, orders: 9 },
    { day: 'الأربعاء', sales: 340, orders: 12 },
    { day: 'الخميس', sales: 480, orders: 16 },
    { day: 'الجمعة', sales: 520, orders: 18 },
  ];

  // Sales by Category Data
  const categorySalesData = [
    { name: 'ألعاب سوني', value: 45, color: '#8b5cf6' },
    { name: 'اشتراكات بلس', value: 30, color: '#f59e0b' },
    { name: 'بطاقات PSN', value: 15, color: '#06b6d4' },
    { name: 'بطاقات Steam', value: 10, color: '#ec4899' },
  ];

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      nameAr: '',
      nameEn: '',
      category: 'games',
      platform: 'PS5',
      regionAr: 'حساب تركي / عالمي',
      regionEn: 'Turkey / Global Account',
      priceJOD: 15,
      priceUSD: 21,
      originalPriceJOD: 25,
      originalPriceUSD: 35,
      stockQuantity: 10,
      lowStockThreshold: 5,
      deliveryTypeAr: 'حساب أساسي فوري',
      deliveryTypeEn: 'Instant Primary Account',
      image: '/images/hero-subscriptions.svg',
      shortDescAr: 'لعبة أصلية مع تفعيل مباشر',
      shortDescEn: 'Original game with instant activation',
      descriptionAr: 'لعبة بلايستيشن أصلية 100% مع ضمان دائم ودعم كامل للتفعيل.',
      descriptionEn: '100% authentic PlayStation title with full support and warranty.',
      featuresAr: 'حساب رئيسي Primary, تفعيل دائم, يدعم اللغة العربية',
      featuresEn: 'Primary Account, Lifetime Warranty, Arabic Supported',
      isFeatured: true,
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      nameAr: product.nameAr,
      nameEn: product.nameEn,
      category: product.category,
      platform: product.platform,
      regionAr: product.regionAr,
      regionEn: product.regionEn,
      priceJOD: product.priceJOD,
      priceUSD: product.priceUSD,
      originalPriceJOD: product.originalPriceJOD || product.priceJOD * 1.3,
      originalPriceUSD: product.originalPriceUSD || product.priceUSD * 1.3,
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
      deliveryTypeAr: product.deliveryTypeAr,
      deliveryTypeEn: product.deliveryTypeEn,
      image: product.image,
      shortDescAr: product.shortDescAr,
      shortDescEn: product.shortDescEn,
      descriptionAr: product.descriptionAr,
      descriptionEn: product.descriptionEn,
      featuresAr: Array.isArray(product.featuresAr) ? product.featuresAr.join(', ') : (product.featuresAr || ''),
      featuresEn: Array.isArray(product.featuresEn) ? product.featuresEn.join(', ') : (product.featuresEn || ''),
      isFeatured: product.isFeatured || false,
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const productPayload: Partial<Product> = {
      nameAr: formData.nameAr,
      nameEn: formData.nameEn || formData.nameAr,
      category: formData.category,
      platform: formData.platform as Product['platform'],
      regionAr: formData.regionAr,
      regionEn: formData.regionEn,
      priceJOD: Number(formData.priceJOD),
      priceUSD: Number(formData.priceUSD),
      originalPriceJOD: Number(formData.originalPriceJOD),
      originalPriceUSD: Number(formData.originalPriceUSD),
      stockQuantity: Number(formData.stockQuantity),
      lowStockThreshold: Number(formData.lowStockThreshold),
      deliveryTypeAr: formData.deliveryTypeAr,
      deliveryTypeEn: formData.deliveryTypeEn,
      image: formData.image,
      shortDescAr: formData.shortDescAr,
      shortDescEn: formData.shortDescEn,
      descriptionAr: formData.descriptionAr,
      descriptionEn: formData.descriptionEn,
      featuresAr: (formData.featuresAr || '').split(',').map((s) => s.trim()).filter(Boolean),
      featuresEn: (formData.featuresEn || '').split(',').map((s) => s.trim()).filter(Boolean),
      isFeatured: formData.isFeatured,
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productPayload);
    } else {
      addProduct(productPayload as any);
    }
    setIsProductModalOpen(false);
  };

  const handleAddDigitalKeyToOrder = (orderId: string) => {
    try {
      const key = digitalKeyInputs[orderId];
      if (!key || !key.trim()) return;

      const order = orders.find((o) => o && o.id === orderId);
      if (!order) return;

      const currentKeys = Array.isArray(order.digitalKeys) ? order.digitalKeys : [];
      updateOrderStatus(orderId, 'completed', `تم تسليم المفتاح: ${key.trim()}`, `Digital key delivered: ${key.trim()}`, undefined, [...currentKeys, key.trim()]);
      setDigitalKeyInputs((prev) => ({ ...prev, [orderId]: '' }));
    } catch (error) {
      console.error('Failed to deliver digital key:', error);
    }
  };

  const handleAdminSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupportTicketId || !adminReplyText.trim()) return;
    addSupportMessage(selectedSupportTicketId, adminReplyText.trim());
    setAdminReplyText('');
  };

  const handleRoleChangeWithVerification = (userId: string, newRole: UserRole, targetUserName: string) => {
    requestSensitiveActionVerification({
      actionType: 'role_update',
      titleAr: `تغيير صلاحية المستخدم (${targetUserName}) إلى (${newRole.toUpperCase()})`,
      titleEn: `Change role for ${targetUserName} to ${newRole.toUpperCase()}`,
      descriptionAr: 'تغيير صلاحيات الحسابات إلى مشرف أو مالك يتطلب تأكيداً أمنياً برمز 6 أرقام مرسل لبريدك الإلكتروني.',
      descriptionEn: 'Promoting or changing user access roles requires two-step verification code confirmation.',
      onSuccess: () => {
        updateUserRole(userId, newRole);
      },
    });
  };

  const handleFactoryResetWithVerification = () => {
    requestSensitiveActionVerification({
      actionType: 'factory_reset',
      titleAr: 'إعادة ضبط مصنع بيانات المتجر بالكامل',
      titleEn: 'Factory Reset Entire Store Data',
      descriptionAr: 'تحذير: هذا الإجراء سيستعيد البيانات الافتراضية للمتجر. يتطلب تأكيد رمز التحقق بخطوتين.',
      descriptionEn: 'Warning: This will restore default demo store data. Requires 2-step verification code.',
      onSuccess: () => {
        resetToFactoryData();
      },
    });
  };

  const activeSupportTicket = (state?.supportTickets || []).find((t) => t.id === selectedSupportTicketId);

  // RBAC Permission checks
  const isOwner = currentUser?.role === 'owner';
  const isStaff = currentUser?.role === 'staff' || isOwner;

  const handleAdminDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError('');
    if (!adminEmail.trim()) {
      setAdminLoginError(language === 'ar' ? 'يرجى إدخال البريد الإلكتروني للمسؤول' : 'Please enter admin email');
      return;
    }
    setIsAdminLoggingIn(true);
    const res = await requestAdminLoginLink(adminEmail);
    setIsAdminLoggingIn(false);
    if (res.success) {
      setAdminLinkSent(true);
    } else {
      setAdminLoginError(res.error || (language === 'ar' ? 'بيانات الدخول غير صحيحة، يرجى التأكد والمحاولة مجدداً' : 'Login failed'));
    }
  };

  if (!currentUser || (!isOwner && !isStaff)) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 animate-in fade-in duration-300">
        <div className="p-6 sm:p-10 rounded-3xl glass-card border border-purple-500/40 shadow-[0_0_50px_rgba(139,92,246,0.15)] space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 p-0.5 shadow-xl shadow-purple-900/50 mx-auto flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Crown className="w-8 h-8 text-amber-400" />
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-purple-950/80 text-purple-300 border border-purple-500/30 mb-2">
                <span>🇯🇴</span>
                <span>{language === 'ar' ? 'بوابة إدارة متجر قويدر ستور' : 'QWADER ADMIN PORTAL'}</span>
              </div>
              <h2 className="text-2xl font-black text-slate-100 font-cairo">
                {language === 'ar' ? 'تسجيل دخول لوحة التحكم' : 'Admin Control Panel'}
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {language === 'ar'
                ? 'أدخل بريد حساب الإدارة وسنرسل رابط دخول إلى بريدك الإلكتروني.'
                : 'Enter your admin email and we will send a sign-in link.'}
              </p>
            </div>
          </div>

          {/* Error Message */}
          {adminLoginError && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2 animate-shake">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{adminLoginError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAdminDirectLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block text-start">
                {language === 'ar' ? 'البريد الإلكتروني للمسؤول' : 'Admin Email'}
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@qwaderstore.jo"
                className="w-full px-4 py-3 rounded-2xl bg-slate-900/90 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isAdminLoggingIn}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:brightness-110 active:scale-[0.99] text-white font-black text-sm shadow-xl shadow-purple-900/40 transition-all font-cairo flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{language === 'ar' ? 'إرسال رابط الدخول' : 'Send sign-in link'}</span>
            </button>
            {adminLinkSent && (
              <p className="text-center text-xs text-emerald-300">
                {language === 'ar' ? 'تحقق من بريدك الإلكتروني واضغط الرابط لإكمال الدخول' : 'Check your email and click the link to finish signing in'}
              </p>
            )}
          </form>

        </div>
      </div>
    );
  }

  // Two-Step Verification Gate for Admin Dashboard Access
  if (!isAdminSessionVerified) {
    const handleTriggerAdminVerification = () => {
      requestSensitiveActionVerification({
        actionType: 'admin_access',
        titleAr: 'تأكيد الدخول إلى لوحة الإدارة والتحكم',
        titleEn: 'Verify Admin Dashboard Access',
        descriptionAr: `مرحباً ${currentUser.name}! لحماية بيانات المتجر والعمليات المالية والمخزون، يرجى تأكيد الدخول.`,
        descriptionEn: `Hello ${currentUser.name}! To access administrative controls, please confirm your session.`,
        targetEmail: currentUser.email,
        targetPhone: currentUser.phone,
        onSuccess: () => {
          // Unlocks automatically via context
        },
      });
    };

    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center animate-in fade-in duration-300">
        <div className="p-8 sm:p-10 rounded-3xl glass-card border-2 border-purple-500/40 shadow-[0_0_50px_rgba(139,92,246,0.2)] space-y-6">
          <div className="relative inline-block mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-purple-600/20 border-2 border-purple-500/50 text-purple-300 flex items-center justify-center shadow-lg shadow-purple-900/40 animate-pulse">
              <ShieldCheck className="w-10 h-10 text-purple-400" />
            </div>
            <div className="absolute -bottom-1 -end-1 w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Lock className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-purple-950/80 text-purple-300 border border-purple-500/40">
              {language === 'ar' ? '🔐 حماية أمنية مشددة' : '🔐 High Security Protection'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 font-cairo">
              {language === 'ar' ? 'تأكيد هوية مسؤول النظام' : 'Confirm Administrator Identity'}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
              {language === 'ar'
                ? `مرحباً بك ${currentUser.name}! تم التحقق من هويتك بنجاح كمسؤول معتمد في متجر قويدر.`
                : `Welcome ${currentUser.name}! You are recognized as an administrator of Qwader Store.`}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              id="start-admin-two-step-btn"
              onClick={handleTriggerAdminVerification}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:brightness-110 text-white font-black text-sm shadow-xl shadow-purple-900/50 hover:scale-[1.02] active:scale-95 transition-all font-cairo flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
              <span>
                {language === 'ar'
                  ? 'فتح لوحة الإدارة فوراً 🚀'
                  : 'Unlock Admin Dashboard Now 🚀'}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      
      {/* Top Admin Header */}
      <div className="p-6 rounded-3xl glass-card border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 p-0.5 shadow-lg shadow-purple-900/30 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-100 font-cairo">
                {t.adminDashboard}
              </h1>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-black uppercase border ${
                  currentUser.role === 'owner'
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                    : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
                }`}
              >
                {currentUser.role === 'owner' ? '👑 Owner' : '🛡️ Staff'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {language === 'ar' ? 'إدارة المبيعات، المنتجات، الطلبات والأكواد الرقمية' : 'Manage orders, products, stock & digital keys'}
            </p>
          </div>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Active 2FA Security Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{language === 'ar' ? 'جلسة إدارة مؤمنة بالتحقق بخطوتين 🛡️' : '2FA Verified Session 🛡️'}</span>
          </div>

          <button
            id="lock-admin-session-btn"
            onClick={lockAdminSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 text-xs font-bold transition-all"
            title={language === 'ar' ? 'قفل الجلسة الإدارية فوراً' : 'Lock Admin Session'}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'قفل الجلسة' : 'Lock'}</span>
          </button>

          {/* Quick CSV Export */}
          <button
            id="admin-export-csv-top-btn"
            onClick={() => exportOrdersToCsv(orders)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.exportCsv}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/10">
        {[
          { id: 'overview', label: t.tabOverview, icon: TrendingUp },
          { id: 'orders', label: t.tabOrders, icon: Package, badge: orders.filter((o) => o.status === 'pending_payment' || o.status === 'pending').length },
          { id: 'products', label: t.tabProducts, icon: ShoppingBag, badge: lowStockProducts.length },
          { id: 'promos', label: language === 'ar' ? 'كوبونات الخصم' : 'Promo Codes', icon: Tag },
          { id: 'branding', label: language === 'ar' ? 'الهوية والشعار' : 'Logo & Branding', icon: Palette },
          { id: 'socials', label: language === 'ar' ? 'حسابات التواصل' : 'Social Accounts', icon: Share2 },
          { id: 'fulfillment', label: language === 'ar' ? 'الشحن والتوصيل والمحافظات' : 'Fulfillment & Shipping', icon: Truck },
          { id: 'support', label: t.support, icon: Headphones, badge: (state?.supportTickets || []).filter((tk) => tk.status === 'open').length },
          { id: 'reviews', label: t.reviews, icon: Star },
          ...(isOwner
            ? [
                { id: 'users', label: t.tabUsers, icon: Users },
                { id: 'settings', label: t.tabSettings, icon: Settings },
                { id: 'backup', label: t.tabBackup, icon: Database },
              ]
            : []),
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`admin-tab-btn-${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 font-cairo ${
                isActive
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30 ring-2 ring-purple-400/50'
                  : 'glass-panel border border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {Boolean(tab.badge) && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-black">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Floating Save Notification */}
      {savedSectionToast && (
        <div className="fixed bottom-8 start-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span>تم حفظ تعديلات ({savedSectionToast}) بنجاح في المتجر! 🎉</span>
        </div>
      )}

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-5 rounded-3xl glass-card border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-emerald-400">
                <span className="text-xs font-bold font-cairo">{t.totalSales}</span>
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="text-2xl font-black text-slate-100 font-display">
                {formatPrice(totalRevenueJOD, totalRevenueUSD)}
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold">
                {orders.filter((o) => o.status === 'completed' || o.status === 'delivered').length} طلب مكتمل ومسدد
              </span>
            </div>

            <div className="p-5 rounded-3xl glass-card border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-purple-400">
                <span className="text-xs font-bold font-cairo">{t.totalOrders}</span>
                <Package className="w-5 h-5" />
              </div>
              <div className="text-2xl font-black text-slate-100 font-display">
                {orders.length}
              </div>
              <span className="text-[11px] text-purple-300 font-semibold">
                {orders.filter((o) => o.status === 'pending_payment' || o.status === 'pending').length} بانتظار التأكيد
              </span>
            </div>

            <div className="p-5 rounded-3xl glass-card border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-amber-400">
                <span className="text-xs font-bold font-cairo">{t.lowStockProducts}</span>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-2xl font-black text-slate-100 font-display">
                {lowStockProducts.length}
              </div>
              <span className="text-[11px] text-amber-300 font-semibold">
                {lowStockProducts.length > 0 ? 'يتطلب إعادة تزويد المخزون' : 'المخزون ممتاز'}
              </span>
            </div>

            <div className="p-5 rounded-3xl glass-card border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-cyan-400">
                <span className="text-xs font-bold font-cairo">{t.totalUsers}</span>
                <Users className="w-5 h-5" />
              </div>
              <div className="text-2xl font-black text-slate-100 font-display">
                {(state?.users || []).length}
              </div>
              <span className="text-[11px] text-cyan-300 font-semibold">عملاء وموظفين مسجلين</span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Sales Trend Chart (7 cols) */}
            <div className="lg:col-span-7 p-6 rounded-3xl glass-card border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-slate-100 font-cairo flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span>حركة المبيعات والطلبات الأسبوعية</span>
              </h3>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesChartData}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9333ea" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#020617',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#9333ea"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#salesGrad)"
                      name="المبيعات (د.أ)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sales by Category Pie (5 cols) */}
            <div className="lg:col-span-5 p-6 rounded-3xl glass-card border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-slate-100 font-cairo flex items-center gap-2">
                <PieChart className="w-4 h-4 text-pink-400" />
                <span>توزيع المبيعات حسب الأقسام</span>
              </h3>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorySalesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categorySalesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#020617',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Low Stock Urgent Warning Strip */}
          {lowStockProducts.length > 0 && (
            <div className="p-5 rounded-3xl bg-amber-950/40 border border-amber-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300 font-cairo">
                  <AlertTriangle className="w-4 h-4 text-amber-400 animate-bounce" />
                  <span>تنبيه: منتجات قريبة من النفاد (أقل من 5 قطع)</span>
                </div>
                <button
                  onClick={() => setActiveTab('products')}
                  className="text-xs text-amber-300 hover:underline font-bold"
                >
                  إدارة المخزون ➔
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {lowStockProducts.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl glass-panel border border-white/10 flex items-center justify-between"
                  >
                    <div className="truncate me-2">
                      <h5 className="text-xs font-bold text-slate-200 truncate">{p.nameAr}</h5>
                      <span className="text-[11px] text-amber-400 font-black">
                        المتبقي: {p.stockQuantity} قطع فقط!
                      </span>
                    </div>
                    <button
                      onClick={() => updateProductStock(p.id, p.stockQuantity + 10)}
                      className="px-3 py-1 rounded-full bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[10px] flex-shrink-0"
                    >
                      +10 قطع
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="w-4 h-4 text-purple-400 absolute start-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="بحث برقم الطلب، الاسم، أو الهاتف..."
                className="w-full ps-9 pe-3 py-2 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-200 focus:border-purple-500 focus:outline-none"
              >
                <option value="all">جميع الحالات</option>
                <option value="pending">بانتظار التأكيد</option>
                <option value="processing">قيد المعالجة والتجهيز</option>
                <option value="completed">مكتمل وتم التسليم</option>
                <option value="cancelled">ملغي</option>
              </select>

              <button
                onClick={() => exportOrdersToCsv(filteredOrders)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير CSV</span>
              </button>
            </div>
          </div>

          {/* Orders Table / Cards */}
          <div className="space-y-4">
            {isOrdersLoading && (!filteredOrders || filteredOrders.length === 0) ? (
              <div className="p-12 rounded-3xl glass-panel border border-white/10 text-center max-w-md mx-auto space-y-3">
                <RefreshCw className="w-8 h-8 text-purple-400 mx-auto animate-spin" />
                <p className="text-xs font-bold text-slate-300 font-cairo">
                  {language === 'ar' ? 'جاري مزامنة وتحديث قائمة الطلبات...' : 'Loading orders...'}
                </p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-12 glass-panel border border-white/10 rounded-3xl">
                لا توجد طلبات مطابقة للبحث
              </p>
            ) : (
              (filteredOrders || []).map((order) => (
                <div
                  key={order.id}
                  className="p-5 rounded-3xl glass-card border border-white/10 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black text-purple-300">
                          {order.orderNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-200">
                          {order.customerName} ({order.customerPhone})
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(order.createdAt).toLocaleString(language === 'ar' ? 'ar-JO' : 'en-US')} • دفع:{' '}
                        <strong className="text-slate-200 uppercase">{order.paymentMethod}</strong>
                        {order.paymentReference && ` (المرجع: ${order.paymentReference})`}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-purple-300 font-display">
                        {formatPrice(order.totalJOD, order.totalUSD)}
                      </span>

                      {/* Status Dropdown */}
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold border focus:outline-none ${
                          order.status === 'completed'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                            : order.status === 'processing'
                            ? 'bg-purple-950 text-purple-300 border-purple-500/40'
                            : order.status === 'pending'
                            ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                            : 'bg-rose-950 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        <option value="pending">بانتظار التأكيد</option>
                        <option value="processing">قيد التجهيز</option>
                        <option value="completed">مكتمل وتم التسليم</option>
                        <option value="cancelled">ملغي</option>
                      </select>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="text-xs text-slate-300 space-y-1">
                    {(order.items || []).map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          • {language === 'ar' ? it.productNameAr : it.productNameEn} (العدد: {it.quantity})
                        </span>
                        <span className="font-mono text-slate-400">
                          {formatPrice(
                            (Number(it.priceJOD) || 0) * (Number(it.quantity) || 0),
                            (Number(it.priceUSD) || 0) * (Number(it.quantity) || 0)
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Digital Keys Management for Order */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                        <Key className="w-3.5 h-3.5" />
                        <span>الأكواد الرقمية وحسابات التفعيل المسلمة للعميل:</span>
                      </span>
                    </div>

                    {order.digitalKeys && order.digitalKeys.length > 0 && (
                      <div className="space-y-1">
                        {(order.digitalKeys || []).map((k, idx) => (
                          <div
                            key={idx}
                            className="font-mono text-xs font-bold text-emerald-300 bg-slate-900 p-2 rounded-xl border border-emerald-500/30 select-all"
                            dir="ltr"
                          >
                            {k}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Key Input */}
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={digitalKeyInputs[order.id] || ''}
                        onChange={(e) =>
                          setDigitalKeyInputs((prev) => ({ ...prev, [order.id]: e.target.value }))
                        }
                        placeholder="أدخل كود اللعبة أو إيميل:باسورد الحساب هنا..."
                        className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100 font-mono focus:border-purple-500 focus:outline-none"
                      />
                      <button
                        onClick={() => handleAddDigitalKeyToOrder(order.id)}
                        className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
                      >
                        تسليم الكود
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCTS MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="w-4 h-4 text-purple-400 absolute start-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="بحث في المنتجات..."
                className="w-full ps-9 pe-3 py-2 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <button
              id="admin-add-product-btn"
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30 transition-all font-cairo w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addProduct}</span>
            </button>
          </div>

          {/* Products List Table */}
          <div className="overflow-x-auto rounded-3xl glass-card border border-white/10 p-2">
            <table className="w-full text-xs text-start border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-cairo">
                  <th className="p-3 text-start">المنتج</th>
                  <th className="p-3 text-center">القسم / المنصة</th>
                  <th className="p-3 text-center">السعر</th>
                  <th className="p-3 text-center">المخزون</th>
                  <th className="p-3 text-center">التقييم</th>
                  <th className="p-3 text-end">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/40">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image}
                          alt={p.nameAr}
                          className="w-10 h-10 rounded-xl object-cover border border-white/10 flex-shrink-0"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-slate-100">{p.nameAr}</h4>
                          <span className="text-[10px] text-slate-400">{p.nameEn}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-500/30">
                        {p.platform}
                      </span>
                    </td>

                    <td className="p-3 text-center font-bold text-purple-300 font-display">
                      {formatPrice(p.priceJOD, p.priceUSD)}
                    </td>

                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => updateProductStock(p.id, p.stockQuantity - 1)}
                          className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 hover:text-white"
                          aria-label={language === 'ar' ? `تقليل مخزون ${p.nameAr}` : `Decrease stock for ${p.nameEn}`}
                          title={language === 'ar' ? 'تقليل المخزون' : 'Decrease stock'}
                        >
                          -
                        </button>
                        <span
                          className={`font-bold px-2 py-0.5 rounded-full ${
                            p.stockQuantity <= p.lowStockThreshold
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                              : 'text-slate-200'
                          }`}
                        >
                          {p.stockQuantity}
                        </span>
                        <button
                          onClick={() => updateProductStock(p.id, p.stockQuantity + 1)}
                          className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 hover:text-white"
                          aria-label={language === 'ar' ? `زيادة مخزون ${p.nameAr}` : `Increase stock for ${p.nameEn}`}
                          title={language === 'ar' ? 'زيادة المخزون' : 'Increase stock'}
                        >
                          +
                        </button>
                      </div>
                    </td>

                    <td className="p-3 text-center">
                      <span className="text-amber-400 font-bold">★ {(Number(p.rating) || 5).toFixed(1)}</span>
                    </td>

                    <td className="p-3 text-end">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 rounded-lg bg-slate-800 text-purple-400 hover:bg-slate-700"
                          title="تعديل"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="p-1.5 rounded-lg bg-slate-800 text-rose-400 hover:bg-rose-950/50"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: PROMO CODES */}
      {activeTab === 'promos' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl glass-card border border-white/10 space-y-4">
            <h3 className="text-base font-bold text-slate-100 font-cairo flex items-center gap-2">
              <Tag className="w-5 h-5 text-purple-400" />
              <span>{language === 'ar' ? 'إدارة كوبونات وأكواد الخصم الترويجية' : 'Manage Promo Codes'}</span>
            </h3>
            <p className="text-xs text-slate-300">
              {language === 'ar'
                ? 'أنشئ كوبونات خصم بنسبة مئوية أو بمبلغ ثابت لدعم الحملات التسويقية وزيادة المبيعات.'
                : 'Create promotional discount codes (percentage or fixed amount) for your marketing campaigns.'}
            </p>

            {/* Create Promo Code Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newPromoCode.trim()) return;
                addPromoCode({
                  code: newPromoCode.trim().toUpperCase(),
                  ...(isPromoPercent
                    ? { discountPercent: Number(newPromoDiscount) }
                    : { discountFixedJOD: Number(newPromoDiscount) }),
                  minOrderAmountJOD: Number(newPromoMinOrder) || 0,
                  active: true,
                  usageCount: 0,
                });
                setNewPromoCode('');
                setNewPromoDiscount(10);
                setNewPromoMinOrder(0);
              }}
              className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10"
            >
              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                  {language === 'ar' ? 'كود الخصم (مثال: QWADER20)' : 'Promo Code'}
                </label>
                <input
                  type="text"
                  required
                  value={newPromoCode}
                  onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                  placeholder="SUMMER25"
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-white font-mono font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                  {language === 'ar' ? 'نوع وقيمة الخصم' : 'Discount Type & Value'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    required
                    min={1}
                    max={isPromoPercent ? 100 : 500}
                    value={newPromoDiscount}
                    onChange={(e) => setNewPromoDiscount(Number(e.target.value))}
                    className="w-20 p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-white font-bold"
                  />
                  <select
                    value={isPromoPercent ? 'percent' : 'fixed'}
                    onChange={(e) => setIsPromoPercent(e.target.value === 'percent')}
                    className="flex-1 p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-200"
                  >
                    <option value="percent">% نسبة مئوية</option>
                    <option value="fixed">د.أ مبلغ ثابت</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                  {language === 'ar' ? 'الحد الأدنى للطلب (د.أ)' : 'Min Order (JOD)'}
                </label>
                <input
                  type="number"
                  min={0}
                  value={newPromoMinOrder}
                  onChange={(e) => setNewPromoMinOrder(Number(e.target.value))}
                  placeholder="0 = بدون حد أدنى"
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 transition-all font-cairo flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === 'ar' ? 'إضافة الكود' : 'Add Code'}</span>
                </button>
              </div>
            </form>

            {/* Promo Codes List Table */}
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 bg-slate-950/60 font-cairo">
                    <th className="p-3 text-start">{language === 'ar' ? 'كود الخصم' : 'Code'}</th>
                    <th className="p-3 text-start">{language === 'ar' ? 'قيمة الخصم' : 'Discount'}</th>
                    <th className="p-3 text-start">{language === 'ar' ? 'الحد الأدنى' : 'Min Order'}</th>
                    <th className="p-3 text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="p-3 text-end">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(state?.promoCodes || []).map((promo) => (
                    <tr key={promo.code} className="hover:bg-slate-900/40">
                      <td className="p-3">
                        <span className="font-mono font-bold text-purple-300 bg-purple-950/80 px-2.5 py-1 rounded-lg border border-purple-500/30">
                          {promo.code}
                        </span>
                      </td>
                      <td className="p-3 text-emerald-400 font-bold">
                        {promo.discountPercent ? `${promo.discountPercent}%` : `${promo.discountFixedJOD} د.أ`}
                      </td>
                      <td className="p-3 text-slate-300">
                        {promo.minOrderAmountJOD ? `${promo.minOrderAmountJOD} د.أ` : (language === 'ar' ? 'لا يوجد حد' : 'No min')}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            promo.active
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {promo.active ? (language === 'ar' ? 'نشط ومتاح' : 'Active') : (language === 'ar' ? 'معطّل' : 'Inactive')}
                        </span>
                      </td>
                      <td className="p-3 text-end">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => togglePromoCode(promo.code)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                              promo.active ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {promo.active ? (language === 'ar' ? 'تعطيل' : 'Disable') : (language === 'ar' ? 'تفعيل' : 'Enable')}
                          </button>
                          <button
                            onClick={() => deletePromoCode(promo.code)}
                            className="p-1.5 rounded-lg bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 border border-rose-500/30"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3.5: BRANDING & LOGO */}
      {activeTab === 'branding' && (
        <div className="max-w-4xl space-y-6">
          <div className="p-6 rounded-3xl glass-card border border-white/10 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
                  <Palette className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-cairo">
                    {language === 'ar' ? 'إدارة الهوية البصرية والشعار' : 'Branding & Store Logo'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'ar'
                      ? 'تخصيص لوجو المتجر، العناوين، والشعارات التي تظهر للزبائن في الهيدر والفوتر'
                      : 'Customize store logo, header titles, and slogans displayed to customers'}
                  </p>
                </div>
              </div>

              <button
                id="save-branding-btn"
                onClick={() => triggerSaveNotification(language === 'ar' ? 'الهوية والشعار' : 'Branding')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 transition-all font-cairo"
              >
                <Save className="w-4 h-4" />
                <span>{language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}</span>
              </button>
            </div>

            {/* Logo Management Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-200 font-cairo flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span>{language === 'ar' ? 'شعار المتجر (Store Logo)' : 'Store Logo'}</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Logo Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1.5">
                      {language === 'ar' ? 'رابط صورة اللوجو (URL)' : 'Logo Image URL'}
                    </label>
                    <input
                      type="text"
                      placeholder="https://example.com/logo.png"
                      value={state.settings.branding?.logoUrl || ''}
                      onChange={(e) =>
                        updateSettings({
                          branding: {
                            ...state.settings.branding,
                            logoUrl: e.target.value,
                          },
                        })
                      }
                      className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100 font-mono focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1.5">
                      {language === 'ar' ? 'أو ارفع اللوجو مباشرة من جهازك' : 'Or Upload Logo From Device'}
                    </label>
                    <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-purple-500/40 bg-purple-950/20 hover:bg-purple-950/40 text-purple-300 cursor-pointer transition-all text-xs font-bold">
                      <Upload className="w-4 h-4" />
                      <span>{language === 'ar' ? 'اختر ملف صورة اللوجو (PNG / JPG / SVG / WebP)' : 'Choose Logo Image File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const base64 = event.target?.result as string;
                              if (base64) {
                                updateSettings({
                                  branding: {
                                    ...state.settings.branding,
                                    logoUrl: base64,
                                  },
                                });
                                triggerSaveNotification(language === 'ar' ? 'شعار المتجر' : 'Logo');
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Preset Logos */}
                  <div>
                    <span className="block text-xs text-slate-400 font-semibold mb-2">
                      {language === 'ar' ? 'نماذج شعارات جاهزة للألعاب (اختر للتعيين فوراً):' : 'Ready Gaming Logo Presets:'}
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { name: 'Neon Q', url: '/images/hero-wallet.svg' },
                        { name: 'Cyber Game', url: '/images/hero-ps5.svg' },
                        { name: 'Pixel Shield', url: '/images/hero-pickup.svg' },
                        { name: 'Crown Gold', url: '/images/hero-wukong.svg' },
                      ].map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            updateSettings({
                              branding: {
                                ...state.settings.branding,
                                logoUrl: preset.url,
                              },
                            });
                            triggerSaveNotification(preset.name);
                          }}
                          className="p-1 rounded-xl bg-slate-900 border border-slate-700 hover:border-purple-500 flex flex-col items-center gap-1 group transition-all"
                        >
                          <img src={preset.url} alt={preset.name} className="w-8 h-8 rounded-lg object-cover" />
                          <span className="text-[10px] text-slate-400 group-hover:text-purple-300 font-bold truncate max-w-full">
                            {preset.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Logo Live Preview */}
                <div className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-white/10">
                  <span className="text-xs text-slate-400 font-bold block">
                    {language === 'ar' ? 'معاينة الشعار المباشرة (Live Preview):' : 'Live Logo Preview:'}
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Dark Preview */}
                    <div className="p-4 rounded-xl bg-[#020617] border border-white/10 flex flex-col items-center justify-center text-center gap-2">
                      <span className="text-[10px] text-slate-400 font-bold">الوضع الليلي (Dark)</span>
                      {state.settings.branding?.logoUrl ? (
                        <img
                          src={state.settings.branding.logoUrl}
                          alt="Store Logo Dark Preview"
                          className="h-12 w-auto max-w-[120px] object-contain rounded-lg shadow-md"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl shadow-lg flex items-center justify-center font-black text-xl text-white">
                          Q
                        </div>
                      )}
                      <span className="text-xs font-black text-slate-100">
                        {state.settings.branding?.customHeaderTitleAr || state.settings.storeNameAr}
                      </span>
                    </div>

                    {/* Light Preview */}
                    <div className="p-4 rounded-xl bg-[#f8fafc] border border-slate-300 flex flex-col items-center justify-center text-center gap-2">
                      <span className="text-[10px] text-slate-600 font-bold">الوضع الفاتح (Light)</span>
                      {state.settings.branding?.logoUrl ? (
                        <img
                          src={state.settings.branding.logoUrl}
                          alt="Store Logo Light Preview"
                          className="h-12 w-auto max-w-[120px] object-contain rounded-lg shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl shadow-sm flex items-center justify-center font-black text-xl text-white">
                          Q
                        </div>
                      )}
                      <span className="text-xs font-black text-slate-900">
                        {state.settings.branding?.customHeaderTitleAr || state.settings.storeNameAr}
                      </span>
                    </div>
                  </div>

                  {state.settings.branding?.logoUrl && (
                    <button
                      onClick={() =>
                        updateSettings({
                          branding: {
                            ...state.settings.branding,
                            logoUrl: '',
                          },
                        })
                      }
                      className="text-[11px] text-rose-400 hover:underline flex items-center gap-1 mx-auto pt-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{language === 'ar' ? 'إزالة الشعار والعودة للشعار الافتراضي' : 'Reset to Default Q Logo'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Header Titles & Slogan */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h4 className="text-sm font-bold text-slate-200 font-cairo">
                {language === 'ar' ? 'عناوين المتجر والعبارات الترويجية' : 'Store Headers & Slogans'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">
                    {language === 'ar' ? 'عنوان الهيدر الرئيسي (بالعربي)' : 'Header Title (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={state.settings.branding?.customHeaderTitleAr || state.settings.storeNameAr}
                    onChange={(e) =>
                      updateSettings({
                        branding: {
                          ...state.settings.branding,
                          customHeaderTitleAr: e.target.value,
                        },
                      })
                    }
                    className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">
                    {language === 'ar' ? 'عنوان الهيدر الرئيسي (EN)' : 'Header Title (English)'}
                  </label>
                  <input
                    type="text"
                    value={state.settings.branding?.customHeaderTitleEn || state.settings.storeNameEn}
                    onChange={(e) =>
                      updateSettings({
                        branding: {
                          ...state.settings.branding,
                          customHeaderTitleEn: e.target.value,
                        },
                      })
                    }
                    className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">
                    {language === 'ar' ? 'الشعار اللفظي الفرعي (Slogan AR)' : 'Sub Slogan (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={state.settings.branding?.sloganAr || 'متجر الألعاب والبطاقات الرقمية في الأردن'}
                    onChange={(e) =>
                      updateSettings({
                        branding: {
                          ...state.settings.branding,
                          sloganAr: e.target.value,
                        },
                      })
                    }
                    className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">
                    {language === 'ar' ? 'الشعار اللفظي الفرعي (Slogan EN)' : 'Sub Slogan (English)'}
                  </label>
                  <input
                    type="text"
                    value={state.settings.branding?.sloganEn || 'Jordan Leading Digital Gaming Hub'}
                    onChange={(e) =>
                      updateSettings({
                        branding: {
                          ...state.settings.branding,
                          sloganEn: e.target.value,
                        },
                      })
                    }
                    className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Accent Color & Banner */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h4 className="text-sm font-bold text-slate-200 font-cairo">
                {language === 'ar' ? 'لون التمييز وبانر الخلفية' : 'Accent Color & Banner'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">
                    {language === 'ar' ? 'لون التمييز (Primary Accent)' : 'Primary Accent Color'}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={state.settings.branding?.primaryAccentColor || '#7c3aed'}
                      onChange={(e) =>
                        updateSettings({
                          branding: {
                            ...state.settings.branding,
                            primaryAccentColor: e.target.value,
                          },
                        })
                      }
                      className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={state.settings.branding?.primaryAccentColor || '#7c3aed'}
                      onChange={(e) =>
                        updateSettings({
                          branding: {
                            ...state.settings.branding,
                            primaryAccentColor: e.target.value,
                          },
                        })
                      }
                      className="w-32 p-2 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">
                    {language === 'ar' ? 'رابط بانر الهيدر (Header Banner URL)' : 'Header Banner URL'}
                  </label>
                  <input
                    type="text"
                    placeholder="/images/hero-subscriptions.svg"
                    value={state.settings.branding?.headerBannerUrl || ''}
                    onChange={(e) =>
                      updateSettings({
                        branding: {
                          ...state.settings.branding,
                          headerBannerUrl: e.target.value,
                        },
                      })
                    }
                    className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3.6: SOCIAL MEDIA ACCOUNTS */}
      {activeTab === 'socials' && (
        <div className="max-w-4xl space-y-6">
          <div className="p-6 rounded-3xl glass-card border border-white/10 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-pink-600/20 border border-pink-500/30 text-pink-400">
                  <Share2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-cairo">
                    {language === 'ar' ? 'إدارة حسابات ومواقع التواصل الاجتماعي' : 'Social Media Accounts'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'ar'
                      ? 'أضف روابط حساباتك الرسمية ليتمكن الزبائن من متابعتك والتواصل معك بسهولة'
                      : 'Manage your official social links displayed across the store'}
                  </p>
                </div>
              </div>

              <button
                id="save-socials-btn"
                onClick={() => triggerSaveNotification(language === 'ar' ? 'مواقع التواصل' : 'Social Accounts')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-lg shadow-pink-900/30 transition-all font-cairo"
              >
                <Save className="w-4 h-4" />
                <span>{language === 'ar' ? 'حفظ الحسابات' : 'Save Links'}</span>
              </button>
            </div>

            {/* Social Channels List */}
            <div className="space-y-4">
              {[
                {
                  id: 'whatsapp',
                  name: 'واتساب (WhatsApp)',
                  key: 'whatsapp',
                  placeholder: 'https://wa.me/962790000000 أو 0790000000',
                  color: 'emerald',
                  icon: MessageCircle,
                },
                {
                  id: 'instagram',
                  name: 'إنستغرام (Instagram)',
                  key: 'instagram',
                  placeholder: 'https://instagram.com/qwader.store',
                  color: 'pink',
                  icon: Globe,
                },
                {
                  id: 'facebook',
                  name: 'فيسبوك (Facebook)',
                  key: 'facebook',
                  placeholder: 'https://facebook.com/qwaderstore',
                  color: 'blue',
                  icon: Globe,
                },
                {
                  id: 'tiktok',
                  name: 'تيك توك (TikTok)',
                  key: 'tiktok',
                  placeholder: 'https://tiktok.com/@qwaderstore',
                  color: 'purple',
                  icon: Globe,
                },
                {
                  id: 'youtube',
                  name: 'يوتيوب (YouTube)',
                  key: 'youtube',
                  placeholder: 'https://youtube.com/@qwaderstore',
                  color: 'rose',
                  icon: Globe,
                },
                {
                  id: 'twitter',
                  name: 'إكس / تويتر (X)',
                  key: 'twitter',
                  placeholder: 'https://x.com/qwaderstore',
                  color: 'cyan',
                  icon: Globe,
                },
                {
                  id: 'telegram',
                  name: 'تيليجرام (Telegram)',
                  key: 'telegram',
                  placeholder: 'https://t.me/qwaderstore',
                  color: 'sky',
                  icon: Globe,
                },
                {
                  id: 'discord',
                  name: 'ديسكورد (Discord)',
                  key: 'discord',
                  placeholder: 'https://discord.gg/qwader',
                  color: 'indigo',
                  icon: Globe,
                },
                {
                  id: 'snapchat',
                  name: 'سناب شات (Snapchat)',
                  key: 'snapchat',
                  placeholder: 'https://snapchat.com/add/qwaderstore',
                  color: 'amber',
                  icon: Globe,
                },
                {
                  id: 'twitch',
                  name: 'تويتش (Twitch)',
                  key: 'twitch',
                  placeholder: 'https://twitch.tv/qwaderstore',
                  color: 'purple',
                  icon: Globe,
                },
              ].map((item) => {
                const currentVal = ((state.settings.socialLinks as any) || {})[item.key] || '';
                const Icon = item.icon;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-950/40 border border-white/5 hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 sm:w-1/3">
                      <div className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300">
                        <Icon className="w-4 h-4 text-purple-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-200 font-cairo">{item.name}</span>
                    </div>

                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={item.placeholder}
                        value={currentVal}
                        onChange={(e) =>
                          updateSettings({
                            socialLinks: {
                              ...state.settings.socialLinks,
                              [item.key]: e.target.value,
                            },
                          })
                        }
                        className="flex-1 p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100 font-mono focus:border-purple-500 focus:outline-none"
                      />

                      {currentVal && (
                        <button
                          type="button"
                          onClick={() => {
                            const url = currentVal.startsWith('http')
                              ? currentVal
                              : `https://${currentVal}`;
                            window.open(url, '_blank');
                          }}
                          className="p-2.5 rounded-xl bg-slate-900 hover:bg-purple-600/30 border border-slate-700 hover:border-purple-500 text-slate-300 hover:text-purple-300 text-xs font-bold transition-all flex items-center gap-1 flex-shrink-0"
                          title="اختبار الرابط"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">تجربة</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3.7: FULFILLMENT & SHIPPING RATES PER GOVERNORATE */}
      {activeTab === 'fulfillment' && (
        <div className="max-w-5xl space-y-6">
          {/* Main Pickup & Delivery Switches */}
          <div className="p-6 rounded-3xl glass-card border border-white/10 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-cairo">
                    {language === 'ar'
                      ? 'إعدادات الاستلام المباشر والشحن وتوصيل المحافظات'
                      : 'Pickup, Shipping & Governorate Rates'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'ar'
                      ? 'تحديد إمكانية استلام الزبون من المحل، تسعير التوصيل لكل محافظة أردنية، وشركات الشحن'
                      : 'Configure in-store pickup, per-governorate delivery prices, and courier partners'}
                  </p>
                </div>
              </div>

              <button
                id="save-fulfillment-btn"
                onClick={() => triggerSaveNotification(language === 'ar' ? 'إعدادات الشحن والتوصيل' : 'Fulfillment')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-900/30 transition-all font-cairo"
              >
                <Save className="w-4 h-4" />
                <span>{language === 'ar' ? 'حفظ الإعدادات' : 'Save Settings'}</span>
              </button>
            </div>

            {/* SECTION 1: IN-STORE PICKUP */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Store className="w-5 h-5 text-purple-400" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 font-cairo">
                      {language === 'ar' ? '1. الاستلام المباشر من الفرع / المحل (In-Store Pickup)' : '1. In-Store Pickup'}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {language === 'ar' ? 'السماح للعميل باختيار الاستلام شخصياً بدون رسوم شحن' : 'Allow customers to pick up orders directly at store with 0 shipping cost'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateSettings({
                      fulfillment: {
                        ...state.settings.fulfillment,
                        allowPickup: !state.settings.fulfillment?.allowPickup,
                      },
                    })
                  }
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    state.settings.fulfillment?.allowPickup
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {state.settings.fulfillment?.allowPickup ? '✓ ميزة الاستلام مفعّلة' : '✕ الاستلام معطّل'}
                </button>
              </div>

              {state.settings.fulfillment?.allowPickup && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">
                      {language === 'ar' ? 'عنوان الفرع للاستلام (بالعربي)' : 'Pickup Address (AR)'}
                    </label>
                    <input
                      type="text"
                      value={state.settings.fulfillment?.pickupAddressAr || ''}
                      onChange={(e) =>
                        updateSettings({
                          fulfillment: {
                            ...state.settings.fulfillment,
                            pickupAddressAr: e.target.value,
                          },
                        })
                      }
                      placeholder="عمان - الجبيهة - مجمع العبادي التجاري - الطابق 1"
                      className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">
                      {language === 'ar' ? 'عنوان الفرع للاستلام (EN)' : 'Pickup Address (EN)'}
                    </label>
                    <input
                      type="text"
                      value={state.settings.fulfillment?.pickupAddressEn || ''}
                      onChange={(e) =>
                        updateSettings({
                          fulfillment: {
                            ...state.settings.fulfillment,
                            pickupAddressEn: e.target.value,
                          },
                        })
                      }
                      placeholder="Amman - Jubeiha - Commercial Complex - 1st Floor"
                      className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">
                      {language === 'ar' ? 'ساعات الدوام واستقبال الزبائن' : 'Working / Pickup Hours'}
                    </label>
                    <input
                      type="text"
                      value={state.settings.fulfillment?.pickupWorkingHoursAr || ''}
                      onChange={(e) =>
                        updateSettings({
                          fulfillment: {
                            ...state.settings.fulfillment,
                            pickupWorkingHoursAr: e.target.value,
                          },
                        })
                      }
                      placeholder="يومياً من 11:00 صباحاً حتى 11:00 مساءً"
                      className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">
                      {language === 'ar' ? 'هاتف التنسيق والاستلام' : 'Pickup Coordinator Phone'}
                    </label>
                    <input
                      type="text"
                      value={state.settings.fulfillment?.pickupPhone || ''}
                      onChange={(e) =>
                        updateSettings({
                          fulfillment: {
                            ...state.settings.fulfillment,
                            pickupPhone: e.target.value,
                          },
                        })
                      }
                      placeholder="+962 7 9000 0000"
                      className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: GOVERNORATE DELIVERY RATES TABLE */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 font-cairo flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-cyan-400" />
                    <span>{language === 'ar' ? '2. تسعيرة التوصيل حسب المحافظة (Jordan Governorates)' : '2. Per-Governorate Shipping Rates'}</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    {language === 'ar'
                      ? 'يمكنك تعديل تكلفة التوصيل بالدينار الأردني لكل محافظة، أو إيقاف التوصيل لمحافظة معينة'
                      : 'Customize delivery fee in JOD for each governorate or enable/disable zones'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-900 border border-white/10 text-xs">
                    <span className="text-slate-400 font-bold">{language === 'ar' ? 'الشحن المجاني فوق:' : 'Free over:'}</span>
                    <input
                      type="number"
                      min={0}
                      value={state.settings.fulfillment?.freeShippingMinimumJOD || 0}
                      onChange={(e) =>
                        updateSettings({
                          fulfillment: {
                            ...state.settings.fulfillment,
                            freeShippingMinimumJOD: Number(e.target.value),
                          },
                        })
                      }
                      className="w-16 p-1 rounded bg-slate-950 border border-slate-700 text-amber-400 font-bold text-center text-xs"
                    />
                    <span className="text-slate-400">د.أ</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddGovForm(!showAddGovForm)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-600/30 text-xs font-bold transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'إضافة منطقة / محافظة' : 'Add Custom Zone'}</span>
                  </button>
                </div>
              </div>

              {/* Add Custom Governorate Form */}
              {showAddGovForm && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-3 animate-in fade-in">
                  <h5 className="text-xs font-bold text-cyan-300 font-cairo">
                    {language === 'ar' ? 'إضافة محافظة أو منطقة جديدة' : 'Add New Governorate or Region'}
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="اسم المحافظة بالعربي (مثال: رم / البتراء)"
                      value={newGovNameAr}
                      onChange={(e) => setNewGovNameAr(e.target.value)}
                      className="p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100"
                    />
                    <input
                      type="text"
                      placeholder="Governorate Name EN"
                      value={newGovNameEn}
                      onChange={(e) => setNewGovNameEn(e.target.value)}
                      className="p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        placeholder="السعر د.أ"
                        value={newGovPrice}
                        onChange={(e) => setNewGovPrice(Number(e.target.value))}
                        className="w-24 p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100 font-bold text-center"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newGovNameAr.trim()) return;
                          const newGov: GovernorateRate = {
                            id: `gov-${Date.now()}`,
                            nameAr: newGovNameAr.trim(),
                            nameEn: newGovNameEn.trim() || newGovNameAr.trim(),
                            priceJOD: Number(newGovPrice) || 3,
                            estimatedDaysAr: 'خلال 24-48 ساعة',
                            estimatedDaysEn: '24-48 Hours',
                            active: true,
                          };
                          const currentGovs = state.settings.fulfillment?.governorates || [];
                          updateSettings({
                            fulfillment: {
                              ...state.settings.fulfillment,
                              governorates: [...currentGovs, newGov],
                            },
                          });
                          setNewGovNameAr('');
                          setNewGovNameEn('');
                          setShowAddGovForm(false);
                          triggerSaveNotification(newGov.nameAr);
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-cyan-600 text-white font-bold text-xs"
                      >
                        إضافة
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Governorates Table */}
              <div className="overflow-x-auto rounded-2xl glass-card border border-white/10 p-2">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-cairo">
                      <th className="p-3 text-start">{language === 'ar' ? 'المحافظة' : 'Governorate'}</th>
                      <th className="p-3 text-center">{language === 'ar' ? 'سعر التوصيل (د.أ)' : 'Fee (JOD)'}</th>
                      <th className="p-3 text-center">{language === 'ar' ? 'مدة التوصيل التقريبية' : 'Estimated Time'}</th>
                      <th className="p-3 text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th className="p-3 text-end">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(state.settings.fulfillment?.governorates || []).map((gov) => (
                      <tr key={gov.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-slate-200">
                            {language === 'ar' ? gov.nameAr : gov.nameEn}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">{gov.nameEn}</span>
                        </td>

                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              value={gov.priceJOD}
                              onChange={(e) => {
                                const newPrice = Number(e.target.value);
                                const updatedGovs = (state.settings.fulfillment?.governorates || []).map((g) =>
                                  g.id === gov.id ? { ...g, priceJOD: newPrice } : g
                                );
                                updateSettings({
                                  fulfillment: {
                                    ...state.settings.fulfillment,
                                    governorates: updatedGovs,
                                  },
                                });
                              }}
                              className="w-16 p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-emerald-400 font-black text-center text-xs focus:border-cyan-500 focus:outline-none"
                            />
                            <span className="text-slate-400 text-xs">د.أ</span>
                          </div>
                        </td>

                        <td className="p-3 text-center text-slate-300">
                          <input
                            type="text"
                            value={gov.estimatedDaysAr || 'خلال 24-48 ساعة'}
                            onChange={(e) => {
                              const newDays = e.target.value;
                              const updatedGovs = (state.settings.fulfillment?.governorates || []).map((g) =>
                                g.id === gov.id ? { ...g, estimatedDaysAr: newDays } : g
                              );
                              updateSettings({
                                fulfillment: {
                                  ...state.settings.fulfillment,
                                  governorates: updatedGovs,
                                },
                              });
                            }}
                            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 text-center text-[11px] w-36"
                          />
                        </td>

                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const updatedGovs = (state.settings.fulfillment?.governorates || []).map((g) =>
                                g.id === gov.id ? { ...g, active: !g.active } : g
                              );
                              updateSettings({
                                fulfillment: {
                                  ...state.settings.fulfillment,
                                  governorates: updatedGovs,
                                },
                              });
                            }}
                            className={`px-3 py-1 rounded-full text-[10px] font-black transition-all ${
                              gov.active
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {gov.active ? (language === 'ar' ? 'متاح للتوصيل' : 'Active') : (language === 'ar' ? 'معطّل' : 'Disabled')}
                          </button>
                        </td>

                        <td className="p-3 text-end">
                          <button
                            type="button"
                            onClick={() => {
                              const updatedGovs = (state.settings.fulfillment?.governorates || []).filter(
                                (g) => g.id !== gov.id
                              );
                              updateSettings({
                                fulfillment: {
                                  ...state.settings.fulfillment,
                                  governorates: updatedGovs,
                                },
                              });
                            }}
                            className="p-1.5 rounded-lg bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 border border-rose-500/30"
                            title="حذف المحافظة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 3: DELIVERY COMPANIES MANAGEMENT */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 font-cairo flex items-center gap-2">
                    <Building className="w-4 h-4 text-cyan-400" />
                    <span>{language === 'ar' ? '3. شركات الشحن ومندوبي التوصيل (Courier Companies)' : '3. Delivery Companies'}</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    {language === 'ar'
                      ? 'إدارة شركات التوصيل التي تظهر للزبون عند اختيار الشحن للمنزل'
                      : 'Manage courier companies available to customers at checkout'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddCompForm(!showAddCompForm)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-600/30 text-xs font-bold transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'إضافة شركة توصيل جديدة' : 'Add Delivery Partner'}</span>
                </button>
              </div>

              {/* Add Delivery Company Form */}
              {showAddCompForm && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-3 animate-in fade-in">
                  <h5 className="text-xs font-bold text-cyan-300 font-cairo">
                    {language === 'ar' ? 'إضافة شركة توصيل أو مندوب جديد' : 'Add New Courier Partner'}
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="اسم الشركة بالعربي (مثال: أرامكس الأردن)"
                      value={newCompNameAr}
                      onChange={(e) => setNewCompNameAr(e.target.value)}
                      className="p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100"
                    />
                    <input
                      type="text"
                      placeholder="Company Name (EN)"
                      value={newCompNameEn}
                      onChange={(e) => setNewCompNameEn(e.target.value)}
                      className="p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100"
                    />
                    <input
                      type="text"
                      placeholder="رقم هاتف الشركة / الدعم"
                      value={newCompPhone}
                      onChange={(e) => setNewCompPhone(e.target.value)}
                      className="p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                    />
                    <input
                      type="text"
                      placeholder="رابط تتبع الشحنات (URL)"
                      value={newCompTracking}
                      onChange={(e) => setNewCompTracking(e.target.value)}
                      className="p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100 font-mono sm:col-span-2"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newCompNameAr.trim()) return;
                        const newComp: DeliveryCompany = {
                          id: `comp-${Date.now()}`,
                          nameAr: newCompNameAr.trim(),
                          nameEn: newCompNameEn.trim() || newCompNameAr.trim(),
                          phone: newCompPhone.trim() || '+962 6 5000000',
                          trackingUrl: newCompTracking.trim() || 'https://aramex.com',
                          estimatedDaysAr: newCompDaysAr,
                          estimatedDaysEn: newCompDaysEn,
                          active: true,
                        };
                        const currentComps = state.settings.fulfillment?.deliveryCompanies || [];
                        updateSettings({
                          fulfillment: {
                            ...state.settings.fulfillment,
                            deliveryCompanies: [...currentComps, newComp],
                          },
                        });
                        setNewCompNameAr('');
                        setNewCompNameEn('');
                        setNewCompPhone('');
                        setNewCompTracking('');
                        setShowAddCompForm(false);
                        triggerSaveNotification(newComp.nameAr);
                      }}
                      className="py-2.5 rounded-xl bg-cyan-600 text-white font-bold text-xs"
                    >
                      حفظ الشركة
                    </button>
                  </div>
                </div>
              )}

              {/* Delivery Companies Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(state.settings.fulfillment?.deliveryCompanies || []).map((comp) => (
                  <div
                    key={comp.id}
                    className="p-4 rounded-2xl glass-card border border-white/10 space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h5 className="text-xs font-bold text-slate-100 font-cairo">
                          {language === 'ar' ? comp.nameAr : comp.nameEn}
                        </h5>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedComps = (state.settings.fulfillment?.deliveryCompanies || []).map((c) =>
                              c.id === comp.id ? { ...c, active: !c.active } : c
                            );
                            updateSettings({
                              fulfillment: {
                                ...state.settings.fulfillment,
                                deliveryCompanies: updatedComps,
                              },
                            });
                          }}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            comp.active
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {comp.active ? 'متاح' : 'معطّل'}
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono" dir="ltr">
                        <Phone className="w-3 h-3 text-cyan-400" />
                        <span>{comp.phone}</span>
                      </p>

                      <p className="text-[11px] text-purple-300 mt-1">
                        ⏱️ {language === 'ar' ? comp.estimatedDaysAr : comp.estimatedDaysEn}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      {comp.trackingUrl ? (
                        <a
                          href={comp.trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>رابط التتبع</span>
                        </a>
                      ) : (
                        <span />
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          const updatedComps = (state.settings.fulfillment?.deliveryCompanies || []).filter(
                            (c) => c.id !== comp.id
                          );
                          updateSettings({
                            fulfillment: {
                              ...state.settings.fulfillment,
                              deliveryCompanies: updatedComps,
                            },
                          });
                        }}
                        className="p-1 rounded-lg text-rose-400 hover:bg-rose-950/40"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'users' && isOwner && (
        <div className="space-y-6">
          <div className="overflow-x-auto rounded-3xl glass-card border border-white/10 p-2">
            <table className="w-full text-xs text-start border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-cairo">
                  <th className="p-3 text-start">المستخدم</th>
                  <th className="p-3 text-start">الهاتف</th>
                  <th className="p-3 text-center">أمان 2FA</th>
                  <th className="p-3 text-center">الدور الحالي</th>
                  <th className="p-3 text-end">تغيير الصلاحيات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(state?.users || []).map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/40">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="w-8 h-8 rounded-full object-cover border border-white/10"
                        />
                        <div>
                          <h5 className="font-bold text-slate-200">{u.name}</h5>
                          <span className="text-[10px] text-slate-400">{u.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 text-slate-300 font-mono" dir="ltr">
                      {u.phone}
                    </td>

                    <td className="p-3 text-center">
                      {u.twoFactorEnabled ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <ShieldCheck className="w-3 h-3 text-amber-400" />
                          <span>2FA مفعّل</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-white/5">
                          <Shield className="w-3 h-3 text-slate-500" />
                          <span>غير مفعل</span>
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          u.role === 'owner'
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                            : u.role === 'staff'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                            : 'bg-slate-900 text-slate-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="p-3 text-end">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleRoleChangeWithVerification(u.id, 'owner', u.name)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            u.role === 'owner' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          Owner
                        </button>
                        <button
                          onClick={() => handleRoleChangeWithVerification(u.id, 'staff', u.name)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            u.role === 'staff' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          Staff
                        </button>
                        <button
                          onClick={() => handleRoleChangeWithVerification(u.id, 'customer', u.name)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            u.role === 'customer' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          Customer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: REVIEWS MODERATION */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-200 font-cairo">
            إدارة ومراجعة تقييمات الزبائن ({(state?.reviews || []).length})
          </h3>
          <div className="space-y-3">
            {(state?.reviews || []).map((rev) => {
              const product = (state?.products || []).find((p) => p.id === rev.productId);
              return (
                <div
                  key={rev.id}
                  className="p-4 rounded-2xl glass-card border border-white/10 flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-200">{rev.userName}</span>
                      <span className="text-amber-400 text-xs">★ {rev.rating}</span>
                      {product && (
                        <span className="text-[11px] text-purple-400">
                          على: {product.nameAr}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300">{rev.comment}</p>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {new Date(rev.createdAt).toLocaleDateString('ar-JO')}
                    </span>
                  </div>

                  <button
                    onClick={() => deleteReview(rev.id)}
                    className="p-2 rounded-xl bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 border border-rose-500/30"
                    title="حذف المراجعة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: SUPPORT TICKETS */}
      {activeTab === 'support' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-400 font-cairo">
              تذاكر الدعم الواردة ({(state?.supportTickets || []).length})
            </h4>
            <div className="space-y-2 max-h-[450px] overflow-y-auto">
              {(state?.supportTickets || []).map((tk) => (
                <div
                  key={tk.id}
                  onClick={() => setSelectedSupportTicketId(tk.id)}
                  className={`p-3 rounded-2xl border cursor-pointer ${
                    selectedSupportTicketId === tk.id
                      ? 'bg-purple-950/70 border-purple-500 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="font-bold text-purple-300">{tk.userName}</span>
                    <span className={tk.status === 'open' ? 'text-emerald-400' : 'text-slate-500'}>
                      {tk.status === 'open' ? 'نشطة' : 'مغلقة'}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold truncate">{tk.subject}</h5>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8">
            {activeSupportTicket ? (
              <div className="rounded-3xl glass-card border border-white/10 overflow-hidden flex flex-col h-[480px]">
                <div className="p-4 border-b border-white/10 bg-slate-950/60 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-100 font-cairo">{activeSupportTicket.subject}</h4>
                    <span className="text-[10px] text-slate-400">
                      {activeSupportTicket.userName} ({activeSupportTicket.userPhone})
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      updateTicketStatus(
                        activeSupportTicket.id,
                        activeSupportTicket.status === 'open' ? 'closed' : 'open'
                      )
                    }
                    className="px-3.5 py-1 rounded-full text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300"
                  >
                    {activeSupportTicket.status === 'open' ? 'إغلاق التذكرة' : 'إعادة فتح التذكرة'}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/30">
                  {(activeSupportTicket.messages || []).map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-2xl text-xs max-w-[85%] ${
                        m.senderRole === 'owner' || m.senderRole === 'staff'
                          ? 'ms-auto bg-purple-600/80 text-white'
                          : 'me-auto bg-slate-900 border border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="text-[10px] opacity-75 mb-1 font-bold">{m.senderName}</div>
                      {m.text}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAdminSendReply} className="p-3 border-t border-white/10 bg-slate-950 flex gap-2">
                  <input
                    type="text"
                    value={adminReplyText}
                    onChange={(e) => setAdminReplyText(e.target.value)}
                    placeholder="الرد على العميل باسم إدارة متجر قويدر..."
                    className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100 focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-purple-600 text-white text-xs font-bold"
                  >
                    إرسال
                  </button>
                </form>
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-12 glass-panel border border-white/10 rounded-3xl">
                اختر تذكرة للرد عليها
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: STORE SETTINGS (OWNER ONLY) */}
      {activeTab === 'settings' && isOwner && (
        <div className="max-w-3xl space-y-6">
          <div className="p-6 rounded-3xl glass-card border border-white/10 space-y-4">
            <h3 className="text-base font-bold text-slate-100 font-cairo">
              {t.tabSettings}
            </h3>

            {/* Maintenance Mode Toggle */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-between">
              <div>
                <h5 className="text-xs font-bold text-slate-100 font-cairo">{t.maintenanceMode}</h5>
                <p className="text-[11px] text-slate-400">
                  تفعيل شاشة الصيانة للعملاء وتوجيههم للتواصل عبر الواتساب
                </p>
              </div>
              <button
                id="toggle-maintenance-mode-btn"
                onClick={() => updateSettings({ maintenanceMode: !state.settings.maintenanceMode })}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  state.settings.maintenanceMode
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {state.settings.maintenanceMode ? 'وضع الصيانة مفعّل ⚠️' : 'المتجر يعمل بشكل طبيعي'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">اسم المتجر بالعربي</label>
                <input
                  type="text"
                  value={state.settings.storeNameAr}
                  onChange={(e) => updateSettings({ storeNameAr: e.target.value })}
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">Store Name (EN)</label>
                <input
                  type="text"
                  value={state.settings.storeNameEn}
                  onChange={(e) => updateSettings({ storeNameEn: e.target.value })}
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">اسم مستعار كليك (CliQ Alias)</label>
                <input
                  type="text"
                  value={state.settings.cliqAlias}
                  onChange={(e) => updateSettings({ cliqAlias: e.target.value })}
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">بيانات كليك الإضافية (CliQ IBAN)</label>
                <input
                  type="text"
                  value={state.settings.cliqIBAN}
                  onChange={(e) => updateSettings({ cliqIBAN: e.target.value })}
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">اسم البنك</label>
                <input
                  type="text"
                  value={state.settings.bankNameAr}
                  onChange={(e) => updateSettings({ bankNameAr: e.target.value })}
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">اسم صاحب الحساب</label>
                <input
                  type="text"
                  value={state.settings.bankAccountName}
                  onChange={(e) => updateSettings({ bankAccountName: e.target.value })}
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">رقم الواتساب الرسمي</label>
                <input
                  type="text"
                  value={state.settings.whatsappNumber}
                  onChange={(e) => updateSettings({ whatsappNumber: e.target.value })}
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">الآيبان البنكي (IBAN)</label>
                <input
                  type="text"
                  value={state.settings.bankIBAN}
                  onChange={(e) => updateSettings({ bankIBAN: e.target.value })}
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: BACKUP & RESTORE (OWNER ONLY) */}
      {activeTab === 'backup' && isOwner && (
        <div className="max-w-2xl space-y-6">
          <div className="p-6 rounded-3xl glass-card border border-white/10 space-y-4">
            <h3 className="text-base font-bold text-slate-100 font-cairo flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-400" />
              <span>{t.tabBackup}</span>
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              يمكنك تصدير نسخة احتياطية كاملة لكافة بيانات المتجر (المنتجات، الطلبات، المستخدمين، التقييمات، والإعدادات) بصيغة ملف JSON واستعادتها بأي وقت.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                id="admin-export-backup-btn"
                onClick={exportDataJson}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>{t.backupDownload}</span>
              </button>

              <label className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-slate-900 border border-slate-700 text-slate-200 hover:border-purple-500 text-xs font-bold cursor-pointer transition-all">
                <Upload className="w-4 h-4 text-purple-400" />
                <span>{t.backupRestore}</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const content = event.target?.result as string;
                        if (content) importDataJson(content);
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </label>
            </div>

            <div className="pt-6 border-t border-white/10">
              <button
                id="admin-factory-reset-btn"
                onClick={handleFactoryResetWithVerification}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-rose-950/40 border border-rose-500/40 text-rose-300 hover:bg-rose-900/50 text-xs font-bold transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t.factoryReset}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT ADD / EDIT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => setIsProductModalOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          <div className="relative w-full max-w-2xl rounded-3xl glass-panel p-6 sm:p-8 border border-white/10 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <h3 className="text-base font-bold text-slate-100 font-cairo">
                {editingProduct ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد للكتالوج'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-900/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">اسم المنتج بالعربي *</label>
                  <input
                    type="text"
                    required
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Product Name (EN)</label>
                  <input
                    type="text"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">القسم *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200"
                  >
                    <option value="games">ألعاب PlayStation</option>
                    <option value="subscriptions">اشتراكات PlayStation Plus</option>
                    <option value="psn_cards">بطاقات PSN</option>
                    <option value="steam_cards">بطاقات Steam</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">المنصة</label>
                  <input
                    type="text"
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">السعر (د.أ JOD) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.priceJOD}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priceJOD: parseFloat(e.target.value) || 0,
                        priceUSD: parseFloat(e.target.value) * 1.41,
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">السعر الأصلي (قبل الخصم)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.originalPriceJOD}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        originalPriceJOD: parseFloat(e.target.value) || 0,
                        originalPriceUSD: parseFloat(e.target.value) * 1.41,
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">الكمية المتوفرة بالمخزون *</label>
                  <input
                    type="number"
                    required
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">نوع التسليم</label>
                  <input
                    type="text"
                    value={formData.deliveryTypeAr}
                    onChange={(e) => setFormData({ ...formData, deliveryTypeAr: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">رابط صورة الغلاف (URL)</label>
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-start"
                    dir="ltr"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">الميزات (مفصولة بفاصلة)</label>
                  <input
                    type="text"
                    value={formData.featuresAr}
                    onChange={(e) => setFormData({ ...formData, featuresAr: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-slate-800 text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-900/30"
                >
                  حفظ المنتج
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
