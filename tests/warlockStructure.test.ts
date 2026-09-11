import { describe, it, expect } from "vitest";
import type {
  CampaignStateV5,
  DenizenId,
  IsleId,
  PlayerId,
  SageState,
  WarlockState,
  WizardId,
} from "../shared/domain";
import {
  DomainError,
  EMPTY_SAGE_STATE,
  EMPTY_SHARED_WORLD_STATE,
  EMPTY_WARLOCK_STATE,
  POWERFUL_DENIZEN_BUILTIN_TAXONOMY_IDS,
  WARLOCK_CLAN_DEFINITIONS,
  WARLOCK_CLAN_IDS,
  WARLOCK_COURT_LAW_DEFINITIONS,
  WARLOCK_COURT_LAW_IDS,
  WARLOCK_IDEOLOGY_DEFINITIONS,
  WARLOCK_IDEOLOGY_IDS,
  WARLOCK_LORD_TITLE_DEFINITIONS,
  WARLOCK_SOURCE_CLAN_HERALDRY,
  WARLOCK_SOURCE_CLAN_IDS,
  initialCampaignState,
  isValidWarlockRebellionId,
  sageOmenLocationKey,
  validateCampaignState,
  validateCampaignStateV5Candidate,
  validateWarlockStructure,
} from "../shared/domain";
import { campaignStateV5Validator } from "../convex/validators";
import type { WarlockCampaignCourtLawId } from "../shared/domain/warlock-state";
import type { WarlockGarrisonId } from "../shared/domain/warlock-state";
import type { WarlockRebellionId } from "../shared/domain/warlock-state";
import type { WarlockRelocatedMarketId } from "../shared/domain/warlock-state";
import { makeTestCampaignStateV5 } from "./test-state";

const PLR_A = "plr_00000000-0000-0000-0000-00000000000a" as PlayerId;
const WIZ_A = "wiz_00000000-0000-0000-0000-00000000000a" as WizardId;
const DEN_LADY = "den_00000000-0000-0000-0000-0000000000b1" as DenizenId;
const DEN_CONFIDANT = "den_00000000-0000-0000-0000-0000000000b2" as DenizenId;
const DEN_ERRANT = "den_00000000-0000-0000-0000-0000000000e1" as DenizenId;
const DEN_LORD = "den_00000000-0000-0000-0000-0000000000c1" as DenizenId;
const DEN_ARMY = "den_00000000-0000-0000-0000-0000000000a1" as DenizenId;
const DEN_HERO = "den_00000000-0000-0000-0000-0000000000d1" as DenizenId;
const DEN_NOBLE = "den_00000000-0000-0000-0000-0000000000f1" as DenizenId;
const ISL_MARKET = "isl_00000000-0000-0000-0000-0000000000c1" as IsleId;
const GARRISON_1 = "wgs_00000000-0000-0000-0000-000000000001" as WarlockGarrisonId;
const REBELLION_1 = "wrb_00000000-0000-0000-0000-000000000001" as WarlockRebellionId;
const RELOCATED_1 = "wrm_00000000-0000-0000-0000-000000000001" as WarlockRelocatedMarketId;
const LAW_CUSTOM = "wlw_00000000-0000-0000-0000-000000000001" as WarlockCampaignCourtLawId;

const EXPECTED_TITLE_COUNTS: Record<string, number> = {
  caravel: 9,
  lark: 8,
  uroch: 7,
  waine: 8,
  ix: 8,
};

function powerfulProfile(
  taxonomyId: "errant_noble" | "army" | "hero" | "beast",
  status: "reliable" | "disruptive" = "reliable",
) {
  return {
    taxonomies: [{ kind: "builtin" as const, taxonomyId }],
    status: { kind: "standard" as const, value: status },
    goal: null,
    methods: [],
    truths: [],
  };
}

