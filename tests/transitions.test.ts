import { describe, it, expect } from "vitest";
import {
  applyMoveMonth,
  INITIAL_MONTH_ORDINAL,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  CURRENT_STATE_SCHEMA_VERSION,
  displayNameFromOrdinal,
} from "../shared/domain";
import type { CurrentCampaignState, MonthOrdinal } from "../shared/domain";

function makeState(monthOrdinal: number): CurrentCampaignState {
  return {
    schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: monthOrdinal as MonthOrdinal },
    configuration: { ageId: null, facilitatorPlayerId: null },
    players: [],
    wizards: [],
    pactSeats: {
      necromancer: { status: null, wizardId: null, watcherPlayerId: null },
      hierophant: { status: null, wizardId: null, watcherPlayerId: null },
      warlock: { status: null, wizardId: null, watcherPlayerId: null },
      mariner: { status: null, wizardId: null, watcherPlayerId: null },
      faustian: { status: null, wizardId: null, watcherPlayerId: null },
      sage: { status: null, wizardId: null, watcherPlayerId: null },
      sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
    },
    lifecycle: {
      kind: "play" as const,
      phase: "new_moon" as const,
      orrery: { saturn: 0 as any, jupiter: 9000 as any, mars: 18000 as any, venus: 27000 as any, mercury: 4500 as any },
      currentMonth: { timeParticipants: [], engagements: [], wizardmootAttendance: null },
    },
    wizardmootHistory: [],
  };
}

describe("applyMoveMonth", () => {
  it("forward from April (0) produces May (1)", () => {
    const state = makeState(0);
    const result = applyMoveMonth(state, "forward");
    expect(result.nextState.calendar.monthOrdinal).toBe(1);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].data.direction).toBe("forward");
    expect(result.events[0].data.fromOrdinal).toBe(0);
    expect(result.events[0].data.toOrdinal).toBe(1);
  });

  it("backward from April (0) produces March (-1)", () => {
    const state = makeState(0);
    const result = applyMoveMonth(state, "backward");
    expect(result.nextState.calendar.monthOrdinal).toBe(-1);
    expect(result.events[0].data.direction).toBe("backward");
    expect(result.events[0].data.fromOrdinal).toBe(0);
    expect(result.events[0].data.toOrdinal).toBe(-1);
  });

  it("forward from March (11) wraps display to April (ordinal 12)", () => {
    const state = makeState(11);
    const result = applyMoveMonth(state, "forward");
    expect(result.nextState.calendar.monthOrdinal).toBe(12);
    expect(displayNameFromOrdinal(result.nextState.calendar.monthOrdinal!)).toBe("April");
  });

  it("backward from ordinal -12 produces -13 (March display)", () => {
    const state = makeState(-12);
    const result = applyMoveMonth(state, "backward");
    expect(result.nextState.calendar.monthOrdinal).toBe(-13);
    expect(displayNameFromOrdinal(result.nextState.calendar.monthOrdinal!)).toBe("March");
  });

  it("preserves schemaVersion and ruleset", () => {
    const state = makeState(5);
    const result = applyMoveMonth(state, "forward");
    expect(result.nextState.schemaVersion).toBe(state.schemaVersion);
    expect(result.nextState.ruleset.id).toBe(state.ruleset.id);
    expect(result.nextState.ruleset.version).toBe(state.ruleset.version);
  });

  it("does not mutate source state", () => {
    const state = makeState(3);
    const originalOrdinal = state.calendar.monthOrdinal;
    applyMoveMonth(state, "forward");
    expect(state.calendar.monthOrdinal).toBe(originalOrdinal);
  });

  it("produces exactly one event of type month_changed version 1", () => {
    const state = makeState(7);
    const result = applyMoveMonth(state, "backward");
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe("month_changed");
    expect(result.events[0].version).toBe(1);
  });

  it("event data contains only direction, fromOrdinal, toOrdinal", () => {
    const state = makeState(0);
    const result = applyMoveMonth(state, "forward");
    expect(Object.keys(result.events[0].data).sort()).toEqual(
      ["direction", "fromOrdinal", "toOrdinal"],
    );
  });

  it("multi-cycle positive ordinal (24) forward -> 25", () => {
    const state = makeState(24);
    const result = applyMoveMonth(state, "forward");
    expect(result.nextState.calendar.monthOrdinal).toBe(25);
    expect(displayNameFromOrdinal(25)).toBe("May");
  });
});
