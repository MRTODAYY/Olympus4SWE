import { useEffect, useState, type ReactNode } from "react";

import type { DagNode, DeliveryAcceptance, DeliveryCriterion, RunProjection } from "../api/types";
import { deliveryLogUrl, fetchProductArtifactText, productArtifactUrl } from "../api/client";
import { useT } from "../i18n";
import { localized } from "../i18n/localized";
import { tr } from "../i18n/translate";
import {
  DELIVERY_STATUS,
  localizeError,
  NODE_LABELS,
  POST_DAG_OUTCOME,
  POST_DAG_PHASE,
  POST_DAG_STATUS,
  retryMessage,
  retryNextStep,
  statusMeta,
  taskDisplayStatus,
  type Tab,
} from "../lib/labels";
import type { Workbench, WorkbenchState } from "../state/workbench";
import { RecordedArtifactCards } from "./Artifacts";
import { Badge, Card, KeyValues, Notice, ReceiptBlock, Row, SubPane, ToolRow } from "./ui";

interface DockContent {
  title: string;
  stages: ReactNode;
  subpane?: ReactNode;
  tools?: ReactNode;
  tabs?: ReactNode;
  body: ReactNode;
  receipt?: ReactNode;
}

const TAB_LABELS: Record<Tab, string> = localized({
  overview: "概览",
  artifacts: "产物与审查",
  events: "事件日志",
});

