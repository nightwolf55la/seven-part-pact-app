import { describe, it, expect, expectTypeOf } from "vitest";
import type {
  DenizenId,
  IsleId,
  PlaceId,
  CompanionRelationshipId,
  WizardCharacterDataV4,
  WizardCharacterDataV5,
  CampaignWizardV4,
  CampaignWizardV5,
  EngagementTargetV4,
  EngagementRecordV4,
  EngagementTargetV5,
  EngagementRecordV5,
  DenizenTarget,
  MonthlyPlayStateV4,
  MonthlyPlayStateV5,
  CampaignStateV5,
  SharedWorldState,
  Denizen,
  Isle,
  WorldPlace,
  CompanionRelationship,
  ElementId,
  MonthOrdinal,
  PlayerId,
  WizardId,
  WizardCharacterUpdatedEventV2,
  EngagementTargetChangedEventV2,
  EngagementRescheduledEventV2,
  WizardCharacterUpdatedEventV1,
  EngagementTargetChangedEventV1,
  EngagementRescheduledEventV1,
  WizardCharacterData,
  CampaignWizard,
  EngagementTarget,
  EngagementRecord,
  MonthlyPlayState,
  CampaignStateV3,
  CampaignLifecycleV4,
  EngagementTargetKind,
  EngagementTargetKindV5,
} from "../shared/domain";
import {
  CURRENT_STATE_SCHEMA_VERSION,
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  validateCampaignState,
  validateAnyCampaignState,
  DomainError,
  isValidDenizenId,
  isValidIsleId,
  isValidPlaceId,
  isValidCompanionRelationshipId,
  parseDenizenId,
  parseIsleId,
  parsePlaceId,
  parseCompanionRelationshipId,
  validateV5WorldReferenceIntegrity,
  ENGAGEMENT_TARGET_KINDS,
} from "../shared/domain";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validV4State(monthOrdinal: number = 0) {
  return {
    schemaVersion: 4 as const,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal },
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
      kind: "setup" as const,
      orrery: { saturn: null, jupiter: null, mars: null, venus: null, mercury: null },
    },
    wizardmootHistory: [],
  };
}

const DEN_1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const DEN_2 = "den_00000000-0000-0000-0000-000000000002" as DenizenId;
const ISL_1 = "isl_00000000-0000-0000-0000-000000000001" as IsleId;
const PLC_1 = "plc_00000000-0000-0000-0000-000000000001" as PlaceId;
const CMPREL_1 = "cmprel_00000000-0000-0000-0000-000000000001" as CompanionRelationshipId;
const CMPREL_2 = "cmprel_00000000-0000-0000-0000-000000000002" as CompanionRelationshipId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;

const EMPTY_PACT_SEATS = {
  necromancer: { status: null, wizardId: null, watcherPlayerId: null },
  hierophant: { status: null, wizardId: null, watcherPlayerId: null },
  warlock: { status: null, wizardId: null, watcherPlayerId: null },
  mariner: { status: null, wizardId: null, watcherPlayerId: null },
  faustian: { status: null, wizardId: null, watcherPlayerId: null },
  sage: { status: null, wizardId: null, watcherPlayerId: null },
  sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
} as const;

function baseV5Wizard(): CampaignWizardV5 {
  return {
    wizardId: WIZ_A,
    name: "Wizard A",
    portrayedByPlayerId: PLR_A,
    character: {
      elements: null,
      pactFragmentPersonalForm: null,
      familiarDescription: null,
      ageYears: null,
      publicChangesOfMagic: [],
      importantNotes: null,
    },
    homeIsleId: null,
    sanctumPlaceId: null,
  };
}

function baseDenizen(id: DenizenId, name: string): Denizen {
  return { denizenId: id, name, representation: "individual", description: null };
}

function baseIsle(id: IsleId, name: string): Isle {
  return { isleId: id, name, description: null };
}

