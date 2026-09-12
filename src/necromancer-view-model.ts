import {
  EMPTY_NECROMANCER_STATE,
  NECROMANCER_ABOMINATION_KINDS,
  NECROMANCER_ARRANGEMENT_DEFINITIONS,
  NECROMANCER_BUILTIN_GATE_DEFINITIONS,
  NECROMANCER_BUILTIN_GATE_IDS,
  NECROMANCER_BUILTIN_PATH_SPACE_DEFINITIONS,
  NECROMANCER_BUILTIN_PATH_SPACE_IDS,
  NECROMANCER_DEFAULT_TERMINAL_EXITS,
  NECROMANCER_EDGE_PATH_SPACE_IDS,
  NECROMANCER_GATE_BANDS,
  NECROMANCER_GATE_STATUS_VALUES,
  NECROMANCER_GHOUL_CALLER_DISPOSITIONS,
  NECROMANCER_LAW_OF_DEATH_DEFINITIONS,
  NECROMANCER_LAW_VISIBILITIES,
  NECROMANCER_PATH_REGIONS,
  PACT_SEAT_IDS,
  ELEMENT_IDS,
  canonicalizeInitializeNecromancerInput,
  canonicalizeNecromancerGhoulCaller,
  canonicalizeNecromancerGhoulCallerProfileText,
  canonicalizeUpdateNecromancerGhoulCallerFields,
  denizenHasBuiltinTaxonomy,
  isBuiltinEdgeOfLifePathSpaceId,
  isValidNecromancerAbominationKind,
  isValidNecromancerArrangementId,
  isValidNecromancerBuiltinGateId,
  isValidNecromancerBuiltinPathSpaceId,
  isValidNecromancerCampaignGateId,
  isValidNecromancerCampaignPathSpaceId,
  isValidNecromancerGateBand,
  isValidNecromancerGateStatus,
  isValidNecromancerLawOfDeathId,
  isValidNecromancerPathRegion,
  isValidPactSeatId,
  necromancerArrangementDefinition,
  necromancerBuiltinGateDefinition,
  necromancerBuiltinPathSpaceDefinition,
  necromancerDirectedStepsEqual,
  necromancerOccupiableSpaceRefsEqual,
  necromancerFoeSubjectKey,
  isNecromancerWizardFoe,
  isNecromancerDenizenFoe,
  isReliableOrDisruptiveStatus,
  pactSeatDisplayName,
  type NecromancerAbominationKind,
  type NecromancerAllyState,
  type NecromancerArrangementId,
  type NecromancerBuiltinGateId,
  type NecromancerBuiltinPathSpaceId,
  type NecromancerCampaignGateId,
  type NecromancerCampaignGateState,
  type NecromancerCampaignPathSpaceId,
  type NecromancerCampaignPathSpaceState,
  type NecromancerDepthState,
  type NecromancerDirectedStep,
  type ElementId,
  type NecromancerFoeLocation,
  type NecromancerFoeState,
  type NecromancerFoeSubjectRef,
  type NecromancerWizardFoeState,
  type NecromancerWizardTraversalState,
  type UpdateNecromancerWizardTraversalFields,
  type NecromancerGateBand,
  type NecromancerGateId,
  type NecromancerGateState,
  type NecromancerGateStatus,
  type NecromancerGhoulCallerState,
  type PowerfulDenizenStatus,
  type NecromancerLawOfDeathId,
  type NecromancerLawVisibility,
  type NecromancerOccupiableSpaceRef,
  type NecromancerPathRegion,
  type NecromancerPathSpaceId,
  type NecromancerPathSpaceState,
  type NecromancerSelectedLaw,
  type NecromancerState,
  type NecromancerTerminalExitId,
  type PactSeatId,
  type UpdateNecromancerAllyFields,
  type UpdateNecromancerCampaignGateFields,
  type UpdateNecromancerFoeFields,
  type UpdateNecromancerGhoulCallerFields,
  type SorcererExternalPresence,
} from "../shared/domain";
import type { DenizenRef, IsleRef, PlaceRef } from "./WorldSurface";

export interface NecromancerWizardRef {
  readonly wizardId: string;
  readonly name: string;
  readonly homeIsleId: string | null;
  readonly sanctumPlaceId: string | null;
  readonly mortalityState?: "not_deceased" | "deceased";
}

export interface NecromancerWizardNameRef {
  readonly wizardId: string;
  readonly name: string;
  readonly mortalityState: "not_deceased" | "deceased";
}

export interface MapPoint {
  readonly x: number;
  readonly y: number;
}

export const NECROMANCER_ARRANGEMENT_OPTIONS = NECROMANCER_ARRANGEMENT_DEFINITIONS;
export const NECROMANCER_LAW_OPTIONS = NECROMANCER_LAW_OF_DEATH_DEFINITIONS;
export const NECROMANCER_NEAR_BUILTIN_GATE_IDS = NECROMANCER_BUILTIN_GATE_DEFINITIONS
  .filter((gate) => gate.band === "near")
  .map((gate) => gate.gateId);
export const NECROMANCER_FAR_BUILTIN_GATE_IDS = NECROMANCER_BUILTIN_GATE_DEFINITIONS
  .filter((gate) => gate.band === "far")
  .map((gate) => gate.gateId);
export const NECROMANCER_FURTHEST_BUILTIN_GATE_IDS = NECROMANCER_BUILTIN_GATE_DEFINITIONS
  .filter((gate) => gate.band === "furthest")
  .map((gate) => gate.gateId);

export const NECROMANCER_BOARD_VIEWBOX = { width: 1000, height: 980 } as const;

/**
 * APPLICATION PRESENTATION based on the Draft-4 Materials board.
 * These coordinates are not game topology and are not persisted.
 */
export const NECROMANCER_BUILTIN_GATE_MAP_POINTS: Record<NecromancerBuiltinGateId, MapPoint> = {
  amber: { x: 140, y: 200 },
  bronze: { x: 310, y: 200 },
  lead: { x: 480, y: 200 },
  ivory: { x: 650, y: 200 },
  antimony: { x: 820, y: 200 },
  marching: { x: 200, y: 480 },
  churning: { x: 400, y: 480 },
  weeping: { x: 600, y: 480 },
  howling: { x: 800, y: 480 },
  deep: { x: 300, y: 780 },
  terminus: { x: 700, y: 780 },
};

/**
 * APPLICATION PRESENTATION based on the Draft-4 Materials board.
 * These coordinates are not game topology and are not persisted.
 */
export const NECROMANCER_BUILTIN_PATH_MAP_POINTS: Record<NecromancerBuiltinPathSpaceId, MapPoint> = {
  edge_sage: { x: 80, y: 70 },
  edge_hierophant: { x: 230, y: 70 },
  edge_warlock: { x: 380, y: 70 },
  edge_mariner: { x: 530, y: 70 },
  edge_faustian: { x: 680, y: 70 },
  edge_sorcerer: { x: 830, y: 70 },
  far_amber: { x: 140, y: 340 },
  far_bronze: { x: 310, y: 340 },
  far_lead: { x: 480, y: 340 },
  far_ivory: { x: 650, y: 340 },
  far_antimony: { x: 820, y: 340 },
  abyss_marching: { x: 200, y: 620 },
  abyss_churning: { x: 400, y: 620 },
  abyss_weeping_upper: { x: 600, y: 600 },
  abyss_weeping_lower: { x: 680, y: 700 },
};

/**
 * APPLICATION PRESENTATION based on the Draft-4 Materials board.
 * Static terminal destinations are catalog facts, not occupiable spaces.
 */
export const NECROMANCER_TERMINAL_MAP_POINTS: Record<NecromancerTerminalExitId, MapPoint> = {
  void_beyond: { x: 920, y: 560 },
  final_death: { x: 880, y: 880 },
};

