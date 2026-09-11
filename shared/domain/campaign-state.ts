import type { Brand } from "./brand";
import type { MonthOrdinal } from "./calendar";
import type { PlayerId, WizardId, IsleId, PlaceId } from "./ids";
import type { PactSeatId } from "./pact-seats";
import { PACT_SEAT_IDS } from "./pact-seats";
import type { MortalityState } from "./shared-world";
import type { AgeDefinitionId } from "./ages";
import type { SetupOrreryState, OrreryState } from "./orrery";
import type { TimeParticipant, TimeParticipantV4 } from "./time-model";
import type { EngagementRecordV4, EngagementRecordV5 } from "./engagement";
import type { SharedWorldState } from "./shared-world";
import type { HierophantState } from "./hierophant-state";
import type { MarinerState } from "./mariner-state";
import type { NecromancerState } from "./necromancer-state";
import type { FaustianState } from "./faustian-state";
import type { SageState } from "./sage-state";
import type { WarlockState } from "./warlock-state";
import type { MagicConsumablesState } from "./magic-consumables";
import type { SorcererState } from "./sorcerer-state";
import type { LoreState } from "./lore-state";
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

export interface LegacyCampaignWizard {
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
  readonly wizards: readonly LegacyCampaignWizard[];
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

export interface MonthlyPlayStateV4 {
  readonly timeParticipants: readonly TimeParticipantV4[];
  readonly engagements: readonly EngagementRecordV4[];
  readonly wizardmootAttendance: readonly WizardmootAttendance[] | null;
}

export type MonthlyPlayState = MonthlyPlayStateV5;

export interface SetupLifecycle {
  readonly kind: "setup";
  readonly orrery: SetupOrreryState;
}

export interface PlayLifecycleV4 {
  readonly kind: "play";
  readonly phase: LunarPhase;
  readonly orrery: OrreryState;
  readonly currentMonth: MonthlyPlayStateV4;
}

export type PlayLifecycle = PlayLifecycleV5;

export type CampaignLifecycleV4 = SetupLifecycle | PlayLifecycleV4;
export type CampaignLifecycle = CampaignLifecycleV5;

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
  readonly wizards: readonly LegacyCampaignWizard[];
  readonly pactSeats: { readonly [K in PactSeatId]: PactSeatState };
  readonly lifecycle: CampaignLifecycleV4;
  readonly wizardmootHistory: readonly WizardmootHistoryEntry[];
}

// --- V4: Wizard character data ---

export interface WizardElementScores {
  readonly air: number;
  readonly fire: number;
  readonly earth: number;
  readonly water: number;
}

export interface WizardCompanionDescriptions {
  readonly air: string | null;
  readonly fire: string | null;
  readonly earth: string | null;
  readonly water: string | null;
}

export interface WizardCharacterDataV4 {
  readonly elements: WizardElementScores | null;
  readonly pactFragmentPersonalForm: string | null;
  readonly familiarDescription: string | null;
  readonly ageYears: number | null;
  readonly publicChangesOfMagic: readonly string[];
  readonly importantNotes: string | null;
  readonly companionDescriptions: WizardCompanionDescriptions;
}

export type WizardCharacterData = WizardCharacterDataV5;

export interface CampaignWizardV4 {
  readonly wizardId: WizardId;
  readonly name: string;
  readonly portrayedByPlayerId: PlayerId | null;
  readonly character: WizardCharacterDataV4;
}

export type CampaignWizard = CampaignWizardV5;

export const BLANK_WIZARD_CHARACTER_V4: WizardCharacterDataV4 = {
  elements: null,
  pactFragmentPersonalForm: null,
  familiarDescription: null,
  ageYears: null,
  publicChangesOfMagic: [],
  importantNotes: null,
  companionDescriptions: { air: null, fire: null, earth: null, water: null },
};

export const BLANK_WIZARD_CHARACTER_V5: WizardCharacterDataV5 = {
  elements: null,
  pactFragmentPersonalForm: null,
  familiarDescription: null,
  ageYears: null,
  publicChangesOfMagic: [],
  importantNotes: null,
};

export const BLANK_WIZARD_CHARACTER: WizardCharacterDataV5 = BLANK_WIZARD_CHARACTER_V5;

export interface CampaignStateV4 {
  readonly schemaVersion: 4;
  readonly ruleset: CampaignRuleset;
  readonly calendar: {
    readonly monthOrdinal: MonthOrdinal | null;
  };
  readonly configuration: {
    readonly ageId: AgeDefinitionId | null;
    readonly facilitatorPlayerId: PlayerId | null;
  };
  readonly players: readonly CampaignPlayer[];
  readonly wizards: readonly CampaignWizardV4[];
  readonly pactSeats: { readonly [K in PactSeatId]: PactSeatState };
  readonly lifecycle: CampaignLifecycleV4;
  readonly wizardmootHistory: readonly WizardmootHistoryEntry[];
}

