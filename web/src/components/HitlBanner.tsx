import { useState } from "react";

import type {
  ApprovalAction,
  ApprovalReview,
  DesignSpec,
  ReviewArtifact,
  ReviewEntry,
  ReviewSection,
  RunProjection,
} from "../api/types";
import { useT } from "../i18n";
import { localizedTable } from "../i18n/localized";
import { APPROVAL_BUTTONS, APPROVAL_LABELS, localizeError, taskBlocker, type Variant } from "../lib/labels";
import type { ApprovalOrigin, Workbench, WorkbenchState } from "../state/workbench";
import { DesignStructure, DesignTradeoff } from "./spec";
import { Badge } from "./ui";

const CHANGE_LABELS: Record<string, [string, Variant]> = localizedTable({
  changed: ["变更", "warn"],
  added: ["新增", "ok"],
  removed: ["移除", "warn"],
  affected: ["需复核", "warn"],
});

const ACTIONS = Object.keys(APPROVAL_LABELS) as ApprovalAction[];

function EntryContent({ entry }: { entry: Pick<ReviewEntry, "text" | "cost"> }) {
  if (entry.cost == null) return <span>{entry.text}</span>;
  return (
    <>
      <br />
      <DesignTradeoff choice={entry.text} cost={entry.cost} />
    </>
  );
}

function OriginButton({
  pointer,
  baseline,
  entryName,
  onLocate,
}: {
  pointer: string;
  baseline: boolean;
  entryName: string;
  onLocate: (ref: string, baseline: boolean) => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      className="approval-ref"
      data-review-ref={pointer}
      data-review-old-ref={baseline ? "" : undefined}
      aria-label={
        baseline
          ? t("定位上次批准的 {name}", { name: entryName })
          : t("定位 {name}", { name: entryName })
      }
      onClick={() => onLocate(pointer, baseline)}
    >
      {baseline ? t("上次原条目") : t("原条目")}
    </button>
  );
}

function ApprovalSections({
  sections,
  onLocate,
}: {
  sections: ReviewSection[];
  onLocate: (ref: string, baseline: boolean) => void;
}) {
  const t = useT();
  return (
    <>
      {sections.map(({ title, entries, empty_text }, sectionIndex) => (
        <section className="approval-section" key={`${title}-${sectionIndex}`}>
          <h4>{title}</h4>
          <ul className="spec-list">
            {entries.length ? (
              entries.map((entry, index) => {
                const { label, ref, change, previous, related } = entry;
                const entryName = label || (entries.length > 1 ? `${title} ${index + 1}` : title);
                const status = change ? CHANGE_LABELS[change] : null;
                return (
                  <li key={`${ref}-${index}`}>
                    {status ? <Badge variant={status[1]}>{status[0]}</Badge> : null}{" "}
                    {label ? (
                      <>
                        <strong>{label}</strong>{" "}
                      </>
                    ) : null}
                    {previous ? (
                      <>
                        <div>
                          <small>{t("上次批准")}</small>{" "}
                          {previous.label && previous.label !== label ? (
                            <>
                              <strong>{previous.label}</strong>{" "}
                            </>
                          ) : null}
                          <EntryContent entry={previous} />{" "}
                          <OriginButton pointer={previous.ref} baseline entryName={entryName} onLocate={onLocate} />
                        </div>
                        <small>{t("本次候选")}</small>{" "}
                      </>
                    ) : null}
                    <EntryContent entry={entry} />{" "}
                    {entry.provenance === "agent_high_impact" ? (
                      <Badge variant="warn">{t("Agent 补充 · 高影响")}</Badge>
                    ) : entry.provenance === "unknown" ? (
                      <Badge variant="muted">{t("来源未记录")}</Badge>
                    ) : null}{" "}
                    {related ? null : (
                      <OriginButton
                        pointer={ref}
                        baseline={change === "removed"}
                        entryName={entryName}
                        onLocate={onLocate}
                      />
                    )}
                  </li>
                );
              })
            ) : (
              <li>{empty_text}</li>
            )}
          </ul>
        </section>
      ))}
    </>
  );
}

function OriginPanel({ origin }: { origin: ApprovalOrigin | undefined }) {
  const t = useT();
  return (
    <div className="approval-origin" hidden={!origin}>
      {origin ? (
        <>
          <code tabIndex={-1}>{origin.ref}</code>
          <p>{origin.text}</p>
          {origin.source ? <p>{t("规格引用 · {source}", { source: origin.source })}</p> : null}
        </>
      ) : null}
    </div>
  );
}

