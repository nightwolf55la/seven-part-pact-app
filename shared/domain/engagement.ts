import type { WizardId, AllocationId, EngagementId, DenizenId } from "./ids";

export type { EngagementId } from "./ids";
export { isValidEngagementId, parseEngagementId } from "./ids";

export type EngagementResolution = "pending" | "resolved";

export const ENGAGEMENT_RESOLUTIONS: readonly EngagementResolution[] = [
  "pending", "resolved",
] as const;

export interface WizardTarget {
  readonly kind: "wizard";
  readonly wizardId: WizardId;
}

export interface SelfTarget {
  readonly kind: "self";
}

export interface FamiliarTarget {
  readonly kind: "familiar";
}

export interface NamedCharacterTarget {
  readonly kind: "named_character";
  readonly name: string;
}

export type EngagementTargetV4 =
  | WizardTarget
  | SelfTarget
  | FamiliarTarget
  | NamedCharacterTarget;

export type EngagementTarget = EngagementTargetV5;

export const ENGAGEMENT_TARGET_KINDS = [
  "wizard", "self", "familiar", "named_character",
] as const;

export type EngagementTargetKind = (typeof ENGAGEMENT_TARGET_KINDS)[number];

export interface EngagementRecordV4 {
  readonly engagementId: EngagementId;
  readonly actingWizardId: WizardId;
  readonly target: EngagementTargetV4 | null;
  readonly resolution: EngagementResolution;
  readonly linkedTimeAllocationId: AllocationId | null;
}

export type EngagementRecord = EngagementRecordV5;

// --- V5 candidate engagement types (NOT active in runtime) ---

export interface DenizenTarget {
  readonly kind: "denizen";
  readonly denizenId: DenizenId;
}

export type EngagementTargetV5 =
  | WizardTarget
  | SelfTarget
  | FamiliarTarget
  | NamedCharacterTarget
  | DenizenTarget;

export const ENGAGEMENT_TARGET_KINDS_V5 = [
  "wizard", "self", "familiar", "named_character", "denizen",
] as const;

export type EngagementTargetKindV5 = (typeof ENGAGEMENT_TARGET_KINDS_V5)[number];

export interface EngagementRecordV5 {
  readonly engagementId: EngagementId;
  readonly actingWizardId: WizardId;
  readonly target: EngagementTargetV5 | null;
  readonly resolution: EngagementResolution;
  readonly linkedTimeAllocationId: AllocationId | null;
}
