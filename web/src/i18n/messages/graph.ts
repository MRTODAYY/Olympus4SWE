/** Copy for the graph surface. Chinese keys map to EN; English keys map to ZH. */
export const EN: Record<string, string> = {
  // canvas viewport controls
  "画布视图控制": "Canvas view controls",
  "缩小": "Zoom out",
  "放大": "Zoom in",
  "适应画布": "Fit to canvas",
  "重置 100%": "Reset to 100%",

  // graph host error boundary (retry action added upstream in PR 179)
  "重试加载": "Retry loading",

  // DAG island fallbacks
  "任务依赖有向无环图": "Task dependency DAG",
  "当前运行尚未生成任务 DAG": "This run has not produced a task DAG yet",

  // DAG node pills and accessibility labels (lib/graphProps.ts)
  "依赖受阻": "Dependency blocked",
  "重试中": "Retrying",
  "⚠ 风险": "⚠ Risk",
  "任务 {taskId} {detail}": "Task {taskId} {detail}",
  "，": ", ",
};

export const ZH: Record<string, string> = {};
