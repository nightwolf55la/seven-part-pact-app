import type { CampaignStateV5, CampaignWizardV5, WizardCharacterDataV5, WizardElementScores } from "./campaign-state";
import type { EngagementRecordV5, EngagementTargetV5 } from "./engagement";
import type { MonthOrdinal } from "./calendar";
import type { WizardId, EngagementId, DenizenId } from "./ids";
import { isValidEngagementId, isValidDenizenId, isValidWizardId } from "./ids";
import { DomainError } from "./errors";
import type {
  WizardCharacterUpdatedEventV2,
  EngagementTargetChangedEventV2,
  EngagementRescheduledEventV2,
} from "./events";

// ---------------------------------------------------------------------------
// V5 Wizard Character Patch (no companionDescriptions)
// ---------------------------------------------------------------------------

export interface WizardCharacterPatchV5 {
  readonly elements?: WizardElementScores | null;
  readonly pactFragmentPersonalForm?: string | null;
  readonly familiarDescription?: string | null;
  readonly ageYears?: number | null;
  readonly publicChangesOfMagic?: readonly string[];
  readonly importantNotes?: string | null;
}

const ELEMENT_KEYS: readonly (keyof WizardElementScores)[] = ["air", "fire", "earth", "water"];

function normalizeScalarText(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function normalizeWizardCharacterPatchV5(
  patch: WizardCharacterPatchV5,
): WizardCharacterPatchV5 {
  const keys = Object.keys(patch) as (keyof WizardCharacterPatchV5)[];
  const presentKeys = keys.filter((k) => patch[k] !== undefined);
  if (presentKeys.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Wizard character patch must not be empty");
  }

  const result: Record<string, unknown> = {};

  for (const key of presentKeys) {
    if (key === "elements") {
      const elems = patch.elements;
      if (elems !== null) {
        for (const ek of ELEMENT_KEYS) {
          const v = (elems as WizardElementScores)[ek];
          if (typeof v !== "number" || !Number.isSafeInteger(v)) {
            throw new DomainError(
              "INVALID_CAMPAIGN_STATE",
              `elements.${ek} must be a safe integer: ${JSON.stringify(v)}`,
            );
          }
        }
      }
      result.elements = elems;
    } else if (key === "ageYears") {
      const age = patch.ageYears;
      if (age !== null) {
        if (typeof age !== "number" || !Number.isSafeInteger(age) || age < 0) {
          throw new DomainError(
            "INVALID_CAMPAIGN_STATE",
            `ageYears must be a non-negative safe integer or null: ${JSON.stringify(age)}`,
          );
        }
      }
      result.ageYears = age;
    } else if (key === "publicChangesOfMagic") {
      const arr = patch.publicChangesOfMagic;
      if (!Array.isArray(arr)) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          "publicChangesOfMagic must be an array of strings",
        );
      }
      const trimmed: string[] = [];
      for (let i = 0; i < arr.length; i++) {
        if (typeof arr[i] !== "string") {
          throw new DomainError(
            "INVALID_CAMPAIGN_STATE",
            `publicChangesOfMagic[${i}] must be a string`,
          );
        }
        const t = arr[i].trim();
        if (t.length === 0) {
          throw new DomainError(
            "INVALID_CAMPAIGN_STATE",
            `publicChangesOfMagic[${i}] is empty after trimming`,
          );
        }
        trimmed.push(t);
      }
      result.publicChangesOfMagic = trimmed;
    } else {
      result[key] = normalizeScalarText(patch[key] as string | null);
    }
  }

  return result as WizardCharacterPatchV5;
}

function applyWizardCharacterPatchV5(
  current: WizardCharacterDataV5,
  normalizedPatch: WizardCharacterPatchV5,
): WizardCharacterDataV5 {
  return {
    elements: "elements" in normalizedPatch ? normalizedPatch.elements! : current.elements,
    pactFragmentPersonalForm: "pactFragmentPersonalForm" in normalizedPatch
      ? normalizedPatch.pactFragmentPersonalForm!
      : current.pactFragmentPersonalForm,
    familiarDescription: "familiarDescription" in normalizedPatch
      ? normalizedPatch.familiarDescription!
      : current.familiarDescription,
    ageYears: "ageYears" in normalizedPatch ? normalizedPatch.ageYears! : current.ageYears,
    publicChangesOfMagic: "publicChangesOfMagic" in normalizedPatch
      ? normalizedPatch.publicChangesOfMagic!
      : current.publicChangesOfMagic,
    importantNotes: "importantNotes" in normalizedPatch
      ? normalizedPatch.importantNotes!
      : current.importantNotes,
  };
}

