import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  CampaignStateV5,
  HierophantTempleId,
  MonthOrdinal,
  PlaceId,
  PlayerId,
  WizardId,
} from "../shared/domain";
import {
  BLANK_WIZARD_CHARACTER_V5,
  DomainError,
  applyConvertHierophantHestarResource,
  applyCreatePlaceV5Candidate,
  applyInitializeHierophant,
  assertHierophantHestarConversionRevision,
  convertHierophantHestarResourceFingerprint,
  describeActivityEntry,
  isLogicalStateCommandType,
  mapEventToActivityEntry,
  parseLiveCommandId,
  validateCampaignStateV5Candidate,
  type HierophantHestarResourceConvertedEventV1,
} from "../shared/domain";
import { resolveAcceptedCommandReplay } from "../shared/domain/command-ids";
import { campaignEventValidator } from "../convex/validators";
import { validateEventCoherenceForTest } from "../convex/canonicalCommit";
import type { CanonicalCommitInput } from "../convex/canonicalCommit";
import {
  assertM5ExpectedCampaignIdMatches,
  validateM5ExpectedCampaignId,
  type CanonicalCampaign,
  type OrdinaryLogicalCommandIo,
} from "../convex/ordinaryLogicalCommand";
import { makeTestCampaignStateV5 } from "./test-state";

const CAMPAIGN_A = "cmp_00000000-0000-0000-0000-000000000001";
const CAMPAIGN_B = "cmp_00000000-0000-0000-0000-000000000002";
const COMMAND_1 = "cmd_00000000-0000-0000-0000-000000000001";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;

function placeId(n: number): PlaceId {
  return `plc_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as PlaceId;
}

function baseV5(): CampaignStateV5 {
  return makeTestCampaignStateV5({
    calendar: { monthOrdinal: 3 as MonthOrdinal },
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

function withTempleStock(
  state: CampaignStateV5,
  templeId: HierophantTempleId,
  stock: { readonly abundance: number; readonly conviction: number },
): CampaignStateV5 {
  return {
    ...state,
    hierophant: {
      ...state.hierophant,
      temples: state.hierophant.temples.map((temple) => (
        temple.templeId === templeId
          ? { ...temple, abundance: stock.abundance, conviction: stock.conviction }
          : temple
      )),
    },
  };
}

function withBlasphemy(state: CampaignStateV5, templeId: HierophantTempleId): CampaignStateV5 {
  return {
    ...state,
    hierophant: {
      ...state.hierophant,
      temples: state.hierophant.temples.map((temple) => (
        temple.templeId === templeId && temple.kind === "ordinary"
          ? { ...temple, doctrine: { kind: "blasphemy" as const, blasphemyId: "law_of_the_wolf" as const } }
          : temple
      )),
    },
  };
}

function snapshot(value: unknown): string {
  return JSON.stringify(value);
}

function templeStock(state: CampaignStateV5, templeId: HierophantTempleId) {
  const temple = state.hierophant.temples.find((entry) => entry.templeId === templeId);
  if (temple === undefined) throw new Error(`missing ${templeId}`);
  return {
    abundance: temple.abundance,
    conviction: temple.conviction,
    status: temple.status,
    doctrine: temple.kind === "ordinary" ? temple.doctrine : null,
  };
}

function expectDomainError(run: () => unknown, code: string, message?: RegExp): void {
  expect(run).toThrow(DomainError);
  try {
    run();
  } catch (error) {
    expect((error as DomainError).code).toBe(code);
    if (message !== undefined) expect((error as DomainError).message).toMatch(message);
  }
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

async function executeConvertHierophantHestarResource(
  io: OrdinaryLogicalCommandIo,
  args: {
    readonly commandId: string;
    readonly expectedCampaignId: string;
    readonly expectedRevision: number;
    readonly ordinaryTempleId: string;
    readonly sourceResource: "abundance" | "conviction";
    readonly expectedOrdinarySourceCount: number;
    readonly expectedHestarDestinationCount: number;
  },
): Promise<{ kind: "accepted"; revision: number }> {
  parseLiveCommandId(args.commandId);
  validateM5ExpectedCampaignId(args.expectedCampaignId);
  const fingerprint = convertHierophantHestarResourceFingerprint(
    args.expectedCampaignId,
    args.expectedRevision,
    args.ordinaryTempleId,
    args.sourceResource,
    args.expectedOrdinarySourceCount,
    args.expectedHestarDestinationCount,
  );
  const campaign = await io.loadCanonicalCampaign();
  assertM5ExpectedCampaignIdMatches(args.expectedCampaignId, campaign.campaignId);
  const existing = await io.findAcceptedCommand(campaign.campaignId, args.commandId);
  const replay = resolveAcceptedCommandReplay(args.commandId, existing, {
    commandType: "convert_hierophant_hestar_resource",
    commandFingerprint: fingerprint,
  });
  if (replay.kind === "replay") {
    const raw = await io.loadCommittedSnapshot(campaign.campaignId, replay.revision);
    if (raw === null) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Snapshot missing for committed revision ${replay.revision}`);
    }
    return { kind: "accepted", revision: replay.revision };
  }
  assertHierophantHestarConversionRevision(campaign.currentRevision, args.expectedRevision);
  const result = applyConvertHierophantHestarResource(campaign.currentState, {
    ordinaryTempleId: args.ordinaryTempleId as HierophantTempleId,
    sourceResource: args.sourceResource,
    expectedOrdinarySourceCount: args.expectedOrdinarySourceCount,
    expectedHestarDestinationCount: args.expectedHestarDestinationCount,
  });
  const receipt = await io.commit({
    campaignDocId: campaign.docId,
    campaignId: campaign.campaignId,
    currentRevision: campaign.currentRevision,
    currentState: campaign.currentState,
    commandId: args.commandId,
    commandType: "convert_hierophant_hestar_resource",
    commandFingerprint: fingerprint,
    nextState: result.nextState,
    events: result.events,
    historyControlUpdate: { kind: "logical_state_append" },
  });
  return { kind: "accepted", revision: receipt.newRevision };
}

