import type { Brand } from "./brand";
import type { MonthId } from "./calendar";

export const HIEROPHANT_FLAME_LAW_IDS = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
] as const;

export type HierophantFlameLawId = (typeof HIEROPHANT_FLAME_LAW_IDS)[number];

/** Application ordinal labels; not source titles. Source Laws are the texts below. */
const FLAME_LAW_APPLICATION_LABELS: Record<HierophantFlameLawId, string> = {
  first: "First Law of the Flame",
  second: "Second Law of the Flame",
  third: "Third Law of the Flame",
  fourth: "Fourth Law of the Flame",
  fifth: "Fifth Law of the Flame",
  sixth: "Sixth Law of the Flame",
  seventh: "Seventh Law of the Flame",
};

const FLAME_LAW_SOURCE_TEXT: Record<HierophantFlameLawId, string> = {
  first: "Thou shalt not spill blood here, or allow even a single drop to touch the ground.",
  second: "Thou shalt not speak with a voice above a whisper here, or yell within the temple.",
  third: "Thou shalt not depict others as images here, or represent the divine as human.",
  fourth: "Thou shalt not enter the temples without ritually bathing and breathing incense.",
  fifth: "Thou shalt not perform magic here, or allow magic to occur near the flame.",
  sixth: "Thou shalt not judge another here, no matter their crimes.",
  seventh: "Thou shalt not bring coins here, or allow any wealth to enter.",
};

export interface HierophantFlameLawDefinition {
  readonly id: HierophantFlameLawId;
  /** Application ordinal label; not a source title. */
  readonly applicationLabel: string;
  /** Draft-4 source Law text. */
  readonly text: string;
}

export const HIEROPHANT_FLAME_LAW_DEFINITIONS: readonly HierophantFlameLawDefinition[] =
  HIEROPHANT_FLAME_LAW_IDS.map((id) => ({
    id,
    applicationLabel: FLAME_LAW_APPLICATION_LABELS[id],
    text: FLAME_LAW_SOURCE_TEXT[id],
  }));

export function hierophantFlameLawApplicationLabel(id: HierophantFlameLawId): string {
  return FLAME_LAW_APPLICATION_LABELS[id];
}

export function hierophantFlameLawDisplayName(id: HierophantFlameLawId): string {
  return hierophantFlameLawApplicationLabel(id);
}

export function hierophantFlameLawText(id: HierophantFlameLawId): string {
  return FLAME_LAW_SOURCE_TEXT[id];
}

export function isValidHierophantFlameLawId(value: string): value is HierophantFlameLawId {
  return (HIEROPHANT_FLAME_LAW_IDS as readonly string[]).includes(value);
}

export const HIEROPHANT_BUILTIN_CLASS_IDS = [
  "pariah",
  "peasant",
  "artisan",
  "merchant",
  "gentry",
] as const;

export type HierophantBuiltinClassId = (typeof HIEROPHANT_BUILTIN_CLASS_IDS)[number];

export interface HierophantBuiltinClassDefinition {
  readonly id: HierophantBuiltinClassId;
  readonly name: string;
}

export const HIEROPHANT_BUILTIN_CLASS_DEFINITIONS: readonly HierophantBuiltinClassDefinition[] = [
  { id: "pariah", name: "Pariah" },
  { id: "peasant", name: "Peasant" },
  { id: "artisan", name: "Artisan" },
  { id: "merchant", name: "Merchant" },
  { id: "gentry", name: "Gentry" },
];

export function isValidHierophantBuiltinClassId(value: string): value is HierophantBuiltinClassId {
  return (HIEROPHANT_BUILTIN_CLASS_IDS as readonly string[]).includes(value);
}

