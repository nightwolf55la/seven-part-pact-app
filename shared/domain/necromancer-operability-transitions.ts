import type { CampaignStateV5 } from "./campaign-state";
import type { DenizenId } from "./ids";
import { isValidDenizenId } from "./ids";
import { DomainError } from "./errors";
import type { NecromancerEvent } from "./events";
import type { ElementId } from "./shared-world";
import type {
  NecromancerArrangementId,
  NecromancerBuiltinGateId,
  NecromancerBuiltinPathSpaceId,
  NecromancerGateId,
  NecromancerGateStatus,
  NecromancerLawOfDeathId,
  NecromancerOccupiableSpaceRef,
} from "./necromancer-catalogs";
import {
  isValidNecromancerGateId,
  isValidNecromancerGateStatus,
  necromancerOccupiableSpaceRefsEqual,
} from "./necromancer-catalogs";
import type { NecromancerAllyState } from "./necromancer-state";
import { applyCreateDenizenV5Candidate } from "./world-subject-transitions";
import { applyCreatePowerfulDenizenProfile } from "./shared-state-transitions";
import { denizenHasBuiltinTaxonomy } from "./powerful-denizen-roles";
import {
  applyAddNecromancerAlly,
  applyInitializeNecromancer,
  applySetNecromancerSoulCount,
  canonicalizeInitializeNecromancerInput,
  canonicalizeNecromancerArrangementGhoulCallerBinding,
  canonicalizeNecromancerGhoulCallerProfileText,
} from "./necromancer-transitions";

export interface TransformNecromancerSoulIntoAllyInput {
  readonly denizenId: DenizenId;
  readonly name: string;
  readonly gateId: NecromancerGateId;
  readonly expectedSoulCount: number;
  readonly expectedGateStatus: NecromancerGateStatus;
}

export interface NecromancerOperabilityTransitionResult {
  readonly nextState: CampaignStateV5;
  readonly events: readonly NecromancerEvent[];
}

export function canonicalizeTransformNecromancerSoulIntoAllyInput(
  input: TransformNecromancerSoulIntoAllyInput,
): TransformNecromancerSoulIntoAllyInput {
  if (!isValidDenizenId(input.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${input.denizenId}`);
  }
  if (typeof input.name !== "string" || input.name.trim() === "") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Name must not be blank");
  }
  if (!isValidNecromancerGateId(input.gateId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Gate not found: ${input.gateId}`);
  }
  if (!Number.isSafeInteger(input.expectedSoulCount) || input.expectedSoulCount < 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "expected Soul count must be a non-negative safe integer");
  }
  if (!isValidNecromancerGateStatus(input.expectedGateStatus)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid Gate status: ${String(input.expectedGateStatus)}`);
  }
  return {
    denizenId: input.denizenId,
    name: input.name.trim(),
    gateId: input.gateId,
    expectedSoulCount: input.expectedSoulCount,
    expectedGateStatus: input.expectedGateStatus,
  };
}

export function applyTransformNecromancerSoulIntoAlly(
  state: CampaignStateV5,
  rawInput: TransformNecromancerSoulIntoAllyInput,
): NecromancerOperabilityTransitionResult {
  const input = canonicalizeTransformNecromancerSoulIntoAllyInput(rawInput);
  if (state.necromancer.gates.length === 0 && state.necromancer.pathSpaces.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Necromancer is not initialized");
  }
  const gate = state.necromancer.gates.find((candidate) => candidate.gateId === input.gateId);
  if (gate === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Gate not found: ${input.gateId}`);
  }
  if (gate.status !== input.expectedGateStatus) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Gate status: expected "${input.expectedGateStatus}" but current is "${gate.status}"`,
    );
  }
  if (gate.status !== "ordinary") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "Transform Soul into Ally is available only at an ordinary non-Hostile, non-Destroyed Gate",
    );
  }
  if (input.expectedSoulCount < 1) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Transform Soul into Ally requires at least one Soul at the Gate");
  }
  const currentSoulCount = state.necromancer.souls.find((soul) =>
    necromancerOccupiableSpaceRefsEqual(soul.location, { kind: "gate", gateId: input.gateId }),
  )?.count ?? 0;
  if (currentSoulCount !== input.expectedSoulCount) {
    throw new DomainError(
      "STALE_COMMAND_PRECONDITION",
      `Soul count: expected "${input.expectedSoulCount}" but current is "${currentSoulCount}"`,
    );
  }

  const location: NecromancerOccupiableSpaceRef = { kind: "gate", gateId: input.gateId };
  const created = applyCreateDenizenV5Candidate(state, {
    denizenId: input.denizenId,
    name: input.name,
    representation: "individual",
    description: null,
  });
  const consumed = applySetNecromancerSoulCount(
    created.nextState,
    location,
    input.expectedSoulCount,
    input.expectedSoulCount - 1,
  );
  const ally: NecromancerAllyState = { denizenId: input.denizenId, location };
  const added = applyAddNecromancerAlly(consumed.nextState, ally);
  const denizen = added.nextState.world.denizens.find((candidate) => candidate.denizenId === input.denizenId);
  return {
    nextState: added.nextState,
    events: [{
      type: "necromancer_soul_transformed_into_ally",
      version: 1,
      data: {
        denizenId: input.denizenId,
        denizenName: denizen?.name ?? input.name,
        gateId: input.gateId,
        previousSoulCount: input.expectedSoulCount,
        newSoulCount: input.expectedSoulCount - 1,
        expectedGateStatus: input.expectedGateStatus,
      },
    }],
  };
}

export interface NecromancerSourceSetupNamedFoe {
  readonly denizenId: DenizenId;
  readonly name: string;
  readonly gateId: NecromancerBuiltinGateId;
}

export interface NecromancerSourceSetupNamedAlly {
  readonly denizenId: DenizenId;
  readonly name: string;
  readonly gateId: NecromancerBuiltinGateId;
}

export interface NecromancerSourceSetupNamedGhoulCaller {
  readonly denizenId: DenizenId;
  readonly name: string;
  readonly pathSpaceId: NecromancerBuiltinPathSpaceId;
  readonly primaryElement: ElementId;
  readonly aesthetic: string;
  readonly strangeQuirk: string;
  readonly ageYears: number;
}

/**
 * SOURCE: Gates arrangement creates and names starting Foes and the Ally
 * during setup. Explosive also places a Disruptive Ghoul-Caller.
 * APPLICATION DESIGN: proposed Denizen IDs are the identity. Names are
 * create-payload text only. Existing IDs are reused; labels are never
 * matched. Ordinary in-Death starting Foes do not receive a Powerful
 * profile. Explosive Ghoul-Caller receives its complete constrained
 * Powerful profile atomically. This is not a generic Powerful-create path.
 */
export interface InitializeNecromancerSourceSetupInput {
  readonly arrangementId: NecromancerArrangementId;
  readonly selectedLawIds: readonly NecromancerLawOfDeathId[];
  readonly arrangementFoes: readonly NecromancerSourceSetupNamedFoe[];
  readonly arrangementAlly: NecromancerSourceSetupNamedAlly;
  readonly arrangementGhoulCaller: NecromancerSourceSetupNamedGhoulCaller | null;
}

function normalizeStartingName(raw: string, label: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label} must not be blank`);
  }
  return trimmed;
}

