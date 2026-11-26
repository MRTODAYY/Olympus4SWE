import { Fragment, type CSSProperties } from "react";

import { useT } from "../i18n";
import { formatDurationMs, localizeComposite, localizeEvidenceNote, statusMeta } from "../lib/labels";
import type { Workbench, WorkbenchState } from "../state/workbench";
import { DesignSpecCard, GoalSpecCard } from "./spec";
import { Badge, Notice } from "./ui";

export function DesignView({ state }: { state: WorkbenchState }) {
  const t = useT();
  const projection = state.projection;
  const spec = projection?.spec;
  const design = projection?.design;
  return (
    <section className="view" data-pane="design" id="view-design" aria-labelledby="design-title" hidden={state.view !== "design"}>
      <header className="view-head">
        <h2 className="view-title" id="design-title">
          {t("架构规格")}
        </h2>
        <Badge
          id="design-badge"
          variant={design && projection?.design_approved ? "ok" : spec ? "warn" : "muted"}
        >
          {design ? `DesignSpec v${design.version || 1}` : spec ? `GoalSpec v${spec.version || 1}` : t("等待规格")}
        </Badge>
      </header>
      <div className="design-grid" id="design-body">
        {!projection ? null : !spec && !design ? (
          <Notice level="info">
            {t("当前运行尚未生成 GoalSpec / DesignSpec。先新建编排提交需求，或批准当前关口后继续推进。")}
          </Notice>
        ) : (
          <>
            {spec ? <GoalSpecCard spec={spec} projection={projection} /> : null}
            {design ? <DesignSpecCard design={design} projection={projection} /> : null}
          </>
        )}
      </div>
    </section>
  );
}

