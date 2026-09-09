import type { Brand } from "./brand";
import type { PactSeatId } from "./pact-seats";

/**
 * Necromancer static source catalogs for the Draft-4 Gates of Death.
 *
 * SOURCE: eleven named Gates, unnamed occupiable path spaces at the Edge of
 * Life / Far Lands / Abyss, and two terminal exits that are not occupiable.
 *
 * APPLICATION DESIGN: Gate identities persist independently of directed
 * topology steps. Bounded topology editing may disconnect or reconnect a Gate
 * and may mark it destroyed; deleting a Gate identity is deferred to
 * whole-Domain replacement.
 */

export const NECROMANCER_GATE_STATUS_VALUES = ["ordinary", "hostile", "destroyed"] as const;
export type NecromancerGateStatus = (typeof NECROMANCER_GATE_STATUS_VALUES)[number];

export const NECROMANCER_GATE_BANDS = ["near", "far", "furthest"] as const;
export type NecromancerGateBand = (typeof NECROMANCER_GATE_BANDS)[number];

export const NECROMANCER_PATH_REGIONS = ["edge_of_life", "far_lands", "abyss"] as const;
export type NecromancerPathRegion = (typeof NECROMANCER_PATH_REGIONS)[number];

export const NECROMANCER_GHOUL_CALLER_DISPOSITIONS = ["reliable", "disruptive"] as const;
export type NecromancerGhoulCallerDisposition = (typeof NECROMANCER_GHOUL_CALLER_DISPOSITIONS)[number];

export const NECROMANCER_ABOMINATION_KINDS = ["occult", "brutal", "manipulative"] as const;
export type NecromancerAbominationKind = (typeof NECROMANCER_ABOMINATION_KINDS)[number];

export const NECROMANCER_LAW_VISIBILITIES = ["revealed", "hidden"] as const;
export type NecromancerLawVisibility = (typeof NECROMANCER_LAW_VISIBILITIES)[number];

export const NECROMANCER_BUILTIN_GATE_IDS = [
  "amber",
  "bronze",
  "lead",
  "ivory",
  "antimony",
  "marching",
  "churning",
  "weeping",
  "howling",
  "deep",
  "terminus",
] as const;

export type NecromancerBuiltinGateId = (typeof NECROMANCER_BUILTIN_GATE_IDS)[number];

export type NecromancerCampaignGateId = Brand<string, "NecromancerCampaignGateId">;
export type NecromancerGateId = NecromancerBuiltinGateId | NecromancerCampaignGateId;

export const NECROMANCER_EDGE_PATH_SPACE_IDS = [
  "edge_sage",
  "edge_hierophant",
  "edge_warlock",
  "edge_mariner",
  "edge_faustian",
  "edge_sorcerer",
] as const;

export type NecromancerEdgePathSpaceId = (typeof NECROMANCER_EDGE_PATH_SPACE_IDS)[number];

export const NECROMANCER_FAR_LANDS_PATH_SPACE_IDS = [
  "far_amber",
  "far_bronze",
  "far_lead",
  "far_ivory",
  "far_antimony",
] as const;

export type NecromancerFarLandsPathSpaceId = (typeof NECROMANCER_FAR_LANDS_PATH_SPACE_IDS)[number];

export const NECROMANCER_ABYSS_PATH_SPACE_IDS = [
  "abyss_marching",
  "abyss_churning",
  "abyss_weeping_upper",
  "abyss_weeping_lower",
] as const;

export type NecromancerAbyssPathSpaceId = (typeof NECROMANCER_ABYSS_PATH_SPACE_IDS)[number];

export const NECROMANCER_BUILTIN_PATH_SPACE_IDS = [
  ...NECROMANCER_EDGE_PATH_SPACE_IDS,
  ...NECROMANCER_FAR_LANDS_PATH_SPACE_IDS,
  ...NECROMANCER_ABYSS_PATH_SPACE_IDS,
] as const;

export type NecromancerBuiltinPathSpaceId = (typeof NECROMANCER_BUILTIN_PATH_SPACE_IDS)[number];

export type NecromancerCampaignPathSpaceId = Brand<string, "NecromancerCampaignPathSpaceId">;
export type NecromancerPathSpaceId = NecromancerBuiltinPathSpaceId | NecromancerCampaignPathSpaceId;

