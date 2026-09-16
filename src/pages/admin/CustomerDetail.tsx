import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FiClock,
  FiGift,
  FiHeart,
  FiMail,
  FiMapPin,
  FiPhone,
  FiShoppingBag,
  FiSlash,
  FiTrendingUp,
  FiUserCheck,
} from 'react-icons/fi';
import { DataTable, PageHeader, StatCard, type Column } from '@/components/admin';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  OrderStatusBadge,
  Skeleton,
  SmartImage,
} from '@/components/ui';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { useAsync, useDocumentTitle, usePermissions } from '@/hooks';
import { adminCustomerService } from '@/services/admin.service';
import { getErrorMessage } from '@/lib/api';
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatPrice,
  formatRelative,
  initials,
} from '@/lib/format';
import type { GameRequest, GameRequestStatus, Order } from '@/types';

const REQUEST_LABELS: Record<GameRequestStatus, string> = {
  pending: 'Pending',
  sourcing: 'Sourcing',
  found: 'Found',
  unavailable: 'Unavailable',
  fulfilled: 'Fulfilled',
};

const REQUEST_TONES: Record<GameRequestStatus, 'warning' | 'info' | 'brand' | 'neutral' | 'success'> =
  {
    pending: 'warning',
    sourcing: 'info',
    found: 'brand',
    unavailable: 'neutral',
    fulfilled: 'success',
  };

const Section = ({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: ReactNode;
  count?: number;
  children: ReactNode;
}) => (
  <section className="card p-5">
    <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink-900">
      <span className="text-ink-400">{icon}</span>
      {title}
      {count !== undefined && (
        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-bold text-ink-600">
          {formatNumber(count)}
        </span>
      )}
    </h2>
    {children}
  </section>
);

