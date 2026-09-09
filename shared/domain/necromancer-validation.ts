import type { CampaignStateV5 } from "./campaign-state";
import { DomainError } from "./errors";
import { isValidDenizenId, isValidWizardId } from "./ids";
import { isValidPactSeatId } from "./pact-seats";
import type {
  NecromancerDirectedStep,
  NecromancerOccupiableSpaceRef,
  NecromancerPathRegion,
  NecromancerStepTarget,
} from "./necromancer-catalogs";
import {
  NECROMANCER_BUILTIN_GATE_IDS,
  NECROMANCER_BUILTIN_PATH_SPACE_IDS,
  isBuiltinEdgeOfLifePathSpaceId,
  isValidNecromancerAbominationKind,
  isValidNecromancerBuiltinGateId,
  isValidNecromancerBuiltinPathSpaceId,
  isValidNecromancerCampaignGateId,
  isValidNecromancerCampaignPathSpaceId,
  isValidNecromancerGateBand,
  isValidNecromancerGateStatus,
  isValidNecromancerGhoulCallerDisposition,
  isValidNecromancerLawOfDeathId,
  isValidNecromancerLawVisibility,
  isValidNecromancerPathRegion,
  isValidNecromancerTerminalExitId,
  necromancerBuiltinPathSpaceDefinition,
  necromancerDirectedStepKey,
  necromancerOccupiableSpaceRefsEqual,
} from "./necromancer-catalogs";
import type { NecromancerState } from "./necromancer-state";

function assertNonNegativeSafeInteger(path: string, value: unknown): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be a non-negative safe integer`);
  }
}

function assertPositiveSafeInteger(path: string, value: unknown): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be a positive safe integer`);
  }
}

function assertNonEmptyString(path: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be a non-empty string`);
  }
}

function uniqueIds(ids: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate ${label}: ${id}`);
    }
    seen.add(id);
  }
}

function isExactEmptyNecromancerState(n: Record<string, unknown>): boolean {
  return (
    Array.isArray(n.gates) &&
    n.gates.length === 0 &&
    Array.isArray(n.pathSpaces) &&
    n.pathSpaces.length === 0 &&
    Array.isArray(n.steps) &&
    n.steps.length === 0 &&
    Array.isArray(n.souls) &&
    n.souls.length === 0 &&
    Array.isArray(n.foes) &&
    n.foes.length === 0 &&
    Array.isArray(n.allies) &&
    n.allies.length === 0 &&
    Array.isArray(n.ghoulCallers) &&
    n.ghoulCallers.length === 0 &&
    Array.isArray(n.selectedLaws) &&
    n.selectedLaws.length === 0 &&
    n.depth === null
  );
}

function validateOccupiableSpaceRef(path: string, value: unknown): NecromancerOccupiableSpaceRef {
  if (value === null || value === undefined || typeof value !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
  }
  const ref = value as Record<string, unknown>;
  if (ref.kind === "gate") {
    if (typeof ref.gateId !== "string") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.gateId is invalid: ${JSON.stringify(ref.gateId)}`);
    }
    if (!isValidNecromancerBuiltinGateId(ref.gateId) && !isValidNecromancerCampaignGateId(ref.gateId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.gateId is invalid: ${JSON.stringify(ref.gateId)}`);
    }
    return { kind: "gate", gateId: ref.gateId };
  }
  if (ref.kind === "path") {
    if (typeof ref.pathSpaceId !== "string") {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.pathSpaceId is invalid: ${JSON.stringify(ref.pathSpaceId)}`,
      );
    }
    if (!isValidNecromancerBuiltinPathSpaceId(ref.pathSpaceId) && !isValidNecromancerCampaignPathSpaceId(ref.pathSpaceId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.pathSpaceId is invalid: ${JSON.stringify(ref.pathSpaceId)}`,
      );
    }
    return { kind: "path", pathSpaceId: ref.pathSpaceId };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(ref.kind)}`);
}

function validateStepTarget(path: string, value: unknown): NecromancerStepTarget {
  if (value === null || value === undefined || typeof value !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
  }
  const target = value as Record<string, unknown>;
  if (target.kind === "terminal") {
    if (typeof target.terminalId !== "string" || !isValidNecromancerTerminalExitId(target.terminalId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.terminalId is invalid: ${JSON.stringify(target.terminalId)}`,
      );
    }
    return { kind: "terminal", terminalId: target.terminalId };
  }
  return validateOccupiableSpaceRef(path, value);
}

