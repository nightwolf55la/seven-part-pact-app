# Seven-Part Pact — Roadmap

## Milestone 2 (Complete)

Calendar-based campaign state with month advancement, undo/redo, checkpoints,
backup/restore, and campaign-health verification.

- CampaignState V1: `schemaVersion: 1`, `calendar.monthOrdinal` only.
- Canonical commit with full audit trail and idempotent commands.
- History control (undo/redo stacks).
- Checkpoint create/restore.
- Full-fidelity backup export/import with SHA-256 integrity verification.
- Campaign health verifier.

## Milestone 3 (In Progress — EXPAND phase)

V2 campaign state: entity model for campaign setup and wizard seat management.

**Bounded scope:**

- CampaignState V2: adds `configuration`, `players`, `wizards`, `pactSeats`.
- 11 M3 commands (add/rename/remove player, create/rename wizard, set portrayal,
  set seat wizard/status/watcher, set age, set facilitator).
- Pre-transition idempotency for all M3 commands.
- Explicit admin-only V1-to-V2 current-state migration.
- Historical snapshot in-memory migration at load boundaries.
- Campaign setup UI for players, wizards, and pact seats.
- Retained wizard reassignment (unassigned wizards can be assigned to empty seats).
- Wizard rename inline from seat view.
- Status guards (Present/Silent require assigned wizard).

**Not in M3 scope:**

- Wizard hard-delete (future deletion semantics are unsettled).
- Social/auth integration (players are campaign-level, not account-level).
- Calendar/orrery mechanics beyond existing month ordinal.
- Game-phase automation or domain-specific event processing.
- Multi-campaign or campaign-fork operations.

**Deployment status:**

- EXPAND phase schema deployed (validators accept V1 or V2).
- CONTRACT phase pending after all environments confirmed V2.
- See `docs/v1-to-v2-migration-procedure.md` for staged rollout.

## Future (Not Approved)

Items below are potential directions, not approved work:

- Wizard lifecycle operations (retire, delete, transfer).
- Game-phase automation tied to calendar.
- Orrery / domain subsystems.
- Multi-campaign support.
- Real-time presence / session state.
