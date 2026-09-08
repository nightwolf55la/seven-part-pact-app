import { useState, useLayoutEffect, useRef } from "react";
import type { WizardCharacterData } from "../shared/domain/campaign-state";
import {
  formFromCharacter,
  buildCharacterPatch,
  isCharacterFormDirty,
  parseAgeInput,
  validateElementInputs,
  elementsTotal,
  type WizardCharacterSheetForm,
} from "./wizard-character-sheet-view-model";

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
}

export default function WizardCharacterSheet({
  wizardId,
  wizardName,
  character,
  pending,
  error,
  onSave,
  onClose,
}: WizardCharacterSheetProps) {
  const [form, setForm] = useState<WizardCharacterSheetForm>(() => formFromCharacter(character));
  const [elementError, setElementError] = useState<string | null>(null);

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
