import type { LunarPhase } from "../shared/domain/campaign-state";

export type WorkspaceKind =
  | "new_moon"
  | "visions"
  | "planning"
  | "story"
  | "meeting"
  | "quiet";

export interface PhaseWorkspaceModel {
  readonly displayName: string;
  readonly workspaceKind: WorkspaceKind;
  readonly nextPhase: LunarPhase | null;
  readonly actionLabel: string | null;
}

const MODELS: Record<LunarPhase, PhaseWorkspaceModel> = {
  new_moon: {
    displayName: "New Moon",
    workspaceKind: "new_moon",
    nextPhase: "visions",
    actionLabel: "Advance to Visions",
  },
  visions: {
    displayName: "Visions",
    workspaceKind: "visions",
    nextPhase: "planning",
    actionLabel: "Advance to Planning",
  },
  planning: {
    displayName: "Planning",
    workspaceKind: "planning",
    nextPhase: "story",
    actionLabel: "Advance to Story",
  },
  story: {
    displayName: "Story",
    workspaceKind: "story",
    nextPhase: "meeting",
    actionLabel: "Advance to Meeting",
  },
  meeting: {
    displayName: "Meeting",
    workspaceKind: "meeting",
    nextPhase: null,
    actionLabel: null,
  },
  quiet: {
    displayName: "Quiet",
    workspaceKind: "quiet",
    nextPhase: null,
    actionLabel: null,
  },
};

export function getPhaseWorkspaceModel(phase: LunarPhase): PhaseWorkspaceModel {
  return MODELS[phase];
}