export const NECROMANCER_TERMINAL_EXIT_IDS = ["void_beyond", "final_death"] as const;
export type NecromancerTerminalExitId = (typeof NECROMANCER_TERMINAL_EXIT_IDS)[number];

export const NECROMANCER_LAW_OF_DEATH_IDS = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
] as const;

export type NecromancerLawOfDeathId = (typeof NECROMANCER_LAW_OF_DEATH_IDS)[number];

export const NECROMANCER_ARRANGEMENT_IDS = ["quiet", "dynamic", "explosive"] as const;
export type NecromancerArrangementId = (typeof NECROMANCER_ARRANGEMENT_IDS)[number];

export type NecromancerOccupiableSpaceRef =
  | { readonly kind: "gate"; readonly gateId: NecromancerGateId }
  | { readonly kind: "path"; readonly pathSpaceId: NecromancerPathSpaceId };

export type NecromancerStepTarget =
  | NecromancerOccupiableSpaceRef
  | { readonly kind: "terminal"; readonly terminalId: NecromancerTerminalExitId };

export interface NecromancerDirectedStep {
  readonly from: NecromancerOccupiableSpaceRef;
  readonly to: NecromancerStepTarget;
}

export interface NecromancerBuiltinGateDefinition {
  readonly gateId: NecromancerBuiltinGateId;
  readonly romanNumeral: "I" | "II" | "III" | "IV" | "V" | "VI" | "VII" | "VIII" | "IX" | "X" | "XI";
  readonly displayName: string;
  readonly band: NecromancerGateBand;
}

export interface NecromancerBuiltinPathSpaceDefinition {
  readonly pathSpaceId: NecromancerBuiltinPathSpaceId;
  readonly region: NecromancerPathRegion;
  /** Application label; source path spaces are unnamed. */
  readonly applicationLabel: string;
  readonly associatedSeatId?: PactSeatId;
}

export interface NecromancerTerminalExitDefinition {
  readonly terminalId: NecromancerTerminalExitId;
  readonly applicationLabel: string;
}

export interface NecromancerLawOfDeathDefinition {
  readonly id: NecromancerLawOfDeathId;
  /** Application ordinal label; not a source title. */
  readonly applicationLabel: string;
  /** Draft-4 source Law text. */
  readonly text: string;
}

export interface NecromancerArrangementDefinition {
  readonly arrangementId: NecromancerArrangementId;
  readonly displayName: string;
  readonly hostileBuiltinGateIds: readonly NecromancerBuiltinGateId[];
  readonly foeCount: number;
  readonly requiredFoeGateIds: readonly NecromancerBuiltinGateId[];
  readonly additionalFoeFarGateCount: number;
  readonly allyCount: number;
  readonly allyPlacement: "any_near_gate";
  readonly ghoulCaller: {
    readonly disposition: "disruptive";
    readonly location: "any_edge_of_life";
  } | null;
  /**
   * APPLICATION DESIGN: each Present NON-NECROMANCER Pact seat that has an
   * Edge-of-Life position. Source text says "for each Wizard Present".
   */
  readonly soulPerPresentNonNecromancerEdge: boolean;
  readonly quietEdgeSoulGateIds: readonly NecromancerBuiltinGateId[] | null;
  readonly quietFarLandSoulGateIds: readonly NecromancerBuiltinGateId[] | null;
  readonly quietGateSoulGateIds: readonly NecromancerBuiltinGateId[] | null;
  readonly soulInEachOtherwiseEmptyGate: boolean;
  /**
   * APPLICATION DESIGN: persist the Explosive step-6 Soul only for Gates with
   * an occupiable persistent space farther beyond them. Do not persist a Soul
   * beyond Howling or Terminus.
   */
  readonly soulBeyondEachGateWithFurtherOccupiableSpace: boolean;
}

