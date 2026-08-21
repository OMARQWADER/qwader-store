import React, { useEffect } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/layout/CartDrawer';
import { MaintenanceScreen } from './components/common/MaintenanceScreen';
import { TwoStepVerificationModal } from './components/common/TwoStepVerificationModal';
import { ToastContainer } from './components/common/ToastContainer';

import { HomeView } from './views/HomeView';
import { StoreView } from './views/StoreView';
import { ProductDetailView } from './views/ProductDetailView';
import { CheckoutView } from './views/CheckoutView';
import { OrdersView } from './views/OrdersView';
import { FavoritesView } from './views/FavoritesView';
import { CompareView } from './views/CompareView';
import { AccountView } from './views/AccountView';
import { SupportView } from './views/SupportView';
import { PaymentMethodsView } from './views/PaymentMethodsView';
import { AboutView } from './views/AboutView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { OrderTrackingView } from './views/OrderTrackingView';
import { MessageCircle, AlertTriangle } from 'lucide-react';

const AppContent: React.FC = () => {
  const { state, currentUser, currentRoute, language, theme, isCartOpen, setIsCartOpen } = useStore();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentRoute]);

  // Check if store is in Maintenance Mode (Owner can still access)
  const isMaintenanceActive = state.settings.maintenanceMode && currentUser?.role !== 'owner';

  const handleWhatsApp = () => {
    const text = encodeURIComponent('مرحباً متجر قويدر ستور 🎮🇯🇴 أود الاستفسار عن...');
    window.open(`https://wa.me/${state.settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
  };

  // Route Dispatcher
  const renderView = () => {
    if (isMaintenanceActive) {
      return <MaintenanceScreen />;
    }

    if (currentRoute.startsWith('#product/')) {
      const productId = currentRoute.replace('#product/', '');
      return <ProductDetailView productId={productId} />;
    }

    if (currentRoute.startsWith('#track-order/')) {
      const orderId = currentRoute.replace('#track-order/', '');
      return <OrderTrackingView initialOrderId={orderId} />;
    }

    if (currentRoute.startsWith('#track/')) {
      const orderId = currentRoute.replace('#track/', '');
      return <OrderTrackingView initialOrderId={orderId} />;
    }

    switch (currentRoute) {
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
      {/* Maintenance Mode Warning for Owner */}
      {state.settings.maintenanceMode && currentUser?.role === 'owner' && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-center text-xs font-black flex items-center justify-center gap-2 shadow-lg sticky top-0 z-50">
          <AlertTriangle className="w-4 h-4 text-slate-950" />
          <span>
            {language === 'ar'
              ? 'تنبيه للمالك: المتجر حالياً في وضع الصيانة (العملاء يرون شاشة الصيانة فقط)'
              : 'Maintenance Mode is Active (Customers see maintenance screen)'}
          </span>
        </div>
      )}

      {/* Main Navigation Bar */}
      <Navbar />

      {/* Main Page Dynamic Content */}
      <main className="flex-1 w-full pt-4 pb-16">{renderView()}</main>

      {/* Slide-over Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Sensitive Action Two-Step Verification Modal */}
      <TwoStepVerificationModal />

      {/* Global In-App Toast System */}
      <ToastContainer />

      {/* Floating WhatsApp Action Button */}
      <button
        id="floating-whatsapp-btn"
        onClick={handleWhatsApp}
        className="fixed bottom-6 end-6 z-40 p-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-2xl shadow-emerald-500/50 hover:scale-110 active:scale-95 transition-all flex items-center justify-center border-2 border-white/20"
        title={language === 'ar' ? 'تواصل معنا عبر واتساب' : 'Chat on WhatsApp'}
        aria-label="WhatsApp Support"
      >
        <MessageCircle className="w-6 h-6 fill-current" />
      </button>

      {/* Global Store Footer */}
      <Footer />
    </div>
  );
};

export function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}

export default App;

