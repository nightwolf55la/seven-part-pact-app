/**
 * Sage static source catalogs for Draft-4 Laws of Dreaming, Destinies,
 * Dreamscape segments, and Cycles.
 *
 * PHASE-1 SCOPE: identity, name, suit/rank, and addressable IDs only.
 * Truth/Test/Legacy prose and Dreamscape display text remain later
 * operability/UI work unless already repository-local.
 */

export const SAGE_LAW_OF_DREAMING_IDS = [
  "never_give_away_your_name",
  "never_speak_ill_of_another",
  "never_look_down_at_your_own_body",
  "never_attempt_to_read_what_is_written",
  "never_reveal_your_mortal_face",
  "never_guess_at_what_the_future_holds",
  "never_describe_the_past",
] as const;

export type SageLawOfDreamingId = (typeof SAGE_LAW_OF_DREAMING_IDS)[number];

export interface SageLawOfDreamingDefinition {
  readonly lawId: SageLawOfDreamingId;
  readonly text: string;
}

export const SAGE_LAW_OF_DREAMING_DEFINITIONS: readonly SageLawOfDreamingDefinition[] = [
  { lawId: "never_give_away_your_name", text: "Never give away your name." },
  { lawId: "never_speak_ill_of_another", text: "Never speak ill of another." },
  { lawId: "never_look_down_at_your_own_body", text: "Never look down at your own body." },
  { lawId: "never_attempt_to_read_what_is_written", text: "Never attempt to read what is written." },
  { lawId: "never_reveal_your_mortal_face", text: "Never reveal your mortal face." },
  { lawId: "never_guess_at_what_the_future_holds", text: "Never guess at what the future holds." },
  { lawId: "never_describe_the_past", text: "Never describe the past." },
];

export const SAGE_DESTINY_SUITS = ["knives", "wands", "coins", "grails", "flowers"] as const;

export type SageDestinySuit = (typeof SAGE_DESTINY_SUITS)[number];

export const SAGE_DESTINY_RANKS = ["page", "knight", "queen", "king", "beast"] as const;

export type SageDestinyRank = (typeof SAGE_DESTINY_RANKS)[number];

export const SAGE_DESTINY_DEFINITIONS = [
  { definitionId: "knives_true_prince", name: "The True Prince", suit: "knives", rank: "page" },
  { definitionId: "knives_wolf", name: "The Wolf", suit: "knives", rank: "knight" },
  { definitionId: "knives_hangman", name: "The Hangman", suit: "knives", rank: "queen" },
  { definitionId: "knives_tyrant", name: "The Tyrant", suit: "knives", rank: "king" },
  { definitionId: "knives_cataclysm", name: "The Cataclysm", suit: "knives", rank: "beast" },
  { definitionId: "wands_herald", name: "The Herald", suit: "wands", rank: "page" },
  { definitionId: "wands_champion", name: "The Champion", suit: "wands", rank: "knight" },
  { definitionId: "wands_sibyl", name: "The Sibyl", suit: "wands", rank: "queen" },
  { definitionId: "wands_magus", name: "The Magus", suit: "wands", rank: "king" },
  { definitionId: "wands_sphinx", name: "The Sphinx", suit: "wands", rank: "beast" },
  { definitionId: "coins_fox", name: "The Fox", suit: "coins", rank: "page" },
  { definitionId: "coins_rake", name: "The Rake", suit: "coins", rank: "knight" },
  { definitionId: "coins_crone", name: "The Crone", suit: "coins", rank: "queen" },
  { definitionId: "coins_nameless", name: "The Nameless", suit: "coins", rank: "king" },
  { definitionId: "coins_dragon", name: "The Dragon", suit: "coins", rank: "beast" },
  { definitionId: "grails_young_hero", name: "The Young Hero", suit: "grails", rank: "page" },
  { definitionId: "grails_gravedigger", name: "The Gravedigger", suit: "grails", rank: "knight" },
  { definitionId: "grails_wanderer", name: "The Wanderer", suit: "grails", rank: "queen" },
  { definitionId: "grails_green_man", name: "The Green Man", suit: "grails", rank: "king" },
  { definitionId: "grails_leviathan", name: "The Leviathan", suit: "grails", rank: "beast" },
  { definitionId: "flowers_innocent", name: "The Innocent", suit: "flowers", rank: "page" },
  { definitionId: "flowers_justicar", name: "The Justicar", suit: "flowers", rank: "knight" },
  { definitionId: "flowers_hermit", name: "The Hermit", suit: "flowers", rank: "queen" },
  { definitionId: "flowers_caretaker", name: "The Caretaker", suit: "flowers", rank: "king" },
  { definitionId: "flowers_behemoth", name: "The Behemoth", suit: "flowers", rank: "beast" },
] as const;

