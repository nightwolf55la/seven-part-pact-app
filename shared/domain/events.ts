import type { MonthOrdinal } from "./calendar";
import type { MonthDirection } from "./calendar";
import type { MovablePlanetId, CentidegreePosition } from "./orrery";
import type { LunarPhase, WizardCharacterDataV4, WizardCharacterDataV5 } from "./campaign-state";
import type { TimeDestination } from "./time-model";
import type { EngagementTargetV4, EngagementTargetV5 } from "./engagement";
import type { Denizen, Isle, WorldPlace } from "./shared-world";
import type { DenizenId, IsleId, PlaceId, WizardId } from "./ids";

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

// --- M4 C3: Play phase / planning events ---

export interface PhaseAdvancedDataV1 {
  readonly monthOrdinal: MonthOrdinal;
  readonly fromPhase: LunarPhase;
  readonly toPhase: LunarPhase;
}

export interface PhaseAdvancedEventV1 {
  readonly type: "phase_advanced";
  readonly version: 1;
  readonly data: PhaseAdvancedDataV1;
}

export interface TimeAllocationScheduledDataV1 {
  readonly monthOrdinal: MonthOrdinal;
  readonly allocationId: string;
  readonly previousDestination: TimeDestination | null;
  readonly newDestination: TimeDestination | null;
  readonly note: string | null;
}

export interface TimeAllocationScheduledEventV1 {
  readonly type: "time_allocation_scheduled";
  readonly version: 1;
  readonly data: TimeAllocationScheduledDataV1;
}

export interface EngagementTargetChangedDataV1 {
  readonly monthOrdinal: MonthOrdinal;
  readonly engagementId: string;
  readonly actingWizardId: string;
  readonly previousTarget: EngagementTargetV4 | null;
  readonly newTarget: EngagementTargetV4 | null;
}

export interface EngagementTargetChangedEventV1 {
  readonly type: "engagement_target_changed";
  readonly version: 1;
  readonly data: EngagementTargetChangedDataV1;
}

// --- M4 C4: Story mechanics events ---

export interface TimeRescheduledDataV1 {
  readonly monthOrdinal: MonthOrdinal;
  readonly allocationId: string;
  readonly previousDestination: TimeDestination | null;
  readonly newDestination: TimeDestination | null;
  readonly note: string | null;
}

export interface TimeRescheduledEventV1 {
  readonly type: "time_rescheduled";
  readonly version: 1;
  readonly data: TimeRescheduledDataV1;
}

export interface TimeSpentDataV1 {
  readonly monthOrdinal: MonthOrdinal;
  readonly allocationId: string;
  readonly destination: TimeDestination;
}

export interface TimeSpentEventV1 {
  readonly type: "time_spent";
  readonly version: 1;
  readonly data: TimeSpentDataV1;
}

export interface TimeWastedDataV1 {
  readonly monthOrdinal: MonthOrdinal;
  readonly allocationId: string;
  readonly destination: TimeDestination | null;
  readonly note: string | null;
}

export interface TimeWastedEventV1 {
  readonly type: "time_wasted";
  readonly version: 1;
  readonly data: TimeWastedDataV1;
}

export interface OrreryTimeSpentDataV1 {
  readonly monthOrdinal: MonthOrdinal;
  readonly allocationId: string;
  readonly planetId: MovablePlanetId;
  readonly direction: string;
  readonly previousPosition: CentidegreePosition;
  readonly newPosition: CentidegreePosition;
}

export interface OrreryTimeSpentEventV1 {
  readonly type: "orrery_time_spent";
  readonly version: 1;
  readonly data: OrreryTimeSpentDataV1;
}

export interface EngagementTimeCommittedDataV1 {
  readonly monthOrdinal: MonthOrdinal;
  readonly allocationId: string;
  readonly engagementId: string;
  readonly previousDestination: TimeDestination | null;
}

export interface EngagementTimeCommittedEventV1 {
  readonly type: "engagement_time_committed";
  readonly version: 1;
  readonly data: EngagementTimeCommittedDataV1;
}

export interface EngagementResolvedDataV1 {
  readonly monthOrdinal: MonthOrdinal;
  readonly engagementId: string;
  readonly linkedAllocationId: string | null;
}

