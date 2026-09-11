/**
 * Warlock static source catalogs for Draft-4 Clans, Ideologies,
 * Court Laws, and Lord Titles.
 *
 * PHASE-1 SCOPE: identity, names, source Clan/seat/location/Ideology,
 * and addressable IDs only. Agenda-effect prose remains later
 * operability/UI work.
 */

import type { PactSeatId } from "./pact-seats";

export const WARLOCK_SOURCE_CLAN_IDS = [
  "caravel",
  "uroch",
  "lark",
  "waine",
  "ix",
] as const;

export type WarlockSourceClanId = (typeof WARLOCK_SOURCE_CLAN_IDS)[number];

export const WARLOCK_EMERGENT_CLAN_IDS = ["orthodoxy", "pirates"] as const;

export type WarlockEmergentClanId = (typeof WARLOCK_EMERGENT_CLAN_IDS)[number];

export const WARLOCK_CLAN_IDS = [
  ...WARLOCK_SOURCE_CLAN_IDS,
  ...WARLOCK_EMERGENT_CLAN_IDS,
] as const;

export type WarlockClanId = (typeof WARLOCK_CLAN_IDS)[number];

export const WARLOCK_SOURCE_HERALDRY_VALUES = [
  "dragon",
  "crab",
  "songbird",
  "dog",
  "goat",
] as const;

export type WarlockSourceHeraldry = (typeof WARLOCK_SOURCE_HERALDRY_VALUES)[number];

export const WARLOCK_SOURCE_CLAN_HERALDRY: {
  readonly [K in WarlockSourceClanId]: WarlockSourceHeraldry;
} = {
  caravel: "dragon",
  uroch: "crab",
  lark: "songbird",
  waine: "dog",
  ix: "goat",
};

export type WarlockClanKind = "source" | "emergent";

export interface WarlockClanDefinition {
  readonly clanId: WarlockClanId;
  readonly name: string;
  readonly kind: WarlockClanKind;
  readonly heraldry: WarlockSourceHeraldry | null;
}

export const WARLOCK_CLAN_DEFINITIONS: readonly WarlockClanDefinition[] = [
  { clanId: "caravel", name: "Caravel", kind: "source", heraldry: "dragon" },
  { clanId: "uroch", name: "Uroch", kind: "source", heraldry: "crab" },
  { clanId: "lark", name: "Lark", kind: "source", heraldry: "songbird" },
  { clanId: "waine", name: "Waine", kind: "source", heraldry: "dog" },
  { clanId: "ix", name: "Ix", kind: "source", heraldry: "goat" },
  { clanId: "orthodoxy", name: "Orthodoxy", kind: "emergent", heraldry: null },
  { clanId: "pirates", name: "Pirates", kind: "emergent", heraldry: null },
];

export const WARLOCK_IDEOLOGY_IDS = [
  "aristocracy",
  "mercantilism",
  "orthodoxy",
  "piracy",
  "rebellion",
  "ergoism",
  "monarchy",
] as const;

export type WarlockIdeologyId = (typeof WARLOCK_IDEOLOGY_IDS)[number];

export interface WarlockIdeologyDefinition {
  readonly ideologyId: WarlockIdeologyId;
  readonly name: string;
}

export const WARLOCK_IDEOLOGY_DEFINITIONS: readonly WarlockIdeologyDefinition[] = [
  { ideologyId: "aristocracy", name: "Aristocracy" },
  { ideologyId: "mercantilism", name: "Mercantilism" },
  { ideologyId: "orthodoxy", name: "Orthodoxy" },
  { ideologyId: "piracy", name: "Piracy" },
  { ideologyId: "rebellion", name: "Rebellion" },
  { ideologyId: "ergoism", name: "Ergoism" },
  { ideologyId: "monarchy", name: "Monarchy" },
];

export const WARLOCK_COURT_LAW_IDS = [
  "do_not_speak_to_a_superior_until_spoken_to",
  "speak_kindly_of_and_agree_with_other_nobles",
  "wear_elaborate_decorative_dress",
  "follow_elaborate_dining_etiquette",
  "give_lavish_gifts_to_other_nobility",
  "do_not_lift_objects_or_perform_common_labor",
  "never_speak_the_previous_kings_name",
] as const;

export type WarlockCourtLawId = (typeof WARLOCK_COURT_LAW_IDS)[number];

export interface WarlockCourtLawDefinition {
  readonly lawId: WarlockCourtLawId;
  readonly text: string;
}

