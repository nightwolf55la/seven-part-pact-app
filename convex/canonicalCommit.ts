import type { MutationCtx } from "./_generated/server";
import type { CampaignCommandType, CurrentCampaignState, CampaignEvent, MonthDirection, EventRecord } from "../shared/domain";
import { validateCampaignState, validateAnyCampaignState, DomainError, advanceOrdinal, validateMoveMonthTransaction, isLogicalStateCommandType, CURRENT_HISTORY_CONTROL_VERSION, validateHistoryControlStructure, statesDeepEqual, isValidCheckpointId, validateCheckpointLabel, normalizeCheckpointLabel, checkpointRestoreFingerprint, CURRENT_CHECKPOINT_VERSION, isValidCampaignId, backupImportFingerprint, fullyValidateBackup, isValidPlayerId, isValidWizardId } from "../shared/domain";
import { migrateToCurrentVersion } from "../shared/domain/state-migration";
import { assertPortableCampaignState } from "../shared/domain/state-equality";
import { validateUndoTransactionCoherence, validateRedoTransactionCoherence } from "../shared/domain/undo-redo";
import { isValidPactSeatId, PACT_SEAT_IDS } from "../shared/domain/pact-seats";
import { isValidAgeDefinitionId } from "../shared/domain/ages";
import type { Id } from "./_generated/dataModel";
import { serializeState, snapshotRecord, campaignPatch } from "./persistence";
import { assertCampaignNotDeleting } from "./deletionBarrier";

export type HistoryControlUpdate =
  | { readonly kind: "logical_state_append" }
  | { readonly kind: "history_navigation"; readonly nextUndoStack: readonly number[]; readonly nextRedoStack: readonly number[] };

function loadCurrentFromHistorical(raw: unknown): CurrentCampaignState {
  const validated = validateAnyCampaignState(raw);
  return migrateToCurrentVersion(validated);
}

export type CommandContext =
  | { readonly kind: "backup_import"; readonly backupJson: string };

export interface CanonicalCommitInput {
  campaignDocId: Id<"campaigns">;
  campaignId: string;
  currentRevision: number;
  currentState: CurrentCampaignState;
  commandId: string;
  commandType: CampaignCommandType;
  commandFingerprint: string;
  nextState: CurrentCampaignState;
  events: readonly CampaignEvent[];
  historyControlUpdate: HistoryControlUpdate;
  commandContext?: CommandContext;
}

export interface CanonicalCommitReceipt {
  newRevision: number;
  state: CurrentCampaignState;
  alreadyApplied: boolean;
}