function pathSpaceRegion(
  pathSpaceId: string,
  campaignRegions: ReadonlyMap<string, NecromancerPathRegion>,
): NecromancerPathRegion | undefined {
  if (isValidNecromancerBuiltinPathSpaceId(pathSpaceId)) {
    return necromancerBuiltinPathSpaceDefinition(pathSpaceId).region;
  }
  return campaignRegions.get(pathSpaceId);
}

function validateSelectedLaws(selected: unknown[]): void {
  const lawIds: string[] = [];
  for (let i = 0; i < selected.length; i++) {
    const entry = selected[i];
    const path = `necromancer.selectedLaws[${i}]`;
    if (entry === null || entry === undefined || typeof entry !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const law = entry as Record<string, unknown>;
    if (typeof law.lawId !== "string" || !isValidNecromancerLawOfDeathId(law.lawId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.lawId is invalid: ${JSON.stringify(law.lawId)}`);
    }
    if (typeof law.visibility !== "string" || !isValidNecromancerLawVisibility(law.visibility)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.visibility is invalid: ${JSON.stringify(law.visibility)}`,
      );
    }
    lawIds.push(law.lawId);
  }
  uniqueIds(lawIds, "selectedLawId");
}

function validateDepth(depth: unknown): void {
  if (depth === null) {
    return;
  }
  if (depth === undefined || typeof depth !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "necromancer.depth must be an object or null");
  }
  const d = depth as Record<string, unknown>;
  if (typeof d.wizardId !== "string" || !isValidWizardId(d.wizardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `necromancer.depth.wizardId is invalid: ${JSON.stringify(d.wizardId)}`);
  }
  assertNonNegativeSafeInteger("necromancer.depth.value", d.value);
}

