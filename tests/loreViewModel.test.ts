import { describe, expect, it } from "vitest";
import type { CampaignStateV5, IsleId, LoreCollectionId, LoreEntryId, PlaceId, PlayerId, WizardId } from "../shared/domain";
import {
  BLANK_WIZARD_CHARACTER_V5,
  MAX_LORE_TEXT_LENGTH,
  applyReviseLoreEntry,
  buildInitializedDefaultNecromancerState,
  loreAddTargetFromDescriptor,
  readLoreCompendiumReference,
} from "../shared/domain";
import { makeTestCampaignStateV5 } from "./test-state";
import {
  LORE_EMPTY_ELIGIBLE_STATUS,
  applyUseLatestAsBase,
  browseCompendiumSubjects,
  buildAddLoreEntryMutationArgs,
  buildReviseLoreEntryMutationArgs,
  compendiumSubjectIndexLabel,
  findPresentationSubjectByRef,
  initReviseEditor,
  loreCompendiumUiStateFromQuery,
  newLoreCommandId,
  syncReviseEditorWithPresentation,
  validateLoreDraftText,
} from "../src/lore-view-model";

const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_NECRO = "wiz_00000000-0000-0000-0000-0000000000aa" as WizardId;
const ISL_GRAVEN = "isl_00000000-0000-0000-0000-0000000000aa" as IsleId;
const ISL_DRIFT = "isl_00000000-0000-0000-0000-0000000000ab" as IsleId;
const PLC_CRYPT = "plc_00000000-0000-0000-0000-0000000000aa" as PlaceId;
const LCOL_1 = "lcol_00000000-0000-0000-0000-0000000000aa" as LoreCollectionId;
const LORE_1 = "lore_00000000-0000-0000-0000-0000000000aa" as LoreEntryId;
const GRAVEN_E01 =
  "The Graven Isle is a cold and miserable place, covered in dark clouds and filled with countless memorials to the dead.";
const GRAVEN_SUBJECT = { kind: "isle" as const, isleId: ISL_GRAVEN };
const CAMPAIGN_GATE = "ngt_00000000-0000-0000-0000-0000000000aa" as never;

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
        gateId: CAMPAIGN_GATE,
        name: "The Ash Gate",
        band: "near",
        status: "ordinary",
      }],
    }),
    ...overrides,
  });
}

function requireOk(state: CampaignStateV5) {
  const result = readLoreCompendiumReference(state);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("expected ok presentation");
  return result;
}

