import { Button } from '../Button/Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card confirm-card">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="modal-actions">
          <Button type="button" onClick={onCancel}> {cancelLabel} </Button>
          <Button type="button" variant="danger" onClick={onConfirm}> {confirmLabel} </Button>
        </div>
      </div>
    </div>
  );
}