export const HIEROPHANT_BUILTIN_DOCTRINE_IDS = [
  "nobility_born_to_shepherd",
  "good_life_sign_of_pious",
  "dedication_proven_through_craft",
  "subservient_to_will_of_gods",
  "born_equal_in_light",
  "wealthy_deserve_pleasures",
  "flame_shines_on_dreamers",
  "family_most_important",
  "charity_measure_of_moral_worth",
  "church_no_authority_over_king",
  "compassion_sign_of_nobility",
  "worth_proved_through_labor",
  "people_used_to_be_kinder",
  "born_into_proper_role",
  "masters_of_own_destiny",
  "wealth_corrupts_hearts",
] as const;

export type HierophantBuiltinDoctrineId = (typeof HIEROPHANT_BUILTIN_DOCTRINE_IDS)[number];

export const HIEROPHANT_BUILTIN_BLASPHEMY_IDS = [
  "nobility_right_to_do_as_they_please",
  "take_everything_plunder",
  "society_continuously_destroyed",
  "kill_everyone_who_thinks_better",
  "past_as_kindling",
  "indulge_every_desire",
  "enlightenment_through_opiates",
  "destroy_false_arrogant_tools",
  "law_of_the_wolf",
  "accumulation_of_wealth_matters",
  "to_take_a_life_is_to_take_own",
  "old_land_demands_blood",
  "destroy_trappings_of_modernity",
  "burn_criminal_witch_exile",
  "enemies_on_all_sides",
  "abandon_earthly_desires",
] as const;

export type HierophantBuiltinBlasphemyId = (typeof HIEROPHANT_BUILTIN_BLASPHEMY_IDS)[number];

export interface HierophantBuiltinDoctrineDefinition {
  readonly id: HierophantBuiltinDoctrineId;
  readonly text: string;
  readonly supportedClassIds: readonly HierophantBuiltinClassId[];
  readonly pairedBlasphemy: {
    readonly id: HierophantBuiltinBlasphemyId;
    readonly text: string;
  };
}

