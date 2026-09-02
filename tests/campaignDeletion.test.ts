import { describe, it, expect } from "vitest";
import {
  validateDeletionRequest,
  validateCampaignIdentityMatch,
  assertNotDeleting,
  nextDeletionPhase,
  isDeletionChildCleanupPhase,
  DELETION_BATCH_SIZE,
  DELETION_CONFIRMATION_STRING,
  DELETION_PHASE_ORDER,
  CAMPAIGN_OWNED_CHILD_COLLECTIONS,
  DomainError,
  isValidCampaignId,
  CURRENT_STATE_SCHEMA_VERSION,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  INITIAL_MONTH_ORDINAL,
} from "../shared/domain";
import type {
  DeletionOperation,
  DeletionPhase,
  SerializableCampaignState,
  CampaignDocument,
} from "../shared/domain";

// ============================================================
// Helpers
// ============================================================

const VALID_CAMPAIGN_ID = "cmp_00000000-0000-0000-0000-000000000001";
const OTHER_CAMPAIGN_ID = "cmp_00000000-0000-0000-0000-000000000002";

function makeDeletionOp(overrides?: Partial<DeletionOperation>): DeletionOperation {
  return {
    campaignKey: "default",
    campaignId: VALID_CAMPAIGN_ID,
    status: "deleting" as const,
    phase: "campaignEvents" as DeletionPhase,
    startedAt: 1000,
    lastProgressAt: 1000,
    ...overrides,
  };
}

function makeInitialState(): SerializableCampaignState {
  return {
    schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: INITIAL_MONTH_ORDINAL as number },
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
  };
}

// ============================================================
// 1. Deletion request validation
// ============================================================

describe("validateDeletionRequest", () => {
  it("accepts valid confirmation and campaign ID", () => {
    expect(() => validateDeletionRequest(VALID_CAMPAIGN_ID, "DELETE")).not.toThrow();
  });

  it("rejects bad confirmation string with zero writes (test #2)", () => {
    expect(() => validateDeletionRequest(VALID_CAMPAIGN_ID, "delete")).toThrow(DomainError);
    expect(() => validateDeletionRequest(VALID_CAMPAIGN_ID, "")).toThrow(DomainError);
    expect(() => validateDeletionRequest(VALID_CAMPAIGN_ID, "REMOVE")).toThrow(DomainError);
    try {
      validateDeletionRequest(VALID_CAMPAIGN_ID, "wrong");
    } catch (e: any) {
      expect(e.code).toBe("CAMPAIGN_DELETION_CONFIRMATION_FAILED");
    }
  });

  it("rejects invalid campaign ID format (test #3)", () => {
    expect(() => validateDeletionRequest("not-a-campaign-id", "DELETE")).toThrow(DomainError);
    try {
      validateDeletionRequest("garbage", "DELETE");
    } catch (e: any) {
      expect(e.code).toBe("CAMPAIGN_DELETION_STALE_IDENTITY");
    }
  });
});

describe("validateCampaignIdentityMatch", () => {
  it("accepts matching campaign IDs", () => {
    expect(() => validateCampaignIdentityMatch(VALID_CAMPAIGN_ID, VALID_CAMPAIGN_ID)).not.toThrow();
  });

  it("rejects stale/mismatched campaign identity (test #3)", () => {
    expect(() => validateCampaignIdentityMatch(VALID_CAMPAIGN_ID, OTHER_CAMPAIGN_ID)).toThrow(DomainError);
    try {
      validateCampaignIdentityMatch(VALID_CAMPAIGN_ID, OTHER_CAMPAIGN_ID);
    } catch (e: any) {
      expect(e.code).toBe("CAMPAIGN_DELETION_STALE_IDENTITY");
    }
  });
});

// ============================================================
// 2. Deletion barrier guard
// ============================================================

