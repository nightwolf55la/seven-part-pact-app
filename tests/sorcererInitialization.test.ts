import { describe, expect, it } from "vitest";
import type {
  CampaignStateV5,
  DenizenId,
  InitializeSorcererInput,
  IsleId,
  MonthOrdinal,
  PlaceId,
  PlayerId,
  PowerfulDenizenProfile,
  WizardId,
} from "../shared/domain";
import {
  BLANK_WIZARD_CHARACTER_V5,
  CAMPAIGN_COMMAND_TYPES,
  DomainError,
  EMPTY_MAGIC_CONSUMABLES_STATE,
  EMPTY_SHARED_WORLD_STATE,
  EMPTY_SORCERER_STATE,
  applyInitializeSorcerer,
  canonicalizeInitializeSorcererInput,
  initializeSorcererFingerprint,
  isLogicalStateCommandType,
  validateCampaignStateV5Candidate,
} from "../shared/domain";
import { makeTestCampaignStateV5 } from "./test-state";
import { validateEventCoherenceForTest } from "../convex/canonicalCommit";
import type { CanonicalCommitInput } from "../convex/canonicalCommit";
import {
  executeOrdinaryLogicalCommand,
  type CanonicalCampaign,
  type OrdinaryLogicalCommandIo,
  type OrdinaryLogicalCommandPreparation,
} from "../convex/ordinaryLogicalCommand";

const CAMPAIGN_A = "cmp_00000000-0000-0000-0000-000000000001";
const CAMPAIGN_B = "cmp_00000000-0000-0000-0000-000000000002";
const COMMAND_1 = "cmd_00000000-0000-0000-0000-000000000001";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const ISL_SPYR = "isl_00000000-0000-0000-0000-0000000000aa" as IsleId;
const PLC_TOWER = "plc_00000000-0000-0000-0000-0000000000aa" as PlaceId;
const PLC_UNIV = "plc_00000000-0000-0000-0000-0000000000ab" as PlaceId;

