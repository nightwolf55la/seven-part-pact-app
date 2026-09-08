import type {
  WizardCharacterData,
  WizardElementScores,
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
  };
}

export function parseElementInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isSafeInteger(n)) return null;
  return n;
}

export interface ElementValidationResult {
  readonly valid: boolean;
  readonly value: WizardElementScores | null;
}

export function validateElementInputs(
  air: string,
  fire: string,
  earth: string,
  water: string,
): ElementValidationResult {
  const raws = [air, fire, earth, water];
  const blanks = raws.map((r) => r.trim() === "");

  if (blanks.every((b) => b)) {
    return { valid: true, value: null };
  }

  if (blanks.some((b) => b)) {
    return { valid: false, value: null };
  }

  const parsed = raws.map((r) => {
    const n = Number(r.trim());
    return Number.isSafeInteger(n) ? n : null;
  });

  if (parsed.some((p) => p === null)) {
    return { valid: false, value: null };
  }

  return {
    valid: true,
    value: {
      air: parsed[0]!,
      fire: parsed[1]!,
      earth: parsed[2]!,
      water: parsed[3]!,
    },
  };
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

function elementsEqual(
  a: WizardElementScores | null,
  b: WizardElementScores | null,
): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.air === b.air && a.fire === b.fire && a.earth === b.earth && a.water === b.water;
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

export function isCharacterFormDirty(
  form: WizardCharacterSheetForm,
  baseline: WizardCharacterData,
): boolean {
  const baselineForm = formFromCharacter(baseline);
  const keys = Object.keys(form) as (keyof WizardCharacterSheetForm)[];
  for (const key of keys) {
    if (form[key] !== baselineForm[key]) return true;
  }
  return false;
}

export function buildCharacterPatch(
  form: WizardCharacterSheetForm,
  baseline: WizardCharacterData,
): WizardCharacterPatch | null {
  const patch: Record<string, unknown> = {};

  const elemValidation = validateElementInputs(
    form.elementsAir,
    form.elementsFire,
    form.elementsEarth,
    form.elementsWater,
  );
  const newElements: WizardElementScores | null = elemValidation.value;

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

  if (Object.keys(patch).length === 0) return null;
  return patch as WizardCharacterPatch;
}

export function buildNullableAssociationChange(
  expected: string | null,
  value: string | null,
): { expected: string | null; value: string | null } | null {
  if (expected === value) return null;
  return { expected, value };
}

export interface CompanionSlotRelationship {
  readonly companionRelationshipId: string;
  readonly denizenId: string;
  readonly denizenName: string;
  readonly description: string | null;
}

export interface CompanionSlot {
  readonly element: "air" | "fire" | "earth" | "water";
  readonly relationship: CompanionSlotRelationship | null;
}

interface CompanionRelationshipInput {
  readonly companionRelationshipId: string;
  readonly wizardId: string;
  readonly element: "air" | "fire" | "earth" | "water";
  readonly denizenId: string;
  readonly description: string | null;
  readonly status: "current" | "ended";
}

interface DenizenInput {
  readonly denizenId: string;
  readonly name: string;
}

export function buildCurrentCompanionSlots(
  wizardId: string,
  denizens: readonly DenizenInput[],
  relationships: readonly CompanionRelationshipInput[],
): readonly CompanionSlot[] {
  const denizenMap = new Map<string, string>();
  for (const d of denizens) {
    denizenMap.set(d.denizenId, d.name);
  }

  const currentByElement = new Map<
    "air" | "fire" | "earth" | "water",
    CompanionRelationshipInput
  >();

  for (const r of relationships) {
    if (r.wizardId !== wizardId) continue;
    if (r.status !== "current") continue;
    currentByElement.set(r.element, r);
  }

  const elements: readonly ("air" | "fire" | "earth" | "water")[] = [
    "air",
    "fire",
    "earth",
    "water",
  ];

  return elements.map((element) => {
    const r = currentByElement.get(element);
    if (!r) return { element, relationship: null };
    return {
      element,
      relationship: {
        companionRelationshipId: r.companionRelationshipId,
        denizenId: r.denizenId,
        denizenName: denizenMap.get(r.denizenId) ?? "Unknown Denizen",
        description: r.description,
      },
    };
  });
}

export function buildCompanionAssignmentChange(
  expectedCurrentRelationshipId: string | null,
  denizenId: string,
  descriptionInput: string,
): {
  expectedCurrentRelationshipId: string | null;
  newRelationship: {
    denizenId: string;
    description: string | null;
  };
} {
  return {
    expectedCurrentRelationshipId,
    newRelationship: {
      denizenId,
      description: descriptionInput === "" ? null : descriptionInput,
    },
  };
}

export function buildCompanionDescriptionChange(
  companionRelationshipId: string,
  expectedDescription: string | null,
  draftDescription: string,
): {
  companionRelationshipId: string;
  expectedStatus: "current";
  description: { expected: string | null; value: string | null };
} | null {
  const converted = draftDescription === "" ? null : draftDescription;
  if (converted === expectedDescription) return null;
  return {
    companionRelationshipId,
    expectedStatus: "current",
    description: {
      expected: expectedDescription,
      value: converted,
    },
  };
}
