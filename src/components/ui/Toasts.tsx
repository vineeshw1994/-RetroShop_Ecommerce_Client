import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle, FiX } from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '@/store';
import { dismissToast, type Toast, type ToastVariant } from '@/store/slices/uiSlice';

const ICONS: Record<ToastVariant, typeof FiCheckCircle> = {
  success: FiCheckCircle,
  error: FiAlertCircle,
  info: FiInfo,
  warning: FiAlertTriangle,
};

const TONES: Record<ToastVariant, string> = {
  success: 'border-l-emerald-500 text-emerald-600',
  error: 'border-l-brand-600 text-brand-600',
  info: 'border-l-blue-500 text-blue-600',
  warning: 'border-l-amber-500 text-amber-600',
};

const DURATIONS: Record<ToastVariant, number> = {
  success: 3200,
  info: 3600,
  warning: 4800,
  error: 5600,
};

const ToastRow = ({ toast }: { toast: Toast }) => {
  const dispatch = useAppDispatch();
  const Icon = ICONS[toast.variant];

  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismissToast(toast.id)), DURATIONS[toast.variant]);
    return () => clearTimeout(timer);
  }, [dispatch, toast.id, toast.variant]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      role="status"
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-ink-100 border-l-4 bg-white p-3.5 shadow-lift ${TONES[toast.variant]}`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <p className="flex-1 text-sm font-medium text-ink-700">{toast.message}</p>
      <button
        type="button"
        onClick={() => dispatch(dismissToast(toast.id))}
        aria-label="Dismiss"
        className="-mr-1 -mt-1 rounded p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-600"
      >
        <FiX size={14} />
      </button>
    </motion.div>
  );
};

const Toasts = () => {
  const toasts = useAppSelector((state) => state.ui.toasts);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2.5 sm:right-6 sm:top-6">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastRow key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Toasts;
