# M4 Shared Monthly Play Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to execute this plan task-by-task.
>
> **Execution gate:** Do not execute persisted-state/schema/runtime work in this plan until the M4 PERSISTENCE DESIGN CHECKPOINT has been approved by the Master/user. The scalable campaign-deletion architecture described here already has separate Master approval and is incorporated into that checkpoint.

**Goal:** Deliver the first complete shared Seven-Part Pact monthly play loop: explicit campaign creation and Setup, atomic Begin Play, New Moon -> Visions -> Planning -> Story -> Meeting -> Quiet -> atomic next New Moon, with the Orrery, shared Time, Engagements, Wizardmoot attendance, scalable campaign deletion, recovery regression coverage, and the flexible Play surface shell.

**Architecture:** Preserve the existing React + Vite + TypeScript + Convex architecture. `CampaignStateV3` remains the single authoritative game-state aggregate. Existing generic revision/event/snapshot/idempotency/recovery infrastructure remains generic. M4 adds Seven-Part-Pact-specific domain modules and intent commands around that persistence core. Campaign deletion is an administrative persistence lifecycle outside CampaignState and uses a durable resumable deletion barrier.

**Tech Stack:** React + Vite + TypeScript + Convex + Vercel + Vitest

**Spec:** `docs/m4-shared-monthly-play-loop.md`

**Plan basis:** repository inspection at M4 branch commit `39e651f70473b2abc371ed080fcc2a765d7ae56d`, corrected against the approved M4 design and the Master-approved scalable campaign deletion addendum.

---

## Global Constraints

1. `CampaignState` is authoritative game state. The application is not event-sourced.
2. Clients send intent. Server/domain code computes the authoritative resulting state.
3. Normal accepted gameplay writes use the canonical transactional path and create exactly one campaign revision, one or more ordered domain events, one complete resulting snapshot, and the corresponding history-control update.
4. Audit history is immutable.
5. Persisted inconsistencies fail closed. Never guess, silently repair, or silently migrate state.
6. CampaignState V3 is the new minimum supported current/historical state baseline after the approved pre-release reset. V1/V2 state, snapshots, checkpoints, and portable backups are unsupported and fail clearly.
7. Future evolution from V3 returns to the normal persistence-evolution contract unless another explicit compatibility break is approved.
8. Undo/Redo, checkpoints, backup/import, verification, idempotency, revisions, events, and snapshots remain generic persistence/recovery concerns.
9. Do not teach generic persistence code about Time, Engagements, Wizards, planets, phases, Wizardmoot, Domains, or other Seven-Part Pact concepts except where the existing command/event-coherence boundary already maps command types to events.
10. Opening the application with no campaign must not create campaign state automatically.
11. Campaign Setup is not a seventh lunar phase. Play has exactly six phases: `new_moon`, `visions`, `planning`, `story`, `meeting`, `quiet`.
12. Sun/month is one authoritative fact. Do not persist an independent Sun position that can disagree with `calendar.monthOrdinal`.
13. Normal Orrery UI is discrete and track-aware; underlying persisted planet positions use deterministic fixed-point angles and remain capable of future exceptional off-grid legal states.
14. Four Time allocations and one Story reschedule are normal Draft-4 defaults, not schema maxima/cardinalities.
15. Present Wizards are the normal M4 monthly Time/Engagement participants. Silent/Absent seats do not receive ordinary monthly M4 resources. This is eligibility logic, not a structural limit on future source-supported participants.
16. Incomplete Planning and unresolved Story/Quiet obligations are warnings, not malformed state.
17. Do not add global revision CAS to every command. Recheck the smallest relevant authoritative context/resource transactionally.
18. Start New Campaign and Delete Campaign are administrative lifecycle operations, not gameplay commands/events. Start establishes revision 0. Delete creates no gameplay revision/event and is not Undo-able.
19. A deletion barrier blocks normal gameplay writes, recovery mutations, backup import/export, and new-campaign creation while deletion is in progress. Deletion cleanup is bounded, idempotent, resumable, and independent of the initiating browser session.
20. No Domain engines, full Watcher UI, Lore system, general Notes system, Magic engine, generic entity graph, generic task/rules engine, general scene journal, multi-campaign library, or arbitrary CampaignState editor in M4.
21. Source-defined Lore and application Notes remain conceptually distinct. M4 Time notes are explanatory only and never become Lore.
22. Surface/layout/reference-navigation state is browser-local presentation state, not CampaignState.
23. Production credentials and destructive deployment operations remain human-controlled.

---

## Repository-Grounded Starting Point

The inspected repository currently has:

- `shared/domain/campaign-state.ts` with CampaignState V1/V2 and `CurrentCampaignState = CampaignStateV2`.
- `shared/domain/state-migration.ts` with V1 -> V2 historical loading/migration support.
- `convex/validators.ts` with `anyCampaignStateValidator = union(V1, V2)` and a V2 current-state validator.
- `convex/schema.ts` with eight current tables. Six form the campaign-owned persistence graph: `campaigns`, `campaignRevisions`, `campaignEvents`, `campaignSnapshots`, `campaignHistoryControl`, `campaignCheckpoints`. Legacy `numbers` and `events` tables are not campaign-owned.
- `convex/canonicalCommit.ts` as the canonical gameplay persistence path with command/event coherence checks and generic history-control behavior.
- `convex/campaign.ts` containing current campaign access, `ensureCampaign` auto-creation, `moveMonth`, and generic Undo/Redo/checkpoint paths.
- `convex/m3Commands.ts` and `convex/m3Queries.ts` for Player/Wizard/Pact-seat setup behavior.
- `shared/domain/commands.ts`, `events.ts`, `transitions.ts`, `command-ids.ts`, and `activity.ts` as the current command/event/domain support surface.
- `src/App.tsx` as a single-page shell that currently calls `ensureCampaign`, exposes forward/backward month controls, recovery controls, and `CampaignSetup` directly.
- `src/CampaignSetup.tsx` as the current M3 setup UI.
- Vitest domain/recovery suites including `tests/m3.test.ts`, `tests/undoRedo.test.ts`, `tests/undoRedoSafety.test.ts`, `tests/checkpoints.test.ts`, `tests/backup.test.ts`, and `tests/verification.test.ts`.

Important current conflicts M4 must remove:

- `ensureCampaign` silently creates persistent state.
- `moveMonth` changes chronology independently of planets/monthly resources.
- current snapshot validators only understand V1/V2.
- V1/V2 historical compatibility remains active.
- recovery controls are presented as ordinary always-visible controls.

---

## File Map

### New domain files

| Path | Responsibility |
|---|---|
| `shared/domain/lifecycle.ts` | V3 Setup/Play lifecycle, six lunar phases, phase-order helpers, strong-warning codes |
| `shared/domain/orrery.ts` | Planet/track definitions, centidegree positions, Arc movement, House overlap, Sun/body membership, conjunction derivation |
| `shared/domain/orrery-setup.ts` | Awakening/Calamity source presets; Dominion season/final track-position validation |
| `shared/domain/time.ts` | Time participant/allocation/destination types and pure allocation operations |
| `shared/domain/engagements.ts` | Engagement IDs, target variants, linked-Time semantics |
| `shared/domain/monthly-state.ts` | Current-month Time, Engagement, and Wizardmoot actual-attendance state plus compact history types |
| `shared/domain/v3-validation.ts` | V3 hard invariants, Setup completeness, Planning/Story/Quiet warning derivation |
| `shared/domain/v3-transitions.ts` | Pure V3 intent transitions for Begin Play, phases, Time, Engagements, Meeting, month rollover |
| `shared/domain/v3-commands.ts` | M4 gameplay command payload types/fingerprints if splitting V3 commands from the existing command module improves focus |
| `shared/domain/v3-events.ts` | M4 gameplay event payload types if splitting V3 events from the existing event module improves focus |

### New generic persistence/lifecycle files

| Path | Responsibility |
|---|---|
| `convex/campaignDeletion.ts` | Generic durable campaign deletion barrier, request/resume/status behavior, scheduled bounded cleanup worker, final verification |
| `convex/lifecycleCommands.ts` | Explicit Start New Campaign and any non-deletion campaign lifecycle mutations |
| `convex/lifecycleQueries.ts` | Top-level application lifecycle view: no campaign, deleting, Setup campaign, Play campaign |
| `tests/campaignDeletion.test.ts` | Automated deletion barrier, batching, interruption/resumption, idempotency, concurrency/state-machine coverage |

### New gameplay/backend files

| Path | Responsibility |
|---|---|
| `convex/v3Commands.ts` | M4 Setup/Play intent mutations that use the existing canonical gameplay commit path |
| `convex/v3Queries.ts` | Focused V3 gameplay/read queries if current `campaign.ts`/`m3Queries.ts` would otherwise become overloaded |

### New UI files

| Path | Responsibility |
|---|---|
| `src/NoCampaign.tsx` | Explicit Start New Campaign landing state |
| `src/DeletionInProgress.tsx` | Deletion status/resume-only experience; no campaign gameplay/recovery surface exposed |
| `src/SetupView.tsx` | Setup destination containing existing M3 setup plus Age/Orrery/Begin Play controls |
| `src/PlayShell.tsx` | Month/phase chrome, local full/split surface layout, phase-return behavior |
| `src/CampaignTools.tsx` | Secondary campaign administration/recovery destination with global/shared recovery copy |
| `src/surfaces/CurrentPhase.tsx` | Current-phase surface host |
| `src/surfaces/OrreryView.tsx` | Shared Orrery reference/interaction surface |
| `src/surfaces/TableWizards.tsx` | Compact identity/seat/player/Watcher-assignment reference surface |
| `src/surfaces/PlanningSurface.tsx` | Planning Time/Engagement scheduler with local participant focus |
| `src/surfaces/StorySurface.tsx` | Remaining Time/Engagement actions and Orrery Time resolution |
| `src/surfaces/MeetingSurface.tsx` | Expected/actual Wizardmoot attendance and Complete Meeting |

### Existing files expected to change

