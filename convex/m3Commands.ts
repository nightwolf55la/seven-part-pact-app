import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import {
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
  normalizeWizardCharacterPatch,
  applyUpdateWizardCharacter,
  updateWizardCharacterFingerprint,
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
  adjustWizardmootAttendanceFingerprint,
  completeMeetingFingerprint,
  applyAdjustWizardmootAttendance,
  applyCompleteMeeting,
  applyBeginNextMonth,
  beginNextMonthFingerprint,
  isValidDenizenId,
  isValidCompanionRelationshipId,
  createDenizenFingerprint,
  updateDenizenFingerprint,
  isValidIsleId,
  createIsleFingerprint,
  updateIsleFingerprint,
  isValidPlaceId,
  createPlaceFingerprint,
  updatePlaceFingerprint,
  setWizardHomeIsleFingerprint,
  setWizardSanctumFingerprint,
  setWizardCompanionFingerprint,
  updateCompanionDescriptionFingerprint,
  initializeHierophantFingerprint,
  adjustTempleResourcesFingerprint,
  createTempleFingerprint,
  updateTempleFingerprint,
  setTempleHolidayFingerprint,
  setSelectedFlameLawsFingerprint,
  addSupplicantFingerprint,
  updateSupplicantFingerprint,
  removeSupplicantFingerprint,
  addProphetFingerprint,
  updateProphetFingerprint,
  removeProphetFingerprint,
  establishCultFingerprint,
  updateCultFingerprint,
  removeCultFingerprint,
  addCultDogmaFingerprint,
  updateCultDogmaFingerprint,
  removeCultDogmaFingerprint,
  createCampaignClassFingerprint,
  updateCampaignClassFingerprint,
  createCampaignDoctrineFingerprint,
  updateCampaignDoctrineFingerprint,
  initializeMarinerFingerprint,
  setMarinerShipFingerprint,
  setSelectedSeaLawsFingerprint,
  setMarinerRouteOccupancyFingerprint,
  setMarinerSeaStormCountFingerprint,
  setMarinerIsleMarketFingerprint,
  setMarinerIsleRavageFingerprint,
  addMarinerBeastFingerprint,
  updateMarinerBeastFingerprint,
  removeMarinerBeastFingerprint,
  applyCreateDenizenV5Candidate,
  applyUpdateDenizenV5Candidate,
  applyCreateIsleV5Candidate,
  applyUpdateIsleV5Candidate,
  applyCreatePlaceV5Candidate,
  applyUpdatePlaceV5Candidate,
  applySetWizardHomeIsleV5Candidate,
  applySetWizardSanctumV5Candidate,
  applySetWizardCompanionV5Candidate,
  applyUpdateCompanionDescriptionV5Candidate,
  applyInitializeHierophant,
  applyAdjustTempleResources,
  applyCreateTemple,
  applyUpdateTemple,
  applySetTempleHoliday,
  applySetSelectedFlameLaws,
  applyAddSupplicant,
  applyUpdateSupplicant,
  applyRemoveSupplicant,
  applyAddProphet,
  applyUpdateProphet,
  applyRemoveProphet,
  applyEstablishCult,
  applyUpdateCult,
  applyRemoveCult,
  applyAddCultDogma,
  applyUpdateCultDogma,
  applyRemoveCultDogma,
  applyCreateCampaignClass,
  applyUpdateCampaignClass,
  applyCreateCampaignDoctrine,
  applyUpdateCampaignDoctrine,
  applyInitializeMariner,
  canonicalizeInitializeMarinerInput,
  normalizeMarinerIsleMarket,
  applySetMarinerShip,
  applySetSelectedSeaLaws,
  applySetMarinerRouteOccupancy,
  applySetMarinerSeaStormCount,
  applySetMarinerIsleMarket,
  applySetMarinerIsleRavage,
  applyAddMarinerBeast,
  applyUpdateMarinerBeast,
  applyRemoveMarinerBeast,
  initializeNecromancerFingerprint,
  setNecromancerDepthFingerprint,
  setSelectedDeathLawsFingerprint,
  setNecromancerGateStatusFingerprint,
  setNecromancerSoulCountFingerprint,
  moveNecromancerSoulsFingerprint,
  addNecromancerFoeFingerprint,
  updateNecromancerFoeFingerprint,
  removeNecromancerFoeFingerprint,
  escapeNecromancerWizardFoeFingerprint,
  addNecromancerWizardFoeTruthFingerprint,
  updateNecromancerWizardFoeTruthFingerprint,
  removeNecromancerWizardFoeTruthFingerprint,
  addNecromancerWizardTraversalFingerprint,
  updateNecromancerWizardTraversalFingerprint,
  removeNecromancerWizardTraversalFingerprint,
  addNecromancerAllyFingerprint,
  updateNecromancerAllyFingerprint,
  removeNecromancerAllyFingerprint,
  addNecromancerGhoulCallerFingerprint,
  updateNecromancerGhoulCallerFingerprint,
  removeNecromancerGhoulCallerFingerprint,
  createNecromancerCampaignGateFingerprint,
  updateNecromancerCampaignGateFingerprint,
  createNecromancerCampaignPathSpaceFingerprint,
  removeNecromancerCampaignPathSpaceFingerprint,
  addNecromancerStepFingerprint,
  removeNecromancerStepFingerprint,
  canonicalizeCreateNecromancerCampaignGateInput,
  canonicalizeUpdateNecromancerCampaignGateFields,
  canonicalizeInitializeNecromancerInput,
  canonicalizeNecromancerGhoulCaller,
  canonicalizeUpdateNecromancerGhoulCallerFields,
  applyInitializeNecromancer,
  applySetNecromancerDepth,
  applySetNecromancerSelectedLaws,
  applySetNecromancerGateStatus,
  applySetNecromancerSoulCount,
  applyMoveNecromancerSouls,
  applyAddNecromancerFoe,
  applyUpdateNecromancerFoe,
  applyRemoveNecromancerFoe,
  applyEscapeNecromancerWizardFoe,
  applyAddNecromancerWizardFoeTruth,
  applyUpdateNecromancerWizardFoeTruth,
  applyRemoveNecromancerWizardFoeTruth,
  applyAddNecromancerWizardTraversal,
  applyUpdateNecromancerWizardTraversal,
  applyRemoveNecromancerWizardTraversal,
  applyAddNecromancerAlly,
  applyUpdateNecromancerAlly,
  applyRemoveNecromancerAlly,
  applyAddNecromancerGhoulCaller,
  applyUpdateNecromancerGhoulCaller,
  applyRemoveNecromancerGhoulCaller,
  applyCreateNecromancerCampaignGate,
  applyUpdateNecromancerCampaignGate,
  applyCreateNecromancerCampaignPathSpace,
  applyRemoveNecromancerCampaignPathSpace,
  applyAddNecromancerStep,
  applyRemoveNecromancerStep,
  setWizardMortalityStateFingerprint,
  setDenizenMortalityStateFingerprint,
  createPowerfulDenizenProfileFingerprint,
  removePowerfulDenizenProfileFingerprint,
  setPowerfulDenizenTaxonomiesFingerprint,
  setPowerfulDenizenStatusFingerprint,
  setPowerfulDenizenGoalFingerprint,
  addPowerfulDenizenMethodFingerprint,
  updatePowerfulDenizenMethodFingerprint,
  removePowerfulDenizenMethodFingerprint,
  addPowerfulDenizenTruthFingerprint,
  updatePowerfulDenizenTruthFingerprint,
  removePowerfulDenizenTruthFingerprint,
  createCampaignPowerfulDenizenTaxonomyFingerprint,
  updateCampaignPowerfulDenizenTaxonomyFingerprint,
  removeCampaignPowerfulDenizenTaxonomyFingerprint,
  createTreasureFingerprint,
  updateTreasureDetailsFingerprint,
  updateTreasureStateFingerprint,
  updatePactFragmentOperationalStateFingerprint,
  applySetWizardMortalityState,
  applySetDenizenMortalityState,
  applyCreatePowerfulDenizenProfile,
  applyRemovePowerfulDenizenProfile,
  applySetPowerfulDenizenTaxonomies,
  applySetPowerfulDenizenStatus,
  applySetPowerfulDenizenGoal,
  applyAddPowerfulDenizenMethod,
  applyUpdatePowerfulDenizenMethod,
  applyRemovePowerfulDenizenMethod,
  applyAddPowerfulDenizenTruth,
  applyUpdatePowerfulDenizenTruth,
  applyRemovePowerfulDenizenTruth,
  applyCreateCampaignPowerfulDenizenTaxonomy,
  applyUpdateCampaignPowerfulDenizenTaxonomy,
  applyRemoveCampaignPowerfulDenizenTaxonomy,
  applyCreateTreasure,
  applyUpdateTreasureDetails,
  applyUpdateTreasureState,
  applyUpdatePactFragmentOperationalState,
  isValidTreasureId,
  isValidCampaignPowerfulDenizenTaxonomyId,
  isValidPowerfulDenizenMethodEntryId,
  isValidPowerfulDenizenTruthId,
  isValidHierophantFlameLawId,
  isValidHierophantStartingTempleId,
  isValidHierophantTempleId,
  investigateFaustianCommunityFingerprint,
  blackmailFaustianCommunityFingerprint,
  applyInvestigateFaustianCommunity,
  applyBlackmailFaustianCommunity,
} from "../shared/domain";
import type { CurrentCampaignState, CampaignCommandType, PlayerId, WizardId, AllocationId, EngagementId, MonthOrdinal, MovablePlanetId, LunarPhase, TimeDestination, EngagementTarget, OrreryMoveDirection, DenizenId, IsleId, PlaceId, WorldPlacePlacement, UpdatePlaceFields, ExpectedFieldChange, CompanionRelationshipId, HierophantFlameLawId, HierophantStartingTempleId, HierophantTempleId, HierophantCampaignClassId, HierophantCampaignDoctrineId, HierophantDogmaEntryId, HierophantSupplicant, HierophantProphet, HierophantCult, HierophantCultDogma, HierophantCampaignClass, HierophantCampaignDoctrine, CreateTempleInput, OrdinaryTempleDoctrineState, InitializeMarinerInput, MarinerBeastState, MarinerIsleMarket, MarinerRouteOccupancy, MarinerBoardIsleId, MarinerLawOfSeaId, MarinerRouteId, MarinerSeaRegionId, MarinerArrangementId, UpdateMarinerBeastFields, InitializeNecromancerInput, NecromancerArrangementId, NecromancerLawOfDeathId, NecromancerBuiltinGateId, NecromancerBuiltinPathSpaceId, NecromancerDepthState, NecromancerSelectedLaw, NecromancerGateId, NecromancerGateStatus, NecromancerOccupiableSpaceRef, NecromancerFoeState, NecromancerFoeSubjectRef, NecromancerWizardFoeState, NecromancerWizardTraversalState, UpdateNecromancerWizardTraversalFields, NecromancerAllyState, NecromancerGhoulCallerState, UpdateNecromancerFoeFields, UpdateNecromancerAllyFields, UpdateNecromancerGhoulCallerFields, NecromancerCampaignGateId, NecromancerGateBand, UpdateNecromancerCampaignGateFields, NecromancerCampaignPathSpaceId, NecromancerPathRegion, NecromancerCampaignPathSpaceState, NecromancerDirectedStep, MortalityState, PowerfulDenizenTaxonomyRef, PowerfulDenizenStatus, PowerfulDenizenMethodDefinition, PowerfulDenizenMethodEntry, PowerfulDenizenTruthEntry, PowerfulDenizenProfile, CampaignPowerfulDenizenTaxonomy, CampaignPowerfulDenizenTaxonomyId, PowerfulDenizenMethodEntryId, PowerfulDenizenTruthId, TreasureId, TreasureCondition, TreasureCustody, PactFragmentOperationalState, FaustianCommunityId, FaustianCardId } from "../shared/domain";
import { applyBeginPlay } from "../shared/domain/begin-play";
import type { WizardInitIds } from "../shared/domain/begin-play";
import { PACT_SEAT_IDS } from "../shared/domain/pact-seats";
import type { PactSeatId } from "../shared/domain/pact-seats";
import { isValidPactSeatId } from "../shared/domain/pact-seats";
import type { AgeDefinitionId } from "../shared/domain/ages";
import { isValidAgeDefinitionId } from "../shared/domain/ages";
import { loadHistoricalState } from "../shared/domain/state-migration";
import { resolveAcceptedCommandReplay } from "../shared/domain/command-ids";
import { canonicalCommit } from "./canonicalCommit";
import type { CanonicalCommitInput, CanonicalCommitReceipt } from "./canonicalCommit";
import { assertCampaignNotDeleting } from "./deletionBarrier";
import { MOVABLE_PLANET_IDS } from "../shared/domain";
import {
  assertM5ExpectedCampaignIdMatches,
  executeConvexOrdinaryLogicalCommand,
  loadCanonicalV2ForMutation,
  type CanonicalCampaign,
} from "./ordinaryLogicalCommand";

