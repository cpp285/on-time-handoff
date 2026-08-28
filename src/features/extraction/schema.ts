import { z } from "zod";

export const extractionFieldKeys = [
  "current_condition",
  "shift_changes",
  "current_treatment",
  "returned_results",
  "pending_results",
  "attention",
  "next_tasks",
] as const;

export const extractionRequestSchema = z.object({
  patientId: z.string().trim().min(1).max(80),
  templateId: z.literal("general_ward").default("general_ward"),
  sourceMode: z.enum(["hospital_simulator", "local_file_demo"]).default(
    "hospital_simulator",
  ),
  fileName: z.string().trim().min(1).max(180).nullable().optional(),
});

export const extractionDraftSchema = z.object({
  fields: z
    .array(
      z.object({
        key: z.enum(extractionFieldKeys),
        value: z.string().trim().max(1_200),
        evidence: z
          .array(
            z.object({
              source_record_id: z.string().trim().min(1),
              quote: z.string().trim().min(1).max(500),
            }),
          )
          .max(6),
      }),
    )
    .length(extractionFieldKeys.length),
});

export type ExtractionDraft = z.infer<typeof extractionDraftSchema>;

export const extractionDraftJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["fields"],
  properties: {
    fields: {
      type: "array",
      minItems: extractionFieldKeys.length,
      maxItems: extractionFieldKeys.length,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "value", "evidence"],
        properties: {
          key: { type: "string", enum: extractionFieldKeys },
          value: { type: "string" },
          evidence: {
            type: "array",
            maxItems: 6,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["source_record_id", "quote"],
              properties: {
                source_record_id: { type: "string" },
                quote: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const;
