import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type {
  CampaignStateV5,
  IsleId,
  LoreCollectionId,
  LoreEntryId,
  PlaceId,
  PlayerId,
  RulesetRef,
  WizardId,
} from "../shared/domain";
import {
  BLANK_WIZARD_CHARACTER_V5,
  CURRENT_RULESET,
  DRAFT4_V1_SOURCE_LORE_CATALOG,
  DRAFT4_V1_SOURCE_LORE_CATALOG_SEMANTIC_DIGEST,
  DRAFT4_V1_SOURCE_LORE_COLLECTION_IDS,
  DomainError,
  EMPTY_LORE_STATE,
  MARINER_FAR_REACH_SOURCE_COLLECTION_ID,
  MARINER_ISLE_LORE_DELEGATION,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  buildInitializedDefaultMarinerState,
  buildInitializedDefaultNecromancerState,
  canonicalJsonStringify,
  composeEffectiveSourceLore,
  grimoireSpellDefinition,
  initialCampaignState,
  lookupSourceLoreCatalog,
  previewSourceLoreCollection,
  readEffectiveSourceLore,
  readEffectiveSourceLoreForRuleset,
  resolveSourceLoreBinding,
  selectMarinerIsleLoreContext,
  sourceLoreCatalogCoverage,
  sourceLoreCatalogSemanticManifest,
  sourceLoreCollectionDefinition,
  statesDeepEqual,
  validateCampaignState,
  validateCampaignStateV5Candidate,
} from "../shared/domain";
import { makeTestCampaignStateV5 } from "./test-state";

const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_NECRO = "wiz_00000000-0000-0000-0000-0000000000aa" as WizardId;
const WIZ_SORC = "wiz_00000000-0000-0000-0000-0000000000ab" as WizardId;
const ISL_GRAVEN = "isl_00000000-0000-0000-0000-0000000000aa" as IsleId;
const ISL_OTHER = "isl_00000000-0000-0000-0000-0000000000ab" as IsleId;
const ISL_SPYR = "isl_00000000-0000-0000-0000-0000000000ac" as IsleId;
const PLC_CRYPT = "plc_00000000-0000-0000-0000-0000000000aa" as PlaceId;
const PLC_UNSPEC = "plc_00000000-0000-0000-0000-0000000000ab" as PlaceId;
const PLC_SHIP = "plc_00000000-0000-0000-0000-0000000000ac" as PlaceId;
const LCOL_1 = "lcol_00000000-0000-0000-0000-0000000000aa" as LoreCollectionId;
const LCOL_2 = "lcol_00000000-0000-0000-0000-0000000000ab" as LoreCollectionId;
const LORE_1 = "lore_00000000-0000-0000-0000-0000000000aa" as LoreEntryId;
const LORE_2 = "lore_00000000-0000-0000-0000-0000000000ab" as LoreEntryId;
const CAMPAIGN_GATE = "ngt_00000000-0000-0000-0000-0000000000aa";

function expectInvalid(run: () => unknown, pattern: RegExp): void {
  expect(run).toThrow(DomainError);
  try {
    run();
  } catch (error) {
    expect((error as DomainError).code).toBe("INVALID_CAMPAIGN_STATE");
    expect((error as DomainError).message).toMatch(pattern);
  }
}

function wizard(wizardId: WizardId, name: string, homeIsleId: IsleId | null = null, sanctumPlaceId: PlaceId | null = null) {
  return {
    wizardId,
    name,
    portrayedByPlayerId: PLR_A,
    character: {
      ...BLANK_WIZARD_CHARACTER_V5,
      elements: { air: 2, fire: 2, earth: 2, water: 2 },
    },
    homeIsleId,
    sanctumPlaceId,
    mortalityState: "not_deceased" as const,
  };
}

function worldIsle(isleId: IsleId, name: string) {
  return { isleId, name, description: null };
}

