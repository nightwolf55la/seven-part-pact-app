import { useState, useLayoutEffect, useRef } from "react";
import type { WizardCharacterData } from "../shared/domain/campaign-state";
import {
  formFromCharacter,
  buildCharacterPatch,
  buildNullableAssociationChange,
  buildCurrentCompanionSlots,
  isCharacterFormDirty,
  parseAgeInput,
  validateElementInputs,
  elementsTotal,
  type WizardCharacterSheetForm,
} from "./wizard-character-sheet-view-model";
import type { WorldReference } from "./WorldSurface";

const ELEMENT_FIELDS: { key: "elementsAir" | "elementsFire" | "elementsEarth" | "elementsWater"; label: string }[] = [
  { key: "elementsAir", label: "Air" },
  { key: "elementsFire", label: "Fire" },
  { key: "elementsEarth", label: "Earth" },
  { key: "elementsWater", label: "Water" },
];

export interface WizardCharacterSheetProps {
  readonly wizardId: string;
  readonly wizardName: string;
  readonly character: WizardCharacterData;
  readonly pending: boolean;
  readonly error: string | null;
  readonly onSave: (patch: Record<string, unknown>) => void;
  readonly onClose: () => void;
  readonly homeIsleId?: string | null;
  readonly sanctumPlaceId?: string | null;
  readonly worldRef?: WorldReference | null | undefined;
  readonly onSetHomeIsle?: (change: { expected: string | null; value: string | null }) => Promise<void>;
  readonly onSetSanctum?: (change: { expected: string | null; value: string | null }) => Promise<void>;
}

