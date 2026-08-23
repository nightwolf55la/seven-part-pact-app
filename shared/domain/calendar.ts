import type { Brand } from "./brand";

export type MonthOrdinal = Brand<number, "MonthOrdinal">;

export type MonthId =
  | "april"
  | "may"
  | "june"
  | "july"
  | "august"
  | "september"
  | "october"
  | "november"
  | "december"
  | "january"
  | "february"
  | "march";

export type MonthDirection = "forward" | "backward";

export type MonthDisplayName =
  | "April"
  | "May"
  | "June"
  | "July"
  | "August"
  | "September"
  | "October"
  | "November"
  | "December"
  | "January"
  | "February"
  | "March";

export const MONTH_IDS: readonly MonthId[] = [
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
  "january",
  "february",
  "march",
] as const;

export const MONTH_DISPLAY_NAMES: readonly MonthDisplayName[] = [
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "January",
  "February",
  "March",
] as const;

export const MONTH_COUNT = 12;

export const INITIAL_MONTH_ORDINAL = 0 as MonthOrdinal;

function normalizeIndex(ordinal: number): number {
  return ((ordinal % MONTH_COUNT) + MONTH_COUNT) % MONTH_COUNT;
}

export function monthIdFromOrdinal(ordinal: MonthOrdinal | number): MonthId {
  return MONTH_IDS[normalizeIndex(ordinal)];
}

export function displayNameFromMonthId(id: MonthId): MonthDisplayName {
  const index = MONTH_IDS.indexOf(id);
  return MONTH_DISPLAY_NAMES[index];
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
