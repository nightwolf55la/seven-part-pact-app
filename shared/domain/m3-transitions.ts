import type { CurrentCampaignState, CampaignPlayer, CampaignWizard, PactSeatState, PactSeatStatus } from "./campaign-state";
import type { PlayerId, WizardId } from "./ids";
import type { PactSeatId } from "./pact-seats";
import type { AgeDefinitionId } from "./ages";
import type { MonthOrdinal } from "./calendar";
import type { MovablePlanetId, CentidegreePosition } from "./orrery";
import type {
  CampaignEvent,
  PlayerAddedEventV1,
  PlayerRenamedEventV1,
  PlayerRemovedEventV1,
  CampaignAgeChangedEventV1,
  FacilitatorAssignmentChangedEventV1,
  WizardCreatedEventV1,
  WizardNameChangedEventV1,
  WizardPortrayalChangedEventV1,
  PactSeatWizardChangedEventV1,
  PactSeatStatusChangedEventV1,
  WatcherAssignmentChangedEventV1,
  SetupMonthChangedEventV1,
  SetupOrreryPositionChangedEventV1,
} from "./events";
import { PACT_SEAT_IDS, isValidPactSeatId } from "./pact-seats";
import { isValidAgeDefinitionId } from "./ages";
import { MOVABLE_PLANET_IDS, legalPositionsForPlanet } from "./orrery";
import { DomainError } from "./errors";

export interface TransitionResult {
  readonly nextState: CurrentCampaignState;
  readonly events: readonly CampaignEvent[];
}

function findPlayer(state: CurrentCampaignState, playerId: PlayerId): CampaignPlayer | undefined {
  return state.players.find((p) => p.playerId === playerId);
}

function findWizard(state: CurrentCampaignState, wizardId: WizardId): CampaignWizard | undefined {
  return state.wizards.find((w) => w.wizardId === wizardId);
}

function isPlayerReferenced(state: CurrentCampaignState, playerId: PlayerId): string | null {
  if (state.configuration.facilitatorPlayerId === playerId) {
    return "facilitator";
  }
  for (const seatId of PACT_SEAT_IDS) {
    const seat = state.pactSeats[seatId];
    if (seat.watcherPlayerId === playerId) {
      return `watcher for ${seatId}`;
    }
  }
  for (const wizard of state.wizards) {
    if (wizard.portrayedByPlayerId === playerId) {
      return `portraying wizard ${wizard.wizardId}`;
    }
  }
  return null;
}

function replaceSeat(
  state: CurrentCampaignState,
  seatId: PactSeatId,
  update: Partial<PactSeatState>,
): CurrentCampaignState["pactSeats"] {
  const seats = { ...state.pactSeats };
  seats[seatId] = { ...seats[seatId], ...update };
  return seats;
}

// --- Add Player ---

export function applyAddPlayer(
  state: CurrentCampaignState,
  playerId: PlayerId,
  name: string,
): TransitionResult {
  if (name.trim().length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Player name must not be empty");
  }
  if (findPlayer(state, playerId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Player already exists: ${playerId}`);
  }

  const newPlayer: CampaignPlayer = { playerId, name: name.trim() };
  const nextState: CurrentCampaignState = {
    ...state,
    players: [...state.players, newPlayer],
  };

  const event: PlayerAddedEventV1 = {
    type: "player_added",
    version: 1,
    data: { playerId, name: newPlayer.name },
  };

  return { nextState, events: [event] };
}

// --- Rename Player ---

export function applyRenamePlayer(
  state: CurrentCampaignState,
  playerId: PlayerId,
  newName: string,
): TransitionResult {
  if (newName.trim().length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Player name must not be empty");
  }
  const player = findPlayer(state, playerId);
  if (!player) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Player not found: ${playerId}`);
  }

  const trimmedName = newName.trim();
  const nextState: CurrentCampaignState = {
    ...state,
    players: state.players.map((p) =>
      p.playerId === playerId ? { ...p, name: trimmedName } : p,
    ),
  };

  const event: PlayerRenamedEventV1 = {
    type: "player_renamed",
    version: 1,
    data: { playerId, previousName: player.name, newName: trimmedName },
  };

  return { nextState, events: [event] };
}

// --- Remove Player ---

