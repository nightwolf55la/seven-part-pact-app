import type { CommandId } from "./ids";
import type { MonthDirection } from "./calendar";

const MIGRATION_COMMAND_PREFIX = "migrated_rev_";

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
