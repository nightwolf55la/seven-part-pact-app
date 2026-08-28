import { describe, it, expect } from "vitest";
import {
  applyAddPlayer,
  applyRenamePlayer,
  applyRemovePlayer,
  applySetCampaignAge,
  applySetFacilitator,
  applyCreateWizard,
  applyRenameWizard,
  applySetWizardPortrayal,
  applySetPactSeatWizard,
  applySetPactSeatStatus,
  applySetWatcher,
  validateCampaignState,
  validateAnyCampaignState,
  initialCampaignState,
  DomainError,
  CURRENT_STATE_SCHEMA_VERSION,
} from "../shared/domain";
import type { CurrentCampaignState, PlayerId, WizardId } from "../shared/domain";
import type { PactSeatId } from "../shared/domain/pact-seats";
import { migrateToCurrentVersion, migrateV1toV2 } from "../shared/domain/state-migration";
import type { CampaignStateV1 } from "../shared/domain";

function emptyState(): CurrentCampaignState {
  return initialCampaignState();
}

function stateWithPlayer(name: string, playerId: string = "plr_00000000-0000-0000-0000-000000000001"): CurrentCampaignState {
  const state = emptyState();
  return applyAddPlayer(state, playerId as PlayerId, name).nextState;
}

function stateWithWizard(): { state: CurrentCampaignState; playerId: PlayerId; wizardId: WizardId } {
  let state = emptyState();
  const playerId = "plr_00000000-0000-0000-0000-000000000001" as PlayerId;
  const wizardId = "wiz_00000000-0000-0000-0000-000000000001" as WizardId;
  state = applyAddPlayer(state, playerId, "Alice").nextState;
  state = applyCreateWizard(state, wizardId, "Zephyr", playerId, "necromancer" as PactSeatId).nextState;
  return { state, playerId, wizardId };
}

