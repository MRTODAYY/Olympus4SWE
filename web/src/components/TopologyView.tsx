import type { PostDagSummary, ProductVerificationView, RunProjection } from "../api/types";
import { productArtifactUrl } from "../api/client";
import { tr, useT } from "../i18n";
import { dagGraphProps } from "../lib/graphProps";
import {
  currentStage,
  DELIVERY_STATUS,
  formatTokens,
  NODE_LABELS,
  OUTPUT_ACTIONS,
  POST_DAG_OUTCOME,
  POST_DAG_PHASE,
  POST_DAG_STATUS,
  progressText,
  localizeEvidenceNote,
  statusMeta,
  taskDisplayStatus,
  workflowCurrentNode,
  WORKFLOW_LABELS,
} from "../lib/labels";
import type { Workbench, WorkbenchState } from "../state/workbench";
import { RecordedArtifactCards } from "./Artifacts";
import { DagGraphHost } from "./GraphHost";
import { WorkflowStages } from "./WorkflowStages";
import { Badge, StatCells } from "./ui";

function StageLivePanel({ workbench, state, projection }: { workbench: Workbench; state: WorkbenchState; projection: RunProjection | null }) {
  const t = useT();
  if (!projection) {
    return <section className="stage-live-panel card" id="stage-live-panel" hidden aria-labelledby="run-progress-title" />;
  }
  const stage = currentStage(projection);
  const recent = projection.recent_progress;
  const stamp = recent?.created_at || projection.created_at;
  const outputs = projection.key_outputs || [];
  const latest = outputs[0];
  const budget = projection.budget;
  const latestProductSeq =
    projection.delivery_acceptance?.product_verification?.event_seq ?? null;
  const isLatestProduct = (item: (typeof outputs)[number] | undefined): boolean =>
    Boolean(
      item &&
        item.event_type === "product.verified" &&
        latestProductSeq != null &&
        item.event_seq === latestProductSeq,
    );
  const latestIsProduct = isLatestProduct(latest);
  return (
    <section className="stage-live-panel card" id="stage-live-panel" aria-labelledby="run-progress-title">
      <div className="card-head">
        <h2 className="card-title" id="run-progress-title">
          {t("运行进展")}
        </h2>
        <details className="run-detail">
          <summary>{t("运行详情")}</summary>
          <div id="run-detail-stats" className="stat-band">
            <StatCells
              items={[
                {
                  label: "LLM",
                  value: budget.max_calls == null ? t("{used} 次", { used: budget.calls_used }) : `${budget.calls_used} / ${budget.max_calls}`,
                },
                { label: "Token", value: formatTokens(budget.total_tokens) },
                { label: t("修订"), value: `r${projection.state_revision}` },
                { label: t("最近事件"), value: `#${projection.latest_event_seq}` },
              ]}
            />
          </div>
        </details>
      </div>
      <p id="run-current-stage" className="stage-activity-item" role="status">
        {t("当前阶段 · {stage}", { stage: stage.label })}
      </p>
      <p className="run-progress-note">
        <span id="run-recent-progress">{t("最近确认 · {progress}", { progress: progressText(recent) })}</span>{" "}
        <time id="run-progress-time" dateTime={stamp}>
          {stamp ? new Date(stamp).toLocaleString("zh-CN") : ""}
        </time>
      </p>
      <div id="run-key-output" className="stage-activity-item" hidden={!latest}>
        <p id="run-output-summary" role="status">
          {latest?.summary || ""}
        </p>
        <button
          id="run-output-detail"
          type="button"
          className="btn"
          hidden={!latest}
          onClick={() => void workbench.openOutput(workbench.state.projection?.key_outputs?.[0])}
        >
          {latest
            ? latestIsProduct
              ? t("查看实机证据")
              : latest.current || latest.detail_available
                ? OUTPUT_ACTIONS[latest.kind]
                : t("查看版本记录")
            : ""}
        </button>
      </div>
      <details id="run-output-history" className="run-detail" hidden={!outputs.length}>
        <summary>{t("产物历史")}</summary>
        <ol id="run-output-versions">
          {outputs.map((output) => {
            const detail = state.attemptDetails[output.key];
            const isProductOutput = isLatestProduct(output);
            return (
              <li key={output.key} data-output-key={output.key} tabIndex={-1}>
                <span>{output.summary}</span>
                <code>
                  {output.content_hash
                    ? `${output.artifact_id} · ${output.content_hash}`
                    : new Date(output.created_at).toLocaleString()}
                </code>
                {isProductOutput || output.current || output.detail_available ? (
                  <button
                    type="button"
                    className="btn"
                    data-history-output={output.key}
                    onClick={() => void workbench.openOutput(output)}
                  >
                    {isProductOutput ? t("查看实机证据") : OUTPUT_ACTIONS[output.kind]}
                  </button>
                ) : null}
                {detail ? (
                  <section className="run-attempt-detail" tabIndex={-1} aria-label={output.summary}>
                    {detail.status === "loading" ? (
                      t("正在读取执行产物…")
                    ) : (
                      <RecordedArtifactCards
                        artifacts={detail.artifacts}
                        manifest={detail.artifacts.manifest_md}
                        showEmpty={false}
                      />
                    )}
                  </section>
                ) : null}
              </li>
            );
          })}
        </ol>
      </details>
    </section>
  );
}

