import React from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/common/ProductCard';
import { Heart, ShoppingBag, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';

export const FavoritesView: React.FC = () => {
  const { state, wishlist, addToCart, clearWishlist, language, navigateTo, t } = useStore();

  const favoriteProducts = wishlist
    .map((id) => state.products.find((p) => p.id === id))
    .filter(Boolean) as typeof state.products;

  const handleAddAllToCart = () => {
    favoriteProducts.forEach((p) => {
      if (p.stockQuantity > 0) addToCart(p, 1);
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl glass-card border border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-pink-400 mb-1">
            <Heart className="w-4 h-4 fill-current" />
            <span>{t.favorites}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 font-cairo">
            {language === 'ar' ? 'قائمة الرغبات والمفضلة' : 'My Wishlist'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {language === 'ar'
              ? 'الألعاب والاشتراكات المحفوظة للشراء لاحقاً'
              : 'Games and cards saved for future orders'}
          </p>
        </div>

        {favoriteProducts.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              id="wishlist-add-all-btn"
              onClick={handleAddAllToCart}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-900/30"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{language === 'ar' ? 'إضافة الكل للسلة' : 'Add All to Cart'}</span>
            </button>

            <button
              id="wishlist-clear-btn"
              onClick={clearWishlist}
              className="p-2.5 rounded-full glass-panel border border-white/10 text-slate-400 hover:text-rose-400 text-xs font-bold transition-colors"
              title={language === 'ar' ? 'مسح المفضلة' : 'Clear wishlist'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      {favoriteProducts.length === 0 ? (
        <div className="p-12 rounded-3xl glass-panel border border-white/10 text-center max-w-lg mx-auto">
          <Heart className="w-12 h-12 text-pink-400 mx-auto mb-4 opacity-70" />
          <h3 className="text-lg font-bold text-slate-100 mb-2 font-cairo">
            {language === 'ar' ? 'قائمة المفضلة فارغة حالياً' : 'Your wishlist is currently empty'}
          </h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            {language === 'ar'
              ? 'انقر على رمز القلب (❤️) في أي منتج لإضافته هنا ومتابعته بسهولة.'
              : 'Click the heart icon on any game or subscription to save it here.'}
          </p>
          <button
            id="wishlist-browse-store-btn"
            onClick={() => navigateTo('#store')}
            className="px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 transition-all"
          >
            {t.exploreStore}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5 lg:gap-6">
          {favoriteProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};
