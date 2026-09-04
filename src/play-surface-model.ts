import type { LunarPhase } from "../shared/domain/campaign-state";

export type SurfaceId = "current_phase" | "orrery" | "table_wizards";

export interface SurfaceLayout {
  readonly primary: SurfaceId;
  readonly secondary: SurfaceId | null;
}

export interface PaneHistory {
  readonly past: readonly SurfaceId[];
  readonly current: SurfaceId;
  readonly future: readonly SurfaceId[];
}

export interface PlaySurfaceState {
  readonly primary: PaneHistory;
  readonly secondary: PaneHistory | null;
  readonly showSecondary: boolean;
  readonly fullWidth: boolean;
}

const PHASE_DEFAULTS: Record<LunarPhase, SurfaceLayout> = {
  new_moon: { primary: "orrery", secondary: "current_phase" },
  visions: { primary: "orrery", secondary: "current_phase" },
  planning: { primary: "current_phase", secondary: "orrery" },
  story: { primary: "current_phase", secondary: "table_wizards" },
  meeting: { primary: "current_phase", secondary: "table_wizards" },
  quiet: { primary: "current_phase", secondary: "orrery" },
};

export function phaseDefaultLayout(phase: LunarPhase): SurfaceLayout {
  return PHASE_DEFAULTS[phase];
}

export function initPlaySurface(phase: LunarPhase): PlaySurfaceState {
  const layout = phaseDefaultLayout(phase);
  return {
    primary: { past: [], current: layout.primary, future: [] },
    secondary: layout.secondary !== null
      ? { past: [], current: layout.secondary, future: [] }
      : null,
    showSecondary: layout.secondary !== null,
    fullWidth: false,
  };
}

function navigatePane(history: PaneHistory, target: SurfaceId): PaneHistory {
  if (history.current === target) return history;
  return {
    past: [...history.past, history.current],
    current: target,
    future: [],
  };
}

function backPane(history: PaneHistory): PaneHistory {
  if (history.past.length === 0) return history;
  const past = [...history.past];
  const current = past.pop()!;
  return {
    past,
    current,
    future: [history.current, ...history.future],
  };
}

function forwardPane(history: PaneHistory): PaneHistory {
  if (history.future.length === 0) return history;
  const [current, ...future] = history.future;
  return {
    past: [...history.past, history.current],
    current,
    future,
  };
}

export function canGoBack(history: PaneHistory): boolean {
  return history.past.length > 0;
}

export function canGoForward(history: PaneHistory): boolean {
  return history.future.length > 0;
}

export type PaneLabel = "primary" | "secondary";

export function navigateSurface(
  state: PlaySurfaceState,
  pane: PaneLabel,
  target: SurfaceId,
): PlaySurfaceState {
  if (pane === "primary") {
    return { ...state, primary: navigatePane(state.primary, target) };
  }
  if (state.secondary === null) return state;
  return { ...state, secondary: navigatePane(state.secondary, target) };
}

export function goBack(state: PlaySurfaceState, pane: PaneLabel): PlaySurfaceState {
  if (pane === "primary") {
    return { ...state, primary: backPane(state.primary) };
  }
  if (state.secondary === null) return state;
  return { ...state, secondary: backPane(state.secondary) };
}

export function goForward(state: PlaySurfaceState, pane: PaneLabel): PlaySurfaceState {
  if (pane === "primary") {
    return { ...state, primary: forwardPane(state.primary) };
  }
  if (state.secondary === null) return state;
  return { ...state, secondary: forwardPane(state.secondary) };
}

export function promoteSecondary(state: PlaySurfaceState): PlaySurfaceState {
  if (state.secondary === null) return state;
  return {
    ...state,
    primary: navigatePane(state.primary, state.secondary.current),
    showSecondary: false,
    fullWidth: true,
  };
}

export function toggleSecondary(state: PlaySurfaceState): PlaySurfaceState {
  return { ...state, showSecondary: !state.showSecondary, fullWidth: false };
}

export function showCurrentPhase(state: PlaySurfaceState, pane: PaneLabel): PlaySurfaceState {
  return navigateSurface(state, pane, "current_phase");
}
