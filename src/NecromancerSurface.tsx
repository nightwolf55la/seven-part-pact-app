import { useLayoutEffect, useState, type KeyboardEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api.js";
import {
  type NecromancerAbominationKind,
  type NecromancerAllyState,
  type NecromancerCampaignGateState,
  type NecromancerFoeLocation,
  type NecromancerFoeState,
  type NecromancerGateBand,
  type NecromancerGateId,
  type NecromancerGateState,
  type NecromancerGateStatus,
  type NecromancerGhoulCallerDisposition,
  type NecromancerGhoulCallerState,
  type NecromancerOccupiableSpaceRef,
  type NecromancerPathRegion,
  type NecromancerPathSpaceId,
  type NecromancerPathSpaceState,
  type NecromancerSelectedLaw,
  type NecromancerState,
  type PactSeatId,
  type WizardId,
} from "../shared/domain";
import type { WorldReference } from "./WorldSurface";
import {
  NECROMANCER_ABOMINATION_KINDS,
  NECROMANCER_ARRANGEMENT_OPTIONS,
  NECROMANCER_BOARD_BAND_LABELS,
  NECROMANCER_BOARD_VIEWBOX,
  NECROMANCER_BUILTIN_GATE_DEFINITIONS,
  NECROMANCER_BUILTIN_GATE_IDS,
  NECROMANCER_BUILTIN_GATE_MAP_POINTS,
  NECROMANCER_BUILTIN_PATH_SPACE_DEFINITIONS,
  NECROMANCER_BUILTIN_PATH_SPACE_IDS,
  NECROMANCER_BUILTIN_PATH_MAP_POINTS,
  NECROMANCER_EDGE_PATH_SPACE_IDS,
  NECROMANCER_FAR_BUILTIN_GATE_IDS,
  NECROMANCER_GATE_BANDS,
  NECROMANCER_GHOUL_CALLER_DISPOSITIONS,
  NECROMANCER_LAW_OPTIONS,
  NECROMANCER_LAW_VISIBILITIES,
  NECROMANCER_NEAR_BUILTIN_GATE_IDS,
  NECROMANCER_PATH_REGIONS,
  NECROMANCER_STATIC_TERMINAL_PRESENTATIONS,
  activeEdgeOfLifePathSpaces,
  activeOccupiableSpaces,
  arrangementSetupSlots,
  arrangementSetupSummary,
  availableGateStatusTransitions,
  availableSetupDenizens,
  buildAddNecromancerAllyPayload,
  buildAddNecromancerFoePayload,
  buildAddNecromancerGhoulCallerPayload,
  buildAddNecromancerStepPayload,
  buildBindCurrentNecromancerAtDepthZeroPayload,
  buildCreateNecromancerCampaignGatePayload,
  buildCreateNecromancerCampaignPathSpacePayload,
  buildInitializeNecromancerPayload,
  buildMoveNecromancerSoulsPayload,
  buildRemoveNecromancerAllyPayload,
  buildRemoveNecromancerCampaignPathSpacePayload,
  buildRemoveNecromancerFoePayload,
  buildRemoveNecromancerGhoulCallerPayload,
  buildRemoveNecromancerStepPayload,
  buildSetNecromancerDepthPayload,
  buildSetNecromancerGateStatusPayload,
  buildSetNecromancerSoulCountPayload,
  buildSetSelectedDeathLawsPayload,
  buildUpdateNecromancerAllyPayload,
  buildUpdateNecromancerCampaignGatePayload,
  buildUpdateNecromancerFoePayload,
  buildUpdateNecromancerGhoulCallerPayload,
  builtinInternalStepPresentation,
  campaignGates,
  campaignPathSpaces,
  campaignStructureInspectTargets,
  denizenName,
  emptyNecromancerSetupDraft,
  escapedFoesGroupedBySeat,
  foeLocationLabel,
  gateBandLabel,
  gateBandOf,
  gateDisplayName,
  gateStatusLabel,
  isNecromancerInitialized,
  necromancerDepthUiKind,
  necromancerSetupReady,
  newCampaignGateId,
  newCampaignPathSpaceId,
  newCommandId,
  occupiableRefKey,
  occupiableSpaceLabel,
  ordinaryLawReadView,
  otherPactSeatOptions,
  parseNonNegInt,
  parseOccupiableRefKey,
  pathRegionLabel,
  pathSpaceDisplayName,
  piecesAtSpace,
  placeName,
  resolveOccupiableSelection,
  stepsInvolvingCustomNodes,
  unusedAllyDenizens,
  unusedFoeDenizens,
  unusedIndividualGhoulDenizens,
  withSetupArrangement,
  worldIsleName,
  type NecromancerSetupDraft,
  type NecromancerWizardRef,
} from "./necromancer-view-model";

export type { NecromancerWizardRef };

type Selection =
  | { readonly kind: "gate"; readonly gateId: string }
  | { readonly kind: "path"; readonly pathSpaceId: string };

const fieldClass =
  "text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 w-full text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-800";
const btnClass =
  "text-xs font-medium rounded-lg px-3 py-1.5 cursor-pointer bg-violet-800 dark:bg-violet-200 text-white dark:text-violet-950 hover:bg-violet-700 dark:hover:bg-violet-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
const ghostBtn =
  "text-xs font-medium rounded-lg px-3 py-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50";

function activate(event: KeyboardEvent<Element>, action: () => void): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

function selectedLawKey(laws: readonly NecromancerSelectedLaw[]): string {
  return JSON.stringify(laws);
}

function selectionOf(ref: NecromancerOccupiableSpaceRef): Selection {
  return ref.kind === "gate"
    ? { kind: "gate", gateId: ref.gateId }
    : { kind: "path", pathSpaceId: ref.pathSpaceId };
}

function selectionRef(selection: Selection): NecromancerOccupiableSpaceRef {
  return selection.kind === "gate"
    ? { kind: "gate", gateId: selection.gateId as NecromancerGateId }
    : { kind: "path", pathSpaceId: selection.pathSpaceId as NecromancerPathSpaceId };
}

function findGate(necromancer: NecromancerState, gateId: string): NecromancerGateState | undefined {
  return necromancer.gates.find((gate) => gate.gateId === gateId);
}

function findPath(necromancer: NecromancerState, pathSpaceId: string): NecromancerPathSpaceState | undefined {
  return necromancer.pathSpaces.find((path) => path.pathSpaceId === pathSpaceId);
}

function OccupiableSelect({
  value,
  onChange,
  spaces,
  necromancer,
  allowEmpty,
  emptyLabel,
  ariaLabel,
}: {
  value: string;
  onChange: (key: string) => void;
  spaces: readonly NecromancerOccupiableSpaceRef[];
  necromancer: NecromancerState;
  allowEmpty?: boolean;
  emptyLabel?: string;
  ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      className={fieldClass}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {allowEmpty === true && <option value="">{emptyLabel ?? "Select space…"}</option>}
      {spaces.map((space) => {
        const key = occupiableRefKey(space);
        return (
          <option key={key} value={key}>
            {occupiableSpaceLabel(space, necromancer)}
          </option>
        );
      })}
    </select>
  );
}

export default function NecromancerSurface({
  necromancer,
  world,
  campaignId,
  necromancerWizard,
}: {
  necromancer: NecromancerState;
  world: WorldReference;
  campaignId: string;
  necromancerWizard: NecromancerWizardRef | null;
}) {
  const initializeNecromancer = useMutation(api.m3Commands.initializeNecromancer);
  const setNecromancerDepth = useMutation(api.m3Commands.setNecromancerDepth);
  const setSelectedDeathLaws = useMutation(api.m3Commands.setSelectedDeathLaws);
  const setNecromancerGateStatus = useMutation(api.m3Commands.setNecromancerGateStatus);
  const setNecromancerSoulCount = useMutation(api.m3Commands.setNecromancerSoulCount);
  const moveNecromancerSouls = useMutation(api.m3Commands.moveNecromancerSouls);
  const addNecromancerFoe = useMutation(api.m3Commands.addNecromancerFoe);
  const updateNecromancerFoe = useMutation(api.m3Commands.updateNecromancerFoe);
  const removeNecromancerFoe = useMutation(api.m3Commands.removeNecromancerFoe);
  const addNecromancerAlly = useMutation(api.m3Commands.addNecromancerAlly);
  const updateNecromancerAlly = useMutation(api.m3Commands.updateNecromancerAlly);
  const removeNecromancerAlly = useMutation(api.m3Commands.removeNecromancerAlly);
  const addNecromancerGhoulCaller = useMutation(api.m3Commands.addNecromancerGhoulCaller);
  const updateNecromancerGhoulCaller = useMutation(api.m3Commands.updateNecromancerGhoulCaller);
  const removeNecromancerGhoulCaller = useMutation(api.m3Commands.removeNecromancerGhoulCaller);
  const createNecromancerCampaignGate = useMutation(api.m3Commands.createNecromancerCampaignGate);
  const updateNecromancerCampaignGate = useMutation(api.m3Commands.updateNecromancerCampaignGate);
  const createNecromancerCampaignPathSpace = useMutation(api.m3Commands.createNecromancerCampaignPathSpace);
  const removeNecromancerCampaignPathSpace = useMutation(api.m3Commands.removeNecromancerCampaignPathSpace);
  const addNecromancerStep = useMutation(api.m3Commands.addNecromancerStep);
  const removeNecromancerStep = useMutation(api.m3Commands.removeNecromancerStep);

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [setup, setSetup] = useState<NecromancerSetupDraft>(emptyNecromancerSetupDraft);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [editingLaws, setEditingLaws] = useState(false);
  const [lawDraft, setLawDraft] = useState<NecromancerSelectedLaw[]>([...necromancer.selectedLaws]);
  const [depthDraft, setDepthDraft] = useState(
    necromancer.depth !== null ? String(necromancer.depth.value) : "0",
  );
  const [soulDraft, setSoulDraft] = useState("0");
  const [moveAmount, setMoveAmount] = useState("1");
  const [moveToKey, setMoveToKey] = useState("");

  const initialized = isNecromancerInitialized(necromancer);
  const authoritativeLawKey = selectedLawKey(necromancer.selectedLaws);
  const depthOwnerKey = necromancer.depth === null
    ? "null"
    : `${necromancer.depth.wizardId}:${necromancer.depth.value}`;

  useLayoutEffect(() => {
    setLawDraft([...necromancer.selectedLaws]);
  }, [authoritativeLawKey, necromancer.selectedLaws]);

  useLayoutEffect(() => {
    setDepthDraft(necromancer.depth !== null ? String(necromancer.depth.value) : "0");
  }, [depthOwnerKey, necromancer.depth]);

  useLayoutEffect(() => {
    if (selection === null) return;
    if (resolveOccupiableSelection(selectionRef(selection), necromancer) === null) {
      setSelection(null);
    }
  }, [necromancer, selection]);

  useLayoutEffect(() => {
    if (selection === null) return;
    const location = selectionRef(selection);
    setSoulDraft(String(piecesAtSpace(necromancer, location).souls));
    setMoveAmount("1");
    setMoveToKey("");
  }, [selection, necromancer]);

  async function run(action: () => Promise<void>): Promise<boolean> {
    setPending(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Mutation failed.");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function handleInitialize(): Promise<void> {
    const payload = buildInitializeNecromancerPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      draft: setup,
      denizens: world.denizens,
    });
    if (payload === null) {
      setError("Finish the required arrangement choices before initializing.");
      return;
    }
    await run(async () => {
      await initializeNecromancer(payload);
    });
  }

  if (!initialized) {
    return (
      <SetupPanel
        setup={setup}
        setSetup={setSetup}
        world={world}
        pending={pending}
        error={error}
        onInitialize={() => { void handleInitialize(); }}
      />
    );
  }

  const selectedLocation = selection === null ? null : selectionRef(selection);
  const selectedGate = selection?.kind === "gate" ? findGate(necromancer, selection.gateId) : undefined;
  const selectedPath = selection?.kind === "path" ? findPath(necromancer, selection.pathSpaceId) : undefined;

  return (
    <div className="space-y-4">
      {error !== null && (
        <div role="alert" className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      <HeaderSummary necromancerWizard={necromancerWizard} world={world} />
      <div className="grid gap-3 md:grid-cols-2">
        <DepthPanel
          necromancer={necromancer}
          necromancerWizard={necromancerWizard}
          depthDraft={depthDraft}
          setDepthDraft={setDepthDraft}
          pending={pending}
          onSaveMatched={async () => {
            if (necromancerWizard === null || necromancer.depth === null) return;
            const value = parseNonNegInt(depthDraft);
            if (value === null) {
              setError("Depth must be a non-negative integer.");
              return;
            }
            const payload = buildSetNecromancerDepthPayload({
              commandId: newCommandId(),
              expectedCampaignId: campaignId,
              expectedDepth: necromancer.depth,
              depth: { wizardId: necromancerWizard.wizardId as WizardId, value },
            });
            await run(async () => {
              await setNecromancerDepth(payload);
            });
          }}
          onBindCurrent={async () => {
            if (necromancerWizard === null) return;
            const payload = buildBindCurrentNecromancerAtDepthZeroPayload({
              commandId: newCommandId(),
              expectedCampaignId: campaignId,
              expectedDepth: necromancer.depth,
              currentWizardId: necromancerWizard.wizardId,
            });
            await run(async () => {
              await setNecromancerDepth(payload);
            });
          }}
          onClearStale={async () => {
            const payload = buildSetNecromancerDepthPayload({
              commandId: newCommandId(),
              expectedCampaignId: campaignId,
              expectedDepth: necromancer.depth,
              depth: null,
            });
            await run(async () => {
              await setNecromancerDepth(payload);
            });
          }}
        />
        <LawsPanel
          necromancer={necromancer}
          editing={editingLaws}
          lawDraft={lawDraft}
          setLawDraft={setLawDraft}
          pending={pending}
          onToggleEdit={() => {
            setEditingLaws((current) => !current);
            setLawDraft([...necromancer.selectedLaws]);
          }}
          onSave={async () => {
            const payload = buildSetSelectedDeathLawsPayload({
              commandId: newCommandId(),
              expectedCampaignId: campaignId,
              expectedSelectedLaws: necromancer.selectedLaws,
              selectedLaws: lawDraft,
            });
            const ok = await run(async () => {
              await setSelectedDeathLaws(payload);
            });
            if (ok) setEditingLaws(false);
          }}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
        <DeathBoard
          necromancer={necromancer}
          world={world}
          selection={selection}
          onSelect={setSelection}
        />
        <Inspector
          necromancer={necromancer}
          world={world}
          selection={selection}
          selectedLocation={selectedLocation}
          selectedGate={selectedGate}
          selectedPath={selectedPath}
          soulDraft={soulDraft}
          setSoulDraft={setSoulDraft}
          moveAmount={moveAmount}
          setMoveAmount={setMoveAmount}
          moveToKey={moveToKey}
          setMoveToKey={setMoveToKey}
          pending={pending}
          onSetSouls={async () => {
            if (selectedLocation === null) return;
            const count = parseNonNegInt(soulDraft);
            if (count === null) {
              setError("Soul count must be a non-negative integer.");
              return;
            }
            const payload = buildSetNecromancerSoulCountPayload({
              commandId: newCommandId(),
              expectedCampaignId: campaignId,
              location: selectedLocation,
              expectedCount: piecesAtSpace(necromancer, selectedLocation).souls,
              count,
            });
            if (payload === null) return;
            await run(async () => {
              await setNecromancerSoulCount(payload);
            });
          }}
          onMoveSouls={async () => {
            if (selectedLocation === null) return;
            const amount = parseNonNegInt(moveAmount);
            const to = parseOccupiableRefKey(moveToKey);
            if (amount === null || amount === 0 || to === null) {
              setError("Choose a destination and a positive Soul amount.");
              return;
            }
            const payload = buildMoveNecromancerSoulsPayload({
              commandId: newCommandId(),
              expectedCampaignId: campaignId,
              from: selectedLocation,
              to,
              amount,
              expectedFromCount: piecesAtSpace(necromancer, selectedLocation).souls,
              expectedToCount: piecesAtSpace(necromancer, to).souls,
            });
            if (payload === null) {
              setError("Choose a different destination and a positive amount.");
              return;
            }
            await run(async () => {
              await moveNecromancerSouls(payload);
            });
          }}
          onSetGateStatus={async (status: NecromancerGateStatus) => {
            if (selectedGate === undefined) return;
            const payload = buildSetNecromancerGateStatusPayload({
              commandId: newCommandId(),
              expectedCampaignId: campaignId,
              gateId: selectedGate.gateId,
              expectedStatus: selectedGate.status,
              status,
            });
            if (payload === null) return;
            await run(async () => {
              await setNecromancerGateStatus(payload);
            });
          }}
        />
      </div>
      <EscapedFoeTray necromancer={necromancer} world={world} />
      <RoleManagement
        necromancer={necromancer}
        world={world}
        campaignId={campaignId}
        pending={pending}
        run={run}
        addNecromancerFoe={addNecromancerFoe}
        updateNecromancerFoe={updateNecromancerFoe}
        removeNecromancerFoe={removeNecromancerFoe}
        addNecromancerAlly={addNecromancerAlly}
        updateNecromancerAlly={updateNecromancerAlly}
        removeNecromancerAlly={removeNecromancerAlly}
        addNecromancerGhoulCaller={addNecromancerGhoulCaller}
        updateNecromancerGhoulCaller={updateNecromancerGhoulCaller}
        removeNecromancerGhoulCaller={removeNecromancerGhoulCaller}
        onSelectSpace={(ref) => setSelection(selectionOf(ref))}
      />
      <AdvancedStructure
        necromancer={necromancer}
        campaignId={campaignId}
        pending={pending}
        run={run}
        onSelectSpace={(ref) => setSelection(selectionOf(ref))}
        createNecromancerCampaignGate={createNecromancerCampaignGate}
        updateNecromancerCampaignGate={updateNecromancerCampaignGate}
        createNecromancerCampaignPathSpace={createNecromancerCampaignPathSpace}
        removeNecromancerCampaignPathSpace={removeNecromancerCampaignPathSpace}
        addNecromancerStep={addNecromancerStep}
        removeNecromancerStep={removeNecromancerStep}
      />
    </div>
  );
}

function HeaderSummary({
  necromancerWizard,
  world,
}: {
  necromancerWizard: NecromancerWizardRef | null;
  world: WorldReference;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-violet-900 dark:text-violet-100">Necromancer</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {necromancerWizard === null
          ? "No current Necromancer Wizard."
          : `Necromancer Wizard ${necromancerWizard.name}. Home Isle: ${worldIsleName(world.isles, necromancerWizard.homeIsleId)}. Sanctum: ${placeName(world.places, necromancerWizard.sanctumPlaceId)}.`}
      </p>
    </div>
  );
}

function SetupPanel({
  setup,
  setSetup,
  world,
  pending,
  error,
  onInitialize,
}: {
  setup: NecromancerSetupDraft;
  setSetup: (updater: (current: NecromancerSetupDraft) => NecromancerSetupDraft) => void;
  world: WorldReference;
  pending: boolean;
  error: string | null;
  onInitialize: () => void;
}) {
  const ready = necromancerSetupReady(setup, world.denizens);
  const slots = arrangementSetupSlots(setup.arrangementId);
  const lawCount = setup.selectedLawIds.filter((id, index, all) => all.indexOf(id) === index).length;

  function toggleLaw(id: string): void {
    setSetup((current) => ({
      ...current,
      selectedLawIds: current.selectedLawIds.includes(id)
        ? current.selectedLawIds.filter((value) => value !== id)
        : [...current.selectedLawIds, id],
    }));
  }

  return (
    <div className="rounded-xl border border-violet-200 dark:border-violet-900 bg-white dark:bg-slate-900 p-4 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-violet-900 dark:text-violet-100">Initialize Necromancer</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          The command constructs arrangement state; this form only gathers the choices that cannot be derived.
          Named Foes, Ally, and Ghoul-Caller are existing World Denizens. Create missing characters in World first.
          This form does not create World Denizens.
        </p>
      </div>
      {error !== null && (
        <div role="alert" className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      <section>
        <h3 className="text-sm font-semibold mb-2">Arrangement</h3>
        <select
          aria-label="Arrangement"
          className={fieldClass}
          value={setup.arrangementId}
          onChange={(event) => setSetup((current) => withSetupArrangement(current, event.target.value))}
        >
          <option value="">Select arrangement…</option>
          {NECROMANCER_ARRANGEMENT_OPTIONS.map((option) => (
            <option key={option.arrangementId} value={option.arrangementId}>{option.displayName}</option>
          ))}
        </select>
        {setup.arrangementId !== "" && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{arrangementSetupSummary(setup.arrangementId)}</p>
        )}
      </section>
      <section>
        <h3 className="text-sm font-semibold mb-1">Two Laws of Death</h3>
        <p className="text-xs text-slate-500 mb-2">Initialization requires exactly two distinct Laws. Both start revealed. Later editing may use any unique count.</p>
        <div className="space-y-2">
          {NECROMANCER_LAW_OPTIONS.map((law) => (
            <label key={law.id} className="flex gap-2 text-sm items-start">
              <input
                type="checkbox"
                checked={setup.selectedLawIds.includes(law.id)}
                onChange={() => toggleLaw(law.id)}
              />
              <span>
                <span className="font-medium">{law.applicationLabel}</span>
                <span className="block text-slate-500">{law.text}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs mt-2 text-slate-500">Selected: {lawCount} / 2 required</p>
      </section>
      {slots.filter((slot) => slot.kind !== "ally" && slot.kind !== "ghoul_caller").length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-2">Foe bindings</h3>
          <div className="space-y-3">
            {slots.filter((slot) => slot.kind === "deep_foe" || slot.kind === "terminus_foe" || slot.kind === "far_foe").map((slot) => (
              <div key={slot.id} className="grid sm:grid-cols-2 gap-2">
                <label className="text-sm">
                  <span className="block font-medium mb-1">{slot.label}</span>
                  <select
                    aria-label={slot.label}
                    className={fieldClass}
                    value={
                      slot.kind === "deep_foe"
                        ? setup.deepFoeDenizenId
                        : slot.kind === "terminus_foe"
                          ? setup.terminusFoeDenizenId
                          : setup.farFoes[slot.farIndex ?? 0]?.denizenId ?? ""
                    }
                    onChange={(event) => setSetup((current) => {
                      if (slot.kind === "deep_foe") return { ...current, deepFoeDenizenId: event.target.value };
                      if (slot.kind === "terminus_foe") return { ...current, terminusFoeDenizenId: event.target.value };
                      const farFoes = current.farFoes.map((foe, index) =>
                        index === (slot.farIndex ?? 0) ? { ...foe, denizenId: event.target.value } : foe,
                      );
                      return { ...current, farFoes };
                    })}
                  >
                    <option value="">Select Denizen…</option>
                    {availableSetupDenizens(
                      world.denizens,
                      setup,
                      slot.kind === "deep_foe"
                        ? setup.deepFoeDenizenId
                        : slot.kind === "terminus_foe"
                          ? setup.terminusFoeDenizenId
                          : setup.farFoes[slot.farIndex ?? 0]?.denizenId ?? "",
                      false,
                    ).map((denizen) => (
                      <option key={denizen.denizenId} value={denizen.denizenId}>
                        {denizen.name} ({denizen.representation})
                      </option>
                    ))}
                  </select>
                </label>
                {slot.kind === "far_foe" && (
                  <label className="text-sm">
                    <span className="block font-medium mb-1">Far Gate</span>
                    <select
                      aria-label={`${slot.label} Far Gate`}
                      className={fieldClass}
                      value={setup.farFoes[slot.farIndex ?? 0]?.gateId ?? ""}
                      onChange={(event) => setSetup((current) => ({
                        ...current,
                        farFoes: current.farFoes.map((foe, index) =>
                          index === (slot.farIndex ?? 0) ? { ...foe, gateId: event.target.value } : foe,
                        ),
                      }))}
                    >
                      <option value="">Select Far Gate…</option>
                      {NECROMANCER_FAR_BUILTIN_GATE_IDS.map((gateId) => (
                        <option key={gateId} value={gateId}>
                          {NECROMANCER_BUILTIN_GATE_DEFINITIONS.find((gate) => gate.gateId === gateId)?.displayName}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      <section>
        <h3 className="text-sm font-semibold mb-2">Ally binding</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          <label className="text-sm">
            <span className="block font-medium mb-1">Ally Denizen</span>
            <select
              aria-label="Ally Denizen"
              className={fieldClass}
              value={setup.allyDenizenId}
              onChange={(event) => setSetup((current) => ({ ...current, allyDenizenId: event.target.value }))}
            >
              <option value="">Select Denizen…</option>
              {availableSetupDenizens(world.denizens, setup, setup.allyDenizenId, false).map((denizen) => (
                <option key={denizen.denizenId} value={denizen.denizenId}>
                  {denizen.name} ({denizen.representation})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block font-medium mb-1">Near Gate</span>
            <select
              aria-label="Ally Near Gate"
              className={fieldClass}
              value={setup.allyGateId}
              onChange={(event) => setSetup((current) => ({ ...current, allyGateId: event.target.value }))}
            >
              <option value="">Select Near Gate…</option>
              {NECROMANCER_NEAR_BUILTIN_GATE_IDS.map((gateId) => (
                <option key={gateId} value={gateId}>
                  {NECROMANCER_BUILTIN_GATE_DEFINITIONS.find((gate) => gate.gateId === gateId)?.displayName}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      {slots.some((slot) => slot.kind === "ghoul_caller") && (
        <section>
          <h3 className="text-sm font-semibold mb-2">Ghoul-Caller binding</h3>
          <p className="text-xs text-slate-500 mb-2">Explosive starts the Ghoul-Caller Disruptive with petty dead 0. Those values are not asked here.</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="text-sm">
              <span className="block font-medium mb-1">Individual Denizen</span>
              <select
                aria-label="Ghoul-Caller Denizen"
                className={fieldClass}
                value={setup.ghoulCallerDenizenId}
                onChange={(event) => setSetup((current) => ({ ...current, ghoulCallerDenizenId: event.target.value }))}
              >
                <option value="">Select individual Denizen…</option>
                {availableSetupDenizens(world.denizens, setup, setup.ghoulCallerDenizenId, true).map((denizen) => (
                  <option key={denizen.denizenId} value={denizen.denizenId}>{denizen.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="block font-medium mb-1">Edge-of-Life path</span>
              <select
                aria-label="Ghoul-Caller Edge path"
                className={fieldClass}
                value={setup.ghoulCallerPathSpaceId}
                onChange={(event) => setSetup((current) => ({ ...current, ghoulCallerPathSpaceId: event.target.value }))}
              >
                <option value="">Select Edge space…</option>
                {NECROMANCER_EDGE_PATH_SPACE_IDS.map((pathSpaceId) => (
                  <option key={pathSpaceId} value={pathSpaceId}>
                    {NECROMANCER_BUILTIN_PATH_SPACE_DEFINITIONS.find((path) => path.pathSpaceId === pathSpaceId)?.applicationLabel}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      )}
      <button className={btnClass} disabled={pending || !ready} onClick={onInitialize}>
        Initialize Necromancer
      </button>
    </div>
  );
}

function DepthPanel({
  necromancer,
  necromancerWizard,
  depthDraft,
  setDepthDraft,
  pending,
  onSaveMatched,
  onBindCurrent,
  onClearStale,
}: {
  necromancer: NecromancerState;
  necromancerWizard: NecromancerWizardRef | null;
  depthDraft: string;
  setDepthDraft: (value: string) => void;
  pending: boolean;
  onSaveMatched: () => Promise<void>;
  onBindCurrent: () => Promise<void>;
  onClearStale: () => Promise<void>;
}) {
  const kind = necromancerDepthUiKind(necromancer.depth, necromancerWizard?.wizardId ?? null);
  return (
    <section className="rounded-lg border border-violet-100 dark:border-violet-900 p-3 space-y-2">
      <h3 className="text-sm font-semibold">Depth</h3>
      <p className="text-sm">Current Necromancer: <strong>{necromancerWizard?.name ?? "none"}</strong></p>
      <p className="text-sm">
        Depth owner: <strong>{necromancer.depth === null ? "none" : necromancer.depth.wizardId}</strong>
        {necromancer.depth !== null ? ` · value ${necromancer.depth.value}` : ""}
      </p>
      {kind === "matched" && (
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-sm">
            Depth
            <input
              aria-label="Depth value"
              className={`${fieldClass} mt-1 w-28`}
              value={depthDraft}
              onChange={(event) => setDepthDraft(event.target.value)}
            />
          </label>
          <button className={btnClass} disabled={pending} onClick={() => { void onSaveMatched(); }}>Save Depth</button>
        </div>
      )}
      {kind === "bind_current" && necromancerWizard !== null && (
        <button className={btnClass} disabled={pending} onClick={() => { void onBindCurrent(); }}>
          Bind current Necromancer at Depth 0
        </button>
      )}
      {kind === "clear_stale" && (
        <button className={ghostBtn} disabled={pending} onClick={() => { void onClearStale(); }}>
          Clear stale Depth
        </button>
      )}
      {kind === "vacant_empty" && (
        <p className="text-xs text-slate-500">No Depth is stored while the Necromancer seat is vacant.</p>
      )}
    </section>
  );
}

function LawsPanel({
  necromancer,
  editing,
  lawDraft,
  setLawDraft,
  pending,
  onToggleEdit,
  onSave,
}: {
  necromancer: NecromancerState;
  editing: boolean;
  lawDraft: NecromancerSelectedLaw[];
  setLawDraft: (value: NecromancerSelectedLaw[]) => void;
  pending: boolean;
  onToggleEdit: () => void;
  onSave: () => Promise<void>;
}) {
  return (
    <section className="rounded-lg border border-violet-100 dark:border-violet-900 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Laws of Death</h3>
        <button className={ghostBtn} onClick={onToggleEdit}>{editing ? "Close Edit Laws" : "Edit Laws"}</button>
      </div>
      {!editing && (
        <ul className="space-y-2">
          {necromancer.selectedLaws.length === 0 && (
            <li className="text-sm text-slate-500">No Laws selected.</li>
          )}
          {necromancer.selectedLaws.map((law, index) => {
            const view = ordinaryLawReadView(law);
            if (view.kind === "hidden") {
              return <li key={`hidden-${index}`} className="text-sm italic">Hidden Law</li>;
            }
            return (
              <li key={view.lawId} className="text-sm">
                <span className="font-medium">{view.applicationLabel}</span>
                <span className="block text-slate-500">{view.text}</span>
              </li>
            );
          })}
        </ul>
      )}
      {editing && (
        <div className="space-y-2">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Editing reveals hidden Law information in this browser. The current app has no private-state boundary.
          </p>
          {NECROMANCER_LAW_OPTIONS.map((law) => {
            const selected = lawDraft.find((entry) => entry.lawId === law.id);
            return (
              <div key={law.id} className="flex flex-wrap gap-2 items-start text-sm">
                <label className="flex gap-2 items-start flex-1">
                  <input
                    type="checkbox"
                    checked={selected !== undefined}
                    onChange={() => {
                      if (selected !== undefined) {
                        setLawDraft(lawDraft.filter((entry) => entry.lawId !== law.id));
                      } else {
                        setLawDraft([...lawDraft, { lawId: law.id, visibility: "revealed" }]);
                      }
                    }}
                  />
                  <span>
                    <span className="font-medium">{law.applicationLabel}</span>
                    <span className="block text-slate-500">{law.text}</span>
                  </span>
                </label>
                {selected !== undefined && (
                  <select
                    aria-label={`${law.applicationLabel} visibility`}
                    className={`${fieldClass} w-32`}
                    value={selected.visibility}
                    onChange={(event) => {
                      const visibility = event.target.value as NecromancerSelectedLaw["visibility"];
                      setLawDraft(lawDraft.map((entry) =>
                        entry.lawId === law.id ? { ...entry, visibility } : entry,
                      ));
                    }}
                  >
                    {NECROMANCER_LAW_VISIBILITIES.map((visibility) => (
                      <option key={visibility} value={visibility}>{visibility}</option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
          <button className={btnClass} disabled={pending} onClick={() => { void onSave(); }}>Save Laws</button>
        </div>
      )}
    </section>
  );
}

function DeathBoard({
  necromancer,
  world,
  selection,
  onSelect,
}: {
  necromancer: NecromancerState;
  world: WorldReference;
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 overflow-x-auto">
      <svg
        role="img"
        aria-label="Gates of Death board"
        viewBox={`0 0 ${NECROMANCER_BOARD_VIEWBOX.width} ${NECROMANCER_BOARD_VIEWBOX.height}`}
        className="w-full min-w-[640px] h-auto text-slate-800 dark:text-slate-100"
      >
        <defs>
          <marker id="nec-step-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
          </marker>
          <marker id="nec-terminal-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
          </marker>
        </defs>
        {NECROMANCER_BOARD_BAND_LABELS.map((label) => (
          <text key={label.text} x={label.x} y={label.y} fontSize={16} fill="currentColor">{label.text}</text>
        ))}
        {necromancer.steps.map((step, index) => {
          const path = builtinInternalStepPresentation(step);
          if (path === null) return null;
          return (
            <line
              key={`step-${index}`}
              x1={path.a.x}
              y1={path.a.y}
              x2={path.b.x}
              y2={path.b.y}
              stroke="#64748b"
              strokeWidth={2}
              markerEnd="url(#nec-step-arrow)"
            />
          );
        })}
        {NECROMANCER_STATIC_TERMINAL_PRESENTATIONS.map((exit) => (
          <g key={exit.terminalId}>
            <line
              x1={exit.fromPoint.x}
              y1={exit.fromPoint.y}
              x2={exit.toPoint.x}
              y2={exit.toPoint.y}
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="6 5"
              markerEnd="url(#nec-terminal-arrow)"
            />
            <rect
              x={exit.toPoint.x - 54}
              y={exit.toPoint.y - 16}
              width={108}
              height={32}
              rx={6}
              fill="#f8fafc"
              stroke="#94a3b8"
            />
            <text x={exit.toPoint.x} y={exit.toPoint.y + 4} textAnchor="middle" fontSize={11} fill="#334155">
              {exit.label}
            </text>
          </g>
        ))}
        {NECROMANCER_BUILTIN_PATH_SPACE_IDS.map((pathSpaceId) => {
          const point = NECROMANCER_BUILTIN_PATH_MAP_POINTS[pathSpaceId];
          const location = { kind: "path" as const, pathSpaceId };
          const pieces = piecesAtSpace(necromancer, location);
          const selected = selection?.kind === "path" && selection.pathSpaceId === pathSpaceId;
          const definition = NECROMANCER_BUILTIN_PATH_SPACE_DEFINITIONS.find((path) => path.pathSpaceId === pathSpaceId);
          return (
            <g
              key={pathSpaceId}
              role="button"
              tabIndex={0}
              aria-label={definition?.applicationLabel ?? pathSpaceId}
              onClick={() => onSelect({ kind: "path", pathSpaceId })}
              onKeyDown={(event) => activate(event, () => onSelect({ kind: "path", pathSpaceId }))}
            >
              <circle
                cx={point.x}
                cy={point.y}
                r={28}
                fill={selected ? "#ddd6fe" : "#e2e8f0"}
                stroke="#4c1d95"
                strokeWidth={selected ? 3 : 1.5}
              />
              <text x={point.x} y={point.y - 6} textAnchor="middle" fontSize={9} fill="#0f172a">
                {(definition?.applicationLabel ?? pathSpaceId).replace(" Edge of Life", "").replace(" Far Lands", " Far").replace(" Abyss", "")}
              </text>
              <text x={point.x} y={point.y + 8} textAnchor="middle" fontSize={9} fill="#4c1d95">
                {compactPieceText(pieces, world)}
              </text>
            </g>
          );
        })}
        {NECROMANCER_BUILTIN_GATE_IDS.map((gateId) => {
          const point = NECROMANCER_BUILTIN_GATE_MAP_POINTS[gateId];
          const gate = findGate(necromancer, gateId);
          const location = { kind: "gate" as const, gateId };
          const pieces = piecesAtSpace(necromancer, location);
          const selected = selection?.kind === "gate" && selection.gateId === gateId;
          const status = gate?.status ?? "ordinary";
          const fill = status === "destroyed" ? "#1e293b" : status === "hostile" ? "#fecaca" : selected ? "#ddd6fe" : "#f5f3ff";
          const textFill = status === "destroyed" ? "#e2e8f0" : "#0f172a";
          return (
            <g
              key={gateId}
              role="button"
              tabIndex={0}
              aria-label={`${gateDisplayName(gate ?? { origin: "builtin", gateId, status })} ${status}`}
              onClick={() => onSelect({ kind: "gate", gateId })}
              onKeyDown={(event) => activate(event, () => onSelect({ kind: "gate", gateId }))}
            >
              <rect
                x={point.x - 42}
                y={point.y - 24}
                width={84}
                height={48}
                rx={8}
                fill={fill}
                stroke={selected ? "#5b21b6" : "#4c1d95"}
                strokeWidth={selected ? 3 : 1.5}
              />
              <text x={point.x} y={point.y - 6} textAnchor="middle" fontSize={11} fill={textFill}>
                {NECROMANCER_BUILTIN_GATE_DEFINITIONS.find((entry) => entry.gateId === gateId)?.displayName}
              </text>
              <text x={point.x} y={point.y + 10} textAnchor="middle" fontSize={9} fill={textFill}>
                {status}{compactPieceText(pieces, world) !== "" ? ` · ${compactPieceText(pieces, world)}` : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function compactPieceText(
  pieces: ReturnType<typeof piecesAtSpace>,
  world: WorldReference,
): string {
  const bits: string[] = [];
  if (pieces.souls > 0) bits.push(`${pieces.souls}S`);
  for (const foe of pieces.foes) bits.push(`F:${denizenName(world.denizens, foe.denizenId)}`);
  for (const ally of pieces.allies) bits.push(`A:${denizenName(world.denizens, ally.denizenId)}`);
  for (const ghoul of pieces.ghoulCallers) bits.push(`G:${denizenName(world.denizens, ghoul.denizenId)}`);
  return bits.join(" · ");
}

function Inspector({
  necromancer,
  world,
  selection,
  selectedLocation,
  selectedGate,
  selectedPath,
  soulDraft,
  setSoulDraft,
  moveAmount,
  setMoveAmount,
  moveToKey,
  setMoveToKey,
  pending,
  onSetSouls,
  onMoveSouls,
  onSetGateStatus,
}: {
  necromancer: NecromancerState;
  world: WorldReference;
  selection: Selection | null;
  selectedLocation: NecromancerOccupiableSpaceRef | null;
  selectedGate: NecromancerGateState | undefined;
  selectedPath: NecromancerPathSpaceState | undefined;
  soulDraft: string;
  setSoulDraft: (value: string) => void;
  moveAmount: string;
  setMoveAmount: (value: string) => void;
  moveToKey: string;
  setMoveToKey: (value: string) => void;
  pending: boolean;
  onSetSouls: () => Promise<void>;
  onMoveSouls: () => Promise<void>;
  onSetGateStatus: (status: NecromancerGateStatus) => Promise<void>;
}) {
  if (selection === null || selectedLocation === null) {
    return (
      <aside aria-label="Selected space" className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-sm text-slate-500">
        Select a Gate or path space to inspect and edit it.
      </aside>
    );
  }
  const pieces = piecesAtSpace(necromancer, selectedLocation);
  const destinations = activeOccupiableSpaces(necromancer).filter(
    (space) => occupiableRefKey(space) !== occupiableRefKey(selectedLocation),
  );
  const statusOptions = selectedGate === undefined ? [] : availableGateStatusTransitions(selectedGate.status);
  return (
    <aside aria-label="Selected space" className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">
          {selectedGate !== undefined ? gateDisplayName(selectedGate) : selectedPath !== undefined ? pathSpaceDisplayName(selectedPath) : "Space"}
        </h3>
        <p className="text-xs text-slate-500">
          {selectedGate !== undefined
            ? `${gateBandLabel(gateBandOf(selectedGate))} Gate · ${gateStatusLabel(selectedGate.status)}`
            : selectedPath !== undefined
              ? `${pathRegionLabel(selectedPath.origin === "campaign" ? selectedPath.region : (NECROMANCER_BUILTIN_PATH_SPACE_DEFINITIONS.find((path) => path.pathSpaceId === selectedPath.pathSpaceId)?.region ?? "edge_of_life"))} path`
              : ""}
        </p>
      </div>
      <p className="text-sm">Souls: <strong>{pieces.souls}</strong></p>
      <PieceList label="Foes" items={pieces.foes.map((foe) => denizenName(world.denizens, foe.denizenId))} />
      <PieceList label="Allies" items={pieces.allies.map((ally) => denizenName(world.denizens, ally.denizenId))} />
      <PieceList label="Ghoul-Callers" items={pieces.ghoulCallers.map((ghoul) => denizenName(world.denizens, ghoul.denizenId))} />
      {selectedGate !== undefined && (
        <div className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gate status</h4>
          {statusOptions.length === 0 && (
            <p className="text-xs text-slate-500">Destroyed Gates cannot be restored from this control.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <button
                key={status}
                className={ghostBtn}
                disabled={pending}
                onClick={() => { void onSetGateStatus(status); }}
              >
                Set {status}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-1">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Soul count</h4>
        <div className="flex gap-2 items-end">
          <label className="text-sm flex-1">
            Exact count
            <input
              aria-label="Soul count"
              className={`${fieldClass} mt-1`}
              value={soulDraft}
              onChange={(event) => setSoulDraft(event.target.value)}
            />
          </label>
          <button className={btnClass} disabled={pending} onClick={() => { void onSetSouls(); }}>Set count</button>
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Move Souls</h4>
        <p className="text-xs text-slate-500">Manual editing. Adjacency, direction, and blocking are not enforced here.</p>
        <label className="text-sm block">
          Amount
          <input
            aria-label="Move Soul amount"
            className={`${fieldClass} mt-1`}
            value={moveAmount}
            onChange={(event) => setMoveAmount(event.target.value)}
          />
        </label>
        <OccupiableSelect
          ariaLabel="Move Soul destination"
          value={moveToKey}
          onChange={setMoveToKey}
          spaces={destinations}
          necromancer={necromancer}
          allowEmpty
          emptyLabel="Select destination…"
        />
        <button className={btnClass} disabled={pending} onClick={() => { void onMoveSouls(); }}>Move Souls</button>
      </div>
    </aside>
  );
}

function PieceList({ label, items }: { label: string; items: readonly string[] }) {
  return (
    <p className="text-sm">
      {label}: {items.length === 0 ? <span className="text-slate-500">none</span> : <strong>{items.join(", ")}</strong>}
    </p>
  );
}

function EscapedFoeTray({
  necromancer,
  world,
}: {
  necromancer: NecromancerState;
  world: WorldReference;
}) {
  const groups = escapedFoesGroupedBySeat(necromancer.foes);
  return (
    <section className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-2">
      <h3 className="text-sm font-semibold">Escaped Foes</h3>
      {groups.length === 0 && <p className="text-sm text-slate-500">No escaped Foes.</p>}
      {groups.map((group) => (
        <div key={group.seatId}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.domainLabel}</p>
          <ul className="text-sm">
            {group.foes.map((foe) => (
              <li key={foe.denizenId}>
                {denizenName(world.denizens, foe.denizenId)}
                {foe.location.kind === "escaped" ? ` · ${foe.location.abominationKind}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function RoleManagement({
  necromancer,
  world,
  campaignId,
  pending,
  run,
  addNecromancerFoe,
  updateNecromancerFoe,
  removeNecromancerFoe,
  addNecromancerAlly,
  updateNecromancerAlly,
  removeNecromancerAlly,
  addNecromancerGhoulCaller,
  updateNecromancerGhoulCaller,
  removeNecromancerGhoulCaller,
  onSelectSpace,
}: {
  necromancer: NecromancerState;
  world: WorldReference;
  campaignId: string;
  pending: boolean;
  run: (action: () => Promise<void>) => Promise<boolean>;
  addNecromancerFoe: (args: { commandId: string; expectedCampaignId: string; foe: NecromancerFoeState }) => Promise<unknown>;
  updateNecromancerFoe: (args: ReturnType<typeof buildUpdateNecromancerFoePayload>) => Promise<unknown>;
  removeNecromancerFoe: (args: ReturnType<typeof buildRemoveNecromancerFoePayload>) => Promise<unknown>;
  addNecromancerAlly: (args: { commandId: string; expectedCampaignId: string; ally: NecromancerAllyState }) => Promise<unknown>;
  updateNecromancerAlly: (args: ReturnType<typeof buildUpdateNecromancerAllyPayload>) => Promise<unknown>;
  removeNecromancerAlly: (args: ReturnType<typeof buildRemoveNecromancerAllyPayload>) => Promise<unknown>;
  addNecromancerGhoulCaller: (args: { commandId: string; expectedCampaignId: string; ghoulCaller: NecromancerGhoulCallerState }) => Promise<unknown>;
  updateNecromancerGhoulCaller: (args: NonNullable<ReturnType<typeof buildUpdateNecromancerGhoulCallerPayload>>) => Promise<unknown>;
  removeNecromancerGhoulCaller: (args: ReturnType<typeof buildRemoveNecromancerGhoulCallerPayload>) => Promise<unknown>;
  onSelectSpace: (ref: NecromancerOccupiableSpaceRef) => void;
}) {
  const occupiable = activeOccupiableSpaces(necromancer);
  const edgePaths = activeEdgeOfLifePathSpaces(necromancer);
  const [foeDenizenId, setFoeDenizenId] = useState("");
  const [foeKind, setFoeKind] = useState<"death" | "escaped">("death");
  const [foeSpaceKey, setFoeSpaceKey] = useState("");
  const [foeSeatId, setFoeSeatId] = useState<PactSeatId>(otherPactSeatOptions()[0]!);
  const [foeAbomination, setFoeAbomination] = useState<NecromancerAbominationKind>("occult");
  const [allyDenizenId, setAllyDenizenId] = useState("");
  const [allySpaceKey, setAllySpaceKey] = useState("");
  const [ghoulDenizenId, setGhoulDenizenId] = useState("");
  const [ghoulPathId, setGhoulPathId] = useState("");
  const [ghoulDisposition, setGhoulDisposition] = useState<NecromancerGhoulCallerDisposition>("disruptive");
  const [ghoulPetty, setGhoulPetty] = useState("0");

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <section className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-2">
        <h3 className="text-sm font-semibold">Foes</h3>
        {necromancer.foes.map((foe) => (
          <FoeRow
            key={foe.denizenId}
            foe={foe}
            necromancer={necromancer}
            world={world}
            occupiable={occupiable}
            pending={pending}
            onUpdate={async (location) => {
              const payload = buildUpdateNecromancerFoePayload({
                commandId: newCommandId(),
                expectedCampaignId: campaignId,
                denizenId: foe.denizenId,
                expectedLocation: foe.location,
                location,
              });
              await run(async () => {
                await updateNecromancerFoe(payload);
              });
            }}
            onRemove={async () => {
              const payload = buildRemoveNecromancerFoePayload({
                commandId: newCommandId(),
                expectedCampaignId: campaignId,
                expectedFoe: foe,
              });
              await run(async () => {
                await removeNecromancerFoe(payload);
              });
            }}
            onSelectSpace={onSelectSpace}
          />
        ))}
        <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add Foe</h4>
          <select aria-label="Add Foe Denizen" className={fieldClass} value={foeDenizenId} onChange={(event) => setFoeDenizenId(event.target.value)}>
            <option value="">Existing Denizen…</option>
            {unusedFoeDenizens(world.denizens, necromancer.foes).map((denizen) => (
              <option key={denizen.denizenId} value={denizen.denizenId}>{denizen.name}</option>
            ))}
          </select>
          <select aria-label="Add Foe location kind" className={fieldClass} value={foeKind} onChange={(event) => setFoeKind(event.target.value as "death" | "escaped")}>
            <option value="death">Death space</option>
            <option value="escaped">Escaped</option>
          </select>
          {foeKind === "death" ? (
            <OccupiableSelect
              ariaLabel="Add Foe Death location"
              value={foeSpaceKey}
              onChange={setFoeSpaceKey}
              spaces={occupiable}
              necromancer={necromancer}
              allowEmpty
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <select aria-label="Escaped Pact Domain" className={fieldClass} value={foeSeatId} onChange={(event) => setFoeSeatId(event.target.value as PactSeatId)}>
                {otherPactSeatOptions().map((seatId) => (
                  <option key={seatId} value={seatId}>{seatId}</option>
                ))}
              </select>
              <select aria-label="Abomination kind" className={fieldClass} value={foeAbomination} onChange={(event) => setFoeAbomination(event.target.value as NecromancerAbominationKind)}>
                {NECROMANCER_ABOMINATION_KINDS.map((kind) => (
                  <option key={kind} value={kind}>{kind}</option>
                ))}
              </select>
            </div>
          )}
          <button
            className={btnClass}
            disabled={pending}
            onClick={() => {
              void (async () => {
                const location: NecromancerFoeLocation | null = foeKind === "escaped"
                  ? { kind: "escaped", seatId: foeSeatId, abominationKind: foeAbomination }
                  : parseOccupiableRefKey(foeSpaceKey);
                if (foeDenizenId === "" || location === null) return;
                const payload = buildAddNecromancerFoePayload({
                  commandId: newCommandId(),
                  expectedCampaignId: campaignId,
                  foe: { denizenId: foeDenizenId as NecromancerFoeState["denizenId"], location },
                });
                await run(async () => {
                  await addNecromancerFoe(payload);
                });
              })();
            }}
          >
            Add Foe
          </button>
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-2">
        <h3 className="text-sm font-semibold">Allies</h3>
        {necromancer.allies.map((ally) => (
          <AllyRow
            key={ally.denizenId}
            ally={ally}
            necromancer={necromancer}
            world={world}
            occupiable={occupiable}
            pending={pending}
            onUpdate={async (location) => {
              const payload = buildUpdateNecromancerAllyPayload({
                commandId: newCommandId(),
                expectedCampaignId: campaignId,
                denizenId: ally.denizenId,
                expectedLocation: ally.location,
                location,
              });
              await run(async () => {
                await updateNecromancerAlly(payload);
              });
            }}
            onRemove={async () => {
              const payload = buildRemoveNecromancerAllyPayload({
                commandId: newCommandId(),
                expectedCampaignId: campaignId,
                expectedAlly: ally,
              });
              await run(async () => {
                await removeNecromancerAlly(payload);
              });
            }}
          />
        ))}
        <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add Ally</h4>
          <select aria-label="Add Ally Denizen" className={fieldClass} value={allyDenizenId} onChange={(event) => setAllyDenizenId(event.target.value)}>
            <option value="">Existing Denizen…</option>
            {unusedAllyDenizens(world.denizens, necromancer.allies).map((denizen) => (
              <option key={denizen.denizenId} value={denizen.denizenId}>{denizen.name}</option>
            ))}
          </select>
          <OccupiableSelect
            ariaLabel="Add Ally location"
            value={allySpaceKey}
            onChange={setAllySpaceKey}
            spaces={occupiable}
            necromancer={necromancer}
            allowEmpty
          />
          <button
            className={btnClass}
            disabled={pending}
            onClick={() => {
              void (async () => {
                const location = parseOccupiableRefKey(allySpaceKey);
                if (allyDenizenId === "" || location === null) return;
                const payload = buildAddNecromancerAllyPayload({
                  commandId: newCommandId(),
                  expectedCampaignId: campaignId,
                  ally: { denizenId: allyDenizenId as NecromancerAllyState["denizenId"], location },
                });
                await run(async () => {
                  await addNecromancerAlly(payload);
                });
              })();
            }}
          >
            Add Ally
          </button>
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-2">
        <h3 className="text-sm font-semibold">Ghoul-Callers</h3>
        {necromancer.ghoulCallers.map((ghoul) => (
          <GhoulRow
            key={ghoul.denizenId}
            ghoul={ghoul}
            necromancer={necromancer}
            world={world}
            edgePaths={edgePaths}
            pending={pending}
            onUpdate={async (location, disposition, pettyDeadCount) => {
              const payload = buildUpdateNecromancerGhoulCallerPayload({
                commandId: newCommandId(),
                expectedCampaignId: campaignId,
                denizenId: ghoul.denizenId,
                expected: ghoul,
                location,
                disposition,
                pettyDeadCount,
              });
              if (payload === null) return;
              await run(async () => {
                await updateNecromancerGhoulCaller(payload);
              });
            }}
            onRemove={async () => {
              const payload = buildRemoveNecromancerGhoulCallerPayload({
                commandId: newCommandId(),
                expectedCampaignId: campaignId,
                expectedGhoulCaller: ghoul,
              });
              await run(async () => {
                await removeNecromancerGhoulCaller(payload);
              });
            }}
          />
        ))}
        <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add Ghoul-Caller</h4>
          <select aria-label="Add Ghoul-Caller Denizen" className={fieldClass} value={ghoulDenizenId} onChange={(event) => setGhoulDenizenId(event.target.value)}>
            <option value="">Individual Denizen…</option>
            {unusedIndividualGhoulDenizens(world.denizens, necromancer.ghoulCallers).map((denizen) => (
              <option key={denizen.denizenId} value={denizen.denizenId}>{denizen.name}</option>
            ))}
          </select>
          <select aria-label="Add Ghoul-Caller Edge path" className={fieldClass} value={ghoulPathId} onChange={(event) => setGhoulPathId(event.target.value)}>
            <option value="">Edge-of-Life path…</option>
            {edgePaths.map((path) => (
              <option key={path.pathSpaceId} value={path.pathSpaceId}>{pathSpaceDisplayName(path)}</option>
            ))}
          </select>
          <select aria-label="Add Ghoul-Caller disposition" className={fieldClass} value={ghoulDisposition} onChange={(event) => setGhoulDisposition(event.target.value as NecromancerGhoulCallerDisposition)}>
            {NECROMANCER_GHOUL_CALLER_DISPOSITIONS.map((disposition) => (
              <option key={disposition} value={disposition}>{disposition}</option>
            ))}
          </select>
          <input
            aria-label="Add Ghoul-Caller petty dead"
            className={fieldClass}
            value={ghoulPetty}
            onChange={(event) => setGhoulPetty(event.target.value)}
          />
          <button
            className={btnClass}
            disabled={pending}
            onClick={() => {
              void (async () => {
                const pettyDeadCount = parseNonNegInt(ghoulPetty);
                if (ghoulDenizenId === "" || ghoulPathId === "" || pettyDeadCount === null) return;
                const payload = buildAddNecromancerGhoulCallerPayload({
                  commandId: newCommandId(),
                  expectedCampaignId: campaignId,
                  ghoulCaller: {
                    denizenId: ghoulDenizenId as NecromancerGhoulCallerState["denizenId"],
                    disposition: ghoulDisposition,
                    location: { kind: "path", pathSpaceId: ghoulPathId as NecromancerGhoulCallerState["location"]["pathSpaceId"] },
                    pettyDeadCount,
                  },
                });
                if (payload === null) return;
                await run(async () => {
                  await addNecromancerGhoulCaller(payload);
                });
              })();
            }}
          >
            Add Ghoul-Caller
          </button>
        </div>
      </section>
    </div>
  );
}

function FoeRow({
  foe,
  necromancer,
  world,
  occupiable,
  pending,
  onUpdate,
  onRemove,
  onSelectSpace,
}: {
  foe: NecromancerFoeState;
  necromancer: NecromancerState;
  world: WorldReference;
  occupiable: readonly NecromancerOccupiableSpaceRef[];
  pending: boolean;
  onUpdate: (location: NecromancerFoeLocation) => Promise<void>;
  onRemove: () => Promise<void>;
  onSelectSpace: (ref: NecromancerOccupiableSpaceRef) => void;
}) {
  const [kind, setKind] = useState<"death" | "escaped">(foe.location.kind === "escaped" ? "escaped" : "death");
  const [spaceKey, setSpaceKey] = useState(foe.location.kind === "escaped" ? "" : occupiableRefKey(foe.location));
  const [seatId, setSeatId] = useState<PactSeatId>(foe.location.kind === "escaped" ? foe.location.seatId : otherPactSeatOptions()[0]!);
  const [abomination, setAbomination] = useState<NecromancerAbominationKind>(
    foe.location.kind === "escaped" ? foe.location.abominationKind : "occult",
  );
  const locationKey = foe.location.kind === "escaped"
    ? `escaped:${foe.location.seatId}:${foe.location.abominationKind}`
    : occupiableRefKey(foe.location);
  useLayoutEffect(() => {
    setKind(foe.location.kind === "escaped" ? "escaped" : "death");
    setSpaceKey(foe.location.kind === "escaped" ? "" : occupiableRefKey(foe.location));
    setSeatId(foe.location.kind === "escaped" ? foe.location.seatId : otherPactSeatOptions()[0]!);
    setAbomination(foe.location.kind === "escaped" ? foe.location.abominationKind : "occult");
  }, [locationKey, foe.location]);
  return (
    <div className="rounded border border-slate-200 dark:border-slate-700 p-2 space-y-1">
      <p className="text-sm font-medium">{denizenName(world.denizens, foe.denizenId)}</p>
      <p className="text-xs text-slate-500">{foeLocationLabel(foe.location, necromancer)}</p>
      <select className={fieldClass} value={kind} onChange={(event) => setKind(event.target.value as "death" | "escaped")}>
        <option value="death">Death space</option>
        <option value="escaped">Escaped</option>
      </select>
      {kind === "death" ? (
        <OccupiableSelect
          ariaLabel={`Update ${denizenName(world.denizens, foe.denizenId)} location`}
          value={spaceKey}
          onChange={setSpaceKey}
          spaces={occupiable}
          necromancer={necromancer}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <select className={fieldClass} value={seatId} onChange={(event) => setSeatId(event.target.value as PactSeatId)}>
            {otherPactSeatOptions().map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select className={fieldClass} value={abomination} onChange={(event) => setAbomination(event.target.value as NecromancerAbominationKind)}>
            {NECROMANCER_ABOMINATION_KINDS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex gap-2">
        <button
          className={btnClass}
          disabled={pending}
          onClick={() => {
            const location: NecromancerFoeLocation | null = kind === "escaped"
              ? { kind: "escaped", seatId, abominationKind: abomination }
              : parseOccupiableRefKey(spaceKey);
            if (location === null) return;
            if (location.kind !== "escaped") onSelectSpace(location);
            void onUpdate(location);
          }}
        >
          Update location
        </button>
        <button className={ghostBtn} disabled={pending} onClick={() => { void onRemove(); }}>Remove</button>
      </div>
    </div>
  );
}

function AllyRow({
  ally,
  necromancer,
  world,
  occupiable,
  pending,
  onUpdate,
  onRemove,
}: {
  ally: NecromancerAllyState;
  necromancer: NecromancerState;
  world: WorldReference;
  occupiable: readonly NecromancerOccupiableSpaceRef[];
  pending: boolean;
  onUpdate: (location: NecromancerOccupiableSpaceRef) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [spaceKey, setSpaceKey] = useState(occupiableRefKey(ally.location));
  const locationKey = occupiableRefKey(ally.location);
  useLayoutEffect(() => {
    setSpaceKey(occupiableRefKey(ally.location));
  }, [locationKey, ally.location]);
  return (
    <div className="rounded border border-slate-200 dark:border-slate-700 p-2 space-y-1">
      <p className="text-sm font-medium">{denizenName(world.denizens, ally.denizenId)}</p>
      <p className="text-xs text-slate-500">{occupiableSpaceLabel(ally.location, necromancer)}</p>
      <OccupiableSelect
        ariaLabel={`Update ${denizenName(world.denizens, ally.denizenId)} location`}
        value={spaceKey}
        onChange={setSpaceKey}
        spaces={occupiable}
        necromancer={necromancer}
      />
      <div className="flex gap-2">
        <button
          className={btnClass}
          disabled={pending}
          onClick={() => {
            const location = parseOccupiableRefKey(spaceKey);
            if (location === null) return;
            void onUpdate(location);
          }}
        >
          Update location
        </button>
        <button className={ghostBtn} disabled={pending} onClick={() => { void onRemove(); }}>Remove</button>
      </div>
    </div>
  );
}

function GhoulRow({
  ghoul,
  necromancer,
  world,
  edgePaths,
  pending,
  onUpdate,
  onRemove,
}: {
  ghoul: NecromancerGhoulCallerState;
  necromancer: NecromancerState;
  world: WorldReference;
  edgePaths: readonly NecromancerPathSpaceState[];
  pending: boolean;
  onUpdate: (
    location: NecromancerGhoulCallerState["location"],
    disposition: NecromancerGhoulCallerDisposition,
    pettyDeadCount: number,
  ) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [pathId, setPathId] = useState<string>(ghoul.location.pathSpaceId);
  const [disposition, setDisposition] = useState(ghoul.disposition);
  const [petty, setPetty] = useState(String(ghoul.pettyDeadCount));
  const expectedKey = `${ghoul.location.pathSpaceId}:${ghoul.disposition}:${ghoul.pettyDeadCount}`;
  useLayoutEffect(() => {
    setPathId(ghoul.location.pathSpaceId);
    setDisposition(ghoul.disposition);
    setPetty(String(ghoul.pettyDeadCount));
  }, [expectedKey, ghoul.location.pathSpaceId, ghoul.disposition, ghoul.pettyDeadCount]);
  return (
    <div className="rounded border border-slate-200 dark:border-slate-700 p-2 space-y-1">
      <p className="text-sm font-medium">{denizenName(world.denizens, ghoul.denizenId)}</p>
      <p className="text-xs text-slate-500">
        {occupiableSpaceLabel(ghoul.location, necromancer)} · {ghoul.disposition} · petty dead {ghoul.pettyDeadCount}
      </p>
      <select className={fieldClass} value={pathId} onChange={(event) => setPathId(event.target.value)}>
        {edgePaths.map((path) => (
          <option key={path.pathSpaceId} value={path.pathSpaceId}>{pathSpaceDisplayName(path)}</option>
        ))}
      </select>
      <select className={fieldClass} value={disposition} onChange={(event) => setDisposition(event.target.value as NecromancerGhoulCallerDisposition)}>
        {NECROMANCER_GHOUL_CALLER_DISPOSITIONS.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      <input className={fieldClass} value={petty} onChange={(event) => setPetty(event.target.value)} aria-label="Petty dead count" />
      <div className="flex gap-2">
        <button
          className={btnClass}
          disabled={pending}
          onClick={() => {
            const pettyDeadCount = parseNonNegInt(petty);
            if (pettyDeadCount === null) return;
            void onUpdate(
              { kind: "path", pathSpaceId: pathId as NecromancerGhoulCallerState["location"]["pathSpaceId"] },
              disposition,
              pettyDeadCount,
            );
          }}
        >
          Update
        </button>
        <button className={ghostBtn} disabled={pending} onClick={() => { void onRemove(); }}>Remove</button>
      </div>
    </div>
  );
}

function AdvancedStructure({
  necromancer,
  campaignId,
  pending,
  run,
  onSelectSpace,
  createNecromancerCampaignGate,
  updateNecromancerCampaignGate,
  createNecromancerCampaignPathSpace,
  removeNecromancerCampaignPathSpace,
  addNecromancerStep,
  removeNecromancerStep,
}: {
  necromancer: NecromancerState;
  campaignId: string;
  pending: boolean;
  run: (action: () => Promise<void>) => Promise<boolean>;
  onSelectSpace: (ref: NecromancerOccupiableSpaceRef) => void;
  createNecromancerCampaignGate: (args: { commandId: string; expectedCampaignId: string; gateId: string; name: string; band: string }) => Promise<unknown>;
  updateNecromancerCampaignGate: (args: NonNullable<ReturnType<typeof buildUpdateNecromancerCampaignGatePayload>>) => Promise<unknown>;
  createNecromancerCampaignPathSpace: (args: { commandId: string; expectedCampaignId: string; pathSpaceId: string; region: string }) => Promise<unknown>;
  removeNecromancerCampaignPathSpace: (args: ReturnType<typeof buildRemoveNecromancerCampaignPathSpacePayload>) => Promise<unknown>;
  addNecromancerStep: (args: NonNullable<ReturnType<typeof buildAddNecromancerStepPayload>>) => Promise<unknown>;
  removeNecromancerStep: (args: ReturnType<typeof buildRemoveNecromancerStepPayload>) => Promise<unknown>;
}) {
  const occupiable = activeOccupiableSpaces(necromancer);
  const customGates = campaignGates(necromancer);
  const customPaths = campaignPathSpaces(necromancer);
  const customSteps = stepsInvolvingCustomNodes(necromancer);
  const inspectTargets = campaignStructureInspectTargets(necromancer);
  const [gateName, setGateName] = useState("");
  const [gateBand, setGateBand] = useState<NecromancerGateBand>("near");
  const [pathRegion, setPathRegion] = useState<NecromancerPathRegion>("edge_of_life");
  const [stepFrom, setStepFrom] = useState("");
  const [stepTo, setStepTo] = useState("");
  return (
    <details className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
      <summary className="text-sm font-semibold cursor-pointer">Edit Death Structure</summary>
      <p className="text-xs text-slate-500 mt-2">
        Manual structural operations only. This is not a graph editor. Custom Gates and path spaces stay in this list rather than being auto-placed on the Draft-4 board.
      </p>
      <div className="mt-3 space-y-4">
        <section className="space-y-2">
          <h4 className="text-sm font-semibold">Campaign Structure</h4>
          {customGates.length === 0 && customPaths.length === 0 && customSteps.length === 0 && (
            <p className="text-sm text-slate-500">No campaign-created Gates, path spaces, or custom steps.</p>
          )}
          {customGates.map((gate) => (
            <CampaignGateRow
              key={gate.gateId}
              gate={gate}
              pending={pending}
              onInspect={() => {
                const target = inspectTargets.find((entry) =>
                  entry.kind === "gate" && entry.selection.kind === "gate" && entry.selection.gateId === gate.gateId,
                );
                if (target !== undefined) onSelectSpace(target.selection);
              }}
              onUpdate={async (name, band) => {
                const payload = buildUpdateNecromancerCampaignGatePayload({
                  commandId: newCommandId(),
                  expectedCampaignId: campaignId,
                  expected: gate,
                  name,
                  band,
                });
                if (payload === null) return;
                await run(async () => {
                  await updateNecromancerCampaignGate(payload);
                });
              }}
            />
          ))}
          {customPaths.map((path) => (
            <div key={path.pathSpaceId} className="flex flex-wrap gap-2 items-center text-sm">
              <span>{pathSpaceDisplayName(path)}</span>
              <button
                className={ghostBtn}
                aria-label={`Inspect ${pathSpaceDisplayName(path)}`}
                onClick={() => {
                  const target = inspectTargets.find((entry) =>
                    entry.kind === "path" && entry.selection.kind === "path" && entry.selection.pathSpaceId === path.pathSpaceId,
                  );
                  if (target !== undefined) onSelectSpace(target.selection);
                }}
              >
                Inspect
              </button>
              <button
                className={ghostBtn}
                disabled={pending}
                onClick={() => {
                  const payload = buildRemoveNecromancerCampaignPathSpacePayload({
                    commandId: newCommandId(),
                    expectedCampaignId: campaignId,
                    expectedPathSpace: path,
                  });
                  void run(async () => {
                    await removeNecromancerCampaignPathSpace(payload);
                  });
                }}
              >
                Remove path
              </button>
            </div>
          ))}
          {customSteps.map((step, index) => (
            <p key={`custom-step-${index}`} className="text-xs text-slate-500">
              Custom step: {occupiableSpaceLabel(step.from, necromancer)} → {occupiableSpaceLabel(step.to, necromancer)}
            </p>
          ))}
        </section>
        <section className="space-y-2">
          <h4 className="text-sm font-semibold">Create campaign Gate</h4>
          <p className="text-xs text-slate-500">There is no remove-Gate control. Gate status is edited from the inspector.</p>
          <input aria-label="Campaign Gate name" className={fieldClass} value={gateName} onChange={(event) => setGateName(event.target.value)} placeholder="Name" />
          <select aria-label="Campaign Gate band" className={fieldClass} value={gateBand} onChange={(event) => setGateBand(event.target.value as NecromancerGateBand)}>
            {NECROMANCER_GATE_BANDS.map((band) => (
              <option key={band} value={band}>{gateBandLabel(band)}</option>
            ))}
          </select>
          <button
            className={btnClass}
            disabled={pending}
            onClick={() => {
              const payload = buildCreateNecromancerCampaignGatePayload({
                commandId: newCommandId(),
                expectedCampaignId: campaignId,
                gateId: newCampaignGateId(),
                name: gateName,
                band: gateBand,
              });
              if (payload === null) return;
              void run(async () => {
                await createNecromancerCampaignGate(payload);
              });
            }}
          >
            Create Gate
          </button>
        </section>
        <section className="space-y-2">
          <h4 className="text-sm font-semibold">Create campaign path space</h4>
          <select aria-label="Campaign path region" className={fieldClass} value={pathRegion} onChange={(event) => setPathRegion(event.target.value as NecromancerPathRegion)}>
            {NECROMANCER_PATH_REGIONS.map((region) => (
              <option key={region} value={region}>{pathRegionLabel(region)}</option>
            ))}
          </select>
          <button
            className={btnClass}
            disabled={pending}
            onClick={() => {
              const payload = buildCreateNecromancerCampaignPathSpacePayload({
                commandId: newCommandId(),
                expectedCampaignId: campaignId,
                pathSpaceId: newCampaignPathSpaceId(),
                region: pathRegion,
              });
              if (payload === null) return;
              void run(async () => {
                await createNecromancerCampaignPathSpace(payload);
              });
            }}
          >
            Create path space
          </button>
        </section>
        <section className="space-y-2">
          <h4 className="text-sm font-semibold">Internal steps</h4>
          <p className="text-xs text-slate-500">Occupiable spaces only. Void Beyond and Final Death are not add-step targets. Cycles are valid.</p>
          <ul className="text-sm space-y-1 max-h-48 overflow-auto">
            {necromancer.steps.map((step, index) => (
              <li key={`step-${index}`} className="flex flex-wrap gap-2 items-center">
                <span>{occupiableSpaceLabel(step.from, necromancer)} → {occupiableSpaceLabel(step.to, necromancer)}</span>
                <button
                  className={ghostBtn}
                  disabled={pending}
                  onClick={() => {
                    const payload = buildRemoveNecromancerStepPayload({
                      commandId: newCommandId(),
                      expectedCampaignId: campaignId,
                      expectedStep: step,
                    });
                    void run(async () => {
                      await removeNecromancerStep(payload);
                    });
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="grid sm:grid-cols-2 gap-2">
            <OccupiableSelect ariaLabel="Step from" value={stepFrom} onChange={setStepFrom} spaces={occupiable} necromancer={necromancer} allowEmpty emptyLabel="From…" />
            <OccupiableSelect ariaLabel="Step to" value={stepTo} onChange={setStepTo} spaces={occupiable} necromancer={necromancer} allowEmpty emptyLabel="To…" />
          </div>
          <button
            className={btnClass}
            disabled={pending}
            onClick={() => {
              const from = parseOccupiableRefKey(stepFrom);
              const to = parseOccupiableRefKey(stepTo);
              if (from === null || to === null) return;
              const payload = buildAddNecromancerStepPayload({
                commandId: newCommandId(),
                expectedCampaignId: campaignId,
                from,
                to,
              });
              if (payload === null) return;
              void run(async () => {
                await addNecromancerStep(payload);
              });
            }}
          >
            Add step
          </button>
        </section>
      </div>
    </details>
  );
}

function CampaignGateRow({
  gate,
  pending,
  onInspect,
  onUpdate,
}: {
  gate: NecromancerCampaignGateState;
  pending: boolean;
  onInspect: () => void;
  onUpdate: (name: string, band: NecromancerGateBand) => Promise<void>;
}) {
  const [name, setName] = useState(gate.name);
  const [band, setBand] = useState(gate.band);
  useLayoutEffect(() => {
    setName(gate.name);
    setBand(gate.band);
  }, [gate.gateId, gate.name, gate.band]);
  return (
    <div className="rounded border border-slate-200 dark:border-slate-700 p-2 space-y-1">
      <p className="text-sm">{gate.name} · {gateBandLabel(gate.band)} · {gate.status}</p>
      <button className={ghostBtn} aria-label={`Inspect ${gate.name}`} onClick={onInspect}>Inspect</button>
      <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} aria-label={`Update ${gate.name}`} />
      <select className={fieldClass} value={band} onChange={(event) => setBand(event.target.value as NecromancerGateBand)}>
        {NECROMANCER_GATE_BANDS.map((option) => (
          <option key={option} value={option}>{gateBandLabel(option)}</option>
        ))}
      </select>
      <button className={btnClass} disabled={pending} onClick={() => { void onUpdate(name, band); }}>Update Gate</button>
    </div>
  );
}
