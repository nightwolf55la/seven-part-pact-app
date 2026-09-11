import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  CampaignStateV5,
  IsleId,
  LoreCollectionId,
  LoreEntryId,
  PlaceId,
  PlayerId,
  WizardId,
} from "../shared/domain";
import {
  BLANK_WIZARD_CHARACTER_V5,
  CAMPAIGN_COMMAND_TYPES,
  DomainError,
  addLoreEntryFingerprint,
  applyAddLoreEntry,
  applyReviseLoreEntry,
  buildInitializedDefaultNecromancerState,
  canonicalJsonStringify,
  isLogicalStateCommandType,
  readEffectiveSourceLore,
  reviseLoreEntryFingerprint,
  selectMarinerIsleLoreContext,
  sourceLoreCollectionDefinition,
  DRAFT4_V1_SOURCE_LORE_CATALOG,
  validateCampaignStateV5Candidate,
} from "../shared/domain";
import { makeTestCampaignStateV5 } from "./test-state";
import { validateEventCoherenceForTest } from "../convex/canonicalCommit";
import type { CanonicalCommitInput } from "../convex/canonicalCommit";
import {
  executeOrdinaryLogicalCommand,
  type CanonicalCampaign,
  type OrdinaryLogicalCommandIo,
  type OrdinaryLogicalCommandPreparation,
} from "../convex/ordinaryLogicalCommand";
import * as m3Queries from "../convex/m3Queries";

const CAMPAIGN_A = "cmp_00000000-0000-0000-0000-000000000001";
const CAMPAIGN_B = "cmp_00000000-0000-0000-0000-000000000002";
const COMMAND_1 = "cmd_00000000-0000-0000-0000-000000000001";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_NECRO = "wiz_00000000-0000-0000-0000-0000000000aa" as WizardId;
const ISL_GRAVEN = "isl_00000000-0000-0000-0000-0000000000aa" as IsleId;
const ISL_OTHER = "isl_00000000-0000-0000-0000-0000000000ab" as IsleId;
const PLC_CRYPT = "plc_00000000-0000-0000-0000-0000000000aa" as PlaceId;
const PLC_UNSPEC = "plc_00000000-0000-0000-0000-0000000000ab" as PlaceId;
const LCOL_1 = "lcol_00000000-0000-0000-0000-0000000000aa" as LoreCollectionId;
const LCOL_2 = "lcol_00000000-0000-0000-0000-0000000000ab" as LoreCollectionId;
const LORE_1 = "lore_00000000-0000-0000-0000-0000000000aa" as LoreEntryId;
const LORE_2 = "lore_00000000-0000-0000-0000-0000000000ab" as LoreEntryId;
const CAMPAIGN_GATE = "ngt_00000000-0000-0000-0000-0000000000aa";
const GRAVEN_E01 =
  "The Graven Isle is a cold and miserable place, covered in dark clouds and filled with countless memorials to the dead.";
const GRAVEN_SUBJECT = { kind: "isle" as const, isleId: ISL_GRAVEN };
const WRONG_ISLE_SUBJECT = { kind: "isle" as const, isleId: ISL_OTHER };

function expectCode(run: () => unknown, code: DomainError["code"], pattern?: RegExp): void {
  expect(run).toThrow(DomainError);
  try {
    run();
  } catch (error) {
    expect((error as DomainError).code).toBe(code);
    if (pattern !== undefined) {
      expect((error as DomainError).message).toMatch(pattern);
    }
  }
}

function wizard(homeIsleId: IsleId | null = ISL_GRAVEN, sanctumPlaceId: PlaceId | null = PLC_CRYPT) {
  return {
    wizardId: WIZ_NECRO,
    name: "The Necromancer",
    portrayedByPlayerId: PLR_A,
    character: { ...BLANK_WIZARD_CHARACTER_V5 },
    homeIsleId,
    sanctumPlaceId,
    mortalityState: "not_deceased" as const,
  };
}