export function ApprovalReviewCard({
  workbench,
  action,
  review,
  artifact,
  origin,
  projection,
  onLocate: onLocateOverride,
  onOpenTaskGraph: onOpenTaskGraphOverride,
  onApprove: onApproveOverride,
  onRequestRevision: onRequestRevisionOverride,
  disabled = false,
}: {
  workbench?: Workbench;
  action: ApprovalAction;
  review: ApprovalReview;
  artifact: ReviewArtifact;
  origin: ApprovalOrigin | undefined;
  projection?: RunProjection | null;
  onLocate?: (ref: string, baseline: boolean) => void;
  onOpenTaskGraph?: (targetHash: string) => void;
  onApprove?: (action: ApprovalAction) => void;
  onRequestRevision?: (action: ApprovalAction, feedback: string) => Promise<void> | void;
  disabled?: boolean;
}) {
  const t = useT();
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const title = APPROVAL_LABELS[action];
  const visible = (sections: ReviewSection[]) =>
    sections.filter((section) => section.entries.length || section.empty_text);
  const sections = visible(review.sections);
  const unchanged = visible(review.unchanged_sections || []);
  const baseline = review.baseline;
  const button = APPROVAL_BUTTONS[action];
  const onLocate = (ref: string, old: boolean) => {
    if (onLocateOverride) onLocateOverride(ref, old);
    else workbench?.showApprovalOrigin(action, ref, old);
  };
  const onOpenTaskGraph = () => {
    if (onOpenTaskGraphOverride) onOpenTaskGraphOverride(review.target_hash);
    else workbench?.openTaskGraph(review.target_hash);
  };
  const onApprove = () => {
    if (onApproveOverride) onApproveOverride(action);
    else void workbench?.approve(action);
  };
  const awaitingResynthesis = action === "approve_spec" && Boolean(projection?.pending_resynthesis);
  const approveDisabled = disabled || awaitingResynthesis;
  const submitRevision = () => {
    const feedback = revisionFeedback.trim();
    if (!feedback) return;
    setRevisionOpen(false);
    setRevisionFeedback("");
    if (onRequestRevisionOverride) void onRequestRevisionOverride(action, feedback);
    else void workbench?.requestRevision(feedback);
  };
  return (
    <article className="approval-review" data-review-action={action} aria-labelledby={`review-${action}`}>
      <h3 id={`review-${action}`} tabIndex={-1}>
        {`${title}${artifact.version ? ` · v${artifact.version}` : ""}`}
      </h3>
      {review.comparison_gap ? <p>{review.comparison_gap}</p> : null}
      {sections.length ? (
        <div className="approval-sections">
          <ApprovalSections sections={sections} onLocate={onLocate} />
        </div>
      ) : baseline ? (
        <p>{t("已核对的关键承诺一致。")}</p>
      ) : null}
      {unchanged.length ? (
        <details data-review-disclosure="unchanged">
          <summary>{t("查看已确认未变的条目")}</summary>
          <div className="approval-sections">
            <ApprovalSections sections={unchanged} onLocate={onLocate} />
          </div>
        </details>
      ) : null}
      <div className="approval-controls">
        {review.artifact === "design" ? (
          <details data-review-disclosure="structure">
            <summary>{t("查看模块、数据模型与接口")}</summary>
            <DesignStructure design={artifact as DesignSpec} />
          </details>
        ) : null}
        {action === "approve_plan" ? (
          <button
            type="button"
            className="btn"
            data-review-plan-graph=""
            onClick={onOpenTaskGraph}
          >
            {t("查看任务依赖图")}
          </button>
        ) : null}
        <details data-review-disclosure="candidate">
          <summary>{t("查看完整 {title}", { title })}</summary>
          <OriginPanel origin={origin?.version === "candidate" ? origin : undefined} />
          <pre tabIndex={0}>{JSON.stringify(artifact, null, 2)}</pre>
        </details>
        {baseline ? (
          <details data-review-disclosure="baseline" data-review-baseline="">
            <summary>{t("查看上次批准的 {title}", { title })}</summary>
            <OriginPanel origin={origin?.version === "baseline" ? origin : undefined} />
            <pre tabIndex={0}>{JSON.stringify(baseline, null, 2)}</pre>
          </details>
        ) : null}
        <button
          type="button"
          className="btn"
          data-revise-toggle={action}
          disabled={disabled}
          onClick={() => setRevisionOpen((open) => !open)}
        >
          {t("要求修订")}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          id={button.id}
          data-approve={action}
          disabled={approveDisabled}
          onClick={onApprove}
        >
          {awaitingResynthesis ? t("等待需求融合完成…") : button.label}
        </button>
        {revisionOpen ? (
          <div className="approval-revise" data-revise-panel={action}>
            <textarea
              className="field"
              id={`revision-feedback-${action}`}
              rows={3}
              value={revisionFeedback}
              placeholder={t("描述需要修订的需求、边界或验收标准…")}
              onChange={(event) => setRevisionFeedback(event.target.value)}
            />
            <button
              type="button"
              className="btn"
              data-revise-submit={action}
              disabled={disabled || !revisionFeedback.trim()}
              onClick={submitRevision}
            >
              {t("提交修订意见")}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

const TONE_GLYPHS: Record<string, string> = { ok: "✓", warn: "⚠", info: "◷" };

export function HitlBanner({ workbench, state }: { workbench: Workbench; state: WorkbenchState }) {
  const t = useT();
  const projection = state.projection;
  if (!projection) {
    return (
      <section className="hitl-banner" id="hitl-banner" data-tone="danger" aria-live="polite" hidden>
        <div className="hitl-copy">
          <p className="hitl-headline" id="hitl-headline">
            {t("正在加载编排状态…")}
          </p>
          <p className="hitl-detail" id="hitl-detail" />
        </div>
      </section>
    );
  }
  const reviews = state.approvalSnapshot?.runId === projection.run_id ? state.approvalSnapshot.reviews : new Map();
  const blocker = taskBlocker(projection, state.selectedTaskId);
  const gateBanner = projection.hitl_banner;
  const banner = blocker || gateBanner;
  const promoteGate = gateBanner?.kind === "blueprint_completed";
  const runFailed = gateBanner?.kind === "run_failed";
  const canRetry = Boolean(gateBanner && Array.isArray(gateBanner.actions) && gateBanner.actions.includes("retry_workflow"));
  const hasGate = reviews.size > 0 || promoteGate || runFailed || canRetry;
  const hidden = !banner && !hasGate;
  const tone = banner ? ("tone" in banner && banner.tone) || "danger" : "warn";
  const glyph = TONE_GLYPHS[tone] || "✕";
  const headline = banner?.headline || t("候选版本待批准");
  const detailAlreadyShown =
    (reviews.has("approve_spec") && banner?.detail === projection.spec?.goal) ||
    (reviews.has("approve_design") && banner?.detail === projection.design?.architecture_summary);
  let detail = detailAlreadyShown ? "" : banner?.detail;
  if (blocker) {
    detail = t("受影响任务：{tasks}。原因：{reason}", {
      tasks: (blocker.affected_task_ids || []).join(t("、")),
      reason: blocker.detail,
    });
  }
  const cleanDetail = String(detail || "")
    .replace(/\s*\n+\s*/g, t("，"))
    .trim();
  const localized = blocker ? cleanDetail : localizeError(cleanDetail);

  return (
    <section
      className="hitl-banner"
      id="hitl-banner"
      data-tone={tone}
      data-kind={banner && "kind" in banner ? banner.kind : undefined}
      aria-live="polite"
      hidden={hidden}
    >
      <div className="hitl-copy">
        <p className="hitl-headline" id="hitl-headline">
          <span aria-hidden="true">{glyph}</span>
          <span>{headline}</span>
        </p>
        <p className="hitl-detail" id="hitl-detail" hidden={!localized}>
          {localized}
        </p>
      </div>
      <div className="hitl-actions" id="hitl-task-actions" hidden={!blocker}>
        <button type="button" className="btn btn-primary" id="btn-banner-hint" onClick={() => workbench.hintBannerTask()}>
          {t("注入提示")}
        </button>
        <button type="button" className="btn" id="btn-banner-inspect" onClick={() => workbench.inspectBannerTask()}>
          {t("查看定位")}
        </button>
        <button
          type="button"
          className="btn"
          id="btn-banner-retry"
          onClick={() => void workbench.retryBannerTask()}
        >
          {t("重试任务")}
        </button>
        <button type="button" className="btn" id="btn-banner-reassign" onClick={() => workbench.reassignBannerTask()}>
          {t("改派给人")}
        </button>
        <button
          type="button"
          className="btn btn-danger hitl-risk-sep"
          id="btn-banner-accept-risk"
          onClick={() => workbench.acceptBannerTaskRisk()}
        >
          {t("接受风险")}
        </button>
      </div>
      <div className="hitl-actions" id="hitl-gate-actions" hidden={!(promoteGate || runFailed || canRetry)}>
        <button
          type="button"
          className="btn btn-primary"
          id="btn-promote-execute"
          hidden={!promoteGate}
          onClick={() => void workbench.promoteToExecute()}
        >
          {t("转入沙盒执行 (full_sdlc_tdd)")}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          id="btn-retry-workflow"
          hidden={!canRetry}
          onClick={() => void workbench.retryWorkflow()}
        >
          {t("从断点重试")}
        </button>
        <button
          type="button"
          className="btn"
          id="btn-inspect-failure"
          hidden={!runFailed}
          onClick={() => workbench.inspectFailure()}
        >
          {t("查看节点日志")}
        </button>
      </div>
      <section
        id="hitl-approval-reviews"
        className="approval-reviews"
        aria-label={t("审批候选版本")}
        hidden={!reviews.size}
      >
        {ACTIONS.map((action) => {
          const binding = reviews.get(action);
          const review = projection.approval_reviews?.[action];
          if (!binding || !review) return null;
          return (
            <ApprovalReviewCard
              key={action}
              workbench={workbench}
              action={action}
              review={review}
              artifact={binding.artifact}
              origin={state.approvalOrigins[action]}
              projection={projection}
            />
          );
        })}
      </section>
    </section>
  );
}