export const NECROMANCER_BOARD_BAND_LABELS: readonly {
  readonly text: string;
  readonly x: number;
  readonly y: number;
}[] = [
  { text: "Edge of Life — Depth 1", x: 20, y: 36 },
  { text: "Far Lands — Depth 2", x: 20, y: 310 },
  { text: "Abyss — Depth 3", x: 20, y: 590 },
];

export interface NecromancerStaticTerminalPresentation {
  readonly from: NecromancerOccupiableSpaceRef;
  readonly terminalId: NecromancerTerminalExitId;
  readonly fromPoint: MapPoint;
  readonly toPoint: MapPoint;
  readonly label: string;
}

export const NECROMANCER_STATIC_TERMINAL_PRESENTATIONS: readonly NecromancerStaticTerminalPresentation[] =
  NECROMANCER_DEFAULT_TERMINAL_EXITS.map((exit) => ({
    from: exit.from,
    terminalId: exit.to.terminalId,
    fromPoint: presentationPointForOccupiable(exit.from)!,
    toPoint: NECROMANCER_TERMINAL_MAP_POINTS[exit.to.terminalId],
    label: terminalDisplayName(exit.to.terminalId),
  }));

export function isNecromancerInitialized(necromancer: NecromancerState): boolean {
  return (
    necromancer.gates.length > 0 ||
    necromancer.pathSpaces.length > 0 ||
    necromancer.steps.length > 0 ||
    necromancer.souls.length > 0 ||
    necromancer.foes.length > 0 ||
    necromancer.allies.length > 0 ||
    necromancer.ghoulCallers.length > 0 ||
    necromancer.selectedLaws.length > 0 ||
    necromancer.wizardTraversals.length > 0 ||
    necromancer.depth !== null
  );
}

export function newCommandId(uuid: string = crypto.randomUUID()): string {
  return `cmd_${uuid}`;
}

export function newDenizenId(uuid: string = crypto.randomUUID()): string {
  return `den_${uuid}`;
}

export function newCampaignGateId(uuid: string = crypto.randomUUID()): string {
  return `ngt_${uuid}`;
}

export function newCampaignPathSpaceId(uuid: string = crypto.randomUUID()): string {
  return `nps_${uuid}`;
}

export function parseNonNegInt(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : null;
}

export const NECROMANCER_PRIMARY_ELEMENT_OPTIONS = ELEMENT_IDS;

export function elementDisplayName(element: ElementId): string {
  if (element === "air") return "Air";
  if (element === "fire") return "Fire";
  if (element === "earth") return "Earth";
  return "Water";
}

export function ghoulCallerProfileLines(ghoul: NecromancerGhoulCallerState): readonly string[] {
  return [
    `Primary Element ${elementDisplayName(ghoul.primaryElement)}`,
    `Aesthetic ${ghoul.aesthetic}`,
    `Strange Quirk ${ghoul.strangeQuirk}`,
    `Age ${ghoul.ageYears}`,
  ];
}

export function denizenName(denizens: readonly DenizenRef[], denizenId: string): string {
  const found = denizens.find((denizen) => denizen.denizenId === denizenId);
  return found === undefined ? "Unknown Denizen" : found.name;
}

export function worldIsleName(isles: readonly IsleRef[], isleId: string | null): string {
  if (isleId === null) return "None";
  const found = isles.find((isle) => isle.isleId === isleId);
  return found === undefined ? "Unknown Isle" : found.name;
}

export function placeName(places: readonly PlaceRef[], placeId: string | null): string {
  if (placeId === null) return "None";
  const found = places.find((place) => place.placeId === placeId);
  return found === undefined ? "Unknown Place" : found.name;
}

export function terminalDisplayName(terminalId: NecromancerTerminalExitId): string {
  if (terminalId === "void_beyond") return "Void Beyond";
  return "Final Death";
}

export function pathRegionLabel(region: NecromancerPathRegion): string {
  if (region === "edge_of_life") return "Edge of Life";
  if (region === "far_lands") return "Far Lands";
  return "Abyss";
}

export function gateBandLabel(band: NecromancerGateBand): string {
  if (band === "near") return "Near";
  if (band === "far") return "Far";
  return "Furthest";
}

export function gateStatusLabel(status: NecromancerGateStatus): string {
  if (status === "ordinary") return "ordinary";
  if (status === "hostile") return "hostile";
  return "destroyed";
}

export function gateDisplayName(gate: NecromancerGateState): string {
  if (gate.origin === "builtin") {
    return necromancerBuiltinGateDefinition(gate.gateId).displayName;
  }
  return gate.name;
}

export function pathSpaceDisplayName(path: NecromancerPathSpaceState): string {
  if (path.origin === "builtin") {
    return necromancerBuiltinPathSpaceDefinition(path.pathSpaceId).applicationLabel;
  }
  return `Campaign ${pathRegionLabel(path.region)} · ${path.pathSpaceId}`;
}

export function occupiableSpaceLabel(
  ref: NecromancerOccupiableSpaceRef,
  necromancer: Pick<NecromancerState, "gates" | "pathSpaces">,
): string {
  if (ref.kind === "gate") {
    const gate = necromancer.gates.find((candidate) => candidate.gateId === ref.gateId);
    if (gate !== undefined) return gateDisplayName(gate);
    if (isValidNecromancerBuiltinGateId(ref.gateId)) {
      return necromancerBuiltinGateDefinition(ref.gateId).displayName;
    }
    return ref.gateId;
  }
  const path = necromancer.pathSpaces.find((candidate) => candidate.pathSpaceId === ref.pathSpaceId);
  if (path !== undefined) return pathSpaceDisplayName(path);
  if (isValidNecromancerBuiltinPathSpaceId(ref.pathSpaceId)) {
    return necromancerBuiltinPathSpaceDefinition(ref.pathSpaceId).applicationLabel;
  }
  return ref.pathSpaceId;
}

export function foeLocationLabel(
  location: NecromancerFoeLocation,
  necromancer: Pick<NecromancerState, "gates" | "pathSpaces">,
): string {
  if (location.kind === "escaped") {
    return `Escaped to ${pactSeatDisplayName(location.seatId)} (${location.abominationKind})`;
  }
  return occupiableSpaceLabel(location, necromancer);
}

export function roleLocationLabel(
  location: NecromancerOccupiableSpaceRef,
  necromancer: Pick<NecromancerState, "gates" | "pathSpaces">,
): string {
  return occupiableSpaceLabel(location, necromancer);
}

export function occupiableRefKey(ref: NecromancerOccupiableSpaceRef): string {
  return ref.kind === "gate" ? `gate:${ref.gateId}` : `path:${ref.pathSpaceId}`;
}

export function parseOccupiableRefKey(key: string): NecromancerOccupiableSpaceRef | null {
  if (key.startsWith("gate:")) {
    const gateId = key.slice("gate:".length);
    return gateId === "" ? null : { kind: "gate", gateId: gateId as NecromancerGateId };
  }
  if (key.startsWith("path:")) {
    const pathSpaceId = key.slice("path:".length);
    return pathSpaceId === "" ? null : { kind: "path", pathSpaceId: pathSpaceId as NecromancerPathSpaceId };
  }
  return null;
}

export function presentationPointForOccupiable(ref: NecromancerOccupiableSpaceRef): MapPoint | null {
  if (ref.kind === "gate") {
    if (!isValidNecromancerBuiltinGateId(ref.gateId)) return null;
    return NECROMANCER_BUILTIN_GATE_MAP_POINTS[ref.gateId];
  }
  if (!isValidNecromancerBuiltinPathSpaceId(ref.pathSpaceId)) return null;
  return NECROMANCER_BUILTIN_PATH_MAP_POINTS[ref.pathSpaceId];
}

export function hasFixedBoardPresentationPoint(ref: NecromancerOccupiableSpaceRef): boolean {
  return presentationPointForOccupiable(ref) !== null;
}

