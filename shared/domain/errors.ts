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
  | "INVALID_CHECKPOINT";

export class DomainError extends Error {
  public readonly code: DomainErrorCode;
  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "DomainError";
  }
}
