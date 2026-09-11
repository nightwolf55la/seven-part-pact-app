import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api.js";
import {
  generateLoreCollectionId,
  generateLoreEntryId,
  LORE_PROVENANCE_ADDED_IN_PLAY,
  LORE_PROVENANCE_CHANGED_IN_PLAY,
  type LorePresentationContext,
  type LorePresentationEntry,
  type LoreAddOperationDescriptor,
  type LorePresentationSubject,
} from "../shared/domain";
import {
  applyUseLatestAsBase,
  buildAddLoreEntryMutationArgs,
  buildReviseLoreEntryMutationArgs,
  filterContextsForSubject,
  initReviseEditor,
  isStaleLoreCommandError,
  LORE_EMPTY_ELIGIBLE_STATUS,
  markReviseEditorStaleFromServer,
  newLoreCommandId,
  reviseDraftUnchanged,
  syncReviseEditorWithPresentation,
  loreReviseEntryKey,
  type LoreContextConstraint,
  type ReviseEditorModel,
} from "./lore-view-model";

const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm";
const btnClass =
  "text-xs font-medium rounded-lg px-3 py-1.5 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed";
const ghostBtn =
  "text-xs rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40";

const LORE_GENERIC_SAVE_FAILURE = "Could not save Lore. Your draft has been kept.";

function contextKey(context: LorePresentationContext): string {
  return context.kind === "source"
    ? `source:${context.sourceCollectionId}`
    : `campaign:${context.collectionId}`;
}

function provenanceBadge(entry: LorePresentationEntry): string | null {
  if (entry.provenance === "changed_in_play") {
    return LORE_PROVENANCE_CHANGED_IN_PLAY;
  }
  if (entry.provenance === "added_in_play") {
    return LORE_PROVENANCE_ADDED_IN_PLAY;
  }
  return null;
}

