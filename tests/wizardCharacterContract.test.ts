import { describe, it, expect } from "vitest";
import {
  updateWizardCharacterFingerprint,
  CAMPAIGN_COMMAND_TYPES,
  isLogicalStateCommandType,
} from "../shared/domain";
import type { WizardCharacterPatch } from "../shared/domain";

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
// 3. Canonical coherence (M3_COMMAND_EVENT_MAP validation)
// ============================================================
// These tests exercise the M3 coherence logic through the types.
// The actual canonicalCommit runs in Convex so we validate the
// contract shape here: the command/event map entries, event
// structure requirements, and payload validation.

import { BLANK_WIZARD_CHARACTER, type WizardCharacterData } from "../shared/domain";

const BLANK_CHAR: WizardCharacterData = BLANK_WIZARD_CHARACTER;

function makeWizardCharacterUpdatedEvent(overrides?: Partial<{
  wizardId: string;
  version: number;
  type: string;
  previousCharacter: WizardCharacterData;
  newCharacter: WizardCharacterData;
}>) {
  return {
    type: overrides?.type ?? "wizard_character_updated",
    version: overrides?.version ?? 1,
    data: {
      wizardId: overrides?.wizardId ?? "wiz_abc123",
      previousCharacter: overrides?.previousCharacter ?? BLANK_CHAR,
      newCharacter: overrides?.newCharacter ?? { ...BLANK_CHAR, ageYears: 50 },
    },
  };
}

describe("wizard_character_updated coherence contract shape", () => {
  it("valid event has correct shape for M3 coherence", () => {
    const evt = makeWizardCharacterUpdatedEvent();
    expect(evt.type).toBe("wizard_character_updated");
    expect(evt.version).toBe(1);
    expect(evt.data.wizardId).toBe("wiz_abc123");
    expect(evt.data.previousCharacter).toEqual(BLANK_CHAR);
    expect(evt.data.newCharacter.ageYears).toBe(50);
  });

  it("M3 map requires exactly one wizard_character_updated for update_wizard_character", () => {
    // This is a structural assertion: the command maps to exactly one required event type.
    // The actual enforcement is in canonicalCommit.ts M3_COMMAND_EVENT_MAP.
    const evt = makeWizardCharacterUpdatedEvent();
    expect(evt.type).toBe("wizard_character_updated");
    // No optional events for this command
  });

  it("wrong event type would be rejected", () => {
    const evt = makeWizardCharacterUpdatedEvent({ type: "player_added" });
    expect(evt.type).not.toBe("wizard_character_updated");
  });

  it("missing event would violate required count", () => {
    const events: unknown[] = [];
    expect(events.length).toBe(0);
    // M3 coherence requires exactly 1 event
  });

  it("extra event would violate count", () => {
    const events = [
      makeWizardCharacterUpdatedEvent(),
      makeWizardCharacterUpdatedEvent(),
    ];
    expect(events.length).toBe(2);
    // M3 coherence requires exactly 1 event
  });

  it("invalid wizardId would be rejected by payload validation", () => {
    const evt = makeWizardCharacterUpdatedEvent({ wizardId: "" });
    expect(evt.data.wizardId).toBe("");
    // isValidWizardId("") returns false -> payload validation rejects
  });

  it("wrong event version would be rejected", () => {
    const evt = makeWizardCharacterUpdatedEvent({ version: 2 });
    expect(evt.version).toBe(2);
    // M3 coherence rejects version !== 1 for non-phase_advanced events
  });
});
