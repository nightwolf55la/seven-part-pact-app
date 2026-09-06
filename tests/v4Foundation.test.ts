import { describe, it, expect } from "vitest";
import {
  CURRENT_STATE_SCHEMA_VERSION,
  initialCampaignState,
  validateCampaignState,
  validateAnyCampaignState,
  SUPPORTED_STATE_SCHEMA_VERSIONS,
  applyAddPlayer,
  applyCreateWizard,
} from "../shared/domain";
import type { CurrentCampaignState } from "../shared/domain";
import type { PlayerId, WizardId } from "../shared/domain/ids";
import type { PactSeatId } from "../shared/domain/pact-seats";
import { PACT_SEAT_IDS } from "../shared/domain/pact-seats";

const TEST_PLAYER_ID = "plr_00000000-0000-0000-0000-000000000001" as PlayerId;
const TEST_WIZARD_ID = "wiz_00000000-0000-0000-0000-000000000001" as WizardId;

function makeStateWithWizard(overrides?: Partial<{
  elements: unknown;
  pactFragmentPersonalForm: unknown;
  familiarDescription: unknown;
  ageYears: unknown;
  publicChangesOfMagic: unknown;
  importantNotes: unknown;
}>): CurrentCampaignState {
  const base = initialCampaignState();
  const { nextState: withPlayer } = applyAddPlayer(base, TEST_PLAYER_ID, "Alice");
  const { nextState } = applyCreateWizard(
    withPlayer,
    TEST_WIZARD_ID,
    "Thalion",
    TEST_PLAYER_ID,
    PACT_SEAT_IDS[0] as PactSeatId,
  );
  if (!overrides) return nextState;

  const wizard = nextState.wizards[0];
  const character = { ...(wizard as any).character, ...overrides };
  const modifiedWizard = { ...wizard, character };
  return {
    ...nextState,
    wizards: [modifiedWizard],
  } as unknown as CurrentCampaignState;
}

describe("V4 Foundation: schema version constants", () => {
  it("CURRENT_STATE_SCHEMA_VERSION === 4", () => {
    expect(CURRENT_STATE_SCHEMA_VERSION).toBe(4);
  });

  it("SUPPORTED_STATE_SCHEMA_VERSIONS is [4]", () => {
    expect(SUPPORTED_STATE_SCHEMA_VERSIONS).toEqual([4]);
  });
});

describe("V4 Foundation: initial state", () => {
  it("fresh state has schemaVersion 4", () => {
    const state = initialCampaignState();
    expect(state.schemaVersion).toBe(4);
  });

  it("fresh state still has no wizards", () => {
    const state = initialCampaignState();
    expect(state.wizards).toEqual([]);
  });

  it("fresh state validates successfully", () => {
    const state = initialCampaignState();
    expect(() => validateCampaignState(state)).not.toThrow();
  });
});

describe("V4 Foundation: createWizard blank character", () => {
  it("creates exact blank character object", () => {
    const state = makeStateWithWizard();
    const wizard = state.wizards[0];
    expect((wizard as any).character).toEqual({
      elements: null,
      pactFragmentPersonalForm: null,
      familiarDescription: null,
      ageYears: null,
      publicChangesOfMagic: [],
      importantNotes: null,
    });
  });

  it("wizard retains standard fields", () => {
    const state = makeStateWithWizard();
    const wizard = state.wizards[0];
    expect(wizard.wizardId).toBe(TEST_WIZARD_ID);
    expect(wizard.name).toBe("Thalion");
    expect(wizard.portrayedByPlayerId).toBe(TEST_PLAYER_ID);
  });

  it("state with blank-character wizard validates", () => {
    const state = makeStateWithWizard();
    expect(() => validateCampaignState(state)).not.toThrow();
  });
});

describe("V4 Foundation: element validation", () => {
  it("null elements are valid", () => {
    const state = makeStateWithWizard({ elements: null });
    expect(() => validateCampaignState(state)).not.toThrow();
  });

  it("all four elements required when non-null", () => {
    const state = makeStateWithWizard({ elements: { air: 2, fire: 2, earth: 2 } });
    expect(() => validateCampaignState(state)).toThrow();
  });

  it("negative element values are valid", () => {
    const state = makeStateWithWizard({
      elements: { air: -3, fire: 5, earth: 2, water: 4 },
    });
    expect(() => validateCampaignState(state)).not.toThrow();
  });

  it("non-8 element totals are valid", () => {
    const state = makeStateWithWizard({
      elements: { air: 1, fire: 1, earth: 1, water: 1 },
    });
    expect(() => validateCampaignState(state)).not.toThrow();
  });

  it("fractional element values reject", () => {
    const state = makeStateWithWizard({
      elements: { air: 2.5, fire: 2, earth: 2, water: 1.5 },
    });
    expect(() => validateCampaignState(state)).toThrow();
  });

  it("unsafe integer element values reject", () => {
    const state = makeStateWithWizard({
      elements: { air: Number.MAX_SAFE_INTEGER + 1, fire: 2, earth: 2, water: 2 },
    });
    expect(() => validateCampaignState(state)).toThrow();
  });
});