function Tabs({ workbench, active }: { workbench: Workbench; active: Tab }) {
  const t = useT();
  return (
    <div className="tabs" role="tablist" aria-label={t("任务详情视图切换")}>
      {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
        <button
          type="button"
          role="tab"
          className="tab"
          key={tab}
          data-tab={tab}
          aria-selected={active === tab ? "true" : "false"}
          onClick={() => workbench.setTab(tab)}
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </div>
  );
}

function EventRows({ events }: { events: RunProjection["events"] }) {
  return (
    <>
      {events.map((event) => (
        <div className="event-row" key={event.event_seq}>
          <span>{`#${event.event_seq}`}</span>
          <span className="event-type">{event.event_type}</span>
          <span className="event-payload">{`${event.actor} · r${event.state_revision}`}</span>
        </div>
      ))}
    </>
  );
}

const TOOL_STATUS_LABELS: Record<string, string> = localized({
  ok: "成功",
  error: "出错",
  denied: "已拦截",
});

function activityPreview(state: WorkbenchState, task: DagNode): string {
  if (state.projection?.status !== "running" || task.status !== "running") return "";
  const previews = state.activity;
  if (!previews) return task.live_progress?.preview || "";
  const entry = previews[task.task_id];
  return entry?.attempt === task.attempt ? entry.preview : "";
}

function LiveProgressCard({ state, task }: { state: WorkbenchState; task: DagNode }) {
  const t = useT();
  const progress = task.live_progress;
  if (!progress?.driver_name && !progress?.last_event_at) return null;
  const current = progress.current_tool;
  const preview = activityPreview(state, task);
  return (
    <Card title={task.status === "running" ? t("实时执行") : t("最近执行")}>
      <KeyValues>
        {progress.driver_name ? (
          <Row label={t("驱动")} mono>
            {progress.driver_name}
          </Row>
        ) : null}
        {current ? (
          <Row label={t("当前工具")} mono>
            {`${current.tool} · ${current.target_hint}`}
          </Row>
        ) : null}
        {progress.recent_tools
          .slice()
          .reverse()
          .map((entry, index) => (
            <Row label={entry.tool} mono key={`${entry.step}-${index}`}>
              {`${TOOL_STATUS_LABELS[entry.status]} · ${entry.duration_ms} ms`}
            </Row>
          ))}
      </KeyValues>
      <p className="card-note" data-live-preview="" hidden={!preview}>
        {preview}
      </p>
    </Card>
  );
}

const RETRY_LABELS: Record<string, string> = localized({
  started: "调用超时，正在自动重试",
  recovered: "重试成功，调用已恢复",
  failed: "本次自动重试失败",
});

function TaskBody({ workbench, state, projection, task }: { workbench: Workbench; state: WorkbenchState; projection: RunProjection; task: DagNode }) {
  const t = useT();
  if (state.activeTab === "artifacts") {
    return <RecordedArtifactCards artifacts={task.artifacts || {}} manifest={task.manifest_md} />;
  }
  if (state.activeTab === "events") {
    const retries = (task.provider_retry_history || []).slice().reverse();
    const events = (projection.events || []).slice().reverse();
    return (
      <>
        {retries.length ? (
          <Card title={t("调用重试记录")}>
            <KeyValues>
              {retries.map((event) => (
                <Row label={`#${event.event_seq} · ${event.actor}`} key={event.event_seq}>
                  {RETRY_LABELS[event.phase]}
                </Row>
              ))}
            </KeyValues>
          </Card>
        ) : null}
        <div className="event-log scroller">
          {events.length ? <EventRows events={events} /> : <Notice level="info">{t("暂无事件")}</Notice>}
        </div>
      </>
    );
  }
  const checks = (task.acceptance_checks || [])
    .map((check) => `${check.passed ? "✓" : "✕"} ${check.id} · ${check.description}`)
    .join("\n");
  return (
    <>
      {task.provider_retry ? (
        <Notice level="warn">
          {tr("{message}。下一步：{nextStep}。", {
            message: retryMessage(),
            nextStep: retryNextStep(),
          })}
        </Notice>
      ) : null}
      {task.blocker ? (
        <Notice level="bad">
          {t("受影响任务：{tasks}。原因：{reason}", {
            tasks: task.blocker.affected_task_ids.join(t("、")),
            reason: task.blocker.detail,
          })}
        </Notice>
      ) : null}
      {(task.blocked_by || []).map((taskId) => {
        const blocker = projection.dag.nodes.find((node) => node.task_id === taskId)?.blocker;
        if (!blocker) return null;
        return (
          <Notice
            level="bad"
            key={taskId}
            action={
              <button
                type="button"
                className="btn"
                data-blocker-task-id={taskId}
                onClick={() => workbench.showBlockerTask(taskId)}
              >
                {t("查看 {taskId} 的处理操作", { taskId })}
              </button>
            }
          >
            {t("依赖任务 {taskId} 受阻：{detail}", { taskId, detail: blocker.detail })}
          </Notice>
        );
      })}
      <LiveProgressCard state={state} task={task} />
      <Card title={t("执行概览")}>
        <KeyValues>
          <Row label={t("任务目标")}>{task.objective}</Row>
          <Row label={t("执行者")} mono>
            {task.executor}
          </Row>
          <Row label={t("角色 / 类型")} mono>
            {`${task.role || "engineer"} / ${task.kind || "implement"}`}
          </Row>
          <Row label={t("交付物")}>{(task.deliverables || []).join(", ") || t("（未声明）")}</Row>
          <Row label={t("前置任务")} mono>
            {(task.depends_on || []).join(", ") || t("（无）")}
          </Row>
          <Row label={t("写入范围")} mono>
            {(task.write_scope || []).join(", ") || t("（只读）")}
          </Row>
          <Row label={t("诊断")} mono>
            {`${task.diagnostic_tool} → ${t(task.diagnostic_output)}`}
          </Row>
          <Row label={t("归因")}>{t(task.diagnostic_attribution)}</Row>
        </KeyValues>
      </Card>
      {task.accepted_risk_reason ? (
        <Notice level="warn">
          {t("未验证 · 人工接受：{reason}", { reason: task.accepted_risk_reason })}
        </Notice>
      ) : null}
      {task.review_deferred ? (
        <Notice level="info">
          {t("单任务命令门禁已通过，独立审查已延后至 Post-DAG 全局交付复核。")}
        </Notice>
      ) : null}
      {task.escape_hatch_findings && task.escape_hatch_findings.length ? (
        <Card
          title={t("0-Token 逃生舱预检拦截（累计 {count} 次）", {
            count: task.escape_hatch_rejections || task.escape_hatch_findings.length,
          })}
        >
          <pre className="code-block scroller">{task.escape_hatch_findings.join("\n")}</pre>
        </Card>
      ) : null}
      <Card title={t("验收检查")}>
        <pre className="code-block scroller">{checks || t("（暂无验收检查）")}</pre>
      </Card>
    </>
  );
}

function taskDock(workbench: Workbench, state: WorkbenchState, projection: RunProjection, task: DagNode): DockContent {
  const meta = statusMeta(taskDisplayStatus(task, projection), task.accepted_risk_reason);
  const live = task.status === "running" || task.status === "verifying";
  const stream = task.subagent_stream || [];
  return {
    title: `${task.task_id} · ${task.title}`,
    stages: (
      <>
        <Badge variant={meta.variant}>{`${meta.glyph} ${meta.label}`}</Badge>
        <Badge>{tr("尝试 {attempt} / {max}", { attempt: task.attempt, max: task.max_cycles })}</Badge>
        <Badge>{tr("审查 {round} 轮", { round: task.review_cycle })}</Badge>
        {task.review_deferred ? <Badge variant="live">{tr("延后至 Post-DAG")}</Badge> : null}
        {task.escape_hatch_rejections ? (
          <Badge variant="warn">{tr("逃生舱拦截 ×{count}", { count: task.escape_hatch_rejections })}</Badge>
        ) : null}
        <Badge>{task.executor}</Badge>
        <Badge>{tr("角色 {role}", { role: task.role || "engineer" })}</Badge>
        <Badge>{tr("类型 {kind}", { kind: task.kind || "implement" })}</Badge>
      </>
    ),
    subpane: (
      <SubPane
        title={tr("{taskId} · 沙盒终端", { taskId: task.task_id })}
        tools={stream}
        tailLines={task.terminal_lines}
        live={live}
      />
    ),
    tools: stream.length ? (
      stream.map((entry, index) => <ToolRow tool={entry} key={index} />)
    ) : (
      <Notice level="info">{tr("该任务尚未执行工具调用")}</Notice>
    ),
    tabs: <Tabs workbench={workbench} active={state.activeTab} />,
    body: <TaskBody workbench={workbench} state={state} projection={projection} task={task} />,
    receipt: <ReceiptBlock receipt={task.receipt} />,
  };
}

function workflowDock(projection: RunProjection, name: string): DockContent {
  const workflow = projection.workflow;
  const graph = workflow.graph || { nodes: [], edges: [] };
  const node = (graph.nodes || []).find((item) => item.name === name);
  const status = (workflow.node_statuses || {})[name] || "pending";
  const meta = statusMeta(status);
  const outgoing = (graph.edges || []).filter((edge) => edge.source === name);
  const incoming = (graph.edges || []).filter((edge) => edge.target === name);
  const events = (projection.events || [])
    .filter(
      (event) =>
        (event.payload && event.payload.node === name) ||
        event.stage === name ||
        (name === "intake" && event.event_type === "intake.triaged") ||
        (name === workflow.failed_node && event.event_type === "graph.failed"),
    )
    .slice(-16)
    .reverse();
  return {
    title: `${NODE_LABELS[name] || name} · ${name}`,
    stages: (
      <>
        <Badge variant={meta.variant}>{`${meta.glyph} ${meta.label}`}</Badge>
        <Badge>{tr("类型 {kind}", { kind: node?.kind || "node" })}</Badge>
        {node?.routed ? <Badge variant="warn">{tr("路由分叉")}</Badge> : <Badge>{tr("直连节点")}</Badge>}
        <Badge>{tr("最大访问 {count}", { count: node?.max_visits || 1 })}</Badge>
        {node?.on_error ? <Badge variant="bad">{tr("失败 → {target}", { target: node.on_error })}</Badge> : null}
      </>
    ),
    body: (
      <>
        {workflow.failed_node === name && workflow.last_error ? (
          <Notice level="bad">{localizeError(workflow.last_error)}</Notice>
        ) : null}
        <Card title={tr("节点定义")}>
          <KeyValues>
            <Row label={tr("节点状态")} mono>
              {status}
            </Row>
            <Row label={tr("入边")} mono>
              {incoming.map((edge) => edge.source).join(", ") || tr("（起始节点）")}
            </Row>
            <Row label={tr("出边")} mono>
              {outgoing.map((edge) => `${edge.target}${edge.conditional ? tr("（条件）") : ""}`).join(", ") || tr("（终点）")}
            </Row>
          </KeyValues>
        </Card>
        <Card title={tr("节点事件")}>
          <div className="event-log scroller">
            {events.length ? <EventRows events={events} /> : <p className="view-note">{tr("该节点暂无事件")}</p>}
          </div>
        </Card>
      </>
    ),
  };
}

function deliveryDock(projection: RunProjection, review: DeliveryAcceptance, row: DeliveryCriterion): DockContent {
  const evidence = row.evidence!;
  const logUrl = deliveryLogUrl(projection.run_id, evidence.event_seq, evidence.check_position);
  const [label, variant] = DELIVERY_STATUS[row.status] || DELIVERY_STATUS.unverified;
  return {
    title: tr("{id} · 条件 {index}", { id: row.requirement_id, index: row.criterion_index }),
    stages: <Badge variant={variant}>{label}</Badge>,
    body: (
      <>
        <Card title={tr("证据引用")}>
          <KeyValues>
            <Row label={tr("验收条件")}>{row.text}</Row>
            <Row label={`GoalSpec v${review.spec_version}`} mono>
              {review.spec_hash}
            </Row>
            <Row label={tr("交付版本")} mono>
              {evidence.delivery_version}
            </Row>
            <Row label={tr("执行记录")}>{tr("#{seq} · 退出码 {code}", { seq: evidence.event_seq, code: evidence.exit_code })}</Row>
          </KeyValues>
        </Card>
        <Card title={tr("执行日志")}>
          <pre className="code-block scroller">{evidence.log}</pre>{" "}
          <a className="btn btn-quiet" href={logUrl} target="_blank" rel="noopener">
            {tr("打开完整日志")}
          </a>
        </Card>
      </>
    ),
  };
}

function ProductArtifactPreview({
  runId,
  kind,
  title,
  linkLabel,
  cacheKey,
  version,
}: {
  runId: string;
  kind: "boot_log" | "report";
  title: string;
  linkLabel: string;
  cacheKey: string;
  version?: number;
}) {
  const t = useT();
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setContent(null);
    setError(null);
    fetchProductArtifactText(runId, kind, version)
      .then((text) => {
        if (!active) return;
        setContent(text.length > 16000 ? `${text.slice(0, 16000)}\n…` : text);
      })
      .catch((err) => {
        if (!active) return;
        setError((err as Error).message || t("读取产物失败"));
      });
    return () => {
      active = false;
    };
  }, [runId, kind, cacheKey, version]);
  const url = productArtifactUrl(runId, kind, version);
  return (
    <Card title={title}>
      {error ? (
        <Notice level="bad">{error}</Notice>
      ) : content === null ? (
        <p className="card-note">{t("正在读取产物…")}</p>
      ) : (
        <pre className="code-block scroller">{content || t("（空文件）")}</pre>
      )}
      <a className="btn btn-quiet" href={url} target="_blank" rel="noopener">
        {linkLabel}
      </a>
    </Card>
  );
}

