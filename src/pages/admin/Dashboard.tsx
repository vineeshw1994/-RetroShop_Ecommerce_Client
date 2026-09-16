import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  FiAlertTriangle,
  FiArrowRight,
  FiGift,
  FiLayers,
  FiPackage,
  FiShoppingBag,
  FiTag,
  FiTrendingUp,
  FiUserPlus,
  FiMail,
  FiRotateCcw,
} from 'react-icons/fi';
import { DataTable, PageHeader, StatCard, type Column } from '@/components/admin';
import { EmptyState, ErrorState, OrderStatusBadge, Skeleton, StatCardSkeleton } from '@/components/ui';
import { useAsync, useDocumentTitle, useQueryFilters } from '@/hooks';
import { useAdminAlerts } from '@/hooks/useAdminAlerts';
import { adminDashboardService } from '@/services/admin.service';
import { ORDER_STATUS_LABELS, formatDate, formatNumber, formatPrice } from '@/lib/format';
import cn from '@/lib/cn';
import type { Order, OrderStatus } from '@/types';

const RANGE_DEFAULTS = { dateFrom: '', dateTo: '' };

/** Local (not UTC) yyyy-mm-dd so presets match what the user sees on a calendar. */
const isoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

const lastDays = (days: number) => {
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { dateFrom: isoDate(from), dateTo: isoDate(new Date()) };
};

const monthToDate = () => {
  const now = new Date();
  return {
    dateFrom: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    dateTo: isoDate(now),
  };
};

const PRESETS = [
  { key: '7d', label: 'Last 7 days', range: () => lastDays(7) },
  { key: '30d', label: 'Last 30 days', range: () => lastDays(30) },
  { key: '90d', label: 'Last 90 days', range: () => lastDays(90) },
  { key: 'mtd', label: 'This month', range: monthToDate },
];

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: '#f59e0b',
  confirmed: '#0b63f6',
  processing: '#6366f1',
  packed: '#8b5cf6',
  shipped: '#06b6d4',
  delivered: '#10b981',
  cancelled: '#97a1b3',
  refunded: '#f43f5e',
};

const CHART_MODES = [
  { key: 'both', label: 'Both' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'orders', label: 'Orders' },
] as const;

type ChartMode = (typeof CHART_MODES)[number]['key'];

const tickDate = (value: string) =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid #eef0f4',
  boxShadow: '0 12px 32px -12px rgb(16 24 40 / 0.22)',
  fontSize: 12,
};

interface RankedRow {
  key: string;
  label: string;
  units: number;
  revenue: number;
}

