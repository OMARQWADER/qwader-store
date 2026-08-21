import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/common/ProductCard';
import {
  ArrowLeft,
  ArrowRight,
  ShoppingCart,
  Zap,
  Heart,
  SlidersHorizontal,
  Star,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  MessageSquare,
  Sparkles,
  User,
  Plus,
  Minus,
  Send,
  Trash2,
  Filter,
  Check,
  Award,
  ThumbsUp
} from 'lucide-react';

interface ProductDetailViewProps {
  productId: string;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({ productId }) => {
  const {
    state,
    currentUser,
    language,
    formatPrice,
    addToCart,
    toggleWishlist,
    isInWishlist,
    toggleCompare,
    isInCompare,
    addReview,
    deleteReview,
    navigateTo,
    bestSellerProductIds,
    t,
  } = useStore();

  const product = useMemo(() => {
    return state.products.find((p) => p.id === productId) || state.products[0];
  }, [state.products, productId]);

  const [quantity, setQuantity] = useState(1);
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [selectedFilterRating, setSelectedFilterRating] = useState<number | null>(null);

  const isFavorite = isInWishlist(product.id);
  const isCompared = isInCompare(product.id);
  const isBestSeller = bestSellerProductIds.slice(0, 4).includes(product.id);
  const isOutOfStock = product.stockQuantity <= 0;
  const isLowStock = !isOutOfStock && product.stockQuantity <= product.lowStockThreshold;

  const productReviews = useMemo(() => {
    return state.reviews.filter((r) => r.productId === product.id);
  }, [state.reviews, product.id]);

  const filteredReviews = useMemo(() => {
    if (selectedFilterRating === null) return productReviews;
    return productReviews.filter((r) => r.rating === selectedFilterRating);
  }, [productReviews, selectedFilterRating]);

  // Rating breakdown counts
  const ratingStats = useMemo(() => {
    const total = productReviews.length;
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    productReviews.forEach((r) => {
      if (counts[r.rating] !== undefined) {
        counts[r.rating]++;
      }
    });

    const percentages: Record<number, number> = {
      5: total > 0 ? Math.round((counts[5] / total) * 100) : 0,
      4: total > 0 ? Math.round((counts[4] / total) * 100) : 0,
      3: total > 0 ? Math.round((counts[3] / total) * 100) : 0,
      2: total > 0 ? Math.round((counts[2] / total) * 100) : 0,
      1: total > 0 ? Math.round((counts[1] / total) * 100) : 0,
    };

    return { total, counts, percentages };
  }, [productReviews]);

  const discountPercent =
    product.originalPriceJOD && product.originalPriceJOD > product.priceJOD
      ? Math.round(((product.originalPriceJOD - product.priceJOD) / product.originalPriceJOD) * 100)
      : null;

  const relatedProducts = state.products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const handleInstantBuy = () => {
    addToCart(product, quantity);
    navigateTo('#checkout');
  };

  const activeDisplayRating = hoverRating !== null ? hoverRating : reviewRating;

  const getRatingLabel = (rating: number) => {
    if (language === 'ar') {
      switch (rating) {
        case 5:
          return 'ممتاز جداً — أنصح به بشدة 🌟';
        case 4:
          return 'جيد جداً — تجربة رائعة 👍';
        case 3:
          return 'جيد — أداء مقبول 👌';
        case 2:
          return 'مقبول — يحتاج تحسين ⚠️';
        case 1:
          return 'ضعيف — غير راضٍ ❌';
        default:
          return 'ممتاز';
      }
    } else {
      switch (rating) {
        case 5:
          return 'Excellent — Highly Recommended 🌟';
        case 4:
          return 'Very Good — Great Experience 👍';
        case 3:
          return 'Good — Average Experience 👌';
        case 2:
          return 'Fair — Needs Improvement ⚠️';
        case 1:
          return 'Poor — Unsatisfied ❌';
        default:
          return 'Excellent';
      }
    }
  };

  const quickReviewTags = language === 'ar'
    ? [
        '⚡ تسليم فوري وسريع',
        '🎮 الكود أصلي وشغال 100%',
        '🤝 تعامل راقي ودعم ممتاز',
        '💎 أفضل سعر وجودة مضمونة',
        '⭐ أنصح به كل اللاعبين'
      ]
    : [
        '⚡ Super fast instant delivery',
        '🎮 100% genuine working code',
        '🤝 Helpful & quick support',
        '💎 Best price & top quality',
        '⭐ Highly recommended to all gamers'
      ];

  const handleAddQuickTag = (tag: string) => {
    setReviewComment((prev) => {
      const cleanPrev = prev.trim();
      if (!cleanPrev) return tag;
      if (cleanPrev.includes(tag)) return prev;
      return `${cleanPrev} - ${tag}`;
    });
    setReviewError('');
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setReviewError(language === 'ar' ? 'يرجى تسجيل الدخول أولاً لإضافة تقييمك' : 'Please log in first to submit your review');
      return;
    }

    const trimmedComment = reviewComment.trim();
    if (!trimmedComment) {
      setReviewError(language === 'ar' ? 'يرجى كتابة نص المراجعة والتعليق' : 'Please write your review comment');
      return;
    }
    if (trimmedComment.length < 3) {
      setReviewError(language === 'ar' ? 'يجب أن يحتوي التعليق على 3 أحرف على الأقل' : 'Comment must be at least 3 characters');
      return;
    }

    setIsSubmittingReview(true);
    const res = addReview(product.id, reviewRating, trimmedComment);
    setIsSubmittingReview(false);

    if (res.success) {
      setReviewComment('');
      setReviewError('');
    } else if (res.message) {
      setReviewError(res.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      
      {/* Back Navigation Bar */}
      <button
        id="product-back-to-store-btn"
        onClick={() => navigateTo('#store')}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-purple-300 transition-colors px-4 py-2 rounded-full glass-card border border-white/10"
      >
        {language === 'ar' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        <span>{language === 'ar' ? 'العودة لكتالوج المتجر' : 'Back to Store'}</span>
      </button>

      {/* Main Product Presentation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: High-Res Image Showcase (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative rounded-3xl glass-card border border-white/10 overflow-hidden shadow-2xl p-3">
            <div className="relative pt-[80%] rounded-2xl overflow-hidden bg-slate-900">
              <img
                src={product.image}
                alt={product.nameAr}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

              {/* Floating badges */}
              <div className="absolute top-4 inset-x-4 flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-slate-950/80 text-purple-300 border border-purple-500/40 backdrop-blur-md">
                  {product.platform}
                </span>

                {isBestSeller && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950 flex items-center gap-1 shadow-lg shadow-amber-500/30 animate-pulse">
                    <Flame className="w-3.5 h-3.5 fill-slate-950" />
                    <span>{language === 'ar' ? 'الأكثر مبيعاً' : 'Best Seller'}</span>
                  </span>
                )}
              </div>

              {discountPercent && discountPercent > 0 && (
                <div className="absolute bottom-4 start-4 px-3 py-1 rounded-full text-xs font-black bg-pink-600 text-white shadow-lg border border-pink-400/40 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>{discountPercent}% {t.discount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick trust badges under image */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl glass-panel border border-white/10 text-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <h5 className="text-xs font-bold text-slate-200 font-cairo">
                {language === 'ar' ? 'ضمان أردني أصلي' : '100% Genuine'}
              </h5>
              <p className="text-[10px] text-slate-400">
                {language === 'ar' ? 'حساب رسمي أو كود معتمد' : 'Verified digital license'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl glass-panel border border-white/10 text-center">
              <Clock className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <h5 className="text-xs font-bold text-slate-200 font-cairo">
                {language === 'ar' ? 'تسليم خلال دقائق' : 'Instant Delivery'}
              </h5>
              <p className="text-[10px] text-slate-400">
                {language === 'ar' ? 'مباشرة عبر الواتساب والإيميل' : 'Direct to your WhatsApp'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Title, Specs, Price, Actions (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          <div>
            {/* Category & Region */}
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 mb-2">
              <span>
                {product.category === 'games'
                  ? t.cat_games
                  : product.category === 'subscriptions'
                  ? t.cat_subscriptions
                  : product.category === 'psn_cards'
                  ? t.cat_psn_cards
                  : t.cat_steam_cards}
              </span>
              <span>•</span>
              <span className="text-slate-300">
                {language === 'ar' ? product.regionAr : product.regionEn}
              </span>
            </div>

            {/* Main Title */}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100 font-cairo leading-snug mb-3">
              {language === 'ar' ? product.nameAr : product.nameEn}
            </h1>

            {/* Rating Stars Bar */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(product.rating) ? 'fill-amber-400' : 'text-slate-600'
                    }`}
                  />
                ))}
                <span className="ms-1.5 font-extrabold text-slate-100 text-sm">
                  {product.rating.toFixed(1)}
                </span>
              </div>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">
                {product.reviewsCount} {t.reviews}
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-emerald-400 font-bold">
                {language === 'ar' ? product.deliveryTypeAr : product.deliveryTypeEn}
              </span>
            </div>
          </div>

          {/* Pricing & Stock Card */}
          <div className="p-6 rounded-3xl glass-card border border-white/10 space-y-4">
            <div className="flex items-baseline gap-3">
              <div className="text-3xl sm:text-4xl font-black text-purple-300 font-display">
                {formatPrice(product.priceJOD, product.priceUSD)}
              </div>
              {product.originalPriceJOD && product.originalPriceJOD > product.priceJOD && (
                <div className="text-base text-slate-500 line-through">
                  {formatPrice(product.originalPriceJOD, product.originalPriceUSD)}
                </div>
              )}
            </div>

            {/* Availability status indicator */}
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold bg-emerald-950/40 p-3 rounded-2xl border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{language === 'ar' ? 'متاح للطلب المباشر — يتم الشراء والتجهيز فور تحويل الدفعة ⚡' : 'Available on Demand — Purchased & delivered upon payment'}</span>
            </div>

            {/* Quantity Selector & Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Quantity Controls */}
              <div className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-full border border-white/10 w-full sm:w-36">
                <button
                  id="product-qty-dec"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-slate-100">{quantity}</span>
                <button
                  id="product-qty-inc"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  disabled={quantity >= 10}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

                {/* Add to Cart Button */}
                <button
                  id="product-add-to-cart-btn"
                  onClick={() => addToCart(product, quantity)}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-xl shadow-purple-900/30 hover:scale-[1.02] active:scale-98 transition-all font-cairo"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{t.addToCart}</span>
                </button>

                {/* Instant Buy Now Button */}
                <button
                  id="product-buy-now-btn"
                  onClick={handleInstantBuy}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-pink-600 hover:bg-pink-500 text-white font-black text-sm shadow-xl shadow-pink-900/30 hover:scale-[1.02] active:scale-98 transition-all font-cairo"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>{t.buyNow}</span>
                </button>

                {/* Wishlist & Compare Quick Icons */}
                <div className="flex items-center justify-center gap-2 pt-2 sm:pt-0">
                  <button
                    id="product-detail-wishlist-btn"
                    onClick={() => toggleWishlist(product.id)}
                    className={`p-3.5 rounded-full border transition-all ${
                      isFavorite
                        ? 'bg-pink-600 border-pink-400 text-white shadow-lg shadow-pink-600/30'
                        : 'glass-panel border-white/10 text-slate-300 hover:text-pink-400'
                    }`}
                    title={t.favorites}
                  >
                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    id="product-detail-compare-btn"
                    onClick={() => toggleCompare(product.id)}
                    className={`p-3.5 rounded-full border transition-all ${
                      isCompared
                        ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/30'
                        : 'glass-panel border-white/10 text-slate-300 hover:text-purple-300'
                    }`}
                    title={t.compare}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
          </div>

          {/* Features Checklist */}
          <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-3">
            <h4 className="text-sm font-bold text-slate-100 font-cairo flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>{t.features}</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(language === 'ar' ? product.featuresAr : product.featuresEn).map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Description Text */}
          <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-2">
            <h4 className="text-sm font-bold text-slate-200 font-cairo">
              {language === 'ar' ? 'تفاصيل ومعلومات المنتج' : 'Product Overview'}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {language === 'ar' ? product.descriptionAr : product.descriptionEn}
            </p>
          </div>
        </div>
      </div>

      {/* Customer Reviews & Add Review Section */}
      <section id="product-reviews-section" className="p-6 sm:p-10 rounded-3xl glass-card border border-white/10 space-y-8">
        
        {/* Section Header & Rating Breakdown Summary */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/10 pb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 mb-1">
              <MessageSquare className="w-4 h-4" />
              <span>{t.customerReviews}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-100 font-cairo">
              {language === 'ar' ? 'تقييمات وآراء المشترين' : 'Customer Ratings & Reviews'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              {language === 'ar'
                ? 'تقييمات حقيقية من مجتمع اللاعبين حول سرعة التسليم، مصداقية الأكواد، وجودة الخدمة.'
                : 'Verified reviews from real players on delivery speed, code validity, and support.'}
            </p>
          </div>

          {/* Average Rating Score Card & 5-Star Breakdown */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl glass-panel border border-white/10 w-full lg:w-auto">
            {/* Big Rating Number */}
            <div className="flex flex-col items-center justify-center text-center px-4 sm:border-e sm:border-white/10">
              <div className="text-4xl sm:text-5xl font-black text-amber-400 font-display tracking-tight">
                {product.rating.toFixed(1)}
              </div>
              <div className="flex items-center gap-0.5 text-amber-400 my-1.5" aria-label={`Average rating: ${product.rating.toFixed(1)} out of 5`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                {productReviews.length} {t.reviews}
              </span>
            </div>

            {/* Stars Breakdown Bars (5 to 1) */}
            <div className="w-full sm:w-56 space-y-1.5 text-xs">
              {[5, 4, 3, 2, 1].map((starLevel) => {
                const count = ratingStats.counts[starLevel] || 0;
                const percent = ratingStats.percentages[starLevel] || 0;
                return (
                  <div
                    key={starLevel}
                    onClick={() => setSelectedFilterRating(selectedFilterRating === starLevel ? null : starLevel)}
                    className="flex items-center gap-2 cursor-pointer group hover:text-amber-400 transition-colors"
                    title={language === 'ar' ? `تصفية حسب ${starLevel} نجوم (${count})` : `Filter by ${starLevel} stars (${count})`}
                  >
                    <span className="w-4 text-[11px] font-bold text-slate-300 text-end flex items-center justify-end gap-0.5">
                      {starLevel} <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 inline" />
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="w-7 text-[10px] text-slate-500 text-start">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Add Review Interactive Box */}
        <div className="p-6 rounded-3xl glass-panel border border-violet-500/20 bg-gradient-to-br from-violet-950/20 via-slate-900/40 to-slate-950/60 shadow-xl">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h4 className="text-base font-bold text-slate-100 font-cairo flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>{t.writeReview}</span>
            </h4>
            {currentUser && (
              <span className="text-[11px] text-purple-300 bg-purple-950/60 px-3 py-1 rounded-full border border-purple-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{language === 'ar' ? `تقييم بصفتك: ${currentUser.name}` : `Posting as: ${currentUser.name}`}</span>
              </span>
            )}
          </div>

          {currentUser ? (
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              
              {/* Interactive Star Rating Selector */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="block text-xs font-bold text-slate-200 mb-1">
                    {t.ratingLabel}:
                  </span>
                  <div
                    className="flex items-center gap-1.5"
                    role="radiogroup"
                    aria-label={t.ratingLabel}
                    onMouseLeave={() => setHoverRating(null)}
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        id={`star-btn-${star}`}
                        role="radio"
                        aria-checked={reviewRating === star}
                        aria-label={language === 'ar' ? `تقييم ${star} من 5 نجوم` : `Rate ${star} out of 5 stars`}
                        onClick={() => setReviewRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        className="p-1 rounded-lg hover:bg-white/10 transition-all transform hover:scale-115 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            star <= activeDisplayRating
                              ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                              : 'text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating Level Description Pill */}
                <div className="px-4 py-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-bold font-cairo">
                  {getRatingLabel(activeDisplayRating)}
                </div>
              </div>

              {/* Quick Suggestion Tags */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3 text-purple-400" />
                  {language === 'ar' ? 'اقتراحات سريعة (انقر للإضافة):' : 'Quick tags (click to add):'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {quickReviewTags.map((tag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddQuickTag(tag)}
                      className="px-3 py-1 rounded-full text-[11px] font-medium bg-white/5 hover:bg-purple-600/20 text-slate-300 hover:text-purple-300 border border-white/10 hover:border-purple-500/30 transition-all hover:scale-102"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Comment Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="review-comment-textarea" className="text-xs text-slate-300 font-semibold">
                    {t.reviewCommentLabel}
                  </label>
                  <span className="text-[10px] text-slate-500">
                    {reviewComment.length} / 500
                  </span>
                </div>
                <textarea
                  id="review-comment-textarea"
                  value={reviewComment}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      setReviewComment(e.target.value);
                      setReviewError('');
                    }
                  }}
                  rows={3}
                  placeholder={
                    language === 'ar'
                      ? 'شارك اللاعبين رأيك وتجربتك عن سرعة استلام الكود، التفعيل، وتجربة الشراء...'
                      : 'Share your genuine experience regarding code delivery speed, activation, and support...'
                  }
                  className="w-full p-4 rounded-2xl text-xs bg-white/5 border border-white/10 text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all"
                />
              </div>

              {reviewError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2" role="alert">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{reviewError}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {language === 'ar' ? 'يتم نشر التقييم فوراً ويظهر لجميع الزوار' : 'Review published instantly to all users'}
                </span>
                <button
                  id="submit-review-btn"
                  type="submit"
                  disabled={isSubmittingReview}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white text-xs font-bold transition-all shadow-lg shadow-purple-900/30 hover:scale-105 active:scale-98"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingReview ? (language === 'ar' ? 'جاري النشر...' : 'Publishing...') : t.submitReview}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-purple-950/40 border border-purple-500/30">
              <div className="space-y-1 text-start">
                <h5 className="text-xs font-bold text-slate-200 font-cairo flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>{language === 'ar' ? 'التقييمات مخصصة للأعضاء والمشترين' : 'Reviews are for verified members'}</span>
                </h5>
                <p className="text-[11px] text-purple-300">
                  {language === 'ar'
                    ? 'سجّل دخولك الآن لتتمكن من تقييم اللعبة بالنجوم وإفادة مجتمع اللاعبين بتجربتك.'
                    : 'Log in to rate this product with stars and share your valuable feedback.'}
                </p>
              </div>
              <button
                id="review-login-prompt-btn"
                onClick={() => navigateTo('#account')}
                className="px-5 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold whitespace-nowrap shadow-lg shadow-purple-900/30 transition-all hover:scale-105"
              >
                {t.login} / {t.register}
              </button>
            </div>
          )}
        </div>

        {/* Filter Pills Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-300">
              {language === 'ar' ? 'تصفية التقييمات:' : 'Filter reviews:'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedFilterRating(null)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                selectedFilterRating === null
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              {language === 'ar' ? `جميع التقييمات (${productReviews.length})` : `All (${productReviews.length})`}
            </button>

            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingStats.counts[stars] || 0;
              return (
                <button
                  key={stars}
                  onClick={() => setSelectedFilterRating(selectedFilterRating === stars ? null : stars)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                    selectedFilterRating === stars
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                      : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  <span>{stars}</span>
                  <Star className="w-3 h-3 fill-current" />
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Existing Reviews List */}
        <div className="space-y-3.5">
          {filteredReviews.length === 0 ? (
            <div className="p-8 rounded-3xl glass-panel border border-white/10 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-purple-950/50 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h5 className="text-sm font-bold text-slate-200 font-cairo">
                {selectedFilterRating !== null
                  ? (language === 'ar' ? `لا توجد مراجعات بتقييم ${selectedFilterRating} نجوم حالياً` : `No reviews found with ${selectedFilterRating} stars`)
                  : (language === 'ar' ? 'لا توجد تقييمات لهذا المنتج حتى الآن' : 'No customer reviews yet')}
              </h5>
              <p className="text-xs text-slate-400">
                {language === 'ar'
                  ? 'كن أول لاعب يكتب تقييماً ومراجعة بالنجوم لهذا المنتج!'
                  : 'Be the first gamer to write a review and star rating for this item!'}
              </p>
            </div>
          ) : (
            filteredReviews.map((rev) => {
              const isAuthor = currentUser && currentUser.id === rev.userId;
              const canDelete = isAuthor || (currentUser && (currentUser.role === 'owner' || currentUser.role === 'staff'));

              return (
                <div
                  key={rev.id}
                  id={`review-item-${rev.id}`}
                  className="p-4 sm:p-5 rounded-2xl glass-card border border-white/10 hover:border-purple-500/30 transition-all flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 border border-purple-400/30 flex items-center justify-center text-white font-black text-sm shadow-md">
                        {rev.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs sm:text-sm font-bold text-slate-100">{rev.userName}</h5>
                          {rev.userRole === 'owner' ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {language === 'ar' ? 'مالك المتجر' : 'Owner'}
                            </span>
                          ) : rev.userRole === 'staff' ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {language === 'ar' ? 'مشرف' : 'Staff'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" />
                              <span>{language === 'ar' ? 'مشترٍ موثوق' : 'Verified Buyer'}</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {new Date(rev.createdAt).toLocaleDateString(language === 'ar' ? 'ar-JO' : 'en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Star Display */}
                      <div className="flex items-center gap-0.5 text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                            }`}
                          />
                        ))}
                        <span className="text-xs font-black ms-1 text-amber-300">{rev.rating}</span>
                      </div>

                      {/* Delete Review Button for Author or Admin */}
                      {canDelete && (
                        <button
                          onClick={() => {
                            if (window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا التقييم؟' : 'Are you sure you want to delete this review?')) {
                              deleteReview(rev.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title={language === 'ar' ? 'حذف التقييم' : 'Delete review'}
                          aria-label={language === 'ar' ? 'حذف التقييم' : 'Delete review'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comment Text */}
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed ps-12 whitespace-pre-wrap">
                    {rev.comment}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="space-y-6">
          <h3 className="text-xl font-bold text-slate-100 font-cairo">
            {language === 'ar' ? 'منتجات ذات صلة قد تعجبك' : 'Related Products You Might Like'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
