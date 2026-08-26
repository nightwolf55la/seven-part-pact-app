export const CAMPAIGN_COMMAND_TYPES = [
  "move_month",
  "legacy_month_change",
  "checkpoint_restore",
  "backup_import",
  "undo",
  "redo",
] as const;

export type CampaignCommandType = (typeof CAMPAIGN_COMMAND_TYPES)[number];

export function isLogicalStateCommandType(commandType: CampaignCommandType): boolean {
  switch (commandType) {
    case "move_month":
      return true;
    case "legacy_month_change":
      return true;
    case "checkpoint_restore":
      return true;
    case "backup_import":
      return true;
    case "undo":
      return false;
    case "redo":
      return false;
  }
}

export function isHistoryNavigationCommandType(commandType: CampaignCommandType): boolean {
  return !isLogicalStateCommandType(commandType);
}
