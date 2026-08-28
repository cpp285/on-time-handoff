import { pendingTaskUpdateSchema } from "@/features/handoff/schema";
import { updatePendingTask } from "@/lib/server/handoff-repository";
import { handleRouteError, jsonError, readJson } from "@/lib/server/http";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId } = await params;
    const input = pendingTaskUpdateSchema.parse(await readJson(request));
    const result = updatePendingTask(taskId, input.status);
    if (result.kind === "not_found") {
      return jsonError("TASK_NOT_FOUND", "未找到这项待办。", 404);
    }
    return Response.json({ data: result.pendingTasks });
  } catch (error) {
    return handleRouteError(error);
  }
}
