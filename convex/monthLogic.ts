export const MONTHS = [
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

export type MonthName = (typeof MONTHS)[number];

export const MONTH_COUNT = MONTHS.length;

export function monthNameFromOrdinal(ordinal: number): MonthName {
  const index = ((ordinal % MONTH_COUNT) + MONTH_COUNT) % MONTH_COUNT;
  return MONTHS[index];
}

export function nextOrdinal(ordinal: number): number {
  return ordinal + 1;
}

export function previousOrdinal(ordinal: number): number {
  return ordinal - 1;
}
