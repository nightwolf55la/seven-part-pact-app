import type {
  CampaignEvent,
  InfrastructureEvent,
  MonthChangedEventV1,
} from "./events";
import { displayNameFromOrdinal } from "./calendar";

export type ActivityEntry =
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
    }
  | {
      readonly id: string;
      readonly revision: number;
      readonly type: "campaign_configuration";
      readonly description: string;
    };

function describeConfigEvent(event: CampaignEvent): string {
  switch (event.type) {
    case "player_added":
      return `Added player "${event.data.name}"`;
    case "player_renamed":
      return `Renamed player "${event.data.previousName}" to "${event.data.newName}"`;
    case "player_removed":
      return `Removed player "${event.data.name}"`;
    case "campaign_age_changed":
      return event.data.newAgeId
        ? `Set campaign age to ${event.data.newAgeId}`
        : "Cleared campaign age";
    case "facilitator_assignment_changed":
      return event.data.newPlayerId
        ? "Assigned facilitator"
        : "Cleared facilitator";
    case "wizard_created":
      return `Created wizard "${event.data.name}" for ${event.data.assignedToSeatId} seat`;
    case "wizard_name_changed":
      return `Renamed wizard "${event.data.previousName}" to "${event.data.newName}"`;
    case "wizard_portrayal_changed":
      return event.data.newPlayerId
        ? "Changed wizard portrayal"
        : "Cleared wizard portrayal";
    case "pact_seat_wizard_changed":
      return event.data.newWizardId
        ? `Assigned wizard to ${event.data.seatId} seat`
        : `Unassigned wizard from ${event.data.seatId} seat`;
    case "pact_seat_status_changed":
      return event.data.newStatus
        ? `Set ${event.data.seatId} seat status to ${event.data.newStatus}`
        : `Cleared ${event.data.seatId} seat status`;
    case "watcher_assignment_changed":
      return event.data.newPlayerId
        ? `Assigned watcher to ${event.data.seatId} seat`
        : `Cleared watcher from ${event.data.seatId} seat`;
    case "setup_month_changed":
      return event.data.newMonthOrdinal !== null
        ? `Set starting month to ordinal ${event.data.newMonthOrdinal}`
        : "Cleared starting month";
    case "setup_orrery_position_changed":
      return event.data.newPosition !== null
        ? `Set ${event.data.planetId} Orrery position to ${event.data.newPosition}`
        : `Cleared ${event.data.planetId} Orrery position`;
    case "begin_play":
      return "Began Play";
    case "time_rescheduled":
      return "Rescheduled Time allocation";
    case "time_spent":
      return "Spent Time allocation";
    case "time_wasted":
      return "Wasted Time allocation";
    case "orrery_time_spent":
      return "Spent Orrery Time";
    case "engagement_time_committed":
      return "Committed Time to Engagement";
    case "engagement_resolved":
      return "Resolved Engagement";
    case "engagement_rescheduled":
      return "Rescheduled Engagement target";
    case "wizardmoot_attendance_adjusted":
      return "Adjusted Wizardmoot attendance";
    case "meeting_completed":
      return "Completed Meeting";
    case "month_begun":
      return "Began Next Month";
    default:
      return "Campaign configuration changed";
  }
}

function mapInfrastructureEvent(
  id: string,
  revision: number,
  event: InfrastructureEvent,
): ActivityEntry {
  switch (event.type) {
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

export function mapEventToActivityEntry(
  id: string,
  revision: number,
  event: CampaignEvent | MonthChangedEventV1,
): ActivityEntry {
  switch (event.type) {
    case "month_changed":
      return {
        id,
        revision,
        type: "campaign_configuration",
        description: `${displayNameFromOrdinal(event.data.fromOrdinal)} → ${displayNameFromOrdinal(event.data.toOrdinal)}`,
      };
    case "undo_applied":
    case "redo_applied":
    case "checkpoint_restored":
    case "backup_imported":
      return mapInfrastructureEvent(id, revision, event as InfrastructureEvent);
    case "player_added":
    case "player_renamed":
    case "player_removed":
    case "campaign_age_changed":
    case "facilitator_assignment_changed":
    case "wizard_created":
    case "wizard_name_changed":
    case "wizard_portrayal_changed":
    case "pact_seat_wizard_changed":
    case "pact_seat_status_changed":
    case "watcher_assignment_changed":
    case "setup_month_changed":
    case "setup_orrery_position_changed":
    case "begin_play":
    case "phase_advanced":
    case "time_allocation_scheduled":
    case "engagement_target_changed":
    case "time_rescheduled":
    case "time_spent":
    case "time_wasted":
    case "orrery_time_spent":
    case "engagement_time_committed":
    case "engagement_resolved":
    case "engagement_rescheduled":
    case "wizardmoot_attendance_adjusted":
    case "meeting_completed":
    case "month_begun": {
      return {
        id,
        revision,
        type: "campaign_configuration",
        description: describeConfigEvent(event),
      };
    }
  }
}

export function describeActivityEntry(entry: ActivityEntry): string {
  switch (entry.type) {
    case "undo_applied":
      return `Revision ${entry.revision} — Undo: revision ${entry.fromRevision} → ${entry.targetRevision}`;
    case "redo_applied":
      return `Revision ${entry.revision} — Redo: revision ${entry.fromRevision} → ${entry.targetRevision}`;
    case "checkpoint_restored":
      return `Revision ${entry.revision} — Restored "${entry.labelAtRestore}" from revision ${entry.sourceRevision}`;
    case "backup_imported":
      return `Revision ${entry.revision} — Imported backup from logical revision ${entry.sourceLogicalRevision}`;
    case "campaign_configuration":
      return `Revision ${entry.revision} — ${entry.description}`;
  }
}
