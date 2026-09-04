import React, { useEffect, lazy, Suspense } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/layout/CartDrawer';
import { MaintenanceScreen } from './components/common/MaintenanceScreen';
import { CartChoiceModal } from './components/common/CartChoiceModal';
import { TwoStepVerificationModal } from './components/common/TwoStepVerificationModal';
import { ToastContainer } from './components/common/ToastContainer';

import { HomeView } from './views/HomeView';

const lazyWithRecovery = <T extends React.ComponentType<any>>(load: () => Promise<{ default: T }>) =>
  lazy(async () => {
    try {
      const module = await load();
      sessionStorage.removeItem('qwader:chunk-reload');
      return module;
    } catch (error) {
      const hasRetried = sessionStorage.getItem('qwader:chunk-reload') === '1';
      if (!hasRetried) {
        sessionStorage.setItem('qwader:chunk-reload', '1');
        const url = new URL(window.location.href);
        url.searchParams.set('chunk-reload', Date.now().toString());
        window.location.replace(url.toString());
      }
      throw error;
    }
  });

const StoreView = lazyWithRecovery(() => import('./views/StoreView').then(m => ({ default: m.StoreView })));
const ProductDetailView = lazyWithRecovery(() => import('./views/ProductDetailView').then(m => ({ default: m.ProductDetailView })));
const CheckoutView = lazyWithRecovery(() => import('./views/CheckoutView').then(m => ({ default: m.CheckoutView })));
const OrdersView = lazyWithRecovery(() => import('./views/OrdersView').then(m => ({ default: m.OrdersView })));
const FavoritesView = lazyWithRecovery(() => import('./views/FavoritesView').then(m => ({ default: m.FavoritesView })));
const CompareView = lazyWithRecovery(() => import('./views/CompareView').then(m => ({ default: m.CompareView })));
const AccountView = lazyWithRecovery(() => import('./views/AccountView').then(m => ({ default: m.AccountView })));
const SupportView = lazyWithRecovery(() => import('./views/SupportView').then(m => ({ default: m.SupportView })));
const PaymentMethodsView = lazyWithRecovery(() => import('./views/PaymentMethodsView').then(m => ({ default: m.PaymentMethodsView })));
const AboutView = lazyWithRecovery(() => import('./views/AboutView').then(m => ({ default: m.AboutView })));
const AdminDashboardView = lazyWithRecovery(() => import('./views/AdminDashboardView').then(m => ({ default: m.AdminDashboardView })));
const OrderTrackingView = lazyWithRecovery(() => import('./views/OrderTrackingView').then(m => ({ default: m.OrderTrackingView })));
const LoginView = lazyWithRecovery(() => import('./views/LoginView'));
const RegisterView = lazyWithRecovery(() => import('./views/RegisterView'));

import { MessageCircle, AlertTriangle } from 'lucide-react';

const RouteLoadingFallback: React.FC = () => (
  <div className="w-full flex items-center justify-center py-24">
    <div className="w-10 h-10 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
  </div>
);

const AppContent: React.FC = () => {
  const { state, currentUser, currentRoute, language, theme, isCartOpen, setIsCartOpen, completeAdminLoginFromLink } = useStore();

  useEffect(() => {
    void completeAdminLoginFromLink();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsCartOpen(false);
  }, [currentRoute, setIsCartOpen]);

  const isMaintenanceActive = state.settings.isMaintenanceMode && currentUser?.role !== 'owner';
  const isCheckoutRoute = currentRoute === '#checkout' || currentRoute === 'checkout';

  const handleWhatsApp = () => {
    const text = encodeURIComponent('مرحباً متجر قويدر ستور 🎮🇯🇴 أود الاستفسار عن...');
    window.open(`https://wa.me/${state.settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
  };

  const renderView = () => {
    if (isMaintenanceActive) {
      return <MaintenanceScreen />;
    }

    const route = currentRoute.startsWith('#') ? currentRoute : `#${currentRoute}`;

    if (route.startsWith('#product/')) {
      const productId = route.replace('#product/', '');
      return <ProductDetailView productId={productId} />;
    }

    if (route.startsWith('#track-order/')) {
      const orderId = route.replace('#track-order/', '');
      return <OrderTrackingView initialOrderId={orderId} />;
    }

    if (route.startsWith('#track/')) {
      const orderId = route.replace('#track/', '');
      return <OrderTrackingView initialOrderId={orderId} />;
    }

    switch (route) {
      case '#login':
        return <AccountView />;
      case '#register':
        return <RegisterView />;
      case '#track-order':
      case '#track':
        return <OrderTrackingView />;
      case '#store':
        return <StoreView />;
      case '#checkout':
        return <CheckoutView />;
      case '#orders':
        return <OrdersView />;
      case '#favorites':
        return <FavoritesView />;
      case '#compare':
        return <CompareView />;
      case '#account':
        return <AccountView />;
      case '#admin':
        return <AdminDashboardView />;
      case '#support':
        return <SupportView />;
      case '#payment-methods':
        return <PaymentMethodsView />;
      case '#about':
        return <AboutView />;
      case '#home':
      case '':
      default:
        return <HomeView />;
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${
        theme === 'light'
          ? 'bg-[#f8fafc] text-slate-900 light-mode'
          : 'bg-[#020617] text-slate-100 dark-mode'
      } ${
        language === 'ar' ? 'font-cairo' : 'font-sans'
      } selection:bg-purple-600 selection:text-white antialiased`}
    >
      {state.settings.isMaintenanceMode && currentUser?.role === 'owner' && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-center text-xs font-black flex items-center justify-center gap-2 shadow-lg sticky top-0 z-50">
          <AlertTriangle className="w-4 h-4 text-slate-950" />
          <span>
            {language === 'ar'
              ? 'تنبيه للمالك: المتجر حالياً في وضع الصيانة (العملاء يرون شاشة الصيانة فقط)'
              : 'Maintenance Mode is Active (Customers see maintenance screen)'}
          </span>
        </div>
      )}

      {!isCheckoutRoute && <Navbar />}
      <main className="flex-1 w-full pt-4 pb-16">
        <Suspense fallback={<RouteLoadingFallback />}>{renderView()}</Suspense>
      </main>
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <CartChoiceModal />
      <TwoStepVerificationModal />
      <ToastContainer />
      <button
        id="floating-whatsapp-btn"
        onClick={handleWhatsApp}
        className="fixed bottom-6 end-6 z-40 p-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-2xl shadow-emerald-500/50 hover:scale-110 active:scale-95 transition-all flex items-center justify-center border-2 border-white/20"
        title={language === 'ar' ? 'تواصل معنا عبر واتساب' : 'Chat on WhatsApp'}
        aria-label="WhatsApp Support"
      >
        <MessageCircle className="w-6 h-6 fill-current" />
      </button>
      {!isCheckoutRoute && <Footer />}
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </AuthProvider>
  );
}

export default App;