export const HIEROPHANT_BUILTIN_DOCTRINE_DEFINITIONS: readonly HierophantBuiltinDoctrineDefinition[] = [
  {
    id: "nobility_born_to_shepherd",
    text: "The nobility are born to shepherd the world.",
    supportedClassIds: ["gentry"],
    pairedBlasphemy: {
      id: "nobility_right_to_do_as_they_please",
      text: "The nobility have the right to do as they please.",
    },
  },
  {
    id: "good_life_sign_of_pious",
    text: "A good life is the sign of a pious believer.",
    supportedClassIds: ["merchant"],
    pairedBlasphemy: {
      id: "take_everything_plunder",
      text: "Take everything from everyone, plunder the world.",
    },
  },
  {
    id: "dedication_proven_through_craft",
    text: "One's dedication is proven through one's skill at their craft.",
    supportedClassIds: ["artisan"],
    pairedBlasphemy: {
      id: "society_continuously_destroyed",
      text: "Society must be continuously destroyed and remade.",
    },
  },
  {
    id: "subservient_to_will_of_gods",
    text: "Everyone is subservient to the will of the gods.",
    supportedClassIds: ["peasant"],
    pairedBlasphemy: {
      id: "kill_everyone_who_thinks_better",
      text: "Kill everyone who thinks they're better than you.",
    },
  },
  {
    id: "born_equal_in_light",
    text: "All are born equal in the light of the flame.",
    supportedClassIds: ["pariah"],
    pairedBlasphemy: {
      id: "past_as_kindling",
      text: "The past will serve as kindling for the fire of our new world.",
    },
  },
  {
    id: "wealthy_deserve_pleasures",
    text: "The wealthy deserve the pleasures of their station.",
    supportedClassIds: ["gentry", "merchant"],
    pairedBlasphemy: {
      id: "indulge_every_desire",
      text: "Indulge your every sumptuous, exotic, and twisted desire.",
    },
  },
  {
    id: "flame_shines_on_dreamers",
    text: "The flame shines warmly on dreamers and artists.",
    supportedClassIds: ["gentry", "artisan"],
    pairedBlasphemy: {
      id: "enlightenment_through_opiates",
      text: "Enlightenment can be found through opiates and toxins.",
    },
  },
  {
    id: "family_most_important",
    text: "Family is most important above all.",
    supportedClassIds: ["gentry", "peasant"],
    pairedBlasphemy: {
      id: "destroy_false_arrogant_tools",
      text: "Destroy the false and arrogant tools of man.",
    },
  },
  {
    id: "charity_measure_of_moral_worth",
    text: "Charity is the measure of moral worth.",
    supportedClassIds: ["gentry", "pariah"],
    pairedBlasphemy: {
      id: "law_of_the_wolf",
      text: "There is no law but the law of the wolf.",
    },
  },
  {
    id: "church_no_authority_over_king",
    text: "The church has no authority over the will of the King.",
    supportedClassIds: ["merchant", "artisan"],
    pairedBlasphemy: {
      id: "accumulation_of_wealth_matters",
      text: "The accumulation of individual wealth is all that matters.",
    },
  },
  {
    id: "compassion_sign_of_nobility",
    text: "Compassion is a sign of nobility and respect.",
    supportedClassIds: ["merchant", "pariah"],
    pairedBlasphemy: {
      id: "to_take_a_life_is_to_take_own",
      text: "To take a life is to take your own.",
    },
  },
  {
    id: "worth_proved_through_labor",
    text: "One's worth is proved through one's labor.",
    supportedClassIds: ["artisan", "peasant"],
    pairedBlasphemy: {
      id: "old_land_demands_blood",
      text: "The old land demands the blood of the idle.",
    },
  },
  {
    id: "people_used_to_be_kinder",
    text: "People used to be kinder to each other.",
    supportedClassIds: ["peasant", "pariah"],
    pairedBlasphemy: {
      id: "destroy_trappings_of_modernity",
      text: "We must destroy all trappings of modernity.",
    },
  },
  {
    id: "born_into_proper_role",
    text: "Everyone is born into their proper role.",
    supportedClassIds: ["gentry", "merchant", "artisan"],
    pairedBlasphemy: {
      id: "burn_criminal_witch_exile",
      text: "Burn the criminal, the witch, and the exile.",
    },
  },
  {
    id: "masters_of_own_destiny",
    text: "We are masters of our own destiny.",
    supportedClassIds: ["merchant", "artisan", "peasant"],
    pairedBlasphemy: {
      id: "enemies_on_all_sides",
      text: "Enemies on all sides seek to take what's rightfully yours.",
    },
  },
  {
    id: "wealth_corrupts_hearts",
    text: "Wealth corrupts the hearts of men.",
    supportedClassIds: ["artisan", "peasant", "pariah"],
    pairedBlasphemy: {
      id: "abandon_earthly_desires",
      text: "One must abandon all earthly desires in pursuit of wisdom.",
    },
  },
];

export function isValidHierophantBuiltinDoctrineId(value: string): value is HierophantBuiltinDoctrineId {
  return (HIEROPHANT_BUILTIN_DOCTRINE_IDS as readonly string[]).includes(value);
}

export function isValidHierophantBuiltinBlasphemyId(value: string): value is HierophantBuiltinBlasphemyId {
  return (HIEROPHANT_BUILTIN_BLASPHEMY_IDS as readonly string[]).includes(value);
}

export function hierophantBuiltinDoctrineDefinition(
  id: HierophantBuiltinDoctrineId,
): HierophantBuiltinDoctrineDefinition {
  const found = HIEROPHANT_BUILTIN_DOCTRINE_DEFINITIONS.find((d) => d.id === id);
  if (found === undefined) {
    throw new Error(`Unknown built-in Doctrine id: ${id}`);
  }
  return found;
}

export const HIEROPHANT_STARTING_TEMPLE_IDS = [
  "krolis",
  "notor",
  "hestar",
  "ushin",
  "zephon",
] as const;

