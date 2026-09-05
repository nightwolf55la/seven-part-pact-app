// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, useMemo, Component, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import type { QuietWorkspaceData } from "../src/meeting-quiet-view-model";

const populatedQuiet: QuietWorkspaceData = {
  monthOrdinal: 5,
  timeParticipants: [
    {
      wizardId: "wiz_1",
      wizardName: "Merlin",
      allocations: [
        { allocationId: "alc_a", destination: { kind: "domain" }, note: null, resolution: "pending" },
      ],
    },
  ],
  engagements: [
    { engagementId: "eng_1", actingWizardId: "wiz_1", target: { kind: "self" }, resolution: "pending", linkedTimeAllocationId: null },
  ],
  wizardmootAttendance: [],
  modeledWizards: [{ wizardId: "wiz_1", name: "Merlin" }],
};

type UseQueryResult = typeof undefined | null | QuietWorkspaceData;

let useQueryImpl: (query: unknown, args: unknown) => UseQueryResult;

vi.mock("convex/react", () => ({
  // Mirror the real useQuery: it calls a real React hook (useMemo) so that
  // React's internal hook counter advances on every render, exactly as the
  // production hook does. This is what makes the hook-order check fire when a
  // later hook (useCallback) is conditionally added after an early return.
  useQuery: (query: unknown, args: unknown) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useMemo(() => useQueryImpl(query, args), [useQueryImpl]);
  },
  useMutation: () => vi.fn(),
}));

vi.mock("../convex/_generated/api.js", () => ({
  api: {
    m3Queries: { getQuietWorkspace: "m3Queries.getQuietWorkspace" },
    m3Commands: { beginNextMonth: "m3Commands.beginNextMonth" },
  },
}));

import QuietSurface from "../src/QuietSurface";

interface BoundaryState {
  error: Error | null;
}

class CaptureBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };
  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }
  render() {
    if (this.state.error) {
      return createElement("div", { "data-testid": "boundary-error" }, this.state.error.message);
    }
    return this.props.children;
  }
}

function renderOnce(data: UseQueryResult): string {
  useQueryImpl = () => data;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(createElement(QuietSurface, { phase: "quiet" as never, monthOrdinal: 5 }));
  });
  const html = container.innerHTML;
  root.unmount();
  container.remove();
  return html;
}

describe("QuietSurface Rules of Hooks", () => {
  beforeEach(() => {
    useQueryImpl = () => undefined;
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading and populated states without throwing", () => {
    expect(() => renderOnce(undefined)).not.toThrow();
    expect(() => renderOnce(null)).not.toThrow();
    expect(() => renderOnce(populatedQuiet)).not.toThrow();

    const populated = renderOnce(populatedQuiet);
    expect(populated).toContain("Begin Next Month");
  });

  it("does not produce a hook-order error when re-rendering loading -> populated on the same instance", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root: Root = createRoot(container);

    // First render: loading (data === undefined). useQuery runs, then early
    // return before useCallback.
    useQueryImpl = () => undefined;
    flushSync(() => {
      root.render(
        createElement(CaptureBoundary, null,
          createElement(QuietSurface, { phase: "quiet" as never, monthOrdinal: 5 }),
        ),
      );
    });

    // Second render on the SAME instance: now populated. Before the fix,
    // useCallback runs for the first time on this instance, adding a hook
    // that was not present on the previous render -> React throws
    // "Rendered more hooks than during the previous render."
    useQueryImpl = () => populatedQuiet;
    flushSync(() => {
      root.render(
        createElement(CaptureBoundary, null,
          createElement(QuietSurface, { phase: "quiet" as never, monthOrdinal: 5 }),
        ),
      );
    });

    const boundaryError = container.querySelector('[data-testid="boundary-error"]');
    expect(boundaryError).toBeNull();

    root.unmount();
    container.remove();
  });
});
