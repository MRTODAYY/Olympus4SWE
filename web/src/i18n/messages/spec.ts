/** Copy for the spec surface. Chinese keys map to EN; English keys map to ZH. */
export const EN: Record<string, string> = {
  // shared atoms
  "（无）": "(none)",
  "（未声明）": "(not declared)",
  "指纹": "Fingerprint",
  // inline list separators (source punctuation, localized as-is)
  "；": "; ",

  // tradeoffs
  "选择：{choice}": "Choice: {choice}",
  "代价：{cost}": "Cost: {cost}",

  // module map
  "模块图": "Module map",
  "模块图 · 模块边界与独占写入路径": "Module map · module boundaries and exclusive write paths",
  "模块": "Module",
  "名称": "Name",
  "职责": "Responsibility",
  "关联需求": "Linked requirements",
  "目标路径": "Target paths",
  "依赖模块": "Depends on",
  "数据模型": "Data model",

  // interface contracts
  "接口契约": "Interface contracts",
  // these three keep the trailing space so the label reads naturally before its mono value
  "入参：": "Input: ",
  "出参：": "Output: ",
  "实体：": "Entities: ",
  "错误：{errors}": "Errors: {errors}",

  // GoalSpec
  "GoalSpec · 需求冻结": "GoalSpec · Requirements frozen",
  "目标与验收标准": "Goal and acceptance criteria",
  "目标": "Goal",
  "交付形态": "Deliverable form",
  "可观察面": "Observable surfaces",
  "参与者": "Actors",
  "仍有 {count} 个阻断歧义未回答，批准前需澄清或显式接受风险。":
    "{count} blocking ambiguities are still unanswered — clarify or explicitly accept the risk before approving.",
  "需求与 EARS 验收": "Requirements & EARS acceptance",
  "（未声明验收标准）": "(no acceptance criteria declared)",
  "范围外": "Out of scope",
  "约束": "Constraints",

  // DesignSpec
  "DesignSpec · 白盒设计": "DesignSpec · White-box design",
  "{count} 个模块": "{count} modules",
  "架构摘要": "Architecture summary",
  "执行策略": "Execution strategy",
  "共享契约域": "Shared contract surface",
  "W0 写 · W1 只读": "W0 writes · W1 read-only",
  "绑定需求": "Bound GoalSpec",
  "（未绑定）": "(unbound)",
  "契约先行并发": "Contract-first, concurrent",
  "串行顺序接力": "Serial handoff",

  // invariants
  "全局不变量": "Global invariants",
  "全局不变量（防跨模块隐性漂移）": "Global invariants (prevent cross-module drift)",
  "编号": "ID",
  "类别": "Category",
  "全局规则": "Global rule",
  "适用范围 / 提示": "Applies to / hint",
  "全局": "All modules",
  "v1 规格未声明结构化全局不变量（DesignSpec v2 新建架构将强制校验）。":
    "The v1 spec declares no structured global invariants (new DesignSpec v2 designs are validated for them).",

  // tradeoff impact kinds
  "现有系统": "Existing system",
  "部署": "Deployment",
  "回滚": "Rollback",

  // risks
  "风险与取舍": "Risks & tradeoffs",
};

export const ZH: Record<string, string> = {
  "owner {module}": "归属 {module}",
};
