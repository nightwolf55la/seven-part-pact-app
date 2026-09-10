import type { PactSeatId } from "./pact-seats";

export const FAUSTIAN_SUITS = ["spades", "clubs", "diamonds", "hearts"] as const;

export type FaustianSuit = (typeof FAUSTIAN_SUITS)[number];

export const FAUSTIAN_RANKS = [
  "ace",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "jack",
  "queen",
  "king",
] as const;

export type FaustianRank = (typeof FAUSTIAN_RANKS)[number];

export type FaustianCardId = `${FaustianSuit}_${FaustianRank}`;

export interface FaustianCardDefinition {
  readonly cardId: FaustianCardId;
  readonly suit: FaustianSuit;
  readonly rank: FaustianRank;
}

export function faustianCardId(suit: FaustianSuit, rank: FaustianRank): FaustianCardId {
  return `${suit}_${rank}`;
}

export const FAUSTIAN_CARD_DEFINITIONS: readonly FaustianCardDefinition[] = FAUSTIAN_SUITS.flatMap((suit) =>
  FAUSTIAN_RANKS.map((rank) => ({
    cardId: faustianCardId(suit, rank),
    suit,
    rank,
  })),
);

export const FAUSTIAN_CARD_IDS: readonly FaustianCardId[] = FAUSTIAN_CARD_DEFINITIONS.map((card) => card.cardId);

const FAUSTIAN_CARD_ID_SET = new Set<string>(FAUSTIAN_CARD_IDS);

export function isValidFaustianCardId(value: string): value is FaustianCardId {
  return FAUSTIAN_CARD_ID_SET.has(value);
}

export function isValidFaustianSuit(value: string): value is FaustianSuit {
  return (FAUSTIAN_SUITS as readonly string[]).includes(value);
}

export function isValidFaustianRank(value: string): value is FaustianRank {
  return (FAUSTIAN_RANKS as readonly string[]).includes(value);
}

export const FAUSTIAN_CARD_FACINGS = ["face_down", "face_up"] as const;

export type FaustianCardFacing = (typeof FAUSTIAN_CARD_FACINGS)[number];

export function isValidFaustianCardFacing(value: string): value is FaustianCardFacing {
  return (FAUSTIAN_CARD_FACINGS as readonly string[]).includes(value);
}

/**
 * Approved operational Draft-4 Materials+Cards Community mapping.
 *
 * The Faustian Codex conflicts in its final Zodiac assignments.
 * The Materials board and Lord-card row effects agree with one another; this
 * application uses that Materials+Cards mapping as the fixed operational board.
 * The Codex final assignments are not the operational board, and the
 * board is not campaign-configurable to dodge the contradiction.
 *
 * Layout (row-major, 4x3):
 * Aries/Hierophant/monks-pilgrims | Leo/Warlock/lords-ladies | Sagittarius/Sorcerer/scholars-researchers
 * Taurus/Hierophant/merchants-bankers | Virgo/Warlock/soldiers-servants | Capricorn/Necromancer/dead-nearly-dead
 * Gemini/Hierophant/farmers-shepherds | Libra/Mariner/fishermen-divers | Aquarius/Sage/druids-hermits
 * Cancer/Hierophant/beggars-thieves | Scorpio/Mariner/sailors-travelers | Pisces/Sage/dreamers-wanderers
 */
export const FAUSTIAN_COMMUNITY_IDS = [
  "aries",
  "leo",
  "sagittarius",
  "taurus",
  "virgo",
  "capricorn",
  "gemini",
  "libra",
  "aquarius",
  "cancer",
  "scorpio",
  "pisces",
] as const;

export type FaustianCommunityId = (typeof FAUSTIAN_COMMUNITY_IDS)[number];

export interface FaustianCommunityDefinition {
  readonly communityId: FaustianCommunityId;
  readonly associatedSeatId: PactSeatId;
  readonly populace: string;
}

