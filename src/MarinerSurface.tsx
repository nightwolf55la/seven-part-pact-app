import { useEffect, useLayoutEffect, useState, type KeyboardEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api.js";
import {
  MARINER_BOARD_ISLE_IDS,
  pactSeatDisplayName,
  type ElementId,
  type IsleId,
  type MarinerRouteEndpoint,
  type MarinerBeastCondition,
  type MarinerBeastLocation,
  type MarinerBeastState,
  type MarinerBoardIsleId,
  type MarinerIsleMarket,
  type MarinerRouteOccupancy,
  type MarinerSeaRegionId,
  type MarinerState,
  type PactSeatId,
  type PactSeatStatus,
  type PowerfulDenizenStatus,
  type SorcererExternalPresence,
} from "../shared/domain";
import type { WorldReference } from "./WorldSurface";
import LoreContextPanel from "./LoreContextPanel";
import { findPresentationSubjectByRef, type LoreCompendiumUiState } from "./lore-view-model";
import {
  MARINER_ARRANGEMENT_OPTIONS,
  MARINER_BEAST_DEFINITIONS,
  MARINER_BOARD_SLOTS,
  MARINER_ELEMENTS,
  MARINER_LAW_OPTIONS,
  MARINER_ROUTE_CATALOG,
  MARINER_SEA_REGION_CATALOG,
  arrangementNeedsRarity,
  arrangementNeedsStartingBeast,
  arrangementSetupSummary,
  availableIndividualBeastDenizens,
  availableMobileShipPlaces,
  beastLocationLabel,
  beastsInRegion,
  beastsOnIsle,
  boardIsleDisplayName,
  boardIsleWorldName,
  buildAddMarinerBeastPayload,
  buildInitializeMarinerPayload,
  buildInitializeMarinerSourceSetupPayload,
  buildRemoveMarinerBeastPayload,
  buildSetMarinerIsleMarketPayload,
  buildSetMarinerIsleRavagePayload,
  buildSetMarinerRouteOccupancyPayload,
  buildSetMarinerSeaStormCountPayload,
  buildSetMarinerShipPayload,
  buildSetSelectedSeaLawsPayload,
  buildCreateMarinerBeastPayload,
  buildCreateMarinerShipPayload,
  buildMoveMarinerBeastPayload,
  buildMoveMarinerShipPayload,
  buildMoveMarinerStormPayload,
  buildNestMarinerBeastPayload,
  buildRecordMarinerRavageResultPayload,
  buildUpdateMarinerBeastFields,
  buildUpdateMarinerBeastPayload,
  captureOperabilityBoard,
  createBeastWouldRampage,
  emptyRoutesBorderingIsle,
  expectedForCreateBeast,
  expectedForCreateShip,
  expectedForMoveBeast,
  expectedForMoveShip,
  expectedForMoveStorm,
  expectedForNestBeast,
  expectedForRavageResult,
  CREATE_BEAST_LABEL,
  CREATE_SHIP_LABEL,
  distrustingBeastsInRegion,
  builtinBeastElement,
  builtinBeastName,
  conditionLabel,
  definitionsMatchingElement,
  denizenName,
  denizenHasRampagingMethod,
  denizenSharedStatusLabel,
  externalLandDisplayName,
  isMarinerInitialized,
  isTyphoon,
  marinerDomainDisruptiveArcanists,
  marinerSeaResearchers,
  marinerSetupReady,
  marinerSourceSetupReady,
  marketBeastConflict,
  marinerIsleLoreSelection,
  nestingBeastsOnIsle,
  newCommandId,
  newDenizenId,
  newMethodEntryId,
  NO_LORE_CONTEXT_COPY,
  occupiedRoutesBorderingIsle,
  otherDomainSeatOptions,
  RAVAGE_INCOMPLETE_COPY,
  RAVAGE_LOCATION_FOLLOW_THROUGH,
  RAVAGE_LORE_FOLLOW_THROUGH,
  RAVAGE_MARKET_ABSORBED_COPY,
  RAVAGE_RESULT_LABEL,
  MOVE_BEAST_LABEL,
  MOVE_SHIP_LABEL,
  MOVE_STORM_LABEL,
  NEST_BEAST_LABEL,
  predictedMovedBeastWouldRampage,
  predictedNewlyTrappedBeastIdsAfterShipPlacement,
  WIND_CONFIRMATION_LABEL,
  parseNonNegInt,
  placeName,
  researcherOperationalLabel,
  routeEndpointLabel,
  routeOccupancyLabel,
  seaRegionDisplayName,
  seaRegionStateLabel,
  shipSanctumMismatch,
  stormPiecePresentation,
  uniqueSelectedLawIds,
  worldIsleName,
  worldIsleOptionsForSlot,
  MARINER_POWERFUL_STATUSES,
  type MarinerIsleBindings,
  type MarinerSetupDraft,
  type MarinerWizardRef,
} from "./mariner-view-model";
import BoardOverlayInspector from "./BoardOverlayInspector";
import {
  MARINER_DOMAIN_PRESENCE_ANCHOR,
  MARINER_ISLE_GEOMETRY,
  MARINER_ISLE_SELECTION_GLOW,
  MARINER_MAP_PALETTE,
  MARINER_ROUTE_HIT_STROKE_WIDTH,
  MARINER_SEA_GEOMETRY,
} from "./mariner-map-geometry";
import { MARINER_SOURCE_BOARD, marinerOverlayLengthToBoard, marinerOverlayPointToBoard } from "./source-board-assets";
import { marinerRouteOperationalView, marinerVisionsForecast } from "./mariner-operational-view";
import {
  MARINER_INTERACTION_GEOMETRY_RAW,
  SourceGeometrySprite,
  SourceRouteOccupancyMarker,
  SourceSymbolClone,
  marinerIsleSymbolId,
  marinerRouteSymbolId,
} from "./source-interaction-geometry";

export type { MarinerWizardRef };

type Selection =
  | { readonly kind: "isle"; readonly boardIsleId: MarinerBoardIsleId }
  | { readonly kind: "route"; readonly routeId: string }
  | { readonly kind: "region"; readonly regionId: MarinerSeaRegionId };

const fieldClass =
  "text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 w-full text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-300 dark:focus:ring-teal-800";
const btnClass =
  "text-xs font-medium rounded-lg px-3 py-1.5 cursor-pointer bg-teal-800 dark:bg-teal-200 text-white dark:text-teal-950 hover:bg-teal-700 dark:hover:bg-teal-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
const ghostBtn =
  "text-xs font-medium rounded-lg px-3 py-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50";

function emptyDraft(): MarinerSetupDraft {
  return {
    arrangementId: "",
    selectedLawIds: [],
    isleBindings: {},
    shipPlaceId: "",
    startingBeastDenizenId: "",
    startingBeastElement: "",
    startingBeastDefinitionId: "",
    scuttleportRarity: "",
  };
}

function defaultBeastLocation(): MarinerBeastLocation {
  return { kind: "sea_region", regionId: "sunken_fleet" };
}

function snapshotBeast(beast: MarinerBeastState): MarinerBeastState {
  return {
    denizenId: beast.denizenId,
    element: beast.element,
    definitionId: beast.definitionId,
    condition: beast.condition,
    location: beast.location,
  };
}

function selectedLawKey(ids: readonly string[]): string {
  return JSON.stringify(ids);
}

export default function MarinerSurface({
  mariner,
  world,
  campaignId,
  marinerWizard,
  sorcererPresence = [],
  loreCompendium = { status: "unavailable" },
  pactSeatStatuses = {},
}: {
  mariner: MarinerState;
  world: WorldReference;
  campaignId: string;
  marinerWizard: MarinerWizardRef | null;
  sorcererPresence?: readonly SorcererExternalPresence[];
  loreCompendium?: LoreCompendiumUiState;
  pactSeatStatuses?: Partial<Record<PactSeatId, PactSeatStatus | null>>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [setup, setSetup] = useState<MarinerSetupDraft>(emptyDraft);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [lawDraft, setLawDraft] = useState<string[]>([...mariner.selectedLawOfSeaIds]);
  const [shipDraft, setShipDraft] = useState(mariner.shipPlaceId ?? "");
  const [confirmRemove, setConfirmRemove] = useState<MarinerBeastState | null>(null);
  const authoritativeLawKey = selectedLawKey(mariner.selectedLawOfSeaIds);

  useLayoutEffect(() => {
    setShipDraft(mariner.shipPlaceId ?? "");
  }, [mariner.shipPlaceId]);

  useLayoutEffect(() => {
    setLawDraft(JSON.parse(authoritativeLawKey) as string[]);
  }, [authoritativeLawKey]);

  const initializeMariner = useMutation(api.m3Commands.initializeMariner);
  const initializeMarinerSourceSetup = useMutation(api.m3Commands.initializeMarinerSourceSetup);
  const setMarinerShip = useMutation(api.m3Commands.setMarinerShip);
  const setSelectedSeaLaws = useMutation(api.m3Commands.setSelectedSeaLaws);
  const setMarinerRouteOccupancy = useMutation(api.m3Commands.setMarinerRouteOccupancy);
  const setMarinerSeaStormCount = useMutation(api.m3Commands.setMarinerSeaStormCount);
  const setMarinerIsleMarket = useMutation(api.m3Commands.setMarinerIsleMarket);
  const setMarinerIsleRavage = useMutation(api.m3Commands.setMarinerIsleRavage);
  const addMarinerBeast = useMutation(api.m3Commands.addMarinerBeast);
  const updateMarinerBeast = useMutation(api.m3Commands.updateMarinerBeast);
  const removeMarinerBeast = useMutation(api.m3Commands.removeMarinerBeast);
  const createMarinerBeast = useMutation(api.m3Commands.createMarinerBeast);
  const moveMarinerStorm = useMutation(api.m3Commands.moveMarinerStorm);
  const moveMarinerShip = useMutation(api.m3Commands.moveMarinerShip);
  const createMarinerShip = useMutation(api.m3Commands.createMarinerShip);
  const moveMarinerBeast = useMutation(api.m3Commands.moveMarinerBeast);
  const nestMarinerBeast = useMutation(api.m3Commands.nestMarinerBeast);
  const recordMarinerRavageResult = useMutation(api.m3Commands.recordMarinerRavageResult);

  const initialized = isMarinerInitialized(mariner);
  const mobilePlaces = availableMobileShipPlaces(world.places);
  const unusedBeastDenizens = availableIndividualBeastDenizens(world.denizens, mariner.beasts);

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

  function toggleSetupLaw(id: string): void {
    setSetup((current) => ({
      ...current,
      selectedLawIds: current.selectedLawIds.includes(id)
        ? current.selectedLawIds.filter((x) => x !== id)
        : [...current.selectedLawIds, id],
    }));
  }

  async function handleInitialize(): Promise<void> {
    const payload = buildInitializeMarinerSourceSetupPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      draft: setup,
    });
    if (payload === null) return;
    await run(async () => {
      await initializeMarinerSourceSetup(payload);
    });
  }

  async function handleAdvancedInitialize(): Promise<void> {
    const payload = buildInitializeMarinerPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      draft: setup,
      places: world.places,
      wizard: marinerWizard,
    });
    if (payload === null) return;
    await run(async () => {
      await initializeMariner(payload);
    });
  }

  if (!initialized) {
    return (
      <SetupPanel
        setup={setup}
        setSetup={setSetup}
        world={world}
        wizard={marinerWizard}
        mobilePlaces={mobilePlaces}
        pending={pending}
        error={error}
        onToggleLaw={toggleSetupLaw}
        onInitialize={() => void handleInitialize()}
        onAdvancedInitialize={() => void handleAdvancedInitialize()}
      />
    );
  }

  return (
    <div className="rounded-xl border border-teal-200 dark:border-teal-900 bg-white dark:bg-slate-900 p-3 space-y-3">
      <h2 className="text-lg font-semibold text-teal-900 dark:text-teal-100">Mariner</h2>
      {error !== null && (
        <div role="alert" className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      <p data-mariner-visions-forecast className="text-xs text-slate-600 dark:text-slate-300">
        Visions forecast: {marinerVisionsForecast(mariner).summary}
      </p>
      <ShipSanctumSummary
        mariner={mariner}
        world={world}
        wizard={marinerWizard}
        shipDraft={shipDraft}
        setShipDraft={setShipDraft}
        mobilePlaces={mobilePlaces}
        pending={pending}
        onSave={() => {
          if (mariner.shipPlaceId === null) return;
          const payload = buildSetMarinerShipPayload({
            commandId: newCommandId(),
            expectedCampaignId: campaignId,
            expectedShipPlaceId: mariner.shipPlaceId,
            shipPlaceId: shipDraft,
          });
          void run(async () => {
            await setMarinerShip(payload);
          });
        }}
      />
      <div
        data-mariner-board-stage
        className="relative min-w-0 overflow-hidden rounded-lg"
        style={{ background: MARINER_MAP_PALETTE.field }}
      >
          <MarinerMap
            mariner={mariner}
            world={world}
            selection={selection}
            onSelect={setSelection}
            sorcererPresence={sorcererPresence}
          />
        <BoardOverlayInspector
          open={selection !== null}
          title="Selection details"
          onClose={() => setSelection(null)}
        >
          <Inspector
            selection={selection}
            mariner={mariner}
            world={world}
            pending={pending}
            campaignId={campaignId}
            loreCompendium={loreCompendium}
            pactSeatStatuses={pactSeatStatuses}
            onCreateBeast={(payload) => run(async () => { await createMarinerBeast(payload); })}
            onMoveStorm={(payload) => run(async () => { await moveMarinerStorm(payload); })}
            onMoveShip={(payload) => run(async () => { await moveMarinerShip(payload); })}
            onCreateShip={(payload) => run(async () => { await createMarinerShip(payload); })}
            onMoveBeast={(payload) => run(async () => { await moveMarinerBeast(payload); })}
            onNestBeast={(payload) => run(async () => { await nestMarinerBeast(payload); })}
            onRecordRavage={(payload) => run(async () => { await recordMarinerRavageResult(payload); })}
            onSubmitRoute={(routeId, occupancy) => {
              const current = mariner.routes.find((route) => route.routeId === routeId);
              if (current === undefined) return;
              const payload = buildSetMarinerRouteOccupancyPayload({
                commandId: newCommandId(),
                expectedCampaignId: campaignId,
                routeId,
                expectedOccupancy: current.occupancy,
                occupancy,
              });
              void run(async () => {
                await setMarinerRouteOccupancy(payload);
              });
            }}
            onSubmitStorm={(regionId, stormCount) => {
              const current = mariner.seaRegions.find((region) => region.regionId === regionId);
              if (current === undefined) return;
              const payload = buildSetMarinerSeaStormCountPayload({
                commandId: newCommandId(),
                expectedCampaignId: campaignId,
                regionId,
                expectedStormCount: current.stormCount,
                stormCount,
              });
              void run(async () => {
                await setMarinerSeaStormCount(payload);
              });
            }}
            onSubmitMarket={(boardIsleId, market) => {
              const current = mariner.boardIsles.find((isle) => isle.boardIsleId === boardIsleId);
              if (current === undefined) return;
              const payload = buildSetMarinerIsleMarketPayload({
                commandId: newCommandId(),
                expectedCampaignId: campaignId,
                boardIsleId,
                expectedMarket: current.market,
                market,
              });
              void run(async () => {
                await setMarinerIsleMarket(payload);
              });
            }}
            onSubmitRavage={(boardIsleId, ravageStormCount) => {
              const current = mariner.boardIsles.find((isle) => isle.boardIsleId === boardIsleId);
              if (current === undefined) return;
              const payload = buildSetMarinerIsleRavagePayload({
                commandId: newCommandId(),
                expectedCampaignId: campaignId,
                boardIsleId,
                expectedRavageStormCount: current.ravageStormCount,
                ravageStormCount,
              });
              void run(async () => {
                await setMarinerIsleRavage(payload);
              });
            }}
          />
        </BoardOverlayInspector>
      </div>
      <LawsPanel
        mariner={mariner}
        lawDraft={lawDraft}
        setLawDraft={setLawDraft}
        pending={pending}
        onSave={() => {
          const payload = buildSetSelectedSeaLawsPayload({
            commandId: newCommandId(),
            expectedCampaignId: campaignId,
            expectedSelectedLawOfSeaIds: mariner.selectedLawOfSeaIds,
            selectedLawIds: lawDraft,
          });
          void run(async () => {
            await setSelectedSeaLaws(payload);
          });
        }}
      />
      <BeastPanel
        mariner={mariner}
        world={world}
        unusedDenizens={unusedBeastDenizens}
        pending={pending}
        confirmRemove={confirmRemove}
        setConfirmRemove={setConfirmRemove}
        onAdd={async (beast) => {
          const payload = buildAddMarinerBeastPayload({
            commandId: newCommandId(),
            expectedCampaignId: campaignId,
            beast,
          });
          return run(async () => {
            await addMarinerBeast(payload);
          });
        }}
        onUpdate={async (baseline, next) => {
          const fields = buildUpdateMarinerBeastFields(baseline, next);
          if (fields === null) return false;
          const payload = buildUpdateMarinerBeastPayload({
            commandId: newCommandId(),
            expectedCampaignId: campaignId,
            denizenId: baseline.denizenId,
            fields,
          });
          return run(async () => {
            await updateMarinerBeast(payload);
          });
        }}
        onRemove={async (expectedBeast) => {
          const payload = buildRemoveMarinerBeastPayload({
            commandId: newCommandId(),
            expectedCampaignId: campaignId,
            denizenId: expectedBeast.denizenId,
            expectedBeast,
          });
          const ok = await run(async () => {
            await removeMarinerBeast(payload);
          });
          if (ok) setConfirmRemove(null);
          return ok;
        }}
      />
    </div>
  );
}

function SetupPanel({
  setup,
  setSetup,
  world,
  wizard,
  mobilePlaces,
  pending,
  error,
  onToggleLaw,
  onInitialize,
  onAdvancedInitialize,
}: {
  setup: MarinerSetupDraft;
  setSetup: (updater: (current: MarinerSetupDraft) => MarinerSetupDraft) => void;
  world: WorldReference;
  wizard: MarinerWizardRef | null;
  mobilePlaces: ReturnType<typeof availableMobileShipPlaces>;
  pending: boolean;
  error: string | null;
  onToggleLaw: (id: string) => void;
  onInitialize: () => void;
  onAdvancedInitialize: () => void;
}) {
  const ready = marinerSourceSetupReady(setup);
  const advancedReady = marinerSetupReady(setup, world.places, wizard);
  const needsBeast = arrangementNeedsStartingBeast(setup.arrangementId);
  const needsRarity = arrangementNeedsRarity(setup.arrangementId);
  const mismatch = shipSanctumMismatch(setup.shipPlaceId, wizard);
  const lawCount = uniqueSelectedLawIds(setup.selectedLawIds).length;

  return (
    <div className="rounded-xl border border-teal-200 dark:border-teal-900 bg-white dark:bg-slate-900 p-4 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-teal-900 dark:text-teal-100">Initialize Mariner</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Choose the starting arrangement and two Laws of the Sea. The Isles of Isha and the Mariner&apos;s starting Ship — his Sanctum — are established automatically.
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
          onChange={(e) => setSetup((current) => ({ ...current, arrangementId: e.target.value }))}
        >
          <option value="">Select arrangement…</option>
          {MARINER_ARRANGEMENT_OPTIONS.map((option) => (
            <option key={option.arrangementId} value={option.arrangementId}>{option.displayName}</option>
          ))}
        </select>
        {setup.arrangementId !== "" && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{arrangementSetupSummary(setup.arrangementId)}</p>
        )}
      </section>
      <section>
        <h3 className="text-sm font-semibold mb-1">Two Laws of the Sea</h3>
        <p className="text-xs text-slate-500 mb-2">Initialization requires exactly two distinct Laws. Later editing may use any number.</p>
        <div className="space-y-2">
          {MARINER_LAW_OPTIONS.map((law) => (
            <label key={law.id} className="flex gap-2 text-sm items-start">
              <input
                type="checkbox"
                checked={setup.selectedLawIds.includes(law.id)}
                onChange={() => onToggleLaw(law.id)}
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
      {needsBeast && (
        <section>
          <h3 className="text-sm font-semibold mb-2">Starting Beast</h3>
          <p className="text-xs text-slate-500 mb-2">
            Dynamic and Explosive require exactly one existing individual Denizen. Condition is Distrusting; location is The Sunken Fleet.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm">
              Denizen
              <select
                aria-label="Starting Beast Denizen"
                className={`${fieldClass} mt-1`}
                value={setup.startingBeastDenizenId}
                onChange={(e) => setSetup((current) => ({ ...current, startingBeastDenizenId: e.target.value }))}
              >
                <option value="">Select Denizen…</option>
                {availableIndividualBeastDenizens(world.denizens, []).map((denizen) => (
                  <option key={denizen.denizenId} value={denizen.denizenId}>{denizen.name}</option>
                ))}
              </select>
              {availableIndividualBeastDenizens(world.denizens, []).length === 0 && (
                <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                  Starting Beast requires a shared Powerful profile with Beast taxonomy and an explicit Status. Configure it in World first.
                </p>
              )}
            </label>
            <label className="text-sm">
              Element
              <select
                aria-label="Starting Beast Element"
                className={`${fieldClass} mt-1`}
                value={setup.startingBeastElement}
                onChange={(e) => {
                  const element = e.target.value as ElementId | "";
                  setSetup((current) => ({
                    ...current,
                    startingBeastElement: element,
                    startingBeastDefinitionId:
                      element !== "" && builtinBeastElement(current.startingBeastDefinitionId) === element
                        ? current.startingBeastDefinitionId
                        : "",
                  }));
                }}
              >
                <option value="">Select Element…</option>
                {MARINER_ELEMENTS.map((element) => (
                  <option key={element} value={element}>{element}</option>
                ))}
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              Built-in definition (optional)
              <select
                aria-label="Starting Beast definition"
                className={`${fieldClass} mt-1`}
                value={setup.startingBeastDefinitionId}
                onChange={(e) => {
                  const definitionId = e.target.value;
                  const matched = builtinBeastElement(definitionId);
                  setSetup((current) => ({
                    ...current,
                    startingBeastDefinitionId: definitionId,
                    startingBeastElement: matched ?? current.startingBeastElement,
                  }));
                }}
              >
                <option value="">Custom Beast</option>
                {(setup.startingBeastElement === ""
                  ? MARINER_BEAST_DEFINITIONS
                  : definitionsMatchingElement(setup.startingBeastElement)
                ).map((definition) => (
                  <option key={definition.id} value={definition.id}>{definition.name} ({definition.element})</option>
                ))}
              </select>
            </label>
          </div>
        </section>
      )}
      {needsRarity && (
        <section>
          <h3 className="text-sm font-semibold mb-2">Scuttleport Rarity</h3>
          <p className="text-xs text-slate-500 mb-2">Explosive arrangement requires a nonblank Scuttleport Rarity description.</p>
          <input
            aria-label="Scuttleport Rarity"
            className={fieldClass}
            value={setup.scuttleportRarity}
            onChange={(e) => setSetup((current) => ({ ...current, scuttleportRarity: e.target.value }))}
          />
        </section>
      )}
      <button className={btnClass} disabled={pending || !ready} onClick={onInitialize}>
        Initialize Mariner
      </button>
      <details className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
        <summary className="text-sm font-semibold cursor-pointer">Advanced / Correct Board — bind existing World identities</summary>
        <p className="text-xs text-slate-500 mt-2 mb-3">
          Ordinary setup realizes the Isles of Isha and the starting Ship automatically. Use this only to bind already-created World identities or to record an existing Sanctum.
        </p>
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">15 World Isle bindings</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {MARINER_BOARD_SLOTS.map((slot) => (
              <label key={slot.boardIsleId} className="text-sm">
                <span className="block font-medium mb-1">{slot.displayName}</span>
                <select
                  aria-label={`Bind ${slot.displayName}`}
                  className={fieldClass}
                  value={setup.isleBindings[slot.boardIsleId] ?? ""}
                  onChange={(e) => setSetup((current) => ({
                    ...current,
                    isleBindings: { ...current.isleBindings, [slot.boardIsleId]: e.target.value } as MarinerIsleBindings,
                  }))}
                >
                  <option value="">Select World Isle…</option>
                  {worldIsleOptionsForSlot(world.isles, setup.isleBindings, slot.boardIsleId).map((isle) => (
                    <option key={isle.isleId} value={isle.isleId}>{isle.name}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>
        <section className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Ship Place</h3>
          {wizard !== null && (
            <p className="text-sm mb-2">
              Mariner Wizard {wizard.name} Sanctum: {placeName(world.places, wizard.sanctumPlaceId)}.
              {mismatch
                ? " This correction path requires the chosen ship Place to equal that existing Sanctum."
                : " Chosen ship matches the Sanctum."}
            </p>
          )}
          {wizard === null && (
            <p className="text-sm text-slate-500 mb-2">Mariner Pact seat is vacant; a Sanctum match is not required.</p>
          )}
          <select
            aria-label="Ship Place"
            className={fieldClass}
            value={setup.shipPlaceId}
            onChange={(e) => setSetup((current) => ({ ...current, shipPlaceId: e.target.value }))}
          >
            <option value="">Select mobile Place…</option>
            {mobilePlaces.map((place) => (
              <option key={place.placeId} value={place.placeId}>{place.name}</option>
            ))}
          </select>
        </section>
        <button className={`${btnClass} mt-4`} disabled={pending || !advancedReady} onClick={onAdvancedInitialize}>
          Initialize using existing World identities
        </button>
      </details>
    </div>
  );
}

function ShipSanctumSummary({
  mariner,
  world,
  wizard,
  shipDraft,
  setShipDraft,
  mobilePlaces,
  pending,
  onSave,
}: {
  mariner: MarinerState;
  world: WorldReference;
  wizard: MarinerWizardRef | null;
  shipDraft: string;
  setShipDraft: (value: string) => void;
  mobilePlaces: ReturnType<typeof availableMobileShipPlaces>;
  pending: boolean;
  onSave: () => void;
}) {
  const shipName = placeName(world.places, mariner.shipPlaceId);
  const sanctumName = wizard === null ? "Vacant Pact seat" : placeName(world.places, wizard.sanctumPlaceId);
  const homeIsleName = wizard?.homeIsleId ? worldIsleName(world.isles, wizard.homeIsleId) : null;
  const same = wizard !== null && mariner.shipPlaceId !== null && wizard.sanctumPlaceId === mariner.shipPlaceId;
  const parts = [
    wizard?.name ?? null,
    shipName,
    same ? "Sanctum" : `Sanctum: ${sanctumName}`,
    homeIsleName !== null ? `Home: ${homeIsleName}` : null,
  ].filter((part): part is string => part !== null && part !== "");

  return (
    <section data-mariner-ship-sanctum className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
      <p className="font-medium text-slate-800 dark:text-slate-100">{parts.join(" · ")}</p>
      {!same && wizard !== null && (
        <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Ship and Sanctum differ</p>
      )}
      <details className="basis-full text-xs">
        <summary className="cursor-pointer text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          Advanced / Correct — Ship
        </summary>
        <div className="mt-2 flex flex-wrap gap-2 items-end">
          <label className="text-sm flex-1 min-w-48">
            Move ship to
            <select
              aria-label="Change Mariner ship"
              className={`${fieldClass} mt-1`}
              value={shipDraft}
              onChange={(e) => setShipDraft(e.target.value)}
            >
              {mobilePlaces.map((place) => (
                <option key={place.placeId} value={place.placeId}>{place.name}</option>
              ))}
            </select>
          </label>
          <button className={btnClass} disabled={pending || shipDraft === "" || shipDraft === mariner.shipPlaceId} onClick={onSave}>
            Set ship
          </button>
        </div>
      </details>
    </section>
  );
}

const INTERACTIVE_FOCUS_CLASS =
  "outline-none focus:outline-none focus-visible:outline-none [&_[data-focus-ring]:not([data-isle-shore-glow])]:opacity-0 [&:focus-visible_[data-focus-ring]]:opacity-100 [&_[data-isle-shore-glow]]:opacity-0 [&[aria-pressed=true]_[data-isle-shore-glow]]:opacity-100 [&:focus-visible_[data-isle-shore-glow]]:opacity-100";

function activate(event: KeyboardEvent<Element>, action: () => void): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

function towardLabel(toward: MarinerRouteEndpoint): string {
  return toward.kind === "board_isle"
    ? boardIsleDisplayName(toward.boardIsleId)
    : externalLandDisplayName(toward.externalLandId);
}

function MarinerMap({
  mariner,
  world,
  selection,
  onSelect,
  sorcererPresence,
}: {
  mariner: MarinerState;
  world: WorldReference;
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
  sorcererPresence: readonly SorcererExternalPresence[];
}) {
  const disruptive = marinerDomainDisruptiveArcanists(sorcererPresence);

  return (
    <div className="overflow-hidden">
      <svg
        viewBox={`0 0 ${MARINER_SOURCE_BOARD.width} ${MARINER_SOURCE_BOARD.height}`}
        className="mx-auto block h-auto w-full max-w-[min(100%,calc(100vh-13.5rem))] text-slate-800 dark:text-slate-100"
        role="group"
        aria-label="Interactive Archipelago of Isha map"
        data-mariner-board
      >
        <defs>
          <pattern id="mariner-ravage-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="#fef3c7" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="#9a3412" strokeWidth="3" />
          </pattern>
          <pattern id="mariner-unavailable-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
            <rect width="6" height="6" fill="#eef2ff" />
            <line x1="0" y1="0" x2="6" y2="0" stroke="#4338ca" strokeWidth="2" />
          </pattern>
          <filter
            id="mariner-isle-shore-glow"
            filterUnits="userSpaceOnUse"
            primitiveUnits="userSpaceOnUse"
            x={-48}
            y={-48}
            width={MARINER_SOURCE_BOARD.width + 96}
            height={MARINER_SOURCE_BOARD.height + 96}
            colorInterpolationFilters="sRGB"
          >
            <feMorphology in="SourceAlpha" operator="dilate" radius="1.5" result="dilated" />
            <feComposite in="dilated" in2="SourceAlpha" operator="out" result="edge" />
            <feGaussianBlur in="edge" stdDeviation="2.4" result="blur" />
            <feFlood floodColor="currentColor" floodOpacity="0.88" result="glowColor" />
            <feComposite in="glowColor" in2="blur" operator="in" result="glow" />
            <feFlood floodColor="currentColor" floodOpacity="0.8" result="edgeColor" />
            <feComposite in="edgeColor" in2="edge" operator="in" result="crisp" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="crisp" />
            </feMerge>
          </filter>
        </defs>
        <SourceGeometrySprite raw={MARINER_INTERACTION_GEOMETRY_RAW} label="mariner" />
        <g data-map-layer="frame" pointerEvents="none">
          <rect
            data-mariner-map-field
            width={MARINER_SOURCE_BOARD.width}
            height={MARINER_SOURCE_BOARD.height}
            fill={MARINER_MAP_PALETTE.field}
          />
          <image
            data-mariner-source-board
            data-mariner-map-sea
            href={MARINER_SOURCE_BOARD.href}
            x={0}
            y={0}
            width={MARINER_SOURCE_BOARD.width}
            height={MARINER_SOURCE_BOARD.height}
            aria-hidden="true"
          />
        </g>
        <g data-map-layer="sea-overlay" transform={MARINER_SOURCE_BOARD.overlayTransform}>
        {MARINER_SEA_GEOMETRY.map((sea) => {
          const definition = MARINER_SEA_REGION_CATALOG.find((region) => region.regionId === sea.regionId);
          const stormCount = mariner.seaRegions.find((entry) => entry.regionId === sea.regionId)?.stormCount ?? 0;
          const selected = selection?.kind === "region" && selection.regionId === sea.regionId;
          const kind = definition?.kind === "horizon" ? "Horizon" : "Sea";
          const name = definition?.displayName ?? sea.regionId;
          return (
            <g
              key={sea.regionId}
              data-map-layer="sea-hit"
              data-region-id={sea.regionId}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`${kind} ${name}: ${seaRegionStateLabel(stormCount)}`}
              className={INTERACTIVE_FOCUS_CLASS}
              style={{ outline: "none" }}
              onClick={() => onSelect({ kind: "region", regionId: sea.regionId })}
              onKeyDown={(event) => activate(event, () => onSelect({ kind: "region", regionId: sea.regionId }))}
            >
              <path
                d={sea.hitPath}
                fill={selected ? MARINER_MAP_PALETTE.seaRim : "transparent"}
                fillOpacity={selected ? 0.12 : 0}
                stroke={selected ? MARINER_MAP_PALETTE.seaRim : "transparent"}
                strokeWidth={selected ? 2.5 : 0}
              />
              {selected && (
                <path
                  data-selection-halo
                  data-region-id={sea.regionId}
                  d={sea.hitPath}
                  fill="none"
                  stroke="#0f766e"
                  strokeWidth={6}
                  opacity={0.35}
                  pointerEvents="none"
                />
              )}
              <path
                data-focus-ring
                d={sea.hitPath}
                fill="none"
                stroke="#0f766e"
                strokeWidth={3}
                pointerEvents="none"
              />
            </g>
          );
        })}
        </g>
        <g data-map-layer="exact-source-overlays">
        <g data-map-layer="routes-visible" pointerEvents="none">
          {MARINER_ROUTE_CATALOG.map((route) => {
            const occupancy = mariner.routes.find((entry) => entry.routeId === route.routeId)?.occupancy ?? { kind: "empty" as const };
            if (occupancy.kind === "empty") return null;
            const selected = selection?.kind === "route" && selection.routeId === route.routeId;
            const href = `#${marinerRouteSymbolId(route.routeId)}`;
            const color = occupancy.kind === "ship" ? MARINER_MAP_PALETTE.routeOccupied : MARINER_MAP_PALETTE.routeRaider;
            return (
              <use
                key={`visible-${route.routeId}`}
                href={href}
                data-route-visible={route.routeId}
                data-route-occupancy={occupancy.kind}
                data-source-geometry={marinerRouteSymbolId(route.routeId)}
                fill="none"
                stroke={color}
                strokeWidth={selected ? 2.55 : 2.15}
                strokeLinecap="butt"
                strokeLinejoin="miter"
              />
            );
          })}
        </g>
        {MARINER_ROUTE_CATALOG.map((route) => {
          const occupancy = mariner.routes.find((entry) => entry.routeId === route.routeId)?.occupancy ?? { kind: "empty" as const };
          const selected = selection?.kind === "route" && selection.routeId === route.routeId;
          const label = routeOccupancyLabel(occupancy, mariner, world.isles);
          const aName = routeEndpointLabel(route.endpointA, mariner, world.isles);
          const bName = routeEndpointLabel(route.endpointB, mariner, world.isles);
          const href = `#${marinerRouteSymbolId(route.routeId)}`;
          const symbolId = marinerRouteSymbolId(route.routeId);
          return (
            <g
              key={`hit-${route.routeId}`}
              data-map-layer="route-hit"
              data-route-id={route.routeId}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`Route ${aName} to ${bName}: ${label}`}
              className={INTERACTIVE_FOCUS_CLASS}
              style={{ outline: "none" }}
              onClick={() => onSelect({ kind: "route", routeId: route.routeId })}
              onKeyDown={(event) => activate(event, () => onSelect({ kind: "route", routeId: route.routeId }))}
            >
              <use
                href={href}
                data-source-geometry={symbolId}
                fill="transparent"
                stroke="transparent"
                strokeWidth={MARINER_ROUTE_HIT_STROKE_WIDTH}
              />
              {selected && occupancy.kind === "empty" && (
                <use
                  href={href}
                  data-selection-halo
                  data-source-geometry={symbolId}
                  fill="none"
                  stroke="#0f766e"
                  strokeWidth={8}
                  opacity={0.28}
                  pointerEvents="none"
                />
              )}
              {selected && occupancy.kind !== "empty" && (
                <use
                  href={href}
                  data-selection-halo
                  data-source-geometry={symbolId}
                  fill="none"
                  stroke="#0f766e"
                  strokeWidth={4.2}
                  opacity={0.22}
                  pointerEvents="none"
                />
              )}
              <use
                href={href}
                data-focus-ring
                data-source-geometry={symbolId}
                fill="none"
                stroke="#0f766e"
                strokeWidth={occupancy.kind === "empty" ? 6 : 4}
                pointerEvents="none"
              />
            </g>
          );
        })}
        {MARINER_ROUTE_CATALOG.map((route) => {
          const occupancy = mariner.routes.find((entry) => entry.routeId === route.routeId)?.occupancy ?? { kind: "empty" as const };
          if (occupancy.kind === "empty") return null;
          const href = `#${marinerRouteSymbolId(route.routeId)}`;
          const color = occupancy.kind === "ship" ? MARINER_MAP_PALETTE.routeOccupied : MARINER_MAP_PALETTE.routeRaider;
          const toward = occupancy.kind === "raider"
            ? (occupancy.toward.kind === "board_isle" ? occupancy.toward.boardIsleId : occupancy.toward.externalLandId)
            : undefined;
          const operational = marinerRouteOperationalView(mariner, route.routeId);
          return (
            <SourceRouteOccupancyMarker
              key={`marker-${route.routeId}`}
              href={href}
              kind={occupancy.kind}
              routeId={route.routeId}
              label={occupancy.kind === "ship" ? "Ship" : `Raider toward ${towardLabel(occupancy.toward)}`}
              toward={toward}
              threatened={operational.threatened}
              color={color}
              onSelect={() => onSelect({ kind: "route", routeId: route.routeId })}
            />
          );
        })}
        {MARINER_ISLE_GEOMETRY.map((isle) => {
          const current = mariner.boardIsles.find((entry) => entry.boardIsleId === isle.boardIsleId);
          const worldName = boardIsleWorldName(mariner, world.isles, isle.boardIsleId);
          const market = current?.market.present === true;
          const rarity = current?.market.present === true ? current.market.rarity : null;
          const ravage = current?.ravageStormCount ?? 0;
          const nested = nestingBeastsOnIsle(mariner.beasts, isle.boardIsleId);
          const selected = selection?.kind === "isle" && selection.boardIsleId === isle.boardIsleId;
          const bits = [
            market ? "Market" : null,
            rarity ? `Rarity ${rarity}` : null,
            ravage > 0 ? `Ravage ${ravage}` : null,
            nested.length > 0 ? "Nesting Beast" : null,
          ].filter((bit): bit is string => bit !== null);
          const symbolId = marinerIsleSymbolId(isle.boardIsleId);
          const href = `#${symbolId}`;
          const convenience = isle.shapes.length === 1;
          const hit = marinerOverlayPointToBoard(isle.hit.cx, isle.hit.cy);
          return (
            <g
              key={isle.boardIsleId}
              data-map-layer="isle"
              data-isle-id={isle.boardIsleId}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`Isle ${worldName}${bits.length > 0 ? `: ${bits.join(", ")}` : ""}`}
              className={INTERACTIVE_FOCUS_CLASS}
              style={{ outline: "none" }}
              onClick={() => onSelect({ kind: "isle", boardIsleId: isle.boardIsleId })}
              onKeyDown={(event) => activate(event, () => onSelect({ kind: "isle", boardIsleId: isle.boardIsleId }))}
            >
              <use href={href} fill="transparent" stroke="transparent" />
              {convenience && (
                <ellipse
                  data-isle-convenience-hit
                  cx={hit.x}
                  cy={hit.y}
                  rx={marinerOverlayLengthToBoard(isle.hit.rx)}
                  ry={marinerOverlayLengthToBoard(isle.hit.ry)}
                  fill="transparent"
                  stroke="transparent"
                />
              )}
              <g
                data-selection-halo={selected ? "true" : undefined}
                data-isle-id={isle.boardIsleId}
                data-isle-shore-glow
                data-focus-ring
                filter="url(#mariner-isle-shore-glow)"
                color={MARINER_ISLE_SELECTION_GLOW[isle.boardIsleId]}
                pointerEvents="none"
              >
                <use href={href} data-source-geometry={symbolId} fill="none" stroke="none" />
                <SourceSymbolClone href={href} fill="#0f172a" stroke="none" />
              </g>
              {ravage > 0 && (
                <g data-isle-ravage pointerEvents="none">
                  <mask
                    id={`mariner-isle-silhouette-mask-${isle.boardIsleId}`}
                    maskUnits="userSpaceOnUse"
                    x={0}
                    y={0}
                    width={MARINER_SOURCE_BOARD.width}
                    height={MARINER_SOURCE_BOARD.height}
                  >
                    <rect width={MARINER_SOURCE_BOARD.width} height={MARINER_SOURCE_BOARD.height} fill="black" />
                    <SourceSymbolClone href={href} fill="white" stroke="none" />
                  </mask>
                  <rect
                    width={MARINER_SOURCE_BOARD.width}
                    height={MARINER_SOURCE_BOARD.height}
                    fill="url(#mariner-ravage-hatch)"
                    mask={`url(#mariner-isle-silhouette-mask-${isle.boardIsleId})`}
                    opacity={0.72}
                  />
                </g>
              )}
            </g>
          );
        })}
        </g>
        <g data-map-layer="overlay" transform={MARINER_SOURCE_BOARD.overlayTransform}>
        <g data-map-layer="pieces">
          {MARINER_SEA_GEOMETRY.map((sea) => {
            const stormCount = mariner.seaRegions.find((entry) => entry.regionId === sea.regionId)?.stormCount ?? 0;
            const storms = stormPiecePresentation(stormCount);
            const beasts = beastsInRegion(mariner.beasts, sea.regionId);
            const researchers = marinerSeaResearchers(sorcererPresence, sea.regionId);
            return (
              <g key={`pieces-${sea.regionId}`}>
                {storms.tokenCount > 0 && (
                  <g
                    data-piece="storm"
                    data-region-id={sea.regionId}
                    data-storm-count={stormCount}
                    data-storm-piece={storms.typhoon ? "typhoon" : "storm"}
                    data-typhoon={storms.typhoon ? "true" : "false"}
                    aria-label={storms.accessibleCount}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect({ kind: "region", regionId: sea.regionId });
                    }}
                  >
                    {Array.from({ length: storms.tokenCount }, (_, index) => (
                      <g key={index} transform={`translate(${sea.slots.storm.x + index * 7} ${sea.slots.storm.y - index * 6})`}>
                        <path
                          d={storms.typhoon
                            ? "M-14 3 C-16 -8 -4 -16 6 -10 C14 -5 14 4 6 8 C16 7 16 -4 8 -12 C-2 -18 -16 -10 -14 3 Z"
                            : "M-10 4 Q -4 -10 4 -6 Q 10 -2 8 6 Q 0 10 -10 4 Z"}
                          fill={storms.typhoon ? "#1e293b" : "#475569"}
                          stroke="#0f172a"
                        />
                        {storms.typhoon && index === 0 && (
                          <text x={0} y={20} textAnchor="middle" fontSize={8} fill="#0f172a">{stormCount}</text>
                        )}
                      </g>
                    ))}
                    <title>{storms.accessibleCount}</title>
                  </g>
                )}
                {beasts.map((beast, index) => (
                  <g
                    key={beast.denizenId}
                    data-piece="beast"
                    data-beast-id={beast.denizenId}
                    aria-label={`Beast ${denizenName(world.denizens, beast.denizenId)}`}
                    transform={`translate(${sea.slots.beast.x + index * 16} ${sea.slots.beast.y})`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect({ kind: "region", regionId: sea.regionId });
                    }}
                  >
                    <polygon points="0,-12 10,-2 6,12 -6,12 -10,-2" fill="#14532d" stroke="#052e16" />
                    <text x={0} y={20} textAnchor="middle" fontSize={8} fill="#14532d">Beast</text>
                  </g>
                ))}
                {researchers.map((researcher, index) => (
                  <g
                    key={researcher.denizenId}
                    data-researcher-target={sea.regionId}
                    data-researcher-status={researcher.operationalThisMonth ? "working" : "unavailable"}
                    aria-label={`${researcher.name} at ${seaRegionDisplayName(sea.regionId)}, ${researcherOperationalLabel(researcher.operationalThisMonth)}`}
                    transform={`translate(${sea.slots.researcher.x} ${sea.slots.researcher.y + index * 28})`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect({ kind: "region", regionId: sea.regionId });
                    }}
                  >
                    <rect
                      x={-36}
                      y={-12}
                      width={72}
                      height={24}
                      rx={5}
                      fill={researcher.operationalThisMonth ? "#eef2ff" : "url(#mariner-unavailable-hatch)"}
                      stroke="#4338ca"
                      strokeDasharray={researcher.operationalThisMonth ? undefined : "3 2"}
                    />
                    {!researcher.operationalThisMonth && (
                      <line x1={-28} y1={-6} x2={28} y2={6} stroke="#312e81" strokeWidth={1.5} />
                    )}
                    <text x={0} y={-1} textAnchor="middle" fontSize={8} fill="#312e81">{researcher.name}</text>
                    <text x={0} y={8} textAnchor="middle" fontSize={7} fill="#4338ca">
                      {researcherOperationalLabel(researcher.operationalThisMonth)}
                    </text>
                  </g>
                ))}
              </g>
            );
          })}
          {MARINER_ISLE_GEOMETRY.map((isle) => {
            const current = mariner.boardIsles.find((entry) => entry.boardIsleId === isle.boardIsleId);
            const market = current?.market.present === true;
            const hasRarity = current?.market.present === true && current.market.rarity !== null;
            const ravage = current?.ravageStormCount ?? 0;
            const beasts = beastsOnIsle(mariner.beasts, isle.boardIsleId);
            return (
              <g key={`isle-pieces-${isle.boardIsleId}`}>
                {market && (
                  <g
                    data-piece="market"
                    data-isle-id={isle.boardIsleId}
                    data-rarity={hasRarity ? "true" : "false"}
                    aria-label={hasRarity ? "Market with a Rarity" : "Market"}
                    transform={`translate(${isle.slots.market.x} ${isle.slots.market.y})`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect({ kind: "isle", boardIsleId: isle.boardIsleId });
                    }}
                  >
                    <rect x={-8} y={-6} width={16} height={12} fill="#b45309" stroke="#78350f" />
                    <path d="M -10 -6 L 0 -14 L 10 -6" fill="#f59e0b" stroke="#78350f" />
                    {hasRarity && (
                      <polygon
                        data-rarity-cue="true"
                        points="10,-16 12,-11 17,-11 13,-8 15,-3 10,-6 5,-3 7,-8 3,-11 8,-11"
                        fill="#f8fafc"
                        stroke="#0f172a"
                        strokeWidth={1}
                      />
                    )}
                    <text x={0} y={16} textAnchor="middle" fontSize={8} fill="#78350f">
                      {hasRarity ? "Market · Rarity" : "Market"}
                    </text>
                  </g>
                )}
                {ravage > 0 && (
                  <g
                    data-piece="ravage"
                    data-isle-id={isle.boardIsleId}
                    data-ravage-count={ravage}
                    aria-label={`Ravage ${ravage}`}
                    transform={`translate(${isle.slots.ravage.x} ${isle.slots.ravage.y + isle.hit.ry + 10})`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect({ kind: "isle", boardIsleId: isle.boardIsleId });
                    }}
                  >
                    <text textAnchor="middle" fontSize={9} fill="#9a3412">Ravaged {ravage}</text>
                  </g>
                )}
                {beasts.map((beast, index) => (
                  <g
                    key={beast.denizenId}
                    data-piece="beast"
                    data-beast-id={beast.denizenId}
                    aria-label={`Beast ${denizenName(world.denizens, beast.denizenId)}`}
                    transform={`translate(${isle.slots.beast.x + index * 16} ${isle.slots.beast.y})`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect({ kind: "isle", boardIsleId: isle.boardIsleId });
                    }}
                  >
                    <polygon points="0,-12 10,-2 6,12 -6,12 -10,-2" fill="#14532d" stroke="#052e16" />
                    <text x={0} y={20} textAnchor="middle" fontSize={8} fill="#14532d">Beast</text>
                  </g>
                ))}
              </g>
            );
          })}
          {disruptive.length > 0 && (
            <g data-domain-presence="disruptive-arcanist" pointerEvents="none">
              <rect x={MARINER_DOMAIN_PRESENCE_ANCHOR.x - 160} y={MARINER_DOMAIN_PRESENCE_ANCHOR.y - 16} width={320} height={30} rx={6} fill="#f5f3ff" stroke="#5b21b6" />
              <text x={MARINER_DOMAIN_PRESENCE_ANCHOR.x} y={MARINER_DOMAIN_PRESENCE_ANCHOR.y + 4} textAnchor="middle" fontSize={9} fill="#4c1d95">
                {disruptive.map((entry) => `${entry.name} (Mariner Domain presence)`).join(" · ")}
              </text>
            </g>
          )}
        </g>
        </g>
      </svg>
    </div>
  );
}

