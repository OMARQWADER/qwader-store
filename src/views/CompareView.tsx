import React from 'react';
import { useStore } from '../context/StoreContext';
import {
  SlidersHorizontal,
  Trash2,
  ShoppingCart,
  Star,
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export const CompareView: React.FC = () => {
  const {
    state,
    compareList,
    toggleCompare,
    clearCompare,
    formatPrice,
    addToCart,
    language,
    navigateTo,
    t,
  } = useStore();

  const comparedProducts = compareList
    .map((id) => state.products.find((p) => p.id === id))
    .filter(Boolean) as typeof state.products;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl glass-card border border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400 mb-1">
            <SlidersHorizontal className="w-4 h-4" />
            <span>{t.compare}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 font-cairo">
            {language === 'ar' ? 'مقارنة المنتجات والمواصفات' : 'Product Comparison'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {language === 'ar'
              ? 'قارن بين أسعار ومنصات وميزات ألعاب واشتراكات بلايستيشن وستيم'
              : 'Compare specs, platforms, pricing, and features side-by-side'}
          </p>
        </div>

        {comparedProducts.length > 0 && (
          <button
            id="clear-compare-list-btn"
            onClick={clearCompare}
            className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-white/10 text-slate-400 hover:text-rose-400 text-xs font-bold transition-colors self-start sm:self-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>{language === 'ar' ? 'مسح جدول المقارنة' : 'Clear Table'}</span>
          </button>
        )}
      </div>

      {comparedProducts.length === 0 ? (
        <div className="p-12 rounded-3xl glass-panel border border-white/10 text-center max-w-lg mx-auto">
          <SlidersHorizontal className="w-12 h-12 text-purple-400 mx-auto mb-4 opacity-70" />
          <h3 className="text-lg font-bold text-slate-100 mb-2 font-cairo">
            {language === 'ar' ? 'لم تقم بإضافة أي منتجات للمقارنة بعد' : 'No items added for comparison'}
          </h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            {language === 'ar'
              ? 'انقر على أيقونة المقارنة (⚖️) في أي بطاقة منتج للمقارنة الفورية بين الأسعار والمواصفات.'
              : 'Click the compare icon on any product card to see side-by-side specs.'}
          </p>
          <button
            id="compare-browse-store-btn"
            onClick={() => navigateTo('#store')}
            className="px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 transition-all"
          >
            {t.exploreStore}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl glass-card border border-white/10 p-4">
          <table className="w-full text-xs text-start border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="p-4 w-48 text-slate-400 font-bold font-cairo">
                  {language === 'ar' ? 'الخاصية / المنتج' : 'Feature / Product'}
                </th>
                {comparedProducts.map((p) => (
                  <th key={p.id} className="p-4 text-center min-w-[200px] align-top">
                    <div className="relative flex flex-col items-center gap-2">
                      <button
                        id={`remove-compare-item-${p.id}`}
                        onClick={() => toggleCompare(p.id)}
                        className="absolute -top-2 -end-2 p-1 rounded-full glass-panel text-slate-400 hover:text-rose-400 border border-white/10"
                        title={language === 'ar' ? 'إزالة' : 'Remove'}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      <img
                        src={p.image}
                        alt={p.nameAr}
                        className="w-24 h-24 rounded-2xl object-cover border border-white/10 mb-2 cursor-pointer"
                        onClick={() => navigateTo(`#product/${p.id}`)}
                      />

                      <h4
                        className="text-xs font-bold text-slate-100 hover:text-purple-400 transition-colors cursor-pointer line-clamp-2"
                        onClick={() => navigateTo(`#product/${p.id}`)}
                      >
                        {language === 'ar' ? p.nameAr : p.nameEn}
                      </h4>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {/* Row: Price */}
              <tr>
                <td className="p-4 font-bold text-slate-400">{t.price}</td>
                {comparedProducts.map((p) => (
                  <td key={p.id} className="p-4 text-center">
                    <span className="text-base font-black text-purple-300 font-display">
                      {formatPrice(p.priceJOD, p.priceUSD)}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row: Platform */}
              <tr>
                <td className="p-4 font-bold text-slate-400">{t.platform}</td>
                {comparedProducts.map((p) => (
                  <td key={p.id} className="p-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase bg-purple-950/80 text-purple-300 border border-purple-500/30">
                      {p.platform}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row: Region */}
              <tr>
                <td className="p-4 font-bold text-slate-400">{t.region}</td>
                {comparedProducts.map((p) => (
                  <td key={p.id} className="p-4 text-center text-slate-200">
                    {language === 'ar' ? p.regionAr : p.regionEn}
                  </td>
                ))}
              </tr>

              {/* Row: Delivery Type */}
              <tr>
                <td className="p-4 font-bold text-slate-400">{t.deliveryType}</td>
                {comparedProducts.map((p) => (
                  <td key={p.id} className="p-4 text-center text-emerald-400 font-semibold">
                    {language === 'ar' ? p.deliveryTypeAr : p.deliveryTypeEn}
                  </td>
                ))}
              </tr>

              {/* Row: Stock Status */}
              <tr>
                <td className="p-4 font-bold text-slate-400">{t.stockStatus}</td>
                {comparedProducts.map((p) => (
                  <td key={p.id} className="p-4 text-center">
                    {p.stockQuantity > 0 ? (
                      <span className="text-emerald-400 font-bold">
                        {t.inStock} ({p.stockQuantity})
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold">{t.outOfStock}</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Row: Rating */}
              <tr>
                <td className="p-4 font-bold text-slate-400">{t.ratingLabel}</td>
                {comparedProducts.map((p) => (
                  <td key={p.id} className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-amber-400 font-bold">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{p.rating.toFixed(1)}</span>
                      <span className="text-slate-500 text-[10px]">({p.reviewsCount})</span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Row: Features Checklist */}
              <tr>
                <td className="p-4 font-bold text-slate-400">{t.features}</td>
                {comparedProducts.map((p) => (
                  <td key={p.id} className="p-4 align-top">
                    <ul className="space-y-1 text-start">
                      {(language === 'ar' ? p.featuresAr : p.featuresEn).map((f, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                          <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>

              {/* Row: Action Button */}
              <tr>
                <td className="p-4 font-bold text-slate-400"></td>
                {comparedProducts.map((p) => (
                  <td key={p.id} className="p-4 text-center">
                    <button
                      id={`compare-add-to-cart-${p.id}`}
                      onClick={() => addToCart(p, 1)}
                      disabled={p.stockQuantity <= 0}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white font-bold text-xs transition-all shadow-lg shadow-purple-900/30"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>{t.addToCart}</span>
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
