import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api.js";
import {
  POWERFUL_DENIZEN_BUILTIN_TAXONOMY_DEFINITIONS,
  POWERFUL_DENIZEN_STANDARD_STATUS_VALUES,
  STANDARD_POWERFUL_DENIZEN_METHODS,
  isValidBuiltinPowerfulDenizenTaxonomyId,
  type CampaignPowerfulDenizenTaxonomyId,
  type MortalityState,
  type PowerfulDenizenMethodDefinition,
  type PowerfulDenizenProfile,
  type PowerfulDenizenStatus,
  type PowerfulDenizenTaxonomyRef,
} from "../shared/domain";
import type { CampaignTaxonomyRef, DenizenRef, PlaceRef, TreasureCustodyRef, TreasureRef } from "./WorldSurface";

function commandId(): string {
  return `cmd_${crypto.randomUUID()}`;
}

function taxonomyKey(ref: PowerfulDenizenTaxonomyRef): string {
  return `${ref.kind}:${ref.taxonomyId}`;
}

function parseTaxonomyKey(key: string): PowerfulDenizenTaxonomyRef | null {
  if (key.startsWith("builtin:")) {
    const taxonomyId = key.slice("builtin:".length);
    if (!isValidBuiltinPowerfulDenizenTaxonomyId(taxonomyId)) return null;
    return { kind: "builtin", taxonomyId };
  }
  if (key.startsWith("campaign:")) {
    return { kind: "campaign", taxonomyId: key.slice("campaign:".length) as CampaignPowerfulDenizenTaxonomyId };
  }
  return null;
}

