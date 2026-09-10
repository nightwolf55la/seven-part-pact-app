export type { Brand } from "./brand";

export type { CampaignId, CommandId, CheckpointId, PlayerId, WizardId, AllocationId, EngagementId, DenizenId, IsleId, PlaceId, CompanionRelationshipId, TreasureId, CampaignPowerfulDenizenTaxonomyId, PowerfulDenizenMethodEntryId, PowerfulDenizenTruthId } from "./ids";
export {
  isValidCampaignId,
  parseCampaignId,
  isValidLiveCommandId,
  parseLiveCommandId,
  isValidCheckpointId,
  parseCheckpointId,
  isValidPlayerId,
  parsePlayerId,
  isValidWizardId,
  parseWizardId,
  isValidAllocationId,
  parseAllocationId,
  generateAllocationId,
  isValidEngagementId,
  parseEngagementId,
  generateEngagementId,
  isValidDenizenId,
  parseDenizenId,
  isValidIsleId,
  parseIsleId,
  isValidPlaceId,
  parsePlaceId,
  isValidCompanionRelationshipId,
  parseCompanionRelationshipId,
  isValidTreasureId,
  parseTreasureId,
  isValidCampaignPowerfulDenizenTaxonomyId,
  parseCampaignPowerfulDenizenTaxonomyId,
  isValidPowerfulDenizenMethodEntryId,
  parsePowerfulDenizenMethodEntryId,
  isValidPowerfulDenizenTruthId,
  parsePowerfulDenizenTruthId,
} from "./ids";

export type {
  MonthOrdinal,
  MonthId,
  MonthDirection,
  MonthDisplayName,
  MonthOfYearIndex,
  SeasonId,
} from "./calendar";
export {
  MONTH_IDS,
  MONTH_DISPLAY_NAMES,
  MONTH_COUNT,
  INITIAL_MONTH_ORDINAL,
  monthOfYearIndexFromOrdinal,
  monthIdFromOrdinal,
  displayNameFromMonthId,
  displayNameFromOrdinal,
  seasonIdFromOrdinal,
  advanceOrdinal,
} from "./calendar";

export type { CampaignCommandType } from "./commands";
export {
  CAMPAIGN_COMMAND_TYPES,
  isLogicalStateCommandType,
  isHistoryNavigationCommandType,
} from "./commands";

export type {
  UndoAppliedDataV1,
  UndoAppliedEventV1,
  RedoAppliedDataV1,
  RedoAppliedEventV1,
  CheckpointRestoredDataV1,
  CheckpointRestoredEventV1,
  BackupImportedDataV1,
  BackupImportedEventV1,
  PlayerAddedEventV1,
  PlayerRenamedEventV1,
  PlayerRemovedEventV1,
  CampaignAgeChangedEventV1,
  FacilitatorAssignmentChangedEventV1,
  WizardCreatedEventV1,
  WizardNameChangedEventV1,
  WizardPortrayalChangedEventV1,
  PactSeatWizardChangedEventV1,
  PactSeatStatusChangedEventV1,
  WatcherAssignmentChangedEventV1,
  SetupMonthChangedEventV1,
  SetupOrreryPositionChangedEventV1,
  BeginPlayDataV1,
  BeginPlayEventV1,
  PhaseAdvancedEventV1,
  PhaseAdvancedEventV2,
  TimeAllocationScheduledEventV1,
  EngagementTargetChangedEventV1,
  WizardmootAttendanceAdjustedEventV1,
  MeetingCompletedEventV1,
  MonthBegunEventV1,
  WizardCharacterUpdatedEventV1,
  WizardCharacterUpdatedEventV2,
  EngagementTargetChangedEventV2,
  EngagementRescheduledEventV1,
  EngagementRescheduledEventV2,
  InfrastructureEvent,
  PhaseAdvancedEvent,
  WorldEvent,
  SharedStateEvent,
  DenizenCreatedDataV1,
  DenizenCreatedEventV1,
  DenizenUpdatedDataV1,
  DenizenUpdatedEventV1,
  IsleCreatedDataV1,
  IsleCreatedEventV1,
  IsleUpdatedDataV1,
  IsleUpdatedEventV1,
  PlaceCreatedDataV1,
  PlaceCreatedEventV1,
  PlaceUpdatedDataV1,
  PlaceUpdatedEventV1,
  WizardHomeIsleChangedDataV1,
  WizardHomeIsleChangedEventV1,
  WizardSanctumChangedDataV1,
  WizardSanctumChangedEventV1,
  WizardCompanionChangedDataV1,
  WizardCompanionChangedEventV1,
  CompanionDescriptionChangedDataV1,
  CompanionDescriptionChangedEventV1,
  HierophantInitializedDataV1,
  HierophantInitializedEventV1,
  TempleResourcesAdjustedDataV1,
  TempleResourcesAdjustedEventV1,
  HierophantEvent,
  MarinerEvent,
  MarinerInitializedDataV1,
  MarinerInitializedEventV1,
  MarinerShipChangedEventV1,
  MarinerSeaLawsChangedEventV1,
  MarinerRouteOccupancyChangedEventV1,
  MarinerSeaStormCountChangedEventV1,
  MarinerIsleMarketChangedEventV1,
  MarinerIsleRavageChangedEventV1,
  MarinerBeastAddedEventV1,
  MarinerBeastUpdatedEventV1,
  MarinerBeastRemovedEventV1,
  NecromancerEvent,
  NecromancerInitializedDataV1,
  NecromancerInitializedEventV1,
  NecromancerDepthChangedEventV1,
  NecromancerLawsChangedEventV1,
  NecromancerGateStatusChangedEventV1,
  NecromancerSoulCountChangedEventV1,
  NecromancerSoulsMovedEventV1,
  NecromancerFoeAddedEventV1,
  NecromancerFoeUpdatedEventV1,
  NecromancerFoeRemovedEventV1,
  NecromancerAllyAddedEventV1,
  NecromancerAllyUpdatedEventV1,
  NecromancerAllyRemovedEventV1,
  NecromancerGhoulCallerAddedEventV1,
  NecromancerGhoulCallerUpdatedEventV1,
  NecromancerGhoulCallerRemovedEventV1,
  NecromancerCampaignGateCreatedEventV1,
  NecromancerCampaignGateUpdatedEventV1,
  NecromancerCampaignPathSpaceCreatedEventV1,
  NecromancerCampaignPathSpaceRemovedEventV1,
  NecromancerStepAddedEventV1,
  NecromancerStepRemovedEventV1,
  CampaignEvent,
} from "./events";

