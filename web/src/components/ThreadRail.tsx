import type { BallHolder, RunSummary } from "../api/types";
import { LocaleToggle, useT } from "../i18n";
import type { Workbench, WorkbenchState } from "../state/workbench";

const REGISTER_OPTION = "__register__";

function OlympusMark() {
  return (
    <svg className="rail-mark-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        className="rail-mark-frame"
        d="M12 2L22 12L12 22L2 12Z"
        strokeWidth="1.35"
        strokeLinejoin="miter"
      />
      <path
        className="rail-mark-peak"
        d="M7.5 14.25L12 7.75L16.5 14.25"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className="rail-mark-base"
        d="M9 16.5H15"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        className="rail-mark-core"
        d="M12 11.4L13.25 12.65L12 13.9L10.75 12.65Z"
      />
    </svg>
  );
}

function BoardIcon() {
  return (
    <svg className="rail-nav-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2.5" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.25" />
      <path d="M2 6h12" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function WorkspaceIcon() {
  return (
    <svg className="rail-nav-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.2 4.5A1.5 1.5 0 0 1 3.7 3h2.6l1.3 1.5h4.7a1.5 1.5 0 0 1 1.5 1.5v5.5A1.5 1.5 0 0 1 12.3 13H3.7a1.5 1.5 0 0 1-1.5-1.5v-7Z"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg className="rail-nav-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2.5" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M3.2 5.5v6.8A1.2 1.2 0 0 0 4.4 13.5h7.2a1.2 1.2 0 0 0 1.2-1.2V5.5"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path d="M6.4 8.5h3.2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function resolveTabMeta(
  runId: string,
  state: WorkbenchState,
): { title: string; ballHolder: BallHolder; workspaceId: string | null; workspaceName: string } {
  const summary: RunSummary | undefined =
    state.allRuns.find((item) => item.run_id === runId) ||
    state.runs.find((item) => item.run_id === runId);
  if (summary) {
    return {
      title: summary.title,
      ballHolder: summary.ball_holder,
      workspaceId: summary.workspace_id ?? null,
      workspaceName: summary.workspace_name,
    };
  }
  if (state.projection && state.projection.run_id === runId) {
    const status = state.projection.status;
    const ballHolder: BallHolder =
      status === "completed" || status === "cancelled"
        ? "done"
        : status === "awaiting_human" || status === "paused" || status === "failed"
          ? "human"
          : "agent";
    return {
      title: state.projection.title,
      ballHolder,
      workspaceId: null,
      workspaceName: "",
    };
  }
  return {
    title: runId,
    ballHolder: "agent",
    workspaceId: null,
    workspaceName: "",
  };
}

export function ThreadRail({ workbench, state }: { workbench: Workbench; state: WorkbenchState }) {
  const t = useT();
  const collapsed = state.railCollapsed === true;
  const dark = state.theme === "dark";
  const boardActive = state.activeSurface === "board" && !state.showArchived;
  const archiveActive = state.activeSurface === "board" && state.showArchived;
  const repoCount = state.workspaces.length;
  const allProjectsLabel =
    repoCount === 1
      ? t("全部项目（1 个仓库）")
      : t("全部项目（{count} 个仓库）", { count: repoCount });

  return (
    <nav id="rail" className={collapsed ? "scroller collapsed" : "scroller"} aria-label={t("Olympus 导航栏")}>
      <div className="rail-head-row">
        <button
          type="button"
          className="rail-brand"
          aria-label={t("返回 Oracle Board")}
          onClick={() => workbench.openBoard({ archived: false })}
        >
          <span className="rail-mark" aria-hidden="true">
            <OlympusMark />
          </span>
          <span className="rail-wordmark">OLYMPUS</span>
        </button>
        <div className="rail-head-actions">
          <LocaleToggle />
          <button
            type="button"
            className="btn btn-quiet"
            id="theme-toggle"
            aria-label={dark ? t("切换到浅色主题") : t("切换到深色主题")}
            onClick={() => workbench.toggleTheme()}
          >
            {dark ? "☀" : "☾"}
          </button>
          <button
            type="button"
            className="btn btn-quiet"
            id="btn-rail-collapse"
            aria-expanded={collapsed ? "false" : "true"}
            aria-label={t("折叠侧栏")}
            onClick={() => workbench.toggleRail()}
          >
            {collapsed ? "⇥" : "⇤"}
          </button>
        </div>
      </div>

      <div className="workspace-switcher-wrap">
        <select
          id="workspace-switcher"
          className="workspace-select"
          aria-label={t("Workspace switcher")}
          value={state.selectedWorkspaceId || ""}
          onChange={(event) => {
            const value = event.target.value;
            if (value === REGISTER_OPTION) {
              void workbench.openWorkspaceManager();
              return;
            }
            workbench.selectWorkspace(value || null);
          }}
        >
          <option value="">{allProjectsLabel}</option>
          {state.workspaces.map((ws) => {
            const total = ws.active_oracle_count + ws.pending_ruling_count;
            return (
              <option value={ws.workspace_id} key={ws.workspace_id}>
                {total > 0 ? `${ws.name} (${total})` : ws.name}
              </option>
            );
          })}
          <option value={REGISTER_OPTION}>{t("+ 注册工作区…")}</option>
        </select>
      </div>

      <div className="rail-nav" role="group" aria-label={t("Pinned navigation")}>
        <button
          type="button"
          id="nav-oracle-board"
          className="rail-nav-item"
          aria-current={boardActive ? "page" : undefined}
          onClick={() => workbench.openBoard({ archived: false })}
        >
          <BoardIcon />
          <span className="rail-label">{t("Oracle Board")}</span>
          {state.pendingRulingTotal > 0 ? (
            <span
              className="nav-pending-badge"
              id="nav-pending-badge"
              aria-label={t("{count} 项待裁决", { count: state.pendingRulingTotal })}
            >
              {state.pendingRulingTotal}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          id="nav-workspaces"
          className="rail-nav-item"
          onClick={() => void workbench.openWorkspaceManager()}
        >
          <WorkspaceIcon />
          <span className="rail-label">{t("Workspaces")}</span>
          <span className="nav-meta-count">{repoCount}</span>
        </button>

        <button
          type="button"
          id="nav-archive"
          className="rail-nav-item"
          aria-current={archiveActive ? "page" : undefined}
          onClick={() => workbench.toggleArchive()}
        >
          <ArchiveIcon />
          <span className="rail-label">{t("Archive")}</span>
        </button>
      </div>

      <hr className="rail-divider" />

      <div className="rail-tabs-section">
        <p className="rail-section-title">{t("OPEN ARIADNE TABS")}</p>
        <div
          className="open-tabs-list scroller"
          id="open-tabs"
          role="list"
          aria-label={t("Open Ariadne Tabs")}
        >
          {state.openTabs.length ? (
            state.openTabs.map((runId) => {
              const meta = resolveTabMeta(runId, state);
              const isCurrent = state.activeSurface === "oracle" && state.runId === runId;
              const isCrossWorkspace =
                Boolean(state.selectedWorkspaceId) &&
                Boolean(meta.workspaceName) &&
                meta.workspaceId !== state.selectedWorkspaceId;
              return (
                <div
                  className="ariadne-tab"
                  role="listitem"
                  key={runId}
                  data-run-id={runId}
                  data-ball={meta.ballHolder}
                  data-active={isCurrent ? "true" : "false"}
                >
                  <button
                    type="button"
                    className="ariadne-tab-trigger"
                    aria-current={isCurrent ? "page" : undefined}
                    onClick={() => workbench.openOracleTab(runId)}
                  >
                    <span
                      className="tab-status-dot"
                      data-ball={meta.ballHolder}
                      aria-hidden="true"
                    />
                    <span className="ariadne-tab-text">
                      <span className="ariadne-tab-title">{meta.title}</span>
                      {isCrossWorkspace ? (
                        <span className="ariadne-tab-workspace">{meta.workspaceName}</span>
                      ) : null}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="ariadne-tab-close"
                    aria-label={t("关闭标签 {title}", { title: meta.title })}
                    data-close-tab={runId}
                    onClick={() => workbench.closeOracleTab(runId)}
                  >
                    ×
                  </button>
                </div>
              );
            })
          ) : (
            <p className="thread-empty">{t("Select an Oracle card to open an Ariadne cockpit tab.")}</p>
          )}
        </div>
      </div>
    </nav>
  );
}
