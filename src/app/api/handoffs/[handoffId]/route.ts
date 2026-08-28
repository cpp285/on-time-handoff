import { updateHandoffSchema } from "@/features/handoff/schema";
import {
  getHandoffDetail,
  updateHandoff,
} from "@/lib/server/handoff-repository";
import { handleRouteError, jsonError, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ handoffId: string }> },
) {
  try {
    const { handoffId } = await params;
    const detail = getHandoffDetail(handoffId);
    if (!detail) {
      return jsonError("HANDOFF_NOT_FOUND", "未找到这份交班记录。", 404);
    }
    return Response.json({ data: detail });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ handoffId: string }> },
) {
  try {
    const { handoffId } = await params;
    const input = updateHandoffSchema.parse(await readJson(request));
    const result = updateHandoff(handoffId, input);
    if (result.kind === "not_found") {
      return jsonError("HANDOFF_NOT_FOUND", "未找到这份交班记录。", 404);
    }
    if (result.kind === "invalid_state") {
      return jsonError(
        "HANDOFF_NOT_EDITABLE",
        "只有待核对的交班草稿可以编辑。",
        409,
      );
    }
    return Response.json({ data: result.detail });
  } catch (error) {
    return handleRouteError(error);
  }
}
