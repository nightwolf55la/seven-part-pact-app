import { describe, it, expect } from "vitest";
import { resolveAppEnvironment } from "../src/app-environment";

describe("resolveAppEnvironment", () => {
  it("resolves local DEV to Local Dev badge and enabled demo tools", () => {
    expect(resolveAppEnvironment({ dev: true, isPreview: false })).toEqual({
      badge: "local-dev",
      demoToolsEnabled: true,
      isPreview: false,
    });
  });

  it("resolves preview flag to Preview/Test when not local", () => {
    expect(resolveAppEnvironment({ dev: false, isPreview: true })).toEqual({
      badge: "preview",
      demoToolsEnabled: true,
      isPreview: true,
    });
  });

  it("resolves production to no environment badge or demo tools", () => {
    expect(resolveAppEnvironment({ dev: false, isPreview: false })).toEqual({
      badge: null,
      demoToolsEnabled: false,
      isPreview: false,
    });
  });

  it("prefers Local Dev over preview when both are true", () => {
    expect(resolveAppEnvironment({ dev: true, isPreview: true })).toEqual({
      badge: "local-dev",
      demoToolsEnabled: true,
      isPreview: true,
    });
  });
});