export const FAUSTIAN_COMMUNITY_DEFINITIONS: readonly FaustianCommunityDefinition[] = [
  { communityId: "aries", associatedSeatId: "hierophant", populace: "monks/pilgrims" },
  { communityId: "leo", associatedSeatId: "warlock", populace: "lords/ladies" },
  { communityId: "sagittarius", associatedSeatId: "sorcerer", populace: "scholars/researchers" },
  { communityId: "taurus", associatedSeatId: "hierophant", populace: "merchants/bankers" },
  { communityId: "virgo", associatedSeatId: "warlock", populace: "soldiers/servants" },
  { communityId: "capricorn", associatedSeatId: "necromancer", populace: "dead/nearly-dead" },
  { communityId: "gemini", associatedSeatId: "hierophant", populace: "farmers/shepherds" },
  { communityId: "libra", associatedSeatId: "mariner", populace: "fishermen/divers" },
  { communityId: "aquarius", associatedSeatId: "sage", populace: "druids/hermits" },
  { communityId: "cancer", associatedSeatId: "hierophant", populace: "beggars/thieves" },
  { communityId: "scorpio", associatedSeatId: "mariner", populace: "sailors/travelers" },
  { communityId: "pisces", associatedSeatId: "sage", populace: "dreamers/wanderers" },
];

export function isValidFaustianCommunityId(value: string): value is FaustianCommunityId {
  return (FAUSTIAN_COMMUNITY_IDS as readonly string[]).includes(value);
}

export const FAUSTIAN_DEVIL_LAW_IDS = [
  "laughter_of_children_and_music",
  "temple_door_or_immortal_flames",
  "crowing_rooster",
  "morning_light",
  "cannot_refuse_a_bet",
  "never_break_a_promise",
  "heart_won_by_gifts",
] as const;

export type FaustianDevilLawId = (typeof FAUSTIAN_DEVIL_LAW_IDS)[number];

export interface FaustianDevilLawDefinition {
  readonly id: FaustianDevilLawId;
  readonly text: string;
}

export const FAUSTIAN_DEVIL_LAW_DEFINITIONS: readonly FaustianDevilLawDefinition[] = [
  {
    id: "laughter_of_children_and_music",
    text: "The laughter of children and drumming of music drive the Devil to flee.",
  },
  {
    id: "temple_door_or_immortal_flames",
    text: "The Devil cannot step through a temple door or across the Immortal Flames.",
  },
  {
    id: "crowing_rooster",
    text: "A crowing rooster reveals the Devil's disguises and forces his true form.",
  },
  {
    id: "morning_light",
    text: "The first rays of morning light make the Devil disappear/flee.",
  },
  {
    id: "cannot_refuse_a_bet",
    text: "The Devil cannot refuse a bet or wager, though he twists the odds.",
  },
  {
    id: "never_break_a_promise",
    text: "The Devil can never break a promise unless doing so serves fulfillment of a bargain.",
  },
  {
    id: "heart_won_by_gifts",
    text: "The Devil's heart can be won through gifts of good food, fine wines, and raw human meat.",
  },
];

export function isValidFaustianDevilLawId(value: string): value is FaustianDevilLawId {
  return (FAUSTIAN_DEVIL_LAW_IDS as readonly string[]).includes(value);
}

export const FAUSTIAN_DEVIL_FORM_IDS = [
  "dashing_young_man",
  "old_schoolmaster",
  "ancient_miser",
  "beautiful_young_woman",
  "caring_mother",
  "old_hag",
  "little_kid",
  "wicked_criminal",
  "childhood_love",
  "black_dog",
  "black_goat",
  "black_cat",
  "seven_headed_dragon",
  "coiling_beast",
  "primordial_flame",
  "scared_child",
  "the_faustian",
] as const;

export type FaustianDevilFormId = (typeof FAUSTIAN_DEVIL_FORM_IDS)[number];

export const FAUSTIAN_DEVIL_FORM_OCCASIONS = ["casual", "special", "duress"] as const;

export type FaustianDevilFormOccasion = (typeof FAUSTIAN_DEVIL_FORM_OCCASIONS)[number];

