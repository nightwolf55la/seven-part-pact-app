# M4 Shared Monthly Play Loop Implementation Plan

> **Execution gate:** Do not execute this plan until the M4 PERSISTENCE DESIGN
> CHECKPOINT has been approved by the Master/user. CampaignState/schema/runtime
> execution is BLOCKED pending that formal checkpoint.

**Goal:** Deliver the first complete shared monthly play loop for Seven-Part
Pact: Setup -> Begin Play -> New Moon -> Visions -> Planning -> Story ->
Meeting -> Quiet -> next New Moon, with Orrery, Time, and Engagement systems.

**Architecture:** React + Vite + TypeScript + Convex + Vercel

**Spec:** `docs/m4-shared-monthly-play-loop.md`

**Date:** 2026-09-01

---

## Global Constraints

1. **CampaignState authoritative.** The application is not event-sourced.
2. **Clients send intent; server computes authoritative result.**
3. **Canonical transactional persistence.** One accepted gameplay command
   creates one revision, one or more ordered domain events, and one complete
   resulting snapshot via `canonicalCommit`.
4. **Immutable audit history.** Events and revision records are never mutated.
5. **Persisted inconsistencies fail closed.** No silent recovery or guessing.
6. **V3 new minimum supported baseline.** V1/V2 explicitly unsupported after
   M4 reset. Attempts to restore/import V1/V2 fail clearly.
7. **No silent migration.** V1/V2 state is rejected, not auto-migrated to V3.
8. **Generic persistence/recovery remains game-domain-agnostic.**
   `canonicalCommit`, undo/redo, checkpoints, backup/import, verifier must
   not acquire Seven-Part-Pact-specific game knowledge.
9. **No automatic campaign creation.** App opening with no campaign shows
   explicit "Start New Campaign" action.
10. **No weakening Undo/Redo/checkpoint/backup/recovery semantics.** All
    existing M2 persistence/recovery invariants preserved for V3 campaigns.
11. **No deferred-system scope creep.** No Domain engines, Watcher UI, Lore,
    Notes, Magic, generic entity/task frameworks.

---

## Repository-Grounded File Map

### Files to Create

| Path | Responsibility |
|------|---------------|
| `shared/domain/orrery.ts` | Orrery model: planet definitions, Arc sizes, track geometries, centidegree math, position types, movement, derived Houses, conjunctions |
| `shared/domain/orrery-setup.ts` | Age-specific Orrery setup presets (Awakening, Calamity fixed; Dominion placement validation) |
| `shared/domain/time.ts` | Monthly Time types: participant, allocation, budget, reschedule allowance, destination families, allocation lifecycle (unscheduled/scheduled/spent/wasted) |
| `shared/domain/engagements.ts` | Monthly Engagement types: record, target variants, linked-Time, resolution |
| `shared/domain/monthly-state.ts` | Monthly play state container: phase, Time participants, Engagements, attendance history, allowances |
| `shared/domain/lifecycle.ts` | Campaign lifecycle types: Setup/Play discriminated union, phase progression, Begin Play validation |
| `shared/domain/v3-transitions.ts` | Pure V3 transition functions: phase transitions, Time scheduling/spend/waste/reschedule, Engagement scheduling/resolution, Meeting attendance, atomic month transition |
| `shared/domain/v3-commands.ts` | V3 command type definitions, fingerprint functions |
| `shared/domain/v3-events.ts` | V3 event type definitions |
| `shared/domain/v3-validation.ts` | V3-specific state validation (setup completeness, phase-valid operations, monthly-state coherence) |
| `convex/v3Commands.ts` | V3 Convex mutations: beginPlay, advancePhase, completeMeeting, beginNextMonth, scheduleTime, rescheduleTime, spendTime, wasteTime, resolveOrreryTime, scheduleEngagement, resolveEngagement, rescheduleEngagement, setMeetingAttendance, setOrreryPosition (setup) |
| `convex/v3Queries.ts` | V3 Convex queries: campaign lifecycle state, monthly state, phase state, orrery state |
| `convex/lifecycleCommands.ts` | Campaign lifecycle mutations: startNewCampaign, deleteCampaign |
| `src/PlayShell.tsx` | Play shell: persistent month/phase chrome, surface container |
| `src/surfaces/CurrentPhase.tsx` | Phase-specific primary content surface |
| `src/surfaces/OrreryView.tsx` | Orrery visual centerpiece surface |
| `src/surfaces/TableWizards.tsx` | Compact identity/reference surface |
| `src/NoCampaign.tsx` | No-campaign landing with Start New Campaign action |
| `src/SetupView.tsx` | Setup stage view (refactored from CampaignSetup, adds Orrery setup + Begin Play) |
| `src/CampaignTools.tsx` | Recovery/diagnostics secondary destination (undo/redo, checkpoints, backup) |
| `tests/orrery.test.ts` | Orrery math, movement, Houses, conjunctions |
| `tests/orrerySetup.test.ts` | Age-specific setup validation |
| `tests/time.test.ts` | Time budget, allocation, scheduling, spend/waste/reschedule |
| `tests/engagements.test.ts` | Engagement scheduling, resolution, linked-Time |
| `tests/lifecycle.test.ts` | Campaign lifecycle: create, delete, Begin Play, phase transitions |
| `tests/monthTransition.test.ts` | Atomic next-month transition |
| `tests/v3Validation.test.ts` | V3 state validation, setup completeness |
| `tests/v3Legacy.test.ts` | V1/V2 rejection: unsupported snapshots/checkpoints/backups fail closed |

### Files to Modify

| Path | Changes |
|------|---------|
| `shared/domain/campaign-state.ts` | Add `CampaignStateV3` type with discriminated Setup/Play lifecycle. Update `CurrentCampaignState = CampaignStateV3`, `CURRENT_STATE_SCHEMA_VERSION = 3`. Narrow `AnyCampaignState` to V3 only (or remove). |
| `shared/domain/state-migration.ts` | Remove `migrateV1toV2`, `migrateToCurrentVersion` V1/V2 paths. `loadHistoricalState` accepts only V3. `SUPPORTED_STATE_SCHEMA_VERSIONS = [3]`. Add explicit V1/V2 rejection with clear error. |
| `shared/domain/state-validation.ts` | `validateCampaignState` validates V3. `validateAnyCampaignState` validates V3 only. Remove V1/V2 validation paths. |
| `shared/domain/initial-state.ts` | `initialCampaignState()` returns V3 Setup state. Add `initialPlayState()` for Begin Play transition. |
| `shared/domain/commands.ts` | Add V3 command types. Remove `legacy_month_change`. Retire `move_month` from logical-state commands (see moveMonth analysis). Update `CAMPAIGN_COMMAND_TYPES`, `isLogicalStateCommandType`. |
| `shared/domain/events.ts` | Add V3 event types to `CampaignEvent` union. |
| `shared/domain/transitions.ts` | Remove or restrict `applyMoveMonth`. Replaced by atomic month transition in `v3-transitions.ts`. |
| `shared/domain/command-ids.ts` | Add fingerprint functions for V3 commands. Remove `moveMonthFingerprint` or restrict. |
| `shared/domain/activity.ts` | Add V3 event descriptions to `mapEventToActivityEntry` and `describeActivityEntry`. |
| `shared/domain/index.ts` | Re-export new V3 modules. Remove V1/V2-only exports. |
| `shared/domain/calendar.ts` | No structural changes. Remains the Sun/chronology authority. |
| `convex/schema.ts` | Update validators: `currentCampaignStateValidator` -> V3. `anyCampaignStateValidator` -> V3 only. Add V3 event validators to `campaignEventValidator`. Remove legacy `legacyCampaignValidator` from campaigns union. Remove `numbers` and `events` table definitions (or leave as empty legacy shells if Convex requires). |
| `convex/validators.ts` | Add V3 state validator, V3 event validators. Remove V1 state validator. Remove V2 state validator. Update `anyCampaignStateValidator`, `currentCampaignStateValidator`, `campaignEventValidator`. |
| `convex/canonicalCommit.ts` | Add V3 command-event coherence mappings. Remove `move_month` and `legacy_month_change` coherence. Add V3 command families to `validateEventCoherence`. |
| `convex/campaign.ts` | Remove `ensureCampaign` auto-creation. `getCampaign` returns null for no-campaign. Remove legacy campaign detection. Remove `moveMonth` mutation. Move undo/redo/checkpoint to be V3-aware (they remain generic). Update return validators for V3 state shape. |
| `convex/persistence.ts` | Update `serializeState` for V3. No structural changes needed. |
| `convex/m3Commands.ts` | M3 setup commands become Setup-stage-only. Add lifecycle-stage guard to each mutation (reject if campaign is in Play). |
| `convex/m3Queries.ts` | Update `getCampaignSetup` for V3 state shape. |
| `convex/backup.ts` | Update for V3 state. Backup format version unchanged. V3 backups validated correctly. V1/V2 backup import rejected. |
| `convex/verifyMigration.ts` | Update verifier for V3 state expectations. |
| `src/App.tsx` | Replace single-page layout with lifecycle-aware routing: NoCampaign -> SetupView -> PlayShell. Remove auto-create useEffect. Remove moveMonth buttons. Move undo/redo/checkpoints/backup to CampaignTools. |
| `src/CampaignSetup.tsx` | Refactor into SetupView.tsx or keep as child component of SetupView. Add Orrery setup and Begin Play button. |
| `src/main.tsx` | No changes expected unless routing added. |
| `src/index.css` | Extend with any needed utility styles. |

