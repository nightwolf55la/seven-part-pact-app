import type { DenizenId, WizardId } from "./ids";
import type { PactSeatId } from "./pact-seats";
import type { ElementId, WizardOrDenizenSubjectRef } from "./shared-world";
import type { PowerfulDenizenTruthEntry } from "./powerful-denizen";
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
  NECROMANCER_DEFAULT_INTERNAL_STEPS,
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

export type NecromancerFoeSubjectRef = WizardOrDenizenSubjectRef;

export interface NecromancerDenizenFoeState {
  readonly subject: {
    readonly kind: "denizen";
    readonly denizenId: DenizenId;
  };
  readonly location: NecromancerFoeLocation;
}

export interface NecromancerWizardFoeState {
  readonly subject: {
    readonly kind: "wizard";
    readonly wizardId: WizardId;
  };
  readonly location: NecromancerFoeLocation;
  readonly truths: readonly PowerfulDenizenTruthEntry[];
}

export type NecromancerFoeState = NecromancerDenizenFoeState | NecromancerWizardFoeState;

export const NECROMANCER_WIZARD_TRAVERSAL_KINDS = ["living_katabasis", "deceased_peaceful"] as const;

export type NecromancerWizardTraversalKind =
  (typeof NECROMANCER_WIZARD_TRAVERSAL_KINDS)[number];

export interface NecromancerWizardTraversalState {
  readonly wizardId: WizardId;
  readonly kind: NecromancerWizardTraversalKind;
  readonly location: NecromancerOccupiableSpaceRef;
}

export function necromancerFoeSubjectKey(subject: NecromancerFoeSubjectRef): string {
  return subject.kind === "wizard" ? `wizard:${subject.wizardId}` : `denizen:${subject.denizenId}`;
}

export function necromancerFoeSubjectsEqual(
  left: NecromancerFoeSubjectRef,
  right: NecromancerFoeSubjectRef,
): boolean {
  return necromancerFoeSubjectKey(left) === necromancerFoeSubjectKey(right);
}

export function isNecromancerWizardFoe(foe: NecromancerFoeState): foe is NecromancerWizardFoeState {
  return foe.subject.kind === "wizard";
}

export function isNecromancerDenizenFoe(foe: NecromancerFoeState): foe is NecromancerDenizenFoeState {
  return foe.subject.kind === "denizen";
}

export function isValidNecromancerWizardTraversalKind(
  value: string,
): value is NecromancerWizardTraversalKind {
  return (NECROMANCER_WIZARD_TRAVERSAL_KINDS as readonly string[]).includes(value);
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
  readonly primaryElement: ElementId;
  readonly aesthetic: string;
  readonly strangeQuirk: string;
  readonly ageYears: number;
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
  readonly wizardTraversals: readonly NecromancerWizardTraversalState[];
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
  wizardTraversals: [],
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
  readonly wizardTraversals?: readonly NecromancerWizardTraversalState[];
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
    steps: input.steps ?? [...NECROMANCER_DEFAULT_INTERNAL_STEPS, ...(input.extraSteps ?? [])],
    souls: input.souls ?? [],
    foes: input.foes ?? [],
    allies: input.allies ?? [],
    ghoulCallers: input.ghoulCallers ?? [],
    selectedLaws: input.selectedLaws ?? [],
    depth: input.depth ?? null,
    wizardTraversals: input.wizardTraversals ?? [],
  };
}

export type { NecromancerGateId, NecromancerPathSpaceId };
