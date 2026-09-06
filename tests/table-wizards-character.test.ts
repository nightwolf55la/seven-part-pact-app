import { describe, it, expect } from "vitest";
import { PACT_SEAT_IDS, pactSeatDisplayName } from "../shared/domain/pact-seats";
import { buildTableWizardsRows } from "../src/table-wizards-view-model";

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

const WIZARDS = [
  { wizardId: "wiz_1", name: "Zoltan", portrayedByPlayerId: "plr_1", character: BLANK_CHARACTER },
  { wizardId: "wiz_2", name: "Morgaine", portrayedByPlayerId: "plr_2", character: BLANK_CHARACTER },
];

describe("buildTableWizardsRows with character", () => {
  it("includes wizardId on each row", () => {
    const seats = {
      necromancer: { status: "present" as const, wizardId: "wiz_1", watcherPlayerId: null },
      hierophant: { status: null, wizardId: null, watcherPlayerId: null },
      warlock: { status: null, wizardId: null, watcherPlayerId: null },
      mariner: { status: null, wizardId: null, watcherPlayerId: null },
      faustian: { status: null, wizardId: null, watcherPlayerId: null },
      sage: { status: null, wizardId: null, watcherPlayerId: null },
      sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
    };
    const rows = buildTableWizardsRows(seats, PLAYERS, WIZARDS);
    expect(rows[0].wizardId).toBe("wiz_1");
    expect(rows[1].wizardId).toBeNull();
  });

  it("accepts wizards with character data without error", () => {
    const seats = Object.fromEntries(
      PACT_SEAT_IDS.map((sid) => [sid, { status: null, wizardId: null, watcherPlayerId: null }]),
    );
    const rows = buildTableWizardsRows(seats, PLAYERS, WIZARDS);
    expect(rows.length).toBe(7);
  });
});
