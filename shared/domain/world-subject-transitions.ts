import type { CampaignStateV5 } from "./campaign-state";
import type {
  Denizen,
  Isle,
  WorldPlace,
  WorldPlacePlacement,
  SharedWorldState,
} from "./shared-world";
import type { DenizenId, IsleId, PlaceId } from "./ids";
import { isValidDenizenId, isValidIsleId, isValidPlaceId } from "./ids";
import { DomainError } from "./errors";
import type { DenizenCreatedEventV1, DenizenUpdatedEventV1, IsleCreatedEventV1, IsleUpdatedEventV1, PlaceCreatedEventV1, PlaceUpdatedEventV1 } from "./events";

// ---------------------------------------------------------------------------
// ExpectedFieldChange — field-level optimistic concurrency
// ---------------------------------------------------------------------------

export interface ExpectedFieldChange<T> {
  readonly expected: T;
  readonly value: T;
}

// ---------------------------------------------------------------------------
// Denizen events — durable contracts now in events.ts
// ---------------------------------------------------------------------------

export type {
  DenizenCreatedDataV1,
  DenizenCreatedEventV1,
  DenizenUpdatedDataV1,
  DenizenUpdatedEventV1,
  IsleCreatedDataV1,
  IsleCreatedEventV1,
  IsleUpdatedDataV1,
  IsleUpdatedEventV1,
  PlaceCreatedDataV1,
  PlaceCreatedEventV1,
  PlaceUpdatedDataV1,
  PlaceUpdatedEventV1,
} from "./events";

export type CandidateWorldSubjectEvent =
  | DenizenCreatedEventV1
  | DenizenUpdatedEventV1
  | IsleCreatedEventV1
  | IsleUpdatedEventV1
  | PlaceCreatedEventV1
  | PlaceUpdatedEventV1;

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface DenizenTransitionResult {
  readonly nextState: CampaignStateV5;
  readonly events: readonly (DenizenCreatedEventV1 | DenizenUpdatedEventV1)[];
}

export interface IsleTransitionResult {
  readonly nextState: CampaignStateV5;
  readonly events: readonly (IsleCreatedEventV1 | IsleUpdatedEventV1)[];
}

export interface PlaceTransitionResult {
  readonly nextState: CampaignStateV5;
  readonly events: readonly (PlaceCreatedEventV1 | PlaceUpdatedEventV1)[];
}

export interface WorldSubjectTransitionResult {
  readonly nextState: CampaignStateV5;
  readonly events: readonly CandidateWorldSubjectEvent[];
}

// ---------------------------------------------------------------------------
// Normalization (private)
// ---------------------------------------------------------------------------

const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 8000;

function normalizeName(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Name must not be blank");
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Name exceeds ${MAX_NAME_LENGTH} characters`);
  }
  return trimmed;
}

function normalizeDescription(raw: string | null): string | null {
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Description exceeds ${MAX_DESCRIPTION_LENGTH} characters`);
  }
  return trimmed;
}

// ---------------------------------------------------------------------------
// Placement comparison (semantic equality, not reference)
// ---------------------------------------------------------------------------

function placementsEqual(a: WorldPlacePlacement, b: WorldPlacePlacement): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "unspecified") return true;
  if (a.kind === "on_isle" && b.kind === "on_isle") return a.isleId === b.isleId;
  if (a.kind === "mobile" && b.kind === "mobile") return a.associatedIsleId === b.associatedIsleId;
  return false;
}

// ---------------------------------------------------------------------------
// Isle reference validation for placements
// ---------------------------------------------------------------------------

