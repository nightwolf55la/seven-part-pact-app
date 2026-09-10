import { DomainError } from "./errors";
import type { PowerfulDenizenProfile, PowerfulDenizenStatus } from "./powerful-denizen";
import type { BuiltinPowerfulDenizenTaxonomyId } from "./powerful-denizen";
import type { MarinerBeastCondition } from "./mariner-state";

export type PowerfulRoleProfileHost = {
  readonly powerfulProfile?: PowerfulDenizenProfile | null;
};

export function denizenHasBuiltinTaxonomy(
  denizen: PowerfulRoleProfileHost | undefined,
  taxonomyId: BuiltinPowerfulDenizenTaxonomyId,
): boolean {
  return denizen?.powerfulProfile?.taxonomies.some(
    (ref) => ref.kind === "builtin" && ref.taxonomyId === taxonomyId,
  ) === true;
}

export function isReliableOrDisruptiveStatus(status: PowerfulDenizenStatus): boolean {
  return status.kind === "standard" && (status.value === "reliable" || status.value === "disruptive");
}

export function profileHasStandardRampagingMethod(profile: PowerfulDenizenProfile): boolean {
  return profile.methods.some(
    (method) => method.definition.kind === "standard" && method.definition.method === "rampaging",
  );
}

export function requirePowerfulRoleProfile(
  denizen: PowerfulRoleProfileHost,
  path: string,
  taxonomyId: BuiltinPowerfulDenizenTaxonomyId,
): PowerfulDenizenProfile {
  const profile = denizen.powerfulProfile ?? null;
  if (profile === null) {
    throw new DomainError("INVALID_CAMPAIGN_STATE", `${path} requires a Powerful-Denizen profile`);
  }
  if (!denizenHasBuiltinTaxonomy(denizen, taxonomyId)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${path} requires builtin taxonomy ${taxonomyId}`,
    );
  }
  return profile;
}

export function requireReliableOrDisruptiveStatus(profile: PowerfulDenizenProfile, path: string): void {
  if (!isReliableOrDisruptiveStatus(profile.status)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${path} requires standard Status reliable or disruptive`,
    );
  }
}

export function requireDisruptiveStatus(profile: PowerfulDenizenProfile, path: string): void {
  if (profile.status.kind !== "standard" || profile.status.value !== "disruptive") {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${path} requires standard Disruptive Status`,
    );
  }
}

export function requireRampagingBeastMethod(
  profile: PowerfulDenizenProfile,
  condition: MarinerBeastCondition,
  path: string,
): void {
  if (condition === "rampaging" && !profileHasStandardRampagingMethod(profile)) {
    throw new DomainError(
      "INVALID_CAMPAIGN_STATE",
      `${path} rampaging Beast requires a standard Rampaging Method`,
    );
  }
}

export function powerfulStatusLabel(status: PowerfulDenizenStatus): string {
  if (status.kind === "other") return status.label;
  switch (status.value) {
    case "companion":
      return "Companion";
    case "reliable":
      return "Reliable";
    case "disruptive":
      return "Disruptive";
    case "malignant":
      return "Malignant";
  }
}
