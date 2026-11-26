import { useState, type FormEvent } from "react";

import { localized, useT } from "../i18n";
import { deriveCloneFolderName, joinDirPath } from "../lib/paths";
import type { Workbench, WorkbenchState } from "../state/workbench";
import { NativeDialog } from "./Dialogs";
import { DirectoryPicker } from "./DirectoryPicker";

type AddWorkspaceMode = "open" | "new" | "clone";

const MODE_TABS: { id: AddWorkspaceMode; label: string; hint: string }[] = localized([
  { id: "open", label: "Open Folder", hint: "Register existing directory" },
  { id: "new", label: "New Project", hint: "Create empty folder" },
  { id: "clone", label: "Clone Git URL", hint: "Clone remote repo" },
]);

export function WorkspaceDialog({
  workbench,
  state,
}: {
  workbench: Workbench;
  state: WorkbenchState;
}) {
  const t = useT();
  const [mode, setMode] = useState<AddWorkspaceMode>("open");
  const [rootPath, setRootPath] = useState("");
  const [name, setName] = useState("");

  const [newParentDir, setNewParentDir] = useState("");
  const [newParentTouched, setNewParentTouched] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newInitGit, setNewInitGit] = useState(true);

  const [cloneUrl, setCloneUrl] = useState("");
  const [cloneParentDir, setCloneParentDir] = useState("");
  const [cloneParentTouched, setCloneParentTouched] = useState(false);
  const [cloneFolder, setCloneFolder] = useState("");
  const [cloneFolderEdited, setCloneFolderEdited] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localRefreshSeq, setLocalRefreshSeq] = useState(0);

  const pickerRefreshKey = `${state.workspaceDialogOpenSeq}:${localRefreshSeq}:${state.workspaces
    .map((ws) => ws.workspace_id)
    .join(",")}`;

  const closeDialog = () => {
    const dialog = document.getElementById("workspace-manager-dialog") as HTMLDialogElement | null;
    if (dialog?.open) dialog.close();
  };

  const switchMode = (nextMode: AddWorkspaceMode) => {
    setMode(nextMode);
    setError(null);
  };

  const handleOpenFolder = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedPath = rootPath.trim();
    if (!trimmedPath) {
      setError(t("请填写或选择本地仓库目录路径"));
      return;
    }
    setBusy(true);
    setError(null);
    const result = await workbench.registerWorkspace({
      root_path: trimmedPath,
      name: name.trim() || null,
      create_if_missing: false,
      init_git: false,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRootPath("");
    setName("");
    setLocalRefreshSeq((seq) => seq + 1);
  };

  const composedNewPath = joinDirPath(newParentDir, newFolderName);

  const handleCreateProject = async (event: FormEvent) => {
    event.preventDefault();
    const parent = newParentDir.trim();
    const folder = newFolderName.trim();
    if (!parent) {
      setError(t("请选择新建项目的父目录"));
      return;
    }
    if (!folder) {
      setError(t("请填写新项目文件夹名称"));
      return;
    }
    if (folder === "." || folder === ".." || folder.includes("/") || folder.includes("\\")) {
      setError(t("项目文件夹名称不能包含路径分隔符或相对路径片段"));
      return;
    }
    const targetPath = joinDirPath(parent, folder);
    setBusy(true);
    setError(null);
    const result = await workbench.registerWorkspace({
      root_path: targetPath,
      name: newDisplayName.trim() || folder,
      create_if_missing: true,
      init_git: newInitGit,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNewFolderName("");
    setNewDisplayName("");
    setLocalRefreshSeq((seq) => seq + 1);
  };

  const effectiveCloneFolder = cloneFolder.trim() || deriveCloneFolderName(cloneUrl);
  const composedClonePath = joinDirPath(cloneParentDir, effectiveCloneFolder);

  const handleClone = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedUrl = cloneUrl.trim();
    const trimmedParent = cloneParentDir.trim();
    if (!trimmedUrl) {
      setError(t("请填写 Git 仓库地址或 owner/repo 简写"));
      return;
    }
    if (!trimmedParent) {
      setError(t("请选择克隆目标父目录"));
      return;
    }
    setBusy(true);
    setError(null);
    const result = await workbench.cloneWorkspace({
      remote_url: trimmedUrl,
      parent_dir: trimmedParent,
      folder_name: cloneFolderEdited && cloneFolder.trim() ? cloneFolder.trim() : null,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCloneUrl("");
    setCloneFolder("");
    setCloneFolderEdited(false);
    setLocalRefreshSeq((seq) => seq + 1);
  };

  const handleUnregister = async (workspaceId: string) => {
    setBusy(true);
    setError(null);
    await workbench.unregisterWorkspace(workspaceId);
    setBusy(false);
    setLocalRefreshSeq((seq) => seq + 1);
  };

  return (
    <NativeDialog
      id="workspace-manager-dialog"
      labelledBy="workspace-dialog-title"
      lightDismissFallback
      onClose={() => setError(null)}
    >
      <div className="workspace-dialog-body">
        <div className="workspace-dialog-head">
          <h2 className="dialog-title" id="workspace-dialog-title">
            {t("Workspaces")}
          </h2>
          <button
            type="button"
            className="btn btn-quiet"
            aria-label={t("关闭工作区管理")}
            onClick={closeDialog}
          >
            ×
          </button>
        </div>
        <p className="dialog-desc">
          {t(
            "注册本地仓库作为项目工作区以筛选 Oracle Board。移除注册仅清理索引条目，绝不会删除磁盘文件或历史编排记录。",
          )}
        </p>

        <section className="workspace-section" aria-label={t("已注册工作区")}>
          <p className="dialog-label">
            {t("Registered Workspaces ({count})", { count: state.workspaces.length })}
          </p>
          <ul className="workspace-list scroller" id="workspace-list">
            {state.workspaces.length ? (
              state.workspaces.map((ws) => {
                const isSelected = state.selectedWorkspaceId === ws.workspace_id;
                const total = ws.active_oracle_count + ws.pending_ruling_count;
                return (
                  <li
                    className="workspace-row"
                    key={ws.workspace_id}
                    data-workspace-id={ws.workspace_id}
                    data-selected={isSelected ? "true" : "false"}
                  >
                    <div className="workspace-row-main">
                      <div className="workspace-row-title">
                        <span className="workspace-name">{ws.name}</span>
                        <span className="badge" data-variant="muted">
                          {ws.is_git_repo
                            ? ws.default_branch
                              ? `git · ${ws.default_branch}`
                              : "git"
                            : "local"}
                        </span>
                        {ws.pending_ruling_count > 0 ? (
                          <span className="badge" data-variant="warn">
                            {t("{count} ruling", { count: ws.pending_ruling_count })}
                          </span>
                        ) : null}
                        {total > 0 ? (
                          <span className="badge" data-variant="live">
                            {t("{count} active", { count: total })}
                          </span>
                        ) : null}
                      </div>
                      <p className="workspace-path mono">{ws.root_path}</p>
                    </div>
                    <div className="workspace-row-actions">
                      <button
                        type="button"
                        className="btn btn-quiet"
                        data-workspace-select={ws.workspace_id}
                        disabled={isSelected}
                        onClick={() => {
                          workbench.selectWorkspace(ws.workspace_id);
                          closeDialog();
                        }}
                      >
                        {isSelected ? t("Current") : t("Switch")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        data-workspace-remove={ws.workspace_id}
                        disabled={busy}
                        onClick={() => void handleUnregister(ws.workspace_id)}
                      >
                        {t("Unregister")}
                      </button>
                    </div>
                  </li>
                );
              })
            ) : (
              <li className="workspace-empty">{t("尚未注册工作区")}</li>
            )}
          </ul>
        </section>

        <section className="workspace-add-section" aria-label={t("Add Workspace")}>
          <p className="dialog-label">{t("Add Workspace")}</p>
          <div
            className="seg-group workspace-mode-tabs"
            role="group"
            aria-label={t("Add Workspace Mode")}
          >
            {MODE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className="seg-option"
                data-workspace-tab={tab.id}
                aria-pressed={mode === tab.id ? "true" : "false"}
                disabled={busy}
                onClick={() => switchMode(tab.id)}
              >
                <span>{tab.label}</span>
                <span className="seg-option-sub">{tab.hint}</span>
              </button>
            ))}
          </div>

          {mode === "open" ? (
            <form
              className="workspace-register-form"
              id="workspace-register-form"
              onSubmit={(e) => void handleOpenFolder(e)}
            >
              <div className="form-field">
                <label className="dialog-label" htmlFor="workspace-root-input">
                  {t("Directory Path")}
                </label>
                <DirectoryPicker
                  idPrefix="workspace-open"
                  inputId="workspace-root-input"
                  value={rootPath}
                  onChange={(next) => {
                    setRootPath(next);
                    setError(null);
                  }}
                  placeholder="/path/to/repository"
                  disabled={busy}
                  mode="select_folder"
                  refreshKey={pickerRefreshKey}
                />
              </div>
              <div className="form-field">
                <label className="dialog-label" htmlFor="workspace-name-input">
                  {t("Display Name (optional)")}
                </label>
                <input
                  id="workspace-name-input"
                  className="field"
                  type="text"
                  placeholder={t("Defaults to folder name")}
                  value={name}
                  disabled={busy}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              {error ? (
                <p className="notice" data-level="bad" id="workspace-dialog-error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="dialog-actions">
                <button type="button" className="btn btn-quiet" onClick={closeDialog}>
                  {t("Done")}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  id="btn-register-workspace"
                  disabled={busy}
                >
                  {busy ? t("Registering…") : t("Register Workspace")}
                </button>
              </div>
            </form>
          ) : null}

          {mode === "new" ? (
            <form
              className="workspace-register-form"
              id="workspace-new-form"
              onSubmit={(e) => void handleCreateProject(e)}
            >
              <div className="form-field">
                <label className="dialog-label" htmlFor="workspace-new-parent-input">
                  {t("Parent Directory")}
                </label>
                <DirectoryPicker
                  idPrefix="workspace-new-parent"
                  inputId="workspace-new-parent-input"
                  value={newParentDir}
                  onChange={(next) => {
                    setNewParentTouched(true);
                    setNewParentDir(next);
                    setError(null);
                  }}
                  onDefaultRoot={(root) => {
                    if (!newParentTouched) setNewParentDir(root);
                  }}
                  placeholder="/path/to/projects"
                  disabled={busy}
                  mode="select_parent"
                  refreshKey={pickerRefreshKey}
                />
              </div>
              <div className="form-grid">
                <div className="form-field">
                  <label className="dialog-label" htmlFor="workspace-new-folder">
                    {t("Short Project Name")}
                  </label>
                  <input
                    id="workspace-new-folder"
                    className="field mono"
                    type="text"
                    placeholder={t("e.g. voice-cli")}
                    value={newFolderName}
                    disabled={busy}
                    onChange={(event) => {
                      setNewFolderName(event.target.value);
                      setError(null);
                    }}
                  />
                </div>
                <div className="form-field">
                  <label className="dialog-label" htmlFor="workspace-new-display-name">
                    {t("Display Name (optional)")}
                  </label>
                  <input
                    id="workspace-new-display-name"
                    className="field"
                    type="text"
                    placeholder={t("Defaults to folder name")}
                    value={newDisplayName}
                    disabled={busy}
                    onChange={(event) => setNewDisplayName(event.target.value)}
                  />
                </div>
              </div>
              <div className="workspace-checkbox-row">
                <label className="workspace-check">
                  <input
                    id="workspace-new-init-git"
                    type="checkbox"
                    checked={newInitGit}
                    disabled={busy}
                    onChange={(event) => setNewInitGit(event.target.checked)}
                  />
                  <span>{t("Initialize Git repo (git init)")}</span>
                </label>
              </div>
              <p className="workspace-path-preview mono" id="workspace-new-preview">
                {composedNewPath ? (
                  <>
                    {t("Creates")} <strong>{composedNewPath}</strong>
                  </>
                ) : (
                  t("Select a parent directory and enter a short project name")
                )}
              </p>
              {error ? (
                <p className="notice" data-level="bad" id="workspace-dialog-error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="dialog-actions">
                <button type="button" className="btn btn-quiet" onClick={closeDialog}>
                  {t("Done")}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  id="btn-create-workspace"
                  disabled={busy}
                >
                  {busy ? t("Creating…") : t("Create Project")}
                </button>
              </div>
            </form>
          ) : null}

          {mode === "clone" ? (
            <form
              className="workspace-register-form"
              id="workspace-clone-form"
              onSubmit={(e) => void handleClone(e)}
            >
              <div className="form-grid">
                <div className="form-field">
                  <label className="dialog-label" htmlFor="workspace-clone-url">
                    {t("Git Remote URL or owner/repo")}
                  </label>
                  <input
                    id="workspace-clone-url"
                    className="field mono"
                    type="text"
                    placeholder={t("https://github.com/owner/repo.git or owner/repo")}
                    value={cloneUrl}
                    disabled={busy}
                    onChange={(event) => {
                      const nextUrl = event.target.value;
                      setCloneUrl(nextUrl);
                      setError(null);
                      if (!cloneFolderEdited) {
                        setCloneFolder(deriveCloneFolderName(nextUrl));
                      }
                    }}
                  />
                </div>
                <div className="form-field">
                  <label className="dialog-label" htmlFor="workspace-clone-folder">
                    {t("Target Folder Name")}
                  </label>
                  <input
                    id="workspace-clone-folder"
                    className="field mono"
                    type="text"
                    placeholder={t("Auto-derived from URL")}
                    value={cloneFolder}
                    disabled={busy}
                    onChange={(event) => {
                      const nextFolder = event.target.value;
                      setCloneFolder(nextFolder);
                      setCloneFolderEdited(nextFolder.trim().length > 0);
                      setError(null);
                    }}
                  />
                </div>
              </div>
              <div className="form-field">
                <label className="dialog-label" htmlFor="workspace-clone-parent-input">
                  {t("Clone Into Parent Directory")}
                </label>
                <DirectoryPicker
                  idPrefix="workspace-clone-parent"
                  inputId="workspace-clone-parent-input"
                  value={cloneParentDir}
                  onChange={(next) => {
                    setCloneParentTouched(true);
                    setCloneParentDir(next);
                    setError(null);
                  }}
                  onDefaultRoot={(root) => {
                    if (!cloneParentTouched) setCloneParentDir(root);
                  }}
                  placeholder="/path/to/projects"
                  disabled={busy}
                  mode="select_parent"
                  refreshKey={pickerRefreshKey}
                />
              </div>
              <p className="workspace-path-preview mono" id="workspace-clone-preview">
                {composedClonePath ? (
                  <>
                    {t("Clones into")} <strong>{composedClonePath}</strong>
                  </>
                ) : (
                  t("Enter a remote Git URL or owner/repo and select a parent directory")
                )}
              </p>
              {error ? (
                <p className="notice" data-level="bad" id="workspace-dialog-error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="dialog-actions">
                <button type="button" className="btn btn-quiet" onClick={closeDialog}>
                  {t("Done")}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  id="btn-clone-workspace"
                  disabled={busy}
                >
                  {busy ? t("Cloning…") : t("Clone & Register")}
                </button>
              </div>
            </form>
          ) : null}
        </section>
      </div>
    </NativeDialog>
  );
}