describe("browseCompendiumSubjects", () => {
  it("excludes empty_eligible by default and reveals them when requested", () => {
    const presentation = requireOk(boundState());
    const defaultList = browseCompendiumSubjects(presentation, {
      search: "",
      shelfId: "all",
      changedAndAddedOnly: false,
      includeEmptyEligible: false,
    });
    expect(defaultList.every((subject) => subject.compendiumPresence === "has_lore")).toBe(true);
    expect(defaultList.some((subject) => subject.subjectLabel === "The Driftwood Isle")).toBe(false);

    const withEmpty = browseCompendiumSubjects(presentation, {
      search: "",
      shelfId: "all",
      changedAndAddedOnly: false,
      includeEmptyEligible: true,
    });
    const drift = withEmpty.find((subject) => subject.subject?.kind === "isle" && subject.subject.isleId === ISL_DRIFT);
    expect(drift?.compendiumPresence).toBe("empty_eligible");
    expect(compendiumSubjectIndexLabel(drift!)).toContain(LORE_EMPTY_ELIGIBLE_STATUS);
  });

  it("searches case-insensitively across label, context, text, and attribution", () => {
    const presentation = requireOk(boundState());
    const bySubject = browseCompendiumSubjects(presentation, {
      search: "graven isle",
      shelfId: "all",
      changedAndAddedOnly: false,
      includeEmptyEligible: false,
    });
    expect(bySubject.some((subject) => subject.subjectLabel.includes("Graven"))).toBe(true);

    const byText = browseCompendiumSubjects(presentation, {
      search: "memorials to the dead",
      shelfId: "all",
      changedAndAddedOnly: false,
      includeEmptyEligible: false,
    });
    expect(byText.length).toBeGreaterThan(0);

    const byAttribution = browseCompendiumSubjects(presentation, {
      search: "secrets of the graven isle",
      shelfId: "all",
      changedAndAddedOnly: false,
      includeEmptyEligible: false,
    });
    expect(byAttribution.length).toBeGreaterThan(0);
  });

  it("filters by shelf and changed-and-added while keeping full subject Lore when selected", () => {
    const revised = applyReviseLoreEntry(boundState(), {
      target: {
        kind: "source_entry",
        sourceCollectionId: "necromancer.home.graven_isle",
        sourceEntryId: "e01",
        expectedSubject: GRAVEN_SUBJECT,
      },
      expectedText: GRAVEN_E01,
      text: "The Graven Isle is quieter now.",
    }).nextState;
    const presentation = requireOk(revised);
    const changedOnly = browseCompendiumSubjects(presentation, {
      search: "",
      shelfId: "all",
      changedAndAddedOnly: true,
      includeEmptyEligible: false,
    });
    expect(changedOnly.some((subject) => subject.subject?.kind === "isle" && subject.subject.isleId === ISL_GRAVEN)).toBe(true);
    const graven = changedOnly.find((subject) => subject.subject?.kind === "isle" && subject.subject.isleId === ISL_GRAVEN)!;
    expect(graven.contexts.flatMap((context) => context.entries).length).toBeGreaterThan(1);

    const isles = browseCompendiumSubjects(presentation, {
      search: "",
      shelfId: "isles",
      changedAndAddedOnly: false,
      includeEmptyEligible: false,
    });
    expect(isles.every((subject) => subject.shelf.id === "isles")).toBe(true);
  });
});

describe("subject lookup", () => {
  it("finds presentation subject by LoreSubjectRef", () => {
    const presentation = requireOk(boundState());
    const gate = findPresentationSubjectByRef(presentation, { kind: "necromancer_gate", gateId: "amber" });
    expect(gate?.subjectLabel).toBe("The Amber Gate");
    const campaignGate = findPresentationSubjectByRef(presentation, { kind: "necromancer_gate", gateId: CAMPAIGN_GATE });
    expect(campaignGate?.subjectLabel).toBe("The Ash Gate");
  });
});

describe("validateLoreDraftText", () => {
  it("rejects blank and overlong text but preserves surrounding whitespace", () => {
    expect(validateLoreDraftText("   ").ok).toBe(false);
    expect(validateLoreDraftText("a".repeat(MAX_LORE_TEXT_LENGTH + 1)).ok).toBe(false);
    expect(validateLoreDraftText("  valid prose  ").ok).toBe(true);
  });
});

