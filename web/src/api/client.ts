import type {
  AttemptArtifactsResponse,
  BallHolder,
  CloneWorkspaceBody,
  CommandBody,
  CommandResponse,
  ConflictResponse,
  CreateRunBody,
  CreateRunResponse,
  CreateWorkspaceBody,
  DeleteWorkspaceResponse,
  DemosResponse,
  ErrorResponse,
  FilesystemBrowseResponse,
  ProvidersResponse,
  RecordedAttemptArtifacts,
  RunListResponse,
  RunProjection,
  RunProjectionResponse,
  TaskType,
  WorkflowsResponse,
  WorkspaceListResponse,
  WorkspaceMode,
  WorkspaceResponse,
} from "./types";

import { tr } from "../i18n/translate";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const runPath = (runId: string): string => `/api/runs/${encodeURIComponent(runId)}`;

export const streamUrl = (runId: string, afterSeq: number): string =>
  `${runPath(runId)}/stream?after_seq=${afterSeq}`;

export const boardStreamUrl = (workspaceId?: string | null): string =>
  workspaceId
    ? `/api/board/stream?workspace_id=${encodeURIComponent(workspaceId)}`
    : "/api/board/stream";

export const deliveryLogUrl = (runId: string, eventSeq: number, position: number): string =>
  `${runPath(runId)}/delivery-log/${eventSeq}/${position}`;

export type ProductArtifactKind = "report" | "boot_log" | "screenshot";

export const productArtifactUrl = (
  runId: string,
  kind: ProductArtifactKind,
  version?: number | string | null,
  sha?: string | null,
): string => {
  const base = `${runPath(runId)}/product-artifact/${kind}`;
  const params = new URLSearchParams();
  if (version != null && version !== "") params.set("v", String(version));
  if (sha) params.set("sha", sha);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
};

export async function fetchProductArtifactText(
  runId: string,
  kind: "report" | "boot_log",
  version?: number | string | null,
): Promise<string> {
  const response = await fetch(productArtifactUrl(runId, kind, version), { cache: "no-store" });
  if (!response.ok) {
    throw new ApiError(tr("读取实机验证产物失败"), response.status);
  }
  return response.text();
}

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export interface ListRunsParams {
  workspaceId?: string | null;
  workspaceMode?: WorkspaceMode | null;
  taskType?: TaskType | null;
  ballHolder?: BallHolder | null;
  includeArchived?: boolean;
  limit?: number;
}

export async function listRuns(params: ListRunsParams = {}): Promise<RunListResponse> {
  const query = new URLSearchParams();
  if (params.workspaceId) query.set("workspace_id", params.workspaceId);
  if (params.workspaceMode) query.set("workspace_mode", params.workspaceMode);
  if (params.taskType) query.set("task_type", params.taskType);
  if (params.ballHolder) query.set("ball_holder", params.ballHolder);
  if (params.includeArchived) query.set("include_archived", "true");
  if (params.limit != null) query.set("limit", String(params.limit));
  const qs = query.toString();
  const response = await fetch(qs ? `/api/runs?${qs}` : "/api/runs", { cache: "no-store" });
  return json<RunListResponse>(response);
}

export async function listWorkspaces(): Promise<WorkspaceListResponse> {
  const response = await fetch("/api/workspaces", { cache: "no-store" });
  return json<WorkspaceListResponse>(response);
}

