import type { ReactNode } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FiDownload, FiPieChart, FiShoppingBag, FiUsers } from 'react-icons/fi';
import { DataTable, PageHeader, type Column } from '@/components/admin';
import { Button, EmptyState, ErrorState, Select, Skeleton, SmartImage } from '@/components/ui';
import { useAsync, useDocumentTitle, useQueryFilters } from '@/hooks';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { adminReportService } from '@/services/admin.service';
import { getErrorMessage } from '@/lib/api';
import { formatDate, formatNumber, formatPrice } from '@/lib/format';
import cn from '@/lib/cn';
import type { CustomerReport, PaymentMethod, ProductReport, SalesReport } from '@/types';

const REPORT_DEFAULTS = { tab: 'sales', dateFrom: '', dateTo: '', groupBy: 'day' };

const TABS = [
  { key: 'sales', label: 'Sales', icon: FiPieChart },
  { key: 'products', label: 'Products', icon: FiShoppingBag },
  { key: 'customers', label: 'Customers', icon: FiUsers },
] as const;

const GROUP_OPTIONS = [
  { value: 'day', label: 'By day' },
  { value: 'week', label: 'By week' },
  { value: 'month', label: 'By month' },
];

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  card: 'Card',
  cash_on_delivery: 'Cash on delivery',
  bank_transfer: 'Bank transfer',
};

const PAYMENT_COLORS: Record<PaymentMethod, string> = {
  card: '#e4002b',
  cash_on_delivery: '#0b63f6',
  bank_transfer: '#10b981',
};

const LOYALTY_COLORS = ['#8b5cf6', '#10b981'];

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid #eef0f4',
  boxShadow: '0 12px 32px -12px rgb(16 24 40 / 0.22)',
  fontSize: 12,
};

type ReportPayload =
  | { tab: 'sales'; sales: SalesReport }
  | { tab: 'products'; products: ProductReport }
  | { tab: 'customers'; customers: CustomerReport };

type SalesRow = SalesReport['series'][number];
type TopSeller = ProductReport['topSellers'][number];
type NoSaleRow = ProductReport['noSales'][number];
type TopSpender = CustomerReport['topSpenders'][number];

const tickDate = (value: string) =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const TotalTile = ({ label, value }: { label: string; value: string }) => (
  <div className="card p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
    <p className="mt-2 text-xl font-black tracking-tight text-ink-900">{value}</p>
  </div>
);

