# Milestone 4: Shared Monthly Play Loop

**Status:** Approved Design — Not Yet Implemented
**Extends:** `docs/architecture/state-model.md`, `docs/architecture/m3-state-model.md`
**Applies Beginning With:** Milestone 4

---

## Overview

M4 delivers the first complete shared monthly play loop end-to-end:

```
New Moon -> Visions -> Planning -> Story -> Meeting -> Quiet -> next New Moon
```

This is a thin vertical slice. Normal shared monthly play becomes usable, but
M4 does NOT implement domain engines, full wizard character systems, Watcher
system UI, magic, general Lore, general Notes, generic Impact subsystem,
persistent Scene records, or generic TTRPG/entity/task/rules frameworks.

---

## Source / Inference / Application Design Convention

This document distinguishes three categories of authority:

- **SOURCE**: Game behavior explicitly stated by authoritative Seven-Part Pact
  Draft 4 materials.
- **INFERENCE**: Reasonable interpretations needed where the source is not
  explicit or where a printed rule must be adapted to an interactive
  application.
- **APPLICATION DESIGN**: Approved software/product decisions for this app that
  are not dictated by game rules.

Labels appear inline as `[SOURCE]`, `[INFERENCE]`, or `[APPLICATION DESIGN]`.
Nothing labeled INFERENCE or APPLICATION DESIGN should be read as game canon.

---

## CampaignState V3 / Legacy Retirement

### Version Boundary

`[APPLICATION DESIGN]`

M4 introduces `CampaignState V3`. This is the new current and minimum
historical compatibility baseline.

- V3 is the minimum supported `stateSchemaVersion` for both current and
  historical state.
- CampaignState V1 and V2 are intentionally retired at the M4 boundary.
- No V1->V3 or V2->V3 semantic migration is implemented.
- V1/V2 snapshot restore, checkpoint restore, and portable backup import are
  not supported. Attempts fail clearly and closed.
- All M2 persistence/recovery semantics (canonical commit, snapshots,
  undo/redo, checkpoints, portable backup, verifier) are preserved for V3
  campaigns going forward.
- Future evolution FROM V3 returns to the normal compatibility requirements of
  the persistence evolution contract unless another explicit user-approved
  break is granted.

### Rationale and Precedent

`[APPLICATION DESIGN]`

Pre-M4 development and production campaign data are explicitly disposable.
This is a one-time pre-release compatibility break that does NOT establish a
precedent for casually discarding future V3+ valuable history.

- Retained Convex deployments are reset in place by clearing obsolete
  campaign-owned V1/V2 data. Deployments are not recreated merely to reset
  credentials.
- No production operational export is required for this exact approved
  retirement.
- The human must still verify the intended deployment before any destructive
  actions.
- Bolt never receives production credentials.
- A staged EXPAND/RESET/CONTRACT deployment is not required unless actual
  Convex schema constraints make a temporary transition deployment necessary.

### Backup Format

`[APPLICATION DESIGN]`

`backupFormatVersion` does not change solely because the contained
CampaignState baseline changes. The backup container format is independent of
the campaign-state schema version it carries. V3 backups use the existing
backup format.

### Legacy Cleanup

`[APPLICATION DESIGN]`

Remove legacy V1/V2 compatibility code where it creates ongoing complexity or
ambiguity. Do not perform cosmetic cleanup unrelated to M4.

After V3 retirement:

- `loadHistoricalState` accepts only V3 (no V1/V2 migration paths).
- `AnyCampaignState` narrows to V3 only (or is eliminated).
- `SUPPORTED_STATE_SCHEMA_VERSIONS` narrows to `[3]`.
- V1/V2 compatibility validators, migration functions, and related support
  machinery are removed.
- `migrateV1toV2` and related functions are removed.
- Legacy test fixtures whose sole purpose was V1/V2 compatibility or migration
  may be removed.
- Minimal legacy-shaped fixtures or equivalent test data SHOULD remain where
  needed to prove that V1/V2 persisted state, snapshots, checkpoints, and
  portable backups fail clearly and closed. Do not accidentally remove the
  requirement to test unsupported legacy rejection.

---

## Campaign Lifecycle

### Conceptual Lifecycle

`[APPLICATION DESIGN]`

```
No Campaign
    -> explicit Start New Campaign
Setup
    -> atomic Begin Play
Play
    -> explicit destructive Delete / Start Over
No Campaign
```

- Opening the app with no campaign must NOT silently create one.
- Setup is NOT a lunar phase. It is a distinct lifecycle stage.
- Play contains exactly one shared authoritative phase at a time.

### V3 Lifecycle Representation

`[APPLICATION DESIGN]`