function denizenId(n: number): DenizenId {
  return `den_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as DenizenId;
}

function expectInvalid(run: () => unknown, pattern: RegExp): void {
  expect(run).toThrow(DomainError);
  try {
    run();
  } catch (error) {
    expect((error as DomainError).code).toBe("INVALID_CAMPAIGN_STATE");
    expect((error as DomainError).message).toMatch(pattern);
  }
}

function arcanistProfile(status: "reliable" | "disruptive"): PowerfulDenizenProfile {
  return {
    taxonomies: [{ kind: "builtin", taxonomyId: "arcanist" }],
    status: { kind: "standard", value: status },
    goal: null,
    methods: [],
    truths: [],
  };
}

function person(id: number, name: string, profile: PowerfulDenizenProfile | null = null) {
  return {
    denizenId: denizenId(id),
    name,
    representation: "individual" as const,
    description: null,
    mortalityState: "not_deceased" as const,
    powerfulProfile: profile,
  };
}

function quietPeople() {
  return [
    person(1, "R1"), person(2, "R2"), person(3, "R3"),
    person(4, "S1"), person(5, "S2"), person(6, "S3"),
    person(7, "Professor"), person(8, "Alchemist"),
  ];
}

function dynamicPeople() {
  return [
    ...quietPeople(),
    person(9, "Librarian"),
    person(10, "Tower Arc", arcanistProfile("reliable")),
  ];
}

function explosivePeople() {
  return [
    person(1, "R1"), person(2, "R2"), person(3, "R3"), person(4, "R4"),
    person(5, "S1"), person(6, "S2"), person(7, "S3"), person(8, "S4"),
    person(9, "Professor"), person(10, "Librarian"), person(11, "Alchemist"),
    person(12, "A1", arcanistProfile("reliable")),
    person(13, "A2", arcanistProfile("reliable")),
    person(14, "A3", arcanistProfile("reliable")),
    person(15, "Escaped", arcanistProfile("disruptive")),
  ];
}

function baseV5(ageId: "awakening" | "dominion" | "calamity", people: ReturnType<typeof person>[]): CampaignStateV5 {
  return makeTestCampaignStateV5({
    calendar: { monthOrdinal: 0 as MonthOrdinal },
    configuration: { ageId, facilitatorPlayerId: PLR_A },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [{
      wizardId: WIZ_A,
      name: "Mira",
      portrayedByPlayerId: PLR_A,
      character: { ...BLANK_WIZARD_CHARACTER_V5 },
      homeIsleId: ISL_SPYR,
      sanctumPlaceId: PLC_TOWER,
      mortalityState: "not_deceased",
    }],
    pactSeats: {
      necromancer: { status: null, wizardId: null, watcherPlayerId: null },
      hierophant: { status: null, wizardId: null, watcherPlayerId: null },
      warlock: { status: null, wizardId: null, watcherPlayerId: null },
      mariner: { status: null, wizardId: null, watcherPlayerId: null },
      faustian: { status: null, wizardId: null, watcherPlayerId: null },
      sage: { status: null, wizardId: null, watcherPlayerId: null },
      sorcerer: { status: "present", wizardId: WIZ_A, watcherPlayerId: null },
    },
    world: {
      ...EMPTY_SHARED_WORLD_STATE,
      denizens: people,
      isles: [{ isleId: ISL_SPYR, name: "Spyrholm", description: null }],
      places: [
        { placeId: PLC_TOWER, name: "Sorcerer's Tower", description: null, placement: { kind: "on_isle", isleId: ISL_SPYR } },
        { placeId: PLC_UNIV, name: "Spyrholm University", description: null, placement: { kind: "on_isle", isleId: ISL_SPYR } },
      ],
    },
  });
}

function quietInput(overrides?: Partial<InitializeSorcererInput>): InitializeSorcererInput {
  return {
    arrangementId: "quiet",
    spyrholmIsleId: ISL_SPYR,
    towerPlaceId: PLC_TOWER,
    universityPlaceId: PLC_UNIV,
    activeLawIds: ["first", "second"],
    unrevealedLawId: "third",
    orreryHouses: [0, 4, 8],
    ideologyIds: ["aristocracy", "mercantilism"],
    seaRegionIds: ["bay_of_ishana", "wizard_strait"],
    researchers: [
      { denizenId: denizenId(1), positionId: "srp_orrery_1" },
      { denizenId: denizenId(2), positionId: "srp_temple_krolis" },
      { denizenId: denizenId(3), positionId: "srp_court_1" },
    ],
    studentDenizenIds: [denizenId(4), denizenId(5), denizenId(6)],
    professorDenizenId: denizenId(7),
    alchemistDenizenId: denizenId(8),
    librarian: null,
    towerArcanists: [],
    calamityDisruptiveArcanist: null,
    ...overrides,
  };
}

function dynamicInput(overrides?: Partial<InitializeSorcererInput>): InitializeSorcererInput {
  return quietInput({
    arrangementId: "dynamic",
    librarian: { denizenId: denizenId(9), school: { kind: "source", schoolId: "divination" } },
    towerArcanists: [{ denizenId: denizenId(10), school: { kind: "source", schoolId: "divination" } }],
    ...overrides,
  });
}

function explosiveInput(overrides?: Partial<InitializeSorcererInput>): InitializeSorcererInput {
  return {
    arrangementId: "explosive",
    spyrholmIsleId: ISL_SPYR,
    towerPlaceId: PLC_TOWER,
    universityPlaceId: PLC_UNIV,
    activeLawIds: ["fourth", "fifth"],
    unrevealedLawId: null,
    orreryHouses: [1, 2, 3],
    ideologyIds: ["orthodoxy", "piracy"],
    seaRegionIds: ["sidereal_sea", "wainways"],
    researchers: [
      { denizenId: denizenId(1), positionId: "srp_orrery_2" },
      { denizenId: denizenId(2), positionId: "srp_sea_1" },
      { denizenId: denizenId(3), positionId: "srp_sage_future_1" },
      { denizenId: denizenId(4), positionId: "srp_necromancer_final_death" },
    ],
    studentDenizenIds: [denizenId(5), denizenId(6), denizenId(7), denizenId(8)],
    professorDenizenId: denizenId(9),
    alchemistDenizenId: denizenId(11),
    librarian: { denizenId: denizenId(10), school: { kind: "source", schoolId: "artifice" } },
    towerArcanists: [
      { denizenId: denizenId(12), school: { kind: "source", schoolId: "enchantment" } },
      { denizenId: denizenId(13), school: { kind: "source", schoolId: "invocation" } },
      { denizenId: denizenId(14), school: { kind: "source", schoolId: "artifice" } },
    ],
    calamityDisruptiveArcanist: null,
    ...overrides,
  };
}

describe("initialize_sorcerer age and arrangement", () => {
  it("initializes Awakening Quiet with two active Laws, one unrevealed Law, and Quiet staff", () => {
    const result = applyInitializeSorcerer(baseV5("awakening", quietPeople()), quietInput());
    expect(result.nextState.sorcerer.initialized).toBe(true);
    expect(result.nextState.sorcerer.researchPositions).toHaveLength(15);
    expect(result.nextState.sorcerer.activeLawIds).toEqual(["first", "second"]);
    expect(result.nextState.sorcerer.unrevealedLawIds).toEqual(["third"]);
    expect(result.nextState.sorcerer.researchers).toHaveLength(3);
    expect(result.nextState.sorcerer.academics.filter((academic) => academic.role.kind === "student")).toHaveLength(3);
    expect(result.nextState.sorcerer.academics.some((academic) => academic.role.kind === "librarian")).toBe(false);
    expect(result.nextState.sorcerer.arcanists).toHaveLength(0);
    expect(result.nextState.sorcerer.towerOrder).toEqual([denizenId(4), denizenId(5), denizenId(6), denizenId(7), denizenId(8)]);
    expect(result.nextState.sorcerer.knowledge).toEqual(EMPTY_SORCERER_STATE.knowledge);
    expect(result.nextState.sorcerer.archivesOpen).toBe(false);
    expect(result.nextState.magicConsumables).toEqual(EMPTY_MAGIC_CONSUMABLES_STATE);
    expect(result.events[0]?.type).toBe("sorcerer_initialized");
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });

  it("initializes Awakening Dynamic with matching Librarian and Tower Arcanist Schools", () => {
    const result = applyInitializeSorcerer(baseV5("awakening", dynamicPeople()), dynamicInput());
    expect(result.nextState.sorcerer.academics.some((academic) => academic.role.kind === "librarian")).toBe(true);
    expect(result.nextState.sorcerer.arcanists).toHaveLength(1);
    expect(result.nextState.sorcerer.arcanists[0]?.school).toEqual({ kind: "source", schoolId: "divination" });
    expect(result.nextState.sorcerer.towerOrder).toContain(denizenId(10));
  });

  it("initializes Dominion Explosive with three Reliable Tower Arcanists and no unrevealed Law", () => {
    const result = applyInitializeSorcerer(baseV5("dominion", explosivePeople()), explosiveInput());
    expect(result.nextState.sorcerer.researchers).toHaveLength(4);
    expect(result.nextState.sorcerer.academics.filter((academic) => academic.role.kind === "student")).toHaveLength(4);
    expect(result.nextState.sorcerer.arcanists).toHaveLength(3);
    expect(result.nextState.sorcerer.unrevealedLawIds).toEqual([]);
  });

  it("initializes Calamity Explosive with a starting Disruptive Arcanist in another Domain", () => {
    const result = applyInitializeSorcerer(baseV5("calamity", explosivePeople()), explosiveInput({
      calamityDisruptiveArcanist: {
        denizenId: denizenId(15),
        school: { kind: "source", schoolId: "oneirism" },
        seatId: "warlock",
        profile: {
          primaryElement: "water",
          rank: "prentice",
          changesOfMagic: ["dreams leak"],
          quirk: "sleeps standing",
          prenticeSpellIds: ["illusion"],
        },
      },
    }));
    expect(result.nextState.sorcerer.arcanists).toHaveLength(4);
    const escaped = result.nextState.sorcerer.arcanists.find((arcanist) => arcanist.denizenId === denizenId(15));
    expect(escaped?.placement).toEqual({ kind: "other_domain", seatId: "warlock" });
    expect(result.nextState.sorcerer.towerOrder).not.toContain(denizenId(15));
  });

  it("rejects wrong age/arrangement combinations and mismatched Dynamic Schools", () => {
    expectInvalid(
      () => applyInitializeSorcerer(baseV5("awakening", explosivePeople()), explosiveInput()),
      /not valid for age awakening/,
    );
    expectInvalid(
      () => applyInitializeSorcerer(baseV5("dominion", quietPeople()), quietInput({ unrevealedLawId: null })),
      /not valid for age dominion/,
    );
    expectInvalid(
      () => applyInitializeSorcerer(baseV5("calamity", dynamicPeople()), dynamicInput({ unrevealedLawId: null })),
      /not valid for age calamity/,
    );
    expectInvalid(
      () => applyInitializeSorcerer(baseV5("awakening", dynamicPeople()), dynamicInput({
        towerArcanists: [{ denizenId: denizenId(10), school: { kind: "source", schoolId: "enchantment" } }],
      })),
      /School to equal the Librarian/,
    );
    expectInvalid(
      () => applyInitializeSorcerer(baseV5("awakening", quietPeople()), quietInput({ orreryHouses: [0, 0, 8] })),
      /Duplicate Orrery House/,
    );
  });

  it("rejects a second initialization", () => {
    const first = applyInitializeSorcerer(baseV5("awakening", quietPeople()), quietInput());
    expectInvalid(
      () => applyInitializeSorcerer(first.nextState, quietInput()),
      /already been initialized/,
    );
  });
});

describe("initialize_sorcerer command integration", () => {
  it("is a logical campaign command", () => {
    expect(CAMPAIGN_COMMAND_TYPES as readonly string[]).toContain("initialize_sorcerer");
    expect(isLogicalStateCommandType("initialize_sorcerer")).toBe(true);
  });

  it("canonicalizes initialize_sorcerer deterministically for fingerprints", () => {
    const a = canonicalizeInitializeSorcererInput(quietInput());
    const b = canonicalizeInitializeSorcererInput(quietInput());
    expect(initializeSorcererFingerprint(CAMPAIGN_A, a)).toBe(initializeSorcererFingerprint(CAMPAIGN_A, b));
    expect(initializeSorcererFingerprint(CAMPAIGN_A, a)).not.toBe(initializeSorcererFingerprint(CAMPAIGN_B, a));
  });

  function campaignOf(campaignId: string, state: CampaignStateV5, revision = 4): CanonicalCampaign {
    return {
      docId: "dummy" as CanonicalCommitInput["campaignDocId"],
      campaignId,
      currentRevision: revision,
      currentState: state,
    };
  }

  function recordingIo(options: {
    campaign: CanonicalCampaign;
    accepted?: { commandType: string; commandFingerprint: string; campaignRevision: number };
    snapshot?: CampaignStateV5;
  }) {
    const calls: string[] = [];
    const commits: CanonicalCommitInput[] = [];
    const io: OrdinaryLogicalCommandIo = {
      async assertNotDeleting() { calls.push("assertNotDeleting"); },
      async loadCanonicalCampaign() {
        calls.push("loadCanonicalCampaign");
        return options.campaign;
      },
      async findAcceptedCommand() {
        calls.push("findAcceptedCommand");
        return options.accepted === undefined ? null : options.accepted;
      },
      async loadCommittedSnapshot() {
        calls.push("loadCommittedSnapshot");
        return options.snapshot === undefined ? options.campaign.currentState : options.snapshot;
      },
      async commit(input) {
        calls.push("commit");
        commits.push(input);
        return { newRevision: options.campaign.currentRevision + 1, state: input.nextState, alreadyApplied: false };
      },
    };
    return { io, calls, commits };
  }

  it("flows initialize_sorcerer through canonical execution with idempotent duplicate commandId", async () => {
    const state = baseV5("awakening", quietPeople());
    const input = canonicalizeInitializeSorcererInput(quietInput());
    const fingerprint = initializeSorcererFingerprint(CAMPAIGN_A, input);
    const prepare: () => OrdinaryLogicalCommandPreparation = () => ({
      commandType: "initialize_sorcerer",
      commandFingerprint: fingerprint,
      apply: (current) => applyInitializeSorcerer(current, input),
    });

    const accepted = recordingIo({ campaign: campaignOf(CAMPAIGN_A, state, 4) });
    const receipt = await executeOrdinaryLogicalCommand(
      accepted.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(receipt).toEqual({ revision: 5 });
    expect(accepted.commits[0]?.events[0]?.type).toBe("sorcerer_initialized");
    expect(() => validateEventCoherenceForTest(accepted.commits[0]!, 1)).not.toThrow();

    const replay = recordingIo({
      campaign: campaignOf(CAMPAIGN_A, accepted.commits[0]!.nextState, 5),
      accepted: { commandType: "initialize_sorcerer", commandFingerprint: fingerprint, campaignRevision: 5 },
      snapshot: accepted.commits[0]!.nextState,
    });
    const replayReceipt = await executeOrdinaryLogicalCommand(
      replay.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(replayReceipt).toEqual({ revision: 5 });
    expect(replay.commits).toHaveLength(0);

    const conflict = recordingIo({
      campaign: campaignOf(CAMPAIGN_A, state),
      accepted: { commandType: "initialize_sorcerer", commandFingerprint: fingerprint, campaignRevision: 5 },
    });
    await expect(executeOrdinaryLogicalCommand(
      conflict.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      () => ({
        commandType: "initialize_sorcerer",
        commandFingerprint: initializeSorcererFingerprint(
          CAMPAIGN_A,
          canonicalizeInitializeSorcererInput(quietInput({ activeLawIds: ["sixth", "seventh"] })),
        ),
        apply: (current) => applyInitializeSorcerer(current, quietInput({ activeLawIds: ["sixth", "seventh"] })),
      }),
    )).rejects.toMatchObject({ code: "COMMAND_ID_REUSED" });
  });
});
