export type DomainErrorCode =
  | "COMMAND_ID_REUSED"
  | "INVALID_CAMPAIGN_STATE"
  | "MIGRATION_NOT_READY"
  | "MIGRATION_ALREADY_APPLIED"
  | "MIGRATION_CANONICAL_DATA_NOT_EMPTY"
  | "CAMPAIGN_STATE_CORRUPT"
  | "STALE_CAMPAIGN_REVISION"
  | "UNDO_UNAVAILABLE"
  | "REDO_UNAVAILABLE"
  | "HISTORY_CONTROL_NOT_INITIALIZED"
  | "CHECKPOINT_ID_REUSED"
  | "CHECKPOINT_NOT_FOUND"
  | "INVALID_CHECKPOINT"
  | "INVALID_BACKUP_FORMAT"
  | "UNSUPPORTED_BACKUP_VERSION"
  | "BACKUP_INTEGRITY_FAILED"
  | "BACKUP_INCOMPATIBLE"
  | "CAMPAIGN_NOT_FOUND";

export class DomainError extends Error {
  public readonly code: DomainErrorCode;
  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "DomainError";
  }
}