function elementsEqual(a: WizardElementScores | null, b: WizardElementScores | null): boolean {
  if (a === null || b === null) return a === b;
  return a.air === b.air && a.fire === b.fire && a.earth === b.earth && a.water === b.water;
}

function charactersEqual(a: WizardCharacterDataV5, b: WizardCharacterDataV5): boolean {
  return (
    elementsEqual(a.elements, b.elements) &&
    a.pactFragmentPersonalForm === b.pactFragmentPersonalForm &&
    a.familiarDescription === b.familiarDescription &&
    a.ageYears === b.ageYears &&
    a.publicChangesOfMagic.length === b.publicChangesOfMagic.length &&
    a.publicChangesOfMagic.every((v, i) => v === b.publicChangesOfMagic[i]) &&
    a.importantNotes === b.importantNotes
  );
}

// ---------------------------------------------------------------------------
// V5 Engagement Target Validator
// ---------------------------------------------------------------------------

export function validateEngagementTargetV5(
  target: EngagementTargetV5 | null,
  state: CampaignStateV5,
): void {
  if (target === null) return;

  switch (target.kind) {
    case "wizard":
      if (!isValidWizardId(target.wizardId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId in target: ${target.wizardId}`);
      }
      if (!state.wizards.some((w) => w.wizardId === target.wizardId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Wizard ${target.wizardId} does not exist`);
      }
      break;
    case "self":
    case "familiar":
      break;
    case "named_character":
      if (target.name.trim().length === 0) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", "named_character target requires non-empty name");
      }
      break;
    case "denizen":
      if (!isValidDenizenId(target.denizenId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId in target: ${target.denizenId}`);
      }
      if (!state.world.denizens.some((d) => d.denizenId === target.denizenId)) {
        throw new DomainError("INVALID_CAMPAIGN_STATE", `Denizen ${target.denizenId} does not exist`);
      }
      break;
  }
}

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface V5IntegrationTransitionResult {
  readonly nextState: CampaignStateV5;
  readonly events: readonly (WizardCharacterUpdatedEventV2 | EngagementTargetChangedEventV2 | EngagementRescheduledEventV2)[];
}

// ---------------------------------------------------------------------------
// Update Wizard Character V5
// ---------------------------------------------------------------------------

export function applyUpdateWizardCharacterV5Candidate(
  state: CampaignStateV5,
  wizardId: WizardId,
  patch: WizardCharacterPatchV5,
): V5IntegrationTransitionResult {
  const idx = state.wizards.findIndex((w) => w.wizardId === wizardId);
  if (idx === -1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Wizard not found: ${wizardId}`);
  }

  const wizard = state.wizards[idx];
  const normalizedPatch = normalizeWizardCharacterPatchV5(patch);
  const previousCharacter = wizard.character;
  const newCharacter = applyWizardCharacterPatchV5(previousCharacter, normalizedPatch);

  if (charactersEqual(previousCharacter, newCharacter)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Wizard character update produces no change");
  }

  const updatedWizard: CampaignWizardV5 = { ...wizard, character: newCharacter };
  const wizards = [...state.wizards];
  wizards[idx] = updatedWizard;
  const nextState: CampaignStateV5 = { ...state, wizards };

  const event: WizardCharacterUpdatedEventV2 = {
    type: "wizard_character_updated",
    version: 2,
    data: { wizardId, previousCharacter, newCharacter },
  };

  return { nextState, events: [event] };
}

// ---------------------------------------------------------------------------
// Set Engagement Target V5 (Planning)
// ---------------------------------------------------------------------------

export interface SetEngagementTargetV5Input {
  readonly expectedMonthOrdinal: MonthOrdinal;
  readonly engagementId: EngagementId;
  readonly target: EngagementTargetV5 | null;
}

