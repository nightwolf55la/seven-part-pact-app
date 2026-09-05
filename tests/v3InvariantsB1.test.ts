import { describe, it, expect } from "vitest";
import { validateCampaignState, DomainError } from "../shared/domain";
import { initialCampaignState } from "../shared/domain/initial-state";

const WIZ1 = "wiz_00000000-0000-0000-0000-000000000001";
const WIZ2 = "wiz_00000000-0000-0000-0000-000000000002";
const PLR1 = "plr_00000000-0000-0000-0000-000000000001";
const ALC1 = "alc_00000000-0000-0000-0000-000000000001";
const ALC2 = "alc_00000000-0000-0000-0000-000000000002";
const ENG1 = "eng_00000000-0000-0000-0000-000000000001";
const ENG2 = "eng_00000000-0000-0000-0000-000000000002";

function playState(overrides: Record<string, unknown> = {}): any {
  const base = initialCampaignState();
  return {
    ...base,
    calendar: { monthOrdinal: 0 },
    players: [{ playerId: PLR1, name: "P1" }],
    wizards: [
      { wizardId: WIZ1, name: "W1", portrayedByPlayerId: PLR1 },
      { wizardId: WIZ2, name: "W2", portrayedByPlayerId: null },
    ],
    lifecycle: {
      kind: "play",
      phase: "new_moon",
      orrery: { saturn: 500, jupiter: 0, mars: 0, venus: 0, mercury: 0 },
      currentMonth: {
        timeParticipants: [],
        engagements: [],
        wizardmootAttendance: null,
      },
    },
    ...overrides,
  };
}

function expectInvalid(state: unknown, fragment: string): void {
  try {
    validateCampaignState(state);
    expect.unreachable("should have thrown");
  } catch (e) {
    expect(e).toBeInstanceOf(DomainError);
    expect((e as DomainError).code).toBe("INVALID_CAMPAIGN_STATE");
    expect((e as Error).message).toContain(fragment);
  }
}

// --- 1. TIME PARTICIPANT: duplicate monthly participant identities ---

describe("Time Participant invariants", () => {
  it("rejects duplicate wizardId in timeParticipants", () => {
    const state = playState({
      lifecycle: {
        kind: "play",
        phase: "new_moon",
        orrery: { saturn: 500, jupiter: 0, mars: 0, venus: 0, mercury: 0 },
        currentMonth: {
          timeParticipants: [
            { participant: { kind: "wizard", wizardId: WIZ1 }, effectiveBudget: 3, rescheduleAllowance: 1, reschedulesUsed: 0, allocations: [] },
            { participant: { kind: "wizard", wizardId: WIZ1 }, effectiveBudget: 3, rescheduleAllowance: 1, reschedulesUsed: 0, allocations: [] },
          ],
          engagements: [],
          wizardmootAttendance: null,
        },
      },
    });
    expectInvalid(state, "duplicate");
  });

  it("accepts distinct wizardIds in timeParticipants", () => {
    const state = playState({
      lifecycle: {
        kind: "play",
        phase: "new_moon",
        orrery: { saturn: 500, jupiter: 0, mars: 0, venus: 0, mercury: 0 },
        currentMonth: {
          timeParticipants: [
            { participant: { kind: "wizard", wizardId: WIZ1 }, effectiveBudget: 3, rescheduleAllowance: 1, reschedulesUsed: 0, allocations: [] },
            { participant: { kind: "wizard", wizardId: WIZ2 }, effectiveBudget: 3, rescheduleAllowance: 1, reschedulesUsed: 0, allocations: [] },
          ],
          engagements: [],
          wizardmootAttendance: null,
        },
      },
    });
    expect(() => validateCampaignState(state)).not.toThrow();
  });
});

// --- 2. TIME: Special Use no arbitrary payload ---

describe("Special Use destination invariants", () => {
  it("rejects special_use with extra payload fields", () => {
    const state = playState({
      lifecycle: {
        kind: "play",
        phase: "new_moon",
        orrery: { saturn: 500, jupiter: 0, mars: 0, venus: 0, mercury: 0 },
        currentMonth: {
          timeParticipants: [
            {
              participant: { kind: "wizard", wizardId: WIZ1 },
              effectiveBudget: 3, rescheduleAllowance: 1, reschedulesUsed: 0,
              allocations: [
                {
                  allocationId: ALC1,
                  destination: { kind: "special_use", description: "ritual", extraPayload: "sneaky" } as any,
                  note: null,
                  resolution: "pending",
                },
              ],
            },
          ],
          engagements: [],
          wizardmootAttendance: null,
        },
      },
    });
    expectInvalid(state, "special_use");
  });

  it("accepts special_use with only kind and description", () => {
    const state = playState({
      lifecycle: {
        kind: "play",
        phase: "new_moon",
        orrery: { saturn: 500, jupiter: 0, mars: 0, venus: 0, mercury: 0 },
        currentMonth: {
          timeParticipants: [
            {
              participant: { kind: "wizard", wizardId: WIZ1 },
              effectiveBudget: 3, rescheduleAllowance: 1, reschedulesUsed: 0,
              allocations: [
                {
                  allocationId: ALC1,
                  destination: { kind: "special_use", description: "ritual" },
                  note: null,
                  resolution: "pending",
                },
              ],
            },
          ],
          engagements: [],
          wizardmootAttendance: null,
        },
      },
    });
    expect(() => validateCampaignState(state)).not.toThrow();
  });
});