function Inspector({
  selection,
  mariner,
  world,
  pending,
  campaignId,
  loreCompendium,
  pactSeatStatuses,
  onCreateBeast,
  onMoveStorm,
  onMoveShip,
  onCreateShip,
  onMoveBeast,
  onNestBeast,
  onRecordRavage,
  onSubmitRoute,
  onSubmitStorm,
  onSubmitMarket,
  onSubmitRavage,
}: {
  selection: Selection | null;
  mariner: MarinerState;
  world: WorldReference;
  pending: boolean;
  campaignId: string;
  loreCompendium: LoreCompendiumUiState;
  pactSeatStatuses: Partial<Record<PactSeatId, PactSeatStatus | null>>;
  onCreateBeast: (payload: ReturnType<typeof buildCreateMarinerBeastPayload>) => Promise<boolean>;
  onMoveStorm: (payload: ReturnType<typeof buildMoveMarinerStormPayload>) => Promise<boolean>;
  onMoveShip: (payload: ReturnType<typeof buildMoveMarinerShipPayload>) => Promise<boolean>;
  onCreateShip: (payload: ReturnType<typeof buildCreateMarinerShipPayload>) => Promise<boolean>;
  onMoveBeast: (payload: ReturnType<typeof buildMoveMarinerBeastPayload>) => Promise<boolean>;
  onNestBeast: (payload: ReturnType<typeof buildNestMarinerBeastPayload>) => Promise<boolean>;
  onRecordRavage: (payload: ReturnType<typeof buildRecordMarinerRavageResultPayload>) => Promise<boolean>;
  onSubmitRoute: (routeId: string, occupancy: MarinerRouteOccupancy) => void;
  onSubmitStorm: (regionId: MarinerSeaRegionId, stormCount: number) => void;
  onSubmitMarket: (boardIsleId: MarinerBoardIsleId, market: MarinerIsleMarket) => void;
  onSubmitRavage: (boardIsleId: MarinerBoardIsleId, ravageStormCount: number) => void;
}) {
  if (selection === null) {
    return <div className="text-sm text-slate-500">Select an Isle, Route, or Sea / Horizon on the map.</div>;
  }
  if (selection.kind === "route") {
    return <RouteInspector routeId={selection.routeId} mariner={mariner} world={world} pending={pending} onSubmit={onSubmitRoute} />;
  }
  if (selection.kind === "region") {
    return (
      <RegionInspector
        regionId={selection.regionId}
        mariner={mariner}
        world={world}
        pending={pending}
        campaignId={campaignId}
        onSubmit={onSubmitStorm}
        onCreateBeast={onCreateBeast}
        onMoveStorm={onMoveStorm}
        onMoveBeast={onMoveBeast}
        onNestBeast={onNestBeast}
      />
    );
  }
  return (
    <IsleInspector
      boardIsleId={selection.boardIsleId}
      mariner={mariner}
      world={world}
      pending={pending}
      campaignId={campaignId}
      loreCompendium={loreCompendium}
      pactSeatStatuses={pactSeatStatuses}
      onSubmitMarket={onSubmitMarket}
      onSubmitRavage={onSubmitRavage}
      onMoveShip={onMoveShip}
      onCreateShip={onCreateShip}
      onRecordRavage={onRecordRavage}
    />
  );
}

