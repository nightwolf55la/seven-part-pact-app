import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api.js";
import type {
  FaustianCardId,
  FaustianCommunityId,
  FaustianState,
} from "../shared/domain";
import {
  FAUSTIAN_COMMUNITY_IDS,
  faustianCommunityHeader,
  faustianFaceUpIdentityLabel,
  isFaustianSchemeOccurrenceTargetValid,
  previewFaustianSchemeOccurrence,
} from "../shared/domain";
import {
  cloneFaustianState,
  formatFaustianPreventionCue,
  isFaustianSchemeOccurrenceConfirmReady,
  previewFaustianBlackmailProtection,
  previewFaustianPlaceProtection,
  synthesizeFaustianAfterSchemeReveal,
  type NamedWizardRef,
} from "./faustian-view-model";
import {
  captureFaustianSnapshot,
  faustianPointerExceedsDragThreshold,
  findFaustianCommunityDropId,
} from "./faustian-table-play";

const MENU_BTN =
  "block w-full text-left rounded px-2 py-1 text-[11px] leading-tight cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 whitespace-nowrap";

const CHOOSER_BTN =
  "text-xs font-medium rounded-lg px-2.5 py-1 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40";

function commandId(): string {
  return `cmd_${crypto.randomUUID()}`;
}

function asConvexFaustian(faustian: FaustianState): never {
  return faustian as never;
}

function rejectionText(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "") return error.message;
  return "The action was rejected.";
}

export type FaustianContextMenu =
  | {
    readonly kind: "community";
    readonly communityId: FaustianCommunityId;
    readonly clientX: number;
    readonly clientY: number;
    readonly expectedFaustian: FaustianState;
  }
  | {
    readonly kind: "scheme";
    readonly communityId: FaustianCommunityId;
    readonly cardId: FaustianCardId | null;
    readonly facing: "face_up" | "face_down";
    readonly clientX: number;
    readonly clientY: number;
    readonly expectedFaustian: FaustianState;
  }
  | {
    readonly kind: "accomplice";
    readonly communityId: FaustianCommunityId;
    readonly cardId: FaustianCardId;
    readonly clientX: number;
    readonly clientY: number;
  }
  | {
    readonly kind: "direct-pick";
    readonly communityId: FaustianCommunityId;
    readonly cardId: FaustianCardId;
    readonly clientX: number;
    readonly clientY: number;
  }
  | {
    readonly kind: "pawn";
    readonly communityId: FaustianCommunityId;
    readonly clientX: number;
    readonly clientY: number;
    readonly expectedFaustian: FaustianState;
  }
  | {
    readonly kind: "disrupt-pick";
    readonly communityId: FaustianCommunityId;
    readonly clientX: number;
    readonly clientY: number;
    readonly expectedFaustian: FaustianState;
  }
  | {
    readonly kind: "twist";
    readonly cardId: FaustianCardId;
    readonly facing: "face_up" | "face_down";
    readonly reserved: boolean;
    readonly clientX: number;
    readonly clientY: number;
  }
  | {
    readonly kind: "machinations";
    readonly clientX: number;
    readonly clientY: number;
  }
  | {
    readonly kind: "obligation";
    readonly wizardId: string;
    readonly dueMonthOrdinal: number;
    readonly weeks: number;
    readonly clientX: number;
    readonly clientY: number;
  }
  | {
    readonly kind: "complete-wizard-pick";
    readonly challengeId: string;
    readonly groupId: string;
    readonly clientX: number;
    readonly clientY: number;
  };

export type FaustianLifecycleLaunch =
  | { readonly kind: "machination_outcome" }
  | { readonly kind: "finalize_challenge"; readonly challengeId: string };

export type FaustianSupplyDragKind = "scheme_supply" | "blackmail_supply";

export interface FaustianSchemeSupplyDragVisual {
  readonly kind: FaustianSupplyDragKind;
  readonly clientX: number;
  readonly clientY: number;
  readonly hoveringCommunityId: FaustianCommunityId | null;
}

type InvestigateDraft = {
  readonly communityId: FaustianCommunityId;
  readonly expectedFaustian: FaustianState;
  readonly eligibleSchemeCardIds: readonly FaustianCardId[];
};