export const WARLOCK_COURT_LAW_DEFINITIONS: readonly WarlockCourtLawDefinition[] = [
  {
    lawId: "do_not_speak_to_a_superior_until_spoken_to",
    text: "Do not speak to a superior until spoken to.",
  },
  {
    lawId: "speak_kindly_of_and_agree_with_other_nobles",
    text: "Speak kindly of and agree with other nobles; challenge only by subtle reframing.",
  },
  {
    lawId: "wear_elaborate_decorative_dress",
    text: "Wear elaborate decorative dress.",
  },
  {
    lawId: "follow_elaborate_dining_etiquette",
    text: "Follow elaborate dining etiquette.",
  },
  {
    lawId: "give_lavish_gifts_to_other_nobility",
    text: "Give lavish gifts to other nobility.",
  },
  {
    lawId: "do_not_lift_objects_or_perform_common_labor",
    text: "Do not lift objects or perform common labor without servants.",
  },
  {
    lawId: "never_speak_the_previous_kings_name",
    text: "Never speak the previous King's name in polite company.",
  },
];

export const WARLOCK_LORD_TITLE_IDS = [
  "royal_historian",
  "pontifex_of_the_immortal_flame",
  "warden_of_mt_ithax",
  "admiral_of_the_sidereal_sea",
  "castellan_of_caravesse",
  "crown_prince_of_the_halcyon_isles",
  "magister_of_the_west",
  "count_of_the_moonlit_atoll",
  "knight_of_the_raven",
  "abbot_of_temple_ushin",
  "admiral_of_the_thyrian_sea",
  "duke_of_the_reach",
  "knight_of_the_seas",
  "castellan_of_thyrhold",
  "knight_of_the_lion",
  "magister_of_the_east",
  "ambassador_of_the_faraway_sea",
  "royal_executioner",
  "abbot_of_temple_krolis",
  "viceroy_of_ishana",
  "admiral_of_the_bay_of_ishana",
  "castellan_of_the_palace",
  "magister_of_the_south",
  "steward_of_the_kings_estate",
  "baron_of_the_graven_isle",
  "knight_of_the_mist",
  "abbot_of_temple_notor",
  "admiral_of_the_east",
  "lord_exchequer_of_the_treasury",
  "governor_of_scuttleport",
  "magister_of_the_north",
  "the_roustabout_knight",
  "abbot_of_temple_zephon",
  "chancellor_of_trade",
  "castellan_of_yeraine",
  "commander_of_the_city_guard",
  "knight_of_the_moon",
  "lord_pursuivant",
  "earl_of_spyrholm",
  "president_of_spyrholm_university",
  "bastard_son_of_the_king",
] as const;

export type WarlockLordTitleId = (typeof WARLOCK_LORD_TITLE_IDS)[number];

export type WarlockTitleBaseSetupPlacement = "source_clan_deck" | "set_aside";

export interface WarlockLordTitleDefinition {
  readonly titleId: WarlockLordTitleId;
  readonly name: string;
  readonly sourceClanId: WarlockSourceClanId | null;
  readonly associatedSeatId: PactSeatId;
  readonly sourceLocationLabel: string;
  readonly passiveIdeologyId: WarlockIdeologyId | null;
  readonly baseSetupPlacement: WarlockTitleBaseSetupPlacement;
}

