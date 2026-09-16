import type { ReactNode } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import Modal from './Modal';
import Button from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  tone?: 'danger' | 'primary';
}

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  tone = 'danger',
}: ConfirmDialogProps) => (
  <Modal
    open={open}
    onClose={onClose}
    size="sm"
    closeOnBackdrop={!loading}
    footer={
      <>
        <Button variant="outline" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={tone} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </>
    }
  >
    <div className="flex gap-4">
      <span
        className={
          tone === 'danger'
            ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600'
            : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600'
        }
      >
        <FiAlertTriangle size={20} />
      </span>
      <div>
        <h3 className="text-base font-bold text-ink-900">{title}</h3>
        <div className="mt-1 text-sm text-ink-600">{message}</div>
      </div>
    </div>
  </Modal>
);

export default ConfirmDialog;