export type { RulesetRef } from "./ruleset";
export {
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  CURRENT_RULESET,
} from "./ruleset";

export type {
  CampaignRevision,
  CampaignRuleset,
  CampaignStateV1,
  CampaignStateV2,
  CampaignStateV3,
  CampaignStateV4,
  CampaignStateV5,
  CampaignPlayer,
  LegacyCampaignWizard,
  CampaignWizardV4,
  CampaignWizard,
  CampaignWizardV5,
  WizardElementScores,
  WizardCompanionDescriptions,
  WizardCharacterDataV4,
  WizardCharacterData,
  WizardCharacterDataV5,
  PactSeatState,
  PactSeatStatus,
  LunarPhase,
  MonthlyPlayStateV4,
  MonthlyPlayState,
  MonthlyPlayStateV5,
  PlayLifecycleV4,
  PlayLifecycleV5,
  SetupLifecycle,
  PlayLifecycle,
  CampaignLifecycleV4,
  CampaignLifecycleV5,
  CampaignLifecycle,
  CurrentCampaignState,
  AnyCampaignState,
  PactFragmentCondition,
  PactFragmentCustody,
  PactFragmentOperationalState,
  PactFragmentOperationalMap,
} from "./campaign-state";
export {
  CURRENT_STATE_SCHEMA_VERSION,
  LUNAR_PHASES,
  BLANK_WIZARD_CHARACTER,
  BLANK_WIZARD_CHARACTER_V4,
  BLANK_WIZARD_CHARACTER_V5,
  PACT_FRAGMENT_CONDITIONS,
  EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
  initializePactFragmentOperationalState,
} from "./campaign-state";

export type { WizardCharacterPatch } from "./wizard-character";
export { normalizeWizardCharacterPatch, applyWizardCharacterPatch } from "./wizard-character";

export type { PactSeatId } from "./pact-seats";
export { PACT_SEAT_IDS, PACT_SEAT_COUNT, pactSeatDisplayName, isValidPactSeatId } from "./pact-seats";

export type { AgeDefinitionId } from "./ages";
export { AGE_DEFINITION_IDS, ageDisplayName, isValidAgeDefinitionId } from "./ages";

export { migrateToCurrentVersion, loadHistoricalState, isHistoricalStateLogicallyEqual, isSupportedSchemaVersion, SUPPORTED_STATE_SCHEMA_VERSIONS } from "./state-migration";

export type { DomainErrorCode } from "./errors";
export { DomainError } from "./errors";

export { validateCampaignState, validateAnyCampaignState, validateCampaignStateV5Candidate } from "./state-validation";

export { initialCampaignState } from "./initial-state";

export type { TransitionResult } from "./m3-transitions";
export {
  applyAddPlayer,
  applyRenamePlayer,
  applyRemovePlayer,
  applySetCampaignAge,
  applySetFacilitator,
  applyCreateWizard,
  applyRenameWizard,
  applySetWizardPortrayal,
  applySetPactSeatWizard,
  applySetPactSeatStatus,
  applySetWatcher,
  applySetSetupMonth,
  applySetSetupOrreryPosition,
  applyUpdateWizardCharacter,
} from "./m3-transitions";

export type {
  UndoTransitionInput,
  RedoTransitionInput,
  HistoryNavigationResult,
  UndoCoherenceInput,
  RedoCoherenceInput,
} from "./undo-redo";
export {
  deriveUndoTransition,
  deriveRedoTransition,
  validateUndoTransactionCoherence,
  validateRedoTransactionCoherence,
} from "./undo-redo";

