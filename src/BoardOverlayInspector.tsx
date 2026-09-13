import { useEffect, type ReactNode } from "react";

export default function BoardOverlayInspector({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <aside
      data-board-overlay-inspector
      role="region"
      aria-label={title}
      className="absolute inset-y-2 right-2 z-20 flex w-[min(100%,400px)] max-w-[420px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-xl dark:border-slate-700 dark:bg-slate-900/95"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        <button
          type="button"
          aria-label="Close inspector"
          className="text-xs font-medium rounded-lg px-2.5 py-1 cursor-pointer border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <div data-board-overlay-inspector-scroll className="min-h-0 flex-1 overflow-y-auto p-3">
        {children}
      </div>
    </aside>
  );
}
