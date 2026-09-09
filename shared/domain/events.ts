import type { MonthOrdinal } from "./calendar";
import type { MonthDirection } from "./calendar";
import type { MovablePlanetId, CentidegreePosition } from "./orrery";
import type { LunarPhase, WizardCharacterDataV4, WizardCharacterDataV5 } from "./campaign-state";
import type { TimeDestination } from "./time-model";
import type { EngagementTargetV4, EngagementTargetV5 } from "./engagement";
import type { Denizen, Isle, WorldPlace, CompanionRelationship, ElementId } from "./shared-world";
import type { DenizenId, IsleId, PlaceId, WizardId, CompanionRelationshipId } from "./ids";
import type { HierophantFlameLawId, HierophantTempleId } from "./hierophant-catalogs";
import type {
  HierophantCampaignClass,
  HierophantCampaignDoctrine,
  HierophantCult,
  HierophantCultDogma,
  HierophantDogmaEntryId,
  HierophantProphet,
  HierophantSupplicant,
  HierophantTemple,
} from "./hierophant-state";
import type {
  MarinerArrangementId,
  MarinerBoardIsleId,
  MarinerLawOfSeaId,
  MarinerRouteId,
  MarinerSeaRegionId,
} from "./mariner-catalogs";
import type {
  MarinerBeastState,
  MarinerIsleMarket,
  MarinerRouteOccupancy,
  MarinerState,
} from "./mariner-state";
import type {
  NecromancerArrangementId,
  NecromancerBuiltinGateId,
  NecromancerBuiltinPathSpaceId,
  NecromancerDirectedStep,
  NecromancerGateId,
  NecromancerGateStatus,
  NecromancerLawOfDeathId,
  NecromancerOccupiableSpaceRef,
} from "./necromancer-catalogs";
import type {
  NecromancerAllyState,
  NecromancerCampaignGateState,
  NecromancerCampaignPathSpaceState,
  NecromancerDepthState,
  NecromancerFoeState,
  NecromancerGhoulCallerState,
  NecromancerSelectedLaw,
  NecromancerState,
} from "./necromancer-state";

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

export interface WizardCompanionChangedDataV1 {
  readonly wizardId: WizardId;
  readonly element: ElementId;
  readonly previousCurrentRelationship: CompanionRelationship | null;
  readonly newCurrentRelationship: CompanionRelationship | null;
}
export interface WizardCompanionChangedEventV1 {
  readonly type: "wizard_companion_changed";
  readonly version: 1;
  readonly data: WizardCompanionChangedDataV1;
}

export interface CompanionDescriptionChangedDataV1 {
  readonly companionRelationshipId: CompanionRelationshipId;
  readonly previous: CompanionRelationship;
  readonly updated: CompanionRelationship;
}
export interface CompanionDescriptionChangedEventV1 {
  readonly type: "companion_description_changed";
  readonly version: 1;
  readonly data: CompanionDescriptionChangedDataV1;
}

export interface HierophantInitializedDataV1 {
  readonly selectedFlameLawIds: readonly HierophantFlameLawId[];
  readonly temples: readonly HierophantTemple[];
}
export interface HierophantInitializedEventV1 {
  readonly type: "hierophant_initialized";
  readonly version: 1;
  readonly data: HierophantInitializedDataV1;
}

export interface TempleResourcesAdjustedDataV1 {
  readonly templeId: HierophantTempleId;
  readonly previousAbundance: number;
  readonly newAbundance: number;
  readonly previousConviction: number;
  readonly newConviction: number;
}
export interface TempleResourcesAdjustedEventV1 {
  readonly type: "temple_resources_adjusted";
  readonly version: 1;
  readonly data: TempleResourcesAdjustedDataV1;
}

export interface TempleCreatedDataV1 {
  readonly temple: HierophantTemple;
}
export interface TempleCreatedEventV1 {
  readonly type: "temple_created";
  readonly version: 1;
  readonly data: TempleCreatedDataV1;
}

export interface TempleUpdatedDataV1 {
  readonly previous: HierophantTemple;
  readonly updated: HierophantTemple;
}
export interface TempleUpdatedEventV1 {
  readonly type: "temple_updated";
  readonly version: 1;
  readonly data: TempleUpdatedDataV1;
}

