import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiCheck,
  FiChevronRight,
  FiClock,
  FiCreditCard,
  FiMapPin,
  FiMessageSquare,
  FiRotateCcw,
  FiStar,
  FiTruck,
  FiXCircle,
} from 'react-icons/fi';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { orderService } from '@/services/shop.service';
import { accountService } from '@/services/account.service';
import { ApiError, getErrorMessage } from '@/lib/api';
import { useAsync, useDocumentTitle } from '@/hooks';
import {
  ORDER_STATUS_LABELS,
  ORDER_TIMELINE,
  conditionLabel,
  formatDate,
  formatDateTime,
  formatPrice,
  formatRelative,
} from '@/lib/format';
import cn from '@/lib/cn';
import {
  Badge,
  Button,
  ConfirmDialog,
  ErrorState,
  Input,
  Modal,
  OrderStatusBadge,
  Skeleton,
  SmartImage,
  StarRating,
  Textarea,
} from '@/components/ui';
import type { Order, OrderItem, OrderStatus, PaymentMethod, PaymentStatus } from '@/types';

const CANCELLABLE: OrderStatus[] = ['pending', 'confirmed', 'processing'];

const PAYMENT_TONES: Record<PaymentStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  paid: 'success',
  unpaid: 'warning',
  failed: 'danger',
  refunded: 'neutral',
};

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  paid: 'Paid',
  unpaid: 'Unpaid',
  failed: 'Payment failed',
  refunded: 'Refunded',
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: 'Card payment',
  cash_on_delivery: 'Cash on delivery',
  bank_transfer: 'Bank transfer',
};

