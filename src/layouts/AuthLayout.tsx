import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';
import BrandMark from '@/components/shop/BrandMark';

interface AuthLayoutProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'customer' | 'admin';
  extra?: ReactNode;
}

const AuthLayout = ({
  title,
  subtitle,
  children,
  footer,
  variant = 'customer',
  extra,
}: AuthLayoutProps) => (
  <div className="relative min-h-screen bg-ink-50">
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-500/15 blur-3xl" />
      <div className="absolute -right-10 bottom-10 h-80 w-80 rounded-full bg-accent-600/20 blur-3xl" />
    </div>
    <div className="pointer-events-none absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-brand-500 via-brand-400 to-accent-500 opacity-80" />

    <div className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 py-6 sm:px-8">
      <Link
        to="/"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition hover:bg-ink-100 hover:text-brand-400"
        aria-label="Back to shop"
      >
        <FiArrowLeft size={22} />
      </Link>

      <div className="mt-4 flex justify-center">
        <BrandMark to="/" stacked className="justify-center" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-8 flex-1"
      >
        <h1 className="text-3xl font-black tracking-tight text-ink-900">{title}</h1>
        {subtitle && <p className="mt-2 text-sm leading-relaxed text-ink-500">{subtitle}</p>}

        <div className="mt-7">{children}</div>

        {footer && <div className="mt-6 text-center text-sm text-ink-500">{footer}</div>}
        {extra}
      </motion.div>

      {variant === 'admin' && (
        <p className="mt-8 text-center text-xs text-ink-400">Staff sign-in only — no public registration.</p>
      )}
    </div>
  </div>
);

export default AuthLayout;
