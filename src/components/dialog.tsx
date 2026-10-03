"use client";
// A form in a panel: a bottom sheet on phones, centred on larger screens.
// Escape or the backdrop closes it; focus starts on the first field.
import { useEffect, useRef } from "react";
import { Icon } from "./icons";

export function Dialog({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input, select, textarea, button:not([data-close])")?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 bg-black/45" aria-label="Close" data-close onClick={onClose} />
      <div ref={ref} className="relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-surface shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-semibold">{title}</h2>
          <button type="button" data-close className="grid size-10 place-items-center rounded-full hover:bg-surface-2" aria-label="Close" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3 pb-[calc(.75rem+env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}
