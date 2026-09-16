import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import cn from '@/lib/cn';

interface OtpInputProps {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  label?: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

const OtpInput = ({
  value,
  onChange,
  length = 6,
  label,
  error,
  disabled,
  autoFocus,
}: OtpInputProps) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? '');

  const focusAt = (index: number) => {
    const target = inputsRef.current[Math.max(0, Math.min(length - 1, index))];
    target?.focus();
    target?.select();
  };

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
  }, [autoFocus]);

  const commit = (next: string) => {
    const cleaned = next.replace(/\D/g, '').slice(0, length);
    onChange(cleaned);
    return cleaned;
  };

  const handleChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, '');

    if (!cleaned) {
      const next = [...digits];
      next[index] = '';
      commit(next.join(''));
      return;
    }

    // Browser and OS autofill drop the whole code into a single box.
    if (cleaned.length >= length) {
      focusAt(commit(cleaned).length);
      return;
    }

    const next = [...digits];
    next[index] = cleaned.slice(-1);
    commit(next.join(''));
    focusAt(index + 1);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const next = [...digits];

      if (next[index]) {
        next[index] = '';
        commit(next.join(''));
        return;
      }

      if (index > 0) {
        next[index - 1] = '';
        commit(next.join(''));
        focusAt(index - 1);
      }
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusAt(index - 1);
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusAt(index + 1);
    }
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text');
    if (!pasted.replace(/\D/g, '')) return;
    focusAt(commit(value.slice(0, index) + pasted).length);
  };

  return (
    <div>
      {label && <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>}

      <div className="flex gap-2 sm:gap-2.5" role="group" aria-label={label || 'Verification code'}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputsRef.current[index] = element;
            }}
            value={digit}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={(event) => handlePaste(index, event)}
            // Keeps the code gap-free when someone clicks a box further along.
            onFocus={() => {
              if (index > value.length) focusAt(value.length);
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={length}
            disabled={disabled}
            aria-label={`Digit ${index + 1}`}
            aria-invalid={Boolean(error)}
            className={cn(
              'h-13 w-full min-w-0 rounded-lg border bg-white text-center text-xl font-bold text-ink-900 transition',
              'focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 focus:outline-none',
              'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400',
              error ? 'border-brand-500' : 'border-ink-200'
            )}
          />
        ))}
      </div>

      {error && <p className="mt-1.5 text-xs font-medium text-brand-600">{error}</p>}
    </div>
  );
};

export default OtpInput;
