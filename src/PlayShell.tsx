import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api.js";
import CampaignTools from "./CampaignTools";
import CurrentPhaseSurface from "./CurrentPhaseSurface";
import OrreryView from "./OrreryView";
import TableWizards from "./TableWizards";
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
import type { LunarPhase } from "../shared/domain";

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
};

function renderSurface(
  surface: SurfaceId,
  ref: { monthOrdinal: number; orreryPositions: Record<string, number>; phase: LunarPhase; pactSeats: Record<string, { status: string | null; wizardId: string | null; watcherPlayerId: string | null }>; players: { playerId: string; name: string }[]; wizards: { wizardId: string; name: string; portrayedByPlayerId: string | null }[] },
) {
  switch (surface) {
    case "current_phase":
      return <CurrentPhaseSurface phase={ref.phase} monthOrdinal={ref.monthOrdinal} />;
    case "orrery":
      return <OrreryView monthOrdinal={ref.monthOrdinal} orreryPositions={ref.orreryPositions} />;
    case "table_wizards":
      return <TableWizards pactSeats={ref.pactSeats} players={ref.players} wizards={ref.wizards} />;
  }
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

  const nav = useMemo(() => ({
    navigate: (pane: PaneLabel, target: SurfaceId) => setSurfaceState((s) => navigateSurface(s, pane, target)),
    back: (pane: PaneLabel) => setSurfaceState((s) => goBack(s, pane)),
    forward: (pane: PaneLabel) => setSurfaceState((s) => goForward(s, pane)),
    promote: () => setSurfaceState((s) => promoteSecondary(s)),
    toggle: () => setSurfaceState((s) => toggleSecondary(s)),
  }), []);

  const showSecondary = surfaceState.showSecondary && surfaceState.secondary !== null && !surfaceState.fullWidth;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-5xl flex flex-col gap-4">
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
              {renderSurface(surfaceState.primary.current, playRef)}
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
              {renderSurface(surfaceState.secondary.current, playRef)}
            </div>
          </div>
        ) : (
          <div className="w-full">
            {renderSurface(surfaceState.primary.current, playRef)}
          </div>
        )}
      </div>
    </main>
  );
}