function blankWizard(wizardId: WizardId, name: string) {
  return {
    wizardId,
    name,
    portrayedByPlayerId: PLR_A,
    character: {
      elements: null,
      pactFragmentPersonalForm: null,
      familiarDescription: null,
      ageYears: null,
      publicChangesOfMagic: [],
      importantNotes: null,
    },
    homeIsleId: null,
    sanctumPlaceId: null,
    mortalityState: "not_deceased" as const,
  };
}

function populatedWarlock(overrides: Partial<WarlockState> = {}): WarlockState {
  return {
    clans: [
      { clanId: "caravel", active: true, favor: 3 },
      { clanId: "lark", active: true, favor: 1 },
      { clanId: "orthodoxy", active: false, favor: 0 },
    ],
    campaignCourtLaws: [{ lawId: LAW_CUSTOM, text: "Always toast the new moon." }],
    activeCourtLawRefs: [
      { kind: "source", lawId: "wear_elaborate_decorative_dress" },
      { kind: "campaign", lawId: LAW_CUSTOM },
    ],
    titles: [
      {
        titleId: "royal_historian",
        occupantDenizenId: DEN_LORD,
        currentClanId: "caravel",
        distracted: false,
      },
      {
        titleId: "pontifex_of_the_immortal_flame",
        occupantDenizenId: null,
        currentClanId: "caravel",
        distracted: true,
      },
      {
        titleId: "warden_of_mt_ithax",
        occupantDenizenId: null,
        currentClanId: "caravel",
        distracted: false,
      },
      {
        titleId: "admiral_of_the_sidereal_sea",
        occupantDenizenId: null,
        currentClanId: "caravel",
        distracted: false,
      },
      {
        titleId: "crown_prince_of_the_halcyon_isles",
        occupantDenizenId: null,
        currentClanId: "caravel",
        distracted: false,
      },
      {
        titleId: "castellan_of_caravesse",
        occupantDenizenId: null,
        currentClanId: "pirates",
        distracted: false,
      },
      {
        titleId: "count_of_the_moonlit_atoll",
        occupantDenizenId: null,
        currentClanId: "lark",
        distracted: false,
      },
      {
        titleId: "duke_of_the_reach",
        occupantDenizenId: null,
        currentClanId: "lark",
        distracted: false,
      },
      {
        titleId: "knight_of_the_lion",
        occupantDenizenId: null,
        currentClanId: null,
        distracted: false,
      },
    ],
    clanDecks: [
      { clanId: "caravel", titleIds: ["royal_historian", "pontifex_of_the_immortal_flame"] },
    ],
    kingsAgenda: ["warden_of_mt_ithax"],
    setAsideTitleIds: ["crown_prince_of_the_halcyon_isles"],
    unclaimedTitleIds: ["knight_of_the_lion"],
    questTitles: [{
      titleId: "admiral_of_the_sidereal_sea",
      currentDomainSeatId: "mariner",
      visitedDomainSeatIds: ["warlock", "faustian"],
    }],
    faustianAccompliceTitles: [{
      titleId: "castellan_of_caravesse",
      communityId: "leo",
    }],
    devilTakenTitleIds: ["count_of_the_moonlit_atoll"],
    king: {
      occupant: { kind: "wizard", wizardId: WIZ_A },
      regnalName: "King Halcyon",
      clanId: "caravel",
      sunSign: 0,
      moonSign: 3,
      risingSign: 6,
      healthCondition: "healthy",
    },
    courtCondition: "ordinary",
    ladies: [
      { denizenId: DEN_LADY, clanId: "caravel" },
      { denizenId: DEN_CONFIDANT, clanId: "lark" },
    ],
    kingsFamilyLadyIds: [DEN_LADY],
    kingsConfidantLadyIds: [DEN_CONFIDANT],
    errantLadies: [{
      denizenId: DEN_ERRANT,
      clanId: "ix",
      heraldry: { kind: "source_clan", clanId: "ix" },
      personalityQuirk: "collects broken compasses",
      currentDomainSeatId: "sage",
      claimedComponent: { kind: "sage_dreamscape", segmentId: "position_4" },
      controlledLordTitleIds: ["duke_of_the_reach"],
    }],
    authority: [
      { target: { kind: "king" }, amount: 5 },
      { target: { kind: "ideology", ideologyId: "mercantilism" }, amount: 2 },
      { target: { kind: "clan", clanId: "caravel" }, amount: 1 },
      { target: { kind: "lord", titleId: "royal_historian" }, amount: 1 },
      { target: { kind: "noble", denizenId: DEN_NOBLE }, amount: 1 },
      { target: { kind: "garrison", garrisonId: GARRISON_1 }, amount: 3 },
      { target: { kind: "army", denizenId: DEN_ARMY }, amount: 2 },
      { target: { kind: "hierophant_temple", templeId: "ushin" }, amount: 1 },
      { target: { kind: "mariner_market", isleId: ISL_MARKET }, amount: 1 },
      { target: { kind: "relocated_market", relocatedMarketId: RELOCATED_1 }, amount: 1 },
      { target: { kind: "orrery" }, amount: 1 },
    ],
    garrisons: [{ garrisonId: GARRISON_1, domainSeatId: "warlock" }],
    armies: [{
      denizenId: DEN_ARMY,
      currentDomainSeatId: "warlock",
      favor: 2,
      sponsor: { kind: "clan", clanId: "caravel" },
      alignedIdeologyId: "rebellion",
      lifecycle: "active",
    }],
    heroes: [{
      denizenId: DEN_HERO,
      currentDomainSeatId: "warlock",
      fame: "great",
      heroicTitles: [{ glyph: "jupiter", title: "Star of the Tide" }],
    }],
    rebellions: [{
      rebellionId: REBELLION_1,
      domainSeatId: "necromancer",
      lordTitleIds: [],
    }],
    marketHeraldry: [{
      isleId: ISL_MARKET,
      clanCounts: [
        { clanId: "caravel", count: 2 },
        { clanId: "lark", count: 1 },
      ],
    }],
    relocatedMarkets: [{
      relocatedMarketId: RELOCATED_1,
      originIsleId: ISL_MARKET,
      currentDomainSeatId: "faustian",
      clanCounts: [{ clanId: "waine", count: 1 }],
    }],
    partnerships: [
      { kind: "mercantilism", wizardId: WIZ_A, partnerName: "The Ishana Exchange" },
      { kind: "piracy", wizardId: WIZ_A, partnerName: "The Red Ledger" },
      {
        kind: "monarchy",
        wizardId: WIZ_A,
        kingRef: { kind: "wizard", wizardId: WIZ_A },
      },
    ],
    ...overrides,
  };
}

