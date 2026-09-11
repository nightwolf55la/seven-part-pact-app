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
  "initialize_mariner",
  "set_mariner_ship",
  "set_selected_sea_laws",
  "set_mariner_route_occupancy",
  "set_mariner_sea_storm_count",
  "set_mariner_isle_market",
  "set_mariner_isle_ravage",
  "add_mariner_beast",
  "update_mariner_beast",
  "remove_mariner_beast",
  "initialize_necromancer",
  "set_necromancer_depth",
  "set_selected_death_laws",
  "set_necromancer_gate_status",
  "set_necromancer_soul_count",
  "move_necromancer_souls",
  "add_necromancer_foe",
  "update_necromancer_foe",
  "remove_necromancer_foe",
  "escape_necromancer_wizard_foe",
  "add_necromancer_wizard_foe_truth",
  "update_necromancer_wizard_foe_truth",
  "remove_necromancer_wizard_foe_truth",
  "add_necromancer_wizard_traversal",
  "update_necromancer_wizard_traversal",
  "remove_necromancer_wizard_traversal",
  "add_necromancer_ally",
  "update_necromancer_ally",
  "remove_necromancer_ally",
  "add_necromancer_ghoul_caller",
  "update_necromancer_ghoul_caller",
  "remove_necromancer_ghoul_caller",
  "create_necromancer_campaign_gate",
  "update_necromancer_campaign_gate",
  "create_necromancer_campaign_path_space",
  "remove_necromancer_campaign_path_space",
  "add_necromancer_step",
  "remove_necromancer_step",
  "set_wizard_mortality_state",
  "set_denizen_mortality_state",
  "create_powerful_denizen_profile",
  "remove_powerful_denizen_profile",
  "set_powerful_denizen_taxonomies",
  "set_powerful_denizen_status",
  "set_powerful_denizen_goal",
  "add_powerful_denizen_method",
  "update_powerful_denizen_method",
  "remove_powerful_denizen_method",
  "add_powerful_denizen_truth",
  "update_powerful_denizen_truth",
  "remove_powerful_denizen_truth",
  "create_campaign_powerful_denizen_taxonomy",
  "update_campaign_powerful_denizen_taxonomy",
  "remove_campaign_powerful_denizen_taxonomy",
  "create_treasure",
  "update_treasure_details",
  "update_treasure_state",
  "update_pact_fragment_operational_state",
  "investigate_faustian_community",
  "blackmail_faustian_community",
  "direct_faustian_accomplice",
  "disrupt_faustian_pawn",
  "initialize_sorcerer",
  "recruit_sorcerer_personnel",
  "refocus_sorcerer_researcher",
  "tutor_sorcerer_student",
  "rearrange_sorcerer_tower",
  "set_sorcerer_researcher_operational_this_month",
  "adjust_sorcerer_knowledge",
  "set_sorcerer_archives_open",
  "move_sorcerer_tower_magic_consumable",
  "add_lore_entry",
  "revise_lore_entry",
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
    case "initialize_mariner":
    case "set_mariner_ship":
    case "set_selected_sea_laws":
    case "set_mariner_route_occupancy":
    case "set_mariner_sea_storm_count":
    case "set_mariner_isle_market":
    case "set_mariner_isle_ravage":
    case "add_mariner_beast":
    case "update_mariner_beast":
    case "remove_mariner_beast":
    case "initialize_necromancer":
    case "set_necromancer_depth":
    case "set_selected_death_laws":
    case "set_necromancer_gate_status":
    case "set_necromancer_soul_count":
    case "move_necromancer_souls":
    case "add_necromancer_foe":
    case "update_necromancer_foe":
    case "remove_necromancer_foe":
    case "escape_necromancer_wizard_foe":
    case "add_necromancer_wizard_foe_truth":
    case "update_necromancer_wizard_foe_truth":
    case "remove_necromancer_wizard_foe_truth":
    case "add_necromancer_wizard_traversal":
    case "update_necromancer_wizard_traversal":
    case "remove_necromancer_wizard_traversal":
    case "add_necromancer_ally":
    case "update_necromancer_ally":
    case "remove_necromancer_ally":
    case "add_necromancer_ghoul_caller":
    case "update_necromancer_ghoul_caller":
    case "remove_necromancer_ghoul_caller":
    case "create_necromancer_campaign_gate":
    case "update_necromancer_campaign_gate":
    case "create_necromancer_campaign_path_space":
    case "remove_necromancer_campaign_path_space":
    case "add_necromancer_step":
    case "remove_necromancer_step":
    case "set_wizard_mortality_state":
    case "set_denizen_mortality_state":
    case "create_powerful_denizen_profile":
    case "remove_powerful_denizen_profile":
    case "set_powerful_denizen_taxonomies":
    case "set_powerful_denizen_status":
    case "set_powerful_denizen_goal":
    case "add_powerful_denizen_method":
    case "update_powerful_denizen_method":
    case "remove_powerful_denizen_method":
    case "add_powerful_denizen_truth":
    case "update_powerful_denizen_truth":
    case "remove_powerful_denizen_truth":
    case "create_campaign_powerful_denizen_taxonomy":
    case "update_campaign_powerful_denizen_taxonomy":
    case "remove_campaign_powerful_denizen_taxonomy":
    case "create_treasure":
    case "update_treasure_details":
    case "update_treasure_state":
    case "update_pact_fragment_operational_state":
    case "investigate_faustian_community":
    case "blackmail_faustian_community":
    case "direct_faustian_accomplice":
    case "disrupt_faustian_pawn":
    case "initialize_sorcerer":
    case "recruit_sorcerer_personnel":
    case "refocus_sorcerer_researcher":
    case "tutor_sorcerer_student":
    case "rearrange_sorcerer_tower":
    case "set_sorcerer_researcher_operational_this_month":
    case "adjust_sorcerer_knowledge":
    case "set_sorcerer_archives_open":
    case "move_sorcerer_tower_magic_consumable":
    case "add_lore_entry":
    case "revise_lore_entry":
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
