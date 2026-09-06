import { describe, it, expect } from "vitest";
import { buildTableWizardsRows } from "../src/table-wizards-view-model";
import type { SeatRef } from "../src/table-wizards-view-model";
import { PACT_SEAT_IDS } from "../shared/domain/pact-seats";

const BLANK_CHARACTER = {
  elements: null,
  pactFragmentPersonalForm: null,
  familiarDescription: null,
  ageYears: null,
  publicChangesOfMagic: [],
  importantNotes: null,
  companionDescriptions: { air: null, fire: null, earth: null, water: null },
};

const PLAYERS = [
  { playerId: "plr_1", name: "Alice" },
  { playerId: "plr_2", name: "Bob" },
];

function emptySeats(): Record<string, SeatRef> {
  return Object.fromEntries(
    PACT_SEAT_IDS.map((sid) => [sid, { status: null, wizardId: null, watcherPlayerId: null }]),
  ) as Record<string, SeatRef>;
}

describe("buildTableWizardsRows element display", () => {
  it("includes all four element values when present", () => {
    const WIZARDS = [
      {
        wizardId: "wiz_1",
        name: "Zoltan",
        portrayedByPlayerId: "plr_1",
        character: { ...BLANK_CHARACTER, elements: { air: 3, fire: 1, earth: 2, water: 2 } },
      },
    ];
    const seats = emptySeats();
    seats.necromancer = { status: "present", wizardId: "wiz_1", watcherPlayerId: null };
    const rows = buildTableWizardsRows(seats, PLAYERS, WIZARDS);
    const necro = rows[0];
    expect(necro.elements).toEqual({ air: 3, fire: 1, earth: 2, water: 2 });
  });

  it("includes negative element values", () => {
    const WIZARDS = [
      {
        wizardId: "wiz_1",
        name: "Zoltan",
        portrayedByPlayerId: "plr_1",
        character: { ...BLANK_CHARACTER, elements: { air: -1, fire: 5, earth: 0, water: -3 } },
      },
    ];
    const seats = emptySeats();
    seats.necromancer = { status: "present", wizardId: "wiz_1", watcherPlayerId: null };
    const rows = buildTableWizardsRows(seats, PLAYERS, WIZARDS);
    const necro = rows[0];
    expect(necro.elements).toEqual({ air: -1, fire: 5, earth: 0, water: -3 });
  });

  it("reports null elements when elements are not set", () => {
    const WIZARDS = [
      {
        wizardId: "wiz_1",
        name: "Zoltan",
        portrayedByPlayerId: "plr_1",
        character: BLANK_CHARACTER,
      },
    ];
    const seats = emptySeats();
    seats.necromancer = { status: "present", wizardId: "wiz_1", watcherPlayerId: null };
    const rows = buildTableWizardsRows(seats, PLAYERS, WIZARDS);
    const necro = rows[0];
    expect(necro.elements).toBeNull();
  });

  it("reports null elements for seats with no wizard", () => {
    const seats = emptySeats();
    const rows = buildTableWizardsRows(seats, PLAYERS, []);
    const necro = rows[0];
    expect(necro.elements).toBeNull();
  });
});
