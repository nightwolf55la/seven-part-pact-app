import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api.js";
import CampaignTools from "./CampaignTools";
import CurrentPhaseSurface from "./CurrentPhaseSurface";
import OrreryView from "./OrreryView";
import TableWizards from "./TableWizards";
import WorldSurface from "./WorldSurface";
import HierophantSurface from "./HierophantSurface";
import MarinerSurface from "./MarinerSurface";
import type { MarinerWizardRef } from "./MarinerSurface";
import NecromancerSurface from "./NecromancerSurface";
import type { NecromancerWizardRef } from "./NecromancerSurface";
import FaustianSurface from "./FaustianSurface";
import type { FaustianWizardRef } from "./FaustianSurface";
import LoreSurface from "./LoreSurface";
import SorcererSurface from "./SorcererSurface";
import { loreCompendiumUiStateFromQuery } from "./lore-view-model";
import {
  initPlaySurface,
  navigateSurface,
  goBack,
  goForward,
  canGoBack,
  canGoForward,
  promoteSecondary,
  toggleSecondary,
} from "./play-surface-model";
import type { PlaySurfaceState, SurfaceId, PaneLabel } from "./play-surface-model";
import { playShellWidthMode } from "./play-shell-layout";
import { PACT_SEAT_IDS, type LunarPhase, type PactSeatId, type PactSeatStatus } from "../shared/domain";
import { orreryResearcherMarkersFromSorcererQuery } from "./orrery-view-model";
import type { SorcererOrreryHouseMarkerPresentation } from "../shared/domain/sorcerer-presentation";

const PHASE_DISPLAY: Record<LunarPhase, string> = {
  new_moon: "New Moon",
  visions: "Visions",
  planning: "Planning",
  story: "Story",
  meeting: "Meeting",
  quiet: "Quiet",
};

const SURFACE_LABELS: Record<SurfaceId, string> = {
  current_phase: "Current Phase",
  orrery: "Orrery",
  table_wizards: "Table / Wizards",
  world: "World",
  hierophant: "Hierophant",
  mariner: "Mariner",
  necromancer: "Necromancer",
  faustian: "Faustian",
  compendium: "Compendium",
  sorcerer: "Sorcerer",
};

function renderSurface(
  surface: SurfaceId,
  ref: { campaignId: string; monthOrdinal: number; orreryPositions: Record<string, number>; phase: LunarPhase; pactSeats: Record<string, { status: string | null; wizardId: string | null; watcherPlayerId: string | null }>; pactFragmentOperationalState?: import("../shared/domain").PactFragmentOperationalMap; players: { playerId: string; name: string }[]; wizards: { wizardId: string; name: string; portrayedByPlayerId: string | null; character: { elements: { air: number; fire: number; earth: number; water: number } | null; pactFragmentPersonalForm: string | null; familiarDescription: string | null; ageYears: number | null; publicChangesOfMagic: readonly string[]; importantNotes: string | null }; homeIsleId: string | null; sanctumPlaceId: string | null; mortalityState?: "not_deceased" | "deceased" }[] },
  worldRef: { readonly denizens: readonly { readonly denizenId: string; readonly name: string; readonly representation: "individual" | "collective"; readonly description: string | null }[]; readonly isles: readonly { readonly isleId: string; readonly name: string; readonly description: string | null }[]; readonly places: readonly { readonly placeId: string; readonly name: string; readonly description: string | null; readonly placement: { readonly kind: "unspecified" } | { readonly kind: "on_isle"; readonly isleId: string } | { readonly kind: "mobile"; readonly associatedIsleId: string | null } }[] } | null | undefined,
  researcherMarkers: readonly SorcererOrreryHouseMarkerPresentation[] = [],
) {
  switch (surface) {
    case "current_phase":
      return (
        <CurrentPhaseSurface
          phase={ref.phase}
          monthOrdinal={ref.monthOrdinal}
          denizens={
            worldRef === undefined
              ? undefined
              : worldRef === null
                ? null
                : worldRef.denizens
          }
        />
      );
    case "orrery":
      return (
        <OrreryView
          monthOrdinal={ref.monthOrdinal}
          orreryPositions={ref.orreryPositions}
          researcherMarkers={researcherMarkers}
        />
      );
    case "table_wizards":
      return <TableWizards pactSeats={ref.pactSeats} players={ref.players} wizards={ref.wizards} worldRef={worldRef} campaignId={ref.campaignId} pactFragmentOperationalState={ref.pactFragmentOperationalState} />;
    case "world":
    case "hierophant":
    case "mariner":
    case "necromancer":
    case "faustian":
    case "compendium":
    case "sorcerer":
      return null;
  }
}

