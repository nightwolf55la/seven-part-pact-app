# Campaign State Architecture

**Status:** Accepted
**Architecture Version:** 1
**Applies Beginning With:** Milestone 2
## Purpose

This document defines the architecture for persistent campaign state, gameplay
transactions, domain events, snapshots, recovery, versioning, and related
domain-modeling conventions for the Seven-Part Pact application.

The primary design goals are:
- protect long-lived campaign state from corruption or irreversible loss;
- make complex gameplay actions atomic and auditable;
- support reliable Undo, Redo, checkpoint restore, and backup restore;
- permit the application's implementation and data schemas to evolve without
  invalidating old campaigns;
- keep game rules deterministic and testable;
- prevent persistence technology from defining the domain model.
This application does **not** use pure event sourcing. Current campaign state is
authoritative. Events provide immutable audit history, and snapshots provide
historical/recovery state.

---
## 1. Core Terminology

The following version and sequence concepts are intentionally independent.

### `campaignRevision`

The monotonically increasing sequence number of committed authoritative gameplay
transactions within a campaign.

A revision identifies a transaction, not an event and not a database write.

Revision 0 represents the campaign's initial state.
### `stateSchemaVersion`

The serialized schema version of the complete logical `CampaignState`.

This changes when the representation of campaign state changes.

### `ruleset.id` and `ruleset.version`

Identify the game rules under which the campaign operates.

A schema migration changes representation.

A ruleset migration may change game meaning.

These are fundamentally different operations.
### `event.type`

The stable semantic identity of a domain event, such as:

- `month_changed`
- `spell_cast`
- `checkpoint_restored`

### `event.version`

The schema version of that specific event type.

Event types evolve independently. There is no global event-schema version.

Examples in this document may include historical persisted identifiers. At the
M4 baseline, `month_changed` is retained only for historical readability and
tooling and is not written by the active current runtime.

For example, a campaign may contain:

- `month_changed` version 1
- `spell_cast` version 3
- `resource_spent` version 2
### `backupFormatVersion`

The version of the portable backup container itself.

This is independent of the campaign-state schema contained in the backup.

### Application version

The software release version is diagnostic metadata only.

Application version must never be treated as the authoritative definition of
persistent-data schemas.

---
## 2. Logical Campaign State

`CampaignState` means:

> Everything required to resume the campaign with the same authoritative game
> state and game semantics.

The initial logical shape is conceptually:

```ts
interface CampaignStateV1 {
  schemaVersion: 1;

  ruleset: {
    id: "seven_part_pact_draft4";
    version: 1;
  };

  calendar: {
    monthOrdinal: MonthOrdinal;
  };
}
```

This will expand as game systems are implemented.
**M3 Update (V2):** The campaign state was extended to V2 with players,
wizards, pact seats, and configuration. See
[M3 State Model](m3-state-model.md) for the V2 specification and migration
details.
**M4 Update (V3):** CampaignState V3 introduces a discriminated Setup/Play
lifecycle, Orrery state, monthly Time/Engagement state, and Wizardmoot
attendance history. V1 and V2 are intentionally retired at the M4 boundary as
a one-time pre-release compatibility break. V3 is the new minimum supported
version for both current and historical state. See
[M4 Shared Monthly Play Loop](../m4-shared-monthly-play-loop.md) for the full
V3 specification and retirement rationale.
> **Supersession (M4):** Section 28 ("Existing v0.1 Migration") of this
> document states that existing production/development campaign data must not
> be discarded or reset. That requirement applied to the M2 migration and
> remains historically accurate for that context. It is explicitly superseded
> for the M4 boundary: pre-M4 campaign data are disposable by approved
> decision. Future evolution from V3 returns to the normal safety policy.

Future state may contain concepts such as:
```ts
interface CampaignStateVFuture {
  schemaVersion: number;
  ruleset: RulesetRef;

  calendar: CalendarState;
  orrery: OrreryState;
  wizards: Record<WizardId, WizardState>;
  domains: Record<DomainId, DomainState>;
}
```

The logical `CampaignState` is independent of physical Convex storage layout.

The application may eventually store portions of the logical campaign in
multiple Convex documents or tables without changing the meaning of
`CampaignState`.
A live campaign must use a state schema supported by the current application.

Historical snapshots may retain older state-schema versions only when those
versions are explicitly supported. At the M4 baseline, V3 is the minimum
supported version for both current and historical CampaignState; V1/V2 state
fails closed.

