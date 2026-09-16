import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiExternalLink,
  FiImage,
  FiMousePointer,
  FiPlus,
  FiTrash2,
  FiUploadCloud,
} from 'react-icons/fi';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { adminBannerService, adminCategoryService, adminProductService } from '@/services/admin.service';
import { ApiError, getErrorMessage } from '@/lib/api';
import { formatDateTime, formatNumber } from '@/lib/format';
import {
  useAsync,
  useDebounce,
  useDocumentTitle,
  usePermissions,
  useQueryFilters,
} from '@/hooks';
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
  Skeleton,
  SmartImage,
  Switch,
  Textarea,
  type SelectOption,
} from '@/components/ui';
import type { Banner, BannerPlacement } from '@/types';

const PAGE_SIZE = 24;

/* Module scope: `useQueryFilters` memoises on this object identity. */
const BANNER_DEFAULTS = {
  page: '1',
  search: '',
  placement: '',
  status: '',
};

const PLACEMENTS: { value: BannerPlacement; label: string; description: string }[] = [
  {
    value: 'home_hero',
    label: 'Homepage hero',
    description: 'The large rotating carousel at the top of the homepage.',
  },
  {
    value: 'home_side',
    label: 'Homepage side panel',
    description: 'The tall panel sitting beside the hero carousel.',
  },
  {
    value: 'promo_strip',
    label: 'Promo strip',
    description: 'The row of small trust tiles under the hero, such as free delivery.',
  },
  {
    value: 'category_top',
    label: 'Category header',
    description: 'A wide banner across the top of category listing pages.',
  },
];

const PLACEMENT_OPTIONS: SelectOption[] = PLACEMENTS.map(({ value, label }) => ({ value, label }));

const PLACEMENT_LABELS = PLACEMENTS.reduce<Record<string, string>>((all, placement) => {
  all[placement.value] = placement.label;
  return all;
}, {});

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const SCHEDULE_TONES = {
  live: 'success',
  scheduled: 'info',
  expired: 'neutral',
} as const;

const SCHEDULE_LABELS = {
  live: 'Live now',
  scheduled: 'Scheduled',
  expired: 'Expired',
} as const;

/** `datetime-local` needs a local wall-clock string, not a UTC ISO string. */
const toLocalInput = (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const schema = z
  .object({
    title: z.string().trim().min(2, 'Give the banner a title').max(160, 'Title is too long'),
    subtitle: z.string().trim().max(240, 'Subtitle is too long'),
    linkType: z.enum(['none', 'category', 'product']),
    linkCategoryId: z.string(),
    linkProductId: z.string(),
    ctaLabel: z.string().trim().max(60, 'Keep the button label short'),
    placement: z.enum(['home_hero', 'home_side', 'promo_strip', 'category_top']),
    sortOrder: z
      .string()
      .trim()
      .refine((value) => value === '' || /^\d+$/.test(value), 'Use a whole number'),
    isActive: z.boolean(),
    startsAt: z.string(),
    endsAt: z.string(),
  })
  .refine(
    (values) =>
      !values.startsAt ||
      !values.endsAt ||
      new Date(values.endsAt).getTime() > new Date(values.startsAt).getTime(),
    { message: 'The end date must be after the start date', path: ['endsAt'] }
  )
  .refine((values) => values.linkType !== 'category' || Boolean(values.linkCategoryId), {
    message: 'Choose a category',
    path: ['linkCategoryId'],
  });

type FormValues = z.infer<typeof schema>;

const EMPTY_VALUES: FormValues = {
  title: '',
  subtitle: '',
  linkType: 'none',
  linkCategoryId: '',
  linkProductId: '',
  ctaLabel: '',
  placement: 'home_hero',
  sortOrder: '0',
  isActive: true,
  startsAt: '',
  endsAt: '',
};

const FORM_FIELDS = Object.keys(EMPTY_VALUES) as (keyof FormValues)[];

const isFormField = (field: string): field is keyof FormValues =>
  (FORM_FIELDS as string[]).includes(field);

interface UploadFieldProps {
  label: string;
  hint: string;
  current: string | null | undefined;
  file: File | null;
  onSelect: (file: File | null) => void;
}

const UploadField = ({ label, hint, current, file, onSelect }: UploadFieldProps) => {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-ink-700">{label}</p>

      {preview ? (
        <img
          src={preview}
          alt={`${label} preview`}
          className="aspect-[16/7] w-full rounded-lg border border-ink-100 object-cover"
        />
      ) : current ? (
        <SmartImage
          src={current}
          alt={`Current ${label.toLowerCase()}`}
          wrapperClassName="aspect-[16/7] w-full rounded-lg border border-ink-100"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[16/7] w-full items-center justify-center rounded-lg border border-dashed border-ink-200 bg-ink-50 text-ink-300">
          <FiImage size={24} />
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700 transition hover:bg-ink-50">
          <FiUploadCloud size={14} />
          {file ? 'Change file' : 'Choose file'}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => onSelect(event.target.files?.[0] || null)}
          />
        </label>

        {file && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onSelect(null)}>
            Clear
          </Button>
        )}
      </div>

      <p className="mt-1.5 text-xs text-ink-500">
        {current && !file ? `${hint} Uploading a new file replaces the current artwork.` : hint}
      </p>
    </div>
  );
};

