import type { AllocationId } from "./ids";
import type { TimeParticipantRef } from "./participants";

export type { AllocationId } from "./ids";
export { isValidAllocationId, parseAllocationId } from "./ids";

export type AllocationResolution = "pending" | "spent" | "wasted";

export const ALLOCATION_RESOLUTIONS: readonly AllocationResolution[] = [
  "pending", "spent", "wasted",
] as const;

export interface CompanionDestination {
  readonly kind: "companion";
  readonly element: string;
}

export interface MapIsleSanctumDestination {
  readonly kind: "map_isle_sanctum";
}

export interface FamiliarDestination {
  readonly kind: "familiar";
}

export interface OrreryDestination {
  readonly kind: "orrery";
}

export interface MeetingDestination {
  readonly kind: "meeting";
}

export interface DomainDestination {
  readonly kind: "domain";
}

export interface EngagementDestination {
  readonly kind: "engagement";
  readonly engagementId: string;
}

export interface SpecialUseDestination {
  readonly kind: "special_use";
  readonly description: string;
}

export type TimeDestination =
  | CompanionDestination
  | MapIsleSanctumDestination
  | FamiliarDestination
  | OrreryDestination
  | MeetingDestination
  | DomainDestination
  | EngagementDestination
  | SpecialUseDestination;

export const TIME_DESTINATION_KINDS = [
  "companion", "map_isle_sanctum", "familiar", "orrery",
  "meeting", "domain", "engagement", "special_use",
] as const;

export type TimeDestinationKind = (typeof TIME_DESTINATION_KINDS)[number];

export interface TimeAllocation {
  readonly allocationId: AllocationId;
  readonly destination: TimeDestination | null;
  readonly note: string | null;
  readonly resolution: AllocationResolution;
}

export interface TimeParticipant {
  readonly participant: TimeParticipantRef;
  readonly effectiveBudget: number;
  readonly rescheduleAllowance: number;
  readonly reschedulesUsed: number;
  readonly allocations: readonly TimeAllocation[];
}
