import type { CampaignStateV5 } from "./campaign-state";
import type { IsleId, PlaceId } from "./ids";
import { isValidIsleId, isValidPlaceId } from "./ids";
import { DomainError } from "./errors";
import type { PactSeatId } from "./pact-seats";
import { PACT_SEAT_IDS } from "./pact-seats";
import type { HierophantEvent, MarinerEvent } from "./events";
import type { MarinerBoardIsleId } from "./mariner-catalogs";
import {
  MARINER_BOARD_ISLE_DEFINITIONS,
  MARINER_BOARD_ISLE_IDS,
  isValidMarinerBoardIsleId,
} from "./mariner-catalogs";
import type { HierophantStartingTempleId } from "./hierophant-catalogs";
import {
  HIEROPHANT_STARTING_TEMPLE_IDS,
  hierophantStartingTempleDisplayName,
  isValidHierophantStartingTempleId,
} from "./hierophant-catalogs";
import {
  applyCreateIsleV5Candidate,
  applyCreatePlaceV5Candidate,
} from "./world-subject-transitions";
import {
  applySetWizardHomeIsleV5Candidate,
  applySetWizardSanctumV5Candidate,
} from "./world-relationship-transitions";
import type { InitializeMarinerInput, MarinerIsleBinding, MarinerTransitionResult } from "./mariner-transitions";
import {
  applyInitializeMariner,
  canonicalizeInitializeMarinerInput,
} from "./mariner-transitions";
import type {
  InitializeHierophantInput,
  HierophantTransitionResult,
  TemplePlaceBinding,
} from "./hierophant-transitions";
import { applyInitializeHierophant } from "./hierophant-transitions";

/**
 * Canonical setting realization
 *
 * SOURCE: Draft-4 Codices/Materials establish the fifteen named Mariner map
 * Isles, the five Hierophant Temples including Hestar, and ordinary Wizard
 * homes/Sanctums as fixed setting locations. The Mariner's starting Ship is
 * his private Sanctum.
 *
 * INFERENCE: those concepts should exist as campaign World entities without
 * the table first manufacturing generic Places or Isles.
 *
 * APPLICATION DESIGN: this helper realizes or reuses World Isles/Places for
 * the concrete Wizard-home, Mariner, and Hierophant consumers only. Identity
 * uses existing typed references:
 * - Mariner `boardIsleId` → `worldIsleId`
 * - Wizard `homeIsleId` / `sanctumPlaceId`
 * - Hierophant `templeId` → `placeId`
 *
 * Catalog display names are used only as create-payload text. They are never
 * an identity rule. Contradictory authoritative bindings fail closed. This
 * module does not add CampaignState fields, sourceEntityId, or a global
 * source-entity registry.
 */

export const PACT_SEAT_HOME_BOARD_ISLE: Record<PactSeatId, MarinerBoardIsleId> = {
  necromancer: "graven_isle",
  hierophant: "ishana",
  warlock: "halcyon_isles",
  mariner: "far_reach",
  faustian: "scuttleport",
  sage: "sage_atoll",
  sorcerer: "spyrholm",
};

export interface ProposedBoardIsleId {
  readonly boardIsleId: MarinerBoardIsleId;
  readonly worldIsleId: IsleId;
}

export interface ProposedTemplePlaceId {
  readonly templeId: HierophantStartingTempleId;
  readonly placeId: PlaceId;
}

export interface InitializeMarinerSourceSetupInput {
  readonly arrangementId: InitializeMarinerInput["arrangementId"];
  readonly selectedLawOfSeaIds: InitializeMarinerInput["selectedLawOfSeaIds"];
  readonly arrangementBeasts: InitializeMarinerInput["arrangementBeasts"];
  readonly rarityDescriptions: InitializeMarinerInput["rarityDescriptions"];
  readonly proposedIsleIds: readonly ProposedBoardIsleId[];
  readonly proposedShipPlaceId: PlaceId;
}

export interface InitializeHierophantSourceSetupInput {
  readonly selectedFlameLawIds: InitializeHierophantInput["selectedFlameLawIds"];
  readonly proposedTemplePlaceIds: readonly ProposedTemplePlaceId[];
}

export interface CanonicalBoardIsleRealization {
  readonly nextState: CampaignStateV5;
  readonly bindings: readonly MarinerIsleBinding[];
}

export interface CanonicalTempleRealization {
  readonly nextState: CampaignStateV5;
  readonly bindings: readonly TemplePlaceBinding[];
}

function boardIsleDisplayName(boardIsleId: MarinerBoardIsleId): string {
  return MARINER_BOARD_ISLE_DEFINITIONS.find((entry) => entry.boardIsleId === boardIsleId)?.displayName
    ?? boardIsleId;
}

