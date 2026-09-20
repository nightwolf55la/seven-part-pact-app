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
  applyCreatePlaceV5Candidate,
  applyInitializeHierophant,
  applyTransferHierophantHestarResource,
  assertHierophantHestarTransferRevision,
  describeActivityEntry,
  isLogicalStateCommandType,
  mapEventToActivityEntry,
  parseLiveCommandId,
  transferHierophantHestarResourceFingerprint,
  validateCampaignStateV5Candidate,
  type HierophantHestarResourceTransferredEventV1,
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
  return { abundance: temple.abundance, conviction: temple.conviction };
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

async function executeTransferHierophantHestarResource(
  io: OrdinaryLogicalCommandIo,
  args: {
    readonly commandId: string;
    readonly expectedCampaignId: string;
    readonly expectedRevision: number;
    readonly resource: "abundance" | "conviction";
    readonly sourceTempleId: string;
    readonly destinationTempleId: string;
  },
): Promise<{ kind: "accepted"; revision: number }> {
  parseLiveCommandId(args.commandId);
  validateM5ExpectedCampaignId(args.expectedCampaignId);
  const fingerprint = transferHierophantHestarResourceFingerprint(
    args.expectedCampaignId,
    args.expectedRevision,
    args.resource,
    args.sourceTempleId,
    args.destinationTempleId,
  );
  const campaign = await io.loadCanonicalCampaign();
  assertM5ExpectedCampaignIdMatches(args.expectedCampaignId, campaign.campaignId);
  const existing = await io.findAcceptedCommand(campaign.campaignId, args.commandId);
  const replay = resolveAcceptedCommandReplay(args.commandId, existing, {
    commandType: "transfer_hierophant_hestar_resource",
    commandFingerprint: fingerprint,
  });
  if (replay.kind === "replay") {
    const raw = await io.loadCommittedSnapshot(campaign.campaignId, replay.revision);
    if (raw === null) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Snapshot missing for committed revision ${replay.revision}`);
    }
    return { kind: "accepted", revision: replay.revision };
  }
  assertHierophantHestarTransferRevision(campaign.currentRevision, args.expectedRevision);
  const result = applyTransferHierophantHestarResource(campaign.currentState, {
    resource: args.resource,
    sourceTempleId: args.sourceTempleId as HierophantTempleId,
    destinationTempleId: args.destinationTempleId as HierophantTempleId,
  });
  const receipt = await io.commit({
    campaignDocId: campaign.docId,
    campaignId: campaign.campaignId,
    currentRevision: campaign.currentRevision,
    currentState: campaign.currentState,
    commandId: args.commandId,
    commandType: "transfer_hierophant_hestar_resource",
    commandFingerprint: fingerprint,
    nextState: result.nextState,
    events: result.events,
    historyControlUpdate: { kind: "logical_state_append" },
  });
  return { kind: "accepted", revision: receipt.newRevision };
}

function transferEvent(commit: CanonicalCommitInput): HierophantHestarResourceTransferredEventV1 {
  const event = commit.events[0];
  if (event?.type !== "hierophant_hestar_resource_transferred") {
    throw new Error(`Expected hierophant_hestar_resource_transferred, got ${event?.type}`);
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

describe("applyTransferHierophantHestarResource", () => {
  it("transfers exactly one Krolis Abundance to Hestar", () => {
    const before = withTempleStock(initialized(), "krolis", { abundance: 5, conviction: 4 });
    const krolisBefore = templeStock(before, "krolis");
    const hestarBefore = templeStock(before, "hestar");
    const notorBefore = templeStock(before, "notor");
    const frozen = snapshot(before);
    const result = applyTransferHierophantHestarResource(before, {
      resource: "abundance",
      sourceTempleId: "krolis",
      destinationTempleId: "hestar",
    });
    expect(snapshot(before)).toBe(frozen);
    expect(templeStock(result.nextState, "krolis")).toEqual({ abundance: 4, conviction: 4 });
    expect(templeStock(result.nextState, "hestar")).toEqual({
      abundance: hestarBefore.abundance + 1,
      conviction: hestarBefore.conviction,
    });
    expect(templeStock(result.nextState, "notor")).toEqual(notorBefore);
    expect(krolisBefore.abundance - templeStock(result.nextState, "krolis").abundance).toBe(1);
    expect(templeStock(result.nextState, "hestar").abundance - hestarBefore.abundance).toBe(1);
    expect(result.nextState.hierophant.supplicants).toEqual(before.hierophant.supplicants);
    expect(result.nextState.hierophant.prophets).toEqual(before.hierophant.prophets);
    expect(result.nextState.hierophant.cults).toEqual(before.hierophant.cults);
    expect(result.nextState.hierophant.campaignDoctrines).toEqual(before.hierophant.campaignDoctrines);
    expect(result.nextState.calendar).toEqual(before.calendar);
    expect(result.events).toEqual([{
      type: "hierophant_hestar_resource_transferred",
      version: 1,
      data: {
        resource: "abundance",
        sourceTempleId: "krolis",
        destinationTempleId: "hestar",
        amount: 1,
        sourceBefore: 5,
        sourceAfter: 4,
        destinationBefore: hestarBefore.abundance,
        destinationAfter: hestarBefore.abundance + 1,
      },
    }]);
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });

  it("transfers exactly one Hestar Conviction to Notor", () => {
    const before = withTempleStock(
      withTempleStock(initialized(), "hestar", { abundance: 4, conviction: 6 }),
      "notor",
      { abundance: 3, conviction: 2 },
    );
    const ushinBefore = templeStock(before, "ushin");
    const result = applyTransferHierophantHestarResource(before, {
      resource: "conviction",
      sourceTempleId: "hestar",
      destinationTempleId: "notor",
    });
    expect(templeStock(result.nextState, "hestar")).toEqual({ abundance: 4, conviction: 5 });
    expect(templeStock(result.nextState, "notor")).toEqual({ abundance: 3, conviction: 3 });
    expect(templeStock(result.nextState, "ushin")).toEqual(ushinBefore);
    expect(result.events[0]).toMatchObject({
      type: "hierophant_hestar_resource_transferred",
      data: {
        resource: "conviction",
        sourceTempleId: "hestar",
        destinationTempleId: "notor",
        amount: 1,
        sourceBefore: 6,
        sourceAfter: 5,
        destinationBefore: 2,
        destinationAfter: 3,
      },
    });
  });

  it("rejects a zero source without mutating state", () => {
    const before = withTempleStock(initialized(), "krolis", { abundance: 0, conviction: 4 });
    const frozen = snapshot(before);
    expectDomainError(
      () => applyTransferHierophantHestarResource(before, {
        resource: "abundance",
        sourceTempleId: "krolis",
        destinationTempleId: "hestar",
      }),
      "INVALID_CAMPAIGN_STATE",
      /0|enough|Abundance/i,
    );
    expect(snapshot(before)).toBe(frozen);
  });

  it("rejects a Blasphemous ordinary Temple in either direction", () => {
    const before = withBlasphemy(
      withTempleStock(initialized(), "krolis", { abundance: 5, conviction: 4 }),
      "krolis",
    );
    const frozen = snapshot(before);
    expectDomainError(
      () => applyTransferHierophantHestarResource(before, {
        resource: "abundance",
        sourceTempleId: "krolis",
        destinationTempleId: "hestar",
      }),
      "INVALID_CAMPAIGN_STATE",
      /Blasphemous/,
    );
    expectDomainError(
      () => applyTransferHierophantHestarResource(before, {
        resource: "conviction",
        sourceTempleId: "hestar",
        destinationTempleId: "krolis",
      }),
      "INVALID_CAMPAIGN_STATE",
      /Blasphemous/,
    );
    expect(snapshot(before)).toBe(frozen);
  });

  it("rejects ordinary-to-ordinary, identical, and invalid endpoints", () => {
    const before = initialized();
    const frozen = snapshot(before);
    expectDomainError(
      () => applyTransferHierophantHestarResource(before, {
        resource: "abundance",
        sourceTempleId: "krolis",
        destinationTempleId: "notor",
      }),
      "INVALID_CAMPAIGN_STATE",
      /Hestar/,
    );
    expectDomainError(
      () => applyTransferHierophantHestarResource(before, {
        resource: "abundance",
        sourceTempleId: "hestar",
        destinationTempleId: "hestar",
      }),
      "INVALID_CAMPAIGN_STATE",
    );
    expectDomainError(
      () => applyTransferHierophantHestarResource(before, {
        resource: "abundance",
        sourceTempleId: "krolis",
        destinationTempleId: "krolis",
      }),
      "INVALID_CAMPAIGN_STATE",
    );
    expectDomainError(
      () => applyTransferHierophantHestarResource(before, {
        resource: "abundance",
        sourceTempleId: "missing" as HierophantTempleId,
        destinationTempleId: "hestar",
      }),
      "INVALID_CAMPAIGN_STATE",
    );
    expectDomainError(
      () => applyTransferHierophantHestarResource(before, {
        resource: "souls" as "abundance",
        sourceTempleId: "krolis",
        destinationTempleId: "hestar",
      }),
      "INVALID_CAMPAIGN_STATE",
    );
    expect(snapshot(before)).toBe(frozen);
  });
});

describe("transfer_hierophant_hestar_resource command harness", () => {
  it("commits one event, one revision, and replays the same command id", async () => {
    const before = withTempleStock(initialized(), "krolis", { abundance: 5, conviction: 4 });
    const first = recordingIo({ campaign: campaignOf(before) });
    const receipt = await executeTransferHierophantHestarResource(first.io, {
      commandId: COMMAND_1,
      expectedCampaignId: CAMPAIGN_A,
      expectedRevision: 4,
      resource: "abundance",
      sourceTempleId: "krolis",
      destinationTempleId: "hestar",
    });
    expect(receipt).toEqual({ kind: "accepted", revision: 5 });
    expect(first.commits).toHaveLength(1);
    expect(first.commits[0]?.events).toHaveLength(1);
    const event = transferEvent(first.commits[0]!);
    expect(event.type).toBe("hierophant_hestar_resource_transferred");
    expect(event.data.amount).toBe(1);
    expect(event.data.sourceBefore).toBe(5);
    expect(event.data.sourceAfter).toBe(4);
    expect(event.data.destinationAfter - event.data.destinationBefore).toBe(1);
    expect(JSON.stringify(event)).not.toMatch(/provide|conversion|ratio|visions|benefaction|cult|collapse|time/i);
    expect(() => validateEventCoherenceForTest(first.commits[0]!, 5)).not.toThrow();

    const replay = recordingIo({
      campaign: campaignOf(first.commits[0]!.nextState, 5),
      accepted: {
        commandType: "transfer_hierophant_hestar_resource",
        commandFingerprint: transferHierophantHestarResourceFingerprint(
          CAMPAIGN_A,
          4,
          "abundance",
          "krolis",
          "hestar",
        ),
        campaignRevision: 5,
      },
      snapshot: first.commits[0]!.nextState,
    });
    const replayed = await executeTransferHierophantHestarResource(replay.io, {
      commandId: COMMAND_1,
      expectedCampaignId: CAMPAIGN_A,
      expectedRevision: 4,
      resource: "abundance",
      sourceTempleId: "krolis",
      destinationTempleId: "hestar",
    });
    expect(replayed).toEqual({ kind: "accepted", revision: 5 });
    expect(replay.commits).toHaveLength(0);
  });

  it("rejects a stale revision and a structural failure without committing", async () => {
    const before = withTempleStock(initialized(), "krolis", { abundance: 0, conviction: 4 });
    const stale = recordingIo({ campaign: campaignOf(initialized(), 9) });
    await expect(executeTransferHierophantHestarResource(stale.io, {
      commandId: COMMAND_1,
      expectedCampaignId: CAMPAIGN_A,
      expectedRevision: 4,
      resource: "abundance",
      sourceTempleId: "krolis",
      destinationTempleId: "hestar",
    })).rejects.toMatchObject({ code: "STALE_CAMPAIGN_REVISION" });
    expect(stale.commits).toHaveLength(0);

    const empty = recordingIo({ campaign: campaignOf(before) });
    await expect(executeTransferHierophantHestarResource(empty.io, {
      commandId: COMMAND_1,
      expectedCampaignId: CAMPAIGN_A,
      expectedRevision: 4,
      resource: "abundance",
      sourceTempleId: "krolis",
      destinationTempleId: "hestar",
    })).rejects.toBeInstanceOf(DomainError);
    expect(empty.commits).toHaveLength(0);
  });

  it("includes semantic transfer intent in the fingerprint and mismatches on reuse", async () => {
    const fp = transferHierophantHestarResourceFingerprint(
      CAMPAIGN_A,
      4,
      "abundance",
      "krolis",
      "hestar",
    );
    expect(fp).toMatch(/^transfer_hierophant_hestar_resource:v1:/);
    expect(fp).toContain("abundance");
    expect(fp).toContain("krolis");
    expect(fp).toContain("hestar");
    expect(transferHierophantHestarResourceFingerprint(
      CAMPAIGN_A,
      4,
      "conviction",
      "krolis",
      "hestar",
    )).not.toBe(fp);
    expect(transferHierophantHestarResourceFingerprint(
      CAMPAIGN_A,
      4,
      "abundance",
      "hestar",
      "krolis",
    )).not.toBe(fp);
    expect(transferHierophantHestarResourceFingerprint(
      CAMPAIGN_B,
      4,
      "abundance",
      "krolis",
      "hestar",
    )).not.toBe(fp);
    expect(isLogicalStateCommandType("transfer_hierophant_hestar_resource")).toBe(true);

    const replay = recordingIo({
      campaign: campaignOf(initialized(), 5),
      accepted: {
        commandType: "transfer_hierophant_hestar_resource",
        commandFingerprint: fp,
        campaignRevision: 5,
      },
    });
    await expect(executeTransferHierophantHestarResource(replay.io, {
      commandId: COMMAND_1,
      expectedCampaignId: CAMPAIGN_A,
      expectedRevision: 4,
      resource: "conviction",
      sourceTempleId: "krolis",
      destinationTempleId: "hestar",
    })).rejects.toMatchObject({ code: "COMMAND_ID_REUSED" });
    expect(replay.commits).toHaveLength(0);
  });
});

describe("hierophant_hestar_resource_transferred audit", () => {
  it("maps the event to concise game-facing activity wording", () => {
    const toHestar: HierophantHestarResourceTransferredEventV1 = {
      type: "hierophant_hestar_resource_transferred",
      version: 1,
      data: {
        resource: "abundance",
        sourceTempleId: "krolis",
        destinationTempleId: "hestar",
        amount: 1,
        sourceBefore: 5,
        sourceAfter: 4,
        destinationBefore: 4,
        destinationAfter: 5,
      },
    };
    const fromHestar: HierophantHestarResourceTransferredEventV1 = {
      type: "hierophant_hestar_resource_transferred",
      version: 1,
      data: {
        resource: "conviction",
        sourceTempleId: "hestar",
        destinationTempleId: "notor",
        amount: 1,
        sourceBefore: 6,
        sourceAfter: 5,
        destinationBefore: 2,
        destinationAfter: 3,
      },
    };
    expect(mapEventToActivityEntry("evt_to", 8, toHestar)).toEqual({
      id: "evt_to",
      revision: 8,
      type: "campaign_configuration",
      description: "Transferred Abundance to Hestar",
    });
    expect(describeActivityEntry(mapEventToActivityEntry("evt_from", 9, fromHestar))).toBe(
      "Revision 9 — Transferred Conviction from Hestar to Notor",
    );
    expect(JSON.stringify(toHestar)).not.toMatch(/provide|conversion|ratio/i);
  });
});

describe("transfer_hierophant_hestar_resource validators and registration", () => {
  it("accepts a valid event and rejects a malformed payload", () => {
    const valid: HierophantHestarResourceTransferredEventV1 = {
      type: "hierophant_hestar_resource_transferred",
      version: 1,
      data: {
        resource: "abundance",
        sourceTempleId: "krolis",
        destinationTempleId: "hestar",
        amount: 1,
        sourceBefore: 5,
        sourceAfter: 4,
        destinationBefore: 4,
        destinationAfter: 5,
      },
    };
    expect(findValidatorMembers(campaignEventValidator as never, "hierophant_hestar_resource_transferred", 1)).toHaveLength(1);
    expect(matchesValidator(campaignEventValidator as never, valid)).toBe(true);
    expect(matchesValidator(campaignEventValidator as never, {
      ...valid,
      data: { ...valid.data, amount: 2 },
    })).toBe(false);
    expect(matchesValidator(campaignEventValidator as never, {
      ...valid,
      data: { ...valid.data, resource: "souls" },
    })).toBe(false);
    expect(matchesValidator(campaignEventValidator as never, {
      type: "hierophant_hestar_resource_transferred",
      version: 2,
      data: valid.data,
    })).toBe(false);
  });

  it("registers the Convex mutation with expectedRevision and no client-computed after-state", () => {
    const body = readFileSync(join(process.cwd(), "convex/m3Commands.ts"), "utf8");
    const start = body.indexOf("export const transferHierophantHestarResource");
    const end = body.indexOf("export const updateSupplicant", start);
    const mutation = body.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(mutation).toContain("transfer_hierophant_hestar_resource");
    expect(mutation).toContain("expectedRevision");
    expect(mutation).toContain("applyTransferHierophantHestarResource");
    expect(mutation).not.toContain("sourceAfter");
    expect(mutation).not.toContain("destinationAfter");
    expect(mutation).not.toContain("adjustTempleResources");
  });
});

describe("assertHierophantHestarTransferRevision", () => {
  it("fails closed on a mismatched revision", () => {
    expectDomainError(
      () => assertHierophantHestarTransferRevision(9, 4),
      "STALE_CAMPAIGN_REVISION",
      /out of date|revision/i,
    );
    expect(() => assertHierophantHestarTransferRevision(4, 4)).not.toThrow();
  });
});
