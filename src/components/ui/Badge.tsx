import type { ReactNode } from 'react';
import cn from '@/lib/cn';
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from '@/lib/format';
import type { OrderStatus } from '@/types';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-ink-200 text-ink-700 ring-ink-300',
  brand: 'bg-brand-50 text-brand-400 ring-brand-200',
  success: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  danger: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  info: 'bg-cyan-500/15 text-cyan-300 ring-cyan-500/30',
};

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}

const Badge = ({ children, tone = 'neutral', className, dot }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
      TONES[tone],
      className
    )}
  >
    {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
    {children}
  </span>
);

/** Order status pill using the shared colour map. */
export const OrderStatusBadge = ({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
      ORDER_STATUS_STYLES[status],
      className
    )}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {ORDER_STATUS_LABELS[status]}
  </span>
);

export default Badge;