export type { IdempotencyMatchResult } from "./command-ids";
export {
  syntheticMigrationCommandId,
  isSyntheticMigrationCommandId,
  migrationCommandFingerprint,
  undoFingerprint,
  redoFingerprint,
  checkpointRestoreFingerprint,
  backupImportFingerprint,
  addPlayerFingerprint,
  renamePlayerFingerprint,
  removePlayerFingerprint,
  setCampaignAgeFingerprint,
  setFacilitatorFingerprint,
  createWizardFingerprint,
  renameWizardFingerprint,
  setWizardPortrayalFingerprint,
  setPactSeatWizardFingerprint,
  setPactSeatStatusFingerprint,
  setWatcherFingerprint,
  setSetupMonthFingerprint,
  setSetupOrreryPositionFingerprint,
  updateWizardCharacterFingerprint,
  beginPlayFingerprint,
  advancePhaseFingerprint,
  normalizeWarningKeys,
  scheduleTimeFingerprint,
  setEngagementTargetFingerprint,
  rescheduleTimeFingerprint,
  spendManualTimeFingerprint,
  wasteTimeFingerprint,
  spendOrreryTimeFingerprint,
  commitTimeToEngagementFingerprint,
  resolveEngagementFingerprint,
  rescheduleEngagementFingerprint,
  adjustWizardmootAttendanceFingerprint,
  completeMeetingFingerprint,
  beginNextMonthFingerprint,
  createDenizenFingerprint,
  updateDenizenFingerprint,
  createIsleFingerprint,
  updateIsleFingerprint,
  createPlaceFingerprint,
  updatePlaceFingerprint,
  setWizardHomeIsleFingerprint,
  setWizardSanctumFingerprint,
  setWizardCompanionFingerprint,
  updateCompanionDescriptionFingerprint,
  initializeHierophantFingerprint,
  adjustTempleResourcesFingerprint,
  createTempleFingerprint,
  updateTempleFingerprint,
  setTempleHolidayFingerprint,
  setSelectedFlameLawsFingerprint,
  addSupplicantFingerprint,
  updateSupplicantFingerprint,
  removeSupplicantFingerprint,
  addProphetFingerprint,
  updateProphetFingerprint,
  removeProphetFingerprint,
  establishCultFingerprint,
  updateCultFingerprint,
  removeCultFingerprint,
  addCultDogmaFingerprint,
  updateCultDogmaFingerprint,
  removeCultDogmaFingerprint,
  createCampaignClassFingerprint,
  updateCampaignClassFingerprint,
  createCampaignDoctrineFingerprint,
  updateCampaignDoctrineFingerprint,
  initializeMarinerFingerprint,
  setMarinerShipFingerprint,
  setSelectedSeaLawsFingerprint,
  setMarinerRouteOccupancyFingerprint,
  setMarinerSeaStormCountFingerprint,
  setMarinerIsleMarketFingerprint,
  setMarinerIsleRavageFingerprint,
  addMarinerBeastFingerprint,
  updateMarinerBeastFingerprint,
  removeMarinerBeastFingerprint,
  initializeNecromancerFingerprint,
  setNecromancerDepthFingerprint,
  setSelectedDeathLawsFingerprint,
  setNecromancerGateStatusFingerprint,
  setNecromancerSoulCountFingerprint,
  moveNecromancerSoulsFingerprint,
  addNecromancerFoeFingerprint,
  updateNecromancerFoeFingerprint,
  removeNecromancerFoeFingerprint,
  escapeNecromancerWizardFoeFingerprint,
  addNecromancerWizardFoeTruthFingerprint,
  updateNecromancerWizardFoeTruthFingerprint,
  removeNecromancerWizardFoeTruthFingerprint,
  addNecromancerWizardTraversalFingerprint,
  updateNecromancerWizardTraversalFingerprint,
  removeNecromancerWizardTraversalFingerprint,
  addNecromancerAllyFingerprint,
  updateNecromancerAllyFingerprint,
  removeNecromancerAllyFingerprint,
  addNecromancerGhoulCallerFingerprint,
  updateNecromancerGhoulCallerFingerprint,
  removeNecromancerGhoulCallerFingerprint,
  createNecromancerCampaignGateFingerprint,
  updateNecromancerCampaignGateFingerprint,
  createNecromancerCampaignPathSpaceFingerprint,
  removeNecromancerCampaignPathSpaceFingerprint,
  addNecromancerStepFingerprint,
  removeNecromancerStepFingerprint,
  setWizardMortalityStateFingerprint,
  setDenizenMortalityStateFingerprint,
  createPowerfulDenizenProfileFingerprint,
  removePowerfulDenizenProfileFingerprint,
  setPowerfulDenizenTaxonomiesFingerprint,
  setPowerfulDenizenStatusFingerprint,
  setPowerfulDenizenGoalFingerprint,
  addPowerfulDenizenMethodFingerprint,
  updatePowerfulDenizenMethodFingerprint,
  removePowerfulDenizenMethodFingerprint,
  addPowerfulDenizenTruthFingerprint,
  updatePowerfulDenizenTruthFingerprint,
  removePowerfulDenizenTruthFingerprint,
  createCampaignPowerfulDenizenTaxonomyFingerprint,
  updateCampaignPowerfulDenizenTaxonomyFingerprint,
  removeCampaignPowerfulDenizenTaxonomyFingerprint,
  createTreasureFingerprint,
  updateTreasureDetailsFingerprint,
  updateTreasureStateFingerprint,
  updatePactFragmentOperationalStateFingerprint,
  matchCommandIdempotency,
  normalizeCheckpointLabel,
  validateCheckpointLabel,
} from "./command-ids";

export type {
  RevisionRecord,
  EventRecord,
  SnapshotRecord,
  VerificationResult,
  CampaignDocument,
  MigrationVerificationInput,
  SerializableCampaignState,
} from "./verification";
export {
  verifyMigrationInvariants,
} from "./verification";

export type { ActivityEntry } from "./activity";
export {
  mapEventToActivityEntry,
  describeActivityEntry,
} from "./activity";

export type {
  CampaignHistoryControlV1,
  HistoryControlValidationInput,
  RevisionCommandInfo,
  ReplayEventInfo,
  HistoryReplayInput,
  HistoryReplayResult,
  HistoryControlVerificationInput,
  InitializationRevisionInfo,
  InitializationEventInfo,
  InitializationSnapshotInfo,
  HistoryControlInitInput,
  HistoryControlInitResult,
} from "./history-control";
export {
  CURRENT_HISTORY_CONTROL_VERSION,
  validateHistoryControlStructure,
  replayHistoryControl,
  verifyHistoryControl,
  analyzeHistoryControlInitialization,
} from "./history-control";

export { statesDeepEqual, assertPortableCampaignState } from "./state-equality";
export type { PersistableCampaignState } from "./state-equality";

export type {
  CampaignCheckpointV1,
  CheckpointVerificationInput,
  CheckpointCollectionVerificationInput,
  RestoreRevisionVerificationInput,
} from "./checkpoints";
export {
  CURRENT_CHECKPOINT_VERSION,
  verifyCheckpoint,
  verifyCheckpointCollection,
  verifyCheckpointRestoreRevision,
} from "./checkpoints";

