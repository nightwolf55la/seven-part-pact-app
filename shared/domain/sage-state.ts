import type { Brand } from "./brand";
import type { DenizenId, WizardId } from "./ids";
import type { WizardOrDenizenSubjectRef } from "./shared-world";
import type {
  SageCycleId,
  SageDestinyAssignmentStatus,
  SageDestinyDefinitionId,
  SageDruidGrade,
  SageDreamingCondition,
  SageDreamscapeSegmentId,
  SageFairyForm,
  SageFutureCondition,
  SageLawOfDreamingId,
  SageOrdinaryFairyNameGlyph,
} from "./sage-catalogs";

export type SageDestinyInstanceId = Brand<string, "SageDestinyInstanceId">;

const SAGE_DESTINY_INSTANCE_ID_REGEX =
  /^sdi_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isValidSageDestinyInstanceId(value: string): value is SageDestinyInstanceId {
  return SAGE_DESTINY_INSTANCE_ID_REGEX.test(value);
}

export interface SageDestinyInstance {
  readonly destinyInstanceId: SageDestinyInstanceId;
  readonly definitionId: SageDestinyDefinitionId;
}

export interface SageAssignedDestiny {
  readonly destinyInstanceId: SageDestinyInstanceId;
  readonly characterRef: WizardOrDenizenSubjectRef;
  readonly status: SageDestinyAssignmentStatus;
}

export type SageOmenLocation =
  | {
      readonly kind: "future_of_the_pact";
    }
  | {
      readonly kind: "destiny";
      readonly destinyInstanceId: SageDestinyInstanceId;
    }
  | {
      readonly kind: "character";
      readonly characterRef: WizardOrDenizenSubjectRef;
    }
  | {
      readonly kind: "dreamscape";
      readonly segmentId: SageDreamscapeSegmentId;
    };

export interface SageOmenEntry {
  readonly location: SageOmenLocation;
  readonly count: number;
}

export function sageOmenLocationKey(location: SageOmenLocation): string {
  switch (location.kind) {
    case "future_of_the_pact":
      return "future_of_the_pact";
    case "destiny":
      return `destiny:${location.destinyInstanceId}`;
    case "character":
      return location.characterRef.kind === "wizard"
        ? `character:wizard:${location.characterRef.wizardId}`
        : `character:denizen:${location.characterRef.denizenId}`;
    case "dreamscape":
      return `dreamscape:${location.segmentId}`;
  }
}

export interface SageDreamscapeDenizenAssociation {
  readonly denizenId: DenizenId;
  readonly segmentIds: readonly SageDreamscapeSegmentId[];
}

export interface SageOrdinaryFairyName {
  readonly name: string;
  readonly glyph: SageOrdinaryFairyNameGlyph;
}

export interface SageFairyTrueName {
  readonly name: string;
}

export type SageFairyName =
  | {
      readonly kind: "ordinary";
      readonly name: string;
      readonly glyph: SageOrdinaryFairyNameGlyph;
    }
  | {
      readonly kind: "true";
      readonly name: string;
    };

export interface SageFairyOverlay {
  readonly denizenId: DenizenId;
  readonly form: SageFairyForm;
  readonly ordinaryNames: readonly SageOrdinaryFairyName[];
  readonly trueName: SageFairyTrueName | null;
}

export interface SageDruidOverlay {
  readonly denizenId: DenizenId;
  readonly grade: SageDruidGrade;
  readonly fairyNames: readonly SageFairyName[];
  readonly changesOfMagic: readonly string[];
  readonly familiarDescription: string | null;
}

export type SageLostDreamerState =
  | {
      readonly kind: "lost";
      readonly wizardId: WizardId;
    }
  | {
      readonly kind: "returned_recovering";
      readonly wizardId: WizardId;
      readonly recoveryWeeksRemaining: number;
    };

export interface SageState {
  readonly selectedDreamingLawIds: readonly SageLawOfDreamingId[];
  readonly dreamingCondition: SageDreamingCondition | null;
  readonly futureCondition: SageFutureCondition | null;
  readonly destinyInstances: readonly SageDestinyInstance[];
  readonly destinyDeck: readonly SageDestinyInstanceId[];
  readonly setAsideDestinyInstanceIds: readonly SageDestinyInstanceId[];
  readonly assignedDestinies: readonly SageAssignedDestiny[];
  readonly omenLedger: readonly SageOmenEntry[];
  readonly dreamscapeAssociations: readonly SageDreamscapeDenizenAssociation[];
  readonly earnedCycles: readonly SageCycleId[];
  readonly fairies: readonly SageFairyOverlay[];
  readonly druids: readonly SageDruidOverlay[];
  readonly lostDreamers: readonly SageLostDreamerState[];
}

export const EMPTY_SAGE_STATE: SageState = {
  selectedDreamingLawIds: [],
  dreamingCondition: null,
  futureCondition: null,
  destinyInstances: [],
  destinyDeck: [],
  setAsideDestinyInstanceIds: [],
  assignedDestinies: [],
  omenLedger: [],
  dreamscapeAssociations: [],
  earnedCycles: [],
  fairies: [],
  druids: [],
  lostDreamers: [],
};