export function builtinInternalStepPresentation(
  step: NecromancerDirectedStep,
): { readonly a: MapPoint; readonly b: MapPoint } | null {
  const a = presentationPointForOccupiable(step.from);
  const b = presentationPointForOccupiable(step.to);
  if (a === null || b === null) return null;
  return { a, b };
}

export function isBuiltinOccupiable(ref: NecromancerOccupiableSpaceRef): boolean {
  if (ref.kind === "gate") return isValidNecromancerBuiltinGateId(ref.gateId);
  return isValidNecromancerBuiltinPathSpaceId(ref.pathSpaceId);
}

export function soulCountAt(
  souls: readonly NecromancerState["souls"][number][],
  location: NecromancerOccupiableSpaceRef,
): number {
  const row = souls.find((entry) => necromancerOccupiableSpaceRefsEqual(entry.location, location));
  return row?.count ?? 0;
}

export function foesAtSpace(
  foes: readonly NecromancerFoeState[],
  location: NecromancerOccupiableSpaceRef,
): NecromancerFoeState[] {
  return foes.filter(
    (foe) => foe.location.kind !== "escaped" && necromancerOccupiableSpaceRefsEqual(foe.location, location),
  );
}

export function alliesAtSpace(
  allies: readonly NecromancerAllyState[],
  location: NecromancerOccupiableSpaceRef,
): NecromancerAllyState[] {
  return allies.filter((ally) => necromancerOccupiableSpaceRefsEqual(ally.location, location));
}

export function ghoulCallersAtSpace(
  ghoulCallers: readonly NecromancerGhoulCallerState[],
  location: NecromancerOccupiableSpaceRef,
): NecromancerGhoulCallerState[] {
  return ghoulCallers.filter((ghoul) => necromancerOccupiableSpaceRefsEqual(ghoul.location, location));
}

export function piecesAtSpace(
  necromancer: NecromancerState,
  location: NecromancerOccupiableSpaceRef,
): {
  readonly souls: number;
  readonly foes: readonly NecromancerFoeState[];
  readonly allies: readonly NecromancerAllyState[];
  readonly ghoulCallers: readonly NecromancerGhoulCallerState[];
  readonly wizardTraversals: readonly NecromancerWizardTraversalState[];
} {
  return {
    souls: soulCountAt(necromancer.souls, location),
    foes: foesAtSpace(necromancer.foes, location),
    allies: alliesAtSpace(necromancer.allies, location),
    ghoulCallers: ghoulCallersAtSpace(necromancer.ghoulCallers, location),
    wizardTraversals: necromancer.wizardTraversals.filter((traversal) =>
      necromancerOccupiableSpaceRefsEqual(traversal.location, location),
    ),
  };
}

export function escapedFoes(foes: readonly NecromancerFoeState[]): NecromancerFoeState[] {
  return foes.filter((foe) => foe.location.kind === "escaped");
}

export interface EscapedFoeGroup {
  readonly seatId: PactSeatId;
  readonly domainLabel: string;
  readonly foes: readonly NecromancerFoeState[];
}

export function escapedFoesGroupedBySeat(foes: readonly NecromancerFoeState[]): EscapedFoeGroup[] {
  const escaped = escapedFoes(foes);
  const groups: EscapedFoeGroup[] = [];
  for (const seatId of PACT_SEAT_IDS) {
    if (seatId === "necromancer") continue;
    const seatFoes = escaped.filter((foe) => foe.location.kind === "escaped" && foe.location.seatId === seatId);
    if (seatFoes.length === 0) continue;
    groups.push({
      seatId,
      domainLabel: pactSeatDisplayName(seatId),
      foes: seatFoes,
    });
  }
  return groups;
}

export function otherPactSeatOptions(): PactSeatId[] {
  return PACT_SEAT_IDS.filter((seatId) => seatId !== "necromancer");
}

export function activeOccupiableSpaces(necromancer: NecromancerState): NecromancerOccupiableSpaceRef[] {
  return [
    ...necromancer.gates.map((gate) => ({ kind: "gate" as const, gateId: gate.gateId })),
    ...necromancer.pathSpaces.map((path) => ({ kind: "path" as const, pathSpaceId: path.pathSpaceId })),
  ];
}

export function activeBuiltinEdgePathSpaces(necromancer: NecromancerState): NecromancerBuiltinPathSpaceId[] {
  return necromancer.pathSpaces
    .filter((path) => isBuiltinEdgeOfLifePathSpaceId(path.pathSpaceId))
    .map((path) => path.pathSpaceId as NecromancerBuiltinPathSpaceId);
}

export function activeEdgeOfLifePathSpaces(necromancer: NecromancerState): NecromancerPathSpaceState[] {
  return necromancer.pathSpaces.filter((path) => {
    if (path.origin === "builtin") return isBuiltinEdgeOfLifePathSpaceId(path.pathSpaceId);
    return path.region === "edge_of_life";
  });
}

export function nearGateOptions(necromancer: NecromancerState): NecromancerGateState[] {
  return necromancer.gates.filter((gate) => gateBandOf(gate) === "near");
}

export function farGateOptions(necromancer: NecromancerState): NecromancerGateState[] {
  return necromancer.gates.filter((gate) => gateBandOf(gate) === "far");
}

export function gateBandOf(gate: NecromancerGateState): NecromancerGateBand {
  if (gate.origin === "campaign") return gate.band;
  return necromancerBuiltinGateDefinition(gate.gateId).band;
}

export function campaignGates(necromancer: Pick<NecromancerState, "gates">): NecromancerCampaignGateState[] {
  return necromancer.gates.filter((gate): gate is NecromancerCampaignGateState => gate.origin === "campaign");
}

export function campaignPathSpaces(necromancer: Pick<NecromancerState, "pathSpaces">): NecromancerCampaignPathSpaceState[] {
  return necromancer.pathSpaces.filter(
    (path): path is NecromancerCampaignPathSpaceState => path.origin === "campaign",
  );
}

export interface CampaignStructureInspectTarget {
  readonly kind: "gate" | "path";
  readonly selection: NecromancerOccupiableSpaceRef;
  readonly label: string;
}

export function campaignStructureInspectTargets(
  necromancer: Pick<NecromancerState, "gates" | "pathSpaces">,
): CampaignStructureInspectTarget[] {
  return [
    ...campaignGates(necromancer).map((gate) => ({
      kind: "gate" as const,
      selection: { kind: "gate" as const, gateId: gate.gateId },
      label: gateDisplayName(gate),
    })),
    ...campaignPathSpaces(necromancer).map((path) => ({
      kind: "path" as const,
      selection: { kind: "path" as const, pathSpaceId: path.pathSpaceId },
      label: pathSpaceDisplayName(path),
    })),
  ];
}

export function resolveOccupiableSelection(
  selection: NecromancerOccupiableSpaceRef | null,
  necromancer: Pick<NecromancerState, "gates" | "pathSpaces">,
): NecromancerOccupiableSpaceRef | null {
  if (selection === null) return null;
  if (selection.kind === "gate") {
    return necromancer.gates.some((gate) => gate.gateId === selection.gateId) ? selection : null;
  }
  return necromancer.pathSpaces.some((path) => path.pathSpaceId === selection.pathSpaceId) ? selection : null;
}

export function stepsInvolvingCustomNodes(necromancer: NecromancerState): NecromancerDirectedStep[] {
  return necromancer.steps.filter((step) => !isBuiltinOccupiable(step.from) || !isBuiltinOccupiable(step.to));
}

export function availableGateStatusTransitions(status: NecromancerGateStatus): NecromancerGateStatus[] {
  if (status === "destroyed") return [];
  if (status === "ordinary") return ["hostile", "destroyed"];
  return ["ordinary", "destroyed"];
}

export type OrdinaryLawReadView =
  | { readonly kind: "revealed"; readonly lawId: NecromancerLawOfDeathId; readonly applicationLabel: string; readonly text: string }
  | { readonly kind: "hidden" };

