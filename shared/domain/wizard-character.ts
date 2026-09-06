import type { WizardElementScores, WizardCharacterData } from "./campaign-state";
import { DomainError } from "./errors";

export interface WizardCharacterPatch {
  readonly elements?: WizardElementScores | null;
  readonly pactFragmentPersonalForm?: string | null;
  readonly familiarDescription?: string | null;
  readonly ageYears?: number | null;
  readonly publicChangesOfMagic?: readonly string[];
  readonly importantNotes?: string | null;
}

const ELEMENT_KEYS: readonly (keyof WizardElementScores)[] = ["air", "fire", "earth", "water"];
const SCALAR_TEXT_KEYS: readonly (keyof WizardCharacterPatch)[] = [
  "pactFragmentPersonalForm",
  "familiarDescription",
  "importantNotes",
];

function normalizeScalarText(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function normalizeWizardCharacterPatch(
  patch: WizardCharacterPatch,
): WizardCharacterPatch {
  const keys = Object.keys(patch) as (keyof WizardCharacterPatch)[];
  const presentKeys = keys.filter((k) => patch[k] !== undefined);
  if (presentKeys.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Wizard character patch must not be empty");
  }

  const result: Record<string, unknown> = {};

  if ("elements" in patch) {
    const elems = patch.elements;
    if (elems !== null && elems !== undefined) {
      for (const key of ELEMENT_KEYS) {
        const v = elems[key];
        if (typeof v !== "number" || !Number.isSafeInteger(v)) {
          throw new DomainError(
            "INVALID_CAMPAIGN_STATE",
            `elements.${key} must be a safe integer: ${JSON.stringify(v)}`,
          );
        }
      }
    }
    result.elements = elems ?? null;
  }

  if ("ageYears" in patch) {
    const age = patch.ageYears;
    if (age !== null && age !== undefined) {
      if (typeof age !== "number" || !Number.isSafeInteger(age) || age < 0) {
        throw new DomainError(
          "INVALID_CAMPAIGN_STATE",
          `ageYears must be a non-negative safe integer or null: ${JSON.stringify(age)}`,
        );
      }
    }
    result.ageYears = age ?? null;
  }

  for (const key of SCALAR_TEXT_KEYS) {
    if (key in patch) {
      result[key] = normalizeScalarText(patch[key] as string | null);
    }
  }

  if ("publicChangesOfMagic" in patch) {
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
  }

  return result as WizardCharacterPatch;
}

export function applyWizardCharacterPatch(
  current: WizardCharacterData,
  normalizedPatch: WizardCharacterPatch,
): WizardCharacterData {
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
