import { describe, it, expect } from "vitest";
import {
  initialCampaignState,
  applyAddPlayer,
  applyCreateWizard,
  applySetCampaignAge,
  applySetFacilitator,
  applySetSetupMonth,
  applySetSetupOrreryPosition,
  applySetPactSeatWizard,
  applySetPactSeatStatus,
  applySetWatcher,
  evaluateSetupReadiness,
  PACT_SEAT_IDS,
  MOVABLE_PLANET_IDS,
  legalPositionsForPlanet,
} from "../shared/domain";
import type { CurrentCampaignState, PlayerId, WizardId, PactSeatId, MonthOrdinal, MovablePlanetId, AgeDefinitionId } from "../shared/domain";

const P1 = "plr_00000000-0000-0000-0000-000000000001" as PlayerId;
const P2 = "plr_00000000-0000-0000-0000-000000000002" as PlayerId;
const P3 = "plr_00000000-0000-0000-0000-000000000003" as PlayerId;
const P4 = "plr_00000000-0000-0000-0000-000000000004" as PlayerId;
const P5 = "plr_00000000-0000-0000-0000-000000000005" as PlayerId;
const P6 = "plr_00000000-0000-0000-0000-000000000006" as PlayerId;
const P7 = "plr_00000000-0000-0000-0000-000000000007" as PlayerId;

function wizId(n: number): WizardId {
  return `wiz_00000000-0000-0000-0000-00000000000${n}` as WizardId;
}

const AWAKENING_INDICES: Record<MovablePlanetId, number> = {
  saturn: 20,
  jupiter: 5,
  mars: 22,
  venus: 16,
  mercury: 19,
};

const CALAMITY_INDICES: Record<MovablePlanetId, number> = {
  saturn: 35,
  jupiter: 37,
  mars: 25,
  venus: 6,
  mercury: 22,
};

function buildReadyState(
  ageId: AgeDefinitionId,
  monthOrdinal: number,
  planetIndices: Record<MovablePlanetId, number>,
): CurrentCampaignState {
  let state = initialCampaignState();

  const players = [P1, P2, P3, P4, P5, P6, P7];
  for (let i = 0; i < players.length; i++) {
    state = applyAddPlayer(state, players[i], `Player ${i + 1}`).nextState;
  }

  state = applySetCampaignAge(state, ageId).nextState;
  state = applySetFacilitator(state, P1).nextState;
  state = applySetSetupMonth(state, monthOrdinal as MonthOrdinal).nextState;

  for (const planetId of MOVABLE_PLANET_IDS) {
    state = applySetSetupOrreryPosition(state, planetId, planetIndices[planetId]).nextState;
  }

  const seats: PactSeatId[] = [...PACT_SEAT_IDS];
  for (let i = 0; i < seats.length; i++) {
    const seatId = seats[i];
    state = applyCreateWizard(state, wizId(i + 1), `Wizard ${i + 1}`, players[i], seatId).nextState;
    state = applySetPactSeatWizard(state, seatId, wizId(i + 1)).nextState;
    state = applySetPactSeatStatus(state, seatId, "present").nextState;
    state = applySetWatcher(state, seatId, players[i]).nextState;
  }

  return state;
}

function withOrreryPosition(state: CurrentCampaignState, planetId: MovablePlanetId, positionIndex: number): CurrentCampaignState {
  const pos = legalPositionsForPlanet(planetId)[positionIndex];
  const orrery = { ...state.lifecycle.orrery, [planetId]: pos } as typeof state.lifecycle.orrery;
  return {
    ...state,
    lifecycle: { ...state.lifecycle, orrery } as typeof state.lifecycle,
  };
}

function withMonth(state: CurrentCampaignState, monthOrdinal: number): CurrentCampaignState {
  return { ...state, calendar: { monthOrdinal: monthOrdinal as MonthOrdinal } };
}

