import type { CommandId } from "./ids";
import type { MonthDirection } from "./calendar";
import { canonicalJsonStringify } from "./canonical-json";

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

export function backupImportFingerprint(expectedRevision: number, payloadDigest: string): string {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new Error(`backupImportFingerprint requires a non-negative safe integer expectedRevision, got ${expectedRevision}`);
  }
  if (!/^[0-9a-f]{64}$/.test(payloadDigest)) {
    throw new Error(`backupImportFingerprint requires a valid sha256 hex digest, got "${payloadDigest}"`);
  }
  return `backup_import:v1:expectedRevision=${expectedRevision}:payloadDigest=${payloadDigest}`;
}

// --- M3 command fingerprints ---

export function addPlayerFingerprint(playerId: string, normalizedName: string): string {
  return `add_player:v1:${playerId}:${normalizedName}`;
}

export function renamePlayerFingerprint(playerId: string, newName: string): string {
  return `rename_player:v1:${playerId}:${newName}`;
}

export function removePlayerFingerprint(playerId: string): string {
  return `remove_player:v1:${playerId}`;
}

export function setCampaignAgeFingerprint(ageId: string | null): string {
  return `set_campaign_age:v1:${ageId ?? "null"}`;
}

export function setFacilitatorFingerprint(playerId: string | null): string {
  return `set_facilitator:v1:${playerId ?? "null"}`;
}

export function createWizardFingerprint(wizardId: string, normalizedName: string, portrayedByPlayerId: string | null, seatId: string): string {
  return `create_wizard:v1:${wizardId}:${normalizedName}:${portrayedByPlayerId ?? "null"}:${seatId}`;
}

export function renameWizardFingerprint(wizardId: string, newName: string): string {
  return `rename_wizard:v1:${wizardId}:${newName}`;
}

export function setWizardPortrayalFingerprint(wizardId: string, playerId: string | null): string {
  return `set_wizard_portrayal:v1:${wizardId}:${playerId ?? "null"}`;
}

export function setPactSeatWizardFingerprint(seatId: string, wizardId: string | null): string {
  return `set_pact_seat_wizard:v1:${seatId}:${wizardId ?? "null"}`;
}

export function setPactSeatStatusFingerprint(seatId: string, status: string | null): string {
  return `set_pact_seat_status:v1:${seatId}:${status ?? "null"}`;
}

export function setWatcherFingerprint(seatId: string, playerId: string | null): string {
  return `set_watcher:v1:${seatId}:${playerId ?? "null"}`;
}

// --- M4 Setup command fingerprints ---

export function setSetupMonthFingerprint(monthOrdinal: number | null): string {
  return `set_setup_month:v1:${monthOrdinal ?? "null"}`;
}

export function setSetupOrreryPositionFingerprint(planetId: string, positionIndex: number | null): string {
  return `set_setup_orrery_position:v1:${planetId}:${positionIndex ?? "null"}`;
}

// --- M4 Begin Play fingerprint ---

export function beginPlayFingerprint(expectedRevision: number): string {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new Error(`beginPlayFingerprint requires a non-negative safe integer, got ${expectedRevision}`);
  }
  return `begin_play:v1:expectedRevision=${expectedRevision}`;
}

// --- M4 C3 Play command fingerprints ---

export function advancePhaseFingerprint(expectedMonthOrdinal: number, expectedPhase: string): string {
  if (!Number.isSafeInteger(expectedMonthOrdinal) || expectedMonthOrdinal < 0) {
    throw new Error(`advancePhaseFingerprint requires a non-negative integer expectedMonthOrdinal, got ${expectedMonthOrdinal}`);
  }
  return `advance_phase:v1:month=${expectedMonthOrdinal}:phase=${expectedPhase}`;
}

export function scheduleTimeFingerprint(expectedMonthOrdinal: number, allocationId: string, destination: unknown, note: string | null): string {
  if (!Number.isSafeInteger(expectedMonthOrdinal) || expectedMonthOrdinal < 0) {
    throw new Error(`scheduleTimeFingerprint requires a non-negative integer expectedMonthOrdinal, got ${expectedMonthOrdinal}`);
  }
  const destCanonical = destination === null ? "null" : canonicalJsonStringify(destination);
  const noteCanonical = note === null ? "null" : canonicalJsonStringify(note);
  return `schedule_time:v1:month=${expectedMonthOrdinal}:alloc=${allocationId}:dest=${destCanonical}:note=${noteCanonical}`;
}

export function setEngagementTargetFingerprint(expectedMonthOrdinal: number, engagementId: string, target: unknown): string {
  if (!Number.isSafeInteger(expectedMonthOrdinal) || expectedMonthOrdinal < 0) {
    throw new Error(`setEngagementTargetFingerprint requires a non-negative integer expectedMonthOrdinal, got ${expectedMonthOrdinal}`);
  }
  const targetCanonical = target === null ? "null" : canonicalJsonStringify(target);
  return `set_engagement_target:v1:month=${expectedMonthOrdinal}:eng=${engagementId}:target=${targetCanonical}`;
}

/**
 * Pure deterministic idempotency match for command replay.
 * Given a previously committed command record and an incoming attempt,
 * returns whether it's an exact replay (idempotent) or a conflict.
 *
 * Does NOT handle DB lookup — that stays in Convex mutations.
 */
export type IdempotencyMatchResult =
  | { kind: "exact_match"; revision: number }
  | { kind: "conflict"; committedType: string; committedFingerprint: string };

export function matchCommandIdempotency(
  committed: { commandType: string; commandFingerprint: string; campaignRevision: number },
  attempted: { commandType: string; commandFingerprint: string },
): IdempotencyMatchResult {
  if (
    committed.commandType === attempted.commandType &&
    committed.commandFingerprint === attempted.commandFingerprint
  ) {
    return { kind: "exact_match", revision: committed.campaignRevision };
  }
  return {
    kind: "conflict",
    committedType: committed.commandType,
    committedFingerprint: committed.commandFingerprint,
  };
}