export { assertM5ExpectedCampaignIdMatches };

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

  const replay = resolveAcceptedCommandReplay(
    commandId,
    existingCommand === null
      ? null
      : {
          commandType: existingCommand.commandType,
          commandFingerprint: existingCommand.commandFingerprint,
          campaignRevision: existingCommand.campaignRevision,
        },
    { commandType, commandFingerprint },
  );

  if (replay.kind === "not_applied") return null;

  const existingSnapshot = await ctx.db
    .query("campaignSnapshots")
    .withIndex("by_campaign_revision", (q) =>
      q.eq("campaignId", campaignId).eq("campaignRevision", replay.revision),
    )
    .unique();

  if (existingSnapshot === null) {
    throw new DomainError(
      "CAMPAIGN_STATE_CORRUPT",
      `Snapshot missing for committed revision ${replay.revision}`,
    );
  }

  const validated = loadHistoricalState(existingSnapshot.state);

  return {
    newRevision: replay.revision,
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
    acknowledgedWarningKeys: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await assertCampaignNotDeleting(ctx);
    parseLiveCommandId(args.commandId);

    if (!Number.isSafeInteger(args.expectedMonthOrdinal) || args.expectedMonthOrdinal < 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid expectedMonthOrdinal: ${args.expectedMonthOrdinal}`);
    }

    const fingerprint = advancePhaseFingerprint(args.expectedMonthOrdinal, args.expectedPhase, args.acknowledgedWarningKeys);
    const campaign = await loadCanonicalV2ForMutation(ctx);

    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "advance_phase", fingerprint);
    if (replay) return { revision: replay.newRevision };

    const result = applyAdvancePhase(campaign.currentState, {
      expectedMonthOrdinal: args.expectedMonthOrdinal as MonthOrdinal,
      expectedPhase: args.expectedPhase as LunarPhase,
      acknowledgedWarningKeys: args.acknowledgedWarningKeys,
    });

    if (result.outcome === "warnings") {
      return {
        revision: null,
        warnings: result.warnings,
      };
    }

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
      v.object({ kind: v.literal("denizen"), denizenId: v.string() }),
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
      v.object({ kind: v.literal("denizen"), denizenId: v.string() }),
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

// ============================================================
// M4 C5A: Meeting commands
// ============================================================

export const adjustWizardmootAttendance = mutation({
  args: {
    commandId: v.string(),
    expectedMonthOrdinal: v.number(),
    wizardId: v.string(),
    attended: v.boolean(),
    exceptionReason: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    await assertCampaignNotDeleting(ctx);
    parseLiveCommandId(args.commandId);

    if (!Number.isSafeInteger(args.expectedMonthOrdinal) || args.expectedMonthOrdinal < 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid expectedMonthOrdinal: ${args.expectedMonthOrdinal}`);
    }
    if (!isValidWizardId(args.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId: ${args.wizardId}`);
    }

    const fingerprint = adjustWizardmootAttendanceFingerprint(
      args.expectedMonthOrdinal,
      args.wizardId,
      args.attended,
      args.exceptionReason,
    );
    const campaign = await loadCanonicalV2ForMutation(ctx);

    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "adjust_wizardmoot_attendance", fingerprint);
    if (replay) return { revision: replay.newRevision };

    const result = applyAdjustWizardmootAttendance(campaign.currentState, {
      expectedMonthOrdinal: args.expectedMonthOrdinal as MonthOrdinal,
      wizardId: args.wizardId as WizardId,
      attended: args.attended,
      exceptionReason: args.exceptionReason,
    });
    const receipt = await commitM3Command(ctx, args.commandId, "adjust_wizardmoot_attendance", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

export const completeMeeting = mutation({
  args: {
    commandId: v.string(),
    expectedMonthOrdinal: v.number(),
  },
  handler: async (ctx, args) => {
    await assertCampaignNotDeleting(ctx);
    parseLiveCommandId(args.commandId);

    if (!Number.isSafeInteger(args.expectedMonthOrdinal) || args.expectedMonthOrdinal < 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid expectedMonthOrdinal: ${args.expectedMonthOrdinal}`);
    }

    const fingerprint = completeMeetingFingerprint(args.expectedMonthOrdinal);
    const campaign = await loadCanonicalV2ForMutation(ctx);

    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "complete_meeting", fingerprint);
    if (replay) return { revision: replay.newRevision };

    const result = applyCompleteMeeting(campaign.currentState, {
      expectedMonthOrdinal: args.expectedMonthOrdinal as MonthOrdinal,
    });
    const receipt = await commitM3Command(ctx, args.commandId, "complete_meeting", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});


// ============================================================
// M4 C5B: Begin Next Month (Quiet -> New Moon)
// ============================================================

// ============================================================
// M5: Wizard Character
// ============================================================

export const updateWizardCharacter = mutation({
  args: {
    commandId: v.string(),
    wizardId: v.string(),
    patch: v.object({
      elements: v.optional(
        v.union(
          v.object({
            air: v.number(),
            fire: v.number(),
            earth: v.number(),
            water: v.number(),
          }),
          v.null(),
        ),
      ),
      pactFragmentPersonalForm: v.optional(v.union(v.string(), v.null())),
      familiarDescription: v.optional(v.union(v.string(), v.null())),
      ageYears: v.optional(v.union(v.number(), v.null())),
      publicChangesOfMagic: v.optional(v.array(v.string())),
      importantNotes: v.optional(v.union(v.string(), v.null())),
    }),
  },
  handler: async (ctx, args) => {
    await assertCampaignNotDeleting(ctx);
    parseLiveCommandId(args.commandId);

    if (!isValidWizardId(args.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId: ${args.wizardId}`);
    }

    const normalizedPatch = normalizeWizardCharacterPatch(args.patch);
    const fingerprint = updateWizardCharacterFingerprint(args.wizardId, normalizedPatch as Record<string, unknown>);
    const campaign = await loadCanonicalV2ForMutation(ctx);

    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "update_wizard_character", fingerprint);
    if (replay) return { revision: replay.newRevision };

    const result = applyUpdateWizardCharacter(campaign.currentState, args.wizardId as WizardId, normalizedPatch);
    const receipt = await commitM3Command(ctx, args.commandId, "update_wizard_character", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

export const beginNextMonth = mutation({
  args: {
    commandId: v.string(),
    expectedMonthOrdinal: v.number(),
    acknowledgedWarningKeys: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await assertCampaignNotDeleting(ctx);
    parseLiveCommandId(args.commandId);

    if (!Number.isSafeInteger(args.expectedMonthOrdinal) || args.expectedMonthOrdinal < 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid expectedMonthOrdinal: ${args.expectedMonthOrdinal}`);
    }

    const fingerprint = beginNextMonthFingerprint(args.expectedMonthOrdinal, args.acknowledgedWarningKeys);
    const campaign = await loadCanonicalV2ForMutation(ctx);

    const replay = await checkIdempotency(ctx, campaign.campaignId, args.commandId, "begin_next_month", fingerprint);
    if (replay) return { revision: replay.newRevision };

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

    const result = applyBeginNextMonth(campaign.currentState, {
      expectedMonthOrdinal: args.expectedMonthOrdinal as MonthOrdinal,
      acknowledgedWarningKeys: args.acknowledgedWarningKeys,
    }, wizardInits);

    if (result.outcome === "warnings") {
      return {
        revision: null,
        warnings: result.warnings,
      };
    }

    const receipt = await commitM3Command(ctx, args.commandId, "begin_next_month", fingerprint, campaign, result);
    return { revision: receipt.newRevision };
  },
});

// ============================================================
// M5: Shared World — Denizen commands
// ============================================================

export const createDenizen = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    name: v.string(),
    representation: v.union(v.literal("individual"), v.literal("collective")),
    description: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidDenizenId(args.denizenId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${args.denizenId}`);
        }
        return {
          commandType: "create_denizen",
          commandFingerprint: createDenizenFingerprint(
            args.expectedCampaignId,
            args.denizenId,
            args.name,
            args.representation,
            args.description,
          ),
          apply: (state) =>
            applyCreateDenizenV5Candidate(state, {
              denizenId: args.denizenId as DenizenId,
              name: args.name,
              representation: args.representation,
              description: args.description,
            }),
        };
      },
    );
  },
});

export const updateDenizen = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    fields: v.object({
      name: v.optional(v.object({ expected: v.string(), value: v.string() })),
      representation: v.optional(v.object({
        expected: v.union(v.literal("individual"), v.literal("collective")),
        value: v.union(v.literal("individual"), v.literal("collective")),
      })),
      description: v.optional(v.object({
        expected: v.union(v.string(), v.null()),
        value: v.union(v.string(), v.null()),
      })),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidDenizenId(args.denizenId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${args.denizenId}`);
        }
        return {
          commandType: "update_denizen",
          commandFingerprint: updateDenizenFingerprint(args.expectedCampaignId, args.denizenId, args.fields),
          apply: (state) => applyUpdateDenizenV5Candidate(state, args.denizenId as DenizenId, args.fields),
        };
      },
    );
  },
});

// ============================================================
// M5: Shared World — Isle commands
// ============================================================

export const createIsle = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    isleId: v.string(),
    name: v.string(),
    description: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidIsleId(args.isleId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid isleId: ${args.isleId}`);
        }
        return {
          commandType: "create_isle",
          commandFingerprint: createIsleFingerprint(args.expectedCampaignId, args.isleId, args.name, args.description),
          apply: (state) =>
            applyCreateIsleV5Candidate(state, {
              isleId: args.isleId as IsleId,
              name: args.name,
              description: args.description,
            }),
        };
      },
    );
  },
});

export const updateIsle = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    isleId: v.string(),
    fields: v.object({
      name: v.optional(v.object({ expected: v.string(), value: v.string() })),
      description: v.optional(v.object({
        expected: v.union(v.string(), v.null()),
        value: v.union(v.string(), v.null()),
      })),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidIsleId(args.isleId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid isleId: ${args.isleId}`);
        }
        return {
          commandType: "update_isle",
          commandFingerprint: updateIsleFingerprint(args.expectedCampaignId, args.isleId, args.fields),
          apply: (state) => applyUpdateIsleV5Candidate(state, args.isleId as IsleId, args.fields),
        };
      },
    );
  },
});

