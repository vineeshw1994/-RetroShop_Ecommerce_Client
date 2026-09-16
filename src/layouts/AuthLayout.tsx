import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiShield, FiTruck, FiRefreshCw } from 'react-icons/fi';
import { useShopSettings } from '@/hooks';

interface AuthLayoutProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Admin variant swaps the marketing panel for a darker staff panel. */
  variant?: 'customer' | 'admin';
}

const AuthLayout = ({
  title,
  subtitle,
  children,
  footer,
  variant = 'customer',
}: AuthLayoutProps) => {
  const { returnDays } = useShopSettings();

  const promises = [
    { icon: FiShield, text: 'Every item tested with warranty included' },
    { icon: FiTruck, text: 'Free tracked delivery over £50' },
    ...(returnDays > 0
      ? [{ icon: FiRefreshCw, text: `${returnDays} day no-fuss returns` }]
      : []),
  ];

  return (
  <div className="flex min-h-screen bg-white">
    {/* Form column */}
    <div className="flex w-full flex-col justify-center px-5 py-10 sm:px-10 lg:w-[52%] lg:px-16">
      <div className="mx-auto w-full max-w-md">
        <Link
          to={variant === 'admin' ? '/' : '/'}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition hover:text-brand-600"
        >
          <FiArrowLeft size={15} />
          Back to shop
        </Link>

        <div className="mt-8 flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-sm font-black text-white">
            RS
          </span>
          <span className="text-xl font-black tracking-tight text-ink-900">RetroShop</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-8"
        >
          <h1 className="text-2xl font-black tracking-tight text-ink-900 sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm leading-relaxed text-ink-500">{subtitle}</p>}

          <div className="mt-7">{children}</div>

          {footer && <div className="mt-6 text-sm text-ink-500">{footer}</div>}
        </motion.div>
      </div>
    </div>

    {/* Marketing column */}
    <div
      className={
        variant === 'admin'
          ? 'relative hidden overflow-hidden bg-ink-900 lg:block lg:w-[48%]'
          : 'relative hidden overflow-hidden bg-brand-600 lg:block lg:w-[48%]'
      }
    >
      <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10" />
      <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/5" />

      <div className="relative flex h-full flex-col justify-center px-14">
        {variant === 'admin' ? (
          <>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
              <FiShield size={13} /> Staff area
            </span>
            <h2 className="mt-6 text-4xl font-black leading-tight text-white">
              Run the shop
              <br />
              from one place
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/70">
              Manage the catalogue, fulfil orders, watch stock levels and keep an eye on sales.
              Staff accounts are created by the owner, so there is nothing to sign up for here.
            </p>

            <dl className="mt-10 grid grid-cols-2 gap-6">
              {[
                ['Products', 'Add, edit and archive'],
                ['Orders', 'Track and fulfil'],
                ['Inventory', 'Restocks and alerts'],
                ['Reports', 'Sales and customers'],
              ].map(([term, detail]) => (
                <div key={term}>
                  <dt className="text-sm font-bold text-white">{term}</dt>
                  <dd className="text-xs text-white/60">{detail}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <>
            <h2 className="text-4xl font-black leading-tight text-white">
              Thousands of games,
              <br />
              all fully tested
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/80">
              Create an account to track your orders, save what you are after, and ask us to source
              the titles you cannot find anywhere else.
            </p>

            <ul className="mt-10 space-y-4">
              {promises.map((promise) => (
                <li key={promise.text} className="flex items-center gap-3 text-white">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                    <promise.icon size={16} />
                  </span>
                  <span className="text-sm font-medium">{promise.text}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  </div>
  );
};

export default AuthLayout;