### Files to Delete/Retire

| Path | Reason |
|------|--------|
| `convex/executeMigration.ts` | V0.1 legacy migration no longer needed after V3 reset. |
| `convex/migration.ts` | V0.1 legacy migration support. |
| `convex/historyControlMigration.ts` | Legacy history control migration. |
| `convex/adminMigration.ts` | V1->V2 admin migration no longer needed. |

### Files Unchanged

| Path | Reason |
|------|--------|
| `shared/domain/brand.ts` | Utility type, no changes. |
| `shared/domain/canonical-json.ts` | Generic, no changes. |
| `shared/domain/errors.ts` | Generic, no changes. |
| `shared/domain/state-equality.ts` | Generic deep equality, works for V3. |
| `shared/domain/history-control.ts` | Generic, version unchanged. |
| `shared/domain/checkpoints.ts` | Generic, no changes. |
| `shared/domain/backup-preview.ts` | Update only if V3 preview needs new fields. |

---

## Task Decomposition

### Task A: V3 Pure Domain Foundation — CampaignState Shape and Lifecycle

**Files**
- Create: `shared/domain/lifecycle.ts`
- Modify: `shared/domain/campaign-state.ts`, `shared/domain/initial-state.ts`, `shared/domain/index.ts`
- Test: `tests/v3Validation.test.ts` (partial — lifecycle shape tests)

**Interfaces**
- Consumes: `MonthOrdinal` from `calendar.ts`, `PactSeatId`/`PactSeatState` from `pact-seats.ts`, `AgeDefinitionId` from `ages.ts`, `PlayerId`/`WizardId` from `ids.ts`
- Produces: `CampaignStateV3`, `SetupState`, `PlayState`, `LunarPhase`, `CurrentCampaignState` (now V3), `CURRENT_STATE_SCHEMA_VERSION = 3`

**Steps**

- [ ] Define `LunarPhase` literal union: `"new_moon" | "visions" | "planning" | "story" | "meeting" | "quiet"` in `shared/domain/lifecycle.ts`.
- [ ] Define `LUNAR_PHASE_ORDER` array for phase sequence validation.
- [ ] Define `SetupLifecycle = { stage: "setup" }` and `PlayLifecycle = { stage: "play"; phase: LunarPhase; monthOrdinal: MonthOrdinal; ... }` in `lifecycle.ts`. PlayLifecycle will hold monthly state references.
- [ ] Define `CampaignStateV3` in `campaign-state.ts`:
  ```
  CampaignStateV3 = {
    schemaVersion: 3;
    ruleset: { id: "seven_part_pact_draft4"; version: 1 };
    calendar: { monthOrdinal: MonthOrdinal };
    configuration: { ageId: AgeDefinitionId | null; facilitatorPlayerId: PlayerId | null };
    players: readonly CampaignPlayer[];
    wizards: readonly CampaignWizard[];
    pactSeats: { readonly [K in PactSeatId]: PactSeatState };
    orrery: OrreryState;  // planet positions — defined in Task E
    lifecycle: SetupLifecycle | PlayLifecycle;
    wizardmootHistory: readonly WizardmootHistoryEntry[]; // compact cross-month
  }
  ```
  Note: `OrreryState`, `PlayLifecycle` monthly fields, and `WizardmootHistoryEntry` are forward-declared here and fully defined in later tasks. The V3 type must compile at each task boundary but some fields may start as placeholder types refined in subsequent tasks.
- [ ] Update `CURRENT_STATE_SCHEMA_VERSION = 3`.
- [ ] Update `CurrentCampaignState = CampaignStateV3`.
- [ ] Remove `AnyCampaignState` union or narrow to `CampaignStateV3` only.
- [ ] Update `initialCampaignState()` in `initial-state.ts` to return a V3 Setup state: `lifecycle: { stage: "setup" }`, `orrery` with null/initial positions, empty `wizardmootHistory`, same configuration/players/wizards/pactSeats defaults.
- [ ] Write tests in `tests/v3Validation.test.ts`:
  - `initialCampaignState()` produces `schemaVersion: 3` and `lifecycle.stage === "setup"`.
  - V3 state round-trips through structural validation.
- [ ] Run: `npx vitest run tests/v3Validation.test.ts` — expect pass.

---

### Task B: Orrery Domain Model

**Files**
- Create: `shared/domain/orrery.ts`, `shared/domain/orrery-setup.ts`
- Test: `tests/orrery.test.ts`, `tests/orrerySetup.test.ts`

**Interfaces**
- Consumes: `MonthOrdinal` from `calendar.ts`, `AgeDefinitionId` from `ages.ts`
- Produces: `OrreryState`, `PlanetId`, `PlanetDefinition`, `CentidegreePosition`, `HouseMembership`, `movePlanet()`, `advanceAllPlanets()`, `deriveSunHouse()`, `deriveHouseMemberships()`, `deriveConjunctions()`, `getAwakeningPreset()`, `getCalamityPreset()`, `isLegalDominionPosition()`

**Steps**

- [ ] Define `CentidegreePosition` branded type (integer 0..35999) in `orrery.ts`.
- [ ] Define `PlanetId` literal union: `"saturn" | "jupiter" | "mars" | "venus" | "mercury"`.
- [ ] Define `PLANET_DEFINITIONS` array with each planet's:
  - `id: PlanetId`
  - `arcCentidegrees: number` — Saturn: 1000, Jupiter: 2250, Mars: 5250, Venus: 7500, Mercury: 10500
  - `trackSegmentCentidegrees: number` — Saturn: 1000, Jupiter: 750, Mars: 750, Venus: 1500, Mercury: 1500
  - `trackOffsetCentidegrees: number` — Saturn: 500 (offset 5deg from House boundaries), others: 0
  - `segmentCount: number` — Saturn: 36, Jupiter: 48, Mars: 48, Venus: 24, Mercury: 24
- [ ] Define `HOUSE_COUNT = 12`, `HOUSE_SIZE_CENTIDEGREES = 3000`, `FULL_CIRCLE_CENTIDEGREES = 36000`.
- [ ] Define `OrreryState`:
  ```
  { saturn: CentidegreePosition; jupiter: CentidegreePosition; mars: CentidegreePosition; venus: CentidegreePosition; mercury: CentidegreePosition }
  ```
- [ ] Implement `normalizeCentidegrees(cd: number): CentidegreePosition` — modular wrap to 0..35999.
- [ ] Implement `deriveSunHouse(monthOrdinal: MonthOrdinal): number` — returns house index 0..11.
- [ ] Implement `houseForCentidegree(cd: CentidegreePosition): number` — floor(cd / 3000) mod 12.
- [ ] Implement `housesOccupiedByArc(startCd: CentidegreePosition, arcCd: number): number[]` — half-open `[start, start+arc)`.
- [ ] Implement `deriveConjunctions(orrery: OrreryState, monthOrdinal: MonthOrdinal): Record<string, PlanetId[]>` — per-house bodies sharing at least one occupied house.
- [ ] Implement `legalPositions(planetId: PlanetId): CentidegreePosition[]` — all valid printed track positions.
- [ ] Implement `movePlanet(orrery: OrreryState, planetId: PlanetId, direction: "forward" | "backward"): OrreryState` — moves by exactly one Arc.
- [ ] Implement `advanceAllPlanets(orrery: OrreryState): OrreryState` — advances all 5 planets forward by their Arcs.
- [ ] In `orrery-setup.ts`: implement `getAwakeningPreset(): OrreryState` with the one completed Draft-4 arrangement.
- [ ] Implement `getCalamityPreset(): OrreryState` with the fixed Calamity arrangement.
- [ ] Implement `isLegalTrackPosition(planetId: PlanetId, position: CentidegreePosition): boolean`.
- [ ] Implement `dominionSetupValidation(orrery: OrreryState): string[]` — validates all planet positions are on legal track positions.
- [ ] Write tests in `tests/orrery.test.ts`:
  - `normalizeCentidegrees` wraps correctly for positive and negative inputs.
  - `deriveSunHouse(0)` returns house 0 (April/Aries).
  - `deriveSunHouse(6)` returns house 6.
  - Each planet has correct number of legal positions.
  - `movePlanet` advances Saturn by 1000 centidegrees (10 degrees).
  - `movePlanet` advances Mercury by 10500 centidegrees (105 degrees).
  - `housesOccupiedByArc` with half-open boundary: Arc ending exactly at house boundary does NOT include next house.
  - `housesOccupiedByArc` wrapping around 360 degrees.
  - `advanceAllPlanets` moves all 5 planets forward.
  - Conjunction detection: two planets sharing a house.
  - Sun does not appear in planet conjunctions (derived separately).
- [ ] Write tests in `tests/orrerySetup.test.ts`:
  - Awakening preset returns valid positions for all planets.
  - Calamity preset returns valid positions for all planets.
  - Dominion validation rejects off-track positions.
  - Dominion validation accepts on-track positions.
- [ ] Run: `npx vitest run tests/orrery.test.ts tests/orrerySetup.test.ts` — expect pass.

---

### Task C: Time and Engagement Domain Types

**Files**
- Create: `shared/domain/time.ts`, `shared/domain/engagements.ts`, `shared/domain/monthly-state.ts`
- Test: `tests/time.test.ts`, `tests/engagements.test.ts`

