import type { Brand } from "./brand";
import type { DenizenId, IsleId, PlaceId, WizardId } from "./ids";
import type { PactSeatId } from "./pact-seats";
import type { HouseIndex } from "./orrery";
import type { WizardOrDenizenSubjectRef } from "./shared-world";
import type { HierophantTempleId } from "./hierophant-catalogs";
import type { NecromancerEdgePathSpaceId } from "./necromancer-catalogs";
import type { MarinerSeaRegionId } from "./mariner-catalogs";
import type { FaustianCommunityId } from "./faustian-catalogs";
import type { SageDreamscapeSegmentId } from "./sage-catalogs";
import type { SorcererResearchPositionId } from "./sorcerer-state";
import type {
  WarlockArmyLifecycle,
  WarlockClanId,
  WarlockCourtCondition,
  WarlockCourtLawId,
  WarlockHeroFame,
  WarlockHeroicTitleGlyph,
  WarlockIdeologyId,
  WarlockKingHealthCondition,
  WarlockLordTitleId,
  WarlockSourceClanId,
} from "./warlock-catalogs";

export type WarlockCampaignCourtLawId = Brand<string, "WarlockCampaignCourtLawId">;
export type WarlockGarrisonId = Brand<string, "WarlockGarrisonId">;
export type WarlockRebellionId = Brand<string, "WarlockRebellionId">;
export type WarlockRelocatedMarketId = Brand<string, "WarlockRelocatedMarketId">;

const BRANDED_UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const CAMPAIGN_COURT_LAW_ID_REGEX = new RegExp(`^wlw_${BRANDED_UUID}$`);
const GARRISON_ID_REGEX = new RegExp(`^wgs_${BRANDED_UUID}$`);
const REBELLION_ID_REGEX = new RegExp(`^wrb_${BRANDED_UUID}$`);
const RELOCATED_MARKET_ID_REGEX = new RegExp(`^wrm_${BRANDED_UUID}$`);

export function isValidWarlockCampaignCourtLawId(value: string): value is WarlockCampaignCourtLawId {
  return CAMPAIGN_COURT_LAW_ID_REGEX.test(value);
}

export function isValidWarlockGarrisonId(value: string): value is WarlockGarrisonId {
  return GARRISON_ID_REGEX.test(value);
}

export function isValidWarlockRebellionId(value: string): value is WarlockRebellionId {
  return REBELLION_ID_REGEX.test(value);
}

export function isValidWarlockRelocatedMarketId(value: string): value is WarlockRelocatedMarketId {
  return RELOCATED_MARKET_ID_REGEX.test(value);
}

export interface WarlockClanState {
  readonly clanId: WarlockClanId;
  readonly active: boolean;
  readonly favor: number;
}

export interface WarlockCampaignCourtLaw {
  readonly lawId: WarlockCampaignCourtLawId;
  readonly text: string;
}

export type WarlockCourtLawRef =
  | {
      readonly kind: "source";
      readonly lawId: WarlockCourtLawId;
    }
  | {
      readonly kind: "campaign";
      readonly lawId: WarlockCampaignCourtLawId;
    };

export interface WarlockLordTitleState {
  readonly titleId: WarlockLordTitleId;
  readonly occupantDenizenId: DenizenId | null;
  readonly currentClanId: WarlockClanId | null;
  readonly distracted: boolean;
}

export interface WarlockClanDeckState {
  readonly clanId: WarlockClanId;
  readonly titleIds: readonly WarlockLordTitleId[];
}

export interface WarlockQuestTitleState {
  readonly titleId: WarlockLordTitleId;
  readonly currentDomainSeatId: PactSeatId;
  readonly visitedDomainSeatIds: readonly PactSeatId[];
}

export interface WarlockFaustianAccompliceTitleState {
  readonly titleId: WarlockLordTitleId;
  readonly communityId: FaustianCommunityId;
}

