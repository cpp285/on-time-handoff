import "server-only";

import { getDemoDraft } from "@/features/handoff/demo-data";
import {
  handoffDraftJsonSchema,
  handoffDraftSchema,
  type HandoffDraft,
} from "@/features/handoff/schema";

import type { GenerationContext } from "./handoff-repository";

const SYSTEM_PROMPT = `
你是医院病区交班信息整理器。输入全部是虚构演示数据。

你的唯一任务是把输入记录整理为指定 JSON：
- 只提取输入中明确存在的事实；
- 不诊断，不新增治疗建议，不推断任务已经完成；
- 每条内容必须关联输入中真实存在的 source record id；
- 上一班未完成事项只能继续延续，不能擅自标为完成；
- 有矛盾、缺失或需要医生决定的内容放入 needs_confirmation；
- 使用简洁、可核对的中文医疗交班表述。
`.trim();

interface DeepSeekResponse {
  status?: string;
  error?: { code?: string; message?: string } | null;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}

export interface GeneratedDraftResult {
  draft: HandoffDraft;
  modelName: string;
  mode: "deepseek" | "demo";
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildInput(context: GenerationContext) {
  return JSON.stringify(
    {
      patient: context.patient,
      previous_confirmed_handoff: context.previousHandoff,
      open_pending_tasks: context.openPendingTasks,
      current_shift_source_records: context.sourceRecords.map((record) => ({
        id: record.id,
        type: record.type,
        occurred_at: record.occurredAt,
        content: record.content,
      })),
    },
    null,
    2,
  );
}

function extractResponseText(response: DeepSeekResponse) {
  for (const output of response.output ?? []) {
    if (output.type !== "message") continue;
    for (const content of output.content ?? []) {
      if (content.type === "output_text" && content.text) {
        return content.text;
      }
    }
  }
  return null;
}

export async function generateDraft(
  context: GenerationContext,
): Promise<GeneratedDraftResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const modelName = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

  if (!apiKey) {
    const patientDelay = 180 + Number(context.patient.bedNo) * 8;
    await delay(Math.min(patientDelay, 420));
    return {
      draft: handoffDraftSchema.parse(getDemoDraft(context.patient.id)),
      modelName: `${modelName}:demo-fixture`,
      mode: "demo",
    };
  }

  const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(
    /\/$/,
    "",
  );
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
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
              content: [{ type: "input_text", text: buildInput(context) }],
            },
          ],
          thinking: { type: "disabled" },
          max_output_tokens: 4_000,
          text: {
            format: {
              type: "json_schema",
              name: "handoff_draft",
              schema: handoffDraftJsonSchema,
            },
          },
        }),
        signal: AbortSignal.timeout(35_000),
      });

      const payload = (await response.json()) as DeepSeekResponse;
      if (!response.ok || payload.error) {
        throw new Error(
          payload.error?.message || `DeepSeek request failed with ${response.status}`,
        );
      }
      const outputText = extractResponseText(payload);
      if (!outputText) {
        throw new Error("DeepSeek returned no structured output text");
      }
      return {
        draft: handoffDraftSchema.parse(JSON.parse(outputText)),
        modelName,
        mode: "deepseek",
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown DeepSeek error");
      if (attempt === 0) await delay(500);
    }
  }

  throw lastError ?? new Error("DeepSeek generation failed");
}
