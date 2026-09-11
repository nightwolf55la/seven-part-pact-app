import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api.js";

import { CampaignTaxonomyPanel, DenizenSharedStatePanel, TreasurePanel } from "./WorldSharedStatePanels";
import type {
  MortalityState,
  PowerfulDenizenProfile,
} from "../shared/domain";

export interface DenizenRef {
  readonly denizenId: string;
  readonly name: string;
  readonly representation: "individual" | "collective";
  readonly description: string | null;
  readonly mortalityState?: MortalityState | null;
  readonly powerfulProfile?: PowerfulDenizenProfile | null;
}

export interface IsleRef {
  readonly isleId: string;
  readonly name: string;
  readonly description: string | null;
}

export type PlacementRef =
  | { readonly kind: "unspecified" }
  | { readonly kind: "on_isle"; readonly isleId: string }
  | { readonly kind: "mobile"; readonly associatedIsleId: string | null };

export interface PlaceRef {
  readonly placeId: string;
  readonly name: string;
  readonly description: string | null;
  readonly placement: PlacementRef;
}

export interface CompanionRelationshipRef {
  readonly companionRelationshipId: string;
  readonly wizardId: string;
  readonly element: "air" | "fire" | "earth" | "water";
  readonly denizenId: string;
  readonly description: string | null;
  readonly status: "current" | "ended";
}

export interface CampaignTaxonomyRef {
  readonly taxonomyId: string;
  readonly name: string;
  readonly description: string | null;
}

export type TreasureCustodyRef =
  | { readonly kind: "none" }
  | { readonly kind: "unlocated" }
  | { readonly kind: "place"; readonly placeId: string }
  | {
      readonly kind: "subject";
      readonly subject:
        | { readonly kind: "wizard"; readonly wizardId: string }
        | { readonly kind: "denizen"; readonly denizenId: string };
    }
  | { readonly kind: "devil" };

export interface TreasureRef {
  readonly treasureId: string;
  readonly name: string;
  readonly description: string | null;
  readonly condition: "intact" | "destroyed";
  readonly custody: TreasureCustodyRef;
}

export interface WorldReference {
  readonly denizens: readonly DenizenRef[];
  readonly isles: readonly IsleRef[];
  readonly places: readonly PlaceRef[];
  readonly companionRelationships?: readonly CompanionRelationshipRef[];
  readonly campaignPowerfulDenizenTaxonomies?: readonly CampaignTaxonomyRef[];
  readonly treasures?: readonly TreasureRef[];
  readonly wizards?: readonly { readonly wizardId: string; readonly name: string }[];
}

type WorldTab = "denizens" | "isles" | "places" | "taxonomies" | "treasures";

const TAB_LABELS: Record<WorldTab, string> = {
  denizens: "Denizens",
  isles: "Isles",
  places: "Places",
  taxonomies: "Taxonomies",
  treasures: "Treasures",
};

type EditorKind = "denizen-create" | "denizen-edit" | "isle-create" | "isle-edit" | "place-create" | "place-edit";

interface EditorState {
  readonly kind: EditorKind;
  readonly entityId: string | null;
  readonly original: DenizenRef | IsleRef | PlaceRef | null;
  readonly name: string;
  readonly representation: "individual" | "collective";
  readonly description: string;
  readonly placementKind: "unspecified" | "on_isle" | "mobile";
  readonly isleId: string;
  readonly associatedIsleId: string;
  readonly expectedCampaignId: string;
}

function representationLabel(rep: "individual" | "collective"): string {
  return rep === "individual" ? "Individual" : "Collective";
}

function isleName(isles: readonly IsleRef[], isleId: string): string {
  const isle = isles.find((i) => i.isleId === isleId);
  return isle ? isle.name : "Unknown Isle";
}

function placementLabel(placement: PlacementRef, isles: readonly IsleRef[]): string {
  switch (placement.kind) {
    case "unspecified":
      return "Unspecified";
    case "on_isle":
      return `On ${isleName(isles, placement.isleId)}`;
    case "mobile":
      if (placement.associatedIsleId !== null) {
        return `Mobile — associated with ${isleName(isles, placement.associatedIsleId)}`;
      }
      return "Mobile";
  }
}

function matchesFilter(text: string, filter: string): boolean {
  return text.toLowerCase().includes(filter.toLowerCase());
}

function placementsEqual(a: PlacementRef, b: PlacementRef): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "on_isle" && b.kind === "on_isle") return a.isleId === b.isleId;
  if (a.kind === "mobile" && b.kind === "mobile") return a.associatedIsleId === b.associatedIsleId;
  return true;
}

function buildPlacement(state: EditorState): PlacementRef {
  switch (state.placementKind) {
    case "unspecified":
      return { kind: "unspecified" };
    case "on_isle":
      return { kind: "on_isle", isleId: state.isleId };
    case "mobile":
      return { kind: "mobile", associatedIsleId: state.associatedIsleId === "" ? null : state.associatedIsleId };
  }
}

