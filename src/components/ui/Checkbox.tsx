import { forwardRef, type InputHTMLAttributes, useId } from 'react';
import cn from '@/lib/cn';

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, className, id, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id || autoId;

    return (
      <div>
        <label htmlFor={fieldId} className="flex cursor-pointer items-start gap-2.5">
          <input
            ref={ref}
            id={fieldId}
            type="checkbox"
            className={cn(
              'mt-0.5 h-4.5 w-4.5 shrink-0 cursor-pointer rounded border-ink-300 text-brand-600',
              'focus:ring-2 focus:ring-brand-500/25 focus:ring-offset-0',
              className
            )}
            {...props}
          />
          {(label || description) && (
            <span className="select-none">
              {label && <span className="block text-sm font-medium text-ink-700">{label}</span>}
              {description && <span className="block text-xs text-ink-500">{description}</span>}
            </span>
          )}
        </label>

        {error && <p className="mt-1 text-xs font-medium text-brand-600">{error}</p>}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

/** Styled on/off control for settings rows. */
export const Switch = ({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}) => (
  <div className="flex items-start justify-between gap-4">
    {(label || description) && (
      <span className="min-w-0 flex-1">
        {label && <span className="block text-sm font-medium text-ink-700">{label}</span>}
        {description && (
          <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{description}</span>
        )}
      </span>
    )}

    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-brand-600' : 'bg-ink-300',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  </div>
);

export default Checkbox;