| Path | M4 responsibility |
|---|---|
| `shared/domain/campaign-state.ts` | Add V3; at final cutover make V3 current/minimum supported state |
| `shared/domain/initial-state.ts` | Fresh V3 incomplete Setup revision-0 state |
| `shared/domain/state-validation.ts` | V3 structural validation and V1/V2 rejection at final cutover |
| `shared/domain/state-migration.ts` | Remove semantic V1/V2 migration/loading support after reset; V3-only historical loading |
| `shared/domain/commands.ts` | Retire month-change command; add/aggregate M4 gameplay command types only |
| `shared/domain/events.ts` | Retire active month-change event; add/aggregate M4 gameplay events only |
| `shared/domain/transitions.ts` | Retire free month transition path; leave reusable generic/domain helpers only |
| `shared/domain/command-ids.ts` | Fingerprints for M4 gameplay intent; retire `moveMonthFingerprint` |
| `shared/domain/activity.ts` | Human-readable M4 gameplay activity entries |
| `shared/domain/index.ts` | Export V3 domain modules |
| `convex/schema.ts` | Add deletion-operation table/indexes in transition-safe step; later switch campaign/snapshot validators to V3-only and retire obsolete legacy tables only when safe |
| `convex/validators.ts` | Add V3 state/events; final V3-only current/historical validation |
| `convex/canonicalCommit.ts` | Add deletion-barrier write guard and M4 command/event coherence; remove free month-change coherence |
| `convex/campaign.ts` | Stop auto-create; remove `moveMonth`; keep generic recovery operations and gate them during deletion |
| `convex/persistence.ts` | V3 serialization boundary only if current helpers require type updates |
| `convex/m3Commands.ts` | Existing setup commands become Setup-only under V3 |
| `convex/m3Queries.ts` | Read V3 Setup representation |
| `convex/backup.ts` | V3 import/export and deletion-barrier behavior; reject V1/V2 |
| `convex/verifyMigration.ts` | V3 graph verification and explicit legacy-state rejection |
| `src/App.tsx` | Lifecycle-aware top-level: loading vs no campaign vs deleting vs Setup vs Play |
| `src/CampaignSetup.tsx` | Refactor/reuse within `SetupView`; do not duplicate M3 setup logic |
| `src/index.css` | M4 responsive shell/Orrery/surface styling as needed |
| `ROADMAP.md` and architecture/recovery/environment docs | Update only after implementation behavior is verified |

### Legacy files to retire only after the V1/V2 graph is cleared and final V3 cutover is safe

- `convex/executeMigration.ts`
- `convex/migration.ts`
- `convex/historyControlMigration.ts`
- `convex/adminMigration.ts`

Do not delete legacy-shaped test data needed to prove V1/V2 rejection.

---

## Exact V3 State Model for Implementation

Use the lifecycle discriminator to make incomplete Setup representable without fake month/planet values.

```ts
export interface CampaignStateV3 {
  readonly schemaVersion: 3;
  readonly ruleset: CampaignRuleset;
  readonly calendar: {
    readonly monthOrdinal: MonthOrdinal | null;
  };
  readonly configuration: {
    readonly ageId: AgeDefinitionId | null;
    readonly facilitatorPlayerId: PlayerId | null;
  };
  readonly players: readonly CampaignPlayer[];
  readonly wizards: readonly CampaignWizard[];
  readonly pactSeats: Readonly<Record<PactSeatId, PactSeatState>>;
  readonly lifecycle: SetupLifecycle | PlayLifecycle;
  readonly wizardmootHistory: readonly WizardmootHistoryEntry[];
}

export interface SetupLifecycle {
  readonly kind: "setup";
  readonly orrery: SetupOrreryState;
}

export interface SetupOrreryState {
  readonly saturn: CentidegreePosition | null;
  readonly jupiter: CentidegreePosition | null;
  readonly mars: CentidegreePosition | null;
  readonly venus: CentidegreePosition | null;
  readonly mercury: CentidegreePosition | null;
}

export interface PlayLifecycle {
  readonly kind: "play";
  readonly phase: LunarPhase;
  readonly orrery: OrreryState;
  readonly currentMonth: MonthlyPlayState;
}
```

Hard invariant:

- Setup may have `calendar.monthOrdinal === null` and null planet positions.
- Play requires non-null `calendar.monthOrdinal`, complete `OrreryState`, and complete `currentMonth` structure.
- There is no independently persisted Sun.

Fresh revision 0 is incomplete Setup: no Age, no Facilitator, empty players/wizards, default/unclassified Pact-seat state according to the existing M3 representation, `calendar.monthOrdinal = null`, five null setup planet positions, and empty Wizardmoot history. Do not zero the Orrery and do not invent a fake starting month.

---

## Exact Monthly Resource Model

```ts
export type TimeParticipantRef =
  | { readonly kind: "wizard"; readonly wizardId: WizardId };

export interface TimeParticipant {
  readonly participant: TimeParticipantRef;
  readonly effectiveBudget: number;
  readonly rescheduleAllowance: number;
  readonly reschedulesUsed: number;
  readonly allocations: readonly TimeAllocation[];
}

export interface TimeAllocation {
  readonly allocationId: AllocationId;
  readonly destination: TimeDestination | null;
  readonly note: string | null;
  readonly resolution: "pending" | "spent" | "wasted";
}

export type TimeDestination =
  | { readonly kind: "companion"; readonly element: "air" | "fire" | "earth" | "water" }
  | { readonly kind: "map_isle_sanctum" }
  | { readonly kind: "familiar" }
  | { readonly kind: "orrery" }
  | { readonly kind: "meeting" }
  | { readonly kind: "domain" }
  | { readonly kind: "engagement"; readonly engagementId: EngagementId }
  | { readonly kind: "special_use"; readonly description: string };
```

Important: an Orrery allocation stores only that the Time is for the Orrery. Planet and direction are chosen when Story resolves that Time; they are not scheduled in Planning.

```ts
export interface EngagementRecord {
  readonly engagementId: EngagementId;
  readonly actingWizardId: WizardId;
  readonly target: EngagementTarget | null;
  readonly resolution: "pending" | "resolved";
  readonly linkedTimeAllocationId: AllocationId | null;
}

export type EngagementTarget =
  | { readonly kind: "wizard"; readonly wizardId: WizardId }
  | { readonly kind: "self" }
  | { readonly kind: "familiar" }
  | { readonly kind: "named_character"; readonly name: string };

export interface WizardmootAttendance {
  readonly wizardId: WizardId;
  readonly attended: boolean;
  readonly exceptionReason: string | null;
}

export interface MonthlyPlayState {
  readonly timeParticipants: readonly TimeParticipant[];
  readonly engagements: readonly EngagementRecord[];
  readonly wizardmootAttendance: readonly WizardmootAttendance[] | null;
}

export interface WizardmootHistoryEntry {
  readonly monthOrdinal: MonthOrdinal;
  readonly attendance: readonly {
    readonly wizardId: WizardId;
    readonly attended: boolean;
  }[];
}
```

Expected Wizardmoot attendance is never persisted. Derive it from whether the Wizard has a Time allocation whose destination remains `meeting`, regardless of whether that allocation has subsequently been resolved as spent by `completeMeeting`.

---

## Exact Orrery Rules Representation

Use integer centidegrees `0..35999`, with 0 degrees at the Aries/April boundary.

Static definitions:

| Body | Normal track positions | Track boundary offset | Arc |
|---|---:|---:|---:|
| Saturn | 36 x 10 deg | 5 deg | 10 deg |
| Jupiter | 48 x 7.5 deg | 0 | 22.5 deg |
| Mars | 48 x 7.5 deg | 0 | 52.5 deg |
| Venus | 24 x 15 deg visible sections | 0 | 75 deg |
| Mercury | 24 x 15 deg visible sections | 0 | 105 deg |

Houses are 12 x 30 degrees. Arc/House overlap is half-open `[start, end)`, including wraparound. A body occupies every House with positive-width overlap. The Sun occupies exactly the House derived from `calendar.monthOrdinal`. Conjunctions include the Sun and every movable planet; two Celestial Bodies are in conjunction when they occupy at least one common House.

Setup behavior:

- Awakening applies the one completed Draft-4 preset and pre-first-month March. The unfinished alternative remains unsupported.
- Calamity applies its source preset and pre-first-month December.
- Dominion stores the final setup result rather than enforcing the ceremonial Watcher placement sequence. The UI exposes a season choice and legal printed positions. The season maps to the source-required immediately preceding month. Final movable-planet positions must be normal legal track positions.
- Changing Age to Awakening/Calamity replaces setup month/planet values with that Age preset. Changing Age to Dominion clears setup month/planet values so Dominion final placement is explicit.
- Underlying centidegree types can represent future exceptional off-grid positions, but ordinary M4 setup/gameplay commands cannot create them.

---

## Exact Command and Event Set

Administrative lifecycle operations are NOT members of the gameplay command/event union:

- `startNewCampaign` - direct revision-0 establishment, no domain event.
- `requestCampaignDeletion` / `resumeCampaignDeletion` - administrative deletion lifecycle, no gameplay revision/event.

M4 canonical gameplay commands/events:

| Command intent | Event |
|---|---|
| `setSetupPlanetPosition` | `setup_planet_position_set` |
| `setDominionSeason` | `setup_season_set` |
| existing M3 setup commands | existing M3 events |
| `beginPlay` | `play_begun` |
| `advancePhase` | `phase_advanced` |
| `scheduleTime` | `time_scheduled` |
| `rescheduleTime` | `time_rescheduled` |
| `spendManualTime` | `time_spent` |
| `wasteTime` | `time_wasted` |
| `spendOrreryTime` | `orrery_time_spent` |
| `scheduleEngagement` | `engagement_scheduled` |
| `commitTimeToEngagement` | `engagement_time_committed` |
| `resolveEngagement` | `engagement_resolved` |
| `rescheduleEngagement` | `engagement_rescheduled` |
| `adjustWizardmootAttendance` | `wizardmoot_attendance_adjusted` |
| `completeMeeting` | `meeting_completed` |
| `beginNextMonth` | `month_begun` |

Retire ordinary V3 use of `move_month`, `legacy_month_change`, and `month_changed`.

---

## Concurrency and Stale-Context Contract

