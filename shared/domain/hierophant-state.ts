import type { Brand } from "./brand";
import type { PlaceId } from "./ids";
import type { PactSeatId } from "./pact-seats";
import type {
  HierophantBuiltinBlasphemyId,
  HierophantBuiltinClassId,
  HierophantBuiltinDoctrineId,
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

export interface HierophantCampaignDoctrine {
  readonly doctrineId: HierophantCampaignDoctrineId;
  readonly name: string;
  readonly supportedClassIds: readonly HierophantClassId[];
}

export interface HierophantState {
  readonly selectedFlameLawIds: readonly HierophantFlameLawId[];
  readonly campaignClasses: readonly HierophantCampaignClass[];
  readonly campaignDoctrines: readonly HierophantCampaignDoctrine[];
  readonly temples: readonly HierophantTemple[];
  /** Slice 2 will use Denizen-backed records. Nonempty values are invalid until then. */
  readonly supplicants: readonly never[];
  /** Slice 2 will use Denizen-backed records. Nonempty values are invalid until then. */
  readonly prophets: readonly never[];
  /** Slice 2 will use Denizen-backed records. Nonempty values are invalid until then. */
  readonly cults: readonly never[];
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
