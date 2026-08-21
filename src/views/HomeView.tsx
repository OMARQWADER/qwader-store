import React from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/common/ProductCard';
import { HeroSlider } from '../components/common/HeroSlider';
import {
  Gamepad2,
  Zap,
  Flame,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Headphones,
  ArrowRight,
  ArrowLeft,
  Star,
  Layers,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  Award
} from 'lucide-react';
import { ProductCategory } from '../types';

export const HomeView: React.FC = () => {
  const { state, language, navigateTo, bestSellerProductIds, t } = useStore();

  // Get Best Sellers dynamically
  const bestSellerProducts = bestSellerProductIds
    .map((id) => state.products.find((p) => p.id === id))
    .filter(Boolean) as typeof state.products;

  // Featured Deals
  const featuredProducts = state.products.filter((p) => p.isFeatured).slice(0, 4);

  const categories: { id: ProductCategory; nameAr: string; nameEn: string; icon: string; descAr: string; descEn: string; gradient: string }[] = [
    {
      id: 'games',
      nameAr: 'ألعاب PlayStation 5 & 4',
      nameEn: 'PlayStation Games',
      icon: '🎮',
      descAr: 'أقوى ألعاب السوني حسابات أصلية أساسية وتفعيل فوري',
      descEn: 'Top PS5 & PS4 titles with primary accounts & instant play',
      gradient: 'from-blue-600/30 to-indigo-600/30 border-blue-500/40',
    },
    {
      id: 'subscriptions',
      nameAr: 'اشتراكات PlayStation Plus',
      nameEn: 'PlayStation Plus',
      icon: '🌟',
      descAr: 'ديلوكس، إكسترا، وإيسنشال بأسعار توفير حقيقية سنوية وشهرية',
      descEn: 'Deluxe, Extra & Essential tiers with huge annual savings',
      gradient: 'from-amber-600/30 to-yellow-600/30 border-amber-500/40',
    },
    {
      id: 'psn_cards',
      nameAr: 'بطاقات PlayStation (PSN)',
      nameEn: 'PSN Gift Cards',
      icon: '💳',
      descAr: 'شحن رصيد ستور أمريكي وسعودي بأكواد رقمية أصلية 100%',
      descEn: 'US & Saudi wallet top-up with 100% authentic codes',
      gradient: 'from-cyan-600/30 to-blue-600/30 border-cyan-500/40',
    },
    {
      id: 'steam_cards',
      nameAr: 'بطاقات محفظة Steam (PC)',
      nameEn: 'Steam Wallet Cards',
      icon: '🚀',
      descAr: 'أكواد عالمية لشحن رصيد ستيم فوراً لعشاق ألعاب البي سي',
      descEn: 'Global Steam wallet keys for ultimate PC gaming deals',
      gradient: 'from-fuchsia-600/30 to-pink-600/30 border-fuchsia-500/40',
    },
  ];

  return (
    <div className="space-y-12 sm:space-y-16 pb-12">
      
      {/* 1. Touch-Friendly Interactive Hero Slider */}
      <section className="relative pt-3 sm:pt-6 overflow-hidden">
        {/* Background ambient radial glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-purple-600/15 via-pink-600/10 to-indigo-600/15 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute top-0 right-10 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

        {/* Hero Slider Component */}
        <HeroSlider />

        {/* Fast Value Proposition Strip under Slider */}
        <div className="max-w-7xl mx-auto px-4 mt-6">
          <div className="p-3.5 sm:p-4 rounded-2xl glass-card border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center sm:text-start">
            <div className="flex items-center justify-center sm:justify-start gap-2.5 px-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-100 block">
                  {language === 'ar' ? 'دفع كليك فوري (CliQ)' : 'Instant CliQ Transfer'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {language === 'ar' ? 'بدون أي عمولة عبر QWADERPAY' : '0% fees via QWADERPAY'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-2.5 px-2 border-t sm:border-t-0 sm:border-s border-white/10 pt-2 sm:pt-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-100 block">
                  {language === 'ar' ? 'ضمان رسمي وأصلي 100%' : '100% Genuine & Guaranteed'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {language === 'ar' ? 'حسابات أساسية وأكواد معتمدة' : 'Official primary accounts & keys'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-2.5 px-2 border-t sm:border-t-0 sm:border-s border-white/10 pt-2 sm:pt-0">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
                <Headphones className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-100 block">
                  {language === 'ar' ? 'تسليم فوري ودعم واتساب' : 'Instant Delivery & Support'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {language === 'ar' ? 'استلم كودك خلال دقائق' : 'Keys in minutes on WhatsApp'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Fast Banners */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((cat) => (
            <div
              key={cat.id}
              id={`cat-card-${cat.id}`}
              onClick={() => navigateTo(`#store?category=${cat.id}`)}
              className="p-6 rounded-2xl glass-card border border-white/10 hover:border-purple-500/50 cursor-pointer group hover:-translate-y-1.5 hover:shadow-[0_0_25px_rgba(147,51,234,0.2)] transition-all duration-300"
            >
              <div className="text-3xl mb-3">{cat.icon}</div>
              <h3 className="text-base font-bold text-slate-100 group-hover:text-purple-300 transition-colors font-cairo mb-1">
                {language === 'ar' ? cat.nameAr : cat.nameEn}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                {language === 'ar' ? cat.descAr : cat.descEn}
              </p>
              <div className="flex items-center gap-1 text-xs font-bold text-purple-400 group-hover:text-purple-300">
                <span>{language === 'ar' ? 'تصفح القسم' : 'Browse'}</span>
                {language === 'ar' ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Best Sellers Section (الأكثر مبيعاً) */}
      <section id="best-sellers-section" className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-pink-400 mb-1.5">
              <Flame className="w-4 h-4 fill-pink-400" />
              <span>{language === 'ar' ? 'تفضيلات اللاعبين في الأردن' : 'Top Player Favorites'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-100 font-cairo">
              {t.bestSellers}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {t.bestSellersSubtitle}
            </p>
          </div>

          <button
            id="view-all-bestsellers-btn"
            onClick={() => navigateTo('#store')}
            className="flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors self-start sm:self-auto"
          >
            <span>{language === 'ar' ? 'عرض كل منتجات المتجر' : 'View all store products'}</span>
            {language === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Best Sellers Grid */}
        <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5 lg:gap-6">
          {bestSellerProducts.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 3. Featured Deals Section (عروض حصرية) */}
      <section className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 mb-1.5">
              <Sparkles className="w-4 h-4" />
              <span>{language === 'ar' ? 'توفير حقيقي وأسعار منافسة' : 'Unbeatable Value'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-100 font-cairo">
              {t.featuredDeals}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {t.featuredDealsSubtitle}
            </p>
          </div>

          <button
            id="view-all-featured-btn"
            onClick={() => navigateTo('#store')}
            className="flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors self-start sm:self-auto"
          >
            <span>{language === 'ar' ? 'تصفح كافة العروض' : 'Browse all deals'}</span>
            {language === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Featured Deals Grid */}
        <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5 lg:gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 4. How It Works: 3 Simple Steps */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="p-8 sm:p-12 rounded-3xl glass-card border border-white/10 relative overflow-hidden">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="px-3.5 py-1 rounded-full text-xs font-bold text-purple-300 bg-purple-950/80 border border-purple-500/40">
              {language === 'ar' ? 'كيف يعمل متجر كوادر؟' : 'How It Works'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-100 font-cairo mt-3 mb-2">
              {language === 'ar' ? '3 خطوات بسيطة وكودك بجيبتك ⚡' : '3 Simple Steps to Get Your Game ⚡'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {language === 'ar' ? 'تجربة شراء رقمية فورية وآمنة بالكامل داخل الأردن' : 'Fast, reliable and verified digital gaming experience'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 text-center relative">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-400 text-lg font-black flex items-center justify-center mx-auto mb-4 font-display">
                1
              </div>
              <h3 className="text-base font-bold text-slate-100 mb-2 font-cairo">
                {language === 'ar' ? 'اختر لعبتك أو بطاقتك' : 'Select Your Item'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {language === 'ar' ? 'تصفح قائمة الألعاب وبطاقات PSN وSteam وأضفها لسلة مشترياتك.' : 'Choose from our verified PS5 games, Plus subs, and gift cards.'}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 text-center relative">
              <div className="w-12 h-12 rounded-2xl bg-pink-600/20 border border-pink-500/40 text-pink-400 text-lg font-black flex items-center justify-center mx-auto mb-4 font-display">
                2
              </div>
              <h3 className="text-base font-bold text-slate-100 mb-2 font-cairo">
                {language === 'ar' ? 'ادفع محلياً عبر كليك (CliQ)' : 'Pay Locally via CliQ'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {language === 'ar' ? 'حول المبلغ عبر كليك باسم QWADERPAY أو التحويل البنكي بدون عمولة.' : 'Direct transfer to alias QWADERPAY with instant confirmation.'}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 text-center relative">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 text-lg font-black flex items-center justify-center mx-auto mb-4 font-display">
                3
              </div>
              <h3 className="text-base font-bold text-slate-100 mb-2 font-cairo">
                {language === 'ar' ? 'استلم كودك بدقائق معدودة' : 'Instant Digital Delivery'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {language === 'ar' ? 'يصلك الكود أو بيانات التفعيل فوراً عبر الواتساب والإيميل مع ضمان كامل.' : 'Receive your code/account on WhatsApp & Email within 5 minutes.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Customer Testimonials & Reviews */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-400 mb-2">
            <Star className="w-4 h-4 fill-amber-400" />
            <Star className="w-4 h-4 fill-amber-400" />
            <Star className="w-4 h-4 fill-amber-400" />
            <Star className="w-4 h-4 fill-amber-400" />
            <Star className="w-4 h-4 fill-amber-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-100 font-cairo">
            {language === 'ar' ? 'آراء زبائننا في الأردن' : 'What Jordanian Gamers Say'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {language === 'ar' ? 'تقييمات وتجارب حقيقية من مجتمع لاعبي البلايستيشن والـ PC' : 'Authentic feedback on speed, authenticity, and support'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {state.reviews.slice(0, 3).map((rev) => {
            const product = state.products.find((p) => p.id === rev.productId);
            return (
              <div
                key={rev.id}
                className="p-5 rounded-2xl glass-card border border-white/10 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center text-amber-400">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {new Date(rev.createdAt).toLocaleDateString('ar-JO')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed mb-4 italic">
                    "{rev.comment}"
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-300">{rev.userName}</div>
                  {product && (
                    <span className="text-[10px] text-purple-400 truncate max-w-[130px]">
                      {language === 'ar' ? product.nameAr : product.nameEn}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
