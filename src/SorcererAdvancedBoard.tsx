import { useMemo, useState, type ReactNode } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api.js";
import type {
  DenizenId,
  MagicSchoolRef,
  PactSeatId,
  SorcererArcanistPlacement,
  SorcererBoardArcanist,
  SorcererBoardReference,
  SorcererDisruptiveArcanistProfile,
  SorcererLawOfMagicId,
  SorcererPersonnelRoleDestination,
  SorcererSourceSchoolId,
} from "../shared/domain";
import {
  academicInsertionChoices,
  assembleTowerOrderFromBands,
  builtinRecipeOptions,
  canMoveWithinTowerBand,
  buildRecruitSpecializedPersonnelPayload,
  elementOptions,
  innovationEligibleSpells,
  lawCatalogOptions,
  moveWithinTowerBand,
  newCampaignAcademicKindId,
  newCampaignKnowledgeMethodId,
  newCampaignRecipeId,
  newCampaignResearchPositionId,
  newCampaignSchoolId,
  newCommandId,
  newDenizenId,
  newInnovationId,
  newTruthId,
  otherPactDomainOptions,
  sourceSchoolOptions,
  sourceSchoolSpells,
  specializedPersonnelLabel,
  towerCorrectionBands,
  vacantResearchPositions,
  type SpecializedPersonnelKind,
} from "./sorcerer-view-model";

const btnClass =
  "text-xs font-medium rounded-md px-2.5 py-1.5 bg-[#7F6000] text-[#FFF8E7] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7F6000]";
const ghostBtn =
  "text-xs rounded-md px-2 py-1 border border-[#BF9000]/70 bg-[#FFF8E7] text-[#3d2a00] hover:bg-[#FFE599] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7F6000]";
const fieldClass =
  "mt-1 w-full rounded-md border border-[#BF9000]/50 bg-[#FFFDF5] px-2 py-1.5 text-sm text-[#3d2a00]";

function placementLabel(arcanist: SorcererBoardArcanist): string {
  const placement = arcanist.placement;
  if (placement.kind === "tower") {
    return "Reliable · Tower";
  }
  const domain = otherPactDomainOptions().find((option) => option.seatId === placement.seatId);
  return `Disruptive · ${domain?.label ?? placement.seatId}`;
}

function convexDisruptiveProfile(profile: SorcererDisruptiveArcanistProfile) {
  return {
    primaryElement: profile.primaryElement,
    rank: profile.rank,
    changesOfMagic: [...profile.changesOfMagic],
    quirk: profile.quirk,
    prenticeSpellIds: [...profile.prenticeSpellIds],
  };
}