function validatePlacementIsleRef(placement: WorldPlacePlacement, world: SharedWorldState): void {
  const isleIds = new Set(world.isles.map((i) => i.isleId as string));
  if (placement.kind === "on_isle") {
    if (!isleIds.has(placement.isleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `on_isle placement references nonexistent isle: ${placement.isleId}`);
    }
  } else if (placement.kind === "mobile" && placement.associatedIsleId !== null) {
    if (!isleIds.has(placement.associatedIsleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `mobile placement references nonexistent isle: ${placement.associatedIsleId}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Field-level precondition check
// ---------------------------------------------------------------------------

function checkPrecondition<T>(
  fieldLabel: string,
  current: T,
  change: ExpectedFieldChange<T>,
  eq: (a: T, b: T) => boolean = (a, b) => a === b,
): void {
  if (!eq(current, change.expected)) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `${fieldLabel}: expected "${String(change.expected)}" but current is "${String(current)}"`,
    );
  }
}

// ---------------------------------------------------------------------------
// State helpers (immutable)
// ---------------------------------------------------------------------------

function replaceWorld(state: CampaignStateV5, world: SharedWorldState): CampaignStateV5 {
  return { ...state, world };
}

// ---------------------------------------------------------------------------
// Create Denizen
// ---------------------------------------------------------------------------

export interface CreateDenizenInput {
  readonly denizenId: DenizenId;
  readonly name: string;
  readonly representation: "individual" | "collective";
  readonly description: string | null;
}

export function applyCreateDenizenV5Candidate(
  state: CampaignStateV5,
  input: CreateDenizenInput,
): DenizenTransitionResult {
  if (!isValidDenizenId(input.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${input.denizenId}`);
  }
  if (state.world.denizens.some((d) => d.denizenId === input.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate denizenId: ${input.denizenId}`);
  }

  const denizen: Denizen = {
    denizenId: input.denizenId,
    name: normalizeName(input.name),
    representation: input.representation,
    description: normalizeDescription(input.description),
  };

  const world: SharedWorldState = {
    ...state.world,
    denizens: [...state.world.denizens, denizen],
  };

  const event: DenizenCreatedEventV1 = {
    type: "denizen_created",
    version: 1,
    data: { denizen },
  };

  return { nextState: replaceWorld(state, world), events: [event] };
}

// ---------------------------------------------------------------------------
// Update Denizen
// ---------------------------------------------------------------------------

export interface UpdateDenizenFields {
  readonly name?: ExpectedFieldChange<string>;
  readonly representation?: ExpectedFieldChange<"individual" | "collective">;
  readonly description?: ExpectedFieldChange<string | null>;
}

export function applyUpdateDenizenV5Candidate(
  state: CampaignStateV5,
  denizenId: DenizenId,
  fields: UpdateDenizenFields,
): DenizenTransitionResult {
  if (fields.name === undefined && fields.representation === undefined && fields.description === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update must specify at least one field");
  }

  const idx = state.world.denizens.findIndex((d) => d.denizenId === denizenId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Denizen not found: ${denizenId}`);
  }
  const current = state.world.denizens[idx];

  let name = current.name;
  let representation = current.representation;
  let description = current.description;

  if (fields.name !== undefined) {
    checkPrecondition("name", current.name, fields.name);
    name = normalizeName(fields.name.value);
  }
  if (fields.representation !== undefined) {
    checkPrecondition("representation", current.representation, fields.representation);
    representation = fields.representation.value;
  }
  if (fields.description !== undefined) {
    checkPrecondition("description", current.description, fields.description);
    description = normalizeDescription(fields.description.value);
  }

  const updated: Denizen = { denizenId, name, representation, description };

  if (
    updated.name === current.name &&
    updated.representation === current.representation &&
    updated.description === current.description
  ) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }

  const denizens = [...state.world.denizens];
  denizens[idx] = updated;
  const world: SharedWorldState = { ...state.world, denizens };

  const event: DenizenUpdatedEventV1 = {
    type: "denizen_updated",
    version: 1,
    data: { denizenId, previous: current, updated },
  };

  return { nextState: replaceWorld(state, world), events: [event] };
}

// ---------------------------------------------------------------------------
// Create Isle
// ---------------------------------------------------------------------------

export interface CreateIsleInput {
  readonly isleId: IsleId;
  readonly name: string;
  readonly description: string | null;
}

export function applyCreateIsleV5Candidate(
  state: CampaignStateV5,
  input: CreateIsleInput,
): IsleTransitionResult {
  if (!isValidIsleId(input.isleId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid isleId: ${input.isleId}`);
  }
  if (state.world.isles.some((i) => i.isleId === input.isleId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate isleId: ${input.isleId}`);
  }

  const isle: Isle = {
    isleId: input.isleId,
    name: normalizeName(input.name),
    description: normalizeDescription(input.description),
  };

  const world: SharedWorldState = {
    ...state.world,
    isles: [...state.world.isles, isle],
  };

  const event: IsleCreatedEventV1 = {
    type: "isle_created",
    version: 1,
    data: { isle },
  };

  return { nextState: replaceWorld(state, world), events: [event] };
}

// ---------------------------------------------------------------------------
// Update Isle
// ---------------------------------------------------------------------------

