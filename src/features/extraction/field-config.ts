import type { ExtractionFieldKey } from "./types";

export const extractionFieldConfig: Array<{
  key: ExtractionFieldKey;
  label: string;
  hint: string;
}> = [
  {
    key: "current_condition",
    label: "目前病情",
    hint: "当前症状、生命体征与整体状态",
  },
  {
    key: "shift_changes",
    label: "本班病情变化",
    hint: "只整理本班新增或发生变化的事实",
  },
  {
    key: "current_treatment",
    label: "当前治疗与今日医嘱",
    hint: "仅摘录原始资料中的治疗和医嘱",
  },
  {
    key: "returned_results",
    label: "已回关键结果",
    hint: "本班已发布的检验、检查结果",
  },
  {
    key: "pending_results",
    label: "待回结果",
    hint: "已经申请或送检、但尚未出结果的项目",
  },
  {
    key: "attention",
    label: "明确注意事项",
    hint: "原记录中明确书写的观察重点，不新增建议",
  },
  {
    key: "next_tasks",
    label: "下一班待办",
    hint: "原记录明确要求下一班继续完成的事项",
  },
];