---
## 3. Campaign Identity

A campaign has a portable application-level identity.

Conceptually:

```ts
interface CampaignRecord {
  campaignKey: "default";
  campaignId: CampaignId;
  campaignRevision: CampaignRevision;
  state: CurrentCampaignState;
}
```

For the current single-campaign application, `campaignKey: "default"` provides a
deterministic singleton lookup.

The application must not rely on querying an arbitrary first campaign document.

Future multiple-campaign support should use `campaignId`.
Convex `_id` values are storage identifiers only and must not serve as portable
game-world identity.

---
## 4. Identifier Categories

Three categories of identifiers are intentionally distinct.

### Storage identifiers

Example:

```text
Convex _id
```

These identify where a record lives in a particular Convex deployment.

They must not be used as portable campaign references.
### Instance identifiers

These identify particular objects existing within a campaign.

Examples:

```text
cmp_<uuid>
wiz_<uuid>
npc_<uuid>
chk_<uuid>
cmd_<uuid>
```

Opaque instance identifiers should use globally unique values and may use
human-readable prefixes for debugging.
### Definition identifiers

These identify permanent game concepts.

Examples:

```text
necromancer
wicker_ways
duplicate
sulfur
```

Definition identifiers are stable persisted contracts.

User-facing display names are separate and may change.

Never use display text as a persistent identity.

Where useful, TypeScript branded types should prevent accidental interchange of
semantically different identifiers or numeric concepts.

Examples include:
```ts
CampaignId
CommandId
CheckpointId
WizardId
CampaignRevision
MonthOrdinal
```

---
## 5. Calendar Domain Model

`monthOrdinal` represents an unbounded position on the repeating campaign
calendar.

The calendar sequence is:

```text
April
May
June
July
August
September
October
November
December
January
February
March
```

Therefore:

```text
0  -> April
11 -> March
12 -> April
-1 -> March
```

An ordinal is not itself the identity of a named month.

Code must never use unexplained ordinal values as month identities.

Bad:

```ts
if (monthOrdinal === 5) {
  // September
}
```

Correct:
```ts
if (monthIdFromOrdinal(monthOrdinal) === "september") {
  ...
}
```

Finite calendar concepts should use stable IDs, literal unions, named constants,
and centralized pure helpers.

Derived presentation values such as `"September"` should not be duplicated as
authoritative persisted data when they can be safely derived from canonical
state.

### M4 lifecycle and month progression

At the M4 baseline, `monthOrdinal` is the sole authoritative absolute campaign
chronology. Month-of-year, display name, season, and Sun are derived from it.

Setup is a lifecycle state, not a lunar phase. Play proceeds:

```text
New Moon -> Visions -> Planning -> Story -> Meeting -> Quiet -> next New Moon
```

There is no ordinary/free current-runtime month-movement command. Begin Play and
Begin Next Month own the authoritative atomic month-boundary changes; stale
distinct requests must not create an extra month advance.

---
## 6. One Command Equals One Gameplay Revision

One successfully accepted authoritative gameplay command creates exactly one new
`campaignRevision`.

A command may produce one or many ordered domain events.

Conceptually:

```text
one accepted command
        |
        v
one campaign revision
        |
        +-- event 0
        +-- event 1
        +-- event 2
        |
        v
one resulting CampaignState
        |
        v
one full snapshot
```
A complex action may therefore produce multiple consequences without creating
multiple revisions.

Example:

```text
Revision 53

Event 0: spell_cast
Event 1: resource_spent
Event 2: entity_created
Event 3: orrery_advanced
Event 4: effect_expired
```

All consequences of the command are committed atomically.

A gameplay revision must contain at least one domain event explaining what
happened.

---
## 7. Commands and Domain Transitions

Clients send intent, not authoritative final state.

Example context-sensitive phase intent:

```ts
{
  expectedMonthOrdinal: 12,
  expectedPhase: "Planning"
}
```

The client supplies intent plus the context it observed. The server validates
that context and derives the authoritative resulting phase and state.

Convex mutations:

1. validate API input;
2. load authoritative state;
3. apply appropriate concurrency semantics;
4. invoke pure domain logic;
5. validate the resulting state and events;
6. atomically persist the transaction.
Game rules should primarily exist in pure deterministic functions.

Conceptually:

```text
validate intent/context
        |
        v
apply pure domain transition
        |
        v
{ nextState, events }
```

The domain layer must not depend on React or Convex where practical.

React expresses intent and renders views.