export interface TempleHolidayChangedDataV1 {
  readonly templeId: HierophantTempleId;
  readonly previousMarked: boolean;
  readonly newMarked: boolean;
}
export interface TempleHolidayChangedEventV1 {
  readonly type: "temple_holiday_changed";
  readonly version: 1;
  readonly data: TempleHolidayChangedDataV1;
}

export interface FlameLawsChangedDataV1 {
  readonly previousSelectedFlameLawIds: readonly HierophantFlameLawId[];
  readonly newSelectedFlameLawIds: readonly HierophantFlameLawId[];
}
export interface FlameLawsChangedEventV1 {
  readonly type: "flame_laws_changed";
  readonly version: 1;
  readonly data: FlameLawsChangedDataV1;
}

export interface SupplicantAddedDataV1 {
  readonly supplicant: HierophantSupplicant;
}
export interface SupplicantAddedEventV1 {
  readonly type: "supplicant_added";
  readonly version: 1;
  readonly data: SupplicantAddedDataV1;
}

export interface SupplicantUpdatedDataV1 {
  readonly previous: HierophantSupplicant;
  readonly updated: HierophantSupplicant;
}
export interface SupplicantUpdatedEventV1 {
  readonly type: "supplicant_updated";
  readonly version: 1;
  readonly data: SupplicantUpdatedDataV1;
}

export interface SupplicantRemovedDataV1 {
  readonly denizenId: DenizenId;
}
export interface SupplicantRemovedEventV1 {
  readonly type: "supplicant_removed";
  readonly version: 1;
  readonly data: SupplicantRemovedDataV1;
}

export interface ProphetAddedDataV1 {
  readonly prophet: HierophantProphet;
}
export interface ProphetAddedEventV1 {
  readonly type: "prophet_added";
  readonly version: 1;
  readonly data: ProphetAddedDataV1;
}

export interface ProphetUpdatedDataV1 {
  readonly previous: HierophantProphet;
  readonly updated: HierophantProphet;
}
export interface ProphetUpdatedEventV1 {
  readonly type: "prophet_updated";
  readonly version: 1;
  readonly data: ProphetUpdatedDataV1;
}

export interface ProphetRemovedDataV1 {
  readonly denizenId: DenizenId;
}
export interface ProphetRemovedEventV1 {
  readonly type: "prophet_removed";
  readonly version: 1;
  readonly data: ProphetRemovedDataV1;
}

export interface CultEstablishedDataV1 {
  readonly cult: HierophantCult;
}
export interface CultEstablishedEventV1 {
  readonly type: "cult_established";
  readonly version: 1;
  readonly data: CultEstablishedDataV1;
}

export interface CultUpdatedDataV1 {
  readonly previous: HierophantCult;
  readonly updated: HierophantCult;
}
export interface CultUpdatedEventV1 {
  readonly type: "cult_updated";
  readonly version: 1;
  readonly data: CultUpdatedDataV1;
}

export interface CultRemovedDataV1 {
  readonly cultDenizenId: DenizenId;
}
export interface CultRemovedEventV1 {
  readonly type: "cult_removed";
  readonly version: 1;
  readonly data: CultRemovedDataV1;
}

export interface CultDogmaAddedDataV1 {
  readonly cultDenizenId: DenizenId;
  readonly dogma: HierophantCultDogma;
}
export interface CultDogmaAddedEventV1 {
  readonly type: "cult_dogma_added";
  readonly version: 1;
  readonly data: CultDogmaAddedDataV1;
}

export interface CultDogmaUpdatedDataV1 {
  readonly cultDenizenId: DenizenId;
  readonly previous: HierophantCultDogma;
  readonly updated: HierophantCultDogma;
}
export interface CultDogmaUpdatedEventV1 {
  readonly type: "cult_dogma_updated";
  readonly version: 1;
  readonly data: CultDogmaUpdatedDataV1;
}

export interface CultDogmaRemovedDataV1 {
  readonly cultDenizenId: DenizenId;
  readonly dogmaEntryId: HierophantDogmaEntryId;
}
export interface CultDogmaRemovedEventV1 {
  readonly type: "cult_dogma_removed";
  readonly version: 1;
  readonly data: CultDogmaRemovedDataV1;
}

