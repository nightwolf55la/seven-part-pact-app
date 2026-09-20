import {
  HIEROPHANT_BUILTIN_DOCTRINE_DEFINITIONS,
  hierophantBuiltinDoctrineDefinition,
  isValidHierophantBuiltinBlasphemyId,
  isValidHierophantBuiltinClassId,
  isValidHierophantBuiltinDoctrineId,
} from "./hierophant-catalogs";
import type { HierophantBuiltinClassId, HierophantTempleId } from "./hierophant-catalogs";
import type { DenizenId } from "./ids";
import type {
  HierophantCampaignDoctrine,
  HierophantClassId,
  HierophantState,
  HierophantSupplicant,
  HierophantTemple,
  OrdinaryTempleDoctrineState,
} from "./hierophant-state";

export type HierophantVisionsResource = "abundance" | "conviction";

export type HierophantVisionsDemand =
  | { readonly kind: "none" }
  | { readonly kind: "fixed"; readonly resource: HierophantVisionsResource; readonly amount: number }
  | { readonly kind: "artisan" }
  | { readonly kind: "unknown" };

export type HierophantVisionsSupport =
  | "supported"
  | "unsupported"
  | "not_determined"
  | "not_applicable";

export type HierophantVisionsWoeProjection =
  | { readonly kind: "determined"; readonly from: number; readonly to: number }
  | { readonly kind: "undetermined" };

export type HierophantVisionsThresholdCue =
  | { readonly kind: "none" }
  | { readonly kind: "ready_for_benefaction" }
  | { readonly kind: "cult_departure_due" };

export type HierophantVisionsRequiredChoice =
  | {
      readonly kind: "artisan_payment";
      readonly denizenId: DenizenId;
      readonly templeId: HierophantTempleId;
      readonly options: readonly ["abundance", "conviction"];
    }
  | {
      readonly kind: "hestar_fallback";
      readonly denizenId: DenizenId;
      readonly templeId: HierophantTempleId;
      readonly resource: HierophantVisionsResource;
      readonly amount: number;
      readonly options: readonly [true, false];
    }
  | {
      readonly kind: "hestar_donor";
      readonly denizenId: DenizenId;
      readonly templeId: "hestar";
      readonly resource: HierophantVisionsResource;
      readonly amount: number;
      readonly eligibleDonorTempleIds: readonly Exclude<HierophantTempleId, "hestar">[];
    }
  | {
      readonly kind: "supplicant_order";
      readonly participantIds: readonly DenizenId[];
      readonly reason: "resource_competition";
    };

export type HierophantVisionsBlocker =
  | {
      readonly kind: "resource_shortage_collapse";
      readonly denizenId: DenizenId | null;
      readonly templeId: HierophantTempleId;
      readonly resource: "abundance";
      readonly amount: number;
    }
  | {
      readonly kind: "resource_shortage_blasphemy";
      readonly denizenId: DenizenId | null;
      readonly templeId: HierophantTempleId;
      readonly resource: "conviction";
      readonly amount: number;
    }
  | {
      readonly kind: "support_not_determined";
      readonly denizenId: DenizenId;
      readonly templeId: HierophantTempleId;
    }
  | {
      readonly kind: "collapsed_temple";
      readonly denizenId: DenizenId;
      readonly templeId: HierophantTempleId;
    }
  | {
      readonly kind: "unknown_class_cost";
      readonly denizenId: DenizenId;
      readonly templeId: HierophantTempleId;
      readonly classId: HierophantClassId;
    }
  | {
      readonly kind: "reliable_prophet_production";
      readonly templeId: HierophantTempleId;
      readonly prophetDenizenIds: readonly DenizenId[];
      readonly productions: readonly {
        readonly denizenId: DenizenId;
        readonly resource: HierophantVisionsResource;
        readonly amount: number;
      }[];
    }
  | {
      readonly kind: "hestar_share_unresolved";
      readonly denizenId: DenizenId;
      readonly templeId: "hestar";
      readonly resource: HierophantVisionsResource;
      readonly amount: number;
      readonly reason: "no_eligible_donor" | "donor_combination_unapproved";
    };

export interface HierophantVisionsResourceProjection {
  readonly before: number;
  readonly delta: number | null;
  readonly after: number | null;
}

export interface HierophantVisionsTemplePreview {
  readonly templeId: HierophantTempleId;
  readonly abundance: HierophantVisionsResourceProjection;
  readonly conviction: HierophantVisionsResourceProjection;
  readonly shortage: {
    readonly resource: HierophantVisionsResource;
    readonly consequence: "collapse" | "blasphemy";
  } | null;
  readonly hestarFallback: "not_needed" | "choice_required" | "applied" | "declined";
  readonly hestarDonor: "not_needed" | "choice_required" | "applied";
  readonly reliableProphetProduction: boolean;
  readonly orderChoiceRequired: boolean;
  readonly unresolved: boolean;
}

export interface HierophantVisionsSupplicantPreview {
  readonly denizenId: DenizenId;
  readonly templeId: HierophantTempleId;
  readonly classId: HierophantClassId;
  readonly woe: number;
  readonly support: HierophantVisionsSupport;
  readonly demand: HierophantVisionsDemand;
  readonly woeProjection: HierophantVisionsWoeProjection;
  readonly thresholdCue: HierophantVisionsThresholdCue;
  readonly choiceRequired: boolean;
  readonly blockerKind: HierophantVisionsBlocker["kind"] | null;
}

export interface HierophantVisionsChoices {
  readonly artisanPayments?: Readonly<Partial<Record<string, HierophantVisionsResource>>>;
  readonly hestarFallback?: Readonly<Partial<Record<string, boolean>>>;
  readonly hestarDonors?: Readonly<Partial<Record<string, HierophantTempleId>>>;
  readonly supplicantOrder?: readonly DenizenId[];
}

