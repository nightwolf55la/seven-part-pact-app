import type { Brand } from "./brand";
import type { MonthOrdinal } from "./calendar";
import type { PlayerId, WizardId } from "./ids";
import type { PactSeatId } from "./pact-seats";
import type { AgeDefinitionId } from "./ages";
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

export type PactSeatStatus = "present" | "silent" | "absent";

export interface PactSeatState {
  readonly status: PactSeatStatus | null;
  readonly wizardId: WizardId | null;
  readonly watcherPlayerId: PlayerId | null;
}

export interface CampaignPlayer {
  readonly playerId: PlayerId;
  readonly name: string;
}

export interface CampaignWizard {
  readonly wizardId: WizardId;
  readonly name: string;
  readonly portrayedByPlayerId: PlayerId | null;
}

export interface CampaignStateV2 {
  readonly schemaVersion: 2;
  readonly ruleset: {
    readonly id: typeof SEVEN_PART_PACT_DRAFT4_ID;
    readonly version: typeof SEVEN_PART_PACT_DRAFT4_VERSION;
  };
  readonly calendar: {
    readonly monthOrdinal: MonthOrdinal;
  };
  readonly configuration: {
    readonly ageId: AgeDefinitionId | null;
    readonly facilitatorPlayerId: PlayerId | null;
  };
  readonly players: readonly CampaignPlayer[];
  readonly wizards: readonly CampaignWizard[];
  readonly pactSeats: { readonly [K in PactSeatId]: PactSeatState };
}

export type CurrentCampaignState = CampaignStateV2;
export type AnyCampaignState = CampaignStateV1 | CampaignStateV2;

export const CURRENT_STATE_SCHEMA_VERSION: CurrentCampaignState["schemaVersion"] = 2;