export interface CampaignClassCreatedDataV1 {
  readonly campaignClass: HierophantCampaignClass;
}
export interface CampaignClassCreatedEventV1 {
  readonly type: "campaign_class_created";
  readonly version: 1;
  readonly data: CampaignClassCreatedDataV1;
}

export interface CampaignClassUpdatedDataV1 {
  readonly previous: HierophantCampaignClass;
  readonly updated: HierophantCampaignClass;
}
export interface CampaignClassUpdatedEventV1 {
  readonly type: "campaign_class_updated";
  readonly version: 1;
  readonly data: CampaignClassUpdatedDataV1;
}

export interface CampaignDoctrineCreatedDataV1 {
  readonly campaignDoctrine: HierophantCampaignDoctrine;
}
export interface CampaignDoctrineCreatedEventV1 {
  readonly type: "campaign_doctrine_created";
  readonly version: 1;
  readonly data: CampaignDoctrineCreatedDataV1;
}

export interface CampaignDoctrineUpdatedDataV1 {
  readonly previous: HierophantCampaignDoctrine;
  readonly updated: HierophantCampaignDoctrine;
}
export interface CampaignDoctrineUpdatedEventV1 {
  readonly type: "campaign_doctrine_updated";
  readonly version: 1;
  readonly data: CampaignDoctrineUpdatedDataV1;
}

export type WorldEvent =
  | DenizenCreatedEventV1
  | DenizenUpdatedEventV1
  | IsleCreatedEventV1
  | IsleUpdatedEventV1
  | PlaceCreatedEventV1
  | PlaceUpdatedEventV1
  | WizardHomeIsleChangedEventV1
  | WizardSanctumChangedEventV1
  | WizardCompanionChangedEventV1
  | CompanionDescriptionChangedEventV1;

export type HierophantEvent =
  | HierophantInitializedEventV1
  | TempleResourcesAdjustedEventV1
  | TempleCreatedEventV1
  | TempleUpdatedEventV1
  | TempleHolidayChangedEventV1
  | FlameLawsChangedEventV1
  | SupplicantAddedEventV1
  | SupplicantUpdatedEventV1
  | SupplicantRemovedEventV1
  | ProphetAddedEventV1
  | ProphetUpdatedEventV1
  | ProphetRemovedEventV1
  | CultEstablishedEventV1
  | CultUpdatedEventV1
  | CultRemovedEventV1
  | CultDogmaAddedEventV1
  | CultDogmaUpdatedEventV1
  | CultDogmaRemovedEventV1
  | CampaignClassCreatedEventV1
  | CampaignClassUpdatedEventV1
  | CampaignDoctrineCreatedEventV1
  | CampaignDoctrineUpdatedEventV1;

export interface MarinerIsleBindingDataV1 {
  readonly boardIsleId: MarinerBoardIsleId;
  readonly worldIsleId: IsleId;
}

export interface MarinerRarityDescriptionDataV1 {
  readonly boardIsleId: MarinerBoardIsleId;
  readonly description: string;
}

export interface MarinerInitializedDataV1 {
  readonly arrangementId: MarinerArrangementId;
  readonly shipPlaceId: PlaceId;
  readonly selectedLawOfSeaIds: readonly MarinerLawOfSeaId[];
  readonly isleBindings: readonly MarinerIsleBindingDataV1[];
  readonly arrangementBeasts: readonly MarinerBeastState[];
  readonly rarityDescriptions: readonly MarinerRarityDescriptionDataV1[];
  readonly mariner: MarinerState;
}
export interface MarinerInitializedEventV1 {
  readonly type: "mariner_initialized";
  readonly version: 1;
  readonly data: MarinerInitializedDataV1;
}

export interface MarinerShipChangedDataV1 {
  readonly previousShipPlaceId: PlaceId;
  readonly newShipPlaceId: PlaceId;
}
export interface MarinerShipChangedEventV1 {
  readonly type: "mariner_ship_changed";
  readonly version: 1;
  readonly data: MarinerShipChangedDataV1;
}

export interface MarinerSeaLawsChangedDataV1 {
  readonly previousSelectedLawOfSeaIds: readonly MarinerLawOfSeaId[];
  readonly newSelectedLawOfSeaIds: readonly MarinerLawOfSeaId[];
}
export interface MarinerSeaLawsChangedEventV1 {
  readonly type: "mariner_sea_laws_changed";
  readonly version: 1;
  readonly data: MarinerSeaLawsChangedDataV1;
}

