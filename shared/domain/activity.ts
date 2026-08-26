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
    }
  | {
      readonly id: string;
      readonly revision: number;
      readonly type: "checkpoint_restored";
      readonly checkpointId: string;
      readonly labelAtRestore: string;
      readonly sourceRevision: number;
    }
  | {
      readonly id: string;
      readonly revision: number;
      readonly type: "backup_imported";
      readonly sourceCampaignRevision: number;
      readonly sourceLogicalRevision: number;
      readonly exportedAtMs: number;
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
    case "checkpoint_restored": {
      if (event.version !== 1) {
        throw new Error(
          `Unsupported checkpoint_restored event version ${event.version}`,
        );
      }
      return {
        id,
        revision,
        type: "checkpoint_restored",
        checkpointId: event.data.checkpointId,
        labelAtRestore: event.data.labelAtRestore,
        sourceRevision: event.data.sourceRevision,
      };
    }
    case "backup_imported": {
      if (event.version !== 1) {
        throw new Error(
          `Unsupported backup_imported event version ${event.version}`,
        );
      }
      return {
        id,
        revision,
        type: "backup_imported",
        sourceCampaignRevision: event.data.sourceCampaignRevision,
        sourceLogicalRevision: event.data.sourceLogicalRevision,
        exportedAtMs: event.data.exportedAtMs,
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
    case "checkpoint_restored":
      return `Revision ${entry.revision} — Restored "${entry.labelAtRestore}" from revision ${entry.sourceRevision}`;
    case "backup_imported":
      return `Revision ${entry.revision} — Imported backup from logical revision ${entry.sourceLogicalRevision}`;
  }
}
