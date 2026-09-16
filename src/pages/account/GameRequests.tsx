import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FiArrowRight,
  FiCornerDownRight,
  FiGift,
  FiPlus,
  FiTag,
  FiTrash2,
} from 'react-icons/fi';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { accountService } from '@/services/account.service';
import { getErrorMessage } from '@/lib/api';
import { useAsync, useDocumentTitle, useQueryFilters } from '@/hooks';
import { formatDate, formatPrice } from '@/lib/format';
import cn from '@/lib/cn';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui';
import type { GameRequest, GameRequestStatus } from '@/types';

const DEFAULTS = { page: '1', status: '' };

const PAGE_SIZE = 8;

const STATUS_META: Record<
  GameRequestStatus,
  { label: string; tone: 'warning' | 'info' | 'brand' | 'neutral' | 'success' }
> = {
  pending: { label: 'Pending review', tone: 'warning' },
  sourcing: { label: 'Sourcing', tone: 'info' },
  found: { label: 'Found for you', tone: 'brand' },
  unavailable: { label: 'Unavailable', tone: 'neutral' },
  fulfilled: { label: 'Fulfilled', tone: 'success' },
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All requests' },
  ...(Object.keys(STATUS_META) as GameRequestStatus[]).map((status) => ({
    value: status,
    label: STATUS_META[status].label,
  })),
];

const WITHDRAWABLE: GameRequestStatus[] = ['pending', 'sourcing'];

const PLATFORM_OPTIONS = [
  { value: '', label: 'Any platform' },
  { value: 'PlayStation 5', label: 'PlayStation 5' },
  { value: 'PlayStation 4', label: 'PlayStation 4' },
  { value: 'Xbox Series X|S', label: 'Xbox Series X|S' },
  { value: 'Xbox One', label: 'Xbox One' },
  { value: 'Nintendo Switch', label: 'Nintendo Switch' },
  { value: 'Nintendo 3DS', label: 'Nintendo 3DS' },
  { value: 'PC', label: 'PC' },
  { value: 'Retro', label: 'Retro / other' },
];

const CONDITION_OPTIONS = [
  { value: 'any', label: 'Any condition' },
  { value: 'new', label: 'Brand new only' },
  { value: 'used', label: 'Pre-owned is fine' },
];

const CONDITION_LABELS: Record<GameRequest['conditionPreference'], string> = {
  any: 'Any condition',
  new: 'Brand new only',
  used: 'Pre-owned is fine',
};

const requestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Tell us which game or console you are after')
    .max(180, 'Keep the title under 180 characters'),
  platform: z.string(),
  conditionPreference: z.enum(['any', 'new', 'used']),
  maxBudget: z
    .string()
    .refine(
      (value) => value === '' || (Number(value) > 0 && Number(value) <= 100000),
      'Enter a budget between 1 and 100,000'
    ),
  notes: z.string().max(600, 'Keep your notes under 600 characters'),
});

type RequestValues = z.infer<typeof requestSchema>;

const EMPTY_FORM: RequestValues = {
  title: '',
  platform: '',
  conditionPreference: 'any',
  maxBudget: '',
  notes: '',
};

