import type {
  CurrentCampaignState,
  AnyCampaignState,
  PactSeatStatus,
  LunarPhase,
} from "./campaign-state";
import { CURRENT_STATE_SCHEMA_VERSION, LUNAR_PHASES } from "./campaign-state";
import {
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
} from "./ruleset";
import {
  isValidPlayerId,
  isValidWizardId,
  isValidAllocationId,
  isValidEngagementId,
} from "./ids";
import { PACT_SEAT_IDS } from "./pact-seats";
import type { PactSeatId } from "./pact-seats";
import { isValidAgeDefinitionId } from "./ages";
import {
  isValidCentidegreePosition,
  MOVABLE_PLANET_IDS,
} from "./orrery";
import type { MovablePlanetId } from "./orrery";
import { ALLOCATION_RESOLUTIONS } from "./time-model";
import type { AllocationResolution } from "./time-model";
import { ENGAGEMENT_RESOLUTIONS, ENGAGEMENT_TARGET_KINDS } from "./engagement";
import type { EngagementResolution, EngagementTargetKind } from "./engagement";
import { TIME_DESTINATION_KINDS } from "./time-model";
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

function validateCalendarV3(s: Record<string, unknown>, lifecycleKind: string): void {
  if (s.calendar === null || s.calendar === undefined || typeof s.calendar !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Missing or invalid calendar");
  }
  const calendar = s.calendar as Record<string, unknown>;
  if (calendar.monthOrdinal === null) {
    if (lifecycleKind !== "setup") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "monthOrdinal must not be null in Play lifecycle");
    }
    return;
  }
  if (typeof calendar.monthOrdinal !== "number" || !Number.isSafeInteger(calendar.monthOrdinal)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `monthOrdinal is not a safe integer or null: ${JSON.stringify(calendar.monthOrdinal)}`,
    );
  }
}

function validatePlayersAndWizards(
  s: Record<string, unknown>,
): { playerIds: Set<string>; wizardIds: Set<string> } {
  if (!Array.isArray(s.players)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "players must be an array");
  }
  if (!Array.isArray(s.wizards)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "wizards must be an array");
  }

  const players = s.players as unknown[];
  const wizards = s.wizards as unknown[];

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

  return { playerIds, wizardIds };
}

function validateConfiguration(
  s: Record<string, unknown>,
  playerIds: Set<string>,
): void {
  if (s.configuration === null || s.configuration === undefined || typeof s.configuration !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Missing or invalid configuration");
  }
  const config = s.configuration as Record<string, unknown>;

  if (config.ageId !== null) {
    if (typeof config.ageId !== "string" || !isValidAgeDefinitionId(config.ageId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid ageId: ${JSON.stringify(config.ageId)}`);
    }
  }

  if (config.facilitatorPlayerId !== null) {
    if (typeof config.facilitatorPlayerId !== "string" || !isValidPlayerId(config.facilitatorPlayerId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid facilitatorPlayerId: ${JSON.stringify(config.facilitatorPlayerId)}`);
    }
    if (!playerIds.has(config.facilitatorPlayerId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `facilitatorPlayerId "${config.facilitatorPlayerId}" does not reference an existing player`);
    }
  }
}

