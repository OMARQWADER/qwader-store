import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Sparkles, AlertCircle } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product } from '../../types';

interface SearchAutocompleteProps {
  onSelect?: (product: Product) => void;
  className?: string;
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({ onSelect, className = '' }) => {
  const { state, language, navigateTo, formatPrice, t, bestSellerProductIds } = useStore();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredProducts = query.trim()
    ? state.products.filter((p) => {
        const q = query.toLowerCase();
        return (
          p.nameAr.toLowerCase().includes(q) ||
          p.nameEn.toLowerCase().includes(q) ||
          p.shortDescAr.toLowerCase().includes(q) ||
          p.shortDescEn.toLowerCase().includes(q) ||
          p.platform.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      })
    : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (product: Product) => {
    setIsOpen(false);
    setQuery('');
    if (onSelect) {
      onSelect(product);
    } else {
      navigateTo(`#product/${product.id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredProducts.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredProducts.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredProducts.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filteredProducts.length) {
        handleSelect(filteredProducts[selectedIndex]);
      } else if (filteredProducts.length > 0) {
        handleSelect(filteredProducts[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <div className="absolute start-3.5 text-violet-400 pointer-events-none flex items-center justify-center" aria-hidden="true">
          <Search className="w-4 h-4" />
        </div>
        <input
          id="global-search-input"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen && filteredProducts.length > 0}
          aria-controls="search-autocomplete-dropdown"
          aria-label={t.searchPlaceholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={t.searchPlaceholder}
          className="w-full ps-10 pe-9 py-2 rounded-full text-sm bg-white/5 text-slate-100 placeholder-slate-400 border border-white/10 focus:border-purple-500/60 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all backdrop-blur-md"
        />
        {query && (
          <button
            title="مسح البحث"
            id="clear-search-btn"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            aria-label={language === 'ar' ? 'مسح نص البحث' : 'Clear search text'}
            className="absolute end-3 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div
          id="search-autocomplete-dropdown"
          role="listbox"
          aria-label="Search suggestions"
          className="absolute z-50 mt-2 w-full max-h-96 overflow-y-auto rounded-2xl glass-panel shadow-2xl border border-violet-500/30 p-2 text-start transition-all"
        >
          {filteredProducts.length > 0 ? (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-violet-400 flex items-center justify-between border-b border-slate-800 mb-1">
                <span>
                  {language === 'ar' ? `نتائج البحث (${filteredProducts.length})` : `Search Results (${filteredProducts.length})`}
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" aria-hidden="true" />
                  {language === 'ar' ? 'قويدر ستور' : 'QWADER'}
                </span>
              </div>
              <ul className="space-y-1" role="list">
                {filteredProducts.map((product, idx) => {
                  const isSelected = idx === selectedIndex;
                  const isBestSeller = bestSellerProductIds.slice(0, 3).includes(product.id);

                  return (
                    <li
                      key={product.id}
                      id={`search-item-${product.id}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(product)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-violet-600/30 border border-violet-500/40 text-white'
                          : 'hover:bg-slate-800/60 text-slate-200'
                      }`}
                    >
                      <img
                        src={product.image}
                        alt={language === 'ar' ? product.nameAr : product.nameEn}
                        className="w-12 h-12 rounded-lg object-cover border border-violet-500/20 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-violet-300 bg-violet-950/80 px-1.5 py-0.5 rounded border border-violet-500/30">
                            {product.platform}
                          </span>
                          {isBestSeller && (
                            <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-500/30">
                              {language === 'ar' ? 'أكثر مبيعاً' : 'Best Seller'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold truncate text-slate-100">
                          {language === 'ar' ? product.nameAr : product.nameEn}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {language === 'ar' ? product.deliveryTypeAr : product.deliveryTypeEn}
                        </p>
                      </div>
                      <div className="text-end flex-shrink-0">
                        <div className="text-sm font-extrabold text-emerald-400">
                          {formatPrice(product.priceJOD, product.priceUSD)}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-violet-400 opacity-60" />
              <p className="text-sm font-semibold">
                {language === 'ar' ? 'لا توجد نتائج مطابقة لبحثك' : 'No matching products found'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar' ? 'جرب البحث بكلمة مثل: FC 25، بلس، ستيم، أو بطاقة' : 'Try searching for: FC 25, Plus, Steam, or Card'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
