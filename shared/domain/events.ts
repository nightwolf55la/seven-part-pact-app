import type { MonthOrdinal } from "./calendar";
import type { MonthDirection } from "./calendar";
import type { MovablePlanetId, CentidegreePosition } from "./orrery";
import type {
  LunarPhase,
  PactFragmentOperationalState,
  WizardCharacterDataV4,
  WizardCharacterDataV5,
} from "./campaign-state";
import type { PactSeatId } from "./pact-seats";
import type { TimeDestination } from "./time-model";
import type { EngagementTargetV4, EngagementTargetV5 } from "./engagement";
import type {
  Denizen,
  Isle,
  MortalityState,
  Treasure,
  WorldPlace,
  CompanionRelationship,
  ElementId,
} from "./shared-world";
import type {
  CampaignPowerfulDenizenTaxonomy,
  PowerfulDenizenMethodEntry,
  PowerfulDenizenProfile,
  PowerfulDenizenStatus,
  PowerfulDenizenTaxonomyRef,
  PowerfulDenizenTruthEntry,
} from "./powerful-denizen";
import type {
  CompanionRelationshipId,
  DenizenId,
  IsleId,
  LoreCollectionId,
  LoreEntryId,
  PlaceId,
  PowerfulDenizenTruthId,
  TreasureId,
  WizardId,
} from "./ids";
import type { HierophantFlameLawId, HierophantTempleId } from "./hierophant-catalogs";
import type {
  HierophantCampaignClass,
  HierophantCampaignDoctrine,
  HierophantClassId,
  HierophantCult,
  HierophantCultDogma,
  HierophantDogmaEntryId,
  HierophantProphet,
  HierophantSupplicant,
  HierophantTemple,
  HierophantTempleArea,
  HierophantTempleStatus,
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
  NecromancerWizardFoeState,
  NecromancerWizardTraversalState,
} from "./necromancer-state";
import type { FaustianCardId, FaustianCommunityId } from "./faustian-catalogs";
import type { MagicSchoolRef } from "./magic-consumables";
import type {
  SorcererArrangementId,
  SorcererLawOfMagicId,
  SorcererSourceReagentId,
} from "./sorcerer-catalogs";
import type { GrimoireSpellId } from "./grimoire-catalog";
import type {
  SorcererArcanist,
  SorcererArcanistPlacement,
  SorcererCampaignAcademicKindDefinition,
  SorcererCampaignAcademicKindId,
  SorcererCampaignKnowledgeMethodDefinition,
  SorcererCampaignRecipeDefinition,
  SorcererCampaignSchoolDefinition,
  SorcererConstructInstruction,
  SorcererInnovation,
  SorcererInnovationId,
  SorcererRecipeRef,
  SorcererResearchPositionId,
  SorcererState,
} from "./sorcerer-state";
import type { LoreSubjectRef } from "./lore-state";
import type { SourceLoreCollectionId, SourceLoreEntryId } from "./lore-catalog";

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

