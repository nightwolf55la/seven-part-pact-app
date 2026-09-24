import type { CampaignStateV5 } from "./campaign-state";
import type { AllocationId, DenizenId } from "./ids";
import { isValidAllocationId, isValidDenizenId } from "./ids";
import { DomainError } from "./errors";
import { stalePreconditionMessage } from "./stale-precondition-format";
import type { HierophantEvent } from "./events";
import type { HierophantTempleId } from "./hierophant-catalogs";
import { hierophantBuiltinClassBenefaction, isValidHierophantTempleId } from "./hierophant-catalogs";
import type {
  HierophantClassId,
  HierophantSupplicant,
  HierophantSupplicantHost,
  HierophantTemple,
  HierophantTempleArea,
  HierophantTempleStatus,
} from "./hierophant-state";
import { applyCreateDenizenV5Candidate } from "./world-subject-transitions";
import { applyAddSupplicant } from "./hierophant-transitions";
import {
  computeHierophantVisionsResolution,
  type HierophantVisionsChoices,
  type HierophantVisionsContext,
  type HierophantVisionsPlan,
} from "./hierophant-visions";

export interface CreateHierophantSupplicantInput {
  readonly denizenId: DenizenId;
  readonly name: string;
  readonly classId: HierophantClassId;
  readonly woe: number;
  readonly templeId: HierophantTempleId;
  readonly area: HierophantTempleArea | null;
  readonly expectedTempleStatus: HierophantTempleStatus;
}

export interface HierophantOperabilityTransitionResult {
  readonly nextState: CampaignStateV5;
  readonly events: readonly HierophantEvent[];
}

function canonicalizeTempleArea(area: HierophantTempleArea | null): HierophantTempleArea | null {
  if (area === null || area === "courtyard" || area === "agiary") {
    return area;
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Temple area: ${String(area)}`);
}

function canonicalizeTempleStatus(status: HierophantTempleStatus): HierophantTempleStatus {
  if (status === "active" || status === "collapsed") {
    return status;
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Temple status: ${String(status)}`);
}

