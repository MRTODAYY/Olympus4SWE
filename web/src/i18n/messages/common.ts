/**
 * Shared copy: status labels, workflow stages, stage progress lines, task and
 * approval vocabulary.
 *
 * Keys are the *source* copy: Chinese keys are translated in `EN`, English keys
 * are translated in `ZH`. The missing direction falls back to the key itself, so
 * each string only ever needs one entry.
 */
export const EN: Record<string, string> = {
  // maturity
  "原始意图": "Raw intent",
  "GoalSpec 就绪": "GoalSpec ready",
  "DesignSpec 就绪": "DesignSpec ready",

  // retry / transport
  "调用超时，正在自动重试": "Call timed out — retrying automatically",
  "等待本次调用返回": "Waiting for the current call to return",
  "{message}。下一步：{nextStep}。": "{message}. Next step: {nextStep}.",

  // workflows
  "产品蓝图": "Product Blueprint",
  "全流程 TDD": "Full SDLC (TDD)",
  "快速补丁": "Fast Patch",
  "product_blueprint · 产品蓝图（仅规划，不写代码）":
    "product_blueprint · Product blueprint (plan only, writes no code)",
  "full_sdlc_tdd · 全流程研发（含沙盒写代码 + 验收）":
    "full_sdlc_tdd · Full SDLC (sandboxed coding + verification)",
  "repo_fast_patch · 快速补丁（跳过架构直改代码）":
    "repo_fast_patch · Fast patch (skips design, edits code directly)",
  "需求对齐 → 白盒架构 → Wave 0/1/2 任务拆解后结束；含 3 道人工关口，不写仓库代码。":
    "Align intent → white-box design → Wave 0/1/2 task decomposition, then stop. Three human gates, no repo code written.",
  "需求对齐 → 白盒架构 → 任务拆解 → 隔离沙盒并发写代码与冷启动验收；含 3 道人工关口。":
    "Align intent → white-box design → task decomposition → concurrent sandboxed coding plus cold-start verification. Three human gates.",
  "跳过白盒架构，基于 GoalSpec 拆解后直接改代码并验收；人工关口全自动放行。":
    "Skips white-box design: decomposes straight from the GoalSpec, edits code and verifies. Human gates auto-approve.",

  // workflow nodes
  "输入分流": "Intake",
  "需求对齐": "Align",
  "多维评审": "Critique",
  "需求确认": "Spec Gate",
  "白盒架构": "Design",
  "架构校验": "Design Check",
  "架构确认": "Design Gate",
  "任务分解": "Plan",
  "计划校验": "Plan Check",
  "计划确认": "Plan Gate",
  "并发执行": "Execute",

  // workflow status
  "✓ 已完成": "✓ Completed",
  "▶ 运行中": "▶ Running",
  "◷ 待确认": "◷ Awaiting approval",
  "✕ 中断/阻塞": "✕ Interrupted / blocked",
  "— 已跳过": "— Skipped",
  "◷ 等待": "◷ Pending",

  // approvals
  "任务计划": "Task plan",
  "批准 GoalSpec 进入架构设计": "Approve GoalSpec and start design",
  "批准 DesignSpec 启动任务分解": "Approve DesignSpec and start planning",
  "批准任务计划": "Approve task plan",

  // output actions
  "查看 GoalSpec": "View GoalSpec",
  "查看 DesignSpec": "View DesignSpec",
  "查看任务依赖图": "View task DAG",
  "查看代码变更": "View code diff",
  "查看验收证据": "View verification evidence",

  // delivery / post-DAG
  "✓ 通过": "✓ Passed",
  "✕ 失败": "✕ Failed",
  "◷ 未验证": "◷ Unverified",
  "◷ 待验证": "◷ Pending verification",
  "▶ 验证中": "▶ Verifying",
  "▶ 定向修复中": "▶ Repairing",
  "✓ 交付已通过": "✓ Delivery passed",
  "◷ 已暂停": "◷ Paused",
  "✕ 交付未通过": "✕ Delivery failed",
  "⚠ 待人工裁决": "⚠ Awaiting human ruling",
  "实机验证": "Product E2E",
  "复现复检": "Repro recheck",
  "Argus 复核": "Argus review",
  "定向修复": "Targeted repair",
  "✓ 已应用": "✓ Applied",
  "✕ 已拒绝": "✕ Rejected",

  // duration
  "未记录耗时": "No duration recorded",

  // triage reasons (backend English → localized copy)
  "输入为自然语言描述，尚未冻结可验收需求、模块边界或接口契约。":
    "Free-form intent: no frozen acceptance criteria, module boundaries or interface contracts yet.",
  "需先经 Stage 1 需求对齐生成 EARS GoalSpec，再进入白盒架构设计。":
    "Stage 1 Align must first synthesize an EARS GoalSpec before white-box design can start.",
  "已明确业务目标（What），待 Stage 2a 补齐模块路径、数据归属与接口接缝（How）。":
    "Business goal (What) is clear; Stage 2a still has to fill in module paths, data ownership and interface seams (How).",
  "缺少明确的模块间接口签名与异常分支契约。":
    "Missing explicit inter-module interface signatures and error-branch contracts.",
  "缺少数据实体及其唯一所属模块的归属映射。":
    "Missing a data-ownership map: which module owns which entity.",
  "输入已达到 GoalSpec 就绪标准，可直接跨过澄清进入白盒架构设计。":
    "Input already meets GoalSpec readiness; it can skip clarification and go straight to white-box design.",
  "输入已达到完整 DesignSpec 标准，可直接进入任务分解（PM Decompose）。":
    "Input already meets the full DesignSpec bar; it can proceed to PM Decompose.",

  // error copy
  "模型接口读取超时（已将默认超时阈值提升至 300s，可直接点击“从断点重试”继续）· {raw}":
    "Model read timed out (default timeout raised to 300s — click “Retry from checkpoint” to continue) · {raw}",
  "模型调用异常（可检查提供方配置后点击“从断点重试”）· {raw}":
    "Model call failed (check the provider settings, then click “Retry from checkpoint”) · {raw}",

  // run status
  "未验证 · 人工接受": "Unverified · human-accepted",
  "已验收": "Verified",
  "已完成": "Completed",
  "运行中": "Running",
  "对齐中": "Aligning",
  "设计中": "Designing",
  "分解中": "Planning",
  "待人工": "Awaiting human",
  "已创建": "Created",
  "待验收": "Verifying",
  "阻塞": "Blocked",
  "失败": "Failed",
  "已暂停": "Paused",
  "就绪": "Ready",
  "已取消": "Cancelled",
  "蓝图已定稿": "Blueprint frozen",
  "等待": "Pending",

  // stage progress lines
  "等待首条运行记录": "Waiting for the first run event",
  "工作流": "Workflow",
  "已接收编排请求": "Orchestration request accepted",
  "输入分流完成": "Intake triage complete",
  "已记录澄清回答": "Clarification answers recorded",
  "已记录人工决定": "Human ruling recorded",
  "开始{node}": "Started {node}",
  "{node}完成": "{node} finished",
  "{node}等待继续": "{node} paused",
  "{node}执行中断": "{node} interrupted",
  "工作流完成": "Workflow finished",
  "运行状态更新为{status}": "Run status → {status}",
  "已切换为全流程执行": "Promoted to full SDLC execution",
  "{task_id} 已重新排队": "{task_id} requeued",
  "{task_id} 受阻": "{task_id} blocked",
  "{task_id} 已验收": "{task_id} accepted",
  "{task_id} 保留未验证状态，已人工接受风险": "{task_id} stayed unverified; risk accepted by human",
  "已补充澄清说明": "Clarification note added",
  "已按澄清重新合成需求规格": "GoalSpec re-synthesized from clarifications",
  "需求融合失败，可原地重试": "Re-synthesis failed — retry in place",
  "已请求修订当前交付": "Revision of current delivery requested",
  "运行已重新打开": "Run reopened",
  "{task_id} 临时产物已清理": "{task_id} ephemeral artifacts cleaned",
  "{task_id} 变更越界被拦截": "{task_id} diff rejected by Diff Gate (out of scope)",
  "{task_id} 逃逸语句被拦截": "{task_id} escape hatch rejected",
  "{task_id} 独立复核延后至交付验收": "{task_id} independent review deferred to delivery verification",
  "{task_id} 延后复核已通过": "{task_id} deferred review passed",
  "{task_id} 审查结论已核验": "{task_id} review verdict verified",
  "{task_id} 复现命令已复检": "{task_id} repro commands rechecked",
  "{task_id} 复现命令已清除": "{task_id} repro commands cleared",
  "产品端到端验证完成": "Product E2E verification complete",
  "交付后复现命令已复检": "Post-delivery repro commands rechecked",
  "交付修复轮次完成": "Delivery repair round finished",
  "交付修复已应用": "Delivery repair applied",
  "交付修复被拒绝": "Delivery repair rejected",
  "已记录运行更新": "Run update recorded",

  // current stage suffixes
  " · 有任务受阻": " · task blocked",
  " · 执行中断": " · interrupted",

  // locale switch
  "切换为简体中文": "Switch to Simplified Chinese",
  "切换为英文界面": "Switch to English",

  // stage pipeline labels sent by the backend (`projection._build_stage_pipeline`)
  "要求": "Requirements",
  "设计": "Design",
  "分解": "Plan",
  "执行": "Execute",
  "验收": "Verify",
};

