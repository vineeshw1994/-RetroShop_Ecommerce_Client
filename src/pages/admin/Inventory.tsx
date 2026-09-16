import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiArchive,
  FiClipboard,
  FiEdit3,
  FiLayers,
  FiPlusCircle,
  FiDollarSign,
  FiSliders,
  FiTag,
  FiXCircle,
} from 'react-icons/fi';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { adminCategoryService, adminInventoryService } from '@/services/admin.service';
import { getErrorMessage } from '@/lib/api';
import { conditionLabel, formatDateTime, formatNumber, formatPrice } from '@/lib/format';
import cn from '@/lib/cn';
import {
  useAsync,
  useDebounce,
  useDocumentTitle,
  usePermissions,
  useQueryFilters,
} from '@/hooks';
import { DataTable, FilterToolbar, PageHeader, StatCard, type Column } from '@/components/admin';
import {
  Badge,
  Button,
  ErrorState,
  Input,
  Modal,
  Pagination,
  Select,
  SmartImage,
  Textarea,
  type SelectOption,
} from '@/components/ui';
import type { Category, InventoryLog, InventoryRow } from '@/types';

const PAGE_SIZE = 20;
const LOG_PAGE_SIZE = 20;

/* Module scope: `useQueryFilters` memoises on this object identity. */
const INVENTORY_DEFAULTS = {
  tab: 'levels',
  page: '1',
  search: '',
  state: '',
  categoryId: '',
  sort: 'stock_asc',
  logPage: '1',
  logType: '',
};

const STATE_TABS: { value: string; label: string }[] = [
  { value: '', label: 'All stock' },
  { value: 'healthy', label: 'Healthy' },
  { value: 'low', label: 'Low' },
  { value: 'out', label: 'Out of stock' },
];

const SORT_OPTIONS: SelectOption[] = [
  { value: 'stock_asc', label: 'Stock: low to high' },
  { value: 'stock_desc', label: 'Stock: high to low' },
  { value: 'name_asc', label: 'Name: A to Z' },
  { value: 'value_desc', label: 'Retail value: high to low' },
];

const STATE_TONES = {
  out: 'danger',
  low: 'warning',
  healthy: 'success',
} as const;

const STATE_LABELS = {
  out: 'Out of stock',
  low: 'Low stock',
  healthy: 'Healthy',
} as const;

const LOG_TYPES: InventoryLog['type'][] = [
  'restock',
  'sale',
  'adjustment',
  'return',
  'cancellation',
];

const LOG_TYPE_OPTIONS: SelectOption[] = LOG_TYPES.map((type) => ({
  value: type,
  label: type.charAt(0).toUpperCase() + type.slice(1),
}));

const LOG_TONES: Record<InventoryLog['type'], 'success' | 'info' | 'warning' | 'neutral' | 'danger'> =
  {
    restock: 'success',
    sale: 'info',
    adjustment: 'warning',
    return: 'neutral',
    cancellation: 'danger',
  };

const ADJUSTMENT_TYPES: SelectOption[] = [
  { value: 'adjustment', label: 'Adjustment (count correction, damage)' },
  { value: 'return', label: 'Return from a customer' },
  { value: 'cancellation', label: 'Cancelled order put back' },
  { value: 'restock', label: 'Restock from a supplier' },
];

const toCategoryOptions = (roots: Category[]): SelectOption[] =>
  roots.flatMap((root) => [
    { value: root.id, label: root.name },
    ...(root.children || []).map((child) => ({ value: child.id, label: `— ${child.name}` })),
  ]);

type StockMode = 'restock' | 'adjust' | 'set';

const MODE_COPY: Record<StockMode, { title: string; description: string; confirm: string }> = {
  restock: {
    title: 'Restock',
    description: 'Add units that have arrived from a supplier or trade-in.',
    confirm: 'Add stock',
  },
  adjust: {
    title: 'Adjust stock',
    description: 'Apply a positive or negative change and record why.',
    confirm: 'Apply adjustment',
  },
  set: {
    title: 'Set counted stock',
    description: 'Overwrite the stock level with the number you counted on the shelf.',
    confirm: 'Set stock',
  },
};

interface StockModalProps {
  mode: StockMode | null;
  row: InventoryRow | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const StockModal = ({ mode, row, onClose, onSaved }: StockModalProps) => {
  const dispatch = useAppDispatch();

  const [quantity, setQuantity] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('adjustment');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!mode || !row) return;