describe("V4 Foundation: age validation", () => {
  it("null ageYears is valid", () => {
    const state = makeStateWithWizard({ ageYears: null });
    expect(() => validateCampaignState(state)).not.toThrow();
  });

  it("non-negative safe integer ageYears is valid", () => {
    const state = makeStateWithWizard({ ageYears: 150 });
    expect(() => validateCampaignState(state)).not.toThrow();
  });

  it("zero ageYears is valid", () => {
    const state = makeStateWithWizard({ ageYears: 0 });
    expect(() => validateCampaignState(state)).not.toThrow();
  });

  it("negative ageYears rejects", () => {
    const state = makeStateWithWizard({ ageYears: -5 });
    expect(() => validateCampaignState(state)).toThrow();
  });

  it("fractional ageYears rejects", () => {
    const state = makeStateWithWizard({ ageYears: 45.5 });
    expect(() => validateCampaignState(state)).toThrow();
  });

  it("unsafe integer ageYears rejects", () => {
    const state = makeStateWithWizard({ ageYears: Number.MAX_SAFE_INTEGER + 1 });
    expect(() => validateCampaignState(state)).toThrow();
  });
});

describe("V4 Foundation: text and array field validation", () => {
  it("null text fields validate", () => {
    const state = makeStateWithWizard({
      pactFragmentPersonalForm: null,
      familiarDescription: null,
      importantNotes: null,
    });
    expect(() => validateCampaignState(state)).not.toThrow();
  });

  it("string text fields validate", () => {
    const state = makeStateWithWizard({
      pactFragmentPersonalForm: "A silver stag",
      familiarDescription: "An owl with glowing eyes",
      importantNotes: "Lost his left hand in the war",
    });
    expect(() => validateCampaignState(state)).not.toThrow();
  });

  it("publicChangesOfMagic is an array of strings", () => {
    const state = makeStateWithWizard({
      publicChangesOfMagic: ["Eyes glow blue", "Leaves wilt nearby"],
    });
    expect(() => validateCampaignState(state)).not.toThrow();
  });

  it("publicChangesOfMagic rejects non-array", () => {
    const state = makeStateWithWizard({ publicChangesOfMagic: "not an array" });
    expect(() => validateCampaignState(state)).toThrow();
  });

  it("publicChangesOfMagic rejects non-string entries", () => {
    const state = makeStateWithWizard({ publicChangesOfMagic: ["valid", 42] });
    expect(() => validateCampaignState(state)).toThrow();
  });
});

describe("V4 Foundation: character field is required", () => {
  it("wizard without character field rejects", () => {
    const base = initialCampaignState();
    const { nextState: withPlayer } = applyAddPlayer(base, TEST_PLAYER_ID, "Bob");
    const raw = {
      ...withPlayer,
      wizards: [{
        wizardId: TEST_WIZARD_ID,
        name: "NoCharWiz",
        portrayedByPlayerId: TEST_PLAYER_ID,
      }],
    };
    expect(() => validateCampaignState(raw)).toThrow();
  });
});

describe("V4 Foundation: V3 runtime rejection", () => {
  it("V3 artifact rejects in validateCampaignState", () => {
    const v3 = { schemaVersion: 3 };
    expect(() => validateCampaignState(v3)).toThrow(/schemaVersion/i);
  });

  it("V3 artifact rejects in validateAnyCampaignState", () => {
    const v3 = { schemaVersion: 3 };
    expect(() => validateAnyCampaignState(v3)).toThrow();
  });

  it("V1 artifact rejects", () => {
    expect(() => validateAnyCampaignState({ schemaVersion: 1 })).toThrow();
  });

  it("V2 artifact rejects", () => {
    expect(() => validateAnyCampaignState({ schemaVersion: 2 })).toThrow();
  });

  it("V4 is the sole supported runtime version", () => {
    expect(SUPPORTED_STATE_SCHEMA_VERSIONS).toHaveLength(1);
    expect(SUPPORTED_STATE_SCHEMA_VERSIONS[0]).toBe(4);
  });
});

describe("V4 Foundation: loadHistoricalState / migrateToCurrentVersion", () => {
  it("V3 rejects in migrateToCurrentVersion", async () => {
    const { migrateToCurrentVersion } = await import("../shared/domain/state-migration");
    expect(() => migrateToCurrentVersion({ schemaVersion: 3 } as any)).toThrow();
  });

  it("V4 passes through migrateToCurrentVersion", async () => {
    const { migrateToCurrentVersion } = await import("../shared/domain/state-migration");
    const state = initialCampaignState();
    const result = migrateToCurrentVersion(state);
    expect(result.schemaVersion).toBe(4);
  });
});
