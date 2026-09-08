import type { CommandId } from "./ids";
import type { MonthDirection } from "./calendar";
import { canonicalJsonStringify } from "./canonical-json";
import { DomainError } from "./errors";

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

// Retained for historical tooling (history-control.ts). Not re-exported from index.ts.
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

export function normalizeWarningKeys(keys: readonly string[]): readonly string[] {
  return [...new Set(keys)].sort();
}

export function advancePhaseFingerprint(expectedMonthOrdinal: number, expectedPhase: string, acknowledgedWarningKeys?: readonly string[]): string {
  if (!Number.isSafeInteger(expectedMonthOrdinal) || expectedMonthOrdinal < 0) {
    throw new Error(`advancePhaseFingerprint requires a non-negative integer expectedMonthOrdinal, got ${expectedMonthOrdinal}`);
  }
  const normalized = acknowledgedWarningKeys ? normalizeWarningKeys(acknowledgedWarningKeys) : [];
  if (normalized.length === 0) {
    return `advance_phase:v1:month=${expectedMonthOrdinal}:phase=${expectedPhase}`;
  }
  return `advance_phase:v2:month=${expectedMonthOrdinal}:phase=${expectedPhase}:ack=${normalized.join(",")}`;
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

// --- M4 C4 Story command fingerprints ---

export function rescheduleTimeFingerprint(expectedMonthOrdinal: number, allocationId: string, destination: unknown, note: string | null): string {
  if (!Number.isSafeInteger(expectedMonthOrdinal) || expectedMonthOrdinal < 0) {
    throw new Error(`rescheduleTimeFingerprint requires a non-negative integer expectedMonthOrdinal, got ${expectedMonthOrdinal}`);
  }
  const destCanonical = destination === null ? "null" : canonicalJsonStringify(destination);
  const noteCanonical = note === null ? "null" : canonicalJsonStringify(note);
  return `reschedule_time:v1:month=${expectedMonthOrdinal}:alloc=${allocationId}:dest=${destCanonical}:note=${noteCanonical}`;
}

export function spendManualTimeFingerprint(expectedMonthOrdinal: number, allocationId: string): string {
  if (!Number.isSafeInteger(expectedMonthOrdinal) || expectedMonthOrdinal < 0) {
    throw new Error(`spendManualTimeFingerprint requires a non-negative integer expectedMonthOrdinal, got ${expectedMonthOrdinal}`);
  }
  return `spend_manual_time:v1:month=${expectedMonthOrdinal}:alloc=${allocationId}`;
}

export function wasteTimeFingerprint(expectedMonthOrdinal: number, allocationId: string): string {
  if (!Number.isSafeInteger(expectedMonthOrdinal) || expectedMonthOrdinal < 0) {
    throw new Error(`wasteTimeFingerprint requires a non-negative integer expectedMonthOrdinal, got ${expectedMonthOrdinal}`);
  }
  return `waste_time:v1:month=${expectedMonthOrdinal}:alloc=${allocationId}`;
}

export function spendOrreryTimeFingerprint(expectedMonthOrdinal: number, allocationId: string, planetId: string, direction: string): string {
  if (!Number.isSafeInteger(expectedMonthOrdinal) || expectedMonthOrdinal < 0) {
    throw new Error(`spendOrreryTimeFingerprint requires a non-negative integer expectedMonthOrdinal, got ${expectedMonthOrdinal}`);
  }
  return `spend_orrery_time:v1:month=${expectedMonthOrdinal}:alloc=${allocationId}:planet=${planetId}:dir=${direction}`;
}

export function commitTimeToEngagementFingerprint(expectedMonthOrdinal: number, allocationId: string, engagementId: string): string {
  if (!Number.isSafeInteger(expectedMonthOrdinal) || expectedMonthOrdinal < 0) {
    throw new Error(`commitTimeToEngagementFingerprint requires a non-negative integer expectedMonthOrdinal, got ${expectedMonthOrdinal}`);
  }
  return `commit_time_to_engagement:v1:month=${expectedMonthOrdinal}:alloc=${allocationId}:eng=${engagementId}`;
}

export function resolveEngagementFingerprint(expectedMonthOrdinal: number, engagementId: string): string {
  if (!Number.isSafeInteger(expectedMonthOrdinal) || expectedMonthOrdinal < 0) {
    throw new Error(`resolveEngagementFingerprint requires a non-negative integer expectedMonthOrdinal, got ${expectedMonthOrdinal}`);
  }
  return `resolve_engagement:v1:month=${expectedMonthOrdinal}:eng=${engagementId}`;
}

export function adjustWizardmootAttendanceFingerprint(
  expectedMonthOrdinal: number,
  wizardId: string,
  attended: boolean,
  exceptionReason: string | null,
): string {
  if (!Number.isSafeInteger(expectedMonthOrdinal) || expectedMonthOrdinal < 0) {
    throw new Error(`adjustWizardmootAttendanceFingerprint requires a non-negative integer expectedMonthOrdinal, got ${expectedMonthOrdinal}`);
  }
  const reasonCanonical = exceptionReason === null ? "null" : canonicalJsonStringify(exceptionReason);
  return `adjust_wizardmoot_attendance:v1:month=${expectedMonthOrdinal}:wizard=${wizardId}:attended=${attended}:reason=${reasonCanonical}`;
}

export function completeMeetingFingerprint(expectedMonthOrdinal: number): string {
  if (!Number.isSafeInteger(expectedMonthOrdinal) || expectedMonthOrdinal < 0) {
    throw new Error(`completeMeetingFingerprint requires a non-negative integer expectedMonthOrdinal, got ${expectedMonthOrdinal}`);
  }
  return `complete_meeting:v1:month=${expectedMonthOrdinal}`;
}

export function beginNextMonthFingerprint(expectedMonthOrdinal: number, acknowledgedWarningKeys?: readonly string[]): string {
  if (!Number.isSafeInteger(expectedMonthOrdinal) || expectedMonthOrdinal < 0) {
    throw new Error(`beginNextMonthFingerprint requires a non-negative integer expectedMonthOrdinal, got ${expectedMonthOrdinal}`);
  }
  const normalized = acknowledgedWarningKeys ? normalizeWarningKeys(acknowledgedWarningKeys) : [];
  if (normalized.length === 0) {
    return `begin_next_month:v1:month=${expectedMonthOrdinal}`;
  }
  return `begin_next_month:v2:month=${expectedMonthOrdinal}:ack=${normalized.join(",")}`;
}

// --- Wizard Character fingerprint ---

export function updateWizardCharacterFingerprint(wizardId: string, normalizedPatch: Record<string, unknown>): string {
  const patchCanonical = canonicalJsonStringify(normalizedPatch);
  return `update_wizard_character:v1:wizard=${wizardId}:patch=${patchCanonical}`;
}

export function rescheduleEngagementFingerprint(expectedMonthOrdinal: number, engagementId: string, target: unknown): string {
  if (!Number.isSafeInteger(expectedMonthOrdinal) || expectedMonthOrdinal < 0) {
    throw new Error(`rescheduleEngagementFingerprint requires a non-negative integer expectedMonthOrdinal, got ${expectedMonthOrdinal}`);
  }
  const targetCanonical = canonicalJsonStringify(target);
  return `reschedule_engagement:v1:month=${expectedMonthOrdinal}:eng=${engagementId}:target=${targetCanonical}`;
}

export function createDenizenFingerprint(expectedCampaignId: string, denizenId: string, name: string, representation: string, description: string | null): string {
  const payload = canonicalJsonStringify({ expectedCampaignId, denizenId, name, representation, description });
  return `create_denizen:v2:${payload}`;
}

export function updateDenizenFingerprint(expectedCampaignId: string, denizenId: string, fields: Record<string, unknown>): string {
  const fieldsCanonical = canonicalJsonStringify(fields);
  return `update_denizen:v2:campaign=${expectedCampaignId}:denizen=${denizenId}:fields=${fieldsCanonical}`;
}

export function createIsleFingerprint(expectedCampaignId: string, isleId: string, name: string, description: string | null): string {
  const payload = canonicalJsonStringify({ expectedCampaignId, isleId, name, description });
  return `create_isle:v2:${payload}`;
}

export function updateIsleFingerprint(expectedCampaignId: string, isleId: string, fields: Record<string, unknown>): string {
  const fieldsCanonical = canonicalJsonStringify(fields);
  return `update_isle:v2:campaign=${expectedCampaignId}:isle=${isleId}:fields=${fieldsCanonical}`;
}

export function createPlaceFingerprint(expectedCampaignId: string, placeId: string, name: string, description: string | null, placement: unknown): string {
  const payload = canonicalJsonStringify({ expectedCampaignId, placeId, name, description, placement });
  return `create_place:v2:${payload}`;
}

export function updatePlaceFingerprint(expectedCampaignId: string, placeId: string, fields: Record<string, unknown>): string {
  const fieldsCanonical = canonicalJsonStringify(fields);
  return `update_place:v2:campaign=${expectedCampaignId}:place=${placeId}:fields=${fieldsCanonical}`;
}

export function setWizardHomeIsleFingerprint(
  expectedCampaignId: string,
  wizardId: string,
  change: { expected: string | null; value: string | null },
): string {
  const payload = canonicalJsonStringify({ expectedCampaignId, wizardId, change });
  return `set_wizard_home_isle:v2:${payload}`;
}

export function setWizardSanctumFingerprint(
  expectedCampaignId: string,
  wizardId: string,
  change: { expected: string | null; value: string | null },
): string {
  const payload = canonicalJsonStringify({ expectedCampaignId, wizardId, change });
  return `set_wizard_sanctum:v2:${payload}`;
}

export function setWizardCompanionFingerprint(input: {
  expectedCampaignId: string;
  wizardId: string;
  element: string;
  expectedCurrentRelationshipId: string | null;
  newRelationship: {
    companionRelationshipId: string;
    denizenId: string;
    description: string | null;
  } | null;
}): string {
  const payload = canonicalJsonStringify(input);
  return `set_wizard_companion:v2:${payload}`;
}

export function updateCompanionDescriptionFingerprint(input: {
  expectedCampaignId: string;
  companionRelationshipId: string;
  expectedStatus: string;
  description: { expected: string | null; value: string | null };
}): string {
  const payload = canonicalJsonStringify(input);
  return `update_companion_description:v2:${payload}`;
}

export function initializeHierophantFingerprint(
  expectedCampaignId: string,
  selectedFlameLawIds: readonly string[],
  templePlaces: unknown,
): string {
  const payload = canonicalJsonStringify({ expectedCampaignId, selectedFlameLawIds, templePlaces });
  return `initialize_hierophant:v1:${payload}`;
}

export function adjustTempleResourcesFingerprint(
  expectedCampaignId: string,
  templeId: string,
  fields: Record<string, unknown>,
): string {
  const fieldsCanonical = canonicalJsonStringify(fields);
  return `adjust_temple_resources:v1:campaign=${expectedCampaignId}:temple=${templeId}:fields=${fieldsCanonical}`;
}

export function createTempleFingerprint(expectedCampaignId: string, input: unknown): string {
  return `create_temple:v1:${canonicalJsonStringify({ expectedCampaignId, input })}`;
}

export function updateTempleFingerprint(expectedCampaignId: string, templeId: string, fields: unknown): string {
  return `update_temple:v1:${canonicalJsonStringify({ expectedCampaignId, templeId, fields })}`;
}

export function setTempleHolidayFingerprint(expectedCampaignId: string, templeId: string, marked: boolean): string {
  return `set_temple_holiday:v1:${canonicalJsonStringify({ expectedCampaignId, templeId, marked })}`;
}

export function setSelectedFlameLawsFingerprint(
  expectedCampaignId: string,
  expectedSelectedFlameLawIds: readonly string[],
  selectedFlameLawIds: readonly string[],
): string {
  return `set_selected_flame_laws:v1:${canonicalJsonStringify({
    expectedCampaignId,
    expectedSelectedFlameLawIds,
    selectedFlameLawIds,
  })}`;
}

export function addSupplicantFingerprint(expectedCampaignId: string, supplicant: unknown): string {
  return `add_supplicant:v1:${canonicalJsonStringify({ expectedCampaignId, supplicant })}`;
}

export function updateSupplicantFingerprint(expectedCampaignId: string, denizenId: string, fields: unknown): string {
  return `update_supplicant:v1:${canonicalJsonStringify({ expectedCampaignId, denizenId, fields })}`;
}

export function removeSupplicantFingerprint(expectedCampaignId: string, denizenId: string): string {
  return `remove_supplicant:v1:${canonicalJsonStringify({ expectedCampaignId, denizenId })}`;
}

export function addProphetFingerprint(expectedCampaignId: string, prophet: unknown): string {
  return `add_prophet:v1:${canonicalJsonStringify({ expectedCampaignId, prophet })}`;
}

export function updateProphetFingerprint(expectedCampaignId: string, denizenId: string, fields: unknown): string {
  return `update_prophet:v1:${canonicalJsonStringify({ expectedCampaignId, denizenId, fields })}`;
}

export function removeProphetFingerprint(expectedCampaignId: string, denizenId: string): string {
  return `remove_prophet:v1:${canonicalJsonStringify({ expectedCampaignId, denizenId })}`;
}

export function establishCultFingerprint(expectedCampaignId: string, cult: unknown): string {
  return `establish_cult:v1:${canonicalJsonStringify({ expectedCampaignId, cult })}`;
}

export function updateCultFingerprint(expectedCampaignId: string, cultDenizenId: string, fields: unknown): string {
  return `update_cult:v1:${canonicalJsonStringify({ expectedCampaignId, cultDenizenId, fields })}`;
}

export function removeCultFingerprint(expectedCampaignId: string, cultDenizenId: string): string {
  return `remove_cult:v1:${canonicalJsonStringify({ expectedCampaignId, cultDenizenId })}`;
}

export function addCultDogmaFingerprint(expectedCampaignId: string, cultDenizenId: string, dogma: unknown): string {
  return `add_cult_dogma:v1:${canonicalJsonStringify({ expectedCampaignId, cultDenizenId, dogma })}`;
}

export function updateCultDogmaFingerprint(
  expectedCampaignId: string,
  cultDenizenId: string,
  dogmaEntryId: string,
  fields: unknown,
): string {
  return `update_cult_dogma:v1:${canonicalJsonStringify({ expectedCampaignId, cultDenizenId, dogmaEntryId, fields })}`;
}

export function removeCultDogmaFingerprint(
  expectedCampaignId: string,
  cultDenizenId: string,
  dogmaEntryId: string,
): string {
  return `remove_cult_dogma:v1:${canonicalJsonStringify({ expectedCampaignId, cultDenizenId, dogmaEntryId })}`;
}

export function createCampaignClassFingerprint(expectedCampaignId: string, campaignClass: unknown): string {
  return `create_campaign_class:v1:${canonicalJsonStringify({ expectedCampaignId, campaignClass })}`;
}

export function updateCampaignClassFingerprint(expectedCampaignId: string, classId: string, name: unknown): string {
  return `update_campaign_class:v1:${canonicalJsonStringify({ expectedCampaignId, classId, name })}`;
}

export function createCampaignDoctrineFingerprint(expectedCampaignId: string, campaignDoctrine: unknown): string {
  return `create_campaign_doctrine:v1:${canonicalJsonStringify({ expectedCampaignId, campaignDoctrine })}`;
}

export function updateCampaignDoctrineFingerprint(
  expectedCampaignId: string,
  doctrineId: string,
  fields: unknown,
): string {
  return `update_campaign_doctrine:v1:${canonicalJsonStringify({ expectedCampaignId, doctrineId, fields })}`;
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

export type AcceptedCommandReplayResolution =
  | { kind: "not_applied" }
  | { kind: "replay"; revision: number };

/**
 * Apply the existing accepted-command replay rule to a looked-up record.
 * Throws COMMAND_ID_REUSED on incompatible reuse. Snapshot loading stays at the I/O boundary.
 */
export function resolveAcceptedCommandReplay(
  commandId: string,
  existing: { commandType: string; commandFingerprint: string; campaignRevision: number } | null,
  attempted: { commandType: string; commandFingerprint: string },
): AcceptedCommandReplayResolution {
  if (existing === null) {
    return { kind: "not_applied" };
  }

  const match = matchCommandIdempotency(existing, attempted);
  if (match.kind === "conflict") {
    throw new DomainError(
      "COMMAND_ID_REUSED",
      `CommandId "${commandId}" already committed with type="${match.committedType}" fingerprint="${match.committedFingerprint}", cannot reuse for type="${attempted.commandType}" fingerprint="${attempted.commandFingerprint}"`,
    );
  }

  return { kind: "replay", revision: match.revision };
}
