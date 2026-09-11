/**
 * Sorcerer static source catalogs for Draft-4 Schools, Laws of Magic,
 * Reagents, and built-in Alchemical Recipes.
 *
 * F1 SCOPE: identity, source/display metadata, and addressable IDs only.
 * "Choose 2" Law setup, campaign-created Schools/Recipes, and recipe
 * execution belong to F2.
 */

import type { Brand } from "./brand";

export const SORCERER_SOURCE_SCHOOL_IDS = [
  "enchantment",
  "metamorphosis",
  "oneirism",
  "divination",
  "apotropaism",
  "thaumaturgy",
  "invocation",
  "artifice",
] as const;

export type SorcererSourceSchoolId = (typeof SORCERER_SOURCE_SCHOOL_IDS)[number];

export type CampaignSchoolOfMagicId = Brand<string, "CampaignSchoolOfMagicId">;

const BRANDED_UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const CAMPAIGN_SCHOOL_OF_MAGIC_ID_REGEX = new RegExp(`^ssch_${BRANDED_UUID}$`);

export function isValidCampaignSchoolOfMagicId(value: string): value is CampaignSchoolOfMagicId {
  return CAMPAIGN_SCHOOL_OF_MAGIC_ID_REGEX.test(value);
}

export interface SorcererSourceSchoolDefinition {
  readonly schoolId: SorcererSourceSchoolId;
  readonly name: string;
  readonly glyph: string;
}

export const SORCERER_SOURCE_SCHOOL_DEFINITIONS: readonly SorcererSourceSchoolDefinition[] = [
  { schoolId: "enchantment", name: "Enchantment", glyph: "χ" },
  { schoolId: "metamorphosis", name: "Metamorphosis", glyph: "μ" },
  { schoolId: "oneirism", name: "Oneirism", glyph: "ω" },
  { schoolId: "divination", name: "Divination", glyph: "δ" },
  { schoolId: "apotropaism", name: "Apotropaism", glyph: "φ" },
  { schoolId: "thaumaturgy", name: "Thaumaturgy", glyph: "θ" },
  { schoolId: "invocation", name: "Invocation", glyph: "ν" },
  { schoolId: "artifice", name: "Artifice", glyph: "α" },
];

export function isValidSorcererSourceSchoolId(value: string): value is SorcererSourceSchoolId {
  return (SORCERER_SOURCE_SCHOOL_IDS as readonly string[]).includes(value);
}

export function sorcererSourceSchoolDefinition(schoolId: SorcererSourceSchoolId): SorcererSourceSchoolDefinition {
  const found = SORCERER_SOURCE_SCHOOL_DEFINITIONS.find((d) => d.schoolId === schoolId);
  if (found === undefined) {
    throw new Error(`Unknown source School of Magic id: ${schoolId}`);
  }
  return found;
}

export const SORCERER_LAW_OF_MAGIC_IDS = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
] as const;

export type SorcererLawOfMagicId = (typeof SORCERER_LAW_OF_MAGIC_IDS)[number];

/** Application ordinal labels; not source titles. Source Laws are untitled. */
const LAW_OF_MAGIC_APPLICATION_LABELS: Record<SorcererLawOfMagicId, string> = {
  first: "First Law of Magic",
  second: "Second Law of Magic",
  third: "Third Law of Magic",
  fourth: "Fourth Law of Magic",
  fifth: "Fifth Law of Magic",
  sixth: "Sixth Law of Magic",
  seventh: "Seventh Law of Magic",
};

const LAW_OF_MAGIC_SOURCE_TEXT: Record<SorcererLawOfMagicId, string> = {
  first: "Magic requires oral recitation/chants.",
  second: "Magic requires rare tinctures/reagents/materials.",
  third: "Magic requires the Wizard's Familiar.",
  fourth: "Magic requires a wand/staff/gemstone/mask/other casting implement.",
  fifth: "Magic requires runes/circles/geometric texts.",
  sixth: "Magic is channeled through the body, requiring appropriate mental/physical readiness and free gesturing.",
  seventh: "Magic must be kept from mundane humans.",
};

