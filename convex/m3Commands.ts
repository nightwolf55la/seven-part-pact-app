import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import {
  validateCampaignState,
  DomainError,
  CURRENT_HISTORY_CONTROL_VERSION,
  parseLiveCommandId,
  addPlayerFingerprint,
  renamePlayerFingerprint,
  removePlayerFingerprint,
  setCampaignAgeFingerprint,
  setFacilitatorFingerprint,
  createWizardFingerprint,
  renameWizardFingerprint,
  setWizardPortrayalFingerprint,
  setPactSeatWizardFingerprint,
  setPactSeatStatusFingerprint,
  setWatcherFingerprint,
  applyAddPlayer,
  applyRenamePlayer,
  applyRemovePlayer,
  applySetCampaignAge,
  applySetFacilitator,
  applyCreateWizard,
  applyRenameWizard,
  applySetWizardPortrayal,
  applySetPactSeatWizard,
  applySetPactSeatStatus,
  applySetWatcher,
  isValidPlayerId,
  isValidWizardId,
  validateAnyCampaignState,
} from "../shared/domain";
import type { CurrentCampaignState, CampaignCommandType, PlayerId, WizardId } from "../shared/domain";
import type { PactSeatId } from "../shared/domain/pact-seats";
import { isValidPactSeatId } from "../shared/domain/pact-seats";
import type { AgeDefinitionId } from "../shared/domain/ages";
import { isValidAgeDefinitionId } from "../shared/domain/ages";
import { loadHistoricalState } from "../shared/domain/state-migration";
import { canonicalCommit } from "./canonicalCommit";
import type { CanonicalCommitInput, CanonicalCommitReceipt } from "./canonicalCommit";
import type { Id } from "./_generated/dataModel";
import { loadCanonicalRecord } from "./persistence";

interface CanonicalCampaign {
  docId: Id<"campaigns">;
  campaignId: string;
  currentRevision: number;
  currentState: CurrentCampaignState;
}

async function loadCanonicalV2ForMutation(ctx: MutationCtx): Promise<CanonicalCampaign> {
  const record = await loadCanonicalRecord(ctx);
  if (record === null) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", "No canonical campaign found");
  }

  // Fail closed: current campaign document MUST already be V2.
  // If it is still V1, the explicit admin migration has not been run yet.
  try {
    const currentState = validateCampaignState(record.rawState);
    return {
      docId: record.docId,
      campaignId: record.campaignId,
      currentRevision: record.campaignRevision,
      currentState,
    };
  } catch (e: unknown) {
    // Check if it's actually a valid V1 state that hasn't been migrated
    try {
      const any = validateAnyCampaignState(record.rawState);
      if (any.schemaVersion === 1) {
        throw new DomainError(
          "MIGRATION_REQUIRED",
          "Campaign state is V1. Run the explicit admin migration (adminMigration:migrateCurrentStateToV2) before using M3 commands.",
        );
      }
    } catch (inner: unknown) {
      if (inner instanceof DomainError && inner.code === "MIGRATION_REQUIRED") throw inner;
    }
    throw e;
  }
}

/**
 * Pre-transition idempotency check. If commandId was already committed,
 * returns the receipt immediately without re-running the transition.
 * If commandId was committed with a different fingerprint, throws COMMAND_ID_REUSED.
 * Returns null if the command has not been applied yet.
 */
async function checkIdempotency(
  ctx: MutationCtx,
  campaignId: string,
  commandId: string,
  commandType: CampaignCommandType,
  commandFingerprint: string,
): Promise<CanonicalCommitReceipt | null> {
  const existingCommand = await ctx.db
    .query("campaignRevisions")
    .withIndex("by_campaign_commandId", (q) =>
      q.eq("campaignId", campaignId).eq("commandId", commandId),
    )
    .unique();

  if (existingCommand === null) return null;

  if (
    existingCommand.commandType !== commandType ||
    existingCommand.commandFingerprint !== commandFingerprint
  ) {
    throw new DomainError(
      "COMMAND_ID_REUSED",
      `CommandId "${commandId}" already committed with type="${existingCommand.commandType}" fingerprint="${existingCommand.commandFingerprint}", cannot reuse for type="${commandType}" fingerprint="${commandFingerprint}"`,
    );
  }

  const existingSnapshot = await ctx.db
    .query("campaignSnapshots")
    .withIndex("by_campaign_revision", (q) =>
      q.eq("campaignId", campaignId).eq("campaignRevision", existingCommand.campaignRevision),
    )
    .unique();

  if (existingSnapshot === null) {
    throw new DomainError(
      "CAMPAIGN_STATE_CORRUPT",
      `Snapshot missing for committed revision ${existingCommand.campaignRevision}`,
    );
  }

  const validated = loadHistoricalState(existingSnapshot.state);

  return {
    newRevision: existingCommand.campaignRevision,
    state: validated,
    alreadyApplied: true,
  };
}

