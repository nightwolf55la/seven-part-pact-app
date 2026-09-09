// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import NoCampaign from "../src/NoCampaign";

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(async () => ({})),
}));

describe("NoCampaign demo tools", () => {
  it("always renders Start New Campaign", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    flushSync(() => {
      root.render(createElement(NoCampaign));
    });
    expect(container.textContent).toContain("Start New Campaign");

    root.unmount();
    container.remove();
  });

  it("shows Start Demo Campaign only when demo tools are enabled", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    flushSync(() => {
      root.render(createElement(NoCampaign, { demoToolsEnabled: false }));
    });
    expect(container.textContent).not.toContain("Start Demo Campaign");

    flushSync(() => {
      root.render(
        createElement(NoCampaign, {
          demoToolsEnabled: true,
          onStartDemo: () => {},
        }),
      );
    });
    expect(container.textContent).toContain("Start Demo Campaign");

    root.unmount();
    container.remove();
  });

  it("does not double-submit demo start while pending", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onStartDemo = vi.fn();

    flushSync(() => {
      root.render(
        createElement(NoCampaign, {
          demoToolsEnabled: true,
          onStartDemo,
          demoPending: true,
        }),
      );
    });

    const demoButton = container.querySelectorAll("button")[1];
    expect(demoButton?.textContent).toContain("Creating Demo Campaign");
    expect(demoButton?.disabled).toBe(true);
    demoButton?.click();
    expect(onStartDemo).not.toHaveBeenCalled();

    root.unmount();
    container.remove();
  });
});
