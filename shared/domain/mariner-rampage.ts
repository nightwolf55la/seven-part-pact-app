import type { CampaignStateV5 } from "./campaign-state";
import { DomainError } from "./errors";
import type { DenizenId, PowerfulDenizenMethodEntryId } from "./ids";
import { isValidDenizenId, isValidPowerfulDenizenMethodEntryId } from "./ids";
import type { PactSeatId } from "./pact-seats";
import { isValidPactSeatId } from "./pact-seats";
import {
  MARINER_SEA_REGION_DEFINITIONS,
  type MarinerRouteId,
  type MarinerSeaRegionId,
} from "./mariner-catalogs";
import type {
  MarinerBeastCondition,
  MarinerBeastLocation,
  MarinerBeastState,
  MarinerState,
} from "./mariner-state";
import { profileHasStandardRampagingMethod } from "./powerful-denizen-roles";
import { applyAddPowerfulDenizenMethod } from "./shared-state-transitions";
import { beastIsEntirelySurrounded } from "./mariner-shipping-hazards";

export interface MarinerRampageResolution {
  readonly denizenId: DenizenId;
  readonly destinationSeatId: PactSeatId;
  readonly rampagingMethodEntryId: PowerfulDenizenMethodEntryId | null;
}

export interface ExpectedBeastState {
  readonly denizenId: DenizenId;
  readonly location: MarinerBeastLocation;
  readonly condition: MarinerBeastCondition;
}

export function seaRegionIdsBoundedByRoute(routeId: MarinerRouteId | string): MarinerSeaRegionId[] {
  return MARINER_SEA_REGION_DEFINITIONS
    .filter((definition) => definition.boundingRouteIds.includes(routeId as MarinerRouteId))
    .map((definition) => definition.regionId);
}

export function newlyTrappedDistrustingBeastIds(
  preAction: Pick<MarinerState, "beasts" | "routes">,
  postAction: Pick<MarinerState, "beasts" | "routes">,
  candidateRegionIds?: readonly MarinerSeaRegionId[],
): readonly DenizenId[] {
  const candidates = candidateRegionIds === undefined ? null : new Set(candidateRegionIds);
  const trapped: DenizenId[] = [];
  for (const beast of preAction.beasts) {
    if (beast.condition !== "distrusting" || beast.location.kind !== "sea_region") {
      continue;
    }
    const regionId = beast.location.regionId;
    if (candidates !== null && !candidates.has(regionId)) {
      continue;
    }
    const after = postAction.beasts.find((candidate) => candidate.denizenId === beast.denizenId);
    if (
      after === undefined
      || after.location.kind !== "sea_region"
      || after.location.regionId !== regionId
    ) {
      continue;
    }
    if (beastIsEntirelySurrounded(regionId, preAction.routes)) {
      continue;
    }
    if (beastIsEntirelySurrounded(regionId, postAction.routes)) {
      trapped.push(beast.denizenId);
    }
  }
  trapped.sort();
  return trapped;
}

export function requireExactMarinerRampageResolutions(
  authoritativeDenizenIds: readonly DenizenId[],
  resolutions: readonly MarinerRampageResolution[],
): readonly MarinerRampageResolution[] {
  const seen = new Set<string>();
  for (const resolution of resolutions) {
    if (!isValidDenizenId(resolution.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Rampage resolution denizenId: ${resolution.denizenId}`);
    }
    if (seen.has(resolution.denizenId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Duplicate Rampage resolution for Beast ${resolution.denizenId}`,
      );
    }
    seen.add(resolution.denizenId);
    if (!isValidPactSeatId(resolution.destinationSeatId) || resolution.destinationSeatId === "mariner") {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        "Rampage destination must be another Wizard's Domain, not Mariner",
      );
    }
    if (
      resolution.rampagingMethodEntryId !== null
      && !isValidPowerfulDenizenMethodEntryId(resolution.rampagingMethodEntryId)
    ) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Invalid rampagingMethodEntryId: ${resolution.rampagingMethodEntryId}`,
      );
    }
  }
  const authoritative = new Set(authoritativeDenizenIds);
  if (seen.size !== authoritative.size || [...seen].some((id) => !authoritative.has(id as DenizenId))) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Rampage resolutions must exactly cover the authoritative newly trapped Beast set",
    );
  }
  return resolutions.map((resolution) => ({
    denizenId: resolution.denizenId,
    destinationSeatId: resolution.destinationSeatId,
    rampagingMethodEntryId: resolution.rampagingMethodEntryId,
  }));
}

function replaceBeast(mariner: MarinerState, updated: MarinerBeastState): MarinerState {
  return {
    ...mariner,
    beasts: mariner.beasts.map((beast) => (beast.denizenId === updated.denizenId ? updated : beast)),
  };
}

export function ensureStandardRampagingMethod(
  state: CampaignStateV5,
  denizenId: DenizenId,
  methodEntryId: PowerfulDenizenMethodEntryId | null,
): CampaignStateV5 {
  const denizen = state.world.denizens.find((candidate) => candidate.denizenId === denizenId);
  const profile = denizen?.powerfulProfile ?? null;
  if (profile !== null && profileHasStandardRampagingMethod(profile)) {
    return state;
  }
  if (methodEntryId === null || !isValidPowerfulDenizenMethodEntryId(methodEntryId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Rampaging Beast requires a stable standard Rampaging Method identity",
    );
  }
  return applyAddPowerfulDenizenMethod(state, {
    denizenId,
    methodEntryId,
    definition: { kind: "standard", method: "rampaging" },
  }).nextState;
}

export function applyMarinerRampageResolutions(
  state: CampaignStateV5,
  resolutions: readonly MarinerRampageResolution[],
): CampaignStateV5 {
  let working = state;
  for (const resolution of resolutions) {
    const beast = working.mariner.beasts.find((candidate) => candidate.denizenId === resolution.denizenId);
    if (beast === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Mariner Beast not found: ${resolution.denizenId}`);
    }
    working = ensureStandardRampagingMethod(working, resolution.denizenId, resolution.rampagingMethodEntryId);
    const updated: MarinerBeastState = {
      ...beast,
      condition: "rampaging",
      location: { kind: "other_domain", seatId: resolution.destinationSeatId },
    };
    working = { ...working, mariner: replaceBeast(working.mariner, updated) };
  }
  return working;
}