function world(isles: IsleId[] = [ISL_GRAVEN, ISL_OTHER]) {
  return {
    denizens: [],
    isles: isles.map((isleId) => ({
      isleId,
      name: isleId === ISL_GRAVEN ? "Graven Isle" : "Other Isle",
      description: null,
    })),
    places: [
      { placeId: PLC_CRYPT, name: "Crypt", description: null, placement: { kind: "on_isle" as const, isleId: ISL_GRAVEN } },
      { placeId: PLC_UNSPEC, name: "Nameless ruin", description: null, placement: { kind: "unspecified" as const } },
    ],
    companionRelationships: [],
    campaignPowerfulDenizenTaxonomies: [],
    treasures: [],
  };
}

function boundState(overrides?: Partial<CampaignStateV5>): CampaignStateV5 {
  return makeTestCampaignStateV5({
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [wizard()],
    pactSeats: {
      ...makeTestCampaignStateV5().pactSeats,
      necromancer: { status: "present", wizardId: WIZ_NECRO, watcherPlayerId: null },
    },
    world: world(),
    necromancer: buildInitializedDefaultNecromancerState({
      campaignGates: [{
        origin: "campaign",
        gateId: CAMPAIGN_GATE as never,
        name: "The Ash Gate",
        band: "near",
        status: "ordinary",
      }],
    }),
    ...overrides,
  });
}

function unboundNecromancerHome(): CampaignStateV5 {
  return boundState({
    wizards: [wizard(null, null)],
  });
}

function campaignOf(campaignId: string, state: CampaignStateV5, revision = 4): CanonicalCampaign {
  return {
    docId: "dummy" as CanonicalCommitInput["campaignDocId"],
    campaignId,
    currentRevision: revision,
    currentState: state,
  };
}

function recordingIo(options: {
  campaign: CanonicalCampaign;
  accepted?: { commandType: string; commandFingerprint: string; campaignRevision: number };
  snapshot?: CampaignStateV5;
}) {
  const commits: CanonicalCommitInput[] = [];
  const io: OrdinaryLogicalCommandIo = {
    async assertNotDeleting() {},
    async loadCanonicalCampaign() {
      return options.campaign;
    },
    async findAcceptedCommand() {
      return options.accepted === undefined ? null : options.accepted;
    },
    async loadCommittedSnapshot() {
      return options.snapshot === undefined ? options.campaign.currentState : options.snapshot;
    },
    async commit(input) {
      commits.push(input);
      return { newRevision: options.campaign.currentRevision + 1, state: input.nextState, alreadyApplied: false };
    },
  };
  return { io, commits };
}

describe("add_lore_entry / revise_lore_entry command registration", () => {
  it("registers both commands as logical-state operations", () => {
    expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain("add_lore_entry");
    expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain("revise_lore_entry");
    expect(isLogicalStateCommandType("add_lore_entry")).toBe(true);
    expect(isLogicalStateCommandType("revise_lore_entry")).toBe(true);
  });
});

describe("add_lore_entry source first use", () => {
  it("binds an uninstantiated source collection to the expected subject and appends the first authored entry", () => {
    const before = boundState();
    const elements = canonicalJsonStringify(before.wizards[0]?.character.elements);
    const result = applyAddLoreEntry(before, {
      target: {
        kind: "source",
        sourceCollectionId: "necromancer.home.graven_isle",
        expectedSubject: GRAVEN_SUBJECT,
      },
      loreEntryId: LORE_1,
      text: "A new memorial was raised this year.",
    });
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
    expect(result.nextState.lore.sourceCollections).toHaveLength(1);
    expect(result.nextState.lore.campaignCollections).toEqual([]);
    expect(result.nextState.lore.sourceCollections[0]).toEqual({
      sourceCollectionId: "necromancer.home.graven_isle",
      boundSubject: GRAVEN_SUBJECT,
      overrides: [],
      additions: [{ loreEntryId: LORE_1, text: "A new memorial was raised this year." }],
    });
    expect(result.events).toEqual([{
      type: "lore_entry_added",
      version: 1,
      data: {
        collection: {
          kind: "source",
          sourceCollectionId: "necromancer.home.graven_isle",
          boundSubject: GRAVEN_SUBJECT,
        },
        loreEntryId: LORE_1,
        text: "A new memorial was raised this year.",
        collectionCreated: true,
      },
    }]);
    expect(canonicalJsonStringify(result.nextState.wizards[0]?.character.elements)).toBe(elements);
    expect(result.nextState.hierophant).toEqual(before.hierophant);
    expect(result.nextState.necromancer).toEqual(before.necromancer);
  });

  it("rejects a wrong expected subject as stale with zero Lore change", () => {
    const before = boundState();
    expectCode(
      () => applyAddLoreEntry(before, {
        target: {
          kind: "source",
          sourceCollectionId: "necromancer.home.graven_isle",
          expectedSubject: WRONG_ISLE_SUBJECT,
        },
        loreEntryId: LORE_1,
        text: "Wrong isle.",
      }),
      "STALE_COMMAND_PRECONDITION",
    );
    expect(before.lore).toEqual({ sourceCollections: [], campaignCollections: [] });
  });

  it("rejects a missing binding prerequisite with zero Lore change and no campaign fallback", () => {
    const before = unboundNecromancerHome();
    expectCode(
      () => applyAddLoreEntry(before, {
        target: {
          kind: "source",
          sourceCollectionId: "necromancer.home.graven_isle",
          expectedSubject: GRAVEN_SUBJECT,
        },
        loreEntryId: LORE_1,
        text: "Cannot bind yet.",
      }),
      "INVALID_CAMPAIGN_STATE",
      /not_ready|unavailable|cannot bind/i,
    );
    expect(before.lore.sourceCollections).toEqual([]);
    expect(before.lore.campaignCollections).toEqual([]);
  });
});

