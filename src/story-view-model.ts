import type { TimeDestination } from "../shared/domain/time-model";
import type { EngagementTarget } from "../shared/domain/engagement";
import type { MovablePlanetId } from "../shared/domain/orrery";
import {
  destinationLabel,
  engagementTargetLabel,
  type WorkspaceDataLike,
  type ModeledWizard,
  buildTimeDestination,
  buildEngagementTarget,
  type DestinationChoice,
  type TargetChoice,
} from "./planning-view-model";

export { destinationLabel, engagementTargetLabel, buildTimeDestination, buildEngagementTarget };
export type { DestinationChoice, TargetChoice };

// --- Read-model types ---

export interface StoryAllocation {
  readonly allocationId: string;
  readonly destination: TimeDestination | null;
  readonly note: string | null;
  readonly resolution: "pending" | "spent" | "wasted";
}

export interface StoryTimeParticipant {
  readonly wizardId: string;
  readonly wizardName: string;
  readonly effectiveBudget: number;
  readonly rescheduleAllowance: number;
  readonly reschedulesUsed: number;
  readonly allocations: readonly StoryAllocation[];
}

export interface StoryEngagement {
  readonly engagementId: string;
  readonly actingWizardId: string;
  readonly target: EngagementTarget | null;
  readonly resolution: "pending" | "resolved";
  readonly linkedTimeAllocationId: string | null;
}

export interface OrreryPositions {
  readonly saturn: number;
  readonly jupiter: number;
  readonly mars: number;
  readonly venus: number;
  readonly mercury: number;
}

export interface StoryWorkspaceData extends WorkspaceDataLike {
  readonly monthOrdinal: number;
  readonly timeParticipants: readonly StoryTimeParticipant[];
  readonly engagements: readonly StoryEngagement[];
  readonly modeledWizards: readonly ModeledWizard[];
  readonly orreryPositions: OrreryPositions;
}

export interface StoryWarning {
  readonly key: string;
  readonly kind: string;
  readonly resourceId: string;
}

// --- A. Participant selection ---

export function selectStoryParticipant(
  data: StoryWorkspaceData,
  selectedWizardId: string | null,
): StoryTimeParticipant | null {
  if (data.timeParticipants.length === 0) return null;
  if (selectedWizardId !== null) {
    const found = data.timeParticipants.find((tp) => tp.wizardId === selectedWizardId);
    if (found) return found;
  }
  return data.timeParticipants[0];
}

// --- B. Allocation action classification ---

export interface AllocationActions {
  readonly markSpent: boolean;
  readonly waste: boolean;
  readonly reschedule: boolean;
  readonly resolveOrrery: boolean;
}

const MANUAL_SPEND_KINDS = new Set<string>([
  "companion",
  "map_isle_sanctum",
  "familiar",
  "domain",
  "special_use",
]);

export function classifyAllocationActions(
  data: StoryWorkspaceData,
  wizardId: string,
  allocationId: string,
): AllocationActions {
  const tp = data.timeParticipants.find((t) => t.wizardId === wizardId);
  if (!tp) {
    return { markSpent: false, waste: false, reschedule: false, resolveOrrery: false };
  }
  const alloc = tp.allocations.find((a) => a.allocationId === allocationId);
  if (!alloc || alloc.resolution !== "pending") {
    return { markSpent: false, waste: false, reschedule: false, resolveOrrery: false };
  }

  const dest = alloc.destination;
  const hasAllowance = tp.reschedulesUsed < tp.rescheduleAllowance;

  let markSpent = false;
  let waste = false;
  let resolveOrrery = false;

  if (dest === null) {
    waste = true;
  } else if (dest.kind === "meeting") {
    // Meeting waits for Wizardmoot; no spend/waste
  } else if (dest.kind === "orrery") {
    resolveOrrery = true;
    waste = true;
  } else if (dest.kind === "engagement") {
    waste = true;
  } else if (MANUAL_SPEND_KINDS.has(dest.kind)) {
    markSpent = true;
    waste = true;
  }

  return {
    markSpent,
    waste,
    reschedule: hasAllowance,
    resolveOrrery,
  };
}

// --- D. Story warnings ---

function wizardNameById(data: StoryWorkspaceData, wizardId: string): string | null {
  const w = data.modeledWizards.find((mw) => mw.wizardId === wizardId);
  return w ? w.name : null;
}

export function formatStoryWarning(
  warning: StoryWarning,
  data: StoryWorkspaceData,
): string {
  switch (warning.kind) {
    case "unresolved_time": {
      for (const tp of data.timeParticipants) {
        const alloc = tp.allocations.find((a) => a.allocationId === warning.resourceId);
        if (alloc) {
          const destLabel = destinationLabel(alloc.destination, data);
          return `${tp.wizardName} still has unresolved Time: ${destLabel}.`;
        }
      }
      break;
    }
    case "unresolved_engagement": {
      const eng = data.engagements.find((e) => e.engagementId === warning.resourceId);
      if (eng) {
        const name = wizardNameById(data, eng.actingWizardId);
        const label = name ?? eng.actingWizardId;
        return `${label}'s Engagement is still unresolved.`;
      }
      break;
    }
  }
  return `${warning.kind}: ${warning.resourceId}`;
}

// --- E. Engagement linkage candidates ---

export function candidateAllocationsForEngagement(
  data: StoryWorkspaceData,
  engagementId: string,
): StoryAllocation[] {
  const eng = data.engagements.find((e) => e.engagementId === engagementId);
  if (!eng) return [];
  if (eng.linkedTimeAllocationId !== null) return [];

  const tp = data.timeParticipants.find((t) => t.wizardId === eng.actingWizardId);
  if (!tp) return [];

  return tp.allocations.filter((a) => a.resolution === "pending");
}

// --- Orrery helpers ---

export const MOVABLE_PLANET_IDS: readonly MovablePlanetId[] = [
  "saturn", "jupiter", "mars", "venus", "mercury",
] as const;

export const PLANET_LABELS: Record<MovablePlanetId, string> = {
  saturn: "Saturn",
  jupiter: "Jupiter",
  mars: "Mars",
  venus: "Venus",
  mercury: "Mercury",
};

// --- Story reschedule destination choices (excludes engagement) ---

export const STORY_RESCHEDULE_CHOICES: readonly DestinationChoice[] = [
  "unscheduled",
  "companion",
  "map_isle_sanctum",
  "familiar",
  "orrery",
  "meeting",
  "domain",
  "special_use",
] as const;

// --- Engagement target reschedule choices (excludes not_targeted) ---

export const STORY_TARGET_CHOICES: readonly TargetChoice[] = [
  "self",
  "familiar",
  "wizard",
  "named_character",
] as const;
