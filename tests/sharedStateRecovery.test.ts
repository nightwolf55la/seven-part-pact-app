import { describe, it, expect } from "vitest";
import type {
  CampaignPowerfulDenizenTaxonomyId,
  CampaignStateV5,
  DenizenId,
  PlaceId,
  PlayerId,
  PowerfulDenizenTruthId,
  TreasureId,
  WizardId,
} from "../shared/domain";
import {
  BLANK_WIZARD_CHARACTER_V5,
  DomainError,
  EMPTY_HIEROPHANT_STATE,
  EMPTY_MARINER_STATE,
  EMPTY_NECROMANCER_STATE,
  EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
  EMPTY_SHARED_WORLD_STATE,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  applyCreateDenizenV5Candidate,
  applyCreatePowerfulDenizenProfile,
  applyCreateTreasure,
  applyCreateWizard,
  applyAddPowerfulDenizenTruth,
  applySetWizardMortalityState,
  applyUpdatePactFragmentOperationalState,
  buildExportBackup,
  deriveRedoTransition,
  deriveUndoTransition,
  checkpointRestoreFingerprint,
  fullyValidateBackup,
  statesDeepEqual,
  validateCampaignState,
  validateCampaignStateV5Candidate,
  validateV5WorldReferenceIntegrity,
  verifyCheckpointRestoreRevision,
  EMPTY_FAUSTIAN_STATE,
} from "../shared/domain";
import type { CampaignHistoryControlV1 } from "../shared/domain";
import { snapshotRecord } from "../convex/persistence";

const CAMPAIGN_ID = "cmp_00000000-0000-0000-0000-000000000001";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const DEN_1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const PLC_1 = "plc_00000000-0000-0000-0000-000000000001" as PlaceId;
const TRS_1 = "trs_00000000-0000-0000-0000-000000000001" as TreasureId;
const TAX_1 = "pdtax_00000000-0000-0000-0000-000000000001" as CampaignPowerfulDenizenTaxonomyId;
const TRU_1 = "pdtru_00000000-0000-0000-0000-000000000001" as PowerfulDenizenTruthId;
const CHK_1 = "chk_00000000-0000-0000-0000-000000000001";

const EMPTY_PACT_SEATS = {
  necromancer: { status: null, wizardId: null, watcherPlayerId: null },
  hierophant: { status: null, wizardId: null, watcherPlayerId: null },
  warlock: { status: null, wizardId: null, watcherPlayerId: null },
  mariner: { status: null, wizardId: null, watcherPlayerId: null },
  faustian: { status: null, wizardId: null, watcherPlayerId: null },
  sage: { status: null, wizardId: null, watcherPlayerId: null },
  sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
} as const;

function baseState(): CampaignStateV5 {
  return {
    schemaVersion: 5,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 0 as CampaignStateV5["calendar"]["monthOrdinal"] },
    configuration: { ageId: null, facilitatorPlayerId: null },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [],
    pactSeats: EMPTY_PACT_SEATS,
    pactFragmentOperationalState: EMPTY_PACT_FRAGMENT_OPERATIONAL_STATE,
    lifecycle: {
      kind: "setup",
      orrery: { saturn: null, jupiter: null, mars: null, venus: null, mercury: null },
    },
    wizardmootHistory: [],
    world: {
      ...EMPTY_SHARED_WORLD_STATE,
      places: [{ placeId: PLC_1, name: "Ash Tower", description: null, placement: { kind: "unspecified" } }],
      campaignPowerfulDenizenTaxonomies: [{ taxonomyId: TAX_1, name: "Tide-Kin", description: null }],
    },
    hierophant: { ...EMPTY_HIEROPHANT_STATE },
    mariner: { ...EMPTY_MARINER_STATE },
    necromancer: { ...EMPTY_NECROMANCER_STATE },
    faustian: { ...EMPTY_FAUSTIAN_STATE },
  };
}

