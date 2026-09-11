# Seven-Part Pact App Roadmap

## Roadmap Status

This roadmap supersedes the earlier provisional M3+ outline.

The project has completed its persistence/core-play foundations and all seven Wizard Domain structural foundations. The next phase moves from representability toward shared Lore, practical Domain operability, realistic full-Pact use, complex magic, usability, and production readiness.

The roadmap describes dependency order and milestone intent. Exact Workstream boundaries remain subject to Master/human approval as source and repository evidence develops.

## Guiding Principles

- Preserve CampaignState safety over convenience.
- Keep clients intent-driven and server results authoritative.
- Preserve canonical transactions, complete snapshots, immutable audit, idempotency, fail-closed validation, whole-state Undo/Redo, backups, checkpoints, and recovery.
- Distinguish structural representability from command automation and UI.
- Automate deterministic bookkeeping; preserve table interpretation where the game expects human judgment.
- Prefer specific Seven-Part-Pact models over generic TTRPG abstractions.
- Use the V5 pre-activation window deliberately; do not create unnecessary compatibility/migration burden while current V5 artifacts remain disposable.
- Use realistic integrated play to discover remaining representability gaps rather than repeatedly performing speculative exhaustive audits.

---

## M1 — Realtime Foundation

**STATUS: COMPLETE**

Established the initial realtime shared campaign/Orrery foundation.

---

## M2 — Persistence Foundation

**STATUS: COMPLETE**

Tag: `v0.2-persistence-foundation`

Established the canonical persistence architecture:

- authoritative current CampaignState;
- transactional gameplay writes;
- monotonic revisions;
- immutable audit events;
- complete snapshots;
- idempotent commands;
- Undo/Redo;
- Checkpoints/Restore;
- portable Backup/Import;
- operational recovery;
- campaign-health verification;
- schema-evolution safeguards.

---

## M3 — Core Campaign Model

**STATUS: COMPLETE**

Established the campaign, Player/Pact-seat, core shared identity, and semantic command foundation.

---

## M4 — Shared Monthly Play Loop

**STATUS: COMPLETE**

Established the shared month lifecycle and table loop, including Orrery, lunar phases, Time, Engagements, Wizardmoot, and shared play-shell behavior.

---

## M5 — Seven-Part-Pact World and Domain Systems

### Wizard Character Foundation

**STATUS: COMPLETE**

Established stable Wizard identity and shared character-sheet state.

### M5.2B — Shared World Foundation

**STATUS: COMPLETE**

Established shared Denizens, Isles, Places, and CompanionRelationships.

### M5.2C-H — Hierophant Structural Foundation

**STATUS: COMPLETE**

### M5.2C-M — Mariner Structural Foundation

**STATUS: COMPLETE**

### M5.2C-N — Necromancer Structural Foundation

**STATUS: COMPLETE**

### M5.2D — Shared Wizard & Denizen State Foundation

**STATUS: COMPLETE**

PR #17 merged.

Established shared mortality, Powerful-Denizen, Treasure, Pact-Fragment, and related cross-Domain foundations.

### M5.2E — Faustian + Sage + Warlock Structural Foundations

**STATUS: COMPLETE**

PR #18 merged.

Established structural CampaignState foundations for Faustian, Sage, and Warlock plus required narrow shared integrations.

### M5.2F — Sorcerer Structural Foundation

**STATUS: COMPLETE**

PR #20 merged.

Final feature HEAD before merge:

`1b2e94415b6d55b0241a774a19afb53271709f17`

Established the final Wizard Domain structural foundation, including Sorcerer Tower/Research/Knowledge state, stable Grimoire spell references, typed cross-Domain Research Positions, shared Powerful Arcanist/Construct/Witch taxonomies, and narrow shared Tome/Reagent custody.

**Milestone consequence:** all seven Wizard Domains now have structural CampaignState representation.

---

## M5.3 — Knowledge & Compendium

**STATUS: IN PROGRESS**

Design approved. Body A structural foundation is implemented. Body B minimal add/revise operations are implemented. Final Workstream integration/closure verification is still pending.

Do not mark M5.3 complete. Do not mark V5 activated.

See `docs/m5-3-knowledge-compendium.md`.

### Objective

Establish a shared durable model for mutable Lore/Compendium knowledge that is used across actual Seven-Part-Pact systems rather than hidden in Domain-local notes.

### Approved contract

- Campaign `ruleset.id/version` is the sole persisted source-Lore baseline identity.
- No staged source-entry activation.
- Source collections and campaign-created collections remain distinct.
- Stable first-use binding uses existing canonical IDs, never display labels.
- Mariner Present/Silent/Absent/null context selection is derived APPLICATION DESIGN.

