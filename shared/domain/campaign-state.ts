import type { Brand } from "./brand";
import type { MonthOrdinal } from "./calendar";
import {
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
} from "./ruleset";

export type CampaignRevision = Brand<number, "CampaignRevision">;

export interface CampaignStateV1 {
  readonly schemaVersion: 1;
  readonly ruleset: {
    readonly id: typeof SEVEN_PART_PACT_DRAFT4_ID;
    readonly version: typeof SEVEN_PART_PACT_DRAFT4_VERSION;
  };
  readonly calendar: {
    readonly monthOrdinal: MonthOrdinal;
  };
}

export type CurrentCampaignState = CampaignStateV1;
export type AnyCampaignState = CampaignStateV1;

export const CURRENT_STATE_SCHEMA_VERSION: CurrentCampaignState["schemaVersion"] = 1;