export const WARLOCK_LORD_TITLE_DEFINITIONS: readonly WarlockLordTitleDefinition[] = [
  {
    titleId: "royal_historian",
    name: "Royal Historian",
    sourceClanId: "caravel",
    associatedSeatId: "necromancer",
    sourceLocationLabel: "Halcyon Isles",
    passiveIdeologyId: "ergoism",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "pontifex_of_the_immortal_flame",
    name: "Pontifex of the Immortal Flame",
    sourceClanId: "caravel",
    associatedSeatId: "hierophant",
    sourceLocationLabel: "Tahv",
    passiveIdeologyId: "aristocracy",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "warden_of_mt_ithax",
    name: "Warden of Mt. Ithax",
    sourceClanId: "caravel",
    associatedSeatId: "hierophant",
    sourceLocationLabel: "Tahv",
    passiveIdeologyId: "orthodoxy",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "admiral_of_the_sidereal_sea",
    name: "Admiral of the Sidereal Sea",
    sourceClanId: "caravel",
    associatedSeatId: "mariner",
    sourceLocationLabel: "Yeraine",
    passiveIdeologyId: "mercantilism",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "castellan_of_caravesse",
    name: "Castellan of Caravesse",
    sourceClanId: "caravel",
    associatedSeatId: "warlock",
    sourceLocationLabel: "Caravesse",
    passiveIdeologyId: "piracy",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "crown_prince_of_the_halcyon_isles",
    name: "Crown Prince of the Halcyon Isles",
    sourceClanId: "caravel",
    associatedSeatId: "warlock",
    sourceLocationLabel: "Halcyon Isles",
    passiveIdeologyId: "rebellion",
    baseSetupPlacement: "set_aside",
  },
  {
    titleId: "magister_of_the_west",
    name: "Magister of the West",
    sourceClanId: "caravel",
    associatedSeatId: "faustian",
    sourceLocationLabel: "Caravesse",
    passiveIdeologyId: "piracy",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "count_of_the_moonlit_atoll",
    name: "Count of the Moonlit Atoll",
    sourceClanId: "caravel",
    associatedSeatId: "sage",
    sourceLocationLabel: "Moonlit Atoll",
    passiveIdeologyId: "rebellion",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "knight_of_the_raven",
    name: "Knight of the Raven",
    sourceClanId: "caravel",
    associatedSeatId: "sorcerer",
    sourceLocationLabel: "Spyrholm",
    passiveIdeologyId: "ergoism",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "abbot_of_temple_ushin",
    name: "Abbot of Temple Ushin",
    sourceClanId: "lark",
    associatedSeatId: "hierophant",
    sourceLocationLabel: "Caravesse",
    passiveIdeologyId: "orthodoxy",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "admiral_of_the_thyrian_sea",
    name: "Admiral of the Thyrian Sea",
    sourceClanId: "lark",
    associatedSeatId: "mariner",
    sourceLocationLabel: "Thyras",
    passiveIdeologyId: "mercantilism",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "duke_of_the_reach",
    name: "Duke of the Reach",
    sourceClanId: "lark",
    associatedSeatId: "mariner",
    sourceLocationLabel: "Thyras",
    passiveIdeologyId: "rebellion",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "knight_of_the_seas",
    name: "Knight of the Seas",
    sourceClanId: "lark",
    associatedSeatId: "mariner",
    sourceLocationLabel: "Far Reach",
    passiveIdeologyId: "aristocracy",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "castellan_of_thyrhold",
    name: "Castellan of Thyrhold",
    sourceClanId: "lark",
    associatedSeatId: "warlock",
    sourceLocationLabel: "Thyras",
    passiveIdeologyId: "piracy",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "knight_of_the_lion",
    name: "Knight of the Lion",
    sourceClanId: "lark",
    associatedSeatId: "warlock",
    sourceLocationLabel: "Halcyon Isles",
    passiveIdeologyId: "aristocracy",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "magister_of_the_east",
    name: "Magister of the East",
    sourceClanId: "lark",
    associatedSeatId: "faustian",
    sourceLocationLabel: "Thyras",
    passiveIdeologyId: "piracy",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "ambassador_of_the_faraway_sea",
    name: "Ambassador of the Faraway Sea",
    sourceClanId: "lark",
    associatedSeatId: "sorcerer",
    sourceLocationLabel: "Koire",
    passiveIdeologyId: "aristocracy",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "royal_executioner",
    name: "Royal Executioner",
    sourceClanId: "uroch",
    associatedSeatId: "necromancer",
    sourceLocationLabel: "Halcyon Isles",
    passiveIdeologyId: "ergoism",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "abbot_of_temple_krolis",
    name: "Abbot of Temple Krolis",
    sourceClanId: "uroch",
    associatedSeatId: "hierophant",
    sourceLocationLabel: "Ishana",
    passiveIdeologyId: "orthodoxy",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "viceroy_of_ishana",
    name: "Viceroy of Ishana",
    sourceClanId: "uroch",
    associatedSeatId: "hierophant",
    sourceLocationLabel: "Ishana",
    passiveIdeologyId: "rebellion",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "admiral_of_the_bay_of_ishana",
    name: "Admiral of the Bay of Ishana",
    sourceClanId: "uroch",
    associatedSeatId: "mariner",
    sourceLocationLabel: "Ishana",
    passiveIdeologyId: "mercantilism",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "castellan_of_the_palace",
    name: "Castellan of the Palace",
    sourceClanId: "uroch",
    associatedSeatId: "warlock",
    sourceLocationLabel: "Halcyon Isles",
    passiveIdeologyId: "piracy",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "magister_of_the_south",
    name: "Magister of the South",
    sourceClanId: "uroch",
    associatedSeatId: "faustian",
    sourceLocationLabel: "Ishana",
    passiveIdeologyId: "orthodoxy",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "steward_of_the_kings_estate",
    name: "Steward of the King's Estate",
    sourceClanId: "uroch",
    associatedSeatId: "sage",
    sourceLocationLabel: "Halcyon Isles",
    passiveIdeologyId: "aristocracy",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "baron_of_the_graven_isle",
    name: "Baron of the Graven Isle",
    sourceClanId: "waine",
    associatedSeatId: "necromancer",
    sourceLocationLabel: "Graven Isle",
    passiveIdeologyId: "rebellion",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "knight_of_the_mist",
    name: "Knight of the Mist",
    sourceClanId: "waine",
    associatedSeatId: "necromancer",
    sourceLocationLabel: "Graven Isle",
    passiveIdeologyId: "aristocracy",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "abbot_of_temple_notor",
    name: "Abbot of Temple Notor",
    sourceClanId: "waine",
    associatedSeatId: "hierophant",
    sourceLocationLabel: "Scuttleport",
    passiveIdeologyId: "orthodoxy",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "admiral_of_the_east",
    name: "Admiral of the East",
    sourceClanId: "waine",
    associatedSeatId: "mariner",
    sourceLocationLabel: "Izor",
    passiveIdeologyId: "mercantilism",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "lord_exchequer_of_the_treasury",
    name: "Lord Exchequer of the Treasury",
    sourceClanId: "waine",
    associatedSeatId: "warlock",
    sourceLocationLabel: "Halcyon Isles",
    passiveIdeologyId: "mercantilism",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "governor_of_scuttleport",
    name: "Governor of Scuttleport",
    sourceClanId: "waine",
    associatedSeatId: "faustian",
    sourceLocationLabel: "Scuttleport",
    passiveIdeologyId: "rebellion",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "magister_of_the_north",
    name: "Magister of the North",
    sourceClanId: "waine",
    associatedSeatId: "faustian",
    sourceLocationLabel: "Scuttleport",
    passiveIdeologyId: "orthodoxy",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "the_roustabout_knight",
    name: "The Roustabout Knight",
    sourceClanId: "waine",
    associatedSeatId: "faustian",
    sourceLocationLabel: "Scuttleport",
    passiveIdeologyId: "aristocracy",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "abbot_of_temple_zephon",
    name: "Abbot of Temple Zephon",
    sourceClanId: "ix",
    associatedSeatId: "hierophant",
    sourceLocationLabel: "Ishana",
    passiveIdeologyId: "orthodoxy",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "chancellor_of_trade",
    name: "Chancellor of Trade",
    sourceClanId: "ix",
    associatedSeatId: "mariner",
    sourceLocationLabel: "Ishana",
    passiveIdeologyId: "mercantilism",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "castellan_of_yeraine",
    name: "Castellan of Yeraine",
    sourceClanId: "ix",
    associatedSeatId: "warlock",
    sourceLocationLabel: "Yeraine",
    passiveIdeologyId: "piracy",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "commander_of_the_city_guard",
    name: "Commander of the City Guard",
    sourceClanId: "ix",
    associatedSeatId: "faustian",
    sourceLocationLabel: "Ishana",
    passiveIdeologyId: "piracy",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "knight_of_the_moon",
    name: "Knight of the Moon",
    sourceClanId: "ix",
    associatedSeatId: "sage",
    sourceLocationLabel: "Yeraine",
    passiveIdeologyId: "ergoism",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "lord_pursuivant",
    name: "Lord Pursuivant",
    sourceClanId: "ix",
    associatedSeatId: "sage",
    sourceLocationLabel: "Spyrholm",
    passiveIdeologyId: "ergoism",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "earl_of_spyrholm",
    name: "Earl of Spyrholm",
    sourceClanId: "ix",
    associatedSeatId: "sorcerer",
    sourceLocationLabel: "Spyrholm",
    passiveIdeologyId: "rebellion",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "president_of_spyrholm_university",
    name: "President of Spyrholm University",
    sourceClanId: "ix",
    associatedSeatId: "sorcerer",
    sourceLocationLabel: "Spyrholm",
    passiveIdeologyId: "ergoism",
    baseSetupPlacement: "source_clan_deck",
  },
  {
    titleId: "bastard_son_of_the_king",
    name: "Bastard Son of the King",
    sourceClanId: null,
    associatedSeatId: "warlock",
    sourceLocationLabel: "Halcyon Isles",
    passiveIdeologyId: null,
    baseSetupPlacement: "set_aside",
  },
];

