import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api.js";
import { resolveLifecycleRoute } from "./lifecycle-routing";
import NoCampaign from "./NoCampaign";
import DeletionInProgress from "./DeletionInProgress";
import CorruptCampaign from "./CorruptCampaign";
import SetupView from "./SetupView";
import PlayShell from "./PlayShell";
import { PreviewBadge, usePreviewDocumentTitle, isPreviewEnv } from "./preview-indicator";

export default function App() {
  const lifecycle = useQuery(api.lifecycleQueries.getCampaignLifecycle, {});
  const route = resolveLifecycleRoute(lifecycle);
  const isPreview = isPreviewEnv();

  usePreviewDocumentTitle(isPreview);

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
      screen = <NoCampaign />;
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
      <PreviewBadge isPreview={isPreview} />
    </>
  );
}