export function ordinaryLawReadView(law: NecromancerSelectedLaw): OrdinaryLawReadView {
  if (law.visibility === "hidden") {
    return { kind: "hidden" };
  }
  const definition = NECROMANCER_LAW_OF_DEATH_DEFINITIONS.find((entry) => entry.id === law.lawId);
  return {
    kind: "revealed",
    lawId: law.lawId,
    applicationLabel: definition?.applicationLabel ?? law.lawId,
    text: definition?.text ?? "",
  };
}

export type NecromancerDepthUiKind = "matched" | "bind_current" | "clear_stale" | "vacant_empty";

export function necromancerDepthUiKind(
  depth: NecromancerDepthState | null,
  currentWizardId: string | null,
): NecromancerDepthUiKind {
  if (currentWizardId !== null && depth !== null && depth.wizardId === currentWizardId) {
    return "matched";
  }
  if (currentWizardId !== null) return "bind_current";
  if (depth !== null) return "clear_stale";
  return "vacant_empty";
}

export type NecromancerSetupSlotKind = "deep_foe" | "terminus_foe" | "far_foe" | "ally" | "ghoul_caller";

export interface NecromancerSetupSlot {
  readonly id: string;
  readonly kind: NecromancerSetupSlotKind;
  readonly label: string;
  readonly farIndex?: number;
}

export function arrangementSetupSlots(arrangementId: string): NecromancerSetupSlot[] {
  const definition = necromancerArrangementDefinition(arrangementId);
  if (definition === undefined) return [];
  const slots: NecromancerSetupSlot[] = [
    { id: "deep_foe", kind: "deep_foe", label: "Deep Foe Denizen" },
    { id: "terminus_foe", kind: "terminus_foe", label: "Terminus Foe Denizen" },
  ];
  for (let index = 0; index < definition.additionalFoeFarGateCount; index += 1) {
    slots.push({
      id: `far_foe_${index}`,
      kind: "far_foe",
      label: definition.additionalFoeFarGateCount === 1 ? "Far-Gate Foe" : `Far Foe ${index + 1}`,
      farIndex: index,
    });
  }
  slots.push({ id: "ally", kind: "ally", label: "Ally Denizen" });
  if (definition.ghoulCaller !== null) {
    slots.push({ id: "ghoul_caller", kind: "ghoul_caller", label: "Ghoul-Caller Denizen" });
  }
  return slots;
}

export function arrangementSetupSummary(arrangementId: string): string {
  const definition = necromancerArrangementDefinition(arrangementId);
  if (definition === undefined) return "";
  if (definition.arrangementId === "quiet") {
    return "Quiet: Foes at Deep and Terminus. Ally at a Near Gate. Souls follow the transcribed illustration. No starting Ghoul-Caller. No arrangement-hostile Gates.";
  }
  if (definition.arrangementId === "dynamic") {
    return "Dynamic: Foes at Deep, Terminus, and one Far Gate. Ally at a Near Gate. Deep starts hostile. Souls at present non-Necromancer Edge seats and otherwise-empty Gates.";
  }
  return "Explosive: Foes at Deep, Terminus, and two distinct Far Gates. Ally at a Near Gate. Disruptive Ghoul-Caller at an Edge-of-Life space (petty dead 0). Deep and Terminus start hostile. Souls at present non-Necromancer Edge seats, otherwise-empty Gates, and beyond Gates that have a further occupiable space.";
}

export interface NecromancerFarFoeDraft {
  readonly denizenId: string;
  readonly gateId: string;
}

export interface NecromancerSetupDraft {
  readonly arrangementId: string;
  readonly selectedLawIds: readonly string[];
  readonly deepFoeDenizenId: string;
  readonly terminusFoeDenizenId: string;
  readonly farFoes: readonly NecromancerFarFoeDraft[];
  readonly allyDenizenId: string;
  readonly allyGateId: string;
  readonly ghoulCallerDenizenId: string;
  readonly ghoulCallerPathSpaceId: string;
  readonly ghoulCallerPrimaryElement: string;
  readonly ghoulCallerAesthetic: string;
  readonly ghoulCallerStrangeQuirk: string;
  readonly ghoulCallerAgeYears: string;
}

export function emptyNecromancerSetupDraft(): NecromancerSetupDraft {
  return {
    arrangementId: "",
    selectedLawIds: [],
    deepFoeDenizenId: "",
    terminusFoeDenizenId: "",
    farFoes: [],
    allyDenizenId: "",
    allyGateId: "",
    ghoulCallerDenizenId: "",
    ghoulCallerPathSpaceId: "",
    ghoulCallerPrimaryElement: "",
    ghoulCallerAesthetic: "",
    ghoulCallerStrangeQuirk: "",
    ghoulCallerAgeYears: "",
  };
}

export function withSetupArrangement(draft: NecromancerSetupDraft, arrangementId: string): NecromancerSetupDraft {
  const definition = necromancerArrangementDefinition(arrangementId);
  const needed = definition?.additionalFoeFarGateCount ?? 0;
  const farFoes = Array.from({ length: needed }, (_, index) => draft.farFoes[index] ?? { denizenId: "", gateId: "" });
  return {
    ...draft,
    arrangementId,
    farFoes,
    ghoulCallerDenizenId: definition?.ghoulCaller === null ? "" : draft.ghoulCallerDenizenId,
    ghoulCallerPathSpaceId: definition?.ghoulCaller === null ? "" : draft.ghoulCallerPathSpaceId,
    ghoulCallerPrimaryElement: definition?.ghoulCaller === null ? "" : draft.ghoulCallerPrimaryElement,
    ghoulCallerAesthetic: definition?.ghoulCaller === null ? "" : draft.ghoulCallerAesthetic,
    ghoulCallerStrangeQuirk: definition?.ghoulCaller === null ? "" : draft.ghoulCallerStrangeQuirk,
    ghoulCallerAgeYears: definition?.ghoulCaller === null ? "" : draft.ghoulCallerAgeYears,
  };
}

