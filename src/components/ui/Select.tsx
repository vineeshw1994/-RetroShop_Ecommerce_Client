import { forwardRef, type SelectHTMLAttributes, useId } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import cn from '@/lib/cn';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, id, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id || autoId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-ink-700">
            {label}
            {props.required && <span className="ml-0.5 text-brand-600">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={fieldId}
            aria-invalid={Boolean(error)}
            className={cn(
              'input-base appearance-none pr-10',
              error && 'input-error',
              !props.value && placeholder && 'text-ink-400',
              className
            )}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>

          <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
        </div>

        {error ? (
          <p className="mt-1.5 text-xs font-medium text-brand-600">{error}</p>
        ) : hint ? (
          <p className="mt-1.5 text-xs text-ink-500">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