interface BannerCardProps {
  banner: Banner;
  index: number;
  siblingCount: number;
  onEdit: (banner: Banner) => void;
  onDelete: (banner: Banner) => void;
  onMove: (direction: -1 | 1) => void;
  canUpdate: boolean;
  canDelete: boolean;
  reordering: boolean;
}

const BannerCard = ({
  banner,
  index,
  siblingCount,
  onEdit,
  onDelete,
  onMove,
  canUpdate,
  canDelete,
  reordering,
}: BannerCardProps) => {
  const schedule = banner.scheduleState;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index, 6) * 0.03 }}
      className="card overflow-hidden"
    >
      <SmartImage
        src={banner.image}
        alt={banner.title}
        wrapperClassName="aspect-[16/7] w-full"
        className="h-full w-full object-cover"
      />

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="brand">{PLACEMENT_LABELS[banner.placement] || banner.placement}</Badge>
          {schedule && <Badge tone={SCHEDULE_TONES[schedule]} dot>{SCHEDULE_LABELS[schedule]}</Badge>}
          {!banner.isActive && <Badge tone="neutral">Inactive</Badge>}
        </div>

        <h3 className="mt-2.5 truncate text-sm font-bold text-ink-900">{banner.title}</h3>
        {banner.subtitle && (
          <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{banner.subtitle}</p>
        )}

        <dl className="mt-3 space-y-1 text-xs text-ink-500">
          <div className="flex items-center gap-1.5">
            <FiMousePointer size={12} className="shrink-0 text-ink-400" />
            <dt className="sr-only">Clicks</dt>
            <dd>{formatNumber(banner.clickCount)} clicks · position #{banner.sortOrder}</dd>
          </div>

          {banner.linkUrl && (
            <div className="flex items-center gap-1.5">
              <FiExternalLink size={12} className="shrink-0 text-ink-400" />
              <dt className="sr-only">Link</dt>
              <dd className="truncate">
                {banner.linkUrl}
                {banner.ctaLabel ? ` · “${banner.ctaLabel}”` : ''}
              </dd>
            </div>
          )}

          {(banner.startsAt || banner.endsAt) && (
            <div>
              <dt className="sr-only">Schedule</dt>
              <dd>
                {banner.startsAt ? formatDateTime(banner.startsAt) : 'Always'} →{' '}
                {banner.endsAt ? formatDateTime(banner.endsAt) : 'no end date'}
              </dd>
            </div>
          )}
        </dl>

        {(canUpdate || canDelete) && (
          <div className="mt-3 flex items-center gap-1 border-t border-ink-100 pt-3">
            {canUpdate && (
              <>
                <button
                  type="button"
                  onClick={() => onMove(-1)}
                  disabled={index === 0 || reordering}
                  aria-label={`Move ${banner.title} up`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 disabled:opacity-30"
                >
                  <FiChevronUp size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(1)}
                  disabled={index === siblingCount - 1 || reordering}
                  aria-label={`Move ${banner.title} down`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 disabled:opacity-30"
                >
                  <FiChevronDown size={15} />
                </button>

                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={() => onEdit(banner)}
                  leftIcon={<FiEdit2 size={13} />}
                >
                  Edit
                </Button>
              </>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(banner)}
                aria-label={`Delete ${banner.title}`}
                className={
                  canUpdate
                    ? 'flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-rose-50 hover:text-rose-600'
                    : 'ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-rose-50 hover:text-rose-600'
                }
              >
                <FiTrash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
};

const Banners = () => {
  useDocumentTitle('Banners');

  const dispatch = useAppDispatch();
  const { can } = usePermissions();
  const { filters, setFilter, resetFilters } = useQueryFilters(BANNER_DEFAULTS);

  const [searchTerm, setSearchTerm] = useState(filters.search);
  const debouncedSearch = useDebounce(searchTerm.trim(), 400);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);
  const [reordering, setReordering] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const productQuery = useDebounce(productSearch, 300);

  const canCreate = can('banners:create');
  const canUpdate = can('banners:update');
  const canDelete = can('banners:delete');

  useEffect(() => {
    if (debouncedSearch !== filters.search) setFilter({ search: debouncedSearch });
  }, [debouncedSearch, filters.search, setFilter]);

  const page = Number(filters.page) || 1;

  const { data, loading, error, reload } = useAsync(
    () =>
      adminBannerService.list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        placement: filters.placement || undefined,
        status: filters.status || undefined,
      }),
    [page, debouncedSearch, filters.placement, filters.status]
  );

  const banners = data?.data || [];
  const meta = data?.meta;

  const categoryTree = useAsync(async () => (await adminCategoryService.tree()).data, []);
  const productHits = useAsync(
    async () =>
      productQuery.length < 2
        ? []
        : (await adminProductService.list({ search: productQuery, limit: 8 })).data,
    [productQuery]
  );

  const categoryOptions: SelectOption[] = useMemo(() => {
    const rows: SelectOption[] = [];
    (categoryTree.data || []).forEach((root) => {
      rows.push({ value: root.id, label: root.name });
      (root.children || []).forEach((child) =>
        rows.push({ value: child.id, label: `${root.name} / ${child.name}` })
      );
    });
    return rows;
  }, [categoryTree.data]);

  const grouped = useMemo(
    () =>
      PLACEMENTS.map((placement) => ({
        ...placement,
        banners: banners
          .filter((banner) => banner.placement === placement.value)
          .sort((left, right) => left.sortOrder - right.sortOrder),
      })).filter((group) => group.banners.length > 0),
    [banners]
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_VALUES });

  const openCreate = () => {
    setEditing(null);
    setImageFile(null);
    setMobileImageFile(null);
    reset({
      ...EMPTY_VALUES,
      placement: (filters.placement as BannerPlacement) || 'home_hero',
    });
    setProductSearch('');
    setSelectedProducts([]);
    setEditorOpen(true);
  };

  const openEdit = (banner: Banner) => {
    setEditing(banner);
    setImageFile(null);
    setMobileImageFile(null);
    const productIds =
      banner.linkProductIds && banner.linkProductIds.length
        ? banner.linkProductIds
        : banner.linkProductId
          ? [banner.linkProductId]
          : [];
    reset({
      title: banner.title,
      subtitle: banner.subtitle || '',
      linkType: banner.linkType || 'none',
      linkCategoryId: banner.linkCategoryId ? String(banner.linkCategoryId) : '',
      linkProductId: productIds[0] ? String(productIds[0]) : '',
      ctaLabel: banner.ctaLabel || '',
      placement: banner.placement,
      sortOrder: String(banner.sortOrder),
      isActive: banner.isActive,
      startsAt: toLocalInput(banner.startsAt),
      endsAt: toLocalInput(banner.endsAt),
    });
    setSelectedProducts(productIds);
    setProductSearch('');
    setEditorOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    if (values.linkType === 'product' && selectedProducts.length === 0) {
      setError('linkProductId', { type: 'manual', message: 'Choose at least one product' });
      return;
    }

    const payload: Record<string, unknown> = {
      title: values.title,
      subtitle: values.subtitle,
      linkType: values.linkType,
      linkCategoryId: values.linkType === 'category' ? values.linkCategoryId : '',
      linkProductIds:
        values.linkType === 'product' ? JSON.stringify(selectedProducts) : '',
      linkProductId:
        values.linkType === 'product' && selectedProducts[0] ? String(selectedProducts[0]) : '',
      ctaLabel: values.ctaLabel,
      placement: values.placement,
      isActive: values.isActive,
    };

    if (values.sortOrder !== '') payload.sortOrder = Number(values.sortOrder);
    if (values.startsAt) payload.startsAt = new Date(values.startsAt).toISOString();
    if (values.endsAt) payload.endsAt = new Date(values.endsAt).toISOString();

    try {
      if (editing) {
        await adminBannerService.update(editing.id, payload, {
          image: imageFile,
          mobileImage: mobileImageFile,
        });
        dispatch(pushToast(`${values.title} updated`, 'success'));
      } else {
        await adminBannerService.create(payload, {
          image: imageFile,
          mobileImage: mobileImageFile,
        });
        dispatch(pushToast(`${values.title} created`, 'success'));
      }

      setEditorOpen(false);
      setImageFile(null);
      setMobileImageFile(null);
      await reload();
    } catch (caught) {
      if (caught instanceof ApiError && caught.fieldErrors.length) {
        caught.fieldErrors.forEach(({ field, message }) => {
          if (isFormField(field)) setError(field, { type: 'server', message });
        });
      }
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    }
  };

  const handleMove = async (siblings: Banner[], index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= siblings.length) return;

    const next = [...siblings];
    [next[index], next[target]] = [next[target], next[index]];

    setReordering(true);
    try {
      await adminBannerService.reorder(
        next.map((banner, position) => ({ id: banner.id, sortOrder: position + 1 }))
      );
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setReordering(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await adminBannerService.remove(deleteTarget.id);
      dispatch(pushToast(`${deleteTarget.title} deleted`, 'success'));
      setDeleteTarget(null);
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = (['search', 'placement', 'status'] as const).filter(
    (key) => filters[key] !== BANNER_DEFAULTS[key]
  ).length;

  const isActive = watch('isActive');

  return (
    <div>
      <PageHeader
        title="Banners"
        description="The artwork and offers that greet shoppers on the storefront."
        breadcrumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Banners' }]}
        actions={
          canCreate && (
            <Button onClick={openCreate} leftIcon={<FiPlus size={16} />}>
              New banner
            </Button>
          )
        }
      />

      <FilterToolbar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search banner titles…"
        activeCount={activeCount}
        onReset={() => {
          setSearchTerm('');
          resetFilters();
        }}
      >
        <Select
          aria-label="Filter by placement"
          options={PLACEMENT_OPTIONS}
          placeholder="All placements"
          value={filters.placement}
          onChange={(event) => setFilter({ placement: event.target.value })}
          className="h-10 w-full py-0 text-sm sm:w-48"
        />
        <Select
          aria-label="Filter by status"
          options={STATUS_OPTIONS}
          placeholder="Any status"
          value={filters.status}
          onChange={(event) => setFilter({ status: event.target.value })}
          className="h-10 w-full py-0 text-sm sm:w-36"
        />
      </FilterToolbar>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-72 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="card">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : banners.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<FiImage size={22} />}
            title="No banners match these filters"
            message="Banners control the homepage hero, the side panel and the promo tiles."
            action={canCreate ? { label: 'New banner', onClick: openCreate } : undefined}
          />
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <section key={group.value}>
              <header className="mb-3">
                <h2 className="text-base font-bold text-ink-900">{group.label}</h2>
                <p className="text-sm text-ink-500">{group.description}</p>
              </header>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.banners.map((banner, index) => (
                  <BannerCard
                    key={banner.id}
                    banner={banner}
                    index={index}
                    siblingCount={group.banners.length}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                    onMove={(direction) => void handleMove(group.banners, index, direction)}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    reordering={reordering}
                  />
                ))}
              </div>
            </section>
          ))}

          <Pagination meta={meta} onPageChange={(next) => setFilter({ page: next }, false)} />
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        size="lg"
        title={editing ? `Edit ${editing.title}` : 'New banner'}
        description="Artwork, copy and the window it should be visible for."
        footer={
          <>
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button form="banner-form" type="submit" loading={isSubmitting}>
              {editing ? 'Save changes' : 'Create banner'}
            </Button>
          </>
        }
      >
        <form id="banner-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Input
            {...register('title')}
            label="Title"
            required
            placeholder="Banner title"
            error={errors.title?.message}
          />

          <Textarea
            {...register('subtitle')}
            label="Subtitle"
            rows={2}
            error={errors.subtitle?.message}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              {...register('linkType')}
              label="Link to"
              options={[
                { value: 'none', label: 'No link' },
                { value: 'category', label: 'A category' },
                { value: 'product', label: 'A product' },
              ]}
            />
            <Input
              {...register('ctaLabel')}
              label="Button label"
              error={errors.ctaLabel?.message}
            />

            {watch('linkType') === 'category' && (
              <Select
                {...register('linkCategoryId')}
                label="Category"
                options={categoryOptions}
                placeholder="Choose a category"
                error={errors.linkCategoryId?.message}
              />
            )}

            {watch('linkType') === 'product' && (
              <div className="sm:col-span-2">
                <Input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  label="Find products"
                  placeholder="Type a name or SKU"
                />
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-ink-100 p-2">
                  {(productHits.data || []).map((product) => (
                    <label
                      key={product.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-ink-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() =>
                          setSelectedProducts((current) =>
                            current.includes(product.id)
                              ? current.filter((id) => id !== product.id)
                              : [...current, product.id]
                          )
                        }
                      />
                      {product.name}
                    </label>
                  ))}
                </div>
                {selectedProducts.length > 0 && (
                  <p className="mt-1 text-xs text-ink-500">
                    {selectedProducts.length} product(s) selected
                  </p>
                )}
                {errors.linkProductId?.message && (
                  <p className="mt-1 text-xs font-medium text-brand-600">
                    {errors.linkProductId.message}
                  </p>
                )}
              </div>
            )}

            <Select
              {...register('placement')}
              label="Placement"
              options={PLACEMENT_OPTIONS}
              hint={
                PLACEMENTS.find((entry) => entry.value === watch('placement'))?.description
              }
              error={errors.placement?.message}
            />
            <Input
              {...register('sortOrder')}
              label="Sort order"
              inputMode="numeric"
              hint="Lower numbers show first within the placement."
              error={errors.sortOrder?.message}
            />

            <Input
              {...register('startsAt')}
              type="datetime-local"
              label="Starts at"
              hint="Leave blank to go live immediately."
              error={errors.startsAt?.message}
            />
            <Input
              {...register('endsAt')}
              type="datetime-local"
              label="Ends at"
              hint="Must be after the start date. Blank means no end date."
              error={errors.endsAt?.message}
            />
          </div>

          <div className="grid gap-4 border-t border-ink-100 pt-4 sm:grid-cols-2">
            <UploadField
              label="Desktop artwork"
              hint="Wide image, roughly 1600 × 700."
              current={editing?.image}
              file={imageFile}
              onSelect={setImageFile}
            />
            <UploadField
              label="Mobile artwork"
              hint="Taller crop for small screens. Optional."
              current={editing?.mobileImage}
              file={mobileImageFile}
              onSelect={setMobileImageFile}
            />
          </div>

          <div className="border-t border-ink-100 pt-4">
            <Switch
              checked={isActive}
              onChange={(next) => setValue('isActive', next, { shouldDirty: true })}
              label="Active"
              description="Inactive banners stay hidden even inside their schedule."
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete ${deleteTarget?.title || 'this banner'}?`}
        message="The artwork and its click stats are removed for good. To hide it temporarily, switch it to inactive instead."
        confirmLabel="Delete banner"
      />
    </div>
  );
};

export default Banners;
