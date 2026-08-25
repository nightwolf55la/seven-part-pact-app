import type { CommandId } from "./ids";
import type { MonthDirection } from "./calendar";

const MIGRATION_COMMAND_PREFIX = "migrated_rev_";

const CONTROL_CHAR_REGEX = /[\x00-\x1f\x7f]/;
const MAX_CHECKPOINT_LABEL_LENGTH = 120;

export function normalizeCheckpointLabel(raw: string): string {
  return raw.trim();
}

export function validateCheckpointLabel(normalizedLabel: string): string | null {
  if (normalizedLabel.length === 0) {
    return "Checkpoint label must not be empty";
  }
  if (normalizedLabel.length > MAX_CHECKPOINT_LABEL_LENGTH) {
    return `Checkpoint label exceeds ${MAX_CHECKPOINT_LABEL_LENGTH} characters (got ${normalizedLabel.length})`;
  }
  if (CONTROL_CHAR_REGEX.test(normalizedLabel)) {
    return "Checkpoint label must not contain control characters";
  }
  return null;
}

export function syntheticMigrationCommandId(revision: number): CommandId {
  return `${MIGRATION_COMMAND_PREFIX}${revision}` as CommandId;
}

export function isSyntheticMigrationCommandId(id: string): boolean {
  return id.startsWith(MIGRATION_COMMAND_PREFIX);
}

export function migrationCommandFingerprint(revision: number, direction: MonthDirection): string {
  return `legacy_month_change:v1:rev${revision}:${direction}`;
}

export function moveMonthFingerprint(direction: MonthDirection): string {
  return `move_month:v1:${direction}`;
}

export function undoFingerprint(expectedRevision: number): string {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new Error(`undoFingerprint requires a non-negative safe integer, got ${expectedRevision}`);
  }
  return `undo:v1:expectedRevision=${expectedRevision}`;
}

export function redoFingerprint(expectedRevision: number): string {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new Error(`redoFingerprint requires a non-negative safe integer, got ${expectedRevision}`);
  }
  return `redo:v1:expectedRevision=${expectedRevision}`;
}

export function checkpointRestoreFingerprint(checkpointId: string, expectedRevision: number): string {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new Error(`checkpointRestoreFingerprint requires a non-negative safe integer expectedRevision, got ${expectedRevision}`);
  }
  return `checkpoint_restore:v1:checkpoint=${checkpointId}:expectedRevision=${expectedRevision}`;
}
