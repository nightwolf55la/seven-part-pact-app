import { describe, it, expect, beforeEach } from "vitest";
import {
  DomainError,
  DELETION_BATCH_SIZE,
  DELETION_CONFIRMATION_STRING,
  DELETION_PHASE_ORDER,
  CAMPAIGN_OWNED_CHILD_COLLECTIONS,
  assertNotDeleting,
  validateDeletionRequest,
  validateCampaignIdentityMatch,
  nextDeletionPhase,
  isDeletionChildCleanupPhase,
} from "../shared/domain";
import type {
  DeletionPhase,
  DeletionOperation,
  CampaignOwnedChildCollection,
} from "../shared/domain";
import {
  requestDeletion,
  processBatch,
  resolveLifecycle,
} from "../shared/domain/deletion-orchestrator";
import type { DeletionPersistenceAdapter } from "../shared/domain/deletion-orchestrator";

// ============================================================
// In-memory test adapter
// ============================================================

const CID = "cmp_00000000-0000-0000-0000-000000000001";
const OTHER_CID = "cmp_00000000-0000-0000-0000-000000000002";

class InMemoryDeletionAdapter implements DeletionPersistenceAdapter {
  marker: DeletionOperation | null = null;
  canonicalCampaignId: string | null = null;
  childRecords: Map<CampaignOwnedChildCollection, Map<string, number>> = new Map();
  scheduledBatches = 0;
  deletedByPhase: Map<string, number> = new Map();

  constructor() {
    for (const col of CAMPAIGN_OWNED_CHILD_COLLECTIONS) {
      this.childRecords.set(col, new Map());
    }
  }

  seedCampaign(campaignId: string): void {
    this.canonicalCampaignId = campaignId;
  }

  seedChildRecords(collection: CampaignOwnedChildCollection, campaignId: string, count: number): void {
    const colMap = this.childRecords.get(collection)!;
    colMap.set(campaignId, (colMap.get(campaignId) ?? 0) + count);
  }

  async loadActiveDeletion(): Promise<DeletionOperation | null> {
    return this.marker;
  }

  async loadCanonicalCampaignId(): Promise<string | null> {
    return this.canonicalCampaignId;
  }

  async insertDeletionMarker(op: DeletionOperation): Promise<void> {
    if (this.marker !== null) throw new Error("Marker already exists");
    this.marker = { ...op };
  }

  async patchDeletionPhase(phase: DeletionPhase): Promise<void> {
    if (this.marker === null) throw new Error("No marker to patch");
    this.marker = { ...this.marker, phase, lastProgressAt: Date.now() };
  }

  async removeDeletionMarker(): Promise<void> {
    this.marker = null;
  }

  async countChildRecords(collection: CampaignOwnedChildCollection, campaignId: string): Promise<number> {
    return this.childRecords.get(collection)?.get(campaignId) ?? 0;
  }

  async deleteChildBatch(collection: CampaignOwnedChildCollection, campaignId: string, limit: number): Promise<number> {
    const colMap = this.childRecords.get(collection)!;
    const current = colMap.get(campaignId) ?? 0;
    const toDelete = Math.min(current, limit);
    colMap.set(campaignId, current - toDelete);
    this.deletedByPhase.set(collection, (this.deletedByPhase.get(collection) ?? 0) + toDelete);
    return toDelete;
  }

  async deleteCampaignRecord(campaignId: string): Promise<boolean> {
    if (this.canonicalCampaignId === campaignId) {
      this.canonicalCampaignId = null;
      return true;
    }
    return false;
  }

  async hasAnyCampaignRecord(): Promise<boolean> {
    return this.canonicalCampaignId !== null;
  }

  async getCampaignRecordIdentity(): Promise<string | null> {
    return this.canonicalCampaignId;
  }

  async scheduleNextBatch(): Promise<void> {
    this.scheduledBatches++;
  }

  async hasAnyChildRecordsGlobally(): Promise<boolean> {
    for (const col of CAMPAIGN_OWNED_CHILD_COLLECTIONS) {
      const colMap = this.childRecords.get(col)!;
      for (const count of colMap.values()) {
        if (count > 0) return true;
      }
    }
    return false;
  }

  totalRemainingChildRecords(campaignId: string): number {
    let total = 0;
    for (const col of CAMPAIGN_OWNED_CHILD_COLLECTIONS) {
      total += this.childRecords.get(col)?.get(campaignId) ?? 0;
    }
    return total;
  }
}