export const NECROMANCER_BUILTIN_GATE_DEFINITIONS: readonly NecromancerBuiltinGateDefinition[] = [
  { gateId: "amber", romanNumeral: "I", displayName: "Amber", band: "near" },
  { gateId: "bronze", romanNumeral: "II", displayName: "Bronze", band: "near" },
  { gateId: "lead", romanNumeral: "III", displayName: "Lead", band: "near" },
  { gateId: "ivory", romanNumeral: "IV", displayName: "Ivory", band: "near" },
  { gateId: "antimony", romanNumeral: "V", displayName: "Antimony", band: "near" },
  { gateId: "marching", romanNumeral: "VI", displayName: "Marching", band: "far" },
  { gateId: "churning", romanNumeral: "VII", displayName: "Churning", band: "far" },
  { gateId: "weeping", romanNumeral: "VIII", displayName: "Weeping", band: "far" },
  { gateId: "howling", romanNumeral: "IX", displayName: "Howling", band: "far" },
  { gateId: "deep", romanNumeral: "X", displayName: "Deep", band: "furthest" },
  { gateId: "terminus", romanNumeral: "XI", displayName: "Terminus", band: "furthest" },
];

export const NECROMANCER_BUILTIN_PATH_SPACE_DEFINITIONS: readonly NecromancerBuiltinPathSpaceDefinition[] = [
  { pathSpaceId: "edge_sage", region: "edge_of_life", applicationLabel: "Sage Edge of Life", associatedSeatId: "sage" },
  { pathSpaceId: "edge_hierophant", region: "edge_of_life", applicationLabel: "Hierophant Edge of Life", associatedSeatId: "hierophant" },
  { pathSpaceId: "edge_warlock", region: "edge_of_life", applicationLabel: "Warlock Edge of Life", associatedSeatId: "warlock" },
  { pathSpaceId: "edge_mariner", region: "edge_of_life", applicationLabel: "Mariner Edge of Life", associatedSeatId: "mariner" },
  { pathSpaceId: "edge_faustian", region: "edge_of_life", applicationLabel: "Faustian Edge of Life", associatedSeatId: "faustian" },
  { pathSpaceId: "edge_sorcerer", region: "edge_of_life", applicationLabel: "Sorcerer Edge of Life", associatedSeatId: "sorcerer" },
  { pathSpaceId: "far_amber", region: "far_lands", applicationLabel: "Amber Far Lands" },
  { pathSpaceId: "far_bronze", region: "far_lands", applicationLabel: "Bronze Far Lands" },
  { pathSpaceId: "far_lead", region: "far_lands", applicationLabel: "Lead Far Lands" },
  { pathSpaceId: "far_ivory", region: "far_lands", applicationLabel: "Ivory Far Lands" },
  { pathSpaceId: "far_antimony", region: "far_lands", applicationLabel: "Antimony Far Lands" },
  { pathSpaceId: "abyss_marching", region: "abyss", applicationLabel: "Marching Abyss" },
  { pathSpaceId: "abyss_churning", region: "abyss", applicationLabel: "Churning Abyss" },
  { pathSpaceId: "abyss_weeping_upper", region: "abyss", applicationLabel: "Weeping Abyss (Upper)" },
  { pathSpaceId: "abyss_weeping_lower", region: "abyss", applicationLabel: "Weeping Abyss (Lower)" },
];

export const NECROMANCER_TERMINAL_EXIT_DEFINITIONS: readonly NecromancerTerminalExitDefinition[] = [
  { terminalId: "void_beyond", applicationLabel: "The Void Beyond" },
  { terminalId: "final_death", applicationLabel: "The Final Death" },
];

const LAW_OF_DEATH_APPLICATION_LABELS: Record<NecromancerLawOfDeathId, string> = {
  first: "First Law of Death",
  second: "Second Law of Death",
  third: "Third Law of Death",
  fourth: "Fourth Law of Death",
  fifth: "Fifth Law of Death",
  sixth: "Sixth Law of Death",
  seventh: "Seventh Law of Death",
};

const LAW_OF_DEATH_SOURCE_TEXT: Record<NecromancerLawOfDeathId, string> = {
  first: "Do not eat the food of the dead or drink their water.",
  second: "Do not reveal your name to the dead or look into their eyes.",
  third: "Do not touch the skin of the dead or embrace them.",
  fourth: "Do not look behind yourself or witness your own shadow.",
  fifth: "Do not travel death without a spectral guide or familiar.",
  sixth: "Do not laugh or smile within death.",
  seventh: "Do not spill blood within death.",
};

export const NECROMANCER_LAW_OF_DEATH_DEFINITIONS: readonly NecromancerLawOfDeathDefinition[] =
  NECROMANCER_LAW_OF_DEATH_IDS.map((id) => ({
    id,
    applicationLabel: LAW_OF_DEATH_APPLICATION_LABELS[id],
    text: LAW_OF_DEATH_SOURCE_TEXT[id],
  }));