export interface HierophantVisionsContext {
  readonly reliableProphetDenizenIds?: readonly DenizenId[];
}

export type HierophantVisionsPlanKind =
  | "ready"
  | "choices_required"
  | "manual_resolution_required";

export interface HierophantVisionsPlan {
  readonly kind: HierophantVisionsPlanKind;
  readonly requiredChoices: readonly HierophantVisionsRequiredChoice[];
  readonly blockers: readonly HierophantVisionsBlocker[];
  readonly temples: readonly HierophantVisionsTemplePreview[];
  readonly supplicants: readonly HierophantVisionsSupplicantPreview[];
  readonly hestarUses: readonly HierophantVisionsHestarUseFact[];
}

export interface HierophantVisionsResourceDeltaFact {
  readonly templeId: HierophantTempleId;
  readonly resource: HierophantVisionsResource;
  readonly before: number;
  readonly after: number;
  readonly delta: number;
}

export interface HierophantVisionsWoeFact {
  readonly denizenId: DenizenId;
  readonly templeId: HierophantTempleId;
  readonly from: number;
  readonly to: number;
}

export interface HierophantVisionsThresholdCueFact {
  readonly denizenId: DenizenId;
  readonly templeId: HierophantTempleId;
  readonly kind: Exclude<HierophantVisionsThresholdCue["kind"], "none">;
}

export interface HierophantVisionsHestarUseFact {
  readonly kind: "fallback" | "donor";
  readonly denizenId: DenizenId;
  readonly hostedTempleId: HierophantTempleId;
  readonly sourceTempleId: HierophantTempleId;
  readonly resource: HierophantVisionsResource;
  readonly amount: number;
}

export interface HierophantVisionsOutcomeFacts {
  readonly suppliedChoices: HierophantVisionsChoices;
  readonly templeIds: readonly HierophantTempleId[];
  readonly supplicantIds: readonly DenizenId[];
  readonly resourceDeltas: readonly HierophantVisionsResourceDeltaFact[];
  readonly woeChanges: readonly HierophantVisionsWoeFact[];
  readonly thresholdCues: readonly HierophantVisionsThresholdCueFact[];
  readonly hestarUses: readonly HierophantVisionsHestarUseFact[];
}

export type HierophantVisionsResolution =
  | {
      readonly kind: "ready";
      readonly plan: HierophantVisionsPlan;
      readonly resultingState: HierophantState;
      readonly facts: HierophantVisionsOutcomeFacts;
    }
  | {
      readonly kind: "choices_required";
      readonly plan: HierophantVisionsPlan;
    }
  | {
      readonly kind: "manual_resolution_required";
      readonly plan: HierophantVisionsPlan;
    };

const CULT_WOE_THRESHOLD = 5;

const FIXED_CLASS_COST: Record<Exclude<HierophantBuiltinClassId, "artisan">, {
  readonly resource: HierophantVisionsResource;
  readonly amount: number;
}> = {
  pariah: { resource: "abundance", amount: 2 },
  peasant: { resource: "abundance", amount: 1 },
  merchant: { resource: "conviction", amount: 1 },
  gentry: { resource: "conviction", amount: 2 },
};

interface MutableStock {
  abundance: number;
  conviction: number;
}

interface ClassifiedSupplicant {
  readonly person: HierophantSupplicant;
  readonly temple: HierophantTemple;
  readonly support: HierophantVisionsSupport;
  readonly classCost:
    | { readonly kind: "none" }
    | { readonly kind: "fixed"; readonly resource: HierophantVisionsResource; readonly amount: number }
    | { readonly kind: "artisan" }
    | { readonly kind: "unknown" };
}

function supportedClassIdsForDoctrine(
  doctrineId: string,
  campaignDoctrines: readonly HierophantCampaignDoctrine[],
): readonly string[] | null {
  if (isValidHierophantBuiltinDoctrineId(doctrineId)) {
    return hierophantBuiltinDoctrineDefinition(doctrineId).supportedClassIds;
  }
  const campaign = campaignDoctrines.find((entry) => entry.doctrineId === doctrineId);
  return campaign === undefined ? null : campaign.supportedClassIds;
}

export function hierophantDoctrinePairSupportedClassIds(
  doctrine: OrdinaryTempleDoctrineState,
  campaignDoctrines: readonly HierophantCampaignDoctrine[],
): readonly string[] | null {
  if (doctrine.kind === "unset") return null;
  if (doctrine.kind === "doctrine") {
    return supportedClassIdsForDoctrine(doctrine.doctrineId, campaignDoctrines);
  }
  if (isValidHierophantBuiltinBlasphemyId(doctrine.blasphemyId)) {
    const pair = HIEROPHANT_BUILTIN_DOCTRINE_DEFINITIONS.find(
      (entry) => entry.pairedBlasphemy.id === doctrine.blasphemyId,
    );
    return pair === undefined ? null : pair.supportedClassIds;
  }
  const campaign = campaignDoctrines.find(
    (entry) => entry.blasphemy !== null && entry.blasphemy.blasphemyId === doctrine.blasphemyId,
  );
  return campaign === undefined ? null : campaign.supportedClassIds;
}

export function hierophantVisionsSupport(
  temple: HierophantTemple,
  classId: HierophantClassId,
  campaignDoctrines: readonly HierophantCampaignDoctrine[],
): HierophantVisionsSupport {
  if (temple.status === "collapsed") return "not_applicable";
  if (temple.kind === "hestar") return "supported";
  if (temple.doctrine.kind === "unset") return "not_determined";
  const supported = hierophantDoctrinePairSupportedClassIds(temple.doctrine, campaignDoctrines);
  if (supported === null) return "not_determined";
  if (supported.includes(classId)) return "supported";
  if (isValidHierophantBuiltinClassId(classId)) return "unsupported";
  return "not_determined";
}