export interface WarlockKingState {
  readonly occupant: WizardOrDenizenSubjectRef | null;
  readonly regnalName: string | null;
  readonly clanId: WarlockClanId | null;
  readonly sunSign: HouseIndex | null;
  readonly moonSign: HouseIndex | null;
  readonly risingSign: HouseIndex | null;
  readonly healthCondition: WarlockKingHealthCondition;
}

export interface WarlockLadyOverlay {
  readonly denizenId: DenizenId;
  readonly clanId: WarlockClanId;
}

export type WarlockErrantHeraldry =
  | {
      readonly kind: "source_clan";
      readonly clanId: WarlockSourceClanId;
    }
  | {
      readonly kind: "custom";
      readonly description: string;
    };

export type WarlockErrantClaim =
  | {
      readonly kind: "necromancer_edge";
      readonly pathSpaceId: NecromancerEdgePathSpaceId;
    }
  | {
      readonly kind: "hierophant_temple";
      readonly templeId: HierophantTempleId;
    }
  | {
      readonly kind: "mariner_sea_region";
      readonly seaRegionId: MarinerSeaRegionId;
    }
  | {
      readonly kind: "mariner_beast";
      readonly denizenId: DenizenId;
    }
  | {
      readonly kind: "faustian_community";
      readonly communityId: FaustianCommunityId;
    }
  | {
      readonly kind: "sage_dreamscape";
      readonly segmentId: SageDreamscapeSegmentId;
    }
  | {
      readonly kind: "sorcerer_research_position";
      readonly positionId: SorcererResearchPositionId;
    }
  | {
      readonly kind: "sorcerer_tower";
      readonly placeId: PlaceId;
    };

export interface WarlockErrantLadyOverlay {
  readonly denizenId: DenizenId;
  readonly clanId: WarlockClanId;
  readonly heraldry: WarlockErrantHeraldry;
  readonly personalityQuirk: string;
  readonly currentDomainSeatId: PactSeatId;
  readonly claimedComponent: WarlockErrantClaim;
  readonly controlledLordTitleIds: readonly WarlockLordTitleId[];
}

export type WarlockAuthorityTarget =
  | {
      readonly kind: "king";
    }
  | {
      readonly kind: "ideology";
      readonly ideologyId: WarlockIdeologyId;
    }
  | {
      readonly kind: "clan";
      readonly clanId: WarlockClanId;
    }
  | {
      readonly kind: "lord";
      readonly titleId: WarlockLordTitleId;
    }
  | {
      readonly kind: "noble";
      readonly denizenId: DenizenId;
    }
  | {
      readonly kind: "garrison";
      readonly garrisonId: WarlockGarrisonId;
    }
  | {
      readonly kind: "army";
      readonly denizenId: DenizenId;
    }
  | {
      readonly kind: "hierophant_temple";
      readonly templeId: HierophantTempleId;
    }
  | {
      readonly kind: "mariner_market";
      readonly isleId: IsleId;
    }
  | {
      readonly kind: "relocated_market";
      readonly relocatedMarketId: WarlockRelocatedMarketId;
    }
  | {
      readonly kind: "orrery";
    };

export interface WarlockAuthorityEntry {
  readonly target: WarlockAuthorityTarget;
  readonly amount: number;
}

export function warlockAuthorityTargetKey(target: WarlockAuthorityTarget): string {
  switch (target.kind) {
    case "king":
      return "king";
    case "ideology":
      return `ideology:${target.ideologyId}`;
    case "clan":
      return `clan:${target.clanId}`;
    case "lord":
      return `lord:${target.titleId}`;
    case "noble":
      return `noble:${target.denizenId}`;
    case "garrison":
      return `garrison:${target.garrisonId}`;
    case "army":
      return `army:${target.denizenId}`;
    case "hierophant_temple":
      return `hierophant_temple:${target.templeId}`;
    case "mariner_market":
      return `mariner_market:${target.isleId}`;
    case "relocated_market":
      return `relocated_market:${target.relocatedMarketId}`;
    case "orrery":
      return "orrery";
  }
}

export interface WarlockGarrisonState {
  readonly garrisonId: WarlockGarrisonId;
  readonly domainSeatId: PactSeatId;
}

