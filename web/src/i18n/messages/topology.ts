/** Copy for the topology surface. Chinese keys map to EN; English keys map to ZH. */
export const EN: Record<string, string> = {
  // stage live panel
  "运行进展": "Progress",
  "运行详情": "Run details",
  "{used} 次": "{used} calls",
  "修订": "Revision",
  "最近事件": "Latest event",
  "当前阶段 · {stage}": "Current stage · {stage}",
  "最近确认 · {progress}": "Last confirmed · {progress}",
  "查看实机证据": "View product evidence",
  "查看版本记录": "View version history",
  "产物历史": "Artifact history",
  "正在读取执行产物…": "Loading run artifacts…",

  // workflow badge
  "拓扑加载中…": "Loading topology…",
  "{label} · 拓扑不可用": "{label} · topology unavailable",
  " · 当前 {current}": " · current {current}",

  // product E2E verification card
  "实机端到端验收": "Product end-to-end acceptance",
  "Product E2E 实机验收": "Product E2E acceptance",
  "✓ 实机通过": "✓ Product passed",
  "✕ 实机未通过": "✕ Product failed",
  "实机失败项": "Product failures",
  "实机检查项": "Product checks",
  "在检查器查看实机证据": "View product evidence in inspector",
  "启动日志 (boot.log)": "Boot log (boot.log)",
  "验证报告 (report.json)": "Verification report (report.json)",
  "在检查器查看实机首页截图": "View the product homepage screenshot in inspector",
  "实机首页截图": "Product home screenshot",

  // post-DAG review card
  "Post-DAG 统一复核与修复轮次": "Post-DAG unified review and repair rounds",
  "Post-DAG 交付级复核与修复": "Post-DAG delivery-grade review and repair",
  "{count} 轮记录": "{count} rounds recorded",
  "查看完整复核详情": "View full review details",
  "Argus 全局复核：通过 · {detail}": "Argus global review: passed · {detail}",
  "Argus 全局复核：未通过 · {detail}": "Argus global review: not passed · {detail}",
  "{count} 条发现": "{count} findings",
  "复检 {checked} 条 · 失败 {failed}": "Rechecked {checked} · failed {failed}",
  "单任务审查已延后至交付级 Post-DAG 统一复核":
    "Per-task review deferred to the delivery-grade Post-DAG unified review",

  // delivery acceptance
  "交付验收": "Delivery acceptance",
  "验收状态汇总": "Acceptance status summary",
  "逐条验收条件": "Acceptance criteria checklist",
  "条件 {index}": "Criterion {index}",
  "查看证据 · {ref}": "View evidence · {ref}",
  "查看证据": "View evidence",

  // orchestrated workflow
  "编排工作流": "Orchestrated workflow",
  "状态图例": "Status legend",
  "✓ 完成": "✓ Done",

  // task DAG
  "任务依赖图": "Task dependency graph",
  "任务图例": "Task legend",
  "✓ 已验收": "✓ Verified",
  "✕ 阻塞": "✕ Blocked",
  "⚠ 人工接受": "⚠ Human-accepted",
  "关键路径": "Critical path",
  "阻塞传递": "Blocked propagation",
  "执行中": "In progress",
  "当前选中": "Currently selected",
  "查看完整任务计划 · v{version}": "View full task plan · v{version}",
  "查看完整任务计划": "View full task plan",

  // swimlanes
  "Agent 泳道（时间 →）": "Agent swimlanes (time →)",
  "{count} 隔离通道": "{count} isolated lanes",
  "隔离通道": "Isolated lanes",

  // workflow stage handoff + empty state
  "任务级拓扑已展开": "Task-level topology expanded",
  "已验收 {verified} / {total} 个任务，子任务并发波次见下方任务依赖图。":
    "{verified} / {total} tasks verified — concurrent waves are in the task dependency graph below.",
  "任务级拓扑下沉展开": "Task-level topology expands here",
  "批准计划后，下方「任务依赖图」将展开并发波次与独立验收进度。":
    "Once the plan is approved, the “Task dependency graph” below reveals concurrent waves and per-task verification progress.",
  "编排工作流阶段视图": "Orchestrated workflow stage view",
  "当前工作流未提供拓扑描述": "This workflow provides no topology description",

  // graph host error boundary
  "{name}组件未能加载（ariadne-graph：{reason}），其余控制台功能不受影响。":
    "{name} failed to load (ariadne-graph: {reason}); the rest of the console is unaffected.",
};

export const ZH: Record<string, string> = {};