function compareTempleId(a: { templeId: string }, b: { templeId: string }): number {
  if (a.templeId < b.templeId) return -1;
  if (a.templeId > b.templeId) return 1;
  return 0;
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

function seatsForBoardIsle(boardIsleId: MarinerBoardIsleId): PactSeatId[] {
  return PACT_SEAT_IDS.filter((seatId) => PACT_SEAT_HOME_BOARD_ISLE[seatId] === boardIsleId);
}

function wizardForSeat(state: CampaignStateV5, seatId: PactSeatId) {
  const wizardId = state.pactSeats[seatId].wizardId;
  if (wizardId === null) return null;
  return state.wizards.find((wizard) => wizard.wizardId === wizardId) ?? null;
}

/**
 * Resolve the already-authoritative World Isle for a board slot.
 * Uses Mariner board bindings and seated Wizard home references only.
 */
export function authoritativeWorldIsleForBoardSlot(
  state: CampaignStateV5,
  boardIsleId: MarinerBoardIsleId,
): IsleId | null {
  const candidates: IsleId[] = [];
  const bound = state.mariner.boardIsles.find((isle) => isle.boardIsleId === boardIsleId)?.worldIsleId;
  if (bound !== undefined) {
    candidates.push(bound);
  }
  for (const seatId of seatsForBoardIsle(boardIsleId)) {
    const wizard = wizardForSeat(state, seatId);
    if (wizard?.homeIsleId !== null && wizard?.homeIsleId !== undefined) {
      candidates.push(wizard.homeIsleId);
    }
  }
  const unique = [...new Set(candidates)];
  if (unique.length > 1) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Contradictory authoritative World Isle bindings for board Isle ${boardIsleId}`,
    );
  }
  return unique[0] ?? null;
}

export function authoritativePlaceForTemple(
  state: CampaignStateV5,
  templeId: HierophantStartingTempleId,
): PlaceId | null {
  return state.hierophant.temples.find((temple) => temple.templeId === templeId)?.placeId ?? null;
}

export function realizeCanonicalBoardIsles(
  state: CampaignStateV5,
  proposedIsleIds: readonly ProposedBoardIsleId[],
): CanonicalBoardIsleRealization {
  if (proposedIsleIds.length !== MARINER_BOARD_ISLE_IDS.length) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Canonical Mariner geography requires a proposed World Isle id for each board Isle (${MARINER_BOARD_ISLE_IDS.length})`,
    );
  }
  uniqueOrThrow(proposedIsleIds.map((entry) => entry.boardIsleId), "board Isle id");
  uniqueOrThrow(proposedIsleIds.map((entry) => entry.worldIsleId), "proposed World Isle id");

  const proposedBySlot = {} as Record<MarinerBoardIsleId, IsleId>;
  for (const entry of proposedIsleIds) {
    if (!isValidMarinerBoardIsleId(entry.boardIsleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown board Isle id: ${entry.boardIsleId}`);
    }
    if (!isValidIsleId(entry.worldIsleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid worldIsleId: ${entry.worldIsleId}`);
    }
    proposedBySlot[entry.boardIsleId] = entry.worldIsleId;
  }
  for (const boardIsleId of MARINER_BOARD_ISLE_IDS) {
    if (proposedBySlot[boardIsleId] === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Missing proposed World Isle id for board Isle ${boardIsleId}`);
    }
  }

  let nextState = state;
  const assigned = new Map<IsleId, MarinerBoardIsleId>();
  const bindings: MarinerIsleBinding[] = [];

  for (const boardIsleId of MARINER_BOARD_ISLE_IDS) {
    const authoritative = authoritativeWorldIsleForBoardSlot(nextState, boardIsleId);
    const proposed = proposedBySlot[boardIsleId];
    const chosen = authoritative ?? (
      nextState.world.isles.some((isle) => isle.isleId === proposed) ? proposed : null
    );
    let worldIsleId: IsleId;
    if (chosen !== null) {
      worldIsleId = chosen;
    } else {
      const created = applyCreateIsleV5Candidate(nextState, {
        isleId: proposed,
        name: boardIsleDisplayName(boardIsleId),
        description: null,
      });
      nextState = created.nextState;
      worldIsleId = proposed;
    }
    const already = assigned.get(worldIsleId);
    if (already !== undefined && already !== boardIsleId) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Contradictory canonical board Isle bindings: ${already} and ${boardIsleId} cannot share World Isle ${worldIsleId}`,
      );
    }
    assigned.set(worldIsleId, boardIsleId);
    bindings.push({ boardIsleId, worldIsleId });
  }

  return { nextState, bindings };
}

