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
  RulesetRef,
  WizardId,
} from "../shared/domain";
import {
  BLANK_WIZARD_CHARACTER_V5,
  CURRENT_RULESET,
  DRAFT4_V1_SOURCE_LORE_COLLECTION_IDS,
  LORE_CONTEXT_LABEL_CAMPAIGN,
  LORE_PROVENANCE_ADDED_IN_PLAY,
  LORE_PROVENANCE_CHANGED_IN_PLAY,
  LORE_PROVENANCE_PRINTED,
  SEVEN_PART_PACT_DRAFT4_ID,
  applyAddLoreEntry,
  applyReviseLoreEntry,
  buildInitializedDefaultNecromancerState,
  loreAddTargetFromDescriptor,
  readEffectiveSourceLore,
  readLoreCompendiumReference,
  readLoreCompendiumReferenceForRuleset,
  selectMarinerIsleLoreContext,
  selectedMarinerIsleLoreAvailability,
} from "../shared/domain";
import { makeTestCampaignStateV5 } from "./test-state";
import * as m3Queries from "../convex/m3Queries";

const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_NECRO = "wiz_00000000-0000-0000-0000-0000000000aa" as WizardId;
const ISL_GRAVEN = "isl_00000000-0000-0000-0000-0000000000aa" as IsleId;
const ISL_DRIFT = "isl_00000000-0000-0000-0000-0000000000ab" as IsleId;
const PLC_CRYPT = "plc_00000000-0000-0000-0000-0000000000aa" as PlaceId;
const LCOL_1 = "lcol_00000000-0000-0000-0000-0000000000aa" as LoreCollectionId;
const LORE_1 = "lore_00000000-0000-0000-0000-0000000000aa" as LoreEntryId;
const LORE_2 = "lore_00000000-0000-0000-0000-0000000000ab" as LoreEntryId;
const GRAVEN_E01 =
  "The Graven Isle is a cold and miserable place, covered in dark clouds and filled with countless memorials to the dead.";
const GRAVEN_SUBJECT = { kind: "isle" as const, isleId: ISL_GRAVEN };
const DRIFT_SUBJECT = { kind: "isle" as const, isleId: ISL_DRIFT };
const ID_LIKE = /(?:^|\s)(?:lcol_|lore_|e\d{2}|[a-z]+\.[a-z]+\.[a-z_]+)(?:\s|$)/u;

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

function boundState(overrides?: Partial<CampaignStateV5>): CampaignStateV5 {
  return makeTestCampaignStateV5({
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [wizard()],
    pactSeats: {
      ...makeTestCampaignStateV5().pactSeats,
      necromancer: { status: "present", wizardId: WIZ_NECRO, watcherPlayerId: null },
    },
    world: {
      denizens: [],
      isles: [
        { isleId: ISL_GRAVEN, name: "Graven Isle", description: null },
        { isleId: ISL_DRIFT, name: "The Driftwood Isle", description: null },
      ],
      places: [
        { placeId: PLC_CRYPT, name: "Crypt", description: null, placement: { kind: "on_isle", isleId: ISL_GRAVEN } },
      ],
      companionRelationships: [],
      campaignPowerfulDenizenTaxonomies: [],
      treasures: [],
    },
    necromancer: buildInitializedDefaultNecromancerState({
      campaignGates: [{
        origin: "campaign",
        gateId: "ngt_00000000-0000-0000-0000-0000000000aa" as never,
        name: "The Ash Gate",
        band: "near",
        status: "ordinary",
      }],
    }),
    ...overrides,
  });
}

function requireOk(result: ReturnType<typeof readLoreCompendiumReference>) {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected Lore presentation to resolve");
  }
  return result;
}

function subjectWithSource(
  result: ReturnType<typeof requireOk>,
  sourceCollectionId: string,
) {
  const subject = result.subjects.find((entry) =>
    entry.contexts.some((context) => context.kind === "source" && context.sourceCollectionId === sourceCollectionId),
  );
  expect(subject).toBeDefined();
  return subject!;
}

function sourceContext(subject: ReturnType<typeof subjectWithSource>, sourceCollectionId: string) {
  const context = subject.contexts.find(
    (entry) => entry.kind === "source" && entry.sourceCollectionId === sourceCollectionId,
  );
  expect(context).toBeDefined();
  expect(context?.kind).toBe("source");
  return context as Extract<typeof subject.contexts[number], { kind: "source" }>;
}