function conversionEvent(commit: CanonicalCommitInput): HierophantHestarResourceConvertedEventV1 {
  const event = commit.events[0];
  if (event?.type !== "hierophant_hestar_resource_converted") {
    throw new Error(`Expected hierophant_hestar_resource_converted, got ${event?.type}`);
  }
  return event;
}

function findValidatorMembers(
  validator: { kind?: string; members?: unknown[]; fields?: Record<string, { kind?: string; value?: unknown }> },
  type: string,
  version: number,
): unknown[] {
  if (validator.kind === "union") {
    return (validator.members as Array<{ kind?: string }>).flatMap((member) =>
      findValidatorMembers(member as never, type, version),
    );
  }
  if (validator.kind === "object") {
    const typeField = validator.fields?.type;
    const versionField = validator.fields?.version;
    if (typeField?.kind === "literal" && typeField.value === type && versionField?.kind === "literal" && versionField.value === version) {
      return [validator];
    }
  }
  return [];
}

function matchesValidator(
  validator: { kind?: string; value?: unknown; members?: unknown[]; element?: unknown; fields?: Record<string, unknown>; inner?: unknown; values?: unknown } | undefined,
  value: unknown,
): boolean {
  if (validator === undefined) return false;
  switch (validator.kind) {
    case "string":
      return typeof value === "string";
    case "number":
    case "float64":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    case "literal":
      return value === validator.value;
    case "any":
      return true;
    case "union":
      return (validator.members as unknown[]).some((member) => matchesValidator(member as never, value));
    case "optional":
      return value === undefined || matchesValidator(validator.inner as never, value);
    case "object": {
      if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
      const record = value as Record<string, unknown>;
      const fields = validator.fields as Record<string, { kind?: string; inner?: unknown }>;
      for (const [key, field] of Object.entries(fields)) {
        if (field.kind === "optional" && !(key in record)) continue;
        if (!matchesValidator(field as never, record[key])) return false;
      }
      return true;
    }
    case "array":
      return Array.isArray(value) && value.every((entry) => matchesValidator(validator.element as never, entry));
    default:
      return false;
  }
}

