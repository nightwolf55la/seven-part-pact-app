import { describe, it, expect } from "vitest";
import type { IsleCreatedEventV1, IsleUpdatedEventV1, IsleId } from "../shared/domain";
import {
  CAMPAIGN_COMMAND_TYPES,
  isLogicalStateCommandType,
  createIsleFingerprint,
  updateIsleFingerprint,
  mapEventToActivityEntry,
} from "../shared/domain";

const CAMPAIGN_ID = "cmp_00000000-0000-0000-0000-000000000001";
import { validateEventCoherenceForTest } from "../convex/canonicalCommit";
import type { CanonicalCommitInput } from "../convex/canonicalCommit";
import type { CurrentCampaignState } from "../shared/domain";

describe("Isle persistence contracts", () => {
  // 1. Command types are active and logical-state
  it("CAMPAIGN_COMMAND_TYPES contains create_isle and update_isle as logical-state commands", () => {
    const types = CAMPAIGN_COMMAND_TYPES as readonly string[];
    expect(types).toContain("create_isle");
    expect(types).toContain("update_isle");
    expect(isLogicalStateCommandType("create_isle")).toBe(true);
    expect(isLogicalStateCommandType("update_isle")).toBe(true);
  });

  // 2. createIsleFingerprint is deterministic and sensitive to input
  it("createIsleFingerprint is deterministic and changes when input changes", () => {
    const fp1 = createIsleFingerprint(CAMPAIGN_ID, "isle_00000000-0000-0000-0000-000000000001", "Grey Isle", null);
    const fp2 = createIsleFingerprint(CAMPAIGN_ID, "isle_00000000-0000-0000-0000-000000000001", "Grey Isle", null);
    expect(fp1).toBe(fp2);

    const fp3 = createIsleFingerprint(CAMPAIGN_ID, "isle_00000000-0000-0000-0000-000000000001", "Different Isle", null);
    expect(fp3).not.toBe(fp1);

    // changing expectedCampaignId changes fingerprint
    const fp4 = createIsleFingerprint("cmp_00000000-0000-0000-0000-000000000002", "isle_00000000-0000-0000-0000-000000000001", "Grey Isle", null);
    expect(fp4).not.toBe(fp1);
  });

  // 3. updateIsleFingerprint is order-independent and sensitive to values
  it("updateIsleFingerprint is order-independent and changes when expected/value changes", () => {
    const id = "isle_00000000-0000-0000-0000-000000000001";
    const fields1 = {
      name: { expected: "Old", value: "New" },
      description: { expected: null as string | null, value: "A desc" as string | null },
    };
    const fields2 = {
      description: { expected: null as string | null, value: "A desc" as string | null },
      name: { expected: "Old", value: "New" },
    };
    expect(updateIsleFingerprint(CAMPAIGN_ID, id, fields1)).toBe(updateIsleFingerprint(CAMPAIGN_ID, id, fields2));

    const fields3 = {
      name: { expected: "Old", value: "New" },
      description: { expected: "was this" as string | null, value: "A desc" as string | null },
    };
    expect(updateIsleFingerprint(CAMPAIGN_ID, id, fields3)).not.toBe(updateIsleFingerprint(CAMPAIGN_ID, id, fields1));
  });

  // 4. Canonical coherence accepts create_isle and update_isle
  it("validateEventCoherence accepts create_isle and update_isle with matching events", () => {
    const dummyState = {} as CurrentCampaignState;
    const baseInput = {
      campaignDocId: "dummy" as unknown as CanonicalCommitInput["campaignDocId"],
      campaignId: "cmp_dummy",
      currentRevision: 0,
      currentState: dummyState,
      commandId: "cmd_dummy",
      commandFingerprint: "fp_dummy",
      nextState: dummyState,
      historyControlUpdate: { kind: "logical_state_append" as const },
    };

    const createdEvent: IsleCreatedEventV1 = {
      type: "isle_created",
      version: 1,
      data: {
        isle: {
          isleId: "isle_00000000-0000-0000-0000-000000000001" as IsleId,
          name: "Grey Isle",
          description: null,
        },
      },
    };
    expect(() =>
      validateEventCoherenceForTest(
        { ...baseInput, commandType: "create_isle", events: [createdEvent] },
        1,
      ),
    ).not.toThrow();

    const updatedEvent: IsleUpdatedEventV1 = {
      type: "isle_updated",
      version: 1,
      data: {
        isleId: "isle_00000000-0000-0000-0000-000000000001" as IsleId,
        previous: {
          isleId: "isle_00000000-0000-0000-0000-000000000001" as IsleId,
          name: "Old Name",
          description: null,
        },
        updated: {
          isleId: "isle_00000000-0000-0000-0000-000000000001" as IsleId,
          name: "New Name",
          description: null,
        },
      },
    };
    expect(() =>
      validateEventCoherenceForTest(
        { ...baseInput, commandType: "update_isle", events: [updatedEvent] },
        1,
      ),
    ).not.toThrow();
  });

  // 5. Activity mapping uses event-time isle name
  it("Activity mapping for Isle events uses the name stored in the event", () => {
    const createdEvent: IsleCreatedEventV1 = {
      type: "isle_created",
      version: 1,
      data: {
        isle: {
          isleId: "isle_00000000-0000-0000-0000-000000000001" as IsleId,
          name: "Grey Isle",
          description: null,
        },
      },
    };
    const entry1 = mapEventToActivityEntry("e1", 1, createdEvent);
    expect(entry1.type).toBe("campaign_configuration");
    if (entry1.type === "campaign_configuration") {
      expect(entry1.description).toContain("Grey Isle");
    }

    const updatedEvent: IsleUpdatedEventV1 = {
      type: "isle_updated",
      version: 1,
      data: {
        isleId: "isle_00000000-0000-0000-0000-000000000001" as IsleId,
        previous: {
          isleId: "isle_00000000-0000-0000-0000-000000000001" as IsleId,
          name: "Old Name",
          description: null,
        },
        updated: {
          isleId: "isle_00000000-0000-0000-0000-000000000001" as IsleId,
          name: "New Name",
          description: null,
        },
      },
    };
    const entry2 = mapEventToActivityEntry("e2", 2, updatedEvent);
    expect(entry2.type).toBe("campaign_configuration");
    if (entry2.type === "campaign_configuration") {
      expect(entry2.description).toContain("New Name");
    }
  });
});
