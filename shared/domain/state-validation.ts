import type {
  CurrentCampaignState,
  AnyCampaignState,
  CampaignStateV5,
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
  isValidIsleId,
  isValidPlaceId,
  isValidDenizenId,
  isValidCompanionRelationshipId,
  isValidTreasureId,
  isValidCampaignPowerfulDenizenTaxonomyId,
  isValidPowerfulDenizenMethodEntryId,
  isValidPowerfulDenizenTruthId,
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
import { ENGAGEMENT_RESOLUTIONS, ENGAGEMENT_TARGET_KINDS_V4, ENGAGEMENT_TARGET_KINDS_V5 } from "./engagement";
import type { EngagementResolution, EngagementTargetKind } from "./engagement";
import { TIME_DESTINATION_KINDS } from "./time-model";
import { ELEMENT_IDS } from "./shared-world";
import {
  isValidBuiltinPowerfulDenizenTaxonomyId,
  isValidPowerfulDenizenStandardStatus,
  isValidStandardPowerfulDenizenMethod,
  powerfulDenizenTaxonomyRefKey,
} from "./powerful-denizen";
import { PACT_FRAGMENT_CONDITIONS } from "./campaign-state";
import { DomainError } from "./errors";
import { validateV5WorldReferenceIntegrity } from "./v5-reference-validation";
import { validateHierophantReferenceIntegrity } from "./hierophant-validation";
import { validateMarinerReferenceIntegrity } from "./mariner-validation";
import { validateNecromancerReferenceIntegrity } from "./necromancer-validation";
import { validateFaustianReferenceIntegrity } from "./faustian-validation";

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
  version: 4 | 5 = 4,
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

    validateWizardCharacter(wizard, i, version);

    if (version >= 5) {
      const character = wizard.character as Record<string, unknown>;
      if ("companionDescriptions" in character) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `wizards[${i}].character must not contain retired companionDescriptions field`);
      }
      if (wizard.homeIsleId !== null) {
        if (typeof wizard.homeIsleId !== "string" || !isValidIsleId(wizard.homeIsleId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `wizards[${i}].homeIsleId is invalid: ${JSON.stringify(wizard.homeIsleId)}`);
        }
      }
      if (wizard.sanctumPlaceId !== null) {
        if (typeof wizard.sanctumPlaceId !== "string" || !isValidPlaceId(wizard.sanctumPlaceId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `wizards[${i}].sanctumPlaceId is invalid: ${JSON.stringify(wizard.sanctumPlaceId)}`);
        }
      }
      if (wizard.mortalityState !== "not_deceased" && wizard.mortalityState !== "deceased") {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `wizards[${i}].mortalityState is invalid: ${JSON.stringify(wizard.mortalityState)}`);
      }
    }
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
  if (kind === "orrery") {
    const allowed = new Set(["kind"]);
    for (const key of Object.keys(dest)) {
      if (!allowed.has(key)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}: orrery destination has unknown field: ${key}`);
      }
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
  version: 4 | 5 = 4,
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
      const allowedKinds = version >= 5 ? ENGAGEMENT_TARGET_KINDS_V5 : ENGAGEMENT_TARGET_KINDS_V4;
      if (!(allowedKinds as readonly string[]).includes(target.kind as string)) {
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
      if (target.kind === "denizen") {
        if (typeof target.denizenId !== "string" || !isValidDenizenId(target.denizenId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `${engPath}.target.denizenId is invalid: ${JSON.stringify(target.denizenId)}`);
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
  phase: string,
  timeParticipants: unknown[] | null,
  path: string,
): void {
  const preMeetingPhases = new Set(["new_moon", "visions", "planning", "story"]);
  const postMeetingPhases = new Set(["meeting", "quiet"]);

  if (preMeetingPhases.has(phase)) {
    if (attendance !== null) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be null during ${phase} phase`);
    }
    return;
  }

  if (postMeetingPhases.has(phase)) {
    if (attendance === null) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be initialized during ${phase} phase`);
    }
  }

  if (attendance === null) return;

  const seenWizardIds = new Set<string>();
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
    if (seenWizardIds.has(entryObj.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${entryPath}: duplicate wizardId "${entryObj.wizardId}"`);
    }
    seenWizardIds.add(entryObj.wizardId);
    if (typeof entryObj.attended !== "boolean") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${entryPath}.attended must be boolean`);
    }
    if (entryObj.exceptionReason !== null && typeof entryObj.exceptionReason !== "string") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${entryPath}.exceptionReason must be string or null`);
    }

    if (timeParticipants !== null) {
      const expectedAttended = deriveExpectedAttendanceFromRaw(entryObj.wizardId as string, timeParticipants);
      if (entryObj.attended !== expectedAttended) {
        if (entryObj.exceptionReason === null || (typeof entryObj.exceptionReason === "string" && entryObj.exceptionReason.trim().length === 0)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `${entryPath}: attendance differs from expected (${expectedAttended}) but exceptionReason is blank`);
        }
      } else {
        if (entryObj.exceptionReason !== null) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `${entryPath}: attendance matches expected but exceptionReason is non-null`);
        }
      }
    }
  }
}