export default function SorcererAdvancedBoard({
  presentation,
  campaignId,
  layout = "full",
  pending,
  actionError,
  onAction,
}: {
  readonly presentation: SorcererBoardReference;
  readonly campaignId: string;
  readonly layout?: "full" | "narrow";
  readonly pending: boolean;
  readonly actionError: string | null;
  readonly onAction: (action: () => Promise<unknown>) => Promise<boolean>;
}) {
  const setMultipliers = useMutation(api.m3Commands.setSorcererResearcherProductionMultipliers);
  const setLaws = useMutation(api.m3Commands.setSorcererLaws);
  const createDefinition = useMutation(api.m3Commands.createSorcererCampaignDefinition);
  const updateDefinition = useMutation(api.m3Commands.updateSorcererCampaignDefinition);
  const addArcanist = useMutation(api.m3Commands.addSorcererArcanist);
  const updateArcanist = useMutation(api.m3Commands.updateSorcererArcanist);
  const addConstruct = useMutation(api.m3Commands.addSorcererConstruct);
  const setConstructInstructions = useMutation(api.m3Commands.setSorcererConstructInstructions);
  const addTruth = useMutation(api.m3Commands.addPowerfulDenizenTruth);
  const removeTruth = useMutation(api.m3Commands.removePowerfulDenizenTruth);
  const addInnovation = useMutation(api.m3Commands.addSorcererInnovation);
  const reviseInnovation = useMutation(api.m3Commands.reviseSorcererInnovation);
  const removeInnovation = useMutation(api.m3Commands.removeSorcererInnovation);
  const recruitPersonnel = useMutation(api.m3Commands.recruitSorcererPersonnel);
  const rearrangeTower = useMutation(api.m3Commands.rearrangeSorcererTower);

  const bands = towerCorrectionBands(presentation.towerOccupants);
  const [studentOrder, setStudentOrder] = useState(bands.students.map((occupant) => occupant.denizenId));
  const [academicOrder, setAcademicOrder] = useState(bands.academics.map((occupant) => occupant.denizenId));
  const [arcanistOrder, setArcanistOrder] = useState(bands.arcanists.map((occupant) => occupant.denizenId));
  const currentBandKey = `${presentation.towerOrder.join("|")}`;
  const [capturedBandKey, setCapturedBandKey] = useState(currentBandKey);
  if (capturedBandKey !== currentBandKey) {
    setCapturedBandKey(currentBandKey);
    setStudentOrder(bands.students.map((occupant) => occupant.denizenId));
    setAcademicOrder(bands.academics.map((occupant) => occupant.denizenId));
    setArcanistOrder(bands.arcanists.map((occupant) => occupant.denizenId));
  }

  const [currentMultiplier, setCurrentMultiplier] = useState(
    presentation.knowledge.researcherProductionMultiplierCurrent,
  );
  const [nextMultiplier, setNextMultiplier] = useState(
    presentation.knowledge.researcherProductionMultiplierNextMonth,
  );
  const [activeLaws, setActiveLaws] = useState<readonly SorcererLawOfMagicId[]>(presentation.laws
    .filter((law) => law.status === "active")
    .map((law) => law.lawId));
  const [unrevealedLaws, setUnrevealedLaws] = useState<readonly SorcererLawOfMagicId[]>(presentation.laws
    .filter((law) => law.status === "unrevealed")
    .map((law) => law.lawId));

  const vacantPositions = vacantResearchPositions(presentation.researchPositions);
  const insertionChoices = academicInsertionChoices(presentation.towerOccupants);
  const eligibleSpells = useMemo(() => innovationEligibleSpells(), []);
  const domainOptions = otherPactDomainOptions();

  function errorLine() {
    return actionError === null ? null : <p className="text-xs text-[#990000]" role="alert">{actionError}</p>;
  }

  return (
    <details className={`mt-4 rounded-md border border-[#BF9000]/50 bg-[#FFF8E7] ${layout === "narrow" ? "w-full" : ""}`}>
      <summary className="cursor-pointer px-3 py-2 text-sm text-[#5c4300]">
        Advanced / Correct Board
      </summary>
      <div className="space-y-3 border-t border-[#BF9000]/30 px-3 py-3 text-[#3d2a00]">
        <p className="text-[11px] text-[#5c4300]">
          Correction and rare recording only. This does not replace the Working Tower.
        </p>

        <details>
          <summary className="cursor-pointer text-xs font-semibold">Laws & Research</summary>
          <div className="mt-2 space-y-3">
            <form
              className="space-y-2 rounded-md border border-[#BF9000]/40 p-2"
              onSubmit={(event) => {
                event.preventDefault();
                onAction(() => setLaws({
                  commandId: newCommandId(),
                  expectedCampaignId: campaignId,
                  expectedActiveLawIds: presentation.laws.filter((law) => law.status === "active").map((law) => law.lawId),
                  expectedUnrevealedLawIds: presentation.laws.filter((law) => law.status === "unrevealed").map((law) => law.lawId),
                  activeLawIds: [...activeLaws],
                  unrevealedLawIds: [...unrevealedLaws],
                }));
              }}
            >
              <p className="text-xs font-medium">Laws of Magic</p>
              <p className="text-[11px] text-[#5c4300]">Record the current table-resolved Laws. This is not a reveal procedure.</p>
              <LawPicker label="Active Laws" value={activeLaws} onChange={setActiveLaws} exclude={unrevealedLaws} />
              <LawPicker label="Unrevealed Laws" value={unrevealedLaws} onChange={setUnrevealedLaws} exclude={activeLaws} />
              <button type="submit" className={btnClass} disabled={pending}>Save Laws</button>
              {errorLine()}
            </form>
            <form
              className="space-y-2 rounded-md border border-[#BF9000]/40 p-2"
              onSubmit={(event) => {
                event.preventDefault();
                onAction(() => setMultipliers({
                  commandId: newCommandId(),
                  expectedCampaignId: campaignId,
                  expectedCurrent: presentation.knowledge.researcherProductionMultiplierCurrent,
                  expectedNextMonth: presentation.knowledge.researcherProductionMultiplierNextMonth,
                  current: currentMultiplier,
                  nextMonth: nextMultiplier,
                }));
              }}
            >
              <p className="text-xs font-medium">Researcher production multipliers</p>
              <p className="text-[11px] text-[#5c4300]">
                Exact correction of output multipliers. This is not ordinary Knowledge adjustment.
              </p>
              <label className="block text-xs">
                Current month multiplier
                <input
                  type="number"
                  min={1}
                  className={fieldClass}
                  value={currentMultiplier}
                  onChange={(event) => setCurrentMultiplier(Number(event.target.value))}
                />
              </label>
              <label className="block text-xs">
                Next month multiplier
                <input
                  type="number"
                  min={1}
                  className={fieldClass}
                  value={nextMultiplier}
                  onChange={(event) => setNextMultiplier(Number(event.target.value))}
                />
              </label>
              <button type="submit" className={btnClass} disabled={pending}>Save multipliers</button>
              {errorLine()}
            </form>
          </div>
        </details>

        <details>
          <summary className="cursor-pointer text-xs font-semibold">Impact / Personnel</summary>
          <div className="mt-2 space-y-3">
            <RecordPersonnelForm
              presentation={presentation}
              vacantPositions={vacantPositions}
              insertionChoices={insertionChoices}
              pending={pending}
              errorLine={errorLine()}
              onSubmit={(destination, name, description, insertionIndex) => {
                const payload = buildRecruitSpecializedPersonnelPayload({
                  denizenId: newDenizenId(),
                  name,
                  description,
                  destination,
                  occupants: presentation.towerOccupants,
                  insertionIndex,
                });
                return onAction(() => recruitPersonnel({
                  commandId: newCommandId(),
                  expectedCampaignId: campaignId,
                  subject: payload.subject,
                  destination: payload.destination,
                  expectedTowerOrder: payload.expectedTowerOrder === undefined
                    ? undefined
                    : [...payload.expectedTowerOrder],
                  nextAcademicOrder: payload.nextAcademicOrder === undefined
                    ? undefined
                    : [...payload.nextAcademicOrder],
                }));
              }}
            />
            <div className="space-y-2 rounded-md border border-[#BF9000]/40 p-2">
              <p className="text-xs font-medium">Correct Tower order</p>
              <p className="text-[11px] text-[#5c4300]">Move occupants only within their legal band, then save once.</p>
              <TowerBandEditor
                title="BOTTOM · Students"
                occupants={bands.students}
                order={studentOrder}
                pending={pending}
                onMove={(index, direction) => setStudentOrder([...moveWithinTowerBand(studentOrder, index, direction)])}
              />
              <TowerBandEditor
                title="MIDDLE · Academics"
                occupants={bands.academics}
                order={academicOrder}
                pending={pending}
                onMove={(index, direction) => setAcademicOrder([...moveWithinTowerBand(academicOrder, index, direction)])}
              />
              <TowerBandEditor
                title="TOP · Reliable Arcanists"
                occupants={bands.arcanists}
                order={arcanistOrder}
                pending={pending}
                onMove={(index, direction) => setArcanistOrder([...moveWithinTowerBand(arcanistOrder, index, direction)])}
              />
              <button
                type="button"
                className={btnClass}
                disabled={pending}
                onClick={() => onAction(() => rearrangeTower({
                  commandId: newCommandId(),
                  expectedCampaignId: campaignId,
                  expectedTowerOrder: [...presentation.towerOrder],
                  towerOrder: [...assembleTowerOrderFromBands({
                    students: studentOrder,
                    academics: academicOrder,
                    arcanists: arcanistOrder,
                  })],
                }))}
              >
                Save Tower order
              </button>
              {errorLine()}
            </div>
          </div>
        </details>

        <details>
          <summary className="cursor-pointer text-xs font-semibold">Arcanists</summary>
          <div className="mt-2 space-y-3">
            <ul className="space-y-1 text-xs">
              {presentation.arcanists.map((arcanist) => (
                <li key={arcanist.denizenId}>
                  {arcanist.name} · {arcanist.schoolLabel} · {placementLabel(arcanist)}
                </li>
              ))}
              {presentation.arcanists.length === 0 && (
                <li className="text-[#5c4300]">No Arcanists recorded yet.</li>
              )}
            </ul>
            <AddArcanistForm
              presentation={presentation}
              domainOptions={domainOptions}
              pending={pending}
              errorLine={errorLine()}
              onSubmit={(input) => onAction(() => addArcanist({
                commandId: newCommandId(),
                expectedCampaignId: campaignId,
                subject: input.subject,
                school: input.school,
                placement: input.placement.kind === "tower"
                  ? { kind: "tower" }
                  : {
                      kind: "other_domain",
                      seatId: input.placement.seatId,
                      disruptiveProfile: convexDisruptiveProfile(input.placement.disruptiveProfile),
                    },
                expectedTowerOrder: input.expectedTowerOrder,
              }))}
            />
            <CorrectArcanistForm
              presentation={presentation}
              domainOptions={domainOptions}
              pending={pending}
              errorLine={errorLine()}
              onSubmit={(input) => onAction(() => updateArcanist({
                commandId: newCommandId(),
                expectedCampaignId: campaignId,
                denizenId: input.denizenId,
                expectedArcanist: {
                  denizenId: input.expectedArcanist.denizenId,
                  school: input.expectedArcanist.school,
                  placement: input.expectedArcanist.placement,
                  disruptiveProfile: input.expectedArcanist.disruptiveProfile === null
                    ? null
                    : convexDisruptiveProfile(input.expectedArcanist.disruptiveProfile),
                },
                school: input.school,
                placement: input.placement,
                disruptiveProfile: input.disruptiveProfile === null
                  ? null
                  : convexDisruptiveProfile(input.disruptiveProfile),
                expectedTowerOrder: input.expectedTowerOrder,
              }))}
            />
          </div>
        </details>

        <details>
          <summary className="cursor-pointer text-xs font-semibold">Constructs</summary>
          <div className="mt-2 space-y-3">
            {presentation.constructs.map((construct) => (
              <div key={construct.denizenId} className="rounded-md border border-[#BF9000]/40 p-2 space-y-2">
                <p className="text-xs font-medium">{construct.name}</p>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5c4300]">Truths</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    {construct.truths.map((truth) => (
                      <li key={truth.truthId} className="flex items-start justify-between gap-2">
                        <span>{truth.text}</span>
                        <button
                          type="button"
                          className={ghostBtn}
                          disabled={pending}
                          onClick={() => onAction(() => removeTruth({
                            commandId: newCommandId(),
                            expectedCampaignId: campaignId,
                            denizenId: construct.denizenId,
                            truthId: truth.truthId,
                            expectedTruth: { truthId: truth.truthId, text: truth.text, origin: "campaign" },
                          }))}
                        >
                          Remove Truth
                        </button>
                      </li>
                    ))}
                  </ul>
                  <AddTruthForm
                    pending={pending}
                    onSubmit={(text) => onAction(() => addTruth({
                      commandId: newCommandId(),
                      expectedCampaignId: campaignId,
                      denizenId: construct.denizenId,
                      truthId: newTruthId(),
                      text,
                    }))}
                  />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5c4300]">If / Then statements</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    {construct.instructions.map((instruction, index) => (
                      <li key={`${instruction.condition}-${index}`}>
                        If {instruction.condition} Then {instruction.result}
                      </li>
                    ))}
                    {construct.instructions.length === 0 && (
                      <li className="text-[#5c4300]">No If / Then statements recorded.</li>
                    )}
                  </ul>
                </div>
                <ConstructInstructionForm
                  pending={pending}
                  initial={construct.instructions}
                  onSubmit={(instructions) => onAction(() => setConstructInstructions({
                    commandId: newCommandId(),
                    expectedCampaignId: campaignId,
                    denizenId: construct.denizenId,
                    expectedInstructions: construct.instructions.map((instruction) => ({
                      condition: instruction.condition,
                      result: instruction.result,
                    })),
                    instructions,
                  }))}
                />
                {errorLine()}
              </div>
            ))}
            <RecordConstructForm
              pending={pending}
              errorLine={errorLine()}
              onSubmit={(input) => onAction(() => addConstruct({
                commandId: newCommandId(),
                expectedCampaignId: campaignId,
                ...input,
              }))}
            />
          </div>
        </details>

        <details>
          <summary className="cursor-pointer text-xs font-semibold">Innovations</summary>
          <div className="mt-2 space-y-3">
            <ul className="space-y-1 text-xs">
              {presentation.innovations.map((innovation) => (
                <li key={innovation.innovationId} className="rounded-md border border-[#BF9000]/40 p-2 space-y-1">
                  <p>{innovation.spellName} · {innovation.schoolLabel}</p>
                  <p>{innovation.text}</p>
                  <button
                    type="button"
                    className={ghostBtn}
                    disabled={pending}
                    onClick={() => onAction(() => removeInnovation({
                      commandId: newCommandId(),
                      expectedCampaignId: campaignId,
                      innovationId: innovation.innovationId,
                      expectedSpellId: innovation.spellId,
                      expectedText: innovation.text,
                    }))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <InnovationForm
              label="Add Innovation"
              spells={eligibleSpells}
              pending={pending}
              errorLine={errorLine()}
              onSubmit={(spellId, text) => onAction(() => addInnovation({
                commandId: newCommandId(),
                expectedCampaignId: campaignId,
                innovationId: newInnovationId(),
                spellId,
                text,
              }))}
            />
            {presentation.innovations[0] !== undefined && (
              <InnovationForm
                label="Revise Innovation"
                spells={eligibleSpells}
                pending={pending}
                defaultSpellId={presentation.innovations[0].spellId}
                defaultText={presentation.innovations[0].text}
                errorLine={errorLine()}
                onSubmit={(spellId, text) => onAction(() => reviseInnovation({
                  commandId: newCommandId(),
                  expectedCampaignId: campaignId,
                  innovationId: presentation.innovations[0]!.innovationId,
                  expectedSpellId: presentation.innovations[0]!.spellId,
                  expectedText: presentation.innovations[0]!.text,
                  spellId,
                  text,
                }))}
              />
            )}
          </div>
        </details>

        <details>
          <summary className="cursor-pointer text-xs font-semibold">University Definitions</summary>
          <div className="mt-2 space-y-3">
            <DefinitionList title="Schools" empty="No campaign Schools." items={presentation.campaignSchools.map((school) => (
              `${school.name}: ${school.description}`
            ))} />
            <DefinitionForm
              title="Record School"
              fields={[
                { key: "name", label: "School name" },
                { key: "description", label: "School description" },
              ]}
              pending={pending}
              errorLine={errorLine()}
              reminder="This source Impact also creates an Arcanist; record that Arcanist in the Arcanists section."
              onSubmit={(values) => onAction(() => createDefinition({
                commandId: newCommandId(),
                expectedCampaignId: campaignId,
                definition: {
                  kind: "school",
                  schoolId: newCampaignSchoolId(),
                  name: values.name,
                  description: values.description,
                },
              }))}
            />
            <DefinitionList title="Academic kinds" empty="No campaign Academic kinds." items={presentation.campaignAcademicKinds.map((kind) => (
              `${kind.name}: ${kind.action}`
            ))} />
            <DefinitionForm
              title="Record Academic kind"
              fields={[
                { key: "name", label: "Kind name" },
                { key: "action", label: "Monthly action" },
              ]}
              pending={pending}
              errorLine={errorLine()}
              onSubmit={(values) => onAction(() => createDefinition({
                commandId: newCommandId(),
                expectedCampaignId: campaignId,
                definition: {
                  kind: "academic_kind",
                  academicKindId: newCampaignAcademicKindId(),
                  name: values.name,
                  action: values.action,
                },
              }))}
            />
            <DefinitionList title="Recipes" empty="No campaign Recipes." items={presentation.campaignRecipes.map((recipe) => (
              `${recipe.name}: ${recipe.recipeText}`
            ))} />
            <DefinitionForm
              title="Record Recipe"
              fields={[
                { key: "name", label: "Recipe name" },
                { key: "recipeText", label: "Recipe text" },
              ]}
              pending={pending}
              errorLine={errorLine()}
              onSubmit={(values) => onAction(() => createDefinition({
                commandId: newCommandId(),
                expectedCampaignId: campaignId,
                definition: {
                  kind: "recipe",
                  recipeId: newCampaignRecipeId(),
                  name: values.name,
                  recipeText: values.recipeText,
                },
              }))}
            />
            <DefinitionList title="Knowledge methods" empty="No campaign Knowledge methods." items={presentation.campaignKnowledgeMethods.map((method) => (
              `${method.name}: ${method.description}`
            ))} />
            <DefinitionForm
              title="Record Knowledge method"
              fields={[
                { key: "name", label: "Method name" },
                { key: "description", label: "How Knowledge is obtained" },
              ]}
              pending={pending}
              errorLine={errorLine()}
              onSubmit={(values) => onAction(() => createDefinition({
                commandId: newCommandId(),
                expectedCampaignId: campaignId,
                definition: {
                  kind: "knowledge_method",
                  knowledgeMethodId: newCampaignKnowledgeMethodId(),
                  researchPositionId: newCampaignResearchPositionId(),
                  name: values.name,
                  description: values.description,
                },
              }))}
            />
            {presentation.campaignSchools[0] !== undefined && (
              <DefinitionForm
                title="Revise School"
                fields={[
                  { key: "name", label: "School name" },
                  { key: "description", label: "School description" },
                ]}
                pending={pending}
                defaults={{
                  name: presentation.campaignSchools[0].name,
                  description: presentation.campaignSchools[0].description,
                }}
                errorLine={errorLine()}
                onSubmit={(values) => onAction(() => updateDefinition({
                  commandId: newCommandId(),
                  expectedCampaignId: campaignId,
                  definition: {
                    kind: "school",
                    schoolId: presentation.campaignSchools[0]!.schoolId,
                    expectedName: presentation.campaignSchools[0]!.name,
                    expectedDescription: presentation.campaignSchools[0]!.description,
                    name: values.name,
                    description: values.description,
                  },
                }))}
              />
            )}
            {presentation.campaignAcademicKinds[0] !== undefined && (
              <DefinitionForm
                title="Revise Academic kind"
                fields={[
                  { key: "name", label: "Kind name" },
                  { key: "action", label: "Monthly action" },
                ]}
                pending={pending}
                defaults={{
                  name: presentation.campaignAcademicKinds[0].name,
                  action: presentation.campaignAcademicKinds[0].action,
                }}
                errorLine={errorLine()}
                onSubmit={(values) => onAction(() => updateDefinition({
                  commandId: newCommandId(),
                  expectedCampaignId: campaignId,
                  definition: {
                    kind: "academic_kind",
                    academicKindId: presentation.campaignAcademicKinds[0]!.academicKindId,
                    expectedName: presentation.campaignAcademicKinds[0]!.name,
                    expectedAction: presentation.campaignAcademicKinds[0]!.action,
                    name: values.name,
                    action: values.action,
                  },
                }))}
              />
            )}
            {presentation.campaignRecipes[0] !== undefined && (
              <DefinitionForm
                title="Revise Recipe"
                fields={[
                  { key: "name", label: "Recipe name" },
                  { key: "recipeText", label: "Recipe text" },
                ]}
                pending={pending}
                defaults={{
                  name: presentation.campaignRecipes[0].name,
                  recipeText: presentation.campaignRecipes[0].recipeText,
                }}
                errorLine={errorLine()}
                onSubmit={(values) => onAction(() => updateDefinition({
                  commandId: newCommandId(),
                  expectedCampaignId: campaignId,
                  definition: {
                    kind: "recipe",
                    recipeId: presentation.campaignRecipes[0]!.recipeId,
                    expectedName: presentation.campaignRecipes[0]!.name,
                    expectedRecipeText: presentation.campaignRecipes[0]!.recipeText,
                    name: values.name,
                    recipeText: values.recipeText,
                  },
                }))}
              />
            )}
            {presentation.campaignKnowledgeMethods[0] !== undefined && (
              <DefinitionForm
                title="Revise Knowledge method"
                fields={[
                  { key: "name", label: "Method name" },
                  { key: "description", label: "How Knowledge is obtained" },
                ]}
                pending={pending}
                defaults={{
                  name: presentation.campaignKnowledgeMethods[0].name,
                  description: presentation.campaignKnowledgeMethods[0].description,
                }}
                errorLine={errorLine()}
                onSubmit={(values) => onAction(() => updateDefinition({
                  commandId: newCommandId(),
                  expectedCampaignId: campaignId,
                  definition: {
                    kind: "knowledge_method",
                    knowledgeMethodId: presentation.campaignKnowledgeMethods[0]!.knowledgeMethodId,
                    expectedName: presentation.campaignKnowledgeMethods[0]!.name,
                    expectedDescription: presentation.campaignKnowledgeMethods[0]!.description,
                    name: values.name,
                    description: values.description,
                  },
                }))}
              />
            )}
          </div>
        </details>
      </div>
    </details>
  );
}

function LawPicker({
  label,
  value,
  onChange,
  exclude,
}: {
  readonly label: string;
  readonly value: readonly SorcererLawOfMagicId[];
  readonly onChange: (next: readonly SorcererLawOfMagicId[]) => void;
  readonly exclude: readonly SorcererLawOfMagicId[];
}) {
  return (
    <fieldset>
      <legend className="text-xs">{label}</legend>
      <div className="mt-1 space-y-1">
        {lawCatalogOptions().map((law) => {
          const checked = value.includes(law.lawId);
          return (
            <label key={law.lawId} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={checked}
                disabled={!checked && exclude.includes(law.lawId)}
                onChange={() => {
                  onChange(checked ? value.filter((id) => id !== law.lawId) : [...value, law.lawId]);
                }}
              />
              {law.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function TowerBandEditor({
  title,
  occupants,
  order,
  pending,
  onMove,
}: {
  readonly title: string;
  readonly occupants: readonly { readonly denizenId: DenizenId; readonly name: string }[];
  readonly order: readonly DenizenId[];
  readonly pending: boolean;
  readonly onMove: (index: number, direction: "up" | "down") => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5c4300]">{title}</p>
      <ol className="mt-1 space-y-1">
        {order.map((denizenId, index) => {
          const occupant = occupants.find((entry) => entry.denizenId === denizenId);
          return (
            <li key={denizenId} className="flex items-center justify-between gap-2 text-xs">
              <span>{occupant?.name ?? denizenId}</span>
              <span className="flex gap-1">
                <button
                  type="button"
                  className={ghostBtn}
                  disabled={pending || !canMoveWithinTowerBand(order, index, "down")}
                  onClick={() => onMove(index, "down")}
                >
                  Move Down
                </button>
                <button
                  type="button"
                  className={ghostBtn}
                  disabled={pending || !canMoveWithinTowerBand(order, index, "up")}
                  onClick={() => onMove(index, "up")}
                >
                  Move Up
                </button>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function RecordPersonnelForm({
  presentation,
  vacantPositions,
  insertionChoices,
  pending,
  errorLine,
  onSubmit,
}: {
  readonly presentation: SorcererBoardReference;
  readonly vacantPositions: ReturnType<typeof vacantResearchPositions>;
  readonly insertionChoices: ReturnType<typeof academicInsertionChoices>;
  readonly pending: boolean;
  readonly errorLine: ReactNode;
  readonly onSubmit: (
    destination: Exclude<SorcererPersonnelRoleDestination, { kind: "student" }>,
    name: string,
    description: string,
    insertionIndex: number,
  ) => Promise<boolean>;
}) {
  const [kind, setKind] = useState<SpecializedPersonnelKind>("researcher");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [positionId, setPositionId] = useState(vacantPositions[0]?.positionId ?? "");
  const [schoolKey, setSchoolKey] = useState("source:enchantment");
  const [recipeKey, setRecipeKey] = useState("builtin:first");
  const [academicKindId, setAcademicKindId] = useState(presentation.campaignAcademicKinds[0]?.academicKindId ?? "");
  const [insertionIndex, setInsertionIndex] = useState(insertionChoices[0]?.insertionIndex ?? 0);

  function destination(): Exclude<SorcererPersonnelRoleDestination, { kind: "student" }> | null {
    if (kind === "researcher") {
      if (positionId.length === 0) return null;
      return { kind: "researcher", positionId: positionId as never };
    }
    if (kind === "professor") return { kind: "professor" };
    if (kind === "librarian") {
      const [schoolKind, schoolId] = schoolKey.split(":");
      return { kind: "librarian", school: { kind: schoolKind, schoolId } as MagicSchoolRef };
    }
    if (kind === "alchemist") {
      const [recipeKind, recipeId] = recipeKey.split(":");
      return { kind: "alchemist", recipe: { kind: recipeKind, recipeId } as never };
    }
    if (academicKindId.length === 0) return null;
    return { kind: "campaign_academic", academicKindId: academicKindId as never };
  }

  return (
    <form
      className="space-y-2 rounded-md border border-[#BF9000]/40 p-2"
      onSubmit={(event) => {
        event.preventDefault();
        const next = destination();
        if (next === null) return;
        onSubmit(next, name, description, insertionIndex).then((ok) => {
          if (ok) {
            setName("");
            setDescription("");
          }
        });
      }}
    >
      <p className="text-xs font-medium">Record Personnel</p>
      <label className="block text-xs">
        Role
        <select className={fieldClass} value={kind} onChange={(event) => setKind(event.target.value as SpecializedPersonnelKind)}>
          {(["researcher", "professor", "librarian", "alchemist", "campaign_academic"] as const).map((option) => (
            <option key={option} value={option}>{specializedPersonnelLabel(option)}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs">
        Name
        <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="block text-xs">
        Description
        <input className={fieldClass} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      {kind === "researcher" && (
        <label className="block text-xs">
          Research Position
          <select className={fieldClass} value={positionId} onChange={(event) => setPositionId(event.target.value as typeof positionId)}>
            {vacantPositions.map((position) => (
              <option key={position.positionId} value={position.positionId}>{position.targetLabel}</option>
            ))}
          </select>
        </label>
      )}
      {kind === "librarian" && (
        <label className="block text-xs">
          School
          <select className={fieldClass} value={schoolKey} onChange={(event) => setSchoolKey(event.target.value)}>
            {sourceSchoolOptions().map((school) => (
              <option key={school.schoolId} value={`source:${school.schoolId}`}>{school.name}</option>
            ))}
            {presentation.campaignSchools.map((school) => (
              <option key={school.schoolId} value={`campaign:${school.schoolId}`}>{school.name}</option>
            ))}
          </select>
        </label>
      )}
      {kind === "alchemist" && (
        <label className="block text-xs">
          Recipe
          <select className={fieldClass} value={recipeKey} onChange={(event) => setRecipeKey(event.target.value)}>
            {builtinRecipeOptions().map((recipe) => (
              <option key={recipe.recipeId} value={`builtin:${recipe.recipeId}`}>{recipe.name}</option>
            ))}
            {presentation.campaignRecipes.map((recipe) => (
              <option key={recipe.recipeId} value={`campaign:${recipe.recipeId}`}>{recipe.name}</option>
            ))}
          </select>
        </label>
      )}
      {kind === "campaign_academic" && (
        <label className="block text-xs">
          Academic kind
          <select className={fieldClass} value={academicKindId} onChange={(event) => setAcademicKindId(event.target.value as typeof academicKindId)}>
            {presentation.campaignAcademicKinds.map((kindOption) => (
              <option key={kindOption.academicKindId} value={kindOption.academicKindId}>{kindOption.name}</option>
            ))}
          </select>
        </label>
      )}
      {kind !== "researcher" && (
        <label className="block text-xs">
          Rank among Academics
          <select className={fieldClass} value={insertionIndex} onChange={(event) => setInsertionIndex(Number(event.target.value))}>
            {insertionChoices.map((choice) => (
              <option key={choice.insertionIndex} value={choice.insertionIndex}>{choice.label}</option>
            ))}
          </select>
        </label>
      )}
      <button type="submit" className={btnClass} disabled={pending}>Record Personnel</button>
      {errorLine}
    </form>
  );
}

function SchoolFields({
  school,
  onChange,
  campaignSchools,
}: {
  readonly school: MagicSchoolRef;
  readonly onChange: (school: MagicSchoolRef) => void;
  readonly campaignSchools: SorcererBoardReference["campaignSchools"];
}) {
  const key = `${school.kind}:${school.schoolId}`;
  return (
    <label className="block text-xs">
      School
      <select
        className={fieldClass}
        value={key}
        onChange={(event) => {
          const [kind, schoolId] = event.target.value.split(":");
          onChange({ kind, schoolId } as MagicSchoolRef);
        }}
      >
        {sourceSchoolOptions().map((option) => (
          <option key={option.schoolId} value={`source:${option.schoolId}`}>{option.name}</option>
        ))}
        {campaignSchools.map((option) => (
          <option key={option.schoolId} value={`campaign:${option.schoolId}`}>{option.name}</option>
        ))}
      </select>
    </label>
  );
}

function DisruptiveFields({
  profile,
  school,
  onChange,
}: {
  readonly profile: SorcererDisruptiveArcanistProfile;
  readonly school: MagicSchoolRef;
  readonly onChange: (profile: SorcererDisruptiveArcanistProfile) => void;
}) {
  const schoolSpells = school.kind === "source" ? sourceSchoolSpells(school.schoolId as SorcererSourceSchoolId) : [];
  return (
    <div className="space-y-2">
      <label className="block text-xs">
        Primary Element
        <select
          className={fieldClass}
          value={profile.primaryElement}
          onChange={(event) => onChange({ ...profile, primaryElement: event.target.value as never })}
        >
          {elementOptions().map((element) => (
            <option key={element} value={element}>{element}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs">
        Rank
        <select
          className={fieldClass}
          value={profile.rank}
          onChange={(event) => onChange({
            ...profile,
            rank: event.target.value as SorcererDisruptiveArcanistProfile["rank"],
            prenticeSpellIds: event.target.value === "prentice" ? profile.prenticeSpellIds : [],
          })}
        >
          <option value="prentice">Prentice</option>
          <option value="journeyman">Journeyman</option>
          <option value="master">Master</option>
        </select>
      </label>
      <label className="block text-xs">
        Changes of Magic
        <input
          className={fieldClass}
          value={profile.changesOfMagic.join("\n")}
          onChange={(event) => onChange({
            ...profile,
            changesOfMagic: event.target.value.split("\n").filter((entry) => entry.trim().length > 0),
          })}
        />
      </label>
      <label className="block text-xs">
        Quirk
        <input
          className={fieldClass}
          value={profile.quirk}
          onChange={(event) => onChange({ ...profile, quirk: event.target.value })}
        />
      </label>
      {profile.rank === "prentice" && school.kind === "source" && (
        <fieldset>
          <legend className="text-xs">Known School spells</legend>
          {schoolSpells.map((spell) => (
            <label key={spell.spellId} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={profile.prenticeSpellIds.includes(spell.spellId)}
                onChange={() => {
                  const selected = profile.prenticeSpellIds.includes(spell.spellId)
                    ? profile.prenticeSpellIds.filter((id) => id !== spell.spellId)
                    : [...profile.prenticeSpellIds, spell.spellId];
                  onChange({ ...profile, prenticeSpellIds: selected as never });
                }}
              />
              {spell.name}
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}

function emptyDisruptive(): SorcererDisruptiveArcanistProfile {
  return {
    primaryElement: "fire",
    rank: "prentice",
    changesOfMagic: [""],
    quirk: "",
    prenticeSpellIds: [],
  };
}

function AddArcanistForm({
  presentation,
  domainOptions,
  pending,
  errorLine,
  onSubmit,
}: {
  readonly presentation: SorcererBoardReference;
  readonly domainOptions: ReturnType<typeof otherPactDomainOptions>;
  readonly pending: boolean;
  readonly errorLine: ReactNode;
  readonly onSubmit: (input: {
    subject: { kind: "create_denizen"; denizenId: string; name: string; description: string | null };
    school: MagicSchoolRef;
    placement: { kind: "tower" } | { kind: "other_domain"; seatId: PactSeatId; disruptiveProfile: SorcererDisruptiveArcanistProfile };
    expectedTowerOrder?: string[];
  }) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [school, setSchool] = useState<MagicSchoolRef>({ kind: "source", schoolId: "enchantment" });
  const [placementKind, setPlacementKind] = useState<"tower" | "other_domain">("tower");
  const [seatId, setSeatId] = useState<PactSeatId>("necromancer");
  const [profile, setProfile] = useState(emptyDisruptive());

  return (
    <form
      className="space-y-2 rounded-md border border-[#BF9000]/40 p-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          subject: {
            kind: "create_denizen",
            denizenId: newDenizenId(),
            name,
            description: description.trim().length === 0 ? null : description.trim(),
          },
          school,
          placement: placementKind === "tower"
            ? { kind: "tower" }
            : { kind: "other_domain", seatId, disruptiveProfile: profile },
          expectedTowerOrder: placementKind === "tower" ? [...presentation.towerOrder] : undefined,
        }).then((ok) => {
          if (ok) {
            setName("");
            setDescription("");
          }
        });
      }}
    >
      <p className="text-xs font-medium">Add Arcanist</p>
      <label className="block text-xs">
        Name
        <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="block text-xs">
        Description
        <input className={fieldClass} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <SchoolFields school={school} onChange={setSchool} campaignSchools={presentation.campaignSchools} />
      <label className="block text-xs">
        Placement
        <select className={fieldClass} value={placementKind} onChange={(event) => setPlacementKind(event.target.value as "tower" | "other_domain")}>
          <option value="tower">Reliable · Tower</option>
          <option value="other_domain">Disruptive · other Domain</option>
        </select>
      </label>
      {placementKind === "other_domain" && (
        <>
          <label className="block text-xs">
            Pact Domain
            <select className={fieldClass} value={seatId} onChange={(event) => setSeatId(event.target.value as PactSeatId)}>
              {domainOptions.map((option) => (
                <option key={option.seatId} value={option.seatId}>{option.label}</option>
              ))}
            </select>
          </label>
          <DisruptiveFields profile={profile} school={school} onChange={setProfile} />
        </>
      )}
      <button type="submit" className={btnClass} disabled={pending}>Record Arcanist</button>
      {errorLine}
    </form>
  );
}

function CorrectArcanistForm({
  presentation,
  domainOptions,
  pending,
  errorLine,
  onSubmit,
}: {
  readonly presentation: SorcererBoardReference;
  readonly domainOptions: ReturnType<typeof otherPactDomainOptions>;
  readonly pending: boolean;
  readonly errorLine: ReactNode;
  readonly onSubmit: (input: {
    denizenId: string;
    expectedArcanist: SorcererBoardArcanist extends infer _ ? {
      denizenId: string;
      school: MagicSchoolRef;
      placement: SorcererArcanistPlacement;
      disruptiveProfile: SorcererDisruptiveArcanistProfile | null;
    } : never;
    school: MagicSchoolRef;
    placement: SorcererArcanistPlacement;
    disruptiveProfile: SorcererDisruptiveArcanistProfile | null;
    expectedTowerOrder?: string[];
  }) => Promise<boolean>;
}) {
  const [denizenId, setDenizenId] = useState(presentation.arcanists[0]?.denizenId ?? "");
  const selected = presentation.arcanists.find((arcanist) => arcanist.denizenId === denizenId) ?? presentation.arcanists[0];
  const [school, setSchool] = useState<MagicSchoolRef>(selected?.school ?? { kind: "source", schoolId: "enchantment" });
  const [placementKind, setPlacementKind] = useState<"tower" | "other_domain">(selected?.placement.kind ?? "tower");
  const [seatId, setSeatId] = useState<PactSeatId>(
    selected?.placement.kind === "other_domain" ? selected.placement.seatId : "necromancer",
  );
  const [profile, setProfile] = useState(selected?.disruptiveProfile ?? emptyDisruptive());

  if (selected === undefined) {
    return null;
  }

  return (
    <form
      className="space-y-2 rounded-md border border-[#BF9000]/40 p-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          denizenId: selected.denizenId,
          expectedArcanist: {
            denizenId: selected.denizenId,
            school: selected.school,
            placement: selected.placement,
            disruptiveProfile: selected.disruptiveProfile,
          },
          school,
          placement: placementKind === "tower" ? { kind: "tower" } : { kind: "other_domain", seatId },
          disruptiveProfile: placementKind === "tower" ? null : profile,
          expectedTowerOrder: [...presentation.towerOrder],
        });
      }}
    >
      <p className="text-xs font-medium">Correct / Move Arcanist</p>
      <label className="block text-xs">
        Arcanist
        <select
          className={fieldClass}
          value={selected.denizenId}
          onChange={(event) => {
            setDenizenId(event.target.value as DenizenId);
            const next = presentation.arcanists.find((arcanist) => arcanist.denizenId === event.target.value);
            if (next !== undefined) {
              setSchool(next.school);
              setPlacementKind(next.placement.kind);
              setSeatId(next.placement.kind === "other_domain" ? next.placement.seatId : "necromancer");
              setProfile(next.disruptiveProfile ?? emptyDisruptive());
            }
          }}
        >
          {presentation.arcanists.map((arcanist) => (
            <option key={arcanist.denizenId} value={arcanist.denizenId}>
              {arcanist.name} · {placementLabel(arcanist)}
            </option>
          ))}
        </select>
      </label>
      <SchoolFields school={school} onChange={setSchool} campaignSchools={presentation.campaignSchools} />
      <label className="block text-xs">
        Placement
        <select className={fieldClass} value={placementKind} onChange={(event) => setPlacementKind(event.target.value as "tower" | "other_domain")}>
          <option value="tower">Reliable · Tower</option>
          <option value="other_domain">Disruptive · other Domain</option>
        </select>
      </label>
      {placementKind === "other_domain" && (
        <>
          <label className="block text-xs">
            Pact Domain
            <select className={fieldClass} value={seatId} onChange={(event) => setSeatId(event.target.value as PactSeatId)}>
              {domainOptions.map((option) => (
                <option key={option.seatId} value={option.seatId}>{option.label}</option>
              ))}
            </select>
          </label>
          <DisruptiveFields profile={profile} school={school} onChange={setProfile} />
        </>
      )}
      <button type="submit" className={btnClass} disabled={pending}>Save Arcanist correction</button>
      {errorLine}
    </form>
  );
}

function AddTruthForm({
  pending,
  onSubmit,
}: {
  readonly pending: boolean;
  readonly onSubmit: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  return (
    <form
      className="mt-2 space-y-1"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(text).then((ok) => {
          if (ok) setText("");
        });
      }}
    >
      <label className="block text-xs">
        New Truth
        <input className={fieldClass} value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <button type="submit" className={ghostBtn} disabled={pending}>Add Truth</button>
    </form>
  );
}

function ConstructInstructionForm({
  pending,
  initial,
  onSubmit,
}: {
  readonly pending: boolean;
  readonly initial: readonly { readonly condition: string; readonly result: string }[];
  readonly onSubmit: (instructions: { condition: string; result: string }[]) => Promise<boolean>;
}) {
  const [rows, setRows] = useState(initial.length === 0 ? [{ condition: "", result: "" }] : initial.map((row) => ({ ...row })));
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(rows.filter((row) => row.condition.trim().length > 0 && row.result.trim().length > 0));
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5c4300]">Correct If / Then</p>
      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-2 gap-2">
          <label className="block text-xs">
            If
            <input
              className={fieldClass}
              value={row.condition}
              onChange={(event) => setRows(rows.map((entry, i) => (
                i === index ? { ...entry, condition: event.target.value } : entry
              )))}
            />
          </label>
          <label className="block text-xs">
            Then
            <input
              className={fieldClass}
              value={row.result}
              onChange={(event) => setRows(rows.map((entry, i) => (
                i === index ? { ...entry, result: event.target.value } : entry
              )))}
            />
          </label>
        </div>
      ))}
      <button type="button" className={ghostBtn} onClick={() => setRows([...rows, { condition: "", result: "" }])}>
        Add If / Then
      </button>
      <button type="submit" className={btnClass} disabled={pending}>Save If / Then</button>
    </form>
  );
}

function RecordConstructForm({
  pending,
  errorLine,
  onSubmit,
}: {
  readonly pending: boolean;
  readonly errorLine: ReactNode;
  readonly onSubmit: (input: {
    denizenId: string;
    name: string;
    description: string | null;
    truths: { truthId: string; text: string }[];
    instructions: { condition: string; result: string }[];
  }) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [truths, setTruths] = useState("");
  const [condition, setCondition] = useState("");
  const [result, setResult] = useState("");
  return (
    <form
      className="space-y-2 rounded-md border border-[#BF9000]/40 p-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          denizenId: newDenizenId(),
          name,
          description: description.trim().length === 0 ? null : description.trim(),
          truths: truths.split("\n").filter((line) => line.trim().length > 0).map((text) => ({
            truthId: newTruthId(),
            text,
          })),
          instructions: condition.trim().length === 0 || result.trim().length === 0
            ? []
            : [{ condition, result }],
        }).then((ok) => {
          if (ok) {
            setName("");
            setDescription("");
            setTruths("");
            setCondition("");
            setResult("");
          }
        });
      }}
    >
      <p className="text-xs font-medium">Record Construct</p>
      <label className="block text-xs">
        Name
        <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="block text-xs">
        Description
        <input className={fieldClass} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label className="block text-xs">
        Truths
        <textarea className={fieldClass} value={truths} onChange={(event) => setTruths(event.target.value)} />
      </label>
      <label className="block text-xs">
        If
        <input className={fieldClass} value={condition} onChange={(event) => setCondition(event.target.value)} />
      </label>
      <label className="block text-xs">
        Then
        <input className={fieldClass} value={result} onChange={(event) => setResult(event.target.value)} />
      </label>
      <button type="submit" className={btnClass} disabled={pending}>Record Construct</button>
      {errorLine}
    </form>
  );
}

function InnovationForm({
  label,
  spells,
  pending,
  defaultSpellId = "",
  defaultText = "",
  errorLine,
  onSubmit,
}: {
  readonly label: string;
  readonly spells: ReturnType<typeof innovationEligibleSpells>;
  readonly pending: boolean;
  readonly defaultSpellId?: string;
  readonly defaultText?: string;
  readonly errorLine: ReactNode;
  readonly onSubmit: (spellId: string, text: string) => Promise<boolean>;
}) {
  const [spellId, setSpellId] = useState(defaultSpellId || spells[0]?.spellId || "");
  const [text, setText] = useState(defaultText);
  return (
    <form
      className="space-y-2 rounded-md border border-[#BF9000]/40 p-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(spellId, text);
      }}
    >
      <p className="text-xs font-medium">{label}</p>
      <label className="block text-xs">
        Spell
        <select className={fieldClass} value={spellId} onChange={(event) => setSpellId(event.target.value)}>
          {spells.map((spell) => (
            <option key={spell.spellId} value={spell.spellId}>
              {spell.name} · {spell.schoolLabel}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs">
        Innovation text
        <textarea className={fieldClass} value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <button type="submit" className={btnClass} disabled={pending}>{label}</button>
      {errorLine}
    </form>
  );
}

function DefinitionList({
  title,
  empty,
  items,
}: {
  readonly title: string;
  readonly empty: string;
  readonly items: readonly string[];
}) {
  return (
    <div>
      <p className="text-xs font-medium">{title}</p>
      <ul className="mt-1 space-y-1 text-xs">
        {items.length === 0 ? <li className="text-[#5c4300]">{empty}</li> : items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function DefinitionForm({
  title,
  fields,
  pending,
  defaults = {},
  reminder,
  errorLine,
  onSubmit,
}: {
  readonly title: string;
  readonly fields: readonly { readonly key: string; readonly label: string }[];
  readonly pending: boolean;
  readonly defaults?: Record<string, string>;
  readonly reminder?: string;
  readonly errorLine: ReactNode;
  readonly onSubmit: (values: Record<string, string>) => Promise<boolean>;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((field) => [field.key, defaults[field.key] ?? ""])),
  );
  return (
    <form
      className="space-y-2 rounded-md border border-[#BF9000]/40 p-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <p className="text-xs font-medium">{title}</p>
      {reminder !== undefined && <p className="text-[11px] text-[#5c4300]">{reminder}</p>}
      {fields.map((field) => (
        <label key={field.key} className="block text-xs">
          {field.label}
          <input
            className={fieldClass}
            value={values[field.key] ?? ""}
            onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
          />
        </label>
      ))}
      <button type="submit" className={btnClass} disabled={pending}>{title}</button>
      {errorLine}
    </form>
  );
}