**Interfaces**
- Consumes: `WizardId` from `ids.ts`, `PlanetId` from `orrery.ts`, `LunarPhase` from `lifecycle.ts`
- Produces: `TimeAllocation`, `TimeDestination`, `TimeParticipant`, `EngagementRecord`, `EngagementTarget`, `MonthlyPlayState`, `WizardmootHistoryEntry`, `WizardmootAttendance`

**Steps**

- [ ] Define `AllocationId` branded string type (`alloc_` prefix) in `time.ts`.
- [ ] Define `TimeDestination` discriminated union:
  ```
  | { kind: "companion" }
  | { kind: "map_isle_sanctum" }
  | { kind: "familiar" }
  | { kind: "orrery"; planetId: PlanetId; direction: "forward" | "backward" }
  | { kind: "meeting" }
  | { kind: "domain" }
  | { kind: "engagement"; engagementId: EngagementId }
  | { kind: "special_use"; description: string }
  ```
- [ ] Define `AllocationOutcome`: `"pending" | "spent" | "wasted"`.
- [ ] Define `TimeAllocation`:
  ```
  { allocationId: AllocationId; destination: TimeDestination | null; outcome: AllocationOutcome; note: string | null }
  ```
- [ ] Define `TimeParticipant`:
  ```
  { wizardId: WizardId; budget: number; allocations: readonly TimeAllocation[]; rescheduleAllowance: number; reschedulesUsed: number }
  ```
- [ ] Define `EngagementId` branded string type (`eng_` prefix) in `engagements.ts`.
- [ ] Define `EngagementTarget` discriminated union:
  ```
  | { kind: "wizard"; wizardId: WizardId }
  | { kind: "self" }
  | { kind: "familiar" }
  | { kind: "named"; name: string }
  ```
- [ ] Define `EngagementRecord`:
  ```
  { engagementId: EngagementId; wizardId: WizardId; target: EngagementTarget | null; linkedTimeAllocationId: AllocationId | null; resolved: boolean }
  ```
- [ ] Define `WizardmootAttendance`:
  ```
  { wizardId: WizardId; expected: boolean; actual: boolean; exceptionReason: string | null }
  ```
- [ ] Define `MonthlyPlayState` in `monthly-state.ts`:
  ```
  { timeParticipants: readonly TimeParticipant[]; engagements: readonly EngagementRecord[]; meetingAttendance: readonly WizardmootAttendance[] | null }
  ```
  Note: `meetingAttendance` is null until Story->Meeting transition creates it.
- [ ] Define `WizardmootHistoryEntry`:
  ```
  { monthOrdinal: number; attendance: readonly { wizardId: WizardId; attended: boolean }[] }
  ```
- [ ] Implement `createInitialTimeParticipants(presentWizardIds: WizardId[]): TimeParticipant[]` — budget 4, rescheduleAllowance 1, reschedulesUsed 0, 4 unscheduled allocations each.
- [ ] Implement `createInitialEngagements(presentWizardIds: WizardId[]): EngagementRecord[]` — one unscheduled engagement per wizard.
- [ ] Implement `scheduleTimeAllocation(participant: TimeParticipant, allocationId: AllocationId, destination: TimeDestination): TimeParticipant`.
- [ ] Implement `rescheduleTimeAllocation(participant: TimeParticipant, allocationId: AllocationId, destination: TimeDestination): TimeParticipant` — consumes allowance, validates remaining > 0.
- [ ] Implement `spendTimeAllocation(participant: TimeParticipant, allocationId: AllocationId): TimeParticipant` — marks as spent.
- [ ] Implement `wasteTimeAllocation(participant: TimeParticipant, allocationId: AllocationId): TimeParticipant` — marks as wasted, preserves original destination.
- [ ] Implement `scheduleEngagement(engagement: EngagementRecord, target: EngagementTarget): EngagementRecord`.
- [ ] Implement `resolveEngagement(engagement: EngagementRecord): EngagementRecord`.
- [ ] Implement `deriveExpectedAttendance(timeParticipants: readonly TimeParticipant[]): WizardmootAttendance[]` — expected = has at least one meeting-destination allocation.
- [ ] Write tests in `tests/time.test.ts`:
  - `createInitialTimeParticipants` creates correct allocations per wizard.
  - Schedule an allocation: destination set, outcome remains pending.
  - Reschedule during Planning: no allowance consumed (handled by phase gate, not allowance check).
  - Reschedule during Story: allowance consumed, reschedulesUsed incremented.
  - Reschedule with no remaining allowance: rejected with error.
  - Spend allocation: outcome becomes spent.
  - Waste allocation: outcome becomes wasted, destination preserved.
  - Spend already-spent allocation: rejected.
  - Waste already-wasted allocation: rejected.
- [ ] Write tests in `tests/engagements.test.ts`:
  - `createInitialEngagements` creates one per wizard.
  - Schedule engagement target.
  - Resolve engagement: marked resolved.
  - Resolve already-resolved: rejected.
  - Linked-Time engagement: resolving also validates linked allocation exists.
- [ ] Run: `npx vitest run tests/time.test.ts tests/engagements.test.ts` — expect pass.

---

### Task D: V3 State Validation and Canonical Persistence Compatibility

**Files**
- Modify: `shared/domain/state-validation.ts`, `shared/domain/state-migration.ts`, `shared/domain/state-equality.ts`, `shared/domain/backup-preview.ts`, `shared/domain/backup.ts`
- Modify: `convex/validators.ts`, `convex/schema.ts`
- Test: `tests/v3Validation.test.ts` (extended), `tests/v3Legacy.test.ts`

**Interfaces**
- Consumes: `CampaignStateV3` from Task A, `OrreryState` from Task B, `MonthlyPlayState` from Task C
- Produces: `campaignStateV3Validator`, updated `anyCampaignStateValidator`, updated `currentCampaignStateValidator`, V3-aware `validateCampaignState`, explicit V1/V2 rejection in `loadHistoricalState`

**Steps**

- [ ] Write failing test in `tests/v3Legacy.test.ts`:
  - `loadHistoricalState` with V1 state throws `DomainError` with clear message.
  - `loadHistoricalState` with V2 state throws `DomainError` with clear message.
  - `loadHistoricalState` with V3 state succeeds.
  - `validateAnyCampaignState` rejects V1 and V2.
- [ ] Run: `npx vitest run tests/v3Legacy.test.ts` — expect failures.
- [ ] Update `state-migration.ts`:
  - Remove `migrateV1toV2`.
  - Remove V1/V2 branches from `migrateToCurrentVersion`.
  - `loadHistoricalState` validates as V3 only; throws `DomainError("UNSUPPORTED_SCHEMA_VERSION", ...)` for V1/V2.
  - `SUPPORTED_STATE_SCHEMA_VERSIONS = [3]`.
  - `isSupportedSchemaVersion` checks only `3`.
- [ ] Update `state-validation.ts`:
  - `validateCampaignState` validates V3 shape including lifecycle, orrery, monthly state.
  - `validateAnyCampaignState` accepts only V3.
- [ ] Run: `npx vitest run tests/v3Legacy.test.ts` — expect pass.
- [ ] Build `campaignStateV3Validator` in `convex/validators.ts`:
  - V3 shape with all nested validators for orrery, lifecycle, monthly state, wizardmoot history.
  - Add all new V3 event type validators (phase_advanced, play_begun, month_transitioned, time_scheduled, time_rescheduled, time_spent, time_wasted, orrery_time_resolved, engagement_scheduled, engagement_resolved, engagement_rescheduled, meeting_attendance_set, meeting_completed, campaign_created, campaign_deleted, orrery_position_set).
  - Update `campaignEventValidator` to include V3 events.
- [ ] Update `convex/validators.ts`:
  - `currentCampaignStateValidator = campaignStateV3Validator`.
  - `anyCampaignStateValidator = campaignStateV3Validator` (V3 only).
  - Remove `campaignStateV1Validator` and `campaignStateV2Validator`.
- [ ] Update `convex/schema.ts`:
  - Remove `legacyCampaignValidator` from `campaigns` table union.
  - Remove `numbers` table definition.
  - Remove `events` table definition.
  - `campaignSnapshots.state` uses V3-only validator.
- [ ] Write additional tests in `tests/v3Validation.test.ts`:
  - V3 state with Setup lifecycle validates.
  - V3 state with Play lifecycle validates.
  - V3 state with invalid phase rejects.
  - V3 orrery with out-of-range centidegrees rejects.
  - `statesDeepEqual` works for V3 states.
  - `assertPortableCampaignState` works for V3 states.
  - Backup preview extracts correct fields from V3 backup.
- [ ] Run: `npx vitest run tests/v3Validation.test.ts tests/v3Legacy.test.ts` — expect pass.

---

### Task E: Campaign Lifecycle — Create, Delete, No-Campaign

**Files**
- Create: `convex/lifecycleCommands.ts`
- Modify: `convex/campaign.ts`, `shared/domain/commands.ts`, `shared/domain/events.ts`, `shared/domain/initial-state.ts`
- Test: `tests/lifecycle.test.ts`

**Interfaces**
- Consumes: `CampaignStateV3` (Setup) from Task A, `initialCampaignState()` from Task A, persistence helpers from `convex/persistence.ts`
- Produces: `startNewCampaign` mutation, `deleteCampaign` mutation, updated `getCampaign` (returns null for no-campaign)

**Steps**