export function applyRemovePlayer(
  state: CurrentCampaignState,
  playerId: PlayerId,
): TransitionResult {
  const player = findPlayer(state, playerId);
  if (!player) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Player not found: ${playerId}`);
  }

  const ref = isPlayerReferenced(state, playerId);
  if (ref !== null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Cannot remove player "${player.name}": still referenced as ${ref}`);
  }

  const nextState: CurrentCampaignState = {
    ...state,
    players: state.players.filter((p) => p.playerId !== playerId),
  };

  const event: PlayerRemovedEventV1 = {
    type: "player_removed",
    version: 1,
    data: { playerId, name: player.name },
  };

  return { nextState, events: [event] };
}

// --- Set Campaign Age ---

export function applySetCampaignAge(
  state: CurrentCampaignState,
  ageId: AgeDefinitionId | null,
): TransitionResult {
  if (state.lifecycle.kind !== "setup") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "set_campaign_age is only allowed during Setup");
  }
  if (ageId !== null && !isValidAgeDefinitionId(ageId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid age id: ${ageId}`);
  }

  const previousAgeId = state.configuration.ageId;

  const nextState: CurrentCampaignState = {
    ...state,
    configuration: { ...state.configuration, ageId },
  };

  const event: CampaignAgeChangedEventV1 = {
    type: "campaign_age_changed",
    version: 1,
    data: { previousAgeId, newAgeId: ageId },
  };

  return { nextState, events: [event] };
}

// --- Set Facilitator ---

export function applySetFacilitator(
  state: CurrentCampaignState,
  playerId: PlayerId | null,
): TransitionResult {
  if (state.lifecycle.kind !== "setup") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "set_facilitator is only allowed during Setup");
  }
  if (playerId !== null && !findPlayer(state, playerId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Player not found: ${playerId}`);
  }

  const previousPlayerId = state.configuration.facilitatorPlayerId;

  const nextState: CurrentCampaignState = {
    ...state,
    configuration: { ...state.configuration, facilitatorPlayerId: playerId },
  };

  const event: FacilitatorAssignmentChangedEventV1 = {
    type: "facilitator_assignment_changed",
    version: 1,
    data: { previousPlayerId, newPlayerId: playerId },
  };

  return { nextState, events: [event] };
}

// --- Create Wizard ---

