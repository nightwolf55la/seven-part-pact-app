import { useEffect } from "react";

export const BASE_DOCUMENT_TITLE = "Seven-Part Pact";

export function isPreviewEnv(): boolean {
  return import.meta.env.VITE_IS_PREVIEW === "true";
}

export function PreviewBadge({ isPreview }: { isPreview: boolean }) {
  if (!isPreview) return null;
  return (
    <div
      className="fixed bottom-3 right-3 z-[60] text-xs font-semibold tracking-wide uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg px-2.5 py-1 shadow-sm pointer-events-none select-none"
      aria-label="Preview / test environment"
    >
      Preview / Test
    </div>
  );
}

export function usePreviewDocumentTitle(isPreview: boolean): void {
  useEffect(() => {
    if (isPreview) {
      document.title = `[PREVIEW] ${BASE_DOCUMENT_TITLE}`;
    } else {
      document.title = BASE_DOCUMENT_TITLE;
    }
  }, [isPreview]);
}