V3 uses a discriminated Setup/Play lifecycle representation rather than
scattered independent flags. Conceptually:

```
CampaignStateV3.lifecycle =
  | { stage: "setup"; ... }
  | { stage: "play"; phase: LunarPhase; ... }
```

The exact V3 type shape is determined at implementation time. This spec
establishes settled requirements and invariants, not final field names.

### Lunar Phases

`[SOURCE]` The monthly cycle follows:

```
new_moon -> visions -> planning -> story -> meeting -> quiet
```

`[APPLICATION DESIGN]` One authoritative shared phase. No ready-up/consensus
mechanism. No generic `setPhase(newPhase)` normal path.

### Campaign Creation

`[APPLICATION DESIGN]`

Start New Campaign:
- Explicit user action.
- Fresh `campaignId`.
- V3 revision-0 state in Setup stage.
- Complete revision-0 snapshot.
- Valid history-control foundation according to existing M2 semantics.

Partially completed Setup is valid authoritative state. A fresh revision-0 V3
campaign may have incomplete setup facts.

### Campaign Deletion

`[APPLICATION DESIGN]`

Campaign deletion is a destructive administrative lifecycle operation:
- Not a canonical gameplay revision.
- Not Undo-able.
- Requires strong confirmation UI.
- Protects against stale deletion by expected campaign identity.
- Must delete the entire campaign-owned persistence graph (see below), not
  only the current campaign row.
- Fails closed if graph assumptions or ownership are inconsistent.
- Retains the Convex deployment itself.

#### Deletion Barrier

`[APPLICATION DESIGN]`

Campaign deletion is **persistence infrastructure outside CampaignState**.
It is not represented in `CampaignState` and does not produce a revision,
event, or snapshot.

Deletion establishes a **durable deletion barrier** before removing
campaign-owned data:

- The barrier is a persisted operational marker (e.g. a deletion-status
  record) that is distinct from `CampaignState` and survives reconnect,
  redeploy, and browser/session termination.
- While the barrier exists, the server **rejects** normal gameplay writes,
  recovery mutations (Undo/Redo, checkpoint restore), portable backup
  import, and Start New Campaign.
- The UI exposes only operational behavior needed to report deletion
  status and resume cleanup.
- The barrier is removed **last**, only after the entire campaign-owned
  persistence graph has been verified empty.

#### Resumable Bounded Cleanup

`[APPLICATION DESIGN]`

Campaign-owned records are cleaned up in **bounded, idempotent batches**,
not in a single atomic transaction:

- Each campaign-owned table must support efficient campaign-scoped
  queries (by `campaignId` or equivalent index) so cleanup does not depend
  on unbounded table scans.
- Each batch deletes a bounded number of records for one table.
- Cleanup is **idempotent**: re-running a batch for the same table and
  campaign is safe whether or not prior batches completed.
- If cleanup is interrupted (browser closes, network drops, redeploy),
  the durable deletion marker remains. After restart, cleanup **resumes**
  from where it left off without requiring the initiating browser/session
  to remain alive.
- Before finalization, **verify** that every campaign-owned collection is
  empty for that campaign.
- The canonical campaign record is deleted **near the end**.
- The deletion marker is removed **last**.
- Start New Campaign remains **blocked** until deletion is fully complete
  and the marker is gone.

#### Campaign-Owned Persistence Graph

Based on the current Convex schema, the following tables contain
campaign-owned records that must be cleaned up during campaign deletion.
Each must support efficient campaign-scoped access via its index:

| Table | Key/Index |
|---|---|
| `campaigns` | `by_campaignKey` |
| `campaignRevisions` | `by_campaign_revision`, `by_campaign_commandId` |
| `campaignEvents` | `by_campaign_revision_index` |
| `campaignSnapshots` | `by_campaign_revision` |
| `campaignHistoryControl` | `by_campaignId` |
| `campaignCheckpoints` | `by_campaignId`, `by_checkpointId` |

Legacy tables `numbers` and `events` (v0.1 era) are not campaign-owned in
the M2+ sense and are not part of this graph. Their disposition during V3
cleanup is an implementation detail.

Future schema evolution that introduces new campaign-owned persisted
collections must include those collections in deletion enumeration and
verification.

---

## Begin Play Setup Expectations

### Required Setup Before Begin Play

`[SOURCE]` Normal setup before the first playable month:

- Age selected.
- Facilitator selected.
- Every Pact seat explicitly classified as present, silent, or absent.
- Present and silent seats have Wizards assigned.
- Every present Pact Wizard has a portraying Player.

`[SOURCE]` Watcher responsibilities:
- Every required Watcher responsibility is assigned to a Player.
- One Player may hold multiple Watcher responsibilities.

