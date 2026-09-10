import type { AllocationId, CompanionRelationshipId, DenizenId, WizardId } from "./ids";
import type { TimeParticipantRef, WizardParticipantRef } from "./participants";
import type { FaustianCardId, FaustianCommunityId } from "./faustian-catalogs";
import type { PactSeatId } from "./pact-seats";

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

export type TimeDestinationV4 =
  | CompanionDestination
  | MapIsleSanctumDestination
  | FamiliarDestination
  | OrreryDestination
  | MeetingDestination
  | DomainDestination
  | EngagementDestination
  | SpecialUseDestination;

export const TIME_DESTINATION_KINDS_V4 = [
  "companion", "map_isle_sanctum", "familiar", "orrery",
  "meeting", "domain", "engagement", "special_use",
] as const;

export type TimeDestinationKindV4 = (typeof TIME_DESTINATION_KINDS_V4)[number];

export interface DevilCommunityDestination {
  readonly kind: "devil_community";
  readonly communityId: FaustianCommunityId;
}

export interface DevilSchemesDestination {
  readonly kind: "devil_schemes";
  readonly cardIds: readonly FaustianCardId[];
}

export interface DevilCompanionDestination {
  readonly kind: "devil_companion";
  readonly companionRelationshipId: CompanionRelationshipId;
}

export interface DevilGrimoireDestination {
  readonly kind: "devil_grimoire";
}

export interface DevilWizardDestination {
  readonly kind: "devil_wizard";
  readonly wizardId: WizardId;
}

export interface DevilDenizenDestination {
  readonly kind: "devil_denizen";
  readonly denizenId: DenizenId;
}

export interface DevilSeizedDomainDestination {
  readonly kind: "devil_seized_domain";
  readonly seatId: PactSeatId;
}

export type DevilOnlyTimeDestination =
  | DevilCommunityDestination
  | DevilSchemesDestination
  | DevilCompanionDestination
  | DevilGrimoireDestination
  | DevilWizardDestination
  | DevilDenizenDestination
  | DevilSeizedDomainDestination;

export type DevilTimeDestination = DevilOnlyTimeDestination | OrreryDestination;

export const DEVIL_ONLY_TIME_DESTINATION_KINDS = [
  "devil_community",
  "devil_schemes",
  "devil_companion",
  "devil_grimoire",
  "devil_wizard",
  "devil_denizen",
  "devil_seized_domain",
] as const;

export type DevilOnlyTimeDestinationKind = (typeof DEVIL_ONLY_TIME_DESTINATION_KINDS)[number];

export type TimeDestinationV5 = TimeDestinationV4 | DevilOnlyTimeDestination;

export const TIME_DESTINATION_KINDS_V5 = [
  ...TIME_DESTINATION_KINDS_V4,
  ...DEVIL_ONLY_TIME_DESTINATION_KINDS,
] as const;

export type TimeDestinationKindV5 = (typeof TIME_DESTINATION_KINDS_V5)[number];

export type TimeDestination = TimeDestinationV5;
export const TIME_DESTINATION_KINDS = TIME_DESTINATION_KINDS_V5;
export type TimeDestinationKind = TimeDestinationKindV5;

export function isDevilOnlyTimeDestination(
  dest: TimeDestination,
): dest is DevilOnlyTimeDestination {
  return (DEVIL_ONLY_TIME_DESTINATION_KINDS as readonly string[]).includes(dest.kind);
}

export function isWizardTimeDestination(dest: TimeDestination): dest is TimeDestinationV4 {
  return (TIME_DESTINATION_KINDS_V4 as readonly string[]).includes(dest.kind);
}

export function isDevilTimeDestination(dest: TimeDestination): dest is DevilTimeDestination {
  return dest.kind === "orrery" || isDevilOnlyTimeDestination(dest);
}

export interface TimeAllocationV4 {
  readonly allocationId: AllocationId;
  readonly destination: TimeDestinationV4 | null;
  readonly note: string | null;
  readonly resolution: AllocationResolution;
}

export interface TimeAllocationV5 {
  readonly allocationId: AllocationId;
  readonly destination: TimeDestinationV5 | null;
  readonly note: string | null;
  readonly resolution: AllocationResolution;
}

export type TimeAllocation = TimeAllocationV5;

export interface TimeParticipantV4 {
  readonly participant: WizardParticipantRef;
  readonly effectiveBudget: number;
  readonly rescheduleAllowance: number;
  readonly reschedulesUsed: number;
  readonly allocations: readonly TimeAllocationV4[];
}

export interface TimeParticipantV5 {
  readonly participant: TimeParticipantRef;
  readonly effectiveBudget: number;
  readonly rescheduleAllowance: number;
  readonly reschedulesUsed: number;
  readonly allocations: readonly TimeAllocationV5[];
}

export type TimeParticipant = TimeParticipantV5;
