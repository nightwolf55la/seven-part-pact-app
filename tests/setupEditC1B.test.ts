import { describe, it, expect } from "vitest";
import {
  initialCampaignState,
  applyAddPlayer,
  applySetCampaignAge,
  applySetFacilitator,
  applySetSetupMonth,
  applySetSetupOrreryPosition,
  applyCreateWizard,
  applySetPactSeatStatus,
  applySetWatcher,
  DomainError,
  MOVABLE_PLANET_IDS,
  legalPositionsForPlanet,
} from "../shared/domain";
import type { CurrentCampaignState, MonthOrdinal, MovablePlanetId, PlayerId, WizardId } from "../shared/domain";

function setupStateWithPlayer(): CurrentCampaignState {
  const state = initialCampaignState();
  const result = applyAddPlayer(state, "plr_00000000-0000-0000-0000-000000000001" as PlayerId, "Alice");
  return result.nextState;
}

function setupStateWithPlayerAndWizard(): CurrentCampaignState {
  let state = setupStateWithPlayer();
  const result = applyCreateWizard(
    state,
    "wiz_00000000-0000-0000-0000-000000000001" as WizardId,
    "Merlin",
    "plr_00000000-0000-0000-0000-000000000001" as PlayerId,
    "necromancer",
  );
  return result.nextState;
}

function playState(): CurrentCampaignState {
  const state = initialCampaignState();
  return {
    ...state,
    calendar: { monthOrdinal: 0 as MonthOrdinal },
    lifecycle: {
      kind: "play" as const,
      phase: "new_moon" as const,
      orrery: {
        saturn: 500 as any,
        jupiter: 0 as any,
        mars: 0 as any,
        venus: 0 as any,
        mercury: 0 as any,
      },
      currentMonth: {
        timeParticipants: [],
        engagements: [],
        wizardmootAttendance: null,
      },
    },
  };
}

// ============================================================
// M3 roster/seat operations preserve V3 Setup lifecycle/Orrery
// ============================================================

describe("C1B: M3 roster operations preserve V3 Setup lifecycle", () => {
  it("addPlayer preserves setup lifecycle and empty orrery", () => {
    const state = initialCampaignState();
    const result = applyAddPlayer(state, "plr_00000000-0000-0000-0000-000000000001" as PlayerId, "Alice");
    expect(result.nextState.lifecycle.kind).toBe("setup");
    expect(result.nextState.wizardmootHistory).toEqual([]);
    if (result.nextState.lifecycle.kind === "setup") {
      expect(result.nextState.lifecycle.orrery.saturn).toBeNull();
    }
  });

  it("createWizard preserves setup lifecycle", () => {
    const state = setupStateWithPlayer();
    const result = applyCreateWizard(
      state,
      "wiz_00000000-0000-0000-0000-000000000001" as WizardId,
      "Merlin",
      "plr_00000000-0000-0000-0000-000000000001" as PlayerId,
      "necromancer",
    );
    expect(result.nextState.lifecycle.kind).toBe("setup");
    expect(result.nextState.wizardmootHistory).toEqual([]);
  });

  it("setPactSeatStatus preserves setup lifecycle", () => {
    const state = setupStateWithPlayerAndWizard();
    const result = applySetPactSeatStatus(state, "necromancer", "present");
    expect(result.nextState.lifecycle.kind).toBe("setup");
  });

  it("setWatcher preserves setup lifecycle", () => {
    const state = setupStateWithPlayerAndWizard();
    const result = applySetWatcher(state, "necromancer", "plr_00000000-0000-0000-0000-000000000001" as PlayerId);
    expect(result.nextState.lifecycle.kind).toBe("setup");
  });
});

// ============================================================
// Age set/change/clear (Setup-only guard)
// ============================================================

describe("C1B: setCampaignAge", () => {
  it("sets a valid age during Setup", () => {
    const state = initialCampaignState();
    const result = applySetCampaignAge(state, "awakening");
    expect(result.nextState.configuration.ageId).toBe("awakening");
  });

  it("clears age to null during Setup", () => {
    const state = initialCampaignState();
    const set = applySetCampaignAge(state, "awakening");
    const cleared = applySetCampaignAge(set.nextState, null);
    expect(cleared.nextState.configuration.ageId).toBeNull();
  });

  it("rejects outside Setup", () => {
    const state = playState();
    expect(() => applySetCampaignAge(state, "awakening")).toThrow(DomainError);
  });
});

