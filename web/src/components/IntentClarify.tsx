import { useRef, useState } from "react";

import type { AmbiguityItem, RunProjection } from "../api/types";
import { useT } from "../i18n";
import { clarifyPanelVisibility, localizeTriageReason, MATURITY_LABELS } from "../lib/labels";
import type { Workbench, WorkbenchState } from "../state/workbench";
import { Badge } from "./ui";

export function IntentCard({ state }: { state: WorkbenchState }) {
  const t = useT();
  const projection = state.projection;
  const triage = projection?.triage;
  const raw = String(projection?.raw_input || "").trim();
  const hidden = !projection || state.view !== "topology" || (!triage && !raw);
  const maturity = triage?.maturity || "raw_intent";
  const variant = !triage
    ? "muted"
    : maturity === "design_spec_ready"
      ? "ok"
      : maturity === "goal_spec_ready"
        ? "live"
        : "warn";
  const reasons = triage?.reasons || [];
  return (
    <section className="intent-card" id="intent-card" hidden={hidden} aria-label={t("需求输入与分级")}>
      <div className="intent-head">
        <span className="intent-label">{t("需求输入")}</span>
        <Badge variant={variant} id="triage-maturity">
          {triage
            ? MATURITY_LABELS[maturity] || maturity
            : projection
              ? t("输入上下文")
              : "raw_intent"}
        </Badge>
      </div>
      <p className="intent-text" id="intent-text" hidden={!raw}>
        {raw}
      </p>
      <div className="triage-banner" id="triage-banner" data-maturity={maturity} hidden={!triage} aria-live="polite">
        <ul className="triage-reasons" id="triage-reasons">
          {reasons.length ? (
            reasons.map((reason, index) => <li key={index}>{localizeTriageReason(reason)}</li>)
          ) : (
            <li>{t("输入分级已记录")}</li>
          )}
        </ul>
      </div>
    </section>
  );
}

function ClarifyItem({ amb }: { amb: AmbiguityItem }) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [pressed, setPressed] = useState<string | null>(null);
  const options = amb.options || [];
  return (
    <article className="clarify-item" data-amb-id={amb.id}>
      <div className="clarify-question">
        <Badge variant={amb.blocking ? "warn" : "muted"}>
          {amb.blocking ? t("阻断") : t("非阻断")}
        </Badge>
        <span>{amb.question}</span>
      </div>
      <p className="card-note">
        {t("影响：{impact}", { impact: amb.impact || t("未声明") })}
      </p>
      <div className="clarify-options">
        {options.length ? (
          options.map((option) => (
            <button
              type="button"
              className="lane-chip clarify-chip"
              key={option}
              data-amb-id={amb.id}
              data-answer={option}
              aria-pressed={pressed === option ? "true" : "false"}
              onClick={() => {
                if (input.current) input.current.value = option;
                setPressed(option);
              }}
            >
              {option}
            </button>
          ))
        ) : (
          <span className="card-note">{t("无预设选项，请直接填写")}</span>
        )}
      </div>
      <input
        ref={input}
        className="field clarify-input"
        data-amb-input={amb.id}
        type="text"
        defaultValue={amb.default_assumption || ""}
        placeholder={t("自定义回答…")}
      />
    </article>
  );
}

export function ClarifyPanel({
  workbench,
  state,
  projection: projectionOverride,
  generation: generationOverride,
  onSubmit,
  submitting = false,
}: {
  workbench?: Workbench;
  state?: WorkbenchState;
  projection?: RunProjection | null;
  generation?: number;
  onSubmit?: (answers: Record<string, string>, clarificationNote: string) => Promise<void> | void;
  submitting?: boolean;
}) {
  const t = useT();
  const items = useRef<HTMLDivElement>(null);
  const noteInput = useRef<HTMLTextAreaElement>(null);
  const projection = projectionOverride !== undefined ? projectionOverride : state?.projection ?? null;
  const generation = generationOverride ?? state?.clarifyGeneration ?? 0;
  const { pending, submittedNotes, showForm, showNotes, showPanel } =
    clarifyPanelVisibility(projection);
  // Answers in progress survive live updates until the question set itself changes.
  const signature = projection
    ? `${projection.run_id}:${generation}:${pending.map((amb) => `${amb.id}:${amb.question || ""}`).join("|")}`
    : "";
  const submit = () => {
    const answers: Record<string, string> = {};
    items.current?.querySelectorAll<HTMLInputElement>("[data-amb-input]").forEach((field) => {
      const value = field.value.trim();
      if (value && field.dataset.ambInput) answers[field.dataset.ambInput] = value;
    });
    const clarificationNote = (noteInput.current?.value || "").trim();
    if (onSubmit) {
      void onSubmit(answers, clarificationNote);
    } else if (workbench) {
      void workbench.submitClarify(answers, clarificationNote);
    }
  };
  return (
    <section className="clarify-panel" id="clarify-panel" hidden={!showPanel} aria-labelledby="clarify-title">
      <div className="card-head">
        <h2 className="card-title" id="clarify-title">
          {showForm ? t("待澄清问题") : t("已提交补充说明")}
        </h2>
        <span className="card-note">
          {showForm
            ? t("回答后生成新的 GoalSpec 版本，旧批准指纹随之失效")
            : t("补充约束已随澄清记录保存，融合状态会同步更新")}
        </span>
      </div>
      {showForm ? (
        <>
          <div className="clarify-items" id="clarify-items" ref={items} key={signature}>
            {pending.map((amb) => (
              <ClarifyItem amb={amb} key={amb.id} />
            ))}
          </div>
          <textarea
            key={generation}
            ref={noteInput}
            id="clarify-note-input"
            className="field clarify-note-input"
            rows={3}
            placeholder={t("可选：补充产品边界、固定分类、排除项或额外约束…")}
          />
        </>
      ) : null}
      {showNotes ? (
        <div className="clarify-notes" id="clarify-notes" aria-label={t("已提交的补充说明")}>
          {submittedNotes.map((note) => (
            <span className="clarify-note-pill" data-consumed={note.consumed ? "true" : "false"} key={note.event_seq}>
              <Badge variant={note.consumed ? "ok" : "warn"}>
                {note.consumed ? t("已融合") : t("待融合")}
              </Badge>
              <span>{note.feedback}</span>
            </span>
          ))}
        </div>
      ) : null}
      {showForm ? (
        <div className="clarify-actions">
          <button
            type="button"
            className="btn btn-primary"
            id="btn-clarify-submit"
            disabled={submitting}
            onClick={submit}
          >
            {submitting ? t("提交中…") : t("提交澄清并推进")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
