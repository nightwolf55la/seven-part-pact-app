import type { CurrentCampaignState } from "./campaign-state";
import { CURRENT_STATE_SCHEMA_VERSION } from "./campaign-state";
import {
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
} from "./ruleset";
import { DomainError } from "./errors";

export function validateCampaignState(state: unknown): CurrentCampaignState {
  if (state === null || state === undefined || typeof state !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "State must be a non-null object");
  }

  const s = state as Record<string, unknown>;

  if (s.schemaVersion !== CURRENT_STATE_SCHEMA_VERSION) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Unsupported schemaVersion: ${JSON.stringify(s.schemaVersion)}`,
    );
  }

  if (s.ruleset === null || s.ruleset === undefined || typeof s.ruleset !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Missing or invalid ruleset");
  }

  const ruleset = s.ruleset as Record<string, unknown>;
  if (ruleset.id !== SEVEN_PART_PACT_DRAFT4_ID) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Unsupported ruleset id: ${JSON.stringify(ruleset.id)}`,
    );
  }
  if (ruleset.version !== SEVEN_PART_PACT_DRAFT4_VERSION) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `Unsupported ruleset version: ${JSON.stringify(ruleset.version)}`,
    );
  }

  if (s.calendar === null || s.calendar === undefined || typeof s.calendar !== "object") {
    throw new DomainError("INVALID_CAMPAIGN_STATE", "Missing or invalid calendar");
  }

  const calendar = s.calendar as Record<string, unknown>;
  if (typeof calendar.monthOrdinal !== "number" || !Number.isSafeInteger(calendar.monthOrdinal)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `monthOrdinal is not a safe integer: ${JSON.stringify(calendar.monthOrdinal)}`,
    );
  }

  return state as CurrentCampaignState;
}
