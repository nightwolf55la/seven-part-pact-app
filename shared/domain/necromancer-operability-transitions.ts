import type { CampaignStateV5 } from "./campaign-state";
import type { DenizenId } from "./ids";
import { isValidDenizenId } from "./ids";
import { DomainError } from "./errors";
import type { NecromancerEvent } from "./events";
import type { NecromancerGateId, NecromancerGateStatus, NecromancerOccupiableSpaceRef } from "./necromancer-catalogs";
import {
  isValidNecromancerGateId,
  isValidNecromancerGateStatus,
  necromancerOccupiableSpaceRefsEqual,
} from "./necromancer-catalogs";
import type { NecromancerAllyState } from "./necromancer-state";
import { applyCreateDenizenV5Candidate } from "./world-subject-transitions";
import {
  applyAddNecromancerAlly,
  applySetNecromancerSoulCount,
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
