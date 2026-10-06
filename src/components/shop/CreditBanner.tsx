import { Link } from 'react-router-dom';
import { FiArrowRight, FiZap } from 'react-icons/fi';
import cn from '@/lib/cn';

const CreditBanner = ({
  className,
  variant = 'compact',
}: {
  className?: string;
  variant?: 'compact' | 'home';
}) => {
  if (variant === 'home') {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl p-[1px] [background-image:linear-gradient(90deg,var(--color-brand-500),var(--color-accent-500))]',
          className
        )}
      >
        <div className="relative overflow-hidden rounded-2xl bg-ink-100 p-4 sm:p-5">
          <div className="pointer-events-none absolute -right-6 top-0 h-40 w-40 rounded-full bg-accent-500/15 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 shadow-glow">
                <FiZap size={26} className="text-void" />
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent-600 text-[10px] font-black text-white">
                  £
                </span>
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-400">
                  Respawn Credit
                </p>
                <p className="mt-1 text-xl font-black text-ink-900 sm:text-2xl">Get more for your tech</p>
                <p className="mt-1 max-w-lg text-sm leading-relaxed text-ink-500">
                  Trade in and choose Respawn Credit to get a higher value than cash.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end">
              <div className="hidden items-end gap-2 sm:flex" aria-hidden>
                {[0, 1].map((index) => (
                  <div
                    key={index}
                    className={cn(
                      'h-20 w-32 rounded-xl border border-brand-500/30 bg-gradient-to-br from-ink-50 to-ink-200 p-2 shadow-card',
                      index === 1 && '-mb-2 rotate-6'
                    )}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-black text-void">
                      R
                    </span>
                    <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-brand-400">
                      Respawn Credit
                    </p>
                  </div>
                ))}
              </div>
              <Link
                to="/request-a-game"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full btn-glow-purple px-6 text-sm font-bold text-white sm:w-auto"
              >
                Find Out More
                <FiArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-brand-500/25 bg-gradient-to-r from-ink-100 via-ink-100 to-accent-600/20 p-4 sm:p-5',
        className
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-accent-500/20 blur-2xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600/15 text-brand-400">
            <FiZap size={18} />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-400">
              Respawn Credit
            </p>
            <p className="mt-1 text-lg font-black text-ink-900">Get more for your tech</p>
            <p className="mt-1 max-w-md text-sm text-ink-500">
              Trade in and choose Respawn Credit to get a higher value than cash.
            </p>
          </div>
        </div>

        <Link
          to="/request-a-game"
          className="inline-flex h-11 items-center gap-2 rounded-full btn-glow px-5 text-sm font-bold text-void"
        >
          Find Out More
          <FiArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
};

export default CreditBanner;
