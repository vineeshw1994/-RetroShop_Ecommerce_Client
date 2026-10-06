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

export type ProductGrade = 'A' | 'B' | 'C';

/** Respawn-style grade used on product cards and the PDP. */
export const conditionGrade = (condition: string | null | undefined): ProductGrade => {
  if (condition === 'new' || condition === 'like_new' || condition === 'very_good') return 'A';
  if (condition === 'good') return 'B';
  return 'C';
};

export const gradeLabel = (condition: string | null | undefined) =>
  `Grade ${conditionGrade(condition)}`;

export const conditionQuality = (condition: string | null | undefined) => {
  const grade = conditionGrade(condition);
  if (grade === 'A') return 'Excellent';
  if (grade === 'B') return 'Good';
  return 'Fair';
};

export const isConsoleProduct = (name: string, categoryName?: string | null) =>
  /console|switch|playstation|xbox|ps5|ps4|wii|snes|mega drive/i.test(
    `${name} ${categoryName || ''}`
  );

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
  pending: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  confirmed: 'bg-cyan-500/15 text-cyan-300 ring-cyan-500/30',
  processing: 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30',
  packed: 'bg-violet-500/15 text-violet-300 ring-violet-500/30',
  shipped: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  delivered: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  cancelled: 'bg-ink-200 text-ink-500 ring-ink-300',
  refunded: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
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
