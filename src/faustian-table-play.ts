/**
 * Faustian-local table interaction helpers.
 *
 * This is not a shared drag/context-menu framework. It only supports the
 * approved Faustian common-play gestures: Devil Deck Scheme supply drag and
 * object-attached context actions.
 *
 * Accomplice drag is deliberately omitted. `direct_faustian_accomplice`
 * re-resolves the live source Community from the card id and has no
 * expectedFaustian / expected source snapshot. A pointerdown in Community A
 * followed by a realtime move to C and a drop on B would be interpreted as
 * C -> B. Safe one-gesture Accomplice drag requires captured expected
 * source/state in the semantic command contract.
 */

import type { FaustianCommunityId, FaustianState } from "../shared/domain";
import { cloneFaustianState } from "./faustian-view-model";

export const FAUSTIAN_POINTER_DRAG_THRESHOLD_PX = 6;
export const FAUSTIAN_SCHEME_SUPPLY_KIND = "devil_scheme_supply";

export function faustianPointerExceedsDragThreshold(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) >= FAUSTIAN_POINTER_DRAG_THRESHOLD_PX;
}

export function captureFaustianSnapshot(faustian: FaustianState): FaustianState {
  return cloneFaustianState(faustian);
}

export function findFaustianCommunityDropId(start: EventTarget | null): FaustianCommunityId | null {
  let node: Element | null = start instanceof Element ? start : null;
  while (node !== null) {
    const communityId = node.getAttribute("data-faustian-community-drop");
    if (communityId !== null && communityId !== "") {
      return communityId as FaustianCommunityId;
    }
    node = node.parentElement;
  }
  return null;
}

export function schemeSupplyDragPayload(): { readonly kind: typeof FAUSTIAN_SCHEME_SUPPLY_KIND } {
  return { kind: FAUSTIAN_SCHEME_SUPPLY_KIND };
}