function representativeState(): CampaignStateV5 {
  let state = applyCreateWizard(baseState(), WIZ_A, "Thalion", PLR_A, "necromancer").nextState;
  state = applyCreateDenizenV5Candidate(state, {
    denizenId: DEN_1,
    name: "Mara",
    representation: "individual",
    description: null,
  }).nextState;
  state = applyCreatePowerfulDenizenProfile(state, {
    denizenId: DEN_1,
    taxonomies: [{ kind: "campaign", taxonomyId: TAX_1 }],
    status: { kind: "standard", value: "reliable" },
    goal: "Keep the pact",
  }).nextState;
  state = applyAddPowerfulDenizenTruth(state, {
    denizenId: DEN_1,
    truthId: TRU_1,
    text: "The moon remembers",
  }).nextState;
  state = applyCreateTreasure(state, {
    treasureId: TRS_1,
    name: "Black Chalice",
    description: null,
    condition: "intact",
    custody: { kind: "subject", subject: { kind: "wizard", wizardId: WIZ_A } },
  }).nextState;
  state = applySetWizardMortalityState(state, WIZ_A, {
    expected: "not_deceased",
    value: "deceased",
  }).nextState;
  return applyUpdatePactFragmentOperationalState(
    state,
    "necromancer",
    state.pactFragmentOperationalState.necromancer,
    { condition: "intact", custody: { kind: "wizard", wizardId: WIZ_A } },
  ).nextState;
}

function makeControl(undoStack: number[], redoStack: number[] = []): CampaignHistoryControlV1 {
  return {
    historyControlVersion: 1,
    campaignId: CAMPAIGN_ID,
    undoStack,
    redoStack,
  };
}

function checkpointRestoreInput(
  sourceSnapshotState: CampaignStateV5,
  resultSnapshotState: CampaignStateV5,
) {
  return {
    campaignRevision: 7,
    commandFingerprint: checkpointRestoreFingerprint(CHK_1, 6),
    eventType: "checkpoint_restored",
    eventVersion: 1,
    eventCheckpointId: CHK_1,
    eventSourceRevision: 4,
    eventLabelAtRestore: "After shared state",
    sourceSnapshotExists: true,
    sourceSnapshotState,
    resultSnapshotExists: true,
    resultSnapshotState,
    sourceRevisionCommandType: "set_wizard_mortality_state" as const,
  };
}