function gateRef(gateId: NecromancerBuiltinGateId): NecromancerOccupiableSpaceRef {
  return { kind: "gate", gateId };
}

function pathRef(pathSpaceId: NecromancerBuiltinPathSpaceId): NecromancerOccupiableSpaceRef {
  return { kind: "path", pathSpaceId };
}

function internalStep(
  from: NecromancerOccupiableSpaceRef,
  to: NecromancerOccupiableSpaceRef,
): NecromancerDirectedStep {
  return { from, to };
}

function terminalStep(
  from: NecromancerOccupiableSpaceRef,
  terminalId: NecromancerTerminalExitId,
): NecromancerDirectedStep {
  return { from, to: { kind: "terminal", terminalId } };
}

/** Default closer -> further occupiable connectivity. Count: 31. */
export const NECROMANCER_DEFAULT_INTERNAL_STEPS: readonly NecromancerDirectedStep[] = [
  internalStep(pathRef("edge_sage"), gateRef("amber")),
  internalStep(pathRef("edge_hierophant"), gateRef("amber")),
  internalStep(pathRef("edge_hierophant"), gateRef("bronze")),
  internalStep(pathRef("edge_warlock"), gateRef("bronze")),
  internalStep(pathRef("edge_warlock"), gateRef("lead")),
  internalStep(pathRef("edge_mariner"), gateRef("lead")),
  internalStep(pathRef("edge_mariner"), gateRef("ivory")),
  internalStep(pathRef("edge_faustian"), gateRef("ivory")),
  internalStep(pathRef("edge_faustian"), gateRef("antimony")),
  internalStep(pathRef("edge_sorcerer"), gateRef("antimony")),
  internalStep(gateRef("amber"), pathRef("far_amber")),
  internalStep(gateRef("bronze"), pathRef("far_bronze")),
  internalStep(gateRef("lead"), pathRef("far_lead")),
  internalStep(gateRef("ivory"), pathRef("far_ivory")),
  internalStep(gateRef("antimony"), pathRef("far_antimony")),
  internalStep(pathRef("far_amber"), gateRef("marching")),
  internalStep(pathRef("far_bronze"), gateRef("marching")),
  internalStep(pathRef("far_bronze"), gateRef("churning")),
  internalStep(pathRef("far_lead"), gateRef("churning")),
  internalStep(pathRef("far_lead"), gateRef("weeping")),
  internalStep(pathRef("far_ivory"), gateRef("weeping")),
  internalStep(pathRef("far_ivory"), gateRef("howling")),
  internalStep(pathRef("far_antimony"), gateRef("howling")),
  internalStep(gateRef("marching"), pathRef("abyss_marching")),
  internalStep(pathRef("abyss_marching"), gateRef("deep")),
  internalStep(gateRef("churning"), pathRef("abyss_churning")),
  internalStep(pathRef("abyss_churning"), gateRef("deep")),
  internalStep(gateRef("weeping"), pathRef("abyss_weeping_upper")),
  internalStep(pathRef("abyss_weeping_upper"), pathRef("abyss_weeping_lower")),
  internalStep(pathRef("abyss_weeping_lower"), gateRef("terminus")),
  internalStep(gateRef("deep"), gateRef("terminus")),
];

/** Terminal exits are not occupiable spaces. Count: 2. */
export const NECROMANCER_DEFAULT_TERMINAL_EXITS: readonly NecromancerDirectedStep[] = [
  terminalStep(gateRef("howling"), "void_beyond"),
  terminalStep(gateRef("terminus"), "final_death"),
];

export const NECROMANCER_DEFAULT_DIRECTED_STEPS: readonly NecromancerDirectedStep[] = [
  ...NECROMANCER_DEFAULT_INTERNAL_STEPS,
  ...NECROMANCER_DEFAULT_TERMINAL_EXITS,
];

