import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api.js";
import type { DenizenId } from "../shared/domain";
import type {
  SorcererBoardReference,
  SorcererBoardResearchPosition,
  SorcererKnowledgePoolId,
  SorcererResearcherRefocusDestination,
  SorcererTowerMagicConsumableDirection,
} from "../shared/domain";
import LoreContextPanel from "./LoreContextPanel";
import { findPresentationSubjectByRef, type LoreCompendiumUiState } from "./lore-view-model";
import SorcererResearchOutposts, {
  LEFT_RESEARCH_OUTPOST_GROUPS,
  RIGHT_RESEARCH_OUTPOST_GROUPS,
} from "./SorcererResearchOutposts";
import SorcererTowerBoard from "./SorcererTowerBoard";
import {
  buildAdjustKnowledgePayload,
  buildMoveConsumablePayload,
  buildRecruitStudentPayload,
  buildRefocusToAcademicPayload,
  buildRefocusToPositionPayload,
  buildTutorPayload,
  consumableItemKey,
  knowledgePoolPresentation,
  newCommandId,
  newDenizenId,
  reagentPresentation,
  resolveTransferSelection,
  schoolPresentation,
  sorcererMutationErrorMessage,
  towerConsumableCount,
  transferableConsumableOptions,
} from "./sorcerer-view-model";

const btnClass =
  "text-xs font-medium rounded-md px-2.5 py-1.5 bg-[#7F6000] text-[#FFF8E7] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7F6000]";
const ghostBtn =
  "text-xs rounded-md px-2 py-1 border border-[#BF9000]/70 bg-[#FFF8E7] text-[#3d2a00] hover:bg-[#FFE599] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7F6000]";
const fieldClass =
  "mt-1 w-full rounded-md border border-[#BF9000]/50 bg-[#FFFDF5] px-2 py-1.5 text-sm text-[#3d2a00]";

