import { describe, expect, it } from "vitest";
import type { CampaignStateV5, DenizenId, IsleId, PlaceId, PlayerId, WizardId } from "../shared/domain";
import {
  BLANK_WIZARD_CHARACTER_V5,
  EMPTY_SHARED_WORLD_STATE,
  applyCreateDenizenV5Candidate,
  applyCreatePlaceV5Candidate,
  applySetWizardHomeIsleV5Candidate,
  applySetWizardSanctumV5Candidate,
  readSorcererEstablishmentReadiness,
} from "../shared/domain";
import { makeTestCampaignStateV5 } from "./test-state";

const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const ISL_SPYR = "isl_00000000-0000-0000-0000-0000000000aa" as IsleId;
const PLC_TOWER = "plc_00000000-0000-0000-0000-0000000000aa" as PlaceId;
const PLC_UNIV = "plc_00000000-0000-0000-0000-0000000000ab" as PlaceId;

function denizenId(n: number): DenizenId {
  return `den_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as DenizenId;
}

function seatedUninitialized(overrides?: Partial<CampaignStateV5>): CampaignStateV5 {
  return makeTestCampaignStateV5({
    configuration: { ageId: "awakening", facilitatorPlayerId: PLR_A },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [{
      wizardId: WIZ_A,
      name: "Mira",
      portrayedByPlayerId: PLR_A,
      character: { ...BLANK_WIZARD_CHARACTER_V5 },
      homeIsleId: null,
      sanctumPlaceId: null,
      mortalityState: "not_deceased",
    }],
    pactSeats: {
      ...makeTestCampaignStateV5().pactSeats,
      sorcerer: { status: "present", wizardId: WIZ_A, watcherPlayerId: null },
    },
    ...overrides,
  });
}

describe("readSorcererEstablishmentReadiness", () => {
  it("lists exact missing prerequisites for a seated uninitialized Sorcerer", () => {
    const readiness = readSorcererEstablishmentReadiness(seatedUninitialized({
      configuration: { ageId: null, facilitatorPlayerId: PLR_A },
    }));
    expect(readiness.initialized).toBe(false);
    expect(readiness.quietEstablish).toBeNull();
    expect(readiness.missingPrerequisites).toEqual([
      "A campaign Age has not been selected.",
      "Spyrholm has not been realized as a campaign World Isle.",
      "The Sorcerer's Tower (Sanctum) has not been established.",
      "A distinct University Place on Spyrholm is required.",
      "Quiet establishment needs eight individual Denizens for Researchers, Students, the Professor, and the Alchemist.",
    ]);
    expect(readiness.missingPrerequisites.join(" ")).not.toMatch(/wiz_|isl_|plc_|den_/);
  });

  it("offers the existing Quiet establishment path once genuine prerequisites exist", () => {
    let state = seatedUninitialized({
      world: {
        ...EMPTY_SHARED_WORLD_STATE,
        isles: [{ isleId: ISL_SPYR, name: "Spyrholm", description: null }],
      },
    });
    state = applySetWizardHomeIsleV5Candidate(state, WIZ_A, { expected: null, value: ISL_SPYR }).nextState;
    state = applyCreatePlaceV5Candidate(state, {
      placeId: PLC_TOWER,
      name: "The Working Tower",
      description: null,
      placement: { kind: "on_isle", isleId: ISL_SPYR },
    }).nextState;
    state = applyCreatePlaceV5Candidate(state, {
      placeId: PLC_UNIV,
      name: "Spyrholm University",
      description: null,
      placement: { kind: "on_isle", isleId: ISL_SPYR },
    }).nextState;
    state = applySetWizardSanctumV5Candidate(state, WIZ_A, { expected: null, value: PLC_TOWER }).nextState;
    for (let i = 1; i <= 8; i += 1) {
      state = applyCreateDenizenV5Candidate(state, {
        denizenId: denizenId(i),
        name: `Staff ${i}`,
        representation: "individual",
        description: null,
      }).nextState;
    }

    const readiness = readSorcererEstablishmentReadiness(state);
    expect(readiness).toEqual({
      initialized: false,
      missingPrerequisites: [],
      quietEstablish: {
        spyrholmIsleId: ISL_SPYR,
        towerPlaceId: PLC_TOWER,
        universityPlaceId: PLC_UNIV,
        researcherIds: [denizenId(1), denizenId(2), denizenId(3)],
        studentIds: [denizenId(4), denizenId(5), denizenId(6)],
        professorDenizenId: denizenId(7),
        alchemistDenizenId: denizenId(8),
      },
    });
  });
});