- [ ] Add `"start_new_campaign"` and `"delete_campaign"` to `CAMPAIGN_COMMAND_TYPES` in `commands.ts`. `start_new_campaign` is a logical-state command type. `delete_campaign` is NOT a canonical gameplay revision — it deletes the graph.
- [ ] Add `campaign_created` event type to `events.ts`.
- [ ] Write failing test in `tests/lifecycle.test.ts`:
  - `initialCampaignState()` returns V3 Setup state.
  - Campaign creation event has correct shape.
- [ ] Implement `startNewCampaign` mutation in `convex/lifecycleCommands.ts`:
  - Verifies no existing canonical campaign (fails if one exists with `CAMPAIGN_ALREADY_EXISTS`).
  - Verifies no orphan campaign-graph records (checks all 6 tables).
  - Generates fresh `campaignId`.
  - Creates campaign document with V3 Setup state at revision 0.
  - Creates revision-0 snapshot.
  - Creates history-control document with `undoStack: [0]`, `redoStack: []`.
  - Returns campaign view.
- [ ] Implement `deleteCampaign` mutation in `convex/lifecycleCommands.ts`:
  - Accepts `expectedCampaignId: string` for stale-deletion protection.
  - Loads canonical campaign; verifies `campaignId` matches expected.
  - Deletes ALL records from campaign-owned graph (campaigns, campaignRevisions, campaignEvents, campaignSnapshots, campaignHistoryControl, campaignCheckpoints) where `campaignId` matches.
  - Fails closed if any table contains records with a different campaignId.
  - This is NOT a canonical commit — no revision/event/snapshot created.
  - Returns `{ deleted: true }`.
- [ ] Update `getCampaign` in `convex/campaign.ts`:
  - Remove legacy campaign detection.
  - Return null when no canonical campaign exists (no auto-creation).
- [ ] Remove `ensureCampaign` mutation from `convex/campaign.ts`.
- [ ] Remove legacy `moveMonth` legacy-path code from `convex/campaign.ts`.
- [ ] Write tests in `tests/lifecycle.test.ts`:
  - `startNewCampaign` on empty graph succeeds with V3 Setup state.
  - `startNewCampaign` when campaign exists throws `CAMPAIGN_ALREADY_EXISTS`.
  - `deleteCampaign` with correct campaignId succeeds, all graph tables empty.
  - `deleteCampaign` with wrong campaignId throws stale-identity error.
  - `deleteCampaign` when no campaign exists throws error.
  - After deletion, `startNewCampaign` succeeds again.
- [ ] Run: `npx vitest run tests/lifecycle.test.ts` — expect pass.

---

### Task F: Setup Commands and Begin Play

**Files**
- Modify: `convex/m3Commands.ts`, `convex/m3Queries.ts`
- Create: `shared/domain/v3-validation.ts` (setup completeness validation)
- Modify: `shared/domain/v3-transitions.ts` (Begin Play transition), `convex/v3Commands.ts` (partial — `beginPlay`)
- Modify: `shared/domain/commands.ts`, `shared/domain/events.ts`
- Test: `tests/lifecycle.test.ts` (extended), `tests/v3Validation.test.ts` (extended)

**Interfaces**
- Consumes: `CampaignStateV3` (Setup), `OrreryState`, `advanceAllPlanets()`, `createInitialTimeParticipants()`, `createInitialEngagements()`
- Produces: `beginPlay` mutation, `validateSetupCompleteness()`, `applyBeginPlay()` pure transition

**Steps**

- [ ] Implement `validateSetupCompleteness(state: CampaignStateV3): string[]` in `v3-validation.ts`:
  - Returns list of missing requirements. Empty list = valid.
  - Checks: Age selected, Facilitator selected, every Pact seat has explicit status (present/silent/absent, not null), present/silent seats have Wizard assigned, present Wizards have portraying Player, every required Watcher assigned, Orrery setup complete (all planets at legal positions for the selected Age).
- [ ] Write failing tests for `validateSetupCompleteness`:
  - Empty Setup state returns multiple errors.
  - Fully configured Setup state returns empty list.
  - Missing Age returns specific error.
  - Seat with null status returns specific error.
  - Present seat without Wizard returns specific error.
- [ ] Implement `validateSetupCompleteness`. Run tests — expect pass.
- [ ] Add `"begin_play"` to `CAMPAIGN_COMMAND_TYPES`. It is a logical-state command.
- [ ] Add `play_begun` event to `events.ts`.
- [ ] Implement `applyBeginPlay(state: CampaignStateV3): { nextState: CampaignStateV3; events: CampaignEvent[] }` in `v3-transitions.ts`:
  - Validates `lifecycle.stage === "setup"`.
  - Validates setup completeness (fails if incomplete).
  - Advances `calendar.monthOrdinal` by 1.
  - Advances all 5 movable planets by their Arcs.
  - Determines present Wizard IDs.
  - Creates initial Time participants and Engagements.
  - Sets `lifecycle: { stage: "play", phase: "new_moon", monthlyState: { timeParticipants, engagements, meetingAttendance: null } }`.
  - Produces `play_begun` event with relevant data.
- [ ] Add lifecycle-stage guard to all M3 commands in `convex/m3Commands.ts`: if `state.lifecycle.stage !== "setup"`, throw `DomainError("INVALID_LIFECYCLE_STAGE", "Setup commands can only be used during campaign Setup")`.
- [ ] Implement `beginPlay` mutation in `convex/v3Commands.ts`:
  - Accepts `{ commandId, expectedRevision }`.
  - CAS check on `expectedRevision`.
  - Calls `applyBeginPlay`.
  - Canonical commit with `command_type: "begin_play"`.
- [ ] Write tests:
  - `applyBeginPlay` on incomplete setup throws.
  - `applyBeginPlay` on complete setup transitions to Play/new_moon.
  - Calendar advances once.
  - All planets advance once.
  - Time participants created for present Wizards only.
  - Engagements created for present Wizards only.
  - Silent Wizards get no Time/Engagements.
  - M3 commands rejected during Play stage.
- [ ] Run: `npx vitest run tests/lifecycle.test.ts tests/v3Validation.test.ts` — expect pass.

---

### Task G: Phase Transitions and Orrery Gameplay

**Files**
- Modify: `shared/domain/v3-transitions.ts`, `shared/domain/v3-commands.ts`, `shared/domain/v3-events.ts`
- Modify: `convex/v3Commands.ts` (add `advancePhase`, `resolveOrreryTime`, `setOrreryPosition`)
- Modify: `convex/canonicalCommit.ts` (add V3 event coherence)
- Test: `tests/lifecycle.test.ts` (extended), `tests/orrery.test.ts` (extended)

**Interfaces**
- Consumes: `LunarPhase`, `LUNAR_PHASE_ORDER`, `OrreryState`, `movePlanet()`, `TimeParticipant`
- Produces: `advancePhase` mutation, `resolveOrreryTime` mutation, `setOrreryPosition` (setup) mutation, `applyAdvancePhase()`, `applyResolveOrreryTime()`

**Steps**

- [ ] Define phase-transition validation in `v3-transitions.ts`:
  - Legal progressions: new_moon->visions, visions->planning, planning->story (locks scheduling), story->meeting (creates actual attendance defaults), meeting->quiet.
  - quiet->new_moon is a separate atomic command (`beginNextMonth`), NOT `advancePhase`.
- [ ] Implement `applyAdvancePhase(state: CampaignStateV3, expectedPhase: LunarPhase, expectedMonthOrdinal: number): { nextState, events }`:
  - Validates `lifecycle.stage === "play"`.
  - Validates `lifecycle.phase === expectedPhase` (stale-context protection).
  - Validates `calendar.monthOrdinal === expectedMonthOrdinal`.
  - Validates transition is legal (not quiet->anything via this command).
  - On planning->story: no special lock mutation needed; scheduling commands simply check phase.
  - On story->meeting: derives expected attendance, creates `meetingAttendance` from defaults.
  - Advances to next phase in sequence.
  - Produces `phase_advanced` event.
- [ ] Add `"advance_phase"` to command types. Add `phase_advanced` event type.
- [ ] Implement `advancePhase` mutation in `convex/v3Commands.ts` with CAS on expectedRevision.
- [ ] Implement `applyResolveOrreryTime(state: CampaignStateV3, wizardId: WizardId, allocationId: AllocationId, planetId: PlanetId, direction: "forward" | "backward"): { nextState, events }`:
  - Validates allocation exists, is pending, has orrery destination matching planetId/direction.
  - Validates planet is eligible for movement.
  - Moves planet by its Arc.
  - Marks allocation as spent.
  - Produces `orrery_time_resolved` event.
  - All in one pure transition.
- [ ] Add `"resolve_orrery_time"` command type and `orrery_time_resolved` event type.
- [ ] Implement `resolveOrreryTime` mutation with CAS.
- [ ] Add `"set_orrery_position"` command for Setup-stage Orrery positioning:
  - Only valid during `lifecycle.stage === "setup"`.
  - Sets a planet to a specific legal track position.
  - Produces `orrery_position_set` event.
- [ ] Update `canonicalCommit.ts`: add V3 command-event coherence for `begin_play`, `advance_phase`, `resolve_orrery_time`, `set_orrery_position`.
- [ ] **Strong warnings** (not hard errors) for incomplete Planning/Story:
  - Implement `checkPlanningCompleteness(state)` and `checkStoryCompleteness(state)` that return warning messages.
  - `advancePhase` from planning->story and story->meeting: if warnings exist, the transition still succeeds but the event records the warning.