function unchangedAsideFromConvertedPools(before: CampaignStateV5, after: CampaignStateV5): void {
  expect(after.lifecycle).toEqual(before.lifecycle);
  expect(after.pactFragmentOperationalState).toEqual(before.pactFragmentOperationalState);
  expect(after.calendar).toEqual(before.calendar);
  expect(after.hierophant.supplicants).toEqual(before.hierophant.supplicants);
  expect(after.hierophant.prophets).toEqual(before.hierophant.prophets);
  expect(after.hierophant.cults).toEqual(before.hierophant.cults);
  expect(after.hierophant.holidayTempleIds).toEqual(before.hierophant.holidayTempleIds);
  expect(after.hierophant.campaignDoctrines).toEqual(before.hierophant.campaignDoctrines);
  expect(after.hierophant.campaignClasses).toEqual(before.hierophant.campaignClasses);
  for (const temple of before.hierophant.temples) {
    const next = after.hierophant.temples.find((entry) => entry.templeId === temple.templeId);
    expect(next?.status).toEqual(temple.status);
    if (temple.kind === "ordinary" && next?.kind === "ordinary") {
      expect(next.doctrine).toEqual(temple.doctrine);
    }
  }
}

describe("applyConvertHierophantHestarResource", () => {
  it("converts exactly one ordinary Conviction into Hestar Abundance", () => {
    const before = withTempleStock(
      withTempleStock(initialized(), "krolis", { abundance: 5, conviction: 4 }),
      "hestar",
      { abundance: 3, conviction: 7 },
    );
    const notorBefore = templeStock(before, "notor");
    const frozen = snapshot(before);
    const result = applyConvertHierophantHestarResource(before, {
      ordinaryTempleId: "krolis",
      sourceResource: "conviction",
      expectedOrdinarySourceCount: 4,
      expectedHestarDestinationCount: 3,
    });
    expect(snapshot(before)).toBe(frozen);
    expect(templeStock(result.nextState, "krolis")).toMatchObject({ abundance: 5, conviction: 3 });
    expect(templeStock(result.nextState, "hestar")).toMatchObject({ abundance: 4, conviction: 7 });
    expect(templeStock(result.nextState, "notor")).toEqual(notorBefore);
    unchangedAsideFromConvertedPools(before, result.nextState);
    expect(result.events).toEqual([{
      type: "hierophant_hestar_resource_converted",
      version: 1,
      data: {
        ordinaryTempleId: "krolis",
        sourceResource: "conviction",
        hestarResource: "abundance",
        amount: 1,
        ordinaryBefore: 4,
        ordinaryAfter: 3,
        hestarBefore: 3,
        hestarAfter: 4,
      },
    }]);
    expect(JSON.stringify(result.events)).not.toMatch(/provide|provided/i);
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });

  it("converts exactly one ordinary Abundance into Hestar Conviction", () => {
    const before = withTempleStock(
      withTempleStock(initialized(), "krolis", { abundance: 5, conviction: 4 }),
      "hestar",
      { abundance: 2, conviction: 6 },
    );
    const zephonBefore = templeStock(before, "zephon");
    const result = applyConvertHierophantHestarResource(before, {
      ordinaryTempleId: "krolis",
      sourceResource: "abundance",
      expectedOrdinarySourceCount: 5,
      expectedHestarDestinationCount: 6,
    });
    expect(templeStock(result.nextState, "krolis")).toMatchObject({ abundance: 4, conviction: 4 });
    expect(templeStock(result.nextState, "hestar")).toMatchObject({ abundance: 2, conviction: 7 });
    expect(templeStock(result.nextState, "zephon")).toEqual(zephonBefore);
    unchangedAsideFromConvertedPools(before, result.nextState);
    expect(result.events[0]).toMatchObject({
      type: "hierophant_hestar_resource_converted",
      data: {
        sourceResource: "abundance",
        hestarResource: "conviction",
        amount: 1,
        ordinaryBefore: 5,
        ordinaryAfter: 4,
        hestarBefore: 6,
        hestarAfter: 7,
      },
    });
  });

  it("accepts conversion from a Blasphemous ordinary Temple", () => {
    const before = withBlasphemy(
      withTempleStock(
        withTempleStock(initialized(), "krolis", { abundance: 5, conviction: 4 }),
        "hestar",
        { abundance: 1, conviction: 2 },
      ),
      "krolis",
    );
    const result = applyConvertHierophantHestarResource(before, {
      ordinaryTempleId: "krolis",
      sourceResource: "conviction",
      expectedOrdinarySourceCount: 4,
      expectedHestarDestinationCount: 1,
    });
    expect(templeStock(result.nextState, "krolis")).toMatchObject({
      conviction: 3,
      doctrine: { kind: "blasphemy", blasphemyId: "law_of_the_wolf" },
    });
    expect(templeStock(result.nextState, "hestar")).toMatchObject({ abundance: 2, conviction: 2 });
  });

  it("rejects a zero source without mutating state", () => {
    const before = withTempleStock(initialized(), "krolis", { abundance: 0, conviction: 4 });
    const frozen = snapshot(before);
    expectDomainError(
      () => applyConvertHierophantHestarResource(before, {
        ordinaryTempleId: "krolis",
        sourceResource: "abundance",
        expectedOrdinarySourceCount: 0,
        expectedHestarDestinationCount: templeStock(before, "hestar").conviction,
      }),
      "INVALID_CAMPAIGN_STATE",
      /0|Abundance/i,
    );
    expect(snapshot(before)).toBe(frozen);
  });

  it("rejects Hestar as the ordinary source Temple", () => {
    const before = initialized();
    expectDomainError(
      () => applyConvertHierophantHestarResource(before, {
        ordinaryTempleId: "hestar",
        sourceResource: "abundance",
        expectedOrdinarySourceCount: templeStock(before, "hestar").abundance,
        expectedHestarDestinationCount: templeStock(before, "hestar").conviction,
      }),
      "INVALID_CAMPAIGN_STATE",
      /ordinary/i,
    );
  });

  it("rejects a missing ordinary Temple", () => {
    const before = initialized();
    expectDomainError(
      () => applyConvertHierophantHestarResource(before, {
        ordinaryTempleId: "missing" as HierophantTempleId,
        sourceResource: "abundance",
        expectedOrdinarySourceCount: 1,
        expectedHestarDestinationCount: 1,
      }),
      "INVALID_CAMPAIGN_STATE",
    );
    const empty = baseV5();
    expectDomainError(
      () => applyConvertHierophantHestarResource(empty, {
        ordinaryTempleId: "krolis",
        sourceResource: "abundance",
        expectedOrdinarySourceCount: 1,
        expectedHestarDestinationCount: 1,
      }),
      "INVALID_CAMPAIGN_STATE",
      /initialized/i,
    );
  });

  it("rejects a stale expected ordinary source count", () => {
    const before = withTempleStock(initialized(), "krolis", { abundance: 5, conviction: 4 });
    const frozen = snapshot(before);
    expectDomainError(
      () => applyConvertHierophantHestarResource(before, {
        ordinaryTempleId: "krolis",
        sourceResource: "conviction",
        expectedOrdinarySourceCount: 7,
        expectedHestarDestinationCount: templeStock(before, "hestar").abundance,
      }),
      "STALE_COMMAND_PRECONDITION",
      /ordinary source count/,
    );
    expect(snapshot(before)).toBe(frozen);
  });

  it("rejects a stale expected Hestar destination count", () => {
    const before = withTempleStock(
      withTempleStock(initialized(), "krolis", { abundance: 5, conviction: 4 }),
      "hestar",
      { abundance: 2, conviction: 6 },
    );
    const frozen = snapshot(before);
    expectDomainError(
      () => applyConvertHierophantHestarResource(before, {
        ordinaryTempleId: "krolis",
        sourceResource: "abundance",
        expectedOrdinarySourceCount: 5,
        expectedHestarDestinationCount: 2,
      }),
      "STALE_COMMAND_PRECONDITION",
      /Hestar destination count/,
    );
    expect(snapshot(before)).toBe(frozen);
  });
});