export interface UpdateIsleFields {
  readonly name?: ExpectedFieldChange<string>;
  readonly description?: ExpectedFieldChange<string | null>;
}

export function applyUpdateIsleV5Candidate(
  state: CampaignStateV5,
  isleId: IsleId,
  fields: UpdateIsleFields,
): IsleTransitionResult {
  if (fields.name === undefined && fields.description === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update must specify at least one field");
  }

  const idx = state.world.isles.findIndex((i) => i.isleId === isleId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Isle not found: ${isleId}`);
  }
  const current = state.world.isles[idx];

  let name = current.name;
  let description = current.description;

  if (fields.name !== undefined) {
    checkPrecondition("name", current.name, fields.name);
    name = normalizeName(fields.name.value);
  }
  if (fields.description !== undefined) {
    checkPrecondition("description", current.description, fields.description);
    description = normalizeDescription(fields.description.value);
  }

  const updated: Isle = { isleId, name, description };

  if (updated.name === current.name && updated.description === current.description) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }

  const isles = [...state.world.isles];
  isles[idx] = updated;
  const world: SharedWorldState = { ...state.world, isles };

  const event: IsleUpdatedEventV1 = {
    type: "isle_updated",
    version: 1,
    data: { isleId, previous: current, updated },
  };

  return { nextState: replaceWorld(state, world), events: [event] };
}

// ---------------------------------------------------------------------------
// Create Place
// ---------------------------------------------------------------------------

export interface CreatePlaceInput {
  readonly placeId: PlaceId;
  readonly name: string;
  readonly description: string | null;
  readonly placement: WorldPlacePlacement;
}

export function applyCreatePlaceV5Candidate(
  state: CampaignStateV5,
  input: CreatePlaceInput,
): PlaceTransitionResult {
  if (!isValidPlaceId(input.placeId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid placeId: ${input.placeId}`);
  }
  if (state.world.places.some((p) => p.placeId === input.placeId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate placeId: ${input.placeId}`);
  }

  validatePlacementIsleRef(input.placement, state.world);

  const place: WorldPlace = {
    placeId: input.placeId,
    name: normalizeName(input.name),
    description: normalizeDescription(input.description),
    placement: input.placement,
  };

  const world: SharedWorldState = {
    ...state.world,
    places: [...state.world.places, place],
  };

  const event: PlaceCreatedEventV1 = {
    type: "place_created",
    version: 1,
    data: { place },
  };

  return { nextState: replaceWorld(state, world), events: [event] };
}

// ---------------------------------------------------------------------------
// Update Place
// ---------------------------------------------------------------------------

export interface UpdatePlaceFields {
  readonly name?: ExpectedFieldChange<string>;
  readonly description?: ExpectedFieldChange<string | null>;
  readonly placement?: ExpectedFieldChange<WorldPlacePlacement>;
}

export function applyUpdatePlaceV5Candidate(
  state: CampaignStateV5,
  placeId: PlaceId,
  fields: UpdatePlaceFields,
): PlaceTransitionResult {
  if (fields.name === undefined && fields.description === undefined && fields.placement === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update must specify at least one field");
  }

  const idx = state.world.places.findIndex((p) => p.placeId === placeId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Place not found: ${placeId}`);
  }
  const current = state.world.places[idx];

  let name = current.name;
  let description = current.description;
  let placement = current.placement;

  if (fields.name !== undefined) {
    checkPrecondition("name", current.name, fields.name);
    name = normalizeName(fields.name.value);
  }
  if (fields.description !== undefined) {
    checkPrecondition("description", current.description, fields.description);
    description = normalizeDescription(fields.description.value);
  }
  if (fields.placement !== undefined) {
    checkPrecondition("placement", current.placement, fields.placement, placementsEqual);
    placement = fields.placement.value;
  }

  if (placement !== current.placement) {
    validatePlacementIsleRef(placement, state.world);
  }

  const updated: WorldPlace = { placeId, name, description, placement };

  if (
    updated.name === current.name &&
    updated.description === current.description &&
    placementsEqual(updated.placement, current.placement)
  ) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Update produces no change");
  }

  const places = [...state.world.places];
  places[idx] = updated;
  const world: SharedWorldState = { ...state.world, places };

  const event: PlaceUpdatedEventV1 = {
    type: "place_updated",
    version: 1,
    data: { placeId, previous: current, updated },
  };

  return { nextState: replaceWorld(state, world), events: [event] };
}
