import { CURRENT_SHIFT_ID } from "@/features/handoff/demo-data";
import { importRequestSchema } from "@/features/handoff/schema";
import { createDemoImport } from "@/lib/server/handoff-repository";
import { handleRouteError, jsonError, readJson } from "@/lib/server/http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shiftId: string }> },
) {
  try {
    const { shiftId } = await params;
    if (shiftId !== CURRENT_SHIFT_ID) {
      return jsonError("SHIFT_NOT_FOUND", "当前演示班次不存在。", 404);
    }
    const input = importRequestSchema.parse(await readJson(request));
    const batch = createDemoImport(input);
    return Response.json({ data: batch }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
