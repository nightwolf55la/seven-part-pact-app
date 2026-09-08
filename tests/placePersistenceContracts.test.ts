import { describe, it, expect } from "vitest";
import type { PlaceCreatedEventV1, PlaceUpdatedEventV1, PlaceId, IsleId, WorldPlacePlacement } from "../shared/domain";
import {
  CAMPAIGN_COMMAND_TYPES,
  isLogicalStateCommandType,
  createPlaceFingerprint,
  updatePlaceFingerprint,
  mapEventToActivityEntry,
} from "../shared/domain";
import { validateEventCoherenceForTest } from "../convex/canonicalCommit";
import type { CanonicalCommitInput } from "../convex/canonicalCommit";
import type { CurrentCampaignState } from "../shared/domain";

describe("Place persistence contracts", () => {
  // 1. Command types are active and logical-state
  it("CAMPAIGN_COMMAND_TYPES contains create_place and update_place as logical-state commands", () => {
    const types = CAMPAIGN_COMMAND_TYPES as readonly string[];
    expect(types).toContain("create_place");
    expect(types).toContain("update_place");
    expect(isLogicalStateCommandType("create_place")).toBe(true);
    expect(isLogicalStateCommandType("update_place")).toBe(true);
  });

  // 2. Place fingerprints: deterministic, placement participates, update is canonical
  it("Place fingerprints are deterministic, placement-sensitive, and canonical", () => {
    const id = "place_00000000-0000-0000-0000-000000000001";
    const placement1: WorldPlacePlacement = { kind: "on_isle", isleId: "isle_00000000-0000-0000-0000-000000000001" as IsleId };
    const placement2: WorldPlacePlacement = { kind: "unspecified" };

    // create: deterministic
    const fp1 = createPlaceFingerprint(id, "Old Tower", null, placement1);
    const fp2 = createPlaceFingerprint(id, "Old Tower", null, placement1);
    expect(fp1).toBe(fp2);

    // create: placement changes fingerprint
    const fp3 = createPlaceFingerprint(id, "Old Tower", null, placement2);
    expect(fp3).not.toBe(fp1);

    // update: canonical across key order
    const fields1 = {
      name: { expected: "Old", value: "New" },
      placement: { expected: placement1, value: placement2 },
    };
    const fields2 = {
      placement: { expected: placement1, value: placement2 },
      name: { expected: "Old", value: "New" },
    };
    expect(updatePlaceFingerprint(id, fields1)).toBe(updatePlaceFingerprint(id, fields2));

    // update: changes when expected placement changes
    const fields3 = {
      name: { expected: "Old", value: "New" },
      placement: { expected: placement2, value: placement2 },
    };
    expect(updatePlaceFingerprint(id, fields3)).not.toBe(updatePlaceFingerprint(id, fields1));
  });

  // 3. Canonical coherence accepts create_place and update_place
  it("validateEventCoherence accepts create_place and update_place with matching events", () => {
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

    const placement: WorldPlacePlacement = { kind: "unspecified" };
    const createdEvent: PlaceCreatedEventV1 = {
      type: "place_created",
      version: 1,
      data: {
        place: {
          placeId: "place_00000000-0000-0000-0000-000000000001" as PlaceId,
          name: "Old Tower",
          description: null,
          placement,
        },
      },
    };
    expect(() =>
      validateEventCoherenceForTest(
        { ...baseInput, commandType: "create_place", events: [createdEvent] },
        1,
      ),
    ).not.toThrow();

    const updatedEvent: PlaceUpdatedEventV1 = {
      type: "place_updated",
      version: 1,
      data: {
        placeId: "place_00000000-0000-0000-0000-000000000001" as PlaceId,
        previous: {
          placeId: "place_00000000-0000-0000-0000-000000000001" as PlaceId,
          name: "Old Tower",
          description: null,
          placement,
        },
        updated: {
          placeId: "place_00000000-0000-0000-0000-000000000001" as PlaceId,
          name: "New Tower",
          description: null,
          placement,
        },
      },
    };
    expect(() =>
      validateEventCoherenceForTest(
        { ...baseInput, commandType: "update_place", events: [updatedEvent] },
        1,
      ),
    ).not.toThrow();
  });

  // 4. Activity uses event-time Place name
  it("Activity mapping for Place events uses the name stored in the event", () => {
    const placement: WorldPlacePlacement = { kind: "unspecified" };
    const createdEvent: PlaceCreatedEventV1 = {
      type: "place_created",
      version: 1,
      data: {
        place: {
          placeId: "place_00000000-0000-0000-0000-000000000001" as PlaceId,
          name: "Old Tower",
          description: null,
          placement,
        },
      },
    };
    const entry1 = mapEventToActivityEntry("e1", 1, createdEvent);
    expect(entry1.type).toBe("campaign_configuration");
    if (entry1.type === "campaign_configuration") {
      expect(entry1.description).toContain("Old Tower");
    }

    const updatedEvent: PlaceUpdatedEventV1 = {
      type: "place_updated",
      version: 1,
      data: {
        placeId: "place_00000000-0000-0000-0000-000000000001" as PlaceId,
        previous: {
          placeId: "place_00000000-0000-0000-0000-000000000001" as PlaceId,
          name: "Old Tower",
          description: null,
          placement,
        },
        updated: {
          placeId: "place_00000000-0000-0000-0000-000000000001" as PlaceId,
          name: "New Tower",
          description: null,
          placement,
        },
      },
    };
    const entry2 = mapEventToActivityEntry("e2", 2, updatedEvent);
    expect(entry2.type).toBe("campaign_configuration");
    if (entry2.type === "campaign_configuration") {
      expect(entry2.description).toContain("New Tower");
    }
  });
});