| Operation | Required authoritative recheck |
|---|---|
| `beginPlay` | `expectedRevision` plus Setup lifecycle/completeness; broad CAS is intentional because Begin Play consumes the entire Setup configuration |
| `advancePhase` | `expectedMonthOrdinal` + `expectedPhase`; no global revision CAS |
| Planning `scheduleTime` | expected month + Planning phase + allocation/participant identity; no global revision CAS; same-allocation last accepted write may win |
| Planning `scheduleEngagement` | expected month + Planning phase + Engagement identity; no global revision CAS |
| Story `rescheduleTime` | expected month + Story phase + allocation pending + remaining allowance; no unrelated-revision CAS |
| `spendManualTime` / `wasteTime` | expected month + Story phase + allocation pending + destination restrictions |
| `spendOrreryTime` | expected month + Story phase + pending Orrery allocation + legal planet/direction; atomically move and spend |
| `commitTimeToEngagement` | expected month + Planning/Story phase + unresolved Engagement + pending allocation; Story path also rechecks/consumes Time reschedule allowance |
| `resolveEngagement` | expected month + Story phase + unresolved Engagement + linked allocation consistency |
| `rescheduleEngagement` | expected month + Story phase + unresolved Engagement; no Time allowance consumption |
| `adjustWizardmootAttendance` | expected month + Meeting phase + attendance entry + current derived expectation |
| `completeMeeting` | expected month + Meeting phase; resolves Meeting Time and enters Quiet atomically |
| `beginNextMonth` | expected month + Quiet phase; one atomic month transition |
| Undo/Redo | preserve existing expected-revision semantics |
| deletion request | `expectedCampaignId` + strong confirmation; marker makes retries idempotent |

Every mutation also remains protected by existing command-id idempotency where it is a canonical gameplay command. A retry of the same accepted command returns the prior result; a distinct command against consumed/stale state fails the domain precondition.

Strong warnings are server-recomputed. For a transition with warnings, the first request without acknowledgement returns `WARNING_ACK_REQUIRED` and performs zero writes. The client displays the current warnings and may resubmit with `acknowledgeWarnings: true`. The accepted event records the warning codes that were explicitly acknowledged.

---

## Scalable Campaign Deletion Architecture

Add a generic administrative table in the transition-safe schema:

```ts
campaignDeletionOperations: {
  campaignKey: string;
  campaignId: string;
  status: "deleting";
  phase:
    | "campaignEvents"
    | "campaignSnapshots"
    | "campaignRevisions"
    | "campaignCheckpoints"
    | "campaignHistoryControl"
    | "campaign"
    | "verify";
  startedAt: number;
  lastProgressAt: number;
}
```

Indexes:

- `by_campaignKey(campaignKey)` for the single-campaign application lifecycle query.
- `by_campaignId(campaignId)` for idempotent resume/status checks.

Use `DELETION_BATCH_SIZE = 200` documents per scheduled cleanup mutation. All campaign-owned child tables are already campaign-indexed according to repository inspection, so cleanup must use those indexes and `.take(DELETION_BATCH_SIZE)`, never unbounded scans.

Deletion sequence:

1. `requestCampaignDeletion({ expectedCampaignId, confirmation: "DELETE" })` transactionally verifies the current campaign identity and no conflicting deletion marker, inserts the durable marker, and schedules `processCampaignDeletionBatch` with `ctx.scheduler.runAfter(0, ...)`.
2. As soon as the marker exists, normal gameplay canonical commits, Setup writes, Undo/Redo, checkpoint mutations, backup import/export, ordinary verifier/recovery mutations, and Start New Campaign fail with `CAMPAIGN_DELETING`. Normal app reads expose only deletion status/resume behavior rather than partially deleting campaign state.
3. `processCampaignDeletionBatch` deletes at most 200 indexed records from the current child collection. If records remain, it schedules itself again. If none remain, it advances the marker phase and schedules the next batch.
4. Cleanup order is events -> snapshots -> revisions -> checkpoints -> history control. Exact order is not game-semantic because the barrier blocks use, but this order keeps the canonical campaign row available until all dependent history/recovery data is gone.
5. After all children are empty, delete the canonical `campaigns` row after rechecking its `campaignId`.
6. `verify` checks every campaign-owned collection and the canonical campaign row with indexed/constant-size existence queries. If anything remains, return to the corresponding cleanup phase rather than removing the marker.
7. Remove `campaignDeletionOperations` marker last, only after complete graph emptiness is proven.
8. `resumeCampaignDeletion` is idempotent: if the marker exists it schedules the worker again; if deletion is complete it reports complete/no campaign; it never creates a second operation.
9. Scheduled work means the initiating browser may close immediately after the request commits. If scheduled work fails or deployment interrupts it, the marker remains and the UI/administrator can resume safely.
10. Start New Campaign verifies both no deletion marker and an empty campaign-owned graph before creating revision 0.

The deletion marker is administrative persistence state, not CampaignState and not a campaign event/revision. This same machinery should be used for the one-time pre-M4 V1/V2 campaign retirement where practical.

---

## Task 1: Build the V1/V2-Compatible Deletion Barrier and Transition Deployable Commit

**Files**

- Create: `convex/campaignDeletion.ts`, `convex/lifecycleQueries.ts`, `tests/campaignDeletion.test.ts`
- Modify: `convex/schema.ts`, `convex/campaign.ts`, `convex/canonicalCommit.ts`, `convex/backup.ts`
- Do not modify current CampaignState validators to V3 in this task.

**Interfaces**

- Produces: `campaignDeletionOperations` table; `requestCampaignDeletion`, `resumeCampaignDeletion`, `processCampaignDeletionBatch`, `getCampaignLifecycle`; `assertCampaignNotDeleting` generic guard.
- Preserves: current V1/V2 campaign/snapshot validators so this commit can be deployed before legacy data is cleared.

- [ ] **Step 1: Write deletion-state tests before implementation.** Add tests proving: request creates one durable marker; repeated request for the same campaign returns the same deleting state; a different/stale `expectedCampaignId` is rejected; marker state blocks `start/normal write/recovery/import` helpers; phase progression is deterministic; interruption after any phase resumes from persisted marker state; duplicate resume requests do not skip a phase; finalization cannot remove the marker while any child record exists.

- [ ] **Step 2: Run the focused test and confirm red.**

  Run: `npx vitest run tests/campaignDeletion.test.ts`

  Expected: FAIL because deletion operation/state-machine functions do not exist.

- [ ] **Step 3: Add the deletion-operation schema only.** Add `campaignDeletionOperations` and the two indexes above while leaving V1/V2 campaign/snapshot validators unchanged. Confirm all campaign-owned child collections used by cleanup have a campaign-scoped index; if an actual child lacks one, add that index in this task before implementing deletion.

- [ ] **Step 4: Implement the generic deletion barrier and scheduled worker.** Use indexed `.take(200)` batches, persisted `phase`, `ctx.scheduler.runAfter(0, ...)`, campaign identity verification, child-emptiness verification, canonical campaign deletion near the end, and marker deletion last. Never scan whole tables.

- [ ] **Step 5: Gate every current write path that can mutate/recover campaign data.** `canonicalCommit` checks the barrier before gameplay writes. Current Undo/Redo/checkpoint mutations and backup import/export reject while deleting. Preserve game-domain ignorance in the guard: it receives campaign identity and checks administrative deletion state only.

- [ ] **Step 6: Stop automatic creation without introducing V3 yet.** Change `ensureCampaign` so it no longer creates a missing campaign. During this transition commit it may return an existing campaign or fail clearly when none exists; it must also reject while deleting. Do not silently create V2 after cleanup.

- [ ] **Step 7: Add `getCampaignLifecycle`.** Return one of `deleting`, `campaign`, or `none` without exposing partially deleting campaign state. The final V3 UI will consume this query later.

- [ ] **Step 8: Run focused and recovery regression tests.**

  Run:
  `npx vitest run tests/campaignDeletion.test.ts tests/undoRedo.test.ts tests/checkpoints.test.ts tests/backup.test.ts`

  Expected: PASS.

- [ ] **Step 9: Run repository check.**

  Run: `npm run check`

  Expected: PASS.

- [ ] **Step 10: Commit the transition-safe deletion foundation.**

  Commit message: `feat: add resumable campaign deletion barrier`

This commit is the candidate temporary transition deployment. It must remain V1/V2-schema-compatible.

---
## Task 2: Define CampaignState V3, Setup/Play Lifecycle, and Hard Validation

**Files**

- Create: `shared/domain/lifecycle.ts`, `shared/domain/v3-validation.ts`, `tests/v3Validation.test.ts`
- Modify: `shared/domain/campaign-state.ts`, `shared/domain/initial-state.ts`, `shared/domain/index.ts`
- Do not switch Convex persisted validators to V3 yet.

**Interfaces**

- Produces: `CampaignStateV3`, `SetupLifecycle`, `PlayLifecycle`, `LunarPhase`, incomplete V3 revision-0 constructor, hard V3 validation helpers.
- Consumes: existing Player/Wizard/Pact-seat/Age/MonthOrdinal types.

- [ ] **Step 1: Write failing V3 shape tests.** Cover incomplete Setup with null month/planet positions, Play requiring non-null month and complete Orrery/currentMonth, invalid lifecycle/phase rejection, and fresh V3 revision 0 containing no fake calendar/Orrery facts.

- [ ] **Step 2: Run focused tests and confirm red.**

  Run: `npx vitest run tests/v3Validation.test.ts`

  Expected: FAIL because V3 lifecycle/types do not exist.

- [ ] **Step 3: Implement the six-phase lifecycle types.** Define exactly `new_moon | visions | planning | story | meeting | quiet`. Do not model Setup as a lunar phase and do not add generic persisted phase-completion flags.

- [ ] **Step 4: Add `CampaignStateV3` without making it current yet.** Use the exact state model in this plan: nullable calendar only for Setup, partial Setup Orrery under the Setup discriminator, complete Orrery/currentMonth under Play, compact Wizardmoot history at campaign level.

- [ ] **Step 5: Add a V3 revision-0 constructor.** Keep the current V2 constructor available until final cutover if required by the transition deployment. The V3 constructor creates incomplete Setup with null Age/Facilitator/month/planet positions and no monthly state.

- [ ] **Step 6: Implement hard structural validation.** Reject duplicate IDs, invalid references, negative budgets/allowances, `reschedulesUsed > rescheduleAllowance`, malformed linked Engagement-Time references, Play without a calendar/Orrery/currentMonth, or Setup containing Play-only state. Do not reject normal-rule warnings such as an incomplete Planning schedule.

- [ ] **Step 7: Run focused tests.**

  Run: `npx vitest run tests/v3Validation.test.ts`

  Expected: PASS.

