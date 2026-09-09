import { useEffect } from "react";
import type { AppEnvironmentBadge } from "./app-environment";

export const BASE_DOCUMENT_TITLE = "Seven-Part Pact";

export function isPreviewEnv(): boolean {
  return import.meta.env.VITE_IS_PREVIEW === "true";
}

export function EnvironmentBadge({ badge }: { badge: AppEnvironmentBadge | null }) {
  if (badge === null) return null;
  const label = badge === "local-dev" ? "Local Dev" : "Preview / Test";
  const ariaLabel =
    badge === "local-dev" ? "Local development environment" : "Preview / test environment";
  return (
    <div
      className="fixed bottom-3 right-3 z-[60] text-xs font-semibold tracking-wide uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg px-2.5 py-1 shadow-sm pointer-events-none select-none"
      aria-label={ariaLabel}
    >
      {label}
    </div>
  );
}

/** @deprecated Use EnvironmentBadge with resolveAppEnvironment().badge */
export function PreviewBadge({ isPreview }: { isPreview: boolean }) {
  return <EnvironmentBadge badge={isPreview ? "preview" : null} />;
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