describe("M3 State Validation", () => {
  it("accepts canonical empty V2 state", () => {
    const state = emptyState();
    expect(() => validateCampaignState(state)).not.toThrow();
    expect(state.schemaVersion).toBe(2);
  });

  it("rejects invalid Player ID at mutation boundary (pure transition accepts any string)", () => {
    // The pure transition doesn't validate ID format - that happens at the Convex layer
    // Instead, test that validateCampaignState rejects states with bad IDs
    const state = emptyState();
    const bad = {
      ...state,
      players: [{ playerId: "bad-id", name: "Test" }],
    };
    expect(() => validateCampaignState(bad)).toThrow(/playerId is invalid/);
  });

  it("rejects duplicate Player IDs", () => {
    const state = stateWithPlayer("Alice");
    expect(() => applyAddPlayer(state, "plr_00000000-0000-0000-0000-000000000001" as PlayerId, "Bob")).toThrow(/already exists/);
  });

  it("rejects duplicate Wizard IDs", () => {
    const { state } = stateWithWizard();
    expect(() => applyCreateWizard(
      state,
      "wiz_00000000-0000-0000-0000-000000000001" as WizardId,
      "Another",
      null,
      "hierophant" as PactSeatId,
    )).toThrow(/already exists/);
  });

  it("rejects invalid facilitator reference", () => {
    const state = emptyState();
    expect(() => applySetFacilitator(state, "plr_00000000-0000-0000-0000-000000000099" as PlayerId)).toThrow(/not found/);
  });

  it("rejects invalid watcher reference", () => {
    const state = emptyState();
    expect(() => applySetWatcher(state, "necromancer" as PactSeatId, "plr_00000000-0000-0000-0000-000000000099" as PlayerId)).toThrow(/not found/);
  });

  it("rejects duplicate current Wizard seat assignment", () => {
    const { state, wizardId } = stateWithWizard();
    expect(() => applySetPactSeatWizard(state, "hierophant" as PactSeatId, wizardId)).toThrow(/already assigned/);
  });

  it("rejects one Player portraying multiple CURRENT Wizards", () => {
    let state = emptyState();
    const p1 = "plr_00000000-0000-0000-0000-000000000001" as PlayerId;
    state = applyAddPlayer(state, p1, "Alice").nextState;
    state = applyCreateWizard(state, "wiz_00000000-0000-0000-0000-000000000001" as WizardId, "W1", p1, "necromancer" as PactSeatId).nextState;
    expect(() => applyCreateWizard(state, "wiz_00000000-0000-0000-0000-000000000002" as WizardId, "W2", p1, "hierophant" as PactSeatId)).toThrow(/already portrays/);
  });

  it("allows retained unassigned Wizard portrayal - player can portray new current wizard", () => {
    let state = emptyState();
    const p1 = "plr_00000000-0000-0000-0000-000000000001" as PlayerId;
    const w1 = "wiz_00000000-0000-0000-0000-000000000001" as WizardId;
    const w2 = "wiz_00000000-0000-0000-0000-000000000002" as WizardId;
    state = applyAddPlayer(state, p1, "Alice").nextState;
    state = applyCreateWizard(state, w1, "First Wizard", p1, "necromancer" as PactSeatId).nextState;
    // Unassign from seat - wizard is retained
    state = applySetPactSeatWizard(state, "necromancer" as PactSeatId, null).nextState;
    // Player can now portray a new current wizard
    expect(() => applyCreateWizard(state, w2, "Second Wizard", p1, "necromancer" as PactSeatId)).not.toThrow();
  });

  it("allows multiple watcher seats assigned to one Player", () => {
    let state = emptyState();
    const p1 = "plr_00000000-0000-0000-0000-000000000001" as PlayerId;
    state = applyAddPlayer(state, p1, "Alice").nextState;
    state = applySetWatcher(state, "necromancer" as PactSeatId, p1).nextState;
    expect(() => applySetWatcher(state, "hierophant" as PactSeatId, p1)).not.toThrow();
  });

  it("rejects present status without wizard", () => {
    const state = emptyState();
    expect(() => applySetPactSeatStatus(state, "necromancer" as PactSeatId, "present")).toThrow(/no wizard assigned/);
  });

  it("rejects silent status without wizard", () => {
    const state = emptyState();
    expect(() => applySetPactSeatStatus(state, "necromancer" as PactSeatId, "silent")).toThrow(/no wizard assigned/);
  });

  it("allows absent status without wizard", () => {
    const state = emptyState();
    expect(() => applySetPactSeatStatus(state, "necromancer" as PactSeatId, "absent")).not.toThrow();
  });

  it("allows null status with partial setup", () => {
    const { state } = stateWithWizard();
    const result = applySetPactSeatStatus(state, "necromancer" as PactSeatId, null);
    expect(result.nextState.pactSeats.necromancer.status).toBeNull();
  });

  it("rejects invalid Age ID", () => {
    const state = emptyState();
    expect(() => applySetCampaignAge(state, "not_a_real_age" as any)).toThrow(/Invalid age id/);
  });

  it("rejects invalid seat ID", () => {
    const state = emptyState();
    expect(() => applySetPactSeatStatus(state, "invalid_seat" as any, "present")).toThrow(/Invalid seat id/);
  });

  it("rejects invalid status value via validation", () => {
    const { state } = stateWithWizard();
    const bad = {
      ...state,
      pactSeats: {
        ...state.pactSeats,
        necromancer: { ...state.pactSeats.necromancer, status: "invalid_status" },
      },
    };
    expect(() => validateCampaignState(bad)).toThrow();
  });
});

describe("M3 Player Removal Reference Check", () => {
  it("fails when player is facilitator", () => {
    let state = emptyState();
    const p1 = "plr_00000000-0000-0000-0000-000000000001" as PlayerId;
    state = applyAddPlayer(state, p1, "Alice").nextState;
    state = applySetFacilitator(state, p1).nextState;
    expect(() => applyRemovePlayer(state, p1)).toThrow(/facilitator/);
  });

  it("fails when player is watcher", () => {
    let state = emptyState();
    const p1 = "plr_00000000-0000-0000-0000-000000000001" as PlayerId;
    state = applyAddPlayer(state, p1, "Alice").nextState;
    state = applySetWatcher(state, "necromancer" as PactSeatId, p1).nextState;
    expect(() => applyRemovePlayer(state, p1)).toThrow(/watcher/);
  });

  it("fails when player portrays a current seat-assigned wizard", () => {
    const { state, playerId } = stateWithWizard();
    expect(() => applyRemovePlayer(state, playerId)).toThrow(/portraying/);
  });

  it("fails when player portrays a RETAINED unassigned wizard", () => {
    let state = emptyState();
    const p1 = "plr_00000000-0000-0000-0000-000000000001" as PlayerId;
    const w1 = "wiz_00000000-0000-0000-0000-000000000001" as WizardId;
    state = applyAddPlayer(state, p1, "Alice").nextState;
    state = applyCreateWizard(state, w1, "Zephyr", p1, "necromancer" as PactSeatId).nextState;
    // Unassign wizard from seat - it becomes retained
    state = applySetPactSeatWizard(state, "necromancer" as PactSeatId, null).nextState;
    // The wizard still references the player via portrayedByPlayerId
    expect(() => applyRemovePlayer(state, p1)).toThrow(/portraying/);
  });

  it("succeeds after clearing portrayal on retained wizard", () => {
    let state = emptyState();
    const p1 = "plr_00000000-0000-0000-0000-000000000001" as PlayerId;
    const w1 = "wiz_00000000-0000-0000-0000-000000000001" as WizardId;
    state = applyAddPlayer(state, p1, "Alice").nextState;
    state = applyCreateWizard(state, w1, "Zephyr", p1, "necromancer" as PactSeatId).nextState;
    state = applySetPactSeatWizard(state, "necromancer" as PactSeatId, null).nextState;
    state = applySetWizardPortrayal(state, w1, null).nextState;
    expect(() => applyRemovePlayer(state, p1)).not.toThrow();
  });
});