// ============================================================
// M5: Shared World — Place commands
// ============================================================

const placePlacementArgValidator = v.union(
  v.object({ kind: v.literal("unspecified") }),
  v.object({ kind: v.literal("on_isle"), isleId: v.string() }),
  v.object({ kind: v.literal("mobile"), associatedIsleId: v.union(v.string(), v.null()) }),
);

export const createPlace = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    placeId: v.string(),
    name: v.string(),
    description: v.union(v.string(), v.null()),
    placement: placePlacementArgValidator,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidPlaceId(args.placeId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid placeId: ${args.placeId}`);
        }
        return {
          commandType: "create_place",
          commandFingerprint: createPlaceFingerprint(args.expectedCampaignId, args.placeId, args.name, args.description, args.placement),
          apply: (state) =>
            applyCreatePlaceV5Candidate(state, {
              placeId: args.placeId as PlaceId,
              name: args.name,
              description: args.description,
              placement: args.placement as WorldPlacePlacement,
            }),
        };
      },
    );
  },
});

export const updatePlace = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    placeId: v.string(),
    fields: v.object({
      name: v.optional(v.object({ expected: v.string(), value: v.string() })),
      description: v.optional(v.object({
        expected: v.union(v.string(), v.null()),
        value: v.union(v.string(), v.null()),
      })),
      placement: v.optional(v.object({
        expected: placePlacementArgValidator,
        value: placePlacementArgValidator,
      })),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidPlaceId(args.placeId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid placeId: ${args.placeId}`);
        }
        return {
          commandType: "update_place",
          commandFingerprint: updatePlaceFingerprint(args.expectedCampaignId, args.placeId, args.fields),
          apply: (state) => applyUpdatePlaceV5Candidate(state, args.placeId as PlaceId, args.fields as UpdatePlaceFields),
        };
      },
    );
  },
});

// ============================================================
// M5: Wizard World Association commands
// ============================================================

export const setWizardHomeIsle = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    wizardId: v.string(),
    change: v.object({
      expected: v.union(v.string(), v.null()),
      value: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidWizardId(args.wizardId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId: ${args.wizardId}`);
        }
        return {
          commandType: "set_wizard_home_isle",
          commandFingerprint: setWizardHomeIsleFingerprint(args.expectedCampaignId, args.wizardId, args.change),
          apply: (state) =>
            applySetWizardHomeIsleV5Candidate(
              state,
              args.wizardId as WizardId,
              args.change as ExpectedFieldChange<IsleId | null>,
            ),
        };
      },
    );
  },
});

export const setWizardSanctum = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    wizardId: v.string(),
    change: v.object({
      expected: v.union(v.string(), v.null()),
      value: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidWizardId(args.wizardId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId: ${args.wizardId}`);
        }
        return {
          commandType: "set_wizard_sanctum",
          commandFingerprint: setWizardSanctumFingerprint(args.expectedCampaignId, args.wizardId, args.change),
          apply: (state) =>
            applySetWizardSanctumV5Candidate(
              state,
              args.wizardId as WizardId,
              args.change as ExpectedFieldChange<PlaceId | null>,
            ),
        };
      },
    );
  },
});

export const setWizardCompanion = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    wizardId: v.string(),
    element: v.union(
      v.literal("air"),
      v.literal("fire"),
      v.literal("earth"),
      v.literal("water"),
    ),
    expectedCurrentRelationshipId: v.union(v.string(), v.null()),
    newRelationship: v.union(
      v.null(),
      v.object({
        companionRelationshipId: v.string(),
        denizenId: v.string(),
        description: v.union(v.string(), v.null()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidWizardId(args.wizardId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId: ${args.wizardId}`);
        }
        return {
          commandType: "set_wizard_companion",
          commandFingerprint: setWizardCompanionFingerprint({
            expectedCampaignId: args.expectedCampaignId,
            wizardId: args.wizardId,
            element: args.element,
            expectedCurrentRelationshipId: args.expectedCurrentRelationshipId,
            newRelationship: args.newRelationship,
          }),
          apply: (state) =>
            applySetWizardCompanionV5Candidate(state, {
              wizardId: args.wizardId as WizardId,
              element: args.element,
              expectedCurrentRelationshipId: args.expectedCurrentRelationshipId as CompanionRelationshipId | null,
              newRelationship: args.newRelationship === null
                ? null
                : {
                    companionRelationshipId: args.newRelationship.companionRelationshipId as CompanionRelationshipId,
                    denizenId: args.newRelationship.denizenId as DenizenId,
                    description: args.newRelationship.description,
                  },
            }),
        };
      },
    );
  },
});

export const updateCompanionDescription = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    companionRelationshipId: v.string(),
    expectedStatus: v.union(v.literal("current"), v.literal("ended")),
    description: v.object({
      expected: v.union(v.string(), v.null()),
      value: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidCompanionRelationshipId(args.companionRelationshipId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid companionRelationshipId: ${args.companionRelationshipId}`);
        }
        return {
          commandType: "update_companion_description",
          commandFingerprint: updateCompanionDescriptionFingerprint({
            expectedCampaignId: args.expectedCampaignId,
            companionRelationshipId: args.companionRelationshipId,
            expectedStatus: args.expectedStatus,
            description: args.description,
          }),
          apply: (state) =>
            applyUpdateCompanionDescriptionV5Candidate(state, {
              companionRelationshipId: args.companionRelationshipId as CompanionRelationshipId,
              expectedStatus: args.expectedStatus,
              description: args.description,
            }),
        };
      },
    );
  },
});

export const initializeHierophant = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    selectedFlameLawIds: v.array(v.string()),
    templePlaces: v.array(v.object({
      templeId: v.string(),
      placeId: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        for (const lawId of args.selectedFlameLawIds) {
          if (!isValidHierophantFlameLawId(lawId)) {
            throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Flame Law id: ${lawId}`);
          }
        }
        for (const binding of args.templePlaces) {
          if (!isValidHierophantStartingTempleId(binding.templeId)) {
            throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown starting Temple id: ${binding.templeId}`);
          }
          if (!isValidPlaceId(binding.placeId)) {
            throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Temple placeId: ${binding.placeId}`);
          }
        }
        return {
          commandType: "initialize_hierophant",
          commandFingerprint: initializeHierophantFingerprint(
            args.expectedCampaignId,
            args.selectedFlameLawIds,
            args.templePlaces,
          ),
          apply: (state) =>
            applyInitializeHierophant(state, {
              selectedFlameLawIds: args.selectedFlameLawIds as HierophantFlameLawId[],
              templePlaces: args.templePlaces.map((b) => ({
                templeId: b.templeId as HierophantStartingTempleId,
                placeId: b.placeId as PlaceId,
              })),
            }),
        };
      },
    );
  },
});

export const adjustTempleResources = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    templeId: v.string(),
    fields: v.object({
      abundance: v.optional(v.object({ expected: v.number(), value: v.number() })),
      conviction: v.optional(v.object({ expected: v.number(), value: v.number() })),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidHierophantTempleId(args.templeId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Temple id: ${args.templeId}`);
        }
        return {
          commandType: "adjust_temple_resources",
          commandFingerprint: adjustTempleResourcesFingerprint(
            args.expectedCampaignId,
            args.templeId,
            args.fields,
          ),
          apply: (state) =>
            applyAdjustTempleResources(
              state,
              args.templeId as HierophantTempleId,
              args.fields,
            ),
        };
      },
    );
  },
});

const ordinaryDoctrineArg = v.union(
  v.object({ kind: v.literal("unset") }),
  v.object({ kind: v.literal("doctrine"), doctrineId: v.string() }),
  v.object({ kind: v.literal("blasphemy"), blasphemyId: v.string() }),
);

const expectedString = v.object({ expected: v.string(), value: v.string() });
const expectedNullableString = v.object({
  expected: v.union(v.string(), v.null()),
  value: v.union(v.string(), v.null()),
});
const expectedNumber = v.object({ expected: v.number(), value: v.number() });

const supplicantHostArg = v.union(
  v.object({
    kind: v.literal("temple"),
    templeId: v.string(),
    area: v.union(v.literal("courtyard"), v.literal("agiary"), v.null()),
  }),
  v.object({
    kind: v.literal("cult"),
    cultDenizenId: v.string(),
  }),
);

const prophetHostArg = v.union(
  v.object({ kind: v.literal("temple"), templeId: v.string() }),
  v.object({ kind: v.literal("cult"), cultDenizenId: v.string() }),
);

const cultDogmaArg = v.union(
  v.object({
    dogmaEntryId: v.string(),
    kind: v.literal("builtin"),
    dogmaId: v.string(),
  }),
  v.object({
    dogmaEntryId: v.string(),
    kind: v.literal("custom"),
    category: v.union(
      v.literal("apocalyptic"),
      v.literal("ascetic"),
      v.literal("delirious"),
      v.literal("perverse"),
      v.literal("vain"),
      v.literal("custom"),
    ),
    text: v.string(),
  }),
);

const campaignBlasphemyArg = v.object({ blasphemyId: v.string(), text: v.string() });

export const createTemple = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    templeId: v.string(),
    placeId: v.string(),
    hostSeatId: v.string(),
    abundance: v.number(),
    conviction: v.number(),
    status: v.union(v.literal("active"), v.literal("collapsed")),
    doctrine: ordinaryDoctrineArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        const input: CreateTempleInput = {
          templeId: args.templeId as HierophantTempleId,
          placeId: args.placeId as PlaceId,
          hostSeatId: args.hostSeatId as PactSeatId,
          abundance: args.abundance,
          conviction: args.conviction,
          status: args.status,
          doctrine: args.doctrine as OrdinaryTempleDoctrineState,
        };
        return {
          commandType: "create_temple",
          commandFingerprint: createTempleFingerprint(args.expectedCampaignId, input),
          apply: (state) => applyCreateTemple(state, input),
        };
      },
    );
  },
});

export const updateTemple = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    templeId: v.string(),
    fields: v.object({
      placeId: v.optional(v.object({ expected: v.string(), value: v.string() })),
      hostSeatId: v.optional(expectedString),
      status: v.optional(v.object({
        expected: v.union(v.literal("active"), v.literal("collapsed")),
        value: v.union(v.literal("active"), v.literal("collapsed")),
      })),
      doctrine: v.optional(v.object({
        expected: ordinaryDoctrineArg,
        value: ordinaryDoctrineArg,
      })),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "update_temple",
        commandFingerprint: updateTempleFingerprint(args.expectedCampaignId, args.templeId, args.fields),
        apply: (state) => applyUpdateTemple(state, args.templeId as HierophantTempleId, {
          placeId: args.fields.placeId as ExpectedFieldChange<PlaceId> | undefined,
          hostSeatId: args.fields.hostSeatId as ExpectedFieldChange<PactSeatId> | undefined,
          status: args.fields.status,
          doctrine: args.fields.doctrine as ExpectedFieldChange<OrdinaryTempleDoctrineState> | undefined,
        }),
      }),
    );
  },
});

export const setTempleHoliday = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    templeId: v.string(),
    marked: v.boolean(),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "set_temple_holiday",
        commandFingerprint: setTempleHolidayFingerprint(args.expectedCampaignId, args.templeId, args.marked),
        apply: (state) => applySetTempleHoliday(state, args.templeId as HierophantTempleId, args.marked),
      }),
    );
  },
});

