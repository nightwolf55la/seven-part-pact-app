/**
 * Static Grimoire spell-reference catalog for Draft-4 source spells.
 *
 * REFERENCE IDENTITY ONLY: spellId, source/display name, School, isGreatWork.
 * Limits, Glyph tables, Import, casting, and effects are out of F1 scope.
 */

import type { SorcererSourceSchoolId } from "./sorcerer-catalogs";

export const GRIMOIRE_SPELL_IDS = [
  "hand_of_power",
  "bombardment",
  "mending",
  "sundering",
  "duplication",
  "animating_the_inanimate",
  "the_creation_of_canopic_vessels",
  "apotheosis",
  "the_shapeshifters_duel",
  "mimesis",
  "murmuration",
  "petrification",
  "true_transformation",
  "the_creation_of_shifting_vestments",
  "titanomachy",
  "illusion",
  "projection",
  "delirium",
  "slumber",
  "hex",
  "the_creation_of_rings",
  "egophagy",
  "dowsing",
  "scrying",
  "recollection",
  "soothsaying",
  "intimation",
  "the_creation_of_orbs",
  "prophecy",
  "fortification",
  "vassalage",
  "sanctuary",
  "forbiddance",
  "weavings_of_labyrinths",
  "the_creation_of_inscribed_armor",
  "annihilation",
  "four_keys_of_elzammarat",
  "summoning_1001_imps",
  "awaken_the_slumbering_kings",
  "resurrection_of_the_dead",
  "the_creation_of_effigies",
  "demiurgy",
  "the_cultivation_of_verdure",
  "speaking_the_names_of_beasts",
  "mastery_of_the_major_winds",
  "mastery_of_the_faraway_sea",
  "mastery_of_the_deep_soil",
  "the_creation_of_musical_instruments",
  "pestilence",
  "the_creation_of_arcane_tools",
  "the_creation_of_alchemical_concoctions",
  "the_creation_of_talismans",
  "the_creation_of_staves",
  "the_creation_of_doorways",
  "the_creation_of_weaponry",
  "the_creation_of_transports",
  "the_creation_of_architecture",
  "anthropogenesis",
] as const;

export type GrimoireSpellId = (typeof GRIMOIRE_SPELL_IDS)[number];

export interface GrimoireSpellDefinition {
  readonly spellId: GrimoireSpellId;
  readonly name: string;
  readonly schoolId: SorcererSourceSchoolId;
  readonly isGreatWork: boolean;
}

function spell(
  spellId: GrimoireSpellId,
  name: string,
  schoolId: SorcererSourceSchoolId,
  isGreatWork = false,
): GrimoireSpellDefinition {
  return { spellId, name, schoolId, isGreatWork };
}