describe("convert_hierophant_hestar_resource command harness", () => {
  it("commits one event, one revision, and replays the same command id", async () => {
    const before = withTempleStock(
      withTempleStock(initialized(), "krolis", { abundance: 5, conviction: 4 }),
      "hestar",
      { abundance: 3, conviction: 6 },
    );
    const first = recordingIo({ campaign: campaignOf(before) });
    const receipt = await executeConvertHierophantHestarResource(first.io, {
      commandId: COMMAND_1,
      expectedCampaignId: CAMPAIGN_A,
      expectedRevision: 4,
      ordinaryTempleId: "krolis",
      sourceResource: "conviction",
      expectedOrdinarySourceCount: 4,
      expectedHestarDestinationCount: 3,
    });
    expect(receipt).toEqual({ kind: "accepted", revision: 5 });
    expect(first.commits).toHaveLength(1);
    expect(first.commits[0]?.events).toHaveLength(1);
    const event = conversionEvent(first.commits[0]!);
    expect(event.type).toBe("hierophant_hestar_resource_converted");
    expect(event.data.amount).toBe(1);
    expect(event.data.sourceResource).toBe("conviction");
    expect(event.data.hestarResource).toBe("abundance");
    expect(event.data.ordinaryBefore).toBe(4);
    expect(event.data.ordinaryAfter).toBe(3);
    expect(event.data.hestarAfter - event.data.hestarBefore).toBe(1);
    expect(JSON.stringify(event)).not.toMatch(/provide|provided|transfer/i);
    expect(() => validateEventCoherenceForTest(first.commits[0]!, 5)).not.toThrow();

    const replay = recordingIo({
      campaign: campaignOf(first.commits[0]!.nextState, 5),
      accepted: {
        commandType: "convert_hierophant_hestar_resource",
        commandFingerprint: convertHierophantHestarResourceFingerprint(
          CAMPAIGN_A,
          4,
          "krolis",
          "conviction",
          4,
          3,
        ),
        campaignRevision: 5,
      },
      snapshot: first.commits[0]!.nextState,
    });
    const replayed = await executeConvertHierophantHestarResource(replay.io, {
      commandId: COMMAND_1,
      expectedCampaignId: CAMPAIGN_A,
      expectedRevision: 4,
      ordinaryTempleId: "krolis",
      sourceResource: "conviction",
      expectedOrdinarySourceCount: 4,
      expectedHestarDestinationCount: 3,
    });
    expect(replayed).toEqual({ kind: "accepted", revision: 5 });
    expect(replay.commits).toHaveLength(0);
  });

  it("rejects a stale revision without committing", async () => {
    const stale = recordingIo({ campaign: campaignOf(initialized(), 9) });
    await expect(executeConvertHierophantHestarResource(stale.io, {
      commandId: COMMAND_1,
      expectedCampaignId: CAMPAIGN_A,
      expectedRevision: 4,
      ordinaryTempleId: "krolis",
      sourceResource: "abundance",
      expectedOrdinarySourceCount: 5,
      expectedHestarDestinationCount: 5,
    })).rejects.toMatchObject({ code: "STALE_CAMPAIGN_REVISION" });
    expect(stale.commits).toHaveLength(0);
  });

  it("includes semantic conversion intent in the fingerprint and mismatches on reuse", async () => {
    const fp = convertHierophantHestarResourceFingerprint(
      CAMPAIGN_A,
      4,
      "krolis",
      "conviction",
      4,
      5,
    );
    expect(fp).toMatch(/^convert_hierophant_hestar_resource:v1:/);
    expect(fp).toContain("conviction");
    expect(fp).toContain("krolis");
    expect(convertHierophantHestarResourceFingerprint(
      CAMPAIGN_A,
      4,
      "krolis",
      "abundance",
      4,
      5,
    )).not.toBe(fp);
    expect(convertHierophantHestarResourceFingerprint(
      CAMPAIGN_A,
      4,
      "krolis",
      "conviction",
      3,
      5,
    )).not.toBe(fp);
    expect(convertHierophantHestarResourceFingerprint(
      CAMPAIGN_A,
      4,
      "krolis",
      "conviction",
      4,
      6,
    )).not.toBe(fp);
    expect(convertHierophantHestarResourceFingerprint(
      CAMPAIGN_A,
      5,
      "krolis",
      "conviction",
      4,
      5,
    )).not.toBe(fp);
    expect(convertHierophantHestarResourceFingerprint(
      CAMPAIGN_B,
      4,
      "krolis",
      "conviction",
      4,
      5,
    )).not.toBe(fp);
    expect(isLogicalStateCommandType("convert_hierophant_hestar_resource")).toBe(true);

    const replay = recordingIo({
      campaign: campaignOf(initialized(), 5),
      accepted: {
        commandType: "convert_hierophant_hestar_resource",
        commandFingerprint: fp,
        campaignRevision: 5,
      },
    });
    await expect(executeConvertHierophantHestarResource(replay.io, {
      commandId: COMMAND_1,
      expectedCampaignId: CAMPAIGN_A,
      expectedRevision: 4,
      ordinaryTempleId: "krolis",
      sourceResource: "abundance",
      expectedOrdinarySourceCount: 4,
      expectedHestarDestinationCount: 5,
    })).rejects.toMatchObject({ code: "COMMAND_ID_REUSED" });
    expect(replay.commits).toHaveLength(0);
  });
});

