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
  FiTag,
} from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { adminLogout } from '@/store/slices/adminAuthSlice';
import { fetchCategories } from '@/store/slices/catalogSlice';
import { resetBasket } from '@/store/slices/basketSlice';
import { resetWishlist } from '@/store/slices/wishlistSlice';
import { pushToast } from '@/store/slices/uiSlice';
import { useClickOutside, useScrollLock } from '@/hooks';
import { initials } from '@/lib/format';
import { BUY_MENU, SELL_MENU } from '@/lib/shopNav';
import { tokenStore } from '@/lib/storage';
import cn from '@/lib/cn';
import SearchBar from './SearchBar';
import BrandMark from './BrandMark';
import PromoTicker from './PromoTicker';
import { SmartImage } from '@/components/ui';

const MegaMenu = ({
  title,
  groups,
  onNavigate,
}: {
  title: string;
  groups: typeof BUY_MENU;
  onNavigate?: () => void;
}) => (
  <div className="p-4">
    <p className="px-2 pb-3 text-[11px] font-bold uppercase tracking-wide text-ink-400">{title}</p>
    <div className="grid grid-cols-3 gap-2">
      {groups.map((group) => (
        <div key={group.key}>
          <p className="px-2 text-sm font-bold text-ink-900">{group.label}</p>
          <div className="mt-1">
            {group.children.map((child) => (
              <Link
                key={child.to}
                to={child.to}
                onClick={onNavigate}
                className="block rounded-lg px-2 py-1.5 text-[13px] text-ink-500 transition hover:bg-ink-50 hover:text-brand-400"
              >
                {child.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Header = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const user = useAppSelector((state) => state.auth.user);
  const adminStatus = useAppSelector((state) => state.adminAuth.status);
  const admin = useAppSelector((state) => state.adminAuth.admin);
  const itemCount = useAppSelector((state) => state.basket.summary.itemCount);
  const wishlistCount = useAppSelector((state) => state.wishlist.productIds.length);
  const categoriesStatus = useAppSelector((state) => state.catalog.categoriesStatus);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<'buy' | 'sell' | null>(null);
  const closeAccountMenu = () => setAccountOpen(false);
  const accountRefDesktop = useClickOutside<HTMLDivElement>(closeAccountMenu);
  const accountRefMobile = useClickOutside<HTMLDivElement>(closeAccountMenu);
  const navRef = useClickOutside<HTMLDivElement>(() => setOpenMenu(null));

  useScrollLock(mobileOpen);

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

  return (
    <header className="sticky top-0 z-40">
      <PromoTicker />
      <div className="relative border-b border-brand-500/20 bg-void/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4 lg:gap-5 lg:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-brand-400 transition hover:bg-white/10 lg:hidden"
          >
            <FiMenu size={22} />
          </button>

          <BrandMark compact className="min-w-0 shrink-0 lg:hidden" />
          <BrandMark compact={false} className="hidden min-w-0 lg:flex" />

          <SearchBar className="mx-auto hidden min-w-0 max-w-2xl flex-1 md:block" />

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            {showDashboardLink && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 rounded-lg border border-white/30 bg-ink-100 px-2 py-1.5 text-[11px] font-bold text-brand-600 shadow-sm transition hover:bg-ink-50/95 sm:px-3 sm:text-xs"
                title="Open admin dashboard"
              >
                <FiLayout size={14} />
                <span className="hidden sm:inline">Admin dashboard</span>
              </Link>
            )}

            <Link
              to="/sell"
              className="flex h-9 items-center gap-1.5 rounded-full btn-glow-purple px-2.5 text-xs font-bold text-white sm:h-auto sm:px-4 sm:py-1.5 sm:text-sm"
              aria-label="Sell to us"
            >
              <FiTag size={15} />
              <span className="hidden sm:inline">Sell</span>
            </Link>

            <div ref={accountRefDesktop} className="relative hidden md:block">
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
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-100 text-[10px] font-bold text-brand-600">
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
                    className="absolute right-0 top-[calc(100%+10px)] w-60 overflow-hidden rounded-xl border border-ink-100 bg-ink-100 shadow-lift"
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
                        { to: '/account/requests', label: 'Sell quotes', icon: FiGift },
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
                <span className="absolute -right-0.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-void px-1 text-[9px] font-bold text-white">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link
              to="/basket"
              className="relative hidden flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 text-white transition hover:bg-white/10 md:flex"
              aria-label={`Basket, ${itemCount} items`}
            >
              <FiShoppingCart size={20} />
              <span className="hidden text-[9px] font-semibold sm:block">Basket</span>
              {itemCount > 0 && (
                <motion.span
                  key={itemCount}
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-0.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[9px] font-bold text-white"
                >
                  {itemCount}
                </motion.span>
              )}
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-white/15 px-3 py-2 md:hidden">
          <SearchBar className="min-w-0 flex-1" />
          <div ref={accountRefMobile} className="relative shrink-0">
            <button
              type="button"
              onClick={() => (user ? setAccountOpen((open) => !open) : navigate('/login'))}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition hover:bg-white/10"
              aria-label={user ? 'Account menu' : 'Sign in'}
            >
              {user?.avatar ? (
                <SmartImage
                  src={user.avatar}
                  alt=""
                  wrapperClassName="h-7 w-7 rounded-full"
                  className="h-full w-full object-cover"
                />
              ) : user ? (
                <span className="text-[10px] font-bold text-brand-300">{initials(user.fullName)}</span>
              ) : (
                <FiUser size={18} />
              )}
            </button>
          </div>
          <Link
            to="/basket"
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition hover:bg-white/10"
            aria-label={`Basket, ${itemCount} items`}
          >
            <FiShoppingCart size={18} />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[9px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>
        </div>

        <AnimatePresence>
          {accountOpen && user && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute right-3 top-[calc(100%-2px)] z-50 w-60 overflow-hidden rounded-xl border border-ink-100 bg-ink-100 shadow-lift md:hidden"
            >
              <div className="border-b border-ink-100 bg-ink-50 px-4 py-3">
                <p className="truncate text-sm font-bold text-ink-900">{user.fullName}</p>
                <p className="truncate text-xs text-ink-500">{user.email}</p>
              </div>
              <nav className="p-1.5">
                {[
                  { to: '/account', label: 'My account', icon: FiUser },
                  { to: '/account/orders', label: 'My orders', icon: FiPackage },
                  { to: '/account/wishlist', label: 'Wishlist', icon: FiHeart },
                  { to: '/account/requests', label: 'Sell quotes', icon: FiGift },
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

        <nav className="hidden border-t border-white/15 lg:block">
          <div
            ref={navRef}
            className="relative mx-auto flex max-w-7xl items-center justify-center gap-1 px-4 lg:px-6"
            onMouseLeave={() => setOpenMenu(null)}
          >
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

            {(['buy', 'sell'] as const).map((key) => (
              <div key={key} onMouseEnter={() => setOpenMenu(key)}>
                <button
                  type="button"
                  onClick={() => setOpenMenu((current) => (current === key ? null : key))}
                  className={cn(
                    'inline-flex items-center gap-1 px-3 py-2.5 text-[13px] font-semibold text-white/90 transition hover:text-white',
                    openMenu === key && 'text-white'
                  )}
                >
                  {key === 'buy' ? 'Buy' : 'Sell'}
                  <FiChevronDown size={12} />
                </button>
              </div>
            ))}

            <AnimatePresence>
              {openMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-1/2 top-full z-40 w-[min(92vw,640px)] -translate-x-1/2 pt-1"
                >
                  <div className="rounded-2xl border border-ink-200 bg-ink-100 shadow-lift">
                    <MegaMenu
                      title={openMenu === 'buy' ? 'Buy' : 'Sell'}
                      groups={openMenu === 'buy' ? BUY_MENU : SELL_MENU}
                      onNavigate={() => setOpenMenu(null)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-void/55"
            />

            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="relative flex h-full w-[86%] max-w-xs flex-col bg-ink-50"
            >
              <div className="flex items-center justify-between border-b border-brand-500/20 bg-void px-4 py-4">
                <BrandMark to="/" />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="rounded-lg p-1.5 text-brand-400 transition hover:bg-white/10"
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
                        className="mb-3 flex items-center gap-2 rounded-xl btn-glow px-3 py-2.5 text-sm font-bold text-void"
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
                      className="rounded-full btn-glow py-2.5 text-center text-sm font-bold text-void"
                    >
                      Sign in
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-full border border-ink-300 py-2.5 text-center text-sm font-bold text-ink-800"
                    >
                      Register
                    </Link>
                  </div>
                )}

                <Link
                  to="/sell"
                  onClick={() => setMobileOpen(false)}
                  className="mb-4 flex items-center justify-center gap-2 rounded-full btn-glow-purple py-2.5 text-sm font-bold text-white"
                >
                  <FiTag size={15} />
                  Sell to us
                </Link>

                {[
                  { title: 'Buy', groups: BUY_MENU },
                  { title: 'Sell', groups: SELL_MENU },
                ].map((section) => (
                  <div key={section.title} className="mb-4">
                    <p className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">
                      {section.title}
                    </p>
                    {section.groups.map((group) => (
                      <div key={`${section.title}-${group.key}`} className="border-b border-ink-100 last:border-0">
                        <p className="px-2 pt-2 text-sm font-semibold text-ink-800">{group.label}</p>
                        <div className="pb-2 pl-4">
                          {group.children.map((child) => (
                            <Link
                              key={child.to}
                              to={child.to}
                              onClick={() => setMobileOpen(false)}
                              className="block py-1.5 text-[13px] text-ink-500 transition hover:text-brand-600"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
