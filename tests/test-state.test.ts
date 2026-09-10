import { describe, expect, it } from "vitest";
import type { MonthOrdinal, PlayerId } from "../shared/domain";
import {
  initialCampaignState,
  validateCampaignState,
  validateCampaignStateV5Candidate,
} from "../shared/domain";
import { makeTestCampaignStateV5 } from "./test-state";

describe("makeTestCampaignStateV5", () => {
  it("returns the canonical current V5 baseline and applies a shallow top-level override", () => {
    const baseline = makeTestCampaignStateV5();
    expect(baseline).toEqual(initialCampaignState());
    expect(baseline.schemaVersion).toBe(5);
    expect(() => validateCampaignState(baseline)).not.toThrow();
    expect(() => validateCampaignStateV5Candidate(baseline)).not.toThrow();

    const calendar = { monthOrdinal: 7 as MonthOrdinal };
    const players = [
      { playerId: "plr_00000000-0000-0000-0000-00000000000a" as PlayerId, name: "Alice" },
    ];
    const overridden = makeTestCampaignStateV5({ calendar, players });
    expect(overridden.calendar).toEqual(calendar);
    expect(overridden.players).toEqual(players);
    expect(overridden.configuration).toEqual(baseline.configuration);
    expect(overridden.world).toEqual(baseline.world);
  });
});
