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
  type SorcererExternalPresence,
} from "../shared/domain";
import type { WorldReference } from "./WorldSurface";
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
  marinerDomainDisruptiveArcanists,
  marinerRouteGeometry,
  marinerSeaResearchers,
  marinerSetupReady,
  marketBeastConflict,
  nestingBeastsOnIsle,
  newCommandId,
  otherDomainSeatOptions,
  parseNonNegInt,
  placeName,
  raiderDirectionDeg,
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
  type MarinerIsleBindings,
  type MarinerSetupDraft,
  type MarinerWizardRef,
} from "./mariner-view-model";
import {
  MARINER_DOMAIN_PRESENCE_ANCHOR,
  MARINER_EXTERNAL_LAND_GEOMETRY,
  MARINER_ISLE_GEOMETRY,
  MARINER_MAP_FRAME,
  MARINER_MAP_MIN_WIDTH_PX,
  MARINER_MAP_VIEWBOX,
  MARINER_ROUTE_HIT_STROKE_WIDTH,
  MARINER_SEA_GEOMETRY,
} from "./mariner-map-geometry";

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
}: {
  mariner: MarinerState;
  world: WorldReference;
  campaignId: string;
  marinerWizard: MarinerWizardRef | null;
  sorcererPresence?: readonly SorcererExternalPresence[];
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
            sorcererPresence={sorcererPresence}
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

const FOCUS_CLASS = "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 dark:focus-visible:outline-teal-200";

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
    <div data-mariner-board-scroll className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-sky-50 dark:bg-slate-950">
      <svg
        viewBox={`0 0 ${MARINER_MAP_VIEWBOX.width} ${MARINER_MAP_VIEWBOX.height}`}
        className="h-auto w-full text-slate-800 dark:text-slate-100"
        style={{ minWidth: MARINER_MAP_MIN_WIDTH_PX }}
        role="img"
        aria-label="Archipelago of Isha map"
        data-mariner-board
        data-min-width={MARINER_MAP_MIN_WIDTH_PX}
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
        </defs>
        <g data-map-layer="frame" pointerEvents="none">
          <circle cx={MARINER_MAP_FRAME.cx} cy={MARINER_MAP_FRAME.cy} r={MARINER_MAP_FRAME.r + 8} fill="#dbeafe" />
          <circle cx={MARINER_MAP_FRAME.cx} cy={MARINER_MAP_FRAME.cy} r={MARINER_MAP_FRAME.r} fill="#bfdbfe" stroke="#1e3a5f" strokeWidth={3} />
        </g>
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
              aria-selected={selected}
              aria-label={`${kind} ${name}: ${seaRegionStateLabel(stormCount)}`}
              className={FOCUS_CLASS}
              onClick={() => onSelect({ kind: "region", regionId: sea.regionId })}
              onKeyDown={(event) => activate(event, () => onSelect({ kind: "region", regionId: sea.regionId }))}
            >
              <path d={sea.hitPath} fill={selected ? "#99f6e4" : definition?.kind === "horizon" ? "#e2e8f0" : "#7dd3fc"} fillOpacity={selected ? 0.55 : 0.22} stroke={selected ? "#0f766e" : "transparent"} strokeWidth={selected ? 3 : 0} strokeDasharray={selected ? "5 3" : undefined} />
            </g>
          );
        })}
        <g data-map-layer="routes-visible" pointerEvents="none">
          {MARINER_ROUTE_CATALOG.map((route) => {
            const geometry = marinerRouteGeometry(route.routeId);
            if (geometry === null) return null;
            const occupancy = mariner.routes.find((entry) => entry.routeId === route.routeId)?.occupancy ?? { kind: "empty" as const };
            const selected = selection?.kind === "route" && selection.routeId === route.routeId;
            return (
              <path
                key={`visible-${route.routeId}`}
                d={geometry.pathD}
                fill="none"
                stroke={occupancy.kind === "empty" ? "#64748b" : occupancy.kind === "ship" ? "#0f766e" : "#9a3412"}
                strokeWidth={selected ? 5 : occupancy.kind === "empty" ? 2 : 3.5}
                strokeDasharray={occupancy.kind === "empty" ? "6 5" : undefined}
              />
            );
          })}
        </g>
        {MARINER_ROUTE_CATALOG.map((route) => {
          const geometry = marinerRouteGeometry(route.routeId);
          if (geometry === null) return null;
          const occupancy = mariner.routes.find((entry) => entry.routeId === route.routeId)?.occupancy ?? { kind: "empty" as const };
          const selected = selection?.kind === "route" && selection.routeId === route.routeId;
          const label = routeOccupancyLabel(occupancy, mariner, world.isles);
          const aName = routeEndpointLabel(route.endpointA, mariner, world.isles);
          const bName = routeEndpointLabel(route.endpointB, mariner, world.isles);
          return (
            <g
              key={`hit-${route.routeId}`}
              data-map-layer="route-hit"
              data-route-id={route.routeId}
              role="button"
              tabIndex={0}
              aria-selected={selected}
              aria-label={`Route ${aName} to ${bName}: ${label}`}
              className={FOCUS_CLASS}
              onClick={() => onSelect({ kind: "route", routeId: route.routeId })}
              onKeyDown={(event) => activate(event, () => onSelect({ kind: "route", routeId: route.routeId }))}
            >
              <path d={geometry.pathD} fill="none" stroke="transparent" strokeWidth={MARINER_ROUTE_HIT_STROKE_WIDTH} />
              {selected && <path d={geometry.pathD} fill="none" stroke="#0f766e" strokeWidth={8} opacity={0.28} strokeDasharray="4 3" />}
            </g>
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
          return (
            <g
              key={isle.boardIsleId}
              data-map-layer="isle"
              data-isle-id={isle.boardIsleId}
              role="button"
              tabIndex={0}
              aria-selected={selected}
              aria-label={`Isle ${worldName}${bits.length > 0 ? `: ${bits.join(", ")}` : ""}`}
              className={FOCUS_CLASS}
              onClick={() => onSelect({ kind: "isle", boardIsleId: isle.boardIsleId })}
              onKeyDown={(event) => activate(event, () => onSelect({ kind: "isle", boardIsleId: isle.boardIsleId }))}
            >
              <ellipse cx={isle.hit.cx} cy={isle.hit.cy} rx={isle.hit.rx} ry={isle.hit.ry} fill="transparent" />
              {isle.shapes.map((shape, index) => (
                <ellipse
                  key={`${isle.boardIsleId}-shape-${index}`}
                  cx={shape.cx}
                  cy={shape.cy}
                  rx={shape.rx}
                  ry={shape.ry}
                  transform={shape.rotate ? `rotate(${shape.rotate} ${shape.cx} ${shape.cy})` : undefined}
                  fill={ravage > 0 ? "url(#mariner-ravage-hatch)" : selected ? "#5eead4" : "#f8fafc"}
                  stroke={selected ? "#0f766e" : "#115e59"}
                  strokeWidth={selected ? 3 : 1.5}
                  strokeDasharray={selected ? "4 2" : undefined}
                  pointerEvents="none"
                />
              ))}
            </g>
          );
        })}
        <g data-map-layer="labels" pointerEvents="none">
          {MARINER_EXTERNAL_LAND_GEOMETRY.map((land) => (
            <g key={land.externalLandId} data-external-land={land.externalLandId}>
              <path d={land.pathD} fill="#fef3c7" stroke="#b45309" />
              <text x={land.label.x} y={land.label.y + 4} textAnchor="middle" fontSize={11} fill="#78350f">
                {externalLandDisplayName(land.externalLandId)}
              </text>
            </g>
          ))}
          {MARINER_SEA_GEOMETRY.map((sea) => {
            const definition = MARINER_SEA_REGION_CATALOG.find((region) => region.regionId === sea.regionId);
            return (
              <text key={`label-${sea.regionId}`} x={sea.label.x} y={sea.label.y + 3} textAnchor="middle" fontSize={9} fill="#0f172a">
                {definition?.displayName ?? sea.regionId}
              </text>
            );
          })}
          {MARINER_ISLE_GEOMETRY.map((isle) => (
            <text key={`label-${isle.boardIsleId}`} x={isle.label.x} y={isle.label.y + 3} textAnchor="middle" fontSize={11} fontWeight={600} fill="#0f172a">
              {boardIsleWorldName(mariner, world.isles, isle.boardIsleId)}
            </text>
          ))}
        </g>
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
                    data-typhoon={storms.typhoon ? "true" : "false"}
                    aria-label={storms.accessibleCount}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect({ kind: "region", regionId: sea.regionId });
                    }}
                  >
                    {Array.from({ length: storms.tokenCount }, (_, index) => (
                      <g key={index} transform={`translate(${sea.slots.storm.x + index * 7} ${sea.slots.storm.y - index * 6})`}>
                        <path d="M -10 4 Q -4 -10 4 -6 Q 10 -2 8 6 Q 0 10 -10 4 Z" fill={storms.typhoon ? "#1e293b" : "#334155"} stroke="#0f172a" />
                        {storms.typhoon && index === 0 && (
                          <text x={0} y={18} textAnchor="middle" fontSize={8} fill="#0f172a">Typhoon</text>
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
          {MARINER_ROUTE_CATALOG.map((route) => {
            const geometry = marinerRouteGeometry(route.routeId);
            const occupancy = mariner.routes.find((entry) => entry.routeId === route.routeId)?.occupancy ?? { kind: "empty" as const };
            if (geometry === null || occupancy.kind === "empty") return null;
            if (occupancy.kind === "ship") {
              return (
                <g
                  key={`ship-${route.routeId}`}
                  data-piece="ship"
                  data-route-id={route.routeId}
                  aria-label="Ship"
                  transform={`translate(${geometry.pieceAnchor.x} ${geometry.pieceAnchor.y}) rotate(${geometry.tangentDeg})`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect({ kind: "route", routeId: route.routeId });
                  }}
                >
                  <path d="M -14 4 L -8 -6 L 10 -6 L 16 4 Z" fill="#0f766e" stroke="#042f2e" />
                  <rect x={-2} y={-12} width={5} height={7} fill="#134e4a" />
                  <text x={0} y={16} textAnchor="middle" fontSize={8} fill="#0f766e" transform={`rotate(${-geometry.tangentDeg})`}>Ship</text>
                </g>
              );
            }
            const heading = raiderDirectionDeg(route.routeId, occupancy.toward);
            return (
              <g
                key={`raider-${route.routeId}`}
                data-piece="raider"
                data-route-id={route.routeId}
                data-raider-toward={occupancy.toward.kind === "board_isle" ? occupancy.toward.boardIsleId : occupancy.toward.externalLandId}
                aria-label={`Raider toward ${towardLabel(occupancy.toward)}`}
                transform={`translate(${geometry.pieceAnchor.x} ${geometry.pieceAnchor.y}) rotate(${heading})`}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect({ kind: "route", routeId: route.routeId });
                }}
              >
                <path d="M -12 5 L -6 -5 L 8 -5 L 14 5 Z" fill="#7f1d1d" stroke="#450a0a" />
                <polygon points="16,0 28,-7 28,7" fill="#b45309" stroke="#7c2d12" />
                <text x={4} y={18} textAnchor="middle" fontSize={8} fill="#7c2d12" transform={`rotate(${-heading})`}>
                  {`Raider → ${towardLabel(occupancy.toward)}`}
                </text>
              </g>
            );
          })}
          {MARINER_ISLE_GEOMETRY.map((isle) => {
            const current = mariner.boardIsles.find((entry) => entry.boardIsleId === isle.boardIsleId);
            const market = current?.market.present === true;
            const ravage = current?.ravageStormCount ?? 0;
            const beasts = beastsOnIsle(mariner.beasts, isle.boardIsleId);
            return (
              <g key={`isle-pieces-${isle.boardIsleId}`}>
                {market && (
                  <g
                    data-piece="market"
                    data-isle-id={isle.boardIsleId}
                    aria-label="Market"
                    transform={`translate(${isle.slots.market.x} ${isle.slots.market.y})`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect({ kind: "isle", boardIsleId: isle.boardIsleId });
                    }}
                  >
                    <rect x={-8} y={-6} width={16} height={12} fill="#b45309" stroke="#78350f" />
                    <path d="M -10 -6 L 0 -14 L 10 -6" fill="#f59e0b" stroke="#78350f" />
                    <text x={0} y={16} textAnchor="middle" fontSize={8} fill="#78350f">Market</text>
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
      </svg>
    </div>
  );
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