export default function LoreContextPanel({
  subject,
  campaignId,
  compact = false,
  contextConstraint = { kind: "any" },
}: {
  readonly subject: LorePresentationSubject;
  readonly campaignId: string;
  readonly compact?: boolean;
  readonly contextConstraint?: LoreContextConstraint;
}) {
  const addLoreEntry = useMutation(api.m3Commands.addLoreEntry);
  const reviseLoreEntry = useMutation(api.m3Commands.reviseLoreEntry);

  const contexts = useMemo(
    () => filterContextsForSubject(subject, contextConstraint),
    [subject, contextConstraint],
  );
  const [selectedContextKey, setSelectedContextKey] = useState<string | null>(
    contexts.length === 1 ? contextKey(contexts[0]!) : null,
  );
  const [addContextKey, setAddContextKey] = useState<string | null>(null);
  const [addDraft, setAddDraft] = useState("");
  const [reviseEditor, setReviseEditor] = useState<ReviseEditorModel | null>(null);
  const [revealedPrinted, setRevealedPrinted] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [showAdvancedParallel, setShowAdvancedParallel] = useState(false);

  useEffect(() => {
    if (contexts.length === 1) {
      setSelectedContextKey(contextKey(contexts[0]!));
    } else if (selectedContextKey !== null && !contexts.some((c) => contextKey(c) === selectedContextKey)) {
      setSelectedContextKey(null);
    }
  }, [contexts, selectedContextKey]);

  const subjectLoreRevision = useMemo(
    () => subject.contexts.flatMap((context) => context.entries.map((entry) => entry.text)).join("\u0000"),
    [subject],
  );

  useLayoutEffect(() => {
    if (reviseEditor === null) {
      return;
    }
    setReviseEditor((current) => (current === null ? current : syncReviseEditorWithPresentation(current, subject)));
  }, [subject, subjectLoreRevision, reviseEditor?.entryKey]);

  const selectedContext = contexts.find((context) => contextKey(context) === selectedContextKey) ?? null;

  async function runMutation(action: () => Promise<void>): Promise<boolean> {
    setPending(true);
    setInlineError(null);
    try {
      await action();
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 2000);
      return true;
    } catch (error: unknown) {
      if (isStaleLoreCommandError(error)) {
        setReviseEditor((current) => {
          if (current === null) {
            return current;
          }
          return markReviseEditorStaleFromServer(current, null);
        });
        setInlineError("Lore changed while you were editing. Your draft has been kept.");
      } else {
        setInlineError(LORE_GENERIC_SAVE_FAILURE);
      }
      return false;
    } finally {
      setPending(false);
    }
  }

  async function saveAdd(descriptor: LoreAddOperationDescriptor) {
    const collectionId = generateLoreCollectionId();
    const built = buildAddLoreEntryMutationArgs({
      commandId: newLoreCommandId(),
      expectedCampaignId: campaignId,
      descriptor,
      loreEntryId: generateLoreEntryId(),
      text: addDraft,
      newCampaignCollectionId: "targetForm" in descriptor ? collectionId : undefined,
    });
    if (!built.ok) {
      setInlineError(built.message);
      return;
    }
    const ok = await runMutation(async () => {
      await addLoreEntry(built.payload);
    });
    if (ok) {
      setAddContextKey(null);
      setAddDraft("");
    }
  }

  async function saveRevise() {
    if (reviseEditor === null) {
      return;
    }
    const built = buildReviseLoreEntryMutationArgs({
      commandId: newLoreCommandId(),
      expectedCampaignId: campaignId,
      editor: reviseEditor,
    });
    if (!built.ok) {
      setInlineError(built.message);
      return;
    }
    const ok = await runMutation(async () => {
      await reviseLoreEntry(built.payload);
    });
    if (ok) {
      setReviseEditor(null);
    }
  }

  const proseClass = compact ? "text-sm leading-relaxed font-serif text-slate-800 dark:text-slate-100" : "text-base leading-relaxed font-serif text-slate-800 dark:text-slate-100";

  return (
    <div className={`space-y-4 ${compact ? "" : "rounded-xl border border-slate-200 dark:border-slate-800 p-4"}`} aria-label="Lore context panel">
      <div>
        <h2 className={`font-serif font-semibold text-slate-900 dark:text-slate-50 ${compact ? "text-lg" : "text-2xl"}`}>
          {subject.subjectLabel}
        </h2>
        {!subject.hasEffectiveLore && subject.eligibleToReceiveLore && (
          <p className="text-sm text-slate-500 mt-1">{LORE_EMPTY_ELIGIBLE_STATUS}</p>
        )}
        {savedNotice && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Saved</p>}
        {inlineError !== null && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-300 mt-2">{inlineError}</p>
        )}
      </div>

      {contexts.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lore contexts">
          {contexts.map((context) => (
            <button
              key={contextKey(context)}
              type="button"
              role="tab"
              aria-selected={selectedContextKey === contextKey(context)}
              className={`${ghostBtn} ${selectedContextKey === contextKey(context) ? "bg-slate-100 dark:bg-slate-800" : ""}`}
              onClick={() => setSelectedContextKey(contextKey(context))}
            >
              {context.contextLabel}
            </button>
          ))}
        </div>
      )}

      {(selectedContext !== null ? [selectedContext] : contexts).map((context) => (
        <section key={contextKey(context)} className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
          {contexts.length > 1 && selectedContext === null && (
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">{context.headingLabel}</h3>
          )}
          {context.kind === "source" && (
            <p className="text-xs text-slate-500">
              {context.attribution.work} · pp. {context.attribution.pages} · {context.attribution.anchor}
            </p>
          )}
          {!context.write.writable && (
            <p className="text-xs text-slate-500 mt-1" role="note">
              {context.write.reason}
            </p>
          )}
          {context.entries.length === 0 && (
            <p className="text-sm text-slate-500 italic">No Lore entries yet in this context.</p>
          )}
          {context.entries.map((entry, index) => {
            const badge = provenanceBadge(entry);
            const entryDomKey = `${contextKey(context)}:${index}`;
            const reviseKey = loreReviseEntryKey(context, entry);
            const isEditing = reviseEditor !== null && reviseKey !== null && reviseEditor.entryKey === reviseKey;
            return (
              <article key={entryDomKey} className="space-y-2 pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                {badge !== null && (
                  <span className="inline-block text-[10px] uppercase tracking-wide font-semibold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                    {badge}
                  </span>
                )}
                {isEditing && reviseEditor !== null ? (
                  <ReviseEditor
                    editor={reviseEditor}
                    setEditor={setReviseEditor}
                    pending={pending}
                    onSave={() => { void saveRevise(); }}
                    onCancel={() => setReviseEditor(null)}
                    proseClass={proseClass}
                  />
                ) : (
                  <>
                    <p className={proseClass}>{entry.text}</p>
                    {entry.provenance === "changed_in_play" && (
                      <div>
                        <button
                          type="button"
                          className={ghostBtn}
                          aria-expanded={revealedPrinted[entryDomKey] === true}
                          onClick={() => setRevealedPrinted((current) => ({ ...current, [entryDomKey]: !current[entryDomKey] }))}
                        >
                          Printed wording
                        </button>
                        {revealedPrinted[entryDomKey] && (
                          <p className={`${proseClass} mt-2 text-slate-600 dark:text-slate-300`}>{entry.printedText}</p>
                        )}
                      </div>
                    )}
                    {entry.revise !== null && (
                      <button
                        type="button"
                        className={ghostBtn}
                        onClick={() => {
                          const model = initReviseEditor(entry, context);
                          if (model !== null) {
                            setReviseEditor(model);
                            setInlineError(null);
                          }
                        }}
                      >
                        Revise
                      </button>
                    )}
                  </>
                )}
              </article>
            );
          })}

          {context.write.writable && context.ordinaryAddPath && addContextKey !== contextKey(context) && (
            <button
              type="button"
              className={btnClass}
              disabled={pending}
              onClick={() => {
                setAddContextKey(contextKey(context));
                setAddDraft("");
                setInlineError(null);
              }}
            >
              Add Lore
            </button>
          )}
          {context.write.writable && !context.ordinaryAddPath && addContextKey !== contextKey(context) && (
            <button
              type="button"
              className={ghostBtn}
              disabled={pending}
              onClick={() => {
                setAddContextKey(contextKey(context));
                setAddDraft("");
                setInlineError(null);
              }}
            >
              Add Lore
            </button>
          )}

          {addContextKey === contextKey(context) && context.write.writable && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                New Lore
                <textarea
                  aria-label="Add Lore text"
                  className={`${fieldClass} min-h-[8rem] font-serif`}
                  value={addDraft}
                  onChange={(event) => setAddDraft(event.target.value)}
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={btnClass}
                  disabled={pending}
                  onClick={() => {
                    if (!context.write.writable) return;
                    void saveAdd(context.write.add);
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  className={ghostBtn}
                  disabled={pending}
                  onClick={() => {
                    setAddContextKey(null);
                    setAddDraft("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      ))}

      {contexts.length === 0 && subject.ordinaryFirstAdd !== null && (
        <div className="space-y-2">
          <p className="text-sm text-slate-500">{LORE_EMPTY_ELIGIBLE_STATUS}</p>
          {addContextKey === "first" ? (
            <>
              <textarea
                aria-label="Add Lore text"
                className={`${fieldClass} min-h-[8rem] font-serif`}
                value={addDraft}
                onChange={(event) => setAddDraft(event.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className={btnClass}
                  disabled={pending}
                  onClick={() => {
                    void (async () => {
                      const built = buildAddLoreEntryMutationArgs({
                        commandId: newLoreCommandId(),
                        expectedCampaignId: campaignId,
                        descriptor: subject.ordinaryFirstAdd!,
                        loreEntryId: generateLoreEntryId(),
                        text: addDraft,
                        newCampaignCollectionId: generateLoreCollectionId(),
                      });
                      if (!built.ok) {
                        setInlineError(built.message);
                        return;
                      }
                      const ok = await runMutation(async () => {
                        await addLoreEntry(built.payload);
                      });
                      if (ok) {
                        setAddContextKey(null);
                        setAddDraft("");
                      }
                    })();
                  }}
                >
                  Save
                </button>
                <button type="button" className={ghostBtn} onClick={() => { setAddContextKey(null); setAddDraft(""); }}>Cancel</button>
              </div>
            </>
          ) : (
            <button type="button" className={btnClass} onClick={() => setAddContextKey("first")}>Add Lore</button>
          )}
        </div>
      )}

      {subject.advancedParallelCampaignLore !== null && !subject.advancedParallelCampaignLore.existing && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            className={ghostBtn}
            aria-expanded={showAdvancedParallel}
            onClick={() => setShowAdvancedParallel((value) => !value)}
          >
            Additional campaign Lore
          </button>
          {showAdvancedParallel && (
            <p className="text-xs text-slate-500 mt-2" data-testid="lore-advanced-parallel-help">
              Use this when you want a separate Campaign Lore section alongside the Lore already shown here.
            </p>
          )}
          {showAdvancedParallel && addContextKey !== "advanced" && (
            <button type="button" className={`${ghostBtn} mt-2`} onClick={() => setAddContextKey("advanced")}>
              Advanced
            </button>
          )}
          {showAdvancedParallel && addContextKey === "advanced" && (
            <div className="mt-2 space-y-2">
              <textarea
                aria-label="Additional campaign Lore text"
                className={`${fieldClass} min-h-[6rem] font-serif`}
                value={addDraft}
                onChange={(event) => setAddDraft(event.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className={ghostBtn}
                  disabled={pending}
                  onClick={() => {
                    void (async () => {
                      const built = buildAddLoreEntryMutationArgs({
                        commandId: newLoreCommandId(),
                        expectedCampaignId: campaignId,
                        descriptor: subject.advancedParallelCampaignLore!.add,
                        loreEntryId: generateLoreEntryId(),
                        text: addDraft,
                        newCampaignCollectionId: generateLoreCollectionId(),
                      });
                      if (!built.ok) {
                        setInlineError(built.message);
                        return;
                      }
                      const ok = await runMutation(async () => {
                        await addLoreEntry(built.payload);
                      });
                      if (ok) {
                        setAddContextKey(null);
                        setAddDraft("");
                        setShowAdvancedParallel(false);
                      }
                    })();
                  }}
                >
                  Save
                </button>
                <button type="button" className={ghostBtn} onClick={() => { setAddContextKey(null); setAddDraft(""); }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReviseEditor({
  editor,
  setEditor,
  pending,
  onSave,
  onCancel,
  proseClass,
}: {
  readonly editor: ReviseEditorModel;
  readonly setEditor: (value: ReviseEditorModel | null) => void;
  readonly pending: boolean;
  readonly onSave: () => void;
  readonly onCancel: () => void;
  readonly proseClass: string;
}) {
  const conflicted = editor.conflicted;
  return (
    <div className="space-y-2">
      {conflicted && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          <p>Lore changed while you were editing. Your draft is preserved.</p>
          {editor.latestServerText === null && (
            <p className="text-xs text-amber-800/80 dark:text-amber-100/80 mt-1">Waiting for the latest Lore text…</p>
          )}
          {editor.latestServerText !== null && (
            <>
              <p className={`${proseClass} mt-2 text-slate-700 dark:text-slate-200`}>{editor.latestServerText}</p>
              <button
                type="button"
                className={`${ghostBtn} mt-2`}
                onClick={() => setEditor(applyUseLatestAsBase(editor))}
              >
                Use latest as base
              </button>
            </>
          )}
        </div>
      )}
      <textarea
        aria-label="Revise Lore text"
        className={`${fieldClass} min-h-[8rem] font-serif`}
        value={editor.draftText}
        onChange={(event) => setEditor({ ...editor, draftText: event.target.value, conflicted: editor.conflicted })}
      />
      <div className="flex gap-2">
        <button
          type="button"
          className={btnClass}
          disabled={pending || conflicted || reviseDraftUnchanged(editor)}
          onClick={onSave}
        >
          Save
        </button>
        <button type="button" className={ghostBtn} disabled={pending} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
