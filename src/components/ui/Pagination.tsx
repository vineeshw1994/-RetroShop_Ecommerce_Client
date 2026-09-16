import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import cn from '@/lib/cn';
import type { PageMeta } from '@/types';

interface PaginationProps {
  meta?: PageMeta;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Window of page numbers around the current page, with ellipses. */
const buildPages = (page: number, totalPages: number): (number | 'gap')[] => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages: (number | 'gap')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) pages.push('gap');
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < totalPages - 1) pages.push('gap');

  pages.push(totalPages);
  return pages;
};

const Pagination = ({ meta, onPageChange, className }: PaginationProps) => {
  if (!meta || meta.totalPages <= 1) return null;

  const { page, totalPages, total, limit } = meta;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'flex flex-col-reverse items-center justify-between gap-4 sm:flex-row',
        className
      )}
    >
      <p className="text-sm text-ink-500">
        Showing <span className="font-semibold text-ink-700">{from}</span>–
        <span className="font-semibold text-ink-700">{to}</span> of{' '}
        <span className="font-semibold text-ink-700">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!meta.hasPrev}
          aria-label="Previous page"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FiChevronLeft />
        </button>

        {buildPages(page, totalPages).map((entry, index) =>
          entry === 'gap' ? (
            <span key={`gap-${index}`} className="px-1.5 text-ink-400">
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              onClick={() => onPageChange(entry)}
              aria-current={entry === page ? 'page' : undefined}
              className={cn(
                'h-9 min-w-9 rounded-lg px-2.5 text-sm font-semibold transition',
                entry === page
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'border border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
              )}
            >
              {entry}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!meta.hasNext}
          aria-label="Next page"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FiChevronRight />
        </button>
      </div>
    </nav>
  );
};

export default Pagination;
