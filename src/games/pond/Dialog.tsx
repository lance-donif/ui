import { useEffect, useRef, type ReactNode } from 'react';

export function PondDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog?.querySelector<HTMLElement>('button, a[href]')?.focus();
    function keydown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeRef.current?.(); }
      if (e.key !== 'Tab' || !dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')];
      if (!items.length) return;
      if (e.shiftKey && document.activeElement === items[0]) {
        e.preventDefault(); items[items.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === items[items.length - 1]) {
        e.preventDefault(); items[0].focus();
      }
    }
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true }); };
  }, [title]);
  return <div className="pond-shade"><div className="pond-dialog" ref={ref} role="dialog" aria-modal="true" aria-label={title}>{children}</div></div>;
}