export type {
  CampaignBackupV1,
  CampaignBackupProvenanceV1,
  CampaignBackupIntegrityV1,
  BackupIntegrityPayload,
  BackupValidationError,
  ValidatedBackupV1,
  IntegrityVerifiedBackupV1,
  ExportSourceData,
} from "./backup";
export {
  BACKUP_FORMAT_TYPE,
  CURRENT_BACKUP_FORMAT_VERSION,
  MAX_PORTABLE_BACKUP_BYTES,
  buildIntegrityPayload,
  buildIntegrityPayloadFromParts,
  computeBackupPayloadDigest,
  parseAndValidateBackupStructure,
  validateBackupState,
  validateBackupCompatibility,
  fullyValidateBackup,
  parseAndVerifyBackupIntegrityForFingerprint,
  buildExportBackup,
} from "./backup";

export {
  canonicalJsonStringify,
  sha256Hex,
  computeDigestFromCanonicalJson,
  CanonicalJsonError,
} from "./canonical-json";

export type {
  DeletionPhase,
  DeletionOperation,
  CampaignOwnedChildCollection,
} from "./campaign-deletion";
export {
  DELETION_BATCH_SIZE,
  DELETION_CONFIRMATION_STRING,
  DELETION_PHASE_ORDER,
  CAMPAIGN_OWNED_CHILD_COLLECTIONS,
  validateDeletionRequest,
  validateCampaignIdentityMatch,
  assertNotDeleting,
  nextDeletionPhase,
  isDeletionChildCleanupPhase,
} from "./campaign-deletion";

export type { BackupImportRevisionVerificationInput } from "./backup-verification";
export {
  verifyBackupImportRevisionStructure,
  verifyBackupImportRevisionDigest,
} from "./backup-verification";

export type {
  DeletionPersistenceAdapter,
  RequestDeletionResult,
  BatchResult,
  LifecycleStatus,
} from "./deletion-orchestrator";
export {
  requestDeletion,
  processBatch,
  resolveLifecycle,
} from "./deletion-orchestrator";

// --- Orrery ---

export type {
  CentidegreePosition,
  MovablePlanetId,
  CelestialBodyId,
  HouseIndex,
  PlanetDefinition,
  SetupOrreryState,
  OrreryState,
  OrreryMoveDirection,
  BodyHouseOccupancy,
  Conjunction,
} from "./orrery";
export {
  FULL_CIRCLE_CENTIDEGREES,
  HOUSE_COUNT,
  HOUSE_WIDTH_CENTIDEGREES,
  MOVABLE_PLANET_IDS,
  CELESTIAL_BODY_IDS,
  HOUSE_NAMES,
  PLANET_DEFINITIONS,
  isValidCentidegreePosition,
  asCentidegreePosition,
  houseIndexFromCentidegrees,
  sunPositionFromMonthOrdinal,
  arcStartAndEnd,
  housesOccupiedByArc,
  housesOccupiedByBody,
  sunHouse,
  computeAllOccupancies,
  computeConjunctions,
  advancePlanetPosition,
  movePlanetByArc,
  legalPositionsForPlanet,
  isLegalPosition,
  isCompleteOrrery,
  emptySetupOrrery,
  advanceAllPlanets,
} from "./orrery";

// --- Participants ---

export type { WizardParticipantRef, TimeParticipantRef } from "./participants";

// --- Time Model ---

export type {
  AllocationResolution,
  CompanionDestination,
  MapIsleSanctumDestination,
  FamiliarDestination,
  OrreryDestination,
  MeetingDestination,
  DomainDestination,
  EngagementDestination,
  SpecialUseDestination,
  TimeDestination,
  TimeDestinationKind,
  TimeAllocation,
  TimeParticipant,
} from "./time-model";
export { ALLOCATION_RESOLUTIONS, TIME_DESTINATION_KINDS } from "./time-model";

// --- Engagement ---

export type {
  EngagementResolution,
  WizardTarget,
  SelfTarget,
  FamiliarTarget,
  NamedCharacterTarget,
  DenizenTarget,
  EngagementTargetV4,
  EngagementTarget,
  EngagementTargetV5,
  EngagementTargetKind,
  EngagementTargetKindV4,
  EngagementTargetKindV5,
  EngagementRecordV4,
  EngagementRecord,
  EngagementRecordV5,
} from "./engagement";
export { ENGAGEMENT_RESOLUTIONS, ENGAGEMENT_TARGET_KINDS, ENGAGEMENT_TARGET_KINDS_V4, ENGAGEMENT_TARGET_KINDS_V5 } from "./engagement";

// --- Wizardmoot ---

export type {
  WizardmootAttendance,
  WizardmootHistoryEntry,
} from "./wizardmoot";

// --- Setup Readiness ---

export type {
  SetupReadinessIssueCode,
  SetupReadinessIssue,
  SetupReadinessResult,
} from "./setup-readiness";
export { evaluateSetupReadiness } from "./setup-readiness";

// --- Age Setup ---

export type {
  AgeSetupIssueCode,
  AgeSetupIssue,
  AgeSetupResult,
} from "./age-setup";
export { evaluateAgeSetup } from "./age-setup";

// --- Begin Play ---

export type {
  WizardInitIds, BeginPlayInput,
} from "./begin-play";
export { applyBeginPlay, collectEligibleWizardIds, buildTimeParticipant, buildEngagement } from "./begin-play";

// --- Play Transitions (C3/C4/C5A) ---