function deriveExpectedAttendanceFromRaw(wizardId: string, timeParticipants: unknown[]): boolean {
  for (const tp of timeParticipants) {
    const tpObj = tp as Record<string, unknown>;
    const pRef = tpObj.participant as Record<string, unknown>;
    if (pRef.wizardId !== wizardId) continue;
    const allocations = tpObj.allocations as unknown[];
    for (const alloc of allocations) {
      const allocObj = alloc as Record<string, unknown>;
      if (allocObj.destination !== null && typeof allocObj.destination === "object") {
        const dest = allocObj.destination as Record<string, unknown>;
        if (dest.kind === "meeting") return true;
      }
    }
    return false;
  }
  return false;
}

function validateWizardmootHistory(
  history: unknown[],
  wizardIds: Set<string>,
): void {
  const seenMonths = new Set<number>();
  let prevMonth: number | null = null;
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
    if (prevMonth !== null && (entryObj.monthOrdinal as number) <= prevMonth) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${entryPath}: monthOrdinal ${entryObj.monthOrdinal} is not strictly greater than previous ${prevMonth}`,
      );
    }
    prevMonth = entryObj.monthOrdinal as number;
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
  version: 4 | 5 = 4,
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
      version,
    );

    if (currentMonth.wizardmootAttendance !== null && !Array.isArray(currentMonth.wizardmootAttendance)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", "currentMonth.wizardmootAttendance must be array or null");
    }
      validateWizardmootAttendance(
        currentMonth.wizardmootAttendance as unknown[] | null,
        wizardIds,
        lifecycle.phase as string,
        currentMonth.timeParticipants as unknown[],
        "currentMonth.wizardmootAttendance",
      );
  }
}

const ELEMENT_KEYS = ["air", "fire", "earth", "water"] as const;

function validateWizardCharacter(wizard: Record<string, unknown>, index: number, version: 4 | 5 = 4): void {
  const path = `wizards[${index}]`;
  if (wizard.character === null || wizard.character === undefined || typeof wizard.character !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.character must be an object`);
  }
  const char = wizard.character as Record<string, unknown>;

  if (char.elements !== null) {
    if (typeof char.elements !== "object" || char.elements === undefined) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.character.elements must be an object or null`);
    }
    const elems = char.elements as Record<string, unknown>;
    for (const key of ELEMENT_KEYS) {
      if (typeof elems[key] !== "number" || !Number.isSafeInteger(elems[key] as number)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.character.elements.${key} must be a safe integer: ${JSON.stringify(elems[key])}`,
        );
      }
    }
  }

  if (char.ageYears !== null) {
    if (typeof char.ageYears !== "number" || !Number.isSafeInteger(char.ageYears) || (char.ageYears as number) < 0) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.character.ageYears must be a non-negative safe integer or null: ${JSON.stringify(char.ageYears)}`,
      );
    }
  }

  for (const field of ["pactFragmentPersonalForm", "familiarDescription", "importantNotes"] as const) {
    if (char[field] !== null && typeof char[field] !== "string") {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.character.${field} must be a string or null`,
      );
    }
  }

  if (!Array.isArray(char.publicChangesOfMagic)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.character.publicChangesOfMagic must be an array`);
  }
  for (let j = 0; j < (char.publicChangesOfMagic as unknown[]).length; j++) {
    if (typeof (char.publicChangesOfMagic as unknown[])[j] !== "string") {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.character.publicChangesOfMagic[${j}] must be a string`,
      );
    }
  }

  if (version <= 4) {
    if (char.companionDescriptions === null || char.companionDescriptions === undefined || typeof char.companionDescriptions !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.character.companionDescriptions must be an object`);
    }
    const cd = char.companionDescriptions as Record<string, unknown>;
    for (const key of ELEMENT_KEYS) {
      if (cd[key] !== null && typeof cd[key] !== "string") {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `${path}.character.companionDescriptions.${key} must be a string or null`,
        );
      }
    }
  }
}

function validateCommonShape(s: Record<string, unknown>, version: 4 | 5 = 4): { wizardIds: Set<string> } {
  let lifecycleKind = "setup";
  if (s.lifecycle !== null && s.lifecycle !== undefined && typeof s.lifecycle === "object") {
    lifecycleKind = (s.lifecycle as Record<string, unknown>).kind as string || "setup";
  }

  validateRuleset(s);
  validateCalendarV3(s, lifecycleKind);

  const { playerIds, wizardIds } = validatePlayersAndWizards(s, version);
  validateConfiguration(s, playerIds);
  validatePactSeats(s, playerIds, wizardIds, s.wizards as unknown[]);
  validateLifecycle(s, wizardIds, version);

  if (!Array.isArray(s.wizardmootHistory)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "wizardmootHistory must be an array");
  }
  validateWizardmootHistory(s.wizardmootHistory as unknown[], wizardIds);

  return { wizardIds };
}

function validateV4Shape(s: Record<string, unknown>): void {
  validateCommonShape(s, 4);
}

export function validateCampaignState(state: unknown): CurrentCampaignState {
  if (state === null || state === undefined || typeof state !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "State must be a non-null object");
  }

  const s = state as Record<string, unknown>;

  if (s.schemaVersion !== CURRENT_STATE_SCHEMA_VERSION) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Unsupported schemaVersion: ${JSON.stringify(s.schemaVersion)} (only V5 is supported)`,
    );
  }

  return validateCampaignStateV5Candidate(state);
}

