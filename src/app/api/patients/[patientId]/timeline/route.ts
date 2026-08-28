import { getTimeline } from "@/lib/server/handoff-repository";
import { handleRouteError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ patientId: string }> },
) {
  try {
    const { patientId } = await params;
    return Response.json({ data: getTimeline(patientId) });
  } catch (error) {
    return handleRouteError(error);
  }
}