export interface FaustianDevilFormDefinition {
  readonly id: FaustianDevilFormId;
  readonly description: string;
}

export const FAUSTIAN_DEVIL_FORM_DEFINITIONS: readonly FaustianDevilFormDefinition[] = [
  { id: "dashing_young_man", description: "a dashing young man with impeccable fashion and a black goatee" },
  { id: "old_schoolmaster", description: "an old schoolmaster with a stern glare and a contract to sign" },
  { id: "ancient_miser", description: "an ancient miser with rings of gold and a mouth full of smoke" },
  { id: "beautiful_young_woman", description: "a beautiful young woman with a white veil and blood-red lips" },
  { id: "caring_mother", description: "a caring mother surrounded by mewling/howling/writhing children" },
  { id: "old_hag", description: "an old hag with white hair and wrinkled skin who rides a mortar and pestle" },
  { id: "little_kid", description: "a little kid wearing bells/jangles and a grinning mask" },
  { id: "wicked_criminal", description: "a wicked criminal dangling from a noose with spinning eyes and blue skin" },
  { id: "childhood_love", description: "the Faustian's childhood love with sparkling eyes and a fistful of flowers" },
  { id: "black_dog", description: "a black dog with bloodshot eyes and a rasping bark" },
  { id: "black_goat", description: "a black goat with tangled horns and an extra eye" },
  { id: "black_cat", description: "a black cat with eyes like stars and feathered wings" },
  { id: "seven_headed_dragon", description: "a great and terrible dragon with seven heads and curling tails" },
  { id: "coiling_beast", description: "a coiling beast with dozens of eyes and packs of dogs for feet" },
  { id: "primordial_flame", description: "a column of primordial flame and darkness, howling in fury" },
  { id: "scared_child", description: "a scared and sobbing child" },
  { id: "the_faustian", description: "the Faustian himself (\"You\")" },
];

export function isValidFaustianDevilFormId(value: string): value is FaustianDevilFormId {
  return (FAUSTIAN_DEVIL_FORM_IDS as readonly string[]).includes(value);
}

export function isValidFaustianDevilFormOccasion(value: string): value is FaustianDevilFormOccasion {
  return (FAUSTIAN_DEVIL_FORM_OCCASIONS as readonly string[]).includes(value);
}

export const FAUSTIAN_ORIGIN_CLAIM_IDS = [
  "betrayed_innocent_wizard",
  "captured_star",
  "betrayed_fairy_princess",
  "the_god_ithax",
  "daughter_of_wizard_king",
  "ancient_wizard_of_ergoad",
  "creator_undone_by_creation",
  "author_of_the_pact",
  "nameless_king_beneath_dark",
  "sorcerers_scapegoat",
  "you_are_the_devil",
] as const;

export type FaustianOriginClaimId = (typeof FAUSTIAN_ORIGIN_CLAIM_IDS)[number];

export const FAUSTIAN_ORIGIN_CLAIM_STATUSES = ["open", "disproven"] as const;

export type FaustianOriginClaimStatus = (typeof FAUSTIAN_ORIGIN_CLAIM_STATUSES)[number];

export interface FaustianOriginClaimDefinition {
  readonly claimId: FaustianOriginClaimId;
  readonly claim: string;
  readonly secretName: string;
}

