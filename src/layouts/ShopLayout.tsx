import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHome, FiGrid, FiShoppingCart, FiHeart, FiUser } from 'react-icons/fi';
import { NavLink } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import { bootstrapAdmin } from '@/store/slices/adminAuthSlice';
import { fetchBasket } from '@/store/slices/basketSlice';
import { fetchWishlistIds } from '@/store/slices/wishlistSlice';
import Header from '@/components/shop/Header';
import Footer from '@/components/shop/Footer';
import { tokenStore } from '@/lib/storage';
import cn from '@/lib/cn';
import { removeStripeTestingAssistant } from '@/lib/stripeAssistant';

const MOBILE_TABS = [
  { to: '/', label: 'Home', icon: FiHome, end: true },
  { to: '/search', label: 'Browse', icon: FiGrid },
  { to: '/basket', label: 'Basket', icon: FiShoppingCart, badge: 'basket' as const },
  { to: '/account/wishlist', label: 'Saved', icon: FiHeart, match: 'wishlist' as const },
  { to: '/account', label: 'Account', icon: FiUser, match: 'account' as const },
];

const isMobileTabActive = (tab: (typeof MOBILE_TABS)[number], pathname: string) => {
  if (tab.match === 'wishlist') {
    return pathname === '/account/wishlist' || pathname.startsWith('/account/wishlist/');
  }

  if (tab.match === 'account') {
    return (
      pathname === '/account' ||
      (pathname.startsWith('/account/') && !pathname.startsWith('/account/wishlist'))
    );
  }

  if (tab.end) return pathname === tab.to;

  return pathname === tab.to || pathname.startsWith(`${tab.to}/`);
};

const ShopLayout = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();

  const authStatus = useAppSelector((state) => state.auth.status);
  const adminStatus = useAppSelector((state) => state.adminAuth.status);
  const basketStatus = useAppSelector((state) => state.basket.status);
  const wishlistStatus = useAppSelector((state) => state.wishlist.status);
  const itemCount = useAppSelector((state) => state.basket.summary.itemCount);

  const isAuthenticated = authStatus === 'authenticated';

  // Load the basket once auth has settled, so guests get their local basket
  // and signed-in customers get the server copy.
  useEffect(() => {
    if (authStatus === 'idle' || authStatus === 'loading') return;
    void dispatch(fetchBasket(isAuthenticated));
  }, [dispatch, authStatus, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && wishlistStatus === 'idle') void dispatch(fetchWishlistIds());
  }, [dispatch, isAuthenticated, wishlistStatus]);

  // Restore admin session on the storefront when staff tokens exist.
  useEffect(() => {
    const hasAdminToken = Boolean(tokenStore.getAccess('admin') || tokenStore.getRefresh('admin'));
    if (hasAdminToken && (adminStatus === 'idle' || adminStatus === 'guest')) {
      void dispatch(bootstrapAdmin());
    }
  }, [dispatch, adminStatus]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    removeStripeTestingAssistant();
  }, [location.pathname]);

  void basketStatus;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="min-w-0 flex-1 overflow-x-hidden pb-16 lg:pb-0"
      >
        <Outlet />
      </motion.main>

      <Footer />

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-ink-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={() =>
                cn(
                  'relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition',
                  isMobileTabActive(tab, location.pathname)
                    ? 'text-brand-600'
                    : 'text-ink-500'
                )
              }
            >
              <tab.icon size={19} />
              {tab.label}
              {tab.badge === 'basket' && itemCount > 0 && (
                <span className="absolute right-[22%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[9px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default ShopLayout;