async function runToCompletion(adapter: InMemoryDeletionAdapter, maxBatches = 1000): Promise<number> {
  let batches = 0;
  while (batches < maxBatches) {
    const result = await processBatch(adapter);
    if (result === null || !result.continued) break;
    batches++;
  }
  return batches;
}

// ============================================================
// 1. Request creates barrier before cleanup
// ============================================================

describe("requestDeletion", () => {
  let adapter: InMemoryDeletionAdapter;

  beforeEach(() => {
    adapter = new InMemoryDeletionAdapter();
    adapter.seedCampaign(CID);
  });

  it("creates marker before any cleanup begins", async () => {
    const result = await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);
    expect(result.status).toBe("deleting");
    expect(result.campaignId).toBe(CID);
    expect(adapter.marker).not.toBeNull();
    expect(adapter.marker!.phase).toBe(DELETION_PHASE_ORDER[0]);
    expect(adapter.canonicalCampaignId).toBe(CID);
  });

  it("schedules a batch worker after creating marker", async () => {
    await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);
    expect(adapter.scheduledBatches).toBe(1);
  });

  it("is idempotent for the same campaign", async () => {
    await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);
    const result2 = await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);
    expect(result2.status).toBe("deleting");
    expect(result2.campaignId).toBe(CID);
  });

  it("rejects deletion of a different campaign while one is in progress", async () => {
    await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);
    await expect(requestDeletion(adapter, OTHER_CID, DELETION_CONFIRMATION_STRING)).rejects.toThrow(DomainError);
  });

  it("stale identity rejects with zero writes", async () => {
    try {
      await requestDeletion(adapter, OTHER_CID, DELETION_CONFIRMATION_STRING);
    } catch (e: any) {
      expect(e.code).toBe("CAMPAIGN_DELETION_STALE_IDENTITY");
    }
    expect(adapter.marker).toBeNull();
  });

  it("bad confirmation rejects with zero writes", async () => {
    try {
      await requestDeletion(adapter, CID, "wrong");
    } catch (e: any) {
      expect(e.code).toBe("CAMPAIGN_DELETION_CONFIRMATION_FAILED");
    }
    expect(adapter.marker).toBeNull();
    expect(adapter.scheduledBatches).toBe(0);
  });

  it("rejects when no campaign exists", async () => {
    adapter.canonicalCampaignId = null;
    await expect(requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING)).rejects.toThrow(DomainError);
  });
});

// ============================================================
// 2. Barrier blocks gameplay writes
// ============================================================

describe("deletion barrier blocks all mutation types", () => {
  it("assertNotDeleting throws for every phase", () => {
    for (const phase of DELETION_PHASE_ORDER) {
      const op: DeletionOperation = {
        campaignKey: "default",
        campaignId: CID,
        status: "deleting",
        phase,
        startedAt: 1000,
        lastProgressAt: 1000,
      };
      expect(() => assertNotDeleting(op)).toThrow(DomainError);
      try {
        assertNotDeleting(op);
      } catch (e: any) {
        expect(e.code).toBe("CAMPAIGN_DELETION_IN_PROGRESS");
      }
    }
  });

  it("assertNotDeleting passes when no deletion in progress", () => {
    expect(() => assertNotDeleting(null)).not.toThrow();
  });
});

// ============================================================
// 3. Bounded batch cleanup
// ============================================================

