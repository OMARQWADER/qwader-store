import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Tag,
  ShieldCheck,
  Zap,
  Check
} from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    formatPrice,
    appliedPromo,
    applyPromoCode,
    removePromoCode,
    language,
    navigateTo,
    t,
  } = useStore();

  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');

  if (!isCartOpen) return null;

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
      discountUSD = discountJOD * 1.41;
    }
  }

  const totalJOD = Math.max(0, subtotalJOD - discountJOD);
  const totalUSD = Math.max(0, subtotalUSD - discountUSD);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    const res = applyPromoCode(promoInput);
    if (!res.success) {
      setPromoError(res.message);
    } else {
      setPromoError('');
      setPromoInput('');
    }
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigateTo('#checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label={t.cart}>
      {/* Backdrop */}
      <div
        id="cart-drawer-backdrop"
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in"
      />

      <div className="fixed inset-y-0 end-0 max-w-full flex">
        <div
          id="cart-drawer-panel"
          className="w-screen max-w-md glass-panel flex flex-col shadow-2xl border-s border-white/10 text-slate-100 animate-in slide-in-from-right duration-300"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30" aria-hidden="true">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold font-cairo">{t.cart}</h2>
                <p className="text-xs text-slate-400">
                  {cart.length} {language === 'ar' ? 'عناصر مختارة' : 'selected items'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  id="clear-cart-btn"
                  onClick={clearCart}
                  aria-label={language === 'ar' ? 'تفريغ سلة المشتريات بالكامل' : 'Clear shopping cart'}
                  className="text-xs text-slate-400 hover:text-rose-400 transition-colors p-1.5 rounded-full hover:bg-white/5"
                  title={language === 'ar' ? 'تفريغ السلة' : 'Clear cart'}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
              <button
                id="close-cart-drawer-btn"
                onClick={() => setIsCartOpen(false)}
                aria-label={language === 'ar' ? 'إغلاق سلة المشتريات' : 'Close cart drawer'}
                className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3" role="list" aria-label="Cart items">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-20 h-20 rounded-full bg-purple-950/40 border border-purple-500/20 flex items-center justify-center mb-4 text-purple-400" aria-hidden="true">
                  <ShoppingBag className="w-10 h-10 stroke-1" />
                </div>
                <h3 className="text-lg font-bold text-slate-200 mb-1">{t.emptyCartTitle}</h3>
                <p className="text-xs text-slate-400 max-w-xs mb-6 leading-relaxed">
                  {t.emptyCartDesc}
                </p>
                <button
                  id="cart-continue-shopping-btn"
                  onClick={() => {
                    setIsCartOpen(false);
                    navigateTo('#store');
                  }}
                  aria-label={t.continueShopping}
                  className="px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 transition-all hover:scale-105"
                >
                  {t.continueShopping}
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  id={`cart-item-${item.product.id}`}
                  role="listitem"
                  className="p-3.5 rounded-2xl glass-card border border-white/10 hover:border-purple-500/30 flex gap-3 transition-all"
                >
                  <img
                    src={item.product.image}
                    alt={language === 'ar' ? item.product.nameAr : item.product.nameEn}
                    className="w-16 h-16 rounded-xl object-cover border border-white/10 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-500/30">
                          {item.product.platform}
                        </span>
                        <button
                          id={`remove-cart-item-${item.product.id}`}
                          onClick={() => removeFromCart(item.product.id)}
                          aria-label={language === 'ar' ? `حذف ${item.product.nameAr} من السلة` : `Remove ${item.product.nameEn} from cart`}
                          className="text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <h4 className="text-xs font-bold text-slate-100 truncate mt-1">
                        {language === 'ar' ? item.product.nameAr : item.product.nameEn}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs font-extrabold text-purple-300 font-display">
                        {formatPrice(item.product.priceJOD * item.quantity, item.product.priceUSD * item.quantity)}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                        <button
                          id={`qty-decrease-${item.product.id}`}
                          onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                          aria-label={language === 'ar' ? `تقليل كمية ${item.product.nameAr}` : `Decrease quantity of ${item.product.nameEn}`}
                          className="text-slate-400 hover:text-white p-0.5"
                        >
                          <Minus className="w-3 h-3" aria-hidden="true" />
                        </button>
                        <span className="text-xs font-bold text-slate-200 px-1" aria-label={`Quantity: ${item.quantity}`}>{item.quantity}</span>
                        <button
                          id={`qty-increase-${item.product.id}`}
                          onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                          disabled={item.quantity >= item.product.stockQuantity}
                          aria-label={language === 'ar' ? `زيادة كمية ${item.product.nameAr}` : `Increase quantity of ${item.product.nameEn}`}
                          className={`p-0.5 ${
                            item.quantity >= item.product.stockQuantity
                              ? 'text-slate-600 cursor-not-allowed'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Plus className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Area */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-white/10 bg-slate-950/60 backdrop-blur-md space-y-4">
              {/* Promo Code Form */}
              <div>
                {appliedPromo ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>
                        {appliedPromo.code} (
                        {appliedPromo.discountPercent
                          ? `${appliedPromo.discountPercent}%`
                          : `${appliedPromo.discountFixedJOD} JOD`}
                        )
                      </span>
                    </div>
                    <button
                      id="remove-promo-btn"
                      onClick={removePromoCode}
                      aria-label={language === 'ar' ? 'إلغاء كود الخصم' : 'Remove promo code'}
                      className="text-emerald-400 hover:text-rose-400 underline text-[11px]"
                    >
                      {language === 'ar' ? 'إلغاء' : 'Remove'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyPromo} className="flex gap-2" aria-label="Promo code form">
                    <input
                      id="promo-code-input"
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder={t.enterPromoCode}
                      aria-label={t.enterPromoCode}
                      className="flex-1 px-3.5 py-2 rounded-full text-xs bg-white/5 border border-white/10 text-slate-100 uppercase focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      id="apply-promo-btn"
                      type="submit"
                      aria-label={t.applyPromo}
                      className="px-4 py-2 rounded-full text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                    >
                      {t.applyPromo}
                    </button>
                  </form>
                )}
                {promoError && <p className="text-[11px] text-rose-400 mt-1" role="alert">{promoError}</p>}
              </div>

              {/* Price Calculation */}
              <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-white/10">
                <div className="flex justify-between">
                  <span className="text-slate-400">{t.subtotal}</span>
                  <span>{formatPrice(subtotalJOD, subtotalUSD)}</span>
                </div>
                {discountJOD > 0 && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>{t.promoDiscount}</span>
                    <span>-{formatPrice(discountJOD, discountUSD)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{language === 'ar' ? 'التسليم الرقمي الفوري' : 'Instant Delivery'}</span>
                  <span className="text-emerald-400 font-bold">{language === 'ar' ? 'مجاني ⚡' : 'FREE ⚡'}</span>
                </div>
                <div className="flex justify-between items-center text-base font-extrabold text-slate-100 pt-2 border-t border-white/10">
                  <span className="font-cairo">{t.cartTotal}</span>
                  <span className="text-xl text-purple-300 font-display font-black">
                    {formatPrice(totalJOD, totalUSD)}
                  </span>
                </div>
              </div>

              {/* Instant Delivery Notice */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-[11px] text-purple-300">
                <Zap className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" aria-hidden="true" />
                <span>{language === 'ar' ? 'تسليم فوري عبر كليك والواتساب بأقل من 5 دقائق' : 'Instant WhatsApp & CliQ code delivery within 5 min'}</span>
              </div>

              {/* Checkout Button */}
              <button
                id="cart-proceed-checkout-btn"
                onClick={handleCheckout}
                aria-label={t.proceedToCheckout}
                className="w-full py-3.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-black text-sm shadow-xl shadow-purple-900/30 transition-all hover:scale-[1.02] active:scale-98 flex items-center justify-center gap-2 font-cairo"
              >
                <span>{t.proceedToCheckout}</span>
                {language === 'ar' ? <ArrowLeft className="w-4 h-4" aria-hidden="true" /> : <ArrowRight className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
