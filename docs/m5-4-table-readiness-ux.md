# M5.4 Table-Readiness UI/UX Register

**Workstream:** M5.4 Table-Readiness UI/UX
**Branch:** `m5-4/table-readiness-ux-batch-2`
**BASE MAIN SHA:** `81fecf0a641a73027426139c84b12f832bafa288`
**Feature start HEAD:** `81fecf0a641a73027426139c84b12f832bafa288`
**Batch 1 merge confirmed:** PR #28, `81fecf0a641a73027426139c84b12f832bafa288` `Merge pull request #28 from nightwolf55la/m5-4/table-readiness-ux-batch-1`

This is the durable UX register. Original human observations are preserved. Approved Batch 1 decisions are recorded as identified resolution notes rather than silent rewrites of those observations.

Do **not** mark any issue VERIFIED in this document. Human retest is required.

CampaignState V5 remains PRE-ACTIVATION. No schema evolution. No migration. No Production deployment.

---

## Approved Batch membership

### Batch 1

UX-001, UX-002, UX-003, UX-007, UX-008, UX-012, UX-013, UX-014, UX-019, UX-023

### Batch 2 (this implementation run)

UX-004, UX-009, UX-010, UX-016, UX-017, UX-018, UX-022

### Deliberately deferred from Batch 1

- **UX-015** general-purpose Powerful-Denizen creation workflow: **DEFERRED**
- Source-specific atomic creators remain allowed where a Domain procedure genuinely requires one.

### Deliberately deferred from Batch 2 (Batch 3 / later)

- **UX-005** whole-Pact overview
- **UX-006** navigation redesign
- **UX-011** shared Laws convention
- **UX-020** general Save-button policy (UX-018 is a concrete Depth-only improvement and does not close this)
- **UX-021** general cross-Domain shell convention
- **UX-024** Storm drag/drop (spatial pieces and click-to-guide are in this operability pass; drag remains DEFERRED)
- Warlock / Sage UI

### Product target for this run

Full-screen desktop / table use. Primary acceptance viewport **1600×1000**. Phone and narrow split-screen layouts are out of scope. Half-screen optimization is not an acceptance criterion.

### Approved Batch 2 interaction

When a Mariner or Necromancer board item is selected, a dismissible right-side overlay inspector (~360–420px) appears. The board does **not** resize. Escape and an explicit Close control dismiss it. Focus is not trapped as a modal.

### Approved Mariner board interaction convention

**APPLICATION DESIGN (approved):**

1. Left-click selects/inspects. Inspector controls, including Advanced / Correct, remain the details path. Context menus do not replace the inspector.
2. Drag an existing board piece to move it. Drag from the board-local Ship / Raider / Storm supply tray to create/place. Off-map drag is a no-op, not a delete.
3. Right-click opens one Mariner-local HTML context menu at the pointer. There are no hover command menus.
4. Delete / Backspace removes the selected occupied Route piece or decrements one Storm on a selected Sea/Horizon when focus is not in an editable field. Accelerators are never the only path.
5. Route create, occupied Remove, Storm +/−, and tray placement retain the snapshot captured at context-menu open or tray pointerdown. Do not recapture at commit. Stale server rejection is preferred over silently rebasing intent.
6. Tray Raider drop does not guess direction. An action-triggered chooser asks for the destination endpoint, then `createMarinerShip` uses that choice and the original tray snapshot. Board Raider moves still preserve a still-valid `toward`.

Instruction line: Drag pieces to place or move • Right-click for actions • Click for details • Delete removes a selected piece.

This remains Mariner-local. No generic drag-and-drop library, context-menu framework, or cross-Domain interaction subsystem. No rules automation. Nothing VERIFIED.

### Source visuals used

- Authoritative source for Batch 2 board art: local `Patreon Materials [04.26.04].pptx` (not committed).
- Batch 2 uses **PowerPoint-native SVG export** (`ShapeRange.Export(..., SVG)`) for **Mariner** and **Necromancer** decorative board bases **and** semantic interaction-geometry sprites. Regenerable extractor: `scripts/export-source-board-svgs.ps1`. Committed assets: `mariner-board.svg`, `mariner-interaction-geometry.svg`, `necromancer-gates-board.svg`, `necromancer-interaction-geometry.svg`.
- Preferred pattern for these source boards: copy exact PowerPoint vector objects into reusable `<symbol>`s, then restyle them at runtime with SVG `<use>`. Compound Isle selection composites the exact group into SourceAlpha and draws a soft shoreline glow rather than filling each primitive. Occupied Routes are stroke-only, with a compact source-path marker instead of large Ship/Raider silhouettes. Application IDs stay in typed catalogs; the extractor mapping is development metadata only.
- Live tokens, Sea hit regions, inspectors, and CampaignState overlays remain application-owned. Approximate overlay geometry must not be reused as visible Isle/Route/Gate art.
- Hierophant / Warlock / Faustian / Sage / Sorcerer were not redone in this run.

---

## Approved application-design resolutions

### Necromancer Foe invariant (UX-012 / UX-013)

**SOURCE:** Necromancer arrangement creates and names starting Foes and the starting Ally while arranging the Gates. Source separately distinguishes a Foe inside Death from a Foe that emerges and becomes an Abomination outside Death.

**APPLICATION DESIGN (approved):**

1. An ordinary individual Denizen may back a Foe while that Foe remains inside Death.
2. An already-Powerful Denizen may become a Foe without losing or replacing its existing Powerful state.
3. An emerged/escaped Denizen Foe must satisfy the stricter Powerful / Foe-of-Death / Abomination representation.
4. Generic correction must not shortcut an ordinary in-Death Foe directly to escaped/emerged state.
5. Starting arrangement should atomically create/name the backing Denizen and authoritative Foe or Ally placement.
6. Explosive setup's Disruptive Ghoul-Caller remains distinct and, where required, atomically receives its complete constrained Powerful profile.

This changes an established validator invariant. Validation must become location/state sensitive and remain fail-closed. No CampaignState shape change is authorized.

### Canonical setting realization (UX-003 / UX-008 / UX-023)

**SOURCE:** The five Hierophant Temples, named Mariner map geography, and ordinary Wizard homes/Sanctums are fixed setting locations.

**APPLICATION DESIGN (approved):**