export function uniqueSelectedSetupLawIds(ids: readonly string[]): NecromancerLawOfDeathId[] {
  const seen = new Set<string>();
  const ordered: NecromancerLawOfDeathId[] = [];
  for (const id of ids) {
    if (!isValidNecromancerLawOfDeathId(id) || seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  return ordered;
}

export function setupLawsValid(ids: readonly string[]): boolean {
  return uniqueSelectedSetupLawIds(ids).length === 2 && ids.length === 2;
}

export function startingSetupDenizenIds(draft: NecromancerSetupDraft): string[] {
  const ids = [
    draft.deepFoeDenizenId,
    draft.terminusFoeDenizenId,
    ...draft.farFoes.map((foe) => foe.denizenId),
    draft.allyDenizenId,
  ];
  const definition = necromancerArrangementDefinition(draft.arrangementId);
  if (definition?.ghoulCaller !== null && definition !== undefined) {
    ids.push(draft.ghoulCallerDenizenId);
  }
  return ids;
}

export function duplicateStartingSetupDenizenIds(draft: NecromancerSetupDraft): string[] {
  const filled = startingSetupDenizenIds(draft).filter((id) => id.trim() !== "");
  const counts = new Map<string, number>();
  for (const id of filled) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
}

function denizenById(denizens: readonly DenizenRef[], denizenId: string): DenizenRef | undefined {
  return denizens.find((denizen) => denizen.denizenId === denizenId);
}

function ghoulCallerProfileTextReady(raw: string): boolean {
  try {
    canonicalizeNecromancerGhoulCallerProfileText(raw, "profile");
    return true;
  } catch {
    return false;
  }
}

export function necromancerSetupReady(
  draft: NecromancerSetupDraft,
  denizens: readonly DenizenRef[],
): boolean {
  if (!isValidNecromancerArrangementId(draft.arrangementId)) return false;
  if (!setupLawsValid(draft.selectedLawIds)) return false;
  const definition = necromancerArrangementDefinition(draft.arrangementId);
  if (definition === undefined) return false;
  if (draft.farFoes.length !== definition.additionalFoeFarGateCount) return false;
  if (draft.deepFoeDenizenId.trim() === "" || denizenById(denizens, draft.deepFoeDenizenId) === undefined) return false;
  if (draft.terminusFoeDenizenId.trim() === "" || denizenById(denizens, draft.terminusFoeDenizenId) === undefined) {
    return false;
  }
  const farGateIds = new Set<string>();
  for (const foe of draft.farFoes) {
    if (foe.denizenId.trim() === "" || denizenById(denizens, foe.denizenId) === undefined) return false;
    if (!NECROMANCER_FAR_BUILTIN_GATE_IDS.includes(foe.gateId as (typeof NECROMANCER_FAR_BUILTIN_GATE_IDS)[number])) {
      return false;
    }
    if (farGateIds.has(foe.gateId)) return false;
    farGateIds.add(foe.gateId);
  }
  if (draft.allyDenizenId.trim() === "" || denizenById(denizens, draft.allyDenizenId) === undefined) return false;
  if (!NECROMANCER_NEAR_BUILTIN_GATE_IDS.includes(draft.allyGateId as (typeof NECROMANCER_NEAR_BUILTIN_GATE_IDS)[number])) {
    return false;
  }
  if (definition.ghoulCaller !== null) {
    const ghoul = denizenById(denizens, draft.ghoulCallerDenizenId);
    if (ghoul === undefined || ghoul.representation !== "individual") return false;
    if (!denizenHasBuiltinTaxonomy(ghoul, "ghoul_caller")) return false;
    if (ghoul.powerfulProfile == null || ghoul.powerfulProfile.status.kind !== "standard" || ghoul.powerfulProfile.status.value !== "disruptive") {
      return false;
    }
    if (!isBuiltinEdgeOfLifePathSpaceId(draft.ghoulCallerPathSpaceId)) return false;
    if (!(ELEMENT_IDS as readonly string[]).includes(draft.ghoulCallerPrimaryElement)) return false;
    if (!ghoulCallerProfileTextReady(draft.ghoulCallerAesthetic)) return false;
    if (!ghoulCallerProfileTextReady(draft.ghoulCallerStrangeQuirk)) return false;
    if (parseNonNegInt(draft.ghoulCallerAgeYears) === null) return false;
  }
  if (duplicateStartingSetupDenizenIds(draft).length > 0) return false;
  return true;
}

export function buildInitializeNecromancerPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly draft: NecromancerSetupDraft;
  readonly denizens: readonly DenizenRef[];
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly arrangementId: NecromancerArrangementId;
  readonly selectedLawIds: NecromancerLawOfDeathId[];
  readonly arrangementFoes: { readonly denizenId: string; readonly gateId: string }[];
  readonly arrangementAlly: { readonly denizenId: string; readonly gateId: string };
  readonly arrangementGhoulCaller: {
    readonly denizenId: string;
    readonly pathSpaceId: string;
    readonly primaryElement: ElementId;
    readonly aesthetic: string;
    readonly strangeQuirk: string;
    readonly ageYears: number;
  } | null;
} | null {
  if (!necromancerSetupReady(args.draft, args.denizens)) return null;
  const arrangementId = args.draft.arrangementId as NecromancerArrangementId;
  const definition = necromancerArrangementDefinition(arrangementId);
  if (definition === undefined) return null;
  const ageYears = parseNonNegInt(args.draft.ghoulCallerAgeYears);
  let canonical;
  try {
    canonical = canonicalizeInitializeNecromancerInput({
      arrangementId,
      selectedLawIds: uniqueSelectedSetupLawIds(args.draft.selectedLawIds),
      arrangementFoes: [
        { denizenId: args.draft.deepFoeDenizenId as never, gateId: "deep" },
        { denizenId: args.draft.terminusFoeDenizenId as never, gateId: "terminus" },
        ...args.draft.farFoes.map((foe) => ({ denizenId: foe.denizenId as never, gateId: foe.gateId as never })),
      ],
      arrangementAlly: {
        denizenId: args.draft.allyDenizenId as never,
        gateId: args.draft.allyGateId as never,
      },
      arrangementGhoulCaller: definition.ghoulCaller === null || ageYears === null
        ? null
        : {
            denizenId: args.draft.ghoulCallerDenizenId as never,
            pathSpaceId: args.draft.ghoulCallerPathSpaceId as NecromancerBuiltinPathSpaceId,
            primaryElement: args.draft.ghoulCallerPrimaryElement as ElementId,
            aesthetic: args.draft.ghoulCallerAesthetic,
            strangeQuirk: args.draft.ghoulCallerStrangeQuirk,
            ageYears,
          },
    });
  } catch {
    return null;
  }
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    arrangementId: canonical.arrangementId,
    selectedLawIds: [...canonical.selectedLawIds],
    arrangementFoes: canonical.arrangementFoes.map((foe) => ({ denizenId: foe.denizenId, gateId: foe.gateId })),
    arrangementAlly: {
      denizenId: canonical.arrangementAlly.denizenId,
      gateId: canonical.arrangementAlly.gateId,
    },
    arrangementGhoulCaller: canonical.arrangementGhoulCaller === null
      ? null
      : {
          denizenId: canonical.arrangementGhoulCaller.denizenId,
          pathSpaceId: canonical.arrangementGhoulCaller.pathSpaceId,
          primaryElement: canonical.arrangementGhoulCaller.primaryElement,
          aesthetic: canonical.arrangementGhoulCaller.aesthetic,
          strangeQuirk: canonical.arrangementGhoulCaller.strangeQuirk,
          ageYears: canonical.arrangementGhoulCaller.ageYears,
        },
  };
}

export function availableSetupDenizens(
  denizens: readonly DenizenRef[],
  draft: NecromancerSetupDraft,
  currentValue: string,
  requireIndividual: boolean,
): DenizenRef[] {
  const taken = new Set(
    startingSetupDenizenIds(draft).filter((id) => id.trim() !== "" && id !== currentValue),
  );
  return denizens.filter((denizen) => {
    if (taken.has(denizen.denizenId)) return false;
    if (requireIndividual && denizen.representation !== "individual") return false;
    return true;
  });
}

export function foeSubjectKey(foe: NecromancerFoeState): string {
  return necromancerFoeSubjectKey(foe.subject);
}

export function foeDisplayName(
  denizens: readonly DenizenRef[],
  wizards: readonly NecromancerWizardNameRef[],
  foe: NecromancerFoeState,
): string {
  if (foe.subject.kind === "wizard") {
    const wizardId = foe.subject.wizardId;
    return wizards.find((wizard) => wizard.wizardId === wizardId)?.name ?? "Unknown Wizard";
  }
  return denizenName(denizens, foe.subject.denizenId);
}

export function denizenFoeTruths(
  denizens: readonly DenizenRef[],
  foe: NecromancerFoeState,
): readonly { readonly truthId: string; readonly text: string; readonly origin: "source" | "campaign" }[] {
  if (foe.subject.kind !== "denizen") return [];
  const denizen = denizenById(denizens, foe.subject.denizenId);
  return denizen?.powerfulProfile?.truths ?? [];
}

export function unusedFoeDenizens(
  denizens: readonly DenizenRef[],
  foes: readonly NecromancerFoeState[],
): DenizenRef[] {
  const taken = new Set<string>(
    foes.filter(isNecromancerDenizenFoe).map((foe) => foe.subject.denizenId),
  );
  return denizens.filter((denizen) => !taken.has(denizen.denizenId));
}