export const NECROMANCER_ARRANGEMENT_DEFINITIONS: readonly NecromancerArrangementDefinition[] = [
  {
    arrangementId: "quiet",
    displayName: "Quiet Arrangement",
    hostileBuiltinGateIds: [],
    foeCount: 2,
    requiredFoeGateIds: ["deep", "terminus"],
    additionalFoeFarGateCount: 0,
    allyCount: 1,
    allyPlacement: "any_near_gate",
    ghoulCaller: null,
    soulPerPresentNonNecromancerEdge: false,
    quietEdgeSoulGateIds: ["amber", "bronze", "lead", "ivory"],
    quietFarLandSoulGateIds: ["marching", "churning"],
    quietGateSoulGateIds: ["deep"],
    soulInEachOtherwiseEmptyGate: false,
    soulBeyondEachGateWithFurtherOccupiableSpace: false,
  },
  {
    arrangementId: "dynamic",
    displayName: "Dynamic Arrangement",
    hostileBuiltinGateIds: ["deep"],
    foeCount: 3,
    requiredFoeGateIds: ["deep", "terminus"],
    additionalFoeFarGateCount: 1,
    allyCount: 1,
    allyPlacement: "any_near_gate",
    ghoulCaller: null,
    soulPerPresentNonNecromancerEdge: true,
    quietEdgeSoulGateIds: null,
    quietFarLandSoulGateIds: null,
    quietGateSoulGateIds: null,
    soulInEachOtherwiseEmptyGate: true,
    soulBeyondEachGateWithFurtherOccupiableSpace: false,
  },
  {
    arrangementId: "explosive",
    displayName: "Explosive Arrangement",
    hostileBuiltinGateIds: ["deep", "terminus"],
    foeCount: 4,
    requiredFoeGateIds: ["deep", "terminus"],
    additionalFoeFarGateCount: 2,
    allyCount: 1,
    allyPlacement: "any_near_gate",
    ghoulCaller: { disposition: "disruptive", location: "any_edge_of_life" },
    soulPerPresentNonNecromancerEdge: true,
    quietEdgeSoulGateIds: null,
    quietFarLandSoulGateIds: null,
    quietGateSoulGateIds: null,
    soulInEachOtherwiseEmptyGate: true,
    soulBeyondEachGateWithFurtherOccupiableSpace: true,
  },
];

const BRANDED_UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const CAMPAIGN_GATE_ID_REGEX = new RegExp(`^ngt_${BRANDED_UUID}$`);
const CAMPAIGN_PATH_SPACE_ID_REGEX = new RegExp(`^nps_${BRANDED_UUID}$`);

const BUILTIN_GATE_ID_SET = new Set<string>(NECROMANCER_BUILTIN_GATE_IDS);
const BUILTIN_PATH_SPACE_ID_SET = new Set<string>(NECROMANCER_BUILTIN_PATH_SPACE_IDS);
const EDGE_PATH_SPACE_ID_SET = new Set<string>(NECROMANCER_EDGE_PATH_SPACE_IDS);
const TERMINAL_EXIT_ID_SET = new Set<string>(NECROMANCER_TERMINAL_EXIT_IDS);
const GATE_STATUS_SET = new Set<string>(NECROMANCER_GATE_STATUS_VALUES);
const GATE_BAND_SET = new Set<string>(NECROMANCER_GATE_BANDS);
const PATH_REGION_SET = new Set<string>(NECROMANCER_PATH_REGIONS);

export function isValidNecromancerBuiltinGateId(value: string): value is NecromancerBuiltinGateId {
  return BUILTIN_GATE_ID_SET.has(value);
}

export function isValidNecromancerCampaignGateId(value: string): value is NecromancerCampaignGateId {
  return CAMPAIGN_GATE_ID_REGEX.test(value);
}

export function isValidNecromancerGateId(value: string): value is NecromancerGateId {
  return isValidNecromancerBuiltinGateId(value) || isValidNecromancerCampaignGateId(value);
}

export function isValidNecromancerBuiltinPathSpaceId(value: string): value is NecromancerBuiltinPathSpaceId {
  return BUILTIN_PATH_SPACE_ID_SET.has(value);
}

export function isValidNecromancerCampaignPathSpaceId(value: string): value is NecromancerCampaignPathSpaceId {
  return CAMPAIGN_PATH_SPACE_ID_REGEX.test(value);
}

export function isValidNecromancerPathSpaceId(value: string): value is NecromancerPathSpaceId {
  return isValidNecromancerBuiltinPathSpaceId(value) || isValidNecromancerCampaignPathSpaceId(value);
}

export function isValidNecromancerTerminalExitId(value: string): value is NecromancerTerminalExitId {
  return TERMINAL_EXIT_ID_SET.has(value);
}

