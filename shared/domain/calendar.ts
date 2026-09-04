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

export type MonthOfYearIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type SeasonId = "spring" | "summer" | "autumn" | "winter";

const SEASON_BY_MONTH_INDEX: readonly SeasonId[] = [
  "spring", "spring", "spring",
  "summer", "summer", "summer",
  "autumn", "autumn", "autumn",
  "winter", "winter", "winter",
];

export const MONTH_IDS: readonly MonthId[] = MONTH_DEFINITIONS.map((m) => m.id);
export const MONTH_DISPLAY_NAMES: readonly MonthDisplayName[] =
  MONTH_DEFINITIONS.map((m) => m.displayName);

export const MONTH_COUNT = MONTH_DEFINITIONS.length;

export const INITIAL_MONTH_ORDINAL = 0 as MonthOrdinal;

export function monthOfYearIndexFromOrdinal(ordinal: MonthOrdinal | number): MonthOfYearIndex {
  return (((ordinal % MONTH_COUNT) + MONTH_COUNT) % MONTH_COUNT) as MonthOfYearIndex;
}

export function monthIdFromOrdinal(ordinal: MonthOrdinal | number): MonthId {
  return MONTH_IDS[monthOfYearIndexFromOrdinal(ordinal)];
}

export function displayNameFromMonthId(id: MonthId): MonthDisplayName {
  return MONTH_DEFINITIONS[MONTH_IDS.indexOf(id)].displayName;
}

export function displayNameFromOrdinal(
  ordinal: MonthOrdinal | number,
): MonthDisplayName {
  return MONTH_DISPLAY_NAMES[monthOfYearIndexFromOrdinal(ordinal)];
}

export function seasonIdFromOrdinal(ordinal: MonthOrdinal | number): SeasonId {
  return SEASON_BY_MONTH_INDEX[monthOfYearIndexFromOrdinal(ordinal)];
}

export function advanceOrdinal(
  ordinal: MonthOrdinal | number,
  direction: MonthDirection,
): MonthOrdinal {
  return (direction === "forward"
    ? ordinal + 1
    : ordinal - 1) as MonthOrdinal;
}