export function canonicalizeCreateHierophantSupplicantInput(
  input: CreateHierophantSupplicantInput,
): CreateHierophantSupplicantInput {
  if (!isValidDenizenId(input.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${input.denizenId}`);
  }
  if (!isValidHierophantTempleId(input.templeId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Temple not found: ${input.templeId}`);
  }
  if (typeof input.name !== "string") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Name must not be blank");
  }
  if (typeof input.classId !== "string" || input.classId.trim() === "") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Class does not resolve: ${String(input.classId)}`);
  }
  if (!Number.isSafeInteger(input.woe) || input.woe < 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "woe must be a non-negative safe integer");
  }
  return {
    denizenId: input.denizenId,
    name: input.name.trim(),
    classId: input.classId,
    woe: input.woe,
    templeId: input.templeId,
    area: canonicalizeTempleArea(input.area),
    expectedTempleStatus: canonicalizeTempleStatus(input.expectedTempleStatus),
  };
}

export function applyCreateHierophantSupplicant(
  state: CampaignStateV5,
  rawInput: CreateHierophantSupplicantInput,
): HierophantOperabilityTransitionResult {
  const input = canonicalizeCreateHierophantSupplicantInput(rawInput);
  if (state.hierophant.temples.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Hierophant Temples have not been initialized");
  }
  const temple = state.hierophant.temples.find((candidate) => candidate.templeId === input.templeId);
  if (temple === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Temple not found: ${input.templeId}`);
  }
  if (temple.status !== input.expectedTempleStatus) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Temple status: expected "${input.expectedTempleStatus}" but current is "${temple.status}"`,
    );
  }
  if (temple.status !== "active") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Receive Supplicant is not available at a collapsed Temple",
    );
  }
  if (temple.kind === "hestar" && input.area !== null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Hestar host area must be null");
  }

  const created = applyCreateDenizenV5Candidate(state, {
    denizenId: input.denizenId,
    name: input.name,
    representation: "individual",
    description: null,
  });
  const supplicant: HierophantSupplicant = {
    denizenId: input.denizenId,
    classId: input.classId,
    woe: input.woe,
    host: {
      kind: "temple",
      templeId: input.templeId,
      area: temple.kind === "hestar" ? null : input.area,
    },
  };
  const added = applyAddSupplicant(created.nextState, supplicant);
  const denizen = added.nextState.world.denizens.find((candidate) => candidate.denizenId === input.denizenId);
  return {
    nextState: added.nextState,
    events: [{
      type: "hierophant_supplicant_created",
      version: 1,
      data: {
        denizenId: input.denizenId,
        denizenName: denizen?.name ?? input.name,
        classId: input.classId,
        woe: input.woe,
        templeId: input.templeId,
        area: supplicant.host.kind === "temple" ? supplicant.host.area : null,
        expectedTempleStatus: input.expectedTempleStatus,
      },
    }],
  };
}

export function hierophantVisionsContextFromCampaign(
  state: CampaignStateV5,
): HierophantVisionsContext {
  const reliableProphetDenizenIds: DenizenId[] = [];
  for (const denizen of state.world.denizens) {
    const status = denizen.powerfulProfile?.status;
    if (status?.kind === "standard" && status.value === "reliable") {
      reliableProphetDenizenIds.push(denizen.denizenId);
    }
  }
  return { reliableProphetDenizenIds };
}

export function canonicalizeHierophantVisionsChoices(
  choices: HierophantVisionsChoices | {
    readonly artisanPayments?: Readonly<Record<string, unknown>>;
    readonly hestarFallback?: Readonly<Record<string, unknown>>;
    readonly hestarDonors?: Readonly<Record<string, unknown>>;
    readonly supplicantOrder?: readonly unknown[];
  },
): HierophantVisionsChoices {
  const artisanPayments: Record<string, "abundance" | "conviction"> = {};
  for (const [id, resource] of Object.entries(choices.artisanPayments ?? {})) {
    if (resource !== "abundance" && resource !== "conviction") continue;
    artisanPayments[id] = resource;
  }
  const hestarFallback: Record<string, boolean> = {};
  for (const [id, value] of Object.entries(choices.hestarFallback ?? {})) {
    if (value !== true && value !== false) continue;
    hestarFallback[id] = value;
  }
  const hestarDonors: Record<string, HierophantTempleId> = {};
  for (const [id, templeId] of Object.entries(choices.hestarDonors ?? {})) {
    if (typeof templeId !== "string" || !isValidHierophantTempleId(templeId) || templeId === "hestar") continue;
    hestarDonors[id] = templeId;
  }
  const seen = new Set<string>();
  const supplicantOrder: DenizenId[] = [];
  for (const id of choices.supplicantOrder ?? []) {
    if (typeof id !== "string" || id.trim() === "" || seen.has(id)) continue;
    seen.add(id);
    supplicantOrder.push(id as DenizenId);
  }
  return {
    ...(Object.keys(artisanPayments).length > 0 ? { artisanPayments } : {}),
    ...(Object.keys(hestarFallback).length > 0 ? { hestarFallback } : {}),
    ...(Object.keys(hestarDonors).length > 0 ? { hestarDonors } : {}),
    ...(supplicantOrder.length > 0 ? { supplicantOrder } : {}),
  };
}

export type ResolveHierophantVisionsApplyResult =
  | {
      readonly kind: "ready";
      readonly nextState: CampaignStateV5;
      readonly events: readonly HierophantEvent[];
    }
  | {
      readonly kind: "choices_required";
      readonly plan: HierophantVisionsPlan;
    }
  | {
      readonly kind: "manual_resolution_required";
      readonly plan: HierophantVisionsPlan;
    };

export function applyResolveHierophantVisions(
  state: CampaignStateV5,
  rawChoices: HierophantVisionsChoices,
): ResolveHierophantVisionsApplyResult {
  if (state.hierophant.temples.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Hierophant Temples have not been initialized");
  }
  const choices = canonicalizeHierophantVisionsChoices(rawChoices);
  const resolution = computeHierophantVisionsResolution(
    state.hierophant,
    choices,
    hierophantVisionsContextFromCampaign(state),
  );
  if (resolution.kind !== "ready") {
    return { kind: resolution.kind, plan: resolution.plan };
  }
  const supportById = new Map(
    resolution.plan.supplicants.map((preview) => [preview.denizenId, preview.support]),
  );
  return {
    kind: "ready",
    nextState: {
      ...state,
      hierophant: resolution.resultingState,
    },
    events: [{
      type: "hierophant_visions_resolved",
      version: 1,
      data: {
        monthOrdinal: state.calendar.monthOrdinal,
        choices: resolution.facts.suppliedChoices,
        woeChanges: resolution.facts.woeChanges.map((change) => ({
          denizenId: change.denizenId,
          templeId: change.templeId,
          from: change.from,
          to: change.to,
          support: supportById.get(change.denizenId) ?? "not_determined",
        })),
        resourceDeltas: resolution.facts.resourceDeltas,
        hestarUses: resolution.facts.hestarUses,
      },
    }],
  };
}

export function assertHierophantVisionsRevision(
  currentRevision: number,
  expectedRevision: number,
): void {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid expectedRevision: ${expectedRevision}`);
  }
  if (currentRevision !== expectedRevision) {
    throw new DomainError(
      "STALE_CAMPAIGN_REVISION",
      `Visions preview is out of date. Review the current board and try again. Expected revision ${expectedRevision}, current is ${currentRevision}`,
    );
  }
}

