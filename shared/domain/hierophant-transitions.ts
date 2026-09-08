import type { CampaignStateV5 } from "./campaign-state";
import type { PlaceId } from "./ids";
import { isValidPlaceId } from "./ids";
import { DomainError } from "./errors";
import type { PactSeatId } from "./pact-seats";
import {
  HIEROPHANT_STARTING_TEMPLE_DEFINITIONS,
  HIEROPHANT_STARTING_TEMPLE_IDS,
  isValidHierophantFlameLawId,
  isValidHierophantStartingTempleId,
  type HierophantFlameLawId,
  type HierophantStartingTempleId,
} from "./hierophant-catalogs";
import type {
  HierophantState,
  HierophantTemple,
  OrdinaryHierophantTemple,
  HestarHierophantTemple,
} from "./hierophant-state";
import type {
  HierophantInitializedEventV1,
  TempleResourcesAdjustedEventV1,
} from "./events";
import type { ExpectedFieldChange } from "./world-subject-transitions";

export interface HierophantTransitionResult {
  readonly nextState: CampaignStateV5;
  readonly events: readonly (HierophantInitializedEventV1 | TempleResourcesAdjustedEventV1)[];
}

export interface TemplePlaceBinding {
  readonly templeId: HierophantStartingTempleId;
  readonly placeId: PlaceId;
}

export interface InitializeHierophantInput {
  readonly selectedFlameLawIds: readonly HierophantFlameLawId[];
  readonly templePlaces: readonly TemplePlaceBinding[];
}

export interface AdjustTempleResourcesFields {
  readonly abundance?: ExpectedFieldChange<number>;
  readonly conviction?: ExpectedFieldChange<number>;
}

function replaceHierophant(state: CampaignStateV5, hierophant: HierophantState): CampaignStateV5 {
  return { ...state, hierophant };
}

function checkPrecondition<T>(
  fieldLabel: string,
  current: T,
  change: ExpectedFieldChange<T>,
): void {
  if (current !== change.expected) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `${fieldLabel}: expected "${String(change.expected)}" but current is "${String(current)}"`,
    );
  }
}

function assertNonNegativeSafeInteger(label: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} must be a non-negative safe integer`);
  }
}

function uniqueOrThrow(ids: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate ${label}: ${id}`);
    }
    seen.add(id);
  }
}

function buildStartingTemple(
  definition: (typeof HIEROPHANT_STARTING_TEMPLE_DEFINITIONS)[number],
  placeId: PlaceId,
  hostSeatId: PactSeatId,
): HierophantTemple {
  if (definition.kind === "hestar") {
    const temple: HestarHierophantTemple = {
      templeId: definition.templeId,
      kind: "hestar",
      placeId,
      hostSeatId,
      status: definition.status,
      abundance: definition.abundance,
      conviction: definition.conviction,
    };
    return temple;
  }
  const temple: OrdinaryHierophantTemple = {
    templeId: definition.templeId,
    kind: "ordinary",
    placeId,
    hostSeatId,
    status: definition.status,
    abundance: definition.abundance,
    conviction: definition.conviction,
    doctrine: { kind: "unset" },
  };
  return temple;
}

export function applyInitializeHierophant(
  state: CampaignStateV5,
  input: InitializeHierophantInput,
): HierophantTransitionResult {
  if (state.hierophant.temples.length > 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Hierophant Temples have already been initialized");
  }

  uniqueOrThrow(input.selectedFlameLawIds, "selectedFlameLawId");
  if (input.selectedFlameLawIds.length !== 2) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Hierophant initialization requires choosing exactly two Laws of the Flame",
    );
  }
  for (const lawId of input.selectedFlameLawIds) {
    if (!isValidHierophantFlameLawId(lawId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown Flame Law id: ${lawId}`);
    }
  }

  if (input.templePlaces.length !== HIEROPHANT_STARTING_TEMPLE_IDS.length) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Hierophant initialization requires a Place for each starting Temple (${HIEROPHANT_STARTING_TEMPLE_IDS.length})`,
    );
  }

  uniqueOrThrow(input.templePlaces.map((b) => b.templeId), "starting Temple id");
  uniqueOrThrow(input.templePlaces.map((b) => b.placeId), "Temple placeId");

  const bindingByTemple = new Map<string, TemplePlaceBinding>();
  for (const binding of input.templePlaces) {
    if (!isValidHierophantStartingTempleId(binding.templeId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown starting Temple id: ${binding.templeId}`);
    }
    if (!isValidPlaceId(binding.placeId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Temple placeId: ${binding.placeId}`);
    }
    const place = state.world.places.find((p) => p.placeId === binding.placeId);
    if (place === undefined) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Temple ${binding.templeId} placeId does not resolve to a World Place: ${binding.placeId}`,
      );
    }
    bindingByTemple.set(binding.templeId, binding);
  }

  for (const startingId of HIEROPHANT_STARTING_TEMPLE_IDS) {
    if (!bindingByTemple.has(startingId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Missing Place binding for starting Temple ${startingId}`);
    }
  }

  const temples: HierophantTemple[] = HIEROPHANT_STARTING_TEMPLE_DEFINITIONS.map((definition) => {
    const binding = bindingByTemple.get(definition.templeId)!;
    return buildStartingTemple(definition, binding.placeId, definition.hostSeatId);
  });

  const hierophant: HierophantState = {
    ...state.hierophant,
    selectedFlameLawIds: [...input.selectedFlameLawIds],
    temples,
  };

  const event: HierophantInitializedEventV1 = {
    type: "hierophant_initialized",
    version: 1,
    data: {
      selectedFlameLawIds: hierophant.selectedFlameLawIds,
      temples,
    },
  };

  return { nextState: replaceHierophant(state, hierophant), events: [event] };
}

export function applyAdjustTempleResources(
  state: CampaignStateV5,
  templeId: HierophantStartingTempleId,
  fields: AdjustTempleResourcesFields,
): HierophantTransitionResult {
  if (fields.abundance === undefined && fields.conviction === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update must specify at least one field");
  }

  const idx = state.hierophant.temples.findIndex((t) => t.templeId === templeId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Temple not found: ${templeId}`);
  }
  const current = state.hierophant.temples[idx];

  let abundance = current.abundance;
  let conviction = current.conviction;

  if (fields.abundance !== undefined) {
    checkPrecondition("abundance", current.abundance, fields.abundance);
    assertNonNegativeSafeInteger("abundance", fields.abundance.value);
    abundance = fields.abundance.value;
  }
  if (fields.conviction !== undefined) {
    checkPrecondition("conviction", current.conviction, fields.conviction);
    assertNonNegativeSafeInteger("conviction", fields.conviction.value);
    conviction = fields.conviction.value;
  }

  if (abundance === current.abundance && conviction === current.conviction) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }

  const updated: HierophantTemple = { ...current, abundance, conviction };
  const temples = state.hierophant.temples.map((t, i) => (i === idx ? updated : t));
  const hierophant: HierophantState = { ...state.hierophant, temples };

  const event: TempleResourcesAdjustedEventV1 = {
    type: "temple_resources_adjusted",
    version: 1,
    data: {
      templeId,
      previousAbundance: current.abundance,
      newAbundance: abundance,
      previousConviction: current.conviction,
      newConviction: conviction,
    },
  };

  return { nextState: replaceHierophant(state, hierophant), events: [event] };
}
