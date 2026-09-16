import { FiStar } from 'react-icons/fi';
import cn from '@/lib/cn';

interface StarRatingProps {
  value: number;
  count?: number;
  size?: number;
  showValue?: boolean;
  className?: string;
  /** Pass a handler to turn this into an input. */
  onChange?: (rating: number) => void;
}

const StarRating = ({
  value,
  count,
  size = 14,
  showValue = true,
  className,
  onChange,
}: StarRatingProps) => {
  const rounded = Math.round(value);

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) =>
          onChange ? (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              aria-label={`Rate ${star} out of 5`}
              className="transition hover:scale-110"
            >
              <FiStar
                size={size}
                className={star <= rounded ? 'fill-amber-400 text-amber-400' : 'text-ink-300'}
              />
            </button>
          ) : (
            <FiStar
              key={star}
              size={size}
              className={star <= rounded ? 'fill-amber-400 text-amber-400' : 'text-ink-300'}
            />
          )
        )}
      </div>

      {showValue && value > 0 && (
        <span className="text-xs font-semibold text-ink-600">{value.toFixed(1)}</span>
      )}

      {count !== undefined && count > 0 && (
        <span className="text-xs text-ink-400">({count})</span>
      )}
    </div>
  );
};

export default StarRating;