describe("processBatch bounded cleanup", () => {
  let adapter: InMemoryDeletionAdapter;

  beforeEach(() => {
    adapter = new InMemoryDeletionAdapter();
    adapter.seedCampaign(CID);
  });

  it("one worker call deletes no more than DELETION_BATCH_SIZE records", async () => {
    adapter.seedChildRecords("campaignEvents", CID, 500);
    await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);

    const result = await processBatch(adapter);
    expect(result).not.toBeNull();
    expect(result!.deleted).toBeLessThanOrEqual(DELETION_BATCH_SIZE);
    expect(await adapter.countChildRecords("campaignEvents", CID)).toBe(300);
  });

  it("requires multiple batches for >BATCH_SIZE records", async () => {
    adapter.seedChildRecords("campaignEvents", CID, 500);
    await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);

    let totalDeleted = 0;
    let batchCount = 0;
    while ((await adapter.countChildRecords("campaignEvents", CID)) > 0) {
      const result = await processBatch(adapter);
      if (result === null) break;
      totalDeleted += result.deleted;
      batchCount++;
      if (batchCount > 10) break;
    }
    expect(batchCount).toBeGreaterThan(1);
    expect(totalDeleted).toBe(500);
  });

  it("advances phases in correct order through child collections", async () => {
    for (const col of CAMPAIGN_OWNED_CHILD_COLLECTIONS) {
      adapter.seedChildRecords(col, CID, DELETION_BATCH_SIZE + 1);
    }
    await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);

    const phasesVisited: DeletionPhase[] = [];
    let iterations = 0;
    while (iterations < 200) {
      const result = await processBatch(adapter);
      if (result === null) break;
      phasesVisited.push(result.finalPhase as DeletionPhase);
      if (!result.continued) break;
      iterations++;
    }

    const childOrder = phasesVisited.filter((p) =>
      (CAMPAIGN_OWNED_CHILD_COLLECTIONS as readonly string[]).includes(p),
    );
    const uniqueChildOrder = [...new Set(childOrder)];
    for (const col of CAMPAIGN_OWNED_CHILD_COLLECTIONS) {
      expect(uniqueChildOrder).toContain(col);
    }
    for (let i = 1; i < uniqueChildOrder.length; i++) {
      const prevIdx = DELETION_PHASE_ORDER.indexOf(uniqueChildOrder[i - 1] as DeletionPhase);
      const curIdx = DELETION_PHASE_ORDER.indexOf(uniqueChildOrder[i] as DeletionPhase);
      expect(curIdx).toBeGreaterThan(prevIdx);
    }
  });
});

// ============================================================
// 4. Campaign record deleted only after all children
// ============================================================

describe("canonical campaign deletion ordering", () => {
  let adapter: InMemoryDeletionAdapter;

  beforeEach(() => {
    adapter = new InMemoryDeletionAdapter();
    adapter.seedCampaign(CID);
  });

  it("campaign row remains until child cleanup completes", async () => {
    adapter.seedChildRecords("campaignEvents", CID, 10);
    await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);

    await processBatch(adapter);
    expect(adapter.canonicalCampaignId).toBe(CID);
  });

  it("campaign row is deleted in the campaign phase", async () => {
    await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);
    await runToCompletion(adapter);
    expect(adapter.canonicalCampaignId).toBeNull();
  });

  it("marker is the final thing removed", async () => {
    adapter.seedChildRecords("campaignEvents", CID, 5);
    await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);

    let markerRemovedAt = -1;
    let campaignDeletedAt = -1;
    let step = 0;
    while (step < 100) {
      if (adapter.marker === null && markerRemovedAt === -1) {
        markerRemovedAt = step;
        break;
      }
      if (adapter.canonicalCampaignId === null && campaignDeletedAt === -1) {
        campaignDeletedAt = step;
      }
      await processBatch(adapter);
      step++;
    }
    if (markerRemovedAt === -1) markerRemovedAt = step;
    expect(campaignDeletedAt).toBeLessThan(markerRemovedAt);
  });

  it("complete cleanup results in truly empty graph", async () => {
    for (const col of CAMPAIGN_OWNED_CHILD_COLLECTIONS) {
      adapter.seedChildRecords(col, CID, 3);
    }
    await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);
    await runToCompletion(adapter);

    expect(adapter.marker).toBeNull();
    expect(adapter.canonicalCampaignId).toBeNull();
    expect(adapter.totalRemainingChildRecords(CID)).toBe(0);
  });
});

// ============================================================
// 5. Fail-closed: unexpected campaign identity
// ============================================================