function populatedWorld() {
  return {
    ...EMPTY_SHARED_WORLD_STATE,
    denizens: [
      {
        denizenId: DEN_LADY,
        name: "Lady Caravel",
        representation: "individual" as const,
        description: null,
        mortalityState: "not_deceased" as const,
        powerfulProfile: null,
      },
      {
        denizenId: DEN_CONFIDANT,
        name: "Lady Lark",
        representation: "individual" as const,
        description: null,
        mortalityState: "not_deceased" as const,
        powerfulProfile: null,
      },
      {
        denizenId: DEN_ERRANT,
        name: "The Goat Errant",
        representation: "individual" as const,
        description: null,
        mortalityState: "not_deceased" as const,
        powerfulProfile: powerfulProfile("errant_noble"),
      },
      {
        denizenId: DEN_LORD,
        name: "Historian",
        representation: "individual" as const,
        description: null,
        mortalityState: "not_deceased" as const,
        powerfulProfile: null,
      },
      {
        denizenId: DEN_ARMY,
        name: "The Caravel Host",
        representation: "collective" as const,
        description: null,
        mortalityState: null,
        powerfulProfile: powerfulProfile("army"),
      },
      {
        denizenId: DEN_HERO,
        name: "Tide-Star",
        representation: "individual" as const,
        description: null,
        mortalityState: "not_deceased" as const,
        powerfulProfile: powerfulProfile("hero"),
      },
      {
        denizenId: DEN_NOBLE,
        name: "A courtier",
        representation: "individual" as const,
        description: null,
        mortalityState: "not_deceased" as const,
        powerfulProfile: null,
      },
    ],
    isles: [{ isleId: ISL_MARKET, name: "Market Isle", description: null }],
  };
}

