export class CanonicalJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanonicalJsonError";
  }
}

export function canonicalJsonStringify(value: unknown): string {
  return canonicalize(value);
}

function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) {
    throw new CanonicalJsonError("undefined is not supported in canonical JSON");
  }

  const type = typeof value;

  if (type === "boolean") return value ? "true" : "false";

  if (type === "number") {
    const n = value as number;
    if (!Number.isFinite(n)) {
      throw new CanonicalJsonError(`Non-finite number is not supported: ${n}`);
    }
    return JSON.stringify(n);
  }

  if (type === "string") {
    return JSON.stringify(value);
  }

  if (type === "bigint") {
    throw new CanonicalJsonError("bigint is not supported in canonical JSON");
  }

  if (type === "symbol" || type === "function") {
    throw new CanonicalJsonError(`${type} is not supported in canonical JSON`);
  }

  if (Array.isArray(value)) {
    const elements = value.map((el) => canonicalize(el));
    return "[" + elements.join(",") + "]";
  }

  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    throw new CanonicalJsonError("Objects with non-plain prototypes are not supported in canonical JSON");
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const entries: string[] = [];
  for (const key of keys) {
    const v = obj[key];
    if (v === undefined) {
      throw new CanonicalJsonError(`undefined property value is not supported in canonical JSON: key "${key}"`);
    }
    entries.push(JSON.stringify(key) + ":" + canonicalize(v));
  }
  return "{" + entries.join(",") + "}";
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  let hex = "";
  for (let i = 0; i < hashArray.length; i++) {
    hex += hashArray[i].toString(16).padStart(2, "0");
  }
  return hex;
}

export async function computeDigestFromCanonicalJson(canonicalJson: string): Promise<string> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(canonicalJson);
  return sha256Hex(bytes);
}