`[SOURCE]` Pre-first-month Orrery setup is complete (Age-specific; see
Age-Specific Orrery Setup below).

`[INFERENCE]` Normal Draft-4 expectation is at most one present Pact Wizard
portrayed by a given Player, but this is NOT a hard schema cardinality. Do not
structurally prevent a future Player from portraying multiple Wizards if later
rules or product decisions explicitly permit it.

`[INFERENCE]` Absent seats may have no Wizard. Silent Wizards need no
portraying Player.

### Opening Wizardmoot

`[SOURCE]` An opening Wizardmoot occurs before the first month of play.

`[APPLICATION DESIGN]` M4 presents this as a manual pre-play Setup
obligation/guidance. No Scene records or persisted completion flag are created.
Begin Play is the table's acknowledgement that opening material is complete.

### Begin Play Transition

`[APPLICATION DESIGN]`

Begin Play requires source-required setup to be complete and atomically:

1. Validates setup completeness.
2. Advances chronology/Sun once (increments `calendar.monthOrdinal`).
3. Advances all five movable planets once by their normal Arcs.
4. Creates first monthly Time/Engagement state.
5. Initializes month-scoped allowances.
6. Enters Play at `new_moon`.

Begin Play should protect against concurrent last-second Setup changes. The
recommended approach is `expectedRevision` / CAS on the Begin Play command so
that the transition is conditional on the user's observed Setup state. Exact
implementation semantics are determined at implementation time.

---

## Orrery

### Authoritative Model

`[SOURCE]` The Orrery consists of:
- Twelve Houses/months, each 30 degrees.
- The Sun traverses one House per month.
- Five movable planets (Saturn, Jupiter, Mars, Venus, Mercury) with
  planet-specific Arc sizes.

`[INFERENCE]` 0 degrees is the Aries/April boundary.

`[APPLICATION DESIGN]`
- Sun is NOT independent persisted state. Sun/current House derives solely
  from `calendar.monthOrdinal`.
- Persist only the start position of each movable planetary Arc.
- House membership and conjunctions are derived, not persisted.

`[INFERENCE]` Conjunction means bodies share at least one occupied House. Arc
and House overlap uses half-open intervals `[start, end)`: touching the next
House only at a zero-width endpoint does not count.

### Internal Angular Representation

`[APPLICATION DESIGN]`

Internal persisted angular representation may use deterministic centidegrees
(integer range 0..35999). This is an implementation representation, NOT the
normal player interaction model.

### Normal Track Geometry

`[SOURCE]` The printed Orrery provides track artwork, planetary Arc sizes,
and segment structure:

| Body | Track Details | Arc Size |
|---|---|---|
| Houses/Sun | 12 x 30-degree Houses | One House per month |
| Saturn | 36 sections, 10 degrees each, offset 5 degrees from House boundaries | 10 degrees (1 section) |
| Jupiter | 7.5-degree placement grid | 22.5 degrees (3 segments) |
| Mars | 7.5-degree placement grid | 52.5 degrees (7 segments) |
| Venus | 24 visible sections of 15 degrees | 75 degrees (5 visible segments) |
| Mercury | 24 visible sections of 15 degrees | 105 degrees (7 visible segments) |

`[INFERENCE]` Venus and Mercury printed tracks visually show 24 sections of
15 degrees each. Do not claim the artwork explicitly contains an invisible
48-section grid.

`[INFERENCE]` Normal digital Orrery interaction is DISCRETE and snapped to
the relevant printed legal segment positions. The source permits placing a
planet at printed track positions; the app does not expose arbitrary angle
input or free dragging during ordinary setup or play.

`[APPLICATION DESIGN]` The underlying angular representation remains capable
of exceptional future off-grid legal positions, but no ordinary M4 UI or
command creates them. Dominion setup should select/click legal printed
positions, not expose degree input or free drag.

### Age-Specific Orrery Setup

`[SOURCE]` Each Age has specific starting Orrery setup instructions in the
printed materials.

**Awakening:**
`[SOURCE]` Draft 4 contains one complete starting Orrery arrangement.
`[INFERENCE]` Draft 4 also contains an unfinished placeholder for a second
arrangement. M4 supports only the completed source-defined arrangement. Do not
invent the missing option.

**Dominion:**
`[SOURCE]` A ceremonial placement sequence exists. The source permits placing
a planet "anywhere in the Orrery."
`[INFERENCE]` In the context of the printed Orrery, "anywhere" is interpreted
as normal placement on that planet's legal printed track positions rather
than arbitrary angle selection.
`[APPLICATION DESIGN]` The app records the final resulting setup Orrery. Do
not build a multiplayer setup turn engine. Normal placement uses the printed
legal track positions.

