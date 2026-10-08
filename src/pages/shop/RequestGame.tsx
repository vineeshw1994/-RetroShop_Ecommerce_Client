import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowRight,
  FiCamera,
  FiCheckCircle,
  FiMapPin,
  FiSearch,
} from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { accountService } from '@/services/account.service';
import { getErrorMessage } from '@/lib/api';
import { useDocumentTitle } from '@/hooks';
import { formatPrice } from '@/lib/format';
import cn from '@/lib/cn';
import { Button, Input, Select } from '@/components/ui';
import { ITEM_TYPES, PLATFORMS, type ItemTypeKey, type PlatformKey } from '@/lib/shopNav';
import {
  GAME_TYPES,
  SELL_CONDITIONS,
  STORAGE_OPTIONS,
  conditionToApi,
  quoteSellPrice,
  type SellCondition,
} from '@/lib/sellQuote';

const HOLDING_EMAIL = 'sell@respawn.store';
const POST_ADDRESS = 'Respawn, Unit 4, Trade-in Desk, Manchester, M1 1AA';

const isItemType = (value: string | null): value is ItemTypeKey =>
  ITEM_TYPES.some((entry) => entry.key === value);

const isPlatform = (value: string | null): value is PlatformKey =>
  PLATFORMS.some((entry) => entry.key === value);