export function realizeCanonicalTemplePlaces(
  state: CampaignStateV5,
  proposedTemplePlaceIds: readonly ProposedTemplePlaceId[],
): CanonicalTempleRealization {
  if (proposedTemplePlaceIds.length !== HIEROPHANT_STARTING_TEMPLE_IDS.length) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Canonical Hierophant Temples require a proposed Place id for each starting Temple (${HIEROPHANT_STARTING_TEMPLE_IDS.length})`,
    );
  }
  uniqueOrThrow(proposedTemplePlaceIds.map((entry) => entry.templeId), "starting Temple id");
  uniqueOrThrow(proposedTemplePlaceIds.map((entry) => entry.placeId), "proposed Temple Place id");

  const proposedByTemple = {} as Record<HierophantStartingTempleId, PlaceId>;
  for (const entry of proposedTemplePlaceIds) {
    if (!isValidHierophantStartingTempleId(entry.templeId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown starting Temple id: ${entry.templeId}`);
    }
    if (!isValidPlaceId(entry.placeId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Temple placeId: ${entry.placeId}`);
    }
    proposedByTemple[entry.templeId] = entry.placeId;
  }

  let nextState = state;
  const assigned = new Map<PlaceId, HierophantStartingTempleId>();
  const bindings: TemplePlaceBinding[] = [];

  for (const templeId of HIEROPHANT_STARTING_TEMPLE_IDS) {
    const proposed = proposedByTemple[templeId];
    if (proposed === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Missing proposed Place id for Temple ${templeId}`);
    }
    const authoritative = authoritativePlaceForTemple(nextState, templeId);
    const chosen = authoritative ?? (
      nextState.world.places.some((place) => place.placeId === proposed) ? proposed : null
    );
    let placeId: PlaceId;
    if (chosen !== null) {
      placeId = chosen;
    } else {
      const created = applyCreatePlaceV5Candidate(nextState, {
        placeId: proposed,
        name: hierophantStartingTempleDisplayName(templeId),
        description: null,
        placement: { kind: "unspecified" },
      });
      nextState = created.nextState;
      placeId = proposed;
    }
    const already = assigned.get(placeId);
    if (already !== undefined && already !== templeId) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Contradictory Temple Place bindings: ${already} and ${templeId} cannot share Place ${placeId}`,
      );
    }
    assigned.set(placeId, templeId);
    bindings.push({ templeId, placeId });
  }

  return { nextState, bindings };
}

function realizeMarinerStartingShip(
  state: CampaignStateV5,
  proposedShipPlaceId: PlaceId,
): { nextState: CampaignStateV5; shipPlaceId: PlaceId } {
  if (!isValidPlaceId(proposedShipPlaceId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid shipPlaceId: ${proposedShipPlaceId}`);
  }
  const marinerWizardId = state.pactSeats.mariner.wizardId;
  const wizard = marinerWizardId === null
    ? null
    : state.wizards.find((entry) => entry.wizardId === marinerWizardId) ?? null;
  if (marinerWizardId !== null && wizard === null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Mariner seat wizard does not resolve: ${marinerWizardId}`);
  }

  const existingSanctumId = wizard?.sanctumPlaceId ?? null;
  const candidateId = existingSanctumId ?? (
    state.world.places.some((place) => place.placeId === proposedShipPlaceId)
      ? proposedShipPlaceId
      : null
  );

  let nextState = state;
  let shipPlaceId: PlaceId;
  if (candidateId !== null) {
    const place = nextState.world.places.find((entry) => entry.placeId === candidateId);
    if (place === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `shipPlaceId does not resolve: ${candidateId}`);
    }
    if (place.placement.kind !== "mobile") {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        "Mariner starting Ship/Sanctum must be a mobile Place",
      );
    }
    shipPlaceId = candidateId;
  } else {
    const created = applyCreatePlaceV5Candidate(nextState, {
      placeId: proposedShipPlaceId,
      name: "The Mariner's Ship",
      description: null,
      placement: { kind: "mobile", associatedIsleId: null },
    });
    nextState = created.nextState;
    shipPlaceId = proposedShipPlaceId;
  }

  if (wizard !== null && wizard.sanctumPlaceId !== shipPlaceId) {
    const updated = applySetWizardSanctumV5Candidate(nextState, wizard.wizardId, {
      expected: wizard.sanctumPlaceId,
      value: shipPlaceId,
    });
    nextState = updated.nextState;
  }

  return { nextState, shipPlaceId };
}

function realizeSeatedWizardHomes(
  state: CampaignStateV5,
  bindings: readonly MarinerIsleBinding[],
): CampaignStateV5 {
  const bySlot = new Map(bindings.map((binding) => [binding.boardIsleId, binding.worldIsleId]));
  let nextState = state;
  for (const seatId of PACT_SEAT_IDS) {
    const wizard = wizardForSeat(nextState, seatId);
    if (wizard === null) continue;
    const boardIsleId = PACT_SEAT_HOME_BOARD_ISLE[seatId];
    const worldIsleId = bySlot.get(boardIsleId);
    if (worldIsleId === undefined) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Missing realized World Isle for ${seatId} home board Isle ${boardIsleId}`,
      );
    }
    if (wizard.homeIsleId === worldIsleId) continue;
    if (wizard.homeIsleId !== null) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Contradictory Wizard home Isle for ${seatId}: existing ${wizard.homeIsleId} is not the canonical World Isle ${worldIsleId}`,
      );
    }
    const updated = applySetWizardHomeIsleV5Candidate(nextState, wizard.wizardId, {
      expected: null,
      value: worldIsleId,
    });
    nextState = updated.nextState;
  }
  return nextState;
}

export function canonicalizeInitializeMarinerSourceSetupInput(
  input: InitializeMarinerSourceSetupInput,
): InitializeMarinerSourceSetupInput {
  const canonicalCore = canonicalizeInitializeMarinerInput({
    arrangementId: input.arrangementId,
    shipPlaceId: input.proposedShipPlaceId,
    selectedLawOfSeaIds: input.selectedLawOfSeaIds,
    isleBindings: input.proposedIsleIds.map((entry) => ({
      boardIsleId: entry.boardIsleId,
      worldIsleId: entry.worldIsleId,
    })),
    arrangementBeasts: input.arrangementBeasts,
    rarityDescriptions: input.rarityDescriptions,
  });
  return {
    arrangementId: canonicalCore.arrangementId,
    selectedLawOfSeaIds: canonicalCore.selectedLawOfSeaIds,
    arrangementBeasts: canonicalCore.arrangementBeasts,
    rarityDescriptions: canonicalCore.rarityDescriptions,
    proposedIsleIds: canonicalCore.isleBindings.map((binding) => ({
      boardIsleId: binding.boardIsleId,
      worldIsleId: binding.worldIsleId,
    })),
    proposedShipPlaceId: canonicalCore.shipPlaceId,
  };
}

export function canonicalizeInitializeHierophantSourceSetupInput(
  input: InitializeHierophantSourceSetupInput,
): InitializeHierophantSourceSetupInput {
  return {
    selectedFlameLawIds: [...input.selectedFlameLawIds],
    proposedTemplePlaceIds: [...input.proposedTemplePlaceIds]
      .map((entry) => ({ ...entry }))
      .sort(compareTempleId),
  };
}

export function applyInitializeMarinerSourceSetup(
  state: CampaignStateV5,
  rawInput: InitializeMarinerSourceSetupInput,
): MarinerTransitionResult {
  const input = canonicalizeInitializeMarinerSourceSetupInput(rawInput);
  const geography = realizeCanonicalBoardIsles(state, input.proposedIsleIds);
  const ship = realizeMarinerStartingShip(geography.nextState, input.proposedShipPlaceId);
  const withHomes = realizeSeatedWizardHomes(ship.nextState, geography.bindings);
  const initialized = applyInitializeMariner(withHomes, {
    arrangementId: input.arrangementId,
    shipPlaceId: ship.shipPlaceId,
    selectedLawOfSeaIds: input.selectedLawOfSeaIds,
    isleBindings: geography.bindings,
    arrangementBeasts: input.arrangementBeasts,
    rarityDescriptions: input.rarityDescriptions,
  });
  return {
    nextState: initialized.nextState,
    events: initialized.events.filter((event): event is MarinerEvent => event.type === "mariner_initialized"),
  };
}

export function applyInitializeHierophantSourceSetup(
  state: CampaignStateV5,
  rawInput: InitializeHierophantSourceSetupInput,
): HierophantTransitionResult {
  const input = canonicalizeInitializeHierophantSourceSetupInput(rawInput);
  const temples = realizeCanonicalTemplePlaces(state, input.proposedTemplePlaceIds);
  const initialized = applyInitializeHierophant(temples.nextState, {
    selectedFlameLawIds: input.selectedFlameLawIds,
    templePlaces: temples.bindings,
  });
  return {
    nextState: initialized.nextState,
    events: initialized.events.filter((event): event is HierophantEvent => event.type === "hierophant_initialized"),
  };
}
