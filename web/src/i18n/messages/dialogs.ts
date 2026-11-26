/**
 * Copy for the dialog surfaces: `Dialogs.tsx` (Issue Oracle / human gate / toast),
 * `WorkspaceDialog.tsx`, `DirectoryPicker.tsx`, `HitlBanner.tsx`, `IntentClarify.tsx`
 * and `StageHeader.tsx`.
 *
 * Keys are the *source* copy: Chinese keys are translated in `EN`, English keys are
 * translated in `ZH`. The missing direction falls back to the key itself, so each
 * string only ever needs one entry.
 *
 * Copy that `messages/common.ts`, `messages/drawer.ts`, `messages/inspector.ts` or
 * `messages/spec.ts` already own is *not* repeated here — those keys resolve through
 * the merged table (task blockers, approval gate actions, "查看任务依赖图", "检查器",
 * list separators, …).
 */
export const EN: Record<string, string> = {
  // ── Issue Oracle dialog: chrome ─────────────────────────────────────────
  "关闭 Issue Oracle 对话框": "Close the Issue Oracle dialog",
  "声明目标作用域与任务类型后发起受控编排。每个人工关口都会在 Oracle Board 停下等待裁决。":
    "Declare the target scope and task type to start a controlled orchestration. Every human gate stops on the Oracle Board for a ruling.",
  "取消": "Cancel",
  "Issue Oracle · 创建并启动": "Issue Oracle · Create and start",

  // ── Issue Oracle dialog: scope step ─────────────────────────────────────
  "在既有本地仓库上执行受控变更":
    "Run controlled changes against an existing local repository",
  "指向新建或空目录，自动注册为 Workspace":
    "Point at a new or empty directory — it is registered as a Workspace automatically",
  "仅产出规格与任务蓝图，不修改代码文件":
    "Produce specs and the task blueprint only — no code files are touched",
  "工作流覆盖": "Workflow override",
  "无（使用上方自定义作用域）": "None (use the custom scope above)",
  "短目录名必须是单个合法目录段，不能包含 '/'、'\\' 或 '..'":
    "The short folder name must be a single valid path segment — no '/', '\\' or '..'",

  // ── Issue Oracle dialog: intent step ────────────────────────────────────
  "决定默认工作流与 Stage 1 对齐策略":
    "Decides the default workflow and the Stage 1 alignment strategy",
  "描述目标、可观察面与约束，或导入本地文档":
    "Describe the goal, observable surfaces and constraints, or import a local document",
  "标题（可选）": "Title (optional)",
  "例如：Fix hooks write_scope bypass": "e.g. Fix hooks write_scope bypass",
  "需求原文": "Raw request",
  "描述目标、可观察面、范围与约束…":
    "Describe the goal, observable surfaces, scope and constraints…",
  "导入本地文件": "Import local file",
  "支持 .md / .txt / .json / .yaml / .yml": "Supports .md / .txt / .json / .yaml / .yml",
  "已载入 {name} · {size} bytes": "Loaded {name} · {size} bytes",
  "读取本地文件失败": "Failed to read the local file",

  // ── Issue Oracle dialog: runtime overrides ──────────────────────────────
  "模型提供方": "Model provider",
  "auto · 自动选择已配置提供方": "auto · pick any configured provider",
  "(已配置)": "(configured)",
  "(未配置->Mock)": "(not configured → Mock)",
  "mock · 确定性模拟": "mock · deterministic simulation",
  "模型（可选）": "Model (optional)",
  "留空使用提供方默认模型": "Leave blank to use the provider default model",
  "执行驱动（可选）": "Worker driver (optional)",
  "审查驱动（可选）": "Reviewer driver (optional)",
  "留空使用环境配置": "Leave blank to use the environment configuration",
  "Benchmark 预设样本（可选）": "Benchmark preset sample (optional)",
  "沙盒执行 + 验收": "Sandboxed execution + verification",
  "止步于 {stage}": "Stops after {stage}",
  "仅规划，不改代码": "Plan only, no code changes",
  "独立隔离 git 工作区": "Isolated git workspace",
  "初始约束：{items}": "Initial constraints: {items}",
  "建议澄清参考：{items}": "Suggested clarifications: {items}",
  "创建请求失败：{error}": "Create request failed: {error}",

  // ── human gate dialog ──────────────────────────────────────────────────
  "人工关口操作": "Human gate action",
  "补充说明": "Additional note",
  "请输入提示或风险接受理由…": "Enter a hint or the reason for accepting the risk…",
  "确认提交": "Confirm and submit",

  // ── workspace dialog ───────────────────────────────────────────────────
  "关闭工作区管理": "Close the workspace manager",
  "注册本地仓库作为项目工作区以筛选 Oracle Board。移除注册仅清理索引条目，绝不会删除磁盘文件或历史编排记录。":
    "Register local repositories as project workspaces to filter the Oracle Board. Unregistering only drops the index entry — it never deletes files on disk or past orchestration records.",
  "已注册工作区": "Registered workspaces",
  "尚未注册工作区": "No workspaces registered yet",
  "请填写或选择本地仓库目录路径": "Enter or pick the local repository path",
  "请选择新建项目的父目录": "Pick the parent directory for the new project",
  "请填写新项目文件夹名称": "Enter the new project folder name",
  "项目文件夹名称不能包含路径分隔符或相对路径片段":
    "The project folder name cannot contain path separators or relative segments",
  "请填写 Git 仓库地址或 owner/repo 简写":
    "Enter a git remote URL or the owner/repo shorthand",
  "请选择克隆目标父目录": "Pick the parent directory to clone into",

  // ── directory picker ───────────────────────────────────────────────────
  "无法浏览目录": "Cannot browse this directory",

  // ── approval review card (HitlBanner) ──────────────────────────────────
  "变更": "Changed",
  "新增": "Added",
  "移除": "Removed",
  "需复核": "Needs review",
  "定位 上次批准的 {name}": "Locate the previously approved {name}",
  "定位 {name}": "Locate {name}",
  "上次原条目": "Previous entry",
  "原条目": "Original entry",
  "上次批准": "Previously approved",
  "本次候选": "This candidate",
  "Agent 补充 · 高影响": "Agent addition · high impact",
  "来源未记录": "Provenance not recorded",
  "规格引用 · {source}": "Spec reference · {source}",
  "已核对的关键承诺一致。": "All reconciled key commitments match.",
  "查看已确认未变的条目": "View entries confirmed unchanged",
  "查看模块、数据模型与接口": "View modules, data model and interfaces",
  "查看完整 {title}": "View full {title}",
  "查看上次批准的 {title}": "View the previously approved {title}",
  "要求修订": "Request revision",
  "等待需求融合完成…": "Waiting for re-synthesis to finish…",
  "描述需要修订的需求、边界或验收标准…":
    "Describe the requirements, boundaries or acceptance criteria that need revision…",
  "提交修订意见": "Submit revision feedback",

  // ── HITL banner ────────────────────────────────────────────────────────
  "正在加载编排状态…": "Loading orchestration state…",
  "候选版本待批准": "Candidate version awaiting approval",
  "查看定位": "View location",

  // ── intent / clarify panel ─────────────────────────────────────────────
  "需求输入与分级": "Intent input and triage",
  "需求输入": "Intent input",
  "输入上下文": "Input context",
  "输入分级已记录": "Triage result recorded",
  "阻断": "Blocking",
  "非阻断": "Non-blocking",
  "影响：{impact}": "Impact: {impact}",
  "未声明": "not stated",
  "无预设选项，请直接填写": "No preset options — type the answer",
  "自定义回答…": "Custom answer…",
  "待澄清问题": "Pending clarifications",
  "已提交补充说明": "Submitted clarifications",
  "回答后生成新的 GoalSpec 版本，旧批准指纹随之失效":
    "Answering generates a new GoalSpec version, invalidating the previous approval fingerprint",
  "补充约束已随澄清记录保存，融合状态会同步更新":
    "The extra constraints are stored with the clarification record; the merge status updates with it",
  "可选：补充产品边界、固定分类、排除项或额外约束…":
    "Optional: add product boundaries, fixed categories, exclusions or extra constraints…",
  "已提交的补充说明": "Submitted clarifications",
  "已融合": "Merged",
  "待融合": "Pending merge",
  "提交中…": "Submitting…",
  "提交澄清并推进": "Submit clarifications and advance",

  // ── stage header ───────────────────────────────────────────────────────
  "Ariadne 研发编排控制台": "Ariadne engineering console",
  "准备就绪": "Ready",
  "视图切换": "View switcher",
  "恢复运行": "Resume run",
  "暂停调度": "Pause scheduling",
  "阶段进度": "Stage progress",
  "运行指标": "Run metrics",
  "已验收任务": "Accepted tasks",
  "追踪矩阵": "Traceability matrix",
  "执行瀑布": "Execution waterfall",
};