export const setSelectedFlameLaws = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    expectedSelectedFlameLawIds: v.array(v.string()),
    selectedFlameLawIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "set_selected_flame_laws",
        commandFingerprint: setSelectedFlameLawsFingerprint(
          args.expectedCampaignId,
          args.expectedSelectedFlameLawIds,
          args.selectedFlameLawIds,
        ),
        apply: (state) =>
          applySetSelectedFlameLaws(
            state,
            args.expectedSelectedFlameLawIds as HierophantFlameLawId[],
            args.selectedFlameLawIds as HierophantFlameLawId[],
          ),
      }),
    );
  },
});

export const addSupplicant = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    classId: v.string(),
    woe: v.number(),
    host: supplicantHostArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        const supplicant = {
          denizenId: args.denizenId,
          classId: args.classId,
          woe: args.woe,
          host: args.host,
        } as HierophantSupplicant;
        return {
          commandType: "add_supplicant",
          commandFingerprint: addSupplicantFingerprint(args.expectedCampaignId, supplicant),
          apply: (state) => applyAddSupplicant(state, supplicant),
        };
      },
    );
  },
});

export const updateSupplicant = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    fields: v.object({
      classId: v.optional(expectedString),
      woe: v.optional(expectedNumber),
      host: v.optional(v.object({ expected: supplicantHostArg, value: supplicantHostArg })),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "update_supplicant",
        commandFingerprint: updateSupplicantFingerprint(args.expectedCampaignId, args.denizenId, args.fields),
        apply: (state) => applyUpdateSupplicant(state, args.denizenId as DenizenId, args.fields as never),
      }),
    );
  },
});

export const removeSupplicant = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "remove_supplicant",
        commandFingerprint: removeSupplicantFingerprint(args.expectedCampaignId, args.denizenId),
        apply: (state) => applyRemoveSupplicant(state, args.denizenId as DenizenId),
      }),
    );
  },
});

export const addProphet = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    host: prophetHostArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        const prophet = {
          denizenId: args.denizenId,
          host: args.host,
        } as HierophantProphet;
        return {
          commandType: "add_prophet",
          commandFingerprint: addProphetFingerprint(args.expectedCampaignId, prophet),
          apply: (state) => applyAddProphet(state, prophet),
        };
      },
    );
  },
});

export const updateProphet = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    fields: v.object({
      host: v.optional(v.object({ expected: prophetHostArg, value: prophetHostArg })),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "update_prophet",
        commandFingerprint: updateProphetFingerprint(args.expectedCampaignId, args.denizenId, args.fields),
        apply: (state) => applyUpdateProphet(state, args.denizenId as DenizenId, args.fields as never),
      }),
    );
  },
});

export const removeProphet = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "remove_prophet",
        commandFingerprint: removeProphetFingerprint(args.expectedCampaignId, args.denizenId),
        apply: (state) => applyRemoveProphet(state, args.denizenId as DenizenId),
      }),
    );
  },
});

export const establishCult = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    cultDenizenId: v.string(),
    hostSeatId: v.string(),
    anchorPlaceId: v.union(v.string(), v.null()),
    leaderDenizenId: v.union(v.string(), v.null()),
    blasphemyId: v.string(),
    abundance: v.number(),
    conviction: v.number(),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        const cult = {
          cultDenizenId: args.cultDenizenId,
          hostSeatId: args.hostSeatId,
          anchorPlaceId: args.anchorPlaceId,
          leaderDenizenId: args.leaderDenizenId,
          blasphemyId: args.blasphemyId,
          abundance: args.abundance,
          conviction: args.conviction,
          dogmas: [],
        } as unknown as HierophantCult;
        return {
          commandType: "establish_cult",
          commandFingerprint: establishCultFingerprint(args.expectedCampaignId, cult),
          apply: (state) => applyEstablishCult(state, cult),
        };
      },
    );
  },
});

export const updateCult = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    cultDenizenId: v.string(),
    fields: v.object({
      hostSeatId: v.optional(expectedString),
      anchorPlaceId: v.optional(expectedNullableString),
      leaderDenizenId: v.optional(expectedNullableString),
      blasphemyId: v.optional(expectedString),
      abundance: v.optional(expectedNumber),
      conviction: v.optional(expectedNumber),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "update_cult",
        commandFingerprint: updateCultFingerprint(args.expectedCampaignId, args.cultDenizenId, args.fields),
        apply: (state) => applyUpdateCult(state, args.cultDenizenId as DenizenId, args.fields as never),
      }),
    );
  },
});

export const removeCult = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    cultDenizenId: v.string(),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "remove_cult",
        commandFingerprint: removeCultFingerprint(args.expectedCampaignId, args.cultDenizenId),
        apply: (state) => applyRemoveCult(state, args.cultDenizenId as DenizenId),
      }),
    );
  },
});

export const addCultDogma = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    cultDenizenId: v.string(),
    dogma: cultDogmaArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "add_cult_dogma",
        commandFingerprint: addCultDogmaFingerprint(args.expectedCampaignId, args.cultDenizenId, args.dogma),
        apply: (state) => applyAddCultDogma(
          state,
          args.cultDenizenId as DenizenId,
          args.dogma as HierophantCultDogma,
        ),
      }),
    );
  },
});

export const updateCultDogma = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    cultDenizenId: v.string(),
    dogmaEntryId: v.string(),
    fields: v.object({
      category: v.optional(v.object({
        expected: v.string(),
        value: v.string(),
      })),
      text: v.optional(expectedString),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "update_cult_dogma",
        commandFingerprint: updateCultDogmaFingerprint(
          args.expectedCampaignId,
          args.cultDenizenId,
          args.dogmaEntryId,
          args.fields,
        ),
        apply: (state) => applyUpdateCultDogma(
          state,
          args.cultDenizenId as DenizenId,
          args.dogmaEntryId as HierophantDogmaEntryId,
          args.fields as never,
        ),
      }),
    );
  },
});

export const removeCultDogma = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    cultDenizenId: v.string(),
    dogmaEntryId: v.string(),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "remove_cult_dogma",
        commandFingerprint: removeCultDogmaFingerprint(
          args.expectedCampaignId,
          args.cultDenizenId,
          args.dogmaEntryId,
        ),
        apply: (state) => applyRemoveCultDogma(
          state,
          args.cultDenizenId as DenizenId,
          args.dogmaEntryId as HierophantDogmaEntryId,
        ),
      }),
    );
  },
});

export const createCampaignClass = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    classId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        const campaignClass = { classId: args.classId, name: args.name } as HierophantCampaignClass;
        return {
          commandType: "create_campaign_class",
          commandFingerprint: createCampaignClassFingerprint(args.expectedCampaignId, campaignClass),
          apply: (state) => applyCreateCampaignClass(state, campaignClass),
        };
      },
    );
  },
});

export const updateCampaignClass = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    classId: v.string(),
    name: expectedString,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "update_campaign_class",
        commandFingerprint: updateCampaignClassFingerprint(args.expectedCampaignId, args.classId, args.name),
        apply: (state) => applyUpdateCampaignClass(
          state,
          args.classId as HierophantCampaignClassId,
          args.name,
        ),
      }),
    );
  },
});

export const createCampaignDoctrine = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    doctrineId: v.string(),
    orthodoxText: v.union(v.string(), v.null()),
    blasphemy: v.union(campaignBlasphemyArg, v.null()),
    supportedClassIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        const campaignDoctrine = {
          doctrineId: args.doctrineId,
          orthodoxText: args.orthodoxText,
          blasphemy: args.blasphemy,
          supportedClassIds: args.supportedClassIds,
        } as unknown as HierophantCampaignDoctrine;
        return {
          commandType: "create_campaign_doctrine",
          commandFingerprint: createCampaignDoctrineFingerprint(args.expectedCampaignId, campaignDoctrine),
          apply: (state) => applyCreateCampaignDoctrine(state, campaignDoctrine),
        };
      },
    );
  },
});

export const updateCampaignDoctrine = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    doctrineId: v.string(),
    fields: v.object({
      orthodoxText: v.optional(expectedNullableString),
      blasphemy: v.optional(v.object({
        expected: v.union(campaignBlasphemyArg, v.null()),
        value: v.union(campaignBlasphemyArg, v.null()),
      })),
      supportedClassIds: v.optional(v.object({
        expected: v.array(v.string()),
        value: v.array(v.string()),
      })),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "update_campaign_doctrine",
        commandFingerprint: updateCampaignDoctrineFingerprint(
          args.expectedCampaignId,
          args.doctrineId,
          args.fields,
        ),
        apply: (state) => applyUpdateCampaignDoctrine(
          state,
          args.doctrineId as HierophantCampaignDoctrineId,
          args.fields as never,
        ),
      }),
    );
  },
});

const marinerRouteEndpointArg = v.union(
  v.object({
    kind: v.literal("board_isle"),
    boardIsleId: v.string(),
  }),
  v.object({
    kind: v.literal("external_land"),
    externalLandId: v.string(),
  }),
);

const marinerRouteOccupancyArg = v.union(
  v.object({ kind: v.literal("empty") }),
  v.object({ kind: v.literal("ship") }),
  v.object({
    kind: v.literal("raider"),
    toward: marinerRouteEndpointArg,
  }),
);

const marinerIsleMarketArg = v.union(
  v.object({ present: v.literal(false) }),
  v.object({
    present: v.literal(true),
    rarity: v.union(v.string(), v.null()),
  }),
);

const marinerBeastLocationArg = v.union(
  v.object({
    kind: v.literal("sea_region"),
    regionId: v.string(),
  }),
  v.object({
    kind: v.literal("board_isle"),
    boardIsleId: v.string(),
  }),
  v.object({ kind: v.literal("off_map") }),
  v.object({
    kind: v.literal("other_domain"),
    seatId: v.string(),
  }),
);

const marinerBeastArg = v.object({
  denizenId: v.string(),
  element: v.string(),
  definitionId: v.union(v.string(), v.null()),
  condition: v.string(),
  location: marinerBeastLocationArg,
});

export const initializeMariner = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    arrangementId: v.string(),
    shipPlaceId: v.string(),
    selectedLawOfSeaIds: v.array(v.string()),
    isleBindings: v.array(v.object({
      boardIsleId: v.string(),
      worldIsleId: v.string(),
    })),
    arrangementBeasts: v.array(marinerBeastArg),
    rarityDescriptions: v.array(v.object({
      boardIsleId: v.string(),
      description: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        const input = canonicalizeInitializeMarinerInput({
          arrangementId: args.arrangementId as MarinerArrangementId,
          shipPlaceId: args.shipPlaceId as PlaceId,
          selectedLawOfSeaIds: args.selectedLawOfSeaIds as MarinerLawOfSeaId[],
          isleBindings: args.isleBindings.map((binding) => ({
            boardIsleId: binding.boardIsleId as MarinerBoardIsleId,
            worldIsleId: binding.worldIsleId as IsleId,
          })),
          arrangementBeasts: args.arrangementBeasts as MarinerBeastState[],
          rarityDescriptions: args.rarityDescriptions.map((entry) => ({
            boardIsleId: entry.boardIsleId as MarinerBoardIsleId,
            description: entry.description,
          })),
        });
        return {
          commandType: "initialize_mariner",
          commandFingerprint: initializeMarinerFingerprint(args.expectedCampaignId, input),
          apply: (state) => applyInitializeMariner(state, input),
        };
      },
    );
  },
});

export const setMarinerShip = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    expectedShipPlaceId: v.string(),
    shipPlaceId: v.string(),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "set_mariner_ship",
        commandFingerprint: setMarinerShipFingerprint(
          args.expectedCampaignId,
          args.expectedShipPlaceId,
          args.shipPlaceId,
        ),
        apply: (state) => applySetMarinerShip(
          state,
          args.expectedShipPlaceId as PlaceId,
          args.shipPlaceId as PlaceId,
        ),
      }),
    );
  },
});

