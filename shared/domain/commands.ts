export type CampaignCommandType = "move_month" | "legacy_month_change";

export const CAMPAIGN_COMMAND_TYPES: readonly CampaignCommandType[] = [
  "move_month",
  "legacy_month_change",
] as const;
