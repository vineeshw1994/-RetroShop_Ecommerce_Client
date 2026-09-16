import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import cn from '@/lib/cn';
import { EmptyState, TableSkeleton } from '@/components/ui';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  /** Hide on small screens to keep tables readable on mobile. */
  hideBelow?: 'sm' | 'md' | 'lg';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: { label: string; onClick: () => void };
  onRowClick?: (row: T) => void;
  /** Rendered on mobile instead of the table, when provided. */
  renderMobileCard?: (row: T) => ReactNode;
  footer?: ReactNode;
}

const HIDE_CLASSES = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
} as const;

const DataTable = <T,>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyTitle = 'Nothing to show yet',
  emptyMessage,
  emptyAction,
  onRowClick,
  renderMobileCard,
  footer,
}: DataTableProps<T>) => {
  if (loading) {
    return (
      <div className="card overflow-hidden">
        <TableSkeleton rows={8} columns={Math.min(columns.length, 6)} />
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="card">
        <EmptyState title={emptyTitle} message={emptyMessage} action={emptyAction} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Mobile cards */}
      {renderMobileCard && (
        <div className="space-y-3 md:hidden">
          {rows.map((row, index) => (
            <motion.div
              key={rowKey(row)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'cursor-pointer' : undefined}
            >
              {renderMobileCard(row)}
            </motion.div>
          ))}
        </div>
      )}

      <div className={cn('card overflow-hidden', renderMobileCard && 'hidden md:block')}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/70">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      'whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-500',
                      column.hideBelow && HIDE_CLASSES[column.hideBelow],
                      column.headerClassName
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-ink-100">
              {rows.map((row, index) => (
                <motion.tr
                  key={rowKey(row)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.25) }}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-ink-50'
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-4 py-3 align-middle text-ink-700',
                        column.hideBelow && HIDE_CLASSES[column.hideBelow],
                        column.className
                      )}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {footer && <div className="border-t border-ink-100 px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
};

export default DataTable;