export interface TransferHierophantHestarResourceInput {
  readonly resource: "abundance" | "conviction";
  readonly sourceTempleId: HierophantTempleId;
  readonly destinationTempleId: HierophantTempleId;
}

const HESTAR_TRANSFER_AMOUNT = 1 as const;

function isHestarTemple(temple: HierophantTemple): boolean {
  return temple.kind === "hestar" || temple.templeId === "hestar";
}

function resourceCount(temple: HierophantTemple, resource: "abundance" | "conviction"): number {
  return resource === "abundance" ? temple.abundance : temple.conviction;
}

function withResource(
  temple: HierophantTemple,
  resource: "abundance" | "conviction",
  value: number,
): HierophantTemple {
  return resource === "abundance"
    ? { ...temple, abundance: value }
    : { ...temple, conviction: value };
}

export function applyTransferHierophantHestarResource(
  state: CampaignStateV5,
  rawInput: TransferHierophantHestarResourceInput,
): HierophantOperabilityTransitionResult {
  if (state.hierophant.temples.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Hierophant Temples have not been initialized");
  }
  if (rawInput.resource !== "abundance" && rawInput.resource !== "conviction") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid resource: ${String(rawInput.resource)}`);
  }
  if (!isValidHierophantTempleId(rawInput.sourceTempleId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Temple not found: ${String(rawInput.sourceTempleId)}`);
  }
  if (!isValidHierophantTempleId(rawInput.destinationTempleId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Temple not found: ${String(rawInput.destinationTempleId)}`);
  }
  if (rawInput.sourceTempleId === rawInput.destinationTempleId) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Source and destination Temples must be different");
  }
  const source = state.hierophant.temples.find((temple) => temple.templeId === rawInput.sourceTempleId);
  const destination = state.hierophant.temples.find((temple) => temple.templeId === rawInput.destinationTempleId);
  if (source === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Temple not found: ${rawInput.sourceTempleId}`);
  }
  if (destination === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Temple not found: ${rawInput.destinationTempleId}`);
  }
  const sourceIsHestar = isHestarTemple(source);
  const destinationIsHestar = isHestarTemple(destination);
  if (sourceIsHestar === destinationIsHestar) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Hestar resource sharing requires exactly one endpoint to be Hestar",
    );
  }
  const ordinary = sourceIsHestar ? destination : source;
  if (ordinary.kind !== "ordinary") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "The other endpoint must be one ordinary Hierophant Temple");
  }
  if (ordinary.doctrine.kind === "blasphemy") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Cannot share with Hestar while Blasphemous");
  }
  const sourceBefore = resourceCount(source, rawInput.resource);
  const destinationBefore = resourceCount(destination, rawInput.resource);
  if (sourceBefore < HESTAR_TRANSFER_AMOUNT) {
    const label = rawInput.resource === "abundance" ? "Abundance" : "Conviction";
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} source has 0 available`);
  }
  const sourceAfter = sourceBefore - HESTAR_TRANSFER_AMOUNT;
  const destinationAfter = destinationBefore + HESTAR_TRANSFER_AMOUNT;
  if (sourceAfter < 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Transfer would create a negative resource count");
  }
  const temples = state.hierophant.temples.map((temple) => {
    if (temple.templeId === source.templeId) return withResource(temple, rawInput.resource, sourceAfter);
    if (temple.templeId === destination.templeId) return withResource(temple, rawInput.resource, destinationAfter);
    return temple;
  });
  return {
    nextState: {
      ...state,
      hierophant: {
        ...state.hierophant,
        temples,
      },
    },
    events: [{
      type: "hierophant_hestar_resource_transferred",
      version: 1,
      data: {
        resource: rawInput.resource,
        sourceTempleId: source.templeId,
        destinationTempleId: destination.templeId,
        amount: HESTAR_TRANSFER_AMOUNT,
        sourceBefore,
        sourceAfter,
        destinationBefore,
        destinationAfter,
      },
    }],
  };
}

