import { useId, useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import { useClickOutside } from '@/hooks';
import cn from '@/lib/cn';

export interface ShopSelectOption {
  value: string;
  label: string;
}

interface ShopSelectProps {
  options: ShopSelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  'aria-label'?: string;
}

const ShopSelect = ({
  options,
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
}: ShopSelectProps) => {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  return (
    <div ref={ref} className={cn('relative w-44 shrink-0', className)}>
      <button
        type="button"
        id={`${listId}-trigger`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-2xl border border-ink-300 bg-ink-100 px-3 text-xs font-medium text-ink-900 transition hover:border-brand-500/40 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      >
        <span className="truncate">{selected?.label ?? 'Choose…'}</span>
        <FiChevronDown
          size={14}
          className={cn('shrink-0 text-ink-400 transition', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={`${listId}-trigger`}
          className="absolute right-0 z-50 mt-1 max-h-56 w-full min-w-[11rem] overflow-y-auto rounded-xl border border-ink-200 bg-ink-100 py-1 shadow-lift"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={cn(
                    'w-full px-3 py-2 text-left text-xs transition',
                    active
                      ? 'bg-ink-200 font-semibold text-brand-400'
                      : 'text-ink-700 hover:bg-ink-200 hover:text-ink-900'
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ShopSelect;
