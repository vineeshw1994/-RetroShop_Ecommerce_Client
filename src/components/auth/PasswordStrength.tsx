import { motion } from 'framer-motion';
import { FiCheck, FiCircle } from 'react-icons/fi';
import { z } from 'zod';
import cn from '@/lib/cn';

/** Mirrors the API password policy so the meter never disagrees with the server. */
const RULES = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'A lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'An uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'A number', test: (value: string) => /\d/.test(value) },
];

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/\d/, 'Add a number');

const LEVELS = [
  { label: 'Too weak', bar: 'bg-brand-600', text: 'text-brand-600' },
  { label: 'Too weak', bar: 'bg-brand-600', text: 'text-brand-600' },
  { label: 'Weak', bar: 'bg-amber-500', text: 'text-amber-600' },
  { label: 'Almost there', bar: 'bg-amber-400', text: 'text-amber-600' },
  { label: 'Strong', bar: 'bg-emerald-500', text: 'text-emerald-600' },
];

interface PasswordStrengthProps {
  value: string;
  showChecklist?: boolean;
  className?: string;
}

const PasswordStrength = ({ value, showChecklist = true, className }: PasswordStrengthProps) => {
  if (!value) return null;

  const score = RULES.filter((rule) => rule.test(value)).length;
  const level = LEVELS[score];

  return (
    <div className={cn('mt-2', className)}>
      <div className="flex items-center gap-3">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
          <motion.span
            initial={false}
            animate={{ width: `${(score / RULES.length) * 100}%` }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={cn('block h-full rounded-full', level.bar)}
          />
        </span>
        <span className={cn('shrink-0 text-xs font-semibold', level.text)}>{level.label}</span>
      </div>

      {showChecklist && (
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {RULES.map((rule) => {
            const passed = rule.test(value);
            return (
              <li
                key={rule.label}
                className={cn(
                  'flex items-center gap-1.5 text-xs',
                  passed ? 'font-medium text-emerald-600' : 'text-ink-500'
                )}
              >
                {passed ? <FiCheck size={12} /> : <FiCircle size={9} className="text-ink-300" />}
                {rule.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default PasswordStrength;
