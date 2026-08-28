import { DEMO_WARD_ID } from "@/features/handoff/demo-data";
import { getBoard } from "@/lib/server/handoff-repository";
import { handleRouteError, jsonError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ wardId: string }> },
) {
  try {
    const { wardId } = await params;
    if (wardId !== DEMO_WARD_ID) {
      return jsonError("WARD_NOT_FOUND", "未找到这个演示病区。", 404);
    }
    return Response.json({ data: getBoard() });
  } catch (error) {
    return handleRouteError(error);
  }
}
