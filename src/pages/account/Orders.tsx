import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPackage, FiSearch, FiX } from 'react-icons/fi';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { orderService } from '@/services/shop.service';
import { getErrorMessage } from '@/lib/api';
import { useAsync, useDebounce, useDocumentTitle, useQueryFilters } from '@/hooks';
import { ORDER_STATUS_LABELS, formatDate, formatPrice } from '@/lib/format';
import cn from '@/lib/cn';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  OrderStatusBadge,
  Pagination,
  Skeleton,
  SmartImage,
} from '@/components/ui';
import type { Order, OrderStatus, PaymentStatus } from '@/types';

const DEFAULTS = { page: '1', status: '', search: '' };

const PAGE_SIZE = 8;

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All orders' },
  ...(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((status) => ({
    value: status,
    label: ORDER_STATUS_LABELS[status],
  })),
];

const CANCELLABLE: OrderStatus[] = ['pending', 'confirmed', 'processing'];

const PAYMENT_TONES: Record<PaymentStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  paid: 'success',
  unpaid: 'warning',
  failed: 'danger',
  refunded: 'neutral',
};

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  paid: 'Paid',
  unpaid: 'Unpaid',
  failed: 'Payment failed',
  refunded: 'Refunded',
};

const OrderCard = ({
  order,
  index,
  onCancel,
}: {
  order: Order;
  index: number;
  onCancel: (order: Order) => void;
}) => {
  const items = order.items || [];
  const thumbnails = items.slice(0, 4);
  const overflow = items.length - thumbnails.length;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index, 6) * 0.04 }}
      className="card overflow-hidden"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 bg-ink-50/60 px-4 py-3">
        <div className="min-w-0">
          <Link
            to={`/account/orders/${order.orderNumber}`}
            className="text-sm font-bold text-ink-900 transition hover:text-brand-600"
          >
            {order.orderNumber}
          </Link>
          <p className="mt-0.5 text-xs text-ink-500">
            Placed {formatDate(order.placedAt || order.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <Badge tone={PAYMENT_TONES[order.paymentStatus]}>
            {PAYMENT_LABELS[order.paymentStatus]}
          </Badge>
        </div>
      </header>

      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 items-center gap-1.5">
            {thumbnails.length > 0 ? (
              thumbnails.map((item) => (
                <SmartImage
                  key={item.id}
                  src={item.image}
                  alt={item.name}
                  wrapperClassName="h-12 w-12 shrink-0 rounded-lg border border-ink-100"
                  className="h-full w-full object-cover"
                />
              ))
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-ink-100 text-ink-400">
                <FiPackage size={18} />
              </span>
            )}

            {overflow > 0 && (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-[11px] font-bold text-ink-600">
                +{overflow} more
              </span>
            )}
          </div>

          <div className="min-w-0 text-sm">
            <p className="font-semibold text-ink-700">
              {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
            </p>
            <p className="mt-0.5 text-lg font-extrabold leading-tight text-ink-900">
              {formatPrice(order.total)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link to={`/account/orders/${order.orderNumber}`}>
            <Button variant="outline" size="sm">
              View details
            </Button>
          </Link>

          {CANCELLABLE.includes(order.status) && (
            <Button variant="ghost" size="sm" onClick={() => onCancel(order)}>
              Cancel order
            </Button>
          )}
        </div>
      </div>
    </motion.article>
  );
};

const Orders = () => {
  useDocumentTitle('My orders');

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { filters, setFilter } = useQueryFilters(DEFAULTS);

  const [searchTerm, setSearchTerm] = useState(filters.search);
  const debouncedSearch = useDebounce(searchTerm.trim(), 400);

  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (debouncedSearch !== filters.search) setFilter({ search: debouncedSearch });
  }, [debouncedSearch, filters.search, setFilter]);

  const page = Number(filters.page) || 1;

  const { data, loading, error, reload } = useAsync(
    () =>
      orderService.list({
        page,
        limit: PAGE_SIZE,
        status: filters.status || undefined,
        search: debouncedSearch || undefined,
      }),
    [page, filters.status, debouncedSearch]
  );

  const orders = data?.data || [];
  const meta = data?.meta;
  const filtered = Boolean(filters.status || debouncedSearch);

  const handleCancel = async () => {
    if (!cancelTarget) return;

    setCancelling(true);
    try {
      await orderService.cancel(cancelTarget.orderNumber);
      dispatch(pushToast(`Order ${cancelTarget.orderNumber} has been cancelled`, 'success'));
      setCancelTarget(null);
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-black tracking-tight text-ink-900 sm:text-2xl">My orders</h1>
        <p className="mt-1 text-sm text-ink-500">
          Every order you have placed, newest first.
        </p>
      </header>

      <div className="card space-y-3 p-4">
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by order number"
          aria-label="Search by order number"
          leftIcon={<FiSearch size={15} />}
          rightSlot={
            searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
                className="rounded-md p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
              >
                <FiX size={15} />
              </button>
            ) : undefined
          }
        />

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {STATUS_FILTERS.map((option) => (
            <button
              key={option.value || 'all'}
              type="button"
              onClick={() => setFilter({ status: option.value })}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                filters.status === option.value
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full" />
          ))}
        </div>
      )}

      {!loading && error && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && orders.length === 0 && (
        <div className="card">
          {filtered ? (
            <EmptyState
              icon={<FiPackage size={22} />}
              title="No matching orders"
              message="Try a different status or clear the search to see everything."
              action={{
                label: 'Clear filters',
                onClick: () => {
                  setSearchTerm('');
                  setFilter({ status: '', search: '' });
                },
              }}
            />
          ) : (
            <EmptyState
              icon={<FiPackage size={22} />}
              title="No orders yet"
              message="When you order a game or console, you will be able to track it here."
              action={{ label: 'Start shopping', onClick: () => navigate('/search') }}
            />
          )}
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <>
          <div className="space-y-4">
            {orders.map((order, index) => (
              <OrderCard
                key={order.id}
                order={order}
                index={index}
                onCancel={setCancelTarget}
              />
            ))}
          </div>

          <Pagination meta={meta} onPageChange={(next) => setFilter({ page: next })} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        loading={cancelling}
        title={`Cancel ${cancelTarget?.orderNumber || 'this order'}?`}
        message="We will release the reserved stock and refund any payment already taken. This cannot be undone."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
      />
    </div>
  );
};

export default Orders;