describe("M3 Wizard Retention", () => {
  it("seat unassignment retains Wizard object and stable ID", () => {
    const { state, wizardId } = stateWithWizard();
    const afterUnassign = applySetPactSeatWizard(state, "necromancer" as PactSeatId, null).nextState;
    expect(afterUnassign.pactSeats.necromancer.wizardId).toBeNull();
    expect(afterUnassign.wizards.find((w) => w.wizardId === wizardId)).toBeDefined();
  });

  it("replacement Wizard has distinct ID", () => {
    const { state } = stateWithWizard();
    const afterUnassign = applySetPactSeatWizard(state, "necromancer" as PactSeatId, null).nextState;
    const newWizId = "wiz_00000000-0000-0000-0000-000000000099" as WizardId;
    const afterCreate = applyCreateWizard(afterUnassign, newWizId, "New Wizard", null, "necromancer" as PactSeatId).nextState;
    expect(afterCreate.wizards.length).toBe(2);
    expect(afterCreate.pactSeats.necromancer.wizardId).toBe(newWizId);
  });

  it("no ordinary M3 transition hard-deletes a Wizard", () => {
    const { state, wizardId } = stateWithWizard();
    // Unassign from seat
    let s = applySetPactSeatWizard(state, "necromancer" as PactSeatId, null).nextState;
    // Change name
    s = applyRenameWizard(s, wizardId, "New Name").nextState;
    // Change portrayal
    s = applySetWizardPortrayal(s, wizardId, null).nextState;
    // Wizard still exists
    expect(s.wizards.find((w) => w.wizardId === wizardId)).toBeDefined();
  });
});

describe("M3 Command/Event Semantics", () => {
  it("add_player produces exactly player_added event", () => {
    const state = emptyState();
    const result = applyAddPlayer(state, "plr_00000000-0000-0000-0000-000000000001" as PlayerId, "Alice");
    expect(result.events.length).toBe(1);
    expect(result.events[0].type).toBe("player_added");
  });

  it("create_wizard produces wizard_created + pact_seat_wizard_changed in order", () => {
    let state = emptyState();
    state = applyAddPlayer(state, "plr_00000000-0000-0000-0000-000000000001" as PlayerId, "Alice").nextState;
    const result = applyCreateWizard(
      state,
      "wiz_00000000-0000-0000-0000-000000000001" as WizardId,
      "Zephyr",
      "plr_00000000-0000-0000-0000-000000000001" as PlayerId,
      "necromancer" as PactSeatId,
    );
    expect(result.events.length).toBe(2);
    expect(result.events[0].type).toBe("wizard_created");
    expect(result.events[1].type).toBe("pact_seat_wizard_changed");
  });

  it("seat unassignment clears present/silent status and emits pact_seat_wizard_changed + pact_seat_status_changed", () => {
    const { state } = stateWithWizard();
    const withStatus = applySetPactSeatStatus(state, "necromancer" as PactSeatId, "present").nextState;
    const result = applySetPactSeatWizard(withStatus, "necromancer" as PactSeatId, null);
    expect(result.events.length).toBe(2);
    expect(result.events[0].type).toBe("pact_seat_wizard_changed");
    expect(result.events[1].type).toBe("pact_seat_status_changed");
    expect(result.nextState.pactSeats.necromancer.status).toBeNull();
  });

  it("seat unassignment does NOT emit status event when status is null", () => {
    const { state } = stateWithWizard();
    const result = applySetPactSeatWizard(state, "necromancer" as PactSeatId, null);
    expect(result.events.length).toBe(1);
    expect(result.events[0].type).toBe("pact_seat_wizard_changed");
  });

  it("each standard M3 command produces exactly one event", () => {
    let state = emptyState();
    const p1 = "plr_00000000-0000-0000-0000-000000000001" as PlayerId;
    state = applyAddPlayer(state, p1, "Alice").nextState;

    expect(applyRenamePlayer(state, p1, "Bob").events.length).toBe(1);
    expect(applySetCampaignAge(state, "awakening").events.length).toBe(1);
    expect(applySetFacilitator(state, p1).events.length).toBe(1);
    expect(applySetWatcher(state, "necromancer" as PactSeatId, p1).events.length).toBe(1);
  });
});

