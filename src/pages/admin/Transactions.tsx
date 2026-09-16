import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiExternalLink, FiRefreshCw } from 'react-icons/fi';
import { DataTable, PageHeader, type Column } from '@/components/admin';
import { Badge, Button, ConfirmDialog, ErrorState, Input } from '@/components/ui';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { useAsync, useDocumentTitle, usePermissions, useQueryFilters } from '@/hooks';
import { adminTransactionService } from '@/services/admin.service';
import { getErrorMessage } from '@/lib/api';
import { formatDate, formatPrice } from '@/lib/format';
import type { StripeTransaction } from '@/types';

const DEFAULTS = { dateFrom: '', dateTo: '' };

const TYPE_LABELS: Record<string, string> = {
  charge: 'Payment',
  refund: 'Refund',
  adjustment: 'Adjustment',
  payout: 'Payout',
};

const Transactions = () => {
  useDocumentTitle('Stripe transactions');

  const dispatch = useAppDispatch();
  const { can } = usePermissions();
  const canRefund = can('orders:update');

  const { filters, setFilter, resetFilters } = useQueryFilters(DEFAULTS);
  const [cursor, setCursor] = useState<string | undefined>();
  const [refundTarget, setRefundTarget] = useState<StripeTransaction | null>(null);
  const [refunding, setRefunding] = useState(false);

  const { data, loading, error, reload } = useAsync(
    () =>
      adminTransactionService.list({
        limit: 25,
        startingAfter: cursor,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      }),
    [cursor, filters.dateFrom, filters.dateTo]
  );

  const rows = data?.data || [];
  const meta = data?.meta;

  const handleRefund = async () => {
    if (!refundTarget?.order) return;

    setRefunding(true);
    try {
      await adminTransactionService.refundOrder(refundTarget.order.id, {
        note: 'Refunded from Stripe transactions list',
      });
      dispatch(pushToast(`Refund issued for ${refundTarget.order.orderNumber}`, 'success'));
      setRefundTarget(null);
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setRefunding(false);
    }
  };

  const columns: Column<StripeTransaction>[] = [
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => (
        <span className="font-semibold text-ink-900">{formatPrice(row.amount)}</span>
      ),
    },
    {
      key: 'fee',
      header: 'Fees',
      render: (row) => (
        <span className="text-rose-600">−{formatPrice(row.fee)}</span>
      ),
    },
    {
      key: 'net',
      header: 'Net',
      render: (row) => (
        <span className="font-semibold text-emerald-700">{formatPrice(row.net)}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <Badge tone={row.type === 'refund' ? 'neutral' : row.type === 'charge' ? 'success' : 'info'}>
          {TYPE_LABELS[row.type] || row.type}
        </Badge>
      ),
    },
    {
      key: 'description',
      header: 'Stripe ID',
      render: (row) => (
        <span className="font-mono text-xs text-ink-600">
          {row.chargeId || row.refundId || row.description || row.id}
        </span>
      ),
    },
    {
      key: 'order',
      header: 'Order',
      render: (row) =>
        row.order ? (
          <Link
            to={`/admin/orders/${row.order.id}`}
            className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline"
          >
            {row.order.orderNumber}
            <FiExternalLink size={12} />
          </Link>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (row) =>
        row.order?.customer ? (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-800">
              {row.order.customer.firstName} {row.order.customer.lastName}
            </p>
            <p className="truncate text-xs text-ink-500">{row.order.customer.email}</p>
          </div>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row) => <span className="text-sm text-ink-600">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-28 text-right',
      render: (row) =>
        canRefund && row.refundable && row.order ? (
          <Button variant="outline" size="sm" onClick={() => setRefundTarget(row)}>
            Refund
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stripe transactions"
        description="Live card payments, fees and refunds pulled from your Stripe account."
      />

      <div className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:max-w-xl">
        <Input
          type="date"
          label="From"
          value={filters.dateFrom}
          onChange={(event) => {
            setCursor(undefined);
            setFilter({ dateFrom: event.target.value });
          }}
        />
        <Input
          type="date"
          label="To"
          value={filters.dateTo}
          onChange={(event) => {
            setCursor(undefined);
            setFilter({ dateTo: event.target.value });
          }}
        />
        {(filters.dateFrom || filters.dateTo) && (
          <div className="sm:col-span-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                resetFilters();
                setCursor(undefined);
              }}
            >
              Clear dates
            </Button>
          </div>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyMessage="No Stripe transactions found for this filter."
        rowKey={(row) => row.id}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-500">{rows.length} items</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!cursor || loading}
            leftIcon={<FiChevronLeft size={14} />}
            onClick={() => setCursor(undefined)}
          >
            Newest
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!meta?.hasMore || loading || !meta.nextCursor}
            leftIcon={<FiRefreshCw size={14} />}
            onClick={() => setCursor(meta?.nextCursor || undefined)}
          >
            Load more
          </Button>
          {meta?.hasMore && meta.nextCursor && (
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              leftIcon={<FiChevronRight size={14} />}
              onClick={() => setCursor(meta.nextCursor || undefined)}
            >
              Next page
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(refundTarget)}
        onClose={() => setRefundTarget(null)}
        onConfirm={handleRefund}
        loading={refunding}
        title="Issue Stripe refund?"
        confirmLabel="Refund via Stripe"
        message={
          refundTarget?.order ? (
            <>
              <p>
                This will refund <strong>{formatPrice(refundTarget.amount)}</strong> to the
                customer&apos;s card for order{' '}
                <strong>{refundTarget.order.orderNumber}</strong>, restock the items, and mark the
                order as refunded.
              </p>
              <p className="mt-2 text-sm text-ink-500">This action cannot be undone.</p>
            </>
          ) : null
        }
      />
    </div>
  );
};

export default Transactions;