function renderWorld(worldRef: ReturnType<typeof useQuery<typeof api.m3Queries.getWorldReference>>, campaignId: string) {
  if (worldRef === undefined) {
    return <div className="py-12 text-center text-sm text-slate-400">Loading world…</div>;
  }
  if (worldRef === null) {
    return <div className="py-12 text-center text-sm text-slate-400">World unavailable.</div>;
  }
  return <WorldSurface world={worldRef} campaignId={campaignId} />;
}

function paneBody(
  surface: SurfaceId,
  ref: Parameters<typeof renderSurface>[1],
  worldRef: ReturnType<typeof useQuery<typeof api.m3Queries.getWorldReference>>,
  hierRef: ReturnType<typeof useQuery<typeof api.m3Queries.getHierophantReference>>,
  marinerRef: ReturnType<typeof useQuery<typeof api.m3Queries.getMarinerReference>>,
  necromancerRef: ReturnType<typeof useQuery<typeof api.m3Queries.getNecromancerReference>>,
  faustianRef: ReturnType<typeof useQuery<typeof api.m3Queries.getFaustianReference>>,
  loreCompendiumRef: ReturnType<typeof useQuery<typeof api.m3Queries.getLoreCompendiumReference>>,
  sorcererRef: ReturnType<typeof useQuery<typeof api.m3Queries.getSorcererReference>>,
  campaignId: string,
  layout: "full" | "narrow",
) {
  if (surface === "world") return renderWorld(worldRef, campaignId);
  if (surface === "hierophant") return renderHierophant(hierRef, worldRef, campaignId, sorcererRef, loreCompendiumUiStateFromQuery(loreCompendiumRef));
  if (surface === "mariner") return renderMariner(marinerRef, worldRef, ref, campaignId, sorcererRef, loreCompendiumUiStateFromQuery(loreCompendiumRef));
  if (surface === "necromancer") {
    return renderNecromancer(necromancerRef, worldRef, ref, campaignId, loreCompendiumUiStateFromQuery(loreCompendiumRef), sorcererRef);
  }
  if (surface === "faustian") {
    return renderFaustian(faustianRef, worldRef, ref, campaignId, loreCompendiumUiStateFromQuery(loreCompendiumRef), sorcererRef, layout);
  }
  if (surface === "sorcerer") {
    return renderSorcerer(sorcererRef, campaignId, layout, loreCompendiumUiStateFromQuery(loreCompendiumRef));
  }
  if (surface === "compendium") {
    return (
      <LoreSurface
        campaignId={campaignId}
        uiState={loreCompendiumUiStateFromQuery(loreCompendiumRef)}
        layout={layout}
      />
    );
  }
  return renderSurface(
    surface,
    ref,
    worldRef,
    orreryResearcherMarkersFromSorcererQuery(sorcererRef),
  );
}

function renderHierophant(
  hierRef: ReturnType<typeof useQuery<typeof api.m3Queries.getHierophantReference>>,
  worldRef: ReturnType<typeof useQuery<typeof api.m3Queries.getWorldReference>>,
  campaignId: string,
  sorcererRef: ReturnType<typeof useQuery<typeof api.m3Queries.getSorcererReference>>,
  loreCompendium: ReturnType<typeof loreCompendiumUiStateFromQuery>,
) {
  if (hierRef === undefined || worldRef === undefined) {
    return <div className="py-12 text-center text-sm text-slate-400">Loading Hierophant…</div>;
  }
  if (hierRef === null || worldRef === null) {
    return <div className="py-12 text-center text-sm text-slate-400">Hierophant unavailable.</div>;
  }
  return (
    <HierophantSurface
      hierophant={hierRef.hierophant}
      world={worldRef}
      campaignId={campaignId}
      sorcererPresence={sorcererRef?.presentation.externalPresence ?? []}
      loreCompendium={loreCompendium}
    />
  );
}

