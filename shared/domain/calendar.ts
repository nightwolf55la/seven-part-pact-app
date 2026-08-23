import type { Brand } from "./brand";

export type MonthOrdinal = Brand<number, "MonthOrdinal">;

export type MonthDirection = "forward" | "backward";

const MONTH_DEFINITIONS = [
  { id: "april", displayName: "April" },
  { id: "may", displayName: "May" },
  { id: "june", displayName: "June" },
  { id: "july", displayName: "July" },
  { id: "august", displayName: "August" },
  { id: "september", displayName: "September" },
  { id: "october", displayName: "October" },
  { id: "november", displayName: "November" },
  { id: "december", displayName: "December" },
  { id: "january", displayName: "January" },
  { id: "february", displayName: "February" },
  { id: "march", displayName: "March" },
] as const;

export type MonthId = (typeof MONTH_DEFINITIONS)[number]["id"];
export type MonthDisplayName = (typeof MONTH_DEFINITIONS)[number]["displayName"];

export const MONTH_IDS: readonly MonthId[] = MONTH_DEFINITIONS.map((m) => m.id);
export const MONTH_DISPLAY_NAMES: readonly MonthDisplayName[] =
  MONTH_DEFINITIONS.map((m) => m.displayName);

export const MONTH_COUNT = MONTH_DEFINITIONS.length;

export const INITIAL_MONTH_ORDINAL = 0 as MonthOrdinal;

function normalizeIndex(ordinal: number): number {
  return ((ordinal % MONTH_COUNT) + MONTH_COUNT) % MONTH_COUNT;
}

export function monthIdFromOrdinal(ordinal: MonthOrdinal | number): MonthId {
  return MONTH_IDS[normalizeIndex(ordinal)];
}

export function displayNameFromMonthId(id: MonthId): MonthDisplayName {
  return MONTH_DEFINITIONS[MONTH_IDS.indexOf(id)].displayName;
}

export function displayNameFromOrdinal(
  ordinal: MonthOrdinal | number,
): MonthDisplayName {
  return MONTH_DISPLAY_NAMES[normalizeIndex(ordinal)];
}

export function advanceOrdinal(
  ordinal: MonthOrdinal | number,
  direction: MonthDirection,
): MonthOrdinal {
  return (direction === "forward"
    ? ordinal + 1
    : ordinal - 1) as MonthOrdinal;
}