export default function SorcererSurface({
  presentation,
  campaignId,
  layout = "full",
  loreCompendium,
}: {
  readonly presentation: SorcererBoardReference;
  readonly campaignId: string;
  readonly layout?: "full" | "narrow";
  readonly loreCompendium: LoreCompendiumUiState;
}) {
  const recruitPersonnel = useMutation(api.m3Commands.recruitSorcererPersonnel);
  const refocusResearcher = useMutation(api.m3Commands.refocusSorcererResearcher);
  const tutorStudent = useMutation(api.m3Commands.tutorSorcererStudent);
  const setOperational = useMutation(api.m3Commands.setSorcererResearcherOperationalThisMonth);
  const adjustKnowledge = useMutation(api.m3Commands.adjustSorcererKnowledge);
  const setArchivesOpen = useMutation(api.m3Commands.setSorcererArchivesOpen);
  const moveConsumable = useMutation(api.m3Commands.moveSorcererTowerMagicConsumable);

  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [knowledgeDrafts, setKnowledgeDrafts] = useState<Partial<Record<SorcererKnowledgePoolId, number>>>({});
  const [openKnowledgePool, setOpenKnowledgePool] = useState<SorcererKnowledgePoolId | null>(null);
  const [takeItemKey, setTakeItemKey] = useState<string | null>(null);
  const [takeWizardId, setTakeWizardId] = useState<string>(presentation.wizardConsumables[0]?.wizardId ?? "");
  const [takeAmount, setTakeAmount] = useState(1);
  const [returnMode, setReturnMode] = useState(false);
  const [loreOpen, setLoreOpen] = useState<"spyrholm" | "tower" | null>(null);

  async function handleAction(action: () => Promise<unknown>): Promise<boolean> {
    setPending(true);
    setActionError(null);
    try {
      await action();
      return true;
    } catch (error) {
      setActionError(sorcererMutationErrorMessage(error));
      return false;
    } finally {
      setPending(false);
    }
  }

  if (!presentation.initialized) {
    return (
      <section className="rounded-xl border border-[#BF9000]/40 bg-[#FFF2CC] p-6 text-[#3d2a00]">
        <h2 className="text-lg font-semibold">Working Tower</h2>
        <p className="text-sm mt-2">The Sorcerer has not been established for this campaign yet.</p>
      </section>
    );
  }

  const pools = knowledgePoolPresentation(presentation.knowledge);
  const spyrholmLore = loreCompendium.status === "ready" && presentation.spyrholm !== null
    ? findPresentationSubjectByRef(loreCompendium.presentation, {
        kind: "isle",
        isleId: presentation.spyrholm.isleId,
      })
    : undefined;
  const towerLore = loreCompendium.status === "ready" && presentation.tower !== null
    ? findPresentationSubjectByRef(loreCompendium.presentation, {
        kind: "place",
        placeId: presentation.tower.placeId,
      })
    : undefined;

  const selectedDirection: SorcererTowerMagicConsumableDirection = returnMode ? "wizard_to_tower" : "tower_to_wizard";
  const transferOptions = transferableConsumableOptions({
    direction: selectedDirection,
    towerTomes: presentation.towerTomes,
    towerReagents: presentation.towerReagents,
    wizardConsumables: presentation.wizardConsumables,
    wizardId: takeWizardId,
  });
  const selectedKey = resolveTransferSelection(transferOptions, takeItemKey);
  const selectedOption = transferOptions.find((option) => option.key === selectedKey) ?? null;
  const selectedItem = selectedOption?.item ?? null;
  const selectedTowerCount = selectedItem === null
    ? 0
    : selectedItem.kind === "tome"
      ? towerConsumableCount(presentation.towerTomes, selectedItem)
      : towerConsumableCount(presentation.towerReagents, selectedItem);
  const maxTake = selectedOption?.count ?? 0;
  const selectedWizard = presentation.wizardConsumables.find((wizard) => wizard.wizardId === takeWizardId);

  const archivesAndLore = (
    <div className="flex flex-wrap items-start gap-3">
      <div className="rounded-md border border-[#BF9000] bg-[#FFF8E7] px-3 py-2">
        <p className="text-sm font-semibold text-[#3d2a00]">
          {presentation.archivesOpen ? "Archives Open" : "Archives Closed"}
        </p>
        <p className="text-[11px] text-[#5c4300]">Declared during Wizardmoot</p>
        <button
          type="button"
          className={`${ghostBtn} mt-2`}
          disabled={pending}
          onClick={() => handleAction(() => setArchivesOpen({
            commandId: newCommandId(),
            expectedCampaignId: campaignId,
            expectedArchivesOpen: presentation.archivesOpen,
            archivesOpen: !presentation.archivesOpen,
          }))}
        >
          {presentation.archivesOpen ? "Close Archives" : "Open Archives"}
        </button>
      </div>
      <div className="space-y-1">
        {spyrholmLore !== undefined && (
          <details open={loreOpen === "spyrholm"} onToggle={(event) => setLoreOpen(event.currentTarget.open ? "spyrholm" : null)}>
            <summary className="text-xs cursor-pointer text-[#3d2a00]">Spyrholm Lore</summary>
            <div className="mt-2 max-w-md">
              <LoreContextPanel subject={spyrholmLore} campaignId={campaignId} compact />
            </div>
          </details>
        )}
        {towerLore !== undefined && (
          <details open={loreOpen === "tower"} onToggle={(event) => setLoreOpen(event.currentTarget.open ? "tower" : null)}>
            <summary className="text-xs cursor-pointer text-[#3d2a00]">Tower Lore</summary>
            <div className="mt-2 max-w-md">
              <LoreContextPanel subject={towerLore} campaignId={campaignId} compact />
            </div>
          </details>
        )}
      </div>
    </div>
  );

  const workbench = (
    <section aria-label="Tower resources" className="rounded-xl border-2 border-[#BF9000] bg-[#FFF8E7] p-4">
      <h2 className="text-sm font-semibold text-[#3d2a00] mb-3">Knowledge, Tomes, and Reagents</h2>
      <div className={layout === "full" ? "grid grid-cols-3 gap-4" : "space-y-4"}>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5c4300] mb-2">Knowledge</h3>
          <ul className="space-y-2">
            {pools.map((pool) => (
              <li key={pool.pool} className="rounded-md border border-[#BF9000] bg-[#FFFDF5] px-2 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-[#3d2a00]">{pool.label}</p>
                    <p className="text-lg font-semibold text-[#3d2a00]" aria-label={`${pool.label} ${pool.amount}`}>
                      <span
                        className="inline-block min-w-[1.75rem] rounded-sm border border-[#BF9000] bg-[#FFF2CC] px-1 text-center"
                        style={{ clipPath: "polygon(12% 0, 100% 0, 100% 100%, 0 100%, 0 12%)" }}
                      >
                        {pool.amount}
                      </span>
                    </p>
                  </div>
                  <button type="button" className={ghostBtn} onClick={() => {
                    setOpenKnowledgePool(pool.pool);
                    setKnowledgeDrafts((current) => ({ ...current, [pool.pool]: pool.amount }));
                  }}>
                    Adjust
                  </button>
                </div>
                {openKnowledgePool === pool.pool && (
                  <form
                    className="mt-2 space-y-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const amount = knowledgeDrafts[pool.pool] ?? pool.amount;
                      handleAction(() => adjustKnowledge({
                        commandId: newCommandId(),
                        expectedCampaignId: campaignId,
                        ...buildAdjustKnowledgePayload({
                          pool: pool.pool,
                          expectedAmount: pool.amount,
                          amount,
                        }),
                      })).then((ok) => {
                        if (ok) setOpenKnowledgePool(null);
                      });
                    }}
                  >
                    <label className="block text-xs">
                      New amount
                      <input
                        type="number"
                        min={0}
                        className={fieldClass}
                        value={knowledgeDrafts[pool.pool] ?? pool.amount}
                        onChange={(event) => setKnowledgeDrafts((current) => ({
                          ...current,
                          [pool.pool]: Number(event.target.value),
                        }))}
                      />
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className={ghostBtn}
                        onClick={() => setKnowledgeDrafts((current) => ({
                          ...current,
                          [pool.pool]: Math.max(0, (current[pool.pool] ?? pool.amount) - 1),
                        }))}
                      >
                        −
                      </button>
                      <button
                        type="button"
                        className={ghostBtn}
                        onClick={() => setKnowledgeDrafts((current) => ({
                          ...current,
                          [pool.pool]: (current[pool.pool] ?? pool.amount) + 1,
                        }))}
                      >
                        +
                      </button>
                      <button type="submit" className={btnClass} disabled={pending}>Save</button>
                    </div>
                    {actionError !== null && <p className="text-xs text-[#990000]" role="alert">{actionError}</p>}
                  </form>
                )}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-[#5c4300] mt-2">
            Researcher output this month ×{presentation.knowledge.researcherProductionMultiplierCurrent}
            {" · "}
            next month ×{presentation.knowledge.researcherProductionMultiplierNextMonth}
          </p>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5c4300] mb-2">Tower Tomes</h3>
          <ul className="flex flex-wrap gap-2">
            {presentation.towerTomes.map((stack) => {
              const meta = schoolPresentation(stack.school, stack.schoolLabel);
              const key = consumableItemKey({ kind: "tome", school: stack.school });
              const selected = !returnMode && selectedKey === key;
              return (
                <li key={key}>
                  <button
                    type="button"
                    className={`h-16 w-16 rounded-sm border-2 text-center ${selected ? "border-[#7F6000] ring-2 ring-[#7F6000]/40" : "border-[#BF9000]"} bg-[#FFE599]`}
                    onClick={() => {
                      if (!returnMode) setTakeItemKey(key);
                    }}
                    aria-label={`${meta.name} tome, ${stack.count} in the Tower`}
                  >
                    <span aria-hidden="true" className="block text-lg leading-none">{meta.glyph}</span>
                    <span className="block text-[10px] leading-tight">{meta.name}</span>
                    <span className="block text-xs font-semibold">{stack.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5c4300] mb-2">Tower Reagents</h3>
          <ul className="flex flex-wrap gap-2">
            {presentation.towerReagents.map((stack) => {
              const meta = reagentPresentation(stack.reagentId);
              const key = consumableItemKey({ kind: "reagent", reagentId: stack.reagentId });
              const selected = !returnMode && selectedKey === key;
              return (
                <li key={key}>
                  <button
                    type="button"
                    className={`h-16 w-16 rounded-full border-2 text-center ${selected ? "ring-2 ring-[#7F6000]/40" : ""}`}
                    style={{ background: meta.fill, borderColor: meta.border, color: meta.ink }}
                    onClick={() => {
                      if (!returnMode) setTakeItemKey(key);
                    }}
                    aria-label={`${meta.name} reagent, ${stack.count} in the Tower`}
                  >
                    <span aria-hidden="true" className="block text-lg leading-none">{meta.glyph}</span>
                    <span className="block text-[10px] leading-tight">{meta.name}</span>
                    <span className="block text-xs font-semibold">{stack.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <button
          type="button"
          className={ghostBtn}
          onClick={() => {
            setReturnMode(!returnMode);
            setTakeItemKey(null);
          }}
        >
          {returnMode ? "Take from Tower" : "Return to Tower"}
        </button>
        {returnMode && (
          <div className="rounded-md border border-[#BF9000] bg-[#FFFDF5] p-3 space-y-2">
            <p className="text-sm font-semibold text-[#3d2a00]">Return to Tower</p>
            <label className="block text-xs">
              Wizard
              <select
                className={fieldClass}
                value={takeWizardId}
                onChange={(event) => {
                  setTakeWizardId(event.target.value);
                  setTakeItemKey(null);
                }}
              >
                {presentation.wizardConsumables.map((wizard) => (
                  <option key={wizard.wizardId} value={wizard.wizardId}>{wizard.wizardName}</option>
                ))}
              </select>
            </label>
            <p className="text-xs text-[#5c4300]">
              {selectedWizard === undefined
                ? "Choose a Wizard who holds Tomes or Reagents."
                : `Items held by ${selectedWizard.wizardName}.`}
            </p>
            <ul className="flex flex-wrap gap-2">
              {transferOptions.map((option) => {
                const meta = option.item.kind === "tome"
                  ? schoolPresentation(option.item.school, option.label)
                  : reagentPresentation(option.item.reagentId);
                const heldBy = selectedWizard?.wizardName ?? "the chosen Wizard";
                const kindLabel = option.item.kind === "tome" ? "tome" : "reagent";
                return (
                  <li key={option.key}>
                    <button
                      type="button"
                      className={option.item.kind === "tome"
                        ? `h-16 w-16 rounded-sm border-2 text-center ${selectedKey === option.key ? "border-[#7F6000] ring-2 ring-[#7F6000]/40" : "border-[#BF9000]"} bg-[#FFE599]`
                        : `h-16 w-16 rounded-full border-2 text-center ${selectedKey === option.key ? "ring-2 ring-[#7F6000]/40" : ""}`}
                      style={option.item.kind === "reagent" ? {
                        background: reagentPresentation(option.item.reagentId).fill,
                        borderColor: reagentPresentation(option.item.reagentId).border,
                        color: reagentPresentation(option.item.reagentId).ink,
                      } : undefined}
                      onClick={() => setTakeItemKey(option.key)}
                      aria-label={`${meta.name} ${kindLabel}, ${option.count} held by ${heldBy}`}
                    >
                      <span aria-hidden="true" className="block text-lg leading-none">{meta.glyph}</span>
                      <span className="block text-[10px] leading-tight">{meta.name}</span>
                      <span className="block text-xs font-semibold">{option.count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {transferOptions.length === 0 && (
              <p className="text-xs text-[#5c4300]">This Wizard has no Tomes or Reagents to return.</p>
            )}
          </div>
        )}
        {selectedItem !== null && (
          <form
            className="rounded-md border border-[#BF9000] bg-[#FFFDF5] p-3 space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (takeWizardId.length === 0 || takeAmount < 1) return;
              handleAction(() => moveConsumable({
                commandId: newCommandId(),
                expectedCampaignId: campaignId,
                ...buildMoveConsumablePayload({
                  direction: selectedDirection,
                  wizardId: takeWizardId as never,
                  item: selectedItem,
                  amount: takeAmount,
                  towerCount: selectedTowerCount,
                  wizardConsumables: presentation.wizardConsumables,
                }),
              }));
            }}
          >
            {!returnMode && (
              <>
                <p className="text-sm font-semibold text-[#3d2a00]">Take from Tower</p>
                <label className="block text-xs">
                  Wizard
                  <select className={fieldClass} value={takeWizardId} onChange={(event) => setTakeWizardId(event.target.value)}>
                    {presentation.wizardConsumables.map((wizard) => (
                      <option key={wizard.wizardId} value={wizard.wizardId}>{wizard.wizardName}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <label className="block text-xs">
              Amount
              <input
                type="number"
                min={1}
                max={Math.max(1, maxTake)}
                className={fieldClass}
                value={takeAmount}
                onChange={(event) => setTakeAmount(Number(event.target.value))}
              />
            </label>
            <p className="text-xs text-[#5c4300]">
              {returnMode
                ? `Return ${takeAmount} from the chosen Wizard to the Tower.`
                : `Take ${takeAmount} from the Tower for the chosen Wizard.`}
            </p>
            <button type="submit" className={btnClass} disabled={pending || takeAmount < 1 || takeAmount > maxTake || maxTake === 0}>
              Save
            </button>
            {actionError !== null && <p className="text-xs text-[#990000]" role="alert">{actionError}</p>}
          </form>
        )}
      </div>
    </section>
  );

  const tower = (
    <SorcererTowerBoard
      presentation={presentation}
      layout={layout}
      actionError={actionError}
      pending={pending}
      onRecruitStudent={async (name, description) => {
        const payload = buildRecruitStudentPayload({
          denizenId: newDenizenId(),
          name,
          description,
          towerOrder: presentation.towerOrder,
        });
        const ok = await handleAction(() => recruitPersonnel({
          commandId: newCommandId(),
          expectedCampaignId: campaignId,
          subject: payload.subject,
          destination: payload.destination,
          expectedTowerOrder: [...payload.expectedTowerOrder],
        }));
        if (!ok) throw new Error("recruit failed");
      }}
      onTutorStudent={async (denizenId, destination, nextAcademicOrder) => {
        const payload = buildTutorPayload({
          denizenId,
          occupants: presentation.towerOccupants,
          destination,
          nextAcademicOrder,
        });
        const ok = await handleAction(() => tutorStudent({
          commandId: newCommandId(),
          expectedCampaignId: campaignId,
          denizenId: payload.denizenId,
          destination: payload.destination,
          expectedTowerOrder: [...payload.expectedTowerOrder],
          expectedAcademicOrder: [...payload.expectedAcademicOrder],
          nextAcademicOrder: [...payload.nextAcademicOrder],
        }));
        if (!ok) throw new Error("tutor failed");
      }}
    />
  );

  const outpostProps = {
    presentation,
    campaignId,
    loreCompendium,
    layout,
    pending,
    actionError,
    onSetOperational: async (denizenId: DenizenId, expected: boolean, next: boolean) => {
      const ok = await handleAction(() => setOperational({
        commandId: newCommandId(),
        expectedCampaignId: campaignId,
        denizenId,
        expectedOperationalThisMonth: expected,
        operationalThisMonth: next,
      }));
      if (!ok) throw new Error("operational update failed");
    },
    onRefocusPosition: async (
      denizenId: DenizenId,
      expectedPositionId: SorcererBoardResearchPosition["positionId"],
      destinationPositionId: SorcererBoardResearchPosition["positionId"],
    ) => {
      const payload = buildRefocusToPositionPayload({
        denizenId,
        expectedPositionId,
        destinationPositionId,
      });
      const ok = await handleAction(() => refocusResearcher({
        commandId: newCommandId(),
        expectedCampaignId: campaignId,
        ...payload,
      }));
      if (!ok) throw new Error("refocus failed");
    },
    onPromoteAcademic: async (
      denizenId: DenizenId,
      expectedPositionId: SorcererBoardResearchPosition["positionId"],
      destination: Exclude<SorcererResearcherRefocusDestination, { kind: "research_position" }>,
      insertionIndex: number,
    ) => {
      const payload = buildRefocusToAcademicPayload({
        denizenId,
        expectedPositionId,
        destination,
        occupants: presentation.towerOccupants,
        insertionIndex,
      });
      const ok = await handleAction(() => refocusResearcher({
        commandId: newCommandId(),
        expectedCampaignId: campaignId,
        denizenId: payload.denizenId,
        expectedPositionId: payload.expectedPositionId,
        destination: payload.destination,
        expectedTowerOrder: [...payload.expectedTowerOrder],
        nextAcademicOrder: [...payload.nextAcademicOrder],
      }));
      if (!ok) throw new Error("promotion failed");
    },
  };

  const laws = presentation.laws.length === 0 ? null : (
    <details className="text-[#3d2a00]">
      <summary className="text-xs cursor-pointer">Laws of Magic</summary>
      <ul className="mt-2 space-y-1 text-xs">
        {presentation.laws.filter((law) => law.status === "active").map((law) => (
          <li key={law.lawId}>{law.applicationLabel}</li>
        ))}
      </ul>
    </details>
  );

  if (layout === "narrow") {
    return (
      <div className="space-y-4 rounded-xl bg-[#FFF2CC] p-3 text-[#3d2a00]">
        <p className="text-lg font-semibold">Working Tower</p>
        {tower}
        {workbench}
        <SorcererResearchOutposts {...outpostProps} />
        {archivesAndLore}
        {laws}
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#FFF2CC] p-4 text-[#3d2a00]">
      <div className="flex items-start justify-between gap-4 mb-4">
        <p className="text-xl font-semibold">Working Tower</p>
        {archivesAndLore}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)_minmax(0,1fr)] gap-3 items-start">
        <div className="min-w-0">
          <SorcererResearchOutposts {...outpostProps} groupIds={LEFT_RESEARCH_OUTPOST_GROUPS} />
        </div>
        <div className="min-h-[44rem] min-w-0 flex justify-center">{tower}</div>
        <div className="min-w-0">
          <SorcererResearchOutposts {...outpostProps} groupIds={RIGHT_RESEARCH_OUTPOST_GROUPS} />
        </div>
      </div>
      <div className="mt-4">{workbench}</div>
      <div className="mt-3">{laws}</div>
    </div>
  );
}
