import { useState } from "react";
import CampaignTools from "./CampaignTools";
import type { LunarPhase } from "../shared/domain";

export default function PlayShell({
  campaignId,
  campaignRevision,
  monthDisplayName,
  phase,
}: {
  campaignId: string;
  campaignRevision: number;
  monthDisplayName: string;
  phase: LunarPhase;
}) {
  const [showTools, setShowTools] = useState(false);

  const phaseDisplay: Record<LunarPhase, string> = {
    new_moon: "New Moon",
    visions: "Visions",
    planning: "Planning",
    story: "Story",
    meeting: "Meeting",
    quiet: "Quiet",
  };

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

        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex flex-col items-center gap-4">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Current Month
          </p>
          <p className="text-5xl font-bold text-slate-800 dark:text-slate-100">
            {monthDisplayName}
          </p>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {phaseDisplay[phase]}
          </p>
        </section>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowTools(!showTools)}
            className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            {showTools ? "Back to Play" : "Campaign Tools"}
          </button>
        </div>

        {showTools ? (
          <CampaignTools
            campaignId={campaignId}
            campaignRevision={campaignRevision}
          />
        ) : (
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex flex-col items-center gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
              {phaseDisplay[phase]} workspace will be added in the phase workspace pass.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
