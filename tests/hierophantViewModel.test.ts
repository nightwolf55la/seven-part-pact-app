import { describe, it, expect } from "vitest";
import { EMPTY_HIEROPHANT_STATE } from "../shared/domain";
import {
  availableCollectiveDenizens,
  availableIndividualDenizens,
  blasphemyText,
  buildAdjustTempleResourcesPayload,
  buildEstablishCultPayload,
  buildInitializeHierophantPayload,
  buildRemoveRolePayload,
  buildSetSelectedFlameLawsPayload,
  buildTemplePlaceCreatePayload,
  classLabel,
  cultDogmaConvictionWarning,
  cultLeaderWarning,
  denizenLabel,
  hierophantSetupReady,
  hostedProphets,
  hostedSupplicants,
  isHierophantInitialized,
  lawsInCatalogOrder,
  newCampaignBlasphemyId,
  newCampaignClassId,
  newCampaignDoctrineId,
  newCampaignTempleId,
  newCommandId,
  newDogmaEntryId,
  newPlaceId,
  placeLabel,
  templeDisplayName,
  templeEditCapabilities,
  unresolvedStartingTemples,
} from "../src/hierophant-view-model";
import type { HierophantProphet, HierophantSupplicant, HierophantTemple } from "../shared/domain";

const UUID = "11111111-1111-1111-1111-111111111111";

const denizens = [
  { denizenId: "den_a", name: "Acolyte Ann", representation: "individual" as const },
  { denizenId: "den_b", name: "Choir", representation: "collective" as const },
  { denizenId: "den_c", name: "Brother Cal", representation: "individual" as const },
];

const places = [
  { placeId: "plc_krolis", name: "Temple Krolis Grounds" },
];

describe("Hierophant setup helpers", () => {
  it("requires five Temple Place bindings and exactly two Laws to initialize", () => {
    const none = {};
    expect(unresolvedStartingTemples(none)).toHaveLength(5);
    expect(hierophantSetupReady(["first", "second"], none)).toBe(false);
    const partial = { krolis: "plc_1", notor: "plc_2", hestar: "plc_3", ushin: "plc_4" };
    expect(unresolvedStartingTemples(partial)).toEqual(["zephon"]);
    const full = { ...partial, zephon: "plc_5" };
    expect(unresolvedStartingTemples(full)).toEqual([]);
    expect(hierophantSetupReady(["first"], full)).toBe(false);
    expect(hierophantSetupReady(["first", "second", "third"], full)).toBe(false);
    expect(hierophantSetupReady(["first", "second"], full)).toBe(true);
  });

  it("retains an existing Place selection in initialize payload", () => {
    const bindings = {
      krolis: "plc_existing",
      notor: "plc_2",
      hestar: "plc_3",
      ushin: "plc_4",
      zephon: "plc_5",
    };
    const payload = buildInitializeHierophantPayload({
      commandId: "cmd_1",
      expectedCampaignId: "cmp_1",
      selectedLawIds: ["second", "first"],
      bindings,
    });
    expect(payload?.selectedFlameLawIds).toEqual(["first", "second"]);
    expect(payload?.templePlaces[0]).toEqual({ templeId: "krolis", placeId: "plc_existing" });
  });

  it("builds World createPlace payloads with Temple names, unspecified placement, and plc_ IDs", () => {
    const placeId = newPlaceId(UUID);
    expect(placeId).toBe(`plc_${UUID}`);
    const payload = buildTemplePlaceCreatePayload({
      commandId: newCommandId(UUID),
      expectedCampaignId: "cmp_1",
      templeId: "hestar",
      placeId,
    });
    expect(payload).toEqual({
      commandId: `cmd_${UUID}`,
      expectedCampaignId: "cmp_1",
      placeId: `plc_${UUID}`,
      name: "Temple Hestar",
      description: null,
      placement: { kind: "unspecified" },
    });
  });
});