describe("fail-closed on unexpected campaign identity", () => {
  let adapter: InMemoryDeletionAdapter;

  beforeEach(() => {
    adapter = new InMemoryDeletionAdapter();
    adapter.seedCampaign(CID);
  });

  it("campaign phase rejects when canonical row has different identity", async () => {
    await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);
    adapter.marker = { ...adapter.marker!, phase: "campaign" as DeletionPhase };
    adapter.canonicalCampaignId = OTHER_CID;

    await expect(processBatch(adapter)).rejects.toThrow(DomainError);
    expect(adapter.marker).not.toBeNull();
    expect(adapter.canonicalCampaignId).toBe(OTHER_CID);
  });

  it("verify phase rejects when canonical row has different identity", async () => {
    await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);
    adapter.marker = { ...adapter.marker!, phase: "verify" as DeletionPhase };
    adapter.canonicalCampaignId = OTHER_CID;

    await expect(processBatch(adapter)).rejects.toThrow(DomainError);
    expect(adapter.marker).not.toBeNull();
    expect(adapter.canonicalCampaignId).toBe(OTHER_CID);
  });

  it("campaign phase succeeds when canonical matches target", async () => {
    await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);
    adapter.marker = { ...adapter.marker!, phase: "campaign" as DeletionPhase };
    const result = await processBatch(adapter);
    expect(result).not.toBeNull();
    expect(adapter.canonicalCampaignId).toBeNull();
  });

  it("campaign phase succeeds when canonical already absent", async () => {
    await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);
    adapter.marker = { ...adapter.marker!, phase: "campaign" as DeletionPhase };
    adapter.canonicalCampaignId = null;
    const result = await processBatch(adapter);
    expect(result).not.toBeNull();
  });
});

// ============================================================
// 6. Resume / interruption recovery
// ============================================================

describe("interruption and resume", () => {
  let adapter: InMemoryDeletionAdapter;

  beforeEach(() => {
    adapter = new InMemoryDeletionAdapter();
    adapter.seedCampaign(CID);
  });

  it("interruption followed by resume continues from durable phase", async () => {
    adapter.seedChildRecords("campaignEvents", CID, 500);
    await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);

    await processBatch(adapter);
    const remainingBeforeResume = await adapter.countChildRecords("campaignEvents", CID);

    await processBatch(adapter);
    const remainingAfterResume = await adapter.countChildRecords("campaignEvents", CID);

    expect(remainingAfterResume).toBeLessThan(remainingBeforeResume);
    expect(adapter.marker).not.toBeNull();
  });

  it("replaying is idempotent -- resuming a completed deletion is safe", async () => {
    await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);
    await runToCompletion(adapter);
    expect(adapter.marker).toBeNull();

    const result = await processBatch(adapter);
    expect(result).toBeNull();
  });
});

// ============================================================
// 7. No gameplay artifacts created by deletion
// ============================================================

describe("deletion creates no gameplay artifacts", () => {
  let adapter: InMemoryDeletionAdapter;

  beforeEach(() => {
    adapter = new InMemoryDeletionAdapter();
    adapter.seedCampaign(CID);
    for (const col of CAMPAIGN_OWNED_CHILD_COLLECTIONS) {
      adapter.seedChildRecords(col, CID, 10);
    }
  });

  it("no campaignRevision/event/snapshot is created during deletion", async () => {
    await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);
    await runToCompletion(adapter);
    expect(adapter.totalRemainingChildRecords(CID)).toBe(0);
    for (const col of CAMPAIGN_OWNED_CHILD_COLLECTIONS) {
      expect(adapter.deletedByPhase.get(col)).toBe(10);
    }
  });
});

// ============================================================
// 8. Lifecycle resolution (orphan detection)
// ============================================================

describe("resolveLifecycle", () => {
  it("returns 'none' for truly empty graph", () => {
    const result = resolveLifecycle(null, null, false);
    expect(result.status).toBe("none");
  });

  it("returns 'campaign' when canonical exists", () => {
    const result = resolveLifecycle(null, CID, false);
    expect(result.status).toBe("campaign");
  });

  it("returns 'deleting' when marker exists", () => {
    const marker: DeletionOperation = {
      campaignKey: "default",
      campaignId: CID,
      status: "deleting",
      phase: "campaignEvents",
      startedAt: 1000,
      lastProgressAt: 1000,
    };
    const result = resolveLifecycle(marker, CID, false);
    expect(result.status).toBe("deleting");
  });

  it("returns 'corrupt' when orphaned child records exist without campaign or marker", () => {
    const result = resolveLifecycle(null, null, true);
    expect(result.status).toBe("corrupt");
  });

  it("deletion marker takes priority over orphan detection", () => {
    const marker: DeletionOperation = {
      campaignKey: "default",
      campaignId: CID,
      status: "deleting",
      phase: "campaignEvents",
      startedAt: 1000,
      lastProgressAt: 1000,
    };
    const result = resolveLifecycle(marker, null, true);
    expect(result.status).toBe("deleting");
  });
});

// ============================================================
// 9. Full end-to-end orchestration
// ============================================================

