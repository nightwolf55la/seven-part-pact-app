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
  "worth_proved_through_labor",
  "charity_measure_of_moral_worth",
  "people_used_to_be_kinder",
  "wealthy_deserve_pleasures",
] as const;

export type HierophantBuiltinDoctrineId = (typeof HIEROPHANT_BUILTIN_DOCTRINE_IDS)[number];

export const HIEROPHANT_BUILTIN_BLASPHEMY_IDS = [
  "old_land_demands_blood",
  "law_of_the_wolf",
  "destroy_trappings_of_modernity",
  "indulge_every_desire",
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
    id: "worth_proved_through_labor",
    text: "One's worth is proved through one's labor.",
    supportedClassIds: ["artisan", "peasant"],
    pairedBlasphemy: {
      id: "old_land_demands_blood",
      text: "The old land demands the blood of the idle.",
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
    id: "people_used_to_be_kinder",
    text: "People used to be kinder to each other.",
    supportedClassIds: ["peasant", "pariah"],
    pairedBlasphemy: {
      id: "destroy_trappings_of_modernity",
      text: "We must destroy all trappings of modernity.",
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
export type HierophantTempleId = HierophantStartingTempleId;

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

export function isValidHierophantTempleId(value: string): value is HierophantTempleId {
  return isValidHierophantStartingTempleId(value);
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
