# Milestone 3: V2 Campaign State and Entity Model

**Status:** Accepted  
**Extends:** `docs/architecture/state-model.md`  
**Applies Beginning With:** Milestone 3

---

## Overview

M3 extends `CampaignState` from V1 (calendar-only) to V2, adding the entity
model required for campaign setup and wizard seat management.

V2 is a strict superset of V1's semantic content:

- All V1 fields (`schemaVersion`, `ruleset`, `calendar`) are preserved.
- V2 adds `configuration`, `players`, `wizards`, and `pactSeats`.
- Migration from V1 to V2 is deterministic and lossless (empty collections).

> **Supersession (M4):** This document is a historical M3 reference. M4
> retires both V1 and V2 and introduces V3 as the minimum supported version.
> V1/V2 migration paths, historical snapshot compatibility, and related code
> described here are removed at the M4 boundary. See
> [M4 Shared Monthly Play Loop](../m4-shared-monthly-play-loop.md) for the V3
> specification and retirement rationale.

---

## CampaignStateV2 Shape

```ts
interface CampaignStateV2 {
  schemaVersion: 2;
  ruleset: { id: "seven_part_pact_draft4"; version: 1 };
  calendar: { monthOrdinal: MonthOrdinal };
  configuration: {
    ageId: AgeDefinitionId | null;
    facilitatorPlayerId: PlayerId | null;
  };
  players: readonly CampaignPlayer[];
  wizards: readonly CampaignWizard[];
  pactSeats: { readonly [K in PactSeatId]: PactSeatState };
}
```

### Entity Types

- **CampaignPlayer**: `{ playerId: PlayerId; name: string }`
- **CampaignWizard**: `{ wizardId: WizardId; name: string; portrayedByPlayerId: PlayerId | null }`
- **PactSeatState**: `{ status: "present"|"silent"|"absent"|null; wizardId: WizardId|null; watcherPlayerId: PlayerId|null }`

---

## Pact Seats

Seven fixed seats with stable IDs: `necromancer`, `hierophant`, `warlock`,
`mariner`, `faustian`, `sage`, `sorcerer`.

Seats are always present in state (never added/removed). Their fields are
nullable: a seat with no wizard assigned has `wizardId: null`.

---

## Wizard Retention

Wizards are first-class entities with stable `wiz_`-prefixed UUIDs. Unassigning
a wizard from a seat retains the wizard object in `state.wizards`. This
supports:

- Reassignment to a different seat.
- Historical identity continuity.
- Portrayal tracking independent of seat assignment.

M3 retains committed wizard identities and provides no hard-delete operation.
Future deletion semantics are unsettled and not approved.

---

## M3 Command Types and Events

Each M3 command produces a specific event family enforced by `canonicalCommit`:

| Command             | Required Events                                     |
|---------------------|-----------------------------------------------------|
| `add_player`        | `player_added`                                      |
| `rename_player`     | `player_renamed`                                    |
| `remove_player`     | `player_removed`                                    |
| `set_campaign_age`  | `campaign_age_changed`                              |
| `set_facilitator`   | `facilitator_assignment_changed`                    |
| `create_wizard`     | `wizard_created` + `pact_seat_wizard_changed`       |
| `rename_wizard`     | `wizard_name_changed`                               |
| `set_wizard_portrayal` | `wizard_portrayal_changed`                        |
| `set_pact_seat_wizard` | `pact_seat_wizard_changed` (+ optional `pact_seat_status_changed`) |
| `set_pact_seat_status` | `pact_seat_status_changed`                        |
| `set_watcher`       | `watcher_assignment_changed`                        |

All events are version 1. Event coherence is enforced in `canonicalCommit`'s
`validateM3EventCoherence` function.

---

## V1 to V2 Migration Boundary

### Principle

Historical V1 snapshots remain immutable. V2 is the authoritative current-state
format. Migration occurs at read boundaries, never as a silent write.

### Pattern: `loadHistoricalState(raw)`

All code that reads a historical snapshot (which may be V1 or V2) uses the
production helper exported from `shared/domain/state-migration.ts`:

```ts
import { loadHistoricalState } from "../shared/domain/state-migration";

const currentState: CurrentCampaignState = loadHistoricalState(rawPersistedSnapshot);
```

This:
1. Validates the raw value as either V1 or V2 (`validateAnyCampaignState`).
2. Migrates V1 to V2 (adding empty players/wizards/pactSeats/configuration).
3. Returns a guaranteed `CurrentCampaignState` (V2).

Call sites: `campaign.ts` (undo/redo/checkpoint), `m3Commands.ts` (idempotency),
`verifyMigration.ts` (health check).

### Admin Migration

`convex/adminMigration.ts` provides `migrateCurrentStateToV2`:

- Idempotent: no-op if the campaign document is already V2.
- Patches only the campaign document's `state` field.
- Does NOT create audit events or rewrite historical snapshots.
- Preserves `campaignId` and `campaignRevision` exactly.

