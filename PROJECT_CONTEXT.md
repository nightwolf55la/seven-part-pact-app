# Seven-Part Pact App — Project Context

## Purpose

Build a shared web application supporting play of the tabletop RPG
**Seven-Part Pact**.

The application assists the actual tabletop game. It should make persistent
state, Domain boards, shared references, and recurring procedures easier to
manage without replacing the game's creative/narrative play or the judgment of
the Celestial Audience.

## Sources of Truth

Authoritative game-rule sources are the uploaded/current Seven-Part Pact:

- Rulebook;
- Grimoire;
- seven Codices;
- Cards;
- Materials.

For game rules, distinguish:

- **SOURCE** — what the written material explicitly states;
- **INFERENCE** — what reasonably follows but is not explicit;
- **APPLICATION DESIGN** — what the software chooses to model, enforce, derive,
  or defer.

Do not silently turn an ambiguous interpretation into application canon.

The GitHub repository is authoritative for:

- current source code;
- persisted architecture;
- repository documentation;
- tests;
- merged implementation history.

Project chat history is supporting context, not durable source of truth.

## Technology

Frontend:

- React
- Vite
- TypeScript

Backend:

- Convex
- authoritative persistence
- realtime subscriptions

Hosting:

- Vercel

Source control:

- GitHub
- protected `main`
- feature/workstream branches
- pull requests
- CI before merge

Implementation workbench:

- **Cursor** — primary implementation worker
- local repository / Git-aware workflow

Agent orchestration:

- ChatGPT Master Agent
- temporary ChatGPT Workstream Agents
- temporary ChatGPT Specialist Agents
- Cursor directed by the active Workstream

See `AGENT_WORKFLOW.md` for detailed model/configuration, handoff, branch,
review, and resource-discipline rules.

## Repository

https://github.com/nightwolf55la/seven-part-pact-app

Detailed application architecture and operating documentation live in the
repository, primarily under `docs/`. `PROJECT_CONTEXT.md` and
`AGENT_WORKFLOW.md` are ChatGPT Project Sources and do not need duplicate
repository copies.

## Current Milestone State

As of September 10, 2026:

### M1 — Realtime Foundation

**COMPLETE**

Established the shared realtime campaign and early Orrery/month foundation.

### M2 — Persistence Foundation

**COMPLETE**

Tag:

`v0.2-persistence-foundation`

Established:

- authoritative CampaignState;
- transactional gameplay commits;
- monotonic campaign revisions;
- immutable audit events;
- complete snapshots;
- Undo / Redo;
- Checkpoints / Restore;
- portable current-state JSON Backup / Import;
- operational recovery practices;
- campaign-health verification;
- persistence-evolution safeguards;
- CI/release/recovery documentation.

### M3 — Core Campaign Model

**COMPLETE**

Established the campaign/player/Pact-seat foundation and core semantic command
model used by later work.

### M4 — Shared Monthly Play Loop

**COMPLETE**

Established the campaign lifecycle, month/lunar-phase loop, Orrery,
Time/Engagement scheduling, Wizardmoot state, and shared play-shell behavior.

### Wizard Character Foundation

**COMPLETE**

Established stable `WizardId` identity independent of Pact-seat identity plus
shared character-sheet state.

### M5.2B — Shared World Foundation

**COMPLETE**

Established shared Denizen, Isle, Place, and CompanionRelationship identities
for cross-Domain reuse.

### M5.2C-H — Hierophant Structural Foundation

**COMPLETE**

Established the Hierophant's structural Domain state and shared World identity
integration.

### M5.2C-M — Mariner Structural Foundation

**COMPLETE**

Established the Mariner's structural Domain topology/state and shared World
identity integration.

### M5.2C-N — Necromancer Structural Foundation

**COMPLETE**

Established the Necromancer's Gates/Death structural state, Foes, Allies,
Ghoul-Callers, and related Domain state.

### M5.2D — Shared Wizard & Denizen State Foundation

**COMPLETE**

PR #17 merged to `main`.

Established shared foundations needed by concrete cross-Domain mechanics:

- Wizard rules mortality while preserving `WizardId`;
- Necromancer dead-Wizard traversal/Foe identity;
- individual Denizen mortality;
- shared Powerful-Denizen Taxonomy/Status/Goal/Methods/Truths;
- stable Treasure identity/custody foundation;
- seat-keyed Pact-Fragment condition/custody;
- shared integration for Ghoul-Callers, Prophets, Cults, and Beasts.

### M5.2E — Faustian + Sage + Warlock Structural Foundations

**COMPLETE**

PR #18 merged to `main`.

Final feature HEAD before merge:

`05b158ade8fcd1ca948321fe4a450af98e7d6694`

Final closure verified:

- 113 test files;
- 2186 tests;
- TypeScript/Vite build;
- `git diff --check`;
- disposable real Convex/browser serialization, refresh, realtime,
  Undo/Redo, backup export/import, and post-import campaign-health checks.

M5.2E delivered the structural foundations for Faustian, Sage, and Warlock
without expanding the milestone into full gameplay automation or broad UI.

#### Faustian

Established durable structure for:

- stable 52-card identity and locations;
- Faustian/Devil Decks, Communities, Schemes, Pawns, Accomplices;
- Machinations/Twists and persistent Machination outcome state;
- Conspiracies, Antagonists, Demons and Domain seizures/conduits;
- Devil Laws/Forms/origin claims;
- durable Devil obligations, including permanent Devil Time;
- Powerful-Denizen integrations;
- Devil Treasure/Pact-Fragment integration;
- Devil as a narrow shared Time participant with typed scheduling behavior.

#### Sage

Established durable structure for:

- Laws of Dreaming;
- 25 Destiny definitions plus persistent Destiny instances;
- ordered deck/set-aside/assigned Destiny state;
- Wizard-or-Denizen Destiny subjects;
- hidden/accepted/rejected state;
- Dreaming and Future conditions;
- fungible typed Omen ledger;
- fixed Dreamscape segment identity;
- Cycles;
- Fairy/Druid structural overlays and Powerful taxonomies;
- Lost-in-Dreams durable state.

Truth/Test/Legacy card prose and richer Dreamscape display text remain deferred
as static/display additions rather than CampaignState evolution.

#### Warlock

Established durable structure for:

- Laws of the Court, Ideologies, Clans and Clan Favor;
- stable Lord Title identity separate from mortal occupants;
- ordered Clan decks and King's Agenda;
- Questing/Errant/Accomplice/Devil-taken Title states;
- person-or-vacant King;
- Family and ordered Confidants;
- Errant Ladies and typed cross-Domain claims;
- sparse typed Authority ledger;
- Garrisons;
- Armies, Heroes and Errant Nobles using shared Powerful Denizens;
- Army lifecycle/current Favor;
- Rebellions and Sage-Omen integration;
- Market political overlays and recurring political partnership facts.

Full Warlock monthly procedures, Agenda effects, alternate governments, UI and
other automation remain deferred.

### Current-V5 Test Fixture

M5.2E added:

```ts
makeTestCampaignStateV5(
  overrides?: Partial<CampaignStateV5>
): CampaignStateV5
```

Ordinary tests needing an otherwise-valid current V5 state should prefer this
helper. Exact schema/version/malformed-serialization tests should remain
explicit.

### M5.2F — Sorcerer Structural Foundation

**NEXT WORKSTREAM**

The Sorcerer is the remaining Wizard Domain without its structural foundation.

The next Workstream should perform a complete durable-state design survey
before implementation, with particular care around:

- Tower hierarchy and Researcher positions;
- Knowledge;
- Students and Academics;
- Reliable/Disruptive Arcanists;
- Tomes and Reagents, including transfer to Wizards;
- Innovations attached to Grimoire spells;
- opening/closing the Archives and Research;
- cross-Domain Researcher positions using already-implemented Domain identity;
- the boundary with M5.3 mutable Lore;
- gamechanging creation of additional Wizards/Towers, which must not silently
  force generic multi-Domain architecture.

### M5.3 — Knowledge & Compendium

**PLANNED / DEFERRED UNTIL CHARTERED**

Persisted mutable Lore is explicitly owned here rather than by one-off
Domain-local Lore fields.

