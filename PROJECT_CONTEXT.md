# Seven-Part Pact App — Project Context

## Purpose

Build a shared web application supporting play of the tabletop RPG **Seven-Part Pact**.

The application assists the tabletop game rather than replacing its creative, interpretive, or narrative play. It should make persistent campaign state, Domain boards, shared references, recurring procedures, and table-facing bookkeeping easier to manage while preserving the judgment and authority of the Celestial Audience.

## Sources of Truth

For written game rules, the authoritative sources are the uploaded/current Rulebook, Grimoire, seven Codices, Cards, and Materials.

For rules discussion, explicitly distinguish:

- **SOURCE** — what the written material states;
- **INFERENCE** — what reasonably follows but is not explicit;
- **APPLICATION DESIGN** — what the software chooses to represent, enforce, derive, or defer.

Never silently convert an ambiguous interpretation into application canon.

The GitHub repository is authoritative for application source, persisted architecture, tests, repository documentation, and merged implementation history.

`PROJECT_CONTEXT.md` and `AGENT_WORKFLOW.md` are durable project-source context for ChatGPT agents. The repository currently also contains copies; when the human maintains both locations, keep their contents synchronized.

Chat history is supporting context, not durable source of truth.

## Technology

- React + Vite + TypeScript
- Convex authoritative persistence and realtime
- Vercel hosting
- GitHub source control / PR / CI
- Cursor as primary implementation worker

Agent organization:

- one long-lived ChatGPT Master Agent;
- temporary ChatGPT Workstream Agents;
- temporary read-only Specialist Agents;
- Cursor directed by the active Workstream.

See `AGENT_WORKFLOW.md` for detailed model/configuration, handoff, Git, testing, and resource-discipline rules.

## Repository

`nightwolf55la/seven-part-pact-app`

Before starting new repository work, verify current `main`, status, and HEAD rather than relying on an old handoff SHA.

## Current Milestone State

As of September 10, 2026, **all seven Wizard Domains have structural CampaignState foundations**.

### M1 — Realtime Foundation

**COMPLETE**

Established the shared realtime campaign and early Orrery/month foundation.

### M2 — Persistence Foundation

**COMPLETE**

Tag: `v0.2-persistence-foundation`

Established authoritative CampaignState, transactional gameplay commits, monotonic revisions, immutable audit events, complete snapshots, Undo/Redo, Checkpoints/Restore, portable Backup/Import, operational recovery, campaign-health verification, persistence-evolution safeguards, and CI/release/recovery documentation.

### M3 — Core Campaign Model

**COMPLETE**

Established the campaign/player/Pact-seat foundation and core semantic command model.

### M4 — Shared Monthly Play Loop

**COMPLETE**

Established campaign lifecycle, month/lunar-phase flow, Orrery, Time and Engagement scheduling, Wizardmoot state, and shared play-shell behavior.

### Wizard Character Foundation

**COMPLETE**

Established stable `WizardId` identity independent of Pact-seat identity plus shared character-sheet state.

### M5.2B — Shared World Foundation

**COMPLETE**

Established shared Denizen, Isle, Place, and CompanionRelationship identities.

### M5.2C-H — Hierophant Structural Foundation

**COMPLETE**

Established Hierophant structural Domain state and shared World integration.

### M5.2C-M — Mariner Structural Foundation

**COMPLETE**

Established Mariner structural Domain topology/state and shared World integration.

### M5.2C-N — Necromancer Structural Foundation

**COMPLETE**

Established Necromancer Gates/Death structure, Foes, Allies, Ghoul-Callers, and related Domain state.

### M5.2D — Shared Wizard & Denizen State Foundation

**COMPLETE — PR #17 merged**

Established:

- Wizard rules mortality while preserving `WizardId`;
- Necromancer dead-Wizard traversal/Foe identity;
- individual Denizen mortality;
- shared Powerful-Denizen Taxonomy/Status/Goal/Methods/Truths;
- stable Treasure identity/custody;
- seat-keyed Pact-Fragment condition/custody;
- shared integration for Ghoul-Callers, Prophets, Cults, and Beasts.

### M5.2E — Faustian + Sage + Warlock Structural Foundations

**COMPLETE — PR #18 merged**

Final feature HEAD before merge:

`05b158ade8fcd1ca948321fe4a450af98e7d6694`

Final closure verified 113 test files / 2186 tests plus real disposable Convex/browser backup, refresh, realtime, Undo/Redo, and health-verifier integration.

Faustian established stable card/deck/community state, Schemes/Pawns/Accomplices, Machinations/Twists and persistent outcomes, Conspiracies/Antagonists/Demons, Devil obligations, Devil Treasure/Pact-Fragment integration, and the Devil as a narrow shared Time participant.