describe("add_lore_entry existing source", () => {
  it("appends another authored entry without rebinding, even if the current home pointer later differs", () => {
    const first = applyAddLoreEntry(boundState(), {
      target: {
        kind: "source",
        sourceCollectionId: "necromancer.home.graven_isle",
        expectedSubject: GRAVEN_SUBJECT,
      },
      loreEntryId: LORE_1,
      text: "First addition.",
    });
    const retargeted: CampaignStateV5 = {
      ...first.nextState,
      wizards: [wizard(ISL_OTHER, PLC_CRYPT)],
    };
    const second = applyAddLoreEntry(retargeted, {
      target: {
        kind: "source",
        sourceCollectionId: "necromancer.home.graven_isle",
        expectedSubject: GRAVEN_SUBJECT,
      },
      loreEntryId: LORE_2,
      text: "Second addition.",
    });
    expect(second.nextState.lore.sourceCollections).toHaveLength(1);
    expect(second.nextState.lore.sourceCollections[0]?.boundSubject).toEqual(GRAVEN_SUBJECT);
    expect(second.nextState.lore.sourceCollections[0]?.additions.map((entry) => entry.loreEntryId)).toEqual([
      LORE_1,
      LORE_2,
    ]);
    expect(second.events[0]).toMatchObject({
      type: "lore_entry_added",
      data: { collectionCreated: false, loreEntryId: LORE_2 },
    });
  });
});