1. Static Seven-Part Pact source catalogs define canonical setting concepts.
2. Existing typed source-specific references/bindings connect those concepts to persisted campaign World entities.
3. Persisted World UUIDs remain the actual campaign entities.

A narrowly shared helper may create missing backing World Isles/Places, reuse already-authoritative ones, and establish existing typed bindings atomically. It must not become a generic GameEntity layer, a global persisted source-entity registry, silent display-name matching, or a generic Domain initializer.

Forbidden: `sourceEntityId` CampaignState field; name-based entity inference; schema migration; merging World entities because labels match.

### Mariner starting Ship / Sanctum (UX-008)

**SOURCE:** The Mariner's starting Ship is his private Sanctum.

Normal setup must realize/reuse canonical Isha World Isles, establish Mariner board bindings, reuse/set Wizard home references, create the starting Ship, and establish that Ship as the Mariner's Sanctum. Later legitimate Ship/Sanctum divergence remains representable and is not ordinary setup burden.

### Hierophant Temples (UX-003)

Ordinary Temples and Hestar are fixed setting concepts. Setup creates or reuses backing World Places and establishes existing typed Temple bindings without changing Temple identity semantics.

### Sorcerer initialization (UX-019)

An eligible uninitialized Sorcerer must not receive a useless dead-end. Use existing canonical initialization. The surface must either provide an explicit in-context establishment path or state the exact genuine prerequisites and setup decisions still required. Do not invent source setup semantics, and do not infer University, personnel, Laws, Houses, Ideologies, Seas, or Researcher destinations merely to make initialization one-click. The representative review campaign arrives initialized through its explicit fixture choices.

### Pact-Fragment defaults (UX-002)

Preserve structured Pact-Fragment state. Normal setup defaults custody to the owning Pact Wizard and condition to intact unless authoritative state says otherwise. Rare correction moves behind secondary/advanced controls. No generic Notes.

### Stale-write UX (UX-014)

Preserve fail-closed expected/current preconditions. User-facing output must never degrade to `[object Object]`. Render conflicts in game/domain terms.

---

## Visual evidence from the prior review pass

These screenshots remain historical evidence. They are not a claim that later visual-board issues were fixed.

### Screenshot A — Hierophant

Visible: many separate top-level board/domain tabs; wide desktop with large unused side space; Temple cards around Hestar; central board narrower than available screen.

Supports: UX-004, UX-006, UX-021.

Also recorded: Hierophant was comparatively understandable.

### Screenshot B — Mariner

Visible: large Ship and Sanctum block above the map; personal Ship Place; Mariner Wizard; Wizard Sanctum Place; home Isle; explicit Ship/Sanctum equality; instruction to create another mobile Place in World; relatively small round map; source geography as many white circle/oval forms; horizontal/space pressure despite unused margins; right-side selection/inspector consuming width.

Supports: UX-004, UX-008, UX-009, UX-010.

### Screenshot C — Necromancer

Visible: compact top row containing Depth and Laws of Death; Depth owner raw `wiz_...` ID; numeric Depth input and Save button; branching Gates topology; generic circle/rectangle nodes; horizontal scrollbar; large mostly empty inspector region.

Supports: UX-004, UX-016, UX-017, UX-018.

Positive finding: the human explicitly liked the compact Necromancer top composition, especially Depth and Laws adjacent. Preserve that precedent.

### Screenshot D — Sorcerer

Visible: normal PlayShell; yellow Working Tower card; "The Sorcerer has not been established for this campaign yet."; no useful next action.

Supports: UX-001, UX-019.

---

## Issues

### UX-001

- **Surface / Domain:** Shared / demo campaign
- **Short title:** Demo campaign is not a realistic playable campaign
- **Human observation:** The demo campaign is "trash" for review because it has no players, Wizards are absent, and major Domain state is uninitialized. It does not resemble a real campaign.
- **Reproduction / context:** Open the supplied/demo campaign and navigate among Domains. The campaign reaches Domain surfaces with missing Wizard/Domain establishment, including the Sorcerer dead-end captured separately in UX-019.
- **Category:** USABILITY
- **Severity:** P1
- **Likely scope:** SHARED
- **Source/rules relevance:** Application/demo-data concern rather than a written-rule contradiction. A review/demo campaign should represent a believable normal-play state if it is intended to support product inspection.
- **Suggested direction:** Seed a complete, coherent campaign with players, all seven Pact seats/Wizards as appropriate, source-defined World entities, and initialized currently supported Domains so a reviewer can actually use the product.
- **Current status:** FIXED — NEEDS HUMAN RETEST
- **Dependencies / duplicates:** Closely related to UX-003, UX-019, and UX-023.
- **Approved batch:** Batch 1
- **Resolution / implementation note:** Body 3 replaced the Hierophant-only toy fixture. `Start Review Campaign` creates a **new** disposable campaign via `startNewCampaign` (shown only when no campaign exists) and then uses existing semantic commands: seven Players/Wizards/Present seats, Awakening month/Orrery, source-shaped Hierophant/Mariner/Necromancer setup, Quiet Sorcerer, Quiet Faustian table arrange, representative Hierophant pieces, then `beginPlay`. Warlock/Sage are Wizards only. No parallel demo-only state model.

### UX-002

- **Surface / Domain:** Campaign setup / Pact-Fragment
- **Short title:** Pact-Fragment custody and condition are too prominent in setup
- **Human observation:** Pact-Fragment custody should default to the owning Pact Wizard. Custody and condition do not feel like ordinary setup choices and are unlikely to change often. The human also questioned why they need structured tracking instead of notes.
- **Reproduction / context:** During campaign setup/World-level configuration, the application exposes Pact-Fragment custody/condition as explicit state the human must think about.
- **Category:** USABILITY
- **Severity:** P2
- **Likely scope:** SHARED
- **Source/rules relevance:** SOURCE: Pact-Fragments are mechanically meaningful and can be possessed/damaged/lost during play, so structured state is defensible. The written setup material does not present initial custody/condition as an ordinary user decision. APPLICATION DESIGN: current state logic already supports the intuitive default of an intact Fragment held by its owning Wizard; the UI should not make this look like routine setup bookkeeping.
- **Suggested direction:** Default initial custody to the owning Pact Wizard and condition to intact; move rare custody/condition correction into secondary/advanced controls. Keep structured state.
- **Current status:** FIXED — NEEDS HUMAN RETEST
- **Dependencies / duplicates:** Related to UX-020 and UX-021. No generic Notes requirement was demonstrated.
- **Approved batch:** Batch 1
- **Resolution / implementation note:** `create_wizard` now defaults an intact Fragment held by the owning Wizard when current custody is none. `set_pact_seat_wizard` still does not rewrite custody on reassignment. Campaign setup and Table/Wizards keep structured custody/condition behind `Advanced / Correct — Pact-Fragment custody and condition`. No Notes.

