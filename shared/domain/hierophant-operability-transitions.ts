import type { CampaignStateV5 } from "./campaign-state";
import type { DenizenId } from "./ids";
import { isValidDenizenId } from "./ids";
import { DomainError } from "./errors";
import type { HierophantEvent } from "./events";
import type { HierophantTempleId } from "./hierophant-catalogs";
import { isValidHierophantTempleId } from "./hierophant-catalogs";
import type {
  HierophantClassId,
  HierophantSupplicant,
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
  choices: HierophantVisionsChoices,
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
    if (templeId === undefined || !isValidHierophantTempleId(templeId) || templeId === "hestar") continue;
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
