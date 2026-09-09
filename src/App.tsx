import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api.js";
import { resolveLifecycleRoute } from "./lifecycle-routing";
import NoCampaign from "./NoCampaign";
import DeletionInProgress from "./DeletionInProgress";
import CorruptCampaign from "./CorruptCampaign";
import SetupView from "./SetupView";
import PlayShell from "./PlayShell";
import { EnvironmentBadge, usePreviewDocumentTitle, isPreviewEnv } from "./preview-indicator";
import { resolveAppEnvironment } from "./app-environment";
import { useDemoCampaign } from "./useDemoCampaign";

function DemoCampaignBanner({
  progress,
  error,
  onDismiss,
}: {
  progress: string | null;
  error: string | null;
  onDismiss: () => void;
}) {
  if (progress === null && error === null) return null;

  return (
    <div
      role="status"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[70] w-[min(36rem,calc(100vw-1.5rem))] rounded-xl border px-4 py-3 shadow-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"
    >
      {progress !== null && (
        <p className="text-slate-700 dark:text-slate-200">{progress}</p>
      )}
      {error !== null && (
        <div className="flex flex-col gap-2">
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={onDismiss}
            className="self-start rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const lifecycle = useQuery(api.lifecycleQueries.getCampaignLifecycle, {});
  const route = resolveLifecycleRoute(lifecycle);
  const env = resolveAppEnvironment({
    dev: import.meta.env.DEV,
    isPreview: isPreviewEnv(),
  });
  const demo = useDemoCampaign(env.demoToolsEnabled);

  usePreviewDocumentTitle(env.badge === "preview");

  let screen: React.ReactNode;
  switch (route.kind) {
    case "loading":
      screen = (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center px-4 py-12">
          <p className="text-sm text-slate-400 dark:text-slate-500">Loading…</p>
        </main>
      );
      break;
    case "no_campaign":
      screen = (
        <NoCampaign
          demoToolsEnabled={env.demoToolsEnabled}
          onStartDemo={env.demoToolsEnabled ? demo.start : undefined}
          demoPending={demo.pending}
        />
      );
      break;
    case "deleting":
      screen = (
        <DeletionInProgress campaignId={route.campaignId} phase={route.phase} />
      );
      break;
    case "corrupt":
      screen = <CorruptCampaign reason={route.reason} />;
      break;
    case "setup":
      screen = (
        <SetupView
          campaignId={route.campaignId}
          campaignRevision={route.campaignRevision}
        />
      );
      break;
    case "play":
      screen = (
        <PlayShell
          campaignId={route.campaignId}
          campaignRevision={route.campaignRevision}
          monthDisplayName={route.monthDisplayName}
          phase={route.phase}
        />
      );
      break;
  }

  return (
    <>
      {screen}
      <DemoCampaignBanner
        progress={demo.progress}
        error={demo.status === "error" ? demo.error : null}
        onDismiss={demo.dismiss}
      />
      <EnvironmentBadge badge={env.badge} />
    </>
  );
}
