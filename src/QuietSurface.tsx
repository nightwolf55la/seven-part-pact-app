import { useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api.js";
import type { LunarPhase } from "../shared/domain/campaign-state";
import {
  quietSummary,
  formatQuietWarning,
  destinationLabel,
  engagementTargetLabel,
  type QuietWorkspaceData,
  type QuietWarning,
} from "./meeting-quiet-view-model";
import BeginNextMonthAction from "./BeginNextMonthAction";

export interface QuietSurfaceProps {
  phase: LunarPhase;
  monthOrdinal: number;
}

export default function QuietSurface({ phase: _phase, monthOrdinal: _monthOrdinal }: QuietSurfaceProps) {
  const quietData = useQuery(api.m3Queries.getQuietWorkspace, {});

  const data = quietData as QuietWorkspaceData | null | undefined;

  if (data === undefined) {
    return (
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <p className="text-sm text-slate-400">Loading Quiet workspace…</p>
      </section>
    );
  }

  if (data === null) {
    return (
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <p className="text-sm text-slate-400">Quiet state is updating…</p>
      </section>
    );
  }

  const summary = quietSummary(data);
  const formatWarning = useCallback(
    (w: QuietWarning) => formatQuietWarning(w, data),
    [data],
  );

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Current Phase
        </h3>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">Quiet</p>
      </div>

      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3">
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          The month is wrapping up. Unresolved resources will not be silently
          rewritten as spent or resolved. Proceeding may require explicit
          acknowledgement of warnings. The prior state is preserved in the
          audit history.
        </p>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span>Pending Time: <span className="font-medium text-slate-700 dark:text-slate-200">{summary.pendingTimeCount}</span></span>
        <span>Unresolved Engagements: <span className="font-medium text-slate-700 dark:text-slate-200">{summary.unresolvedEngagementCount}</span></span>
      </div>

      {/* Attendance */}
      {data.wizardmootAttendance.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Wizardmoot Attendance
          </h4>
          {data.wizardmootAttendance.map((a) => (
            <div key={a.wizardId} className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-200">{a.wizardName}</span>
              : {a.attended ? "Attended" : "Did not attend"}
              {a.exceptionReason && <span className="ml-1">({a.exceptionReason})</span>}
            </div>
          ))}
        </div>
      )}

      {/* Unresolved Time */}
      {summary.pendingTimeCount > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Unresolved Time
          </h4>
          {data.timeParticipants.flatMap((tp) =>
            tp.allocations
              .filter((a) => a.resolution === "pending")
              .map((a) => (
                <div key={a.allocationId} className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{tp.wizardName}</span>
                  : {destinationLabel(a.destination, data)}
                  {a.note && <span className="ml-1">({a.note})</span>}
                </div>
              )),
          )}
        </div>
      )}

      {/* Unresolved Engagements */}
      {summary.unresolvedEngagementCount > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Unresolved Engagements
          </h4>
          {data.engagements
            .filter((e) => e.resolution === "pending")
            .map((e) => {
              const wiz = data.modeledWizards.find((w) => w.wizardId === e.actingWizardId);
              return (
                <div key={e.engagementId} className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{wiz?.name ?? e.actingWizardId}</span>
                  : {engagementTargetLabel(e.target, data)}
                  {e.linkedTimeAllocationId && (
                    <span className="ml-1">(linked: {e.linkedTimeAllocationId})</span>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Begin Next Month */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
        <BeginNextMonthAction
          expectedMonthOrdinal={data.monthOrdinal}
          formatWarning={formatWarning}
          data={data}
        />
      </div>
    </section>
  );
}