export const setSelectedSeaLaws = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    expectedSelectedLawOfSeaIds: v.array(v.string()),
    selectedLawOfSeaIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "set_selected_sea_laws",
        commandFingerprint: setSelectedSeaLawsFingerprint(
          args.expectedCampaignId,
          args.expectedSelectedLawOfSeaIds,
          args.selectedLawOfSeaIds,
        ),
        apply: (state) => applySetSelectedSeaLaws(
          state,
          args.expectedSelectedLawOfSeaIds as MarinerLawOfSeaId[],
          args.selectedLawOfSeaIds as MarinerLawOfSeaId[],
        ),
      }),
    );
  },
});

export const setMarinerRouteOccupancy = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    routeId: v.string(),
    expectedOccupancy: marinerRouteOccupancyArg,
    occupancy: marinerRouteOccupancyArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "set_mariner_route_occupancy",
        commandFingerprint: setMarinerRouteOccupancyFingerprint(
          args.expectedCampaignId,
          args.routeId,
          args.expectedOccupancy,
          args.occupancy,
        ),
        apply: (state) => applySetMarinerRouteOccupancy(
          state,
          args.routeId as MarinerRouteId,
          args.expectedOccupancy as MarinerRouteOccupancy,
          args.occupancy as MarinerRouteOccupancy,
        ),
      }),
    );
  },
});

export const setMarinerSeaStormCount = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    regionId: v.string(),
    expectedStormCount: v.number(),
    stormCount: v.number(),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "set_mariner_sea_storm_count",
        commandFingerprint: setMarinerSeaStormCountFingerprint(
          args.expectedCampaignId,
          args.regionId,
          args.expectedStormCount,
          args.stormCount,
        ),
        apply: (state) => applySetMarinerSeaStormCount(
          state,
          args.regionId as MarinerSeaRegionId,
          args.expectedStormCount,
          args.stormCount,
        ),
      }),
    );
  },
});

export const setMarinerIsleMarket = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    boardIsleId: v.string(),
    expectedMarket: marinerIsleMarketArg,
    market: marinerIsleMarketArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        const market = normalizeMarinerIsleMarket(args.market as MarinerIsleMarket);
        return {
          commandType: "set_mariner_isle_market",
          commandFingerprint: setMarinerIsleMarketFingerprint(
            args.expectedCampaignId,
            args.boardIsleId,
            args.expectedMarket,
            market,
          ),
          apply: (state) => applySetMarinerIsleMarket(
            state,
            args.boardIsleId as MarinerBoardIsleId,
            args.expectedMarket as MarinerIsleMarket,
            market,
          ),
        };
      },
    );
  },
});

export const setMarinerIsleRavage = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    boardIsleId: v.string(),
    expectedRavageStormCount: v.number(),
    ravageStormCount: v.number(),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "set_mariner_isle_ravage",
        commandFingerprint: setMarinerIsleRavageFingerprint(
          args.expectedCampaignId,
          args.boardIsleId,
          args.expectedRavageStormCount,
          args.ravageStormCount,
        ),
        apply: (state) => applySetMarinerIsleRavage(
          state,
          args.boardIsleId as MarinerBoardIsleId,
          args.expectedRavageStormCount,
          args.ravageStormCount,
        ),
      }),
    );
  },
});

export const addMarinerBeast = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    element: v.string(),
    definitionId: v.union(v.string(), v.null()),
    condition: v.string(),
    location: marinerBeastLocationArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        const beast = {
          denizenId: args.denizenId,
          element: args.element,
          definitionId: args.definitionId,
          condition: args.condition,
          location: args.location,
        } as MarinerBeastState;
        return {
          commandType: "add_mariner_beast",
          commandFingerprint: addMarinerBeastFingerprint(args.expectedCampaignId, beast),
          apply: (state) => applyAddMarinerBeast(state, beast),
        };
      },
    );
  },
});

export const updateMarinerBeast = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    fields: v.object({
      element: v.optional(v.object({ expected: v.string(), value: v.string() })),
      definitionId: v.optional(v.object({
        expected: v.union(v.string(), v.null()),
        value: v.union(v.string(), v.null()),
      })),
      condition: v.optional(v.object({ expected: v.string(), value: v.string() })),
      location: v.optional(v.object({
        expected: marinerBeastLocationArg,
        value: marinerBeastLocationArg,
      })),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "update_mariner_beast",
        commandFingerprint: updateMarinerBeastFingerprint(
          args.expectedCampaignId,
          args.denizenId,
          args.fields,
        ),
        apply: (state) => applyUpdateMarinerBeast(
          state,
          args.denizenId as DenizenId,
          args.fields as UpdateMarinerBeastFields,
        ),
      }),
    );
  },
});

export const removeMarinerBeast = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    expectedBeast: marinerBeastArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "remove_mariner_beast",
        commandFingerprint: removeMarinerBeastFingerprint(
          args.expectedCampaignId,
          args.denizenId,
          args.expectedBeast,
        ),
        apply: (state) => applyRemoveMarinerBeast(
          state,
          args.denizenId as DenizenId,
          args.expectedBeast as MarinerBeastState,
        ),
      }),
    );
  },
});

const necromancerOccupiableArg = v.union(
  v.object({
    kind: v.literal("gate"),
    gateId: v.string(),
  }),
  v.object({
    kind: v.literal("path"),
    pathSpaceId: v.string(),
  }),
);

const necromancerFoeLocationArg = v.union(
  necromancerOccupiableArg,
  v.object({
    kind: v.literal("escaped"),
    seatId: v.string(),
    abominationKind: v.string(),
  }),
);

const necromancerDepthArg = v.union(
  v.null(),
  v.object({
    wizardId: v.string(),
    value: v.number(),
  }),
);

const necromancerSelectedLawArg = v.object({
  lawId: v.string(),
  visibility: v.string(),
});

const necromancerPathLocationArg = v.object({
  kind: v.literal("path"),
  pathSpaceId: v.string(),
});

const necromancerFoeSubjectArg = v.union(
  v.object({
    kind: v.literal("denizen"),
    denizenId: v.string(),
  }),
  v.object({
    kind: v.literal("wizard"),
    wizardId: v.string(),
  }),
);

const necromancerFoeArg = v.union(
  v.object({
    subject: v.object({
      kind: v.literal("denizen"),
      denizenId: v.string(),
    }),
    location: necromancerFoeLocationArg,
  }),
  v.object({
    subject: v.object({
      kind: v.literal("wizard"),
      wizardId: v.string(),
    }),
    location: necromancerFoeLocationArg,
    truths: v.array(v.object({
      truthId: v.string(),
      text: v.string(),
      origin: v.union(v.literal("source"), v.literal("campaign")),
    })),
  }),
);

const necromancerWizardTraversalArg = v.object({
  wizardId: v.string(),
  kind: v.string(),
  location: necromancerOccupiableArg,
});

const necromancerAllyArg = v.object({
  denizenId: v.string(),
  location: necromancerOccupiableArg,
});

const necromancerGhoulCallerArg = v.object({
  denizenId: v.string(),
  location: necromancerPathLocationArg,
  pettyDeadCount: v.number(),
  primaryElement: v.union(
    v.literal("air"),
    v.literal("fire"),
    v.literal("earth"),
    v.literal("water"),
  ),
  aesthetic: v.string(),
  strangeQuirk: v.string(),
  ageYears: v.number(),
});

const necromancerDirectedStepArg = v.object({
  from: necromancerOccupiableArg,
  to: necromancerOccupiableArg,
});

const necromancerCampaignPathSpaceArg = v.object({
  origin: v.literal("campaign"),
  pathSpaceId: v.string(),
  region: v.string(),
});

export const initializeNecromancer = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    arrangementId: v.string(),
    selectedLawIds: v.array(v.string()),
    arrangementFoes: v.array(v.object({
      denizenId: v.string(),
      gateId: v.string(),
    })),
    arrangementAlly: v.object({
      denizenId: v.string(),
      gateId: v.string(),
    }),
    arrangementGhoulCaller: v.union(
      v.null(),
      v.object({
        denizenId: v.string(),
        pathSpaceId: v.string(),
        primaryElement: v.union(
          v.literal("air"),
          v.literal("fire"),
          v.literal("earth"),
          v.literal("water"),
        ),
        aesthetic: v.string(),
        strangeQuirk: v.string(),
        ageYears: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        const input = canonicalizeInitializeNecromancerInput({
          arrangementId: args.arrangementId as NecromancerArrangementId,
          selectedLawIds: args.selectedLawIds as NecromancerLawOfDeathId[],
          arrangementFoes: args.arrangementFoes.map((foe) => ({
            denizenId: foe.denizenId as DenizenId,
            gateId: foe.gateId as NecromancerBuiltinGateId,
          })),
          arrangementAlly: {
            denizenId: args.arrangementAlly.denizenId as DenizenId,
            gateId: args.arrangementAlly.gateId as NecromancerBuiltinGateId,
          },
          arrangementGhoulCaller: args.arrangementGhoulCaller === null
            ? null
            : {
                denizenId: args.arrangementGhoulCaller.denizenId as DenizenId,
                pathSpaceId: args.arrangementGhoulCaller.pathSpaceId as NecromancerBuiltinPathSpaceId,
                primaryElement: args.arrangementGhoulCaller.primaryElement,
                aesthetic: args.arrangementGhoulCaller.aesthetic,
                strangeQuirk: args.arrangementGhoulCaller.strangeQuirk,
                ageYears: args.arrangementGhoulCaller.ageYears,
              },
        });
        return {
          commandType: "initialize_necromancer",
          commandFingerprint: initializeNecromancerFingerprint(args.expectedCampaignId, input),
          apply: (state) => applyInitializeNecromancer(state, input),
        };
      },
    );
  },
});

export const setNecromancerDepth = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    expectedDepth: necromancerDepthArg,
    depth: necromancerDepthArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "set_necromancer_depth",
        commandFingerprint: setNecromancerDepthFingerprint(
          args.expectedCampaignId,
          args.expectedDepth,
          args.depth,
        ),
        apply: (state) => applySetNecromancerDepth(
          state,
          args.expectedDepth as NecromancerDepthState | null,
          args.depth as NecromancerDepthState | null,
        ),
      }),
    );
  },
});

export const setSelectedDeathLaws = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    expectedSelectedLaws: v.array(necromancerSelectedLawArg),
    selectedLaws: v.array(necromancerSelectedLawArg),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "set_selected_death_laws",
        commandFingerprint: setSelectedDeathLawsFingerprint(
          args.expectedCampaignId,
          args.expectedSelectedLaws,
          args.selectedLaws,
        ),
        apply: (state) => applySetNecromancerSelectedLaws(
          state,
          args.expectedSelectedLaws as NecromancerSelectedLaw[],
          args.selectedLaws as NecromancerSelectedLaw[],
        ),
      }),
    );
  },
});

export const setNecromancerGateStatus = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    gateId: v.string(),
    expectedStatus: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "set_necromancer_gate_status",
        commandFingerprint: setNecromancerGateStatusFingerprint(
          args.expectedCampaignId,
          args.gateId,
          args.expectedStatus,
          args.status,
        ),
        apply: (state) => applySetNecromancerGateStatus(
          state,
          args.gateId as NecromancerGateId,
          args.expectedStatus as NecromancerGateStatus,
          args.status as NecromancerGateStatus,
        ),
      }),
    );
  },
});