const RankedList = ({
  rows,
  emptyMessage,
  tone,
}: {
  rows: RankedRow[];
  emptyMessage: string;
  tone: string;
}) => {
  if (!rows.length) {
    return <EmptyState compact title="Nothing yet" message={emptyMessage} />;
  }

  const max = Math.max(...rows.map((row) => row.revenue), 1);

  return (
    <ol className="space-y-3">
      {rows.map((row, index) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="flex min-w-0 items-baseline gap-2 text-sm">
              <span className="text-xs font-bold text-ink-400">{index + 1}</span>
              <span className="truncate font-semibold text-ink-800">{row.label}</span>
            </p>
            <span className="shrink-0 text-sm font-bold text-ink-900">
              {formatPrice(row.revenue)}
            </span>
          </div>

          <div className="mt-1.5 flex items-center gap-3">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
              <span
                className="block h-full rounded-full"
                style={{ width: `${(row.revenue / max) * 100}%`, backgroundColor: tone }}
              />
            </span>
            <span className="shrink-0 text-[11px] font-medium text-ink-500">
              {formatNumber(row.units)} units
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
};

const Dashboard = () => {
  useDocumentTitle('Dashboard');

  const navigate = useNavigate();
  const { filters, setFilter } = useQueryFilters(RANGE_DEFAULTS);
  const { dateFrom, dateTo } = filters;
  const [chartMode, setChartMode] = useState<ChartMode>('both');

  const { data, loading, error, reload } = useAsync(
    () =>
      adminDashboardService.get({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    [dateFrom, dateTo]
  );

  const dashboard = data?.data ?? null;
  const { unseen, markSeen } = useAdminAlerts();

  const showLowStock = unseen.lowStockCount > 0;
  const showRequests = unseen.pendingRequests > 0;
  const showContacts = unseen.unreadContacts > 0;
  const showReturns = unseen.pendingReturns > 0;
  const hasAlerts = showLowStock || showRequests || showContacts || showReturns;

  const statusSlices = useMemo(
    () =>
      (dashboard?.ordersByStatus ?? [])
        .filter((slice) => slice.count > 0)
        .map((slice) => ({
          status: slice.status,
          name: ORDER_STATUS_LABELS[slice.status],
          value: slice.count,
        })),
    [dashboard]
  );

  const activePreset = PRESETS.find((preset) => {
    const range = preset.range();
    return range.dateFrom === dateFrom && range.dateTo === dateTo;
  })?.key;

  const orderColumns: Column<Order>[] = [
    {
      key: 'orderNumber',
      header: 'Order',
      render: (order) => (
        <span className="font-bold text-ink-900">{order.orderNumber}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      hideBelow: 'lg',
      render: (order) =>
        order.customer ? (
          <span className="block max-w-[200px] truncate">
            {order.customer.firstName} {order.customer.lastName}
          </span>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => <OrderStatusBadge status={order.status} />,
    },
    {
      key: 'total',
      header: 'Total',
      className: 'font-semibold text-ink-900',
      render: (order) => formatPrice(order.total),
    },
    {
      key: 'placedAt',
      header: 'Placed',
      hideBelow: 'sm',
      render: (order) => (
        <span className="whitespace-nowrap text-ink-500">
          {formatDate(order.placedAt || order.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={
          dashboard
            ? `${formatDate(dashboard.range.from)} – ${formatDate(dashboard.range.to)}`
            : 'Trading performance at a glance'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1 rounded-lg bg-ink-100 p-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setFilter(preset.range())}
                  className={cn(
                    'rounded-md px-2.5 py-1.5 text-xs font-semibold transition',
                    activePreset === preset.key
                      ? 'bg-white text-ink-900 shadow-sm'
                      : 'text-ink-600 hover:text-ink-900'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => setFilter({ dateFrom: event.target.value })}
                aria-label="From date"
                className="input-base h-9 w-auto py-0 text-xs"
              />
              <span className="text-xs text-ink-400">to</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => setFilter({ dateTo: event.target.value })}
                aria-label="To date"
                className="input-base h-9 w-auto py-0 text-xs"
              />
            </div>
          </div>
        }
      />

      {error && !loading && <ErrorState message={error} onRetry={reload} />}

      {loading && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <StatCardSkeleton key={index} />
            ))}
          </div>
          <Skeleton className="h-80 w-full" />
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      )}

      {dashboard && !loading && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              index={0}
              label="Revenue"
              value={formatPrice(dashboard.kpis.revenue.value)}
              change={dashboard.kpis.revenue.change}
              icon={<FiTrendingUp size={17} />}
              tone="brand"
            />
            <StatCard
              index={1}
              label="Orders"
              value={formatNumber(dashboard.kpis.orders.value)}
              change={dashboard.kpis.orders.change}
              icon={<FiShoppingBag size={17} />}
              tone="info"
            />
            <StatCard
              index={2}
              label="Average order"
              value={formatPrice(dashboard.kpis.averageOrderValue.value)}
              change={dashboard.kpis.averageOrderValue.change}
              icon={<FiTag size={17} />}
              tone="neutral"
            />
            <StatCard
              index={3}
              label="New customers"
              value={formatNumber(dashboard.kpis.newCustomers.value)}
              change={dashboard.kpis.newCustomers.change}
              icon={<FiUserPlus size={17} />}
              tone="success"
            />
            <StatCard
              index={4}
              label="Units sold"
              value={formatNumber(dashboard.kpis.unitsSold.value)}
              change={dashboard.kpis.unitsSold.change}
              icon={<FiPackage size={17} />}
              tone="warning"
            />
          </div>

          {hasAlerts && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {showLowStock && (
                <Link
                  to="/admin/inventory?state=low"
                  onClick={() => markSeen('lowStockCount')}
                  className="flex items-center gap-3 rounded-[--radius-card] border border-amber-200 bg-amber-50 p-4 transition hover:bg-amber-100"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <FiAlertTriangle size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-amber-900">
                      {formatNumber(unseen.lowStockCount)} product
                      {unseen.lowStockCount === 1 ? '' : 's'} running low
                    </span>
                    <span className="block text-xs text-amber-700">
                      Restock before they sell out.
                    </span>
                  </span>
                  <FiArrowRight className="shrink-0 text-amber-700" />
                </Link>
              )}

              {showRequests && (
                <Link
                  to="/admin/requests"
                  onClick={() => markSeen('pendingRequests')}
                  className="flex items-center gap-3 rounded-[--radius-card] border border-blue-200 bg-blue-50 p-4 transition hover:bg-blue-100"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <FiGift size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-blue-900">
                      {formatNumber(unseen.pendingRequests)} game request
                      {unseen.pendingRequests === 1 ? '' : 's'} waiting
                    </span>
                    <span className="block text-xs text-blue-700">
                      Customers are waiting on a reply.
                    </span>
                  </span>
                  <FiArrowRight className="shrink-0 text-blue-700" />
                </Link>
              )}

              {showContacts && (
                <Link
                  to="/admin/contacts"
                  onClick={() => markSeen('unreadContacts')}
                  className="flex items-center gap-3 rounded-[--radius-card] border border-rose-200 bg-rose-50 p-4 transition hover:bg-rose-100"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                    <FiMail size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-rose-900">
                      {formatNumber(unseen.unreadContacts)} contact message
                      {unseen.unreadContacts === 1 ? '' : 's'} unread
                    </span>
                    <span className="block text-xs text-rose-700">Reply from the inbox.</span>
                  </span>
                  <FiArrowRight className="shrink-0 text-rose-700" />
                </Link>
              )}

              {showReturns && (
                <Link
                  to="/admin/returns"
                  onClick={() => markSeen('pendingReturns')}
                  className="flex items-center gap-3 rounded-[--radius-card] border border-violet-200 bg-violet-50 p-4 transition hover:bg-violet-100"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                    <FiRotateCcw size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-violet-900">
                      {formatNumber(unseen.pendingReturns)} return request
                      {unseen.pendingReturns === 1 ? '' : 's'} pending
                    </span>
                    <span className="block text-xs text-violet-700">
                      Review customer return requests.
                    </span>
                  </span>
                  <FiArrowRight className="shrink-0 text-violet-700" />
                </Link>
              )}
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-3">
            <section className="card p-5 xl:col-span-2">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-ink-900">Revenue &amp; orders</h2>
                  <p className="text-xs text-ink-500">Daily trading across the selected range</p>
                </div>

                <div className="flex gap-1 rounded-lg bg-ink-100 p-1">
                  {CHART_MODES.map((mode) => (
                    <button
                      key={mode.key}
                      type="button"
                      onClick={() => setChartMode(mode.key)}
                      className={cn(
                        'rounded-md px-2.5 py-1.5 text-xs font-semibold transition',
                        chartMode === mode.key
                          ? 'bg-white text-ink-900 shadow-sm'
                          : 'text-ink-600 hover:text-ink-900'
                      )}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[320px] w-full">
                {dashboard.trend.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={dashboard.trend}
                      margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                    >
                      <defs>
                        <linearGradient id="dashRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#e4002b" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="#e4002b" stopOpacity={0} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={tickDate}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: '#6b7689' }}
                        minTickGap={18}
                      />
                      <YAxis
                        yAxisId="revenue"
                        hide={chartMode === 'orders'}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: '#6b7689' }}
                      />
                      <YAxis
                        yAxisId="orders"
                        orientation="right"
                        hide={chartMode === 'revenue'}
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: '#6b7689' }}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        labelFormatter={(label) => formatDate(String(label))}
                        formatter={(value, name) => [
                          name === 'Revenue' ? formatPrice(Number(value)) : formatNumber(Number(value)),
                          name,
                        ]}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                      />

                      {chartMode !== 'revenue' && (
                        <Bar
                          yAxisId="orders"
                          dataKey="orders"
                          name="Orders"
                          fill="#0b63f6"
                          barSize={14}
                          radius={[4, 4, 0, 0]}
                        />
                      )}

                      {chartMode !== 'orders' && (
                        <Area
                          yAxisId="revenue"
                          type="monotone"
                          dataKey="revenue"
                          name="Revenue"
                          stroke="#e4002b"
                          strokeWidth={2.5}
                          fill="url(#dashRevenue)"
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    compact
                    title="No trading yet"
                    message="Once orders land in this range the trend appears here."
                  />
                )}
              </div>
            </section>

            <section className="card p-5">
              <h2 className="text-sm font-bold text-ink-900">Orders by status</h2>
              <p className="text-xs text-ink-500">Where the queue currently sits</p>

              <div className="mt-2 h-[320px] w-full">
                {statusSlices.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusSlices}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {statusSlices.map((slice) => (
                          <Cell key={slice.status} fill={STATUS_COLORS[slice.status]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value, name) => [formatNumber(Number(value)), name]}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: 12 }}
                        formatter={(value) => (
                          <span className="text-ink-600">{String(value)}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState compact title="No orders yet" message="Nothing to break down." />
                )}
              </div>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card p-5">
              <div className="mb-4 flex items-center gap-2">
                <FiPackage className="text-brand-600" />
                <h2 className="text-sm font-bold text-ink-900">Top products</h2>
              </div>

              <RankedList
                tone="#e4002b"
                emptyMessage="No products sold in this range."
                rows={dashboard.topProducts.map((product) => ({
                  key: String(product.productId),
                  label: product.name,
                  units: product.units,
                  revenue: product.revenue,
                }))}
              />
            </section>

            <section className="card p-5">
              <div className="mb-4 flex items-center gap-2">
                <FiLayers className="text-accent-500" />
                <h2 className="text-sm font-bold text-ink-900">Top categories</h2>
              </div>

              <RankedList
                tone="#0b63f6"
                emptyMessage="No category sales in this range."
                rows={dashboard.topCategories.map((category) => ({
                  key: category.category,
                  label: category.category,
                  units: category.units,
                  revenue: category.revenue,
                }))}
              />
            </section>
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-ink-900">Recent orders</h2>
              <Link
                to="/admin/orders"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700"
              >
                View all orders
                <FiArrowRight size={13} />
              </Link>
            </div>

            <DataTable
              columns={orderColumns}
              rows={dashboard.recentOrders}
              rowKey={(order) => order.id}
              onRowClick={(order) => navigate(`/admin/orders/${order.id}`)}
              emptyTitle="No orders yet"
              emptyMessage="New orders will appear here as they come in."
              renderMobileCard={(order) => (
                <div className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-ink-900">{order.orderNumber}</p>
                      {order.customer && (
                        <p className="truncate text-xs text-ink-500">
                          {order.customer.firstName} {order.customer.lastName}
                        </p>
                      )}
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="font-bold text-ink-900">{formatPrice(order.total)}</span>
                    <span className="text-xs text-ink-500">
                      {formatDate(order.placedAt || order.createdAt)}
                    </span>
                  </div>
                </div>
              )}
            />
          </section>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
