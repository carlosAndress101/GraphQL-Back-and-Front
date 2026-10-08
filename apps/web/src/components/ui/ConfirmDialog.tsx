import { useEffect, useRef } from "react";
import { Button } from "./Button.tsx";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<Element | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      previousFocus.current = document.activeElement;
      if (!dialog.open) dialog.showModal();
      cancelRef.current?.focus();
    } else {
      if (dialog.open) dialog.close();
      if (previousFocus.current instanceof HTMLElement) previousFocus.current.focus();
    }
  }, [open ]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-dialog-title"
      aria-describedby={description ? "confirm-dialog-description" : undefined}
      onCancel={onClose}
      onClose={onClose}
      className="rounded-lg border border-border bg-surface p-6 text-text backdrop:bg-black/40"
    >
      <h2 id="confirm-dialog-title" className="text-base font-semibold">
        {title}
      </h2>
      {description && (
        <p id="confirm-dialog-description" className="mt-2 max-w-sm text-sm text-muted">
          {description}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button ref={cancelRef} variant="secondary" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
