import type { ReactNode } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import { Button } from '@/components/ui';

interface FilterToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
  onReset?: () => void;
  /** Rendered on the right, e.g. an export button. */
  trailing?: ReactNode;
  activeCount?: number;
}

/** Shared filter row: search box, a slot for selects, and a reset control. */
const FilterToolbar = ({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  children,
  onReset,
  trailing,
  activeCount = 0,
}: FilterToolbarProps) => (
  <div className="card mb-4 p-3 sm:p-4">
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="input-base pl-10"
            aria-label={searchPlaceholder}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onReset && activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onReset} leftIcon={<FiX size={14} />}>
              Clear {activeCount}
            </Button>
          )}
          {trailing}
        </div>
      </div>

      {children && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {children}
        </div>
      )}
    </div>
  </div>
);

export default FilterToolbar;
