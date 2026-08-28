import { supplementSchema } from "@/features/handoff/schema";
import { addSupplement } from "@/lib/server/handoff-repository";
import { handleRouteError, jsonError, readJson } from "@/lib/server/http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ handoffId: string }> },
) {
  try {
    const { handoffId } = await params;
    const input = supplementSchema.parse(await readJson(request));
    const result = addSupplement(handoffId, input);
    if (result.kind === "not_found") {
      return jsonError("HANDOFF_NOT_FOUND", "未找到这份交班记录。", 404);
    }
    if (result.kind === "invalid_state") {
      return jsonError(
        "HANDOFF_NOT_EDITABLE",
        "只有待核对的交班草稿可以补充内容。",
        409,
      );
    }
    return Response.json({ data: result.detail });
  } catch (error) {
    return handleRouteError(error);
  }
}
