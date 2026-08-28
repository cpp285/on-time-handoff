import { describe, expect, it } from "vitest";

import {
  getDemoEncounter,
  getDemoPatientOptions,
  getDemoWorkspaceCharts,
  medicalDocumentTemplates,
} from "../demo-source";
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

    expect(parsed.fields).toHaveLength(7);
    expect(parsed.fields.every((field) => field.value === "")).toBe(true);
  });

  it("defaults to the hospital simulator source", () => {
    const parsed = extractionRequestSchema.parse({
      patientId: "demo-patient-12",
      templateId: "general_ward",
    });

    expect(parsed.sourceMode).toBe("hospital_simulator");
  });
});

describe("demo EMR adapter", () => {
  it("provides five oral surgery patients in a stable ward order", () => {
    const patients = getDemoPatientOptions();
    expect(patients).toHaveLength(5);
    expect(patients.map((patient) => patient.bedNo)).toEqual([
      "03",
      "07",
      "12",
      "16",
      "21",
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
      "postoperative_progress",
      "postoperative_progress",
    ]);
  });

  it("supports a long stay with dozens of progress-note instances", () => {
    const chart = getDemoWorkspaceCharts().find(
      (item) => item.patient.id === "omfs-patient-16",
    );
    expect(chart).toBeDefined();
    expect(
      chart?.documents.filter((document) => document.status !== "not_started"),
    ).toHaveLength(32);
    expect(
      chart?.documents.filter(
        (document) => document.templateKey === "postoperative_progress",
      ).length,
    ).toBeGreaterThan(18);
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

  it("provides the seven fixed fields exactly once per patient", () => {
    for (const patient of getDemoPatientOptions()) {
      const keys = getDemoEncounter(patient.id)?.draft.fields.map(
        (field) => field.key,
      );
      expect(keys).toEqual(extractionFieldKeys);
    }
  });
});