function validatePactSeats(
  s: Record<string, unknown>,
  playerIds: Set<string>,
  wizardIds: Set<string>,
  wizards: unknown[],
): void {
  if (s.pactSeats === null || s.pactSeats === undefined || typeof s.pactSeats !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Missing or invalid pactSeats");
  }

  const pactSeats = s.pactSeats as Record<string, unknown>;
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
    const seatObj = seat as Record<string, unknown>;

    if (!VALID_PACT_SEAT_STATUSES.includes(seatObj.status as PactSeatStatus | null)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `pactSeats.${seatId}.status is invalid: ${JSON.stringify(seatObj.status)}`);
    }

    if (seatObj.wizardId !== null) {
      if (typeof seatObj.wizardId !== "string" || !isValidWizardId(seatObj.wizardId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `pactSeats.${seatId}.wizardId is invalid`);
      }
      if (!wizardIds.has(seatObj.wizardId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `pactSeats.${seatId}.wizardId "${seatObj.wizardId}" does not reference an existing wizard`);
      }
      if (assignedWizardIds.has(seatObj.wizardId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Wizard "${seatObj.wizardId}" is assigned to multiple pact seats`);
      }
      assignedWizardIds.add(seatObj.wizardId);

      const wizard = wizards.find((w) => (w as Record<string, unknown>).wizardId === seatObj.wizardId) as Record<string, unknown>;
      if (wizard.portrayedByPlayerId !== null) {
        const existingSeat = currentPortrayalMap.get(wizard.portrayedByPlayerId as string);
        if (existingSeat !== undefined) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `Player "${wizard.portrayedByPlayerId}" portrays current wizards in multiple seats: ${existingSeat} and ${seatId}`);
        }
        currentPortrayalMap.set(wizard.portrayedByPlayerId as string, seatId);
      }
    }

    if (seatObj.watcherPlayerId !== null) {
      if (typeof seatObj.watcherPlayerId !== "string" || !isValidPlayerId(seatObj.watcherPlayerId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `pactSeats.${seatId}.watcherPlayerId is invalid`);
      }
      if (!playerIds.has(seatObj.watcherPlayerId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `pactSeats.${seatId}.watcherPlayerId "${seatObj.watcherPlayerId}" does not reference an existing player`);
      }
    }

    if (seatObj.status === "present" && seatObj.wizardId === null) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `pactSeats.${seatId}: status "present" requires a current wizard`);
    }
    if (seatObj.status === "silent" && seatObj.wizardId === null) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `pactSeats.${seatId}: status "silent" requires a current wizard`);
    }
  }
}

function validateOrreryPositions(orrery: Record<string, unknown>, requireComplete: boolean): void {
  const allowedKeys = new Set<string>([...MOVABLE_PLANET_IDS]);
  for (const key of Object.keys(orrery)) {
    if (!allowedKeys.has(key)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `orrery contains unknown key: ${key}`);
    }
  }
  for (const planetId of MOVABLE_PLANET_IDS) {
    const val = orrery[planetId];
    if (val === null) {
      if (requireComplete) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Play lifecycle requires non-null orrery.${planetId}`);
      }
      continue;
    }
    if (typeof val !== "number" || !isValidCentidegreePosition(val)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `orrery.${planetId} is not a valid centidegree position: ${JSON.stringify(val)}`);
    }
  }
}

