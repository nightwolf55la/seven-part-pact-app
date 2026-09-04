import type { MonthDirection, MonthOrdinal } from "./calendar";
import type { MovablePlanetId, CentidegreePosition } from "./orrery";

export interface MonthChangedDataV1 {
  readonly direction: MonthDirection;
  readonly fromOrdinal: MonthOrdinal;
  readonly toOrdinal: MonthOrdinal;
}

export interface MonthChangedEventV1 {
  readonly type: "month_changed";
  readonly version: 1;
  readonly data: MonthChangedDataV1;
}

export interface UndoAppliedDataV1 {
  readonly fromRevision: number;
  readonly targetRevision: number;
}

export interface UndoAppliedEventV1 {
  readonly type: "undo_applied";
  readonly version: 1;
  readonly data: UndoAppliedDataV1;
}

export interface RedoAppliedDataV1 {
  readonly fromRevision: number;
  readonly targetRevision: number;
}

export interface RedoAppliedEventV1 {
  readonly type: "redo_applied";
  readonly version: 1;
  readonly data: RedoAppliedDataV1;
}

export interface CheckpointRestoredDataV1 {
  readonly checkpointId: string;
  readonly sourceRevision: number;
  readonly labelAtRestore: string;
}

export interface CheckpointRestoredEventV1 {
  readonly type: "checkpoint_restored";
  readonly version: 1;
  readonly data: CheckpointRestoredDataV1;
}

export interface BackupImportedDataV1 {
  readonly backupFormatVersion: 1;
  readonly sourceCampaignId: string;
  readonly sourceCampaignRevision: number;
  readonly sourceLogicalRevision: number;
  readonly exportedAtMs: number;
  readonly payloadDigest: string;
}

export interface BackupImportedEventV1 {
  readonly type: "backup_imported";
  readonly version: 1;
  readonly data: BackupImportedDataV1;
}

// --- M3: Campaign Identity & Pact Roles Events ---

export interface PlayerAddedDataV1 {
  readonly playerId: string;
  readonly name: string;
}

export interface PlayerAddedEventV1 {
  readonly type: "player_added";
  readonly version: 1;
  readonly data: PlayerAddedDataV1;
}

export interface PlayerRenamedDataV1 {
  readonly playerId: string;
  readonly previousName: string;
  readonly newName: string;
}

export interface PlayerRenamedEventV1 {
  readonly type: "player_renamed";
  readonly version: 1;
  readonly data: PlayerRenamedDataV1;
}

export interface PlayerRemovedDataV1 {
  readonly playerId: string;
  readonly name: string;
}

export interface PlayerRemovedEventV1 {
  readonly type: "player_removed";
  readonly version: 1;
  readonly data: PlayerRemovedDataV1;
}

export interface CampaignAgeChangedDataV1 {
  readonly previousAgeId: string | null;
  readonly newAgeId: string | null;
}

export interface CampaignAgeChangedEventV1 {
  readonly type: "campaign_age_changed";
  readonly version: 1;
  readonly data: CampaignAgeChangedDataV1;
}

export interface FacilitatorAssignmentChangedDataV1 {
  readonly previousPlayerId: string | null;
  readonly newPlayerId: string | null;
}

export interface FacilitatorAssignmentChangedEventV1 {
  readonly type: "facilitator_assignment_changed";
  readonly version: 1;
  readonly data: FacilitatorAssignmentChangedDataV1;
}

export interface WizardCreatedDataV1 {
  readonly wizardId: string;
  readonly name: string;
  readonly portrayedByPlayerId: string | null;
  readonly assignedToSeatId: string;
}

export interface WizardCreatedEventV1 {
  readonly type: "wizard_created";
  readonly version: 1;
  readonly data: WizardCreatedDataV1;
}

export interface WizardNameChangedDataV1 {
  readonly wizardId: string;
  readonly previousName: string;
  readonly newName: string;
}

export interface WizardNameChangedEventV1 {
  readonly type: "wizard_name_changed";
  readonly version: 1;
  readonly data: WizardNameChangedDataV1;
}

export interface WizardPortrayalChangedDataV1 {
  readonly wizardId: string;
  readonly previousPlayerId: string | null;
  readonly newPlayerId: string | null;
}

export interface WizardPortrayalChangedEventV1 {
  readonly type: "wizard_portrayal_changed";
  readonly version: 1;
  readonly data: WizardPortrayalChangedDataV1;
}

export interface PactSeatWizardChangedDataV1 {
  readonly seatId: string;
  readonly previousWizardId: string | null;
  readonly newWizardId: string | null;
}

export interface PactSeatWizardChangedEventV1 {
  readonly type: "pact_seat_wizard_changed";
  readonly version: 1;
  readonly data: PactSeatWizardChangedDataV1;
}

export interface PactSeatStatusChangedDataV1 {
  readonly seatId: string;
  readonly previousStatus: string | null;
  readonly newStatus: string | null;
}

export interface PactSeatStatusChangedEventV1 {
  readonly type: "pact_seat_status_changed";
  readonly version: 1;
  readonly data: PactSeatStatusChangedDataV1;
}

export interface WatcherAssignmentChangedDataV1 {
  readonly seatId: string;
  readonly previousPlayerId: string | null;
  readonly newPlayerId: string | null;
}

export interface WatcherAssignmentChangedEventV1 {
  readonly type: "watcher_assignment_changed";
  readonly version: 1;
  readonly data: WatcherAssignmentChangedDataV1;
}

// --- M4: Setup edit events ---

export interface SetupMonthChangedDataV1 {
  readonly previousMonthOrdinal: MonthOrdinal | null;
  readonly newMonthOrdinal: MonthOrdinal | null;
}

export interface SetupMonthChangedEventV1 {
  readonly type: "setup_month_changed";
  readonly version: 1;
  readonly data: SetupMonthChangedDataV1;
}

export interface SetupOrreryPositionChangedDataV1 {
  readonly planetId: MovablePlanetId;
  readonly previousPosition: CentidegreePosition | null;
  readonly newPosition: CentidegreePosition | null;
}

export interface SetupOrreryPositionChangedEventV1 {
  readonly type: "setup_orrery_position_changed";
  readonly version: 1;
  readonly data: SetupOrreryPositionChangedDataV1;
}

// --- M4: Begin Play event ---

export interface BeginPlayDataV1 {
  readonly fromMonthOrdinal: MonthOrdinal;
  readonly toMonthOrdinal: MonthOrdinal;
  readonly eligibleWizardIds: readonly string[];
}

export interface BeginPlayEventV1 {
  readonly type: "begin_play";
  readonly version: 1;
  readonly data: BeginPlayDataV1;
}

export type CampaignEvent =
  | MonthChangedEventV1
  | UndoAppliedEventV1
  | RedoAppliedEventV1
  | CheckpointRestoredEventV1
  | BackupImportedEventV1
  | PlayerAddedEventV1
  | PlayerRenamedEventV1
  | PlayerRemovedEventV1
  | CampaignAgeChangedEventV1
  | FacilitatorAssignmentChangedEventV1
  | WizardCreatedEventV1
  | WizardNameChangedEventV1
  | WizardPortrayalChangedEventV1
  | PactSeatWizardChangedEventV1
  | PactSeatStatusChangedEventV1
  | WatcherAssignmentChangedEventV1
  | SetupMonthChangedEventV1
  | SetupOrreryPositionChangedEventV1
  | BeginPlayEventV1;
