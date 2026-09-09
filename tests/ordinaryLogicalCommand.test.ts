import { describe, it, expect } from "vitest";
import type {
  CampaignStateV5,
  CampaignWizardV5,
  MonthOrdinal,
  PlayerId,
  WizardId,
  DenizenId,
  CompanionRelationshipId,
  CurrentCampaignState,
  CampaignCommandType,
  CampaignEvent,
} from "../shared/domain";
import {
  SEVEN_PART_PACT_DRAFT4_ID,
  SEVEN_PART_PACT_DRAFT4_VERSION,
  DomainError,
  BLANK_WIZARD_CHARACTER_V5,
  EMPTY_SHARED_WORLD_STATE,
  EMPTY_HIEROPHANT_STATE,
  EMPTY_MARINER_STATE,
  EMPTY_NECROMANCER_STATE,
  isValidDenizenId,
  isValidWizardId,
  createDenizenFingerprint,
  updateDenizenFingerprint,
  setWizardCompanionFingerprint,
} from "../shared/domain";
import { applyCreateDenizenV5Candidate } from "../shared/domain/world-subject-transitions";
import { applyUpdateDenizenV5Candidate } from "../shared/domain/world-subject-transitions";
import { applySetWizardCompanionV5Candidate } from "../shared/domain/world-relationship-transitions";
import { validateEventCoherenceForTest } from "../convex/canonicalCommit";
import type { CanonicalCommitInput, CanonicalCommitReceipt } from "../convex/canonicalCommit";
import {
  executeOrdinaryLogicalCommand,
  type OrdinaryLogicalCommandIo,
  type OrdinaryLogicalCommandPreparation,
  type CanonicalCampaign,
} from "../convex/ordinaryLogicalCommand";

const CAMPAIGN_A = "cmp_00000000-0000-0000-0000-000000000001";
const CAMPAIGN_B = "cmp_00000000-0000-0000-0000-000000000002";
const COMMAND_1 = "cmd_00000000-0000-0000-0000-000000000001";
const COMMAND_2 = "cmd_00000000-0000-0000-0000-000000000002";
const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const DEN_1 = "den_00000000-0000-0000-0000-000000000001" as DenizenId;
const DEN_2 = "den_00000000-0000-0000-0000-000000000002" as DenizenId;
const CMPREL_1 = "cmprel_00000000-0000-0000-0000-000000000001" as CompanionRelationshipId;
const CMPREL_2 = "cmprel_00000000-0000-0000-0000-000000000002" as CompanionRelationshipId;

const EMPTY_PACT_SEATS = {
  necromancer: { status: null, wizardId: null, watcherPlayerId: null },
  hierophant: { status: null, wizardId: null, watcherPlayerId: null },
  warlock: { status: null, wizardId: null, watcherPlayerId: null },
  mariner: { status: null, wizardId: null, watcherPlayerId: null },
  faustian: { status: null, wizardId: null, watcherPlayerId: null },
  sage: { status: null, wizardId: null, watcherPlayerId: null },
  sorcerer: { status: null, wizardId: null, watcherPlayerId: null },
} as const;

function blankV5Wizard(overrides?: Partial<CampaignWizardV5>): CampaignWizardV5 {
  return {
    wizardId: WIZ_A,
    name: "Wizard A",
    portrayedByPlayerId: PLR_A,
    character: { ...BLANK_WIZARD_CHARACTER_V5 },
    homeIsleId: null,
    sanctumPlaceId: null,
    ...overrides,
  };
}

function baseV5(world?: Partial<CampaignStateV5["world"]>): CampaignStateV5 {
  return {
    schemaVersion: 5,
    ruleset: { id: SEVEN_PART_PACT_DRAFT4_ID, version: SEVEN_PART_PACT_DRAFT4_VERSION },
    calendar: { monthOrdinal: 0 as MonthOrdinal },
    configuration: { ageId: null, facilitatorPlayerId: null },
    players: [{ playerId: PLR_A, name: "Alice" }],
    wizards: [blankV5Wizard()],
    pactSeats: EMPTY_PACT_SEATS,
    lifecycle: {
      kind: "setup",
      orrery: { saturn: null, jupiter: null, mars: null, venus: null, mercury: null },
    },
    wizardmootHistory: [],
    world: { ...EMPTY_SHARED_WORLD_STATE, ...world },
    hierophant: { ...EMPTY_HIEROPHANT_STATE },
    mariner: { ...EMPTY_MARINER_STATE },
    necromancer: { ...EMPTY_NECROMANCER_STATE },
  };
}