export type SageDestinyDefinitionId = (typeof SAGE_DESTINY_DEFINITIONS)[number]["definitionId"];

export interface SageDestinyDefinition {
  readonly definitionId: SageDestinyDefinitionId;
  readonly name: string;
  readonly suit: SageDestinySuit;
  readonly rank: SageDestinyRank;
}

export const SAGE_DESTINY_DEFINITION_IDS: readonly SageDestinyDefinitionId[] =
  SAGE_DESTINY_DEFINITIONS.map((definition) => definition.definitionId);

export const SAGE_DREAMSCAPE_SEGMENT_IDS = [
  "position_1",
  "position_2",
  "position_3",
  "position_4",
  "position_5",
  "position_6",
  "position_7",
  "position_8",
  "position_9",
  "position_10",
  "position_11",
  "position_12",
] as const;

export type SageDreamscapeSegmentId = (typeof SAGE_DREAMSCAPE_SEGMENT_IDS)[number];

export interface SageDreamscapeSegmentDefinition {
  readonly segmentId: SageDreamscapeSegmentId;
}

export const SAGE_DREAMSCAPE_SEGMENT_DEFINITIONS: readonly SageDreamscapeSegmentDefinition[] =
  SAGE_DREAMSCAPE_SEGMENT_IDS.map((segmentId) => ({ segmentId }));

export const SAGE_CYCLE_IDS = ["agape", "agon", "cryptos", "kratos", "ekhthroi"] as const;

export type SageCycleId = (typeof SAGE_CYCLE_IDS)[number];

export interface SageCycleDefinition {
  readonly cycleId: SageCycleId;
  readonly name: string;
  readonly requiredRank: SageDestinyRank;
}

export const SAGE_CYCLE_DEFINITIONS: readonly SageCycleDefinition[] = [
  { cycleId: "agape", name: "Agape", requiredRank: "page" },
  { cycleId: "agon", name: "Agon", requiredRank: "knight" },
  { cycleId: "cryptos", name: "Cryptos", requiredRank: "queen" },
  { cycleId: "kratos", name: "Kratos", requiredRank: "king" },
  { cycleId: "ekhthroi", name: "Ekhthroi", requiredRank: "beast" },
];

export const SAGE_ORDINARY_FAIRY_NAME_GLYPHS = [
  "mars",
  "venus",
  "mercury",
  "moon",
  "saturn",
  "neptune",
] as const;

export type SageOrdinaryFairyNameGlyph = (typeof SAGE_ORDINARY_FAIRY_NAME_GLYPHS)[number];

export const SAGE_DREAMING_CONDITIONS = ["calm", "uncertain", "chaotic"] as const;

export type SageDreamingCondition = (typeof SAGE_DREAMING_CONDITIONS)[number];

export const SAGE_FUTURE_CONDITIONS = ["certain", "bleak"] as const;

export type SageFutureCondition = (typeof SAGE_FUTURE_CONDITIONS)[number];

export const SAGE_DESTINY_ASSIGNMENT_STATUSES = ["hidden", "accepted", "rejected"] as const;

export type SageDestinyAssignmentStatus = (typeof SAGE_DESTINY_ASSIGNMENT_STATUSES)[number];