export async function createWorkspace(body: CreateWorkspaceBody): Promise<WorkspaceResponse> {
  const response = await fetch("/api/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await json<WorkspaceResponse | ErrorResponse>(response);
  if (!response.ok || !data.ok) {
    throw new ApiError((!data.ok && data.error) || tr("注册工作区失败"), response.status);
  }
  return data;
}

export async function cloneWorkspace(body: CloneWorkspaceBody): Promise<WorkspaceResponse> {
  const response = await fetch("/api/workspaces/clone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await json<WorkspaceResponse | ErrorResponse>(response);
  if (!response.ok || !data.ok) {
    throw new ApiError((!data.ok && data.error) || tr("克隆工作区失败"), response.status);
  }
  return data;
}

export async function browseFilesystem(
  partialPath?: string,
  showHidden?: boolean,
): Promise<FilesystemBrowseResponse> {
  const query = new URLSearchParams();
  if (partialPath && partialPath.trim()) query.set("partial_path", partialPath);
  if (showHidden) query.set("show_hidden", "true");
  const qs = query.toString();
  const response = await fetch(qs ? `/api/filesystem/browse?${qs}` : "/api/filesystem/browse", {
    cache: "no-store",
  });
  const data = await json<FilesystemBrowseResponse | ErrorResponse>(response);
  if (!response.ok || !data.ok) {
    throw new ApiError((!data.ok && data.error) || tr("浏览目录失败"), response.status);
  }
  return data;
}

export async function deleteWorkspace(workspaceId: string): Promise<DeleteWorkspaceResponse> {
  const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}`, {
    method: "DELETE",
  });
  const data = await json<DeleteWorkspaceResponse | ErrorResponse>(response);
  if (!response.ok || !data.ok) {
    throw new ApiError((!data.ok && data.error) || tr("移除工作区失败"), response.status);
  }
  return data;
}

export async function seedDemo(): Promise<void> {
  await fetch("/api/seed-demo", { method: "POST", body: "{}" });
}

export async function fetchSnapshot(runId: string): Promise<RunProjection> {
  const response = await fetch(runPath(runId), { cache: "no-store" });
  const data = await json<RunProjectionResponse | ErrorResponse>(response);
  if (!response.ok || !data.ok || data.projection.run_id !== runId) {
    throw new ApiError((!data.ok && data.error) || tr("加载运行快照失败"), response.status);
  }
  return data.projection;
}

export async function createRun(body: CreateRunBody): Promise<CreateRunResponse> {
  const response = await fetch("/api/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await json<CreateRunResponse | ErrorResponse>(response);
  if (!data.ok || !data.run_id) throw new ApiError(data.error || tr("未知错误"), response.status);
  return data;
}

export type CommandOutcome =
  | { kind: "applied"; projection: RunProjection }
  | { kind: "conflict"; projection: RunProjection | null }
  | { kind: "rejected"; error: string };

export async function postCommand(runId: string, body: CommandBody): Promise<CommandOutcome> {
  const response = await fetch(`${runPath(runId)}/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await json<CommandResponse | ConflictResponse | ErrorResponse>(response);
  if (data.ok) return { kind: "applied", projection: data.projection };
  if (response.status === 409 || "conflict" in data) {
    let fresh = "projection" in data ? data.projection ?? null : null;
    if (!fresh) {
      try {
        const latest = await json<RunProjectionResponse | ErrorResponse>(await fetch(runPath(runId)));
        if (latest.ok) fresh = latest.projection;
      } catch {
        fresh = null;
      }
    }
    return { kind: "conflict", projection: fresh };
  }
  return { kind: "rejected", error: data.error || tr("未知错误") };
}

export interface WorkbenchOptions {
  workflows: WorkflowsResponse["workflows"];
  defaultWorkflows: Record<string, string>;
  providers: ProvidersResponse["providers"];
  demos: DemosResponse["demos"];
}

export async function runExists(runId: string): Promise<boolean> {
  try {
    const response = await fetch(runPath(runId));
    return response.status !== 404;
  } catch {
    return true;
  }
}

export async function fetchWorkbenchOptions(): Promise<WorkbenchOptions> {
  const [workflows, providers, demos] = await Promise.all([
    fetch("/api/workflows").then((response) => json<WorkflowsResponse>(response)),
    fetch("/api/providers").then((response) => json<ProvidersResponse>(response)),
    fetch("/api/demos").then((response) => json<DemosResponse>(response)),
  ]);
  return {
    workflows: workflows.workflows || [],
    defaultWorkflows: workflows.default_workflows || {},
    providers: providers.providers || [],
    demos: demos.demos || [],
  };
}

export async function fetchAttemptArtifacts(
  runId: string,
  taskId: string,
  attempt: number,
): Promise<RecordedAttemptArtifacts> {
  const url = `${runPath(runId)}/task-artifacts/${encodeURIComponent(taskId)}/${attempt}`;
  const response = await fetch(url);
  const data = await json<AttemptArtifactsResponse | ErrorResponse>(response);
  if (!response.ok || !data.ok) {
    throw new ApiError((!data.ok && data.error) || tr("读取执行产物失败"), response.status);
  }
  return data.artifacts;
}