- [ ] **Step 8: Commit.**

  Commit message: `feat: define CampaignState V3 lifecycle`

---

## Task 3: Implement Orrery Geometry, Presets, and Derived Queries

**Files**

- Create: `shared/domain/orrery.ts`, `shared/domain/orrery-setup.ts`, `tests/orrery.test.ts`, `tests/orrerySetup.test.ts`
- Modify: `shared/domain/index.ts`

**Interfaces**

- Produces: `PlanetId`, `CentidegreePosition`, `OrreryState`, `SetupOrreryState`, `PLANET_DEFINITIONS`, `movePlanet`, `advanceAllPlanets`, `deriveBodyHouseMemberships`, `deriveConjunctions`, Age setup helpers.
- Consumes: `MonthOrdinal`, `AgeDefinitionId`.

- [ ] **Step 1: Write failing geometry tests.** Include centidegree normalization, legal segment counts/offsets, all five Arc widths, half-open boundary behavior, wraparound, and all-five-planet monthly advancement.

- [ ] **Step 2: Write failing derived-query tests including the Sun.** Assert the Rulebook sample concept: movable planets can be in conjunction with the Sun when both occupy the same House. Never assert that Sun is excluded from conjunctions.

- [ ] **Step 3: Run focused tests and confirm red.**

  Run: `npx vitest run tests/orrery.test.ts tests/orrerySetup.test.ts`

  Expected: FAIL because Orrery functions do not exist.

- [ ] **Step 4: Implement fixed-point geometry.** Use integer `0..35999`, 12 Houses x 3000 centidegrees, Saturn 1000 Arc/500 boundary offset, Jupiter 2250 Arc/750 grid, Mars 5250 Arc/750 grid, Venus 7500 Arc/1500 visible grid, Mercury 10500 Arc/1500 visible grid.

- [ ] **Step 5: Implement membership/conjunction derivation.** Derive Sun House only from `calendar.monthOrdinal`. Represent a derived Celestial Body ID union that includes `sun` plus the five planets for membership/conjunction results. Use positive-width half-open overlap.

- [ ] **Step 6: Implement source setup helpers.** Encode the completed Awakening source arrangement and March pre-first-month; encode the Calamity source arrangement and December pre-first-month; implement Dominion legal final track-position validation and season -> immediately-preceding-month mapping from the existing/source calendar rules. Do not invent the unfinished Awakening alternative.

- [ ] **Step 7: Test source descriptions, not only raw constants.** Awakening tests should derive the documented March/Sol and described planet placements; Calamity tests should derive December/Sol and described placements; Dominion tests should reject off-track ordinary positions and accept every legal printed position.

- [ ] **Step 8: Run focused tests.**

  Run: `npx vitest run tests/orrery.test.ts tests/orrerySetup.test.ts`

  Expected: PASS.

- [ ] **Step 9: Commit.**

  Commit message: `feat: model M4 Orrery geometry`

---

## Task 4: Implement Time, Engagement, Wizardmoot, and Warning Domain Types

**Files**

- Create: `shared/domain/time.ts`, `shared/domain/engagements.ts`, `shared/domain/monthly-state.ts`, `tests/time.test.ts`, `tests/engagements.test.ts`
- Modify: `shared/domain/v3-validation.ts`, `shared/domain/campaign-state.ts`, `shared/domain/index.ts`, `tests/v3Validation.test.ts`

**Interfaces**

- Produces: exact Time/Engagement/monthly types from this plan, monthly initialization helpers, expected-attendance derivation, Planning/Story/Quiet warning derivation.

- [ ] **Step 1: Write failing Time initialization tests.** Present Wizard IDs create one participant each with `effectiveBudget = 4`, four individually identified pending/unscheduled allocations, `rescheduleAllowance = 1`, and `reschedulesUsed = 0`. Tests must prove the structures also accept non-4 budgets and non-1 allowances.

- [ ] **Step 2: Write failing Time destination tests.** `orrery` stores no planet/direction. `special_use` requires non-empty description. `domain` remains distinct from `special_use`. `engagement` links a real Engagement ID. Allocation notes are optional explanatory text only.

- [ ] **Step 3: Write failing Engagement tests.** Cover null partial Planning target, modeled Wizard/self/Familiar/manual named character targets, unresolved/resolved lifecycle, and linked allocation referential invariants.

- [ ] **Step 4: Write failing Wizardmoot tests.** Expected attendance is derived from a Meeting destination and is not stored in `WizardmootAttendance`. Actual attendance entries store `attended` and conditional exception reason only.

- [ ] **Step 5: Run tests and confirm red.**

  Run: `npx vitest run tests/time.test.ts tests/engagements.test.ts tests/v3Validation.test.ts`

  Expected: FAIL.

- [ ] **Step 6: Implement the exact resource types.** Use `TimeParticipantRef = { kind: "wizard"; wizardId }`; do not key Time by Pact seat and do not introduce GenericActor/GenericEntity.

- [ ] **Step 7: Implement monthly initialization.** Input is the eligible Present Wizard set. Silent and Absent Wizards are excluded. Generate stable allocation/Engagement IDs with the existing project ID conventions.

- [ ] **Step 8: Implement expected attendance and warning derivation.** `deriveExpectedWizardmootAttendance` checks whether any allocation destination is `meeting` regardless of allocation resolution. `checkPlanningWarnings` reports unscheduled Time/Engagements. `checkStoryWarnings` reports unresolved ordinary Time/Engagements before Meeting. `checkQuietWarnings` reports any unresolved month obligations before next month. These return structured warning codes/messages and never mutate state.

- [ ] **Step 9: Extend V3 hard validation for monthly references.** Linked Engagement Time must belong to the acting Wizard, be destination `engagement` for that Engagement, and be uniquely linked. Do not turn warning conditions into structural errors.

- [ ] **Step 10: Run focused tests.**

  Run: `npx vitest run tests/time.test.ts tests/engagements.test.ts tests/v3Validation.test.ts`

  Expected: PASS.

- [ ] **Step 11: Commit.**

  Commit message: `feat: model M4 monthly resources`

---

## Task 5: Define V3 Gameplay Commands, Events, Validators, and Final Persistence Cutover

**Files**

- Create or populate: `shared/domain/v3-commands.ts`, `shared/domain/v3-events.ts`, `tests/v3Legacy.test.ts`
- Modify: `shared/domain/commands.ts`, `shared/domain/events.ts`, `shared/domain/command-ids.ts`, `shared/domain/state-validation.ts`, `shared/domain/state-migration.ts`, `shared/domain/backup-preview.ts`, `shared/domain/index.ts`, `convex/validators.ts`, `convex/schema.ts`, `convex/canonicalCommit.ts`
- Retire only after reset is proven: V1/V2 migration/admin files identified in the file map.

**Interfaces**

- Produces: V3-only persisted validators; exact M4 canonical command/event union; explicit unsupported legacy errors; command/event coherence for M4.
- Consumes: Tasks 2-4 and deletion barrier from Task 1.

- [ ] **Step 1: Write V1/V2 rejection tests.** Minimal legacy-shaped V1 and V2 current states, snapshots, checkpoint states, and backup state payloads must fail clearly as unsupported. V3 must pass.

- [ ] **Step 2: Run rejection tests and confirm red against the current V1/V2 compatibility code.**

  Run: `npx vitest run tests/v3Legacy.test.ts`

  Expected: FAIL because V1/V2 are still supported.

- [ ] **Step 3: Add exact M4 gameplay command/event types.** Do not add `campaign_created` or `campaign_deleted` events. Do not add Start/Delete to `CAMPAIGN_COMMAND_TYPES`. Add the command/event table from this plan and preserve existing M3 Setup command/events that still operate in V3 Setup.

- [ ] **Step 4: Add V3 Convex validators.** Validate the discriminated Setup/Play state, nullable Setup month/positions, complete Play state, Time/Engagement/attendance structures, and M4 events.

- [ ] **Step 5: Perform the final state-version cutover.** Set `CURRENT_STATE_SCHEMA_VERSION = 3`, `CurrentCampaignState = CampaignStateV3`, supported historical versions to `[3]`, and V3-only current/historical validators. `loadHistoricalState` rejects V1/V2 rather than migrating.

- [ ] **Step 6: Remove active free-month command/event support.** Retire `move_month`, `legacy_month_change`, `month_changed`, `applyMoveMonth`, `moveMonthFingerprint`, and their command/event-coherence cases from the active V3 codepath.

- [ ] **Step 7: Retire semantic legacy migration machinery.** Remove the old migration/admin modules only after the transition reset has made them operationally unnecessary. Keep minimal rejection fixtures/tests.

- [ ] **Step 8: Handle legacy `numbers`/`events` tables conservatively.** They are not campaign-owned. Remove their schema definitions only if the actual target deployments have them empty and Convex accepts removal; otherwise retain empty legacy table definitions and document them as separate cleanup, not M4 campaign deletion.

- [ ] **Step 9: Update canonical command/event coherence.** Add M4 gameplay mappings while keeping deletion-barrier checks generic. Every accepted M4 gameplay command still follows one revision + ordered event(s) + complete snapshot.

- [ ] **Step 10: Run focused version/persistence tests.**

  Run: `npx vitest run tests/v3Validation.test.ts tests/v3Legacy.test.ts`

  Expected: PASS.

- [ ] **Step 11: Run full repository check.**

  Run: `npm run check`

  Expected: PASS on an empty/reset V3 development persistence context; do not deploy this cutover over V1/V2 records.

- [ ] **Step 12: Commit.**

  Commit message: `feat: cut campaign persistence to V3`

---
## Task 6: Implement Explicit Campaign Creation, Setup Editing, and Atomic Begin Play

**Files**

- Create/populate: `convex/lifecycleCommands.ts`, `convex/v3Commands.ts`, `shared/domain/v3-transitions.ts`, `tests/lifecycle.test.ts`
- Modify: `convex/m3Commands.ts`, `convex/m3Queries.ts`, `shared/domain/initial-state.ts`, `shared/domain/v3-validation.ts`, `shared/domain/activity.ts`

**Interfaces**

- Produces: `startNewCampaign`, `setSetupPlanetPosition`, `setDominionSeason`, `validateSetupCompleteness`, `beginPlay`.
- Consumes: V3 state/validators, Orrery presets, monthly initialization, deletion barrier.

