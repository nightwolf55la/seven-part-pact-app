// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { PreviewBadge, usePreviewDocumentTitle, BASE_DOCUMENT_TITLE } from "../src/preview-indicator";

describe("PreviewBadge", () => {
  let container: HTMLElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    container.remove();
  });

  it("renders PREVIEW / TEST badge when isPreview is true", () => {
    flushSync(() => {
      root.render(createElement(PreviewBadge, { isPreview: true }));
    });
    expect(container.textContent).toContain("Preview / Test");
  });

  it("renders nothing when isPreview is false", () => {
    flushSync(() => {
      root.render(createElement(PreviewBadge, { isPreview: false }));
    });
    expect(container.textContent).not.toContain("Preview / Test");
    expect(container.children.length).toBe(0);
  });

  it("renders nothing when isPreview is absent", () => {
    flushSync(() => {
      root.render(createElement(PreviewBadge, { isPreview: undefined as unknown as boolean }));
    });
    expect(container.textContent).not.toContain("Preview / Test");
  });
});

describe("usePreviewDocumentTitle", () => {
  let originalTitle: string;

  beforeEach(() => {
    originalTitle = document.title;
    document.title = BASE_DOCUMENT_TITLE;
  });

  afterEach(() => {
    document.title = originalTitle;
  });

  it("prefixes document title with [PREVIEW] when isPreview is true", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    function Harness() {
      usePreviewDocumentTitle(true);
      return null;
    }

    flushSync(() => {
      root.render(createElement(Harness));
    });
    expect(document.title).toBe("[PREVIEW] " + BASE_DOCUMENT_TITLE);

    root.unmount();
    container.remove();
  });

  it("leaves document title unchanged when isPreview is false", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    function Harness() {
      usePreviewDocumentTitle(false);
      return null;
    }

    flushSync(() => {
      root.render(createElement(Harness));
    });
    expect(document.title).toBe(BASE_DOCUMENT_TITLE);

    root.unmount();
    container.remove();
  });
});