// --- 3a. TIME: Orrery-position no planet/direction choice ---

describe("Orrery scheduling invariants", () => {
  it("rejects orrery with extra planet/choice field", () => {
    const state = playState({
      lifecycle: {
        kind: "play",
        phase: "new_moon",
        orrery: { saturn: 500, jupiter: 0, mars: 0, venus: 0, mercury: 0, planetChoice: "mars" } as any,
        currentMonth: {
          timeParticipants: [],
          engagements: [],
          wizardmootAttendance: null,
        },
      },
    });
    expectInvalid(state, "orrery");
  });
});

// --- 3b. TIME: Orrery Time destination must not carry resolution-time choices ---

describe("Orrery Time destination invariants", () => {
  it("rejects orrery destination with planet/direction fields", () => {
    const state = playState({
      lifecycle: {
        kind: "play",
        phase: "new_moon",
        orrery: { saturn: 500, jupiter: 0, mars: 0, venus: 0, mercury: 0 },
        currentMonth: {
          timeParticipants: [
            {
              participant: { kind: "wizard", wizardId: WIZ1 },
              effectiveBudget: 3, rescheduleAllowance: 1, reschedulesUsed: 0,
              allocations: [
                {
                  allocationId: ALC1,
                  destination: { kind: "orrery", planet: "mars", direction: "forward" } as any,
                  note: null,
                  resolution: "pending",
                },
              ],
            },
          ],
          engagements: [],
          wizardmootAttendance: null,
        },
      },
    });
    expectInvalid(state, "orrery");
  });

  it("accepts orrery destination with only kind", () => {
    const state = playState({
      lifecycle: {
        kind: "play",
        phase: "new_moon",
        orrery: { saturn: 500, jupiter: 0, mars: 0, venus: 0, mercury: 0 },
        currentMonth: {
          timeParticipants: [
            {
              participant: { kind: "wizard", wizardId: WIZ1 },
              effectiveBudget: 3, rescheduleAllowance: 1, reschedulesUsed: 0,
              allocations: [
                {
                  allocationId: ALC1,
                  destination: { kind: "orrery" },
                  note: null,
                  resolution: "pending",
                },
              ],
            },
          ],
          engagements: [],
          wizardmootAttendance: null,
        },
      },
    });
    expect(() => validateCampaignState(state)).not.toThrow();
  });
});

// --- 4. ENGAGEMENT LINKAGE ---

