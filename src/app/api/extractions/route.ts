import { extractionRequestSchema } from "@/features/extraction/schema";
import { generateExtraction } from "@/lib/server/extraction-service";
import { handleRouteError, jsonError, readJson } from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    const input = extractionRequestSchema.parse(await readJson(request));
    const result = await generateExtraction(
      input.patientId,
      input.patient && input.sourceRecords
        ? { patient: input.patient, records: input.sourceRecords }
        : undefined,
    );
    return Response.json({ data: result });
  } catch (error) {
    if (error instanceof Error && error.message === "PATIENT_NOT_FOUND") {
      return jsonError("PATIENT_NOT_FOUND", "没有找到该患者的本次住院记录。", 404);
    }
    return handleRouteError(error);
  }
}
