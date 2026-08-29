import { describe, expect, it } from "vitest";

import {
  getDemoEncounter,
  getDemoPatientOptions,
  getDemoWorkspaceCharts,
  medicalDocumentTemplates,
} from "../demo-source";
import { buildExtractionContext } from "../extraction-context";
import {
  extractionDraftSchema,
  extractionFieldKeys,
  extractionRequestSchema,
} from "../schema";

describe("single-patient extraction schema", () => {
  it("accepts explicit empty fields instead of placeholder prose", () => {
    const parsed = extractionDraftSchema.parse({
      fields: extractionFieldKeys.map((key) => ({
        key,
        value: "",
        evidence: [],
      })),
    });

    expect(parsed.fields).toHaveLength(2);
    expect(parsed.fields.every((field) => field.value === "")).toBe(true);
  });

  it("defaults to the hospital simulator source", () => {
    const parsed = extractionRequestSchema.parse({
      patientId: "demo-patient-12",
      templateId: "omfs_handoff_v1",
    });

    expect(parsed.sourceMode).toBe("hospital_simulator");
  });
});

describe("demo EMR adapter", () => {
  it("provides three presentation patients from distinct care stages", () => {
    const patients = getDemoPatientOptions();
    expect(patients).toHaveLength(3);
    expect(patients.map((patient) => patient.bedNo)).toEqual(["03", "07", "12"]);
    expect(patients.map((patient) => patient.wardOrder)).toEqual([1, 2, 3]);
    expect(patients.map((patient) => patient.stageLabel)).toEqual([
      "今日新入院",
      "明日手术",
      "手术当日",
    ]);
  });

  it("uses repeatable document templates and prefilled future frameworks", () => {
    expect(medicalDocumentTemplates.map((template) => template.key)).toEqual(
      expect.arrayContaining(["routine_progress", "postoperative_progress"]),
    );
    const currentTemplateKeys = getDemoWorkspaceCharts().map((chart) => {
      const current = chart.documents.find(
        (document) => document.status === "current",
      );
      expect(
        chart.documents
          .filter((document) => document.status === "not_started")
          .every(
            (document) =>
              document.content.trim().length > 0 &&
              document.content.includes("请填写"),
          ),
      ).toBe(true);
      return current?.templateKey;
    });
    expect(currentTemplateKeys).toEqual([
      "first_progress",
      "preoperative_discussion",
      "first_postoperative_progress",
    ]);
  });

  it("classifies admission, latest-date and preoperative records separately", () => {
    const chart = getDemoWorkspaceCharts().find(
      (item) => item.patient.id === "omfs-patient-07",
    );
    expect(chart).toBeDefined();
    const records = chart!.documents
      .filter((document) => document.status !== "not_started")
      .map((document) => ({
        id: `document-${document.key}`,
        type: "progress_note" as const,
        label: document.title,
        recordedAt: document.recordedAt!,
        content: document.content,
      }));
    const context = buildExtractionContext(chart!.patient, records);

    expect(context.admission_record_ids).toHaveLength(1);
    expect(context.preoperative_record_ids).toHaveLength(2);
    expect(context.latest_record_date).toBe("2026-08-29");
    expect(context.latest_date_record_ids).toEqual(
      expect.arrayContaining(context.preoperative_record_ids),
    );
    expect(context.attention_window).toContain("仅限本夜病情观察");
  });

  it("keeps every evidence quote inside the referenced source record", () => {
    for (const patient of getDemoPatientOptions()) {
      const encounter = getDemoEncounter(patient.id);
      expect(encounter).not.toBeNull();
      const recordMap = new Map(
        encounter?.records.map((record) => [record.id, record.content]),
      );

      for (const field of encounter?.draft.fields ?? []) {
        for (const evidence of field.evidence) {
          expect(recordMap.get(evidence.source_record_id)).toContain(evidence.quote);
        }
      }
    }
  });

  it("does not prewrite handoff notes in the electronic medical record", () => {
    const records = getDemoWorkspaceCharts().flatMap((chart) => chart.records);
    expect(records.map((record) => String(record.type))).not.toContain(
      "handoff_note",
    );
    expect(records.some((record) => record.type === "progress_note")).toBe(true);
  });

  it("keeps handoff instructions out of every EMR document and source record", () => {
    const handoffLanguage =
      /夜班|交班备注|交班重点|重点观察|重点关注|明晨核对|晨间复核/;

    for (const chart of getDemoWorkspaceCharts()) {
      for (const document of chart.documents) {
        expect(document.content).not.toMatch(handoffLanguage);
      }
      for (const record of chart.records) {
        expect(record.content).not.toMatch(handoffLanguage);
      }
    }
  });

  it("uses progress-note facts to support a distinct AI attention suggestion", () => {
    for (const patient of getDemoPatientOptions()) {
      const encounter = getDemoEncounter(patient.id);
      const currentCondition = encounter?.draft.fields.find(
        (field) => field.key === "current_condition",
      );
      const attention = encounter?.draft.fields.find(
        (field) => field.key === "attention",
      );

      expect(currentCondition?.evidence.length).toBeGreaterThan(0);
      expect(attention?.value).toMatch(/建议.*(关注|观察|核对)/);
      expect(attention?.value).not.toMatch(
        /明日手术|手术方案|术前准备|备皮|禁食禁饮|送手术室|第二天/,
      );
      expect(attention?.evidence.length).toBeGreaterThan(0);
      expect(attention?.value).not.toBe(attention?.evidence[0]?.quote);
    }
  });

  it("provides the two disease-summary fields exactly once per patient", () => {
    for (const patient of getDemoPatientOptions()) {
      const keys = getDemoEncounter(patient.id)?.draft.fields.map(
        (field) => field.key,
      );
      expect(keys).toEqual(extractionFieldKeys);
    }
  });
});
