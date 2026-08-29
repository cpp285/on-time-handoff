import { z } from "zod";

export const extractionFieldKeys = [
  "current_condition",
  "attention",
] as const;

export const extractionRequestSchema = z.object({
  patientId: z.string().trim().min(1).max(80),
  templateId: z.literal("omfs_handoff_v1").default("omfs_handoff_v1"),
  sourceMode: z.enum(["hospital_simulator", "local_file_demo"]).default(
    "hospital_simulator",
  ),
  fileName: z.string().trim().min(1).max(180).nullable().optional(),
  patient: z
    .object({
      id: z.string().trim().min(1).max(80),
      encounterId: z.string().trim().min(1).max(120),
      wardOrder: z.number().int().positive(),
      bedNo: z.string().trim().min(1).max(20),
      name: z.string().trim().min(1).max(80),
      gender: z.enum(["男", "女"]),
      age: z.number().int().min(0).max(150),
      diagnosis: z.string().trim().min(1).max(500),
      stageLabel: z.string().trim().min(1).max(100),
      admissionDate: z.string().trim().min(1).max(50),
      currentSituation: z.string().max(2_000),
      updatedAt: z.string().trim().min(1).max(50),
      sourceCounts: z.object({
        records: z.number().int().nonnegative(),
        orders: z.number().int().nonnegative(),
        reports: z.number().int().nonnegative(),
      }),
    })
    .optional(),
  sourceRecords: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(160),
        type: z.enum([
          "patient_master",
          "progress_note",
          "order",
          "lab",
          "exam",
        ]),
        label: z.string().trim().min(1).max(180),
        recordedAt: z.string().trim().min(1).max(50),
        content: z.string().trim().min(1).max(30_000),
      }),
    )
    .max(120)
    .optional(),
}).refine(
  (input) => Boolean(input.patient) === Boolean(input.sourceRecords),
  { message: "patient 与 sourceRecords 必须同时提供" },
);

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