function validateEventCoherence(
  input: CanonicalCommitInput,
  newRevision: number,
): void {
  const { currentState, nextState, events, commandType, commandFingerprint } = input;

  switch (commandType) {
    case "move_month": {
      const moveErrors = validateMoveMonthTransaction(
        currentState,
        events as EventRecord["event"][],
        nextState,
        commandFingerprint,
      );
      if (moveErrors.length > 0) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `move_month coherence: ${moveErrors.join("; ")}`);
      }
      if (input.historyControlUpdate.kind !== "logical_state_append") {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "move_month must use logical_state_append history update");
      }
      break;
    }
    case "legacy_month_change": {
      if (events.length !== 1) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "legacy_month_change must produce exactly one event");
      }
      if (input.historyControlUpdate.kind !== "logical_state_append") {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "legacy_month_change must use logical_state_append history update");
      }
      break;
    }
    case "checkpoint_restore": {
      if (events.length !== 1) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "checkpoint_restore must produce exactly one event");
      }
      const evt = events[0];
      if (evt.type !== "checkpoint_restored" || evt.version !== 1) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `checkpoint_restore event must be checkpoint_restored v1, got type="${evt.type}" version=${evt.version}`);
      }
      if (!isValidCheckpointId(evt.data.checkpointId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "checkpoint_restore checkpointId is not valid");
      }
      const expectedFingerprint = checkpointRestoreFingerprint(evt.data.checkpointId, input.currentRevision);
      if (commandFingerprint !== expectedFingerprint) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `checkpoint_restore fingerprint "${commandFingerprint}" does not match expected "${expectedFingerprint}"`);
      }
      if (input.historyControlUpdate.kind !== "logical_state_append") {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "checkpoint_restore must use logical_state_append history update");
      }
      break;
    }
    case "backup_import": {
      if (events.length !== 1) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "backup_import must produce exactly one event");
      }
      const evt = events[0];
      if (evt.type !== "backup_imported" || evt.version !== 1) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `backup_import event must be backup_imported v1, got type="${evt.type}" version=${evt.version}`);
      }
      if (input.historyControlUpdate.kind !== "logical_state_append") {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "backup_import must use logical_state_append history update");
      }
      if (!input.commandContext || input.commandContext.kind !== "backup_import") {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "backup_import requires commandContext with kind backup_import");
      }
      break;
    }
    case "undo": {
      if (events.length !== 1) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "undo must produce exactly one event");
      }
      const evt = events[0];
      if (evt.type !== "undo_applied" || evt.version !== 1) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `undo event must be undo_applied v1, got type="${evt.type}" version=${evt.version}`);
      }
      if (input.historyControlUpdate.kind !== "history_navigation") {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "undo must use history_navigation update");
      }
      break;
    }
    case "redo": {
      if (events.length !== 1) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "redo must produce exactly one event");
      }
      const evt = events[0];
      if (evt.type !== "redo_applied" || evt.version !== 1) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `redo event must be redo_applied v1, got type="${evt.type}" version=${evt.version}`);
      }
      if (input.historyControlUpdate.kind !== "history_navigation") {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "redo must use history_navigation update");
      }
      break;
    }
    default: {
      validateM3EventCoherence(input);
      break;
    }
  }
}

const M3_COMMAND_EVENT_MAP: Record<string, { required: string[]; optional?: string[] }> = {
  add_player: { required: ["player_added"] },
  rename_player: { required: ["player_renamed"] },
  remove_player: { required: ["player_removed"] },
  set_campaign_age: { required: ["campaign_age_changed"] },
  set_facilitator: { required: ["facilitator_assignment_changed"] },
  create_wizard: { required: ["wizard_created", "pact_seat_wizard_changed"] },
  rename_wizard: { required: ["wizard_name_changed"] },
  set_wizard_portrayal: { required: ["wizard_portrayal_changed"] },
  set_pact_seat_wizard: { required: ["pact_seat_wizard_changed"], optional: ["pact_seat_status_changed"] },
  set_pact_seat_status: { required: ["pact_seat_status_changed"] },
  set_watcher: { required: ["watcher_assignment_changed"] },
};

function validateM3EventCoherence(input: CanonicalCommitInput): void {
  const { commandType, events } = input;

  if (input.historyControlUpdate.kind !== "logical_state_append") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${commandType} must use logical_state_append history update`);
  }

  const spec = M3_COMMAND_EVENT_MAP[commandType];
  if (!spec) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown command type: ${commandType}`);
  }

  const { required, optional = [] } = spec;
  const maxEvents = required.length + optional.length;

  if (events.length < required.length || events.length > maxEvents) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${commandType} must produce ${required.length}${optional.length > 0 ? `-${maxEvents}` : ""} event(s), got ${events.length}`);
  }

  for (let i = 0; i < required.length; i++) {
    if (events[i].type !== required[i]) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${commandType} event[${i}] must be ${required[i]}, got ${events[i].type}`);
    }
  }

  for (let i = required.length; i < events.length; i++) {
    if (!optional.includes(events[i].type)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${commandType} event[${i}] has unexpected type ${events[i].type}`);
    }
  }

  for (const evt of events) {
    if (evt.version !== 1) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${commandType} event ${evt.type} has unsupported version ${evt.version}`);
    }
    validateM3EventPayload(evt);
  }
}

