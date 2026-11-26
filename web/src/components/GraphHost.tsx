import { Component, lazy, Suspense, useMemo, useState, type ErrorInfo, type ReactNode } from "react";

import { Notice } from "./ui";
import { tr, useT } from "../i18n";
import type { DagGraphProps } from "../graph/types";

type GraphModule = typeof import("../graph/ariadne-graph");

let cachedGraphModule: GraphModule | null = null;
let graphModulePromise: Promise<GraphModule> | null = null;
let graphLoadAttempt = 0;

/** Upper bound so a never-firing `load`/`error` event cannot wedge the graph import. */
const STYLESHEET_LOAD_TIMEOUT_MS = 4000;
/** The ~1.7 MB bundle must survive slow remote / cold-cache downloads. */
const BUNDLE_LOAD_TIMEOUT_MS = 20_000;

/**
 * Keep this import unconditional and alone: Vite/Rolldown analyses the literal specifier here and
 * emits `__vite__mapDeps([..., ariadne-graph.css])`. Folding it into a ternary with a
 * `@vite-ignore` sibling made the preload list collapse to `[]` (regression #79).
 */
function importInitialGraphModule(): Promise<GraphModule> {
  return import("../graph/ariadne-graph");
}

function graphStylesheetUrl(): URL {
  return new URL(/* @vite-ignore */ "./ariadne-graph.css", import.meta.url);
}

function hasLoadedRules(link: HTMLLinkElement): boolean {
  try {
    return Boolean(link.sheet && link.sheet.cssRules.length > 0);
  } catch {
    return false;
  }
}

function findGraphStylesheetLinks(pathname: string): HTMLLinkElement[] {
  return Array.from(document.querySelectorAll('link[rel="stylesheet"]')).filter((node) => {
    const href = (node as HTMLLinkElement).href;
    if (!href) return false;
    try {
      return new URL(href).pathname === pathname;
    } catch {
      return false;
    }
  }) as HTMLLinkElement[];
}

function pruneUnloadedStylesheets(): void {
  if (typeof document === "undefined" || import.meta.env.DEV) return;
  const pathname = graphStylesheetUrl().pathname;
  for (const link of findGraphStylesheetLinks(pathname)) {
    if (!hasLoadedRules(link)) link.remove();
  }
}

function waitForStylesheet(link: HTMLLinkElement): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      link.removeEventListener("load", onLoad);
      link.removeEventListener("error", onError);
    };
    const fail = (reason: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      link.remove();
      reject(new Error(reason));
    };
    const onLoad = () => {
      if (settled) return;
      if (!hasLoadedRules(link)) {
        fail("ariadne-graph.css loaded with no CSS rules");
        return;
      }
      settled = true;
      cleanup();
      resolve();
    };
    const onError = () => fail("ariadne-graph.css failed to load");
    const timer = setTimeout(() => fail("ariadne-graph.css load timed out"), STYLESHEET_LOAD_TIMEOUT_MS);
    link.addEventListener("load", onLoad);
    link.addEventListener("error", onError);
  });
}

/** Resolve once ariadne-graph.css has active rules, injecting or retrying when needed. */
async function ensureGraphStylesheet(attempt: number): Promise<void> {
  if (typeof document === "undefined" || import.meta.env.DEV) return;
  const baseUrl = graphStylesheetUrl();
  const existing = findGraphStylesheetLinks(baseUrl.pathname);
  if (existing.some(hasLoadedRules)) {
    for (const link of existing) {
      if (!hasLoadedRules(link)) link.remove();
    }
    return;
  }
  for (const stale of existing) stale.remove();

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.crossOrigin = "anonymous";
  link.href = attempt > 0 ? `${baseUrl.href}?retry=${attempt}` : baseUrl.href;
  const loaded = waitForStylesheet(link);
  document.head.appendChild(link);
  await loaded;
}

