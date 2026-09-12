# M5.4A-HN — Temples & Gates Operability

**Status:** COMPLETE. Workstream closed after real disposable Development browser/Convex proof. Not all of M5.4 complete.
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
| D Diff review + `npm run check` | COMPLETE — closure gate 129 files / 2455 tests green; `tsc -b` + `vite build` green; real visual/Convex proof recorded below |
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

Visual review: completed against the disposable Development campaign below. No isolated in-memory H/N board preview exists in-repo (`backup-preview` / `preview-indicator` are unrelated).

## Morning correction checkpoint

Bounded UI-local pass after Workstream review. No schema, persistence, command/event, or compound-transition changes.

Root cause: both new compound-action UIs mixed board selection with action start, and drafts reread live Temple/Soul/Gate preconditions at submit.

Corrections:

- Temple/Gate selection only inspects. Receive Supplicant and Transform Soul into Ally start only from the inspector controls.
- Each draft captures `commandId`, `denizenId`, target id, and the authoritative expected preconditions at explicit action start. Submit uses those captured values. Retry after mutation failure keeps the same ids and expecteds.
- Explicit Cancel clears the draft. Selecting another space does not. Starting the same action at another target keeps the unfinished draft and shows a concise unfinished-draft message.

Focused GREEN: `tests/hierophantSurfacePresentation.test.tsx` and `tests/necromancerSurfacePresentation.test.tsx` — 2 files / 26 tests. `npm run build` exit 0. `git diff --check` on the correction files exit 0.

Closed by the integration/visual proof below. Morning correction SHA remains `ce0c77771599a0c3026705d9791e92f7e2cbf4af`.

## Integration / visual closure

**Status:** COMPLETE. CampaignState V5 remains PRE-ACTIVATION. All of M5.4 is not complete. Hestar source conflict remains unresolved. No schema, migration, persistence, recovery, audit, or Undo change. No new H/N copies of Sorcerer placement.

### Disposable Development deployment

- Purpose/name: `dev/m5-4a-hn-closure`
- Cloud slug: `dazzling-squid-340`
- Type: DEVELOPMENT / `dev` (`CONVEX_DEPLOYMENT=dev:dazzling-squid-340`)
- URL: `https://dazzling-squid-340.convex.cloud`
- Not Production, Preview, or an existing campaign environment
- Functions synced with `npx convex dev --once` only. Never `npx convex deploy`.
- Empty proof before seed: `verifyMigration` → `{ status: "no_canonical_campaign" }`

### Closure campaign

- Campaign ID: `cmp_8eb0c018-4ed1-403c-a3a4-a5b36de1f443`
- Starting revision before the two new H/N compound writes: **66**
- Final revision after Receive, Soul-count correction, accepted Transform, and one Temple Lore add: **70**
- Seeded only through existing public canonical commands (no raw inserts, temporary seed mutations, schema changes, or persisted H/N Researcher copies)

### Browser visual — Hierophant

Real Vite app at `http://localhost:5175/` against `dazzling-squid-340`, desktop (~1440) and narrow (~390). Board is the primary initialized surface, not CRUD tabs. Four ordinary Temples read as a coherent board around a visually distinct central Hestar card (`Hosted at Hestar`, `No Doctrine — supports all Classes`; no Courtyard/Agiary/Doctrine semantics). Courtyard, Agiary, and unresolved placement remain labeled. Abundance / Conviction / Doctrine / Holiday are legible. Supplicants and Prophets read as named pieces (Ann, Brother Caldus, Prophet Ione) with Class, Woe, and support state. Lina the Seer appears only on Krolis and says `Working this month`. Advanced / Correct Board is subordinate but reachable. Selected Krolis opens `LoreContextPanel` for Temple Krolis. Narrow stack remains usable; long labels wrap rather than overlap. Screenshot OCR can double letters because of `webkitTextStroke` + DPR; the live DOM and a11y tree are correct.

### Browser visual — Necromancer

Existing branching Gates topology is immediately readable: Edge of Life / Far Lands / Abyss depth bands, Near/Far/Furthest Gates, Void Beyond and Final Death terminals. Gates read as framed Roman/name Gates, not generic cards. Souls are beads plus exact counts. Foes, Allies, and (when present) Ghoul-Callers are named distinct pieces. Ivory is Hostile and Terminus is Destroyed by hatch/pattern plus explicit status text. Bronze 6 Souls shows a conspicuous `5+ Souls pending` warning. Crowded Amber occupants remain inspectable. Ashen Watcher sits adjacent to Final Death with explicit `Unavailable this month`, not inside Terminus. Selected Amber opens existing Gate `LoreContextPanel` (`Codex 1. Necromancer [Draft 4] · I. The Amber Gate`). Advanced / Correct Board is a collapsed `<details>` and remains reachable. Narrow layout keeps the SVG board in an overflow-x scroller (`min-w-[640px]`) and stays usable. Quiet arrangement has no Ghoul-Caller; that absence is recorded, not invented.

