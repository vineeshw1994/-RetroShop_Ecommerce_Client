import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiCreditCard,
  FiFileText,
  FiMail,
  FiMapPin,
  FiPhone,
  FiRefreshCw,
  FiTrash2,
  FiUser,
} from 'react-icons/fi';
import { DataTable, PageHeader, type Column } from '@/components/admin';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  ErrorState,
  Input,
  Modal,
  OrderStatusBadge,
  Select,
  Skeleton,
  SmartImage,
  Textarea,
} from '@/components/ui';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { useAsync, useDocumentTitle, usePermissions } from '@/hooks';
import { adminOrderService, adminTransactionService } from '@/services/admin.service';
import { getErrorMessage } from '@/lib/api';
import {
  ORDER_STATUS_LABELS,
  conditionLabel,
  formatDateTime,
  formatNumber,
  formatPrice,
} from '@/lib/format';
import type { OrderItem, OrderStatus, PaymentStatus } from '@/types';

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
};

const PAYMENT_STATUS_TONES: Record<PaymentStatus, 'neutral' | 'success' | 'danger' | 'warning'> = {
  unpaid: 'warning',
  paid: 'success',
  failed: 'danger',
  refunded: 'neutral',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'Card',
  cash_on_delivery: 'Cash on delivery',
  bank_transfer: 'Bank transfer',
};

const RESTOCKING_STATUSES: OrderStatus[] = ['cancelled', 'refunded'];
const DELETABLE_STATUSES: OrderStatus[] = ['cancelled', 'refunded'];