### UX-003

- **Surface / Domain:** World / Hierophant / Mariner / shared setup
- **Short title:** Source-defined setting entities are treated as user-created setup work
- **Human observation:** The human should not have to create starting Temple locations, 15 Mariner Isles, or predefined Wizard Sanctums. These are part of the setting and should already exist.
- **Reproduction / context:** Hierophant setup asks for Temple Place creation/binding. Mariner setup asks for 15 World Isle bindings. Sanctum/starting-place state also appears to require explicit World setup.
- **Category:** WORKFLOW
- **Severity:** P1
- **Likely scope:** WORLD
- **Source/rules relevance:** SOURCE: Draft-4 Codices/Materials establish the five Hierophant Temples, the named Mariner map geography, and ordinary Wizard homes/Sanctums as fixed setting locations. APPLICATION DESIGN: the current shared World/domain binding model exposes persistence identity setup directly to the user.
- **Suggested direction:** Source-defined setting geography and ordinary starting homes should be provisioned or bound automatically as canonical campaign infrastructure.
- **Current status:** FIXED — NEEDS HUMAN RETEST
- **Dependencies / duplicates:** Strongly related to UX-008 and UX-023. Also underlies parts of UX-001.
- **Approved batch:** Batch 1
- **Resolution / implementation note:** Body 1 added `initialize_mariner_source_setup` and `initialize_hierophant_source_setup` plus `shared/domain/canonical-setting-realization.ts`. Ordinary setup no longer requires caller-created Isles/Temple Places. Identity is typed-reference / proposed-ID reuse, not name matching. Advanced / Correct Board retains manual binding.

### UX-004

- **Surface / Domain:** PlayShell / all boards
- **Short title:** Desktop workspace wastes horizontal space
- **Human observation:** The application uses only part of a wide desktop screen while leaving large empty side gutters. Hiding the reference should allow the primary surface to become substantially larger.
- **Reproduction / context:** Visible in the Hierophant, Mariner, Necromancer, and Sorcerer screenshots on a wide desktop viewport.
- **Category:** VISUAL
- **Severity:** P1
- **Likely scope:** SHARED
- **Source/rules relevance:** No written-rule issue. Table-facing layout/application design.
- **Suggested direction:** Make the PlayShell/board workspace desktop-first and width-responsive.
- **Current status:** FIXED — NEEDS HUMAN RETEST
- **Dependencies / duplicates:** Strongly affects UX-009, UX-010, UX-016, and UX-005.
- **Approved batch:** Batch 2
- **Resolution / implementation note:** Ordinary play (primary-only and dual-pane) uses `max-w-[1800px]`. Campaign Tools remain `max-w-5xl`. No navigation redesign.

### UX-005

- **Surface / Domain:** PlayShell / Orrery / multi-Domain overview
- **Short title:** Missing central seven-Domain overview board
- **Human observation:** The human still wants a main view with the seven Domains arranged around a smaller Orrery.
- **Reproduction / context:** Current PlayShell navigation is primarily top-level tabs.
- **Category:** MISSING CAPABILITY
- **Severity:** P2
- **Likely scope:** SHARED
- **Source/rules relevance:** Application design inspired by the physical game's shared-table mental model.
- **Suggested direction:** Preserve as a candidate primary dashboard/table overview.
- **Current status:** OPEN
- **Dependencies / duplicates:** Related to UX-006, UX-011, and UX-021.
- **Approved batch:** Not Batch 1

### UX-006

- **Surface / Domain:** PlayShell navigation
- **Short title:** One top-level tab per Domain feels tab-heavy
- **Human observation:** The human wondered whether a single Domain selector/dropdown would be cleaner than a separate tab for each Domain.
- **Reproduction / context:** Current top navigation presents Current Phase, Orrery, Table/Wizards, World, Hierophant, Mariner, Necromancer, Compendium, Sorcerer, plus additional controls.
- **Category:** USABILITY
- **Severity:** P2
- **Likely scope:** SHARED
- **Source/rules relevance:** No rules issue.
- **Suggested direction:** Explore a more compact navigation model after core blockers are fixed.
- **Current status:** OPEN
- **Dependencies / duplicates:** Related to UX-005.
- **Approved batch:** Not Batch 1

### UX-007

- **Surface / Domain:** Shared pattern across Domain boards
- **Short title:** Common Domain actions require detours through World
- **Human observation:** Repeatedly, the user must leave a Domain, create or edit a backing World object, then return to the Domain and select it.
- **Reproduction / context:** Mariner Beast creation, Necromancer Foe/Ally setup, Powerful-Denizen setup, and similar workflows require a World-screen prerequisite.
- **Category:** WORKFLOW
- **Severity:** P1
- **Likely scope:** SHARED
- **Source/rules relevance:** In several Codex procedures the source simply instructs the player to create/name/place the Domain piece during the Domain procedure.
- **Suggested direction:** Where a Domain action has a constrained, common creation path, provide a server-authoritative in-Domain operation that creates the necessary backing entity/profile and Domain state atomically.
- **Current status:** OPEN
- **Dependencies / duplicates:** Umbrella pattern for UX-012, UX-013, UX-015, and parts of UX-008.
- **Approved batch:** Batch 1
- **Resolution / implementation note:** Body 1 addressed geography/Temple/Ship World-detour. Body 2 added `initialize_necromancer_source_setup`. Body 3 review fixture uses those in-Domain paths. Remainder: Dynamic/Explosive starting Beast still asks for a pre-built World Denizen; general Powerful-Denizen creation remains UX-015 deferred.

### UX-008

