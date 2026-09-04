import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import {
  validateCampaignState,
  DomainError,
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
  setSetupMonthFingerprint,
  setSetupOrreryPositionFingerprint,
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
  applySetSetupMonth,
  applySetSetupOrreryPosition,
  isValidPlayerId,
  isValidWizardId,
  isValidAllocationId,
  isValidEngagementId,
  generateAllocationId,
  generateEngagementId,
  beginPlayFingerprint,
  collectEligibleWizardIds,
  advancePhaseFingerprint,
  scheduleTimeFingerprint,
  setEngagementTargetFingerprint,
  applyAdvancePhase,
  applyScheduleTime,
  applySetEngagementTarget,
  applyRescheduleTime,
  applySpendManualTime,
  applyWasteTime,
  applySpendOrreryTime,
  applyCommitTimeToEngagement,
  applyResolveEngagement,
  applyRescheduleEngagement,
  rescheduleTimeFingerprint,
  spendManualTimeFingerprint,
  wasteTimeFingerprint,
  spendOrreryTimeFingerprint,
  commitTimeToEngagementFingerprint,
  resolveEngagementFingerprint,
  rescheduleEngagementFingerprint,
} from "../shared/domain";
import type { CurrentCampaignState, CampaignCommandType, PlayerId, WizardId, AllocationId, EngagementId, MonthOrdinal, MovablePlanetId, LunarPhase, TimeDestination, EngagementTarget, OrreryMoveDirection } from "../shared/domain";
import { applyBeginPlay } from "../shared/domain/begin-play";
import type { WizardInitIds } from "../shared/domain/begin-play";
import { PACT_SEAT_IDS } from "../shared/domain/pact-seats";
import type { PactSeatId } from "../shared/domain/pact-seats";
import { isValidPactSeatId } from "../shared/domain/pact-seats";
import type { AgeDefinitionId } from "../shared/domain/ages";
import { isValidAgeDefinitionId } from "../shared/domain/ages";
import { loadHistoricalState } from "../shared/domain/state-migration";
import { matchCommandIdempotency } from "../shared/domain/command-ids";
import { canonicalCommit } from "./canonicalCommit";
import type { CanonicalCommitInput, CanonicalCommitReceipt } from "./canonicalCommit";
import type { Id } from "./_generated/dataModel";
import { loadCanonicalRecord } from "./persistence";
import { assertCampaignNotDeleting } from "./deletionBarrier";
import { MOVABLE_PLANET_IDS } from "../shared/domain";

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

  const currentState = validateCampaignState(record.rawState);
  return {
    docId: record.docId,
    campaignId: record.campaignId,
    currentRevision: record.campaignRevision,
    currentState,
  };
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

  const match = matchCommandIdempotency(
    {
      commandType: existingCommand.commandType,
      commandFingerprint: existingCommand.commandFingerprint,
      campaignRevision: existingCommand.campaignRevision,
    },
    { commandType, commandFingerprint },
  );

  if (match.kind === "conflict") {
    throw new DomainError(
      "COMMAND_ID_REUSED",
      `CommandId "${commandId}" already committed with type="${match.committedType}" fingerprint="${match.committedFingerprint}", cannot reuse for type="${commandType}" fingerprint="${commandFingerprint}"`,
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

// ============================================================
// M4: Setup-only commands
// ============================================================

export const setSetupMonth = mutation({
  args: {
    commandId: v.string(),
    monthOrdinal: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    await assertCampaignNotDeleting(ctx);
    parseLiveCommandId(args.commandId);
    const fingerprint = setSetupMonthFingerprint(args.monthOrdinal);
    const campaign = await loadCanonicalV2ForMutation(ctx);
    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "set_setup_month", fingerprint);
    if (replay) return { revision: replay.newRevision };
    const result = applySetSetupMonth(
      campaign.currentState,
      args.monthOrdinal as MonthOrdinal | null,
    );
    const receipt = await commitM3Command(ctx, args.commandId, "set_setup_month", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

export const setSetupOrreryPosition = mutation({
  args: {
    commandId: v.string(),
    planetId: v.string(),
    positionIndex: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    await assertCampaignNotDeleting(ctx);
    parseLiveCommandId(args.commandId);
    if (!MOVABLE_PLANET_IDS.includes(args.planetId as MovablePlanetId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid planetId: ${args.planetId}`);
    }
    const fingerprint = setSetupOrreryPositionFingerprint(args.planetId, args.positionIndex);
    const campaign = await loadCanonicalV2ForMutation(ctx);
    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "set_setup_orrery_position", fingerprint);
    if (replay) return { revision: replay.newRevision };
    const result = applySetSetupOrreryPosition(
      campaign.currentState,
      args.planetId as MovablePlanetId,
      args.positionIndex,
    );
    const receipt = await commitM3Command(ctx, args.commandId, "set_setup_orrery_position", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

// ============================================================
// M4: Begin Play
// ============================================================

export const beginPlay = mutation({
  args: {
    commandId: v.string(),
    expectedRevision: v.number(),
  },
  handler: async (ctx, args) => {
    await assertCampaignNotDeleting(ctx);
    parseLiveCommandId(args.commandId);

    if (!Number.isSafeInteger(args.expectedRevision) || args.expectedRevision < 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid expectedRevision: ${args.expectedRevision}`);
    }

    const fingerprint = beginPlayFingerprint(args.expectedRevision);
    const campaign = await loadCanonicalV2ForMutation(ctx);

    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "begin_play", fingerprint);
    if (replay) return { revision: replay.newRevision };

    if (campaign.currentRevision !== args.expectedRevision) {
      throw new DomainError(
        "STALE_CAMPAIGN_REVISION",
        `Expected revision ${args.expectedRevision} but current is ${campaign.currentRevision}`,
      );
    }

    const eligibleWizardIds = collectEligibleWizardIds(campaign.currentState);
    const wizardInits: WizardInitIds[] = eligibleWizardIds.map((wizardId) => ({
      wizardId,
      allocationIds: [
        generateAllocationId(),
        generateAllocationId(),
        generateAllocationId(),
        generateAllocationId(),
      ] as [AllocationId, AllocationId, AllocationId, AllocationId],
      engagementId: generateEngagementId(),
    }));

    const result = applyBeginPlay(campaign.currentState, { wizardInits });
    const receipt = await commitM3Command(ctx, args.commandId, "begin_play", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

// ============================================================
// M4 C3: Play phase / planning commands
// ============================================================

export const advancePhase = mutation({
  args: {
    commandId: v.string(),
    expectedMonthOrdinal: v.number(),
    expectedPhase: v.string(),
  },
  handler: async (ctx, args) => {
    await assertCampaignNotDeleting(ctx);
    parseLiveCommandId(args.commandId);

    if (!Number.isSafeInteger(args.expectedMonthOrdinal) || args.expectedMonthOrdinal < 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid expectedMonthOrdinal: ${args.expectedMonthOrdinal}`);
    }

    const fingerprint = advancePhaseFingerprint(args.expectedMonthOrdinal, args.expectedPhase);
    const campaign = await loadCanonicalV2ForMutation(ctx);

    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "advance_phase", fingerprint);
    if (replay) return { revision: replay.newRevision };

    const result = applyAdvancePhase(campaign.currentState, {
      expectedMonthOrdinal: args.expectedMonthOrdinal as MonthOrdinal,
      expectedPhase: args.expectedPhase as LunarPhase,
    });
    const receipt = await commitM3Command(ctx, args.commandId, "advance_phase", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

export const scheduleTime = mutation({
  args: {
    commandId: v.string(),
    expectedMonthOrdinal: v.number(),
    allocationId: v.string(),
    destination: v.union(
      v.object({ kind: v.literal("companion"), element: v.string() }),
      v.object({ kind: v.literal("map_isle_sanctum") }),
      v.object({ kind: v.literal("familiar") }),
      v.object({ kind: v.literal("orrery") }),
      v.object({ kind: v.literal("meeting") }),
      v.object({ kind: v.literal("domain") }),
      v.object({ kind: v.literal("engagement"), engagementId: v.string() }),
      v.object({ kind: v.literal("special_use"), description: v.string() }),
      v.null(),
    ),
    note: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    await assertCampaignNotDeleting(ctx);
    parseLiveCommandId(args.commandId);

    if (!Number.isSafeInteger(args.expectedMonthOrdinal) || args.expectedMonthOrdinal < 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid expectedMonthOrdinal: ${args.expectedMonthOrdinal}`);
    }
    if (!isValidAllocationId(args.allocationId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid allocationId: ${args.allocationId}`);
    }

    const fingerprint = scheduleTimeFingerprint(
      args.expectedMonthOrdinal,
      args.allocationId,
      args.destination,
      args.note,
    );
    const campaign = await loadCanonicalV2ForMutation(ctx);

    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "schedule_time", fingerprint);
    if (replay) return { revision: replay.newRevision };

    const result = applyScheduleTime(campaign.currentState, {
      expectedMonthOrdinal: args.expectedMonthOrdinal as MonthOrdinal,
      allocationId: args.allocationId as AllocationId,
      destination: args.destination as TimeDestination | null,
      note: args.note,
    });
    const receipt = await commitM3Command(ctx, args.commandId, "schedule_time", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

export const setEngagementTarget = mutation({
  args: {
    commandId: v.string(),
    expectedMonthOrdinal: v.number(),
    engagementId: v.string(),
    target: v.union(
      v.object({ kind: v.literal("wizard"), wizardId: v.string() }),
      v.object({ kind: v.literal("self") }),
      v.object({ kind: v.literal("familiar") }),
      v.object({ kind: v.literal("named_character"), name: v.string() }),
      v.null(),
    ),
  },
  handler: async (ctx, args) => {
    await assertCampaignNotDeleting(ctx);
    parseLiveCommandId(args.commandId);

    if (!Number.isSafeInteger(args.expectedMonthOrdinal) || args.expectedMonthOrdinal < 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid expectedMonthOrdinal: ${args.expectedMonthOrdinal}`);
    }
    if (!isValidEngagementId(args.engagementId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid engagementId: ${args.engagementId}`);
    }

    const fingerprint = setEngagementTargetFingerprint(
      args.expectedMonthOrdinal,
      args.engagementId,
      args.target,
    );
    const campaign = await loadCanonicalV2ForMutation(ctx);

    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "set_engagement_target", fingerprint);
    if (replay) return { revision: replay.newRevision };

    const result = applySetEngagementTarget(campaign.currentState, {
      expectedMonthOrdinal: args.expectedMonthOrdinal as MonthOrdinal,
      engagementId: args.engagementId as EngagementId,
      target: args.target as EngagementTarget | null,
    });
    const receipt = await commitM3Command(ctx, args.commandId, "set_engagement_target", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

// ============================================================
// M4 C4: Story mechanics commands
// ============================================================

export const rescheduleTime = mutation({
  args: {
    commandId: v.string(),
    expectedMonthOrdinal: v.number(),
    allocationId: v.string(),
    destination: v.union(
      v.object({ kind: v.literal("companion"), element: v.string() }),
      v.object({ kind: v.literal("map_isle_sanctum") }),
      v.object({ kind: v.literal("familiar") }),
      v.object({ kind: v.literal("orrery") }),
      v.object({ kind: v.literal("meeting") }),
      v.object({ kind: v.literal("domain") }),
      v.object({ kind: v.literal("engagement"), engagementId: v.string() }),
      v.object({ kind: v.literal("special_use"), description: v.string() }),
      v.null(),
    ),
    note: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    await assertCampaignNotDeleting(ctx);
    parseLiveCommandId(args.commandId);

    if (!Number.isSafeInteger(args.expectedMonthOrdinal) || args.expectedMonthOrdinal < 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid expectedMonthOrdinal: ${args.expectedMonthOrdinal}`);
    }
    if (!isValidAllocationId(args.allocationId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid allocationId: ${args.allocationId}`);
    }

    const fingerprint = rescheduleTimeFingerprint(
      args.expectedMonthOrdinal,
      args.allocationId,
      args.destination,
      args.note,
    );
    const campaign = await loadCanonicalV2ForMutation(ctx);

    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "reschedule_time", fingerprint);
    if (replay) return { revision: replay.newRevision };

    const result = applyRescheduleTime(campaign.currentState, {
      expectedMonthOrdinal: args.expectedMonthOrdinal as MonthOrdinal,
      allocationId: args.allocationId as AllocationId,
      destination: args.destination as TimeDestination | null,
      note: args.note,
    });
    const receipt = await commitM3Command(ctx, args.commandId, "reschedule_time", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

export const spendManualTime = mutation({
  args: {
    commandId: v.string(),
    expectedMonthOrdinal: v.number(),
    allocationId: v.string(),
  },
  handler: async (ctx, args) => {
    await assertCampaignNotDeleting(ctx);
    parseLiveCommandId(args.commandId);

    if (!Number.isSafeInteger(args.expectedMonthOrdinal) || args.expectedMonthOrdinal < 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid expectedMonthOrdinal: ${args.expectedMonthOrdinal}`);
    }
    if (!isValidAllocationId(args.allocationId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid allocationId: ${args.allocationId}`);
    }

    const fingerprint = spendManualTimeFingerprint(args.expectedMonthOrdinal, args.allocationId);
    const campaign = await loadCanonicalV2ForMutation(ctx);

    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "spend_manual_time", fingerprint);
    if (replay) return { revision: replay.newRevision };

    const result = applySpendManualTime(campaign.currentState, {
      expectedMonthOrdinal: args.expectedMonthOrdinal as MonthOrdinal,
      allocationId: args.allocationId as AllocationId,
    });
    const receipt = await commitM3Command(ctx, args.commandId, "spend_manual_time", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

export const wasteTime = mutation({
  args: {
    commandId: v.string(),
    expectedMonthOrdinal: v.number(),
    allocationId: v.string(),
  },
  handler: async (ctx, args) => {
    await assertCampaignNotDeleting(ctx);
    parseLiveCommandId(args.commandId);

    if (!Number.isSafeInteger(args.expectedMonthOrdinal) || args.expectedMonthOrdinal < 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid expectedMonthOrdinal: ${args.expectedMonthOrdinal}`);
    }
    if (!isValidAllocationId(args.allocationId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid allocationId: ${args.allocationId}`);
    }

    const fingerprint = wasteTimeFingerprint(args.expectedMonthOrdinal, args.allocationId);
    const campaign = await loadCanonicalV2ForMutation(ctx);

    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "waste_time", fingerprint);
    if (replay) return { revision: replay.newRevision };

    const result = applyWasteTime(campaign.currentState, {
      expectedMonthOrdinal: args.expectedMonthOrdinal as MonthOrdinal,
      allocationId: args.allocationId as AllocationId,
    });
    const receipt = await commitM3Command(ctx, args.commandId, "waste_time", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

export const spendOrreryTime = mutation({
  args: {
    commandId: v.string(),
    expectedMonthOrdinal: v.number(),
    allocationId: v.string(),
    planetId: v.string(),
    direction: v.union(v.literal("forward"), v.literal("backward")),
  },
  handler: async (ctx, args) => {
    await assertCampaignNotDeleting(ctx);
    parseLiveCommandId(args.commandId);

    if (!Number.isSafeInteger(args.expectedMonthOrdinal) || args.expectedMonthOrdinal < 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid expectedMonthOrdinal: ${args.expectedMonthOrdinal}`);
    }
    if (!isValidAllocationId(args.allocationId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid allocationId: ${args.allocationId}`);
    }
    if (!MOVABLE_PLANET_IDS.includes(args.planetId as MovablePlanetId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid planetId: ${args.planetId}`);
    }

    const fingerprint = spendOrreryTimeFingerprint(args.expectedMonthOrdinal, args.allocationId, args.planetId, args.direction);
    const campaign = await loadCanonicalV2ForMutation(ctx);

    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "spend_orrery_time", fingerprint);
    if (replay) return { revision: replay.newRevision };

    const result = applySpendOrreryTime(campaign.currentState, {
      expectedMonthOrdinal: args.expectedMonthOrdinal as MonthOrdinal,
      allocationId: args.allocationId as AllocationId,
      planetId: args.planetId as MovablePlanetId,
      direction: args.direction as OrreryMoveDirection,
    });
    const receipt = await commitM3Command(ctx, args.commandId, "spend_orrery_time", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

export const commitTimeToEngagement = mutation({
  args: {
    commandId: v.string(),
    expectedMonthOrdinal: v.number(),
    allocationId: v.string(),
    engagementId: v.string(),
  },
  handler: async (ctx, args) => {
    await assertCampaignNotDeleting(ctx);
    parseLiveCommandId(args.commandId);

    if (!Number.isSafeInteger(args.expectedMonthOrdinal) || args.expectedMonthOrdinal < 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid expectedMonthOrdinal: ${args.expectedMonthOrdinal}`);
    }
    if (!isValidAllocationId(args.allocationId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid allocationId: ${args.allocationId}`);
    }
    if (!isValidEngagementId(args.engagementId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid engagementId: ${args.engagementId}`);
    }

    const fingerprint = commitTimeToEngagementFingerprint(args.expectedMonthOrdinal, args.allocationId, args.engagementId);
    const campaign = await loadCanonicalV2ForMutation(ctx);

    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "commit_time_to_engagement", fingerprint);
    if (replay) return { revision: replay.newRevision };

    const result = applyCommitTimeToEngagement(campaign.currentState, {
      expectedMonthOrdinal: args.expectedMonthOrdinal as MonthOrdinal,
      allocationId: args.allocationId as AllocationId,
      engagementId: args.engagementId as EngagementId,
    });
    const receipt = await commitM3Command(ctx, args.commandId, "commit_time_to_engagement", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

export const resolveEngagement = mutation({
  args: {
    commandId: v.string(),
    expectedMonthOrdinal: v.number(),
    engagementId: v.string(),
  },
  handler: async (ctx, args) => {
    await assertCampaignNotDeleting(ctx);
    parseLiveCommandId(args.commandId);

    if (!Number.isSafeInteger(args.expectedMonthOrdinal) || args.expectedMonthOrdinal < 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid expectedMonthOrdinal: ${args.expectedMonthOrdinal}`);
    }
    if (!isValidEngagementId(args.engagementId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid engagementId: ${args.engagementId}`);
    }

    const fingerprint = resolveEngagementFingerprint(args.expectedMonthOrdinal, args.engagementId);
    const campaign = await loadCanonicalV2ForMutation(ctx);

    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "resolve_engagement", fingerprint);
    if (replay) return { revision: replay.newRevision };

    const result = applyResolveEngagement(campaign.currentState, {
      expectedMonthOrdinal: args.expectedMonthOrdinal as MonthOrdinal,
      engagementId: args.engagementId as EngagementId,
    });
    const receipt = await commitM3Command(ctx, args.commandId, "resolve_engagement", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

export const rescheduleEngagement = mutation({
  args: {
    commandId: v.string(),
    expectedMonthOrdinal: v.number(),
    engagementId: v.string(),
    target: v.union(
      v.object({ kind: v.literal("wizard"), wizardId: v.string() }),
      v.object({ kind: v.literal("self") }),
      v.object({ kind: v.literal("familiar") }),
      v.object({ kind: v.literal("named_character"), name: v.string() }),
    ),
  },
  handler: async (ctx, args) => {
    await assertCampaignNotDeleting(ctx);
    parseLiveCommandId(args.commandId);

    if (!Number.isSafeInteger(args.expectedMonthOrdinal) || args.expectedMonthOrdinal < 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid expectedMonthOrdinal: ${args.expectedMonthOrdinal}`);
    }
    if (!isValidEngagementId(args.engagementId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid engagementId: ${args.engagementId}`);
    }

    const fingerprint = rescheduleEngagementFingerprint(args.expectedMonthOrdinal, args.engagementId, args.target);
    const campaign = await loadCanonicalV2ForMutation(ctx);

    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "reschedule_engagement", fingerprint);
    if (replay) return { revision: replay.newRevision };

    const result = applyRescheduleEngagement(campaign.currentState, {
      expectedMonthOrdinal: args.expectedMonthOrdinal as MonthOrdinal,
      engagementId: args.engagementId as EngagementId,
      target: args.target as EngagementTarget,
    });
    const receipt = await commitM3Command(ctx, args.commandId, "reschedule_engagement", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});
