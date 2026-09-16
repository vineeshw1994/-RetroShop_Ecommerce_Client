import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui';
import { removeStripeTestingAssistant } from '@/lib/stripeAssistant';

const publishable = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

const stripePromise = publishable
  ? loadStripe(publishable, {
      developerTools: {
        assistant: {
          enabled: false,
        },
      },
    })
  : null;

const InnerForm = ({
  onPaid,
  onCancel,
}: {
  onPaid: () => Promise<void> | void;
  onCancel: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (result.error) {
      setError(result.error.message || 'Payment failed');
      setSubmitting(false);
      return;
    }

    await onPaid();
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm font-medium text-brand-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" onClick={() => void pay()} loading={submitting}>
          Pay now
        </Button>
      </div>
    </div>
  );
};

const StripePay = ({
  clientSecret,
  onPaid,
  onCancel,
}: {
  clientSecret: string;
  onPaid: () => Promise<void> | void;
  onCancel: () => void;
}) => {
  useEffect(() => () => removeStripeTestingAssistant(), []);

  if (!stripePromise) {
    return (
      <p className="text-sm text-brand-600">
        Card payments are not configured. Add VITE_STRIPE_PUBLISHABLE_KEY.
      </p>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
      <InnerForm onPaid={onPaid} onCancel={onCancel} />
    </Elements>
  );
};

export default StripePay;
