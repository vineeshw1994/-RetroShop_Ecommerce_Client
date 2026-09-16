import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiCheckCircle,
  FiChevronRight,
  FiDownload,
  FiMail,
  FiSlash,
  FiUserCheck,
  FiUsers,
} from 'react-icons/fi';
import { DataTable, FilterToolbar, PageHeader, StatCard, type Column } from '@/components/admin';
import {
  Badge,
  Button,
  ConfirmDialog,
  ErrorState,
  Pagination,
  Select,
  SmartImage,
} from '@/components/ui';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { useAsync, useDebounce, useDocumentTitle, usePermissions, useQueryFilters } from '@/hooks';
import { adminCustomerService } from '@/services/admin.service';
import { getErrorMessage } from '@/lib/api';
import { formatDate, formatNumber, formatPrice, initials } from '@/lib/format';
import type { AdminCustomer } from '@/types';

const CUSTOMER_DEFAULTS = {
  page: '1',
  search: '',
  status: '',
  verified: '',
  sort: 'newest',
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
];

const VERIFIED_OPTIONS = [
  { value: 'true', label: 'Verified' },
  { value: 'false', label: 'Unverified' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'last_login', label: 'Recently active' },
];

const Avatar = ({ customer }: { customer: AdminCustomer }) =>
  customer.avatar ? (
    <SmartImage
      src={customer.avatar}
      alt={customer.fullName}
      wrapperClassName="h-9 w-9 shrink-0 rounded-full"
      className="h-full w-full object-cover"
    />
  ) : (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-white">
      {initials(customer.fullName || customer.email)}
    </span>
  );