export type HierophantStartingTempleId = (typeof HIEROPHANT_STARTING_TEMPLE_IDS)[number];
export type HierophantCampaignTempleId = Brand<string, "HierophantCampaignTempleId">;
export type HierophantTempleId = HierophantStartingTempleId | HierophantCampaignTempleId;

export type HierophantTempleKind = "ordinary" | "hestar";

interface HierophantStartingTempleBase {
  readonly templeId: HierophantStartingTempleId;
  readonly displayName: string;
  readonly hostSeatId: "hierophant";
  readonly abundance: number;
  readonly conviction: number;
  readonly status: "active";
}

export interface OrdinaryHierophantStartingTempleDefinition extends HierophantStartingTempleBase {
  readonly templeId: Exclude<HierophantStartingTempleId, "hestar">;
  readonly kind: "ordinary";
  readonly doctrineId: HierophantBuiltinDoctrineId;
}

export interface HestarHierophantStartingTempleDefinition extends HierophantStartingTempleBase {
  readonly templeId: "hestar";
  readonly kind: "hestar";
}

export type HierophantStartingTempleDefinition =
  | OrdinaryHierophantStartingTempleDefinition
  | HestarHierophantStartingTempleDefinition;

const STARTING_TEMPLE_DISPLAY_NAMES: Record<HierophantStartingTempleId, string> = {
  krolis: "Temple Krolis",
  notor: "Temple Notor",
  hestar: "Temple Hestar",
  ushin: "Temple Ushin",
  zephon: "Temple Zephon",
};

export const HIEROPHANT_STARTING_TEMPLE_DEFINITIONS: readonly HierophantStartingTempleDefinition[] = [
  {
    templeId: "krolis",
    displayName: STARTING_TEMPLE_DISPLAY_NAMES.krolis,
    kind: "ordinary",
    hostSeatId: "hierophant",
    abundance: 5,
    conviction: 4,
    status: "active",
    doctrineId: "worth_proved_through_labor",
  },
  {
    templeId: "notor",
    displayName: STARTING_TEMPLE_DISPLAY_NAMES.notor,
    kind: "ordinary",
    hostSeatId: "hierophant",
    abundance: 3,
    conviction: 6,
    status: "active",
    doctrineId: "charity_measure_of_moral_worth",
  },
  {
    templeId: "hestar",
    displayName: STARTING_TEMPLE_DISPLAY_NAMES.hestar,
    kind: "hestar",
    hostSeatId: "hierophant",
    abundance: 4,
    conviction: 5,
    status: "active",
  },
  {
    templeId: "ushin",
    displayName: STARTING_TEMPLE_DISPLAY_NAMES.ushin,
    kind: "ordinary",
    hostSeatId: "hierophant",
    abundance: 5,
    conviction: 4,
    status: "active",
    doctrineId: "wealthy_deserve_pleasures",
  },
  {
    templeId: "zephon",
    displayName: STARTING_TEMPLE_DISPLAY_NAMES.zephon,
    kind: "ordinary",
    hostSeatId: "hierophant",
    abundance: 4,
    conviction: 5,
    status: "active",
    doctrineId: "people_used_to_be_kinder",
  },
];

export function hierophantStartingTempleDisplayName(id: HierophantStartingTempleId): string {
  return STARTING_TEMPLE_DISPLAY_NAMES[id];
}

export function isValidHierophantStartingTempleId(value: string): value is HierophantStartingTempleId {
  return (HIEROPHANT_STARTING_TEMPLE_IDS as readonly string[]).includes(value);
}

const BRANDED_UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const CAMPAIGN_TEMPLE_ID_REGEX = new RegExp(`^htm_${BRANDED_UUID}$`);
const CAMPAIGN_CLASS_ID_REGEX = new RegExp(`^hcl_${BRANDED_UUID}$`);
const CAMPAIGN_DOCTRINE_ID_REGEX = new RegExp(`^hdc_${BRANDED_UUID}$`);
const CAMPAIGN_BLASPHEMY_ID_REGEX = new RegExp(`^hbl_${BRANDED_UUID}$`);
const DOGMA_ENTRY_ID_REGEX = new RegExp(`^hdg_${BRANDED_UUID}$`);