describe("add_lore_entry campaign collection", () => {
  it("creates a campaign collection and first entry atomically, then appends with the same collection ID", () => {
    const first = applyAddLoreEntry(boundState(), {
      target: {
        kind: "campaign",
        collectionId: LCOL_1,
        subject: { kind: "isle", isleId: ISL_OTHER },
      },
      loreEntryId: LORE_1,
      text: "The Driftwood Isle appeared after a storm.",
    });
    expect(first.nextState.lore.campaignCollections).toEqual([{
      collectionId: LCOL_1,
      subject: { kind: "isle", isleId: ISL_OTHER },
      entries: [{ loreEntryId: LORE_1, text: "The Driftwood Isle appeared after a storm." }],
    }]);
    expect(first.events[0]).toMatchObject({
      type: "lore_entry_added",
      data: {
        collectionCreated: true,
        collection: { kind: "campaign", collectionId: LCOL_1, subject: { kind: "isle", isleId: ISL_OTHER } },
      },
    });

    const second = applyAddLoreEntry(first.nextState, {
      target: {
        kind: "campaign",
        collectionId: LCOL_1,
        subject: { kind: "isle", isleId: ISL_OTHER },
      },
      loreEntryId: LORE_2,
      text: "Fishermen now avoid its shoals.",
    });
    expect(second.nextState.lore.campaignCollections[0]?.entries).toHaveLength(2);
    expect(second.events[0]).toMatchObject({ data: { collectionCreated: false } });
  });

  it("rejects the same subject with a different proposed collection ID as stale", () => {
    const first = applyAddLoreEntry(boundState(), {
      target: { kind: "campaign", collectionId: LCOL_1, subject: { kind: "place", placeId: PLC_UNSPEC } },
      loreEntryId: LORE_1,
      text: "No chart places this ruin.",
    });
    expectCode(
      () => applyAddLoreEntry(first.nextState, {
        target: { kind: "campaign", collectionId: LCOL_2, subject: { kind: "place", placeId: PLC_UNSPEC } },
        loreEntryId: LORE_2,
        text: "Still unplaced.",
      }),
      "STALE_COMMAND_PRECONDITION",
    );
  });

  it("supports campaign-created Isle, unspecified Place, and campaign Gate subjects", () => {
    const isle = applyAddLoreEntry(boundState(), {
      target: { kind: "campaign", collectionId: LCOL_1, subject: { kind: "isle", isleId: ISL_OTHER } },
      loreEntryId: LORE_1,
      text: "Isle lore.",
    });
    const place = applyAddLoreEntry(isle.nextState, {
      target: { kind: "campaign", collectionId: LCOL_2, subject: { kind: "place", placeId: PLC_UNSPEC } },
      loreEntryId: LORE_2,
      text: "Place lore.",
    });
    const gate = applyAddLoreEntry(place.nextState, {
      target: {
        kind: "campaign",
        collectionId: "lcol_00000000-0000-0000-0000-0000000000ac" as LoreCollectionId,
        subject: { kind: "necromancer_gate", gateId: CAMPAIGN_GATE as never },
      },
      loreEntryId: "lore_00000000-0000-0000-0000-0000000000ac" as LoreEntryId,
      text: "Gate lore.",
    });
    expect(() => validateCampaignStateV5Candidate(gate.nextState)).not.toThrow();
    expect(gate.nextState.lore.campaignCollections).toHaveLength(3);
  });
});

describe("add_lore_entry identity and text", () => {
  it("rejects malformed and duplicate LoreEntryId values", () => {
    expectCode(
      () => applyAddLoreEntry(boundState(), {
        target: { kind: "campaign", collectionId: LCOL_1, subject: { kind: "isle", isleId: ISL_OTHER } },
        loreEntryId: "not-a-lore-id" as LoreEntryId,
        text: "Bad id.",
      }),
      "INVALID_CAMPAIGN_STATE",
      /loreEntryId/,
    );
    const first = applyAddLoreEntry(boundState(), {
      target: { kind: "campaign", collectionId: LCOL_1, subject: { kind: "isle", isleId: ISL_OTHER } },
      loreEntryId: LORE_1,
      text: "First.",
    });
    expectCode(
      () => applyAddLoreEntry(first.nextState, {
        target: { kind: "campaign", collectionId: LCOL_1, subject: { kind: "isle", isleId: ISL_OTHER } },
        loreEntryId: LORE_1,
        text: "Duplicate.",
      }),
      "INVALID_CAMPAIGN_STATE",
      /Duplicate loreEntryId/,
    );
  });

  it("rejects a conflicting LoreCollectionId already used by another campaign collection", () => {
    const first = applyAddLoreEntry(boundState(), {
      target: { kind: "campaign", collectionId: LCOL_1, subject: { kind: "isle", isleId: ISL_OTHER } },
      loreEntryId: LORE_1,
      text: "Isle lore.",
    });
    expectCode(
      () => applyAddLoreEntry(first.nextState, {
        target: { kind: "campaign", collectionId: LCOL_1, subject: { kind: "place", placeId: PLC_UNSPEC } },
        loreEntryId: LORE_2,
        text: "Place lore.",
      }),
      "INVALID_CAMPAIGN_STATE",
      /LoreCollectionId|collectionId/,
    );
  });

  it("rejects blank and oversized authored text while preserving accepted submitted text", () => {
    expectCode(
      () => applyAddLoreEntry(boundState(), {
        target: { kind: "campaign", collectionId: LCOL_1, subject: { kind: "isle", isleId: ISL_OTHER } },
        loreEntryId: LORE_1,
        text: "   ",
      }),
      "INVALID_CAMPAIGN_STATE",
      /nonblank/,
    );
    expectCode(
      () => applyAddLoreEntry(boundState(), {
        target: { kind: "campaign", collectionId: LCOL_1, subject: { kind: "isle", isleId: ISL_OTHER } },
        loreEntryId: LORE_1,
        text: "x".repeat(8001),
      }),
      "INVALID_CAMPAIGN_STATE",
      /8000/,
    );
    const padded = applyAddLoreEntry(boundState(), {
      target: { kind: "campaign", collectionId: LCOL_1, subject: { kind: "isle", isleId: ISL_OTHER } },
      loreEntryId: LORE_1,
      text: "  kept as submitted  ",
    });
    expect(padded.nextState.lore.campaignCollections[0]?.entries[0]?.text).toBe("  kept as submitted  ");
  });
});