export function canonicalizeInitializeNecromancerSourceSetupInput(
  input: InitializeNecromancerSourceSetupInput,
): InitializeNecromancerSourceSetupInput {
  const core = canonicalizeInitializeNecromancerInput({
    arrangementId: input.arrangementId,
    selectedLawIds: input.selectedLawIds,
    arrangementFoes: input.arrangementFoes.map((foe) => ({
      denizenId: foe.denizenId,
      gateId: foe.gateId,
    })),
    arrangementAlly: {
      denizenId: input.arrangementAlly.denizenId,
      gateId: input.arrangementAlly.gateId,
    },
    arrangementGhoulCaller: input.arrangementGhoulCaller === null
      ? null
      : canonicalizeNecromancerArrangementGhoulCallerBinding({
          denizenId: input.arrangementGhoulCaller.denizenId,
          pathSpaceId: input.arrangementGhoulCaller.pathSpaceId,
          primaryElement: input.arrangementGhoulCaller.primaryElement,
          aesthetic: input.arrangementGhoulCaller.aesthetic,
          strangeQuirk: input.arrangementGhoulCaller.strangeQuirk,
          ageYears: input.arrangementGhoulCaller.ageYears,
        }),
  });
  return {
    arrangementId: core.arrangementId,
    selectedLawIds: core.selectedLawIds,
    arrangementFoes: core.arrangementFoes.map((foe, index) => ({
      denizenId: foe.denizenId,
      name: normalizeStartingName(input.arrangementFoes[index]?.name ?? "", `arrangementFoes[${index}].name`),
      gateId: foe.gateId,
    })),
    arrangementAlly: {
      denizenId: core.arrangementAlly.denizenId,
      name: normalizeStartingName(input.arrangementAlly.name, "arrangementAlly.name"),
      gateId: core.arrangementAlly.gateId,
    },
    arrangementGhoulCaller: core.arrangementGhoulCaller === null || input.arrangementGhoulCaller === null
      ? null
      : {
          denizenId: core.arrangementGhoulCaller.denizenId,
          name: normalizeStartingName(input.arrangementGhoulCaller.name, "arrangementGhoulCaller.name"),
          pathSpaceId: core.arrangementGhoulCaller.pathSpaceId,
          primaryElement: core.arrangementGhoulCaller.primaryElement,
          aesthetic: core.arrangementGhoulCaller.aesthetic,
          strangeQuirk: core.arrangementGhoulCaller.strangeQuirk,
          ageYears: core.arrangementGhoulCaller.ageYears,
        },
  };
}

