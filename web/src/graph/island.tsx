import type { ComponentType } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { ReactFlowProvider } from "@xyflow/react";

import { I18nProvider } from "../i18n";
import type { GraphIslandHandle } from "./types";

/** Imperative hooks a mounted graph registers so the host handle can drive it. */
export interface IslandController {
  fit: (() => void) | null;
}

export type IslandComponent<P> = ComponentType<P & { controller: IslandController }>;

let dispatchDepth = 0;

/**
 * Run a host callback from inside a React event handler. Host code typically calls
 * `handle.update()` synchronously from that callback; while dispatching, updates are batched
 * into the current React event instead of being force-flushed.
 */
export function dispatchToHost(callback: () => void): void {
  dispatchDepth += 1;
  try {
    callback();
  } finally {
    dispatchDepth -= 1;
  }
}

/** Mount a graph component into a host element and expose the narrow handle contract. */
export function createIsland<P extends object>(
  container: HTMLElement,
  Component: IslandComponent<P>,
  initialProps: P,
): GraphIslandHandle<P> {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError("AriadneGraph: mount target must be an HTMLElement");
  }
  const controller: IslandController = { fit: null };
  const root = createRoot(container);
  let destroyed = false;

  const render = (props: P): void => {
    // An island is its own React root, so it carries its own i18n provider: without one every
    // `useT()` inside the graph throws and the island renders nothing. The console's tree has
    // the app-level provider, but `mountDag` from raw props (diagnostics, Playwright seams)
    // renders outside it.
    const tree = (
      <I18nProvider>
        <ReactFlowProvider>
          <Component {...props} controller={controller} />
        </ReactFlowProvider>
      </I18nProvider>
    );
    if (dispatchDepth > 0) root.render(tree);
    else flushSync(() => root.render(tree));
  };

  render(initialProps);

  return {
    update(props: P) {
      if (!destroyed) render(props);
    },
    fitView() {
      if (!destroyed) controller.fit?.();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      root.unmount();
    },
  };
}
