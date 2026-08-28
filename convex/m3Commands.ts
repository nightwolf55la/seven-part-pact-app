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
} from "../shared/domain";
import type { CurrentCampaignState, CampaignCommandType, PlayerId, WizardId, CampaignHistoryControlV1 } from "../shared/domain";
import type { PactSeatId } from "../shared/domain/pact-seats";
import { isValidPactSeatId } from "../shared/domain/pact-seats";
import type { AgeDefinitionId } from "../shared/domain/ages";
import { isValidAgeDefinitionId } from "../shared/domain/ages";
import { migrateToCurrentVersion } from "../shared/domain/state-migration";
import { validateAnyCampaignState } from "../shared/domain";
import { canonicalCommit } from "./canonicalCommit";
import type { CanonicalCommitInput, HistoryControlUpdate } from "./canonicalCommit";
import type { Id } from "./_generated/dataModel";
import { loadCanonicalRecord } from "./persistence";

async function loadCanonicalForMutation(ctx: MutationCtx) {
  const record = await loadCanonicalRecord(ctx);
  if (record === null) {
    throw new DomainError("CAMPAIGN_STATE_CORRUPT", "No canonical campaign found");
  }

  const validated = validateAnyCampaignState(record.rawState);
  const currentState = migrateToCurrentVersion(validated);

  return {
    docId: record.docId,
    campaignId: record.campaignId,
    currentRevision: record.campaignRevision,
    currentState,
  };
}

async function commitM3Command(
  ctx: MutationCtx,
  commandId: string,
  commandType: CampaignCommandType,
  commandFingerprint: string,
  campaign: { docId: Id<"campaigns">; campaignId: string; currentRevision: number; currentState: CurrentCampaignState },
  transitionResult: { nextState: CurrentCampaignState; events: readonly import("../shared/domain").CampaignEvent[] },
) {
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
    const campaign = await loadCanonicalForMutation(ctx);
    const result = applyAddPlayer(campaign.currentState, args.playerId as PlayerId, args.name);
    const fingerprint = addPlayerFingerprint(args.playerId);
    await commitM3Command(ctx, args.commandId, "add_player", fingerprint, campaign, result);
    return { revision: campaign.currentRevision + 1 };
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
    const campaign = await loadCanonicalForMutation(ctx);
    const result = applyRenamePlayer(campaign.currentState, args.playerId as PlayerId, args.newName);
    const fingerprint = renamePlayerFingerprint(args.playerId, args.newName.trim());
    await commitM3Command(ctx, args.commandId, "rename_player", fingerprint, campaign, result);
    return { revision: campaign.currentRevision + 1 };
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
    const campaign = await loadCanonicalForMutation(ctx);
    const result = applyRemovePlayer(campaign.currentState, args.playerId as PlayerId);
    const fingerprint = removePlayerFingerprint(args.playerId);
    await commitM3Command(ctx, args.commandId, "remove_player", fingerprint, campaign, result);
    return { revision: campaign.currentRevision + 1 };
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
    const campaign = await loadCanonicalForMutation(ctx);
    const result = applySetCampaignAge(campaign.currentState, args.ageId as AgeDefinitionId | null);
    const fingerprint = setCampaignAgeFingerprint(args.ageId);
    await commitM3Command(ctx, args.commandId, "set_campaign_age", fingerprint, campaign, result);
    return { revision: campaign.currentRevision + 1 };
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
    const campaign = await loadCanonicalForMutation(ctx);
    const result = applySetFacilitator(campaign.currentState, args.playerId as PlayerId | null);
    const fingerprint = setFacilitatorFingerprint(args.playerId);
    await commitM3Command(ctx, args.commandId, "set_facilitator", fingerprint, campaign, result);
    return { revision: campaign.currentRevision + 1 };
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
    const campaign = await loadCanonicalForMutation(ctx);
    const result = applyCreateWizard(
      campaign.currentState,
      args.wizardId as WizardId,
      args.name,
      args.portrayedByPlayerId as PlayerId | null,
      args.seatId as PactSeatId,
    );
    const fingerprint = createWizardFingerprint(args.wizardId, args.seatId);
    await commitM3Command(ctx, args.commandId, "create_wizard", fingerprint, campaign, result);
    return { revision: campaign.currentRevision + 1 };
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
    const campaign = await loadCanonicalForMutation(ctx);
    const result = applyRenameWizard(campaign.currentState, args.wizardId as WizardId, args.newName);
    const fingerprint = renameWizardFingerprint(args.wizardId, args.newName.trim());
    await commitM3Command(ctx, args.commandId, "rename_wizard", fingerprint, campaign, result);
    return { revision: campaign.currentRevision + 1 };
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
    const campaign = await loadCanonicalForMutation(ctx);
    const result = applySetWizardPortrayal(campaign.currentState, args.wizardId as WizardId, args.playerId as PlayerId | null);
    const fingerprint = setWizardPortrayalFingerprint(args.wizardId, args.playerId);
    await commitM3Command(ctx, args.commandId, "set_wizard_portrayal", fingerprint, campaign, result);
    return { revision: campaign.currentRevision + 1 };
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
    const campaign = await loadCanonicalForMutation(ctx);
    const result = applySetPactSeatWizard(campaign.currentState, args.seatId as PactSeatId, args.wizardId as WizardId | null);
    const fingerprint = setPactSeatWizardFingerprint(args.seatId, args.wizardId);
    await commitM3Command(ctx, args.commandId, "set_pact_seat_wizard", fingerprint, campaign, result);
    return { revision: campaign.currentRevision + 1 };
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
    const campaign = await loadCanonicalForMutation(ctx);
    const result = applySetPactSeatStatus(campaign.currentState, args.seatId as PactSeatId, args.status);
    const fingerprint = setPactSeatStatusFingerprint(args.seatId, args.status);
    await commitM3Command(ctx, args.commandId, "set_pact_seat_status", fingerprint, campaign, result);
    return { revision: campaign.currentRevision + 1 };
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
    const campaign = await loadCanonicalForMutation(ctx);
    const result = applySetWatcher(campaign.currentState, args.seatId as PactSeatId, args.playerId as PlayerId | null);
    const fingerprint = setWatcherFingerprint(args.seatId, args.playerId);
    await commitM3Command(ctx, args.commandId, "set_watcher", fingerprint, campaign, result);
    return { revision: campaign.currentRevision + 1 };
  },
});
