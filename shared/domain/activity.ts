import type { CampaignEvent } from "./events";
import { displayNameFromOrdinal } from "./calendar";

export type ActivityEntry =
  | {
      readonly id: string;
      readonly revision: number;
      readonly type: "month_changed";
      readonly previousMonth: string;
      readonly newMonth: string;
    }
  | {
      readonly id: string;
      readonly revision: number;
      readonly type: "undo_applied";
      readonly fromRevision: number;
      readonly targetRevision: number;
    }
  | {
      readonly id: string;
      readonly revision: number;
      readonly type: "redo_applied";
      readonly fromRevision: number;
      readonly targetRevision: number;
    };

export function mapEventToActivityEntry(
  id: string,
  revision: number,
  event: CampaignEvent,
): ActivityEntry {
  switch (event.type) {
    case "month_changed": {
      if (event.version !== 1) {
        throw new Error(
          `Unsupported month_changed event version ${event.version}`,
        );
      }
      return {
        id,
        revision,
        type: "month_changed",
        previousMonth: displayNameFromOrdinal(event.data.fromOrdinal),
        newMonth: displayNameFromOrdinal(event.data.toOrdinal),
      };
    }
    case "undo_applied": {
      if (event.version !== 1) {
        throw new Error(
          `Unsupported undo_applied event version ${event.version}`,
        );
      }
      return {
        id,
        revision,
        type: "undo_applied",
        fromRevision: event.data.fromRevision,
        targetRevision: event.data.targetRevision,
      };
    }
    case "redo_applied": {
      if (event.version !== 1) {
        throw new Error(
          `Unsupported redo_applied event version ${event.version}`,
        );
      }
      return {
        id,
        revision,
        type: "redo_applied",
        fromRevision: event.data.fromRevision,
        targetRevision: event.data.targetRevision,
      };
    }
  }
}

export function describeActivityEntry(entry: ActivityEntry): string {
  switch (entry.type) {
    case "month_changed":
      return `Revision ${entry.revision} — ${entry.previousMonth} → ${entry.newMonth}`;
    case "undo_applied":
      return `Revision ${entry.revision} — Undo: revision ${entry.fromRevision} → ${entry.targetRevision}`;
    case "redo_applied":
      return `Revision ${entry.revision} — Redo: revision ${entry.fromRevision} → ${entry.targetRevision}`;
  }
}
