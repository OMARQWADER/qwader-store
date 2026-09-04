import React from 'react';
import { useStore } from '../../context/StoreContext';
import { Product } from '../../types';
import {
  Heart,
  ShoppingCart,
  Star,
  Zap,
  SlidersHorizontal,
  Check,
  Flame,
  AlertTriangle,
  Layers,
  Sparkles
} from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const {
    language,
    formatPrice,
    addToCart,
    toggleWishlist,
    isInWishlist,
    toggleCompare,
    isInCompare,
    navigateTo,
    bestSellerProductIds,
    t,
  } = useStore();

  const isFavorite = isInWishlist(product.id);
  const isCompared = isInCompare(product.id);
  const isBestSeller = bestSellerProductIds.slice(0, 4).includes(product.id);
  const isOutOfStock = false;
  const isLowStock = false;
  const rating = Number(product.rating) || 0;

  const discountPercent =
    product.originalPriceJOD && product.originalPriceJOD > product.priceJOD
      ? Math.round(((product.originalPriceJOD - product.priceJOD) / product.originalPriceJOD) * 100)
      : null;

  return (
    <div
      id={`product-card-${product.id}`}
      className="group relative flex flex-col rounded-2xl glass-card overflow-hidden border border-white/10 hover:border-purple-500/50 transition-all duration-300 hover:shadow-[0_0_25px_rgba(147,51,234,0.25)] hover:-translate-y-1.5"
    >
      {/* Glow highlight on hover */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Badges Top Bar */}
      <div className="absolute top-2 sm:top-3 inset-x-2 sm:inset-x-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex flex-col gap-1 items-start max-w-[60%]">
          {/* Platform Tag */}
          <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[11px] font-black uppercase tracking-wider bg-slate-950/85 text-purple-300 border border-purple-500/30 backdrop-blur-md shadow-md truncate max-w-full">
            {product.platform}
          </span>

          {/* Best Seller Badge */}
          {isBestSeller && (
            <span className="px-2 py-0.5 sm:px-2.5 rounded-full text-[8px] sm:text-[10px] font-black bg-gradient-to-r from-pink-500 to-purple-600 text-white border border-pink-300/40 shadow-lg shadow-pink-500/30 flex items-center gap-1 animate-pulse">
              <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white flex-shrink-0" />
              <span className="truncate">{language === 'ar' ? 'الأكثر طلباً' : 'Best Seller'}</span>
            </span>
          )}
        </div>

        {/* Wishlist & Compare Icons */}
        <div className="flex items-center gap-1 pointer-events-auto">
          <button
            id={`compare-btn-${product.id}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleCompare(product.id);
            }}
            aria-label={isCompared ? (language === 'ar' ? `إزالة ${product.nameAr} من المقارنة` : `Remove ${product.nameEn} from comparison`) : (language === 'ar' ? `إضافة ${product.nameAr} إلى المقارنة` : `Add ${product.nameEn} to comparison`)}
            className={`p-1.5 sm:p-2 rounded-full backdrop-blur-md border transition-all ${
              isCompared
                ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-950/70 border-white/10 text-slate-300 hover:text-white hover:border-purple-500/50'
            }`}
            title={t.compare}
          >
            <SlidersHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
          </button>

          <button
            id={`wishlist-btn-${product.id}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product.id);
            }}
            aria-label={isFavorite ? (language === 'ar' ? `إزالة ${product.nameAr} من المفضلة` : `Remove ${product.nameEn} from favorites`) : (language === 'ar' ? `إضافة ${product.nameAr} إلى المفضلة` : `Add ${product.nameEn} to favorites`)}
            className={`p-1.5 sm:p-2 rounded-full backdrop-blur-md border transition-all ${
              isFavorite
                ? 'bg-pink-600 border-pink-400 text-white shadow-lg shadow-pink-600/40'
                : 'bg-slate-950/70 border-white/10 text-slate-300 hover:text-pink-400 hover:border-pink-500/50'
            }`}
            title={t.favorites}
          >
            <Heart className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isFavorite ? 'fill-current' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Image Thumbnail Container */}
      <div
        className="relative w-full pt-[62%] sm:pt-[65%] overflow-hidden bg-slate-900 cursor-pointer"
        onClick={() => navigateTo(`#product/${product.id}`)}
        role="button"
        tabIndex={0}
        aria-label={language === 'ar' ? `عرض تفاصيل منتج ${product.nameAr}` : `View details for ${product.nameEn}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateTo(`#product/${product.id}`); } }}
      >
        <img
          src={product.image}
          alt={language === 'ar' ? product.nameAr : product.nameEn}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-black/30" aria-hidden="true" />

        {/* Discount Badge */}
        {discountPercent && discountPercent > 0 && (
          <div className="absolute bottom-2 start-2 sm:bottom-3 sm:start-3 z-10 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-md text-[10px] sm:text-xs font-black bg-pink-600 text-white shadow-md border border-pink-400/40 flex items-center gap-1">
            <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current flex-shrink-0" />
            <span>{discountPercent}% {t.discount}</span>
          </div>
        )}

        {/* Delivery Type Tag */}
        <div className="absolute bottom-2 end-2 sm:bottom-3 sm:end-3 z-10 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-slate-950/85 text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
          {language === 'ar' ? product.deliveryTypeAr : product.deliveryTypeEn}
        </div>
      </div>

      {/* Content Body */}
      <div className="p-3 sm:p-4 md:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Category & Region */}
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-400 mb-1.5 sm:mb-2 gap-1">
            <span className="font-semibold text-purple-400 truncate">
              {product.category === 'games'
                ? t.cat_games
                : product.category === 'subscriptions'
                ? t.cat_subscriptions
                : product.category === 'psn_cards'
                ? t.cat_psn_cards
                : t.cat_steam_cards}
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-400 truncate max-w-[90px] sm:max-w-[120px]">
              {language === 'ar' ? product.regionAr : product.regionEn}
            </span>
          </div>

          {/* Title */}
          <h3
            onClick={() => navigateTo(`#product/${product.id}`)}
            className="text-xs sm:text-sm md:text-base font-bold text-slate-100 hover:text-purple-400 transition-colors line-clamp-2 leading-snug cursor-pointer mb-1.5 sm:mb-2 font-cairo min-h-[2.2rem] sm:min-h-[2.5rem]"
          >
            {language === 'ar' ? product.nameAr : product.nameEn}
          </h3>

          {/* Short Description (Visible on larger mobile / desktop) */}
          <p className="hidden sm:line-clamp-2 text-xs text-slate-400 mb-2 sm:mb-3 leading-relaxed">
            {language === 'ar' ? product.shortDescAr : product.shortDescEn}
          </p>

          {/* Rating & Reviews */}
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 text-[11px] sm:text-xs">
            <div className="flex items-center text-amber-400">
              <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current flex-shrink-0" />
              <span className="ms-1 font-extrabold text-slate-200">{rating.toFixed(1)}</span>
            </div>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 text-[10px] sm:text-xs">
              ({product.reviewsCount})
            </span>
          </div>
        </div>

        <div>
          {/* Stock Notice */}
          <div className="mb-2 sm:mb-3">
            {isOutOfStock ? (
              <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl border border-rose-500/30">
                <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                <span className="truncate">{t.outOfStock}</span>
              </div>
            ) : isLowStock ? (
              <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold text-amber-300 bg-amber-950/40 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl border border-amber-500/30 gap-1">
                <div className="flex items-center gap-1 truncate">
                  <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 animate-bounce flex-shrink-0" />
                  <span className="truncate">{t.lowStock}</span>
                </div>
                <span className="px-1.5 py-0.2 bg-amber-500/20 rounded font-black text-amber-200 whitespace-nowrap text-[9px] sm:text-[10px]">
                  {product.stockQuantity}
                </span>
              </div>
            ) : (
              <div className="text-[10px] sm:text-[11px] text-emerald-400 font-semibold flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
                <span className="truncate">{t.inStock}</span>
              </div>
            )}
          </div>

          {/* Price & Action Button */}
          <div className="flex items-center justify-between gap-1.5 pt-2 sm:pt-3 border-t border-white/10">
            <div className="min-w-0">
              {product.originalPriceJOD && product.originalPriceJOD > product.priceJOD && (
                <div className="text-[10px] sm:text-xs text-slate-500 line-through truncate">
                  {formatPrice(product.originalPriceJOD, product.originalPriceUSD)}
                </div>
              )}
              <div className="text-xs sm:text-sm md:text-base lg:text-lg font-black text-slate-100 font-display whitespace-nowrap tracking-tight">
                {formatPrice(product.priceJOD, product.priceUSD)}
              </div>
            </div>

            <button
              id={`add-to-cart-btn-${product.id}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!isOutOfStock) addToCart(product, 1);
              }}
              disabled={isOutOfStock}
              aria-label={isOutOfStock ? (language === 'ar' ? `${product.nameAr} غير متوفر حالياً` : `${product.nameEn} is out of stock`) : (language === 'ar' ? `إضافة ${product.nameAr} إلى السلة` : `Add ${product.nameEn} to cart`)}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex-shrink-0 min-h-[40px] ${
                isOutOfStock
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30 hover:scale-105 active:scale-95'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
              <span className="font-cairo font-bold">{t.addToCart}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
