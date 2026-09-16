import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronRight, FiDownload, FiFastForward } from 'react-icons/fi';
import { DataTable, FilterToolbar, PageHeader, type Column } from '@/components/admin';
import {
  Badge,
  Button,
  ConfirmDialog,
  ErrorState,
  OrderStatusBadge,
  Pagination,
  Select,
} from '@/components/ui';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { useAsync, useDebounce, useDocumentTitle, usePermissions, useQueryFilters } from '@/hooks';
import { adminOrderService } from '@/services/admin.service';
import { getErrorMessage } from '@/lib/api';
import { ORDER_STATUS_LABELS, formatDate, formatNumber, formatPrice } from '@/lib/format';
import cn from '@/lib/cn';
import type { Order, OrderStatus, PaymentStatus } from '@/types';

const ORDER_DEFAULTS = {
  page: '1',
  search: '',
  status: '',
  paymentStatus: '',
  paymentMethod: '',
  dateFrom: '',
  dateTo: '',
  sort: 'newest',
};

const STATUS_TABS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  ...(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((status) => ({
    value: status,
    label: ORDER_STATUS_LABELS[status],
  })),
];

const STATUS_OPTIONS = (Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((status) => ({
  value: status,
  label: ORDER_STATUS_LABELS[status],
}));

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
};

const PAYMENT_STATUS_TONES: Record<PaymentStatus, 'neutral' | 'success' | 'danger' | 'warning'> = {
  unpaid: 'warning',
  paid: 'success',
  failed: 'danger',
  refunded: 'neutral',
};

const PAYMENT_METHOD_OPTIONS = [
  { value: 'card', label: 'Card' },
  { value: 'cash_on_delivery', label: 'Cash on delivery' },
  { value: 'bank_transfer', label: 'Bank transfer' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'total_desc', label: 'Highest total' },
  { value: 'total_asc', label: 'Lowest total' },
];

/** The one-click step that moves an order along the happy path. */
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'processing',
  processing: 'packed',
  packed: 'shipped',
  shipped: 'delivered',
};