function validateM3EventPayload(evt: CampaignEvent): void {
  switch (evt.type) {
    case "player_added":
    case "player_renamed":
    case "player_removed":
      if (typeof evt.data.playerId !== "string" || !isValidPlayerId(evt.data.playerId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${evt.type} has invalid playerId`);
      }
      break;
    case "campaign_age_changed":
      if (evt.data.newAgeId !== null && !isValidAgeDefinitionId(evt.data.newAgeId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `campaign_age_changed has invalid newAgeId: ${evt.data.newAgeId}`);
      }
      break;
    case "facilitator_assignment_changed":
      if (evt.data.newPlayerId !== null && !isValidPlayerId(evt.data.newPlayerId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `facilitator_assignment_changed has invalid newPlayerId`);
      }
      break;
    case "wizard_created":
      if (typeof evt.data.wizardId !== "string" || !isValidWizardId(evt.data.wizardId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `wizard_created has invalid wizardId`);
      }
      if (!isValidPactSeatId(evt.data.assignedToSeatId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `wizard_created has invalid assignedToSeatId: ${evt.data.assignedToSeatId}`);
      }
      break;
    case "wizard_name_changed":
    case "wizard_portrayal_changed":
      if (typeof evt.data.wizardId !== "string" || !isValidWizardId(evt.data.wizardId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${evt.type} has invalid wizardId`);
      }
      break;
    case "pact_seat_wizard_changed":
      if (!isValidPactSeatId(evt.data.seatId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `pact_seat_wizard_changed has invalid seatId: ${evt.data.seatId}`);
      }
      break;
    case "pact_seat_status_changed": {
      if (!isValidPactSeatId(evt.data.seatId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `pact_seat_status_changed has invalid seatId: ${evt.data.seatId}`);
      }
      const validStatuses = ["present", "silent", "absent", null];
      if (!validStatuses.includes(evt.data.newStatus as any)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `pact_seat_status_changed has invalid newStatus: ${evt.data.newStatus}`);
      }
      break;
    }
    case "watcher_assignment_changed":
      if (!isValidPactSeatId(evt.data.seatId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `watcher_assignment_changed has invalid seatId: ${evt.data.seatId}`);
      }
      if (evt.data.newPlayerId !== null && !isValidPlayerId(evt.data.newPlayerId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `watcher_assignment_changed has invalid newPlayerId`);
      }
      break;
    default:
      break;
  }
}

