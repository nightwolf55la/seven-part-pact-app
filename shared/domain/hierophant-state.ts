import type { Brand } from "./brand";
import type { PlaceId } from "./ids";
import type { PactSeatId } from "./pact-seats";
import type {
  HierophantFlameLawId,
  HierophantTempleId,
  HierophantTempleKind,
} from "./hierophant-catalogs";

export type HierophantClassId = Brand<string, "HierophantClassId">;
export type HierophantDoctrineId = Brand<string, "HierophantDoctrineId">;
export type HierophantBlasphemyId = Brand<string, "HierophantBlasphemyId">;
export type HierophantSupplicantId = Brand<string, "HierophantSupplicantId">;
export type HierophantProphetId = Brand<string, "HierophantProphetId">;
export type HierophantCultId = Brand<string, "HierophantCultId">;

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
  readonly classId: HierophantClassId;
  readonly name: string;
}

export interface HierophantCampaignDoctrine {
  readonly doctrineId: HierophantDoctrineId;
  readonly name: string;
  readonly supportedClassIds: readonly HierophantClassId[];
}

export interface HierophantSupplicant {
  readonly supplicantId: HierophantSupplicantId;
}

export interface HierophantProphet {
  readonly prophetId: HierophantProphetId;
}

export interface HierophantCult {
  readonly cultId: HierophantCultId;
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

export type { HierophantFlameLawId, HierophantTempleId, HierophantTempleKind };