**Calamity:**
`[SOURCE]` Uses a fixed starting Orrery arrangement.

`[APPLICATION DESIGN]` Setup contains the pre-Begin-Play Orrery for every
supported Age. Begin Play performs one normal month advance from whatever the
Age-specific setup Orrery was, uniformly for all Ages. This uniform
application lifecycle is an application design decision informed by the
individual Age instructions, not a universal verbatim source rule.

### Normal Orrery Time

`[SOURCE]` Orrery Time allows a Wizard to move one eligible planet.

`[APPLICATION DESIGN]` Normal Orrery Time resolution:
- Validate scheduled Orrery Time.
- Choose eligible planet.
- Move forward or backward by that planet's legal Arc.
- Spend that Time.
- All in one authoritative transaction.

No generic Orrery editor. No ordinary free drag. Future manual
override/correction is deferred.

---

## Time

### System Identity

`[SOURCE]` Time is a shared Seven-Part Pact system. Each Wizard receives
monthly Time to allocate.

`[APPLICATION DESIGN]` Do NOT model this as "seven Pact seats x exactly four
fixed slots."

### Monthly Time Participants

`[APPLICATION DESIGN]`

Monthly Time participant:
- Currently uses a Seven-Part-Pact-specific participant reference.
- M4 only creates Wizard participants.
- Wizard reference is independent of Pact-seat occupancy.
- An eighth non-Pact Wizard can therefore use the same lifecycle later.
- Do not invent GenericActor or GenericGameEntity.

### Per-Participant Monthly State

`[SOURCE]` Each participating Wizard has a monthly Time budget and can
reschedule limited times.

`[APPLICATION DESIGN]` Each monthly participant has:
- Effective monthly Time budget (normal present Pact Wizard default: 4).
- Dynamic collection of individually identifiable allocations.
- Effective reschedule allowance (normal default: 1).
- Reschedules used (normal default: 0).

"4" and "1" are normal rules, not schema maxima or cardinalities.

### Allocation Lifecycle

`[APPLICATION DESIGN]`

New Moon / month initialization creates allocations in an UNSCHEDULED state.
Planning assigns destinations to them.

### Planning Edits

`[APPLICATION DESIGN]`

Planning edits are:
- Authoritative live campaign state (survive refresh/reconnect).
- Freely editable during Planning phase.
- No reschedule allowance consumption during Planning.
- Same-allocation routine Planning conflicts may use last accepted write
  (Convex transaction serialization).
- Independent edits should serialize normally.
- Do not add global `expectedRevision`/CAS to every Planning edit.

### Planning -> Story Lock

`[APPLICATION DESIGN]`

Advancing from Planning to Story locks ordinary schedule editing.

### Story Rescheduling

`[SOURCE]` Rescheduling during Story costs a reschedule use.

`[APPLICATION DESIGN]`
- Uses explicit Reschedule Time command.
- Verifies pending allocation and remaining allowance transactionally.
- Consumes one allowance.
- Stale requests fail visibly.

### Time Outcomes

`[APPLICATION DESIGN]`

Each allocation resolves to one of:
- **Pending**: not yet resolved.
- **Spent**: resolved normally.
- **Wasted**: the Time was lost; preserves the original scheduled destination
  (wasted Time is not assigned a fake destination).

### Time Destination Families

`[SOURCE]` Seven-Part Pact defines several categories of Time use:

| Destination | Notes |
|---|---|
| Companion | Target: relevant elemental Companion relationship. |
| Map / Isle / Sanctum work | `[SOURCE]` |
| Familiar | `[SOURCE]` |
| Orrery | `[SOURCE]` Full mechanical effect in M4. |
| Wizardmoot / Meeting | `[SOURCE]` |
| Domain | `[SOURCE]` Known destination. Manual resolution in M4. NOT collapsed into Special Use. Must be progressively refinable when Domain engines are implemented. |
| Engagement | `[SOURCE]` Extra Time linked to an avoiding-Denizen Engagement. |
| Special Use | `[APPLICATION DESIGN]` Player-facing escape hatch for legitimate/unmodeled Seven-Part Pact uses. Requires short description. Manual resolution. |

`[APPLICATION DESIGN]` Do not create a generic task system.

Optional allocation notes may explain intent but are NOT Lore and do not
become authoritative fictional truth.

Only Orrery Time has full mechanical effect in M4. Other unimplemented
destinations can be spent manually with clear source guidance.

---

## Engagements

### Monthly Collection

`[SOURCE]` Wizards have Engagements each month.

