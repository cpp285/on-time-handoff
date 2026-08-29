export type ExtractionFieldKey =
  | "current_condition"
  | "attention";

export type SourceRecordType =
  | "patient_master"
  | "progress_note"
  | "order"
  | "lab"
  | "exam";

export interface SourceSystemPatient {
  id: string;
  encounterId: string;
  wardOrder: number;
  bedNo: string;
  name: string;
  gender: "男" | "女";
  age: number;
  diagnosis: string;
  stageLabel: string;
  admissionDate: string;
  currentSituation: string;
  updatedAt: string;
  sourceCounts: {
    records: number;
    orders: number;
    reports: number;
  };
}

export type MedicalDocumentTemplateKey =
  | "admission_record"
  | "first_progress"
  | "routine_progress"
  | "preoperative_summary"
  | "preoperative_discussion"
  | "operation_record"
  | "first_postoperative_progress"
  | "postoperative_progress"
  | "pathology_progress"
  | "discharge_record";

export type MedicalDocumentKey = string;

export interface MedicalDocument {
  key: MedicalDocumentKey;
  templateKey: MedicalDocumentTemplateKey;
  title: string;
  status: "completed" | "current" | "not_started";
  recordedAt: string | null;
  author: string | null;
  content: string;
}

export interface ExtractionSourceRecord {
  id: string;
  type: SourceRecordType;
  label: string;
  recordedAt: string;
  content: string;
}

export interface SourceSystemChart {
  patient: SourceSystemPatient;
  records: ExtractionSourceRecord[];
  documents: MedicalDocument[];
}

export interface FieldEvidence {
  sourceRecordId: string;
  quote: string;
}

export interface ExtractionField {
  key: ExtractionFieldKey;
  label: string;
  value: string;
  evidence: FieldEvidence[];
}

export interface ExtractionResult {
  extractionId: string;
  patient: SourceSystemPatient;
  fields: ExtractionField[];
  sourceRecords: ExtractionSourceRecord[];
  templateName: string;
  importedAt: string;
  modelName: string;
  mode: "deepseek" | "demo" | "demo_fallback";
}

export interface AppErrorPayload {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    requestId?: string;
  };
}
