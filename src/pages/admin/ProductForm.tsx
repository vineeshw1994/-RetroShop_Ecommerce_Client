import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  FiArrowLeft,
  FiCopy,
  FiEye,
  FiFolder,
  FiImage,
  FiSave,
  FiStar,
  FiTrash2,
  FiTrendingUp,
  FiUploadCloud,
  FiX,
} from 'react-icons/fi';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { adminCategoryService, adminProductService } from '@/services/admin.service';
import { ApiError, getErrorMessage } from '@/lib/api';
import { CONDITION_LABELS, assetUrl, formatDateTime, formatNumber, formatPrice } from '@/lib/format';
import cn from '@/lib/cn';
import { useAsync, useDocumentTitle } from '@/hooks';
import { PageHeader, ImagePicker } from '@/components/admin';
import {
  Badge,
  Button,
  Input,
  Select,
  Skeleton,
  SmartImage,
  Switch,
  Textarea,
  type SelectOption,
} from '@/components/ui';
import type { Category, InventoryLog, ProductCondition, ProductImage } from '@/types';

const MAX_IMAGES = 8;
const SHORT_DESCRIPTION_LIMIT = 300;

const CONDITION_OPTIONS: SelectOption[] = (
  Object.keys(CONDITION_LABELS) as ProductCondition[]
).map((condition) => ({ value: condition, label: CONDITION_LABELS[condition] }));

const LOG_TONES: Record<InventoryLog['type'], 'success' | 'info' | 'warning' | 'neutral' | 'danger'> = {
  restock: 'success',
  sale: 'info',
  adjustment: 'warning',
  return: 'neutral',
  cancellation: 'danger',
};

const decimal = (message: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) => value === '' || (/^\d+(\.\d{1,2})?$/.test(value) && Number(value) >= 0),
      message
    );

const wholeNumber = (message: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d+$/.test(value), message);

const schema = z
  .object({
    name: z.string().trim().min(2, 'Give the product a name').max(180, 'Name is too long'),
    sku: z.string().trim().min(1, 'A unique SKU is required').max(64, 'SKU is too long'),
    categoryId: z.string().min(1, 'Choose a category'),
    brand: z.string().trim().max(120, 'Brand is too long'),
    platform: z.string().trim().max(120, 'Platform is too long'),
    condition: z.enum(['new', 'like_new', 'very_good', 'good', 'fair']),
    price: decimal('Enter a price, for example 24.99').refine(
      (value) => value !== '',
      'A price is required'
    ),
    salePrice: decimal('Enter a valid sale price'),
    costPrice: decimal('Enter a valid cost price'),
    tradeInPrice: decimal('Enter a valid trade-in price'),
    stock: wholeNumber('Stock must be a whole number'),
    lowStockThreshold: wholeNumber('Use a whole number'),
    warrantyMonths: wholeNumber('Use a whole number of months'),
    stockNote: z.string().trim().max(240, 'Keep the note short'),
    shortDescription: z
      .string()
      .trim()
      .max(SHORT_DESCRIPTION_LIMIT, `Keep this under ${SHORT_DESCRIPTION_LIMIT} characters`),
    description: z.string().trim(),
    metaTitle: z.string().trim().max(180, 'Meta title is too long'),
    metaDescription: z.string().trim().max(300, 'Meta description is too long'),
    isActive: z.boolean(),
    isFeatured: z.boolean(),
  })
  .refine(
    (values) =>
      values.salePrice === '' ||
      values.price === '' ||
      Number(values.salePrice) < Number(values.price),
    { message: 'The sale price must be below the regular price', path: ['salePrice'] }
  );

type FormValues = z.infer<typeof schema>;

const EMPTY_VALUES: FormValues = {
  name: '',
  sku: '',
  categoryId: '',
  brand: '',
  platform: '',
  condition: 'good',
  price: '',
  salePrice: '',
  costPrice: '',
  tradeInPrice: '',
  stock: '0',
  lowStockThreshold: '3',
  warrantyMonths: '0',
  stockNote: '',
  shortDescription: '',
  description: '',
  metaTitle: '',
  metaDescription: '',
  isActive: true,
  isFeatured: false,
};

const FORM_FIELDS = Object.keys(EMPTY_VALUES) as (keyof FormValues)[];

const isFormField = (field: string): field is keyof FormValues =>
  (FORM_FIELDS as string[]).includes(field);

