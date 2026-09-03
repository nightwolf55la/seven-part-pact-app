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
import type { CurrentCampaignState, PlayerId, WizardId, PactSeatId, MonthOrdinal, MovablePlanetId } from "../shared/domain";

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

function buildReadyState(): CurrentCampaignState {
  let state = initialCampaignState();

  const players = [P1, P2, P3, P4, P5, P6, P7];
  for (let i = 0; i < players.length; i++) {
    state = applyAddPlayer(state, players[i], `Player ${i + 1}`).nextState;
  }

  state = applySetCampaignAge(state, "awakening").nextState;
  state = applySetFacilitator(state, P1).nextState;
  state = applySetSetupMonth(state, 0 as MonthOrdinal).nextState;

  for (const planetId of MOVABLE_PLANET_IDS) {
    state = applySetSetupOrreryPosition(state, planetId as MovablePlanetId, 0).nextState;
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

describe("C1C: evaluateSetupReadiness", () => {
  it("returns ready:true for a fully ready Setup", () => {
    const state = buildReadyState();
    const result = evaluateSetupReadiness(state);
    expect(result).toEqual({ ready: true });
  });

  it("returns LIFECYCLE_NOT_SETUP for Play state", () => {
    const state = buildReadyState();
    const playState: CurrentCampaignState = {
      ...state,
      lifecycle: {
        kind: "play" as const,
        phase: "new_moon" as const,
        orrery: {
          saturn: legalPositionsForPlanet("saturn")[0],
          jupiter: legalPositionsForPlanet("jupiter")[0],
          mars: legalPositionsForPlanet("mars")[0],
          venus: legalPositionsForPlanet("venus")[0],
          mercury: legalPositionsForPlanet("mercury")[0],
        },
        currentMonth: { timeParticipants: [], engagements: [], wizardmootAttendance: null },
      } as CurrentCampaignState["lifecycle"],
    };
    const result = evaluateSetupReadiness(playState);
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("LIFECYCLE_NOT_SETUP");
    }
  });

  it("returns AGE_NOT_SELECTED when ageId is null", () => {
    const state = buildReadyState();
    const result = evaluateSetupReadiness({
      ...state,
      configuration: { ...state.configuration, ageId: null },
    });
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.issues.some((i) => i.code === "AGE_NOT_SELECTED")).toBe(true);
    }
  });

  it("returns FACILITATOR_NOT_SELECTED when facilitator is null", () => {
    const state = buildReadyState();
    const result = evaluateSetupReadiness({
      ...state,
      configuration: { ...state.configuration, facilitatorPlayerId: null },
    });
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.issues.some((i) => i.code === "FACILITATOR_NOT_SELECTED")).toBe(true);
    }
  });

  it("returns FACILITATOR_PLAYER_NOT_FOUND when facilitator references a nonexistent player", () => {
    const state = buildReadyState();
    const result = evaluateSetupReadiness({
      ...state,
      configuration: { ...state.configuration, facilitatorPlayerId: "plr_99999999-9999-9999-9999-999999999999" as PlayerId },
    });
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.issues.some((i) => i.code === "FACILITATOR_PLAYER_NOT_FOUND")).toBe(true);
    }
  });

  it("returns MONTH_ORDINAL_NOT_SET when monthOrdinal is null", () => {
    const state = buildReadyState();
    const result = evaluateSetupReadiness({
      ...state,
      calendar: { monthOrdinal: null },
    });
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.issues.some((i) => i.code === "MONTH_ORDINAL_NOT_SET")).toBe(true);
    }
  });

  it("returns ORRERY_POSITION_NOT_SET for a null planet position", () => {
    const state = buildReadyState();
    const setupOrrery = { ...state.lifecycle.orrery, saturn: null };
    const result = evaluateSetupReadiness({
      ...state,
      lifecycle: { ...state.lifecycle, orrery: setupOrrery } as typeof state.lifecycle,
    });
    expect(result.ready).toBe(false);
    if (!result.ready) {
      const orreryIssues = result.issues.filter((i) => i.code === "ORRERY_POSITION_NOT_SET");
      expect(orreryIssues).toHaveLength(1);
      expect(orreryIssues[0].planetId).toBe("saturn");
    }
  });

  it("returns SEAT_STATUS_NOT_CLASSIFIED when a seat status is null", () => {
    const state = buildReadyState();
    const pactSeats = {
      ...state.pactSeats,
      necromancer: { ...state.pactSeats.necromancer, status: null },
    } as typeof state.pactSeats;
    const result = evaluateSetupReadiness({ ...state, pactSeats });
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.issues.some((i) => i.code === "SEAT_STATUS_NOT_CLASSIFIED" && i.seatId === "necromancer")).toBe(true);
    }
  });

  it("returns PRESENT_SEAT_MISSING_WIZARD when a present seat has no wizard", () => {
    const state = buildReadyState();
    const pactSeats = {
      ...state.pactSeats,
      necromancer: { ...state.pactSeats.necromancer, wizardId: null },
    } as typeof state.pactSeats;
    const result = evaluateSetupReadiness({ ...state, pactSeats });
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.issues.some((i) => i.code === "PRESENT_SEAT_MISSING_WIZARD" && i.seatId === "necromancer")).toBe(true);
    }
  });

  it("returns SILENT_SEAT_MISSING_WIZARD when a silent seat has no wizard", () => {
    const state = buildReadyState();
    const pactSeats = {
      ...state.pactSeats,
      necromancer: { ...state.pactSeats.necromancer, status: "silent" as const, wizardId: null },
    } as typeof state.pactSeats;
    const result = evaluateSetupReadiness({ ...state, pactSeats });
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.issues.some((i) => i.code === "SILENT_SEAT_MISSING_WIZARD" && i.seatId === "necromancer")).toBe(true);
    }
  });

  it("returns PRESENT_WIZARD_MISSING_PORTRAYAL when a present wizard has no portraying player", () => {
    const state = buildReadyState();
    const wizards = state.wizards.map((w) =>
      w.wizardId === wizId(1) ? { ...w, portrayedByPlayerId: null } : w,
    );
    const result = evaluateSetupReadiness({ ...state, wizards });
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.issues.some((i) => i.code === "PRESENT_WIZARD_MISSING_PORTRAYAL" && i.seatId === "necromancer")).toBe(true);
    }
  });

  it("returns WATCHER_NOT_ASSIGNED when a watcher is null", () => {
    const state = buildReadyState();
    const pactSeats = {
      ...state.pactSeats,
      necromancer: { ...state.pactSeats.necromancer, watcherPlayerId: null },
    } as typeof state.pactSeats;
    const result = evaluateSetupReadiness({ ...state, pactSeats });
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.issues.some((i) => i.code === "WATCHER_NOT_ASSIGNED" && i.seatId === "necromancer")).toBe(true);
    }
  });

  it("allows one player to hold multiple Watcher assignments", () => {
    const state = buildReadyState();
    const pactSeats = {
      ...state.pactSeats,
      hierophant: { ...state.pactSeats.hierophant, watcherPlayerId: P1 },
    } as typeof state.pactSeats;
    const result = evaluateSetupReadiness({ ...state, pactSeats });
    expect(result).toEqual({ ready: true });
  });

  it("returns PLAYER_PORTRAYS_MULTIPLE_PRESENT_WIZARDS as readiness logic, not structural validation failure", () => {
    const state = buildReadyState();
    const wizards = state.wizards.map((w) =>
      w.wizardId === wizId(2) ? { ...w, portrayedByPlayerId: P1 } : w,
    );
    const result = evaluateSetupReadiness({ ...state, wizards });
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.issues.some((i) => i.code === "PLAYER_PORTRAYS_MULTIPLE_PRESENT_WIZARDS")).toBe(true);
    }
  });

  it("does not mutate the input state", () => {
    const state = buildReadyState();
    const snapshot = JSON.parse(JSON.stringify(state));
    evaluateSetupReadiness(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(snapshot);
  });

  it("collects multiple issues at once rather than failing on the first", () => {
    const state = buildReadyState();
    const broken = {
      ...state,
      configuration: { ageId: null, facilitatorPlayerId: null },
      calendar: { monthOrdinal: null },
      lifecycle: { ...state.lifecycle, orrery: { ...state.lifecycle.orrery, saturn: null } as typeof state.lifecycle.orrery },
      pactSeats: {
        ...state.pactSeats,
        necromancer: { ...state.pactSeats.necromancer, status: null, watcherPlayerId: null },
      } as typeof state.pactSeats,
    } as CurrentCampaignState;
    const result = evaluateSetupReadiness(broken);
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.issues.length).toBeGreaterThanOrEqual(5);
      const codes = new Set(result.issues.map((i) => i.code));
      expect(codes.has("AGE_NOT_SELECTED")).toBe(true);
      expect(codes.has("FACILITATOR_NOT_SELECTED")).toBe(true);
      expect(codes.has("MONTH_ORDINAL_NOT_SET")).toBe(true);
      expect(codes.has("ORRERY_POSITION_NOT_SET")).toBe(true);
      expect(codes.has("SEAT_STATUS_NOT_CLASSIFIED")).toBe(true);
      expect(codes.has("WATCHER_NOT_ASSIGNED")).toBe(true);
    }
  });
});
