import type { ReactNode } from 'react';
import cn from '@/lib/cn';
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from '@/lib/format';
import type { OrderStatus } from '@/types';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700 ring-ink-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
  info: 'bg-blue-50 text-blue-700 ring-blue-200',
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
