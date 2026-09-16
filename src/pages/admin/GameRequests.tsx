import { useEffect, useState } from 'react';
import { FiLink, FiMessageSquare, FiSearch, FiTrash2, FiX } from 'react-icons/fi';
import { DataTable, FilterToolbar, PageHeader, type Column } from '@/components/admin';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  ErrorState,
  Input,
  Modal,
  Pagination,
  Select,
  Spinner,
  Textarea,
} from '@/components/ui';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { useAsync, useDebounce, useDocumentTitle, usePermissions, useQueryFilters } from '@/hooks';
import { adminProductService, adminRequestService } from '@/services/admin.service';
import { getErrorMessage } from '@/lib/api';
import { formatDate, formatNumber, formatPrice } from '@/lib/format';
import cn from '@/lib/cn';
import type { GameRequest, GameRequestStatus } from '@/types';

const REQUEST_DEFAULTS = { page: '1', search: '', status: '' };

const STATUS_LABELS: Record<GameRequestStatus, string> = {
  pending: 'Pending',
  sourcing: 'Sourcing',
  found: 'Found',
  unavailable: 'Unavailable',
  fulfilled: 'Fulfilled',
};

const STATUS_TONES: Record<GameRequestStatus, 'warning' | 'info' | 'brand' | 'neutral' | 'success'> =
  {
    pending: 'warning',
    sourcing: 'info',
    found: 'brand',
    unavailable: 'neutral',
    fulfilled: 'success',
  };

const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as GameRequestStatus[]).map((status) => ({
  value: status,
  label: STATUS_LABELS[status],
}));

const STATUS_TABS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  ...STATUS_OPTIONS.map((option) => ({ value: String(option.value), label: option.label })),
];

const CONDITION_LABELS: Record<GameRequest['conditionPreference'], string> = {
  any: 'Any condition',
  new: 'Brand new only',
  used: 'Pre-owned fine',
};

interface PickedProduct {
  id: number;
  name: string;
}