function marinerWorldIsleIds(graven = ISL_GRAVEN, spyrholm = ISL_SPYR) {
  return {
    ishana: ISL_OTHER,
    scuttleport: ISL_OTHER,
    orrery: ISL_OTHER,
    far_reach: ISL_OTHER,
    halcyon_isles: ISL_OTHER,
    sage_atoll: ISL_OTHER,
    graven_isle: graven,
    tahv: ISL_OTHER,
    izor: ISL_OTHER,
    yeraine: ISL_OTHER,
    koire: ISL_OTHER,
    thyras: ISL_OTHER,
    spyrholm,
    druntyr: ISL_OTHER,
    caravesse: ISL_OTHER,
  };
}

describe("M5.3 Body A lore structural foundation", () => {
  it("empty campaign Lore is valid", () => {
    const state = makeTestCampaignStateV5();
    expect(state.lore).toEqual(EMPTY_LORE_STATE);
    expect(state.lore).toEqual(initialCampaignState().lore);
    expect(() => validateCampaignState(state)).not.toThrow();
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
  });

  it("partially initialized campaigns remain valid while many source definitions cannot bind", () => {
    const state = makeTestCampaignStateV5({
      players: [{ playerId: PLR_A, name: "Alice" }],
      wizards: [wizard(WIZ_NECRO, "The Necromancer")],
      pactSeats: {
        ...makeTestCampaignStateV5().pactSeats,
        necromancer: { status: "present", wizardId: WIZ_NECRO, watcherPlayerId: null },
      },
    });
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
    expect(resolveSourceLoreBinding(state, "necromancer.home.graven_isle")).toEqual({
      ok: false,
      reason: "not_ready",
    });
    expect(resolveSourceLoreBinding(state, "sorcerer.home.spyrholm")).toEqual({
      ok: false,
      reason: "not_ready",
    });
    expect(resolveSourceLoreBinding(state, "mariner.delegated.graven_isle")).toEqual({
      ok: false,
      reason: "not_ready",
    });
    expect(instantiatedSourceCollection(state)).toBeUndefined();
  });

  it("exact Draft4/v1 source preview resolves through the stored campaign ruleset", () => {
    const state = makeTestCampaignStateV5();
    expect(state.ruleset).toEqual({
      id: SEVEN_PART_PACT_DRAFT4_ID,
      version: SEVEN_PART_PACT_DRAFT4_VERSION,
    });
    const lookup = lookupSourceLoreCatalog(state.ruleset);
    expect(lookup.ok).toBe(true);
    if (!lookup.ok) return;
    const preview = previewSourceLoreCollection(state.ruleset, "necromancer.home.graven_isle");
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.entries.map((entry) => entry.sourceEntryId)).toEqual(["e01", "e02", "e03", "e04", "e05"]);
    expect(preview.entries[0]?.text).toBe(
      "The Graven Isle is a cold and miserable place, covered in dark clouds and filled with countless memorials to the dead.",
    );
    const effective = readEffectiveSourceLore(state, "necromancer.home.graven_isle");
    expect(effective.ok).toBe(true);
    if (!effective.ok) return;
    expect(effective.instantiated).toBe(false);
    expect(effective.boundSubject).toBeNull();
    expect(effective.entries).toHaveLength(5);
  });

  it("unsupported baseline fails closed without CURRENT_RULESET fallback", () => {
    const unsupported: RulesetRef = { id: "not_seven_part_pact", version: 1 };
    const wrongVersion: RulesetRef = { id: SEVEN_PART_PACT_DRAFT4_ID, version: 99 };
    expect(lookupSourceLoreCatalog(unsupported)).toEqual({ ok: false, reason: "unsupported_ruleset" });
    expect(lookupSourceLoreCatalog(wrongVersion)).toEqual({ ok: false, reason: "unsupported_ruleset" });
    expect(CURRENT_RULESET).toEqual({
      id: SEVEN_PART_PACT_DRAFT4_ID,
      version: SEVEN_PART_PACT_DRAFT4_VERSION,
    });
    const preview = previewSourceLoreCollection(unsupported, "necromancer.home.graven_isle");
    expect(preview).toEqual({ ok: false, reason: "unsupported_ruleset" });
    const read = readEffectiveSourceLoreForRuleset(unsupported, EMPTY_LORE_STATE, "necromancer.home.graven_isle");
    expect(read).toEqual({ ok: false, reason: "unsupported_ruleset" });
  });

  it("source catalog IDs, membership, order, and text are regression-guarded", () => {
    const coverage = sourceLoreCatalogCoverage(DRAFT4_V1_SOURCE_LORE_CATALOG);
    expect(coverage.collectionCount).toBe(99);
    expect(coverage.fixedSourceEntryCount).toBe(384);
    expect(coverage.zeroBaselineSourceContextCount).toBe(4);
    expect(DRAFT4_V1_SOURCE_LORE_COLLECTION_IDS).toHaveLength(99);
    expect(coverage.subjectKindDistribution).toEqual({
      isle: 21,
      place: 7,
      necromancer_gate: 11,
      hierophant_temple: 5,
      warlock_clan: 5,
      element: 4,
      pact_domain: 0,
      mariner_horizon: 4,
      source_topic: 42,
    });
    const distant = ["mariner.distant.north", "mariner.distant.east", "mariner.distant.south", "mariner.distant.west"];
    for (const id of distant) {
      const definition = sourceLoreCollectionDefinition(DRAFT4_V1_SOURCE_LORE_CATALOG, id);
      expect(definition?.entries).toEqual([]);
      expect(definition?.subjectKind).toBe("mariner_horizon");
    }
    const digest = createHash("sha256")
      .update(JSON.stringify(sourceLoreCatalogSemanticManifest(DRAFT4_V1_SOURCE_LORE_CATALOG)))
      .digest("hex");
    expect(digest).toBe(DRAFT4_V1_SOURCE_LORE_CATALOG_SEMANTIC_DIGEST);
    expect(digest).toBe("b67d9dac8d7cc73928eb7408dec5f5726147cb2d4c70d2eac872a9cf50cd38a2");
  });

  it("pins the complete approved Mariner delegation mapping", () => {
    expect(MARINER_ISLE_LORE_DELEGATION).toEqual({
      necromancer: {
        ownerCollectionId: "necromancer.home.graven_isle",
        delegatedCollectionId: "mariner.delegated.graven_isle",
      },
      hierophant: {
        ownerCollectionId: "hierophant.home.ishana",
        delegatedCollectionId: "mariner.delegated.ishana",
      },
      warlock: {
        ownerCollectionId: "warlock.home.halcyon_isles",
        delegatedCollectionId: "mariner.delegated.halcyon_isles",
      },
      faustian: {
        ownerCollectionId: "faustian.home.scuttleport",
        delegatedCollectionId: "mariner.delegated.scuttleport",
      },
      sage: {
        ownerCollectionId: "sage.home.moonlit_atoll",
        delegatedCollectionId: "mariner.delegated.sage_atoll",
      },
      sorcerer: {
        ownerCollectionId: "sorcerer.home.spyrholm",
        delegatedCollectionId: "mariner.delegated.spyrholm",
      },
    });
    expect(MARINER_FAR_REACH_SOURCE_COLLECTION_ID).toBe("mariner.home.far_reach");
  });

  it("sparse override keeps source order and changes only the intended text", () => {
    const definition = sourceLoreCollectionDefinition(DRAFT4_V1_SOURCE_LORE_CATALOG, "necromancer.home.graven_isle");
    expect(definition).toBeDefined();
    if (definition === undefined) return;
    const effective = composeEffectiveSourceLore(definition, {
      sourceCollectionId: "necromancer.home.graven_isle",
      boundSubject: { kind: "isle", isleId: ISL_GRAVEN },
      overrides: [{ sourceEntryId: "e03", currentText: "Revised Graven desolation." }],
      additions: [],
    });
    expect(effective.map((entry) => (entry.origin === "source" ? entry.sourceEntryId : entry.loreEntryId))).toEqual([
      "e01",
      "e02",
      "e03",
      "e04",
      "e05",
    ]);
    expect(effective[2]).toEqual({
      origin: "source",
      sourceEntryId: "e03",
      text: "Revised Graven desolation.",
      overridden: true,
    });
    expect(effective[0]?.text).toBe(definition.entries[0]?.text);
    expect(effective[1]?.text).toBe(definition.entries[1]?.text);
  });

  it("campaign-authored additions follow the source baseline in persisted order", () => {
    const definition = sourceLoreCollectionDefinition(DRAFT4_V1_SOURCE_LORE_CATALOG, "necromancer.home.graven_isle");
    expect(definition).toBeDefined();
    if (definition === undefined) return;
    const effective = composeEffectiveSourceLore(definition, {
      sourceCollectionId: "necromancer.home.graven_isle",
      boundSubject: { kind: "isle", isleId: ISL_GRAVEN },
      overrides: [],
      additions: [
        { loreEntryId: LORE_1, text: "A new memorial was raised this year." },
        { loreEntryId: LORE_2, text: "Smugglers now avoid the eastern cove." },
      ],
    });
    expect(effective).toHaveLength(7);
    expect(effective[5]).toEqual({
      origin: "campaign_authored",
      loreEntryId: LORE_1,
      text: "A new memorial was raised this year.",
    });
    expect(effective[6]).toEqual({
      origin: "campaign_authored",
      loreEntryId: LORE_2,
      text: "Smugglers now avoid the eastern cove.",
    });
  });

  it("campaign-created Isle, unspecified Place, and campaign Gate are valid Lore subjects", () => {
    const state = makeTestCampaignStateV5({
      world: {
        denizens: [],
        isles: [worldIsle(ISL_OTHER, "The Driftwood Isle")],
        places: [{ placeId: PLC_UNSPEC, name: "A nameless ruin", description: null, placement: { kind: "unspecified" } }],
        companionRelationships: [],
        campaignPowerfulDenizenTaxonomies: [],
        treasures: [],
      },
      necromancer: buildInitializedDefaultNecromancerState({
        campaignGates: [{
          origin: "campaign",
          gateId: CAMPAIGN_GATE as never,
          name: "The Ash Gate",
          band: "near",
          status: "ordinary",
        }],
      }),
      lore: {
        sourceCollections: [],
        campaignCollections: [
          {
            collectionId: LCOL_1,
            subject: { kind: "isle", isleId: ISL_OTHER },
            entries: [{ loreEntryId: LORE_1, text: "The Driftwood Isle appeared after a storm." }],
          },
          {
            collectionId: LCOL_2,
            subject: { kind: "place", placeId: PLC_UNSPEC },
            entries: [{ loreEntryId: LORE_2, text: "No chart places this ruin." }],
          },
          {
            collectionId: "lcol_00000000-0000-0000-0000-0000000000ac" as LoreCollectionId,
            subject: { kind: "necromancer_gate", gateId: CAMPAIGN_GATE as never },
            entries: [],
          },
        ],
      },
    });
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
  });

  it("source binding resolves a stable ID, reports not_ready when missing, and invents no fallback", () => {
    const unbound = makeTestCampaignStateV5();
    expect(resolveSourceLoreBinding(unbound, "necromancer.home.graven_isle").ok).toBe(false);

    const bound = makeTestCampaignStateV5({
      players: [{ playerId: PLR_A, name: "Alice" }],
      wizards: [wizard(WIZ_NECRO, "The Necromancer", ISL_GRAVEN, PLC_CRYPT)],
      pactSeats: {
        ...makeTestCampaignStateV5().pactSeats,
        necromancer: { status: "present", wizardId: WIZ_NECRO, watcherPlayerId: null },
      },
      world: {
        denizens: [],
        isles: [worldIsle(ISL_GRAVEN, "Graven Isle")],
        places: [{ placeId: PLC_CRYPT, name: "Crypt", description: null, placement: { kind: "on_isle", isleId: ISL_GRAVEN } }],
        companionRelationships: [],
        campaignPowerfulDenizenTaxonomies: [],
        treasures: [],
      },
    });
    expect(resolveSourceLoreBinding(bound, "necromancer.home.graven_isle")).toEqual({
      ok: true,
      subject: { kind: "isle", isleId: ISL_GRAVEN },
    });
    expect(resolveSourceLoreBinding(bound, "necromancer.sanctum.crypt")).toEqual({
      ok: true,
      subject: { kind: "place", placeId: PLC_CRYPT },
    });
    expect(resolveSourceLoreBinding(bound, "mariner.delegated.graven_isle")).toEqual({
      ok: false,
      reason: "not_ready",
    });
    expect(bound.lore.sourceCollections).toEqual([]);
  });

  it("persisted bindings do not retarget after name, status, or home changes", () => {
    const instantiated = makeTestCampaignStateV5({
      players: [{ playerId: PLR_A, name: "Alice" }],
      wizards: [wizard(WIZ_NECRO, "Renamed Necromancer", ISL_OTHER, PLC_CRYPT)],
      pactSeats: {
        ...makeTestCampaignStateV5().pactSeats,
        necromancer: { status: "silent", wizardId: WIZ_NECRO, watcherPlayerId: null },
      },
      world: {
        denizens: [],
        isles: [worldIsle(ISL_GRAVEN, "Graven Isle"), worldIsle(ISL_OTHER, "Some Other Isle")],
        places: [{ placeId: PLC_CRYPT, name: "Crypt", description: null, placement: { kind: "on_isle", isleId: ISL_GRAVEN } }],
        companionRelationships: [],
        campaignPowerfulDenizenTaxonomies: [],
        treasures: [],
      },
      lore: {
        sourceCollections: [{
          sourceCollectionId: "necromancer.home.graven_isle",
          boundSubject: { kind: "isle", isleId: ISL_GRAVEN },
          overrides: [],
          additions: [],
        }],
        campaignCollections: [],
      },
    });
    expect(() => validateCampaignStateV5Candidate(instantiated)).not.toThrow();
    expect(instantiated.lore.sourceCollections[0]?.boundSubject).toEqual({ kind: "isle", isleId: ISL_GRAVEN });
    expect(resolveSourceLoreBinding(instantiated, "necromancer.home.graven_isle")).toEqual({
      ok: true,
      subject: { kind: "isle", isleId: ISL_OTHER },
    });
    const read = readEffectiveSourceLore(instantiated, "necromancer.home.graven_isle");
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.boundSubject).toEqual({ kind: "isle", isleId: ISL_GRAVEN });
  });

  it("Graven Mariner selector is present/silent owner and absent Mariner, without mutating Lore", () => {
    expect(selectMarinerIsleLoreContext("necromancer", "absent")).toEqual({
      kind: "selected",
      role: "mariner_delegated",
      sourceCollectionId: MARINER_ISLE_LORE_DELEGATION.necromancer.delegatedCollectionId,
    });
    expect(selectMarinerIsleLoreContext("necromancer", "present")).toEqual({
      kind: "selected",
      role: "owner",
      sourceCollectionId: MARINER_ISLE_LORE_DELEGATION.necromancer.ownerCollectionId,
    });
    expect(selectMarinerIsleLoreContext("necromancer", "silent")).toEqual({
      kind: "selected",
      role: "owner",
      sourceCollectionId: MARINER_ISLE_LORE_DELEGATION.necromancer.ownerCollectionId,
    });
    expect(selectMarinerIsleLoreContext("necromancer", null)).toEqual({ kind: "no_status_decision" });
    expect(selectMarinerIsleLoreContext("mariner", "absent")).toEqual({
      kind: "owner_only",
      sourceCollectionId: "mariner.home.far_reach",
    });

    const ownerLore = {
      sourceCollectionId: "necromancer.home.graven_isle" as const,
      boundSubject: { kind: "isle" as const, isleId: ISL_GRAVEN },
      overrides: [{ sourceEntryId: "e01", currentText: "Owner Graven text." }],
      additions: [],
    };
    const marinerLore = {
      sourceCollectionId: "mariner.delegated.graven_isle" as const,
      boundSubject: { kind: "isle" as const, isleId: ISL_GRAVEN },
      overrides: [{ sourceEntryId: "e01", currentText: "Mariner Graven text." }],
      additions: [],
    };
    const lore = { sourceCollections: [ownerLore, marinerLore], campaignCollections: [] };

    const statuses = ["absent", "present", "silent", "absent"] as const;
    const expectedRoles = ["mariner_delegated", "owner", "owner", "mariner_delegated"] as const;
    for (let i = 0; i < statuses.length; i++) {
      const state = makeTestCampaignStateV5({
        players: [{ playerId: PLR_A, name: "Alice" }],
        wizards: [wizard(WIZ_NECRO, "The Necromancer", ISL_GRAVEN)],
        pactSeats: {
          ...makeTestCampaignStateV5().pactSeats,
          necromancer: { status: statuses[i] ?? null, wizardId: WIZ_NECRO, watcherPlayerId: null },
        },
        world: {
          denizens: [],
          isles: [worldIsle(ISL_GRAVEN, "Graven Isle"), worldIsle(ISL_OTHER, "Other")],
          places: [],
          companionRelationships: [],
          campaignPowerfulDenizenTaxonomies: [],
          treasures: [],
        },
        mariner: buildInitializedDefaultMarinerState({
          shipPlaceId: PLC_SHIP,
          worldIsleIds: marinerWorldIsleIds(),
        }),
        lore,
      });
      const selection = selectMarinerIsleLoreContext("necromancer", state.pactSeats.necromancer.status);
      expect(selection.kind).toBe("selected");
      if (selection.kind !== "selected") continue;
      expect(selection.role).toBe(expectedRoles[i]);
      expect(state.lore).toEqual(lore);
      const ownerRead = readEffectiveSourceLore(state, "necromancer.home.graven_isle");
      const marinerRead = readEffectiveSourceLore(state, "mariner.delegated.graven_isle");
      expect(ownerRead.ok && ownerRead.entries[0]?.text).toBe("Owner Graven text.");
      expect(marinerRead.ok && marinerRead.entries[0]?.text).toBe("Mariner Graven text.");
    }
  });

  it("representative malformed Lore references fail closed", () => {
    const baseWorld = {
      denizens: [] as const,
      isles: [worldIsle(ISL_GRAVEN, "Graven Isle")],
      places: [] as const,
      companionRelationships: [] as const,
      campaignPowerfulDenizenTaxonomies: [] as const,
      treasures: [] as const,
    };

    expectInvalid(
      () => validateCampaignStateV5Candidate(makeTestCampaignStateV5({
        world: baseWorld,
        lore: {
          sourceCollections: [
            {
              sourceCollectionId: "necromancer.home.graven_isle",
              boundSubject: { kind: "isle", isleId: ISL_GRAVEN },
              overrides: [],
              additions: [],
            },
            {
              sourceCollectionId: "necromancer.home.graven_isle",
              boundSubject: { kind: "isle", isleId: ISL_GRAVEN },
              overrides: [],
              additions: [],
            },
          ],
          campaignCollections: [],
        },
      })),
      /Duplicate instantiated SourceLoreCollectionId/,
    );

    expectInvalid(
      () => validateCampaignStateV5Candidate(makeTestCampaignStateV5({
        world: baseWorld,
        lore: {
          sourceCollections: [{
            sourceCollectionId: "not.a.real.collection" as never,
            boundSubject: { kind: "isle", isleId: ISL_GRAVEN },
            overrides: [],
            additions: [],
          }],
          campaignCollections: [],
        },
      })),
      /unknown for the campaign ruleset/,
    );

    expectInvalid(
      () => validateCampaignStateV5Candidate(makeTestCampaignStateV5({
        world: baseWorld,
        lore: {
          sourceCollections: [{
            sourceCollectionId: "necromancer.home.graven_isle",
            boundSubject: { kind: "element", elementId: "air" },
            overrides: [],
            additions: [],
          }],
          campaignCollections: [],
        },
      })),
      /incompatible with source collection/,
    );

    expectInvalid(
      () => validateCampaignStateV5Candidate(makeTestCampaignStateV5({
        lore: {
          sourceCollections: [{
            sourceCollectionId: "necromancer.home.graven_isle",
            boundSubject: { kind: "isle", isleId: ISL_GRAVEN },
            overrides: [],
            additions: [],
          }],
          campaignCollections: [],
        },
      })),
      /nonexistent isle/,
    );

    expectInvalid(
      () => validateCampaignStateV5Candidate(makeTestCampaignStateV5({
        world: baseWorld,
        lore: {
          sourceCollections: [{
            sourceCollectionId: "necromancer.home.graven_isle",
            boundSubject: { kind: "isle", isleId: ISL_GRAVEN },
            overrides: [
              { sourceEntryId: "e01", currentText: "One" },
              { sourceEntryId: "e01", currentText: "Two" },
            ],
            additions: [],
          }],
          campaignCollections: [],
        },
      })),
      /Duplicate source Lore override/,
    );

    expectInvalid(
      () => validateCampaignStateV5Candidate(makeTestCampaignStateV5({
        world: baseWorld,
        lore: {
          sourceCollections: [{
            sourceCollectionId: "necromancer.home.graven_isle",
            boundSubject: { kind: "isle", isleId: ISL_GRAVEN },
            overrides: [{ sourceEntryId: "e99", currentText: "Nope" }],
            additions: [],
          }],
          campaignCollections: [],
        },
      })),
      /nonexistent source entry/,
    );

    expectInvalid(
      () => validateCampaignStateV5Candidate(makeTestCampaignStateV5({
        world: baseWorld,
        lore: {
          sourceCollections: [{
            sourceCollectionId: "necromancer.home.graven_isle",
            boundSubject: { kind: "isle", isleId: ISL_GRAVEN },
            overrides: [{ sourceEntryId: "e01", currentText: "   " }],
            additions: [],
          }],
          campaignCollections: [],
        },
      })),
      /nonblank string/,
    );

    expectInvalid(
      () => validateCampaignStateV5Candidate(makeTestCampaignStateV5({
        world: baseWorld,
        lore: {
          sourceCollections: [],
          campaignCollections: [
            { collectionId: LCOL_1, subject: { kind: "isle", isleId: ISL_GRAVEN }, entries: [] },
            { collectionId: LCOL_1, subject: { kind: "element", elementId: "air" }, entries: [] },
          ],
        },
      })),
      /Duplicate LoreCollectionId/,
    );

    expectInvalid(
      () => validateCampaignStateV5Candidate(makeTestCampaignStateV5({
        world: baseWorld,
        lore: {
          sourceCollections: [],
          campaignCollections: [
            { collectionId: LCOL_1, subject: { kind: "isle", isleId: ISL_GRAVEN }, entries: [] },
            { collectionId: LCOL_2, subject: { kind: "isle", isleId: ISL_GRAVEN }, entries: [] },
          ],
        },
      })),
      /Duplicate canonical campaign Lore collection/,
    );

    expectInvalid(
      () => validateCampaignStateV5Candidate(makeTestCampaignStateV5({
        world: baseWorld,
        lore: {
          sourceCollections: [{
            sourceCollectionId: "necromancer.home.graven_isle",
            boundSubject: { kind: "isle", isleId: ISL_GRAVEN },
            overrides: [],
            additions: [{ loreEntryId: LORE_1, text: "Added" }],
          }],
          campaignCollections: [{
            collectionId: LCOL_1,
            subject: { kind: "element", elementId: "air" },
            entries: [{ loreEntryId: LORE_1, text: "Also added" }],
          }],
        },
      })),
      /Duplicate loreEntryId/,
    );

    expectInvalid(
      () => validateCampaignStateV5Candidate(makeTestCampaignStateV5({
        lore: {
          sourceCollections: [],
          campaignCollections: [{
            collectionId: LCOL_1,
            subject: { kind: "element", elementId: "air" },
            entries: [{ loreEntryId: LORE_1, text: "" }],
          }],
        },
      })),
      /nonblank string/,
    );

    expectInvalid(
      () => validateCampaignStateV5Candidate(makeTestCampaignStateV5({
        lore: {
          sourceCollections: [],
          campaignCollections: [{
            collectionId: LCOL_1,
            subject: { kind: "source_topic", topicId: "not.a.topic" as never },
            entries: [],
          }],
        },
      })),
      /topicId is invalid/,
    );
  });

  it("composing Lore prose does not mutate unrelated structural mechanics", () => {
    const state = makeTestCampaignStateV5({
      players: [{ playerId: PLR_A, name: "Alice" }],
      wizards: [wizard(WIZ_SORC, "The Sorcerer", ISL_SPYR)],
      pactSeats: {
        ...makeTestCampaignStateV5().pactSeats,
        sorcerer: { status: "present", wizardId: WIZ_SORC, watcherPlayerId: null },
      },
      world: {
        denizens: [],
        isles: [worldIsle(ISL_SPYR, "Spyrholm")],
        places: [],
        companionRelationships: [],
        campaignPowerfulDenizenTaxonomies: [],
        treasures: [],
      },
    });
    const before = {
      elements: state.wizards[0]?.character.elements,
      orrery: state.lifecycle.orrery,
      temples: state.hierophant.temples,
      clans: state.warlock.clans,
      gates: state.necromancer.gates,
      knowledge: state.sorcerer.knowledge,
      duplicate: grimoireSpellDefinition("duplication"),
    };
    const definition = sourceLoreCollectionDefinition(DRAFT4_V1_SOURCE_LORE_CATALOG, "sorcerer.element.air");
    expect(definition).toBeDefined();
    if (definition === undefined) return;
    composeEffectiveSourceLore(definition, {
      sourceCollectionId: "sorcerer.element.air",
      boundSubject: { kind: "element", elementId: "air" },
      overrides: [{ sourceEntryId: "e01", currentText: "Air is now described differently." }],
      additions: [{ loreEntryId: LORE_1, text: "A campaign note about Air." }],
    });
    const withLore: CampaignStateV5 = {
      ...state,
      lore: {
        sourceCollections: [{
          sourceCollectionId: "sorcerer.element.air",
          boundSubject: { kind: "element", elementId: "air" },
          overrides: [{ sourceEntryId: "e01", currentText: "Air is now described differently." }],
          additions: [{ loreEntryId: LORE_1, text: "A campaign note about Air." }],
        }],
        campaignCollections: [],
      },
    };
    expect(() => validateCampaignStateV5Candidate(withLore)).not.toThrow();
    expect(withLore.wizards[0]?.character.elements).toEqual(before.elements);
    expect(withLore.lifecycle.orrery).toEqual(before.orrery);
    expect(withLore.hierophant.temples).toEqual(before.temples);
    expect(withLore.warlock.clans).toEqual(before.clans);
    expect(withLore.necromancer.gates).toEqual(before.gates);
    expect(withLore.sorcerer.knowledge).toEqual(before.knowledge);
    expect(grimoireSpellDefinition("duplication")).toEqual(before.duplicate);
  });

  it("nonempty Lore participates in ordinary full CampaignState serialization", () => {
    const state = makeTestCampaignStateV5({
      world: {
        denizens: [],
        isles: [worldIsle(ISL_GRAVEN, "Graven Isle")],
        places: [],
        companionRelationships: [],
        campaignPowerfulDenizenTaxonomies: [],
        treasures: [],
      },
      lore: {
        sourceCollections: [{
          sourceCollectionId: "necromancer.home.graven_isle",
          boundSubject: { kind: "isle", isleId: ISL_GRAVEN },
          overrides: [{ sourceEntryId: "e02", currentText: "Catacombs now flood each spring." }],
          additions: [{ loreEntryId: LORE_1, text: "A new ossuary was opened." }],
        }],
        campaignCollections: [],
      },
    });
    expect(() => validateCampaignStateV5Candidate(state)).not.toThrow();
    const json = canonicalJsonStringify(state);
    const parsed = JSON.parse(json) as CampaignStateV5;
    expect(statesDeepEqual(state, parsed)).toBe(true);
    expect(json).toContain("Catacombs now flood each spring.");
    expect(json).toContain("necromancer.home.graven_isle");
  });
});

function instantiatedSourceCollection(state: CampaignStateV5) {
  return state.lore.sourceCollections[0];
}
