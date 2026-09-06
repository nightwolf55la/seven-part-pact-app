import { describe, it, expect } from "vitest";
import {
  initialCampaignState,
  applyAddPlayer,
  applyCreateWizard,
  applyUpdateWizardCharacter,
  BLANK_WIZARD_CHARACTER,
  normalizeWizardCharacterPatch,
  updateWizardCharacterFingerprint,
  validateCampaignState,
  statesDeepEqual,
  applyBeginPlay,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  CURRENT_STATE_SCHEMA_VERSION,
  asCentidegreePosition,
  canonicalJsonStringify,
  DomainError,
} from "../shared/domain";
import type {
  CurrentCampaignState,
  WizardCharacterData,
  PlayerId,
  WizardId,
} from "../shared/domain";
import { PACT_SEAT_IDS } from "../shared/domain/pact-seats";
import type { PactSeatId } from "../shared/domain/pact-seats";
import {
  buildExportBackup,
  fullyValidateBackup,
} from "../shared/domain";
import {
  deriveUndoTransition,
  deriveRedoTransition,
} from "../shared/domain/undo-redo";
import type { CampaignHistoryControlV1 } from "../shared/domain/history-control";

const P1 = "plr_00000000-0000-0000-0000-000000000001" as PlayerId;
const W1 = "wiz_00000000-0000-0000-0000-000000000001" as WizardId;

function setupWithWizard(): CurrentCampaignState {
  let state = initialCampaignState();
  state = applyAddPlayer(state, P1, "Alice").nextState;
  state = applyCreateWizard(state, W1, "Thalion", P1, PACT_SEAT_IDS[0] as PactSeatId).nextState;
  return state;
}

function wizardCharacter(state: CurrentCampaignState, wizardId: WizardId): WizardCharacterData {
  const w = state.wizards.find((w) => w.wizardId === wizardId);
  if (!w) throw new Error(`Wizard not found: ${wizardId}`);
  return w.character;
}

const BLANK_COMPANIONS = { air: null, fire: null, earth: null, water: null };

const FILLED_COMPANIONS = {
  air: "Zephyr, a wind sprite",
  fire: "Ember, a salamander",
  earth: "Granite, a stone golem",
  water: "Coral, a water nymph",
};

// ============================================================
// 1. Blank/new Wizard has all four Companion descriptions as null
// ============================================================

describe("companionDescriptions: blank wizard", () => {
  it("blank wizard character has companionDescriptions with all four null", () => {
    expect(BLANK_WIZARD_CHARACTER.companionDescriptions).toEqual(BLANK_COMPANIONS);
  });

  it("newly created wizard has companionDescriptions with all four null", () => {
    const state = setupWithWizard();
    const char = wizardCharacter(state, W1);
    expect(char.companionDescriptions).toEqual(BLANK_COMPANIONS);
  });
});

// ============================================================
// 2. V4 state validation
// ============================================================

describe("companionDescriptions: V4 state validation", () => {
  it("accepts valid companionDescriptions (all null)", () => {
    const state = setupWithWizard();
    expect(() => validateCampaignState(state)).not.toThrow();
  });

  it("accepts valid companionDescriptions (all strings)", () => {
    const state = setupWithWizard();
    const { nextState } = applyUpdateWizardCharacter(state, W1, {
      companionDescriptions: FILLED_COMPANIONS,
    });
    expect(() => validateCampaignState(nextState)).not.toThrow();
  });

  it("accepts mixed string/null companionDescriptions", () => {
    const state = setupWithWizard();
    const { nextState } = applyUpdateWizardCharacter(state, W1, {
      companionDescriptions: { air: "Zephyr", fire: null, earth: "Granite", water: null },
    });
    expect(() => validateCampaignState(nextState)).not.toThrow();
  });

  it("rejects missing companionDescriptions on wizard character", () => {
    const state = setupWithWizard();
    const corrupted = JSON.parse(JSON.stringify(state));
    delete corrupted.wizards[0].character.companionDescriptions;
    expect(() => validateCampaignState(corrupted)).toThrow();
  });

  it("rejects companionDescriptions missing a key", () => {
    const state = setupWithWizard();
    const corrupted = JSON.parse(JSON.stringify(state));
    corrupted.wizards[0].character.companionDescriptions = { air: null, fire: null, earth: null };
    expect(() => validateCampaignState(corrupted)).toThrow();
  });

  it("rejects companionDescriptions with non-string/non-null value", () => {
    const state = setupWithWizard();
    const corrupted = JSON.parse(JSON.stringify(state));
    corrupted.wizards[0].character.companionDescriptions = { air: 42, fire: null, earth: null, water: null };
    expect(() => validateCampaignState(corrupted)).toThrow();
  });
});

