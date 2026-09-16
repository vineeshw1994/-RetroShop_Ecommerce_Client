import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiAlertTriangle,
  FiArrowRight,
  FiMinus,
  FiPlus,
  FiShoppingCart,
  FiTrash2,
} from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  applyCoupon,
  clearBasket,
  removeBasketLine,
  updateBasketLine,
} from '@/store/slices/basketSlice';
import { pushToast } from '@/store/slices/uiSlice';
import { useDocumentTitle } from '@/hooks';
import { conditionLabel, formatPrice } from '@/lib/format';
import cn from '@/lib/cn';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Skeleton,
  SmartImage,
} from '@/components/ui';
import type { BasketLine } from '@/types';

const BasketSkeleton = () => (
  <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-32 w-full" />
      ))}
    </div>
    <Skeleton className="h-64 w-full" />
  </div>
);

const LineRow = ({
  line,
  isAuthenticated,
  busy,
}: {
  line: BasketLine;
  isAuthenticated: boolean;
  busy: boolean;
}) => {
  const dispatch = useAppDispatch();
  const hasIssue = line.isUnavailable || line.exceedsStock;

  const setQuantity = (quantity: number) => {
    if (quantity < 1 || quantity > Math.max(1, Math.min(line.maxQuantity, 10))) return;
    void dispatch(
      updateBasketLine({ lineId: line.id, productId: line.productId, quantity, isAuthenticated })
    );
  };

  const remove = async () => {
    const result = await dispatch(
      removeBasketLine({ lineId: line.id, productId: line.productId, isAuthenticated })
    );
    if (removeBasketLine.fulfilled.match(result)) {
      dispatch(pushToast('Removed from your basket', 'info'));
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('card p-3 sm:p-4', busy && 'opacity-60')}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <Link to={`/product/${line.slug}`} className="shrink-0">
          <SmartImage
            src={line.image}
            alt={line.name}
            wrapperClassName="h-24 w-24 rounded-lg sm:h-28 sm:w-28"
            className="object-contain p-1"
          />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                to={`/product/${line.slug}`}
                className="line-clamp-2 text-sm font-bold text-ink-900 transition hover:text-brand-600"
              >
                {line.name}
              </Link>

              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{conditionLabel(line.condition)}</Badge>
                {line.platform && <span className="text-xs text-ink-400">{line.platform}</span>}
              </div>

              <p className="mt-1.5 text-xs text-ink-500">{formatPrice(line.unitPrice)} each</p>
            </div>

            <button
              type="button"
              onClick={remove}
              disabled={busy}
              aria-label={`Remove ${line.name}`}
              className="shrink-0 rounded-lg p-2 text-ink-400 transition hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed"
            >
              <FiTrash2 size={16} />
            </button>
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
            <div className="flex h-9 items-center rounded-lg border border-ink-200 bg-white">
              <button
                type="button"
                onClick={() => setQuantity(line.quantity - 1)}
                disabled={busy || line.quantity <= 1}
                aria-label="Decrease quantity"
                className="flex h-full w-9 items-center justify-center text-ink-600 transition hover:text-brand-600 disabled:cursor-not-allowed disabled:text-ink-300"
              >
                <FiMinus size={14} />
              </button>

              <span className="w-8 text-center text-sm font-bold text-ink-900">
                {line.quantity}
              </span>

              <button
                type="button"
                onClick={() => setQuantity(line.quantity + 1)}
                disabled={busy || line.quantity >= Math.min(line.maxQuantity, 10)}
                aria-label="Increase quantity"
                className="flex h-full w-9 items-center justify-center text-ink-600 transition hover:text-brand-600 disabled:cursor-not-allowed disabled:text-ink-300"
              >
                <FiPlus size={14} />
              </button>
            </div>

            <p className="text-base font-extrabold text-ink-900">{formatPrice(line.lineTotal)}</p>
          </div>
        </div>
      </div>

      {hasIssue && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800">
          <span className="flex items-center gap-2">
            <FiAlertTriangle size={14} className="shrink-0" />
            {line.isUnavailable
              ? 'This item has sold out and cannot be ordered.'
              : `Only ${line.stock} left — reduce the quantity to continue.`}
          </span>

          <button
            type="button"
            onClick={line.isUnavailable ? remove : () => setQuantity(Math.max(1, line.stock))}
            className="font-bold text-amber-900 underline underline-offset-2"
          >
            {line.isUnavailable ? 'Remove item' : `Set to ${Math.max(1, line.stock)}`}
          </button>
        </div>
      )}
    </motion.article>
  );
};