export function MatrixView({ workbench, state }: { workbench: Workbench; state: WorkbenchState }) {
  const t = useT();
  const rows = state.projection?.traceability_matrix || [];
  const counts = { verified: 0, running: 0, failed: 0, risk: 0, pending: 0 };
  rows.forEach((row) => {
    if (row.verification_status === "verified") counts.verified += 1;
    else if (row.verification_status === "running") counts.running += 1;
    else if (row.verification_status === "failed") counts.failed += 1;
    else if (row.verification_status === "unverified_risk_accepted") counts.risk += 1;
    else counts.pending += 1;
  });
  return (
    <section className="view" data-pane="matrix" id="view-matrix" aria-labelledby="matrix-title" hidden={state.view !== "matrix"}>
      <header className="view-head">
        <h2 className="view-title" id="matrix-title">
          {t("需求追踪矩阵")}
        </h2>
        <div className="stage-pills" id="fr-strip" aria-label={t("需求验证状态汇总")}>
          {counts.verified ? <Badge variant="ok">{t("✓ 已验证 {count}", { count: counts.verified })}</Badge> : null}
          {counts.running ? <Badge variant="live">{t("▶ 验证中 {count}", { count: counts.running })}</Badge> : null}
          {counts.failed ? <Badge variant="bad">{t("✕ 失败 {count}", { count: counts.failed })}</Badge> : null}
          {counts.risk ? <Badge variant="warn">{t("⚠ 人工接受 {count}", { count: counts.risk })}</Badge> : null}
          {counts.pending ? <Badge variant="muted">{t("◷ 待验证 {count}", { count: counts.pending })}</Badge> : null}
        </div>
      </header>
      <div className="table-wrapper scroller" tabIndex={0} role="region" aria-labelledby="matrix-caption">
        <table className="matrix-table">
          <caption id="matrix-caption">{t("需求、设计模块、任务与验收结果四级追踪表")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("需求编号")}</th>
              <th scope="col">{t("来源与需求描述")}</th>
              <th scope="col">{t("设计模块")}</th>
              <th scope="col">{t("承接任务")}</th>
              <th scope="col">{t("验收状态与证据")}</th>
            </tr>
          </thead>
          <tbody id="matrix-tbody">
            {rows.map((row) => {
              const meta = statusMeta(row.verification_status);
              const modules = row.design_modules || [];
              const tasks = row.task_ids || [];
              return (
                <tr key={row.requirement_id}>
                  <th scope="row">{row.requirement_id}</th>
                  <td>
                    <strong>{row.source_ref}</strong>
                    {` · ${row.description}`}
                  </td>
                  <td>
                    {modules.length
                      ? modules.map((module, index) => (
                          <Fragment key={module.id}>
                            {index ? " " : null}
                            <button
                              type="button"
                              className="lane-chip"
                              data-jump-design={module.id}
                              title={module.name || ""}
                              onClick={() => workbench.setView("design")}
                            >
                              {module.id}
                            </button>
                          </Fragment>
                        ))
                      : "—"}
                  </td>
                  <td>
                    {tasks.length
                      ? tasks.map((taskId, index) => (
                          <Fragment key={taskId}>
                            {index ? " " : null}
                            <button
                              type="button"
                              className="lane-chip"
                              data-jump-task={taskId}
                              onClick={() => workbench.selectTask(taskId)}
                            >
                              {taskId}
                            </button>
                          </Fragment>
                        ))
                      : "—"}
                  </td>
                  <td>
                    <Badge variant={meta.variant}>{`${meta.glyph} ${t(row.verification_label)}`}</Badge>{" "}
                    <span className="card-note">{localizeEvidenceNote(row.evidence_note)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function WaterfallView({ state }: { state: WorkbenchState }) {
  const t = useT();
  const turns = state.projection?.waterfall_turns || [];
  return (
    <section
      className="view"
      data-pane="waterfall"
      id="view-waterfall"
      aria-labelledby="waterfall-title"
      hidden={state.view !== "waterfall"}
    >
      <header className="view-head">
        <h2 className="view-title" id="waterfall-title">
          {t("Turn 瀑布")}
        </h2>
        <Badge id="waterfall-count">{t("{count} turns", { count: turns.length })}</Badge>
      </header>
      <div className="waterfall" id="waterfall-list">
        {!turns.length ? (
          <Notice level="info">{t("当前运行尚无已记录的执行回合。")}</Notice>
        ) : (
          turns.map((turn) => {
            const meta = statusMeta(turn.status);
            const timed = (Number(turn.duration_ms) || 0) > 0;
            const offset = Math.min(90, Math.max(0, Number(turn.offset_pct) || 0));
            const width = Math.min(100 - offset, Math.max(8, Number(turn.width_pct) || 8));
            const barStyle = { "--wf-offset": `${offset}%`, "--wf-fill": `${width}%` } as CSSProperties;
            return (
              <article
                className="wf-row"
                data-status={turn.status}
                data-timed={timed ? "true" : "false"}
                key={turn.turn_id}
              >
                <div className="wf-actor">
                  <span>{turn.actor}</span>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
                <div className="wf-main">
                  <span className="wf-title">{localizeComposite(turn.title)}</span>
                  <span className="wf-summary">{localizeComposite(turn.summary)}</span>
                  {timed ? (
                    <span className="wf-track">
                      <span className="wf-bar" style={barStyle} />
                    </span>
                  ) : (
                    <span className="wf-track wf-track-untimed" aria-hidden="true">
                      <span className="wf-marker" />
                    </span>
                  )}
                  <span className="wf-summary">{turn.receipt ? turn.receipt.one_line : ""}</span>
                  {turn.manifest_md ? (
                    <div className="tool-list">
                      <details className="tool-row">
                        <summary>
                          <span className="tool-mark">▤</span>
                          <span className="tool-name">MANIFEST.md</span>
                          <span className="tool-target">{localizeComposite(turn.title)}</span>
                          <span className="tool-duration" />
                        </summary>
                        <pre className="tool-body">{turn.manifest_md}</pre>
                      </details>
                    </div>
                  ) : null}
                </div>
                <div className="wf-meta">
                  <span>{formatDurationMs(turn.duration_ms)}</span>
                  <span>{turn.steps > 0 ? t("{count} steps", { count: turn.steps }) : t("事件节点")}</span>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