Convex handles authoritative loading, concurrency, server-only inputs, and
persistence.

The pure domain layer determines game consequences.

---
## 8. Revision Records

Each successful gameplay transaction has an immutable revision record.

Conceptually:

```ts
interface CampaignRevisionRecord {
  campaignId: CampaignId;
  campaignRevision: CampaignRevision;

  commandId: CommandId;
  commandType: CampaignCommandType;
}
```

Convex server-side creation metadata provides authoritative wall-clock audit
timing.

Revision records are never rewritten by normal application operations.

---
## 9. Domain Events

Events are stored as separate immutable records associated with their transaction.

Conceptually:

```ts
interface CampaignEventRecord {
  campaignId: CampaignId;
  campaignRevision: CampaignRevision;

  eventIndex: number;

  event: CampaignEvent;
}
```

`eventIndex` begins at 0 and establishes event ordering within the revision.

The logical event identity is:

```text
(campaignId, campaignRevision, eventIndex)
```
A separate application-level event UUID is not required unless a future use case
demonstrates a need.
### Event payload structure

Each event payload has its own explicit structure.

The event body is a discriminated union.

Example:

```ts
interface MonthChangedDataV1 {
  direction: MonthDirection;
  fromOrdinal: MonthOrdinal;
  toOrdinal: MonthOrdinal;
}

interface MonthChangedEventV1 {
  type: "month_changed";
  version: 1;
  data: MonthChangedDataV1;
}
```

`month_changed` is a historical pre-M4 example. It remains readable where
needed to interpret immutable audit history and historical tooling, but it is
retired from the active current-runtime/new-write contract.

The following design must not be used:

```ts
type EventType = ...;
type EventData = ...;
interface Event {
  type: EventType;
  data: EventData;
}
```

when the type system cannot guarantee that a particular event type is paired with
the correct payload.

Instead:

```ts
type CampaignEvent =
  | SpellCastEventV1
  | SpellCastEventV2
  | CheckpointRestoredEventV1;
```
### Event versioning

Each event type versions independently.

Use:

```ts
{
  type: "spell_cast",
  version: 2,
  data: ...
}
```

Do not encode schema versions into event names such as:

```text
spell_cast_v2
```

The event type describes what happened.

The event version describes the serialized representation used to describe it.

Historical events are not rewritten merely because newer event versions exist.

Unknown event versions must fail closed rather than being guessed at.
### Canonical event facts

Events store canonical facts and meaningful intent.

Presentation-only values should normally be derived.

For example, a month-change event should persist ordinals and direction rather
than both ordinals and redundant display names.

---
## 10. Events Are Not the Runtime Source of Truth

The application does not reconstruct normal current state by replaying all
historical events.

The roles are:

```text
Current CampaignState
    -> runtime authority

Snapshots
    -> historical/recovery state

Domain events
    -> immutable explanation and audit trail
```

Events do not need to be sufficient to replay the entire campaign.

Undo and restore use snapshots rather than reversing or replaying historical
event logic.

---
## 11. Central Transaction Commit Mechanism

Persistent gameplay transactions should pass through one shared server-side
commit mechanism.

Conceptually:
```text
validate command
      |
check command idempotency
      |
load authoritative campaign
      |
check expected revision when applicable
      |
validate current state
      |
execute pure domain transition
      |
validate resulting state and events
      |
campaignRevision + 1
      |
ATOMIC CONVEX TRANSACTION
      +-- write new current state
      +-- create revision record
      +-- create ordered event records
      +-- create full snapshot
```

If any part fails:
```text
no state update
no campaign revision
no event
no snapshot
```

Future gameplay mutations should use this mechanism rather than independently
reimplementing revision/event/snapshot logic.

---
## 12. Idempotency

Every authoritative gameplay command should carry a unique client-generated
`commandId`.

If a client retries a successfully committed command because of a network or UI
failure, the server must detect the existing command and return the prior result
instead of executing it again.

Idempotency checking occurs before stale-revision checking so that a legitimate
retry can still receive its original successful result.
Reusing the same command ID for an incompatible operation must be rejected.

Commands themselves are transient API intent and do not require persistent schema
versioning at this stage.

Events are the durable historical contract.

---
## 13. Concurrency Semantics

Concurrency behavior is selected per command.

### Latest-state semantics

Used when the command naturally means:

> Apply this intent once against whatever authoritative state exists when the
> transaction executes.