function campaignOf(campaignId: string, state: CurrentCampaignState, revision = 4): CanonicalCampaign {
  return {
    docId: "dummy" as CanonicalCommitInput["campaignDocId"],
    campaignId,
    currentRevision: revision,
    currentState: state,
  };
}

type IoCall =
  | "assertNotDeleting"
  | "loadCanonicalCampaign"
  | "findAcceptedCommand"
  | "loadCommittedSnapshot"
  | "commit";

function recordingIo(options: {
  campaign: CanonicalCampaign;
  accepted?: { commandType: string; commandFingerprint: string; campaignRevision: number } | null;
  snapshot?: unknown | null;
}): {
  io: OrdinaryLogicalCommandIo;
  calls: IoCall[];
  commits: CanonicalCommitInput[];
} {
  const calls: IoCall[] = [];
  const commits: CanonicalCommitInput[] = [];
  const io: OrdinaryLogicalCommandIo = {
    async assertNotDeleting() {
      calls.push("assertNotDeleting");
    },
    async loadCanonicalCampaign() {
      calls.push("loadCanonicalCampaign");
      return options.campaign;
    },
    async findAcceptedCommand(_campaignId, _commandId) {
      calls.push("findAcceptedCommand");
      return options.accepted === undefined ? null : options.accepted;
    },
    async loadCommittedSnapshot(_campaignId, _revision) {
      calls.push("loadCommittedSnapshot");
      if (options.snapshot === undefined) {
        return options.campaign.currentState;
      }
      return options.snapshot;
    },
    async commit(input) {
      calls.push("commit");
      commits.push(input);
      const receipt: CanonicalCommitReceipt = {
        newRevision: options.campaign.currentRevision + 1,
        state: input.nextState,
        alreadyApplied: false,
      };
      return receipt;
    },
  };
  return { io, calls, commits };
}

function trackApply(prepare: () => OrdinaryLogicalCommandPreparation): {
  prepare: () => OrdinaryLogicalCommandPreparation;
  applyCount: { n: number };
} {
  const applyCount = { n: 0 };
  return {
    applyCount,
    prepare: () => {
      const prepared = prepare();
      return {
        ...prepared,
        apply: (state) => {
          applyCount.n += 1;
          return prepared.apply(state);
        },
      };
    },
  };
}

function prepareCreateDenizen(args: {
  expectedCampaignId: string;
  denizenId: string;
  name: string;
  representation: "individual" | "collective";
  description: string | null;
}): OrdinaryLogicalCommandPreparation {
  if (!isValidDenizenId(args.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${args.denizenId}`);
  }
  return {
    commandType: "create_denizen",
    commandFingerprint: createDenizenFingerprint(
      args.expectedCampaignId,
      args.denizenId,
      args.name,
      args.representation,
      args.description,
    ),
    apply: (state) =>
      applyCreateDenizenV5Candidate(state, {
        denizenId: args.denizenId as DenizenId,
        name: args.name,
        representation: args.representation,
        description: args.description,
      }),
  };
}

function prepareUpdateDenizen(args: {
  expectedCampaignId: string;
  denizenId: string;
  fields: {
    name?: { expected: string; value: string };
    representation?: { expected: "individual" | "collective"; value: "individual" | "collective" };
    description?: { expected: string | null; value: string | null };
  };
}): OrdinaryLogicalCommandPreparation {
  if (!isValidDenizenId(args.denizenId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid denizenId: ${args.denizenId}`);
  }
  return {
    commandType: "update_denizen",
    commandFingerprint: updateDenizenFingerprint(args.expectedCampaignId, args.denizenId, args.fields),
    apply: (state) => applyUpdateDenizenV5Candidate(state, args.denizenId as DenizenId, args.fields),
  };
}

function prepareSetWizardCompanion(args: {
  expectedCampaignId: string;
  wizardId: string;
  element: "air" | "fire" | "earth" | "water";
  expectedCurrentRelationshipId: string | null;
  newRelationship: {
    companionRelationshipId: string;
    denizenId: string;
    description: string | null;
  } | null;
}): OrdinaryLogicalCommandPreparation {
  if (!isValidWizardId(args.wizardId)) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `Invalid wizardId: ${args.wizardId}`);
  }
  return {
    commandType: "set_wizard_companion",
    commandFingerprint: setWizardCompanionFingerprint(args),
    apply: (state) =>
      applySetWizardCompanionV5Candidate(state, {
        wizardId: args.wizardId as WizardId,
        element: args.element,
        expectedCurrentRelationshipId: args.expectedCurrentRelationshipId as CompanionRelationshipId | null,
        newRelationship:
          args.newRelationship === null
            ? null
            : {
                companionRelationshipId: args.newRelationship.companionRelationshipId as CompanionRelationshipId,
                denizenId: args.newRelationship.denizenId as DenizenId,
                description: args.newRelationship.description,
              },
      }),
  };
}