export interface SorcererLawOfMagicDefinition {
  readonly id: SorcererLawOfMagicId;
  /** Application ordinal label; not a source title. */
  readonly applicationLabel: string;
  /** Draft-4 source Law meaning. */
  readonly text: string;
}

export const SORCERER_LAW_OF_MAGIC_DEFINITIONS: readonly SorcererLawOfMagicDefinition[] =
  SORCERER_LAW_OF_MAGIC_IDS.map((id) => ({
    id,
    applicationLabel: LAW_OF_MAGIC_APPLICATION_LABELS[id],
    text: LAW_OF_MAGIC_SOURCE_TEXT[id],
  }));

export function isValidSorcererLawOfMagicId(value: string): value is SorcererLawOfMagicId {
  return (SORCERER_LAW_OF_MAGIC_IDS as readonly string[]).includes(value);
}

export function sorcererLawOfMagicDefinition(id: SorcererLawOfMagicId): SorcererLawOfMagicDefinition {
  const found = SORCERER_LAW_OF_MAGIC_DEFINITIONS.find((d) => d.id === id);
  if (found === undefined) {
    throw new Error(`Unknown Law of Magic id: ${id}`);
  }
  return found;
}

export const SORCERER_SOURCE_REAGENT_IDS = [
  "salt",
  "tin",
  "iron",
  "copper",
  "mercury",
  "silver",
  "lead",
  "aluminum",
  "sulfur",
  "gold",
] as const;

export type SorcererSourceReagentId = (typeof SORCERER_SOURCE_REAGENT_IDS)[number];

export interface SorcererSourceReagentDefinition {
  readonly reagentId: SorcererSourceReagentId;
  readonly name: string;
  readonly glyph: string;
}

export const SORCERER_SOURCE_REAGENT_DEFINITIONS: readonly SorcererSourceReagentDefinition[] = [
  { reagentId: "salt", name: "Salt", glyph: "⊖" },
  { reagentId: "tin", name: "Tin", glyph: "♃" },
  { reagentId: "iron", name: "Iron", glyph: "♂" },
  { reagentId: "copper", name: "Copper", glyph: "♀" },
  { reagentId: "mercury", name: "Mercury", glyph: "☿" },
  { reagentId: "silver", name: "Silver", glyph: "☾" },
  { reagentId: "lead", name: "Lead", glyph: "♄" },
  { reagentId: "aluminum", name: "Aluminum", glyph: "♆" },
  { reagentId: "sulfur", name: "Sulfur", glyph: "🜍" },
  { reagentId: "gold", name: "Gold", glyph: "☉" },
];

export function isValidSorcererSourceReagentId(value: string): value is SorcererSourceReagentId {
  return (SORCERER_SOURCE_REAGENT_IDS as readonly string[]).includes(value);
}

export function sorcererSourceReagentDefinition(reagentId: SorcererSourceReagentId): SorcererSourceReagentDefinition {
  const found = SORCERER_SOURCE_REAGENT_DEFINITIONS.find((d) => d.reagentId === reagentId);
  if (found === undefined) {
    throw new Error(`Unknown source Reagent id: ${reagentId}`);
  }
  return found;
}

export const SORCERER_BUILTIN_ALCHEMICAL_RECIPE_IDS = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
] as const;

export type SorcererBuiltinAlchemicalRecipeId = (typeof SORCERER_BUILTIN_ALCHEMICAL_RECIPE_IDS)[number];

/** Application ordinal labels; source Recipes are untitled numbered actions. */
const RECIPE_APPLICATION_LABELS: Record<SorcererBuiltinAlchemicalRecipeId, string> = {
  first: "First Alchemical Recipe",
  second: "Second Alchemical Recipe",
  third: "Third Alchemical Recipe",
  fourth: "Fourth Alchemical Recipe",
  fifth: "Fifth Alchemical Recipe",
  sixth: "Sixth Alchemical Recipe",
  seventh: "Seventh Alchemical Recipe",
  eighth: "Eighth Alchemical Recipe",
  ninth: "Ninth Alchemical Recipe",
};

