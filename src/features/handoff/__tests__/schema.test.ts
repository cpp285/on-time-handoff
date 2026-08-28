import { describe, expect, it } from "vitest";

import { handoffDraftSchema, importRequestSchema } from "../schema";

describe("handoff draft schema", () => {
  it("accepts the fixed structured handoff contract", () => {
    const result = handoffDraftSchema.parse({
      patient_id: "P012",
      condition_summary: "肺炎治疗中，傍晚发热。",
      shift_changes: [
        {
          content: "18:00 体温升至 38.5℃。",
          source_record_ids: ["SRC-P012-A"],
          inherited: false,
        },
      ],
      pending_tasks: [],
      next_shift_attention: [],
      needs_confirmation: [],
    });

    expect(result.patient_id).toBe("P012");
    expect(result.shift_changes).toHaveLength(1);
  });

  it("keeps the condition blank when the imported source has no evidence", () => {
    const result = handoffDraftSchema.parse({
      patient_id: "P001",
      condition_summary: "",
      shift_changes: [],
      pending_tasks: [],
      next_shift_attention: [],
      needs_confirmation: [],
    });

    expect(result.condition_summary).toBe("");
  });

  it("rejects free-form or source-less output", () => {
    const result = handoffDraftSchema.safeParse({
      patient_id: "P012",
      condition_summary: "肺炎治疗中。",
      shift_changes: [{ content: "无来源内容", source_record_ids: [] }],
      pending_tasks: [],
      next_shift_attention: [],
      needs_confirmation: [],
    });

    expect(result.success).toBe(false);
  });
});

describe("import request schema", () => {
  it("accepts the hospital simulator without a file", () => {
    expect(
      importRequestSchema.parse({
        sourceMode: "hospital_simulator",
        idempotencyKey: "import-demo-001",
      }).sourceMode,
    ).toBe("hospital_simulator");
  });

  it("requires a file name for the local file demo", () => {
    expect(
      importRequestSchema.safeParse({
        sourceMode: "local_file_demo",
        idempotencyKey: "import-file-001",
      }).success,
    ).toBe(false);
  });
});
