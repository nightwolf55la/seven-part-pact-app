import type {
  WizardCharacterData,
  WizardElementScores,
  WizardCompanionDescriptions,
} from "../shared/domain/campaign-state";
import type { WizardCharacterPatch } from "../shared/domain/wizard-character";

const ELEMENT_KEYS = ["air", "fire", "earth", "water"] as const;
type ElementKey = (typeof ELEMENT_KEYS)[number];

export interface WizardCharacterSheetForm {
  readonly elementsAir: string;
  readonly elementsFire: string;
  readonly elementsEarth: string;
  readonly elementsWater: string;
  readonly pactFragmentPersonalForm: string;
  readonly familiarDescription: string;
  readonly ageYears: string;
  readonly publicChangesOfMagic: string;
  readonly importantNotes: string;
  readonly companionAir: string;
  readonly companionFire: string;
  readonly companionEarth: string;
  readonly companionWater: string;
}

export function formFromCharacter(character: WizardCharacterData): WizardCharacterSheetForm {
  const e = character.elements;
  return {
    elementsAir: e !== null ? String(e.air) : "",
    elementsFire: e !== null ? String(e.fire) : "",
    elementsEarth: e !== null ? String(e.earth) : "",
    elementsWater: e !== null ? String(e.water) : "",
    pactFragmentPersonalForm: character.pactFragmentPersonalForm ?? "",
    familiarDescription: character.familiarDescription ?? "",
    ageYears: character.ageYears !== null ? String(character.ageYears) : "",
    publicChangesOfMagic: character.publicChangesOfMagic.join("\n"),
    importantNotes: character.importantNotes ?? "",
    companionAir: character.companionDescriptions.air ?? "",
    companionFire: character.companionDescriptions.fire ?? "",
    companionEarth: character.companionDescriptions.earth ?? "",
    companionWater: character.companionDescriptions.water ?? "",
  };
}

export function parseElementInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isSafeInteger(n)) return null;
  return n;
}

export function parseAgeInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isSafeInteger(n) || n < 0) return null;
  return n;
}

export function normalizeScalarText(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function isElementsComplete(
  air: number | null,
  fire: number | null,
  earth: number | null,
  water: number | null,
): boolean {
  const vals = [air, fire, earth, water];
  if (vals.every((v) => v === null)) return false;
  return vals.every((v) => v !== null);
}

export function elementsTotal(elements: WizardElementScores | null): number | null {
  if (elements === null) return null;
  return elements.air + elements.fire + elements.earth + elements.water;
}

export function parseChangesOfMagic(text: string): string[] {
  if (text.trim() === "") return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function normalizeCompanionDescriptions(
  air: string,
  fire: string,
  earth: string,
  water: string,
): WizardCompanionDescriptions {
  return {
    air: normalizeScalarText(air),
    fire: normalizeScalarText(fire),
    earth: normalizeScalarText(earth),
    water: normalizeScalarText(water),
  };
}

function elementsEqual(
  a: WizardElementScores | null,
  b: WizardElementScores | null,
): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.air === b.air && a.fire === b.fire && a.earth === b.earth && a.water === b.water;
}

function companionDescriptionsEqual(
  a: WizardCompanionDescriptions,
  b: WizardCompanionDescriptions,
): boolean {
  return (
    a.air === b.air &&
    a.fire === b.fire &&
    a.earth === b.earth &&
    a.water === b.water
  );
}

function stringArraysEqual(
  a: readonly string[],
  b: readonly string[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function buildCharacterPatch(
  form: WizardCharacterSheetForm,
  baseline: WizardCharacterData,
): WizardCharacterPatch | null {
  const patch: Record<string, unknown> = {};

  const parsedAir = parseElementInput(form.elementsAir);
  const parsedFire = parseElementInput(form.elementsFire);
  const parsedEarth = parseElementInput(form.elementsEarth);
  const parsedWater = parseElementInput(form.elementsWater);

  const allBlank =
    parsedAir === null &&
    parsedFire === null &&
    parsedEarth === null &&
    parsedWater === null;

  let newElements: WizardElementScores | null;
  if (allBlank) {
    newElements = null;
  } else {
    newElements = {
      air: parsedAir ?? 0,
      fire: parsedFire ?? 0,
      earth: parsedEarth ?? 0,
      water: parsedWater ?? 0,
    };
  }

  if (!elementsEqual(newElements, baseline.elements)) {
    patch.elements = newElements;
  }

  const pactFragment = normalizeScalarText(form.pactFragmentPersonalForm);
  if (pactFragment !== baseline.pactFragmentPersonalForm) {
    patch.pactFragmentPersonalForm = pactFragment;
  }

  const familiar = normalizeScalarText(form.familiarDescription);
  if (familiar !== baseline.familiarDescription) {
    patch.familiarDescription = familiar;
  }

  const age = parseAgeInput(form.ageYears);
  if (age !== baseline.ageYears) {
    patch.ageYears = age;
  }

  const changes = parseChangesOfMagic(form.publicChangesOfMagic);
  if (!stringArraysEqual(changes, baseline.publicChangesOfMagic)) {
    patch.publicChangesOfMagic = changes;
  }

  const notes = normalizeScalarText(form.importantNotes);
  if (notes !== baseline.importantNotes) {
    patch.importantNotes = notes;
  }

  const companions = normalizeCompanionDescriptions(
    form.companionAir,
    form.companionFire,
    form.companionEarth,
    form.companionWater,
  );
  if (!companionDescriptionsEqual(companions, baseline.companionDescriptions)) {
    patch.companionDescriptions = companions;
  }

  if (Object.keys(patch).length === 0) return null;
  return patch as WizardCharacterPatch;
}
