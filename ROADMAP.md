# Seven-Part Pact App Roadmap

## Roadmap Status

This roadmap supersedes the earlier provisional M3+ outline.

The project has completed its persistence/core-play foundations, all seven Wizard Domain structural foundations, and the shared M5.3 Lore/Compendium foundation. M5.4 active-table Domain operability is now in progress, with Lore/Compendium UX, Sorcerer operability, and the Hierophant + Necromancer Temples/Gates operability Workstream complete. Mariner and Faustian remain in the active tranche.

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

**STATUS: COMPLETE**

PR #22 merged.

### Delivered

Established the shared persisted Lore/Compendium foundation used by Domain boards and later magic/research consumers:

- fixed ruleset-bound source Lore catalogs;
- sparse source overrides plus ordered campaign additions;
- stable Lore collection and entry identity;
- typed Lore subjects grounded in Seven-Part Pact entities/contexts;
- canonical add/revise commands with stale-current-text protection;
- campaign-created Lore collections;
- derived Mariner owner/delegated context selection;
- complete validation, fingerprinting, snapshots, audit, and idempotency through the existing persistence model.

### Boundaries retained

M5.3 did not become a generic wiki, knowledge graph, notes system, truth graph, ACL framework, full Research engine, or spellcasting system.

---

## M5.4 — Minimum Domain Operability & Board Views

**STATUS: IN PROGRESS**

### Objective

Turn the completed structural Domain models into practical table-facing tools without attempting exhaustive rules automation. Common interactions should feel like manipulating a Seven-Part Pact board rather than editing normalized records.

### Product direction

For common behavior:

- important state should be understandable at a glance;
- common actions should use game language and live where the relevant object naturally appears;
- compound tabletop actions should be one server-authoritative semantic operation rather than client-side mutation chains;
- source Materials provide visual/spatial vocabulary, but digital boards may improve layout, hit targets, responsiveness, contextual actions, and dynamic presentation;
- rare/unusual state may use progressive disclosure but must remain recordable without raw database access.

### M5.4A-L — Lore & Compendium UX

**STATUS: COMPLETE**

PR #23 merged.

Delivered:

- first-class PlayShell Compendium;
- subject-oriented effective Lore browsing;
- search/shelf filtering;
- Changed/Added-in-play and Printed wording presentation;
- inline canonical Add/Revise flows with stale-edit draft preservation;
- reusable `LoreContextPanel`;
- Necromancer Gate contextual Lore integration;
- presentation-oriented Lore read model/query without persistence changes.

See `docs/m5-4a-l-lore-compendium-ux.md`.

### M5.4A-S — Sorcerer Operability & Tower Board

**STATUS: COMPLETE**

PR #24 merged.

Delivered:

- first-class Working Tower PlayShell surface;
- canonical common Sorcerer maintenance operations;
- atomic personnel recruitment/promotion/refocus workflows;
- Tower-centered board with ordered occupants and Researcher outposts;
- provenance-aware Knowledge UX;
- bounded Tower/Wizard Tome-Reagent movement;
- contextual Spyrholm/Tower Lore;
- Advanced / Correct Board support for already-represented rare Sorcerer state;
- pure derived cross-Domain Sorcerer presence for Researchers and Disruptive Arcanists;
- Orrery Researcher markers driven from authoritative Research Positions.

Settled application Tower hierarchy is:

`Students -> non-Student Academics -> Reliable Tower Arcanists`

with relative ordering flexible inside those bands.

No CampaignState schema change or migration occurred. CampaignState V5 remains PRE-ACTIVATION.

See `docs/m5-4a-s-sorcerer-operability.md`.

### M5.4A-HN — Temples & Gates Operability

**STATUS: COMPLETE**

PR #25.

Delivered:

- Hierophant Temple-board-first initialized surface with distinct Hestar and readable Temple resources/people/state;
- atomic Receive Supplicant operation creating the backing Denizen + Supplicant placement in one canonical write;
- Necromancer Gates board retaining the branching spatial topology with readable Soul/Foe/Ally/Ghoul-Caller pieces and explicit Hostile/Destroyed state;
- atomic Transform Soul into Ally operation consuming one Soul and creating the backing Denizen + Ally in one canonical write;
- contextual Temple/Gate Lore reuse;
- pure-derived Sorcerer Researcher rendering on authoritative Temple/Final Death targets;
- stale-intent-safe action drafts that preserve captured preconditions across realtime updates;
- Advanced / Correct Board coverage for rare/correction operations.

No CampaignState schema change or migration occurred. CampaignState V5 remains PRE-ACTIVATION.

Deliberately deferred automation includes complete Sermon, Steer Supplicant, Holiday celebration, Rebuff, automatic 5+ Souls -> Foe, compound Ghoul-Caller creation, Clear Hostility + Lore, and broad monthly procedure automation. Hestar conversion remains an unresolved source contradiction rather than application canon.

See `docs/m5-4a-hn-temples-gates-operability.md`.

### Remaining active-table tranche

Remaining active-player Domain operability:

- Mariner;
- Faustian.

Warlock and Sage are intentionally deferred while they have no active players.

Hierophant and Necromancer now render authoritative derived Sorcerer Researcher presence locally without duplicating placement state. Mariner/Faustian should continue that pattern.

The editable/vector `Patreon Materials [04.26.04].pptx` is available as a design source and is especially valuable for the Mariner map/geography and Faustian card-table presentation.

### Explicit anti-goals

Do not turn M5.4 into:

- exhaustive Codex automation;
- a generic Domain-board framework;
- a generic Actor/GameEntity system;
- generic inventory;
- full spellcasting/Research automation;
- M7-scale whole-product ergonomics.

A Domain is not incomplete merely because narrative/table-resolved procedures remain manual.

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

M5.4A-HN is complete in PR #25. Merge/integrate PR #25 if not already merged and verify the resulting `main` SHA.

Then release **M5.4A-M — Mariner Interactive Map & Operability** as the next implementation Workstream from the newly merged main. Mariner design/geometry preparation is already substantially complete, including the editable-PPTX map-source investigation.

Continue Faustian design/preparation in parallel, but keep production implementation sequential: **HN -> Mariner -> Faustian**. Do not run Mariner and Faustian as competing implementation feature branches unless the Master explicitly changes that policy.

Warlock/Sage remain deferred. Do not mark M5.4 complete until Mariner and Faustian are complete and the Master/human explicitly decide how the deferred tranche is handled.

### Execution guidance

Prefer smaller coherent Cursor bodies for later M5.4 work. M5.4A-S demonstrated that large persistence-backed bodies can become 50–90 minute runs even when substantive; do not normalize that size.

Use bounded repository search topology, focused tests during implementation, one meaningful full repository gate at closure, and the smallest manual integration proof that exercises a unique boundary.

On Windows/PowerShell Convex closure, prefer JSON5/file-based CLI arguments early when quoting becomes fragile.
