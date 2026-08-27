import type { CampaignStateV2, CurrentCampaignState, AnyCampaignState, PactSeatStatus } from "./campaign-state";
import { CURRENT_STATE_SCHEMA_VERSION } from "./campaign-state";
import {
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
} from "./ruleset";
import { isValidPlayerId, isValidWizardId } from "./ids";
import { PACT_SEAT_IDS } from "./pact-seats";
import type { PactSeatId } from "./pact-seats";
import { isValidAgeDefinitionId } from "./ages";
import { DomainError } from "./errors";

const VALID_PACT_SEAT_STATUSES: readonly (PactSeatStatus | null)[] = [
  "present",
  "silent",
  "absent",
  null,
];

function validateRuleset(s: Record<string, unknown>): void {
  if (s.ruleset === null || s.ruleset === undefined || typeof s.ruleset !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Missing or invalid ruleset");
  }
  const ruleset = s.ruleset as Record<string, unknown>;
  if (ruleset.id !== SEVEN_PART_PACT_DRAFT4_ID) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Unsupported ruleset id: ${JSON.stringify(ruleset.id)}`,
    );
  }
  if (ruleset.version !== SEVEN_PART_PACT_DRAFT4_VERSION) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Unsupported ruleset version: ${JSON.stringify(ruleset.version)}`,
    );
  }
}

function validateCalendar(s: Record<string, unknown>): void {
  if (s.calendar === null || s.calendar === undefined || typeof s.calendar !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Missing or invalid calendar");
  }
  const calendar = s.calendar as Record<string, unknown>;
  if (typeof calendar.monthOrdinal !== "number" || !Number.isSafeInteger(calendar.monthOrdinal)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `monthOrdinal is not a safe integer: ${JSON.stringify(calendar.monthOrdinal)}`,
    );
  }
}

function validateV1Shape(s: Record<string, unknown>): void {
  validateRuleset(s);
  validateCalendar(s);
}