export const setNecromancerSoulCount = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    location: necromancerOccupiableArg,
    expectedCount: v.number(),
    count: v.number(),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "set_necromancer_soul_count",
        commandFingerprint: setNecromancerSoulCountFingerprint(
          args.expectedCampaignId,
          args.location,
          args.expectedCount,
          args.count,
        ),
        apply: (state) => applySetNecromancerSoulCount(
          state,
          args.location as NecromancerOccupiableSpaceRef,
          args.expectedCount,
          args.count,
        ),
      }),
    );
  },
});

export const moveNecromancerSouls = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    from: necromancerOccupiableArg,
    to: necromancerOccupiableArg,
    amount: v.number(),
    expectedFromCount: v.number(),
    expectedToCount: v.number(),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "move_necromancer_souls",
        commandFingerprint: moveNecromancerSoulsFingerprint(
          args.expectedCampaignId,
          args.from,
          args.to,
          args.amount,
          args.expectedFromCount,
          args.expectedToCount,
        ),
        apply: (state) => applyMoveNecromancerSouls(
          state,
          args.from as NecromancerOccupiableSpaceRef,
          args.to as NecromancerOccupiableSpaceRef,
          args.amount,
          args.expectedFromCount,
          args.expectedToCount,
        ),
      }),
    );
  },
});

export const addNecromancerFoe = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    foe: necromancerFoeArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        const foe = args.foe as NecromancerFoeState;
        return {
          commandType: "add_necromancer_foe",
          commandFingerprint: addNecromancerFoeFingerprint(args.expectedCampaignId, foe),
          apply: (state) => applyAddNecromancerFoe(state, foe),
        };
      },
    );
  },
});

export const updateNecromancerFoe = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    subject: necromancerFoeSubjectArg,
    fields: v.object({
      location: v.optional(v.object({
        expected: necromancerFoeLocationArg,
        value: necromancerFoeLocationArg,
      })),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "update_necromancer_foe",
        commandFingerprint: updateNecromancerFoeFingerprint(
          args.expectedCampaignId,
          args.subject,
          args.fields,
        ),
        apply: (state) => applyUpdateNecromancerFoe(
          state,
          args.subject as NecromancerFoeSubjectRef,
          args.fields as UpdateNecromancerFoeFields,
        ),
      }),
    );
  },
});

export const removeNecromancerFoe = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    subject: necromancerFoeSubjectArg,
    expectedFoe: necromancerFoeArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "remove_necromancer_foe",
        commandFingerprint: removeNecromancerFoeFingerprint(
          args.expectedCampaignId,
          args.subject,
          args.expectedFoe,
        ),
        apply: (state) => applyRemoveNecromancerFoe(
          state,
          args.subject as NecromancerFoeSubjectRef,
          args.expectedFoe as NecromancerFoeState,
        ),
      }),
    );
  },
});

export const escapeNecromancerWizardFoe = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    wizardId: v.string(),
    expectedMortalityState: v.literal("deceased"),
    expectedFoe: necromancerFoeArg,
    destinationSeatId: v.string(),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidWizardId(args.wizardId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId: ${args.wizardId}`);
        }
        if (!isValidPactSeatId(args.destinationSeatId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid destinationSeatId: ${args.destinationSeatId}`);
        }
        return {
          commandType: "escape_necromancer_wizard_foe",
          commandFingerprint: escapeNecromancerWizardFoeFingerprint(
            args.expectedCampaignId,
            args.wizardId,
            args.expectedMortalityState,
            args.expectedFoe,
            args.destinationSeatId,
          ),
          apply: (state) => applyEscapeNecromancerWizardFoe(
            state,
            args.wizardId as WizardId,
            args.expectedMortalityState,
            args.expectedFoe as unknown as NecromancerWizardFoeState,
            args.destinationSeatId as PactSeatId,
          ),
        };
      },
    );
  },
});

export const addNecromancerWizardFoeTruth = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    wizardId: v.string(),
    truthId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidWizardId(args.wizardId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId: ${args.wizardId}`);
        }
        if (!isValidPowerfulDenizenTruthId(args.truthId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid truthId: ${args.truthId}`);
        }
        return {
          commandType: "add_necromancer_wizard_foe_truth",
          commandFingerprint: addNecromancerWizardFoeTruthFingerprint(
            args.expectedCampaignId,
            args.wizardId,
            args.truthId,
            args.text,
          ),
          apply: (state) => applyAddNecromancerWizardFoeTruth(state, {
            wizardId: args.wizardId as WizardId,
            truthId: args.truthId as PowerfulDenizenTruthId,
            text: args.text,
          }),
        };
      },
    );
  },
});

export const updateNecromancerWizardFoeTruth = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    wizardId: v.string(),
    truthId: v.string(),
    expectedText: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidWizardId(args.wizardId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId: ${args.wizardId}`);
        }
        if (!isValidPowerfulDenizenTruthId(args.truthId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid truthId: ${args.truthId}`);
        }
        return {
          commandType: "update_necromancer_wizard_foe_truth",
          commandFingerprint: updateNecromancerWizardFoeTruthFingerprint(
            args.expectedCampaignId,
            args.wizardId,
            args.truthId,
            args.expectedText,
            args.text,
          ),
          apply: (state) => applyUpdateNecromancerWizardFoeTruth(
            state,
            args.wizardId as WizardId,
            args.truthId as PowerfulDenizenTruthId,
            { expected: args.expectedText, value: args.text },
          ),
        };
      },
    );
  },
});

export const removeNecromancerWizardFoeTruth = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    wizardId: v.string(),
    truthId: v.string(),
    expectedTruth: v.object({
      truthId: v.string(),
      text: v.string(),
      origin: v.union(v.literal("source"), v.literal("campaign")),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidWizardId(args.wizardId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId: ${args.wizardId}`);
        }
        if (!isValidPowerfulDenizenTruthId(args.truthId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid truthId: ${args.truthId}`);
        }
        return {
          commandType: "remove_necromancer_wizard_foe_truth",
          commandFingerprint: removeNecromancerWizardFoeTruthFingerprint(
            args.expectedCampaignId,
            args.wizardId,
            args.truthId,
            args.expectedTruth,
          ),
          apply: (state) => applyRemoveNecromancerWizardFoeTruth(
            state,
            args.wizardId as WizardId,
            args.truthId as PowerfulDenizenTruthId,
            args.expectedTruth as PowerfulDenizenTruthEntry,
          ),
        };
      },
    );
  },
});

export const addNecromancerWizardTraversal = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    traversal: necromancerWizardTraversalArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "add_necromancer_wizard_traversal",
        commandFingerprint: addNecromancerWizardTraversalFingerprint(args.expectedCampaignId, args.traversal),
        apply: (state) => applyAddNecromancerWizardTraversal(
          state,
          args.traversal as NecromancerWizardTraversalState,
        ),
      }),
    );
  },
});

export const updateNecromancerWizardTraversal = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    wizardId: v.string(),
    fields: v.object({
      kind: v.optional(v.object({ expected: v.string(), value: v.string() })),
      location: v.optional(v.object({
        expected: necromancerOccupiableArg,
        value: necromancerOccupiableArg,
      })),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidWizardId(args.wizardId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId: ${args.wizardId}`);
        }
        return {
          commandType: "update_necromancer_wizard_traversal",
          commandFingerprint: updateNecromancerWizardTraversalFingerprint(
            args.expectedCampaignId,
            args.wizardId,
            args.fields,
          ),
          apply: (state) => applyUpdateNecromancerWizardTraversal(
            state,
            args.wizardId as WizardId,
            args.fields as UpdateNecromancerWizardTraversalFields,
          ),
        };
      },
    );
  },
});

export const removeNecromancerWizardTraversal = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    wizardId: v.string(),
    expectedTraversal: necromancerWizardTraversalArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidWizardId(args.wizardId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId: ${args.wizardId}`);
        }
        return {
          commandType: "remove_necromancer_wizard_traversal",
          commandFingerprint: removeNecromancerWizardTraversalFingerprint(
            args.expectedCampaignId,
            args.wizardId,
            args.expectedTraversal,
          ),
          apply: (state) => applyRemoveNecromancerWizardTraversal(
            state,
            args.wizardId as WizardId,
            args.expectedTraversal as NecromancerWizardTraversalState,
          ),
        };
      },
    );
  },
});

export const addNecromancerAlly = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    ally: necromancerAllyArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        const ally = args.ally as NecromancerAllyState;
        return {
          commandType: "add_necromancer_ally",
          commandFingerprint: addNecromancerAllyFingerprint(args.expectedCampaignId, ally),
          apply: (state) => applyAddNecromancerAlly(state, ally),
        };
      },
    );
  },
});

export const updateNecromancerAlly = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    fields: v.object({
      location: v.optional(v.object({
        expected: necromancerOccupiableArg,
        value: necromancerOccupiableArg,
      })),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "update_necromancer_ally",
        commandFingerprint: updateNecromancerAllyFingerprint(
          args.expectedCampaignId,
          args.denizenId,
          args.fields,
        ),
        apply: (state) => applyUpdateNecromancerAlly(
          state,
          args.denizenId as DenizenId,
          args.fields as UpdateNecromancerAllyFields,
        ),
      }),
    );
  },
});

export const removeNecromancerAlly = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    expectedAlly: necromancerAllyArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "remove_necromancer_ally",
        commandFingerprint: removeNecromancerAllyFingerprint(
          args.expectedCampaignId,
          args.denizenId,
          args.expectedAlly,
        ),
        apply: (state) => applyRemoveNecromancerAlly(
          state,
          args.denizenId as DenizenId,
          args.expectedAlly as NecromancerAllyState,
        ),
      }),
    );
  },
});

export const addNecromancerGhoulCaller = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    ghoulCaller: necromancerGhoulCallerArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        const ghoulCaller = canonicalizeNecromancerGhoulCaller(args.ghoulCaller as NecromancerGhoulCallerState);
        return {
          commandType: "add_necromancer_ghoul_caller",
          commandFingerprint: addNecromancerGhoulCallerFingerprint(args.expectedCampaignId, ghoulCaller),
          apply: (state) => applyAddNecromancerGhoulCaller(state, ghoulCaller),
        };
      },
    );
  },
});

export const updateNecromancerGhoulCaller = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    fields: v.object({
      location: v.optional(v.object({
        expected: necromancerPathLocationArg,
        value: necromancerPathLocationArg,
      })),
      pettyDeadCount: v.optional(v.object({
        expected: v.number(),
        value: v.number(),
      })),
      primaryElement: v.optional(v.object({
        expected: v.union(
          v.literal("air"),
          v.literal("fire"),
          v.literal("earth"),
          v.literal("water"),
        ),
        value: v.union(
          v.literal("air"),
          v.literal("fire"),
          v.literal("earth"),
          v.literal("water"),
        ),
      })),
      aesthetic: v.optional(v.object({
        expected: v.string(),
        value: v.string(),
      })),
      strangeQuirk: v.optional(v.object({
        expected: v.string(),
        value: v.string(),
      })),
      ageYears: v.optional(v.object({
        expected: v.number(),
        value: v.number(),
      })),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        const fields = canonicalizeUpdateNecromancerGhoulCallerFields(args.fields as UpdateNecromancerGhoulCallerFields);
        return {
          commandType: "update_necromancer_ghoul_caller",
          commandFingerprint: updateNecromancerGhoulCallerFingerprint(
            args.expectedCampaignId,
            args.denizenId,
            fields,
          ),
          apply: (state) => applyUpdateNecromancerGhoulCaller(
            state,
            args.denizenId as DenizenId,
            fields,
          ),
        };
      },
    );
  },
});

