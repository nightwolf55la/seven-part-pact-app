import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api.js";
import {
  HIEROPHANT_BUILTIN_CLASS_DEFINITIONS,
  HIEROPHANT_BUILTIN_DOCTRINE_DEFINITIONS,
  HIEROPHANT_BUILTIN_DOGMA_DEFINITIONS,
  HIEROPHANT_DOGMA_CATEGORIES,
  HIEROPHANT_FLAME_LAW_DEFINITIONS,
  HIEROPHANT_STARTING_TEMPLE_IDS,
  PACT_SEAT_IDS,
  hierophantStartingTempleDisplayName,
  pactSeatDisplayName,
  type HierophantDogmaCategory,
  type HierophantBlasphemyId,
  type HierophantDoctrineId,
  type HierophantState,
  type HierophantTemple,
  type OrdinaryTempleDoctrineState,
  type PowerfulDenizenStatus,
  type HierophantProphetHost,
  type SorcererExternalPresence,
  powerfulStatusLabel,
} from "../shared/domain";
import type { WorldReference } from "./WorldSurface";
import LoreContextPanel from "./LoreContextPanel";
import { findPresentationSubjectByRef, type LoreCompendiumUiState } from "./lore-view-model";
import HierophantTempleBoard from "./HierophantTempleBoard";
import {
  availableCultCollectives,
  availableIndividualDenizens,
  availableProphetDenizens,
  blasphemyText,
  buildAdjustTempleResourcesPayload,
  buildEstablishCultPayload,
  buildInitializeHierophantPayload,
  buildRemoveRolePayload,
  buildSetSelectedFlameLawsPayload,
  buildTemplePlaceCreatePayload,
  classLabel,
  cultDogmaConvictionWarning,
  cultLeaderWarning,
  denizenLabel,
  dogmaDisplay,
  hierophantSetupReady,
  hostSeatLabel,
  hostSummary,
  hostedProphets,
  hostedSupplicants,
  isHierophantInitialized,
  lawsInCatalogOrder,
  newCampaignBlasphemyId,
  newCampaignClassId,
  newCampaignDoctrineId,
  newCampaignTempleId,
  newCommandId,
  newDenizenId,
  newDogmaEntryId,
  newPlaceId,
  placeLabel,
  researcherOperationalLabel,
  templeDisplayName,
  templeDoctrineSummary,
  templeEditCapabilities,
  hierophantDomainDisruptiveArcanists,
  unresolvedStartingTemples,
  TIME_RECORDING_BOUNDARY,
  SERMON_DEFER_GUIDANCE,
  STEER_DEFER_GUIDANCE,
  HOLIDAY_DEFER_GUIDANCE,
  HESTAR_PROVIDE_DEFER_GUIDANCE,
  buildCreateHierophantSupplicantPayload,
  type StartingTempleBindings,
} from "./hierophant-view-model";

type HierophantTab = "overview" | "temples" | "people" | "cults" | "definitions";

const TAB_LABELS: Record<HierophantTab, string> = {
  overview: "Overview / Laws",
  temples: "Temples",
  people: "Supplicants & Prophets",
  cults: "Cults",
  definitions: "Definitions / Reference",
};

const fieldClass =
  "text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 w-full text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-800";
const btnClass =
  "text-xs font-medium rounded-lg px-3 py-1.5 cursor-pointer bg-amber-800 dark:bg-amber-200 text-white dark:text-amber-950 hover:bg-amber-700 dark:hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
const ghostBtn =
  "text-xs font-medium rounded-lg px-3 py-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50";

function parseNonNegInt(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : null;
}

function prophetStatusValue(world: WorldReference, denizenId: string): "reliable" | "disruptive" | "" {
  const status = world.denizens.find((d) => d.denizenId === denizenId)?.powerfulProfile?.status;
  if (status?.kind === "standard" && (status.value === "reliable" || status.value === "disruptive")) {
    return status.value;
  }
  return "";
}

function prophetSharedStatusLabel(world: WorldReference, denizenId: string): string {
  const status = world.denizens.find((d) => d.denizenId === denizenId)?.powerfulProfile?.status;
  return status === undefined || status === null ? "Status unset" : powerfulStatusLabel(status);
}

function cultSharedStatusLabel(world: WorldReference, denizenId: string): string {
  return prophetSharedStatusLabel(world, denizenId);
}

function doctrineFromEditor(
  kind: "unset" | "doctrine" | "blasphemy",
  doctrineId: string,
  blasphemyId: string,
): OrdinaryTempleDoctrineState | null {
  if (kind === "unset") return { kind: "unset" };
  if (kind === "doctrine") {
    if (doctrineId === "") return null;
    return { kind: "doctrine", doctrineId: doctrineId as HierophantDoctrineId };
  }
  if (blasphemyId === "") return null;
  return { kind: "blasphemy", blasphemyId: blasphemyId as HierophantBlasphemyId };
}