const RequestGame = () => {
  useDocumentTitle('Sell to us');

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAuthenticated = useAppSelector((state) => state.auth.status === 'authenticated');

  const [query, setQuery] = useState('');
  const [type, setType] = useState<ItemTypeKey>('consoles');
  const [platform, setPlatform] = useState<PlatformKey>('Xbox');
  const [condition, setCondition] = useState<SellCondition>('very_good');
  const [storage, setStorage] = useState('');
  const [gameType, setGameType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const nextType = searchParams.get('type');
    const nextPlatform = searchParams.get('platform');
    if (isItemType(nextType)) setType(nextType);
    if (isPlatform(nextPlatform)) setPlatform(nextPlatform);
  }, [searchParams]);

  const quote = useMemo(
    () => quoteSellPrice({ type, platform, condition, storage, gameType }),
    [type, platform, condition, storage, gameType]
  );

  const itemLabel = query.trim() || `my ${platform} ${type.slice(0, -1)}`;

  const acceptOffer = async () => {
    if (!isAuthenticated) {
      const next = `/sell?type=${type}&platform=${encodeURIComponent(platform)}`;
      navigate(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    setSubmitting(true);
    try {
      const featureBits = [
        type === 'consoles' && storage ? `Storage: ${storage}` : null,
        type === 'games' && gameType ? `Edition: ${gameType}` : null,
      ]
        .filter(Boolean)
        .join(' · ');

      await accountService.createGameRequest({
        title: itemLabel,
        platform,
        conditionPreference: conditionToApi(condition),
        maxBudget: quote,
        notes: [
          'SELL TO US',
          `Type: ${type}`,
          `Condition: ${condition}`,
          featureBits,
          `Quoted cash offer: ${formatPrice(quote)}`,
          `Verify via photos or send to ${POST_ADDRESS}. Holding email: ${HOLDING_EMAIL}.`,
        ]
          .filter(Boolean)
          .join('\n'),
      });

      setAccepted(true);
      dispatch(pushToast('Offer accepted — we will email you next steps', 'success'));
    } catch (error) {
      dispatch(pushToast(getErrorMessage(error), 'error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (accepted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 lg:px-6">
        <div className="card p-6 text-center sm:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
            <FiCheckCircle size={28} />
          </span>
          <h1 className="mt-4 text-2xl font-black text-ink-900">Offer accepted</h1>
          <p className="mt-2 text-sm text-ink-500">
            We have logged your {formatPrice(quote)} cash offer for <strong>{itemLabel}</strong>.
            We verify condition from photos or when the item arrives.
          </p>
          <div className="mt-6 space-y-3 rounded-2xl border border-ink-200 bg-ink-50 p-4 text-left text-sm">
            <p className="flex items-start gap-2 text-ink-700">
              <FiCamera className="mt-0.5 shrink-0 text-brand-400" size={16} />
              Email photos to <span className="font-semibold text-brand-400">{HOLDING_EMAIL}</span>
            </p>
            <p className="flex items-start gap-2 text-ink-700">
              <FiMapPin className="mt-0.5 shrink-0 text-brand-400" size={16} />
              Or post to {POST_ADDRESS}
            </p>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/account/requests">
              <Button>View my sell quotes</Button>
            </Link>
            <Button variant="outline" onClick={() => setAccepted(false)}>
              Sell another item
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-6 lg:py-10">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-400">Sell to us</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-ink-900">I want to sell my tech</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-500">
          Search what you are selling, pick the condition, and watch the cash offer update live.
          Once you accept, we verify with photos or when the parcel arrives.
        </p>
      </header>

      <div className="card space-y-6 p-5 sm:p-6">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink-800">Search what you want to sell</span>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. Xbox Series X, Mario Kart 8, DualSense…"
            leftIcon={<FiSearch size={16} />}
          />
        </label>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink-800">What is it?</legend>
          <div className="grid grid-cols-3 gap-2">
            {ITEM_TYPES.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setType(entry.key)}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-sm font-bold transition',
                  type === entry.key
                    ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                    : 'border-ink-300 text-ink-700 hover:border-brand-400'
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink-800">Platform</legend>
          <div className="grid grid-cols-3 gap-2">
            {PLATFORMS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setPlatform(entry.key)}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-sm font-bold transition',
                  platform === entry.key
                    ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                    : 'border-ink-300 text-ink-700 hover:border-brand-400'
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </fieldset>

        {type === 'consoles' && (
          <Select
            label="Storage size"
            value={storage}
            onChange={(event) => setStorage(event.target.value)}
            options={STORAGE_OPTIONS}
          />
        )}

        {type === 'games' && (
          <Select
            label="Game type / edition"
            value={gameType}
            onChange={(event) => setGameType(event.target.value)}
            options={GAME_TYPES}
          />
        )}

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink-800">Condition</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {SELL_CONDITIONS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setCondition(entry.key)}
                className={cn(
                  'rounded-xl border px-3 py-3 text-left transition',
                  condition === entry.key
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-ink-300 hover:border-brand-400'
                )}
              >
                <span className="block text-sm font-bold text-ink-900">{entry.label}</span>
                <span className="mt-0.5 block text-xs text-ink-500">{entry.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <motion.aside
        key={`${quote}-${condition}`}
        initial={{ opacity: 0.6, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card mt-5 overflow-hidden p-5 sm:p-6"
      >
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-400">Your cash offer</p>
        <p className="mt-1 text-sm text-ink-500">
          For <strong className="text-ink-900">{itemLabel}</strong> · {platform} ·{' '}
          {SELL_CONDITIONS.find((entry) => entry.key === condition)?.label}
        </p>
        <p className="mt-3 text-4xl font-black tracking-tight text-brand-400">{formatPrice(quote)}</p>
        <p className="mt-1 text-xs text-ink-400">
          Offer updates as you change condition or features. Final payout after we verify.
        </p>

        <Button
          className="mt-5"
          size="lg"
          fullWidth
          loading={submitting}
          onClick={acceptOffer}
          rightIcon={<FiArrowRight size={16} />}
        >
          {isAuthenticated ? 'Accept offer' : 'Sign in to accept offer'}
        </Button>
        <p className="mt-3 text-center text-xs text-ink-400">
          Next step: send photos to {HOLDING_EMAIL} or post to {POST_ADDRESS}.
        </p>
      </motion.aside>
    </div>
  );
};

export default RequestGame;
