import { describe, it, expect, expectTypeOf } from "vitest";
import type {
  DenizenCreatedEventV1,
  DenizenUpdatedEventV1,
  CampaignEvent,
  DenizenId,
} from "../shared/domain";
import {
  CAMPAIGN_COMMAND_TYPES,
  isLogicalStateCommandType,
  createDenizenFingerprint,
  updateDenizenFingerprint,
  mapEventToActivityEntry,
} from "../shared/domain";

const CAMPAIGN_ID = "cmp_00000000-0000-0000-0000-000000000001";
import { validateEventCoherenceForTest } from "../convex/canonicalCommit";
import type { CanonicalCommitInput } from "../convex/canonicalCommit";
import type { CurrentCampaignState } from "../shared/domain";

describe("Denizen persistence contracts", () => {
  // 1. Command types are active and logical-state
  it("CAMPAIGN_COMMAND_TYPES contains create_denizen and update_denizen as logical-state commands", () => {
    const types = CAMPAIGN_COMMAND_TYPES as readonly string[];
    expect(types).toContain("create_denizen");
    expect(types).toContain("update_denizen");
    expect(isLogicalStateCommandType("create_denizen")).toBe(true);
    expect(isLogicalStateCommandType("update_denizen")).toBe(true);
  });

  // 2. createDenizenFingerprint is deterministic and sensitive to input
  it("createDenizenFingerprint is deterministic and changes when input changes", () => {
    const fp1 = createDenizenFingerprint(CAMPAIGN_ID, "den_00000000-0000-0000-0000-000000000001", "Elder Thorn", "individual", null);
    const fp2 = createDenizenFingerprint(CAMPAIGN_ID, "den_00000000-0000-0000-0000-000000000001", "Elder Thorn", "individual", null);
    expect(fp1).toBe(fp2);

    const fp3 = createDenizenFingerprint(CAMPAIGN_ID, "den_00000000-0000-0000-0000-000000000001", "Different Name", "individual", null);
    expect(fp3).not.toBe(fp1);

    // changing expectedCampaignId changes fingerprint
    const fp4 = createDenizenFingerprint("cmp_00000000-0000-0000-0000-000000000002", "den_00000000-0000-0000-0000-000000000001", "Elder Thorn", "individual", null);
    expect(fp4).not.toBe(fp1);
  });

  // 3. updateDenizenFingerprint is order-independent via canonical JSON and sensitive to values
  it("updateDenizenFingerprint is order-independent and changes when expected/value changes", () => {
    const fields1 = {
      name: { expected: "Old", value: "New" },
      description: { expected: null as string | null, value: "A desc" as string | null },
    };
    const fields2 = {
      description: { expected: null as string | null, value: "A desc" as string | null },
      name: { expected: "Old", value: "New" },
    };
    const id = "den_00000000-0000-0000-0000-000000000001";
    expect(updateDenizenFingerprint(CAMPAIGN_ID, id, fields1)).toBe(updateDenizenFingerprint(CAMPAIGN_ID, id, fields2));

    const fields3 = {
      name: { expected: "Old", value: "New" },
      description: { expected: "was this" as string | null, value: "A desc" as string | null },
    };
    expect(updateDenizenFingerprint(CAMPAIGN_ID, id, fields3)).not.toBe(updateDenizenFingerprint(CAMPAIGN_ID, id, fields1));
  });

  // 4. Denizen events are assignable to CampaignEvent
  it("DenizenCreatedEventV1 and DenizenUpdatedEventV1 are assignable to CampaignEvent", () => {
    expectTypeOf<DenizenCreatedEventV1>().toMatchTypeOf<CampaignEvent>();
    expectTypeOf<DenizenUpdatedEventV1>().toMatchTypeOf<CampaignEvent>();
  });

  // 5. Activity mapping uses event-time denizen name
  it("Activity mapping for Denizen events uses the name stored in the event", () => {
    const createdEvent: DenizenCreatedEventV1 = {
      type: "denizen_created",
      version: 1,
      data: {
        denizen: {
          denizenId: "den_00000000-0000-0000-0000-000000000001" as DenizenId,
          name: "Elder Thorn",
          representation: "individual",
          description: null,
        },
      },
    };
    const entry1 = mapEventToActivityEntry("e1", 1, createdEvent);
    expect(entry1.type).toBe("campaign_configuration");
    if (entry1.type === "campaign_configuration") {
      expect(entry1.description).toContain("Elder Thorn");
    }

    const updatedEvent: DenizenUpdatedEventV1 = {
      type: "denizen_updated",
      version: 1,
      data: {
        denizenId: "den_00000000-0000-0000-0000-000000000001" as DenizenId,
        previous: {
          denizenId: "den_00000000-0000-0000-0000-000000000001" as DenizenId,
          name: "Old Name",
          representation: "individual",
          description: null,
        },
        updated: {
          denizenId: "den_00000000-0000-0000-0000-000000000001" as DenizenId,
          name: "New Name",
          representation: "individual",
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

  // 6. Canonical event coherence accepts Denizen commands
  it("validateEventCoherence accepts create_denizen and update_denizen with matching events", () => {
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

    const createdEvent: DenizenCreatedEventV1 = {
      type: "denizen_created",
      version: 1,
      data: {
        denizen: {
          denizenId: "den_00000000-0000-0000-0000-000000000001" as DenizenId,
          name: "Elder Thorn",
          representation: "individual",
          description: null,
        },
      },
    };
    expect(() =>
      validateEventCoherenceForTest(
        { ...baseInput, commandType: "create_denizen", events: [createdEvent] },
        1,
      ),
    ).not.toThrow();

    const updatedEvent: DenizenUpdatedEventV1 = {
      type: "denizen_updated",
      version: 1,
      data: {
        denizenId: "den_00000000-0000-0000-0000-000000000001" as DenizenId,
        previous: {
          denizenId: "den_00000000-0000-0000-0000-000000000001" as DenizenId,
          name: "Old Name",
          representation: "individual",
          description: null,
        },
        updated: {
          denizenId: "den_00000000-0000-0000-0000-000000000001" as DenizenId,
          name: "New Name",
          representation: "individual",
          description: null,
        },
      },
    };
    expect(() =>
      validateEventCoherenceForTest(
        { ...baseInput, commandType: "update_denizen", events: [updatedEvent] },
        1,
      ),
    ).not.toThrow();
  });
});
