import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  AllocationId,
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
  applyCreateDenizenV5Candidate,
  applyCreateHierophantSupplicant,
  applyCreatePlaceV5Candidate,
  applyDepartHierophantSupplicantWithBenefaction,
  applyInitializeHierophant,
  applyRemoveSupplicant,
  applyScheduleTime,
  applySpendManualTime,
  applySteerHierophantSupplicant,
  asCentidegreePosition,
  assertHierophantBenefactionDepartRevision,
  assertHierophantSteerRevision,
  buildExportBackup,
  canonicalizeCreateHierophantSupplicantInput,
  describeActivityEntry,
  departHierophantSupplicantWithBenefactionFingerprint,
  fullyValidateBackup,
  isLogicalStateCommandType,
  mapEventToActivityEntry,
  parseLiveCommandId,
  statesDeepEqual,
  steerHierophantSupplicantFingerprint,
  validateCampaignStateV5Candidate,
  type HierophantSupplicantBenefactionDepartedEventV1,
  type HierophantSupplicantSteeredEventV1,
} from "../shared/domain";
import { resolveAcceptedCommandReplay } from "../shared/domain/command-ids";
import { campaignEventValidator, timeDestinationV5Validator } from "../convex/validators";
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
const COMMAND_1 = "cmd_00000000-0000-0000-0000-000000000001";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const WIZ_B = "wiz_00000000-0000-0000-0000-00000000000b" as WizardId;
const DEN_ANN = "den_00000000-0000-0000-0000-0000000000aa" as DenizenId;
const DEN_OTHER = "den_00000000-0000-0000-0000-0000000000bb" as DenizenId;
const ALC_1 = "alc_00000000-0000-0000-0000-000000000001" as AllocationId;
const ALC_2 = "alc_00000000-0000-0000-0000-000000000002" as AllocationId;
const ALC_3 = "alc_00000000-0000-0000-0000-000000000003" as AllocationId;
const ALC_MISSING = "alc_00000000-0000-0000-0000-000000000099" as AllocationId;
const MONTH = 3 as MonthOrdinal;