function assertNotIdLike(label: string): void {
  expect(label.trim().length).toBeGreaterThan(0);
  expect(label).not.toMatch(ID_LIKE);
  expect(label.startsWith("lcol_")).toBe(false);
  expect(label.startsWith("lore_")).toBe(false);
}

describe("M5.4A-L Lore presentation read model", () => {
  it("reads an uninstantiated source context from the exact baseline without a write", () => {
    const state = makeTestCampaignStateV5();
    expect(state.lore.sourceCollections).toEqual([]);
    const presentation = requireOk(readLoreCompendiumReference(state));
    const subject = subjectWithSource(presentation, "necromancer.home.graven_isle");
    const context = sourceContext(subject, "necromancer.home.graven_isle");
    expect(context.readable).toBe(true);
    const effective = readEffectiveSourceLore(state, "necromancer.home.graven_isle");
    expect(effective.ok).toBe(true);
    if (!effective.ok) return;
    expect(context.entries.map((entry) => entry.text)).toEqual(effective.entries.map((entry) => entry.text));
    expect(context.entries[0]).toMatchObject({
      provenance: "printed",
      provenanceLabel: LORE_PROVENANCE_PRINTED,
      text: GRAVEN_E01,
    });
    expect(state.lore.sourceCollections).toEqual([]);
  });

  it("presents a source override as Changed in play and keeps printed wording", () => {
    const state = boundState({
      lore: {
        sourceCollections: [{
          sourceCollectionId: "necromancer.home.graven_isle",
          boundSubject: GRAVEN_SUBJECT,
          overrides: [{ sourceEntryId: "e01", currentText: "The Graven Isle is now quieter." }],
          additions: [],
        }],
        campaignCollections: [],
      },
    });
    const context = sourceContext(
      subjectWithSource(requireOk(readLoreCompendiumReference(state)), "necromancer.home.graven_isle"),
      "necromancer.home.graven_isle",
    );
    expect(context.entries[0]).toEqual({
      provenance: "changed_in_play",
      provenanceLabel: LORE_PROVENANCE_CHANGED_IN_PLAY,
      sourceEntryId: "e01",
      text: "The Graven Isle is now quieter.",
      printedText: GRAVEN_E01,
      revise: {
        operation: "revise_lore_entry",
        target: {
          kind: "source_entry",
          sourceCollectionId: "necromancer.home.graven_isle",
          sourceEntryId: "e01",
          expectedSubject: GRAVEN_SUBJECT,
        },
      },
    });
  });

  it("presents a source-context campaign addition as Added in play", () => {
    const state = boundState({
      lore: {
        sourceCollections: [{
          sourceCollectionId: "necromancer.home.graven_isle",
          boundSubject: GRAVEN_SUBJECT,
          overrides: [],
          additions: [{ loreEntryId: LORE_1, text: "A new memorial was raised this year." }],
        }],
        campaignCollections: [],
      },
    });
    const context = sourceContext(
      subjectWithSource(requireOk(readLoreCompendiumReference(state)), "necromancer.home.graven_isle"),
      "necromancer.home.graven_isle",
    );
    expect(context.entries[context.entries.length - 1]).toEqual({
      provenance: "added_in_play",
      provenanceLabel: LORE_PROVENANCE_ADDED_IN_PLAY,
      loreEntryId: LORE_1,
      text: "A new memorial was raised this year.",
      revise: {
        operation: "revise_lore_entry",
        target: {
          kind: "source_addition",
          sourceCollectionId: "necromancer.home.graven_isle",
          loreEntryId: LORE_1,
          expectedSubject: GRAVEN_SUBJECT,
        },
      },
    });
  });

  it("composes an existing campaign Lore collection on its subject", () => {
    const state = boundState({
      lore: {
        sourceCollections: [],
        campaignCollections: [{
          collectionId: LCOL_1,
          subject: DRIFT_SUBJECT,
          entries: [{ loreEntryId: LORE_1, text: "The Driftwood Isle appeared after a storm." }],
        }],
      },
    });
    const presentation = requireOk(readLoreCompendiumReference(state));
    const subject = presentation.subjects.find((entry) =>
      entry.subject?.kind === "isle" && entry.subject.isleId === ISL_DRIFT,
    );
    expect(subject).toBeDefined();
    expect(subject!.subjectLabel).toBe("The Driftwood Isle");
    expect(subject!.hasEffectiveLore).toBe(true);
    expect(subject!.compendiumPresence).toBe("has_lore");
    expect(subject!.contexts).toHaveLength(1);
    expect(subject!.contexts[0]).toMatchObject({
      kind: "campaign",
      collectionId: LCOL_1,
      contextLabel: LORE_CONTEXT_LABEL_CAMPAIGN,
      ordinaryAddPath: true,
    });
    expect(subject!.contexts[0]?.entries[0]).toMatchObject({
      provenance: "added_in_play",
      text: "The Driftwood Isle appeared after a storm.",
    });
  });

  it("represents a legitimate campaign-created subject with no Lore as empty-eligible", () => {
    const presentation = requireOk(readLoreCompendiumReference(boundState()));
    const subject = presentation.subjects.find((entry) =>
      entry.subject?.kind === "isle" && entry.subject.isleId === ISL_DRIFT,
    );
    expect(subject).toBeDefined();
    expect(subject!.hasEffectiveLore).toBe(false);
    expect(subject!.eligibleToReceiveLore).toBe(true);
    expect(subject!.compendiumPresence).toBe("empty_eligible");
    expect(subject!.contexts).toEqual([]);
    expect(subject!.ordinaryFirstAdd).toEqual({
      operation: "add_lore_entry",
      targetForm: "new_campaign",
      subject: DRIFT_SUBJECT,
    });
    expect(subject!.advancedParallelCampaignLore).toBeNull();
  });

  it("keeps one subject with multiple source contexts as distinct contexts", () => {
    const empty = requireOk(readLoreCompendiumReference(makeTestCampaignStateV5()));
    const unbound = subjectWithSource(empty, "necromancer.home.graven_isle");
    expect(unbound.contexts.filter((context) => context.kind === "source").map((context) => {
      return context.kind === "source" ? context.sourceCollectionId : null;
    })).toEqual([
      "necromancer.home.graven_isle",
      "mariner.delegated.graven_isle",
    ]);
    expect(unbound.contexts).toHaveLength(2);
    expect(unbound.contexts[0]?.contextLabel).toBe("Necromancer");
    expect(unbound.contexts[1]?.contextLabel).toBe("Mariner");
    expect(unbound.contexts[0]?.headingLabel).toBe("Graven Isle — Necromancer");
    expect(unbound.contexts[1]?.headingLabel).toBe("Graven Isle — Mariner");

    const bound = requireOk(readLoreCompendiumReference(boundState({
      lore: {
        sourceCollections: [
          {
            sourceCollectionId: "necromancer.home.graven_isle",
            boundSubject: GRAVEN_SUBJECT,
            overrides: [],
            additions: [],
          },
          {
            sourceCollectionId: "mariner.delegated.graven_isle",
            boundSubject: GRAVEN_SUBJECT,
            overrides: [],
            additions: [],
          },
        ],
        campaignCollections: [],
      },
    })));
    const merged = subjectWithSource(bound, "necromancer.home.graven_isle");
    expect(merged.subject).toEqual(GRAVEN_SUBJECT);
    expect(sourceContext(merged, "mariner.delegated.graven_isle").entries.length).toBeGreaterThan(0);
    expect(merged.contexts.map((context) => context.kind)).toEqual(["source", "source"]);
  });

  it("keeps a not-ready source context readable without exposing an invalid writable target", () => {
    const context = sourceContext(
      subjectWithSource(requireOk(readLoreCompendiumReference(makeTestCampaignStateV5())), "necromancer.home.graven_isle"),
      "necromancer.home.graven_isle",
    );
    expect(context.readable).toBe(true);
    expect(context.entries[0]?.text).toBe(GRAVEN_E01);
    expect(context.write).toEqual({
      writable: false,
      reasonCode: "not_ready",
      reason: expect.stringMatching(/printed text/i),
    });
    expect(context.entries.every((entry) => entry.revise === null)).toBe(true);
  });

  it("gives nonempty human labels for current supported source contexts and does not use raw IDs", () => {
    const presentation = requireOk(readLoreCompendiumReference(makeTestCampaignStateV5()));
    const sourceContexts = presentation.subjects.flatMap((subject) =>
      subject.contexts.flatMap((context) => context.kind === "source" ? [{ subject, context }] : []),
    );
    expect(sourceContexts.map(({ context }) => context.sourceCollectionId).sort()).toEqual(
      [...DRAFT4_V1_SOURCE_LORE_COLLECTION_IDS].sort(),
    );
    for (const { subject, context } of sourceContexts) {
      assertNotIdLike(subject.subjectLabel);
      assertNotIdLike(context.contextLabel);
      assertNotIdLike(context.headingLabel);
      expect(subject.subjectLabel).not.toBe(context.sourceCollectionId);
      expect(context.contextLabel).not.toBe(context.sourceCollectionId);
      expect(subject.shelf.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("never silently resolves an unsupported ruleset to another catalog", () => {
    const state = makeTestCampaignStateV5();
    const unsupported: RulesetRef = { id: "not_seven_part_pact", version: 1 };
    const wrongVersion: RulesetRef = { id: SEVEN_PART_PACT_DRAFT4_ID, version: 99 };
    expect(readLoreCompendiumReferenceForRuleset(unsupported, state)).toEqual({
      ok: false,
      reason: "unsupported_ruleset",
    });
    expect(readLoreCompendiumReferenceForRuleset(wrongVersion, state)).toEqual({
      ok: false,
      reason: "unsupported_ruleset",
    });
    expect(CURRENT_RULESET).toEqual({ id: SEVEN_PART_PACT_DRAFT4_ID, version: 1 });
    expect(readLoreCompendiumReference(state).ok).toBe(true);
  });

  it("preserves Mariner Present / Silent / Absent / null selection with no fallback", () => {
    const statuses = [null, "present", "silent", "absent"] as const;
    for (const status of statuses) {
      const state = boundState({
        pactSeats: {
          ...makeTestCampaignStateV5().pactSeats,
          necromancer: { status, wizardId: WIZ_NECRO, watcherPlayerId: null },
        },
      });
      const expected = selectMarinerIsleLoreContext("necromancer", status);
      const availability = selectedMarinerIsleLoreAvailability(state, "necromancer");
      const presentation = requireOk(readLoreCompendiumReference(state));
      const seat = presentation.marinerIsleSelections.find((entry) => entry.ownerSeatId === "necromancer");
      expect(seat?.selection).toEqual(expected);
      expect(seat?.binding).toEqual(availability.binding);
      const ownerSubject = subjectWithSource(presentation, "necromancer.home.graven_isle");
      const delegatedSubject = subjectWithSource(presentation, "mariner.delegated.graven_isle");
      const owner = sourceContext(ownerSubject, "necromancer.home.graven_isle");
      const delegated = sourceContext(delegatedSubject, "mariner.delegated.graven_isle");
      expect(owner.mariner?.selection).toEqual(expected);
      expect(delegated.mariner?.selection).toEqual(expected);
      if (status === null) {
        expect(expected).toEqual({ kind: "no_status_decision" });
        expect(owner.mariner?.isPlaySelected).toBe(false);
        expect(delegated.mariner?.isPlaySelected).toBe(false);
      } else if (status === "absent") {
        expect(owner.mariner?.isPlaySelected).toBe(false);
        expect(delegated.mariner?.isPlaySelected).toBe(true);
      } else {
        expect(owner.mariner?.isPlaySelected).toBe(true);
        expect(delegated.mariner?.isPlaySelected).toBe(false);
      }
      expect(owner.write.writable).toBe(true);
      if (owner.write.writable) {
        expect(owner.write.add).toMatchObject({
          operation: "add_lore_entry",
          target: {
            kind: "source",
            sourceCollectionId: "necromancer.home.graven_isle",
            expectedSubject: GRAVEN_SUBJECT,
          },
        });
      }
    }
  });

  it("keeps existing parallel Campaign Lore secondary when a source-backed context exists", () => {
    const state = boundState({
      lore: {
        sourceCollections: [{
          sourceCollectionId: "necromancer.home.graven_isle",
          boundSubject: GRAVEN_SUBJECT,
          overrides: [],
          additions: [],
        }],
        campaignCollections: [{
          collectionId: LCOL_1,
          subject: GRAVEN_SUBJECT,
          entries: [{ loreEntryId: LORE_1, text: "A local rumor." }],
        }],
      },
    });
    const subject = subjectWithSource(requireOk(readLoreCompendiumReference(state)), "necromancer.home.graven_isle");
    expect(subject.ordinaryFirstAdd).toBeNull();
    expect(subject.advancedParallelCampaignLore).toEqual({
      existing: true,
      add: {
        operation: "add_lore_entry",
        target: { kind: "campaign", collectionId: LCOL_1, subject: GRAVEN_SUBJECT },
      },
    });
    const campaign = subject.contexts.find((context) => context.kind === "campaign");
    expect(campaign?.ordinaryAddPath).toBe(false);
    expect(campaign?.contextLabel).toBe(LORE_CONTEXT_LABEL_CAMPAIGN);
    const source = sourceContext(subject, "necromancer.home.graven_isle");
    expect(source.ordinaryAddPath).toBe(true);
    expect(source.write.writable).toBe(true);
  });

  it("maps operation descriptors onto existing add/revise target forms", () => {
    const ready = boundState();
    const presentation = requireOk(readLoreCompendiumReference(ready));
    const graven = sourceContext(
      subjectWithSource(presentation, "necromancer.home.graven_isle"),
      "necromancer.home.graven_isle",
    );
    expect(graven.write.writable).toBe(true);
    if (!graven.write.writable) return;
    const added = applyAddLoreEntry(ready, {
      target: loreAddTargetFromDescriptor(graven.write.add, LCOL_1),
      loreEntryId: LORE_1,
      text: "A new memorial was raised this year.",
    });
    expect(added.nextState.lore.sourceCollections[0]?.additions).toEqual([
      { loreEntryId: LORE_1, text: "A new memorial was raised this year." },
    ]);

    const printed = graven.entries[0];
    expect(printed?.revise?.target).toMatchObject({
      kind: "source_entry",
      sourceCollectionId: "necromancer.home.graven_isle",
      sourceEntryId: "e01",
      expectedSubject: GRAVEN_SUBJECT,
    });
    const revised = applyReviseLoreEntry(ready, {
      target: printed!.revise!.target,
      expectedText: GRAVEN_E01,
      text: "The Graven Isle is now quieter.",
    });
    expect(revised.nextState.lore.sourceCollections[0]?.overrides).toEqual([
      { sourceEntryId: "e01", currentText: "The Graven Isle is now quieter." },
    ]);

    const emptyEligible = presentation.subjects.find((entry) =>
      entry.subject?.kind === "isle" && entry.subject.isleId === ISL_DRIFT,
    );
    const created = applyAddLoreEntry(ready, {
      target: loreAddTargetFromDescriptor(emptyEligible!.ordinaryFirstAdd!, LCOL_1),
      loreEntryId: LORE_2,
      text: "The Driftwood Isle appeared after a storm.",
    });
    expect(created.nextState.lore.campaignCollections).toEqual([{
      collectionId: LCOL_1,
      subject: DRIFT_SUBJECT,
      entries: [{ loreEntryId: LORE_2, text: "The Driftwood Isle appeared after a storm." }],
    }]);
  });
});

describe("getLoreCompendiumReference", () => {
  it("supplements getLoreReference with the derived presentation helper", () => {
    expect(typeof (m3Queries as { getLoreReference?: unknown }).getLoreReference).toBe("function");
    expect(typeof (m3Queries as { getLoreCompendiumReference?: unknown }).getLoreCompendiumReference).toBe("function");
    const source = readFileSync(join(__dirname, "../convex/m3Queries.ts"), "utf8");
    const loreReference = source.slice(source.indexOf("export const getLoreReference"));
    const loreCompendium = source.slice(source.indexOf("export const getLoreCompendiumReference"));
    expect(loreReference).toMatch(/lore: current\.lore/);
    expect(loreCompendium).toMatch(/validateCampaignState\(doc\.state\)/);
    expect(loreCompendium).toMatch(/readLoreCompendiumReference\(current\)/);
    expect(loreCompendium).toMatch(/presentation:/);
    expect(loreCompendium.indexOf("export const get")).toBeGreaterThan(-1);
  });
});
