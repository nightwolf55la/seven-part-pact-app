import PhaseAdvanceAction from "./PhaseAdvanceAction";
import type { LunarPhase } from "../shared/domain/campaign-state";

export interface VisionsSurfaceProps {
  phase: LunarPhase;
  monthOrdinal: number;
}

export default function VisionsSurface({ phase, monthOrdinal }: VisionsSurfaceProps) {
  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Current Phase
        </h3>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
          Visions
        </p>
      </div>

      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-4 flex flex-col gap-3">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Visions procedure (resolve at the table):
        </p>
        <ol className="list-decimal list-inside text-sm text-slate-600 dark:text-slate-300 flex flex-col gap-1.5">
          <li>
            Each relevant Wizard resolves the Visions / Domain procedure in
            Part 3 of that Wizard&apos;s Codex.
          </li>
          <li>Each then Watches the Stars as directed by the source material.</li>
          <li>Apply any resulting Impacts to the affected Domains.</li>
        </ol>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Domain engines are not automated in this app. It does not claim to
          have performed Domain changes, and it does not persist a general
          Impact record. Use the relevant Codices and source materials to
          resolve this work at the table.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
          You may inspect the Orrery and Table / Wizards surfaces using the
          navigation above while working through Visions.
        </p>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
          Advancing to Planning acknowledges that the table has completed its
          manual Visions work.
        </p>
        <PhaseAdvanceAction
          expectedMonthOrdinal={monthOrdinal}
          expectedPhase={phase}
          actionLabel="Advance to Planning"
        />
      </div>
    </section>
  );
}