export type { AdvancePhaseInput, AdvancePhaseResult, PhaseTransitionWarning, ScheduleTimeInput, SetEngagementTargetInput, RescheduleTimeInput, SpendManualTimeInput, WasteTimeInput, SpendOrreryTimeInput, CommitTimeToEngagementInput, ResolveEngagementInput, RescheduleEngagementInput, AdjustWizardmootAttendanceInput, CompleteMeetingInput, BeginNextMonthInput, BeginNextMonthResult } from "./play-transitions";
export {
  applyAdvancePhase,
  applyScheduleTime,
  applySetEngagementTarget,
  applyRescheduleTime,
  applySpendManualTime,
  applyWasteTime,
  applySpendOrreryTime,
  applyCommitTimeToEngagement,
  applyResolveEngagement,
  applyRescheduleEngagement,
  applyAdjustWizardmootAttendance,
  applyCompleteMeeting,
  applyBeginNextMonth,
  computePhaseTransitionWarnings,
} from "./play-transitions";

// --- Shared World (V5 candidate) ---

export type {
  ElementId,
  MortalityState,
  WizardOrDenizenSubjectRef,
  Denizen,
  Isle,
  UnspecifiedPlacement,
  OnIslePlacement,
  MobilePlacement,
  WorldPlacePlacement,
  WorldPlace,
  CompanionRelationshipStatus,
  CompanionRelationship,
  TreasureCondition,
  TreasureCustody,
  Treasure,
  SharedWorldState,
} from "./shared-world";
export { ELEMENT_IDS, MORTALITY_STATES, TREASURE_CONDITIONS, EMPTY_SHARED_WORLD_STATE } from "./shared-world";

export type {
  BuiltinPowerfulDenizenTaxonomyId,
  PowerfulDenizenBuiltinTaxonomyDefinition,
  PowerfulDenizenTaxonomyRef,
  CampaignPowerfulDenizenTaxonomy,
  PowerfulDenizenStandardStatus,
  PowerfulDenizenStatus,
  StandardPowerfulDenizenMethod,
  PowerfulDenizenMethodDefinition,
  PowerfulDenizenEntryOrigin,
  PowerfulDenizenMethodEntry,
  PowerfulDenizenTruthEntry,
  PowerfulDenizenProfile,
} from "./powerful-denizen";
export {
  POWERFUL_DENIZEN_BUILTIN_TAXONOMY_IDS,
  POWERFUL_DENIZEN_BUILTIN_TAXONOMY_DEFINITIONS,
  POWERFUL_DENIZEN_STANDARD_STATUS_VALUES,
  STANDARD_POWERFUL_DENIZEN_METHODS,
  isValidBuiltinPowerfulDenizenTaxonomyId,
  isValidPowerfulDenizenStandardStatus,
  isValidStandardPowerfulDenizenMethod,
  powerfulDenizenTaxonomyRefKey,
} from "./powerful-denizen";

// --- V5 Reference Validation (candidate, not active) ---

export { validateV5WorldReferenceIntegrity } from "./v5-reference-validation";

// --- V5 World Subject Transitions (candidate, not active) ---

export type {
  ExpectedFieldChange,
  DenizenTransitionResult,
  IsleTransitionResult,
  PlaceTransitionResult,
  WorldSubjectTransitionResult,
  CandidateWorldSubjectEvent,
  CreateDenizenInput,
  UpdateDenizenFields,
  CreateIsleInput,
  UpdateIsleFields,
  CreatePlaceInput,
  UpdatePlaceFields,
} from "./world-subject-transitions";
export {
  applyCreateDenizenV5Candidate,
  applyUpdateDenizenV5Candidate,
  applyCreateIsleV5Candidate,
  applyUpdateIsleV5Candidate,
  applyCreatePlaceV5Candidate,
  applyUpdatePlaceV5Candidate,
} from "./world-subject-transitions";

export type {
  SharedStateTransitionResult,
  CreatePowerfulDenizenProfileInput,
  AddPowerfulDenizenMethodInput,
  AddPowerfulDenizenTruthInput,
  CreateCampaignPowerfulDenizenTaxonomyInput,
  UpdateCampaignPowerfulDenizenTaxonomyFields,
  CreateTreasureInput,
  UpdateTreasureDetailsFields,
} from "./shared-state-transitions";
export {
  applySetWizardMortalityState,
  applySetDenizenMortalityState,
  applyCreatePowerfulDenizenProfile,
  applyRemovePowerfulDenizenProfile,
  applySetPowerfulDenizenTaxonomies,
  applySetPowerfulDenizenStatus,
  applySetPowerfulDenizenGoal,
  applyAddPowerfulDenizenMethod,
  applyUpdatePowerfulDenizenMethod,
  applyRemovePowerfulDenizenMethod,
  applyAddPowerfulDenizenTruth,
  applyUpdatePowerfulDenizenTruth,
  applyRemovePowerfulDenizenTruth,
  applyCreateCampaignPowerfulDenizenTaxonomy,
  applyUpdateCampaignPowerfulDenizenTaxonomy,
  applyRemoveCampaignPowerfulDenizenTaxonomy,
  applyCreateTreasure,
  applyUpdateTreasureDetails,
  applyUpdateTreasureState,
  applyUpdatePactFragmentOperationalState,
} from "./shared-state-transitions";

// --- V5 World Relationship Transitions (candidate, not active) ---

export type {
  RelationshipTransitionResult,
  WizardAssociationTransitionResult,
  CompanionTransitionResult,
  CandidateRelationshipEvent,
  SetWizardCompanionInput,
  UpdateCompanionDescriptionInput,
} from "./world-relationship-transitions";
export {
  applySetWizardHomeIsleV5Candidate,
  applySetWizardSanctumV5Candidate,
  applySetWizardCompanionV5Candidate,
  applyUpdateCompanionDescriptionV5Candidate,
} from "./world-relationship-transitions";