export type WarlockArmySponsor =
  | {
      readonly kind: "king";
    }
  | {
      readonly kind: "clan";
      readonly clanId: WarlockClanId;
    }
  | {
      readonly kind: "wizard";
      readonly wizardId: WizardId;
    };

export interface WarlockArmyOverlay {
  readonly denizenId: DenizenId;
  readonly currentDomainSeatId: PactSeatId;
  readonly favor: number;
  readonly sponsor: WarlockArmySponsor;
  readonly alignedIdeologyId: WarlockIdeologyId | null;
  readonly lifecycle: WarlockArmyLifecycle;
}

export interface WarlockHeroicTitle {
  readonly glyph: WarlockHeroicTitleGlyph;
  readonly title: string;
}

export interface WarlockHeroOverlay {
  readonly denizenId: DenizenId;
  readonly currentDomainSeatId: PactSeatId;
  readonly fame: WarlockHeroFame;
  readonly heroicTitles: readonly WarlockHeroicTitle[];
}

export interface WarlockRebellionState {
  readonly rebellionId: WarlockRebellionId;
  readonly domainSeatId: PactSeatId;
  readonly lordTitleIds: readonly WarlockLordTitleId[];
}

export interface WarlockClanHeraldryCount {
  readonly clanId: WarlockClanId;
  readonly count: number;
}

export interface WarlockMarketHeraldryState {
  readonly isleId: IsleId;
  readonly clanCounts: readonly WarlockClanHeraldryCount[];
}

export interface WarlockRelocatedMarketState {
  readonly relocatedMarketId: WarlockRelocatedMarketId;
  readonly originIsleId: IsleId | null;
  readonly currentDomainSeatId: PactSeatId;
  readonly clanCounts: readonly WarlockClanHeraldryCount[];
}

export type WarlockPartnership =
  | {
      readonly kind: "mercantilism";
      readonly wizardId: WizardId;
      readonly partnerName: string;
    }
  | {
      readonly kind: "piracy";
      readonly wizardId: WizardId;
      readonly partnerName: string;
    }
  | {
      readonly kind: "monarchy";
      readonly wizardId: WizardId;
      readonly kingRef: WizardOrDenizenSubjectRef;
    };

export interface WarlockState {
  readonly clans: readonly WarlockClanState[];
  readonly campaignCourtLaws: readonly WarlockCampaignCourtLaw[];
  readonly activeCourtLawRefs: readonly WarlockCourtLawRef[];
  readonly titles: readonly WarlockLordTitleState[];
  readonly clanDecks: readonly WarlockClanDeckState[];
  readonly kingsAgenda: readonly WarlockLordTitleId[];
  readonly setAsideTitleIds: readonly WarlockLordTitleId[];
  readonly unclaimedTitleIds: readonly WarlockLordTitleId[];
  readonly questTitles: readonly WarlockQuestTitleState[];
  readonly faustianAccompliceTitles: readonly WarlockFaustianAccompliceTitleState[];
  readonly devilTakenTitleIds: readonly WarlockLordTitleId[];
  readonly king: WarlockKingState | null;
  readonly courtCondition: WarlockCourtCondition | null;
  readonly ladies: readonly WarlockLadyOverlay[];
  readonly kingsFamilyLadyIds: readonly DenizenId[];
  readonly kingsConfidantLadyIds: readonly DenizenId[];
  readonly errantLadies: readonly WarlockErrantLadyOverlay[];
  readonly authority: readonly WarlockAuthorityEntry[];
  readonly garrisons: readonly WarlockGarrisonState[];
  readonly armies: readonly WarlockArmyOverlay[];
  readonly heroes: readonly WarlockHeroOverlay[];
  readonly rebellions: readonly WarlockRebellionState[];
  readonly marketHeraldry: readonly WarlockMarketHeraldryState[];
  readonly relocatedMarkets: readonly WarlockRelocatedMarketState[];
  readonly partnerships: readonly WarlockPartnership[];
}

export const EMPTY_WARLOCK_STATE: WarlockState = {
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
};
