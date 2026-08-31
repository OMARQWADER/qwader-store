import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  Sparkles,
  Zap,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Gamepad2,
  Flame,
  ArrowRight,
  ArrowLeft,
  CreditCard,
  Layers,
  Star,
  Clock,
  ExternalLink
} from 'lucide-react';

export interface HeroSlide {
  id: string;
  badgeAr: string;
  badgeEn: string;
  badgeColor: string;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  ctaTextAr: string;
  ctaTextEn: string;
  ctaAction: string; // route e.g. '#store?category=games' or '#product/prod-ea-fc25'
  secondaryCtaTextAr?: string;
  secondaryCtaTextEn?: string;
  secondaryCtaAction?: string;
  image: string;
  fallbackGradient: string;
  accentGlow: string;
  priceTagAr?: string;
  priceTagEn?: string;
  highlightPillsAr: string[];
  highlightPillsEn: string[];
}

export const HeroSlider: React.FC = () => {
  const { language, navigateTo, state, formatPrice } = useStore();

  // Find top products to link dynamically if available
  const fc25 = state.products.find((p) => p.id === 'prod-ea-fc25');
  const wukong = state.products.find((p) => p.id === 'prod-wukong');
  const psPlus = state.products.find((p) => p.id === 'prod-psplus-deluxe-12m');

  const slides: HeroSlide[] = [
    {
      id: 'slide-fc25-games',
      badgeAr: 'الأكثر طلباً ومبيعاً بالأردن 🔥',
      badgeEn: 'Jordan’s #1 Best Seller 🔥',
      badgeColor: 'from-purple-600 to-pink-600 text-white border-purple-400/40',
      titleAr: 'أقوى ألعاب PlayStation 5 & 4 بتسليم فوري',
      titleEn: 'Top PlayStation 5 & 4 Hits with Instant Play',
      subtitleAr: 'ألعاب حسابات أصلية أساسية مع تفعيل فوري وضمان شامل. العب من حسابك الرئيسي مباشرة بدقائق معدودة!',
      subtitleEn: '100% verified primary accounts with lifetime warranty. Download & play directly on your own profile.',
      ctaTextAr: 'تصفح ألعاب البلايستيشن 🎮',
      ctaTextEn: 'Explore PS Games 🎮',
      ctaAction: '#store?category=games',
      secondaryCtaTextAr: 'عرض لعبة FC 25',
      secondaryCtaTextEn: 'View FC 25 Deal',
      secondaryCtaAction: fc25 ? `#product/${fc25.id}` : '#store',
      image: fc25?.image || '/images/hero-ps5.svg',
      fallbackGradient: 'from-purple-950 via-slate-900 to-indigo-950',
      accentGlow: 'bg-purple-600/30',
      priceTagAr: fc25 ? `ابتداءً من ${formatPrice(fc25.priceJOD, fc25.priceUSD)}` : 'عروض حصرية',
      priceTagEn: fc25 ? `From ${formatPrice(fc25.priceJOD, fc25.priceUSD)}` : 'Exclusive Deals',
      highlightPillsAr: ['⚡ تسليم كود خلال 5 دقائق', '🛡️ حساب أساسي رسمي 100%', '🇯🇴 دفع كليك فوري'],
      highlightPillsEn: ['⚡ Instant 5-Min Delivery', '🛡️ 100% Official Primary Account', '🇯🇴 Free Jordan CliQ'],
    },
    {
      id: 'slide-psplus-subs',
      badgeAr: 'توفير سنوي حقيقي حتى 40% 🌟',
      badgeEn: 'Save Up to 40% Annually 🌟',
      badgeColor: 'from-amber-600 to-yellow-500 text-amber-950 font-black border-amber-400/50',
      titleAr: 'اشتراكات PlayStation Plus ديلوكس وإكسترا',
      titleEn: 'PlayStation Plus Deluxe & Extra Subscriptions',
      subtitleAr: 'مكتبة ضخمة تضم أكثر من 400 لعبة كبرى + أونلاين وتخزين سحابي وكلاسيكيات سوني بتفعيل رئيسي لجهازك.',
      subtitleEn: 'Unlock 400+ blockbuster titles, online multiplayer, cloud saves & game trials with full 1-year guarantee.',
      ctaTextAr: 'عروض اشتراكات بلس 🌟',
      ctaTextEn: 'View Plus Subscriptions 🌟',
      ctaAction: '#store?category=subscriptions',
      secondaryCtaTextAr: 'باقة ديلوكس 12 شهر',
      secondaryCtaTextEn: 'Deluxe 12M Plan',
      secondaryCtaAction: psPlus ? `#product/${psPlus.id}` : '#store?category=subscriptions',
      image: psPlus?.image || '/images/hero-subscriptions.svg',
      fallbackGradient: 'from-amber-950 via-slate-900 to-yellow-950',
      accentGlow: 'bg-amber-500/25',
      priceTagAr: psPlus ? `سنة كاملة بـ ${formatPrice(psPlus.priceJOD, psPlus.priceUSD)}` : 'خصم سنوي',
      priceTagEn: psPlus ? `1 Full Year for ${formatPrice(psPlus.priceJOD, psPlus.priceUSD)}` : 'Annual Discount',
      highlightPillsAr: ['🎮 +400 لعبة كبرى جاهزة للتحميل', '🌐 أونلاين بدون تقطيع', '📅 ضمان كامل 365 يوم'],
      highlightPillsEn: ['🎮 400+ Massive Games Library', '🌐 Seamless Multiplayer', '📅 Full 365-Day Guarantee'],
    },
    {
      id: 'slide-wukong-goty',
      badgeAr: 'لعبة العام الأسطورية 👑',
      badgeEn: 'Game of the Year 👑',
      badgeColor: 'from-rose-600 to-orange-600 text-white border-rose-400/40',
      titleAr: 'Black Myth: Wukong ورسوم الجيل الجديد UE5',
      titleEn: 'Black Myth: Wukong & Unreal Engine 5 Magic',
      subtitleAr: 'انطلق في ملحمة أسطورية وقتال زعماء خارق للعادة على جهاز PS5 مع دعم كامل للتروفيز والحفظ السحابي.',
      subtitleEn: 'Experience jaw-dropping Unreal Engine 5 action RPG with deep martial arts transformations on PS5.',
      ctaTextAr: 'شراء اللعبة الآن 👑',
      ctaTextEn: 'Buy Wukong Now 👑',
      ctaAction: wukong ? `#product/${wukong.id}` : '#store',
      secondaryCtaTextAr: 'تصفح كل الألعاب',
      secondaryCtaTextEn: 'Browse All Games',
      secondaryCtaAction: '#store?category=games',
      image: wukong?.image || '/images/hero-wukong.svg',
      fallbackGradient: 'from-rose-950 via-slate-900 to-amber-950',
      accentGlow: 'bg-orange-600/25',
      priceTagAr: wukong ? `عرض خاص: ${formatPrice(wukong.priceJOD, wukong.priceUSD)}` : 'خصم خاص',
      priceTagEn: wukong ? `Special: ${formatPrice(wukong.priceJOD, wukong.priceUSD)}` : 'Special Offer',
      highlightPillsAr: ['🏆 تقييم 5.0 نجوم من اللاعبين', '⚡ تنزيل مباشر وفوري', '👑 حساب أساسي دائم'],
      highlightPillsEn: ['🏆 5.0 Star Rated Masterpiece', '⚡ Instant Download', '👑 Permanent Primary Profile'],
    },
    {
      id: 'slide-cards-wallet',
      badgeAr: 'شحن رصيد ستيم وبلايستيشن 💳',
      badgeEn: 'Steam & PSN Wallet Top-Up 💳',
      badgeColor: 'from-cyan-600 to-blue-600 text-white border-cyan-400/40',
      titleAr: 'بطاقات PSN و Steam الرقمية بأكواد أصلية',
      titleEn: 'Original PSN & Steam Gift Cards & Wallet Codes',
      subtitleAr: 'اشحن رصيد حسابك الأمريكي، السعودي، أو العالمي فوراً عبر كود رقمي يصلك على الواتساب والإيميل بدقائق.',
      subtitleEn: 'Top up your US, Saudi, or Global store wallets instantly. 100% genuine codes delivered to your WhatsApp.',
      ctaTextAr: 'شراء بطاقات الشحن 💳',
      ctaTextEn: 'Buy Wallet Cards 💳',
      ctaAction: '#store?category=psn_cards',
      secondaryCtaTextAr: 'بطاقات Steam PC',
      secondaryCtaTextEn: 'Steam Cards',
      secondaryCtaAction: '#store?category=steam_cards',
      image: '/images/hero-wallet.svg',
      fallbackGradient: 'from-cyan-950 via-slate-900 to-blue-950',
      accentGlow: 'bg-cyan-500/25',
      priceTagAr: 'أكواد رقمية رسمية 100%',
      priceTagEn: '100% Genuine Digital Keys',
      highlightPillsAr: ['📲 إرسال فوري على الواتساب', '🔒 أكواد رسمية معتمدة', '💰 متوفر ستور أمريكي وسعودي'],
      highlightPillsEn: ['📲 Instant WhatsApp Dispatch', '🔒 Official Verified Codes', '💰 US & Saudi Stores Available'],
    },
    {
      id: 'slide-cliq-pickup',
      badgeAr: 'دفع كليك محلي واستلام فوري 🇯🇴',
      badgeEn: 'Jordan CliQ & Same-Day Pickup 🇯🇴',
      badgeColor: 'from-emerald-600 to-teal-600 text-white border-emerald-400/40',
      titleAr: 'دفع محلي عبر CliQ بدون عمولة واستلام من مقرنا',
      titleEn: '0-Fee CliQ Payment & Free Store Pickup in Amman',
      subtitleAr: 'حول المبلغ فورا للاسم المستعار QWADERPAY واستلم كودك خلال 5 دقائق، أو شرفنا في مقرنا بشارع الجامعة الأردنية!',
      subtitleEn: 'Instant 0% fee transfer via alias QWADERPAY, or visit our store at University of Jordan St. in Amman.',
      ctaTextAr: 'طرق الدفع والاستلام 📍',
      ctaTextEn: 'Payment & Pickup Info 📍',
      ctaAction: '#payment-methods',
      secondaryCtaTextAr: 'تتبع حالة طلبك',
      secondaryCtaTextEn: 'Track Your Order',
      secondaryCtaAction: '#track-order',
      image: '/images/hero-pickup.svg',
      fallbackGradient: 'from-emerald-950 via-slate-900 to-teal-950',
      accentGlow: 'bg-emerald-500/25',
      priceTagAr: 'اسم كليك: QWADERPAY',
      priceTagEn: 'CliQ Alias: QWADERPAY',
      highlightPillsAr: ['🇯🇴 كليك فوري بدون أي رسوم', '🏬 استلام مباشر مجاني', '🚚 توصيل لكافة المحافظات'],
      highlightPillsEn: ['🇯🇴 Zero Fee CliQ Transfer', '🏬 Free Store Pickup', '🚚 Doorstep Delivery Across Jordan'],
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imageLoadedState, setImageLoadedState] = useState<Record<string, boolean>>({});

  // Touch and Drag Swipe states
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const SLIDE_DURATION = 6000; // 6 seconds per slide

  const isRTL = language === 'ar';

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goToSlide = (idx: number) => {
    setCurrentIndex(idx);
  };

  // Autoplay handler
  useEffect(() => {
    if (isPaused || isDragging) {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      return;
    }

    autoPlayTimerRef.current = setInterval(() => {
      nextSlide();
    }, SLIDE_DURATION);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isPaused, isDragging, nextSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        if (isRTL) prevSlide();
        else nextSlide();
      } else if (e.key === 'ArrowLeft') {
        if (isRTL) nextSlide();
        else prevSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRTL, nextSlide, prevSlide]);

  // Touch Swipe Handlers (Optimized for Mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    const clientX = e.touches[0].clientX;
    setTouchStartX(clientX);
    setTouchCurrentX(clientX);
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || touchStartX === null) return;
    const clientX = e.touches[0].clientX;
    setTouchCurrentX(clientX);
    const diff = clientX - touchStartX;
    // Dampen drag effect for rubber-band feel
    setDragOffset(diff * 0.5);
  };

  const handleTouchEnd = () => {
    if (!isDragging || touchStartX === null || touchCurrentX === null) {
      setIsDragging(false);
      setDragOffset(0);
      setIsPaused(false);
      return;
    }

    const diff = touchCurrentX - touchStartX;
    const swipeThreshold = 45; // Min px swipe to trigger

    if (Math.abs(diff) > swipeThreshold) {
      if (diff < 0) {
        // Dragged to the left
        if (isRTL) {
          prevSlide();
        } else {
          nextSlide();
        }
      } else {
        // Dragged to the right
        if (isRTL) {
          nextSlide();
        } else {
          prevSlide();
        }
      }
    }

    setTouchStartX(null);
    setTouchCurrentX(null);
    setIsDragging(false);
    setDragOffset(0);
    setIsPaused(false);
  };

  // Mouse Drag handlers for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPaused(true);
    setTouchStartX(e.clientX);
    setTouchCurrentX(e.clientX);
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || touchStartX === null) return;
    setTouchCurrentX(e.clientX);
    const diff = e.clientX - touchStartX;
    setDragOffset(diff * 0.4);
  };

  const handleMouseUp = () => {
    handleTouchEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleTouchEnd();
    }
    setIsPaused(false);
  };

  const handleImageLoad = (slideId: string) => {
    setImageLoadedState((prev) => ({ ...prev, [slideId]: true }));
  };

  const currentSlide = slides[currentIndex];

  return (
    <div
      className="relative w-full max-w-7xl mx-auto px-2 sm:px-4 select-none group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Slider Container with Touch Support */}
      <div
        id="hero-slider-main-container"
        ref={sliderContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="relative overflow-hidden rounded-3xl border border-white/10 glass-card shadow-[0_20px_50px_rgba(0,0,0,0.6)] cursor-grab active:cursor-grabbing min-h-[460px] sm:min-h-[490px] md:min-h-[520px] flex items-center"
        style={{
          touchAction: 'pan-y'
        }}
      >
        {/* Slides Track */}
        <div
          className="w-full h-full flex transition-transform duration-500 ease-out"
          style={{
            transform: isRTL
              ? `translateX(calc(${currentIndex * 100}% - ${dragOffset}px))`
              : `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))`,
          }}
        >
          {slides.map((slide, idx) => {
            const isActive = idx === currentIndex;
            const isLoaded = imageLoadedState[slide.id];

            return (
              <div
                key={slide.id}
                className="w-full flex-shrink-0 relative min-h-[460px] sm:min-h-[490px] md:min-h-[520px] flex items-center overflow-hidden"
                aria-hidden={!isActive}
              >
                {/* Background Image with Blur-Up and Overlay */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${slide.fallbackGradient} opacity-90`} />
                  
                  {/* High Quality Responsive Image */}
                  <img
                    src={slide.image}
                    alt={language === 'ar' ? slide.titleAr : slide.titleEn}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    fetchPriority={idx === 0 ? 'high' : 'auto'}
                    referrerPolicy="no-referrer"
                    onLoad={() => handleImageLoad(slide.id)}
                    className={`w-full h-full object-cover object-center transition-all duration-700 ${
                      isLoaded ? 'opacity-35 scale-105 filter blur-0' : 'opacity-0 scale-100 filter blur-md'
                    }`}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />

                  {/* Multi-layered Gradients for Optical Contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />
                  <div className={`absolute -top-24 end-0 w-96 h-96 ${slide.accentGlow} rounded-full blur-3xl pointer-events-none`} />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(147,51,234,0.15),transparent_60%)]" />
                </div>

                {/* Slide Foreground Content */}
                <div className="relative z-10 w-full p-5 sm:p-8 md:p-12 lg:p-16 flex flex-col justify-center max-w-4xl">
                  
                  {/* Top Badge & Price Tag Row */}
                  <div className="flex flex-wrap items-center gap-2.5 mb-3.5 sm:mb-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] sm:text-xs font-black shadow-lg border bg-gradient-to-r ${slide.badgeColor}`}
                    >
                      <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{language === 'ar' ? slide.badgeAr : slide.badgeEn}</span>
                    </span>

                    {slide.priceTagAr && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] sm:text-xs font-mono font-bold bg-white/10 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                        <Zap className="w-3 h-3 text-emerald-400" />
                        <span>{language === 'ar' ? slide.priceTagAr : slide.priceTagEn}</span>
                      </span>
                    )}
                  </div>

                  {/* Main Slide Headline */}
                  <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-100 leading-[1.25] tracking-tight mb-3 sm:mb-4 font-cairo drop-shadow-md">
                    {language === 'ar' ? slide.titleAr : slide.titleEn}
                  </h2>

                  {/* Subtitle / Description */}
                  <p className="text-xs sm:text-sm md:text-base text-slate-300 max-w-2xl mb-5 sm:mb-6 leading-relaxed line-clamp-3 sm:line-clamp-none">
                    {language === 'ar' ? slide.subtitleAr : slide.subtitleEn}
                  </p>

                  {/* Highlight Feature Pills */}
                  <div className="flex flex-wrap items-center gap-2 mb-6 sm:mb-8">
                    {(language === 'ar' ? slide.highlightPillsAr : slide.highlightPillsEn).map(
                      (pill, pillIdx) => (
                        <span
                          key={pillIdx}
                          className="text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 backdrop-blur-sm flex items-center gap-1"
                        >
                          <span>{pill}</span>
                        </span>
                      )
                    )}
                  </div>

                  {/* Action Buttons (Touch-target >= 44px) */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <button
                      title="الشريحة السابقة"
                      id={`hero-slide-cta-${slide.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateTo(slide.ctaAction);
                      }}
                      className="min-h-[44px] px-6 sm:px-8 py-3 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-purple-900/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 font-cairo"
                    >
                      <Gamepad2 className="w-4 h-4 flex-shrink-0" />
                      <span>{language === 'ar' ? slide.ctaTextAr : slide.ctaTextEn}</span>
                      {language === 'ar' ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    </button>

                    {slide.secondaryCtaTextAr && (
                      <button
                        title="الشريحة التالية"
                        id={`hero-slide-secondary-${slide.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (slide.secondaryCtaAction) navigateTo(slide.secondaryCtaAction);
                        }}
                        className="min-h-[44px] px-5 sm:px-6 py-3 rounded-full glass-panel text-slate-200 hover:text-white border border-white/10 hover:border-purple-500/40 text-xs sm:text-sm font-bold transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <span>{language === 'ar' ? slide.secondaryCtaTextAr : slide.secondaryCtaTextEn}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Prev / Next Navigation Arrows (Desktop / Tablet) */}
        <button
          title="الشريحة السابقة"
          id="hero-slider-prev-btn"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isRTL) nextSlide();
            else prevSlide();
          }}
          aria-label={language === 'ar' ? 'الشريحة السابقة' : 'Previous Slide'}
          className="absolute start-3 sm:start-5 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] rounded-full glass-panel border border-white/15 text-slate-200 hover:text-white hover:bg-white/20 flex items-center justify-center transition-all opacity-80 hover:opacity-100 active:scale-90 z-20 shadow-lg"
        >
          {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>

        <button
          title="الشريحة التالية"
          id="hero-slider-next-btn"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isRTL) prevSlide();
            else nextSlide();
          }}
          aria-label={language === 'ar' ? 'الشريحة التالية' : 'Next Slide'}
          className="absolute end-3 sm:end-5 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] rounded-full glass-panel border border-white/15 text-slate-200 hover:text-white hover:bg-white/20 flex items-center justify-center transition-all opacity-80 hover:opacity-100 active:scale-90 z-20 shadow-lg"
        >
          {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {/* Bottom Pagination Dots & Autoplay Bar */}
        <div className="absolute bottom-3 sm:bottom-5 inset-x-0 z-20 flex flex-col items-center gap-2 pointer-events-none">
          
          {/* Active Timer Progress Line */}
          <div className="w-32 sm:w-48 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              key={currentIndex}
              className={`h-full bg-gradient-to-r from-purple-500 via-pink-500 to-emerald-400 rounded-full ${
                !isPaused ? 'animate-progress-fill' : ''
              }`}
              style={{
                animationDuration: `${SLIDE_DURATION}ms`,
                animationPlayState: isPaused ? 'paused' : 'running',
              }}
            />
          </div>

          {/* Dots with Touch-Target Padding (Min 44px click area) */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {slides.map((slide, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  title="اختيار الشريحة"
                  key={slide.id}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  aria-label={
                    language === 'ar' ? `الانتقال إلى الشريحة ${idx + 1}` : `Go to slide ${idx + 1}`
                  }
                  className="min-h-[44px] min-w-[32px] p-2 flex items-center justify-center focus:outline-none"
                >
                  <span
                    className={`block h-2 rounded-full transition-all duration-300 ${
                      isSelected
                        ? 'w-7 sm:w-8 bg-purple-400 shadow-md shadow-purple-500/50'
                        : 'w-2 bg-white/30 hover:bg-white/60'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Swipe Hint Badge (Only on first load / mobile screens) */}
        <div className="absolute top-3 end-3 z-20 sm:hidden flex items-center gap-1 text-[10px] text-slate-400 bg-black/40 px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-sm pointer-events-none">
          <span>{language === 'ar' ? 'اسحب للتنقل ↔' : 'Swipe ↔'}</span>
        </div>
      </div>
    </div>
  );
};