const InfoCard = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) => (
  <section className="card p-5">
    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-900">
      <span className="text-ink-400">{icon}</span>
      {title}
    </h2>
    {children}
  </section>
);

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canUpdate = can('orders:update');
  const canDelete = can('orders:delete');

  const { data, loading, error, reload } = useAsync(
    () => adminOrderService.get(orderId),
    [orderId]
  );

  const order = data?.data ?? null;
  const allowedTransitions = data?.meta?.allowedTransitions ?? [];

  useDocumentTitle(order ? `Order ${order.orderNumber}` : 'Order');

  const [statusOpen, setStatusOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courier, setCourier] = useState('');
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);

  const [adminNote, setAdminNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    if (!order) return;
    setAdminNote(order.adminNote ?? '');
    setTrackingNumber(order.trackingNumber ?? '');
    setCourier(order.courier ?? '');
  }, [order]);

  const openStatusModal = () => {
    setNextStatus(allowedTransitions[0] ?? '');
    setStatusNote('');
    setNotifyCustomer(true);
    setStatusOpen(true);
  };

  const submitStatus = async () => {
    if (!order || !nextStatus) return;

    setSavingStatus(true);
    try {
      await adminOrderService.updateStatus(order.id, {
        status: nextStatus as OrderStatus,
        note: statusNote || undefined,
        trackingNumber: nextStatus === 'shipped' ? trackingNumber || undefined : undefined,
        courier: nextStatus === 'shipped' ? courier || undefined : undefined,
        notifyCustomer,
      });
      dispatch(
        pushToast(
          `Order moved to ${ORDER_STATUS_LABELS[nextStatus as OrderStatus]}`,
          'success'
        )
      );
      setStatusOpen(false);
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setSavingStatus(false);
    }
  };

  const saveAdminNote = async () => {
    if (!order) return;

    setSavingNote(true);
    try {
      await adminOrderService.updateDetails(order.id, { adminNote });
      dispatch(pushToast('Internal note saved', 'success'));
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setSavingNote(false);
    }
  };

  const changePaymentStatus = async (value: string) => {
    if (!order) return;

    setSavingPayment(true);
    try {
      await adminOrderService.updateDetails(order.id, { paymentStatus: value });
      dispatch(pushToast('Payment status updated', 'success'));
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setSavingPayment(false);
    }
  };

  const confirmDelete = async () => {
    if (!order) return;

    setDeleting(true);
    try {
      await adminOrderService.remove(order.id);
      dispatch(pushToast(`${order.orderNumber} deleted`, 'success'));
      navigate('/admin/orders');
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
      setDeleting(false);
    }
  };

  const confirmStripeRefund = async () => {
    if (!order) return;

    setRefunding(true);
    try {
      await adminTransactionService.refundOrder(order.id, {
        note: 'Refunded from admin order screen',
      });
      dispatch(pushToast('Stripe refund issued and order marked as refunded', 'success'));
      setRefundOpen(false);
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setRefunding(false);
    }
  };

  const itemColumns: Column<OrderItem>[] = [
    {
      key: 'product',
      header: 'Item',
      render: (item) => (
        <div className="flex min-w-0 items-center gap-3">
          <SmartImage
            src={item.image}
            alt={item.name}
            wrapperClassName="h-12 w-12 rounded-lg"
            className="object-contain p-0.5"
          />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900">{item.name}</p>
            <p className="truncate font-mono text-[11px] text-ink-500">{item.sku || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'condition',
      header: 'Condition',
      hideBelow: 'md',
      render: (item) => <Badge>{conditionLabel(item.condition)}</Badge>,
    },
    {
      key: 'unitPrice',
      header: 'Unit price',
      hideBelow: 'sm',
      render: (item) => formatPrice(item.unitPrice),
    },
    {
      key: 'quantity',
      header: 'Qty',
      render: (item) => formatNumber(item.quantity),
    },
    {
      key: 'lineTotal',
      header: 'Line total',
      className: 'font-bold text-ink-900 whitespace-nowrap',
      render: (item) => formatPrice(item.lineTotal),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 w-full lg:col-span-2" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div>
        <PageHeader title="Order" breadcrumbs={[{ label: 'Orders', to: '/admin/orders' }]} />
        <div className="card">
          <ErrorState message={error || 'That order could not be found.'} onRetry={reload} />
        </div>
      </div>
    );
  }

  const events = [...(order.events ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const address = order.shippingAddress;
  const restocks = RESTOCKING_STATUSES.includes(nextStatus as OrderStatus);
  const noteChanged = adminNote !== (order.adminNote ?? '');

  return (
    <div>
      <PageHeader
        title={order.orderNumber}
        description={`Placed ${formatDateTime(order.placedAt || order.createdAt)}`}
        breadcrumbs={[{ label: 'Orders', to: '/admin/orders' }, { label: order.orderNumber }]}
        actions={
          <div className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} />
            {canDelete && DELETABLE_STATUSES.includes(order.status) && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<FiTrash2 size={14} />}
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section>
            <h2 className="mb-3 text-sm font-bold text-ink-900">
              Items ({formatNumber(order.itemCount)})
            </h2>

            <DataTable
              columns={itemColumns}
              rows={order.items ?? []}
              rowKey={(item) => item.id}
              emptyTitle="No items on this order"
              renderMobileCard={(item) => (
                <div className="card flex items-start gap-3 p-4">
                  <SmartImage
                    src={item.image}
                    alt={item.name}
                    wrapperClassName="h-16 w-16 rounded-lg"
                    className="object-contain p-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{item.name}</p>
                    <p className="font-mono text-[11px] text-ink-500">{item.sku || '—'}</p>
                    <p className="mt-1 text-xs text-ink-500">
                      {conditionLabel(item.condition)} · {formatPrice(item.unitPrice)} ×{' '}
                      {formatNumber(item.quantity)}
                    </p>
                    <p className="mt-1 font-bold text-ink-900">{formatPrice(item.lineTotal)}</p>
                  </div>
                </div>
              )}
            />
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-sm font-bold text-ink-900">Totals</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="font-medium text-ink-800">{formatPrice(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-500">Discount</dt>
                  <dd className="font-medium text-emerald-600">
                    −{formatPrice(order.discount)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between border-t border-ink-100 pt-2.5">
                <dt className="font-bold text-ink-900">Total</dt>
                <dd className="text-lg font-black text-ink-900">{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </section>

          {order.customerNote && (
            <section className="card p-5">
              <h2 className="mb-2 text-sm font-bold text-ink-900">Customer note</h2>
              <p className="whitespace-pre-line rounded-lg bg-ink-50 p-3 text-sm text-ink-700">
                {order.customerNote}
              </p>
            </section>
          )}

          <section className="card p-5">
            <h2 className="mb-4 text-sm font-bold text-ink-900">Timeline</h2>

            {events.length ? (
              <ol className="space-y-4">
                {events.map((event, index) => (
                  <li key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" />
                      {index < events.length - 1 && (
                        <span className="mt-1 w-px flex-1 bg-ink-200" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <OrderStatusBadge status={event.status} />
                        <span className="text-xs text-ink-400">
                          {formatDateTime(event.createdAt)}
                        </span>
                      </div>
                      {event.note && (
                        <p className="mt-1.5 text-sm text-ink-700">{event.note}</p>
                      )}
                      <p className="mt-0.5 text-xs text-ink-500">
                        {event.createdBy ? `by ${event.createdBy.name}` : 'by the system'}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-ink-500">No events recorded yet.</p>
            )}
          </section>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <InfoCard title="Status" icon={<FiRefreshCw size={15} />}>
            <div className="flex items-center justify-between gap-3">
              <OrderStatusBadge status={order.status} />
              {order.trackingNumber && (
                <span className="text-xs text-ink-500">
                  {order.courier ? `${order.courier} · ` : ''}
                  {order.trackingNumber}
                </span>
              )}
            </div>

            {canUpdate &&
              (allowedTransitions.length ? (
                <Button
                  fullWidth
                  size="sm"
                  className="mt-4"
                  leftIcon={<FiRefreshCw size={14} />}
                  onClick={openStatusModal}
                >
                  Change status
                </Button>
              ) : (
                <p className="mt-3 text-xs text-ink-500">
                  This order has reached a final state — no further changes are allowed.
                </p>
              ))}
          </InfoCard>

          <InfoCard title="Customer" icon={<FiUser size={15} />}>
            {order.customer ? (
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-ink-900">
                  {order.customer.firstName} {order.customer.lastName}
                </p>
                <p className="flex items-center gap-2 text-ink-600">
                  <FiMail size={13} className="shrink-0 text-ink-400" />
                  <span className="truncate">{order.customer.email}</span>
                </p>
                {order.customer.phone && (
                  <p className="flex items-center gap-2 text-ink-600">
                    <FiPhone size={13} className="shrink-0 text-ink-400" />
                    {order.customer.phone}
                  </p>
                )}
                <Link
                  to={`/admin/customers/${order.customer.id}`}
                  className="inline-block pt-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700"
                >
                  View customer profile
                </Link>
              </div>
            ) : (
              <p className="text-sm text-ink-500">Guest checkout — no linked account.</p>
            )}
          </InfoCard>

          <InfoCard title="Delivery address" icon={<FiMapPin size={15} />}>
            <address className="space-y-0.5 text-sm not-italic text-ink-700">
              <p className="font-semibold text-ink-900">{address.fullName}</p>
              <p>{address.line1}</p>
              {address.line2 && <p>{address.line2}</p>}
              <p>
                {address.city}
                {address.state ? `, ${address.state}` : ''} {address.postcode}
              </p>
              <p>{address.country}</p>
              <p className="pt-1 text-ink-500">{address.phone}</p>
            </address>
          </InfoCard>

          <InfoCard title="Payment" icon={<FiCreditCard size={15} />}>
            <div className="mb-3 flex items-center justify-between gap-3 text-sm">
              <span className="text-ink-500">
                {PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
              </span>
              <Badge tone={PAYMENT_STATUS_TONES[order.paymentStatus]}>
                {PAYMENT_STATUS_LABELS[order.paymentStatus]}
              </Badge>
            </div>

            {canUpdate && (
              <Select
                label="Payment status"
                options={Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
                value={order.paymentStatus}
                disabled={savingPayment}
                onChange={(event) => void changePaymentStatus(event.target.value)}
              />
            )}

            {order.paidAt && (
              <p className="mt-2 text-xs text-ink-500">Paid {formatDateTime(order.paidAt)}</p>
            )}

            {order.paymentIntentId && (
              <p className="mt-2 break-all font-mono text-[11px] text-ink-400">
                Stripe PI: {order.paymentIntentId}
              </p>
            )}

            {canUpdate &&
              order.paymentMethod === 'card' &&
              order.paymentStatus === 'paid' &&
              !['refunded', 'cancelled'].includes(order.status) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  leftIcon={<FiRefreshCw size={14} />}
                  onClick={() => setRefundOpen(true)}
                >
                  Refund via Stripe
                </Button>
              )}
          </InfoCard>

          <InfoCard title="Internal note" icon={<FiFileText size={15} />}>
            <Textarea
              rows={4}
              value={adminNote}
              disabled={!canUpdate}
              placeholder="Only staff can see this."
              onChange={(event) => setAdminNote(event.target.value)}
            />

            {canUpdate && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                loading={savingNote}
                disabled={!noteChanged}
                onClick={saveAdminNote}
              >
                Save note
              </Button>
            )}
          </InfoCard>
        </div>
      </div>

      <Modal
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        title="Change order status"
        description={`${order.orderNumber} is currently ${ORDER_STATUS_LABELS[order.status]}.`}
        closeOnBackdrop={!savingStatus}
        footer={
          <>
            <Button variant="outline" onClick={() => setStatusOpen(false)} disabled={savingStatus}>
              Cancel
            </Button>
            <Button
              variant={restocks ? 'danger' : 'primary'}
              loading={savingStatus}
              disabled={!nextStatus}
              onClick={submitStatus}
            >
              Update status
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="New status"
            required
            placeholder="Choose a status"
            options={allowedTransitions.map((status) => ({
              value: status,
              label: ORDER_STATUS_LABELS[status],
            }))}
            value={nextStatus}
            onChange={(event) => setNextStatus(event.target.value)}
            hint="Only the transitions the server allows from here are listed."
          />

          {restocks && (
            <div className="flex gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
              <FiAlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-600" />
              <p className="text-sm text-rose-700">
                Every item on this order is returned to stock straight away. This cannot be undone
                from the dashboard.
              </p>
            </div>
          )}

          {nextStatus === 'shipped' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Tracking number"
                value={trackingNumber}
                onChange={(event) => setTrackingNumber(event.target.value)}
                placeholder="e.g. RM123456789GB"
              />
              <Input
                label="Courier"
                value={courier}
                onChange={(event) => setCourier(event.target.value)}
                placeholder="e.g. Royal Mail"
              />
            </div>
          )}

          <Textarea
            label="Note"
            rows={3}
            value={statusNote}
            onChange={(event) => setStatusNote(event.target.value)}
            placeholder="Optional — added to the order timeline."
          />

          <Checkbox
            label="Notify the customer by email"
            description="Sends a status update to their registered address."
            checked={notifyCustomer}
            onChange={(event) => setNotifyCustomer(event.target.checked)}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete this order?"
        confirmLabel="Delete order"
        message={
          <>
            <strong>{order.orderNumber}</strong> and its history are removed permanently. Only
            cancelled or refunded orders can be deleted.
          </>
        }
      />

      <ConfirmDialog
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        onConfirm={confirmStripeRefund}
        loading={refunding}
        title="Refund via Stripe?"
        confirmLabel="Issue refund"
        message={
          <>
            This refunds {formatPrice(order.total)} to the customer&apos;s card, restocks the items,
            and marks {order.orderNumber} as refunded. This cannot be undone.
          </>
        }
      />
    </div>
  );
};

export default OrderDetail;
