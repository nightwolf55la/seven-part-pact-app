# M5.4A-HN — Temples & Gates Operability

**Status:** deterministic candidate plus morning UI correction; real integration and visual closure pending. Not Workstream complete; not M5.4 complete.
**Schema:** CampaignState V5 remains PRE-ACTIVATION. No CampaignState fields, no V6, no migration.
**Branch:** `m5-4a/temples-gates-operability`
**BASE_SHA:** `c4e8b9ae78537161878e4e3b16f2261c97dffc2b` (`origin/main`, matches inspected expectation)

## Approved scope

Required: Temple-board-first Hierophant surface; improved Necromancer Gates board; atomic Create Supplicant; atomic Transform Soul into Ally; exact read-only Sorcerer Researcher presentation; reused LoreContextPanel; accessibility; focused tests; separate H/N commits.

Conditional: Sermon, Steer, Holiday, Rebuff only if completeness gates pass.

Explicitly deferred regardless of spare time: Hestar Provide; automatic five-Souls-to-Foe; compound Create Ghoul-Caller / broad Prophet/Cult creation; atomic Clear Hostility + Lore; full monthly movement/Visions automation.

## Body checklist

| Body | Status |
|---|---|
| A Shared extraction | SKIPPED — Lore panel and Sorcerer projection already exist; no identical helper proven yet |
| B Hierophant | candidate committed `a5867e990452d1ca350ee890795b3a4a9245b6a3` — Temple board + atomic Receive Supplicant; Sermon/Steer/Holiday/Hestar deferred |
| C Necromancer | candidate committed `dbc14220f9d9d5c17644669710855227b3caffe8` — Gates board + atomic Transform Soul into Ally; Rebuff deferred |
| D Diff review + `npm run check` | deterministic candidate — 129 files / 2445 tests green; `tsc -b` + `vite build` green; visual/Convex pending |
| E Optional Mariner prep | SKIPPED — `Patreon Materials [04.26.04].pptx` is not in the repository |

## Source distinctions (conditional actions)

Inspected: existing H/N types, transitions, validation, and tests. No local H/N Codex/Materials PDFs/PPTX were required for the required board work. No `docs/` files named for Hierophant/Necromancer structural milestones.

### Sermon — DEFER

**SOURCE:** Sermon replaces Doctrine and costs one Abundance OR one Conviction per Supplicant. Insufficient Abundance causes Collapse; insufficient Conviction makes Doctrine Blasphemous. Collapse can entail Doctrine/Cult/Supplicant/Complication consequences. A Doctrine change at a Prophet's Temple can make that Prophet leave, become Disruptive, and create a Cult with the former Doctrine made Blasphemous. Blasphemous Temples cannot have Time spent there to change Doctrine or celebrate Holidays.

**INFERENCE:** Existing `updateTemple` / resource correction can record exact Doctrine/status/resources after the table resolves those outcomes, but they do not encode Sermon costs or insufficiency routes.

**APPLICATION DESIGN:** Completeness gate fails. No Collapse/Blasphemy/Prophet-leave/Cult-creation compound operation exists, and expanding a Cult/Collapse subsystem is not authorized. UI: source guidance plus exact Doctrine/resources correction tools. No "Give Sermon" button.

### Steer — DEFER

**SOURCE:** Steer moves one Supplicant to any Temple, including Hestar, then removes one Woe. Removing the last Woe makes the Supplicant depart and grants a class-based Benefaction (Gentry +4 Abundance; Merchant +2 Abundance; Artisan +1 Abundance; Peasant +1 Conviction; Pariah +2 Conviction). A Reliable Prophet modifies Abundance/Conviction production by an extra +1; stacking/batching is unsettled.

**INFERENCE:** `updateSupplicant` can change host/Woe independently; it is not Steer.

**APPLICATION DESIGN:** Completeness gate fails. No atomic movement + Woe reduction + last-Woe departure (role removal, not person deletion) + correct Benefaction/Prophet production. Custom-Class Benefactions and Prophet stacking remain unsettled. Do not relabel `updateSupplicant` as Steer.

### Holiday — DEFER

**SOURCE:** Holiday celebration grants the Temple each Supplicant's Benefaction and must honor settled production modifiers. It is not the ordinary departure rule.

**INFERENCE:** `setTempleHoliday` only records a holiday marker.

**APPLICATION DESIGN:** Completeness gate fails. Bare class summation ignoring Prophets is not acceptable; custom-Class Benefaction is unsettled. Keep Holiday markers prominent with base Benefaction *reference* values and a production-modifier reminder; retain resource recording labeled as recording/correction.

### Rebuff — DEFER

**SOURCE:** Rebuff moves all Foes, Allies and Souls present further into Death toward the next furthest Gate/appropriate terminal exit. Branch preferences differ by piece kind, Hostile Gates, Allies, and the Left-Hand Rule. Exits such as Final Death and the Void remove entering pieces. Valid persisted state may contain altered topology.

