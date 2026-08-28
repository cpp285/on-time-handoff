import { randomUUID } from "node:crypto";
import { ZodError } from "zod";

import type { AppErrorPayload } from "@/features/handoff/types";

export function jsonError(
  code: string,
  message: string,
  status: number,
  retryable = false,
  requestId = randomUUID(),
) {
  const payload: AppErrorPayload = {
    error: { code, message, retryable, requestId },
  };
  return Response.json(payload, { status });
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new Error("INVALID_JSON");
  }
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError("VALIDATION_ERROR", "提交内容不完整，请检查后重试。", 400);
  }
  if (error instanceof Error && error.message === "INVALID_JSON") {
    return jsonError("INVALID_JSON", "请求内容不是有效的 JSON。", 400);
  }
  console.error("Route handler failed", error);
  return jsonError("INTERNAL_ERROR", "系统暂时无法完成操作，请稍后重试。", 500, true);
}