async function commitM3Command(
  ctx: MutationCtx,
  commandId: string,
  commandType: CampaignCommandType,
  commandFingerprint: string,
  campaign: CanonicalCampaign,
  transitionResult: { nextState: CurrentCampaignState; events: readonly import("../shared/domain").CampaignEvent[] },
): Promise<CanonicalCommitReceipt> {
  const input: CanonicalCommitInput = {
    campaignDocId: campaign.docId,
    campaignId: campaign.campaignId,
    currentRevision: campaign.currentRevision,
    currentState: campaign.currentState,
    commandId,
    commandType,
    commandFingerprint,
    nextState: transitionResult.nextState,
    events: transitionResult.events,
    historyControlUpdate: { kind: "logical_state_append" },
  };

  return canonicalCommit(ctx, input);
}

export const addPlayer = mutation({
  args: {
    commandId: v.string(),
    playerId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    parseLiveCommandId(args.commandId);
    if (!isValidPlayerId(args.playerId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid playerId: ${args.playerId}`);
    }
    const fingerprint = addPlayerFingerprint(args.playerId, args.name.trim());
    const campaign = await loadCanonicalV2ForMutation(ctx);
    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "add_player", fingerprint);
    if (replay) return { revision: replay.newRevision };
    const result = applyAddPlayer(campaign.currentState, args.playerId as PlayerId, args.name);
    const receipt = await commitM3Command(ctx, args.commandId, "add_player", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

export const renamePlayer = mutation({
  args: {
    commandId: v.string(),
    playerId: v.string(),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    parseLiveCommandId(args.commandId);
    if (!isValidPlayerId(args.playerId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid playerId: ${args.playerId}`);
    }
    const fingerprint = renamePlayerFingerprint(args.playerId, args.newName.trim());
    const campaign = await loadCanonicalV2ForMutation(ctx);
    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "rename_player", fingerprint);
    if (replay) return { revision: replay.newRevision };
    const result = applyRenamePlayer(campaign.currentState, args.playerId as PlayerId, args.newName);
    const receipt = await commitM3Command(ctx, args.commandId, "rename_player", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

export const removePlayer = mutation({
  args: {
    commandId: v.string(),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    parseLiveCommandId(args.commandId);
    if (!isValidPlayerId(args.playerId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid playerId: ${args.playerId}`);
    }
    const fingerprint = removePlayerFingerprint(args.playerId);
    const campaign = await loadCanonicalV2ForMutation(ctx);
    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "remove_player", fingerprint);
    if (replay) return { revision: replay.newRevision };
    const result = applyRemovePlayer(campaign.currentState, args.playerId as PlayerId);
    const receipt = await commitM3Command(ctx, args.commandId, "remove_player", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

export const setCampaignAge = mutation({
  args: {
    commandId: v.string(),
    ageId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    parseLiveCommandId(args.commandId);
    if (args.ageId !== null && !isValidAgeDefinitionId(args.ageId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid ageId: ${args.ageId}`);
    }
    const fingerprint = setCampaignAgeFingerprint(args.ageId);
    const campaign = await loadCanonicalV2ForMutation(ctx);
    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "set_campaign_age", fingerprint);
    if (replay) return { revision: replay.newRevision };
    const result = applySetCampaignAge(campaign.currentState, args.ageId as AgeDefinitionId | null);
    const receipt = await commitM3Command(ctx, args.commandId, "set_campaign_age", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

export const setFacilitator = mutation({
  args: {
    commandId: v.string(),
    playerId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    parseLiveCommandId(args.commandId);
    if (args.playerId !== null && !isValidPlayerId(args.playerId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid playerId: ${args.playerId}`);
    }
    const fingerprint = setFacilitatorFingerprint(args.playerId);
    const campaign = await loadCanonicalV2ForMutation(ctx);
    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "set_facilitator", fingerprint);
    if (replay) return { revision: replay.newRevision };
    const result = applySetFacilitator(campaign.currentState, args.playerId as PlayerId | null);
    const receipt = await commitM3Command(ctx, args.commandId, "set_facilitator", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

export const createWizard = mutation({
  args: {
    commandId: v.string(),
    wizardId: v.string(),
    name: v.string(),
    portrayedByPlayerId: v.union(v.string(), v.null()),
    seatId: v.string(),
  },
  handler: async (ctx, args) => {
    parseLiveCommandId(args.commandId);
    if (!isValidWizardId(args.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId: ${args.wizardId}`);
    }
    if (!isValidPactSeatId(args.seatId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid seatId: ${args.seatId}`);
    }
    if (args.portrayedByPlayerId !== null && !isValidPlayerId(args.portrayedByPlayerId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid portrayedByPlayerId: ${args.portrayedByPlayerId}`);
    }
    const fingerprint = createWizardFingerprint(args.wizardId, args.name.trim(), args.portrayedByPlayerId, args.seatId);
    const campaign = await loadCanonicalV2ForMutation(ctx);
    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "create_wizard", fingerprint);
    if (replay) return { revision: replay.newRevision };
    const result = applyCreateWizard(
      campaign.currentState,
      args.wizardId as WizardId,
      args.name,
      args.portrayedByPlayerId as PlayerId | null,
      args.seatId as PactSeatId,
    );
    const receipt = await commitM3Command(ctx, args.commandId, "create_wizard", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

export const renameWizard = mutation({
  args: {
    commandId: v.string(),
    wizardId: v.string(),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    parseLiveCommandId(args.commandId);
    if (!isValidWizardId(args.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId: ${args.wizardId}`);
    }
    const fingerprint = renameWizardFingerprint(args.wizardId, args.newName.trim());
    const campaign = await loadCanonicalV2ForMutation(ctx);
    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "rename_wizard", fingerprint);
    if (replay) return { revision: replay.newRevision };
    const result = applyRenameWizard(campaign.currentState, args.wizardId as WizardId, args.newName);
    const receipt = await commitM3Command(ctx, args.commandId, "rename_wizard", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

export const setWizardPortrayal = mutation({
  args: {
    commandId: v.string(),
    wizardId: v.string(),
    playerId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    parseLiveCommandId(args.commandId);
    if (!isValidWizardId(args.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId: ${args.wizardId}`);
    }
    if (args.playerId !== null && !isValidPlayerId(args.playerId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid playerId: ${args.playerId}`);
    }
    const fingerprint = setWizardPortrayalFingerprint(args.wizardId, args.playerId);
    const campaign = await loadCanonicalV2ForMutation(ctx);
    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "set_wizard_portrayal", fingerprint);
    if (replay) return { revision: replay.newRevision };
    const result = applySetWizardPortrayal(campaign.currentState, args.wizardId as WizardId, args.playerId as PlayerId | null);
    const receipt = await commitM3Command(ctx, args.commandId, "set_wizard_portrayal", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

export const setPactSeatWizard = mutation({
  args: {
    commandId: v.string(),
    seatId: v.string(),
    wizardId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    parseLiveCommandId(args.commandId);
    if (!isValidPactSeatId(args.seatId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid seatId: ${args.seatId}`);
    }
    if (args.wizardId !== null && !isValidWizardId(args.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId: ${args.wizardId}`);
    }
    const fingerprint = setPactSeatWizardFingerprint(args.seatId, args.wizardId);
    const campaign = await loadCanonicalV2ForMutation(ctx);
    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "set_pact_seat_wizard", fingerprint);
    if (replay) return { revision: replay.newRevision };
    const result = applySetPactSeatWizard(campaign.currentState, args.seatId as PactSeatId, args.wizardId as WizardId | null);
    const receipt = await commitM3Command(ctx, args.commandId, "set_pact_seat_wizard", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

export const setPactSeatStatus = mutation({
  args: {
    commandId: v.string(),
    seatId: v.string(),
    status: v.union(v.literal("present"), v.literal("silent"), v.literal("absent"), v.null()),
  },
  handler: async (ctx, args) => {
    parseLiveCommandId(args.commandId);
    if (!isValidPactSeatId(args.seatId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid seatId: ${args.seatId}`);
    }
    const fingerprint = setPactSeatStatusFingerprint(args.seatId, args.status);
    const campaign = await loadCanonicalV2ForMutation(ctx);
    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "set_pact_seat_status", fingerprint);
    if (replay) return { revision: replay.newRevision };
    const result = applySetPactSeatStatus(campaign.currentState, args.seatId as PactSeatId, args.status);
    const receipt = await commitM3Command(ctx, args.commandId, "set_pact_seat_status", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

export const setWatcher = mutation({
  args: {
    commandId: v.string(),
    seatId: v.string(),
    playerId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    parseLiveCommandId(args.commandId);
    if (!isValidPactSeatId(args.seatId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid seatId: ${args.seatId}`);
    }
    if (args.playerId !== null && !isValidPlayerId(args.playerId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid playerId: ${args.playerId}`);
    }
    const fingerprint = setWatcherFingerprint(args.seatId, args.playerId);
    const campaign = await loadCanonicalV2ForMutation(ctx);
    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "set_watcher", fingerprint);
    if (replay) return { revision: replay.newRevision };
    const result = applySetWatcher(campaign.currentState, args.seatId as PactSeatId, args.playerId as PlayerId | null);
    const receipt = await commitM3Command(ctx, args.commandId, "set_watcher", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});