export function validateAnyCampaignState(state: unknown): AnyCampaignState {
  if (state === null || state === undefined || typeof state !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "State must be a non-null object");
  }

  const s = state as Record<string, unknown>;

  if (s.schemaVersion === 5) {
    return validateCampaignStateV5Candidate(state);
  }

  throw new DomainError(
    "INVALID_CAMPAIGN_STATE",
    `Unsupported schemaVersion: ${JSON.stringify(s.schemaVersion)}. Only V5 is accepted.`,
  );
}

// --- V5 Candidate structural validation (NOT called by active runtime) ---

const VALID_PLACEMENT_KINDS = new Set(["unspecified", "on_isle", "mobile"]);
const VALID_REPRESENTATIONS = new Set(["individual", "collective"]);
const VALID_COMPANION_STATUSES = new Set(["current", "ended"]);
const VALID_MORTALITY_STATES = new Set(["not_deceased", "deceased"]);
const VALID_TREASURE_CONDITIONS = new Set(["intact", "destroyed"]);
const VALID_TREASURE_CUSTODY_KINDS = new Set(["subject", "place", "unlocated", "none", "devil"]);
const VALID_SUBJECT_REF_KINDS = new Set(["wizard", "denizen"]);
const VALID_PACT_FRAGMENT_CONDITIONS = new Set<string>(PACT_FRAGMENT_CONDITIONS);
const VALID_PACT_FRAGMENT_CUSTODY_KINDS = new Set(["wizard", "devil", "unlocated", "none"]);
const VALID_POWERFUL_ENTRY_ORIGINS = new Set(["source", "campaign"]);
const ELEMENT_ID_SET = new Set<string>(ELEMENT_IDS);

function assertNonEmptyString(path: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be a non-empty string`);
  }
}

function assertNullableString(path: string, value: unknown): void {
  if (value !== null && typeof value !== "string") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be a string or null`);
  }
}

