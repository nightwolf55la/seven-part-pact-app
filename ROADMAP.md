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

## Milestone 4 — Shared Monthly Play Loop (Complete)

Normal shared monthly play is implemented end-to-end as a thin complete vertical
slice:

```
New Moon -> Visions -> Planning -> Story -> Meeting -> Quiet -> next New Moon
```

**Delivered:**

- CampaignState V3: discriminated Setup/Play lifecycle, Orrery state, monthly
  Time/Engagement state, Wizardmoot attendance history.
- Intentional retirement of V1 and V2 CampaignState (one-time pre-release
  compatibility break; pre-M4 campaign data were explicitly disposable).
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

**Closeout verification:**

- Final deterministic repository check passed after the last M4 fixes.
- Real Convex multi-batch campaign deletion was exercised beyond the 200-record
  batch limit.
- Real interrupted deletion/resumption and duplicate concurrent deletion
  requests converged safely.
- Actual Convex V3 partial-Setup serialization and multi-client realtime
  propagation were exercised.
- A normal browser monthly loop was exercised end-to-end.
- Real browser portable-backup download/import was exercised.
- Integration testing exposed a Quiet React hook-order defect; it was fixed with
  an automated regression test.
- The permanent campaign-health verifier (`verifyMigration:verifyMigration`)
  reported valid after the final runtime/schema deployment.
- Deterministic stale-context/concurrency semantics are covered by automated
  tests; imprecise manual simultaneous-button races were intentionally not used.

**Known deferred usability work:**
- The core loop is usable, but the UI is not considered polished or fully
  responsive.
- Orrery presentation and general UI/layout polish remain future work. Their
  roadmap placement is intentionally left to the Master/user rather than being
  assigned a new milestone here.

**Not in M4 scope:**

- Domain engines, full Wizard character systems, Watcher system UI, magic,
  Lore, Notes, generic Impact, persistent Scene records, generic TTRPG
  frameworks.
- Social/auth integration, multi-campaign, per-player Undo.

**Design document:** [docs/m4-shared-monthly-play-loop.md](docs/m4-shared-monthly-play-loop.md)

## Milestone 5 — Wizard, World, Domain, and Campaign Knowledge Systems (In Progress)

Milestone 5 builds the Seven-Part Pact-specific game structures required for
normal campaign operation while preserving the generic persistence/recovery
foundation established in earlier milestones.

### M5.1 — Wizard Character Foundation (Complete)

Established the shared Wizard character foundation and CampaignState V4.

**Delivered:**

- CampaignState V4 as the sole supported current and historical runtime
  baseline after an explicitly approved disposable pre-release V3 retirement.
- Required Wizard character state with incomplete configuration supported.
- Elements, Pact-Fragment personal form, Familiar description, age, public
  Changes of Magic, Important Notes, and interim Element-keyed Companion
  descriptions.
- Canonical `update_wizard_character` command and versioned audit event.
- Wizard character editing integrated into setup/play presentation.
- Existing snapshot, Undo/Redo, checkpoint, backup/import, equality, and
  verification mechanics continue to carry complete Wizard character state.

The M5.1 Companion descriptions are explicitly interim and are replaced by the
shared Denizen/Companion relationship model in M5.2.

**Design document:** [docs/m5-wizard-character-foundation.md](docs/m5-wizard-character-foundation.md)

### M5.2 — Shared World + Active Domain Structures (In Progress)

M5.2 establishes shared world identity first, then implements the five active
Domain structures for structured manual operation before significant rules
automation.

#### M5.2B — Shared World Foundation

**Approved scope:**

- CampaignState V5 with embedded shared-world state.
- Stable lightweight Denizen identity, including collective characters.
- Stable Isle and meaningful place identity without a universal geographic
  tree.
- Changeable Wizard home-Isle and Sanctum-place associations; changing an
  association preserves the previous place.
- Explicit current/ended Companion relationships between Wizard, Element, and
  Denizen; replacing a Companion preserves the previous relationship and
  Denizen.
- Existing-Denizen Engagement targets alongside legitimate manual named
  targets.
- Existing persisted Time destinations remain unchanged, with any concrete
  world links presented only as current context.
- Minimal World directory/detail/picker UI and Wizard-sheet integration.
- No hard-delete operations for shared world subjects in this slice.
- No automatic world seeding and no new Begin Play blockers.
- Existing canonical persistence, snapshots, audit history, idempotency,
  Undo/Redo, checkpoints, backup/import, verification, and campaign-deletion
  semantics remain authoritative.

V4 is not redefined or silently migrated. V5 runtime activation requires the
separately approved disposable-data cutover procedure for each actual target.

#### M5.2C — Five Active Domain Structures

Implement in this order unless later evidence requires an approved change:

1. **Hierophant — Temples of the Flame**
2. **Mariner — Storming Seas**
3. **Necromancer — Gates of Death**
4. **Faustian — Devil's Chains**
5. **Sorcerer — Truth of Magic**

These slices establish persistent structures and manual operations first.
Significant automatic rule resolution remains deferred until the relevant
mechanics have a demonstrated need and an approved design.

Warlock and Sage Domain boards are deferred. Their people, places, and
reference concepts may still be represented when an active system needs them.

**Known M5.2 deferred decisions / boundaries:**

- The Faustian Codex and Materials disagree on the Capricorn/Pisces Community
  mapping. Do not seed a definitive mapping until the source conflict is
  adjudicated.
- Treasure identity/holding is deferred to its first concrete Domain consumer
  within M5.2; it must remain a bounded manual model, not a generic inventory or
  magic engine.
- Familiar remains Wizard-associated descriptive state for now.
- Do not prematurely generalize these structures into a generic TTRPG
  framework.

### M5.3 — Campaign Knowledge & Compendium (Planned)

Build campaign knowledge on top of stable M5.2 subjects.

**Planned scope:**

- Contextual Lore, specialized knowledge, and notes attached to resolvable
  campaign subjects.
- Search across subjects and their attached knowledge.
- Fast unattached capture as a fallback when a subject is not yet established.
- Lore history that can show additions, edits, and removals.
- Historical knowledge must not appear as current truth by default.
- Lore-history presentation should use or cooperate with canonical history,
  rather than establish a competing historical authority.
- Note history is related but secondary to Lore history.

Existing descriptions are not automatically Lore.

### M5.4 — Optional Shared Table View (Planned)

Explore an optional shared spatial/table presentation for groups that benefit
from it while preserving the application's efficient textual, tabular, and
side-by-side views.

M5.4 is not a prerequisite for normal M5.2/M5.3 operation and is not a map
canvas requirement for the shared-world foundation.

## Milestone 6 — Magic and Complex Resolution (Provisional / TBD)

TBD.

## Milestone 7 — Campaign Usability / Multiplayer Ergonomics (Provisional / TBD)

TBD.

## Milestone 8 — Production Readiness (Provisional / TBD)

TBD.