export function unusedFoeWizards(
  wizards: readonly NecromancerWizardNameRef[],
  foes: readonly NecromancerFoeState[],
  traversals: readonly NecromancerWizardTraversalState[],
): NecromancerWizardNameRef[] {
  const taken = new Set<string>([
    ...foes.filter(isNecromancerWizardFoe).map((foe) => foe.subject.wizardId),
    ...traversals.map((traversal) => traversal.wizardId),
  ]);
  return wizards.filter((wizard) => !taken.has(wizard.wizardId));
}

export function unusedTraversalWizards(
  wizards: readonly NecromancerWizardNameRef[],
  foes: readonly NecromancerFoeState[],
  traversals: readonly NecromancerWizardTraversalState[],
): NecromancerWizardNameRef[] {
  return unusedFoeWizards(wizards, foes, traversals);
}

export function unusedAllyDenizens(
  denizens: readonly DenizenRef[],
  allies: readonly NecromancerAllyState[],
): DenizenRef[] {
  const taken = new Set<string>(allies.map((ally) => ally.denizenId));
  return denizens.filter((denizen) => !taken.has(denizen.denizenId));
}

export function unusedIndividualGhoulDenizens(
  denizens: readonly DenizenRef[],
  ghoulCallers: readonly NecromancerGhoulCallerState[],
): DenizenRef[] {
  const taken = new Set<string>(ghoulCallers.map((ghoul) => ghoul.denizenId));
  return denizens.filter(
    (denizen) =>
      denizen.representation === "individual"
      && !taken.has(denizen.denizenId)
      && denizenHasBuiltinTaxonomy(denizen, "ghoul_caller")
      && denizen.powerfulProfile != null
      && isReliableOrDisruptiveStatus(denizen.powerfulProfile.status),
  );
}

export function availableSetupGhoulCallerDenizens(
  denizens: readonly DenizenRef[],
  draft: NecromancerSetupDraft,
  currentValue: string,
): DenizenRef[] {
  return availableSetupDenizens(denizens, draft, currentValue, true).filter((denizen) =>
    denizenHasBuiltinTaxonomy(denizen, "ghoul_caller")
    && denizen.powerfulProfile != null
    && denizen.powerfulProfile.status.kind === "standard"
    && denizen.powerfulProfile.status.value === "disruptive",
  );
}

export function buildSetNecromancerDepthPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly expectedDepth: NecromancerDepthState | null;
  readonly depth: NecromancerDepthState | null;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly expectedDepth: NecromancerDepthState | null;
  readonly depth: NecromancerDepthState | null;
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    expectedDepth: args.expectedDepth,
    depth: args.depth,
  };
}

export function buildBindCurrentNecromancerAtDepthZeroPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly expectedDepth: NecromancerDepthState | null;
  readonly currentWizardId: string;
}): ReturnType<typeof buildSetNecromancerDepthPayload> {
  return buildSetNecromancerDepthPayload({
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    expectedDepth: args.expectedDepth,
    depth: { wizardId: args.currentWizardId as NecromancerDepthState["wizardId"], value: 0 },
  });
}

export function buildSetSelectedDeathLawsPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly expectedSelectedLaws: readonly NecromancerSelectedLaw[];
  readonly selectedLaws: readonly NecromancerSelectedLaw[];
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly expectedSelectedLaws: NecromancerSelectedLaw[];
  readonly selectedLaws: NecromancerSelectedLaw[];
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    expectedSelectedLaws: [...args.expectedSelectedLaws],
    selectedLaws: [...args.selectedLaws],
  };
}

export function buildSetNecromancerGateStatusPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly gateId: string;
  readonly expectedStatus: NecromancerGateStatus;
  readonly status: NecromancerGateStatus;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly gateId: string;
  readonly expectedStatus: NecromancerGateStatus;
  readonly status: NecromancerGateStatus;
} | null {
  if (!isValidNecromancerGateStatus(args.status)) return null;
  if (args.expectedStatus === "destroyed") return null;
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    gateId: args.gateId,
    expectedStatus: args.expectedStatus,
    status: args.status,
  };
}

export function buildSetNecromancerSoulCountPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly location: NecromancerOccupiableSpaceRef;
  readonly expectedCount: number;
  readonly count: number;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly location: NecromancerOccupiableSpaceRef;
  readonly expectedCount: number;
  readonly count: number;
} | null {
  if (!Number.isSafeInteger(args.count) || args.count < 0) return null;
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    location: args.location,
    expectedCount: args.expectedCount,
    count: args.count,
  };
}

export function buildMoveNecromancerSoulsPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly from: NecromancerOccupiableSpaceRef;
  readonly to: NecromancerOccupiableSpaceRef;
  readonly amount: number;
  readonly expectedFromCount: number;
  readonly expectedToCount: number;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly from: NecromancerOccupiableSpaceRef;
  readonly to: NecromancerOccupiableSpaceRef;
  readonly amount: number;
  readonly expectedFromCount: number;
  readonly expectedToCount: number;
} | null {
  if (!Number.isSafeInteger(args.amount) || args.amount <= 0) return null;
  if (occupiableRefKey(args.from) === occupiableRefKey(args.to)) return null;
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    from: args.from,
    to: args.to,
    amount: args.amount,
    expectedFromCount: args.expectedFromCount,
    expectedToCount: args.expectedToCount,
  };
}

export function toConvexNecromancerFoe(foe: NecromancerFoeState): ConvexNecromancerFoe {
  if (isNecromancerWizardFoe(foe)) {
    return {
      subject: { kind: "wizard", wizardId: foe.subject.wizardId },
      location: foe.location,
      truths: foe.truths.map((truth) => ({
        truthId: truth.truthId,
        text: truth.text,
        origin: truth.origin,
      })),
    };
  }
  return {
    subject: { kind: "denizen", denizenId: foe.subject.denizenId },
    location: foe.location,
  };
}

export type ConvexNecromancerFoe =
  | {
      readonly subject: { readonly kind: "denizen"; readonly denizenId: string };
      readonly location: NecromancerFoeLocation;
    }
  | {
      readonly subject: { readonly kind: "wizard"; readonly wizardId: string };
      readonly location: NecromancerFoeLocation;
      readonly truths: Array<{ truthId: string; text: string; origin: "source" | "campaign" }>;
    };

export function buildAddNecromancerFoePayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly foe: NecromancerFoeState;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly foe: ConvexNecromancerFoe;
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    foe: toConvexNecromancerFoe(args.foe),
  };
}

export function buildUpdateNecromancerFoePayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly subject: NecromancerFoeSubjectRef;
  readonly expectedLocation: NecromancerFoeLocation;
  readonly location: NecromancerFoeLocation;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly subject: NecromancerFoeSubjectRef;
  readonly fields: UpdateNecromancerFoeFields;
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    subject: args.subject,
    fields: {
      location: { expected: args.expectedLocation, value: args.location },
    },
  };
}

export function buildRemoveNecromancerFoePayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly expectedFoe: NecromancerFoeState;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly subject: NecromancerFoeSubjectRef;
  readonly expectedFoe: ConvexNecromancerFoe;
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    subject: args.expectedFoe.subject,
    expectedFoe: toConvexNecromancerFoe(args.expectedFoe),
  };
}

export function buildEscapeNecromancerWizardFoePayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly wizardId: string;
  readonly expectedFoe: NecromancerWizardFoeState;
  readonly destinationSeatId: PactSeatId;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly wizardId: string;
  readonly expectedMortalityState: "deceased";
  readonly expectedFoe: ConvexNecromancerFoe;
  readonly destinationSeatId: PactSeatId;
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    wizardId: args.wizardId,
    expectedMortalityState: "deceased",
    expectedFoe: toConvexNecromancerFoe(args.expectedFoe),
    destinationSeatId: args.destinationSeatId,
  };
}

export function buildAddNecromancerWizardFoeTruthPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly wizardId: string;
  readonly truthId: string;
  readonly text: string;
}) {
  return args;
}