// ============================================================
// Facilitator set/change/clear + nonexistent player rejection
// ============================================================

describe("C1B: setFacilitator", () => {
  it("sets facilitator to existing player during Setup", () => {
    const state = setupStateWithPlayer();
    const result = applySetFacilitator(state, "plr_00000000-0000-0000-0000-000000000001" as PlayerId);
    expect(result.nextState.configuration.facilitatorPlayerId).toBe("plr_00000000-0000-0000-0000-000000000001" as PlayerId);
  });

  it("changes facilitator to another existing player", () => {
    let state = setupStateWithPlayer();
    state = applyAddPlayer(state, "plr_00000000-0000-0000-0000-000000000002" as PlayerId, "Bob").nextState;
    state = applySetFacilitator(state, "plr_00000000-0000-0000-0000-000000000001" as PlayerId).nextState;
    const result = applySetFacilitator(state, "plr_00000000-0000-0000-0000-000000000002" as PlayerId);
    expect(result.nextState.configuration.facilitatorPlayerId).toBe("plr_00000000-0000-0000-0000-000000000002" as PlayerId);
  });

  it("clears facilitator to null during Setup", () => {
    const state = setupStateWithPlayer();
    const set = applySetFacilitator(state, "plr_00000000-0000-0000-0000-000000000001" as PlayerId);
    const cleared = applySetFacilitator(set.nextState, null);
    expect(cleared.nextState.configuration.facilitatorPlayerId).toBeNull();
  });

  it("rejects nonexistent player", () => {
    const state = setupStateWithPlayer();
    expect(() => applySetFacilitator(state, "plr_nobody" as PlayerId)).toThrow(DomainError);
  });

  it("rejects outside Setup", () => {
    const state = playState();
    expect(() => applySetFacilitator(state, null)).toThrow(DomainError);
  });
});

// ============================================================
// Initial month set/change/clear
// ============================================================

describe("C1B: setSetupMonth", () => {
  it("sets monthOrdinal during Setup", () => {
    const state = initialCampaignState();
    const result = applySetSetupMonth(state, 5 as MonthOrdinal);
    expect(result.nextState.calendar.monthOrdinal).toBe(5);
  });

  it("changes monthOrdinal", () => {
    const state = initialCampaignState();
    const set = applySetSetupMonth(state, 5 as MonthOrdinal);
    const changed = applySetSetupMonth(set.nextState, 10 as MonthOrdinal);
    expect(changed.nextState.calendar.monthOrdinal).toBe(10);
  });

  it("clears monthOrdinal to null", () => {
    const state = initialCampaignState();
    const set = applySetSetupMonth(state, 5 as MonthOrdinal);
    const cleared = applySetSetupMonth(set.nextState, null);
    expect(cleared.nextState.calendar.monthOrdinal).toBeNull();
  });

  it("preserves setup lifecycle and orrery", () => {
    const state = initialCampaignState();
    const result = applySetSetupMonth(state, 5 as MonthOrdinal);
    expect(result.nextState.lifecycle.kind).toBe("setup");
    if (result.nextState.lifecycle.kind === "setup") {
      expect(result.nextState.lifecycle.orrery.saturn).toBeNull();
    }
  });

  it("rejects outside Setup", () => {
    const state = playState();
    expect(() => applySetSetupMonth(state, 5 as MonthOrdinal)).toThrow(DomainError);
  });

  it("rejected edit leaves prior state unchanged", () => {
    const state = playState();
    const before = structuredClone(state);
  
    expect(() => applySetSetupMonth(state, 5 as MonthOrdinal)).toThrow(DomainError);
    expect(state).toEqual(before);
  });
});

// ============================================================
// Setup Orrery position: positionIndex -> centidegree mapping
// ============================================================

