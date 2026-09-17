import type { OrderStatus, ProductCondition } from '@/types';

const ASSET_URL = import.meta.env.VITE_ASSET_URL || '';

/** Always render UK pounds regardless of the visitor's browser locale. */
export const formatPrice = (value: number | null | undefined) => {
  const numeric = Number(value) || 0;
  const sign = numeric < 0 ? '-' : '';
  return `${sign}£${Math.abs(numeric).toFixed(2)}`;
};

const compact = new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 });

export const formatNumber = (value: number | null | undefined) =>
  new Intl.NumberFormat('en-GB').format(Number(value) || 0);

export const formatCompact = (value: number | null | undefined) =>
  compact.format(Number(value) || 0);

export const formatPercent = (value: number | null | undefined) => {
  const numeric = Number(value) || 0;
  return `${numeric > 0 ? '+' : ''}${numeric.toFixed(1)}%`;
};

export const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatRelative = (value: string | Date | null | undefined) => {
  if (!value) return '—';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;

  return formatDate(value);
};

/** Resolve a stored `/uploads/...` path into something the browser can load. */
export const assetUrl = (path: string | null | undefined) => {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${ASSET_URL}${path}`;
};

export const CONDITION_LABELS: Record<ProductCondition, string> = {
  new: 'Brand new',
  like_new: 'Like new',
  very_good: 'Very good',
  good: 'Good',
  fair: 'Fair',
};

export const conditionLabel = (condition: string | null | undefined) =>
  CONDITION_LABELS[condition as ProductCondition] || 'Pre-owned';

/** Human-readable warranty from months stored on the product. */
export const warrantyLabel = (months: number | null | undefined) => {
  const value = Number(months) || 0;
  if (!value) return null;
  if (value % 12 === 0) {
    const years = value / 12;
    return `${years} year${years === 1 ? '' : 's'} warranty`;
  }
  return `${value} month${value === 1 ? '' : 's'} warranty`;
};

/** Badge copy for the circular warranty roundel on product images. */
export const warrantyRoundel = (months: number | null | undefined) => {
  const value = Number(months) || 0;
  if (!value) return null;
  if (value % 12 === 0) {
    const years = value / 12;
    return { amount: String(years), unit: years === 1 ? 'Year' : 'Years' };
  }
  return { amount: String(value), unit: value === 1 ? 'Month' : 'Months' };
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

/** Tailwind classes per order status, shared by the badge components. */
export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 ring-blue-200',
  processing: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  packed: 'bg-violet-50 text-violet-700 ring-violet-200',
  shipped: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-ink-100 text-ink-600 ring-ink-200',
  refunded: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export const ORDER_TIMELINE: OrderStatus[] = [
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'delivered',
];

export const initials = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

/** Turn a permission key such as `products:update` into "Update". */
export const permissionActionLabel = (action: string) =>
  action.charAt(0).toUpperCase() + action.slice(1);
