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

// ============================================================
// 1. V5 Blank Wizard no longer has companionDescriptions
// ============================================================

describe("companionDescriptions: retired in V5", () => {
  it("BLANK_WIZARD_CHARACTER does not have companionDescriptions", () => {
    expect(BLANK_WIZARD_CHARACTER).not.toHaveProperty("companionDescriptions");
  });

  it("newly created wizard does not have companionDescriptions", () => {
    const state = setupWithWizard();
    const char = wizardCharacter(state, W1);
    expect(char).not.toHaveProperty("companionDescriptions");
  });
});

// ============================================================
// 2. V5 state validation rejects companionDescriptions
// ============================================================

describe("companionDescriptions: V5 state validation rejects companionDescriptions", () => {
  it("accepts V5 wizard without companionDescriptions", () => {
    const state = setupWithWizard();
    expect(() => validateCampaignState(state)).not.toThrow();
  });

  it("rejects wizard character that has companionDescriptions (V4 artifact)", () => {
    const state = setupWithWizard();
    const corrupted = JSON.parse(JSON.stringify(state));
    corrupted.wizards[0].character.companionDescriptions = { air: null, fire: null, earth: null, water: null };
    expect(() => validateCampaignState(corrupted)).toThrow();
  });
});

// ============================================================
// 3. Patch semantics: companionDescriptions no longer part of character patches
// ============================================================

describe("companionDescriptions: patch semantics in V5", () => {
  it("omitting companionDescriptions in patch is normal (no error)", () => {
    const state = setupWithWizard();
    expect(() =>
      applyUpdateWizardCharacter(state, W1, { ageYears: 100 }),
    ).not.toThrow();
  });

  it("character patch with only non-companion fields succeeds", () => {
    const state = setupWithWizard();
    const { nextState } = applyUpdateWizardCharacter(state, W1, {
      ageYears: 100,
      pactFragmentPersonalForm: "A silver stag",
    });
    const char = wizardCharacter(nextState, W1);
    expect(char.ageYears).toBe(100);
    expect(char.pactFragmentPersonalForm).toBe("A silver stag");
    expect(char).not.toHaveProperty("companionDescriptions");
  });
});

// ============================================================
// 4. Fingerprint normalization (companionDescriptions no longer relevant)
// ============================================================

describe("companionDescriptions: fingerprint in V5", () => {
  it("patches without companionDescriptions produce stable fingerprints", () => {
    const patchA = normalizeWizardCharacterPatch({ ageYears: 100 });
    const patchB = normalizeWizardCharacterPatch({ ageYears: 100 });
    const fpA = updateWizardCharacterFingerprint("wiz_abc", patchA as Record<string, unknown>);
    const fpB = updateWizardCharacterFingerprint("wiz_abc", patchB as Record<string, unknown>);
    expect(fpA).toBe(fpB);
  });
});

// ============================================================
// 5. Recovery: undo/redo roundtrip preserves V5 character shape
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
    schemaVersion: 5,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: null },
    configuration: { ageId: null, facilitatorPlayerId: P1 },
    players: [{ playerId: P1, name: "Alice" }],
    wizards: [{
      wizardId: W1,
      name: "Valdris",
      portrayedByPlayerId: P1,
      character: { ...BLANK_WIZARD_CHARACTER },
      homeIsleId: null,
      sanctumPlaceId: null,
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
    world: { denizens: [], isles: [], places: [], companionRelationships: [] },
    hierophant: { selectedFlameLawIds: [], campaignClasses: [], campaignDoctrines: [], temples: [], supplicants: [], prophets: [], cults: [], holidayTempleIds: [] },
  } as CurrentCampaignState;
}

function editedSetupState(): CurrentCampaignState {
  const prior = blankWizardSetupState();
  const result = applyUpdateWizardCharacter(prior, W1, {
    ageYears: 67,
  });
  return result.nextState;
}

describe("companionDescriptions: recovery roundtrip in V5", () => {
  function makeControl(undoStack: number[], redoStack: number[]): CampaignHistoryControlV1 {
    return { historyControlVersion: 1, campaignId: CMP_ID, undoStack, redoStack };
  }

  it("undo from edited restores blank character", () => {
    const priorState = blankWizardSetupState();
    const editedState = editedSetupState();

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

    const char = result.nextState.wizards[0].character;
    expect(char).not.toHaveProperty("companionDescriptions");
    expect(char.ageYears).toBeNull();
    expect(statesDeepEqual(result.nextState, priorState)).toBe(true);
  });

  it("redo restores edited character", () => {
    const priorState = blankWizardSetupState();
    const editedState = editedSetupState();

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

    expect(result.nextState.wizards[0].character.ageYears).toBe(67);
    expect(result.nextState.wizards[0].character).not.toHaveProperty("companionDescriptions");
    expect(statesDeepEqual(result.nextState, editedState)).toBe(true);
  });

  it("backup roundtrip preserves V5 character without companionDescriptions", async () => {
    const editedState = editedSetupState();
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

    expect(validated.backup.state.wizards[0].character).not.toHaveProperty("companionDescriptions");
    expect(statesDeepEqual(validated.backup.state, editedState)).toBe(true);
  });

  it("statesDeepEqual detects differing ageYears", () => {
    const a = editedSetupState();
    const b = JSON.parse(JSON.stringify(a)) as CurrentCampaignState;
    (b.wizards[0] as any).character.ageYears = 999;
    expect(statesDeepEqual(a, b)).toBe(false);
  });
});