function placeId(n: number): PlaceId {
  return `plc_00000000-0000-0000-0000-${String(n).padStart(12, "0")}` as PlaceId;
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

function baseV5(): CampaignStateV5 {
  return makeTestCampaignStateV5({
    calendar: { monthOrdinal: MONTH },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [{
      wizardId: WIZ_A,
      name: "Wizard A",
      portrayedByPlayerId: PLR_A,
      character: { ...BLANK_WIZARD_CHARACTER_V5 },
      homeIsleId: null,
      sanctumPlaceId: null,
      mortalityState: "not_deceased",
    }, {
      wizardId: WIZ_B,
      name: "Wizard B",
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

function withPlayTime(
  state: CampaignStateV5,
  allocations: readonly {
    readonly allocationId: AllocationId;
    readonly destination: CampaignStateV5 extends { schemaVersion: 5 } ? unknown : never;
    readonly resolution?: "pending" | "spent" | "wasted";
    readonly wizardId?: WizardId;
  }[],
  phase: "planning" | "story" = "planning",
): CampaignStateV5 {
  const byWizard = new Map<WizardId, typeof allocations>();
  for (const alloc of allocations) {
    const wizardId = alloc.wizardId ?? WIZ_A;
    const current = byWizard.get(wizardId) ?? [];
    byWizard.set(wizardId, [...current, alloc]);
  }
  if (!byWizard.has(WIZ_A)) byWizard.set(WIZ_A, []);
  return {
    ...state,
    lifecycle: {
      kind: "play",
      phase,
      orrery: {
        saturn: asCentidegreePosition(0),
        jupiter: asCentidegreePosition(0),
        mars: asCentidegreePosition(0),
        venus: asCentidegreePosition(0),
        mercury: asCentidegreePosition(0),
      },
      currentMonth: {
        timeParticipants: [...byWizard.entries()].map(([wizardId, rows]) => ({
          participant: { kind: "wizard" as const, wizardId },
          effectiveBudget: 4,
          rescheduleAllowance: 1,
          reschedulesUsed: 0,
          allocations: rows.length === 0
            ? [{
              allocationId: ALC_3,
              destination: null,
              note: null,
              resolution: "pending" as const,
            }]
            : rows.map((row) => ({
              allocationId: row.allocationId,
              destination: row.destination as never,
              note: null,
              resolution: row.resolution ?? "pending",
            })),
        })),
        engagements: [],
        wizardmootAttendance: null,
      },
    },
  };
}

function received(
  woe = 2,
  classId: "peasant" | "gentry" | "merchant" | "artisan" | "pariah" = "peasant",
): CampaignStateV5 {
  return applyCreateHierophantSupplicant(
    initialized(),
    canonicalizeCreateHierophantSupplicantInput({
      denizenId: DEN_ANN,
      name: "Acolyte Ann",
      classId,
      woe,
      templeId: "krolis",
      area: "courtyard",
      expectedTempleStatus: "active",
    }),
  ).nextState;
}

function scheduledOnAnn(woe = 2, classId: "peasant" | "gentry" = "peasant"): CampaignStateV5 {
  const play = withPlayTime(received(woe, classId), [{
    allocationId: ALC_1,
    destination: null,
  }]);
  return applyScheduleTime(play, {
    expectedMonthOrdinal: MONTH,
    allocationId: ALC_1,
    destination: { kind: "hierophant_supplicant", denizenId: DEN_ANN },
    note: null,
  }).nextState;
}

function allocationOf(state: CampaignStateV5, allocationId: AllocationId) {
  if (state.lifecycle.kind !== "play") throw new Error("not play");
  for (const tp of state.lifecycle.currentMonth.timeParticipants) {
    const alloc = tp.allocations.find((entry) => entry.allocationId === allocationId);
    if (alloc !== undefined) return alloc;
  }
  return null;
}

function personOf(state: CampaignStateV5, denizenId: DenizenId) {
  return state.hierophant.supplicants.find((entry) => entry.denizenId === denizenId);
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

async function executeSteer(
  io: OrdinaryLogicalCommandIo,
  args: {
    readonly commandId: string;
    readonly expectedCampaignId: string;
    readonly expectedRevision: number;
    readonly allocationId: string;
    readonly denizenId: string;
    readonly destinationTempleId: string;
    readonly destinationArea: "courtyard" | "agiary" | null;
  },
): Promise<{ kind: "accepted"; revision: number }> {
  parseLiveCommandId(args.commandId);
  validateM5ExpectedCampaignId(args.expectedCampaignId);
  const fingerprint = steerHierophantSupplicantFingerprint(
    args.expectedCampaignId,
    args.expectedRevision,
    args.allocationId,
    args.denizenId,
    args.destinationTempleId,
    args.destinationArea,
  );
  const campaign = await io.loadCanonicalCampaign();
  assertM5ExpectedCampaignIdMatches(args.expectedCampaignId, campaign.campaignId);
  const existing = await io.findAcceptedCommand(campaign.campaignId, args.commandId);
  const replay = resolveAcceptedCommandReplay(args.commandId, existing, {
    commandType: "steer_hierophant_supplicant",
    commandFingerprint: fingerprint,
  });
  if (replay.kind === "replay") {
    return { kind: "accepted", revision: replay.revision };
  }
  assertHierophantSteerRevision(campaign.currentRevision, args.expectedRevision);
  const result = applySteerHierophantSupplicant(campaign.currentState, {
    allocationId: args.allocationId as AllocationId,
    denizenId: args.denizenId as DenizenId,
    destinationTempleId: args.destinationTempleId as HierophantTempleId,
    destinationArea: args.destinationArea,
  });
  const receipt = await io.commit({
    campaignDocId: campaign.docId,
    campaignId: campaign.campaignId,
    currentRevision: campaign.currentRevision,
    currentState: campaign.currentState,
    commandId: args.commandId,
    commandType: "steer_hierophant_supplicant",
    commandFingerprint: fingerprint,
    nextState: result.nextState,
    events: result.events,
    historyControlUpdate: { kind: "logical_state_append" },
  });
  return { kind: "accepted", revision: receipt.newRevision };
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
  validator: { kind?: string; value?: unknown; members?: unknown[]; element?: unknown; fields?: Record<string, unknown>; inner?: unknown } | undefined,
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
      const fields = validator.fields as Record<string, { kind?: string }>;
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

describe("hierophant_supplicant Time destination", () => {
  it("serializes and validates a scheduled Hierophant Supplicant destination", () => {
    const next = scheduledOnAnn();
    const alloc = allocationOf(next, ALC_1);
    expect(alloc?.destination).toEqual({ kind: "hierophant_supplicant", denizenId: DEN_ANN });
    expect(() => validateCampaignStateV5Candidate(next)).not.toThrow();
    expect(matchesValidator(timeDestinationV5Validator as never, {
      kind: "hierophant_supplicant",
      denizenId: DEN_ANN,
    })).toBe(true);
    expect(matchesValidator(timeDestinationV5Validator as never, { kind: "domain" })).toBe(true);
    expect(matchesValidator(timeDestinationV5Validator as never, {
      kind: "hierophant_supplicant",
    })).toBe(false);
  });

  it("rejects scheduling on a denizen that is not a current Supplicant", () => {
    const withOther = applyCreateDenizenV5Candidate(received(), {
      denizenId: DEN_OTHER,
      name: "Not a Supplicant",
      representation: "individual",
      description: null,
    }).nextState;
    const play = withPlayTime(withOther, [{ allocationId: ALC_1, destination: null }]);
    expectDomainError(
      () => applyScheduleTime(play, {
        expectedMonthOrdinal: MONTH,
        allocationId: ALC_1,
        destination: { kind: "hierophant_supplicant", denizenId: DEN_OTHER },
        note: null,
      }),
      "INVALID_CAMPAIGN_STATE",
      /not a current Supplicant/,
    );
  });

  it("keeps ordinary existing Time destinations valid", () => {
    const play = withPlayTime(received(), [
      { allocationId: ALC_1, destination: null },
      { allocationId: ALC_2, destination: null },
    ]);
    const domain = applyScheduleTime(play, {
      expectedMonthOrdinal: MONTH,
      allocationId: ALC_1,
      destination: { kind: "domain" },
      note: null,
    }).nextState;
    const companion = applyScheduleTime(domain, {
      expectedMonthOrdinal: MONTH,
      allocationId: ALC_2,
      destination: { kind: "companion", element: "fire" },
      note: null,
    }).nextState;
    expect(allocationOf(companion, ALC_1)?.destination).toEqual({ kind: "domain" });
    expect(allocationOf(companion, ALC_2)?.destination).toEqual({ kind: "companion", element: "fire" });
    expect(() => validateCampaignStateV5Candidate(companion)).not.toThrow();
  });

  it("remains structurally valid after the targeted denizen ceases to be a current Supplicant", () => {
    const scheduled = scheduledOnAnn();
    const removed = applyRemoveSupplicant(scheduled, DEN_ANN).nextState;
    expect(removed.hierophant.supplicants).toHaveLength(0);
    expect(allocationOf(removed, ALC_1)?.destination).toEqual({
      kind: "hierophant_supplicant",
      denizenId: DEN_ANN,
    });
    expect(() => validateCampaignStateV5Candidate(removed)).not.toThrow();
  });

  it("round-trips through portable backup validation", async () => {
    const scheduled = scheduledOnAnn();
    const backup = await buildExportBackup({
      sourceCampaignId: CAMPAIGN_A,
      sourceCampaignRevision: 5,
      sourceLogicalRevision: 5,
      state: scheduled,
    }, 1700000000000);
    const result = await fullyValidateBackup(JSON.stringify(backup), scheduled);
    expect("backup" in result).toBe(true);
    if (!("backup" in result)) return;
    expect(statesDeepEqual(result.backup.state, scheduled)).toBe(true);
  });
});

describe("applySteerHierophantSupplicant", () => {
  it("spends matching Time, moves the Supplicant, and removes 1 Woe without Benefaction", () => {
    const before = scheduledOnAnn(2);
    const frozen = JSON.stringify(before);
    const result = applySteerHierophantSupplicant(before, {
      allocationId: ALC_1,
      denizenId: DEN_ANN,
      destinationTempleId: "notor",
      destinationArea: "agiary",
    });
    expect(JSON.stringify(before)).toBe(frozen);
    expect(allocationOf(result.nextState, ALC_1)?.resolution).toBe("spent");
    const person = personOf(result.nextState, DEN_ANN);
    expect(person?.woe).toBe(1);
    expect(person?.host).toEqual({ kind: "temple", templeId: "notor", area: "agiary" });
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toEqual({
      type: "hierophant_supplicant_steered",
      version: 1,
      data: {
        denizenId: DEN_ANN,
        denizenName: "Acolyte Ann",
        allocationId: ALC_1,
        fromHost: { kind: "temple", templeId: "krolis", area: "courtyard" },
        toHost: { kind: "temple", templeId: "notor", area: "agiary" },
        woeBefore: 2,
        woeAfter: 1,
      },
    });
    expect(result.nextState.hierophant.supplicants).toHaveLength(1);
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
    const activity = mapEventToActivityEntry("evt_1", 5, result.events[0] as HierophantSupplicantSteeredEventV1);
    expect(describeActivityEntry(activity)).toContain("Steered Supplicant");
  });

  it("lets Woe 1 become 0 without automatic Benefaction", () => {
    const before = scheduledOnAnn(1, "gentry");
    const krolisBefore = beforeAbundance(before, "krolis");
    const result = applySteerHierophantSupplicant(before, {
      allocationId: ALC_1,
      denizenId: DEN_ANN,
      destinationTempleId: "hestar",
      destinationArea: null,
    });
    const person = personOf(result.nextState, DEN_ANN);
    expect(person?.woe).toBe(0);
    expect(person?.host).toEqual({ kind: "temple", templeId: "hestar", area: null });
    expect(result.events.map((event) => event.type)).toEqual(["hierophant_supplicant_steered"]);
    expect(result.nextState.hierophant.temples.find((temple) => temple.templeId === "krolis")?.abundance)
      .toBe(krolisBefore);
  });

  it("rejects a week scheduled on a different Supplicant", () => {
    const other = applyCreateHierophantSupplicant(
      received(),
      canonicalizeCreateHierophantSupplicantInput({
        denizenId: DEN_OTHER,
        name: "Other",
        classId: "artisan",
        woe: 3,
        templeId: "notor",
        area: "courtyard",
        expectedTempleStatus: "active",
      }),
    ).nextState;
    const play = withPlayTime(other, [{
      allocationId: ALC_1,
      destination: { kind: "hierophant_supplicant", denizenId: DEN_OTHER },
    }]);
    expectDomainError(
      () => applySteerHierophantSupplicant(play, {
        allocationId: ALC_1,
        denizenId: DEN_ANN,
        destinationTempleId: "ushin",
        destinationArea: "courtyard",
      }),
      "INVALID_CAMPAIGN_STATE",
      /not scheduled on this Supplicant/,
    );
  });

  it("rejects generic Domain Time and spent or missing allocations", () => {
    const domain = withPlayTime(received(), [{
      allocationId: ALC_1,
      destination: { kind: "domain" },
    }]);
    expectDomainError(
      () => applySteerHierophantSupplicant(domain, {
        allocationId: ALC_1,
        denizenId: DEN_ANN,
        destinationTempleId: "notor",
        destinationArea: "courtyard",
      }),
      "INVALID_CAMPAIGN_STATE",
      /not scheduled on this Supplicant/,
    );
    const spent = withPlayTime(received(), [{
      allocationId: ALC_1,
      destination: { kind: "hierophant_supplicant", denizenId: DEN_ANN },
      resolution: "spent",
    }]);
    expectDomainError(
      () => applySteerHierophantSupplicant(spent, {
        allocationId: ALC_1,
        denizenId: DEN_ANN,
        destinationTempleId: "notor",
        destinationArea: "courtyard",
      }),
      "INVALID_CAMPAIGN_STATE",
      /spent, not pending/,
    );
    expectDomainError(
      () => applySteerHierophantSupplicant(scheduledOnAnn(), {
        allocationId: ALC_MISSING,
        denizenId: DEN_ANN,
        destinationTempleId: "notor",
        destinationArea: "courtyard",
      }),
      "INVALID_CAMPAIGN_STATE",
      /not found/,
    );
  });

  it("does not allow spend_manual_time to resolve Hierophant Supplicant Time", () => {
    const story = withPlayTime(received(), [{
      allocationId: ALC_1,
      destination: { kind: "hierophant_supplicant", denizenId: DEN_ANN },
    }], "story");
    expectDomainError(
      () => applySpendManualTime(story, {
        expectedMonthOrdinal: MONTH,
        allocationId: ALC_1,
      }),
      "INVALID_CAMPAIGN_STATE",
      /cannot resolve destination kind "hierophant_supplicant"/,
    );
  });
});

function beforeAbundance(state: CampaignStateV5, templeId: string): number {
  const temple = state.hierophant.temples.find((entry) => entry.templeId === templeId);
  if (temple === undefined) throw new Error(`missing ${templeId}`);
  return temple.abundance;
}

describe("steer_hierophant_supplicant command harness", () => {
  it("commits one event, one revision, and replays the same command id", async () => {
    const before = scheduledOnAnn();
    const first = recordingIo({ campaign: campaignOf(before) });
    const receipt = await executeSteer(first.io, {
      commandId: COMMAND_1,
      expectedCampaignId: CAMPAIGN_A,
      expectedRevision: 4,
      allocationId: ALC_1,
      denizenId: DEN_ANN,
      destinationTempleId: "notor",
      destinationArea: "agiary",
    });
    expect(receipt).toEqual({ kind: "accepted", revision: 5 });
    expect(first.commits).toHaveLength(1);
    expect(first.commits[0]?.events).toHaveLength(1);
    expect(first.commits[0]?.events[0]?.type).toBe("hierophant_supplicant_steered");
    expect(() => validateEventCoherenceForTest(first.commits[0]!, 5)).not.toThrow();

    const replay = recordingIo({
      campaign: campaignOf(first.commits[0]!.nextState, 5),
      accepted: {
        commandType: "steer_hierophant_supplicant",
        commandFingerprint: steerHierophantSupplicantFingerprint(
          CAMPAIGN_A,
          4,
          ALC_1,
          DEN_ANN,
          "notor",
          "agiary",
        ),
        campaignRevision: 5,
      },
      snapshot: first.commits[0]!.nextState,
    });
    const replayed = await executeSteer(replay.io, {
      commandId: COMMAND_1,
      expectedCampaignId: CAMPAIGN_A,
      expectedRevision: 4,
      allocationId: ALC_1,
      denizenId: DEN_ANN,
      destinationTempleId: "notor",
      destinationArea: "agiary",
    });
    expect(replayed).toEqual({ kind: "accepted", revision: 5 });
    expect(replay.commits).toHaveLength(0);
  });

  it("rejects a stale revision without committing", async () => {
    const stale = recordingIo({ campaign: campaignOf(scheduledOnAnn(), 9) });
    await expect(executeSteer(stale.io, {
      commandId: COMMAND_1,
      expectedCampaignId: CAMPAIGN_A,
      expectedRevision: 4,
      allocationId: ALC_1,
      denizenId: DEN_ANN,
      destinationTempleId: "notor",
      destinationArea: "courtyard",
    })).rejects.toMatchObject({ code: "STALE_CAMPAIGN_REVISION" });
    expect(stale.commits).toHaveLength(0);
  });

  it("is a logical-state command with a typed fingerprint", () => {
    expect(isLogicalStateCommandType("steer_hierophant_supplicant")).toBe(true);
    expect(isLogicalStateCommandType("depart_hierophant_supplicant_with_benefaction")).toBe(true);
    const fp = steerHierophantSupplicantFingerprint(CAMPAIGN_A, 4, ALC_1, DEN_ANN, "notor", "agiary");
    expect(fp).toMatch(/^steer_hierophant_supplicant:v1:/);
    expect(fp).not.toBe(steerHierophantSupplicantFingerprint(CAMPAIGN_A, 4, ALC_1, DEN_ANN, "ushin", "agiary"));
  });

  it("matches event validators and Convex mutation shape", () => {
    const valid: HierophantSupplicantSteeredEventV1 = {
      type: "hierophant_supplicant_steered",
      version: 1,
      data: {
        denizenId: DEN_ANN,
        denizenName: "Acolyte Ann",
        allocationId: ALC_1,
        fromHost: { kind: "temple", templeId: "krolis", area: "courtyard" },
        toHost: { kind: "temple", templeId: "notor", area: "agiary" },
        woeBefore: 2,
        woeAfter: 1,
      },
    };
    expect(findValidatorMembers(campaignEventValidator as never, "hierophant_supplicant_steered", 1)).toHaveLength(1);
    expect(matchesValidator(campaignEventValidator as never, valid)).toBe(true);
    expect(matchesValidator(campaignEventValidator as never, { ...valid, version: 2 })).toBe(false);
    const source = readFileSync(join(__dirname, "../convex/m3Commands.ts"), "utf8");
    const start = source.indexOf("export const steerHierophantSupplicant");
    const end = source.indexOf("export const departHierophantSupplicantWithBenefaction");
    const body = source.slice(start, end);
    expect(body).toContain("expectedRevision");
    expect(body).toContain("applySteerHierophantSupplicant");
    expect(body).not.toContain("updateSupplicant");
    expect(body).not.toContain("spend_manual_time");
  });
});

describe("applyDepartHierophantSupplicantWithBenefaction", () => {
  it("grants class Benefaction, removes the Supplicant role, and leaves the person in the World", () => {
    const ready = {
      ...received(0, "gentry"),
      hierophant: {
        ...received(0, "gentry").hierophant,
        temples: received(0, "gentry").hierophant.temples.map((temple) => (
          temple.templeId === "krolis" ? { ...temple, abundance: 5 } : temple
        )),
      },
    };
    const result = applyDepartHierophantSupplicantWithBenefaction(ready, { denizenId: DEN_ANN });
    expect(result.nextState.hierophant.supplicants).toHaveLength(0);
    expect(result.nextState.world.denizens.some((denizen) => denizen.denizenId === DEN_ANN)).toBe(true);
    expect(result.nextState.hierophant.temples.find((temple) => temple.templeId === "krolis")?.abundance).toBe(9);
    expect(result.events).toEqual([{
      type: "hierophant_supplicant_benefaction_departed",
      version: 1,
      data: {
        denizenId: DEN_ANN,
        denizenName: "Acolyte Ann",
        classId: "gentry",
        templeId: "krolis",
        resource: "abundance",
        amount: 4,
        resourceBefore: 5,
        resourceAfter: 9,
      },
    }]);
    expect(() => validateCampaignStateV5Candidate(result.nextState)).not.toThrow();
    const activity = mapEventToActivityEntry(
      "evt_1",
      6,
      result.events[0] as HierophantSupplicantBenefactionDepartedEventV1,
    );
    expect(describeActivityEntry(activity)).toContain("Benefaction");
  });

  it("rejects Woe above 0 and Cult hosts", () => {
    expectDomainError(
      () => applyDepartHierophantSupplicantWithBenefaction(received(1), { denizenId: DEN_ANN }),
      "INVALID_CAMPAIGN_STATE",
      /Woe 0/,
    );
    const cultHost = {
      ...received(0),
      hierophant: {
        ...received(0).hierophant,
        supplicants: received(0).hierophant.supplicants.map((person) => ({
          ...person,
          host: { kind: "cult" as const, cultDenizenId: DEN_OTHER },
        })),
      },
    };
    expectDomainError(
      () => applyDepartHierophantSupplicantWithBenefaction(cultHost, { denizenId: DEN_ANN }),
      "INVALID_CAMPAIGN_STATE",
      /Temple host/,
    );
  });

  it("does not auto-invoke after Steer and keeps Benefaction as its own command", () => {
    expect(assertHierophantBenefactionDepartRevision(4, 4)).toBeUndefined();
    expect(() => assertHierophantBenefactionDepartRevision(9, 4)).toThrow(DomainError);
    const fp = departHierophantSupplicantWithBenefactionFingerprint(CAMPAIGN_A, 4, DEN_ANN);
    expect(fp).toMatch(/^depart_hierophant_supplicant_with_benefaction:v1:/);
    const valid: HierophantSupplicantBenefactionDepartedEventV1 = {
      type: "hierophant_supplicant_benefaction_departed",
      version: 1,
      data: {
        denizenId: DEN_ANN,
        denizenName: "Acolyte Ann",
        classId: "peasant",
        templeId: "krolis",
        resource: "conviction",
        amount: 1,
        resourceBefore: 4,
        resourceAfter: 5,
      },
    };
    expect(findValidatorMembers(campaignEventValidator as never, "hierophant_supplicant_benefaction_departed", 1)).toHaveLength(1);
    expect(matchesValidator(campaignEventValidator as never, valid)).toBe(true);
  });
});
