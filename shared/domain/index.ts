export type { Brand } from "./brand";

export type { CampaignId, CommandId, CheckpointId, PlayerId, WizardId, AllocationId, EngagementId } from "./ids";
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
} from "./ids";

export type {
  MonthOrdinal,
  MonthId,
  MonthDirection,
  MonthDisplayName,
} from "./calendar";
export {
  MONTH_IDS,
  MONTH_DISPLAY_NAMES,
  MONTH_COUNT,
  INITIAL_MONTH_ORDINAL,
  monthIdFromOrdinal,
  displayNameFromMonthId,
  displayNameFromOrdinal,
  advanceOrdinal,
} from "./calendar";

export type { CampaignCommandType } from "./commands";
export {
  CAMPAIGN_COMMAND_TYPES,
  isLogicalStateCommandType,
  isHistoryNavigationCommandType,
} from "./commands";

export type {
  MonthChangedDataV1,
  MonthChangedEventV1,
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
  TimeAllocationScheduledEventV1,
  EngagementTargetChangedEventV1,
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
  CampaignPlayer,
  CampaignWizard,
  PactSeatState,
  PactSeatStatus,
  LunarPhase,
  MonthlyPlayState,
  SetupLifecycle,
  PlayLifecycle,
  CampaignLifecycle,
  CurrentCampaignState,
  AnyCampaignState,
} from "./campaign-state";
export { CURRENT_STATE_SCHEMA_VERSION, LUNAR_PHASES } from "./campaign-state";

export type { PactSeatId } from "./pact-seats";
export { PACT_SEAT_IDS, PACT_SEAT_COUNT, pactSeatDisplayName, isValidPactSeatId } from "./pact-seats";

export type { AgeDefinitionId } from "./ages";
export { AGE_DEFINITION_IDS, ageDisplayName, isValidAgeDefinitionId } from "./ages";

export { migrateToCurrentVersion, loadHistoricalState, isHistoricalStateLogicallyEqual, isSupportedSchemaVersion, SUPPORTED_STATE_SCHEMA_VERSIONS } from "./state-migration";

export type { DomainErrorCode } from "./errors";
export { DomainError } from "./errors";

export { validateCampaignState, validateAnyCampaignState } from "./state-validation";

export { initialCampaignState } from "./initial-state";

export type { MoveMonthTransitionResult } from "./transitions";
export { applyMoveMonth } from "./transitions";

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
  moveMonthFingerprint,
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
  beginPlayFingerprint,
  advancePhaseFingerprint,
  scheduleTimeFingerprint,
  setEngagementTargetFingerprint,
  rescheduleTimeFingerprint,
  spendManualTimeFingerprint,
  wasteTimeFingerprint,
  spendOrreryTimeFingerprint,
  commitTimeToEngagementFingerprint,
  resolveEngagementFingerprint,
  rescheduleEngagementFingerprint,
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
  validateMoveMonthTransaction,
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
  EngagementTarget,
  EngagementTargetKind,
  EngagementRecord,
} from "./engagement";
export { ENGAGEMENT_RESOLUTIONS, ENGAGEMENT_TARGET_KINDS } from "./engagement";

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

export type { WizardInitIds, BeginPlayInput } from "./begin-play";
export { applyBeginPlay, collectEligibleWizardIds } from "./begin-play";

// --- Play Transitions (C3) ---

export type { AdvancePhaseInput, ScheduleTimeInput, SetEngagementTargetInput, RescheduleTimeInput, SpendManualTimeInput, WasteTimeInput, SpendOrreryTimeInput, CommitTimeToEngagementInput, ResolveEngagementInput, RescheduleEngagementInput } from "./play-transitions";
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
} from "./play-transitions";