### Legacy `executeMigration.ts`

The v0.1 legacy migration now produces V2 current state by calling
`migrateV1toV2()` on the final V1 snapshot before writing the campaign record.

---

## Command Fingerprints

M3 commands use entity-specific fingerprints following the existing pattern:

```
add_player:v1:{playerId}:{normalizedName}
rename_player:v1:{playerId}:{newName}
remove_player:v1:{playerId}
create_wizard:v1:{wizardId}:{normalizedName}:{portrayedByPlayerId|"null"}:{seatId}
rename_wizard:v1:{wizardId}:{newName}
set_wizard_portrayal:v1:{wizardId}:{playerId|"null"}
set_pact_seat_wizard:v1:{seatId}:{wizardId|"null"}
set_pact_seat_status:v1:{seatId}:{status|"null"}
set_watcher:v1:{seatId}:{playerId|"null"}
set_campaign_age:v1:{ageId|"null"}
set_facilitator:v1:{playerId|"null"}
```

Fingerprints are deterministic and idempotency-safe: the same logical intent
produces the same fingerprint regardless of current state.

### Idempotency Matching

The pure deterministic matching logic is in `matchCommandIdempotency`
(`shared/domain/command-ids.ts`). Given a committed record and an attempted
command, it returns either `exact_match` (safe to return the original revision)
or `conflict` (must throw `COMMAND_ID_REUSED`). Database lookup remains in the
Convex mutation layer.

---

## Player Removal Guard

A player cannot be removed while referenced by:

- Any wizard's `portrayedByPlayerId` (including unassigned wizards).
- Any pact seat's `watcherPlayerId`.
- The campaign's `facilitatorPlayerId`.

The `isPlayerReferenced()` function checks all reference paths and returns a
human-readable reason string or `null`.

---

## Persistence Serialization Boundary

`convex/persistence.ts` provides typed helpers for the branded-type/Convex-type
boundary:

- `loadCanonicalRecord(ctx)`: loads the canonical campaign document with typed access.
- `serializeState(state)`: converts `CurrentCampaignState` to Convex-compatible format.
- `snapshotRecord(...)` / `campaignPatch(...)`: build typed persistence records.

These consolidate the `as any` assertions required by Convex's generated types
into a single documented module rather than scattering them across mutations.

---

## Age Definitions

Ages are fixed game-content definitions (not persisted entities). The
`AGE_DEFINITIONS` array provides:

```ts
{ id: AgeDefinitionId; displayName: string }
```

`configuration.ageId` references one of these definitions or is `null`.

---

## Current-State Migration Policy

- **Current-state migration is explicit and admin-only.**
  (`adminMigration:migrateCurrentStateToV2`)
- **Historical-state in-memory migration is allowed** at read boundaries
  (via `loadHistoricalState`).
- **Ordinary reads/writes never silently migrate** the authoritative current
  campaign document.
- M3 commands/queries fail closed with `MIGRATION_REQUIRED` if current state
  is still V1.

See [V1 to V2 Migration Procedure](../v1-to-v2-migration-procedure.md) for the
staged deployment sequence.

---

## File Map

| File | Responsibility |
|------|---------------|
| `shared/domain/campaign-state.ts` | V1 and V2 type definitions |
| `shared/domain/state-migration.ts` | `migrateV1toV2`, `migrateToCurrentVersion`, `loadHistoricalState` |
| `shared/domain/state-validation.ts` | `validateCampaignState` (V2), `validateAnyCampaignState` |
| `shared/domain/m3-transitions.ts` | Pure transition functions for all M3 commands |
| `shared/domain/command-ids.ts` | M3 fingerprint functions, `matchCommandIdempotency` |
| `shared/domain/pact-seats.ts` | Seat IDs, validators, display names |
| `shared/domain/ages.ts` | Age definitions and validators |
| `shared/domain/ids.ts` | Branded ID types and validators |
| `convex/m3Commands.ts` | Convex mutations (11 M3 commands) |
| `convex/m3Queries.ts` | `getCampaignSetup` query |
| `convex/adminMigration.ts` | Idempotent V1-to-V2 admin migration (internalMutation) |
| `convex/persistence.ts` | Typed persistence boundary helpers |
| `convex/canonicalCommit.ts` | Event coherence for M3 commands |
| `src/CampaignSetup.tsx` | Campaign setup UI |
| `tests/m3.test.ts` | M3 domain logic tests |
| `tests/mixedHistory.test.ts` | Mixed V1/V2 boundary + idempotency tests |

---

## Domain Model Clarifications

### Identity Distinctions

- **Player** is a campaign-level identity (someone at the table). It is separate
  from auth/account identity. Players have no system-level privilege.
- **Wizard** is a persistent fictional entity with a stable `wiz_`-prefixed ID.
  A wizard may outlive any particular seat assignment.