- [ ] **Step 1: Write fresh-campaign tests.** Starting on a truly empty graph with no deletion marker creates a fresh campaign identity, revision 0, complete revision-0 snapshot, history control with the established initial undo semantics, and incomplete V3 Setup. Creation produces no gameplay event/revision beyond revision 0 establishment.

- [ ] **Step 2: Write creation safety tests.** Start is rejected if a campaign exists, deletion marker exists, or campaign-owned orphan/history records exist. A double-submit cannot create two campaigns.

- [ ] **Step 3: Run lifecycle tests and confirm red.**

  Run: `npx vitest run tests/lifecycle.test.ts`

  Expected: FAIL because explicit V3 creation/Setup commands do not exist.

- [ ] **Step 4: Implement `startNewCampaign`.** Directly establish revision-0 V3 Setup using existing `ensureCampaign` revision-0 persistence conventions without treating creation as a canonical gameplay command. Check deletion marker and graph emptiness first.

- [ ] **Step 5: Make existing M3 setup commands V3 Setup-only.** Every Player/Wizard/Pact-seat/configuration mutation must reject after Begin Play. Preserve the existing command IDs/events/canonical persistence pattern.

- [ ] **Step 6: Integrate Age changes with Setup Orrery state.** When existing Age selection changes to Awakening or Calamity, apply that Age's approved pre-first-month preset. When it changes to Dominion, clear setup month and all five setup planet positions. This is a single accepted setup revision with the existing Age-change event; do not add a second fake user action.

- [ ] **Step 7: Implement Dominion setup intents.** `setDominionSeason` accepts a season, maps server-side to the preceding month, and emits `setup_season_set`. `setSetupPlanetPosition` accepts `planetId` + legal printed `positionIndex`, maps server-side to centidegrees, and emits `setup_planet_position_set`. Reject these commands for fixed-preset Ages and after Play begins.

- [ ] **Step 8: Implement exact Begin Play completeness validation.** Require Age, Facilitator, every Pact seat explicitly Present/Silent/Absent, Wizard for Present/Silent seats, portraying Player for every Present Wizard, every Watcher responsibility assigned, complete Age-valid setup month/Orrery, and the normal M4 rule that one Player portrays at most one Present Pact Wizard. That portrayal uniqueness is validation, not schema cardinality. Silent Wizards need no portraying Player; Absent seats may have no Wizard.

- [ ] **Step 9: Implement atomic `applyBeginPlay`.** Require Setup, validate completeness, advance the configured pre-first month by exactly one, advance all five planets by one Arc, initialize Present-Wizard Time/Engagement resources, initialize no Wizardmoot attendance yet, enter `new_moon`, and emit one `play_begun` event. There is no authoritative intermediate state.

- [ ] **Step 10: Implement `beginPlay({ commandId, expectedRevision })`.** Broad `expectedRevision` is intentional here because the transition consumes the whole Setup state. Use canonical commit and deletion barrier.

- [ ] **Step 11: Add Begin Play tests.** Cover Awakening March -> April, Calamity December -> January, Dominion selected pre-season month -> season month, exactly one movement of each planet, Present-only monthly resources, Silent exclusion, stale revision rejection, and M3 Setup command rejection after Play begins.

- [ ] **Step 12: Run focused tests.**

  Run: `npx vitest run tests/lifecycle.test.ts tests/orrerySetup.test.ts tests/v3Validation.test.ts`

  Expected: PASS.

- [ ] **Step 13: Commit.**

  Commit message: `feat: add explicit M4 campaign setup lifecycle`

---

## Task 7: Implement Phase Progression and Explicit Warning Acknowledgement

**Files**

- Modify: `shared/domain/v3-transitions.ts`, `shared/domain/v3-commands.ts`, `shared/domain/v3-events.ts`, `convex/v3Commands.ts`, `convex/canonicalCommit.ts`, `shared/domain/activity.ts`
- Test: extend `tests/lifecycle.test.ts`

**Interfaces**

- Produces: `advancePhase` for New Moon -> Visions -> Planning -> Story -> Meeting only; warning acknowledgement behavior; Story -> Meeting attendance initialization.

- [ ] **Step 1: Write phase-sequence/stale-context tests.** Assert legal transitions: New Moon -> Visions, Visions -> Planning, Planning -> Story, Story -> Meeting. Assert `advancePhase` cannot perform Meeting -> Quiet or Quiet -> New Moon. Two distinct Planning -> Story attempts with the same expected month/phase result in exactly one accepted transition and one stale failure.

- [ ] **Step 2: Write warning acknowledgement tests.** Incomplete Planning and unresolved Story cause the first transition request with `acknowledgeWarnings: false` to fail with `WARNING_ACK_REQUIRED`, warning codes, and zero writes. Reissuing with `true` recomputes current warnings and may proceed. No warnings means no acknowledgement is required.

- [ ] **Step 3: Run focused lifecycle tests and confirm red.**

  Run: `npx vitest run tests/lifecycle.test.ts`

  Expected: FAIL.

- [ ] **Step 4: Implement `applyAdvancePhase(state, expectedMonthOrdinal, expectedPhase, acknowledgeWarnings)`.** Validate Play/current month/current phase. Use `expectedPhase` and `expectedMonthOrdinal`; do not require global expected revision.

- [ ] **Step 5: Initialize Meeting actual attendance on Story -> Meeting.** For each relevant Present Pact Wizard, derive expected attendance from Meeting-destination Time and create `{ wizardId, attended: expected, exceptionReason: null }`. Do not persist `expected`.

- [ ] **Step 6: Record acknowledged warning codes in `phase_advanced`.** This is audit evidence of a deliberate procedural exception, not a hard state invariant.

- [ ] **Step 7: Implement the Convex mutation and command fingerprint.** Include command ID, expected month/phase, and acknowledgement input. Preserve generic idempotency.

- [ ] **Step 8: Run lifecycle tests.**

  Run: `npx vitest run tests/lifecycle.test.ts`

  Expected: PASS.

- [ ] **Step 9: Commit.**

  Commit message: `feat: add M4 phase progression`

---

## Task 8: Implement Planning Time and Engagement Scheduling

**Files**

- Modify: `shared/domain/v3-transitions.ts`, `convex/v3Commands.ts`, `convex/canonicalCommit.ts`, `shared/domain/activity.ts`
- Test: extend `tests/time.test.ts`, `tests/engagements.test.ts`

**Interfaces**

- Produces: `scheduleTime`, `scheduleEngagement`, Planning path of `commitTimeToEngagement`.

- [ ] **Step 1: Write Planning scheduling tests.** A pending allocation can be assigned/reassigned repeatedly during Planning without consuming reschedule allowance. Independent participant edits both serialize. Same-allocation sequential accepted writes leave the latest accepted destination. Planning after the campaign has entered Story is rejected.

- [ ] **Step 2: Write Engagement Planning tests.** Target can be set/replaced during Planning; partial null targets are valid state; invalid Wizard references reject; manual named characters remain text and do not create Denizen entities.

- [ ] **Step 3: Write known-avoidance Planning tests.** `commitTimeToEngagement` during Planning atomically sets one pending allocation to `{ kind: "engagement", engagementId }` and links the Engagement, with no Time reschedule allowance consumed. Duplicate/contradictory links reject.

- [ ] **Step 4: Run focused tests and confirm red.**

  Run: `npx vitest run tests/time.test.ts tests/engagements.test.ts`

  Expected: FAIL.

- [ ] **Step 5: Implement `scheduleTime`.** Inputs include command ID, expected month, acting Wizard/participant identity, allocation ID, destination, optional note. Require Planning. Never accept client-computed resulting state.

- [ ] **Step 6: Implement `scheduleEngagement`.** Require Planning and unresolved current-month Engagement. Do not make Story a general scheduling phase.

- [ ] **Step 7: Implement Planning `commitTimeToEngagement`.** Require same acting Wizard, pending allocation, unresolved Engagement, and unique link. Produce `engagement_time_committed`.

- [ ] **Step 8: Add event coherence/activity descriptions.** Each accepted edit is its own canonical revision/snapshot. Do not aggregate several UI edits into browser-local drafts.

- [ ] **Step 9: Run focused tests.**

  Run: `npx vitest run tests/time.test.ts tests/engagements.test.ts`

  Expected: PASS.

- [ ] **Step 10: Commit.**

  Commit message: `feat: persist M4 planning schedules`

---

## Task 9: Implement Story Time, Orrery Time, and Engagement Resolution

**Files**

- Modify: `shared/domain/v3-transitions.ts`, `convex/v3Commands.ts`, `convex/canonicalCommit.ts`, `shared/domain/activity.ts`
- Test: extend `tests/time.test.ts`, `tests/engagements.test.ts`, `tests/orrery.test.ts`

**Interfaces**

- Produces: `rescheduleTime`, `spendManualTime`, `wasteTime`, `spendOrreryTime`, Story path of `commitTimeToEngagement`, `resolveEngagement`, `rescheduleEngagement`.

- [ ] **Step 1: Write Story Time tests.** Manual spend/waste is Story-only; pending allocation required; Meeting destination cannot be manually spent/wasted during Story; unresolved ordinary Time that survives into Meeting remains unresolved and cannot be spent there. Wasted preserves destination.

- [ ] **Step 2: Write Story reschedule tests.** Require Story, pending allocation, remaining allowance, expected month. Consume exactly one allowance. Unrelated campaign revision changes must not by themselves reject the action.

- [ ] **Step 3: Write Orrery Time tests.** Planning stores only destination `orrery`. `spendOrreryTime` receives planet + direction at resolution, validates the pending Orrery allocation, moves that planet by exactly one legal Arc, marks the allocation spent, and persists both effects in one revision/snapshot. Retry/idempotency and distinct duplicate consumption are tested separately.

- [ ] **Step 4: Write avoiding-Denizen Story tests.** Story `commitTimeToEngagement` redirects one pending Time allocation to the Engagement and links it while consuming one normal Time reschedule use. If allowance is exhausted it rejects. Resolving a linked Engagement atomically resolves Engagement and spends linked Time.

- [ ] **Step 5: Write Engagement-reschedule tests.** `rescheduleEngagement` changes the unresolved target during Story without consuming Time allowance. It does not silently unlink/refund a previously committed linked Time allocation; if a linked allocation already exists and the requested reschedule would make that link contradictory, fail visibly instead of inventing semantics.