Latest-state semantics are not the default for lifecycle or month progression.
At the M4 baseline there is no free `Advance one month` command. Ordinary phase
progression is checked against the expected month ordinal and phase, while
Begin Play and Begin Next Month are guarded lifecycle/month-boundary
transitions. Distinct stale requests fail rather than producing an unintended
second transition.

Latest-state semantics remain appropriate only where an intent is explicitly
defined to remain correct against the authoritative state that exists when the
transaction executes.
### Compare-and-set semantics

Used when a command depends upon a state the user previously observed.

The command supplies:

```ts
expectedRevision: CampaignRevision
```

If the current campaign revision differs, the command fails with no writes.

Examples include:

* Undo
* Redo
* checkpoint restore
* backup import
* other destructive/context-sensitive recovery operations

---
## 14. Snapshots

Every campaign revision has exactly one full logical-state snapshot.

Revision 0 has an initial snapshot even though no gameplay transaction occurred.

Conceptually:

```ts
interface CampaignSnapshot {
  campaignId: CampaignId;
  campaignRevision: CampaignRevision;
  state: AnyCampaignState;
}
```

Snapshot identity is naturally:

```text
campaignId + campaignRevision
```

Snapshots are immutable.

The general architecture permits historical snapshots in explicitly supported
older schema versions, and such snapshots are not rewritten merely because
current state evolves.

At the M4 baseline, however, V3 is the minimum supported version for both
current and historical CampaignState. V1/V2 snapshots fail closed. The M4
boundary is an approved one-time pre-release compatibility break, not a silent
migration.

If a future supported historical schema has an explicit migration path,
restoring it may migrate state in memory, validate the resulting current state,
and then create a new campaign revision.

---
## 15. Undo and Redo

Undo and Redo operate on transaction-level snapshots.

They do not execute inverse game rules.

Example:

```text
Revision 40 -> state before complex action
Revision 41 -> complex action
Revision 42 -> Undo Revision 41
```

Revision 42 contains a new snapshot logically equivalent to the appropriate prior
state.

Revision 41 remains permanently preserved.

Undo and Redo therefore maintain two concepts:
### Audit history

Always moves forward:

```text
40
41
42 undo
43 undo
44 redo
```
### Logical Undo/Redo position

May move backward or forward through previously committed game states.

The exact persistence representation of the logical Undo/Redo cursor is deferred
until Undo/Redo implementation.

Required semantics are:
* Undo operates on the most recent logical gameplay action.
* Redo restores the most recently undone logical action.
* Performing a new gameplay action after Undo invalidates the interactive Redo
  path.
* Invalidated Redo history remains preserved in immutable audit history and
  snapshots.
* Undo and Redo themselves create new campaign revisions.
* Undo and Redo use compare-and-set concurrency protection.
* Redo restores known historical state and does not rerun random outcomes.
* Selective historical rewriting such as "remove revision 37 while preserving
  revisions 38-45" is not supported.
---
## 16. Checkpoints

A checkpoint is human-readable metadata pointing to an existing campaign
revision/snapshot.

Conceptually:

```ts
interface Checkpoint {
  checkpointId: CheckpointId;
  campaignId: CampaignId;
  sourceRevision: CampaignRevision;
  label: string;
}
```

Creating a checkpoint does not change gameplay state and therefore does not
increment `campaignRevision`.

Checkpoint records are initially immutable.
Restoring a checkpoint changes authoritative game state and therefore creates a
new gameplay revision, event(s), and snapshot.

Checkpoint restore never deletes or rewrites later historical revisions.

---
## 17. Portable Backups

Backups contain portable logical state, not raw Convex tables.

Conceptually:

```ts
interface CampaignBackupV1 {
  backupFormatVersion: 1;

  source: {
    campaignId: CampaignId;
    campaignRevision: CampaignRevision;
  };

  state: AnyCampaignState;
}
```

Portable backups must not depend on Convex `_id` values.

The source campaign identity is provenance and must not replace the destination
campaign's identity during restore.

Backup import follows:
```text
parse
  |
validate backup format
  |
validate state schema
  |
migrate explicitly supported old state schemas in memory, if defined
  |
verify supported ruleset
  |
validate complete resulting state
  |
check expected destination revision
  |
commit imported state as a NEW campaign revision
```

A rejected import performs zero persistent changes.

The backup format, campaign-state schema, and ruleset versions remain independent.

At the M4 baseline, V3 is the only supported CampaignState version for portable
backup import. V1/V2 backups fail closed; there is no V1->V3 or V2->V3 backup
migration path.

