export const CAMPAIGN_COMMAND_TYPES = [
  "checkpoint_restore",
  "backup_import",
  "undo",
  "redo",
  "add_player",
  "rename_player",
  "remove_player",
  "set_campaign_age",
  "set_facilitator",
  "create_wizard",
  "rename_wizard",
  "set_wizard_portrayal",
  "set_pact_seat_wizard",
  "set_pact_seat_status",
  "set_watcher",
  "set_setup_month",
  "set_setup_orrery_position",
  "begin_play",
  "advance_phase",
  "schedule_time",
  "set_engagement_target",
  "reschedule_time",
  "spend_manual_time",
  "waste_time",
  "spend_orrery_time",
  "commit_time_to_engagement",
  "resolve_engagement",
  "reschedule_engagement",
  "adjust_wizardmoot_attendance",
  "complete_meeting",
  "begin_next_month",
] as const;

// Historical command types that may appear in persisted revision records but
// are no longer emitted by active runtime code (M4 retirement).
export const HISTORICAL_COMMAND_TYPES = [
  "move_month",
  "legacy_month_change",
] as const;

export type CampaignCommandType =
  | (typeof CAMPAIGN_COMMAND_TYPES)[number]
  | (typeof HISTORICAL_COMMAND_TYPES)[number];

export function isLogicalStateCommandType(commandType: CampaignCommandType): boolean {
  switch (commandType) {
    case "checkpoint_restore":
    case "backup_import":
    case "add_player":
    case "rename_player":
    case "remove_player":
    case "set_campaign_age":
    case "set_facilitator":
    case "create_wizard":
    case "rename_wizard":
    case "set_wizard_portrayal":
    case "set_pact_seat_wizard":
    case "set_pact_seat_status":
    case "set_watcher":
    case "set_setup_month":
    case "set_setup_orrery_position":
    case "begin_play":
    case "advance_phase":
    case "schedule_time":
    case "set_engagement_target":
    case "reschedule_time":
    case "spend_manual_time":
    case "waste_time":
    case "spend_orrery_time":
    case "commit_time_to_engagement":
    case "resolve_engagement":
    case "reschedule_engagement":
    case "adjust_wizardmoot_attendance":
    case "complete_meeting":
    case "begin_next_month":
    case "move_month":
    case "legacy_month_change":
      return true;
    case "undo":
    case "redo":
      return false;
    default:
      return false;
  }
}

export function isHistoryNavigationCommandType(commandType: CampaignCommandType): boolean {
  return !isLogicalStateCommandType(commandType);
}
