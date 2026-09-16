import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiAlertCircle,
  FiChevronDown,
  FiChevronRight,
  FiChevronUp,
  FiEdit2,
  FiInfo,
  FiLayers,
  FiPlus,
  FiStar,
  FiTrash2,
  FiUploadCloud,
  FiFolder,
} from 'react-icons/fi';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { adminCategoryService } from '@/services/admin.service';
import { ApiError, getErrorMessage } from '@/lib/api';
import { formatNumber, assetUrl } from '@/lib/format';
import cn from '@/lib/cn';
import { useAsync, useDocumentTitle, usePermissions } from '@/hooks';
import { PageHeader, ImagePicker } from '@/components/admin';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  Skeleton,
  SmartImage,
  Switch,
  Textarea,
  type SelectOption,
  Select,
} from '@/components/ui';
import type { Category } from '@/types';

const schema = z.object({
  name: z.string().trim().min(2, 'Give the category a name').max(120, 'Name is too long'),
  description: z.string().trim().max(500, 'Keep the description under 500 characters'),
  parentId: z.string(),
  sortOrder: z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d+$/.test(value), 'Use a whole number'),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const EMPTY_VALUES: FormValues = {
  name: '',
  description: '',
  parentId: '',
  sortOrder: '0',
  isActive: true,
  isFeatured: false,
};

const FORM_FIELDS = Object.keys(EMPTY_VALUES) as (keyof FormValues)[];

const isFormField = (field: string): field is keyof FormValues =>
  (FORM_FIELDS as string[]).includes(field);

interface RowProps {
  category: Category;
  depth: number;
  index: number;
  siblingCount: number;
  expanded?: boolean;
  onToggle?: () => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onMove: (direction: -1 | 1) => void;
  canUpdate: boolean;
  canDelete: boolean;
  reordering: boolean;
}

const CategoryRow = ({
  category,
  depth,
  index,
  siblingCount,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onMove,
  canUpdate,
  canDelete,
  reordering,
}: RowProps) => {
  const childCount = (category.children || []).length;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 px-3 py-3 sm:px-4',
        depth > 0 && 'bg-ink-50/60 pl-8 sm:pl-14'
      )}
    >
      {depth === 0 ? (
        <button
          type="button"
          onClick={onToggle}
          disabled={childCount === 0}
          aria-label={expanded ? `Collapse ${category.name}` : `Expand ${category.name}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 disabled:opacity-0"
        >
          {expanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
        </button>
      ) : (
        <span className="h-7 w-2 shrink-0" />
      )}

      <SmartImage
        src={category.image}
        alt={category.name}
        wrapperClassName={cn('shrink-0 rounded-lg border border-ink-100', depth > 0 ? 'h-9 w-9' : 'h-11 w-11')}
        className="h-full w-full object-cover"
      />

      <div className="min-w-0 flex-1">
        <p className={cn('truncate font-semibold text-ink-900', depth > 0 ? 'text-sm' : 'text-[15px]')}>
          {category.name}
        </p>
        <p className="truncate text-xs text-ink-400">
          /{category.slug}
          {childCount > 0 && ` · ${childCount} sub-categor${childCount === 1 ? 'y' : 'ies'}`}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <Badge tone="neutral">{formatNumber(category.productCount)} products</Badge>
        <Badge tone={category.isActive ? 'success' : 'neutral'} dot>
          {category.isActive ? 'Active' : 'Hidden'}
        </Badge>
        {category.isFeatured && (
          <Badge tone="brand">
            <FiStar size={11} />
            Featured
          </Badge>
        )}
        <span className="hidden text-xs text-ink-400 sm:inline">#{category.sortOrder}</span>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {canUpdate && (
          <>
            <button
              type="button"
              onClick={() => onMove(-1)}
              disabled={index === 0 || reordering}
              aria-label={`Move ${category.name} up`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 disabled:opacity-30"
            >
              <FiChevronUp size={15} />
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              disabled={index === siblingCount - 1 || reordering}
              aria-label={`Move ${category.name} down`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 disabled:opacity-30"
            >
              <FiChevronDown size={15} />
            </button>
            <button
              type="button"
              onClick={() => onEdit(category)}
              aria-label={`Edit ${category.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
            >
              <FiEdit2 size={14} />
            </button>
          </>
        )}

        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(category)}
            aria-label={`Delete ${category.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <FiTrash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

const Categories = () => {
  useDocumentTitle('Categories');

  const dispatch = useAppDispatch();
  const { can } = usePermissions();

  const { data, loading, error, reload } = useAsync(
    async () => (await adminCategoryService.tree()).data,
    []
  );

  const roots = data || [];

  const [expanded, setExpanded] = useState<number[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [clearImage, setClearImage] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [kind, setKind] = useState<'parent' | 'child'>('parent');

  const canCreate = can('categories:create');
  const canUpdate = can('categories:update');
  const canDelete = can('categories:delete');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_VALUES });

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }

    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const editingChildCount = editing ? (editing.children || []).length : 0;

  // Only roots can be parents, and a category can never parent itself.
  const parentOptions = useMemo<SelectOption[]>(
    () =>
      roots
        .filter((root) => root.id !== editing?.id)
        .map((root) => ({ value: root.id, label: root.name })),
    [roots, editing?.id]
  );

  const openCreate = () => {
    setEditing(null);
    setImageFile(null);
    setImageUrl(null);
    setClearImage(false);
    setKind('parent');
    reset(EMPTY_VALUES);
    setEditorOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setImageFile(null);
    setImageUrl(null);
    setClearImage(false);
    setKind(category.parentId ? 'child' : 'parent');
    reset({
      name: category.name,
      description: category.description || '',
      parentId: category.parentId ? String(category.parentId) : '',
      sortOrder: String(category.sortOrder),
      isActive: category.isActive,
      isFeatured: category.isFeatured,
    });
    setEditorOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const payload: Record<string, unknown> = {
      name: values.name,
      description: values.description,
      isActive: values.isActive,
      isFeatured: values.isFeatured,
    };

    if (values.sortOrder !== '') payload.sortOrder = Number(values.sortOrder);
    payload.parentId = kind === 'child' && values.parentId !== '' ? Number(values.parentId) : null;

    try {
      const imageOptions = {
        imageUrl: imageFile ? null : imageUrl,
        clearImage: editing ? clearImage : undefined,
      };

      if (editing) {
        await adminCategoryService.update(editing.id, payload, imageFile, imageOptions);
        dispatch(pushToast(`${values.name} updated`, 'success'));
      } else {
        await adminCategoryService.create(payload, imageFile, imageOptions);
        dispatch(pushToast(`${values.name} created`, 'success'));
      }

      setEditorOpen(false);
      setImageFile(null);
      setImageUrl(null);
      setClearImage(false);
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

  const handleMove = async (siblings: Category[], index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= siblings.length) return;

    const next = [...siblings];
    [next[index], next[target]] = [next[target], next[index]];

    setReordering(true);
    try {
      await adminCategoryService.reorder(
        next.map((category, position) => ({ id: category.id, sortOrder: position + 1 }))
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
    setDeleteError(null);
    try {
      await adminCategoryService.remove(deleteTarget.id);
      dispatch(pushToast(`${deleteTarget.name} deleted`, 'success'));
      setDeleteTarget(null);
      await reload();
    } catch (caught) {
      // A 409 means it still holds products or sub-categories: keep the dialog
      // open so the owner can read exactly what is blocking the delete.
      setDeleteError(getErrorMessage(caught));
    } finally {
      setDeleting(false);
    }
  };

  const isActive = watch('isActive');
  const isFeatured = watch('isFeatured');

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Group the catalogue so shoppers can browse by console, genre or accessory."
        breadcrumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Categories' }]}
        actions={
          canCreate && (
            <span className="flex flex-wrap items-center gap-2">
              <Link to="/admin/categories/import">
                <Button variant="outline" leftIcon={<FiUploadCloud size={15} />}>
                  Import
                </Button>
              </Link>
              <Button onClick={openCreate} leftIcon={<FiPlus size={16} />}>
                New category
              </Button>
            </span>
          )
        }
      />

      <p className="mb-4 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <FiInfo className="mt-0.5 shrink-0" size={15} />
        <span>
          Categories nest one level deep, so a sub-category cannot have children of its own. Only
          top-level categories marked <strong>Featured</strong> appear on the storefront homepage.
        </span>
      </p>

      {loading ? (
        <div className="card divide-y divide-ink-100">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 p-4">
              <Skeleton className="h-11 w-11 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : roots.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<FiLayers size={22} />}
            title="No categories yet"
            message="Add your first category, such as “Nintendo 64” or “Controllers”."
            action={canCreate ? { label: 'New category', onClick: openCreate } : undefined}
          />
        </div>
      ) : (
        <div className="card divide-y divide-ink-100 overflow-hidden">
          {roots.map((root, rootIndex) => {
            const children = root.children || [];
            const isOpen = expanded.includes(root.id);

            return (
              <div key={root.id}>
                <CategoryRow
                  category={root}
                  depth={0}
                  index={rootIndex}
                  siblingCount={roots.length}
                  expanded={isOpen}
                  onToggle={() =>
                    setExpanded((current) =>
                      current.includes(root.id)
                        ? current.filter((entry) => entry !== root.id)
                        : [...current, root.id]
                    )
                  }
                  onEdit={openEdit}
                  onDelete={(category) => {
                    setDeleteError(null);
                    setDeleteTarget(category);
                  }}
                  onMove={(direction) => void handleMove(roots, rootIndex, direction)}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  reordering={reordering}
                />

                <AnimatePresence initial={false}>
                  {isOpen && children.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-ink-100"
                    >
                      <div className="divide-y divide-ink-100">
                        {children.map((child, childIndex) => (
                          <CategoryRow
                            key={child.id}
                            category={child}
                            depth={1}
                            index={childIndex}
                            siblingCount={children.length}
                            onEdit={openEdit}
                            onDelete={(category) => {
                              setDeleteError(null);
                              setDeleteTarget(category);
                            }}
                            onMove={(direction) => void handleMove(children, childIndex, direction)}
                            canUpdate={canUpdate}
                            canDelete={canDelete}
                            reordering={reordering}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'New category'}
        description={
          editing
            ? 'Changes appear on the storefront straight away.'
            : 'Create a parent category, or nest it one level under an existing parent.'
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button form="category-form" type="submit" loading={isSubmitting}>
              {editing ? 'Save changes' : 'Create category'}
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Input
            {...register('name')}
            label="Name"
            required
            placeholder="Nintendo 64"
            error={errors.name?.message}
          />

          <Textarea
            {...register('description')}
            label="Description"
            rows={3}
            placeholder="Cartridges, consoles and controllers for the N64."
            error={errors.description?.message}
          />

          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-700">Category type</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setKind('parent');
                  setValue('parentId', '');
                }}
                disabled={editingChildCount > 0}
                className={cn(
                  'rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition',
                  kind === 'parent'
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-ink-200 text-ink-600 hover:bg-ink-50'
                )}
              >
                Parent category
                <span className="mt-0.5 block text-xs font-normal text-ink-500">
                  Shows on the homepage when featured
                </span>
              </button>
              <button
                type="button"
                onClick={() => setKind('child')}
                disabled={editingChildCount > 0}
                className={cn(
                  'rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition',
                  kind === 'child'
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-ink-200 text-ink-600 hover:bg-ink-50'
                )}
              >
                Sub-category
                <span className="mt-0.5 block text-xs font-normal text-ink-500">
                  Nested under a parent
                </span>
              </button>
            </div>
          </div>

          {kind === 'child' && (
            <Select
              value={watch('parentId')}
              {...register('parentId')}
              label="Parent category"
              required
              options={parentOptions}
              placeholder="Choose a parent"
              disabled={editingChildCount > 0}
              hint="Only top-level categories can be chosen as a parent."
              error={errors.parentId?.message}
            />
          )}

          <Input
            {...register('sortOrder')}
            label="Sort order"
            inputMode="numeric"
            hint="Lower numbers appear first. You can also reorder with the arrows in the list."
            error={errors.sortOrder?.message}
          />

          <div>
            <p className="mb-1.5 block text-sm font-medium text-ink-700">Image</p>
            <div className="flex flex-wrap items-center gap-3">
              {imagePreview || imageUrl ? (
                <img
                  src={imagePreview || assetUrl(imageUrl) || undefined}
                  alt="Selected category artwork"
                  className="h-16 w-16 shrink-0 rounded-lg border border-ink-100 object-cover"
                />
              ) : (
                <SmartImage
                  src={clearImage ? null : editing?.image}
                  alt={editing?.name || 'Category image'}
                  wrapperClassName="h-16 w-16 shrink-0 rounded-lg border border-ink-100"
                  className="h-full w-full object-cover"
                />
              )}

              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50">
                <FiUploadCloud size={15} />
                Upload from computer
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setImageFile(file);
                    setImageUrl(null);
                    setClearImage(false);
                  }}
                />
              </label>

              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<FiFolder size={14} />}
                onClick={() => setPickerOpen(true)}
              >
                Choose from uploads
              </Button>

              {(imageFile ||
                imageUrl ||
                imagePreview ||
                (!clearImage && editing?.image)) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setImageFile(null);
                    setImageUrl(null);
                    if (editing?.image) setClearImage(true);
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
            {editing?.image && !imageFile && !imageUrl && !clearImage && (
              <p className="mt-1.5 text-xs text-ink-500">
                Uploading or choosing a new image replaces the current one.
              </p>
            )}
          </div>

          <div className="space-y-4 border-t border-ink-100 pt-4">
            <Switch
              checked={isActive}
              onChange={(next) => setValue('isActive', next, { shouldDirty: true })}
              label="Active"
              description="Hidden categories disappear from the storefront menus."
            />
            <Switch
              checked={isFeatured}
              onChange={(next) => setValue('isFeatured', next, { shouldDirty: true })}
              label="Featured"
              description="Featured top-level categories are shown on the homepage."
            />
          </div>
        </form>
      </Modal>

      <ImagePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(urls) => {
          const url = urls[0];
          if (!url) return;
          setImageFile(null);
          setImageUrl(url);
          setClearImage(false);
        }}
        defaultFolder="categories"
        title="Choose category image"
        description="Pick an image already stored in uploads, or upload a new file from your computer."
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete ${deleteTarget?.name || 'this category'}?`}
        message={
          <>
            <p>
              A category can only be deleted once it holds no products and no sub-categories. Move
              them somewhere else first.
            </p>

            {deleteError && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">
                <FiAlertCircle className="mt-0.5 shrink-0" size={14} />
                {deleteError}
              </p>
            )}
          </>
        }
        confirmLabel="Delete category"
      />
    </div>
  );
};

export default Categories;