export interface SorcererBuiltinAlchemicalRecipeDefinition {
  readonly recipeId: SorcererBuiltinAlchemicalRecipeId;
  /** Application ordinal label; not a source title. */
  readonly applicationLabel: string;
  /** Draft-4 source conversion description. Not an executable recipe. */
  readonly sourceDescription: string;
  /** Narrow output Reagent identity for later structural references. */
  readonly outputReagentIds: readonly SorcererSourceReagentId[];
}

export const SORCERER_BUILTIN_ALCHEMICAL_RECIPE_DEFINITIONS: readonly SorcererBuiltinAlchemicalRecipeDefinition[] = [
  {
    recipeId: "first",
    applicationLabel: RECIPE_APPLICATION_LABELS.first,
    sourceDescription: "2 Knowledge -> Salt",
    outputReagentIds: ["salt"],
  },
  {
    recipeId: "second",
    applicationLabel: RECIPE_APPLICATION_LABELS.second,
    sourceDescription: "2 Salt -> Tin + Lead",
    outputReagentIds: ["tin", "lead"],
  },
  {
    recipeId: "third",
    applicationLabel: RECIPE_APPLICATION_LABELS.third,
    sourceDescription: "2 Tin -> Iron",
    outputReagentIds: ["iron"],
  },
  {
    recipeId: "fourth",
    applicationLabel: RECIPE_APPLICATION_LABELS.fourth,
    sourceDescription: "2 Tin -> Copper",
    outputReagentIds: ["copper"],
  },
  {
    recipeId: "fifth",
    applicationLabel: RECIPE_APPLICATION_LABELS.fifth,
    sourceDescription: "Copper + Iron + Tin -> Mercury",
    outputReagentIds: ["mercury"],
  },
  {
    recipeId: "sixth",
    applicationLabel: RECIPE_APPLICATION_LABELS.sixth,
    sourceDescription: "Tome + Tin -> Silver",
    outputReagentIds: ["silver"],
  },
  {
    recipeId: "seventh",
    applicationLabel: RECIPE_APPLICATION_LABELS.seventh,
    sourceDescription: "Tome + Silver + Copper -> Aluminum",
    outputReagentIds: ["aluminum"],
  },
  {
    recipeId: "eighth",
    applicationLabel: RECIPE_APPLICATION_LABELS.eighth,
    sourceDescription: "Student + Lead + Salt -> Sulfur",
    outputReagentIds: ["sulfur"],
  },
  {
    recipeId: "ninth",
    applicationLabel: RECIPE_APPLICATION_LABELS.ninth,
    sourceDescription: "Sulfur + Aluminum + Lead + Silver + Mercury + Copper + Iron + Tin -> Gold",
    outputReagentIds: ["gold"],
  },
];

export function isValidSorcererBuiltinAlchemicalRecipeId(
  value: string,
): value is SorcererBuiltinAlchemicalRecipeId {
  return (SORCERER_BUILTIN_ALCHEMICAL_RECIPE_IDS as readonly string[]).includes(value);
}

export function sorcererBuiltinAlchemicalRecipeDefinition(
  recipeId: SorcererBuiltinAlchemicalRecipeId,
): SorcererBuiltinAlchemicalRecipeDefinition {
  const found = SORCERER_BUILTIN_ALCHEMICAL_RECIPE_DEFINITIONS.find((d) => d.recipeId === recipeId);
  if (found === undefined) {
    throw new Error(`Unknown built-in Alchemical Recipe id: ${recipeId}`);
  }
  return found;
}

export const SORCERER_ARRANGEMENT_IDS = ["quiet", "dynamic", "explosive"] as const;

export type SorcererArrangementId = (typeof SORCERER_ARRANGEMENT_IDS)[number];

export function isValidSorcererArrangementId(value: string): value is SorcererArrangementId {
  return (SORCERER_ARRANGEMENT_IDS as readonly string[]).includes(value);
}