describe("M5.2D D1B snapshot / undo / redo / checkpoint / backup / verifier", () => {
  it("snapshotRecord preserves representative shared state in the snapshot payload", () => {
    const state = representativeState();
    const record = snapshotRecord(CAMPAIGN_ID, 6, state);
    expect(record.campaignId).toBe(CAMPAIGN_ID);
    expect(record.campaignRevision).toBe(6);
    expect(statesDeepEqual(record.state, state)).toBe(true);
    expect(record.state.wizards[0].mortalityState).toBe("deceased");
    expect(record.state.world.denizens[0].powerfulProfile?.truths[0].truthId).toBe(TRU_1);
    expect(record.state.world.denizens[0].powerfulProfile?.truths[0].text).toBe("The moon remembers");
    expect(record.state.world.treasures[0].treasureId).toBe(TRS_1);
    expect(record.state.world.treasures[0].condition).toBe("intact");
    expect(record.state.pactFragmentOperationalState.necromancer).toEqual({
      condition: "intact",
      custody: { kind: "wizard", wizardId: WIZ_A },
    });
  });

  it("Undo restores the previous complete state including new structures", () => {
    const prior = representativeState();
    const accepted = applySetWizardMortalityState(prior, WIZ_A, {
      expected: "deceased",
      value: "not_deceased",
    }).nextState;
    const undo = deriveUndoTransition({
      control: makeControl([0, 1]),
      campaignRevision: 1,
      campaignState: accepted,
      targetSnapshotState: prior,
      currentLogicalSnapshotState: accepted,
      targetRevisionCommandType: "set_wizard_mortality_state",
    }, CAMPAIGN_ID);
    expect(statesDeepEqual(undo.nextState, prior)).toBe(true);
    expect(undo.nextState.wizards[0].mortalityState).toBe("deceased");
    expect(undo.nextState.world.denizens[0].powerfulProfile?.truths[0].truthId).toBe(TRU_1);
    expect(undo.nextState.world.treasures[0].treasureId).toBe(TRS_1);
    expect(undo.nextState.pactFragmentOperationalState.necromancer.custody).toEqual({
      kind: "wizard",
      wizardId: WIZ_A,
    });
  });

  it("Redo restores the later complete state", () => {
    const prior = representativeState();
    const accepted = applySetWizardMortalityState(prior, WIZ_A, {
      expected: "deceased",
      value: "not_deceased",
    }).nextState;
    const redo = deriveRedoTransition({
      control: makeControl([0], [1]),
      campaignRevision: 2,
      campaignState: prior,
      targetSnapshotState: accepted,
      currentLogicalSnapshotState: prior,
      targetRevisionCommandType: "set_wizard_mortality_state",
    }, CAMPAIGN_ID);
    expect(statesDeepEqual(redo.nextState, accepted)).toBe(true);
    expect(redo.nextState.wizards[0].mortalityState).toBe("not_deceased");
  });

  it("checkpoint restore revision verifies representative shared state is copied intact", () => {
    const state = representativeState();
    const errors = verifyCheckpointRestoreRevision(checkpointRestoreInput(state, state));
    expect(errors).toEqual([]);
    expect(state.wizards[0].mortalityState).toBe("deceased");
    expect(state.world.denizens[0].powerfulProfile?.truths[0].truthId).toBe(TRU_1);
    expect(state.world.denizens[0].powerfulProfile?.truths[0].text).toBe("The moon remembers");
    expect(state.world.treasures[0].treasureId).toBe(TRS_1);
    expect(state.world.treasures[0].condition).toBe("intact");
    expect(state.pactFragmentOperationalState.necromancer).toEqual({
      condition: "intact",
      custody: { kind: "wizard", wizardId: WIZ_A },
    });
  });

  it("checkpoint restore revision rejects a result snapshot that changed representative shared state", () => {
    const source = representativeState();
    const result = applySetWizardMortalityState(source, WIZ_A, {
      expected: "deceased",
      value: "not_deceased",
    }).nextState;
    const errors = verifyCheckpointRestoreRevision(checkpointRestoreInput(source, result));
    expect(errors.some((error) => error.includes("result snapshot state does not match"))).toBe(true);
  });

  it("portable backup export/import preserves representative V5 state", async () => {
    const state = representativeState();
    const backup = await buildExportBackup({
      sourceCampaignId: CAMPAIGN_ID,
      sourceCampaignRevision: 6,
      sourceLogicalRevision: 6,
      state,
    }, 1_700_000_000_000);
    const result = await fullyValidateBackup(JSON.stringify(backup), state);
    expect("backup" in result).toBe(true);
    if (!("backup" in result)) return;
    expect(statesDeepEqual(result.backup.state, state)).toBe(true);
    expect(result.backup.state.wizards[0].mortalityState).toBe("deceased");
    expect(result.backup.state.world.treasures[0].treasureId).toBe(TRS_1);
  });

  it("campaign verifier accepts coherent new state and rejects dangling references", () => {
    const coherent = representativeState();
    expect(() => validateCampaignState(coherent)).not.toThrow();
    expect(() => validateV5WorldReferenceIntegrity(coherent)).not.toThrow();

    const danglingTreasure = {
      ...coherent,
      world: {
        ...coherent.world,
        treasures: [{
          treasureId: TRS_1,
          name: "Black Chalice",
          description: null,
          condition: "intact" as const,
          custody: {
            kind: "subject" as const,
            subject: { kind: "denizen" as const, denizenId: "den_00000000-0000-0000-0000-000000009999" as DenizenId },
          },
        }],
      },
    };
    expect(() => validateCampaignState(danglingTreasure)).toThrow(DomainError);

    const danglingFragment = {
      ...coherent,
      pactFragmentOperationalState: {
        ...coherent.pactFragmentOperationalState,
        sage: {
          condition: "intact" as const,
          custody: { kind: "wizard" as const, wizardId: "wiz_00000000-0000-0000-0000-000000009999" as WizardId },
        },
      },
    };
    expect(() => validateCampaignState(danglingFragment)).toThrow(DomainError);
  });

  it("pre-M5.2D V5 shapes still fail closed under PRE-ACTIVATION policy", () => {
    const pre = {
      schemaVersion: 5,
      ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
      calendar: { monthOrdinal: 0 },
      configuration: { ageId: null, facilitatorPlayerId: null },
      players: [{ playerId: PLR_A, name: "Alice" }],
      wizards: [{
        wizardId: WIZ_A,
        name: "Wizard A",
        portrayedByPlayerId: PLR_A,
        character: { ...BLANK_WIZARD_CHARACTER_V5 },
        homeIsleId: null,
        sanctumPlaceId: null,
      }],
      pactSeats: EMPTY_PACT_SEATS,
      lifecycle: {
        kind: "setup",
        orrery: { saturn: null, jupiter: null, mars: null, venus: null, mercury: null },
      },
      wizardmootHistory: [],
      world: {
        denizens: [],
        isles: [],
        places: [],
        companionRelationships: [],
      },
      hierophant: { ...EMPTY_HIEROPHANT_STATE },
      mariner: { ...EMPTY_MARINER_STATE },
      necromancer: { ...EMPTY_NECROMANCER_STATE },
    faustian: { ...EMPTY_FAUSTIAN_STATE },
    };
    expect(() => validateCampaignState(pre)).toThrow(DomainError);
    expect(() => validateCampaignStateV5Candidate(pre)).toThrow(DomainError);
  });
});
