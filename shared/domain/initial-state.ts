import type { CurrentCampaignState } from "./campaign-state";
import { CURRENT_STATE_SCHEMA_VERSION } from "./campaign-state";
import {
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
} from "./ruleset";
import { INITIAL_MONTH_ORDINAL } from "./calendar";
import type { MonthOrdinal } from "./calendar";

export function initialCampaignState(): CurrentCampaignState {
  return {
    schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
    ruleset: {
      id: SEVEN_PART_PACT_DRAFT4_ID,
      version: SEVEN_PART_PACT_DRAFT4_VERSION,
    },
    calendar: {
      monthOrdinal: INITIAL_MONTH_ORDINAL,
    },
  };
}
