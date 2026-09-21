import type { HierophantTemple, HierophantTempleArea } from "../shared/domain";
import type { HierophantSupplyZone } from "./hierophant-supply";

export interface HierophantSteerTimeRow {
  readonly allocationId: string;
  readonly denizenId: string;
  readonly wizardId: string;
  readonly wizardName: string;
  readonly resolution: "pending" | "spent" | "wasted";
}

export const STEER_NEEDS_TIME_GUIDANCE =
  "Schedule Time on this Supplicant in Planning before Steer.";

export const STEER_CHOOSE_WEEK_GUIDANCE =
  "Choose which Wizard's scheduled Time to spend.";

export const HIEROPHANT_STEER_DRAG_MIME = "application/x-7pp-hierophant-steer-supplicant";

export type SteerAllocationChoice =
  | { readonly kind: "none" }
  | { readonly kind: "single"; readonly row: HierophantSteerTimeRow }
  | { readonly kind: "choose_wizard"; readonly rows: readonly HierophantSteerTimeRow[] };

export function pendingSteerRowsForSupplicant(
  rows: readonly HierophantSteerTimeRow[],
  denizenId: string,
): HierophantSteerTimeRow[] {
  return rows.filter((row) => row.denizenId === denizenId && row.resolution === "pending");
}

export function resolveSteerAllocationChoice(
  rows: readonly HierophantSteerTimeRow[],
  denizenId: string,
): SteerAllocationChoice {
  const pending = pendingSteerRowsForSupplicant(rows, denizenId);
  if (pending.length === 0) return { kind: "none" };
  const wizardIds = new Set(pending.map((row) => row.wizardId));
  if (wizardIds.size > 1) return { kind: "choose_wizard", rows: pending };
  return { kind: "single", row: pending[0] };
}

export function selectedSteerAllocation(
  rows: readonly HierophantSteerTimeRow[],
  denizenId: string,
  chosenAllocationId: string | null,
): HierophantSteerTimeRow | null {
  const choice = resolveSteerAllocationChoice(rows, denizenId);
  if (choice.kind === "none") return null;
  if (choice.kind === "single") return choice.row;
  if (chosenAllocationId === null) return null;
  return choice.rows.find((row) => row.allocationId === chosenAllocationId) ?? null;
}

export function steerDropArea(
  temple: HierophantTemple,
  zone: HierophantSupplyZone,
): HierophantTempleArea | null {
  if (temple.kind === "hestar") return null;
  if (zone === "courtyard" || zone === "agiary") return zone;
  return null;
}

function readTransferType(dataTransfer: DataTransfer, type: string): string | null {
  try {
    const value = dataTransfer.getData(type);
    return value === "" ? null : value;
  } catch {
    return null;
  }
}

export function writeHierophantSteerDragData(
  dataTransfer: DataTransfer | null | undefined,
  denizenId: string,
): void {
  if (dataTransfer === null || dataTransfer === undefined) return;
  try {
    dataTransfer.setData(HIEROPHANT_STEER_DRAG_MIME, denizenId);
    dataTransfer.setData("text/plain", denizenId);
    dataTransfer.effectAllowed = "move";
  } catch {
    try {
      dataTransfer.setData("text/plain", denizenId);
      dataTransfer.effectAllowed = "move";
    } catch {
      // Native drag can still proceed via the synchronous steer ref.
    }
  }
}

export function readHierophantSteerDragDenizenId(
  dataTransfer: DataTransfer | null | undefined,
): string | null {
  if (dataTransfer === null || dataTransfer === undefined) return null;
  const typed = readTransferType(dataTransfer, HIEROPHANT_STEER_DRAG_MIME);
  if (typed !== null && typed.length > 0) return typed;
  const plain = readTransferType(dataTransfer, "text/plain");
  return plain !== null && plain.length > 0 ? plain : null;
}

let liveSteerDenizenId: string | null = null;

export function beginHierophantSteerDrag(denizenId: string): void {
  liveSteerDenizenId = denizenId;
}

export function endHierophantSteerDrag(): void {
  liveSteerDenizenId = null;
}

export function liveHierophantSteerDenizenId(): string | null {
  return liveSteerDenizenId;
}

export function hierophantSteerDragIsActive(
  dataTransfer: DataTransfer | null | undefined,
  peekDraggingDenizenId: () => string | null,
  renderedDraggingDenizenId: string | null,
): boolean {
  if (liveSteerDenizenId !== null) return true;
  if (renderedDraggingDenizenId !== null) return true;
  if (peekDraggingDenizenId() !== null) return true;
  return readHierophantSteerDragDenizenId(dataTransfer) !== null;
}
