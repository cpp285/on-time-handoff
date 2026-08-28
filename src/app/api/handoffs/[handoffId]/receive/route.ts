import { actorActionSchema } from "@/features/handoff/schema";
import { receiveHandoff } from "@/lib/server/handoff-repository";
import { handleRouteError, jsonError, readJson } from "@/lib/server/http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ handoffId: string }> },
) {
  try {
    const { handoffId } = await params;
    const input = actorActionSchema.parse(await readJson(request));
    const result = receiveHandoff(handoffId, input);
    if (result.kind === "not_found") {
      return jsonError("HANDOFF_NOT_FOUND", "未找到这份交班记录。", 404);
    }
    if (result.kind === "invalid_state") {
      return jsonError(
        "HANDOFF_NOT_RECEIVABLE",
        "交班医生确认后，接班医生才能接收。",
        409,
      );
    }
    return Response.json({ data: result.detail });
  } catch (error) {
    return handleRouteError(error);
  }
}