function validateWizardOrDenizenSubjectRef(ref: unknown, path: string): void {
  if (ref === null || ref === undefined || typeof ref !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
  }
  const subject = ref as Record<string, unknown>;
  if (!VALID_SUBJECT_REF_KINDS.has(subject.kind as string)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(subject.kind)}`);
  }
  if (subject.kind === "wizard") {
    if (typeof subject.wizardId !== "string" || !isValidWizardId(subject.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.wizardId is invalid: ${JSON.stringify(subject.wizardId)}`);
    }
  }
  if (subject.kind === "denizen") {
    if (typeof subject.denizenId !== "string" || !isValidDenizenId(subject.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(subject.denizenId)}`);
    }
  }
}

function validatePowerfulDenizenTaxonomyRef(ref: unknown, path: string): string {
  if (ref === null || ref === undefined || typeof ref !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
  }
  const taxonomy = ref as Record<string, unknown>;
  if (taxonomy.kind === "builtin") {
    if (typeof taxonomy.taxonomyId !== "string" || !isValidBuiltinPowerfulDenizenTaxonomyId(taxonomy.taxonomyId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.taxonomyId is not a known builtin taxonomy: ${JSON.stringify(taxonomy.taxonomyId)}`);
    }
    return powerfulDenizenTaxonomyRefKey({ kind: "builtin", taxonomyId: taxonomy.taxonomyId });
  }
  if (taxonomy.kind === "campaign") {
    if (typeof taxonomy.taxonomyId !== "string" || !isValidCampaignPowerfulDenizenTaxonomyId(taxonomy.taxonomyId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.taxonomyId is invalid: ${JSON.stringify(taxonomy.taxonomyId)}`);
    }
    return powerfulDenizenTaxonomyRefKey({ kind: "campaign", taxonomyId: taxonomy.taxonomyId });
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(taxonomy.kind)}`);
}

function validatePowerfulDenizenStatus(status: unknown, path: string): void {
  if (status === null || status === undefined || typeof status !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
  }
  const statusObj = status as Record<string, unknown>;
  if (statusObj.kind === "standard") {
    if (typeof statusObj.value !== "string" || !isValidPowerfulDenizenStandardStatus(statusObj.value)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.value is invalid: ${JSON.stringify(statusObj.value)}`);
    }
    return;
  }
  if (statusObj.kind === "other") {
    assertNonEmptyString(`${path}.label`, statusObj.label);
    return;
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(statusObj.kind)}`);
}

function validatePowerfulDenizenMethodEntry(entry: unknown, path: string, methodEntryIds: Set<string>): void {
  if (entry === null || entry === undefined || typeof entry !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
  }
  const method = entry as Record<string, unknown>;
  if (typeof method.methodEntryId !== "string" || !isValidPowerfulDenizenMethodEntryId(method.methodEntryId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.methodEntryId is invalid: ${JSON.stringify(method.methodEntryId)}`);
  }
  if (methodEntryIds.has(method.methodEntryId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate powerful denizen methodEntryId: ${method.methodEntryId}`);
  }
  methodEntryIds.add(method.methodEntryId);

  if (method.definition === null || method.definition === undefined || typeof method.definition !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.definition must be an object`);
  }
  const definition = method.definition as Record<string, unknown>;
  if (definition.kind === "standard") {
    if (typeof definition.method !== "string" || !isValidStandardPowerfulDenizenMethod(definition.method)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.definition.method is invalid: ${JSON.stringify(definition.method)}`);
    }
  } else if (definition.kind === "named") {
    assertNonEmptyString(`${path}.definition.name`, definition.name);
    assertNullableString(`${path}.definition.description`, definition.description);
  } else {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.definition.kind is invalid: ${JSON.stringify(definition.kind)}`);
  }

  if (!VALID_POWERFUL_ENTRY_ORIGINS.has(method.origin as string)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.origin is invalid: ${JSON.stringify(method.origin)}`);
  }
}