const Orders = () => {
  useDocumentTitle('Orders');

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canUpdate = can('orders:update');

  const { filters, setFilter, resetFilters } = useQueryFilters(ORDER_DEFAULTS);
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 400);
  const [advancing, setAdvancing] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null);

  useEffect(() => {
    if (debouncedSearch !== filters.search) setFilter({ search: debouncedSearch });
  }, [debouncedSearch, filters.search, setFilter]);

  const query = {
    page: Number(filters.page) || 1,
    limit: 20,
    search: filters.search || undefined,
    status: filters.status || undefined,
    paymentStatus: filters.paymentStatus || undefined,
    paymentMethod: filters.paymentMethod || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    sort: filters.sort || undefined,
  };

  const { data, loading, error, reload } = useAsync(() => adminOrderService.list(query), [
    filters.page,
    filters.search,
    filters.status,
    filters.paymentStatus,
    filters.paymentMethod,
    filters.dateFrom,
    filters.dateTo,
    filters.sort,
  ]);

  const orders = data?.data ?? [];
  const statusCounts = data?.summary?.statusCounts ?? {};

  const activeCount = (
    ['search', 'status', 'paymentStatus', 'paymentMethod', 'dateFrom', 'dateTo'] as const
  ).filter((key) => filters[key]).length + (filters.sort !== 'newest' ? 1 : 0);

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setExporting(format);
    try {
      await adminOrderService.exportCsv(query, format);
      dispatch(pushToast(`${format === 'xlsx' ? 'Excel' : 'CSV'} export started`, 'success'));
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setExporting(null);
    }
  };

  const confirmAdvance = async () => {
    if (!advancing) return;
    const next = NEXT_STATUS[advancing.status];
    if (!next) return;

    setSaving(true);
    try {
      await adminOrderService.updateStatus(advancing.id, { status: next, notifyCustomer: true });
      dispatch(
        pushToast(`${advancing.orderNumber} moved to ${ORDER_STATUS_LABELS[next]}`, 'success')
      );
      setAdvancing(null);
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Order>[] = [
    {
      key: 'orderNumber',
      header: 'Order',
      render: (order) => (
        <div className="min-w-0">
          <p className="font-bold text-ink-900">{order.orderNumber}</p>
          <p className="text-xs text-ink-500">
            {formatNumber(order.itemCount)} item{order.itemCount === 1 ? '' : 's'}
          </p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      hideBelow: 'lg',
      render: (order) =>
        order.customer ? (
          <div className="min-w-0 max-w-[220px]">
            <p className="truncate font-medium text-ink-800">
              {order.customer.firstName} {order.customer.lastName}
            </p>
            <p className="truncate text-xs text-ink-500">{order.customer.email}</p>
          </div>
        ) : (
          <span className="text-ink-400">Guest</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => <OrderStatusBadge status={order.status} />,
    },
    {
      key: 'payment',
      header: 'Payment',
      hideBelow: 'md',
      render: (order) => (
        <Badge tone={PAYMENT_STATUS_TONES[order.paymentStatus]}>
          {PAYMENT_STATUS_LABELS[order.paymentStatus]}
        </Badge>
      ),
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
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-px',
      render: (order) => {
        const next = NEXT_STATUS[order.status];

        return (
          <div
            className="flex items-center justify-end gap-1"
            onClick={(event) => event.stopPropagation()}
          >
            {canUpdate && next && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<FiFastForward size={13} />}
                onClick={() => setAdvancing(order)}
              >
                {ORDER_STATUS_LABELS[next]}
              </Button>
            )}
            <button
              type="button"
              onClick={() => navigate(`/admin/orders/${order.id}`)}
              aria-label={`Open ${order.orderNumber}`}
              className="rounded-lg p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
            >
              <FiChevronRight size={16} />
            </button>
          </div>
        );
      },
    },
  ];

  const advanceTarget = advancing ? NEXT_STATUS[advancing.status] : undefined;

  return (
    <div>
      <PageHeader
        title="Orders"
        description="The fulfilment queue — work top to bottom"
      />

      <FilterToolbar
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search order number, customer name or email…"
        activeCount={activeCount}
        onReset={() => {
          setSearchInput('');
          resetFilters();
        }}
        trailing={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              loading={exporting === 'csv'}
              disabled={Boolean(exporting)}
              leftIcon={<FiDownload size={14} />}
              onClick={() => void handleExport('csv')}
            >
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              loading={exporting === 'xlsx'}
              disabled={Boolean(exporting)}
              leftIcon={<FiDownload size={14} />}
              onClick={() => void handleExport('xlsx')}
            >
              Excel
            </Button>
          </div>
        }
      >
        <Select
          options={STATUS_OPTIONS}
          placeholder="Any status"
          value={filters.status}
          onChange={(event) => setFilter({ status: event.target.value })}
          aria-label="Order status"
        />
        <Select
          options={Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
          placeholder="Any payment"
          value={filters.paymentStatus}
          onChange={(event) => setFilter({ paymentStatus: event.target.value })}
          aria-label="Payment status"
        />
        <Select
          options={PAYMENT_METHOD_OPTIONS}
          placeholder="Any method"
          value={filters.paymentMethod}
          onChange={(event) => setFilter({ paymentMethod: event.target.value })}
          aria-label="Payment method"
        />
        <Select
          options={SORT_OPTIONS}
          value={filters.sort}
          onChange={(event) => setFilter({ sort: event.target.value })}
          aria-label="Sort orders"
        />
        <input
          type="date"
          value={filters.dateFrom}
          max={filters.dateTo || undefined}
          onChange={(event) => setFilter({ dateFrom: event.target.value })}
          aria-label="Placed from"
          className="input-base"
        />
        <input
          type="date"
          value={filters.dateTo}
          min={filters.dateFrom || undefined}
          onChange={(event) => setFilter({ dateTo: event.target.value })}
          aria-label="Placed until"
          className="input-base"
        />
      </FilterToolbar>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => {
          const count = tab.value
            ? statusCounts[tab.value]
            : Object.values(statusCounts).reduce((sum, value) => sum + value, 0);

          return (
            <button
              key={tab.value || 'all'}
              type="button"
              onClick={() => setFilter({ status: tab.value })}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                filters.status === tab.value
                  ? 'bg-ink-900 text-white'
                  : 'bg-white text-ink-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-50'
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  filters.status === tab.value ? 'bg-white/20' : 'bg-ink-100 text-ink-600'
                )}
              >
                {formatNumber(count || 0)}
              </span>
            </button>
          );
        })}
      </div>

      {error && !loading ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={orders}
            rowKey={(order) => order.id}
            loading={loading}
            onRowClick={(order) => navigate(`/admin/orders/${order.id}`)}
            emptyTitle="No orders match these filters"
            emptyMessage="Try clearing the search or widening the date range."
            renderMobileCard={(order) => {
              const next = NEXT_STATUS[order.status];

              return (
                <div className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-ink-900">{order.orderNumber}</p>
                      {order.customer && (
                        <p className="truncate text-xs text-ink-500">
                          {order.customer.firstName} {order.customer.lastName} ·{' '}
                          {order.customer.email}
                        </p>
                      )}
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-black text-ink-900">
                      {formatPrice(order.total)}
                    </span>
                    <Badge tone={PAYMENT_STATUS_TONES[order.paymentStatus]}>
                      {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3">
                    <span className="text-xs text-ink-500">
                      {formatNumber(order.itemCount)} item{order.itemCount === 1 ? '' : 's'} ·{' '}
                      {formatDate(order.placedAt || order.createdAt)}
                    </span>

                    {canUpdate && next && (
                      <span onClick={(event) => event.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<FiFastForward size={13} />}
                          onClick={() => setAdvancing(order)}
                        >
                          {ORDER_STATUS_LABELS[next]}
                        </Button>
                      </span>
                    )}
                  </div>
                </div>
              );
            }}
          />

          <Pagination
            meta={data?.meta}
            onPageChange={(page) => setFilter({ page })}
            className="mt-5"
          />
        </>
      )}

      <ConfirmDialog
        open={Boolean(advancing && advanceTarget)}
        onClose={() => setAdvancing(null)}
        onConfirm={confirmAdvance}
        loading={saving}
        tone="primary"
        title="Advance this order?"
        confirmLabel={advanceTarget ? `Move to ${ORDER_STATUS_LABELS[advanceTarget]}` : 'Confirm'}
        message={
          advancing && advanceTarget ? (
            <>
              <strong>{advancing.orderNumber}</strong> moves from{' '}
              {ORDER_STATUS_LABELS[advancing.status]} to {ORDER_STATUS_LABELS[advanceTarget]}. The
              customer is emailed the update. Open the order if you need to add tracking details or
              a note.
            </>
          ) : null
        }
      />
    </div>
  );
};

export default Orders;
