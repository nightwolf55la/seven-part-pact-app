import type { Brand } from "./brand";
import type { MonthOrdinal } from "./calendar";
import type { PlayerId, WizardId } from "./ids";
import type { PactSeatId } from "./pact-seats";
import type { AgeDefinitionId } from "./ages";
import type { SetupOrreryState, OrreryState } from "./orrery";
import type { TimeParticipant } from "./time-model";
import type { EngagementRecord } from "./engagement";
import type { WizardmootAttendance, WizardmootHistoryEntry } from "./wizardmoot";
import {
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
} from "./ruleset";

export type CampaignRevision = Brand<number, "CampaignRevision">;

export type CampaignRuleset = {
  readonly id: typeof SEVEN_PART_PACT_DRAFT4_ID;
  readonly version: typeof SEVEN_PART_PACT_DRAFT4_VERSION;
};

// --- V1 / V2: retained as type-only for fail-closed rejection ---

export interface CampaignStateV1 {
  readonly schemaVersion: 1;
  readonly ruleset: CampaignRuleset;
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
  readonly ruleset: CampaignRuleset;
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

// --- V3: Setup / Play discriminated lifecycle ---

export type LunarPhase =
  | "new_moon"
  | "visions"
  | "planning"
  | "story"
  | "meeting"
  | "quiet";

export const LUNAR_PHASES: readonly LunarPhase[] = [
  "new_moon", "visions", "planning", "story", "meeting", "quiet",
] as const;

export interface MonthlyPlayState {
  readonly timeParticipants: readonly TimeParticipant[];
  readonly engagements: readonly EngagementRecord[];
  readonly wizardmootAttendance: readonly WizardmootAttendance[] | null;
}

export interface SetupLifecycle {
  readonly kind: "setup";
  readonly orrery: SetupOrreryState;
}

export interface PlayLifecycle {
  readonly kind: "play";
  readonly phase: LunarPhase;
  readonly orrery: OrreryState;
  readonly currentMonth: MonthlyPlayState;
}

export type CampaignLifecycle = SetupLifecycle | PlayLifecycle;

export interface CampaignStateV3 {
  readonly schemaVersion: 3;
  readonly ruleset: CampaignRuleset;
  readonly calendar: {
    readonly monthOrdinal: MonthOrdinal | null;
  };
  readonly configuration: {
    readonly ageId: AgeDefinitionId | null;
    readonly facilitatorPlayerId: PlayerId | null;
  };
  readonly players: readonly CampaignPlayer[];
  readonly wizards: readonly CampaignWizard[];
  readonly pactSeats: { readonly [K in PactSeatId]: PactSeatState };
  readonly lifecycle: CampaignLifecycle;
  readonly wizardmootHistory: readonly WizardmootHistoryEntry[];
}

export type CurrentCampaignState = CampaignStateV3;
export type AnyCampaignState = CampaignStateV3;

export const CURRENT_STATE_SCHEMA_VERSION: CurrentCampaignState["schemaVersion"] = 3;
