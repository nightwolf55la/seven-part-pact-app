import type { Brand } from "./brand";

export type CampaignId = Brand<string, "CampaignId">;
export type CommandId = Brand<string, "CommandId">;
export type CheckpointId = Brand<string, "CheckpointId">;
export type PlayerId = Brand<string, "PlayerId">;
export type WizardId = Brand<string, "WizardId">;
export type AllocationId = Brand<string, "AllocationId">;
export type EngagementId = Brand<string, "EngagementId">;
export type DenizenId = Brand<string, "DenizenId">;
export type IsleId = Brand<string, "IsleId">;
export type PlaceId = Brand<string, "PlaceId">;
export type CompanionRelationshipId = Brand<string, "CompanionRelationshipId">;


const CAMPAIGN_ID_REGEX = /^cmp_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LIVE_COMMAND_ID_REGEX = /^cmd_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CHECKPOINT_ID_REGEX = /^chk_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PLAYER_ID_REGEX = /^plr_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const WIZARD_ID_REGEX = /^wiz_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ALLOCATION_ID_REGEX = /^alc_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ENGAGEMENT_ID_REGEX = /^eng_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DENIZEN_ID_REGEX = /^den_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ISLE_ID_REGEX = /^isl_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PLACE_ID_REGEX = /^plc_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const COMPANION_RELATIONSHIP_ID_REGEX = /^cmprel_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function generateBrandedId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function generateAllocationId(): AllocationId {
  return generateBrandedId("alc") as AllocationId;
}

export function generateEngagementId(): EngagementId {
  return generateBrandedId("eng") as EngagementId;
}

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

export function isValidAllocationId(value: string): value is AllocationId {
  return ALLOCATION_ID_REGEX.test(value);
}

export function parseAllocationId(value: string): AllocationId {
  if (!isValidAllocationId(value)) {
    throw new Error(`Invalid AllocationId format: "${value}". Expected alc_<UUID>.`);
  }
  return value;
}

export function isValidEngagementId(value: string): value is EngagementId {
  return ENGAGEMENT_ID_REGEX.test(value);
}

export function parseEngagementId(value: string): EngagementId {
  if (!isValidEngagementId(value)) {
    throw new Error(`Invalid EngagementId format: "${value}". Expected eng_<UUID>.`);
  }
  return value;
}

export function isValidDenizenId(value: string): value is DenizenId {
  return DENIZEN_ID_REGEX.test(value);
}

export function parseDenizenId(value: string): DenizenId {
  if (!isValidDenizenId(value)) {
    throw new Error(`Invalid DenizenId format: "${value}". Expected den_<UUID>.`);
  }
  return value;
}

export function isValidIsleId(value: string): value is IsleId {
  return ISLE_ID_REGEX.test(value);
}

export function parseIsleId(value: string): IsleId {
  if (!isValidIsleId(value)) {
    throw new Error(`Invalid IsleId format: "${value}". Expected isl_<UUID>.`);
  }
  return value;
}

export function isValidPlaceId(value: string): value is PlaceId {
  return PLACE_ID_REGEX.test(value);
}

export function parsePlaceId(value: string): PlaceId {
  if (!isValidPlaceId(value)) {
    throw new Error(`Invalid PlaceId format: "${value}". Expected plc_<UUID>.`);
  }
  return value;
}

export function isValidCompanionRelationshipId(value: string): value is CompanionRelationshipId {
  return COMPANION_RELATIONSHIP_ID_REGEX.test(value);
}

export function parseCompanionRelationshipId(value: string): CompanionRelationshipId {
  if (!isValidCompanionRelationshipId(value)) {
    throw new Error(`Invalid CompanionRelationshipId format: "${value}". Expected cmprel_<UUID>.`);
  }
  return value;
}
