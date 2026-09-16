import { useEffect, useState } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { z } from 'zod';

import {

  FiAlertTriangle,

  FiChevronDown,

  FiChevronUp,

  FiCreditCard,

  FiDollarSign,

  FiHome,

  FiLock,

  FiPlus,

} from 'react-icons/fi';

import { useAppDispatch, useAppSelector } from '@/store';

import { applyCoupon, fetchBasket } from '@/store/slices/basketSlice';

import { pushToast } from '@/store/slices/uiSlice';

import { accountService } from '@/services/account.service';

import { orderService, type CheckoutPayload } from '@/services/shop.service';

import { ApiError, getErrorMessage } from '@/lib/api';

import { useAsync, useDocumentTitle } from '@/hooks';

import { formatPrice } from '@/lib/format';

import cn from '@/lib/cn';

import {

  Button,

  Checkbox,

  Input,

  Modal,

  Skeleton,

  SmartImage,

  Textarea,

} from '@/components/ui';

import StripePay from '@/components/shop/StripePay';

import type { Address, PaymentMethod } from '@/types';



const PAYMENT_METHODS: {

  value: PaymentMethod;

  label: string;

  description: string;

  icon: typeof FiCreditCard;

}[] = [

  {

    value: 'card',

    label: 'Card',

    description: 'Visa, Mastercard, Amex',

    icon: FiCreditCard,

  },

  {

    value: 'cash_on_delivery',

    label: 'Cash on delivery',

    description: 'Pay when your parcel arrives',

    icon: FiDollarSign,

  },

  {

    value: 'bank_transfer',

    label: 'Bank transfer',

    description: 'We email account details with your order',

    icon: FiHome,

  },

];



const addressSchema = z.object({

  fullName: z.string().min(2, 'Enter the name for this delivery'),

  phone: z.string().min(7, 'Enter a contact number'),

  line1: z.string().min(3, 'Enter the street address'),

  line2: z.string().optional(),

  city: z.string().min(2, 'Enter a town or city'),

  state: z.string().optional(),

  postcode: z.string().min(3, 'Enter a postcode'),

  country: z.string().min(2, 'Enter a country'),

  saveAddress: z.boolean(),

});



type AddressForm = z.infer<typeof addressSchema>;



const formatAddress = (address: Address | AddressForm) =>

  [address.line1, address.line2, address.city, address.state, address.postcode, address.country]

    .filter(Boolean)

    .join(', ');



