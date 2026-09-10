import type {
  DenizenId,
  IsleId,
  PlaceId,
  CompanionRelationshipId,
  WizardId,
  TreasureId,
} from "./ids";
import type {
  CampaignPowerfulDenizenTaxonomy,
  PowerfulDenizenProfile,
} from "./powerful-denizen";

export type ElementId = "air" | "fire" | "earth" | "water";

export const ELEMENT_IDS: readonly ElementId[] = ["air", "fire", "earth", "water"] as const;

export type MortalityState = "not_deceased" | "deceased";

export const MORTALITY_STATES: readonly MortalityState[] = ["not_deceased", "deceased"] as const;

export type WizardOrDenizenSubjectRef =
  | {
      readonly kind: "wizard";
      readonly wizardId: WizardId;
    }
  | {
      readonly kind: "denizen";
      readonly denizenId: DenizenId;
    };

export interface Denizen {
  readonly denizenId: DenizenId;
  readonly name: string;
  readonly representation: "individual" | "collective";
  readonly description: string | null;
  readonly mortalityState: MortalityState | null;
  readonly powerfulProfile: PowerfulDenizenProfile | null;
}

export type TreasureCondition = "intact" | "destroyed";

export const TREASURE_CONDITIONS: readonly TreasureCondition[] = ["intact", "destroyed"] as const;

export type TreasureCustody =
  | {
      readonly kind: "subject";
      readonly subject: WizardOrDenizenSubjectRef;
    }
  | {
      readonly kind: "place";
      readonly placeId: PlaceId;
    }
  | {
      readonly kind: "unlocated";
    }
  | {
      readonly kind: "none";
    };

export interface Treasure {
  readonly treasureId: TreasureId;
  readonly name: string;
  readonly description: string | null;
  readonly condition: TreasureCondition;
  readonly custody: TreasureCustody;
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
  readonly campaignPowerfulDenizenTaxonomies: readonly CampaignPowerfulDenizenTaxonomy[];
  readonly treasures: readonly Treasure[];
}

export const EMPTY_SHARED_WORLD_STATE: SharedWorldState = {
  denizens: [],
  isles: [],
  places: [],
  companionRelationships: [],
  campaignPowerfulDenizenTaxonomies: [],
  treasures: [],
};