async function validateBackupImportCoherence(
  input: CanonicalCommitInput,
  evt: CampaignEvent & { type: "backup_imported" },
): Promise<void> {
  const ctx = input.commandContext;
  if (!ctx || ctx.kind !== "backup_import") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "backup_import requires commandContext");
  }

  // Use the strict shared validation path for full V1 envelope verification
  const result = await fullyValidateBackup(ctx.backupJson, input.currentState);
  if ("error" in result) {
    throw new DomainError(result.error.code, result.error.message);
  }

  const { backup: validatedBackup, serverDigest } = result;

  // Verify event provenance matches validated backup provenance
  if (evt.data.backupFormatVersion !== validatedBackup.backupFormatVersion) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Event backupFormatVersion ${evt.data.backupFormatVersion} does not match backup ${validatedBackup.backupFormatVersion}`);
  }
  if (evt.data.sourceCampaignId !== validatedBackup.provenance.sourceCampaignId) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Event sourceCampaignId does not match backup provenance");
  }
  if (evt.data.sourceCampaignRevision !== validatedBackup.provenance.sourceCampaignRevision) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Event sourceCampaignRevision does not match backup provenance");
  }
  if (evt.data.sourceLogicalRevision !== validatedBackup.provenance.sourceLogicalRevision) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Event sourceLogicalRevision does not match backup provenance");
  }
  if (evt.data.exportedAtMs !== validatedBackup.provenance.exportedAtMs) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Event exportedAtMs does not match backup provenance");
  }
  if (evt.data.payloadDigest !== serverDigest) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Event payloadDigest does not match server-computed digest");
  }

  // Verify fingerprint matches expected (from server-computed digest)
  const expectedFingerprint = backupImportFingerprint(input.currentRevision, serverDigest);
  if (input.commandFingerprint !== expectedFingerprint) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `backup_import fingerprint "${input.commandFingerprint}" does not match expected "${expectedFingerprint}"`);
  }

  // Verify nextState deep-equals validated backup state
  if (!statesDeepEqual(input.nextState, validatedBackup.state)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "backup_import nextState does not match backup state");
  }
}

async function validateCheckpointRestoreCoherence(
  ctx: MutationCtx,
  input: CanonicalCommitInput,
): Promise<void> {
  const evt = input.events[0];
  if (evt.type !== "checkpoint_restored") return;

  const checkpointDocs = await ctx.db
    .query("campaignCheckpoints")
    .withIndex("by_checkpointId", (q) => q.eq("checkpointId", evt.data.checkpointId))
    .collect();

  if (checkpointDocs.length === 0) {
    throw new DomainError("CHECKPOINT_NOT_FOUND", `No checkpoint found with id "${evt.data.checkpointId}"`);
  }
  if (checkpointDocs.length > 1) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Found ${checkpointDocs.length} checkpoint documents for id "${evt.data.checkpointId}" — expected exactly 1`);
  }

  const checkpoint = checkpointDocs[0];

  // Validate persisted checkpoint metadata is canonical
  if (checkpoint.checkpointVersion !== CURRENT_CHECKPOINT_VERSION) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint has unrecognized checkpointVersion: ${checkpoint.checkpointVersion}`);
  }
  if (checkpoint.campaignId !== input.campaignId) {
    throw new DomainError("CHECKPOINT_NOT_FOUND", `Checkpoint does not belong to campaign "${input.campaignId}"`);
  }
  if (checkpoint.label !== normalizeCheckpointLabel(checkpoint.label)) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint has non-normalized persisted label`);
  }
  const storedLabelErr = validateCheckpointLabel(checkpoint.label);
  if (storedLabelErr !== null) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint has invalid persisted label: ${storedLabelErr}`);
  }
  if (!Number.isSafeInteger(checkpoint.createdAtMs) || checkpoint.createdAtMs < 0) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint has invalid createdAtMs`);
  }
  if (!Number.isSafeInteger(checkpoint.sourceRevision) || checkpoint.sourceRevision < 0) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint has invalid sourceRevision`);
  }

  // Load source snapshot
  const sourceSnapshot = await ctx.db
    .query("campaignSnapshots")
    .withIndex("by_campaign_revision", (q) =>
      q.eq("campaignId", input.campaignId).eq("campaignRevision", checkpoint.sourceRevision),
    )
    .unique();

  if (sourceSnapshot === null) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `No snapshot exists for checkpoint sourceRevision ${checkpoint.sourceRevision}`);
  }

  const migratedSourceState = loadCurrentFromHistorical(sourceSnapshot.state);

  // Verify source revision record if non-zero
  if (checkpoint.sourceRevision > 0) {
    const sourceRev = await ctx.db
      .query("campaignRevisions")
      .withIndex("by_campaign_revision", (q) =>
        q.eq("campaignId", input.campaignId).eq("campaignRevision", checkpoint.sourceRevision),
      )
      .unique();
    if (sourceRev === null) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint sourceRevision ${checkpoint.sourceRevision} has no revision record`);
    }
    if (!isLogicalStateCommandType(sourceRev.commandType)) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint sourceRevision ${checkpoint.sourceRevision} has non-logical-state commandType "${sourceRev.commandType}"`);
    }
  }

  // Verify nextState deep-equals migrated source snapshot
  if (!statesDeepEqual(input.nextState, migratedSourceState)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `checkpoint_restore nextState does not match source snapshot at revision ${checkpoint.sourceRevision}`);
  }

  // Verify event metadata
  if (evt.data.sourceRevision !== checkpoint.sourceRevision) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `checkpoint_restore event sourceRevision ${evt.data.sourceRevision} does not match checkpoint sourceRevision ${checkpoint.sourceRevision}`);
  }
  if (evt.data.labelAtRestore !== checkpoint.label) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `checkpoint_restore event labelAtRestore does not match checkpoint label`);
  }
}

export async function canonicalCommit(
  ctx: MutationCtx,
  input: CanonicalCommitInput,
): Promise<CanonicalCommitReceipt> {
  const newRevision = input.currentRevision + 1;

  // --- Deletion barrier: reject all gameplay writes while deleting ---
  await assertCampaignNotDeleting(ctx);

  // --- Event-level validation per event structure ---
  for (const evt of input.events) {
    switch (evt.type) {
      case "month_changed":
        if (evt.version !== 1) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Unsupported month_changed version: ${evt.version}`);
        }
        if (evt.data.direction !== "forward" && evt.data.direction !== "backward") {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid month_changed direction: ${evt.data.direction}`);
        }
        break;
      case "undo_applied":
        if (evt.version !== 1) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Unsupported undo_applied version: ${evt.version}`);
        }
        break;
      case "redo_applied":
        if (evt.version !== 1) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Unsupported redo_applied version: ${evt.version}`);
        }
        break;
      case "checkpoint_restored":
        if (evt.version !== 1) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Unsupported checkpoint_restored version: ${evt.version}`);
        }
        if (!isValidCheckpointId(evt.data.checkpointId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", "checkpoint_restored checkpointId is not valid");
        }
        if (!Number.isSafeInteger(evt.data.sourceRevision) || evt.data.sourceRevision < 0) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", "checkpoint_restored sourceRevision is not valid");
        }
        if (typeof evt.data.labelAtRestore !== "string" || evt.data.labelAtRestore.length === 0) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", "checkpoint_restored labelAtRestore is not valid");
        }
        break;
      case "backup_imported":
        if (evt.version !== 1) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Unsupported backup_imported version: ${evt.version}`);
        }
        if (evt.data.backupFormatVersion !== 1) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", "backup_imported backupFormatVersion is not valid");
        }
        if (typeof evt.data.sourceCampaignId !== "string" || !isValidCampaignId(evt.data.sourceCampaignId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", "backup_imported sourceCampaignId is not valid");
        }
        if (!Number.isSafeInteger(evt.data.sourceCampaignRevision) || evt.data.sourceCampaignRevision < 0) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", "backup_imported sourceCampaignRevision is not valid");
        }
        if (!Number.isSafeInteger(evt.data.sourceLogicalRevision) || evt.data.sourceLogicalRevision < 0) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", "backup_imported sourceLogicalRevision is not valid");
        }
        if (evt.data.sourceLogicalRevision > evt.data.sourceCampaignRevision) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", "backup_imported sourceLogicalRevision exceeds sourceCampaignRevision");
        }
        if (!Number.isSafeInteger(evt.data.exportedAtMs) || evt.data.exportedAtMs < 0) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", "backup_imported exportedAtMs is not valid");
        }
        if (typeof evt.data.payloadDigest !== "string" || !/^[0-9a-f]{64}$/.test(evt.data.payloadDigest)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", "backup_imported payloadDigest is not a valid sha256 hex string");
        }
        break;
      default:
        break;
    }
  }

  validateCampaignState(input.currentState);
  validateCampaignState(input.nextState);

  validateEventCoherence(input, newRevision);

  // --- Checkpoint restore coherence (independent DB verification) ---
  if (input.commandType === "checkpoint_restore") {
    await validateCheckpointRestoreCoherence(ctx, input);
  }

  // --- Backup import coherence (independent validation) ---
  if (input.commandType === "backup_import") {
    await validateBackupImportCoherence(input, input.events[0] as CampaignEvent & { type: "backup_imported" });
  }

  // --- Idempotency ---
  const existingCommand = await ctx.db
    .query("campaignRevisions")
    .withIndex("by_campaign_commandId", (q) =>
      q.eq("campaignId", input.campaignId).eq("commandId", input.commandId),
    )
    .unique();

  if (existingCommand !== null) {
    if (
      existingCommand.commandType !== input.commandType ||
      existingCommand.commandFingerprint !== input.commandFingerprint
    ) {
      throw new DomainError(
        "COMMAND_ID_REUSED",
        `CommandId "${input.commandId}" already committed with type="${existingCommand.commandType}" fingerprint="${existingCommand.commandFingerprint}", cannot reuse for type="${input.commandType}" fingerprint="${input.commandFingerprint}"`,
      );
    }

    const existingSnapshot = await ctx.db
      .query("campaignSnapshots")
      .withIndex("by_campaign_revision", (q) =>
        q.eq("campaignId", input.campaignId).eq("campaignRevision", existingCommand.campaignRevision),
      )
      .unique();

    if (existingSnapshot === null) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        `Snapshot missing for committed revision ${existingCommand.campaignRevision}`,
      );
    }

    const migratedExisting = loadCurrentFromHistorical(existingSnapshot.state);

    return {
      newRevision: existingCommand.campaignRevision,
      state: migratedExisting,
      alreadyApplied: true,
    };
  }

  // --- Load and validate history control ---
  const controlDocs = await ctx.db
    .query("campaignHistoryControl")
    .withIndex("by_campaignId", (q) => q.eq("campaignId", input.campaignId))
    .collect();

  if (controlDocs.length === 0) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", "History control document missing");
  }
  if (controlDocs.length > 1) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Found ${controlDocs.length} history control documents — expected exactly 1`);
  }

  const controlDoc = controlDocs[0];
  if (controlDoc.historyControlVersion !== CURRENT_HISTORY_CONTROL_VERSION) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Unrecognized historyControlVersion: ${controlDoc.historyControlVersion}`);
  }

  const control = {
    historyControlVersion: controlDoc.historyControlVersion as 1,
    campaignId: controlDoc.campaignId,
    undoStack: controlDoc.undoStack,
    redoStack: controlDoc.redoStack,
  };

  const structErrors = validateHistoryControlStructure({
    control,
    campaignId: input.campaignId,
    campaignRevision: input.currentRevision,
  });
  if (structErrors.length > 0) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `History control structural validation failed: ${structErrors.join("; ")}`);
  }

  // --- Pre-commit logical state coherence (Section 1) ---
  const logicalRevision = control.undoStack[control.undoStack.length - 1];

  const logicalSnapshot = await ctx.db
    .query("campaignSnapshots")
    .withIndex("by_campaign_revision", (q) =>
      q.eq("campaignId", input.campaignId).eq("campaignRevision", logicalRevision),
    )
    .unique();

  if (logicalSnapshot === null) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `No snapshot exists for current logical revision ${logicalRevision}`);
  }

  const migratedLogicalState = loadCurrentFromHistorical(logicalSnapshot.state);

  if (!statesDeepEqual(migratedLogicalState, input.currentState)) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Snapshot at undoStack top (revision ${logicalRevision}) does not match input.currentState`);
  }

  if (logicalRevision > 0) {
    const logicalRevRecord = await ctx.db
      .query("campaignRevisions")
      .withIndex("by_campaign_revision", (q) =>
        q.eq("campaignId", input.campaignId).eq("campaignRevision", logicalRevision),
      )
      .unique();
    if (logicalRevRecord === null) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `No revision record for current logical revision ${logicalRevision}`);
    }
    if (!isLogicalStateCommandType(logicalRevRecord.commandType)) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Current logical revision ${logicalRevision} has non-logical-state commandType "${logicalRevRecord.commandType}"`);
    }
  }

  // --- Derive next stacks ---
  let nextUndoStack: number[];
  let nextRedoStack: number[];

  if (input.historyControlUpdate.kind === "logical_state_append") {
    nextUndoStack = [...control.undoStack, newRevision];
    nextRedoStack = [];
  } else {
    nextUndoStack = [...input.historyControlUpdate.nextUndoStack];
    nextRedoStack = [...input.historyControlUpdate.nextRedoStack];
  }

  // --- Undo target validation (Section 2) ---
  if (input.commandType === "undo") {
    const undoEvt = input.events[0];
    if (undoEvt.type === "undo_applied") {
      const targetRev = undoEvt.data.targetRevision;

      const targetSnap = await ctx.db
        .query("campaignSnapshots")
        .withIndex("by_campaign_revision", (q) =>
          q.eq("campaignId", input.campaignId).eq("campaignRevision", targetRev),
        )
        .unique();

      if (targetSnap === null) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `No snapshot exists for undo target revision ${targetRev}`);
      }

      const migratedUndoTarget = loadCurrentFromHistorical(targetSnap.state);

      if (!statesDeepEqual(input.nextState, migratedUndoTarget)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `nextState does not match undo target snapshot at revision ${targetRev}`);
      }

      if (targetRev > 0) {
        const targetRevRecord = await ctx.db
          .query("campaignRevisions")
          .withIndex("by_campaign_revision", (q) =>
            q.eq("campaignId", input.campaignId).eq("campaignRevision", targetRev),
          )
          .unique();
        if (targetRevRecord === null) {
          throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Undo target revision ${targetRev} has no revision record`);
        }
        if (!isLogicalStateCommandType(targetRevRecord.commandType)) {
          throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Undo target revision ${targetRev} has non-logical-state commandType "${targetRevRecord.commandType}"`);
        }
      }

      const ucErrors = validateUndoTransactionCoherence({
        priorUndoStack: control.undoStack,
        priorRedoStack: control.redoStack,
        nextUndoStack,
        nextRedoStack,
        event: undoEvt,
        restoredState: input.nextState,
        targetSnapshotState: migratedUndoTarget,
        newAuditRevision: newRevision,
      });
      if (ucErrors.length > 0) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `undo coherence: ${ucErrors.join("; ")}`);
      }
    }
  }

  // --- Redo target validation (Section 3) ---
  if (input.commandType === "redo") {
    const redoEvt = input.events[0];
    if (redoEvt.type === "redo_applied") {
      const targetRev = redoEvt.data.targetRevision;

      if (targetRev === 0) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "Redo target revision 0 is not legal");
      }

      const targetSnap = await ctx.db
        .query("campaignSnapshots")
        .withIndex("by_campaign_revision", (q) =>
          q.eq("campaignId", input.campaignId).eq("campaignRevision", targetRev),
        )
        .unique();

      if (targetSnap === null) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `No snapshot exists for redo target revision ${targetRev}`);
      }

      const migratedRedoTarget = loadCurrentFromHistorical(targetSnap.state);

      if (!statesDeepEqual(input.nextState, migratedRedoTarget)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `nextState does not match redo target snapshot at revision ${targetRev}`);
      }

      const targetRevRecord = await ctx.db
        .query("campaignRevisions")
        .withIndex("by_campaign_revision", (q) =>
          q.eq("campaignId", input.campaignId).eq("campaignRevision", targetRev),
        )
        .unique();
      if (targetRevRecord === null) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Redo target revision ${targetRev} has no revision record`);
      }
      if (!isLogicalStateCommandType(targetRevRecord.commandType)) {
        throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Redo target revision ${targetRev} has non-logical-state commandType "${targetRevRecord.commandType}"`);
      }

      const rcErrors = validateRedoTransactionCoherence({
        priorUndoStack: control.undoStack,
        priorRedoStack: control.redoStack,
        nextUndoStack,
        nextRedoStack,
        event: redoEvt,
        restoredState: input.nextState,
        targetSnapshotState: migratedRedoTarget,
        newAuditRevision: newRevision,
      });
      if (rcErrors.length > 0) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `redo coherence: ${rcErrors.join("; ")}`);
      }
    }
  }

  // --- Final history-control validation (Section 4) ---
  const proposedControlStructErrors = validateHistoryControlStructure({
    control: {
      historyControlVersion: 1,
      campaignId: input.campaignId,
      undoStack: nextUndoStack,
      redoStack: nextRedoStack,
    },
    campaignId: input.campaignId,
    campaignRevision: newRevision,
  });
  if (proposedControlStructErrors.length > 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Proposed history control validation failed: ${proposedControlStructErrors.join("; ")}`);
  }

  if (input.historyControlUpdate.kind === "history_navigation") {
    if (nextUndoStack.includes(newRevision)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `New audit revision ${newRevision} must not appear in nextUndoStack for history_navigation`);
    }
    if (nextRedoStack.includes(newRevision)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `New audit revision ${newRevision} must not appear in nextRedoStack for history_navigation`);
    }
  }

  // --- Persist: revision record ---
  await ctx.db.insert("campaignRevisions", {
    campaignId: input.campaignId,
    campaignRevision: newRevision,
    commandId: input.commandId,
    commandType: input.commandType,
    commandFingerprint: input.commandFingerprint,
  });

  // --- Persist: event records ---
  for (let i = 0; i < input.events.length; i++) {
    const evt = input.events[i];
    const baseRecord = {
      campaignId: input.campaignId,
      campaignRevision: newRevision,
      eventIndex: i,
    };

    switch (evt.type) {
      case "month_changed":
        await ctx.db.insert("campaignEvents", {
          ...baseRecord,
          event: {
            type: "month_changed" as const,
            version: 1 as const,
            data: {
              direction: evt.data.direction,
              fromOrdinal: evt.data.fromOrdinal as number,
              toOrdinal: evt.data.toOrdinal as number,
            },
          },
        });
        break;
      case "undo_applied":
        await ctx.db.insert("campaignEvents", {
          ...baseRecord,
          event: {
            type: "undo_applied" as const,
            version: 1 as const,
            data: {
              fromRevision: evt.data.fromRevision,
              targetRevision: evt.data.targetRevision,
            },
          },
        });
        break;
      case "redo_applied":
        await ctx.db.insert("campaignEvents", {
          ...baseRecord,
          event: {
            type: "redo_applied" as const,
            version: 1 as const,
            data: {
              fromRevision: evt.data.fromRevision,
              targetRevision: evt.data.targetRevision,
            },
          },
        });
        break;
      case "checkpoint_restored":
        await ctx.db.insert("campaignEvents", {
          ...baseRecord,
          event: {
            type: "checkpoint_restored" as const,
            version: 1 as const,
            data: {
              checkpointId: evt.data.checkpointId,
              sourceRevision: evt.data.sourceRevision,
              labelAtRestore: evt.data.labelAtRestore,
            },
          },
        });
        break;
      case "backup_imported":
        await ctx.db.insert("campaignEvents", {
          ...baseRecord,
          event: {
            type: "backup_imported" as const,
            version: 1 as const,
            data: {
              backupFormatVersion: evt.data.backupFormatVersion,
              sourceCampaignId: evt.data.sourceCampaignId,
              sourceCampaignRevision: evt.data.sourceCampaignRevision,
              sourceLogicalRevision: evt.data.sourceLogicalRevision,
              exportedAtMs: evt.data.exportedAtMs,
              payloadDigest: evt.data.payloadDigest,
            },
          },
        });
        break;
      default:
        await ctx.db.insert("campaignEvents", {
          ...baseRecord,
          event: evt as any,
        });
        break;
    }
  }

  assertPortableCampaignState(input.nextState);

  await ctx.db.insert("campaignSnapshots", snapshotRecord(input.campaignId, newRevision, input.nextState));

  // --- Update campaign document ---
  await ctx.db.patch(input.campaignDocId, campaignPatch(newRevision, input.nextState));

  // --- Update history control ---
  await ctx.db.patch(controlDoc._id, {
    undoStack: nextUndoStack,
    redoStack: nextRedoStack,
  });

  return {
    newRevision,
    state: input.nextState,
    alreadyApplied: false,
  };
}
