import { z } from "zod";

import { CURRENT_SHIFT_ID } from "@/features/handoff/demo-data";
import { runGenerationJob } from "@/lib/server/generation-runner";
import {
  createGenerationJob,
  getLastImport,
} from "@/lib/server/handoff-repository";
import { handleRouteError, jsonError, readJson } from "@/lib/server/http";

const createJobSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(120),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shiftId: string }> },
) {
  try {
    const { shiftId } = await params;
    if (shiftId !== CURRENT_SHIFT_ID) {
      return jsonError("SHIFT_NOT_FOUND", "当前演示班次不存在。", 404);
    }
    if (!getLastImport()) {
      return jsonError(
        "IMPORT_REQUIRED",
        "请先导入当前班次的患者、病历和医嘱资料。",
        409,
      );
    }
    const input = createJobSchema.parse(await readJson(request));
    const result = createGenerationJob(input.idempotencyKey);
    if (result.created || result.job.status === "queued") {
      runGenerationJob(result.job.id);
    }
    return Response.json({ data: result.job }, { status: 202 });
  } catch (error) {
    return handleRouteError(error);
  }
}