---
## 18. Schema Migrations

A schema migration changes how the same game meaning is represented.

Schema migrations must be:

* explicit;
* deterministic;
* tested;
* idempotent when they modify persistent live state;
* semantic-preserving.

Reads must never silently migrate or rewrite data.

Migrating the persistent representation of the current campaign does not itself
constitute gameplay and therefore does not increment `campaignRevision`.

Old immutable snapshots remain unchanged.
When restoring an old snapshot or backup, schema migrations may operate on the
loaded data in memory before the restored state is committed.

That general rule applies only to schema versions for which an explicit
supported migration exists. At the M4 boundary, V1/V2 CampaignState is retired
and unsupported for current state, snapshots, checkpoints, Undo/Redo restore,
and portable backup import; unsupported data fails closed.

Never blindly cast old persisted JSON to a current TypeScript type.

---
## 19. Ruleset Migrations

A ruleset migration changes the game semantics governing a campaign.

Ruleset migration is not a schema migration.

A deployed application must not silently change an existing campaign's rules
merely because new software was released.

Campaigns are pinned to:

```text
ruleset.id
ruleset.version
```
If a ruleset upgrade changes authoritative campaign semantics or state, the
upgrade must be explicit and auditable and should create a normal gameplay
revision with an appropriate domain event.

Historical restore must respect the ruleset under which the stored state is
defined. Unsupported old rulesets must fail explicitly rather than being silently
interpreted under newer rules.

---
## 20. Deterministic Domain Logic

Pure domain functions must not directly call nondeterministic facilities such as:

```ts
Math.random()
Date.now()
```

Randomness and authoritative wall-clock inputs are supplied explicitly by the
server when game mechanics require them.

Example:

```ts
resolveSpell(state, command, {
  roll: authoritativeRoll
});
```

Domain events record actual authoritative outcomes.
A retry using the same `commandId` must never be capable of producing a second,
different random outcome for an already committed command.

Game calendar time and real-world wall-clock time are separate concepts.

Browser clocks and time zones must not determine authoritative game time.

---
## 21. Validation Layers

Three distinct validation layers are required.

### Structural validation

Checks data/API shape.

Examples:

* legal literal union values;
* required fields;
* valid event structures.

Convex validators provide the persistence/API boundary.

### Domain validation

Checks whether an intended action is legal according to the game.

Examples:

* sufficient resources;
* valid target;
* legal action in current state.

This should live primarily in pure domain logic.
### Whole-state invariant validation

Checks whether the calculated resulting campaign state is internally coherent.

Conceptually:

```ts
validateCampaignState(nextState);
```

Future invariants may include:

* all entity references resolve;
* resource quantities are legal;
* required records exist;
* impossible combinations are absent;
* numeric domain values are safe integers where applicable.

A failure at any validation stage causes zero persistent transaction writes.

---
## 22. Domain Errors

Expected command rejection should use stable machine-readable error codes rather
than depending upon English error strings.

Examples:

```text
STALE_CAMPAIGN_REVISION
COMMAND_ID_REUSED
CHECKPOINT_NOT_FOUND
SNAPSHOT_NOT_FOUND
INVALID_BACKUP
UNSUPPORTED_BACKUP_VERSION
UNSUPPORTED_STATE_SCHEMA
UNSUPPORTED_RULESET
INVALID_CAMPAIGN_STATE
```

UI code translates error codes into appropriate user-facing messages.

Unexpected invariant/programming failures remain exceptional failures.

---
## 23. Read Models and UI Boundaries

React should not depend directly on physical Convex document layouts.

Persistence records should be adapted into explicit application/read views.

Conceptually:

```text
Convex persistence record
        |
        v
domain/read adapter
        |
        v
CampaignView
        |
[O        v
React
```

Derived presentation values belong in read models when useful.

For example:

```ts
{
  campaignRevision: 42,
  calendar: {
    monthOrdinal: 8,
    monthId: "december",
    displayName: "December"
  }
}
```

`monthId` and `displayName` are derived from canonical state.

Activity-history UI should consume normalized activity representations rather
than requiring React components to understand every historical event schema
version directly.

---
## 24. Physical Storage Is an Adapter

The logical domain model must not assume that campaign state always exists in one
Convex document.

Initially, storing the small current campaign state in one document is acceptable.

Future storage may use multiple documents/tables such as:

```text
campaigns
wizards
domains
entities
orrery
```

