import { z } from "zod";

import { CURRENT_SHIFT_ID } from "@/features/handoff/demo-data";
import { runGenerationJob } from "@/lib/server/generation-runner";
import { createGenerationJob } from "@/lib/server/handoff-repository";
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