export type {
  HierophantFlameLawId,
  HierophantFlameLawDefinition,
  HierophantStartingTempleId,
  HierophantTempleId,
  HierophantTempleKind,
  HierophantStartingTempleDefinition,
  OrdinaryHierophantStartingTempleDefinition,
  HestarHierophantStartingTempleDefinition,
  HierophantBuiltinClassId,
  HierophantBuiltinClassDefinition,
  HierophantBuiltinDoctrineId,
  HierophantBuiltinBlasphemyId,
  HierophantBuiltinDoctrineDefinition,
  HierophantCampaignTempleId,
  HierophantDogmaCategory,
  HierophantBuiltinDogmaCategory,
  HierophantBuiltinDogmaId,
  HierophantBuiltinDogmaDefinition,
  HierophantLiturgicalHolidayId,
  HierophantLiturgicalObservance,
  HierophantLiturgicalHolidayDefinition,
  HierophantOrdinaryStartingTempleId,
} from "./hierophant-catalogs";
export {
  HIEROPHANT_FLAME_LAW_IDS,
  HIEROPHANT_FLAME_LAW_DEFINITIONS,
  hierophantFlameLawApplicationLabel,
  hierophantFlameLawDisplayName,
  hierophantFlameLawText,
  isValidHierophantFlameLawId,
  HIEROPHANT_BUILTIN_CLASS_IDS,
  HIEROPHANT_BUILTIN_CLASS_DEFINITIONS,
  isValidHierophantBuiltinClassId,
  HIEROPHANT_BUILTIN_DOCTRINE_IDS,
  HIEROPHANT_BUILTIN_BLASPHEMY_IDS,
  HIEROPHANT_BUILTIN_DOCTRINE_DEFINITIONS,
  isValidHierophantBuiltinDoctrineId,
  isValidHierophantBuiltinBlasphemyId,
  hierophantBuiltinDoctrineDefinition,
  HIEROPHANT_STARTING_TEMPLE_IDS,
  HIEROPHANT_STARTING_TEMPLE_DEFINITIONS,
  hierophantStartingTempleDisplayName,
  isValidHierophantStartingTempleId,
  isValidHierophantCampaignTempleId,
  isValidHierophantTempleId,
  isValidHierophantCampaignClassId,
  isValidHierophantCampaignDoctrineId,
  isValidHierophantCampaignBlasphemyId,
  isValidHierophantDogmaEntryId,
  hierophantStartingTempleDefinition,
  HIEROPHANT_DOGMA_CATEGORIES,
  isValidHierophantDogmaCategory,
  HIEROPHANT_BUILTIN_DOGMA_IDS,
  HIEROPHANT_BUILTIN_DOGMA_DEFINITIONS,
  isValidHierophantBuiltinDogmaId,
  HIEROPHANT_CLASS_ENJOYED_DOGMA_CATEGORIES,
  HIEROPHANT_LITURGICAL_HOLIDAY_IDS,
  HIEROPHANT_LITURGICAL_HOLIDAY_DEFINITIONS,
  isValidHierophantLiturgicalHolidayId,
  hierophantLiturgicalHolidayDefinition,
} from "./hierophant-catalogs";

export type {
  HierophantCampaignClassId,
  HierophantClassId,
  HierophantCampaignDoctrineId,
  HierophantDoctrineId,
  HierophantCampaignBlasphemyId,
  HierophantBlasphemyId,
  HierophantDogmaEntryId,
  HierophantTempleStatus,
  OrdinaryTempleDoctrineState,
  OrdinaryHierophantTemple,
  HestarHierophantTemple,
  HierophantTemple,
  HierophantCampaignClass,
  HierophantCampaignBlasphemy,
  HierophantCampaignDoctrine,
  HierophantTempleArea,
  HierophantSupplicantHost,
  HierophantSupplicant,
  HierophantProphetDisposition,
  HierophantProphetHost,
  HierophantProphet,
  HierophantCultDogma,
  HierophantCult,
  HierophantState,
} from "./hierophant-state";
export { EMPTY_HIEROPHANT_STATE } from "./hierophant-state";

export { validateHierophantStructure, validateHierophantReferenceIntegrity } from "./hierophant-validation";

export type {
  MarinerBoardIsleId,
  MarinerExternalLandId,
  MarinerHorizonCardinalGroupId,
  MarinerHorizonRegionId,
  MarinerInteriorSeaRegionId,
  MarinerSeaRegionId,
  MarinerLawOfSeaId,
  MarinerBuiltinBeastId,
  MarinerArrangementId,
  MarinerRouteEndpoint,
  MarinerRouteId,
  MarinerBoardIsleDefinition,
  MarinerExternalLandDefinition,
  MarinerRouteDefinition,
  MarinerInteriorSeaRegionDefinition,
  MarinerHorizonRegionDefinition,
  MarinerSeaRegionDefinition,
  MarinerHorizonCardinalGroupDefinition,
  MarinerLawOfSeaDefinition,
  MarinerBuiltinBeastDefinition,
  MarinerArrangementRaider,
  MarinerArrangementDefinition,
} from "./mariner-catalogs";
export {
  MARINER_BOARD_ISLE_IDS,
  MARINER_EXTERNAL_LAND_IDS,
  MARINER_HORIZON_CARDINAL_GROUP_IDS,
  MARINER_HORIZON_REGION_IDS,
  MARINER_INTERIOR_SEA_REGION_IDS,
  MARINER_SEA_REGION_IDS,
  MARINER_LAW_OF_SEA_IDS,
  MARINER_BUILTIN_BEAST_IDS,
  MARINER_ARRANGEMENT_IDS,
  MARINER_BOARD_ISLE_DEFINITIONS,
  MARINER_EXTERNAL_LAND_DEFINITIONS,
  MARINER_ROUTE_DEFINITIONS,
  MARINER_ROUTE_IDS,
  MARINER_HORIZON_CARDINAL_GROUPS,
  MARINER_SEA_REGION_DEFINITIONS,
  MARINER_LAW_OF_SEA_DEFINITIONS,
  MARINER_BUILTIN_BEAST_DEFINITIONS,
  MARINER_ARRANGEMENT_DEFINITIONS,
  marinerRouteId,
  marinerRouteDefinition,
  isValidMarinerBoardIsleId,
  isValidMarinerExternalLandId,
  isValidMarinerSeaRegionId,
  isValidMarinerHorizonRegionId,
  isValidMarinerLawOfSeaId,
  isValidMarinerBuiltinBeastId,
  isValidMarinerRouteId,
  marinerRouteEndpointsEqual,
  marinerRouteHasEndpoint,
  isValidMarinerArrangementId,
  marinerArrangementDefinition,
} from "./mariner-catalogs";