export const WARLOCK_HEROIC_TITLE_GLYPHS = [
  "jupiter",
  "mars",
  "venus",
  "mercury",
  "moon",
  "saturn",
  "neptune",
] as const;

export type WarlockHeroicTitleGlyph = (typeof WARLOCK_HEROIC_TITLE_GLYPHS)[number];

export const WARLOCK_HERO_FAME_VALUES = ["local", "great", "mythic"] as const;

export type WarlockHeroFame = (typeof WARLOCK_HERO_FAME_VALUES)[number];

export const WARLOCK_ARMY_LIFECYCLE_VALUES = ["active", "dissolved", "destroyed"] as const;

export type WarlockArmyLifecycle = (typeof WARLOCK_ARMY_LIFECYCLE_VALUES)[number];

export const WARLOCK_COURT_CONDITIONS = ["ordinary", "civil_war"] as const;

export type WarlockCourtCondition = (typeof WARLOCK_COURT_CONDITIONS)[number];

export const WARLOCK_KING_HEALTH_CONDITIONS = ["healthy", "deathly_ill"] as const;

export type WarlockKingHealthCondition = (typeof WARLOCK_KING_HEALTH_CONDITIONS)[number];

const CLAN_ID_SET = new Set<string>(WARLOCK_CLAN_IDS);
const SOURCE_CLAN_ID_SET = new Set<string>(WARLOCK_SOURCE_CLAN_IDS);
const IDEOLOGY_ID_SET = new Set<string>(WARLOCK_IDEOLOGY_IDS);
const COURT_LAW_ID_SET = new Set<string>(WARLOCK_COURT_LAW_IDS);
const TITLE_ID_SET = new Set<string>(WARLOCK_LORD_TITLE_IDS);
const GLYPH_SET = new Set<string>(WARLOCK_HEROIC_TITLE_GLYPHS);
const FAME_SET = new Set<string>(WARLOCK_HERO_FAME_VALUES);
const LIFECYCLE_SET = new Set<string>(WARLOCK_ARMY_LIFECYCLE_VALUES);
const COURT_CONDITION_SET = new Set<string>(WARLOCK_COURT_CONDITIONS);
const HEALTH_SET = new Set<string>(WARLOCK_KING_HEALTH_CONDITIONS);