describe("revise_lore_entry source entry", () => {
  it("can bind an uninstantiated source collection and create a sparse override", () => {
    const result = applyReviseLoreEntry(boundState(), {
      target: {
        kind: "source_entry",
        sourceCollectionId: "necromancer.home.graven_isle",
        sourceEntryId: "e01",
        expectedSubject: GRAVEN_SUBJECT,
      },
      expectedText: GRAVEN_E01,
      text: "Revised Graven weather.",
    });
    expect(result.nextState.lore.sourceCollections[0]).toEqual({
      sourceCollectionId: "necromancer.home.graven_isle",
      boundSubject: GRAVEN_SUBJECT,
      overrides: [{ sourceEntryId: "e01", currentText: "Revised Graven weather." }],
      additions: [],
    });
    expect(result.events).toEqual([{
      type: "lore_entry_revised",
      version: 1,
      data: {
        target: {
          kind: "source_entry",
          sourceCollectionId: "necromancer.home.graven_isle",
          sourceEntryId: "e01",
          boundSubject: GRAVEN_SUBJECT,
        },
        previousText: GRAVEN_E01,
        text: "Revised Graven weather.",
        sourceCollectionBound: true,
      },
    }]);
    const definition = sourceLoreCollectionDefinition(DRAFT4_V1_SOURCE_LORE_CATALOG, "necromancer.home.graven_isle");
    expect(definition?.entries[0]?.text).toBe(GRAVEN_E01);
  });

  it("rejects stale expected text and stale expected subject", () => {
    expectCode(
      () => applyReviseLoreEntry(boundState(), {
        target: {
          kind: "source_entry",
          sourceCollectionId: "necromancer.home.graven_isle",
          sourceEntryId: "e01",
          expectedSubject: GRAVEN_SUBJECT,
        },
        expectedText: "Not the current Graven text.",
        text: "Revised.",
      }),
      "STALE_COMMAND_PRECONDITION",
    );
    expectCode(
      () => applyReviseLoreEntry(boundState(), {
        target: {
          kind: "source_entry",
          sourceCollectionId: "necromancer.home.graven_isle",
          sourceEntryId: "e01",
          expectedSubject: WRONG_ISLE_SUBJECT,
        },
        expectedText: GRAVEN_E01,
        text: "Revised.",
      }),
      "STALE_COMMAND_PRECONDITION",
    );
  });

  it("removes only the redundant override when restoring baseline text", () => {
    const overridden = applyReviseLoreEntry(boundState(), {
      target: {
        kind: "source_entry",
        sourceCollectionId: "necromancer.home.graven_isle",
        sourceEntryId: "e01",
        expectedSubject: GRAVEN_SUBJECT,
      },
      expectedText: GRAVEN_E01,
      text: "Revised Graven weather.",
    });
    const restored = applyReviseLoreEntry(overridden.nextState, {
      target: {
        kind: "source_entry",
        sourceCollectionId: "necromancer.home.graven_isle",
        sourceEntryId: "e01",
        expectedSubject: GRAVEN_SUBJECT,
      },
      expectedText: "Revised Graven weather.",
      text: GRAVEN_E01,
    });
    expect(restored.nextState.lore.sourceCollections).toHaveLength(1);
    expect(restored.nextState.lore.sourceCollections[0]?.boundSubject).toEqual(GRAVEN_SUBJECT);
    expect(restored.nextState.lore.sourceCollections[0]?.overrides).toEqual([]);
    const read = readEffectiveSourceLore(restored.nextState, "necromancer.home.graven_isle");
    expect(read.ok && read.entries[0]?.text).toBe(GRAVEN_E01);
    expect(read.ok && read.entries.map((entry) => (entry.origin === "source" ? entry.sourceEntryId : entry.loreEntryId))).toEqual([
      "e01",
      "e02",
      "e03",
      "e04",
      "e05",
    ]);
  });

  it("rejects an exact no-op replacement without binding", () => {
    const before = boundState();
    expectCode(
      () => applyReviseLoreEntry(before, {
        target: {
          kind: "source_entry",
          sourceCollectionId: "necromancer.home.graven_isle",
          sourceEntryId: "e01",
          expectedSubject: GRAVEN_SUBJECT,
        },
        expectedText: GRAVEN_E01,
        text: GRAVEN_E01,
      }),
      "INVALID_CAMPAIGN_STATE",
      /no-op|no change/i,
    );
    expect(before.lore.sourceCollections).toEqual([]);
  });
});

