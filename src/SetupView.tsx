import { useState } from "react";
import CampaignSetup from "./CampaignSetup";
import CampaignTools from "./CampaignTools";
import SetupCompletion from "./SetupCompletion";

export default function SetupView({
  campaignId,
  campaignRevision,
}: {
  campaignId: string;
  campaignRevision: number;
}) {
  const [showTools, setShowTools] = useState(false);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            Seven-Part Pact
          </h1>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Revision {campaignRevision}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
            Campaign Setup
          </h2>
          <button
            onClick={() => setShowTools(!showTools)}
            className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            {showTools ? "Back to Setup" : "Campaign Tools"}
          </button>
        </div>

        {showTools ? (
          <CampaignTools
            campaignId={campaignId}
            campaignRevision={campaignRevision}
          />
        ) : (
          <>
            <CampaignSetup />
            <SetupCompletion />
          </>
        )}
      </div>
    </main>
  );
}