function ProductScreenshotCard({ shotUrl }: { shotUrl: string }) {
  const t = useT();
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    setUnavailable(false);
  }, [shotUrl]);
  return (
    <Card title={t("实机首页截图 (home.png)")}>
      {unavailable ? (
        <Notice level="info">{t("当前轮次截图已被新一轮验证更新，等待最新验收结果同步。")}</Notice>
      ) : (
        <a
          className="product-dock-shot"
          href={shotUrl}
          target="_blank"
          rel="noopener"
          title={t("在新标签页打开原图")}
        >
          <img
            key={shotUrl}
            src={shotUrl}
            alt={t("实机首页截图")}
            onError={() => setUnavailable(true)}
          />
        </a>
      )}
    </Card>
  );
}

function productDock(projection: RunProjection): DockContent {
  const verification = projection.delivery_acceptance?.product_verification ?? null;
  const postDag = projection.post_dag ?? null;
  const [postDagLabel, postDagVariant] = postDag
    ? POST_DAG_STATUS[postDag.status] || POST_DAG_STATUS.idle
    : POST_DAG_STATUS.idle;
  const screenshotSuppressed = Boolean(
    verification?.checks?.some(
      (check) => check.name === "screenshot" && check.status !== "passed",
    ),
  );
  const shotUrl =
    verification?.has_screenshot && !screenshotSuppressed
      ? productArtifactUrl(
          projection.run_id,
          "screenshot",
          verification.event_seq,
          verification.screenshot_sha256,
        )
      : null;
  const cacheKey = `${projection.state_revision}:${verification?.event_seq ?? 0}`;
  const verdict = postDag?.latest_argus_verdict ?? null;
  return {
    title: tr("实机交付验收 · Product E2E"),
    stages: (
      <>
        {verification ? (
          <Badge variant={verification.passed ? "ok" : "bad"}>
            {verification.passed ? tr("✓ 实机通过") : tr("✕ 实机未通过")}
          </Badge>
        ) : null}
        {postDag ? <Badge variant={postDagVariant}>{postDagLabel}</Badge> : null}
        {postDag ? <Badge>{tr("{count} 轮记录", { count: postDag.total_rounds })}</Badge> : null}
      </>
    ),
    body: (
      <>
        {verification ? (
          <>
            <Card title={tr("实机验证摘要")}>
              <KeyValues>
                <Row label={tr("结论")}>
                  {verification.summary || (verification.passed ? tr("通过") : tr("未通过"))}
                </Row>
                <Row label={tr("记录事件")} mono>
                  {`#${verification.event_seq}`}
                </Row>
                <Row label={tr("检查数")} mono>
                  {String((verification.checks || []).length)}
                </Row>
              </KeyValues>
              {verification.failures && verification.failures.length ? (
                <pre className="code-block scroller">{verification.failures.join("\n")}</pre>
              ) : null}
            </Card>
            {shotUrl ? <ProductScreenshotCard shotUrl={shotUrl} /> : null}
            {verification.has_boot_log ? (
              <ProductArtifactPreview
                runId={projection.run_id}
                kind="boot_log"
                title={tr("启动日志 (boot.log)")}
                linkLabel={tr("打开完整启动日志")}
                cacheKey={cacheKey}
                version={verification.event_seq}
              />
            ) : null}
            {verification.has_report ? (
              <ProductArtifactPreview
                runId={projection.run_id}
                kind="report"
                title={tr("验证报告 (report.json)")}
                linkLabel={tr("打开完整验证报告")}
                cacheKey={cacheKey}
                version={verification.event_seq}
              />
            ) : null}
          </>
        ) : null}
        {verdict ? (
          <Card title={tr("Argus 全局交付复核")}>
            <KeyValues>
              <Row label={tr("结论")}>
                <Badge variant={verdict.passed ? "ok" : "bad"}>
                  {verdict.passed ? tr("✓ 通过") : tr("✕ 未通过")}
                </Badge>
              </Row>
              <Row label={tr("摘要")}>{verdict.summary || tr("（无摘要）")}</Row>
            </KeyValues>
            {verdict.findings && verdict.findings.length ? (
              <pre className="code-block scroller">
                {verdict.findings
                  .map(
                    (f) =>
                      `[${f.severity}] ${f.file_path || ""}${f.line ? `:${f.line}` : ""}: ${f.message}${f.repro_command ? `\n  repro: ${f.repro_command}` : ""}`,
                  )
                  .join("\n\n")}
              </pre>
            ) : null}
          </Card>
        ) : null}
        {postDag && postDag.rounds && postDag.rounds.length ? (
          <Card title={tr("Post-DAG 轮次历史")}>
            <KeyValues>
              {postDag.rounds.map((round) => {
                const [label, variant] =
                  POST_DAG_OUTCOME[round.outcome] || POST_DAG_OUTCOME.completed;
                return (
                  <Row
                    label={`#${round.sequence} · ${POST_DAG_PHASE[round.phase] || round.phase}`}
                    key={`${round.sequence}-${round.event_seq}`}
                  >
                    <Badge variant={variant}>{label}</Badge> <span>{round.summary}</span>
                  </Row>
                );
              })}
            </KeyValues>
          </Card>
        ) : null}
      </>
    ),
  };
}

