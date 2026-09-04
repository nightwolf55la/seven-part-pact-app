import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api.js";
import type { LunarPhase } from "../shared/domain/campaign-state";
import type { TimeDestination } from "../shared/domain/time-model";
import type { EngagementTarget } from "../shared/domain/engagement";
import type { MovablePlanetId } from "../shared/domain/orrery";
import PhaseAdvanceAction from "./PhaseAdvanceAction";
import {
  selectStoryParticipant,
  classifyAllocationActions,
  formatStoryWarning,
  candidateAllocationsForEngagement,
  destinationLabel,
  engagementTargetLabel,
  buildTimeDestination,
  buildEngagementTarget,
  MOVABLE_PLANET_IDS,
  PLANET_LABELS,
  STORY_RESCHEDULE_CHOICES,
  STORY_TARGET_CHOICES,
  type StoryWorkspaceData,
  StoryWarning,
  StoryAllocation,
  DestinationChoice,
  TargetChoice,
} from "./story-view-model";

export interface StorySurfaceProps {
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
    lower.includes("only allowed during story") ||
    lower.includes("reschedule allowance")
  );
}

function staleMessage(): string {
  return "The Story state changed before this action completed. Review the current state and try again.";
}

export default function StorySurface({ phase, monthOrdinal: _monthOrdinal }: StorySurfaceProps) {
  const storyData = useQuery(api.m3Queries.getStoryWorkspace, {});

  const [selectedWizardId, setSelectedWizardId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const data = storyData as StoryWorkspaceData | null | undefined;

  const selectedParticipant = useMemo(() => {
    if (data === null || data === undefined) return null;
    return selectStoryParticipant(data, selectedWizardId);
  }, [data, selectedWizardId]);

  const handleSelectWizard = useCallback((wizardId: string) => {
    setSelectedWizardId(wizardId);
  }, []);

  if (data === undefined) {
    return (
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <p className="text-sm text-slate-400">Loading Story workspace…</p>
      </section>
    );
  }

  if (data === null) {
    return (
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <p className="text-sm text-slate-400">Story state is updating…</p>
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
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">Story</p>
      </div>

      {/* Guidance */}
      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3">
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Resolve the month's schedule. Meeting Time waits for the Wizardmoot.
          Other pending work may cause a warning when advancing to Meeting, but
          warnings may be explicitly overridden. The server remains authoritative.
        </p>
      </div>

      {/* Participant selector */}
      {data.timeParticipants.length === 0 ? (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            There are no active Story participants this month.
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
          <StorySummary tp={selectedParticipant} />

          {/* Time list */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Time Allocations
            </h4>
            {selectedParticipant.allocations.map((alloc, idx) => (
              <AllocationCard
                key={alloc.allocationId}
                index={idx}
                allocation={alloc}
                data={data}
                wizardId={selectedParticipant.wizardId}
                monthOrdinal={monthOrdinal}
                actionPending={actionPending}
                setActionPending={setActionPending}
                setError={setActionError}
                error={actionError}
              />
            ))}
          </div>

          {/* Engagements */}
          <EngagementSection
            data={data}
            actingWizardId={selectedParticipant.wizardId}
            monthOrdinal={monthOrdinal}
            actionPending={actionPending}
            setActionPending={setActionPending}
            setError={setActionError}
            error={actionError}
          />
        </>
      )}

      {/* Advance to Meeting */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
        <PhaseAdvanceAction
          expectedMonthOrdinal={monthOrdinal}
          expectedPhase={phase}
          actionLabel="Advance to Meeting"
          formatWarning={(w: StoryWarning) => formatStoryWarning(w, data)}
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
  data: StoryWorkspaceData;
  selectedId: string | null;
  onSelect: (wizardId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {data.timeParticipants.map((tp) => {
        const pendingCount = tp.allocations.filter((a) => a.resolution === "pending").length;
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
              <span className="ml-1.5 text-amber-500">({pendingCount} pending)</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// --- Story Summary ---

function StorySummary({ tp }: { tp: StoryWorkspaceData["timeParticipants"][number] }) {
  const pending = tp.allocations.filter((a) => a.resolution === "pending").length;
  const spent = tp.allocations.filter((a) => a.resolution === "spent").length;
  const wasted = tp.allocations.filter((a) => a.resolution === "wasted").length;
  const remaining = tp.rescheduleAllowance - tp.reschedulesUsed;
  return (
    <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
      <span>Pending: <span className="font-medium text-slate-700 dark:text-slate-200">{pending}</span></span>
      <span>Spent: <span className="font-medium text-slate-700 dark:text-slate-200">{spent}</span></span>
      <span>Wasted: <span className="font-medium text-slate-700 dark:text-slate-200">{wasted}</span></span>
      <span>Reschedule remaining: <span className="font-medium text-slate-700 dark:text-slate-200">{remaining}</span> / {tp.rescheduleAllowance}</span>
    </div>
  );
}

// --- Allocation Card ---

interface AllocationCardProps {
  index: number;
  allocation: StoryAllocation;
  data: StoryWorkspaceData;
  wizardId: string;
  monthOrdinal: number;
  actionPending: boolean;
  setActionPending: (v: boolean) => void;
  setError: (v: string | null) => void;
  error: string | null;
}

function AllocationCard({
  index,
  allocation,
  data,
  wizardId,
  monthOrdinal,
  actionPending,
  setActionPending,
  setError,
  error,
}: AllocationCardProps) {
  const actions = classifyAllocationActions(data, wizardId, allocation.allocationId);

  const [showReschedule, setShowReschedule] = useState(false);
  const [draftChoice, setDraftChoice] = useState<DestinationChoice>("unscheduled");
  const [draftCompanion, setDraftCompanion] = useState("");
  const [draftSpecialUse, setDraftSpecialUse] = useState("");
  const [draftNote, setDraftNote] = useState<string | null>(null);

  const [orreryPlanet, setOrreryPlanet] = useState<MovablePlanetId>("saturn");
  const [orreryDirection, setOrreryDirection] = useState<"forward" | "backward">("forward");

  const [confirmWaste, setConfirmWaste] = useState(false);

  const spendManualTime = useMutation(api.m3Commands.spendManualTime);
  const wasteTime = useMutation(api.m3Commands.wasteTime);
  const rescheduleTime = useMutation(api.m3Commands.rescheduleTime);
  const spendOrreryTime = useMutation(api.m3Commands.spendOrreryTime);

  const handleSpendManual = useCallback(async () => {
    setActionPending(true);
    setError(null);
    try {
      await spendManualTime({
        commandId: generateCommandId(),
        expectedMonthOrdinal: monthOrdinal,
        allocationId: allocation.allocationId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to spend Time.";
      setError(isStaleError(message) ? staleMessage() : message);
    } finally {
      setActionPending(false);
    }
  }, [spendManualTime, monthOrdinal, allocation.allocationId, setActionPending, setError]);

  const handleWaste = useCallback(async () => {
    setActionPending(true);
    setError(null);
    setConfirmWaste(false);
    try {
      await wasteTime({
        commandId: generateCommandId(),
        expectedMonthOrdinal: monthOrdinal,
        allocationId: allocation.allocationId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to waste Time.";
      setError(isStaleError(message) ? staleMessage() : message);
    } finally {
      setActionPending(false);
    }
  }, [wasteTime, monthOrdinal, allocation.allocationId, setActionPending, setError, setConfirmWaste]);

  const handleReschedule = useCallback(async () => {
    const dest = buildTimeDestination(draftChoice, draftCompanion, draftSpecialUse);
    if (draftChoice !== "unscheduled" && dest === null) {
      setError("Please fill in the required details for this destination.");
      return;
    }
    setActionPending(true);
    setError(null);
    try {
      await rescheduleTime({
        commandId: generateCommandId(),
        expectedMonthOrdinal: monthOrdinal,
        allocationId: allocation.allocationId,
        destination: dest as TimeDestination | null,
        note: draftNote,
      });
      setShowReschedule(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reschedule Time.";
      setError(isStaleError(message) ? staleMessage() : message);
    } finally {
      setActionPending(false);
    }
  }, [draftChoice, draftCompanion, draftSpecialUse, draftNote, monthOrdinal, allocation.allocationId, rescheduleTime, setActionPending, setError]);

  const handleOrreryResolve = useCallback(async () => {
    setActionPending(true);
    setError(null);
    try {
      await spendOrreryTime({
        commandId: generateCommandId(),
        expectedMonthOrdinal: monthOrdinal,
        allocationId: allocation.allocationId,
        planetId: orreryPlanet,
        direction: orreryDirection,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resolve Orrery Time.";
      setError(isStaleError(message) ? staleMessage() : message);
    } finally {
      setActionPending(false);
    }
  }, [spendOrreryTime, monthOrdinal, allocation.allocationId, orreryPlanet, orreryDirection, setActionPending, setError]);

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Time {index + 1}
        </span>
        <span className="text-xs text-slate-400">{allocation.resolution}</span>
      </div>

      <div className="text-sm text-slate-500 dark:text-slate-400">
        {destinationLabel(allocation.destination, data)}
        {allocation.note !== null && (
          <span className="block text-xs mt-1">Note: {allocation.note}</span>
        )}
      </div>

      {allocation.resolution === "pending" && (
        <div className="flex flex-wrap gap-2">
          {actions.markSpent && (
            <button
              onClick={() => void handleSpendManual()}
              disabled={actionPending}
              className="text-xs font-medium rounded-lg px-3 py-1.5 bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 hover:bg-slate-600 dark:hover:bg-slate-300 disabled:opacity-50 cursor-pointer transition-colors"
            >
              Mark Spent
            </button>
          )}
          {actions.resolveOrrery && (
            <div className="flex flex-col gap-1 w-full">
              <div className="flex gap-2">
                <select
                  value={orreryPlanet}
                  onChange={(e) => setOrreryPlanet(e.target.value as MovablePlanetId)}
                  className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-slate-700 dark:text-slate-200"
                >
                  {MOVABLE_PLANET_IDS.map((p) => (
                    <option key={p} value={p}>{PLANET_LABELS[p]}</option>
                  ))}
                </select>
                <select
                  value={orreryDirection}
                  onChange={(e) => setOrreryDirection(e.target.value as "forward" | "backward")}
                  className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-slate-700 dark:text-slate-200"
                >
                  <option value="forward">Forward</option>
                  <option value="backward">Backward</option>
                </select>
                <button
                  onClick={() => void handleOrreryResolve()}
                  disabled={actionPending}
                  className="text-xs font-medium rounded-lg px-3 py-1.5 bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 hover:bg-slate-600 dark:hover:bg-slate-300 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  Resolve Orrery Time
                </button>
              </div>
            </div>
          )}
          {actions.waste && !confirmWaste && (
            <button
              onClick={() => setConfirmWaste(true)}
              disabled={actionPending}
              className="text-xs font-medium rounded-lg px-3 py-1.5 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 cursor-pointer transition-colors"
            >
              Waste Time
            </button>
          )}
          {actions.waste && confirmWaste && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600 dark:text-red-400">Time becomes wasted (destination preserved). Confirm?</span>
              <button
                onClick={() => void handleWaste()}
                disabled={actionPending}
                className="text-xs font-medium rounded-lg px-3 py-1.5 bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 cursor-pointer transition-colors"
              >
                Confirm Waste
              </button>
              <button
                onClick={() => setConfirmWaste(false)}
                disabled={actionPending}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
          {actions.reschedule && !showReschedule && (
            <button
              onClick={() => setShowReschedule(true)}
              disabled={actionPending}
              className="text-xs font-medium rounded-lg px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer transition-colors"
            >
              Reschedule
            </button>
          )}
          {actions.reschedule && showReschedule && (
            <div className="flex flex-col gap-2 w-full">
              <select
                value={draftChoice}
                onChange={(e) => setDraftChoice(e.target.value as DestinationChoice)}
                className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-slate-700 dark:text-slate-200"
              >
                {STORY_RESCHEDULE_CHOICES.map((c) => (
                  <option key={c} value={c}>
                    {c === "unscheduled" ? "Unscheduled" :
                     c === "companion" ? "Companion" :
                     c === "map_isle_sanctum" ? "Map / Isle / Sanctum" :
                     c === "familiar" ? "Familiar" :
                     c === "orrery" ? "Orrery" :
                     c === "meeting" ? "Wizardmoot / Meeting" :
                     c === "domain" ? "Domain" :
                     c === "special_use" ? "Special Use" : c}
                  </option>
                ))}
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
              <input
                type="text"
                value={draftNote ?? ""}
                onChange={(e) => setDraftNote(e.target.value)}
                placeholder="Note (optional)"
                className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-slate-700 dark:text-slate-200"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void handleReschedule()}
                  disabled={actionPending}
                  className="text-xs font-medium rounded-lg px-3 py-1.5 bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 hover:bg-slate-600 dark:hover:bg-slate-300 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {actionPending ? "Saving…" : "Save Reschedule"}
                </button>
                <button
                  onClick={() => setShowReschedule(false)}
                  disabled={actionPending}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Engagement Section ---

interface EngagementSectionProps {
  data: StoryWorkspaceData;
  actingWizardId: string;
  monthOrdinal: number;
  actionPending: boolean;
  setActionPending: (v: boolean) => void;
  setError: (v: string | null) => void;
  error: string | null;
}

function EngagementSection({
  data,
  actingWizardId,
  monthOrdinal,
  actionPending,
  setActionPending,
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
          actionPending={actionPending}
          setActionPending={setActionPending}
          setError={setError}
          error={error}
        />
      ))}
    </div>
  );
}

interface EngagementCardProps {
  engagement: StoryWorkspaceData["engagements"][number];
  data: StoryWorkspaceData;
  monthOrdinal: number;
  actionPending: boolean;
  setActionPending: (v: boolean) => void;
  setError: (v: string | null) => void;
  error: string | null;
}

function EngagementCard({
  engagement,
  data,
  monthOrdinal,
  actionPending,
  setActionPending,
  setError,
  error,
}: EngagementCardProps) {
  const isPending = engagement.resolution === "pending";
  const resolveEngagement = useMutation(api.m3Commands.resolveEngagement);
  const commitTimeToEngagement = useMutation(api.m3Commands.commitTimeToEngagement);
  const rescheduleEngagement = useMutation(api.m3Commands.rescheduleEngagement);

  const [commitAllocId, setCommitAllocId] = useState("");
  const [showTargetEdit, setShowTargetEdit] = useState(false);
  const [draftChoice, setDraftChoice] = useState<TargetChoice>("self");
  const [draftWizardId, setDraftWizardId] = useState("");
  const [draftName, setDraftName] = useState("");

  const tp = data.timeParticipants.find((t) => t.wizardId === engagement.actingWizardId);
  const hasAllowance = tp ? tp.reschedulesUsed < tp.rescheduleAllowance : false;
  const candidates = candidateAllocationsForEngagement(data, engagement.engagementId);

  const linkedAlloc = tp?.allocations.find((a) => a.allocationId === engagement.linkedTimeAllocationId);

  const handleResolve = useCallback(async () => {
    setActionPending(true);
    setError(null);
    try {
      await resolveEngagement({
        commandId: generateCommandId(),
        expectedMonthOrdinal: monthOrdinal,
        engagementId: engagement.engagementId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resolve Engagement.";
      setError(isStaleError(message) ? staleMessage() : message);
    } finally {
      setActionPending(false);
    }
  }, [resolveEngagement, monthOrdinal, engagement.engagementId, setActionPending, setError]);

  const handleCommit = useCallback(async () => {
    if (!commitAllocId) {
      setError("Select a Time allocation to commit.");
      return;
    }
    if (!hasAllowance) {
      setError("Reschedule allowance exhausted. Cannot commit Time to Engagement.");
      return;
    }
    setActionPending(true);
    setError(null);
    try {
      await commitTimeToEngagement({
        commandId: generateCommandId(),
        expectedMonthOrdinal: monthOrdinal,
        allocationId: commitAllocId,
        engagementId: engagement.engagementId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to commit Time.";
      setError(isStaleError(message) ? staleMessage() : message);
    } finally {
      setActionPending(false);
    }
  }, [commitTimeToEngagement, monthOrdinal, commitAllocId, engagement.engagementId, hasAllowance, setActionPending, setError]);

  const handleSaveTarget = useCallback(async () => {
    const target = buildEngagementTarget(draftChoice, draftChoice === "wizard" ? draftWizardId : draftName);
    if (target === null) {
      setError("Please fill in the required details for this target.");
      return;
    }
    setActionPending(true);
    setError(null);
    try {
      await rescheduleEngagement({
        commandId: generateCommandId(),
        expectedMonthOrdinal: monthOrdinal,
        engagementId: engagement.engagementId,
        target: target as EngagementTarget,
      });
      setShowTargetEdit(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save target.";
      setError(isStaleError(message) ? staleMessage() : message);
    } finally {
      setActionPending(false);
    }
  }, [rescheduleEngagement, monthOrdinal, engagement.engagementId, draftChoice, draftWizardId, draftName, setActionPending, setError]);

  const otherWizards = data.modeledWizards.filter((w) => w.wizardId !== engagement.actingWizardId);

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
        <div className="flex flex-col gap-2">
          {/* Resolve */}
          <button
            onClick={() => void handleResolve()}
            disabled={actionPending}
            className="text-xs font-medium rounded-lg px-3 py-1.5 bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 hover:bg-slate-600 dark:hover:bg-slate-300 disabled:opacity-50 cursor-pointer transition-colors"
          >
            {engagement.linkedTimeAllocationId !== null
              ? "Resolve Engagement and Spend Linked Time"
              : "Resolve Engagement"}
          </button>

          {/* Commit Time (only if unlinked) */}
          {engagement.linkedTimeAllocationId === null && (
            <div className="flex flex-col gap-1">
              <div className="flex gap-2">
                <select
                  value={commitAllocId}
                  onChange={(e) => setCommitAllocId(e.target.value)}
                  className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-slate-700 dark:text-slate-200"
                >
                  <option value="">Select Time…</option>
                  {candidates.map((c) => (
                    <option key={c.allocationId} value={c.allocationId}>
                      {c.allocationId} ({destinationLabel(c.destination, data)})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => void handleCommit()}
                  disabled={actionPending || !hasAllowance}
                  className="text-xs font-medium rounded-lg px-3 py-1.5 bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 hover:bg-slate-600 dark:hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Commit Time to Engagement
                </button>
              </div>
              {!hasAllowance && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  Reschedule allowance exhausted.
                </span>
              )}
            </div>
          )}

          {/* Reschedule target */}
          {!showTargetEdit && (
            <button
              onClick={() => setShowTargetEdit(true)}
              disabled={actionPending}
              className="text-xs font-medium rounded-lg px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer transition-colors"
            >
              Change Target
            </button>
          )}
          {showTargetEdit && (
            <div className="flex flex-col gap-2">
              <select
                value={draftChoice}
                onChange={(e) => setDraftChoice(e.target.value as TargetChoice)}
                className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-slate-700 dark:text-slate-200"
              >
                {STORY_TARGET_CHOICES.map((c) => (
                  <option key={c} value={c}>
                    {c === "self" ? "Self" :
                     c === "familiar" ? "Familiar" :
                     c === "wizard" ? "Wizard" :
                     c === "named_character" ? "Named character" : c}
                  </option>
                ))}
              </select>
              {draftChoice === "wizard" && (
                <select
                  value={draftWizardId}
                  onChange={(e) => setDraftWizardId(e.target.value)}
                  className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-slate-700 dark:text-slate-200"
                >
                  <option value="">Select wizard…</option>
                  {otherWizards.map((w) => (
                    <option key={w.wizardId} value={w.wizardId}>{w.name}</option>
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void handleSaveTarget()}
                  disabled={actionPending}
                  className="text-xs font-medium rounded-lg px-3 py-1.5 bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 hover:bg-slate-600 dark:hover:bg-slate-300 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {actionPending ? "Saving…" : "Save New Target"}
                </button>
                <button
                  onClick={() => setShowTargetEdit(false)}
                  disabled={actionPending}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