function minimalV5State(): CampaignStateV5 {
  return {
    schemaVersion: 5,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 0 as MonthOrdinal },
    configuration: { ageId: null, facilitatorPlayerId: null },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [baseV5Wizard()],
    pactSeats: EMPTY_PACT_SEATS,
    lifecycle: {
      kind: "setup",
      orrery: { saturn: null, jupiter: null, mars: null, venus: null, mercury: null },
    },
    wizardmootHistory: [],
    world: {
      denizens: [baseDenizen(DEN_1, "Elder Thorn")],
      isles: [baseIsle(ISL_1, "Starfall Isle")],
      places: [
        { placeId: PLC_1, name: "The Sanctum", description: null, placement: { kind: "on_isle", isleId: ISL_1 } },
      ],
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
    mariner: {
      shipPlaceId: null,
      selectedLawOfSeaIds: [],
      boardIsles: [],
      routes: [],
      seaRegions: [],
      beasts: [],
    },
  };
}

function withWorld(state: CampaignStateV5, worldPatch: Partial<SharedWorldState>): CampaignStateV5 {
  return { ...state, world: { ...state.world, ...worldPatch } };
}

function withWizards(state: CampaignStateV5, wizards: readonly CampaignWizardV5[]): CampaignStateV5 {
  return { ...state, wizards };
}

function companionRel(
  id: CompanionRelationshipId,
  wizardId: WizardId,
  element: ElementId,
  denizenId: DenizenId,
  status: "current" | "ended",
): CompanionRelationship {
  return { companionRelationshipId: id, wizardId, element, denizenId, description: null, status };
}

// =========================================================================
// A. Historical contract isolation
// =========================================================================

describe("Historical contract isolation", () => {
  it("WizardCharacterUpdatedEventV1 payload uses WizardCharacterDataV4 which has companionDescriptions", () => {
    expectTypeOf<WizardCharacterUpdatedEventV1["data"]["previousCharacter"]>()
      .toEqualTypeOf<WizardCharacterDataV4>();
    expectTypeOf<WizardCharacterUpdatedEventV1["data"]["newCharacter"]>()
      .toEqualTypeOf<WizardCharacterDataV4>();

    const sample: WizardCharacterDataV4 = {
      elements: null,
      pactFragmentPersonalForm: null,
      familiarDescription: null,
      ageYears: null,
      publicChangesOfMagic: [],
      importantNotes: null,
      companionDescriptions: { air: null, fire: null, earth: null, water: null },
    };
    expect(sample.companionDescriptions).toBeDefined();
  });

  it("WizardCharacterUpdatedEventV2 payload uses WizardCharacterDataV5 without companionDescriptions", () => {
    expectTypeOf<WizardCharacterUpdatedEventV2["data"]["previousCharacter"]>()
      .toEqualTypeOf<WizardCharacterDataV5>();

    const sample: WizardCharacterDataV5 = {
      elements: null,
      pactFragmentPersonalForm: null,
      familiarDescription: null,
      ageYears: null,
      publicChangesOfMagic: [],
      importantNotes: null,
    };
    expect(sample).not.toHaveProperty("companionDescriptions");
  });

  it("Engagement v1 event target types cannot include a denizen target", () => {
    expectTypeOf<EngagementTargetChangedEventV1["data"]["newTarget"]>()
      .toEqualTypeOf<EngagementTargetV4 | null>();

    type HasDenizen = Extract<EngagementTargetV4, { kind: "denizen" }>;
    expectTypeOf<HasDenizen>().toEqualTypeOf<never>();
  });

  it("Candidate v2 engagement event target types can include a denizen target", () => {
    expectTypeOf<EngagementTargetChangedEventV2["data"]["newTarget"]>()
      .toEqualTypeOf<EngagementTargetV5 | null>();

    type HasDenizen = Extract<EngagementTargetV5, { kind: "denizen" }>;
    expectTypeOf<HasDenizen>().toEqualTypeOf<DenizenTarget>();
  });

  it("V5 runtime aliases resolve to V5 types", () => {
    expectTypeOf<WizardCharacterData>().toEqualTypeOf<WizardCharacterDataV5>();
    expectTypeOf<CampaignWizard>().toEqualTypeOf<CampaignWizardV5>();
    expectTypeOf<EngagementTarget>().toEqualTypeOf<EngagementTargetV5>();
    expectTypeOf<EngagementRecord>().toEqualTypeOf<EngagementRecordV5>();
    expectTypeOf<MonthlyPlayState>().toEqualTypeOf<MonthlyPlayStateV5>();
  });

  it("current ENGAGEMENT_TARGET_KINDS contains denizen", () => {
    expect((ENGAGEMENT_TARGET_KINDS as readonly string[]).includes("denizen")).toBe(true);
  });

  it("current EngagementTargetKind is the V5 kind type", () => {
    expectTypeOf<EngagementTargetKind>().toEqualTypeOf<EngagementTargetKindV5>();
  });

  it("CampaignStateV3 lifecycle is frozen to CampaignLifecycleV4", () => {
    expectTypeOf<CampaignStateV3["lifecycle"]>().toEqualTypeOf<CampaignLifecycleV4>();
  });
});

