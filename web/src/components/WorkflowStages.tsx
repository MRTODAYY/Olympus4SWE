import { Fragment, type KeyboardEvent } from "react";

import type { RunProjection } from "../api/types";
import { useT } from "../i18n";
import { buildWorkflowStages, type WorkflowStageStep } from "../lib/workflowStages";

interface WorkflowStagesProps {
  projection: RunProjection;
  selectedId: string | null;
  onSelect: (id: string) => void;
  hasDag: boolean;
  dagVisible: boolean;
}

function StepCard({
  step,
  selected,
  onSelect,
}: {
  step: WorkflowStageStep;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect(step.id);
  };

  if (step.status === "skipped") {
    return (
      <div
        className="wf-step wf-step-skipped"
        data-workflow-node={step.id}
        data-status={step.status}
        data-tone={step.tone}
        data-node-kind={step.kind}
        role="button"
        tabIndex={0}
        aria-selected={selected ? "true" : "false"}
        aria-label={step.ariaLabel}
        title={step.title}
        onClick={() => onSelect(step.id)}
        onKeyDown={onKeyDown}
      >
        <span className="wf-step-left">
          <span className="wf-step-glyph" aria-hidden="true">
            {step.glyph}
          </span>
          <span className="wf-step-title">{step.label}</span>
        </span>
        <span className="wf-step-skip-pill">{step.statusText}</span>
      </div>
    );
  }

  return (
    <div
      className="wf-step"
      data-workflow-node={step.id}
      data-status={step.status}
      data-tone={step.tone}
      data-node-kind={step.kind}
      role="button"
      tabIndex={0}
      aria-selected={selected ? "true" : "false"}
      aria-label={step.ariaLabel}
      title={step.title}
      onClick={() => onSelect(step.id)}
      onKeyDown={onKeyDown}
    >
      <div className="wf-step-head">
        <span className="wf-step-left">
          <span className="wf-step-glyph" aria-hidden="true">
            {step.glyph}
          </span>
          <span className="wf-step-title">{step.label}</span>
        </span>
        {step.kindLabel ? (
          <span className="wf-step-kind" data-kind={step.kind}>
            {step.kindLabel}
          </span>
        ) : null}
      </div>
      <div className="wf-step-foot">
        <span className="wf-step-id">{step.id}</span>
        {step.routeBadge ? (
          <span className="wf-route-pill" data-tone={step.routeBadge.tone}>
            {step.routeBadge.text}
          </span>
        ) : (
          <span className="wf-step-status-sr">{step.statusText}</span>
        )}
      </div>
    </div>
  );
}

function ExecuteHandoffCard({
  projection,
  hasDag,
  dagVisible,
}: {
  projection: RunProjection;
  hasDag: boolean;
  dagVisible: boolean;
}) {
  const t = useT();
  const totalTasks = projection.progress.total_tasks;
  const verifiedTasks = projection.progress.verified_tasks;
  const jumpToDag = () => {
    const target = document.getElementById("task-dag-section");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (hasDag && dagVisible && totalTasks > 0) {
    return (
      <div className="wf-handoff" data-handoff="active">
        <span className="wf-handoff-title">{t("任务级拓扑已展开")}</span>
        <p className="wf-handoff-copy">{t("已验收 {verified} / {total} 个任务，子任务并发波次见下方任务依赖图。", { verified: verifiedTasks, total: totalTasks })}</p>
        <button type="button" className="btn btn-quiet wf-handoff-btn" onClick={jumpToDag}>
          {t("查看任务依赖图")} ↓
        </button>
      </div>
    );
  }

  return (
    <div className="wf-handoff" data-handoff="pending">
      <span className="wf-handoff-title">{t("任务级拓扑下沉展开")}</span>
      <p className="wf-handoff-copy">{t("批准计划后，下方「任务依赖图」将展开并发波次与独立验收进度。")}</p>
    </div>
  );
}

export function WorkflowStages({
  projection,
  selectedId,
  onSelect,
  hasDag,
  dagVisible,
}: WorkflowStagesProps) {
  const t = useT();
  const { columns } = buildWorkflowStages(projection);

  if (!columns.length) {
    return (
      <div
        className="wf-board"
        id="workflow-graph"
        data-workflow-view="staged"
        data-empty="true"
        role="region"
        aria-label={t("编排工作流阶段视图")}
      >
        <p className="wf-empty-notice" role="status">
          {t("当前工作流未提供拓扑描述")}
        </p>
      </div>
    );
  }

  return (
    <div
      className="wf-board"
      id="workflow-graph"
      data-workflow-view="staged"
      data-stage-count={columns.length}
      role="region"
      aria-label={t("编排工作流阶段视图")}
    >
      <div className="wf-stages" data-cols={columns.length}>
        {columns.map((column, columnIndex) => (
          <Fragment key={column.id}>
            {columnIndex > 0 ? (
              <span className="wf-stage-arrow" aria-hidden="true">
                →
              </span>
            ) : null}
            <section
              className="wf-stage-col"
              data-stage-id={column.id}
              data-stage-state={column.state}
              aria-label={`${column.indexLabel} · ${column.title}`}
            >
              <header className="wf-stage-head">
                <div className="wf-stage-head-main">
                  <span className="wf-stage-index">{`${column.indexLabel} · `}</span>
                  <span className="wf-stage-title">{column.title}</span>
                </div>
                <div className="wf-stage-head-meta">
                  <span className="wf-stage-god">{column.god}</span>
                  <span className="wf-stage-status" data-tone={column.statusTone}>
                    {column.statusText}
                  </span>
                </div>
              </header>
              <div className="wf-stage-steps">
                {column.steps.map((step) => (
                  <Fragment key={step.id}>
                    {step.connectorBefore ? (
                      <div
                        className="wf-step-connector"
                        data-connector={step.connectorBefore}
                        aria-hidden="true"
                      >
                        <span className="wf-step-connector-line" />
                      </div>
                    ) : null}
                    <StepCard
                      step={step}
                      selected={step.id === selectedId}
                      onSelect={onSelect}
                    />
                  </Fragment>
                ))}
              </div>
              {column.id === "execute" ? (
                <ExecuteHandoffCard
                  projection={projection}
                  hasDag={hasDag}
                  dagVisible={dagVisible}
                />
              ) : null}
            </section>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