export default function HierophantSurface({
  hierophant,
  world,
  campaignId,
  sorcererPresence = [],
  loreCompendium = { status: "unavailable" },
}: {
  hierophant: HierophantState;
  world: WorldReference;
  campaignId: string;
  sorcererPresence?: readonly SorcererExternalPresence[];
  loreCompendium?: LoreCompendiumUiState;
}) {
  const [tab, setTab] = useState<HierophantTab>("overview");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [setupLaws, setSetupLaws] = useState<string[]>([]);
  const [setupBindings, setSetupBindings] = useState<StartingTempleBindings>({});
  const [editor, setEditor] = useState<Record<string, unknown> | null>(null);
  const [selectedTempleId, setSelectedTempleId] = useState<string | null>(null);
  const [receiveDraft, setReceiveDraft] = useState<{
    commandId: string;
    denizenId: string;
    templeId: string;
    name: string;
    classId: string;
    woe: string;
    area: "" | "courtyard" | "agiary";
  } | null>(null);

  const initializeHierophant = useMutation(api.m3Commands.initializeHierophant);
  const createPlace = useMutation(api.m3Commands.createPlace);
  const setSelectedFlameLaws = useMutation(api.m3Commands.setSelectedFlameLaws);
  const adjustTempleResources = useMutation(api.m3Commands.adjustTempleResources);
  const createTemple = useMutation(api.m3Commands.createTemple);
  const updateTemple = useMutation(api.m3Commands.updateTemple);
  const setTempleHoliday = useMutation(api.m3Commands.setTempleHoliday);
  const createHierophantSupplicant = useMutation(api.m3Commands.createHierophantSupplicant);
  const addSupplicant = useMutation(api.m3Commands.addSupplicant);
  const updateSupplicant = useMutation(api.m3Commands.updateSupplicant);
  const removeSupplicant = useMutation(api.m3Commands.removeSupplicant);
  const addProphet = useMutation(api.m3Commands.addProphet);
  const updateProphet = useMutation(api.m3Commands.updateProphet);
  const removeProphet = useMutation(api.m3Commands.removeProphet);
  const setPowerfulDenizenStatus = useMutation(api.m3Commands.setPowerfulDenizenStatus);
  const establishCult = useMutation(api.m3Commands.establishCult);
  const updateCult = useMutation(api.m3Commands.updateCult);
  const removeCult = useMutation(api.m3Commands.removeCult);
  const addCultDogma = useMutation(api.m3Commands.addCultDogma);
  const updateCultDogma = useMutation(api.m3Commands.updateCultDogma);
  const removeCultDogma = useMutation(api.m3Commands.removeCultDogma);
  const createCampaignClass = useMutation(api.m3Commands.createCampaignClass);
  const updateCampaignClass = useMutation(api.m3Commands.updateCampaignClass);
  const createCampaignDoctrine = useMutation(api.m3Commands.createCampaignDoctrine);
  const updateCampaignDoctrine = useMutation(api.m3Commands.updateCampaignDoctrine);

  const initialized = isHierophantInitialized(hierophant);
  const usedSupplicantIds = hierophant.supplicants.map((s) => s.denizenId as string);
  const usedProphetIds = hierophant.prophets.map((p) => p.denizenId as string);
  const usedCultIds = hierophant.cults.map((c) => c.cultDenizenId as string);

  function closeEditor(): void {
    setEditor(null);
    setError(null);
  }

  async function run(action: () => Promise<void>): Promise<void> {
    setPending(true);
    setError(null);
    try {
      await action();
      closeEditor();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Mutation failed.";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  function openReceive(temple: HierophantTemple): void {
    setSelectedTempleId(temple.templeId);
    setReceiveDraft((current) => {
      if (current !== null && current.templeId === temple.templeId) return current;
      return {
        commandId: newCommandId(),
        denizenId: newDenizenId(),
        templeId: temple.templeId,
        name: "",
        classId: "peasant",
        woe: "0",
        area: temple.kind === "hestar" ? "" : "",
      };
    });
  }

  async function handleReceiveSupplicant(): Promise<void> {
    if (receiveDraft === null) return;
    const temple = hierophant.temples.find((candidate) => candidate.templeId === receiveDraft.templeId);
    if (temple === undefined) return;
    const woe = parseNonNegInt(receiveDraft.woe);
    if (woe === null) {
      setError("Woe must be a non-negative integer.");
      return;
    }
    const payload = buildCreateHierophantSupplicantPayload({
      commandId: receiveDraft.commandId,
      expectedCampaignId: campaignId,
      denizenId: receiveDraft.denizenId,
      name: receiveDraft.name,
      classId: receiveDraft.classId,
      woe,
      templeId: receiveDraft.templeId,
      area: temple.kind === "hestar" ? null : receiveDraft.area === "" ? null : receiveDraft.area,
      expectedTempleStatus: temple.status,
    });
    setPending(true);
    setError(null);
    try {
      await createHierophantSupplicant(payload);
      setReceiveDraft(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Mutation failed.";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  function toggleSetupLaw(id: string): void {
    setSetupLaws((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  async function handleCreateTemplePlace(templeId: (typeof HIEROPHANT_STARTING_TEMPLE_IDS)[number]): Promise<void> {
    const commandId = newCommandId();
    const placeId = newPlaceId();
    const payload = buildTemplePlaceCreatePayload({
      commandId,
      expectedCampaignId: campaignId,
      templeId,
      placeId,
    });
    await run(async () => {
      await createPlace(payload);
      setSetupBindings((current) => ({ ...current, [templeId]: placeId }));
    });
  }

  async function handleInitialize(): Promise<void> {
    const payload = buildInitializeHierophantPayload({
      commandId: newCommandId(),
      expectedCampaignId: campaignId,
      selectedLawIds: setupLaws,
      bindings: setupBindings,
    });
    if (payload === null) {
      setError("Choose exactly two Laws and bind all five starting Temples to Places.");
      return;
    }
    await run(async () => {
      await initializeHierophant(payload);
    });
  }

  async function handleSave(): Promise<void> {
    if (editor === null) return;
    const kind = editor.kind as string;
    const expectedCampaignId = campaignId;

    if (kind === "laws") {
      const payload = buildSetSelectedFlameLawsPayload({
        commandId: newCommandId(),
        expectedCampaignId,
        expectedSelectedFlameLawIds: editor.expectedLaws as string[],
        selectedLawIds: editor.selectedLaws as string[],
      });
      await run(async () => {
        await setSelectedFlameLaws(payload);
      });
      return;
    }

    if (kind === "temple-resources") {
      const abundance = parseNonNegInt(editor.abundance as string);
      const conviction = parseNonNegInt(editor.conviction as string);
      if (abundance === null || conviction === null) {
        setError("Abundance and Conviction must be non-negative integers.");
        return;
      }
      const payload = buildAdjustTempleResourcesPayload({
        commandId: newCommandId(),
        expectedCampaignId,
        templeId: editor.templeId as string,
        expectedAbundance: editor.expectedAbundance as number,
        abundance,
        expectedConviction: editor.expectedConviction as number,
        conviction,
      });
      if (Object.keys(payload.fields).length === 0) {
        closeEditor();
        return;
      }
      await run(async () => {
        await adjustTempleResources(payload);
      });
      return;
    }

    if (kind === "temple-edit") {
      const templeId = editor.templeId as string;
      const fields: Record<string, unknown> = {};
      if ((editor.placeId as string) !== (editor.expectedPlaceId as string)) {
        fields.placeId = { expected: editor.expectedPlaceId, value: editor.placeId };
      }
      if ((editor.hostSeatId as string) !== (editor.expectedHostSeatId as string)) {
        fields.hostSeatId = { expected: editor.expectedHostSeatId, value: editor.hostSeatId };
      }
      if ((editor.status as string) !== (editor.expectedStatus as string)) {
        fields.status = { expected: editor.expectedStatus, value: editor.status };
      }
      if (editor.canEditDoctrine) {
        const next = doctrineFromEditor(
          editor.doctrineKind as "unset" | "doctrine" | "blasphemy",
          editor.doctrineId as string,
          editor.blasphemyId as string,
        );
        if (next === null) {
          setError("Select a Doctrine or Blasphemy.");
          return;
        }
        if (JSON.stringify(next) !== JSON.stringify(editor.expectedDoctrine)) {
          fields.doctrine = { expected: editor.expectedDoctrine, value: next };
        }
      }
      if (Object.keys(fields).length === 0) {
        closeEditor();
        return;
      }
      await run(async () => {
        await updateTemple({ commandId: newCommandId(), expectedCampaignId, templeId, fields });
      });
      return;
    }

    if (kind === "temple-create") {
      const abundance = parseNonNegInt(editor.abundance as string);
      const conviction = parseNonNegInt(editor.conviction as string);
      if (abundance === null || conviction === null) {
        setError("Abundance and Conviction must be non-negative integers.");
        return;
      }
      if ((editor.placeId as string) === "") {
        setError("Choose a shared Place.");
        return;
      }
      const doctrine = doctrineFromEditor(
        editor.doctrineKind as "unset" | "doctrine" | "blasphemy",
        editor.doctrineId as string,
        editor.blasphemyId as string,
      );
      if (doctrine === null) {
        setError("Select a Doctrine or Blasphemy.");
        return;
      }
      await run(async () => {
        await createTemple({
          commandId: newCommandId(),
          expectedCampaignId,
          templeId: editor.templeId as string,
          placeId: editor.placeId as string,
          hostSeatId: editor.hostSeatId as string,
          abundance,
          conviction,
          status: editor.status as "active" | "collapsed",
          doctrine,
        });
      });
      return;
    }

    if (kind === "supplicant-add" || kind === "supplicant-edit") {
      const woe = parseNonNegInt(editor.woe as string);
      if (woe === null) {
        setError("Woe must be a non-negative integer.");
        return;
      }
      if ((editor.denizenId as string) === "") {
        setError("Choose an individual Denizen.");
        return;
      }
      const host =
        (editor.hostKind as string) === "temple"
          ? {
              kind: "temple" as const,
              templeId: editor.templeId as string,
              area: (editor.area as string) === "" ? null : (editor.area as "courtyard" | "agiary"),
            }
          : { kind: "cult" as const, cultDenizenId: editor.cultDenizenId as string };
      if (kind === "supplicant-add") {
        await run(async () => {
          await addSupplicant({
            commandId: newCommandId(),
            expectedCampaignId,
            denizenId: editor.denizenId as string,
            classId: editor.classId as string,
            woe,
            host,
          });
        });
        return;
      }
      const fields: Record<string, unknown> = {};
      if ((editor.classId as string) !== (editor.expectedClassId as string)) {
        fields.classId = { expected: editor.expectedClassId, value: editor.classId };
      }
      if (woe !== (editor.expectedWoe as number)) {
        fields.woe = { expected: editor.expectedWoe, value: woe };
      }
      fields.host = { expected: editor.expectedHost, value: host };
      await run(async () => {
        await updateSupplicant({
          commandId: newCommandId(),
          expectedCampaignId,
          denizenId: editor.denizenId as string,
          fields,
        });
      });
      return;
    }

    if (kind === "prophet-add" || kind === "prophet-edit") {
      if ((editor.denizenId as string) === "") {
        setError("Choose an individual Denizen.");
        return;
      }
      const host =
        (editor.hostKind as string) === "temple"
          ? { kind: "temple" as const, templeId: editor.templeId as string }
          : { kind: "cult" as const, cultDenizenId: editor.cultDenizenId as string };
      if (kind === "prophet-add") {
        await run(async () => {
          await addProphet({
            commandId: newCommandId(),
            expectedCampaignId,
            denizenId: editor.denizenId as string,
            host,
          });
        });
        return;
      }
      const currentStatus = world.denizens.find((d) => d.denizenId === editor.denizenId)?.powerfulProfile?.status ?? null;
      const nextStatusValue = editor.status as string;
      if (
        currentStatus !== null
        && (nextStatusValue === "reliable" || nextStatusValue === "disruptive")
        && (currentStatus.kind !== "standard" || currentStatus.value !== nextStatusValue)
      ) {
        await run(async () => {
          await setPowerfulDenizenStatus({
            commandId: newCommandId(),
            expectedCampaignId,
            denizenId: editor.denizenId as string,
            change: { expected: currentStatus, value: { kind: "standard", value: nextStatusValue } },
          });
        });
      }
      const expectedHost = editor.expectedHost as HierophantProphetHost;
      if (JSON.stringify(expectedHost) !== JSON.stringify(host)) {
        await run(async () => {
          await updateProphet({
            commandId: newCommandId(),
            expectedCampaignId,
            denizenId: editor.denizenId as string,
            fields: { host: { expected: expectedHost, value: host } },
          });
        });
      }
      return;
    }

    if (kind === "cult-establish") {
      if ((editor.cultDenizenId as string) === "") {
        setError("Create the Cult collective in World first.");
        return;
      }
      const abundance = parseNonNegInt(editor.abundance as string);
      const conviction = parseNonNegInt(editor.conviction as string);
      if (abundance === null || conviction === null) {
        setError("Abundance and Conviction must be non-negative integers.");
        return;
      }
      const payload = buildEstablishCultPayload({
        commandId: newCommandId(),
        expectedCampaignId,
        cultDenizenId: editor.cultDenizenId as string,
        hostSeatId: editor.hostSeatId as string,
        anchorPlaceId: (editor.placeId as string) === "" ? null : (editor.placeId as string),
        leaderDenizenId: (editor.leaderDenizenId as string) === "" ? null : (editor.leaderDenizenId as string),
        blasphemyId: editor.blasphemyId as string,
        abundance,
        conviction,
      });
      await run(async () => {
        await establishCult(payload);
      });
      return;
    }

    if (kind === "cult-edit") {
      const abundance = parseNonNegInt(editor.abundance as string);
      const conviction = parseNonNegInt(editor.conviction as string);
      if (abundance === null || conviction === null) {
        setError("Abundance and Conviction must be non-negative integers.");
        return;
      }
      const fields: Record<string, unknown> = {};
      if ((editor.hostSeatId as string) !== (editor.expectedHostSeatId as string)) {
        fields.hostSeatId = { expected: editor.expectedHostSeatId, value: editor.hostSeatId };
      }
      const nextAnchor = (editor.placeId as string) === "" ? null : (editor.placeId as string);
      if (nextAnchor !== (editor.expectedAnchor as string | null)) {
        fields.anchorPlaceId = { expected: editor.expectedAnchor, value: nextAnchor };
      }
      const nextLeader = (editor.leaderDenizenId as string) === "" ? null : (editor.leaderDenizenId as string);
      if (nextLeader !== (editor.expectedLeader as string | null)) {
        fields.leaderDenizenId = { expected: editor.expectedLeader, value: nextLeader };
      }
      if ((editor.blasphemyId as string) !== (editor.expectedBlasphemyId as string)) {
        fields.blasphemyId = { expected: editor.expectedBlasphemyId, value: editor.blasphemyId };
      }
      if (abundance !== (editor.expectedAbundance as number)) {
        fields.abundance = { expected: editor.expectedAbundance, value: abundance };
      }
      if (conviction !== (editor.expectedConviction as number)) {
        fields.conviction = { expected: editor.expectedConviction, value: conviction };
      }
      if (Object.keys(fields).length === 0) {
        closeEditor();
        return;
      }
      await run(async () => {
        await updateCult({
          commandId: newCommandId(),
          expectedCampaignId,
          cultDenizenId: editor.cultDenizenId as string,
          fields,
        });
      });
      return;
    }

    if (kind === "dogma-add") {
      const dogma =
        (editor.dogmaKind as string) === "builtin"
          ? {
              dogmaEntryId: newDogmaEntryId(),
              kind: "builtin" as const,
              dogmaId: editor.dogmaId as string,
            }
          : {
              dogmaEntryId: newDogmaEntryId(),
              kind: "custom" as const,
              category: editor.dogmaCategory as HierophantDogmaCategory,
              text: editor.dogmaText as string,
            };
      await run(async () => {
        await addCultDogma({
          commandId: newCommandId(),
          expectedCampaignId,
          cultDenizenId: editor.cultDenizenId as string,
          dogma,
        });
      });
      return;
    }

    if (kind === "dogma-edit") {
      const fields: Record<string, unknown> = {};
      if ((editor.dogmaCategory as string) !== (editor.expectedDogmaCategory as string)) {
        fields.category = { expected: editor.expectedDogmaCategory, value: editor.dogmaCategory };
      }
      if ((editor.dogmaText as string) !== (editor.expectedDogmaText as string)) {
        fields.text = { expected: editor.expectedDogmaText, value: editor.dogmaText };
      }
      if (Object.keys(fields).length === 0) {
        closeEditor();
        return;
      }
      await run(async () => {
        await updateCultDogma({
          commandId: newCommandId(),
          expectedCampaignId,
          cultDenizenId: editor.cultDenizenId as string,
          dogmaEntryId: editor.dogmaEntryId as string,
          fields,
        });
      });
      return;
    }

    if (kind === "class-create") {
      await run(async () => {
        await createCampaignClass({
          commandId: newCommandId(),
          expectedCampaignId,
          classId: editor.classId as string,
          name: editor.name as string,
        });
      });
      return;
    }

    if (kind === "class-edit") {
      await run(async () => {
        await updateCampaignClass({
          commandId: newCommandId(),
          expectedCampaignId,
          classId: editor.classId as string,
          name: { expected: editor.expectedName as string, value: editor.name as string },
        });
      });
      return;
    }

    if (kind === "doctrine-create") {
      const orthodox = (editor.orthodoxText as string).trim() === "" ? null : (editor.orthodoxText as string);
      const blasphemy = editor.includeBlasphemy
        ? { blasphemyId: newCampaignBlasphemyId(), text: editor.blasphemyText as string }
        : null;
      await run(async () => {
        await createCampaignDoctrine({
          commandId: newCommandId(),
          expectedCampaignId,
          doctrineId: editor.doctrineId as string,
          orthodoxText: orthodox,
          blasphemy,
          supportedClassIds: editor.supportedClassIds as string[],
        });
      });
      return;
    }

    if (kind === "doctrine-edit") {
      const orthodox = (editor.orthodoxText as string).trim() === "" ? null : (editor.orthodoxText as string);
      const nextBlasphemy = editor.includeBlasphemy
        ? {
            blasphemyId: (editor.blasphemyRecordId as string) === ""
              ? newCampaignBlasphemyId()
              : (editor.blasphemyRecordId as string),
            text: editor.blasphemyText as string,
          }
        : null;
      const fields = {
        orthodoxText: { expected: editor.expectedOrthodox as string | null, value: orthodox },
        blasphemy: { expected: editor.expectedBlasphemy as { blasphemyId: string; text: string } | null, value: nextBlasphemy },
        supportedClassIds: { expected: editor.expectedSupported as string[], value: editor.supportedClassIds as string[] },
      };
      await run(async () => {
        await updateCampaignDoctrine({
          commandId: newCommandId(),
          expectedCampaignId,
          doctrineId: editor.doctrineId as string,
          fields,
        });
      });
    }
  }

  function doctrineOptions() {
    return [
      ...HIEROPHANT_BUILTIN_DOCTRINE_DEFINITIONS.map((d) => ({ id: d.id, label: d.text })),
      ...hierophant.campaignDoctrines.map((d) => ({
        id: d.doctrineId as string,
        label: d.orthodoxText ?? "Campaign Doctrine",
      })),
    ];
  }

  function blasphemyOptions() {
    return [
      ...HIEROPHANT_BUILTIN_DOCTRINE_DEFINITIONS.map((d) => ({
        id: d.pairedBlasphemy.id,
        label: d.pairedBlasphemy.text,
      })),
      ...hierophant.campaignDoctrines.flatMap((d) =>
        d.blasphemy === null
          ? []
          : [{ id: d.blasphemy.blasphemyId as string, label: d.blasphemy.text }],
      ),
    ];
  }

  function classOptions() {
    return [
      ...HIEROPHANT_BUILTIN_CLASS_DEFINITIONS.map((c) => ({ id: c.id, label: c.name })),
      ...hierophant.campaignClasses.map((c) => ({ id: c.classId as string, label: c.name })),
    ];
  }

  const unusedCollectives = availableCultCollectives(world.denizens, usedCultIds);

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-amber-200/70 dark:border-amber-900/40 shadow-sm p-6">
      <h2 className="text-xl font-bold text-amber-950 dark:text-amber-100 mb-4">Hierophant</h2>

      {!initialized ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Bind the five starting Temples to shared World Places that represent the Temples themselves, and choose exactly two Laws of the Flame.
          </p>
          <div>
            <h3 className="text-sm font-semibold mb-2">Laws of the Flame</h3>
            <div className="flex flex-col gap-2">
              {HIEROPHANT_FLAME_LAW_DEFINITIONS.map((law) => (
                <label key={law.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={setupLaws.includes(law.id)}
                    onChange={() => toggleSetupLaw(law.id)}
                  />
                  <span>
                    <span className="font-medium">{law.applicationLabel}.</span> {law.text}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Selected {lawsInCatalogOrder(setupLaws).length}; initialization requires exactly two.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Starting Temples</h3>
            {unresolvedStartingTemples(setupBindings).length > 0 && (
              <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">
                Unresolved Places: {unresolvedStartingTemples(setupBindings).map(hierophantStartingTempleDisplayName).join(", ")}
              </p>
            )}
            <div className="flex flex-col gap-3">
              {HIEROPHANT_STARTING_TEMPLE_IDS.map((templeId) => (
                <div key={templeId} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <div className="text-sm font-medium mb-2">{hierophantStartingTempleDisplayName(templeId)}</div>
                  <select
                    className={fieldClass}
                    value={setupBindings[templeId] ?? ""}
                    onChange={(e) => setSetupBindings((current) => ({ ...current, [templeId]: e.target.value }))}
                  >
                    <option value="">— Select existing Place —</option>
                    {world.places.map((p) => (
                      <option key={p.placeId} value={p.placeId}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={`${ghostBtn} mt-2`}
                    disabled={pending}
                    onClick={() => void handleCreateTemplePlace(templeId)}
                  >
                    Create Temple Place
                  </button>
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            className={btnClass}
            disabled={pending || !hierophantSetupReady(setupLaws, setupBindings)}
            onClick={() => void handleInitialize()}
          >
            Initialize Hierophant
          </button>
        </div>
      ) : (
        <>
          <HierophantTempleBoard
            hierophant={hierophant}
            denizens={world.denizens}
            places={world.places}
            presence={sorcererPresence}
            selectedTempleId={selectedTempleId ?? hierophant.temples[0]?.templeId ?? null}
            onSelectTemple={(templeId) => {
              setSelectedTempleId(templeId);
              const temple = hierophant.temples.find((candidate) => candidate.templeId === templeId);
              if (temple !== undefined) openReceive(temple);
            }}
          />
          {(() => {
            const selected = hierophant.temples.find((temple) => temple.templeId === (selectedTempleId ?? hierophant.temples[0]?.templeId));
            if (selected === undefined) return null;
            const loreSubject = loreCompendium.status === "ready"
              ? findPresentationSubjectByRef(loreCompendium.presentation, { kind: "hierophant_temple", templeId: selected.templeId })
              : undefined;
            const caps = templeEditCapabilities(selected);
            const receiveOpen = receiveDraft !== null && receiveDraft.templeId === selected.templeId;
            return (
              <aside aria-label="Selected Temple" className="mt-4 rounded-xl border border-amber-200 dark:border-amber-900 p-4 space-y-3">
                <h3 className="text-sm font-semibold">{templeDisplayName(selected, world.places)}</h3>
                <p className="text-xs text-slate-500">{TIME_RECORDING_BOUNDARY}</p>
                {selected.status === "active" && !receiveOpen && (
                  <button type="button" className={btnClass} onClick={() => openReceive(selected)}>
                    Receive Supplicant
                  </button>
                )}
                {selected.status === "active" && receiveOpen && (
                  <form
                    className="space-y-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleReceiveSupplicant();
                    }}
                  >
                    <h4 className="text-sm font-medium">Receive Supplicant</h4>
                    <label className="block text-xs">
                      Name
                      <input
                        className={fieldClass}
                        value={receiveDraft.name}
                        disabled={pending}
                        onChange={(event) => setReceiveDraft({ ...receiveDraft, name: event.target.value })}
                      />
                    </label>
                    <label className="block text-xs">
                      Class
                      <select
                        className={fieldClass}
                        value={receiveDraft.classId}
                        disabled={pending}
                        onChange={(event) => setReceiveDraft({ ...receiveDraft, classId: event.target.value })}
                      >
                        {classOptions().map((option) => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs">
                      Woe
                      <input
                        className={fieldClass}
                        value={receiveDraft.woe}
                        disabled={pending}
                        onChange={(event) => setReceiveDraft({ ...receiveDraft, woe: event.target.value })}
                      />
                    </label>
                    {!caps.isHestar && (
                      <label className="block text-xs">
                        Area
                        <select
                          className={fieldClass}
                          value={receiveDraft.area}
                          disabled={pending}
                          onChange={(event) => setReceiveDraft({ ...receiveDraft, area: event.target.value as "" | "courtyard" | "agiary" })}
                        >
                          <option value="">Unresolved</option>
                          <option value="courtyard">Courtyard</option>
                          <option value="agiary">Agiary</option>
                        </select>
                      </label>
                    )}
                    <button type="submit" className={btnClass} disabled={pending}>
                      Receive Supplicant
                    </button>
                  </form>
                )}
                {selected.status !== "active" && (
                  <p className="text-sm">Receive Supplicant is not available at a collapsed Temple. Use Advanced correction if the table records an unusual placement.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={ghostBtn}
                    disabled={pending}
                    onClick={() => void run(async () => {
                      await setTempleHoliday({
                        commandId: newCommandId(),
                        expectedCampaignId: campaignId,
                        templeId: selected.templeId,
                        marked: !hierophant.holidayTempleIds.includes(selected.templeId),
                      });
                    })}
                  >
                    {hierophant.holidayTempleIds.includes(selected.templeId) ? "Clear Holiday marker (recording)" : "Mark Holiday (recording)"}
                  </button>
                  <button
                    type="button"
                    className={ghostBtn}
                    onClick={() => setEditor({
                      kind: "temple-resources",
                      templeId: selected.templeId,
                      expectedAbundance: selected.abundance,
                      expectedConviction: selected.conviction,
                      abundance: String(selected.abundance),
                      conviction: String(selected.conviction),
                    })}
                  >
                    Record Abundance / Conviction
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{HOLIDAY_DEFER_GUIDANCE}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{SERMON_DEFER_GUIDANCE}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{STEER_DEFER_GUIDANCE}</p>
                {caps.isHestar && <p className="text-xs text-slate-600 dark:text-slate-300">{HESTAR_PROVIDE_DEFER_GUIDANCE}</p>}
                {loreSubject !== undefined && (
                  <LoreContextPanel subject={loreSubject} campaignId={campaignId} compact contextConstraint={{ kind: "any" }} />
                )}
              </aside>
            );
          })()}
          {hierophantDomainDisruptiveArcanists(sorcererPresence).length > 0 && (
            <section aria-label="In this Domain" className="mt-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-3">
              <h3 className="text-sm font-semibold">In this Domain</h3>
              <ul className="text-sm mt-2 space-y-1">
                {hierophantDomainDisruptiveArcanists(sorcererPresence).map((arcanist) => (
                  <li key={arcanist.denizenId}>
                    {arcanist.name} · Disruptive Arcanist · {arcanist.school.kind === "source" ? arcanist.school.schoolId : arcanist.school.schoolId}
                    <span className="block text-xs text-slate-500">{researcherOperationalLabel(true).replace("Working this month", "Domain presence; seat is not a Temple sublocation")}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <details className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <summary className="cursor-pointer text-sm font-medium">Advanced / Correct Board</summary>
            <p className="text-xs text-slate-500 mt-2 mb-3">Exact Doctrine, status, host, existing-person attachment, Cults, campaign definitions, and unusual state.</p>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {(Object.keys(TAB_LABELS) as HierophantTab[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => { setTab(id); closeEditor(); }}
                className={`text-xs font-medium rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                  tab === id
                    ? "bg-amber-900 dark:bg-amber-100 text-white dark:text-amber-950"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {TAB_LABELS[id]}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Selected Laws of the Flame</h3>
                <button
                  type="button"
                  className={ghostBtn}
                  onClick={() => setEditor({
                    kind: "laws",
                    expectedLaws: [...hierophant.selectedFlameLawIds],
                    selectedLaws: [...hierophant.selectedFlameLawIds],
                  })}
                >
                  Edit selection
                </button>
              </div>
              {hierophant.selectedFlameLawIds.length === 0 ? (
                <p className="text-sm text-slate-500">No Laws selected.</p>
              ) : (
                lawsInCatalogOrder(hierophant.selectedFlameLawIds).map((id) => {
                  const def = HIEROPHANT_FLAME_LAW_DEFINITIONS.find((l) => l.id === id)!;
                  return (
                    <div key={id} className="text-sm">
                      <div className="font-medium">{def.applicationLabel}</div>
                      <div className="text-slate-600 dark:text-slate-300">{def.text}</div>
                    </div>
                  );
                })
              )}
              {editor?.kind === "laws" && (
                <div className="rounded-lg border border-slate-300 dark:border-slate-600 p-4 bg-slate-50 dark:bg-slate-800">
                  {HIEROPHANT_FLAME_LAW_DEFINITIONS.map((law) => (
                    <label key={law.id} className="flex items-start gap-2 text-sm mb-2">
                      <input
                        type="checkbox"
                        checked={(editor.selectedLaws as string[]).includes(law.id)}
                        onChange={() => {
                          const selected = new Set(editor.selectedLaws as string[]);
                          if (selected.has(law.id)) selected.delete(law.id);
                          else selected.add(law.id);
                          setEditor({ ...editor, selectedLaws: [...selected] });
                        }}
                      />
                      <span><span className="font-medium">{law.applicationLabel}.</span> {law.text}</span>
                    </label>
                  ))}
                  <p className="text-xs text-slate-500 mb-2">Any number of unique Laws may be selected after setup.</p>
                  <div className="flex gap-2">
                    <button type="button" className={btnClass} disabled={pending} onClick={() => void handleSave()}>Save</button>
                    <button type="button" className={ghostBtn} onClick={closeEditor}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "temples" && (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                className={btnClass}
                onClick={() => setEditor({
                  kind: "temple-create",
                  templeId: newCampaignTempleId(),
                  placeId: "",
                  hostSeatId: "hierophant",
                  abundance: "0",
                  conviction: "0",
                  status: "active",
                  doctrineKind: "unset",
                  doctrineId: "",
                  blasphemyId: "",
                })}
              >
                Add Temple
              </button>
              {hierophant.temples.map((temple) => (
                <TempleCard
                  key={temple.templeId}
                  temple={temple}
                  hierophant={hierophant}
                  world={world}
                  holiday={hierophant.holidayTempleIds.includes(temple.templeId)}
                  pending={pending}
                  onResources={() => setEditor({
                    kind: "temple-resources",
                    templeId: temple.templeId,
                    expectedAbundance: temple.abundance,
                    expectedConviction: temple.conviction,
                    abundance: String(temple.abundance),
                    conviction: String(temple.conviction),
                  })}
                  onEdit={() => setEditor({
                    kind: "temple-edit",
                    templeId: temple.templeId,
                    expectedPlaceId: temple.placeId,
                    placeId: temple.placeId,
                    expectedHostSeatId: temple.hostSeatId,
                    hostSeatId: temple.hostSeatId,
                    expectedStatus: temple.status,
                    status: temple.status,
                    canEditDoctrine: templeEditCapabilities(temple).canEditDoctrine,
                    expectedDoctrine: temple.kind === "ordinary" ? temple.doctrine : null,
                    doctrineKind: temple.kind === "ordinary" ? temple.doctrine.kind : "unset",
                    doctrineId: temple.kind === "ordinary" && temple.doctrine.kind === "doctrine" ? temple.doctrine.doctrineId : "",
                    blasphemyId: temple.kind === "ordinary" && temple.doctrine.kind === "blasphemy" ? temple.doctrine.blasphemyId : "",
                  })}
                  onHoliday={() => void run(async () => {
                    await setTempleHoliday({
                      commandId: newCommandId(),
                      expectedCampaignId: campaignId,
                      templeId: temple.templeId,
                      marked: !hierophant.holidayTempleIds.includes(temple.templeId),
                    });
                  })}
                />
              ))}
            </div>
          )}

          {tab === "people" && (
            <PeopleSection
              hierophant={hierophant}
              world={world}
              pending={pending}
              onAddSupplicant={() => setEditor({
                kind: "supplicant-add",
                denizenId: "",
                classId: "peasant",
                woe: "0",
                hostKind: "temple",
                templeId: hierophant.temples[0]?.templeId ?? "",
                area: "",
                cultDenizenId: hierophant.cults[0]?.cultDenizenId ?? "",
              })}
              onEditSupplicant={(s) => setEditor({
                kind: "supplicant-edit",
                denizenId: s.denizenId,
                classId: s.classId,
                expectedClassId: s.classId,
                woe: String(s.woe),
                expectedWoe: s.woe,
                hostKind: s.host.kind,
                expectedHost: s.host,
                templeId: s.host.kind === "temple" ? s.host.templeId : hierophant.temples[0]?.templeId ?? "",
                area: s.host.kind === "temple" && s.host.area !== null ? s.host.area : "",
                cultDenizenId: s.host.kind === "cult" ? s.host.cultDenizenId : hierophant.cults[0]?.cultDenizenId ?? "",
              })}
              onRemoveSupplicant={(denizenId) => void run(async () => {
                await removeSupplicant(buildRemoveRolePayload({
                  commandId: newCommandId(),
                  expectedCampaignId: campaignId,
                  denizenId,
                }));
              })}
              onAddProphet={() => setEditor({
                kind: "prophet-add",
                denizenId: "",
                hostKind: "temple",
                templeId: hierophant.temples[0]?.templeId ?? "",
                cultDenizenId: hierophant.cults[0]?.cultDenizenId ?? "",
              })}
              onEditProphet={(p) => setEditor({
                kind: "prophet-edit",
                denizenId: p.denizenId,
                status: prophetStatusValue(world, p.denizenId),
                hostKind: p.host.kind,
                expectedHost: p.host,
                templeId: p.host.kind === "temple" ? p.host.templeId : hierophant.temples[0]?.templeId ?? "",
                cultDenizenId: p.host.kind === "cult" ? p.host.cultDenizenId : hierophant.cults[0]?.cultDenizenId ?? "",
              })}
              onRemoveProphet={(denizenId) => void run(async () => {
                await removeProphet(buildRemoveRolePayload({
                  commandId: newCommandId(),
                  expectedCampaignId: campaignId,
                  denizenId,
                }));
              })}
            />
          )}

          {tab === "cults" && (
            <div className="flex flex-col gap-3">
              {unusedCollectives.length === 0 ? (
                <p className="text-sm text-amber-800 dark:text-amber-200">Create a collective Denizen in World and give it a Cult Powerful profile with an explicit Status first.</p>
              ) : (
                <button
                  type="button"
                  className={btnClass}
                  onClick={() => setEditor({
                    kind: "cult-establish",
                    cultDenizenId: unusedCollectives[0]!.denizenId,
                    hostSeatId: "hierophant",
                    placeId: "",
                    leaderDenizenId: "",
                    blasphemyId: HIEROPHANT_BUILTIN_DOCTRINE_DEFINITIONS[0]!.pairedBlasphemy.id,
                    abundance: "0",
                    conviction: "0",
                  })}
                >
                  Establish Cult
                </button>
              )}
              {hierophant.cults.map((cult) => {
                const leaderWarn = cultLeaderWarning(cult.leaderDenizenId);
                const dogmaWarn = cultDogmaConvictionWarning(cult.dogmas.length, cult.conviction);
                return (
                  <div key={cult.cultDenizenId} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                    <div className="font-semibold">{denizenLabel(world.denizens, cult.cultDenizenId)}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Host {hostSeatLabel(cult.hostSeatId)} · Anchor {placeLabel(world.places, cult.anchorPlaceId)} · A {cult.abundance} / C {cult.conviction}
                    </div>
                    <div className="text-xs text-slate-500">
                      Shared Status: {cultSharedStatusLabel(world, cult.cultDenizenId)}
                    </div>
                    <div className="text-sm mt-1">Leader: {cult.leaderDenizenId === null ? "Leader unresolved" : denizenLabel(world.denizens, cult.leaderDenizenId)}</div>
                    {leaderWarn !== null && <div className="text-xs text-amber-800 dark:text-amber-200 mt-1">{leaderWarn}</div>}
                    {dogmaWarn !== null && <div className="text-xs text-amber-800 dark:text-amber-200">{dogmaWarn}</div>}
                    <div className="text-sm mt-2">{blasphemyText(cult.blasphemyId, hierophant.campaignDoctrines)}</div>
                    <div className="text-xs text-slate-500 mt-2">
                      Hosted Supplicants: {hostedSupplicants(hierophant.supplicants, { kind: "cult", cultDenizenId: cult.cultDenizenId }).map((s) => denizenLabel(world.denizens, s.denizenId)).join(", ") || "none"}
                    </div>
                    <div className="text-xs text-slate-500">
                      Hosted Prophets: {hostedProphets(hierophant.prophets, { kind: "cult", cultDenizenId: cult.cultDenizenId }).map((p) => denizenLabel(world.denizens, p.denizenId)).join(", ") || "none"}
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-semibold mb-1">Dogmas</div>
                      {cult.dogmas.map((dogma) => {
                        const display = dogmaDisplay(dogma);
                        return (
                          <div key={dogma.dogmaEntryId} className="text-sm mb-1">
                            <span className="uppercase text-xs text-slate-400">{display.category}</span> {display.text}
                            {dogma.kind === "custom" && (
                              <button
                                type="button"
                                className="ml-2 text-xs underline"
                                onClick={() => setEditor({
                                  kind: "dogma-edit",
                                  cultDenizenId: cult.cultDenizenId,
                                  dogmaEntryId: dogma.dogmaEntryId,
                                  dogmaCategory: dogma.category,
                                  expectedDogmaCategory: dogma.category,
                                  dogmaText: dogma.text,
                                  expectedDogmaText: dogma.text,
                                })}
                              >
                                Edit
                              </button>
                            )}
                            <button
                              type="button"
                              className="ml-2 text-xs underline"
                              disabled={pending}
                              onClick={() => void run(async () => {
                                await removeCultDogma({
                                  commandId: newCommandId(),
                                  expectedCampaignId: campaignId,
                                  cultDenizenId: cult.cultDenizenId,
                                  dogmaEntryId: dogma.dogmaEntryId,
                                });
                              })}
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button type="button" className={ghostBtn} onClick={() => setEditor({
                        kind: "cult-edit",
                        cultDenizenId: cult.cultDenizenId,
                        hostSeatId: cult.hostSeatId,
                        expectedHostSeatId: cult.hostSeatId,
                        placeId: cult.anchorPlaceId ?? "",
                        expectedAnchor: cult.anchorPlaceId,
                        leaderDenizenId: cult.leaderDenizenId ?? "",
                        expectedLeader: cult.leaderDenizenId,
                        blasphemyId: cult.blasphemyId,
                        expectedBlasphemyId: cult.blasphemyId,
                        abundance: String(cult.abundance),
                        expectedAbundance: cult.abundance,
                        conviction: String(cult.conviction),
                        expectedConviction: cult.conviction,
                      })}>Edit Cult</button>
                      <button type="button" className={ghostBtn} onClick={() => setEditor({
                        kind: "dogma-add",
                        cultDenizenId: cult.cultDenizenId,
                        dogmaKind: "builtin",
                        dogmaId: HIEROPHANT_BUILTIN_DOGMA_DEFINITIONS[0]!.id,
                        dogmaCategory: "custom",
                        dogmaText: "",
                      })}>Add Dogma</button>
                      <button
                        type="button"
                        className={ghostBtn}
                        disabled={pending}
                        onClick={() => void run(async () => {
                          await removeCult({
                            commandId: newCommandId(),
                            expectedCampaignId: campaignId,
                            cultDenizenId: cult.cultDenizenId,
                          });
                        })}
                      >
                        Remove Cult
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "definitions" && (
            <DefinitionsSection
              hierophant={hierophant}
              onCreateClass={() => setEditor({ kind: "class-create", classId: newCampaignClassId(), name: "" })}
              onEditClass={(classId, name) => setEditor({ kind: "class-edit", classId, expectedName: name, name })}
              onCreateDoctrine={() => setEditor({
                kind: "doctrine-create",
                doctrineId: newCampaignDoctrineId(),
                orthodoxText: "",
                includeBlasphemy: false,
                blasphemyText: "",
                supportedClassIds: [],
              })}
              onEditDoctrine={(d) => setEditor({
                kind: "doctrine-edit",
                doctrineId: d.doctrineId,
                orthodoxText: d.orthodoxText ?? "",
                expectedOrthodox: d.orthodoxText,
                includeBlasphemy: d.blasphemy !== null,
                blasphemyText: d.blasphemy?.text ?? "",
                blasphemyRecordId: d.blasphemy?.blasphemyId ?? "",
                expectedBlasphemy: d.blasphemy,
                supportedClassIds: [...d.supportedClassIds],
                expectedSupported: [...d.supportedClassIds],
              })}
            />
          )}

          </details>

          {editor !== null && editor.kind !== "laws" && (
            <div className="rounded-lg border border-slate-300 dark:border-slate-600 p-4 mt-4 bg-slate-50 dark:bg-slate-800">
              {editor.kind === "temple-resources" && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs">Abundance<input className={fieldClass} value={editor.abundance as string} onChange={(e) => setEditor({ ...editor, abundance: e.target.value })} /></label>
                  <label className="text-xs">Conviction<input className={fieldClass} value={editor.conviction as string} onChange={(e) => setEditor({ ...editor, conviction: e.target.value })} /></label>
                </div>
              )}
              {(editor.kind === "temple-edit" || editor.kind === "temple-create") && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs">Place
                    <select className={fieldClass} value={editor.placeId as string} onChange={(e) => setEditor({ ...editor, placeId: e.target.value })}>
                      <option value="">— Select —</option>
                      {world.places.map((p) => <option key={p.placeId} value={p.placeId}>{p.name}</option>)}
                    </select>
                  </label>
                  <label className="text-xs">Host seat
                    <select className={fieldClass} value={editor.hostSeatId as string} onChange={(e) => setEditor({ ...editor, hostSeatId: e.target.value })}>
                      {PACT_SEAT_IDS.map((id) => <option key={id} value={id}>{pactSeatDisplayName(id)}</option>)}
                    </select>
                  </label>
                  <label className="text-xs">Status
                    <select className={fieldClass} value={editor.status as string} onChange={(e) => setEditor({ ...editor, status: e.target.value })}>
                      <option value="active">Active</option>
                      <option value="collapsed">Collapsed</option>
                    </select>
                  </label>
                  {editor.kind === "temple-create" && (
                    <>
                      <label className="text-xs">Abundance<input className={fieldClass} value={editor.abundance as string} onChange={(e) => setEditor({ ...editor, abundance: e.target.value })} /></label>
                      <label className="text-xs">Conviction<input className={fieldClass} value={editor.conviction as string} onChange={(e) => setEditor({ ...editor, conviction: e.target.value })} /></label>
                    </>
                  )}
                  {(editor.kind === "temple-create" || editor.canEditDoctrine === true) && (
                    <>
                      <label className="text-xs">Doctrine state
                        <select className={fieldClass} value={editor.doctrineKind as string} onChange={(e) => setEditor({ ...editor, doctrineKind: e.target.value })}>
                          <option value="unset">Unset</option>
                          <option value="doctrine">Doctrine</option>
                          <option value="blasphemy">Blasphemy</option>
                        </select>
                      </label>
                      {editor.doctrineKind === "doctrine" && (
                        <select className={fieldClass} value={editor.doctrineId as string} onChange={(e) => setEditor({ ...editor, doctrineId: e.target.value })}>
                          <option value="">— Select Doctrine —</option>
                          {doctrineOptions().map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                      )}
                      {editor.doctrineKind === "blasphemy" && (
                        <select className={fieldClass} value={editor.blasphemyId as string} onChange={(e) => setEditor({ ...editor, blasphemyId: e.target.value })}>
                          <option value="">— Select Blasphemy —</option>
                          {blasphemyOptions().map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                      )}
                    </>
                  )}
                </div>
              )}
              {(editor.kind === "supplicant-add" || editor.kind === "supplicant-edit") && (
                <div className="flex flex-col gap-2">
                  {editor.kind === "supplicant-add" && (
                    <label className="text-xs">Denizen
                      <select className={fieldClass} value={editor.denizenId as string} onChange={(e) => setEditor({ ...editor, denizenId: e.target.value })}>
                        <option value="">— Individual Denizen —</option>
                        {availableIndividualDenizens(world.denizens, usedSupplicantIds).map((d) => (
                          <option key={d.denizenId} value={d.denizenId}>{d.name}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="text-xs">Class
                    <select className={fieldClass} value={editor.classId as string} onChange={(e) => setEditor({ ...editor, classId: e.target.value })}>
                      {classOptions().map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </label>
                  <label className="text-xs">Woe<input className={fieldClass} value={editor.woe as string} onChange={(e) => setEditor({ ...editor, woe: e.target.value })} /></label>
                  <HostFields editor={editor} setEditor={setEditor} hierophant={hierophant} includeArea />
                </div>
              )}
              {(editor.kind === "prophet-add" || editor.kind === "prophet-edit") && (
                <div className="flex flex-col gap-2">
                  {editor.kind === "prophet-add" && (
                    <label className="text-xs">Denizen
                      <select className={fieldClass} value={editor.denizenId as string} onChange={(e) => setEditor({ ...editor, denizenId: e.target.value })}>
                        <option value="">— Individual Denizen —</option>
                        {availableProphetDenizens(world.denizens, usedProphetIds).map((d) => (
                          <option key={d.denizenId} value={d.denizenId}>{d.name}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  {editor.kind === "prophet-add" && availableProphetDenizens(world.denizens, usedProphetIds).length === 0 && (
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Configure a shared Powerful profile with Prophet taxonomy and Reliable or Disruptive Status in World first.
                    </p>
                  )}
                  {editor.kind === "prophet-edit" && (
                    <label className="text-xs">Shared Status
                      <select className={fieldClass} value={editor.status as string} onChange={(e) => setEditor({ ...editor, status: e.target.value })}>
                        <option value="reliable">Reliable</option>
                        <option value="disruptive">Disruptive</option>
                      </select>
                    </label>
                  )}
                  <HostFields editor={editor} setEditor={setEditor} hierophant={hierophant} includeArea={false} />
                </div>
              )}
              {(editor.kind === "cult-establish" || editor.kind === "cult-edit") && (
                <div className="flex flex-col gap-2">
                  {editor.kind === "cult-establish" && (
                    unusedCollectives.length === 0 ? (
                      <p className="text-sm">Create a collective Denizen in World and give it a Cult Powerful profile with an explicit Status first.</p>
                    ) : (
                      <label className="text-xs">Collective Denizen
                        <select className={fieldClass} value={editor.cultDenizenId as string} onChange={(e) => setEditor({ ...editor, cultDenizenId: e.target.value })}>
                          {unusedCollectives.map((d) => <option key={d.denizenId} value={d.denizenId}>{d.name}</option>)}
                        </select>
                      </label>
                    )
                  )}
                  <label className="text-xs">Host seat
                    <select className={fieldClass} value={editor.hostSeatId as string} onChange={(e) => setEditor({ ...editor, hostSeatId: e.target.value })}>
                      {PACT_SEAT_IDS.map((id) => <option key={id} value={id}>{pactSeatDisplayName(id)}</option>)}
                    </select>
                  </label>
                  <label className="text-xs">Anchor Place
                    <select className={fieldClass} value={editor.placeId as string} onChange={(e) => setEditor({ ...editor, placeId: e.target.value })}>
                      <option value="">None</option>
                      {world.places.map((p) => <option key={p.placeId} value={p.placeId}>{p.name}</option>)}
                    </select>
                  </label>
                  <label className="text-xs">Leader
                    <select className={fieldClass} value={editor.leaderDenizenId as string} onChange={(e) => setEditor({ ...editor, leaderDenizenId: e.target.value })}>
                      <option value="">Unresolved</option>
                      {availableIndividualDenizens(world.denizens, []).map((d) => <option key={d.denizenId} value={d.denizenId}>{d.name}</option>)}
                    </select>
                  </label>
                  <label className="text-xs">Blasphemy
                    <select className={fieldClass} value={editor.blasphemyId as string} onChange={(e) => setEditor({ ...editor, blasphemyId: e.target.value })}>
                      {blasphemyOptions().map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </label>
                  <label className="text-xs">Abundance<input className={fieldClass} value={editor.abundance as string} onChange={(e) => setEditor({ ...editor, abundance: e.target.value })} /></label>
                  <label className="text-xs">Conviction<input className={fieldClass} value={editor.conviction as string} onChange={(e) => setEditor({ ...editor, conviction: e.target.value })} /></label>
                </div>
              )}
              {editor.kind === "dogma-add" && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs">Kind
                    <select className={fieldClass} value={editor.dogmaKind as string} onChange={(e) => setEditor({ ...editor, dogmaKind: e.target.value })}>
                      <option value="builtin">Built-in</option>
                      <option value="custom">Custom</option>
                    </select>
                  </label>
                  {editor.dogmaKind === "builtin" ? (
                    <select className={fieldClass} value={editor.dogmaId as string} onChange={(e) => setEditor({ ...editor, dogmaId: e.target.value })}>
                      {HIEROPHANT_BUILTIN_DOGMA_DEFINITIONS.map((d) => (
                        <option key={d.id} value={d.id}>{d.category}: {d.text}</option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <select className={fieldClass} value={editor.dogmaCategory as string} onChange={(e) => setEditor({ ...editor, dogmaCategory: e.target.value })}>
                        {HIEROPHANT_DOGMA_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <textarea className={fieldClass} value={editor.dogmaText as string} onChange={(e) => setEditor({ ...editor, dogmaText: e.target.value })} />
                    </>
                  )}
                </div>
              )}
              {editor.kind === "dogma-edit" && (
                <div className="flex flex-col gap-2">
                  <select className={fieldClass} value={editor.dogmaCategory as string} onChange={(e) => setEditor({ ...editor, dogmaCategory: e.target.value })}>
                    {HIEROPHANT_DOGMA_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <textarea className={fieldClass} value={editor.dogmaText as string} onChange={(e) => setEditor({ ...editor, dogmaText: e.target.value })} />
                </div>
              )}
              {(editor.kind === "class-create" || editor.kind === "class-edit") && (
                <label className="text-xs">Name<input className={fieldClass} value={editor.name as string} onChange={(e) => setEditor({ ...editor, name: e.target.value })} /></label>
              )}
              {(editor.kind === "doctrine-create" || editor.kind === "doctrine-edit") && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs">Orthodox text<textarea className={fieldClass} value={editor.orthodoxText as string} onChange={(e) => setEditor({ ...editor, orthodoxText: e.target.value })} /></label>
                  <label className="text-xs flex items-center gap-2">
                    <input type="checkbox" checked={editor.includeBlasphemy as boolean} onChange={(e) => setEditor({ ...editor, includeBlasphemy: e.target.checked })} />
                    Include campaign Blasphemy
                  </label>
                  {editor.includeBlasphemy === true && (
                    <textarea className={fieldClass} value={editor.blasphemyText as string} onChange={(e) => setEditor({ ...editor, blasphemyText: e.target.value })} />
                  )}
                  <div className="text-xs">Supported Classes</div>
                  {classOptions().map((o) => (
                    <label key={o.id} className="text-xs flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(editor.supportedClassIds as string[]).includes(o.id)}
                        onChange={() => {
                          const set = new Set(editor.supportedClassIds as string[]);
                          if (set.has(o.id)) set.delete(o.id);
                          else set.add(o.id);
                          setEditor({ ...editor, supportedClassIds: [...set] });
                        }}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <button type="button" className={btnClass} disabled={pending} onClick={() => void handleSave()}>Save</button>
                <button type="button" className={ghostBtn} onClick={closeEditor}>Cancel</button>
              </div>
            </div>
          )}
        </>
      )}

      {error !== null && (
        <div className="mt-4 text-sm text-red-700 dark:text-red-300">{error}</div>
      )}
    </section>
  );
}

function TempleCard({
  temple,
  hierophant,
  world,
  holiday,
  pending,
  onResources,
  onEdit,
  onHoliday,
}: {
  temple: HierophantTemple;
  hierophant: HierophantState;
  world: WorldReference;
  holiday: boolean;
  pending: boolean;
  onResources: () => void;
  onEdit: () => void;
  onHoliday: () => void;
}) {
  const caps = templeEditCapabilities(temple);
  const hostedS = hostedSupplicants(hierophant.supplicants, { kind: "temple", templeId: temple.templeId });
  const hostedP = hostedProphets(hierophant.prophets, { kind: "temple", templeId: temple.templeId });
  return (
    <div className={`rounded-lg border p-4 ${caps.isHestar ? "border-amber-400 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/20" : "border-slate-200 dark:border-slate-700"}`}>
      <div className="flex items-center gap-2">
        <div className="font-semibold">{templeDisplayName(temple, world.places)}</div>
        {caps.isHestar && <span className="text-[10px] uppercase tracking-wide text-amber-800 dark:text-amber-200">Hestar</span>}
        {holiday && <span className="text-[10px] uppercase tracking-wide text-slate-500">Holiday</span>}
      </div>
      <div className="text-xs text-slate-500 mt-1">
        {placeLabel(world.places, temple.placeId)} · {hostSeatLabel(temple.hostSeatId)} · {temple.status} · A {temple.abundance} / C {temple.conviction}
      </div>
      <div className="text-sm mt-1">{templeDoctrineSummary(temple, hierophant.campaignDoctrines)}</div>
      <div className="text-xs text-slate-500 mt-2">
        Supplicants: {hostedS.map((s) => denizenLabel(world.denizens, s.denizenId)).join(", ") || "none"}
      </div>
      <div className="text-xs text-slate-500">
        Prophets: {hostedP.map((p) => denizenLabel(world.denizens, p.denizenId)).join(", ") || "none"}
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <button type="button" className={ghostBtn} onClick={onResources}>Resources</button>
        <button type="button" className={ghostBtn} onClick={onEdit}>Edit</button>
        <button type="button" className={ghostBtn} disabled={pending} onClick={onHoliday}>
          {holiday ? "Clear Holiday" : "Mark Holiday"}
        </button>
      </div>
    </div>
  );
}

function PeopleSection({
  hierophant,
  world,
  pending,
  onAddSupplicant,
  onEditSupplicant,
  onRemoveSupplicant,
  onAddProphet,
  onEditProphet,
  onRemoveProphet,
}: {
  hierophant: HierophantState;
  world: WorldReference;
  pending: boolean;
  onAddSupplicant: () => void;
  onEditSupplicant: (s: HierophantState["supplicants"][number]) => void;
  onRemoveSupplicant: (denizenId: string) => void;
  onAddProphet: () => void;
  onEditProphet: (p: HierophantState["prophets"][number]) => void;
  onRemoveProphet: (denizenId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Supplicants</h3>
          <button type="button" className={btnClass} onClick={onAddSupplicant}>Add Supplicant</button>
        </div>
        {hierophant.supplicants.length === 0 ? (
          <p className="text-sm text-slate-500">No Supplicants.</p>
        ) : hierophant.supplicants.map((s) => (
          <div key={s.denizenId} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 mb-2">
            <div className="font-medium text-sm">{denizenLabel(world.denizens, s.denizenId)}</div>
            <div className="text-xs text-slate-500">
              {classLabel(s.classId, hierophant.campaignClasses)} · Woe {s.woe} · {hostSummary(s.host, hierophant.temples, world.places, world.denizens)}
            </div>
            <div className="flex gap-2 mt-2">
              <button type="button" className={ghostBtn} onClick={() => onEditSupplicant(s)}>Edit</button>
              <button type="button" className={ghostBtn} disabled={pending} onClick={() => onRemoveSupplicant(s.denizenId)}>Remove role</button>
            </div>
          </div>
        ))}
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Prophets</h3>
          <button type="button" className={btnClass} onClick={onAddProphet}>Add Prophet</button>
        </div>
        {hierophant.prophets.length === 0 ? (
          <p className="text-sm text-slate-500">No Prophets.</p>
        ) : hierophant.prophets.map((p) => (
          <div key={p.denizenId} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 mb-2">
            <div className="font-medium text-sm">{denizenLabel(world.denizens, p.denizenId)}</div>
            <div className="text-xs text-slate-500">
              {prophetSharedStatusLabel(world, p.denizenId)} · {hostSummary(p.host, hierophant.temples, world.places, world.denizens)}
            </div>
            <div className="flex gap-2 mt-2">
              <button type="button" className={ghostBtn} onClick={() => onEditProphet(p)}>Edit</button>
              <button type="button" className={ghostBtn} disabled={pending} onClick={() => onRemoveProphet(p.denizenId)}>Remove role</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DefinitionsSection({
  hierophant,
  onCreateClass,
  onEditClass,
  onCreateDoctrine,
  onEditDoctrine,
}: {
  hierophant: HierophantState;
  onCreateClass: () => void;
  onEditClass: (classId: string, name: string) => void;
  onCreateDoctrine: () => void;
  onEditDoctrine: (d: HierophantState["campaignDoctrines"][number]) => void;
}) {
  return (
    <div className="flex flex-col gap-6 text-sm">
      <div>
        <h3 className="font-semibold mb-2">Classes</h3>
        {HIEROPHANT_BUILTIN_CLASS_DEFINITIONS.map((c) => (
          <div key={c.id} className="text-slate-600 dark:text-slate-300">{c.name}</div>
        ))}
        <div className="mt-2 font-medium">Campaign Classes</div>
        {hierophant.campaignClasses.map((c) => (
          <div key={c.classId} className="flex items-center gap-2">
            <span>{c.name}</span>
            <button type="button" className={ghostBtn} onClick={() => onEditClass(c.classId, c.name)}>Rename</button>
          </div>
        ))}
        <button type="button" className={`${btnClass} mt-2`} onClick={onCreateClass}>Add Class</button>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Doctrine / Blasphemy</h3>
        {HIEROPHANT_BUILTIN_DOCTRINE_DEFINITIONS.map((d) => (
          <div key={d.id} className="mb-2">
            <div>{d.text}</div>
            <div className="text-xs text-slate-500">Paired: {d.pairedBlasphemy.text}</div>
            <div className="text-xs text-slate-400">Classes: {d.supportedClassIds.join(", ")}</div>
          </div>
        ))}
        <div className="mt-2 font-medium">Campaign Doctrines</div>
        {hierophant.campaignDoctrines.map((d) => (
          <div key={d.doctrineId} className="mb-2">
            <div>{d.orthodoxText ?? "Orthodox text unset"}</div>
            {d.blasphemy !== null && <div className="text-xs text-slate-500">{d.blasphemy.text}</div>}
            <button type="button" className={ghostBtn} onClick={() => onEditDoctrine(d)}>Edit</button>
          </div>
        ))}
        <button type="button" className={`${btnClass} mt-2`} onClick={onCreateDoctrine}>Add Doctrine</button>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Laws of the Flame</h3>
        {HIEROPHANT_FLAME_LAW_DEFINITIONS.map((l) => (
          <div key={l.id} className="mb-1"><span className="font-medium">{l.applicationLabel}.</span> {l.text}</div>
        ))}
      </div>
      <div>
        <h3 className="font-semibold mb-2">Source Dogmas</h3>
        {HIEROPHANT_BUILTIN_DOGMA_DEFINITIONS.map((d) => (
          <div key={d.id} className="mb-1 text-xs"><span className="uppercase text-slate-400">{d.category}</span> {d.text}</div>
        ))}
      </div>
    </div>
  );
}

function HostFields({
  editor,
  setEditor,
  hierophant,
  includeArea,
}: {
  editor: Record<string, unknown>;
  setEditor: (next: Record<string, unknown>) => void;
  hierophant: HierophantState;
  includeArea: boolean;
}) {
  return (
    <>
      <label className="text-xs">Host
        <select className={fieldClass} value={editor.hostKind as string} onChange={(e) => setEditor({ ...editor, hostKind: e.target.value })}>
          <option value="temple">Temple</option>
          <option value="cult">Cult</option>
        </select>
      </label>
      {editor.hostKind === "temple" ? (
        <>
          <select className={fieldClass} value={editor.templeId as string} onChange={(e) => setEditor({ ...editor, templeId: e.target.value })}>
            {hierophant.temples.map((t) => (
              <option key={t.templeId} value={t.templeId}>{templeDisplayName(t, [])}</option>
            ))}
          </select>
          {includeArea && (
            <select className={fieldClass} value={editor.area as string} onChange={(e) => setEditor({ ...editor, area: e.target.value })}>
              <option value="">Area unresolved</option>
              <option value="courtyard">Courtyard</option>
              <option value="agiary">Agiary</option>
            </select>
          )}
        </>
      ) : (
        <select className={fieldClass} value={editor.cultDenizenId as string} onChange={(e) => setEditor({ ...editor, cultDenizenId: e.target.value })}>
          {hierophant.cults.map((c) => (
            <option key={c.cultDenizenId} value={c.cultDenizenId}>{c.cultDenizenId}</option>
          ))}
        </select>
      )}
    </>
  );
}