// ============================================================
// 3. Patch semantics
// ============================================================

describe("companionDescriptions: patch semantics", () => {
  it("omitted/undefined companionDescriptions preserves existing", () => {
    let state = setupWithWizard();
    state = applyUpdateWizardCharacter(state, W1, {
      companionDescriptions: FILLED_COMPANIONS,
    }).nextState;
    const { nextState } = applyUpdateWizardCharacter(state, W1, { ageYears: 100 });
    expect(wizardCharacter(nextState, W1).companionDescriptions).toEqual(FILLED_COMPANIONS);
  });

  it("supplied object replaces all four atomically", () => {
    let state = setupWithWizard();
    state = applyUpdateWizardCharacter(state, W1, {
      companionDescriptions: FILLED_COMPANIONS,
    }).nextState;
    const replacement = { air: "New air", fire: null, earth: null, water: "New water" };
    const { nextState } = applyUpdateWizardCharacter(state, W1, {
      companionDescriptions: replacement,
    });
    expect(wizardCharacter(nextState, W1).companionDescriptions).toEqual(replacement);
  });

  it("strings are trimmed", () => {
    const state = setupWithWizard();
    const { nextState } = applyUpdateWizardCharacter(state, W1, {
      companionDescriptions: {
        air: "  Zephyr  ",
        fire: "  Ember  ",
        earth: "  Granite  ",
        water: "  Coral  ",
      },
    });
    const cd = wizardCharacter(nextState, W1).companionDescriptions;
    expect(cd.air).toBe("Zephyr");
    expect(cd.fire).toBe("Ember");
    expect(cd.earth).toBe("Granite");
    expect(cd.water).toBe("Coral");
  });

  it("whitespace-only strings become null", () => {
    const state = setupWithWizard();
    const { nextState } = applyUpdateWizardCharacter(state, W1, {
      companionDescriptions: { air: "   ", fire: "\t", earth: "\n", water: "  \t\n  " },
    });
    expect(wizardCharacter(nextState, W1).companionDescriptions).toEqual(BLANK_COMPANIONS);
  });

  it("null remains null", () => {
    const state = setupWithWizard();
    const { nextState } = applyUpdateWizardCharacter(state, W1, {
      companionDescriptions: { air: null, fire: null, earth: null, water: null },
    });
    expect(wizardCharacter(nextState, W1).companionDescriptions).toEqual(BLANK_COMPANIONS);
  });

  it("companionDescriptions-only patch is valid (not rejected as empty)", () => {
    const state = setupWithWizard();
    expect(() =>
      applyUpdateWizardCharacter(state, W1, {
        companionDescriptions: FILLED_COMPANIONS,
      }),
    ).not.toThrow();
  });
});

// ============================================================
// 4. Fingerprint normalization
// ============================================================

describe("companionDescriptions: fingerprint", () => {
  it("semantically equivalent whitespace inputs produce identical fingerprints", () => {
    const patchA = normalizeWizardCharacterPatch({
      companionDescriptions: { air: "  Zephyr  ", fire: null, earth: null, water: null },
    });
    const patchB = normalizeWizardCharacterPatch({
      companionDescriptions: { air: "Zephyr", fire: null, earth: null, water: null },
    });
    const fpA = updateWizardCharacterFingerprint("wiz_abc", patchA as Record<string, unknown>);
    const fpB = updateWizardCharacterFingerprint("wiz_abc", patchB as Record<string, unknown>);
    expect(fpA).toBe(fpB);
  });

  it("whitespace-only values normalize to null and match explicit null fingerprint", () => {
    const patchA = normalizeWizardCharacterPatch({
      companionDescriptions: { air: "   ", fire: null, earth: null, water: null },
    });
    const patchB = normalizeWizardCharacterPatch({
      companionDescriptions: { air: null, fire: null, earth: null, water: null },
    });
    const fpA = updateWizardCharacterFingerprint("wiz_abc", patchA as Record<string, unknown>);
    const fpB = updateWizardCharacterFingerprint("wiz_abc", patchB as Record<string, unknown>);
    expect(fpA).toBe(fpB);
  });
});