function workflowBadge(projection: RunProjection | null): string {
  if (!projection) return tr("拓扑加载中…");
  const workflow = projection.workflow;
  const name = workflow.name || projection.workflow_name || "workflow";
  const label = WORKFLOW_LABELS[name] || name;
  if (!workflow.graph?.nodes?.length) return tr("{label} · 拓扑不可用", { label });
  const current = workflowCurrentNode(workflow);
  const currentText = current ? `${NODE_LABELS[current] || current} (${current})` : "";
  return `${label} · ${workflow.topology || "topology"} · stop=${workflow.stop_after || "-"}${
    currentText ? tr(" · 当前 {current}", { current: currentText }) : ""
  }`;
}

function ProductVerificationCard({
  workbench,
  runId,
  verification,
}: {
  workbench: Workbench;
  runId: string;
  verification: ProductVerificationView;
}) {
  const t = useT();
  const checks = verification.checks || [];
  const failures = verification.failures || [];
  const screenshotSuppressed = checks.some(
    (check) => check.name === "screenshot" && check.status !== "passed",
  );
  const shotUrl =
    verification.has_screenshot && !screenshotSuppressed
      ? productArtifactUrl(
          runId,
          "screenshot",
          verification.event_seq,
          verification.screenshot_sha256,
        )
      : null;
  const bootLogUrl = verification.has_boot_log
    ? productArtifactUrl(runId, "boot_log", verification.event_seq)
    : null;
  const reportUrl = verification.has_report
    ? productArtifactUrl(runId, "report", verification.event_seq)
    : null;
  return (
    <article
      className="card product-e2e-card"
      id="product-verification-card"
      data-passed={verification.passed ? "true" : "false"}
      aria-label={t("实机端到端验收")}
    >
      <div className="card-head">
        <div className="view-head-meta">
          <h3 className="card-title">{t("Product E2E 实机验收")}</h3>
          <Badge variant={verification.passed ? "ok" : "bad"}>
            {verification.passed ? t("✓ 实机通过") : t("✕ 实机未通过")}
          </Badge>
        </div>
        <span className="card-note">
          {`#${verification.event_seq} · ${new Date(verification.verified_at).toLocaleString("zh-CN")}`}
        </span>
      </div>
      <div className="product-e2e-body">
        <div className="product-e2e-copy">
          {verification.summary ? <p>{verification.summary}</p> : null}
          {failures.length ? (
            <ul className="product-e2e-failures" aria-label={t("实机失败项")}>
              {failures.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          ) : null}
          {checks.length ? (
            <div className="product-e2e-checks" aria-label={t("实机检查项")}>
              {checks.map((check, idx) => {
                const ok = check.status === "passed";
                const skipped =
                  check.status === "skipped" || check.status.startsWith("skipped_");
                const variant = ok ? "ok" : skipped ? "muted" : "bad";
                const glyph = ok ? "✓" : skipped ? "—" : "✕";
                return (
                  <Badge variant={variant} key={`${check.name}-${idx}`}>
                    {`${glyph} ${check.name}${check.port ? `:${check.port}` : ""}`}
                  </Badge>
                );
              })}
            </div>
          ) : null}
          <div className="product-e2e-actions">
            <button
              type="button"
              className="btn"
              id="btn-inspect-product-e2e"
              aria-controls="dock"
              onClick={() => workbench.showProductEvidence()}
            >
              {t("在检查器查看实机证据")}
            </button>
            {bootLogUrl ? (
              <a className="btn btn-quiet" href={bootLogUrl} target="_blank" rel="noopener">
                {t("启动日志 (boot.log)")}
              </a>
            ) : null}
            {reportUrl ? (
              <a className="btn btn-quiet" href={reportUrl} target="_blank" rel="noopener">
                {t("验证报告 (report.json)")}
              </a>
            ) : null}
          </div>
        </div>
        {shotUrl ? (
          <button
            type="button"
            className="product-e2e-thumb"
            aria-label={t("在检查器查看实机首页截图")}
            onClick={() => workbench.showProductEvidence()}
          >
            <img key={shotUrl} src={shotUrl} alt={t("实机首页截图")} loading="lazy" />
          </button>
        ) : null}
      </div>
    </article>
  );
}

function PostDagCard({ workbench, postDag }: { workbench: Workbench; postDag: PostDagSummary }) {
  const t = useT();
  const [statusLabel, statusVariant] = POST_DAG_STATUS[postDag.status] || POST_DAG_STATUS.idle;
  const rounds = postDag.rounds || [];
  const verdict = postDag.latest_argus_verdict;
  const verdictDetail = verdict
    ? verdict.summary || t("{count} 条发现", { count: (verdict.findings || []).length })
    : "";
  return (
    <article className="card post-dag-card" id="post-dag-card" aria-label={t("Post-DAG 统一复核与修复轮次")}>
      <div className="card-head">
        <div className="view-head-meta">
          <h3 className="card-title">{t("Post-DAG 交付级复核与修复")}</h3>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
          <Badge variant="muted">{t("{count} 轮记录", { count: postDag.total_rounds })}</Badge>
        </div>
        <button
          type="button"
          className="btn btn-quiet"
          id="btn-inspect-post-dag"
          aria-controls="dock"
          onClick={() => workbench.showProductEvidence()}
        >
          {t("查看完整复核详情")}
        </button>
      </div>
      {verdict ? (
        <p className="card-note">
          {verdict.passed
            ? t("Argus 全局复核：通过 · {detail}", { detail: verdictDetail })
            : t("Argus 全局复核：未通过 · {detail}", { detail: verdictDetail })}
        </p>
      ) : null}
      {rounds.length ? (
        <ol className="post-dag-rounds" id="post-dag-rounds">
          {rounds.map((round) => {
            const [outcomeLabel, outcomeVariant] =
              POST_DAG_OUTCOME[round.outcome] || POST_DAG_OUTCOME.completed;
            return (
              <li className="post-dag-round" key={`${round.sequence}-${round.event_seq}`}>
                <div className="post-dag-round-head">
                  <Badge variant="muted">{`#${round.sequence}`}</Badge>
                  <Badge variant="muted">{POST_DAG_PHASE[round.phase] || round.phase}</Badge>
                  <Badge variant={outcomeVariant}>{outcomeLabel}</Badge>
                  {round.reported_round > 0 ? (
                    <span className="card-note">{`round ${round.reported_round}`}</span>
                  ) : null}
                  {round.repro_checked != null ? (
                    <span className="card-note">
                      {t("复检 {checked} 条 · 失败 {failed}", {
                        checked: round.repro_checked,
                        failed: round.repro_failed ?? 0,
                      })}
                    </span>
                  ) : null}
                </div>
                <p>{round.summary}</p>
                {round.changed_paths && round.changed_paths.length ? (
                  <p className="card-note mono">{round.changed_paths.join(", ")}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="card-note">{t("单任务审查已延后至交付级 Post-DAG 统一复核")}</p>
      )}
    </article>
  );
}

function DeliveryAcceptanceSection({ workbench, projection }: { workbench: Workbench; projection: RunProjection | null }) {
  const t = useT();
  const review = projection?.delivery_acceptance;
  const productVerification = review?.product_verification ?? null;
  const postDag = projection?.post_dag ?? null;
  const hasCriteria = Boolean(review && review.criteria.length);
  const hidden = !projection || (!hasCriteria && !productVerification && !postDag);
  return (
    <section className="delivery-acceptance" id="delivery-acceptance" aria-labelledby="delivery-title" hidden={hidden}>
      <header className="view-head">
        <div className="view-head-meta">
          <h2 className="view-title" id="delivery-title">
            {t("交付验收")}
          </h2>
          <span className="card-note" id="delivery-spec">
            {review && !hidden ? `GoalSpec v${review.spec_version}` : ""}
          </span>
        </div>
        <div className="stage-pills" id="delivery-counts" aria-label={t("验收状态汇总")}>
          {review && hasCriteria
            ? Object.entries(DELIVERY_STATUS).map(([status, [label, variant]]) => (
                <Badge variant={variant} key={status}>
                  {`${label} ${review.counts[status as keyof typeof review.counts]}`}
                </Badge>
              ))
            : null}
        </div>
      </header>
      {projection && productVerification ? (
        <ProductVerificationCard
          workbench={workbench}
          runId={projection.run_id}
          verification={productVerification}
        />
      ) : null}
      {postDag ? <PostDagCard workbench={workbench} postDag={postDag} /> : null}
      {review && hasCriteria ? (
        <ul className="delivery-criteria card" id="delivery-criteria" aria-label={t("逐条验收条件")}>
          {review.criteria.map((row, index) => {
            const [label, variant] = DELIVERY_STATUS[row.status] || DELIVERY_STATUS.unverified;
            const ref = `${row.requirement_id} · ${t("条件 {index}", { index: row.criterion_index })}`;
            return (
              <li className="delivery-criterion" key={`${ref}-${index}`}>
                <div>
                  <span className="card-note">{ref}</span>
                  <p>{row.text}</p>
                  {row.reason ? <p className="card-note">{localizeEvidenceNote(row.reason)}</p> : null}
                </div>
                <div className="delivery-result">
                  <Badge variant={row.risk_accepted ? "warn" : variant}>{label}</Badge>
                  {row.evidence ? (
                    <button
                      type="button"
                      className="btn btn-quiet"
                      data-delivery-evidence={index}
                      aria-controls="dock"
                      aria-label={t("查看证据 · {ref}", { ref })}
                      onClick={() => workbench.showDeliveryEvidence(index)}
                    >
                      {t("查看证据")}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

function Swimlanes({ workbench, state, projection }: { workbench: Workbench; state: WorkbenchState; projection: RunProjection | null }) {
  const lanes = projection?.swimlanes || [];
  return (
    <div className="lanes" id="swimlanes">
      {lanes.map((lane) => (
        <div className="lane" key={lane.actor}>
          <span className="lane-actor">{lane.actor}</span>
          <div className="lane-items">
            {(lane.items || []).map((item) => {
              const displayStatus = taskDisplayStatus(item, projection);
              const meta = statusMeta(displayStatus);
              return (
                <button
                  type="button"
                  className="lane-chip"
                  key={item.id}
                  data-task-id={item.task_id || ""}
                  data-status={displayStatus}
                  aria-pressed={item.task_id && item.task_id === state.selectedTaskId ? "true" : "false"}
                  onClick={() => item.task_id && workbench.selectTask(item.task_id)}
                >
                  {`${meta.glyph} ${item.label}`}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TopologyView({ workbench, state }: { workbench: Workbench; state: WorkbenchState }) {
  const t = useT();
  const projection =
    state.projection && (!state.runId || state.projection.run_id === state.runId)
      ? state.projection
      : null;
  const hasDag = Boolean(projection?.dag.nodes.length);
  const awaitingPlanApproval = projection?.hitl_banner?.kind === "plan_gate";
  const dagHidden =
    !hasDag || (awaitingPlanApproval && state.openedPlanGraphHash !== projection?.plan?.content_hash);
  const approvedPlan = projection?.plan_approved ? projection.plan : null;
  const lanes = projection?.swimlanes || [];
  return (
    <section
      className="view"
      data-pane="topology"
      id="view-topology"
      aria-labelledby="workflow-title"
      hidden={state.view !== "topology"}
    >
      <StageLivePanel workbench={workbench} state={state} projection={projection} />

      <section className="workflow-section" aria-labelledby="workflow-title">
        <header className="view-head">
          <div className="view-head-meta">
            <h2 className="view-title" id="workflow-title">
              {t("编排工作流")}
            </h2>
            <span className="card-note" id="workflow-badge">
              {workflowBadge(projection)}
            </span>
          </div>
          <div className="dag-legend" aria-label={t("状态图例")}>
            <span className="legend-item">{t("✓ 完成")}</span>
            <span className="legend-item">{t("▶ 运行中")}</span>
            <span className="legend-item">{t("✕ 中断/阻塞")}</span>
            <span className="legend-item">{t("◷ 待确认")}</span>
            <span className="legend-item">{t("— 已跳过")}</span>
          </div>
        </header>
        {projection ? (
          <WorkflowStages
            projection={projection}
            selectedId={state.workflowNode}
            onSelect={workbench.selectWorkflowNode}
            hasDag={hasDag}
            dagVisible={!dagHidden}
          />
        ) : (
          <div className="wf-board" id="workflow-graph" data-workflow-view="staged" />
        )}
      </section>

      <section className="task-dag-section" id="task-dag-section" aria-labelledby="topology-title" hidden={dagHidden}>
        <header className="view-head">
          <h2 className="view-title" id="topology-title" tabIndex={-1}>
            {t("任务依赖图")}
          </h2>
          <div className="dag-legend" aria-label={t("任务图例")}>
            <span className="legend-item">{t("✓ 已验收")}</span>
            <span className="legend-item">{t("▶ 运行中")}</span>
            <span className="legend-item">{t("✕ 阻塞")}</span>
            <span className="legend-item">{t("⚠ 人工接受")}</span>
            <span className="legend-item">
              <span className="legend-swatch" data-tone="critical" aria-hidden="true" /> {t("关键路径")}
            </span>
            <span className="legend-item">
              <span className="legend-swatch" data-tone="blocked" aria-hidden="true" /> {t("阻塞传递")}
            </span>
            <span className="legend-item">
              <span className="legend-swatch" data-tone="running" aria-hidden="true" /> {t("执行中")}
            </span>
            <span className="legend-item">
              <span className="legend-ring" aria-hidden="true" /> {t("当前选中")}
            </span>
          </div>
        </header>
        {projection ? (
          <DagGraphHost {...dagGraphProps(projection, state.selectedTaskId, workbench.selectTask)} />
        ) : (
          <div className="graph-host" id="dag-graph" data-graph-host="dag" />
        )}
        <details id="run-plan-detail" className="run-detail" hidden={!approvedPlan}>
          <summary>{approvedPlan ? t("查看完整任务计划 · v{version}", { version: approvedPlan.version }) : t("查看完整任务计划")}</summary>
          <pre className="code-block scroller" tabIndex={0}>
            {approvedPlan ? JSON.stringify(approvedPlan, null, 2) : ""}
          </pre>
        </details>
      </section>

      <DeliveryAcceptanceSection workbench={workbench} projection={projection} />

      <section className="lane-section" id="lane-section" aria-labelledby="lane-title" hidden={!hasDag || awaitingPlanApproval}>
        <div className="card-head">
          <h3 className="card-title" id="lane-title">
            {t("Agent 泳道（时间 →）")}
          </h3>
          <span className="card-note" id="lane-badge">
            {projection ? t("{count} 隔离通道", { count: lanes.length }) : t("隔离通道")}
          </span>
        </div>
        <Swimlanes workbench={workbench} state={state} projection={projection} />
      </section>
    </section>
  );
}
