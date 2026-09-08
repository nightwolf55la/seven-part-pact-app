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
  "update_wizard_character",
  "create_denizen",
  "update_denizen",
  "create_isle",
  "update_isle",
  "create_place",
  "update_place",
  "set_wizard_home_isle",
  "set_wizard_sanctum",
  "set_wizard_companion",
  "update_companion_description",
  "initialize_hierophant",
  "adjust_temple_resources",
  "create_temple",
  "update_temple",
  "set_temple_holiday",
  "set_selected_flame_laws",
  "add_supplicant",
  "update_supplicant",
  "remove_supplicant",
  "add_prophet",
  "update_prophet",
  "remove_prophet",
  "establish_cult",
  "update_cult",
  "remove_cult",
  "add_cult_dogma",
  "update_cult_dogma",
  "remove_cult_dogma",
  "create_campaign_class",
  "update_campaign_class",
  "create_campaign_doctrine",
  "update_campaign_doctrine",
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
    case "update_wizard_character":
    case "create_denizen":
    case "update_denizen":
    case "create_isle":
    case "update_isle":
    case "create_place":
    case "update_place":
    case "set_wizard_home_isle":
    case "set_wizard_sanctum":
    case "set_wizard_companion":
    case "update_companion_description":
    case "initialize_hierophant":
    case "adjust_temple_resources":
    case "create_temple":
    case "update_temple":
    case "set_temple_holiday":
    case "set_selected_flame_laws":
    case "add_supplicant":
    case "update_supplicant":
    case "remove_supplicant":
    case "add_prophet":
    case "update_prophet":
    case "remove_prophet":
    case "establish_cult":
    case "update_cult":
    case "remove_cult":
    case "add_cult_dogma":
    case "update_cult_dogma":
    case "remove_cult_dogma":
    case "create_campaign_class":
    case "update_campaign_class":
    case "create_campaign_doctrine":
    case "update_campaign_doctrine":
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
