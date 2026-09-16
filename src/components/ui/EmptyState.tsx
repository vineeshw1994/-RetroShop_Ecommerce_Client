import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { FiInbox, FiAlertCircle } from 'react-icons/fi';
import Button from './Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: ReactNode;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  compact?: boolean;
}

const EmptyState = ({
  icon,
  title,
  message,
  action,
  secondaryAction,
  compact = false,
}: EmptyStateProps) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className={
      compact
        ? 'flex flex-col items-center px-4 py-8 text-center'
        : 'flex flex-col items-center px-4 py-16 text-center'
    }
  >
    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-100 text-ink-400">
      {icon || <FiInbox size={24} />}
    </span>

    <h3 className="mt-4 text-base font-bold text-ink-900">{title}</h3>
    {message && <p className="mt-1.5 max-w-sm text-sm text-ink-500">{message}</p>}

    {(action || secondaryAction) && (
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {action && <Button onClick={action.onClick}>{action.label}</Button>}
        {secondaryAction && (
          <Button variant="outline" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    )}
  </motion.div>
);

/** Failure variant used when a fetch rejects. */
export const ErrorState = ({
  message = 'Something went wrong while loading this page.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) => (
  <EmptyState
    icon={<FiAlertCircle size={24} className="text-brand-600" />}
    title="We hit a snag"
    message={message}
    action={onRetry ? { label: 'Try again', onClick: onRetry } : undefined}
  />
);

export default EmptyState;