- **Pact Seat** (responsibility) is a fixed game-structural position. Seven exist.
- **Watcher** is a per-seat observer role held by a Player. One player may hold
  multiple watchers simultaneously.

### Facilitator

The `facilitatorPlayerId` is a nullable reference to a Player. It is a
campaign-organization role with **no admin privilege or special authority** in the
system. Any player can be designated or undesignated as facilitator.

### Watcher Semantics

- One Player may hold multiple persistent Watcher assignments.
- Temporary watcher handoff (session-level) is not persisted in campaign state.
- Watcher assignment creates a `watcher_assignment_changed` event.

### Seat Status

These are Seven-Part Pact game-domain status terms persisted by M3:

- `null` — incomplete or not-yet-recorded configuration. Distinct from all
  three named statuses. This is the default for all seats.
- `"absent"` — the seat/wizard is explicitly marked absent.
- `"present"` — the seat/wizard is explicitly marked present.
  **Structural constraint: requires a current wizard assigned to the seat.**
- `"silent"` — the seat/wizard is explicitly marked silent.
  **Structural constraint: requires a current wizard assigned to the seat.**

M3 enforces only the approved structural constraint that `"present"` and
`"silent"` require a current wizard (`wizardId` is not null). Detailed gameplay
consequences of Silent, Absent, and Present are not automated or settled by M3.

### Calendar

`calendar.monthOrdinal` remains the sole chronology and Sun-position authority.
M3 does not alter calendar semantics.

---

## M3 Concurrency Policy

All M3 mutations run as Convex transactions. Convex serializes concurrent
transactions against the same document: one commits first and the other retries
against the updated state. No application-level compare-and-set (CAS) or version
precondition is required by M3 command semantics.

### A. Last-Writer-Wins Setters

These commands set a single configuration value. Two independently valid
concurrent writes serialize through Convex transaction ordering; the later
committed value is authoritative. No CAS is required because the commands
express unconditional intent ("set X to Y"), and any valid value is acceptable
regardless of the prior value.

| Command | Target field |
|---|---|
| `setCampaignAge` | `configuration.ageId` |
| `setFacilitator` | `configuration.facilitatorPlayerId` |
| `renamePlayer` | player's `name` |
| `renameWizard` | wizard's `name` |
| `setWizardPortrayal` | wizard's `portrayedByPlayerId` |
| `setWatcher` | seat's `watcherPlayerId` |
| `setPactSeatStatus` | seat's `status` |

Idempotency (via command fingerprint matching) protects against duplicate
delivery of the same logical command. It does not provide field-level optimistic
locking between different commands.

### B. Transaction-Time Invariant Re-Evaluation

The categories below overlap: a command may have last-writer-wins semantics
between otherwise-valid setter intents while still re-evaluating entity
existence or relational invariants at transaction time.

These commands have validity that depends on relationships or uniqueness
constraints that may change concurrently. The server rereads authoritative state
inside the serialized transaction and evaluates invariants against
transaction-time state. A transaction that becomes invalid due to concurrent
changes will fail and the client must retry with corrected intent.

| Command | Invariants re-evaluated at transaction time |
|---|---|
| `addPlayer` | `playerId` uniqueness across `state.players` |
| `removePlayer` | Player not referenced as facilitator, wizard portrayer, or watcher |
| `createWizard` | `wizardId` uniqueness; target seat unoccupied; portrayal-uniqueness among seated wizards |
| `setPactSeatWizard` | Wizard exists; wizard not already seated elsewhere; portrayal-uniqueness among seated wizards |
| `setWizardPortrayal` | Player exists; portrayal-uniqueness among seated wizards |
| `setPactSeatStatus` | `"present"`/`"silent"` require a wizard assigned to the seat |
| `setFacilitator` | Player exists (when non-null) |
| `setWatcher` | Player exists (when non-null) |
| `renamePlayer` | Player still exists |
| `renameWizard` | Wizard still exists |

The pure transition functions in `shared/domain/m3-transitions.ts` enforce
these invariants. Because they execute inside the Convex mutation against the
transaction-time snapshot of the campaign document, an invariant violation
caused by a concurrent commit causes the transaction to fail rather than
committing an invalid state.

### Not Currently Required

- **Optimistic concurrency (CAS/expectedRevision):** M3 configuration commands
  are unconditional setters or server-validated transitions. There is no user
  scenario where "set only if no one changed it since I last looked" is the
  correct semantic. If a future command requires "conditional on my view being
  current," CAS can be added to that specific command.
- **Client-side conflict resolution or merge:** All conflict resolution is
  server-side via transaction serialization and invariant re-evaluation.

---

### Adjudication

Deterministic automation in the system is subordinate to human adjudication and
campaign rules. Source errata/interpretation policy is distinct from the
campaign's Truth-Watcher precedent mechanism.