const InfoCard = ({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) => (
  <section className="card p-5">
    <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-500">
      <span className="text-ink-400">{icon}</span>
      {title}
    </h2>
    <div className="mt-3 text-sm text-ink-700">{children}</div>
  </section>
);

const StatusTimeline = ({ order }: { order: Order }) => {
  const isCancelled = order.status === 'cancelled';
  const isRefunded = order.status === 'refunded';

  if (isCancelled || isRefunded) {
    return (
      <section className="card p-5">
        <div className="flex items-start gap-4">
          <span
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
              isRefunded ? 'bg-rose-50 text-rose-600' : 'bg-ink-100 text-ink-600'
            )}
          >
            {isRefunded ? <FiRotateCcw size={19} /> : <FiXCircle size={19} />}
          </span>

          <div>
            <h2 className="text-sm font-bold text-ink-900">
              {isRefunded ? 'This order was refunded' : 'This order was cancelled'}
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              {isRefunded
                ? 'The payment has been returned to your original payment method.'
                : `Cancelled on ${formatDateTime(order.cancelledAt || order.updatedAt)}.`}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const currentIndex = ORDER_TIMELINE.indexOf(order.status);

  return (
    <section className="card p-5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-ink-500">Progress</h2>

      <ol className="mt-5 flex items-start">
        {ORDER_TIMELINE.map((step, index) => {
          const done = currentIndex > index;
          const current = currentIndex === index;
          const reached = done || current;
          const event = order.events?.find((entry) => entry.status === step);

          return (
            <li key={step} className="relative flex flex-1 flex-col items-center text-center">
              {index > 0 && (
                <span
                  className={cn(
                    'absolute right-1/2 top-3.5 h-0.5 w-full',
                    reached ? 'bg-brand-600' : 'bg-ink-200'
                  )}
                />
              )}

              <span
                className={cn(
                  'relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ring-4 ring-white transition',
                  done && 'bg-brand-600 text-white',
                  current && 'bg-brand-600 text-white shadow-[0_0_0_4px_var(--color-brand-100)]',
                  !reached && 'bg-ink-100 text-ink-400'
                )}
              >
                {done ? <FiCheck size={15} /> : index + 1}
              </span>

              <span
                className={cn(
                  'mt-2 text-[11px] font-semibold leading-tight',
                  current ? 'text-brand-700' : reached ? 'text-ink-700' : 'text-ink-400'
                )}
              >
                {ORDER_STATUS_LABELS[step]}
              </span>

              {event && (
                <span className="mt-0.5 hidden text-[10px] text-ink-400 sm:block">
                  {formatDate(event.createdAt)}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {order.status === 'pending' && (
        <p className="mt-5 rounded-lg bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-700">
          We are waiting to confirm this order — you will get an email as soon as it moves on.
        </p>
      )}
    </section>
  );
};

const OrderDetail = () => {
  const { orderNumber = '' } = useParams();
  useDocumentTitle(orderNumber ? `Order ${orderNumber}` : 'Order');

  const dispatch = useAppDispatch();

  const { data, loading, error, reload } = useAsync(
    () => orderService.get(orderNumber),
    [orderNumber]
  );

  const order = data?.data;
  const returnMeta = data?.meta?.return;

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const [reviewItem, setReviewItem] = useState<OrderItem | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const closeReview = () => {
    setReviewItem(null);
    setRating(0);
    setReviewTitle('');
    setReviewBody('');
  };

  const handleCancel = async () => {
    if (!order) return;

    setCancelling(true);
    try {
      await orderService.cancel(order.orderNumber, cancelReason.trim() || undefined);
      dispatch(pushToast('Your order has been cancelled', 'success'));
      setCancelOpen(false);
      setCancelReason('');
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setCancelling(false);
    }
  };

  const handleReturnSubmit = async () => {
    if (!order) return;

    const reason = returnReason.trim();
    if (reason.length < 10) {
      dispatch(pushToast('Please tell us a bit more about why you want to return this order', 'error'));
      return;
    }

    setSubmittingReturn(true);
    try {
      await orderService.requestReturn(order.orderNumber, reason);
      dispatch(pushToast('Return request submitted — we will be in touch shortly', 'success'));
      setReturnOpen(false);
      setReturnReason('');
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewItem?.productId || rating < 1) return;

    setSubmittingReview(true);
    try {
      await accountService.createReview({
        productId: reviewItem.productId,
        rating,
        title: reviewTitle.trim() || undefined,
        body: reviewBody.trim() || undefined,
      });
      dispatch(pushToast('Thanks — your review has been posted', 'success'));
      closeReview();
    } catch (caught) {
      const message =
        caught instanceof ApiError && caught.status === 403
          ? 'You can only review games from an order that has reached you. If you have already reviewed this one, you cannot review it twice.'
          : getErrorMessage(caught);
      dispatch(pushToast(message, 'error'));
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <ErrorState
        message={error || `We could not find order ${orderNumber}.`}
        onRetry={reload}
      />
    );
  }

  const items = order.items || [];
  const address = order.shippingAddress;
  const canCancel = CANCELLABLE.includes(order.status);
  const canReview = order.status === 'delivered';
  const canReturn = Boolean(returnMeta?.canRequest);
  const returnRequest = returnMeta?.request;

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-ink-500">
        <Link to="/account/orders" className="font-medium transition hover:text-brand-600">
          My orders
        </Link>
        <FiChevronRight size={12} className="text-ink-300" />
        <span className="text-ink-400">{order.orderNumber}</span>
      </nav>

      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <h1 className="text-xl font-black tracking-tight text-ink-900 sm:text-2xl">
            {order.orderNumber}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Placed {formatDateTime(order.placedAt || order.createdAt)}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <Badge tone={PAYMENT_TONES[order.paymentStatus]}>
              {PAYMENT_LABELS[order.paymentStatus]}
            </Badge>
          </div>
        </div>

        {canCancel && (
          <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)}>
            Cancel order
          </Button>
        )}

        {canReturn && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<FiRotateCcw size={14} />}
            onClick={() => setReturnOpen(true)}
          >
            Request return
            {returnMeta && returnMeta.daysRemaining > 0
              ? ` (${returnMeta.daysRemaining} day${returnMeta.daysRemaining === 1 ? '' : 's'} left)`
              : ''}
          </Button>
        )}
      </motion.header>

      {returnRequest && (
        <section className="card border-brand-100 bg-brand-50/40 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand-600">
              <FiRotateCcw size={18} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink-900">
                Return request {returnRequest.status}
              </h2>
              <p className="mt-1 text-sm text-ink-600">
                Submitted {formatDateTime(returnRequest.createdAt)}.
                {returnRequest.adminNote ? ` ${returnRequest.adminNote}` : ' We will email you with next steps.'}
              </p>
            </div>
          </div>
        </section>
      )}

      <StatusTimeline order={order} />

      <div className="grid gap-5 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="space-y-5">
          <section className="card overflow-hidden">
            <header className="border-b border-ink-100 px-5 py-4">
              <h2 className="text-sm font-bold text-ink-900">
                {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
              </h2>
            </header>

            <ul className="divide-y divide-ink-100">
              {items.map((item) => (
                <li key={item.id} className="flex items-start gap-4 p-5">
                  <SmartImage
                    src={item.image}
                    alt={item.name}
                    wrapperClassName="h-20 w-20 rounded-lg border border-ink-100"
                    className="object-contain p-1"
                  />

                  <div className="min-w-0 flex-1">
                    {item.slug ? (
                      <Link
                        to={`/product/${item.slug}`}
                        className="text-sm font-semibold text-ink-900 transition hover:text-brand-600"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold text-ink-900">{item.name}</p>
                    )}

                    <p className="mt-1 text-xs text-ink-500">
                      {conditionLabel(item.condition)}
                      {item.sku ? ` · ${item.sku}` : ''}
                    </p>

                    <p className="mt-2 text-xs text-ink-500">
                      {formatPrice(item.unitPrice)} × {item.quantity}
                    </p>

                    {canReview && item.productId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 -ml-3"
                        leftIcon={<FiStar size={14} />}
                        onClick={() => setReviewItem(item)}
                      >
                        Write a review
                      </Button>
                    )}
                  </div>

                  <p className="shrink-0 text-sm font-extrabold text-ink-900">
                    {formatPrice(item.lineTotal)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {order.events && order.events.length > 0 && (
            <section className="card p-5">
              <h2 className="text-xs font-bold uppercase tracking-wide text-ink-500">
                Activity log
              </h2>

              <ol className="mt-4 space-y-0">
                {order.events.map((event, index) => (
                  <li key={event.id} className="relative flex gap-4 pb-5 last:pb-0">
                    {index < (order.events?.length || 0) - 1 && (
                      <span className="absolute left-[11px] top-6 h-full w-0.5 bg-ink-100" />
                    )}

                    <span
                      className={cn(
                        'relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-4 ring-white',
                        index === 0 ? 'bg-brand-600 text-white' : 'bg-ink-200 text-ink-600'
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink-900">
                        {ORDER_STATUS_LABELS[event.status]}
                      </p>
                      {event.note && <p className="mt-0.5 text-sm text-ink-600">{event.note}</p>}
                      <p className="mt-0.5 text-xs text-ink-400">
                        {formatDateTime(event.createdAt)} · {formatRelative(event.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="text-xs font-bold uppercase tracking-wide text-ink-500">Totals</h2>

            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="font-semibold text-ink-800">{formatPrice(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-ink-500">Discount</dt>
                  <dd className="font-semibold text-emerald-600">
                    −{formatPrice(order.discount)}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-ink-100 pt-2.5">
                <dt className="text-sm font-bold text-ink-900">Total</dt>
                <dd className="text-lg font-black text-ink-900">{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </section>

          <InfoCard icon={<FiMapPin size={13} />} title="Delivery address">
            <p className="font-semibold text-ink-900">{address.fullName}</p>
            <p className="mt-1 leading-relaxed text-ink-600">
              {[
                address.line1,
                address.line2,
                address.city,
                address.state,
                address.postcode,
                address.country,
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
            <p className="mt-1 text-ink-500">{address.phone}</p>
          </InfoCard>

          <InfoCard icon={<FiCreditCard size={13} />} title="Payment">
            <p className="font-semibold text-ink-900">
              {PAYMENT_METHOD_LABELS[order.paymentMethod]}
            </p>
            <div className="mt-2">
              <Badge tone={PAYMENT_TONES[order.paymentStatus]}>
                {PAYMENT_LABELS[order.paymentStatus]}
              </Badge>
            </div>
            {order.paidAt && (
              <p className="mt-2 text-xs text-ink-500">Paid {formatDateTime(order.paidAt)}</p>
            )}
          </InfoCard>

          <InfoCard icon={<FiTruck size={13} />} title="Tracking">
            {order.trackingNumber || order.courier ? (
              <>
                {order.courier && <p className="font-semibold text-ink-900">{order.courier}</p>}
                {order.trackingNumber && (
                  <p className="mt-1 font-mono text-sm text-ink-700">{order.trackingNumber}</p>
                )}
                {order.shippedAt && (
                  <p className="mt-2 text-xs text-ink-500">
                    Dispatched {formatDateTime(order.shippedAt)}
                  </p>
                )}
              </>
            ) : (
              <p className="flex items-center gap-2 text-ink-500">
                <FiClock size={14} className="text-ink-400" />
                Tracking appears here once your parcel is dispatched.
              </p>
            )}
          </InfoCard>

          {order.customerNote && (
            <InfoCard icon={<FiMessageSquare size={13} />} title="Your note">
              <p className="italic text-ink-600">“{order.customerNote}”</p>
            </InfoCard>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
        loading={cancelling}
        title="Cancel this order?"
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        message={
          <>
            <p>
              We will release the reserved stock and refund anything already paid. This cannot be
              undone.
            </p>
            <Textarea
              className="mt-3"
              rows={3}
              label="Reason (optional)"
              placeholder="Let us know why, so we can improve"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
            />
          </>
        }
      />

      <Modal
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        title="Request a return"
        description={
          returnMeta
            ? `You have ${returnMeta.daysRemaining} day${returnMeta.daysRemaining === 1 ? '' : 's'} left in your ${returnMeta.returnDays}-day return window.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setReturnOpen(false)} disabled={submittingReturn}>
              Cancel
            </Button>
            <Button loading={submittingReturn} onClick={handleReturnSubmit}>
              Submit return request
            </Button>
          </>
        }
      >
        <Textarea
          rows={5}
          label="Why do you want to return this order?"
          placeholder="Tell us what arrived and why you would like to send it back"
          value={returnReason}
          onChange={(event) => setReturnReason(event.target.value)}
        />
      </Modal>

      <Modal
        open={Boolean(reviewItem)}
        onClose={closeReview}
        title="Write a review"
        description={reviewItem?.name}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={closeReview} disabled={submittingReview}>
              Cancel
            </Button>
            <Button
              onClick={handleReviewSubmit}
              loading={submittingReview}
              disabled={rating < 1}
            >
              Post review
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-700">
              Your rating<span className="ml-0.5 text-brand-600">*</span>
            </p>
            <StarRating value={rating} size={26} showValue={false} onChange={setRating} />
          </div>

          <Input
            label="Headline (optional)"
            maxLength={120}
            placeholder="Sums up your experience"
            value={reviewTitle}
            onChange={(event) => setReviewTitle(event.target.value)}
          />

          <Textarea
            label="Your review (optional)"
            rows={4}
            maxLength={1500}
            placeholder="How was the condition, the packaging, the delivery?"
            value={reviewBody}
            onChange={(event) => setReviewBody(event.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

export default OrderDetail;
