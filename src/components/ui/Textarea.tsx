import { forwardRef, type TextareaHTMLAttributes, useId } from 'react';
import cn from '@/lib/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, rows = 4, ...props }, ref) => {
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

        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          aria-invalid={Boolean(error)}
          className={cn('input-base resize-y', error && 'input-error', className)}
          {...props}
        />

        {error ? (
          <p className="mt-1.5 text-xs font-medium text-brand-600">{error}</p>
        ) : hint ? (
          <p className="mt-1.5 text-xs text-ink-500">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