- **Surface / Domain:** Mariner setup
- **Short title:** Ship/Sanctum persistence plumbing leaks into normal Mariner UX
- **Human observation:** "Mobile Place" is unclear game language. Requiring creation on another page, requiring Ship/Sanctum equality, and explaining that the two can later diverge are extremely confusing for ordinary setup.
- **Reproduction / context:** Mariner setup/Ship and Sanctum section shows the personal Ship Place, Wizard Sanctum Place, home Isle, and instructions about creating another mobile Place in World if a destination is missing.
- **Category:** CONTENT / WORDING
- **Severity:** P1
- **Likely scope:** MARINER
- **Source/rules relevance:** SOURCE: the Mariner's starting Ship is described as his private Sanctum. The source does not use "mobile Place" as the player-facing concept. APPLICATION DESIGN: the app models Ship/Place/Sanctum as distinct state that may diverge later.
- **Suggested direction:** Normal Mariner setup should establish the source-defined starting Ship/Sanctum automatically and speak in Mariner/game terms.
- **Current status:** FIXED — NEEDS HUMAN RETEST
- **Dependencies / duplicates:** Depends on UX-003. Strongly related to UX-007 and UX-009.
- **Approved batch:** Batch 1
- **Resolution / implementation note:** Ordinary Mariner initialize creates "The Mariner's Ship" as a mobile Place and sets the seated Mariner Wizard Sanctum to that Ship. Manual Ship Place binding is Advanced / Correct Board only. Later `set_mariner_ship` still leaves Sanctum unchanged.

### UX-009

- **Surface / Domain:** Mariner board
- **Short title:** Ship/Sanctum block visually outranks the primary map
- **Human observation:** The Ship and Sanctum section takes too much space at the top. The map is the Domain's primary board-game surface and should dominate the page.
- **Reproduction / context:** In the Mariner screenshot, a large Ship/Sanctum card occupies the full width above the map and pushes the board down.
- **Category:** VISUAL
- **Severity:** P1
- **Likely scope:** MARINER
- **Source/rules relevance:** Presentation priority rather than a rule dispute.
- **Suggested direction:** Compress the Ship/Sanctum summary substantially or place it below/alongside the map.
- **Current status:** FIXED — NEEDS HUMAN RETEST
- **Dependencies / duplicates:** Related to UX-008, UX-010, and UX-004.
- **Approved batch:** Batch 2
- **Resolution / implementation note:** Normal header is compact campaign labels (`Ship · Sanctum · Home: …`). Exceptional Ship/Sanctum mismatch remains conspicuous. Ship correction stays behind Advanced / Correct.

### UX-010

- **Surface / Domain:** Mariner map
- **Short title:** Mariner map presentation is cramped, source-unlike, and visually poor
- **Human observation:** The map "looks horrible" and reads as a mishmash of circles over islands rather than the source map.
- **Reproduction / context:** Mariner screenshot: the round map is small; Isle shapes are many overlapping white ovals/circles; horizontal overflow; a large right-hand inspector consumes width.
- **Category:** VISUAL
- **Severity:** P1
- **Likely scope:** MARINER
- **Source/rules relevance:** SOURCE: Materials PowerPoint provides a deliberate spatial/map vocabulary. APPLICATION DESIGN: current SVG board preserves topology/state but not enough geographic presentation.
- **Suggested direction:** Rework presentation around source map geometry/visual vocabulary after setup/workflow blockers.
- **Current status:** FIXED — NEEDS HUMAN RETEST
- **Dependencies / duplicates:** Strongly dependent on UX-004 and related to UX-009.
- **Approved batch:** Batch 2
- **Resolution / implementation note:** Batch 2 was later corrected to a PowerPoint-native exported SVG decorative base (`mariner-board.svg`) under live Isle/Route/Sea hit regions and state tokens. Human retest then found the exact source board substantially improved Mariner, but remaining visible interaction overlays still used approximate ellipse/path geometry. Visible Isle/Route overlays now reuse the same PowerPoint-native source objects via generated `mariner-interaction-geometry.svg` symbols (explicit Draft-4 shape mapping, not label parsing). A further human retest found occupied exact-source Routes filling connector wedges, compound Isle selection accumulating translucent overlap, and a redundant application "Archipelago of Isha" title colliding with source Druj-Lands framing. Occupied Routes are now stroke-only; Isle selection uses a composited SourceAlpha silhouette; Ravage uses the combined Isle mask; the duplicate app title was removed. A later human retest found exact board geometry good, but large Ship/Raider illustrations cluttered and drifted from Routes, and the selected-Isle hard ring was too thick/clipped. Occupancy is now route-first: exact source curve, thinner solid Ship/Raider stroke, plus a compact semantic marker positioned from exact Route path length/tangent. Isle selection is a soft source-shaped shoreline glow, with presentation-only per-Isle color and expanded filter bounds. A final human-retest micro-polish then gave the Ship marker a minimal sail so it still reads as a Ship at board scale, replaced the ambiguous Raider diamond with a compact directional marker aligned to the Route tangent, and tuned Isle shoreline glow/edge color into each Isle’s own fill family. A later human retest found the sail sitting on the wrong side of the mast and the Raider pennant pointing away from the raided Isle. APPLICATION DESIGN: the Ship pictogram is now rotated as a whole along the exact Route tangent with the sail drawn on the pictogram aft side (bow remains +X). That rotation is presentation-only; ordinary Ships still have no gameplay travel direction. The Raider marker uses the same exact-path tangent, then reverses it when that tangent points away from the authoritative `toward` endpoint. Accessible Raider labels stay destination-based. Exact Sea highlighting bounded by Routes and the outer map rim is feasible but deferred; it would need explicit closed presentation polygons and is not attempted here. Approximate geometry remains only for Sea hits, token anchors, and invisible convenience hits. Overlay inspector does not resize the map. Status remains FIXED — NEEDS HUMAN RETEST.

### UX-011

- **Surface / Domain:** Shared Domain pattern / Laws
- **Short title:** Laws need a consistent table-facing presentation pattern
- **Human observation:** The human wants a common way to show Laws of a place/Domain. Active Laws should be visible in a predictable position.
- **Reproduction / context:** Laws appear differently across current Domain surfaces. The Necromancer's compact Laws block was specifically liked.
- **Category:** DISCOVERABILITY
- **Severity:** P2
- **Likely scope:** SHARED
- **Source/rules relevance:** Laws recur across Domain systems. Exact placement is application design.
- **Suggested direction:** Shared convention for active Laws that is compact, prominent, and consistent.
- **Current status:** OPEN
- **Dependencies / duplicates:** Closely related to UX-021 and potentially UX-005.
- **Approved batch:** Not Batch 1
- **Resolution / implementation note:** Batch 2 code-review correction restored the pre-Batch-2 visible Necromancer Law wording in the compact Depth + Laws header. That does not close this shared Laws convention.