export function applyCreateWizard(
  state: CurrentCampaignState,
  wizardId: WizardId,
  name: string,
  portrayedByPlayerId: PlayerId | null,
  seatId: PactSeatId,
): TransitionResult {
  if (name.trim().length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Wizard name must not be empty");
  }
  if (!isValidPactSeatId(seatId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid seat id: ${seatId}`);
  }
  if (findWizard(state, wizardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Wizard already exists: ${wizardId}`);
  }
  if (portrayedByPlayerId !== null && !findPlayer(state, portrayedByPlayerId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Player not found: ${portrayedByPlayerId}`);
  }

  const seat = state.pactSeats[seatId];
  if (seat.wizardId !== null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Seat ${seatId} already has an assigned wizard; unassign first`);
  }

  if (portrayedByPlayerId !== null) {
    for (const sid of PACT_SEAT_IDS) {
      const s = state.pactSeats[sid];
      if (s.wizardId !== null) {
        const w = findWizard(state, s.wizardId as WizardId);
        if (w && w.portrayedByPlayerId === portrayedByPlayerId) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Player "${portrayedByPlayerId}" already portrays a current wizard in seat ${sid}`);
        }
      }
    }
  }

  const trimmedName = name.trim();
  const newWizard: CampaignWizard = { wizardId, name: trimmedName, portrayedByPlayerId };
  const nextState: CurrentCampaignState = {
    ...state,
    wizards: [...state.wizards, newWizard],
    pactSeats: replaceSeat(state, seatId, { wizardId }),
  };

  const createdEvent: WizardCreatedEventV1 = {
    type: "wizard_created",
    version: 1,
    data: { wizardId, name: trimmedName, portrayedByPlayerId, assignedToSeatId: seatId },
  };

  const seatAssignedEvent: PactSeatWizardChangedEventV1 = {
    type: "pact_seat_wizard_changed",
    version: 1,
    data: { seatId, previousWizardId: null, newWizardId: wizardId },
  };

  return { nextState, events: [createdEvent, seatAssignedEvent] };
}

// --- Rename Wizard ---

export function applyRenameWizard(
  state: CurrentCampaignState,
  wizardId: WizardId,
  newName: string,
): TransitionResult {
  if (newName.trim().length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Wizard name must not be empty");
  }
  const wizard = findWizard(state, wizardId);
  if (!wizard) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Wizard not found: ${wizardId}`);
  }

  const trimmedName = newName.trim();
  const nextState: CurrentCampaignState = {
    ...state,
    wizards: state.wizards.map((w) =>
      w.wizardId === wizardId ? { ...w, name: trimmedName } : w,
    ),
  };

  const event: WizardNameChangedEventV1 = {
    type: "wizard_name_changed",
    version: 1,
    data: { wizardId, previousName: wizard.name, newName: trimmedName },
  };

  return { nextState, events: [event] };
}

// --- Set Wizard Portrayal ---

export function applySetWizardPortrayal(
  state: CurrentCampaignState,
  wizardId: WizardId,
  playerId: PlayerId | null,
): TransitionResult {
  const wizard = findWizard(state, wizardId);
  if (!wizard) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Wizard not found: ${wizardId}`);
  }
  if (playerId !== null && !findPlayer(state, playerId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Player not found: ${playerId}`);
  }

  if (playerId !== null) {
    const isCurrentlyAssigned = PACT_SEAT_IDS.some((s) => state.pactSeats[s].wizardId === wizardId);
    if (isCurrentlyAssigned) {
      for (const sid of PACT_SEAT_IDS) {
        const s = state.pactSeats[sid];
        if (s.wizardId !== null && s.wizardId !== wizardId) {
          const w = findWizard(state, s.wizardId as WizardId);
          if (w && w.portrayedByPlayerId === playerId) {
            throw new DomainError("INVALID_CAMPAIGN_STATE", `Player "${playerId}" already portrays a current wizard in seat ${sid}`);
          }
        }
      }
    }
  }

  const previousPlayerId = wizard.portrayedByPlayerId;
  const nextState: CurrentCampaignState = {
    ...state,
    wizards: state.wizards.map((w) =>
      w.wizardId === wizardId ? { ...w, portrayedByPlayerId: playerId } : w,
    ),
  };

  const event: WizardPortrayalChangedEventV1 = {
    type: "wizard_portrayal_changed",
    version: 1,
    data: { wizardId, previousPlayerId, newPlayerId: playerId },
  };

  return { nextState, events: [event] };
}

// --- Set Pact Seat Wizard ---