- [ ] **Step 6: Run focused tests and confirm red.**

  Run: `npx vitest run tests/time.test.ts tests/engagements.test.ts tests/orrery.test.ts`

  Expected: FAIL.

- [ ] **Step 7: Implement Story transitions with resource-local rechecks.** No ordinary Story command uses global expected revision. Every transition rechecks expected month, phase, pending/resolved state, and allowance/reference consistency.

- [ ] **Step 8: Implement event/fingerprint/coherence mappings.** Use exact event names `time_rescheduled`, `time_spent`, `time_wasted`, `orrery_time_spent`, `engagement_time_committed`, `engagement_resolved`, `engagement_rescheduled`.

- [ ] **Step 9: Run focused tests.**

  Run: `npx vitest run tests/time.test.ts tests/engagements.test.ts tests/orrery.test.ts`

  Expected: PASS.

- [ ] **Step 10: Commit.**

  Commit message: `feat: resolve M4 story resources`

---

## Task 10: Implement Wizardmoot Attendance, Complete Meeting, and Atomic Next Month

**Files**

- Modify: `shared/domain/v3-transitions.ts`, `convex/v3Commands.ts`, `convex/canonicalCommit.ts`, `shared/domain/activity.ts`
- Create: `tests/monthTransition.test.ts`
- Test: extend `tests/lifecycle.test.ts`, `tests/time.test.ts`

**Interfaces**

- Produces: `adjustWizardmootAttendance`, `completeMeeting`, `beginNextMonth`.

- [ ] **Step 1: Write attendance adjustment tests.** During Meeting, actual attendance defaults from derived expected. Changing actual away from expected requires a non-empty reason. Returning actual to expected clears the exception reason. Expected is always derived and never stored.

- [ ] **Step 2: Write Complete Meeting tests.** `completeMeeting(expectedMonthOrdinal)` requires Meeting, spends every pending Meeting-destination Time allocation regardless of exceptional actual absence, leaves other unresolved Time untouched, emits `meeting_completed`, and enters Quiet in the same canonical revision. There is no separate `advancePhase(meeting -> quiet)` action.

- [ ] **Step 3: Write next-month warning tests.** Quiet with unresolved obligations and `acknowledgeWarnings: false` returns `WARNING_ACK_REQUIRED` with zero writes. Explicit acknowledgement allows rollover without silently resolving those old obligations; the prior complete snapshot preserves them for audit/recovery.

- [ ] **Step 4: Write atomic month-transition tests.** One accepted `beginNextMonth` advances calendar exactly once, advances all five planets exactly once, archives actual Wizardmoot attendance under the old month, creates new Present-Wizard Time/Engagement resources, resets allowance usage, clears current-month Wizardmoot attendance to null, and enters New Moon. Two concurrent distinct intents against the same expected month result in one success and one stale failure.

- [ ] **Step 5: Write Undo regression tests for the atomic transitions.** Undo of `completeMeeting` restores Meeting Time + Meeting phase together. Undo of `beginNextMonth` restores the entire prior Quiet-month state, including calendar, planets, allocations, Engagements, attendance, and history.

- [ ] **Step 6: Run focused tests and confirm red.**

  Run: `npx vitest run tests/monthTransition.test.ts tests/lifecycle.test.ts tests/time.test.ts`

  Expected: FAIL.

- [ ] **Step 7: Implement attendance/Meeting transitions.** Use current derived expected value when validating exception reason. `completeMeeting` is the only ordinary Meeting -> Quiet transition.

- [ ] **Step 8: Implement `beginNextMonth`.** Require expected month + Quiet; recompute warnings; require acknowledgement when needed; perform every month change in one pure transition and one canonical commit; emit `month_begun` including acknowledged warning codes.

- [ ] **Step 9: Run focused tests.**

  Run: `npx vitest run tests/monthTransition.test.ts tests/lifecycle.test.ts tests/time.test.ts`

  Expected: PASS.

- [ ] **Step 10: Commit.**

  Commit message: `feat: complete M4 meeting and month rollover`

---
## Task 11: Regress V3 Recovery, Checkpoints, Backup, Verifier, and Legacy Rejection

**Files**

- Modify: `convex/campaign.ts`, `convex/backup.ts`, `convex/verifyMigration.ts`, `shared/domain/activity.ts`, `shared/domain/backup-preview.ts`
- Test: `tests/undoRedo.test.ts`, `tests/undoRedoSafety.test.ts`, `tests/checkpoints.test.ts`, `tests/backup.test.ts`, `tests/verification.test.ts`, `tests/v3Legacy.test.ts`

**Interfaces**

- Produces: unchanged generic recovery semantics operating on V3 complete snapshots; V1/V2 clear rejection; deletion barrier applied to recovery/import/export writes.

- [ ] **Step 1: Update existing recovery fixtures to representative V3 states.** Include at least one Setup snapshot, one Planning state with partial scheduling, one Story state with a spent Orrery allocation, one Meeting state with exceptional actual attendance, and one Quiet state before next-month rollover.

- [ ] **Step 2: Run recovery suites and capture failures caused by the V3 cutover.**

  Run: `npx vitest run tests/undoRedo.test.ts tests/undoRedoSafety.test.ts tests/checkpoints.test.ts tests/backup.test.ts tests/verification.test.ts tests/v3Legacy.test.ts`

  Expected before fixes: failures where fixtures/return shapes/loaders still assume V2.

- [ ] **Step 3: Update Undo/Redo for V3 without changing semantics.** Preserve existing expected-revision/history-navigation behavior. Historical load accepts V3 only. Undo/Redo must restore complete V3 snapshots, not replay events.

- [ ] **Step 4: Update checkpoints.** Create/restore V3 snapshots with existing checkpoint semantics. Checkpoint mutations reject during deletion. V1/V2 checkpoint state rejects explicitly.

- [ ] **Step 5: Update portable backup.** Backup container format version remains unchanged solely because CampaignState becomes V3. Export a complete V3 campaign; import only supported state schema (V3 at M4). V1/V2 backup state rejects clearly. Import/export are unavailable while deletion marker exists.

- [ ] **Step 6: Update verifier.** Healthy V3 graph passes. V1/V2 snapshots/state in a post-reset V3 graph are reported as unsupported/corrupt. The verifier remains graph/state-version aware, not game-mechanic aware.

- [ ] **Step 7: Add atomic-command recovery assertions.** Undo one `spendOrreryTime` restores both planet and Time allocation. Undo one `beginNextMonth` restores the entire prior month. Redo returns the complete accepted resulting snapshot.

- [ ] **Step 8: Run recovery suites.**

  Run: `npx vitest run tests/undoRedo.test.ts tests/undoRedoSafety.test.ts tests/checkpoints.test.ts tests/backup.test.ts tests/verification.test.ts tests/v3Legacy.test.ts`

  Expected: PASS.

- [ ] **Step 9: Run full repository check.**

  Run: `npm run check`

  Expected: PASS.

- [ ] **Step 10: Commit.**

  Commit message: `test: preserve recovery semantics on V3`

---

## Task 12: Build Lifecycle UI, Setup UI, Orrery Surface, and Campaign Tools

**Files**

- Create: `src/NoCampaign.tsx`, `src/DeletionInProgress.tsx`, `src/SetupView.tsx`, `src/PlayShell.tsx`, `src/CampaignTools.tsx`, `src/surfaces/OrreryView.tsx`, `src/surfaces/TableWizards.tsx`
- Modify: `src/App.tsx`, `src/CampaignSetup.tsx`, `src/index.css`
- Test: use existing frontend/component test location if present; if the repo has no component-test harness, keep deterministic view-model logic pure/testable and cover browser behavior in Task 14.

**Interfaces**

- Consumes: `getCampaignLifecycle`, Start/Delete/Setup/Begin Play backend APIs, V3 campaign queries.
- Produces: explicit lifecycle top-level and reusable Play surface shell.

- [ ] **Step 1: Separate loading from no-campaign.** In `App.tsx`, `useQuery(...) === undefined` is loading and must not render an active Start New Campaign button. Only an explicit `none` lifecycle result renders `NoCampaign`.

- [ ] **Step 2: Implement the top-level lifecycle switch.** Render loading, `DeletionInProgress`, `NoCampaign`, `SetupView`, or `PlayShell`. Never expose partially deleting campaign content.

- [ ] **Step 3: Implement `NoCampaign`.** Start New Campaign is explicit, shows mutation pending/error state, and cannot be triggered while lifecycle query says deleting.

- [ ] **Step 4: Implement `DeletionInProgress`.** Show that campaign deletion is global, destructive, and in progress. Expose status and a safe `Resume deletion` operation only. Do not show Play, Setup, Undo/Redo, checkpoint, backup import/export, or Start New Campaign.

- [ ] **Step 5: Refactor existing `CampaignSetup` into `SetupView` composition.** Reuse M3 Player/Wizard/Pact-seat controls. Add Age-specific Orrery setup: fixed preset display for Awakening/Calamity; Dominion season choice + track-position selectors. Show source guidance for the opening Wizardmoot without a persisted completion flag.

- [ ] **Step 6: Add Begin Play UI.** Display completeness issues before submit. Send current revision as `expectedRevision`. On stale failure refresh the authoritative Setup and require review rather than auto-retrying.

- [ ] **Step 7: Implement strong Delete Campaign confirmation.** Require explicit confirmation text matching backend contract and pass `expectedCampaignId`. After request commits, transition immediately to `DeletionInProgress`; do not present Delete as Undo-able.

- [ ] **Step 8: Implement `OrreryView`.** Render 12 Houses/month labels, derived Sun, five planetary Arcs/track positions, readable House memberships/conjunctions, and meaningful responsive sizing. Setup Dominion position UI snaps/clicks legal segments; no free degree input/drag.

- [ ] **Step 9: Implement `TableWizards`.** Show Pact seat/status, Wizard, portraying Player, and compact Watcher-assignment summary using existing M3 facts. Do not turn this into a full Wizard sheet or Watcher system.

- [ ] **Step 10: Implement `CampaignTools`.** Move Undo/Redo, checkpoints, backup/import, verifier/diagnostics, and Delete/Start Over here. Copy must make Undo/Redo explicitly global campaign recovery rather than casual personal editing.

