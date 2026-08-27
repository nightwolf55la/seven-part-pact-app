import type { CurrentCampaignState, PactSeatState } from "./campaign-state";
import { CURRENT_STATE_SCHEMA_VERSION } from "./campaign-state";
import {
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
} from "./ruleset";
import { INITIAL_MONTH_ORDINAL } from "./calendar";
import { PACT_SEAT_IDS } from "./pact-seats";
import type { PactSeatId } from "./pact-seats";

function emptyPactSeats(): { readonly [K in PactSeatId]: PactSeatState } {
  const seats = {} as Record<PactSeatId, PactSeatState>;
  for (const id of PACT_SEAT_IDS) {
    seats[id] = { status: null, wizardId: null, watcherPlayerId: null };
  }
  return seats as { readonly [K in PactSeatId]: PactSeatState };
}

export function initialCampaignState(): CurrentCampaignState {
  return {
    schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
    ruleset: {
      id: SEVEN_PART_PACT_DRAFT4_ID,
      version: SEVEN_PART_PACT_DRAFT4_VERSION,
    },
    calendar: {
      monthOrdinal: INITIAL_MONTH_ORDINAL,
    },
    configuration: {
      ageId: null,
      facilitatorPlayerId: null,
    },
    players: [],
    wizards: [],
    pactSeats: emptyPactSeats(),
  };
}
