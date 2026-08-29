import type {
  AppErrorPayload,
  ExtractionResult,
  ExtractionSourceRecord,
  SourceSystemChart,
} from "../types";

class ExtractionApiError extends Error {
  constructor(payload: AppErrorPayload["error"]) {
    super(payload.message);
    this.name = "ExtractionApiError";
  }
}

function extractionRecords(chart: SourceSystemChart): ExtractionSourceRecord[] {
  const documentRecords = chart.documents
    .filter(
      (document) =>
        document.status !== "not_started" && document.content.trim().length > 0,
    )
    .map((document) => ({
      id: `document-${document.key}`,
      type: "progress_note" as const,
      label: document.title,
      recordedAt: document.recordedAt ?? chart.patient.updatedAt,
      content: document.content.trim(),
    }));
  const documentLabels = new Set(
    documentRecords.map((record) => record.label.trim()),
  );
  const clinicianAuthoredRecords = chart.records.filter(
    (record) =>
      record.type === "progress_note" &&
      !documentLabels.has(record.label.trim()),
  );
  return [...clinicianAuthoredRecords, ...documentRecords];
}

export async function generateHandoffCard(chart: SourceSystemChart) {
  const response = await fetch("/api/extractions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      patientId: chart.patient.id,
      templateId: "omfs_handoff_v1",
      sourceMode: "hospital_simulator",
      patient: chart.patient,
      sourceRecords: extractionRecords(chart),
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
