import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiBell,
  FiChevronRight,
  FiCreditCard,
  FiGift,
  FiHeart,
  FiHelpCircle,
  FiLogOut,
  FiMapPin,
  FiPackage,
  FiRefreshCw,
  FiSettings,
  FiUser,
} from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '@/store';
import { accountService } from '@/services/account.service';
import { logout } from '@/store/slices/authSlice';
import { resetBasket } from '@/store/slices/basketSlice';
import { resetWishlist } from '@/store/slices/wishlistSlice';
import { pushToast } from '@/store/slices/uiSlice';
import { useAsync, useDocumentTitle } from '@/hooks';
import { formatPrice, initials } from '@/lib/format';
import cn from '@/lib/cn';
import { ErrorState, Skeleton, SmartImage } from '@/components/ui';

const QuickTile = ({
  to,
  title,
  hint,
  icon,
  tone,
  delay,
}: {
  to: string;
  title: string;
  hint: string;
  icon: ReactNode;
  tone: string;
  delay: number;
}) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
    <Link
      to={to}
      className="card flex h-full flex-col gap-3 border-ink-200 p-4 transition hover:border-brand-500/40 hover:shadow-lift"
    >
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tone)}>{icon}</span>
      <div>
        <p className="text-sm font-bold text-ink-900">{title}</p>
        <p className="mt-0.5 text-xs text-ink-500">{hint}</p>
      </div>
      <FiChevronRight className="mt-auto text-ink-400" size={18} />
    </Link>
  </motion.div>
);

const MenuRow = ({
  to,
  label,
  icon,
  badge,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  badge?: ReactNode;
}) => (
  <Link
    to={to}
    className="flex items-center gap-3 border-b border-ink-100 px-1 py-3.5 transition last:border-0 hover:bg-ink-50/80"
  >
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-700">
      {icon}
    </span>
    <span className="min-w-0 flex-1 text-sm font-semibold text-ink-900">{label}</span>
    {badge ?? <FiChevronRight className="shrink-0 text-ink-400" size={18} />}
  </Link>
);

const AccountOverview = () => {
  useDocumentTitle('Account');

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const { data, loading, error, reload } = useAsync(() => accountService.overview(), []);

  const overview = data?.data;
  const creditDisplay = formatPrice(0);

  const handleLogout = async () => {
    await dispatch(logout());
    dispatch(resetBasket());
    dispatch(resetWishlist());
    dispatch(pushToast('You have been signed out', 'info'));
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 lg:max-w-2xl">
      <header className="flex items-center gap-3">
        {user?.avatar ? (
          <SmartImage
            src={user.avatar}
            alt={user.fullName}
            wrapperClassName="h-14 w-14 shrink-0 rounded-full ring-2 ring-brand-500/30"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-600/30 text-lg font-bold text-white ring-2 ring-brand-500/30">
            {initials(user?.fullName || '')}
          </span>
        )}
        <div>
          <h1 className="text-xl font-black tracking-tight text-ink-900 sm:text-2xl">
            Hi {user?.firstName || user?.fullName?.split(' ')[0] || 'there'}
          </h1>
          <p className="mt-0.5 text-sm text-ink-500">View and manage your account details below.</p>
        </div>
      </header>

      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      )}

      {!loading && error && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && overview && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <QuickTile
              to="/account/orders"
              title="Orders"
              hint="Track your orders"
              icon={<FiPackage size={18} />}
              tone="bg-brand-500/15 text-brand-400"
              delay={0}
            />
            <QuickTile
              to="/account/requests"
              title="Trade-ins"
              hint="Get a valuation"
              icon={<FiRefreshCw size={18} />}
              tone="bg-cyan-500/15 text-cyan-300"
              delay={0.05}
            />
            <QuickTile
              to="/contact"
              title="Respawn Credit"
              hint="Your balance"
              icon={<FiCreditCard size={18} />}
              tone="bg-accent-600/20 text-accent-400"
              delay={0.1}
            />
            <QuickTile
              to="/account/wishlist"
              title="Saved Items"
              hint="View wishlist"
              icon={<FiHeart size={18} />}
              tone="bg-accent-600/20 text-accent-400"
              delay={0.15}
            />
          </div>

          <nav className="card divide-y divide-ink-100 px-3 py-1">
            <MenuRow to="/account/profile" label="Personal Details" icon={<FiUser size={17} />} />
            <MenuRow to="/account/addresses" label="Addresses" icon={<FiMapPin size={17} />} />
            <MenuRow to="/checkout" label="Payment Methods" icon={<FiCreditCard size={17} />} />
            <MenuRow to="/account/orders" label="Order History" icon={<FiPackage size={17} />} />
            <MenuRow to="/account/requests" label="Trade-in History" icon={<FiGift size={17} />} />
            <MenuRow
              to="/contact"
              label="Respawn Credit"
              icon={<FiCreditCard size={17} />}
              badge={
                <span className="rounded-full bg-accent-600 px-2.5 py-1 text-xs font-bold text-white">
                  {creditDisplay}
                </span>
              }
            />
            <MenuRow to="/account/profile" label="Notifications" icon={<FiBell size={17} />} />
            <MenuRow to="/contact" label="Help & Support" icon={<FiHelpCircle size={17} />} />
            <MenuRow to="/account/profile" label="Settings" icon={<FiSettings size={17} />} />
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-transparent bg-ink-100 px-5 py-3.5 text-sm font-bold text-ink-900 [background-image:linear-gradient(var(--color-ink-100),var(--color-ink-100)),linear-gradient(90deg,var(--color-brand-500),var(--color-accent-500))] [background-origin:border-box] [background-clip:padding-box,border-box]"
          >
            <FiLogOut size={17} />
            Sign out
          </button>
        </>
      )}
    </div>
  );
};

export default AccountOverview;