export interface EngagementResolvedEventV1 {
  readonly type: "engagement_resolved";
  readonly version: 1;
  readonly data: EngagementResolvedDataV1;
}

export interface EngagementRescheduledDataV1 {
  readonly monthOrdinal: MonthOrdinal;
  readonly engagementId: string;
  readonly previousTarget: EngagementTargetV4 | null;
  readonly newTarget: EngagementTargetV4;
}

export interface EngagementRescheduledEventV1 {
  readonly type: "engagement_rescheduled";
  readonly version: 1;
  readonly data: EngagementRescheduledDataV1;
}

// --- M4 C5A: Phase advancement V2, Wizardmoot, Meeting events ---

export interface PhaseAdvancedDataV2 {
  readonly monthOrdinal: MonthOrdinal;
  readonly fromPhase: LunarPhase;
  readonly toPhase: LunarPhase;
  readonly acknowledgedWarningKeys: readonly string[];
}

export interface PhaseAdvancedEventV2 {
  readonly type: "phase_advanced";
  readonly version: 2;
  readonly data: PhaseAdvancedDataV2;
}

export interface WizardmootAttendanceAdjustedDataV1 {
  readonly monthOrdinal: MonthOrdinal;
  readonly wizardId: string;
  readonly previousAttended: boolean;
  readonly previousExceptionReason: string | null;
  readonly newAttended: boolean;
  readonly newExceptionReason: string | null;
}

export interface WizardmootAttendanceAdjustedEventV1 {
  readonly type: "wizardmoot_attendance_adjusted";
  readonly version: 1;
  readonly data: WizardmootAttendanceAdjustedDataV1;
}

export interface MeetingCompletedDataV1 {
  readonly monthOrdinal: MonthOrdinal;
  readonly meetingAllocationsSpent: readonly string[];
}

export interface MeetingCompletedEventV1 {
  readonly type: "meeting_completed";
  readonly version: 1;
  readonly data: MeetingCompletedDataV1;
}

// --- M4 C5B: Begin Next Month event ---

export interface MonthBegunDataV1 {
  readonly fromMonthOrdinal: MonthOrdinal;
  readonly toMonthOrdinal: MonthOrdinal;
  readonly acknowledgedWarningKeys: readonly string[];
  readonly eligibleWizardIds: readonly string[];
}

export interface MonthBegunEventV1 {
  readonly type: "month_begun";
  readonly version: 1;
  readonly data: MonthBegunDataV1;
}

export type InfrastructureEvent =
  | UndoAppliedEventV1
  | RedoAppliedEventV1
  | CheckpointRestoredEventV1
  | BackupImportedEventV1;

// Historical event types retained for migration tooling (not part of active InfrastructureEvent union).
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

// --- Wizard Character ---

export interface WizardCharacterUpdatedDataV1 {
  readonly wizardId: string;
  readonly previousCharacter: WizardCharacterDataV4;
  readonly newCharacter: WizardCharacterDataV4;
}

export interface WizardCharacterUpdatedEventV1 {
  readonly type: "wizard_character_updated";
  readonly version: 1;
  readonly data: WizardCharacterUpdatedDataV1;
}

export type SetupEvent =
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
  | BeginPlayEventV1
  | WizardCharacterUpdatedEventV1
  | WizardCharacterUpdatedEventV2;

export type PlayEvent =
  | PhaseAdvancedEvent
  | TimeAllocationScheduledEventV1
  | EngagementTargetChangedEventV1
  | EngagementTargetChangedEventV2
  | TimeRescheduledEventV1
  | TimeSpentEventV1
  | TimeWastedEventV1
  | OrreryTimeSpentEventV1
  | EngagementTimeCommittedEventV1
  | EngagementResolvedEventV1
  | EngagementRescheduledEventV1
  | EngagementRescheduledEventV2
  | WizardmootAttendanceAdjustedEventV1
  | MeetingCompletedEventV1
  | MonthBegunEventV1;

// --- World events (V5 Shared World, activated per-entity) ---

export interface DenizenCreatedDataV1 {
  readonly denizen: Denizen;
}
export interface DenizenCreatedEventV1 {
  readonly type: "denizen_created";
  readonly version: 1;
  readonly data: DenizenCreatedDataV1;
}