type TableCue = {
  readonly communityId: FaustianCommunityId;
  readonly text: string;
};

type OccurrenceDraft = {
  readonly communityId: FaustianCommunityId;
  readonly schemeCardId: FaustianCardId;
  readonly expectedLocalAccompliceCardIds: readonly FaustianCardId[];
  readonly expectedFaustian: FaustianState;
  selectedDirect: FaustianCardId[];
};

export function useFaustianTablePlay(args: {
  readonly faustian: FaustianState;
  readonly campaignId: string;
  readonly wizards: readonly NamedWizardRef[];
  readonly lifecycleKind: "setup" | "play";
}) {
  const { faustian, campaignId, lifecycleKind, wizards } = args;
  const revealSchemes = useMutation(api.m3Commands.revealFaustianCommunitySchemes);
  const foilScheme = useMutation(api.m3Commands.foilFaustianCommunityScheme);
  const blackmail = useMutation(api.m3Commands.blackmailFaustianCommunity);
  const placeSchemes = useMutation(api.m3Commands.placeFaustianSchemes);
  const recordScheme = useMutation(api.m3Commands.recordFaustianSchemeOccurred);
  const directAccomplice = useMutation(api.m3Commands.directFaustianAccomplice);
  const disruptPawn = useMutation(api.m3Commands.disruptFaustianPawn);
  const discloseTwist = useMutation(api.m3Commands.discloseFaustianTwist);
  const recordTwist = useMutation(api.m3Commands.recordFaustianTwistOccurred);
  const completeResponse = useMutation(api.m3Commands.completeFaustianMachinationResponse);
  const fulfillObligation = useMutation(api.m3Commands.fulfillFaustianDueMonthObligation);

  const [contextMenu, setContextMenu] = useState<FaustianContextMenu | null>(null);
  const [dragVisual, setDragVisual] = useState<FaustianSchemeSupplyDragVisual | null>(null);
  const [investigating, setInvestigating] = useState<InvestigateDraft | null>(null);
  const [tableCue, setTableCue] = useState<TableCue | null>(null);
  const [occurrence, setOccurrence] = useState<OccurrenceDraft | null>(null);
  const [lifecycleLaunch, setLifecycleLaunch] = useState<FaustianLifecycleLaunch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const faustianRef = useRef(faustian);
  faustianRef.current = faustian;
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    dragging: boolean;
    kind: FaustianSupplyDragKind;
    expectedFaustian: FaustianState;
  } | null>(null);

  const run = useCallback(async (action: () => Promise<unknown>): Promise<boolean> => {
    setPending(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (caught) {
      setError(rejectionText(caught));
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  const closeMenu = useCallback(() => setContextMenu(null), []);

  const openCommunityMenu = useCallback((communityId: FaustianCommunityId, event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      kind: "community",
      communityId,
      clientX: event.clientX,
      clientY: event.clientY,
      expectedFaustian: captureFaustianSnapshot(faustianRef.current),
    });
  }, []);

  const openSchemeMenu = useCallback((
    communityId: FaustianCommunityId,
    cardId: FaustianCardId | null,
    facing: "face_up" | "face_down",
    event: ReactMouseEvent,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      kind: "scheme",
      communityId,
      cardId,
      facing,
      clientX: event.clientX,
      clientY: event.clientY,
      expectedFaustian: captureFaustianSnapshot(faustianRef.current),
    });
  }, []);

  const openAccompliceMenu = useCallback((
    communityId: FaustianCommunityId,
    cardId: FaustianCardId,
    event: ReactMouseEvent,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      kind: "accomplice",
      communityId,
      cardId,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }, []);

  const openPawnMenu = useCallback((communityId: FaustianCommunityId, event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      kind: "pawn",
      communityId,
      clientX: event.clientX,
      clientY: event.clientY,
      expectedFaustian: captureFaustianSnapshot(faustianRef.current),
    });
  }, []);

  const openTwistMenu = useCallback((
    cardId: FaustianCardId,
    facing: "face_up" | "face_down",
    reserved: boolean,
    event: ReactMouseEvent,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      kind: "twist",
      cardId,
      facing,
      reserved,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }, []);

  const openMachinationsMenu = useCallback((event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      kind: "machinations",
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }, []);

  const openObligationMenu = useCallback((
    wizardId: string,
    dueMonthOrdinal: number,
    weeks: number,
    event: ReactMouseEvent,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      kind: "obligation",
      wizardId,
      dueMonthOrdinal,
      weeks,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }, []);

  const cancelDrag = useCallback(() => {
    dragRef.current = null;
    setDragVisual(null);
  }, []);

  const placeOneScheme = useCallback(async (
    communityId: FaustianCommunityId,
    expectedFaustian: FaustianState,
  ) => {
    await run(async () => {
      await placeSchemes({
        commandId: commandId(),
        expectedCampaignId: campaignId,
        communityId,
        requestedQuantity: 1,
        expectedFaustian: asConvexFaustian(expectedFaustian),
      });
      const preview = previewFaustianPlaceProtection(expectedFaustian, communityId, 1);
      const text = formatFaustianPreventionCue(preview.preventedSchemeCardIds, preview.accompliceCardIds);
      setTableCue(text === null ? null : { communityId, text });
    });
  }, [campaignId, placeSchemes, run]);

  const blackmailCommunity = useCallback(async (
    communityId: FaustianCommunityId,
    expectedFaustian: FaustianState,
  ) => {
    await run(async () => {
      await blackmail({
        commandId: commandId(),
        expectedCampaignId: campaignId,
        communityId,
        expectedFaustian: asConvexFaustian(expectedFaustian),
      });
      const preview = previewFaustianBlackmailProtection(expectedFaustian, communityId);
      const text = formatFaustianPreventionCue(preview.preventedSchemeCardIds, preview.accompliceCardIds);
      setTableCue(text === null ? null : { communityId, text });
    });
  }, [blackmail, campaignId, run]);

  const startSupplyDrag = useCallback((kind: FaustianSupplyDragKind, event: ReactPointerEvent) => {
    if (event.button !== 0 || !event.isPrimary) return;
    const live = faustianRef.current;
    if (kind === "scheme_supply" && live.devilDeck.length === 0) return;
    if (kind === "blackmail_supply" && live.faustianDeck.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    setContextMenu(null);
    const target = event.currentTarget;
    target.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      dragging: false,
      kind,
      expectedFaustian: captureFaustianSnapshot(live),
    };
  }, []);

  const startSchemeSupplyDrag = useCallback((event: ReactPointerEvent) => {
    startSupplyDrag("scheme_supply", event);
  }, [startSupplyDrag]);

  const startBlackmailSupplyDrag = useCallback((event: ReactPointerEvent) => {
    startSupplyDrag("blackmail_supply", event);
  }, [startSupplyDrag]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const session = dragRef.current;
      if (session === null || event.pointerId !== session.pointerId) return;
      const dx = event.clientX - session.startClientX;
      const dy = event.clientY - session.startClientY;
      if (!session.dragging && faustianPointerExceedsDragThreshold(dx, dy)) {
        session.dragging = true;
        setContextMenu(null);
      }
      if (!session.dragging) return;
      const hoveringCommunityId = findFaustianCommunityDropId(document.elementFromPoint(event.clientX, event.clientY));
      setDragVisual({
        kind: session.kind,
        clientX: event.clientX,
        clientY: event.clientY,
        hoveringCommunityId,
      });
    };

    const endDrag = (event: PointerEvent, commit: boolean) => {
      const session = dragRef.current;
      if (session === null || event.pointerId !== session.pointerId) return;
      const expectedFaustian = session.expectedFaustian;
      const wasDragging = session.dragging;
      const kind = session.kind;
      const dropId = findFaustianCommunityDropId(document.elementFromPoint(event.clientX, event.clientY));
      dragRef.current = null;
      setDragVisual(null);
      if (!commit || !wasDragging || dropId === null) return;
      if (kind === "scheme_supply") {
        void placeOneScheme(dropId, expectedFaustian);
        return;
      }
      void blackmailCommunity(dropId, expectedFaustian);
    };

    const onPointerUp = (event: PointerEvent) => endDrag(event, true);
    const onPointerCancel = (event: PointerEvent) => endDrag(event, false);

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [blackmailCommunity, placeOneScheme]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-faustian-context-menu]")) return;
      setContextMenu(null);
    };
    const onContextMenu = (event: Event) => {
      if (event.target instanceof Element && event.target.closest("[data-faustian-table]")) return;
      setContextMenu(null);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("contextmenu", onContextMenu);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("contextmenu", onContextMenu);
    };
  }, []);

  const onPlaceScheme = useCallback((menu: Extract<FaustianContextMenu, { kind: "community" }>) => {
    setContextMenu(null);
    void placeOneScheme(menu.communityId, menu.expectedFaustian);
  }, [placeOneScheme]);

  const onBlackmail = useCallback((menu: Extract<FaustianContextMenu, { kind: "community" }>) => {
    setContextMenu(null);
    void blackmailCommunity(menu.communityId, menu.expectedFaustian);
  }, [blackmailCommunity]);

  const onInvestigate = useCallback((menu: Extract<FaustianContextMenu, { kind: "community" }>) => {
    setContextMenu(null);
    setTableCue(null);
    const live = menu.expectedFaustian.communities.find((community) => community.communityId === menu.communityId);
    const facedown = live?.schemes.filter((scheme) => scheme.facing === "face_down") ?? [];
    if (facedown.length === 0) {
      setInvestigating({
        communityId: menu.communityId,
        expectedFaustian: menu.expectedFaustian,
        eligibleSchemeCardIds: (live?.schemes ?? []).map((scheme) => scheme.cardId),
      });
      return;
    }
    void (async () => {
      const ok = await run(async () => {
        await revealSchemes({
          commandId: commandId(),
          expectedCampaignId: campaignId,
          communityId: menu.communityId,
          expectedFaustian: asConvexFaustian(menu.expectedFaustian),
        });
      });
      if (!ok) return;
      const after = synthesizeFaustianAfterSchemeReveal(menu.expectedFaustian, menu.communityId);
      const eligible = after.communities.find((community) => community.communityId === menu.communityId)?.schemes.map((scheme) => scheme.cardId) ?? [];
      setInvestigating({
        communityId: menu.communityId,
        expectedFaustian: after,
        eligibleSchemeCardIds: eligible,
      });
    })();
  }, [campaignId, revealSchemes, run]);

  const onFoil = useCallback((communityId: FaustianCommunityId, schemeCardId: FaustianCardId) => {
    if (investigating === null) return;
    if (investigating.communityId !== communityId) return;
    if (!investigating.eligibleSchemeCardIds.includes(schemeCardId)) return;
    setContextMenu(null);
    void (async () => {
      const ok = await run(async () => {
        await foilScheme({
          commandId: commandId(),
          expectedCampaignId: campaignId,
          communityId,
          schemeCardId,
          expectedFaustian: asConvexFaustian(investigating.expectedFaustian),
        });
      });
      if (ok) setInvestigating(null);
    })();
  }, [campaignId, foilScheme, investigating, run]);

  const onResolveMachinations = useCallback((
    communityId: FaustianCommunityId,
    schemeCardId: FaustianCardId,
    expectedFaustian: FaustianState,
  ) => {
    if (lifecycleKind !== "play") return;
    if (!isFaustianSchemeOccurrenceTargetValid(expectedFaustian, communityId, schemeCardId)) return;
    const community = expectedFaustian.communities.find((entry) => entry.communityId === communityId);
    const expectedLocalAccompliceCardIds = [...(community?.accompliceCardIds ?? [])];
    const preview = previewFaustianSchemeOccurrence(expectedFaustian, communityId, schemeCardId, []);
    setContextMenu(null);
    if (preview.requiresExplicitDirectSet) {
      setOccurrence({
        communityId,
        schemeCardId,
        expectedLocalAccompliceCardIds,
        expectedFaustian,
        selectedDirect: [],
      });
      return;
    }
    void run(async () => {
      await recordScheme({
        commandId: commandId(),
        expectedCampaignId: campaignId,
        communityId,
        schemeCardId,
        destination: { kind: "ordinary_machinations" },
        directAccompliceCardIds: [...preview.directAccompliceCardIds],
        expectedLocalAccompliceCardIds,
      });
    });
  }, [campaignId, lifecycleKind, recordScheme, run]);

  const confirmOccurrence = useCallback(() => {
    if (occurrence === null) return;
    const preview = previewFaustianSchemeOccurrence(
      occurrence.expectedFaustian,
      occurrence.communityId,
      occurrence.schemeCardId,
      occurrence.selectedDirect,
    );
    if (!isFaustianSchemeOccurrenceConfirmReady({
      schemeCardId: occurrence.schemeCardId,
      requiresExplicitDirectSet: preview.requiresExplicitDirectSet,
      selectedDirectCount: occurrence.selectedDirect.length,
    })) return;
    void (async () => {
      const ok = await run(async () => {
        await recordScheme({
          commandId: commandId(),
          expectedCampaignId: campaignId,
          communityId: occurrence.communityId,
          schemeCardId: occurrence.schemeCardId,
          destination: { kind: "ordinary_machinations" },
          directAccompliceCardIds: [...occurrence.selectedDirect],
          expectedLocalAccompliceCardIds: [...occurrence.expectedLocalAccompliceCardIds],
        });
      });
      if (ok) setOccurrence(null);
    })();
  }, [campaignId, occurrence, recordScheme, run]);

  const onDirectDestination = useCallback((accompliceCardId: FaustianCardId, destinationCommunityId: FaustianCommunityId) => {
    setContextMenu(null);
    void run(async () => {
      await directAccomplice({
        commandId: commandId(),
        expectedCampaignId: campaignId,
        accompliceCardId,
        destinationCommunityId,
      });
    });
  }, [campaignId, directAccomplice, run]);

  const communityAccompliceIds = useCallback((communityId: FaustianCommunityId, snapshot: FaustianState): FaustianCardId[] => {
    return [...(snapshot.communities.find((community) => community.communityId === communityId)?.accompliceCardIds ?? [])];
  }, []);

  const onDisrupt = useCallback((communityId: FaustianCommunityId, snapshot: FaustianState, clientX: number, clientY: number) => {
    const community = snapshot.communities.find((entry) => entry.communityId === communityId);
    if (community === undefined || community.pawnCount < 1) return;
    const accompliceCardIds = communityAccompliceIds(communityId, snapshot);
    if (accompliceCardIds.length === 0) return;
    setContextMenu(null);
    if (accompliceCardIds.length === 1) {
      void run(async () => {
        await disruptPawn({
          commandId: commandId(),
          expectedCampaignId: campaignId,
          communityId,
          accompliceCardId: accompliceCardIds[0],
        });
      });
      return;
    }
    setContextMenu({ kind: "disrupt-pick", communityId, clientX, clientY, expectedFaustian: snapshot });
  }, [campaignId, communityAccompliceIds, disruptPawn, run]);

  const onDisruptAccomplice = useCallback((communityId: FaustianCommunityId, accompliceCardId: FaustianCardId) => {
    setContextMenu(null);
    void run(async () => {
      await disruptPawn({
        commandId: commandId(),
        expectedCampaignId: campaignId,
        communityId,
        accompliceCardId,
      });
    });
  }, [campaignId, disruptPawn, run]);

  const onDiscloseTwist = useCallback((cardId: FaustianCardId) => {
    setContextMenu(null);
    void run(async () => {
      await discloseTwist({
        commandId: commandId(),
        expectedCampaignId: campaignId,
        twistCardId: cardId,
      });
    });
  }, [campaignId, discloseTwist, run]);

  const onTwistOccurred = useCallback((cardId: FaustianCardId) => {
    setContextMenu(null);
    void run(async () => {
      await recordTwist({
        commandId: commandId(),
        expectedCampaignId: campaignId,
        twistCardId: cardId,
      });
    });
  }, [campaignId, recordTwist, run]);

  const onMachinationOutcome = useCallback(() => {
    setContextMenu(null);
    setLifecycleLaunch({ kind: "machination_outcome" });
  }, []);

  const completingWizardId = useCallback((responsibleWizardId: string | null): string | null => {
    if (responsibleWizardId !== null && responsibleWizardId !== "") return responsibleWizardId;
    if (wizards.length === 1) return wizards[0]?.wizardId ?? null;
    return null;
  }, [wizards]);

  const onCompleteResponse = useCallback((
    challengeId: string,
    groupId: string,
    responsibleWizardId: string | null,
    clientX?: number,
    clientY?: number,
  ) => {
    const wizardId = completingWizardId(responsibleWizardId);
    if (wizardId === null) {
      setContextMenu({
        kind: "complete-wizard-pick",
        challengeId,
        groupId,
        clientX: clientX ?? 24,
        clientY: clientY ?? 24,
      });
      return;
    }
    setContextMenu(null);
    void run(async () => {
      await completeResponse({
        commandId: commandId(),
        expectedCampaignId: campaignId,
        challengeId,
        groupId,
        completedByWizardId: wizardId,
      });
    });
  }, [campaignId, completeResponse, completingWizardId, run]);

  const onFinalizeChallenge = useCallback((challengeId: string) => {
    setContextMenu(null);
    setLifecycleLaunch({ kind: "finalize_challenge", challengeId });
  }, []);

  const onFulfillObligation = useCallback((wizardId: string, dueMonthOrdinal: number) => {
    setContextMenu(null);
    void run(async () => {
      await fulfillObligation({
        commandId: commandId(),
        expectedCampaignId: campaignId,
        wizardId,
        dueMonthOrdinal,
        weeks: 1,
      });
    });
  }, [campaignId, fulfillObligation, run]);

  const foilEligible = useCallback((communityId: FaustianCommunityId, cardId: FaustianCardId | null): boolean => {
    if (investigating === null || cardId === null) return false;
    return investigating.communityId === communityId && investigating.eligibleSchemeCardIds.includes(cardId);
  }, [investigating]);

  const clearLifecycleLaunch = useCallback(() => setLifecycleLaunch(null), []);

  return {
    contextMenu,
    dragVisual,
    dragging: dragVisual !== null,
    investigating,
    tableCue,
    occurrence,
    lifecycleLaunch,
    error,
    pending,
    closeMenu,
    cancelDrag,
    openCommunityMenu,
    openSchemeMenu,
    openAccompliceMenu,
    openPawnMenu,
    openTwistMenu,
    openMachinationsMenu,
    openObligationMenu,
    startSchemeSupplyDrag,
    startBlackmailSupplyDrag,
    onPlaceScheme,
    onBlackmail,
    onInvestigate,
    onFoil,
    onResolveMachinations,
    onDirectDestination,
    onDisrupt,
    onDisruptAccomplice,
    onDiscloseTwist,
    onTwistOccurred,
    onMachinationOutcome,
    onCompleteResponse,
    onFinalizeChallenge,
    onFulfillObligation,
    setContextMenu,
    setOccurrence,
    confirmOccurrence,
    foilEligible,
    clearLifecycleLaunch,
    communityAccompliceIds,
    wizardChoices: wizards,
  };
}

