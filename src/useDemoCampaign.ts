import { useMutation } from "convex/react";
import { useCallback, useRef, useState } from "react";
import { api } from "../convex/_generated/api.js";
import {
  formatDemoSetupFailure,
  runDemoCampaignSetup,
  type DemoCampaignMutations,
} from "./demo-campaign";

export type DemoCampaignStatus = "idle" | "running" | "error";

export function useDemoCampaign(enabled: boolean) {
  const [status, setStatus] = useState<DemoCampaignStatus>("idle");
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);

  const startNewCampaign = useMutation(api.campaign.startNewCampaign);
  const addPlayer = useMutation(api.m3Commands.addPlayer);
  const setCampaignAge = useMutation(api.m3Commands.setCampaignAge);
  const setFacilitator = useMutation(api.m3Commands.setFacilitator);
  const createWizard = useMutation(api.m3Commands.createWizard);
  const setPactSeatStatus = useMutation(api.m3Commands.setPactSeatStatus);
  const setWatcher = useMutation(api.m3Commands.setWatcher);
  const setSetupMonth = useMutation(api.m3Commands.setSetupMonth);
  const setSetupOrreryPosition = useMutation(api.m3Commands.setSetupOrreryPosition);
  const createPlace = useMutation(api.m3Commands.createPlace);
  const createDenizen = useMutation(api.m3Commands.createDenizen);
  const initializeHierophant = useMutation(api.m3Commands.initializeHierophant);
  const addSupplicant = useMutation(api.m3Commands.addSupplicant);
  const addProphet = useMutation(api.m3Commands.addProphet);
  const establishCult = useMutation(api.m3Commands.establishCult);
  const addCultDogma = useMutation(api.m3Commands.addCultDogma);
  const beginPlay = useMutation(api.m3Commands.beginPlay);

  const start = useCallback(async () => {
    if (!enabled || runningRef.current) return;
    runningRef.current = true;
    setStatus("running");
    setError(null);
    setProgress("Starting demo campaign…");

    const mutations: DemoCampaignMutations = {
      startNewCampaign: () => startNewCampaign({}),
      addPlayer: (args) => addPlayer(args),
      setCampaignAge: (args) => setCampaignAge(args),
      setFacilitator: (args) => setFacilitator(args),
      createWizard: (args) => createWizard(args),
      setPactSeatStatus: (args) => setPactSeatStatus(args),
      setWatcher: (args) => setWatcher(args),
      setSetupMonth: (args) => setSetupMonth(args),
      setSetupOrreryPosition: (args) => setSetupOrreryPosition(args),
      createPlace: (args) => createPlace(args),
      createDenizen: (args) => createDenizen(args),
      initializeHierophant: (args) => initializeHierophant(args),
      addSupplicant: (args) => addSupplicant(args),
      addProphet: (args) => addProphet(args),
      establishCult: (args) => establishCult(args),
      addCultDogma: (args) => addCultDogma(args),
      beginPlay: (args) => beginPlay(args),
    };

    const result = await runDemoCampaignSetup(
      mutations,
      () => crypto.randomUUID(),
      (step) => setProgress(step),
    );

    runningRef.current = false;

    if (result.ok) {
      setStatus("idle");
      setProgress(null);
      return;
    }

    setStatus("error");
    setProgress(null);
    setError(formatDemoSetupFailure(result.failedStep, new Error(result.error)));
  }, [
    enabled,
    startNewCampaign,
    addPlayer,
    setCampaignAge,
    setFacilitator,
    createWizard,
    setPactSeatStatus,
    setWatcher,
    setSetupMonth,
    setSetupOrreryPosition,
    createPlace,
    createDenizen,
    initializeHierophant,
    addSupplicant,
    addProphet,
    establishCult,
    addCultDogma,
    beginPlay,
  ]);

  const dismiss = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return {
    status,
    progress,
    error,
    start,
    dismiss,
    pending: status === "running",
  };
}
