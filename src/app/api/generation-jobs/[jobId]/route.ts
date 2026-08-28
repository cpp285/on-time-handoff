import { getGenerationJob } from "@/lib/server/handoff-repository";
import { handleRouteError, jsonError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const job = getGenerationJob(jobId);
    if (!job) {
      return jsonError("JOB_NOT_FOUND", "未找到这次生成任务。", 404);
    }
    return Response.json({ data: job });
  } catch (error) {
    return handleRouteError(error);
  }
}
