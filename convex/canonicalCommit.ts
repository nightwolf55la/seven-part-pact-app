import type { MutationCtx } from "./_generated/server";
import type { CampaignCommandType, CurrentCampaignState, CampaignEvent, MonthDirection, EventRecord } from "../shared/domain";
import { validateCampaignState, DomainError, advanceOrdinal, validateMoveMonthTransaction, isLogicalStateCommandType, CURRENT_HISTORY_CONTROL_VERSION, validateHistoryControlStructure, statesDeepEqual, isValidCheckpointId, validateCheckpointLabel, normalizeCheckpointLabel, checkpointRestoreFingerprint, CURRENT_CHECKPOINT_VERSION } from "../shared/domain";
import { validateUndoTransactionCoherence, validateRedoTransactionCoherence } from "../shared/domain/undo-redo";
import type { Id } from "./_generated/dataModel";

export type HistoryControlUpdate =
  | { readonly kind: "logical_state_append" }
  | { readonly kind: "history_navigation"; readonly nextUndoStack: readonly number[]; readonly nextRedoStack: readonly number[] };

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
        events as unknown as readonly EventRecord["event"][],
        nextState,
        commandFingerprint,
      );
      if (moveErrors.length > 0) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `move_month transaction invariant violated: ${moveErrors.join("; ")}`,
        );
      }
      break;
    }
    case "legacy_month_change": {
      if (events.length !== 1) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "legacy_month_change must produce exactly one event");
      }
      const evt = events[0];
      if (evt.type !== "month_changed" || evt.version !== 1) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `legacy_month_change event must be month_changed v1, got type="${evt.type}" version=${evt.version}`);
      }
      if (evt.data.fromOrdinal as number !== currentState.calendar.monthOrdinal as number) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Event fromOrdinal does not match current state`);
      }
      const expectedTo = advanceOrdinal(evt.data.fromOrdinal, evt.data.direction as MonthDirection);
      if (evt.data.toOrdinal as number !== expectedTo as number) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Event toOrdinal inconsistent with direction`);
      }
      if (nextState.calendar.monthOrdinal as number !== evt.data.toOrdinal as number) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Next state monthOrdinal does not match event toOrdinal`);
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
        throw new DomainError("INVALID_CAMPAIGN_STATE", `checkpoint_restore event has invalid checkpointId: "${evt.data.checkpointId}"`);
      }
      if (!Number.isSafeInteger(evt.data.sourceRevision) || evt.data.sourceRevision < 0) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `checkpoint_restore event sourceRevision is not a non-negative safe integer: ${evt.data.sourceRevision}`);
      }
      const labelError = validateCheckpointLabel(evt.data.labelAtRestore);
      if (labelError !== null) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `checkpoint_restore event labelAtRestore invalid: ${labelError}`);
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
      const _exhaustive: never = commandType;
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown command type: ${_exhaustive}`);
    }
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
  if (!isValidCheckpointId(checkpoint.checkpointId)) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Persisted checkpoint has invalid checkpointId format: "${checkpoint.checkpointId}"`);
  }
  if (checkpoint.checkpointId !== evt.data.checkpointId) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Persisted checkpointId "${checkpoint.checkpointId}" does not match event checkpointId "${evt.data.checkpointId}"`);
  }
  if (checkpoint.campaignId !== input.campaignId) {
    throw new DomainError("CHECKPOINT_NOT_FOUND", `Checkpoint "${evt.data.checkpointId}" does not belong to this campaign`);
  }
  if (checkpoint.label !== normalizeCheckpointLabel(checkpoint.label)) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Persisted checkpoint label is not normalized: "${checkpoint.label}"`);
  }
  const storedLabelErr = validateCheckpointLabel(checkpoint.label);
  if (storedLabelErr !== null) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Persisted checkpoint label invalid: ${storedLabelErr}`);
  }
  if (checkpoint.label !== evt.data.labelAtRestore) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint label "${checkpoint.label}" does not match event labelAtRestore "${evt.data.labelAtRestore}"`);
  }
  if (!Number.isSafeInteger(checkpoint.createdAtMs) || checkpoint.createdAtMs < 0) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Persisted checkpoint createdAtMs is not a non-negative safe integer: ${checkpoint.createdAtMs}`);
  }
  if (!Number.isSafeInteger(checkpoint.sourceRevision) || checkpoint.sourceRevision < 0) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Persisted checkpoint sourceRevision is not a non-negative safe integer: ${checkpoint.sourceRevision}`);
  }
  if (checkpoint.sourceRevision > input.currentRevision) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint sourceRevision ${checkpoint.sourceRevision} exceeds current campaignRevision ${input.currentRevision}`);
  }
  if (checkpoint.sourceRevision !== evt.data.sourceRevision) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint sourceRevision ${checkpoint.sourceRevision} does not match event sourceRevision ${evt.data.sourceRevision}`);
  }

  if (checkpoint.sourceRevision > 0) {
    const sourceRevRec = await ctx.db
      .query("campaignRevisions")
      .withIndex("by_campaign_revision", (q) =>
        q.eq("campaignId", input.campaignId).eq("campaignRevision", checkpoint.sourceRevision),
      )
      .unique();

    if (sourceRevRec === null) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint sourceRevision ${checkpoint.sourceRevision} has no revision record`);
    }
    if (!isLogicalStateCommandType(sourceRevRec.commandType)) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Checkpoint sourceRevision ${checkpoint.sourceRevision} has non-logical-state commandType "${sourceRevRec.commandType}"`);
    }
  }

  const sourceSnapshot = await ctx.db
    .query("campaignSnapshots")
    .withIndex("by_campaign_revision", (q) =>
      q.eq("campaignId", input.campaignId).eq("campaignRevision", checkpoint.sourceRevision),
    )
    .unique();

  if (sourceSnapshot === null) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `No snapshot exists for checkpoint sourceRevision ${checkpoint.sourceRevision}`);
  }

  validateCampaignState(sourceSnapshot.state as CurrentCampaignState);

  if (!statesDeepEqual(sourceSnapshot.state, {
    schemaVersion: input.nextState.schemaVersion,
    ruleset: { id: input.nextState.ruleset.id, version: input.nextState.ruleset.version },
    calendar: { monthOrdinal: input.nextState.calendar.monthOrdinal as number },
  })) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", `checkpoint_restore nextState does not match source snapshot at revision ${checkpoint.sourceRevision}`);
  }
}

export async function canonicalCommit(
  ctx: MutationCtx,
  input: CanonicalCommitInput,
): Promise<CanonicalCommitReceipt> {
  if (!Number.isSafeInteger(input.currentRevision) || input.currentRevision < 0) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `currentRevision must be a non-negative safe integer, got ${input.currentRevision}`,
    );
  }

  const newRevision = input.currentRevision + 1;
  if (!Number.isSafeInteger(newRevision)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Incrementing revision would exceed safe integer range`,
    );
  }

  if (input.events.length === 0) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Canonical commit requires at least one domain event",
    );
  }

  // Validate kind/commandType consistency
  if (isLogicalStateCommandType(input.commandType)) {
    if (input.historyControlUpdate.kind !== "logical_state_append") {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Logical-state command "${input.commandType}" must use logical_state_append history update`,
      );
    }
  } else {
    if (input.historyControlUpdate.kind !== "history_navigation") {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `History-navigation command "${input.commandType}" must use history_navigation history update`,
      );
    }
  }

  // Validate event structures
  for (const evt of input.events) {
    switch (evt.type) {
      case "month_changed":
        if (evt.version !== 1) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Unsupported month_changed version: ${evt.version}`);
        }
        if (evt.data.direction !== "forward" && evt.data.direction !== "backward") {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid event direction: "${evt.data.direction}"`);
        }
        if (!Number.isSafeInteger(evt.data.fromOrdinal as number)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", "Event fromOrdinal is not a safe integer");
        }
        if (!Number.isSafeInteger(evt.data.toOrdinal as number)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", "Event toOrdinal is not a safe integer");
        }
        break;
      case "undo_applied":
        if (evt.version !== 1) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Unsupported undo_applied version: ${evt.version}`);
        }
        if (!Number.isSafeInteger(evt.data.fromRevision) || evt.data.fromRevision < 0) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", "undo_applied fromRevision is not valid");
        }
        if (!Number.isSafeInteger(evt.data.targetRevision) || evt.data.targetRevision < 0) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", "undo_applied targetRevision is not valid");
        }
        break;
      case "redo_applied":
        if (evt.version !== 1) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Unsupported redo_applied version: ${evt.version}`);
        }
        if (!Number.isSafeInteger(evt.data.fromRevision) || evt.data.fromRevision < 0) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", "redo_applied fromRevision is not valid");
        }
        if (!Number.isSafeInteger(evt.data.targetRevision) || evt.data.targetRevision < 0) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", "redo_applied targetRevision is not valid");
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
      default: {
        const _exhaustive: never = evt;
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown event type: ${(_exhaustive as any).type}`);
      }
    }
  }

  validateCampaignState(input.currentState);
  validateCampaignState(input.nextState);

  validateEventCoherence(input, newRevision);

  // --- Checkpoint restore coherence (independent DB verification) ---
  if (input.commandType === "checkpoint_restore") {
    await validateCheckpointRestoreCoherence(ctx, input);
  }

  // --- Idempotency ---
  const existingCommand = await ctx.db
    .query("campaignRevisions")
    .withIndex("by_campaign_commandId", (q) =>
      q.eq("campaignId", input.campaignId).eq("commandId", input.commandId),
    )
    .unique();

  if (existingCommand !== null) {
    if (existingCommand.commandType !== input.commandType || existingCommand.commandFingerprint !== input.commandFingerprint) {
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
        `Revision ${existingCommand.campaignRevision} exists but its snapshot is missing`,
      );
    }

    validateCampaignState(existingSnapshot.state);

    return {
      newRevision: existingCommand.campaignRevision,
      state: existingSnapshot.state as CurrentCampaignState,
      alreadyApplied: true,
    };
  }

  // --- Atomic writes ---
  await ctx.db.insert("campaignRevisions", {
    campaignId: input.campaignId,
    campaignRevision: newRevision,
    commandId: input.commandId,
    commandType: input.commandType,
    commandFingerprint: input.commandFingerprint,
  });

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
      default: {
        const _exhaustive: never = evt;
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown event type in write: ${(_exhaustive as any).type}`);
      }
    }
  }

  const snapshotState = {
    schemaVersion: input.nextState.schemaVersion,
    ruleset: {
      id: input.nextState.ruleset.id,
      version: input.nextState.ruleset.version,
    },
    calendar: {
      monthOrdinal: input.nextState.calendar.monthOrdinal as number,
    },
  };

  await ctx.db.insert("campaignSnapshots", {
    campaignId: input.campaignId,
    campaignRevision: newRevision,
    state: snapshotState,
  });

  await ctx.db.patch(input.campaignDocId, {
    campaignKey: "default" as const,
    campaignId: input.campaignId,
    campaignRevision: newRevision,
    state: snapshotState,
  });

  // --- History control update ---
  const controlDocs = await ctx.db
    .query("campaignHistoryControl")
    .withIndex("by_campaignId", (q) => q.eq("campaignId", input.campaignId))
    .collect();

  if (controlDocs.length > 1) {
    throw new DomainError(
      "CAMPAIGN_STATE_CORRUPT",
      `Found ${controlDocs.length} history control documents for campaign — expected exactly 1`,
    );
  }

  if (controlDocs.length === 0) {
    throw new DomainError(
      "CAMPAIGN_STATE_CORRUPT",
      "History control document missing — cannot commit without initialized history control",
    );
  }

  const controlDoc = controlDocs[0];

  if (controlDoc.historyControlVersion !== CURRENT_HISTORY_CONTROL_VERSION) {
    throw new DomainError(
      "CAMPAIGN_STATE_CORRUPT",
      `Unrecognized historyControlVersion: ${controlDoc.historyControlVersion}`,
    );
  }

  let newUndoStack: number[];
  let newRedoStack: number[];

  if (input.historyControlUpdate.kind === "logical_state_append") {
    // Validate current control against pre-commit state
    const structuralErrors = validateHistoryControlStructure({
      control: {
        historyControlVersion: controlDoc.historyControlVersion as 1,
        campaignId: controlDoc.campaignId,
        undoStack: controlDoc.undoStack,
        redoStack: controlDoc.redoStack,
      },
      campaignId: input.campaignId,
      campaignRevision: input.currentRevision,
    });
    if (structuralErrors.length > 0) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        `History control failed structural validation: ${structuralErrors.join("; ")}`,
      );
    }

    const undoTop = controlDoc.undoStack[controlDoc.undoStack.length - 1];
    const topSnapshot = await ctx.db
      .query("campaignSnapshots")
      .withIndex("by_campaign_revision", (q) =>
        q.eq("campaignId", input.campaignId).eq("campaignRevision", undoTop),
      )
      .unique();

    if (topSnapshot === null) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        `History control undoStack top (revision ${undoTop}) has no snapshot`,
      );
    }

    if (!statesDeepEqual(topSnapshot.state, {
      schemaVersion: input.currentState.schemaVersion,
      ruleset: { id: input.currentState.ruleset.id, version: input.currentState.ruleset.version },
      calendar: { monthOrdinal: input.currentState.calendar.monthOrdinal as number },
    })) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        `History control undoStack top snapshot (revision ${undoTop}) does not match pre-commit campaign state`,
      );
    }

    if (undoTop !== 0) {
      const topRevision = await ctx.db
        .query("campaignRevisions")
        .withIndex("by_campaign_revision", (q) =>
          q.eq("campaignId", input.campaignId).eq("campaignRevision", undoTop),
        )
        .unique();

      if (topRevision === null) {
        throw new DomainError(
          "CAMPAIGN_STATE_CORRUPT",
          `History control undoStack top revision ${undoTop} has no revision record`,
        );
      }

      if (!isLogicalStateCommandType(topRevision.commandType)) {
        throw new DomainError(
          "CAMPAIGN_STATE_CORRUPT",
          `History control undoStack top revision ${undoTop} has non-logical-state commandType "${topRevision.commandType}"`,
        );
      }
    }

    newUndoStack = [...controlDoc.undoStack, newRevision];
    newRedoStack = [];
  } else {
    // history_navigation: full coherence verification against authoritative prior stacks
    const priorUndoStack = controlDoc.undoStack;
    const priorRedoStack = controlDoc.redoStack;

    const priorStructErrors = validateHistoryControlStructure({
      control: {
        historyControlVersion: controlDoc.historyControlVersion as 1,
        campaignId: controlDoc.campaignId,
        undoStack: priorUndoStack,
        redoStack: priorRedoStack,
      },
      campaignId: input.campaignId,
      campaignRevision: input.currentRevision,
    });
    if (priorStructErrors.length > 0) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        `History control failed pre-commit structural validation: ${priorStructErrors.join("; ")}`,
      );
    }

    const undoTop = priorUndoStack[priorUndoStack.length - 1];
    const topSnapshot = await ctx.db
      .query("campaignSnapshots")
      .withIndex("by_campaign_revision", (q) =>
        q.eq("campaignId", input.campaignId).eq("campaignRevision", undoTop),
      )
      .unique();
    if (topSnapshot === null) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        `History control undoStack top (revision ${undoTop}) has no snapshot`,
      );
    }
    if (!statesDeepEqual(topSnapshot.state, {
      schemaVersion: input.currentState.schemaVersion,
      ruleset: { id: input.currentState.ruleset.id, version: input.currentState.ruleset.version },
      calendar: { monthOrdinal: input.currentState.calendar.monthOrdinal as number },
    })) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        `History control undoStack top snapshot (revision ${undoTop}) does not match pre-commit campaign state`,
      );
    }

    const navEvent = input.events[0];

    if (input.commandType === "undo") {
      const targetRevision = (navEvent as any).data.targetRevision as number;
      const targetSnap = await ctx.db
        .query("campaignSnapshots")
        .withIndex("by_campaign_revision", (q) =>
          q.eq("campaignId", input.campaignId).eq("campaignRevision", targetRevision),
        )
        .unique();
      if (targetSnap === null) {
        throw new DomainError(
          "CAMPAIGN_STATE_CORRUPT",
          `Undo target revision ${targetRevision} snapshot missing`,
        );
      }
      validateCampaignState(targetSnap.state as CurrentCampaignState);
      if (!statesDeepEqual(targetSnap.state, {
        schemaVersion: input.nextState.schemaVersion,
        ruleset: { id: input.nextState.ruleset.id, version: input.nextState.ruleset.version },
        calendar: { monthOrdinal: input.nextState.calendar.monthOrdinal as number },
      })) {
        throw new DomainError(
          "CAMPAIGN_STATE_CORRUPT",
          `Undo nextState does not match target snapshot at revision ${targetRevision}`,
        );
      }

      if (targetRevision > 0) {
        const targetRevRec = await ctx.db
          .query("campaignRevisions")
          .withIndex("by_campaign_revision", (q) =>
            q.eq("campaignId", input.campaignId).eq("campaignRevision", targetRevision),
          )
          .unique();
        if (targetRevRec === null) {
          throw new DomainError(
            "CAMPAIGN_STATE_CORRUPT",
            `Undo target revision ${targetRevision} has no revision record`,
          );
        }
        if (!isLogicalStateCommandType(targetRevRec.commandType)) {
          throw new DomainError(
            "CAMPAIGN_STATE_CORRUPT",
            `Undo target revision ${targetRevision} has non-logical-state commandType "${targetRevRec.commandType}"`,
          );
        }
      }

      const undoCoherenceErrors = validateUndoTransactionCoherence({
        priorUndoStack,
        priorRedoStack,
        nextUndoStack: input.historyControlUpdate.nextUndoStack as number[],
        nextRedoStack: input.historyControlUpdate.nextRedoStack as number[],
        event: navEvent as any,
        restoredState: input.nextState,
        targetSnapshotState: targetSnap.state as CurrentCampaignState,
        newAuditRevision: newRevision,
      });
      if (undoCoherenceErrors.length > 0) {
        throw new DomainError(
          "CAMPAIGN_STATE_CORRUPT",
          `Undo transaction coherence failed: ${undoCoherenceErrors.join("; ")}`,
        );
      }
    } else {
      const targetRevision = (navEvent as any).data.targetRevision as number;
      const targetSnap = await ctx.db
        .query("campaignSnapshots")
        .withIndex("by_campaign_revision", (q) =>
          q.eq("campaignId", input.campaignId).eq("campaignRevision", targetRevision),
        )
        .unique();
      if (targetSnap === null) {
        throw new DomainError(
          "CAMPAIGN_STATE_CORRUPT",
          `Redo target revision ${targetRevision} snapshot missing`,
        );
      }
      validateCampaignState(targetSnap.state as CurrentCampaignState);
      if (!statesDeepEqual(targetSnap.state, {
        schemaVersion: input.nextState.schemaVersion,
        ruleset: { id: input.nextState.ruleset.id, version: input.nextState.ruleset.version },
        calendar: { monthOrdinal: input.nextState.calendar.monthOrdinal as number },
      })) {
        throw new DomainError(
          "CAMPAIGN_STATE_CORRUPT",
          `Redo nextState does not match target snapshot at revision ${targetRevision}`,
        );
      }

      const targetRevRec = await ctx.db
        .query("campaignRevisions")
        .withIndex("by_campaign_revision", (q) =>
          q.eq("campaignId", input.campaignId).eq("campaignRevision", targetRevision),
        )
        .unique();
      if (targetRevRec === null) {
        throw new DomainError(
          "CAMPAIGN_STATE_CORRUPT",
          `Redo target revision ${targetRevision} has no revision record`,
        );
      }
      if (!isLogicalStateCommandType(targetRevRec.commandType)) {
        throw new DomainError(
          "CAMPAIGN_STATE_CORRUPT",
          `Redo target revision ${targetRevision} has non-logical-state commandType "${targetRevRec.commandType}"`,
        );
      }

      const redoCoherenceErrors = validateRedoTransactionCoherence({
        priorUndoStack,
        priorRedoStack,
        nextUndoStack: input.historyControlUpdate.nextUndoStack as number[],
        nextRedoStack: input.historyControlUpdate.nextRedoStack as number[],
        event: navEvent as any,
        restoredState: input.nextState,
        targetSnapshotState: targetSnap.state as CurrentCampaignState,
        newAuditRevision: newRevision,
      });
      if (redoCoherenceErrors.length > 0) {
        throw new DomainError(
          "CAMPAIGN_STATE_CORRUPT",
          `Redo transaction coherence failed: ${redoCoherenceErrors.join("; ")}`,
        );
      }
    }

    const proposedControl = {
      historyControlVersion: 1 as const,
      campaignId: input.campaignId,
      undoStack: input.historyControlUpdate.nextUndoStack as number[],
      redoStack: input.historyControlUpdate.nextRedoStack as number[],
    };
    const proposedErrors = validateHistoryControlStructure({
      control: proposedControl,
      campaignId: input.campaignId,
      campaignRevision: newRevision,
    });
    if (proposedErrors.length > 0) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        `Proposed history-control stacks are invalid: ${proposedErrors.join("; ")}`,
      );
    }

    newUndoStack = [...input.historyControlUpdate.nextUndoStack];
    newRedoStack = [...input.historyControlUpdate.nextRedoStack];
  }

  await ctx.db.patch(controlDoc._id, {
    undoStack: newUndoStack,
    redoStack: newRedoStack,
  });

  return {
    newRevision,
    state: input.nextState,
    alreadyApplied: false,
  };
}
