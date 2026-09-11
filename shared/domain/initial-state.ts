import type { CurrentCampaignState, PactSeatState } from "./campaign-state";
import { CURRENT_STATE_SCHEMA_VERSION, EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE } from "./campaign-state";
import {
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
} from "./ruleset";
import { PACT_SEAT_IDS } from "./pact-seats";
import type { PactSeatId } from "./pact-seats";
import { emptySetupOrrery } from "./orrery";
import { EMPTY_SHARED_WORLD_STATE } from "./shared-world";
import { EMPTY_HIEROPHANT_STATE } from "./hierophant-state";
import { EMPTY_MARINER_STATE } from "./mariner-state";
import { EMPTY_NECROMANCER_STATE } from "./necromancer-state";
import { EMPTY_FAUSTIAN_STATE } from "./faustian-state";
import { EMPTY_SAGE_STATE } from "./sage-state";
import { EMPTY_WARLOCK_STATE } from "./warlock-state";
import { EMPTY_MAGIC_CONSUMABLES_STATE } from "./magic-consumables";
import { EMPTY_SORCERER_STATE } from "./sorcerer-state";

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
      monthOrdinal: null,
    },
    configuration: {
      ageId: null,
      facilitatorPlayerId: null,
    },
    players: [],
    wizards: [],
    pactSeats: emptyPactSeats(),
    pactFragmentOperationalState: EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
    lifecycle: {
      kind: "setup",
      orrery: emptySetupOrrery(),
    },
    wizardmootHistory: [],
    world: EMPTY_SHARED_WORLD_STATE,
    hierophant: EMPTY_HIEROPHANT_STATE,
    mariner: EMPTY_MARINER_STATE,
    necromancer: EMPTY_NECROMANCER_STATE,
    faustian: EMPTY_FAUSTIAN_STATE,
    sage: EMPTY_SAGE_STATE,
    warlock: EMPTY_WARLOCK_STATE,
    magicConsumables: EMPTY_MAGIC_CONSUMABLES_STATE,
    sorcerer: EMPTY_SORCERER_STATE,
  };
}
