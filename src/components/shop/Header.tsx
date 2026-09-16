import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiMenu,
  FiX,
  FiUser,
  FiShoppingCart,
  FiHeart,
  FiPackage,
  FiLogOut,
  FiChevronDown,
  FiGift,
  FiLayout,
} from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { adminLogout } from '@/store/slices/adminAuthSlice';
import { fetchCategories } from '@/store/slices/catalogSlice';
import { resetBasket } from '@/store/slices/basketSlice';
import { resetWishlist } from '@/store/slices/wishlistSlice';
import { pushToast } from '@/store/slices/uiSlice';
import { useClickOutside } from '@/hooks';
import { initials } from '@/lib/format';
import { tokenStore } from '@/lib/storage';
import cn from '@/lib/cn';
import SearchBar from './SearchBar';
import { SmartImage } from '@/components/ui';

const Header = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const user = useAppSelector((state) => state.auth.user);
  const adminStatus = useAppSelector((state) => state.adminAuth.status);
  const admin = useAppSelector((state) => state.adminAuth.admin);
  const itemCount = useAppSelector((state) => state.basket.summary.itemCount);
  const wishlistCount = useAppSelector((state) => state.wishlist.productIds.length);
  const categories = useAppSelector((state) => state.catalog.categories);
  const categoriesStatus = useAppSelector((state) => state.catalog.categoriesStatus);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useClickOutside<HTMLDivElement>(() => setAccountOpen(false));

  useEffect(() => {
    if (categoriesStatus === 'idle') void dispatch(fetchCategories());
  }, [dispatch, categoriesStatus]);

  const handleLogout = async () => {
    await dispatch(logout());
    if (tokenStore.getAccess('admin') || tokenStore.getRefresh('admin')) {
      await dispatch(adminLogout());
    }
    dispatch(resetBasket());
    dispatch(resetWishlist());
    dispatch(pushToast('You have been signed out', 'info'));
    setAccountOpen(false);
    setMobileOpen(false);
    navigate('/');
  };

  const showDashboardLink =
    adminStatus === 'authenticated' ||
    Boolean(admin) ||
    Boolean(tokenStore.getAccess('admin') || tokenStore.getRefresh('admin'));

  const navCategories = categories.slice(0, 7);

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-brand-600">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 sm:h-16 sm:gap-4 sm:px-4 lg:gap-5 lg:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex shrink-0 flex-col items-center gap-0.5 text-white lg:hidden"
          >
            <FiMenu size={22} />
            <span className="hidden text-[9px] font-semibold xs:block">Menu</span>
          </button>

          <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Retro Shop home">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-black text-brand-600 sm:h-9 sm:w-9 sm:text-sm">
              RS
            </span>
            <span className="hidden text-lg font-black tracking-tight text-white md:block">
              Retro<span className="text-white/70">Shop</span>
            </span>
          </Link>

          <SearchBar className="mx-auto hidden min-w-0 max-w-2xl flex-1 md:block" />

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-3">
            {showDashboardLink && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 rounded-lg border border-white/30 bg-white px-2 py-1.5 text-[11px] font-bold text-brand-600 shadow-sm transition hover:bg-white/95 sm:px-3 sm:text-xs"
                title="Open admin dashboard"
              >
                <FiLayout size={14} />
                <span className="hidden sm:inline">Admin dashboard</span>
              </Link>
            )}

            {/* Account */}
            <div ref={accountRef} className="relative">
              <button
                type="button"
                onClick={() => (user ? setAccountOpen((open) => !open) : navigate('/login'))}
                className="flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 text-white transition hover:bg-white/10"
                aria-label={user ? 'Account menu' : 'Sign in'}
              >
                {user?.avatar ? (
                  <SmartImage
                    src={user.avatar}
                    alt={user.fullName}
                    wrapperClassName="h-6 w-6 rounded-full"
                    className="h-full w-full object-cover"
                  />
                ) : user ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-bold text-brand-600">
                    {initials(user.fullName)}
                  </span>
                ) : (
                  <FiUser size={20} />
                )}
                <span className="hidden text-[9px] font-semibold sm:flex sm:items-center sm:gap-0.5">
                  {user ? user.firstName : 'Sign in'}
                  {user && <FiChevronDown size={9} />}
                </span>
              </button>

              <AnimatePresence>
                {accountOpen && user && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-[calc(100%+10px)] w-60 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-lift"
                  >
                    <div className="border-b border-ink-100 bg-ink-50 px-4 py-3">
                      <p className="truncate text-sm font-bold text-ink-900">{user.fullName}</p>
                      <p className="truncate text-xs text-ink-500">{user.email}</p>
                    </div>

                    <nav className="p-1.5">
                      {showDashboardLink && (
                        <Link
                          to="/admin"
                          onClick={() => setAccountOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
                        >
                          <FiLayout size={15} className="text-brand-600" />
                          Admin dashboard
                        </Link>
                      )}

                      {[
                        { to: '/account', label: 'My account', icon: FiUser },
                        { to: '/account/orders', label: 'My orders', icon: FiPackage },
                        { to: '/account/wishlist', label: 'Wishlist', icon: FiHeart },
                        { to: '/account/requests', label: 'Game requests', icon: FiGift },
                      ].map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setAccountOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
                        >
                          <item.icon size={15} className="text-ink-400" />
                          {item.label}
                        </Link>
                      ))}

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-1 flex w-full items-center gap-2.5 border-t border-ink-100 px-3 py-2.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
                      >
                        <FiLogOut size={15} />
                        Sign out
                      </button>
                    </nav>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link
              to="/account/wishlist"
              className="relative hidden flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 text-white transition hover:bg-white/10 sm:flex"
              aria-label="Wishlist"
            >
              <FiHeart size={20} />
              <span className="text-[9px] font-semibold">Saved</span>
              {wishlistCount > 0 && (
                <span className="absolute -right-0.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink-900 px-1 text-[9px] font-bold text-white">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link
              to="/basket"
              className="relative flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 text-white transition hover:bg-white/10"
              aria-label={`Basket, ${itemCount} items`}
            >
              <FiShoppingCart size={20} />
              <span className="hidden text-[9px] font-semibold sm:block">Basket</span>
              {itemCount > 0 && (
                <motion.span
                  key={itemCount}
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-0.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink-900 px-1 text-[9px] font-bold text-white"
                >
                  {itemCount}
                </motion.span>
              )}
            </Link>
          </div>
        </div>

        <div className="border-t border-white/15 px-3 py-2 md:hidden">
          <SearchBar />
        </div>

        {/* Category nav */}
        <nav className="hidden border-t border-white/15 lg:block">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-1 px-4 lg:px-6">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  'px-3 py-2.5 text-[13px] font-semibold text-white/90 transition hover:text-white',
                  isActive && 'text-white underline decoration-2 underline-offset-[7px]'
                )
              }
            >
              Home
            </NavLink>

            {navCategories.map((category) => (
              <NavLink
                key={category.id}
                to={`/category/${category.slug}`}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-2.5 text-[13px] font-semibold text-white/90 transition hover:text-white',
                    isActive && 'text-white underline decoration-2 underline-offset-[7px]'
                  )
                }
              >
                {category.name}
              </NavLink>
            ))}

            <NavLink
              to="/request-a-game"
              className="ml-2 rounded-full bg-white/15 px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-white/25"
            >
              Request a game
            </NavLink>
          </div>
        </nav>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-ink-900/55"
            />

            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="relative flex h-full w-[86%] max-w-xs flex-col bg-white"
            >
              <div className="flex items-center justify-between bg-brand-600 px-4 py-4">
                <span className="text-lg font-black text-white">RetroShop</span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="rounded-lg p-1.5 text-white transition hover:bg-white/15"
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {user ? (
                  <>
                    {showDashboardLink && (
                      <Link
                        to="/admin"
                        onClick={() => setMobileOpen(false)}
                        className="mb-3 flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-bold text-white"
                      >
                        <FiLayout size={16} />
                        Admin dashboard
                      </Link>
                    )}
                    <Link
                    to="/account"
                    onClick={() => setMobileOpen(false)}
                    className="mb-3 flex items-center gap-3 rounded-xl bg-ink-50 p-3"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                      {initials(user.fullName)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink-900">
                        {user.fullName}
                      </span>
                      <span className="block text-xs text-ink-500">View my account</span>
                    </span>
                  </Link>
                  </>
                ) : (
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <Link
                      to="/login"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg bg-brand-600 py-2.5 text-center text-sm font-bold text-white"
                    >
                      Sign in
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg border border-ink-200 py-2.5 text-center text-sm font-bold text-ink-700"
                    >
                      Register
                    </Link>
                  </div>
                )}

                <p className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">
                  Shop by category
                </p>

                {categories.length === 0 ? (
                  <p className="px-2 py-2 text-sm text-ink-500">No categories yet.</p>
                ) : (
                  categories.map((category) => (
                  <div key={category.id} className="border-b border-ink-100 last:border-0">
                    <Link
                      to={`/category/${category.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className="block px-2 py-2.5 text-sm font-semibold text-ink-800"
                    >
                      {category.name}
                    </Link>
                    {(category.children || []).length > 0 && (
                      <div className="pb-2 pl-4">
                        {category.children!.map((child) => (
                          <Link
                            key={child.id}
                            to={`/category/${child.slug}`}
                            onClick={() => setMobileOpen(false)}
                            className="block py-1.5 text-[13px] text-ink-500 transition hover:text-brand-600"
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))
                )}

                <Link
                  to="/request-a-game"
                  onClick={() => setMobileOpen(false)}
                  className="mt-4 block rounded-lg bg-ink-900 py-2.5 text-center text-sm font-bold text-white"
                >
                  Request a game
                </Link>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
