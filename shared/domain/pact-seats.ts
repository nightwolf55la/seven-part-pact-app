export const PACT_SEAT_IDS = [
  "necromancer",
  "hierophant",
  "warlock",
  "mariner",
  "faustian",
  "sage",
  "sorcerer",
] as const;

export type PactSeatId = (typeof PACT_SEAT_IDS)[number];

export const PACT_SEAT_COUNT = PACT_SEAT_IDS.length;

const PACT_SEAT_DISPLAY_NAMES: Record<PactSeatId, string> = {
  necromancer: "Necromancer",
  hierophant: "Hierophant",
  warlock: "Warlock",
  mariner: "Mariner",
  faustian: "Faustian",
  sage: "Sage",
  sorcerer: "Sorcerer",
};

export function pactSeatDisplayName(id: PactSeatId): string {
  return PACT_SEAT_DISPLAY_NAMES[id];
}

export function isValidPactSeatId(value: string): value is PactSeatId {
  return (PACT_SEAT_IDS as readonly string[]).includes(value);
}
