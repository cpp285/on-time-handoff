import type { Acuity, SourceRecordType } from "./types";
import type { HandoffDraft } from "./schema";

export const DEMO_WARD_ID = "WARD-5A";
export const CURRENT_SHIFT_ID = "SHIFT-20260828-DAY";
export const PREVIOUS_SHIFT_ID = "SHIFT-20260827-NIGHT";

export interface DemoCase {
  patient: {
    id: string;
    bedNo: string;
    displayName: string;
    age: number;
    gender: "男" | "女";
    diagnosis: string;
    basicInfo: string;
    acuity: Acuity;
  };
  records: Array<{
    id: string;
    type: SourceRecordType;
    occurredAt: string;
    content: string;
  }>;
  previousSummary: string;
  previousChange: string;
  previousPending?: string;
  draft: HandoffDraft;
}

export const demoCases: DemoCase[] = [
  {
    patient: { id: "P003", bedNo: "03", displayName: "周女士", age: 45, gender: "女", diagnosis: "急性胰腺炎", basicInfo: "入院第 2 天，禁食补液中", acuity: "watch" },
    records: [
      { id: "SRC-P003-A", type: "lab", occurredAt: "2026-08-28T10:20:00+08:00", content: "血淀粉酶较昨日下降，白细胞计数 12.1×10⁹/L。" },
      { id: "SRC-P003-B", type: "progress", occurredAt: "2026-08-28T15:10:00+08:00", content: "患者腹痛较晨间减轻，无呕吐，继续禁食及补液。白班医师交班备注：夜班观察腹痛和呕吐变化，若加重及时复评。" },
    ],
    previousSummary: "急性胰腺炎，腹痛持续，禁食补液中。",
    previousChange: "夜间腹痛未加重。",
    draft: {
      patient_id: "P003",
      condition_summary: "急性胰腺炎治疗中，腹痛较前减轻；血淀粉酶较昨日下降，白细胞 12.1×10⁹/L。",
      shift_changes: [{ content: "本班腹痛较晨间减轻，无呕吐。", source_record_ids: ["SRC-P003-B"], inherited: false }],
      pending_tasks: [],
      next_shift_attention: [{ content: "若腹痛加重或出现呕吐，请及时复评。", source_record_ids: ["SRC-P003-B"], inherited: false }],
      needs_confirmation: [],
    },
  },
  {
    patient: { id: "P005", bedNo: "05", displayName: "陈先生", age: 72, gender: "男", diagnosis: "慢阻肺急性加重", basicInfo: "鼻导管吸氧 2 L/min", acuity: "critical" },
    records: [
      { id: "SRC-P005-A", type: "progress", occurredAt: "2026-08-28T09:35:00+08:00", content: "晨间气促较昨日缓解，鼻导管吸氧 2 L/min，SpO₂ 94%。白班医师交班备注：夜班观察呼吸频率、意识和血氧变化。" },
      { id: "SRC-P005-B", type: "lab", occurredAt: "2026-08-28T14:40:00+08:00", content: "血气分析：PaCO₂ 52 mmHg，与晨间接近。" },
    ],
    previousSummary: "慢阻肺急性加重，低流量吸氧，夜间呼吸平稳。",
    previousChange: "夜间 SpO₂ 维持 93%—95%。",
    draft: {
      patient_id: "P005",
      condition_summary: "慢阻肺急性加重，鼻导管吸氧 2 L/min 下 SpO₂ 94%，PaCO₂ 52 mmHg。",
      shift_changes: [{ content: "气促较昨日缓解，吸氧 2 L/min 下 SpO₂ 94%。", source_record_ids: ["SRC-P005-A"], inherited: false }],
      pending_tasks: [],
      next_shift_attention: [{ content: "夜班继续观察呼吸频率、意识和血氧变化。", source_record_ids: ["SRC-P005-A", "SRC-P005-B"], inherited: false }],
      needs_confirmation: [{ content: "血气 PaCO₂ 52 mmHg，需医生确认夜间复查计划。", source_record_ids: ["SRC-P005-B"], inherited: false }],
    },
  },
  {
    patient: { id: "P007", bedNo: "07", displayName: "孙女士", age: 61, gender: "女", diagnosis: "脑梗死恢复期", basicInfo: "右侧肢体肌力 4 级", acuity: "watch" },
    records: [
      { id: "SRC-P007-A", type: "exam", occurredAt: "2026-08-28T11:50:00+08:00", content: "头颅 MRI 已完成，正式报告尚未回传。" },
      { id: "SRC-P007-B", type: "progress", occurredAt: "2026-08-28T16:05:00+08:00", content: "神志清楚，右侧肢体肌力 4 级，与晨间相比无变化。白班医师交班备注：继续观察意识及肢体活动变化。" },
    ],
    previousSummary: "脑梗死恢复期，神志清楚，右侧肌力 4 级。",
    previousChange: "已预约头颅 MRI。",
    previousPending: "头颅 MRI 报告待回。",
    draft: {
      patient_id: "P007",
      condition_summary: "脑梗死恢复期，神经功能本班稳定，MRI 已完成待正式报告。",
      shift_changes: [{ content: "本班神志及右侧肢体肌力无明显变化。", source_record_ids: ["SRC-P007-B"], inherited: false }],
      pending_tasks: [{ content: "头颅 MRI 正式报告待回。", source_record_ids: ["SRC-P007-A"], inherited: true }],
      next_shift_attention: [{ content: "继续观察意识及肢体活动变化。", source_record_ids: ["SRC-P007-B"], inherited: false }],
      needs_confirmation: [],
    },
  },
  {
    patient: { id: "P009", bedNo: "09", displayName: "吴先生", age: 58, gender: "男", diagnosis: "上消化道出血", basicInfo: "今日未再呕血", acuity: "watch" },
    records: [
      { id: "SRC-P009-A", type: "lab", occurredAt: "2026-08-28T12:20:00+08:00", content: "血红蛋白 86 g/L，较晨间 88 g/L 轻度下降。" },
      { id: "SRC-P009-B", type: "progress", occurredAt: "2026-08-28T17:00:00+08:00", content: "本班未再呕血，生命体征平稳，排黑便 1 次。白班医师交班备注：夜班关注呕血、黑便及生命体征变化。" },
    ],
    previousSummary: "上消化道出血，禁食，血红蛋白偏低。",
    previousChange: "夜间无呕血。",
    draft: {
      patient_id: "P009",
      condition_summary: "上消化道出血观察中，本班无再呕血，血红蛋白轻度下降。",
      shift_changes: [{ content: "本班无再呕血，排黑便 1 次。", source_record_ids: ["SRC-P009-B"], inherited: false }],
      pending_tasks: [],
      next_shift_attention: [{ content: "关注呕血、黑便及生命体征变化。", source_record_ids: ["SRC-P009-A", "SRC-P009-B"], inherited: false }],
      needs_confirmation: [],
    },
  },
  {
    patient: { id: "P012", bedNo: "12", displayName: "林女士", age: 67, gender: "女", diagnosis: "社区获得性肺炎", basicInfo: "傍晚发热，血培养待回", acuity: "critical" },
    records: [
      { id: "SRC-P012-A", type: "progress", occurredAt: "2026-08-28T18:00:00+08:00", content: "18:00 体温 38.5℃，较午后升高，患者诉畏寒。白班医师交班备注：夜班继续关注体温、寒战及血培养结果。" },
      { id: "SRC-P012-B", type: "order", occurredAt: "2026-08-28T18:12:00+08:00", content: "已留取两组血培养并送检，结果未回。" },
      { id: "SRC-P012-C", type: "lab", occurredAt: "2026-08-28T15:30:00+08:00", content: "C 反应蛋白 82 mg/L，较昨日升高。" },
    ],
    previousSummary: "社区获得性肺炎，抗感染治疗中，午后低热。",
    previousChange: "午后体温 37.8℃。",
    previousPending: "两组血培养结果待回。",
    draft: {
      patient_id: "P012",
      condition_summary: "社区获得性肺炎抗感染治疗中，傍晚体温升至 38.5℃，炎症指标升高。",
      shift_changes: [{ content: "18:00 体温升至 38.5℃并伴畏寒。", source_record_ids: ["SRC-P012-A"], inherited: false }],
      pending_tasks: [{ content: "两组血培养结果待回。", source_record_ids: ["SRC-P012-B"], inherited: true }],
      next_shift_attention: [{ content: "夜班继续关注体温、寒战及血培养结果。", source_record_ids: ["SRC-P012-A", "SRC-P012-B"], inherited: false }],
      needs_confirmation: [{ content: "C 反应蛋白较昨日升高，是否需要夜间复查请医生确认。", source_record_ids: ["SRC-P012-C"], inherited: false }],
    },
  },
  {
    patient: { id: "P015", bedNo: "15", displayName: "赵先生", age: 39, gender: "男", diagnosis: "急性阑尾炎术后", basicInfo: "术后第 1 天", acuity: "stable" },
    records: [
      { id: "SRC-P015-A", type: "progress", occurredAt: "2026-08-28T10:05:00+08:00", content: "术后切口敷料干燥，体温正常，已下床活动。" },
      { id: "SRC-P015-B", type: "order", occurredAt: "2026-08-28T13:20:00+08:00", content: "医嘱调整为流质饮食，患者耐受。" },
    ],
    previousSummary: "急性阑尾炎术后，生命体征平稳。",
    previousChange: "术后返回病房。",
    draft: {
      patient_id: "P015",
      condition_summary: "阑尾炎术后第 1 天，恢复平稳，已下床并耐受流质饮食。",
      shift_changes: [{ content: "本班已下床活动并开始流质饮食，耐受良好。", source_record_ids: ["SRC-P015-A", "SRC-P015-B"], inherited: false }],
      pending_tasks: [],
      next_shift_attention: [],
      needs_confirmation: [],
    },
  },
  {
    patient: { id: "P018", bedNo: "18", displayName: "钱女士", age: 54, gender: "女", diagnosis: "2 型糖尿病伴感染", basicInfo: "血糖波动", acuity: "watch" },
    records: [
      { id: "SRC-P018-A", type: "lab", occurredAt: "2026-08-28T16:30:00+08:00", content: "餐后 2 小时血糖 15.8 mmol/L。" },
      { id: "SRC-P018-B", type: "order", occurredAt: "2026-08-28T16:45:00+08:00", content: "胰岛素剂量已按医嘱调整，晚餐前复测血糖。白班医师交班备注：夜班关注血糖及低血糖症状。" },
    ],
    previousSummary: "糖尿病伴足部感染，血糖控制欠佳。",
    previousChange: "夜间血糖 11.2 mmol/L。",
    draft: {
      patient_id: "P018",
      condition_summary: "糖尿病伴感染治疗中，本班餐后血糖偏高，胰岛素方案已调整。",
      shift_changes: [{ content: "餐后 2 小时血糖 15.8 mmol/L，胰岛素剂量已调整。", source_record_ids: ["SRC-P018-A", "SRC-P018-B"], inherited: false }],
      pending_tasks: [{ content: "晚餐前血糖待复测。", source_record_ids: ["SRC-P018-B"], inherited: false }],
      next_shift_attention: [{ content: "关注夜间血糖及低血糖症状。", source_record_ids: ["SRC-P018-A", "SRC-P018-B"], inherited: false }],
      needs_confirmation: [],
    },
  },
  {
    patient: { id: "P021", bedNo: "21", displayName: "李先生", age: 76, gender: "男", diagnosis: "心力衰竭", basicInfo: "利尿治疗中", acuity: "critical" },
    records: [
      { id: "SRC-P021-A", type: "progress", occurredAt: "2026-08-28T09:50:00+08:00", content: "静息气促较昨日减轻，双下肢水肿仍为 ++。白班医师交班备注：记录夜间尿量并观察呼吸、水肿变化。" },
      { id: "SRC-P021-B", type: "lab", occurredAt: "2026-08-28T14:15:00+08:00", content: "血钾 3.4 mmol/L，已通知值班医生。" },
    ],
    previousSummary: "心力衰竭加重，利尿治疗中，下肢水肿明显。",
    previousChange: "夜间尿量 900 ml。",
    draft: {
      patient_id: "P021",
      condition_summary: "心力衰竭利尿治疗中，气促有所缓解，下肢水肿仍明显，血钾偏低。",
      shift_changes: [{ content: "静息气促较昨日减轻，双下肢水肿仍为 ++。", source_record_ids: ["SRC-P021-A"], inherited: false }],
      pending_tasks: [],
      next_shift_attention: [{ content: "记录夜间尿量并观察呼吸、水肿变化。", source_record_ids: ["SRC-P021-A"], inherited: false }],
      needs_confirmation: [{ content: "血钾 3.4 mmol/L，补钾与复查安排需医生确认。", source_record_ids: ["SRC-P021-B"], inherited: false }],
    },
  },
  {
    patient: { id: "P023", bedNo: "23", displayName: "王女士", age: 31, gender: "女", diagnosis: "急性肾盂肾炎", basicInfo: "抗感染治疗中", acuity: "stable" },
    records: [
      { id: "SRC-P023-A", type: "progress", occurredAt: "2026-08-28T11:15:00+08:00", content: "本班体温正常，腰痛较昨日减轻。" },
      { id: "SRC-P023-B", type: "lab", occurredAt: "2026-08-28T15:25:00+08:00", content: "尿培养初步提示革兰阴性杆菌，药敏结果待回。白班医师交班备注：夜班关注体温及药敏结果。" },
    ],
    previousSummary: "急性肾盂肾炎，发热及腰痛。",
    previousChange: "夜间最高体温 37.6℃。",
    draft: {
      patient_id: "P023",
      condition_summary: "急性肾盂肾炎抗感染治疗中，本班无发热，腰痛减轻。",
      shift_changes: [{ content: "本班体温正常，腰痛较昨日减轻。", source_record_ids: ["SRC-P023-A"], inherited: false }],
      pending_tasks: [{ content: "尿培养药敏结果待回。", source_record_ids: ["SRC-P023-B"], inherited: false }],
      next_shift_attention: [{ content: "关注体温及尿培养药敏结果。", source_record_ids: ["SRC-P023-A", "SRC-P023-B"], inherited: false }],
      needs_confirmation: [],
    },
  },
  {
    patient: { id: "P026", bedNo: "26", displayName: "郑先生", age: 63, gender: "男", diagnosis: "急性胆管炎", basicInfo: "ERCP 术后观察", acuity: "watch" },
    records: [
      { id: "SRC-P026-A", type: "progress", occurredAt: "2026-08-28T12:40:00+08:00", content: "ERCP 术后返回病房，腹痛轻，无呕吐。白班医师交班备注：夜班关注腹痛、呕吐及血淀粉酶结果。" },
      { id: "SRC-P026-B", type: "lab", occurredAt: "2026-08-28T17:15:00+08:00", content: "术后血淀粉酶结果尚未回报。" },
    ],
    previousSummary: "急性胆管炎，拟行 ERCP。",
    previousChange: "术前准备完成。",
    draft: {
      patient_id: "P026",
      condition_summary: "急性胆管炎 ERCP 术后观察中，轻度腹痛，无呕吐。",
      shift_changes: [{ content: "本班完成 ERCP，术后轻度腹痛，无呕吐。", source_record_ids: ["SRC-P026-A"], inherited: false }],
      pending_tasks: [{ content: "术后血淀粉酶结果待回。", source_record_ids: ["SRC-P026-B"], inherited: false }],
      next_shift_attention: [{ content: "关注腹痛、呕吐及血淀粉酶结果。", source_record_ids: ["SRC-P026-A", "SRC-P026-B"], inherited: false }],
      needs_confirmation: [],
    },
  },
];

export function getDemoDraft(patientId: string): HandoffDraft {
  const match = demoCases.find((item) => item.patient.id === patientId);
  if (!match) {
    throw new Error(`No demo draft for patient ${patientId}`);
  }
  return structuredClone(match.draft);
}
