import { canonicalJsonStringify, CanonicalJsonError } from "./canonical-json";
import type { AnyCampaignState } from "./campaign-state";

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
 * Strips a single branded primitive type to its underlying base type.
 * If T is a Brand<Base, _>, resolves to Base; otherwise resolves to T.
 */
type Unbrand<T> = T extends number & { readonly __brand: string }
  ? number
  : T extends string & { readonly __brand: string }
    ? string
    : T;

/**
 * Recursively strips branded types from any type structure.
 * - Branded primitives become their base type (e.g. MonthOrdinal -> number).
 * - Plain objects recurse into each property.
 * - Arrays recurse into their element type.
 * - Literals and other types pass through unchanged.
 */
type DeepUnbrand<T> = T extends (infer U)[]
  ? DeepUnbrand<U>[]
  : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepUnbrand<U>>
    : T extends object
      ? { -readonly [K in keyof T]: DeepUnbrand<Unbrand<T[K]>> }
      : Unbrand<T>;

/**
 * The persistence-level representation of campaign state — derived from
 * AnyCampaignState with branded types stripped.
 *
 * Adding a new property to CampaignStateV1 automatically appears here.
 * No manual field list to maintain.
 */
export type PersistableCampaignState = DeepUnbrand<AnyCampaignState>;

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
 * Asserts that the given state is portable JSON — no undefined, bigint,
 * non-finite numbers, or non-plain objects at any nesting level.
 *
 * Uses canonicalJsonStringify as the portability assertion. Does NOT
 * serialize or transform the state; returns it unchanged.
 *
 * Throws CanonicalJsonError if the state violates the portable JSON contract.
 */
export function assertPortableCampaignState(state: AnyCampaignState): AnyCampaignState {
  canonicalJsonStringify(state);
  return state;
}