export type {
  MarinerIsleMarket,
  MarinerBoardIsleState,
  MarinerRouteOccupancy,
  MarinerRouteState,
  MarinerSeaRegionState,
  MarinerBeastCondition,
  MarinerBeastLocation,
  MarinerBeastState,
  MarinerState,
  InitializedDefaultMarinerInput,
} from "./mariner-state";
export {
  EMPTY_MARINER_STATE,
  buildInitializedDefaultMarinerState,
} from "./mariner-state";

export { validateMarinerStructure, validateMarinerReferenceIntegrity } from "./mariner-validation";

export type {
  NecromancerGateStatus,
  NecromancerGateBand,
  NecromancerPathRegion,
  NecromancerGhoulCallerDisposition,
  NecromancerAbominationKind,
  NecromancerLawVisibility,
  NecromancerBuiltinGateId,
  NecromancerCampaignGateId,
  NecromancerGateId,
  NecromancerEdgePathSpaceId,
  NecromancerFarLandsPathSpaceId,
  NecromancerAbyssPathSpaceId,
  NecromancerBuiltinPathSpaceId,
  NecromancerCampaignPathSpaceId,
  NecromancerPathSpaceId,
  NecromancerTerminalExitId,
  NecromancerLawOfDeathId,
  NecromancerArrangementId,
  NecromancerOccupiableSpaceRef,
  NecromancerTerminalTarget,
  NecromancerStaticTerminalExit,
  NecromancerDirectedStep,
  NecromancerBuiltinGateDefinition,
  NecromancerBuiltinPathSpaceDefinition,
  NecromancerTerminalExitDefinition,
  NecromancerLawOfDeathDefinition,
  NecromancerArrangementDefinition,
} from "./necromancer-catalogs";
export {
  NECROMANCER_GATE_STATUS_VALUES,
  NECROMANCER_GATE_BANDS,
  NECROMANCER_PATH_REGIONS,
  NECROMANCER_GHOUL_CALLER_DISPOSITIONS,
  NECROMANCER_ABOMINATION_KINDS,
  NECROMANCER_LAW_VISIBILITIES,
  NECROMANCER_BUILTIN_GATE_IDS,
  NECROMANCER_EDGE_PATH_SPACE_IDS,
  NECROMANCER_FAR_LANDS_PATH_SPACE_IDS,
  NECROMANCER_ABYSS_PATH_SPACE_IDS,
  NECROMANCER_BUILTIN_PATH_SPACE_IDS,
  NECROMANCER_TERMINAL_EXIT_IDS,
  NECROMANCER_LAW_OF_DEATH_IDS,
  NECROMANCER_ARRANGEMENT_IDS,
  NECROMANCER_BUILTIN_GATE_DEFINITIONS,
  NECROMANCER_BUILTIN_PATH_SPACE_DEFINITIONS,
  NECROMANCER_TERMINAL_EXIT_DEFINITIONS,
  NECROMANCER_LAW_OF_DEATH_DEFINITIONS,
  NECROMANCER_DEFAULT_INTERNAL_STEPS,
  NECROMANCER_DEFAULT_TERMINAL_EXITS,
  NECROMANCER_QUIET_ARRANGEMENT_SOUL_LOCATIONS,
  NECROMANCER_ARRANGEMENT_DEFINITIONS,
  isValidNecromancerBuiltinGateId,
  isValidNecromancerCampaignGateId,
  isValidNecromancerGateId,
  isValidNecromancerBuiltinPathSpaceId,
  isValidNecromancerCampaignPathSpaceId,
  isValidNecromancerPathSpaceId,
  isValidNecromancerTerminalExitId,
  isValidNecromancerLawOfDeathId,
  isValidNecromancerArrangementId,
  isValidNecromancerGateStatus,
  isValidNecromancerGateBand,
  isValidNecromancerPathRegion,
  isValidNecromancerGhoulCallerDisposition,
  isValidNecromancerAbominationKind,
  isValidNecromancerLawVisibility,
  isBuiltinEdgeOfLifePathSpaceId,
  necromancerBuiltinGateDefinition,
  necromancerBuiltinPathSpaceDefinition,
  necromancerArrangementDefinition,
  necromancerOccupiableSpaceRefsEqual,
  necromancerDirectedStepsEqual,
  necromancerDirectedStepKey,
  necromancerDefaultInternalOutgoingTarget,
} from "./necromancer-catalogs";