export interface DenizenUpdatedDataV1 {
  readonly denizenId: DenizenId;
  readonly previous: Denizen;
  readonly updated: Denizen;
}
export interface DenizenUpdatedEventV1 {
  readonly type: "denizen_updated";
  readonly version: 1;
  readonly data: DenizenUpdatedDataV1;
}

export interface IsleCreatedDataV1 {
  readonly isle: Isle;
}
export interface IsleCreatedEventV1 {
  readonly type: "isle_created";
  readonly version: 1;
  readonly data: IsleCreatedDataV1;
}

export interface IsleUpdatedDataV1 {
  readonly isleId: IsleId;
  readonly previous: Isle;
  readonly updated: Isle;
}
export interface IsleUpdatedEventV1 {
  readonly type: "isle_updated";
  readonly version: 1;
  readonly data: IsleUpdatedDataV1;
}

export interface PlaceCreatedDataV1 {
  readonly place: WorldPlace;
}
export interface PlaceCreatedEventV1 {
  readonly type: "place_created";
  readonly version: 1;
  readonly data: PlaceCreatedDataV1;
}

export interface PlaceUpdatedDataV1 {
  readonly placeId: PlaceId;
  readonly previous: WorldPlace;
  readonly updated: WorldPlace;
}
export interface PlaceUpdatedEventV1 {
  readonly type: "place_updated";
  readonly version: 1;
  readonly data: PlaceUpdatedDataV1;
}

export interface WizardHomeIsleChangedDataV1 {
  readonly wizardId: WizardId;
  readonly previousHomeIsleId: IsleId | null;
  readonly newHomeIsleId: IsleId | null;
}
export interface WizardHomeIsleChangedEventV1 {
  readonly type: "wizard_home_isle_changed";
  readonly version: 1;
  readonly data: WizardHomeIsleChangedDataV1;
}

export interface WizardSanctumChangedDataV1 {
  readonly wizardId: WizardId;
  readonly previousSanctumPlaceId: PlaceId | null;
  readonly newSanctumPlaceId: PlaceId | null;
}
export interface WizardSanctumChangedEventV1 {
  readonly type: "wizard_sanctum_changed";
  readonly version: 1;
  readonly data: WizardSanctumChangedDataV1;
}

export type WorldEvent =
  | DenizenCreatedEventV1
  | DenizenUpdatedEventV1
  | IsleCreatedEventV1
  | IsleUpdatedEventV1
  | PlaceCreatedEventV1
  | PlaceUpdatedEventV1
  | WizardHomeIsleChangedEventV1
  | WizardSanctumChangedEventV1;

export type CampaignEvent =
  | InfrastructureEvent
  | SetupEvent
  | PlayEvent
  | WorldEvent;

export type PhaseAdvancedEvent = PhaseAdvancedEventV1 | PhaseAdvancedEventV2;

// --- Candidate V2 event types (NOT added to active unions) ---

export interface WizardCharacterUpdatedDataV2 {
  readonly wizardId: string;
  readonly previousCharacter: WizardCharacterDataV5;
  readonly newCharacter: WizardCharacterDataV5;
}

export interface WizardCharacterUpdatedEventV2 {
  readonly type: "wizard_character_updated";
  readonly version: 2;
  readonly data: WizardCharacterUpdatedDataV2;
}

export interface EngagementTargetChangedDataV2 {
  readonly monthOrdinal: MonthOrdinal;
  readonly engagementId: string;
  readonly actingWizardId: string;
  readonly previousTarget: EngagementTargetV5 | null;
  readonly newTarget: EngagementTargetV5 | null;
}

export interface EngagementTargetChangedEventV2 {
  readonly type: "engagement_target_changed";
  readonly version: 2;
  readonly data: EngagementTargetChangedDataV2;
}

export interface EngagementRescheduledDataV2 {
  readonly monthOrdinal: MonthOrdinal;
  readonly engagementId: string;
  readonly previousTarget: EngagementTargetV5 | null;
  readonly newTarget: EngagementTargetV5;
}

export interface EngagementRescheduledEventV2 {
  readonly type: "engagement_rescheduled";
  readonly version: 2;
  readonly data: EngagementRescheduledDataV2;
}