export function isValidHierophantCampaignTempleId(value: string): value is HierophantCampaignTempleId {
  return CAMPAIGN_TEMPLE_ID_REGEX.test(value);
}

export function isValidHierophantTempleId(value: string): value is HierophantTempleId {
  return isValidHierophantStartingTempleId(value) || isValidHierophantCampaignTempleId(value);
}

export function isValidHierophantCampaignClassId(value: string): boolean {
  return CAMPAIGN_CLASS_ID_REGEX.test(value);
}

export function isValidHierophantCampaignDoctrineId(value: string): boolean {
  return CAMPAIGN_DOCTRINE_ID_REGEX.test(value);
}

export function isValidHierophantCampaignBlasphemyId(value: string): boolean {
  return CAMPAIGN_BLASPHEMY_ID_REGEX.test(value);
}

export function isValidHierophantDogmaEntryId(value: string): boolean {
  return DOGMA_ENTRY_ID_REGEX.test(value);
}

export function hierophantStartingTempleDefinition(
  id: HierophantStartingTempleId,
): HierophantStartingTempleDefinition {
  const found = HIEROPHANT_STARTING_TEMPLE_DEFINITIONS.find((d) => d.templeId === id);
  if (found === undefined) {
    throw new Error(`Unknown starting Temple id: ${id}`);
  }
  return found;
}

export const HIEROPHANT_DOGMA_CATEGORIES = [
  "apocalyptic",
  "ascetic",
  "delirious",
  "perverse",
  "vain",
  "custom",
] as const;

export type HierophantDogmaCategory = (typeof HIEROPHANT_DOGMA_CATEGORIES)[number];
export type HierophantBuiltinDogmaCategory = Exclude<HierophantDogmaCategory, "custom">;

export function isValidHierophantDogmaCategory(value: string): value is HierophantDogmaCategory {
  return (HIEROPHANT_DOGMA_CATEGORIES as readonly string[]).includes(value);
}

export const HIEROPHANT_BUILTIN_DOGMA_IDS = [
  "apocalyptic_1", "apocalyptic_2", "apocalyptic_3", "apocalyptic_4",
  "apocalyptic_5", "apocalyptic_6", "apocalyptic_7", "apocalyptic_8",
  "ascetic_1", "ascetic_2", "ascetic_3", "ascetic_4",
  "ascetic_5", "ascetic_6", "ascetic_7", "ascetic_8",
  "delirious_1", "delirious_2", "delirious_3", "delirious_4",
  "delirious_5", "delirious_6", "delirious_7", "delirious_8",
  "perverse_1", "perverse_2", "perverse_3", "perverse_4",
  "perverse_5", "perverse_6", "perverse_7", "perverse_8",
  "vain_1", "vain_2", "vain_3", "vain_4",
  "vain_5", "vain_6", "vain_7", "vain_8",
] as const;

export type HierophantBuiltinDogmaId = (typeof HIEROPHANT_BUILTIN_DOGMA_IDS)[number];

export interface HierophantBuiltinDogmaDefinition {
  readonly id: HierophantBuiltinDogmaId;
  readonly category: HierophantBuiltinDogmaCategory;
  readonly text: string;
}

function dogma(
  id: HierophantBuiltinDogmaId,
  category: HierophantBuiltinDogmaCategory,
  text: string,
): HierophantBuiltinDogmaDefinition {
  return { id, category, text };
}