describe("revise_lore_entry authored entries", () => {
  it("revises a source-collection addition in place with explicit source context", () => {
    const added = applyAddLoreEntry(boundState(), {
      target: {
        kind: "source",
        sourceCollectionId: "necromancer.home.graven_isle",
        expectedSubject: GRAVEN_SUBJECT,
      },
      loreEntryId: LORE_1,
      text: "First addition.",
    });
    const revised = applyReviseLoreEntry(added.nextState, {
      target: {
        kind: "source_addition",
        sourceCollectionId: "necromancer.home.graven_isle",
        loreEntryId: LORE_1,
        expectedSubject: GRAVEN_SUBJECT,
      },
      expectedText: "First addition.",
      text: "Revised addition.",
    });
    expect(revised.nextState.lore.sourceCollections[0]?.additions).toEqual([
      { loreEntryId: LORE_1, text: "Revised addition." },
    ]);
    expect(revised.events[0]).toMatchObject({
      type: "lore_entry_revised",
      data: {
        target: {
          kind: "source_addition",
          sourceCollectionId: "necromancer.home.graven_isle",
          loreEntryId: LORE_1,
          boundSubject: GRAVEN_SUBJECT,
        },
        previousText: "First addition.",
        text: "Revised addition.",
        sourceCollectionBound: false,
      },
    });
  });

  it("revises a campaign-collection entry in place and rejects missing containers", () => {
    const added = applyAddLoreEntry(boundState(), {
      target: { kind: "campaign", collectionId: LCOL_1, subject: { kind: "isle", isleId: ISL_OTHER } },
      loreEntryId: LORE_1,
      text: "Isle lore.",
    });
    const revised = applyReviseLoreEntry(added.nextState, {
      target: { kind: "campaign_entry", collectionId: LCOL_1, loreEntryId: LORE_1 },
      expectedText: "Isle lore.",
      text: "Revised isle lore.",
    });
    expect(revised.nextState.lore.campaignCollections[0]).toEqual({
      collectionId: LCOL_1,
      subject: { kind: "isle", isleId: ISL_OTHER },
      entries: [{ loreEntryId: LORE_1, text: "Revised isle lore." }],
    });
    expectCode(
      () => applyReviseLoreEntry(added.nextState, {
        target: { kind: "campaign_entry", collectionId: LCOL_2, loreEntryId: LORE_1 },
        expectedText: "Isle lore.",
        text: "Wrong collection.",
      }),
      "INVALID_CAMPAIGN_STATE",
    );
    expectCode(
      () => applyReviseLoreEntry(added.nextState, {
        target: { kind: "campaign_entry", collectionId: LCOL_1, loreEntryId: LORE_2 },
        expectedText: "Isle lore.",
        text: "Missing entry.",
      }),
      "INVALID_CAMPAIGN_STATE",
    );
    expectCode(
      () => applyReviseLoreEntry(added.nextState, {
        target: { kind: "campaign_entry", collectionId: LCOL_1, loreEntryId: LORE_1 },
        expectedText: "Isle lore.",
        text: "Isle lore.",
      }),
      "INVALID_CAMPAIGN_STATE",
      /no-op|no change/i,
    );
  });
});