    setQuantity(mode === 'set' ? String(row.stock) : '');
    setAdjustmentType(mode === 'restock' ? 'restock' : 'adjustment');
    setReference('');
    setNote('');
    setFieldError(null);
  }, [mode, row]);

  if (!mode || !row) return null;

  const copy = MODE_COPY[mode];
  const numeric = Number(quantity);
  const valid = quantity.trim() !== '' && Number.isInteger(numeric);
  const projected = mode === 'set' ? numeric : row.stock + numeric;

  const handleSubmit = async () => {
    if (!valid) {
      setFieldError('Enter a whole number');
      return;
    }
    if (mode === 'restock' && numeric <= 0) {
      setFieldError('Enter how many units arrived');
      return;
    }
    if (mode === 'adjust' && numeric === 0) {
      setFieldError('Enter a change other than zero');
      return;
    }
    if (mode === 'set' && numeric < 0) {
      setFieldError('Stock cannot be negative');
      return;
    }
    if (mode !== 'set' && projected < 0) {
      setFieldError(`That would leave ${projected} units. Stock cannot go below zero.`);
      return;
    }

    setSaving(true);
    setFieldError(null);
    try {
      if (mode === 'set') {
        await adminInventoryService.setStock(row.id, {
          stock: numeric,
          note: note || undefined,
        });
      } else {
        await adminInventoryService.adjust(row.id, {
          quantityChange: numeric,
          type: mode === 'restock' ? 'restock' : adjustmentType,
          note: note || undefined,
          reference: reference || undefined,
        });
      }

      dispatch(pushToast(`${row.name} stock updated`, 'success'));
      onClose();
      await onSaved();
    } catch (caught) {
      const message = getErrorMessage(caught);
      setFieldError(message);
      dispatch(pushToast(message, 'error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${copy.title}: ${row.name}`}
      description={copy.description}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} loading={saving}>
            {copy.confirm}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-ink-50 px-4 py-3 text-sm">
          <span className="text-ink-500">
            {row.sku} · currently{' '}
            <span className="font-bold text-ink-900">{formatNumber(row.stock)}</span> in stock
          </span>
          {valid && (
            <span
              className={cn(
                'font-bold',
                projected < 0 ? 'text-rose-600' : 'text-emerald-600'
              )}
            >
              → {formatNumber(projected)}
            </span>
          )}
        </div>

        <Input
          label={
            mode === 'restock'
              ? 'Units received'
              : mode === 'adjust'
                ? 'Stock change'
                : 'Counted stock'
          }
          inputMode={mode === 'adjust' ? 'text' : 'numeric'}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder={mode === 'adjust' ? '-2 or 5' : '10'}
          hint={
            mode === 'adjust'
              ? 'Use a minus sign to remove units. The result cannot go below zero.'
              : mode === 'restock'
                ? 'Added on top of the current stock level.'
                : 'Replaces the current stock level outright.'
          }
          error={fieldError || undefined}
          autoFocus
        />

        {mode === 'adjust' && (
          <Select
            label="Reason"
            options={ADJUSTMENT_TYPES}
            value={adjustmentType}
            onChange={(event) => setAdjustmentType(event.target.value)}
          />
        )}

        {mode !== 'set' && (
          <Input
            label="Reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Supplier invoice, order number…"
            hint="Optional, but makes the movement history easier to audit."
          />
        )}

        <Textarea
          label="Note"
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={
            mode === 'set' ? 'Monday stock take' : 'Two discs arrived scratched and were binned'
          }
        />

        {mode === 'adjust' && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            <FiAlertTriangle className="mt-0.5 shrink-0" size={13} />
            Adjustments are relative to the current level and are rejected if they would push stock
            below zero.
          </p>
        )}
      </div>
    </Modal>
  );
};