function populatedSage(): SageState {
  return {
    ...EMPTY_SAGE_STATE,
    omenLedger: [
      { location: { kind: "warlock_court" }, count: 2 },
      { location: { kind: "warlock_rebellion", rebellionId: REBELLION_1 }, count: 1 },
    ],
  };
}

function baseV5(
  warlock: WarlockState = EMPTY_WARLOCK_STATE,
  extras: Partial<CampaignStateV5> = {},
): CampaignStateV5 {
  return makeTestCampaignStateV5({
    players: extras.players ?? [{ playerId: PLR_A, name: "Alice" }],
    wizards: extras.wizards ?? [blankWizard(WIZ_A, "Warlock")],
    world: extras.world ?? { ...EMPTY_SHARED_WORLD_STATE },
    sage: extras.sage ?? EMPTY_SAGE_STATE,
    warlock,
    ...extras,
  });
}

function matchesValidator(
  validator: { kind?: string; value?: unknown; members?: unknown[]; element?: unknown; fields?: Record<string, unknown>; inner?: unknown },
  value: unknown,
): boolean {
  switch (validator.kind) {
    case "string":
      return typeof value === "string";
    case "number":
    case "float64":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    case "literal":
      return value === validator.value;
    case "any":
      return true;
    case "union":
      return (validator.members as Array<{ kind?: string }>).some((member) => matchesValidator(member, value));
    case "array":
      return Array.isArray(value) && value.every((item) => matchesValidator(validator.element as { kind?: string }, item));
    case "optional":
      return value === undefined || matchesValidator(validator.inner as { kind?: string }, value);
    case "object": {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return false;
      }
      const obj = value as Record<string, unknown>;
      for (const [key, field] of Object.entries(validator.fields ?? {})) {
        const fieldValidator = field as { kind?: string; inner?: unknown };
        const optional = fieldValidator.kind === "optional";
        const inner = optional ? fieldValidator.inner as { kind?: string } : fieldValidator;
        if (!(key in obj) || obj[key] === undefined) {
          if (optional) continue;
          return false;
        }
        if (!matchesValidator(inner, obj[key])) {
          return false;
        }
      }
      return true;
    }
    default:
      return false;
  }
}

function expectInvalid(state: unknown, pattern: RegExp): void {
  expect(() => validateCampaignStateV5Candidate(state)).toThrow(DomainError);
  try {
    validateCampaignStateV5Candidate(state);
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as Error).message).toMatch(pattern);
  }
}