- [ ] Write tests:
  - Phase sequence: new_moon -> visions -> planning -> story -> meeting -> quiet succeeds.
  - Duplicate phase transition (stale expectedPhase) fails.
  - Wrong expectedMonthOrdinal fails.
  - quiet -> anything via advancePhase fails (must use beginNextMonth).
  - Orrery Time resolution: planet moves, allocation spent, single transaction.
  - Orrery Time with wrong planet fails.
  - Orrery Time with already-spent allocation fails.
  - Setup Orrery position: valid position accepted, off-track rejected.
  - Incomplete Planning warning does not block story transition.
- [ ] Run: `npx vitest run tests/lifecycle.test.ts tests/orrery.test.ts` — expect pass.

---

### Task H: Time Scheduling, Rescheduling, Spend, and Waste

**Files**
- Modify: `shared/domain/v3-transitions.ts`, `convex/v3Commands.ts`
- Test: `tests/time.test.ts` (extended with phase-aware integration tests)

**Interfaces**
- Consumes: `TimeParticipant`, `TimeAllocation`, `LunarPhase`, `MonthlyPlayState`
- Produces: `scheduleTime`, `rescheduleTime`, `spendTime`, `wasteTime` mutations

**Steps**

- [ ] Implement `applyScheduleTime(state, wizardId, allocationId, destination)`:
  - Validates phase is `planning` (free scheduling) or `story` (restricted).
  - During planning: sets destination, no allowance consumed.
  - During story: this is a reschedule (use `applyRescheduleTime` instead).
  - Produces `time_scheduled` event.
- [ ] Implement `applyRescheduleTime(state, wizardId, allocationId, destination)`:
  - Validates phase is `story`.
  - Validates allocation is pending (not spent/wasted).
  - Validates remaining reschedule allowance > 0.
  - Consumes one reschedule use.
  - Changes destination.
  - Produces `time_rescheduled` event.
- [ ] Implement `applySpendTime(state, wizardId, allocationId)`:
  - Validates phase is `story` or `meeting`.
  - Validates allocation is pending with a destination.
  - Marks as spent.
  - Produces `time_spent` event.
  - Meeting Time: cannot be manually spent during Story (Meeting Time stays pending until `completeMeeting`).
- [ ] Implement `applyWasteTime(state, wizardId, allocationId)`:
  - Validates allocation is pending.
  - Marks as wasted, preserves destination.
  - Produces `time_wasted` event.
- [ ] Add command types: `schedule_time`, `reschedule_time`, `spend_time`, `waste_time`.
- [ ] Add event types: `time_scheduled`, `time_rescheduled`, `time_spent`, `time_wasted`.
- [ ] Implement corresponding Convex mutations in `v3Commands.ts` (no CAS for Planning edits; CAS for Story rescheduling).
- [ ] Update `canonicalCommit.ts` with event coherence for Time commands.
- [ ] Write tests:
  - Schedule Time during Planning: succeeds freely.
  - Schedule Time during Story: rejected (must use reschedule).
  - Reschedule during Story: allowance consumed.
  - Reschedule with zero remaining allowance: rejected.
  - Spend pending allocation: succeeds.
  - Spend already-spent: rejected.
  - Waste allocation: destination preserved.
  - Meeting-destination Time cannot be manually spent during Story.
  - Phase guards: schedule only valid during planning, spend/waste during story.
- [ ] Run: `npx vitest run tests/time.test.ts` — expect pass.

---

### Task I: Engagement Scheduling and Resolution

**Files**
- Modify: `shared/domain/v3-transitions.ts`, `convex/v3Commands.ts`
- Test: `tests/engagements.test.ts` (extended)

**Interfaces**
- Consumes: `EngagementRecord`, `EngagementTarget`, `TimeAllocation`, `MonthlyPlayState`
- Produces: `scheduleEngagement`, `resolveEngagement`, `rescheduleEngagement` mutations

**Steps**

- [ ] Implement `applyScheduleEngagement(state, wizardId, engagementId, target, linkedAllocationId?)`:
  - Validates phase is `planning` or `story`.
  - During Planning: free assignment, no allowance cost.
  - If linkedAllocationId provided, validates it exists and is unscheduled or has engagement destination.
  - Produces `engagement_scheduled` event.
- [ ] Implement `applyResolveEngagement(state, wizardId, engagementId)`:
  - Validates phase is `story`.
  - Marks engagement resolved.
  - If linked Time allocation exists and Engagement was avoiding-Denizen: atomically spends the linked Time.
  - Produces `engagement_resolved` event.
- [ ] Implement `applyRescheduleEngagement(state, wizardId, engagementId, newTarget)`:
  - Source-defined Engagement reschedule: new target, does NOT consume Time reschedule allowance.
  - Validates engagement is unresolved.
  - Produces `engagement_rescheduled` event.
- [ ] Add command types: `schedule_engagement`, `resolve_engagement`, `reschedule_engagement`.
- [ ] Add event types: `engagement_scheduled`, `engagement_resolved`, `engagement_rescheduled`.
- [ ] Implement Convex mutations.
- [ ] Update `canonicalCommit.ts` coherence.
- [ ] Write tests:
  - Schedule engagement during Planning.
  - Resolve engagement during Story.
  - Resolve already-resolved: rejected.
  - Linked-Time avoiding-Denizen: resolving atomically spends linked Time.
  - Reschedule engagement: new target, no Time allowance consumed.
  - Story-time avoiding-Denizen extra Time via Time reschedule allowance.
- [ ] Run: `npx vitest run tests/engagements.test.ts` — expect pass.

---

### Task J: Meeting and Atomic Month Transition

**Files**
- Modify: `shared/domain/v3-transitions.ts`, `convex/v3Commands.ts`
- Test: `tests/monthTransition.test.ts`, `tests/lifecycle.test.ts` (extended)

**Interfaces**
- Consumes: `advanceAllPlanets()`, `createInitialTimeParticipants()`, `createInitialEngagements()`, `WizardmootAttendance`, `WizardmootHistoryEntry`
- Produces: `setMeetingAttendance`, `completeMeeting`, `beginNextMonth` mutations

**Steps**

- [ ] Implement `applySetMeetingAttendance(state, wizardId, actual, exceptionReason?)`:
  - Validates phase is `meeting`.
  - Updates actual attendance for the wizard.
  - If actual differs from expected, requires non-empty exceptionReason.
  - Produces `meeting_attendance_set` event.
- [ ] Implement `applyCompleteMeeting(state, expectedMonthOrdinal)`:
  - Validates phase is `meeting`.
  - Resolves all scheduled Meeting Time as spent (regardless of exceptional actual absence).
  - Produces `meeting_completed` event.
  - Does NOT advance phase — that's done by advancePhase(meeting->quiet).
- [ ] Implement `applyBeginNextMonth(state, expectedMonthOrdinal)`:
  - Validates phase is `quiet`.
  - Validates `calendar.monthOrdinal === expectedMonthOrdinal`.
  - Atomically:
    1. Advance `calendar.monthOrdinal` + 1.
    2. Advance all 5 planets by their Arcs.
    3. Archive Meeting actual attendance into `wizardmootHistory`.
    4. Create fresh Time participants for present Wizards.
    5. Create fresh Engagements for present Wizards.
    6. Reset reschedule usage/allowances.
    7. Set `lifecycle.phase = "new_moon"`.
  - Produces `month_transitioned` event.
- [ ] Add command types: `set_meeting_attendance`, `complete_meeting`, `begin_next_month`.
- [ ] Add event types: `meeting_attendance_set`, `meeting_completed`, `month_transitioned`.
- [ ] Implement Convex mutations with CAS.
- [ ] Update `canonicalCommit.ts` coherence.
- [ ] Write tests in `tests/monthTransition.test.ts`:
  - Full month cycle: new_moon through quiet -> beginNextMonth succeeds.
  - Calendar advances by exactly 1.
  - All 5 planets advance by their Arcs.
  - Wizardmoot attendance archived in history.
  - Fresh Time/Engagements created for present Wizards.
  - Reschedule allowances reset.
  - Phase is new_moon after transition.
  - Stale expectedMonthOrdinal rejected.
  - Undo of beginNextMonth restores entire prior month state.
- [ ] Write Meeting tests:
  - Default attendance matches expected.
  - Exceptional actual=false requires reason.
  - completeMeeting spends all Meeting Time.
  - completeMeeting during wrong phase rejected.
- [ ] Run: `npx vitest run tests/monthTransition.test.ts tests/lifecycle.test.ts` — expect pass.

---

### Task K: V3 Undo/Redo/Checkpoint/Backup Regression and V1/V2 Retirement

**Files**
- Modify: `convex/campaign.ts` (undo/redo updated for V3), `convex/backup.ts`, `convex/verifyMigration.ts`
- Delete: `convex/executeMigration.ts`, `convex/migration.ts`, `convex/historyControlMigration.ts`, `convex/adminMigration.ts`
- Modify: `shared/domain/activity.ts` (V3 event descriptions)
- Test: `tests/undoRedo.test.ts` (regression), `tests/undoRedoSafety.test.ts` (regression), `tests/checkpoints.test.ts` (regression), `tests/backup.test.ts` (regression), `tests/verification.test.ts` (regression), `tests/v3Legacy.test.ts` (extended)

