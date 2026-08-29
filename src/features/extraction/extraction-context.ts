import type {
  ExtractionSourceRecord,
  SourceSystemPatient,
} from "./types";

function recordDateInShanghai(recordedAt: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(recordedAt));
}

export function buildExtractionContext(
  patient: SourceSystemPatient,
  records: ExtractionSourceRecord[],
) {
  const dates = records.map((record) => recordDateInShanghai(record.recordedAt));
  const latestDate = dates.sort().at(-1) ?? null;

  return {
    attention_window: "当前交班至次日早晨，仅限本夜病情观察",
    patient_stage: patient.stageLabel,
    admission_record_ids: records
      .filter((record) => record.label.includes("入院记录"))
      .map((record) => record.id),
    latest_record_date: latestDate,
    latest_date_record_ids: records
      .filter(
        (record) =>
          latestDate !== null &&
          recordDateInShanghai(record.recordedAt) === latestDate,
      )
      .map((record) => record.id),
    preoperative_record_ids: records
      .filter((record) => /术前小结|术前讨论/.test(record.label))
      .map((record) => record.id),
  };
}
