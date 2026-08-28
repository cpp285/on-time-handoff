import type {
  AppErrorPayload,
  BoardData,
  GenerationJob,
  HandoffDetail,
  ImportBatchSummary,
  ImportSourceMode,
  PendingTaskView,
} from "../types";

class HandoffApiError extends Error {
  code: string;
  retryable: boolean;
  requestId?: string;

  constructor(payload: AppErrorPayload["error"]) {
    super(payload.message);
    this.name = "HandoffApiError";
    this.code = payload.code;
    this.retryable = payload.retryable;
    this.requestId = payload.requestId;
  }
}

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const payload = (await response.json()) as
    | { data: T }
    | AppErrorPayload;
  if (!response.ok || "error" in payload) {
    const error =
      "error" in payload
        ? payload.error
        : {
            code: "UNKNOWN_ERROR",
            message: "系统返回了无法识别的错误。",
            retryable: false,
          };
    throw new HandoffApiError(error);
  }
  return payload.data;
}

export function fetchBoard(wardId: string) {
  return apiRequest<BoardData>(`/api/wards/${wardId}/board`);
}

export function fetchHandoff(handoffId: string) {
  return apiRequest<HandoffDetail>(`/api/handoffs/${handoffId}`);
}

export function createGenerationJob(shiftId: string) {
  return apiRequest<GenerationJob>(
    `/api/shifts/${shiftId}/generation-jobs`,
    {
      method: "POST",
      body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
    },
  );
}

export function fetchGenerationJob(jobId: string) {
  return apiRequest<GenerationJob>(`/api/generation-jobs/${jobId}`);
}

export function importShiftData(
  shiftId: string,
  input: { sourceMode: ImportSourceMode; fileName?: string | null },
) {
  return apiRequest<ImportBatchSummary>(`/api/shifts/${shiftId}/imports`, {
    method: "POST",
    body: JSON.stringify({
      ...input,
      idempotencyKey: crypto.randomUUID(),
    }),
  });
}

export function saveHandoff(
  handoffId: string,
  input: {
    conditionSummary: string;
    items: Array<{ id: string; content: string }>;
  },
) {
  return apiRequest<HandoffDetail>(`/api/handoffs/${handoffId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function confirmHandoff(handoffId: string, actor: string) {
  return apiRequest<HandoffDetail>(`/api/handoffs/${handoffId}/confirm`, {
    method: "POST",
    body: JSON.stringify({ actor, idempotencyKey: crypto.randomUUID() }),
  });
}

export function receiveHandoff(handoffId: string, actor: string) {
  return apiRequest<HandoffDetail>(`/api/handoffs/${handoffId}/receive`, {
    method: "POST",
    body: JSON.stringify({ actor, idempotencyKey: crypto.randomUUID() }),
  });
}

export function addSupplement(
  handoffId: string,
  content: string,
  actor: string,
) {
  return apiRequest<HandoffDetail>(
    `/api/handoffs/${handoffId}/supplements`,
    {
      method: "POST",
      body: JSON.stringify({ content, actor }),
    },
  );
}

export function updatePendingTask(
  taskId: string,
  status: PendingTaskView["status"],
) {
  return apiRequest<PendingTaskView[]>(`/api/pending-tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "操作没有完成，请稍后重试。";
}
