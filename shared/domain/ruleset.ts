export interface RulesetRef {
  readonly id: string;
  readonly version: number;
}

export const SEVEN_PART_PACT_DRAFT4_ID = "seven_part_pact_draft4" as const;
export const SEVEN_PART_PACT_DRAFT4_VERSION = 1 as const;

export const CURRENT_RULESET: RulesetRef = {
  id: SEVEN_PART_PACT_DRAFT4_ID,
  version: SEVEN_PART_PACT_DRAFT4_VERSION,
};
