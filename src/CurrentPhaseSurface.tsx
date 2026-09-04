import type { LunarPhase } from "../shared/domain/campaign-state";
import { getPhaseWorkspaceModel } from "./phase-workspace-model";
import NewMoonSurface from "./NewMoonSurface";
import VisionsSurface from "./VisionsSurface";
import PlanningSurface from "./PlanningSurface";

export interface CurrentPhaseSurfaceProps {
  phase: LunarPhase;
  monthOrdinal: number;
}

export default function CurrentPhaseSurface({ phase, monthOrdinal }: CurrentPhaseSurfaceProps) {
  const model = getPhaseWorkspaceModel(phase);

  switch (phase) {
    case "new_moon":
      return <NewMoonSurface phase={phase} monthOrdinal={monthOrdinal} />;
    case "visions":
      return <VisionsSurface phase={phase} monthOrdinal={monthOrdinal} />;
    case "planning":
      return <PlanningSurface phase={phase} monthOrdinal={monthOrdinal} />;
    default:
      return (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Current Phase
          </h3>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {model.displayName}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            The {model.displayName} phase workspace will be added in the next
            corresponding implementation slice.
          </p>
        </section>
      );
  }
}