describe("full deletion orchestration end-to-end", () => {
  it("deletes all records across all phases and reaches clean state", async () => {
    const adapter = new InMemoryDeletionAdapter();
    adapter.seedCampaign(CID);
    adapter.seedChildRecords("campaignEvents", CID, 450);
    adapter.seedChildRecords("campaignSnapshots", CID, 300);
    adapter.seedChildRecords("campaignRevisions", CID, 200);
    adapter.seedChildRecords("campaignCheckpoints", CID, 5);
    adapter.seedChildRecords("campaignHistoryControl", CID, 1);

    await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);
    const batches = await runToCompletion(adapter);

    expect(batches).toBeGreaterThan(3);
    expect(adapter.marker).toBeNull();
    expect(adapter.canonicalCampaignId).toBeNull();
    expect(adapter.totalRemainingChildRecords(CID)).toBe(0);

    const lifecycle = resolveLifecycle(null, null, false);
    expect(lifecycle.status).toBe("none");
  });
});

// ============================================================
// 10. Pure domain helpers (kept from original)
// ============================================================

describe("pure domain: validateDeletionRequest", () => {
  it("accepts valid confirmation and campaign ID", () => {
    expect(() => validateDeletionRequest(CID, "DELETE")).not.toThrow();
  });

  it("rejects bad confirmation", () => {
    expect(() => validateDeletionRequest(CID, "delete")).toThrow(DomainError);
  });

  it("rejects invalid campaign ID", () => {
    expect(() => validateDeletionRequest("garbage", "DELETE")).toThrow(DomainError);
  });
});

describe("pure domain: phase progression", () => {
  it("progresses through all phases to complete", () => {
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
});

describe("pure domain: DELETION_BATCH_SIZE", () => {
  it("is 200", () => {
    expect(DELETION_BATCH_SIZE).toBe(200);
  });
});

// ============================================================
// 11. Foreign orphan detection (Blocker 3)
// ============================================================

describe("foreign orphan detection in verify phase", () => {
  let adapter: InMemoryDeletionAdapter;

  beforeEach(() => {
    adapter = new InMemoryDeletionAdapter();
    adapter.seedCampaign(CID);
  });

  it("verify phase throws when foreign child records exist after cleanup", async () => {
    await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);
    adapter.marker = { ...adapter.marker!, phase: "verify" as DeletionPhase };
    adapter.canonicalCampaignId = null;
    adapter.seedChildRecords("campaignEvents", OTHER_CID, 3);

    await expect(processBatch(adapter)).rejects.toThrow(DomainError);
    expect(adapter.marker).not.toBeNull();
  });

  it("verify phase throws with correct error code for foreign orphans", async () => {
    await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);
    adapter.marker = { ...adapter.marker!, phase: "verify" as DeletionPhase };
    adapter.canonicalCampaignId = null;
    adapter.seedChildRecords("campaignSnapshots", OTHER_CID, 1);

    try {
      await processBatch(adapter);
      expect.fail("Should have thrown");
    } catch (e: any) {
      expect(e.code).toBe("CAMPAIGN_STATE_CORRUPT");
      expect(e.message).toContain("foreign campaign");
    }
  });

  it("verify phase succeeds when graph is truly empty", async () => {
    await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);
    adapter.marker = { ...adapter.marker!, phase: "verify" as DeletionPhase };
    adapter.canonicalCampaignId = null;

    const result = await processBatch(adapter);
    expect(result).not.toBeNull();
    expect(result!.finalPhase).toBe("complete");
    expect(adapter.marker).toBeNull();
  });

  it("full deletion with foreign records in another campaign fails at verify", async () => {
    adapter.seedChildRecords("campaignEvents", CID, 5);
    adapter.seedChildRecords("campaignEvents", OTHER_CID, 2);

    await requestDeletion(adapter, CID, DELETION_CONFIRMATION_STRING);

    let threw = false;
    let iterations = 0;
    while (iterations < 200) {
      try {
        const result = await processBatch(adapter);
        if (result === null || !result.continued) break;
      } catch (e: any) {
        if (e.code === "CAMPAIGN_STATE_CORRUPT" && e.message.includes("foreign")) {
          threw = true;
          break;
        }
        throw e;
      }
      iterations++;
    }

    expect(threw).toBe(true);
    expect(adapter.marker).not.toBeNull();
    expect(adapter.totalRemainingChildRecords(CID)).toBe(0);
    expect(await adapter.countChildRecords("campaignEvents", OTHER_CID)).toBe(2);
  });
});