// ============================================================
// 5. Recovery: undo/redo roundtrip preserves companionDescriptions
// ============================================================

const CMP_ID = "cmp_00000000-0000-0000-0000-000000000001";
const EMPTY_SEAT = { status: null, wizardId: null, watcherPlayerId: null } as const;

function emptyPactSeats() {
  return {
    necromancer: EMPTY_SEAT, hierophant: EMPTY_SEAT, warlock: EMPTY_SEAT,
    mariner: EMPTY_SEAT, faustian: EMPTY_SEAT, sage: EMPTY_SEAT, sorcerer: EMPTY_SEAT,
  };
}

function blankWizardSetupState(): CurrentCampaignState {
  return {
    schemaVersion: 4,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: null },
    configuration: { ageId: null, facilitatorPlayerId: P1 },
    players: [{ playerId: P1, name: "Alice" }],
    wizards: [{
      wizardId: W1,
      name: "Valdris",
      portrayedByPlayerId: P1,
      character: { ...BLANK_WIZARD_CHARACTER },
    }],
    pactSeats: {
      ...emptyPactSeats(),
      necromancer: { status: "present", wizardId: W1, watcherPlayerId: null },
    },
    lifecycle: {
      kind: "setup",
      orrery: { saturn: asCentidegreePosition(500), jupiter: null, mars: null, venus: null, mercury: null },
    },
    wizardmootHistory: [],
  } as CurrentCampaignState;
}

function editedCompanionSetupState(): CurrentCampaignState {
  const prior = blankWizardSetupState();
  const result = applyUpdateWizardCharacter(prior, W1, {
    companionDescriptions: FILLED_COMPANIONS,
    ageYears: 67,
  });
  return result.nextState;
}

describe("companionDescriptions: recovery roundtrip", () => {
  function makeControl(undoStack: number[], redoStack: number[]): CampaignHistoryControlV1 {
    return { historyControlVersion: 1, campaignId: CMP_ID, undoStack, redoStack };
  }

  it("undo from companion-edited restores blank descriptions", () => {
    const priorState = blankWizardSetupState();
    const editedState = editedCompanionSetupState();

    const result = deriveUndoTransition(
      {
        control: makeControl([0, 1], []),
        campaignRevision: 2,
        campaignState: editedState,
        targetSnapshotState: priorState,
        currentLogicalSnapshotState: editedState,
        targetRevisionCommandType: null,
      },
      CMP_ID,
    );

    const cd = result.nextState.wizards[0].character.companionDescriptions;
    expect(cd).toEqual(BLANK_COMPANIONS);
    expect(statesDeepEqual(result.nextState, priorState)).toBe(true);
  });

  it("redo restores companion descriptions", () => {
    const priorState = blankWizardSetupState();
    const editedState = editedCompanionSetupState();

    const result = deriveRedoTransition(
      {
        control: makeControl([0], [1]),
        campaignRevision: 3,
        campaignState: priorState,
        targetSnapshotState: editedState,
        currentLogicalSnapshotState: priorState,
        targetRevisionCommandType: "update_wizard_character",
      },
      CMP_ID,
    );

    expect(result.nextState.wizards[0].character.companionDescriptions).toEqual(FILLED_COMPANIONS);
    expect(statesDeepEqual(result.nextState, editedState)).toBe(true);
  });

  it("backup roundtrip preserves companion descriptions", async () => {
    const editedState = editedCompanionSetupState();
    const source = {
      sourceCampaignId: CMP_ID,
      sourceCampaignRevision: 1,
      sourceLogicalRevision: 1,
      state: editedState,
    };
    const backup = await buildExportBackup(source, Date.now());
    const rawJson = JSON.stringify(backup);
    const validated = await fullyValidateBackup(rawJson, null);

    expect("backup" in validated).toBe(true);
    if (!("backup" in validated)) return;

    expect(validated.backup.state.wizards[0].character.companionDescriptions).toEqual(FILLED_COMPANIONS);
    expect(statesDeepEqual(validated.backup.state, editedState)).toBe(true);
  });

  it("statesDeepEqual detects differing companionDescriptions", () => {
    const a = editedCompanionSetupState();
    const b = JSON.parse(JSON.stringify(a)) as CurrentCampaignState;
    (b.wizards[0] as any).character.companionDescriptions.air = "Different";
    expect(statesDeepEqual(a, b)).toBe(false);
  });
});
