import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api.js";
import CampaignSetup from "./CampaignSetup";
import CampaignTools from "./CampaignTools";
import SetupCompletion from "./SetupCompletion";
import FaustianSurface from "./FaustianSurface";
import type { FaustianWizardRef } from "./FaustianSurface";
import { loreCompendiumUiStateFromQuery } from "./lore-view-model";
import type { WorldReference } from "./WorldSurface";

export default function SetupView({
  campaignId,
  campaignRevision,
}: {
  campaignId: string;
  campaignRevision: number;
}) {
  const [showTools, setShowTools] = useState(false);
  const faustianRef = useQuery(api.m3Queries.getFaustianReference, {});
  const worldRef = useQuery(api.m3Queries.getWorldReference, {});
  const setup = useQuery(api.m3Queries.getCampaignSetup, {});
  const loreCompendiumRef = useQuery(api.m3Queries.getLoreCompendiumReference, {});
  const sorcererRef = useQuery(api.m3Queries.getSorcererReference, {});

  const faustianWizard = faustianWizardFromSetup(setup);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-[1440px] flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            Seven-Part Pact
          </h1>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Revision {campaignRevision}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
            Campaign Setup
          </h2>
          <button
            onClick={() => setShowTools(!showTools)}
            className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            {showTools ? "Back to Setup" : "Campaign Tools"}
          </button>
        </div>

        {showTools ? (
          <CampaignTools
            campaignId={campaignId}
            campaignRevision={campaignRevision}
          />
        ) : (
          <>
            <div className="max-w-md">
              <CampaignSetup />
              <SetupCompletion />
            </div>
            {renderSetupFaustianTable(
              campaignId,
              faustianRef,
              worldRef,
              faustianWizard,
              setup?.wizards.map((wizard) => ({ wizardId: wizard.wizardId, name: wizard.name })) ?? [],
              loreCompendiumUiStateFromQuery(loreCompendiumRef),
              sorcererRef?.presentation.externalPresence ?? [],
              setup?.configuration.ageId ?? null,
            )}
          </>
        )}
      </div>
    </main>
  );
}

function faustianWizardFromSetup(
  setup: ReturnType<typeof useQuery<typeof api.m3Queries.getCampaignSetup>>,
): FaustianWizardRef | null {
  if (setup == null) return null;
  const wizardId = setup.pactSeats?.faustian?.wizardId ?? null;
  if (wizardId === null || wizardId === undefined) return null;
  const wizard = setup.wizards.find((entry) => entry.wizardId === wizardId);
  if (wizard === undefined) return null;
  return {
    wizardId: wizard.wizardId,
    name: wizard.name,
    ageYears: wizard.character.ageYears,
    elements: wizard.character.elements,
    homeIsleId: wizard.homeIsleId,
    sanctumPlaceId: wizard.sanctumPlaceId,
  };
}

function renderSetupFaustianTable(
  campaignId: string,
  faustianRef: ReturnType<typeof useQuery<typeof api.m3Queries.getFaustianReference>>,
  worldRef: ReturnType<typeof useQuery<typeof api.m3Queries.getWorldReference>>,
  faustianWizard: FaustianWizardRef | null,
  wizards: { readonly wizardId: string; readonly name: string }[],
  loreCompendium: ReturnType<typeof loreCompendiumUiStateFromQuery>,
  sorcererPresence: readonly import("../shared/domain").SorcererExternalPresence[],
  ageId: string | null,
) {
  if (faustianRef === undefined || worldRef === undefined) {
    return <div className="py-8 text-sm text-slate-400">Loading Faustian table…</div>;
  }
  if (faustianRef === null || worldRef === null) {
    return null;
  }
  return (
    <FaustianSurface
      faustian={faustianRef.faustian}
      world={worldRef as WorldReference}
      campaignId={campaignId}
      faustianWizard={faustianWizard}
      wizards={wizards}
      loreCompendium={loreCompendium}
      sorcererPresence={sorcererPresence}
      layout="full"
      lifecycleKind="setup"
      ageId={ageId}
    />
  );
}
