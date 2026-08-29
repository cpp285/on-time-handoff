import "server-only";

import { randomUUID } from "node:crypto";

import { getDemoEncounter } from "@/features/extraction/demo-source";
import { buildExtractionContext } from "@/features/extraction/extraction-context";
import { extractionFieldConfig } from "@/features/extraction/field-config";
import {
  extractionDraftJsonSchema,
  extractionDraftSchema,
  type ExtractionDraft,
} from "@/features/extraction/schema";
import type {
  ExtractionField,
  ExtractionResult,
  ExtractionSourceRecord,
  SourceSystemPatient,
} from "@/features/extraction/types";

const SYSTEM_PROMPT = `
你是电子病历系统中的交班草稿生成器。输入是单个患者的结构化主索引和医生已经书写的病程记录，原病历中没有预先写好的交班备注。

请严格返回指定 JSON，并遵守：
- 每个固定字段都必须返回一次，顺序与 schema 枚举一致；
- 原始资料没有对应信息时 value 返回空字符串，evidence 返回空数组；
- 禁止使用“暂无异常”“情况稳定”“未提及”“待确认”等句子填空；
- value 非空时必须提供至少一条 evidence；
- evidence.source_record_id 必须来自输入；
- evidence.quote 必须是对应原文中连续、逐字一致的短句，不能改写；
- “目前病情”按三层资料整理，不能只摘最新一句：第一层从 extraction_context.admission_record_ids 对应的入院记录选择入院原因、主要疾病、关键专科检查和诊断等基本病情；第二层从 extraction_context.latest_date_record_ids 对应的最新日期病程选择患者最新症状、生命体征、专科情况及病情变化；第三层仅当患者即将手术且存在 extraction_context.preoperative_record_ids 时，从术前小结和术前讨论选择术前诊断、手术指征、拟行方案及医生已经记录的主要术前考虑；
- “目前病情”只选择医生原文，不混入下一班观察要求或第二天待办，不同义改写、不润色、不改变数字与医生措辞；多条原文按“入院概况 → 最新病情 → 术前考虑”的顺序提供 evidence，系统按顺序组合；同一事实只保留一次；
- “需要注意的病情”是 AI 对“当前夜班时段”的观察建议：只根据病程中明确存在的症状变化、生命体征、气道、出血、疼痛、发热、意识、创面、皮瓣、引流、神经功能等事实，判断从本次交班到次日早晨需要观察什么；value 可以生成简洁建议，但不得虚构患者事实；
- “需要注意的病情”不得写明日手术方案、手术步骤、手术风险、术前准备、备皮、禁食禁饮、知情同意、送手术室、第二天检查或其他明日待办；这些即使出现在术前文书中，也不属于夜班病情观察；
- “需要注意的病情”不得新增诊断、治疗方案、用药或处置命令，只能提出本夜观察重点，且必须由 evidence 指向形成判断的病程事实；
- AI 建议使用“夜班关注……”“夜班观察……”等便于医生核对的表述，最终由医生修改和确认。
`.trim();

interface DeepSeekResponse {
  error?: { message?: string } | null;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
}

type ExtractionContext = ReturnType<typeof buildExtractionContext>;

const forbiddenAttentionPattern =
  /明日|第二天|次日|拟行手术|手术方案|手术步骤|手术风险|术前准备|备皮|禁食|禁饮|知情同意|送手术室|检查安排|待办|口腔护理|保持口腔清洁|给予|用药|处置|及时评估|报告|联系/;
