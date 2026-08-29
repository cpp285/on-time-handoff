import type { ExtractionFieldKey } from "./types";

export const extractionFieldConfig: Array<{
  key: ExtractionFieldKey;
  label: string;
  hint: string;
}> = [
  {
    key: "current_condition",
    label: "目前病情",
    hint: "按入院概况、最新病程和必要的术前记录整理，不改变医生原意",
  },
  {
    key: "attention",
    label: "需要注意的病情",
    hint: "AI只判断今晚夜班观察重点，不包含明日手术和第二天待办",
  },
];
