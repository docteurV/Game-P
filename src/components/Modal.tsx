import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ title, onClose, children, footer }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="scrim fade-in absolute inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="panel enter flex w-full max-w-[340px] flex-col overflow-hidden"
        style={{ maxHeight: '88%' }}
      >
        <div className="panel-head flex items-center justify-between gap-3 px-4 py-3">
          <span className="pixel text-[12px] leading-none">{title}</span>
          <button type="button" className="btn btn-sm px-3" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
        {footer && <div className="border-t-4 border-ink bg-paper p-3">{footer}</div>}
      </div>
    </div>
  );
}
