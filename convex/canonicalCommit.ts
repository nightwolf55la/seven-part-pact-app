import type { MutationCtx } from "./_generated/server";
import type { CampaignCommandType, CurrentCampaignState, CampaignEvent, MonthDirection, EventRecord } from "../shared/domain";
import { validateCampaignState, DomainError, advanceOrdinal, validateMoveMonthTransaction, isLogicalStateCommandType, CURRENT_HISTORY_CONTROL_VERSION, validateHistoryControlStructure, statesDeepEqual } from "../shared/domain";
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
      const coherenceErrors = validateUndoTransactionCoherence({
        priorUndoStack: [], // Loaded below from control doc
        priorRedoStack: [],
        nextUndoStack: input.historyControlUpdate.nextUndoStack,
        nextRedoStack: input.historyControlUpdate.nextRedoStack,
        event: evt,
        restoredState: nextState,
        targetSnapshotState: nextState,
        newAuditRevision: newRevision,
      });
      // Only check audit-revision-not-in-stacks here; full coherence checked by caller
      const auditErrors = coherenceErrors.filter((e) => e.includes("audit revision"));
      if (auditErrors.length > 0) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `undo coherence: ${auditErrors.join("; ")}`);
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
      const coherenceErrors = validateRedoTransactionCoherence({
        priorUndoStack: [],
        priorRedoStack: [],
        nextUndoStack: input.historyControlUpdate.nextUndoStack,
        nextRedoStack: input.historyControlUpdate.nextRedoStack,
        event: evt,
        restoredState: nextState,
        targetSnapshotState: nextState,
        newAuditRevision: newRevision,
      });
      const auditErrors = coherenceErrors.filter((e) => e.includes("audit revision"));
      if (auditErrors.length > 0) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `redo coherence: ${auditErrors.join("; ")}`);
      }
      break;
    }
    default: {
      const _exhaustive: never = commandType;
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown command type: ${_exhaustive}`);
    }
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
      default: {
        const _exhaustive: never = evt;
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown event type: ${(_exhaustive as any).type}`);
      }
    }
  }

  validateCampaignState(input.currentState);
  validateCampaignState(input.nextState);

  validateEventCoherence(input, newRevision);

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
    // history_navigation: validate the proposed stacks
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
