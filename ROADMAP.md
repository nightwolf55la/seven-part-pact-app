# Seven-Part Pact — Roadmap

## Milestone 1 (Complete)

Initial application scaffold. React + Vite + TypeScript frontend, Convex
backend, Vercel hosting. Basic campaign state with month ordinal and legacy
event log.

## Milestone 2 (Complete)

Canonical commit architecture with full audit trail:

- CampaignState V1: `schemaVersion: 1`, `calendar.monthOrdinal`.
- Canonical commit with idempotent commands and immutable revision/event/snapshot
  records.
- History control (undo/redo stacks).
- Checkpoint create/restore.
- Portable application backup/import (current CampaignState + integrity digest).
- Full-fidelity disaster recovery via Convex operational export/restore.
- Campaign health verifier.

## Milestone 3 — Campaign Identity & Pact Roles Foundation (Approved)

V2 campaign state: entity model for campaign setup and wizard seat management.

**Bounded scope:**

- CampaignState V2: adds `configuration`, `players`, `wizards`, `pactSeats`.
- 11 M3 commands (add/rename/remove player, create/rename wizard, set portrayal,
  set seat wizard/status/watcher, set age, set facilitator).
- Pre-transition idempotency for all M3 commands.
- Explicit admin-only V1-to-V2 current-state migration.
- Historical snapshot in-memory migration at load boundaries
  (`loadHistoricalState`).
- Campaign setup UI for players, wizards, and pact seats.
- Retained wizard reassignment (unassigned wizards can be assigned to empty
  seats).

**Not in M3 scope:**

- Wizard hard-delete (future deletion semantics are unsettled).
- Social/auth integration (players are campaign-level, not account-level).
- Calendar/orrery mechanics beyond existing month ordinal.
- Game-phase automation or domain-specific event processing.
- Multi-campaign or campaign-fork operations.

**Deployment status:**

- EXPAND phase implemented on branch.
- Disposable deployment verification pending.
- CONTRACT phase pending after all environments confirmed V2.
- See `docs/v1-to-v2-migration-procedure.md` for staged rollout.

## Milestone 4+ (Provisional / TBD)

Items below are potential future directions. None are approved or scheduled.

- Wizard lifecycle operations (retire, delete, transfer).
- Game-phase automation tied to calendar.
- Orrery / domain subsystems.
- Multi-campaign support.
- Real-time presence / session state.
