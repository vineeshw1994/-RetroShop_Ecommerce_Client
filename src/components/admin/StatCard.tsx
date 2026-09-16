import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';
import cn from '@/lib/cn';
import { formatPercent } from '@/lib/format';

interface StatCardProps {
  label: string;
  value: ReactNode;
  change?: number;
  icon?: ReactNode;
  hint?: string;
  tone?: 'brand' | 'success' | 'warning' | 'info' | 'neutral';
  /** Stagger index for the entrance animation. */
  index?: number;
}

const TONES = {
  brand: 'bg-brand-50 text-brand-600',
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  info: 'bg-blue-50 text-blue-600',
  neutral: 'bg-ink-100 text-ink-600',
} as const;

const StatCard = ({
  label,
  value,
  change,
  icon,
  hint,
  tone = 'brand',
  index = 0,
}: StatCardProps) => {
  const hasChange = change !== undefined && Number.isFinite(change);
  const Trend = !hasChange ? FiMinus : change > 0 ? FiTrendingUp : change < 0 ? FiTrendingDown : FiMinus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="card p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
        {icon && (
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              TONES[tone]
            )}
          >
            {icon}
          </span>
        )}
      </div>

      <p className="mt-3 text-2xl font-black tracking-tight text-ink-900">{value}</p>

      <div className="mt-2 flex items-center gap-2">
        {hasChange && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-bold',
              change > 0
                ? 'bg-emerald-50 text-emerald-700'
                : change < 0
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-ink-100 text-ink-600'
            )}
          >
            <Trend size={11} />
            {formatPercent(change)}
          </span>
        )}
        {hint && <span className="truncate text-[11px] text-ink-400">{hint}</span>}
      </div>
    </motion.div>
  );
};

export default StatCard;