export type {
  NecromancerDepthState,
  NecromancerSelectedLaw,
  NecromancerBuiltinGateState,
  NecromancerCampaignGateState,
  NecromancerGateState,
  NecromancerBuiltinPathSpaceState,
  NecromancerCampaignPathSpaceState,
  NecromancerPathSpaceState,
  NecromancerSoulCount,
  NecromancerFoeLocation,
  NecromancerFoeState,
  NecromancerFoeSubjectRef,
  NecromancerDenizenFoeState,
  NecromancerWizardFoeState,
  NecromancerWizardTraversalKind,
  NecromancerWizardTraversalState,
  NecromancerAllyState,
  NecromancerGhoulCallerState,
  NecromancerState,
  InitializedDefaultNecromancerInput,
} from "./necromancer-state";
export {
  EMPTY_NECROMANCER_STATE,
  buildInitializedDefaultNecromancerState,
  necromancerFoeSubjectKey,
  necromancerFoeSubjectsEqual,
  isNecromancerWizardFoe,
  isNecromancerDenizenFoe,
  isValidNecromancerWizardTraversalKind,
  NECROMANCER_WIZARD_TRAVERSAL_KINDS,
} from "./necromancer-state";

export { validateNecromancerStructure, validateNecromancerReferenceIntegrity } from "./necromancer-validation";

export type {
  NecromancerTransitionResult,
  NecromancerArrangementFoeBinding,
  NecromancerArrangementAllyBinding,
  NecromancerArrangementGhoulCallerBinding,
  InitializeNecromancerInput,
  CreateNecromancerCampaignGateInput,
  UpdateNecromancerCampaignGateFields,
  CreateNecromancerCampaignPathSpaceInput,
  UpdateNecromancerFoeFields,
  UpdateNecromancerWizardTraversalFields,
  AddNecromancerWizardFoeTruthInput,
  UpdateNecromancerAllyFields,
  UpdateNecromancerGhoulCallerFields,
} from "./necromancer-transitions";
export {
  canonicalizeNecromancerCampaignGateName,
  canonicalizeCreateNecromancerCampaignGateInput,
  canonicalizeUpdateNecromancerCampaignGateFields,
  canonicalizeNecromancerGhoulCallerProfileText,
  canonicalizeNecromancerArrangementGhoulCallerBinding,
  canonicalizeInitializeNecromancerInput,
  canonicalizeNecromancerGhoulCaller,
  canonicalizeUpdateNecromancerGhoulCallerFields,
  applyInitializeNecromancer,
  applySetNecromancerDepth,
  applySetNecromancerSelectedLaws,
  applySetNecromancerGateStatus,
  applySetNecromancerSoulCount,
  applyMoveNecromancerSouls,
  applyAddNecromancerFoe,
  applyUpdateNecromancerFoe,
  applyRemoveNecromancerFoe,
  applyEscapeNecromancerWizardFoe,
  applyAddNecromancerWizardFoeTruth,
  applyUpdateNecromancerWizardFoeTruth,
  applyRemoveNecromancerWizardFoeTruth,
  applyAddNecromancerWizardTraversal,
  applyUpdateNecromancerWizardTraversal,
  applyRemoveNecromancerWizardTraversal,
  applyAddNecromancerAlly,
  applyUpdateNecromancerAlly,
  applyRemoveNecromancerAlly,
  applyAddNecromancerGhoulCaller,
  applyUpdateNecromancerGhoulCaller,
  applyRemoveNecromancerGhoulCaller,
  applyCreateNecromancerCampaignGate,
  applyUpdateNecromancerCampaignGate,
  applyCreateNecromancerCampaignPathSpace,
  applyRemoveNecromancerCampaignPathSpace,
  applyAddNecromancerStep,
  applyRemoveNecromancerStep,
} from "./necromancer-transitions";

export type {
  MarinerTransitionResult,
  MarinerIsleBinding,
  MarinerRarityDescription,
  InitializeMarinerInput,
  UpdateMarinerBeastFields,
} from "./mariner-transitions";
export {
  canonicalizeInitializeMarinerInput,
  normalizeMarinerIsleMarket,
  applyInitializeMariner,
  applySetMarinerShip,
  applySetSelectedSeaLaws,
  applySetMarinerRouteOccupancy,
  applySetMarinerSeaStormCount,
  applySetMarinerIsleMarket,
  applySetMarinerIsleRavage,
  applyAddMarinerBeast,
  applyUpdateMarinerBeast,
  applyRemoveMarinerBeast,
} from "./mariner-transitions";

export type {
  HierophantTransitionResult,
  TemplePlaceBinding,
  InitializeHierophantInput,
  AdjustTempleResourcesFields,
  CreateTempleInput,
  UpdateTempleFields,
  UpdateSupplicantFields,
  UpdateProphetFields,
  UpdateCultFields,
  UpdateCultDogmaFields,
  UpdateCampaignDoctrineFields,
} from "./hierophant-transitions";
export {
  applyInitializeHierophant,
  applyAdjustTempleResources,
  applyCreateTemple,
  applyUpdateTemple,
  applySetTempleHoliday,
  applySetSelectedFlameLaws,
  applyAddSupplicant,
  applyUpdateSupplicant,
  applyRemoveSupplicant,
  applyAddProphet,
  applyUpdateProphet,
  applyRemoveProphet,
  applyEstablishCult,
  applyUpdateCult,
  applyRemoveCult,
  applyAddCultDogma,
  applyUpdateCultDogma,
  applyRemoveCultDogma,
  applyCreateCampaignClass,
  applyUpdateCampaignClass,
  applyCreateCampaignDoctrine,
  applyUpdateCampaignDoctrine,
} from "./hierophant-transitions";

// --- V5 Integration Transitions (candidate, not active) ---

export type {
  WizardCharacterPatchV5,
  V5IntegrationTransitionResult,
  SetEngagementTargetV5Input,
  RescheduleEngagementV5Input,
} from "./v5-integration-transitions";
export {
  normalizeWizardCharacterPatchV5,
  validateEngagementTargetV5,
  applyUpdateWizardCharacterV5Candidate,
  applySetEngagementTargetV5Candidate,
  applyRescheduleEngagementV5Candidate,
} from "./v5-integration-transitions";