describe("mutation payloads", () => {
  it("builds add payloads for source, campaign, and first campaign collection", () => {
    const presentation = requireOk(boundState());
    const graven = presentation.subjects.find((subject) =>
      subject.contexts.some((context) => context.kind === "source" && context.sourceCollectionId === "necromancer.home.graven_isle"),
    )!;
    const sourceContext = graven.contexts.find((context) => context.kind === "source")!;
    expect(sourceContext.write.writable).toBe(true);
    if (!sourceContext.write.writable) return;

    const sourceAdd = buildAddLoreEntryMutationArgs({
      commandId: newLoreCommandId("00000000-0000-4000-8000-000000000099"),
      expectedCampaignId: "cmp_test",
      descriptor: sourceContext.write.add,
      loreEntryId: LORE_1,
      text: "  New memorial text  ",
    });
    expect(sourceAdd.ok).toBe(true);
    if (!sourceAdd.ok) return;
    expect(sourceAdd.payload.text).toBe("  New memorial text  ");
    expect(sourceAdd.payload.target).toEqual(loreAddTargetFromDescriptor(sourceContext.write.add, LCOL_1));

    const drift = presentation.subjects.find((subject) =>
      subject.subject?.kind === "isle" && subject.subject.isleId === ISL_DRIFT,
    )!;
    const firstAdd = buildAddLoreEntryMutationArgs({
      commandId: newLoreCommandId("00000000-0000-4000-8000-000000000098"),
      expectedCampaignId: "cmp_test",
      descriptor: drift.ordinaryFirstAdd!,
      loreEntryId: LORE_1,
      text: "First lore.",
      newCampaignCollectionId: LCOL_1,
    });
    expect(firstAdd.ok).toBe(true);
    if (!firstAdd.ok) return;
    expect(firstAdd.payload.target).toEqual(loreAddTargetFromDescriptor(drift.ordinaryFirstAdd!, LCOL_1));
  });

  it("builds revise payload with unchanged expectedText", () => {
    const presentation = requireOk(boundState());
    const graven = presentation.subjects.find((subject) =>
      subject.contexts.some((context) => context.kind === "source" && context.sourceCollectionId === "necromancer.home.graven_isle"),
    )!;
    const context = graven.contexts.find((context) => context.kind === "source")!;
    const entry = context.entries[0]!;
    const editor = initReviseEditor(entry, context)!;
    const built = buildReviseLoreEntryMutationArgs({
      commandId: newLoreCommandId("00000000-0000-4000-8000-000000000097"),
      expectedCampaignId: "cmp_test",
      editor: { ...editor, draftText: "Revised Graven Isle prose." },
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.payload.expectedText).toBe(GRAVEN_E01);
    expect(built.payload.text).toBe("Revised Graven Isle prose.");
  });
});

describe("revise editor sync", () => {
  it("marks conflict when server text diverges and use latest as base preserves draft", () => {
    const presentation = requireOk(boundState());
    const graven = presentation.subjects.find((subject) =>
      subject.contexts.some((context) => context.kind === "source" && context.sourceCollectionId === "necromancer.home.graven_isle"),
    )!;
    const context = graven.contexts.find((context) => context.kind === "source")!;
    const editor = initReviseEditor(context.entries[0]!, context)!;
    const opened = { ...editor, draftText: "My draft stays." };

    const revised = applyReviseLoreEntry(boundState(), {
      target: editor.reviseTarget,
      expectedText: editor.expectedText,
      text: "Someone else changed this.",
    }).nextState;
    const updatedPresentation = requireOk(revised);
    const updatedSubject = updatedPresentation.subjects.find((subject) =>
      subject.contexts.some((context) => context.kind === "source" && context.sourceCollectionId === "necromancer.home.graven_isle"),
    )!;
    const synced = syncReviseEditorWithPresentation(opened, updatedSubject);
    expect(synced.conflicted).toBe(true);
    expect(synced.draftText).toBe("My draft stays.");
    expect(synced.latestServerText).toBe("Someone else changed this.");

    const rebased = applyUseLatestAsBase(synced);
    expect(rebased.expectedText).toBe("Someone else changed this.");
    expect(rebased.draftText).toBe("My draft stays.");
    expect(rebased.conflicted).toBe(false);
  });

  it("keeps an existing server-stale conflict until presentation text diverges from expectedText", () => {
    const presentation = requireOk(boundState());
    const graven = presentation.subjects.find((subject) =>
      subject.contexts.some((context) => context.kind === "source" && context.sourceCollectionId === "necromancer.home.graven_isle"),
    )!;
    const context = graven.contexts.find((context) => context.kind === "source")!;
    const editor = initReviseEditor(context.entries[0]!, context)!;
    const serverStale = { ...editor, conflicted: true, latestServerText: null };
    const resynced = syncReviseEditorWithPresentation(serverStale, graven);
    expect(resynced.conflicted).toBe(true);
  });
});

describe("loreCompendiumUiStateFromQuery", () => {
  it("maps query results to UI states", () => {
    expect(loreCompendiumUiStateFromQuery(undefined)).toEqual({ status: "loading" });
    expect(loreCompendiumUiStateFromQuery(null)).toEqual({ status: "unavailable" });
    expect(loreCompendiumUiStateFromQuery({ presentation: { ok: false, reason: "unsupported_ruleset" } })).toEqual({
      status: "unsupported_ruleset",
    });
    const presentation = requireOk(boundState());
    expect(loreCompendiumUiStateFromQuery({ presentation })).toEqual({ status: "ready", presentation });
  });
});