describe("Engagement linkage invariants", () => {
  function stateWithEngagement(allocOverrides: any, engOverrides: any) {
    return playState({
      lifecycle: {
        kind: "play",
        phase: "new_moon",
        orrery: { saturn: 500, jupiter: 0, mars: 0, venus: 0, mercury: 0 },
        currentMonth: {
          timeParticipants: [
            {
              participant: { kind: "wizard", wizardId: WIZ1 },
              effectiveBudget: 3, rescheduleAllowance: 1, reschedulesUsed: 0,
              allocations: [
                {
                  allocationId: ALC1,
                  destination: { kind: "engagement", engagementId: ENG1 },
                  note: null,
                  resolution: "pending",
                  ...allocOverrides,
                },
              ],
            },
          ],
          engagements: [
            {
              engagementId: ENG1,
              actingWizardId: WIZ1,
              target: null,
              resolution: "pending",
              linkedTimeAllocationId: ALC1,
              ...engOverrides,
            },
          ],
          wizardmootAttendance: null,
        },
      },
    });
  }

  it("rejects linked allocation belonging to different wizard", () => {
    const state = playState({
      lifecycle: {
        kind: "play",
        phase: "new_moon",
        orrery: { saturn: 500, jupiter: 0, mars: 0, venus: 0, mercury: 0 },
        currentMonth: {
          timeParticipants: [
            {
              participant: { kind: "wizard", wizardId: WIZ2 },
              effectiveBudget: 3, rescheduleAllowance: 1, reschedulesUsed: 0,
              allocations: [
                { allocationId: ALC1, destination: { kind: "engagement", engagementId: ENG1 }, note: null, resolution: "pending" },
              ],
            },
          ],
          engagements: [
            { engagementId: ENG1, actingWizardId: WIZ1, target: null, resolution: "pending", linkedTimeAllocationId: ALC1 },
          ],
          wizardmootAttendance: null,
        },
      },
    });
    expectInvalid(state, "does not belong to the acting wizard");
  });

  it("rejects linked allocation whose destination is not engagement", () => {
    const state = playState({
      lifecycle: {
        kind: "play",
        phase: "new_moon",
        orrery: { saturn: 500, jupiter: 0, mars: 0, venus: 0, mercury: 0 },
        currentMonth: {
          timeParticipants: [
            {
              participant: { kind: "wizard", wizardId: WIZ1 },
              effectiveBudget: 3, rescheduleAllowance: 1, reschedulesUsed: 0,
              allocations: [
                { allocationId: ALC1, destination: { kind: "domain" }, note: null, resolution: "pending" },
              ],
            },
          ],
          engagements: [
            { engagementId: ENG1, actingWizardId: WIZ1, target: null, resolution: "pending", linkedTimeAllocationId: ALC1 },
          ],
          wizardmootAttendance: null,
        },
      },
    });
    expectInvalid(state, "destination is not engagement");
  });

  it("rejects linked allocation whose engagementId mismatches", () => {
    const state = playState({
      lifecycle: {
        kind: "play",
        phase: "new_moon",
        orrery: { saturn: 500, jupiter: 0, mars: 0, venus: 0, mercury: 0 },
        currentMonth: {
          timeParticipants: [
            {
              participant: { kind: "wizard", wizardId: WIZ1 },
              effectiveBudget: 3, rescheduleAllowance: 1, reschedulesUsed: 0,
              allocations: [
                { allocationId: ALC1, destination: { kind: "engagement", engagementId: ENG2 }, note: null, resolution: "pending" },
              ],
            },
          ],
          engagements: [
            { engagementId: ENG1, actingWizardId: WIZ1, target: null, resolution: "pending", linkedTimeAllocationId: ALC1 },
          ],
          wizardmootAttendance: null,
        },
      },
    });
    expectInvalid(state, "does not identify the same engagement");
  });

  it("rejects one allocation linked by multiple engagements", () => {
    const state = playState({
      lifecycle: {
        kind: "play",
        phase: "new_moon",
        orrery: { saturn: 500, jupiter: 0, mars: 0, venus: 0, mercury: 0 },
        currentMonth: {
          timeParticipants: [
            {
              participant: { kind: "wizard", wizardId: WIZ1 },
              effectiveBudget: 3, rescheduleAllowance: 1, reschedulesUsed: 0,
              allocations: [
                { allocationId: ALC1, destination: { kind: "engagement", engagementId: ENG1 }, note: null, resolution: "pending" },
              ],
            },
          ],
          engagements: [
            { engagementId: ENG1, actingWizardId: WIZ1, target: null, resolution: "pending", linkedTimeAllocationId: ALC1 },
            { engagementId: ENG2, actingWizardId: WIZ1, target: null, resolution: "pending", linkedTimeAllocationId: ALC1 },
          ],
          wizardmootAttendance: null,
        },
      },
    });
    expectInvalid(state, "linked by multiple");
  });

  it("accepts valid engagement linkage", () => {
    expect(() => validateCampaignState(stateWithEngagement({}, {}))).not.toThrow();
  });
});

// --- 5. WIZARDMOOT HISTORY ---

describe("Wizardmoot history invariants", () => {
  it("rejects duplicate monthOrdinal in history", () => {
    const state = playState({
      wizardmootHistory: [
        { monthOrdinal: 1, attendance: [{ wizardId: WIZ1, attended: true }] },
        { monthOrdinal: 1, attendance: [{ wizardId: WIZ2, attended: false }] },
      ],
    });
    expectInvalid(state, "duplicate");
  });

  it("rejects duplicate wizard attendance within a history month", () => {
    const state = playState({
      wizardmootHistory: [
        {
          monthOrdinal: 1,
          attendance: [
            { wizardId: WIZ1, attended: true },
            { wizardId: WIZ1, attended: false },
          ],
        },
      ],
    });
    expectInvalid(state, "duplicate");
  });

  it("rejects history entry referencing non-existent wizard", () => {
    const state = playState({
      wizardmootHistory: [
        { monthOrdinal: 1, attendance: [{ wizardId: "wiz_99999999-9999-9999-9999-999999999999", attended: true }] },
      ],
    });
    expectInvalid(state, "does not reference an existing wizard");
  });

  it("accepts valid wizardmoot history", () => {
    const state = playState({
      wizardmootHistory: [
        { monthOrdinal: 1, attendance: [{ wizardId: WIZ1, attended: true }] },
        { monthOrdinal: 2, attendance: [{ wizardId: WIZ1, attended: true }, { wizardId: WIZ2, attended: false }] },
      ],
    });
    expect(() => validateCampaignState(state)).not.toThrow();
  });
});
