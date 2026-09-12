import { describe, expect, it } from "vitest";
import type {
  CampaignStateV5,
  DenizenId,
  HierophantCampaignClassId,
  MonthOrdinal,
  PlaceId,
  PlayerId,
  WizardId,
} from "../shared/domain";
import {
  BLANK_WIZARD_CHARACTER_V5,
  DomainError,
  applyCreateCampaignClass,
  applyCreateHierophantSupplicant,
  applyCreatePlaceV5Candidate,
  applyCreateTemple,
  applyInitializeHierophant,
  applyUpdateTemple,
  canonicalizeCreateHierophantSupplicantInput,
  createHierophantSupplicantFingerprint,
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
const NEW_DEN = "den_00000000-0000-0000-0000-000000000064" as DenizenId;
const CLASS_CUSTOM = "hcl_00000000-0000-0000-0000-0000000000aa" as HierophantCampaignClassId;
const TEMPLE_CUSTOM = "htm_00000000-0000-0000-0000-0000000000aa";

function placeId(n: number): PlaceId {
  return `plc_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as PlaceId;
}

function expectCode(run: () => unknown, code: DomainError["code"], pattern?: RegExp): void {
  expect(run).toThrow(DomainError);
  try {
    run();
  } catch (error) {
    expect((error as DomainError).code).toBe(code);
    if (pattern !== undefined) {
      expect((error as DomainError).message).toMatch(pattern);
    }
  }
}

function baseV5(): CampaignStateV5 {
  return makeTestCampaignStateV5({
    calendar: { monthOrdinal: 0 as MonthOrdinal },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [{
      wizardId: WIZ_A,
      name: "Wizard A",
      portrayedByPlayerId: PLR_A,
      character: { ...BLANK_WIZARD_CHARACTER_V5 },
      homeIsleId: null,
      sanctumPlaceId: null,
      mortalityState: "not_deceased",
    }],
  });
}

function initialized(): CampaignStateV5 {
  let withPlaces = baseV5();
  for (let index = 0; index < 5; index += 1) {
    withPlaces = applyCreatePlaceV5Candidate(withPlaces, {
      placeId: placeId(index + 1),
      name: `Temple Place ${index + 1}`,
      description: null,
      placement: { kind: "unspecified" },
    }).nextState;
  }
  return applyInitializeHierophant(withPlaces, {
    selectedFlameLawIds: ["first", "second"],
    templePlaces: [
      { templeId: "krolis", placeId: placeId(1) },
      { templeId: "notor", placeId: placeId(2) },
      { templeId: "hestar", placeId: placeId(3) },
      { templeId: "ushin", placeId: placeId(4) },
      { templeId: "zephon", placeId: placeId(5) },
    ],
  }).nextState;
}

function receiveInput(overrides: Partial<Parameters<typeof canonicalizeCreateHierophantSupplicantInput>[0]> = {}) {
  return canonicalizeCreateHierophantSupplicantInput({
    denizenId: NEW_DEN,
    name: "Acolyte Ann",
    classId: "peasant",
    woe: 2,
    templeId: "krolis",
    area: "courtyard",
    expectedTempleStatus: "active",
    ...overrides,
  });
}

function campaignOf(state: CampaignStateV5, revision = 4): CanonicalCampaign {
  return {
    docId: "dummy" as CanonicalCommitInput["campaignDocId"],
    campaignId: CAMPAIGN_A,
    currentRevision: revision,
    currentState: state,
  };
}

function recordingIo(options: {
  campaign: CanonicalCampaign;
  accepted?: { commandType: string; commandFingerprint: string; campaignRevision: number };
  snapshot?: CampaignStateV5;
}) {
  const commits: CanonicalCommitInput[] = [];
  const io: OrdinaryLogicalCommandIo = {
    async assertNotDeleting() {},
    async loadCanonicalCampaign() {
      return options.campaign;
    },
    async findAcceptedCommand() {
      return options.accepted === undefined ? null : options.accepted;
    },
    async loadCommittedSnapshot() {
      return options.snapshot === undefined ? options.campaign.currentState : options.snapshot;
    },
    async commit(input) {
      commits.push(input);
      return { newRevision: options.campaign.currentRevision + 1, state: input.nextState, alreadyApplied: false };
    },
  };
  return { io, commits };
}

describe("create_hierophant_supplicant", () => {
  it("creates an individual and matching Supplicant at the selected ordinary Temple area", () => {
    const before = initialized();
    const input = receiveInput();
    const result = applyCreateHierophantSupplicant(before, input);
    expect(result.nextState.world.denizens.some((denizen) => denizen.denizenId === NEW_DEN && denizen.name === "Acolyte Ann")).toBe(true);
    expect(result.nextState.hierophant.supplicants).toEqual([{
      denizenId: NEW_DEN,
      classId: "peasant",
      woe: 2,
      host: { kind: "temple", templeId: "krolis", area: "courtyard" },
    }]);
    expect(result.events).toEqual([{
      type: "hierophant_supplicant_created",
      version: 1,
      data: {
        denizenId: NEW_DEN,
        denizenName: "Acolyte Ann",
        classId: "peasant",
        woe: 2,
        templeId: "krolis",
        area: "courtyard",
        expectedTempleStatus: "active",
      },
    }]);
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
    expect(before.world.denizens.some((denizen) => denizen.denizenId === NEW_DEN)).toBe(false);
    expect(before.hierophant.supplicants).toHaveLength(0);
  });

  it("preserves unresolved ordinary area as null and forbids Hestar area", () => {
    const before = initialized();
    const unresolved = applyCreateHierophantSupplicant(before, receiveInput({ area: null }));
    expect(unresolved.nextState.hierophant.supplicants[0]?.host).toEqual({
      kind: "temple",
      templeId: "krolis",
      area: null,
    });
    const hestar = applyCreateHierophantSupplicant(before, receiveInput({
      denizenId: "den_00000000-0000-0000-0000-000000000065" as DenizenId,
      templeId: "hestar",
      area: null,
    }));
    expect(hestar.nextState.hierophant.supplicants[0]?.host).toEqual({
      kind: "temple",
      templeId: "hestar",
      area: null,
    });
    expectCode(
      () => applyCreateHierophantSupplicant(before, receiveInput({ templeId: "hestar", area: "courtyard" })),
      "INVALID_CAMPAIGN_STATE",
      /Hestar/,
    );
  });

  it("resolves a campaign Class and a campaign Temple, and rejects unknown Class or Temple", () => {
    const withClass = applyCreateCampaignClass(initialized(), { classId: CLASS_CUSTOM, name: "Choir" }).nextState;
    const extraPlace = applyCreatePlaceV5Candidate(withClass, {
      placeId: placeId(9),
      name: "New Shrine",
      description: null,
      placement: { kind: "unspecified" },
    }).nextState;
    const withTemple = applyCreateTemple(extraPlace, {
      templeId: TEMPLE_CUSTOM as never,
      placeId: placeId(9),
      hostSeatId: "hierophant",
      abundance: 0,
      conviction: 0,
      status: "active",
      doctrine: { kind: "unset" },
    }).nextState;
    const created = applyCreateHierophantSupplicant(withTemple, receiveInput({
      classId: CLASS_CUSTOM,
      templeId: TEMPLE_CUSTOM as never,
      area: "agiary",
    }));
    expect(created.nextState.hierophant.supplicants[0]).toMatchObject({
      classId: CLASS_CUSTOM,
      host: { kind: "temple", templeId: TEMPLE_CUSTOM, area: "agiary" },
    });
    expectCode(
      () => applyCreateHierophantSupplicant(initialized(), receiveInput({ classId: "unknown_class" as never })),
      "INVALID_CAMPAIGN_STATE",
      /Class/,
    );
    expectCode(
      () => applyCreateHierophantSupplicant(initialized(), receiveInput({ templeId: "missing" as never })),
      "INVALID_CAMPAIGN_STATE",
      /Temple/,
    );
  });

  it.each([
    ["blank name", { name: "   " }, /Name/],
    ["negative Woe", { woe: -1 }, /woe/],
    ["duplicate identity", { denizenId: NEW_DEN }, /Duplicate denizenId/],
  ] as const)("rejects %s without accepting a partial result", (_label, override, pattern) => {
    const before = initialized();
    if (_label === "duplicate identity") {
      const seeded = applyCreateHierophantSupplicant(before, receiveInput()).nextState;
      expectCode(() => applyCreateHierophantSupplicant(seeded, receiveInput(override)), "INVALID_CAMPAIGN_STATE", pattern);
      return;
    }
    expectCode(() => applyCreateHierophantSupplicant(before, receiveInput(override)), "INVALID_CAMPAIGN_STATE", pattern);
  });

  it("rejects uninitialized Hierophant and meaningful stale Temple status", () => {
    expectCode(
      () => applyCreateHierophantSupplicant(baseV5(), receiveInput()),
      "INVALID_CAMPAIGN_STATE",
      /initialized/,
    );
    const collapsed = applyUpdateTemple(initialized(), "krolis", {
      status: { expected: "active", value: "collapsed" },
    }).nextState;
    expectCode(
      () => applyCreateHierophantSupplicant(collapsed, receiveInput({ expectedTempleStatus: "active" })),
      "STALE_COMMAND_PRECONDITION",
      /Temple status/,
    );
    expectCode(
      () => applyCreateHierophantSupplicant(collapsed, receiveInput({ expectedTempleStatus: "collapsed" })),
      "INVALID_CAMPAIGN_STATE",
      /collapsed/,
    );
  });

  it("fingerprints bind campaign and semantic inputs", () => {
    const input = receiveInput();
    const fp = createHierophantSupplicantFingerprint(CAMPAIGN_A, input);
    expect(fp).toMatch(/^create_hierophant_supplicant:v1:/);
    expect(createHierophantSupplicantFingerprint(CAMPAIGN_A, input)).toBe(fp);
    expect(createHierophantSupplicantFingerprint(CAMPAIGN_B, input)).not.toBe(fp);
    expect(createHierophantSupplicantFingerprint(CAMPAIGN_A, receiveInput({ name: "Other" }))).not.toBe(fp);
    expect(createHierophantSupplicantFingerprint(CAMPAIGN_A, receiveInput({ woe: 3 }))).not.toBe(fp);
    expect(createHierophantSupplicantFingerprint(CAMPAIGN_A, receiveInput({ area: null }))).not.toBe(fp);
    expect(isLogicalStateCommandType("create_hierophant_supplicant")).toBe(true);
  });

  it("ordinary-command harness accepts once, replays without a second person, and rejects command-id payload mismatch", async () => {
    const before = initialized();
    const input = receiveInput();
    const fingerprint = createHierophantSupplicantFingerprint(CAMPAIGN_A, input);
    const prepare: () => OrdinaryLogicalCommandPreparation = () => ({
      commandType: "create_hierophant_supplicant",
      commandFingerprint: fingerprint,
      apply: (current) => applyCreateHierophantSupplicant(current, input),
    });
    const first = recordingIo({ campaign: campaignOf(before) });
    const receipt = await executeOrdinaryLogicalCommand(
      first.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(receipt).toEqual({ revision: 5 });
    expect(first.commits).toHaveLength(1);
    expect(first.commits[0]?.events[0]?.type).toBe("hierophant_supplicant_created");
    expect(() => validateEventCoherenceForTest(first.commits[0]!, 1)).not.toThrow();
    expect(first.commits[0]?.nextState.world.denizens.filter((denizen) => denizen.denizenId === NEW_DEN)).toHaveLength(1);

    const replay = recordingIo({
      campaign: campaignOf(first.commits[0]!.nextState, 5),
      accepted: { commandType: "create_hierophant_supplicant", commandFingerprint: fingerprint, campaignRevision: 5 },
      snapshot: first.commits[0]!.nextState,
    });
    const replayReceipt = await executeOrdinaryLogicalCommand(
      replay.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      prepare,
    );
    expect(replayReceipt).toEqual({ revision: 5 });
    expect(replay.commits).toHaveLength(0);

    const mismatched = recordingIo({
      campaign: campaignOf(first.commits[0]!.nextState, 5),
      accepted: { commandType: "create_hierophant_supplicant", commandFingerprint: fingerprint, campaignRevision: 5 },
      snapshot: first.commits[0]!.nextState,
    });
    const other = receiveInput({ name: "Revised Ann" });
    await expect(executeOrdinaryLogicalCommand(
      mismatched.io,
      { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
      () => ({
        commandType: "create_hierophant_supplicant",
        commandFingerprint: createHierophantSupplicantFingerprint(CAMPAIGN_A, other),
        apply: (current) => applyCreateHierophantSupplicant(current, other),
      }),
    )).rejects.toBeInstanceOf(DomainError);
    expect(mismatched.commits).toHaveLength(0);
  });
});