const Checkout = () => {

  useDocumentTitle('Checkout');



  const dispatch = useAppDispatch();

  const navigate = useNavigate();



  const user = useAppSelector((state) => state.auth.user);

  const lines = useAppSelector((state) => state.basket.lines);

  const summary = useAppSelector((state) => state.basket.summary);

  const basketStatus = useAppSelector((state) => state.basket.status);



  const [addressId, setAddressId] = useState<number | null>(null);

  const [useNewAddress, setUseNewAddress] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  const [note, setNote] = useState('');

  const [placing, setPlacing] = useState(false);

  const [placed, setPlaced] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [couponInput, setCouponInput] = useState(summary.couponCode || '');

  const [couponBusy, setCouponBusy] = useState(false);

  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const [pendingOrderNumber, setPendingOrderNumber] = useState<string | null>(null);

  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);



  const addresses = useAsync(async () => (await accountService.listAddresses()).data, []);



  const {

    register,

    handleSubmit,

    formState: { errors },

  } = useForm<AddressForm>({

    resolver: zodResolver(addressSchema),

    defaultValues: {

      fullName: user ? `${user.firstName} ${user.lastName}`.trim() : '',

      phone: user?.phone || '',

      line1: '',

      line2: '',

      city: '',

      state: '',

      postcode: '',

      country: 'United Kingdom',

      saveAddress: true,

    },

  });



  const saved = addresses.data;



  useEffect(() => {

    if (!saved) return;



    if (saved.length === 0) {

      setUseNewAddress(true);

      return;

    }



    setAddressId((current) => current ?? (saved.find((entry) => entry.isDefault) || saved[0]).id);

  }, [saved]);



  useEffect(() => {

    if (placed) return;

    if (basketStatus === 'ready' && lines.length === 0) navigate('/basket', { replace: true });

  }, [basketStatus, lines.length, navigate, placed]);



  const submitOrder = async (newAddressValues?: AddressForm) => {

    setPlacing(true);

    setError(null);



    try {

      let deliveryAddressId = useNewAddress ? undefined : (addressId ?? undefined);



      if (useNewAddress) {

        if (!newAddressValues) {

          setError('Complete your delivery address to continue.');

          setPlacing(false);

          return;

        }



        if (newAddressValues.saveAddress) {

          const created = await accountService.createAddress({

            fullName: newAddressValues.fullName,

            phone: newAddressValues.phone,

            line1: newAddressValues.line1,

            line2: newAddressValues.line2 || null,

            city: newAddressValues.city,

            state: newAddressValues.state || null,

            postcode: newAddressValues.postcode,

            country: newAddressValues.country,

          });

          deliveryAddressId = created.data.id;

        }

      } else if (!deliveryAddressId) {

        setError('Choose a delivery address to continue.');

        setPlacing(false);

        return;

      }



      const payload: CheckoutPayload = {

        paymentMethod,

        customerNote: note.trim() || undefined,

        couponCode: summary.couponCode || couponInput.trim() || undefined,

      };



      if (deliveryAddressId) {

        payload.addressId = deliveryAddressId;

      } else if (newAddressValues) {

        const shipping: Record<string, string> = {

          fullName: newAddressValues.fullName,

          phone: newAddressValues.phone,

          line1: newAddressValues.line1,

          city: newAddressValues.city,

          postcode: newAddressValues.postcode,

          country: newAddressValues.country,

        };

        if (newAddressValues.line2) shipping.line2 = newAddressValues.line2;

        if (newAddressValues.state) shipping.state = newAddressValues.state;

        payload.shippingAddress = shipping;

      }



      const response = await orderService.checkout(payload);



      if (paymentMethod === 'card' && response.meta?.clientSecret) {

        setPendingOrderNumber(response.data.orderNumber);

        setClientSecret(response.meta.clientSecret);

        setPlacing(false);

        return;

      }



      setPlaced(true);

      await dispatch(fetchBasket(true));

      dispatch(pushToast('Order placed — thank you!', 'success'));

      navigate(`/order-complete/${response.data.orderNumber}`);

    } catch (caught) {

      setPlacing(false);



      if (caught instanceof ApiError && caught.status === 409) {

        setError(

          `${caught.message} Head back to your basket to adjust the affected items, then try again.`

        );

        return;

      }



      setError(getErrorMessage(caught));

    }

  };



  const handlePlaceOrder = () => {

    if (summary.hasIssues || lines.length === 0) return;



    if (useNewAddress) {

      void handleSubmit((values) => submitOrder(values))();

      return;

    }



    void submitOrder();

  };



  const canPlace = lines.length > 0 && !summary.hasIssues;



  const summaryContent = (

    <>

      <ul className="space-y-3">

        {lines.map((line) => (

          <li key={line.id} className="flex items-start gap-3">

            <SmartImage

              src={line.image}

              alt={line.name}

              wrapperClassName="h-12 w-12 rounded-lg"

              className="object-contain p-0.5"

            />

            <div className="min-w-0 flex-1">

              <p className="line-clamp-2 text-xs font-semibold text-ink-800">{line.name}</p>

              <p className="mt-0.5 text-[11px] text-ink-400">Qty {line.quantity}</p>

            </div>

            <p className="shrink-0 text-xs font-bold text-ink-900">{formatPrice(line.lineTotal)}</p>

          </li>

        ))}

      </ul>



      <dl className="mt-4 space-y-2.5 border-t border-ink-100 pt-4 text-sm">

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

    </>

  );



  return (

    <div className="mx-auto max-w-7xl px-4 py-6 pb-40 lg:px-6 lg:py-8 lg:pb-8">

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">

        <div>

          <h1 className="text-2xl font-black tracking-tight text-ink-900 sm:text-3xl">Checkout</h1>

          <p className="mt-1 text-sm text-ink-500">

            Delivery, payment and your order — all on one page.

          </p>

        </div>

        <Link

          to="/basket"

          className="text-sm font-bold text-brand-600 transition hover:text-brand-700"

        >

          ← Back to basket

        </Link>

      </div>



      {error && (

        <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-brand-50 p-4 text-sm font-medium text-brand-800 ring-1 ring-inset ring-brand-200">

          <FiAlertTriangle size={16} className="mt-0.5 shrink-0" />

          <div>

            <p>{error}</p>

            <Link to="/basket" className="mt-1 inline-block font-bold underline underline-offset-2">

              Review my basket

            </Link>

          </div>

        </div>

      )}



      {/* Mobile order summary toggle */}

      <div className="mb-4 lg:hidden">

        <button

          type="button"

          onClick={() => setMobileSummaryOpen((open) => !open)}

          className="flex w-full items-center justify-between rounded-xl border border-ink-200 bg-white px-4 py-3 text-left shadow-card"

        >

          <span>

            <span className="block text-sm font-bold text-ink-900">

              {summary.itemCount} {summary.itemCount === 1 ? 'item' : 'items'}

            </span>

            <span className="text-xs text-ink-500">Tap to {mobileSummaryOpen ? 'hide' : 'view'} summary</span>

          </span>

          <span className="flex items-center gap-2">

            <span className="text-lg font-black text-ink-900">{formatPrice(summary.total)}</span>

            {mobileSummaryOpen ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}

          </span>

        </button>



        {mobileSummaryOpen && (

          <div className="mt-2 rounded-xl border border-ink-100 bg-white p-4 shadow-card">

            {summaryContent}

          </div>

        )}

      </div>



      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_min(100%,360px)]">

        <div className="min-w-0 space-y-4">

          {/* Delivery */}

          <section className="card p-5">

            <h2 className="text-base font-bold text-ink-900">1. Delivery address</h2>

            <p className="mt-1 text-sm text-ink-500">Where should we send your order?</p>



            {addresses.loading ? (

              <div className="mt-4 space-y-3">

                {Array.from({ length: 2 }).map((_, index) => (

                  <Skeleton key={index} className="h-20 w-full" />

                ))}

              </div>

            ) : (

              <>

                {(saved || []).length > 0 && (

                  <div className="mt-4 space-y-2">

                    {(saved || []).map((address) => (

                      <label

                        key={address.id}

                        className={cn(

                          'flex cursor-pointer gap-3 rounded-lg border p-3.5 transition sm:p-4',

                          !useNewAddress && addressId === address.id

                            ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-200'

                            : 'border-ink-200 hover:border-ink-300'

                        )}

                      >

                        <input

                          type="radio"

                          name="address"

                          checked={!useNewAddress && addressId === address.id}

                          onChange={() => {

                            setUseNewAddress(false);

                            setAddressId(address.id);

                            setError(null);

                          }}

                          className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"

                        />

                        <span className="min-w-0">

                          <span className="flex flex-wrap items-center gap-2">

                            <span className="text-sm font-bold text-ink-900">{address.fullName}</span>

                            {address.isDefault && (

                              <span className="rounded-full bg-ink-900 px-2 py-0.5 text-[10px] font-bold text-white">

                                Default

                              </span>

                            )}

                          </span>

                          <span className="mt-0.5 block text-sm text-ink-500">

                            {formatAddress(address)}

                          </span>

                        </span>

                      </label>

                    ))}



                    <button

                      type="button"

                      onClick={() => {

                        setUseNewAddress(true);

                        setError(null);

                      }}

                      className={cn(

                        'flex w-full items-center gap-2 rounded-lg border border-dashed p-3.5 text-sm font-bold transition sm:p-4',

                        useNewAddress

                          ? 'border-brand-500 bg-brand-50/60 text-brand-700'

                          : 'border-ink-300 text-ink-600 hover:border-brand-300 hover:text-brand-600'

                      )}

                    >

                      <FiPlus size={16} />

                      Use a different address

                    </button>

                  </div>

                )}



                {useNewAddress && (

                  <div

                    className={cn(

                      'grid gap-4 sm:grid-cols-2',

                      (saved || []).length > 0 && 'mt-4 border-t border-ink-100 pt-4'

                    )}

                  >

                    <Input

                      label="Full name"

                      required

                      error={errors.fullName?.message}

                      {...register('fullName')}

                    />

                    <Input

                      label="Phone"

                      required

                      error={errors.phone?.message}

                      {...register('phone')}

                    />

                    <Input

                      label="Address line 1"

                      required

                      containerClassName="sm:col-span-2"

                      error={errors.line1?.message}

                      {...register('line1')}

                    />

                    <Input

                      label="Address line 2 (optional)"

                      containerClassName="sm:col-span-2"

                      error={errors.line2?.message}

                      {...register('line2')}

                    />

                    <Input

                      label="Town or city"

                      required

                      error={errors.city?.message}

                      {...register('city')}

                    />

                    <Input label="County" error={errors.state?.message} {...register('state')} />

                    <Input

                      label="Postcode"

                      required

                      error={errors.postcode?.message}

                      {...register('postcode')}

                    />

                    <Input

                      label="Country"

                      required

                      error={errors.country?.message}

                      {...register('country')}

                    />

                    <div className="sm:col-span-2">

                      <Checkbox

                        label="Save this address to my account"

                        {...register('saveAddress')}

                      />

                    </div>

                  </div>

                )}

              </>

            )}

          </section>



          {/* Payment */}

          <section className="card p-5">

            <h2 className="text-base font-bold text-ink-900">2. Payment method</h2>

            <p className="mt-1 text-sm text-ink-500">Choose how you would like to pay.</p>



            <div className="mt-4 grid gap-2 sm:grid-cols-3">

              {PAYMENT_METHODS.map((method) => (

                <label

                  key={method.value}

                  className={cn(

                    'flex cursor-pointer flex-col gap-2 rounded-lg border p-3.5 transition sm:p-4',

                    paymentMethod === method.value

                      ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-200'

                      : 'border-ink-200 hover:border-ink-300'

                  )}

                >

                  <span className="flex items-center gap-2">

                    <input

                      type="radio"

                      name="paymentMethod"

                      checked={paymentMethod === method.value}

                      onChange={() => setPaymentMethod(method.value)}

                      className="h-4 w-4 shrink-0 text-brand-600"

                    />

                    <method.icon size={16} className="text-brand-600" />

                    <span className="text-sm font-bold text-ink-900">{method.label}</span>

                  </span>

                  <span className="text-xs leading-relaxed text-ink-500">{method.description}</span>

                </label>

              ))}

            </div>



            {paymentMethod === 'card' && (

              <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2.5 text-xs text-ink-600">

                Card details are entered securely with Stripe after you place the order.

              </p>

            )}

          </section>



          {/* Note */}

          <section className="card p-5">

            <h2 className="text-base font-bold text-ink-900">3. Anything else? (optional)</h2>

            <Textarea

              className="mt-3"

              rows={2}

              placeholder="Safe place for the parcel, gift message, delivery instructions…"

              value={note}

              maxLength={500}

              onChange={(event) => setNote(event.target.value)}

            />

          </section>



          {/* Desktop place order */}

          <div className="hidden lg:block">

            <Button

              size="lg"

              fullWidth

              onClick={handlePlaceOrder}

              loading={placing}

              disabled={!canPlace}

            >

              Place order · {formatPrice(summary.total)}

            </Button>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-medium text-ink-400">

              <FiLock size={12} />

              Secure checkout — your details are encrypted

            </p>

          </div>

        </div>



        {/* Desktop summary */}

        <aside className="hidden lg:block lg:sticky lg:top-28 lg:self-start">

          <div className="card p-5">

            <h2 className="text-base font-bold text-ink-900">Order summary</h2>

            <div className="mt-4">{summaryContent}</div>

            <Button

              className="mt-5"

              size="lg"

              fullWidth

              onClick={handlePlaceOrder}

              loading={placing}

              disabled={!canPlace}

            >

              Place order · {formatPrice(summary.total)}

            </Button>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-medium text-ink-400">

              <FiLock size={12} />

              Secure checkout

            </p>

          </div>

        </aside>

      </div>



      {/* Mobile sticky checkout bar */}

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-ink-200 bg-white/95 p-3 shadow-lift backdrop-blur lg:bottom-0 lg:hidden">

        <div className="mx-auto flex max-w-7xl items-center gap-3">

          <div className="min-w-0 flex-1">

            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Total</p>

            <p className="text-xl font-black text-ink-900">{formatPrice(summary.total)}</p>

          </div>

          <Button

            size="lg"

            className="min-w-[148px] shrink-0"

            onClick={handlePlaceOrder}

            loading={placing}

            disabled={!canPlace}

          >

            Place order

          </Button>

        </div>

      </div>



      <Modal

        open={Boolean(clientSecret)}

        onClose={() => undefined}

        closeOnBackdrop={false}

        title="Pay by card"

        description="Complete payment to confirm your order."

      >

        {clientSecret && (

          <StripePay

            clientSecret={clientSecret}

            onCancel={() => {

              setClientSecret(null);

              dispatch(

                pushToast(

                  pendingOrderNumber

                    ? `Order ${pendingOrderNumber} is waiting for payment in your account.`

                    : 'Payment cancelled',

                  'info'

                )

              );

              if (pendingOrderNumber) {

                setPlaced(true);

                void dispatch(fetchBasket(true));

                navigate(`/order-complete/${pendingOrderNumber}`);

              }

            }}

            onPaid={async () => {

              if (!pendingOrderNumber) return;

              await orderService.confirmPayment(pendingOrderNumber);

              setPlaced(true);

              setClientSecret(null);

              await dispatch(fetchBasket(true));

              dispatch(pushToast('Payment received — thank you!', 'success'));

              navigate(`/order-complete/${pendingOrderNumber}`);

            }}

          />

        )}

      </Modal>

    </div>

  );

};



export default Checkout;


