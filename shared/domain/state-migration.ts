import type { AnyCampaignState, CurrentCampaignState } from "./campaign-state";
import { DomainError } from "./errors";
import { validateAnyCampaignState } from "./state-validation";
import { statesDeepEqual } from "./state-equality";

export function loadHistoricalState(raw: unknown): CurrentCampaignState {
  const validated = validateAnyCampaignState(raw);
  return migrateToCurrentVersion(validated);
}

export function migrateToCurrentVersion(state: AnyCampaignState): CurrentCampaignState {
  if (state.schemaVersion === 3) {
    return state;
  }
  const version = (state as { schemaVersion: unknown }).schemaVersion;
  throw new DomainError(
    "INVALID_CAMPAIGN_STATE",
    `Unsupported state schema version: ${JSON.stringify(version)}. Only V3 is supported.`,
  );
}

export const SUPPORTED_STATE_SCHEMA_VERSIONS = [3] as const;

export function isSupportedSchemaVersion(version: unknown): boolean {
  return (
    typeof version === "number" &&
    (SUPPORTED_STATE_SCHEMA_VERSIONS as readonly number[]).includes(version)
  );
}

export function isHistoricalStateLogicallyEqual(
  rawHistorical: unknown,
  current: CurrentCampaignState,
): boolean {
  const migrated = loadHistoricalState(rawHistorical);
  return statesDeepEqual(migrated, current);
}