const toCategoryOptions = (roots: Category[]): SelectOption[] =>
  roots.flatMap((root) => [
    { value: root.id, label: root.name },
    ...(root.children || []).map((child) => ({ value: child.id, label: `— ${child.name}` })),
  ]);

const numberToField = (value: number | null | undefined) =>
  value === null || value === undefined ? '' : String(value);

interface ImageDraft {
  file?: File;
  preview: string;
  existingUrl?: string;
}

const ProductForm = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const productId = Number(id);

  useDocumentTitle(isEdit ? 'Edit product' : 'New product');

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [drafts, setDrafts] = useState<ImageDraft[]>([]);
  const [cardImageFile, setCardImageFile] = useState<File | null>(null);
  const [cardImagePreview, setCardImagePreview] = useState<string | null>(null);
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [clearCardImage, setClearCardImage] = useState(false);
  const [pickerOpen, setPickerOpen] = useState<'card' | 'gallery' | null>(null);
  const [dragging, setDragging] = useState(false);
  const [imagePending, setImagePending] = useState(false);
  const [cloning, setCloning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep the latest previews reachable from the unmount cleanup.
  const previewsRef = useRef<string[]>([]);
  previewsRef.current = drafts.map((draft) => draft.preview);

  useEffect(
    () => () => previewsRef.current.forEach((preview) => URL.revokeObjectURL(preview)),
    []
  );

  const categories = useAsync(async () => (await adminCategoryService.tree()).data, []);

  const detail = useAsync(
    async () => (isEdit ? (await adminProductService.get(productId)).data : null),
    [productId, isEdit]
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

  const product = detail.data?.product;

  useEffect(() => {
    if (!product) return;

    reset({
      name: product.name,
      sku: product.sku,
      categoryId: String(product.categoryId),
      brand: product.brand || '',
      platform: product.platform || '',
      condition: product.condition,
      price: numberToField(product.price),
      salePrice: numberToField(product.salePrice),
      costPrice: numberToField(product.costPrice),
      tradeInPrice: numberToField(product.tradeInPrice),
      stock: numberToField(product.stock),
      lowStockThreshold: numberToField(product.lowStockThreshold),
      warrantyMonths: numberToField(product.warrantyMonths),
      stockNote: '',
      shortDescription: product.shortDescription || '',
      description: product.description || '',
      metaTitle: product.metaTitle || '',
      metaDescription: product.metaDescription || '',
      isActive: product.isActive,
      isFeatured: product.isFeatured,
    });
  }, [product, reset]);

  const categoryOptions = useMemo(
    () => toCategoryOptions(categories.data || []),
    [categories.data]
  );

  const existingImages: ProductImage[] = product?.images || [];
  const remainingSlots = Math.max(0, MAX_IMAGES - existingImages.length - drafts.length);

  const price = Number(watch('price')) || 0;
  const salePriceValue = watch('salePrice');
  const salePrice = Number(salePriceValue) || 0;
  const costPrice = Number(watch('costPrice')) || 0;
  const shortDescription = watch('shortDescription');
  const isActive = watch('isActive');
  const isFeatured = watch('isFeatured');

  const discounted = salePriceValue !== '' && salePrice > 0 && salePrice < price;
  const customerPays = discounted ? salePrice : price;
  const savePercent = discounted && price > 0 ? Math.round(((price - salePrice) / price) * 100) : 0;
  const marginPercent =
    costPrice > 0 && customerPays > 0
      ? Math.round(((customerPays - costPrice) / customerPays) * 100)
      : null;

  const addFiles = (incoming: FileList | null) => {
    if (!incoming?.length) return;

    const images = Array.from(incoming).filter((file) => file.type.startsWith('image/'));
    if (!images.length) {
      dispatch(pushToast('Only image files can be uploaded', 'error'));
      return;
    }

    if (images.length > remainingSlots) {
      dispatch(
        pushToast(`A product can hold ${MAX_IMAGES} images, so only some were added`, 'warning')
      );
    }

    setDrafts((current) => [
      ...current,
      ...images.slice(0, remainingSlots).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      })),
    ]);
  };

  const addExistingUrls = (urls: string[]) => {
    const known = new Set([
      ...existingImages.map((image) => image.url),
      ...drafts.map((draft) => draft.existingUrl).filter(Boolean),
    ]);

    const fresh = urls.filter((url) => !known.has(url));
    if (!fresh.length) return;

    if (fresh.length > remainingSlots) {
      dispatch(
        pushToast(`A product can hold ${MAX_IMAGES} images, so only some were added`, 'warning')
      );
    }

    setDrafts((current) => [
      ...current,
      ...fresh.slice(0, remainingSlots).map((url) => ({
        existingUrl: url,
        preview: assetUrl(url) || url,
      })),
    ]);
  };

  const removeDraft = (preview: string) => {
    const draft = drafts.find((entry) => entry.preview === preview);
    if (draft?.file) URL.revokeObjectURL(preview);
    setDrafts((current) => current.filter((entry) => entry.preview !== preview));
  };

  const clearCardImageSelection = () => {
    if (cardImagePreview) URL.revokeObjectURL(cardImagePreview);
    setCardImageFile(null);
    setCardImagePreview(null);
    setCardImageUrl(null);
    if (isEdit && product?.cardImage) setClearCardImage(true);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const handleSetPrimary = async (imageId: number) => {
    setImagePending(true);
    try {
      await adminProductService.setPrimaryImage(productId, imageId);
      dispatch(pushToast('Cover image updated', 'success'));
      await detail.reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setImagePending(false);
    }
  };

  const handleRemoveImage = async (imageId: number) => {
    setImagePending(true);
    try {
      await adminProductService.removeImage(productId, imageId);
      dispatch(pushToast('Image removed', 'success'));
      await detail.reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setImagePending(false);
    }
  };

  const handleClone = async () => {
    if (!isEdit) return;

    setCloning(true);
    try {
      const response = await adminProductService.clone(productId);
      dispatch(pushToast(response.message || 'Product cloned', 'success'));
      navigate(`/admin/products/${response.data.id}/edit`);
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setCloning(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    const payload: Record<string, unknown> = {
      name: values.name,
      sku: values.sku,
      categoryId: Number(values.categoryId),
      brand: values.brand,
      platform: values.platform,
      condition: values.condition,
      price: Number(values.price),
      shortDescription: values.shortDescription,
      description: values.description,
      metaTitle: values.metaTitle,
      metaDescription: values.metaDescription,
      isActive: values.isActive,
      isFeatured: values.isFeatured,
    };

    if (values.salePrice !== '') payload.salePrice = Number(values.salePrice);
    if (values.costPrice !== '') payload.costPrice = Number(values.costPrice);
    if (values.tradeInPrice !== '') payload.tradeInPrice = Number(values.tradeInPrice);
    if (values.stock !== '') payload.stock = Number(values.stock);
    if (values.lowStockThreshold !== '') payload.lowStockThreshold = Number(values.lowStockThreshold);
    if (values.warrantyMonths !== '') payload.warrantyMonths = Number(values.warrantyMonths);
    if (isEdit && values.stockNote !== '') payload.stockNote = values.stockNote;

    const files = drafts.map((draft) => draft.file).filter(Boolean) as File[];
    const existingImageUrls = drafts
      .map((draft) => draft.existingUrl)
      .filter(Boolean) as string[];
    const imageOptions = {
      existingImageUrls,
      cardImageUrl: cardImageFile ? null : cardImageUrl,
      clearCardImage: isEdit ? clearCardImage : undefined,
    };

    try {
      if (isEdit) {
        await adminProductService.update(
          productId,
          payload,
          files,
          cardImageFile,
          imageOptions
        );
        drafts.forEach((draft) => {
          if (draft.file) URL.revokeObjectURL(draft.preview);
        });
        setDrafts([]);
        setCardImageFile(null);
        if (cardImagePreview) URL.revokeObjectURL(cardImagePreview);
        setCardImagePreview(null);
        setCardImageUrl(null);
        setClearCardImage(false);
        setValue('stockNote', '');
        dispatch(pushToast(`${values.name} saved`, 'success'));
        await detail.reload();
      } else {
        const response = await adminProductService.create(
          payload,
          files,
          cardImageFile,
          imageOptions
        );
        drafts.forEach((draft) => {
          if (draft.file) URL.revokeObjectURL(draft.preview);
        });
        setDrafts([]);
        dispatch(pushToast(`${values.name} added to the catalogue`, 'success'));
        navigate(`/admin/products/${response.data.id}/edit`, { replace: true });
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.fieldErrors.length) {
        caught.fieldErrors.forEach(({ field, message }) => {
          if (isFormField(field)) setError(field, { type: 'server', message });
        });
      }
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    }
  };

  if (isEdit && detail.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <PageHeader
        title={isEdit ? product?.name || 'Edit product' : 'New product'}
        description={
          isEdit
            ? 'Update the listing, artwork and stock level.'
            : 'Add a game, console or accessory to the catalogue.'
        }
        breadcrumbs={[
          { label: 'Dashboard', to: '/admin' },
          { label: 'Products', to: '/admin/products' },
          { label: isEdit ? 'Edit' : 'New' },
        ]}
        actions={
          isEdit ? (
            <Button
              type="button"
              variant="outline"
              loading={cloning}
              onClick={() => void handleClone()}
              leftIcon={<FiCopy size={15} />}
            >
              Clone product
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* Basics */}
          <section className="card p-5">
            <h2 className="text-base font-bold text-ink-900">Basics</h2>
            <p className="mt-0.5 text-sm text-ink-500">
              How the product is identified on the storefront and in your stock list.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  {...register('name')}
                  label="Product name"
                  required
                  placeholder="Product name"
                  error={errors.name?.message}
                />
              </div>

              <Input
                {...register('sku')}
                label="SKU"
                required
                placeholder="N64-ZELDA-OOT"
                hint="Must be unique across the catalogue."
                error={errors.sku?.message}
              />

              <Select
                value={watch('categoryId')}
                {...register('categoryId')}
                label="Category"
                required
                options={categoryOptions}
                placeholder="Choose a category"
                error={errors.categoryId?.message}
              />

              <Input
                {...register('brand')}
                label="Brand"
                placeholder="Nintendo"
                error={errors.brand?.message}
              />

              <Input
                {...register('platform')}
                label="Platform"
                placeholder="Nintendo 64"
                error={errors.platform?.message}
              />

              <div className="sm:col-span-2">
                <Select
                  {...register('condition')}
                  label="Condition"
                  options={CONDITION_OPTIONS}
                  error={errors.condition?.message}
                />
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className="card p-5">
            <h2 className="text-base font-bold text-ink-900">Pricing</h2>
            <p className="mt-0.5 text-sm text-ink-500">
              Set the sale price below the regular price to show a discount.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input
                {...register('price')}
                type="text"
                inputMode="decimal"
                label="Price"
                required
                placeholder="24.99"
                error={errors.price?.message}
              />

              <Input
                {...register('salePrice')}
                type="text"
                inputMode="decimal"
                label="Sale price"
                placeholder="19.99"
                hint="Must be below the regular price."
                error={errors.salePrice?.message}
              />

              <Input
                {...register('costPrice')}
                type="text"
                inputMode="decimal"
                label="Cost price"
                placeholder="12.00"
                hint="What you paid for it. Never shown to customers."
                error={errors.costPrice?.message}
              />

              <Input
                {...register('tradeInPrice')}
                type="text"
                inputMode="decimal"
                label="Trade-in price"
                placeholder="8.00"
                hint="What you offer a customer trading this in."
                error={errors.tradeInPrice?.message}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-ink-50 px-4 py-3 text-sm">
              <span>
                <span className="text-ink-500">Customer pays </span>
                <span className="font-bold text-ink-900">{formatPrice(customerPays)}</span>
              </span>

              {savePercent > 0 && (
                <span className="font-bold text-brand-600">Saves {savePercent}%</span>
              )}

              {marginPercent !== null && (
                <span className={marginPercent < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                  <span className="text-ink-500">Margin </span>
                  <span className="font-bold">{marginPercent}%</span>
                  <span className="text-ink-400">
                    {' '}
                    ({formatPrice(customerPays - costPrice)} per unit)
                  </span>
                </span>
              )}
            </div>
          </section>

          {/* Stock */}
          <section className="card p-5">
            <h2 className="text-base font-bold text-ink-900">Stock</h2>
            <p className="mt-0.5 text-sm text-ink-500">
              Low stock warnings appear on the dashboard once stock reaches the threshold.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Input
                {...register('stock')}
                type="text"
                inputMode="numeric"
                label="Units in stock"
                error={errors.stock?.message}
              />
              <Input
                {...register('lowStockThreshold')}
                type="text"
                inputMode="numeric"
                label="Low stock at"
                error={errors.lowStockThreshold?.message}
              />
              <Input
                {...register('warrantyMonths')}
                type="text"
                inputMode="numeric"
                label="Warranty (months)"
                error={errors.warrantyMonths?.message}
              />
            </div>

            {isEdit && (
              <div className="mt-4">
                <Input
                  {...register('stockNote')}
                  label="Reason for the stock change"
                  placeholder="Counted during Monday stock take"
                  hint="Changing the stock level writes an inventory log entry, so a note helps later."
                  error={errors.stockNote?.message}
                />
              </div>
            )}
          </section>

          {/* Content */}
          <section className="card p-5">
            <h2 className="text-base font-bold text-ink-900">Content</h2>
            <p className="mt-0.5 text-sm text-ink-500">
              The copy shoppers read, plus the text search engines use.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <Textarea
                  {...register('shortDescription')}
                  label="Short description"
                  rows={2}
                  placeholder="Complete with box and manual, fully tested."
                  error={errors.shortDescription?.message}
                />
                <p
                  className={cn(
                    'mt-1 text-right text-xs',
                    shortDescription.length > SHORT_DESCRIPTION_LIMIT
                      ? 'font-semibold text-brand-600'
                      : 'text-ink-400'
                  )}
                >
                  {shortDescription.length} / {SHORT_DESCRIPTION_LIMIT}
                </p>
              </div>

              <Textarea
                {...register('description')}
                label="Full description"
                rows={6}
                placeholder="Condition notes, what is included in the box, region…"
                error={errors.description?.message}
              />

              <Input
                {...register('metaTitle')}
                label="Meta title"
                placeholder="SEO title"
                error={errors.metaTitle?.message}
              />

              <Textarea
                {...register('metaDescription')}
                label="Meta description"
                rows={2}
                placeholder="Pre-owned N64 classic, tested and covered by our warranty."
                error={errors.metaDescription?.message}
              />
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="text-base font-bold text-ink-900">Card image</h2>
            <p className="mt-0.5 text-sm text-ink-500">
              This picture is always shown on product cards in the shop. Gallery photos below are
              used on the product page.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <SmartImage
                src={
                  cardImagePreview ||
                  cardImageUrl ||
                  (clearCardImage ? null : product?.cardImage)
                }
                alt="Card image"
                wrapperClassName="h-28 w-28 shrink-0 rounded-xl border border-ink-100 bg-white"
                className="object-contain p-1"
              />
              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                  Upload from computer
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (cardImagePreview) URL.revokeObjectURL(cardImagePreview);
                      setCardImageFile(file);
                      setCardImagePreview(URL.createObjectURL(file));
                      setCardImageUrl(null);
                      setClearCardImage(false);
                    }}
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<FiFolder size={14} />}
                  onClick={() => setPickerOpen('card')}
                >
                  Choose from uploads
                </Button>
                {(cardImagePreview ||
                  cardImageUrl ||
                  (!clearCardImage && product?.cardImage)) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearCardImageSelection}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-base font-bold text-ink-900">Images</h2>
            <p className="mt-0.5 text-sm text-ink-500">
              Up to {MAX_IMAGES} photos. The first image of a new product becomes the cover.
            </p>

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={cn(
                'mt-4 rounded-xl border-2 border-dashed px-4 py-6 text-center transition',
                dragging ? 'border-brand-400 bg-brand-50' : 'border-ink-200 bg-ink-50/60',
                remainingSlots === 0 && 'opacity-60'
              )}
            >
              <FiUploadCloud className="mx-auto text-ink-400" size={26} />
              <p className="mt-2 text-sm font-semibold text-ink-700">
                Drag photos here, or
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                disabled={remainingSlots === 0}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload from computer
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 ml-2"
                disabled={remainingSlots === 0}
                leftIcon={<FiFolder size={14} />}
                onClick={() => setPickerOpen('gallery')}
              >
                Choose from uploads
              </Button>
              <p className="mt-2 text-xs text-ink-400">
                {remainingSlots > 0
                  ? `${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} left`
                  : 'All image slots are full'}
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.target.value = '';
                }}
              />
            </div>

            {drafts.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">
                  Ready to upload
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {drafts.map((draft) => (
                    <motion.div
                      key={draft.preview}
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative overflow-hidden rounded-lg border border-ink-100"
                    >
                      <img
                        src={draft.preview}
                        alt={draft.file?.name || 'Selected upload'}
                        className="aspect-square w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeDraft(draft.preview)}
                        aria-label={`Remove ${draft.file?.name || 'image'}`}
                        className="absolute right-1 top-1 rounded-full bg-ink-900/70 p-1 text-white transition hover:bg-rose-600"
                      >
                        <FiX size={12} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {isEdit && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">
                  On this product
                </p>

                {existingImages.length === 0 ? (
                  <p className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2.5 text-xs text-ink-500">
                    <FiImage size={14} />
                    No images yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {existingImages.map((image) => (
                      <div
                        key={image.id}
                        className="relative overflow-hidden rounded-lg border border-ink-100"
                      >
                        <SmartImage
                          src={image.url}
                          alt={image.alt || 'Product image'}
                          wrapperClassName="aspect-square w-full"
                          className="h-full w-full object-cover"
                        />

                        {image.isPrimary && (
                          <span className="absolute left-1 top-1 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            Cover
                          </span>
                        )}

                        <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-ink-900/80 to-transparent p-1">
                          {!image.isPrimary && (
                            <button
                              type="button"
                              disabled={imagePending}
                              onClick={() => void handleSetPrimary(image.id)}
                              aria-label="Make cover image"
                              title="Make cover"
                              className="rounded-full bg-white/90 p-1 text-ink-700 transition hover:text-brand-600 disabled:opacity-50"
                            >
                              <FiStar size={12} />
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={imagePending}
                            onClick={() => void handleRemoveImage(image.id)}
                            aria-label="Delete image"
                            title="Delete image"
                            className="rounded-full bg-white/90 p-1 text-ink-700 transition hover:text-rose-600 disabled:opacity-50"
                          >
                            <FiTrash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="card space-y-4 p-5">
            <h2 className="text-base font-bold text-ink-900">Visibility</h2>

            <Switch
              checked={isActive}
              onChange={(next) => setValue('isActive', next, { shouldDirty: true })}
              label="Active"
              description="Inactive products are hidden from the storefront."
            />

            <Switch
              checked={isFeatured}
              onChange={(next) => setValue('isFeatured', next, { shouldDirty: true })}
              label="Featured"
              description="Featured products appear in the homepage highlights."
            />
          </section>

          {isEdit && detail.data && (
            <>
              <section className="card p-5">
                <h2 className="text-base font-bold text-ink-900">Performance</h2>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-ink-50 px-3 py-2.5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-500">
                      <FiTrendingUp size={12} />
                      Units sold
                    </p>
                    <p className="mt-1 text-xl font-black text-ink-900">
                      {formatNumber(detail.data.stats.unitsSold)}
                    </p>
                  </div>

                  <div className="rounded-lg bg-ink-50 px-3 py-2.5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-500">
                      <FiEye size={12} />
                      Views
                    </p>
                    <p className="mt-1 text-xl font-black text-ink-900">
                      {formatNumber(product?.viewCount)}
                    </p>
                  </div>
                </div>
              </section>

              <section className="card p-5">
                <h2 className="text-base font-bold text-ink-900">Recent stock movements</h2>

                {detail.data.inventoryLogs.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-500">No movements recorded yet.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {detail.data.inventoryLogs.slice(0, 6).map((log) => (
                      <li key={log.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Badge tone={LOG_TONES[log.type]}>{log.type}</Badge>
                          <p className="mt-1 truncate text-xs text-ink-500">
                            {formatDateTime(log.createdAt)}
                            {log.admin ? ` · ${log.admin.name}` : ''}
                          </p>
                          {log.note && (
                            <p className="mt-0.5 truncate text-xs text-ink-400">{log.note}</p>
                          )}
                        </div>

                        <span className="shrink-0 text-right text-sm">
                          <span
                            className={cn(
                              'font-bold',
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
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-ink-200 bg-white/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/admin/products')}
          leftIcon={<FiArrowLeft size={15} />}
        >
          Cancel
        </Button>

        <Button type="submit" loading={isSubmitting} leftIcon={<FiSave size={15} />}>
          {isEdit ? 'Save changes' : 'Create product'}
        </Button>
      </div>

      <ImagePicker
        open={pickerOpen === 'card'}
        onClose={() => setPickerOpen(null)}
        onSelect={(urls) => {
          const url = urls[0];
          if (!url) return;
          if (cardImagePreview) URL.revokeObjectURL(cardImagePreview);
          setCardImageFile(null);
          setCardImagePreview(null);
          setCardImageUrl(url);
          setClearCardImage(false);
        }}
        defaultFolder="products"
        title="Choose card image"
        description="Pick an image already stored in uploads, or upload a new file from your computer."
      />

      <ImagePicker
        open={pickerOpen === 'gallery'}
        onClose={() => setPickerOpen(null)}
        onSelect={addExistingUrls}
        multiple
        maxSelect={remainingSlots}
        defaultFolder="products"
        title="Choose gallery images"
        description="Select one or more images from uploads to attach to this product."
      />
    </form>
  );
};

export default ProductForm;