`[APPLICATION DESIGN]` Use a monthly collection of individually identified
Engagement records.

`[SOURCE]` Normal M4 rule: one Engagement per eligible present Wizard per
month. `[APPLICATION DESIGN]` Do not structurally encode "exactly one forever."

### Target Variants

`[APPLICATION DESIGN]` Engagement targets:
- Modeled Wizard reference.
- Explicit self.
- Acting Wizard's Familiar relationship.
- Manually named otherwise-unmodeled character.

Do not auto-create Denizens from text. Do not create a Familiar entity just
for scheduling.

### Planning State

`[APPLICATION DESIGN]` Partially unscheduled Engagements during Planning are
valid authoritative state.

### Avoiding-Denizen Rule

`[SOURCE]` The table (human players) decides whether the Denizen is avoiding
the Wizard. The app never decides this automatically.

`[APPLICATION DESIGN]`
- An Engagement may have one linked Time allocation.
- If avoidance is known during Planning, schedule the extra Time normally.
- If declared during Story, redirecting a pending week to the Engagement uses
  the Wizard's normal Time-reschedule allowance.

`[INFERENCE]` Alternatively, the source-defined Engagement reschedule may
choose a new Engagement target and does NOT consume the Time reschedule
allowance.

`[INFERENCE]` Resolving an avoiding-Denizen Engagement with linked Time
atomically resolves the Engagement and spends its linked Time.

---

## Monthly Eligibility

`[APPLICATION DESIGN]`

Normal M4 active Time/Engagement participants: Present Wizards.

`[SOURCE]` Silent Wizards remain real Wizard instances and seat occupants.
Source abstracts their activity. `[APPLICATION DESIGN]` M4 does not create
ordinary monthly Time/Engagement state for Silent Wizards.

`[SOURCE]` Absent seats have no ordinary monthly participation.

This is eligibility semantics, not a structural limitation on future
source-supported Time participants.

---

## Story Phase

`[APPLICATION DESIGN]`

Story is guided, not turn-locked:

- Show remaining Time and Engagements across relevant participants.
- Help with around-the-table rhythm.
- Do not persist a current-turn cursor.
- Do not force rigid round-robin.
- Manual Time resolution means only the week was spent.
- Engagement resolution means only the Engagement was resolved.
- No Scene transcript records.

### Incomplete Story Warning

`[APPLICATION DESIGN]`

Entering Meeting with unresolved ordinary Time or Engagements triggers a
strong warning, NOT a corruption invariant. The table may explicitly proceed.
Do not silently resolve remaining obligations.

---

## Meeting / Wizardmoot

### Expected Attendance

`[INFERENCE]` Expected attendance is normally derived from scheduled Meeting
Time.

### Actual Attendance

`[APPLICATION DESIGN]`

Actual attendance becomes explicit authoritative monthly state upon
Story -> Meeting transition:

- Defaults to expected attendance.
- Exceptional difference requires a short human-entered reason.

`[INFERENCE]` Do not structurally assume Meeting Time is the only possible
attendance cause forever.

### Meeting Time Resolution

`[APPLICATION DESIGN]`

- Meeting Time remains pending through Story.
- Cannot be manually spent as ordinary Story Time.
- `completeMeeting` resolves scheduled Meeting Time regardless of exceptional
  actual absence.
- Scheduled commitment and actual attendance remain separate facts.

### Wizardmoot Attendance History

`[APPLICATION DESIGN]`

Actual attendance has cross-month significance. At next-month transition,
preserve compact Wizardmoot attendance history keyed by month.

Do NOT keep an ever-growing copy of every historical Time/Engagement schedule
inside current CampaignState merely for browsing. Snapshots and audit retain
historical state and recovery evidence.

### Not Automated in M4

`[APPLICATION DESIGN]` Do NOT automate:
- Quorum.
- Pact-law enforcement.
- Offices.
- Trials.
- Special Wizardmoot abilities.
- Projection.
- Repeated-absence consequences.

---

## Visions / Impact / Quiet

### Visions

`[SOURCE]` Domain changes and resulting Impact occur.

`[APPLICATION DESIGN]` M4 explicitly guides the table to resolve Domain
changes and resulting Impact using source material. Do not imply this work
happened automatically. No general-purpose Impact state or system.

### Quiet

`[APPLICATION DESIGN]` Simple manual wrap-up phase. No generic completion
checklist. Begin Next Month is the primary consequential action.

---

## Atomic Month Transition

`[APPLICATION DESIGN]`

Quiet -> New Moon is one authoritative command/transaction:

1. Advance `calendar.monthOrdinal` (derived Sun) exactly once.
2. Advance all five normal movable planets by their Arcs.
3. Archive completed month's Wizardmoot actual attendance into compact history.
4. Establish new monthly Time participants/allocations.
5. Create new Engagements.
6. Reset month-scoped reschedule usage/allowance.
7. Enter `new_moon`.

Never expose authoritative intermediate states.

Undo of this accepted command must restore the entire prior month as one
existing campaign Undo operation.

---

## Phase / Command Semantics

### Phase Progression

`[APPLICATION DESIGN]`

One authoritative shared phase. No ready-up/consensus mechanism. No generic
`setPhase(newPhase)` normal path.

Recommended intent split:

| Command | Purpose |
|---|---|
| `beginPlay` | Setup -> Play transition |
| `advancePhase(expectedMonthOrdinal, expectedPhase)` | Ordinary transitions through Story -> Meeting |
| `completeMeeting(expectedMonthOrdinal)` | Meeting resolution |
| `beginNextMonth(expectedMonthOrdinal)` | Quiet -> next New Moon |

Context-sensitive expected phase/month prevents two distinct concurrent
requests from advancing two logical phases or months:

Example: two Planning -> Story attempts — at most one succeeds; the other sees
stale current phase and fails. Must never accidentally advance Story -> Meeting.

Same accepted command retry remains handled by generic idempotency.

### Consumption Commands

`[APPLICATION DESIGN]`

Consumption commands (spend Time, resolve Engagement, etc.) recheck
domain/resource preconditions transactionally.

### Stale Context

`[APPLICATION DESIGN]`

Stale context:
- Fails visibly.
- Tells user to review current state.
- Never reinterprets old intent against changed state.

---

## Warnings / Errors / Guidance

`[APPLICATION DESIGN]`

Three categories:

### Hard Error
Command, precondition, or state invariant violation. Zero writes.

Examples:
- Invalid duplicate consumption.
- Unsupported schema version.
- Inconsistent state.

### Strong Warning
Legal state but departure from normal Draft-4 expected procedure. User may
explicitly proceed.

Examples:
- Incomplete Planning (unscheduled Time/Engagements).
- Unresolved Story obligations before Meeting or Next Month.

### Guidance
App cannot automate deeper work and reminds the table to resolve it manually.

Examples:
- Visions Domain/Impact work.
- Opening Wizardmoot completion.
- Unmodeled Time destination resolution.

---

## UI Architecture

### Shell Concept

`[APPLICATION DESIGN]`

Normal Play gets essentially all persistent screen real estate.

Use a flexible SURFACE shell rather than rigid permanent panels:

- Persistent Play chrome always shows authoritative month and phase.
- Current phase chooses the DEFAULT primary surface.
- Phase does not restrict what users may inspect.
- Surface/layout choices are browser-local presentation state.
- Users may show one surface full-width, or primary + secondary/reference.
- Orrery is the default shared visual centerpiece/reference but can be hidden
  or replaced when another surface needs the room.
- Do not build a desktop/window manager, draggable arbitrary panes, or saved
  dashboard framework.

### M4 Surfaces

Play surfaces (compete for persistent Play screen real estate):

| Surface | Purpose |
|---|---|
| Current Phase | Phase-specific primary content |
| Orrery | Shared visual centerpiece |
| Table / Wizards | Compact identity/reference |

Secondary destinations (reachable through navigation/menu, outside the
normal Play surface/reference-pane model):

| Destination | Purpose |
|---|---|
| Campaign Setup | Setup configuration |
| Campaign Tools | Recovery, diagnostics |

### Phase Defaults

| Phase | Default Surface Behavior |
|---|---|
| New Moon | Orrery dominant; newly advanced state inspection |
| Visions | Orrery + manual Domain/Impact guidance |
| Planning | Time/Engagement scheduler; participant/Wizard focus inside this surface only; default to current player's associated Wizard when session context permits; other schedules remain inspectable/editable |
| Story | Table-oriented remaining Time/Engagement overview; participant detail when selected; Orrery Time resolution; no persisted turn cursor |
| Meeting | Shared attendance/workspace; no forced Wizard focus |
| Quiet | Manual wrap-up; Orrery may be secondary/hidden; Begin Next Month prominent |

### Reference Navigation

`[APPLICATION DESIGN]`

M4 does not implement Domain engines, Lore, or general Notes. However, UI
architecture must support contextual reference navigation later:

- Following a related application object normally opens it in the
  secondary/reference surface rather than destroying the current activity.
- Each pane may maintain client-local back/forward navigation history.
- Reference surface may render as pane/drawer/full-screen according to space.
- User can promote a reference to full-width without changing campaign phase.
- Shared CampaignState never stores per-browser navigation state.

### Phase-Following

