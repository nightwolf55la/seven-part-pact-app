import type { LunarPhase } from "../shared/domain";

export type LifecycleRoute =
  | { kind: "loading" }
  | { kind: "no_campaign" }
  | { kind: "deleting"; campaignId: string; phase: string }
  | { kind: "corrupt"; reason: string }
  | { kind: "setup"; campaignId: string; campaignRevision: number }
  | {
      kind: "play";
      campaignId: string;
      campaignRevision: number;
      monthOrdinal: number;
      monthDisplayName: string;
      phase: LunarPhase;
    };

export type LifecycleQueryResult =
  | undefined
  | null
  | { status: "none" }
  | { status: "deleting"; campaignId: string; phase: string }
  | {
      status: "campaign";
      campaignId: string;
      campaignRevision: number;
      lifecycleKind: "setup";
    }
  | {
      status: "campaign";
      campaignId: string;
      campaignRevision: number;
      lifecycleKind: "play";
      monthOrdinal: number;
      monthDisplayName: string;
      phase: string;
    }
  | { status: "corrupt"; reason: string };

export function resolveLifecycleRoute(
  query: LifecycleQueryResult,
): LifecycleRoute {
  if (query === undefined) {
    return { kind: "loading" };
  }
  if (query === null) {
    return { kind: "loading" };
  }
  switch (query.status) {
    case "none":
      return { kind: "no_campaign" };
    case "deleting":
      return {
        kind: "deleting",
        campaignId: query.campaignId,
        phase: query.phase,
      };
    case "corrupt":
      return { kind: "corrupt", reason: query.reason };
    case "campaign":
      if (query.lifecycleKind === "setup") {
        return {
          kind: "setup",
          campaignId: query.campaignId,
          campaignRevision: query.campaignRevision,
        };
      }
      return {
        kind: "play",
        campaignId: query.campaignId,
        campaignRevision: query.campaignRevision,
        monthOrdinal: query.monthOrdinal,
        monthDisplayName: query.monthDisplayName,
        phase: query.phase as LunarPhase,
      };
  }
}
