import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  DomainError,
  parseLiveCommandId,
  isValidCampaignId,
  validateCampaignState,
} from "../shared/domain";
import type {
  CampaignCommandType,
  CampaignEvent,
  CurrentCampaignState,
} from "../shared/domain";
import { loadHistoricalState } from "../shared/domain/state-migration";
import { resolveAcceptedCommandReplay } from "../shared/domain/command-ids";
import { canonicalCommit } from "./canonicalCommit";
import type { CanonicalCommitInput, CanonicalCommitReceipt } from "./canonicalCommit";
import { loadCanonicalRecord } from "./persistence";
import { assertCampaignNotDeleting } from "./deletionBarrier";

export interface CanonicalCampaign {
  docId: Id<"campaigns">;
  campaignId: string;
  currentRevision: number;
  currentState: CurrentCampaignState;
}

export interface AcceptedCommandRecord {
  commandType: string;
  commandFingerprint: string;
  campaignRevision: number;
}

export interface OrdinaryLogicalCommandEnvelope {
  commandId: string;
  expectedCampaignId: string;
}

export interface OrdinaryLogicalCommandPreparation {
  commandType: CampaignCommandType;
  commandFingerprint: string;
  apply: (state: CurrentCampaignState) => {
    nextState: CurrentCampaignState;
    events: readonly CampaignEvent[];
  };
}

export interface OrdinaryLogicalCommandIo {
  assertNotDeleting(): Promise<void>;
  loadCanonicalCampaign(): Promise<CanonicalCampaign>;
  findAcceptedCommand(campaignId: string, commandId: string): Promise<AcceptedCommandRecord | null>;
  loadCommittedSnapshot(campaignId: string, revision: number): Promise<unknown | null>;
  commit(input: CanonicalCommitInput): Promise<CanonicalCommitReceipt>;
}

export function validateM5ExpectedCampaignId(expectedCampaignId: string): void {
  if (!isValidCampaignId(expectedCampaignId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Invalid expectedCampaignId: ${expectedCampaignId}`,
    );
  }
}

export function assertM5ExpectedCampaignIdMatches(
  expectedCampaignId: string,
  actualCampaignId: string,
): void {
  if (expectedCampaignId !== actualCampaignId) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Expected campaign "${expectedCampaignId}" but current campaign is "${actualCampaignId}"`,
    );
  }
}

export async function loadCanonicalV2ForMutation(ctx: MutationCtx): Promise<CanonicalCampaign> {
  const record = await loadCanonicalRecord(ctx);
  if (record === null) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", "No canonical campaign found");
  }

  const currentState = validateCampaignState(record.rawState);
  return {
    docId: record.docId,
    campaignId: record.campaignId,
    currentRevision: record.campaignRevision,
    currentState,
  };
}

export function convexOrdinaryLogicalCommandIo(ctx: MutationCtx): OrdinaryLogicalCommandIo {
  return {
    async assertNotDeleting() {
      await assertCampaignNotDeleting(ctx);
    },
    async loadCanonicalCampaign() {
      return loadCanonicalV2ForMutation(ctx);
    },
    async findAcceptedCommand(campaignId, commandId) {
      const existingCommand = await ctx.db
        .query("campaignRevisions")
        .withIndex("by_campaign_commandId", (q) =>
          q.eq("campaignId", campaignId).eq("commandId", commandId),
        )
        .unique();

      if (existingCommand === null) return null;

      return {
        commandType: existingCommand.commandType,
        commandFingerprint: existingCommand.commandFingerprint,
        campaignRevision: existingCommand.campaignRevision,
      };
    },
    async loadCommittedSnapshot(campaignId, revision) {
      const existingSnapshot = await ctx.db
        .query("campaignSnapshots")
        .withIndex("by_campaign_revision", (q) =>
          q.eq("campaignId", campaignId).eq("campaignRevision", revision),
        )
        .unique();

      if (existingSnapshot === null) return null;
      return existingSnapshot.state;
    },
    async commit(input) {
      return canonicalCommit(ctx, input);
    },
  };
}

export async function executeOrdinaryLogicalCommand(
  io: OrdinaryLogicalCommandIo,
  envelope: OrdinaryLogicalCommandEnvelope,
  prepare: () => OrdinaryLogicalCommandPreparation,
): Promise<{ revision: number }> {
  await io.assertNotDeleting();
  parseLiveCommandId(envelope.commandId);
  validateM5ExpectedCampaignId(envelope.expectedCampaignId);

  const prepared = prepare();

  const campaign = await io.loadCanonicalCampaign();
  assertM5ExpectedCampaignIdMatches(envelope.expectedCampaignId, campaign.campaignId);

  const existing = await io.findAcceptedCommand(campaign.campaignId, envelope.commandId);
  const replay = resolveAcceptedCommandReplay(envelope.commandId, existing, {
    commandType: prepared.commandType,
    commandFingerprint: prepared.commandFingerprint,
  });

  if (replay.kind === "replay") {
    const raw = await io.loadCommittedSnapshot(campaign.campaignId, replay.revision);
    if (raw === null) {
      throw new DomainError(
        "CAMPAIGN_STATE_CORRUPT",
        `Snapshot missing for committed revision ${replay.revision}`,
      );
    }
    loadHistoricalState(raw);
    return { revision: replay.revision };
  }

  const transitionResult = prepared.apply(campaign.currentState);
  const receipt = await io.commit({
    campaignDocId: campaign.docId,
    campaignId: campaign.campaignId,
    currentRevision: campaign.currentRevision,
    currentState: campaign.currentState,
    commandId: envelope.commandId,
    commandType: prepared.commandType,
    commandFingerprint: prepared.commandFingerprint,
    nextState: transitionResult.nextState,
    events: transitionResult.events,
    historyControlUpdate: { kind: "logical_state_append" },
  });

  return { revision: receipt.newRevision };
}

export function executeConvexOrdinaryLogicalCommand(
  ctx: MutationCtx,
  envelope: OrdinaryLogicalCommandEnvelope,
  prepare: () => OrdinaryLogicalCommandPreparation,
): Promise<{ revision: number }> {
  return executeOrdinaryLogicalCommand(convexOrdinaryLogicalCommandIo(ctx), envelope, prepare);
}