export interface MarinerRouteOccupancyChangedDataV1 {
  readonly routeId: MarinerRouteId;
  readonly previousOccupancy: MarinerRouteOccupancy;
  readonly newOccupancy: MarinerRouteOccupancy;
}
export interface MarinerRouteOccupancyChangedEventV1 {
  readonly type: "mariner_route_occupancy_changed";
  readonly version: 1;
  readonly data: MarinerRouteOccupancyChangedDataV1;
}

export interface MarinerSeaStormCountChangedDataV1 {
  readonly regionId: MarinerSeaRegionId;
  readonly previousStormCount: number;
  readonly newStormCount: number;
}
export interface MarinerSeaStormCountChangedEventV1 {
  readonly type: "mariner_sea_storm_count_changed";
  readonly version: 1;
  readonly data: MarinerSeaStormCountChangedDataV1;
}

export interface MarinerIsleMarketChangedDataV1 {
  readonly boardIsleId: MarinerBoardIsleId;
  readonly previousMarket: MarinerIsleMarket;
  readonly newMarket: MarinerIsleMarket;
}
export interface MarinerIsleMarketChangedEventV1 {
  readonly type: "mariner_isle_market_changed";
  readonly version: 1;
  readonly data: MarinerIsleMarketChangedDataV1;
}

export interface MarinerIsleRavageChangedDataV1 {
  readonly boardIsleId: MarinerBoardIsleId;
  readonly previousRavageStormCount: number;
  readonly newRavageStormCount: number;
}
export interface MarinerIsleRavageChangedEventV1 {
  readonly type: "mariner_isle_ravage_changed";
  readonly version: 1;
  readonly data: MarinerIsleRavageChangedDataV1;
}

export interface MarinerBeastAddedDataV1 {
  readonly beast: MarinerBeastState;
}
export interface MarinerBeastAddedEventV1 {
  readonly type: "mariner_beast_added";
  readonly version: 1;
  readonly data: MarinerBeastAddedDataV1;
}

export interface MarinerBeastUpdatedDataV1 {
  readonly previous: MarinerBeastState;
  readonly updated: MarinerBeastState;
}
export interface MarinerBeastUpdatedEventV1 {
  readonly type: "mariner_beast_updated";
  readonly version: 1;
  readonly data: MarinerBeastUpdatedDataV1;
}

export interface MarinerBeastRemovedDataV1 {
  readonly beast: MarinerBeastState;
}
export interface MarinerBeastRemovedEventV1 {
  readonly type: "mariner_beast_removed";
  readonly version: 1;
  readonly data: MarinerBeastRemovedDataV1;
}

export type MarinerEvent =
  | MarinerInitializedEventV1
  | MarinerShipChangedEventV1
  | MarinerSeaLawsChangedEventV1
  | MarinerRouteOccupancyChangedEventV1
  | MarinerSeaStormCountChangedEventV1
  | MarinerIsleMarketChangedEventV1
  | MarinerIsleRavageChangedEventV1
  | MarinerBeastAddedEventV1
  | MarinerBeastUpdatedEventV1
  | MarinerBeastRemovedEventV1;

export interface NecromancerArrangementFoeBindingDataV1 {
  readonly denizenId: DenizenId;
  readonly gateId: NecromancerBuiltinGateId;
}
export interface NecromancerArrangementAllyBindingDataV1 {
  readonly denizenId: DenizenId;
  readonly gateId: NecromancerBuiltinGateId;
}
export interface NecromancerArrangementGhoulCallerBindingDataV1 {
  readonly denizenId: DenizenId;
  readonly pathSpaceId: NecromancerBuiltinPathSpaceId;
}

export interface NecromancerInitializedDataV1 {
  readonly arrangementId: NecromancerArrangementId;
  readonly selectedLawIds: readonly NecromancerLawOfDeathId[];
  readonly arrangementFoes: readonly NecromancerArrangementFoeBindingDataV1[];
  readonly arrangementAlly: NecromancerArrangementAllyBindingDataV1;
  readonly arrangementGhoulCaller: NecromancerArrangementGhoulCallerBindingDataV1 | null;
  readonly necromancer: NecromancerState;
}
export interface NecromancerInitializedEventV1 {
  readonly type: "necromancer_initialized";
  readonly version: 1;
  readonly data: NecromancerInitializedDataV1;
}

