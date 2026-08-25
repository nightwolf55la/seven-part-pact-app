export type { Brand } from "./brand";

export type { CampaignId, CommandId, CheckpointId } from "./ids";
export {
  isValidCampaignId,
  parseCampaignId,
  isValidLiveCommandId,
  parseLiveCommandId,
  isValidCheckpointId,
  parseCheckpointId,
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
  CampaignStateV1,
  CurrentCampaignState,
  AnyCampaignState,
} from "./campaign-state";
export { CURRENT_STATE_SCHEMA_VERSION } from "./campaign-state";

export type {
  LegacyCampaignInput,
  LegacyEventInput,
  MigrationSnapshotPlan,
  MigrationRevisionPlan,
  MigrationNotNeeded,
  MigrationReady,
  MigrationInvalid,
  MigrationAnalysisResult,
} from "./migration-analyzer";
export { analyzeLegacyMigration } from "./migration-analyzer";

export type { DomainErrorCode } from "./errors";
export { DomainError } from "./errors";

export { validateCampaignState } from "./state-validation";

export { initialCampaignState } from "./initial-state";

export type { MoveMonthTransitionResult } from "./transitions";
export { applyMoveMonth } from "./transitions";

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

export {
  syntheticMigrationCommandId,
  isSyntheticMigrationCommandId,
  migrationCommandFingerprint,
  moveMonthFingerprint,
  undoFingerprint,
  redoFingerprint,
  checkpointRestoreFingerprint,
  backupImportFingerprint,
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
  statesDeepEqual,
  analyzeHistoryControlInitialization,
} from "./history-control";

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
  buildExportBackup,
} from "./backup";

export {
  canonicalJsonStringify,
  sha256Hex,
  computeDigestFromCanonicalJson,
  CanonicalJsonError,
} from "./canonical-json";

export type { BackupImportRevisionVerificationInput } from "./backup-verification";
export {
  verifyBackupImportRevisionStructure,
  verifyBackupImportRevisionDigest,
} from "./backup-verification";