async function expectDomainError(
  fn: () => Promise<unknown>,
  code: string,
): Promise<DomainError> {
  let caught: DomainError | null = null;
  try {
    await fn();
  } catch (e) {
    caught = e as DomainError;
  }
  expect(caught).toBeInstanceOf(DomainError);
  expect(caught!.code).toBe(code);
  return caught!;
}

describe("ordinary logical command executor", () => {
  describe("createDenizen", () => {
    const createArgs = {
      expectedCampaignId: CAMPAIGN_A,
      denizenId: DEN_1,
      name: "Elder Thorn",
      representation: "individual" as const,
      description: null,
    };

    it("protects expected campaign identity and compares before replay", async () => {
      const state = baseV5();
      const { io, calls, commits } = recordingIo({ campaign: campaignOf(CAMPAIGN_B, state) });
      const tracked = trackApply(() => prepareCreateDenizen(createArgs));

      await expectDomainError(
        () =>
          executeOrdinaryLogicalCommand(
            io,
            { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
            tracked.prepare,
          ),
        "STALE_COMMAND_PRECONDITION",
      );

      expect(calls).toEqual(["assertNotDeleting", "loadCanonicalCampaign"]);
      expect(calls).not.toContain("findAcceptedCommand");
      expect(tracked.applyCount.n).toBe(0);
      expect(commits).toHaveLength(0);
    });

    it("returns the original receipt on accepted replay and skips transition/commit", async () => {
      const state = baseV5();
      const fingerprint = createDenizenFingerprint(
        CAMPAIGN_A,
        DEN_1,
        "Elder Thorn",
        "individual",
        null,
      );
      const { io, calls, commits } = recordingIo({
        campaign: campaignOf(CAMPAIGN_A, state, 7),
        accepted: {
          commandType: "create_denizen",
          commandFingerprint: fingerprint,
          campaignRevision: 5,
        },
        snapshot: state,
      });
      const tracked = trackApply(() => prepareCreateDenizen(createArgs));

      const receipt = await executeOrdinaryLogicalCommand(
        io,
        { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
        tracked.prepare,
      );

      expect(receipt).toEqual({ revision: 5 });
      expect(calls).toEqual([
        "assertNotDeleting",
        "loadCanonicalCampaign",
        "findAcceptedCommand",
        "loadCommittedSnapshot",
      ]);
      expect(tracked.applyCount.n).toBe(0);
      expect(commits).toHaveLength(0);
    });

    it("rejects incompatible command-ID reuse with production COMMAND_ID_REUSED semantics", async () => {
      const state = baseV5();
      const committedFingerprint = createDenizenFingerprint(
        CAMPAIGN_A,
        DEN_1,
        "Elder Thorn",
        "individual",
        null,
      );
      const { io, calls, commits } = recordingIo({
        campaign: campaignOf(CAMPAIGN_A, state),
        accepted: {
          commandType: "create_denizen",
          commandFingerprint: committedFingerprint,
          campaignRevision: 3,
        },
      });
      const tracked = trackApply(() =>
        prepareCreateDenizen({ ...createArgs, name: "Different Name" }),
      );

      const err = await expectDomainError(
        () =>
          executeOrdinaryLogicalCommand(
            io,
            { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
            tracked.prepare,
          ),
        "COMMAND_ID_REUSED",
      );

      expect(err.message).toContain(COMMAND_1);
      expect(err.message).toContain("create_denizen");
      expect(calls).toEqual(["assertNotDeleting", "loadCanonicalCampaign", "findAcceptedCommand"]);
      expect(calls).not.toContain("loadCommittedSnapshot");
      expect(tracked.applyCount.n).toBe(0);
      expect(commits).toHaveLength(0);
    });

    it("does not commit when the authoritative transition fails", async () => {
      const state = baseV5({
        denizens: [{ denizenId: DEN_1, name: "Existing", representation: "individual", description: null }],
      });
      const { io, commits } = recordingIo({ campaign: campaignOf(CAMPAIGN_A, state) });
      const tracked = trackApply(() => prepareCreateDenizen(createArgs));

      await expectDomainError(
        () =>
          executeOrdinaryLogicalCommand(
            io,
            { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
            tracked.prepare,
          ),
        "INVALID_CAMPAIGN_STATE",
      );

      expect(tracked.applyCount.n).toBe(1);
      expect(commits).toHaveLength(0);
    });

    it("commits the actual transition event and canonical coherence accepts it", async () => {
      const state = baseV5();
      const { io, commits } = recordingIo({ campaign: campaignOf(CAMPAIGN_A, state, 4) });

      const receipt = await executeOrdinaryLogicalCommand(
        io,
        { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
        () => prepareCreateDenizen(createArgs),
      );

      expect(receipt).toEqual({ revision: 5 });
      expect(commits).toHaveLength(1);
      const committed = commits[0];
      expect(committed.commandType).toBe("create_denizen" satisfies CampaignCommandType);
      expect(committed.events).toHaveLength(1);
      expect(committed.events[0].type).toBe("denizen_created");
      expect((committed.events[0] as CampaignEvent & { type: "denizen_created" }).data.denizen.name).toBe(
        "Elder Thorn",
      );
      expect(() => validateEventCoherenceForTest(committed, committed.currentRevision + 1)).not.toThrow();
    });

    it("leaves unrelated CampaignState intact", async () => {
      const state = baseV5({
        denizens: [{ denizenId: DEN_2, name: "Orin", representation: "collective", description: "Keep me" }],
      });
      const { io, commits } = recordingIo({ campaign: campaignOf(CAMPAIGN_A, state) });

      await executeOrdinaryLogicalCommand(
        io,
        { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
        () => prepareCreateDenizen(createArgs),
      );

      const next = commits[0].nextState;
      expect(next.players).toEqual(state.players);
      expect(next.wizards).toEqual(state.wizards);
      expect(next.pactSeats).toEqual(state.pactSeats);
      expect(next.world.denizens.find((d) => d.denizenId === DEN_2)?.name).toBe("Orin");
      expect(next.world.denizens.find((d) => d.denizenId === DEN_1)?.name).toBe("Elder Thorn");
    });
  });

  describe("updateDenizen", () => {
    it("retains field-level expected-value rejection and does not commit", async () => {
      const state = baseV5({
        denizens: [{ denizenId: DEN_1, name: "Mara the Red", representation: "individual", description: null }],
      });
      const { io, commits } = recordingIo({ campaign: campaignOf(CAMPAIGN_A, state) });
      const tracked = trackApply(() =>
        prepareUpdateDenizen({
          expectedCampaignId: CAMPAIGN_A,
          denizenId: DEN_1,
          fields: { name: { expected: "Mara", value: "Mara of Ishana" } },
        }),
      );

      await expectDomainError(
        () =>
          executeOrdinaryLogicalCommand(
            io,
            { commandId: COMMAND_2, expectedCampaignId: CAMPAIGN_A },
            tracked.prepare,
          ),
        "STALE_COMMAND_PRECONDITION",
      );
      expect(commits).toHaveLength(0);
      expect(state.world.denizens[0].name).toBe("Mara the Red");
    });

    it("applies a matching field change, preserves unrelated fields, and emits a coherent event", async () => {
      const state = baseV5({
        denizens: [
          {
            denizenId: DEN_1,
            name: "Mara",
            representation: "individual",
            description: "Written by another client",
          },
          { denizenId: DEN_2, name: "Orin", representation: "collective", description: null },
        ],
      });
      const { io, commits } = recordingIo({ campaign: campaignOf(CAMPAIGN_A, state) });

      await executeOrdinaryLogicalCommand(
        io,
        { commandId: COMMAND_2, expectedCampaignId: CAMPAIGN_A },
        () =>
          prepareUpdateDenizen({
            expectedCampaignId: CAMPAIGN_A,
            denizenId: DEN_1,
            fields: { name: { expected: "Mara", value: "Mara of Ishana" } },
          }),
      );

      const next = commits[0].nextState;
      const updated = next.world.denizens.find((d) => d.denizenId === DEN_1)!;
      expect(updated.name).toBe("Mara of Ishana");
      expect(updated.description).toBe("Written by another client");
      expect(next.world.denizens.find((d) => d.denizenId === DEN_2)?.name).toBe("Orin");
      expect(next.players).toEqual(state.players);
      expect(commits[0].events[0].type).toBe("denizen_updated");
      expect(() => validateEventCoherenceForTest(commits[0], commits[0].currentRevision + 1)).not.toThrow();
    });

    it("compares expectedCampaignId before accepted replay", async () => {
      const state = baseV5({
        denizens: [{ denizenId: DEN_1, name: "Mara", representation: "individual", description: null }],
      });
      const { io, calls, commits } = recordingIo({ campaign: campaignOf(CAMPAIGN_B, state) });

      await expectDomainError(
        () =>
          executeOrdinaryLogicalCommand(
            io,
            { commandId: COMMAND_2, expectedCampaignId: CAMPAIGN_A },
            () =>
              prepareUpdateDenizen({
                expectedCampaignId: CAMPAIGN_A,
                denizenId: DEN_1,
                fields: { name: { expected: "Mara", value: "Mara of Ishana" } },
              }),
          ),
        "STALE_COMMAND_PRECONDITION",
      );
      expect(calls).not.toContain("findAcceptedCommand");
      expect(commits).toHaveLength(0);
    });
  });

  describe("setWizardCompanion", () => {
    it("replaces the current relationship without mutating Denizen records", async () => {
      const state = baseV5({
        denizens: [
          { denizenId: DEN_1, name: "Mara", representation: "individual", description: null },
          { denizenId: DEN_2, name: "Orin", representation: "individual", description: null },
        ],
        companionRelationships: [
          {
            companionRelationshipId: CMPREL_1,
            wizardId: WIZ_A,
            element: "fire",
            denizenId: DEN_1,
            description: "Old companion",
            status: "current",
          },
        ],
      });
      const { io, commits } = recordingIo({ campaign: campaignOf(CAMPAIGN_A, state) });

      await executeOrdinaryLogicalCommand(
        io,
        { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
        () =>
          prepareSetWizardCompanion({
            expectedCampaignId: CAMPAIGN_A,
            wizardId: WIZ_A,
            element: "fire",
            expectedCurrentRelationshipId: CMPREL_1,
            newRelationship: {
              companionRelationshipId: CMPREL_2,
              denizenId: DEN_2,
              description: null,
            },
          }),
      );

      const rels = commits[0].nextState.world.companionRelationships;
      expect(rels.find((r) => r.companionRelationshipId === CMPREL_1)?.status).toBe("ended");
      expect(rels.find((r) => r.companionRelationshipId === CMPREL_2)?.status).toBe("current");
      expect(rels.find((r) => r.companionRelationshipId === CMPREL_2)?.denizenId).toBe(DEN_2);
      expect(commits[0].nextState.world.denizens).toEqual(state.world.denizens);
      expect(commits[0].events[0].type).toBe("wizard_companion_changed");
      expect(() => validateEventCoherenceForTest(commits[0], commits[0].currentRevision + 1)).not.toThrow();
    });

    it("rejects a stale companion slot precondition without commit", async () => {
      const state = baseV5({
        denizens: [{ denizenId: DEN_1, name: "Mara", representation: "individual", description: null }],
        companionRelationships: [
          {
            companionRelationshipId: CMPREL_1,
            wizardId: WIZ_A,
            element: "air",
            denizenId: DEN_1,
            description: null,
            status: "current",
          },
        ],
      });
      const { io, commits } = recordingIo({ campaign: campaignOf(CAMPAIGN_A, state) });

      await expectDomainError(
        () =>
          executeOrdinaryLogicalCommand(
            io,
            { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
            () =>
              prepareSetWizardCompanion({
                expectedCampaignId: CAMPAIGN_A,
                wizardId: WIZ_A,
                element: "air",
                expectedCurrentRelationshipId: null,
                newRelationship: {
                  companionRelationshipId: CMPREL_2,
                  denizenId: DEN_1,
                  description: null,
                },
              }),
          ),
        "STALE_COMMAND_PRECONDITION",
      );
      expect(commits).toHaveLength(0);
      expect(state.world.companionRelationships[0].status).toBe("current");
    });

    it("replays an accepted companion command without transition or commit", async () => {
      const state = baseV5({
        denizens: [{ denizenId: DEN_1, name: "Mara", representation: "individual", description: null }],
      });
      const companionArgs = {
        expectedCampaignId: CAMPAIGN_A,
        wizardId: WIZ_A,
        element: "water" as const,
        expectedCurrentRelationshipId: null,
        newRelationship: {
          companionRelationshipId: CMPREL_1,
          denizenId: DEN_1,
          description: null,
        },
      };
      const { io, commits } = recordingIo({
        campaign: campaignOf(CAMPAIGN_A, state, 9),
        accepted: {
          commandType: "set_wizard_companion",
          commandFingerprint: setWizardCompanionFingerprint(companionArgs),
          campaignRevision: 8,
        },
        snapshot: state,
      });
      const tracked = trackApply(() => prepareSetWizardCompanion(companionArgs));

      const receipt = await executeOrdinaryLogicalCommand(
        io,
        { commandId: COMMAND_1, expectedCampaignId: CAMPAIGN_A },
        tracked.prepare,
      );

      expect(receipt).toEqual({ revision: 8 });
      expect(tracked.applyCount.n).toBe(0);
      expect(commits).toHaveLength(0);
    });
  });
});