Persistence access should become centralized through functions such as:

```ts
loadCampaignState(...)
persistCampaignState(...)
```
rather than spreading storage-layout assumptions throughout game-rule code.

Snapshots and backup semantics operate on logical campaign state regardless of
physical database layout.

---
## 25. Deletion Policy

Normal gameplay must not hard-delete meaningful historical data.

M4 administrative whole-campaign deletion is an explicit infrastructure
exception to that gameplay rule. It lives outside CampaignState and is
eventless, revisionless, and non-Undo-able. A durable deletion barrier is
committed before destructive cleanup, normal gameplay/recovery writes are
blocked while it exists, cleanup proceeds in bounded idempotent batches, the
canonical campaign is removed near the end, and the marker is removed last only
after the campaign-owned graph has been verified absent.

This administrative deletion mechanism must remain generic persistence
infrastructure. It is not a game-domain meaning for death, destruction, or any
other in-fiction event.

Do not normally delete:

* campaign revision records;
* domain event records;
* snapshots;
* historical entities needed to interpret retained state/history.

Game concepts such as death, destruction, graduation, expiration, etc. should
normally be represented as state transitions rather than physical database
deletion when history may reference them.
Disposable UI/configuration metadata may use normal deletion where appropriate.

---
## 26. Exhaustive Domain Handling

Finite domain unions should be handled exhaustively.

Adding a new event type or other finite state should cause compile-time failures
where existing logic has not accounted for it.

Use exhaustive-switch / `assertNever` patterns where appropriate.

Do not silently swallow unknown persisted event or schema versions with generic
default behavior.

Unknown historical structures fail closed.

---
## 27. Validation Technology

Do not introduce an additional schema framework solely for this architecture at
this stage.

The initial approach is:

```text
shared TypeScript domain definitions/constants
+
Convex validators
+
pure domain validation/invariant functions
```

A shared runtime schema library may be reconsidered later if maintaining runtime
validation becomes sufficiently repetitive or error-prone.

---
## 28. Existing v0.1 Migration

Migration from the Milestone 1 data model must be explicit and idempotent.

Existing production/development campaign data must not be discarded or reset.

The existing campaign document should be migrated while preserving data whenever
practical.

Existing month-history events may be transformed into the new event structure
while preserving their original Convex creation metadata if possible.
Before historical reconstruction, the migration must validate the complete v0.1
event chain, including:

* contiguous revision ordering;
* each event's source ordinal matching prior state;
* each destination ordinal matching direction;
* current campaign revision matching historical records;
* current month matching the final historical result;
* any legacy persisted display names agreeing with canonical month derivation.
If and only if the chain validates completely, historical state may be
deterministically reconstructed and snapshots backfilled for every historical
revision, including Revision 0.

If validation fails:

```text
STOP
MAKE ZERO MIGRATION WRITES
REPORT THE INCONSISTENCY
```

The migration must never guess at missing or contradictory history.

---
## 29. Deferred Decisions

The following are deliberately deferred until the feature that needs them:

* exact persisted representation of the logical Undo/Redo cursor;
* long-term snapshot compression, pruning, or archival;
* final physical storage topology for large campaign states;
* authoritative random-number-generation algorithm;
* multiplayer permissions for Undo, Restore, and other sensitive operations.
These are intentional deferred decisions, not permission to violate the
architecture defined above.

---
## 30. Required Invariants

The following are non-negotiable architectural invariants:
1. Current campaign state is authoritative.
2. One accepted gameplay command creates one campaign revision.
3. One revision contains one or more ordered domain events.
4. Every campaign revision has exactly one full logical-state snapshot.
5. Revision numbers only increase and are never reused.
6. Historical events, revision records, and snapshots are immutable.
7. Restore, Undo, Redo, and import create new revisions rather than rewriting
   history.
8. Persisted game identities do not depend on Convex deployment-specific IDs.
9. Clients send intent; the server derives authoritative consequences.
10. Game-rule calculations are pure and deterministic where practical.
11. A failed transaction produces no partial persistent state.
12. Duplicate retries cannot execute the same authoritative command twice.
13. Schema versions, ruleset versions, event versions, backup versions,
    campaign revisions, and application versions remain independent.
14. Display/presentation values are not duplicated as authoritative state when
    they can be deterministically derived.
15. Reads never silently mutate or migrate persistent campaign data.
16. Unsupported persisted formats or rulesets fail explicitly rather than being
    guessed at.
