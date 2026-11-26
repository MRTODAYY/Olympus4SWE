import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import type { TaskType, WorkspaceMode } from "../api/types";
import { localized, useT } from "../i18n";
import {
  TASK_TYPE_LABELS,
  WORKFLOW_SELECT_LABELS,
  WORKFLOW_SUMMARY,
  WORKSPACE_MODE_LABELS,
} from "../lib/labels";
import { isValidSingleFolderSegment, joinDirPath, splitDirPath } from "../lib/paths";
import type { NewRunForm, Workbench, WorkbenchState } from "../state/workbench";
import { DirectoryPicker } from "./DirectoryPicker";

const FILE_NOTE = "支持 .md / .txt / .json / .yaml / .yml";
const INVALID_FOLDER_SEGMENT = "短目录名必须是单个合法目录段，不能包含 '/'、'\\' 或 '..'";
const CUSTOM_PATH_VALUE = "__custom__";

const SCOPE_OPTIONS: { id: WorkspaceMode; label: string; hint: string }[] = localized([
  { id: "brownfield", label: WORKSPACE_MODE_LABELS.brownfield, hint: "Existing repository" },
  { id: "greenfield", label: WORKSPACE_MODE_LABELS.greenfield, hint: "New empty directory" },
  { id: "spec_only", label: WORKSPACE_MODE_LABELS.spec_only, hint: "Blueprint only" },
]);

const TASK_TYPE_OPTIONS: { id: TaskType; label: string }[] = [
  { id: "feature", label: TASK_TYPE_LABELS.feature },
  { id: "fix", label: TASK_TYPE_LABELS.fix },
  { id: "refactor", label: TASK_TYPE_LABELS.refactor },
  { id: "blueprint", label: TASK_TYPE_LABELS.blueprint },
];

/**
 * Thin wrapper over a native `<dialog closedby="any">`: the platform owns modality, focus trap,
 * Esc and light dismiss; React only renders the form and receives the `close` return value.
 */
export function NativeDialog({
  id,
  labelledBy,
  onClose,
  lightDismissFallback = false,
  children,
}: {
  id: string;
  labelledBy: string;
  onClose: (returnValue: string) => void;
  /** Emulate `closedby="any"` light dismiss where the browser lacks `HTMLDialogElement.closedBy`. */
  lightDismissFallback?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return undefined;
    const handleClose = () => {
      const choice = dialog.returnValue;
      // Reset so Esc or light dismiss never replays a stale confirm.
      dialog.returnValue = "";
      onCloseRef.current(choice);
    };
    const handleClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const inside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!inside) dialog.close();
    };
    const needsFallback = lightDismissFallback && !("closedBy" in HTMLDialogElement.prototype);
    dialog.addEventListener("close", handleClose);
    if (needsFallback) dialog.addEventListener("click", handleClick);
    return () => {
      dialog.removeEventListener("close", handleClose);
      if (needsFallback) dialog.removeEventListener("click", handleClick);
    };
  }, [lightDismissFallback]);

  return (
    <dialog ref={ref} id={id} aria-labelledby={labelledBy} {...{ closedby: "any" }}>
      {children}
    </dialog>
  );
}

const EMPTY_FORM: NewRunForm = {
  workspaceMode: "brownfield",
  workspaceId: "",
  customWorkspaceRoot: "",
  greenfieldPath: "",
  initGit: false,
  contextWorkspaceId: "",
  baseRef: "",
  scopePaths: "",
  taskType: "feature",
  demoId: "",
  title: "",
  workflow: "",
  provider: "auto",
  model: "",
  workerDriver: "",
  reviewerDriver: "",
  input: "",
};