`[APPLICATION DESIGN]`

- A pane displaying the Current Phase surface follows realtime phase changes.
- Manually selected reference surfaces remain where the user left them.
- Persistent chrome immediately shows the new authoritative phase and provides
  a clear Open/Return to Current Phase action.

### Player / Wizard / Watcher UI Boundary

`[APPLICATION DESIGN]`

Do not make one global "Current Wizard" drive the entire app.

Player, Wizard, Pact seat, and Watcher assignment remain distinct concepts.
Wizard/Time-participant focus belongs inside surfaces that need it (especially
Planning/Story).

M4 does not implement Watcher UI, but the shell must not block future Watcher
reference/responsibility surfaces.

### Lore Distinction

`[APPLICATION DESIGN]`

- Source-defined Lore is a future authoritative campaign/domain concept.
- Generic user notes are a separate potential application convenience.
- M4 Time notes must NOT be treated as Lore.
- Do not create GenericEntity/EntityGraph/LinkedNote abstractions now.
- Later systems should use real stable Seven-Part Pact identities so
  contextual linking can be added without anonymous duplication.

---

## Recovery UI

`[APPLICATION DESIGN]`

Undo/Redo remain GLOBAL CAMPAIGN snapshot recovery:
- Do not present them as casual personal editing controls.
- Move them under Campaign Tools / Recovery with explicit shared/global
  wording.
- Do not change Undo/Redo architecture.
- Do not implement per-player Undo.
- Do not implement Pause-for-Recovery in M4.

---

## Realtime / Local Presentation

`[APPLICATION DESIGN]`

Realtime authoritative changes update open surfaces' data where relevant but
do not unnecessarily discard local navigation/layout state.

If campaign phase changes:
- Current Phase surface follows it.
- Non-Phase surfaces stay open.
- Chrome reflects phase immediately.

If a stale mutation is submitted after authoritative context changes:
- Server rejects it.
- UI refreshes relevant authoritative state.
- User is asked to review rather than intent being silently transformed.

---

## Persistence / Architecture Invariants

All existing architecture invariants from `docs/architecture/state-model.md`
Section 30 are preserved. In particular:

- CampaignState is authoritative.
- Application is not event-sourced.
- Clients send intent; server computes authoritative results.
- One accepted gameplay command creates one revision, one or more ordered
  domain events, and one complete resulting snapshot.
- Normal gameplay writes use canonical transactional persistence.
- Audit history is immutable.
- Persisted inconsistencies fail closed.
- Undo/Redo restore complete campaign snapshots.
- Checkpoints, backup/import, verifier, and recovery remain generic
  persistence/platform concerns.
- Persistence/recovery code should remain ignorant of Seven-Part Pact concepts
  where practical.

---

## V3 Current/Historical State

`[APPLICATION DESIGN]`

After legacy retirement:

- V3 is the minimum supported current AND historical CampaignState.
- V1/V2 artifacts fail clearly and closed. Do not silently cast or migrate
  them.
- Undo/Redo/checkpoint/backup/verifier continue generically for V3.
- Future V4+ evolution must honor the normal compatibility contract for
  valuable V3 history unless explicitly superseded by another user-approved
  break.

---

## Verification Contract

`[APPLICATION DESIGN]`

### Automated Deterministic Coverage

The following MUST be covered by automated deterministic tests (pure domain
functions and/or Convex mutation tests where practical):

- Phase sequence and transitions (legal progression through all six phases).
- Stale and duplicate transition rejection (expected phase/month mismatch
  fails closed).
- Atomic new-month behavior (calendar/planets advance, attendance archive,
  Time/Engagement initialization, reschedule reset, phase entry).
- Orrery movement, derived House membership, and conjunction behavior
  (including half-open boundary edge cases).
- Setup validation and Begin Play (required setup completeness, CAS
  protection, first-month state initialization).
- Time budget, allocation creation, scheduling, Planning->Story lock,
  reschedule allowance consumption, spend, and waste.
- Orrery Time atomicity (validation, planet selection, Arc movement, spend
  in one transaction).
- Engagement scheduling, resolution, rescheduling, and linked-Time behavior
  (including avoiding-Denizen atomic resolution).
- Expected vs exceptional actual Wizardmoot attendance (default-to-expected,
  reason-required for difference, Meeting Time resolution).
- Hard-invariant vs warning behavior (incomplete Planning/Story triggers
  warning, not error; invalid consumption triggers hard error).
- Campaign creation (fresh V3 revision-0, valid history-control foundation).
- Complete campaign deletion (entire persistence graph removed, stale
  identity rejection, fail-closed on inconsistency).
