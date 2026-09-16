import cn from '@/lib/cn';

const SIZES = {
  xs: 'h-3 w-3 border',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-[3px]',
} as const;

interface SpinnerProps {
  size?: keyof typeof SIZES;
  className?: string;
}

const Spinner = ({ size = 'md', className }: SpinnerProps) => (
  <span
    role="status"
    aria-label="Loading"
    className={cn(
      'inline-block animate-spin rounded-full border-current border-t-transparent',
      SIZES[size],
      className
    )}
  />
);

export default Spinner;