export function assertHierophantHestarTransferRevision(
  currentRevision: number,
  expectedRevision: number,
): void {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid expectedRevision: ${expectedRevision}`);
  }
  if (currentRevision !== expectedRevision) {
    throw new DomainError(
      "STALE_CAMPAIGN_REVISION",
      `Hestar transfer is out of date. Expected revision ${expectedRevision}, current is ${currentRevision}`,
    );
  }
}

export type HierophantHestarConversionSourceResource = "abundance" | "conviction";

export interface ConvertHierophantHestarResourceInput {
  readonly ordinaryTempleId: HierophantTempleId;
  readonly sourceResource: HierophantHestarConversionSourceResource;
  readonly expectedOrdinarySourceCount: number;
  readonly expectedHestarDestinationCount: number;
}

const HESTAR_CONVERSION_AMOUNT = 1 as const;

export function hierophantHestarConversionDestinationResource(
  sourceResource: HierophantHestarConversionSourceResource,
): HierophantHestarConversionSourceResource {
  return sourceResource === "abundance" ? "conviction" : "abundance";
}

function resourceLabel(resource: HierophantHestarConversionSourceResource): string {
  return resource === "abundance" ? "Abundance" : "Conviction";
}

export function applyConvertHierophantHestarResource(
  state: CampaignStateV5,
  rawInput: ConvertHierophantHestarResourceInput,
): HierophantOperabilityTransitionResult {
  if (state.hierophant.temples.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Hierophant Temples have not been initialized");
  }
  if (rawInput.sourceResource !== "abundance" && rawInput.sourceResource !== "conviction") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid resource: ${String(rawInput.sourceResource)}`);
  }
  if (!isValidHierophantTempleId(rawInput.ordinaryTempleId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Temple not found: ${String(rawInput.ordinaryTempleId)}`);
  }
  if (!Number.isSafeInteger(rawInput.expectedOrdinarySourceCount) || rawInput.expectedOrdinarySourceCount < 0) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Invalid expectedOrdinarySourceCount: ${rawInput.expectedOrdinarySourceCount}`,
    );
  }
  if (!Number.isSafeInteger(rawInput.expectedHestarDestinationCount) || rawInput.expectedHestarDestinationCount < 0) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Invalid expectedHestarDestinationCount: ${rawInput.expectedHestarDestinationCount}`,
    );
  }
  const ordinary = state.hierophant.temples.find((temple) => temple.templeId === rawInput.ordinaryTempleId);
  if (ordinary === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Temple not found: ${rawInput.ordinaryTempleId}`);
  }
  if (isHestarTemple(ordinary) || ordinary.kind !== "ordinary") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Conversion source must be one ordinary Hierophant Temple");
  }
  const hestar = state.hierophant.temples.find((temple) => isHestarTemple(temple));
  if (hestar === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Hestar has not been initialized");
  }
  const hestarResource = hierophantHestarConversionDestinationResource(rawInput.sourceResource);
  const ordinaryBefore = resourceCount(ordinary, rawInput.sourceResource);
  const hestarBefore = resourceCount(hestar, hestarResource);
  if (ordinaryBefore !== rawInput.expectedOrdinarySourceCount) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      stalePreconditionMessage("ordinary source count", rawInput.expectedOrdinarySourceCount, ordinaryBefore),
    );
  }
  if (hestarBefore !== rawInput.expectedHestarDestinationCount) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      stalePreconditionMessage("Hestar destination count", rawInput.expectedHestarDestinationCount, hestarBefore),
    );
  }
  if (ordinaryBefore < HESTAR_CONVERSION_AMOUNT) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${resourceLabel(rawInput.sourceResource)} source has 0 available`,
    );
  }
  const ordinaryAfter = ordinaryBefore - HESTAR_CONVERSION_AMOUNT;
  const hestarAfter = hestarBefore + HESTAR_CONVERSION_AMOUNT;
  if (ordinaryAfter < 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Conversion would create a negative resource count");
  }
  const temples = state.hierophant.temples.map((temple) => {
    if (temple.templeId === ordinary.templeId) {
      return withResource(temple, rawInput.sourceResource, ordinaryAfter);
    }
    if (temple.templeId === hestar.templeId) {
      return withResource(temple, hestarResource, hestarAfter);
    }
    return temple;
  });
  return {
    nextState: {
      ...state,
      hierophant: {
        ...state.hierophant,
        temples,
      },
    },
    events: [{
      type: "hierophant_hestar_resource_converted",
      version: 1,
      data: {
        ordinaryTempleId: ordinary.templeId,
        sourceResource: rawInput.sourceResource,
        hestarResource,
        amount: HESTAR_CONVERSION_AMOUNT,
        ordinaryBefore,
        ordinaryAfter,
        hestarBefore,
        hestarAfter,
      },
    }],
  };
}

export function assertHierophantHestarConversionRevision(
  currentRevision: number,
  expectedRevision: number,
): void {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid expectedRevision: ${expectedRevision}`);
  }
  if (currentRevision !== expectedRevision) {
    throw new DomainError(
      "STALE_CAMPAIGN_REVISION",
      `Hestar conversion is out of date. Expected revision ${expectedRevision}, current is ${currentRevision}`,
    );
  }
}