export const removeNecromancerGhoulCaller = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    expectedGhoulCaller: necromancerGhoulCallerArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "remove_necromancer_ghoul_caller",
        commandFingerprint: removeNecromancerGhoulCallerFingerprint(
          args.expectedCampaignId,
          args.denizenId,
          args.expectedGhoulCaller,
        ),
        apply: (state) => applyRemoveNecromancerGhoulCaller(
          state,
          args.denizenId as DenizenId,
          args.expectedGhoulCaller as NecromancerGhoulCallerState,
        ),
      }),
    );
  },
});

export const createNecromancerCampaignGate = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    gateId: v.string(),
    name: v.string(),
    band: v.string(),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        const input = canonicalizeCreateNecromancerCampaignGateInput({
          gateId: args.gateId as NecromancerCampaignGateId,
          name: args.name,
          band: args.band as NecromancerGateBand,
        });
        return {
          commandType: "create_necromancer_campaign_gate",
          commandFingerprint: createNecromancerCampaignGateFingerprint(args.expectedCampaignId, input),
          apply: (state) => applyCreateNecromancerCampaignGate(state, input),
        };
      },
    );
  },
});

export const updateNecromancerCampaignGate = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    gateId: v.string(),
    fields: v.object({
      name: v.optional(v.object({
        expected: v.string(),
        value: v.string(),
      })),
      band: v.optional(v.object({
        expected: v.string(),
        value: v.string(),
      })),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        const fields = canonicalizeUpdateNecromancerCampaignGateFields(
          args.fields as UpdateNecromancerCampaignGateFields,
        );
        return {
          commandType: "update_necromancer_campaign_gate",
          commandFingerprint: updateNecromancerCampaignGateFingerprint(
            args.expectedCampaignId,
            args.gateId,
            fields,
          ),
          apply: (state) => applyUpdateNecromancerCampaignGate(
            state,
            args.gateId as NecromancerCampaignGateId,
            fields,
          ),
        };
      },
    );
  },
});

export const createNecromancerCampaignPathSpace = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    pathSpaceId: v.string(),
    region: v.string(),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        const input = {
          pathSpaceId: args.pathSpaceId as NecromancerCampaignPathSpaceId,
          region: args.region as NecromancerPathRegion,
        };
        return {
          commandType: "create_necromancer_campaign_path_space",
          commandFingerprint: createNecromancerCampaignPathSpaceFingerprint(args.expectedCampaignId, input),
          apply: (state) => applyCreateNecromancerCampaignPathSpace(state, input),
        };
      },
    );
  },
});

export const removeNecromancerCampaignPathSpace = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    pathSpaceId: v.string(),
    expectedPathSpace: necromancerCampaignPathSpaceArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "remove_necromancer_campaign_path_space",
        commandFingerprint: removeNecromancerCampaignPathSpaceFingerprint(
          args.expectedCampaignId,
          args.pathSpaceId,
          args.expectedPathSpace,
        ),
        apply: (state) => applyRemoveNecromancerCampaignPathSpace(
          state,
          args.pathSpaceId as NecromancerCampaignPathSpaceId,
          args.expectedPathSpace as NecromancerCampaignPathSpaceState,
        ),
      }),
    );
  },
});

export const addNecromancerStep = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    step: necromancerDirectedStepArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        const step = args.step as NecromancerDirectedStep;
        return {
          commandType: "add_necromancer_step",
          commandFingerprint: addNecromancerStepFingerprint(args.expectedCampaignId, step),
          apply: (state) => applyAddNecromancerStep(state, step),
        };
      },
    );
  },
});

export const removeNecromancerStep = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    expectedStep: necromancerDirectedStepArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "remove_necromancer_step",
        commandFingerprint: removeNecromancerStepFingerprint(
          args.expectedCampaignId,
          args.expectedStep,
        ),
        apply: (state) => applyRemoveNecromancerStep(
          state,
          args.expectedStep as NecromancerDirectedStep,
        ),
      }),
    );
  },
});

const mortalityStateArg = v.union(v.literal("not_deceased"), v.literal("deceased"));
const taxonomyRefArg = v.union(
  v.object({ kind: v.literal("builtin"), taxonomyId: v.string() }),
  v.object({ kind: v.literal("campaign"), taxonomyId: v.string() }),
);
const powerfulStatusArg = v.union(
  v.object({
    kind: v.literal("standard"),
    value: v.union(
      v.literal("companion"),
      v.literal("reliable"),
      v.literal("disruptive"),
      v.literal("malignant"),
    ),
  }),
  v.object({ kind: v.literal("other"), label: v.string() }),
);
const methodDefinitionArg = v.union(
  v.object({
    kind: v.literal("standard"),
    method: v.union(
      v.literal("rampaging"),
      v.literal("manipulating"),
      v.literal("conjuring"),
      v.literal("occupying"),
    ),
  }),
  v.object({
    kind: v.literal("named"),
    name: v.string(),
    description: v.union(v.string(), v.null()),
  }),
);
const methodEntryArg = v.object({
  methodEntryId: v.string(),
  definition: methodDefinitionArg,
  origin: v.union(v.literal("source"), v.literal("campaign")),
});
const truthEntryArg = v.object({
  truthId: v.string(),
  text: v.string(),
  origin: v.union(v.literal("source"), v.literal("campaign")),
});
const powerfulProfileArg = v.object({
  taxonomies: v.array(taxonomyRefArg),
  status: powerfulStatusArg,
  goal: v.union(v.string(), v.null()),
  methods: v.array(methodEntryArg),
  truths: v.array(truthEntryArg),
});
const campaignTaxonomyArg = v.object({
  taxonomyId: v.string(),
  name: v.string(),
  description: v.union(v.string(), v.null()),
});
const treasureCustodyArg = v.union(
  v.object({
    kind: v.literal("subject"),
    subject: v.union(
      v.object({ kind: v.literal("wizard"), wizardId: v.string() }),
      v.object({ kind: v.literal("denizen"), denizenId: v.string() }),
    ),
  }),
  v.object({ kind: v.literal("place"), placeId: v.string() }),
  v.object({ kind: v.literal("unlocated") }),
  v.object({ kind: v.literal("none") }),
  v.object({ kind: v.literal("devil") }),
);
const treasureConditionArg = v.union(v.literal("intact"), v.literal("destroyed"));
const pactFragmentOperationalArg = v.object({
  condition: v.union(v.literal("intact"), v.literal("damaged"), v.literal("destroyed")),
  custody: v.union(
    v.object({ kind: v.literal("wizard"), wizardId: v.string() }),
    v.object({ kind: v.literal("devil") }),
    v.object({ kind: v.literal("unlocated") }),
    v.object({ kind: v.literal("none") }),
  ),
});

export const setWizardMortalityState = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    wizardId: v.string(),
    change: v.object({ expected: mortalityStateArg, value: mortalityStateArg }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidWizardId(args.wizardId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId: ${args.wizardId}`);
        }
        return {
          commandType: "set_wizard_mortality_state",
          commandFingerprint: setWizardMortalityStateFingerprint(
            args.expectedCampaignId,
            args.wizardId,
            args.change,
          ),
          apply: (state) => applySetWizardMortalityState(
            state,
            args.wizardId as WizardId,
            args.change,
          ),
        };
      },
    );
  },
});

export const setDenizenMortalityState = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    change: v.object({ expected: mortalityStateArg, value: mortalityStateArg }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidDenizenId(args.denizenId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${args.denizenId}`);
        }
        return {
          commandType: "set_denizen_mortality_state",
          commandFingerprint: setDenizenMortalityStateFingerprint(
            args.expectedCampaignId,
            args.denizenId,
            args.change,
          ),
          apply: (state) => applySetDenizenMortalityState(
            state,
            args.denizenId as DenizenId,
            args.change,
          ),
        };
      },
    );
  },
});

export const createPowerfulDenizenProfile = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    taxonomies: v.array(taxonomyRefArg),
    status: powerfulStatusArg,
    goal: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const input = {
      denizenId: args.denizenId,
      taxonomies: args.taxonomies,
      status: args.status,
      goal: args.goal,
    };
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidDenizenId(args.denizenId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${args.denizenId}`);
        }
        return {
          commandType: "create_powerful_denizen_profile",
          commandFingerprint: createPowerfulDenizenProfileFingerprint(args.expectedCampaignId, input),
          apply: (state) => applyCreatePowerfulDenizenProfile(state, {
            denizenId: args.denizenId as DenizenId,
            taxonomies: args.taxonomies as unknown as PowerfulDenizenTaxonomyRef[],
            status: args.status as PowerfulDenizenStatus,
            goal: args.goal,
          }),
        };
      },
    );
  },
});

export const removePowerfulDenizenProfile = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    expectedProfile: powerfulProfileArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidDenizenId(args.denizenId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${args.denizenId}`);
        }
        return {
          commandType: "remove_powerful_denizen_profile",
          commandFingerprint: removePowerfulDenizenProfileFingerprint(
            args.expectedCampaignId,
            args.denizenId,
            args.expectedProfile,
          ),
          apply: (state) => applyRemovePowerfulDenizenProfile(
            state,
            args.denizenId as DenizenId,
            args.expectedProfile as unknown as PowerfulDenizenProfile,
          ),
        };
      },
    );
  },
});

export const setPowerfulDenizenTaxonomies = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    change: v.object({
      expected: v.array(taxonomyRefArg),
      value: v.array(taxonomyRefArg),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidDenizenId(args.denizenId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${args.denizenId}`);
        }
        return {
          commandType: "set_powerful_denizen_taxonomies",
          commandFingerprint: setPowerfulDenizenTaxonomiesFingerprint(
            args.expectedCampaignId,
            args.denizenId,
            args.change,
          ),
          apply: (state) => applySetPowerfulDenizenTaxonomies(
            state,
            args.denizenId as DenizenId,
            args.change as unknown as ExpectedFieldChange<readonly PowerfulDenizenTaxonomyRef[]>,
          ),
        };
      },
    );
  },
});

export const setPowerfulDenizenStatus = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    change: v.object({ expected: powerfulStatusArg, value: powerfulStatusArg }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidDenizenId(args.denizenId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${args.denizenId}`);
        }
        return {
          commandType: "set_powerful_denizen_status",
          commandFingerprint: setPowerfulDenizenStatusFingerprint(
            args.expectedCampaignId,
            args.denizenId,
            args.change,
          ),
          apply: (state) => applySetPowerfulDenizenStatus(
            state,
            args.denizenId as DenizenId,
            args.change as ExpectedFieldChange<PowerfulDenizenStatus>,
          ),
        };
      },
    );
  },
});

