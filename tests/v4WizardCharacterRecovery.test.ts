import { describe, it, expect } from "vitest";
import {
  statesDeepEqual,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  CURRENT_STATE_SCHEMA_VERSION,
  asCentidegreePosition,
  BLANK_WIZARD_CHARACTER,
  applyUpdateWizardCharacter,
  canonicalJsonStringify,
  DomainError,
  EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
  EMPTY_SAGE_STATE,
  EMPTY_FAUSTIAN_STATE,
} from "../shared/domain";
import type {
  CurrentCampaignState,
  PlayerId,
  WizardId,
  WizardCharacterData,
} from "../shared/domain";
import type { CampaignHistoryControlV1 } from "../shared/domain/history-control";
import {
  deriveUndoTransition,
  deriveRedoTransition,
} from "../shared/domain/undo-redo";
import {
  verifyCheckpoint,
  verifyCheckpointRestoreRevision,
  CURRENT_CHECKPOINT_VERSION,
} from "../shared/domain/checkpoints";
import {
  buildExportBackup,
  fullyValidateBackup,
  BACKUP_FORMAT_TYPE,
  CURRENT_BACKUP_FORMAT_VERSION,
} from "../shared/domain";
import { validateBackupState } from "../shared/domain/backup";
import {
  verifyMigrationInvariants,
} from "../shared/domain/verification";
import type {
  RevisionRecord,
  EventRecord,
  SnapshotRecord,
  CampaignDocument,
} from "../shared/domain/verification";

// ============================================================
// Fixtures
// ============================================================

const EMPTY_SEAT = { status: null, wizardId: null, watcherPlayerId: null } as const;

function emptyPactSeats() {
  return {
    necromancer: EMPTY_SEAT,
    hierophant: EMPTY_SEAT,
    warlock: EMPTY_SEAT,
    mariner: EMPTY_SEAT,
    faustian: EMPTY_SEAT,
    sage: EMPTY_SEAT,
    sorcerer: EMPTY_SEAT,
  };
}

const CMP_ID = "cmp_00000000-0000-0000-0000-000000000001";
const PLR = "plr_00000000-0000-0000-0000-000000000001" as PlayerId;
const WIZ = "wiz_00000000-0000-0000-0000-000000000001" as WizardId;

const EDITED_CHARACTER: WizardCharacterData = {
  elements: { air: -1, fire: 4, earth: 2, water: 3 },
  pactFragmentPersonalForm: "A black iron lantern",
  familiarDescription: "Morrow, a one-eyed raven",
  ageYears: 67,
  publicChangesOfMagic: [
    "Eyes glow beneath moonlight",
    "Leaves frost on glass",
  ],
  importantNotes: "Owes the Mariner a favor",
};

function blankWizardSetupState(): CurrentCampaignState {
  return {
    schemaVersion: 5,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: null },
    configuration: { ageId: null, facilitatorPlayerId: PLR },
    players: [{ playerId: PLR, name: "Alice" }],
    wizards: [{
      wizardId: WIZ,
      name: "Valdris",
      portrayedByPlayerId: PLR,
      character: { ...BLANK_WIZARD_CHARACTER },
      homeIsleId: null,
      sanctumPlaceId: null,
      mortalityState: "not_deceased",
    }],
    pactSeats: {
      ...emptyPactSeats(),
      necromancer: { status: "present", wizardId: WIZ, watcherPlayerId: null },
    },
    pactFragmentOperationalState: EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
    lifecycle: {
      kind: "setup",
      orrery: { saturn: asCentidegreePosition(500), jupiter: null, mars: null, venus: null, mercury: null },
    },
    wizardmootHistory: [],
    world: { denizens: [], isles: [], places: [], companionRelationships: [], campaignPowerfulDenizenTaxonomies: [], treasures: [] },
    hierophant: { selectedFlameLawIds: [], campaignClasses: [], campaignDoctrines: [], temples: [], supplicants: [], prophets: [], cults: [], holidayTempleIds: [] }, mariner: { shipPlaceId: null, selectedLawOfSeaIds: [], boardIsles: [], routes: [], seaRegions: [], beasts: [] }, necromancer: { gates: [], pathSpaces: [], steps: [], souls: [], foes: [], allies: [], ghoulCallers: [], selectedLaws: [], depth: null, wizardTraversals: [] },
    faustian: EMPTY_FAUSTIAN_STATE,
    sage: EMPTY_SAGE_STATE,
  } as CurrentCampaignState;
}

