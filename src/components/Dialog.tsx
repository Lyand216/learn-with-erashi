import { useEffect, useRef, type ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  title: string;
  titleId: string;
  onClose: () => void;
  children: ReactNode;
}

/** Dialog native HTML: fokus terkunci di dalamnya dan Escape menutup otomatis. */
export function Dialog({ open, title, titleId, onClose, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dlg" aria-labelledby={titleId} onClose={onClose}>
      <h3 id={titleId}>{title}</h3>
      {children}
    </dialog>
  );
}