const Inventory = () => {
  useDocumentTitle('Inventory');

  const { can } = usePermissions();
  const { filters, setFilter, resetFilters } = useQueryFilters(INVENTORY_DEFAULTS);

  const [searchTerm, setSearchTerm] = useState(filters.search);
  const debouncedSearch = useDebounce(searchTerm.trim(), 400);

  const [stockMode, setStockMode] = useState<StockMode | null>(null);
  const [stockRow, setStockRow] = useState<InventoryRow | null>(null);

  const canAdjust = can('inventory:update');
  const showMovements = filters.tab === 'movements';

  useEffect(() => {
    if (debouncedSearch !== filters.search) setFilter({ search: debouncedSearch });
  }, [debouncedSearch, filters.search, setFilter]);

  const categories = useAsync(async () => (await adminCategoryService.tree()).data, []);

  const page = Number(filters.page) || 1;
  const logPage = Number(filters.logPage) || 1;

  const { data, loading, error, reload } = useAsync(
    () =>
      adminInventoryService.list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        state: filters.state || undefined,
        categoryId: filters.categoryId ? Number(filters.categoryId) : undefined,
        sort: filters.sort || undefined,
      }),
    [page, debouncedSearch, filters.state, filters.categoryId, filters.sort]
  );

  const logs = useAsync(
    async () =>
      showMovements
        ? await adminInventoryService.logs({
            page: logPage,
            limit: LOG_PAGE_SIZE,
            type: filters.logType || undefined,
          })
        : null,
    [showMovements, logPage, filters.logType]
  );

  const rows = data?.data || [];
  const meta = data?.meta;
  const summary = data?.summary;

  const categoryOptions = useMemo(
    () => toCategoryOptions(categories.data || []),
    [categories.data]
  );

  const activeCount = (['search', 'state', 'categoryId'] as const).filter(
    (key) => filters[key] !== INVENTORY_DEFAULTS[key]
  ).length;

  const openStockModal = (mode: StockMode, row: InventoryRow) => {
    setStockRow(row);
    setStockMode(mode);
  };

  const rowActions = (row: InventoryRow) =>
    [
      { mode: 'restock' as StockMode, label: 'Restock', icon: FiPlusCircle },
      { mode: 'adjust' as StockMode, label: 'Adjust', icon: FiSliders },
      { mode: 'set' as StockMode, label: 'Set count', icon: FiEdit3 },
    ].map(({ mode, label, icon: Icon }) => (
      <button
        key={mode}
        type="button"
        onClick={() => openStockModal(mode, row)}
        title={label}
        aria-label={`${label} ${row.name}`}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-brand-50 hover:text-brand-600"
      >
        <Icon size={16} />
      </button>
    ));

  const columns = useMemo<Column<InventoryRow>[]>(() => {
    const base: Column<InventoryRow>[] = [
      {
        key: 'product',
        header: 'Product',
        render: (row) => (
          <div className="flex min-w-0 items-center gap-3">
            <SmartImage
              src={row.primaryImage}
              alt={row.name}
              wrapperClassName="h-11 w-11 shrink-0 rounded-lg border border-ink-100"
              className="h-full w-full object-cover"
            />
            <div className="min-w-0">
              <Link
                to={`/admin/products/${row.id}/edit`}
                className="block truncate font-semibold text-ink-900 transition hover:text-brand-600"
              >
                {row.name}
              </Link>
              <p className="truncate text-xs text-ink-400">
                {row.sku} · {conditionLabel(row.condition)}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        hideBelow: 'lg',
        render: (row) => <span className="text-ink-600">{row.category?.name || '—'}</span>,
      },
      {
        key: 'stock',
        header: 'Stock',
        render: (row) => (
          <span className="flex flex-col gap-1">
            <span className="font-bold text-ink-900">{formatNumber(row.stock)}</span>
            <Badge tone={STATE_TONES[row.state]} dot>
              {STATE_LABELS[row.state]}
            </Badge>
          </span>
        ),
      },
      {
        key: 'threshold',
        header: 'Low at',
        hideBelow: 'lg',
        render: (row) => <span className="text-ink-600">{formatNumber(row.lowStockThreshold)}</span>,
      },
      {
        key: 'price',
        header: 'Price',
        hideBelow: 'md',
        render: (row) => <span className="whitespace-nowrap">{formatPrice(row.price)}</span>,
      },
      {
        key: 'retailValue',
        header: 'Retail value',
        render: (row) => (
          <span className="whitespace-nowrap font-semibold text-ink-900">
            {formatPrice(row.retailValue)}
          </span>
        ),
      },
      {
        key: 'sold',
        header: 'Sold',
        hideBelow: 'lg',
        render: (row) => <span className="text-ink-600">{formatNumber(row.soldCount)}</span>,
      },
    ];

    if (!canAdjust) return base;

    return [
      ...base,
      {
        key: 'actions',
        header: <span className="sr-only">Stock actions</span>,
        headerClassName: 'text-right',
        className: 'text-right',
        render: (row) => (
          <span className="inline-flex items-center gap-0.5">{rowActions(row)}</span>
        ),
      },
    ];
  }, [canAdjust]);

  const logColumns = useMemo<Column<InventoryLog>[]>(
    () => [
      {
        key: 'createdAt',
        header: 'When',
        render: (log) => (
          <span className="whitespace-nowrap text-ink-600">{formatDateTime(log.createdAt)}</span>
        ),
      },
      {
        key: 'product',
        header: 'Product',
        render: (log) =>
          log.product ? (
            <Link
              to={`/admin/products/${log.product.id}/edit`}
              className="block min-w-0 transition hover:text-brand-600"
            >
              <span className="block truncate font-semibold text-ink-900">{log.product.name}</span>
              <span className="block truncate text-xs text-ink-400">{log.product.sku}</span>
            </Link>
          ) : (
            <span className="text-ink-400">Deleted product</span>
          ),
      },
      {
        key: 'type',
        header: 'Type',
        render: (log) => <Badge tone={LOG_TONES[log.type]}>{log.type}</Badge>,
      },
      {
        key: 'change',
        header: 'Change',
        render: (log) => (
          <span
            className={cn(
              'font-bold',
              log.quantityChange < 0 ? 'text-rose-600' : 'text-emerald-600'
            )}
          >
            {log.quantityChange > 0 ? '+' : ''}
            {formatNumber(log.quantityChange)}
          </span>
        ),
      },
      {
        key: 'stockAfter',
        header: 'Stock after',
        render: (log) => <span className="font-semibold">{formatNumber(log.stockAfter)}</span>,
      },
      {
        key: 'reference',
        header: 'Reference',
        hideBelow: 'lg',
        render: (log) => <span className="text-ink-500">{log.reference || '—'}</span>,
      },
      {
        key: 'note',
        header: 'Note',
        hideBelow: 'lg',
        render: (log) => (
          <span className="block max-w-[220px] truncate text-ink-500">{log.note || '—'}</span>
        ),
      },
      {
        key: 'admin',
        header: 'By',
        hideBelow: 'md',
        render: (log) => <span className="text-ink-600">{log.admin?.name || 'System'}</span>,
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="What is on the shelf, what is running out, and every movement in and out."
        breadcrumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Inventory' }]}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="SKUs tracked"
          value={formatNumber(summary?.skuCount)}
          icon={<FiLayers size={17} />}
          tone="neutral"
          index={0}
        />
        <StatCard
          label="Units on hand"
          value={formatNumber(summary?.unitsOnHand)}
          icon={<FiArchive size={17} />}
          tone="info"
          index={1}
        />
        <StatCard
          label="Retail value"
          value={formatPrice(summary?.retailValue)}
          icon={<FiTag size={17} />}
          tone="brand"
          hint="What the shelf is worth at list price"
          index={2}
        />
        <StatCard
          label="Cost value"
          value={formatPrice(summary?.costValue)}
          icon={<FiDollarSign size={17} />}
          tone="success"
          hint="What you paid for the stock"
          index={3}
        />
        <StatCard
          label="Out of stock"
          value={formatNumber(summary?.outOfStockCount)}
          icon={<FiXCircle size={17} />}
          tone="warning"
          index={4}
        />
        <StatCard
          label="Low stock"
          value={formatNumber(summary?.lowStockCount)}
          icon={<FiAlertTriangle size={17} />}
          tone="warning"
          index={5}
        />
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { value: 'levels', label: 'Stock levels', icon: FiArchive },
          { value: 'movements', label: 'Movement history', icon: FiClipboard },
        ].map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter({ tab: value === 'levels' ? undefined : value })}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition',
              (filters.tab === value || (value === 'levels' && !showMovements))
                ? 'bg-ink-900 text-white shadow-sm'
                : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {showMovements ? (
        <>
          <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
            <p className="mr-auto text-sm text-ink-500">
              Every stock change, including sales and cancellations.
            </p>
            <Select
              aria-label="Filter by movement type"
              options={LOG_TYPE_OPTIONS}
              placeholder="All movement types"
              value={filters.logType}
              onChange={(event) => setFilter({ logType: event.target.value, logPage: undefined })}
              className="h-10 w-full py-0 text-sm sm:w-56"
            />
          </div>

          {logs.error ? (
            <div className="card">
              <ErrorState message={logs.error} onRetry={logs.reload} />
            </div>
          ) : (
            <>
              <DataTable
                columns={logColumns}
                rows={logs.data?.data || []}
                rowKey={(log) => log.id}
                loading={logs.loading}
                emptyTitle="No stock movements yet"
                emptyMessage="Restocks, sales and adjustments all appear here."
                renderMobileCard={(log) => (
                  <div className="card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink-900">
                          {log.product?.name || 'Deleted product'}
                        </p>
                        <p className="truncate text-xs text-ink-400">
                          {formatDateTime(log.createdAt)} · {log.admin?.name || 'System'}
                        </p>
                      </div>

                      <span className="shrink-0 text-right">
                        <span
                          className={cn(
                            'text-sm font-bold',
                            log.quantityChange < 0 ? 'text-rose-600' : 'text-emerald-600'
                          )}
                        >
                          {log.quantityChange > 0 ? '+' : ''}
                          {formatNumber(log.quantityChange)}
                        </span>
                        <span className="block text-xs text-ink-400">
                          → {formatNumber(log.stockAfter)}
                        </span>
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge tone={LOG_TONES[log.type]}>{log.type}</Badge>
                      {log.reference && (
                        <span className="text-xs text-ink-400">{log.reference}</span>
                      )}
                    </div>

                    {log.note && <p className="mt-2 text-xs text-ink-500">{log.note}</p>}
                  </div>
                )}
              />

              <Pagination
                meta={logs.data?.meta}
                className="mt-5"
                onPageChange={(next) => setFilter({ logPage: next }, false)}
              />
            </>
          )}
        </>
      ) : (
        <>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {STATE_TABS.map((tab) => (
              <button
                key={tab.value || 'all'}
                type="button"
                onClick={() => setFilter({ state: tab.value || undefined })}
                className={cn(
                  'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                  filters.state === tab.value
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <FilterToolbar
            search={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search name, SKU or platform…"
            activeCount={activeCount}
            onReset={() => {
              setSearchTerm('');
              resetFilters();
            }}
          >
            <Select
              aria-label="Filter by category"
              options={categoryOptions}
              placeholder="All categories"
              value={filters.categoryId}
              onChange={(event) => setFilter({ categoryId: event.target.value })}
              className="h-10 w-full py-0 text-sm sm:w-44"
            />
            <Select
              aria-label="Sort stock"
              options={SORT_OPTIONS}
              value={filters.sort}
              onChange={(event) => setFilter({ sort: event.target.value })}
              className="h-10 w-full py-0 text-sm sm:w-52"
            />
          </FilterToolbar>

          {error ? (
            <div className="card">
              <ErrorState message={error} onRetry={reload} />
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(row) => row.id}
                loading={loading}
                emptyTitle="Nothing to show for these filters"
                emptyMessage="Try another stock state or clear the search."
                renderMobileCard={(row) => (
                  <div className="card p-3">
                    <div className="flex gap-3">
                      <SmartImage
                        src={row.primaryImage}
                        alt={row.name}
                        wrapperClassName="h-16 w-16 shrink-0 rounded-lg border border-ink-100"
                        className="h-full w-full object-cover"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink-900">{row.name}</p>
                        <p className="truncate text-xs text-ink-400">
                          {row.sku} · {row.category?.name || 'Uncategorised'}
                        </p>

                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                          <Badge tone={STATE_TONES[row.state]} dot>
                            {STATE_LABELS[row.state]}
                          </Badge>
                          <span className="font-bold text-ink-900">
                            {formatNumber(row.stock)} units
                          </span>
                          <span className="text-ink-400">
                            {formatPrice(row.retailValue)} retail
                          </span>
                        </div>
                      </div>
                    </div>

                    {canAdjust && (
                      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-ink-100 pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openStockModal('restock', row)}
                        >
                          Restock
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openStockModal('adjust', row)}
                        >
                          Adjust
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openStockModal('set', row)}
                        >
                          Set count
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              />

              <Pagination
                meta={meta}
                className="mt-5"
                onPageChange={(next) => setFilter({ page: next }, false)}
              />
            </>
          )}
        </>
      )}

      <StockModal
        mode={stockMode}
        row={stockRow}
        onClose={() => setStockMode(null)}
        onSaved={async () => {
          await reload();
          if (showMovements) await logs.reload();
        }}
      />
    </div>
  );
};

export default Inventory;