function isBlasphemousOrdinary(temple: HierophantTemple): boolean {
  return temple.kind === "ordinary" && temple.doctrine.kind === "blasphemy";
}

function templeMayShareWithHestar(temple: HierophantTemple): boolean {
  return temple.kind === "ordinary" && temple.status === "active" && !isBlasphemousOrdinary(temple);
}

function eligibleHestarDonorIds(
  temples: readonly HierophantTemple[],
  stocks: ReadonlyMap<HierophantTempleId, MutableStock>,
  resource: HierophantVisionsResource,
  amount: number,
): Exclude<HierophantTempleId, "hestar">[] {
  const ids: Exclude<HierophantTempleId, "hestar">[] = [];
  for (const temple of temples) {
    if (temple.kind !== "ordinary" || !templeMayShareWithHestar(temple)) continue;
    const stock = stocks.get(temple.templeId);
    if (stock === undefined || stockOf(stock, resource) < amount) continue;
    ids.push(temple.templeId);
  }
  return ids.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function hasPartialHestarDonor(
  temples: readonly HierophantTemple[],
  stocks: ReadonlyMap<HierophantTempleId, MutableStock>,
  resource: HierophantVisionsResource,
  amount: number,
): boolean {
  for (const temple of temples) {
    if (!templeMayShareWithHestar(temple)) continue;
    const stock = stocks.get(temple.templeId);
    if (stock === undefined) continue;
    const have = stockOf(stock, resource);
    if (have > 0 && have < amount) return true;
  }
  return false;
}

function classCostFor(classId: HierophantClassId): ClassifiedSupplicant["classCost"] {
  if (classId === "artisan") return { kind: "artisan" };
  if (!(classId in FIXED_CLASS_COST)) return { kind: "unknown" };
  const cost = FIXED_CLASS_COST[classId as keyof typeof FIXED_CLASS_COST];
  return { kind: "fixed", resource: cost.resource, amount: cost.amount };
}

function stockOf(stock: MutableStock, resource: HierophantVisionsResource): number {
  return resource === "abundance" ? stock.abundance : stock.conviction;
}

function addStock(stock: MutableStock, resource: HierophantVisionsResource, amount: number): void {
  if (resource === "abundance") stock.abundance += amount;
  else stock.conviction += amount;
}

function spendStock(stock: MutableStock, resource: HierophantVisionsResource, amount: number): boolean {
  if (stockOf(stock, resource) < amount) return false;
  addStock(stock, resource, -amount);
  return true;
}

function shortageBlocker(
  denizenId: DenizenId | null,
  templeId: HierophantTempleId,
  resource: HierophantVisionsResource,
  amount: number,
): HierophantVisionsBlocker {
  if (resource === "abundance") {
    return { kind: "resource_shortage_collapse", denizenId, templeId, resource, amount };
  }
  return { kind: "resource_shortage_blasphemy", denizenId, templeId, resource, amount };
}

function artisanResourceAt(
  stock: MutableStock,
  explicit: HierophantVisionsResource | undefined,
): HierophantVisionsResource | "ambiguous" {
  if (explicit !== undefined) return explicit;
  if (stock.abundance > stock.conviction) return "abundance";
  if (stock.conviction > stock.abundance) return "conviction";
  return "ambiguous";
}

function classify(
  person: HierophantSupplicant,
  temple: HierophantTemple,
  campaignDoctrines: readonly HierophantCampaignDoctrine[],
): ClassifiedSupplicant {
  const support = hierophantVisionsSupport(temple, person.classId, campaignDoctrines);
  if (support !== "supported") {
    return {
      person,
      temple,
      support,
      classCost: { kind: "none" },
    };
  }
  return {
    person,
    temple,
    support,
    classCost: classCostFor(person.classId),
  };
}

function resolvedPayment(
  entry: ClassifiedSupplicant,
  templeStock: MutableStock,
  choices: HierophantVisionsChoices,
): { readonly resource: HierophantVisionsResource; readonly amount: number } | "artisan" | "unknown" | null {
  if (entry.support !== "supported") return null;
  if (entry.classCost.kind === "unknown") return "unknown";
  if (entry.classCost.kind === "none") return null;
  if (entry.classCost.kind === "fixed") {
    return { resource: entry.classCost.resource, amount: entry.classCost.amount };
  }
  const picked = artisanResourceAt(
    templeStock,
    choices.artisanPayments?.[entry.person.denizenId],
  );
  if (picked === "ambiguous") return "artisan";
  return { resource: picked, amount: 1 };
}

function sortIds(ids: readonly DenizenId[]): DenizenId[] {
  return [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function uniqueIds(ids: readonly DenizenId[]): DenizenId[] {
  return sortIds([...new Set(ids)]);
}

function orderCovers(
  supplied: readonly DenizenId[] | undefined,
  required: readonly DenizenId[],
): supplied is readonly DenizenId[] {
  if (supplied === undefined) return false;
  const have = new Set(supplied);
  return required.every((id) => have.has(id));
}

interface WorkingPreview {
  demand: HierophantVisionsDemand;
  woeProjection: HierophantVisionsWoeProjection;
  thresholdCue: HierophantVisionsThresholdCue;
  choiceRequired: boolean;
  blockerKind: HierophantVisionsBlocker["kind"] | null;
}

function emptyWorking(entry: ClassifiedSupplicant): WorkingPreview {
  return {
    demand: entry.classCost.kind === "none"
      ? { kind: "none" }
      : entry.classCost.kind === "fixed"
        ? { kind: "fixed", resource: entry.classCost.resource, amount: entry.classCost.amount }
        : entry.classCost.kind === "artisan"
          ? { kind: "artisan" }
          : { kind: "unknown" },
    woeProjection: { kind: "undetermined" },
    thresholdCue: { kind: "none" },
    choiceRequired: false,
    blockerKind: null,
  };
}

function thresholdCueFor(woeAfter: number): HierophantVisionsThresholdCue {
  if (woeAfter === 0) return { kind: "ready_for_benefaction" };
  if (woeAfter >= CULT_WOE_THRESHOLD) return { kind: "cult_departure_due" };
  return { kind: "none" };
}

function applyUnsupported(entry: ClassifiedSupplicant, working: WorkingPreview): void {
  const to = entry.person.woe + 1;
  working.woeProjection = { kind: "determined", from: entry.person.woe, to };
  working.thresholdCue = thresholdCueFor(to);
}

function applyPaid(entry: ClassifiedSupplicant, working: WorkingPreview): void {
  const to = Math.max(0, entry.person.woe - 1);
  working.woeProjection = { kind: "determined", from: entry.person.woe, to };
  working.thresholdCue = thresholdCueFor(to);
}

export function planHierophantVisions(
  hierophant: HierophantState,
  choices: HierophantVisionsChoices = {},
  context: HierophantVisionsContext = {},
): HierophantVisionsPlan {
  const templeById = new Map(hierophant.temples.map((temple) => [temple.templeId, temple]));
  const hestar = templeById.get("hestar");
  const startingStock = new Map<HierophantTempleId, MutableStock>();
  for (const temple of hierophant.temples) {
    startingStock.set(temple.templeId, { abundance: temple.abundance, conviction: temple.conviction });
  }

  const classified: ClassifiedSupplicant[] = [];
  for (const person of hierophant.supplicants) {
    if (person.host.kind !== "temple") continue;
    const temple = templeById.get(person.host.templeId);
    if (temple === undefined) continue;
    classified.push(classify(person, temple, hierophant.campaignDoctrines));
  }

  const byTemple = new Map<HierophantTempleId, ClassifiedSupplicant[]>();
  for (const entry of classified) {
    const list = byTemple.get(entry.temple.templeId) ?? [];
    list.push(entry);
    byTemple.set(entry.temple.templeId, list);
  }

  const requiredChoices: HierophantVisionsRequiredChoice[] = [];
  const blockers: HierophantVisionsBlocker[] = [];
  const working = new Map<string, WorkingPreview>();
  const orderSensitiveIds: DenizenId[] = [];
  const hestarChoiceIds = new Set<string>();
  const hestarAppliedIds = new Set<string>();
  const hestarDeclinedIds = new Set<string>();
  const hestarDonorChoiceIds = new Set<string>();
  const hestarDonorAppliedIds = new Set<string>();
  const hestarClaims: Array<{
    readonly denizenId: DenizenId;
    readonly resource: HierophantVisionsResource;
    readonly amount: number;
  }> = [];
  const shortageTemples = new Map<string, { resource: HierophantVisionsResource; consequence: "collapse" | "blasphemy" }>();
  const hestarUses: HierophantVisionsHestarUseFact[] = [];

  for (const entry of classified) {
    const preview = emptyWorking(entry);
    working.set(entry.person.denizenId, preview);

    if (entry.support === "not_applicable") {
      preview.blockerKind = "collapsed_temple";
      blockers.push({
        kind: "collapsed_temple",
        denizenId: entry.person.denizenId,
        templeId: entry.temple.templeId,
      });
      continue;
    }
    if (entry.support === "not_determined") {
      preview.blockerKind = "support_not_determined";
      blockers.push({
        kind: "support_not_determined",
        denizenId: entry.person.denizenId,
        templeId: entry.temple.templeId,
      });
      continue;
    }
    if (entry.support === "unsupported") {
      applyUnsupported(entry, preview);
      continue;
    }
    if (entry.classCost.kind === "unknown") {
      preview.blockerKind = "unknown_class_cost";
      blockers.push({
        kind: "unknown_class_cost",
        denizenId: entry.person.denizenId,
        templeId: entry.temple.templeId,
        classId: entry.person.classId,
      });
    }
  }

  const resourceAffecting = classified.filter((entry) =>
    entry.support === "supported" && entry.classCost.kind !== "unknown" && entry.temple.status === "active",
  );

  for (const [templeId, entries] of byTemple) {
    const temple = templeById.get(templeId);
    if (temple === undefined || temple.status !== "active") continue;
    const stock = startingStock.get(templeId);
    if (stock === undefined) continue;
    const payers = entries.filter((entry) =>
      entry.support === "supported" && entry.classCost.kind !== "unknown",
    );
    if (payers.length === 0) continue;

    const resolvedOrChoice: Array<{
      readonly entry: ClassifiedSupplicant;
      readonly payment: { resource: HierophantVisionsResource; amount: number } | null;
    }> = [];

    for (const entry of payers) {
      const preview = working.get(entry.person.denizenId)!;
      const resolved = resolvedPayment(entry, stock, choices);
      if (resolved === "unknown") continue;
      if (resolved === "artisan") {
        preview.choiceRequired = true;
        requiredChoices.push({
          kind: "artisan_payment",
          denizenId: entry.person.denizenId,
          templeId: entry.temple.templeId,
          options: ["abundance", "conviction"],
        });
        resolvedOrChoice.push({ entry, payment: null });
        continue;
      }
      if (resolved === null) continue;
      preview.demand = { kind: "fixed", resource: resolved.resource, amount: resolved.amount };
      resolvedOrChoice.push({ entry, payment: resolved });
    }

    const determinedPayers = resolvedOrChoice.filter(
      (row): row is { entry: ClassifiedSupplicant; payment: { resource: HierophantVisionsResource; amount: number } } =>
        row.payment !== null,
    );

    let totalA = 0;
    let totalC = 0;
    for (const row of determinedPayers) {
      if (row.payment.resource === "abundance") totalA += row.payment.amount;
      else totalC += row.payment.amount;
    }
    const canPayAllFromStart = totalA <= stock.abundance && totalC <= stock.conviction;
    if (totalA > stock.abundance && stock.abundance > 0) {
      for (const row of determinedPayers) {
        if (row.payment.resource === "abundance") orderSensitiveIds.push(row.entry.person.denizenId);
      }
    }
    if (totalC > stock.conviction && stock.conviction > 0) {
      for (const row of determinedPayers) {
        if (row.payment.resource === "conviction") orderSensitiveIds.push(row.entry.person.denizenId);
      }
    }

    for (const row of determinedPayers) {
      const preview = working.get(row.entry.person.denizenId)!;
      const startHave = stockOf(stock, row.payment.resource);
      const needsHelp = startHave < row.payment.amount;

      if (!needsHelp) continue;

      if (temple.kind === "hestar") {
        const donors = eligibleHestarDonorIds(
          hierophant.temples,
          startingStock,
          row.payment.resource,
          row.payment.amount,
        );
        const chosen = choices.hestarDonors?.[row.entry.person.denizenId];
        if (chosen !== undefined && donors.includes(chosen as Exclude<HierophantTempleId, "hestar">)) {
          hestarDonorAppliedIds.add(row.entry.person.denizenId);
        } else if (donors.length > 0) {
          preview.choiceRequired = true;
          hestarDonorChoiceIds.add(row.entry.person.denizenId);
          requiredChoices.push({
            kind: "hestar_donor",
            denizenId: row.entry.person.denizenId,
            templeId: "hestar",
            resource: row.payment.resource,
            amount: row.payment.amount,
            eligibleDonorTempleIds: donors,
          });
        } else {
          preview.blockerKind = "hestar_share_unresolved";
          blockers.push({
            kind: "hestar_share_unresolved",
            denizenId: row.entry.person.denizenId,
            templeId: "hestar",
            resource: row.payment.resource,
            amount: row.payment.amount,
            reason: hasPartialHestarDonor(
              hierophant.temples,
              startingStock,
              row.payment.resource,
              row.payment.amount,
            )
              ? "donor_combination_unapproved"
              : "no_eligible_donor",
          });
        }
        continue;
      }

      const hestarHave = hestar === undefined ? 0 : (
        row.payment.resource === "abundance" ? hestar.abundance : hestar.conviction
      );
      const hestarCanPay = templeMayShareWithHestar(temple) && hestarHave >= row.payment.amount;
      const fallbackChoice = choices.hestarFallback?.[row.entry.person.denizenId];
      if (hestarCanPay && fallbackChoice !== false) {
        hestarClaims.push({
          denizenId: row.entry.person.denizenId,
          resource: row.payment.resource,
          amount: row.payment.amount,
        });
      }
      if (hestarCanPay && fallbackChoice === undefined) {
        preview.choiceRequired = true;
        hestarChoiceIds.add(row.entry.person.denizenId);
        requiredChoices.push({
          kind: "hestar_fallback",
          denizenId: row.entry.person.denizenId,
          templeId: row.entry.temple.templeId,
          resource: row.payment.resource,
          amount: row.payment.amount,
          options: [true, false],
        });
      } else if (hestarCanPay && fallbackChoice === true) {
        hestarAppliedIds.add(row.entry.person.denizenId);
      } else if (hestarCanPay && fallbackChoice === false) {
        hestarDeclinedIds.add(row.entry.person.denizenId);
        preview.blockerKind = row.payment.resource === "abundance"
          ? "resource_shortage_collapse"
          : "resource_shortage_blasphemy";
        blockers.push(shortageBlocker(
          row.entry.person.denizenId,
          row.entry.temple.templeId,
          row.payment.resource,
          row.payment.amount,
        ));
        shortageTemples.set(row.entry.temple.templeId, {
          resource: row.payment.resource,
          consequence: row.payment.resource === "abundance" ? "collapse" : "blasphemy",
        });
      } else {
        preview.blockerKind = row.payment.resource === "abundance"
          ? "resource_shortage_collapse"
          : "resource_shortage_blasphemy";
        blockers.push(shortageBlocker(
          row.entry.person.denizenId,
          row.entry.temple.templeId,
          row.payment.resource,
          row.payment.amount,
        ));
        shortageTemples.set(row.entry.temple.templeId, {
          resource: row.payment.resource,
          consequence: row.payment.resource === "abundance" ? "collapse" : "blasphemy",
        });
      }
    }

    const artisanPayers = payers.filter((entry) => entry.classCost.kind === "artisan");
    if (artisanPayers.length > 0 && canPayAllFromStart === false) {
      for (const payer of payers) orderSensitiveIds.push(payer.person.denizenId);
    }
  }

  if (hestar !== undefined) {
    for (const resource of ["abundance", "conviction"] as const) {
      const claims = hestarClaims.filter((claim) => claim.resource === resource);
      const need = claims.reduce((sum, claim) => sum + claim.amount, 0);
      const have = resource === "abundance" ? hestar.abundance : hestar.conviction;
      if (claims.length > 1 && have < need) {
        for (const claim of claims) orderSensitiveIds.push(claim.denizenId);
      }
    }
  }

  const orderParticipants = uniqueIds(orderSensitiveIds);
  const orderSupplied = orderCovers(choices.supplicantOrder, orderParticipants);
  if (orderParticipants.length > 1 && !orderSupplied) {
    requiredChoices.push({
      kind: "supplicant_order",
      participantIds: orderParticipants,
      reason: "resource_competition",
    });
  }

  const pendingArtisan = requiredChoices.some((choice) => choice.kind === "artisan_payment");
  const pendingHestar = requiredChoices.some((choice) => choice.kind === "hestar_fallback");
  const pendingHestarDonor = requiredChoices.some((choice) => choice.kind === "hestar_donor");
  const pendingOrder = requiredChoices.some((choice) => choice.kind === "supplicant_order");
  const pendingDonorTempleIds = new Set(
    requiredChoices.flatMap((choice) => choice.kind === "hestar_donor" ? choice.eligibleDonorTempleIds : []),
  );
  const structuralBlockers = blockers.filter((blocker) =>
    blocker.kind === "support_not_determined"
    || blocker.kind === "collapsed_temple"
    || blocker.kind === "unknown_class_cost",
  );
  const canSimulateGlobally = !pendingArtisan
    && !pendingHestar
    && !pendingHestarDonor
    && !pendingOrder
    && structuralBlockers.length === 0;
  const orderSet = new Set(orderParticipants);

  const endingStock = new Map<HierophantTempleId, MutableStock>();
  for (const [id, stock] of startingStock) {
    endingStock.set(id, { abundance: stock.abundance, conviction: stock.conviction });
  }

  function payEntry(entry: ClassifiedSupplicant, allowHestar: boolean): boolean {
    const preview = working.get(entry.person.denizenId)!;
    const local = endingStock.get(entry.temple.templeId);
    if (local === undefined) return false;
    const payment = resolvedPayment(entry, local, choices);
    if (payment === "artisan" || payment === "unknown" || payment === null) return false;
    const chosenDonor = choices.hestarDonors?.[entry.person.denizenId];
    const donorTemple = chosenDonor === undefined ? undefined : templeById.get(chosenDonor);
    const useDonor = allowHestar
      && entry.temple.kind === "hestar"
      && donorTemple !== undefined
      && templeMayShareWithHestar(donorTemple)
      && stockOf(local, payment.resource) < payment.amount;
    const useHestar = allowHestar
      && !useDonor
      && choices.hestarFallback?.[entry.person.denizenId] === true
      && templeMayShareWithHestar(entry.temple)
      && stockOf(local, payment.resource) < payment.amount;
    const sourceId = useDonor && chosenDonor !== undefined
      ? chosenDonor
      : useHestar && hestar !== undefined
        ? hestar.templeId
        : entry.temple.templeId;
    const source = endingStock.get(sourceId);
    if (source === undefined) return false;
    if (!spendStock(source, payment.resource, payment.amount)) {
      preview.blockerKind = payment.resource === "abundance"
        ? "resource_shortage_collapse"
        : "resource_shortage_blasphemy";
      if (!blockers.some((blocker) =>
        (blocker.kind === "resource_shortage_collapse" || blocker.kind === "resource_shortage_blasphemy")
        && blocker.denizenId === entry.person.denizenId
      )) {
        blockers.push(shortageBlocker(
          entry.person.denizenId,
          entry.temple.templeId,
          payment.resource,
          payment.amount,
        ));
      }
      shortageTemples.set(entry.temple.templeId, {
        resource: payment.resource,
        consequence: payment.resource === "abundance" ? "collapse" : "blasphemy",
      });
      return false;
    }
    applyPaid(entry, preview);
    if (useDonor && chosenDonor !== undefined) {
      hestarUses.push({
        kind: "donor",
        denizenId: entry.person.denizenId,
        hostedTempleId: entry.temple.templeId,
        sourceTempleId: chosenDonor,
        resource: payment.resource,
        amount: payment.amount,
      });
    } else if (useHestar && hestar !== undefined) {
      hestarUses.push({
        kind: "fallback",
        denizenId: entry.person.denizenId,
        hostedTempleId: entry.temple.templeId,
        sourceTempleId: hestar.templeId,
        resource: payment.resource,
        amount: payment.amount,
      });
    }
    return true;
  }

  function entryIsResourcePending(entry: ClassifiedSupplicant): boolean {
    const preview = working.get(entry.person.denizenId);
    if (preview?.choiceRequired === true) return true;
    if (pendingOrder && orderSet.has(entry.person.denizenId)) return true;
    return false;
  }

  if (canSimulateGlobally) {
    const processOrder: ClassifiedSupplicant[] = [];
    if (orderParticipants.length > 1 && choices.supplicantOrder !== undefined) {
      const byId = new Map(resourceAffecting.map((entry) => [entry.person.denizenId, entry]));
      const seen = new Set<string>();
      for (const id of choices.supplicantOrder) {
        const entry = byId.get(id);
        if (entry === undefined || seen.has(id)) continue;
        processOrder.push(entry);
        seen.add(id);
      }
      for (const entry of resourceAffecting) {
        if (!seen.has(entry.person.denizenId)) processOrder.push(entry);
      }
    } else {
      processOrder.push(...resourceAffecting);
    }
    for (const entry of processOrder) {
      const preview = working.get(entry.person.denizenId);
      if (preview?.blockerKind === "hestar_share_unresolved") continue;
      payEntry(entry, true);
    }
  } else {
    for (const entry of resourceAffecting) {
      if (entryIsResourcePending(entry)) continue;
      const preview = working.get(entry.person.denizenId)!;
      if (
        preview.blockerKind === "resource_shortage_collapse"
        || preview.blockerKind === "resource_shortage_blasphemy"
        || preview.blockerKind === "hestar_share_unresolved"
      ) {
        continue;
      }
      payEntry(entry, false);
    }
  }

  const reliableProphetIds = new Set(context.reliableProphetDenizenIds ?? []);
  const reliableProphetsByTemple = new Map<HierophantTempleId, DenizenId[]>();
  for (const prophet of hierophant.prophets) {
    if (prophet.host.kind !== "temple") continue;
    if (!reliableProphetIds.has(prophet.denizenId)) continue;
    const hosted = reliableProphetsByTemple.get(prophet.host.templeId) ?? [];
    hosted.push(prophet.denizenId);
    reliableProphetsByTemple.set(prophet.host.templeId, hosted);
  }
  const prophetProductionTemples = new Set<HierophantTempleId>();
  for (const [templeId, prophetIds] of reliableProphetsByTemple) {
    const before = startingStock.get(templeId);
    const after = endingStock.get(templeId);
    if (before === undefined || after === undefined) continue;
    const productions: Array<{
      readonly denizenId: DenizenId;
      readonly resource: HierophantVisionsResource;
      readonly amount: number;
    }> = [];
    if (after.abundance > before.abundance) {
      productions.push({
        denizenId: prophetIds[0]!,
        resource: "abundance",
        amount: after.abundance - before.abundance,
      });
    }
    if (after.conviction > before.conviction) {
      productions.push({
        denizenId: prophetIds[0]!,
        resource: "conviction",
        amount: after.conviction - before.conviction,
      });
    }
    if (productions.length === 0) continue;
    prophetProductionTemples.add(templeId);
    blockers.push({
      kind: "reliable_prophet_production",
      templeId,
      prophetDenizenIds: uniqueIds(prophetIds),
      productions,
    });
  }

  const temples: HierophantVisionsTemplePreview[] = hierophant.temples.map((temple) => {
    const before = startingStock.get(temple.templeId)!;
    const after = endingStock.get(temple.templeId)!;
    const shortage = shortageTemples.get(temple.templeId) ?? null;
    const hostedEntries = byTemple.get(temple.templeId) ?? [];
    const hostedHestarChoice = hostedEntries.some((entry) => hestarChoiceIds.has(entry.person.denizenId));
    const hostedHestarApplied = hostedEntries.some((entry) => hestarAppliedIds.has(entry.person.denizenId));
    const hostedHestarDeclined = hostedEntries.some((entry) => hestarDeclinedIds.has(entry.person.denizenId));
    const hostedHestarDonorChoice = hostedEntries.some((entry) => hestarDonorChoiceIds.has(entry.person.denizenId));
    const hostedHestarDonorApplied = hostedEntries.some((entry) => hestarDonorAppliedIds.has(entry.person.denizenId));
    const orderChoiceRequired = hostedEntries.some((entry) => orderSet.has(entry.person.denizenId))
      && pendingOrder;
    const hostedPending = hostedEntries.some((entry) => entryIsResourcePending(entry));
    const hestarCoupled = temple.kind === "hestar" && (pendingHestar || (!canSimulateGlobally && hestarAppliedIds.size > 0));
    const hestarDonorCoupled = pendingHestarDonor
      && (temple.kind === "hestar" || pendingDonorTempleIds.has(temple.templeId));
    const reliableProphetProduction = prophetProductionTemples.has(temple.templeId);
    const resourcesSettled = shortage === null
      && !hostedPending
      && !orderChoiceRequired
      && !hestarCoupled
      && !hestarDonorCoupled
      && !reliableProphetProduction;
    const abundanceAfterFinal = resourcesSettled ? after.abundance : null;
    const convictionAfterFinal = resourcesSettled ? after.conviction : null;

    const unresolved = hostedEntries.some((entry) => {
      const preview = working.get(entry.person.denizenId);
      return preview !== undefined && (preview.choiceRequired || preview.blockerKind !== null);
    }) || orderChoiceRequired || shortage !== null || reliableProphetProduction;

    return {
      templeId: temple.templeId,
      abundance: {
        before: before.abundance,
        delta: abundanceAfterFinal === null ? null : abundanceAfterFinal - before.abundance,
        after: abundanceAfterFinal,
      },
      conviction: {
        before: before.conviction,
        delta: convictionAfterFinal === null ? null : convictionAfterFinal - before.conviction,
        after: convictionAfterFinal,
      },
      shortage,
      hestarFallback: hostedHestarChoice
        ? "choice_required"
        : hostedHestarApplied
          ? "applied"
          : hostedHestarDeclined
            ? "declined"
            : "not_needed",
      hestarDonor: hostedHestarDonorChoice
        ? "choice_required"
        : hostedHestarDonorApplied
          ? "applied"
          : "not_needed",
      reliableProphetProduction,
      orderChoiceRequired,
      unresolved,
    };
  });

  const supplicants: HierophantVisionsSupplicantPreview[] = classified.map((entry) => {
    const preview = working.get(entry.person.denizenId)!;
    return {
      denizenId: entry.person.denizenId,
      templeId: entry.temple.templeId,
      classId: entry.person.classId,
      woe: entry.person.woe,
      support: entry.support,
      demand: preview.demand,
      woeProjection: preview.woeProjection,
      thresholdCue: preview.thresholdCue,
      choiceRequired: preview.choiceRequired,
      blockerKind: preview.blockerKind,
    };
  });

  const kind: HierophantVisionsPlanKind = blockers.length > 0
    ? "manual_resolution_required"
    : requiredChoices.length > 0
      ? "choices_required"
      : "ready";

  return {
    kind,
    requiredChoices,
    blockers,
    temples,
    supplicants,
    hestarUses,
  };
}

function previewByTempleId(
  plan: HierophantVisionsPlan,
): Map<HierophantTempleId, HierophantVisionsTemplePreview> {
  return new Map(plan.temples.map((preview) => [preview.templeId, preview]));
}

function readyTempleStock(
  preview: HierophantVisionsTemplePreview | undefined,
): { readonly abundance: number; readonly conviction: number } | null {
  if (preview === undefined) return null;
  if (preview.abundance.after === null || preview.conviction.after === null) return null;
  return { abundance: preview.abundance.after, conviction: preview.conviction.after };
}

function resultingTemple(
  temple: HierophantTemple,
  stock: { readonly abundance: number; readonly conviction: number },
): HierophantTemple {
  return { ...temple, abundance: stock.abundance, conviction: stock.conviction };
}

function normalizeAppliedChoices(
  choices: HierophantVisionsChoices,
  plan: HierophantVisionsPlan,
): HierophantVisionsChoices {
  const artisanPayments: Record<string, HierophantVisionsResource> = {};
  for (const preview of plan.supplicants) {
    if (classCostFor(preview.classId).kind !== "artisan") continue;
    const picked = choices.artisanPayments?.[preview.denizenId];
    if (picked === undefined) continue;
    artisanPayments[preview.denizenId] = picked;
  }
  const hestarFallback: Record<string, boolean> = {};
  const hestarDonors: Record<string, HierophantTempleId> = {};
  for (const use of plan.hestarUses) {
    if (use.kind === "fallback") hestarFallback[use.denizenId] = true;
    else hestarDonors[use.denizenId] = use.sourceTempleId;
  }
  const materialOrder = (choices.supplicantOrder?.length ?? 0) > 1
    ? choices.supplicantOrder
    : undefined;
  return {
    ...(Object.keys(artisanPayments).length > 0 ? { artisanPayments } : {}),
    ...(Object.keys(hestarFallback).length > 0 ? { hestarFallback } : {}),
    ...(Object.keys(hestarDonors).length > 0 ? { hestarDonors } : {}),
    ...(materialOrder === undefined ? {} : { supplicantOrder: materialOrder }),
  };
}

function assembleReadyResolution(
  hierophant: HierophantState,
  choices: HierophantVisionsChoices,
  plan: HierophantVisionsPlan,
): Extract<HierophantVisionsResolution, { kind: "ready" }> | null {
  const templePreview = previewByTempleId(plan);
  const resultingTemples: HierophantTemple[] = [];
  const resourceDeltas: HierophantVisionsResourceDeltaFact[] = [];
  for (const temple of hierophant.temples) {
    const preview = templePreview.get(temple.templeId);
    const stock = readyTempleStock(preview);
    if (stock === null) return null;
    resultingTemples.push(resultingTemple(temple, stock));
    if (preview !== undefined) {
      if (preview.abundance.delta !== 0 && preview.abundance.delta !== null) {
        resourceDeltas.push({
          templeId: temple.templeId,
          resource: "abundance",
          before: preview.abundance.before,
          after: stock.abundance,
          delta: preview.abundance.delta,
        });
      }
      if (preview.conviction.delta !== 0 && preview.conviction.delta !== null) {
        resourceDeltas.push({
          templeId: temple.templeId,
          resource: "conviction",
          before: preview.conviction.before,
          after: stock.conviction,
          delta: preview.conviction.delta,
        });
      }
    }
  }

  const personPreview = new Map(plan.supplicants.map((preview) => [preview.denizenId, preview]));
  const resultingSupplicants: HierophantSupplicant[] = [];
  const woeChanges: HierophantVisionsWoeFact[] = [];
  const thresholdCues: HierophantVisionsThresholdCueFact[] = [];
  for (const person of hierophant.supplicants) {
    const preview = personPreview.get(person.denizenId);
    if (preview === undefined) {
      resultingSupplicants.push(person);
      continue;
    }
    if (preview.woeProjection.kind !== "determined") return null;
    woeChanges.push({
      denizenId: person.denizenId,
      templeId: preview.templeId,
      from: preview.woeProjection.from,
      to: preview.woeProjection.to,
    });
    if (preview.thresholdCue.kind !== "none") {
      thresholdCues.push({
        denizenId: person.denizenId,
        templeId: preview.templeId,
        kind: preview.thresholdCue.kind,
      });
    }
    resultingSupplicants.push({ ...person, woe: preview.woeProjection.to });
  }

  const resultingState: HierophantState = {
    ...hierophant,
    temples: resultingTemples,
    supplicants: resultingSupplicants,
  };
  return {
    kind: "ready",
    plan,
    resultingState,
    facts: {
      suppliedChoices: normalizeAppliedChoices(choices, plan),
      templeIds: hierophant.temples.map((temple) => temple.templeId),
      supplicantIds: hierophant.supplicants
        .filter((person) => person.host.kind === "temple")
        .map((person) => person.denizenId),
      resourceDeltas,
      woeChanges,
      thresholdCues,
      hestarUses: plan.hestarUses,
    },
  };
}

export function computeHierophantVisionsResolution(
  hierophant: HierophantState,
  choices: HierophantVisionsChoices = {},
  context: HierophantVisionsContext = {},
): HierophantVisionsResolution {
  const plan = planHierophantVisions(hierophant, choices, context);
  if (plan.kind === "choices_required") {
    return { kind: "choices_required", plan };
  }
  if (plan.kind !== "ready") {
    return { kind: "manual_resolution_required", plan };
  }
  const assembled = assembleReadyResolution(hierophant, choices, plan);
  if (assembled === null) {
    return { kind: "manual_resolution_required", plan };
  }
  return assembled;
}