export const GRIMOIRE_SPELL_DEFINITIONS: readonly GrimoireSpellDefinition[] = [
  spell("hand_of_power", "Hand of Power", "enchantment"),
  spell("bombardment", "Bombardment", "enchantment"),
  spell("mending", "Mending", "enchantment"),
  spell("sundering", "Sundering", "enchantment"),
  spell("duplication", "Duplication", "enchantment"),
  spell("animating_the_inanimate", "Animating The Inanimate", "enchantment"),
  spell("the_creation_of_canopic_vessels", "The Creation of Canopic Vessels", "enchantment"),
  spell("apotheosis", "Apotheosis", "enchantment", true),
  spell("the_shapeshifters_duel", "The Shapeshifter's Duel", "metamorphosis"),
  spell("mimesis", "Mimesis", "metamorphosis"),
  spell("murmuration", "Murmuration", "metamorphosis"),
  spell("petrification", "Petrification", "metamorphosis"),
  spell("true_transformation", "True Transformation", "metamorphosis"),
  spell("the_creation_of_shifting_vestments", "The Creation of Shifting Vestments", "metamorphosis"),
  spell("titanomachy", "Titanomachy", "metamorphosis", true),
  spell("illusion", "Illusion", "oneirism"),
  spell("projection", "Projection", "oneirism"),
  spell("delirium", "Delirium", "oneirism"),
  spell("slumber", "Slumber", "oneirism"),
  spell("hex", "Hex", "oneirism"),
  spell("the_creation_of_rings", "The Creation of Rings", "oneirism"),
  spell("egophagy", "Egophagy", "oneirism", true),
  spell("dowsing", "Dowsing", "divination"),
  spell("scrying", "Scrying", "divination"),
  spell("recollection", "Recollection", "divination"),
  spell("soothsaying", "Soothsaying", "divination"),
  spell("intimation", "Intimation", "divination"),
  spell("the_creation_of_orbs", "The Creation of Orbs", "divination"),
  spell("prophecy", "Prophecy", "divination", true),
  spell("fortification", "Fortification", "apotropaism"),
  spell("vassalage", "Vassalage", "apotropaism"),
  spell("sanctuary", "Sanctuary", "apotropaism"),
  spell("forbiddance", "Forbiddance", "apotropaism"),
  spell("weavings_of_labyrinths", "Weavings of Labyrinths", "apotropaism"),
  spell("the_creation_of_inscribed_armor", "The Creation of Inscribed Armor", "apotropaism"),
  spell("annihilation", "Annihilation", "apotropaism", true),
  spell("four_keys_of_elzammarat", "Four Keys of Elzammarat", "thaumaturgy"),
  spell("summoning_1001_imps", "Summoning 1,001 Imps", "thaumaturgy"),
  spell("awaken_the_slumbering_kings", "Awaken The Slumbering Kings", "thaumaturgy"),
  spell("resurrection_of_the_dead", "Resurrection of the Dead", "thaumaturgy"),
  spell("the_creation_of_effigies", "The Creation of Effigies", "thaumaturgy"),
  spell("demiurgy", "Demiurgy", "thaumaturgy", true),
  spell("the_cultivation_of_verdure", "The Cultivation of Verdure", "invocation"),
  spell("speaking_the_names_of_beasts", "Speaking The Names of Beasts", "invocation"),
  spell("mastery_of_the_major_winds", "Mastery of the Major Winds", "invocation"),
  spell("mastery_of_the_faraway_sea", "Mastery of the Faraway Sea", "invocation"),
  spell("mastery_of_the_deep_soil", "Mastery of the Deep Soil", "invocation"),
  spell("the_creation_of_musical_instruments", "The Creation of Musical Instruments", "invocation"),
  spell("pestilence", "Pestilence", "invocation", true),
  spell("the_creation_of_arcane_tools", "The Creation of Arcane Tools", "artifice"),
  spell("the_creation_of_alchemical_concoctions", "The Creation of Alchemical Concoctions", "artifice"),
  spell("the_creation_of_talismans", "The Creation of Talismans", "artifice"),
  spell("the_creation_of_staves", "The Creation of Staves", "artifice"),
  spell("the_creation_of_doorways", "The Creation of Doorways", "artifice"),
  spell("the_creation_of_weaponry", "The Creation of Weaponry", "artifice"),
  spell("the_creation_of_transports", "The Creation of Transports", "artifice"),
  spell("the_creation_of_architecture", "The Creation of Architecture", "artifice"),
  spell("anthropogenesis", "Anthropogenesis", "artifice", true),
];

export const GRIMOIRE_GREAT_WORK_SPELL_IDS = GRIMOIRE_SPELL_DEFINITIONS
  .filter((d) => d.isGreatWork)
  .map((d) => d.spellId);

export function isValidGrimoireSpellId(value: string): value is GrimoireSpellId {
  return (GRIMOIRE_SPELL_IDS as readonly string[]).includes(value);
}

export function grimoireSpellDefinition(spellId: GrimoireSpellId): GrimoireSpellDefinition {
  const found = GRIMOIRE_SPELL_DEFINITIONS.find((d) => d.spellId === spellId);
  if (found === undefined) {
    throw new Error(`Unknown Grimoire spell id: ${spellId}`);
  }
  return found;
}
