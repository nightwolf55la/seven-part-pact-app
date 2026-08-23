import type { Brand } from "./brand";

export type CampaignId = Brand<string, "CampaignId">;
export type CommandId = Brand<string, "CommandId">;

const CAMPAIGN_ID_REGEX = /^cmp_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LIVE_COMMAND_ID_REGEX = /^cmd_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isValidCampaignId(value: string): value is CampaignId {
  return CAMPAIGN_ID_REGEX.test(value);
}

export function parseCampaignId(value: string): CampaignId {
  if (!isValidCampaignId(value)) {
    throw new Error(`Invalid CampaignId format: "${value}". Expected cmp_<UUID>.`);
  }
  return value;
}

export function isValidLiveCommandId(value: string): value is CommandId {
  return LIVE_COMMAND_ID_REGEX.test(value);
}

export function parseLiveCommandId(value: string): CommandId {
  if (!isValidLiveCommandId(value)) {
    throw new Error(`Invalid live CommandId format: "${value}". Expected cmd_<UUID>.`);
  }
  return value;
}