export const HIEROPHANT_BUILTIN_DOGMA_DEFINITIONS: readonly HierophantBuiltinDogmaDefinition[] = [
  dogma("apocalyptic_1", "apocalyptic", "Ithax will someday return and bring the worthy to a paradise at the edge of the world."),
  dogma("apocalyptic_2", "apocalyptic", "Wizards are conspiring to bring about the end of days and destroy the world once more."),
  dogma("apocalyptic_3", "apocalyptic", "Soon kings will be forced to till fields and farmers will drink wine atop golden thrones, and the natural order will be upended."),
  dogma("apocalyptic_4", "apocalyptic", "A star is hurtling towards the archipelago and will annihilate Isha soon."),
  dogma("apocalyptic_5", "apocalyptic", "We have angered the Leviathan in our hubris and he will destroy the islands in retribution if we do not appease him."),
  dogma("apocalyptic_6", "apocalyptic", "The gates of death will soon open and the dead will walk amongst the living."),
  dogma("apocalyptic_7", "apocalyptic", "The true prophet will soon emerge, if they have not yet already, and will destroy the Orthodoxy that falsely rules Isha."),
  dogma("apocalyptic_8", "apocalyptic", "We must sacrifice the lives of others in order to prevent the oncoming apocalypse."),
  dogma("ascetic_1", "ascetic", "The public flaunting of wealth and fashion is an affront to the Immortal Flame; those with wealth must give it away."),
  dogma("ascetic_2", "ascetic", "Adherents should wear itchy and uncomfortable clothing to demonstrate their humility."),
  dogma("ascetic_3", "ascetic", "The Temples themselves are an affront to the prophets and deny true presence with the Flame."),
  dogma("ascetic_4", "ascetic", "The natural world contains all the answers needed; civilization is a farce."),
  dogma("ascetic_5", "ascetic", "Vows of silence and chastity demonstrate prudence and respect."),
  dogma("ascetic_6", "ascetic", "The teachings of the Prophets are a complete fabrication invented to keep you in line."),
  dogma("ascetic_7", "ascetic", "Those who violate social norms must be humiliated and tortured."),
  dogma("ascetic_8", "ascetic", "We must return to a time when men were strong and laws were just."),
  dogma("delirious_1", "delirious", "Ithax has reincarnated himself in the form of a young rabbit who we must protect at all costs."),
  dogma("delirious_2", "delirious", "It is a sign of devotion to publicly self-flagellate oneself."),
  dogma("delirious_3", "delirious", "The Immortal Flames must be extinguished in order to return Ithax to life."),
  dogma("delirious_4", "delirious", "The true god of this world is not Ithax but instead Ymos the world-serpent."),
  dogma("delirious_5", "delirious", "The universe is a dream and someday its dreamers will awaken."),
  dogma("delirious_6", "delirious", "Death is good, and to die is to be blessed with a kiss from the gods, and the dead will guide us to wisdom."),
  dogma("delirious_7", "delirious", "The human soul contains a dragon's egg, and if one could cut open the body they could free the egg trapped within."),
  dogma("delirious_8", "delirious", "Starvation and sleep deprivation bring you closer to understanding spiritual truth."),
  dogma("perverse_1", "perverse", "Ithax and Ephris were lovers, and homosexual love is a sign of shared devotion."),
  dogma("perverse_2", "perverse", "One can experience the Immortal Flame through large quantities of drugs and alcohol."),
  dogma("perverse_3", "perverse", "Sex and procreation is a public demonstration of one's devotion to the gods."),
  dogma("perverse_4", "perverse", "Adherents prove their loyalty through ritual dismemberment."),
  dogma("perverse_5", "perverse", "Massive drunken revelries and bacchenalias are spiritually necessary."),
  dogma("perverse_6", "perverse", "The creation of massive elegant works of art provide windows into the true soul of the gods."),
  dogma("perverse_7", "perverse", "Physical pleasure and stimulation matter more than morality."),
  dogma("perverse_8", "perverse", "Ithax is secretly a woman who gave birth to the universe."),
  dogma("vain_1", "vain", "You don't need to be a prophet to interpret the Immortal Flames, anyone can do it."),
  dogma("vain_2", "vain", "Ithax is a metaphor for self-actualization and spiritual wholeness."),
  dogma("vain_3", "vain", "Selfishness is a virtue: you are the only person who is real."),
  dogma("vain_4", "vain", "Ithax chose your soul to be more important than other people's lives."),
  dogma("vain_5", "vain", "It is ethically good to accumulate as much financial wealth as possible."),
  dogma("vain_6", "vain", "Men should marry multiple times, and their wives should act like property."),
  dogma("vain_7", "vain", "Flaunt your faith through expensive clothing and decadent jewelry."),
  dogma("vain_8", "vain", "There is no difference between truth and lies."),
];