const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const customerId = Number(id);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canUpdate = can('customers:update');

  const { data, loading, error, reload } = useAsync(
    () => adminCustomerService.get(customerId),
    [customerId]
  );

  const detail = data?.data ?? null;
  const customer = detail?.customer ?? null;

  useDocumentTitle(customer ? customer.fullName : 'Customer');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const confirmStatusChange = async () => {
    if (!customer) return;

    setSaving(true);
    try {
      await adminCustomerService.setStatus(customer.id, !customer.isActive);
      dispatch(
        pushToast(
          customer.isActive
            ? `${customer.fullName} suspended and signed out`
            : `${customer.fullName} restored`,
          'success'
        )
      );
      setConfirmOpen(false);
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setSaving(false);
    }
  };

  const orderColumns: Column<Order>[] = [
    {
      key: 'orderNumber',
      header: 'Order',
      render: (order) => (
        <div>
          <p className="font-bold text-ink-900">{order.orderNumber}</p>
          <p className="text-xs text-ink-500">
            {formatNumber(order.itemCount)} item{order.itemCount === 1 ? '' : 's'}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => <OrderStatusBadge status={order.status} />,
    },
    {
      key: 'total',
      header: 'Total',
      className: 'font-bold text-ink-900 whitespace-nowrap',
      render: (order) => formatPrice(order.total),
    },
    {
      key: 'placedAt',
      header: 'Placed',
      hideBelow: 'sm',
      render: (order) => (
        <span className="whitespace-nowrap text-ink-500">
          {formatDate(order.placedAt || order.createdAt)}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !detail || !customer) {
    return (
      <div>
        <PageHeader title="Customer" breadcrumbs={[{ label: 'Customers', to: '/admin/customers' }]} />
        <div className="card">
          <ErrorState message={error || 'That customer could not be found.'} onRetry={reload} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={customer.fullName}
        breadcrumbs={[
          { label: 'Customers', to: '/admin/customers' },
          { label: customer.fullName },
        ]}
        actions={
          canUpdate && (
            <Button
              variant={customer.isActive ? 'outline' : 'primary'}
              size="sm"
              leftIcon={customer.isActive ? <FiSlash size={14} /> : <FiUserCheck size={14} />}
              onClick={() => setConfirmOpen(true)}
            >
              {customer.isActive ? 'Suspend account' : 'Restore account'}
            </Button>
          )
        }
      />

      <div className="card mb-4 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {customer.avatar ? (
            <SmartImage
              src={customer.avatar}
              alt={customer.fullName}
              wrapperClassName="h-16 w-16 shrink-0 rounded-full"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-ink-900 text-lg font-bold text-white">
              {initials(customer.fullName || customer.email)}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-ink-900">{customer.fullName}</h2>
              <Badge tone={customer.isActive ? 'success' : 'danger'}>
                {customer.isActive ? 'Active' : 'Suspended'}
              </Badge>
              <Badge tone={customer.isVerified ? 'info' : 'neutral'}>
                {customer.isVerified ? 'Verified' : 'Unverified'}
              </Badge>
              {customer.marketingOptIn && <Badge tone="brand">Subscribed</Badge>}
            </div>

            <div className="mt-2 grid gap-1.5 text-sm text-ink-600 sm:grid-cols-2">
              <p className="flex items-center gap-2">
                <FiMail size={13} className="shrink-0 text-ink-400" />
                <span className="truncate">{customer.email}</span>
              </p>
              <p className="flex items-center gap-2">
                <FiPhone size={13} className="shrink-0 text-ink-400" />
                {customer.phone || '—'}
              </p>
              <p className="flex items-center gap-2">
                <FiClock size={13} className="shrink-0 text-ink-400" />
                Joined {formatDate(customer.createdAt)}
              </p>
              <p className="flex items-center gap-2">
                <FiClock size={13} className="shrink-0 text-ink-400" />
                Last seen{' '}
                {customer.lastLoginAt ? formatRelative(customer.lastLoginAt) : 'never signed in'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard
          index={0}
          label="Orders"
          value={formatNumber(detail.stats.orderCount)}
          icon={<FiShoppingBag size={17} />}
          tone="info"
        />
        <StatCard
          index={1}
          label="Lifetime spend"
          value={formatPrice(detail.stats.totalSpend)}
          icon={<FiTrendingUp size={17} />}
          tone="brand"
        />
        <StatCard
          index={2}
          label="Average order"
          value={formatPrice(detail.stats.averageOrderValue)}
          icon={<FiShoppingBag size={17} />}
          tone="success"
        />
      </div>

      <div className="space-y-4">
        <Section
          title="Saved addresses"
          icon={<FiMapPin size={15} />}
          count={customer.addresses.length}
        >
          {customer.addresses.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {customer.addresses.map((address) => (
                <li key={address.id} className="rounded-lg border border-ink-100 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {address.label || address.fullName}
                    </p>
                    {address.isDefault && <Badge tone="brand">Default</Badge>}
                  </div>

                  <address className="space-y-0.5 text-sm not-italic text-ink-600">
                    <p>{address.line1}</p>
                    {address.line2 && <p>{address.line2}</p>}
                    <p>
                      {address.city}
                      {address.state ? `, ${address.state}` : ''} {address.postcode}
                    </p>
                    <p>{address.country}</p>
                    <p className="pt-1 text-ink-500">{address.phone}</p>
                  </address>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              compact
              title="No saved addresses"
              message="This customer has not saved a delivery address yet."
            />
          )}
        </Section>

        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-900">
            <FiShoppingBag size={15} className="text-ink-400" />
            Order history
          </h2>

          <DataTable
            columns={orderColumns}
            rows={detail.orders}
            rowKey={(order) => order.id}
            onRowClick={(order) => navigate(`/admin/orders/${order.id}`)}
            emptyTitle="No orders yet"
            emptyMessage="This customer has not placed an order."
            renderMobileCard={(order) => (
              <div className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ink-900">{order.orderNumber}</p>
                    <p className="text-xs text-ink-500">
                      {formatDate(order.placedAt || order.createdAt)}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="mt-2 font-bold text-ink-900">{formatPrice(order.total)}</p>
              </div>
            )}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Wishlist" icon={<FiHeart size={15} />} count={detail.wishlist.length}>
            {detail.wishlist.length ? (
              <ul className="divide-y divide-ink-100">
                {detail.wishlist.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link
                      to={`/product/${entry.product.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 truncate text-sm font-medium text-ink-800 transition hover:text-brand-600"
                    >
                      {entry.product.name}
                    </Link>
                    <span className="shrink-0 text-sm font-bold text-ink-900">
                      {formatPrice(entry.product.price)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                title="Wishlist is empty"
                message="Nothing saved for later yet."
              />
            )}
          </Section>

          <Section
            title="Game requests"
            icon={<FiGift size={15} />}
            count={detail.gameRequests.length}
          >
            {detail.gameRequests.length ? (
              <ul className="divide-y divide-ink-100">
                {detail.gameRequests.map((request: GameRequest) => (
                  <li key={request.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {request.title}
                        </p>
                        <p className="text-xs text-ink-500">
                          {request.platform || 'Any platform'}
                          {request.maxBudget ? ` · up to ${formatPrice(request.maxBudget)}` : ''}
                        </p>
                      </div>
                      <Badge tone={REQUEST_TONES[request.status]}>
                        {REQUEST_LABELS[request.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-ink-400">
                      Submitted {formatDateTime(request.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                title="No requests"
                message="This customer has not asked us to source a game."
              />
            )}
          </Section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmStatusChange}
        loading={saving}
        tone={customer.isActive ? 'danger' : 'primary'}
        title={customer.isActive ? 'Suspend this customer?' : 'Restore this customer?'}
        confirmLabel={customer.isActive ? 'Suspend account' : 'Restore account'}
        message={
          customer.isActive ? (
            <>
              <strong>{customer.fullName}</strong> will be signed out of every device immediately and
              cannot sign in again until you restore the account.
            </>
          ) : (
            <>
              <strong>{customer.fullName}</strong> will be able to sign in and place orders again.
            </>
          )
        }
      />
    </div>
  );
};

export default CustomerDetail;