describe("Warlock catalogs", () => {
  it("has seven Court Laws, seven Ideologies, seven Clans, five source heraldries, and 41 Titles", () => {
    expect(WARLOCK_COURT_LAW_IDS).toHaveLength(7);
    expect(WARLOCK_COURT_LAW_DEFINITIONS.map((law) => law.text)).toEqual([
      "Do not speak to a superior until spoken to.",
      "Speak kindly of and agree with other nobles; challenge only by subtle reframing.",
      "Wear elaborate decorative dress.",
      "Follow elaborate dining etiquette.",
      "Give lavish gifts to other nobility.",
      "Do not lift objects or perform common labor without servants.",
      "Never speak the previous King's name in polite company.",
    ]);

    expect(WARLOCK_IDEOLOGY_IDS).toEqual([
      "aristocracy",
      "mercantilism",
      "orthodoxy",
      "piracy",
      "rebellion",
      "ergoism",
      "monarchy",
    ]);
    expect(WARLOCK_IDEOLOGY_DEFINITIONS.map((ideology) => ideology.name)).toEqual([
      "Aristocracy",
      "Mercantilism",
      "Orthodoxy",
      "Piracy",
      "Rebellion",
      "Ergoism",
      "Monarchy",
    ]);

    expect(WARLOCK_CLAN_IDS).toEqual([
      "caravel",
      "uroch",
      "lark",
      "waine",
      "ix",
      "orthodoxy",
      "pirates",
    ]);
    expect(WARLOCK_SOURCE_CLAN_IDS).toEqual(["caravel", "uroch", "lark", "waine", "ix"]);
    expect(WARLOCK_SOURCE_CLAN_HERALDRY).toEqual({
      caravel: "dragon",
      uroch: "crab",
      lark: "songbird",
      waine: "dog",
      ix: "goat",
    });
    expect(WARLOCK_CLAN_DEFINITIONS.filter((clan) => clan.kind === "emergent").map((clan) => clan.clanId))
      .toEqual(["orthodoxy", "pirates"]);

    expect(WARLOCK_LORD_TITLE_DEFINITIONS).toHaveLength(41);
    for (const [clanId, count] of Object.entries(EXPECTED_TITLE_COUNTS)) {
      expect(
        WARLOCK_LORD_TITLE_DEFINITIONS.filter((title) => title.sourceClanId === clanId),
      ).toHaveLength(count);
    }
    expect(WARLOCK_LORD_TITLE_DEFINITIONS.filter((title) => title.sourceClanId === null)).toHaveLength(1);

    const crownPrince = WARLOCK_LORD_TITLE_DEFINITIONS.find(
      (title) => title.titleId === "crown_prince_of_the_halcyon_isles",
    );
    expect(crownPrince).toMatchObject({
      name: "Crown Prince of the Halcyon Isles",
      sourceClanId: "caravel",
      associatedSeatId: "warlock",
      sourceLocationLabel: "Halcyon Isles",
      passiveIdeologyId: "rebellion",
      baseSetupPlacement: "set_aside",
    });

    const bastard = WARLOCK_LORD_TITLE_DEFINITIONS.find(
      (title) => title.titleId === "bastard_son_of_the_king",
    );
    expect(bastard).toMatchObject({
      name: "Bastard Son of the King",
      sourceClanId: null,
      associatedSeatId: "warlock",
      sourceLocationLabel: "Halcyon Isles",
      passiveIdeologyId: null,
      baseSetupPlacement: "set_aside",
    });

    expect(POWERFUL_DENIZEN_BUILTIN_TAXONOMY_IDS).toEqual(
      expect.arrayContaining(["errant_noble", "army", "hero"]),
    );
  });
});

describe("Warlock empty and V5 integration", () => {
  it("accepts EMPTY_WARLOCK_STATE and initialCampaignState() V5 warlock", () => {
    expect(EMPTY_WARLOCK_STATE).toEqual({
      clans: [],
      campaignCourtLaws: [],
      activeCourtLawRefs: [],
      titles: [],
      clanDecks: [],
      kingsAgenda: [],
      setAsideTitleIds: [],
      unclaimedTitleIds: [],
      questTitles: [],
      faustianAccompliceTitles: [],
      devilTakenTitleIds: [],
      king: null,
      courtCondition: null,
      ladies: [],
      kingsFamilyLadyIds: [],
      kingsConfidantLadyIds: [],
      errantLadies: [],
      authority: [],
      garrisons: [],
      armies: [],
      heroes: [],
      rebellions: [],
      marketHeraldry: [],
      relocatedMarkets: [],
      partnerships: [],
    });
    expect("initialized" in EMPTY_WARLOCK_STATE).toBe(false);
    expect(() => validateWarlockStructure(EMPTY_WARLOCK_STATE)).not.toThrow();

    const initial = initialCampaignState();
    expect(initial.schemaVersion).toBe(5);
    expect(initial.warlock).toEqual(EMPTY_WARLOCK_STATE);
    expect(() => validateCampaignState(initial)).not.toThrow();
    expect(() => validateCampaignStateV5Candidate(baseV5())).not.toThrow();
  });
});

