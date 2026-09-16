import { useDocumentTitle } from '@/hooks';

const Terms = () => {
  useDocumentTitle('Terms & conditions');

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
      <h1 className="text-3xl font-black tracking-tight text-ink-900">Terms & conditions</h1>
      <div className="mt-6 space-y-6 text-sm leading-relaxed text-ink-600">
        <section>
          <h2 className="text-lg font-bold text-ink-900">Using this shop</h2>
          <p className="mt-2">
            By creating an account or placing an order you agree to these terms. Prices include VAT
            where applicable and are shown in pounds sterling.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-ink-900">Orders and payment</h2>
          <p className="mt-2">
            Placing an order is an offer to buy. We accept the order when payment is confirmed or,
            for cash on delivery, when we dispatch the parcel. Card payments are processed securely
            by Stripe.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-ink-900">Condition of goods</h2>
          <p className="mt-2">
            Pre-owned items are graded honestly. Photos and descriptions are a guide. Warranty
            cover is stated on each product.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-ink-900">Accounts</h2>
          <p className="mt-2">
            Keep your login details private. We may suspend accounts that are used to abuse the
            shop, including fraudulent orders or reviews.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-ink-900">Contact</h2>
          <p className="mt-2">
            Questions about these terms can be sent through the contact form. We will reply by
            email.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Terms;