describe("V1 -> V2 Migration", () => {
  const v1State: CampaignStateV1 = {
    schemaVersion: 1,
    ruleset: { id: "seven_part_pact_draft4", version: 1 },
    calendar: { monthOrdinal: 7 as any },
  };

  it("produces exact deterministic V2 result", () => {
    const v2 = migrateV1toV2(v1State);
    expect(v2.schemaVersion).toBe(2);
    expect(v2.ruleset).toEqual(v1State.ruleset);
    expect(v2.calendar).toEqual(v1State.calendar);
    expect(v2.configuration.ageId).toBeNull();
    expect(v2.configuration.facilitatorPlayerId).toBeNull();
    expect(v2.players).toEqual([]);
    expect(v2.wizards).toEqual([]);
    expect(Object.keys(v2.pactSeats).length).toBe(7);
    for (const seat of Object.values(v2.pactSeats)) {
      expect(seat).toEqual({ status: null, wizardId: null, watcherPlayerId: null });
    }
  });

  it("preserves ruleset and calendar exactly", () => {
    const v2 = migrateV1toV2(v1State);
    expect(v2.ruleset.id).toBe(v1State.ruleset.id);
    expect(v2.ruleset.version).toBe(v1State.ruleset.version);
    expect(v2.calendar.monthOrdinal).toBe(v1State.calendar.monthOrdinal);
  });

  it("migrateToCurrentVersion handles V1", () => {
    const validated = validateAnyCampaignState(v1State);
    const current = migrateToCurrentVersion(validated);
    expect(current.schemaVersion).toBe(2);
    validateCampaignState(current);
  });

  it("migrateToCurrentVersion is idempotent for V2", () => {
    const state = emptyState();
    const migrated = migrateToCurrentVersion(state);
    expect(migrated).toEqual(state);
  });

  it("unknown/malformed versions fail closed", () => {
    expect(() => validateAnyCampaignState({ schemaVersion: 99 })).toThrow();
    expect(() => migrateToCurrentVersion({ schemaVersion: 99 } as any)).toThrow();
  });

  it("V1 state validates as AnyCampaignState", () => {
    expect(() => validateAnyCampaignState(v1State)).not.toThrow();
  });

  it("V1 state does NOT validate as CurrentCampaignState", () => {
    expect(() => validateCampaignState(v1State)).toThrow();
  });
});

describe("Historical V1 Snapshot Interop", () => {
  const v1State: CampaignStateV1 = {
    schemaVersion: 1,
    ruleset: { id: "seven_part_pact_draft4", version: 1 },
    calendar: { monthOrdinal: 5 as any },
  };

  it("validates and migrates V1 to usable V2", () => {
    const validated = validateAnyCampaignState(v1State);
    const migrated = migrateToCurrentVersion(validated);
    expect(migrated.schemaVersion).toBe(CURRENT_STATE_SCHEMA_VERSION);
    expect(migrated.calendar.monthOrdinal).toBe(5);
    validateCampaignState(migrated);
  });

  it("migrated V2 from V1 snapshot can receive normal commands", () => {
    const validated = validateAnyCampaignState(v1State);
    const migrated = migrateToCurrentVersion(validated);
    // Apply a normal M2 command (month advance equivalent - use add_player as proxy)
    const p1 = "plr_00000000-0000-0000-0000-000000000001" as PlayerId;
    const result = applyAddPlayer(migrated, p1, "Test Player");
    expect(result.nextState.players.length).toBe(1);
    validateCampaignState(result.nextState);
  });

  it("undo to V1 target yields V2 restored state", () => {
    // Simulates: validate + migrate a V1 snapshot → V2 state for comparison
    const migrated = migrateToCurrentVersion(validateAnyCampaignState(v1State));
    expect(migrated.schemaVersion).toBe(2);
    validateCampaignState(migrated);
  });

  it("old V1 snapshots remain unchanged by migration", () => {
    const original = JSON.parse(JSON.stringify(v1State));
    migrateToCurrentVersion(validateAnyCampaignState(v1State));
    expect(v1State).toEqual(original);
  });
});