const Basket = () => {
  useDocumentTitle('Your basket');

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const lines = useAppSelector((state) => state.basket.lines);
  const summary = useAppSelector((state) => state.basket.summary);
  const status = useAppSelector((state) => state.basket.status);
  const updatingLineId = useAppSelector((state) => state.basket.updatingLineId);
  const isAuthenticated = useAppSelector((state) => state.auth.status === 'authenticated');

  const [confirmClear, setConfirmClear] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);

  const shell = 'mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8';

  if (status === 'loading' || status === 'idle') {
    return (
      <div className={shell}>
        <h1 className="mb-6 text-2xl font-black tracking-tight text-ink-900">Your basket</h1>
        <BasketSkeleton />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className={shell}>
        <EmptyState
          icon={<FiShoppingCart size={24} />}
          title="Your basket is empty"
          message="Once you add a game or console it will show up here, ready to check out."
          action={{ label: 'Start shopping', onClick: () => navigate('/search') }}
        />
      </div>
    );
  }

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login?next=/checkout');
      return;
    }
    navigate('/checkout');
  };

  return (
    <div className={shell}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight text-ink-900 sm:text-3xl">
          Your basket
          <span className="ml-2 text-base font-semibold text-ink-400">
            {summary.itemCount} {summary.itemCount === 1 ? 'item' : 'items'}
          </span>
        </h1>

        <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
          Clear basket
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {lines.map((line) => (
            <LineRow
              key={line.id}
              line={line}
              isAuthenticated={isAuthenticated}
              busy={updatingLineId === line.id}
            />
          ))}

          <Link
            to="/search"
            className="inline-flex items-center gap-1.5 pt-2 text-sm font-bold text-brand-600 transition hover:text-brand-700"
          >
            Continue shopping
            <FiArrowRight size={14} />
          </Link>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="card p-5">
            <h2 className="text-base font-bold text-ink-900">Order summary</h2>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="font-semibold text-ink-900">{formatPrice(summary.subtotal)}</dd>
              </div>

              {summary.discount > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-ink-500">
                    Discount{summary.couponCode ? ` (${summary.couponCode})` : ''}
                  </dt>
                  <dd className="font-semibold text-emerald-600">−{formatPrice(summary.discount)}</dd>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-ink-100 pt-3">
                <dt className="text-base font-bold text-ink-900">Total</dt>
                <dd className="text-xl font-black text-ink-900">{formatPrice(summary.total)}</dd>
              </div>
            </dl>

            {isAuthenticated && (
              <form
                className="mt-4 flex gap-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const code = couponInput.trim();
                  if (!code) return;
                  setCouponBusy(true);
                  const result = await dispatch(applyCoupon(code));
                  setCouponBusy(false);
                  if (applyCoupon.fulfilled.match(result)) {
                    dispatch(pushToast(result.payload.message, 'success'));
                  } else {
                    dispatch(pushToast(String(result.payload || 'Coupon could not be applied'), 'error'));
                  }
                }}
              >
                <Input
                  value={couponInput}
                  onChange={(event) => setCouponInput(event.target.value)}
                  placeholder="Coupon code"
                  aria-label="Coupon code"
                />
                <Button type="submit" variant="outline" loading={couponBusy} disabled={couponBusy}>
                  Apply
                </Button>
              </form>
            )}

            {summary.hasIssues && (
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs font-medium text-amber-800">
                <FiAlertTriangle size={14} className="mt-0.5 shrink-0" />
                Fix the flagged items above before you check out.
              </p>
            )}

            <Button
              fullWidth
              size="lg"
              className="mt-4"
              onClick={handleCheckout}
              disabled={summary.hasIssues || lines.length === 0}
              rightIcon={<FiArrowRight size={16} />}
            >
              Checkout
            </Button>

            {!isAuthenticated && (
              <p className="mt-3 text-center text-xs text-ink-500">
                You will be asked to sign in first — your basket is kept for you.
              </p>
            )}
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          void dispatch(clearBasket(isAuthenticated));
          setConfirmClear(false);
          dispatch(pushToast('Basket cleared', 'info'));
        }}
        title="Clear your basket?"
        message="This removes every item. You can always add them again later."
        confirmLabel="Clear basket"
      />
    </div>
  );
};

export default Basket;