function validatePowerfulDenizenTruthEntry(entry: unknown, path: string, truthIds: Set<string>): void {
  if (entry === null || entry === undefined || typeof entry !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
  }
  const truth = entry as Record<string, unknown>;
  if (typeof truth.truthId !== "string" || !isValidPowerfulDenizenTruthId(truth.truthId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.truthId is invalid: ${JSON.stringify(truth.truthId)}`);
  }
  if (truthIds.has(truth.truthId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate powerful denizen truthId: ${truth.truthId}`);
  }
  truthIds.add(truth.truthId);
  assertNonEmptyString(`${path}.text`, truth.text);
  if (!VALID_POWERFUL_ENTRY_ORIGINS.has(truth.origin as string)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.origin is invalid: ${JSON.stringify(truth.origin)}`);
  }
}

function validatePowerfulDenizenProfile(profile: unknown, path: string, methodEntryIds: Set<string>, truthIds: Set<string>): void {
  if (profile === null || profile === undefined || typeof profile !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
  }
  const profileObj = profile as Record<string, unknown>;
  if (!Array.isArray(profileObj.taxonomies)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.taxonomies must be an array`);
  }
  const taxonomies = profileObj.taxonomies as unknown[];
  if (taxonomies.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} requires at least one taxonomy`);
  }
  const taxonomyKeys = new Set<string>();
  for (let i = 0; i < taxonomies.length; i++) {
    const key = validatePowerfulDenizenTaxonomyRef(taxonomies[i], `${path}.taxonomies[${i}]`);
    if (taxonomyKeys.has(key)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.taxonomies contains a duplicate taxonomy ref: ${key}`);
    }
    taxonomyKeys.add(key);
  }

  validatePowerfulDenizenStatus(profileObj.status, `${path}.status`);
  assertNullableString(`${path}.goal`, profileObj.goal);

  if (!Array.isArray(profileObj.methods)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.methods must be an array`);
  }
  for (let i = 0; i < (profileObj.methods as unknown[]).length; i++) {
    validatePowerfulDenizenMethodEntry((profileObj.methods as unknown[])[i], `${path}.methods[${i}]`, methodEntryIds);
  }

  if (!Array.isArray(profileObj.truths)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.truths must be an array`);
  }
  for (let i = 0; i < (profileObj.truths as unknown[]).length; i++) {
    validatePowerfulDenizenTruthEntry((profileObj.truths as unknown[])[i], `${path}.truths[${i}]`, truthIds);
  }
}

function validateTreasureCustody(custody: unknown, path: string, condition: string): void {
  if (custody === null || custody === undefined || typeof custody !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
  }
  const custodyObj = custody as Record<string, unknown>;
  if (!VALID_TREASURE_CUSTODY_KINDS.has(custodyObj.kind as string)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(custodyObj.kind)}`);
  }
  if (condition === "destroyed" && custodyObj.kind !== "none") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be none when the treasure is destroyed`);
  }
  if (custodyObj.kind === "subject") {
    validateWizardOrDenizenSubjectRef(custodyObj.subject, `${path}.subject`);
  }
  if (custodyObj.kind === "place") {
    if (typeof custodyObj.placeId !== "string" || !isValidPlaceId(custodyObj.placeId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.placeId is invalid: ${JSON.stringify(custodyObj.placeId)}`);
    }
  }
}

function validatePactFragmentOperationalStructure(s: Record<string, unknown>): void {
  if (s.pactFragmentOperationalState === null || s.pactFragmentOperationalState === undefined || typeof s.pactFragmentOperationalState !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Missing or invalid pactFragmentOperationalState");
  }
  const fragments = s.pactFragmentOperationalState as Record<string, unknown>;
  const keys = Object.keys(fragments);
  if (keys.length !== PACT_SEAT_IDS.length) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `pactFragmentOperationalState must have exactly ${PACT_SEAT_IDS.length} entries, got ${keys.length}`);
  }
  for (const seatId of PACT_SEAT_IDS) {
    if (!(seatId in fragments)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Missing pact fragment operational state for seat: ${seatId}`);
    }
  }
  for (const key of keys) {
    if (!(PACT_SEAT_IDS as readonly string[]).includes(key)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Unknown pact fragment operational key: ${key}`);
    }
  }

  for (const seatId of PACT_SEAT_IDS) {
    const fragment = fragments[seatId];
    const path = `pactFragmentOperationalState.${seatId}`;
    if (fragment === null || fragment === undefined || typeof fragment !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const fragmentObj = fragment as Record<string, unknown>;
    if (!VALID_PACT_FRAGMENT_CONDITIONS.has(fragmentObj.condition as string)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.condition is invalid: ${JSON.stringify(fragmentObj.condition)}`);
    }
    if (fragmentObj.custody === null || fragmentObj.custody === undefined || typeof fragmentObj.custody !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.custody must be an object`);
    }
    const custody = fragmentObj.custody as Record<string, unknown>;
    if (!VALID_PACT_FRAGMENT_CUSTODY_KINDS.has(custody.kind as string)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.custody.kind is invalid: ${JSON.stringify(custody.kind)}`);
    }
    if (fragmentObj.condition === "destroyed" && custody.kind !== "none") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.custody must be none when the fragment is destroyed`);
    }
    if (custody.kind === "wizard") {
      if (typeof custody.wizardId !== "string" || !isValidWizardId(custody.wizardId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.custody.wizardId is invalid: ${JSON.stringify(custody.wizardId)}`);
      }
    }
  }
}