export type CurrentCampaignState = CampaignStateV5;
export type AnyCampaignState = CampaignStateV5;

export const CURRENT_STATE_SCHEMA_VERSION: CurrentCampaignState["schemaVersion"] = 5;

// --- V5: Candidate types (NOT active in runtime) ---

export interface WizardCharacterDataV5 {
  readonly elements: WizardElementScores | null;
  readonly pactFragmentPersonalForm: string | null;
  readonly familiarDescription: string | null;
  readonly ageYears: number | null;
  readonly publicChangesOfMagic: readonly string[];
  readonly importantNotes: string | null;
}

export interface CampaignWizardV5 {
  readonly wizardId: WizardId;
  readonly name: string;
  readonly portrayedByPlayerId: PlayerId | null;
  readonly character: WizardCharacterDataV5;
  readonly homeIsleId: IsleId | null;
  readonly sanctumPlaceId: PlaceId | null;
  readonly mortalityState: MortalityState;
}

export type PactFragmentCondition = "intact" | "damaged" | "destroyed";

export const PACT_FRAGMENT_CONDITIONS: readonly PactFragmentCondition[] = [
  "intact",
  "damaged",
  "destroyed",
] as const;

export type PactFragmentCustody =
  | {
      readonly kind: "wizard";
      readonly wizardId: WizardId;
    }
  | {
      readonly kind: "devil";
    }
  | {
      readonly kind: "unlocated";
    }
  | {
      readonly kind: "none";
    };

export interface PactFragmentOperationalState {
  readonly condition: PactFragmentCondition;
  readonly custody: PactFragmentCustody;
}

export type PactFragmentOperationalMap = {
  readonly [K in PactSeatId]: PactFragmentOperationalState;
};

export function initializePactFragmentOperationalState(
  pactSeats: { readonly [K in PactSeatId]: Pick<PactSeatState, "wizardId"> },
): PactFragmentOperationalMap {
  const fragments = {} as Record<PactSeatId, PactFragmentOperationalState>;
  for (const seatId of PACT_SEAT_IDS) {
    const wizardId = pactSeats[seatId].wizardId;
    fragments[seatId] =
      wizardId === null
        ? { condition: "intact", custody: { kind: "none" } }
        : { condition: "intact", custody: { kind: "wizard", wizardId } };
  }
  return fragments as PactFragmentOperationalMap;
}

export const EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE: PactFragmentOperationalMap =
  initializePactFragmentOperationalState({
    necromancer: { wizardId: null },
    hierophant: { wizardId: null },
    warlock: { wizardId: null },
    mariner: { wizardId: null },
    faustian: { wizardId: null },
    sage: { wizardId: null },
    sorcerer: { wizardId: null },
  });

export interface MonthlyPlayStateV5 {
  readonly timeParticipants: readonly TimeParticipant[];
  readonly engagements: readonly EngagementRecordV5[];
  readonly wizardmootAttendance: readonly WizardmootAttendance[] | null;
}

export interface PlayLifecycleV5 {
  readonly kind: "play";
  readonly phase: LunarPhase;
  readonly orrery: OrreryState;
  readonly currentMonth: MonthlyPlayStateV5;
}

export type CampaignLifecycleV5 = SetupLifecycle | PlayLifecycleV5;

export interface CampaignStateV5 {
  readonly schemaVersion: 5;
  readonly ruleset: CampaignRuleset;
  readonly calendar: {
    readonly monthOrdinal: MonthOrdinal | null;
  };
  readonly configuration: {
    readonly ageId: AgeDefinitionId | null;
    readonly facilitatorPlayerId: PlayerId | null;
  };
  readonly players: readonly CampaignPlayer[];
  readonly wizards: readonly CampaignWizardV5[];
  readonly pactSeats: { readonly [K in PactSeatId]: PactSeatState };
  readonly pactFragmentOperationalState: PactFragmentOperationalMap;
  readonly lifecycle: CampaignLifecycleV5;
  readonly wizardmootHistory: readonly WizardmootHistoryEntry[];
  readonly world: SharedWorldState;
  readonly hierophant: HierophantState;
  readonly mariner: MarinerState;
  readonly necromancer: NecromancerState;
  readonly faustian: FaustianState;
  readonly sage: SageState;
  readonly warlock: WarlockState;
  readonly magicConsumables: MagicConsumablesState;
  readonly sorcerer: SorcererState;
  readonly lore: LoreState;
}
