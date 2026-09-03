import type { WizardId, AllocationId, EngagementId } from "./ids";

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

export type EngagementTarget =
  | WizardTarget
  | SelfTarget
  | FamiliarTarget
  | NamedCharacterTarget;

export const ENGAGEMENT_TARGET_KINDS = [
  "wizard", "self", "familiar", "named_character",
] as const;

export type EngagementTargetKind = (typeof ENGAGEMENT_TARGET_KINDS)[number];

export interface EngagementRecord {
  readonly engagementId: EngagementId;
  readonly actingWizardId: WizardId;
  readonly target: EngagementTarget | null;
  readonly resolution: EngagementResolution;
  readonly linkedTimeAllocationId: AllocationId | null;
}
