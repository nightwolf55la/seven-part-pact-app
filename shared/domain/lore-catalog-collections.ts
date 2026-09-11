/**
 * Draft4/v1 source-Lore collection records.
 *
 * Generated from the approved M5.3 Body A Workstream catalog input.
 * Exact sourceCollectionId, sourceEntryId, membership, order, and normalized
 * source text are semantic Draft4/v1 baseline properties.
 *
 * Do not edit by reconstructing prose from PDFs. Change only with an explicit
 * Master compatibility/disposal decision.
 */

export const DRAFT4_V1_SOURCE_LORE_COLLECTION_IDS = [
  "necromancer.home.graven_isle",
  "necromancer.sanctum.crypt",
  "hierophant.home.ishana",
  "hierophant.sanctum.hall",
  "warlock.home.halcyon_isles",
  "warlock.sanctum.keep",
  "mariner.home.far_reach",
  "mariner.sanctum.ship",
  "faustian.home.scuttleport",
  "faustian.sanctum.bilgewater_inn",
  "sage.home.moonlit_atoll",
  "sage.sanctum.grotto",
  "sorcerer.home.spyrholm",
  "sorcerer.sanctum.tower",
  "necromancer.gate.amber",
  "necromancer.gate.bronze",
  "necromancer.gate.lead",
  "necromancer.gate.ivory",
  "necromancer.gate.antimony",
  "necromancer.gate.marching",
  "necromancer.gate.churning",
  "necromancer.gate.weeping",
  "necromancer.gate.howling",
  "necromancer.gate.deep",
  "necromancer.gate.terminus",
  "necromancer.history.present_age",
  "necromancer.history.restoration",
  "necromancer.history.age_of_darkness",
  "necromancer.history.age_of_silks",
  "necromancer.history.golden_age",
  "necromancer.history.foundation",
  "necromancer.history.tragedies",
  "necromancer.history.time_before",
  "hierophant.temple.hestar",
  "hierophant.temple.krolis",
  "hierophant.temple.notor",
  "hierophant.temple.zephon",
  "hierophant.temple.ushin",
  "hierophant.faith.western_pyrism",
  "hierophant.faith.urite_polytheism",
  "hierophant.faith.hecarian_philosophism",
  "hierophant.faith.faith_of_the_nameless",
  "hierophant.faith.druji_pseudofaith",
  "hierophant.faith.ymosites",
  "warlock.clan.uroch",
  "warlock.clan.lark",
  "warlock.clan.caravel",
  "warlock.clan.waine",
  "warlock.clan.ix",
  "warlock.foreign.triarchy_of_ur",
  "warlock.foreign.elpenors_kingdom",
  "warlock.foreign.hrotingmen",
  "warlock.foreign.druj_lands",
  "mariner.delegated.graven_isle",
  "mariner.delegated.ishana",
  "mariner.delegated.halcyon_isles",
  "mariner.delegated.scuttleport",
  "mariner.delegated.spyrholm",
  "mariner.delegated.sage_atoll",
  "mariner.isle.tahv",
  "mariner.isle.thyras",
  "mariner.isle.druntyr",
  "mariner.isle.koire",
  "mariner.isle.caravesse",
  "mariner.isle.izor",
  "mariner.isle.yeraine",
  "mariner.isle.orrery",
  "mariner.distant.north",
  "mariner.distant.east",
  "mariner.distant.south",
  "mariner.distant.west",
  "faustian.hell.mutterheep",
  "faustian.hell.paradise",
  "faustian.hell.carceri",
  "faustian.hell.eternity_forge",
  "faustian.hell.mirasta",
  "faustian.hell.toyland",
  "faustian.hell.old_college",
  "faustian.hell.anselion",
  "faustian.hell.misery",
  "sage.mythic.hundred_handed_isle",
  "sage.mythic.castle_in_sky",
  "sage.mythic.court_of_king_typhon",
  "sage.mythic.bottom_of_world",
  "sage.mythic.twin_goblin_courts",
  "sage.mythic.kingdom_of_simple_jon",
  "sorcerer.element.air",
  "sorcerer.element.fire",
  "sorcerer.element.earth",
  "sorcerer.element.water",
  "sorcerer.celestial.saturn",
  "sorcerer.celestial.jupiter",
  "sorcerer.celestial.mars",
  "sorcerer.celestial.venus",
  "sorcerer.celestial.mercury",
  "sorcerer.celestial.luna",
  "sorcerer.celestial.neptune",
  "sorcerer.celestial.sol",
  "sorcerer.celestial.sulfur",
] as const;

export const DRAFT4_V1_SOURCE_LORE_TOPIC_IDS = [
  "history.present_age",
  "history.restoration",
  "history.age_of_darkness",
  "history.age_of_silks",
  "history.golden_age",
  "history.foundation",
  "history.tragedies",
  "history.time_before",
  "faith.western_pyrism",
  "faith.urite_polytheism",
  "faith.hecarian_philosophism",
  "faith.faith_of_the_nameless",
  "faith.druji_pseudofaith",
  "faith.ymosites",
  "foreign.triarchy_of_ur",
  "foreign.elpenors_kingdom",
  "foreign.hrotingmen",
  "foreign.druj_lands",
  "hell.mutterheep",
  "hell.paradise",
  "hell.carceri",
  "hell.eternity_forge",
  "hell.mirasta",
  "hell.toyland",
  "hell.old_college",
  "hell.anselion",
  "hell.misery",
  "mythic.hundred_handed_isle",
  "mythic.castle_in_sky",
  "mythic.court_of_king_typhon",
  "mythic.bottom_of_world",
  "mythic.twin_goblin_courts",
  "mythic.kingdom_of_simple_jon",
  "celestial.saturn",
  "celestial.jupiter",
  "celestial.mars",
  "celestial.venus",
  "celestial.mercury",
  "celestial.luna",
  "celestial.neptune",
  "celestial.sol",
  "celestial.sulfur",
] as const;