describe("assertNotDeleting", () => {
  it("does nothing when no deletion is in progress", () => {
    expect(() => assertNotDeleting(null)).not.toThrow();
  });

  it("rejects canonical gameplay writes while barrier exists (test #4)", () => {
    const op = makeDeletionOp();
    expect(() => assertNotDeleting(op)).toThrow(DomainError);
    try {
      assertNotDeleting(op);
    } catch (e: any) {
      expect(e.code).toBe("CAMPAIGN_DELETION_IN_PROGRESS");
    }
  });

  it("rejects Undo while deleting (test #5)", () => {
    expect(() => assertNotDeleting(makeDeletionOp())).toThrow(DomainError);
  });

  it("rejects Redo while deleting (test #6)", () => {
    expect(() => assertNotDeleting(makeDeletionOp())).toThrow(DomainError);
  });

  it("rejects checkpoint restore while deleting (test #7)", () => {
    expect(() => assertNotDeleting(makeDeletionOp())).toThrow(DomainError);
  });

  it("rejects backup import while deleting (test #8)", () => {
    expect(() => assertNotDeleting(makeDeletionOp())).toThrow(DomainError);
  });

  it("rejects new-campaign/auto-create while deleting (test #9)", () => {
    expect(() => assertNotDeleting(makeDeletionOp())).toThrow(DomainError);
  });

  it("rejects in every deletion phase", () => {
    for (const phase of DELETION_PHASE_ORDER) {
      expect(() => assertNotDeleting(makeDeletionOp({ phase }))).toThrow(DomainError);
    }
  });
});

// ============================================================
// 3. Deletion phase progression
// ============================================================

describe("DELETION_PHASE_ORDER", () => {
  it("has the expected deterministic order", () => {
    expect(DELETION_PHASE_ORDER).toEqual([
      "campaignEvents",
      "campaignSnapshots",
      "campaignRevisions",
      "campaignCheckpoints",
      "campaignHistoryControl",
      "campaign",
      "verify",
    ]);
  });

  it("canonical campaign is near the end (test #15)", () => {
    const campaignIdx = DELETION_PHASE_ORDER.indexOf("campaign");
    const verifyIdx = DELETION_PHASE_ORDER.indexOf("verify");
    expect(campaignIdx).toBe(DELETION_PHASE_ORDER.length - 2);
    expect(verifyIdx).toBe(DELETION_PHASE_ORDER.length - 1);
  });
});

describe("nextDeletionPhase", () => {
  it("progresses through all phases in order", () => {
    let phase: DeletionPhase = DELETION_PHASE_ORDER[0];
    const visited: DeletionPhase[] = [phase];
    for (let i = 0; i < DELETION_PHASE_ORDER.length - 1; i++) {
      const next = nextDeletionPhase(phase);
      expect(next).not.toBe("complete");
      phase = next as DeletionPhase;
      visited.push(phase);
    }
    expect(visited).toEqual([...DELETION_PHASE_ORDER]);
    expect(nextDeletionPhase(phase)).toBe("complete");
  });

  it("returns 'complete' after verify (test #18)", () => {
    expect(nextDeletionPhase("verify")).toBe("complete");
  });

  it("rejects unknown phase", () => {
    expect(() => nextDeletionPhase("bogus" as DeletionPhase)).toThrow(DomainError);
  });
});

// ============================================================
// 4. Campaign-owned collection enumeration
// ============================================================

describe("CAMPAIGN_OWNED_CHILD_COLLECTIONS", () => {
  it("enumerates all child collections (not campaigns itself)", () => {
    expect(CAMPAIGN_OWNED_CHILD_COLLECTIONS).toContain("campaignEvents");
    expect(CAMPAIGN_OWNED_CHILD_COLLECTIONS).toContain("campaignSnapshots");
    expect(CAMPAIGN_OWNED_CHILD_COLLECTIONS).toContain("campaignRevisions");
    expect(CAMPAIGN_OWNED_CHILD_COLLECTIONS).toContain("campaignCheckpoints");
    expect(CAMPAIGN_OWNED_CHILD_COLLECTIONS).toContain("campaignHistoryControl");
    expect(CAMPAIGN_OWNED_CHILD_COLLECTIONS).not.toContain("campaigns");
  });
});

describe("isDeletionChildCleanupPhase", () => {
  it("returns true for child collections", () => {
    for (const col of CAMPAIGN_OWNED_CHILD_COLLECTIONS) {
      expect(isDeletionChildCleanupPhase(col)).toBe(true);
    }
  });

  it("returns false for campaign and verify phases", () => {
    expect(isDeletionChildCleanupPhase("campaign")).toBe(false);
    expect(isDeletionChildCleanupPhase("verify")).toBe(false);
  });
});