export const ZH: Record<string, string> = {
  // ── directory picker ───────────────────────────────────────────────────
  "Quick roots": "常用根目录",
  "Up to parent folder": "返回上一级目录",
  "↑ Up": "↑ 上一级",
  "Show hidden": "显示隐藏项",
  "Directory breadcrumbs": "目录路径导航",
  "Loading…": "加载中…",
  "Subdirectories": "子目录",
  "Directory does not exist yet — select an ancestor or create it under New Project.":
    "目录尚不存在 —— 请选择其上级目录，或在「新建项目」中创建。",
  "filter: {prefix}": "筛选：{prefix}",
  "Registered": "已注册",
  "Loading folders…": "正在加载文件夹…",
  'No folders matching "{prefix}"': "没有匹配“{prefix}”的文件夹",
  "No subdirectories in this folder": "此文件夹下没有子目录",

  // ── Issue Oracle dialog ────────────────────────────────────────────────
  "Issue Oracle": "发起 Oracle",
  "Existing repository": "既有本地仓库",
  "New empty directory": "新建空目录",
  "Blueprint only": "仅产出蓝图",
  "Benchmark sample active: {name}": "已启用 Benchmark 样本：{name}",
  "Clear sample": "清除样本",
  "Step 1: Scope": "第 1 步：作用域",
  "1. Scope": "1. 作用域",
  "Target Scope": "目标作用域",
  "Target Workspace": "目标工作区",
  "Default server workspace": "默认服务端工作区",
  "Browse / Custom Local Path…": "浏览 / 自定义本地路径…",
  "Existing Directory Path": "既有目录路径",
  "Base Ref (optional)": "基线引用（可选）",
  "e.g. main": "例如：main",
  "Scope Paths (optional)": "作用域路径（可选）",
  "Parent Directory": "父目录",
  "Short Folder Name": "短目录名",
  "e.g. voice-cli-new": "例如：voice-cli-new",
  "Target Directory Path": "目标目录路径",
  "Initialize Git repo (git init)": "初始化 Git 仓库（git init）",
  "Read-Only Context Workspace (optional)": "只读上下文工作区（可选）",
  "None (workspace-less blueprint)": "无（无工作区蓝图）",
  "Step 2: Task Type": "第 2 步：任务类型",
  "2. Task Type": "2. 任务类型",
  "Task Type": "任务类型",
  "Workflow override:": "工作流覆盖：",
  "Auto workflow:": "自动工作流：",
  "Auto ({name})": "自动（{name}）",
  "Step 3: Intent": "第 3 步：意图",
  "3. Intent": "3. 意图",
  "Advanced Runtime Overrides": "高级运行时覆盖",
  "Load Benchmark Sample": "载入 Benchmark 样本",

  // ── workspace dialog ───────────────────────────────────────────────────
  "Open Folder": "打开文件夹",
  "Register existing directory": "注册已有目录",
  "New Project": "新建项目",
  "Create empty folder": "创建空文件夹",
  "Clone Git URL": "克隆 Git 地址",
  "Clone remote repo": "克隆远程仓库",
  "Registered Workspaces ({count})": "已注册工作区（{count}）",
  "{count} ruling": "{count} 项待裁决",
  "Current": "当前",
  "Switch": "切换",
  "Unregister": "注销",
  "Add Workspace": "添加工作区",
  "Add Workspace Mode": "添加工作区模式",
  "Directory Path": "目录路径",
  "Display Name (optional)": "显示名称（可选）",
  "Defaults to folder name": "默认使用文件夹名称",
  "Done": "完成",
  "Registering…": "注册中…",
  "Register Workspace": "注册工作区",
  "Short Project Name": "项目短名",
  "e.g. voice-cli": "例如：voice-cli",
  "Creates": "将创建",
  "Select a parent directory and enter a short project name":
    "请选择父目录并填写项目短名",
  "Creating…": "创建中…",
  "Create Project": "创建项目",
  "Git Remote URL or owner/repo": "Git 远程地址或 owner/repo",
  "https://github.com/owner/repo.git or owner/repo":
    "https://github.com/owner/repo.git 或 owner/repo",
  "Target Folder Name": "目标文件夹名称",
  "Auto-derived from URL": "自动从地址推导",
  "Clone Into Parent Directory": "克隆到父目录",
  "Clones into": "将克隆到",
  "Enter a remote Git URL or owner/repo and select a parent directory":
    "请填写远程 Git 地址或 owner/repo，并选择父目录",
  "Cloning…": "克隆中…",
  "Clone & Register": "克隆并注册",
};