export function isValidWarlockClanId(value: string): value is WarlockClanId {
  return CLAN_ID_SET.has(value);
}

export function isValidWarlockSourceClanId(value: string): value is WarlockSourceClanId {
  return SOURCE_CLAN_ID_SET.has(value);
}

export function isValidWarlockIdeologyId(value: string): value is WarlockIdeologyId {
  return IDEOLOGY_ID_SET.has(value);
}

export function isValidWarlockCourtLawId(value: string): value is WarlockCourtLawId {
  return COURT_LAW_ID_SET.has(value);
}

export function isValidWarlockLordTitleId(value: string): value is WarlockLordTitleId {
  return TITLE_ID_SET.has(value);
}

export function isValidWarlockHeroicTitleGlyph(value: string): value is WarlockHeroicTitleGlyph {
  return GLYPH_SET.has(value);
}

export function isValidWarlockHeroFame(value: string): value is WarlockHeroFame {
  return FAME_SET.has(value);
}

export function isValidWarlockArmyLifecycle(value: string): value is WarlockArmyLifecycle {
  return LIFECYCLE_SET.has(value);
}

export function isValidWarlockCourtCondition(value: string): value is WarlockCourtCondition {
  return COURT_CONDITION_SET.has(value);
}

export function isValidWarlockKingHealthCondition(value: string): value is WarlockKingHealthCondition {
  return HEALTH_SET.has(value);
}

export function warlockLordTitleDefinition(titleId: WarlockLordTitleId): WarlockLordTitleDefinition {
  const definition = WARLOCK_LORD_TITLE_DEFINITIONS.find((entry) => entry.titleId === titleId);
  if (definition === undefined) {
    throw new Error(`Unknown Warlock Lord Title: ${titleId}`);
  }
  return definition;
}