function marinerWizardFromPlayRef(
  ref: Parameters<typeof renderSurface>[1],
): MarinerWizardRef | null {
  const wizardId = ref.pactSeats.mariner?.wizardId ?? null;
  if (wizardId === null) return null;
  const wizard = ref.wizards.find((w) => w.wizardId === wizardId);
  if (wizard === undefined) return null;
  return {
    wizardId: wizard.wizardId,
    name: wizard.name,
    homeIsleId: wizard.homeIsleId,
    sanctumPlaceId: wizard.sanctumPlaceId,
  };
}

function pactSeatStatusesFromPlayRef(
  ref: Parameters<typeof renderSurface>[1],
): Partial<Record<PactSeatId, PactSeatStatus | null>> {
  const statuses: Partial<Record<PactSeatId, PactSeatStatus | null>> = {};
  for (const seatId of PACT_SEAT_IDS) {
    const seat = ref.pactSeats[seatId];
    if (seat === undefined) continue;
    const status = seat.status;
    statuses[seatId] = status === "present" || status === "silent" || status === "absent" || status === null
      ? status
      : null;
  }
  return statuses;
}

function renderMariner(
  marinerRef: ReturnType<typeof useQuery<typeof api.m3Queries.getMarinerReference>>,
  worldRef: ReturnType<typeof useQuery<typeof api.m3Queries.getWorldReference>>,
  playRef: Parameters<typeof renderSurface>[1],
  campaignId: string,
  sorcererRef: ReturnType<typeof useQuery<typeof api.m3Queries.getSorcererReference>>,
  loreCompendium: ReturnType<typeof loreCompendiumUiStateFromQuery>,
) {
  if (marinerRef === undefined || worldRef === undefined) {
    return <div className="py-12 text-center text-sm text-slate-400">Loading Mariner…</div>;
  }
  if (marinerRef === null || worldRef === null) {
    return <div className="py-12 text-center text-sm text-slate-400">Mariner unavailable.</div>;
  }
  return (
    <MarinerSurface
      mariner={marinerRef.mariner}
      world={worldRef}
      campaignId={campaignId}
      marinerWizard={marinerWizardFromPlayRef(playRef)}
      sorcererPresence={sorcererRef?.presentation.externalPresence ?? []}
      loreCompendium={loreCompendium}
      pactSeatStatuses={pactSeatStatusesFromPlayRef(playRef)}
    />
  );
}

function necromancerWizardFromPlayRef(
  ref: Parameters<typeof renderSurface>[1],
): NecromancerWizardRef | null {
  const wizardId = ref.pactSeats.necromancer?.wizardId ?? null;
  if (wizardId === null) return null;
  const wizard = ref.wizards.find((w) => w.wizardId === wizardId);
  if (wizard === undefined) return null;
  return {
    wizardId: wizard.wizardId,
    name: wizard.name,
    homeIsleId: wizard.homeIsleId,
    sanctumPlaceId: wizard.sanctumPlaceId,
  };
}

function renderSorcerer(
  sorcererRef: ReturnType<typeof useQuery<typeof api.m3Queries.getSorcererReference>>,
  campaignId: string,
  layout: "full" | "narrow",
  loreCompendium: ReturnType<typeof loreCompendiumUiStateFromQuery>,
) {
  if (sorcererRef === undefined) {
    return <div className="py-12 text-center text-sm text-slate-400">Loading Sorcerer…</div>;
  }
  if (sorcererRef === null) {
    return <div className="py-12 text-center text-sm text-slate-400">Sorcerer unavailable.</div>;
  }
  return (
    <SorcererSurface
      presentation={sorcererRef.presentation}
      campaignId={campaignId}
      layout={layout}
      loreCompendium={loreCompendium}
    />
  );
}