### UX-012

- **Surface / Domain:** Necromancer initialization
- **Short title:** Necromancer setup offers Foe selections the server will reject
- **Human observation:** A non-Powerful Denizen could be selected as a Foe, then initialization failed with `arrangementFoes[0] requires a Powerful-Denizen profile`. After making it Powerful, initialization failed again because it lacked builtin taxonomy `foe_of_death`.
- **Reproduction / context:** Select an ordinary Denizen in the starting-Foe UI and call `m3Commands:initializeNecromancer`.
- **Category:** BUG
- **Severity:** P1
- **Likely scope:** NECROMANCER
- **Source/rules relevance:** Independent of the larger model question in UX-013, the client currently permits choices that the authoritative command rejects.
- **Suggested direction:** The UI must not present server-invalid choices. Under the approved representation, normal initialization should create the correct starting pieces itself.
- **Current status:** FIXED — NEEDS HUMAN RETEST
- **Dependencies / duplicates:** Depends on UX-013. Related to UX-007 and UX-015.
- **Approved batch:** Batch 1
- **Resolution / implementation note:** Ordinary setup no longer offers a World Denizen picker that the server will reject. It asks for names and genuine placement choices. Advanced / Correct Board still binds existing identities; ordinary in-Death Foes no longer require Powerful/`foe_of_death`.

### UX-013

- **Surface / Domain:** Necromancer Gates initialization
- **Short title:** Starting Foe/Ally representation may be over-constrained relative to source
- **Human observation:** The human expected starting Foes and Allies to be Gate pieces that can be created/named during setup, not pre-existing World Powerful Denizens.
- **Reproduction / context:** Current initialization requires existing Denizens with Powerful-Denizen profiles and, for Foes, builtin `foe_of_death` taxonomy.
- **Category:** WORKFLOW
- **Severity:** P1
- **Likely scope:** NECROMANCER
- **Source/rules relevance:** SOURCE: Gates arrangement instructs the player to create and name the starting Foes and Ally as part of arranging the Domain.
- **Suggested direction:** Approved location-sensitive Foe invariant. Normal setup must mirror create/name/place.
- **Current status:** FIXED — NEEDS HUMAN RETEST
- **Dependencies / duplicates:** Parent design issue for UX-012.
- **Approved batch:** Batch 1
- **Resolution / implementation note:** Location-sensitive validator: ordinary in-Death Denizen Foes need no Powerful profile; escaped/emerged Denizen Foes still require Powerful + `foe_of_death`. Generic `update_necromancer_foe` cannot move an in-Death Denizen Foe to escaped. Source-shaped initialize creates backing individuals atomically. Explosive Ghoul-Caller receives its constrained Powerful profile in that same command. No CampaignState shape change.

### UX-014

- **Surface / Domain:** World / Powerful Denizen editing
- **Short title:** Powerful taxonomy edit surfaces opaque stale/object error
- **Human observation:** Editing Foe profiles produced `taxonomies: expected "[object Object]" but current is "[object Object],[object Object]"` from `setPowerfulDenizenTaxonomies`.
- **Reproduction / context:** After creating/upgrading Denizens while trying to satisfy Necromancer setup, change Powerful-Denizen taxonomies and submit an edit whose current value has changed.
- **Category:** BUG
- **Severity:** P1
- **Likely scope:** WORLD
- **Source/rules relevance:** No rules interpretation is required.
- **Suggested direction:** Fix stale-precondition/value presentation so taxonomy edits either succeed or explain the actual conflict in game/domain terms. Preserve fail-closed stale behavior.
- **Current status:** FIXED — NEEDS HUMAN RETEST
- **Dependencies / duplicates:** Related to UX-015 and encountered because of UX-013's previous setup model.
- **Approved batch:** Batch 1
- **Resolution / implementation note:** Shared stale-precondition formatter renders taxonomy collections as readable IDs (`foe_of_death, beast`) instead of `[object Object]`. Authoritative stale rejection is unchanged.

### UX-015

- **Surface / Domain:** World / Powerful Denizens
- **Short title:** Cannot create a Powerful Denizen directly
- **Human observation:** To create a Powerful Denizen, the human must first create an ordinary Denizen, then edit it and add a Powerful profile.
- **Reproduction / context:** World creation flow lacks a coherent create-as-Powerful path.
- **Category:** WORKFLOW
- **Severity:** P2
- **Likely scope:** WORLD
- **Source/rules relevance:** Powerful Denizens are a real represented game concept. The two-step creation path is application workflow, not a source requirement.
- **Suggested direction:** General-purpose Powerful creation is deferred. Source-specific atomic creators are allowed where the relevant Domain procedure genuinely requires one.
- **Current status:** DEFERRED
- **Dependencies / duplicates:** Child of UX-007. Related to UX-012, UX-013, and UX-014.
- **Approved batch:** Deferred (not a general Batch 1 implementation target)
- **Resolution / implementation note:** Explosive source setup atomically attaches the constrained Disruptive Ghoul-Caller Powerful profile. That is a source-specific creator and does not close this general World workflow.

### UX-016

- **Surface / Domain:** Necromancer Gates board
- **Short title:** Gates board preserves topology but does not visually read as Gates
- **Human observation:** The Necromancer chart is better than the Mariner map, but still has a horizontal scrollbar and does not use the visual Gate forms from the Materials.
- **Reproduction / context:** Necromancer screenshot: branching topology is present, but nodes are circles/rectangles with small labels.
- **Category:** VISUAL
- **Severity:** P1
- **Likely scope:** NECROMANCER
- **Source/rules relevance:** SOURCE: Materials depict the eleven Gates as recognizable gate/door shapes.
- **Suggested direction:** Preserve current branching spatial logic while adopting source Gate silhouettes later.
- **Current status:** FIXED — NEEDS HUMAN RETEST
- **Dependencies / duplicates:** Strongly affected by UX-004.
- **Approved batch:** Batch 2
- **Resolution / implementation note:** Batch 2 was later corrected to a PowerPoint-native exported SVG decorative base (`necromancer-gates-board.svg`) under live Gate/path hit regions, Hostile/Destroyed hatch overlays, and state tokens. Prior reconstructed arches/tree/band labels are no longer the visual board. Human retest found exact Gate/path highlighting good, but mouse/keyboard selection drew a native black rectangular focus box around the SVG group. Native outline is suppressed; keyboard `focus-visible` now uses the same exact source Gate/path geometry as selection. Overlay inspector does not resize the board. No normal desktop horizontal scrollbar at 1600×1000. Gate IDs and persisted topology unchanged.