// =========================================================================
// B. Runtime activation
// =========================================================================

describe("Runtime activation", () => {
  it("CURRENT_STATE_SCHEMA_VERSION is 5", () => {
    expect(CURRENT_STATE_SCHEMA_VERSION).toBe(5);
  });

  it("validateCampaignState accepts a valid V5 state", () => {
    const state = minimalV5State();
    expect(() => validateCampaignState(state)).not.toThrow();
  });

  it("validateCampaignState rejects a schemaVersion 4 state", () => {
    const state = validV4State();
    expect(() => validateCampaignState(state)).toThrow(DomainError);
  });

  it("validateAnyCampaignState rejects a schemaVersion 4 state", () => {
    const state = validV4State();
    expect(() => validateAnyCampaignState(state)).toThrow(DomainError);
  });
});

// =========================================================================
// C. Shared identity and reference behavior
// =========================================================================

describe("Shared world ID validation", () => {
  it("accepts valid DenizenId format", () => {
    expect(isValidDenizenId(DEN_1 as string)).toBe(true);
  });
  it("rejects malformed DenizenId", () => {
    expect(isValidDenizenId("denizen_123")).toBe(false);
  });
  it("parseDenizenId returns branded value", () => {
    expect(parseDenizenId(DEN_1 as string)).toBe(DEN_1);
  });
  it("parseDenizenId throws on invalid", () => {
    expect(() => parseDenizenId("bad")).toThrow();
  });

  it("accepts valid IsleId format", () => {
    expect(isValidIsleId(ISL_1 as string)).toBe(true);
  });
  it("rejects malformed IsleId", () => {
    expect(isValidIsleId("isle_123")).toBe(false);
  });

  it("accepts valid PlaceId format", () => {
    expect(isValidPlaceId(PLC_1 as string)).toBe(true);
  });
  it("rejects malformed PlaceId", () => {
    expect(isValidPlaceId("place_123")).toBe(false);
  });

  it("accepts valid CompanionRelationshipId format", () => {
    expect(isValidCompanionRelationshipId(CMPREL_1 as string)).toBe(true);
  });
  it("rejects malformed CompanionRelationshipId", () => {
    expect(isValidCompanionRelationshipId("cr_123")).toBe(false);
  });
});