- Deletion interruption and resumption (cleanup resumes after interruption
  without the initiating browser/session; durable marker survives redeploy).
- Deletion idempotency (re-running a cleanup batch for the same table and
  campaign is safe).
- Deletion concurrency (a second deletion or new-campaign attempt while
  deletion is in progress is rejected).
- Command idempotency (duplicate commandId returns prior result, incompatible
  reuse rejected).
- V3 Undo/Redo, checkpoint restore, backup import, and verifier regression
  (all generic persistence mechanisms continue working for V3).
- Explicit V1/V2 unsupported-artifact rejection (V1/V2 snapshot, checkpoint,
  and backup import all fail clearly and closed).

### Manual / Real Integration Boundaries

Use only the smallest manual tests needed to prove boundaries that cannot be
deterministically automated:

- Actual Convex schema and serialization behavior.
- True concurrency (two simultaneous phase transitions).
- Realtime multi-browser behavior (phase change reflected across clients).
- Refresh/reconnect during partial Planning or Story state.
- Browser backup download and import boundary.
- Real disposable Convex campaign deletion and recreation, with enough
  history to require multiple cleanup batches.
- Visual and responsive Orrery interaction.
- Deployment and environment wiring.

Do not manually replay deterministic matrices.

### Disposable End-to-End Demonstration

M4 completion should include one disposable campaign demonstrating the
end-to-end loop:

1. Start New Campaign.
2. Complete enough Setup.
3. Begin Play / New Moon.
4. Visions guidance.
5. Planning.
6. Refresh/reconnect with partial state.
7. Story Time/Engagement/Orrery resolution.
8. Meeting attendance.
9. Quiet.
10. Atomic Begin Next Month.
11. All clients converge on the same authoritative state.

---

## V3 Rollout / Rehearsal Principle

`[APPLICATION DESIGN]`

The conceptual smallest-safe rollout for the V3 boundary:

1. Human verifies the intended Convex deployment.
2. Stop or avoid automatic campaign recreation.
3. Clear obsolete pre-M4 campaign-owned V1/V2 persistence graph in place
   using the same generic durable resumable deletion mechanism described
   above (deletion barrier, bounded idempotent batches, verify empty,
   canonical campaign near-end, marker last).
4. Verify the campaign-owned graph is empty.
5. Deploy V3-only schema/runtime.
6. Explicitly create and verify a fresh V3 campaign.

This is a conceptual rollout contract, not an implementation script.

Do NOT require EXPAND/RESET/CONTRACT ceremony. The transition runtime may
remain V1/V2-compatible while the deletion/reset machinery is added or
enabled. The intended smallest safe sequence is: stop automatic recreation,
add/enable safe deletion/reset machinery, human verifies deployment, clear
obsolete graph and verify empty, then deploy V3-only schema/runtime.

Production credentials and destructive commands remain human-controlled.

The explicit Master-approved exception still means no production operational
export is required for this one pre-release retirement.

---

## Deferred Systems (Explicitly Out of M4 Scope)

The following are NOT part of M4 and must not be built:

- Seven Domain engines.
- Full Wizard character systems (abilities, resources, advancement).
- Watcher system UI.
- Magic system.
- General Lore system.
- General Notes system.
- Generic Impact subsystem.
- Persistent Scene records.
- Generic TTRPG/entity/task/rules frameworks.
- Multi-campaign operations.
- Social/auth integration (players remain campaign-level).
- Per-player Undo.
- Pause-for-Recovery.

---

## Summary of Key Inferences

The following interpretations are INFERENCE or APPLICATION DESIGN, not SOURCE.
They are recorded here to prevent them from being mistaken for game canon:

1. **Awakening Orrery**: Only the one completed Draft-4 setup preset is
   supported. The unfinished placeholder is acknowledged but not invented.
2. **Dominion placement**: The source permits placing a planet "anywhere in
   the Orrery." In context of the printed Orrery, this is interpreted as
   normal placement on that planet's legal printed track positions rather
   than arbitrary angle selection. The snapped/discrete digital interaction
   is INFERENCE/APPLICATION DESIGN, not literal source canon.
3. **Orrery half-open boundary**: Arc/House overlap uses half-open intervals
   `[start, end)`.
4. **Silent Wizards**: Do not receive ordinary M4 Time/Engagement monthly
   state.
5. **Avoiding-Denizen atomicity**: Linked Engagement + Time resolves
   atomically.
6. **Story-time extra avoiding-Denizen Time**: Committing extra Time during
   Story uses normal Time reschedule allowance.
7. **Actual Wizardmoot attendance**: Becomes explicit monthly state at the
   Meeting transition.
8. **Incomplete Planning/Story**: Warning, not corruption.
