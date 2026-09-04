import PhaseAdvanceAction from "./PhaseAdvanceAction";
import type { LunarPhase } from "../shared/domain/campaign-state";

export interface NewMoonSurfaceProps {
  phase: LunarPhase;
  monthOrdinal: number;
}

export default function NewMoonSurface({ phase, monthOrdinal }: NewMoonSurfaceProps) {
  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Current Phase
        </h3>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
          New Moon
        </p>
      </div>

      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-4">
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          The calendar, Sun, and movable planets have already advanced for month{" "}
          <span className="font-semibold">#{monthOrdinal}</span>. The Orrery now
          reflects the authoritative positions for this new month.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
          Review the Orrery surface before continuing to Visions. You can switch
          to the Orrery using the surface navigation above.
        </p>
      </div>

      <PhaseAdvanceAction
        expectedMonthOrdinal={monthOrdinal}
        expectedPhase={phase}
        actionLabel="Advance to Visions"
      />
    </section>
  );
}