### UX-017

- **Surface / Domain:** Necromancer top summary / Depth
- **Short title:** Depth UI exposes internal ownership identity and raw UUID
- **Human observation:** "Depth owner" does not make sense; they expect Depth to simply be the Necromancer's. The UI displays a raw `wiz_...` UUID.
- **Reproduction / context:** Necromancer screenshot shows `Depth owner: wiz_... · value 0`.
- **Category:** CONTENT / WORDING
- **Severity:** P2
- **Likely scope:** NECROMANCER
- **Source/rules relevance:** SOURCE: Codex describes the Necromancer's Depth as a Domain quantity.
- **Suggested direction:** Hide internal owner IDs in normal play.
- **Current status:** FIXED — NEEDS HUMAN RETEST
- **Dependencies / duplicates:** Related to UX-021 and UX-020.
- **Approved batch:** Batch 2
- **Resolution / implementation note:** Normal presentation is compact `Depth` with a numeric stepper. Raw `wiz_...` owner IDs are not shown. Exceptional previous-owner state is described in human-readable terms.

### UX-018

- **Surface / Domain:** Necromancer Depth control
- **Short title:** Depth edit is heavier than a single small integer warrants
- **Human observation:** Depth should be a compact spinner/stepper near its label and should not need a separate Save button.
- **Reproduction / context:** Necromancer screenshot shows Depth label, separate numeric input, and Save Depth button.
- **Category:** USABILITY
- **Severity:** P2
- **Likely scope:** NECROMANCER
- **Source/rules relevance:** No rules conflict. Interaction granularity.
- **Suggested direction:** Compact single-value control with immediate server-authoritative commit.
- **Current status:** FIXED — NEEDS HUMAN RETEST
- **Dependencies / duplicates:** Specific example of UX-020.
- **Approved batch:** Batch 2
- **Resolution / implementation note:** Isolated Depth changes use the existing `set_necromancer_depth` operation immediately. No Save Depth button. Pending and stale/error remain visible. Does **not** close UX-020.

### UX-019

- **Surface / Domain:** Sorcerer
- **Short title:** Existing Sorcerer Wizard leads to an uninitialized dead-end surface
- **Human observation:** The campaign has a Sorcerer Wizard, but the Sorcerer tab says "The Sorcerer has not been established for this campaign yet" and offers no useful next action.
- **Reproduction / context:** Open Sorcerer surface in the review campaign.
- **Category:** DISCOVERABILITY
- **Severity:** P1
- **Likely scope:** SORCERER
- **Source/rules relevance:** Application distinction between Wizard existence and Domain initialization.
- **Suggested direction:** Fix demo initialization and ensure an uninitialized but eligible Sorcerer Domain presents an explicit in-context establishment path or clear prerequisite explanation.
- **Current status:** FIXED — NEEDS HUMAN RETEST
- **Dependencies / duplicates:** Strongly related to UX-001 and UX-003.
- **Approved batch:** Batch 1
- **Resolution / implementation note:** `readSorcererEstablishmentReadiness` lists exact human-readable structural prerequisites and, when those exist, the explicit player/Facilitator setup choices still required (University, Laws, forgotten Law, Houses/Ideologies/Seas, Researcher destinations, and Tower personnel). It does not infer those choices or expose a one-click Quiet payload. The review campaign arrives already initialized through its explicit fixture. No new persisted field and no change to `initialize_sorcerer` semantics.

### UX-020

- **Surface / Domain:** Shared interaction pattern
- **Short title:** Too many explicit Save buttons for single-value changes
- **Human observation:** Save makes sense for a batch of related fields, but changing one value should generally commit as that value changes.
- **Reproduction / context:** Necromancer Depth is the clearest example.
- **Category:** USABILITY
- **Severity:** P2
- **Likely scope:** SHARED
- **Source/rules relevance:** No rules issue. Must still preserve canonical server-authoritative writes and stale-intent safety.
- **Suggested direction:** Explicit Save for multi-field/draft transactions; direct semantic controls for isolated values.
- **Current status:** OPEN
- **Dependencies / duplicates:** UX-018 is a concrete instance.
- **Approved batch:** Not Batch 1

### UX-021

- **Surface / Domain:** Cross-Domain information architecture
- **Short title:** Domain surfaces lack a consistent structure for genuinely shared concepts
- **Human observation:** Domains should use similar structure for common things such as Laws and other recurring state.
- **Reproduction / context:** Comparing Hierophant, Mariner, Necromancer, and Sorcerer surfaces.
- **Category:** USABILITY
- **Severity:** P2
- **Likely scope:** SHARED
- **Source/rules relevance:** Domains are intentionally specific and should not be forced into a generic Domain framework.
- **Suggested direction:** Lightweight common shell/convention for recurring items.
- **Current status:** OPEN
- **Dependencies / duplicates:** Closely related to UX-011, UX-017, and UX-020.
- **Approved batch:** Not Batch 1

### UX-022

- **Surface / Domain:** Compendium
- **Short title:** Compendium detail pane scrolls away from the selected entry
- **Human observation:** When the user selects something in the Compendium and scrolls through the list, the detail card should stay available.
- **Reproduction / context:** Browse a long Compendium shelf/list, select an entry, then scroll.
- **Category:** USABILITY
- **Severity:** P2
- **Likely scope:** LORE/COMPENDIUM
- **Source/rules relevance:** No rules issue.
- **Suggested direction:** Sticky pane or independently scrolling list/detail columns on desktop.
- **Current status:** FIXED — NEEDS HUMAN RETEST
- **Dependencies / duplicates:** UX-004's wider desktop workspace may improve layout.
- **Approved batch:** Batch 2
- **Resolution / implementation note:** Desktop reading pane is sticky with a viewport-relative max height; long entry content scrolls inside the pane. No Lore persistence change.

### UX-023

