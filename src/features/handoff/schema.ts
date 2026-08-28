import { z } from "zod";

export const draftItemSchema = z.object({
  content: z.string().trim().min(1).max(500),
  source_record_ids: z.array(z.string().trim().min(1)).min(1),
  inherited: z.boolean().default(false),
});

export const handoffDraftSchema = z.object({
  patient_id: z.string().trim().min(1),
  condition_summary: z.string().trim().min(1).max(800),
  shift_changes: z.array(draftItemSchema).max(8),
  pending_tasks: z.array(draftItemSchema).max(8),
  next_shift_attention: z.array(draftItemSchema).max(8),
  needs_confirmation: z.array(draftItemSchema).max(8),
});

export type HandoffDraft = z.infer<typeof handoffDraftSchema>;

export const handoffDraftJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "patient_id",
    "condition_summary",
    "shift_changes",
    "pending_tasks",
    "next_shift_attention",
    "needs_confirmation",
  ],
  properties: {
    patient_id: { type: "string" },
    condition_summary: { type: "string" },
    shift_changes: { type: "array", items: { $ref: "#/$defs/item" } },
    pending_tasks: { type: "array", items: { $ref: "#/$defs/item" } },
    next_shift_attention: { type: "array", items: { $ref: "#/$defs/item" } },
    needs_confirmation: { type: "array", items: { $ref: "#/$defs/item" } },
  },
  $defs: {
    item: {
      type: "object",
      additionalProperties: false,
      required: ["content", "source_record_ids", "inherited"],
      properties: {
        content: { type: "string" },
        source_record_ids: {
          type: "array",
          minItems: 1,
          items: { type: "string" },
        },
        inherited: { type: "boolean" },
      },
    },
  },
} as const;

export const updateHandoffSchema = z.object({
  conditionSummary: z.string().trim().min(1).max(800),
  items: z.array(
    z.object({
      id: z.string().trim().min(1),
      content: z.string().trim().min(1).max(500),
    }),
  ),
});

export const actorActionSchema = z.object({
  actor: z.string().trim().min(1).max(80),
  idempotencyKey: z.string().trim().min(8).max(120),
});

export const supplementSchema = z.object({
  content: z.string().trim().min(2).max(500),
  actor: z.string().trim().min(1).max(80),
});

export const pendingTaskUpdateSchema = z.object({
  status: z.enum(["open", "completed", "cancelled"]),
});