function RouteInspector({
  routeId,
  mariner,
  world,
  pending,
  onSubmit,
}: {
  routeId: string;
  mariner: MarinerState;
  world: WorldReference;
  pending: boolean;
  onSubmit: (routeId: string, occupancy: MarinerRouteOccupancy) => void;
}) {
  const definition = MARINER_ROUTE_CATALOG.find((route) => route.routeId === routeId);
  const current = mariner.routes.find((route) => route.routeId === routeId);
  const [kind, setKind] = useState<"empty" | "ship" | "raider">(current?.occupancy.kind ?? "empty");
  const [towardKey, setTowardKey] = useState("");
  useEffect(() => {
    const occupancy = current?.occupancy;
    setKind(occupancy?.kind ?? "empty");
    if (occupancy?.kind === "raider") {
      setTowardKey(endpointKey(occupancy.toward));
    } else {
      setTowardKey(definition ? endpointKey(definition.endpointA) : "");
    }
  }, [routeId, current?.occupancy, definition]);
  if (definition === undefined || current === undefined) {
    return <div className="text-sm text-slate-500">Unknown Route.</div>;
  }
  const endpoints = [definition.endpointA, definition.endpointB];
  return (
    <section className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3">
      <h3 className="text-sm font-semibold">Route inspector</h3>
      <p className="text-sm">
        {routeEndpointLabel(definition.endpointA, mariner, world.isles)} — {routeEndpointLabel(definition.endpointB, mariner, world.isles)}
      </p>
      <p className="text-xs text-slate-500">Current: {routeOccupancyLabel(current.occupancy, mariner, world.isles)}</p>
      <label className="text-sm block">
        Occupancy
        <select aria-label="Route occupancy" className={`${fieldClass} mt-1`} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="empty">Empty</option>
          <option value="ship">Ship</option>
          <option value="raider">Raider</option>
        </select>
      </label>
      {kind === "raider" && (
        <label className="text-sm block">
          Raids toward
          <select aria-label="Raider toward" className={`${fieldClass} mt-1`} value={towardKey} onChange={(e) => setTowardKey(e.target.value)}>
            {endpoints.map((endpoint) => (
              <option key={endpointKey(endpoint)} value={endpointKey(endpoint)}>
                {routeEndpointLabel(endpoint, mariner, world.isles)}
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        className={btnClass}
        disabled={pending}
        onClick={() => {
          const occupancy: MarinerRouteOccupancy = kind === "empty"
            ? { kind: "empty" }
            : kind === "ship"
              ? { kind: "ship" }
              : { kind: "raider", toward: endpoints.find((endpoint) => endpointKey(endpoint) === towardKey) ?? definition.endpointA };
          onSubmit(routeId, occupancy);
        }}
      >
        Set Route occupancy
      </button>
    </section>
  );
}

function stableMethodId(store: Map<string, string>, denizenId: string): string {
  const existing = store.get(denizenId);
  if (existing !== undefined) return existing;
  const created = newMethodEntryId();
  store.set(denizenId, created);
  return created;
}

function endpointKey(endpoint: { kind: string; boardIsleId?: string; externalLandId?: string }): string {
  return endpoint.kind === "board_isle" ? `board:${endpoint.boardIsleId}` : `land:${endpoint.externalLandId}`;
}

function RegionInspector({
  regionId,
  mariner,
  world,
  pending,
  campaignId,
  onSubmit,
  onCreateBeast,
  onMoveStorm,
  onMoveBeast,
  onNestBeast,
}: {
  regionId: MarinerSeaRegionId;
  mariner: MarinerState;
  world: WorldReference;
  pending: boolean;
  campaignId: string;
  onSubmit: (regionId: MarinerSeaRegionId, stormCount: number) => void;
  onCreateBeast: (payload: ReturnType<typeof buildCreateMarinerBeastPayload>) => Promise<boolean>;
  onMoveStorm: (payload: ReturnType<typeof buildMoveMarinerStormPayload>) => Promise<boolean>;
  onMoveBeast: (payload: ReturnType<typeof buildMoveMarinerBeastPayload>) => Promise<boolean>;
  onNestBeast: (payload: ReturnType<typeof buildNestMarinerBeastPayload>) => Promise<boolean>;
}) {
  const definition = MARINER_SEA_REGION_CATALOG.find((region) => region.regionId === regionId);
  const current = mariner.seaRegions.find((region) => region.regionId === regionId);
  const [storms, setStorms] = useState(String(current?.stormCount ?? 0));
  const [createOpen, setCreateOpen] = useState(false);
  const [stormMoveOpen, setStormMoveOpen] = useState(false);
  const [nestDraft, setNestDraft] = useState<MarinerBeastState | null>(null);
  const [moveDraft, setMoveDraft] = useState<MarinerBeastState | null>(null);
  useEffect(() => {
    setStorms(String(current?.stormCount ?? 0));
  }, [regionId, current?.stormCount]);
  useEffect(() => {
    setCreateOpen(false);
    setStormMoveOpen(false);
    setNestDraft(null);
    setMoveDraft(null);
  }, [regionId]);
  if (definition === undefined || current === undefined) {
    return <div className="text-sm text-slate-500">Unknown region.</div>;
  }
  const parsed = parseNonNegInt(storms);
  const nestable = distrustingBeastsInRegion(mariner.beasts, regionId);
  return (
    <section className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3">
      <h3 className="text-sm font-semibold">{definition.kind === "horizon" ? "Horizon" : "Sea"} inspector</h3>
      <p className="text-sm font-medium">{definition.displayName}</p>
      <p className="text-sm">{definition.kind === "horizon" ? "Horizon region" : "Sea region"}</p>
      <p className="text-sm">{seaRegionStateLabel(current.stormCount)}</p>
      {isTyphoon(current.stormCount) && <p className="text-sm font-medium">Typhoon (derived: Storms ≥ 2)</p>}
      <p className="text-xs text-slate-500">
        Adjacent Isles: {definition.adjacentBoardIsleIds.map((id) => boardIsleWorldName(mariner, world.isles, id)).join(", ") || "none"}
      </p>
      <p className="text-xs text-slate-500">
        Adjacent regions: {definition.adjacentRegionIds.map((id) => seaRegionDisplayName(id)).join(", ") || "none"}
      </p>
      <label className="text-sm block">
        Storm count
        <input
          aria-label="Storm count"
          className={`${fieldClass} mt-1`}
          value={storms}
          onChange={(e) => setStorms(e.target.value)}
        />
      </label>
      <button
        className={btnClass}
        disabled={pending || parsed === null}
        onClick={() => {
          if (parsed === null) return;
          onSubmit(regionId, parsed);
        }}
      >
        Set Storm count
      </button>
      {!createOpen && (
        <button className={btnClass} disabled={pending} onClick={() => setCreateOpen(true)}>
          {CREATE_BEAST_LABEL}
        </button>
      )}
      {createOpen && (
        <CreateBeastForm
          regionId={regionId}
          mariner={mariner}
          campaignId={campaignId}
          pending={pending}
          onCancel={() => setCreateOpen(false)}
          onSubmit={onCreateBeast}
        />
      )}
      {!stormMoveOpen && (
        <button className={btnClass} disabled={pending} onClick={() => setStormMoveOpen(true)}>
          {MOVE_STORM_LABEL}
        </button>
      )}
      {stormMoveOpen && (
        <MoveStormForm
          sourceRegionId={regionId}
          adjacentRegionIds={definition.adjacentRegionIds}
          mariner={mariner}
          campaignId={campaignId}
          pending={pending}
          onCancel={() => setStormMoveOpen(false)}
          onSubmit={onMoveStorm}
        />
      )}
      {nestable.filter((beast) => beast.denizenId !== nestDraft?.denizenId).map((beast) => (
        <button
          key={`nest-${beast.denizenId}`}
          className={btnClass}
          disabled={pending}
          onClick={() => setNestDraft({ ...beast, location: beast.location })}
        >
          {NEST_BEAST_LABEL}
        </button>
      ))}
      {nestDraft !== null && (
        <NestBeastForm
          beast={nestDraft}
          adjacentIsleIds={definition.adjacentBoardIsleIds}
          mariner={mariner}
          world={world}
          campaignId={campaignId}
          pending={pending}
          onCancel={() => setNestDraft(null)}
          onSubmit={onNestBeast}
        />
      )}
      {nestable.filter((beast) => beast.denizenId !== moveDraft?.denizenId).map((beast) => (
        <button
          key={`move-${beast.denizenId}`}
          className={btnClass}
          disabled={pending}
          onClick={() => setMoveDraft({ ...beast, location: beast.location })}
        >
          {MOVE_BEAST_LABEL}
        </button>
      ))}
      {moveDraft !== null && (
        <MoveBeastForm
          beast={moveDraft}
          sourceRegionId={regionId}
          adjacentRegionIds={definition.adjacentRegionIds}
          mariner={mariner}
          world={world}
          campaignId={campaignId}
          pending={pending}
          onCancel={() => setMoveDraft(null)}
          onSubmit={onMoveBeast}
        />
      )}
    </section>
  );
}

function IsleInspector({
  boardIsleId,
  mariner,
  world,
  pending,
  campaignId,
  loreCompendium,
  pactSeatStatuses,
  onSubmitMarket,
  onSubmitRavage,
  onMoveShip,
  onCreateShip,
  onRecordRavage,
}: {
  boardIsleId: MarinerBoardIsleId;
  mariner: MarinerState;
  world: WorldReference;
  pending: boolean;
  campaignId: string;
  loreCompendium: LoreCompendiumUiState;
  pactSeatStatuses: Partial<Record<PactSeatId, PactSeatStatus | null>>;
  onSubmitMarket: (boardIsleId: MarinerBoardIsleId, market: MarinerIsleMarket) => void;
  onSubmitRavage: (boardIsleId: MarinerBoardIsleId, ravageStormCount: number) => void;
  onMoveShip: (payload: ReturnType<typeof buildMoveMarinerShipPayload>) => Promise<boolean>;
  onCreateShip: (payload: ReturnType<typeof buildCreateMarinerShipPayload>) => Promise<boolean>;
  onRecordRavage: (payload: ReturnType<typeof buildRecordMarinerRavageResultPayload>) => Promise<boolean>;
}) {
  const current = mariner.boardIsles.find((isle) => isle.boardIsleId === boardIsleId);
  const [present, setPresent] = useState(current?.market.present === true);
  const [rarity, setRarity] = useState(current?.market.present === true ? current.market.rarity ?? "" : "");
  const [ravage, setRavage] = useState(String(current?.ravageStormCount ?? 0));
  const [shipOpen, setShipOpen] = useState(false);
  const [createShipOpen, setCreateShipOpen] = useState(false);
  const [ravageOpen, setRavageOpen] = useState(false);
  const [ravageOutcome, setRavageOutcome] = useState<"market_absorbed" | "isle_ravaged" | null>(null);
  useEffect(() => {
    setPresent(current?.market.present === true);
    setRarity(current?.market.present === true ? current.market.rarity ?? "" : "");
    setRavage(String(current?.ravageStormCount ?? 0));
  }, [boardIsleId, current]);
  useEffect(() => {
    setShipOpen(false);
    setCreateShipOpen(false);
    setRavageOpen(false);
    setRavageOutcome(null);
  }, [boardIsleId]);
  if (current === undefined) {
    return <div className="text-sm text-slate-500">Unknown Isle.</div>;
  }
  const nested = nestingBeastsOnIsle(mariner.beasts, boardIsleId);
  const conflict = marketBeastConflict(present, mariner.beasts, boardIsleId);
  const parsed = parseNonNegInt(ravage);
  return (
    <section className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3">
      <h3 className="text-sm font-semibold">Isle inspector</h3>
      <p className="text-sm">Board: {boardIsleDisplayName(boardIsleId)}</p>
      <p className="text-sm">World Isle: {worldIsleName(world.isles, current.worldIsleId)}</p>
      <p className="text-sm">Market: {current.market.present ? `present${current.market.rarity ? ` · Rarity ${current.market.rarity}` : ""}` : "absent"}</p>
      <p className="text-sm">Ravage Storms: {current.ravageStormCount}</p>
      <p className="text-sm">Friendly / Nesting Beast: {nested.map((beast) => denizenName(world.denizens, beast.denizenId)).join(", ") || "none"}</p>
      {conflict && (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          An Isle cannot contain both a Market and a Friendly / Nesting Beast. The server will reject this combination.
        </p>
      )}
      <label className="text-sm flex items-center gap-2">
        <input type="checkbox" checked={present} onChange={(e) => setPresent(e.target.checked)} />
        Market present
      </label>
      {present && (
        <label className="text-sm block">
          Rarity (optional)
          <input aria-label="Isle Rarity" className={`${fieldClass} mt-1`} value={rarity} onChange={(e) => setRarity(e.target.value)} />
        </label>
      )}
      <button
        className={btnClass}
        disabled={pending}
        onClick={() => {
          const market: MarinerIsleMarket = present
            ? { present: true, rarity: rarity.trim() === "" ? null : rarity }
            : { present: false };
          onSubmitMarket(boardIsleId, market);
        }}
      >
        Set Market
      </button>
      <label className="text-sm block">
        Ravage Storm count
        <input aria-label="Ravage Storm count" className={`${fieldClass} mt-1`} value={ravage} onChange={(e) => setRavage(e.target.value)} />
      </label>
      <button
        className={btnClass}
        disabled={pending || parsed === null}
        onClick={() => {
          if (parsed === null) return;
          onSubmitRavage(boardIsleId, parsed);
        }}
      >
        Set Ravage
      </button>
      {!shipOpen && (
        <button className={btnClass} disabled={pending} onClick={() => setShipOpen(true)}>
          {MOVE_SHIP_LABEL}
        </button>
      )}
      {shipOpen && (
        <MoveShipForm
          boardIsleId={boardIsleId}
          mariner={mariner}
          world={world}
          campaignId={campaignId}
          pending={pending}
          onCancel={() => setShipOpen(false)}
          onSubmit={onMoveShip}
        />
      )}
      {!createShipOpen && (
        <button className={btnClass} disabled={pending} onClick={() => setCreateShipOpen(true)}>
          {CREATE_SHIP_LABEL}
        </button>
      )}
      {createShipOpen && (
        <CreateShipForm
          boardIsleId={boardIsleId}
          mariner={mariner}
          world={world}
          campaignId={campaignId}
          pending={pending}
          onCancel={() => setCreateShipOpen(false)}
          onSubmit={onCreateShip}
        />
      )}
      {!ravageOpen && (
        <button className={btnClass} disabled={pending} onClick={() => setRavageOpen(true)}>
          {RAVAGE_RESULT_LABEL}
        </button>
      )}
      {ravageOpen && (
        <RecordRavageForm
          boardIsleId={boardIsleId}
          mariner={mariner}
          world={world}
          campaignId={campaignId}
          pending={pending}
          onCancel={() => setRavageOpen(false)}
          onSubmit={onRecordRavage}
          onRecorded={(outcome) => {
            setRavageOutcome(outcome);
            setRavageOpen(false);
          }}
        />
      )}
      {ravageOutcome === "market_absorbed" && (
        <p className="text-sm text-slate-700 dark:text-slate-200">{RAVAGE_MARKET_ABSORBED_COPY}</p>
      )}
      {ravageOutcome === "isle_ravaged" && (
        <div className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
          <p>{RAVAGE_INCOMPLETE_COPY}</p>
          <p>{RAVAGE_LORE_FOLLOW_THROUGH}</p>
          <p>{RAVAGE_LOCATION_FOLLOW_THROUGH}</p>
        </div>
      )}
      <IsleLoreSection
        boardIsleId={boardIsleId}
        worldIsleId={current.worldIsleId}
        loreCompendium={loreCompendium}
        pactSeatStatuses={pactSeatStatuses}
        campaignId={campaignId}
      />
    </section>
  );
}

function CreateShipForm({
  boardIsleId,
  mariner,
  world,
  campaignId,
  pending,
  onCancel,
  onSubmit,
}: {
  boardIsleId: MarinerBoardIsleId;
  mariner: MarinerState;
  world: WorldReference;
  campaignId: string;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (payload: ReturnType<typeof buildCreateMarinerShipPayload>) => Promise<boolean>;
}) {
  const [snapshot] = useState(() => captureOperabilityBoard(mariner));
  const [methodIds] = useState(() => new Map<string, string>());
  const empty = emptyRoutesBorderingIsle(snapshot, boardIsleId);
  const [targetRouteId, setTargetRouteId] = useState("");
  const [rampageSeats, setRampageSeats] = useState<Record<string, string>>({});
  const predictedBeastIds = targetRouteId === ""
    ? []
    : predictedNewlyTrappedBeastIdsAfterShipPlacement(snapshot, targetRouteId, { kind: "ship" });
  return (
    <div className="rounded-lg border border-teal-200 dark:border-teal-900 p-3 space-y-2">
      <h4 className="text-sm font-medium">{CREATE_SHIP_LABEL}</h4>
      <label className="text-sm block">
        Target Route
        <select
          aria-label="Create Ship target Route"
          className={`${fieldClass} mt-1`}
          value={targetRouteId}
          onChange={(e) => {
            setTargetRouteId(e.target.value);
            setRampageSeats({});
          }}
        >
          <option value="">Select empty adjacent Route…</option>
          {empty.map((route) => (
            <option key={route.routeId} value={route.routeId}>
              {routeEndpointLabel(route.endpointA, mariner, world.isles)} — {routeEndpointLabel(route.endpointB, mariner, world.isles)}
            </option>
          ))}
        </select>
      </label>
      {predictedBeastIds.map((denizenId) => (
        <label key={denizenId} className="text-sm block">
          Rampage destination
          <select
            aria-label={predictedBeastIds.length === 1 ? "Rampage destination" : `Rampage destination for ${denizenId}`}
            className={`${fieldClass} mt-1`}
            value={rampageSeats[denizenId] ?? ""}
            onChange={(e) => setRampageSeats((current) => ({ ...current, [denizenId]: e.target.value }))}
          >
            <option value="">Select destination Domain…</option>
            {otherDomainSeatOptions().map((seatId) => (
              <option key={seatId} value={seatId}>{pactSeatDisplayName(seatId)}</option>
            ))}
          </select>
        </label>
      ))}
      <div className="flex gap-2">
        <button
          className={btnClass}
          disabled={
            pending
            || targetRouteId === ""
            || predictedBeastIds.some((denizenId) => (rampageSeats[denizenId] ?? "") === "")
          }
          onClick={() => {
            const expected = expectedForCreateShip(snapshot, targetRouteId);
            void onSubmit(buildCreateMarinerShipPayload({
              commandId: newCommandId(),
              expectedCampaignId: campaignId,
              sourceIsleId: boardIsleId,
              targetRouteId,
              ...expected,
              rampageResolutions: predictedBeastIds.map((denizenId) => ({
                denizenId,
                destinationSeatId: rampageSeats[denizenId],
                rampagingMethodEntryId: stableMethodId(methodIds, denizenId),
              })),
            })).then((ok) => {
              if (ok) onCancel();
            });
          }}
        >
          {CREATE_SHIP_LABEL}
        </button>
        <button className={ghostBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function CreateBeastForm({
  regionId,
  mariner,
  campaignId,
  pending,
  onCancel,
  onSubmit,
}: {
  regionId: MarinerSeaRegionId;
  mariner: MarinerState;
  campaignId: string;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (payload: ReturnType<typeof buildCreateMarinerBeastPayload>) => Promise<boolean>;
}) {
  const [snapshot] = useState(() => captureOperabilityBoard(mariner));
  const [denizenId] = useState(() => newDenizenId());
  const [methodEntryId] = useState(() => newMethodEntryId());
  const [wouldRampage] = useState(() => createBeastWouldRampage(snapshot, regionId));
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [statusChoice, setStatusChoice] = useState("");
  const [otherLabel, setOtherLabel] = useState("");
  const [element, setElement] = useState("");
  const [definitionId, setDefinitionId] = useState("");
  const [rampageSeat, setRampageSeat] = useState("");
  const status = statusChoice === "other"
    ? { kind: "other" as const, label: otherLabel }
    : statusChoice !== ""
      ? { kind: "standard" as const, value: statusChoice as (typeof MARINER_POWERFUL_STATUSES)[number] }
      : null;
  const ready = name.trim() !== ""
    && status !== null
    && (status.kind === "standard" || otherLabel.trim() !== "")
    && element !== ""
    && (!wouldRampage || rampageSeat !== "");
  const matching = element === "" ? [] : definitionsMatchingElement(element as ElementId);
  return (
    <div className="rounded-lg border border-teal-200 dark:border-teal-900 p-3 space-y-2">
      <h4 className="text-sm font-medium">{CREATE_BEAST_LABEL}</h4>
      <label className="text-sm block">
        Name
        <input aria-label="Beast name" className={`${fieldClass} mt-1`} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="text-sm block">
        Description (optional)
        <input aria-label="Beast description" className={`${fieldClass} mt-1`} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label className="text-sm block">
        Powerful status
        <select
          aria-label="Powerful status"
          className={`${fieldClass} mt-1`}
          value={statusChoice}
          onChange={(e) => setStatusChoice(e.target.value)}
        >
          <option value="">Select Powerful status…</option>
          {MARINER_POWERFUL_STATUSES.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
          <option value="other">other</option>
        </select>
      </label>
      {statusChoice === "other" && (
        <label className="text-sm block">
          Other status label
          <input aria-label="Powerful status label" className={`${fieldClass} mt-1`} value={otherLabel} onChange={(e) => setOtherLabel(e.target.value)} />
        </label>
      )}
      <label className="text-sm block">
        Element
        <select
          aria-label="Beast element"
          className={`${fieldClass} mt-1`}
          value={element}
          onChange={(e) => {
            setElement(e.target.value);
            setDefinitionId("");
          }}
        >
          <option value="">Select element…</option>
          {MARINER_ELEMENTS.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </label>
      <label className="text-sm block">
        Built-in Beast (optional)
        <select aria-label="Built-in Beast" className={`${fieldClass} mt-1`} value={definitionId} onChange={(e) => setDefinitionId(e.target.value)}>
          <option value="">None</option>
          {matching.map((definition) => (
            <option key={definition.id} value={definition.id}>{definition.name}</option>
          ))}
        </select>
      </label>
      {wouldRampage && (
        <label className="text-sm block">
          Rampage destination
          <select aria-label="Rampage destination" className={`${fieldClass} mt-1`} value={rampageSeat} onChange={(e) => setRampageSeat(e.target.value)}>
            <option value="">Select destination Domain…</option>
            {otherDomainSeatOptions().map((seatId) => (
              <option key={seatId} value={seatId}>{pactSeatDisplayName(seatId)}</option>
            ))}
          </select>
        </label>
      )}
      <div className="flex gap-2">
        <button
          className={btnClass}
          disabled={pending || !ready}
          onClick={() => {
            if (status === null) return;
            const expected = expectedForCreateBeast(snapshot, regionId);
            void onSubmit(buildCreateMarinerBeastPayload({
              commandId: newCommandId(),
              expectedCampaignId: campaignId,
              denizenId,
              name,
              description: description.trim() === "" ? null : description,
              status,
              element: element as ElementId,
              definitionId: definitionId === "" ? null : definitionId as never,
              regionId,
              ...expected,
              rampageDestinationSeatId: wouldRampage ? rampageSeat as PactSeatId : null,
              rampagingMethodEntryId: wouldRampage ? methodEntryId : null,
            })).then((ok) => {
              if (ok) onCancel();
            });
          }}
        >
          {CREATE_BEAST_LABEL}
        </button>
        <button className={ghostBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function MoveStormForm({
  sourceRegionId,
  adjacentRegionIds,
  mariner,
  campaignId,
  pending,
  onCancel,
  onSubmit,
}: {
  sourceRegionId: MarinerSeaRegionId;
  adjacentRegionIds: readonly MarinerSeaRegionId[];
  mariner: MarinerState;
  campaignId: string;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (payload: ReturnType<typeof buildMoveMarinerStormPayload>) => Promise<boolean>;
}) {
  const [snapshot] = useState(() => captureOperabilityBoard(mariner));
  const [destinationRegionId, setDestinationRegionId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div className="rounded-lg border border-teal-200 dark:border-teal-900 p-3 space-y-2">
      <h4 className="text-sm font-medium">{MOVE_STORM_LABEL}</h4>
      <p className="text-xs text-slate-500">Records a table-confirmed legal Storm move. The software does not know the actual prevailing Wind.</p>
      <label className="text-sm block">
        Destination
        <select aria-label="Storm destination" className={`${fieldClass} mt-1`} value={destinationRegionId} onChange={(e) => setDestinationRegionId(e.target.value)}>
          <option value="">Select adjacent region…</option>
          {adjacentRegionIds.map((id) => (
            <option key={id} value={id}>{seaRegionDisplayName(id)}</option>
          ))}
        </select>
      </label>
      <label className="text-sm flex items-start gap-2">
        <input
          type="checkbox"
          aria-label="Wind confirmation"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <span>{WIND_CONFIRMATION_LABEL}</span>
      </label>
      <div className="flex gap-2">
        <button
          className={btnClass}
          disabled={pending || destinationRegionId === "" || !confirmed}
          onClick={() => {
            const dest = destinationRegionId as MarinerSeaRegionId;
            void onSubmit(buildMoveMarinerStormPayload({
              commandId: newCommandId(),
              expectedCampaignId: campaignId,
              sourceRegionId,
              destinationRegionId: dest,
              confirmedNotAgainstPrevailingWind: confirmed,
              ...expectedForMoveStorm(snapshot, sourceRegionId, dest),
            })).then((ok) => {
              if (ok) onCancel();
            });
          }}
        >
          {MOVE_STORM_LABEL}
        </button>
        <button className={ghostBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function MoveBeastForm({
  beast,
  sourceRegionId,
  adjacentRegionIds,
  mariner,
  world,
  campaignId,
  pending,
  onCancel,
  onSubmit,
}: {
  beast: MarinerBeastState;
  sourceRegionId: MarinerSeaRegionId;
  adjacentRegionIds: readonly MarinerSeaRegionId[];
  mariner: MarinerState;
  world: WorldReference;
  campaignId: string;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (payload: ReturnType<typeof buildMoveMarinerBeastPayload>) => Promise<boolean>;
}) {
  const [snapshot] = useState(() => captureOperabilityBoard(mariner));
  const [methodIds] = useState(() => new Map<string, string>());
  const [destinationRegionId, setDestinationRegionId] = useState("");
  const [rampageSeat, setRampageSeat] = useState("");
  const dest = destinationRegionId as MarinerSeaRegionId;
  const wouldRampage = destinationRegionId !== ""
    && predictedMovedBeastWouldRampage(snapshot, beast.denizenId, dest);
  const capturedSource = beast.location.kind === "sea_region" ? beast.location.regionId : sourceRegionId;
  return (
    <div className="rounded-lg border border-teal-200 dark:border-teal-900 p-3 space-y-2">
      <h4 className="text-sm font-medium">{MOVE_BEAST_LABEL}</h4>
      <p className="text-xs text-slate-500">{denizenName(world.denizens, beast.denizenId)}</p>
      <label className="text-sm block">
        Destination
        <select
          aria-label="Beast destination"
          className={`${fieldClass} mt-1`}
          value={destinationRegionId}
          onChange={(e) => {
            setDestinationRegionId(e.target.value);
            setRampageSeat("");
          }}
        >
          <option value="">Select adjacent Sea/Horizon…</option>
          {adjacentRegionIds.map((id) => (
            <option key={id} value={id}>{seaRegionDisplayName(id)}</option>
          ))}
        </select>
      </label>
      {wouldRampage && (
        <label className="text-sm block">
          Rampage destination
          <select aria-label="Rampage destination" className={`${fieldClass} mt-1`} value={rampageSeat} onChange={(e) => setRampageSeat(e.target.value)}>
            <option value="">Select destination Domain…</option>
            {otherDomainSeatOptions().map((seatId) => (
              <option key={seatId} value={seatId}>{pactSeatDisplayName(seatId)}</option>
            ))}
          </select>
        </label>
      )}
      <div className="flex gap-2">
        <button
          className={btnClass}
          disabled={pending || destinationRegionId === "" || (wouldRampage && rampageSeat === "")}
          onClick={() => {
            const expected = expectedForMoveBeast(snapshot, beast.denizenId, capturedSource, dest);
            void onSubmit(buildMoveMarinerBeastPayload({
              commandId: newCommandId(),
              expectedCampaignId: campaignId,
              denizenId: beast.denizenId,
              sourceRegionId: capturedSource,
              destinationRegionId: dest,
              ...expected,
              rampageResolution: wouldRampage
                ? {
                    denizenId: beast.denizenId,
                    destinationSeatId: rampageSeat,
                    rampagingMethodEntryId: stableMethodId(methodIds, beast.denizenId),
                  }
                : null,
            })).then((ok) => {
              if (ok) onCancel();
            });
          }}
        >
          {MOVE_BEAST_LABEL}
        </button>
        <button className={ghostBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function NestBeastForm({
  beast,
  adjacentIsleIds,
  mariner,
  world,
  campaignId,
  pending,
  onCancel,
  onSubmit,
}: {
  beast: MarinerBeastState;
  adjacentIsleIds: readonly MarinerBoardIsleId[];
  mariner: MarinerState;
  world: WorldReference;
  campaignId: string;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (payload: ReturnType<typeof buildNestMarinerBeastPayload>) => Promise<boolean>;
}) {
  const [snapshot] = useState(() => captureOperabilityBoard(mariner));
  const [boardIsleId, setBoardIsleId] = useState("");
  return (
    <div className="rounded-lg border border-teal-200 dark:border-teal-900 p-3 space-y-2">
      <h4 className="text-sm font-medium">{NEST_BEAST_LABEL}</h4>
      <p className="text-xs text-slate-500">{denizenName(world.denizens, beast.denizenId)}</p>
      <label className="text-sm block">
        Target Isle
        <select aria-label="Nest target Isle" className={`${fieldClass} mt-1`} value={boardIsleId} onChange={(e) => setBoardIsleId(e.target.value)}>
          <option value="">Select adjacent Isle…</option>
          {adjacentIsleIds.map((id) => (
            <option key={id} value={id}>{boardIsleWorldName(mariner, world.isles, id)}</option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button
          className={btnClass}
          disabled={pending || boardIsleId === ""}
          onClick={() => {
            const target = boardIsleId as MarinerBoardIsleId;
            void onSubmit(buildNestMarinerBeastPayload({
              commandId: newCommandId(),
              expectedCampaignId: campaignId,
              denizenId: beast.denizenId,
              boardIsleId: target,
              ...expectedForNestBeast(snapshot, beast.denizenId, target),
            })).then((ok) => {
              if (ok) onCancel();
            });
          }}
        >
          {NEST_BEAST_LABEL}
        </button>
        <button className={ghostBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function MoveShipForm({
  boardIsleId,
  mariner,
  world,
  campaignId,
  pending,
  onCancel,
  onSubmit,
}: {
  boardIsleId: MarinerBoardIsleId;
  mariner: MarinerState;
  world: WorldReference;
  campaignId: string;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (payload: ReturnType<typeof buildMoveMarinerShipPayload>) => Promise<boolean>;
}) {
  const [snapshot] = useState(() => captureOperabilityBoard(mariner));
  const [methodIds] = useState(() => new Map<string, string>());
  const occupied = occupiedRoutesBorderingIsle(snapshot, boardIsleId);
  const [sourceRouteId, setSourceRouteId] = useState<string>(occupied[0]?.routeId ?? "");
  const [destinationRouteId, setDestinationRouteId] = useState("");
  const [towardKey, setTowardKey] = useState("");
  const [rampageSeats, setRampageSeats] = useState<Record<string, string>>({});
  const sourceOccupancy = snapshot.routes.find((route) => route.routeId === sourceRouteId)?.occupancy;
  const isRaider = sourceOccupancy?.kind === "raider";
  const destDefinition = MARINER_ROUTE_CATALOG.find((route) => route.routeId === destinationRouteId);
  const destEndpoints = destDefinition === undefined ? [] : [destDefinition.endpointA, destDefinition.endpointB];
  const toward = destEndpoints.find((endpoint) => endpointKey(endpoint) === towardKey) ?? destEndpoints[0];
  const placementOccupancy: MarinerRouteOccupancy | null =
    sourceOccupancy?.kind === "ship"
      ? { kind: "ship" }
      : sourceOccupancy?.kind === "raider" && toward !== undefined
        ? { kind: "raider", toward }
        : null;
  const predictedBeastIds = destinationRouteId === "" || placementOccupancy === null
    ? []
    : predictedNewlyTrappedBeastIdsAfterShipPlacement(
        snapshot,
        destinationRouteId,
        placementOccupancy,
        sourceRouteId,
      );
  return (
    <div className="rounded-lg border border-teal-200 dark:border-teal-900 p-3 space-y-2">
      <h4 className="text-sm font-medium">{MOVE_SHIP_LABEL}</h4>
      <label className="text-sm block">
        Source Route
        <select aria-label="Ship source Route" className={`${fieldClass} mt-1`} value={sourceRouteId} onChange={(e) => setSourceRouteId(e.target.value)}>
          {occupied.length === 0 && <option value="">No occupied Route borders this Isle</option>}
          {occupied.map((route) => (
            <option key={route.routeId} value={route.routeId}>
              {routeEndpointLabel(route.endpointA, mariner, world.isles)} — {routeEndpointLabel(route.endpointB, mariner, world.isles)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm block">
        Destination Route
        <select aria-label="Ship destination Route" className={`${fieldClass} mt-1`} value={destinationRouteId} onChange={(e) => {
          setDestinationRouteId(e.target.value);
          setTowardKey("");
          setRampageSeats({});
        }}>
          <option value="">Select any other Route…</option>
          {MARINER_ROUTE_CATALOG.filter((route) => route.routeId !== sourceRouteId).map((route) => (
            <option key={route.routeId} value={route.routeId}>
              {routeEndpointLabel(route.endpointA, mariner, world.isles)} — {routeEndpointLabel(route.endpointB, mariner, world.isles)}
            </option>
          ))}
        </select>
      </label>
      {isRaider && (
        <label className="text-sm block">
          Raids toward
          <select aria-label="Ship Raider toward" className={`${fieldClass} mt-1`} value={towardKey} onChange={(e) => setTowardKey(e.target.value)}>
            <option value="">{destDefinition === undefined ? "Select destination Route first…" : "Select destination endpoint…"}</option>
            {destEndpoints.map((endpoint) => (
              <option key={endpointKey(endpoint)} value={endpointKey(endpoint)}>
                {routeEndpointLabel(endpoint, mariner, world.isles)}
              </option>
            ))}
          </select>
        </label>
      )}
      {predictedBeastIds.map((denizenId) => (
        <label key={denizenId} className="text-sm block">
          Rampage destination
          <select
            aria-label={predictedBeastIds.length === 1 ? "Rampage destination" : `Rampage destination for ${denizenId}`}
            className={`${fieldClass} mt-1`}
            value={rampageSeats[denizenId] ?? ""}
            onChange={(e) => setRampageSeats((current) => ({ ...current, [denizenId]: e.target.value }))}
          >
            <option value="">Select destination Domain…</option>
            {otherDomainSeatOptions().map((seatId) => (
              <option key={seatId} value={seatId}>{pactSeatDisplayName(seatId)}</option>
            ))}
          </select>
        </label>
      ))}
      <div className="flex gap-2">
        <button
          className={btnClass}
          disabled={
            pending
            || sourceRouteId === ""
            || destinationRouteId === ""
            || (isRaider && towardKey === "")
            || predictedBeastIds.some((denizenId) => (rampageSeats[denizenId] ?? "") === "")
          }
          onClick={() => {
            const expected = expectedForMoveShip(snapshot, sourceRouteId, destinationRouteId);
            const chosenToward = destEndpoints.find((endpoint) => endpointKey(endpoint) === towardKey) ?? null;
            void onSubmit(buildMoveMarinerShipPayload({
              commandId: newCommandId(),
              expectedCampaignId: campaignId,
              sourceIsleId: boardIsleId,
              sourceRouteId,
              destinationRouteId,
              destinationToward: isRaider ? chosenToward : null,
              ...expected,
              rampageResolutions: predictedBeastIds.map((denizenId) => ({
                denizenId,
                destinationSeatId: rampageSeats[denizenId],
                rampagingMethodEntryId: stableMethodId(methodIds, denizenId),
              })),
            })).then((ok) => {
              if (ok) onCancel();
            });
          }}
        >
          {MOVE_SHIP_LABEL}
        </button>
        <button className={ghostBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function RecordRavageForm({
  boardIsleId,
  mariner,
  world,
  campaignId,
  pending,
  onCancel,
  onSubmit,
  onRecorded,
}: {
  boardIsleId: MarinerBoardIsleId;
  mariner: MarinerState;
  world: WorldReference;
  campaignId: string;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (payload: ReturnType<typeof buildRecordMarinerRavageResultPayload>) => Promise<boolean>;
  onRecorded: (outcome: "market_absorbed" | "isle_ravaged") => void;
}) {
  const [snapshot] = useState(() => captureOperabilityBoard(mariner));
  const [denizenSnapshot] = useState(() => world.denizens.map((denizen) => ({
    denizenId: denizen.denizenId,
    powerfulProfile: denizen.powerfulProfile ?? null,
  })));
  const [methodEntryId] = useState(() => newMethodEntryId());
  const expected = expectedForRavageResult(snapshot, boardIsleId, denizenSnapshot);
  const [rampageSeat, setRampageSeat] = useState("");
  const needsRampage = expected.expectedNestingBeast !== null;
  const outcome: "market_absorbed" | "isle_ravaged" = expected.expectedMarket.present ? "market_absorbed" : "isle_ravaged";
  return (
    <div className="rounded-lg border border-teal-200 dark:border-teal-900 p-3 space-y-2">
      <h4 className="text-sm font-medium">{RAVAGE_RESULT_LABEL}</h4>
      <p className="text-xs text-slate-500">
        Records the supported board result after the table decides this Isle would be Ravaged. This does not resolve the source Ravage procedure.
      </p>
      {needsRampage && (
        <label className="text-sm block">
          Nesting Beast Rampage destination
          <select aria-label="Ravage Rampage destination" className={`${fieldClass} mt-1`} value={rampageSeat} onChange={(e) => setRampageSeat(e.target.value)}>
            <option value="">Select destination Domain…</option>
            {otherDomainSeatOptions().map((seatId) => (
              <option key={seatId} value={seatId}>{pactSeatDisplayName(seatId)}</option>
            ))}
          </select>
        </label>
      )}
      <div className="flex gap-2">
        <button
          className={btnClass}
          disabled={pending || (needsRampage && rampageSeat === "")}
          onClick={() => {
            void onSubmit(buildRecordMarinerRavageResultPayload({
              commandId: newCommandId(),
              expectedCampaignId: campaignId,
              boardIsleId,
              ...expected,
              rampageDestinationSeatId: needsRampage ? rampageSeat as PactSeatId : null,
              rampagingMethodEntryId: needsRampage ? methodEntryId : null,
            })).then((ok) => {
              if (ok) onRecorded(outcome);
            });
          }}
        >
          {RAVAGE_RESULT_LABEL}
        </button>
        <button className={ghostBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function IsleLoreSection({
  boardIsleId,
  worldIsleId,
  loreCompendium,
  pactSeatStatuses,
  campaignId,
}: {
  boardIsleId: MarinerBoardIsleId;
  worldIsleId: IsleId;
  loreCompendium: LoreCompendiumUiState;
  pactSeatStatuses: Partial<Record<PactSeatId, PactSeatStatus | null>>;
  campaignId: string;
}) {
  const selection = marinerIsleLoreSelection(boardIsleId, pactSeatStatuses);
  if (selection.kind === "no_automatic_context" || selection.kind === "no_status_decision") {
    return <p className="text-sm text-slate-600 dark:text-slate-300">{NO_LORE_CONTEXT_COPY}</p>;
  }
  if (loreCompendium.status !== "ready") {
    return null;
  }
  const subject = findPresentationSubjectByRef(loreCompendium.presentation, { kind: "isle", isleId: worldIsleId });
  if (subject === undefined) {
    return null;
  }
  return (
    <LoreContextPanel
      subject={subject}
      campaignId={campaignId}
      compact
      contextConstraint={{ kind: "source", sourceCollectionId: selection.sourceCollectionId }}
    />
  );
}

function LawsPanel({
  mariner,
  lawDraft,
  setLawDraft,
  pending,
  onSave,
}: {
  mariner: MarinerState;
  lawDraft: string[];
  setLawDraft: (ids: string[]) => void;
  pending: boolean;
  onSave: () => void;
}) {
  function toggle(id: string): void {
    setLawDraft(lawDraft.includes(id) ? lawDraft.filter((x) => x !== id) : [...lawDraft, id]);
  }
  return (
    <section className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
      <h3 className="text-sm font-semibold">Laws of the Sea</h3>
      <p className="text-xs text-slate-500">After initialization any number of unique Laws may be selected. Order is preserved as listed here.</p>
      {MARINER_LAW_OPTIONS.map((law) => (
        <label key={law.id} className="flex gap-2 text-sm items-start">
          <input type="checkbox" checked={lawDraft.includes(law.id)} onChange={() => toggle(law.id)} />
          <span>
            <span className="font-medium">{law.applicationLabel}</span>
            <span className="block text-slate-500">{law.text}</span>
          </span>
        </label>
      ))}
      <button className={btnClass} disabled={pending} onClick={onSave}>Save Laws</button>
    </section>
  );
}

function BeastPanel({
  mariner,
  world,
  unusedDenizens,
  pending,
  confirmRemove,
  setConfirmRemove,
  onAdd,
  onUpdate,
  onRemove,
}: {
  mariner: MarinerState;
  world: WorldReference;
  unusedDenizens: ReturnType<typeof availableIndividualBeastDenizens>;
  pending: boolean;
  confirmRemove: MarinerBeastState | null;
  setConfirmRemove: (beast: MarinerBeastState | null) => void;
  onAdd: (beast: MarinerBeastState) => Promise<boolean>;
  onUpdate: (
    baseline: MarinerBeastState,
    next: Pick<MarinerBeastState, "element" | "definitionId" | "condition" | "location">,
  ) => Promise<boolean>;
  onRemove: (expectedBeast: MarinerBeastState) => Promise<boolean>;
}) {
  const [addDenizenId, setAddDenizenId] = useState("");
  const [addElement, setAddElement] = useState<ElementId>("air");
  const [addDefinitionId, setAddDefinitionId] = useState("");
  const [addCondition, setAddCondition] = useState<MarinerBeastCondition>("distrusting");
  const [addLocation, setAddLocation] = useState<MarinerBeastLocation>(defaultBeastLocation());
  const [beastEditor, setBeastEditor] = useState<MarinerBeastState | null>(null);

  return (
    <section className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3">
      <h3 className="text-sm font-semibold">Beasts</h3>
      {mariner.beasts.length === 0 ? (
        <p className="text-sm text-slate-500">No Mariner Beasts.</p>
      ) : (
        <ul className="space-y-3">
          {mariner.beasts.map((beast) => (
            <li key={beast.denizenId} className="rounded border border-slate-200 dark:border-slate-700 p-2 space-y-2">
              <div className="text-sm">
                <strong>{denizenName(world.denizens, beast.denizenId)}</strong>
                {" · "}{beast.element}
                {builtinBeastName(beast.definitionId) ? ` · ${builtinBeastName(beast.definitionId)}` : " · custom"}
                {" · "}{conditionLabel(beast.condition)}
                {" · Status "}{denizenSharedStatusLabel(world.denizens.find((denizen) => denizen.denizenId === beast.denizenId))}
                {" · "}{beastLocationLabel(beast.location, mariner, world.isles)}
              </div>
              {beastEditor !== null && beastEditor.denizenId === beast.denizenId ? (
                <BeastEditor
                  initial={beastEditor}
                  pending={pending}
                  hasRampagingMethod={denizenHasRampagingMethod(world.denizens.find((denizen) => denizen.denizenId === beast.denizenId))}
                  onCancel={() => setBeastEditor(null)}
                  onSave={async (next) => {
                    const ok = await onUpdate(beastEditor, next);
                    if (ok) setBeastEditor(null);
                  }}
                />
              ) : (
                <div className="flex gap-2">
                  <button className={ghostBtn} onClick={() => setBeastEditor(snapshotBeast(beast))}>Edit Beast</button>
                  {confirmRemove !== null && confirmRemove.denizenId === beast.denizenId ? (
                    <>
                      <button className={btnClass} disabled={pending} onClick={() => void onRemove(confirmRemove)}>Confirm remove</button>
                      <button className={ghostBtn} onClick={() => setConfirmRemove(null)}>Cancel</button>
                    </>
                  ) : (
                    <button className={ghostBtn} onClick={() => setConfirmRemove(snapshotBeast(beast))}>Remove Beast</button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
        <h4 className="text-sm font-medium">Add Beast</h4>
        <p className="text-xs text-slate-500">Select an existing individual World Denizen. This does not create or delete World Denizens.</p>
        <label className="text-sm block">
          Denizen
          <select aria-label="Add Beast Denizen" className={`${fieldClass} mt-1`} value={addDenizenId} onChange={(e) => setAddDenizenId(e.target.value)}>
            <option value="">Select Denizen with Beast profile…</option>
            {unusedDenizens.map((denizen) => (
              <option key={denizen.denizenId} value={denizen.denizenId}>{denizen.name}</option>
            ))}
          </select>
          {unusedDenizens.length === 0 && (
            <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
              Configure a shared Powerful profile with Beast taxonomy and an explicit Status in World first.
            </p>
          )}
        </label>
        <BeastFields
          element={addElement}
          definitionId={addDefinitionId}
          condition={addCondition}
          location={addLocation}
          hasRampagingMethod={denizenHasRampagingMethod(unusedDenizens.find((denizen) => denizen.denizenId === addDenizenId) ?? world.denizens.find((denizen) => denizen.denizenId === addDenizenId))}
          onElement={setAddElement}
          onDefinition={setAddDefinitionId}
          onCondition={setAddCondition}
          onLocation={setAddLocation}
        />
        <button
          className={btnClass}
          disabled={pending || addDenizenId === "" || (addCondition === "rampaging" && !denizenHasRampagingMethod(unusedDenizens.find((denizen) => denizen.denizenId === addDenizenId) ?? world.denizens.find((denizen) => denizen.denizenId === addDenizenId)))}
          onClick={() => {
            void (async () => {
              const ok = await onAdd({
                denizenId: addDenizenId as MarinerBeastState["denizenId"],
                element: addElement,
                definitionId: addDefinitionId === "" ? null : addDefinitionId as NonNullable<MarinerBeastState["definitionId"]>,
                condition: addCondition,
                location: addLocation,
              });
              if (ok) setAddDenizenId("");
            })();
          }}
        >
          Add Beast
        </button>
      </div>
    </section>
  );
}

function BeastEditor({
  initial,
  pending,
  hasRampagingMethod,
  onCancel,
  onSave,
}: {
  initial: MarinerBeastState;
  pending: boolean;
  hasRampagingMethod: boolean;
  onCancel: () => void;
  onSave: (next: Pick<MarinerBeastState, "element" | "definitionId" | "condition" | "location">) => void | Promise<void>;
}) {
  const [element, setElement] = useState<ElementId>(initial.element);
  const [definitionId, setDefinitionId] = useState(initial.definitionId ?? "");
  const [condition, setCondition] = useState<MarinerBeastCondition>(initial.condition);
  const [location, setLocation] = useState<MarinerBeastLocation>(initial.location);
  return (
    <div className="space-y-2">
      <BeastFields
        element={element}
        definitionId={definitionId}
        condition={condition}
        location={location}
        hasRampagingMethod={hasRampagingMethod}
        onElement={setElement}
        onDefinition={setDefinitionId}
        onCondition={setCondition}
        onLocation={setLocation}
      />
      <div className="flex gap-2">
        <button
          className={btnClass}
          disabled={pending || (condition === "rampaging" && !hasRampagingMethod)}
          onClick={() => {
            void onSave({
              element,
              definitionId: definitionId === "" ? null : definitionId as NonNullable<MarinerBeastState["definitionId"]>,
              condition,
              location,
            });
          }}
        >
          Save Beast
        </button>
        <button className={ghostBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function BeastFields({
  element,
  definitionId,
  condition,
  location,
  hasRampagingMethod = false,
  onElement,
  onDefinition,
  onCondition,
  onLocation,
}: {
  element: ElementId;
  definitionId: string;
  condition: MarinerBeastCondition;
  location: MarinerBeastLocation;
  hasRampagingMethod?: boolean;
  onElement: (value: ElementId) => void;
  onDefinition: (value: string) => void;
  onCondition: (value: MarinerBeastCondition) => void;
  onLocation: (value: MarinerBeastLocation) => void;
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      <label className="text-sm">
        Element
        <select
          aria-label="Beast Element"
          className={`${fieldClass} mt-1`}
          value={element}
          onChange={(e) => {
            const next = e.target.value as ElementId;
            onElement(next);
            if (definitionId !== "" && builtinBeastElement(definitionId) !== next) onDefinition("");
          }}
        >
          {MARINER_ELEMENTS.map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
      </label>
      <label className="text-sm">
        Built-in definition
        <select
          aria-label="Beast definition"
          className={`${fieldClass} mt-1`}
          value={definitionId}
          onChange={(e) => {
            const next = e.target.value;
            onDefinition(next);
            const matched = builtinBeastElement(next);
            if (matched !== null) onElement(matched);
          }}
        >
          <option value="">Custom Beast</option>
          {definitionsMatchingElement(element).map((definition) => (
            <option key={definition.id} value={definition.id}>{definition.name}</option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Condition
        <select aria-label="Beast condition" className={`${fieldClass} mt-1`} value={condition} onChange={(e) => onCondition(e.target.value as MarinerBeastCondition)}>
          <option value="distrusting">Distrusting</option>
          <option value="friendly_nesting">Friendly / Nesting</option>
          <option value="rampaging">Rampaging</option>
        </select>
        {condition === "rampaging" && !hasRampagingMethod && (
          <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
            Rampaging requires a standard Rampaging Method on the shared Powerful profile. Add it in World first. Beast condition is not shared Status.
          </p>
        )}
      </label>
      <LocationFields location={location} onChange={onLocation} />
    </div>
  );
}

function LocationFields({
  location,
  onChange,
}: {
  location: MarinerBeastLocation;
  onChange: (value: MarinerBeastLocation) => void;
}) {
  const kind = location.kind;
  return (
    <div className="sm:col-span-2 grid sm:grid-cols-2 gap-2">
      <label className="text-sm">
        Location
        <select
          aria-label="Beast location kind"
          className={`${fieldClass} mt-1`}
          value={kind}
          onChange={(e) => {
            const next = e.target.value;
            if (next === "off_map") onChange({ kind: "off_map" });
            else if (next === "sea_region") onChange({ kind: "sea_region", regionId: "sunken_fleet" });
            else if (next === "board_isle") onChange({ kind: "board_isle", boardIsleId: "ishana" });
            else onChange({ kind: "other_domain", seatId: otherDomainSeatOptions()[0] ?? "hierophant" });
          }}
        >
          <option value="sea_region">Sea / Horizon</option>
          <option value="board_isle">Board Isle</option>
          <option value="other_domain">Other Domain</option>
          <option value="off_map">Beyond Isha</option>
        </select>
      </label>
      {kind === "sea_region" && (
        <label className="text-sm">
          Region
          <select
            aria-label="Beast sea region"
            className={`${fieldClass} mt-1`}
            value={location.regionId}
            onChange={(e) => onChange({ kind: "sea_region", regionId: e.target.value as MarinerSeaRegionId })}
          >
            {MARINER_SEA_REGION_CATALOG.map((region) => (
              <option key={region.regionId} value={region.regionId}>{region.displayName}</option>
            ))}
          </select>
        </label>
      )}
      {kind === "board_isle" && (
        <label className="text-sm">
          Isle
          <select
            aria-label="Beast board Isle"
            className={`${fieldClass} mt-1`}
            value={location.boardIsleId}
            onChange={(e) => onChange({ kind: "board_isle", boardIsleId: e.target.value as MarinerBoardIsleId })}
          >
            {MARINER_BOARD_SLOTS.map((slot) => (
              <option key={slot.boardIsleId} value={slot.boardIsleId}>{slot.displayName}</option>
            ))}
          </select>
        </label>
      )}
      {kind === "other_domain" && (
        <label className="text-sm">
          Pact seat
          <select
            aria-label="Beast other Domain"
            className={`${fieldClass} mt-1`}
            value={location.seatId}
            onChange={(e) => onChange({ kind: "other_domain", seatId: e.target.value as PactSeatId })}
          >
            {otherDomainSeatOptions().map((seatId) => (
              <option key={seatId} value={seatId}>{pactSeatDisplayName(seatId)}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
