# Seven-Part Pact App — Project Context

## Purpose

Build a shared web application supporting play of the tabletop RPG **Seven-Part Pact**.

The application assists the tabletop game rather than replacing its creative, interpretive, or narrative play. It should make persistent campaign state, Domain boards, shared references, recurring procedures, and table-facing bookkeeping easier to manage while preserving the judgment and authority of the Celestial Audience.

## Rules-aware assistance; table-authoritative legality

The Seven-Part Pact application is a rules-aware play aid, not a tabletop
rules-enforcement engine.

Written rules should make normal play easier through source-shaped defaults,
ordinary/legal-choice highlighting, known consequences, previews, bookkeeping,
and reminders.

The application generally should not refuse a gameplay action solely because it
differs from the default written procedure when the requested result is
representable and internally coherent.

Hard server validation remains authoritative for state/referential integrity,
stale writes, idempotency, unambiguous command meaning, deterministic command
consequences, destructive safety, representability, and persistence/recovery
correctness.

Gameplay legality outside those properties should normally be guidance rather
than mandatory attestations/blocking validation.

Known context should reduce player effort.
Do not require players to re-enter or certify context merely for provenance.
Do not fabricate missing gameplay context for immutable audit.

Apply prospectively / when concrete UX friction exposes a problematic
validator.
Do not perform a repository-wide validator relaxation.

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

