import { describe, it, expect } from "vitest";
import { resolveLifecycleRoute } from "../src/lifecycle-routing";
import type { LifecycleQueryResult } from "../src/lifecycle-routing";

describe("resolveLifecycleRoute", () => {
  it("undefined -> loading", () => {
    expect(resolveLifecycleRoute(undefined)).toEqual({ kind: "loading" });
  });

  it("none -> no_campaign", () => {
    const q: LifecycleQueryResult = { status: "none" };
    expect(resolveLifecycleRoute(q)).toEqual({ kind: "no_campaign" });
  });

  it("deleting -> deleting", () => {
    const q: LifecycleQueryResult = {
      status: "deleting",
      campaignId: "cmp_123",
      phase: "campaignEvents",
    };
    expect(resolveLifecycleRoute(q)).toEqual({
      kind: "deleting",
      campaignId: "cmp_123",
      phase: "campaignEvents",
    });
  });

  it("corrupt -> corrupt", () => {
    const q: LifecycleQueryResult = {
      status: "corrupt",
      reason: "Something is wrong",
    };
    expect(resolveLifecycleRoute(q)).toEqual({
      kind: "corrupt",
      reason: "Something is wrong",
    });
  });

  it("campaign/setup -> setup", () => {
    const q: LifecycleQueryResult = {
      status: "campaign",
      campaignId: "cmp_abc",
      campaignRevision: 0,
      lifecycleKind: "setup",
    };
    expect(resolveLifecycleRoute(q)).toEqual({
      kind: "setup",
      campaignId: "cmp_abc",
      campaignRevision: 0,
    });
  });

  it("campaign/play -> play", () => {
    const q: LifecycleQueryResult = {
      status: "campaign",
      campaignId: "cmp_xyz",
      campaignRevision: 5,
      lifecycleKind: "play",
      monthOrdinal: 12,
      monthDisplayName: "April",
      phase: "new_moon",
    };
    expect(resolveLifecycleRoute(q)).toEqual({
      kind: "play",
      campaignId: "cmp_xyz",
      campaignRevision: 5,
      monthOrdinal: 12,
      monthDisplayName: "April",
      phase: "new_moon",
    });
  });
});
