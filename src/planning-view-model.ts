import type { TimeDestination } from "../shared/domain/time-model";
import type { EngagementTarget } from "../shared/domain/engagement";
import type { WizardId } from "../shared/domain/ids";

// --- Read-model types (mirrors the Convex query return shape) ---

export interface PlanningAllocation {
  readonly allocationId: string;
  readonly destination: TimeDestination | null;
  readonly note: string | null;
  readonly resolution: "pending" | "spent" | "wasted";
}

export interface PlanningTimeParticipant {
  readonly wizardId: string;
  readonly wizardName: string;
  readonly effectiveBudget: number;
  readonly rescheduleAllowance: number;
  readonly reschedulesUsed: number;
  readonly allocations: readonly PlanningAllocation[];
}

export interface PlanningEngagement {
  readonly engagementId: string;
  readonly actingWizardId: string;
  readonly target: EngagementTarget | null;
  readonly resolution: "pending" | "resolved";
  readonly linkedTimeAllocationId: string | null;
}

export interface ModeledWizard {
  readonly wizardId: string;
  readonly name: string;
}

export interface PlanningWorkspaceData {
  readonly monthOrdinal: number;
  readonly timeParticipants: readonly PlanningTimeParticipant[];
  readonly engagements: readonly PlanningEngagement[];
  readonly modeledWizards: readonly ModeledWizard[];
}

export interface PlanningWarning {
  readonly key: string;
  readonly kind: string;
  readonly resourceId: string;
}

// --- A. Participant selection ---

export function selectParticipant(
  data: PlanningWorkspaceData,
  selectedWizardId: string | null,
): PlanningTimeParticipant | null {
  if (data.timeParticipants.length === 0) return null;
  if (selectedWizardId !== null) {
    const found = data.timeParticipants.find((tp) => tp.wizardId === selectedWizardId);
    if (found) return found;
  }
  return data.timeParticipants[0];
}

// --- B. Allocation destination display ---

export interface WorkspaceDataLike {
  readonly engagements: readonly { engagementId: string; actingWizardId: string }[];
  readonly modeledWizards: readonly ModeledWizard[];
}

function wizardNameById(data: WorkspaceDataLike, wizardId: string): string | null {
  const w = data.modeledWizards.find((mw) => mw.wizardId === wizardId);
  return w ? w.name : null;
}

function engagementDisplay(data: WorkspaceDataLike, engagementId: string): string {
  const eng = data.engagements.find((e) => e.engagementId === engagementId);
  if (!eng) return engagementId;
  const name = wizardNameById(data, eng.actingWizardId);
  return name ? `${name}'s Engagement` : `${eng.actingWizardId}'s Engagement`;
}

export function destinationLabel(
  dest: TimeDestination | null,
  data?: WorkspaceDataLike,
): string {
  if (dest === null) return "Unscheduled";
  switch (dest.kind) {
    case "companion":
      return `Companion: ${dest.element}`;
    case "map_isle_sanctum":
      return "Map / Isle / Sanctum";
    case "familiar":
      return "Familiar";
    case "orrery":
      return "Orrery";
    case "meeting":
      return "Wizardmoot / Meeting";
    case "domain":
      return "Domain";
    case "engagement":
      return `Engagement: ${data ? engagementDisplay(data, dest.engagementId) : dest.engagementId}`;
    case "special_use":
      return `Special Use: ${dest.description}`;
  }
}

// --- C. Engagement target display ---

export function engagementTargetLabel(
  target: EngagementTarget | null,
  data?: WorkspaceDataLike,
): string {
  if (target === null) return "Not targeted";
  switch (target.kind) {
    case "wizard":
      return `Wizard: ${data ? (wizardNameById(data, target.wizardId) ?? target.wizardId) : target.wizardId}`;
    case "self":
      return "Self";
    case "familiar":
      return "Familiar";
    case "named_character":
      return `Named character: ${target.name}`;
  }
}

// --- D. Planning warning display ---

export function formatPlanningWarning(
  warning: PlanningWarning,
  data: PlanningWorkspaceData,
): string {
  switch (warning.kind) {
    case "unscheduled_time": {
      for (const tp of data.timeParticipants) {
        const alloc = tp.allocations.find((a) => a.allocationId === warning.resourceId);
        if (alloc) {
          return `${tp.wizardName} has an unscheduled Time allocation.`;
        }
      }
      break;
    }
    case "untargeted_engagement": {
      const eng = data.engagements.find((e) => e.engagementId === warning.resourceId);
      if (eng) {
        const name = wizardNameById(data, eng.actingWizardId);
        const label = name ?? eng.actingWizardId;
        return `${label}'s Engagement has no target.`;
      }
      break;
    }
  }
  return `${warning.kind}: ${warning.resourceId}`;
}

// --- E. Form-to-domain helpers ---

export type DestinationChoice =
  | "unscheduled"
  | "companion"
  | "map_isle_sanctum"
  | "familiar"
  | "orrery"
  | "meeting"
  | "domain"
  | "engagement"
  | "special_use";

export function buildTimeDestination(
  choice: DestinationChoice,
  companionElement: string,
  specialUseDescription: string,
  engagementId?: string,
): TimeDestination | null {
  switch (choice) {
    case "unscheduled":
      return null;
    case "companion":
      if (companionElement.trim().length === 0) return null;
      return { kind: "companion", element: companionElement };
    case "map_isle_sanctum":
      return { kind: "map_isle_sanctum" };
    case "familiar":
      return { kind: "familiar" };
    case "orrery":
      return { kind: "orrery" };
    case "meeting":
      return { kind: "meeting" };
    case "domain":
      return { kind: "domain" };
    case "engagement":
      if (!engagementId) return null;
      return { kind: "engagement", engagementId };
    case "special_use":
      if (specialUseDescription.trim().length === 0) return null;
      return { kind: "special_use", description: specialUseDescription };
  }
}

export type TargetChoice =
  | "not_targeted"
  | "self"
  | "familiar"
  | "wizard"
  | "named_character";

export function buildEngagementTarget(
  choice: TargetChoice,
  text: string,
): EngagementTarget | null {
  switch (choice) {
    case "not_targeted":
      return null;
    case "self":
      return { kind: "self" };
    case "familiar":
      return { kind: "familiar" };
    case "wizard":
      if (text.trim().length === 0) return null;
      return { kind: "wizard", wizardId: text as WizardId };
    case "named_character":
      if (text.trim().length === 0) return null;
      return { kind: "named_character", name: text };
  }
}
