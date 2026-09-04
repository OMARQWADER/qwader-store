import React, { useEffect, useState } from "react";
import { ShoppingBag, Store } from "lucide-react";
import { useStore } from "../../context/StoreContext";

export const CartChoiceModal: React.FC = () => {
  const { cartPromptProduct, confirmOpenCart, continueShopping, language } =
    useStore();
  const [secondsLeft, setSecondsLeft] = useState(5);

  useEffect(() => {
    if (!cartPromptProduct) return;
    setSecondsLeft(5);
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          continueShopping();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cartPromptProduct, continueShopping]);

  if (!cartPromptProduct) return null;

  return (
    <div className="fixed top-20 inset-x-3 sm:inset-x-auto sm:end-6 sm:w-[min(26rem,calc(100vw-1.5rem))] z-[80] pointer-events-none">
      <div className="pointer-events-auto w-full rounded-2xl glass-card border border-white/10 p-4 shadow-2xl space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black font-cairo">
              {language === "ar" ? "تمت إضافة المنتج إلى السلة" : "Added to cart"}
            </h3>
            <p className="text-xs text-slate-400">
              {language === "ar"
                ? cartPromptProduct.nameAr
                : cartPromptProduct.nameEn}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-400">
          {language === "ar"
            ? "هل تريد فتح السلة الآن أم متابعة التسوق؟"
            : "Open the cart now, or keep shopping?"}
        </p>
        <div className="h-1 rounded-full bg-white/10 overflow-hidden" aria-label={`${secondsLeft} seconds`}>
          <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${(secondsLeft / 5) * 100}%` }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={confirmOpenCart}
            className="min-h-11 rounded-xl bg-purple-600 text-white text-sm font-bold"
          >
            {language === "ar" ? "فتح السلة" : "Open cart"}
          </button>
          <button
            type="button"
            onClick={continueShopping}
            className="min-h-11 rounded-xl border border-white/10 glass-panel text-sm font-bold flex items-center justify-center gap-2"
          >
            <Store className="w-4 h-4" />
            {language === "ar" ? "متابعة التسوق" : "Continue shopping"}
          </button>
        </div>
      </div>
    </div>
  );
};
