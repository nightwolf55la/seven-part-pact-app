export type DomainErrorCode =
  | "COMMAND_ID_REUSED"
  | "INVALID_CAMPAIGN_STATE"
  | "MIGRATION_NOT_READY"
  | "MIGRATION_ALREADY_APPLIED"
  | "MIGRATION_CANONICAL_DATA_NOT_EMPTY"
  | "CAMPAIGN_STATE_CORRUPT";

export class DomainError extends Error {
  public readonly code: DomainErrorCode;
  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "DomainError";
  }
}