export function DenizenSharedStatePanel({
  campaignId,
  denizen,
  taxonomies,
  pending,
  setPending,
  setError,
}: {
  readonly campaignId: string;
  readonly denizen: DenizenRef;
  readonly taxonomies: readonly CampaignTaxonomyRef[];
  readonly pending: boolean;
  readonly setPending: (value: boolean) => void;
  readonly setError: (value: string | null) => void;
}) {
  const setDenizenMortalityState = useMutation(api.m3Commands.setDenizenMortalityState);
  const createPowerfulDenizenProfile = useMutation(api.m3Commands.createPowerfulDenizenProfile);
  const removePowerfulDenizenProfile = useMutation(api.m3Commands.removePowerfulDenizenProfile);
  const setPowerfulDenizenTaxonomies = useMutation(api.m3Commands.setPowerfulDenizenTaxonomies);
  const setPowerfulDenizenStatus = useMutation(api.m3Commands.setPowerfulDenizenStatus);
  const setPowerfulDenizenGoal = useMutation(api.m3Commands.setPowerfulDenizenGoal);
  const addPowerfulDenizenMethod = useMutation(api.m3Commands.addPowerfulDenizenMethod);
  const updatePowerfulDenizenMethod = useMutation(api.m3Commands.updatePowerfulDenizenMethod);
  const removePowerfulDenizenMethod = useMutation(api.m3Commands.removePowerfulDenizenMethod);
  const addPowerfulDenizenTruth = useMutation(api.m3Commands.addPowerfulDenizenTruth);
  const updatePowerfulDenizenTruth = useMutation(api.m3Commands.updatePowerfulDenizenTruth);
  const removePowerfulDenizenTruth = useMutation(api.m3Commands.removePowerfulDenizenTruth);

  const profile = denizen.powerfulProfile ?? null;
  const [createTaxonomyKey, setCreateTaxonomyKey] = useState("builtin:ghoul_caller");
  const [goalDraft, setGoalDraft] = useState(profile?.goal ?? "");
  const [otherStatus, setOtherStatus] = useState(profile?.status.kind === "other" ? profile.status.label : "");
  const [methodKind, setMethodKind] = useState<"standard" | "named">("standard");
  const [standardMethod, setStandardMethod] = useState<(typeof STANDARD_POWERFUL_DENIZEN_METHODS)[number]>("rampaging");
  const [namedMethod, setNamedMethod] = useState("");
  const [namedMethodDescription, setNamedMethodDescription] = useState("");
  const [truthDraft, setTruthDraft] = useState("");

  async function run(fn: () => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.message ?? "Mutation failed.");
    } finally {
      setPending(false);
    }
  }

  const availableTaxonomies: { key: string; label: string }[] = [
    ...POWERFUL_DENIZEN_BUILTIN_TAXONOMY_DEFINITIONS.map((def) => ({
      key: `builtin:${def.taxonomyId}`,
      label: `${def.name} (builtin)`,
    })),
    ...taxonomies.map((taxonomy) => ({
      key: `campaign:${taxonomy.taxonomyId}`,
      label: taxonomy.name,
    })),
  ];

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 dark:border-slate-700 pt-3">
      {denizen.representation === "individual" && denizen.mortalityState != null && (
        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          Mortality
          <select
            disabled={pending}
            value={denizen.mortalityState}
            onChange={(e) => {
              const value = e.target.value as MortalityState;
              void run(() => setDenizenMortalityState({
                commandId: commandId(),
                expectedCampaignId: campaignId,
                denizenId: denizen.denizenId,
                change: { expected: denizen.mortalityState as MortalityState, value },
              }));
            }}
            className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-slate-700 dark:text-slate-200"
          >
            <option value="not_deceased">Not deceased</option>
            <option value="deceased">Deceased</option>
          </select>
        </label>
      )}

      {profile === null ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Powerful profile</p>
          <select
            value={createTaxonomyKey}
            onChange={(e) => setCreateTaxonomyKey(e.target.value)}
            className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-slate-700 dark:text-slate-200"
          >
            {availableTaxonomies.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
          <button
            disabled={pending}
            onClick={() => {
              const ref = parseTaxonomyKey(createTaxonomyKey);
              if (ref === null) return;
              void run(() => createPowerfulDenizenProfile({
                commandId: commandId(),
                expectedCampaignId: campaignId,
                denizenId: denizen.denizenId,
                taxonomies: [ref],
                status: { kind: "standard", value: "reliable" },
                goal: null,
              }));
            }}
            className="text-xs font-medium rounded-lg px-3 py-1.5 bg-slate-700 dark:bg-slate-300 text-white dark:text-slate-900 disabled:opacity-50"
          >
            Create Powerful profile
          </button>
        </div>
      ) : (
        <PowerfulProfileFields
          profile={profile}
          availableTaxonomies={availableTaxonomies}
          pending={pending}
          goalDraft={goalDraft}
          setGoalDraft={setGoalDraft}
          otherStatus={otherStatus}
          setOtherStatus={setOtherStatus}
          methodKind={methodKind}
          setMethodKind={setMethodKind}
          standardMethod={standardMethod}
          setStandardMethod={setStandardMethod}
          namedMethod={namedMethod}
          setNamedMethod={setNamedMethod}
          namedMethodDescription={namedMethodDescription}
          setNamedMethodDescription={setNamedMethodDescription}
          truthDraft={truthDraft}
          setTruthDraft={setTruthDraft}
          onRemoveProfile={() => run(() => removePowerfulDenizenProfile({
            commandId: commandId(),
            expectedCampaignId: campaignId,
            denizenId: denizen.denizenId,
            expectedProfile: profile as never,
          }))}
          onSetTaxonomies={(value) => run(() => setPowerfulDenizenTaxonomies({
            commandId: commandId(),
            expectedCampaignId: campaignId,
            denizenId: denizen.denizenId,
            change: { expected: [...profile.taxonomies], value } as never,
          }))}
          onSetStatus={(value) => run(() => setPowerfulDenizenStatus({
            commandId: commandId(),
            expectedCampaignId: campaignId,
            denizenId: denizen.denizenId,
            change: { expected: profile.status, value },
          }))}
          onSetGoal={(value) => run(() => setPowerfulDenizenGoal({
            commandId: commandId(),
            expectedCampaignId: campaignId,
            denizenId: denizen.denizenId,
            change: { expected: profile.goal, value },
          }))}
          onAddMethod={(definition) => run(() => addPowerfulDenizenMethod({
            commandId: commandId(),
            expectedCampaignId: campaignId,
            denizenId: denizen.denizenId,
            methodEntryId: `pdmth_${crypto.randomUUID()}`,
            definition,
          }))}
          onUpdateMethod={(methodEntryId, expected, value) => run(() => updatePowerfulDenizenMethod({
            commandId: commandId(),
            expectedCampaignId: campaignId,
            denizenId: denizen.denizenId,
            methodEntryId,
            change: { expected, value },
          }))}
          onRemoveMethod={(method) => run(() => removePowerfulDenizenMethod({
            commandId: commandId(),
            expectedCampaignId: campaignId,
            denizenId: denizen.denizenId,
            methodEntryId: method.methodEntryId,
            expectedMethod: method as never,
          }))}
          onAddTruth={(text) => run(() => addPowerfulDenizenTruth({
            commandId: commandId(),
            expectedCampaignId: campaignId,
            denizenId: denizen.denizenId,
            truthId: `pdtru_${crypto.randomUUID()}`,
            text,
          }))}
          onUpdateTruth={(truthId, expected, value) => run(() => updatePowerfulDenizenTruth({
            commandId: commandId(),
            expectedCampaignId: campaignId,
            denizenId: denizen.denizenId,
            truthId,
            change: { expected, value },
          }))}
          onRemoveTruth={(truth) => run(() => removePowerfulDenizenTruth({
            commandId: commandId(),
            expectedCampaignId: campaignId,
            denizenId: denizen.denizenId,
            truthId: truth.truthId,
            expectedTruth: truth as never,
          }))}
        />
      )}
    </div>
  );
}