describe("lore command idempotency and fingerprints", () => {
  it("fingerprints include complete caller intent and exclude derived binding results", () => {
    const addInput = {
      target: {
        kind: "source" as const,
        sourceCollectionId: "necromancer.home.graven_isle" as const,
        expectedSubject: GRAVEN_SUBJECT,
      },
      loreEntryId: LORE_1,
      text: "First addition.",
    };
    expect(addLoreEntryFingerprint(CAMPAIGN_A, addInput)).toBe(addLoreEntryFingerprint(CAMPAIGN_A, addInput));
    expect(addLoreEntryFingerprint(CAMPAIGN_A, addInput)).not.toBe(addLoreEntryFingerprint(CAMPAIGN_B, addInput));
    expect(addLoreEntryFingerprint(CAMPAIGN_A, addInput)).not.toBe(
      addLoreEntryFingerprint(CAMPAIGN_A, { ...addInput, text: "Different." }),
    );
    const reviseInput = {
      target: {
        kind: "source_entry" as const,
        sourceCollectionId: "necromancer.home.graven_isle" as const,
        sourceEntryId: "e01",
        expectedSubject: GRAVEN_SUBJECT,
      },
      expectedText: GRAVEN_E01,
      text: "Revised.",
    };
    expect(reviseLoreEntryFingerprint(CAMPAIGN_A, reviseInput)).not.toBe(
      reviseLoreEntryFingerprint(CAMPAIGN_A, { ...reviseInput, expectedText: "Other." }),
    );
  });

  it("replays exact add/revise commandIds and conflicts when the payload changes", async () => {
    const addInput = {
      target: {
        kind: "source" as const,
        sourceCollectionId: "necromancer.home.graven_isle" as const,
        expectedSubject: GRAVEN_SUBJECT,
      },
      loreEntryId: LORE_1,
      text: "First addition.",
    };
    const addFingerprint = addLoreEntryFingerprint(CAMPAIGN_A, addInput);
    const addPrepare: () => OrdinaryLogicalCommandPreparation = () => ({
      commandType: "add_lore_entry",
      commandFingerprint: addFingerprint,
      apply: (current) => applyAddLoreEntry(current, addInput),
    });
    const accepted = recordingIo({ campaign: campaignOf(CAMPAIGN_A, boundState(), 4) });
    const receipt = await executeOrdinaryLogicalCommand(
      accepted.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      addPrepare,
    );
    expect(receipt).toEqual({ revision: 5 });
    expect(accepted.commits[0]?.events[0]?.type).toBe("lore_entry_added");
    expect(() => validateEventCoherenceForTest(accepted.commits[0]!, 1)).not.toThrow();
    expect(accepted.commits[0]?.nextState.lore.sourceCollections[0]?.additions).toHaveLength(1);

    const replay = recordingIo({
      campaign: campaignOf(CAMPAIGN_A, accepted.commits[0]!.nextState, 5),
      accepted: { commandType: "add_lore_entry", commandFingerprint: addFingerprint, campaignRevision: 5 },
      snapshot: accepted.commits[0]!.nextState,
    });
    const replayReceipt = await executeOrdinaryLogicalCommand(
      replay.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      addPrepare,
    );
    expect(replayReceipt).toEqual({ revision: 5 });
    expect(replay.commits).toHaveLength(0);

    const conflict = recordingIo({
      campaign: campaignOf(CAMPAIGN_A, boundState()),
      accepted: { commandType: "add_lore_entry", commandFingerprint: addFingerprint, campaignRevision: 5 },
    });
    await expect(executeOrdinaryLogicalCommand(
      conflict.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      () => ({
        commandType: "add_lore_entry",
        commandFingerprint: addLoreEntryFingerprint(CAMPAIGN_A, { ...addInput, text: "Changed payload." }),
        apply: (current) => applyAddLoreEntry(current, { ...addInput, text: "Changed payload." }),
      }),
    )).rejects.toMatchObject({ code: "COMMAND_ID_REUSED" });

    const reviseInput = {
      target: {
        kind: "source_entry" as const,
        sourceCollectionId: "necromancer.home.graven_isle" as const,
        sourceEntryId: "e01",
        expectedSubject: GRAVEN_SUBJECT,
      },
      expectedText: GRAVEN_E01,
      text: "Revised Graven weather.",
    };
    const reviseFingerprint = reviseLoreEntryFingerprint(CAMPAIGN_A, reviseInput);
    const revisePrepare: () => OrdinaryLogicalCommandPreparation = () => ({
      commandType: "revise_lore_entry",
      commandFingerprint: reviseFingerprint,
      apply: (current) => applyReviseLoreEntry(current, reviseInput),
    });
    const reviseAccepted = recordingIo({ campaign: campaignOf(CAMPAIGN_A, boundState(), 8) });
    const reviseReceipt = await executeOrdinaryLogicalCommand(
      reviseAccepted.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      revisePrepare,
    );
    expect(reviseReceipt).toEqual({ revision: 9 });
    expect(reviseAccepted.commits[0]?.events[0]?.type).toBe("lore_entry_revised");
    expect(() => validateEventCoherenceForTest(reviseAccepted.commits[0]!, 1)).not.toThrow();

    const reviseReplay = recordingIo({
      campaign: campaignOf(CAMPAIGN_A, reviseAccepted.commits[0]!.nextState, 9),
      accepted: { commandType: "revise_lore_entry", commandFingerprint: reviseFingerprint, campaignRevision: 9 },
      snapshot: reviseAccepted.commits[0]!.nextState,
    });
    const reviseReplayReceipt = await executeOrdinaryLogicalCommand(
      reviseReplay.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      revisePrepare,
    );
    expect(reviseReplayReceipt).toEqual({ revision: 9 });
    expect(reviseReplay.commits).toHaveLength(0);
  });

  it("rejects the wrong semantic event type for each Lore command", () => {
    const addCommit = {
      campaignDocId: "dummy" as CanonicalCommitInput["campaignDocId"],
      campaignId: CAMPAIGN_A,
      currentRevision: 4,
      currentState: boundState(),
      commandId: COMMAND_1,
      commandType: "add_lore_entry" as const,
      commandFingerprint: "add_lore_entry:v1:test",
      nextState: boundState(),
      events: [{
        type: "lore_entry_revised" as const,
        version: 1 as const,
        data: {
          target: {
            kind: "campaign_entry" as const,
            collectionId: LCOL_1,
            loreEntryId: LORE_1,
            subject: GRAVEN_SUBJECT,
          },
          previousText: "a",
          text: "b",
          sourceCollectionBound: false,
        },
      }],
      historyControlUpdate: { kind: "logical_state_append" as const },
    };
    expect(() => validateEventCoherenceForTest(addCommit, 5)).toThrow(DomainError);
  });
});

