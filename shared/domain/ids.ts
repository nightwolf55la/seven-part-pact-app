import type { Brand } from "./brand";

export type CampaignId = Brand<string, "CampaignId">;
export type CommandId = Brand<string, "CommandId">;
export type CheckpointId = Brand<string, "CheckpointId">;
export type PlayerId = Brand<string, "PlayerId">;
export type WizardId = Brand<string, "WizardId">;

const CAMPAIGN_ID_REGEX = /^cmp_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LIVE_COMMAND_ID_REGEX = /^cmd_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CHECKPOINT_ID_REGEX = /^chk_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PLAYER_ID_REGEX = /^plr_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const WIZARD_ID_REGEX = /^wiz_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

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

export function isValidCheckpointId(value: string): value is CheckpointId {
  return CHECKPOINT_ID_REGEX.test(value);
}

export function parseCheckpointId(value: string): CheckpointId {
  if (!isValidCheckpointId(value)) {
    throw new Error(`Invalid CheckpointId format: "${value}". Expected chk_<UUID>.`);
  }
  return value;
}

export function isValidPlayerId(value: string): value is PlayerId {
  return PLAYER_ID_REGEX.test(value);
}

export function parsePlayerId(value: string): PlayerId {
  if (!isValidPlayerId(value)) {
    throw new Error(`Invalid PlayerId format: "${value}". Expected plr_<UUID>.`);
  }
  return value;
}

export function isValidWizardId(value: string): value is WizardId {
  return WIZARD_ID_REGEX.test(value);
}

export function parseWizardId(value: string): WizardId {
  if (!isValidWizardId(value)) {
    throw new Error(`Invalid WizardId format: "${value}". Expected wiz_<UUID>.`);
  }
  return value;
}