- **Surface / Domain:** World / Mariner / Compendium
- **Short title:** Source Isles and campaign-created/bound Isles appear duplicated and disconnected
- **Human observation:** In the Compendium, the human saw the Isles they had manually created plus what looked like the default/source Isles. Yet the source Isles were not selectable during Mariner initialization.
- **Reproduction / context:** Manually create the 15 Mariner Isles to satisfy setup, then browse the Compendium.
- **Category:** BUG
- **Severity:** P1
- **Likely scope:** WORLD
- **Source/rules relevance:** SOURCE: there is one set of fixed setting Isles/geography. APPLICATION DESIGN: source-catalog/Lore identity and persisted World identity must be presented as one coherent setting concept without conflating the different technical layers.
- **Suggested direction:** Use the approved canonical-setting realization strategy. Do not build a global source-ID registry and do not name-match.
- **Current status:** FIXED — NEEDS HUMAN RETEST
- **Dependencies / duplicates:** Strongly related to UX-003 and Mariner initialization.
- **Approved batch:** Batch 1
- **Resolution / implementation note:** After source-shaped Mariner realization, Compendium groups catalog Isle Lore under the bound World UUID. `considerCampaignOnly` skips already-represented refs, so Far Reach is one subject rather than a disconnected catalog duplicate plus a manually recreated World Isle. Technical Lore vs World identities remain separate layers.

### UX-024

- **Surface / Domain:** Mariner map / Seas
- **Short title:** Storms should read as spatial Sea pieces and support direct movement
- **Human observation:** Storm/Typhoon icons would be useful visual pieces positioned within Seas. On desktop, dragging a Storm between valid Seas could make movement natural.
- **Reproduction / context:** Mariner Batch 2 visual retest. Current Storms are compact tokens near Sea labels rather than spatial Sea pieces.
- **Category:** MISSING CAPABILITY
- **Severity:** P3
- **Likely scope:** MARINER
- **Source/rules relevance:** Storm/Typhoon counts and Guided Storm movement already exist. Exact route-bounded Sea polygons are not required merely to display or drag a Storm.
- **Suggested direction:** Future interaction polish could use a Sea presentation anchor, a generous invisible Sea drop target, valid-Sea highlight during drag, the existing authoritative move command, and a keyboard/non-drag equivalent.
- **Current status:** FIXED — NEEDS HUMAN RETEST
- **Dependencies / duplicates:** Related to UX-010. Does not require exact Sea polygons.
- **Approved batch:** Not Batch 2 originally; spatial pieces and click-to-guide included in the Batch 2 Mariner operability pass.
- **Resolution / implementation note:** Storms/Typhoons render as spatial Sea pieces at presentation-only anchors. **Direct Storm piece drag** drops anywhere inside the existing broad Sea/Horizon hit geometry and submits `moveMarinerStorm` (one Storm token per drag, including from Typhoon stacks); pieces snap back to the destination anchor with no persisted drop coordinates. Adjacent/default Seas receive recommended highlight during drag; other representable destinations stay available. Click-to-guide and inspector controls remain keyboard/non-drag fallbacks. No Wind attestation. No exact Sea polygons. No new write contract.

### UX-025

- **Surface / Domain:** Mariner
- **Short title:** Critical Mariner operational state is not visible at a glance
- **Human observation:** The map should allow the table to scan weather, shipping, Stability, Markets, Ravage, Beasts, and exceptional threats without opening each inspector.
- **Reproduction / context:** Open Mariner with nothing selected. Important board state should be readable across the map.
- **Category:** DISCOVERABILITY / USABILITY
- **Severity:** P1
- **Likely scope:** MARINER
- **Source/rules relevance:** SOURCE: Storms, Typhoons (Storms ≥ 2 as current presentation), Route occupancy, Markets/Rarity, Ravage counts, and Beast locations are current Mariner state. Map Stability and prevailing Wind are not encoded in current domain/state. APPLICATION DESIGN: compact tokens, Visions forecast, and hover/focus copy; not new rules.
- **Suggested direction:** Show encoded operational state on the map; keep explanations on hover/focus; keep mutations on selection.
- **Current status:** PARTIALLY ADDRESSED — NEEDS HUMAN RETEST
- **Dependencies / duplicates:** Related to UX-010, UX-024, UX-026.
- **Approved batch:** Batch 2 operability pass
- **Resolution / implementation note:** Always-visible: Route occupancy/markers, Storm/Typhoon pieces, Markets (with Rarity cue when present), Ravage silhouette plus compact count, Beast tokens, and immediate-hazard rings on threatened occupied Routes. Map Stability numbers and authoritative prevailing Wind are not encoded in current domain/state and are not implemented. The hollow Visions forecast strip was removed. Nothing VERIFIED.

### UX-026

- **Surface / Domain:** Mariner
- **Short title:** Mariner management actions are organized like generic CRUD instead of map context
- **Human observation:** Selecting an Isle currently exposes operations such as Ship creation/movement that conceptually belong to Routes. The selected map object should determine the relevant information and actions.
- **Reproduction / context:** Select an Isle, then a Route, then a Sea. Actions should match the selected object.
- **Category:** WORKFLOW
- **Severity:** P1
- **Likely scope:** MARINER
- **Source/rules relevance:** SOURCE: existing create/move Ship and Guide Storm commands already take Route or Sea identities. APPLICATION DESIGN: inspector information architecture only.
- **Suggested direction:** Isle actions stay Isle-specific; Route owns Ship/Raider operations; Sea is weather-centric.
- **Current status:** FIXED — NEEDS HUMAN RETEST
- **Dependencies / duplicates:** Related to UX-025 and UX-024.
- **Approved batch:** Batch 2 operability pass
- **Resolution / implementation note:** Isle inspector keeps Market, Ravage, Record Ravage Result, Beast facts, and Lore. Route inspector owns Add Ship / Move Ship (or Move Raider) using the selected Route as target or source without fabricating `sourceIsleId`. **Direct board manipulation convention:** left-click inspects; drag existing pieces to move; drag Ship / Raider / Storm from a board-local supply tray to place; right-click opens one HTML context menu at the pointer; Delete / Backspace removes a selected occupied Route or decrements one selected Storm. Hover command menus are retired. Empty-Route context actions are Add Ship and Raider toward each named endpoint; occupied Route context is Remove Ship or Remove Raider; Sea/Horizon and Storm/Typhoon pieces share Add Storm and, when `stormCount > 0`, Remove Storm. Context-menu and tray actions retain the snapshot captured at menu-open or tray pointerdown. Tray Ship uses `createMarinerShip` with `destinationToward` null; tray Raider opens a direction chooser and does not guess; tray Storm uses `setMarinerSeaStormCount` only. If a placement newly traps a Beast, the existing Rampage chooser uses that same original snapshot. These Storm adjustments remain manual board-state edits only — no automatic Ship destruction, hazard resolution, Rampage, Ravage, Market, Stability, or monthly procedure. Sea inspector remains weather-centric with click-to-guide fallback; arbitrary Storm-count correction lives under Advanced / Correct — Weather. Generic Route occupancy correction lives under Advanced / Correct — Route. Nothing VERIFIED.

