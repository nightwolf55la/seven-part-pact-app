import { describe, it, expect } from "vitest";
import {
  playerIdsPortrayingSeatedWizards,
  eligiblePortrayingPlayersForNewWizard,
  eligiblePortrayingPlayersForWizard,
  isUnseatedWizardAssignableToSeat,
} from "../src/setup-view-model";

interface Player {
  playerId: string;
  name: string;
}
interface Wizard {
  wizardId: string;
  name: string;
  portrayedByPlayerId: string | null;
}
interface Seat {
  status: string | null;
  wizardId: string | null;
  watcherPlayerId: string | null;
}
type PactSeats = Record<string, Seat>;

const PA: Player = { playerId: "plr_A", name: "Alice" };
const PB: Player = { playerId: "plr_B", name: "Bob" };
const PC: Player = { playerId: "plr_C", name: "Carol" };

function wiz(id: string, portrayer: string | null): Wizard {
  return { wizardId: id, name: id, portrayedByPlayerId: portrayer };
}
function seat(wizardId: string | null, watcher: string | null = null, status: string | null = null): Seat {
  return { status, wizardId, watcherPlayerId: watcher };
}
const emptySeats: PactSeats = {
  necromancer: seat(null), hierophant: seat(null), warlock: seat(null),
  mariner: seat(null), faustian: seat(null), sage: seat(null), sorcerer: seat(null),
};

describe("playerIdsPortrayingSeatedWizards", () => {
  it("returns player IDs for wizards currently seated in any pact seat", () => {
    const wizards = [wiz("w1", "plr_A"), wiz("w2", "plr_B"), wiz("w3", null)];
    const pactSeats: PactSeats = {
      ...emptySeats,
      necromancer: seat("w1"),
      hierophant: seat("w2"),
      warlock: seat("w3"),
    };
    const result = playerIdsPortrayingSeatedWizards(pactSeats, wizards);
    expect(result.has("plr_A")).toBe(true);
    expect(result.has("plr_B")).toBe(true);
    expect(result.size).toBe(2);
  });

  it("does not count unseated wizards", () => {
    const wizards = [wiz("w1", "plr_A"), wiz("w2", "plr_B")];
    const pactSeats: PactSeats = {
      ...emptySeats,
      necromancer: seat("w1"),
    };
    const result = playerIdsPortrayingSeatedWizards(pactSeats, wizards);
    expect(result.has("plr_A")).toBe(true);
    expect(result.has("plr_B")).toBe(false);
  });

  it("does not count watcher-only player as portrayer", () => {
    const wizards: Wizard[] = [];
    const pactSeats: PactSeats = {
      ...emptySeats,
      necromancer: seat(null, "plr_A", "silent"),
    };
    const result = playerIdsPortrayingSeatedWizards(pactSeats, wizards);
    expect(result.has("plr_A")).toBe(false);
    expect(result.size).toBe(0);
  });
});

describe("eligiblePortrayingPlayersForNewWizard", () => {
  it("excludes players already portraying a seated wizard", () => {
    const wizards = [wiz("w1", "plr_A"), wiz("w2", null)];
    const pactSeats: PactSeats = {
      ...emptySeats,
      necromancer: seat("w1"),
    };
    const result = eligiblePortrayingPlayersForNewWizard([PA, PB], pactSeats, wizards);
    expect(result.find((p) => p.playerId === "plr_A")).toBeUndefined();
    expect(result.find((p) => p.playerId === "plr_B")).toBeDefined();
  });

  it("excludes player even when seated wizard is Silent", () => {
    const wizards = [wiz("w1", "plr_A")];
    const pactSeats: PactSeats = {
      ...emptySeats,
      necromancer: seat("w1", null, "silent"),
    };
    const result = eligiblePortrayingPlayersForNewWizard([PA, PB], pactSeats, wizards);
    expect(result.find((p) => p.playerId === "plr_A")).toBeUndefined();
    expect(result.find((p) => p.playerId === "plr_B")).toBeDefined();
  });

  it("does not exclude player who is only a watcher, not a portrayer", () => {
    const wizards: Wizard[] = [];
    const pactSeats: PactSeats = {
      ...emptySeats,
      necromancer: seat(null, "plr_A", "silent"),
    };
    const result = eligiblePortrayingPlayersForNewWizard([PA, PB], pactSeats, wizards);
    expect(result.find((p) => p.playerId === "plr_A")).toBeDefined();
  });

  it("unseated wizard's portrayer is NOT excluded (domain only checks seated wizards)", () => {
    const wizards = [wiz("w_unseated", "plr_A")];
    const pactSeats: PactSeats = { ...emptySeats };
    const result = eligiblePortrayingPlayersForNewWizard([PA, PB], pactSeats, wizards);
    expect(result.find((p) => p.playerId === "plr_A")).toBeDefined();
  });
});

