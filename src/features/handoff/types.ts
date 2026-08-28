export type HandoffStatus =
  | "not_generated"
  | "generating"
  | "needs_review"
  | "confirmed"
  | "handed_over"
  | "failed";

export type GenerationJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "partial_failed"
  | "failed";

export type HandoffCategory =
  | "shift_change"
  | "pending_task"
  | "attention"
  | "confirmation";

export type Acuity = "critical" | "watch" | "stable";

export type SourceRecordType =
  | "progress"
  | "order"
  | "lab"
  | "exam"
  | "doctor_note";

export interface ShiftInfo {
  id: string;
  date: string;
  type: "day" | "night";
  handoverToType: "day" | "night";
  startedAt: string;
  endedAt: string;
}

export interface GenerationJob {
  id: string;
  status: GenerationJobStatus;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  createdAt: string;
  finishedAt: string | null;
}

export interface PatientCard {
  id: string;
  handoffId: string;
  bedNo: string;
  displayName: string;
  age: number;
  gender: "男" | "女";
  diagnosis: string;
  acuity: Acuity;
  status: HandoffStatus;
  summary: string;
  importantChanges: string[];
  pendingCount: number;
  confirmationCount: number;
  sourceRecordCount: number;
}

export interface BoardData {
  ward: {
    id: string;
    name: string;
    department: string;
  };
  shift: ShiftInfo;
  stats: {
    total: number;
    needsAttention: number;
    pendingTasks: number;
    confirmed: number;
    handedOver: number;
  };
  patients: PatientCard[];
  activeJob: GenerationJob | null;
  generationMode: "deepseek" | "demo";
}

export interface SourceRecord {
  id: string;
  type: SourceRecordType;
  occurredAt: string;
  content: string;
  isDemoData: boolean;
}

export interface HandoffItemView {
  id: string;
  category: HandoffCategory;
  content: string;
  isConfirmed: boolean;
  isInherited: boolean;
  sources: SourceRecord[];
}

export interface PendingTaskView {
  id: string;
  content: string;
  status: "open" | "completed" | "cancelled";
  createdAt: string;
  completedAt: string | null;
}

export interface TimelineEntry {
  id: string;
  shiftDate: string;
  shiftType: "day" | "night";
  handoverToType: "day" | "night";
  status: HandoffStatus;
  summary: string;
  confirmedAt: string | null;
  confirmedBy: string | null;
  receivedAt: string | null;
  receivedBy: string | null;
}

export interface HandoffDetail {
  id: string;
  version: number;
  status: HandoffStatus;
  conditionSummary: string;
  generatedAt: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  receivedAt: string | null;
  receivedBy: string | null;
  patient: Omit<PatientCard, "summary" | "importantChanges" | "pendingCount" | "confirmationCount" | "sourceRecordCount">;
  shift: ShiftInfo;
  items: HandoffItemView[];
  pendingTasks: PendingTaskView[];
  timeline: TimelineEntry[];
}

export interface AppErrorPayload {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    requestId?: string;
    fieldErrors?: Record<string, string>;
  };
}
