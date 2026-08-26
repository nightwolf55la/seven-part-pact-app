import { canonicalJsonStringify } from "./canonical-json";

/**
 * CampaignState is intentionally constrained to the portable JSON value model.
 *
 * It must remain serializable via canonicalJsonStringify — no bigint, Map, Set,
 * undefined, functions, class instances, or non-finite numbers.
 *
 * This is the canonical semantic JSON representation used by:
 * - snapshots
 * - canonical equality
 * - portable Backup/Import
 * - Undo/Redo target comparison
 *
 * Future CampaignState fields must not break this contract without an explicit
 * architecture change.
 */

/**
 * The persistence-level representation of campaign state — the structural
 * shape as stored in and loaded from Convex documents.
 *
 * Identical to AnyCampaignState but uses plain types (no branded MonthOrdinal)
 * since branded types don't survive persistence round-trips.
 */
export interface PersistableCampaignState {
  readonly schemaVersion: number;
  readonly ruleset: { readonly id: string; readonly version: number };
  readonly calendar: { readonly monthOrdinal: number };
}

/**
 * Full semantic equality for CampaignState.
 *
 * Compares the complete canonical JSON representation of two states.
 * This automatically covers all current and future nested fields without
 * requiring manual enumeration of properties — canonicalJsonStringify
 * recursively sorts object keys and serializes all values.
 *
 * Uses `object` parameter type so it accepts both domain-typed state (with
 * branded MonthOrdinal) and persistence-typed state (plain numbers from Convex
 * queries) without requiring callers to cast.
 */
export function statesDeepEqual(a: object, b: object): boolean {
  return canonicalJsonStringify(a) === canonicalJsonStringify(b);
}

/**
 * Produces a plain JSON-safe copy of the complete CampaignState, suitable for
 * persistence in Convex documents (snapshots, campaign record).
 *
 * Uses JSON round-trip to strip branded types and readonly markers while
 * preserving the full state structure. Guarantees all fields of the validated
 * state are persisted without manual field enumeration.
 *
 * Generic return type preserves structural compatibility with Convex validators
 * since the JSON round-trip does not alter the runtime shape of valid state.
 */
export function toPersistableState<T>(state: T): T {
  return JSON.parse(JSON.stringify(state));
}
