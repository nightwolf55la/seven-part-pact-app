import type { LunarPhase } from "../shared/domain/campaign-state";

const PHASE_DISPLAY: Record<LunarPhase, string> = {
  new_moon: "New Moon",
  visions: "Visions",
  planning: "Planning",
  story: "Story",
  meeting: "Meeting",
  quiet: "Quiet",
};

export default function CurrentPhaseSurface({ phase }: { phase: LunarPhase }) {
  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Current Phase
      </h3>
      <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
        {PHASE_DISPLAY[phase]}
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        The {PHASE_DISPLAY[phase]} phase workspace will be added in the next pass.
      </p>
    </section>
  );
}