function editedWizardSetupState(): CurrentCampaignState {
  const prior = blankWizardSetupState();
  const patch = {
    elements: EDITED_CHARACTER.elements,
    pactFragmentPersonalForm: EDITED_CHARACTER.pactFragmentPersonalForm,
    familiarDescription: EDITED_CHARACTER.familiarDescription,
    ageYears: EDITED_CHARACTER.ageYears,
    publicChangesOfMagic: [...EDITED_CHARACTER.publicChangesOfMagic],
    importantNotes: EDITED_CHARACTER.importantNotes,
  };
  const result = applyUpdateWizardCharacter(prior, WIZ, patch);
  return result.nextState;
}

function assertCharacterFields(actual: WizardCharacterData) {
  expect(actual.elements).toEqual({ air: -1, fire: 4, earth: 2, water: 3 });
  expect(actual.elements!.air).toBe(-1);
  expect(actual.pactFragmentPersonalForm).toBe("A black iron lantern");
  expect(actual.familiarDescription).toBe("Morrow, a one-eyed raven");
  expect(actual.ageYears).toBe(67);
  expect(actual.publicChangesOfMagic).toEqual([
    "Eyes glow beneath moonlight",
    "Leaves frost on glass",
  ]);
  expect(actual.importantNotes).toBe("Owes the Mariner a favor");
}

// ============================================================
// 2. Undo / Redo
// ============================================================

describe("V4 wizard character: undo / redo", () => {
  const priorState = blankWizardSetupState();
  const editedState = editedWizardSetupState();

  function makeControl(undoStack: number[], redoStack: number[]): CampaignHistoryControlV1 {
    return {
      historyControlVersion: 1,
      campaignId: CMP_ID,
      undoStack,
      redoStack,
    };
  }

  it("undo from edited restores blank character", () => {
    const control = makeControl([0, 1], []);
    const result = deriveUndoTransition(
      {
        control,
        campaignRevision: 2,
        campaignState: editedState,
        targetSnapshotState: priorState,
        currentLogicalSnapshotState: editedState,
        targetRevisionCommandType: null,
      },
      CMP_ID,
    );

    const wizard = result.nextState.wizards[0];
    expect(wizard.character.elements).toBeNull();
    expect(wizard.character.pactFragmentPersonalForm).toBeNull();
    expect(wizard.character.familiarDescription).toBeNull();
    expect(wizard.character.ageYears).toBeNull();
    expect(wizard.character.publicChangesOfMagic).toEqual([]);
    expect(wizard.character.importantNotes).toBeNull();
    expect(statesDeepEqual(result.nextState, priorState)).toBe(true);
  });

  it("redo from blank restores edited character", () => {
    const control = makeControl([0], [1]);
    const result = deriveRedoTransition(
      {
        control,
        campaignRevision: 3,
        campaignState: priorState,
        targetSnapshotState: editedState,
        currentLogicalSnapshotState: priorState,
        targetRevisionCommandType: "update_wizard_character",
      },
      CMP_ID,
    );

    assertCharacterFields(result.nextState.wizards[0].character);
    expect(statesDeepEqual(result.nextState, editedState)).toBe(true);
  });

  it("statesDeepEqual confirms whole-state equality after redo", () => {
    const control = makeControl([0], [1]);
    const redo = deriveRedoTransition(
      {
        control,
        campaignRevision: 3,
        campaignState: priorState,
        targetSnapshotState: editedState,
        currentLogicalSnapshotState: priorState,
        targetRevisionCommandType: "update_wizard_character",
      },
      CMP_ID,
    );
    expect(statesDeepEqual(redo.nextState, editedState)).toBe(true);
    expect(statesDeepEqual(redo.nextState, priorState)).toBe(false);
  });
});

// ============================================================
// 3. Checkpoint / Restore verification
// ============================================================

