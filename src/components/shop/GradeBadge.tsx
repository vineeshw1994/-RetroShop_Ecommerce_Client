import cn from '@/lib/cn';
import { conditionGrade, gradeLabel } from '@/lib/format';

const TONES: Record<string, string> = {
  A: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/40',
  B: 'bg-lime-500/15 text-lime-300 ring-lime-400/40',
  C: 'bg-amber-500/15 text-amber-300 ring-amber-400/40',
};

const GradeBadge = ({
  condition,
  className,
}: {
  condition: string | null | undefined;
  className?: string;
}) => {
  const grade = conditionGrade(condition);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset',
        TONES[grade],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {gradeLabel(condition)}
    </span>
  );
};

export default GradeBadge;
