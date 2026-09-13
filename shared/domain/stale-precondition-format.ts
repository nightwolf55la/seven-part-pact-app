import { canonicalJsonStringify } from "./canonical-json";

/**
 * APPLICATION DESIGN: stale expected/current values must stay fail-closed.
 * This formatter only changes user-facing text. It must never stringify
 * structured values with JavaScript object coercion (`[object Object]`).
 */
export function formatStalePreconditionValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => formatStalePreconditionValue(entry)).join(", ");
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (
      (record.kind === "builtin" || record.kind === "campaign") &&
      typeof record.taxonomyId === "string"
    ) {
      return record.taxonomyId;
    }
    try {
      return canonicalJsonStringify(value);
    } catch {
      return JSON.stringify(value);
    }
  }
  return String(value);
}

export function stalePreconditionMessage(
  fieldLabel: string,
  expected: unknown,
  current: unknown,
): string {
  return `${fieldLabel}: expected "${formatStalePreconditionValue(expected)}" but current is "${formatStalePreconditionValue(current)}"`;
}