describe("V5 world reference integrity", () => {
  it("accepts a minimal valid V5 state", () => {
    expect(() => validateV5WorldReferenceIntegrity(minimalV5State())).not.toThrow();
  });

  it("same Denizen referenced by companion relationship and engagement target", () => {
    let state = withWorld(minimalV5State(), {
      companionRelationships: [companionRel(CMPREL_1, WIZ_A, "fire", DEN_1, "current")],
    });
    state = {
      ...state,
      lifecycle: {
        kind: "play",
        phase: "planning",
        orrery: { saturn: 0, jupiter: 0, mars: 0, venus: 0, mercury: 0 } as any,
        currentMonth: {
          timeParticipants: [],
          engagements: [
            {
              engagementId: "eng_00000000-0000-0000-0000-000000000001" as any,
              actingWizardId: WIZ_A,
              target: { kind: "denizen", denizenId: DEN_1 },
              resolution: "pending",
              linkedTimeAllocationId: null,
            },
          ],
          wizardmootAttendance: null,
        },
      },
    };
    expect(() => validateV5WorldReferenceIntegrity(state)).not.toThrow();
  });

  it("ended and current companion relationships coexist for the same Wizard/Element", () => {
    const DEN_2 = "den_00000000-0000-0000-0000-000000000002" as DenizenId;
    const state = withWorld(minimalV5State(), {
      denizens: [baseDenizen(DEN_1, "Elder Thorn"), baseDenizen(DEN_2, "Shadow Whisper")],
      companionRelationships: [
        companionRel(CMPREL_1, WIZ_A, "fire", DEN_1, "ended"),
        companionRel(CMPREL_2, WIZ_A, "fire", DEN_2, "current"),
      ],
    });
    expect(() => validateV5WorldReferenceIntegrity(state)).not.toThrow();
  });

  it("rejects two CURRENT companion relationships for the same Wizard/Element", () => {
    const DEN_2 = "den_00000000-0000-0000-0000-000000000002" as DenizenId;
    const state = withWorld(minimalV5State(), {
      denizens: [baseDenizen(DEN_1, "Elder Thorn"), baseDenizen(DEN_2, "Shadow Whisper")],
      companionRelationships: [
        companionRel(CMPREL_1, WIZ_A, "fire", DEN_1, "current"),
        companionRel(CMPREL_2, WIZ_A, "fire", DEN_2, "current"),
      ],
    });
    expect(() => validateV5WorldReferenceIntegrity(state)).toThrow(DomainError);
  });

  it("rejects dangling DenizenId in companion relationship", () => {
    const state = withWorld(minimalV5State(), {
      companionRelationships: [
        companionRel(CMPREL_1, WIZ_A, "fire", "den_ffffffff-ffff-ffff-ffff-ffffffffffff" as DenizenId, "current"),
      ],
    });
    expect(() => validateV5WorldReferenceIntegrity(state)).toThrow(DomainError);
  });

  it("rejects dangling WizardId in companion relationship", () => {
    const state = withWorld(minimalV5State(), {
      companionRelationships: [
        companionRel(CMPREL_1, "wiz_ffffffff-ffff-ffff-ffff-ffffffffffff" as WizardId, "fire", DEN_1, "current"),
      ],
    });
    expect(() => validateV5WorldReferenceIntegrity(state)).toThrow(DomainError);
  });

  it("rejects dangling IsleId in on_isle placement", () => {
    const state = withWorld(minimalV5State(), {
      places: [{
        placeId: PLC_1,
        name: "Floating Tower",
        description: null,
        placement: { kind: "on_isle", isleId: "isl_ffffffff-ffff-ffff-ffff-ffffffffffff" as IsleId },
      }],
    });
    expect(() => validateV5WorldReferenceIntegrity(state)).toThrow(DomainError);
  });

  it("rejects dangling IsleId in mobile placement with non-null associatedIsleId", () => {
    const state = withWorld(minimalV5State(), {
      places: [{
        placeId: PLC_1,
        name: "Wandering Ship",
        description: null,
        placement: { kind: "mobile", associatedIsleId: "isl_ffffffff-ffff-ffff-ffff-ffffffffffff" as IsleId },
      }],
    });
    expect(() => validateV5WorldReferenceIntegrity(state)).toThrow(DomainError);
  });

  it("accepts mobile placement with null associatedIsleId", () => {
    const state = withWorld(minimalV5State(), {
      places: [{
        placeId: PLC_1,
        name: "Wandering Ship",
        description: null,
        placement: { kind: "mobile", associatedIsleId: null },
      }],
    });
    expect(() => validateV5WorldReferenceIntegrity(state)).not.toThrow();
  });

  it("rejects dangling wizard.homeIsleId", () => {
    const state = withWizards(minimalV5State(), [{
      ...baseV5Wizard(),
      homeIsleId: "isl_ffffffff-ffff-ffff-ffff-ffffffffffff" as IsleId,
    }]);
    expect(() => validateV5WorldReferenceIntegrity(state)).toThrow(DomainError);
  });

  it("rejects dangling wizard.sanctumPlaceId", () => {
    const state = withWizards(minimalV5State(), [{
      ...baseV5Wizard(),
      sanctumPlaceId: "plc_ffffffff-ffff-ffff-ffff-ffffffffffff" as PlaceId,
    }]);
    expect(() => validateV5WorldReferenceIntegrity(state)).toThrow(DomainError);
  });

  it("rejects duplicate DenizenIds", () => {
    const state = withWorld(minimalV5State(), {
      denizens: [baseDenizen(DEN_1, "Elder Thorn"), baseDenizen(DEN_1, "Same ID different name")],
    });
    expect(() => validateV5WorldReferenceIntegrity(state)).toThrow(DomainError);
  });

  it("rejects duplicate IsleIds", () => {
    const state = withWorld(minimalV5State(), {
      isles: [baseIsle(ISL_1, "Isle A"), baseIsle(ISL_1, "Isle B")],
    });
    expect(() => validateV5WorldReferenceIntegrity(state)).toThrow(DomainError);
  });

  it("rejects duplicate PlaceIds", () => {
    const state = withWorld(minimalV5State(), {
      places: [
        { placeId: PLC_1, name: "Place A", description: null, placement: { kind: "unspecified" as const } },
        { placeId: PLC_1, name: "Place B", description: null, placement: { kind: "unspecified" as const } },
      ],
    });
    expect(() => validateV5WorldReferenceIntegrity(state)).toThrow(DomainError);
  });

  it("rejects duplicate CompanionRelationshipIds", () => {
    const state = withWorld(minimalV5State(), {
      companionRelationships: [
        companionRel(CMPREL_1, WIZ_A, "fire", DEN_1, "current"),
        companionRel(CMPREL_1, WIZ_A, "earth", DEN_1, "current"),
      ],
    });
    expect(() => validateV5WorldReferenceIntegrity(state)).toThrow(DomainError);
  });

  it("rejects malformed DenizenId in world.denizens", () => {
    const state = withWorld(minimalV5State(), {
      denizens: [{ denizenId: "bad_id" as any, name: "Broken", representation: "individual" as const, description: null }],
    });
    expect(() => validateV5WorldReferenceIntegrity(state)).toThrow(DomainError);
  });

  it("rejects dangling denizen target in V5 engagement", () => {
    const state: CampaignStateV5 = {
      ...minimalV5State(),
      lifecycle: {
        kind: "play",
        phase: "planning",
        orrery: { saturn: 0, jupiter: 0, mars: 0, venus: 0, mercury: 0 } as any,
        currentMonth: {
          timeParticipants: [],
          engagements: [
            {
              engagementId: "eng_00000000-0000-0000-0000-000000000001" as any,
              actingWizardId: WIZ_A,
              target: { kind: "denizen", denizenId: "den_ffffffff-ffff-ffff-ffff-ffffffffffff" as DenizenId },
              resolution: "pending",
              linkedTimeAllocationId: null,
            },
          ],
          wizardmootAttendance: null,
        },
      },
    };
    expect(() => validateV5WorldReferenceIntegrity(state)).toThrow(DomainError);
  });

  it("renaming a Denizen while retaining ID does not invalidate references", () => {
    const state = withWorld(minimalV5State(), {
      denizens: [baseDenizen(DEN_1, "Totally Different Name")],
      companionRelationships: [companionRel(CMPREL_1, WIZ_A, "water", DEN_1, "current")],
    });
    expect(() => validateV5WorldReferenceIntegrity(state)).not.toThrow();
  });

  it("renaming an Isle while retaining ID does not invalidate placement references", () => {
    const state = withWorld(minimalV5State(), {
      isles: [baseIsle(ISL_1, "Renamed Isle")],
    });
    expect(() => validateV5WorldReferenceIntegrity(state)).not.toThrow();
  });
});
