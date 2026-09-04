import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api.js";
import { resolveLifecycleRoute } from "./lifecycle-routing";
import NoCampaign from "./NoCampaign";
import DeletionInProgress from "./DeletionInProgress";
import CorruptCampaign from "./CorruptCampaign";
import SetupView from "./SetupView";
import PlayShell from "./PlayShell";

export default function App() {
  const lifecycle = useQuery(api.lifecycleQueries.getCampaignLifecycle, {});
  const route = resolveLifecycleRoute(lifecycle);

  switch (route.kind) {
    case "loading":
      return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center px-4 py-12">
          <p className="text-sm text-slate-400 dark:text-slate-500">Loading…</p>
        </main>
      );
    case "no_campaign":
      return <NoCampaign />;
    case "deleting":
      return (
        <DeletionInProgress campaignId={route.campaignId} phase={route.phase} />
      );
    case "corrupt":
      return <CorruptCampaign reason={route.reason} />;
    case "setup":
      return (
        <SetupView
          campaignId={route.campaignId}
          campaignRevision={route.campaignRevision}
        />
      );
    case "play":
      return (
        <PlayShell
          campaignId={route.campaignId}
          campaignRevision={route.campaignRevision}
          monthDisplayName={route.monthDisplayName}
          phase={route.phase}
        />
      );
  }
}