Sage established Laws of Dreaming, Destiny definitions/instances, ordered Destiny state, Wizard-or-Denizen subjects, Dreaming/Future conditions, Omens, Dreamscape identity, Cycles, Fairy/Druid overlays, and Lost-in-Dreams state.

Warlock established Laws, Ideologies, Clans, Clan Favor, stable Lord Titles, ordered Clan decks and King's Agenda, King/Family/Confidants, Errant Ladies, Authority, Garrisons, Armies/Heroes/Errant Nobles, Rebellions, Sage-Omen integration, and Market political overlays.

### Current-V5 Test Fixture

M5.2E added:

```ts
makeTestCampaignStateV5(
  overrides?: Partial<CampaignStateV5>
): CampaignStateV5
```

Ordinary tests needing an otherwise-valid current V5 state should prefer this helper. Exact schema/version/malformed-serialization tests should remain explicit.

### M5.2F — Sorcerer Structural Foundation

**COMPLETE — PR #20 merged**

Final feature HEAD before merge:

`1b2e94415b6d55b0241a774a19afb53271709f17`

Final deterministic closure reported:

- 116 test files;
- 2232 passed;
- 0 skipped;
- 0 failed;
- `tsc -b && vite build` passed;
- `git diff --check` clean;
- tracked working tree clean.

Real integration closure used a fresh disposable Convex Development deployment and verified Sorcerer initialization/idempotency, whole-state Undo/Redo, current-V5 serialization, realtime/refresh, typed cross-Domain references, portable backup export/import, and campaign-health validation.

Delivered:

- 8 Sorcerer Schools;
- 7 Laws of Magic;
- 10 Reagents;
- 9 source Alchemical Recipes;
- complete 58-spell Draft-4 static Grimoire reference catalog with stable `GrimoireSpellId`;
- Powerful-Denizen taxonomies for Arcanist, Construct, and Witch;
- narrow shared fungible Tome/Reagent custody for Tower or Wizard/Denizen holders;
- canonical Spyrholm/Tower/University World references;
- typed Research Positions spanning the Orrery and implemented Domains;
- Denizen-backed Researchers and Academics;
- authoritative Tower order;
- provenance-aware current/delayed Knowledge;
- Reliable/Disruptive Arcanist state using shared Powerful status;
- Arcane Construct persistent human-readable If/Then instructions;
- Innovations attached to stable Grimoire spell identity;
- Archives open/closed state;
- campaign-created Schools, Academic kinds, Recipes, and Knowledge methods;
- typed replacement of remaining Warlock/Sorcerer label placeholders;
- normal age-aware `initialize_sorcerer` command/event.

M5.2F deliberately did not introduce a generic inventory, actor/entity, spell-resolution, or multi-Domain-instance framework.

## Next Recommended Work

### M5.3 — Knowledge & Compendium

**IN PROGRESS**

Design is approved. Body A shared Lore structural foundation is implemented. Body B minimal `add_lore_entry` / `revise_lore_entry` operations are implemented. Final Workstream integration/closure verification is still pending.

M5.3 is **not complete**. CampaignState V5 remains **PRE-ACTIVATION**.

See `docs/m5-3-knowledge-compendium.md` for the durable contract.

The next shared foundation is persisted mutable Lore / Compendium state. The approved model distinguishes:

- source collections versus campaign-created collections;
- static Draft4/v1 baseline versus sparse overrides and ordered authored additions;
- stable first-use subject binding;
- derived Mariner Present/Silent/Absent/null context selection.

M5.3 should not absorb full spellcasting, broad UI, or every narrative note.

### M5.4 — Minimum Domain Operability & Board Views

**PLANNED**

After shared Lore exists, shift from structural foundations to practical use.

For each Domain:

- establish the smallest coherent semantic command/editing surface needed for normal maintenance;
- provide a useful owner/operator board or view;
- provide simpler non-owner/read presentation where it materially helps;
- avoid exhaustive command-by-command Codex automation;
- preserve table-resolved interpretation where the source expects it.

### M5.5 — Full-Pact Integration & Pre-V5-Activation Review

**PLANNED**

Exercise one representative seven-Domain campaign through realistic play-like use.

Goals:

- identify remaining representability gaps exposed by actual use;
- exercise cross-Domain references and normal editing;
- test role-aware views and the shared monthly flow;
- verify backup/recovery and refresh behavior at realistic state size;
- decide which deferred capabilities must be represented before V5 is frozen.

### CampaignState V5 Activation Gate

**NOT YET ACTIVATED**

After M5.5, explicitly decide whether valuable campaign state will be preserved under V5.

Do not activate/freeze V5 merely because structural modeling is complete.

The Master/human may deliberately keep V5 pre-activation through some or all of M6 if doing so meaningfully reduces unnecessary migration work and no valuable V5 data must yet be preserved.

### M6 — Magic & Complex Resolution

**PLANNED**