export default function WizardCharacterSheet({
  wizardId,
  wizardName,
  character,
  pending,
  error,
  onSave,
  onClose,
  homeIsleId,
  sanctumPlaceId,
  worldRef,
  onSetHomeIsle,
  onSetSanctum,
}: WizardCharacterSheetProps) {
  const [form, setForm] = useState<WizardCharacterSheetForm>(() => formFromCharacter(character));
  const [elementError, setElementError] = useState<string | null>(null);

  const hasWorld = onSetHomeIsle !== undefined && onSetSanctum !== undefined;

  const [homeIsleDraft, setHomeIsleDraft] = useState<string>(homeIsleId ?? "");
  const [sanctumDraft, setSanctumDraft] = useState<string>(sanctumPlaceId ?? "");
  const homeIsleBaselineRef = useRef<string | null>(homeIsleId ?? null);
  const sanctumBaselineRef = useRef<string | null>(sanctumPlaceId ?? null);
  const [assocError, setAssocError] = useState<string | null>(null);

  const syncedBaselineRef = useRef(character);
  const formRef = useRef(form);
  formRef.current = form;

  useLayoutEffect(() => {
    const dirty = isCharacterFormDirty(formRef.current, syncedBaselineRef.current);
    if (!dirty) {
      setForm(formFromCharacter(character));
      syncedBaselineRef.current = character;
    }
  }, [character]);

  function updateField<K extends keyof WizardCharacterSheetForm>(
    key: K,
    value: WizardCharacterSheetForm[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const elemValidation = validateElementInputs(
    form.elementsAir,
    form.elementsFire,
    form.elementsEarth,
    form.elementsWater,
  );
  const parsedAge = parseAgeInput(form.ageYears);
  const ageValid = form.ageYears.trim() === "" || parsedAge !== null;

  const elementsValid = elemValidation.valid;
  const canSave = !pending && elementsValid && ageValid;

  function handleSave() {
    if (!elemValidation.valid) {
      setElementError("All four Elements must be valid safe integers, or all blank.");
      return;
    }
    if (!ageValid) {
      return;
    }
    setElementError(null);
    const patch = buildCharacterPatch(form, syncedBaselineRef.current);
    if (patch === null) return;
    onSave(patch as Record<string, unknown>);
  }

  const total = elementsTotal(elemValidation.value);

  async function handleSaveHomeIsle() {
    if (!onSetHomeIsle) return;
    setAssocError(null);
    const change = buildNullableAssociationChange(homeIsleBaselineRef.current, homeIsleDraft === "" ? null : homeIsleDraft);
    if (change === null) return;
    try {
      await onSetHomeIsle(change);
      homeIsleBaselineRef.current = change.value;
    } catch (e: any) {
      setAssocError(e?.message ?? "Failed to save Home Isle");
    }
  }

  async function handleSaveSanctum() {
    if (!onSetSanctum) return;
    setAssocError(null);
    const change = buildNullableAssociationChange(sanctumBaselineRef.current, sanctumDraft === "" ? null : sanctumDraft);
    if (change === null) return;
    try {
      await onSetSanctum(change);
      sanctumBaselineRef.current = change.value;
    } catch (e: any) {
      setAssocError(e?.message ?? "Failed to save Sanctum");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {wizardName} — Character Sheet
          </h2>
          <button
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {elementError && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {elementError}
            </p>
          )}

          {/* Elements */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Elements
            </legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ELEMENT_FIELDS.map((f) => (
                <div key={f.key} className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500 dark:text-slate-400">{f.label}</label>
                  <input
                    type="number"
                    value={form[f.key]}
                    onChange={(e) => updateField(f.key, e.target.value)}
                    disabled={pending}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
                  />
                </div>
              ))}
            </div>
            {total !== null && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Total: {total}
              </p>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Creation guidance: total 8. Later values may differ.
            </p>
          </fieldset>

          {/* Pact-Fragment personal form */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Pact-Fragment personal form
            </label>
            <input
              type="text"
              value={form.pactFragmentPersonalForm}
              onChange={(e) => updateField("pactFragmentPersonalForm", e.target.value)}
              disabled={pending}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
            />
          </div>

          {/* Familiar description */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Familiar description
            </label>
            <input
              type="text"
              value={form.familiarDescription}
              onChange={(e) => updateField("familiarDescription", e.target.value)}
              disabled={pending}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
            />
          </div>

          {/* Age */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Age
            </label>
            <input
              type="number"
              value={form.ageYears}
              onChange={(e) => updateField("ageYears", e.target.value)}
              disabled={pending}
              min={0}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
            />
            {!ageValid && (
              <p className="text-xs text-red-500">Age must be a non-negative integer or blank.</p>
            )}
          </div>

          {/* Public Changes of Magic */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              PUBLIC Changes of Magic
            </label>
            <textarea
              value={form.publicChangesOfMagic}
              onChange={(e) => updateField("publicChangesOfMagic", e.target.value)}
              disabled={pending}
              rows={4}
              placeholder="One Change per line"
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 resize-y"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500">
              One Change per line. Blank lines are ignored.
            </p>
          </div>

          {/* Important Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Important Notes
            </label>
            <textarea
              value={form.importantNotes}
              onChange={(e) => updateField("importantNotes", e.target.value)}
              disabled={pending}
              rows={3}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 resize-y"
            />
          </div>

          {hasWorld && (
            <fieldset className="flex flex-col gap-3 border-t border-slate-200 dark:border-slate-700 pt-4">
              <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                World Associations
              </legend>
              {worldRef === undefined ? (
                <p className="text-xs text-slate-400">World associations loading…</p>
              ) : worldRef === null ? (
                <p className="text-xs text-slate-400">World associations unavailable.</p>
              ) : (
                <>
                  {assocError && (
                    <p className="text-sm text-red-600 dark:text-red-400">{assocError}</p>
                  )}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Home Isle</label>
                    <div className="flex items-center gap-2">
                      <select
                        value={homeIsleDraft}
                        onChange={(e) => setHomeIsleDraft(e.target.value)}
                        disabled={pending}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 flex-1"
                      >
                        <option value="">None</option>
                        {worldRef.isles.map((isle) => (
                          <option key={isle.isleId} value={isle.isleId}>{isle.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleSaveHomeIsle}
                        disabled={pending}
                        className="text-xs font-medium bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 rounded-lg px-3 py-2 hover:bg-slate-600 dark:hover:bg-slate-300 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                      >
                        Save Home Isle
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Sanctum</label>
                    <div className="flex items-center gap-2">
                      <select
                        value={sanctumDraft}
                        onChange={(e) => setSanctumDraft(e.target.value)}
                        disabled={pending}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 flex-1"
                      >
                        <option value="">None</option>
                        {worldRef.places.map((place) => (
                          <option key={place.placeId} value={place.placeId}>{place.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleSaveSanctum}
                        disabled={pending}
                        className="text-xs font-medium bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 rounded-lg px-3 py-2 hover:bg-slate-600 dark:hover:bg-slate-300 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                      >
                        Save Sanctum
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 border-t border-slate-200 dark:border-slate-700 pt-3">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Companions</label>
                    {buildCurrentCompanionSlots(
                      wizardId,
                      worldRef.denizens,
                      worldRef.companionRelationships ?? [],
                    ).map((slot) => (
                      <div key={slot.element} className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 capitalize">
                          {slot.element}
                        </span>
                        {slot.relationship === null ? (
                          <span className="text-xs text-slate-400 dark:text-slate-500">No Companion</span>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {slot.relationship.denizenName}
                            </span>
                            {slot.relationship.description !== null && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {slot.relationship.description}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </fieldset>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            disabled={pending}
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || pending}
            className="text-sm font-medium bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg px-4 py-2 hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {pending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