export type FaustianTablePlay = ReturnType<typeof useFaustianTablePlay>;

export function FaustianSchemeSupplyGhost({ visual }: { readonly visual: FaustianSchemeSupplyDragVisual | null }) {
  if (visual === null) return null;
  return (
    <div
      data-faustian-drag-ghost
      className="fixed z-50 w-[4.5rem] h-[6.25rem] rounded-md border border-slate-950 bg-slate-800 shadow-lg pointer-events-none select-none"
      style={{ left: visual.clientX + 8, top: visual.clientY + 8 }}
      aria-hidden="true"
    >
      <span className="block text-[0.65rem] text-slate-100 px-1.5 py-1">
        {visual.kind === "blackmail_supply" ? "Facedown" : "Facedown Scheme"}
      </span>
    </div>
  );
}

export function FaustianTableContextMenu({
  play,
}: {
  readonly play: FaustianTablePlay;
}) {
  const menu = play.contextMenu;
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: menu?.clientX ?? 0, top: menu?.clientY ?? 0 });

  useLayoutEffect(() => {
    if (menu === null) return;
    const el = ref.current;
    if (el === null) return;
    const pad = 8;
    let left = menu.clientX;
    let top = menu.clientY;
    const rect = el.getBoundingClientRect();
    if (left + rect.width > window.innerWidth - pad) left = Math.max(pad, window.innerWidth - rect.width - pad);
    if (top + rect.height > window.innerHeight - pad) top = Math.max(pad, window.innerHeight - rect.height - pad);
    if (left < pad) left = pad;
    if (top < pad) top = pad;
    setPos({ left, top });
  }, [menu]);

  if (menu === null) return null;

  let items: ReactNode = null;
  if (menu.kind === "community") {
    const community = menu.expectedFaustian.communities.find((entry) => entry.communityId === menu.communityId);
    const canDisrupt = (community?.pawnCount ?? 0) > 0 && (community?.accompliceCardIds.length ?? 0) > 0;
    items = (
      <>
        <button type="button" role="menuitem" className={MENU_BTN} data-context-action="place-scheme" onClick={() => play.onPlaceScheme(menu)}>
          Place Scheme
        </button>
        <button type="button" role="menuitem" className={MENU_BTN} data-context-action="blackmail" onClick={() => play.onBlackmail(menu)}>
          Blackmail
        </button>
        <button type="button" role="menuitem" className={MENU_BTN} data-context-action="investigate" onClick={() => play.onInvestigate(menu)}>
          Investigate
        </button>
        {canDisrupt && (
          <button
            type="button"
            role="menuitem"
            className={MENU_BTN}
            data-context-action="disrupt-pawn"
            onClick={() => play.onDisrupt(menu.communityId, menu.expectedFaustian, menu.clientX, menu.clientY)}
          >
            Disrupt Pawn
          </button>
        )}
      </>
    );
  } else if (menu.kind === "scheme") {
    const foil = menu.cardId !== null && play.foilEligible(menu.communityId, menu.cardId);
    items = (
      <>
        {foil && (
          <button
            type="button"
            role="menuitem"
            className={MENU_BTN}
            data-context-action="foil"
            onClick={() => play.onFoil(menu.communityId, menu.cardId as FaustianCardId)}
          >
            Foil
          </button>
        )}
        {menu.facing === "face_up" && menu.cardId !== null && !foil && (
          <button
            type="button"
            role="menuitem"
            className={MENU_BTN}
            data-context-action="resolve-machinations"
            onClick={() => play.onResolveMachinations(menu.communityId, menu.cardId as FaustianCardId, menu.expectedFaustian)}
          >
            Resolve to Machinations
          </button>
        )}
        {menu.facing === "face_down" && (
          <p className="px-2 py-1 text-[11px] text-slate-500">Facedown Scheme</p>
        )}
      </>
    );
  } else if (menu.kind === "accomplice") {
    items = (
      <button
        type="button"
        role="menuitem"
        className={MENU_BTN}
        data-context-action="direct"
        onClick={() => play.setContextMenu({ ...menu, kind: "direct-pick" })}
      >
        Direct…
      </button>
    );
  } else if (menu.kind === "direct-pick") {
    items = FAUSTIAN_COMMUNITY_IDS.filter((communityId) => communityId !== menu.communityId).map((communityId) => (
      <button
        key={communityId}
        type="button"
        role="menuitem"
        className={MENU_BTN}
        data-context-action="direct-destination"
        data-community-id={communityId}
        onClick={() => play.onDirectDestination(menu.cardId, communityId)}
      >
        Direct to {faustianCommunityHeader(communityId).zodiacLabel}
      </button>
    ));
  } else if (menu.kind === "pawn") {
    const canDisrupt = play.communityAccompliceIds(menu.communityId, menu.expectedFaustian).length > 0
      && (menu.expectedFaustian.communities.find((entry) => entry.communityId === menu.communityId)?.pawnCount ?? 0) > 0;
    items = canDisrupt ? (
      <button
        type="button"
        role="menuitem"
        className={MENU_BTN}
        data-context-action="disrupt-pawn"
        onClick={() => play.onDisrupt(menu.communityId, menu.expectedFaustian, menu.clientX, menu.clientY)}
      >
        Disrupt Pawn
      </button>
    ) : (
      <p className="px-2 py-1 text-[11px] text-slate-500">No Pawn to disrupt</p>
    );
  } else if (menu.kind === "disrupt-pick") {
    items = play.communityAccompliceIds(menu.communityId, menu.expectedFaustian).map((cardId) => (
      <button
        key={cardId}
        type="button"
        role="menuitem"
        className={MENU_BTN}
        data-context-action="disrupt-accomplice"
        data-card-id={cardId}
        onClick={() => play.onDisruptAccomplice(menu.communityId, cardId)}
      >
        Disrupt with {faustianFaceUpIdentityLabel(cardId)}
      </button>
    ));
  } else if (menu.kind === "twist") {
    items = (
      <>
        {!menu.reserved && (
          <button type="button" role="menuitem" className={MENU_BTN} data-context-action="disclose-twist" onClick={() => play.onDiscloseTwist(menu.cardId)}>
            Disclose / Replace Twist
          </button>
        )}
        {!menu.reserved && menu.facing === "face_up" && (
          <button type="button" role="menuitem" className={MENU_BTN} data-context-action="twist-occurred" onClick={() => play.onTwistOccurred(menu.cardId)}>
            Record Twist Occurred
          </button>
        )}
        {menu.reserved && (
          <p className="px-2 py-1 text-[11px] text-slate-500">Reserved Twist</p>
        )}
      </>
    );
  } else if (menu.kind === "machinations") {
    items = (
      <button type="button" role="menuitem" className={MENU_BTN} data-context-action="machination-outcome" onClick={() => play.onMachinationOutcome()}>
        Record Machination Outcome
      </button>
    );
  } else if (menu.kind === "obligation") {
    items = (
      <button
        type="button"
        role="menuitem"
        className={MENU_BTN}
        data-context-action="fulfill-obligation"
        onClick={() => play.onFulfillObligation(menu.wizardId, menu.dueMonthOrdinal)}
      >
        Record 1 week fulfilled
      </button>
    );
  } else {
    items = play.wizardChoices.map((wizard) => (
      <button
        key={wizard.wizardId}
        type="button"
        role="menuitem"
        className={MENU_BTN}
        data-context-action="complete-wizard"
        onClick={() => play.onCompleteResponse(menu.challengeId, menu.groupId, wizard.wizardId)}
      >
        Complete as {wizard.name}
      </button>
    ));
  }

  return (
    <div
      ref={ref}
      data-faustian-context-menu
      data-context-menu-kind={menu.kind}
      className="fixed z-50 min-w-[11rem] rounded-md border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 shadow-md py-0.5"
      style={{ left: pos.left, top: pos.top }}
      role="menu"
    >
      {items}
    </div>
  );
}