function loadGraphModule(): Promise<GraphModule> {
  if (cachedGraphModule) return Promise.resolve(cachedGraphModule);
  if (graphModulePromise) return graphModulePromise;
  const attempt = graphLoadAttempt++;
  const importPromise: Promise<GraphModule> =
    attempt === 0 || import.meta.env.DEV
      ? importInitialGraphModule()
      : (import(
          /* @vite-ignore */ `${new URL(/* @vite-ignore */ "./ariadne-graph.js", import.meta.url).href}?retry=${attempt}`
        ) as Promise<GraphModule>);
  // Swallow late rejections if the timeout below rejects this attempt first.
  void importPromise.catch(() => undefined);

  const attemptPromise = new Promise<GraphModule>((resolve, reject) => {
    let settled = false;
    let cleanupInitialStylesheet = () => {};

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(bundleTimer);
      cleanupInitialStylesheet();
      if (graphModulePromise === attemptPromise) graphModulePromise = null;
      pruneUnloadedStylesheets();
      reject(error);
    };

    const bundleTimer = setTimeout(
      () => fail(new Error("ariadne-graph bundle load timed out")),
      BUNDLE_LOAD_TIMEOUT_MS,
    );

    // In production Vite's __vitePreload appends and awaits ariadne-graph.css synchronously inside
    // importInitialGraphModule(), outside waitForStylesheet, so watch that link here to keep CSS
    // failures fast while the JS bundle keeps the longer budget.
    if (attempt === 0 && typeof document !== "undefined" && !import.meta.env.DEV) {
      const pendingLink = findGraphStylesheetLinks(graphStylesheetUrl().pathname).find(
        (link) => !hasLoadedRules(link),
      );
      if (pendingLink) {
        const onLinkSettled = () => cleanupInitialStylesheet();
        const stylesheetTimer = setTimeout(
          () => fail(new Error("ariadne-graph.css load timed out")),
          STYLESHEET_LOAD_TIMEOUT_MS,
        );
        cleanupInitialStylesheet = () => {
          clearTimeout(stylesheetTimer);
          pendingLink.removeEventListener("load", onLinkSettled);
          pendingLink.removeEventListener("error", onLinkSettled);
        };
        pendingLink.addEventListener("load", onLinkSettled);
        pendingLink.addEventListener("error", onLinkSettled);
      }
    }

    importPromise
      .then(async (mod) => {
        if (settled) return;
        clearTimeout(bundleTimer);
        cleanupInitialStylesheet();
        await ensureGraphStylesheet(attempt);
        if (settled) return;
        settled = true;
        cachedGraphModule = mod;
        resolve(mod);
      })
      .catch(fail);
  });

  graphModulePromise = attemptPromise;
  return attemptPromise;
}

interface BoundaryProps {
  name: string;
  /** Changing this key (e.g. switching runs) retries a graph that failed to load or render. */
  resetKey: string;
  onRetry?: () => void;
  children: ReactNode;
}

interface BoundaryState {
  error: Error | null;
  resetKey: string;
}

export class GraphErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { error };
  }

  static getDerivedStateFromProps(props: BoundaryProps, state: BoundaryState): Partial<BoundaryState> | null {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn(`[ariadne] ${this.props.name} graph unavailable`, error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error) {
      const { onRetry } = this.props;
      return (
        <Notice
          level="warn"
          action={
            onRetry && (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  this.setState({ error: null });
                  onRetry();
                }}
              >
                {tr("重试加载")}
              </button>
            )
          }
        >
          {tr("{name}组件未能加载（ariadne-graph：{reason}），其余控制台功能不受影响。", {
            name: this.props.name,
            reason: error.message || tr("未知错误"),
          })}
        </Notice>
      );
    }
    return this.props.children;
  }
}

export function DagGraphHost(props: DagGraphProps) {
  const t = useT();
  // Freeze the choice per mount: if `cachedGraphModule` fills in after the lazy chunk resolves, a
  // later re-render would swap <LazyDag> for <Loaded>, remounting the graph and dropping focus and
  // the panned/zoomed viewport on the first interaction.
  const [Loaded] = useState(() => cachedGraphModule?.DagGraphView ?? null);
  const [retryToken, setRetryToken] = useState(0);
  const LazyDag = useMemo(
    () =>
      Loaded
        ? null
        : lazy(() => loadGraphModule().then((module) => ({ default: module.DagGraphView }))),
    [Loaded, props.runId, retryToken],
  );
  return (
    <div className="graph-host" id="dag-graph" data-graph-host="dag">
      <GraphErrorBoundary
        name={t("任务依赖图")}
        resetKey={`${props.runId}:${retryToken}`}
        onRetry={() => {
          if (!cachedGraphModule) graphModulePromise = null;
          setRetryToken((token) => token + 1);
        }}
      >
        {Loaded ? (
          <Loaded {...props} />
        ) : LazyDag ? (
          <Suspense fallback={null}>
            <LazyDag {...props} />
          </Suspense>
        ) : null}
      </GraphErrorBoundary>
    </div>
  );
}
