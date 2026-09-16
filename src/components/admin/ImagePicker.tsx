import { useEffect, useMemo, useState } from 'react';
import { FiCheck, FiFolder, FiImage, FiSearch } from 'react-icons/fi';
import { adminUploadService } from '@/services/admin.service';
import { assetUrl } from '@/lib/format';
import cn from '@/lib/cn';
import { useAsync } from '@/hooks';
import { Button, EmptyState, ErrorState, Input, Modal, Skeleton } from '@/components/ui';

const FOLDERS = [
  { value: '', label: 'All folders' },
  { value: 'products', label: 'Products' },
  { value: 'categories', label: 'Categories' },
  { value: 'banners', label: 'Banners' },
  { value: 'avatars', label: 'Avatars' },
  { value: 'misc', label: 'Misc' },
] as const;

export interface UploadFile {
  url: string;
  name: string;
  folder: string;
  size: number;
  updatedAt: string;
}

interface ImagePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (urls: string[]) => void;
  multiple?: boolean;
  maxSelect?: number;
  defaultFolder?: string;
  title?: string;
  description?: string;
}

const ImagePicker = ({
  open,
  onClose,
  onSelect,
  multiple = false,
  maxSelect = 1,
  defaultFolder = '',
  title = 'Choose from uploads',
  description = 'Pick an image already stored on the server, or upload a new file from your computer instead.',
}: ImagePickerProps) => {
  const [folder, setFolder] = useState(defaultFolder);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setFolder(defaultFolder);
    setSearch('');
    setPage(1);
    setPicked([]);
  }, [open, defaultFolder]);

  const query = useMemo(
    () => ({
      page,
      limit: 48,
      folder: folder || undefined,
      search: search.trim() || undefined,
    }),
    [folder, page, search]
  );

  const { data, loading, error, reload } = useAsync(
    () => (open ? adminUploadService.list(query) : Promise.resolve(null)),
    [open, query]
  );

  const files = data?.data || [];
  const meta = data?.meta;
  const limit = multiple ? maxSelect : 1;

  const togglePick = (url: string) => {
    if (multiple) {
      setPicked((current) => {
        if (current.includes(url)) return current.filter((entry) => entry !== url);
        if (current.length >= limit) return current;
        return [...current, url];
      });
      return;
    }

    setPicked([url]);
  };

  const handleConfirm = () => {
    if (!picked.length) return;
    onSelect(picked);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!picked.length}>
            Use selected{picked.length > 0 ? ` (${picked.length})` : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by filename…"
            leftIcon={<FiSearch size={15} />}
          />

          <label className="relative min-w-[180px]">
            <FiFolder className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={15} />
            <select
              value={folder}
              onChange={(event) => {
                setFolder(event.target.value);
                setPage(1);
              }}
              className="h-11 w-full appearance-none rounded-lg border border-ink-200 bg-white pl-9 pr-8 text-sm font-medium text-ink-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              {FOLDERS.map((entry) => (
                <option key={entry.value || 'all'} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <Skeleton key={index} className="aspect-square w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : files.length === 0 ? (
          <EmptyState
            icon={<FiImage size={28} />}
            title="No images found"
            message="Upload images from a product or category form first, then they will appear here."
          />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {files.map((file) => {
                const selected = picked.includes(file.url);
                const src = assetUrl(file.url);

                return (
                  <button
                    key={file.url}
                    type="button"
                    onClick={() => togglePick(file.url)}
                    className={cn(
                      'group relative overflow-hidden rounded-lg border bg-ink-50 text-left transition',
                      selected
                        ? 'border-brand-600 ring-2 ring-brand-200'
                        : 'border-ink-100 hover:border-brand-300'
                    )}
                  >
                    {src ? (
                      <img src={src} alt={file.name} className="aspect-square w-full object-cover" />
                    ) : (
                      <div className="flex aspect-square items-center justify-center text-ink-300">
                        <FiImage size={24} />
                      </div>
                    )}

                    {selected && (
                      <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white shadow">
                        <FiCheck size={14} />
                      </span>
                    )}

                    <span className="absolute inset-x-0 bottom-0 truncate bg-ink-900/70 px-1.5 py-1 text-[10px] font-medium text-white">
                      {file.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-ink-100 pt-3">
                <p className="text-xs text-ink-500">
                  Page {meta.page} of {meta.totalPages} · {meta.total} image{meta.total === 1 ? '' : 's'}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!meta.hasPrev}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!meta.hasNext}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default ImagePicker;
