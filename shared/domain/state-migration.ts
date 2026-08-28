import type { CampaignStateV1, CampaignStateV2 } from "./campaign-state";
import type { AnyCampaignState, CurrentCampaignState } from "./campaign-state";
import { PACT_SEAT_IDS } from "./pact-seats";
import type { PactSeatId } from "./pact-seats";
import type { PactSeatState } from "./campaign-state";
import { DomainError } from "./errors";
import { validateAnyCampaignState } from "./state-validation";

function emptyPactSeats(): { readonly [K in PactSeatId]: PactSeatState } {
  const seats = {} as Record<PactSeatId, PactSeatState>;
  for (const id of PACT_SEAT_IDS) {
    seats[id] = { status: null, wizardId: null, watcherPlayerId: null };
  }
  return seats as { readonly [K in PactSeatId]: PactSeatState };
}

export function migrateV1toV2(state: CampaignStateV1): CampaignStateV2 {
  return {
    schemaVersion: 2,
    ruleset: { ...state.ruleset },
    calendar: { ...state.calendar },
    configuration: {
      ageId: null,
      facilitatorPlayerId: null,
    },
    players: [],
    wizards: [],
    pactSeats: emptyPactSeats(),
  };
}

/**
 * Validates raw persisted state (V1 or V2) and migrates to CurrentCampaignState.
 * This is the canonical read-boundary for any historical snapshot that may be V1 or V2.
 * Used by undo/redo, checkpoint-restore, verifier, and tests.
 */
export function loadHistoricalState(raw: unknown): CurrentCampaignState {
  const validated = validateAnyCampaignState(raw);
  return migrateToCurrentVersion(validated);
}

export function migrateToCurrentVersion(state: AnyCampaignState): CurrentCampaignState {
  switch (state.schemaVersion) {
    case 1:
      return migrateV1toV2(state);
    case 2:
      return state;
    default: {
      const version = (state as { schemaVersion: unknown }).schemaVersion;
      throw new DomainError(
        "INVALID_CAMPAIGN_STATE",
        `Unsupported state schema version: ${JSON.stringify(version)}`,
      );
    }
  }
}

export const SUPPORTED_STATE_SCHEMA_VERSIONS = [1, 2] as const;

export function isSupportedSchemaVersion(version: unknown): boolean {
  return (
    typeof version === "number" &&
    (SUPPORTED_STATE_SCHEMA_VERSIONS as readonly number[]).includes(version)
  );
}