describe("Hierophant view-model labels and selectors", () => {
  it("resolves shared Denizen and Place labels", () => {
    expect(denizenLabel(denizens, "den_a")).toBe("Acolyte Ann");
    expect(denizenLabel(denizens, null)).toBe("Unresolved");
    expect(placeLabel(places, "plc_krolis")).toBe("Temple Krolis Grounds");
  });

  it("filters individual vs collective Denizen choices and used identities", () => {
    expect(availableIndividualDenizens(denizens, []).map((d) => d.denizenId)).toEqual(["den_a", "den_c"]);
    expect(availableIndividualDenizens(denizens, ["den_a"]).map((d) => d.denizenId)).toEqual(["den_c"]);
    expect(availableCollectiveDenizens(denizens, []).map((d) => d.denizenId)).toEqual(["den_b"]);
    expect(availableCollectiveDenizens(denizens, ["den_b"])).toEqual([]);
  });

  it("distinguishes Hestar display and Doctrine editing", () => {
    const hestar: HierophantTemple = {
      templeId: "hestar",
      kind: "hestar",
      placeId: "plc_h" as HierophantTemple["placeId"],
      hostSeatId: "hierophant",
      status: "active",
      abundance: 4,
      conviction: 5,
    };
    const krolis: HierophantTemple = {
      templeId: "krolis",
      kind: "ordinary",
      placeId: "plc_krolis" as HierophantTemple["placeId"],
      hostSeatId: "hierophant",
      status: "active",
      abundance: 5,
      conviction: 4,
      doctrine: { kind: "unset" },
    };
    expect(templeDisplayName(hestar, places)).toBe("Temple Hestar");
    expect(templeDisplayName(krolis, places)).toBe("Temple Krolis");
    expect(templeEditCapabilities(hestar)).toEqual({ isHestar: true, canEditDoctrine: false });
    expect(templeEditCapabilities(krolis)).toEqual({ isHestar: false, canEditDoctrine: true });
  });

  it("groups hosted Supplicants and Prophets", () => {
    const supplicants: HierophantSupplicant[] = [
      { denizenId: "den_a" as never, classId: "peasant", woe: 0, host: { kind: "temple", templeId: "krolis", area: "courtyard" } },
      { denizenId: "den_c" as never, classId: "artisan", woe: 1, host: { kind: "cult", cultDenizenId: "den_b" as never } },
    ];
    const prophets: HierophantProphet[] = [
      { denizenId: "den_c" as never, host: { kind: "temple", templeId: "krolis" } },
    ];
    expect(hostedSupplicants(supplicants, { kind: "temple", templeId: "krolis" })).toHaveLength(1);
    expect(hostedSupplicants(supplicants, { kind: "cult", cultDenizenId: "den_b" })).toHaveLength(1);
    expect(hostedProphets(prophets, { kind: "temple", templeId: "krolis" })).toHaveLength(1);
    expect(hostedProphets(prophets, { kind: "cult", cultDenizenId: "den_b" })).toHaveLength(0);
  });

  it("derives Cult unresolved-leader and Dogma/Conviction mismatch warnings", () => {
    expect(cultLeaderWarning(null)).toBe("Leader unresolved");
    expect(cultLeaderWarning("den_a")).toBeNull();
    expect(cultDogmaConvictionWarning(1, 2)).toBe("Dogmas and Conviction differ.");
    expect(cultDogmaConvictionWarning(2, 2)).toBeNull();
  });

  it("resolves built-in Doctrine/Blasphemy and Class labels", () => {
    expect(classLabel("artisan", [])).toBe("Artisan");
    expect(blasphemyText("law_of_the_wolf", [])).toContain("wolf");
  });
});

describe("Hierophant command payload helpers", () => {
  it("submits Flame Law selections in catalog order including non-two counts", () => {
    const payload = buildSetSelectedFlameLawsPayload({
      commandId: "cmd_1",
      expectedCampaignId: "cmp_1",
      expectedSelectedFlameLawIds: ["first", "second"],
      selectedLawIds: ["third", "first", "fifth"],
    });
    expect(payload.selectedFlameLawIds).toEqual(["first", "third", "fifth"]);
    expect(payload.expectedSelectedFlameLawIds).toEqual(["first", "second"]);
    const none = buildSetSelectedFlameLawsPayload({
      commandId: "cmd_1",
      expectedCampaignId: "cmp_1",
      expectedSelectedFlameLawIds: ["first", "second"],
      selectedLawIds: [],
    });
    expect(none.selectedFlameLawIds).toEqual([]);
    expect(lawsInCatalogOrder(["seventh", "first"])).toEqual(["first", "seventh"]);
  });

  it("builds raw manual Temple resource edits without collapsing or Doctrine changes", () => {
    const payload = buildAdjustTempleResourcesPayload({
      commandId: "cmd_1",
      expectedCampaignId: "cmp_1",
      templeId: "krolis",
      expectedAbundance: 5,
      abundance: 0,
      expectedConviction: 4,
      conviction: 0,
    });
    expect(payload.fields).toEqual({
      abundance: { expected: 5, value: 0 },
      conviction: { expected: 4, value: 0 },
    });
    expect(payload).not.toHaveProperty("status");
    expect(payload).not.toHaveProperty("doctrine");
  });

  it("remove-role payloads do not include Denizen deletion fields", () => {
    const payload = buildRemoveRolePayload({
      commandId: "cmd_1",
      expectedCampaignId: "cmp_1",
      denizenId: "den_a",
    });
    expect(payload).toEqual({
      commandId: "cmd_1",
      expectedCampaignId: "cmp_1",
      denizenId: "den_a",
    });
    expect(Object.keys(payload)).toEqual(["commandId", "expectedCampaignId", "denizenId"]);
  });

  it("allows a Cult leader of null", () => {
    const payload = buildEstablishCultPayload({
      commandId: "cmd_1",
      expectedCampaignId: "cmp_1",
      cultDenizenId: "den_b",
      hostSeatId: "warlock",
      anchorPlaceId: null,
      leaderDenizenId: null,
      blasphemyId: "law_of_the_wolf",
      abundance: 0,
      conviction: 0,
    });
    expect(payload.leaderDenizenId).toBeNull();
  });

  it("uses approved ID prefixes", () => {
    expect(newCommandId(UUID).startsWith("cmd_")).toBe(true);
    expect(newPlaceId(UUID).startsWith("plc_")).toBe(true);
    expect(newCampaignTempleId(UUID).startsWith("htm_")).toBe(true);
    expect(newCampaignClassId(UUID).startsWith("hcl_")).toBe(true);
    expect(newCampaignDoctrineId(UUID).startsWith("hdc_")).toBe(true);
    expect(newCampaignBlasphemyId(UUID).startsWith("hbl_")).toBe(true);
    expect(newDogmaEntryId(UUID).startsWith("hdg_")).toBe(true);
  });

  it("treats empty temples as uninitialized", () => {
    expect(isHierophantInitialized(EMPTY_HIEROPHANT_STATE)).toBe(false);
    expect(isHierophantInitialized({ temples: [{ templeId: "krolis" }] as never })).toBe(true);
  });
});
