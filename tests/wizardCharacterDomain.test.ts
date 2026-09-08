import { describe, it, expect } from "vitest";
import {
  initialCampaignState,
  applyAddPlayer,
  applyCreateWizard,
  applyUpdateWizardCharacter,
  BLANK_WIZARD_CHARACTER,
} from "../shared/domain";
import type {
  CurrentCampaignState,
  WizardCharacterData,
  WizardCharacterUpdatedEventV2,
} from "../shared/domain";
import type { PlayerId, WizardId } from "../shared/domain/ids";
import { PACT_SEAT_IDS } from "../shared/domain/pact-seats";
import type { PactSeatId } from "../shared/domain/pact-seats";
import { normalizeWizardCharacterPatch } from "../shared/domain";

const P1 = "plr_00000000-0000-0000-0000-000000000001" as PlayerId;
const P2 = "plr_00000000-0000-0000-0000-000000000002" as PlayerId;
const W1 = "wiz_00000000-0000-0000-0000-000000000001" as WizardId;
const W2 = "wiz_00000000-0000-0000-0000-000000000002" as WizardId;

function setupWithWizard(): CurrentCampaignState {
  let state = initialCampaignState();
  state = applyAddPlayer(state, P1, "Alice").nextState;
  state = applyCreateWizard(state, W1, "Thalion", P1, PACT_SEAT_IDS[0] as PactSeatId).nextState;
  return state;
}

function setupWithTwoWizards(): CurrentCampaignState {
  let state = initialCampaignState();
  state = applyAddPlayer(state, P1, "Alice").nextState;
  state = applyAddPlayer(state, P2, "Bob").nextState;
  state = applyCreateWizard(state, W1, "Thalion", P1, PACT_SEAT_IDS[0] as PactSeatId).nextState;
  state = applyCreateWizard(state, W2, "Nimue", P2, PACT_SEAT_IDS[1] as PactSeatId).nextState;
  return state;
}

function wizardCharacter(state: CurrentCampaignState, wizardId: WizardId): WizardCharacterData {
  const w = state.wizards.find((w) => w.wizardId === wizardId);
  if (!w) throw new Error(`Wizard not found: ${wizardId}`);
  return w.character;
}

