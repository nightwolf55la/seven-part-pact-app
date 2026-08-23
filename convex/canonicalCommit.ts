import type { MutationCtx } from "./_generated/server";
import type { CampaignCommandType, CurrentCampaignState, MonthChangedEventV1 } from "../shared/domain";
import { validateCampaignState, DomainError } from "../shared/domain";
import type { Id } from "./_generated/dataModel";

export interface CanonicalCommitInput {
  campaignDocId: Id<"campaigns">;
  campaignId: string;
  currentRevision: number;
  currentState: CurrentCampaignState;
  commandId: string;
  commandType: CampaignCommandType;
  nextState: CurrentCampaignState;
  events: readonly MonthChangedEventV1[];
}

export interface CanonicalCommitReceipt {
  newRevision: number;
  state: CurrentCampaignState;
  alreadyApplied: boolean;
}

export async function canonicalCommit(
  ctx: MutationCtx,
  input: CanonicalCommitInput,
): Promise<CanonicalCommitReceipt> {
  const existingCommand = await ctx.db
    .query("campaignRevisions")
    .withIndex("by_campaign_commandId", (q) =>
      q.eq("campaignId", input.campaignId).eq("commandId", input.commandId),
    )
    .unique();

  if (existingCommand !== null) {
    if (existingCommand.commandType !== input.commandType) {
      throw new DomainError(
        "COMMAND_ID_REUSED",
        `CommandId "${input.commandId}" already committed with type "${existingCommand.commandType}", cannot reuse for "${input.commandType}"`,
      );
    }

    const existingSnapshot = await ctx.db
      .query("campaignSnapshots")
      .withIndex("by_campaign_revision", (q) =>
        q.eq("campaignId", input.campaignId).eq("campaignRevision", existingCommand.campaignRevision),
      )
      .unique();

    return {
      newRevision: existingCommand.campaignRevision,
      state: existingSnapshot!.state as CurrentCampaignState,
      alreadyApplied: true,
    };
  }

  validateCampaignState(input.currentState);
  validateCampaignState(input.nextState);

  const newRevision = input.currentRevision + 1;

  await ctx.db.insert("campaignRevisions", {
    campaignId: input.campaignId,
    campaignRevision: newRevision,
    commandId: input.commandId,
    commandType: input.commandType,
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

  return {
    newRevision,
    state: input.nextState,
    alreadyApplied: false,
  };
}