export interface NecromancerDepthChangedDataV1 {
  readonly previousDepth: NecromancerDepthState | null;
  readonly newDepth: NecromancerDepthState | null;
}
export interface NecromancerDepthChangedEventV1 {
  readonly type: "necromancer_depth_changed";
  readonly version: 1;
  readonly data: NecromancerDepthChangedDataV1;
}

export interface NecromancerLawsChangedDataV1 {
  readonly previousSelectedLaws: readonly NecromancerSelectedLaw[];
  readonly newSelectedLaws: readonly NecromancerSelectedLaw[];
}
export interface NecromancerLawsChangedEventV1 {
  readonly type: "necromancer_laws_changed";
  readonly version: 1;
  readonly data: NecromancerLawsChangedDataV1;
}

export interface NecromancerGateStatusChangedDataV1 {
  readonly gateId: NecromancerGateId;
  readonly previousStatus: NecromancerGateStatus;
  readonly newStatus: NecromancerGateStatus;
}
export interface NecromancerGateStatusChangedEventV1 {
  readonly type: "necromancer_gate_status_changed";
  readonly version: 1;
  readonly data: NecromancerGateStatusChangedDataV1;
}

export interface NecromancerSoulCountChangedDataV1 {
  readonly location: NecromancerOccupiableSpaceRef;
  readonly previousCount: number;
  readonly newCount: number;
}
export interface NecromancerSoulCountChangedEventV1 {
  readonly type: "necromancer_soul_count_changed";
  readonly version: 1;
  readonly data: NecromancerSoulCountChangedDataV1;
}

export interface NecromancerSoulsMovedDataV1 {
  readonly from: NecromancerOccupiableSpaceRef;
  readonly to: NecromancerOccupiableSpaceRef;
  readonly amount: number;
  readonly previousFromCount: number;
  readonly newFromCount: number;
  readonly previousToCount: number;
  readonly newToCount: number;
}
export interface NecromancerSoulsMovedEventV1 {
  readonly type: "necromancer_souls_moved";
  readonly version: 1;
  readonly data: NecromancerSoulsMovedDataV1;
}

export interface NecromancerFoeAddedDataV1 {
  readonly foe: NecromancerFoeState;
}
export interface NecromancerFoeAddedEventV1 {
  readonly type: "necromancer_foe_added";
  readonly version: 1;
  readonly data: NecromancerFoeAddedDataV1;
}

export interface NecromancerFoeUpdatedDataV1 {
  readonly previous: NecromancerFoeState;
  readonly updated: NecromancerFoeState;
}
export interface NecromancerFoeUpdatedEventV1 {
  readonly type: "necromancer_foe_updated";
  readonly version: 1;
  readonly data: NecromancerFoeUpdatedDataV1;
}

export interface NecromancerFoeRemovedDataV1 {
  readonly foe: NecromancerFoeState;
}
export interface NecromancerFoeRemovedEventV1 {
  readonly type: "necromancer_foe_removed";
  readonly version: 1;
  readonly data: NecromancerFoeRemovedDataV1;
}

export interface NecromancerAllyAddedDataV1 {
  readonly ally: NecromancerAllyState;
}
export interface NecromancerAllyAddedEventV1 {
  readonly type: "necromancer_ally_added";
  readonly version: 1;
  readonly data: NecromancerAllyAddedDataV1;
}

export interface NecromancerAllyUpdatedDataV1 {
  readonly previous: NecromancerAllyState;
  readonly updated: NecromancerAllyState;
}
export interface NecromancerAllyUpdatedEventV1 {
  readonly type: "necromancer_ally_updated";
  readonly version: 1;
  readonly data: NecromancerAllyUpdatedDataV1;
}

export interface NecromancerAllyRemovedDataV1 {
  readonly ally: NecromancerAllyState;
}
export interface NecromancerAllyRemovedEventV1 {
  readonly type: "necromancer_ally_removed";
  readonly version: 1;
  readonly data: NecromancerAllyRemovedDataV1;
}

export interface NecromancerGhoulCallerAddedDataV1 {
  readonly ghoulCaller: NecromancerGhoulCallerState;
}
export interface NecromancerGhoulCallerAddedEventV1 {
  readonly type: "necromancer_ghoul_caller_added";
  readonly version: 1;
  readonly data: NecromancerGhoulCallerAddedDataV1;
}

