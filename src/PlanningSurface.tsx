import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api.js";
import type { LunarPhase } from "../shared/domain/campaign-state";
import type { TimeDestination } from "../shared/domain/time-model";
import type { EngagementTarget } from "../shared/domain/engagement";
import PhaseAdvanceAction from "./PhaseAdvanceAction";
import {
  selectParticipant,
  destinationLabel,
  engagementTargetLabel,
  formatPlanningWarning,
  buildTimeDestination,
  buildEngagementTarget,
} from "./planning-view-model";
import type {
  PlanningWorkspaceData,
  PlanningWarning,
  DestinationChoice,
  TargetChoice,
} from "./planning-view-model";

export interface PlanningSurfaceProps {
  phase: LunarPhase;
  monthOrdinal: number;
}

function generateCommandId(): string {
  return `cmd_${crypto.randomUUID()}`;
}

function isStaleError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("expected month") ||
    lower.includes("expected phase") ||
    lower.includes("not found in current month") ||
    lower.includes("is ") && lower.includes(", not pending") ||
    lower.includes("already linked to allocation") ||
    lower.includes("only allowed during planning")
  );
}

function staleMessage(): string {
  return "The Planning state changed before this edit completed. Review the current schedule and try again.";
}

export default function PlanningSurface({ phase, monthOrdinal: _monthOrdinal }: PlanningSurfaceProps) {
  const planningData = useQuery(api.m3Queries.getPlanningWorkspace, {});

  const [selectedWizardId, setSelectedWizardId] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [targetError, setTargetError] = useState<string | null>(null);
  const [schedulePending, setSchedulePending] = useState(false);
  const [targetPending, setTargetPending] = useState(false);

  const scheduleTime = useMutation(api.m3Commands.scheduleTime);
  const setEngagementTarget = useMutation(api.m3Commands.setEngagementTarget);

  const data = planningData as PlanningWorkspaceData | null | undefined;

  const selectedParticipant = useMemo(() => {
    if (data === null || data === undefined) return null;
    return selectParticipant(data, selectedWizardId);
  }, [data, selectedWizardId]);

  const handleSelectWizard = useCallback((wizardId: string) => {
    setSelectedWizardId(wizardId);
  }, []);

  if (data === undefined) {
    return (
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <p className="text-sm text-slate-400">Loading Planning workspace…</p>
      </section>
    );
  }

  if (data === null) {
    return (
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <p className="text-sm text-slate-400">Planning state is updating…</p>
      </section>
    );
  }

  const monthOrdinal = data.monthOrdinal;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col gap-5">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Current Phase
        </h3>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
          Planning
        </p>
      </div>

      {/* Guidance */}
      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3">
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Planning edits are freely editable until Story begins. Changes are
          shared authoritative campaign state and do not consume the Story
          reschedule allowance. Incomplete schedules may proceed after explicit
          warning confirmation.
        </p>
      </div>

      {/* Participant selector */}
      {data.timeParticipants.length === 0 ? (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            There are no active Planning participants this month. You may still
            advance to Story.
          </p>
        </div>
      ) : (
        <ParticipantSelector
          data={data}
          selectedId={selectedParticipant?.wizardId ?? null}
          onSelect={handleSelectWizard}
        />
      )}

      {/* Selected participant details */}
      {selectedParticipant && (
        <>
          <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span>Budget: <span className="font-medium text-slate-700 dark:text-slate-200">{selectedParticipant.effectiveBudget}</span></span>
            <span>Allocations: <span className="font-medium text-slate-700 dark:text-slate-200">{selectedParticipant.allocations.length}</span></span>
            <span>Reschedule allowance: <span className="font-medium text-slate-700 dark:text-slate-200">{selectedParticipant.rescheduleAllowance - selectedParticipant.reschedulesUsed}</span> / {selectedParticipant.rescheduleAllowance}</span>
          </div>

          {/* Time scheduler */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Time Allocations
            </h4>
            {scheduleError && (
              <p
                role="alert"
                className="text-xs text-red-600 dark:text-red-400"
              >
                {scheduleError}
              </p>
            )}
            {selectedParticipant.allocations.map((alloc, idx) => (
              <AllocationCard
                key={alloc.allocationId}
                index={idx}
                allocation={alloc}
                data={data}
                monthOrdinal={monthOrdinal}
                scheduleTime={scheduleTime}
                pending={schedulePending}
                setPending={setSchedulePending}
                setError={setScheduleError}
                error={scheduleError}
              />
            ))}
          </div>

          {/* Engagements */}
          {targetError && (
            <p
              role="alert"
              className="text-xs text-red-600 dark:text-red-400"
            >
              {targetError}
            </p>
          )}
          <EngagementSection
            data={data}
            actingWizardId={selectedParticipant.wizardId}
            monthOrdinal={monthOrdinal}
            setEngagementTarget={setEngagementTarget}
            pending={targetPending}
            setPending={setTargetPending}
            setError={setTargetError}
            error={targetError}
          />
        </>
      )}

      {/* Advance to Story */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
        <PhaseAdvanceAction
          expectedMonthOrdinal={monthOrdinal}
          expectedPhase={phase}
          actionLabel="Advance to Story"
          formatWarning={(w: PlanningWarning) => formatPlanningWarning(w, data)}
        />
      </div>
    </section>
  );
}

// --- Participant Selector ---

function ParticipantSelector({
  data,
  selectedId,
  onSelect,
}: {
  data: PlanningWorkspaceData;
  selectedId: string | null;
  onSelect: (wizardId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {data.timeParticipants.map((tp) => {
        const pendingCount = tp.allocations.filter((a) => a.destination === null && a.resolution === "pending").length;
        const isSelected = tp.wizardId === selectedId;
        return (
          <button
            key={tp.wizardId}
            onClick={() => onSelect(tp.wizardId)}
            className={`text-xs font-medium rounded-lg px-3 py-2 transition-colors cursor-pointer ${
              isSelected
                ? "bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <span className="font-semibold">{tp.wizardName}</span>
            {pendingCount > 0 && (
              <span className="ml-1.5 text-amber-500">({pendingCount} unscheduled)</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// --- Allocation Card ---

interface AllocationCardProps {
  index: number;
  allocation: PlanningWorkspaceData["timeParticipants"][number]["allocations"][number];
  data: PlanningWorkspaceData;
  monthOrdinal: number;
  scheduleTime: ReturnType<typeof useMutation<typeof api.m3Commands.scheduleTime>>;
  pending: boolean;
  setPending: (v: boolean) => void;
  setError: (v: string | null) => void;
  error: string | null;
}

import type { PlanningAllocation } from "./planning-view-model";

function AllocationCard({
  index,
  allocation,
  data,
  monthOrdinal,
  scheduleTime,
  pending,
  setPending,
  setError,
  error,
}: AllocationCardProps) {
  const isPending = allocation.resolution === "pending";

  const [draftChoice, setDraftChoice] = useState<DestinationChoice>(() => {
    if (allocation.destination === null) return "unscheduled";
    return allocation.destination.kind as DestinationChoice;
  });
  const [draftCompanion, setDraftCompanion] = useState(() => {
    if (allocation.destination?.kind === "companion") return allocation.destination.element;
    return "";
  });
  const [draftSpecialUse, setDraftSpecialUse] = useState(() => {
    if (allocation.destination?.kind === "special_use") return allocation.destination.description;
    return "";
  });
  const [draftEngagementId, setDraftEngagementId] = useState(() => {
    if (allocation.destination?.kind === "engagement") return allocation.destination.engagementId;
    return "";
  });
  const [draftNote, setDraftNote] = useState<string | null>(allocation.note);

  const handleSave = useCallback(async () => {
    const dest = buildTimeDestination(draftChoice, draftCompanion, draftSpecialUse, draftEngagementId);
    if (draftChoice !== "unscheduled" && dest === null) {
      setError("Please fill in the required details for this destination.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await scheduleTime({
        commandId: generateCommandId(),
        expectedMonthOrdinal: monthOrdinal,
        allocationId: allocation.allocationId,
        destination: dest as TimeDestination | null,
        note: draftNote,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save schedule.";
      setError(isStaleError(message) ? staleMessage() : message);
    } finally {
      setPending(false);
    }
  }, [draftChoice, draftCompanion, draftSpecialUse, draftEngagementId, draftNote, monthOrdinal, allocation.allocationId, scheduleTime, setPending, setError]);

  const actingWizardId = data.timeParticipants.find((tp) =>
    tp.allocations.some((a) => a.allocationId === allocation.allocationId),
  )?.wizardId;

  const planningEngagements = data.engagements.filter(
    (e) =>
      e.actingWizardId === actingWizardId &&
      e.resolution === "pending",
  );

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Time {index + 1}
        </span>
        <span className={`text-xs ${isPending ? "text-slate-400" : "text-slate-500 dark:text-slate-400"}`}>
          {allocation.resolution}
        </span>
      </div>

      {!isPending ? (
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {destinationLabel(allocation.destination, data)}
          {allocation.note !== null && (
            <span className="block text-xs mt-1">Note: {allocation.note}</span>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <select
              value={draftChoice}
              onChange={(e) => setDraftChoice(e.target.value as DestinationChoice)}
              className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-slate-700 dark:text-slate-200"
            >
              <option value="unscheduled">Unscheduled</option>
              <option value="companion">Companion</option>
              <option value="map_isle_sanctum">Map / Isle / Sanctum</option>
              <option value="familiar">Familiar</option>
              <option value="orrery">Orrery</option>
              <option value="meeting">Wizardmoot / Meeting</option>
              <option value="domain">Domain</option>
              <option value="engagement">Engagement</option>
              <option value="special_use">Special Use</option>
            </select>

            {draftChoice === "companion" && (
              <input
                type="text"
                value={draftCompanion}
                onChange={(e) => setDraftCompanion(e.target.value)}
                placeholder="Element"
                className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-slate-700 dark:text-slate-200"
              />
            )}

            {draftChoice === "special_use" && (
              <input
                type="text"
                value={draftSpecialUse}
                onChange={(e) => setDraftSpecialUse(e.target.value)}
                placeholder="Description"
                className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-slate-700 dark:text-slate-200"
              />
            )}

            {draftChoice === "engagement" && (
              <select
                value={draftEngagementId}
                onChange={(e) => setDraftEngagementId(e.target.value)}
                className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-slate-700 dark:text-slate-200"
              >
                <option value="">Select engagement…</option>
                {planningEngagements.map((e) => {
                  const isCurrent =
                    e.linkedTimeAllocationId === allocation.allocationId;
                  const linkedElsewhere =
                    e.linkedTimeAllocationId !== null && !isCurrent;
                
                  return (
                    <option
                      key={e.engagementId}
                      value={e.engagementId}
                      disabled={linkedElsewhere}
                    >
                      {e.engagementId}
                      {isCurrent
                        ? " (current)"
                        : linkedElsewhere
                          ? " (already linked)"
                          : ""}
                    </option>
                  );
                })}
              </select>
            )}

            <input
              type="text"
              value={draftNote ?? ""}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder="Note (optional)"
              className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-slate-700 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleSave()}
              disabled={pending}
              className="text-xs font-medium rounded-lg px-3 py-1.5 bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 hover:bg-slate-600 dark:hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {pending ? "Saving…" : "Save Time"}
            </button>
            <span className="text-xs text-slate-400">
              Current: {destinationLabel(allocation.destination, data)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// --- Engagement Section ---

interface EngagementSectionProps {
  data: PlanningWorkspaceData;
  actingWizardId: string;
  monthOrdinal: number;
  setEngagementTarget: ReturnType<typeof useMutation<typeof api.m3Commands.setEngagementTarget>>;
  pending: boolean;
  setPending: (v: boolean) => void;
  setError: (v: string | null) => void;
  error: string | null;
}

function EngagementSection({
  data,
  actingWizardId,
  monthOrdinal,
  setEngagementTarget,
  pending,
  setPending,
  setError,
  error,
}: EngagementSectionProps) {
  const wizardEngagements = data.engagements.filter(
    (e) => e.actingWizardId === actingWizardId,
  );

  if (wizardEngagements.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Engagements
      </h4>
      {wizardEngagements.map((eng) => (
        <EngagementCard
          key={eng.engagementId}
          engagement={eng}
          data={data}
          monthOrdinal={monthOrdinal}
          setEngagementTarget={setEngagementTarget}
          pending={pending}
          setPending={setPending}
          setError={setError}
          error={error}
        />
      ))}
    </div>
  );
}

interface EngagementCardProps {
  engagement: PlanningWorkspaceData["engagements"][number];
  data: PlanningWorkspaceData;
  monthOrdinal: number;
  setEngagementTarget: ReturnType<typeof useMutation<typeof api.m3Commands.setEngagementTarget>>;
  pending: boolean;
  setPending: (v: boolean) => void;
  setError: (v: string | null) => void;
  error: string | null;
}

function EngagementCard({
  engagement,
  data,
  monthOrdinal,
  setEngagementTarget,
  pending,
  setPending,
  setError,
  error,
}: EngagementCardProps) {
  const isPending = engagement.resolution === "pending";

  const [draftChoice, setDraftChoice] = useState<TargetChoice>(() => {
    if (engagement.target === null) return "not_targeted";
    return engagement.target.kind as TargetChoice;
  });
  const [draftWizardId, setDraftWizardId] = useState(() => {
    if (engagement.target?.kind === "wizard") return engagement.target.wizardId;
    return "";
  });
  const [draftName, setDraftName] = useState(() => {
    if (engagement.target?.kind === "named_character") return engagement.target.name;
    return "";
  });

  const handleSave = useCallback(async () => {
    const target = buildEngagementTarget(draftChoice, draftChoice === "wizard" ? draftWizardId : draftName);
    if (draftChoice !== "not_targeted" && target === null) {
      setError("Please fill in the required details for this target.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await setEngagementTarget({
        commandId: generateCommandId(),
        expectedMonthOrdinal: monthOrdinal,
        engagementId: engagement.engagementId,
        target: target as EngagementTarget | null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save target.";
      setError(isStaleError(message) ? staleMessage() : message);
    } finally {
      setPending(false);
    }
  }, [draftChoice, draftWizardId, draftName, monthOrdinal, engagement.engagementId, setEngagementTarget, setPending, setError]);

  const otherWizards = data.modeledWizards.filter((w) => w.wizardId !== engagement.actingWizardId);

  const linkedAlloc = data.timeParticipants
    .find((tp) => tp.wizardId === engagement.actingWizardId)
    ?.allocations.find((a) => a.allocationId === engagement.linkedTimeAllocationId);

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {engagement.engagementId}
        </span>
        <span className="text-xs text-slate-400">{engagement.resolution}</span>
      </div>

      <div className="text-xs text-slate-500 dark:text-slate-400">
        Target: {engagementTargetLabel(engagement.target, data)}
        {linkedAlloc && (
          <span className="ml-2">Linked: {linkedAlloc.allocationId}</span>
        )}
      </div>

      {isPending && (
        <>
          <div className="flex flex-col gap-2">
            <select
              value={draftChoice}
              onChange={(e) => setDraftChoice(e.target.value as TargetChoice)}
              className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-slate-700 dark:text-slate-200"
            >
              <option value="not_targeted">Not targeted</option>
              <option value="self">Self</option>
              <option value="familiar">Familiar</option>
              <option value="wizard">Wizard</option>
              <option value="named_character">Named character</option>
            </select>

            {draftChoice === "wizard" && (
              <select
                value={draftWizardId}
                onChange={(e) => setDraftWizardId(e.target.value)}
                className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-slate-700 dark:text-slate-200"
              >
                <option value="">Select wizard…</option>
                {otherWizards.map((w) => (
                  <option key={w.wizardId} value={w.wizardId}>
                    {w.name}
                  </option>
                ))}
              </select>
            )}

            {draftChoice === "named_character" && (
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Character name"
                className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-slate-700 dark:text-slate-200"
              />
            )}
          </div>

          <button
            onClick={() => void handleSave()}
            disabled={pending}
            className="text-xs font-medium rounded-lg px-3 py-1.5 bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 hover:bg-slate-600 dark:hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {pending ? "Saving…" : "Save Target"}
          </button>
        </>
      )}
    </div>
  );
}
