import "server-only";

import { randomUUID } from "node:crypto";

import { getDemoEncounter } from "@/features/extraction/demo-source";
import { extractionFieldConfig } from "@/features/extraction/field-config";
import {
  extractionDraftJsonSchema,
  extractionDraftSchema,
  type ExtractionDraft,
} from "@/features/extraction/schema";
import type {
  ExtractionField,
  ExtractionResult,
} from "@/features/extraction/types";

const SYSTEM_PROMPT = `
你是电子病历系统中的交班信息摘录器。输入是单个患者的结构化主索引、病程记录、今日医嘱和检验检查状态。

请严格返回指定 JSON，并遵守：
- 只整理输入中明确存在的事实，不诊断、不补写、不新增治疗或观察建议；
- 每个固定字段都必须返回一次，顺序与 schema 枚举一致；
- 原始资料没有对应信息时 value 返回空字符串，evidence 返回空数组；
- 禁止使用“暂无异常”“情况稳定”“未提及”“待确认”等句子填空；
- value 非空时必须提供至少一条 evidence；
- evidence.source_record_id 必须来自输入；
- evidence.quote 必须是对应原文中连续、逐字一致的短句，不能改写；
- “明确注意事项”和“下一班待办”只能摘录医生原文中明确写出的内容；
- 使用简洁、便于医生核对的中文交班表述。
`.trim();

interface DeepSeekResponse {
  error?: { message?: string } | null;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
}

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

    // Unsupported generated text is intentionally discarded instead of being
    // displayed as a clinical fact.
    if (evidence.length === 0) {
      return { key: config.key, label: config.label, value: "", evidence: [] };
    }

    return {
      key: config.key,
      label: config.label,
      value: item.value.trim(),
      evidence,
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
              text: JSON.stringify({ patient, source_records: records }, null, 2),
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
  return extractionDraftSchema.parse(JSON.parse(outputText));
}

export async function generateExtraction(
  patientId: string,
): Promise<ExtractionResult> {
  const encounter = getDemoEncounter(patientId);
  if (!encounter) throw new Error("PATIENT_NOT_FOUND");

  const modelName = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
  const apiKey = process.env.DEEPSEEK_API_KEY;
  let draft: ExtractionDraft;
  let mode: ExtractionResult["mode"];

  if (apiKey) {
    try {
      draft = await callDeepSeek(
        encounter.patient,
        encounter.records,
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
    fields: normalizeDraft(draft, encounter.records),
    sourceRecords: encounter.records,
    templateName: "综合病区交班模板",
    importedAt: new Date().toISOString(),
    modelName:
      mode === "deepseek"
        ? modelName
        : `${modelName}:${mode === "demo_fallback" ? "demo-fallback" : "demo-fixture"}`,
    mode,
  };
}

export const extractionTestUtils = { normalizeDraft };
