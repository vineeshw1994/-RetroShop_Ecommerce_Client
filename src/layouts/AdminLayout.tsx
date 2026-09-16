import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiGrid,
  FiBox,
  FiLayers,
  FiImage,
  FiShoppingBag,
  FiArchive,
  FiUsers,
  FiGift,
  FiTag,
  FiMail,
  FiBarChart2,
  FiShield,
  FiUser,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiChevronDown,
  FiChevronsLeft,
  FiExternalLink,
  FiAlertTriangle,
  FiCreditCard,
  FiRotateCcw,
  FiFolder,
} from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '@/store';
import { bootstrapAdmin, adminLogout } from '@/store/slices/adminAuthSlice';
import { pushToast, toggleAdminSidebar } from '@/store/slices/uiSlice';
import { usePermissions, useClickOutside } from '@/hooks';
import { useAdminAlerts } from '@/hooks/useAdminAlerts';
import type { AdminAlertKey } from '@/lib/adminAlerts';
import { initials } from '@/lib/format';
import cn from '@/lib/cn';
import { SmartImage } from '@/components/ui';

interface NavItem {
  to: string;
  label: string;
  icon: typeof FiGrid;
  /** Any one of these permissions reveals the link. */
  permissions?: string[];
  superAdminOnly?: boolean;
  end?: boolean;
  alertKey?: AdminAlertKey;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: FiGrid, permissions: ['dashboard:view'], end: true },
      { to: '/admin/reports', label: 'Reports', icon: FiBarChart2, permissions: ['reports:view'] },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { to: '/admin/products', label: 'Products', icon: FiBox, permissions: ['products:view'] },
      { to: '/admin/gallery', label: 'Gallery', icon: FiFolder, permissions: ['products:view'] },
      { to: '/admin/categories', label: 'Categories', icon: FiLayers, permissions: ['categories:view'] },
      { to: '/admin/banners', label: 'Banners', icon: FiImage, permissions: ['banners:view'] },
      { to: '/admin/inventory', label: 'Inventory', icon: FiArchive, permissions: ['inventory:view'], alertKey: 'lowStockCount' },
    ],
  },
  {
    title: 'Sales',
    items: [
      { to: '/admin/orders', label: 'Orders', icon: FiShoppingBag, permissions: ['orders:view'] },
      { to: '/admin/transactions', label: 'Transactions', icon: FiCreditCard, permissions: ['orders:view'] },
      { to: '/admin/returns', label: 'Returns', icon: FiRotateCcw, permissions: ['orders:view'], alertKey: 'pendingReturns' },
      { to: '/admin/coupons', label: 'Coupons', icon: FiTag, permissions: ['coupons:view'] },
      { to: '/admin/customers', label: 'Customers', icon: FiUsers, permissions: ['customers:view'] },
      { to: '/admin/requests', label: 'Game requests', icon: FiGift, permissions: ['requests:view'], alertKey: 'pendingRequests' },
      { to: '/admin/contacts', label: 'Contact messages', icon: FiMail, permissions: ['contacts:view'], alertKey: 'unreadContacts' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: '/admin/staff', label: 'Staff & access', icon: FiShield, superAdminOnly: true },
      { to: '/admin/settings', label: 'Shop settings', icon: FiSettings, permissions: ['settings:view'] },
      { to: '/admin/profile', label: 'My profile', icon: FiUser },
    ],
  },
];

