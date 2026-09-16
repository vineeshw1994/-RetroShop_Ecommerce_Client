import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FiCheckCircle,
  FiEdit3,
  FiLock,
  FiMail,
  FiSearch,
  FiSend,
} from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { accountService } from '@/services/account.service';
import { getErrorMessage } from '@/lib/api';
import { useAsync, useDocumentTitle } from '@/hooks';
import { formatDate, formatPrice } from '@/lib/format';
import {
  Badge,
  Button,
  Input,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui';
import type { GameRequestStatus } from '@/types';

const PLATFORM_OPTIONS = [
  'PlayStation 5',
  'PlayStation 4',
  'PlayStation 3',
  'Xbox Series X|S',
  'Xbox One',
  'Xbox 360',
  'Nintendo Switch',
  'Nintendo 3DS',
  'Nintendo Wii',
  'PC',
  'Retro console',
  'Other',
].map((platform) => ({ value: platform, label: platform }));

const CONDITION_OPTIONS = [
  { value: 'any', label: 'Any condition' },
  { value: 'new', label: 'Brand new only' },
  { value: 'used', label: 'Pre-owned is fine' },
];

const HOW_IT_WORKS = [
  {
    icon: FiEdit3,
    title: 'Tell us what you want',
    text: 'Share the title, the platform and the most you would like to pay.',
  },
  {
    icon: FiSearch,
    title: 'We go hunting',
    text: 'Our buyers check trade-ins and suppliers for a tested, warranty-backed copy.',
  },
  {
    icon: FiMail,
    title: 'We get in touch',
    text: 'You get an email as soon as we find it, with a link to buy before anyone else.',
  },
];

const STATUS_BADGES: Record<GameRequestStatus, { label: string; tone: 'warning' | 'info' | 'success' | 'neutral' | 'brand' }> = {
  pending: { label: 'Pending', tone: 'warning' },
  sourcing: { label: 'Sourcing', tone: 'info' },
  found: { label: 'Found', tone: 'success' },
  unavailable: { label: 'Unavailable', tone: 'neutral' },
  fulfilled: { label: 'Fulfilled', tone: 'brand' },
};

const requestSchema = z.object({
  title: z.string().min(2, 'Tell us which title you are after').max(160, 'That title is too long'),
  platform: z.string().optional(),
  conditionPreference: z.enum(['any', 'new', 'used']),
  maxBudget: z
    .string()
    .optional()
    .refine(
      (value) => !value || (!Number.isNaN(Number(value)) && Number(value) > 0),
      'Enter a budget as a number, for example 35'
    ),
  notes: z.string().max(1000, 'Please keep notes under 1000 characters').optional(),
});

type RequestForm = z.infer<typeof requestSchema>;

const RequestGame = () => {
  useDocumentTitle('Request a game');

  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.status === 'authenticated');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [needsAccount, setNeedsAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      title: '',
      platform: '',
      conditionPreference: 'any',
      maxBudget: '',
      notes: '',
    },
  });

  const recent = useAsync(
    async () =>
      isAuthenticated ? (await accountService.listGameRequests({ limit: 5 })).data : [],
    [isAuthenticated]
  );

  const onSubmit = handleSubmit(async (values) => {
    // Requests are tied to an account, so guests are prompted rather than lost.
    if (!isAuthenticated) {
      setNeedsAccount(true);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await accountService.createGameRequest({
        title: values.title.trim(),
        platform: values.platform || undefined,
        conditionPreference: values.conditionPreference,
        maxBudget: values.maxBudget ? Number(values.maxBudget) : undefined,
        notes: values.notes?.trim() || undefined,
      });

      setSubmitted(true);
      dispatch(pushToast('Request sent — we are on it', 'success'));
      void recent.reload();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  });

  const startAnother = () => {
    reset();
    setSubmitted(false);
    setError(null);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6 lg:py-10">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <Badge tone="brand">Free service</Badge>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-ink-900 sm:text-4xl">
          Can't find it? We'll source it for you
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-ink-500 sm:text-base">
          Our shelves change daily as trade-ins come through the door. Tell us the title you are
          hunting for and our buying team will keep an eye out, then contact you the moment a tested
          copy lands — covered by the same warranty as everything else we sell.
        </p>
      </motion.header>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {HOW_IT_WORKS.map((step, index) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index }}
            className="card p-5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <step.icon size={18} />
            </span>
            <p className="mt-3 text-sm font-bold text-ink-900">
              {index + 1}. {step.title}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-500">{step.text}</p>
          </motion.div>
        ))}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="card p-5 sm:p-6">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-6 text-center"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <FiCheckCircle size={26} />
              </span>

              <h2 className="mt-4 text-lg font-bold text-ink-900">Request received</h2>
              <p className="mt-1.5 max-w-sm text-sm text-ink-500">
                We have added it to the hunt list. You will get an email as soon as we track a copy
                down, and you can follow its progress in your account.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link to="/account/requests">
                  <Button>View my requests</Button>
                </Link>
                <Button variant="outline" onClick={startAnother}>
                  Request another title
                </Button>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <h2 className="text-base font-bold text-ink-900">What are we looking for?</h2>

              <Input
                label="Game or console title"
                placeholder="e.g. Metal Gear Solid 3: Subsistence"
                required
                error={errors.title?.message}
                {...register('title')}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Platform"
                  placeholder="Select a platform"
                  options={PLATFORM_OPTIONS}
                  error={errors.platform?.message}
                  {...register('platform')}
                />

                <Select
                  label="Condition preference"
                  options={CONDITION_OPTIONS}
                  error={errors.conditionPreference?.message}
                  {...register('conditionPreference')}
                />
              </div>

              <Input
                label="Maximum budget"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                placeholder="35.00"
                hint="Optional — it helps us know when a copy is worth flagging."
                leftIcon={<span className="text-sm font-semibold">£</span>}
                error={errors.maxBudget?.message}
                {...register('maxBudget')}
              />

              <Textarea
                label="Anything else?"
                rows={4}
                placeholder="Region, boxed or unboxed, PAL vs NTSC, how soon you need it…"
                error={errors.notes?.message}
                {...register('notes')}
              />

              {needsAccount && !isAuthenticated && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg bg-ink-50 p-4 ring-1 ring-inset ring-ink-200"
                >
                  <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
                    <FiLock size={15} className="text-brand-600" />
                    Sign in to send your request
                  </p>
                  <p className="mt-1.5 text-sm text-ink-500">
                    We need somewhere to send the good news. Your answers stay on this page while
                    you sign in or create an account.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link to="/login?next=/request-a-game">
                      <Button size="sm">Sign in</Button>
                    </Link>
                    <Link to="/signup">
                      <Button size="sm" variant="outline">
                        Create an account
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              )}

              {error && (
                <p className="rounded-lg bg-brand-50 p-3 text-sm font-medium text-brand-700">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={submitting}
                leftIcon={<FiSend size={16} />}
              >
                Send my request
              </Button>
            </form>
          )}
        </section>

        {isAuthenticated && (
          <aside className="card h-fit p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-ink-900">Your recent requests</h2>
              <Link
                to="/account/requests"
                className="text-xs font-bold text-brand-600 hover:text-brand-700"
              >
                See all
              </Link>
            </div>

            {recent.loading ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : (recent.data || []).length === 0 ? (
              <p className="mt-3 text-sm text-ink-500">
                Nothing yet — your requests will be listed here.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-ink-100">
                {(recent.data || []).map((request) => (
                  <li key={request.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-semibold text-ink-800">
                        {request.title}
                      </p>
                      <Badge tone={STATUS_BADGES[request.status].tone}>
                        {STATUS_BADGES[request.status].label}
                      </Badge>
                    </div>

                    <p className="mt-1 text-[11px] text-ink-400">
                      {[
                        request.platform,
                        request.maxBudget ? `up to ${formatPrice(request.maxBudget)}` : null,
                        formatDate(request.createdAt),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};

export default RequestGame;
