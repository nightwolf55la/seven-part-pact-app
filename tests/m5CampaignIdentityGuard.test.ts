import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createDenizenFingerprint,
  matchCommandIdempotency,
} from "../shared/domain";
import { DomainError } from "../shared/domain";

const CAMPAIGN_A = "cmp_00000000-0000-0000-0000-000000000001";
const CAMPAIGN_B = "cmp_00000000-0000-0000-0000-000000000002";

// ---------------------------------------------------------------------------
// A. Campaign identity helper behavior
// ---------------------------------------------------------------------------

describe("M5 campaign identity guard — assertM5ExpectedCampaignIdMatches", () => {
  // Lazy import so the RED run fails on the missing export, not on module load.
  async function getHelper() {
    const mod = await import("../convex/m3Commands");
    return mod.assertM5ExpectedCampaignIdMatches;
  }

  it("does not throw when expected and actual campaign IDs match", async () => {
    const assert = await getHelper();
    expect(() => assert(CAMPAIGN_A, CAMPAIGN_A)).not.toThrow();
  });

  it("throws DomainError with STALE_COMMAND_PRECONDITION when expected A but actual B", async () => {
    const assert = await getHelper();
    let caught: DomainError | null = null;
    try {
      assert(CAMPAIGN_A, CAMPAIGN_B);
    } catch (e) {
      caught = e as DomainError;
    }
    expect(caught).toBeInstanceOf(DomainError);
    expect(caught!.code).toBe("STALE_COMMAND_PRECONDITION");
  });

  it("prevents a stale campaign-A command from mutating replacement campaign B (writes remain 0)", async () => {
    const assert = await getHelper();
    let writes = 0;
    try {
      assert(CAMPAIGN_A, CAMPAIGN_B);
      writes++;
    } catch {
      // expected
    }
    expect(writes).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// B. Fingerprint / replay semantics (representative: createDenizen)
// ---------------------------------------------------------------------------

describe("M5 campaign identity guard — fingerprint includes expectedCampaignId", () => {
  const denizenId = "den_00000000-0000-0000-0000-000000000001";
  const name = "Elder Thorn";
  const representation = "individual";
  const description: string | null = null;

  it("same expectedCampaignId + same intent gives same fingerprint", () => {
    const fp1 = createDenizenFingerprint(CAMPAIGN_A, denizenId, name, representation, description);
    const fp2 = createDenizenFingerprint(CAMPAIGN_A, denizenId, name, representation, description);
    expect(fp1).toBe(fp2);
  });

  it("changing expectedCampaignId changes fingerprint", () => {
    const fpA = createDenizenFingerprint(CAMPAIGN_A, denizenId, name, representation, description);
    const fpB = createDenizenFingerprint(CAMPAIGN_B, denizenId, name, representation, description);
    expect(fpA).not.toBe(fpB);
  });

  it("changing ordinary command intent changes fingerprint", () => {
    const fp1 = createDenizenFingerprint(CAMPAIGN_A, denizenId, name, representation, description);
    const fp2 = createDenizenFingerprint(CAMPAIGN_A, denizenId, "Different Name", representation, description);
    expect(fp1).not.toBe(fp2);
  });

  it("fingerprint prefix is v2", () => {
    const fp = createDenizenFingerprint(CAMPAIGN_A, denizenId, name, representation, description);
    expect(fp).toContain("create_denizen:v2:");
  });

  it("exact same fingerprint gives exact_match on replay (unrelated revisions irrelevant)", () => {
    const fp = createDenizenFingerprint(CAMPAIGN_A, denizenId, name, representation, description);
    const committed = {
      commandType: "create_denizen",
      commandFingerprint: fp,
      campaignRevision: 5,
    };
    const attempted = {
      commandType: "create_denizen",
      commandFingerprint: fp,
    };
    const result = matchCommandIdempotency(committed, attempted);
    expect(result.kind).toBe("exact_match");
    if (result.kind === "exact_match") {
      expect(result.revision).toBe(5);
    }
  });

  it("incompatible fingerprint with reused command ID gives conflict", () => {
    const fpA = createDenizenFingerprint(CAMPAIGN_A, denizenId, name, representation, description);
    const fpB = createDenizenFingerprint(CAMPAIGN_A, denizenId, "Other Name", representation, description);
    const committed = {
      commandType: "create_denizen",
      commandFingerprint: fpA,
      campaignRevision: 3,
    };
    const attempted = {
      commandType: "create_denizen",
      commandFingerprint: fpB,
    };
    const result = matchCommandIdempotency(committed, attempted);
    expect(result.kind).toBe("conflict");
  });
});

// ---------------------------------------------------------------------------
// C. Ten-handler structural guardrail
// ---------------------------------------------------------------------------

describe("M5 campaign identity guard — structural ordering of World handlers", () => {
  const source = readFileSync(
    join(__dirname, "..", "convex", "m3Commands.ts"),
    "utf8",
  );

  const worldMutations = [
    "createDenizen",
    "updateDenizen",
    "createIsle",
    "updateIsle",
    "createPlace",
    "updatePlace",
    "setWizardHomeIsle",
    "setWizardSanctum",
    "setWizardCompanion",
    "updateCompanionDescription",
  ] as const;

  function extractHandlerBlock(name: string): string {
    const exportIdx = source.indexOf(`export const ${name} = mutation({`);
    expect(exportIdx, `${name} mutation not found`).toBeGreaterThan(-1);
    const handlerIdx = source.indexOf("handler: async (ctx, args) => {", exportIdx);
    expect(handlerIdx).toBeGreaterThan(-1);
    const endPattern = "\n  },\n});";
    const endIdx = source.indexOf(endPattern, handlerIdx);
    expect(endIdx, `${name} handler end not found`).toBeGreaterThan(-1);
    return source.slice(handlerIdx, endIdx);
  }

  for (const mutationName of worldMutations) {
    it(`${mutationName} args include expectedCampaignId: v.string()`, () => {
      const exportIdx = source.indexOf(`export const ${mutationName} = mutation({`);
      const argsStart = source.indexOf("args: {", exportIdx);
      const argsEnd = source.indexOf("\n  },", argsStart);
      const argsBlock = source.slice(argsStart, argsEnd);
      expect(argsBlock).toContain("expectedCampaignId: v.string()");
    });
  }

  for (const mutationName of worldMutations) {
    describe(`${mutationName} (executor-backed)`, () => {
      it("delegates the persistence protocol to executeConvexOrdinaryLogicalCommand", () => {
        const block = extractHandlerBlock(mutationName);
        expect(block).toContain("executeConvexOrdinaryLogicalCommand");
        expect(block).not.toContain("checkIdempotency");
        expect(block).not.toContain("commitM3Command");
        expect(block).not.toContain("loadCanonicalV2ForMutation");
      });
    });
  }
});

// ---------------------------------------------------------------------------
// D. PlayShell passes campaignId to WorldSurface and TableWizards
// ---------------------------------------------------------------------------

describe("M5 campaign identity guard — PlayShell passes campaignId", () => {
  const source = readFileSync(
    join(__dirname, "..", "src", "PlayShell.tsx"),
    "utf8",
  );

  it("passes campaignId to WorldSurface via renderWorld", () => {
    expect(source).toContain("campaignId={campaignId}");
  });

  it("passes campaignId to TableWizards via renderSurface", () => {
    const twIdx = source.indexOf("<TableWizards");
    const twEnd = source.indexOf("/>", twIdx);
    const twBlock = source.slice(twIdx, twEnd);
    expect(twBlock).toContain("campaignId={ref.campaignId}");
  });
});

// ---------------------------------------------------------------------------
// E. TableWizards uses characterCampaignId for M5 association mutations
// ---------------------------------------------------------------------------

describe("M5 campaign identity guard — TableWizards captures campaign ID at sheet open", () => {
  const source = readFileSync(
    join(__dirname, "..", "src", "TableWizards.tsx"),
    "utf8",
  );

  it("has characterCampaignId state", () => {
    expect(source).toContain("characterCampaignId");
  });

  it("all four M5 association mutations use expectedCampaignId: characterCampaignId", () => {
    const mutations = [
      "setWizardHomeIsle",
      "setWizardSanctum",
      "setWizardCompanion",
      "updateCompanionDescription",
    ];
    for (const m of mutations) {
      const callIdx = source.indexOf(`await ${m}(`);
      expect(callIdx, `${m} call not found`).toBeGreaterThan(-1);
      // Grab a window around the call to find expectedCampaignId
      const window = source.slice(callIdx, callIdx + 600);
      expect(
        window.includes("expectedCampaignId: characterCampaignId"),
        `${m} must use expectedCampaignId: characterCampaignId`,
      ).toBe(true);
    }
  });
});
