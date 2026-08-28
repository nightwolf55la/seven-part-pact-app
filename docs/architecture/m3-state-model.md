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

### Pattern: `loadCurrentFromHistorical(raw)`

All code that reads a historical snapshot (which may be V1 or V2) uses:

```ts
function loadCurrentFromHistorical(raw: unknown): CurrentCampaignState {
  const validated = validateAnyCampaignState(raw);
  return migrateToCurrentVersion(validated);
}
```

This:
1. Validates the raw value as either V1 or V2.
2. Migrates V1 to V2 (adding empty players/wizards/pactSeats/configuration).
3. Returns a guaranteed `CurrentCampaignState` (V2).

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
  (via `loadCurrentFromHistorical`).
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
| `shared/domain/state-migration.ts` | `migrateV1toV2`, `migrateToCurrentVersion` |
| `shared/domain/state-validation.ts` | `validateCampaignState` (V2), `validateAnyCampaignState` |
| `shared/domain/m3-transitions.ts` | Pure transition functions for all M3 commands |
| `shared/domain/command-ids.ts` | M3 fingerprint functions |
| `shared/domain/pact-seats.ts` | Seat IDs, validators, display names |
| `shared/domain/ages.ts` | Age definitions and validators |
| `shared/domain/ids.ts` | Branded ID types and validators |
| `convex/m3Commands.ts` | Convex mutations (11 M3 commands) |
| `convex/m3Queries.ts` | `getCampaignSetup` query |
| `convex/adminMigration.ts` | Idempotent V1→V2 admin migration |
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

- `null` — not configured (no wizard assigned, or wizard assigned but status
  not yet declared). This is the default.
- `"absent"` — wizard/seat explicitly absent from current story.
- `"present"` — wizard actively present. **Requires a wizard assigned.**
- `"silent"` — wizard present but muted. **Requires a wizard assigned.**

Setting status to `"present"` or `"silent"` when `wizardId` is `null` is
invalid and rejected by the transition function.

### Calendar

`calendar.monthOrdinal` remains the sole chronology and Sun-position authority.
M3 does not alter calendar semantics.

### Adjudication

Deterministic automation in the system is subordinate to human adjudication and
campaign rules. Source errata/interpretation policy is distinct from the
campaign's Truth-Watcher precedent mechanism.