function assertExpectedRevision(
  currentRevision: number,
  expectedRevision: number,
  action: string,
): void {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid expectedRevision: ${expectedRevision}`);
  }
  if (currentRevision !== expectedRevision) {
    throw new DomainError(
      "STALE_CAMPAIGN_REVISION",
      `${action} is out of date. Expected revision ${expectedRevision}, current is ${currentRevision}`,
    );
  }
}

export function assertHierophantSteerRevision(
  currentRevision: number,
  expectedRevision: number,
): void {
  assertExpectedRevision(currentRevision, expectedRevision, "Steer");
}

export function assertHierophantBenefactionDepartRevision(
  currentRevision: number,
  expectedRevision: number,
): void {
  assertExpectedRevision(currentRevision, expectedRevision, "Benefaction & Depart");
}

export interface SteerHierophantSupplicantInput {
  readonly allocationId: AllocationId;
  readonly denizenId: DenizenId;
  readonly destinationTempleId: HierophantTempleId;
  readonly destinationArea: HierophantTempleArea | null;
}

function canonicalizeTempleAreaOrNull(area: HierophantTempleArea | null): HierophantTempleArea | null {
  if (area === null || area === "courtyard" || area === "agiary") return area;
  throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Temple area: ${String(area)}`);
}

function spendMatchingSteerAllocation(
  state: CampaignStateV5,
  allocationId: AllocationId,
  denizenId: DenizenId,
): CampaignStateV5 {
  if (state.lifecycle.kind !== "play") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Steer requires lifecycle kind 'play'");
  }
  if (!isValidAllocationId(allocationId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid allocationId: ${allocationId}`);
  }
  const { timeParticipants } = state.lifecycle.currentMonth;
  let tpIndex = -1;
  let allocIndex = -1;
  for (let i = 0; i < timeParticipants.length; i++) {
    const tp = timeParticipants[i];
    for (let j = 0; j < tp.allocations.length; j++) {
      if (tp.allocations[j].allocationId === allocationId) {
        tpIndex = i;
        allocIndex = j;
        break;
      }
    }
    if (tpIndex >= 0) break;
  }
  if (tpIndex < 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Allocation ${allocationId} not found in current month`);
  }
  const tp = timeParticipants[tpIndex];
  const alloc = tp.allocations[allocIndex];
  if (tp.participant.kind !== "wizard") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Allocation ${allocationId} belongs to the Devil, not a Wizard`);
  }
  if (alloc.resolution !== "pending") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Allocation ${allocationId} is ${alloc.resolution}, not pending`,
    );
  }
  if (
    alloc.destination === null
    || alloc.destination.kind !== "hierophant_supplicant"
    || alloc.destination.denizenId !== denizenId
  ) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Allocation ${allocationId} is not scheduled on this Supplicant`,
    );
  }
  const newAllocations = tp.allocations.map((entry, index) => (
    index === allocIndex ? { ...entry, resolution: "spent" as const } : entry
  ));
  const newTimeParticipants = timeParticipants.map((entry, index) => (
    index === tpIndex ? { ...entry, allocations: newAllocations } : entry
  ));
  return {
    ...state,
    lifecycle: {
      ...state.lifecycle,
      currentMonth: {
        ...state.lifecycle.currentMonth,
        timeParticipants: newTimeParticipants,
      },
    },
  };
}

export function applySteerHierophantSupplicant(
  state: CampaignStateV5,
  rawInput: SteerHierophantSupplicantInput,
): HierophantOperabilityTransitionResult {
  if (state.hierophant.temples.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Hierophant Temples have not been initialized");
  }
  if (!isValidDenizenId(rawInput.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${rawInput.denizenId}`);
  }
  if (!isValidHierophantTempleId(rawInput.destinationTempleId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Temple not found: ${String(rawInput.destinationTempleId)}`);
  }
  const destinationArea = canonicalizeTempleAreaOrNull(rawInput.destinationArea);
  const person = state.hierophant.supplicants.find((entry) => entry.denizenId === rawInput.denizenId);
  if (person === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Supplicant not found: ${rawInput.denizenId}`);
  }
  const destination = state.hierophant.temples.find((temple) => temple.templeId === rawInput.destinationTempleId);
  if (destination === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Temple not found: ${rawInput.destinationTempleId}`);
  }
  if (person.woe < 1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Steer requires a Supplicant with at least 1 Woe");
  }
  const toHost: HierophantSupplicantHost = destination.kind === "hestar"
    ? { kind: "temple", templeId: destination.templeId, area: null }
    : { kind: "temple", templeId: destination.templeId, area: destinationArea };
  const spent = spendMatchingSteerAllocation(state, rawInput.allocationId, rawInput.denizenId);
  const woeAfter = person.woe - 1;
  const updated: HierophantSupplicant = {
    ...person,
    woe: woeAfter,
    host: toHost,
  };
  const nextState: CampaignStateV5 = {
    ...spent,
    hierophant: {
      ...spent.hierophant,
      supplicants: spent.hierophant.supplicants.map((entry) => (
        entry.denizenId === person.denizenId ? updated : entry
      )),
    },
  };
  const denizenName = nextState.world.denizens.find((entry) => entry.denizenId === person.denizenId)?.name
    ?? person.denizenId;
  return {
    nextState,
    events: [{
      type: "hierophant_supplicant_steered",
      version: 1,
      data: {
        denizenId: person.denizenId,
        denizenName,
        allocationId: rawInput.allocationId,
        fromHost: person.host,
        toHost,
        woeBefore: person.woe,
        woeAfter,
      },
    }],
  };
}

export interface DepartHierophantSupplicantWithBenefactionInput {
  readonly denizenId: DenizenId;
}

export function applyDepartHierophantSupplicantWithBenefaction(
  state: CampaignStateV5,
  rawInput: DepartHierophantSupplicantWithBenefactionInput,
): HierophantOperabilityTransitionResult {
  if (state.hierophant.temples.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Hierophant Temples have not been initialized");
  }
  if (!isValidDenizenId(rawInput.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${rawInput.denizenId}`);
  }
  const person = state.hierophant.supplicants.find((entry) => entry.denizenId === rawInput.denizenId);
  if (person === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Supplicant not found: ${rawInput.denizenId}`);
  }
  if (person.woe !== 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Benefaction & Depart requires Woe 0");
  }
  const host = person.host;
  if (host.kind !== "temple") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Benefaction & Depart requires a Temple host");
  }
  const temple = state.hierophant.temples.find((entry) => entry.templeId === host.templeId);
  if (temple === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Temple not found: ${host.templeId}`);
  }
  const benefaction = hierophantBuiltinClassBenefaction(person.classId);
  if (benefaction === null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Benefaction is not determined for this Class");
  }
  const resourceBefore = benefaction.kind === "abundance" ? temple.abundance : temple.conviction;
  const resourceAfter = resourceBefore + benefaction.amount;
  const temples = state.hierophant.temples.map((entry) => {
    if (entry.templeId !== temple.templeId) return entry;
    return benefaction.kind === "abundance"
      ? { ...entry, abundance: resourceAfter }
      : { ...entry, conviction: resourceAfter };
  });
  const denizenName = state.world.denizens.find((entry) => entry.denizenId === person.denizenId)?.name
    ?? person.denizenId;
  return {
    nextState: {
      ...state,
      hierophant: {
        ...state.hierophant,
        temples,
        supplicants: state.hierophant.supplicants.filter((entry) => entry.denizenId !== person.denizenId),
      },
    },
    events: [{
      type: "hierophant_supplicant_benefaction_departed",
      version: 1,
      data: {
        denizenId: person.denizenId,
        denizenName,
        classId: person.classId,
        templeId: temple.templeId,
        resource: benefaction.kind,
        amount: benefaction.amount,
        resourceBefore,
        resourceAfter,
      },
    }],
  };
}