describe("V4 wizard character: checkpoint verification", () => {
  const editedState = editedWizardSetupState();

  it("checkpoint with edited V4 character is valid", () => {
    const checkpoint = {
      checkpointVersion: CURRENT_CHECKPOINT_VERSION,
      checkpointId: "chk_00000000-0000-0000-0000-000000000001",
      campaignId: CMP_ID,
      label: "After character edit",
      sourceRevision: 1,
      createdAtMs: 1000,
    };
    const errors = verifyCheckpoint({
      checkpoint,
      campaignId: CMP_ID,
      campaignRevision: 2,
      snapshotExists: true,
      snapshotState: editedState as any,
      revisionCommandType: "update_wizard_character",
    });
    expect(errors).toEqual([]);
  });

  it("checkpoint restore with matching edited character is accepted", () => {
    const errors = verifyCheckpointRestoreRevision({
      campaignRevision: 3,
      commandFingerprint: "checkpoint_restore:v1:checkpoint=chk_00000000-0000-0000-0000-000000000001:expectedRevision=2",
      eventType: "checkpoint_restored",
      eventVersion: 1,
      eventCheckpointId: "chk_00000000-0000-0000-0000-000000000001",
      eventSourceRevision: 1,
      eventLabelAtRestore: "After character edit",
      sourceSnapshotExists: true,
      sourceSnapshotState: editedState as any,
      resultSnapshotExists: true,
      resultSnapshotState: editedState as any,
      sourceRevisionCommandType: "update_wizard_character",
    });
    expect(errors).toEqual([]);
  });

  it("tampered character field in restore is detected as mismatch", () => {
    const tampered = JSON.parse(JSON.stringify(editedState));
    tampered.wizards[0].character.importantNotes = "Changed note";

    const errors = verifyCheckpointRestoreRevision({
      campaignRevision: 3,
      commandFingerprint: "checkpoint_restore:v1:checkpoint=chk_00000000-0000-0000-0000-000000000001:expectedRevision=2",
      eventType: "checkpoint_restored",
      eventVersion: 1,
      eventCheckpointId: "chk_00000000-0000-0000-0000-000000000001",
      eventSourceRevision: 1,
      eventLabelAtRestore: "After character edit",
      sourceSnapshotExists: true,
      sourceSnapshotState: editedState as any,
      resultSnapshotExists: true,
      resultSnapshotState: tampered as any,
      sourceRevisionCommandType: "update_wizard_character",
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("does not match"))).toBe(true);
  });
});

// ============================================================
// 4. Portable backup roundtrip
// ============================================================

describe("V4 wizard character: backup roundtrip", () => {
  const editedState = editedWizardSetupState();

  it("backup build + validate roundtrip preserves character exactly", async () => {
    const source = {
      sourceCampaignId: CMP_ID,
      sourceCampaignRevision: 1,
      sourceLogicalRevision: 1,
      state: editedState,
    };
    const backup = await buildExportBackup(source, Date.now());

    expect(backup.formatType).toBe(BACKUP_FORMAT_TYPE);
    expect(backup.backupFormatVersion).toBe(CURRENT_BACKUP_FORMAT_VERSION);

    const rawJson = JSON.stringify(backup);
    const validated = await fullyValidateBackup(rawJson, null);

    expect("backup" in validated).toBe(true);
    if (!("backup" in validated)) return;

    expect(statesDeepEqual(validated.backup.state, editedState)).toBe(true);
    assertCharacterFields(validated.backup.state.wizards[0].character);
  });

  it("backup envelope version is CURRENT_BACKUP_FORMAT_VERSION (1)", async () => {
    const source = {
      sourceCampaignId: CMP_ID,
      sourceCampaignRevision: 1,
      sourceLogicalRevision: 1,
      state: editedState,
    };
    const backup = await buildExportBackup(source, Date.now());
    expect(backup.backupFormatVersion).toBe(1);
  });
});

// ============================================================
// 5. V3 rejection at recovery boundary
// ============================================================

