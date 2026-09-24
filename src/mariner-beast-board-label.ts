import type { MarinerBeastState } from "../shared/domain";
import { builtinBeastName } from "./mariner-view-model";

function compactBuiltinLabel(definitionId: string): string {
  const name = builtinBeastName(definitionId as never);
  if (name === null) {
    return definitionId.slice(0, 4);
  }
  const word = name.trim().split(/\s+/)[0] ?? name;
  if (word.length <= 4) {
    return word;
  }
  return word.slice(0, 4);
}

function compactDenizenLabel(name: string): string {
  const parts = name.trim().split(/\s+/).filter((part) => part.length > 0);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  const single = parts[0] ?? name;
  return single.length <= 4 ? single : single.slice(0, 4);
}

/** Compact, deterministic on-map Beast marker (full identity remains in aria-label / inspector). */
export function marinerBeastBoardMarkerLabel(
  beast: MarinerBeastState,
  denizenDisplayName: string,
): string {
  if (beast.definitionId !== null) {
    return compactBuiltinLabel(beast.definitionId);
  }
  return compactDenizenLabel(denizenDisplayName);
}