export function isValidHierophantBuiltinDogmaId(value: string): value is HierophantBuiltinDogmaId {
  return (HIEROPHANT_BUILTIN_DOGMA_IDS as readonly string[]).includes(value);
}

/** Reference data only. Do not use to auto-select or validate Cult Dogmas. */
export const HIEROPHANT_CLASS_ENJOYED_DOGMA_CATEGORIES: Record<
  HierophantBuiltinClassId,
  readonly HierophantBuiltinDogmaCategory[]
> = {
  gentry: ["vain", "perverse"],
  merchant: ["vain", "delirious"],
  artisan: ["delirious", "apocalyptic"],
  peasant: ["apocalyptic", "ascetic"],
  pariah: ["ascetic", "perverse"],
};

export type HierophantOrdinaryStartingTempleId = Exclude<HierophantStartingTempleId, "hestar">;

export type HierophantLiturgicalObservance =
  | { readonly kind: "temple"; readonly templeId: HierophantOrdinaryStartingTempleId }
  | { readonly kind: "feast_day" };

/** Application identifiers for Draft-4 Liturgical Calendar Holidays; not source terminology. */
export const HIEROPHANT_LITURGICAL_HOLIDAY_IDS = [
  "week_of_lights",
  "the_serpents_parade",
  "endnight",
  "saint_innocents_day",
  "galetide",
  "hangmans_day",
  "triumpart",
  "old_apis_fair",
  "ambolas",
  "goblin_night",
  "mournival",
  "debutante",
  "brothers_day",
  "midsummer_festival",
  "harvest_end",
  "midwinter_banquet",
] as const;

export type HierophantLiturgicalHolidayId = (typeof HIEROPHANT_LITURGICAL_HOLIDAY_IDS)[number];

export interface HierophantLiturgicalHolidayDefinition {
  /** Application identifier; not source terminology. */
  readonly id: HierophantLiturgicalHolidayId;
  readonly monthId: MonthId;
  /** Draft-4 source Holiday name. */
  readonly name: string;
  /** Draft-4 source description text. */
  readonly description: string;
  readonly observance: HierophantLiturgicalObservance;
}

