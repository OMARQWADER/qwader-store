import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/common/ProductCard';
import { ProductCategory } from '../types';
import {
  SlidersHorizontal,
  Search,
  Grid,
  Filter,
  Flame,
  Star,
  ArrowUpDown,
  Sparkles,
  Layers,
  AlertTriangle,
  RotateCcw,
  Check
} from 'lucide-react';

export const StoreView: React.FC = () => {
  const { state, language, formatPrice, currentRoute, t } = useStore();

  // Parse category from URL query if present (e.g. #store?category=games)
  const initialCategory = useMemo<ProductCategory | 'all'>(() => {
    const match = currentRoute.match(/category=([a-z_]+)/);
    if (match && ['games', 'subscriptions', 'psn_cards', 'steam_cards'].includes(match[1])) {
      return match[1] as ProductCategory;
    }
    return 'all';
  }, [currentRoute]);

  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'price_asc' | 'price_desc' | 'newest'>('popular');
  const [isLoadingSkeleton, setIsLoadingSkeleton] = useState(false);

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  // Simulate smooth skeleton loader on filter change
  const handleCategoryChange = (cat: ProductCategory | 'all') => {
    setSelectedCategory(cat);
    setIsLoadingSkeleton(true);
    setTimeout(() => setIsLoadingSkeleton(false), 200);
  };

  const categories: { id: ProductCategory | 'all'; labelAr: string; labelEn: string; icon: string }[] = [
    { id: 'all', labelAr: 'جميع المنتجات', labelEn: 'All Products', icon: '⚡' },
    { id: 'games', labelAr: 'ألعاب PlayStation', labelEn: 'PlayStation Games', icon: '🎮' },
    { id: 'subscriptions', labelAr: 'اشتراكات PS Plus', labelEn: 'PS Plus Subs', icon: '🌟' },
    { id: 'psn_cards', labelAr: 'بطاقات PSN', labelEn: 'PSN Cards', icon: '💳' },
    { id: 'steam_cards', labelAr: 'بطاقات Steam', labelEn: 'Steam Cards', icon: '🚀' },
  ];

  const platforms = ['all', 'PS5', 'PS4 & PS5', 'Steam / PC', 'Global / Multi'];

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return state.products
      .filter((product) => {
        // Category
        if (selectedCategory !== 'all' && product.category !== selectedCategory) {
          return false;
        }

        // Platform
        if (selectedPlatform !== 'all' && product.platform !== selectedPlatform) {
          return false;
        }

        // Stock filters
        if (inStockOnly && product.stockQuantity <= 0) {
          return false;
        }
        if (lowStockOnly && (product.stockQuantity <= 0 || product.stockQuantity > product.lowStockThreshold)) {
          return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            product.nameAr.toLowerCase().includes(q) ||
            product.nameEn.toLowerCase().includes(q) ||
            product.shortDescAr.toLowerCase().includes(q) ||
            product.shortDescEn.toLowerCase().includes(q) ||
            product.platform.toLowerCase().includes(q);
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.priceJOD - b.priceJOD;
        if (sortBy === 'price_desc') return b.priceJOD - a.priceJOD;
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        // Default popular / reviews count
        return b.reviewsCount - a.reviewsCount;
      });
  }, [state.products, selectedCategory, selectedPlatform, inStockOnly, lowStockOnly, searchQuery, sortBy]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedPlatform('all');
    setSearchQuery('');
    setInStockOnly(false);
    setLowStockOnly(false);
    setSortBy('popular');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      
      {/* Store Header Banner */}
      <div className="relative p-6 sm:p-10 rounded-3xl glass-card border border-white/10 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-purple-300 bg-purple-950/80 border border-purple-500/30 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>{language === 'ar' ? 'الكتالوج الرقمي الشامل' : 'Full Digital Catalog'}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-100 mb-2 font-cairo">
            {language === 'ar' ? 'متجر قويدر الرقمي للألعاب والبطاقات' : 'QWADER Digital Store'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {language === 'ar'
              ? 'تصفح أحدث ألعاب البلايستيشن واشتراكات بلس وبطاقات الشحن بأفضل الأسعار مع تفعيل فوري ودفع محلي عبر كليك (CliQ).'
              : 'Browse our full catalog of PS5 games, Plus subs, and Steam wallet cards with instant local CliQ payments.'}
          </p>
        </div>
      </div>

      {/* Category Pills Navigation */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              id={`store-category-tab-${cat.id}`}
              onClick={() => handleCategoryChange(cat.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                isActive
                  ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)] scale-102 border border-purple-400/40'
                  : 'glass-card border border-white/10 text-slate-300 hover:text-white hover:border-purple-500/40'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{language === 'ar' ? cat.labelAr : cat.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Filters & Search Control Bar */}
      <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Search input in store */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-purple-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="store-inner-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'ar' ? 'تصفية المنتجات بالاسم أو المواصفات...' : 'Filter products by name...'}
            className="w-full ps-10 pe-4 py-2.5 rounded-full text-xs bg-white/5 border border-white/10 text-slate-100 focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* Filter Dropdowns & Checkboxes */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Platform Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">{t.platform}:</span>
            <select
              id="filter-platform-select"
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="store-filter-select px-3.5 py-2 rounded-full text-xs border border-white/10 focus:border-purple-500 focus:outline-none"
            >
              <option value="all">{language === 'ar' ? 'جميع المنصات' : 'All Platforms'}</option>
              <option value="PS5">PlayStation 5</option>
              <option value="PS4 & PS5">PS4 & PS5</option>
              <option value="Steam / PC">Steam / PC</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">{t.sortBy}:</span>
            <select
              id="sort-by-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="store-filter-select px-3.5 py-2 rounded-full text-xs border border-white/10 focus:border-purple-500 focus:outline-none"
            >
              <option value="popular">{t.sortPopular}</option>
              <option value="rating">{t.sortRating}</option>
              <option value="price_asc">{t.sortPriceLow}</option>
              <option value="price_desc">{t.sortPriceHigh}</option>
              <option value="newest">{t.sortNewest}</option>
            </select>
          </div>

          {/* In Stock Toggle */}
          <button
            id="filter-in-stock-btn"
            onClick={() => setInStockOnly(!inStockOnly)}
            className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all ${
              inStockOnly
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            {language === 'ar' ? 'المتوفر فقط' : 'In Stock Only'}
          </button>

          {/* Low Stock Toggle */}
          <button
            id="filter-low-stock-btn"
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all ${
              lowStockOnly
                ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            {language === 'ar' ? 'مخزون محدود ⚡' : 'Low Stock ⚡'}
          </button>

          {/* Reset Filters */}
          <button
            id="reset-filters-btn"
            onClick={resetFilters}
            className="p-2 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-rose-400 transition-colors"
            title={language === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          {language === 'ar'
            ? `عرض ${filteredProducts.length} من أصل ${state.products.length} منتج`
            : `Showing ${filteredProducts.length} of ${state.products.length} products`}
        </span>
        <span className="text-purple-400 font-semibold flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          {language === 'ar' ? 'تسليم فوري ومضمون' : 'Instant delivery'}
        </span>
      </div>

      {/* Products Grid with Skeleton Loading Simulation */}
      {isLoadingSkeleton ? (
        <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5 lg:gap-6 animate-pulse">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-white/5 h-80 sm:h-96 border border-white/10 p-3 sm:p-4 flex flex-col justify-between">
              <div className="w-full h-36 sm:h-48 bg-white/10 rounded-xl mb-3 sm:mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
              <div className="h-9 sm:h-10 bg-white/10 rounded-xl mt-3 sm:mt-4" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5 lg:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="p-12 rounded-3xl glass-panel border border-white/10 text-center max-w-lg mx-auto">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4 opacity-70" />
          <h3 className="text-lg font-bold text-slate-100 mb-2 font-cairo">
            {language === 'ar' ? 'لا توجد منتجات مطابقة لخيارات الفلترة' : 'No products match your filters'}
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            {language === 'ar'
              ? 'جرّب إعادة تعيين خيارات التصفية أو البحث عن كلمة مختلفة.'
              : 'Try clearing the search query or changing your filters.'}
          </p>
          <button
            id="empty-store-reset-btn"
            onClick={resetFilters}
            className="px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 transition-all"
          >
            {language === 'ar' ? 'إعادة ضبط كافة الفلاتر' : 'Reset all filters'}
          </button>
        </div>
      )}
    </div>
  );
};