const AdminLayout = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { admin, canAny, isSuperAdmin } = usePermissions();
  const collapsed = useAppSelector((state) => state.ui.adminSidebarCollapsed);
  const { unseen, counts, markSeen } = useAdminAlerts();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useClickOutside<HTMLDivElement>(() => setMenuOpen(false));

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const routes: { prefix: string; key: AdminAlertKey }[] = [
      { prefix: '/admin/inventory', key: 'lowStockCount' },
      { prefix: '/admin/requests', key: 'pendingRequests' },
      { prefix: '/admin/contacts', key: 'unreadContacts' },
      { prefix: '/admin/returns', key: 'pendingReturns' },
    ];

    const match = routes.find((route) => location.pathname.startsWith(route.prefix));
    if (match && counts[match.key] > 0) {
      markSeen(match.key);
    }
  }, [location.pathname, counts, markSeen]);

  const handleLogout = async () => {
    await dispatch(adminLogout());
    dispatch(pushToast('Signed out of the dashboard', 'info'));
    navigate('/admin/login');
  };

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.superAdminOnly) return isSuperAdmin;
      if (!item.permissions) return true;
      return canAny(...item.permissions);
    }),
  })).filter((group) => group.items.length > 0);

  const sidebarContent = (
    <>
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-white/10 px-4',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        <Link to="/admin" className="flex items-center gap-2.5 overflow-hidden">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-black text-white">
            RS
          </span>
          {!collapsed && (
            <span className="whitespace-nowrap">
              <span className="block text-sm font-bold leading-tight text-white">RetroShop</span>
              <span className="block text-[10px] leading-tight text-ink-400">
                {isSuperAdmin ? 'Owner dashboard' : 'Staff dashboard'}
              </span>
            </span>
          )}
        </Link>

        {!collapsed && (
          <button
            type="button"
            onClick={() => dispatch(toggleAdminSidebar())}
            aria-label="Collapse sidebar"
            className="hidden rounded-lg p-1.5 text-ink-400 transition hover:bg-white/10 hover:text-white lg:block"
          >
            <FiChevronsLeft size={16} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {visibleGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-wider text-ink-500">
                {group.title}
              </p>
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'relative flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-medium transition',
                      collapsed && 'justify-center px-0',
                      isActive
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-ink-300 hover:bg-white/10 hover:text-white'
                    )
                  }
                >
                  <item.icon size={17} className="shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {item.alertKey && unseen[item.alertKey] > 0 && (
                    <span
                      className={cn(
                        'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white',
                        collapsed && 'absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1'
                      )}
                    >
                      {unseen[item.alertKey] > 9 ? '9+' : unseen[item.alertKey]}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-ink-400 transition hover:bg-white/10 hover:text-white',
            collapsed && 'justify-center px-0'
          )}
        >
          <FiExternalLink size={15} />
          {!collapsed && 'View storefront'}
        </a>

        {collapsed && (
          <button
            type="button"
            onClick={() => dispatch(toggleAdminSidebar())}
            aria-label="Expand sidebar"
            className="mt-1 flex w-full justify-center rounded-lg py-2 text-ink-400 transition hover:bg-white/10 hover:text-white"
          >
            <FiMenu size={16} />
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-ink-50">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col bg-ink-900 transition-[width] duration-200 lg:flex',
          collapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-ink-900/60"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="relative flex h-full w-64 flex-col bg-ink-900"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-ink-400 hover:bg-white/10 hover:text-white"
              >
                <FiX size={18} />
              </button>
              {sidebarContent}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-200 bg-white/95 px-4 backdrop-blur lg:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 text-ink-600 transition hover:bg-ink-100 lg:hidden"
          >
            <FiMenu size={20} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink-900">
              {admin?.name}
              {admin?.jobTitle && (
                <span className="ml-2 font-normal text-ink-400">{admin.jobTitle}</span>
              )}
            </p>
            <p className="text-xs text-ink-500">
              {isSuperAdmin
                ? 'Full access'
                : `${admin?.permissions.length || 0} permissions granted`}
            </p>
          </div>

          {admin?.mustChangePassword && (
            <Link
              to="/admin/profile"
              className="hidden items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100 sm:flex"
            >
              <FiAlertTriangle size={13} />
              Change your temporary password
            </Link>
          )}

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-ink-100"
              aria-label="Account menu"
            >
              {admin?.avatar ? (
                <SmartImage
                  src={admin.avatar}
                  alt={admin.name}
                  wrapperClassName="h-9 w-9 rounded-full"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-900 text-xs font-bold text-white">
                  {initials(admin?.name || 'A')}
                </span>
              )}
              <FiChevronDown size={14} className="text-ink-400" />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-[calc(100%+8px)] w-56 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-lift"
                >
                  <div className="border-b border-ink-100 bg-ink-50 px-4 py-3">
                    <p className="truncate text-sm font-bold text-ink-900">{admin?.name}</p>
                    <p className="truncate text-xs text-ink-500">{admin?.email}</p>
                    <span className="mt-1.5 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                      {admin?.role === 'super_admin' ? 'Super admin' : 'Staff'}
                    </span>
                  </div>

                  <div className="p-1.5">
                    <Link
                      to="/admin/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
                    >
                      <FiUser size={15} className="text-ink-400" />
                      My profile
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
                    >
                      <FiLogOut size={15} />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 p-4 lg:p-6"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
};

export default AdminLayout;