### Real Receive Supplicant

Ordinary Temple-board flow: select Krolis → Receive Supplicant → Brother Caldus, Artisan, Woe 1, Courtyard → submit.

One accepted operation at revision **67** (`Received Supplicant "Brother Caldus"`):

- exactly one backing individual Denizen `den_56804fbb-d1c5-407f-96b3-37ea5187e6c1`
- exactly one Hierophant Supplicant using that same identity
- attached to Temple Krolis courtyard
- Class artisan / Woe 1 preserved
- no partial or duplicate person (Ann remains the other Krolis courtyard Supplicant)
- ordinary canonical persistence / audit

Page refresh kept Brother Caldus visible on Krolis Courtyard.

### Real stale Soul-to-Ally + retry-as-new-intent

Two browser tabs on the same campaign. Amber started with exactly 2 Souls.

- Tab A: select Amber, explicitly start Transform Soul into Ally, enter `Bound Kael`, leave the draft open.
- Tab B: recording/correction Soul count 2 → 3. Did not start Transform. Revision **68**.
- Tab A updated through realtime to Souls = 3 (`Rev 68`) without losing the `Bound Kael` draft.
- Tab A submitted the still-open captured intent (`expectedSoulCount: 2`). Server rejected: `DomainError: Soul count: expected "2" but current is "3"`. No Ally created, no Soul consumed, draft name remained, command/identity intent recoverable, no silent rebase to 3. Authoritative state stayed revision 68 with Amber Souls = 3 and only Ally Loyal Mira.
- Explicit cancel of that stale intent, then a **new** Transform against the current 3-Soul state, submitted successfully at revision **69** (`Transformed Soul into Ally "Bound Kael"`).

Accepted operation:

- Souls 3 → 2 at Amber
- exactly one new backing individual Denizen `den_4c604d9f-31b5-41c0-9642-6a50066d3299`
- exactly one new Ally at that same Amber Gate
- no partial or duplicate objects

Refresh kept Ally Bound Kael and Souls = 2 on Amber.

This sequence proves Convex serialization, realtime delivery, stable draft intent, stale rejection, successful compound write, and refresh persistence.

### Lore + Sorcerer presence boundaries

- Selected Temple Krolis opens existing `LoreContextPanel` for Temple Krolis. One representative Add Lore through that reused panel: `Closure note: Brother Caldus joined the courtyard during the HN integration proof.` Revision **70**. Refresh kept the entry.
- Selected Amber still opens the existing Gate subject (`I. The Amber Gate`).
- Lina the Seer appears only at authoritative Temple Krolis, `Working this month`.
- Ashen Watcher appears adjacent to Final Death, `Unavailable this month`.
- No H/N persisted placement copies: Hierophant keys remain temples/supplicants/prophets/cults/laws/holidays/definitions; Necromancer keys remain gates/paths/steps/souls/foes/allies/ghoulCallers/laws/depth/traversals. Researcher occupancy lives only in Sorcerer `researchers` / `externalPresence`.

### Health verifier

After the real writes, `verifyMigration:verifyMigration` on `dazzling-squid-340`:

- `status: "valid"`
- `campaignId: cmp_8eb0c018-4ed1-403c-a3a4-a5b36de1f443`
- `campaignRevision: 70`
- history/checkpoint status valid

Backup/import, checkpoint restore, recovery rehearsal, and Undo/Redo were not re-run.

### Final deterministic gate

Fresh full gate at code HEAD `ce0c77771599a0c3026705d9791e92f7e2cbf4af` (no product-code change during this closure):

- `npm run check` (`vitest run` + `tsc -b` + `vite build`)
- First wrapper run: 129 files, 1 failed / 2454 passed (2455) — flake in unrelated `tests/worldSurfaceEditing.test.tsx` (`Save` button not found). Isolated re-run of that file: 3/3 passed. No H/N code change.
- Second wrapper run: **129 files passed, 2455 tests passed, 0 failed/skipped**
- `tsc -b`: exit 0
- `vite build`: exit 0 (chunk-size warning only)
- `git diff --check`: exit 0
- Tracked tree clean except this documentation commit

Do not reuse the overnight 2445-test count as final evidence.

### Conditional automation deferrals (unchanged)

Sermon, Steer, Holiday celebration, Rebuff, Hestar Provide, automatic five-Souls-to-Foe, compound Create Ghoul-Caller / broad Prophet/Cult creation, atomic Clear Hostility + Lore, and full monthly movement/Visions automation remain deferred. Completeness gates still fail. No Domain automation was expanded. Mariner and Faustian were not started.