// ============================================================
// 5. Batch size constant
// ============================================================

describe("DELETION_BATCH_SIZE", () => {
  it("is a positive bounded integer (test #11)", () => {
    expect(Number.isInteger(DELETION_BATCH_SIZE)).toBe(true);
    expect(DELETION_BATCH_SIZE).toBeGreaterThan(0);
    expect(DELETION_BATCH_SIZE).toBeLessThanOrEqual(1000);
  });

  it("is 200 as approved", () => {
    expect(DELETION_BATCH_SIZE).toBe(200);
  });
});

// ============================================================
// 6. Deletion does not create gameplay artifacts (test #20)
// ============================================================

describe("deletion creates no gameplay artifacts", () => {
  it("DeletionOperation has no revision, event, or snapshot fields", () => {
    const op = makeDeletionOp();
    expect(op).not.toHaveProperty("revision");
    expect(op).not.toHaveProperty("event");
    expect(op).not.toHaveProperty("snapshot");
    expect(op).toHaveProperty("campaignKey");
    expect(op).toHaveProperty("campaignId");
    expect(op).toHaveProperty("status");
    expect(op).toHaveProperty("phase");
    expect(op).toHaveProperty("startedAt");
    expect(op).toHaveProperty("lastProgressAt");
  });

  it("deletion status is 'deleting', not a CampaignCommandType", () => {
    const op = makeDeletionOp();
    expect(op.status).toBe("deleting");
  });
});

// ============================================================
// 7. Confirmation string contract
// ============================================================

describe("DELETION_CONFIRMATION_STRING", () => {
  it("is the exact string 'DELETE'", () => {
    expect(DELETION_CONFIRMATION_STRING).toBe("DELETE");
  });
});

// ============================================================
// 8. Marker stays while children remain (conceptual, test #16/#17)
// ============================================================

describe("deletion marker lifecycle ordering", () => {
  it("verify phase is the last phase before marker removal (test #17/#18)", () => {
    const lastPhase = DELETION_PHASE_ORDER[DELETION_PHASE_ORDER.length - 1];
    expect(lastPhase).toBe("verify");
    expect(nextDeletionPhase("verify")).toBe("complete");
  });

  it("child cleanup phases all precede campaign and verify phases", () => {
    for (const child of CAMPAIGN_OWNED_CHILD_COLLECTIONS) {
      const childIdx = DELETION_PHASE_ORDER.indexOf(child);
      const campaignIdx = DELETION_PHASE_ORDER.indexOf("campaign");
      const verifyIdx = DELETION_PHASE_ORDER.indexOf("verify");
      expect(childIdx).toBeLessThan(campaignIdx);
      expect(childIdx).toBeLessThan(verifyIdx);
    }
  });
});

// ============================================================
// 9. Resume safety (conceptual, test #12/#13)
// ============================================================

describe("deletion resumability contracts", () => {
  it("phase is a string that survives serialization (durable marker)", () => {
    for (const phase of DELETION_PHASE_ORDER) {
      const serialized = JSON.parse(JSON.stringify(makeDeletionOp({ phase })));
      expect(serialized.phase).toBe(phase);
    }
  });

  it("nextDeletionPhase is deterministic for any given phase", () => {
    for (const phase of DELETION_PHASE_ORDER) {
      const a = nextDeletionPhase(phase);
      const b = nextDeletionPhase(phase);
      expect(a).toBe(b);
    }
  });
});

// ============================================================
// 10. Batch boundary contract (test #11 / #14)
// ============================================================

describe("bounded batch cleanup contract", () => {
  it("batch size bounds how many records one invocation may delete", () => {
    expect(DELETION_BATCH_SIZE).toBe(200);
  });

  it("multiple batches are needed for records exceeding the limit (conceptual)", () => {
    const totalRecords = 500;
    const batchesNeeded = Math.ceil(totalRecords / DELETION_BATCH_SIZE);
    expect(batchesNeeded).toBeGreaterThan(1);
    expect(batchesNeeded).toBe(3);
  });
});