function renderNecromancer(
  necromancerRef: ReturnType<typeof useQuery<typeof api.m3Queries.getNecromancerReference>>,
  worldRef: ReturnType<typeof useQuery<typeof api.m3Queries.getWorldReference>>,
  playRef: Parameters<typeof renderSurface>[1],
  campaignId: string,
  loreCompendium: ReturnType<typeof loreCompendiumUiStateFromQuery>,
  sorcererRef: ReturnType<typeof useQuery<typeof api.m3Queries.getSorcererReference>>,
) {
  if (necromancerRef === undefined || worldRef === undefined) {
    return <div className="py-12 text-center text-sm text-slate-400">Loading Necromancer…</div>;
  }
  if (necromancerRef === null || worldRef === null) {
    return <div className="py-12 text-center text-sm text-slate-400">Necromancer unavailable.</div>;
  }
  return (
    <NecromancerSurface
      necromancer={necromancerRef.necromancer}
      world={worldRef}
      campaignId={campaignId}
      necromancerWizard={necromancerWizardFromPlayRef(playRef)}
      wizards={playRef.wizards.map((wizard) => ({
        wizardId: wizard.wizardId,
        name: wizard.name,
        mortalityState: wizard.mortalityState ?? "not_deceased",
      }))}
      loreCompendium={loreCompendium}
      sorcererPresence={sorcererRef?.presentation.externalPresence ?? []}
    />
  );
}

function faustianWizardFromPlayRef(
  ref: Parameters<typeof renderSurface>[1],
): FaustianWizardRef | null {
  const wizardId = ref.pactSeats.faustian?.wizardId ?? null;
  if (wizardId === null) return null;
  const wizard = ref.wizards.find((w) => w.wizardId === wizardId);
  if (wizard === undefined) return null;
  return {
    wizardId: wizard.wizardId,
    name: wizard.name,
    ageYears: wizard.character.ageYears,
    elements: wizard.character.elements,
    homeIsleId: wizard.homeIsleId,
    sanctumPlaceId: wizard.sanctumPlaceId,
  };
}

function renderFaustian(
  faustianRef: ReturnType<typeof useQuery<typeof api.m3Queries.getFaustianReference>>,
  worldRef: ReturnType<typeof useQuery<typeof api.m3Queries.getWorldReference>>,
  playRef: Parameters<typeof renderSurface>[1],
  campaignId: string,
  loreCompendium: ReturnType<typeof loreCompendiumUiStateFromQuery>,
  sorcererRef: ReturnType<typeof useQuery<typeof api.m3Queries.getSorcererReference>>,
  layout: "full" | "narrow",
) {
  if (faustianRef === undefined || worldRef === undefined) {
    return <div className="py-12 text-center text-sm text-slate-400">Loading Faustian…</div>;
  }
  if (faustianRef === null || worldRef === null) {
    return <div className="py-12 text-center text-sm text-slate-400">Faustian unavailable.</div>;
  }
  return (
    <FaustianSurface
      faustian={faustianRef.faustian}
      world={worldRef}
      campaignId={campaignId}
      faustianWizard={faustianWizardFromPlayRef(playRef)}
      wizards={playRef.wizards.map((wizard) => ({ wizardId: wizard.wizardId, name: wizard.name }))}
      loreCompendium={loreCompendium}
      sorcererPresence={sorcererRef?.presentation.externalPresence ?? []}
      layout={layout}
      lifecycleKind="play"
      ageId={faustianRef.ageId ?? null}
    />
  );
}

