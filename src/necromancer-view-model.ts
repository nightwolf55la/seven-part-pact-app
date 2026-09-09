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
  isBuiltinEdgeOfLifePathSpaceId,
  isValidNecromancerAbominationKind,
  isValidNecromancerArrangementId,
  isValidNecromancerBuiltinGateId,
  isValidNecromancerBuiltinPathSpaceId,
  isValidNecromancerCampaignGateId,
  isValidNecromancerCampaignPathSpaceId,
  isValidNecromancerGateBand,
  isValidNecromancerGateStatus,
  isValidNecromancerGhoulCallerDisposition,
  isValidNecromancerLawOfDeathId,
  isValidNecromancerPathRegion,
  isValidPactSeatId,
  necromancerArrangementDefinition,
  necromancerBuiltinGateDefinition,
  necromancerBuiltinPathSpaceDefinition,
  necromancerDirectedStepsEqual,
  necromancerOccupiableSpaceRefsEqual,
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
  type NecromancerFoeLocation,
  type NecromancerFoeState,
  type NecromancerGateBand,
  type NecromancerGateId,
  type NecromancerGateState,
  type NecromancerGateStatus,
  type NecromancerGhoulCallerDisposition,
  type NecromancerGhoulCallerState,
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
} from "../shared/domain";
import type { DenizenRef, IsleRef, PlaceRef } from "./WorldSurface";

export interface NecromancerWizardRef {
  readonly wizardId: string;
  readonly name: string;
  readonly homeIsleId: string | null;
  readonly sanctumPlaceId: string | null;
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
    necromancer.depth !== null
  );
}

export function newCommandId(uuid: string = crypto.randomUUID()): string {
  return `cmd_${uuid}`;
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
  return `Campaign ${pathRegionLabel(path.region)}`;
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
} {
  return {
    souls: soulCountAt(necromancer.souls, location),
    foes: foesAtSpace(necromancer.foes, location),
    allies: alliesAtSpace(necromancer.allies, location),
    ghoulCallers: ghoulCallersAtSpace(necromancer.ghoulCallers, location),
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

export function campaignGates(necromancer: NecromancerState): NecromancerCampaignGateState[] {
  return necromancer.gates.filter((gate): gate is NecromancerCampaignGateState => gate.origin === "campaign");
}

export function campaignPathSpaces(necromancer: NecromancerState): NecromancerCampaignPathSpaceState[] {
  return necromancer.pathSpaces.filter(
    (path): path is NecromancerCampaignPathSpaceState => path.origin === "campaign",
  );
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
    if (!isBuiltinEdgeOfLifePathSpaceId(draft.ghoulCallerPathSpaceId)) return false;
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
  readonly arrangementGhoulCaller: { readonly denizenId: string; readonly pathSpaceId: string } | null;
} | null {
  if (!necromancerSetupReady(args.draft, args.denizens)) return null;
  const arrangementId = args.draft.arrangementId as NecromancerArrangementId;
  const definition = necromancerArrangementDefinition(arrangementId);
  if (definition === undefined) return null;
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    arrangementId,
    selectedLawIds: uniqueSelectedSetupLawIds(args.draft.selectedLawIds),
    arrangementFoes: [
      { denizenId: args.draft.deepFoeDenizenId, gateId: "deep" },
      { denizenId: args.draft.terminusFoeDenizenId, gateId: "terminus" },
      ...args.draft.farFoes.map((foe) => ({ denizenId: foe.denizenId, gateId: foe.gateId })),
    ],
    arrangementAlly: {
      denizenId: args.draft.allyDenizenId,
      gateId: args.draft.allyGateId,
    },
    arrangementGhoulCaller: definition.ghoulCaller === null
      ? null
      : {
          denizenId: args.draft.ghoulCallerDenizenId,
          pathSpaceId: args.draft.ghoulCallerPathSpaceId,
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

export function unusedFoeDenizens(
  denizens: readonly DenizenRef[],
  foes: readonly NecromancerFoeState[],
): DenizenRef[] {
  const taken = new Set<string>(foes.map((foe) => foe.denizenId));
  return denizens.filter((denizen) => !taken.has(denizen.denizenId));
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
    (denizen) => denizen.representation === "individual" && !taken.has(denizen.denizenId),
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

export function buildAddNecromancerFoePayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly foe: NecromancerFoeState;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly foe: NecromancerFoeState;
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    foe: args.foe,
  };
}

export function buildUpdateNecromancerFoePayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly denizenId: string;
  readonly expectedLocation: NecromancerFoeLocation;
  readonly location: NecromancerFoeLocation;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly denizenId: string;
  readonly fields: UpdateNecromancerFoeFields;
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

export function buildRemoveNecromancerFoePayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly expectedFoe: NecromancerFoeState;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly denizenId: string;
  readonly expectedFoe: NecromancerFoeState;
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    denizenId: args.expectedFoe.denizenId,
    expectedFoe: args.expectedFoe,
  };
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
  if (!isValidNecromancerGhoulCallerDisposition(args.ghoulCaller.disposition)) return null;
  if (!Number.isSafeInteger(args.ghoulCaller.pettyDeadCount) || args.ghoulCaller.pettyDeadCount < 0) return null;
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    ghoulCaller: args.ghoulCaller,
  };
}

export function buildUpdateNecromancerGhoulCallerPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly denizenId: string;
  readonly expected: NecromancerGhoulCallerState;
  readonly location: NecromancerGhoulCallerState["location"];
  readonly disposition: NecromancerGhoulCallerDisposition;
  readonly pettyDeadCount: number;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly denizenId: string;
  readonly fields: UpdateNecromancerGhoulCallerFields;
} | null {
  if (!isValidNecromancerGhoulCallerDisposition(args.disposition)) return null;
  if (!Number.isSafeInteger(args.pettyDeadCount) || args.pettyDeadCount < 0) return null;
  const fields: {
    location?: UpdateNecromancerGhoulCallerFields["location"];
    disposition?: UpdateNecromancerGhoulCallerFields["disposition"];
    pettyDeadCount?: UpdateNecromancerGhoulCallerFields["pettyDeadCount"];
  } = {};
  if (!necromancerOccupiableSpaceRefsEqual(args.expected.location, args.location)) {
    fields.location = { expected: args.expected.location, value: args.location };
  }
  if (args.expected.disposition !== args.disposition) {
    fields.disposition = { expected: args.expected.disposition, value: args.disposition };
  }
  if (args.expected.pettyDeadCount !== args.pettyDeadCount) {
    fields.pettyDeadCount = { expected: args.expected.pettyDeadCount, value: args.pettyDeadCount };
  }
  if (Object.keys(fields).length === 0) return null;
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