const Customers = () => {
  useDocumentTitle('Customers');

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canUpdate = can('customers:update');

  const { filters, setFilter, resetFilters } = useQueryFilters(CUSTOMER_DEFAULTS);
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 400);
  const [pending, setPending] = useState<AdminCustomer | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null);

  useEffect(() => {
    if (debouncedSearch !== filters.search) setFilter({ search: debouncedSearch });
  }, [debouncedSearch, filters.search, setFilter]);

  const { data, loading, error, reload } = useAsync(
    () =>
      adminCustomerService.list({
        page: Number(filters.page) || 1,
        limit: 20,
        search: filters.search || undefined,
        status: filters.status || undefined,
        verified: filters.verified || undefined,
        sort: filters.sort || undefined,
      }),
    [filters.page, filters.search, filters.status, filters.verified, filters.sort]
  );

  const customers = data?.data ?? [];
  const summary = data?.summary;

  const activeCount =
    (['search', 'status', 'verified'] as const).filter((key) => filters[key]).length +
    (filters.sort !== 'newest' ? 1 : 0);

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setExporting(format);
    try {
      await adminCustomerService.exportCsv(format);
      dispatch(pushToast(`${format === 'xlsx' ? 'Excel' : 'CSV'} export started`, 'success'));
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setExporting(null);
    }
  };

  const confirmStatusChange = async () => {
    if (!pending) return;

    setSaving(true);
    try {
      await adminCustomerService.setStatus(pending.id, !pending.isActive);
      dispatch(
        pushToast(
          pending.isActive
            ? `${pending.fullName} suspended and signed out`
            : `${pending.fullName} restored`,
          'success'
        )
      );
      setPending(null);
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<AdminCustomer>[] = [
    {
      key: 'customer',
      header: 'Customer',
      render: (customer) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar customer={customer} />
          <div className="min-w-0 max-w-[220px]">
            <p className="truncate font-semibold text-ink-900">{customer.fullName}</p>
            <p className="truncate text-xs text-ink-500">{customer.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      hideBelow: 'lg',
      render: (customer) => customer.phone || <span className="text-ink-400">—</span>,
    },
    {
      key: 'flags',
      header: 'Standing',
      render: (customer) => (
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={customer.isActive ? 'success' : 'danger'}>
            {customer.isActive ? 'Active' : 'Suspended'}
          </Badge>
          <Badge tone={customer.isVerified ? 'info' : 'neutral'}>
            {customer.isVerified ? 'Verified' : 'Unverified'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'orderCount',
      header: 'Orders',
      hideBelow: 'sm',
      render: (customer) => formatNumber(customer.orderCount),
    },
    {
      key: 'totalSpend',
      header: 'Spend',
      className: 'font-bold text-ink-900 whitespace-nowrap',
      render: (customer) => formatPrice(customer.totalSpend),
    },
    {
      key: 'lastOrderAt',
      header: 'Last order',
      hideBelow: 'lg',
      render: (customer) => (
        <span className="whitespace-nowrap text-ink-500">{formatDate(customer.lastOrderAt)}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      hideBelow: 'lg',
      render: (customer) => (
        <span className="whitespace-nowrap text-ink-500">{formatDate(customer.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-px',
      render: (customer) => (
        <div
          className="flex items-center justify-end gap-1"
          onClick={(event) => event.stopPropagation()}
        >
          {canUpdate && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={
                customer.isActive ? <FiSlash size={13} /> : <FiUserCheck size={13} />
              }
              onClick={() => setPending(customer)}
            >
              {customer.isActive ? 'Suspend' : 'Restore'}
            </Button>
          )}
          <button
            type="button"
            onClick={() => navigate(`/admin/customers/${customer.id}`)}
            aria-label={`Open ${customer.fullName}`}
            className="rounded-lg p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          >
            <FiChevronRight size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Everyone with an account on the storefront"
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          index={0}
          label="Total customers"
          value={formatNumber(summary?.total ?? 0)}
          icon={<FiUsers size={17} />}
          tone="brand"
        />
        <StatCard
          index={1}
          label="Active"
          value={formatNumber(summary?.active ?? 0)}
          icon={<FiUserCheck size={17} />}
          tone="success"
        />
        <StatCard
          index={2}
          label="Verified"
          value={formatNumber(summary?.verified ?? 0)}
          icon={<FiCheckCircle size={17} />}
          tone="info"
        />
        <StatCard
          index={3}
          label="Subscribed"
          value={formatNumber(summary?.subscribed ?? 0)}
          hint="Opted in to marketing"
          icon={<FiMail size={17} />}
          tone="warning"
        />
      </div>

      <FilterToolbar
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search name, email or phone…"
        activeCount={activeCount}
        onReset={() => {
          setSearchInput('');
          resetFilters();
        }}
        trailing={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              loading={exporting === 'csv'}
              disabled={Boolean(exporting)}
              leftIcon={<FiDownload size={14} />}
              onClick={() => void handleExport('csv')}
            >
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              loading={exporting === 'xlsx'}
              disabled={Boolean(exporting)}
              leftIcon={<FiDownload size={14} />}
              onClick={() => void handleExport('xlsx')}
            >
              Excel
            </Button>
          </div>
        }
      >
        <Select
          options={STATUS_OPTIONS}
          placeholder="All statuses"
          value={filters.status}
          onChange={(event) => setFilter({ status: event.target.value })}
          aria-label="Account status"
        />
        <Select
          options={VERIFIED_OPTIONS}
          placeholder="Any verification"
          value={filters.verified}
          onChange={(event) => setFilter({ verified: event.target.value })}
          aria-label="Email verification"
        />
        <Select
          options={SORT_OPTIONS}
          value={filters.sort}
          onChange={(event) => setFilter({ sort: event.target.value })}
          aria-label="Sort customers"
        />
      </FilterToolbar>

      {error && !loading ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={customers}
            rowKey={(customer) => customer.id}
            loading={loading}
            onRowClick={(customer) => navigate(`/admin/customers/${customer.id}`)}
            emptyTitle="No customers match these filters"
            emptyMessage="Try clearing the search or switching the status filter."
            renderMobileCard={(customer) => (
              <div className="card p-4">
                <div className="flex items-start gap-3">
                  <Avatar customer={customer} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink-900">{customer.fullName}</p>
                    <p className="truncate text-xs text-ink-500">{customer.email}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge tone={customer.isActive ? 'success' : 'danger'}>
                    {customer.isActive ? 'Active' : 'Suspended'}
                  </Badge>
                  <Badge tone={customer.isVerified ? 'info' : 'neutral'}>
                    {customer.isVerified ? 'Verified' : 'Unverified'}
                  </Badge>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3 text-sm">
                  <span className="text-ink-600">
                    {formatNumber(customer.orderCount)} orders · joined{' '}
                    {formatDate(customer.createdAt)}
                  </span>
                  <span className="font-bold text-ink-900">
                    {formatPrice(customer.totalSpend)}
                  </span>
                </div>

                {canUpdate && (
                  <span
                    className="mt-3 block"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Button
                      fullWidth
                      variant="outline"
                      size="sm"
                      leftIcon={
                        customer.isActive ? <FiSlash size={13} /> : <FiUserCheck size={13} />
                      }
                      onClick={() => setPending(customer)}
                    >
                      {customer.isActive ? 'Suspend account' : 'Restore account'}
                    </Button>
                  </span>
                )}
              </div>
            )}
          />

          <Pagination
            meta={data?.meta}
            onPageChange={(page) => setFilter({ page })}
            className="mt-5"
          />
        </>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={confirmStatusChange}
        loading={saving}
        tone={pending?.isActive ? 'danger' : 'primary'}
        title={pending?.isActive ? 'Suspend this customer?' : 'Restore this customer?'}
        confirmLabel={pending?.isActive ? 'Suspend account' : 'Restore account'}
        message={
          pending?.isActive ? (
            <>
              <strong>{pending.fullName}</strong> will be signed out of every device immediately and
              cannot sign in again until you restore the account.
            </>
          ) : (
            <>
              <strong>{pending?.fullName}</strong> will be able to sign in and place orders again.
            </>
          )
        }
      />
    </div>
  );
};

export default Customers;
