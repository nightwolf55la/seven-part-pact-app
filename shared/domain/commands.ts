export const CAMPAIGN_COMMAND_TYPES = [
  "move_month",
  "legacy_month_change",
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
] as const;

export type CampaignCommandType = (typeof CAMPAIGN_COMMAND_TYPES)[number];

export function isLogicalStateCommandType(commandType: CampaignCommandType): boolean {
  switch (commandType) {
    case "move_month":
    case "legacy_month_change":
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
      return true;
    case "undo":
    case "redo":
      return false;
  }
}

export function isHistoryNavigationCommandType(commandType: CampaignCommandType): boolean {
  return !isLogicalStateCommandType(commandType);
}
