import {
  HIEROPHANT_BUILTIN_CLASS_DEFINITIONS,
  HIEROPHANT_BUILTIN_DOCTRINE_DEFINITIONS,
  HIEROPHANT_BUILTIN_DOGMA_DEFINITIONS,
  HIEROPHANT_FLAME_LAW_IDS,
  HIEROPHANT_STARTING_TEMPLE_IDS,
  hierophantBuiltinDoctrineDefinition,
  hierophantFlameLawText,
  hierophantStartingTempleDisplayName,
  isValidHierophantBuiltinClassId,
  isValidHierophantBuiltinDoctrineId,
  isValidHierophantFlameLawId,
  isValidHierophantStartingTempleId,
  isValidPactSeatId,
  pactSeatDisplayName,
  type HierophantCampaignClass,
  type HierophantCampaignDoctrine,
  type HierophantCult,
  type HierophantFlameLawId,
  type HierophantProphet,
  type HierophantStartingTempleId,
  type HierophantState,
  type HierophantSupplicant,
  type HierophantTemple,
} from "../shared/domain";

export interface NamedDenizen {
  readonly denizenId: string;
  readonly name: string;
  readonly representation: "individual" | "collective";
}

export interface NamedPlace {
  readonly placeId: string;
  readonly name: string;
}

export type StartingTempleBindings = Partial<Record<HierophantStartingTempleId, string>>;

export function isHierophantInitialized(hierophant: Pick<HierophantState, "temples">): boolean {
  return hierophant.temples.length > 0;
}

export function newCommandId(uuid: string = crypto.randomUUID()): string {
  return `cmd_${uuid}`;
}

export function newPlaceId(uuid: string = crypto.randomUUID()): string {
  return `plc_${uuid}`;
}

export function newCampaignTempleId(uuid: string = crypto.randomUUID()): string {
  return `htm_${uuid}`;
}

export function newCampaignClassId(uuid: string = crypto.randomUUID()): string {
  return `hcl_${uuid}`;
}

export function newCampaignDoctrineId(uuid: string = crypto.randomUUID()): string {
  return `hdc_${uuid}`;
}

export function newCampaignBlasphemyId(uuid: string = crypto.randomUUID()): string {
  return `hbl_${uuid}`;
}

export function newDogmaEntryId(uuid: string = crypto.randomUUID()): string {
  return `hdg_${uuid}`;
}

export function lawsInCatalogOrder(ids: readonly string[]): HierophantFlameLawId[] {
  const unique = new Set(ids);
  return HIEROPHANT_FLAME_LAW_IDS.filter((id) => unique.has(id));
}

export function flameLawSourceText(id: string): string | null {
  if (!isValidHierophantFlameLawId(id)) return null;
  return hierophantFlameLawText(id);
}

export function unresolvedStartingTemples(bindings: StartingTempleBindings): HierophantStartingTempleId[] {
  return HIEROPHANT_STARTING_TEMPLE_IDS.filter((id) => {
    const placeId = bindings[id];
    return placeId === undefined || placeId.trim() === "";
  });
}

export function hierophantSetupReady(
  selectedLawIds: readonly string[],
  bindings: StartingTempleBindings,
): boolean {
  const ordered = lawsInCatalogOrder(selectedLawIds);
  return ordered.length === 2 && selectedLawIds.length === 2 && unresolvedStartingTemples(bindings).length === 0;
}

export function buildInitializeHierophantPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly selectedLawIds: readonly string[];
  readonly bindings: StartingTempleBindings;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly selectedFlameLawIds: HierophantFlameLawId[];
  readonly templePlaces: { templeId: HierophantStartingTempleId; placeId: string }[];
} | null {
  if (!hierophantSetupReady(args.selectedLawIds, args.bindings)) return null;
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    selectedFlameLawIds: lawsInCatalogOrder(args.selectedLawIds),
    templePlaces: HIEROPHANT_STARTING_TEMPLE_IDS.map((templeId) => ({
      templeId,
      placeId: args.bindings[templeId]!,
    })),
  };
}

export function buildTemplePlaceCreatePayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly templeId: HierophantStartingTempleId;
  readonly placeId: string;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly placeId: string;
  readonly name: string;
  readonly description: null;
  readonly placement: { readonly kind: "unspecified" };
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    placeId: args.placeId,
    name: hierophantStartingTempleDisplayName(args.templeId),
    description: null,
    placement: { kind: "unspecified" },
  };
}

export function buildSetSelectedFlameLawsPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly expectedSelectedFlameLawIds: readonly string[];
  readonly selectedLawIds: readonly string[];
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly expectedSelectedFlameLawIds: string[];
  readonly selectedFlameLawIds: HierophantFlameLawId[];
} {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    expectedSelectedFlameLawIds: [...args.expectedSelectedFlameLawIds],
    selectedFlameLawIds: lawsInCatalogOrder(args.selectedLawIds),
  };
}

export function denizenLabel(denizens: readonly NamedDenizen[], denizenId: string | null): string {
  if (denizenId === null) return "Unresolved";
  const found = denizens.find((d) => d.denizenId === denizenId);
  return found === undefined ? "Unknown Denizen" : found.name;
}

export function placeLabel(places: readonly NamedPlace[], placeId: string | null): string {
  if (placeId === null) return "None";
  const found = places.find((p) => p.placeId === placeId);
  return found === undefined ? "Unknown Place" : found.name;
}

export function hostSeatLabel(hostSeatId: string): string {
  return isValidPactSeatId(hostSeatId) ? pactSeatDisplayName(hostSeatId) : hostSeatId;
}

export function templeDisplayName(
  temple: Pick<HierophantTemple, "templeId" | "placeId">,
  places: readonly NamedPlace[],
): string {
  if (isValidHierophantStartingTempleId(temple.templeId)) {
    return hierophantStartingTempleDisplayName(temple.templeId);
  }
  const named = places.find((p) => p.placeId === temple.placeId);
  return named === undefined ? "Custom Temple" : named.name;
}

export function templeEditCapabilities(temple: Pick<HierophantTemple, "kind" | "templeId">): {
  readonly isHestar: boolean;
  readonly canEditDoctrine: boolean;
} {
  const isHestar = temple.kind === "hestar" || temple.templeId === "hestar";
  return { isHestar, canEditDoctrine: !isHestar };
}

export function classLabel(classId: string, campaignClasses: readonly HierophantCampaignClass[]): string {
  if (isValidHierophantBuiltinClassId(classId)) {
    const found = HIEROPHANT_BUILTIN_CLASS_DEFINITIONS.find((c) => c.id === classId);
    return found === undefined ? classId : found.name;
  }
  const campaign = campaignClasses.find((c) => c.classId === classId);
  return campaign === undefined ? classId : campaign.name;
}

export function doctrineText(doctrineId: string, campaignDoctrines: readonly HierophantCampaignDoctrine[]): string {
  if (isValidHierophantBuiltinDoctrineId(doctrineId)) {
    return hierophantBuiltinDoctrineDefinition(doctrineId).text;
  }
  const campaign = campaignDoctrines.find((d) => d.doctrineId === doctrineId);
  if (campaign === undefined) return doctrineId;
  return campaign.orthodoxText === null || campaign.orthodoxText.trim() === ""
    ? "Orthodox text unset"
    : campaign.orthodoxText;
}

export function blasphemyText(blasphemyId: string, campaignDoctrines: readonly HierophantCampaignDoctrine[]): string {
  for (const def of HIEROPHANT_BUILTIN_DOCTRINE_DEFINITIONS) {
    if (def.pairedBlasphemy.id === blasphemyId) return def.pairedBlasphemy.text;
  }
  for (const campaign of campaignDoctrines) {
    if (campaign.blasphemy !== null && campaign.blasphemy.blasphemyId === blasphemyId) {
      return campaign.blasphemy.text;
    }
  }
  return blasphemyId;
}

export function dogmaDisplay(dogma: HierophantCult["dogmas"][number]): { readonly category: string; readonly text: string } {
  if (dogma.kind === "custom") {
    return { category: dogma.category, text: dogma.text };
  }
  const found = HIEROPHANT_BUILTIN_DOGMA_DEFINITIONS.find((d) => d.id === dogma.dogmaId);
  if (found === undefined) return { category: "unknown", text: dogma.dogmaId };
  return { category: found.category, text: found.text };
}

export function individualDenizens(denizens: readonly NamedDenizen[]): NamedDenizen[] {
  return denizens.filter((d) => d.representation === "individual");
}

export function collectiveDenizens(denizens: readonly NamedDenizen[]): NamedDenizen[] {
  return denizens.filter((d) => d.representation === "collective");
}

export function availableIndividualDenizens(
  denizens: readonly NamedDenizen[],
  usedIds: readonly string[],
): NamedDenizen[] {
  const used = new Set(usedIds);
  return individualDenizens(denizens).filter((d) => !used.has(d.denizenId));
}