export const FAUSTIAN_ORIGIN_CLAIM_DEFINITIONS: readonly FaustianOriginClaimDefinition[] = [
  { claimId: "betrayed_innocent_wizard", claim: "betrayed innocent wizard", secretName: "Marcus" },
  { claimId: "captured_star", claim: "captured star", secretName: "Calliope" },
  { claimId: "betrayed_fairy_princess", claim: "betrayed fairy princess", secretName: "Robin" },
  { claimId: "the_god_ithax", claim: "the god Ithax", secretName: "Nathix" },
  { claimId: "daughter_of_wizard_king", claim: "daughter of the great Wizard-King", secretName: "Nemora" },
  { claimId: "ancient_wizard_of_ergoad", claim: "ancient powerful wizard who ruled Ergoad", secretName: "Madris" },
  { claimId: "creator_undone_by_creation", claim: "creator of the world undone by his own creation", secretName: "Ephrain" },
  { claimId: "author_of_the_pact", claim: "author of the Pact", secretName: "Elzammarat" },
  { claimId: "nameless_king_beneath_dark", claim: "nameless King beneath the roiling dark", secretName: "Azmodai" },
  { claimId: "sorcerers_scapegoat", claim: "Sorcerer's scapegoat / collective fever dream", secretName: "The Tower" },
  { claimId: "you_are_the_devil", claim: "You are the Devil and the Devil is you", secretName: "the Faustian's own name" },
];

export function isValidFaustianOriginClaimId(value: string): value is FaustianOriginClaimId {
  return (FAUSTIAN_ORIGIN_CLAIM_IDS as readonly string[]).includes(value);
}

export function isValidFaustianOriginClaimStatus(value: string): value is FaustianOriginClaimStatus {
  return (FAUSTIAN_ORIGIN_CLAIM_STATUSES as readonly string[]).includes(value);
}

export const FAUSTIAN_ANTAGONIST_GOALS = [
  "Subjugation",
  "Calamity",
  "Extinction",
  "Treachery",
] as const;

export type FaustianAntagonistGoal = (typeof FAUSTIAN_ANTAGONIST_GOALS)[number];

export interface FaustianAntagonistGoalDefinition {
  readonly goal: FaustianAntagonistGoal;
  readonly suit: FaustianSuit;
  readonly applicationLabel: string;
}

export const FAUSTIAN_ANTAGONIST_GOAL_DEFINITIONS: readonly FaustianAntagonistGoalDefinition[] = [
  { goal: "Subjugation", suit: "spades", applicationLabel: "Subjugation / Spades" },
  { goal: "Calamity", suit: "clubs", applicationLabel: "Calamity / Clubs" },
  { goal: "Extinction", suit: "diamonds", applicationLabel: "Extinction / Diamonds" },
  { goal: "Treachery", suit: "hearts", applicationLabel: "Treachery / Hearts" },
];

export function isValidFaustianAntagonistGoal(value: string): value is FaustianAntagonistGoal {
  return (FAUSTIAN_ANTAGONIST_GOALS as readonly string[]).includes(value);
}

export function faustianAntagonistGoalSuit(goal: string): FaustianSuit | null {
  const definition = FAUSTIAN_ANTAGONIST_GOAL_DEFINITIONS.find((entry) => entry.goal === goal);
  return definition?.suit ?? null;
}

export const FAUSTIAN_ANTAGONIST_METHOD_NAMES = [
  "Amass Power",
  "Offer Aid",
  "Spread Dissent",
  "Bargain with the Devil",
] as const;

export type FaustianAntagonistMethodName = (typeof FAUSTIAN_ANTAGONIST_METHOD_NAMES)[number];

export function isValidFaustianAntagonistMethodName(value: string): value is FaustianAntagonistMethodName {
  return (FAUSTIAN_ANTAGONIST_METHOD_NAMES as readonly string[]).includes(value);
}

export const FAUSTIAN_MALIGNANCES = ["violent", "controlling"] as const;

export type FaustianMalignance = (typeof FAUSTIAN_MALIGNANCES)[number];

export function isValidFaustianMalignance(value: string): value is FaustianMalignance {
  return (FAUSTIAN_MALIGNANCES as readonly string[]).includes(value);
}

export const FAUSTIAN_ANTAGONIST_CHIP_COUNTS = [1, 2, 3] as const;

export type FaustianAntagonistChipCount = (typeof FAUSTIAN_ANTAGONIST_CHIP_COUNTS)[number];

export function isValidFaustianAntagonistChipCount(value: number): value is FaustianAntagonistChipCount {
  return FAUSTIAN_ANTAGONIST_CHIP_COUNTS.includes(value as FaustianAntagonistChipCount);
}