Build on the structural Grimoire/Tome/Reagent foundations to address deterministic and persistent parts of magic: spellcasting, Glyph/dice handling, Limits, Patient casting, Tome/Reagent use, Innovations in execution, persistent magical consequences, and relevant Witch/other-magic-user mechanics.

Do not mechanize narrative interpretation merely because a rule mentions magic.

### M7 — Campaign Usability & Multiplayer Ergonomics

**PLANNED**

Product-level usability work including campaign setup/onboarding, efficient navigation, role-aware views, Watcher handoffs, fewer-player play, secret/revealed information presentation, tablet/desktop ergonomics, accessibility, interaction consistency, and session-flow friction reduction.

### M8 — Production Readiness

**PLANNED**

Final hardening for trusted long-running campaigns: deployment/environment safety, observability, performance, accessibility/cross-browser review, production permissions/security appropriate to the application, migration/recovery rehearsal for the active schema, backup/recovery UX, and release readiness.

## Explicit Pre-V5-Activation Architecture Review Items

These are intentional deferrals, not forgotten requirements.

### Additional Wizards / Multiple Towers / Multiple Domain Instances

SOURCE permits additional Wizards and specifically permits an additional Sorcerer with his own Tower, Researchers, Students, and Time.

Current architecture intentionally does not generalize all Domains into arbitrary instances.

Before V5 activation/freeze, explicitly decide whether this source-valid capability must be representable while incompatible V5 changes are still cheap.

Do not solve it casually with duplicated Wizard/Denizen identity, `GenericGameEntity`, or a generic TTRPG Domain-instance system.

### Wicker-Ways

Persistent Wicker-Doors/Paths are source-valid durable state spanning travel and magic. They were deliberately deferred from Sorcerer structural work because they require a shared travel/magic design.

### Pact-Law Sanctions / Anathema

Pact-Law procedures can create durable consequences involving Wizards, Time, Treasures, Pact-Fragments, magical suppression, and similar state.

Do not create a Sorcerer-local legal-case subsystem.

### Other Full-Pact Representability Gaps

M5.5 exists partly to discover these through realistic integrated use rather than repeated speculative whole-source audits.

## Important Persistence Model

The application is **not event-sourced**.

Current `CampaignState` is authoritative. Events explain/audit changes. Snapshots provide history and recovery.

Clients send intent; the server computes authoritative resulting state.

Normal gameplay writes go through canonical transactional persistence.

Every accepted gameplay revision receives a complete snapshot.

Undo/Redo restores complete snapshots rather than applying inverse operations.

Checkpoint Restore and Backup Import create new audit revisions rather than rewriting history.

Portable app backups contain complete current CampaignState.

Convex operational exports remain the full-fidelity deployment disaster recovery mechanism.

Persisted inconsistencies fail closed.

## CampaignState V5 Pre-Activation Policy

CampaignState V5 remains **PRE-ACTIVATION**.

While all V5 persisted artifacts are explicitly disposable, V5 may evolve in place.

Schema versions represent meaningful persisted compatibility epochs, not every field, Domain, or Workstream.

Therefore:

- do not create V6 merely because another M5 capability adds state;
- do not build compatibility shims for discarded pre-activation V5 shapes;
- do not silently migrate persisted state;
- do not assume an environment remains disposable without fresh confirmation before destructive work.

V5 becomes activated/frozen only when the Master/human explicitly declares it so or valuable preserved campaign artifacts make that policy necessary.

After activation, incompatible changes require explicit compatibility and migration analysis.

## Architecture Boundary

Prefer generic persistence mechanics and specific Seven-Part-Pact domain modeling.

Do not prematurely generalize the application into a generic TTRPG framework.

Generalize only when multiple real Seven-Part Pact systems share the abstraction or a second concrete consumer demonstrates genuine reuse.

## State Safety

Loss or corruption of campaign state is the application's highest technical risk.

Preserve authoritative CampaignState, server-authoritative results, canonical transactions, complete snapshots, immutable audit, fail-closed validation, command idempotency, whole-state Undo/Redo, valid checkpoints/backups/recovery, and explicit schema evolution.

Do not weaken persistence, recovery, concurrency, migration, or corruption verification to reduce AI usage or wall-clock time.

## Testing Principle

Automate deterministic behavior.

Use focused tests during implementation and full deterministic gates at meaningful phase/Workstream closure boundaries.

Manual verification should prove only unique integration boundaries that in-memory tests cannot fully establish, such as real Convex serialization, true concurrency, realtime/refresh, browser file download/upload, deployment wiring, and realistic migration rehearsal when a migration actually exists.

Do not manually replay large automated matrices.

## Implementation / Agent Workflow

Cursor is the primary implementation worker.

The active Workstream directs Cursor; the Master normally does not.

Structural work should optimize for representability, bounded repository search topology, coherent execution bodies, and proportional testing rather than command-by-command micro-slicing.

See `AGENT_WORKFLOW.md` for complete rules.