export const HIEROPHANT_LITURGICAL_HOLIDAY_DEFINITIONS: readonly HierophantLiturgicalHolidayDefinition[] = [
  {
    id: "week_of_lights",
    monthId: "january",
    name: "Week of Lights",
    description:
      "Week of ten thousand candles, parties in the street across Ishana. Considered the start of the new year by the common folk of Isha.",
    observance: { kind: "temple", templeId: "krolis" },
  },
  {
    id: "the_serpents_parade",
    monthId: "february",
    name: "The Serpent's Parade",
    description:
      "Celebrate the gods' slaying of Ymos, with giant snake floats paraded through the slums.",
    observance: { kind: "temple", templeId: "notor" },
  },
  {
    id: "endnight",
    monthId: "february",
    name: "Endnight",
    description:
      "The coldest night of the year, stories of the end of the world, many climb up to the Chalk Cliffs to watch the night sky.",
    observance: { kind: "temple", templeId: "zephon" },
  },
  {
    id: "saint_innocents_day",
    monthId: "april",
    name: "Saint Innocent's Day",
    description:
      "The first prophet's death-day, honored with bouquets of flowers, lapel pins, and extravagant ceremonies reaffirming the King's divine mandate.",
    observance: { kind: "temple", templeId: "ushin" },
  },
  {
    id: "galetide",
    monthId: "may",
    name: "Galetide",
    description:
      "Honoring the four winds, giant woodwind instruments built to play music through nature.",
    observance: { kind: "temple", templeId: "zephon" },
  },
  {
    id: "hangmans_day",
    monthId: "may",
    name: "Hangman's Day",
    description:
      "Venerating the patron prophet of thieves and gamblers with fake gold coins, miscreancy, and carousing.",
    observance: { kind: "temple", templeId: "notor" },
  },
  {
    id: "triumpart",
    monthId: "july",
    name: "Triumpart",
    description:
      'The clans each race their finest ship through the bay, the winner ceremonially "marries" the prophet Cassine.',
    observance: { kind: "temple", templeId: "ushin" },
  },
  {
    id: "old_apis_fair",
    monthId: "august",
    name: "Old Api's Fair",
    description:
      "Sheep-worshiping festival, mutton, wool, and fine wine across Ishana.",
    observance: { kind: "temple", templeId: "krolis" },
  },
  {
    id: "ambolas",
    monthId: "august",
    name: "Ambolas",
    description:
      "Pilgrims traverse the Chalk Cliffs to honor the path walked by the Teacher Edon in his quest to keep the Orthodoxy safe from the violence of the Tragedies.",
    observance: { kind: "temple", templeId: "zephon" },
  },
  {
    id: "goblin_night",
    monthId: "october",
    name: "Goblin Night",
    description:
      "Scarecrows are dressed up as goblins and demons to scare off the unwelcome dead.",
    observance: { kind: "temple", templeId: "krolis" },
  },
  {
    id: "mournival",
    monthId: "november",
    name: "Mournival",
    description:
      "Grieving for the Tragedies and those who have died, families going on pilgrimages to the Graven Isle to leave offerings there.",
    observance: { kind: "temple", templeId: "notor" },
  },
  {
    id: "debutante",
    monthId: "november",
    name: "Debutante",
    description:
      "Fancy masquerades, bonfires, and elaborate balls held amongst the noble Clans.",
    observance: { kind: "temple", templeId: "ushin" },
  },
  {
    id: "brothers_day",
    monthId: "march",
    name: "Brother's Day",
    description:
      "Commemorates the discovery of Ithax upon the iceberg by his brother Ephris. Celebrated with lots of alcohol, elaborate costumes, and wrestling and duels amongst men.",
    observance: { kind: "feast_day" },
  },
  {
    id: "midsummer_festival",
    monthId: "june",
    name: "Midsummer Festival",
    description:
      "Commemorates the creation of life by the two brother-gods. Celebrated with various animal costumes, pageantry, and parades through the streets.",
    observance: { kind: "feast_day" },
  },
  {
    id: "harvest_end",
    monthId: "september",
    name: "Harvest-End",
    description:
      "Commemorates Ithax's ascent to the heavens to steal fire for mankind, and the shooting star he rode back down to earth. Celebrated with bonfires, picnics, and fire-tossing.",
    observance: { kind: "feast_day" },
  },
  {
    id: "midwinter_banquet",
    monthId: "december",
    name: "Midwinter Banquet",
    description:
      "Commemorates the gifts of fire, magic, and invention brought to mankind by Ithax. Celebrated with candles, lots of feasting, and ice-skating across the Bay of Ishana.",
    observance: { kind: "feast_day" },
  },
];

export function isValidHierophantLiturgicalHolidayId(
  value: string,
): value is HierophantLiturgicalHolidayId {
  return (HIEROPHANT_LITURGICAL_HOLIDAY_IDS as readonly string[]).includes(value);
}

export function hierophantLiturgicalHolidayDefinition(
  id: HierophantLiturgicalHolidayId,
): HierophantLiturgicalHolidayDefinition {
  const found = HIEROPHANT_LITURGICAL_HOLIDAY_DEFINITIONS.find((d) => d.id === id);
  if (found === undefined) {
    throw new Error(`Unknown Liturgical Calendar Holiday id: ${id}`);
  }
  return found;
}