function validateTimeDestination(dest: Record<string, unknown>, path: string): void {
  const kind = dest.kind;
  if (typeof kind !== "string" || !(TIME_DESTINATION_KINDS as readonly string[]).includes(kind)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(kind)}`);
  }
  if (kind === "companion") {
    if (typeof dest.element !== "string" || dest.element.length === 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}: companion destination requires non-empty element`);
    }
  }
  if (kind === "engagement") {
    if (typeof dest.engagementId !== "string" || dest.engagementId.length === 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}: engagement destination requires non-empty engagementId`);
    }
  }
  if (kind === "special_use") {
    if (typeof dest.description !== "string" || dest.description.trim().length === 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}: special_use destination requires non-empty description`);
    }
    const allowed = new Set(["kind", "description"]);
    for (const key of Object.keys(dest)) {
      if (!allowed.has(key)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}: special_use destination has unknown field: ${key}`);
      }
    }
  }
}

function validateTimeParticipants(
  participants: unknown[],
  wizardIds: Set<string>,
  path: string,
): { allocationIds: Set<string>; allocationOwner: Map<string, string>; allocationDestination: Map<string, Record<string, unknown>> } {
  const allocationIds = new Set<string>();
  const allocationOwner = new Map<string, string>();
  const allocationDestination = new Map<string, Record<string, unknown>>();
  const seenWizardIds = new Set<string>();

  for (let i = 0; i < participants.length; i++) {
    const tp = participants[i];
    const tpPath = `${path}[${i}]`;
    if (tp === null || tp === undefined || typeof tp !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${tpPath} is not a valid object`);
    }
    const tpObj = tp as Record<string, unknown>;

    // participant ref
    if (tpObj.participant === null || tpObj.participant === undefined || typeof tpObj.participant !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${tpPath}.participant is not a valid object`);
    }
    const pRef = tpObj.participant as Record<string, unknown>;
    if (pRef.kind !== "wizard") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${tpPath}.participant.kind must be "wizard", got ${JSON.stringify(pRef.kind)}`);
    }
    if (typeof pRef.wizardId !== "string" || !isValidWizardId(pRef.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${tpPath}.participant.wizardId is invalid`);
    }
    if (!wizardIds.has(pRef.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${tpPath}.participant.wizardId "${pRef.wizardId}" does not reference an existing wizard`);
    }
    if (seenWizardIds.has(pRef.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${tpPath}: duplicate time participant wizardId "${pRef.wizardId}"`);
    }
    seenWizardIds.add(pRef.wizardId);

    // budgets
    if (typeof tpObj.effectiveBudget !== "number" || !Number.isSafeInteger(tpObj.effectiveBudget) || tpObj.effectiveBudget < 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${tpPath}.effectiveBudget must be a non-negative integer`);
    }
    if (typeof tpObj.rescheduleAllowance !== "number" || !Number.isSafeInteger(tpObj.rescheduleAllowance) || tpObj.rescheduleAllowance < 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${tpPath}.rescheduleAllowance must be a non-negative integer`);
    }
    if (typeof tpObj.reschedulesUsed !== "number" || !Number.isSafeInteger(tpObj.reschedulesUsed) || tpObj.reschedulesUsed < 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${tpPath}.reschedulesUsed must be a non-negative integer`);
    }
    if ((tpObj.reschedulesUsed as number) > (tpObj.rescheduleAllowance as number)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${tpPath}.reschedulesUsed (${tpObj.reschedulesUsed}) exceeds rescheduleAllowance (${tpObj.rescheduleAllowance})`);
    }

    // allocations
    if (!Array.isArray(tpObj.allocations)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${tpPath}.allocations must be an array`);
    }
    const allocs = tpObj.allocations as unknown[];
    for (let j = 0; j < allocs.length; j++) {
      const alloc = allocs[j];
      const allocPath = `${tpPath}.allocations[${j}]`;
      if (alloc === null || alloc === undefined || typeof alloc !== "object") {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${allocPath} is not a valid object`);
      }
      const allocObj = alloc as Record<string, unknown>;

      if (typeof allocObj.allocationId !== "string" || !isValidAllocationId(allocObj.allocationId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${allocPath}.allocationId is invalid`);
      }
      if (allocationIds.has(allocObj.allocationId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate allocationId: ${allocObj.allocationId}`);
      }
      allocationIds.add(allocObj.allocationId);
      allocationOwner.set(allocObj.allocationId, pRef.wizardId);
      if (allocObj.destination !== null && typeof allocObj.destination === "object") {
        allocationDestination.set(allocObj.allocationId, allocObj.destination as Record<string, unknown>);
      }

      if (allocObj.destination !== null) {
        if (typeof allocObj.destination !== "object") {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `${allocPath}.destination must be object or null`);
        }
        validateTimeDestination(allocObj.destination as Record<string, unknown>, `${allocPath}.destination`);
      }

      if (allocObj.note !== null && typeof allocObj.note !== "string") {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${allocPath}.note must be string or null`);
      }

      if (!(ALLOCATION_RESOLUTIONS as readonly string[]).includes(allocObj.resolution as string)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${allocPath}.resolution is invalid: ${JSON.stringify(allocObj.resolution)}`);
      }
    }
  }

  return { allocationIds, allocationOwner, allocationDestination };
}

function validateEngagements(
  engagements: unknown[],
  wizardIds: Set<string>,
  allocationIds: Set<string>,
  allocationOwner: Map<string, string>,
  allocationDestination: Map<string, Record<string, unknown>>,
  path: string,
): void {
  const engagementIds = new Set<string>();
  const linkedAllocations = new Set<string>();

  for (let i = 0; i < engagements.length; i++) {
    const eng = engagements[i];
    const engPath = `${path}[${i}]`;
    if (eng === null || eng === undefined || typeof eng !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${engPath} is not a valid object`);
    }
    const engObj = eng as Record<string, unknown>;

    if (typeof engObj.engagementId !== "string" || !isValidEngagementId(engObj.engagementId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${engPath}.engagementId is invalid`);
    }
    if (engagementIds.has(engObj.engagementId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate engagementId: ${engObj.engagementId}`);
    }
    engagementIds.add(engObj.engagementId);

    if (typeof engObj.actingWizardId !== "string" || !isValidWizardId(engObj.actingWizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${engPath}.actingWizardId is invalid`);
    }
    if (!wizardIds.has(engObj.actingWizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${engPath}.actingWizardId "${engObj.actingWizardId}" does not reference an existing wizard`);
    }

    if (engObj.target !== null) {
      if (typeof engObj.target !== "object") {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${engPath}.target must be object or null`);
      }
      const target = engObj.target as Record<string, unknown>;
      if (!(ENGAGEMENT_TARGET_KINDS as readonly string[]).includes(target.kind as string)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${engPath}.target.kind is invalid: ${JSON.stringify(target.kind)}`);
      }
      if (target.kind === "wizard") {
        if (typeof target.wizardId !== "string" || !isValidWizardId(target.wizardId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `${engPath}.target.wizardId is invalid`);
        }
        if (!wizardIds.has(target.wizardId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `${engPath}.target.wizardId "${target.wizardId}" does not reference an existing wizard`);
        }
      }
      if (target.kind === "named_character") {
        if (typeof target.name !== "string" || target.name.trim().length === 0) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `${engPath}.target.name must be non-empty for named_character`);
        }
      }
    }

    if (!(ENGAGEMENT_RESOLUTIONS as readonly string[]).includes(engObj.resolution as string)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${engPath}.resolution is invalid: ${JSON.stringify(engObj.resolution)}`);
    }

    if (engObj.linkedTimeAllocationId !== null) {
      if (typeof engObj.linkedTimeAllocationId !== "string" || !isValidAllocationId(engObj.linkedTimeAllocationId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${engPath}.linkedTimeAllocationId is invalid`);
      }
      if (!allocationIds.has(engObj.linkedTimeAllocationId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${engPath}.linkedTimeAllocationId "${engObj.linkedTimeAllocationId}" does not reference an existing allocation`);
      }
      const owner = allocationOwner.get(engObj.linkedTimeAllocationId);
      if (owner !== engObj.actingWizardId) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${engPath}.linkedTimeAllocationId does not belong to the acting wizard`);
      }
      if (linkedAllocations.has(engObj.linkedTimeAllocationId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${engPath}.linkedTimeAllocationId is linked by multiple engagements`);
      }
      linkedAllocations.add(engObj.linkedTimeAllocationId);
      const dest = allocationDestination.get(engObj.linkedTimeAllocationId);
      if (dest === undefined || dest.kind !== "engagement") {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${engPath}.linkedTimeAllocationId destination is not engagement`);
      }
      if (dest.engagementId !== engObj.engagementId) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${engPath}.linkedTimeAllocationId destination does not identify the same engagement`);
      }
    }
  }
}

function validateWizardmootAttendance(
  attendance: unknown[] | null,
  wizardIds: Set<string>,
  path: string,
): void {
  if (attendance === null) return;
  for (let i = 0; i < attendance.length; i++) {
    const entry = attendance[i];
    const entryPath = `${path}[${i}]`;
    if (entry === null || entry === undefined || typeof entry !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${entryPath} is not a valid object`);
    }
    const entryObj = entry as Record<string, unknown>;
    if (typeof entryObj.wizardId !== "string" || !isValidWizardId(entryObj.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${entryPath}.wizardId is invalid`);
    }
    if (!wizardIds.has(entryObj.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${entryPath}.wizardId "${entryObj.wizardId}" does not reference an existing wizard`);
    }
    if (typeof entryObj.attended !== "boolean") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${entryPath}.attended must be boolean`);
    }
    if (entryObj.exceptionReason !== null && typeof entryObj.exceptionReason !== "string") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${entryPath}.exceptionReason must be string or null`);
    }
  }
}

