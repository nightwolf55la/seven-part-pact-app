import type { Brand } from "./brand";
import type { DenizenId, PlaceId } from "./ids";
import type { PactSeatId } from "./pact-seats";
import type {
  HierophantBuiltinBlasphemyId,
  HierophantBuiltinClassId,
  HierophantBuiltinDoctrineId,
  HierophantBuiltinDogmaId,
  HierophantCampaignTempleId,
  HierophantDogmaCategory,
  HierophantFlameLawId,
  HierophantTempleId,
  HierophantTempleKind,
} from "./hierophant-catalogs";

export type HierophantCampaignClassId = Brand<string, "HierophantCampaignClassId">;
export type HierophantClassId = HierophantBuiltinClassId | HierophantCampaignClassId;

export type HierophantCampaignDoctrineId = Brand<string, "HierophantCampaignDoctrineId">;
export type HierophantDoctrineId = HierophantBuiltinDoctrineId | HierophantCampaignDoctrineId;

export type HierophantCampaignBlasphemyId = Brand<string, "HierophantCampaignBlasphemyId">;
export type HierophantBlasphemyId = HierophantBuiltinBlasphemyId | HierophantCampaignBlasphemyId;

export type HierophantDogmaEntryId = Brand<string, "HierophantDogmaEntryId">;

export type HierophantTempleStatus = "active" | "collapsed";

export type OrdinaryTempleDoctrineState =
  | { readonly kind: "unset" }
  | { readonly kind: "doctrine"; readonly doctrineId: HierophantDoctrineId }
  | { readonly kind: "blasphemy"; readonly blasphemyId: HierophantBlasphemyId };

export interface OrdinaryHierophantTemple {
  readonly templeId: HierophantTempleId;
  readonly kind: "ordinary";
  readonly placeId: PlaceId;
  readonly hostSeatId: PactSeatId;
  readonly status: HierophantTempleStatus;
  readonly abundance: number;
  readonly conviction: number;
  readonly doctrine: OrdinaryTempleDoctrineState;
}

export interface HestarHierophantTemple {
  readonly templeId: HierophantTempleId;
  readonly kind: "hestar";
  readonly placeId: PlaceId;
  readonly hostSeatId: PactSeatId;
  readonly status: HierophantTempleStatus;
  readonly abundance: number;
  readonly conviction: number;
}

export type HierophantTemple = OrdinaryHierophantTemple | HestarHierophantTemple;

export interface HierophantCampaignClass {
  readonly classId: HierophantCampaignClassId;
  readonly name: string;
}

export interface HierophantCampaignBlasphemy {
  readonly blasphemyId: HierophantCampaignBlasphemyId;
  readonly text: string;
}

export interface HierophantCampaignDoctrine {
  readonly doctrineId: HierophantCampaignDoctrineId;
  readonly orthodoxText: string | null;
  readonly blasphemy: HierophantCampaignBlasphemy | null;
  readonly supportedClassIds: readonly HierophantClassId[];
}

export type HierophantTempleArea = "courtyard" | "agiary";

export type HierophantSupplicantHost =
  | {
      readonly kind: "temple";
      readonly templeId: HierophantTempleId;
      readonly area: HierophantTempleArea | null;
    }
  | {
      readonly kind: "cult";
      readonly cultDenizenId: DenizenId;
    };

export interface HierophantSupplicant {
  readonly denizenId: DenizenId;
  readonly classId: HierophantClassId;
  readonly woe: number;
  readonly host: HierophantSupplicantHost;
}

export type HierophantProphetDisposition = "reliable" | "disruptive";

export type HierophantProphetHost =
  | {
      readonly kind: "temple";
      readonly templeId: HierophantTempleId;
    }
  | {
      readonly kind: "cult";
      readonly cultDenizenId: DenizenId;
    };

export interface HierophantProphet {
  readonly denizenId: DenizenId;
  readonly disposition: HierophantProphetDisposition;
  readonly host: HierophantProphetHost;
}

export type HierophantCultDogma =
  | {
      readonly dogmaEntryId: HierophantDogmaEntryId;
      readonly kind: "builtin";
      readonly dogmaId: HierophantBuiltinDogmaId;
    }
  | {
      readonly dogmaEntryId: HierophantDogmaEntryId;
      readonly kind: "custom";
      readonly category: HierophantDogmaCategory;
      readonly text: string;
    };

export interface HierophantCult {
  readonly cultDenizenId: DenizenId;
  readonly hostSeatId: PactSeatId;
  readonly anchorPlaceId: PlaceId | null;
  readonly leaderDenizenId: DenizenId | null;
  readonly blasphemyId: HierophantBlasphemyId;
  readonly abundance: number;
  readonly conviction: number;
  readonly dogmas: readonly HierophantCultDogma[];
}

export interface HierophantState {
  readonly selectedFlameLawIds: readonly HierophantFlameLawId[];
  readonly campaignClasses: readonly HierophantCampaignClass[];
  readonly campaignDoctrines: readonly HierophantCampaignDoctrine[];
  readonly temples: readonly HierophantTemple[];
  readonly supplicants: readonly HierophantSupplicant[];
  readonly prophets: readonly HierophantProphet[];
  readonly cults: readonly HierophantCult[];
  readonly holidayTempleIds: readonly HierophantTempleId[];
}

export const EMPTY_HIEROPHANT_STATE: HierophantState = {
  selectedFlameLawIds: [],
  campaignClasses: [],
  campaignDoctrines: [],
  temples: [],
  supplicants: [],
  prophets: [],
  cults: [],
  holidayTempleIds: [],
};

export type {
  HierophantFlameLawId,
  HierophantTempleId,
  HierophantTempleKind,
  HierophantCampaignTempleId,
};
