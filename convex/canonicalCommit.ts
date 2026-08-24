import type { MutationCtx } from "./_generated/server";
import type { CampaignCommandType, CurrentCampaignState, MonthChangedEventV1, MonthDirection, EventRecord } from "../shared/domain";
import { validateCampaignState, DomainError, advanceOrdinal, validateMoveMonthTransaction, isLogicalStateCommandType, CURRENT_HISTORY_CONTROL_VERSION, validateHistoryControlStructure, statesDeepEqual } from "../shared/domain";
import type { Id } from "./_generated/dataModel";

export interface CanonicalCommitInput {
  campaignDocId: Id<"campaigns">;
  campaignId: string;
  currentRevision: number;
  currentState: CurrentCampaignState;
  commandId: string;
  commandType: CampaignCommandType;
  commandFingerprint: string;
  nextState: CurrentCampaignState;
  events: readonly MonthChangedEventV1[];
}

export interface CanonicalCommitReceipt {
  newRevision: number;
  state: CurrentCampaignState;
  alreadyApplied: boolean;
}

function validateEventCoherence(
  currentState: CurrentCampaignState,
  nextState: CurrentCampaignState,
  events: readonly MonthChangedEventV1[],
  commandType: CampaignCommandType,
  commandFingerprint: string,
): void {
  if (commandType === "move_month") {
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
    return;
  }

  if (events.length !== 1) return;
  const evt = events[0];
  if (evt.data.fromOrdinal as number !== currentState.calendar.monthOrdinal as number) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Event fromOrdinal ${evt.data.fromOrdinal} does not match current state monthOrdinal ${currentState.calendar.monthOrdinal}`,
    );
  }
  const expectedTo = advanceOrdinal(evt.data.fromOrdinal, evt.data.direction as MonthDirection);
  if (evt.data.toOrdinal as number !== expectedTo as number) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Event toOrdinal ${evt.data.toOrdinal} is inconsistent with direction "${evt.data.direction}" from ${evt.data.fromOrdinal}`,
    );
  }
  if (nextState.calendar.monthOrdinal as number !== evt.data.toOrdinal as number) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Next state monthOrdinal ${nextState.calendar.monthOrdinal} does not match event toOrdinal ${evt.data.toOrdinal}`,
    );
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

  for (const evt of input.events) {
    if (evt.type !== "month_changed" || evt.version !== 1) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Invalid event structure: type="${evt.type}" version=${evt.version}`,
      );
    }
    if (evt.data.direction !== "forward" && evt.data.direction !== "backward") {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Invalid event direction: "${evt.data.direction}"`,
      );
    }
    if (!Number.isSafeInteger(evt.data.fromOrdinal as number)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Event fromOrdinal is not a safe integer");
    }
    if (!Number.isSafeInteger(evt.data.toOrdinal as number)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Event toOrdinal is not a safe integer");
    }
  }

  validateCampaignState(input.currentState);
  validateCampaignState(input.nextState);

  validateEventCoherence(input.currentState, input.nextState, input.events, input.commandType, input.commandFingerprint);

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

  await ctx.db.insert("campaignRevisions", {
    campaignId: input.campaignId,
    campaignRevision: newRevision,
    commandId: input.commandId,
    commandType: input.commandType,
    commandFingerprint: input.commandFingerprint,
  });

  for (let i = 0; i < input.events.length; i++) {
    const evt = input.events[i];
    await ctx.db.insert("campaignEvents", {
      campaignId: input.campaignId,
      campaignRevision: newRevision,
      eventIndex: i,
      event: {
        type: evt.type,
        version: evt.version,
        data: {
          direction: evt.data.direction,
          fromOrdinal: evt.data.fromOrdinal as number,
          toOrdinal: evt.data.toOrdinal as number,
        },
      },
    });
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

  // Transitional history-control maintenance:
  // If a valid control record exists, update it atomically within this transaction.
  // If none exists, proceed without history-control writes (pre-migration).
  if (isLogicalStateCommandType(input.commandType)) {
    const controlDocs = await ctx.db
      .query("campaignHistoryControl")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", input.campaignId))
      .collect();

    if (controlDocs.length > 1) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        `Found ${controlDocs.length} history control documents for campaign — expected at most 1`,
      );
    }

    if (controlDocs.length === 1) {
      const controlDoc = controlDocs[0];

      // Structural validation against PRE-COMMIT revision
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

      // undoStack.last must reference an existing snapshot
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

      // Snapshot at undoStack top must deep-equal the PRE-COMMIT authoritative state
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

      // undoStack top must be a logical-state revision (or 0)
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

      await ctx.db.patch(controlDoc._id, {
        undoStack: [...controlDoc.undoStack, newRevision],
        redoStack: [],
      });
    }
  }

  return {
    newRevision,
    state: input.nextState,
    alreadyApplied: false,
  };
}