**Interfaces**
- Consumes: All V3 state types, `canonicalCommit`
- Produces: V3-compatible undo/redo, checkpoint, backup, verifier; V1/V2 rejection tests

**Steps**

- [ ] Update `convex/campaign.ts` undo/redo mutations:
  - Remove legacy campaign fallback paths.
  - `loadCanonicalCampaign` remains generic (loads canonical campaign doc).
  - Undo/Redo operate on V3 snapshots via `loadHistoricalState` (now V3-only).
  - Return values updated for V3 state shape (may need richer return than just monthOrdinal).
- [ ] Update `convex/backup.ts`:
  - `exportPortableBackup`: works with V3 state. Backup format version unchanged.
  - `importPortableBackup`: validates imported state is V3. V1/V2 backups rejected by `loadHistoricalState` -> `validateAnyCampaignState` (V3-only).
- [ ] Update `convex/verifyMigration.ts`:
  - Verifier expects V3 current state.
  - All snapshots must be V3.
  - Rejects V1/V2 snapshots found in graph as corruption.
- [ ] Update `shared/domain/activity.ts`:
  - `mapEventToActivityEntry`: handle all V3 event types.
  - `describeActivityEntry`: human-readable descriptions for V3 events.
- [ ] Delete legacy migration files: `convex/executeMigration.ts`, `convex/migration.ts`, `convex/historyControlMigration.ts`, `convex/adminMigration.ts`.
- [ ] Run existing test suites and fix failures from V3 shape changes:
  - `npx vitest run tests/undoRedo.test.ts` — update fixtures to V3, verify undo/redo semantics preserved.
  - `npx vitest run tests/undoRedoSafety.test.ts` — same.
  - `npx vitest run tests/checkpoints.test.ts` — V3 checkpoint create/restore works.
  - `npx vitest run tests/backup.test.ts` — V3 backup export/import works.
  - `npx vitest run tests/verification.test.ts` — V3 verifier works.
- [ ] Add V1/V2 rejection tests to `tests/v3Legacy.test.ts`:
  - V1 portable backup import: rejected with clear error.
  - V2 portable backup import: rejected with clear error.
  - V1 snapshot encountered during undo: rejected.
  - V2 snapshot encountered during checkpoint restore: rejected.
  - Minimal legacy-shaped fixtures retained for these rejection tests.
- [ ] Remove legacy test fixtures whose sole purpose was V1/V2 migration testing. Keep rejection fixtures.
- [ ] Update tests that used `migrateV1toV2` or `migrateToCurrentVersion` with V1 input.
- [ ] Run full test suite: `npx vitest run` — expect all pass.

---

### Task L: Flexible Play Shell and UI

**Files**
- Create: `src/NoCampaign.tsx`, `src/PlayShell.tsx`, `src/SetupView.tsx`, `src/CampaignTools.tsx`, `src/surfaces/CurrentPhase.tsx`, `src/surfaces/OrreryView.tsx`, `src/surfaces/TableWizards.tsx`
- Modify: `src/App.tsx`, `src/CampaignSetup.tsx`

**Interfaces**
- Consumes: All V3 Convex queries and mutations, Convex React hooks
- Produces: Complete UI for No Campaign -> Setup -> Play lifecycle

**Steps**

- [ ] Implement `src/NoCampaign.tsx`:
  - Clean landing page with "Start New Campaign" button.
  - Calls `startNewCampaign` mutation on click.
  - Shows pending state during creation.
- [ ] Refactor `src/App.tsx` to lifecycle-aware top-level:
  - Query `getCampaign`.
  - If result is null/undefined: show `NoCampaign`.
  - If campaign exists with `lifecycle.stage === "setup"`: show `SetupView`.
  - If campaign exists with `lifecycle.stage === "play"`: show `PlayShell`.
  - Remove `ensureCampaign` auto-create useEffect.
  - Remove moveMonth buttons.
  - Remove inline undo/redo/checkpoint/backup UI (moved to CampaignTools).
- [ ] Implement `src/SetupView.tsx`:
  - Incorporates existing CampaignSetup component for M3 setup commands.
  - Adds Orrery setup section: planet positioning for selected Age.
  - Adds "Begin Play" button with setup completeness validation display.
  - Adds navigation to CampaignTools.
  - "Delete Campaign" button with strong confirmation.
- [ ] Refactor `src/CampaignSetup.tsx`:
  - Remove top-level rendering; becomes a child component of SetupView.
  - Remove any direct references to campaign loading (parent provides context).
- [ ] Implement `src/CampaignTools.tsx`:
  - Undo/Redo controls with explicit "shared campaign recovery" labeling.
  - Checkpoint create/list/restore.
  - Backup download/import.
  - Verification/diagnostics.
  - "Delete Campaign / Start Over" with strong confirmation.
- [ ] Implement `src/PlayShell.tsx`:
  - Persistent top chrome: current month display name, current phase, revision.
  - Surface container: primary + optional secondary/reference pane.
  - Default surface selection based on current phase.
  - Surface navigation controls (phase surface list).
  - Navigation to CampaignTools (secondary destination).
  - Phase-following: Current Phase surface follows realtime phase changes.
  - Manually selected reference surfaces stay where user left them.
- [ ] Implement `src/surfaces/CurrentPhase.tsx`:
  - Switches content based on `lifecycle.phase`:
    - **new_moon**: Orrery dominant display, newly advanced state inspection.
    - **visions**: Orrery + manual Domain/Impact guidance text.
    - **planning**: Time/Engagement scheduler with per-Wizard focus.
    - **story**: Remaining Time/Engagement overview, Orrery Time resolution, spend/waste controls.
    - **meeting**: Attendance display/editing, complete meeting action.
    - **quiet**: Manual wrap-up, Begin Next Month button prominent.
  - Each phase shows relevant warnings/guidance.
- [ ] Implement `src/surfaces/OrreryView.tsx`:
  - Visual Orrery display with 12 Houses, Sun position, 5 planets with Arcs.
  - Responsive layout.
  - House labels (month names).
  - Planet positions shown on tracks.
  - Conjunction indicators.
  - During Setup: interactive planet placement for Dominion Age.
  - During Play: read-only except for Orrery Time resolution (in CurrentPhase surface).
- [ ] Implement `src/surfaces/TableWizards.tsx`:
  - Compact table/list of all Wizards with seat, player, status.
  - Current monthly Time/Engagement summary per Wizard.
  - Reference surface — does not have interactive editing.
- [ ] Verify in dev server:
  - No-campaign state shows Start New Campaign.
  - Campaign creation enters Setup.
  - Setup UI allows all M3 commands + Orrery positioning.
  - Begin Play transitions to Play shell.
  - Phase progression through all 6 phases.
  - Time scheduling during Planning.
  - Phase chrome updates on all transitions.
  - CampaignTools accessible with undo/redo/checkpoints/backup.
  - Delete Campaign returns to No-Campaign state.
- [ ] Responsive behavior: test narrow viewport widths.

---

### Task M: Integration Verification and Completion

**Files**
- All test files
- No new files

**Steps**

- [ ] Run full test suite: `npx vitest run` — all tests pass.
- [ ] Run TypeScript check: `tsc -b` — no errors.
- [ ] Run build: `npm run build` — succeeds.
- [ ] Manual integration verification on disposable deployment:
  - Start New Campaign.
  - Complete Setup (Age, players, wizards, seats, Orrery).
  - Begin Play.
  - Progress through New Moon -> Visions -> Planning -> Story -> Meeting -> Quiet.
  - Schedule Time and Engagements during Planning.
  - Resolve Orrery Time during Story.
  - Set Meeting attendance.
  - Complete Meeting.
  - Begin Next Month.
  - Verify all clients see same authoritative state.
  - Undo month transition — entire prior month restored.
  - Create checkpoint, restore checkpoint.
  - Export backup, delete campaign, import backup into fresh campaign.
  - Verify verifier passes.
- [ ] Run disposable campaign deletion/recreation test.

---

## Inputs to M4 Persistence Design Checkpoint

### 1. Proposed CampaignState V3 Shape

```typescript
interface CampaignStateV3 {
  schemaVersion: 3;
  ruleset: { id: "seven_part_pact_draft4"; version: 1 };
  calendar: { monthOrdinal: MonthOrdinal };
  configuration: {
    ageId: AgeDefinitionId | null;
    facilitatorPlayerId: PlayerId | null;
  };
  players: readonly CampaignPlayer[];
  wizards: readonly CampaignWizard[];
  pactSeats: { readonly [K in PactSeatId]: PactSeatState };
  orrery: OrreryState; // { saturn, jupiter, mars, venus, mercury: CentidegreePosition }
  lifecycle:
    | { stage: "setup" }
    | {
        stage: "play";
        phase: LunarPhase;
        monthlyState: MonthlyPlayState;
      };
  wizardmootHistory: readonly WizardmootHistoryEntry[];
}
```

File: `shared/domain/campaign-state.ts`. Validator: `convex/validators.ts`.

### 2. V1/V2 Retirement

**Remove:**
- `migrateV1toV2`, `migrateToCurrentVersion` V1/V2 branches in `state-migration.ts`
- `campaignStateV1Validator`, `campaignStateV2Validator` in `convex/validators.ts`
- `legacyCampaignValidator` from `convex/schema.ts` campaigns union
- `numbers` and `events` table definitions from `convex/schema.ts`
- `convex/executeMigration.ts`, `convex/migration.ts`, `convex/historyControlMigration.ts`, `convex/adminMigration.ts`