const preoperativeAssessmentPattern = /手术指征|耐受手术|手术禁忌/;
const preoperativePlanPattern = /拟行|手术方案|麻醉|切除|修复/;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractResponseText(response: DeepSeekResponse) {
  for (const output of response.output ?? []) {
    if (output.type !== "message") continue;
    for (const content of output.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  return null;
}

function requiredCurrentSourceGroups(
  patient: SourceSystemPatient,
  context: ExtractionContext,
) {
  const groups = [
    { label: "入院记录", ids: context.admission_record_ids },
    { label: "最新日期病程", ids: context.latest_date_record_ids },
  ];
  if (/明日手术|术前|待手术/.test(patient.stageLabel)) {
    groups.push(
      { label: "术前评估", ids: context.preoperative_record_ids },
      { label: "术前方案", ids: context.preoperative_record_ids },
    );
  }
  return groups.filter((group) => group.ids.length > 0);
}

function groupIsCovered(
  group: { label: string; ids: string[] },
  evidence: ExtractionDraft["fields"][number]["evidence"],
) {
  const pattern =
    group.label === "术前评估"
      ? preoperativeAssessmentPattern
      : group.label === "术前方案"
        ? preoperativePlanPattern
        : null;
  return evidence.some(
    (source) =>
      group.ids.includes(source.source_record_id) &&
      (pattern === null || pattern.test(source.quote)),
  );
}

function draftViolations(
  draft: ExtractionDraft,
  patient: SourceSystemPatient,
  context: ExtractionContext,
) {
  const current = draft.fields.find((field) => field.key === "current_condition");
  const attention = draft.fields.find((field) => field.key === "attention");
  const currentEvidence = current?.evidence ?? [];
  const missingGroups = requiredCurrentSourceGroups(patient, context)
    .filter((group) => !groupIsCovered(group, currentEvidence))
    .map((group) => group.label);
  const violations: string[] = [];
  if (missingGroups.length > 0) {
    violations.push(`目前病情缺少来源：${missingGroups.join("、")}`);
  }
  if (attention?.value && forbiddenAttentionPattern.test(attention.value)) {
    violations.push("需要注意的病情混入了明日手术、术前准备或第二天待办");
  }
  return violations;
}

function sectionBody(content: string, heading: string) {
  const marker = `【${heading}】`;
  const start = content.indexOf(marker);
  if (start < 0) return null;
  const bodyStart = start + marker.length;
  const nextHeading = content.indexOf("\n\n【", bodyStart);
  const body = content
    .slice(bodyStart, nextHeading < 0 ? undefined : nextHeading)
    .trim();
  return body ? body.slice(0, 500) : null;
}

function fallbackQuote(
  record: ExtractionSourceRecord,
  groupLabel: string,
) {
  if (groupLabel === "入院记录") {
    return (
      sectionBody(record.content, "现病史") ??
      sectionBody(record.content, "专科检查") ??
      sectionBody(record.content, "主诉")
    );
  }

  const paragraphs = record.content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(
      (paragraph) =>
        paragraph.length >= 12 &&
        !/^(记录时间|讨论时间|参加人员|姓名：)/.test(paragraph),
    );
  const preferred =
    groupLabel === "术前评估"
      ? paragraphs.find((paragraph) =>
          preoperativeAssessmentPattern.test(paragraph),
        )
      : groupLabel === "术前方案"
        ? paragraphs.find((paragraph) => preoperativePlanPattern.test(paragraph))
        : paragraphs.find((paragraph) =>
            /患者|一般情况|今日|术后|病情/.test(paragraph),
          );
  return (preferred ?? paragraphs[0] ?? record.content.trim()).slice(0, 500);
}

function ensureRequiredCurrentSources(
  draft: ExtractionDraft,
  patient: SourceSystemPatient,
  records: ExtractionSourceRecord[],
  context: ExtractionContext,
) {
  const current = draft.fields.find((field) => field.key === "current_condition");
  if (!current) return draft;
  const recordMap = new Map(records.map((record) => [record.id, record]));
  const admissionIds = new Set(context.admission_record_ids);
  const preoperativeIds = new Set(context.preoperative_record_ids);
  const evidence = current.evidence.filter(
    (source) =>
      !admissionIds.has(source.source_record_id) &&
      !preoperativeIds.has(source.source_record_id),
  );
  const admissionRecord = context.admission_record_ids
    .map((id) => recordMap.get(id))
    .find(Boolean);
  if (admissionRecord) {
    for (const heading of ["现病史", "专科检查"]) {
      const quote = sectionBody(admissionRecord.content, heading);
      if (quote && admissionRecord.content.includes(quote)) {
        evidence.push({ source_record_id: admissionRecord.id, quote });
      }
    }
  }
  if (/明日手术|术前|待手术/.test(patient.stageLabel)) {
    const preoperativeRecords = context.preoperative_record_ids
      .map((id) => recordMap.get(id))
      .filter((record): record is ExtractionSourceRecord => Boolean(record));
    for (const groupLabel of ["术前评估", "术前方案"]) {
      const pattern =
        groupLabel === "术前评估"
          ? preoperativeAssessmentPattern
          : preoperativePlanPattern;
      const record =
        preoperativeRecords.find((candidate) =>
          pattern.test(fallbackQuote(candidate, groupLabel) ?? ""),
        ) ?? preoperativeRecords[0];
      if (!record) continue;
      const quote = fallbackQuote(record, groupLabel);
      if (quote && record.content.includes(quote)) {
        evidence.push({ source_record_id: record.id, quote });
      }
    }
  }

  for (const group of requiredCurrentSourceGroups(patient, context)) {
    if (groupIsCovered(group, evidence)) continue;
    const candidates = group.ids
      .map((id) => recordMap.get(id))
      .filter((record): record is ExtractionSourceRecord => Boolean(record));
    const groupPattern =
      group.label === "术前评估"
        ? preoperativeAssessmentPattern
        : group.label === "术前方案"
          ? preoperativePlanPattern
          : null;
    const record = groupPattern
      ? candidates.find((candidate) =>
          groupPattern.test(fallbackQuote(candidate, group.label) ?? ""),
        ) ?? candidates[0]
      : candidates[0];
    if (!record) continue;
    const quote = fallbackQuote(record, group.label);
    if (!quote || !record.content.includes(quote)) continue;
    evidence.push({ source_record_id: record.id, quote });
  }

  evidence.sort((left, right) => {
    const rank = (id: string) =>
      admissionIds.has(id) ? 0 : preoperativeIds.has(id) ? 2 : 1;
    return rank(left.source_record_id) - rank(right.source_record_id);
  });
  const combinedPreoperativeEvidence = evidence.find(
    (source) =>
      preoperativeIds.has(source.source_record_id) &&
      preoperativeAssessmentPattern.test(source.quote) &&
      preoperativePlanPattern.test(source.quote),
  );
  const finalEvidence = combinedPreoperativeEvidence
    ? evidence.filter(
        (source) =>
          source === combinedPreoperativeEvidence ||
          !(
            preoperativeIds.has(source.source_record_id) &&
            preoperativePlanPattern.test(source.quote) &&
            !preoperativeAssessmentPattern.test(source.quote)
          ),
      )
    : evidence;
  const prioritizedEvidence: typeof finalEvidence = [];
  const addEvidence = (source: (typeof finalEvidence)[number] | undefined) => {
    if (!source || prioritizedEvidence.includes(source)) return;
    prioritizedEvidence.push(source);
  };
  finalEvidence
    .filter((source) => admissionIds.has(source.source_record_id))
    .slice(0, 2)
    .forEach(addEvidence);
  finalEvidence
    .filter(
      (source) =>
        context.latest_date_record_ids.includes(source.source_record_id) &&
        !preoperativeIds.has(source.source_record_id),
    )
    .slice(0, 2)
    .forEach(addEvidence);
  if (combinedPreoperativeEvidence) {
    addEvidence(combinedPreoperativeEvidence);
  } else {
    addEvidence(
      finalEvidence.find(
        (source) =>
          preoperativeIds.has(source.source_record_id) &&
          preoperativeAssessmentPattern.test(source.quote),
      ),
    );
    addEvidence(
      finalEvidence.find(
        (source) =>
          preoperativeIds.has(source.source_record_id) &&
          preoperativePlanPattern.test(source.quote),
      ),
    );
  }
  finalEvidence.forEach((source) => {
    if (prioritizedEvidence.length < 6) addEvidence(source);
  });

  return {
    fields: draft.fields.map((field) =>
      field.key === "current_condition"
        ? {
            ...field,
            value: field.value || "按原文证据组合",
            evidence: prioritizedEvidence,
          }
        : field.key === "attention" &&
            forbiddenAttentionPattern.test(field.value)
          ? { ...field, value: "", evidence: [] }
          : field,
    ),
  } satisfies ExtractionDraft;
}

function normalizeDraft(
  draft: ExtractionDraft,
  records: NonNullable<ReturnType<typeof getDemoEncounter>>["records"],
): ExtractionField[] {
  const recordMap = new Map(records.map((record) => [record.id, record]));

  return extractionFieldConfig.map((config) => {
    const item = draft.fields.find((field) => field.key === config.key);
    if (!item?.value.trim()) {
      return { key: config.key, label: config.label, value: "", evidence: [] };
    }

    const evidence = item.evidence.flatMap((source) => {
      const record = recordMap.get(source.source_record_id);
      const quote = source.quote.trim();
      if (!record || !quote || !record.content.includes(quote)) return [];
      return [{ sourceRecordId: record.id, quote }];
    });

    const selectedEvidence: typeof evidence = [];
    const seenQuotes = new Set<string>();
    let selectedLength = 0;
    for (const source of evidence) {
      const identity = `${source.sourceRecordId}:${source.quote}`;
      if (seenQuotes.has(identity)) continue;
      const nextLength = selectedLength + source.quote.length;
      if (nextLength > 1_200) continue;
      seenQuotes.add(identity);
      selectedEvidence.push(source);
      selectedLength = nextLength;
    }

    // Both fields need traceable source evidence. The current-condition value
    // is rebuilt from exact quotes, while the attention value is an AI
    // suggestion whose supporting facts have been verified above.
    if (selectedEvidence.length === 0) {
      return { key: config.key, label: config.label, value: "", evidence: [] };
    }

    return {
      key: config.key,
      label: config.label,
      value:
        config.key === "current_condition"
          ? selectedEvidence.map((source) => source.quote).join("\n")
          : item.value.trim(),
      evidence: selectedEvidence,
    };
  });
}

async function callDeepSeek(
  patient: NonNullable<ReturnType<typeof getDemoEncounter>>["patient"],
  records: NonNullable<ReturnType<typeof getDemoEncounter>>["records"],
  modelName: string,
  apiKey: string,
) {
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(
    /\/$/,
    "",
  );
  const context = buildExtractionContext(patient, records);
  let lastDraft: ExtractionDraft | null = null;
  let validationFeedback: string[] = [];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(`${baseUrl}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: SYSTEM_PROMPT }],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify(
                  {
                    patient,
                    extraction_context: context,
                    validation_feedback:
                      validationFeedback.length > 0
                        ? `上一版不合格，必须修正：${validationFeedback.join("；")}`
                        : undefined,
                    source_records: records,
                  },
                  null,
                  2,
                ),
              },
            ],
          },
        ],
        reasoning: { effort: "none" },
        max_output_tokens: 4_000,
        text: {
          format: {
            type: "json_schema",
            name: "handoff_card_extraction",
            schema: extractionDraftJsonSchema,
          },
        },
      }),
      signal: AbortSignal.timeout(
        Number(process.env.DEEPSEEK_TIMEOUT_MS || 35_000),
      ),
    });

    const payload = (await response.json()) as DeepSeekResponse;
    if (!response.ok || payload.error) {
      throw new Error(
        payload.error?.message || `DeepSeek request failed with ${response.status}`,
      );
    }
    const outputText = extractResponseText(payload);
    if (!outputText) throw new Error("DeepSeek returned no structured output text");
    lastDraft = extractionDraftSchema.parse(JSON.parse(outputText));
    validationFeedback = draftViolations(lastDraft, patient, context);
    if (validationFeedback.length === 0) {
      return ensureRequiredCurrentSources(lastDraft, patient, records, context);
    }
  }

  return ensureRequiredCurrentSources(lastDraft!, patient, records, context);
}

export async function generateExtraction(
  patientId: string,
  source?: {
    patient: SourceSystemPatient;
    records: ExtractionSourceRecord[];
  },
): Promise<ExtractionResult> {
  const demoEncounter = getDemoEncounter(patientId);
  if (!demoEncounter && !source) throw new Error("PATIENT_NOT_FOUND");

  const encounter = source
    ? {
        patient: source.patient,
        records: source.records,
        draft:
          demoEncounter?.draft ??
          ({
            fields: extractionFieldConfig.map((field) => ({
              key: field.key,
              value: "",
              evidence: [],
            })),
          } satisfies ExtractionDraft),
      }
    : demoEncounter!;
  const clinicianAuthoredRecords = encounter.records.filter(
    (record) => record.type === "progress_note",
  );

  const modelName = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
  const apiKey = process.env.DEEPSEEK_API_KEY;
  let draft: ExtractionDraft;
  let mode: ExtractionResult["mode"];

  if (apiKey) {
    try {
      draft = await callDeepSeek(
        encounter.patient,
        clinicianAuthoredRecords,
        modelName,
        apiKey,
      );
      mode = "deepseek";
    } catch (error) {
      console.error(
        "DeepSeek extraction failed; loading an explicitly labelled demo fallback.",
        error instanceof Error ? error.message : error,
      );
      draft = extractionDraftSchema.parse(encounter.draft);
      mode = "demo_fallback";
    }
  } else {
    await delay(650);
    draft = extractionDraftSchema.parse(encounter.draft);
    mode = "demo";
  }

  return {
    extractionId: randomUUID(),
    patient: encounter.patient,
    fields: normalizeDraft(draft, clinicianAuthoredRecords),
    sourceRecords: clinicianAuthoredRecords,
    templateName: "口腔颌面头颈肿瘤科交班模板 V1",
    importedAt: new Date().toISOString(),
    modelName:
      mode === "deepseek"
        ? modelName
        : `${modelName}:${mode === "demo_fallback" ? "demo-fallback" : "demo-fixture"}`,
    mode,
  };
}

export const extractionTestUtils = { normalizeDraft };
