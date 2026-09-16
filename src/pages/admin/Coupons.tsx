import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiPlus, FiTag, FiTrash2 } from 'react-icons/fi';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { adminCategoryService, adminCouponService, adminProductService } from '@/services/admin.service';
import { getErrorMessage } from '@/lib/api';
import { formatDate, formatPrice } from '@/lib/format';
import { useAsync, useDebounce, useDocumentTitle, usePermissions, useQueryFilters } from '@/hooks';
import { FilterToolbar, PageHeader } from '@/components/admin';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  Pagination,
  Select,
  Switch,
  Textarea,
  Checkbox,
} from '@/components/ui';
import type { Coupon } from '@/types';

const DEFAULTS = { page: '1', search: '', status: '', scope: '' };

const schema = z.object({
  code: z.string().trim().min(3, 'Enter a code').max(40),
  description: z.string().optional(),
  type: z.enum(['percent', 'fixed']),
  value: z.string().min(1, 'Enter a value'),
  minOrder: z.string(),
  maxUses: z.string(),
  scope: z.enum(['all', 'categories', 'products']),
  isActive: z.boolean(),
  startsAt: z.string(),
  endsAt: z.string(),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  code: '',
  description: '',
  type: 'percent',
  value: '',
  minOrder: '0',
  maxUses: '',
  scope: 'all',
  isActive: true,
  startsAt: '',
  endsAt: '',
};

const Coupons = () => {
  useDocumentTitle('Coupons');
  const dispatch = useAppDispatch();
  const { can } = usePermissions();
  const { filters, setFilter, resetFilters } = useQueryFilters(DEFAULTS);
  const [searchTerm, setSearchTerm] = useState(filters.search);
  const debounced = useDebounce(searchTerm.trim(), 400);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const productQuery = useDebounce(productSearch, 300);

  const page = Number(filters.page) || 1;
  const { data, loading, error, reload } = useAsync(
    () =>
      adminCouponService.list({
        page,
        search: debounced || undefined,
        status: filters.status || undefined,
        scope: filters.scope || undefined,
      }),
    [page, debounced, filters.status, filters.scope]
  );

  const categories = useAsync(async () => (await adminCategoryService.tree()).data, []);
  const products = useAsync(
    async () =>
      productQuery.length < 2
        ? []
        : (await adminProductService.list({ search: productQuery, limit: 10 })).data,
    [productQuery]
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    if (debounced !== filters.search) setFilter({ search: debounced });
  }, [debounced, filters.search, setFilter]);

  const scope = watch('scope');
  const isActive = watch('isActive');
  const coupons = data?.data || [];
  const meta = data?.meta;
  const flatCategories = useMemo(() => {
    const rows: { id: number; name: string }[] = [];
    (categories.data || []).forEach((root) => {
      rows.push({ id: root.id, name: root.name });
      (root.children || []).forEach((child) => rows.push({ id: child.id, name: `${root.name} / ${child.name}` }));
    });
    return rows;
  }, [categories.data]);

  const openCreate = () => {
    setEditing(null);
    setSelectedCategories([]);
    setSelectedProducts([]);
    reset(EMPTY);
    setEditorOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditing(coupon);
    setSelectedCategories(coupon.categoryIds || []);
    setSelectedProducts(coupon.productIds || []);
    reset({
      code: coupon.code,
      description: coupon.description || '',
      type: coupon.type,
      value: String(coupon.value),
      minOrder: String(coupon.minOrder),
      maxUses: coupon.maxUses == null ? '' : String(coupon.maxUses),
      scope: coupon.scope,
      isActive: coupon.isActive,
      startsAt: coupon.startsAt ? coupon.startsAt.slice(0, 16) : '',
      endsAt: coupon.endsAt ? coupon.endsAt.slice(0, 16) : '',
    });
    setEditorOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const payload: Record<string, unknown> = {
      ...values,
      value: Number(values.value),
      minOrder: Number(values.minOrder) || 0,
      maxUses: values.maxUses === '' ? null : Number(values.maxUses),
      categoryIds: values.scope === 'categories' ? selectedCategories : [],
      productIds: values.scope === 'products' ? selectedProducts : [],
      startsAt: values.startsAt || null,
      endsAt: values.endsAt || null,
    };

    try {
      if (editing) {
        await adminCouponService.update(editing.id, payload);
        dispatch(pushToast('Coupon updated', 'success'));
      } else {
        await adminCouponService.create(payload);
        dispatch(pushToast('Coupon created', 'success'));
      }
      setEditorOpen(false);
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    }
  };

  return (
    <div>
      <PageHeader
        title="Coupons"
        description="Discount codes for the whole shop, selected categories or specific products."
        breadcrumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Coupons' }]}
        actions={
          can('coupons:create') && (
            <Button onClick={openCreate} leftIcon={<FiPlus size={16} />}>
              New coupon
            </Button>
          )
        }
      />

      <FilterToolbar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search codes…"
        onReset={() => {
          setSearchTerm('');
          resetFilters();
        }}
        activeCount={[filters.search, filters.status, filters.scope].filter(Boolean).length}
      >
        <Select
          aria-label="Status"
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
          placeholder="Any status"
          value={filters.status}
          onChange={(event) => setFilter({ status: event.target.value })}
        />
        <Select
          aria-label="Scope"
          options={[
            { value: 'all', label: 'Whole shop' },
            { value: 'categories', label: 'Categories' },
            { value: 'products', label: 'Products' },
          ]}
          placeholder="Any scope"
          value={filters.scope}
          onChange={(event) => setFilter({ scope: event.target.value })}
        />
      </FilterToolbar>

      {loading ? (
        <div className="card h-40" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : coupons.length === 0 ? (
        <EmptyState icon={<FiTag size={22} />} title="No coupons yet" action={{ label: 'New coupon', onClick: openCreate }} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs font-bold uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Offer</th>
                <th className="px-4 py-3">Applies to</th>
                <th className="px-4 py-3">Uses</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td className="px-4 py-3 font-bold text-ink-900">{coupon.code}</td>
                  <td className="px-4 py-3">
                    {coupon.type === 'percent' ? `${coupon.value}%` : formatPrice(coupon.value)}
                    {coupon.minOrder > 0 && (
                      <span className="block text-xs text-ink-400">Min {formatPrice(coupon.minOrder)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">{coupon.scope}</td>
                  <td className="px-4 py-3">
                    {coupon.usedCount}
                    {coupon.maxUses != null ? ` / ${coupon.maxUses}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={coupon.isActive ? 'success' : 'neutral'}>
                      {coupon.isActive ? 'Active' : 'Off'}
                    </Badge>
                    {coupon.endsAt && (
                      <span className="mt-1 block text-xs text-ink-400">Until {formatDate(coupon.endsAt)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {can('coupons:update') && (
                      <Button size="sm" variant="ghost" onClick={() => openEdit(coupon)}>
                        Edit
                      </Button>
                    )}
                    {can('coupons:delete') && (
                      <button
                        type="button"
                        className="ml-1 rounded-lg p-2 text-ink-400 hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => setDeleteTarget(coupon)}
                      >
                        <FiTrash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination meta={meta} onPageChange={(next) => setFilter({ page: next }, false)} />
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        size="lg"
        title={editing ? `Edit ${editing.code}` : 'New coupon'}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button form="coupon-form" type="submit" loading={isSubmitting}>
              {editing ? 'Save' : 'Create coupon'}
            </Button>
          </>
        }
      >
        <form id="coupon-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input {...register('code')} label="Code" required placeholder="SUMMER10" error={errors.code?.message} />
            <Select
              {...register('type')}
              label="Type"
              options={[
                { value: 'percent', label: 'Percentage' },
                { value: 'fixed', label: 'Fixed amount' },
              ]}
            />
            <Input {...register('value')} label="Value" required hint="10 for 10% or 10.00 for £10" error={errors.value?.message} />
            <Input {...register('minOrder')} label="Minimum order" />
            <Input {...register('maxUses')} label="Max uses" hint="Leave blank for unlimited" />
            <Select
              {...register('scope')}
              label="Applies to"
              options={[
                { value: 'all', label: 'All products' },
                { value: 'categories', label: 'Selected categories' },
                { value: 'products', label: 'Selected products' },
              ]}
            />
          </div>
          <Textarea {...register('description')} label="Description" rows={2} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input {...register('startsAt')} type="datetime-local" label="Starts" />
            <Input {...register('endsAt')} type="datetime-local" label="Ends" />
          </div>

          {scope === 'categories' && (
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-ink-100 p-3">
              {flatCategories.map((category) => (
                <label key={category.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() =>
                      setSelectedCategories((current) =>
                        current.includes(category.id)
                          ? current.filter((id) => id !== category.id)
                          : [...current, category.id]
                      )
                    }
                  />
                  {category.name}
                </label>
              ))}
            </div>
          )}

          {scope === 'products' && (
            <div>
              <Input
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                label="Find products"
                placeholder="Search by name or SKU"
              />

              {(products.data || []).length > 0 && (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Checkbox
                    checked={
                      (products.data || []).length > 0 &&
                      (products.data || []).every((product) => selectedProducts.includes(product.id))
                    }
                    onChange={() => {
                      const ids = (products.data || []).map((product) => product.id);
                      const allSelected = ids.every((id) => selectedProducts.includes(id));
                      setSelectedProducts((current) =>
                        allSelected
                          ? current.filter((id) => !ids.includes(id))
                          : [...new Set([...current, ...ids])]
                      );
                    }}
                    label="Select all shown"
                  />
                  <span className="text-xs text-ink-500">
                    {selectedProducts.length} selected
                  </span>
                </div>
              )}

              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-ink-100 p-2">
                {(products.data || []).length === 0 ? (
                  <p className="px-2 py-3 text-sm text-ink-500">
                    {productQuery.length < 2
                      ? 'Type at least 2 characters to search products.'
                      : 'No products matched that search.'}
                  </p>
                ) : (
                  (products.data || []).map((product) => (
                    <div
                      key={product.id}
                      className="flex items-start gap-2.5 rounded-lg px-2 py-2 transition hover:bg-ink-50"
                    >
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onChange={() =>
                          setSelectedProducts((current) =>
                            current.includes(product.id)
                              ? current.filter((id) => id !== product.id)
                              : [...current, product.id]
                          )
                        }
                        className="mt-0.5"
                      />
                      <span className="min-w-0 text-sm">
                        <span className="block font-medium text-ink-800">{product.name}</span>
                        <span className="block text-xs text-ink-400">{product.sku}</span>
                      </span>
                    </div>
                  ))
                )}
              </div>

              {selectedProducts.length > 0 && (
                <p className="mt-2 text-xs text-ink-500">
                  {selectedProducts.length} product(s) will receive this coupon.
                </p>
              )}
            </div>
          )}

          <Switch checked={isActive} onChange={(next) => setValue('isActive', next)} label="Active" />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await adminCouponService.remove(deleteTarget.id);
            dispatch(pushToast('Coupon deleted', 'success'));
            setDeleteTarget(null);
            await reload();
          } catch (caught) {
            dispatch(pushToast(getErrorMessage(caught), 'error'));
          }
        }}
        title={`Delete ${deleteTarget?.code}?`}
        message="Customers will no longer be able to use this code."
        confirmLabel="Delete"
      />
    </div>
  );
};

export default Coupons;
