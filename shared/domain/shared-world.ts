import type { DenizenId, IsleId, PlaceId, CompanionRelationshipId, WizardId } from "./ids";

export type ElementId = "air" | "fire" | "earth" | "water";

export const ELEMENT_IDS: readonly ElementId[] = ["air", "fire", "earth", "water"] as const;

export interface Denizen {
  readonly denizenId: DenizenId;
  readonly name: string;
  readonly representation: "individual" | "collective";
  readonly description: string | null;
}

export interface Isle {
  readonly isleId: IsleId;
  readonly name: string;
  readonly description: string | null;
}

export interface UnspecifiedPlacement {
  readonly kind: "unspecified";
}

export interface OnIslePlacement {
  readonly kind: "on_isle";
  readonly isleId: IsleId;
}

export interface MobilePlacement {
  readonly kind: "mobile";
  readonly associatedIsleId: IsleId | null;
}

export type WorldPlacePlacement =
  | UnspecifiedPlacement
  | OnIslePlacement
  | MobilePlacement;

export interface WorldPlace {
  readonly placeId: PlaceId;
  readonly name: string;
  readonly description: string | null;
  readonly placement: WorldPlacePlacement;
}

export type CompanionRelationshipStatus = "current" | "ended";

export interface CompanionRelationship {
  readonly companionRelationshipId: CompanionRelationshipId;
  readonly wizardId: WizardId;
  readonly element: ElementId;
  readonly denizenId: DenizenId;
  readonly description: string | null;
  readonly status: CompanionRelationshipStatus;
}

export interface SharedWorldState {
  readonly denizens: readonly Denizen[];
  readonly isles: readonly Isle[];
  readonly places: readonly WorldPlace[];
  readonly companionRelationships: readonly CompanionRelationship[];
}

export const EMPTY_SHARED_WORLD_STATE: SharedWorldState = {
  denizens: [],
  isles: [],
  places: [],
  companionRelationships: [],
};
