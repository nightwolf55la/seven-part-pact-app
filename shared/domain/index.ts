export type { Brand } from "./brand";

export type { CampaignId, CommandId } from "./ids";

export type {
  MonthOrdinal,
  MonthId,
  MonthDirection,
  MonthDisplayName,
} from "./calendar";
export {
  MONTH_IDS,
  MONTH_DISPLAY_NAMES,
  MONTH_COUNT,
  INITIAL_MONTH_ORDINAL,
  monthIdFromOrdinal,
  displayNameFromMonthId,
  displayNameFromOrdinal,
  advanceOrdinal,
} from "./calendar";

export type { CampaignCommandType } from "./commands";
export { CAMPAIGN_COMMAND_TYPES } from "./commands";

export type {
  MonthChangedDataV1,
  MonthChangedEventV1,
  CampaignEvent,
} from "./events";

export type { RulesetRef } from "./ruleset";
export {
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  CURRENT_RULESET,
} from "./ruleset";

export type {
  CampaignRevision,
  CampaignStateV1,
  CurrentCampaignState,
  AnyCampaignState,
} from "./campaign-state";
export { CURRENT_STATE_SCHEMA_VERSION } from "./campaign-state";

export type {
  LegacyCampaignInput,
  LegacyEventInput,
  MigrationSnapshotPlan,
  MigrationRevisionPlan,
  MigrationNotNeeded,
  MigrationReady,
  MigrationInvalid,
  MigrationAnalysisResult,
} from "./migration-analyzer";
export { analyzeLegacyMigration } from "./migration-analyzer";

export type { DomainErrorCode } from "./errors";
export { DomainError } from "./errors";

export { validateCampaignState } from "./state-validation";

export type { MoveMonthTransitionResult } from "./transitions";
export { applyMoveMonth } from "./transitions";

export {
  syntheticMigrationCommandId,
  isSyntheticMigrationCommandId,
} from "./command-ids";