const SectionCard = ({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) => (
  <section className={cn('card p-5', className)}>
    <h2 className="text-sm font-bold text-ink-900">{title}</h2>
    {description && <p className="text-xs text-ink-500">{description}</p>}
    <div className="mt-4">{children}</div>
  </section>
);

const Reports = () => {
  useDocumentTitle('Reports');

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { filters, setFilter } = useQueryFilters(REPORT_DEFAULTS);
  const { tab, dateFrom, dateTo, groupBy } = filters;
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null);

  const exportCurrent = async (format: 'csv' | 'xlsx') => {
    setExporting(format);
    const range = { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, format };
    try {
      if (tab === 'products') await adminReportService.exportProducts(range);
      else if (tab === 'customers') await adminReportService.exportCustomers(range);
      else await adminReportService.exportSales({ ...range, groupBy });
      dispatch(pushToast(`Downloaded ${format.toUpperCase()} report`, 'success'));
    } catch (error) {
      dispatch(pushToast(getErrorMessage(error), 'error'));
    } finally {
      setExporting(null);
    }
  };

  const { data, loading, error, reload } = useAsync<ReportPayload>(async () => {
    const range = { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };

    if (tab === 'products') {
      const response = await adminReportService.products(range);
      return { tab: 'products', products: response.data };
    }

    if (tab === 'customers') {
      const response = await adminReportService.customers(range);
      return { tab: 'customers', customers: response.data };
    }

    const response = await adminReportService.sales({ ...range, groupBy });
    return { tab: 'sales', sales: response.data };
  }, [tab, dateFrom, dateTo, groupBy]);

  const sales = data?.tab === 'sales' ? data.sales : null;
  const products = data?.tab === 'products' ? data.products : null;
  const customers = data?.tab === 'customers' ? data.customers : null;

  const salesColumns: Column<SalesRow>[] = [
    {
      key: 'period',
      header: 'Period',
      className: 'font-semibold text-ink-900',
      render: (row) => row.period,
    },
    { key: 'orders', header: 'Orders', render: (row) => formatNumber(row.orders) },
    { key: 'units', header: 'Units', hideBelow: 'sm', render: (row) => formatNumber(row.units) },
    {
      key: 'subtotal',
      header: 'Subtotal',
      hideBelow: 'md',
      render: (row) => formatPrice(row.subtotal),
    },
    {
      key: 'shipping',
      header: 'Shipping',
      hideBelow: 'lg',
      render: (row) => formatPrice(row.shipping),
    },
    {
      key: 'revenue',
      header: 'Revenue',
      className: 'font-bold text-ink-900',
      render: (row) => formatPrice(row.revenue),
    },
  ];

  const sellerColumns: Column<TopSeller>[] = [
    {
      key: 'rank',
      header: '#',
      className: 'w-10 text-xs font-bold text-ink-400',
      render: (row) => String((products?.topSellers.indexOf(row) ?? 0) + 1),
    },
    {
      key: 'name',
      header: 'Product',
      className: 'font-semibold text-ink-900',
      render: (row) => <span className="block max-w-[260px] truncate">{row.name}</span>,
    },
    {
      key: 'sku',
      header: 'SKU',
      hideBelow: 'md',
      render: (row) => <span className="font-mono text-xs text-ink-500">{row.sku}</span>,
    },
    { key: 'units', header: 'Units', render: (row) => formatNumber(row.units) },
    {
      key: 'orderCount',
      header: 'Orders',
      hideBelow: 'sm',
      render: (row) => formatNumber(row.orderCount),
    },
    {
      key: 'revenue',
      header: 'Revenue',
      className: 'font-bold text-ink-900',
      render: (row) => formatPrice(row.revenue),
    },
  ];

  const spenderColumns: Column<TopSpender>[] = [
    {
      key: 'name',
      header: 'Customer',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900">{row.name}</p>
          <p className="truncate text-xs text-ink-500">{row.email}</p>
        </div>
      ),
    },
    { key: 'orders', header: 'Orders', render: (row) => formatNumber(row.orders) },
    {
      key: 'spend',
      header: 'Lifetime spend',
      className: 'font-bold text-ink-900',
      render: (row) => formatPrice(row.spend),
    },
  ];

  const loyaltySlices = customers
    ? [
        { name: 'One-time buyers', value: customers.loyalty.oneTime },
        { name: 'Repeat buyers', value: customers.loyalty.repeatBuyers },
      ].filter((slice) => slice.value > 0)
    : [];

  const paymentSlices = (sales?.byPaymentMethod ?? []).filter((slice) => slice.revenue > 0);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Sales, product and customer performance over a period you choose"
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
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
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FiDownload size={14} />}
              loading={exporting === 'csv'}
              disabled={Boolean(exporting)}
              onClick={() => void exportCurrent('csv')}
            >
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FiDownload size={14} />}
              loading={exporting === 'xlsx'}
              disabled={Boolean(exporting)}
              onClick={() => void exportCurrent('xlsx')}
            >
              Excel
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-ink-100 p-1">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setFilter({ tab: entry.key })}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition',
              tab === entry.key
                ? 'bg-white text-ink-900 shadow-sm'
                : 'text-ink-600 hover:text-ink-900'
            )}
          >
            <entry.icon size={15} />
            {entry.label}
          </button>
        ))}
      </div>

      {error && !loading && <ErrorState message={error} onRetry={reload} />}

      {loading && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {!loading && sales && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="w-full sm:w-48">
              <Select
                options={GROUP_OPTIONS}
                value={groupBy}
                onChange={(event) => setFilter({ groupBy: event.target.value })}
                aria-label="Group results by"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TotalTile label="Revenue" value={formatPrice(sales.totals.revenue)} />
            <TotalTile label="Orders" value={formatNumber(sales.totals.orders)} />
            <TotalTile label="Units sold" value={formatNumber(sales.totals.units)} />
            <TotalTile label="Shipping collected" value={formatPrice(sales.totals.shipping)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard
              className="lg:col-span-2"
              title="Revenue trend"
              description={`${formatDate(sales.range.from)} – ${formatDate(sales.range.to)}`}
            >
              <div className="h-[300px] w-full">
                {sales.series.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={sales.series}
                      margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                    >
                      <defs>
                        <linearGradient id="reportRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#e4002b" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#e4002b" stopOpacity={0} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
                      <XAxis
                        dataKey="period"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: '#6b7689' }}
                        minTickGap={18}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: '#6b7689' }}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value, name) => [formatPrice(Number(value)), name]}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="#e4002b"
                        strokeWidth={2.5}
                        fill="url(#reportRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    compact
                    title="No sales in this period"
                    message="Try widening the date range."
                  />
                )}
              </div>
            </SectionCard>

            <SectionCard title="Payment methods" description="Revenue split by how customers paid">
              <div className="h-[300px] w-full">
                {paymentSlices.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentSlices}
                        dataKey="revenue"
                        nameKey="paymentMethod"
                        innerRadius={56}
                        outerRadius={86}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {paymentSlices.map((slice) => (
                          <Cell
                            key={slice.paymentMethod}
                            fill={PAYMENT_COLORS[slice.paymentMethod]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value, name) => [
                          formatPrice(Number(value)),
                          PAYMENT_LABELS[name as PaymentMethod] ?? String(name),
                        ]}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: 12 }}
                        formatter={(value) => (
                          <span className="text-ink-600">
                            {PAYMENT_LABELS[value as PaymentMethod] ?? String(value)}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState compact title="No payments yet" message="Nothing to split." />
                )}
              </div>
            </SectionCard>
          </div>

          <DataTable
            columns={salesColumns}
            rows={sales.series}
            rowKey={(row) => row.period}
            emptyTitle="No sales in this period"
            emptyMessage="Pick a different date range to see trading."
            renderMobileCard={(row) => (
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-ink-900">{row.period}</p>
                  <p className="font-bold text-ink-900">{formatPrice(row.revenue)}</p>
                </div>
                <p className="mt-1 text-xs text-ink-500">
                  {formatNumber(row.orders)} orders · {formatNumber(row.units)} units ·{' '}
                  {formatPrice(row.shipping)} shipping
                </p>
              </div>
            )}
          />
        </div>
      )}

      {!loading && products && (
        <div className="space-y-4">
          <div>
            <h2 className="mb-3 text-sm font-bold text-ink-900">Best sellers</h2>
            <DataTable
              columns={sellerColumns}
              rows={products.topSellers}
              rowKey={(row) => row.productId}
              emptyTitle="No products sold"
              emptyMessage="Nothing shifted in this period."
              renderMobileCard={(row) => (
                <div className="card p-4">
                  <p className="font-semibold text-ink-900">{row.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-ink-500">{row.sku}</p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-ink-600">
                      {formatNumber(row.units)} units · {formatNumber(row.orderCount)} orders
                    </span>
                    <span className="font-bold text-ink-900">{formatPrice(row.revenue)}</span>
                  </div>
                </div>
              )}
            />
          </div>

          <SectionCard
            title="No sales in this period"
            description="Stock that has not shifted — consider repricing or featuring it"
          >
            {products.noSales.length ? (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {products.noSales.map((row: NoSaleRow) => (
                  <li
                    key={row.id}
                    className="flex gap-3 rounded-lg border border-ink-100 p-3 transition hover:border-ink-200"
                  >
                    <SmartImage
                      src={row.primaryImage}
                      alt={row.name}
                      wrapperClassName="h-14 w-14 shrink-0 rounded-lg"
                      className="h-full w-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900">{row.name}</p>
                      <p className="truncate font-mono text-[11px] text-ink-500">{row.sku}</p>
                      <p className="mt-1 text-xs text-ink-600">
                        {formatPrice(row.price)} · {formatNumber(row.stock)} in stock
                      </p>
                      <p className="text-[11px] text-ink-400">Listed {formatDate(row.listedAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                title="Everything sold"
                message="Every listed product shifted at least one unit in this period."
              />
            )}
          </SectionCard>
        </div>
      )}

      {!loading && customers && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard
              className="lg:col-span-2"
              title="New signups"
              description={`${formatDate(customers.range.from)} – ${formatDate(customers.range.to)}`}
            >
              <div className="h-[300px] w-full">
                {customers.signupTrend.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={customers.signupTrend}
                      margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
                    >
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
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: '#6b7689' }}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        labelFormatter={(label) => formatDate(String(label))}
                        formatter={(value, name) => [formatNumber(Number(value)), name]}
                      />
                      <Bar
                        dataKey="signups"
                        name="Signups"
                        fill="#0b63f6"
                        barSize={16}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    compact
                    title="No signups"
                    message="Nobody registered in this period."
                  />
                )}
              </div>
            </SectionCard>

            <SectionCard title="Loyalty" description="One-time versus repeat buyers">
              <div className="h-[300px] w-full">
                {loyaltySlices.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={loyaltySlices}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={56}
                        outerRadius={86}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {loyaltySlices.map((slice, index) => (
                          <Cell key={slice.name} fill={LOYALTY_COLORS[index % LOYALTY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value, name) => [formatNumber(Number(value)), name]}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: 12 }}
                        formatter={(value) => <span className="text-ink-600">{String(value)}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState compact title="No buyers yet" message="Nothing to compare." />
                )}
              </div>
            </SectionCard>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-bold text-ink-900">Top spenders</h2>
            <DataTable
              columns={spenderColumns}
              rows={customers.topSpenders}
              rowKey={(row) => row.userId}
              onRowClick={(row) => navigate(`/admin/customers/${row.userId}`)}
              emptyTitle="No spenders yet"
              emptyMessage="Nobody bought anything in this period."
              renderMobileCard={(row) => (
                <div className="card p-4">
                  <p className="truncate font-semibold text-ink-900">{row.name}</p>
                  <p className="truncate text-xs text-ink-500">{row.email}</p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-ink-600">{formatNumber(row.orders)} orders</span>
                    <span className="font-bold text-ink-900">{formatPrice(row.spend)}</span>
                  </div>
                </div>
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