describe("hierophant_hestar_resource_converted audit", () => {
  it("maps the event to truthful conversion wording", () => {
    const convictionToAbundance: HierophantHestarResourceConvertedEventV1 = {
      type: "hierophant_hestar_resource_converted",
      version: 1,
      data: {
        ordinaryTempleId: "krolis",
        sourceResource: "conviction",
        hestarResource: "abundance",
        amount: 1,
        ordinaryBefore: 4,
        ordinaryAfter: 3,
        hestarBefore: 5,
        hestarAfter: 6,
      },
    };
    const abundanceToConviction: HierophantHestarResourceConvertedEventV1 = {
      type: "hierophant_hestar_resource_converted",
      version: 1,
      data: {
        ordinaryTempleId: "krolis",
        sourceResource: "abundance",
        hestarResource: "conviction",
        amount: 1,
        ordinaryBefore: 5,
        ordinaryAfter: 4,
        hestarBefore: 5,
        hestarAfter: 6,
      },
    };
    expect(mapEventToActivityEntry("evt_conv", 8, convictionToAbundance)).toEqual({
      id: "evt_conv",
      revision: 8,
      type: "campaign_configuration",
      description: "Converted 1 Conviction at Krolis to 1 Abundance at Hestar.",
    });
    expect(describeActivityEntry(mapEventToActivityEntry("evt_rev", 9, abundanceToConviction))).toBe(
      "Revision 9 — Converted 1 Abundance at Krolis to 1 Conviction at Hestar.",
    );
    expect(JSON.stringify(convictionToAbundance)).not.toMatch(/provide|provided/i);
  });
});