function dockContent(workbench: Workbench, state: WorkbenchState): DockContent {
  const projection = state.projection;
  if (!projection) {
    return {
      title: tr("节点执行详情"),
      stages: null,
      tabs: <Tabs workbench={workbench} active={state.activeTab} />,
      body: null,
    };
  }
  if (
    state.productInspectionRunId === projection.run_id &&
    (projection.delivery_acceptance?.product_verification || projection.post_dag)
  ) {
    return productDock(projection);
  }
  const review = projection.delivery_acceptance;
  const selection = state.deliveryEvidence;
  const row = selection && review ? review.criteria[selection.index] : undefined;
  if (selection && review && row?.evidence) return deliveryDock(projection, review, row);
  if (state.workflowNode) return workflowDock(projection, state.workflowNode);
  const task = workbench.currentTask();
  if (task) return taskDock(workbench, state, projection, task);
  const workflow = projection.workflow;
  const focusNode = workflow.failed_node || workflow.current_node || workflow.graph?.nodes?.[0]?.name;
  if (focusNode) return workflowDock(projection, focusNode);
  return {
    title: tr("节点执行详情"),
    stages: null,
    body: <p className="view-note">{tr("点击工作流或任务节点以查看事件与产物")}</p>,
  };
}

export function InspectorDock({ workbench, state }: { workbench: Workbench; state: WorkbenchState }) {
  const t = useT();
  const content = dockContent(workbench, state);
  return (
    <aside id="dock" className="scroller" aria-label={t("任务检查器")}>
      <header className="dock-head">
        <div>
          <span className="dock-kicker">{t("检查器")}</span>
          <h2 className="dock-title" id="dock-title" tabIndex={-1}>
            {content.title}
          </h2>
        </div>
        <button type="button" className="btn btn-quiet" id="btn-dock-close" aria-label={t("收起检查器")} onClick={() => workbench.closeDock()}>
          ⇥
        </button>
      </header>
      <div className="dock-stages" id="dock-stages">
        {content.stages}
      </div>
      <div id="dock-subpane">{content.subpane}</div>
      <div className="tool-list" id="dock-tools">
        {content.tools}
      </div>
      <div id="dock-tabs">{content.tabs}</div>
      <div className="dock-body" id="dock-body">
        {content.body}
      </div>
      <div id="dock-receipt">{content.receipt}</div>
    </aside>
  );
}
