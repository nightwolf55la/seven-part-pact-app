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

const FLAME_LAW_DISPLAY_NAMES: Record<HierophantFlameLawId, string> = {
  first: "First Law of the Flame",
  second: "Second Law of the Flame",
  third: "Third Law of the Flame",
  fourth: "Fourth Law of the Flame",
  fifth: "Fifth Law of the Flame",
  sixth: "Sixth Law of the Flame",
  seventh: "Seventh Law of the Flame",
};

export function hierophantFlameLawDisplayName(id: HierophantFlameLawId): string {
  return FLAME_LAW_DISPLAY_NAMES[id];
}

export function isValidHierophantFlameLawId(value: string): value is HierophantFlameLawId {
  return (HIEROPHANT_FLAME_LAW_IDS as readonly string[]).includes(value);
}

export const HIEROPHANT_FLAME_LAW_DEFINITIONS = HIEROPHANT_FLAME_LAW_IDS.map((id) => ({
  id,
  displayName: FLAME_LAW_DISPLAY_NAMES[id],
}));

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

export interface HierophantStartingTempleDefinition {
  readonly templeId: HierophantStartingTempleId;
  readonly displayName: string;
  readonly kind: HierophantTempleKind;
  readonly hostSeatId: "hierophant";
  readonly abundance: 0;
  readonly conviction: 0;
  readonly status: "active";
}

const STARTING_TEMPLE_DISPLAY_NAMES: Record<HierophantStartingTempleId, string> = {
  krolis: "Temple Krolis",
  notor: "Temple Notor",
  hestar: "Temple Hestar",
  ushin: "Temple Ushin",
  zephon: "Temple Zephon",
};

export const HIEROPHANT_STARTING_TEMPLE_DEFINITIONS: readonly HierophantStartingTempleDefinition[] = [
  { templeId: "krolis", displayName: STARTING_TEMPLE_DISPLAY_NAMES.krolis, kind: "ordinary", hostSeatId: "hierophant", abundance: 0, conviction: 0, status: "active" },
  { templeId: "notor", displayName: STARTING_TEMPLE_DISPLAY_NAMES.notor, kind: "ordinary", hostSeatId: "hierophant", abundance: 0, conviction: 0, status: "active" },
  { templeId: "hestar", displayName: STARTING_TEMPLE_DISPLAY_NAMES.hestar, kind: "hestar", hostSeatId: "hierophant", abundance: 0, conviction: 0, status: "active" },
  { templeId: "ushin", displayName: STARTING_TEMPLE_DISPLAY_NAMES.ushin, kind: "ordinary", hostSeatId: "hierophant", abundance: 0, conviction: 0, status: "active" },
  { templeId: "zephon", displayName: STARTING_TEMPLE_DISPLAY_NAMES.zephon, kind: "ordinary", hostSeatId: "hierophant", abundance: 0, conviction: 0, status: "active" },
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
