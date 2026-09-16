import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiBox,
  FiCheckCircle,
  FiCopy,
  FiEdit2,
  FiPlus,
  FiSlash,
  FiStar,
  FiTrash2,
  FiUploadCloud,
  FiX,
} from 'react-icons/fi';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import {
  adminCategoryService,
  adminProductService,
  type AdminProductQuery,
} from '@/services/admin.service';
import { getErrorMessage } from '@/lib/api';
import { CONDITION_LABELS, conditionLabel, formatNumber, formatPrice } from '@/lib/format';
import cn from '@/lib/cn';
import {
  useAsync,
  useDebounce,
  useDocumentTitle,
  usePermissions,
  useQueryFilters,
} from '@/hooks';
import { DataTable, FilterToolbar, PageHeader, type Column } from '@/components/admin';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  ErrorState,
  Pagination,
  Select,
  SmartImage,
  type SelectOption,
} from '@/components/ui';
import type { Category, Product, ProductCondition } from '@/types';

const PAGE_SIZE = 20;

/* Module scope: `useQueryFilters` memoises on this object identity. */
const PRODUCT_DEFAULTS = {
  page: '1',
  search: '',
  categoryId: '',
  condition: '',
  status: '',
  stock: '',
  sort: 'newest',
};

const CONDITION_OPTIONS: SelectOption[] = (
  Object.keys(CONDITION_LABELS) as ProductCondition[]
).map((condition) => ({ value: condition, label: CONDITION_LABELS[condition] }));

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const STOCK_OPTIONS: SelectOption[] = [
  { value: 'in', label: 'In stock' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
];

const SORT_OPTIONS: SelectOption[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name_asc', label: 'Name: A to Z' },
  { value: 'name_desc', label: 'Name: Z to A' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'stock_asc', label: 'Stock: low to high' },
  { value: 'stock_desc', label: 'Stock: high to low' },
  { value: 'best_selling', label: 'Best selling' },
];

const BULK_ACTIONS = [
  { action: 'activate', label: 'Activate', icon: FiCheckCircle },
  { action: 'deactivate', label: 'Deactivate', icon: FiSlash },
  { action: 'feature', label: 'Feature', icon: FiStar },
  { action: 'unfeature', label: 'Unfeature', icon: FiX },
] as const;

/** Flatten the category tree into select options, indenting the children. */
const toCategoryOptions = (roots: Category[]): SelectOption[] =>
  roots.flatMap((root) => [
    { value: root.id, label: root.name },
    ...(root.children || []).map((child) => ({
      value: child.id,
      label: `— ${child.name}`,
    })),
  ]);

const StockCell = ({ product }: { product: Product }) => (
  <span
    className={cn(
      'font-bold',
      product.stock <= 0 ? 'text-rose-600' : product.isLowStock ? 'text-amber-600' : 'text-ink-800'
    )}
  >
    {formatNumber(product.stock)}
    {product.stock > 0 && product.isLowStock && (
      <span className="ml-1.5 text-[11px] font-semibold uppercase tracking-wide">low</span>
    )}
    {product.stock <= 0 && (
      <span className="ml-1.5 text-[11px] font-semibold uppercase tracking-wide">out</span>
    )}
  </span>
);

const PriceCell = ({ product }: { product: Product }) => {
  const discounted = product.salePrice !== null && product.salePrice < product.price;

  return (
    <span className="whitespace-nowrap">
      <span className="font-bold text-ink-900">
        {formatPrice(discounted ? product.salePrice : product.price)}
      </span>
      {discounted && (
        <span className="ml-1.5 text-xs text-ink-400 line-through">
          {formatPrice(product.price)}
        </span>
      )}
    </span>
  );
};

const Products = () => {
  useDocumentTitle('Products');

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { filters, setFilter, resetFilters } = useQueryFilters(PRODUCT_DEFAULTS);

  const [searchTerm, setSearchTerm] = useState(filters.search);
  const debouncedSearch = useDebounce(searchTerm.trim(), 400);

  const [selected, setSelected] = useState<number[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const [cloningId, setCloningId] = useState<number | null>(null);

  useEffect(() => {
    if (debouncedSearch !== filters.search) setFilter({ search: debouncedSearch });
  }, [debouncedSearch, filters.search, setFilter]);

  const categories = useAsync(async () => (await adminCategoryService.tree()).data, []);

  const page = Number(filters.page) || 1;

  const query = useMemo<AdminProductQuery>(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      categoryId: filters.categoryId ? Number(filters.categoryId) : undefined,
      condition: filters.condition || undefined,
      status: (filters.status as 'active' | 'inactive') || undefined,
      stock: (filters.stock as 'in' | 'low' | 'out') || undefined,
      sort: filters.sort || undefined,
    }),
    [
      page,
      debouncedSearch,
      filters.categoryId,
      filters.condition,
      filters.status,
      filters.stock,
      filters.sort,
    ]
  );

  const { data, loading, error, reload } = useAsync(
    () => adminProductService.list(query),
    [query]
  );

  const rows = data?.data || [];
  const meta = data?.meta;

  // Stale ids would silently apply a bulk action to rows nobody can see.
  useEffect(() => setSelected([]), [data]);

  const canCreate = can('products:create');
  const canUpdate = can('products:update');
  const canDelete = can('products:delete');

  const handleClone = async (product: Product) => {
    setCloningId(product.id);
    try {
      const response = await adminProductService.clone(product.id);
      dispatch(pushToast(response.message || `${product.name} cloned`, 'success'));
      navigate(`/admin/products/${response.data.id}/edit`);
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setCloningId(null);
    }
  };

  const categoryOptions = useMemo(
    () => toCategoryOptions(categories.data || []),
    [categories.data]
  );

  const activeCount = (
    ['search', 'categoryId', 'condition', 'status', 'stock'] as const
  ).filter((key) => filters[key] !== PRODUCT_DEFAULTS[key]).length;

  const allSelected = rows.length > 0 && selected.length === rows.length;

  const toggleRow = (id: number) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );

  const handleBulk = async (action: (typeof BULK_ACTIONS)[number]['action']) => {
    setBulkPending(true);
    try {
      const response = await adminProductService.bulk(selected, action);
      dispatch(
        pushToast(
          response.message || `${selected.length} product(s) updated`,
          'success'
        )
      );
      setSelected([]);
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setBulkPending(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const response = await adminProductService.remove(deleteTarget.id);
      dispatch(
        pushToast(
          response.message ||
            (response.data.archived
              ? `${deleteTarget.name} was archived`
              : `${deleteTarget.name} was deleted`),
          'success'
        )
      );
      setDeleteTarget(null);
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo<Column<Product>[]>(
    () => [
      {
        key: 'select',
        headerClassName: 'w-10',
        className: 'w-10',
        header: (
          <span onClick={(event) => event.stopPropagation()}>
            <Checkbox
              checked={allSelected}
              onChange={() => setSelected(allSelected ? [] : rows.map((row) => row.id))}
              aria-label="Select all products on this page"
            />
          </span>
        ),
        render: (row) => (
          <span onClick={(event) => event.stopPropagation()}>
            <Checkbox
              checked={selected.includes(row.id)}
              onChange={() => toggleRow(row.id)}
              aria-label={`Select ${row.name}`}
            />
          </span>
        ),
      },
      {
        key: 'product',
        header: 'Product',
        render: (row) => (
          <div className="flex min-w-0 items-center gap-3">
            <SmartImage
              src={row.cardImage || row.primaryImage}
              alt={row.name}
              wrapperClassName="h-11 w-11 shrink-0 rounded-lg border border-ink-100"
              className="h-full w-full object-cover"
            />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink-900">{row.name}</p>
              <p className="truncate text-xs text-ink-400">{row.sku}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        hideBelow: 'lg',
        render: (row) => (
          <span className="text-ink-600">{row.category?.name || '—'}</span>
        ),
      },
      {
        key: 'spec',
        header: 'Platform / condition',
        hideBelow: 'lg',
        render: (row) => (
          <span className="text-xs">
            <span className="block font-medium text-ink-700">{row.platform || '—'}</span>
            <span className="block text-ink-400">{conditionLabel(row.condition)}</span>
          </span>
        ),
      },
      { key: 'price', header: 'Price', render: (row) => <PriceCell product={row} /> },
      { key: 'stock', header: 'Stock', render: (row) => <StockCell product={row} /> },
      {
        key: 'sold',
        header: 'Sold',
        hideBelow: 'md',
        render: (row) => <span className="text-ink-600">{formatNumber(row.soldCount)}</span>,
      },
      {
        key: 'flags',
        header: 'Status',
        render: (row) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={row.isActive ? 'success' : 'neutral'} dot>
              {row.isActive ? 'Active' : 'Inactive'}
            </Badge>
            {row.isFeatured && <Badge tone="brand">Featured</Badge>}
          </div>
        ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">Actions</span>,
        headerClassName: 'text-right',
        className: 'text-right',
        render: (row) => (
          <span
            className="inline-flex items-center gap-1"
            onClick={(event) => event.stopPropagation()}
          >
            {canCreate && (
              <button
                type="button"
                disabled={cloningId === row.id}
                onClick={() => void handleClone(row)}
                aria-label={`Clone ${row.name}`}
                title="Clone product"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 disabled:opacity-50"
              >
                <FiCopy size={15} />
              </button>
            )}
            {canUpdate && (
              <Link
                to={`/admin/products/${row.id}/edit`}
                aria-label={`Edit ${row.name}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
              >
                <FiEdit2 size={15} />
              </Link>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => setDeleteTarget(row)}
                aria-label={`Delete ${row.name}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-rose-50 hover:text-rose-600"
              >
                <FiTrash2 size={15} />
              </button>
            )}
          </span>
        ),
      },
    ],
    [allSelected, rows, selected, canCreate, canUpdate, canDelete, cloningId]
  );

  const renderMobileCard = (row: Product) => (
    <div className="card p-3">
      <div className="flex gap-3">
        <span onClick={(event) => event.stopPropagation()} className="shrink-0">
          <Checkbox
            checked={selected.includes(row.id)}
            onChange={() => toggleRow(row.id)}
            aria-label={`Select ${row.name}`}
          />
        </span>

        <SmartImage
          src={row.cardImage || row.primaryImage}
          alt={row.name}
          wrapperClassName="h-16 w-16 shrink-0 rounded-lg border border-ink-100"
          className="h-full w-full object-cover"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink-900">{row.name}</p>
          <p className="truncate text-xs text-ink-400">
            {row.sku} · {conditionLabel(row.condition)}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <PriceCell product={row} />
            <StockCell product={row} />
            <span className="text-ink-400">{formatNumber(row.soldCount)} sold</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge tone={row.isActive ? 'success' : 'neutral'} dot>
              {row.isActive ? 'Active' : 'Inactive'}
            </Badge>
            {row.isFeatured && <Badge tone="brand">Featured</Badge>}
          </div>
        </div>
      </div>

      {(canCreate || canUpdate || canDelete) && (
        <div
          className="mt-3 flex items-center gap-2 border-t border-ink-100 pt-3"
          onClick={(event) => event.stopPropagation()}
        >
          {canCreate && (
            <Button
              variant="outline"
              size="sm"
              loading={cloningId === row.id}
              onClick={() => void handleClone(row)}
              leftIcon={<FiCopy size={14} />}
            >
              Clone
            </Button>
          )}
          {canUpdate && (
            <Link to={`/admin/products/${row.id}/edit`} className="flex-1">
              <Button variant="outline" size="sm" fullWidth leftIcon={<FiEdit2 size={14} />}>
                Edit
              </Button>
            </Link>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(row)}
              leftIcon={<FiTrash2 size={14} />}
            >
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={cn(selected.length > 0 && 'pb-24')}>
      <PageHeader
        title="Products"
        description="Every game, console and accessory in the shop."
        breadcrumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Products' }]}
        actions={
          <span className="text-sm text-ink-500">
            {formatNumber(meta?.total ?? rows.length)} in catalogue
          </span>
        }
      />

      <FilterToolbar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search name, SKU, brand or platform…"
        activeCount={activeCount}
        onReset={() => {
          setSearchTerm('');
          resetFilters();
        }}
        trailing={
          canCreate && (
            <span className="flex flex-wrap items-center gap-2">
              <Link to="/admin/products/import">
                <Button variant="outline" size="sm" leftIcon={<FiUploadCloud size={15} />}>
                  Import
                </Button>
              </Link>
              <Link to="/admin/products/new">
                <Button size="sm" leftIcon={<FiPlus size={15} />}>
                  New product
                </Button>
              </Link>
            </span>
          )
        }
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
          aria-label="Filter by condition"
          options={CONDITION_OPTIONS}
          placeholder="Any condition"
          value={filters.condition}
          onChange={(event) => setFilter({ condition: event.target.value })}
          className="h-10 w-full py-0 text-sm sm:w-36"
        />
        <Select
          aria-label="Filter by status"
          options={STATUS_OPTIONS}
          placeholder="Any status"
          value={filters.status}
          onChange={(event) => setFilter({ status: event.target.value })}
          className="h-10 w-full py-0 text-sm sm:w-32"
        />
        <Select
          aria-label="Filter by stock level"
          options={STOCK_OPTIONS}
          placeholder="Any stock"
          value={filters.stock}
          onChange={(event) => setFilter({ stock: event.target.value })}
          className="h-10 w-full py-0 text-sm sm:w-36"
        />
        <Select
          aria-label="Sort products"
          options={SORT_OPTIONS}
          value={filters.sort}
          onChange={(event) => setFilter({ sort: event.target.value })}
          className="h-10 w-full py-0 text-sm sm:w-44"
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
            onRowClick={canUpdate ? (row) => navigate(`/admin/products/${row.id}/edit`) : undefined}
            renderMobileCard={renderMobileCard}
            emptyTitle="No products match these filters"
            emptyMessage="Try clearing a filter, or add your first product to the catalogue."
            emptyAction={
              canCreate ? { label: 'New product', onClick: () => navigate('/admin/products/new') } : undefined
            }
          />

          <Pagination
            meta={meta}
            className="mt-5"
            onPageChange={(next) => setFilter({ page: next }, false)}
          />
        </>
      )}

      <AnimatePresence>
        {selected.length > 0 && canUpdate && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed inset-x-4 bottom-4 z-40 lg:left-auto lg:right-6 lg:w-auto"
          >
            <div className="card flex flex-wrap items-center gap-2 p-3 shadow-lift">
              <p className="mr-auto text-sm font-bold text-ink-900">
                {selected.length} selected
              </p>

              {BULK_ACTIONS.map(({ action, label, icon: Icon }) => (
                <Button
                  key={action}
                  variant="outline"
                  size="sm"
                  disabled={bulkPending}
                  onClick={() => void handleBulk(action)}
                  leftIcon={<Icon size={14} />}
                >
                  {label}
                </Button>
              ))}

              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                Clear
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete ${deleteTarget?.name || 'this product'}?`}
        message={
          <>
            <p>
              If this product already appears on an order it will be archived and deactivated
              instead of deleted, so order history stays intact.
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500">
              <FiBox size={13} />
              {deleteTarget?.sku}
            </p>
          </>
        }
        confirmLabel="Delete product"
      />
    </div>
  );
};

export default Products;