export default function PlayShell({
  campaignId,
  campaignRevision,
  monthDisplayName,
  phase,
}: {
  campaignId: string;
  campaignRevision: number;
  monthDisplayName: string;
  phase: LunarPhase;
}) {
  const [showTools, setShowTools] = useState(false);
  const [surfaceState, setSurfaceState] = useState<PlaySurfaceState>(() =>
    initPlaySurface(phase),
  );

  const playRef = useQuery(api.m3Queries.getPlayReference, {});
  const worldRef = useQuery(api.m3Queries.getWorldReference, {});
  const hierRef = useQuery(api.m3Queries.getHierophantReference, {});
  const marinerRef = useQuery(api.m3Queries.getMarinerReference, {});
  const necromancerRef = useQuery(api.m3Queries.getNecromancerReference, {});
  const faustianRef = useQuery(api.m3Queries.getFaustianReference, {});
  const loreCompendiumRef = useQuery(api.m3Queries.getLoreCompendiumReference, {});
  const sorcererRef = useQuery(api.m3Queries.getSorcererReference, {});

  const nav = useMemo(() => ({
    navigate: (pane: PaneLabel, target: SurfaceId) => setSurfaceState((s) => navigateSurface(s, pane, target)),
    back: (pane: PaneLabel) => setSurfaceState((s) => goBack(s, pane)),
    forward: (pane: PaneLabel) => setSurfaceState((s) => goForward(s, pane)),
    promote: () => setSurfaceState((s) => promoteSecondary(s)),
    toggle: () => setSurfaceState((s) => toggleSecondary(s)),
  }), []);

  const showSecondary = surfaceState.showSecondary && surfaceState.secondary !== null && !surfaceState.fullWidth;
  const actualDualPaneVisible = !showTools && showSecondary;
  const shellWidth = playShellWidthMode(showTools, showSecondary);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center px-4 py-8">
      <div className={`w-full flex flex-col gap-4 ${shellWidth === "wide" ? "max-w-[1440px]" : "max-w-5xl"}`}>
        {/* Chrome */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Seven-Part Pact
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {monthDisplayName}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {PHASE_DISPLAY[phase]}
            </span>
            <span className="text-xs text-slate-300 dark:text-slate-600">
              Rev {campaignRevision}
            </span>
          </div>
        </div>

        {/* Surface controls */}
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(SURFACE_LABELS) as SurfaceId[]).map((sid) => (
            <button
              key={sid}
              onClick={() => nav.navigate("primary", sid)}
              className={`text-xs font-medium rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                surfaceState.primary.current === sid
                  ? "bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {SURFACE_LABELS[sid]}
            </button>
          ))}
          <div className="flex items-center gap-1 ml-2">
            <button
              disabled={!canGoBack(surfaceState.primary)}
              onClick={() => nav.back("primary")}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Back
            </button>
            <button
              disabled={!canGoForward(surfaceState.primary)}
              onClick={() => nav.forward("primary")}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Forward
            </button>
          </div>
	  <div className="hidden md:flex items-center gap-2 ml-2">
            <button
              onClick={nav.toggle}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
            >
              {showSecondary ? "Hide Reference" : "Show Reference"}
            </button>
            {showSecondary && (
              <button
                onClick={nav.promote}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
              >
                Promote
              </button>
            )}
          </div>
          <button
            onClick={() => setShowTools(!showTools)}
            className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer ml-auto"
          >
            {showTools ? "Back to Play" : "Campaign Tools"}
          </button>
        </div>

        {/* Content */}
        {showTools ? (
          <CampaignTools campaignId={campaignId} campaignRevision={campaignRevision} />
        ) : playRef === undefined ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading play surfaces…</div>
        ) : playRef === null ? (
          <div className="py-12 text-center text-sm text-slate-400">Play state is updating…</div>
        ) : showSecondary && surfaceState.secondary ? (
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 min-w-0">
              {paneBody(surfaceState.primary.current, playRef, worldRef, hierRef, marinerRef, necromancerRef, faustianRef, loreCompendiumRef, sorcererRef, campaignId, "full")}
            </div>
            <div className="hidden md:block md:w-80 lg:w-96 flex-shrink-0">
              <div className="flex items-center gap-1 mb-2">
                {(Object.keys(SURFACE_LABELS) as SurfaceId[]).map((sid) => (
                  <button
                    key={sid}
                    onClick={() => nav.navigate("secondary", sid)}
                    className={`text-xs rounded px-2 py-1 cursor-pointer transition-colors ${
                      surfaceState.secondary!.current === sid
                        ? "bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    }`}
                  >
                    {SURFACE_LABELS[sid]}
                  </button>
                ))}
                <button
                  disabled={!canGoBack(surfaceState.secondary)}
                  onClick={() => nav.back("secondary")}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30 cursor-pointer"
                >
                  Back
                </button>
                <button
                  disabled={!canGoForward(surfaceState.secondary)}
                  onClick={() => nav.forward("secondary")}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30 cursor-pointer"
                >
                  Fwd
                </button>
              </div>
              {paneBody(surfaceState.secondary.current, playRef, worldRef, hierRef, marinerRef, necromancerRef, faustianRef, loreCompendiumRef, sorcererRef, campaignId, "narrow")}
            </div>
          </div>
        ) : (
          <div className="w-full">
            {paneBody(surfaceState.primary.current, playRef, worldRef, hierRef, marinerRef, necromancerRef, faustianRef, loreCompendiumRef, sorcererRef, campaignId, "full")}
          </div>
        )}
      </div>
    </main>
  );
}
