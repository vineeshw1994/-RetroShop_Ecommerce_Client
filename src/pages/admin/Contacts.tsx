import { useEffect, useState } from 'react';
import { FiMail, FiSend } from 'react-icons/fi';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { adminContactService } from '@/services/admin.service';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useAsync, useDebounce, useDocumentTitle, usePermissions, useQueryFilters } from '@/hooks';
import { FilterToolbar, PageHeader } from '@/components/admin';
import { Badge, Button, EmptyState, ErrorState, Modal, Pagination, Select, Textarea } from '@/components/ui';
import type { ContactMessage } from '@/types';

const DEFAULTS = { page: '1', search: '', status: '' };

const Contacts = () => {
  useDocumentTitle('Contact messages');
  const dispatch = useAppDispatch();
  const { can } = usePermissions();
  const { filters, setFilter, resetFilters } = useQueryFilters(DEFAULTS);
  const [searchTerm, setSearchTerm] = useState(filters.search);
  const debounced = useDebounce(searchTerm.trim(), 400);
  const [active, setActive] = useState<ContactMessage | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const page = Number(filters.page) || 1;
  const { data, loading, error, reload } = useAsync(
    () =>
      adminContactService.list({
        page,
        search: debounced || undefined,
        status: filters.status || undefined,
      }),
    [page, debounced, filters.status]
  );

  useEffect(() => {
    if (debounced !== filters.search) setFilter({ search: debounced });
  }, [debounced, filters.search, setFilter]);

  const rows = data?.data || [];
  const unread = data?.summary?.unread || 0;

  const sendReply = async () => {
    if (!active) return;
    setSending(true);
    try {
      await adminContactService.reply(active.id, reply);
      dispatch(pushToast('Reply emailed to the customer', 'success'));
      setActive(null);
      setReply('');
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Contact messages"
        description={`${unread} waiting for a reply.`}
        breadcrumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Contact' }]}
      />

      <FilterToolbar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search name, email or subject…"
        onReset={() => {
          setSearchTerm('');
          resetFilters();
        }}
        activeCount={[filters.search, filters.status].filter(Boolean).length}
      >
        <Select
          aria-label="Status"
          options={[
            { value: 'new', label: 'New' },
            { value: 'replied', label: 'Replied' },
          ]}
          placeholder="Any status"
          value={filters.status}
          onChange={(event) => setFilter({ status: event.target.value })}
        />
      </FilterToolbar>

      {loading ? (
        <div className="card h-40" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<FiMail size={22} />} title="No messages yet" />
      ) : (
        <div className="card divide-y divide-ink-100">
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => {
                setActive(row);
                setReply(row.replyBody || '');
              }}
              className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-ink-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <span>
                <span className="font-semibold text-ink-900">{row.subject}</span>
                <span className="mt-0.5 block text-xs text-ink-500">
                  {row.name} · {row.email}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <Badge tone={row.status === 'new' ? 'warning' : 'success'}>{row.status}</Badge>
                <span className="text-xs text-ink-400">{formatDateTime(row.createdAt)}</span>
              </span>
            </button>
          ))}
          <Pagination meta={data?.meta} onPageChange={(next) => setFilter({ page: next }, false)} />
        </div>
      )}

      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title={active?.subject}
        description={active ? `${active.name} · ${active.email}` : undefined}
        footer={
          can('contacts:update') && (
            <Button onClick={() => void sendReply()} loading={sending} leftIcon={<FiSend size={14} />}>
              Send reply
            </Button>
          )
        }
      >
        {active && (
          <div className="space-y-4">
            <p className="whitespace-pre-wrap rounded-lg bg-ink-50 p-3 text-sm text-ink-700">{active.message}</p>
            <Textarea
              label="Reply (emailed to the customer)"
              rows={6}
              value={reply}
              onChange={(event) => setReply(event.target.value)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Contacts;