const GameRequests = () => {
  useDocumentTitle('Game requests');

  const dispatch = useAppDispatch();
  const { filters, setFilter } = useQueryFilters(DEFAULTS);
  const page = Number(filters.page) || 1;

  const { data, loading, error, reload } = useAsync(
    () =>
      accountService.listGameRequests({
        page,
        limit: PAGE_SIZE,
        status: filters.status || undefined,
      }),
    [page, filters.status]
  );

  const [formOpen, setFormOpen] = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState<GameRequest | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (formOpen) reset(EMPTY_FORM);
  }, [formOpen, reset]);

  const requests = data?.data || [];
  const meta = data?.meta;

  const onSubmit = async (values: RequestValues) => {
    try {
      await accountService.createGameRequest({
        title: values.title,
        platform: values.platform || undefined,
        conditionPreference: values.conditionPreference,
        maxBudget: values.maxBudget ? Number(values.maxBudget) : undefined,
        notes: values.notes.trim() || undefined,
      });

      dispatch(pushToast('Request sent — we will be in touch once we find it', 'success'));
      setFormOpen(false);
      if (filters.status) setFilter({ status: '' });
      else await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawTarget) return;

    setWithdrawing(true);
    try {
      await accountService.deleteGameRequest(withdrawTarget.id);
      dispatch(pushToast('Request withdrawn', 'success'));
      setWithdrawTarget(null);
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-ink-900 sm:text-2xl">
            Game requests
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Cannot find a title in our shop? Ask us to source it and we will hunt it down.
          </p>
        </div>

        <Button size="sm" leftIcon={<FiPlus size={15} />} onClick={() => setFormOpen(true)}>
          New request
        </Button>
      </header>

      <div className="card p-3">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {STATUS_FILTERS.map((option) => (
            <button
              key={option.value || 'all'}
              type="button"
              onClick={() => setFilter({ status: option.value })}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                filters.status === option.value
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
      )}

      {!loading && error && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && requests.length === 0 && (
        <div className="card">
          <EmptyState
            icon={<FiGift size={22} />}
            title={filters.status ? 'Nothing with that status' : 'No requests yet'}
            message={
              filters.status
                ? 'Try another status to see the rest of your requests.'
                : 'Tell us the game or console you are chasing — your budget and preferred condition — and our buyers will look out for it. We will message you the moment one lands.'
            }
            action={
              filters.status
                ? { label: 'Show all requests', onClick: () => setFilter({ status: '' }) }
                : { label: 'Make a request', onClick: () => setFormOpen(true) }
            }
          />
        </div>
      )}

      {!loading && !error && requests.length > 0 && (
        <>
          <div className="space-y-4">
            {requests.map((request, index) => (
              <motion.article
                key={request.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: Math.min(index, 6) * 0.04 }}
                className="card p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-ink-900">{request.title}</h2>
                    <p className="mt-1 text-xs text-ink-500">
                      Submitted {formatDate(request.createdAt)}
                    </p>
                  </div>

                  <Badge tone={STATUS_META[request.status].tone} dot>
                    {STATUS_META[request.status].label}
                  </Badge>
                </div>

                <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs">
                  <div>
                    <dt className="text-ink-400">Platform</dt>
                    <dd className="mt-0.5 font-semibold text-ink-700">
                      {request.platform || 'Any'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-400">Condition</dt>
                    <dd className="mt-0.5 font-semibold text-ink-700">
                      {CONDITION_LABELS[request.conditionPreference]}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-400">Max budget</dt>
                    <dd className="mt-0.5 font-semibold text-ink-700">
                      {request.maxBudget === null ? 'Not set' : formatPrice(request.maxBudget)}
                    </dd>
                  </div>
                </dl>

                {request.notes && (
                  <p className="mt-3 text-sm text-ink-600">{request.notes}</p>
                )}

                {request.adminResponse && (
                  <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-700">
                      <FiCornerDownRight size={12} />
                      Reply from the shop
                    </p>
                    <p className="mt-1.5 text-sm text-ink-700">{request.adminResponse}</p>
                    {request.respondedAt && (
                      <p className="mt-1.5 text-[11px] text-ink-400">
                        {formatDate(request.respondedAt)}
                      </p>
                    )}
                  </div>
                )}

                {(request.linkedProduct || WITHDRAWABLE.includes(request.status)) && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4">
                    {request.linkedProduct && (
                      <Link to={`/product/${request.linkedProduct.slug}`}>
                        <Button size="sm" leftIcon={<FiTag size={14} />} rightIcon={<FiArrowRight size={14} />}>
                          View {request.linkedProduct.name}
                        </Button>
                      </Link>
                    )}

                    {WITHDRAWABLE.includes(request.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<FiTrash2 size={14} />}
                        onClick={() => setWithdrawTarget(request)}
                      >
                        Withdraw
                      </Button>
                    )}
                  </div>
                )}
              </motion.article>
            ))}
          </div>

          <Pagination meta={meta} onPageChange={(next) => setFilter({ page: next })} />
        </>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Request a game"
        description="Give us as much detail as you can and our buyers will start looking."
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="game-request-form" loading={isSubmitting}>
              Send request
            </Button>
          </>
        }
      >
        <form
          id="game-request-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <Input
            label="What are you looking for?"
            required
            placeholder="e.g. Metal Gear Solid 3 — Subsistence"
            error={errors.title?.message}
            {...register('title')}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Platform"
              options={PLATFORM_OPTIONS}
              error={errors.platform?.message}
              {...register('platform')}
            />

            <Select
              label="Preferred condition"
              options={CONDITION_OPTIONS}
              error={errors.conditionPreference?.message}
              {...register('conditionPreference')}
            />
          </div>

          <Input
            label="Maximum budget"
            type="number"
            min={1}
            step="0.01"
            inputMode="decimal"
            placeholder="Optional"
            hint="Leave blank if you are flexible."
            error={errors.maxBudget?.message}
            {...register('maxBudget')}
          />

          <Textarea
            label="Anything else?"
            rows={3}
            placeholder="Region, edition, boxed or loose, how soon you need it…"
            error={errors.notes?.message}
            {...register('notes')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(withdrawTarget)}
        onClose={() => setWithdrawTarget(null)}
        onConfirm={handleWithdraw}
        loading={withdrawing}
        title="Withdraw this request?"
        message={`We will stop looking for “${withdrawTarget?.title || 'this title'}”. You can always ask again later.`}
        confirmLabel="Withdraw request"
        cancelLabel="Keep looking"
      />
    </div>
  );
};

export default GameRequests;
