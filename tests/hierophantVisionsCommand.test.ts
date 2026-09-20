import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  CampaignStateV5,
  DenizenId,
  HierophantTempleId,
  MonthOrdinal,
  PlaceId,
  PlayerId,
  WizardId,
} from "../shared/domain";
import {
  BLANK_WIZARD_CHARACTER_V5,
  DomainError,
  applyAddProphet,
  applyAddSupplicant,
  applyCreateDenizenV5Candidate,
  applyCreatePlaceV5Candidate,
  applyCreatePowerfulDenizenProfile,
  applyInitializeHierophant,
  applyResolveHierophantVisions,
  assertHierophantVisionsRevision,
  canonicalizeHierophantVisionsChoices,
  describeActivityEntry,
  isLogicalStateCommandType,
  mapEventToActivityEntry,
  parseLiveCommandId,
  resolveHierophantVisionsFingerprint,
  validateCampaignStateV5Candidate,
  type HierophantVisionsChoices,
  type HierophantVisionsResolvedEventV1,
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

function denizenId(n: number): DenizenId {
  return `den_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as DenizenId;
}

function baseV5(monthOrdinal = 3): CampaignStateV5 {
  return makeTestCampaignStateV5({
    calendar: { monthOrdinal: monthOrdinal as MonthOrdinal },
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

function initialized(monthOrdinal = 3): CampaignStateV5 {
  let withPlaces = baseV5(monthOrdinal);
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

function withPerson(
  state: CampaignStateV5,
  n: number,
  input: {
    readonly name?: string;
    readonly classId?: "peasant" | "gentry" | "artisan" | "merchant";
    readonly woe?: number;
    readonly templeId?: HierophantTempleId;
    readonly area?: "courtyard" | "agiary" | null;
  } = {},
): CampaignStateV5 {
  const templeId = input.templeId ?? "krolis";
  const created = applyCreateDenizenV5Candidate(state, {
    denizenId: denizenId(n),
    name: input.name ?? `Person ${n}`,
    representation: "individual",
    description: null,
  }).nextState;
  return applyAddSupplicant(created, {
    denizenId: denizenId(n),
    classId: input.classId ?? "peasant",
    woe: input.woe ?? 2,
    host: {
      kind: "temple",
      templeId,
      area: templeId === "hestar" ? null : (input.area === undefined ? "courtyard" : input.area),
    },
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

function snapshot(value: unknown): string {
  return JSON.stringify(value);
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

type VisionsCommandResult =
  | { readonly kind: "accepted"; readonly revision: number }
  | {
      readonly kind: "choices_required" | "manual_resolution_required";
      readonly requiredChoices: unknown;
      readonly blockers: unknown;
    };

async function executeResolveHierophantVisions(
  io: OrdinaryLogicalCommandIo,
  args: {
    readonly commandId: string;
    readonly expectedCampaignId: string;
    readonly expectedRevision: number;
    readonly choices: HierophantVisionsChoices;
  },
): Promise<VisionsCommandResult> {
  parseLiveCommandId(args.commandId);
  validateM5ExpectedCampaignId(args.expectedCampaignId);
  const choices = canonicalizeHierophantVisionsChoices(args.choices);
  const fingerprint = resolveHierophantVisionsFingerprint(
    args.expectedCampaignId,
    args.expectedRevision,
    choices,
  );
  const campaign = await io.loadCanonicalCampaign();
  assertM5ExpectedCampaignIdMatches(args.expectedCampaignId, campaign.campaignId);
  const existing = await io.findAcceptedCommand(campaign.campaignId, args.commandId);
  const replay = resolveAcceptedCommandReplay(args.commandId, existing, {
    commandType: "resolve_hierophant_visions",
    commandFingerprint: fingerprint,
  });
  if (replay.kind === "replay") {
    const raw = await io.loadCommittedSnapshot(campaign.campaignId, replay.revision);
    if (raw === null) {
      throw new DomainError("CAMPAIGN_STATE_CORRUPT", `Snapshot missing for committed revision ${replay.revision}`);
    }
    return { kind: "accepted", revision: replay.revision };
  }
  assertHierophantVisionsRevision(campaign.currentRevision, args.expectedRevision);
  const result = applyResolveHierophantVisions(campaign.currentState, choices);
  if (result.kind !== "ready") {
    return {
      kind: result.kind,
      requiredChoices: result.plan.requiredChoices,
      blockers: result.plan.blockers,
    };
  }
  const receipt = await io.commit({
    campaignDocId: campaign.docId,
    campaignId: campaign.campaignId,
    currentRevision: campaign.currentRevision,
    currentState: campaign.currentState,
    commandId: args.commandId,
    commandType: "resolve_hierophant_visions",
    commandFingerprint: fingerprint,
    nextState: result.nextState,
    events: result.events,
    historyControlUpdate: { kind: "logical_state_append" },
  });
  return { kind: "accepted", revision: receipt.newRevision };
}

function visionsEvent(commit: CanonicalCommitInput): HierophantVisionsResolvedEventV1 {
  const event = commit.events[0];
  if (event?.type !== "hierophant_visions_resolved") {
    throw new Error(`Expected hierophant_visions_resolved, got ${event?.type}`);
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
      return (validator.members as Array<{ kind?: string }>).some((member) => matchesValidator(member, value));
    case "array":
      return Array.isArray(value) && value.every((item) => matchesValidator(validator.element as { kind?: string }, item));
    case "optional":
      return value === undefined || matchesValidator(validator.inner as { kind?: string }, value);
    case "record": {
      if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
      const valueValidator = (validator as { value?: { kind?: string }; values?: { kind?: string } }).value
        ?? (validator as { values?: { kind?: string } }).values;
      if (valueValidator === undefined) return false;
      return Object.values(value as Record<string, unknown>).every((entry) =>
        matchesValidator(valueValidator, entry),
      );
    }
    case "object": {
      if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
      const obj = value as Record<string, unknown>;
      for (const [key, field] of Object.entries(validator.fields ?? {})) {
        const fieldValidator = field as { kind?: string; inner?: unknown };
        const optional = fieldValidator.kind === "optional" || (fieldValidator as { isOptional?: string }).isOptional === "optional";
        const inner = fieldValidator.kind === "optional" ? fieldValidator.inner as { kind?: string } : fieldValidator;
        if (!(key in obj) || obj[key] === undefined) {
          if (optional) continue;
          return false;
        }
        if (!matchesValidator(inner, obj[key])) return false;
      }
      return true;
    }
    default:
      return false;
  }
}

describe("resolve_hierophant_visions apply", () => {
  it("commits supported and unsupported Woe together into one Hierophant result", () => {
    const before = withPerson(withPerson(initialized(), 1, { classId: "peasant", woe: 3, name: "Ann" }), 2, {
      classId: "gentry",
      woe: 2,
      name: "Gareth",
    });
    const frozen = snapshot(before);
    const result = applyResolveHierophantVisions(before, {});
    expect(snapshot(before)).toBe(frozen);
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.nextState.hierophant.supplicants.map((person) => [person.denizenId, person.woe])).toEqual([
      [denizenId(1), 2],
      [denizenId(2), 3],
    ]);
    expect(result.nextState.hierophant.temples.find((temple) => temple.templeId === "krolis")).toMatchObject({
      abundance: 4,
      conviction: 4,
    });
    expect(result.nextState.world).toEqual(before.world);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.type).toBe("hierophant_visions_resolved");
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
  });

  it("keeps a supported Woe-1 person hosted at Woe 0 without Benefaction or departure", () => {
    const before = withPerson(initialized(), 1, { classId: "peasant", woe: 1 });
    const cults = snapshot(before.hierophant.cults);
    const result = applyResolveHierophantVisions(before, {});
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.nextState.hierophant.supplicants).toEqual([{
      ...before.hierophant.supplicants[0],
      woe: 0,
    }]);
    expect(result.nextState.hierophant.temples.find((temple) => temple.templeId === "krolis")?.abundance).toBe(4);
    expect(snapshot(result.nextState.hierophant.cults)).toBe(cults);
    const json = JSON.stringify(result.events[0]);
    expect(json).not.toMatch(/benefaction/i);
    expect(json).not.toMatch(/depart/i);
    expect(json).not.toMatch(/cult/i);
  });

  it("keeps an unsupported Woe-4 person hosted at Woe 5 without Cult mutation", () => {
    const before = withPerson(initialized(), 1, { classId: "gentry", woe: 4 });
    const cults = snapshot(before.hierophant.cults);
    const result = applyResolveHierophantVisions(before, {});
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.nextState.hierophant.supplicants[0]?.woe).toBe(5);
    expect(result.nextState.hierophant.supplicants).toHaveLength(1);
    expect(snapshot(result.nextState.hierophant.cults)).toBe(cults);
    expect(JSON.stringify(result.events[0])).not.toMatch(/cult/i);
  });

  it("does not blanket-block a Reliable Prophet when Woe 1 becomes 0", () => {
    let state = withPerson(initialized(), 1, { classId: "peasant", woe: 1 });
    state = applyCreateDenizenV5Candidate(state, {
      denizenId: denizenId(2),
      name: "Ilya",
      representation: "individual",
      description: null,
    }).nextState;
    state = applyCreatePowerfulDenizenProfile(state, {
      denizenId: denizenId(2),
      taxonomies: [{ kind: "builtin", taxonomyId: "prophet" }],
      status: { kind: "standard", value: "reliable" },
      goal: null,
    }).nextState;
    state = applyAddProphet(state, {
      denizenId: denizenId(2),
      host: { kind: "temple", templeId: "krolis" },
    }).nextState;
    const result = applyResolveHierophantVisions(state, {});
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.nextState.hierophant.supplicants[0]?.woe).toBe(0);
    expect(result.nextState.hierophant.prophets).toEqual(state.hierophant.prophets);
    expect(JSON.stringify(result.events[0])).not.toMatch(/prophet/i);
  });

  it("applies an explicit Artisan payment to the authoritative result", () => {
    const before = withTempleStock(
      withPerson(initialized(), 1, { classId: "artisan", woe: 2 }),
      "krolis",
      { abundance: 3, conviction: 3 },
    );
    const missing = applyResolveHierophantVisions(before, {});
    expect(missing.kind).toBe("choices_required");
    const result = applyResolveHierophantVisions(before, {
      artisanPayments: { [denizenId(1)]: "conviction" },
    });
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.nextState.hierophant.temples.find((temple) => temple.templeId === "krolis")).toMatchObject({
      abundance: 3,
      conviction: 2,
    });
    expect(result.events[0]).toMatchObject({
      type: "hierophant_visions_resolved",
      data: {
        choices: { artisanPayments: { [denizenId(1)]: "conviction" } },
      },
    });
  });

  it("applies ordinary-to-Hestar fallback atomically", () => {
    const before = withTempleStock(
      withTempleStock(withPerson(initialized(), 1, { classId: "peasant", woe: 2 }), "krolis", {
        abundance: 0,
        conviction: 4,
      }),
      "hestar",
      { abundance: 5, conviction: 5 },
    );
    const result = applyResolveHierophantVisions(before, {
      hestarFallback: { [denizenId(1)]: true },
    });
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.nextState.hierophant.temples.find((temple) => temple.templeId === "krolis")?.abundance).toBe(0);
    expect(result.nextState.hierophant.temples.find((temple) => temple.templeId === "hestar")?.abundance).toBe(4);
    expect(result.nextState.hierophant.supplicants[0]?.woe).toBe(1);
    expect(result.events[0]).toMatchObject({
      data: {
        hestarUses: [{
          kind: "fallback",
          denizenId: denizenId(1),
          hostedTempleId: "krolis",
          sourceTempleId: "hestar",
          resource: "abundance",
          amount: 1,
        }],
      },
    });
  });

  it("applies an explicit Hestar donor atomically", () => {
    const before = withTempleStock(
      withPerson(initialized(), 1, { classId: "peasant", woe: 2, templeId: "hestar" }),
      "hestar",
      { abundance: 0, conviction: 5 },
    );
    const result = applyResolveHierophantVisions(before, {
      hestarDonors: { [denizenId(1)]: "krolis" },
    });
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.nextState.hierophant.temples.find((temple) => temple.templeId === "krolis")?.abundance).toBe(4);
    expect(result.nextState.hierophant.temples.find((temple) => temple.templeId === "hestar")?.abundance).toBe(0);
    expect(result.events[0]).toMatchObject({
      data: {
        hestarUses: [{
          kind: "donor",
          denizenId: denizenId(1),
          hostedTempleId: "hestar",
          sourceTempleId: "krolis",
          resource: "abundance",
          amount: 1,
        }],
      },
    });
  });

  it("requires and honors explicit order for scarce Hestar allocation without committing a leftover shortage", () => {
    let before = withPerson(initialized(), 1, { classId: "peasant", woe: 2, templeId: "krolis" });
    before = withPerson(before, 2, { classId: "peasant", woe: 2, templeId: "zephon" });
    before = withTempleStock(before, "krolis", { abundance: 0, conviction: 4 });
    before = withTempleStock(before, "zephon", { abundance: 0, conviction: 5 });
    before = withTempleStock(before, "hestar", { abundance: 1, conviction: 5 });
    const choices: HierophantVisionsChoices = {
      hestarFallback: { [denizenId(1)]: true, [denizenId(2)]: true },
    };
    const missing = applyResolveHierophantVisions(before, choices);
    expect(missing.kind).toBe("choices_required");
    expect("nextState" in missing).toBe(false);
    const ordered = applyResolveHierophantVisions(before, {
      ...choices,
      supplicantOrder: [denizenId(1), denizenId(2)],
    });
    expect(ordered.kind).toBe("manual_resolution_required");
    expect("nextState" in ordered).toBe(false);
    if (ordered.kind === "manual_resolution_required") {
      expect(ordered.plan.supplicants.find((person) => person.denizenId === denizenId(1))?.woeProjection).toEqual({
        kind: "determined",
        from: 2,
        to: 1,
      });
      expect(ordered.plan.supplicants.find((person) => person.denizenId === denizenId(2))?.blockerKind).toBe(
        "resource_shortage_collapse",
      );
    }
  });
});

describe("resolve_hierophant_visions command harness", () => {
  it("accepts a ready month once, emits one event, and replays the same command id", async () => {
    const before = withPerson(initialized(), 1, { classId: "peasant", woe: 3 });
    const first = recordingIo({ campaign: campaignOf(before) });
    const receipt = await executeResolveHierophantVisions(first.io, {
      commandId: COMMAND_1,
      expectedCampaignId: CAMPAIGN_A,
      expectedRevision: 4,
      choices: {},
    });
    expect(receipt).toEqual({ kind: "accepted", revision: 5 });
    expect(first.commits).toHaveLength(1);
    const event = visionsEvent(first.commits[0]!);
    expect(event).toMatchObject({
      type: "hierophant_visions_resolved",
      version: 1,
      data: {
        monthOrdinal: 3,
        woeChanges: [{
          denizenId: denizenId(1),
          templeId: "krolis",
          from: 3,
          to: 2,
          support: "supported",
        }],
        resourceDeltas: [{
          templeId: "krolis",
          resource: "abundance",
          before: 5,
          after: 4,
          delta: -1,
        }],
      },
    });
    expect(JSON.stringify(event)).not.toMatch(/benefaction|depart|cult|collapse|blasphemy|prophet/i);
    expect(() => validateEventCoherenceForTest(first.commits[0]!, 5)).not.toThrow();
    expect(first.commits[0]?.nextState.hierophant.supplicants[0]?.woe).toBe(2);

    const replay = recordingIo({
      campaign: campaignOf(first.commits[0]!.nextState, 5),
      accepted: {
        commandType: "resolve_hierophant_visions",
        commandFingerprint: resolveHierophantVisionsFingerprint(CAMPAIGN_A, 4, {}),
        campaignRevision: 5,
      },
      snapshot: first.commits[0]!.nextState,
    });
    const replayed = await executeResolveHierophantVisions(replay.io, {
      commandId: COMMAND_1,
      expectedCampaignId: CAMPAIGN_A,
      expectedRevision: 4,
      choices: {},
    });
    expect(replayed).toEqual({ kind: "accepted", revision: 5 });
    expect(replay.commits).toHaveLength(0);
  });

  it("returns choices_required without a revision, event, or state commit", async () => {
    const before = withTempleStock(
      withPerson(initialized(), 1, { classId: "artisan", woe: 2 }),
      "krolis",
      { abundance: 3, conviction: 3 },
    );
    const frozen = snapshot(before);
    const recorded = recordingIo({ campaign: campaignOf(before) });
    const result = await executeResolveHierophantVisions(recorded.io, {
      commandId: COMMAND_1,
      expectedCampaignId: CAMPAIGN_A,
      expectedRevision: 4,
      choices: {},
    });
    expect(result.kind).toBe("choices_required");
    expect(recorded.commits).toHaveLength(0);
    expect(snapshot(before)).toBe(frozen);
    if (result.kind === "choices_required") {
      expect(result.requiredChoices).toEqual([
        {
          kind: "artisan_payment",
          denizenId: denizenId(1),
          templeId: "krolis",
          options: ["abundance", "conviction"],
        },
      ]);
    }
  });

  it("returns a genuine shortage blocker without leaking earlier Supplicant payments", async () => {
    let before = withPerson(initialized(), 1, { classId: "peasant", woe: 3, templeId: "krolis" });
    before = withPerson(before, 2, { classId: "peasant", woe: 2, templeId: "zephon" });
    before = withTempleStock(before, "zephon", { abundance: 0, conviction: 5 });
    before = withTempleStock(before, "hestar", { abundance: 0, conviction: 5 });
    const frozen = snapshot(before);
    const recorded = recordingIo({ campaign: campaignOf(before) });
    const result = await executeResolveHierophantVisions(recorded.io, {
      commandId: COMMAND_1,
      expectedCampaignId: CAMPAIGN_A,
      expectedRevision: 4,
      choices: {},
    });
    expect(result.kind).toBe("manual_resolution_required");
    expect(recorded.commits).toHaveLength(0);
    expect(snapshot(before)).toBe(frozen);
    if (result.kind === "manual_resolution_required") {
      expect(result.blockers).toEqual(expect.arrayContaining([
        expect.objectContaining({
          kind: "resource_shortage_collapse",
          templeId: "zephon",
        }),
      ]));
    }
  });

  it("rejects a stale campaign revision instead of resolving a newer board", async () => {
    const older = withPerson(initialized(), 1, { classId: "peasant", woe: 3 });
    const newer = withPerson(older, 2, { classId: "gentry", woe: 2 });
    const recorded = recordingIo({ campaign: campaignOf(newer, 9) });
    await expect(executeResolveHierophantVisions(recorded.io, {
      commandId: COMMAND_1,
      expectedCampaignId: CAMPAIGN_A,
      expectedRevision: 4,
      choices: {},
    })).rejects.toMatchObject({ code: "STALE_CAMPAIGN_REVISION" });
    expect(recorded.commits).toHaveLength(0);
    expect(newer.hierophant.supplicants.map((person) => person.woe)).toEqual([3, 2]);
  });

  it("fingerprints bind campaign, revision, and semantic choices", () => {
    const choices = { artisanPayments: { [denizenId(1)]: "abundance" as const } };
    const fp = resolveHierophantVisionsFingerprint(CAMPAIGN_A, 4, choices);
    expect(fp).toMatch(/^resolve_hierophant_visions:v1:/);
    expect(resolveHierophantVisionsFingerprint(CAMPAIGN_A, 4, choices)).toBe(fp);
    expect(resolveHierophantVisionsFingerprint(CAMPAIGN_B, 4, choices)).not.toBe(fp);
    expect(resolveHierophantVisionsFingerprint(CAMPAIGN_A, 5, choices)).not.toBe(fp);
    expect(resolveHierophantVisionsFingerprint(CAMPAIGN_A, 4, {})).not.toBe(fp);
    expect(isLogicalStateCommandType("resolve_hierophant_visions")).toBe(true);
  });
});

describe("hierophant_visions_resolved audit", () => {
  it("records the execution month and only applied semantic choices", () => {
    const before = withTempleStock(
      withPerson(initialized(7), 1, { classId: "artisan", woe: 2 }),
      "krolis",
      { abundance: 3, conviction: 3 },
    );
    const result = applyResolveHierophantVisions(before, {
      artisanPayments: { [denizenId(1)]: "abundance" },
      hestarFallback: { [denizenId(1)]: true },
    });
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.events[0]).toMatchObject({
      type: "hierophant_visions_resolved",
      data: {
        monthOrdinal: 7,
        choices: { artisanPayments: { [denizenId(1)]: "abundance" } },
      },
    });
    if (result.events[0]?.type === "hierophant_visions_resolved") {
      expect(result.events[0].data.choices).not.toHaveProperty("hestarFallback");
    }
  });

  it("maps the event to player-facing activity wording", () => {
    const event: HierophantVisionsResolvedEventV1 = {
      type: "hierophant_visions_resolved",
      version: 1,
      data: {
        monthOrdinal: 3,
        choices: {},
        woeChanges: [{
          denizenId: denizenId(1),
          templeId: "krolis",
          from: 3,
          to: 2,
          support: "supported",
        }],
        resourceDeltas: [{
          templeId: "krolis",
          resource: "abundance",
          before: 5,
          after: 4,
          delta: -1,
        }],
        hestarUses: [],
      },
    };
    const entry = mapEventToActivityEntry("evt_visions", 12, event);
    expect(entry).toEqual({
      id: "evt_visions",
      revision: 12,
      type: "campaign_configuration",
      description: "Resolved Hierophant Visions",
    });
    expect(describeActivityEntry(entry)).toBe("Revision 12 — Resolved Hierophant Visions");
  });
});

describe("resolve_hierophant_visions validators and registration", () => {
  it("accepts a valid event and rejects a malformed payload", () => {
    const valid: HierophantVisionsResolvedEventV1 = {
      type: "hierophant_visions_resolved",
      version: 1,
      data: {
        monthOrdinal: 3,
        choices: {
          artisanPayments: { [denizenId(1)]: "conviction" },
        },
        woeChanges: [{
          denizenId: denizenId(1),
          templeId: "krolis",
          from: 2,
          to: 1,
          support: "supported",
        }],
        resourceDeltas: [{
          templeId: "krolis",
          resource: "conviction",
          before: 3,
          after: 2,
          delta: -1,
        }],
        hestarUses: [],
      },
    };
    expect(findValidatorMembers(campaignEventValidator as never, "hierophant_visions_resolved", 1)).toHaveLength(1);
    expect(matchesValidator(campaignEventValidator as never, valid)).toBe(true);
    expect(matchesValidator(campaignEventValidator as never, {
      ...valid,
      data: { ...valid.data, woeChanges: undefined },
    })).toBe(false);
    expect(matchesValidator(campaignEventValidator as never, {
      type: "hierophant_visions_resolved",
      version: 2,
      data: valid.data,
    })).toBe(false);
  });

  it("preflights non-ready results before canonical commit", () => {
    const source = readFileSync(join(__dirname, "../convex/m3Commands.ts"), "utf8");
    const start = source.indexOf("export const resolveHierophantVisions");
    const end = source.indexOf("export const updateSupplicant");
    const body = source.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(body).toContain("assertHierophantVisionsRevision");
    expect(body).toContain("applyResolveHierophantVisions");
    expect(body.indexOf("if (result.kind !== \"ready\")")).toBeGreaterThan(-1);
    expect(body.indexOf("if (result.kind !== \"ready\")")).toBeLessThan(body.indexOf("commitM3Command"));
    expect(body).toContain("kind: result.kind");
    expect(body).not.toContain("resultingState");
    expect(body).toContain("expectedRevision");
  });
});

describe("assertHierophantVisionsRevision", () => {
  it("fails closed on a mismatched revision", () => {
    expect(() => assertHierophantVisionsRevision(9, 4)).toThrow(DomainError);
    try {
      assertHierophantVisionsRevision(9, 4);
    } catch (error) {
      expect((error as DomainError).code).toBe("STALE_CAMPAIGN_REVISION");
      expect((error as DomainError).message).toMatch(/out of date/i);
    }
    expect(() => assertHierophantVisionsRevision(4, 4)).not.toThrow();
  });
});
