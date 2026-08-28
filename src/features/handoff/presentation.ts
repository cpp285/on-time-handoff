import type {
  Acuity,
  HandoffCategory,
  HandoffStatus,
  SourceRecordType,
} from "./types";

export const statusLabels: Record<HandoffStatus, string> = {
  not_generated: "待生成",
  generating: "生成中",
  needs_review: "待核对",
  confirmed: "已确认",
  handed_over: "已交班",
  failed: "生成失败",
};

export const categoryLabels: Record<HandoffCategory, string> = {
  shift_change: "本班重要变化",
  pending_task: "未完成事项",
  attention: "下一班关注",
  confirmation: "待医生确认",
};

export const acuityLabels: Record<Acuity, string> = {
  critical: "重点关注",
  watch: "持续观察",
  stable: "情况平稳",
};

export const sourceTypeLabels: Record<SourceRecordType, string> = {
  progress: "病程记录",
  order: "医嘱",
  lab: "检验结果",
  exam: "检查记录",
  doctor_note: "医生补充",
};

export function formatShiftType(type: "day" | "night") {
  return type === "day" ? "白班" : "夜班";
}

export function formatBusinessDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return `${year} 年 ${month} 月 ${day} 日`;
}

export function formatDateTime(value: string | null, includeDate = false) {
  if (!value) return "—";
  const date = new Date(value);
  return new Intl.DateTimeFormat("zh-CN", {
    month: includeDate ? "numeric" : undefined,
    day: includeDate ? "numeric" : undefined,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
