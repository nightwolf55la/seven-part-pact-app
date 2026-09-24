import type { HierophantBuiltinClassId, HierophantTemple } from "../shared/domain";

export const HIEROPHANT_SUPPLY_CLASS_IDS = [
  "peasant",
  "artisan",
  "merchant",
  "gentry",
  "pariah",
] as const satisfies readonly HierophantBuiltinClassId[];

export type HierophantSupplyClassId = (typeof HIEROPHANT_SUPPLY_CLASS_IDS)[number];

export type HierophantSupplyZone = "courtyard" | "agiary" | "hestar" | "blocked";

export interface HierophantPendingSupplyCreate {
  readonly commandId: string;
  readonly denizenId: string;
  readonly classId: string;
  readonly classLabel: string;
  readonly templeId: string;
  readonly area: "courtyard" | "agiary" | null;
}

export const HIEROPHANT_SUPPLY_BLOCKED_REASON =
  "Receive Supplicant is not available at a collapsed Temple";

export const HIEROPHANT_SUPPLY_DRAG_MIME = "application/x-7pp-hierophant-supply-class";

export type HierophantSupplyDestination =
  | {
      readonly kind: "place";
      readonly templeId: string;
      readonly area: "courtyard" | "agiary" | null;
      readonly highlight: "recommended" | "alternative";
    }
  | {
      readonly kind: "blocked";
      readonly templeId: string;
      readonly reason: string;
      readonly highlight: "reject";
    };

export function isHierophantSupplyClassId(value: string): value is HierophantSupplyClassId {
  return (HIEROPHANT_SUPPLY_CLASS_IDS as readonly string[]).includes(value);
}

export function writeHierophantSupplyDragData(
  dataTransfer: DataTransfer | null | undefined,
  classId: HierophantSupplyClassId,
): void {
  if (dataTransfer === null || dataTransfer === undefined) return;
  try {
    dataTransfer.setData(HIEROPHANT_SUPPLY_DRAG_MIME, classId);
    dataTransfer.setData("text/plain", classId);
    dataTransfer.effectAllowed = "copy";
  } catch {
    // jsdom and some browsers reject custom MIME types; text/plain still carries the Class.
    try {
      dataTransfer.setData("text/plain", classId);
      dataTransfer.effectAllowed = "copy";
    } catch {
      // Native drag can still proceed via the synchronous supply ref.
    }
  }
}

function readTransferType(dataTransfer: DataTransfer, type: string): string | null {
  try {
    const value = dataTransfer.getData(type);
    return value === "" ? null : value;
  } catch {
    return null;
  }
}

export function readHierophantSupplyDragClass(
  dataTransfer: DataTransfer | null | undefined,
): HierophantSupplyClassId | null {
  if (dataTransfer === null || dataTransfer === undefined) return null;
  const typed = readTransferType(dataTransfer, HIEROPHANT_SUPPLY_DRAG_MIME);
  if (typed !== null && isHierophantSupplyClassId(typed)) return typed;
  const plain = readTransferType(dataTransfer, "text/plain");
  if (plain !== null && isHierophantSupplyClassId(plain)) return plain;
  return null;
}

let liveSupplyClassId: HierophantSupplyClassId | null = null;

export function beginHierophantSupplyDrag(classId: HierophantSupplyClassId): void {
  liveSupplyClassId = classId;
}

export function endHierophantSupplyDrag(): void {
  liveSupplyClassId = null;
}

export function liveHierophantSupplyClass(): HierophantSupplyClassId | null {
  return liveSupplyClassId;
}

export function hierophantSupplyDragIsActive(
  dataTransfer: DataTransfer | null | undefined,
  peekActiveClassId: () => string | null,
  renderedActiveClassId: string | null,
): boolean {
  if (liveSupplyClassId !== null) return true;
  if (renderedActiveClassId !== null) return true;
  if (peekActiveClassId() !== null) return true;
  return readHierophantSupplyDragClass(dataTransfer) !== null;
}

export function resolveHierophantSupplyDestination(
  temple: HierophantTemple,
  zone: HierophantSupplyZone,
): HierophantSupplyDestination | null {
  if (temple.status !== "active") {
    return {
      kind: "blocked",
      templeId: temple.templeId,
      reason: HIEROPHANT_SUPPLY_BLOCKED_REASON,
      highlight: "reject",
    };
  }
  if (temple.kind === "hestar") {
    if (zone !== "hestar") return null;
    return {
      kind: "place",
      templeId: "hestar",
      area: null,
      highlight: "alternative",
    };
  }
  if (zone === "courtyard" || zone === "agiary") {
    return {
      kind: "place",
      templeId: temple.templeId,
      area: zone,
      highlight: "recommended",
    };
  }
  return null;
}
