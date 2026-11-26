import type { ReactNode } from "react";

import type { BallHolder, RunSummary } from "../api/types";
import { useT } from "../i18n";
import { GOD_META } from "../lib/labels";
import type { BoardModeFilter, Workbench, WorkbenchState } from "../state/workbench";
import { OracleCard } from "./OracleCard";

export interface OracleBoardProps {
  workbench: Workbench;
  state: WorkbenchState;
  onQuickRule?: (runId: string) => void;
  footerSlot?: ReactNode;
}

const MODE_FILTERS: { id: BoardModeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "brownfield", label: "Brownfield" },
  { id: "greenfield", label: "Greenfield" },
  { id: "spec_only", label: "Spec-Only" },
];

const COLUMNS: {
  id: BallHolder;
  title: string;
  tone: "warn" | "live" | "ok";
  empty: string;
}[] = [
  {
    id: "human",
    title: "Awaiting Your Ruling",
    tone: "warn",
    empty: "No Oracles awaiting your ruling.",
  },
  {
    id: "agent",
    title: "In Flight · Pantheon Active",
    tone: "live",
    empty: "No Oracles currently in flight.",
  },
  {
    id: "done",
    title: "Delivered & Verified",
    tone: "ok",
    empty: "No delivered Oracles yet.",
  },
];

export function OracleBoard({
  workbench,
  state,
  onQuickRule,
  footerSlot,
}: OracleBoardProps) {
  const t = useT();
  const openTabSet = new Set(state.openTabs);
  const selectedWorkspace = state.selectedWorkspaceId
    ? state.workspaces.find((ws) => ws.workspace_id === state.selectedWorkspaceId)
    : null;
  const scopeName = selectedWorkspace ? selectedWorkspace.name : t("All Projects");

  const modeFiltered = state.runs.filter(
    (run) => state.boardModeFilter === "all" || run.workspace_mode === state.boardModeFilter,
  );

  const activeRuns = modeFiltered.filter((run) => !run.is_archived);
  const archivedRuns = modeFiltered.filter((run) => run.is_archived || run.ball_holder === "done");
  const activeCount = activeRuns.filter((run) => run.ball_holder !== "done").length;
  const connection = workbench.connectionText();
  const activeGodMeta = state.selectedGodFilter ? GOD_META[state.selectedGodFilter] : null;
  const effectiveGodFilter = state.hoveredGod ?? state.selectedGodFilter;

  const scopePill = state.showArchived
    ? t("{scope} · {count} 个已归档", { scope: scopeName, count: archivedRuns.length })
    : t("{scope} · {count} 个进行中", { scope: scopeName, count: activeCount });

  const grouped: Record<BallHolder, RunSummary[]> = {
    human: activeRuns.filter((run) => run.ball_holder === "human"),
    agent: activeRuns.filter((run) => run.ball_holder === "agent"),
    done: activeRuns.filter((run) => run.ball_holder === "done"),
  };

  return (
    <main id="oracle-board" className="board-shell" aria-label={t("Oracle Board")}>
      <header className="board-head">
        <div className="board-head-left">
          <h1 className="board-title">{t("Oracle Board")}</h1>
          <span className="board-scope-pill" id="board-scope-pill">
            {scopePill}
          </span>
          <span
            className="badge"
            data-variant="warn"
            id="run-connection"
            role="status"
            hidden={!connection}
          >
            {connection}
          </span>
        </div>

        <div className="board-head-right">
          <div
            className="mode-filter-group"
            role="group"
            aria-label={t("Filter by workspace mode")}
          >
            {MODE_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="mode-pill"
                data-mode-filter={item.id}
                aria-pressed={state.boardModeFilter === item.id ? "true" : "false"}
                onClick={() => workbench.setBoardModeFilter(item.id)}
              >
                {t(item.label)}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-accent"
            id="btn-issue-oracle"
            onClick={() => void workbench.openNewRun()}
          >
            {t("+ Issue Oracle")}
          </button>
        </div>
      </header>

      {activeGodMeta && !footerSlot ? (
        <div className="board-filter-bar" role="status">
          <span>
            {t("Highlighting Pantheon seat:")} <strong>{activeGodMeta.name}</strong> ({activeGodMeta.role})
          </span>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => workbench.setGodFilter(null)}
          >
            {t("Clear filter")}
          </button>
        </div>
      ) : null}

      {state.showArchived ? (
        <div className="board-canvas scroller" id="oracle-board-archive">
          <div className="board-archive-banner">
            <div className="board-archive-copy">
              <h2 className="board-col-title">{t("Archived & Completed History")}</h2>
              <span className="board-col-count" data-tone="muted">
                {archivedRuns.length}
              </span>
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => workbench.openBoard({ archived: false })}
            >
              {t("Return to Active Board")}
            </button>
          </div>
          {archivedRuns.length ? (
            <div className="board-archive-grid" data-column="archive">
              {archivedRuns.map((run) => {
                const dimmed =
                  effectiveGodFilter !== null && run.active_god !== effectiveGodFilter;
                const highlighted =
                  effectiveGodFilter !== null && run.active_god === effectiveGodFilter;
                return (
                  <OracleCard
                    key={run.run_id}
                    run={run}
                    isOpenTab={openTabSet.has(run.run_id)}
                    dimmed={dimmed}
                    highlighted={highlighted}
                    onOpenTab={(id) => workbench.openOracleTab(id)}
                  />
                );
              })}
            </div>
          ) : (
            <p className="board-empty">{t("No archived or completed Oracles in this scope.")}</p>
          )}
        </div>
      ) : (
        <div className="board-canvas scroller" id="oracle-board-columns">
          <div className="board-columns">
            {COLUMNS.map((col) => {
              const items = grouped[col.id];
              const title = t(col.title);
              return (
                <section
                  key={col.id}
                  className="board-column"
                  data-column={col.id}
                  aria-label={title}
                >
                  <div className="board-col-head">
                    <h2 className="board-col-title">{title}</h2>
                    <span className="board-col-count" data-tone={col.tone}>
                      {items.length}
                    </span>
                  </div>
                  <div className="board-col-cards">
                    {items.length ? (
                      items.map((run) => {
                        const dimmed =
                          effectiveGodFilter !== null &&
                          run.active_god !== effectiveGodFilter;
                        const highlighted =
                          effectiveGodFilter !== null &&
                          run.active_god === effectiveGodFilter;
                        return (
                          <OracleCard
                            key={run.run_id}
                            run={run}
                            isOpenTab={openTabSet.has(run.run_id)}
                            dimmed={dimmed}
                            highlighted={highlighted}
                            onOpenTab={(id) => workbench.openOracleTab(id)}
                            onQuickRule={onQuickRule}
                          />
                        );
                      })
                    ) : (
                      <p className="board-col-empty">{t(col.empty)}</p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {footerSlot ? <div className="board-footer-slot">{footerSlot}</div> : null}
    </main>
  );
}