export const ZH: Record<string, string> = {
  // task type
  "Feature": "功能",
  "Fix": "修复",
  "Refactor": "重构",
  "Blueprint": "蓝图",

  // workspace mode
  "Brownfield": "既有仓库",
  "Greenfield": "全新项目",
  "Spec-Only": "仅规格",

  // pantheon roles
  "Align · Needs": "对齐 · 需求",
  "Design · Arch": "设计 · 架构",
  "Build · Sandbox": "构建 · 沙盒",
  "Review · Audit": "复核 · 审计",
  "Verify · Gate": "验收 · 关口",

  // pantheon seat role labels sent by the backend (PANTHEON_STAGE_BINDING)
  "Align": "对齐",
  "Design/Plan": "设计 / 分解",
  "Build": "构建",
  "Verify": "验收",

  // status badges
  "Clarify": "待澄清",
  "Approve Spec": "待批准需求",
  "Approve Design": "待批准架构",
  "Approve Plan": "待批准计划",
  "Review Delivery": "待验收交付",
  "Blocked": "阻塞",
  "Paused": "已暂停",
  "Failed": "失败",
  "Queued": "排队中",
  "Aligning": "对齐中",
  "Designing": "设计中",
  "Planning": "分解中",
  "Building": "构建中",
  "Reviewing": "复核中",
  "Verifying": "验收中",
  "Delivered": "已验收交付",
  "Blueprint Ready": "蓝图已定稿",
  "Cancelled": "已取消",
  "Idle": "空闲",
  "Review": "复核",
  "Running": "运行中",
  "Pending": "等待",
  "Verified": "已验收",
  "Completed": "已完成",
  "Ready": "就绪",

  // pending action CTA
  "Answer in Drawer": "在抽屉中回答",
  "Review Spec": "审阅需求规格",
  "Resolve Blocker": "解除阻塞",
};
