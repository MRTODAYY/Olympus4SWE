/** Copy for the drawer surface. Chinese keys map to EN; English keys map to ZH. */
export const EN: Record<string, string> = {
  // clarify flow
  "请先回答至少一项澄清问题或填写补充说明":
    "Answer at least one clarification question or fill in a note first",
  "已保存澄清进度，仍可继续回答剩余阻断项":
    "Clarification progress saved — you can still answer the remaining blocking items",
  "已提交澄清并生成新的 GoalSpec 版本":
    "Clarifications submitted; a new GoalSpec version was synthesized",
  "已提交修订请求，工作流从需求对齐阶段重新启动":
    "Revision requested — the workflow restarts from Align",

  // approval
  "请先处理阻断项。若要批准此版本，请填写接受风险的理由。":
    "Resolve the blockers first. To approve this version anyway, record why you accept the risk.",
  "首期范围已与业务确认，接受未决歧义风险先行冻结规格。":
    "Phase-one scope is confirmed with the business; freeze the spec now and accept the open ambiguity risk.",
  "已带风险批准 GoalSpec，进入架构设计":
    "GoalSpec approved with accepted risk — moving on to design",
  "已批准任务计划，蓝图编排已完成":
    "Task plan approved — blueprint orchestration is complete",
  "审批候选版本": "Approval candidates",

  // blocked task actions
  "任务受阻，需人工介入": "Task blocked — human decision required",
  "受影响任务：{tasks}。原因：{reason}": "Affected tasks: {tasks}. Reason: {reason}",
  "、": ", ",
  "注入提示": "Inject hint",
  "重试任务": "Retry task",
  "改派给人": "Reassign to human",
  "接受风险": "Accept risk",
  "向任务 {taskId} 注入人工提示并重试":
    "Inject a human hint into task {taskId} and retry",
  "提示原文保留在审计事件中，随下次隔离沙盒执行一并注入 Worker 上下文，不直接篡改需求契约。":
    "The hint text is kept in the audit event and injected into the Worker context on the next isolated sandbox run; it never rewrites the requirement contract directly.",
  "输入要注入的人工提示，例如需修复的边界或重试思路。":
    "Enter the human hint to inject, e.g. the boundary that needs fixing or the retry approach.",
  "已向 {taskId} 注入提示并重新排入就绪队列":
    "Hint injected into {taskId}; the task is requeued as ready",
  "将任务 {taskId} 改派给人工工程师":
    "Reassign task {taskId} to a human engineer",
  "改派后人工提交的产物仍须经过相同的程序门禁与 Argus 独立复核才能成为已验收状态。":
    "Artifacts delivered by a human still pass the same programmatic gates and independent Argus review before they count as verified.",
  "输入改派备注，例如接手人与需关注的验收要点。":
    "Enter a reassignment note, e.g. the new owner and the acceptance points to watch.",
  "已记录 {taskId} 改派人工并回到就绪态":
    "{taskId} reassigned to a human and returned to ready",
  "必须填写明确理由。该决定与 Agent 建议分开存储，追踪矩阵标记为“未验证 · 人工接受”，绝不显示为“已验证”。":
    "An explicit reason is required. The decision is stored separately from agent recommendations; the traceability matrix marks it “Unverified · human-accepted” and never “Verified”.",
  "输入接受风险的明确理由，例如影响范围与缓解措施。":
    "Enter the explicit reason for accepting the risk, e.g. impact scope and mitigations.",
  "已记录人工接受风险，{taskId} 标记为未验证 · 人工接受":
    "Risk acceptance recorded; {taskId} is marked unverified · human-accepted",

  // paused / resynthesis
  "编排当前处于暂停状态": "Orchestration is currently paused",
  "恢复调度后，Pantheon 将继续推进剩余任务。":
    "Once resumed, the Pantheon continues with the remaining tasks.",
  "恢复编排": "Resume orchestration",
  "正在将澄清与补充约束融合进 GoalSpec…":
    "Folding clarifications and extra constraints into the GoalSpec…",

  // delivery ruling
  "交付验收待人工决策": "Delivery acceptance needs a human decision",
  "已重新启动交付验证与修复工作流":
    "Delivery verification and repair workflow restarted",
  "从断点重试": "Retry from checkpoint",
  "查看启动日志": "View boot log",
  "查看完整交付证据": "View full delivery evidence",

  // run failure / promotion
  "工作流执行中断": "Workflow run interrupted",
  "查看节点日志": "View node logs",
  "产品蓝图已定稿": "Product blueprint frozen",
  "已升级为 full_sdlc_tdd，启动沙盒代码执行":
    "Promoted to full_sdlc_tdd — starting sandboxed code execution",
  "转入沙盒执行 (full_sdlc_tdd)": "Promote to sandbox execution (full_sdlc_tdd)",

  // empty / loading states
  "找不到该 Oracle 的运行记录。": "No run record found for this Oracle.",
  "正在加载 Oracle 裁决上下文…": "Loading the Oracle ruling context…",
  "该 Oracle 当前没有待裁决关口，可关闭抽屉或进入 Ariadne 控制台查看完整进度。":
    "This Oracle has no gate awaiting a ruling. Close the drawer, or open the Ariadne cockpit for full progress.",
};

export const ZH: Record<string, string> = {
  "Ruling": "裁决",
  "Intent": "意图",
  "Oracle Intent": "Oracle 意图",
  "Close Quick Ruling Drawer": "关闭快速裁决抽屉",
  "Open Full Ariadne Cockpit ↗": "打开完整 Ariadne 控制台 ↗",
};