export function buildUpdateNecromancerWizardFoeTruthPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly wizardId: string;
  readonly truthId: string;
  readonly expectedText: string;
  readonly text: string;
}) {
  return args;
}

export function buildRemoveNecromancerWizardFoeTruthPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly wizardId: string;
  readonly truthId: string;
  readonly expectedTruth: NecromancerWizardFoeState["truths"][number];
}) {
  return args;
}

export function newTruthId(uuid: string = crypto.randomUUID()): string {
  return `pdtru_${uuid}`;
}

export function buildAddNecromancerWizardTraversalPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly traversal: NecromancerWizardTraversalState;
}) {
  return args;
}

export function buildUpdateNecromancerWizardTraversalPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly wizardId: string;
  readonly fields: UpdateNecromancerWizardTraversalFields;
}) {
  return args;
}

export function buildRemoveNecromancerWizardTraversalPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly wizardId: string;
  readonly expectedTraversal: NecromancerWizardTraversalState;
}) {
  return args;
}

export function buildAddNecromancerAllyPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly ally: NecromancerAllyState;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly ally: NecromancerAllyState;
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    ally: args.ally,
  };
}

export function buildUpdateNecromancerAllyPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly denizenId: string;
  readonly expectedLocation: NecromancerOccupiableSpaceRef;
  readonly location: NecromancerOccupiableSpaceRef;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly denizenId: string;
  readonly fields: UpdateNecromancerAllyFields;
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    denizenId: args.denizenId,
    fields: {
      location: { expected: args.expectedLocation, value: args.location },
    },
  };
}

export function buildRemoveNecromancerAllyPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly expectedAlly: NecromancerAllyState;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly denizenId: string;
  readonly expectedAlly: NecromancerAllyState;
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    denizenId: args.expectedAlly.denizenId,
    expectedAlly: args.expectedAlly,
  };
}

export function buildAddNecromancerGhoulCallerPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly ghoulCaller: NecromancerGhoulCallerState;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly ghoulCaller: NecromancerGhoulCallerState;
} | null {
  if (!Number.isSafeInteger(args.ghoulCaller.pettyDeadCount) || args.ghoulCaller.pettyDeadCount < 0) return null;
  if (!Number.isSafeInteger(args.ghoulCaller.ageYears) || args.ghoulCaller.ageYears < 0) return null;
  try {
    return {
      commandId: args.commandId,
      expectedCampaignId: args.expectedCampaignId,
      ghoulCaller: canonicalizeNecromancerGhoulCaller(args.ghoulCaller),
    };
  } catch {
    return null;
  }
}

export function buildUpdateNecromancerGhoulCallerPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly denizenId: string;
  readonly expected: NecromancerGhoulCallerState;
  readonly location: NecromancerGhoulCallerState["location"];
  readonly pettyDeadCount: number;
  readonly primaryElement: ElementId;
  readonly aesthetic: string;
  readonly strangeQuirk: string;
  readonly ageYears: number;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly denizenId: string;
  readonly fields: UpdateNecromancerGhoulCallerFields;
} | null {
  if (!Number.isSafeInteger(args.pettyDeadCount) || args.pettyDeadCount < 0) return null;
  if (!Number.isSafeInteger(args.ageYears) || args.ageYears < 0) return null;
  if (!(ELEMENT_IDS as readonly string[]).includes(args.primaryElement)) return null;
  let nextAesthetic: string;
  let nextQuirk: string;
  try {
    nextAesthetic = canonicalizeNecromancerGhoulCallerProfileText(args.aesthetic, "Aesthetic");
    nextQuirk = canonicalizeNecromancerGhoulCallerProfileText(args.strangeQuirk, "Strange Quirk");
  } catch {
    return null;
  }
  const fields = canonicalizeUpdateNecromancerGhoulCallerFields({
    ...(!necromancerOccupiableSpaceRefsEqual(args.expected.location, args.location)
      ? { location: { expected: args.expected.location, value: args.location } }
      : {}),
    ...(args.expected.pettyDeadCount !== args.pettyDeadCount
      ? { pettyDeadCount: { expected: args.expected.pettyDeadCount, value: args.pettyDeadCount } }
      : {}),
    ...(args.expected.primaryElement !== args.primaryElement
      ? { primaryElement: { expected: args.expected.primaryElement, value: args.primaryElement } }
      : {}),
    ...(args.expected.aesthetic !== nextAesthetic
      ? { aesthetic: { expected: args.expected.aesthetic, value: nextAesthetic } }
      : {}),
    ...(args.expected.strangeQuirk !== nextQuirk
      ? { strangeQuirk: { expected: args.expected.strangeQuirk, value: nextQuirk } }
      : {}),
    ...(args.expected.ageYears !== args.ageYears
      ? { ageYears: { expected: args.expected.ageYears, value: args.ageYears } }
      : {}),
  });
  if (
    fields.location === undefined &&
    fields.pettyDeadCount === undefined &&
    fields.primaryElement === undefined &&
    fields.aesthetic === undefined &&
    fields.strangeQuirk === undefined &&
    fields.ageYears === undefined
  ) {
    return null;
  }
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    denizenId: args.denizenId,
    fields,
  };
}

export function buildRemoveNecromancerGhoulCallerPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly expectedGhoulCaller: NecromancerGhoulCallerState;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly denizenId: string;
  readonly expectedGhoulCaller: NecromancerGhoulCallerState;
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    denizenId: args.expectedGhoulCaller.denizenId,
    expectedGhoulCaller: args.expectedGhoulCaller,
  };
}

export function buildCreateNecromancerCampaignGatePayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly gateId: string;
  readonly name: string;
  readonly band: string;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly gateId: string;
  readonly name: string;
  readonly band: NecromancerGateBand;
} | null {
  if (!isValidNecromancerCampaignGateId(args.gateId)) return null;
  if (!isValidNecromancerGateBand(args.band)) return null;
  if (args.name.trim() === "") return null;
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    gateId: args.gateId,
    name: args.name,
    band: args.band,
  };
}

export function buildUpdateNecromancerCampaignGatePayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly expected: NecromancerCampaignGateState;
  readonly name: string;
  readonly band: NecromancerGateBand;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly gateId: string;
  readonly fields: UpdateNecromancerCampaignGateFields;
} | null {
  if (!isValidNecromancerGateBand(args.band)) return null;
  const fields: {
    name?: UpdateNecromancerCampaignGateFields["name"];
    band?: UpdateNecromancerCampaignGateFields["band"];
  } = {};
  if (args.expected.name !== args.name) {
    fields.name = { expected: args.expected.name, value: args.name };
  }
  if (args.expected.band !== args.band) {
    fields.band = { expected: args.expected.band, value: args.band };
  }
  if (Object.keys(fields).length === 0) return null;
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    gateId: args.expected.gateId,
    fields,
  };
}

export function buildCreateNecromancerCampaignPathSpacePayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly pathSpaceId: string;
  readonly region: string;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly pathSpaceId: string;
  readonly region: NecromancerPathRegion;
} | null {
  if (!isValidNecromancerCampaignPathSpaceId(args.pathSpaceId)) return null;
  if (!isValidNecromancerPathRegion(args.region)) return null;
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    pathSpaceId: args.pathSpaceId,
    region: args.region,
  };
}

export function buildRemoveNecromancerCampaignPathSpacePayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly expectedPathSpace: NecromancerCampaignPathSpaceState;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly pathSpaceId: string;
  readonly expectedPathSpace: NecromancerCampaignPathSpaceState;
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    pathSpaceId: args.expectedPathSpace.pathSpaceId,
    expectedPathSpace: args.expectedPathSpace,
  };
}

export function buildAddNecromancerStepPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly from: NecromancerOccupiableSpaceRef;
  readonly to: NecromancerOccupiableSpaceRef;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly step: NecromancerDirectedStep;
} | null {
  if (occupiableRefKey(args.from) === occupiableRefKey(args.to)) return null;
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    step: { from: args.from, to: args.to },
  };
}

export function buildRemoveNecromancerStepPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly expectedStep: NecromancerDirectedStep;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly expectedStep: NecromancerDirectedStep;
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    expectedStep: args.expectedStep,
  };
}

export function foeLocationsEqual(a: NecromancerFoeLocation, b: NecromancerFoeLocation): boolean {
  if (a.kind === "escaped" || b.kind === "escaped") {
    return a.kind === "escaped" && b.kind === "escaped"
      && a.seatId === b.seatId
      && a.abominationKind === b.abominationKind;
  }
  return necromancerOccupiableSpaceRefsEqual(a, b);
}

export function selectedLawsEqual(a: readonly NecromancerSelectedLaw[], b: readonly NecromancerSelectedLaw[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((law, index) => law.lawId === b[index]?.lawId && law.visibility === b[index]?.visibility);
}

export function stepAlreadyPresent(
  steps: readonly NecromancerDirectedStep[],
  step: NecromancerDirectedStep,
): boolean {
  return steps.some((candidate) => necromancerDirectedStepsEqual(candidate, step));
}

export const MAX_VISIBLE_SOUL_BEADS = 8;
export const MAX_VISIBLE_OCCUPANT_TOKENS = 3;
export const FIVE_PLUS_SOUL_THRESHOLD = 5;

export function visibleSoulBeadCount(souls: number): number {
  if (!Number.isFinite(souls) || souls <= 0) return 0;
  return Math.min(Math.floor(souls), MAX_VISIBLE_SOUL_BEADS);
}

export function fivePlusSoulWarning(souls: number): string | null {
  if (souls < FIVE_PLUS_SOUL_THRESHOLD) return null;
  return "Five or more Souls: table resolution pending; this is not an automatic Foe conversion.";
}

export function gateBoardTitle(gate: NecromancerGateState): string {
  if (gate.origin === "builtin") {
    const definition = necromancerBuiltinGateDefinition(gate.gateId);
    return `${definition.romanNumeral} ${definition.displayName}`;
  }
  return gate.name;
}

export function gateBoardAriaLabel(gate: NecromancerGateState): string {
  return `${gateBoardTitle(gate)} ${gate.status}`;
}

export interface BoardOccupantToken {
  readonly key: string;
  readonly kind: "foe" | "ally" | "ghoul_caller" | "wizard_traversal";
  readonly name: string;
  readonly roleLabel: string;
}

export function namedOccupantTokens(
  pieces: ReturnType<typeof piecesAtSpace>,
  denizens: readonly DenizenRef[],
  wizards: readonly NecromancerWizardNameRef[],
): readonly BoardOccupantToken[] {
  const tokens: BoardOccupantToken[] = [];
  for (const foe of pieces.foes) {
    tokens.push({
      key: `foe:${foeSubjectKey(foe)}`,
      kind: "foe",
      name: foeDisplayName(denizens, wizards, foe),
      roleLabel: "Foe",
    });
  }
  for (const ally of pieces.allies) {
    tokens.push({
      key: `ally:${ally.denizenId}`,
      kind: "ally",
      name: denizenName(denizens, ally.denizenId),
      roleLabel: "Ally",
    });
  }
  for (const ghoul of pieces.ghoulCallers) {
    tokens.push({
      key: `ghoul:${ghoul.denizenId}`,
      kind: "ghoul_caller",
      name: denizenName(denizens, ghoul.denizenId),
      roleLabel: "Ghoul-Caller",
    });
  }
  for (const traversal of pieces.wizardTraversals) {
    const name = wizards.find((wizard) => wizard.wizardId === traversal.wizardId)?.name ?? traversal.wizardId;
    tokens.push({
      key: `traversal:${traversal.wizardId}`,
      kind: "wizard_traversal",
      name,
      roleLabel: "Wizard traversal",
    });
  }
  return tokens;
}

export function visibleOccupantTokens(
  tokens: readonly BoardOccupantToken[],
): { readonly visible: readonly BoardOccupantToken[]; readonly overflowCount: number } {
  if (tokens.length <= MAX_VISIBLE_OCCUPANT_TOKENS) {
    return { visible: tokens, overflowCount: 0 };
  }
  return {
    visible: tokens.slice(0, MAX_VISIBLE_OCCUPANT_TOKENS),
    overflowCount: tokens.length - MAX_VISIBLE_OCCUPANT_TOKENS,
  };
}

export function occupantSummaryLabel(tokens: readonly BoardOccupantToken[], souls: number): string {
  const parts = [`${souls} Souls`];
  for (const token of tokens) {
    parts.push(`${token.roleLabel} ${token.name}`);
  }
  return parts.join(". ");
}

export function canTransformSoulIntoAlly(
  gate: NecromancerGateState | undefined,
  souls: number,
): boolean {
  return gate !== undefined && gate.status === "ordinary" && souls >= 1;
}

export function finalDeathResearchers(
  presence: readonly SorcererExternalPresence[],
): Extract<SorcererExternalPresence, { kind: "researcher" }>[] {
  return presence.filter(
    (entry): entry is Extract<SorcererExternalPresence, { kind: "researcher" }> =>
      entry.kind === "researcher" && entry.target.kind === "necromancer_final_death",
  );
}

export function necromancerDomainDisruptiveArcanists(
  presence: readonly SorcererExternalPresence[],
): Extract<SorcererExternalPresence, { kind: "disruptive_arcanist" }>[] {
  return presence.filter(
    (entry): entry is Extract<SorcererExternalPresence, { kind: "disruptive_arcanist" }> =>
      entry.kind === "disruptive_arcanist" && entry.seatId === "necromancer",
  );
}

export function researcherOperationalLabel(operationalThisMonth: boolean): string {
  return operationalThisMonth ? "Working this month" : "Unavailable this month";
}

export function buildTransformNecromancerSoulIntoAllyPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly denizenId: string;
  readonly name: string;
  readonly gateId: string;
  readonly expectedSoulCount: number;
  readonly expectedGateStatus: NecromancerGateStatus;
}) {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    denizenId: args.denizenId,
    name: args.name,
    gateId: args.gateId,
    expectedSoulCount: args.expectedSoulCount,
    expectedGateStatus: args.expectedGateStatus,
  };
}

export const TIME_RECORDING_BOUNDARY =
  "Resolve or record Time in the shared workflow; this control records the Domain result.";

export const HOSTILE_GATE_REMINDER =
  "Hostile Gates still require table-resolved Hostility/Lore handling. Status recording is not a Cleanse Gate action.";

export const REBUFF_DEFER_GUIDANCE =
  "Rebuff is not automated. Piece-kind branch choice, Hostile/Ally preferences, Left-Hand tie breaking, and terminal removal are not encoded for arbitrary valid maps. Record exact resulting locations with the correction tools.";

export {
  NECROMANCER_ABOMINATION_KINDS,
  NECROMANCER_BUILTIN_GATE_DEFINITIONS,
  NECROMANCER_BUILTIN_GATE_IDS,
  NECROMANCER_BUILTIN_PATH_SPACE_DEFINITIONS,
  NECROMANCER_BUILTIN_PATH_SPACE_IDS,
  NECROMANCER_EDGE_PATH_SPACE_IDS,
  NECROMANCER_GATE_BANDS,
  NECROMANCER_GATE_STATUS_VALUES,
  NECROMANCER_GHOUL_CALLER_DISPOSITIONS,
  NECROMANCER_LAW_VISIBILITIES,
  NECROMANCER_PATH_REGIONS,
  EMPTY_NECROMANCER_STATE,
  isValidPactSeatId,
  isValidNecromancerAbominationKind,
  isValidNecromancerCampaignGateId,
  occupiableRefKey as occupiableSpaceKey,
};
