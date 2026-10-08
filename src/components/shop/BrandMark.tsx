import { Link } from 'react-router-dom';
import cn from '@/lib/cn';

interface BrandMarkProps {
  to?: string;
  compact?: boolean;
  stacked?: boolean;
  className?: string;
  onDark?: boolean;
}

const Mark = ({
  compact,
  stacked,
  onDark,
}: {
  compact?: boolean;
  stacked?: boolean;
  onDark?: boolean;
}) => {
  const icon = (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 font-black text-void shadow-glow',
        compact
          ? 'h-8 w-8 text-sm'
          : stacked
            ? 'h-14 w-14 text-2xl'
            : 'h-9 w-9 text-base sm:h-10 sm:w-10 sm:text-lg'
      )}
    >
      R
    </span>
  );

  if (compact) {
    return <span className="flex min-w-0 items-center gap-2">{icon}</span>;
  }

  const wordmark = (
    <>
      <span
        className={cn(
          'block font-black tracking-[0.14em]',
          stacked ? 'text-xl sm:text-2xl' : 'text-[13px] sm:text-[15px] lg:text-lg',
          onDark ? 'text-white' : 'text-ink-900'
        )}
      >
        RESPAWN
      </span>
      <span
        className={cn(
          'mt-0.5 block truncate text-[7px] font-semibold tracking-[0.14em] text-brand-400 sm:text-[8px] sm:tracking-[0.18em] lg:text-[9px]',
          stacked && 'text-[9px] sm:text-[10px]'
        )}
      >
        PRE-OWNED GAMING &amp; TECH
      </span>
    </>
  );

  if (stacked) {
    return (
      <span className="flex flex-col items-center gap-2 text-center">
        {icon}
        {wordmark}
      </span>
    );
  }

  return (
    <span className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
      {icon}
      <span className="min-w-0 flex-1 leading-none">{wordmark}</span>
    </span>
  );
};

const BrandMark = ({
  to = '/',
  compact = false,
  stacked = false,
  className,
  onDark = true,
}: BrandMarkProps) => {
  const content = <Mark compact={compact} stacked={stacked} onDark={onDark} />;

  if (!to) {
    return <span className={className}>{content}</span>;
  }

  return (
    <Link to={to} className={cn('flex min-w-0 items-center', className)} aria-label="Respawn home">
      {content}
    </Link>
  );
};

export default BrandMark;
