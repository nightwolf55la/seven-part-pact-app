# Seven-Part Pact App Roadmap

## Roadmap Status

This roadmap supersedes the earlier provisional M3+ outline.

The project has completed its persistence/core-play foundations, all seven Wizard Domain structural foundations, and the shared M5.3 Lore/Compendium foundation. M5.4 active-table Domain operability is in progress at a deliberate pace, with Lore/Compendium UX, Sorcerer operability, Hierophant + Necromancer Temples/Gates operability, Mariner Interactive Map & Operability, and Faustian Bodies A–D merged. M5.4 Table-Readiness UI/UX Batch 2 is merged (PR #29) and retired. M5.4-2F Faustian table-readiness is merged (PR #32) and **HUMAN VERIFIED / ACCEPTED** for its tranche; follow-up Faustian UX-refinement is approved as continued refinement. **M5.4-2H Hierophant Steer / Benefaction is complete** and ready to merge. The former minimum table-readiness deadline posture is no longer the active optimization target. Domain UX-refinement Workstreams (Mariner, Necromancer, Faustian, and later Hierophant UX-refinement) may run in parallel on separate Domain-local branches after this merge. Cross-Domain UX is handled separately. Warlock and Sage remain deferred unless the human changes priority. CampaignState V5 remains PRE-ACTIVATION.

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

Current UX-refinement direction (post table-readiness deadline relaxation):

- Domain surfaces should aim for genuinely pleasant sustained use, not merely minimum table usability;
- common/repeated actions remain the highest priority;
- important play state should be zero-click where practical;
- prefer board/card/piece interaction over database/editor interaction;
- direct manipulation, hierarchy, feedback, spacing, density, discoverability, responsive presentation, and visual polish are legitimate current work;
- prior **HUMAN VERIFIED / accepted** work is not reopened without concrete reason, but acceptance does not prohibit further improvement;
- M5.4 is in progress without "table readiness" as a deadline or binary completion target.

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

Deliberately deferred automation includes complete Sermon, Holiday celebration, Rebuff, automatic 5+ Souls -> Foe, compound Ghoul-Caller creation, Clear Hostility + Lore, and broad monthly procedure automation. **Steer and Benefaction & Depart were later delivered in M5.4-2H.** Hestar conversion remains an unresolved source contradiction rather than application canon.

See `docs/m5-4a-hn-temples-gates-operability.md`.

### M5.4A-M — Mariner Interactive Map & Operability

**COMPLETE — PR #26**

Branch `m5-4a/mariner-operability`; closure HEAD `4cdd52d`. Real Convex Development closure on `wry-boar-766` (`dev/m5-4a-mariner-closure`); no Production deployment. Persisted Mariner operability semantic events aligned in `convex/validators.ts`; representative `create_mariner_ship` integration verified.

No CampaignState schema or migration change. CampaignState V5 remains PRE-ACTIVATION.

Deliberately deferred: repeat-Ravage semantics; off-Horizon Beast movement (table-resolved per SOURCE).

### M5.4A-F — Faustian Card Table & Operability

**COMPLETE / READY FOR PR.**

Branch `m5-4a/faustian-card-table`. Base `ba32e19cafea37e148eb9bb3f0dc8db56625941f`. Deterministic code HEAD after the Workstream empty-direct-set fix: `fd011937d3413b728467f65067f48acb10772dc7`.

Delivered the Faustian card table, A/B review corrections, approved in-place PRE-ACTIVATION V5 pending-challenge and due-month obligation foundation, Body C lifecycle, and Body D typed Advanced / Correct Table coverage. Post-overnight audit corrected Two Pair / Three of a Kind table assignment and immediate Twist disposition / Full House rank derivation. Multiple local Accomplices now require a nonempty explicit direct set. Deterministic gate: 140 files / 2660 tests. Real Convex Development closure succeeded on disposable `dev/m5-4a-f-closure` (`patient-pheasant-353`); campaign `cmp_cc1e3585-c833-4078-a5a4-ea8a53e4f326` revision 0 → 51 with pending-challenge, due-month, replay, Undo/Redo, checkpoint, backup/import, health, and browser-refresh proofs. CampaignState V5 remains PRE-ACTIVATION. Do not mark all of M5.4 complete.

See `docs/m5-4a-f-faustian-card-table.md`.

### M5.4 Table-Readiness UI/UX — Batch 1

**MERGED — NEEDS HUMAN RETEST.** PR #28. Do not mark VERIFIED or complete.

Branch `m5-4/table-readiness-ux-batch-1`. See `docs/m5-4-table-readiness-ux.md`.

### M5.4 Table-Readiness UI/UX — Batch 2

**MERGED — RETIRED WORKSTREAM.** PR #29. Implementation, deterministic closure, real Convex cloud Preview integration, 2026-09-18 Mariner direct-manipulation human retest, and 2026-09-19 remaining visual/layout human retest are complete on `main`. UX-025 remains intentionally partial because Map Stability and prevailing Wind are unencoded. CampaignState V5 remains PRE-ACTIVATION. No schema migration. No Production. Do not mark all of M5.4 complete.

Branch `m5-4/table-readiness-ux-batch-2` (merged). See `docs/m5-4-table-readiness-ux.md`.

Full-screen desktop canvas, source-inspired live Mariner and Gates boards, overlay inspector, compact Depth, sticky Compendium pane, Mariner direct board manipulation. Human 2026-09-18 Mariner interaction retest verified UX-024 and UX-026 plus the related Market/Beast/Ship/Raider/pointer-lifecycle work. Human 2026-09-19 remaining visual/layout acceptance verified UX-004, UX-009, UX-010, UX-016, UX-017, UX-018, and UX-022. Real Convex cloud Preview integration is complete on preview `m5-4/table-readiness-ux-batch-2` / `dependable-loris-864` (not Development, not Production). UX-025 remains PARTIALLY ADDRESSED (Stability/Wind unencoded). UX-005/006/011/015/020/021 remain later work.

### M5.4-2F — Faustian Table-Readiness

**MERGED / RETIRED FOR THIS TRANCHE.** PR #32.

**HUMAN VERIFIED / ACCEPTED FOR THIS M5.4 TABLE-READINESS TRANCHE.** Makes Faustian table-ready for common play on top of the prior M5.4A-F card-table/operability foundation. Broader Faustian UI/visual/layout polish remains later work. Do not describe overall Faustian UX as complete. Do not mark all of M5.4 complete.

Former branch `m5-4/table-readiness-ux-faustian`; feature HEAD before merge `b868c51953d49ab791fba02afb6f97210f57bfb5`; merge/`main` SHA `2777b051c9873f248c2b5486b35803edeacaa795`. No CampaignState/schema, persistence/recovery, or Convex command-registration change. CampaignState V5 remains PRE-ACTIVATION.

### M5.4-2H — Hierophant Steer Time, atomic Steer, and Benefaction

**COMPLETE / READY FOR MERGE.** Feature branch `cursor/hierophant-steer-time-2bde` off `m5-4/table-readiness-ux-hierophant`.

Approved in-place PRE-ACTIVATION V5 `TimeDestination` `{ kind: "hierophant_supplicant", denizenId }`, ordinary Planning scheduling onto a current Supplicant, atomic Steer, and explicit Benefaction & Depart. Woe 1 → 0 persists without automatic Benefaction. Real Convex cloud Preview proof on `cursor/hierophant-steer-time-2bde` / `perceptive-guineapig-864` (not Production). No V6. No migration. CampaignState V5 remains PRE-ACTIVATION.

See `docs/m5-4-2h-hierophant-steer-benefaction.md`. Do not continue this Workstream into Doctrine/Sermon, Cult departure, Hestar Provide, or general Hierophant polish. Do not mark all of M5.4 complete.

### Remaining active-table and UX-refinement work

Domain UX continuation is **Domain-specific**, not a giant UI/UX catch-all. Batch 2 is retired. M5.4-2F Faustian table-readiness is retired for its tranche with acceptance preserved. Multiple Domain-local UX-refinement Workstreams may run in parallel on separate branches when work stays predominantly Domain-local UI/presentation/interaction (see `AGENT_WORKFLOW.md`).

- **Hierophant UX/operability Workstream: COMPLETE for M5.4-2H.** Visions V1 **HUMAN VERIFIED**. Hestar transfer, typed Supplicant Time, atomic Steer, and explicit Benefaction & Depart are delivered. Cult departure blocked on unresolved Cult semantics. Do not continue this branch into Doctrine/Sermon, Hestar Provide, or general Hierophant polish.
- **Mariner: NEW dedicated UX-refinement Workstream.** Continue from verified Batch-2 source-board/direct-manipulation baseline; do not restart old Mariner UI. UX-025 Stability/Wind is known partial work, not the entire scope.
- **Necromancer: NEW dedicated UX-refinement Workstream.** Continue from post-Batch-2 Gates board; focus on common-play interaction and presentation friction.
- **Faustian: NEW follow-up UX-refinement Workstream approved.** M5.4-2F acceptance preserved; continued refinement from merged source-shaped card table—do not rebuild.
- **Cross-Domain UX** (deferred UX-005 / UX-006 / UX-011 / UX-015 / UX-020 / UX-021 and related shared conventions) remains separate, not opportunistically assigned to Domain branches.
- **Warlock and Sage** remain deferred unless the human changes priority.

Warlock and Sage are intentionally deferred while they have no active players.

Hierophant, Necromancer, Mariner, and Faustian Body A consume derived Sorcerer Researcher presence without duplicating placement state.

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

Do not rush M5.5 solely because old minimum-operability checkpoints can be checked. Integrated review is most useful once major active surfaces are mature enough to expose deeper representability and integration issues.

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
- whether the Mariner undescribed-Rarity sentinel remains durable representation or is replaced with a typed description-pending state while migration remains controlled;
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

Faustian M5.4A-F is merged (PR #27). M5.4 Table-Readiness UI/UX Batch 1 is merged (PR #28) and still needs **human retest**. Batch 2 is merged (PR #29) and retired as an implementation Workstream; Mariner direct-manipulation **HUMAN VERIFIED** (2026-09-18), remaining visual/layout **HUMAN VERIFIED** (2026-09-19), and real Convex cloud Preview integration on preview `m5-4/table-readiness-ux-batch-2` / `dependable-loris-864` are on `main`. M5.4-2F Faustian table-readiness is merged (PR #32) and **HUMAN VERIFIED / ACCEPTED FOR THIS M5.4 TABLE-READINESS TRANCHE**; broader Faustian polish remains later work. UX-025 remains PARTIALLY ADDRESSED (Stability/Wind unencoded). Do not mark all of M5.4 complete.

**M5.4-2H is complete / ready to merge.** After merge, start the new Hierophant, Mariner, Necromancer, and Faustian UX-refinement implementation branches from one shared post-merge `main` baseline. Cross-Domain UX remains separate. Warlock/Sage remain deferred unless the human changes priority. CampaignState V5 remains PRE-ACTIVATION. M5.4 is in progress without "table readiness" as a deadline or binary completion gate.

### Execution guidance

Prefer smaller coherent Cursor bodies for later M5.4 work. M5.4A-S demonstrated that large persistence-backed bodies can become 50–90 minute runs even when substantive; do not normalize that size.

Use bounded repository search topology, focused tests during implementation, one meaningful full repository gate at closure, and the smallest manual integration proof that exercises a unique boundary.

On Windows/PowerShell Convex closure, prefer JSON5/file-based CLI arguments early when quoting becomes fragile.