export const SAGE_FAIRY_FORMS = ["cadre", "individual"] as const;

export type SageFairyForm = (typeof SAGE_FAIRY_FORMS)[number];

export const SAGE_DRUID_GRADES = ["ovate", "eremite", "archdruid"] as const;

export type SageDruidGrade = (typeof SAGE_DRUID_GRADES)[number];

const LAW_ID_SET = new Set<string>(SAGE_LAW_OF_DREAMING_IDS);
const DESTINY_DEFINITION_ID_SET = new Set<string>(SAGE_DESTINY_DEFINITION_IDS);
const DREAMSCAPE_SEGMENT_ID_SET = new Set<string>(SAGE_DREAMSCAPE_SEGMENT_IDS);
const CYCLE_ID_SET = new Set<string>(SAGE_CYCLE_IDS);
const ORDINARY_GLYPH_SET = new Set<string>(SAGE_ORDINARY_FAIRY_NAME_GLYPHS);
const DREAMING_CONDITION_SET = new Set<string>(SAGE_DREAMING_CONDITIONS);
const FUTURE_CONDITION_SET = new Set<string>(SAGE_FUTURE_CONDITIONS);
const ASSIGNMENT_STATUS_SET = new Set<string>(SAGE_DESTINY_ASSIGNMENT_STATUSES);
const FAIRY_FORM_SET = new Set<string>(SAGE_FAIRY_FORMS);
const DRUID_GRADE_SET = new Set<string>(SAGE_DRUID_GRADES);

export function isValidSageLawOfDreamingId(value: string): value is SageLawOfDreamingId {
  return LAW_ID_SET.has(value);
}

export function isValidSageDestinyDefinitionId(value: string): value is SageDestinyDefinitionId {
  return DESTINY_DEFINITION_ID_SET.has(value);
}

export function isValidSageDestinySuit(value: string): value is SageDestinySuit {
  return (SAGE_DESTINY_SUITS as readonly string[]).includes(value);
}

export function isValidSageDestinyRank(value: string): value is SageDestinyRank {
  return (SAGE_DESTINY_RANKS as readonly string[]).includes(value);
}

export function isValidSageDreamscapeSegmentId(value: string): value is SageDreamscapeSegmentId {
  return DREAMSCAPE_SEGMENT_ID_SET.has(value);
}

export function isValidSageCycleId(value: string): value is SageCycleId {
  return CYCLE_ID_SET.has(value);
}

export function isValidSageOrdinaryFairyNameGlyph(value: string): value is SageOrdinaryFairyNameGlyph {
  return ORDINARY_GLYPH_SET.has(value);
}

export function isValidSageDreamingCondition(value: string): value is SageDreamingCondition {
  return DREAMING_CONDITION_SET.has(value);
}

export function isValidSageFutureCondition(value: string): value is SageFutureCondition {
  return FUTURE_CONDITION_SET.has(value);
}

export function isValidSageDestinyAssignmentStatus(value: string): value is SageDestinyAssignmentStatus {
  return ASSIGNMENT_STATUS_SET.has(value);
}

export function isValidSageFairyForm(value: string): value is SageFairyForm {
  return FAIRY_FORM_SET.has(value);
}

export function isValidSageDruidGrade(value: string): value is SageDruidGrade {
  return DRUID_GRADE_SET.has(value);
}

export function sageDestinyDefinition(definitionId: SageDestinyDefinitionId): SageDestinyDefinition {
  const definition = SAGE_DESTINY_DEFINITIONS.find((entry) => entry.definitionId === definitionId);
  if (definition === undefined) {
    throw new Error(`Unknown Sage Destiny definition: ${definitionId}`);
  }
  return definition;
}

export function sageCycleDefinition(cycleId: SageCycleId): SageCycleDefinition {
  const definition = SAGE_CYCLE_DEFINITIONS.find((entry) => entry.cycleId === cycleId);
  if (definition === undefined) {
    throw new Error(`Unknown Sage Cycle: ${cycleId}`);
  }
  return definition;
}