export function NewRunDialog({ workbench, state }: { workbench: Workbench; state: WorkbenchState }) {
  const t = useT();
  const [form, setForm] = useState<NewRunForm>(EMPTY_FORM);
  const [greenfieldParent, setGreenfieldParent] = useState("");
  const [greenfieldParentTouched, setGreenfieldParentTouched] = useState(false);
  const [greenfieldName, setGreenfieldName] = useState("");
  // Source copy + interpolation vars: translated at render so a locale switch re-renders the note.
  const [fileNote, setFileNote] = useState<{ key: string; vars?: Record<string, string | number> }>({
    key: FILE_NOTE,
  });
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const fileReadSeq = useRef(0);
  const lastOpenSeq = useRef(0);

  const options = state.options;
  const workflows = options?.workflows || [];
  const demos = options?.demos || [];
  const providers = options?.providers || [];
  const workspaces = state.workspaces || [];

  useEffect(() => {
    if (state.newRunOpenSeq === 0 || state.newRunOpenSeq === lastOpenSeq.current) return;
    lastOpenSeq.current = state.newRunOpenSeq;
    setError(null);
    setForm((current) => {
      const preferredWorkspace =
        state.selectedWorkspaceId &&
        workspaces.some((ws) => ws.workspace_id === state.selectedWorkspaceId)
          ? state.selectedWorkspaceId
          : current.workspaceId &&
              current.workspaceId !== CUSTOM_PATH_VALUE &&
              workspaces.some((ws) => ws.workspace_id === current.workspaceId)
            ? current.workspaceId
            : workspaces[0]?.workspace_id || "";
      return {
        ...current,
        workspaceId: preferredWorkspace,
      };
    });
  }, [state.newRunOpenSeq, state.selectedWorkspaceId, workspaces]);

  useEffect(() => {
    if (!workspaces.length) return;
    setForm((current) => {
      if (current.workspaceId) return current;
      const preferred =
        state.selectedWorkspaceId &&
        workspaces.some((ws) => ws.workspace_id === state.selectedWorkspaceId)
          ? state.selectedWorkspaceId
          : workspaces[0]?.workspace_id || "";
      return preferred ? { ...current, workspaceId: preferred } : current;
    });
  }, [workspaces, state.selectedWorkspaceId]);

  const set = (patch: Partial<NewRunForm>) => {
    setError(null);
    setForm((current) => ({ ...current, ...patch }));
  };

  const closeDialog = () => {
    const dialog = document.getElementById("new-run-dialog") as HTMLDialogElement | null;
    if (dialog?.open) dialog.close();
  };

  const effectiveScopeMode = form.demoId ? "brownfield" : form.workspaceMode;
  const autoWorkflow =
    options?.defaultWorkflows?.[`${effectiveScopeMode}:${form.taskType}`] ||
    workflows[0]?.name ||
    "";
  const demo = demos.find((item) => item.id === form.demoId);
  const effectiveWorkflowName =
    form.workflow || (demo?.default_workflow ? demo.default_workflow : autoWorkflow);
  const effectiveWorkflow = workflows.find((workflow) => workflow.name === effectiveWorkflowName);
  const workflowSummaryText =
    WORKFLOW_SUMMARY[effectiveWorkflowName] || effectiveWorkflow?.description || "";
  const workflowWriteNote = effectiveWorkflow
    ? effectiveWorkflow.stop_after === "execute"
      ? t("沙盒执行 + 验收")
      : t("止步于 {stage}", { stage: effectiveWorkflow.stop_after || "plan" })
    : effectiveWorkflowName === "product_blueprint"
      ? t("仅规划，不改代码")
      : t("沙盒执行 + 验收");

  const demoNote = demo
    ? [
        demo.workspace_summary || t("独立隔离 git 工作区"),
        (demo.constraints || []).length
          ? t("初始约束：{items}", { items: demo.constraints.join(t("；")) })
          : "",
        (demo.clarification_hints || []).length
          ? t("建议澄清参考：{items}", {
              items: demo.clarification_hints.join(" / "),
            })
          : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  const selectedWorkspace = workspaces.find((ws) => ws.workspace_id === form.workspaceId);

  const applyDemo = (demoId: string) => {
    const preset = demos.find((item) => item.id === demoId);
    if (!preset) {
      set({ demoId: "", workflow: "" });
      return;
    }
    set({
      demoId,
      workspaceMode: "brownfield",
      title: preset.title || "",
      input: preset.raw_input || "",
      workflow:
        preset.default_workflow && workflows.some((wf) => wf.name === preset.default_workflow)
          ? preset.default_workflow
          : "",
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (
      form.workspaceMode === "greenfield" &&
      !demo &&
      greenfieldName.trim() &&
      !isValidSingleFolderSegment(greenfieldName)
    ) {
      setError(t(INVALID_FOLDER_SEGMENT));
      return;
    }
    const result = await workbench.submitNewRun(form);
    if (!result.ok) {
      setError(t("创建请求失败：{error}", { error: result.error }));
      return;
    }
    fileReadSeq.current += 1;
    setForm((current) => ({
      ...EMPTY_FORM,
      workspaceMode: current.workspaceMode,
      workspaceId: state.selectedWorkspaceId || workspaces[0]?.workspace_id || "",
      taskType: current.taskType,
      provider: current.provider,
    }));
    setGreenfieldName("");
    setFileNote({ key: FILE_NOTE });
    setError(null);
    closeDialog();
  };

  const handleGreenfieldParentChange = (nextParent: string) => {
    setGreenfieldParentTouched(true);
    setGreenfieldParent(nextParent);
    if (greenfieldName.trim()) {
      set({ greenfieldPath: joinDirPath(nextParent, greenfieldName) });
    }
  };

  const handleGreenfieldDefaultRoot = (defaultRoot: string) => {
    if (greenfieldParentTouched) return;
    setGreenfieldParent(defaultRoot);
    if (greenfieldName.trim()) {
      set({ greenfieldPath: joinDirPath(defaultRoot, greenfieldName) });
    }
  };

  const handleGreenfieldNameChange = (nextName: string) => {
    setGreenfieldName(nextName);
    const trimmed = nextName.trim();
    if (!trimmed) {
      set({ greenfieldPath: "" });
      return;
    }
    if (!isValidSingleFolderSegment(trimmed)) {
      setError(t(INVALID_FOLDER_SEGMENT));
      return;
    }
    if (greenfieldParent.trim()) {
      set({ greenfieldPath: joinDirPath(greenfieldParent, trimmed) });
    }
  };

  const handleGreenfieldPathChange = (nextPath: string) => {
    set({ greenfieldPath: nextPath });
    const { parent, name } = splitDirPath(nextPath);
    if (parent) {
      setGreenfieldParentTouched(true);
      setGreenfieldParent(parent);
    }
    setGreenfieldName(name);
  };

  const onFile = () => {
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    const seq = ++fileReadSeq.current;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (seq !== fileReadSeq.current) return;
      set({ input: String(reader.result || "") });
      setFileNote({ key: "已载入 {name} · {size} bytes", vars: { name: file.name, size: file.size } });
    });
    reader.addEventListener("error", () => {
      if (seq !== fileReadSeq.current) return;
      workbench.toast(t("读取本地文件失败"));
    });
    reader.readAsText(file, "utf-8");
    if (fileInput.current) fileInput.current.value = "";
  };

  return (
    <NativeDialog
      id="new-run-dialog"
      labelledBy="new-run-dialog-title"
      lightDismissFallback
      onClose={() => setError(null)}
    >
      <form id="new-run-form" className="oracle-modal-form" onSubmit={(e) => void handleSubmit(e)}>
        <div className="oracle-modal-head">
          <div>
            <h2 className="dialog-title" id="new-run-dialog-title">
              {t("Issue Oracle")}
            </h2>
            <p className="dialog-desc">
              {t(
                "声明目标作用域与任务类型后发起受控编排。每个人工关口都会在 Oracle Board 停下等待裁决。",
              )}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-quiet"
            aria-label={t("关闭 Issue Oracle 对话框")}
            onClick={closeDialog}
          >
            ×
          </button>
        </div>

        {demo ? (
          <div className="oracle-demo-active" id="new-run-demo-banner">
            <span>
              {t("Benchmark sample active: {name}", {
                name: demo.label || demo.title || demo.id,
              })}
            </span>
            <button
              type="button"
              className="btn btn-quiet"
              id="btn-clear-demo"
              onClick={() => applyDemo("")}
            >
              {t("Clear sample")}
            </button>
          </div>
        ) : null}

        <section className="oracle-step" aria-label={t("Step 1: Scope")}>
          <div className="oracle-step-head">
            <span className="oracle-step-title">{t("1. Scope")}</span>
            <span className="oracle-step-hint">
              {form.workspaceMode === "brownfield"
                ? t("在既有本地仓库上执行受控变更")
                : form.workspaceMode === "greenfield"
                  ? t("指向新建或空目录，自动注册为 Workspace")
                  : t("仅产出规格与任务蓝图，不修改代码文件")}
            </span>
          </div>
          <div className="seg-group" role="group" aria-label={t("Target Scope")}>
            {SCOPE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className="seg-option"
                data-scope-mode={option.id}
                aria-pressed={form.workspaceMode === option.id ? "true" : "false"}
                onClick={() => set({ workspaceMode: option.id, demoId: "" })}
              >
                <span>{option.label}</span>
                <span className="seg-option-sub">{option.hint}</span>
              </button>
            ))}
          </div>

          {form.workspaceMode === "brownfield" && !demo ? (
            <>
              <div className="form-field">
                <label className="dialog-label" htmlFor="new-run-workspace">
                  {t("Target Workspace")}
                </label>
                <select
                  id="new-run-workspace"
                  className="field"
                  value={form.workspaceId}
                  onChange={(event) => set({ workspaceId: event.target.value })}
                >
                  {!workspaces.length ? (
                    <option value="">{t("Default server workspace")}</option>
                  ) : null}
                  {workspaces.map((ws) => (
                    <option value={ws.workspace_id} key={ws.workspace_id}>
                      {`${ws.name} — ${ws.root_path}`}
                    </option>
                  ))}
                  <option value={CUSTOM_PATH_VALUE}>{t("Browse / Custom Local Path…")}</option>
                </select>
              </div>
              {form.workspaceId === CUSTOM_PATH_VALUE ? (
                <div className="form-field">
                  <label className="dialog-label" htmlFor="new-run-workspace-root">
                    {t("Existing Directory Path")}
                  </label>
                  <DirectoryPicker
                    idPrefix="new-run-custom"
                    inputId="new-run-workspace-root"
                    value={form.customWorkspaceRoot}
                    onChange={(next) => set({ customWorkspaceRoot: next })}
                    placeholder="/path/to/existing/repository"
                    disabled={state.submitting}
                    mode="select_folder"
                    refreshKey={state.newRunOpenSeq}
                  />
                </div>
              ) : null}
              <div className="form-grid">
                <div className="form-field">
                  <label className="dialog-label" htmlFor="new-run-base-ref">
                    {t("Base Ref (optional)")}
                  </label>
                  <input
                    id="new-run-base-ref"
                    className="field"
                    type="text"
                    placeholder={selectedWorkspace?.default_branch || t("e.g. main")}
                    value={form.baseRef}
                    onChange={(event) => set({ baseRef: event.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label className="dialog-label" htmlFor="new-run-scope-paths">
                    {t("Scope Paths (optional)")}
                  </label>
                  <input
                    id="new-run-scope-paths"
                    className="field"
                    type="text"
                    placeholder="src/api, tests/unit"
                    value={form.scopePaths}
                    onChange={(event) => set({ scopePaths: event.target.value })}
                  />
                </div>
              </div>
            </>
          ) : null}

          {form.workspaceMode === "greenfield" && !demo ? (
            <div className="greenfield-scope-box">
              <div className="form-field">
                <label className="dialog-label" htmlFor="new-run-greenfield-parent-input">
                  {t("Parent Directory")}
                </label>
                <DirectoryPicker
                  idPrefix="new-run-greenfield-parent"
                  inputId="new-run-greenfield-parent-input"
                  value={greenfieldParent}
                  onChange={handleGreenfieldParentChange}
                  onDefaultRoot={handleGreenfieldDefaultRoot}
                  placeholder="/path/to/projects"
                  disabled={state.submitting}
                  mode="select_parent"
                  refreshKey={state.newRunOpenSeq}
                />
              </div>
              <div className="form-grid">
                <div className="form-field">
                  <label className="dialog-label" htmlFor="new-run-greenfield-name">
                    {t("Short Folder Name")}
                  </label>
                  <input
                    id="new-run-greenfield-name"
                    className="field mono"
                    type="text"
                    placeholder={t("e.g. voice-cli-new")}
                    value={greenfieldName}
                    disabled={state.submitting}
                    onChange={(event) => handleGreenfieldNameChange(event.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label className="dialog-label" htmlFor="new-run-greenfield-path">
                    {t("Target Directory Path")}
                  </label>
                  <input
                    id="new-run-greenfield-path"
                    className="field mono"
                    type="text"
                    placeholder="/path/to/new-project"
                    value={form.greenfieldPath}
                    disabled={state.submitting}
                    onChange={(event) => handleGreenfieldPathChange(event.target.value)}
                  />
                </div>
              </div>
              <label className="dialog-check">
                <input
                  id="new-run-greenfield-init-git"
                  type="checkbox"
                  checked={form.initGit}
                  disabled={state.submitting}
                  onChange={(event) => set({ initGit: event.target.checked })}
                />
                <span>{t("Initialize Git repo (git init)")}</span>
              </label>
            </div>
          ) : null}

          {form.workspaceMode === "spec_only" && !demo ? (
            <div className="form-field">
              <label className="dialog-label" htmlFor="new-run-context-workspace">
                {t("Read-Only Context Workspace (optional)")}
              </label>
              <select
                id="new-run-context-workspace"
                className="field"
                value={form.contextWorkspaceId}
                onChange={(event) => set({ contextWorkspaceId: event.target.value })}
              >
                <option value="">{t("None (workspace-less blueprint)")}</option>
                {workspaces.map((ws) => (
                  <option value={ws.workspace_id} key={ws.workspace_id}>
                    {`${ws.name} — ${ws.root_path}`}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </section>

        <section className="oracle-step" aria-label={t("Step 2: Task Type")}>
          <div className="oracle-step-head">
            <span className="oracle-step-title">{t("2. Task Type")}</span>
            <span className="oracle-step-hint">
              {t("决定默认工作流与 Stage 1 对齐策略")}
            </span>
          </div>
          <div className="seg-group" role="group" aria-label={t("Task Type")}>
            {TASK_TYPE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className="seg-option"
                data-task-type={option.id}
                aria-pressed={form.taskType === option.id ? "true" : "false"}
                onClick={() => set({ taskType: option.id })}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="oracle-workflow-summary" id="new-run-workflow-meta">
            {form.workflow ? t("Workflow override:") : t("Auto workflow:")}{" "}
            <strong>{effectiveWorkflowName}</strong>
            {` · ${workflowWriteNote}`}
            {workflowSummaryText ? ` — ${workflowSummaryText}` : ""}
          </p>
        </section>

        <section className="oracle-step" aria-label={t("Step 3: Intent")}>
          <div className="oracle-step-head">
            <span className="oracle-step-title">{t("3. Intent")}</span>
            <span className="oracle-step-hint">
              {t("描述目标、可观察面与约束，或导入本地文档")}
            </span>
          </div>
          <div className="form-field">
            <label className="dialog-label" htmlFor="new-run-title">
              {t("标题（可选）")}
            </label>
            <input
              id="new-run-title"
              className="field"
              type="text"
              placeholder={t("例如：Fix hooks write_scope bypass")}
              value={form.title}
              onChange={(event) => set({ title: event.target.value })}
            />
          </div>
          <div className="form-field">
            <label className="dialog-label" htmlFor="new-run-input">
              {t("需求原文")}
            </label>
            <textarea
              id="new-run-input"
              className="field"
              rows={5}
              placeholder={t("描述目标、可观察面、范围与约束…")}
              value={form.input}
              onChange={(event) => set({ input: event.target.value })}
            />
          </div>
          <div className="dialog-file-row">
            <button
              type="button"
              className="btn"
              id="btn-new-run-file"
              onClick={() => fileInput.current?.click()}
            >
              {t("导入本地文件")}
            </button>
            <input
              type="file"
              id="new-run-file"
              accept=".md,.txt,.json,.yaml,.yml"
              hidden
              ref={fileInput}
              onChange={onFile}
            />
            <span className="card-note" id="new-run-file-note">
              {t(fileNote.key, fileNote.vars)}
            </span>
          </div>
        </section>

        <div className="dialog-disclosures">
          <details className="dialog-disclosure" id="new-run-advanced">
            <summary>{t("Advanced Runtime Overrides")}</summary>
            <div className="dialog-disclosure-body">
              <div className="form-grid">
                <div className="form-field">
                  <label className="dialog-label" htmlFor="new-run-workflow">
                    {t("工作流覆盖")}
                  </label>
                  <select
                    id="new-run-workflow"
                    className="field"
                    value={form.workflow}
                    onChange={(event) => set({ workflow: event.target.value })}
                  >
                    <option value="">{t("Auto ({name})", { name: autoWorkflow })}</option>
                    {workflows.map((workflow) => (
                      <option value={workflow.name} key={workflow.name}>
                        {WORKFLOW_SELECT_LABELS[workflow.name] ||
                          `${workflow.name} · ${workflow.topology || "topology"}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="dialog-label" htmlFor="new-run-provider">
                    {t("模型提供方")}
                  </label>
                  <select
                    id="new-run-provider"
                    className="field"
                    value={form.provider}
                    onChange={(event) => set({ provider: event.target.value })}
                  >
                    {options ? (
                      <>
                        <option value="auto">{t("auto · 自动选择已配置提供方")}</option>
                        {providers.map((provider) => (
                          <option value={provider.id} key={provider.id}>
                            {`${provider.id} ${
                              provider.configured ? t("(已配置)") : t("(未配置->Mock)")
                            }`}
                          </option>
                        ))}
                        <option value="mock">{t("mock · 确定性模拟")}</option>
                      </>
                    ) : null}
                  </select>
                </div>
                <div className="form-field">
                  <label className="dialog-label" htmlFor="new-run-model">
                    {t("模型（可选）")}
                  </label>
                  <input
                    id="new-run-model"
                    className="field"
                    type="text"
                    placeholder={t("留空使用提供方默认模型")}
                    value={form.model}
                    onChange={(event) => set({ model: event.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label className="dialog-label" htmlFor="new-run-worker-driver">
                    {t("执行驱动（可选）")}
                  </label>
                  <input
                    id="new-run-worker-driver"
                    className="field"
                    type="text"
                    placeholder={t("留空使用环境配置")}
                    value={form.workerDriver}
                    onChange={(event) => set({ workerDriver: event.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label className="dialog-label" htmlFor="new-run-reviewer-driver">
                    {t("审查驱动（可选）")}
                  </label>
                  <input
                    id="new-run-reviewer-driver"
                    className="field"
                    type="text"
                    placeholder={t("留空使用环境配置")}
                    value={form.reviewerDriver}
                    onChange={(event) => set({ reviewerDriver: event.target.value })}
                  />
                </div>
              </div>
            </div>
          </details>

          <details className="dialog-disclosure" id="new-run-benchmark-disclosure">
            <summary>{t("Load Benchmark Sample")}</summary>
            <div className="dialog-disclosure-body">
              <div className="form-field">
                <label className="dialog-label" htmlFor="new-run-demo">
                  {t("Benchmark 预设样本（可选）")}
                </label>
                <select
                  id="new-run-demo"
                  className="field"
                  value={form.demoId}
                  onChange={(event) => applyDemo(event.target.value)}
                >
                  {options ? <option value="">{t("无（使用上方自定义作用域）")}</option> : null}
                  {demos.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.label || item.title || item.id}
                    </option>
                  ))}
                </select>
              </div>
              <p className="dialog-desc" id="new-run-demo-note" hidden={!demoNote}>
                {demoNote}
              </p>
            </div>
          </details>
        </div>

        {error ? (
          <p className="dialog-error" id="new-run-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="dialog-actions">
          <button type="button" className="btn btn-quiet" onClick={closeDialog}>
            {t("取消")}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            id="new-run-submit"
            disabled={state.submitting}
          >
            {state.submitting ? t("正在提交…") : t("Issue Oracle · 创建并启动")}
          </button>
        </div>
      </form>
    </NativeDialog>
  );
}

export function HitlDialog({ workbench, state }: { workbench: Workbench; state: WorkbenchState }) {
  const t = useT();
  const config = state.dialog;
  return (
    <NativeDialog
      id="hitl-dialog"
      labelledBy="hitl-dialog-title"
      lightDismissFallback
      onClose={(choice) => void workbench.closeDialog(choice)}
    >
      <form method="dialog" id="hitl-dialog-form">
        <h2 className="dialog-title" id="hitl-dialog-title">
          {config?.title || t("人工关口操作")}
        </h2>
        <p className="dialog-desc" id="hitl-dialog-desc">
          {config?.description || ""}
        </p>
        <label className="dialog-label" htmlFor="hitl-dialog-input" id="hitl-dialog-label">
          {config?.label || t("补充说明")}
        </label>
        <textarea
          id="hitl-dialog-input"
          className="field"
          rows={3}
          placeholder={t("请输入提示或风险接受理由…")}
        />
        <div className="dialog-actions">
          <button type="submit" className="btn btn-quiet" value="cancel">
            {t("取消")}
          </button>
          <button type="submit" className="btn btn-primary" id="hitl-dialog-submit" value="confirm">
            {t("确认提交")}
          </button>
        </div>
      </form>
    </NativeDialog>
  );
}

export function Toast({ state }: { state: WorkbenchState }) {
  const t = useT();
  return (
    <div className="toast" id="toast-bar" role="status" aria-live="polite" hidden={!state.toast.visible}>
      {t(state.toast.message)}
    </div>
  );
}