export const DRAFT4_V1_SOURCE_LORE_COLLECTIONS_RAW = [
  {
    sourceCollectionId: "necromancer.home.graven_isle",
    subjectKind: "isle",
    binding: {
      strategy: "wizard_home_isle",
      pactSeatId: "necromancer",
    },
    attribution: {
      work: "Codex 1. Necromancer [Draft 4]",
      pages: "10-11",
      anchor: "Secrets of the Graven Isle",
    },
    bindingRequirement: "Bind once to the canonical Graven Isle World IsleId created by the established Necromancer/World setup; never label-match or retarget.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Graven Isle is a cold and miserable place, covered in dark clouds and filled with countless memorials to the dead.",
      },
      {
        sourceEntryId: "e02",
        text: "For as long as anyone can remember, the Graven Isle has been the burial grounds for all of Isha's dead, and its catacombs run deep into the bottom of the world.",
      },
      {
        sourceEntryId: "e03",
        text: "The Graven Isle was once a beautiful place and the heart of Isha, before magical war destroyed its towers and plunged the landscape into ruin.",
      },
      {
        sourceEntryId: "e04",
        text: "A long-ago Necromancer was responsible for the desolation of the Graven Isle, and Necromancers dwell here still in exile from the archipelago.",
      },
      {
        sourceEntryId: "e05",
        text: "No one else dares to live upon the Graven Isle, save Ghoul-Callers, smugglers, and the diseased.",
      },
    ],
  },
  {
    sourceCollectionId: "necromancer.sanctum.crypt",
    subjectKind: "place",
    binding: {
      strategy: "wizard_sanctum_place",
      pactSeatId: "necromancer",
    },
    attribution: {
      work: "Codex 1. Necromancer [Draft 4]",
      pages: "10-11",
      anchor: "The Necromancer's Crypt sits",
    },
    bindingRequirement: "Bind once to the canonical Necromancer Crypt/World PlaceId from established Wizard/World setup; never retarget on succession/home change.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Necromancer's crypt was once the Imperial Palace of Isha, although now it's a rain-soaked ruin.",
      },
      {
        sourceEntryId: "e02",
        text: "The walls of the crypt are cold stone carved with the memories of the dead, the stairways worn away by time, filled with secret passageways which have not seen light in hundreds of years.",
      },
      {
        sourceEntryId: "e03",
        text: "The halls of the crypt are lined with the eerie statues of the dead, which in many places plunge beneath the water or are propped up by grim piles of bones.",
      },
      {
        sourceEntryId: "e04",
        text: "The central room is a funerary space where the dead are brought from the other isles and left for you to take care of.",
      },
      {
        sourceEntryId: "e05",
        text: "Your living chambers are dreary and uncomfortable, with any living occupants an obvious afterthought.",
      },
    ],
  },
  {
    sourceCollectionId: "hierophant.home.ishana",
    subjectKind: "isle",
    binding: {
      strategy: "wizard_home_isle",
      pactSeatId: "hierophant",
    },
    attribution: {
      work: "Codex 2. Hierophant [Draft 4]",
      pages: "11-12",
      anchor: "Secrets of Ishana",
    },
    bindingRequirement: "Bind once to canonical Ishana World IsleId.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Ishana is a central mountainous island surrounded by up to fifty smaller islands, ranging from just large enough to support a single home to a sprawling landscape in its own right.",
      },
      {
        sourceEntryId: "e02",
        text: "The center of Ishana is The Blue City, named for the brilliantly blue shingles and lapis lazuli paints which decorate nearly every building in the city, alongside murals of the seas and skies.",
      },
      {
        sourceEntryId: "e03",
        text: "The northern forests of Ishana are an important source of lumber for constructing new ships, and an especially vulnerable region to the pirates of Scuttleport.",
      },
      {
        sourceEntryId: "e04",
        text: "The Chalk Cliffs of Ishana, which run along its eastern face, are home to goatherders, farmers, and hermits, and legends tell of forbidden religions practiced in those isolated communities.",
      },
      {
        sourceEntryId: "e05",
        text: "The southernmost island of Ishana is the sacred isle Tahv, a place of black beaches and a thousand shrines, and welcome only to those permitted in the light of the Immortal Flame.",
      },
    ],
  },
  {
    sourceCollectionId: "hierophant.sanctum.hall",
    subjectKind: "place",
    binding: {
      strategy: "wizard_sanctum_place",
      pactSeatId: "hierophant",
    },
    attribution: {
      work: "Codex 2. Hierophant [Draft 4]",
      pages: "11-12",
      anchor: "The Hierophant's Hall sits",
    },
    bindingRequirement: "Bind once to canonical Hierophant Hall World PlaceId.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The sanctum of the Hierophant is narrow and cramped, with winding staircases and cramped halls.",
      },
      {
        sourceEntryId: "e02",
        text: "The walls are covered in visual signs of the eccentricities of previous Hierophants, from sweat and blood to prophecies carved into the stone, and it is considered blasphemy to even suggest cleaning them.",
      },
      {
        sourceEntryId: "e03",
        text: "The Hall is only accessible via a small waterlogged path that floods at high tide, which leaves it both beautiful and frustratingly hard to travel to.",
      },
      {
        sourceEntryId: "e04",
        text: "Pilgrims are constantly coming by to request miracles and assistance with whatever minor problem is beleaguering them on their journeys.",
      },
      {
        sourceEntryId: "e05",
        text: "No one has mapped the sanctum's basement, its tangled stairways connecting with the catacombs beneath Ishana, and strange monsters rattle down there at night.",
      },
    ],
  },
  {
    sourceCollectionId: "warlock.home.halcyon_isles",
    subjectKind: "isle",
    binding: {
      strategy: "wizard_home_isle",
      pactSeatId: "warlock",
    },
    attribution: {
      work: "Codex 3. Warlock [Draft 4]",
      pages: "10-11",
      anchor: "Secrets of the Halcyon Isles",
    },
    bindingRequirement: "Bind once to canonical Halcyon Isles World IsleId.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Halcyon Isles are a beautiful and serene place, with rolling hills, sprawling gardens, and groves of carefully-tended trees tucked away amid its towering cliffs.",
      },
      {
        sourceEntryId: "e02",
        text: "The Castle of the King looks over the Halcyon Isles, an enormous structure of great hewn stone and bearing countless towers and parapets overlooking the southern seas.",
      },
      {
        sourceEntryId: "e03",
        text: "It is rumored the palace was built by giants, for the doorways are far too large for any man and the stairs had to be carved anew. Generations of kings have further added to the castle, with incongruous and spectacular new wings.",
      },
      {
        sourceEntryId: "e04",
        text: "The largest settlement in the Halcyon Isles is the city of Kingsport, inhabited mostly by servants and merchants who exist solely to cater to the nobility as a rustic vacation town.",
      },
      {
        sourceEntryId: "e05",
        text: "The Halcyon Isles require incredible amounts of produce and manpower from the rest of the archipelago in order to maintain the hedonistic lifestyle of the nobles who dwell there.",
      },
    ],
  },
  {
    sourceCollectionId: "warlock.sanctum.keep",
    subjectKind: "place",
    binding: {
      strategy: "wizard_sanctum_place",
      pactSeatId: "warlock",
    },
    attribution: {
      work: "Codex 3. Warlock [Draft 4]",
      pages: "10-11",
      anchor: "The Warlock's Keep is",
    },
    bindingRequirement: "Bind once to canonical Warlock Keep World PlaceId.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The keep of the Warlock is musty and minimalist, maintained by servants too afraid to move anything that could be valuable.",
      },
      {
        sourceEntryId: "e02",
        text: "The keep is enormous and uncomfortable, with ceilings too tall for any human and doorways made for giants.",
      },
      {
        sourceEntryId: "e03",
        text: "The keep is covered in tapestries and trophies of wars long forgotten, surrounding you with your own inadequacy.",
      },
      {
        sourceEntryId: "e04",
        text: "A bridge runs from the palace directly to your sleeping chambers, allowing the King to fetch you at his whims.",
      },
      {
        sourceEntryId: "e05",
        text: "Traps prepared by paranoid Warlocks previous to you litter the lower floors and walls, and you must tread carefully, lest you accidentally set one of them off.",
      },
    ],
  },
  {
    sourceCollectionId: "mariner.home.far_reach",
    subjectKind: "isle",
    binding: {
      strategy: "mariner_board_isle",
      boardIsleId: "far_reach",
    },
    attribution: {
      work: "Codex 4. Mariner [Draft 4]",
      pages: "10-11",
      anchor: "Secrets of Far Reach",
    },
    bindingRequirement: "Bind once to canonical Far Reach World IsleId via established Mariner board/World mapping.",
    discrepancyNotes: [
      "Mariner Part VI Far Reach points back to the Mariner's own Lore. There is no second Mariner-delegated Far Reach source collection.",
    ],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Far Reach is an isolated place, its people hardy and tough sailors wrinkled by salt, the sharp cliffs offering little protection from the elements.",
      },
      {
        sourceEntryId: "e02",
        text: "The people of Far Reach consider themselves independent from the Kingdom of Isha, although the ownership of that land is constantly disputed. Nominally they are ruled by the nearby Duchy of Thyras.",
      },
      {
        sourceEntryId: "e03",
        text: "Most of the Far Reach is uninhabited by humans, overgrown with small trees and with strange magical beings lurking behind every rock.",
      },
      {
        sourceEntryId: "e04",
        text: "The docks of the Far Reach are an important trading hub for the rest of Isha, selling Thyrian purple dye in exchange for Ishanian parchment and Urite figs, but life is still meager for most who live there.",
      },
      {
        sourceEntryId: "e05",
        text: "A lonely lighthouse sits at the edge of the furthest cliff in Far Reach, and although no one dares go near it, the light continues to glow. It is where the Mariner docks his ship.",
      },
    ],
  },
  {
    sourceCollectionId: "mariner.sanctum.ship",
    subjectKind: "place",
    binding: {
      strategy: "mariner_ship_place",
    },
    attribution: {
      work: "Codex 4. Mariner [Draft 4]",
      pages: "10-11",
      anchor: "The Mariner's Ship docks",
    },
    bindingRequirement: "Bind once to canonical Mariner Ship/Lighthouse Sanctum World PlaceId.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Mariner once manned a far mightier ship, but a distant ancestor's rebellion against the Pact led to its destruction. His ship is smaller now, and it's a reminder of that humiliation.",
      },
      {
        sourceEntryId: "e02",
        text: "The ship is small and leaky, its walls made from cheap wood and patched up over the course of a hundred years, with barely enough room for you and your companions.",
      },
      {
        sourceEntryId: "e03",
        text: "The ship is weighed down by generations of Mariners leaving magical (or sometimes not-so-magical) detritus below deck, filling it up with trash and binding the wood with useless spells.",
      },
      {
        sourceEntryId: "e04",
        text: "The ship's sail depicts a massive eye, staring out at the sea. It was chosen by a Mariner long ago, and while it represents your office, it has no relation to you.",
      },
      {
        sourceEntryId: "e05",
        text: "Your living chambers are cold and miserable, a stiff barracks lacking any of the decadence of your fellow wizards.",
      },
    ],
  },
  {
    sourceCollectionId: "faustian.home.scuttleport",
    subjectKind: "isle",
    binding: {
      strategy: "wizard_home_isle",
      pactSeatId: "faustian",
    },
    attribution: {
      work: "Codex 5. Faustian [Draft 4]",
      pages: "10-11",
      anchor: "Secrets of Scuttleport",
    },
    bindingRequirement: "Bind once to canonical Scuttleport World IsleId.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Scuttleport is a rotten slum, filled with crooked criminals, dangerous sewer-cults, and gangs of thieves looking to make a name for themselves.",
      },
      {
        sourceEntryId: "e02",
        text: "Scuttleport was once a small cove, but over centuries of shipwrecks has grown to an impossible size, the wooden beams of ancient hulls forming the scaffolding for the labyrinthine city.",
      },
      {
        sourceEntryId: "e03",
        text: "Scuttleport is a treacherous place to traverse, with many of its shanty buildings half-flooded and many of its wooden roads rotten to the touch, and if you don't know where you're going you're certain to die.",
      },
      {
        sourceEntryId: "e04",
        text: "Scuttleport, while technically ruled by the King of Isha, is in practice its own nation, governed by the Pirate-Lords who operate its gambling halls and opium dens.",
      },
      {
        sourceEntryId: "e05",
        text: "A teeming black market works through Scuttleport, smuggling countless illegal reagents, narcotics, arcane tomes, and dark magics in and out of Isha, much to the bane of the Pact.",
      },
    ],
  },
  {
    sourceCollectionId: "faustian.sanctum.bilgewater_inn",
    subjectKind: "place",
    binding: {
      strategy: "wizard_sanctum_place",
      pactSeatId: "faustian",
    },
    attribution: {
      work: "Codex 5. Faustian [Draft 4]",
      pages: "10-11",
      anchor: "The Faustian's Inn sits",
    },
    bindingRequirement: "Bind once to canonical Bilgewater Inn/Faustian Sanctum World PlaceId.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "It's called the Bilgewater Inn, with a cockerel and a goat atop its old signage, and while it was once a respectable establishment with a lively crew, it's now a decrepit ruin of its former glory.",
      },
      {
        sourceEntryId: "e02",
        text: "The walls of the Bilgewater Inn are covered in old posters and graffiti commemorating the past and reminding you of your failed ambitions.",
      },
      {
        sourceEntryId: "e03",
        text: "The stage at the back of the Bilgewater Inn is always welcome for the Faustian to perform, but the few customers know his cursed reputation, and regard it poorly.",
      },
      {
        sourceEntryId: "e04",
        text: "The Faustian always has a room at the Inn, paid for by the Devil a thousand years ago, but he's considered a bad omen, and housekeeping never cleans Room 333.",
      },
      {
        sourceEntryId: "e05",
        text: "Your living chambers are cramped and miserable, full of bedbugs and rats.",
      },
    ],
  },
  {
    sourceCollectionId: "sage.home.moonlit_atoll",
    subjectKind: "isle",
    binding: {
      strategy: "wizard_home_isle",
      pactSeatId: "sage",
    },
    attribution: {
      work: "Codex 6. Sage [Draft 4]",
      pages: "10-11",
      anchor: "Secrets of the Moonlit Atoll",
    },
    bindingRequirement: "Bind once to canonical Sage-atoll World IsleId. Preserve source naming discrepancy: Sage owner text says Moonlit Atoll; Mariner Part VI says Starlit Atoll; application already uses neutral mapping where established.",
    discrepancyNotes: [
      "Sage owner Codex calls the Isle Moonlit Atoll. Mariner Part VI says Starlit Atoll. Application uses the established neutral sage_atoll mapping.",
    ],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Moonlit Atoll is a sprawling atoll, surrounded by dense reefs and strange turbulent winds. While the water at its center is calm, it's nearly impossible to approach it via ship without knowledge of its particular eddies and sandbars.",
      },
      {
        sourceEntryId: "e02",
        text: "The Moonlit Atoll is covered in thick woodlands, the oldest and most sacred trees in Isha, and is filled with exotic wildlife of odd sizes, native only to this specific Atoll.",
      },
      {
        sourceEntryId: "e03",
        text: "The shore of the Isle is composed of lagoons inhabited by all kinds of sealife, which feed into a network of caves that hollow out the Isle, inhabited by solitude-seeking hermits and fairies.",
      },
      {
        sourceEntryId: "e04",
        text: "Magical spirits live within the Moonlit Atoll, its mountain peaks inhabited by quiet trolls, and colonies of goblins and sprites fill its woods.",
      },
      {
        sourceEntryId: "e05",
        text: "The Moonlit Atoll is incredibly dangerous for those who don't know its paths, made worse by the traps prepared by mean-spirited pixies or paranoid hermits.",
      },
    ],
  },
  {
    sourceCollectionId: "sage.sanctum.grotto",
    subjectKind: "place",
    binding: {
      strategy: "wizard_sanctum_place",
      pactSeatId: "sage",
    },
    attribution: {
      work: "Codex 6. Sage [Draft 4]",
      pages: "10-11",
      anchor: "The Sage's Grotto",
    },
    bindingRequirement: "Bind once to canonical Sage Grotto World PlaceId.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Grotto is an artificial cave, covered in stalactites and moss, and always damp and cold no matter the weather outside.",
      },
      {
        sourceEntryId: "e02",
        text: "One must navigate through waterfalls and cliffside paths in order to reach the Grotto, dodging traps built by previous Sages in states of madness, and it is expected all Sages can walk this path from memory.",
      },
      {
        sourceEntryId: "e03",
        text: "Moss, lichen, starfish, and strange ocean creatures cover the walls of the Grotto, and the floor is covered in guano left by migratory colonies of bats.",
      },
      {
        sourceEntryId: "e04",
        text: "The Sage's living chambers are a small and damp bed in a tent in the corner of the Grotto, with only the essentials tucked into waterproof satchels around him.",
      },
      {
        sourceEntryId: "e05",
        text: "The majority of the Grotto is dominated by the Eternity Well, a perfect circle filled with water, the place where the fallen star punched a hole between the waking and dreaming worlds.",
      },
    ],
  },
  {
    sourceCollectionId: "sorcerer.home.spyrholm",
    subjectKind: "isle",
    binding: {
      strategy: "sorcerer_spyrholm_isle",
    },
    attribution: {
      work: "Codex 7. Sorcerer [Draft 4]",
      pages: "11-12",
      anchor: "Secrets of Spyrholm",
    },
    bindingRequirement: "Bind once using existing SorcererState.spyrholmIsleId, not name/current home ownership.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Spyrholm is a rocky isle, with jagged cliffs and sparse shrubland. It is inhabited by herds of sheep, gulabi goats, and seals, with the occasional migratory flock of birds settling down onto its rocks.",
      },
      {
        sourceEntryId: "e02",
        text: "There is a small population of native shepherds and fishermen in Spyrholm, shorter in stock than most Ishanians, who speak their own language and stay far away from Wizards.",
      },
      {
        sourceEntryId: "e03",
        text: "Researchers, aspiring Wizards, and servants of the Sorcerer have constructed a College in Spyrholm Bay, which has formed into a college town of sorts, and a captive audience of the Sorcerer.",
      },
      {
        sourceEntryId: "e04",
        text: "Scraps of information collected from the Sorcerer are replicated and taught in Spyrholm Bay and used to inform scholarly learning across the Faraway Sea, and the Scholars there have formed into a university structure of their own creation.",
      },
      {
        sourceEntryId: "e05",
        text: "It is possible to see the Sorcerer's Tower from every point in Spyrholm, which leads some to suspect the isle itself was carefully designed to highlight its enormity reaching up into the sky.",
      },
    ],
  },
  {
    sourceCollectionId: "sorcerer.sanctum.tower",
    subjectKind: "place",
    binding: {
      strategy: "sorcerer_tower_place",
    },
    attribution: {
      work: "Codex 7. Sorcerer [Draft 4]",
      pages: "11-12",
      anchor: "The Sorcerer's Tower sits",
    },
    bindingRequirement: "Bind once using existing SorcererState.towerPlaceId, not labels/current ownership.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Sorcerer’s Library runs deep within the Tower and beneath Spyrholm, a tangled labyrinth of books and scholars trying desperately to keep it in order.",
      },
      {
        sourceEntryId: "e02",
        text: "Due to obscure and esoteric agreements between the King and the Sorcerer, every book ever legally published in Isha has a copy somewhere in the Tower, and every week a ship arrives bearing yet more books for its troves.",
      },
      {
        sourceEntryId: "e03",
        text: "The stench of its mildewing tomes is overwhelming for those unfamiliar to the archive, and the Library is haunted by shadowy creatures both arcane and mundane.",
      },
      {
        sourceEntryId: "e04",
        text: "Rival sects of librarians lay claim to various corners of the Tower in your honor, and there is no shared system of governance or categorization.",
      },
      {
        sourceEntryId: "e05",
        text: "Your own chambers are cramped and covered in half-finished books, tucked away in a dismal and dreary corner of your own Library.",
      },
    ],
  },
  {
    sourceCollectionId: "necromancer.gate.amber",
    subjectKind: "necromancer_gate",
    binding: {
      strategy: "necromancer_builtin_gate",
      gateId: "amber",
    },
    attribution: {
      work: "Codex 1. Necromancer [Draft 4]",
      pages: "40-41",
      anchor: "I. The Amber Gate",
    },
    bindingRequirement: "Bind once to the exact established NecromancerGateId for this built-in Gate; campaign-created Gates use campaign collections instead.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Amber Gate is a massive edifice made of thick glossy stone. Massive creatures from ancient times can be seen frozen within its walls.",
      },
      {
        sourceEntryId: "e02",
        text: "The Amber Gate is surrounded by harsh sands, and the paths leading to and from the Gate are well-worn by the countless steps of the dead.",
      },
      {
        sourceEntryId: "e03",
        text: "The Amber Gate is guarded by massive stone sphinxes, and in its walls refugees have bored holes and built cities amongst the amber.",
      },
    ],
  },
  {
    sourceCollectionId: "necromancer.gate.bronze",
    subjectKind: "necromancer_gate",
    binding: {
      strategy: "necromancer_builtin_gate",
      gateId: "bronze",
    },
    attribution: {
      work: "Codex 1. Necromancer [Draft 4]",
      pages: "41",
      anchor: "II. The Bronze Gate",
    },
    bindingRequirement: "Bind once to the exact established NecromancerGateId for this built-in Gate; campaign-created Gates use campaign collections instead.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Bronze Gate is a mighty and awe-imposing doorway, forged by an unknown master in bygone years, and equipped with furious battlements.",
      },
      {
        sourceEntryId: "e02",
        text: "The Bronze Gate is surrounded by pock-marked wasteland, and the paths leading to and from the Gate resemble military trenches.",
      },
      {
        sourceEntryId: "e03",
        text: "The Bronze Gate is guarded by a legion of brass soldiers who cannot leave their perches, and who treat any Necromancers with harsh distance.",
      },
    ],
  },
  {
    sourceCollectionId: "necromancer.gate.lead",
    subjectKind: "necromancer_gate",
    binding: {
      strategy: "necromancer_builtin_gate",
      gateId: "lead",
    },
    attribution: {
      work: "Codex 1. Necromancer [Draft 4]",
      pages: "41",
      anchor: "III. The Lead Gate",
    },
    bindingRequirement: "Bind once to the exact established NecromancerGateId for this built-in Gate; campaign-created Gates use campaign collections instead.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Lead Gate is a small and inconspicuous Gate, hidden in the deepest catacombs beneath the Graven Isle. It is engraved with the secret sigils of each Necromancer who has watched over it.",
      },
      {
        sourceEntryId: "e02",
        text: "The Lead Gate is surrounded by mist and darkness, and is connected to the other Gates by tangled catacombs haunted by the ruins of the dead.",
      },
      {
        sourceEntryId: "e03",
        text: "The Lead Gate has been left unguarded, leaving it a popular option for Ghoul-Callers looking for an easy entrance into death.",
      },
    ],
  },
  {
    sourceCollectionId: "necromancer.gate.ivory",
    subjectKind: "necromancer_gate",
    binding: {
      strategy: "necromancer_builtin_gate",
      gateId: "ivory",
    },
    attribution: {
      work: "Codex 1. Necromancer [Draft 4]",
      pages: "41-42",
      anchor: "IV. The Ivory Gate",
    },
    bindingRequirement: "Bind once to the exact established NecromancerGateId for this built-in Gate; campaign-created Gates use campaign collections instead.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Ivory Gate is an elegant Gate carved from the bones of ancient whales. The silence of their song echoes through the massive keratin plates.",
      },
      {
        sourceEntryId: "e02",
        text: "The Ivory Gate is embedded in an enormous glacier, and the paths leading from the Gate are carved by freezing winds and storming seas.",
      },
      {
        sourceEntryId: "e03",
        text: "The wreckage of ships and serpentine bones have been crafted together by gangs of lost pirates, forming a spectral city at the glacier's edge called Mulgragnif.",
      },
    ],
  },
  {
    sourceCollectionId: "necromancer.gate.antimony",
    subjectKind: "necromancer_gate",
    binding: {
      strategy: "necromancer_builtin_gate",
      gateId: "antimony",
    },
    attribution: {
      work: "Codex 1. Necromancer [Draft 4]",
      pages: "42",
      anchor: "V. The Antimony Gate",
    },
    bindingRequirement: "Bind once to the exact established NecromancerGateId for this built-in Gate; campaign-created Gates use campaign collections instead.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Antimony Gate is an alien shimmering structure made from pearlescent metal and surrounded by the ruins of a lost civilization.",
      },
      {
        sourceEntryId: "e02",
        text: "Legends say the Antimony Gate was once built by wizards, but whatever purpose it once held has been lost. It stands alone, with nothing beside remaining.",
      },
      {
        sourceEntryId: "e03",
        text: "The Antimony Gate is guarded by massive stone constructs, faceless giants who grasp at the grave-robbers who hope to steal some piece of ancient magical knowledge.",
      },
    ],
  },
  {
    sourceCollectionId: "necromancer.gate.marching",
    subjectKind: "necromancer_gate",
    binding: {
      strategy: "necromancer_builtin_gate",
      gateId: "marching",
    },
    attribution: {
      work: "Codex 1. Necromancer [Draft 4]",
      pages: "42",
      anchor: "VI. The Marching Gate",
    },
    bindingRequirement: "Bind once to the exact established NecromancerGateId for this built-in Gate; campaign-created Gates use campaign collections instead.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Marching Gate lies in a cold and cruel desert with countless long canyons carved into its surface, formed from the droning footsteps of the great lines of the marching dead.",
      },
      {
        sourceEntryId: "e02",
        text: "All imperfections are shaved away by the Marching Gate; all differences between image and truth are worn down by footsteps. This can be a blessing or a curse, depending on a soul's delusions.",
      },
      {
        sourceEntryId: "e03",
        text: "Flocks of wicked harpies linger at the edges of the Marching Gate, stealing away stragglers to transform into sentient weaponry to sell at their fairy markets.",
      },
    ],
  },
  {
    sourceCollectionId: "necromancer.gate.churning",
    subjectKind: "necromancer_gate",
    binding: {
      strategy: "necromancer_builtin_gate",
      gateId: "churning",
    },
    attribution: {
      work: "Codex 1. Necromancer [Draft 4]",
      pages: "42-43",
      anchor: "VII. The Churning Gate",
    },
    bindingRequirement: "Bind once to the exact established NecromancerGateId for this built-in Gate; campaign-created Gates use campaign collections instead.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Churning Gate is a whirling maelstrom of wicked winds that hurl huge pillars of ice and salt through the air.",
      },
      {
        sourceEntryId: "e02",
        text: "The more forcefully one tries to move through the Churning Gate, the harsher the winds cut into you — only those completely at peace may pass through without harm.",
      },
      {
        sourceEntryId: "e03",
        text: "Giant insects called Chronophage trawl the Churning Gate, each carrying under their carapaces a town of ghouls seeking shelter from the winds.",
      },
    ],
  },
  {
    sourceCollectionId: "necromancer.gate.weeping",
    subjectKind: "necromancer_gate",
    binding: {
      strategy: "necromancer_builtin_gate",
      gateId: "weeping",
    },
    attribution: {
      work: "Codex 1. Necromancer [Draft 4]",
      pages: "43",
      anchor: "VIII. The Weeping Gate",
    },
    bindingRequirement: "Bind once to the exact established NecromancerGateId for this built-in Gate; campaign-created Gates use campaign collections instead.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Weeping Gate is a dizzying spire that runs from one end of eternity to the other, with a narrow spiral staircase wrapping around the inner wall.",
      },
      {
        sourceEntryId: "e02",
        text: "The Weeping Gate's walls are a series of interlocking mirror realities that crumble those of weak will to dust.",
      },
      {
        sourceEntryId: "e03",
        text: "Nests of angels adorn the windows dotted across the Weeping Gate and their feathers dot the stairs. The Angels appear to be in a mode of silent grieving, but no one knows what they mourn.",
      },
    ],
  },
  {
    sourceCollectionId: "necromancer.gate.howling",
    subjectKind: "necromancer_gate",
    binding: {
      strategy: "necromancer_builtin_gate",
      gateId: "howling",
    },
    attribution: {
      work: "Codex 1. Necromancer [Draft 4]",
      pages: "43",
      anchor: "IX. The Howling Gate",
    },
    bindingRequirement: "Bind once to the exact established NecromancerGateId for this built-in Gate; campaign-created Gates use campaign collections instead.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Howling Gate is a rotting maw of flesh and bone, a thousand miles wide and filled with dangling spines and grasping claws, a pustule of hate upon the side of the universe.",
      },
      {
        sourceEntryId: "e02",
        text: "Those who lacked physical strength or confidence in life are dragged into the Howling Gate to become yet another skeleton lining its walls — only those strong enough may pass.",
      },
      {
        sourceEntryId: "e03",
        text: "The Howling Gate is bottomless, but it is said that at its bottom lies the primordial void of creation, the source of all nameless things which resent both the living and the dead.",
      },
    ],
  },
  {
    sourceCollectionId: "necromancer.gate.deep",
    subjectKind: "necromancer_gate",
    binding: {
      strategy: "necromancer_builtin_gate",
      gateId: "deep",
    },
    attribution: {
      work: "Codex 1. Necromancer [Draft 4]",
      pages: "44",
      anchor: "X. The Deep Gate",
    },
    bindingRequirement: "Bind once to the exact established NecromancerGateId for this built-in Gate; campaign-created Gates use campaign collections instead.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Deep Gate is a labyrinth of sewer grates, damp stairways, and cruel ancient architecture, filled with deep pools of stagnant water.",
      },
      {
        sourceEntryId: "e02",
        text: "The dead who seek a final rest may pass through quickly, but for those who hope to someday return to life may take decades to navigate its tangled halls.",
      },
      {
        sourceEntryId: "e03",
        text: "Many of the most monstrous dead lurk in the deepest halls of the Gate, feasting on lesser dead to prolong their half-lives and extend their chances of crawling back up to the surface.",
      },
    ],
  },
  {
    sourceCollectionId: "necromancer.gate.terminus",
    subjectKind: "necromancer_gate",
    binding: {
      strategy: "necromancer_builtin_gate",
      gateId: "terminus",
    },
    attribution: {
      work: "Codex 1. Necromancer [Draft 4]",
      pages: "44",
      anchor: "XI. Terminus",
    },
    bindingRequirement: "Bind once to the exact established NecromancerGateId for this built-in Gate; campaign-created Gates use campaign collections instead.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Terminus is a forest of gentle fruit trees and rolling hills, with the occasional broken column from some forgotten society.",
      },
      {
        sourceEntryId: "e02",
        text: "The fruits of Terminus are fruits of forgetting — those who feast upon them cannot remember anything of who they used to be.",
      },
      {
        sourceEntryId: "e03",
        text: "Through Terminus lies the final death, which none has ever returned from. No Necromancer knows what lies beyond.",
      },
    ],
  },
  {
    sourceCollectionId: "necromancer.history.present_age",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "history.present_age",
    },
    attribution: {
      work: "Codex 1. Necromancer [Draft 4]",
      pages: "45",
      anchor: "The Present Age",
    },
    bindingRequirement: "Finite source topic history.present_age; no runtime entity required. Preserve printed attribution and epistemic context; baseline inclusion is not objective truth.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Pauper’s Revolution is violently suppressed.",
      },
      {
        sourceEntryId: "e02",
        text: "Ishana is devastated by plague and famine.",
      },
      {
        sourceEntryId: "e03",
        text: "The current King of Isha is crowned.",
      },
      {
        sourceEntryId: "e04",
        text: "The Second War of the West is fought, ending in the Free Dutchy’s independence.",
      },
      {
        sourceEntryId: "e05",
        text: "The Free Dutchy of Far Reach declares itself an independent nation.",
      },
      {
        sourceEntryId: "e06",
        text: "The previous King of Isha is crowned.",
      },
      {
        sourceEntryId: "e07",
        text: "Clan Oshrani arrives to Isha and brings great wealth with them.",
      },
      {
        sourceEntryId: "e08",
        text: "Hrotingmen raid the northern isles of Isha.",
      },
    ],
  },
  {
    sourceCollectionId: "necromancer.history.restoration",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "history.restoration",
    },
    attribution: {
      work: "Codex 1. Necromancer [Draft 4]",
      pages: "45-46",
      anchor: "The Restoration of the Pact",
    },
    bindingRequirement: "Finite source topic history.restoration; no runtime entity required. Preserve printed attribution and epistemic context; baseline inclusion is not objective truth.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Chronicler of the King says: The emergence of the true King Alexios the Brave served to usher in a period of restoration, during which Isha was unified under a new leader once more, and the people feasted and were merry.",
      },
      {
        sourceEntryId: "e02",
        text: "The History of the Pact says: The Pact defeated the Devil’s schemes and, during the glorious days of Restoration, rebuilt much (although not all) that was lost. Although it was nothing compared to the golden age of the Pact, it was still a period of powerful magic and glory. Our present age is undeniably a pale shadow of the glory of our restoration.",
      },
      {
        sourceEntryId: "e03",
        text: "The old wise woman says: The peasant was king all along, is that so? How convenient. These Wizards are so good at weaving together their little stories to justify their return. It was a time of suffering and of pain. It was no different than the violence which came before.",
      },
      {
        sourceEntryId: "e04",
        text: "The Solar Eclipse upon the true King’s coronation.",
      },
      {
        sourceEntryId: "e05",
        text: "The great restoration of the Sorcerer’s Tower, and the establishment of Spyrholm University.",
      },
      {
        sourceEntryId: "e06",
        text: "The Conquest of Scuttleport and the Purge of Clan Waine.",
      },
      {
        sourceEntryId: "e07",
        text: "The Second Izorite War and the sinking of the Urite Navy by the Pact.",
      },
      {
        sourceEntryId: "e08",
        text: "The true heir to the throne of Isha is discovered, and the kingdom of Isha returns.",
      },
      {
        sourceEntryId: "e09",
        text: "The foundation of Temple Ushin, the reign of the Pontifex Hadar the Iconoclast.",
      },
      {
        sourceEntryId: "e10",
        text: "The slaying of the last Dragons by Great Atros, hero of the isles.",
      },
    ],
  },
  {
    sourceCollectionId: "necromancer.history.age_of_darkness",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "history.age_of_darkness",
    },
    attribution: {
      work: "Codex 1. Necromancer [Draft 4]",
      pages: "46-47",
      anchor: "The Age of Darkness",
    },
    bindingRequirement: "Finite source topic history.age_of_darkness; no runtime entity required. Preserve printed attribution and epistemic context; baseline inclusion is not objective truth.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Chronicler of the King says: The Age of Darkness is a stain upon the history of Isha, a period of at least five hundred years, if not more. The people of Isha lived miserable, short lives, governed by cruel tyrants and tormented by disease. The decadence of their rulers gave way to the collapse of the Ishanian Empire and a period of thoughtless war.",
      },
      {
        sourceEntryId: "e02",
        text: "The History of the Pact says: The Age of Darkness is a stain on the history of the Pact, a period in which the Devil nearly completed his masterful plan and the closest the Pact has ever reached to complete collapse. We cannot allow such a thing to come to pass again.",
      },
      {
        sourceEntryId: "e03",
        text: "The old wise woman says: A convenient boogeyman; we were too weak, and the world fell to darkness. It is easy to hide the past beneath the past, but it whispers upwards through the firmament, demanding to be known. In ancient days, there was a time when the Pact was weak, and witches brought peace to many warring kingdoms...",
      },
      {
        sourceEntryId: "e04",
        text: "The year without a moon.",
      },
      {
        sourceEntryId: "e05",
        text: "The Razing of Druntyr, when furious peasants arrived in their thousands to slaughter multiple Wizards of the Pact.",
      },
      {
        sourceEntryId: "e06",
        text: "The Treachery of the Midnight Regime, in which a coven of witches manipulate the lords of Isha to create an empire amid its ashes.",
      },
      {
        sourceEntryId: "e07",
        text: "The Wars to the North, when the great hrotingmen horde of Jarl Agassun ransacked the Orrery and stole the original thrones.",
      },
      {
        sourceEntryId: "e08",
        text: "The loss of the Ishanian Crown, and descent of the Isles into petty conflict amongst rival clans.",
      },
      {
        sourceEntryId: "e09",
        text: "The Schism of the Flame, in which multiple pretenders declare themselves Hierophant and false prophets emerge.",
      },
      {
        sourceEntryId: "e10",
        text: "The Years of Silence, when the remaining Wizards disguised their true natures from the world.",
      },
    ],
  },
  {
    sourceCollectionId: "necromancer.history.age_of_silks",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "history.age_of_silks",
    },
    attribution: {
      work: "Codex 1. Necromancer [Draft 4]",
      pages: "47-48",
      anchor: "The Age of Silks",
    },
    bindingRequirement: "Finite source topic history.age_of_silks; no runtime entity required. Preserve printed attribution and epistemic context; baseline inclusion is not objective truth.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Chronicler of the King says: The Age of Silks was a period between three hundred and six hundred years ago, during which Isha grew plump on the wealth it imported from its empire, and indulged themselves in the pleasures of a dying world. It was governed by a series of Stewards, who served the empty throne and the crown of the king.",
      },
      {
        sourceEntryId: "e02",
        text: "The History of the Pact says: The Age of Silks was a time of decadence and power, when the Wizards of the Pact lost sight of their motivation and fell deep into sodomy and lechery. It was a time of weak men, and those Wizards deserved the darkness which followed.",
      },
      {
        sourceEntryId: "e03",
        text: "The old wise woman says: Cruel men mock dreamers by saying they belong in the age of silks. Women who dream of someday joining the pact tell stories of the age of silks. Neither understand — men are always cruel. It was no different then.",
      },
      {
        sourceEntryId: "e04",
        text: "The Nazaret Meteor Shower and the slew of love poetry which emerged in its wake.",
      },
      {
        sourceEntryId: "e05",
        text: "The destruction of the New College and the loss of the School of Translocation.",
      },
      {
        sourceEntryId: "e06",
        text: "The madness of Prentice Jaris and the creation of the furthest Hell of Toyland.",
      },
      {
        sourceEntryId: "e07",
        text: "The Awakening of the Druj.",
      },
      {
        sourceEntryId: "e08",
        text: "The death of the last Emperor of Isha, the formation of the Steward Dynasty.",
      },
      {
        sourceEntryId: "e09",
        text: "The construction of Temple Krolis, the establishment of the Pyretic Orthodoxy.",
      },
      {
        sourceEntryId: "e10",
        text: "The Trial Of Lady Joan, when the false Necromancer was uncovered to be a woman, and burnt by the Pact.",
      },
    ],
  },
  {
    sourceCollectionId: "necromancer.history.golden_age",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "history.golden_age",
    },
    attribution: {
      work: "Codex 1. Necromancer [Draft 4]",
      pages: "48-49",
      anchor: "The Golden Age of the Pact",
    },
    bindingRequirement: "Finite source topic history.golden_age; no runtime entity required. Preserve printed attribution and epistemic context; baseline inclusion is not objective truth.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Chronicler of the King says: The Imperial Age of Isha was one of violence and power, as Isha expanded its holdings to encompass the Hecares to the South, all the way to Eofmark in the North. The Emperors of Isha were mighty and prosperous, in no small part due to the assistance of the Pact. It lasted for a thousand years, although some say even more.",
      },
      {
        sourceEntryId: "e02",
        text: "The History of the Pact says: The Golden Age of the Pact was a time of incredible magic and power, when us seven Wizards working together made the world what it is today. It was a time of incredible magic and power, of heroes and villains, and of incredible works of magic.",
      },
      {
        sourceEntryId: "e03",
        text: "The old wise woman says: There was never a golden age. Some part of me doubts whether the empire described in such myths is even real. It is good for these old men to have better days they may dream of.",
      },
      {
        sourceEntryId: "e04",
        text: "The Great Conjunction and the alignment of the stars.",
      },
      {
        sourceEntryId: "e05",
        text: "The Orrery is recovered from the depths of the furthest Hells, and returned to functionality.",
      },
      {
        sourceEntryId: "e06",
        text: "The Devil is imprisoned within a golden box for a thousand years.",
      },
      {
        sourceEntryId: "e07",
        text: "The role of the Mariner is formally established within the Pact, replacing its previous Watcher.",
      },
      {
        sourceEntryId: "e08",
        text: "The mighty Empire of Isha, established by King Morrog the Great, reaches its furthest extent.",
      },
      {
        sourceEntryId: "e09",
        text: "The Eruption of Mt. Ithax, the Burning of the Tahvian Library, and the establishment of the law forbidding Wizards to set foot upon the Isle.",
      },
      {
        sourceEntryId: "e10",
        text: "The creation of the island of Izor.",
      },
    ],
  },
  {
    sourceCollectionId: "necromancer.history.foundation",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "history.foundation",
    },
    attribution: {
      work: "Codex 1. Necromancer [Draft 4]",
      pages: "49",
      anchor: "The Foundation of the Pact",
    },
    bindingRequirement: "Finite source topic history.foundation; no runtime entity required. Preserve printed attribution and epistemic context; baseline inclusion is not objective truth.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Chronicler of the King says: The King of Isha, his authority granted by the god Ithax in ancient years, deigned in his generosity to permit the last seven Wizards (all others having destroyed themselves in their madness) to construct their home within his kingdom.",
      },
      {
        sourceEntryId: "e02",
        text: "The History of the Pact says: The world was lost in smoke and darkness, and from that darkness seven Wizards emerged, and with our power we established the Pact. It is a tale as old as time, foundational to our history. It has stood for thousands of years, unchanging and unbreakable.",
      },
      {
        sourceEntryId: "e03",
        text: "The old wise woman says: I was not there, I could not speak to such matters. I am cautious of any story in which a few great and powerful men claim they alone saved the world. History is not made by the head of the snake but by its body.",
      },
      {
        sourceEntryId: "e04",
        text: "The arrival of a fallen star upon Isha.",
      },
      {
        sourceEntryId: "e05",
        text: "The creation of the Grimoire and the collation of the scraps of magical knowledge saved from the Tragedies.",
      },
      {
        sourceEntryId: "e06",
        text: "The banishment of countless forgotten war machines to the furthest Hells, and the closing of the paths.",
      },
      {
        sourceEntryId: "e07",
        text: "The taming of the seas and the establishment of the archipelago of Isha.",
      },
      {
        sourceEntryId: "e08",
        text: "The Unification Wars between the Clans of Isha and the establishment of the Kingdom.",
      },
      {
        sourceEntryId: "e09",
        text: "The enshrinement of the prophets Notor and Edon, the creation of the first Hierophant of the Immortal Flame.",
      },
      {
        sourceEntryId: "e10",
        text: "The Gates of Death are sealed against the endless wave of miserable souls who lost their lives in the Tragedies.",
      },
    ],
  },
  {
    sourceCollectionId: "necromancer.history.tragedies",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "history.tragedies",
    },
    attribution: {
      work: "Codex 1. Necromancer [Draft 4]",
      pages: "50",
      anchor: "The Tragedies",
    },
    bindingRequirement: "Finite source topic history.tragedies; no runtime entity required. Preserve printed attribution and epistemic context; baseline inclusion is not objective truth.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Chronicler of the King says: The Tragedies were the end of the world, when Wizards turned against one another and brought doom to our doorstep. It lasted ten days — less than two weeks to destroy all of creation. The suffering in those times was unmatched and unspeakable.",
      },
      {
        sourceEntryId: "e02",
        text: "The History of the Pact says: The Tragedies are magic’s greatest shame and its deepest heartache. We lost more in those days than we could ever have known. Thousands of Wizards died. The world itself burned. We can never let ourselves return to such a state again.",
      },
      {
        sourceEntryId: "e03",
        text: "The old wise woman says: It only took ten days for a lover’s spat to escalate into apocalypse. There is no greater proof of men’s inability to safely wield magic. Their greed allowed the world to burn, and yet they insist on trying to shepherd it?",
      },
      {
        sourceEntryId: "e04",
        text: "The Never-Ending Massacre and the horror at the Antimony Gate.",
      },
      {
        sourceEntryId: "e05",
        text: "The Desolation of the Heavens and the slaughter of the Gods.",
      },
      {
        sourceEntryId: "e06",
        text: "The Reign of the Oneirophage and the feast of fifty-five kings.",
      },
      {
        sourceEntryId: "e07",
        text: "The Boiling of the Seas and the sundering of Isha.",
      },
      {
        sourceEntryId: "e08",
        text: "The Annihilation of Mirasta and the Nemesis event.",
      },
      {
        sourceEntryId: "e09",
        text: "The Ravaging of the Old College and the Student’s Plague.",
      },
      {
        sourceEntryId: "e10",
        text: "The Arrival of the Red Star and the Devil’s First Offer.",
      },
    ],
  },
  {
    sourceCollectionId: "necromancer.history.time_before",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "history.time_before",
    },
    attribution: {
      work: "Codex 1. Necromancer [Draft 4]",
      pages: "50-51",
      anchor: "The Time Before",
    },
    bindingRequirement: "Finite source topic history.time_before; no runtime entity required. Preserve printed attribution and epistemic context; baseline inclusion is not objective truth.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Chronicler of the King says: The King of Isha is an unbroken lineage which extends far before the Tragedies, for the crown of Isha is a sanctified one given to him by the god Ithax. They were members of the secret order of the Ergoad, who ruled as wizard-kings over the world.",
      },
      {
        sourceEntryId: "e02",
        text: "The History of the Pact says: It was a true paradise, when thousands of wizards walked the land, and built many great towers up to heaven. It was the empire of the Ergoad, a civilization built on an eternal striving forwards. The common folk knew their place beneath us, and our spires reached as high as the moon, and into the very furthest reaches of the cosmos.",
      },
      {
        sourceEntryId: "e03",
        text: "The old wise woman says: The Tragedies were an escalation of the violence which those wretched men had been orchestrating for centuries. Wizards ruled over the world as cruel kings, and there was no hope of escape.",
      },
      {
        sourceEntryId: "e04",
        text: "The discovery of the ghost-star and the development of astrology.",
      },
      {
        sourceEntryId: "e05",
        text: "The establishment of the Old College and the perfection of magic.",
      },
      {
        sourceEntryId: "e06",
        text: "The forging of the old laws and the creation of many Hells.",
      },
      {
        sourceEntryId: "e07",
        text: "The great naming of every sea, sky, and stone beneath the sun.",
      },
      {
        sourceEntryId: "e08",
        text: "The taming of the wicker-ways and the conquest of the angels.",
      },
      {
        sourceEntryId: "e09",
        text: "The teachings of the Prophets of the Immortal Flame.",
      },
      {
        sourceEntryId: "e10",
        text: "The construction of the Gates of Death. Appendix",
      },
    ],
  },
  {
    sourceCollectionId: "hierophant.temple.hestar",
    subjectKind: "hierophant_temple",
    binding: {
      strategy: "hierophant_starting_temple",
      templeId: "hestar",
    },
    attribution: {
      work: "Codex 2. Hierophant [Draft 4]",
      pages: "44",
      anchor: "Temple Hestar",
    },
    bindingRequirement: "Bind once to the corresponding stable HierophantTempleId; active/collapsed status does not rebind or erase Lore.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Temple Hestar is built at the foot of Mt. Ithax upon sacred Tahv, a mountainous and small island marked by black shores. It is made from ancient yellow brick and the only path is a narrow, easily flooded, stone bridge. It is named after a lover of Ithax, who tended to his hearth.",
      },
      {
        sourceEntryId: "e02",
        text: "Hestar is the temple where the priests and abbots of other temples are trained. Those monks who stay in Hestar reject the company of all others, spending their days in constant meditation and self-reflection upon the mysteries of the flame.",
      },
      {
        sourceEntryId: "e03",
        text: "The ancient temple is built from ochre-colored volcanic rock, which reek of brimstone and sulphur. While there were once many other temples across Tahv, Hestar is the only one remaining — the others were destroyed when Mt. Ithax erupted.",
      },
    ],
  },
  {
    sourceCollectionId: "hierophant.temple.krolis",
    subjectKind: "hierophant_temple",
    binding: {
      strategy: "hierophant_starting_temple",
      templeId: "krolis",
    },
    attribution: {
      work: "Codex 2. Hierophant [Draft 4]",
      pages: "44",
      anchor: "Temple Krolis",
    },
    bindingRequirement: "Bind once to the corresponding stable HierophantTempleId; active/collapsed status does not rebind or erase Lore.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Temple Krolis is the largest of the temples, built into the heart of Ishana and a glorious centerpiece of the city. It is made from gray stone and bears an enormous tarnished-gold dome. It is named after the priest who financed its rebuilding following its collapse during the Tragedies.",
      },
      {
        sourceEntryId: "e02",
        text: "The priests of Krolis care little for tradition or orthodoxy, and instead focus on entertaining the vast crowds who flock to the temple each month, sometimes reduced to glorified tour guides.",
      },
      {
        sourceEntryId: "e03",
        text: "The Temple Krolis is so crowded that people have been known to occasionally get trampled underfoot, and many of the shrines around the immortal flame have been worn away by generations of contact.",
      },
    ],
  },
  {
    sourceCollectionId: "hierophant.temple.notor",
    subjectKind: "hierophant_temple",
    binding: {
      strategy: "hierophant_starting_temple",
      templeId: "notor",
    },
    attribution: {
      work: "Codex 2. Hierophant [Draft 4]",
      pages: "45",
      anchor: "Temple Notor",
    },
    bindingRequirement: "Bind once to the corresponding stable HierophantTempleId; active/collapsed status does not rebind or erase Lore.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Temple Notor is a run-down temple built along the waterside of Scuttleport, a complicated added-to structure that serves as a beacon within the undercity. Its walls are made from yellowed brick and are covered with graffiti. It is named after the Prophet Notor, who guarded the flame during the Tragedies.",
      },
      {
        sourceEntryId: "e02",
        text: "The monks of Notor are dedicated to charity, preparing vast amounts of food for Scuttleport's starving populace. Many monks take on a hunger vow themselves, acting as mendicants in the streets of Ishana.",
      },
      {
        sourceEntryId: "e03",
        text: "Notor never has enough beds for everyone who needs it, can never provide everyone with what they ask for, and can never be more than a band-aid for the misery of the downtrodden underbelly of Ishana.",
      },
    ],
  },
  {
    sourceCollectionId: "hierophant.temple.zephon",
    subjectKind: "hierophant_temple",
    binding: {
      strategy: "hierophant_starting_temple",
      templeId: "zephon",
    },
    attribution: {
      work: "Codex 2. Hierophant [Draft 4]",
      pages: "45",
      anchor: "Temple Zephon",
    },
    bindingRequirement: "Bind once to the corresponding stable HierophantTempleId; active/collapsed status does not rebind or erase Lore.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Temple Zephon is the most remote of the temples, its huge stone dome has overgrown with grass and trees, and its flame exposed to the winds that buffet the Chalk Cliffs. It is named after the western wind, and some say it was once a temple to a different god.",
      },
      {
        sourceEntryId: "e02",
        text: "There are very few priests of Zephon, and they tend to be eccentrics, stylites, glossolaliacs, and hermits. They're woefully under-equipped to take care of the venerable and decrepit temple.",
      },
      {
        sourceEntryId: "e03",
        text: "The forest growing into Zephon is itself full of old magic, and the villagers of the nearby settlement of Edoch give both it and the temple a wide berth.",
      },
    ],
  },
  {
    sourceCollectionId: "hierophant.temple.ushin",
    subjectKind: "hierophant_temple",
    binding: {
      strategy: "hierophant_starting_temple",
      templeId: "ushin",
    },
    attribution: {
      work: "Codex 2. Hierophant [Draft 4]",
      pages: "45-46",
      anchor: "Temple Ushin",
    },
    bindingRequirement: "Bind once to the corresponding stable HierophantTempleId; active/collapsed status does not rebind or erase Lore.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Temple Ushin is historically the wealthiest Temple (and the newest), financed by King Alexios the Brave in honor of his mother. It overlooks the shipyards of Caravesse, and is the Temple favored by nobility across the Archipelago.",
      },
      {
        sourceEntryId: "e02",
        text: "While Hestar is the spiritual center of the Orthodoxy, Ushin is its administrative center, with the Pontifex's enormous estate and treasury located on its grounds. The priests of Ushin are wealthy and soft, frequently descended from noble families.",
      },
      {
        sourceEntryId: "e03",
        text: "Ushin is a hotbed for heretics and apostates, those who work against the orthodoxy and dream of sedition from Tahv. The vast amounts of wealth that flow through its walls are rumored to earn the nobles who bankroll it both spiritual and physical indulgences.",
      },
    ],
  },
  {
    sourceCollectionId: "hierophant.faith.western_pyrism",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "faith.western_pyrism",
    },
    attribution: {
      work: "Codex 2. Hierophant [Draft 4]",
      pages: "51-52",
      anchor: "Western Pyrism",
    },
    bindingRequirement: "Finite source topic faith.western_pyrism; no generic Faith entity introduced.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Along the marshland north of the Druj, the cold people of Eofmark practice a form of flame-worship dedicated to the 11th Prophet, who they regard as the one true teacher, and dismiss the rest.",
      },
      {
        sourceEntryId: "e02",
        text: "Their greatest basilica is home to a flame they claim to be a branch of the Immortal Flames, and no Hierophant wishes to deny this and take away their spark of hope. Their basilica (Temple Dolmot) is smaller than the Temple Notor, and younger too.",
      },
      {
        sourceEntryId: "e03",
        text: "Many Eofmarkians perform long pilgrimages to Isha to witness the beauty of the temples for themselves, and the marketplaces of Ishana make a killing on their trade.",
      },
    ],
  },
  {
    sourceCollectionId: "hierophant.faith.urite_polytheism",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "faith.urite_polytheism",
    },
    attribution: {
      work: "Codex 2. Hierophant [Draft 4]",
      pages: "52",
      anchor: "Urite Polytheism",
    },
    bindingRequirement: "Finite source topic faith.urite_polytheism; no generic Faith entity introduced.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Triarchy of Ur is a vast and spiritually multifaceted place, with enormous stone temples within every major city. These temples are allowed to host any number of idols, and the priests of Ur view themselves as caretakers of a vast pantheon, which varies from city to city.",
      },
      {
        sourceEntryId: "e02",
        text: "Within the enormous sprawling empire lives a thousand thousand different faiths, ranging from guttergods with trash idols to the great god-kings of the empire, whose tombs are massive idols which still somehow fit within the temples.",
      },
      {
        sourceEntryId: "e03",
        text: "There are a thousand thousand religions under the umbrella of Ur, including some branches of flame-worship, and some priests (falsely) claim to possess fragments of the Immortal Flame in the great city of Ur.",
      },
    ],
  },
  {
    sourceCollectionId: "hierophant.faith.hecarian_philosophism",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "faith.hecarian_philosophism",
    },
    attribution: {
      work: "Codex 2. Hierophant [Draft 4]",
      pages: "52-53",
      anchor: "Hecarian Philosophism",
    },
    bindingRequirement: "Finite source topic faith.hecarian_philosophism; no generic Faith entity introduced.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Hecares Archipelago to the south of Isha holds to a variety of spiritual practices, all tethered by a shared investment in \"philosophism,\" a way of life or approach to reason which serves as a bond between the different islands.",
      },
      {
        sourceEntryId: "e02",
        text: "Philosophism is characterized by an attachment to the material nature of objects shaped by their relationship to a higher plane of mathematical truths, known as the True Solids. This includes a fondness for the mathematical perfection of a particular kind of male human body.",
      },
      {
        sourceEntryId: "e03",
        text: "Philosophism has been at times both outlawed and embraced by their Urite conquerors, with efforts historically made to integrate the two modes of perceiving the world. Now, with war on the horizon, the Boy-King Elpenor embraces a form of atheistic philosophism, condemning old gods as polytheistic intrusions onto a more \"pure\" Hecarian lifestyle.",
      },
    ],
  },
  {
    sourceCollectionId: "hierophant.faith.faith_of_the_nameless",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "faith.faith_of_the_nameless",
    },
    attribution: {
      work: "Codex 2. Hierophant [Draft 4]",
      pages: "53",
      anchor: "Faith of the Nameless",
    },
    bindingRequirement: "Finite source topic faith.faith_of_the_nameless; no generic Faith entity introduced.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The hrotingmen of Nebelheim worship dark and nameless gods, who are each dead from their own method of execution, who are venerated with blood and twisting steel.",
      },
      {
        sourceEntryId: "e02",
        text: "The greatest is known as None-Eyes, and other gods include the Hangman (who provides wisdom), the Flensed (a harvest god), and the Scaphist (who tends to their boats). They are called by their titles, for their true names were lost when they died.",
      },
      {
        sourceEntryId: "e03",
        text: "The Nameless Faith is taught by the wise-women of the hrotingmen, who claim that the gods were themselves killed by their greatest warriors during a great and powerful raid, and possess some artifacts of their death still.",
      },
    ],
  },
  {
    sourceCollectionId: "hierophant.faith.druji_pseudofaith",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "faith.druji_pseudofaith",
    },
    attribution: {
      work: "Codex 2. Hierophant [Draft 4]",
      pages: "53-54",
      anchor: "Druji Pseudofaith",
    },
    bindingRequirement: "Finite source topic faith.druji_pseudofaith; no generic Faith entity introduced.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Drujites are openly atheistic, and yet still engage in a complicated hierarchical religious practice, which they explain is dedicated to \"the absence of a god.\"",
      },
      {
        sourceEntryId: "e02",
        text: "The Druj will build empty altars and abandoned temples, reciting ancient texts in their dense and necrotic tongue, and yet deny the presence of meaning — only the endless monotony of life and the escape of death.",
      },
      {
        sourceEntryId: "e03",
        text: "Drujite religion is inscrutable to outsiders (and some suspect intentionally so), its practice limited to their corpse-ports and the ghoul-callers who adhere themselves to their creed. Despite this, anxieties about \"drujite cults\" have been used to justify religious violence.",
      },
    ],
  },
  {
    sourceCollectionId: "hierophant.faith.ymosites",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "faith.ymosites",
    },
    attribution: {
      work: "Codex 2. Hierophant [Draft 4]",
      pages: "54",
      anchor: "Ymosites",
    },
    bindingRequirement: "Finite source topic faith.ymosites; no generic Faith entity introduced.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Ymosites worship the gods who came before, the oldest gods of stone and moss, who sculpted Isha long before the Immortal Flames were lit. Their greatest deity is the Leviathan, who slumbers beneath the sea.",
      },
      {
        sourceEntryId: "e02",
        text: "The Ymosites are loathed in Isha, and accusations of their practice are a common method of smearing political rivals, but true Ymosite sects are present in the underbelly of Scuttleport, and on some of the furthest isles.",
      },
      {
        sourceEntryId: "e03",
        text: "Ymosian Cults are common among the sailors and witches of Scuttleport, for it is hard to go out and witness the awe of the sea and still trust a sputtering flame to aid you against the Leviathan. Appendix",
      },
    ],
  },
  {
    sourceCollectionId: "warlock.clan.uroch",
    subjectKind: "warlock_clan",
    binding: {
      strategy: "warlock_clan",
      clanId: "uroch",
    },
    attribution: {
      work: "Codex 3. Warlock [Draft 4]",
      pages: "46-47",
      anchor: "The Uroch Clan",
    },
    bindingRequirement: "Bind once to corresponding stable WarlockClanId.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Urochi are amongst the most respected clans, composed of a recent union between two families. The clan involves itself in every step of mining, quarrying, construction, and smithing.",
      },
      {
        sourceEntryId: "e02",
        text: "The Uroch fashion themselves strong sculptors and masons, building the monumental works of Isha and carving its legacy. Among the craftsmen of Isha, the Urochi function as a trade guild, representing their interests politically but charging hefty dues for their iconography and legitimacy.",
      },
      {
        sourceEntryId: "e03",
        text: "The symbol of the Uroch Clan is a stylized crab, which is used as a stamp on pieces of silver or at the foot of old buildings to indicate their authenticity and worth.",
      },
    ],
  },
  {
    sourceCollectionId: "warlock.clan.lark",
    subjectKind: "warlock_clan",
    binding: {
      strategy: "warlock_clan",
      clanId: "lark",
    },
    attribution: {
      work: "Codex 3. Warlock [Draft 4]",
      pages: "47",
      anchor: "The Lark Clan",
    },
    bindingRequirement: "Bind once to corresponding stable WarlockClanId.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Lark Clan is amongst the oldest clans, founded by the mudlark families who would dive beneath the waves to collect treasures from the ruined towers on Isha's sea floor.",
      },
      {
        sourceEntryId: "e02",
        text: "The Larks fashion themselves guardians against piracy and eccentric treasure hunters. To the fishermen of Isha, they're seen as a necessary evil — they keep the pirates at bay and grant access to the secrets of the deep, but their tithes are almost as high as the pirates would steal.",
      },
      {
        sourceEntryId: "e03",
        text: "The symbol of the Lark Clan is a bird's wing, and is a common motif on many ship's sails to prove to the Lark's army that they have paid their dues and deserve protection.",
      },
    ],
  },
  {
    sourceCollectionId: "warlock.clan.caravel",
    subjectKind: "warlock_clan",
    binding: {
      strategy: "warlock_clan",
      clanId: "caravel",
    },
    attribution: {
      work: "Codex 3. Warlock [Draft 4]",
      pages: "47-48",
      anchor: "The Caravel Clan",
    },
    bindingRequirement: "Bind once to corresponding stable WarlockClanId.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Caravel Clan is the most sacred and powerful clan in Isha, for they are the inheritors of the sacred art of shipwrighting, and maintain the finest groves in the Halcyon Isles, whose only function is to prepare the most perfectly-constructed ships.",
      },
      {
        sourceEntryId: "e02",
        text: "The Caravels fashion themselves noble craftsmen of a near-forgotten artistry, of wizards in their own right whose magic is to bring life to dead wood and tie the isles together. To many in Isha they are a relic of a bygone age, their power more from their political machinations than from their work.",
      },
      {
        sourceEntryId: "e03",
        text: "The symbol of the Caravel Clan is a dragon, and it is illegal for any Ishanian-born captain to lead a ship without that authorized sigil carved somewhere on its hull.",
      },
    ],
  },
  {
    sourceCollectionId: "warlock.clan.waine",
    subjectKind: "warlock_clan",
    binding: {
      strategy: "warlock_clan",
      clanId: "waine",
    },
    attribution: {
      work: "Codex 3. Warlock [Draft 4]",
      pages: "48",
      anchor: "The Waine Clan",
    },
    bindingRequirement: "Bind once to corresponding stable WarlockClanId.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Clan Waine is the most mysterious of the nobility, with countless rumors swirling around their foundation, with some claiming they were founded by a cult who cheated death itself. The clan itself only encourages the rumors, lending an air of mystique to the family.",
      },
      {
        sourceEntryId: "e02",
        text: "The Waine fashion themselves the sin-eaters of Isha, who carry the dead and dying to the Graven Isle and who perform surgery on the injured. The truth is an open secret: many in their ranks practice ghoul-calling and other illegal magics, and make their true fortune on smuggling occult treatises and reagents through their Auction House.",
      },
      {
        sourceEntryId: "e03",
        text: "The symbol of the Waine is a mangy dog, which they fly upon their black ships to warn other sailors of the dead they ferry to the Graven Isle.",
      },
    ],
  },
  {
    sourceCollectionId: "warlock.clan.ix",
    subjectKind: "warlock_clan",
    binding: {
      strategy: "warlock_clan",
      clanId: "ix",
    },
    attribution: {
      work: "Codex 3. Warlock [Draft 4]",
      pages: "48",
      anchor: "The Ix Clan",
    },
    bindingRequirement: "Bind once to corresponding stable WarlockClanId.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Clan Ix is the most established family in Isha, capable of tracing their lineage back five hundred years before the Tragedies, and who are said to have been founded by the inventor of the twin writing systems used by Isha to this day.",
      },
      {
        sourceEntryId: "e02",
        text: "Ixians fashion themselves the great history-keepers of Isha, the authors of its past and the architects of its future. The common folk fear them as lawyers, bureaucrats, and authoritarian busybodies who inflate the ranks of the University, but who are valuable when literacy is needed.",
      },
      {
        sourceEntryId: "e03",
        text: "The symbol of the Ix is a gulabi goat, and the sacred herds of this animal are bred by the Ix's servants within the Halcyon Isles for their exquisite vellum.",
      },
    ],
  },
  {
    sourceCollectionId: "warlock.foreign.triarchy_of_ur",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "foreign.triarchy_of_ur",
    },
    attribution: {
      work: "Codex 3. Warlock [Draft 4]",
      pages: "48-49",
      anchor: "The Triarchy of Ur",
    },
    bindingRequirement: "Finite Warlock political/source topic foreign.triarchy_of_ur; do not force-map to Mariner external-land identity. Preserve printed speaker attribution.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The King's Historian says: The Triarchy of Ur rules over much of the known world, an ancient empire based out of the sprawling megalopolis of Ur, so enormous it must be divided amongst three emperors (who are corrupt, childish, and rotting away, in turn).",
      },
      {
        sourceEntryId: "e02",
        text: "The Admiral says: Ur has, at various points, attempted to seize control of Isha and turn its magic towards their own ends. The Bone-Priests of Ur are jealous of Ishanian magic, and desire nothing more than to reclaim their lost glory.",
      },
      {
        sourceEntryId: "e03",
        text: "The Diplomat says: While Ur is a dying empire, they are not dead yet — a thousand different armies march under their banners, and their emperors can procure wealth beyond any's wildest dreams. If one could wrangle the full attention of Ur towards a single objective, then nothing could stand in its way.",
      },
    ],
  },
  {
    sourceCollectionId: "warlock.foreign.elpenors_kingdom",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "foreign.elpenors_kingdom",
    },
    attribution: {
      work: "Codex 3. Warlock [Draft 4]",
      pages: "49",
      anchor: "Elpenor's Kingdom",
    },
    bindingRequirement: "Finite Warlock political/source topic foreign.elpenors_kingdom; do not force-map to Mariner external-land identity. Preserve printed speaker attribution.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The King's Historian says: The Hecares Archipelago are a small southern nation, not dissimilar from Isha, which was conquered by Ur long ago. The boy-king Elpenor recently beat back the Urite armies and declared both his independence and his intent at expanding his kingdom northward.",
      },
      {
        sourceEntryId: "e02",
        text: "The Admiral says: While Elpenor's greatest foe is Ur, he has no lost love for wizards, for he blames magic for the death of his mother. Elpenor's oracles and advisors whisper in his ear even now encouraging him to seize Isha's power to aid in his expansion.",
      },
      {
        sourceEntryId: "e03",
        text: "The Diplomat says: Elpenor's Kingdom is new and ambitious, rapidly expanding across a large amount of territory and carving a name for itself in the history books. An alliance with Elpenor could give Isha access to this newfound power, and ensure its survival against Ur's inevitable wrath.",
      },
    ],
  },
  {
    sourceCollectionId: "warlock.foreign.hrotingmen",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "foreign.hrotingmen",
    },
    attribution: {
      work: "Codex 3. Warlock [Draft 4]",
      pages: "49-50",
      anchor: "The Hrotingmen",
    },
    bindingRequirement: "Finite Warlock political/source topic foreign.hrotingmen; do not force-map to Mariner external-land identity. Preserve printed speaker attribution.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The King's Historian says: The Hrotingmen come from a land of ice and snow far to the north, where they worship god-corpses and serve cruel witches, to raid and pillage Isha, dragging the archipelago's wealth back to their homes as bounty.",
      },
      {
        sourceEntryId: "e02",
        text: "The Admiral says: The Hrotingmen are Isha's longest enemy, whose Jarls have delighted in its torment and when united enough to launch an attack, have nearly torched the kingdom to the ground.",
      },
      {
        sourceEntryId: "e03",
        text: "The Diplomat says: An alliance with the Hrotingmen is both fickle and irresponsible, for they are warriors above all else, and lack any other culture. But their violence could be a valuable tool, if one could use it.",
      },
    ],
  },
  {
    sourceCollectionId: "warlock.foreign.druj_lands",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "foreign.druj_lands",
    },
    attribution: {
      work: "Codex 3. Warlock [Draft 4]",
      pages: "50",
      anchor: "The Druj-Lands",
    },
    bindingRequirement: "Finite Warlock political/source topic foreign.druj_lands; do not force-map to Mariner external-land identity. Preserve printed speaker attribution.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The King's Historian says: The Drujmen are from a faraway land, poisoned by old necromancy that seeped into their bones. Now they cannot die, and they dwell in spider-fortresses wearing the mockeries of life and dreaming of stealing the truth of death.",
      },
      {
        sourceEntryId: "e02",
        text: "The Admiral says: The Drujites blame Wizards for their state, and many Necromancers have taken it upon themselves to travel West to eradicate these abominations of life, leading to miserable and haunting war.",
      },
      {
        sourceEntryId: "e03",
        text: "The Diplomat says: The Druj-Lands are the home to many forgotten relics from the Tragedies, as well as occult tomes holding twisted secrets of old magic. Obtaining these resources could make an alliance with the Druj worth tolerating. Appendix",
      },
    ],
  },
  {
    sourceCollectionId: "mariner.delegated.graven_isle",
    subjectKind: "isle",
    binding: {
      strategy: "mariner_board_isle",
      boardIsleId: "graven_isle",
    },
    attribution: {
      work: "Codex 4. Mariner [Draft 4]",
      pages: "45",
      anchor: "The Graven Isle, the Land of the Dead",
    },
    bindingRequirement: "Bind once through established Mariner board-Isle -> World IsleId mapping. Delegates by Necromancer Pact-seat status.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Graven Isle is a cold and miserable place, covered in dark clouds and filled with countless memorials to the dead.",
      },
      {
        sourceEntryId: "e02",
        text: "For as long as anyone can remember, the Graven Isle has been the burial grounds for all of Isha's dead, and the catacombs run deep into the bottom of the world.",
      },
      {
        sourceEntryId: "e03",
        text: "No one else dares to live upon the Graven Isle, save ghoul-callers, smugglers, and the diseased.",
      },
    ],
  },
  {
    sourceCollectionId: "mariner.delegated.ishana",
    subjectKind: "isle",
    binding: {
      strategy: "mariner_board_isle",
      boardIsleId: "ishana",
    },
    attribution: {
      work: "Codex 4. Mariner [Draft 4]",
      pages: "45-46",
      anchor: "Ishana, the Heart of the Archipelago",
    },
    bindingRequirement: "Bind once through established Mariner board-Isle -> World IsleId mapping. Delegates by Hierophant Pact-seat status.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Ishana is a central mountainous island surrounded by up to fifty smaller islands, ranging from just large enough to support a single home to a sprawling landscape in its own right.",
      },
      {
        sourceEntryId: "e02",
        text: "To the west of the Isle is the Blue City and the Bay of Ishana, a bustling port filled with crime, trade, and life.",
      },
      {
        sourceEntryId: "e03",
        text: "To the east of the Isle are the Chalk Cliffs, where farmers and shepherds live a more peaceful life, tending to their flocks along the grassy hills.",
      },
    ],
  },
  {
    sourceCollectionId: "mariner.delegated.halcyon_isles",
    subjectKind: "isle",
    binding: {
      strategy: "mariner_board_isle",
      boardIsleId: "halcyon_isles",
    },
    attribution: {
      work: "Codex 4. Mariner [Draft 4]",
      pages: "46",
      anchor: "The Halcyon Isles, Castle of the King",
    },
    bindingRequirement: "Bind once through established Mariner board-Isle -> World IsleId mapping. Delegates by Warlock Pact-seat status.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Halcyon Isles are a beautiful and serene place, with rolling hills, sprawling gardens, and groves of carefully-tended trees tucked away amid its towering cliffs.",
      },
      {
        sourceEntryId: "e02",
        text: "The Castle of the King looks over the Halcyon Isles, an enormous structure of great hewn stone and bearing countless towers and parapets overlooking the southern seas.",
      },
      {
        sourceEntryId: "e03",
        text: "The Halcyon Isles require incredible amounts of produce and manpower from the rest of the archipelago in order to maintain the hedonistic lifestyle of the nobles who dwell there.",
      },
    ],
  },
  {
    sourceCollectionId: "mariner.delegated.scuttleport",
    subjectKind: "isle",
    binding: {
      strategy: "mariner_board_isle",
      boardIsleId: "scuttleport",
    },
    attribution: {
      work: "Codex 4. Mariner [Draft 4]",
      pages: "46-47",
      anchor: "Scuttleport, City of Pirates",
    },
    bindingRequirement: "Bind once through established Mariner board-Isle -> World IsleId mapping. Delegates by Faustian Pact-seat status.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Scuttleport is a rotten slum, filled with crooked criminals, dangerous sewer-cults, and gangs of thieves looking to make a name for themselves.",
      },
      {
        sourceEntryId: "e02",
        text: "Scuttleport was once a small cove, but over centuries of shipwrecks has grown to an impossible size, the wooden beams of ancient hulls forming the scaffolding for the labyrinthine city.",
      },
      {
        sourceEntryId: "e03",
        text: "Scuttleport is a treacherous place to traverse, with many of its shanty buildings half-flooded and many of its wooden roads rotten to the touch, and if you don't know where you're going you're certain to die.",
      },
    ],
  },
  {
    sourceCollectionId: "mariner.delegated.spyrholm",
    subjectKind: "isle",
    binding: {
      strategy: "mariner_board_isle",
      boardIsleId: "spyrholm",
    },
    attribution: {
      work: "Codex 4. Mariner [Draft 4]",
      pages: "47",
      anchor: "Spyrholm, the Last Great Wizard Tower",
    },
    bindingRequirement: "Bind once through established Mariner board-Isle -> World IsleId mapping. Delegates by Sorcerer Pact-seat status. Preserve source discrepancy: owner-present sentence says 'Marble Isle'; application maps this collection to canonical Spyrholm.",
    discrepancyNotes: [
      "Mariner Part VI owner-present wording says to trust the Sorcerer's Lore of \"the Marble Isle\". Application maps this collection to canonical Spyrholm; do not invent a Marble Isle entity.",
    ],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Spyrholm is a rocky isle, with jagged cliffs and sparse shrubland. It is inhabited by herds of sheep, gulabi goats, and seals, with the occasional migratory flock of birds settling down onto its rocks.",
      },
      {
        sourceEntryId: "e02",
        text: "There is a small population of native shepherds and fishermen in Spyrholm, shorter in stock than most Ishanians, who speak their own language and stay far away from Wizards.",
      },
      {
        sourceEntryId: "e03",
        text: "Researchers, aspiring Wizards, and servants of the Sorcerer have constructed a College in Spyrholm Bay, which has formed into a college town of sorts, and a captive audience of the Sorcerer.",
      },
    ],
  },
  {
    sourceCollectionId: "mariner.delegated.sage_atoll",
    subjectKind: "isle",
    binding: {
      strategy: "mariner_board_isle",
      boardIsleId: "sage_atoll",
    },
    attribution: {
      work: "Codex 4. Mariner [Draft 4]",
      pages: "47",
      anchor: "The Starlit Atoll, Where The Heavens Once Fell",
    },
    bindingRequirement: "Bind once through established Mariner board-Isle -> World IsleId mapping. Delegates by Sage Pact-seat status. Preserve source wording 'Starlit Atoll' and 'Watcher is present'; current application uses its established neutral Sage-atoll mapping.",
    discrepancyNotes: [
      "Mariner Part VI uses \"The Starlit Atoll\" and \"If the Watcher is present\" in the Sage delegation. Application uses the established Sage-atoll mapping and actual Sage Pact-seat status.",
    ],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Starlit Atoll is a sprawling atoll, surrounded by dense reefs and strange turbulent winds. While the water at its center is calm, it's nearly impossible to approach it via ship without knowledge of its particular eddies and sandbars.",
      },
      {
        sourceEntryId: "e02",
        text: "The Starlit Atoll is covered in thick woodlands, the oldest and most sacred trees in Isha, and is filled with exotic wildlife of odd sizes, native only to this specific Atoll.",
      },
      {
        sourceEntryId: "e03",
        text: "The shore of the Isle is composed of lagoons inhabited by all kinds of sealife, which feed into a network of caves that hollow out the Isle, inhabited by solitude-seeking hermits and fairies.",
      },
    ],
  },
  {
    sourceCollectionId: "mariner.isle.tahv",
    subjectKind: "isle",
    binding: {
      strategy: "mariner_board_isle",
      boardIsleId: "tahv",
    },
    attribution: {
      work: "Codex 4. Mariner [Draft 4]",
      pages: "47-48",
      anchor: "Sacred Tahv",
    },
    bindingRequirement: "Bind once through established Mariner board-Isle -> World IsleId mapping; preserve source display wording in metadata.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The southernmost island of Ishana is the sacred isle Tahv, a place of black beaches and a thousand shrines, and welcome only to those permitted in the light of the Immortal Flame.",
      },
      {
        sourceEntryId: "e02",
        text: "As the Mariner, you are not permitted to step foot upon the Isle of Tahv — it is forbidden to any Wizard save the Hierophant himself.",
      },
      {
        sourceEntryId: "e03",
        text: "The volcano at the center of Tahv is dormant, although occasionally it will spring to life, flooding Isha in ash and smoke.",
      },
    ],
  },
  {
    sourceCollectionId: "mariner.isle.thyras",
    subjectKind: "isle",
    binding: {
      strategy: "mariner_board_isle",
      boardIsleId: "thyras",
    },
    attribution: {
      work: "Codex 4. Mariner [Draft 4]",
      pages: "48",
      anchor: "Thyras",
    },
    bindingRequirement: "Bind once through established Mariner board-Isle -> World IsleId mapping; preserve source display wording in metadata.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Thyras is the capital of the Free Duchy which rules over the Far Reaches. It is a beautiful city of vermillion rooftops and tangled grottos.",
      },
      {
        sourceEntryId: "e02",
        text: "Thyras is exorbitantly wealthy, and is a central port for merchants traveling westward, looking to handle rare and exotic magical goods, or deal in strange and beautiful treasures from ancient times.",
      },
      {
        sourceEntryId: "e03",
        text: "The beaches of Thyras are covered in oysters, which are ground up and used to produce a rare and incredibly valuable purple dye (Tyrian Purple), which is the source of much of their wealth.",
      },
    ],
  },
  {
    sourceCollectionId: "mariner.isle.druntyr",
    subjectKind: "isle",
    binding: {
      strategy: "mariner_board_isle",
      boardIsleId: "druntyr",
    },
    attribution: {
      work: "Codex 4. Mariner [Draft 4]",
      pages: "48",
      anchor: "Druntyr",
    },
    bindingRequirement: "Bind once through established Mariner board-Isle -> World IsleId mapping; preserve source display wording in metadata.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Druntyr is a tall and lonely isle in the midst of the Northern Seas of Isha. It is the remnants of a massive tower rising up from the sea, which even now takes hours to sail around and is covered in remnants of forgotten magic.",
      },
      {
        sourceEntryId: "e02",
        text: "Druntyr is desolate and uninhabited, save for smugglers, fishermen, and merchants stopping quickly before heading on to Ishana.",
      },
      {
        sourceEntryId: "e03",
        text: "Druntyr is covered in a thousand years of seagull guano, and the tops of the tower are a popular roosting spot for hundreds of different migratory bird species.",
      },
    ],
  },
  {
    sourceCollectionId: "mariner.isle.koire",
    subjectKind: "isle",
    binding: {
      strategy: "mariner_board_isle",
      boardIsleId: "koire",
    },
    attribution: {
      work: "Codex 4. Mariner [Draft 4]",
      pages: "48-49",
      anchor: "Koirë",
    },
    bindingRequirement: "Bind once through established Mariner board-Isle -> World IsleId mapping; preserve source display wording in metadata.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Koirë is a small isle surrounded by coral reefs, an important export of sponges and various alchemical reagents for nearby Spyrholm.",
      },
      {
        sourceEntryId: "e02",
        text: "The populace of Koirë have their own unique culture and dialect of Ishanian, which is in danger of dying out. Their traditions are dedicated to sponge-diving and cultivating the coral that grows around them.",
      },
      {
        sourceEntryId: "e03",
        text: "Koirë is a popular site for the intelligentsia and nobility of Isha to get away from it for a bit. Lavish parties and decadent bacchanalias threaten its fragile ecosystem.",
      },
    ],
  },
  {
    sourceCollectionId: "mariner.isle.caravesse",
    subjectKind: "isle",
    binding: {
      strategy: "mariner_board_isle",
      boardIsleId: "caravesse",
    },
    attribution: {
      work: "Codex 4. Mariner [Draft 4]",
      pages: "49",
      anchor: "Caravesse",
    },
    bindingRequirement: "Bind once through established Mariner board-Isle -> World IsleId mapping; preserve source display wording in metadata.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Caravesse is an island of ancient groves, carefully maintained by the Noble Clan Caravel — the sacred shipwrights of Isha.",
      },
      {
        sourceEntryId: "e02",
        text: "Caravesse is the shipyard for Isha, the place where the finest timber is cultivated, the finest sails are woven, and the greatest ships are carved.",
      },
      {
        sourceEntryId: "e03",
        text: "There are some groves intentionally kept sacred by the Caravel Clan, groves said to predate the Pact itself. Legend says a single lonely dryad dwells there, mourning the loss of her siblings.",
      },
    ],
  },
  {
    sourceCollectionId: "mariner.isle.izor",
    subjectKind: "isle",
    binding: {
      strategy: "mariner_board_isle",
      boardIsleId: "izor",
    },
    attribution: {
      work: "Codex 4. Mariner [Draft 4]",
      pages: "49",
      anchor: "Izor Skerry",
    },
    bindingRequirement: "Bind once through established Mariner board-Isle -> World IsleId mapping; preserve source display wording in metadata.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Izor is a critical trade route between Ishana and Ur, the Eastmost Isle of Isha before departing the archipelago.",
      },
      {
        sourceEntryId: "e02",
        text: "Izor has been devastated by centuries of on-and-off war between various squabbling nations, and its natural scrubland is harsh and inhospitable for people trying to live there.",
      },
      {
        sourceEntryId: "e03",
        text: "The coves and grottos of Izor are dense with strange marine life not found elsewhere in Isha, and the network of caves beneath the isle are filled with bioluminescent fungi.",
      },
    ],
  },
  {
    sourceCollectionId: "mariner.isle.yeraine",
    subjectKind: "isle",
    binding: {
      strategy: "mariner_board_isle",
      boardIsleId: "yeraine",
    },
    attribution: {
      work: "Codex 4. Mariner [Draft 4]",
      pages: "49-50",
      anchor: "Yeraine",
    },
    bindingRequirement: "Bind once through established Mariner board-Isle -> World IsleId mapping; preserve source display wording in metadata.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Yeraine was once a barren rock before gold was found beneath its hills, and now it serves as a vital source of Isha's wealth and a coveted jewel of the isles.",
      },
      {
        sourceEntryId: "e02",
        text: "Yeraine is a port island with a heavily-guarded castle named Stonekeep. King Elpenor to the South openly covets the gold of Yeraine, and some worry the castle is ill-equipped to defend it.",
      },
      {
        sourceEntryId: "e03",
        text: "At the center of Yeraine, amongst the hills and mines, is a slumbering giant of the same name. It is said she will awaken when the last bar of gold is taken from the isle.",
      },
    ],
  },
  {
    sourceCollectionId: "mariner.isle.orrery",
    subjectKind: "isle",
    binding: {
      strategy: "mariner_board_isle",
      boardIsleId: "orrery",
    },
    attribution: {
      work: "Codex 4. Mariner [Draft 4]",
      pages: "50",
      anchor: "The Orrery",
    },
    bindingRequirement: "Bind once through established Mariner board-Isle -> World IsleId mapping; preserve source display wording in metadata.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "The Orrery is built upon a small island, which contains itself and a handful of other ruined buildings, once the remnants of a much greater architectural feat.",
      },
      {
        sourceEntryId: "e02",
        text: "Fallen statues to ancient wizard empires line the path from the dock to the few monumental buildings looking over the isle.",
      },
      {
        sourceEntryId: "e03",
        text: "Beautiful swampgrasses grow up around the ancient structure, and herons enjoy the gentle tides.",
      },
    ],
  },
  {
    sourceCollectionId: "mariner.distant.north",
    subjectKind: "mariner_horizon",
    binding: {
      strategy: "mariner_horizon",
      cardinalGroupId: "north",
    },
    attribution: {
      work: "Codex 4. Mariner [Draft 4]",
      pages: "51",
      anchor: "The Northern Lands",
    },
    bindingRequirement: "Bind to existing MarinerHorizonCardinalGroupId. Source explicitly targets Lore of the direction when a Beast leaves a Horizon; printed location list is ordinary bullet reference material and is NOT imported as mutable Lore baseline entries.",
    discrepancyNotes: [],
    entries: [],
  },
  {
    sourceCollectionId: "mariner.distant.east",
    subjectKind: "mariner_horizon",
    binding: {
      strategy: "mariner_horizon",
      cardinalGroupId: "east",
    },
    attribution: {
      work: "Codex 4. Mariner [Draft 4]",
      pages: "52",
      anchor: "The Eastern Lands",
    },
    bindingRequirement: "Bind to existing MarinerHorizonCardinalGroupId. Source explicitly targets Lore of the direction when a Beast leaves a Horizon; printed location list is ordinary bullet reference material and is NOT imported as mutable Lore baseline entries.",
    discrepancyNotes: [],
    entries: [],
  },
  {
    sourceCollectionId: "mariner.distant.south",
    subjectKind: "mariner_horizon",
    binding: {
      strategy: "mariner_horizon",
      cardinalGroupId: "south",
    },
    attribution: {
      work: "Codex 4. Mariner [Draft 4]",
      pages: "53",
      anchor: "The Southern Lands",
    },
    bindingRequirement: "Bind to existing MarinerHorizonCardinalGroupId. Source explicitly targets Lore of the direction when a Beast leaves a Horizon; printed location list is ordinary bullet reference material and is NOT imported as mutable Lore baseline entries.",
    discrepancyNotes: [],
    entries: [],
  },
  {
    sourceCollectionId: "mariner.distant.west",
    subjectKind: "mariner_horizon",
    binding: {
      strategy: "mariner_horizon",
      cardinalGroupId: "west",
    },
    attribution: {
      work: "Codex 4. Mariner [Draft 4]",
      pages: "54",
      anchor: "The Western Lands",
    },
    bindingRequirement: "Bind to existing MarinerHorizonCardinalGroupId. Source explicitly targets Lore of the direction when a Beast leaves a Horizon; printed location list is ordinary bullet reference material and is NOT imported as mutable Lore baseline entries.",
    discrepancyNotes: [],
    entries: [],
  },
  {
    sourceCollectionId: "faustian.hell.mutterheep",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "hell.mutterheep",
    },
    attribution: {
      work: "Codex 5. Faustian [Draft 4]",
      pages: "54",
      anchor: "Mutterheep",
    },
    bindingRequirement: "Finite source topic hell.mutterheep. All printed Lore is fixed baseline; NO staged activation semantics.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "At first, Mutterheep began as a realm wizards would use as a dumping ground, creating portals connecting to it whenever they had something or someone they wanted to throw away and never hear from again.",
      },
      {
        sourceEntryId: "e02",
        text: "The practice was abandoned when the twisted remnants of those abandoned started breaking through the portals, dragging wizards with them into their blighted land.",
      },
      {
        sourceEntryId: "e03",
        text: "Mutterheep is a realm of endless garbage and countless-millennia-old trash, inhabited by the deathless magically-cursed lesser wizards and creatures thrown there long ago.",
      },
    ],
  },
  {
    sourceCollectionId: "faustian.hell.paradise",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "hell.paradise",
    },
    attribution: {
      work: "Codex 5. Faustian [Draft 4]",
      pages: "54-55",
      anchor: "Paradise",
    },
    bindingRequirement: "Finite source topic hell.paradise. All printed Lore is fixed baseline; NO staged activation semantics.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Paradise was created to be a utopia — a new world without death or suffering. Its inventor brought ten thousand hapless worshippers into its gates as a rapture.",
      },
      {
        sourceEntryId: "e02",
        text: "Without death, the inhabitants of Paradise couldn't escape eternity, and its gardens soon grew debauched and bloodsoaked as they tormented each other.",
      },
      {
        sourceEntryId: "e03",
        text: "Paradise is a realm of beautiful views and bloodsoaked marble tiles, filled with deathless skinless monstrosities desperate for new cruelties to delight in.",
      },
    ],
  },
  {
    sourceCollectionId: "faustian.hell.carceri",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "hell.carceri",
    },
    attribution: {
      work: "Codex 5. Faustian [Draft 4]",
      pages: "55",
      anchor: "Carceri",
    },
    bindingRequirement: "Finite source topic hell.carceri. All printed Lore is fixed baseline; NO staged activation semantics.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Carceri is an impossible prison-realm, crafted in the early days of the Pact in order to store the war machines and horrific beasts left behind from the Tragedies.",
      },
      {
        sourceEntryId: "e02",
        text: "It is a cold and miserable realm, full of vaulting architecture, winding chains, and howling pits of screaming aberrations longing for freedom.",
      },
      {
        sourceEntryId: "e03",
        text: "The denizens of Carceri are built only for brute violence, but in their imprisoned time they have transformed violence into a perfect art, capable of inflicting horrendous destruction with the mere swing of a blade or blow of a hammer.",
      },
    ],
  },
  {
    sourceCollectionId: "faustian.hell.eternity_forge",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "hell.eternity_forge",
    },
    attribution: {
      work: "Codex 5. Faustian [Draft 4]",
      pages: "55",
      anchor: "The Eternity Forge",
    },
    bindingRequirement: "Finite source topic hell.eternity_forge. All printed Lore is fixed baseline; NO staged activation semantics.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "During the Tragedies, some wizards built enormous forges for wands, staves, and other magical weapons, preparing their troops in great numbers to wield magic; built by an endless legion of machines.",
      },
      {
        sourceEntryId: "e02",
        text: "Without any master, the automatons continue to toil, creating even more of their number, stockpiling an even greater number of weapons for their use.",
      },
      {
        sourceEntryId: "e03",
        text: "Someday someone will figure out how to command the legions of the Eternity Forge, but until then they will keep mindlessly preparing for a war long since over.",
      },
    ],
  },
  {
    sourceCollectionId: "faustian.hell.mirasta",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "hell.mirasta",
    },
    attribution: {
      work: "Codex 5. Faustian [Draft 4]",
      pages: "55-56",
      anchor: "The Lost Kingdom of Mirasta",
    },
    bindingRequirement: "Finite source topic hell.mirasta. All printed Lore is fixed baseline; NO staged activation semantics.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Once one of the most powerful empires in the Faraway Sea, during the Tragedies an opposing wizard trapped the entire kingdom within another realm and struck their names from the history books.",
      },
      {
        sourceEntryId: "e02",
        text: "The people of Mirasta have been practicing their own magic to someday escape and slaughter all the world which forsake them, reclaiming their rightful position over all the lands.",
      },
      {
        sourceEntryId: "e03",
        text: "Mirasta was once a beautiful place, but without a sun its long pools have frozen over and its verdant jungles are now barren wastes. The people have resorted to sickening acts of magic to survive.",
      },
    ],
  },
  {
    sourceCollectionId: "faustian.hell.toyland",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "hell.toyland",
    },
    attribution: {
      work: "Codex 5. Faustian [Draft 4]",
      pages: "56",
      anchor: "Toyland",
    },
    bindingRequirement: "Finite source topic hell.toyland. All printed Lore is fixed baseline; NO staged activation semantics.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "A prentice with more magic than sense built Toyland long ago and filled it with dolls and toys, all created and given life to love him forever.",
      },
      {
        sourceEntryId: "e02",
        text: "After his death, Toyland mourned for what they had lost, and lacking purpose began to cannibalize each other, hoping someday for their god's return.",
      },
      {
        sourceEntryId: "e03",
        text: "Portals to Toyland open up in the dreams of young children, granting the whimsical creatures inside enough space to burst through and hunt for their true creator once more.",
      },
    ],
  },
  {
    sourceCollectionId: "faustian.hell.old_college",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "hell.old_college",
    },
    attribution: {
      work: "Codex 5. Faustian [Draft 4]",
      pages: "56",
      anchor: "The Old College",
    },
    bindingRequirement: "Finite source topic hell.old_college. All printed Lore is fixed baseline; NO staged activation semantics.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "There used to be a college of magic separate from the material world, a place where wizards could go and learn the secrets of the universe together, in harmony.",
      },
      {
        sourceEntryId: "e02",
        text: "During the Tragedies it was completely blighted, monstrous prentices overwhelmed the college, and countless professors transformed themselves into demons just to survive.",
      },
      {
        sourceEntryId: "e03",
        text: "Many of these researchers remain, wandering the halls and scratching their dissertations into the walls until their fingers are stumps.",
      },
    ],
  },
  {
    sourceCollectionId: "faustian.hell.anselion",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "hell.anselion",
    },
    attribution: {
      work: "Codex 5. Faustian [Draft 4]",
      pages: "56-57",
      anchor: "Anselion, the Wicker Lands",
    },
    bindingRequirement: "Finite source topic hell.anselion. All printed Lore is fixed baseline; NO staged activation semantics.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Little is known of Anselion, indeed no wizard has ever traveled to it, or found a way there. Its existence is attested in ancient tomes referencing long lists of other Hells, and in the creatures that emerge from it.",
      },
      {
        sourceEntryId: "e02",
        text: "Beings from Anselion are warped by its magic, made from shadows or bound together to thin wooden poles. The creatures of Anselion waste away without access to bone marrow, which they subsist on to remain corporeal outside their home.",
      },
      {
        sourceEntryId: "e03",
        text: "Anselion raiders are a common danger when traversing the far realms, and they will make their hatred for wizards very known (although the reasons why are still unclear).",
      },
    ],
  },
  {
    sourceCollectionId: "faustian.hell.misery",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "hell.misery",
    },
    attribution: {
      work: "Codex 5. Faustian [Draft 4]",
      pages: "57",
      anchor: "Misery",
    },
    bindingRequirement: "Finite source topic hell.misery. All printed Lore is fixed baseline; NO staged activation semantics.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Misery is a tangled labyrinth built to contain a single prisoner — the Nemesis, the ultimate weapon of the most powerful wizard-kings and the ultimate destruction of all wizards.",
      },
      {
        sourceEntryId: "e02",
        text: "Because the Nemesis is said to be unstoppable, the labyrinth is infinitely dense and tangled — and yet still every year the walls grow weaker.",
      },
      {
        sourceEntryId: "e03",
        text: "The Nemesis was originally the daughter of the last wizard-king before his experiments, and the betrayal of the agonies inflicted on her is the pulsing cruel heart of Misery. Appendix",
      },
    ],
  },
  {
    sourceCollectionId: "sage.mythic.hundred_handed_isle",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "mythic.hundred_handed_isle",
    },
    attribution: {
      work: "Codex 6. Sage [Draft 4]",
      pages: "49-50",
      anchor: "The Isle of the Hundred-Handed Ones",
    },
    bindingRequirement: "Finite source topic mythic.hundred_handed_isle; no generic realm/entity graph introduced.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Legend says: \"The Hecatoncheires, giants with one hundred hands, were once the shepherds of the gods, before they disappointed their gods by allowing their sheep to escape, forming the first clouds.\"",
      },
      {
        sourceEntryId: "e02",
        text: "Folklore says: \"The isle of the Hecatoncheires is full of the most luscious sheep in the world, with thick golden pelts and juicy meat. To steal even one will cause these otherwise-peaceful giants to turn on you.\"",
      },
      {
        sourceEntryId: "e03",
        text: "A sailor said: \"They shared in everything, even their women, but they never offered us a slice of the lamb on the fire or one of their blankets for warmth. In desperation, we stole a scrap of bone to make soup with, and I watched my captain be torn limb from limb.\"",
      },
    ],
  },
  {
    sourceCollectionId: "sage.mythic.castle_in_sky",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "mythic.castle_in_sky",
    },
    attribution: {
      work: "Codex 6. Sage [Draft 4]",
      pages: "50",
      anchor: "The Castle In The Sky",
    },
    bindingRequirement: "Finite source topic mythic.castle_in_sky; no generic realm/entity graph introduced.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Legend says: \"The last of the great Djinn-Kings built a castle in the sky, made of crystals and silks, which floats high above the clouds and surrounded by storms.\"",
      },
      {
        sourceEntryId: "e02",
        text: "Folklore says: \"Seeing the flying castle above you is a bad omen, for although it is beautiful, the pixies inside will steal you away as one of their treasures, growing their vast hoard.\"",
      },
      {
        sourceEntryId: "e03",
        text: "A sailor said: \"They grabbed me, I guess because they thought I was funny, and kept me in their palace for two weeks. It was beautiful, but they had no food, and I nearly starved before I escaped and fell to earth.\"",
      },
    ],
  },
  {
    sourceCollectionId: "sage.mythic.court_of_king_typhon",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "mythic.court_of_king_typhon",
    },
    attribution: {
      work: "Codex 6. Sage [Draft 4]",
      pages: "50",
      anchor: "The Court of King Typhon",
    },
    bindingRequirement: "Finite source topic mythic.court_of_king_typhon; no generic realm/entity graph introduced.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Legend says: \"King Typhon rules the seas from his court of gold, great glittering domes far beneath the waves, from which he surveys the world and claims his tithes.\"",
      },
      {
        sourceEntryId: "e02",
        text: "Folklore says: \"The Court of King Typhon is a beautiful place, for all ships which sail across his lands belong to him, and their treasures are brought to feed his court.\"",
      },
      {
        sourceEntryId: "e03",
        text: "A sailor said: \"I saw him! I saw him! A great beast, rising up from the sea, embedded with gold and jewels, like a crab but far larger. He crushed my ship between his claws and plunged back below the storm.\"",
      },
    ],
  },
  {
    sourceCollectionId: "sage.mythic.bottom_of_world",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "mythic.bottom_of_world",
    },
    attribution: {
      work: "Codex 6. Sage [Draft 4]",
      pages: "50-51",
      anchor: "The Bottom of the World",
    },
    bindingRequirement: "Finite source topic mythic.bottom_of_world; no generic realm/entity graph introduced.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Legend says: \"The deepest part of the sea is a huge trench, spanning as far as a ship could travel in a day, and it goes so deep that from within bubbles forth the inky stuff of nameless creation.\"",
      },
      {
        sourceEntryId: "e02",
        text: "Folklore says: \"Ships often go missing above the trench, which can be seen even from the surface as a great black line running beneath the waves. The hrotingmen call it Jormungandr, and we once called it Ymos.\"",
      },
      {
        sourceEntryId: "e03",
        text: "A sailor said: \"The world snake saw and it took and I became deep nameless dark, for all things were once nameless in this manner, and I too was nameless in the night and the shadow and the woe.\"",
      },
    ],
  },
  {
    sourceCollectionId: "sage.mythic.twin_goblin_courts",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "mythic.twin_goblin_courts",
    },
    attribution: {
      work: "Codex 6. Sage [Draft 4]",
      pages: "51",
      anchor: "The Twin Goblin Courts",
    },
    bindingRequirement: "Finite source topic mythic.twin_goblin_courts; no generic realm/entity graph introduced.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Legend says: \"At the furthest northern and southern points of the world lie the twin courts of the Nixies, where such goblins go to serve their grim rulers.\"",
      },
      {
        sourceEntryId: "e02",
        text: "Folklore says: \"The goblin courts are miserable places, and the rulers of these courts are wicked souls; great and powerful tzars locked in eternal war.\"",
      },
      {
        sourceEntryId: "e03",
        text: "A sailor said: \"You want to see the goblins? Sure, just head north, past the glaciers, past the point of no return, past the edge of the world until there is nothing but cold. There you'll find the goblins, and they'll string your guts up for the trouble.\"",
      },
    ],
  },
  {
    sourceCollectionId: "sage.mythic.kingdom_of_simple_jon",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "mythic.kingdom_of_simple_jon",
    },
    attribution: {
      work: "Codex 6. Sage [Draft 4]",
      pages: "51",
      anchor: "The Kingdom of Simple Jon",
    },
    bindingRequirement: "Finite source topic mythic.kingdom_of_simple_jon; no generic realm/entity graph introduced.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Legend says: \"Simple Jon is the greatest of all wizards, a wise man who forgot all knowledge so he could learn again. His valley kingdom is peaceful and magic blooms on trees.\"",
      },
      {
        sourceEntryId: "e02",
        text: "Folklore says: \"Simple Jon's Kingdom is a safe-haven for wizards, a place to go and escape the pressures of the world and focus entirely on the deeper art of magic.\"",
      },
      {
        sourceEntryId: "e03",
        text: "A sailor said: \"There are kingdoms, up in the mountains, where it is said dark magic is practiced. I never dared travel even close, and those who did never came back.\"",
      },
    ],
  },
  {
    sourceCollectionId: "sorcerer.element.air",
    subjectKind: "element",
    binding: {
      strategy: "element",
      elementId: "air",
    },
    attribution: {
      work: "Codex 7. Sorcerer [Draft 4]",
      pages: "52",
      anchor: "Air",
    },
    bindingRequirement: "Use existing ElementId air; Lore prose changes never mutate numeric Element values/mechanics.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Air is the element physically associated with the lesser skies (that lie beneath the heavens), clouds, winds, birds, and so on. It is both hot and wet.",
      },
      {
        sourceEntryId: "e02",
        text: "Air is astrologically associated with the springtime, and the houses of Gemini, Libra, and Aquarius.",
      },
      {
        sourceEntryId: "e03",
        text: "Air is emotionally associated with a sanguine temperament, which at its best is optimistic, cheerful, rational, and present. At its worst it is anxious, dissociated, over-analytical, and selfish.",
      },
      {
        sourceEntryId: "e04",
        text: "Air is symbolically associated with swords and the west. It brings tidings but also carries away fortunes.",
      },
      {
        sourceEntryId: "e05",
        text: "Wizards may tend to the Air within them by focusing on their private lives, maintaining detachment from the mortal world and increasing their sense of privacy and security.",
      },
    ],
  },
  {
    sourceCollectionId: "sorcerer.element.fire",
    subjectKind: "element",
    binding: {
      strategy: "element",
      elementId: "fire",
    },
    attribution: {
      work: "Codex 7. Sorcerer [Draft 4]",
      pages: "52-53",
      anchor: "Fire",
    },
    bindingRequirement: "Use existing ElementId fire; Lore prose changes never mutate numeric Element values/mechanics.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Fire is the element physically associated with the dreaming world, flames, sunlight, forging, and so on. It is both hot and dry.",
      },
      {
        sourceEntryId: "e02",
        text: "Fire is astrologically associated with the summertime, and the houses of Aries, Leo, and Sagittarius.",
      },
      {
        sourceEntryId: "e03",
        text: "Fire is emotionally associated with a choleric temperament, which at its best is quick-thinking, creative, loyal, and imaginative. At its worst it is angry, violent, paranoid, and stubborn.",
      },
      {
        sourceEntryId: "e04",
        text: "Fire is symbolically associated with wands and the south. Within it lies both creation and destruction.",
      },
      {
        sourceEntryId: "e05",
        text: "Wizards may tend to the Fire within them by focusing on their creative lives, engaging in imaginative conversations, working on art or other hobbies, and studying magic.",
      },
    ],
  },
  {
    sourceCollectionId: "sorcerer.element.earth",
    subjectKind: "element",
    binding: {
      strategy: "element",
      elementId: "earth",
    },
    attribution: {
      work: "Codex 7. Sorcerer [Draft 4]",
      pages: "53",
      anchor: "Earth",
    },
    bindingRequirement: "Use existing ElementId earth; Lore prose changes never mutate numeric Element values/mechanics.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Earth is the element physically associated with the material world, soil, plantlife, beasts, and so on. It is both cold and dry.",
      },
      {
        sourceEntryId: "e02",
        text: "Earth is astrologically associated with the autumntime, and the houses of Taurus, Virgo, and Capricorn.",
      },
      {
        sourceEntryId: "e03",
        text: "Earth is emotionally associated with a melancholic temperament, which at its best is calm, reflective, practical, and analytical. At its worst it is cold, miserable, self-pitying, and harsh.",
      },
      {
        sourceEntryId: "e04",
        text: "Earth is symbolically associated with coins and the East. It is consistent and reliable, but unflinching in that honesty.",
      },
      {
        sourceEntryId: "e05",
        text: "Wizards may tend to the Earth within them by focusing on their daily lives, eating regular meals, sleeping at regular times, and maintaining a clean sanctum and home.",
      },
    ],
  },
  {
    sourceCollectionId: "sorcerer.element.water",
    subjectKind: "element",
    binding: {
      strategy: "element",
      elementId: "water",
    },
    attribution: {
      work: "Codex 7. Sorcerer [Draft 4]",
      pages: "53",
      anchor: "Water",
    },
    bindingRequirement: "Use existing ElementId water; Lore prose changes never mutate numeric Element values/mechanics.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Water is the element physically associated with the aquatic world, fish, waves, rivers, and so on. It is both cold and wet.",
      },
      {
        sourceEntryId: "e02",
        text: "Water is astrologically associated with the wintertime, and the houses of Cancer, Scorpio, and Pisces.",
      },
      {
        sourceEntryId: "e03",
        text: "Water is emotionally associated with a phlegmatic temperament, which at its best is relaxed, charitable, emotional, and kind. At its worst it is weepy, manipulative, thoughtless, and people-pleasing.",
      },
      {
        sourceEntryId: "e04",
        text: "Water is symbolically associated with cups and the North. It is ever flowing and fickle, full of that which has been lost.",
      },
      {
        sourceEntryId: "e05",
        text: "Wizards may tend to the Water within them by focusing on their intimate lives, having sexual encounters, being present with their feelings, and falling asleep in another's arms.",
      },
    ],
  },
  {
    sourceCollectionId: "sorcerer.celestial.saturn",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "celestial.saturn",
    },
    attribution: {
      work: "Codex 7. Sorcerer [Draft 4]",
      pages: "54",
      anchor: "Saturn (♄)",
    },
    bindingRequirement: "Finite source topic celestial.saturn; do NOT assume Orrery-body identity. Lore prose changes do not alter Orrery/spell mechanics.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Saturn is the furthest of the wandering stars; believed by the ancients to be the palace of the god of death.",
      },
      {
        sourceEntryId: "e02",
        text: "Saturn is associated with death, decay, lead, and crumbling away. When performing magic, it is often an ill omen, as its symbol means your magic is rotten and poisoned.",
      },
      {
        sourceEntryId: "e03",
        text: "Necromancers have learned how to use Saturn to their own ends, and it is said this bleak star shone bright during the Tragedies, when magic's only goal was decay.",
      },
      {
        sourceEntryId: "e04",
        text: "Creatures of death and fairies in mourning tap into the power of the symbol Saturn to warp reality around themselves in imitation of the gates of death.",
      },
    ],
  },
  {
    sourceCollectionId: "sorcerer.celestial.jupiter",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "celestial.jupiter",
    },
    attribution: {
      work: "Codex 7. Sorcerer [Draft 4]",
      pages: "54",
      anchor: "Jupiter (♃)",
    },
    bindingRequirement: "Finite source topic celestial.jupiter; do NOT assume Orrery-body identity. Lore prose changes do not alter Orrery/spell mechanics.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Jupiter is the next-furthest of the wandering stars, believed by the ancients to be the wandering god Ithax, fleeing the hounds of Oraia.",
      },
      {
        sourceEntryId: "e02",
        text: "Jupiter is associated with stability, sturdiness, tin, and matters of the hearth and home. When performing magic, it is the most common symbol amongst human magic, and it is valued for its assurance that the spell will function reliably.",
      },
      {
        sourceEntryId: "e03",
        text: "Hierophants are associated with the symbol Jupiter, and it is commonly carved on good-luck talismans of pilgrims visiting the immortal flames.",
      },
      {
        sourceEntryId: "e04",
        text: "Humans are unique amongst all the beings of the world in their relationship with Jupiter, and there is no other known creature which may access its blessings.",
      },
    ],
  },
  {
    sourceCollectionId: "sorcerer.celestial.mars",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "celestial.mars",
    },
    attribution: {
      work: "Codex 7. Sorcerer [Draft 4]",
      pages: "54-55",
      anchor: "Mars (♂)",
    },
    bindingRequirement: "Finite source topic celestial.mars; do NOT assume Orrery-body identity. Lore prose changes do not alter Orrery/spell mechanics.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Mars is one of the twin-stars, dancing in and out of proximity to the world with Venus, and was believed by the ancients to be a scorned suitor of the female planet.",
      },
      {
        sourceEntryId: "e02",
        text: "Mars is associated with violence, warfare, iron, and conflict. When performing magic, it is valued only by wizards seeking to cast aggressive or combative magic; otherwise it is often an unwelcome omen.",
      },
      {
        sourceEntryId: "e03",
        text: "Warlocks and other battle-mages are masters of the art of pulling Mars forth from an otherwise-unwilling symbology, to further aid in combat.",
      },
      {
        sourceEntryId: "e04",
        text: "The symbol Mars is wielded by many war-demons from the Hells Outside Time and the armies of King Typhon beneath the seas.",
      },
    ],
  },
  {
    sourceCollectionId: "sorcerer.celestial.venus",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "celestial.venus",
    },
    attribution: {
      work: "Codex 7. Sorcerer [Draft 4]",
      pages: "55",
      anchor: "Venus (♀)",
    },
    bindingRequirement: "Finite source topic celestial.venus; do NOT assume Orrery-body identity. Lore prose changes do not alter Orrery/spell mechanics.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Venus is one of the twin-stars, dancing in and out of proximity to the world with Mars, and was believed by the ancients to be his tempting lover.",
      },
      {
        sourceEntryId: "e02",
        text: "Venus is associated with beauty, grace, copper, and femininity. When performing magic, it is valued for its elegance and flair; its presence within a spell denoting exceptional control and skill.",
      },
      {
        sourceEntryId: "e03",
        text: "Mariners have an innate connection with Venus due to their relationship with the ocean goddess. Witches are also often tied to Venus, which contributes to its maligned status in the Pact.",
      },
      {
        sourceEntryId: "e04",
        text: "The symbol Venus is treasured by fairies above all else, for the associated fairy-name denotes tremendous beauty and grace, and fairies will sometimes even wage war to earn such honors.",
      },
    ],
  },
  {
    sourceCollectionId: "sorcerer.celestial.mercury",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "celestial.mercury",
    },
    attribution: {
      work: "Codex 7. Sorcerer [Draft 4]",
      pages: "55-56",
      anchor: "Mercury (☿)",
    },
    bindingRequirement: "Finite source topic celestial.mercury; do NOT assume Orrery-body identity. Lore prose changes do not alter Orrery/spell mechanics.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Mercury is the fastest of the wandering stars, and was believed by the ancients to be the hounds of Oraia, carrying the sky-goddess's will across the night.",
      },
      {
        sourceEntryId: "e02",
        text: "Mercury is associated with speed, quick-wittedness, quicksilver, and transmutation. When performing magic, it is often used to ensure magic occurs quickly or quietly.",
      },
      {
        sourceEntryId: "e03",
        text: "Faustians claim the symbol Mercury as their own, rejecting the other symbol which is perhaps more obviously tied to their station, and use it to compliment their intelligence and charm.",
      },
      {
        sourceEntryId: "e04",
        text: "Before the Tragedies, a series of interconnected semaphore towers using Mercury symbols to quickly relay information were maintained by Wizards for communication across the globe.",
      },
    ],
  },
  {
    sourceCollectionId: "sorcerer.celestial.luna",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "celestial.luna",
    },
    attribution: {
      work: "Codex 7. Sorcerer [Draft 4]",
      pages: "56",
      anchor: "Luna (☾)",
    },
    bindingRequirement: "Finite source topic celestial.luna; do NOT assume Orrery-body identity. Lore prose changes do not alter Orrery/spell mechanics.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Luna was the ancient name of the Moon, and is still preferred by scholars seeking to grant her proper grace and authority.",
      },
      {
        sourceEntryId: "e02",
        text: "Luna is associated with wisdom, magic, silver, and thoughtfulness. When performing magic, its presence indicates the magic is of an especially pure and refined quality.",
      },
      {
        sourceEntryId: "e03",
        text: "The symbol Luna is used as the symbol of the Inscrutable Library, and of the Old College of magic before it, being venerated by the Wizards of ancient times as a symbol of magic itself.",
      },
      {
        sourceEntryId: "e04",
        text: "Before the Tragedies, there were legends of a lunar city built by Wizards as a utopia of knowledge and learning. If this is true, such a city is long-gone now.",
      },
    ],
  },
  {
    sourceCollectionId: "sorcerer.celestial.neptune",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "celestial.neptune",
    },
    attribution: {
      work: "Codex 7. Sorcerer [Draft 4]",
      pages: "56-57",
      anchor: "Neptune (♆)",
    },
    bindingRequirement: "Finite source topic celestial.neptune; do NOT assume Orrery-body identity. Lore prose changes do not alter Orrery/spell mechanics.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Neptune is the ghost-star, a celestial body prefigured by the ancients in their calculations and whose existence is vouched for by demons, and yet never seen by mortal eye.",
      },
      {
        sourceEntryId: "e02",
        text: "Neptune is associated with dreams, imagination, bismuth, and impossibility. When performing magic, its presence indicates a scope beyond human comprehension.",
      },
      {
        sourceEntryId: "e03",
        text: "Neptune has long been used as a symbol of Sages, hermits, and anchorites, and is sometimes called the fairy-star by the lonely Wizards who make regular use of it.",
      },
      {
        sourceEntryId: "e04",
        text: "While no astronomer has ever seen Neptune and no Orrery can predict Neptune's movements, through mathematics and its influence on the other stars its presence may still be determined — enormous, slow-moving, and asleep.",
      },
    ],
  },
  {
    sourceCollectionId: "sorcerer.celestial.sol",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "celestial.sol",
    },
    attribution: {
      work: "Codex 7. Sorcerer [Draft 4]",
      pages: "57",
      anchor: "Sol (☉)",
    },
    bindingRequirement: "Finite source topic celestial.sol; do NOT assume Orrery-body identity. Lore prose changes do not alter Orrery/spell mechanics.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "Sol was the ancient name for the Sun, still favored by scholars who seek to offer him the authority and fear he commands.",
      },
      {
        sourceEntryId: "e02",
        text: "Sol is associated with regality, mastery, gold, and authority. Its presence within a spell indicates technical perfection, a true command of all aspects of magic, a demonstration of power.",
      },
      {
        sourceEntryId: "e03",
        text: "The perfect circle, and thus the sun, was the symbol of the Wizard-King and the Sorcerers who followed him. Legends say he would use unknown magic to ensure a solar eclipse upon his coronation.",
      },
      {
        sourceEntryId: "e04",
        text: "So desperate were ancient Wizards for the use of the symbol Sol within their magic that many believe the Tragedies, if they did have any one cause, were started by a quarrel over access to such a symbol in a rather mundane spell.",
      },
    ],
  },
  {
    sourceCollectionId: "sorcerer.celestial.sulfur",
    subjectKind: "source_topic",
    binding: {
      strategy: "source_topic",
      topicId: "celestial.sulfur",
    },
    attribution: {
      work: "Codex 7. Sorcerer [Draft 4]",
      pages: "57",
      anchor: "Sulfur (🜍)",
    },
    bindingRequirement: "Finite source topic celestial.sulfur; do NOT assume Orrery-body identity. Lore prose changes do not alter Orrery/spell mechanics.",
    discrepancyNotes: [],
    entries: [
      {
        sourceEntryId: "e01",
        text: "During the Tragedies, legends tell of a new star in the sky — a burning red light that grew brighter than the sun during its final days.",
      },
      {
        sourceEntryId: "e02",
        text: "Sulfur is associated with the Devil. Its presence within a spell means such magic has been warped and corrupted by the Devil himself.",
      },
      {
        sourceEntryId: "e03",
        text: "Faustians do not enjoy their association with Sulfur, and yet it is just as much theirs as any other symbol. They earned a name for themselves through the manipulation and negotiation of its power.",
      },
      {
        sourceEntryId: "e04",
        text: "The balancing act between the Devil and the seven Wizards is the fundamental core of the Pact, and what keeps magic operational. While the Devil is an enemy of magic, his presence paradoxically sustains magic as well.",
      },
    ],
  },
];

export const DRAFT4_V1_SOURCE_LORE_CATALOG_SEMANTIC_DIGEST = "5e6880d9a51e5942ee697578b4eea9bddd8b3364ef081c24f61ae8db9afb2554" as const;
