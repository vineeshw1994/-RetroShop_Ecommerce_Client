import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiCheckCircle, FiPackage, FiShoppingBag } from 'react-icons/fi';
import { useDocumentTitle } from '@/hooks';
import ConfettiBurst from '@/components/shop/ConfettiBurst';
import { Button } from '@/components/ui';

const OrderComplete = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();

  useDocumentTitle('Order complete');

  return (
    <div className="relative min-h-[70vh] overflow-hidden">
      <ConfettiBurst />

      <div className="relative mx-auto flex max-w-lg flex-col items-center px-4 py-12 text-center sm:py-16">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-lg ring-8 ring-emerald-50"
        >
          <FiCheckCircle size={42} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6 text-3xl font-black tracking-tight text-ink-900 sm:text-4xl"
        >
          Order complete!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-3 text-sm leading-relaxed text-ink-600 sm:text-base"
        >
          Thank you for your order. We are getting it ready and will email you when it ships.
        </motion.p>

        {orderNumber && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-6 rounded-2xl border border-ink-100 bg-white px-5 py-4 shadow-card"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Order number
            </p>
            <p className="mt-1 text-xl font-black text-brand-600">{orderNumber}</p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center"
        >
          {orderNumber && (
            <Link to={`/account/orders/${orderNumber}`} className="w-full sm:w-auto">
              <Button size="lg" fullWidth leftIcon={<FiPackage size={16} />}>
                View order
              </Button>
            </Link>
          )}
          <Link to="/search" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" fullWidth leftIcon={<FiShoppingBag size={16} />}>
              Continue shopping
            </Button>
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="mt-6 inline-flex items-center gap-1 text-xs font-medium text-ink-500"
        >
          Track progress any time from your account
          <FiArrowRight size={12} />
        </motion.p>
      </div>
    </div>
  );
};

export default OrderComplete;