**Retain (rejection fixtures):**
- Minimal V1/V2 shaped test data in `tests/v3Legacy.test.ts` to prove rejection.
- `loadHistoricalState` contains explicit V1/V2 rejection with `UNSUPPORTED_SCHEMA_VERSION` error.

### 3. Campaign-Owned Persistence Graph

| Table | Index for campaign-scoped queries |
|---|---|
| `campaigns` | `by_campaignKey` (always "default") |
| `campaignRevisions` | `by_campaign_revision(campaignId, campaignRevision)`, `by_campaign_commandId(campaignId, commandId)` |
| `campaignEvents` | `by_campaign_revision_index(campaignId, campaignRevision, eventIndex)` |
| `campaignSnapshots` | `by_campaign_revision(campaignId, campaignRevision)` |
| `campaignHistoryControl` | `by_campaignId(campaignId)` |
| `campaignCheckpoints` | `by_campaignId(campaignId)`, `by_checkpointId(checkpointId)` |

No new tables required. All M4 state lives within `CampaignStateV3` inside the existing persistence graph.

### 4. No-Campaign / Start New Campaign / Revision-0 Behavior

- `getCampaign` returns null when no canonical campaign exists.
- No auto-creation. `ensureCampaign` removed.
- `startNewCampaign`: creates fresh `campaignId`, V3 Setup state at revision 0, snapshot at revision 0, history control with `undoStack: [0]`.
- Revision-0 V3 state: `lifecycle: { stage: "setup" }`, all configuration null, empty players/wizards/pactSeats defaults, orrery zeroed, empty wizardmootHistory.

### 5. Campaign Deletion Transaction

- Accepts `expectedCampaignId` for stale-deletion protection.
- Single Convex transaction deletes ALL records from all 6 campaign-owned tables where `campaignId` matches.
- Fails closed if records with mismatched `campaignId` found.
- NOT a canonical commit — no revision/event/snapshot created.
- Not Undo-able. Requires strong UI confirmation.

### 6. Proposed Command Names

| Command | File | Lifecycle Stage |
|---|---|---|
| `start_new_campaign` | `convex/lifecycleCommands.ts` | No Campaign -> Setup |
| `delete_campaign` | `convex/lifecycleCommands.ts` | Any -> No Campaign |
| `begin_play` | `convex/v3Commands.ts` | Setup -> Play |
| `advance_phase` | `convex/v3Commands.ts` | Play (phase N -> phase N+1, except quiet) |
| `begin_next_month` | `convex/v3Commands.ts` | Play (quiet -> new_moon) |
| `schedule_time` | `convex/v3Commands.ts` | Play (planning) |
| `reschedule_time` | `convex/v3Commands.ts` | Play (story) |
| `spend_time` | `convex/v3Commands.ts` | Play (story/meeting) |
| `waste_time` | `convex/v3Commands.ts` | Play (story) |
| `resolve_orrery_time` | `convex/v3Commands.ts` | Play (story) |
| `schedule_engagement` | `convex/v3Commands.ts` | Play (planning/story) |
| `resolve_engagement` | `convex/v3Commands.ts` | Play (story) |
| `reschedule_engagement` | `convex/v3Commands.ts` | Play (story) |
| `set_meeting_attendance` | `convex/v3Commands.ts` | Play (meeting) |
| `complete_meeting` | `convex/v3Commands.ts` | Play (meeting) |
| `set_orrery_position` | `convex/v3Commands.ts` | Setup |
| Existing M3 setup commands (11) | `convex/m3Commands.ts` | Setup only |
| `undo`, `redo` | `convex/campaign.ts` | Any (generic) |
| `checkpoint_restore` | `convex/campaign.ts` | Any (generic) |
| `backup_import` | `convex/backup.ts` | Any (generic) |

Retired: `move_month`, `legacy_month_change`.

### 7. Proposed Event Types

New V3 events (all version 1):
- `campaign_created` — Start New Campaign
- `play_begun` — Begin Play
- `phase_advanced` — Phase transition
- `month_transitioned` — Atomic month transition
- `time_scheduled` — Time allocation scheduled
- `time_rescheduled` — Time rescheduled during Story
- `time_spent` — Time spent
- `time_wasted` — Time wasted
- `orrery_time_resolved` — Orrery Time mechanically resolved
- `engagement_scheduled` — Engagement target set
- `engagement_resolved` — Engagement resolved
- `engagement_rescheduled` — Engagement target changed
- `meeting_attendance_set` — Meeting attendance changed
- `meeting_completed` — Meeting Time resolved
- `orrery_position_set` — Orrery planet positioned during Setup

Retained from M3: all 11 M3 events (player_added, etc.) — used during Setup.
Retained from M2: undo_applied, redo_applied, checkpoint_restored, backup_imported.
Retired: `month_changed` (replaced by `month_transitioned`).

### 8. Transaction/Revision/Snapshot Semantics

Every command listed in #6 that is a canonical gameplay revision produces:
- One revision record in `campaignRevisions`.
- One or more events in `campaignEvents`.
- One complete resulting `CampaignStateV3` snapshot in `campaignSnapshots`.
- History control update (logical_state_append or history_navigation for undo/redo).

Exceptions:
- `delete_campaign`: NOT a canonical commit. Deletes the entire graph.
- `start_new_campaign`: Creates revision 0 (not via canonicalCommit but via direct insert, matching existing `ensureCampaign` pattern).

### 9. Concurrency/Stale-Context Policy

| Command Family | CAS/Precondition |
|---|---|
| `begin_play` | `expectedRevision` |
| `advance_phase` | `expectedRevision` + `expectedPhase` + `expectedMonthOrdinal` |
| `begin_next_month` | `expectedRevision` + `expectedMonthOrdinal` |
| `complete_meeting` | `expectedRevision` + `expectedMonthOrdinal` |
| `set_meeting_attendance` | `expectedRevision` |
| `schedule_time` (Planning) | No CAS — last-writer-wins via Convex serialization |
| `reschedule_time` (Story) | `expectedRevision` |
| `spend_time`, `waste_time` | `expectedRevision` |
| `resolve_orrery_time` | `expectedRevision` |
| `schedule_engagement` (Planning) | No CAS — last-writer-wins |
| `resolve_engagement` | `expectedRevision` |
| M3 setup commands | No CAS (existing M3 policy unchanged) |
| `undo`, `redo` | `expectedRevision` (existing) |
| `delete_campaign` | `expectedCampaignId` |

### 10. Atomic Begin Play Semantics

Single canonical commit that:
1. Validates `lifecycle.stage === "setup"`.
2. Validates setup completeness (age, facilitator, seats, wizards, watchers, orrery).
3. Advances `calendar.monthOrdinal` + 1.
4. Advances all 5 planets by their Arcs.
5. Creates Time participants for present Wizards (budget: 4, reschedule: 1).
6. Creates Engagements for present Wizards (one each).
7. Sets `lifecycle: { stage: "play", phase: "new_moon", monthlyState: { timeParticipants, engagements, meetingAttendance: null } }`.
8. Produces `play_begun` event.

CAS: `expectedRevision` ensures user observed current Setup state.

### 11. Atomic Begin Next Month Semantics

Single canonical commit that:
1. Validates `lifecycle.phase === "quiet"`.
2. Validates `calendar.monthOrdinal === expectedMonthOrdinal`.
3. Advances `calendar.monthOrdinal` + 1.
4. Advances all 5 planets by their Arcs.
5. Archives current Meeting attendance to `wizardmootHistory`.
6. Creates fresh Time participants for present Wizards.
7. Creates fresh Engagements for present Wizards.
8. Resets reschedule usage.
9. Sets `lifecycle.phase = "new_moon"`.
10. Produces `month_transitioned` event.

### 12. Undo/Redo/Checkpoint/Backup/Import/Verifier Implications

- **Undo of beginNextMonth**: restores entire prior month's V3 state (monthly state, phase, calendar, planets). Single Undo step.
- **Undo of beginPlay**: restores Setup state. Single Undo step.
- **Checkpoint**: captures V3 snapshot. Restore returns to that V3 state.
- **Backup**: exports V3 state in existing backup format (version unchanged). Import validates V3.
- **V1/V2 backup import**: rejected by `loadHistoricalState` V3-only validation.
- **Verifier**: expects all snapshots in graph are V3. V1/V2 snapshots detected as corruption.
- No changes to generic Undo/Redo/checkpoint/backup architecture.

### 13. V1/V2 Reset/Retirement Sequence

Current `campaignSnapshots` validator uses `anyCampaignStateValidator = v.union(V1, V2)`. V3-only validator cannot be deployed while V1/V2 snapshot records exist.

**Simplest safe sequence:**

1. Deploy transition code that removes `ensureCampaign` auto-creation (prevents new V2 campaigns).
2. Human verifies target deployment (Dev/Preview/Production separately).
3. Human executes `deleteCampaign` (or equivalent admin cleanup) to clear entire campaign-owned graph.
4. Verify all 6 campaign-owned tables are empty.
5. Deploy V3-only schema/validators.
6. `startNewCampaign` creates fresh V3 campaign.

**Whether a temporary transition deployment is needed:** YES, a small transition deployment is needed because:
- The current schema validators accept only V1/V2 state shapes in snapshots.
- V3 validators cannot be deployed while V1/V2 records exist (Convex validates existing data against schema).
- The transition deployment adds V3 to the union (EXPAND), or provides a cleanup path that runs before V3-only validators land.