function validateWizardmootHistory(
  history: unknown[],
  wizardIds: Set<string>,
): void {
  const seenMonths = new Set<number>();
  for (let i = 0; i < history.length; i++) {
    const entry = history[i];
    const entryPath = `wizardmootHistory[${i}]`;
    if (entry === null || entry === undefined || typeof entry !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${entryPath} is not a valid object`);
    }
    const entryObj = entry as Record<string, unknown>;
    if (typeof entryObj.monthOrdinal !== "number" || !Number.isSafeInteger(entryObj.monthOrdinal)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${entryPath}.monthOrdinal is not a safe integer`);
    }
    if (seenMonths.has(entryObj.monthOrdinal as number)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${entryPath}: duplicate monthOrdinal ${entryObj.monthOrdinal}`);
    }
    seenMonths.add(entryObj.monthOrdinal as number);
    if (!Array.isArray(entryObj.attendance)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${entryPath}.attendance must be an array`);
    }
    for (let j = 0; j < (entryObj.attendance as unknown[]).length; j++) {
      const att = (entryObj.attendance as unknown[])[j];
      if (att === null || att === undefined || typeof att !== "object") {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${entryPath}.attendance[${j}] is not a valid object`);
      }
      const attObj = att as Record<string, unknown>;
      if (typeof attObj.wizardId !== "string" || !isValidWizardId(attObj.wizardId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${entryPath}.attendance[${j}].wizardId is invalid`);
      }
      if (!wizardIds.has(attObj.wizardId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${entryPath}.attendance[${j}].wizardId "${attObj.wizardId}" does not reference an existing wizard`);
      }
      if (typeof attObj.attended !== "boolean") {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${entryPath}.attendance[${j}].attended must be boolean`);
      }
    }
    const seenWizards = new Set<string>();
    for (let j = 0; j < (entryObj.attendance as unknown[]).length; j++) {
      const attObj = (entryObj.attendance as unknown[])[j] as Record<string, unknown>;
      if (seenWizards.has(attObj.wizardId as string)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${entryPath}.attendance[${j}]: duplicate wizardId "${attObj.wizardId}"`);
      }
      seenWizards.add(attObj.wizardId as string);
    }
  }
}

function validateLifecycle(
  s: Record<string, unknown>,
  wizardIds: Set<string>,
): void {
  if (s.lifecycle === null || s.lifecycle === undefined || typeof s.lifecycle !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Missing or invalid lifecycle");
  }
  const lifecycle = s.lifecycle as Record<string, unknown>;

  if (lifecycle.kind !== "setup" && lifecycle.kind !== "play") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `lifecycle.kind must be "setup" or "play", got ${JSON.stringify(lifecycle.kind)}`);
  }

  if (lifecycle.orrery === null || lifecycle.orrery === undefined || typeof lifecycle.orrery !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Missing or invalid lifecycle.orrery");
  }
  const orrery = lifecycle.orrery as Record<string, unknown>;

  if (lifecycle.kind === "setup") {
    validateOrreryPositions(orrery, false);
  } else {
    // Play lifecycle
    validateOrreryPositions(orrery, true);

    if (!(LUNAR_PHASES as readonly string[]).includes(lifecycle.phase as string)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `lifecycle.phase is invalid: ${JSON.stringify(lifecycle.phase)}`);
    }

    if (lifecycle.currentMonth === null || lifecycle.currentMonth === undefined || typeof lifecycle.currentMonth !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "Play lifecycle requires currentMonth");
    }
    const currentMonth = lifecycle.currentMonth as Record<string, unknown>;

    if (!Array.isArray(currentMonth.timeParticipants)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "currentMonth.timeParticipants must be an array");
    }
    const { allocationIds, allocationOwner, allocationDestination } = validateTimeParticipants(
      currentMonth.timeParticipants as unknown[],
      wizardIds,
      "currentMonth.timeParticipants",
    );

    if (!Array.isArray(currentMonth.engagements)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "currentMonth.engagements must be an array");
    }
    validateEngagements(
      currentMonth.engagements as unknown[],
      wizardIds,
      allocationIds,
      allocationOwner,
      allocationDestination,
      "currentMonth.engagements",
    );

    if (currentMonth.wizardmootAttendance !== null) {
      if (!Array.isArray(currentMonth.wizardmootAttendance)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "currentMonth.wizardmootAttendance must be array or null");
      }
      validateWizardmootAttendance(
        currentMonth.wizardmootAttendance as unknown[],
        wizardIds,
        "currentMonth.wizardmootAttendance",
      );
    }
  }
}

function validateV3Shape(s: Record<string, unknown>): void {
  // Determine lifecycle kind first for calendar validation
  let lifecycleKind = "setup";
  if (s.lifecycle !== null && s.lifecycle !== undefined && typeof s.lifecycle === "object") {
    lifecycleKind = (s.lifecycle as Record<string, unknown>).kind as string || "setup";
  }

  validateRuleset(s);
  validateCalendarV3(s, lifecycleKind);

  const { playerIds, wizardIds } = validatePlayersAndWizards(s);
  validateConfiguration(s, playerIds);
  validatePactSeats(s, playerIds, wizardIds, s.wizards as unknown[]);
  validateLifecycle(s, wizardIds);

  if (!Array.isArray(s.wizardmootHistory)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "wizardmootHistory must be an array");
  }
  validateWizardmootHistory(s.wizardmootHistory as unknown[], wizardIds);
}

export function validateCampaignState(state: unknown): CurrentCampaignState {
  if (state === null || state === undefined || typeof state !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "State must be a non-null object");
  }

  const s = state as Record<string, unknown>;

  if (s.schemaVersion !== CURRENT_STATE_SCHEMA_VERSION) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Unsupported schemaVersion: ${JSON.stringify(s.schemaVersion)} (only V3 is supported)`,
    );
  }

  validateV3Shape(s);
  return state as CurrentCampaignState;
}

export function validateAnyCampaignState(state: unknown): AnyCampaignState {
  if (state === null || state === undefined || typeof state !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "State must be a non-null object");
  }

  const s = state as Record<string, unknown>;

  if (s.schemaVersion === 1 || s.schemaVersion === 2) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Schema version ${s.schemaVersion} is no longer supported. Only V3 is accepted.`,
    );
  }

  if (s.schemaVersion === 3) {
    validateV3Shape(s);
    return state as AnyCampaignState;
  }

  throw new DomainError(
    "INVALID_CAMPAIGN_STATE",
    `Unsupported schemaVersion: ${JSON.stringify(s.schemaVersion)}`,
  );
}
