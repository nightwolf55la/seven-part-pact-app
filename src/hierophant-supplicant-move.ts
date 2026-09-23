import type { HierophantSupplicantHost, HierophantTemple, HierophantTempleArea } from "../shared/domain";
import type { HierophantSupplyZone } from "./hierophant-supply";

export const HIEROPHANT_SUPPLICANT_HOST_DRAG_MIME = "application/x-7pp-hierophant-supplicant-host";

export function hierophantSupplicantHostEqual(
  a: HierophantSupplicantHost,
  b: HierophantSupplicantHost,
): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "cult" && b.kind === "cult") return a.cultDenizenId === b.cultDenizenId;
  if (a.kind === "temple" && b.kind === "temple") {
    return a.templeId === b.templeId && a.area === b.area;
  }
  return false;
}

export function hierophantSupplicantHostFromDrop(
  temple: HierophantTemple,
  zone: HierophantSupplyZone,
): HierophantSupplicantHost {
  if (temple.kind === "hestar") {
    return { kind: "temple", templeId: temple.templeId, area: null };
  }
  const area: HierophantTempleArea | null =
    zone === "courtyard" || zone === "agiary" ? zone : null;
  return { kind: "temple", templeId: temple.templeId, area };
}

function readTransferType(dataTransfer: DataTransfer, type: string): string | null {
  try {
    const value = dataTransfer.getData(type);
    return value === "" ? null : value;
  } catch {
    return null;
  }
}

export function writeHierophantSupplicantHostDragData(
  dataTransfer: DataTransfer | null | undefined,
  denizenId: string,
): void {
  if (dataTransfer === null || dataTransfer === undefined) return;
  try {
    dataTransfer.setData(HIEROPHANT_SUPPLICANT_HOST_DRAG_MIME, denizenId);
    dataTransfer.setData("text/plain", denizenId);
    dataTransfer.effectAllowed = "move";
  } catch {
    try {
      dataTransfer.setData("text/plain", denizenId);
      dataTransfer.effectAllowed = "move";
    } catch {
      // Native drag can still proceed via the synchronous host-move ref.
    }
  }
}

export function readHierophantSupplicantHostDragDenizenId(
  dataTransfer: DataTransfer | null | undefined,
): string | null {
  if (dataTransfer === null || dataTransfer === undefined) return null;
  const typed = readTransferType(dataTransfer, HIEROPHANT_SUPPLICANT_HOST_DRAG_MIME);
  if (typed !== null && typed.length > 0) return typed;
  const plain = readTransferType(dataTransfer, "text/plain");
  return plain !== null && plain.length > 0 ? plain : null;
}

let liveHostDenizenId: string | null = null;

export function beginHierophantSupplicantHostDrag(denizenId: string): void {
  liveHostDenizenId = denizenId;
}

export function endHierophantSupplicantHostDrag(): void {
  liveHostDenizenId = null;
}

export function liveHierophantSupplicantHostDenizenId(): string | null {
  return liveHostDenizenId;
}

export function hierophantSupplicantHostDragIsActive(
  dataTransfer: DataTransfer | null | undefined,
  peekDraggingDenizenId: () => string | null,
  renderedDraggingDenizenId: string | null,
): boolean {
  if (liveHostDenizenId !== null) return true;
  if (renderedDraggingDenizenId !== null) return true;
  if (peekDraggingDenizenId() !== null) return true;
  return readHierophantSupplicantHostDragDenizenId(dataTransfer) !== null;
}
