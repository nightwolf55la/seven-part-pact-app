// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  EnvironmentBadge,
  PreviewBadge,
  usePreviewDocumentTitle,
  BASE_DOCUMENT_TITLE,
} from "../src/preview-indicator";

describe("EnvironmentBadge", () => {
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

  it("renders Local Dev badge", () => {
    flushSync(() => {
      root.render(createElement(EnvironmentBadge, { badge: "local-dev" }));
    });
    expect(container.textContent).toContain("Local Dev");
    expect(container.textContent).not.toContain("Preview / Test");
  });

  it("renders Preview / Test badge", () => {
    flushSync(() => {
      root.render(createElement(EnvironmentBadge, { badge: "preview" }));
    });
    expect(container.textContent).toContain("Preview / Test");
  });

  it("renders nothing when badge is null", () => {
    flushSync(() => {
      root.render(createElement(EnvironmentBadge, { badge: null }));
    });
    expect(container.children.length).toBe(0);
  });
});

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
