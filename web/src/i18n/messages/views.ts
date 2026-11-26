/**
 * Copy for the Design / Matrix / Waterfall views plus the shared atoms in
 * `components/ui.tsx`, `components/Artifacts.tsx` and `App.tsx`.
 * Chinese keys map to EN; English keys map to ZH.
 */
export const EN: Record<string, string> = {
  // ── DesignView ─────────────────────────────────────────────────────────
  "架构规格": "Design specs",
  "等待规格": "Awaiting spec",
  "当前运行尚未生成 GoalSpec / DesignSpec。先新建编排提交需求，或批准当前关口后继续推进。":
    "This run has not produced a GoalSpec / DesignSpec yet. Issue an Oracle first, or approve the current gate to continue.",

  // ── MatrixView ─────────────────────────────────────────────────────────
  "需求追踪矩阵": "Traceability matrix",
  "需求验证状态汇总": "Requirement verification summary",
  "✓ 已验证 {count}": "✓ Verified {count}",
  "▶ 验证中 {count}": "▶ Verifying {count}",
  "✕ 失败 {count}": "✕ Failed {count}",
  "⚠ 人工接受 {count}": "⚠ Human-accepted {count}",
  "◷ 待验证 {count}": "◷ Pending {count}",
  "需求、设计模块、任务与验收结果四级追踪表":
    "Four-level trace: requirement → design module → task → verification",
  "需求编号": "Requirement ID",
  "来源与需求描述": "Source and requirement",
  "设计模块": "Design module",
  "承接任务": "Owning task",
  "验收状态与证据": "Verification status and evidence",

  // ── WaterfallView ──────────────────────────────────────────────────────
  "Turn 瀑布": "Turn waterfall",
  "{count} turns": "{count} turns",
  "当前运行尚无已记录的执行回合。": "This run has no recorded execution turn yet.",
  "事件节点": "Event node",
  "{count} steps": "{count} steps",

  // ── backend verification vocabulary (`web/projection.py` matrix rows) ──
  "通过": "Passed",
  "未验证": "Unverified",
  "有验收条件失败": "An acceptance criterion failed",
  "所有验收条件均已通过": "All acceptance criteria passed",
  "缺少可核验的逐条验收结果": "No itemised acceptance result to verify against",
  "尚未分配执行任务": "No execution task assigned yet",
  "命令门禁 + Argus 独立复核通过": "Command gate and independent Argus review passed",
  "正在隔离沙盒中执行或待复核": "Running in the isolated sandbox, or awaiting review",
  "人工接受风险：{reason}": "Risk accepted: {reason}",
  "前置任务待完成：{deps}": "Prerequisite tasks pending: {deps}",
  "{taskId} 验证未通过": "{taskId} failed verification",
  "验收命令退出码 {code}，详见执行日志":
    "Acceptance command exited with code {code} — see the execution log",

  // ── Artifacts.tsx ──────────────────────────────────────────────────────
  "隔离沙盒产物": "Sandbox artifacts",
  "完整性清单": "Integrity manifest",
  "（暂无 MANIFEST.md）": "(no MANIFEST.md yet)",
  "Argus 独立复核": "Argus independent review",
  "冷启动审查": "Cold-start review",
  "（暂无复核记录）": "(no review record yet)",
  "检查日志 · {id}": "Check log · {id}",
  "此版本的执行文件不可用": "The execution file for this version is unavailable",

  // ── ui.tsx atoms ───────────────────────────────────────────────────────
  "数据表": "Data table",
  "（无输出）": "(no output)",
  "（暂无终端输出）": "(no terminal output)",
  "回执": "Receipt",
  "模型 {calls} 次 · {input} in / {output} out":
    "Model · {calls} calls · {input} in / {output} out",
  "补丁 +{added}/−{removed} · 门禁 {passed}/{total}":
    "Patch +{added}/−{removed} · gates {passed}/{total}",
  "（该任务暂无 diff.patch 记录）": "(no diff.patch recorded for this task)",

  // ── App.tsx shell ──────────────────────────────────────────────────────
  "调整检查器宽度": "Resize inspector",
  "{run} · 最近事件 #{seq}": "{run} · latest event #{seq}",
};

export const ZH: Record<string, string> = {
  "{count} turns": "{count} 个回合",
  "{count} steps": "{count} 步",
  "Turn receipt": "回合回执",
  "idle": "空闲",
  "live": "运行中",
  "{state} · {count} tools": "{state} · {count} 个工具",
};
