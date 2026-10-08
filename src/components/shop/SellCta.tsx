import { Link } from 'react-router-dom';
import { FiArrowRight, FiRefreshCw } from 'react-icons/fi';
import cn from '@/lib/cn';

const SellCta = ({ className }: { className?: string }) => (
  <div
    className={cn(
      'relative overflow-hidden rounded-2xl border border-accent-500/25 bg-ink-100 p-4 sm:p-5',
      className
    )}
  >
    <div className="pointer-events-none absolute -right-8 bottom-0 h-28 w-28 rounded-full bg-accent-500/20 blur-2xl" />
    <div className="relative flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-600/20 text-accent-400">
          <FiRefreshCw size={18} />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-400">
            We buy your tech
          </p>
          <p className="mt-1 text-lg font-black text-ink-900">Sell your games, consoles and accessories</p>
          <p className="mt-1 max-w-md text-sm text-ink-500">
            Search what you want to sell, pick the condition, and get an instant cash offer.
          </p>
        </div>
      </div>
      <Link
        to="/sell"
        className="inline-flex h-11 items-center gap-2 rounded-full btn-glow-purple px-5 text-sm font-bold text-white"
      >
        Sell to us
        <FiArrowRight size={15} />
      </Link>
    </div>
  </div>
);

export default SellCta;