function blankEditor(tab: WorldTab, campaignId: string): EditorState {
  if (tab === "denizens") {
    return { kind: "denizen-create", entityId: null, original: null, name: "", representation: "individual", description: "", placementKind: "unspecified", isleId: "", associatedIsleId: "", expectedCampaignId: campaignId };
  }
  if (tab === "isles") {
    return { kind: "isle-create", entityId: null, original: null, name: "", representation: "individual", description: "", placementKind: "unspecified", isleId: "", associatedIsleId: "", expectedCampaignId: campaignId };
  }
  return { kind: "place-create", entityId: null, original: null, name: "", representation: "individual", description: "", placementKind: "unspecified", isleId: "", associatedIsleId: "", expectedCampaignId: campaignId };
}

export default function WorldSurface({ world, campaignId }: { world: WorldReference; campaignId: string }) {
  const [activeTab, setActiveTab] = useState<WorldTab>("denizens");
  const [filter, setFilter] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const createDenizen = useMutation(api.m3Commands.createDenizen);
  const updateDenizen = useMutation(api.m3Commands.updateDenizen);
  const createIsle = useMutation(api.m3Commands.createIsle);
  const updateIsle = useMutation(api.m3Commands.updateIsle);
  const createPlace = useMutation(api.m3Commands.createPlace);
  const updatePlace = useMutation(api.m3Commands.updatePlace);

  const trimmedFilter = filter.trim();

  function switchTab(tab: WorldTab) {
    setActiveTab(tab);
    setEditor(null);
    setError(null);
  }

  function openCreate(): void {
    if (activeTab === "taxonomies" || activeTab === "treasures") return;
    setError(null);
    setEditor(blankEditor(activeTab, campaignId));
  }

  function openEditDenizen(d: DenizenRef): void {
    setError(null);
    setEditor({
      kind: "denizen-edit",
      entityId: d.denizenId,
      original: d,
      name: d.name,
      representation: d.representation,
      description: d.description ?? "",
      placementKind: "unspecified",
      isleId: "",
      associatedIsleId: "",
      expectedCampaignId: campaignId,
    });
  }

  function openEditIsle(i: IsleRef): void {
    setError(null);
    setEditor({
      kind: "isle-edit",
      entityId: i.isleId,
      original: i,
      name: i.name,
      representation: "individual",
      description: i.description ?? "",
      placementKind: "unspecified",
      isleId: "",
      associatedIsleId: "",
      expectedCampaignId: campaignId,
    });
  }

  function openEditPlace(p: PlaceRef): void {
    setError(null);
    const pk = p.placement.kind;
    setEditor({
      kind: "place-edit",
      entityId: p.placeId,
      original: p,
      name: p.name,
      representation: "individual",
      description: p.description ?? "",
      placementKind: pk,
      isleId: pk === "on_isle" ? p.placement.isleId : "",
      associatedIsleId: pk === "mobile" && p.placement.associatedIsleId !== null ? p.placement.associatedIsleId : "",
      expectedCampaignId: campaignId,
    });
  }

  function closeEditor(): void {
    setEditor(null);
    setError(null);
  }

  async function handleSave(): Promise<void> {
    if (!editor) return;
    setPending(true);
    setError(null);
    try {
      if (editor.kind === "denizen-create") {
        const commandId = `cmd_${crypto.randomUUID()}`;
        const denizenId = `den_${crypto.randomUUID()}`;
        await createDenizen({
          commandId,
          expectedCampaignId: editor.expectedCampaignId,
          denizenId,
          name: editor.name,
          representation: editor.representation,
          description: editor.description.trim() === "" ? null : editor.description,
        });
        closeEditor();
      } else if (editor.kind === "denizen-edit") {
        const orig = editor.original as DenizenRef;
        const fields: Record<string, { expected: unknown; value: unknown }> = {};
        if (editor.name !== orig.name) {
          fields.name = { expected: orig.name, value: editor.name };
        }
        if (editor.representation !== orig.representation) {
          fields.representation = { expected: orig.representation, value: editor.representation };
        }
        const newDesc = editor.description.trim() === "" ? null : editor.description;
        if (newDesc !== orig.description) {
          fields.description = { expected: orig.description, value: newDesc };
        }
        if (Object.keys(fields).length === 0) {
          closeEditor();
          return;
        }
        const commandId = `cmd_${crypto.randomUUID()}`;
        await updateDenizen({ commandId, expectedCampaignId: editor.expectedCampaignId, denizenId: editor.entityId!, fields });
        closeEditor();
      } else if (editor.kind === "isle-create") {
        const commandId = `cmd_${crypto.randomUUID()}`;
        const isleId = `isl_${crypto.randomUUID()}`;
        await createIsle({
          commandId,
          expectedCampaignId: editor.expectedCampaignId,
          isleId,
          name: editor.name,
          description: editor.description.trim() === "" ? null : editor.description,
        });
        closeEditor();
      } else if (editor.kind === "isle-edit") {
        const orig = editor.original as IsleRef;
        const fields: Record<string, { expected: unknown; value: unknown }> = {};
        if (editor.name !== orig.name) {
          fields.name = { expected: orig.name, value: editor.name };
        }
        const newDesc = editor.description.trim() === "" ? null : editor.description;
        if (newDesc !== orig.description) {
          fields.description = { expected: orig.description, value: newDesc };
        }
        if (Object.keys(fields).length === 0) {
          closeEditor();
          return;
        }
        const commandId = `cmd_${crypto.randomUUID()}`;
        await updateIsle({ commandId, expectedCampaignId: editor.expectedCampaignId, isleId: editor.entityId!, fields });
        closeEditor();
      } else if (editor.kind === "place-create") {
        if (editor.placementKind === "on_isle" && editor.isleId === "") {
          setError("Select an Isle.");
          return;
        }
        const commandId = `cmd_${crypto.randomUUID()}`;
        const placeId = `plc_${crypto.randomUUID()}`;
        await createPlace({
          commandId,
          expectedCampaignId: editor.expectedCampaignId,
          placeId,
          name: editor.name,
          description: editor.description.trim() === "" ? null : editor.description,
          placement: buildPlacement(editor),
        });
        closeEditor();
      } else if (editor.kind === "place-edit") {
        const orig = editor.original as PlaceRef;
        const fields: Record<string, { expected: unknown; value: unknown }> = {};
        if (editor.name !== orig.name) {
          fields.name = { expected: orig.name, value: editor.name };
        }
        const newDesc = editor.description.trim() === "" ? null : editor.description;
        if (newDesc !== orig.description) {
          fields.description = { expected: orig.description, value: newDesc };
        }
        const newPlacement = buildPlacement(editor);
        if (!placementsEqual(newPlacement, orig.placement)) {
          fields.placement = { expected: orig.placement, value: newPlacement };
        }
        if (Object.keys(fields).length === 0) {
          closeEditor();
          return;
        }
        const commandId = `cmd_${crypto.randomUUID()}`;
        await updatePlace({ commandId, expectedCampaignId: editor.expectedCampaignId, placeId: editor.entityId!, fields });
        closeEditor();
      }
    } catch (e: any) {
      setError(e?.message ?? "Mutation failed.");
    } finally {
      setPending(false);
    }
  }

  const filteredDenizens = trimmedFilter
    ? world.denizens.filter(
        (d) =>
          matchesFilter(d.name, trimmedFilter) ||
          (d.description !== null && matchesFilter(d.description, trimmedFilter)),
      )
    : world.denizens;

  const filteredIsles = trimmedFilter
    ? world.isles.filter(
        (i) =>
          matchesFilter(i.name, trimmedFilter) ||
          (i.description !== null && matchesFilter(i.description, trimmedFilter)),
      )
    : world.isles;

  const filteredPlaces = trimmedFilter
    ? world.places.filter(
        (p) =>
          matchesFilter(p.name, trimmedFilter) ||
          (p.description !== null && matchesFilter(p.description, trimmedFilter)),
      )
    : world.places;

  const addButtonLabel =
    activeTab === "denizens" ? "Add Denizen" : activeTab === "isles" ? "Add Isle" : activeTab === "places" ? "Add Place" : null;
  const saveLabel =
    editor?.kind.endsWith("create") ? "Create" : "Save";

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">World</h2>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(Object.keys(TAB_LABELS) as WorldTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className={`text-xs font-medium rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
              activeTab === tab
                ? "bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
        {addButtonLabel !== null && (
        <button
          onClick={openCreate}
          disabled={pending}
          className="text-xs font-medium rounded-lg px-3 py-1.5 cursor-pointer bg-slate-700 dark:bg-slate-300 text-white dark:text-slate-900 hover:bg-slate-600 dark:hover:bg-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {addButtonLabel}
        </button>
        )}
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter world…"
          className="ml-auto text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
        />
      </div>

      {error && editor === null && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
      )}

      {editor && (
        <div className="rounded-lg border border-slate-300 dark:border-slate-600 p-4 mb-4 bg-slate-50 dark:bg-slate-800">
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Name</label>
              <input
                data-field="name"
                type="text"
                value={editor.name}
                onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 w-full text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
              />
            </div>

            {(editor.kind === "denizen-create" || editor.kind === "denizen-edit") && (
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Representation</label>
                <select
                  data-field="representation"
                  value={editor.representation}
                  onChange={(e) => setEditor({ ...editor, representation: e.target.value as "individual" | "collective" })}
                  className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 w-full text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
                >
                  <option value="individual">Individual</option>
                  <option value="collective">Collective</option>
                </select>
              </div>
            )}

            {(editor.kind === "place-create" || editor.kind === "place-edit") && (
              <>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Placement</label>
                  <select
                    data-field="placementKind"
                    value={editor.placementKind}
                    onChange={(e) => setEditor({ ...editor, placementKind: e.target.value as "unspecified" | "on_isle" | "mobile" })}
                    className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 w-full text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
                  >
                    <option value="unspecified">Unspecified</option>
                    <option value="on_isle">On Isle</option>
                    <option value="mobile">Mobile</option>
                  </select>
                </div>
                {editor.placementKind === "on_isle" && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Isle</label>
                    <select
                      data-field="isleId"
                      value={editor.isleId}
                      onChange={(e) => setEditor({ ...editor, isleId: e.target.value })}
                      className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 w-full text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
                    >
                      <option value="">— Select —</option>
                      {world.isles.map((i) => (
                        <option key={i.isleId} value={i.isleId}>{i.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {editor.placementKind === "mobile" && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Associated Isle</label>
                    <select
                      data-field="associatedIsleId"
                      value={editor.associatedIsleId}
                      onChange={(e) => setEditor({ ...editor, associatedIsleId: e.target.value })}
                      className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 w-full text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
                    >
                      <option value="">None</option>
                      {world.isles.map((i) => (
                        <option key={i.isleId} value={i.isleId}>{i.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Description</label>
              <textarea
                data-field="description"
                value={editor.description}
                onChange={(e) => setEditor({ ...editor, description: e.target.value })}
                rows={2}
                className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 w-full text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={pending}
                className="text-xs font-medium rounded-lg px-3 py-1.5 cursor-pointer bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {pending ? "Saving…" : saveLabel}
              </button>
              <button
                onClick={closeEditor}
                disabled={pending}
                className="text-xs font-medium rounded-lg px-3 py-1.5 cursor-pointer text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            </div>
            {editor.kind === "denizen-edit" && editor.original !== null && "denizenId" in editor.original && (
              <DenizenSharedStatePanel
                campaignId={campaignId}
                denizen={editor.original as DenizenRef}
                taxonomies={world.campaignPowerfulDenizenTaxonomies ?? []}
                pending={pending}
                setPending={setPending}
                setError={setError}
              />
            )}
          </div>
        </div>
      )}

      {activeTab === "denizens" && (
        <div className="flex flex-col gap-3">
          {filteredDenizens.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">No Denizens.</p>
          ) : (
            filteredDenizens.map((d) => (
              <div
                key={d.denizenId}
                className="rounded-lg border border-slate-200 dark:border-slate-700 p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{d.name}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {representationLabel(d.representation)}
                    {d.representation === "individual" && d.mortalityState === "deceased" ? " · deceased" : ""}
                    {d.powerfulProfile ? " · Powerful" : ""}
                  </span>
                  <button
                    onClick={() => openEditDenizen(d)}
                    disabled={pending}
                    className="ml-auto text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Edit
                  </button>
                </div>
                {d.description !== null && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{d.description}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "isles" && (
        <div className="flex flex-col gap-3">
          {filteredIsles.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">No Isles.</p>
          ) : (
            filteredIsles.map((i) => (
              <div
                key={i.isleId}
                className="rounded-lg border border-slate-200 dark:border-slate-700 p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{i.name}</span>
                  <button
                    onClick={() => openEditIsle(i)}
                    disabled={pending}
                    className="ml-auto text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Edit
                  </button>
                </div>
                {i.description !== null && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{i.description}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "places" && (
        <div className="flex flex-col gap-3">
          {filteredPlaces.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">No Places.</p>
          ) : (
            filteredPlaces.map((p) => (
              <div
                key={p.placeId}
                className="rounded-lg border border-slate-200 dark:border-slate-700 p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{p.name}</span>
                  <button
                    onClick={() => openEditPlace(p)}
                    disabled={pending}
                    className="ml-auto text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Edit
                  </button>
                </div>
                {p.description !== null && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{p.description}</p>
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {placementLabel(p.placement, world.isles)}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "taxonomies" && (
        <CampaignTaxonomyPanel
          campaignId={campaignId}
          taxonomies={world.campaignPowerfulDenizenTaxonomies ?? []}
          pending={pending}
          setPending={setPending}
          setError={setError}
        />
      )}

      {activeTab === "treasures" && (
        <TreasurePanel
          campaignId={campaignId}
          treasures={world.treasures ?? []}
          denizens={world.denizens}
          places={world.places}
          wizards={world.wizards ?? []}
          pending={pending}
          setPending={setPending}
          setError={setError}
        />
      )}
    </section>
  );
}