describe("convert_hierophant_hestar_resource validators and registration", () => {
  it("accepts a valid event and rejects a malformed payload", () => {
    const valid: HierophantHestarResourceConvertedEventV1 = {
      type: "hierophant_hestar_resource_converted",
      version: 1,
      data: {
        ordinaryTempleId: "krolis",
        sourceResource: "conviction",
        hestarResource: "abundance",
        amount: 1,
        ordinaryBefore: 4,
        ordinaryAfter: 3,
        hestarBefore: 5,
        hestarAfter: 6,
      },
    };
    expect(findValidatorMembers(campaignEventValidator as never, "hierophant_hestar_resource_converted", 1)).toHaveLength(1);
    expect(matchesValidator(campaignEventValidator as never, valid)).toBe(true);
    expect(matchesValidator(campaignEventValidator as never, {
      ...valid,
      data: { ...valid.data, amount: 2 },
    })).toBe(false);
    expect(matchesValidator(campaignEventValidator as never, {
      ...valid,
      data: { ...valid.data, sourceResource: "souls" as "abundance" },
    })).toBe(false);
    expect(matchesValidator(campaignEventValidator as never, {
      type: "hierophant_hestar_resource_converted",
      version: 2,
      data: valid.data,
    })).toBe(false);
  });

  it("registers the Convex mutation with expectedRevision and no client-computed after-state", () => {
    const body = readFileSync(join(process.cwd(), "convex/m3Commands.ts"), "utf8");
    const start = body.indexOf("export const convertHierophantHestarResource");
    const end = body.indexOf("export const steerHierophantSupplicant", start);
    const mutation = body.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(mutation).toContain("convert_hierophant_hestar_resource");
    expect(mutation).toContain("expectedRevision");
    expect(mutation).toContain("expectedOrdinarySourceCount");
    expect(mutation).toContain("expectedHestarDestinationCount");
    expect(mutation).toContain("applyConvertHierophantHestarResource");
    expect(mutation).not.toContain("ordinaryAfter");
    expect(mutation).not.toContain("hestarAfter");
    expect(mutation).not.toContain("transferHierophantHestarResource");
    expect(mutation).not.toContain("schedule_time");
    expect(mutation).not.toContain("spend_manual_time");
  });
});

describe("assertHierophantHestarConversionRevision", () => {
  it("fails closed on a mismatched revision", () => {
    expectDomainError(
      () => assertHierophantHestarConversionRevision(9, 4),
      "STALE_CAMPAIGN_REVISION",
      /out of date|revision/i,
    );
    expect(() => assertHierophantHestarConversionRevision(4, 4)).not.toThrow();
  });
});