function PowerfulProfileFields({
  profile,
  availableTaxonomies,
  pending,
  goalDraft,
  setGoalDraft,
  otherStatus,
  setOtherStatus,
  methodKind,
  setMethodKind,
  standardMethod,
  setStandardMethod,
  namedMethod,
  setNamedMethod,
  namedMethodDescription,
  setNamedMethodDescription,
  truthDraft,
  setTruthDraft,
  onRemoveProfile,
  onSetTaxonomies,
  onSetStatus,
  onSetGoal,
  onAddMethod,
  onUpdateMethod,
  onRemoveMethod,
  onAddTruth,
  onUpdateTruth,
  onRemoveTruth,
}: {
  readonly profile: PowerfulDenizenProfile;
  readonly availableTaxonomies: readonly { key: string; label: string }[];
  readonly pending: boolean;
  readonly goalDraft: string;
  readonly setGoalDraft: (value: string) => void;
  readonly otherStatus: string;
  readonly setOtherStatus: (value: string) => void;
  readonly methodKind: "standard" | "named";
  readonly setMethodKind: (value: "standard" | "named") => void;
  readonly standardMethod: (typeof STANDARD_POWERFUL_DENIZEN_METHODS)[number];
  readonly setStandardMethod: (value: (typeof STANDARD_POWERFUL_DENIZEN_METHODS)[number]) => void;
  readonly namedMethod: string;
  readonly setNamedMethod: (value: string) => void;
  readonly namedMethodDescription: string;
  readonly setNamedMethodDescription: (value: string) => void;
  readonly truthDraft: string;
  readonly setTruthDraft: (value: string) => void;
  readonly onRemoveProfile: () => void;
  readonly onSetTaxonomies: (value: PowerfulDenizenTaxonomyRef[]) => void;
  readonly onSetStatus: (value: PowerfulDenizenStatus) => void;
  readonly onSetGoal: (value: string | null) => void;
  readonly onAddMethod: (definition: PowerfulDenizenMethodDefinition) => void;
  readonly onUpdateMethod: (
    methodEntryId: string,
    expected: PowerfulDenizenMethodDefinition,
    value: PowerfulDenizenMethodDefinition,
  ) => void;
  readonly onRemoveMethod: (method: PowerfulDenizenProfile["methods"][number]) => void;
  readonly onAddTruth: (text: string) => void;
  readonly onUpdateTruth: (truthId: string, expected: string, value: string) => void;
  readonly onRemoveTruth: (truth: PowerfulDenizenProfile["truths"][number]) => void;
}) {
  const selected = new Set(profile.taxonomies.map(taxonomyKey));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Powerful profile</p>
        <button disabled={pending} onClick={onRemoveProfile} className="text-xs text-red-600 dark:text-red-400">
          Remove profile
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {availableTaxonomies.map((option) => (
          <label key={option.key} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              disabled={pending}
              checked={selected.has(option.key)}
              onChange={(e) => {
                const next = new Set(selected);
                if (e.target.checked) next.add(option.key);
                else next.delete(option.key);
                const refs = [...next].map(parseTaxonomyKey).filter((ref): ref is PowerfulDenizenTaxonomyRef => ref !== null);
                onSetTaxonomies(refs);
              }}
            />
            {option.label}
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
        Status
        <select
          disabled={pending}
          value={profile.status.kind === "standard" ? profile.status.value : "other"}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "other") {
              onSetStatus({ kind: "other", label: otherStatus.trim() === "" ? "Other" : otherStatus });
              return;
            }
            onSetStatus({ kind: "standard", value: value as (typeof POWERFUL_DENIZEN_STANDARD_STATUS_VALUES)[number] });
          }}
          className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-slate-700 dark:text-slate-200"
        >
          {POWERFUL_DENIZEN_STANDARD_STATUS_VALUES.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
          <option value="other">Other</option>
        </select>
      </label>
      {profile.status.kind === "other" && (
        <div className="flex gap-2">
          <input
            value={otherStatus}
            onChange={(e) => setOtherStatus(e.target.value)}
            className="flex-1 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-slate-700 dark:text-slate-200"
          />
          <button
            disabled={pending}
            onClick={() => onSetStatus({ kind: "other", label: otherStatus })}
            className="text-xs px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg"
          >
            Save status
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={goalDraft}
          onChange={(e) => setGoalDraft(e.target.value)}
          placeholder="Goal (optional)"
          className="flex-1 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-slate-700 dark:text-slate-200"
        />
        <button
          disabled={pending}
          onClick={() => onSetGoal(goalDraft.trim() === "" ? null : goalDraft)}
          className="text-xs px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg"
        >
          Save goal
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Methods</p>
        {profile.methods.map((method) => (
          <div key={method.methodEntryId} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span className="flex-1">
              {method.definition.kind === "standard" ? method.definition.method : method.definition.name}
            </span>
            {method.definition.kind === "named" && (
              <button
                disabled={pending}
                onClick={() => {
                  const nextName = window.prompt("Method name", method.definition.kind === "named" ? method.definition.name : "");
                  if (nextName == null) return;
                  onUpdateMethod(method.methodEntryId, method.definition, {
                    kind: "named",
                    name: nextName,
                    description: method.definition.kind === "named" ? method.definition.description : null,
                  });
                }}
                className="text-slate-500"
              >
                Edit
              </button>
            )}
            <button disabled={pending} onClick={() => onRemoveMethod(method)} className="text-red-600 dark:text-red-400">
              Remove
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={methodKind}
            onChange={(e) => setMethodKind(e.target.value as "standard" | "named")}
            className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
          >
            <option value="standard">Standard</option>
            <option value="named">Named</option>
          </select>
          {methodKind === "standard" ? (
            <select
              value={standardMethod}
              onChange={(e) => setStandardMethod(e.target.value as (typeof STANDARD_POWERFUL_DENIZEN_METHODS)[number])}
              className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
            >
              {STANDARD_POWERFUL_DENIZEN_METHODS.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          ) : (
            <>
              <input value={namedMethod} onChange={(e) => setNamedMethod(e.target.value)} placeholder="Name" className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1" />
              <input value={namedMethodDescription} onChange={(e) => setNamedMethodDescription(e.target.value)} placeholder="Description" className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1" />
            </>
          )}
          <button
            disabled={pending}
            onClick={() => onAddMethod(
              methodKind === "standard"
                ? { kind: "standard", method: standardMethod }
                : { kind: "named", name: namedMethod, description: namedMethodDescription.trim() === "" ? null : namedMethodDescription },
            )}
            className="text-xs px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg"
          >
            Add method
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Truths</p>
        {profile.truths.map((truth) => (
          <div key={truth.truthId} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span className="flex-1">{truth.text}</span>
            <button
              disabled={pending}
              onClick={() => {
                const next = window.prompt("Truth text", truth.text);
                if (next == null) return;
                onUpdateTruth(truth.truthId, truth.text, next);
              }}
              className="text-slate-500"
            >
              Edit
            </button>
            <button disabled={pending} onClick={() => onRemoveTruth(truth)} className="text-red-600 dark:text-red-400">
              Remove
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input value={truthDraft} onChange={(e) => setTruthDraft(e.target.value)} placeholder="New Truth" className="flex-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1" />
          <button
            disabled={pending}
            onClick={() => {
              if (truthDraft.trim() === "") return;
              onAddTruth(truthDraft);
              setTruthDraft("");
            }}
            className="text-xs px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg"
          >
            Add Truth
          </button>
        </div>
      </div>
    </div>
  );
}

export function CampaignTaxonomyPanel({
  campaignId,
  taxonomies,
  pending,
  setPending,
  setError,
}: {
  readonly campaignId: string;
  readonly taxonomies: readonly CampaignTaxonomyRef[];
  readonly pending: boolean;
  readonly setPending: (value: boolean) => void;
  readonly setError: (value: string | null) => void;
}) {
  const createCampaignPowerfulDenizenTaxonomy = useMutation(api.m3Commands.createCampaignPowerfulDenizenTaxonomy);
  const updateCampaignPowerfulDenizenTaxonomy = useMutation(api.m3Commands.updateCampaignPowerfulDenizenTaxonomy);
  const removeCampaignPowerfulDenizenTaxonomy = useMutation(api.m3Commands.removeCampaignPowerfulDenizenTaxonomy);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function run(fn: () => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.message ?? "Mutation failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-slate-300 dark:border-slate-600 p-4 bg-slate-50 dark:bg-slate-800 flex flex-col gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Taxonomy name" className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1" />
        <button
          disabled={pending}
          onClick={() => run(async () => {
            await createCampaignPowerfulDenizenTaxonomy({
              commandId: commandId(),
              expectedCampaignId: campaignId,
              taxonomyId: `pdtax_${crypto.randomUUID()}`,
              name,
              description: description.trim() === "" ? null : description,
            });
            setName("");
            setDescription("");
          })}
          className="text-xs font-medium rounded-lg px-3 py-1.5 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 disabled:opacity-50"
        >
          Create taxonomy
        </button>
      </div>
      {taxonomies.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">No campaign taxonomies.</p>
      ) : taxonomies.map((taxonomy) => (
        <div key={taxonomy.taxonomyId} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-2">
          <div className="flex-1">
            <p className="font-medium text-slate-800 dark:text-slate-100">{taxonomy.name}</p>
            {taxonomy.description !== null && (
              <p className="text-sm text-slate-600 dark:text-slate-300">{taxonomy.description}</p>
            )}
          </div>
          <button
            disabled={pending}
            onClick={() => {
              const nextName = window.prompt("Taxonomy name", taxonomy.name);
              if (nextName == null) return;
              void run(() => updateCampaignPowerfulDenizenTaxonomy({
                commandId: commandId(),
                expectedCampaignId: campaignId,
                taxonomyId: taxonomy.taxonomyId,
                fields: { name: { expected: taxonomy.name, value: nextName } },
              }));
            }}
            className="text-xs text-slate-500"
          >
            Edit
          </button>
          <button
            disabled={pending}
            onClick={() => run(() => removeCampaignPowerfulDenizenTaxonomy({
              commandId: commandId(),
              expectedCampaignId: campaignId,
              taxonomyId: taxonomy.taxonomyId,
              expectedTaxonomy: taxonomy as never,
            }))}
            className="text-xs text-red-600 dark:text-red-400"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

export function TreasurePanel({
  campaignId,
  treasures,
  denizens,
  places,
  wizards,
  pending,
  setPending,
  setError,
}: {
  readonly campaignId: string;
  readonly treasures: readonly TreasureRef[];
  readonly denizens: readonly DenizenRef[];
  readonly places: readonly PlaceRef[];
  readonly wizards: readonly { wizardId: string; name: string }[];
  readonly pending: boolean;
  readonly setPending: (value: boolean) => void;
  readonly setError: (value: string | null) => void;
}) {
  const createTreasure = useMutation(api.m3Commands.createTreasure);
  const updateTreasureDetails = useMutation(api.m3Commands.updateTreasureDetails);
  const updateTreasureState = useMutation(api.m3Commands.updateTreasureState);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [custodyKey, setCustodyKey] = useState("unlocated");

  async function run(fn: () => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.message ?? "Mutation failed.");
    } finally {
      setPending(false);
    }
  }

  function parseCustody(key: string): TreasureCustodyRef {
    if (key === "none") return { kind: "none" };
    if (key === "unlocated") return { kind: "unlocated" };
    if (key === "devil") return { kind: "devil" };
    if (key.startsWith("place:")) return { kind: "place", placeId: key.slice("place:".length) };
    if (key.startsWith("wizard:")) return { kind: "subject", subject: { kind: "wizard", wizardId: key.slice("wizard:".length) } };
    if (key.startsWith("denizen:")) return { kind: "subject", subject: { kind: "denizen", denizenId: key.slice("denizen:".length) } };
    return { kind: "unlocated" };
  }

  function custodyKeyOf(custody: TreasureCustodyRef): string {
    if (custody.kind === "none") return "none";
    if (custody.kind === "unlocated") return "unlocated";
    if (custody.kind === "devil") return "devil";
    if (custody.kind === "place") return `place:${custody.placeId}`;
    if (custody.subject.kind === "wizard") return `wizard:${custody.subject.wizardId}`;
    return `denizen:${custody.subject.denizenId}`;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-slate-300 dark:border-slate-600 p-4 bg-slate-50 dark:bg-slate-800 flex flex-col gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Treasure name" className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1" />
        <select value={custodyKey} onChange={(e) => setCustodyKey(e.target.value)} className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1">
          <option value="unlocated">Unlocated</option>
          <option value="none">None</option>
          <option value="devil">Devil</option>
          {wizards.map((wizard) => (
            <option key={wizard.wizardId} value={`wizard:${wizard.wizardId}`}>Wizard: {wizard.name}</option>
          ))}
          {denizens.map((denizen) => (
            <option key={denizen.denizenId} value={`denizen:${denizen.denizenId}`}>Denizen: {denizen.name}</option>
          ))}
          {places.map((place) => (
            <option key={place.placeId} value={`place:${place.placeId}`}>Place: {place.name}</option>
          ))}
        </select>
        <button
          disabled={pending}
          onClick={() => run(async () => {
            await createTreasure({
              commandId: commandId(),
              expectedCampaignId: campaignId,
              treasureId: `trs_${crypto.randomUUID()}`,
              name,
              description: description.trim() === "" ? null : description,
              condition: "intact",
              custody: parseCustody(custodyKey),
            });
            setName("");
            setDescription("");
            setCustodyKey("unlocated");
          })}
          className="text-xs font-medium rounded-lg px-3 py-1.5 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 disabled:opacity-50"
        >
          Create treasure
        </button>
      </div>
      {treasures.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">No Treasures.</p>
      ) : treasures.map((treasure) => (
        <div key={treasure.treasureId} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-800 dark:text-slate-100">{treasure.name}</p>
            <span className="text-xs text-slate-400">{treasure.condition}</span>
            <button
              disabled={pending}
              onClick={() => {
                const nextName = window.prompt("Treasure name", treasure.name);
                if (nextName == null) return;
                void run(() => updateTreasureDetails({
                  commandId: commandId(),
                  expectedCampaignId: campaignId,
                  treasureId: treasure.treasureId,
                  fields: { name: { expected: treasure.name, value: nextName } },
                }));
              }}
              className="ml-auto text-xs text-slate-500"
            >
              Edit name
            </button>
          </div>
          {treasure.description !== null && (
            <p className="text-sm text-slate-600 dark:text-slate-300">{treasure.description}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              disabled={pending}
              value={treasure.condition}
              onChange={(e) => {
                const condition = e.target.value as TreasureRef["condition"];
                const custody = condition === "destroyed" ? { kind: "none" as const } : treasure.custody;
                void run(() => updateTreasureState({
                  commandId: commandId(),
                  expectedCampaignId: campaignId,
                  treasureId: treasure.treasureId,
                  expected: { condition: treasure.condition, custody: treasure.custody },
                  next: { condition, custody },
                }));
              }}
              className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
            >
              <option value="intact">Intact</option>
              <option value="destroyed">Destroyed</option>
            </select>
            <select
              disabled={pending || treasure.condition === "destroyed"}
              value={custodyKeyOf(treasure.custody)}
              onChange={(e) => {
                void run(() => updateTreasureState({
                  commandId: commandId(),
                  expectedCampaignId: campaignId,
                  treasureId: treasure.treasureId,
                  expected: { condition: treasure.condition, custody: treasure.custody },
                  next: { condition: treasure.condition, custody: parseCustody(e.target.value) },
                }));
              }}
              className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
            >
              <option value="unlocated">Unlocated</option>
              <option value="none">None</option>
              <option value="devil">Devil</option>
              {wizards.map((wizard) => (
                <option key={wizard.wizardId} value={`wizard:${wizard.wizardId}`}>Wizard: {wizard.name}</option>
              ))}
              {denizens.map((denizen) => (
                <option key={denizen.denizenId} value={`denizen:${denizen.denizenId}`}>Denizen: {denizen.name}</option>
              ))}
              {places.map((place) => (
                <option key={place.placeId} value={`place:${place.placeId}`}>Place: {place.name}</option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}
