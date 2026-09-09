import type { DenizenId, WizardId } from "./ids";
import type { PactSeatId } from "./pact-seats";
import type {
  NecromancerAbominationKind,
  NecromancerBuiltinGateId,
  NecromancerBuiltinPathSpaceId,
  NecromancerCampaignGateId,
  NecromancerCampaignPathSpaceId,
  NecromancerDirectedStep,
  NecromancerGateBand,
  NecromancerGateId,
  NecromancerGateStatus,
  NecromancerGhoulCallerDisposition,
  NecromancerLawOfDeathId,
  NecromancerLawVisibility,
  NecromancerOccupiableSpaceRef,
  NecromancerPathRegion,
  NecromancerPathSpaceId,
} from "./necromancer-catalogs";
import {
  NECROMANCER_BUILTIN_GATE_IDS,
  NECROMANCER_BUILTIN_PATH_SPACE_IDS,
  NECROMANCER_DEFAULT_DIRECTED_STEPS,
} from "./necromancer-catalogs";

/**
 * Depth is character-specific travel state owned by a Wizard identity.
 * It is not an unowned scalar and is not transferred silently between
 * predecessor and successor Necromancers.
 */
export interface NecromancerDepthState {
  readonly wizardId: WizardId;
  readonly value: number;
}

export interface NecromancerSelectedLaw {
  readonly lawId: NecromancerLawOfDeathId;
  readonly visibility: NecromancerLawVisibility;
}

/**
 * Built-in Gate identity. Name, numeral, and band live in the static catalog.
 * Status is persisted per represented Gate. The identity itself is not a
 * casually removable topology node.
 */
export interface NecromancerBuiltinGateState {
  readonly origin: "builtin";
  readonly gateId: NecromancerBuiltinGateId;
  readonly status: NecromancerGateStatus;
}

export interface NecromancerCampaignGateState {
  readonly origin: "campaign";
  readonly gateId: NecromancerCampaignGateId;
  readonly name: string;
  readonly band: NecromancerGateBand;
  readonly status: NecromancerGateStatus;
}

export type NecromancerGateState = NecromancerBuiltinGateState | NecromancerCampaignGateState;

export interface NecromancerBuiltinPathSpaceState {
  readonly origin: "builtin";
  readonly pathSpaceId: NecromancerBuiltinPathSpaceId;
}

export interface NecromancerCampaignPathSpaceState {
  readonly origin: "campaign";
  readonly pathSpaceId: NecromancerCampaignPathSpaceId;
  readonly region: NecromancerPathRegion;
}

export type NecromancerPathSpaceState =
  | NecromancerBuiltinPathSpaceState
  | NecromancerCampaignPathSpaceState;

export interface NecromancerSoulCount {
  readonly location: NecromancerOccupiableSpaceRef;
  readonly count: number;
}

export type NecromancerFoeLocation =
  | NecromancerOccupiableSpaceRef
  | {
      readonly kind: "escaped";
      readonly seatId: PactSeatId;
      readonly abominationKind: NecromancerAbominationKind;
    };

export interface NecromancerFoeState {
  readonly denizenId: DenizenId;
  readonly location: NecromancerFoeLocation;
}

export interface NecromancerAllyState {
  readonly denizenId: DenizenId;
  readonly location: NecromancerOccupiableSpaceRef;
}

export interface NecromancerGhoulCallerState {
  readonly denizenId: DenizenId;
  readonly disposition: NecromancerGhoulCallerDisposition;
  readonly location: { readonly kind: "path"; readonly pathSpaceId: NecromancerPathSpaceId };
  readonly pettyDeadCount: number;
}

export interface NecromancerState {
  readonly gates: readonly NecromancerGateState[];
  readonly pathSpaces: readonly NecromancerPathSpaceState[];
  readonly steps: readonly NecromancerDirectedStep[];
  readonly souls: readonly NecromancerSoulCount[];
  readonly foes: readonly NecromancerFoeState[];
  readonly allies: readonly NecromancerAllyState[];
  readonly ghoulCallers: readonly NecromancerGhoulCallerState[];
  readonly selectedLaws: readonly NecromancerSelectedLaw[];
  readonly depth: NecromancerDepthState | null;
}

export const EMPTY_NECROMANCER_STATE: NecromancerState = {
  gates: [],
  pathSpaces: [],
  steps: [],
  souls: [],
  foes: [],
  allies: [],
  ghoulCallers: [],
  selectedLaws: [],
  depth: null,
};

export interface InitializedDefaultNecromancerInput {
  readonly gateStatuses?: Partial<Record<NecromancerBuiltinGateId, NecromancerGateStatus>>;
  readonly campaignGates?: readonly NecromancerCampaignGateState[];
  readonly campaignPathSpaces?: readonly NecromancerCampaignPathSpaceState[];
  readonly extraSteps?: readonly NecromancerDirectedStep[];
  readonly steps?: readonly NecromancerDirectedStep[];
  readonly souls?: readonly NecromancerSoulCount[];
  readonly foes?: readonly NecromancerFoeState[];
  readonly allies?: readonly NecromancerAllyState[];
  readonly ghoulCallers?: readonly NecromancerGhoulCallerState[];
  readonly selectedLaws?: readonly NecromancerSelectedLaw[];
  readonly depth?: NecromancerDepthState | null;
}

export function buildInitializedDefaultNecromancerState(
  input: InitializedDefaultNecromancerInput = {},
): NecromancerState {
  const builtinGates: NecromancerBuiltinGateState[] = NECROMANCER_BUILTIN_GATE_IDS.map((gateId) => ({
    origin: "builtin",
    gateId,
    status: input.gateStatuses?.[gateId] ?? "ordinary",
  }));
  const builtinPathSpaces: NecromancerBuiltinPathSpaceState[] = NECROMANCER_BUILTIN_PATH_SPACE_IDS.map(
    (pathSpaceId) => ({
      origin: "builtin",
      pathSpaceId,
    }),
  );
  return {
    gates: [...builtinGates, ...(input.campaignGates ?? [])],
    pathSpaces: [...builtinPathSpaces, ...(input.campaignPathSpaces ?? [])],
    steps: input.steps ?? [...NECROMANCER_DEFAULT_DIRECTED_STEPS, ...(input.extraSteps ?? [])],
    souls: input.souls ?? [],
    foes: input.foes ?? [],
    allies: input.allies ?? [],
    ghoulCallers: input.ghoulCallers ?? [],
    selectedLaws: input.selectedLaws ?? [],
    depth: input.depth ?? null,
  };
}

export type { NecromancerGateId, NecromancerPathSpaceId };
