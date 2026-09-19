import {
  planHierophantVisions,
  type DenizenId,
  type HierophantState,
  type HierophantTempleId,
  type HierophantVisionsChoices,
  type HierophantVisionsContext,
  type HierophantVisionsRequiredChoice,
  type HierophantVisionsResource,
} from "../shared/domain";
import { formatVisionsResourceName, shortTempleBoardLabel } from "./hierophant-view-model";

export function visionsRequiredChoiceKey(
  required: readonly HierophantVisionsRequiredChoice[],
): string {
  return JSON.stringify(required);
}

function orderCoversParticipants(
  supplied: readonly DenizenId[] | undefined,
  participants: readonly DenizenId[],
): supplied is readonly DenizenId[] {
  if (supplied === undefined) return false;
  const have = new Set(supplied);
  return participants.every((id) => have.has(id));
}

export function retainValidHierophantVisionsChoices(
  required: readonly HierophantVisionsRequiredChoice[],
  choices: HierophantVisionsChoices,
): HierophantVisionsChoices {
  const artisanIds = new Set(
    required.flatMap((choice) => choice.kind === "artisan_payment" ? [choice.denizenId] : []),
  );
  const fallbackIds = new Set(
    required.flatMap((choice) => choice.kind === "hestar_fallback" ? [choice.denizenId] : []),
  );
  const donorById = new Map(
    required.flatMap((choice) => choice.kind === "hestar_donor" ? [[choice.denizenId, choice] as const] : []),
  );
  const order = required.find((choice) => choice.kind === "supplicant_order");

  const artisanPayments: Record<string, HierophantVisionsResource> = {};
  for (const [id, resource] of Object.entries(choices.artisanPayments ?? {})) {
    if (!artisanIds.has(id as DenizenId)) continue;
    if (resource !== "abundance" && resource !== "conviction") continue;
    artisanPayments[id] = resource;
  }

  const hestarFallback: Record<string, boolean> = {};
  for (const [id, value] of Object.entries(choices.hestarFallback ?? {})) {
    if (!fallbackIds.has(id as DenizenId)) continue;
    if (value !== true && value !== false) continue;
    hestarFallback[id] = value;
  }

  const hestarDonors: Record<string, HierophantTempleId> = {};
  for (const [id, templeId] of Object.entries(choices.hestarDonors ?? {})) {
    const donor = donorById.get(id as DenizenId);
    if (donor === undefined || donor.kind !== "hestar_donor") continue;
    if (templeId === undefined) continue;
    if (!donor.eligibleDonorTempleIds.includes(templeId as Exclude<HierophantTempleId, "hestar">)) continue;
    hestarDonors[id] = templeId;
  }

  let supplicantOrder: readonly DenizenId[] | undefined;
  if (order?.kind === "supplicant_order") {
    const allowed = new Set(order.participantIds);
    const filtered = [...new Set((choices.supplicantOrder ?? []).filter((id) => allowed.has(id)))];
    if (orderCoversParticipants(filtered, order.participantIds)) {
      supplicantOrder = filtered;
    }
  }

  return {
    ...(Object.keys(artisanPayments).length > 0 ? { artisanPayments } : {}),
    ...(Object.keys(hestarFallback).length > 0 ? { hestarFallback } : {}),
    ...(Object.keys(hestarDonors).length > 0 ? { hestarDonors } : {}),
    ...(supplicantOrder === undefined ? {} : { supplicantOrder }),
  };
}

export function pruneHierophantVisionsChoices(
  hierophant: HierophantState,
  choices: HierophantVisionsChoices,
  context: HierophantVisionsContext = {},
): HierophantVisionsChoices {
  const unconstrained = planHierophantVisions(hierophant, {}, context);
  return retainValidHierophantVisionsChoices(unconstrained.requiredChoices, choices);
}

export function visionsChoicesEqual(
  left: HierophantVisionsChoices,
  right: HierophantVisionsChoices,
): boolean {
  return JSON.stringify(stableChoices(left)) === JSON.stringify(stableChoices(right));
}

function stableChoices(choices: HierophantVisionsChoices): unknown {
  return {
    artisanPayments: sortRecord(choices.artisanPayments),
    hestarFallback: sortRecord(choices.hestarFallback),
    hestarDonors: sortRecord(choices.hestarDonors),
    supplicantOrder: choices.supplicantOrder ?? null,
  };
}

function sortRecord<T>(record: Readonly<Partial<Record<string, T>>> | undefined): Record<string, T> {
  const next: Record<string, T> = {};
  for (const key of Object.keys(record ?? {}).sort()) {
    const value = record?.[key];
    if (value !== undefined) next[key] = value;
  }
  return next;
}

export function completeVisionsOrder(
  draft: readonly DenizenId[],
  participants: readonly DenizenId[],
): readonly DenizenId[] | undefined {
  const allowed = new Set(participants);
  const filtered = [...new Set(draft.filter((id) => allowed.has(id)))];
  return orderCoversParticipants(filtered, participants) ? filtered : undefined;
}

export function appendVisionsOrder(
  draft: readonly DenizenId[],
  denizenId: DenizenId,
  participants: readonly DenizenId[],
): readonly DenizenId[] {
  if (!participants.includes(denizenId)) return draft;
  if (draft.includes(denizenId)) return draft;
  return [...draft, denizenId];
}

export function undoLastVisionsOrder(draft: readonly DenizenId[]): readonly DenizenId[] {
  return draft.slice(0, -1);
}

export interface VisionsPreviewChoiceLabels {
  readonly denizenName: (denizenId: string) => string;
  readonly templeName: (templeId: string) => string;
}

export function formatVisionsPreviewChoiceSummary(
  required: readonly HierophantVisionsRequiredChoice[],
  choices: HierophantVisionsChoices,
  labels: VisionsPreviewChoiceLabels,
): readonly string[] {
  const lines: string[] = [];
  for (const choice of required) {
    if (choice.kind === "artisan_payment") {
      const resource = choices.artisanPayments?.[choice.denizenId];
      if (resource === undefined) continue;
      lines.push(`${labels.denizenName(choice.denizenId)} pays ${formatVisionsResourceName(resource)}`);
    }
    if (choice.kind === "hestar_fallback") {
      const picked = choices.hestarFallback?.[choice.denizenId];
      if (picked === undefined) continue;
      const temple = shortTempleBoardLabel(labels.templeName(choice.templeId));
      const resource = formatVisionsResourceName(choice.resource);
      lines.push(
        picked
          ? `${temple} uses Hestar ${resource}`
          : `${temple} does not use Hestar ${resource}`,
      );
    }
    if (choice.kind === "hestar_donor") {
      const donor = choices.hestarDonors?.[choice.denizenId];
      if (donor === undefined) continue;
      lines.push(
        `Hestar takes ${formatVisionsResourceName(choice.resource)} from ${shortTempleBoardLabel(labels.templeName(donor))}`,
      );
    }
    if (choice.kind === "supplicant_order") {
      const order = completeVisionsOrder(choices.supplicantOrder ?? [], choice.participantIds);
      if (order === undefined) continue;
      lines.push(`Order: ${order.map((id) => labels.denizenName(id)).join(" → ")}`);
    }
  }
  return lines;
}