export function FaustianOccurrenceChooser({
  play,
}: {
  readonly play: FaustianTablePlay;
}) {
  if (play.occurrence === null) return null;
  const preview = previewFaustianSchemeOccurrence(
    play.occurrence.expectedFaustian,
    play.occurrence.communityId,
    play.occurrence.schemeCardId,
    play.occurrence.selectedDirect,
  );
  return (
    <section className="rounded-lg border border-amber-700/40 p-3 space-y-2 text-xs" aria-label="Scheme occurrence choice">
      <p className="font-medium">Direct local Accomplices</p>
      <p className="text-slate-500">This Scheme already identifies itself. Choose only the Accomplices that fall directly.</p>
      <fieldset>
        <legend className="sr-only">Direct local Accomplices</legend>
        {preview.localAccompliceCardIds.map((cardId) => (
          <label key={cardId} className="block">
            <input
              type="checkbox"
              checked={play.occurrence!.selectedDirect.includes(cardId)}
              onChange={(event) => play.setOccurrence({
                ...play.occurrence!,
                selectedDirect: event.target.checked
                  ? [...play.occurrence!.selectedDirect, cardId]
                  : play.occurrence!.selectedDirect.filter((id) => id !== cardId),
              })}
            />
            {" "}{faustianFaceUpIdentityLabel(cardId)}
          </label>
        ))}
      </fieldset>
      <div className="flex gap-2">
        <button type="button" className={CHOOSER_BTN} disabled={play.pending} onClick={() => play.confirmOccurrence()}>
          Confirm Scheme Occurred
        </button>
        <button type="button" className={CHOOSER_BTN} onClick={() => play.setOccurrence(null)}>Cancel</button>
      </div>
    </section>
  );
}

export { cloneFaustianState };
