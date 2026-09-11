import type {
  CampaignPowerfulDenizenTaxonomyId,
  PowerfulDenizenMethodEntryId,
  PowerfulDenizenTruthId,
} from "./ids";

export const POWERFUL_DENIZEN_BUILTIN_TAXONOMY_IDS = [
  "ghoul_caller",
  "prophet",
  "cult",
  "beast",
  "foe_of_death",
  "conspiracy",
  "occultist",
  "demon",
  "fairy",
  "druid",
  "angel",
  "errant_noble",
  "army",
  "hero",
] as const;

export type BuiltinPowerfulDenizenTaxonomyId =
  (typeof POWERFUL_DENIZEN_BUILTIN_TAXONOMY_IDS)[number];

export interface PowerfulDenizenBuiltinTaxonomyDefinition {
  readonly taxonomyId: BuiltinPowerfulDenizenTaxonomyId;
  readonly name: string;
  readonly description: string | null;
}

export const POWERFUL_DENIZEN_BUILTIN_TAXONOMY_DEFINITIONS: readonly PowerfulDenizenBuiltinTaxonomyDefinition[] = [
  { taxonomyId: "ghoul_caller", name: "Ghoul-Caller", description: null },
  { taxonomyId: "prophet", name: "Prophet", description: null },
  { taxonomyId: "cult", name: "Cult", description: null },
  { taxonomyId: "beast", name: "Beast", description: null },
  { taxonomyId: "foe_of_death", name: "Foe of Death", description: null },
  { taxonomyId: "conspiracy", name: "Conspiracy", description: null },
  { taxonomyId: "occultist", name: "Occultist", description: null },
  { taxonomyId: "demon", name: "Demon", description: null },
  { taxonomyId: "fairy", name: "Fairy", description: null },
  { taxonomyId: "druid", name: "Druid", description: null },
  { taxonomyId: "angel", name: "Angel", description: null },
  { taxonomyId: "errant_noble", name: "Errant Noble", description: null },
  { taxonomyId: "army", name: "Army", description: null },
  { taxonomyId: "hero", name: "Hero", description: null },
];

export function isValidBuiltinPowerfulDenizenTaxonomyId(
  value: string,
): value is BuiltinPowerfulDenizenTaxonomyId {
  return (POWERFUL_DENIZEN_BUILTIN_TAXONOMY_IDS as readonly string[]).includes(value);
}

export type PowerfulDenizenTaxonomyRef =
  | {
      readonly kind: "builtin";
      readonly taxonomyId: BuiltinPowerfulDenizenTaxonomyId;
    }
  | {
      readonly kind: "campaign";
      readonly taxonomyId: CampaignPowerfulDenizenTaxonomyId;
    };

export interface CampaignPowerfulDenizenTaxonomy {
  readonly taxonomyId: CampaignPowerfulDenizenTaxonomyId;
  readonly name: string;
  readonly description: string | null;
}

export const POWERFUL_DENIZEN_STANDARD_STATUS_VALUES = [
  "companion",
  "reliable",
  "disruptive",
  "malignant",
] as const;

export type PowerfulDenizenStandardStatus =
  (typeof POWERFUL_DENIZEN_STANDARD_STATUS_VALUES)[number];

export type PowerfulDenizenStatus =
  | {
      readonly kind: "standard";
      readonly value: PowerfulDenizenStandardStatus;
    }
  | {
      readonly kind: "other";
      readonly label: string;
    };

export const STANDARD_POWERFUL_DENIZEN_METHODS = [
  "rampaging",
  "manipulating",
  "conjuring",
  "occupying",
] as const;

export type StandardPowerfulDenizenMethod =
  (typeof STANDARD_POWERFUL_DENIZEN_METHODS)[number];

export type PowerfulDenizenMethodDefinition =
  | {
      readonly kind: "standard";
      readonly method: StandardPowerfulDenizenMethod;
    }
  | {
      readonly kind: "named";
      readonly name: string;
      readonly description: string | null;
    };

export type PowerfulDenizenEntryOrigin = "source" | "campaign";

export interface PowerfulDenizenMethodEntry {
  readonly methodEntryId: PowerfulDenizenMethodEntryId;
  readonly definition: PowerfulDenizenMethodDefinition;
  readonly origin: PowerfulDenizenEntryOrigin;
}

export interface PowerfulDenizenTruthEntry {
  readonly truthId: PowerfulDenizenTruthId;
  readonly text: string;
  readonly origin: PowerfulDenizenEntryOrigin;
}

export interface PowerfulDenizenProfile {
  readonly taxonomies: readonly PowerfulDenizenTaxonomyRef[];
  readonly status: PowerfulDenizenStatus;
  readonly goal: string | null;
  readonly methods: readonly PowerfulDenizenMethodEntry[];
  readonly truths: readonly PowerfulDenizenTruthEntry[];
}

export function isValidPowerfulDenizenStandardStatus(
  value: string,
): value is PowerfulDenizenStandardStatus {
  return (POWERFUL_DENIZEN_STANDARD_STATUS_VALUES as readonly string[]).includes(value);
}

export function isValidStandardPowerfulDenizenMethod(
  value: string,
): value is StandardPowerfulDenizenMethod {
  return (STANDARD_POWERFUL_DENIZEN_METHODS as readonly string[]).includes(value);
}

export function powerfulDenizenTaxonomyRefKey(ref: PowerfulDenizenTaxonomyRef): string {
  return `${ref.kind}:${ref.taxonomyId}`;
}