M5.3 must ultimately support stable mutable Lore entries and current/historical
truth behavior.

## Important Persistence Model

The application is **not event-sourced**.

Current `CampaignState` is authoritative game state.

Events explain/audit changes.

Snapshots provide history and recovery.

Clients send intent; the server computes authoritative resulting state.

Normal gameplay writes go through canonical transactional persistence.

Every accepted gameplay revision receives a complete snapshot.

Undo/Redo restore complete snapshots rather than applying inverse operations.

Checkpoint Restore and Backup Import create new audit revisions rather than
rewriting history.

Portable app backups contain complete current CampaignState.

Convex operational exports remain the full-fidelity deployment disaster
recovery mechanism.

Persisted inconsistencies fail closed.

## CampaignState V5 Pre-Activation Policy

CampaignState V5 is currently **PRE-ACTIVATION**.

While all V5 persisted artifacts are explicitly disposable, V5 may evolve
**in place**.

Schema versions represent meaningful persisted compatibility epochs. They do
not represent every field, commit, Domain, or Workstream.

Therefore:

- do not create V6 merely because another M5 Domain adds state;
- do not build compatibility shims for discarded pre-activation V5 shapes;
- do not silently migrate persisted state;
- do not assume an environment remains disposable without fresh confirmation
  before destructive work.

V5 becomes activated/frozen when the Master/human explicitly declares it so or
when campaign state/backups/checkpoints intended for preservation are created.

After activation, incompatible changes require explicit compatibility and
migration analysis.

## Architecture Boundary

Keep a conceptual separation between:

### Persistence / Platform Concerns

Examples:

- authoritative transactions;
- revisions;
- snapshots;
- idempotency;
- concurrency;
- immutable audit history;
- checkpoints;
- backups;
- verification;
- schema evolution;
- recovery;
- deletion barriers.

These should remain game-domain-agnostic where practical.

### Seven-Part Pact Domain Concerns

Examples:

- Wizards;
- Pact seats and Pact-Fragments;
- Domains;
- Denizens;
- Powerful Denizens;
- Orrery;
- Time;
- Engagements;
- Treasures;
- spellcasting;
- Codex-specific mechanics.

Model these directly using Seven-Part Pact terminology.

The application is **not** intended to become a generic TTRPG framework.

Do not introduce abstractions such as `GenericGameEntity`, generic RPG
resources, generic faction engines, or generic geography merely because another
game might theoretically reuse them.

Generalize only when multiple real Seven-Part Pact systems share the
abstraction or a second concrete consumer proves the reuse.

## State Safety

Loss or corruption of campaign state is the highest technical risk.

Preserve:

- authoritative CampaignState;
- server-authoritative resulting state;
- canonical transactions;
- complete snapshots;
- immutable audit history;
- fail-closed validation;
- command idempotency;
- valid Undo/Redo;
- valid checkpoint/backup/recovery behavior;
- explicit schema-evolution policy.

Do not weaken persistence, recovery, concurrency, migration, or corruption
verification merely to reduce AI usage or wall-clock time.

## Testing Principle

Automate deterministic behavior.

Use focused tests during implementation and full deterministic gates at
meaningful checkpoints/closure boundaries.

Manual verification should prove only integration boundaries that automated
in-memory tests cannot fully establish, such as:

- real Convex persistence/serialization;
- true concurrency;
- realtime/refresh behavior;
- browser backup download/upload;
- deployment/environment wiring;
- realistic migration rehearsal when a migration actually exists.

Do not manually replay large automated test matrices.

## Implementation / Agent Workflow

Cursor is the primary implementation worker.

Workstreams direct Cursor; the Master normally does not.

Every Cursor prompt must be accompanied by an explicit Cursor configuration,
including model, effort, context, Max Mode, Fast Mode, Auto, execution/review
mode, and whether to start a new Cursor agent or reuse the current one.

Every prompt intended to start/continue another ChatGPT project agent must state
whether the human should use project `STANDARD` or `PRO` mode. Pro is expected
to be used sparingly.

See `AGENT_WORKFLOW.md` for the complete rules.