describe("C1B: setSetupOrreryPosition position mapping", () => {
  for (const planetId of MOVABLE_PLANET_IDS) {
    it(`maps positionIndex 0 to the correct centidegree for ${planetId}`, () => {
      const state = initialCampaignState();
      const result = applySetSetupOrreryPosition(state, planetId as MovablePlanetId, 0);
      const expected = legalPositionsForPlanet(planetId as MovablePlanetId)[0];
      if (result.nextState.lifecycle.kind === "setup") {
        expect(result.nextState.lifecycle.orrery[planetId as keyof typeof result.nextState.lifecycle.orrery]).toBe(expected);
      }
    });

    it(`maps positionIndex 1 to the correct centidegree for ${planetId}`, () => {
      const state = initialCampaignState();
      const result = applySetSetupOrreryPosition(state, planetId as MovablePlanetId, 1);
      const expected = legalPositionsForPlanet(planetId as MovablePlanetId)[1];
      if (result.nextState.lifecycle.kind === "setup") {
        expect(result.nextState.lifecycle.orrery[planetId as keyof typeof result.nextState.lifecycle.orrery]).toBe(expected);
      }
    });
  }

  it("rejects invalid positionIndex (out of range)", () => {
    const state = initialCampaignState();
    expect(() => applySetSetupOrreryPosition(state, "saturn", 9999)).toThrow(DomainError);
  });

  it("rejects negative positionIndex", () => {
    const state = initialCampaignState();
    expect(() => applySetSetupOrreryPosition(state, "saturn", -1)).toThrow(DomainError);
  });

  it("rejects invalid planetId", () => {
    const state = initialCampaignState();
    expect(() => applySetSetupOrreryPosition(state, "pluto" as any, 0)).toThrow(DomainError);
  });

  it("rejects outside Setup", () => {
    const state = playState();
    expect(() => applySetSetupOrreryPosition(state, "saturn", 0)).toThrow(DomainError);
  });
});

// ============================================================
// Changing one planet preserves the other four
// ============================================================

describe("C1B: changing one planet preserves the other four", () => {
  it("setting saturn does not affect jupiter/mars/venus/mercury", () => {
    let state = initialCampaignState();
    state = applySetSetupOrreryPosition(state, "jupiter", 2).nextState;
    state = applySetSetupOrreryPosition(state, "mars", 1).nextState;
    state = applySetSetupOrreryPosition(state, "venus", 3).nextState;
    state = applySetSetupOrreryPosition(state, "mercury", 0).nextState;

    const result = applySetSetupOrreryPosition(state, "saturn", 0);
    if (result.nextState.lifecycle.kind === "setup") {
      const o = result.nextState.lifecycle.orrery;
      expect(o.saturn).toBe(legalPositionsForPlanet("saturn")[0]);
      expect(o.jupiter).toBe(legalPositionsForPlanet("jupiter")[2]);
      expect(o.mars).toBe(legalPositionsForPlanet("mars")[1]);
      expect(o.venus).toBe(legalPositionsForPlanet("venus")[3]);
      expect(o.mercury).toBe(legalPositionsForPlanet("mercury")[0]);
    }
  });
});

// ============================================================
// Clearing one planet returns it to null
// ============================================================

describe("C1B: clearing one planet returns it to null", () => {
  it("clearing saturn after setting it", () => {
    const state = initialCampaignState();
    const set = applySetSetupOrreryPosition(state, "saturn", 0);
    const cleared = applySetSetupOrreryPosition(set.nextState, "saturn", null);
    if (cleared.nextState.lifecycle.kind === "setup") {
      expect(cleared.nextState.lifecycle.orrery.saturn).toBeNull();
    }
  });

  it("clearing one planet preserves the others", () => {
    let state = initialCampaignState();
    state = applySetSetupOrreryPosition(state, "saturn", 0).nextState;
    state = applySetSetupOrreryPosition(state, "jupiter", 1).nextState;

    const cleared = applySetSetupOrreryPosition(state, "saturn", null);
    if (cleared.nextState.lifecycle.kind === "setup") {
      expect(cleared.nextState.lifecycle.orrery.saturn).toBeNull();
      expect(cleared.nextState.lifecycle.orrery.jupiter).toBe(legalPositionsForPlanet("jupiter")[1]);
    }
  });
});

// ============================================================
// Setup-only commands reject Play state
// ============================================================

describe("C1B: Setup-only commands reject Play state", () => {
  it("setSetupMonth rejects in Play", () => {
    expect(() => applySetSetupMonth(playState(), 0 as MonthOrdinal)).toThrow(DomainError);
  });

  it("setSetupOrreryPosition rejects in Play", () => {
    expect(() => applySetSetupOrreryPosition(playState(), "saturn", 0)).toThrow(DomainError);
  });

  it("setCampaignAge rejects in Play", () => {
    expect(() => applySetCampaignAge(playState(), null)).toThrow(DomainError);
  });

  it("setFacilitator rejects in Play", () => {
    expect(() => applySetFacilitator(playState(), null)).toThrow(DomainError);
  });
});
