import { describe, it, expect } from "vitest";
import {
  updateWizardCharacterFingerprint,
  CAMPAIGN_COMMAND_TYPES,
  isLogicalStateCommandType,
  BLANK_WIZARD_CHARACTER,
  CURRENT_STATE_SCHEMA_VERSION,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  DomainError,
  type WizardCharacterData,
  type CurrentCampaignState,
  type CampaignEvent,
} from "../shared/domain";
import {
  validateEventCoherenceForTest,
  type CanonicalCommitInput,
} from "../convex/canonicalCommit";

// ============================================================
// 1. Command registration
// ============================================================

describe("update_wizard_character command registration", () => {
  it("is in CAMPAIGN_COMMAND_TYPES", () => {
    expect(CAMPAIGN_COMMAND_TYPES).toContain("update_wizard_character");
  });

  it("is a logical-state command", () => {
    expect(isLogicalStateCommandType("update_wizard_character")).toBe(true);
  });
});

// ============================================================
// 2. Fingerprint
// ============================================================

describe("updateWizardCharacterFingerprint", () => {
  const WIZARD = "wiz_abc123";

  it("same wizard + same normalized patch => same fingerprint", () => {
    const patch = { ageYears: 50 };
    const a = updateWizardCharacterFingerprint(WIZARD, patch);
    const b = updateWizardCharacterFingerprint(WIZARD, patch);
    expect(a).toBe(b);
  });

  it("input property order does not affect fingerprint", () => {
    const a = updateWizardCharacterFingerprint(WIZARD, { ageYears: 50, importantNotes: "test" });
    const b = updateWizardCharacterFingerprint(WIZARD, { importantNotes: "test", ageYears: 50 });
    expect(a).toBe(b);
  });

  it("different wizard ID => different fingerprint", () => {
    const patch = { ageYears: 50 };
    const a = updateWizardCharacterFingerprint("wiz_aaa", patch);
    const b = updateWizardCharacterFingerprint("wiz_bbb", patch);
    expect(a).not.toBe(b);
  });

  it("different character intent => different fingerprint", () => {
    const a = updateWizardCharacterFingerprint(WIZARD, { ageYears: 50 });
    const b = updateWizardCharacterFingerprint(WIZARD, { ageYears: 99 });
    expect(a).not.toBe(b);
  });

  it("null versus omitted are distinguishable", () => {
    const withNull = updateWizardCharacterFingerprint(WIZARD, { ageYears: null });
    const withValue = updateWizardCharacterFingerprint(WIZARD, { ageYears: 50 });
    const withoutAge = updateWizardCharacterFingerprint(WIZARD, { importantNotes: "x" });
    expect(withNull).not.toBe(withValue);
    expect(withNull).not.toBe(withoutAge);
    expect(withValue).not.toBe(withoutAge);
  });

  it("empty array publicChangesOfMagic is distinct from omitted", () => {
    const withEmpty = updateWizardCharacterFingerprint(WIZARD, { publicChangesOfMagic: [] });
    const withNotes = updateWizardCharacterFingerprint(WIZARD, { importantNotes: "x" });
    expect(withEmpty).not.toBe(withNotes);
  });

  it("empty array publicChangesOfMagic is distinct from populated", () => {
    const withEmpty = updateWizardCharacterFingerprint(WIZARD, { publicChangesOfMagic: [] });
    const withEntries = updateWizardCharacterFingerprint(WIZARD, { publicChangesOfMagic: ["Glowing eyes"] });
    expect(withEmpty).not.toBe(withEntries);
  });

  it("starts with update_wizard_character:v1:", () => {
    const fp = updateWizardCharacterFingerprint(WIZARD, { ageYears: 50 });
    expect(fp).toMatch(/^update_wizard_character:v1:/);
  });
});

// ============================================================
// 3. Canonical coherence (real validateEventCoherence)
// ============================================================

const WIZARD_ID = "wiz_00000000-0000-0000-0000-000000000001";

function makeState(): CurrentCampaignState {
  return {
    schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 0 as any },
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
    lifecycle: {
      kind: "play" as const,
      phase: "new_moon" as const,
      orrery: { saturn: 0 as any, jupiter: 9000 as any, mars: 18000 as any, venus: 27000 as any, mercury: 4500 as any },
      currentMonth: { timeParticipants: [], engagements: [], wizardmootAttendance: null },
    },
    wizardmootHistory: [],
    world: {
      denizens: [],
      isles: [],
      places: [],
      companionRelationships: [],
    },
    hierophant: {
      selectedFlameLawIds: [],
      campaignClasses: [],
      campaignDoctrines: [],
      temples: [],
      supplicants: [],
      prophets: [],
      cults: [],
      holidayTempleIds: [],
    },
  };
}