**INFERENCE:** Directed-step and occupiable-space helpers exist; they do not determine piece-kind branch choice, Left-Hand tie breaking, or terminal removal for arbitrary valid maps.

**APPLICATION DESIGN:** Completeness gate fails. No Left-Hand/Rebuff helper exists in repository types/tests. Do not invent a topology engine or a default-map-only button. Retain exact corrections.

### Hestar conversion — DEFER

**SOURCE conflict:** detailed text says the same amount; summary says half as much. No semantic Hestar provision operation. No selected ratio.

## Implemented command names

Recorded as implemented (Hierophant):

- `create_hierophant_supplicant` / `createHierophantSupplicant` / event `hierophant_supplicant_created`

Recorded as implemented (Necromancer):

- `transform_necromancer_soul_into_ally` / `transformNecromancerSoulIntoAlly` / event `necromancer_soul_transformed_into_ally`

## Time-recording boundary

APPLICATION DESIGN: these Domain operations record Domain results. Time is resolved in the shared Time workflow. UI copy must not imply Time was spent.

## Verification

### Body B (Hierophant)

Focused tests: 3 files / 29 tests — `npx vitest run tests/hierophantOperability.test.ts tests/hierophantViewModel.test.ts tests/hierophantSurfacePresentation.test.tsx --watch=false`

- Atomic `create_hierophant_supplicant` creates Denizen + Supplicant and emits one compound event.
- Rejects Hestar area, collapsed destination, unknown class/temple, invalid name/woe, duplicate ID, stale `expectedTempleStatus`.
- Ordinary-command harness: commit, replay, `COMMAND_ID_REUSED` on payload mismatch.
- Presentation: board-first default, no “Give Sermon” button, Advanced/Correct Board reachable, one mutation not `addSupplicant` chain, exact Krolis Researcher, other-Domain markers ignored.

H SHA: `a5867e990452d1ca350ee890795b3a4a9245b6a3`

### Body C (Necromancer)

Focused tests: 3 files / 62 tests — `npm test -- tests/necromancerOperability.test.ts tests/necromancerViewModel.test.ts tests/necromancerSurfacePresentation.test.tsx`

- Atomic `transform_necromancer_soul_into_ally` creates Denizen + Ally, decrements one Soul, sparse-omits zero.
- Rejects hostile/destroyed/missing/path/zero-soul/invalid name/duplicate/stale soul and Gate status; campaign Gate uses the same contract.
- Ordinary-command harness: one commit, replay without double consumption, payload mismatch rejected.
- Presentation: Roman/name Gate frames, Hostile/Destroyed text, bounded Soul beads, named pieces, five-plus warning, Final Death Researcher not on Terminus, one compound mutation, Rebuff not a working button.

N SHA: `dbc14220f9d9d5c17644669710855227b3caffe8`

`researcherOperationalLabel` is a duplicated one-line helper; Body A extraction remains skipped.

### Body D

Actual diff vs BASE_SHA `c4e8b9ae78537161878e4e3b16f2261c97dffc2b` reviewed. Feature range is 24 files, H then N commits plus this review-fix. No CampaignState/schema/migration edits. Both compound operations are wired through transition, fingerprint, events, validators, canonical map, Convex mutation, and UI. No Sermon/Steer/Holiday/Rebuff/Cleanse working buttons. Nested action buttons are not inside the Temple select control.

Deterministic gate (local binaries; `npm run check` classifier-blocked so equivalent `vitest run` + `tsc -b` + `vite build` used):

- Tests: 129 files passed, 2445 tests passed, 0 failed/skipped
- `tsc -b`: exit 0
- `vite build`: exit 0 (chunk-size warning only)

Visual review: pending. No isolated in-memory H/N board preview exists in-repo (`backup-preview` / `preview-indicator` are unrelated). Browser/Convex proof was not performed.

## Morning correction checkpoint

Bounded UI-local pass after Workstream review. No schema, persistence, command/event, or compound-transition changes.

Root cause: both new compound-action UIs mixed board selection with action start, and drafts reread live Temple/Soul/Gate preconditions at submit.

Corrections:

- Temple/Gate selection only inspects. Receive Supplicant and Transform Soul into Ally start only from the inspector controls.
- Each draft captures `commandId`, `denizenId`, target id, and the authoritative expected preconditions at explicit action start. Submit uses those captured values. Retry after mutation failure keeps the same ids and expecteds.
- Explicit Cancel clears the draft. Selecting another space does not. Starting the same action at another target keeps the unfinished draft and shows a concise unfinished-draft message.

Focused GREEN: `tests/hierophantSurfacePresentation.test.tsx` and `tests/necromancerSurfacePresentation.test.tsx` — 2 files / 26 tests. `npm run build` exit 0. `git diff --check` on the correction files exit 0.

Not done: browser visual inspection; disposable Convex proof; Workstream closure.

## Remaining morning checks

- Browser visual inspection (desktop and narrow)
- Fresh disposable Convex proof of compound writes, derived presence, Lore, refresh/realtime
- Do not mark M5.4 complete
