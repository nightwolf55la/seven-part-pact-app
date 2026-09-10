import { useEffect, useLayoutEffect, useState, type KeyboardEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api.js";
import {
  MARINER_BOARD_ISLE_IDS,
  pactSeatDisplayName,
  type ElementId,
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
} from "../shared/domain";
import type { WorldReference } from "./WorldSurface";
import {
  MARINER_ARRANGEMENT_OPTIONS,
  MARINER_BEAST_DEFINITIONS,
  MARINER_BOARD_ISLE_MAP_POINTS,
  MARINER_BOARD_SLOTS,
  MARINER_ELEMENTS,
  MARINER_EXTERNAL_LAND_MAP_POINTS,
  MARINER_LAW_OPTIONS,
  MARINER_MAP_VIEWBOX,
  MARINER_ROUTE_CATALOG,
  MARINER_SEA_REGION_CATALOG,
  MARINER_SEA_REGION_MAP_POINTS,
  arrangementNeedsRarity,
  arrangementNeedsStartingBeast,
  arrangementSetupSummary,
  availableIndividualBeastDenizens,
  availableMobileShipPlaces,
  beastLocationLabel,
  beastsInRegion,
  boardIsleDisplayName,
  boardIsleWorldName,
  buildAddMarinerBeastPayload,
  buildInitializeMarinerPayload,
  buildRemoveMarinerBeastPayload,
  buildSetMarinerIsleMarketPayload,
  buildSetMarinerIsleRavagePayload,
  buildSetMarinerRouteOccupancyPayload,
  buildSetMarinerSeaStormCountPayload,
  buildSetMarinerShipPayload,
  buildSetSelectedSeaLawsPayload,
  buildUpdateMarinerBeastFields,
  buildUpdateMarinerBeastPayload,
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
  marinerSetupReady,
  marketBeastConflict,
  nestingBeastsOnIsle,
  newCommandId,
  otherDomainSeatOptions,
  parseNonNegInt,
  placeName,
  routeEndpointLabel,
  routeOccupancyLabel,
  routePresentationPath,
  seaRegionDisplayName,
  seaRegionStateLabel,
  shipSanctumMismatch,
  uniqueSelectedLawIds,
  worldIsleName,
  worldIsleOptionsForSlot,
  type MarinerIsleBindings,
  type MarinerSetupDraft,
  type MarinerWizardRef,
} from "./mariner-view-model";

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
}: {
  mariner: MarinerState;
  world: WorldReference;
  campaignId: string;
  marinerWizard: MarinerWizardRef | null;
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
  const setMarinerShip = useMutation(api.m3Commands.setMarinerShip);
  const setSelectedSeaLaws = useMutation(api.m3Commands.setSelectedSeaLaws);
  const setMarinerRouteOccupancy = useMutation(api.m3Commands.setMarinerRouteOccupancy);
  const setMarinerSeaStormCount = useMutation(api.m3Commands.setMarinerSeaStormCount);
  const setMarinerIsleMarket = useMutation(api.m3Commands.setMarinerIsleMarket);
  const setMarinerIsleRavage = useMutation(api.m3Commands.setMarinerIsleRavage);
  const addMarinerBeast = useMutation(api.m3Commands.addMarinerBeast);
  const updateMarinerBeast = useMutation(api.m3Commands.updateMarinerBeast);
  const removeMarinerBeast = useMutation(api.m3Commands.removeMarinerBeast);

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
      />
    );
  }

  return (
    <div className="rounded-xl border border-teal-200 dark:border-teal-900 bg-white dark:bg-slate-900 p-4 space-y-4">
      <h2 className="text-lg font-semibold text-teal-900 dark:text-teal-100">Mariner</h2>
      {error !== null && (
        <div role="alert" className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
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
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 min-w-0 overflow-x-auto">
          <MarinerMap
            mariner={mariner}
            world={world}
            selection={selection}
            onSelect={setSelection}
          />
        </div>
        <div className="xl:col-span-2 min-w-0">
          <Inspector
            selection={selection}
            mariner={mariner}
            world={world}
            pending={pending}
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
        </div>
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
}) {
  const ready = marinerSetupReady(setup, world.places, wizard);
  const needsBeast = arrangementNeedsStartingBeast(setup.arrangementId);
  const needsRarity = arrangementNeedsRarity(setup.arrangementId);
  const mismatch = shipSanctumMismatch(setup.shipPlaceId, wizard);
  const lawCount = uniqueSelectedLawIds(setup.selectedLawIds).length;

  return (
    <div className="rounded-xl border border-teal-200 dark:border-teal-900 bg-white dark:bg-slate-900 p-4 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-teal-900 dark:text-teal-100">Initialize Mariner</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Bind the default sea map to existing World identities. The command constructs arrangement state; this form only gathers required choices.
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
      <section>
        <h3 className="text-sm font-semibold mb-2">15 World Isle bindings</h3>
        <p className="text-xs text-slate-500 mb-2">Each board slot binds an existing World Isle. Neutral board name remains Sage Atoll even if the World Isle is named differently. Do not create Isles here.</p>
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
      <section>
        <h3 className="text-sm font-semibold mb-2">Ship Place</h3>
        <p className="text-xs text-slate-500 mb-2">Choose an existing mobile World Place. Create another in World if none fits.</p>
        {wizard !== null && (
          <p className="text-sm mb-2">
            Mariner Wizard {wizard.name} Sanctum: {placeName(world.places, wizard.sanctumPlaceId)}.
            {mismatch
              ? " Initialization requires the chosen ship Place to equal that existing Sanctum. This form will not change the Wizard."
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
  const sanctumName = wizard === null ? "No Mariner Wizard" : placeName(world.places, wizard.sanctumPlaceId);
  const homeIsleName = wizard?.homeIsleId ? worldIsleName(world.isles, wizard.homeIsleId) : null;
  const same = wizard !== null && mariner.shipPlaceId !== null && wizard.sanctumPlaceId === mariner.shipPlaceId;

  return (
    <section className="rounded-lg border border-teal-100 dark:border-teal-900 p-3 space-y-2">
      <h3 className="text-sm font-semibold">Ship and Sanctum</h3>
      <p className="text-sm">Mariner personal Ship Place: <strong>{shipName}</strong></p>
      <p className="text-sm">Mariner Wizard: <strong>{wizard?.name ?? "Vacant Pact seat"}</strong></p>
      <p className="text-sm">Wizard Sanctum Place: <strong>{sanctumName}</strong></p>
      {homeIsleName !== null && <p className="text-sm">Wizard home Isle: <strong>{homeIsleName}</strong></p>}
      {wizard !== null && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {same
            ? "Ship and Sanctum are the same Place."
            : "Ship and Sanctum differ. This is allowed after initialization and is not treated as corruption."}
        </p>
      )}
      <p className="text-xs text-slate-500">Changing the Mariner ship does not change the Wizard Sanctum. Create another mobile Place in World if you need a destination that is not listed.</p>
      <div className="flex flex-wrap gap-2 items-end">
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
    </section>
  );
}

function MarinerMap({
  mariner,
  world,
  selection,
  onSelect,
}: {
  mariner: MarinerState;
  world: WorldReference;
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
}) {
  function activate(event: KeyboardEvent, action: () => void): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  }

  return (
    <svg
      viewBox={`0 0 ${MARINER_MAP_VIEWBOX.width} ${MARINER_MAP_VIEWBOX.height}`}
      className="w-full h-auto min-h-[28rem] bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800"
      role="img"
      aria-label="Mariner schematic map"
    >
      <defs>
        <marker id="raider-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="#b45309" />
        </marker>
      </defs>
      {MARINER_ROUTE_CATALOG.map((route) => {
        const path = routePresentationPath(route.routeId);
        if (path === null) return null;
        const occupancy = mariner.routes.find((entry) => entry.routeId === route.routeId)?.occupancy ?? { kind: "empty" as const };
        const selected = selection?.kind === "route" && selection.routeId === route.routeId;
        const d = path.control
          ? `M ${path.a.x} ${path.a.y} Q ${path.control.x} ${path.control.y} ${path.b.x} ${path.b.y}`
          : `M ${path.a.x} ${path.a.y} L ${path.b.x} ${path.b.y}`;
        const label = routeOccupancyLabel(occupancy, mariner, world.isles);
        const aName = routeEndpointLabel(route.endpointA, mariner, world.isles);
        const bName = routeEndpointLabel(route.endpointB, mariner, world.isles);
        const mid = path.control ?? { x: (path.a.x + path.b.x) / 2, y: (path.a.y + path.b.y) / 2 };
        const towardPoint = occupancy.kind === "raider" ? mapTowardPoint(path.a, path.b, occupancy.toward, route.endpointA, route.endpointB) : null;
        return (
          <g
            key={route.routeId}
            role="button"
            tabIndex={0}
            aria-label={`Route ${aName} to ${bName}: ${label}`}
            onClick={() => onSelect({ kind: "route", routeId: route.routeId })}
            onKeyDown={(event) => activate(event, () => onSelect({ kind: "route", routeId: route.routeId }))}
          >
            <path d={d} fill="none" stroke="transparent" strokeWidth={18} />
            <path
              d={d}
              fill="none"
              stroke={occupancy.kind === "empty" ? "#94a3b8" : occupancy.kind === "ship" ? "#0f766e" : "#b45309"}
              strokeWidth={occupancy.kind === "empty" ? 2 : 4}
              strokeDasharray={occupancy.kind === "empty" ? "6 5" : undefined}
              markerEnd={occupancy.kind === "raider" ? "url(#raider-arrow)" : undefined}
            />
            {selected && <path d={d} fill="none" stroke="#0f766e" strokeWidth={8} opacity={0.25} />}
            <text x={mid.x} y={mid.y - 8} textAnchor="middle" fontSize={11} fill="currentColor">
              {occupancy.kind === "empty" ? "" : occupancy.kind === "ship" ? "Ship" : `Raider → ${towardPoint?.label ?? ""}`}
            </text>
          </g>
        );
      })}
      {MARINER_SEA_REGION_CATALOG.map((region) => {
        const point = MARINER_SEA_REGION_MAP_POINTS[region.regionId];
        const stormCount = mariner.seaRegions.find((entry) => entry.regionId === region.regionId)?.stormCount ?? 0;
        const beasts = beastsInRegion(mariner.beasts, region.regionId);
        const selected = selection?.kind === "region" && selection.regionId === region.regionId;
        return (
          <g
            key={region.regionId}
            role="button"
            tabIndex={0}
            aria-label={`${region.kind === "horizon" ? "Horizon" : "Sea"} ${region.displayName}: ${seaRegionStateLabel(stormCount)}`}
            onClick={() => onSelect({ kind: "region", regionId: region.regionId })}
            onKeyDown={(event) => activate(event, () => onSelect({ kind: "region", regionId: region.regionId }))}
          >
            <circle cx={point.x} cy={point.y} r={22} fill={selected ? "#99f6e4" : region.kind === "horizon" ? "#e2e8f0" : "#ccfbf1"} stroke="#0f766e" />
            <text x={point.x} y={point.y - 4} textAnchor="middle" fontSize={10} fill="#0f172a">{region.displayName}</text>
            <text x={point.x} y={point.y + 10} textAnchor="middle" fontSize={10} fill="#134e4a">
              {seaRegionStateLabel(stormCount)}{beasts.length > 0 ? ` · Beast ${beasts.length}` : ""}
            </text>
          </g>
        );
      })}
      {MARINER_BOARD_ISLE_IDS.map((boardIsleId) => {
        const point = MARINER_BOARD_ISLE_MAP_POINTS[boardIsleId];
        const isle = mariner.boardIsles.find((entry) => entry.boardIsleId === boardIsleId);
        const worldName = boardIsleWorldName(mariner, world.isles, boardIsleId);
        const market = isle?.market.present === true;
        const rarity = isle?.market.present === true ? isle.market.rarity : null;
        const ravage = isle?.ravageStormCount ?? 0;
        const nested = nestingBeastsOnIsle(mariner.beasts, boardIsleId);
        const selected = selection?.kind === "isle" && selection.boardIsleId === boardIsleId;
        const bits = [
          market ? "Market" : null,
          rarity ? `Rarity ${rarity}` : null,
          ravage > 0 ? `Ravage ${ravage}` : null,
          nested.length > 0 ? "Nesting Beast" : null,
        ].filter((bit): bit is string => bit !== null);
        return (
          <g
            key={boardIsleId}
            role="button"
            tabIndex={0}
            aria-label={`Isle ${worldName}${bits.length > 0 ? `: ${bits.join(", ")}` : ""}`}
            onClick={() => onSelect({ kind: "isle", boardIsleId })}
            onKeyDown={(event) => activate(event, () => onSelect({ kind: "isle", boardIsleId }))}
          >
            <circle cx={point.x} cy={point.y} r={26} fill={selected ? "#5eead4" : "#f8fafc"} stroke="#0f766e" strokeWidth={2} />
            <text x={point.x} y={point.y - 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="#0f172a">{worldName}</text>
            <text x={point.x} y={point.y + 10} textAnchor="middle" fontSize={9} fill="#334155">
              {[market ? "Mkt" : null, rarity ? "Rar" : null, ravage > 0 ? `Rav ${ravage}` : null, nested.length > 0 ? "Beast" : null]
                .filter(Boolean)
                .join(" · ")}
            </text>
          </g>
        );
      })}
      {Object.entries(MARINER_EXTERNAL_LAND_MAP_POINTS).map(([externalLandId, point]) => (
        <g key={externalLandId}>
          <rect x={point.x - 28} y={point.y - 16} width={56} height={32} rx={4} fill="#fef3c7" stroke="#b45309" />
          <text x={point.x} y={point.y + 4} textAnchor="middle" fontSize={11} fill="#78350f">
            {externalLandDisplayName(externalLandId as keyof typeof MARINER_EXTERNAL_LAND_MAP_POINTS)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function mapTowardPoint(
  a: { x: number; y: number },
  b: { x: number; y: number },
  toward: MarinerRouteEndpoint,
  endpointA: MarinerRouteEndpoint,
  endpointB: MarinerRouteEndpoint,
): { label: string } {
  const towardA = endpointA.kind === toward.kind && (
    (toward.kind === "board_isle" && endpointA.kind === "board_isle" && toward.boardIsleId === endpointA.boardIsleId)
    || (toward.kind === "external_land" && endpointA.kind === "external_land" && toward.externalLandId === endpointA.externalLandId)
  );
  void a;
  void b;
  if (towardA) {
    return { label: endpointA.kind === "board_isle" ? boardIsleDisplayName(endpointA.boardIsleId) : externalLandDisplayName(endpointA.externalLandId) };
  }
  return { label: endpointB.kind === "board_isle" ? boardIsleDisplayName(endpointB.boardIsleId) : externalLandDisplayName(endpointB.externalLandId) };
}

function Inspector({
  selection,
  mariner,
  world,
  pending,
  onSubmitRoute,
  onSubmitStorm,
  onSubmitMarket,
  onSubmitRavage,
}: {
  selection: Selection | null;
  mariner: MarinerState;
  world: WorldReference;
  pending: boolean;
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
    return <RegionInspector regionId={selection.regionId} mariner={mariner} world={world} pending={pending} onSubmit={onSubmitStorm} />;
  }
  return (
    <IsleInspector
      boardIsleId={selection.boardIsleId}
      mariner={mariner}
      world={world}
      pending={pending}
      onSubmitMarket={onSubmitMarket}
      onSubmitRavage={onSubmitRavage}
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

function endpointKey(endpoint: { kind: string; boardIsleId?: string; externalLandId?: string }): string {
  return endpoint.kind === "board_isle" ? `board:${endpoint.boardIsleId}` : `land:${endpoint.externalLandId}`;
}

function RegionInspector({
  regionId,
  mariner,
  world,
  pending,
  onSubmit,
}: {
  regionId: MarinerSeaRegionId;
  mariner: MarinerState;
  world: WorldReference;
  pending: boolean;
  onSubmit: (regionId: MarinerSeaRegionId, stormCount: number) => void;
}) {
  const definition = MARINER_SEA_REGION_CATALOG.find((region) => region.regionId === regionId);
  const current = mariner.seaRegions.find((region) => region.regionId === regionId);
  const [storms, setStorms] = useState(String(current?.stormCount ?? 0));
  useEffect(() => {
    setStorms(String(current?.stormCount ?? 0));
  }, [regionId, current?.stormCount]);
  if (definition === undefined || current === undefined) {
    return <div className="text-sm text-slate-500">Unknown region.</div>;
  }
  const parsed = parseNonNegInt(storms);
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
    </section>
  );
}

function IsleInspector({
  boardIsleId,
  mariner,
  world,
  pending,
  onSubmitMarket,
  onSubmitRavage,
}: {
  boardIsleId: MarinerBoardIsleId;
  mariner: MarinerState;
  world: WorldReference;
  pending: boolean;
  onSubmitMarket: (boardIsleId: MarinerBoardIsleId, market: MarinerIsleMarket) => void;
  onSubmitRavage: (boardIsleId: MarinerBoardIsleId, ravageStormCount: number) => void;
}) {
  const current = mariner.boardIsles.find((isle) => isle.boardIsleId === boardIsleId);
  const [present, setPresent] = useState(current?.market.present === true);
  const [rarity, setRarity] = useState(current?.market.present === true ? current.market.rarity ?? "" : "");
  const [ravage, setRavage] = useState(String(current?.ravageStormCount ?? 0));
  useEffect(() => {
    setPresent(current?.market.present === true);
    setRarity(current?.market.present === true ? current.market.rarity ?? "" : "");
    setRavage(String(current?.ravageStormCount ?? 0));
  }, [boardIsleId, current]);
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
    </section>
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