describe("V4 wizard character: V3 state rejection", () => {
  it("validateBackupState rejects schemaVersion 3", () => {
    const v3State = {
      schemaVersion: 3,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: null },
      configuration: { ageId: null, facilitatorPlayerId: null },
      players: [],
      wizards: [],
      pactSeats: {
        necromancer: EMPTY_SEAT,
        hierophant: EMPTY_SEAT,
        warlock: EMPTY_SEAT,
        mariner: EMPTY_SEAT,
        faustian: EMPTY_SEAT,
        sage: EMPTY_SEAT,
        sorcerer: EMPTY_SEAT,
      },
      lifecycle: {
        kind: "setup",
        orrery: { saturn: 500, jupiter: null, mars: null, venus: null, mercury: null },
      },
      wizardmootHistory: [],
    };

    const error = validateBackupState(v3State);
    expect(error).not.toBeNull();
  });

  it("fullyValidateBackup rejects a backup with schemaVersion 3 state", async () => {
    const v3State = {
      schemaVersion: 3,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: null },
      configuration: { ageId: null, facilitatorPlayerId: null },
      players: [],
      wizards: [],
      pactSeats: {
        necromancer: EMPTY_SEAT,
        hierophant: EMPTY_SEAT,
        warlock: EMPTY_SEAT,
        mariner: EMPTY_SEAT,
        faustian: EMPTY_SEAT,
        sage: EMPTY_SEAT,
        sorcerer: EMPTY_SEAT,
      },
      lifecycle: {
        kind: "setup",
        orrery: { saturn: 500, jupiter: null, mars: null, venus: null, mercury: null },
      },
      wizardmootHistory: [],
    };

    const source = {
      sourceCampaignId: CMP_ID,
      sourceCampaignRevision: 1,
      sourceLogicalRevision: 1,
      state: v3State as any,
    };
    const backup = await buildExportBackup(source, Date.now());
    const rawJson = JSON.stringify(backup);
    const result = await fullyValidateBackup(rawJson, null);
    expect("error" in result).toBe(true);
  });
});

// ============================================================
// 6. State equality
// ============================================================

describe("V4 wizard character: statesDeepEqual", () => {
  it("detects differing importantNotes", () => {
    const a = editedWizardSetupState();
    const b = JSON.parse(JSON.stringify(a)) as CurrentCampaignState;
    (b.wizards[0] as any).character.importantNotes = "Different note";
    expect(statesDeepEqual(a, b)).toBe(false);
  });

  it("detects differing elements (negative value)", () => {
    const a = editedWizardSetupState();
    const b = JSON.parse(JSON.stringify(a)) as CurrentCampaignState;
    (b.wizards[0] as any).character.elements.air = 0;
    expect(statesDeepEqual(a, b)).toBe(false);
  });

  it("detects differing publicChangesOfMagic", () => {
    const a = editedWizardSetupState();
    const b = JSON.parse(JSON.stringify(a)) as CurrentCampaignState;
    (b.wizards[0] as any).character.publicChangesOfMagic = ["Only one entry"];
    expect(statesDeepEqual(a, b)).toBe(false);
  });

  it("identical edited states are equal", () => {
    const a = editedWizardSetupState();
    const b = editedWizardSetupState();
    expect(statesDeepEqual(a, b)).toBe(true);
  });
});

// ============================================================
// 7. Verifier (pure record-level)
// ============================================================

describe("V4 wizard character: pure verifier", () => {
  const priorState = blankWizardSetupState();
  const editedState = editedWizardSetupState();

  function makeMinimalRecords(finalState: CurrentCampaignState) {
    const revisions: RevisionRecord[] = [
      { campaignRevision: 1, commandType: "update_wizard_character", commandFingerprint: "fp:1" },
    ];
    const events: EventRecord[] = [
      {
        campaignRevision: 1,
        eventIndex: 0,
        event: { type: "wizard_character_updated", version: 1, data: {} },
      },
    ];
    const snapshots: SnapshotRecord[] = [
      { campaignRevision: 0, state: priorState as any },
      { campaignRevision: 1, state: finalState as any },
    ];
    const campaignDocuments: CampaignDocument[] = [
      { campaignKey: "default", campaignId: CMP_ID, campaignRevision: 1, state: finalState as any },
    ];
    return { revisions, events, snapshots, campaignDocuments };
  }

  it("valid V4 final snapshot with edited character passes verification", () => {
    const records = makeMinimalRecords(editedState);
    const result = verifyMigrationInvariants({
      campaignRevision: 1,
      ...records,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("tampered snapshot detected: snapshot state diverges from doc state", () => {
    const tampered = JSON.parse(JSON.stringify(editedState));
    tampered.wizards[0].character.ageYears = 99;

    const records = makeMinimalRecords(editedState);
    // Tamper the snapshot at revision 1, keeping the doc correct
    records.snapshots[1] = { campaignRevision: 1, state: tampered as any };

    // The structural verifier does not compare doc state vs snapshot state,
    // so it still passes structurally. But statesDeepEqual detects the diff.
    const docState = records.campaignDocuments[0].state;
    const snapState = records.snapshots[1].state;
    expect(statesDeepEqual(docState, snapState)).toBe(false);
  });
});
