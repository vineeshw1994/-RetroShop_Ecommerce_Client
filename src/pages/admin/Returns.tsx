import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiExternalLink } from 'react-icons/fi';
import { DataTable, FilterToolbar, PageHeader, type Column } from '@/components/admin';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  ErrorState,
  Modal,
  Pagination,
  Select,
  Textarea,
} from '@/components/ui';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { useAsync, useDebounce, useDocumentTitle, usePermissions, useQueryFilters } from '@/hooks';
import { adminReturnService } from '@/services/admin.service';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime, formatPrice } from '@/lib/format';
import cn from '@/lib/cn';
import type { ReturnRequest, ReturnRequestStatus } from '@/types';

const DEFAULTS = { page: '1', search: '', status: '' };

const STATUS_LABELS: Record<ReturnRequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
};

const STATUS_TONES: Record<ReturnRequestStatus, 'warning' | 'success' | 'danger' | 'neutral'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  completed: 'neutral',
};

const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as ReturnRequestStatus[]).map((status) => ({
  value: status,
  label: STATUS_LABELS[status],
}));

const STATUS_TABS = [
  { value: '', label: 'All' },
  ...STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
];

const Returns = () => {
  useDocumentTitle('Return requests');

  const dispatch = useAppDispatch();
  const { can } = usePermissions();
  const canUpdate = can('orders:update');

  const { filters, setFilter, resetFilters } = useQueryFilters(DEFAULTS);
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 400);

  useEffect(() => {
    if (debouncedSearch !== filters.search) setFilter({ search: debouncedSearch, page: '1' });
  }, [debouncedSearch, filters.search, setFilter]);

  const { data, loading, error, reload } = useAsync(
    () =>
      adminReturnService.list({
        page: Number(filters.page) || 1,
        search: filters.search || undefined,
        status: filters.status || undefined,
      }),
    [filters.page, filters.search, filters.status]
  );

  const [active, setActive] = useState<ReturnRequest | null>(null);
  const [nextStatus, setNextStatus] = useState<ReturnRequestStatus>('approved');
  const [adminNote, setAdminNote] = useState('');
  const [issueRefund, setIssueRefund] = useState(false);
  const [saving, setSaving] = useState(false);

  const openRespond = (request: ReturnRequest) => {
    setActive(request);
    setNextStatus(request.status === 'pending' ? 'approved' : 'completed');
    setAdminNote(request.adminNote || '');
    setIssueRefund(false);
  };

  const submitResponse = async () => {
    if (!active) return;

    setSaving(true);
    try {
      await adminReturnService.respond(active.id, {
        status: nextStatus,
        adminNote: adminNote.trim() || undefined,
        issueRefund,
      });
      dispatch(pushToast('Return request updated', 'success'));
      setActive(null);
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<ReturnRequest>[] = [
    {
      key: 'order',
      header: 'Order',
      render: (row) => (
        <Link
          to={`/admin/orders/${row.order?.id}`}
          className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline"
        >
          {row.order?.orderNumber}
          <FiExternalLink size={12} />
        </Link>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-800">
            {row.order?.customer?.firstName} {row.order?.customer?.lastName}
          </p>
          <p className="truncate text-xs text-ink-500">{row.order?.customer?.email}</p>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => <p className="max-w-xs truncate text-sm text-ink-600">{row.reason}</p>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONES[row.status]}>{STATUS_LABELS[row.status]}</Badge>,
    },
    {
      key: 'createdAt',
      header: 'Requested',
      render: (row) => <span className="text-sm text-ink-600">{formatDateTime(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-28 text-right',
      render: (row) =>
        canUpdate && row.status !== 'rejected' && row.status !== 'completed' ? (
          <Button variant="outline" size="sm" onClick={() => openRespond(row)}>
            Respond
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Return requests"
        description="Customer return requests from delivered orders within the configured return window."
      />

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value || 'all'}
            type="button"
            onClick={() => setFilter({ status: tab.value, page: '1' })}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition',
              filters.status === tab.value
                ? 'bg-brand-600 text-white'
                : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <FilterToolbar
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search order, customer or reason…"
        activeCount={Number(Boolean(filters.search || filters.status))}
        onReset={() => {
          setSearchInput('');
          resetFilters();
        }}
      />

      {error && <ErrorState message={error} onRetry={reload} />}

      <DataTable
        columns={columns}
        rows={data?.data || []}
        loading={loading}
        emptyMessage="No return requests yet."
        rowKey={(row) => row.id}
      />

      <Pagination meta={data?.meta} onPageChange={(page) => setFilter({ page })} />

      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title="Respond to return request"
        description={active?.order?.orderNumber}
        footer={
          <>
            <Button variant="outline" onClick={() => setActive(null)} disabled={saving}>
              Cancel
            </Button>
            <Button loading={saving} onClick={submitResponse}>
              Save response
            </Button>
          </>
        }
      >
        {active && (
          <div className="space-y-4">
            <div className="rounded-lg bg-ink-50 p-3 text-sm text-ink-700">
              <p className="font-semibold text-ink-900">Customer reason</p>
              <p className="mt-1 whitespace-pre-wrap">{active.reason}</p>
              {active.order && (
                <p className="mt-2 text-xs text-ink-500">
                  Order total: {formatPrice(active.order.total)}
                </p>
              )}
            </div>

            <Select
              label="Status"
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value as ReturnRequestStatus)}
              options={
                active.status === 'pending'
                  ? STATUS_OPTIONS.filter((option) => option.value !== 'completed')
                  : STATUS_OPTIONS.filter((option) => option.value === 'completed')
              }
            />

            <Textarea
              label="Message to customer (internal note)"
              rows={4}
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              placeholder="Instructions for the return label, or why it was rejected"
            />

            {nextStatus === 'approved' && active.order?.paymentStatus === 'paid' && (
              <Checkbox
                checked={issueRefund}
                onChange={(event) => setIssueRefund(event.target.checked)}
                label="Issue Stripe refund and mark order as refunded"
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Returns;