describe("Warlock populated Court", () => {
  it("accepts a representative populated Court with King, Clans, ordered deck/Agenda, and Laws", () => {
    const warlock = populatedWarlock();
    expect(warlock.clanDecks[0]?.titleIds).toEqual([
      "royal_historian",
      "pontifex_of_the_immortal_flame",
    ]);
    expect(warlock.kingsAgenda).toEqual(["warden_of_mt_ithax"]);
    expect(warlock.activeCourtLawRefs).toHaveLength(2);
    expect(() => validateCampaignStateV5Candidate(baseV5(warlock, {
      world: populatedWorld(),
    }))).not.toThrow();
  });
});

describe("Warlock Title exact-one-location partition", () => {
  it("accepts a valid partition and rejects duplicate or missing Title locations", () => {
    expect(() => validateWarlockStructure(populatedWarlock())).not.toThrow();

    expectInvalid(baseV5(populatedWarlock({
      kingsAgenda: ["warden_of_mt_ithax", "royal_historian"],
    }), { world: populatedWorld() }), /Duplicate Warlock Title location/);

    expectInvalid(baseV5(populatedWarlock({
      clanDecks: [],
    }), { world: populatedWorld() }), /Warlock Title is not located/);
  });
});

describe("Warlock King, signs, and Ladies", () => {
  it("represents King subject/signs and ordered Family/Confidant Ladies", () => {
    const warlock = populatedWarlock();
    expect(warlock.king).toMatchObject({
      occupant: { kind: "wizard", wizardId: WIZ_A },
      sunSign: 0,
      moonSign: 3,
      risingSign: 6,
      healthCondition: "healthy",
    });
    expect(warlock.kingsFamilyLadyIds).toEqual([DEN_LADY]);
    expect(warlock.kingsConfidantLadyIds).toEqual([DEN_CONFIDANT]);
    expect(() => validateCampaignStateV5Candidate(baseV5(warlock, {
      world: populatedWorld(),
    }))).not.toThrow();

    expectInvalid(baseV5(populatedWarlock({
      king: {
        occupant: { kind: "wizard", wizardId: "wiz_00000000-0000-0000-0000-000000000099" as WizardId },
        regnalName: "Pretender",
        clanId: "caravel",
        sunSign: 0,
        moonSign: 3,
        risingSign: 6,
        healthCondition: "deathly_ill",
      },
    }), { world: populatedWorld() }), /wizardId does not resolve/);
  });
});

describe("Warlock Authority ledger", () => {
  it("accepts representative local/cross-Domain targets and rejects duplicate targets", () => {
    expect(() => validateCampaignStateV5Candidate(baseV5(populatedWarlock(), {
      world: populatedWorld(),
    }))).not.toThrow();

    expectInvalid(baseV5(populatedWarlock({
      authority: [
        { target: { kind: "king" }, amount: 1 },
        { target: { kind: "king" }, amount: 2 },
      ],
    }), { world: populatedWorld() }), /Duplicate Warlock Authority target/);
  });
});

describe("Warlock Errant Lady claims", () => {
  it("accepts a typed Sage Dreamscape claim and requires errant_noble taxonomy", () => {
    expect(() => validateCampaignStateV5Candidate(baseV5(populatedWarlock(), {
      world: populatedWorld(),
    }))).not.toThrow();

    const withoutTaxonomy = {
      ...populatedWorld(),
      denizens: populatedWorld().denizens.map((denizen) =>
        denizen.denizenId === DEN_ERRANT
          ? { ...denizen, powerfulProfile: powerfulProfile("beast") }
          : denizen,
      ),
    };
    expectInvalid(baseV5(populatedWarlock(), { world: withoutTaxonomy }), /requires builtin taxonomy errant_noble/);
  });
});