export interface HierophantSupplicantCreatedDataV1 {
  readonly denizenId: DenizenId;
  readonly denizenName: string;
  readonly classId: HierophantClassId;
  readonly woe: number;
  readonly templeId: HierophantTempleId;
  readonly area: HierophantTempleArea | null;
  readonly expectedTempleStatus: HierophantTempleStatus;
}
export interface HierophantSupplicantCreatedEventV1 {
  readonly type: "hierophant_supplicant_created";
  readonly version: 1;
  readonly data: HierophantSupplicantCreatedDataV1;
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

// --- Shared Wizard / Denizen state events (M5.2D D1) ---

export interface WizardMortalityStateChangedDataV1 {
  readonly wizardId: WizardId;
  readonly previousMortalityState: MortalityState;
  readonly newMortalityState: MortalityState;
}
export interface WizardMortalityStateChangedEventV1 {
  readonly type: "wizard_mortality_state_changed";
  readonly version: 1;
  readonly data: WizardMortalityStateChangedDataV1;
}

export interface DenizenMortalityStateChangedDataV1 {
  readonly denizenId: DenizenId;
  readonly previousMortalityState: MortalityState;
  readonly newMortalityState: MortalityState;
}
export interface DenizenMortalityStateChangedEventV1 {
  readonly type: "denizen_mortality_state_changed";
  readonly version: 1;
  readonly data: DenizenMortalityStateChangedDataV1;
}

export interface PowerfulDenizenProfileCreatedDataV1 {
  readonly denizenId: DenizenId;
  readonly profile: PowerfulDenizenProfile;
}
export interface PowerfulDenizenProfileCreatedEventV1 {
  readonly type: "powerful_denizen_profile_created";
  readonly version: 1;
  readonly data: PowerfulDenizenProfileCreatedDataV1;
}

export interface PowerfulDenizenProfileRemovedDataV1 {
  readonly denizenId: DenizenId;
  readonly profile: PowerfulDenizenProfile;
}
export interface PowerfulDenizenProfileRemovedEventV1 {
  readonly type: "powerful_denizen_profile_removed";
  readonly version: 1;
  readonly data: PowerfulDenizenProfileRemovedDataV1;
}

export interface PowerfulDenizenTaxonomiesChangedDataV1 {
  readonly denizenId: DenizenId;
  readonly previous: readonly PowerfulDenizenTaxonomyRef[];
  readonly updated: readonly PowerfulDenizenTaxonomyRef[];
}
export interface PowerfulDenizenTaxonomiesChangedEventV1 {
  readonly type: "powerful_denizen_taxonomies_changed";
  readonly version: 1;
  readonly data: PowerfulDenizenTaxonomiesChangedDataV1;
}

export interface PowerfulDenizenStatusChangedDataV1 {
  readonly denizenId: DenizenId;
  readonly previous: PowerfulDenizenStatus;
  readonly updated: PowerfulDenizenStatus;
}
export interface PowerfulDenizenStatusChangedEventV1 {
  readonly type: "powerful_denizen_status_changed";
  readonly version: 1;
  readonly data: PowerfulDenizenStatusChangedDataV1;
}

export interface PowerfulDenizenGoalChangedDataV1 {
  readonly denizenId: DenizenId;
  readonly previousGoal: string | null;
  readonly newGoal: string | null;
}
export interface PowerfulDenizenGoalChangedEventV1 {
  readonly type: "powerful_denizen_goal_changed";
  readonly version: 1;
  readonly data: PowerfulDenizenGoalChangedDataV1;
}

export interface PowerfulDenizenMethodAddedDataV1 {
  readonly denizenId: DenizenId;
  readonly method: PowerfulDenizenMethodEntry;
}
export interface PowerfulDenizenMethodAddedEventV1 {
  readonly type: "powerful_denizen_method_added";
  readonly version: 1;
  readonly data: PowerfulDenizenMethodAddedDataV1;
}

export interface PowerfulDenizenMethodUpdatedDataV1 {
  readonly denizenId: DenizenId;
  readonly previous: PowerfulDenizenMethodEntry;
  readonly updated: PowerfulDenizenMethodEntry;
}
export interface PowerfulDenizenMethodUpdatedEventV1 {
  readonly type: "powerful_denizen_method_updated";
  readonly version: 1;
  readonly data: PowerfulDenizenMethodUpdatedDataV1;
}

export interface PowerfulDenizenMethodRemovedDataV1 {
  readonly denizenId: DenizenId;
  readonly method: PowerfulDenizenMethodEntry;
}
export interface PowerfulDenizenMethodRemovedEventV1 {
  readonly type: "powerful_denizen_method_removed";
  readonly version: 1;
  readonly data: PowerfulDenizenMethodRemovedDataV1;
}

export interface PowerfulDenizenTruthAddedDataV1 {
  readonly denizenId: DenizenId;
  readonly truth: PowerfulDenizenTruthEntry;
}
export interface PowerfulDenizenTruthAddedEventV1 {
  readonly type: "powerful_denizen_truth_added";
  readonly version: 1;
  readonly data: PowerfulDenizenTruthAddedDataV1;
}

export interface PowerfulDenizenTruthUpdatedDataV1 {
  readonly denizenId: DenizenId;
  readonly previous: PowerfulDenizenTruthEntry;
  readonly updated: PowerfulDenizenTruthEntry;
}
export interface PowerfulDenizenTruthUpdatedEventV1 {
  readonly type: "powerful_denizen_truth_updated";
  readonly version: 1;
  readonly data: PowerfulDenizenTruthUpdatedDataV1;
}

export interface PowerfulDenizenTruthRemovedDataV1 {
  readonly denizenId: DenizenId;
  readonly truth: PowerfulDenizenTruthEntry;
}
export interface PowerfulDenizenTruthRemovedEventV1 {
  readonly type: "powerful_denizen_truth_removed";
  readonly version: 1;
  readonly data: PowerfulDenizenTruthRemovedDataV1;
}

export interface CampaignPowerfulDenizenTaxonomyCreatedDataV1 {
  readonly taxonomy: CampaignPowerfulDenizenTaxonomy;
}
export interface CampaignPowerfulDenizenTaxonomyCreatedEventV1 {
  readonly type: "campaign_powerful_denizen_taxonomy_created";
  readonly version: 1;
  readonly data: CampaignPowerfulDenizenTaxonomyCreatedDataV1;
}

export interface CampaignPowerfulDenizenTaxonomyUpdatedDataV1 {
  readonly previous: CampaignPowerfulDenizenTaxonomy;
  readonly updated: CampaignPowerfulDenizenTaxonomy;
}
export interface CampaignPowerfulDenizenTaxonomyUpdatedEventV1 {
  readonly type: "campaign_powerful_denizen_taxonomy_updated";
  readonly version: 1;
  readonly data: CampaignPowerfulDenizenTaxonomyUpdatedDataV1;
}

export interface CampaignPowerfulDenizenTaxonomyRemovedDataV1 {
  readonly taxonomy: CampaignPowerfulDenizenTaxonomy;
}
export interface CampaignPowerfulDenizenTaxonomyRemovedEventV1 {
  readonly type: "campaign_powerful_denizen_taxonomy_removed";
  readonly version: 1;
  readonly data: CampaignPowerfulDenizenTaxonomyRemovedDataV1;
}

export interface TreasureCreatedDataV1 {
  readonly treasure: Treasure;
}
export interface TreasureCreatedEventV1 {
  readonly type: "treasure_created";
  readonly version: 1;
  readonly data: TreasureCreatedDataV1;
}

export interface TreasureDetailsUpdatedDataV1 {
  readonly treasureId: TreasureId;
  readonly previous: Treasure;
  readonly updated: Treasure;
}
export interface TreasureDetailsUpdatedEventV1 {
  readonly type: "treasure_details_updated";
  readonly version: 1;
  readonly data: TreasureDetailsUpdatedDataV1;
}

export interface TreasureStateUpdatedDataV1 {
  readonly treasureId: TreasureId;
  readonly previous: Treasure;
  readonly updated: Treasure;
}
export interface TreasureStateUpdatedEventV1 {
  readonly type: "treasure_state_updated";
  readonly version: 1;
  readonly data: TreasureStateUpdatedDataV1;
}

export interface PactFragmentOperationalStateChangedDataV1 {
  readonly seatId: PactSeatId;
  readonly previous: PactFragmentOperationalState;
  readonly updated: PactFragmentOperationalState;
}
export interface PactFragmentOperationalStateChangedEventV1 {
  readonly type: "pact_fragment_operational_state_changed";
  readonly version: 1;
  readonly data: PactFragmentOperationalStateChangedDataV1;
}

export type SharedStateEvent =
  | WizardMortalityStateChangedEventV1
  | DenizenMortalityStateChangedEventV1
  | PowerfulDenizenProfileCreatedEventV1
  | PowerfulDenizenProfileRemovedEventV1
  | PowerfulDenizenTaxonomiesChangedEventV1
  | PowerfulDenizenStatusChangedEventV1
  | PowerfulDenizenGoalChangedEventV1
  | PowerfulDenizenMethodAddedEventV1
  | PowerfulDenizenMethodUpdatedEventV1
  | PowerfulDenizenMethodRemovedEventV1
  | PowerfulDenizenTruthAddedEventV1
  | PowerfulDenizenTruthUpdatedEventV1
  | PowerfulDenizenTruthRemovedEventV1
  | CampaignPowerfulDenizenTaxonomyCreatedEventV1
  | CampaignPowerfulDenizenTaxonomyUpdatedEventV1
  | CampaignPowerfulDenizenTaxonomyRemovedEventV1
  | TreasureCreatedEventV1
  | TreasureDetailsUpdatedEventV1
  | TreasureStateUpdatedEventV1
  | PactFragmentOperationalStateChangedEventV1;

export type HierophantEvent =
  | HierophantInitializedEventV1
  | TempleResourcesAdjustedEventV1
  | TempleCreatedEventV1
  | TempleUpdatedEventV1
  | TempleHolidayChangedEventV1
  | FlameLawsChangedEventV1
  | HierophantSupplicantCreatedEventV1
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
  readonly primaryElement: ElementId;
  readonly aesthetic: string;
  readonly strangeQuirk: string;
  readonly ageYears: number;
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

export interface NecromancerWizardFoeEscapedDataV1 {
  readonly wizardId: WizardId;
  readonly previousMortalityState: "deceased";
  readonly newMortalityState: "not_deceased";
  readonly previous: NecromancerWizardFoeState;
  readonly updated: NecromancerWizardFoeState;
}
export interface NecromancerWizardFoeEscapedEventV1 {
  readonly type: "necromancer_wizard_foe_escaped";
  readonly version: 1;
  readonly data: NecromancerWizardFoeEscapedDataV1;
}

export interface NecromancerWizardFoeTruthAddedDataV1 {
  readonly wizardId: WizardId;
  readonly truth: PowerfulDenizenTruthEntry;
}
export interface NecromancerWizardFoeTruthAddedEventV1 {
  readonly type: "necromancer_wizard_foe_truth_added";
  readonly version: 1;
  readonly data: NecromancerWizardFoeTruthAddedDataV1;
}

export interface NecromancerWizardFoeTruthUpdatedDataV1 {
  readonly wizardId: WizardId;
  readonly previous: PowerfulDenizenTruthEntry;
  readonly updated: PowerfulDenizenTruthEntry;
}
export interface NecromancerWizardFoeTruthUpdatedEventV1 {
  readonly type: "necromancer_wizard_foe_truth_updated";
  readonly version: 1;
  readonly data: NecromancerWizardFoeTruthUpdatedDataV1;
}

export interface NecromancerWizardFoeTruthRemovedDataV1 {
  readonly wizardId: WizardId;
  readonly truth: PowerfulDenizenTruthEntry;
}
export interface NecromancerWizardFoeTruthRemovedEventV1 {
  readonly type: "necromancer_wizard_foe_truth_removed";
  readonly version: 1;
  readonly data: NecromancerWizardFoeTruthRemovedDataV1;
}

export interface NecromancerWizardTraversalAddedDataV1 {
  readonly traversal: NecromancerWizardTraversalState;
}
export interface NecromancerWizardTraversalAddedEventV1 {
  readonly type: "necromancer_wizard_traversal_added";
  readonly version: 1;
  readonly data: NecromancerWizardTraversalAddedDataV1;
}

export interface NecromancerWizardTraversalUpdatedDataV1 {
  readonly previous: NecromancerWizardTraversalState;
  readonly updated: NecromancerWizardTraversalState;
}
export interface NecromancerWizardTraversalUpdatedEventV1 {
  readonly type: "necromancer_wizard_traversal_updated";
  readonly version: 1;
  readonly data: NecromancerWizardTraversalUpdatedDataV1;
}

export interface NecromancerWizardTraversalRemovedDataV1 {
  readonly traversal: NecromancerWizardTraversalState;
}
export interface NecromancerWizardTraversalRemovedEventV1 {
  readonly type: "necromancer_wizard_traversal_removed";
  readonly version: 1;
  readonly data: NecromancerWizardTraversalRemovedDataV1;
}

export interface NecromancerSoulTransformedIntoAllyDataV1 {
  readonly denizenId: DenizenId;
  readonly denizenName: string;
  readonly gateId: NecromancerGateId;
  readonly previousSoulCount: number;
  readonly newSoulCount: number;
  readonly expectedGateStatus: NecromancerGateStatus;
}
export interface NecromancerSoulTransformedIntoAllyEventV1 {
  readonly type: "necromancer_soul_transformed_into_ally";
  readonly version: 1;
  readonly data: NecromancerSoulTransformedIntoAllyDataV1;
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
  | NecromancerWizardFoeEscapedEventV1
  | NecromancerWizardFoeTruthAddedEventV1
  | NecromancerWizardFoeTruthUpdatedEventV1
  | NecromancerWizardFoeTruthRemovedEventV1
  | NecromancerWizardTraversalAddedEventV1
  | NecromancerWizardTraversalUpdatedEventV1
  | NecromancerWizardTraversalRemovedEventV1
  | NecromancerSoulTransformedIntoAllyEventV1
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

export interface FaustianCommunityInvestigatedDataV1 {
  readonly communityId: FaustianCommunityId;
  readonly schemeCardId: FaustianCardId;
  readonly revealedSchemeCardIds: readonly FaustianCardId[];
}
export interface FaustianCommunityInvestigatedEventV1 {
  readonly type: "faustian_community_investigated";
  readonly version: 1;
  readonly data: FaustianCommunityInvestigatedDataV1;
}

export interface FaustianCommunityBlackmailedDataV1 {
  readonly communityId: FaustianCommunityId;
  readonly drawnCardId: FaustianCardId;
}
export interface FaustianCommunityBlackmailedEventV1 {
  readonly type: "faustian_community_blackmailed";
  readonly version: 1;
  readonly data: FaustianCommunityBlackmailedDataV1;
}

export interface FaustianAccompliceDirectedDataV1 {
  readonly accompliceCardId: FaustianCardId;
  readonly sourceCommunityId: FaustianCommunityId;
  readonly destinationCommunityId: FaustianCommunityId;
  readonly revealedSchemeCardIds: readonly FaustianCardId[];
  readonly returnedSchemeCardIds: readonly FaustianCardId[];
}
export interface FaustianAccompliceDirectedEventV1 {
  readonly type: "faustian_accomplice_directed";
  readonly version: 1;
  readonly data: FaustianAccompliceDirectedDataV1;
}

export interface FaustianPawnDisruptedDataV1 {
  readonly communityId: FaustianCommunityId;
  readonly accompliceCardId: FaustianCardId;
}
export interface FaustianPawnDisruptedEventV1 {
  readonly type: "faustian_pawn_disrupted";
  readonly version: 1;
  readonly data: FaustianPawnDisruptedDataV1;
}

export type FaustianEvent =
  | FaustianCommunityInvestigatedEventV1
  | FaustianCommunityBlackmailedEventV1
  | FaustianAccompliceDirectedEventV1
  | FaustianPawnDisruptedEventV1;

export interface SorcererInitializedDataV1 {
  readonly arrangementId: SorcererArrangementId;
  readonly sorcerer: SorcererState;
}
export interface SorcererInitializedEventV1 {
  readonly type: "sorcerer_initialized";
  readonly version: 1;
  readonly data: SorcererInitializedDataV1;
}

export type SorcererPersonnelDestinationAuditV1 =
  | { readonly kind: "student" }
  | { readonly kind: "researcher"; readonly positionId: SorcererResearchPositionId }
  | { readonly kind: "professor" }
  | { readonly kind: "librarian"; readonly school: MagicSchoolRef }
  | { readonly kind: "alchemist"; readonly recipe: SorcererRecipeRef }
  | { readonly kind: "campaign_academic"; readonly academicKindId: SorcererCampaignAcademicKindId };

export interface SorcererPersonnelRecruitedDataV1 {
  readonly denizenId: DenizenId;
  readonly denizenCreated: boolean;
  readonly denizenName: string;
  readonly destination: SorcererPersonnelDestinationAuditV1;
  readonly previousTowerOrder: readonly DenizenId[];
  readonly nextTowerOrder: readonly DenizenId[];
}
export interface SorcererPersonnelRecruitedEventV1 {
  readonly type: "sorcerer_personnel_recruited";
  readonly version: 1;
  readonly data: SorcererPersonnelRecruitedDataV1;
}

export type SorcererResearcherRefocusDestinationAuditV1 =
  | { readonly kind: "research_position"; readonly positionId: SorcererResearchPositionId }
  | { readonly kind: "professor" }
  | { readonly kind: "librarian"; readonly school: MagicSchoolRef }
  | { readonly kind: "alchemist"; readonly recipe: SorcererRecipeRef }
  | { readonly kind: "campaign_academic"; readonly academicKindId: SorcererCampaignAcademicKindId };

export interface SorcererResearcherRefocusedDataV1 {
  readonly denizenId: DenizenId;
  readonly previousPositionId: SorcererResearchPositionId;
  readonly destination: SorcererResearcherRefocusDestinationAuditV1;
  readonly previousTowerOrder: readonly DenizenId[];
  readonly nextTowerOrder: readonly DenizenId[];
}
export interface SorcererResearcherRefocusedEventV1 {
  readonly type: "sorcerer_researcher_refocused";
  readonly version: 1;
  readonly data: SorcererResearcherRefocusedDataV1;
}

export type SorcererStudentTutorDestinationAuditV1 =
  | { readonly kind: "researcher"; readonly positionId: SorcererResearchPositionId }
  | { readonly kind: "professor" }
  | { readonly kind: "librarian"; readonly school: MagicSchoolRef }
  | { readonly kind: "alchemist"; readonly recipe: SorcererRecipeRef }
  | { readonly kind: "campaign_academic"; readonly academicKindId: SorcererCampaignAcademicKindId };

export interface SorcererStudentTutoredDataV1 {
  readonly denizenId: DenizenId;
  readonly destination: SorcererStudentTutorDestinationAuditV1;
  readonly previousTowerOrder: readonly DenizenId[];
  readonly nextTowerOrder: readonly DenizenId[];
}
export interface SorcererStudentTutoredEventV1 {
  readonly type: "sorcerer_student_tutored";
  readonly version: 1;
  readonly data: SorcererStudentTutoredDataV1;
}

export interface SorcererTowerRearrangedDataV1 {
  readonly previousTowerOrder: readonly DenizenId[];
  readonly nextTowerOrder: readonly DenizenId[];
}
export interface SorcererTowerRearrangedEventV1 {
  readonly type: "sorcerer_tower_rearranged";
  readonly version: 1;
  readonly data: SorcererTowerRearrangedDataV1;
}

export interface SorcererResearcherOperationalThisMonthChangedDataV1 {
  readonly denizenId: DenizenId;
  readonly previousOperationalThisMonth: boolean;
  readonly operationalThisMonth: boolean;
}
export interface SorcererResearcherOperationalThisMonthChangedEventV1 {
  readonly type: "sorcerer_researcher_operational_this_month_changed";
  readonly version: 1;
  readonly data: SorcererResearcherOperationalThisMonthChangedDataV1;
}

export type SorcererKnowledgePoolIdV1 = "researchOrigin" | "other" | "nextMonthResearchOrigin";

export interface SorcererKnowledgeAdjustedDataV1 {
  readonly pool: SorcererKnowledgePoolIdV1;
  readonly previousAmount: number;
  readonly amount: number;
}
export interface SorcererKnowledgeAdjustedEventV1 {
  readonly type: "sorcerer_knowledge_adjusted";
  readonly version: 1;
  readonly data: SorcererKnowledgeAdjustedDataV1;
}

export interface SorcererArchivesOpenChangedDataV1 {
  readonly previousArchivesOpen: boolean;
  readonly archivesOpen: boolean;
}
export interface SorcererArchivesOpenChangedEventV1 {
  readonly type: "sorcerer_archives_open_changed";
  readonly version: 1;
  readonly data: SorcererArchivesOpenChangedDataV1;
}

export type SorcererTowerMagicConsumableItemAuditV1 =
  | { readonly kind: "tome"; readonly school: MagicSchoolRef }
  | { readonly kind: "reagent"; readonly reagentId: SorcererSourceReagentId };

export type SorcererTowerMagicConsumableDirectionV1 = "tower_to_wizard" | "wizard_to_tower";

export interface SorcererTowerMagicConsumableMovedDataV1 {
  readonly direction: SorcererTowerMagicConsumableDirectionV1;
  readonly wizardId: WizardId;
  readonly item: SorcererTowerMagicConsumableItemAuditV1;
  readonly amount: number;
  readonly previousSourceCount: number;
  readonly nextSourceCount: number;
  readonly previousDestinationCount: number;
  readonly nextDestinationCount: number;
}
export interface SorcererTowerMagicConsumableMovedEventV1 {
  readonly type: "sorcerer_tower_magic_consumable_moved";
  readonly version: 1;
  readonly data: SorcererTowerMagicConsumableMovedDataV1;
}

export interface SorcererResearcherProductionMultipliersSetDataV1 {
  readonly previousCurrent: number;
  readonly previousNextMonth: number;
  readonly current: number;
  readonly nextMonth: number;
}
export interface SorcererResearcherProductionMultipliersSetEventV1 {
  readonly type: "sorcerer_researcher_production_multipliers_set";
  readonly version: 1;
  readonly data: SorcererResearcherProductionMultipliersSetDataV1;
}

export interface SorcererLawsSetDataV1 {
  readonly previousActiveLawIds: readonly SorcererLawOfMagicId[];
  readonly previousUnrevealedLawIds: readonly SorcererLawOfMagicId[];
  readonly activeLawIds: readonly SorcererLawOfMagicId[];
  readonly unrevealedLawIds: readonly SorcererLawOfMagicId[];
}
export interface SorcererLawsSetEventV1 {
  readonly type: "sorcerer_laws_set";
  readonly version: 1;
  readonly data: SorcererLawsSetDataV1;
}

export type SorcererCampaignDefinitionAuditV1 =
  | { readonly kind: "school"; readonly definition: SorcererCampaignSchoolDefinition }
  | { readonly kind: "academic_kind"; readonly definition: SorcererCampaignAcademicKindDefinition }
  | { readonly kind: "recipe"; readonly definition: SorcererCampaignRecipeDefinition }
  | {
      readonly kind: "knowledge_method";
      readonly definition: SorcererCampaignKnowledgeMethodDefinition;
      readonly researchPositionId: SorcererResearchPositionId;
    };

export interface SorcererCampaignDefinitionCreatedDataV1 {
  readonly definition: SorcererCampaignDefinitionAuditV1;
}
export interface SorcererCampaignDefinitionCreatedEventV1 {
  readonly type: "sorcerer_campaign_definition_created";
  readonly version: 1;
  readonly data: SorcererCampaignDefinitionCreatedDataV1;
}

export interface SorcererCampaignDefinitionUpdatedDataV1 {
  readonly previous: SorcererCampaignDefinitionAuditV1;
  readonly definition: SorcererCampaignDefinitionAuditV1;
}
export interface SorcererCampaignDefinitionUpdatedEventV1 {
  readonly type: "sorcerer_campaign_definition_updated";
  readonly version: 1;
  readonly data: SorcererCampaignDefinitionUpdatedDataV1;
}

export interface SorcererArcanistAddedDataV1 {
  readonly denizenId: DenizenId;
  readonly denizenCreated: boolean;
  readonly denizenName: string;
  readonly arcanist: SorcererArcanist;
  readonly previousTowerOrder: readonly DenizenId[];
  readonly nextTowerOrder: readonly DenizenId[];
}
export interface SorcererArcanistAddedEventV1 {
  readonly type: "sorcerer_arcanist_added";
  readonly version: 1;
  readonly data: SorcererArcanistAddedDataV1;
}

export interface SorcererArcanistUpdatedDataV1 {
  readonly denizenId: DenizenId;
  readonly previousArcanist: SorcererArcanist;
  readonly arcanist: SorcererArcanist;
  readonly previousPlacement: SorcererArcanistPlacement;
  readonly placement: SorcererArcanistPlacement;
  readonly previousTowerOrder: readonly DenizenId[];
  readonly nextTowerOrder: readonly DenizenId[];
}
export interface SorcererArcanistUpdatedEventV1 {
  readonly type: "sorcerer_arcanist_updated";
  readonly version: 1;
  readonly data: SorcererArcanistUpdatedDataV1;
}

export interface SorcererConstructAddedDataV1 {
  readonly denizenId: DenizenId;
  readonly denizenName: string;
  readonly truthIds: readonly PowerfulDenizenTruthId[];
  readonly instructions: readonly SorcererConstructInstruction[];
}
export interface SorcererConstructAddedEventV1 {
  readonly type: "sorcerer_construct_added";
  readonly version: 1;
  readonly data: SorcererConstructAddedDataV1;
}

export interface SorcererConstructInstructionsSetDataV1 {
  readonly denizenId: DenizenId;
  readonly previousInstructions: readonly SorcererConstructInstruction[];
  readonly instructions: readonly SorcererConstructInstruction[];
}
export interface SorcererConstructInstructionsSetEventV1 {
  readonly type: "sorcerer_construct_instructions_set";
  readonly version: 1;
  readonly data: SorcererConstructInstructionsSetDataV1;
}

export interface SorcererInnovationAddedDataV1 {
  readonly innovation: SorcererInnovation;
}
export interface SorcererInnovationAddedEventV1 {
  readonly type: "sorcerer_innovation_added";
  readonly version: 1;
  readonly data: SorcererInnovationAddedDataV1;
}

export interface SorcererInnovationRevisedDataV1 {
  readonly innovationId: SorcererInnovationId;
  readonly previousSpellId: GrimoireSpellId;
  readonly previousText: string;
  readonly spellId: GrimoireSpellId;
  readonly text: string;
}
export interface SorcererInnovationRevisedEventV1 {
  readonly type: "sorcerer_innovation_revised";
  readonly version: 1;
  readonly data: SorcererInnovationRevisedDataV1;
}

export interface SorcererInnovationRemovedDataV1 {
  readonly innovation: SorcererInnovation;
}
export interface SorcererInnovationRemovedEventV1 {
  readonly type: "sorcerer_innovation_removed";
  readonly version: 1;
  readonly data: SorcererInnovationRemovedDataV1;
}

export type SorcererEvent =
  | SorcererInitializedEventV1
  | SorcererPersonnelRecruitedEventV1
  | SorcererResearcherRefocusedEventV1
  | SorcererStudentTutoredEventV1
  | SorcererTowerRearrangedEventV1
  | SorcererResearcherOperationalThisMonthChangedEventV1
  | SorcererKnowledgeAdjustedEventV1
  | SorcererArchivesOpenChangedEventV1
  | SorcererTowerMagicConsumableMovedEventV1
  | SorcererResearcherProductionMultipliersSetEventV1
  | SorcererLawsSetEventV1
  | SorcererCampaignDefinitionCreatedEventV1
  | SorcererCampaignDefinitionUpdatedEventV1
  | SorcererArcanistAddedEventV1
  | SorcererArcanistUpdatedEventV1
  | SorcererConstructAddedEventV1
  | SorcererConstructInstructionsSetEventV1
  | SorcererInnovationAddedEventV1
  | SorcererInnovationRevisedEventV1
  | SorcererInnovationRemovedEventV1;

export type LoreEntryAddedCollectionContextV1 =
  | {
      readonly kind: "source";
      readonly sourceCollectionId: SourceLoreCollectionId;
      readonly boundSubject: LoreSubjectRef;
    }
  | {
      readonly kind: "campaign";
      readonly collectionId: LoreCollectionId;
      readonly subject: LoreSubjectRef;
    };

export interface LoreEntryAddedDataV1 {
  readonly collection: LoreEntryAddedCollectionContextV1;
  readonly loreEntryId: LoreEntryId;
  readonly text: string;
  readonly collectionCreated: boolean;
}

export interface LoreEntryAddedEventV1 {
  readonly type: "lore_entry_added";
  readonly version: 1;
  readonly data: LoreEntryAddedDataV1;
}

export type LoreEntryRevisedTargetContextV1 =
  | {
      readonly kind: "source_entry";
      readonly sourceCollectionId: SourceLoreCollectionId;
      readonly sourceEntryId: SourceLoreEntryId;
      readonly boundSubject: LoreSubjectRef;
    }
  | {
      readonly kind: "source_addition";
      readonly sourceCollectionId: SourceLoreCollectionId;
      readonly loreEntryId: LoreEntryId;
      readonly boundSubject: LoreSubjectRef;
    }
  | {
      readonly kind: "campaign_entry";
      readonly collectionId: LoreCollectionId;
      readonly loreEntryId: LoreEntryId;
      readonly subject: LoreSubjectRef;
    };

export interface LoreEntryRevisedDataV1 {
  readonly target: LoreEntryRevisedTargetContextV1;
  readonly previousText: string;
  readonly text: string;
  readonly sourceCollectionBound: boolean;
}

export interface LoreEntryRevisedEventV1 {
  readonly type: "lore_entry_revised";
  readonly version: 1;
  readonly data: LoreEntryRevisedDataV1;
}

export type LoreEvent = LoreEntryAddedEventV1 | LoreEntryRevisedEventV1;

export type CampaignEvent =
  | InfrastructureEvent
  | SetupEvent
  | PlayEvent
  | WorldEvent
  | HierophantEvent
  | MarinerEvent
  | NecromancerEvent
  | FaustianEvent
  | SharedStateEvent
  | SorcererEvent
  | LoreEvent;

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
