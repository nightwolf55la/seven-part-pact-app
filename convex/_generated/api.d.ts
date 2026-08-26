/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as backup from "../backup.js";
import type * as campaign from "../campaign.js";
import type * as canonicalCommit from "../canonicalCommit.js";
import type * as executeMigration from "../executeMigration.js";
import type * as historyControlMigration from "../historyControlMigration.js";
import type * as migration from "../migration.js";
import type * as validators from "../validators.js";
import type * as verifyMigration from "../verifyMigration.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  backup: typeof backup;
  campaign: typeof campaign;
  canonicalCommit: typeof canonicalCommit;
  executeMigration: typeof executeMigration;
  historyControlMigration: typeof historyControlMigration;
  migration: typeof migration;
  validators: typeof validators;
  verifyMigration: typeof verifyMigration;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