function validateWorldStructure(s: Record<string, unknown>): void {
  if (s.world === null || s.world === undefined || typeof s.world !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Missing or invalid world");
  }
  const world = s.world as Record<string, unknown>;

  if (!Array.isArray(world.denizens)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "world.denizens must be an array");
  }
  if (!Array.isArray(world.isles)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "world.isles must be an array");
  }
  if (!Array.isArray(world.places)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "world.places must be an array");
  }
  if (!Array.isArray(world.companionRelationships)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "world.companionRelationships must be an array");
  }
  if (!Array.isArray(world.campaignPowerfulDenizenTaxonomies)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "world.campaignPowerfulDenizenTaxonomies must be an array");
  }
  if (!Array.isArray(world.treasures)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "world.treasures must be an array");
  }

  const methodEntryIds = new Set<string>();
  const truthIds = new Set<string>();

  for (let i = 0; i < (world.denizens as unknown[]).length; i++) {
    const d = (world.denizens as unknown[])[i];
    const path = `world.denizens[${i}]`;
    if (d === null || d === undefined || typeof d !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const dObj = d as Record<string, unknown>;
    if (typeof dObj.denizenId !== "string" || !isValidDenizenId(dObj.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(dObj.denizenId)}`);
    }
    if (typeof dObj.name !== "string" || dObj.name.length === 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.name must be a non-empty string`);
    }
    if (!VALID_REPRESENTATIONS.has(dObj.representation as string)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.representation is invalid: ${JSON.stringify(dObj.representation)}`);
    }
    if (dObj.description !== null && typeof dObj.description !== "string") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.description must be a string or null`);
    }
    if (dObj.representation === "individual") {
      if (!VALID_MORTALITY_STATES.has(dObj.mortalityState as string)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.mortalityState is required for individual denizens: ${JSON.stringify(dObj.mortalityState)}`);
      }
    } else if (dObj.mortalityState !== null) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.mortalityState must be null for collective denizens`);
    }
    if (dObj.powerfulProfile !== null) {
      validatePowerfulDenizenProfile(dObj.powerfulProfile, `${path}.powerfulProfile`, methodEntryIds, truthIds);
    }
  }

  for (let i = 0; i < (world.isles as unknown[]).length; i++) {
    const isle = (world.isles as unknown[])[i];
    const path = `world.isles[${i}]`;
    if (isle === null || isle === undefined || typeof isle !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const isleObj = isle as Record<string, unknown>;
    if (typeof isleObj.isleId !== "string" || !isValidIsleId(isleObj.isleId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.isleId is invalid: ${JSON.stringify(isleObj.isleId)}`);
    }
    if (typeof isleObj.name !== "string" || isleObj.name.length === 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.name must be a non-empty string`);
    }
    if (isleObj.description !== null && typeof isleObj.description !== "string") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.description must be a string or null`);
    }
  }

  for (let i = 0; i < (world.places as unknown[]).length; i++) {
    const place = (world.places as unknown[])[i];
    const path = `world.places[${i}]`;
    if (place === null || place === undefined || typeof place !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const placeObj = place as Record<string, unknown>;
    if (typeof placeObj.placeId !== "string" || !isValidPlaceId(placeObj.placeId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.placeId is invalid: ${JSON.stringify(placeObj.placeId)}`);
    }
    if (typeof placeObj.name !== "string" || placeObj.name.length === 0) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.name must be a non-empty string`);
    }
    if (placeObj.description !== null && typeof placeObj.description !== "string") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.description must be a string or null`);
    }
    if (placeObj.placement === null || placeObj.placement === undefined || typeof placeObj.placement !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.placement must be an object`);
    }
    const placement = placeObj.placement as Record<string, unknown>;
    if (!VALID_PLACEMENT_KINDS.has(placement.kind as string)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.placement.kind is invalid: ${JSON.stringify(placement.kind)}`);
    }
    if (placement.kind === "on_isle") {
      if (typeof placement.isleId !== "string" || !isValidIsleId(placement.isleId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.placement.isleId is invalid: ${JSON.stringify(placement.isleId)}`);
      }
    }
    if (placement.kind === "mobile") {
      if (placement.associatedIsleId !== null) {
        if (typeof placement.associatedIsleId !== "string" || !isValidIsleId(placement.associatedIsleId)) {
          throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.placement.associatedIsleId is invalid: ${JSON.stringify(placement.associatedIsleId)}`);
        }
      }
    }
  }

  for (let i = 0; i < (world.companionRelationships as unknown[]).length; i++) {
    const cr = (world.companionRelationships as unknown[])[i];
    const path = `world.companionRelationships[${i}]`;
    if (cr === null || cr === undefined || typeof cr !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const crObj = cr as Record<string, unknown>;
    if (typeof crObj.companionRelationshipId !== "string" || !isValidCompanionRelationshipId(crObj.companionRelationshipId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.companionRelationshipId is invalid: ${JSON.stringify(crObj.companionRelationshipId)}`);
    }
    if (typeof crObj.wizardId !== "string" || !isValidWizardId(crObj.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.wizardId is invalid: ${JSON.stringify(crObj.wizardId)}`);
    }
    if (!ELEMENT_ID_SET.has(crObj.element as string)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.element is invalid: ${JSON.stringify(crObj.element)}`);
    }
    if (typeof crObj.denizenId !== "string" || !isValidDenizenId(crObj.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(crObj.denizenId)}`);
    }
    if (crObj.description !== null && typeof crObj.description !== "string") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.description must be a string or null`);
    }
    if (!VALID_COMPANION_STATUSES.has(crObj.status as string)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.status is invalid: ${JSON.stringify(crObj.status)}`);
    }
  }

  for (let i = 0; i < (world.campaignPowerfulDenizenTaxonomies as unknown[]).length; i++) {
    const taxonomy = (world.campaignPowerfulDenizenTaxonomies as unknown[])[i];
    const path = `world.campaignPowerfulDenizenTaxonomies[${i}]`;
    if (taxonomy === null || taxonomy === undefined || typeof taxonomy !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const taxonomyObj = taxonomy as Record<string, unknown>;
    if (typeof taxonomyObj.taxonomyId !== "string" || !isValidCampaignPowerfulDenizenTaxonomyId(taxonomyObj.taxonomyId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.taxonomyId is invalid: ${JSON.stringify(taxonomyObj.taxonomyId)}`);
    }
    assertNonEmptyString(`${path}.name`, taxonomyObj.name);
    assertNullableString(`${path}.description`, taxonomyObj.description);
  }

  for (let i = 0; i < (world.treasures as unknown[]).length; i++) {
    const treasure = (world.treasures as unknown[])[i];
    const path = `world.treasures[${i}]`;
    if (treasure === null || treasure === undefined || typeof treasure !== "object") {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} is not a valid object`);
    }
    const treasureObj = treasure as Record<string, unknown>;
    if (typeof treasureObj.treasureId !== "string" || !isValidTreasureId(treasureObj.treasureId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.treasureId is invalid: ${JSON.stringify(treasureObj.treasureId)}`);
    }
    assertNonEmptyString(`${path}.name`, treasureObj.name);
    assertNullableString(`${path}.description`, treasureObj.description);
    if (!VALID_TREASURE_CONDITIONS.has(treasureObj.condition as string)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.condition is invalid: ${JSON.stringify(treasureObj.condition)}`);
    }
    validateTreasureCustody(treasureObj.custody, `${path}.custody`, treasureObj.condition as string);
  }
}

export function validateCampaignStateV5Candidate(state: unknown): CampaignStateV5 {
  if (state === null || state === undefined || typeof state !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "State must be a non-null object");
  }

  const s = state as Record<string, unknown>;

  if (s.schemaVersion !== 5) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `validateCampaignStateV5Candidate requires schemaVersion 5, got ${JSON.stringify(s.schemaVersion)}`,
    );
  }

  validateCommonShape(s, 5);
  validateWorldStructure(s);
  validatePactFragmentOperationalStructure(s);
  validateV5WorldReferenceIntegrity(state as CampaignStateV5);
  validateHierophantReferenceIntegrity(state as CampaignStateV5);
  validateMarinerReferenceIntegrity(state as CampaignStateV5);
  validateNecromancerReferenceIntegrity(state as CampaignStateV5);
  validateFaustianReferenceIntegrity(state as CampaignStateV5);

  return state as CampaignStateV5;
}