describe("applyUpdateWizardCharacter", () => {
  it("updating one field preserves all omitted fields", () => {
    const state = setupWithWizard();
    const { nextState } = applyUpdateWizardCharacter(state, W1, { ageYears: 150 });
    const char = wizardCharacter(nextState, W1);
    expect(char.ageYears).toBe(150);
    expect(char.elements).toBeNull();
    expect(char.pactFragmentPersonalForm).toBeNull();
    expect(char.familiarDescription).toBeNull();
    expect(char.publicChangesOfMagic).toEqual([]);
    expect(char.importantNotes).toBeNull();
  });

  it("updating multiple fields is atomic", () => {
    const state = setupWithWizard();
    const { nextState } = applyUpdateWizardCharacter(state, W1, {
      ageYears: 200,
      elements: { air: 3, fire: 2, earth: 1, water: 2 },
      pactFragmentPersonalForm: "A silver stag",
    });
    const char = wizardCharacter(nextState, W1);
    expect(char.ageYears).toBe(200);
    expect(char.elements).toEqual({ air: 3, fire: 2, earth: 1, water: 2 });
    expect(char.pactFragmentPersonalForm).toBe("A silver stag");
    expect(char.familiarDescription).toBeNull();
  });

  it("null clears nullable fields", () => {
    let state = setupWithWizard();
    state = applyUpdateWizardCharacter(state, W1, {
      ageYears: 150,
      pactFragmentPersonalForm: "Stag",
      familiarDescription: "Owl",
      importantNotes: "Note",
      elements: { air: 2, fire: 2, earth: 2, water: 2 },
    }).nextState;
    const { nextState } = applyUpdateWizardCharacter(state, W1, {
      ageYears: null,
      pactFragmentPersonalForm: null,
      elements: null,
    });
    const char = wizardCharacter(nextState, W1);
    expect(char.ageYears).toBeNull();
    expect(char.pactFragmentPersonalForm).toBeNull();
    expect(char.elements).toBeNull();
    expect(char.familiarDescription).toBe("Owl");
    expect(char.importantNotes).toBe("Note");
  });

  it("[] clears publicChangesOfMagic", () => {
    let state = setupWithWizard();
    state = applyUpdateWizardCharacter(state, W1, {
      publicChangesOfMagic: ["Eyes glow", "Leaves wilt"],
    }).nextState;
    expect(wizardCharacter(state, W1).publicChangesOfMagic).toEqual(["Eyes glow", "Leaves wilt"]);
    const { nextState } = applyUpdateWizardCharacter(state, W1, {
      publicChangesOfMagic: [],
    });
    expect(wizardCharacter(nextState, W1).publicChangesOfMagic).toEqual([]);
  });

  it("negative Element values persist", () => {
    const state = setupWithWizard();
    const { nextState } = applyUpdateWizardCharacter(state, W1, {
      elements: { air: -5, fire: 10, earth: -3, water: 6 },
    });
    expect(wizardCharacter(nextState, W1).elements).toEqual({
      air: -5, fire: 10, earth: -3, water: 6,
    });
  });

  it("non-8 Element totals persist", () => {
    const state = setupWithWizard();
    const { nextState } = applyUpdateWizardCharacter(state, W1, {
      elements: { air: 1, fire: 1, earth: 1, water: 1 },
    });
    expect(wizardCharacter(nextState, W1).elements).toEqual({
      air: 1, fire: 1, earth: 1, water: 1,
    });
  });

  it("scalar strings trim", () => {
    const state = setupWithWizard();
    const { nextState } = applyUpdateWizardCharacter(state, W1, {
      pactFragmentPersonalForm: "  Silver stag  ",
      familiarDescription: "  Owl  ",
      importantNotes: "  Lost hand  ",
    });
    const char = wizardCharacter(nextState, W1);
    expect(char.pactFragmentPersonalForm).toBe("Silver stag");
    expect(char.familiarDescription).toBe("Owl");
    expect(char.importantNotes).toBe("Lost hand");
  });

  it("whitespace-only scalar strings normalize to null", () => {
    const state = setupWithWizard();
    const { nextState } = applyUpdateWizardCharacter(state, W1, {
      pactFragmentPersonalForm: "   ",
      familiarDescription: "\t\n",
      importantNotes: "  ",
    });
    const char = wizardCharacter(nextState, W1);
    expect(char.pactFragmentPersonalForm).toBeNull();
    expect(char.familiarDescription).toBeNull();
    expect(char.importantNotes).toBeNull();
  });

  it("publicChangesOfMagic entries trim", () => {
    const state = setupWithWizard();
    const { nextState } = applyUpdateWizardCharacter(state, W1, {
      publicChangesOfMagic: ["  Eyes glow  ", "  Leaves wilt  "],
    });
    expect(wizardCharacter(nextState, W1).publicChangesOfMagic).toEqual([
      "Eyes glow", "Leaves wilt",
    ]);
  });

  it("order and duplicates in publicChangesOfMagic are preserved", () => {
    const state = setupWithWizard();
    const { nextState } = applyUpdateWizardCharacter(state, W1, {
      publicChangesOfMagic: ["B", "A", "B"],
    });
    expect(wizardCharacter(nextState, W1).publicChangesOfMagic).toEqual(["B", "A", "B"]);
  });

  it("an empty Changes-of-Magic entry rejects", () => {
    const state = setupWithWizard();
    expect(() =>
      applyUpdateWizardCharacter(state, W1, {
        publicChangesOfMagic: ["Valid", "  "],
      }),
    ).toThrow(/empty after trimming/);
  });

  it("fractional Elements reject", () => {
    const state = setupWithWizard();
    expect(() =>
      applyUpdateWizardCharacter(state, W1, {
        elements: { air: 2.5, fire: 2, earth: 2, water: 1.5 },
      }),
    ).toThrow(/safe integer/);
  });

  it("unsafe integer Elements reject", () => {
    const state = setupWithWizard();
    expect(() =>
      applyUpdateWizardCharacter(state, W1, {
        elements: { air: Number.MAX_SAFE_INTEGER + 1, fire: 2, earth: 2, water: 2 },
      }),
    ).toThrow(/safe integer/);
  });

  it("invalid age rejects", () => {
    const state = setupWithWizard();
    expect(() => applyUpdateWizardCharacter(state, W1, { ageYears: -5 })).toThrow(/non-negative/);
    expect(() => applyUpdateWizardCharacter(state, W1, { ageYears: 3.5 })).toThrow(/non-negative/);
  });

  it("empty patch rejects", () => {
    const state = setupWithWizard();
    expect(() => applyUpdateWizardCharacter(state, W1, {})).toThrow(/empty/);
  });

  it("unknown Wizard rejects", () => {
    const state = setupWithWizard();
    const unknownId = "wiz_00000000-0000-0000-0000-000000000099" as WizardId;
    expect(() =>
      applyUpdateWizardCharacter(state, unknownId, { ageYears: 10 }),
    ).toThrow(/not found/);
  });

  it("produces exactly one wizard_character_updated v2 event", () => {
    const state = setupWithWizard();
    const { events } = applyUpdateWizardCharacter(state, W1, { ageYears: 100 });
    expect(events).toHaveLength(1);
    const evt = events[0] as WizardCharacterUpdatedEventV2;
    expect(evt.type).toBe("wizard_character_updated");
    expect(evt.version).toBe(2);
  });

  it("event previousCharacter and newCharacter are correct", () => {
    const state = setupWithWizard();
    const { events } = applyUpdateWizardCharacter(state, W1, {
      ageYears: 100,
      pactFragmentPersonalForm: "Stag",
    });
    const evt = events[0] as WizardCharacterUpdatedEventV2;
    expect(evt.data.wizardId).toBe(W1);
    expect(evt.data.previousCharacter).toEqual(BLANK_WIZARD_CHARACTER);
    expect(evt.data.newCharacter.ageYears).toBe(100);
    expect(evt.data.newCharacter.pactFragmentPersonalForm).toBe("Stag");
    expect(evt.data.newCharacter.elements).toBeNull();
  });

  it("unrelated Wizards are unchanged", () => {
    const state = setupWithTwoWizards();
    const before = wizardCharacter(state, W2);
    const { nextState } = applyUpdateWizardCharacter(state, W1, { ageYears: 999 });
    const after = wizardCharacter(nextState, W2);
    expect(after).toEqual(before);
  });

  it("unrelated CampaignState fields are unchanged", () => {
    const state = setupWithWizard();
    const { nextState } = applyUpdateWizardCharacter(state, W1, { ageYears: 50 });
    expect(nextState.players).toEqual(state.players);
    expect(nextState.pactSeats).toEqual(state.pactSeats);
    expect(nextState.configuration).toEqual(state.configuration);
    expect(nextState.calendar).toEqual(state.calendar);
    expect(nextState.lifecycle).toEqual(state.lifecycle);
    expect(nextState.schemaVersion).toBe(state.schemaVersion);
  });
});