export function availableCollectiveDenizens(
  denizens: readonly NamedDenizen[],
  usedCultIds: readonly string[],
): NamedDenizen[] {
  const used = new Set(usedCultIds);
  return collectiveDenizens(denizens).filter((d) => !used.has(d.denizenId));
}

export function hostedSupplicants(
  supplicants: readonly HierophantSupplicant[],
  host: { readonly kind: "temple"; readonly templeId: string } | { readonly kind: "cult"; readonly cultDenizenId: string },
): HierophantSupplicant[] {
  return supplicants.filter((s) => {
    if (host.kind === "temple") return s.host.kind === "temple" && s.host.templeId === host.templeId;
    return s.host.kind === "cult" && s.host.cultDenizenId === host.cultDenizenId;
  });
}

export function hostedProphets(
  prophets: readonly HierophantProphet[],
  host: { readonly kind: "temple"; readonly templeId: string } | { readonly kind: "cult"; readonly cultDenizenId: string },
): HierophantProphet[] {
  return prophets.filter((p) => {
    if (host.kind === "temple") return p.host.kind === "temple" && p.host.templeId === host.templeId;
    return p.host.kind === "cult" && p.host.cultDenizenId === host.cultDenizenId;
  });
}

export function cultLeaderWarning(leaderDenizenId: string | null): string | null {
  return leaderDenizenId === null ? "Leader unresolved" : null;
}

export function cultDogmaConvictionWarning(dogmaCount: number, conviction: number): string | null {
  return dogmaCount === conviction ? null : "Dogmas and Conviction differ.";
}

export function templeDoctrineSummary(
  temple: HierophantTemple,
  campaignDoctrines: readonly HierophantCampaignDoctrine[],
): string {
  if (temple.kind === "hestar") return "Hestar has no Doctrine";
  if (temple.doctrine.kind === "unset") return "Doctrine unset";
  if (temple.doctrine.kind === "doctrine") return doctrineText(temple.doctrine.doctrineId, campaignDoctrines);
  return blasphemyText(temple.doctrine.blasphemyId, campaignDoctrines);
}

export function hostSummary(
  host: HierophantSupplicant["host"] | HierophantProphet["host"],
  temples: readonly HierophantTemple[],
  places: readonly NamedPlace[],
  denizens: readonly NamedDenizen[],
): string {
  if (host.kind === "cult") {
    return `Cult — ${denizenLabel(denizens, host.cultDenizenId)}`;
  }
  const temple = temples.find((t) => t.templeId === host.templeId);
  const name = temple === undefined ? host.templeId : templeDisplayName(temple, places);
  if ("area" in host) {
    if (host.area === null) return `${name} — area unresolved`;
    return `${name} — ${host.area === "courtyard" ? "Courtyard" : "Agiary"}`;
  }
  return name;
}

export function buildRemoveRolePayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly denizenId: string;
}): { readonly commandId: string; readonly expectedCampaignId: string; readonly denizenId: string } {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    denizenId: args.denizenId,
  };
}

export function buildAdjustTempleResourcesPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly templeId: string;
  readonly expectedAbundance: number;
  readonly abundance: number;
  readonly expectedConviction: number;
  readonly conviction: number;
}): {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly templeId: string;
  readonly fields: {
    readonly abundance?: { readonly expected: number; readonly value: number };
    readonly conviction?: { readonly expected: number; readonly value: number };
  };
} {
  const fields: {
    abundance?: { expected: number; value: number };
    conviction?: { expected: number; value: number };
  } = {};
  if (args.abundance !== args.expectedAbundance) {
    fields.abundance = { expected: args.expectedAbundance, value: args.abundance };
  }
  if (args.conviction !== args.expectedConviction) {
    fields.conviction = { expected: args.expectedConviction, value: args.conviction };
  }
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    templeId: args.templeId,
    fields,
  };
}

export function buildEstablishCultPayload(args: {
  readonly commandId: string;
  readonly expectedCampaignId: string;
  readonly cultDenizenId: string;
  readonly hostSeatId: string;
  readonly anchorPlaceId: string | null;
  readonly leaderDenizenId: string | null;
  readonly blasphemyId: string;
  readonly abundance: number;
  readonly conviction: number;
}) {
  return {
    commandId: args.commandId,
    expectedCampaignId: args.expectedCampaignId,
    cultDenizenId: args.cultDenizenId,
    hostSeatId: args.hostSeatId,
    anchorPlaceId: args.anchorPlaceId,
    leaderDenizenId: args.leaderDenizenId,
    blasphemyId: args.blasphemyId,
    abundance: args.abundance,
    conviction: args.conviction,
  };
}