describe("eligiblePortrayingPlayersForWizard", () => {
  it("keeps the wizard's own current portrayer, excludes portrayers of other seated wizards", () => {
    const wizards = [wiz("wX", "plr_A"), wiz("wY", "plr_B")];
    const pactSeats: PactSeats = {
      ...emptySeats,
      necromancer: seat("wX"),
      hierophant: seat("wY"),
    };
    const result = eligiblePortrayingPlayersForWizard([PA, PB, PC], pactSeats, wizards, "wX");
    expect(result.find((p) => p.playerId === "plr_A")).toBeDefined();
    expect(result.find((p) => p.playerId === "plr_B")).toBeUndefined();
    expect(result.find((p) => p.playerId === "plr_C")).toBeDefined();
  });

  it("excludes portrayer of another seated Silent wizard", () => {
    const wizards = [wiz("wX", "plr_A"), wiz("wY", "plr_B")];
    const pactSeats: PactSeats = {
      ...emptySeats,
      necromancer: seat("wX"),
      hierophant: seat("wY", null, "silent"),
    };
    const result = eligiblePortrayingPlayersForWizard([PA, PB, PC], pactSeats, wizards, "wX");
    expect(result.find((p) => p.playerId === "plr_A")).toBeDefined();
    expect(result.find((p) => p.playerId === "plr_B")).toBeUndefined();
  });

  it("includes all players when no other seated wizard has a portrayer", () => {
    const wizards = [wiz("wX", null)];
    const pactSeats: PactSeats = {
      ...emptySeats,
      necromancer: seat("wX"),
    };
    const result = eligiblePortrayingPlayersForWizard([PA, PB, PC], pactSeats, wizards, "wX");
    expect(result.length).toBe(3);
  });
});

describe("isUnseatedWizardAssignableToSeat", () => {
  it("returns false when wizard's portrayer already portrays a different seated wizard", () => {
    const wizards = [wiz("wU", "plr_A"), wiz("wS", "plr_A")];
    const pactSeats: PactSeats = {
      ...emptySeats,
      necromancer: seat("wS"),
    };
    expect(isUnseatedWizardAssignableToSeat(pactSeats, wizards, "wU")).toBe(false);
  });

  it("returns true when wizard's portrayer is not used by any seated wizard", () => {
    const wizards = [wiz("wU", "plr_C")];
    const pactSeats: PactSeats = { ...emptySeats };
    expect(isUnseatedWizardAssignableToSeat(pactSeats, wizards, "wU")).toBe(true);
  });

  it("returns true when wizard has no portrayer", () => {
    const wizards = [wiz("wU", null)];
    const pactSeats: PactSeats = {
      ...emptySeats,
      necromancer: seat("wS"),
    };
    expect(isUnseatedWizardAssignableToSeat(pactSeats, wizards, "wU")).toBe(true);
  });

  it("returns true when wizard's portrayer is only a watcher, not a portrayer of a seated wizard", () => {
    const wizards = [wiz("wU", "plr_A")];
    const pactSeats: PactSeats = {
      ...emptySeats,
      necromancer: seat(null, "plr_A", "silent"),
    };
    expect(isUnseatedWizardAssignableToSeat(pactSeats, wizards, "wU")).toBe(true);
  });
});