export function applySetPactSeatWizard(
  state: CurrentCampaignState,
  seatId: PactSeatId,
  wizardId: WizardId | null,
): TransitionResult {
  if (!isValidPactSeatId(seatId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid seat id: ${seatId}`);
  }

  const seat = state.pactSeats[seatId];
  const previousWizardId = seat.wizardId;

  if (wizardId !== null) {
    const wizard = findWizard(state, wizardId);
    if (!wizard) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Wizard not found: ${wizardId}`);
    }
    for (const sid of PACT_SEAT_IDS) {
      if (sid !== seatId && state.pactSeats[sid].wizardId === wizardId) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Wizard "${wizardId}" is already assigned to seat ${sid}`);
      }
    }
    if (wizard.portrayedByPlayerId !== null) {
      for (const sid of PACT_SEAT_IDS) {
        if (sid !== seatId) {
          const s = state.pactSeats[sid];
          if (s.wizardId !== null) {
            const w = findWizard(state, s.wizardId as WizardId);
            if (w && w.portrayedByPlayerId === wizard.portrayedByPlayerId) {
              throw new DomainError("INVALID_CAMPAIGN_STATE", `Player "${wizard.portrayedByPlayerId}" already portrays a current wizard in seat ${sid}`);
            }
          }
        }
      }
    }
  }

  let newStatus = seat.status;
  if (wizardId === null && (seat.status === "present" || seat.status === "silent")) {
    newStatus = null;
  }

  const pactSeats = replaceSeat(state, seatId, { wizardId, status: newStatus });
  const nextState: CurrentCampaignState = { ...state, pactSeats };

  const events: CampaignEvent[] = [];
  events.push({
    type: "pact_seat_wizard_changed",
    version: 1,
    data: { seatId, previousWizardId, newWizardId: wizardId },
  } as PactSeatWizardChangedEventV1);

  if (newStatus !== seat.status) {
    events.push({
      type: "pact_seat_status_changed",
      version: 1,
      data: { seatId, previousStatus: seat.status, newStatus },
    } as PactSeatStatusChangedEventV1);
  }

  return { nextState, events };
}

// --- Set Pact Seat Status ---

export function applySetPactSeatStatus(
  state: CurrentCampaignState,
  seatId: PactSeatId,
  status: PactSeatStatus | null,
): TransitionResult {
  if (!isValidPactSeatId(seatId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid seat id: ${seatId}`);
  }

  const seat = state.pactSeats[seatId];

  if ((status === "present" || status === "silent") && seat.wizardId === null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Cannot set status "${status}" on seat ${seatId}: no wizard assigned`);
  }

  const previousStatus = seat.status;
  const nextState: CurrentCampaignState = {
    ...state,
    pactSeats: replaceSeat(state, seatId, { status }),
  };

  const event: PactSeatStatusChangedEventV1 = {
    type: "pact_seat_status_changed",
    version: 1,
    data: { seatId, previousStatus, newStatus: status },
  };

  return { nextState, events: [event] };
}

// --- Set Watcher ---

export function applySetWatcher(
  state: CurrentCampaignState,
  seatId: PactSeatId,
  playerId: PlayerId | null,
): TransitionResult {
  if (!isValidPactSeatId(seatId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid seat id: ${seatId}`);
  }
  if (playerId !== null && !findPlayer(state, playerId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Player not found: ${playerId}`);
  }

  const seat = state.pactSeats[seatId];
  const previousPlayerId = seat.watcherPlayerId;

  const nextState: CurrentCampaignState = {
    ...state,
    pactSeats: replaceSeat(state, seatId, { watcherPlayerId: playerId }),
  };

  const event: WatcherAssignmentChangedEventV1 = {
    type: "watcher_assignment_changed",
    version: 1,
    data: { seatId, previousPlayerId, newPlayerId: playerId },
  };

  return { nextState, events: [event] };
}

// --- M4: Set Setup Month ---

export function applySetSetupMonth(
  state: CurrentCampaignState,
  monthOrdinal: MonthOrdinal | null,
): TransitionResult {
  if (state.lifecycle.kind !== "setup") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "set_setup_month is only allowed during Setup");
  }

  if (monthOrdinal !== null) {
    if (!Number.isSafeInteger(monthOrdinal) || monthOrdinal < 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid monthOrdinal: ${monthOrdinal}`);
    }
  }

  const previousMonthOrdinal = state.calendar.monthOrdinal;

  const nextState: CurrentCampaignState = {
    ...state,
    calendar: { monthOrdinal },
  };

  const event: SetupMonthChangedEventV1 = {
    type: "setup_month_changed",
    version: 1,
    data: { previousMonthOrdinal, newMonthOrdinal: monthOrdinal },
  };

  return { nextState, events: [event] };
}

// --- M4: Set Setup Orrery Position ---

export function applySetSetupOrreryPosition(
  state: CurrentCampaignState,
  planetId: MovablePlanetId,
  positionIndex: number | null,
): TransitionResult {
  if (state.lifecycle.kind !== "setup") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "set_setup_orrery_position is only allowed during Setup");
  }

  if (!MOVABLE_PLANET_IDS.includes(planetId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid planetId: ${planetId}`);
  }

  let newPosition: CentidegreePosition | null;
  if (positionIndex === null) {
    newPosition = null;
  } else {
    if (!Number.isSafeInteger(positionIndex) || positionIndex < 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid positionIndex: ${positionIndex}`);
    }
    const legalPositions = legalPositionsForPlanet(planetId);
    if (positionIndex >= legalPositions.length) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `positionIndex ${positionIndex} out of range for planet ${planetId} (${legalPositions.length} legal positions)`);
    }
    newPosition = legalPositions[positionIndex];
  }

  const previousPosition = state.lifecycle.orrery[planetId];

  const newOrrery = { ...state.lifecycle.orrery, [planetId]: newPosition };
  const nextState: CurrentCampaignState = {
    ...state,
    lifecycle: { ...state.lifecycle, orrery: newOrrery },
  };

  const event: SetupOrreryPositionChangedEventV1 = {
    type: "setup_orrery_position_changed",
    version: 1,
    data: { planetId, previousPosition, newPosition },
  };

  return { nextState, events: [event] };
}
