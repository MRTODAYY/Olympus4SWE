import type { RunProjection } from "../api/types";
import type { DagGraphProps, DagPill, DagTone } from "../graph/types";
import { tr } from "../i18n/translate";
import {
  LIVE_TASK_STATUSES,
  retryMessage,
  retryNextStep,
  statusMeta,
  taskDisplayStatus,
} from "./labels";

const TOOL_MARKS: Record<string, string> = { ok: "✓", error: "✕", denied: "⊘" };

export function dagGraphProps(
  projection: RunProjection,
  selectedId: string | null,
  onSelect: (id: string) => void,
): DagGraphProps {
  const nodes = projection.dag.nodes || [];
  const edges = projection.dag.edges || [];
  const displayStatus = new Map(nodes.map((node) => [node.task_id, taskDisplayStatus(node, projection)]));
  return {
    runId: projection.run_id,
    selectedId,
    onSelect,
    ariaLabel: tr("任务依赖有向无环图"),
    emptyMessage: tr("当前运行尚未生成任务 DAG"),
    nodes: nodes.map((node) => {
      const status = displayStatus.get(node.task_id) || "waiting";
      const meta = statusMeta(status, node.accepted_risk_reason);
      const dependencyBlocked = Boolean(node.blocked_by?.length);
      const retrying = Boolean(node.provider_retry);
      const live = status === "running" ? node.live_progress : null;
      const recent = live?.recent_tools.at(-1);
      const tool = live?.current_tool?.tool || (recent && `${TOOL_MARKS[recent.status]} ${recent.tool}`);
      const activity = [live?.driver_name, tool].filter(Boolean).join(" · ");
      const context = retrying ? retryMessage() : activity || `${node.role || "engineer"} · ${node.kind || "implement"}`;
      const statusText = retrying
        ? retryNextStep()
        : dependencyBlocked
          ? tr("依赖受阻")
          : `${meta.glyph} ${meta.label}`;
      const tone: DagTone = retrying
        ? "warn"
        : dependencyBlocked
          ? "bad"
          : status === "planned"
            ? "planned"
            : meta.variant;
      const pill: DagPill | null = retrying
        ? { text: tr("重试中"), tone: "warn" }
        : node.accepted_risk_reason
          ? { text: tr("⚠ 风险"), tone: "warn" }
          : node.attempt > 1
            ? { text: `×${node.attempt}`, tone: "muted" }
            : null;
      return {
        id: node.task_id,
        layer: node.layer || 0,
        status,
        tone,
        meta: context,
        statusText,
        pill,
        title: node.title || "",
        issue: retrying ? "retry" : dependencyBlocked ? "dependency" : "",
        risk: Boolean(node.accepted_risk_reason),
        ariaLabel: tr("任务 {taskId} {detail}", {
          taskId: node.task_id,
          detail: retrying || activity ? `${context}${tr("，")}${statusText}` : statusText,
        }),
      };
    }),
    edges: edges.map((edge) => ({
      source: edge.from,
      target: edge.to,
      critical: Boolean(edge.critical),
      blocked: Boolean(edge.blocked_edge),
      running: !edge.blocked_edge && LIVE_TASK_STATUSES.has(displayStatus.get(edge.to) || ""),
    })),
  };
}
