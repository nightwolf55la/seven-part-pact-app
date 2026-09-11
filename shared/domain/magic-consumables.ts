/**
 * Narrow shared Tome/Reagent fungible ledger for later Sorcerer structure.
 *
 * Stacks are keyed by School or source Reagent plus custody. There is no
 * TomeId, Reagent instance identity, Place custody, or generic inventory.
 *
 * Campaign-created School existence is owned by F2 SorcererState. F1 validates
 * campaign School ID format only so the consumable type does not need redesign.
 */

import { DomainError } from "./errors";
import { isValidDenizenId, isValidWizardId } from "./ids";
import type { WizardOrDenizenSubjectRef } from "./shared-world";
import type {
  CampaignSchoolOfMagicId,
  SorcererSourceReagentId,
  SorcererSourceSchoolId,
} from "./sorcerer-catalogs";
import {
  isValidCampaignSchoolOfMagicId,
  isValidSorcererSourceReagentId,
  isValidSorcererSourceSchoolId,
} from "./sorcerer-catalogs";

export type MagicSchoolRef =
  | {
      readonly kind: "source";
      readonly schoolId: SorcererSourceSchoolId;
    }
  | {
      readonly kind: "campaign";
      readonly schoolId: CampaignSchoolOfMagicId;
    };

export type MagicConsumableCustody =
  | { readonly kind: "sorcerer_tower" }
  | { readonly kind: "subject"; readonly subject: WizardOrDenizenSubjectRef };

export interface TomeStack {
  readonly school: MagicSchoolRef;
  readonly custody: MagicConsumableCustody;
  readonly count: number;
}

export interface ReagentStack {
  readonly reagentId: SorcererSourceReagentId;
  readonly custody: MagicConsumableCustody;
  readonly count: number;
}

export interface MagicConsumablesState {
  readonly tomes: readonly TomeStack[];
  readonly reagents: readonly ReagentStack[];
}

export const EMPTY_MAGIC_CONSUMABLES_STATE: MagicConsumablesState = {
  tomes: [],
  reagents: [],
};

export function magicSchoolRefKey(school: MagicSchoolRef): string {
  return `${school.kind}:${school.schoolId}`;
}

export function magicConsumableCustodyKey(custody: MagicConsumableCustody): string {
  if (custody.kind === "sorcerer_tower") {
    return "sorcerer_tower";
  }
  if (custody.subject.kind === "wizard") {
    return `subject:wizard:${custody.subject.wizardId}`;
  }
  return `subject:denizen:${custody.subject.denizenId}`;
}

export function tomeStackKey(stack: TomeStack): string {
  return `${magicSchoolRefKey(stack.school)}|${magicConsumableCustodyKey(stack.custody)}`;
}

export function reagentStackKey(stack: ReagentStack): string {
  return `${stack.reagentId}|${magicConsumableCustodyKey(stack.custody)}`;
}

function requireRecord(path: string, value: unknown): Record<string, unknown> {
  if (value === null || value === undefined || typeof value !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireArray(path: string, value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be an array`);
  }
  return value;
}

function assertPositiveSafeInteger(path: string, value: unknown): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} must be a positive safe integer`);
  }
}

function validateSubjectRef(path: string, value: unknown): WizardOrDenizenSubjectRef {
  const ref = requireRecord(path, value);
  if (ref.kind === "wizard") {
    if (typeof ref.wizardId !== "string" || !isValidWizardId(ref.wizardId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.wizardId is invalid: ${JSON.stringify(ref.wizardId)}`);
    }
    return { kind: "wizard", wizardId: ref.wizardId };
  }
  if (ref.kind === "denizen") {
    if (typeof ref.denizenId !== "string" || !isValidDenizenId(ref.denizenId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.denizenId is invalid: ${JSON.stringify(ref.denizenId)}`);
    }
    return { kind: "denizen", denizenId: ref.denizenId };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(ref.kind)}`);
}

function validateCustody(path: string, value: unknown): MagicConsumableCustody {
  const custody = requireRecord(path, value);
  if (custody.kind === "sorcerer_tower") {
    return { kind: "sorcerer_tower" };
  }
  if (custody.kind === "subject") {
    return { kind: "subject", subject: validateSubjectRef(`${path}.subject`, custody.subject) };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(custody.kind)}`);
}

function validateSchoolRef(path: string, value: unknown): MagicSchoolRef {
  const school = requireRecord(path, value);
  if (school.kind === "source") {
    if (typeof school.schoolId !== "string" || !isValidSorcererSourceSchoolId(school.schoolId)) {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${path}.schoolId is not a known source School: ${JSON.stringify(school.schoolId)}`,
      );
    }
    return { kind: "source", schoolId: school.schoolId };
  }
  if (school.kind === "campaign") {
    if (typeof school.schoolId !== "string" || !isValidCampaignSchoolOfMagicId(school.schoolId)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.schoolId is invalid: ${JSON.stringify(school.schoolId)}`);
    }
    return { kind: "campaign", schoolId: school.schoolId };
  }
  throw new DomainError("INVALID_CAMPAIGN_STATE", `${path}.kind is invalid: ${JSON.stringify(school.kind)}`);
}

function validateTomeStack(path: string, value: unknown): TomeStack {
  const stack = requireRecord(path, value);
  const school = validateSchoolRef(`${path}.school`, stack.school);
  const custody = validateCustody(`${path}.custody`, stack.custody);
  assertPositiveSafeInteger(`${path}.count`, stack.count);
  return { school, custody, count: stack.count };
}

function validateReagentStack(path: string, value: unknown): ReagentStack {
  const stack = requireRecord(path, value);
  if (typeof stack.reagentId !== "string" || !isValidSorcererSourceReagentId(stack.reagentId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${path}.reagentId is not a known source Reagent: ${JSON.stringify(stack.reagentId)}`,
    );
  }
  const custody = validateCustody(`${path}.custody`, stack.custody);
  assertPositiveSafeInteger(`${path}.count`, stack.count);
  return { reagentId: stack.reagentId, custody, count: stack.count };
}

export function validateMagicConsumablesStructure(state: unknown): MagicConsumablesState {
  const record = requireRecord("magicConsumables", state);
  const tomesRaw = requireArray("magicConsumables.tomes", record.tomes);
  const reagentsRaw = requireArray("magicConsumables.reagents", record.reagents);

  const tomes: TomeStack[] = [];
  const tomeKeys = new Set<string>();
  for (let i = 0; i < tomesRaw.length; i++) {
    const stack = validateTomeStack(`magicConsumables.tomes[${i}]`, tomesRaw[i]);
    const key = tomeStackKey(stack);
    if (tomeKeys.has(key)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate tome stack for school+custody: ${key}`);
    }
    tomeKeys.add(key);
    tomes.push(stack);
  }

  const reagents: ReagentStack[] = [];
  const reagentKeys = new Set<string>();
  for (let i = 0; i < reagentsRaw.length; i++) {
    const stack = validateReagentStack(`magicConsumables.reagents[${i}]`, reagentsRaw[i]);
    const key = reagentStackKey(stack);
    if (reagentKeys.has(key)) {
      throw new DomainError("INVALID_CAMPAIGN_STATE", `Duplicate reagent stack for reagent+custody: ${key}`);
    }
    reagentKeys.add(key);
    reagents.push(stack);
  }

  return { tomes, reagents };
}