function realizeStartingIndividualDenizen(
  state: CampaignStateV5,
  denizenId: DenizenId,
  name: string,
  label: string,
): CampaignStateV5 {
  if (!isValidDenizenId(denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${label}.denizenId is invalid: ${JSON.stringify(denizenId)}`);
  }
  const existing = state.world.denizens.find((denizen) => denizen.denizenId === denizenId);
  if (existing !== undefined) {
    if (existing.representation !== "individual") {
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `${label} has a contradictory existing authoritative binding`,
      );
    }
    return state;
  }
  return applyCreateDenizenV5Candidate(state, {
    denizenId,
    name,
    representation: "individual",
    description: null,
  }).nextState;
}

function realizeExplosiveGhoulCaller(
  state: CampaignStateV5,
  binding: NecromancerSourceSetupNamedGhoulCaller,
): CampaignStateV5 {
  const next = realizeStartingIndividualDenizen(
    state,
    binding.denizenId,
    binding.name,
    "arrangementGhoulCaller",
  );
  const denizen = next.world.denizens.find((candidate) => candidate.denizenId === binding.denizenId);
  if (denizen === undefined) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `arrangementGhoulCaller.denizenId does not resolve: ${binding.denizenId}`);
  }
  if (denizen.powerfulProfile === null) {
    return applyCreatePowerfulDenizenProfile(next, {
      denizenId: binding.denizenId,
      taxonomies: [{ kind: "builtin", taxonomyId: "ghoul_caller" }],
      status: { kind: "standard", value: "disruptive" },
      goal: null,
    }).nextState;
  }
  const disruptive =
    denizen.powerfulProfile.status.kind === "standard" &&
    denizen.powerfulProfile.status.value === "disruptive";
  if (!denizenHasBuiltinTaxonomy(denizen, "ghoul_caller") || !disruptive) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      "arrangementGhoulCaller has a contradictory existing authoritative binding",
    );
  }
  return next;
}

export function applyInitializeNecromancerSourceSetup(
  state: CampaignStateV5,
  rawInput: InitializeNecromancerSourceSetupInput,
): NecromancerOperabilityTransitionResult {
  const input = canonicalizeInitializeNecromancerSourceSetupInput(rawInput);
  if (
    state.necromancer.gates.length !== 0 ||
    state.necromancer.pathSpaces.length !== 0 ||
    state.necromancer.foes.length !== 0
  ) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Necromancer is already initialized");
  }

  let working = state;
  for (const [index, foe] of input.arrangementFoes.entries()) {
    working = realizeStartingIndividualDenizen(
      working,
      foe.denizenId,
      foe.name,
      `arrangementFoes[${index}]`,
    );
  }
  working = realizeStartingIndividualDenizen(
    working,
    input.arrangementAlly.denizenId,
    input.arrangementAlly.name,
    "arrangementAlly",
  );
  if (input.arrangementGhoulCaller !== null) {
    canonicalizeNecromancerGhoulCallerProfileText(input.arrangementGhoulCaller.aesthetic, "Aesthetic");
    canonicalizeNecromancerGhoulCallerProfileText(input.arrangementGhoulCaller.strangeQuirk, "Strange Quirk");
    working = realizeExplosiveGhoulCaller(working, input.arrangementGhoulCaller);
  }

  const initialized = applyInitializeNecromancer(working, {
    arrangementId: input.arrangementId,
    selectedLawIds: input.selectedLawIds,
    arrangementFoes: input.arrangementFoes.map((foe) => ({
      denizenId: foe.denizenId,
      gateId: foe.gateId,
    })),
    arrangementAlly: {
      denizenId: input.arrangementAlly.denizenId,
      gateId: input.arrangementAlly.gateId,
    },
    arrangementGhoulCaller: input.arrangementGhoulCaller === null
      ? null
      : {
          denizenId: input.arrangementGhoulCaller.denizenId,
          pathSpaceId: input.arrangementGhoulCaller.pathSpaceId,
          primaryElement: input.arrangementGhoulCaller.primaryElement,
          aesthetic: input.arrangementGhoulCaller.aesthetic,
          strangeQuirk: input.arrangementGhoulCaller.strangeQuirk,
          ageYears: input.arrangementGhoulCaller.ageYears,
        },
  });
  return {
    nextState: initialized.nextState,
    events: initialized.events.filter((event): event is NecromancerEvent => event.type === "necromancer_initialized"),
  };
}
