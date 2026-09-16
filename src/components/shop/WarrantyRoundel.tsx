import { warrantyRoundel } from '@/lib/format';
import cn from '@/lib/cn';

interface WarrantyRoundelProps {
  months: number | null | undefined;
  className?: string;
  size?: 'sm' | 'md';
}

const SIZE_CLASSES = {
  sm: 'h-11 w-11 text-[8px] [&_.amount]:text-[13px]',
  md: 'h-14 w-14 text-[9px] [&_.amount]:text-base',
};

const WarrantyRoundel = ({ months, className, size = 'sm' }: WarrantyRoundelProps) => {
  const roundel = warrantyRoundel(months);
  if (!roundel) return null;

  return (
    <span
      className={cn(
        'pointer-events-none absolute left-2 top-2 flex flex-col items-center justify-center rounded-full bg-brand-600 text-center font-bold uppercase leading-[1.1] text-white shadow-md',
        SIZE_CLASSES[size],
        className
      )}
    >
      <span className="amount leading-none">{roundel.amount}</span>
      <span>{roundel.unit}</span>
      <span>Warranty</span>
    </span>
  );
};

export default WarrantyRoundel;