export function applySetEngagementTargetV5Candidate(
  state: CampaignStateV5,
  input: SetEngagementTargetV5Input,
): V5IntegrationTransitionResult {
  if (state.lifecycle.kind !== "play") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "set_engagement_target requires lifecycle kind 'play'");
  }
  if (state.lifecycle.phase !== "planning") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `set_engagement_target is only allowed during planning, current phase is "${state.lifecycle.phase}"`,
    );
  }

  const currentMonth = state.calendar.monthOrdinal;
  if (currentMonth === null || currentMonth !== input.expectedMonthOrdinal) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Expected month ${input.expectedMonthOrdinal} but current is ${currentMonth}`,
    );
  }

  if (!isValidEngagementId(input.engagementId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid engagementId: ${input.engagementId}`);
  }

  validateEngagementTargetV5(input.target, state);

  const engagements = state.lifecycle.currentMonth.engagements;
  const engIdx = engagements.findIndex((e) => e.engagementId === input.engagementId);
  if (engIdx < 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Engagement ${input.engagementId} not found in current month`);
  }

  const eng = engagements[engIdx];
  if (eng.resolution !== "pending") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Engagement ${input.engagementId} is ${eng.resolution}, not pending`);
  }

  const previousTarget = eng.target;
  const newEngagements = engagements.map((e, i) =>
    i === engIdx ? { ...e, target: input.target } : e,
  );

  const nextState: CampaignStateV5 = {
    ...state,
    lifecycle: {
      ...state.lifecycle,
      currentMonth: { ...state.lifecycle.currentMonth, engagements: newEngagements },
    },
  };

  const event: EngagementTargetChangedEventV2 = {
    type: "engagement_target_changed",
    version: 2,
    data: {
      monthOrdinal: currentMonth,
      engagementId: input.engagementId,
      actingWizardId: eng.actingWizardId,
      previousTarget,
      newTarget: input.target,
    },
  };

  return { nextState, events: [event] };
}

// ---------------------------------------------------------------------------
// Reschedule Engagement V5 (Story)
// ---------------------------------------------------------------------------

export interface RescheduleEngagementV5Input {
  readonly expectedMonthOrdinal: MonthOrdinal;
  readonly engagementId: EngagementId;
  readonly target: EngagementTargetV5;
}

export function applyRescheduleEngagementV5Candidate(
  state: CampaignStateV5,
  input: RescheduleEngagementV5Input,
): V5IntegrationTransitionResult {
  if (state.lifecycle.kind !== "play") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "reschedule_engagement requires lifecycle kind 'play'");
  }
  if (state.lifecycle.phase !== "story") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `reschedule_engagement is only allowed during story, current phase is "${state.lifecycle.phase}"`,
    );
  }

  const currentMonth = state.calendar.monthOrdinal;
  if (currentMonth === null || currentMonth !== input.expectedMonthOrdinal) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Expected month ${input.expectedMonthOrdinal} but current is ${currentMonth}`,
    );
  }

  if (!isValidEngagementId(input.engagementId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid engagementId: ${input.engagementId}`);
  }

  validateEngagementTargetV5(input.target, state);

  const engagements = state.lifecycle.currentMonth.engagements;
  const engIdx = engagements.findIndex((e) => e.engagementId === input.engagementId);
  if (engIdx < 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Engagement ${input.engagementId} not found in current month`);
  }

  const eng = engagements[engIdx];
  if (eng.resolution !== "pending") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Engagement ${input.engagementId} is ${eng.resolution}, not pending`);
  }

  const previousTarget = eng.target;
  const newEngagements = engagements.map((e, i) =>
    i === engIdx ? { ...e, target: input.target } : e,
  );

  const nextState: CampaignStateV5 = {
    ...state,
    lifecycle: {
      ...state.lifecycle,
      currentMonth: { ...state.lifecycle.currentMonth, engagements: newEngagements },
    },
  };

  const event: EngagementRescheduledEventV2 = {
    type: "engagement_rescheduled",
    version: 2,
    data: {
      monthOrdinal: currentMonth,
      engagementId: input.engagementId,
      previousTarget,
      newTarget: input.target,
    },
  };

  return { nextState, events: [event] };
}