export interface NecromancerGhoulCallerUpdatedDataV1 {
  readonly previous: NecromancerGhoulCallerState;
  readonly updated: NecromancerGhoulCallerState;
}
export interface NecromancerGhoulCallerUpdatedEventV1 {
  readonly type: "necromancer_ghoul_caller_updated";
  readonly version: 1;
  readonly data: NecromancerGhoulCallerUpdatedDataV1;
}

export interface NecromancerGhoulCallerRemovedDataV1 {
  readonly ghoulCaller: NecromancerGhoulCallerState;
}
export interface NecromancerGhoulCallerRemovedEventV1 {
  readonly type: "necromancer_ghoul_caller_removed";
  readonly version: 1;
  readonly data: NecromancerGhoulCallerRemovedDataV1;
}

export interface NecromancerCampaignGateCreatedDataV1 {
  readonly gate: NecromancerCampaignGateState;
}
export interface NecromancerCampaignGateCreatedEventV1 {
  readonly type: "necromancer_campaign_gate_created";
  readonly version: 1;
  readonly data: NecromancerCampaignGateCreatedDataV1;
}

export interface NecromancerCampaignGateUpdatedDataV1 {
  readonly previous: NecromancerCampaignGateState;
  readonly updated: NecromancerCampaignGateState;
}
export interface NecromancerCampaignGateUpdatedEventV1 {
  readonly type: "necromancer_campaign_gate_updated";
  readonly version: 1;
  readonly data: NecromancerCampaignGateUpdatedDataV1;
}

export interface NecromancerCampaignPathSpaceCreatedDataV1 {
  readonly pathSpace: NecromancerCampaignPathSpaceState;
}
export interface NecromancerCampaignPathSpaceCreatedEventV1 {
  readonly type: "necromancer_campaign_path_space_created";
  readonly version: 1;
  readonly data: NecromancerCampaignPathSpaceCreatedDataV1;
}

export interface NecromancerCampaignPathSpaceRemovedDataV1 {
  readonly pathSpace: NecromancerCampaignPathSpaceState;
}
export interface NecromancerCampaignPathSpaceRemovedEventV1 {
  readonly type: "necromancer_campaign_path_space_removed";
  readonly version: 1;
  readonly data: NecromancerCampaignPathSpaceRemovedDataV1;
}

export interface NecromancerStepAddedDataV1 {
  readonly step: NecromancerDirectedStep;
}
export interface NecromancerStepAddedEventV1 {
  readonly type: "necromancer_step_added";
  readonly version: 1;
  readonly data: NecromancerStepAddedDataV1;
}

export interface NecromancerStepRemovedDataV1 {
  readonly step: NecromancerDirectedStep;
}
export interface NecromancerStepRemovedEventV1 {
  readonly type: "necromancer_step_removed";
  readonly version: 1;
  readonly data: NecromancerStepRemovedDataV1;
}

export type NecromancerEvent =
  | NecromancerInitializedEventV1
  | NecromancerDepthChangedEventV1
  | NecromancerLawsChangedEventV1
  | NecromancerGateStatusChangedEventV1
  | NecromancerSoulCountChangedEventV1
  | NecromancerSoulsMovedEventV1
  | NecromancerFoeAddedEventV1
  | NecromancerFoeUpdatedEventV1
  | NecromancerFoeRemovedEventV1
  | NecromancerAllyAddedEventV1
  | NecromancerAllyUpdatedEventV1
  | NecromancerAllyRemovedEventV1
  | NecromancerGhoulCallerAddedEventV1
  | NecromancerGhoulCallerUpdatedEventV1
  | NecromancerGhoulCallerRemovedEventV1
  | NecromancerCampaignGateCreatedEventV1
  | NecromancerCampaignGateUpdatedEventV1
  | NecromancerCampaignPathSpaceCreatedEventV1
  | NecromancerCampaignPathSpaceRemovedEventV1
  | NecromancerStepAddedEventV1
  | NecromancerStepRemovedEventV1;

export type CampaignEvent =
  | InfrastructureEvent
  | SetupEvent
  | PlayEvent
  | WorldEvent
  | HierophantEvent
  | MarinerEvent;

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
