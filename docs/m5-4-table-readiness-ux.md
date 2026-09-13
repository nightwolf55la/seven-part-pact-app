# M5.4 Table-Readiness UI/UX Register

**Workstream:** M5.4 Table-Readiness UI/UX
**Branch:** `m5-4/table-readiness-ux-batch-1`
**BASE MAIN SHA:** `8aecc7fbe10c68a93d973630507dde9c76c2d93a`
**Feature start HEAD:** `8aecc7fbe10c68a93d973630507dde9c76c2d93a`
**Faustian merge confirmed:** PR #27, `8aecc7f` `Merge pull request #27 from nightwolf55la/m5-4a/faustian-card-table`

This is the durable UX register. Original human observations are preserved. Approved Batch 1 decisions are recorded as identified resolution notes rather than silent rewrites of those observations.

Do **not** mark any issue VERIFIED in this document. Human retest is required.

CampaignState V5 remains PRE-ACTIVATION. No schema evolution. No migration. No Production deployment.

---

## Approved Batch membership

### Batch 1 (this implementation run)

UX-001, UX-002, UX-003, UX-007, UX-008, UX-012, UX-013, UX-014, UX-019, UX-023

### Deliberately deferred from Batch 1

- **UX-015** general-purpose Powerful-Denizen creation workflow: **DEFERRED**
- Source-specific atomic creators remain allowed where a Domain procedure genuinely requires one.
- UX-004, UX-005, UX-006, UX-009, UX-010, UX-011, UX-016, UX-017, UX-018, UX-020, UX-021, UX-022 remain later-batch work.

### Product target for this run

Full-screen desktop / table use. Phone and narrow split-screen layouts are out of scope.

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

An eligible uninitialized Sorcerer must present the existing establishment operation or the exact missing prerequisite. Do not invent new Sorcerer setup rules. The representative review campaign should arrive initialized.

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
- **Current status:** OPEN
- **Dependencies / duplicates:** Closely related to UX-003, UX-019, and UX-023.
- **Approved batch:** Batch 1
- **Resolution / implementation note:** Body 1 added source-shaped realization used by later review-campaign seeding. Representative fixture replacement is Body 3 work.

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
- **Current status:** OPEN
- **Dependencies / duplicates:** Related to UX-020 and UX-021. No generic Notes requirement was demonstrated.
- **Approved batch:** Batch 1
- **Resolution / implementation note:** Presentation/defaulting is Body 3 work. Structured state remains.

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
- **Current status:** OPEN
- **Dependencies / duplicates:** Strongly affects UX-009, UX-010, UX-016, and UX-005.
- **Approved batch:** Not Batch 1

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
- **Resolution / implementation note:** Body 1 addressed the geography/Temple/Ship World-detour. Body 2 adds `initialize_necromancer_source_setup` so ordinary Gates arrangement creates/names starting Foes and Ally in-Domain. Remainder: Dynamic/Explosive starting Beast still asks for a pre-built World Denizen; general Powerful-Denizen creation remains UX-015 deferred.

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
- **Current status:** OPEN
- **Dependencies / duplicates:** Related to UX-008, UX-010, and UX-004.
- **Approved batch:** Not Batch 1

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
- **Current status:** OPEN
- **Dependencies / duplicates:** Strongly dependent on UX-004 and related to UX-009.
- **Approved batch:** Not Batch 1

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
- **Current status:** OPEN
- **Dependencies / duplicates:** Strongly affected by UX-004.
- **Approved batch:** Not Batch 1

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
- **Current status:** OPEN
- **Dependencies / duplicates:** Related to UX-021 and UX-020.
- **Approved batch:** Not Batch 1

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
- **Current status:** OPEN
- **Dependencies / duplicates:** Specific example of UX-020.
- **Approved batch:** Not Batch 1

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
- **Current status:** OPEN
- **Dependencies / duplicates:** Strongly related to UX-001 and UX-003.
- **Approved batch:** Batch 1
- **Resolution / implementation note:** Body 3 work.

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
- **Current status:** OPEN
- **Dependencies / duplicates:** UX-004's wider desktop workspace may improve layout.
- **Approved batch:** Not Batch 1

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
- **Current status:** OPEN
- **Dependencies / duplicates:** Strongly related to UX-003 and Mariner initialization.
- **Approved batch:** Batch 1
- **Resolution / implementation note:** Body 1 realization binds catalog board Isles to persisted World UUIDs through existing Mariner bindings, which is the identity layer Lore already uses. Ordinary setup no longer creates a parallel manual Isle set. Body 3 will inspect Compendium presentation against that binding.

---

## Retest path

See the Batch 1 human retest path in the implementation checkpoint. Do not claim human verification from implementation or browser inspection alone.

## Implementation checkpoint log

Recorded as work proceeds.

| Body | SHA | Subject |
|---|---|---|
| 1 | `b1bb14a82982d23f5814c779db3f11868bf788fd` | M5.4 UX B1: add source-shaped setup realization |
| 2 | pending | Gates setup source-shaped |
| 3 | pending | representative review readiness |