describe("lore command context and non-effects", () => {
  it("never redirects an explicit owner source write when Mariner status would select delegated context", () => {
    const absent = boundState({
      pactSeats: {
        ...makeTestCampaignStateV5().pactSeats,
        necromancer: { status: "absent", wizardId: WIZ_NECRO, watcherPlayerId: null },
      },
    });
    const selection = selectMarinerIsleLoreContext("necromancer", absent.pactSeats.necromancer.status);
    expect(selection).toMatchObject({ kind: "selected", role: "mariner_delegated" });
    const result = applyAddLoreEntry(absent, {
      target: {
        kind: "source",
        sourceCollectionId: "necromancer.home.graven_isle",
        expectedSubject: GRAVEN_SUBJECT,
      },
      loreEntryId: LORE_1,
      text: "Owner collection write.",
    });
    expect(result.nextState.lore.sourceCollections.map((collection) => collection.sourceCollectionId)).toEqual([
      "necromancer.home.graven_isle",
    ]);
    expect(result.nextState.pactSeats.necromancer.status).toBe("absent");
  });
});

describe("getLoreReference", () => {
  it("is wired through validated CampaignState and returns ruleset plus persisted Lore", () => {
    expect(typeof (m3Queries as { getLoreReference?: unknown }).getLoreReference).toBe("function");
    const source = readFileSync(join(__dirname, "../convex/m3Queries.ts"), "utf8");
    const handler = source.slice(source.indexOf("export const getLoreReference"));
    expect(handler).toMatch(/validateCampaignState\(doc\.state\)/);
    expect(handler).toMatch(/campaignId: doc\.campaignId/);
    expect(handler).toMatch(/campaignRevision: doc\.campaignRevision/);
    expect(handler).toMatch(/ruleset: current\.ruleset/);
    expect(handler).toMatch(/lore: current\.lore/);
  });
});
