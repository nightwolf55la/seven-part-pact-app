export const AGE_DEFINITION_IDS = [
  "awakening",
  "dominion",
  "calamity",
] as const;

export type AgeDefinitionId = (typeof AGE_DEFINITION_IDS)[number];

const AGE_DISPLAY_NAMES: Record<AgeDefinitionId, string> = {
  awakening: "Awakening",
  dominion: "Dominion",
  calamity: "Calamity",
};

export function ageDisplayName(id: AgeDefinitionId): string {
  return AGE_DISPLAY_NAMES[id];
}

export function isValidAgeDefinitionId(value: string): value is AgeDefinitionId {
  return (AGE_DEFINITION_IDS as readonly string[]).includes(value);
}

export const AGE_DEFINITIONS = AGE_DEFINITION_IDS.map((id) => ({
  id,
  displayName: AGE_DISPLAY_NAMES[id],
}));