As of September 20, 2026, **all seven Wizard Domains have structural CampaignState foundations**, M5.3 shared Lore/Compendium foundations are complete, and M5.4 active-table operability work is in progress. Lore/Compendium, Sorcerer, Hierophant, Necromancer, Mariner, and Faustian (M5.4A-F) operability Workstreams are complete. M5.4 Table-Readiness UI/UX Batch 2 is merged (PR #29) and retired as an implementation Workstream. M5.4-2F Faustian Table-Readiness is merged (PR #32) and complete for this table-readiness tranche; broader Faustian UI/visual/layout polish remains later work. Faustian is not a substitute for all of M5.4. Warlock and Sage remain deferred. CampaignState V5 remains PRE-ACTIVATION.

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

## Current Active Roadmap

### M5.3 — Knowledge & Compendium

**COMPLETE — PR #22 merged**

Established the shared persisted Lore/Compendium foundation while preserving CampaignState as authoritative current state rather than introducing event sourcing or a generic wiki/knowledge graph.

Delivered:

- fixed ruleset-bound source Lore catalogs plus sparse campaign overrides and ordered campaign additions;
- stable Lore collection/entry identity;
- typed Lore subjects grounded in Seven-Part Pact entities and source contexts;
- canonical `add_lore_entry` and `revise_lore_entry` commands/events;
- exact-current-text stale-write protection;
- source-baseline reset by removing redundant overrides;
- campaign-created Lore collections;
- derived Mariner owner/delegated Lore selection without automatic merge, transfer, reseed, fallback, or deletion;
- complete command/event coherence and current-state validation.

M5.3 deliberately did not add a generic notes platform, generic truth graph, generic ACL/known-by system, full Research automation, or spellcasting.

### M5.4 — Minimum Domain Operability & Board Views

**IN PROGRESS**

M5.4 moves the completed structural Domain models into practical table-facing use. Common actions should be understandable at a glance, expressed in game language, and available where the relevant board object naturally lives. Rare/unusual operations may use progressive disclosure, but legitimate persistent state must remain recordable without raw database access.

The physical Materials are the visual/spatial vocabulary, not a pixel-perfect browser specification. Digital boards should preserve the source mental model while improving readability, hit targets, responsiveness, contextual actions, and dynamic state presentation.

#### M5.4A-L — Lore & Compendium UX

**COMPLETE — PR #23 merged**

Delivered:

- first-class PlayShell Compendium;
- subject-oriented effective Lore browsing with human-readable labels and source attribution;
- search/shelf filtering and Changed/Added-in-play presentation;
- Printed wording comparison;
- canonical inline Add/Revise Lore UI with stale-edit draft preservation and explicit rebase;
- reusable `LoreContextPanel`;
- Necromancer Gate inspector as the first contextual Lore consumer;
- a presentation-oriented Lore read model/query without changing Lore persistence.

No CampaignState schema change or migration occurred.

See `docs/m5-4a-l-lore-compendium-ux.md`.

#### M5.4A-S — Sorcerer Operability & Tower Board

**COMPLETE — PR #24 merged**

Delivered the first major Domain-operability board:

- first-class Working Tower PlayShell surface;
- common canonical Sorcerer maintenance operations for recruiting/tutoring personnel, refocusing Researchers, Researcher availability, Tower-order correction, Knowledge adjustment, Archives, and narrow Tower/Wizard Tome-Reagent movement;
- atomic compound personnel creation rather than client-side Denizen/Sorcerer mutation chains;
- Tower-centered board presentation with Researchers grouped by typed external Research Position;
- provenance-aware current/delayed Knowledge UX;
- contextual Spyrholm/Tower Lore using M5.4A-L;
- bounded Advanced / Correct Board recording for already-represented Sorcerer state;
- pure derived external Sorcerer-presence projection for Researchers and Disruptive Arcanists;
- Orrery Researcher markers driven from authoritative Research Positions;
- no duplicated cross-Domain placement state.

Settled **APPLICATION DESIGN** for `towerOrder` is bottom-to-top:

`Students -> non-Student Academics -> Reliable Tower Arcanists`

with relative ordering flexible inside those bands. Tutor/Promote may rearrange the Academic portion; Reliable Arcanists remain separate at the top. Exact whole-Tower correction is advanced, not an ordinary always-visible action.

No CampaignState schema change or migration occurred. CampaignState V5 remains PRE-ACTIVATION.

See `docs/m5-4a-s-sorcerer-operability.md`.

#### M5.4A-HN — Temples & Gates Operability

**COMPLETE — PR #25**

Delivered the active-table Hierophant and Necromancer board pass:

- Hierophant Temple-board-first initialized surface with four ordinary Temples around distinct central Hestar;
- visible Courtyard/Agiary/unresolved Supplicant placement, Doctrine, Abundance, Conviction, Holidays, Supplicants, Prophets, Class/Woe/support state;
- atomic **Receive Supplicant** command creating the individual Denizen and Supplicant placement in one canonical server-authoritative write;
- Necromancer branching Gates topology preserved with readable Near/Far/Furthest depth, Void Beyond, Final Death, Soul tokens/counts, Foes, Allies, Ghoul-Callers, and explicit Hostile/Destroyed state;
- conspicuous 5+ Souls pending-resolution presentation without silently automating Foe creation;
- atomic **Transform Soul into Ally** command consuming one Soul and creating the individual Denizen + Ally at the same Gate in one canonical write;
- existing Temple/Gate `LoreContextPanel` integration;
- pure-derived Sorcerer Researcher presentation at the authoritative Temple and adjacent to Final Death, with explicit Working/Unavailable status;
- action drafts capture stale-write preconditions at action start so realtime changes reject stale intent instead of silently rebasing it;
- Advanced / Correct Board retains rare/correction recording without raw state editing.

No CampaignState schema change or migration occurred. Persistence, snapshots, audit, Undo/Redo, checkpoints, backup/recovery, and command-idempotency semantics remain unchanged. CampaignState V5 remains PRE-ACTIVATION.

Deliberate automation deferrals include complete Sermon, Steer Supplicant, Holiday celebration, Rebuff, automatic 5+ Souls -> Foe, compound Ghoul-Caller creation, atomic Clear Hostility + Lore, and broad monthly procedure automation. Hestar resource conversion remains an unresolved **SOURCE** contradiction between same-amount and half-amount conversion and is not application canon.

See `docs/m5-4a-hn-temples-gates-operability.md`.

#### M5.4A-M — Mariner Interactive Map & Operability

**COMPLETE — PR #26**

Branch `m5-4a/mariner-operability`; closure HEAD `4cdd52d`. Real Convex Development closure succeeded on disposable deployment `dev/m5-4a-mariner-closure` (`wry-boar-766`); no Production deployment. Closure repaired persisted Mariner operability event validators in `convex/validators.ts` and verified representative `create_mariner_ship` persistence through revision 18 on campaign `cmp_f06495fd-7675-405a-9b76-5b9157e78219`.

No CampaignState schema change or migration occurred. CampaignState V5 remains PRE-ACTIVATION.

Deliberately deferred: repeat-Ravage semantics; off-Horizon Beast movement remains table-resolved (SOURCE requires directional Lore change + Complication).

#### M5.4A-F — Faustian Card Table & Operability

**COMPLETE / READY FOR PR.**

Branch `m5-4a/faustian-card-table`. Verified base `ba32e19cafea37e148eb9bb3f0dc8db56625941f` (merged Mariner `ba32e19`). Isolated implementation worktree; review checkout and `wry-boar-766` were not modified.

Delivered the Faustian card table, A/B review corrections, approved in-place PRE-ACTIVATION V5 pending-challenge and due-month obligation foundation, Body C Scheme-occurrence / Twist / Machination lifecycle, and Body D typed Advanced / Correct Table coverage. Post-overnight audit corrected Two Pair / Three of a Kind table assignment and immediate Twist disposition / Full House rank derivation. Workstream review then required a nonempty direct Accomplice set when multiple locals exist (`fd01193`). Deterministic gate: 140 files / 2660 tests. Real Convex Development closure succeeded on disposable `dev/m5-4a-f-closure` (`patient-pheasant-353`) for campaign `cmp_cc1e3585-c833-4078-a5a4-ea8a53e4f326` (revision 0 → 51): pending One Pair challenge round-trip, due-month 1→2→1 with unchanged Time allocations, Twist and Scheme-fall replay without reroll, Undo/Redo, checkpoint restore, portable backup/import, valid campaign health, and Vite refresh persistence. Shared Time is not spent. Month advancement does not resolve challenges. Authoritative Faustian Codex material exists; application transcription remains deferred. CampaignState V5 remains PRE-ACTIVATION.

Do not mark all of M5.4 complete. Do not treat this Workstream as V5 activation.

See `docs/m5-4a-f-faustian-card-table.md`.

#### M5.4 Table-Readiness UI/UX — Batch 1

**MERGED — NEEDS HUMAN RETEST.** PR #28. Do not mark VERIFIED or complete.

Branch `m5-4/table-readiness-ux-batch-1`. Durable register: `docs/m5-4-table-readiness-ux.md`.

Source-shaped Wizard/Mariner/Hierophant geography realization, location-sensitive Necromancer Foe validation, source-shaped Gates setup, readable stale-precondition output, Pact-Fragment defaulting behind Advanced / Correct, Sorcerer establishment path, and a disposable seven-seat review campaign. No CampaignState schema change. UX-015 general Powerful-Denizen creation remains deferred.

#### M5.4 Table-Readiness UI/UX — Batch 2

**MERGED — RETIRED WORKSTREAM.** PR #29. Implementation, deterministic closure, real Convex cloud Preview integration, 2026-09-18 Mariner direct-manipulation human retest, and 2026-09-19 remaining visual/layout human retest are complete on `main`. UX-025 remains intentionally partial because Map Stability and prevailing Wind are unencoded. CampaignState V5 remains PRE-ACTIVATION. No schema migration. No Production. Do not mark all of M5.4 complete.

Branch `m5-4/table-readiness-ux-batch-2` (merged). Durable register: `docs/m5-4-table-readiness-ux.md`.

Full-screen desktop play canvas (~1800px), source-inspired live Mariner map and Necromancer Gates SVG, dismissible overlay inspector that does not resize the board, compact Necromancer Depth control, sticky Compendium reading pane, and Mariner direct board manipulation. No CampaignState schema change.

Human 2026-09-18 real-browser / real-pointer retest of the latest Mariner direct-manipulation work: "It all looked good." That verifies UX-024 Storm drag, UX-026 contextual/direct board actions, Market+Nest representable-conflict behavior, direct Beast/Market manipulation, Rare Market immediate placement, Ship/Raider sanity, pointer-lifecycle correction, Friendly/Nesting Beast relocation via `api.m3Commands.relocateMarinerNestingBeast`, and post-mutation board usability. UX-025 remains PARTIALLY ADDRESSED: implemented board presentation was exercised, but Map Stability and prevailing Wind remain unencoded.

Human 2026-09-19 remaining Batch-2 visual/layout acceptance: "Confirmed on all these." That verifies UX-004, UX-009, UX-010, UX-016, UX-017, UX-018, and UX-022. Batch 1 issues remain FIXED — NEEDS HUMAN RETEST. UX-005/006/011/015/020/021 remain later work.

Real Convex cloud Preview integration is complete on preview `m5-4/table-readiness-ux-batch-2` / `dependable-loris-864` (not Development, not Production): disposable campaign `cmp_42854d1b-c91b-4c03-90db-522ad6fc4665`, directional Raider create, atomic Rare Market move, Nesting-Beast Isle→Isle relocation, authoritative readback, one idempotent replay, and `verifyMigration` valid at revision 7.

#### M5.4-2F — Faustian Table-Readiness

**MERGED / COMPLETE FOR THIS TABLE-READINESS TRANCHE.** PR #32.

**HUMAN VERIFIED / ACCEPTED FOR THIS M5.4 TABLE-READINESS TRANCHE.** Broader Faustian UI/visual/layout polish is explicitly still needed later. Do not describe overall Faustian UX as complete. Do not mark all of M5.4 complete.

Former branch: `m5-4/table-readiness-ux-faustian`

Feature HEAD before merge: `b868c51953d49ab791fba02afb6f97210f57bfb5`

Merge/`main` SHA: `2777b051c9873f248c2b5486b35803edeacaa795`

This is a later table-readiness layer on top of the prior M5.4A-F card-table/operability foundation. It does not replace that history.

Delivered for common play:

- physical/source-shaped Faustian table as the primary play surface;
- improved zero-click primary-state readability;
- Devil Deck → Community Scheme placement;
- Faustian Deck → Community Blackmail;
- object-attached common actions;
- visible Accomplice prevention feedback;
- visible Investigation → choose Scheme to foil flow;
- card inspector / Accomplice presentation improvements;
- private Twist inspection;
- concealed-information protection;
- richer disposable review/demo state.

Closure evidence:

- `npm test`: 149 files / 3006 tests passed;
- `npx tsc -b` passed;
- `npx vite build` passed;
- `git diff --check` clean;
- Faustian review-fixture 52-card partition 4/4;
- independent review: Critical 0, Important 0;
- no CampaignState/schema, persistence/recovery, snapshots, Undo/Redo, backups/checkpoints, or Convex command-registration change.

Preserved future Faustian semantic decisions/debts:

1. Empty Devil Deck → forced Machinations: SOURCE requires the appropriate Machinations consequence when Scheme placement is required and the Devil Deck is empty. The current semantic command rejects insufficient deck. Correct future implementation requires one server/shared semantic operation, not client-chained correction/lifecycle mutations.
2. Safe Accomplice Community A → Community B drag: desired future interaction. The current Direct command live-resolves source Community and lacks sufficient captured expected source/state. Context-menu Direct remains the safe implementation.
3. Source transcription: Scheme Card Meanings and Accomplice role/syndicate prose remain untranscribed; cautious fallback wording is intentional.

Nonblocking deferred UX/minor debt:

- table-action pending is not a hard mutex;
- review fixture/live-demo pending-One-Pair mismatch;
- disposable sequential review seeding can partially fail;
- Investigate local foil chrome can stale while server rejects stale intent;
- thin explicit in-flight duplicate-command coverage;
- context-menu keyboard navigation;
- empty Devil Deck Place Scheme disable;
- unused `schemeSupplyDragPayload` helper;
- broader Faustian visual/layout polish;
- shared PlayShell Current Phase width pressure.

No Production deployment. CampaignState V5 remains PRE-ACTIVATION.

#### Remaining M5.4 active-table work

Table-readiness continuation is **Domain-specific**, not another giant UI/UX catch-all Workstream. Batch 2 is retired. M5.4-2F Faustian table-readiness is retired for this tranche.

Planned / active table-readiness topology:

- **Hierophant-specific** table-readiness Workstream: **ACTIVE**; successfully rebased onto the prior post-Batch-2 `main` and now working on its approved semantic table-readiness body. Do not claim it is merged.
- **Faustian-specific** table-readiness Workstream: **MERGED / RETIRED FOR THIS TRANCHE** (PR #32). Broader Faustian UI/visual/layout polish remains later work.
- **Mariner-specific** table-readiness Workstream: **NEXT**; initial focused review/design should continue from the verified Batch-2 source-board/direct-manipulation baseline. UX-025 remains partial: Map Stability and prevailing Wind unencoded.
- **Necromancer-specific** table-readiness Workstream: **PLANNED** after Mariner.
- **cross-Domain UX** (deferred UX-005 / UX-006 / UX-011 / UX-015 / UX-020 / UX-021 and related shared conventions) remains separate from Domain table-readiness;
- **Warlock and Sage** remain deferred while they have no active players.

Warlock and Sage are intentionally deferred while they have no active players. Their existing structural state remains authoritative and may be consumed by active-Domain cross-references.

Hierophant, Necromancer, Mariner, and Faustian Body A consume derived Sorcerer Researcher presence without duplicating placement state.

The editable/vector source `Patreon Materials [04.26.04].pptx` is available for board work. It should be treated as a vector/spatial design source rather than an implementation specification. It is especially useful for the Mariner map/geography and Faustian card-table presentation.

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

Do not activate/freeze V5 merely because structural modeling or individual M5.4 Workstreams are complete.

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

### Current Next Action

Faustian M5.4A-F is merged (PR #27). M5.4 Table-Readiness UI/UX Batch 1 is merged (PR #28) and still needs **human retest**. Batch 2 is merged (PR #29) and retired as an implementation Workstream; **Mariner direct-manipulation HUMAN VERIFIED** (2026-09-18), remaining visual/layout **HUMAN VERIFIED** (2026-09-19), and **real Convex cloud Preview integration** on preview `m5-4/table-readiness-ux-batch-2` / `dependable-loris-864` are recorded on `main`. M5.4-2F Faustian Table-Readiness is merged (PR #32) and **HUMAN VERIFIED / ACCEPTED FOR THIS M5.4 TABLE-READINESS TRANCHE**; broader Faustian UI/visual/layout polish remains later work. UX-025 remains PARTIALLY ADDRESSED (Map Stability / prevailing Wind unencoded). Do not mark all of M5.4 complete.

The current active implementation Workstream is Hierophant-specific table-readiness (rebased onto the prior post-Batch-2 `main`; not merged). Mariner is the next Domain-specific table-readiness body; Necromancer follows. Cross-Domain UX remains separate. Warlock/Sage remain deferred. CampaignState V5 remains PRE-ACTIVATION.

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

### Mariner undescribed-Rarity sentinel

Current Mariner Market shape remains `{ present: false } | { present: true, rarity: string | null }`. Batch 2 uses one reserved application sentinel (`__7PP_APP_UNDESCRIBED_MARINER_RARITY_V1__`) as pre-activation metadata meaning "Market is Rare, but fictional Rarity description has not yet been supplied."

Before V5 activation, explicitly decide whether the Mariner undescribed-Rarity sentinel becomes durable representation or is replaced with a typed description-pending state while migration remains controlled.

Do not treat a migration as approved now.

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