describe("normalizeWizardCharacterPatch edge cases", () => {
  it("incomplete elements (missing a key) reject", () => {
    expect(() =>
      normalizeWizardCharacterPatch({
        elements: { air: 2, fire: 2, earth: 2 } as any,
      }),
    ).toThrow(/safe integer/);
  });

  it("{ ageYears: 50, elements: undefined } omits elements, preserving existing", () => {
    let state = setupWithWizard();
    state = applyUpdateWizardCharacter(state, W1, {
      elements: { air: 3, fire: 2, earth: 2, water: 1 },
    }).nextState;
    const { nextState } = applyUpdateWizardCharacter(state, W1, {
      ageYears: 50,
      elements: undefined,
    } as any);
    const char = wizardCharacter(nextState, W1);
    expect(char.ageYears).toBe(50);
    expect(char.elements).toEqual({ air: 3, fire: 2, earth: 2, water: 1 });
  });

  it("explicit undefined for each scalar optional field is omitted", () => {
    const state = setupWithWizard();
    const { nextState } = applyUpdateWizardCharacter(state, W1, {
      ageYears: 50,
      pactFragmentPersonalForm: undefined,
      familiarDescription: undefined,
      importantNotes: undefined,
    } as any);
    const char = wizardCharacter(nextState, W1);
    expect(char.ageYears).toBe(50);
    expect(char.pactFragmentPersonalForm).toBeNull();
    expect(char.familiarDescription).toBeNull();
    expect(char.importantNotes).toBeNull();
  });

  it("publicChangesOfMagic: undefined is omitted rather than rejected", () => {
    let state = setupWithWizard();
    state = applyUpdateWizardCharacter(state, W1, {
      publicChangesOfMagic: ["Eyes glow"],
    }).nextState;
    const { nextState } = applyUpdateWizardCharacter(state, W1, {
      ageYears: 30,
      publicChangesOfMagic: undefined,
    } as any);
    expect(wizardCharacter(nextState, W1).publicChangesOfMagic).toEqual(["Eyes glow"]);
  });

  it("a patch whose supplied properties are all undefined rejects as empty", () => {
    const state = setupWithWizard();
    expect(() =>
      applyUpdateWizardCharacter(state, W1, {
        elements: undefined,
        ageYears: undefined,
        pactFragmentPersonalForm: undefined,
      } as any),
    ).toThrow(/empty/);
  });
});
