import { describe, it, expect } from "vitest";
import { buildTableWizardsRows } from "../src/table-wizards-view-model";
import { PACT_SEAT_IDS, pactSeatDisplayName } from "../shared/domain/pact-seats";

const PLAYERS = [
  { playerId: "plr_1", name: "Alice" },
  { playerId: "plr_2", name: "Bob" },
  { playerId: "plr_3", name: "Carol" },
];

const WIZARDS = [
  { wizardId: "wiz_1", name: "Zoltan", portrayedByPlayerId: "plr_1" },
  { wizardId: "wiz_2", name: "Morgaine", portrayedByPlayerId: "plr_2" },
];

describe("buildTableWizardsRows", () => {
  it("produces all seven seats in canonical order", () => {
    const seats = {
      necromancer: { status: "present" as const, wizardId: "wiz_1", watcherPlayerId: "plr_3" },
      hierophant: { status: "silent" as const, wizardId: "wiz_2", watcherPlayerId: "plr_1" },
      warlock: { status: "absent" as const, wizardId: null, watcherPlayerId: "plr_2" },
      mariner: { status: null, wizardId: null, watcherPlayerId: null },
      faustian: { status: null, wizardId: null, watcherPlayerId: null },
      sage: { status: null, wizardId: null, watcherPlayerId: null },
      sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
    };
    const rows = buildTableWizardsRows(seats, PLAYERS, WIZARDS);
    expect(rows.length).toBe(7);
    expect(rows.map((r) => r.seatId)).toEqual([...PACT_SEAT_IDS]);
  });

  it("Present seat resolves wizard name, portraying player, and watcher", () => {
    const seats = {
      necromancer: { status: "present" as const, wizardId: "wiz_1", watcherPlayerId: "plr_3" },
      hierophant: { status: null, wizardId: null, watcherPlayerId: null },
      warlock: { status: null, wizardId: null, watcherPlayerId: null },
      mariner: { status: null, wizardId: null, watcherPlayerId: null },
      faustian: { status: null, wizardId: null, watcherPlayerId: null },
      sage: { status: null, wizardId: null, watcherPlayerId: null },
      sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
    };
    const rows = buildTableWizardsRows(seats, PLAYERS, WIZARDS);
    const necro = rows[0];
    expect(necro.seatName).toBe("Necromancer");
    expect(necro.statusLabel).toBe("Present");
    expect(necro.wizardName).toBe("Zoltan");
    expect(necro.portrayedByPlayerName).toBe("Alice");
    expect(necro.watcherPlayerName).toBe("Carol");
  });

  it("Silent seat shows Silent status with wizard", () => {
    const seats = {
      necromancer: { status: null, wizardId: null, watcherPlayerId: null },
      hierophant: { status: "silent" as const, wizardId: "wiz_2", watcherPlayerId: "plr_1" },
      warlock: { status: null, wizardId: null, watcherPlayerId: null },
      mariner: { status: null, wizardId: null, watcherPlayerId: null },
      faustian: { status: null, wizardId: null, watcherPlayerId: null },
      sage: { status: null, wizardId: null, watcherPlayerId: null },
      sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
    };
    const rows = buildTableWizardsRows(seats, PLAYERS, WIZARDS);
    const hiero = rows[1];
    expect(hiero.statusLabel).toBe("Silent");
    expect(hiero.wizardName).toBe("Morgaine");
    expect(hiero.portrayedByPlayerName).toBe("Bob");
    expect(hiero.watcherPlayerName).toBe("Alice");
  });

  it("Absent seat shows Absent with no wizard", () => {
    const seats = {
      necromancer: { status: null, wizardId: null, watcherPlayerId: null },
      hierophant: { status: null, wizardId: null, watcherPlayerId: null },
      warlock: { status: "absent" as const, wizardId: null, watcherPlayerId: "plr_2" },
      mariner: { status: null, wizardId: null, watcherPlayerId: null },
      faustian: { status: null, wizardId: null, watcherPlayerId: null },
      sage: { status: null, wizardId: null, watcherPlayerId: null },
      sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
    };
    const rows = buildTableWizardsRows(seats, PLAYERS, WIZARDS);
    const warlock = rows[2];
    expect(warlock.statusLabel).toBe("Absent");
    expect(warlock.wizardName).toBeNull();
    expect(warlock.watcherPlayerName).toBe("Bob");
  });

  it("Not configured seat shows Not configured with nulls", () => {
    const seats = {
      necromancer: { status: null, wizardId: null, watcherPlayerId: null },
      hierophant: { status: null, wizardId: null, watcherPlayerId: null },
      warlock: { status: null, wizardId: null, watcherPlayerId: null },
      mariner: { status: null, wizardId: null, watcherPlayerId: null },
      faustian: { status: null, wizardId: null, watcherPlayerId: null },
      sage: { status: null, wizardId: null, watcherPlayerId: null },
      sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
    };
    const rows = buildTableWizardsRows(seats, PLAYERS, WIZARDS);
    const mariner = rows[3];
    expect(mariner.statusLabel).toBe("Not configured");
    expect(mariner.wizardName).toBeNull();
    expect(mariner.portrayedByPlayerName).toBeNull();
    expect(mariner.watcherPlayerName).toBeNull();
  });
});
