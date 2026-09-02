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

## Milestone 3 — Campaign Identity & Pact Roles Foundation (Complete)

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

- EXPAND phase implemented and merged to main.
- Disposable rehearsal completed successfully.
- Production EXPAND deployed; production MIGRATE completed and verified
  (campaignRevision remained 0; verifier valid including history-control and
  checkpoint status; browser smoke nominal).
- Historical revision-0 V1 snapshot remains physically immutable.
- Retained dev/bolt and dev/vercel deployments reseeded from fresh valid
  production V2 export (old development histories were disposable).
- Disposable dev/m3-rehearsal and preview/bolt-milestone-3 deployments removed.
- CONTRACT code implemented (narrows authoritative campaign record validator to
  V2-only). Historical V1 support intentionally retained for
  snapshots/recovery/undo-redo/checkpoints/legacy backup import/verifier paths.
- CONTRACT validator narrowing was merged and deployed to production.
- CONTRACT was rehearsed successfully on the retained V2 development deployment.
- Post-CONTRACT production verification remained valid:
  `status`, `historyControlStatus`, and `checkpointStatus` all `valid`;
  campaignRevision 0, 0 revisions/events, 1 historical snapshot, 0 checkpoints.
- Production browser smoke after CONTRACT completed with no unexpected behavior.
- Historical V1 support remains intentionally retained for
  snapshots/recovery/undo-redo/checkpoints/legacy backup import/verifier paths.
- **M3 COMPLETE.**
- See `docs/v1-to-v2-migration-procedure.md` for staged rollout.

## Milestone 4 — Shared Monthly Play Loop (Approved Design)

Normal shared monthly play becomes usable end-to-end as a thin complete
vertical slice:

```
New Moon -> Visions -> Planning -> Story -> Meeting -> Quiet -> next New Moon
```

**Scope includes:**

- CampaignState V3: discriminated Setup/Play lifecycle, Orrery state, monthly
  Time/Engagement state, Wizardmoot attendance history.
- Intentional retirement of V1 and V2 CampaignState (one-time pre-release
  compatibility break; pre-M4 campaign data are explicitly disposable).
- Campaign lifecycle: explicit creation, Setup, atomic Begin Play, Play,
  explicit destructive deletion.
- Orrery: authoritative planetary model with discrete printed-track positions,
  full Orrery Time mechanical resolution.
- Monthly Time system: participant budgets, allocation scheduling during
  Planning, Story rescheduling with allowance, spend/waste resolution.
- Monthly Engagements: per-Wizard scheduling, avoiding-Denizen linked Time.
- Six-phase monthly cycle with authoritative shared phase progression.
- Atomic month transition (advance calendar/planets, archive attendance,
  initialize new month state).
- Campaign creation and destructive deletion with full persistence-graph
  cleanup.
- Surface-based UI shell for Play with phase-aware defaults.
- Recovery UI moved under Campaign Tools with global/shared wording.

**Not in M4 scope:**

- Domain engines, full Wizard character systems, Watcher system UI, magic,
  Lore, Notes, generic Impact, persistent Scene records, generic TTRPG
  frameworks.
- Social/auth integration, multi-campaign, per-player Undo.

**Design document:** [docs/m4-shared-monthly-play-loop.md](docs/m4-shared-monthly-play-loop.md)

## Milestone 5 — Wizard / Domain Systems (Provisional / TBD)

TBD.

## Milestone 6 — Magic and Complex Resolution (Provisional / TBD)

TBD.

## Milestone 7 — Campaign Usability / Multiplayer Ergonomics (Provisional / TBD)

TBD.

## Milestone 8 — Production Readiness (Provisional / TBD)

TBD.