### Boundaries

Do not make M5.3:

- a generic wiki;
- a generic knowledge graph;
- a generic notes platform;
- full Sorcerer Research automation;
- spellcasting;
- broad UI.

M5.3 should first close the shared state/semantic contract. Minimum editing UI may be included only when explicitly chartered.

---

## M5.4 — Minimum Domain Operability & Board Views

**STATUS: PLANNED**

### Objective

Turn the seven completed structural Domain models into practical table-facing tools without attempting exhaustive rules automation.

### Expected shape

For each Domain:

- define the smallest coherent semantic command/editor surface required for normal state maintenance;
- provide a useful owner/operator board or view;
- provide simpler non-owner/read presentation where useful;
- expose shared references coherently;
- preserve manual interpretation when the rules expect it.

### Explicit anti-goal

Do not implement every Codex action one command at a time.

A Domain is not incomplete merely because some narrative or table-resolved actions remain manual.

---

## M5.5 — Full-Pact Integration & Pre-V5-Activation Review

**STATUS: PLANNED**

### Objective

Run one representative seven-Domain campaign through realistic play-like use and make an explicit decision about remaining structural debt before valuable V5 data exists.

### Verify

- normal campaign setup;
- all seven Domain views/editing surfaces;
- cross-Domain references;
- shared monthly loop;
- role-aware normal-use visibility;
- refresh/realtime behavior;
- realistic state-size performance;
- backup/export/import;
- Undo/Redo;
- checkpoints/recovery/health verification where appropriate.

### Architecture review

Explicitly review source-valid deferred capabilities that may be expensive to add after schema activation:

- additional Wizards;
- additional Sorcerers/Towers;
- arbitrary/multiple Domain-instance implications;
- Wicker-Ways;
- Pact-Law sanctions/anathema;
- any other representability gap exposed by realistic integrated use.

Do not implement every exotic rule merely because it appears in source. Decide which capabilities need representability before V5 freeze.

---

## CampaignState V5 Activation Gate

**STATUS: PRE-ACTIVATION**

This is an explicit decision gate, not an automatic milestone transition.

Before V5 is activated/frozen:

1. perform the M5.5 integrated review;
2. revisit known pre-activation architecture items;
3. decide whether any incompatible representation change should be made while V5 artifacts are still disposable;
4. decide whether the project is ready to preserve valuable campaign state/backups/checkpoints.

If the project proceeds directly into M6 and no valuable V5 campaign data needs preservation, the Master/human may deliberately keep V5 pre-activation longer to avoid unnecessary migration work.

Once V5 is activated/frozen, incompatible changes require explicit schema evolution and migration analysis.

---

## M6 — Magic & Complex Resolution

**STATUS: PLANNED**

### Objective

Implement the software-helpful portions of magic and other complex resolution on top of the established Domain/Lore foundations.

### Expected areas

- spellcasting flow;
- Grimoire spell identity/selection;
- Glyph/dice mechanics;
- Limits;
- Patient casting;
- Tome/Reagent use;
- Innovation interaction;
- persistent magical consequences;
- Witches/other magic-users where necessary;
- complex deterministic resolution that benefits from software.

### Boundary

Do not turn narrative Impact or Celestial Audience judgment into rigid automation unless the written rules genuinely define deterministic behavior.

---

## M7 — Campaign Usability & Multiplayer Ergonomics

**STATUS: PLANNED**

### Objective

Make the whole product comfortable for sustained real-table use.

Likely areas:

- campaign setup/onboarding;
- navigation across shared and Domain state;
- role-aware owner/non-owner views;
- Watcher role handoffs;
- fewer-player support;
- secret/revealed information presentation;
- scene/session flow;
- tablet/desktop ergonomics;
- accessibility;
- interaction consistency;
- reducing clicks and bookkeeping friction.

Normal-use visibility is in scope.

An adversarial player-vs-player security model or a particular authentication mechanism is not implied unless later requirements establish one.

---

## M8 — Production Readiness

**STATUS: PLANNED**

### Objective

Harden the application for trusted long-running campaigns.

Likely areas:

- production environment/deployment controls;
- observability/diagnostics;
- performance;
- accessibility/cross-browser verification;
- production permissions/security appropriate to the product;
- migration/recovery rehearsal for the active schema;
- backup/recovery UX;
- operational runbooks;
- release/readiness review.

---

## Current Next Action

Continue **M5.3 — Knowledge & Compendium**.

Design is approved. Body A and Body B are implemented. Final Workstream integration/closure verification is still pending. Do not mark M5.3 complete. Do not mark V5 activated.