- [ ] **Step 11: Implement the flexible shell mechanics in `PlayShell`.** Persistent chrome always shows authoritative month/phase. Support one full-width surface or primary + secondary reference. Play surfaces are Current Phase, Orrery, Table/Wizards. Setup and Campaign Tools are secondary destinations, not ordinary Play/reference surfaces.

- [ ] **Step 12: Implement browser-local navigation semantics.** Keep primary/secondary selected surface, full-width promotion, participant focus, and per-pane reference back/forward stacks in local React state (or lightweight browser-local persistence only if already used). Following a reference normally opens it in the secondary surface. A manually selected non-Phase surface remains open when the shared phase changes. A pane showing Current Phase follows the new phase. Persistent chrome offers `Open current phase`/`Return to current phase` without changing campaign state.

- [ ] **Step 13: Run build/check.**

  Run: `npm run check`

  Expected: PASS.

- [ ] **Step 14: Commit.**

  Commit message: `feat: add M4 lifecycle and surface shell`

---

## Task 13: Build Phase Workspaces and Realtime Stale/Warning UX

**Files**

- Create: `src/surfaces/CurrentPhase.tsx`, `src/surfaces/PlanningSurface.tsx`, `src/surfaces/StorySurface.tsx`, `src/surfaces/MeetingSurface.tsx`
- Modify: `src/PlayShell.tsx`, `src/surfaces/OrreryView.tsx`, `src/index.css`

**Interfaces**

- Consumes: M4 gameplay mutations and current V3 subscription.
- Produces: complete normal monthly Play UI.

- [ ] **Step 1: Implement New Moon default.** Orrery is dominant; show newly advanced month/planet state and an ordinary Advance to Visions action. Do not foreground a Wizard by default.

- [ ] **Step 2: Implement Visions default.** Show Orrery alongside explicit manual Domain/Impact guidance. Do not create Impact state or imply that Domain changes have been automated.

- [ ] **Step 3: Implement Planning surface.** Foreground a local selected Time participant/Wizard inside this surface only. Default to associated Wizard if current app/session context can infer it, otherwise a neutral first eligible participant. Other participants remain switchable/visible. Schedule Time and Engagements live through canonical mutations. Show incomplete-plan warnings without blocking editing.

- [ ] **Step 4: Implement Story surface.** Table-oriented remaining Time/Engagement overview; expanding a participant exposes pending actions. Manual spend/waste, Story reschedule, Engagement resolution/reschedule, and avoiding-Denizen Time commit all use the exact resource-local backend intents.

- [ ] **Step 5: Implement Orrery Time resolution UI.** When resolving a pending Orrery allocation, choose eligible planet and forward/backward direction at resolution time, show a non-authoritative preview, then confirm one atomic `spendOrreryTime` mutation. Never schedule planet/direction in Planning.

- [ ] **Step 6: Implement Meeting surface.** Display derived expected attendance next to persisted actual attendance. Changing actual away from expected requires inline reason before mutation. Complete Meeting is the single action that spends Meeting Time and enters Quiet.

- [ ] **Step 7: Implement Quiet surface.** Show manual wrap-up guidance and any unresolved-month warnings. Begin Next Month is prominent. A warned rollover requires explicit `Proceed anyway` before resubmission with acknowledgement.

- [ ] **Step 8: Implement hard-error / warning / guidance presentation.** Hard command failures show zero-write errors and refresh relevant authoritative state. Strong warnings produce explicit confirmation/resubmit. Manual guidance is informational and never masquerades as completed automation.

- [ ] **Step 9: Implement stale-context UX.** If a Planning control is submitted after Story began, or a resource was consumed elsewhere, display that campaign state changed and ask the user to review. Do not reinterpret Planning scheduling as Story rescheduling or auto-retry changed intent.

- [ ] **Step 10: Preserve local presentation during realtime updates.** Realtime subscriptions update data inside open surfaces. They do not close manually selected references or reset reference navigation. When phase changes, only Current Phase panes follow it; non-Phase surfaces remain.

- [ ] **Step 11: Verify responsive behavior.** Full-width and split layouts must keep Orrery usable at normal laptop widths, allow the Orrery to be hidden/replaced when another surface needs space, and turn secondary reference into a drawer/stacked experience on narrow screens without creating a general window manager.

- [ ] **Step 12: Run repository check.**

  Run: `npm run check`

  Expected: PASS.

- [ ] **Step 13: Commit.**

  Commit message: `feat: add M4 phase workspaces`

---

## Task 14: Real-Convex Rehearsal, Multi-Batch Deletion Proof, End-to-End Verification, and Docs

**Files**

- Modify only as verification reveals bounded bugs: implementation/test files from prior tasks
- Modify durable docs after behavior is proven: `docs/architecture/state-model.md`, `docs/persistence-evolution-contract.md`, `docs/recovery-runbook.md`, `docs/environments.md`, `ROADMAP.md`, and any existing deployment procedure that would otherwise be false

**Interfaces**

- Produces: evidence that M4 meets state-safety, concurrency, deployment, deletion, and normal-play completion requirements.

- [ ] **Step 1: Run the entire automated suite.**

  Run: `npm run check`

  Expected: PASS with all existing and new deterministic tests.

- [ ] **Step 2: Prove deletion needs and uses multiple batches on disposable Convex.** Seed/generate a disposable campaign history containing more than `DELETION_BATCH_SIZE` records in at least campaign events, revisions, and snapshots. Request deletion. Confirm at least two worker batches are required, normal writes/recovery/import/start are blocked immediately, the initiating browser can close, cleanup continues/safely resumes, all six campaign-owned collections become empty, canonical campaign is deleted near the end, and deletion marker disappears last.

- [ ] **Step 3: Rehearse interrupted deletion.** On disposable Convex, stop or deliberately fail the worker after at least one committed batch using a test-only/dev-safe mechanism, confirm marker/progress remain, then call `resumeCampaignDeletion` and verify successful completion with no orphan records.

- [ ] **Step 4: Rehearse deletion concurrency.** Two near-simultaneous delete requests for the same expected campaign must not create two operations. Gameplay/recovery writes racing after barrier creation must fail. Start New Campaign must remain blocked until final marker removal.

- [ ] **Step 5: Rehearse actual Convex V3 serialization.** Start a fresh V3 campaign, persist partially completed Setup and Planning, refresh/reconnect, and confirm exact authoritative state round-trips.

- [ ] **Step 6: Rehearse true phase/month concurrency.** From two browser sessions, race Planning -> Story and Quiet -> New Moon. Exactly one distinct logical transition succeeds in each case; the loser receives stale context. No double phase/month advance occurs.

- [ ] **Step 7: Rehearse resource concurrency.** Race two clients spending/rescheduling the same allocation and resolving the same Engagement. Exactly one consuming intent succeeds; unrelated edits do not fail merely due to unrelated revision changes.

- [ ] **Step 8: Rehearse browser backup boundary.** Export/download a V3 backup and import it through the real browser/file boundary into a valid fresh context. Confirm V1/V2 backup rejection separately with a minimal unsupported fixture, not valuable old data.

- [ ] **Step 9: Rehearse the full disposable-campaign M4 scenario.** Start New Campaign -> complete enough Setup -> Begin Play -> inspect New Moon -> acknowledge Visions guidance -> Planning partial schedules -> refresh/reconnect -> finish Planning -> Story manual/Orrery/Engagement actions -> Meeting attendance adjustment -> Complete Meeting -> Quiet -> Begin Next Month -> all clients converge on one authoritative New Moon state.

- [ ] **Step 10: Rehearse recovery on meaningful M4 changes.** Undo/Redo Orrery Time and next-month rollover; checkpoint/restore representative V3 state; verifier passes after each healthy operation.

- [ ] **Step 11: Update durable docs to actual implemented behavior.** Mark V3 as executed baseline; document scalable deletion barrier/worker and operational resume; document the actual V1/V2 retirement sequence used; update recovery/deployment runbooks; mark ROADMAP M4 implemented only after all acceptance checks pass. Historical M3 docs remain historical and should not be rewritten as though M3 had different behavior.

- [ ] **Step 12: Final source/diff review.** Inspect actual implementation, not only Bolt reports. Check no silent V1/V2 support remains, no free month mutation remains, no event is created for campaign Start/Delete, all accepted gameplay revisions have complete snapshots, and deletion is generic/bounded/indexed.

- [ ] **Step 13: Commit final hardening/docs.**

  Commit message: `docs: complete M4 verification and rollout`

---

## Rollout Plan

### Why a temporary transition deployment is required

Current persisted snapshots use a V1/V2-only validator. A final V3-only schema cannot be deployed over retained V1/V2 campaign/snapshot records. The approved legacy break permits clearing those records rather than semantically migrating them.

A temporary transition deployment is therefore required to stop V2 auto-creation and provide the durable generic deletion path before the V3-only cutover.

### Important correction to the earlier plan

The transition deployment does **not** need to add V3 to a V1/V2/V3 validator union. No V3 record needs to exist before the disposable V1/V2 graph is cleared.

Use this smallest safe sequence:

1. Build/deploy the Task 1 transition-safe commit while CampaignState persisted validators remain V1/V2-compatible.
2. Transition deployment adds `campaignDeletionOperations`, generic deletion worker/barrier, and stops `ensureCampaign` from creating new V2 campaigns.
3. Human verifies the exact target Convex deployment.
4. If a pre-M4 campaign exists, request deletion with its expected campaign identity; if none exists, verify all six campaign-owned tables are already empty.
5. Let scheduled bounded cleanup finish; resume if interrupted.
6. Verify all campaign-owned tables are empty and no deletion marker remains. Production operational export is not required for this explicit Master-approved pre-release retirement.
7. Deploy the final V3-only runtime/schema from the completed M4 branch. Only now remove V1/V2 validators/migration support.
8. Explicitly Start New Campaign to create V3 revision 0.
9. Run verifier and the minimum environment smoke/recovery checks.

No EXPAND V1/V2/V3 compatibility union is required. Do not recreate Convex deployments or rotate credentials merely to clear state.

### Pre-release retirement versus normal M4 deletion

Use the same deletion barrier/batching worker for both wherever practical. The pre-release flow may be invoked through a human-controlled operational/internal entry point rather than the normal UI, but it must still use the same indexed bounded cleanup, durable marker, empty-graph verification, campaign-row-near-end, marker-last semantics.

---

## Inputs to M4 Persistence Design Checkpoint

### 1. CampaignState evolution

