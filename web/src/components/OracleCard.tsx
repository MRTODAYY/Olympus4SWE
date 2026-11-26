import type { ReactNode } from "react";

import type { RunSummary, SeatState } from "../api/types";
import { useT } from "../i18n";
import {
  boardBadgeVariant,
  GOD_META,
  PENDING_ACTION_CTA,
  shortOracleCode,
  STATUS_BADGE_LABELS,
  TASK_TYPE_LABELS,
  WORKSPACE_MODE_LABELS,
} from "../lib/labels";
import { GodAvatar } from "./GodAvatar";

export interface OracleCardProps {
  run: RunSummary;
  isOpenTab: boolean;
  dimmed?: boolean;
  highlighted?: boolean;
  onOpenTab: (runId: string) => void;
  onQuickRule?: (runId: string) => void;
  actionSlot?: ReactNode;
}

export function OracleCard({
  run,
  isOpenTab,
  dimmed = false,
  highlighted = false,
  onOpenTab,
  onQuickRule,
  actionSlot,
}: OracleCardProps) {
  const t = useT();
  const god = GOD_META[run.active_god] || GOD_META.prometheus;
  const badgeVariant = boardBadgeVariant(run.ball_holder, run.status_badge);
  const badgeLabel = STATUS_BADGE_LABELS[run.status_badge] || run.status_badge;
  const typeLabel = TASK_TYPE_LABELS[run.task_type] || run.task_type;
  const modeLabel = WORKSPACE_MODE_LABELS[run.workspace_mode] || run.workspace_mode;
  const code = shortOracleCode(run.run_id);

  const handoffText =
    run.ball_holder === "human"
      ? `${god.name} ${t("→ 你")}`
      : run.worktree_branch
        ? `${god.name} · ${run.worktree_branch}`
        : `${god.name} · ${god.role}`;

  const quickLabel = run.pending_action
    ? t(PENDING_ACTION_CTA[run.pending_action] || "Review")
    : t("Review");
  const cardAvatarState: SeatState =
    run.ball_holder === "human"
      ? "waiting_on_human"
      : run.ball_holder === "agent"
        ? "working"
        : "idle";

  return (
    <article
      className="oracle-card"
      data-run-id={run.run_id}
      data-ball={run.ball_holder}
      data-god={run.active_god}
      data-mode={run.workspace_mode}
      data-dimmed={dimmed ? "true" : undefined}
      data-highlight={highlighted ? "true" : undefined}
      data-highlighted={highlighted ? "true" : undefined}
    >
      <button
        type="button"
        className="oracle-card-trigger"
        onClick={() => onOpenTab(run.run_id)}
      >
        <div className="oracle-card-meta">
          <span className="oracle-card-tags">
            <span>{run.workspace_name}</span>
            <span aria-hidden="true">·</span>
            <span>{typeLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{modeLabel}</span>
          </span>
          <span className="oracle-status-pill" data-variant={badgeVariant}>
            {badgeLabel}
          </span>
        </div>

        <h3 className="oracle-card-title">
          <span className="oracle-card-code">{code}</span>
          <span>{run.title}</span>
        </h3>
      </button>

      <div className="oracle-card-foot">
        <span className="oracle-card-god">
          <GodAvatar god={run.active_god} state={cardAvatarState} size="sm" />
          <span className="oracle-card-handoff">{handoffText}</span>
        </span>

        <div className="oracle-card-actions">
          {isOpenTab ? (
            <span className="oracle-open-indicator" title={t("Opened in Ariadne Tabs")}>
              {t("Tab Open")}
            </span>
          ) : null}
          {actionSlot ? (
            actionSlot
          ) : onQuickRule && run.ball_holder === "human" ? (
            <button
              type="button"
              className="oracle-quick-cta"
              data-quick-rule={run.run_id}
              onClick={() => onQuickRule(run.run_id)}
            >
              {quickLabel} →
            </button>
          ) : (
            <button
              type="button"
              className="oracle-open-cta"
              onClick={() => onOpenTab(run.run_id)}
            >
              {t("Open Cockpit →")}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