function makeWizardCharacterUpdatedEvent(overrides?: Partial<{
  wizardId: string;
  version: number;
  type: string;
  previousCharacter: WizardCharacterData;
  newCharacter: WizardCharacterData;
}>): CampaignEvent {
  const evt = {
    type: overrides?.type ?? "wizard_character_updated",
    version: overrides?.version ?? 1,
    data: {
      wizardId: overrides?.wizardId ?? WIZARD_ID,
      previousCharacter: overrides?.previousCharacter ?? BLANK_WIZARD_CHARACTER,
      newCharacter: overrides?.newCharacter ?? { ...BLANK_WIZARD_CHARACTER, ageYears: 50 },
    },
  };
  return evt as unknown as CampaignEvent;
}

function makeInput(events: readonly CampaignEvent[], overrides?: Partial<CanonicalCommitInput>): CanonicalCommitInput {
  return {
    campaignDocId: "camp-doc-1" as any,
    campaignId: "camp-1",
    currentRevision: 10,
    currentState: makeState(),
    commandId: "cmd-1",
    commandType: "update_wizard_character",
    commandFingerprint: updateWizardCharacterFingerprint(WIZARD_ID, { ageYears: 50 }),
    nextState: makeState(),
    events,
    historyControlUpdate: { kind: "logical_state_append" },
    ...overrides,
  };
}

function assertDomainError(fn: () => unknown, code: string): void {
  try {
    fn();
    throw new Error(`Expected DomainError(${code}) but no error was thrown`);
  } catch (e) {
    if (!(e instanceof DomainError)) {
      throw new Error(`Expected DomainError(${code}) but got: ${e}`);
    }
    expect(e.code).toBe(code);
  }
}

describe("validateEventCoherence — update_wizard_character", () => {
  it("valid: update_wizard_character + exactly one wizard_character_updated v2 + logical_state_append does not throw", () => {
    const evt = makeWizardCharacterUpdatedEvent({ version: 2 });
    const input = makeInput([evt]);
    expect(() => validateEventCoherenceForTest(input, 11)).not.toThrow();
  });

  it("missing event throws DomainError INVALID_CAMPAIGN_STATE", () => {
    const input = makeInput([]);
    assertDomainError(() => validateEventCoherenceForTest(input, 11), "INVALID_CAMPAIGN_STATE");
  });

  it("extra event throws DomainError INVALID_CAMPAIGN_STATE", () => {
    const evt = makeWizardCharacterUpdatedEvent();
    const input = makeInput([evt, evt]);
    assertDomainError(() => validateEventCoherenceForTest(input, 11), "INVALID_CAMPAIGN_STATE");
  });

  it("wrong event type throws DomainError INVALID_CAMPAIGN_STATE", () => {
    const evt = makeWizardCharacterUpdatedEvent({ type: "player_added" });
    const input = makeInput([evt]);
    assertDomainError(() => validateEventCoherenceForTest(input, 11), "INVALID_CAMPAIGN_STATE");
  });

  it("wizard_character_updated version 1 throws DomainError INVALID_CAMPAIGN_STATE", () => {
    const evt = makeWizardCharacterUpdatedEvent({ version: 1 });
    const input = makeInput([evt]);
    assertDomainError(() => validateEventCoherenceForTest(input, 11), "INVALID_CAMPAIGN_STATE");
  });

  it("invalid wizardId throws DomainError INVALID_CAMPAIGN_STATE", () => {
    const evt = makeWizardCharacterUpdatedEvent({ wizardId: "not-a-valid-wiz-id" });
    const input = makeInput([evt]);
    assertDomainError(() => validateEventCoherenceForTest(input, 11), "INVALID_CAMPAIGN_STATE");
  });

  it("historyControlUpdate other than logical_state_append rejects", () => {
    const evt = makeWizardCharacterUpdatedEvent();
    const input = makeInput([evt], {
      historyControlUpdate: { kind: "history_navigation", nextUndoStack: [], nextRedoStack: [] },
    });
    assertDomainError(() => validateEventCoherenceForTest(input, 11), "INVALID_CAMPAIGN_STATE");
  });
});