describe("C1D: age-specific setup readiness", () => {
  it("valid Awakening arrangement passes", () => {
    const state = buildReadyState("awakening", 0, AWAKENING_INDICES);
    const result = evaluateSetupReadiness(state);
    expect(result).toEqual({ ready: true });
  });

  it("Awakening wrong month fails", () => {
    const state = withMonth(buildReadyState("awakening", 0, AWAKENING_INDICES), 1);
    const result = evaluateSetupReadiness(state);
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.issues.some((i) => i.code === "AGE_MONTH_MISMATCH")).toBe(true);
    }
  });

  it("Awakening wrong planet position fails", () => {
    const state = withOrreryPosition(buildReadyState("awakening", 0, AWAKENING_INDICES), "saturn", 0);
    const result = evaluateSetupReadiness(state);
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.issues.some((i) => i.code === "AGE_ORRERY_POSITION_MISMATCH" && i.planetId === "saturn")).toBe(true);
    }
  });

  it.each([0, 3, 6, 9])("Dominion valid starting month %d passes with legal positions", (month) => {
    const indices: Record<MovablePlanetId, number> = {
      saturn: 0,
      jupiter: 1,
      mars: 2,
      venus: 3,
      mercury: 4,
    };
    const state = buildReadyState("dominion", month, indices);
    const result = evaluateSetupReadiness(state);
    expect(result).toEqual({ ready: true });
  });

  it("Dominion invalid month fails", () => {
    const indices: Record<MovablePlanetId, number> = {
      saturn: 0,
      jupiter: 0,
      mars: 0,
      venus: 0,
      mercury: 0,
    };
    const state = buildReadyState("dominion", 1, indices);
    const result = evaluateSetupReadiness(state);
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.issues.some((i) => i.code === "AGE_MONTH_MISMATCH")).toBe(true);
    }
  });

  it("Dominion varied legal planet positions accepted", () => {
    const indices: Record<MovablePlanetId, number> = {
      saturn: 10,
      jupiter: 7,
      mars: 15,
      venus: 3,
      mercury: 8,
    };
    const state = buildReadyState("dominion", 3, indices);
    const result = evaluateSetupReadiness(state);
    expect(result).toEqual({ ready: true });
  });

  it("Dominion off-grid position rejected", () => {
    const state = buildReadyState("dominion", 0, {
      saturn: 0,
      jupiter: 0,
      mars: 0,
      venus: 0,
      mercury: 0,
    });
    const offGridPos = 7 as unknown as Parameters<typeof legalPositionsForPlanet>[0] extends never ? never : never;
    const saturnLegal = legalPositionsForPlanet("saturn");
    const midPoint = Math.floor((saturnLegal[0] + saturnLegal[1]) / 2);
    const orrery = { ...state.lifecycle.orrery, saturn: midPoint as any } as typeof state.lifecycle.orrery;
    const brokenState = {
      ...state,
      lifecycle: { ...state.lifecycle, orrery } as typeof state.lifecycle,
    };
    const result = evaluateSetupReadiness(brokenState);
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.issues.some((i) => i.code === "AGE_ORRERY_POSITION_ILLEGAL" && i.planetId === "saturn")).toBe(true);
    }
    void offGridPos;
  });

  it("valid Calamity arrangement passes", () => {
    const state = buildReadyState("calamity", 9, CALAMITY_INDICES);
    const result = evaluateSetupReadiness(state);
    expect(result).toEqual({ ready: true });
  });

  it("Calamity wrong month fails", () => {
    const state = withMonth(buildReadyState("calamity", 9, CALAMITY_INDICES), 0);
    const result = evaluateSetupReadiness(state);
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.issues.some((i) => i.code === "AGE_MONTH_MISMATCH")).toBe(true);
    }
  });

  it("Calamity wrong planet position fails", () => {
    const state = withOrreryPosition(buildReadyState("calamity", 9, CALAMITY_INDICES), "jupiter", 0);
    const result = evaluateSetupReadiness(state);
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.issues.some((i) => i.code === "AGE_ORRERY_POSITION_MISMATCH" && i.planetId === "jupiter")).toBe(true);
    }
  });

  it("Calamity does not enforce player-count restriction", () => {
    const state = buildReadyState("calamity", 9, CALAMITY_INDICES);
    const result = evaluateSetupReadiness(state);
    expect(result).toEqual({ ready: true });
  });
});