export function isValidNecromancerLawOfDeathId(value: string): value is NecromancerLawOfDeathId {
  return (NECROMANCER_LAW_OF_DEATH_IDS as readonly string[]).includes(value);
}

export function isValidNecromancerArrangementId(value: string): value is NecromancerArrangementId {
  return (NECROMANCER_ARRANGEMENT_IDS as readonly string[]).includes(value);
}

export function isValidNecromancerGateStatus(value: string): value is NecromancerGateStatus {
  return GATE_STATUS_SET.has(value);
}

export function isValidNecromancerGateBand(value: string): value is NecromancerGateBand {
  return GATE_BAND_SET.has(value);
}

export function isValidNecromancerPathRegion(value: string): value is NecromancerPathRegion {
  return PATH_REGION_SET.has(value);
}

export function isValidNecromancerGhoulCallerDisposition(value: string): value is NecromancerGhoulCallerDisposition {
  return (NECROMANCER_GHOUL_CALLER_DISPOSITIONS as readonly string[]).includes(value);
}

export function isValidNecromancerAbominationKind(value: string): value is NecromancerAbominationKind {
  return (NECROMANCER_ABOMINATION_KINDS as readonly string[]).includes(value);
}

export function isValidNecromancerLawVisibility(value: string): value is NecromancerLawVisibility {
  return (NECROMANCER_LAW_VISIBILITIES as readonly string[]).includes(value);
}

export function isBuiltinEdgeOfLifePathSpaceId(value: string): value is NecromancerEdgePathSpaceId {
  return EDGE_PATH_SPACE_ID_SET.has(value);
}

export function necromancerBuiltinGateDefinition(
  gateId: NecromancerBuiltinGateId,
): NecromancerBuiltinGateDefinition {
  const found = NECROMANCER_BUILTIN_GATE_DEFINITIONS.find((d) => d.gateId === gateId);
  if (found === undefined) {
    throw new Error(`Unknown built-in Gate id: ${gateId}`);
  }
  return found;
}

export function necromancerBuiltinPathSpaceDefinition(
  pathSpaceId: NecromancerBuiltinPathSpaceId,
): NecromancerBuiltinPathSpaceDefinition {
  const found = NECROMANCER_BUILTIN_PATH_SPACE_DEFINITIONS.find((d) => d.pathSpaceId === pathSpaceId);
  if (found === undefined) {
    throw new Error(`Unknown built-in path-space id: ${pathSpaceId}`);
  }
  return found;
}

export function necromancerArrangementDefinition(
  arrangementId: string,
): NecromancerArrangementDefinition | undefined {
  return NECROMANCER_ARRANGEMENT_DEFINITIONS.find((d) => d.arrangementId === arrangementId);
}

export function necromancerOccupiableSpaceRefsEqual(
  a: NecromancerOccupiableSpaceRef,
  b: NecromancerOccupiableSpaceRef,
): boolean {
  if (a.kind !== b.kind) {
    return false;
  }
  if (a.kind === "gate" && b.kind === "gate") {
    return a.gateId === b.gateId;
  }
  if (a.kind === "path" && b.kind === "path") {
    return a.pathSpaceId === b.pathSpaceId;
  }
  return false;
}

export function necromancerStepTargetsEqual(a: NecromancerStepTarget, b: NecromancerStepTarget): boolean {
  if (a.kind === "terminal" || b.kind === "terminal") {
    return a.kind === "terminal" && b.kind === "terminal" && a.terminalId === b.terminalId;
  }
  return necromancerOccupiableSpaceRefsEqual(a, b);
}

export function necromancerDirectedStepsEqual(a: NecromancerDirectedStep, b: NecromancerDirectedStep): boolean {
  return necromancerOccupiableSpaceRefsEqual(a.from, b.from) && necromancerStepTargetsEqual(a.to, b.to);
}

export function necromancerDirectedStepKey(step: NecromancerDirectedStep): string {
  const fromKey = step.from.kind === "gate" ? `gate:${step.from.gateId}` : `path:${step.from.pathSpaceId}`;
  const toKey =
    step.to.kind === "terminal"
      ? `terminal:${step.to.terminalId}`
      : step.to.kind === "gate"
        ? `gate:${step.to.gateId}`
        : `path:${step.to.pathSpaceId}`;
  return `${fromKey}->${toKey}`;
}