const ProductPicker = ({
  selected,
  onSelect,
}: {
  selected: PickedProduct | null;
  onSelect: (product: PickedProduct | null) => void;
}) => {
  const [term, setTerm] = useState('');
  const debounced = useDebounce(term, 350);
  const [results, setResults] = useState<PickedProduct[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const search = debounced.trim();
    if (!search) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);

    adminProductService
      .list({ search, limit: 10 })
      .then((response) => {
        if (!cancelled) {
          setResults(response.data.map((product) => ({ id: product.id, name: product.name })));
        }
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  if (selected) {
    return (
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-700">Linked product</p>
        <div className="flex items-center gap-2 rounded-lg border border-ink-200 bg-ink-50 px-3 py-2.5">
          <FiLink size={14} className="shrink-0 text-ink-400" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-800">
            {selected.name}
          </span>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setTerm('');
            }}
            aria-label="Clear linked product"
            className="rounded-md p-1 text-ink-400 transition hover:bg-ink-200 hover:text-ink-700"
          >
            <FiX size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Input
        label="Link a product (optional)"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Search the catalogue…"
        leftIcon={<FiSearch size={15} />}
        rightSlot={searching ? <Spinner size="sm" /> : undefined}
      />

      {results.length > 0 && (
        <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-ink-200">
          {results.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => onSelect(product)}
                className="block w-full truncate px-3 py-2 text-left text-sm text-ink-700 transition hover:bg-ink-50"
              >
                {product.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!searching && debounced.trim() && !results.length && (
        <p className="mt-2 text-xs text-ink-500">No products match “{debounced.trim()}”.</p>
      )}
    </div>
  );
};

const GameRequests = () => {
  useDocumentTitle('Game requests');

  const dispatch = useAppDispatch();
  const { can } = usePermissions();
  const canUpdate = can('requests:update');

  const { filters, setFilter, resetFilters } = useQueryFilters(REQUEST_DEFAULTS);
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 400);

  const [responding, setResponding] = useState<GameRequest | null>(null);
  const [status, setStatus] = useState<string>('');
  const [adminResponse, setAdminResponse] = useState('');
  const [linked, setLinked] = useState<PickedProduct | null>(null);
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<GameRequest | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (debouncedSearch !== filters.search) setFilter({ search: debouncedSearch });
  }, [debouncedSearch, filters.search, setFilter]);

  const { data, loading, error, reload } = useAsync(
    () =>
      adminRequestService.list({
        page: Number(filters.page) || 1,
        limit: 20,
        search: filters.search || undefined,
        status: filters.status || undefined,
      }),
    [filters.page, filters.search, filters.status]
  );

  const requests = data?.data ?? [];
  const statusCounts = data?.summary?.statusCounts ?? {};

  const openRespond = (request: GameRequest) => {
    setResponding(request);
    setStatus(request.status);
    setAdminResponse(request.adminResponse ?? '');
    setLinked(
      request.linkedProduct
        ? { id: request.linkedProduct.id, name: request.linkedProduct.name }
        : null
    );
    setNotifyCustomer(true);
  };

  const submitResponse = async () => {
    if (!responding) return;

    setSaving(true);
    try {
      await adminRequestService.respond(responding.id, {
        status: status || undefined,
        adminResponse: adminResponse || undefined,
        linkedProductId: linked ? linked.id : null,
        notifyCustomer,
      });
      dispatch(pushToast(`Replied to “${responding.title}”`, 'success'));
      setResponding(null);
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;

    setRemoving(true);
    try {
      await adminRequestService.remove(deleting.id);
      dispatch(pushToast('Request deleted', 'success'));
      setDeleting(null);
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setRemoving(false);
    }
  };

  const columns: Column<GameRequest>[] = [
    {
      key: 'title',
      header: 'Game',
      render: (request) => (
        <div className="min-w-0 max-w-[240px]">
          <p className="truncate font-semibold text-ink-900">{request.title}</p>
          <p className="truncate text-xs text-ink-500">{request.platform || 'Any platform'}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      hideBelow: 'lg',
      render: (request) =>
        request.user ? (
          <div className="min-w-0 max-w-[200px]">
            <p className="truncate text-ink-800">
              {request.user.firstName} {request.user.lastName}
            </p>
            <p className="truncate text-xs text-ink-500">{request.user.email}</p>
          </div>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    {
      key: 'budget',
      header: 'Budget',
      hideBelow: 'md',
      render: (request) =>
        request.maxBudget ? (
          <span className="whitespace-nowrap font-medium text-ink-800">
            up to {formatPrice(request.maxBudget)}
          </span>
        ) : (
          <span className="text-ink-400">Open</span>
        ),
    },
    {
      key: 'condition',
      header: 'Condition',
      hideBelow: 'lg',
      render: (request) => (
        <span className="text-xs text-ink-600">
          {CONDITION_LABELS[request.conditionPreference]}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (request) => (
        <Badge tone={STATUS_TONES[request.status]}>{STATUS_LABELS[request.status]}</Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Submitted',
      hideBelow: 'sm',
      render: (request) => (
        <span className="whitespace-nowrap text-ink-500">{formatDate(request.createdAt)}</span>
      ),
    },
    {
      key: 'handledBy',
      header: 'Handled by',
      hideBelow: 'lg',
      render: (request) =>
        request.handledBy ? (
          <span className="text-ink-700">{request.handledBy.name}</span>
        ) : (
          <span className="text-ink-400">Unassigned</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-px',
      render: (request) =>
        canUpdate ? (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FiMessageSquare size={13} />}
              onClick={() => openRespond(request)}
            >
              Respond
            </Button>
            <button
              type="button"
              onClick={() => setDeleting(request)}
              aria-label={`Delete request for ${request.title}`}
              className="rounded-lg p-2 text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <FiTrash2 size={15} />
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Game requests"
        description="Titles customers have asked us to hunt down"
      />

      <FilterToolbar
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search title, platform or customer…"
        activeCount={(['search', 'status'] as const).filter((key) => filters[key]).length}
        onReset={() => {
          setSearchInput('');
          resetFilters();
        }}
      />

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
            rows={requests}
            rowKey={(request) => request.id}
            loading={loading}
            emptyTitle="No requests here"
            emptyMessage="Nothing matches this filter right now."
            renderMobileCard={(request) => (
              <div className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink-900">{request.title}</p>
                    <p className="truncate text-xs text-ink-500">
                      {request.platform || 'Any platform'} ·{' '}
                      {CONDITION_LABELS[request.conditionPreference]}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONES[request.status]}>
                    {STATUS_LABELS[request.status]}
                  </Badge>
                </div>

                {request.user && (
                  <p className="mt-2 truncate text-xs text-ink-600">
                    {request.user.firstName} {request.user.lastName} · {request.user.email}
                  </p>
                )}

                <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
                  <span>
                    {request.maxBudget ? `Up to ${formatPrice(request.maxBudget)}` : 'Open budget'}
                  </span>
                  <span>{formatDate(request.createdAt)}</span>
                </div>

                {canUpdate && (
                  <div className="mt-3 flex items-center gap-2 border-t border-ink-100 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      leftIcon={<FiMessageSquare size={13} />}
                      onClick={() => openRespond(request)}
                    >
                      Respond
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete request for ${request.title}`}
                      onClick={() => setDeleting(request)}
                    >
                      <FiTrash2 size={15} />
                    </Button>
                  </div>
                )}
              </div>
            )}
          />

          <Pagination
            meta={data?.meta}
            onPageChange={(page) => setFilter({ page })}
            className="mt-5"
          />
        </>
      )}

      <Modal
        open={Boolean(responding)}
        onClose={() => setResponding(null)}
        title="Respond to request"
        description={responding?.title}
        closeOnBackdrop={!saving}
        footer={
          <>
            <Button variant="outline" onClick={() => setResponding(null)} disabled={saving}>
              Cancel
            </Button>
            <Button loading={saving} onClick={submitResponse}>
              Send response
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {responding?.notes && (
            <div className="rounded-lg bg-ink-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Customer notes
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-ink-700">{responding.notes}</p>
            </div>
          )}

          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          />

          <Textarea
            label="Reply to the customer"
            rows={4}
            value={adminResponse}
            onChange={(event) => setAdminResponse(event.target.value)}
            placeholder="Let them know what you found, the price and when it lands."
          />

          <ProductPicker selected={linked} onSelect={setLinked} />

          <Checkbox
            label="Notify the customer by email"
            description="Sends your reply to their registered address."
            checked={notifyCustomer}
            onChange={(event) => setNotifyCustomer(event.target.checked)}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={removing}
        title="Delete this request?"
        confirmLabel="Delete request"
        message={
          <>
            The request for <strong>{deleting?.title}</strong> is removed permanently. The customer
            will no longer see it in their account.
          </>
        }
      />
    </div>
  );
};

export default GameRequests;
