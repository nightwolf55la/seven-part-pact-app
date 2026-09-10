import type { PactFragmentOperationalState, WizardId } from "../shared/domain";
import type { PactSeatId } from "../shared/domain/pact-seats";

export interface PactFragmentWizardOption {
  readonly wizardId: string;
  readonly name: string;
}

export function PactFragmentControls({
  seatId,
  fragment,
  wizards,
  pending,
  onSave,
}: {
  readonly seatId: PactSeatId;
  readonly fragment: PactFragmentOperationalState;
  readonly wizards: readonly PactFragmentWizardOption[];
  readonly pending: boolean;
  readonly onSave: (next: PactFragmentOperationalState) => Promise<void>;
}) {
  const custodyKind =
    fragment.custody.kind === "wizard"
      ? "wizard"
      : fragment.custody.kind;
  const wizardId = fragment.custody.kind === "wizard" ? fragment.custody.wizardId : "";

  async function commit(condition: PactFragmentOperationalState["condition"], kind: string, nextWizardId: string) {
    const custody: PactFragmentOperationalState["custody"] =
      kind === "wizard"
        ? { kind: "wizard", wizardId: nextWizardId as WizardId }
        : kind === "devil"
          ? { kind: "devil" }
          : kind === "unlocated"
            ? { kind: "unlocated" }
            : { kind: "none" };
    await onSave({ condition, custody });
  }

  return (
    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
      <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
        Pact-Fragment condition
        <select
          disabled={pending}
          value={fragment.condition}
          onChange={(e) => {
            const condition = e.target.value as PactFragmentOperationalState["condition"];
            const nextKind = condition === "destroyed" ? "none" : custodyKind;
            void commit(condition, nextKind, wizardId);
          }}
          className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-slate-700 dark:text-slate-200"
        >
          <option value="intact">Intact</option>
          <option value="damaged">Damaged</option>
          <option value="destroyed">Destroyed</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
        Pact-Fragment custody
        <select
          disabled={pending || fragment.condition === "destroyed"}
          value={custodyKind === "wizard" ? `wizard:${wizardId}` : custodyKind}
          onChange={(e) => {
            const value = e.target.value;
            if (value.startsWith("wizard:")) {
              void commit(fragment.condition, "wizard", value.slice("wizard:".length));
              return;
            }
            void commit(fragment.condition, value, wizardId);
          }}
          className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-slate-700 dark:text-slate-200"
        >
          <option value="none">None</option>
          <option value="devil">Devil</option>
          <option value="unlocated">Unlocated</option>
          {wizards.map((wizard) => (
            <option key={wizard.wizardId} value={`wizard:${wizard.wizardId}`}>
              Wizard: {wizard.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
