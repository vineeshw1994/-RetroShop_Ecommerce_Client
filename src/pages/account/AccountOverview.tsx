import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowRight,
  FiCreditCard,
  FiGift,
  FiHeart,
  FiPackage,
  FiUser,
} from 'react-icons/fi';
import { useAppSelector } from '@/store';
import { accountService } from '@/services/account.service';
import { useAsync, useDocumentTitle } from '@/hooks';
import { formatDate, formatNumber, formatPrice } from '@/lib/format';
import cn from '@/lib/cn';
import {
  EmptyState,
  ErrorState,
  OrderStatusBadge,
  Skeleton,
  SmartImage,
  StatCardSkeleton,
} from '@/components/ui';
import type { Order } from '@/types';

const OrderLine = ({ order }: { order: Order }) => {
  const items = order.items || [];
  const thumbnails = items.slice(0, 3);
  const overflow = items.length - thumbnails.length;

  return (
    <Link
      to={`/account/orders/${order.orderNumber}`}
      className="flex flex-wrap items-center gap-3 rounded-xl border border-transparent p-3 transition hover:border-ink-100 hover:bg-ink-50"
    >
      <div className="flex shrink-0 items-center gap-1.5">
        {thumbnails.length > 0 ? (
          thumbnails.map((item) => (
            <SmartImage
              key={item.id}
              src={item.image}
              alt={item.name}
              wrapperClassName="h-11 w-11 shrink-0 rounded-lg border border-ink-100"
              className="h-full w-full object-cover"
            />
          ))
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink-100 text-ink-400">
            <FiPackage size={16} />
          </span>
        )}

        {overflow > 0 && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-[11px] font-bold text-ink-600">
            +{overflow}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink-900">{order.orderNumber}</p>
        <p className="mt-0.5 text-xs text-ink-500">
          {formatDate(order.placedAt || order.createdAt)} · {order.itemCount}{' '}
          {order.itemCount === 1 ? 'item' : 'items'}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <OrderStatusBadge status={order.status} />
        <span className="text-sm font-extrabold text-ink-900">{formatPrice(order.total)}</span>
      </div>
    </Link>
  );
};

const AccountOverview = () => {
  useDocumentTitle('My account');

  const user = useAppSelector((state) => state.auth.user);
  const { data, loading, error, reload } = useAsync(() => accountService.overview(), []);

  const overview = data?.data;
  const profileIncomplete = Boolean(user) && (!user?.phone || !user?.avatar);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-black tracking-tight text-ink-900 sm:text-2xl">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Track your orders, saved games and sourcing requests in one place.
        </p>
      </header>

      {loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <StatCardSkeleton key={index} />
            ))}
          </div>

          <div className="card p-5">
            <Skeleton className="h-4 w-32" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </>
      )}

      {!loading && error && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && overview && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Total orders',
                value: formatNumber(overview.orderCount),
                hint: 'View order history',
                icon: <FiPackage size={17} />,
                tone: 'bg-brand-50 text-brand-600',
                to: '/account/orders',
              },
              {
                label: 'Lifetime spend',
                value: formatPrice(overview.lifetimeSpend),
                hint: 'Across all paid orders',
                icon: <FiCreditCard size={17} />,
                tone: 'bg-emerald-50 text-emerald-600',
                to: '/account/orders',
              },
              {
                label: 'Wishlist',
                value: formatNumber(overview.wishlistCount),
                hint: 'Saved for later',
                icon: <FiHeart size={17} />,
                tone: 'bg-rose-50 text-rose-600',
                to: '/account/wishlist',
              },
              {
                label: 'Open requests',
                value: formatNumber(overview.requestCount),
                hint: 'Games we are sourcing',
                icon: <FiGift size={17} />,
                tone: 'bg-blue-50 text-blue-600',
                to: '/account/requests',
              },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link
                  to={stat.to}
                  className="card group block p-5 transition hover:border-ink-200 hover:shadow-lift"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                      {stat.label}
                    </p>
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        stat.tone
                      )}
                    >
                      {stat.icon}
                    </span>
                  </div>

                  <p className="mt-3 text-2xl font-black tracking-tight text-ink-900">
                    {stat.value}
                  </p>

                  <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-ink-400 transition group-hover:text-brand-600">
                    {stat.hint}
                    <FiArrowRight size={11} />
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>

          {profileIncomplete && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="card flex flex-col gap-4 border-brand-100 bg-brand-50/50 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                  <FiUser size={17} />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-ink-900">Complete your profile</h2>
                  <p className="mt-0.5 text-sm text-ink-600">
                    {!user?.phone && !user?.avatar
                      ? 'Add a phone number and a profile photo so we can reach you about deliveries.'
                      : !user?.phone
                        ? 'Add a phone number so our couriers can reach you about deliveries.'
                        : 'Add a profile photo to finish setting up your account.'}
                  </p>
                </div>
              </div>

              <Link
                to="/account/profile"
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Update profile
                <FiArrowRight size={15} />
              </Link>
            </motion.div>
          )}

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="card overflow-hidden"
          >
            <header className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
              <h2 className="text-sm font-bold text-ink-900">Recent orders</h2>
              <Link
                to="/account/orders"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700"
              >
                View all
                <FiArrowRight size={12} />
              </Link>
            </header>

            {overview.recentOrders.length === 0 ? (
              <EmptyState
                compact
                icon={<FiPackage size={22} />}
                title="No orders yet"
                message="Once you buy a game or console it will show up here."
              />
            ) : (
              <div className="divide-y divide-ink-100 p-2">
                {overview.recentOrders.map((order) => (
                  <OrderLine key={order.id} order={order} />
                ))}
              </div>
            )}
          </motion.section>
        </>
      )}
    </div>
  );
};

export default AccountOverview;
