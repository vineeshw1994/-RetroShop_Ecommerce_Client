import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  FiCheck,
  FiCopy,
  FiImage,
  FiSearch,
  FiUploadCloud,
} from 'react-icons/fi';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { adminUploadService, type UploadFolder } from '@/services/admin.service';
import { assetUrl } from '@/lib/format';
import { getErrorMessage } from '@/lib/api';
import cn from '@/lib/cn';
import { useAsync, useDebounce, useDocumentTitle, usePermissions } from '@/hooks';
import { PageHeader } from '@/components/admin';
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  Input,
  Pagination,
  Skeleton,
} from '@/components/ui';

const PAGE_SIZE = 48;

const GALLERY_FOLDERS: {
  value: UploadFolder;
  label: string;
  viewPermission: 'products:view' | 'categories:view' | 'banners:view';
  uploadPermission: 'products:update' | 'categories:update' | 'banners:update';
  description: string;
  uploadHint: string;
  emptyHint: string;
}[] = [
  {
    value: 'products',
    label: 'Products',
    viewPermission: 'products:view',
    uploadPermission: 'products:update',
    description: 'Product card and gallery images for the catalogue and bulk import sheets.',
    uploadHint: 'Drag product images here instead of pasting into the server folder',
    emptyHint: 'Upload images above, or paste files into ecommerce_server/uploads/products/.',
  },
  {
    value: 'categories',
    label: 'Categories',
    viewPermission: 'categories:view',
    uploadPermission: 'categories:update',
    description: 'Category and sub-category images used in the admin catalogue and storefront menu.',
    uploadHint: 'Drag category images here for use in category forms and bulk import',
    emptyHint: 'Upload images above, or paste files into ecommerce_server/uploads/categories/.',
  },
  {
    value: 'banners',
    label: 'Banners',
    viewPermission: 'banners:view',
    uploadPermission: 'banners:update',
    description: 'Homepage hero and promotional banner images.',
    uploadHint: 'Drag banner images here for use in homepage promo slots',
    emptyHint: 'Upload images above, or paste files into ecommerce_server/uploads/banners/.',
  },
];

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ProductGallery = () => {
  useDocumentTitle('Gallery');

  const dispatch = useAppDispatch();
  const { can } = usePermissions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visibleFolders = useMemo(
    () => GALLERY_FOLDERS.filter((entry) => can(entry.viewPermission)),
    [can]
  );

  const [folder, setFolder] = useState<UploadFolder>('products');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const activeFolder =
    visibleFolders.find((entry) => entry.value === folder) ?? visibleFolders[0] ?? GALLERY_FOLDERS[0];
  const canUpload = can(activeFolder.uploadPermission);
  const debouncedSearch = useDebounce(search.trim(), 300);

  useEffect(() => {
    if (visibleFolders.length > 0 && !visibleFolders.some((entry) => entry.value === folder)) {
      setFolder(visibleFolders[0].value);
      setPage(1);
      setSelected([]);
    }
  }, [visibleFolders, folder]);

  const query = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      folder,
      search: debouncedSearch || undefined,
    }),
    [page, debouncedSearch, folder]
  );

  const { data, loading, error, reload } = useAsync(
    () => adminUploadService.list(query),
    [query]
  );

  const files = data?.data || [];
  const meta = data?.meta;
  const allOnPageSelected = files.length > 0 && files.every((file) => selected.includes(file.url));

  const switchFolder = (next: UploadFolder) => {
    setFolder(next);
    setPage(1);
    setSearch('');
    setSelected([]);
  };

  const toggleOne = (url: string) =>
    setSelected((current) =>
      current.includes(url) ? current.filter((entry) => entry !== url) : [...current, url]
    );

  const togglePage = () => {
    if (allOnPageSelected) {
      const pageUrls = new Set(files.map((file) => file.url));
      setSelected((current) => current.filter((url) => !pageUrls.has(url)));
      return;
    }

    setSelected((current) => {
      const next = new Set(current);
      files.forEach((file) => next.add(file.url));
      return [...next];
    });
  };

  const uploadFiles = async (incoming: FileList | null) => {
    if (!incoming?.length || !canUpload) return;

    const images = Array.from(incoming).filter((file) => file.type.startsWith('image/'));
    if (!images.length) {
      dispatch(pushToast('Only image files can be uploaded', 'error'));
      return;
    }

    setUploading(true);
    try {
      const response = await adminUploadService.upload(folder, images);
      dispatch(pushToast(response.message || `${images.length} image(s) uploaded`, 'success'));
      setPage(1);
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void uploadFiles(event.dataTransfer.files);
  };

  const copySelected = async (mode: 'path' | 'filename') => {
    if (!selected.length) {
      dispatch(pushToast('Select at least one image', 'warning'));
      return;
    }

    const selectedFiles = files.filter((file) => selected.includes(file.url));
    const lookup = new Map(selectedFiles.map((file) => [file.url, file]));
    const lines = selected.map((url) => {
      const file = lookup.get(url);
      if (!file) return url.replace(`/uploads/${folder}/`, '');
      return mode === 'filename' ? file.name : file.url;
    });

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      dispatch(
        pushToast(
          `${selected.length} ${mode === 'filename' ? 'filename' : 'path'}${selected.length === 1 ? '' : 's'} copied`,
          'success'
        )
      );
    } catch {
      dispatch(pushToast('Could not copy to clipboard', 'error'));
    }
  };

  return (
    <div>
      <PageHeader
        title="Gallery"
        description="Browse and upload images stored on the server. Switch between product, category and banner folders."
        breadcrumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Gallery' }]}
        actions={
          selected.length > 0 ? (
            <Badge tone="brand">{selected.length} selected</Badge>
          ) : (
            meta && (
              <span className="text-sm text-ink-500">
                {meta.total} {activeFolder.label.toLowerCase()} image{meta.total === 1 ? '' : 's'}
              </span>
            )
          )
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {visibleFolders.map((entry) => (
          <button
            key={entry.value}
            type="button"
            onClick={() => switchFolder(entry.value)}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-semibold transition',
              folder === entry.value
                ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:text-brand-700'
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <p className="mb-5 text-sm text-ink-500">{activeFolder.description}</p>

      {canUpload && (
        <section
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'card mb-5 border-2 border-dashed px-5 py-8 text-center transition',
            dragging ? 'border-brand-400 bg-brand-50' : 'border-ink-200 bg-white'
          )}
        >
          <FiUploadCloud className="mx-auto text-ink-400" size={30} />
          <p className="mt-2 text-sm font-semibold text-ink-700">{activeFolder.uploadHint}</p>
          <p className="mt-1 text-xs text-ink-500">
            JPG, PNG, WEBP, AVIF or GIF · up to 32 files at once · saved to uploads/{folder}/
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload from computer
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => void uploadFiles(event.target.files)}
          />
        </section>
      )}

      <section className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by filename…"
            leftIcon={<FiSearch size={15} />}
            containerClassName="lg:max-w-sm"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Checkbox checked={allOnPageSelected} onChange={togglePage} label="Select page" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!selected.length}
              onClick={() => void copySelected('filename')}
              leftIcon={<FiCopy size={14} />}
            >
              Copy filenames
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!selected.length}
              onClick={() => void copySelected('path')}
              leftIcon={<FiCopy size={14} />}
            >
              Copy paths
            </Button>
            {selected.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelected([])}>
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {Array.from({ length: 12 }).map((_, index) => (
                <Skeleton key={index} className="aspect-square w-full rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : files.length === 0 ? (
            <EmptyState
              icon={<FiImage size={28} />}
              title={`No ${activeFolder.label.toLowerCase()} images yet`}
              message={canUpload ? activeFolder.emptyHint : `No images found in uploads/${folder}/.`}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {files.map((file) => {
                  const picked = selected.includes(file.url);
                  const src = assetUrl(file.url);

                  return (
                    <button
                      key={file.url}
                      type="button"
                      onClick={() => toggleOne(file.url)}
                      className={cn(
                        'group relative overflow-hidden rounded-xl border bg-ink-50 text-left transition',
                        picked
                          ? 'border-brand-600 ring-2 ring-brand-200'
                          : 'border-ink-100 hover:border-brand-300'
                      )}
                    >
                      {src ? (
                        <img src={src} alt={file.name} className="aspect-square w-full object-cover" />
                      ) : (
                        <div className="flex aspect-square items-center justify-center text-ink-300">
                          <FiImage size={28} />
                        </div>
                      )}

                      {picked && (
                        <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white shadow">
                          <FiCheck size={15} />
                        </span>
                      )}

                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/85 to-transparent px-2 pb-2 pt-8">
                        <span className="block truncate text-xs font-semibold text-white">{file.name}</span>
                        <span className="block text-[10px] text-white/75">{formatBytes(file.size)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {meta && meta.pages > 1 && (
                <div className="mt-5 border-t border-ink-100 pt-4">
                  <Pagination meta={meta} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProductGallery;