export const setPowerfulDenizenGoal = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    change: v.object({
      expected: v.union(v.string(), v.null()),
      value: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidDenizenId(args.denizenId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${args.denizenId}`);
        }
        return {
          commandType: "set_powerful_denizen_goal",
          commandFingerprint: setPowerfulDenizenGoalFingerprint(
            args.expectedCampaignId,
            args.denizenId,
            args.change,
          ),
          apply: (state) => applySetPowerfulDenizenGoal(
            state,
            args.denizenId as DenizenId,
            args.change,
          ),
        };
      },
    );
  },
});

export const addPowerfulDenizenMethod = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    methodEntryId: v.string(),
    definition: methodDefinitionArg,
  },
  handler: async (ctx, args) => {
    const input = {
      denizenId: args.denizenId,
      methodEntryId: args.methodEntryId,
      definition: args.definition,
    };
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidDenizenId(args.denizenId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${args.denizenId}`);
        }
        if (!isValidPowerfulDenizenMethodEntryId(args.methodEntryId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid methodEntryId: ${args.methodEntryId}`);
        }
        return {
          commandType: "add_powerful_denizen_method",
          commandFingerprint: addPowerfulDenizenMethodFingerprint(args.expectedCampaignId, input),
          apply: (state) => applyAddPowerfulDenizenMethod(state, {
            denizenId: args.denizenId as DenizenId,
            methodEntryId: args.methodEntryId as PowerfulDenizenMethodEntryId,
            definition: args.definition as PowerfulDenizenMethodDefinition,
          }),
        };
      },
    );
  },
});

export const updatePowerfulDenizenMethod = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    methodEntryId: v.string(),
    change: v.object({ expected: methodDefinitionArg, value: methodDefinitionArg }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidDenizenId(args.denizenId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${args.denizenId}`);
        }
        if (!isValidPowerfulDenizenMethodEntryId(args.methodEntryId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid methodEntryId: ${args.methodEntryId}`);
        }
        return {
          commandType: "update_powerful_denizen_method",
          commandFingerprint: updatePowerfulDenizenMethodFingerprint(
            args.expectedCampaignId,
            args.denizenId,
            args.methodEntryId,
            args.change,
          ),
          apply: (state) => applyUpdatePowerfulDenizenMethod(
            state,
            args.denizenId as DenizenId,
            args.methodEntryId as PowerfulDenizenMethodEntryId,
            args.change as ExpectedFieldChange<PowerfulDenizenMethodDefinition>,
          ),
        };
      },
    );
  },
});

export const removePowerfulDenizenMethod = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    methodEntryId: v.string(),
    expectedMethod: methodEntryArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidDenizenId(args.denizenId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${args.denizenId}`);
        }
        if (!isValidPowerfulDenizenMethodEntryId(args.methodEntryId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid methodEntryId: ${args.methodEntryId}`);
        }
        return {
          commandType: "remove_powerful_denizen_method",
          commandFingerprint: removePowerfulDenizenMethodFingerprint(
            args.expectedCampaignId,
            args.denizenId,
            args.methodEntryId,
            args.expectedMethod,
          ),
          apply: (state) => applyRemovePowerfulDenizenMethod(
            state,
            args.denizenId as DenizenId,
            args.methodEntryId as PowerfulDenizenMethodEntryId,
            args.expectedMethod as unknown as PowerfulDenizenMethodEntry,
          ),
        };
      },
    );
  },
});

export const addPowerfulDenizenTruth = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    truthId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const input = { denizenId: args.denizenId, truthId: args.truthId, text: args.text };
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidDenizenId(args.denizenId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${args.denizenId}`);
        }
        if (!isValidPowerfulDenizenTruthId(args.truthId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid truthId: ${args.truthId}`);
        }
        return {
          commandType: "add_powerful_denizen_truth",
          commandFingerprint: addPowerfulDenizenTruthFingerprint(args.expectedCampaignId, input),
          apply: (state) => applyAddPowerfulDenizenTruth(state, {
            denizenId: args.denizenId as DenizenId,
            truthId: args.truthId as PowerfulDenizenTruthId,
            text: args.text,
          }),
        };
      },
    );
  },
});

export const updatePowerfulDenizenTruth = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    truthId: v.string(),
    change: v.object({ expected: v.string(), value: v.string() }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidDenizenId(args.denizenId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${args.denizenId}`);
        }
        if (!isValidPowerfulDenizenTruthId(args.truthId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid truthId: ${args.truthId}`);
        }
        return {
          commandType: "update_powerful_denizen_truth",
          commandFingerprint: updatePowerfulDenizenTruthFingerprint(
            args.expectedCampaignId,
            args.denizenId,
            args.truthId,
            args.change,
          ),
          apply: (state) => applyUpdatePowerfulDenizenTruth(
            state,
            args.denizenId as DenizenId,
            args.truthId as PowerfulDenizenTruthId,
            args.change,
          ),
        };
      },
    );
  },
});

export const removePowerfulDenizenTruth = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    denizenId: v.string(),
    truthId: v.string(),
    expectedTruth: truthEntryArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidDenizenId(args.denizenId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${args.denizenId}`);
        }
        if (!isValidPowerfulDenizenTruthId(args.truthId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid truthId: ${args.truthId}`);
        }
        return {
          commandType: "remove_powerful_denizen_truth",
          commandFingerprint: removePowerfulDenizenTruthFingerprint(
            args.expectedCampaignId,
            args.denizenId,
            args.truthId,
            args.expectedTruth,
          ),
          apply: (state) => applyRemovePowerfulDenizenTruth(
            state,
            args.denizenId as DenizenId,
            args.truthId as PowerfulDenizenTruthId,
            args.expectedTruth as unknown as PowerfulDenizenTruthEntry,
          ),
        };
      },
    );
  },
});

export const createCampaignPowerfulDenizenTaxonomy = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    taxonomyId: v.string(),
    name: v.string(),
    description: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const input = { taxonomyId: args.taxonomyId, name: args.name, description: args.description };
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidCampaignPowerfulDenizenTaxonomyId(args.taxonomyId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid taxonomyId: ${args.taxonomyId}`);
        }
        return {
          commandType: "create_campaign_powerful_denizen_taxonomy",
          commandFingerprint: createCampaignPowerfulDenizenTaxonomyFingerprint(args.expectedCampaignId, input),
          apply: (state) => applyCreateCampaignPowerfulDenizenTaxonomy(state, {
            taxonomyId: args.taxonomyId as CampaignPowerfulDenizenTaxonomyId,
            name: args.name,
            description: args.description,
          }),
        };
      },
    );
  },
});

export const updateCampaignPowerfulDenizenTaxonomy = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    taxonomyId: v.string(),
    fields: v.object({
      name: v.optional(v.object({ expected: v.string(), value: v.string() })),
      description: v.optional(v.object({
        expected: v.union(v.string(), v.null()),
        value: v.union(v.string(), v.null()),
      })),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidCampaignPowerfulDenizenTaxonomyId(args.taxonomyId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid taxonomyId: ${args.taxonomyId}`);
        }
        return {
          commandType: "update_campaign_powerful_denizen_taxonomy",
          commandFingerprint: updateCampaignPowerfulDenizenTaxonomyFingerprint(
            args.expectedCampaignId,
            args.taxonomyId,
            args.fields,
          ),
          apply: (state) => applyUpdateCampaignPowerfulDenizenTaxonomy(
            state,
            args.taxonomyId as CampaignPowerfulDenizenTaxonomyId,
            args.fields,
          ),
        };
      },
    );
  },
});

export const removeCampaignPowerfulDenizenTaxonomy = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    taxonomyId: v.string(),
    expectedTaxonomy: campaignTaxonomyArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidCampaignPowerfulDenizenTaxonomyId(args.taxonomyId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid taxonomyId: ${args.taxonomyId}`);
        }
        return {
          commandType: "remove_campaign_powerful_denizen_taxonomy",
          commandFingerprint: removeCampaignPowerfulDenizenTaxonomyFingerprint(
            args.expectedCampaignId,
            args.taxonomyId,
            args.expectedTaxonomy,
          ),
          apply: (state) => applyRemoveCampaignPowerfulDenizenTaxonomy(
            state,
            args.taxonomyId as CampaignPowerfulDenizenTaxonomyId,
            args.expectedTaxonomy as unknown as CampaignPowerfulDenizenTaxonomy,
          ),
        };
      },
    );
  },
});

export const createTreasure = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    treasureId: v.string(),
    name: v.string(),
    description: v.union(v.string(), v.null()),
    condition: treasureConditionArg,
    custody: treasureCustodyArg,
  },
  handler: async (ctx, args) => {
    const input = {
      treasureId: args.treasureId,
      name: args.name,
      description: args.description,
      condition: args.condition,
      custody: args.custody,
    };
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidTreasureId(args.treasureId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid treasureId: ${args.treasureId}`);
        }
        return {
          commandType: "create_treasure",
          commandFingerprint: createTreasureFingerprint(args.expectedCampaignId, input),
          apply: (state) => applyCreateTreasure(state, {
            treasureId: args.treasureId as TreasureId,
            name: args.name,
            description: args.description,
            condition: args.condition as TreasureCondition,
            custody: args.custody as unknown as TreasureCustody,
          }),
        };
      },
    );
  },
});

export const updateTreasureDetails = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    treasureId: v.string(),
    fields: v.object({
      name: v.optional(v.object({ expected: v.string(), value: v.string() })),
      description: v.optional(v.object({
        expected: v.union(v.string(), v.null()),
        value: v.union(v.string(), v.null()),
      })),
    }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidTreasureId(args.treasureId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid treasureId: ${args.treasureId}`);
        }
        return {
          commandType: "update_treasure_details",
          commandFingerprint: updateTreasureDetailsFingerprint(
            args.expectedCampaignId,
            args.treasureId,
            args.fields,
          ),
          apply: (state) => applyUpdateTreasureDetails(
            state,
            args.treasureId as TreasureId,
            args.fields,
          ),
        };
      },
    );
  },
});

export const updateTreasureState = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    treasureId: v.string(),
    expected: v.object({ condition: treasureConditionArg, custody: treasureCustodyArg }),
    next: v.object({ condition: treasureConditionArg, custody: treasureCustodyArg }),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidTreasureId(args.treasureId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid treasureId: ${args.treasureId}`);
        }
        return {
          commandType: "update_treasure_state",
          commandFingerprint: updateTreasureStateFingerprint(
            args.expectedCampaignId,
            args.treasureId,
            args.expected,
            args.next,
          ),
          apply: (state) => applyUpdateTreasureState(
            state,
            args.treasureId as TreasureId,
            args.expected as unknown as { condition: TreasureCondition; custody: TreasureCustody },
            args.next as unknown as { condition: TreasureCondition; custody: TreasureCustody },
          ),
        };
      },
    );
  },
});

export const updatePactFragmentOperationalState = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    seatId: v.string(),
    expected: pactFragmentOperationalArg,
    next: pactFragmentOperationalArg,
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => {
        if (!isValidPactSeatId(args.seatId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid seat id: ${args.seatId}`);
        }
        return {
          commandType: "update_pact_fragment_operational_state",
          commandFingerprint: updatePactFragmentOperationalStateFingerprint(
            args.expectedCampaignId,
            args.seatId,
            args.expected,
            args.next,
          ),
          apply: (state) => applyUpdatePactFragmentOperationalState(
            state,
            args.seatId as PactSeatId,
            args.expected as unknown as PactFragmentOperationalState,
            args.next as unknown as PactFragmentOperationalState,
          ),
        };
      },
    );
  },
});

export const investigateFaustianCommunity = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    communityId: v.string(),
    schemeCardId: v.string(),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "investigate_faustian_community",
        commandFingerprint: investigateFaustianCommunityFingerprint(
          args.expectedCampaignId,
          args.communityId,
          args.schemeCardId,
        ),
        apply: (state) => applyInvestigateFaustianCommunity(
          state,
          args.communityId as FaustianCommunityId,
          args.schemeCardId as FaustianCardId,
        ),
      }),
    );
  },
});

export const blackmailFaustianCommunity = mutation({
  args: {
    commandId: v.string(),
    expectedCampaignId: v.string(),
    communityId: v.string(),
  },
  handler: async (ctx, args) => {
    return executeConvexOrdinaryLogicalCommand(
      ctx,
      { commandId: args.commandId, expectedCampaignId: args.expectedCampaignId },
      () => ({
        commandType: "blackmail_faustian_community",
        commandFingerprint: blackmailFaustianCommunityFingerprint(
          args.expectedCampaignId,
          args.communityId,
        ),
        apply: (state) => applyBlackmailFaustianCommunity(
          state,
          args.communityId as FaustianCommunityId,
        ),
      }),
    );
  },
});