- Introduce `CampaignStateV3`, `schemaVersion: 3`.
- V3 is the new current/minimum historical supported baseline after the explicit reset.
- V1/V2 current state, snapshots, checkpoint restores, and portable backup imports are unsupported and fail closed.
- V3 future history returns to normal compatibility/evolution policy.

### 2. Phase representation

`PlayLifecycle.phase` is exactly:

```ts
"new_moon" | "visions" | "planning" | "story" | "meeting" | "quiet"
```

Setup is a lifecycle kind, not a phase.

### 3. Setup/Play state representation

- `calendar.monthOrdinal: MonthOrdinal | null`; null is allowed only in incomplete Setup.
- Setup lifecycle stores five nullable movable-planet positions.
- Play lifecycle requires non-null calendar, complete Orrery, phase, and current-month state.
- Fresh revision 0 contains no fake month/Orrery values.

### 4. Orrery/month/Sun authority

- Persist movable planet Arc-start positions as centidegree integers.
- Sun is derived only from `calendar.monthOrdinal` and participates in derived House/conjunction results.
- Ordinary setup uses legal printed position indexes mapped server-side; ordinary Orrery Time moves one selected planet +/- one legal Arc.
- Planet/direction are chosen when Orrery Time is spent, not when scheduled.

### 5. Time participant/allocation representation

- `TimeParticipantRef` is currently `{ kind: "wizard"; wizardId }`, independent of Pact seat.
- A future non-Pact Wizard can use the same participant lifecycle without redesign.
- `effectiveBudget`, `rescheduleAllowance`, `reschedulesUsed`, and dynamic allocation collection are explicit values, not hard cardinalities.
- Destination union includes Companion element, Map/Isle/Sanctum, Familiar, Orrery, Meeting, Domain, Engagement, Special Use.
- Domain stays distinct and can be progressively refined later.

### 6. Engagement representation

- Monthly individually identified Engagement records.
- Target is null during partial Planning or Wizard/self/Familiar/manual named character.
- Optional linked Time allocation must be same acting Wizard, engagement destination, and uniquely linked.
- Planning known avoidance can link Time without allowance; Story linking consumes normal Time reschedule allowance; Engagement reschedule itself does not.

### 7. Wizardmoot attendance representation

- Expected attendance is derived from Meeting-destination Time and never persisted.
- Actual attendance is persisted during Meeting as `wizardId`, `attended`, `exceptionReason`.
- Reason required iff actual differs from current derived expected.
- Compact actual attendance history keyed by month persists across month rollover.

### 8. Hard invariants versus warnings

Hard errors include malformed state/IDs/references, Play without complete calendar/Orrery/monthly state, invalid linked Time, negative budgets/allowances, reschedule overuse, duplicate consumption, wrong phase/month context, or deletion barrier.

Strong warnings include incomplete Planning and unresolved Story/Quiet obligations. Warning transitions require an explicit server-validated acknowledgement and perform zero writes until acknowledged.

Manual guidance includes Visions Domain/Impact resolution and deeper manual Time/Quiet work.

### 9. Exact canonical command/event set

Gameplay intents/events are the table in this plan: Setup planet/season, Begin Play, Advance Phase, Time schedule/reschedule/spend/waste/Orrery spend, Engagement schedule/link/resolve/reschedule, Wizardmoot actual attendance adjustment, Complete Meeting, Begin Next Month, plus existing M3 Setup commands/events.

Start New Campaign and campaign deletion are administrative persistence lifecycle operations with no gameplay event.

### 10. Per-command concurrency semantics

- Broad Setup -> Play uses `expectedRevision`.
- Phase/month intents use expected month/phase.
- Planning edits have no global CAS and may use last-accepted-write behavior for the same allocation.
- Story/Meeting/resource actions recheck phase/month/resource/allowance locally; unrelated revisions do not reject them.
- Existing command idempotency remains intact.
- Delete request uses expected campaign identity and durable-marker idempotency.

### 11. Begin Play atomicity

One canonical commit validates complete Setup, advances pre-first month once, advances all five planets once, initializes Present-Wizard Time/Engagement state, and enters New Moon. Undo restores the complete Setup snapshot in one step.

### 12. Complete Meeting atomicity

One canonical commit resolves all Meeting-destination Time and enters Quiet. No separate generic Meeting -> Quiet advance exists.

### 13. Begin Next Month atomicity

One canonical commit checks Quiet/warnings, archives actual Wizardmoot attendance, advances calendar and all five planets once, creates fresh Present-Wizard monthly resources/reschedule allowance, clears Meeting attendance, and enters New Moon. Undo restores the whole prior month snapshot.

### 14. Scalable campaign deletion semantics

- Administrative, no campaign revision/event, not Undo-able.
- New generic `campaignDeletionOperations` barrier keyed by campaign key/id.
- Barrier exists before child deletion and blocks gameplay/recovery/backup/start operations.
- Scheduled indexed batches of 200 remove child records; interruption leaves durable deleting state and `resumeCampaignDeletion` restarts safely.
- Canonical campaign deleted near end; full graph verified empty; marker deleted last.
- Start remains blocked until marker is gone.
- Real Convex rehearsal must contain enough history for multiple batches.

### 15. Campaign-owned persistence graph

Repository inspection identified:

- `campaigns`
- `campaignRevisions`
- `campaignEvents`
- `campaignSnapshots`
- `campaignHistoryControl`
- `campaignCheckpoints`

`campaignDeletionOperations` is the administrative deletion barrier and is removed last. Legacy `numbers`/`events` are not campaign-owned.

### 16. Fresh campaign revision-0 behavior

`startNewCampaign` checks no deletion marker, no current campaign, and empty campaign-owned graph; creates a fresh campaign identity with incomplete V3 Setup at revision 0, complete revision-0 snapshot, and valid initial history control. No gameplay domain event is created.

### 17. V1/V2 retirement and rollout

- Temporary transition deployment: V1/V2-compatible validators + deletion barrier + stopped auto-create.
- Human verifies deployment and deletes/validates obsolete campaign graph in place.
- No V1/V2/V3 EXPAND union is needed because V3 is not written before reset.
- After graph empty, deploy V3-only runtime/schema and explicitly create V3.
- No required production export for this one Master-approved pre-release break.

### 18. Recovery implications

- V3 Undo/Redo/checkpoint/backup/verifier semantics remain generic and are regression-tested.
- V1/V2 historical artifacts reject clearly.
- Backup format version does not change solely for CampaignState V3.
- Deletion blocks recovery/import/export while partially deleting.

### 19. UI/component boundary

- Top-level lifecycle: loading / none / deleting / Setup / Play.
- Play surfaces: Current Phase, Orrery, Table/Wizards.
- Setup and Campaign Tools are secondary destinations.
- Full-width or primary+secondary layouts are browser-local.
- Reference navigation preserves current activity; each pane maintains local back/forward history.
- Current Phase panes follow phase changes; manually selected reference surfaces remain open.
- Wizard/participant focus is local to Planning/Story surfaces, not a global app identity.
- Orrery is default centerpiece/reference but may be hidden/replaced when another surface needs space.

### 20. Verification contract

Automated deterministic coverage includes V3 validation, Orrery geometry/conjunctions including Sun, phase/warning behavior, Time/Engagement/Meeting/month semantics, command idempotency/stale context, scalable deletion interruption/resumption/concurrency, full recovery regression, and V1/V2 rejection.

Manual/real boundaries include actual Convex serialization, true concurrency, multi-client realtime, partial Planning refresh, browser backup boundary, responsive Orrery, multi-batch deletion/recovery, environment wiring, and the full disposable M4 loop.

### 21. Implementation pass breakdown

- Pass A: Task 1 transition-safe generic deletion foundation.
- Pass B: Tasks 2-5 V3 domain/persistence foundation.
- Pass C: Tasks 6-10 lifecycle and monthly gameplay intents.
- Pass D: Task 11 recovery/legacy regression.
- Pass E: Tasks 12-13 UI shell/phase workspaces.
- Pass F: Task 14 rollout, real integration, hardening, durable docs.

---

## Self-Review Checklist

### Spec coverage

- CampaignState V3 / legacy retirement: Tasks 2, 5, 11, rollout.
- Scalable deletion addendum: Tasks 1 and 14.
- Campaign lifecycle: Tasks 1, 6, 12.
- Age/Setup/Begin Play: Tasks 3 and 6.
- Orrery: Tasks 3, 9, 12, 13.
- Time: Tasks 4, 8, 9, 10.
- Engagements: Tasks 4, 8, 9.
- Wizardmoot: Tasks 4, 7, 10, 13.
- Atomic month transition: Task 10.
- Warnings/errors/guidance: Tasks 4, 7, 10, 13.
- Recovery: Task 11.
- Flexible surfaces/reference navigation: Tasks 12-13.
- Real integration/rollout: Task 14.
- Deferred Lore/Notes/Watcher/Domain/Magic systems: explicitly excluded by Global Constraints and UI scope.

### Corrections verified against the reviewed earlier plan

- Setup does not fabricate month/planet values.
- Dominion season is represented.
- Orrery Time does not schedule planet/direction.
- Sun is included in derived conjunctions.
- Expected Wizardmoot attendance is derived, not persisted.
- `completeMeeting` enters Quiet atomically.
- Start/Delete create no gameplay event.
- Ordinary resource commands do not use unrelated global revision CAS.
- Strong warnings require explicit acknowledgement before write.
- Manual Time spend/waste is Story-only; Meeting Time resolves through Complete Meeting.
- Begin Play validates normal one-Present-Wizard-per-Player without structural cardinality.
- Loading is distinct from no campaign.
- Surface/reference navigation preserves local state.
- Whole-graph deletion is not one unbounded transaction.
- Transition rollout does not add an unnecessary V1/V2/V3 validator union.

### State safety

- Canonical gameplay commits preserved.
- Complete snapshots preserved.
- Audit events immutable.
- Unsupported state fails closed.
- Deletion barrier prevents partial-graph use.
- Deletion is resumable and bounded.
- Undo/Redo/checkpoint/backup/verifier semantics remain intact for V3.
- No production credentials or destructive operations are delegated to Bolt.

### Execution gate

**STOP after this plan and the formal M4 PERSISTENCE DESIGN CHECKPOINT. Do not implement CampaignState/schema/runtime changes until the Master/user approves that checkpoint.**