describe("Warlock Army, Hero, and Errant-Noble Powerful integration", () => {
  it("requires Army collective+army, Hero individual+hero, and Errant individual+errant_noble", () => {
    expect(() => validateCampaignStateV5Candidate(baseV5(populatedWarlock(), {
      world: populatedWorld(),
    }))).not.toThrow();

    const individualArmy = {
      ...populatedWorld(),
      denizens: populatedWorld().denizens.map((denizen) =>
        denizen.denizenId === DEN_ARMY
          ? { ...denizen, representation: "individual" as const, mortalityState: "not_deceased" as const }
          : denizen,
      ),
    };
    expectInvalid(baseV5(populatedWarlock(), { world: individualArmy }), /must reference a collective Denizen/);

    const collectiveHero = {
      ...populatedWorld(),
      denizens: populatedWorld().denizens.map((denizen) =>
        denizen.denizenId === DEN_HERO
          ? { ...denizen, representation: "collective" as const, mortalityState: null }
          : denizen,
      ),
    };
    expectInvalid(baseV5(populatedWarlock(), { world: collectiveHero }), /must reference an individual Denizen/);
  });
});

describe("Warlock Rebellions and Sage Omen extension", () => {
  it("accepts Court and Rebellion Omen targets and rejects an unknown Rebellion", () => {
    const valid = baseV5(populatedWarlock(), {
      world: populatedWorld(),
      sage: populatedSage(),
    });
    expect(sageOmenLocationKey({ kind: "warlock_court" })).toBe("warlock_court");
    expect(sageOmenLocationKey({ kind: "warlock_rebellion", rebellionId: REBELLION_1 }))
      .toBe(`warlock_rebellion:${REBELLION_1}`);
    expect(isValidWarlockRebellionId(REBELLION_1)).toBe(true);
    expect(() => validateCampaignStateV5Candidate(valid)).not.toThrow();

    expectInvalid(baseV5(populatedWarlock(), {
      world: populatedWorld(),
      sage: {
        ...EMPTY_SAGE_STATE,
        omenLedger: [{
          location: {
            kind: "warlock_rebellion",
            rebellionId: "wrb_00000000-0000-0000-0000-000000000099" as WarlockRebellionId,
          },
          count: 1,
        }],
      },
    }), /rebellionId does not resolve/);
  });
});

describe("Warlock Market Heraldry, relocated Markets, and partnerships", () => {
  it("accepts representative Market Heraldry, a relocated Market, and source partnerships", () => {
    const warlock = populatedWarlock();
    expect(warlock.marketHeraldry[0]?.clanCounts).toEqual([
      { clanId: "caravel", count: 2 },
      { clanId: "lark", count: 1 },
    ]);
    expect(warlock.relocatedMarkets[0]?.relocatedMarketId).toBe(RELOCATED_1);
    expect(warlock.partnerships.map((partnership) => partnership.kind)).toEqual([
      "mercantilism",
      "piracy",
      "monarchy",
    ]);
    expect(() => validateCampaignStateV5Candidate(baseV5(warlock, {
      world: populatedWorld(),
    }))).not.toThrow();
  });
});

describe("Warlock current-V5 and Convex validators", () => {
  it("accepts representative valid Warlock state and rejects one malformed Warlock reference", () => {
    const valid = baseV5(populatedWarlock(), { world: populatedWorld() });
    expect(() => validateCampaignStateV5Candidate(valid)).not.toThrow();
    expect(matchesValidator(campaignStateV5Validator, valid)).toBe(true);

    const malformed = {
      ...valid,
      warlock: {
        ...valid.warlock,
        titles: valid.warlock.titles.map((title) =>
          title.titleId === "royal_historian"
            ? { ...title, occupantDenizenId: "den_00000000-0000-0000-0000-000000000099" as DenizenId }
            : title,
        ),
      },
    };
    expectInvalid(malformed, /occupantDenizenId does not resolve/);
    expect(matchesValidator(campaignStateV5Validator, malformed)).toBe(true);

    const missingWarlock = { ...valid } as unknown as Record<string, unknown>;
    delete missingWarlock.warlock;
    expect(matchesValidator(campaignStateV5Validator, missingWarlock)).toBe(false);
    expectInvalid(missingWarlock, /Missing or invalid warlock/);
  });
});