---

## Mariner operability — SOURCE / INFERENCE / APPLICATION DESIGN

**SOURCE (Draft-4 / current domain, not invented):**
- Storms live on Seas; Guided Storm movement requires an adjacent Sea or Horizon and table confirmation that the move is not against the actual prevailing Wind.
- Typhoon-scale shipping hazard uses existing helpers (`>= 2` storms, or `>= 1` storm plus a Beast in the same Sea).
- Route occupancy is Empty / Ship / Raider; Raider `toward` is the authoritative raided endpoint.
- Market is `{ present: false }` or `{ present: true, rarity: string | null }`.
- Ravage is persisted `ravageStormCount`.
- Beasts have Sea or Isle locations and encoded conditions.

**INFERENCE (necessary consequences only):**
- A Typhoon presentation label follows the existing `stormCount >= 2` helper.
- Immediate hazard on an occupied Route is a read-only warning, not an automatic mutation.
- Legal Guide Storm destinations are the catalog `adjacentRegionIds`.

**APPLICATION DESIGN (not new game rules):**
- Ship sail-aft pictogram and Raider destination-aligned heading.
- Storm/Typhoon SVG pieces and Sea presentation anchors.
- Stability badges omitted: Map Stability is not encoded; do not invent a formula.
- Prevailing Wind chrome omitted: software does not know actual Wind; do not guess from calendar/season.
- Next-Storm destination omitted from forecast: not deterministic from current state.
- Visions forecast is a bookkeeping preview of current Storms, Typhoon seas, threatened occupied Routes, and Ravaged Isles.
- Contextual inspectors and click-to-inspect selection. No hover command menus.
- Click-to-guide Storm remains a keyboard/non-drag fallback. Direct Storm piece drag and tray Storm placement are implemented.

Do not treat application-design forecasts as new game rules.

---

## Human retest path

Batch 2 visual retest at **1600×1000** full-screen desktop (also 1920×1080 if convenient). Use a disposable campaign. Do not inspect phones.

1. Open Mariner with nothing selected. Confirm the map dominates, geography is recognizable, Ship/Sanctum is compact, and there is no normal horizontal scrollbar.
2. Select an Isle. Confirm the overlay inspector opens and the map does **not** shrink. Close with the button and with Escape.
3. Select a Route or Sea. Confirm the overlay updates without resizing the board.
4. Open Necromancer with nothing selected. Confirm arched Gates, Near/Far/Furthest branching, compact Depth (no raw owner UUID, no Save Depth), and no normal horizontal scrollbar.
5. Select a Gate, then a path space. Confirm overlay behavior and that the board does not resize.
6. If safely available without unsafe mutation, inspect Hostile / Destroyed / 5+ Souls treatments.
7. Open Compendium, select a long entry, and scroll the subject list. Confirm the detail pane stays available and long text scrolls inside it.
8. Glance Hierophant, Sorcerer, and Faustian at full desktop. Confirm no obvious regression from the wider PlayShell. Do not treat UX-005/006/011/020/021 as fixed.

Do not claim human verification from implementation or browser inspection alone.

## Implementation checkpoint log

Batch 1 (merged PR #28):

| Body | SHA | Subject |
|---|---|---|
| 1 | `b1bb14a82982d23f5814c779db3f11868bf788fd` | M5.4 UX B1: add source-shaped setup realization |
| 2 | `fb8a841394656e82a342bb3d2a5751b40d45574a` | M5.4 UX B1: make Gates setup source-shaped |
| 3 | `8776ac8b85becfb9e63bba9ea7ffc90a8f1c06c7` | M5.4 UX B1: add representative review readiness |

Batch 2 visual bodies:

| Body | SHA | Subject |
|---|---|---|
| 1 | `c3eb8af5f71e160f702362d7c1fa63c2899a60d9` | M5.4 UX B2: expand desktop Mariner board |
| 2 | `99e3bfd4d5ae396ad673cb8a426209fc272baa11` | M5.4 UX B2: reshape the Gates board |
| 3 | *(earlier commit)* | M5.4 UX B2: finish desktop reading pass |

Batch 2 Mariner operability pass:

| Body | SHA | Subject |
|---|---|---|
| A | `8db4b0fc1499b06e977a1bd20cd96f7f210aff62` | M5.4 UX B2: expose Mariner operational state |
| B | `204db083c6dd0400ec500a5a4d92368e06816411` | M5.4 UX B2: make Mariner map actions contextual |
| C | *(earlier commit)* | M5.4 UX B2: add Mariner weather interaction |
| Interaction convention | *(this commit)* | M5.4 UX B2: adopt board interaction convention |

## Browser / desktop inspection (implementation worker)

Inspected at **1600×1000** against disposable Development `academic-gazelle-299` via local Vite (`http://localhost:5183/`). No mutations were sent. Guide Storm was entered and cancelled. `wry-boar-766` was not used. **No Production.** **No function sync.**

Implementation-worker observations (not human verification):

- Mariner unselected: PowerPoint-native source SVG remains dominant; Visions forecast is compact; Storms, Ships, Raider, and Scuttleport Market are visible without clicking. No Stability numbers or prevailing Wind chrome (not encoded). This campaign had no Beasts and no Ravaged Isles. No horizontal overflow.
- Hover/focus copy appears in the status strip when a map object is selected (and on keyboard focus in tests). Isle/Route/Sea inspectors match the selected object: Isle has no Ship CRUD; Route owns Record Ship Move; Sea is weather-centric with Guide Storm...
- Guide Storm highlights only adjacent Sea hit ellipses; Cancel/Escape exits without write. Overlay inspector does not resize the map.
- Necromancer / other Domains were not re-audited in this operability pass.

## New UX findings from this run

none

Do not mark any issue VERIFIED.
