import type { AppErrorPayload, ExtractionResult } from "../types";

class ExtractionApiError extends Error {
  constructor(payload: AppErrorPayload["error"]) {
    super(payload.message);
    this.name = "ExtractionApiError";
  }
}

export async function generateHandoffCard(patientId: string) {
  const response = await fetch("/api/extractions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      patientId,
      templateId: "general_ward",
      sourceMode: "hospital_simulator",
    }),
  });
  const payload = (await response.json()) as
    | { data: ExtractionResult }
    | AppErrorPayload;

  if (!response.ok || "error" in payload) {
    throw new ExtractionApiError(
      "error" in payload
        ? payload.error
        : {
            code: "UNKNOWN_ERROR",
            message: "交班卡生成失败，请稍后重试。",
            retryable: true,
          },
    );
  }
  return payload.data;
}