function validateInitializedTopology(n: Record<string, unknown>): {
  gateIds: Set<string>;
  pathSpaceIds: Set<string>;
  campaignPathRegions: Map<string, NecromancerPathRegion>;
} {
  const gates = n.gates as unknown[];
  const pathSpaces = n.pathSpaces as unknown[];
  const steps = n.steps as unknown[];

  const gateIds: string[] = [];
  const builtinGateIds = new Set<string>();
  for (let i = 0; i < gates.length; i++) {
    const entry = gates[i];
    const path = `necromancer.gates[${i}]`;
    if (entry === null || entry === undefined || typeof entry !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const gate = entry as Record<string, unknown>;
    if (gate.origin === "builtin") {
      if (typeof gate.gateId !== "string" || !isValidNecromancerBuiltinGateId(gate.gateId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.gateId is invalid: ${JSON.stringify(gate.gateId)}`);
      }
      builtinGateIds.add(gate.gateId);
      gateIds.push(gate.gateId);
    } else if (gate.origin === "campaign") {
      if (typeof gate.gateId !== "string" || !isValidNecromancerCampaignGateId(gate.gateId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.gateId is invalid: ${JSON.stringify(gate.gateId)}`);
      }
      assertNonEmptyString(`${path}.name`, gate.name);
      if (typeof gate.band !== "string" || !isValidNecromancerGateBand(gate.band)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.band is invalid: ${JSON.stringify(gate.band)}`);
      }
      gateIds.push(gate.gateId);
    } else {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.origin is invalid: ${JSON.stringify(gate.origin)}`);
    }
    if (typeof gate.status !== "string" || !isValidNecromancerGateStatus(gate.status)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.status is invalid: ${JSON.stringify(gate.status)}`);
    }
  }
  uniqueIds(gateIds, "necromancer gateId");
  for (const required of NECROMANCER_BUILTIN_GATE_IDS) {
    if (!builtinGateIds.has(required)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Missing required built-in Necromancer Gate identity: ${required}`);
    }
  }

  const pathSpaceIds: string[] = [];
  const builtinPathIds = new Set<string>();
  const campaignPathRegions = new Map<string, NecromancerPathRegion>();
  for (let i = 0; i < pathSpaces.length; i++) {
    const entry = pathSpaces[i];
    const path = `necromancer.pathSpaces[${i}]`;
    if (entry === null || entry === undefined || typeof entry !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const space = entry as Record<string, unknown>;
    if (space.origin === "builtin") {
      if (typeof space.pathSpaceId !== "string" || !isValidNecromancerBuiltinPathSpaceId(space.pathSpaceId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.pathSpaceId is invalid: ${JSON.stringify(space.pathSpaceId)}`,
        );
      }
      builtinPathIds.add(space.pathSpaceId);
      pathSpaceIds.push(space.pathSpaceId);
    } else if (space.origin === "campaign") {
      if (typeof space.pathSpaceId !== "string" || !isValidNecromancerCampaignPathSpaceId(space.pathSpaceId)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.pathSpaceId is invalid: ${JSON.stringify(space.pathSpaceId)}`,
        );
      }
      if (typeof space.region !== "string" || !isValidNecromancerPathRegion(space.region)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.region is invalid: ${JSON.stringify(space.region)}`);
      }
      campaignPathRegions.set(space.pathSpaceId, space.region);
      pathSpaceIds.push(space.pathSpaceId);
    } else {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.origin is invalid: ${JSON.stringify(space.origin)}`);
    }
  }
  uniqueIds(pathSpaceIds, "necromancer pathSpaceId");
  for (const required of NECROMANCER_BUILTIN_PATH_SPACE_IDS) {
    if (!builtinPathIds.has(required)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Missing required built-in Necromancer path-space identity: ${required}`,
      );
    }
  }

  const gateIdSet = new Set(gateIds);
  const pathSpaceIdSet = new Set(pathSpaceIds);
  const seenSteps = new Set<string>();
  for (let i = 0; i < steps.length; i++) {
    const entry = steps[i];
    const path = `necromancer.steps[${i}]`;
    if (entry === null || entry === undefined || typeof entry !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const raw = entry as Record<string, unknown>;
    const from = validateOccupiableSpaceRef(`${path}.from`, raw.from);
    const to = validateStepTarget(`${path}.to`, raw.to);
    if (to.kind !== "terminal" && necromancerOccupiableSpaceRefsEqual(from, to)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must not be a self-loop`);
    }
    if (from.kind === "gate" && !gateIdSet.has(from.gateId as string)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.from does not resolve: ${from.gateId}`);
    }
    if (from.kind === "path" && !pathSpaceIdSet.has(from.pathSpaceId as string)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.from does not resolve: ${from.pathSpaceId}`);
    }
    if (to.kind === "gate" && !gateIdSet.has(to.gateId as string)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.to does not resolve: ${to.gateId}`);
    }
    if (to.kind === "path" && !pathSpaceIdSet.has(to.pathSpaceId as string)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.to does not resolve: ${to.pathSpaceId}`);
    }
    const step: NecromancerDirectedStep = { from, to };
    const key = necromancerDirectedStepKey(step);
    if (seenSteps.has(key)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate directed Necromancer step: ${key}`);
    }
    seenSteps.add(key);
  }

  return { gateIds: gateIdSet, pathSpaceIds: pathSpaceIdSet, campaignPathRegions };
}

function assertOccupiableLocation(
  path: string,
  location: NecromancerOccupiableSpaceRef,
  gateIds: Set<string>,
  pathSpaceIds: Set<string>,
): void {
  if (location.kind === "gate") {
    if (!gateIds.has(location.gateId as string)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} does not resolve to an occupiable Gate: ${location.gateId}`);
    }
    return;
  }
  if (!pathSpaceIds.has(location.pathSpaceId as string)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${path} does not resolve to an occupiable path space: ${location.pathSpaceId}`,
    );
  }
}

function validateOccupants(
  n: Record<string, unknown>,
  gateIds: Set<string>,
  pathSpaceIds: Set<string>,
  campaignPathRegions: Map<string, NecromancerPathRegion>,
): void {
  const souls = n.souls as unknown[];
  const soulKeys: string[] = [];
  for (let i = 0; i < souls.length; i++) {
    const entry = souls[i];
    const path = `necromancer.souls[${i}]`;
    if (entry === null || entry === undefined || typeof entry !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const soul = entry as Record<string, unknown>;
    const location = validateOccupiableSpaceRef(`${path}.location`, soul.location);
    assertOccupiableLocation(`${path}.location`, location, gateIds, pathSpaceIds);
    assertPositiveSafeInteger(`${path}.count`, soul.count);
    const key = location.kind === "gate" ? `gate:${location.gateId}` : `path:${location.pathSpaceId}`;
    soulKeys.push(key);
  }
  uniqueIds(soulKeys, "necromancer soul location");

  const foes = n.foes as unknown[];
  const foeIds: string[] = [];
  for (let i = 0; i < foes.length; i++) {
    const entry = foes[i];
    const path = `necromancer.foes[${i}]`;
    if (entry === null || entry === undefined || typeof entry !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const foe = entry as Record<string, unknown>;
    if (typeof foe.denizenId !== "string" || !isValidDenizenId(foe.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(foe.denizenId)}`);
    }
    foeIds.push(foe.denizenId);
    if (foe.location === null || foe.location === undefined || typeof foe.location !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.location must be an object`);
    }
    const location = foe.location as Record<string, unknown>;
    if (location.kind === "escaped") {
      if (typeof location.seatId !== "string" || !isValidPactSeatId(location.seatId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.location.seatId is invalid: ${JSON.stringify(location.seatId)}`);
      }
      if (location.seatId === "necromancer") {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.location.seatId must be a non-Necromancer Pact seat`,
        );
      }
      if (typeof location.abominationKind !== "string" || !isValidNecromancerAbominationKind(location.abominationKind)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.location.abominationKind is invalid: ${JSON.stringify(location.abominationKind)}`,
        );
      }
    } else {
      const occupiable = validateOccupiableSpaceRef(`${path}.location`, foe.location);
      assertOccupiableLocation(`${path}.location`, occupiable, gateIds, pathSpaceIds);
    }
  }
  uniqueIds(foeIds, "necromancer foe denizenId");

  const allies = n.allies as unknown[];
  const allyIds: string[] = [];
  for (let i = 0; i < allies.length; i++) {
    const entry = allies[i];
    const path = `necromancer.allies[${i}]`;
    if (entry === null || entry === undefined || typeof entry !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const ally = entry as Record<string, unknown>;
    if (typeof ally.denizenId !== "string" || !isValidDenizenId(ally.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(ally.denizenId)}`);
    }
    allyIds.push(ally.denizenId);
    const location = validateOccupiableSpaceRef(`${path}.location`, ally.location);
    assertOccupiableLocation(`${path}.location`, location, gateIds, pathSpaceIds);
  }
  uniqueIds(allyIds, "necromancer ally denizenId");

  const ghouls = n.ghoulCallers as unknown[];
  const ghoulIds: string[] = [];
  for (let i = 0; i < ghouls.length; i++) {
    const entry = ghouls[i];
    const path = `necromancer.ghoulCallers[${i}]`;
    if (entry === null || entry === undefined || typeof entry !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const ghoul = entry as Record<string, unknown>;
    if (typeof ghoul.denizenId !== "string" || !isValidDenizenId(ghoul.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(ghoul.denizenId)}`);
    }
    ghoulIds.push(ghoul.denizenId);
    if (typeof ghoul.disposition !== "string" || !isValidNecromancerGhoulCallerDisposition(ghoul.disposition)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.disposition is invalid: ${JSON.stringify(ghoul.disposition)}`,
      );
    }
    const location = validateOccupiableSpaceRef(`${path}.location`, ghoul.location);
    if (location.kind !== "path") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.location must be an Edge-of-Life path space`);
    }
    if (!pathSpaceIds.has(location.pathSpaceId as string)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.location does not resolve: ${location.pathSpaceId}`,
      );
    }
    const region = pathSpaceRegion(location.pathSpaceId as string, campaignPathRegions);
    if (region !== "edge_of_life") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.location must be an Edge-of-Life path space`);
    }
    if (
      isValidNecromancerBuiltinPathSpaceId(location.pathSpaceId as string) &&
      !isBuiltinEdgeOfLifePathSpaceId(location.pathSpaceId as string)
    ) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.location must be an Edge-of-Life path space`);
    }
    assertNonNegativeSafeInteger(`${path}.pettyDeadCount`, ghoul.pettyDeadCount);
  }
  uniqueIds(ghoulIds, "necromancer ghoul-caller denizenId");
}

export function validateNecromancerStructure(necromancer: unknown): void {
  if (necromancer === null || necromancer === undefined || typeof necromancer !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Missing or invalid necromancer");
  }
  const n = necromancer as Record<string, unknown>;
  if (!Array.isArray(n.gates)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "necromancer.gates must be an array");
  }
  if (!Array.isArray(n.pathSpaces)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "necromancer.pathSpaces must be an array");
  }
  if (!Array.isArray(n.steps)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "necromancer.steps must be an array");
  }
  if (!Array.isArray(n.souls)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "necromancer.souls must be an array");
  }
  if (!Array.isArray(n.foes)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "necromancer.foes must be an array");
  }
  if (!Array.isArray(n.allies)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "necromancer.allies must be an array");
  }
  if (!Array.isArray(n.ghoulCallers)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "necromancer.ghoulCallers must be an array");
  }
  if (!Array.isArray(n.selectedLaws)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "necromancer.selectedLaws must be an array");
  }

  if (isExactEmptyNecromancerState(n)) {
    return;
  }

  validateDepth(n.depth);
  validateSelectedLaws(n.selectedLaws as unknown[]);
  const topology = validateInitializedTopology(n);
  validateOccupants(n, topology.gateIds, topology.pathSpaceIds, topology.campaignPathRegions);
}

export function validateNecromancerReferenceIntegrity(state: CampaignStateV5): void {
  validateNecromancerStructure(state.necromancer);

  const necromancer: NecromancerState = state.necromancer;
  if (
    necromancer.gates.length === 0 &&
    necromancer.pathSpaces.length === 0 &&
    necromancer.steps.length === 0 &&
    necromancer.souls.length === 0 &&
    necromancer.foes.length === 0 &&
    necromancer.allies.length === 0 &&
    necromancer.ghoulCallers.length === 0 &&
    necromancer.selectedLaws.length === 0 &&
    necromancer.depth === null
  ) {
    return;
  }

  const wizardIds = new Set(state.wizards.map((wizard) => wizard.wizardId as string));
  if (necromancer.depth !== null && !wizardIds.has(necromancer.depth.wizardId as string)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `necromancer.depth.wizardId does not resolve: ${necromancer.depth.wizardId}`,
    );
  }

  const denizenById = new Map(state.world.denizens.map((d) => [d.denizenId as string, d]));

  for (let i = 0; i < necromancer.foes.length; i++) {
    const foe = necromancer.foes[i];
    const path = `necromancer.foes[${i}]`;
    const denizen = denizenById.get(foe.denizenId as string);
    if (denizen === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${foe.denizenId}`);
    }
  }

  for (let i = 0; i < necromancer.allies.length; i++) {
    const ally = necromancer.allies[i];
    const path = `necromancer.allies[${i}]`;
    const denizen = denizenById.get(ally.denizenId as string);
    if (denizen === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${ally.denizenId}`);
    }
  }

  for (let i = 0; i < necromancer.ghoulCallers.length; i++) {
    const ghoul = necromancer.ghoulCallers[i];
    const path = `necromancer.ghoulCallers[${i}]`;
    const denizen = denizenById.get(ghoul.denizenId as string);
    if (denizen === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId does not resolve: ${ghoul.denizenId}`);
    }
    if (denizen.representation !== "individual") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId must reference an individual Denizen`);
    }
  }
}