The simplest approach: a transition deployment that (a) stops auto-creation, (b) provides a `clearLegacyCampaignGraph` admin mutation, and (c) either adds V3 to the validator union or makes the snapshot validator permissive enough to accept V3. After human cleanup, deploy the V3-only schema.

### 14. Temporary Transition Deployment

YES, a temporary transition deployment appears necessary. Reason: Convex validates existing persisted data against schema validators at deploy time. The current `anyCampaignStateValidator` (V1|V2 union) rejects V3. Deploying V3-only validators rejects existing V1/V2 data. A two-step deployment:

**Step 1 (Transition):**
- `anyCampaignStateValidator = v.union(V1, V2, V3)` — accepts all three.
- Remove auto-creation.
- Add `clearLegacyCampaignGraph` admin mutation.
- Deploy. Human clears legacy data. Verify empty.

**Step 2 (V3-only):**
- `anyCampaignStateValidator = campaignStateV3Validator` — V3 only.
- Remove V1/V2 validators.
- Deploy. Create fresh V3 campaign.

### 15. Deployment/Rehearsal Steps Requiring Human Control

1. Verify intended Convex deployment identity before any destructive action.
2. Execute `clearLegacyCampaignGraph` admin mutation on each deployment (Dev, Preview, Production).
3. Verify campaign graph is empty after cleanup.
4. Deploy V3-only code.
5. Create and verify fresh V3 campaign.
6. Run verifier.
7. Never give Bolt production credentials.

### 16. Automated/Manual Verification Plan

**Automated (deterministic):**
- Full `npx vitest run` suite covering all tasks A-K.
- `tsc -b` type checking.
- `npm run build` production build.

**Manual (integration boundaries):**
- Disposable Convex deployment: full lifecycle test (create->setup->play->delete->recreate).
- Multi-browser realtime: phase changes reflected.
- Refresh during Planning state preserved.
- Backup download/import cycle.
- Responsive Orrery interaction.

### 17. Durable Docs to Update During Implementation

| Document | Updates Needed |
|---|---|
| `docs/architecture/state-model.md` | V3 as current state model, V1/V2 retired |
| `docs/architecture/m3-state-model.md` | Add supersession notice (already has partial note) |
| `docs/persistence-evolution-contract.md` | V3 boundary exception executed, future V3+ evolution contract |
| `docs/recovery-runbook.md` | V3 verifier expectations, V3 campaign lifecycle |
| `docs/environments.md` | V3 rollout steps for each environment |
| `ROADMAP.md` | M4 status: Implemented |

---

## Rollout Analysis

### Current Schema Constraints

The `campaignSnapshots` table validates `state` with `anyCampaignStateValidator = v.union(campaignStateV1Validator, campaignStateV2Validator)`. Convex validates existing persisted data against the schema at deployment time. This means:

1. **V3-only validator cannot be deployed while V1/V2 snapshots exist.** Convex would reject the deployment because existing V1/V2 snapshot records fail the V3-only validator.

2. **V3 validator cannot be deployed alongside V1/V2 without first adding V3 to the union.** The current union does not include V3.

### Simplest Safe Sequence

A two-step deployment is required:

**Transition Deployment:**
1. Update `anyCampaignStateValidator` to `v.union(V1, V2, V3)`.
2. Remove `ensureCampaign` auto-creation from `campaign.ts`.
3. Add `clearLegacyCampaignGraph` admin internalMutation.
4. Deploy to target environment.
5. Human verifies correct deployment.
6. Human calls `clearLegacyCampaignGraph` — deletes all campaign-owned records.
7. Human verifies all 6 campaign-owned tables are empty.

**V3-Only Deployment:**
1. Narrow `anyCampaignStateValidator` to V3 only.
2. Remove V1/V2 validators, migration code, legacy table definitions.
3. Deploy full V3 runtime.
4. Human calls `startNewCampaign`.
5. Human runs verifier.

### Why Not Direct Deploy?

Direct V3-only deployment fails because Convex enforces schema validation against existing data. Even if the `campaigns` table's `newCampaignRecordValidator` is V2-specific (and could be updated to V3), the `campaignSnapshots` table contains V1/V2 snapshot records that would fail V3-only validation.

### Legacy Tables (numbers, events)

The `numbers` and `events` tables are NOT campaign-owned. They can be:
- Removed from the schema definition if empty.
- Left as empty table definitions if Convex requires them for existing data.
- Cleaned up as a separate admin concern (not part of campaign deletion).

---

## moveMonth / Control Path Analysis

### Current State

`moveMonth` in `convex/campaign.ts` advances `calendar.monthOrdinal` forward or backward by 1, independently of any phase or monthly state. It is exposed as a user-facing button in the current UI.

### M4 Conflict

M4's atomic month transition (`beginNextMonth`) advances calendar + all 5 planets + archives attendance + creates fresh monthly state atomically. Free `moveMonth` would allow:
- Calendar to advance without planet advancement.
- Calendar to advance mid-month (during Planning, Story, etc.).
- Calendar to go backward, which has no defined semantic in the monthly loop.

This violates the atomic month-transition invariant.

### Resolution

1. **Retire `moveMonth` as a V3 gameplay mutation.** Remove it from `convex/campaign.ts`. Remove it from `CAMPAIGN_COMMAND_TYPES`.
2. **Remove `legacy_month_change` command type.** No longer needed.
3. **Remove `month_changed` event type from active use.** Retained only in historical V1/V2 context which is now rejected.
4. **Remove `applyMoveMonth`** from `shared/domain/transitions.ts`.
5. **Remove `moveMonthFingerprint`** from `shared/domain/command-ids.ts`.
6. **Remove `validateMoveMonthTransaction`** from `shared/domain/transitions.ts`.
7. **Remove forward/backward month buttons** from UI.
8. **Calendar advancement happens ONLY via:**
   - `beginPlay` (Setup -> Play: one advance)
   - `beginNextMonth` (Quiet -> New Moon: one advance)
9. **Remove legacy month-change event coherence** from `canonicalCommit.ts`.

The `moveMonth` legacy path in `canonicalCommit.ts` (lines 51-64) and the `move_month`/`legacy_month_change` cases are removed entirely.

No V3 command provides free calendar manipulation. If administrative calendar correction is ever needed, it would be a future admin-only operation, not an M4 ordinary command.

---

## Self-Review Checklist

### 1. Spec Coverage

| Spec Section | Implementation Task(s) |
|---|---|
| CampaignState V3 / Legacy Retirement | A, D, K |
| Campaign Lifecycle | E |
| Begin Play Setup Expectations | F |
| Orrery | B, G |
| Time | C, H |
| Engagements | C, I |
| Monthly Eligibility | C, F, J |
| Story Phase | G, H, I |
| Meeting / Wizardmoot | J |
| Visions / Impact / Quiet | G (phase transitions) |
| Atomic Month Transition | J |
| Phase / Command Semantics | G |
| Warnings / Errors / Guidance | G, H |
| UI Architecture | L |
| Recovery UI | L (CampaignTools) |
| Realtime / Local Presentation | L |
| Persistence / Architecture Invariants | D, K |
| Verification Contract | M |
| V3 Rollout | Rollout Analysis section |
| Deferred Systems | Not built (scope constraint) |

### 2. Placeholder Scan

No TODO/TBD/"handle edge cases"/"write tests for..." placeholders present.

### 3. Type/Interface Consistency

Cross-task type references verified:
- Task A produces `CampaignStateV3`, consumed by all subsequent tasks.
- Task B produces `OrreryState`, consumed by A (forward-declared), D, F, G, J.
- Task C produces `TimeParticipant`/`EngagementRecord`/`MonthlyPlayState`, consumed by D, F, G, H, I, J.
- All command/event names consistent between domain, validators, and canonicalCommit.

### 4. State-Safety Review

- Canonical commits: preserved, all V3 commands use `canonicalCommit`.
- Complete snapshots: every accepted revision produces V3 snapshot.
- Immutable audit: events never mutated, V3 event types added.
- Fail-closed validation: V1/V2 rejected, V3 validated at all boundaries.
- Undo/Redo: unchanged architecture, V3 snapshots.
- Checkpoints: unchanged, V3 state.
- Backup/import: format version unchanged, V3 state.
- Recovery verification: V3-aware verifier.

### 5. Domain-Boundary Review

Generic persistence code (`canonicalCommit`, undo/redo, checkpoints, backup, verifier) does NOT gain Seven-Part-Pact-specific dependencies:
- `canonicalCommit` gains V3 command-event coherence mappings (same pattern as M3).
- Undo/Redo remain generic snapshot navigation.
- Checkpoints remain generic snapshot anchors.
- Backup remains generic state container.
- Verifier remains generic graph integrity check.

Event coherence in `canonicalCommit` does validate per-command-type event structure, which is game-aware, but this is the existing M2/M3 pattern — not a new coupling.

### 6. Scope Review

No Domain engines, Watcher UI, Lore, Notes, Magic, or generic framework scope creep. The Play shell supports future extension through ordinary component composition but does not implement plugin/extension infrastructure.

### 7. Execution Gate

**CampaignState/schema/runtime execution is BLOCKED pending the M4 PERSISTENCE DESIGN CHECKPOINT and Master/user approval.** This plan is documentation only.
