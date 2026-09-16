import { useDocumentTitle, useShopSettings } from '@/hooks';



const DeliveryReturns = () => {

  useDocumentTitle('Delivery & returns');

  const { returnDays } = useShopSettings();



  return (

    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6">

      <h1 className="text-3xl font-black tracking-tight text-ink-900">Delivery & returns</h1>

      <div className="prose-like mt-6 space-y-6 text-sm leading-relaxed text-ink-600">

        <section>

          <h2 className="text-lg font-bold text-ink-900">Delivery</h2>

          <p className="mt-2">

            We send orders with tracked 48-hour delivery. Orders over £50 qualify for free tracked

            postage. A flat rate of £3.95 applies below that threshold.

          </p>

          <p className="mt-2">

            Most parcels leave the same or next working day. You will receive tracking details as

            soon as the order is marked as shipped.

          </p>

        </section>

        <section>

          <h2 className="text-lg font-bold text-ink-900">Warranty</h2>

          <p className="mt-2">

            Every game, console and accessory is tested before it ships and is covered by our

            warranty as shown on the product page.

          </p>

        </section>

        <section>

          <h2 className="text-lg font-bold text-ink-900">Returns</h2>

          {returnDays > 0 ? (

            <>

              <p className="mt-2">

                If you change your mind you can return unused items within {returnDays} days of

                delivery. Open your order in My account and tap Request return, or contact us first

                so we can send a returns label.

              </p>

              <p className="mt-2">

                Refunds are issued once the item has been checked in.

              </p>

            </>

          ) : (

            <p className="mt-2">

              Returns are handled case by case for faulty items under warranty — get in touch and

              we will arrange a repair, replacement or refund.

            </p>

          )}

          <p className="mt-2">

            Faulty items are covered under warranty — get in touch and we will arrange a repair,

            replacement or refund.

          </p>

        </section>

      </div>

    </div>

  );

};



export default DeliveryReturns;