function validateV2Shape(s: Record<string, unknown>): void {
  validateRuleset(s);
  validateCalendar(s);

  if (s.configuration === null || s.configuration === undefined || typeof s.configuration !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Missing or invalid configuration");
  }
  const config = s.configuration as Record<string, unknown>;

  if (config.ageId !== null) {
    if (typeof config.ageId !== "string" || !isValidAgeDefinitionId(config.ageId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid ageId: ${JSON.stringify(config.ageId)}`);
    }
  }

  if (!Array.isArray(s.players)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "players must be an array");
  }

  if (!Array.isArray(s.wizards)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "wizards must be an array");
  }

  if (s.pactSeats === null || s.pactSeats === undefined || typeof s.pactSeats !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Missing or invalid pactSeats");
  }

  const players = s.players as unknown[];
  const wizards = s.wizards as unknown[];
  const pactSeats = s.pactSeats as Record<string, unknown>;

  const playerIds = new Set<string>();
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    if (p === null || p === undefined || typeof p !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `players[${i}] is not a valid object`);
    }
    const player = p as Record<string, unknown>;
    if (typeof player.playerId !== "string" || !isValidPlayerId(player.playerId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `players[${i}].playerId is invalid: ${JSON.stringify(player.playerId)}`);
    }
    if (typeof player.name !== "string" || player.name.length === 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `players[${i}].name must be a non-empty string`);
    }
    if (playerIds.has(player.playerId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate playerId: ${player.playerId}`);
    }
    playerIds.add(player.playerId);
  }

  const wizardIds = new Set<string>();
  for (let i = 0; i < wizards.length; i++) {
    const w = wizards[i];
    if (w === null || w === undefined || typeof w !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `wizards[${i}] is not a valid object`);
    }
    const wizard = w as Record<string, unknown>;
    if (typeof wizard.wizardId !== "string" || !isValidWizardId(wizard.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `wizards[${i}].wizardId is invalid: ${JSON.stringify(wizard.wizardId)}`);
    }
    if (typeof wizard.name !== "string" || wizard.name.length === 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `wizards[${i}].name must be a non-empty string`);
    }
    if (wizard.portrayedByPlayerId !== null) {
      if (typeof wizard.portrayedByPlayerId !== "string" || !isValidPlayerId(wizard.portrayedByPlayerId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `wizards[${i}].portrayedByPlayerId is invalid`);
      }
      if (!playerIds.has(wizard.portrayedByPlayerId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `wizards[${i}].portrayedByPlayerId "${wizard.portrayedByPlayerId}" does not reference an existing player`);
      }
    }
    if (wizardIds.has(wizard.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate wizardId: ${wizard.wizardId}`);
    }
    wizardIds.add(wizard.wizardId);
  }

  if (config.facilitatorPlayerId !== null) {
    if (typeof config.facilitatorPlayerId !== "string" || !isValidPlayerId(config.facilitatorPlayerId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid facilitatorPlayerId: ${JSON.stringify(config.facilitatorPlayerId)}`);
    }
    if (!playerIds.has(config.facilitatorPlayerId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `facilitatorPlayerId "${config.facilitatorPlayerId}" does not reference an existing player`);
    }
  }

  const seatKeys = Object.keys(pactSeats);
  if (seatKeys.length !== PACT_SEAT_IDS.length) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `pactSeats must have exactly ${PACT_SEAT_IDS.length} entries, got ${seatKeys.length}`);
  }
  for (const seatId of PACT_SEAT_IDS) {
    if (!(seatId in pactSeats)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Missing pact seat: ${seatId}`);
    }
  }
  for (const key of seatKeys) {
    if (!(PACT_SEAT_IDS as readonly string[]).includes(key)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown pact seat key: ${key}`);
    }
  }

  const assignedWizardIds = new Set<string>();
  const currentPortrayalMap = new Map<string, string>();

  for (const seatId of PACT_SEAT_IDS) {
    const seat = pactSeats[seatId];
    if (seat === null || seat === undefined || typeof seat !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `pactSeats.${seatId} is not a valid object`);
    }
    const s = seat as Record<string, unknown>;

    if (!VALID_PACT_SEAT_STATUSES.includes(s.status as PactSeatStatus | null)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `pactSeats.${seatId}.status is invalid: ${JSON.stringify(s.status)}`);
    }

    if (s.wizardId !== null) {
      if (typeof s.wizardId !== "string" || !isValidWizardId(s.wizardId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `pactSeats.${seatId}.wizardId is invalid`);
      }
      if (!wizardIds.has(s.wizardId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `pactSeats.${seatId}.wizardId "${s.wizardId}" does not reference an existing wizard`);
      }
      if (assignedWizardIds.has(s.wizardId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Wizard "${s.wizardId}" is assigned to multiple pact seats`);
      }
      assignedWizardIds.add(s.wizardId);

      const wizard = wizards.find((w) => (w as Record<string, unknown>).wizardId === s.wizardId) as Record<string, unknown>;
      if (wizard.portrayedByPlayerId !== null) {
        const existingSeat = currentPortrayalMap.get(wizard.portrayedByPlayerId as string);
        if (existingSeat !== undefined) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Player "${wizard.portrayedByPlayerId}" portrays current wizards in multiple seats: ${existingSeat} and ${seatId}`);
        }
        currentPortrayalMap.set(wizard.portrayedByPlayerId as string, seatId);
      }
    }

    if (s.watcherPlayerId !== null) {
      if (typeof s.watcherPlayerId !== "string" || !isValidPlayerId(s.watcherPlayerId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `pactSeats.${seatId}.watcherPlayerId is invalid`);
      }
      if (!playerIds.has(s.watcherPlayerId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `pactSeats.${seatId}.watcherPlayerId "${s.watcherPlayerId}" does not reference an existing player`);
      }
    }

    if (s.status === "present" && s.wizardId === null) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `pactSeats.${seatId}: status "present" requires a current wizard`);
    }
    if (s.status === "silent" && s.wizardId === null) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `pactSeats.${seatId}: status "silent" requires a current wizard`);
    }
  }
}

export function validateCampaignState(state: unknown): CurrentCampaignState {
  if (state === null || state === undefined || typeof state !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "State must be a non-null object");
  }

  const s = state as Record<string, unknown>;

  if (s.schemaVersion !== CURRENT_STATE_SCHEMA_VERSION) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Unsupported schemaVersion: ${JSON.stringify(s.schemaVersion)}`,
    );
  }

  validateV2Shape(s);
  return state as CurrentCampaignState;
}

export function validateAnyCampaignState(state: unknown): AnyCampaignState {
  if (state === null || state === undefined || typeof state !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "State must be a non-null object");
  }

  const s = state as Record<string, unknown>;

  if (s.schemaVersion === 1) {
    validateV1Shape(s);
    return state as AnyCampaignState;
  }
  if (s.schemaVersion === 2) {
    validateV2Shape(s);
    return state as AnyCampaignState;
  }

  throw new DomainError(
    "INVALID_CAMPAIGN_STATE",
    `Unsupported schemaVersion: ${JSON.stringify(s.schemaVersion)}`,
  );
}
