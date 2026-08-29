"use client";

import {
  ArrowLeft,
  BookOpenText,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  ExternalLink,
  FileCheck2,
  LoaderCircle,
  PenLine,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { generateHandoffCard } from "../api/client";
import { createDocumentFramework } from "../demo-source";
import { extractionFieldConfig } from "../field-config";
import type {
  ExtractionField,
  ExtractionResult,
  FieldEvidence,
  MedicalDocumentKey,
  MedicalDocumentTemplateKey,
  SourceSystemChart,
} from "../types";
import styles from "./extraction-workspace.module.css";

type MainModule = "history" | "handoff";
type WorkspaceExperience = "emr" | "handoff";

// v2 removes legacy demo documents that incorrectly contained handoff
// instructions inside the electronic medical record. Handoff suggestions now
// exist only in the handoff workspace after AI generation.
const CHARTS_STORAGE_KEY = "on-time-handoff:charts:v2";
const HANDOFFS_STORAGE_KEY = "on-time-handoff:handoffs:v2";
const CHANGED_PATIENTS_STORAGE_KEY = "on-time-handoff:changed-patients:v2";
const CHANGED_SOURCES_STORAGE_KEY = "on-time-handoff:changed-sources:v2";
// One-time cleanup for an accidental patient created during local UI testing.
// Matching both bed number and name avoids touching legitimate user-created data.
const LEGACY_QA_PATIENT_SIGNATURES = new Set(["50|傻小姐"]);

interface HandoffEditorState {
  result: ExtractionResult;
  fields: ExtractionField[];
  customFields: CustomHandoffField[];
  manuallyEditedFieldKeys: ExtractionField["key"][];
  reviewed: boolean;
}

interface CustomHandoffField {
  id: string;
  label: string;
  value: string;
}

interface ExtractionWorkspaceProps {
  initialCharts: SourceSystemChart[];
  experience?: WorkspaceExperience;
  autoImport?: boolean;
}

interface NewPatientInput {
  name: string;
  gender: "男" | "女";
  age: number;
  bedNo: string;
  admissionDate: string;
}

function diagnosisFromAdmissionRecord(content: string) {
  const section = content.match(
    /【初步诊断】\s*([\s\S]*?)(?=\n【[^】]+】|$)/,
  )?.[1];
  if (!section) return "诊断待填写";

  const diagnoses = section
    .split("\n")
    .map((line) => line.trim().replace(/^\d+[.、]\s*/, ""))
    .filter(Boolean);
  return diagnoses.length > 0 ? diagnoses.join("；") : "诊断待填写";
}

function formatDate(value: string | null) {
  if (!value) return "尚未书写";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function currentDocument(chart: SourceSystemChart) {
  return (
    chart.documents.find((document) => document.status === "current") ??
    chart.documents.findLast((document) => document.status === "completed") ??
    chart.documents[0]
  );
}

function displayDiagnosis(diagnosis: string) {
  const value = diagnosis.trim();
  return value === "诊断待填写" ? "" : value;
}

function isLegacyQaPatient(chart: SourceSystemChart) {
  return LEGACY_QA_PATIENT_SIGNATURES.has(
    `${chart.patient.bedNo}|${chart.patient.name}`,
  );
}

function createNewPatientChart(
  input: NewPatientInput,
  wardOrder: number,
): SourceSystemChart {
  const createdAt = new Date().toISOString();
  const serial = Date.now().toString(36);
  const bedNo = input.bedNo.trim().replace(/床$/, "").padStart(2, "0");
  const patient = {
    id: `omfs-new-${serial}`,
    encounterId: `OMFS20260829${bedNo.padStart(3, "0")}-${serial.slice(-3).toUpperCase()}`,
    wardOrder,
    bedNo,
    name: input.name.trim(),
    gender: input.gender,
    age: input.age,
    diagnosis: "诊断待填写",
    stageLabel: "今日新入院",
    admissionDate: input.admissionDate,
    currentSituation: "今日新入院，等待完成入院记录和首次病程记录。",
    updatedAt: createdAt,
    sourceCounts: { records: 1, orders: 0, reports: 0 },
  } satisfies SourceSystemChart["patient"];

  const documentSpecs: Array<{
    templateKey: MedicalDocumentTemplateKey;
    title: string;
  }> = [
    { templateKey: "admission_record", title: "入院记录" },
    { templateKey: "first_progress", title: "首次病程记录" },
    { templateKey: "routine_progress", title: "次日病程记录" },
    { templateKey: "preoperative_summary", title: "术前小结" },
    { templateKey: "preoperative_discussion", title: "术前讨论记录" },
    { templateKey: "operation_record", title: "手术记录" },
  ];

  return {
    patient,
    documents: documentSpecs.map((item, index) => ({
      key: `${item.templateKey}-${serial}-${index}`,
      templateKey: item.templateKey,
      title: item.title,
      status: index === 0 ? ("current" as const) : ("not_started" as const),
      recordedAt: index === 0 ? createdAt : null,
      author: index === 0 ? "沈医生" : null,
      content: createDocumentFramework(patient, item.templateKey),
    })),
    records: [
      {
        id: `patient-master-${serial}`,
        type: "patient_master",
        label: "住院患者基本信息",
        recordedAt: createdAt,
        content: `${bedNo}床，${patient.name}，${patient.gender}，${patient.age}岁，入院日期：${patient.admissionDate}。`,
      },
    ],
  };
}

function handoffParagraph(editor: HandoffEditorState) {
  const patient = editor.result.patient;
  const diagnosis = displayDiagnosis(patient.diagnosis);
  const details = [...editor.fields, ...editor.customFields]
    .filter((field) => field.value.trim())
    .map(
      (field) =>
        `${field.label}：${field.value.trim().replace(/[。；;]+$/, "")}`,
    );
  return `${patient.bedNo}床 ${patient.name}，${patient.gender}，${patient.age}岁${diagnosis ? `，${diagnosis}` : ""}。${details.join("；")}。`;
}

function HighlightedSource({ content, quote }: { content: string; quote: string }) {
  const index = content.indexOf(quote);
  if (index < 0) return <p>{content}</p>;
  return (
    <p>
      {content.slice(0, index)}
      <mark>{quote}</mark>
      {content.slice(index + quote.length)}
    </p>
  );
}

export function ExtractionWorkspace({
  initialCharts,
  experience = "emr",
  autoImport = false,
}: ExtractionWorkspaceProps) {
  const isEmr = experience === "emr";
  const [charts, setCharts] = useState(initialCharts);
  const [module, setModule] = useState<MainModule>(
    isEmr ? "history" : "handoff",
  );
  const [search, setSearch] = useState("");
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [selectedDocumentKey, setSelectedDocumentKey] =
    useState<MedicalDocumentKey | null>(null);
  const [selectedHandoffId, setSelectedHandoffId] = useState<string | null>(null);
  const [handoffs, setHandoffs] = useState<Record<string, HandoffEditorState>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [refreshingPatientId, setRefreshingPatientId] = useState<string | null>(
    null,
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [changedPatientIds, setChangedPatientIds] = useState<string[]>([]);
  const [changedSourceRecordIds, setChangedSourceRecordIds] = useState<
    Record<string, string[]>
  >({});
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [isPrintGuardOpen, setIsPrintGuardOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeEvidence, setActiveEvidence] = useState<{
    patientId: string;
    fieldLabel: string;
    evidence: FieldEvidence;
  } | null>(null);

  const orderedCharts = useMemo(
    () => [...charts].sort((a, b) => a.patient.wardOrder - b.patient.wardOrder),
    [charts],
  );
  const visibleCharts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return orderedCharts.filter(({ patient }) =>
      [patient.bedNo, patient.name, patient.diagnosis, patient.stageLabel]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [orderedCharts, search]);
  const selectedHistory = charts.find(
    (chart) => chart.patient.id === selectedHistoryId,
  );
  const selectedDocument = selectedHistory?.documents.find(
    (document) => document.key === selectedDocumentKey,
  );
  const selectedHandoff = selectedHandoffId
    ? handoffs[selectedHandoffId]
    : null;
  const reviewedCount = Object.values(handoffs).filter(
    (handoff) => handoff.reviewed,
  ).length;
  const totalHandoffCount = Object.keys(handoffs).length;
  const hasExistingHandoffs = totalHandoffCount > 0;

  const evidenceRecord = activeEvidence
    ? handoffs[activeEvidence.patientId]?.result.sourceRecords.find(
        (record) => record.id === activeEvidence.evidence.sourceRecordId,
      )
    : null;

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      try {
        const removedPatientIds = new Set<string>();
        const presentationPatientIds = new Set(
          initialCharts.map((chart) => chart.patient.id),
        );
        const retainedPatientIds = new Set(presentationPatientIds);
        const wardOrderByPatientId = new Map(
          initialCharts.map((chart) => [
            chart.patient.id,
            chart.patient.wardOrder,
          ]),
        );
        const savedCharts = window.localStorage.getItem(CHARTS_STORAGE_KEY);
        const savedHandoffs = window.localStorage.getItem(HANDOFFS_STORAGE_KEY);
        const savedChangedPatients = window.localStorage.getItem(
          CHANGED_PATIENTS_STORAGE_KEY,
        );
        const savedChangedSources = window.localStorage.getItem(
          CHANGED_SOURCES_STORAGE_KEY,
        );
        if (savedCharts) {
          const parsedCharts = JSON.parse(savedCharts) as SourceSystemChart[];
          parsedCharts.forEach((chart) => {
            const isRetiredBuiltInPatient =
              chart.patient.id.startsWith("omfs-patient-") &&
              !presentationPatientIds.has(chart.patient.id);
            if (isLegacyQaPatient(chart) || isRetiredBuiltInPatient) {
              removedPatientIds.add(chart.patient.id);
            } else {
              retainedPatientIds.add(chart.patient.id);
            }
          });
          const retainedCharts = parsedCharts
            .filter(
              (chart) => !removedPatientIds.has(chart.patient.id),
            )
            .sort(
              (a, b) =>
                Number.parseInt(a.patient.bedNo, 10) -
                Number.parseInt(b.patient.bedNo, 10),
            )
            .map((chart, index) => ({
              ...chart,
              patient: { ...chart.patient, wardOrder: index + 1 },
            }));
          retainedCharts.forEach((chart) => {
            wardOrderByPatientId.set(
              chart.patient.id,
              chart.patient.wardOrder,
            );
          });
          setCharts(retainedCharts);
        }
        if (savedHandoffs) {
          const parsed = JSON.parse(savedHandoffs) as Record<
            string,
            HandoffEditorState
          >;
          setHandoffs(
            Object.fromEntries(
              Object.entries(parsed)
                .filter(
                  ([patientId]) =>
                    retainedPatientIds.has(patientId) &&
                    !removedPatientIds.has(patientId),
                )
                .map(([patientId, handoff]) => [
                  patientId,
                  {
                    ...handoff,
                    result: {
                      ...handoff.result,
                      patient: {
                        ...handoff.result.patient,
                        wardOrder:
                          wardOrderByPatientId.get(patientId) ??
                          handoff.result.patient.wardOrder,
                      },
                    },
                    customFields: handoff.customFields ?? [],
                    manuallyEditedFieldKeys:
                      handoff.manuallyEditedFieldKeys ?? [],
                  },
                ]),
            ),
          );
        }
        if (savedChangedPatients) {
          setChangedPatientIds(
            (JSON.parse(savedChangedPatients) as string[]).filter(
              (patientId) =>
                retainedPatientIds.has(patientId) &&
                !removedPatientIds.has(patientId),
            ),
          );
        }
        if (savedChangedSources) {
          const parsedChangedSources = JSON.parse(savedChangedSources) as Record<
            string,
            string[]
          >;
          setChangedSourceRecordIds(
            Object.fromEntries(
              Object.entries(parsedChangedSources).filter(
                ([patientId]) =>
                  retainedPatientIds.has(patientId) &&
                  !removedPatientIds.has(patientId),
              ),
            ),
          );
        }
      } catch {
        window.localStorage.removeItem(CHARTS_STORAGE_KEY);
        window.localStorage.removeItem(HANDOFFS_STORAGE_KEY);
        window.localStorage.removeItem(CHANGED_PATIENTS_STORAGE_KEY);
        window.localStorage.removeItem(CHANGED_SOURCES_STORAGE_KEY);
      } finally {
        setIsHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(hydrationTimer);
  }, [initialCharts]);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(CHARTS_STORAGE_KEY, JSON.stringify(charts));
  }, [charts, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(HANDOFFS_STORAGE_KEY, JSON.stringify(handoffs));
  }, [handoffs, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(
      CHANGED_PATIENTS_STORAGE_KEY,
      JSON.stringify(changedPatientIds),
    );
  }, [changedPatientIds, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(
      CHANGED_SOURCES_STORAGE_KEY,
      JSON.stringify(changedSourceRecordIds),
    );
  }, [changedSourceRecordIds, isHydrated]);

  function markPatientSourceChanged(
    patientId: string,
    sourceRecordId?: string,
  ) {
    setChangedPatientIds((current) =>
      current.includes(patientId) ? current : [...current, patientId],
    );
    if (!sourceRecordId) return;
    setChangedSourceRecordIds((current) => {
      const patientSources = current[patientId] ?? [];
      if (patientSources.includes(sourceRecordId)) return current;
      return {
        ...current,
        [patientId]: [...patientSources, sourceRecordId],
      };
    });
  }

  function openHistory(chart: SourceSystemChart) {
    const document = currentDocument(chart);
    setSelectedHistoryId(chart.patient.id);
    setSelectedDocumentKey(document.key);
  }

  function addPatient(input: NewPatientInput) {
    const bedNo = input.bedNo.trim().replace(/床$/, "").padStart(2, "0");
    if (charts.some((chart) => chart.patient.bedNo === bedNo)) {
      return `${bedNo}床已经有在院患者，请更换床号。`;
    }

    const chart = createNewPatientChart(input, charts.length + 1);
    setCharts((current) =>
      [...current, chart]
        .sort(
          (a, b) =>
            Number.parseInt(a.patient.bedNo, 10) -
            Number.parseInt(b.patient.bedNo, 10),
        )
        .map((item, index) => ({
          ...item,
          patient: { ...item.patient, wardOrder: index + 1 },
        })),
    );
    setIsAddingPatient(false);
    if (hasExistingHandoffs) markPatientSourceChanged(chart.patient.id);
    setSelectedHistoryId(chart.patient.id);
    setSelectedDocumentKey(chart.documents[0].key);
    setNotice(`${chart.patient.bedNo}床 ${chart.patient.name} 已入科，请完成入院记录。`);
    return null;
  }

  function switchModule(nextModule: MainModule) {
    setModule(nextModule);
    setSearch("");
    setSelectedHistoryId(null);
    setSelectedHandoffId(null);
    setActiveEvidence(null);
  }

  function updateDocument(content: string) {
    if (!selectedHistoryId || !selectedDocumentKey) return;
    markPatientSourceChanged(
      selectedHistoryId,
      `document-${selectedDocumentKey}`,
    );
    setCharts((current) =>
      current.map((chart) =>
        chart.patient.id !== selectedHistoryId
          ? chart
          : {
              ...chart,
              patient: {
                ...chart.patient,
                diagnosis:
                  chart.documents.find(
                    (document) => document.key === selectedDocumentKey,
                  )?.templateKey === "admission_record"
                    ? diagnosisFromAdmissionRecord(content)
                    : chart.patient.diagnosis,
                updatedAt: new Date().toISOString(),
              },
              documents: chart.documents.map((document) => {
                const startsSelectedDocument = chart.documents.some(
                  (item) =>
                    item.key === selectedDocumentKey &&
                    item.status === "not_started",
                );
                if (document.key === selectedDocumentKey) {
                  return {
                    ...document,
                    content,
                    status: startsSelectedDocument
                      ? ("current" as const)
                      : document.status,
                    recordedAt: document.recordedAt ?? new Date().toISOString(),
                    author: document.author ?? "沈医生",
                  };
                }
                if (startsSelectedDocument && document.status === "current") {
                  return { ...document, status: "completed" as const };
                }
                return document;
              }),
            },
      ),
    );
  }

  function addProgressDocument(patientId: string) {
    const chart = charts.find((item) => item.patient.id === patientId);
    if (!chart) return;

    const hasCompletedOperation = chart.documents.some(
      (document) =>
        document.templateKey === "operation_record" &&
        document.status !== "not_started",
    );
    const templateKey: MedicalDocumentTemplateKey = hasCompletedOperation
      ? "postoperative_progress"
      : "routine_progress";
    const writtenOfType = chart.documents.filter(
      (document) =>
        document.templateKey === templateKey &&
        document.status !== "not_started",
    ).length;
    const latestPostoperativeDay = Math.max(
      0,
      ...chart.documents
        .filter(
          (document) =>
            document.templateKey === "postoperative_progress" &&
            document.status !== "not_started",
        )
        .map((document) =>
          Number(document.title.match(/术后第(\d+)日/)?.[1] ?? 0),
        ),
    );
    const title =
      templateKey === "postoperative_progress"
        ? `术后第${latestPostoperativeDay + 1}日病程记录`
        : writtenOfType === 0
          ? "次日病程记录"
          : `日常病程记录（第${writtenOfType + 1}篇）`;
    const reusable = chart.documents.find(
      (document) =>
        document.templateKey === templateKey &&
        document.status === "not_started",
    );
    const nextKey =
      reusable?.key ?? `${templateKey}-${patientId}-${Date.now()}`;

    markPatientSourceChanged(patientId, `document-${nextKey}`);
    setCharts((current) =>
      current.map((item) => {
        if (item.patient.id !== patientId) return item;
        const demoted = item.documents.map((document) =>
          document.status === "current"
            ? { ...document, status: "completed" as const }
            : document,
        );
        if (reusable) {
          return {
            ...item,
            patient: { ...item.patient, updatedAt: new Date().toISOString() },
            documents: demoted.map((document) =>
              document.key === reusable.key
                ? {
                    ...document,
                    title,
                    status: "current" as const,
                    recordedAt: new Date().toISOString(),
                    author: "沈医生",
                  }
                : document,
            ),
          };
        }

        const firstFutureIndex = demoted.findIndex(
          (document) => document.status === "not_started",
        );
        const insertAt = firstFutureIndex < 0 ? demoted.length : firstFutureIndex;
        const nextDocument = {
          key: nextKey,
          templateKey,
          title,
          status: "current" as const,
          recordedAt: new Date().toISOString(),
          author: "沈医生",
          content: createDocumentFramework(item.patient, templateKey),
        };
        return {
          ...item,
          patient: { ...item.patient, updatedAt: new Date().toISOString() },
          documents: [
            ...demoted.slice(0, insertAt),
            nextDocument,
            ...demoted.slice(insertAt),
          ],
        };
      }),
    );
    setSelectedDocumentKey(nextKey);
    setNotice(`${title}已建立，可按框架直接书写。`);
  }

  function renameDocument(
    patientId: string,
    documentKey: MedicalDocumentKey,
    title: string,
  ) {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    setCharts((current) =>
      current.map((chart) =>
        chart.patient.id !== patientId
          ? chart
          : {
              ...chart,
              patient: {
                ...chart.patient,
                updatedAt: new Date().toISOString(),
              },
              documents: chart.documents.map((document) =>
                document.key === documentKey
                  ? { ...document, title: nextTitle }
                  : document,
              ),
            },
      ),
    );
    setNotice(`文书已重命名为“${nextTitle}”。`);
  }

  function deleteDocument(
    patientId: string,
    documentKey: MedicalDocumentKey,
  ) {
    const chart = charts.find((item) => item.patient.id === patientId);
    if (!chart) return;
    const removedIndex = chart.documents.findIndex(
      (document) => document.key === documentKey,
    );
    if (removedIndex < 0) return;
    markPatientSourceChanged(patientId, `document-${documentKey}`);
    const removed = chart.documents[removedIndex];
    let remaining = chart.documents.filter(
      (document) => document.key !== documentKey,
    );

    if (remaining.length === 0) {
      const starterKey = `admission_record-${patientId}-${Date.now()}`;
      remaining = [
        {
          key: starterKey,
          templateKey: "admission_record",
          title: "入院记录（新建）",
          status: "not_started",
          recordedAt: null,
          author: null,
          content: createDocumentFramework(chart.patient, "admission_record"),
        },
      ];
    }

    const nextDocument = remaining[Math.min(removedIndex, remaining.length - 1)];
    setCharts((current) =>
      current.map((item) =>
        item.patient.id === patientId
          ? {
              ...item,
              patient: {
                ...item.patient,
                updatedAt: new Date().toISOString(),
              },
              documents: remaining,
            }
          : item,
      ),
    );
    if (selectedDocumentKey === documentKey) {
      setSelectedDocumentKey(nextDocument.key);
    }
    setNotice(`已删除“${removed.title}”。`);
  }

  async function generateAllHandoffs() {
    setIsGenerating(true);
    setNotice(null);
    try {
      const results = await Promise.all(
        orderedCharts.map((chart) => generateHandoffCard(chart)),
      );
      setHandoffs(
        Object.fromEntries(
          results.map((result) => [
            result.patient.id,
            {
              result,
              fields: result.fields,
              customFields: [],
              manuallyEditedFieldKeys: [],
              reviewed: false,
            } satisfies HandoffEditorState,
          ]),
        ),
      );
      setChangedPatientIds([]);
      setChangedSourceRecordIds({});
      setModule("handoff");
      setSelectedHistoryId(null);
      setSelectedHandoffId(null);
      const usedFallback = results.some(
        (result) => result.mode === "demo_fallback",
      );
      setNotice(
        usedFallback
          ? `DeepSeek 暂时不可用，已加载明确标注的 ${results.length} 位虚构患者演示交班。`
          : `已按病区顺序生成 ${results.length} 位患者的交班记录。`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "全病区交班生成失败，请重试。",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function refreshPatientHandoff(patientId: string) {
    const chart = charts.find((item) => item.patient.id === patientId);
    if (!chart) return;
    const previous = handoffs[patientId];
    const changedSources = new Set(changedSourceRecordIds[patientId] ?? []);

    setRefreshingPatientId(patientId);
    setNotice(null);
    try {
      const result = await generateHandoffCard(chart);
      const updatedFieldLabels: string[] = [];
      const refreshedRecordMap = new Map(
        result.sourceRecords.map((record) => [record.id, record.content]),
      );
      const mergedFields = result.fields.map((candidate) => {
        const existing = previous?.fields.find(
          (field) => field.key === candidate.key,
        );
        if (!existing) {
          updatedFieldLabels.push(candidate.label);
          return candidate;
        }
        if (previous.manuallyEditedFieldKeys.includes(candidate.key)) {
          return existing;
        }
        const shouldReevaluateAttention =
          candidate.key === "attention" && changedSources.size > 0;
        const candidateUsesChangedSource = candidate.evidence.some((evidence) =>
          changedSources.has(evidence.sourceRecordId),
        );
        const existingEvidenceWasInvalidated = existing.evidence.some(
          (evidence) => {
            if (!changedSources.has(evidence.sourceRecordId)) return false;
            const latestSource = refreshedRecordMap.get(evidence.sourceRecordId);
            return !latestSource?.includes(evidence.quote);
          },
        );
        const fieldWasAffected =
          shouldReevaluateAttention ||
          candidateUsesChangedSource ||
          existingEvidenceWasInvalidated;
        if (changedSources.size > 0 && !fieldWasAffected) {
          return existing;
        }
        if (
          existing.value !== candidate.value ||
          JSON.stringify(existing.evidence) !== JSON.stringify(candidate.evidence)
        ) {
          updatedFieldLabels.push(candidate.label);
        }
        return candidate;
      });
      setHandoffs((current) => ({
        ...current,
        [patientId]: {
          result: { ...result, fields: mergedFields },
          fields: mergedFields,
          customFields: current[patientId]?.customFields ?? [],
          manuallyEditedFieldKeys:
            current[patientId]?.manuallyEditedFieldKeys ?? [],
          reviewed: false,
        },
      }));
      setChangedPatientIds((current) =>
        current.filter((id) => id !== patientId),
      );
      setChangedSourceRecordIds((current) => {
        const next = { ...current };
        delete next[patientId];
        return next;
      });
      setNotice(
        updatedFieldLabels.length > 0
          ? `${chart.patient.bedNo}床仅更新了${updatedFieldLabels.join("、")}；其余交班内容和其他患者交班未变。`
          : `${chart.patient.bedNo}床本次病历修改未影响现有交班内容，内容保持不变。`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "该患者交班刷新失败，请稍后重试。",
      );
    } finally {
      setRefreshingPatientId(null);
    }
  }

  function updateHandoffField(
    patientId: string,
    key: ExtractionField["key"],
    value: string,
  ) {
    setHandoffs((current) => ({
      ...current,
      [patientId]: {
        ...current[patientId],
        reviewed: false,
        manuallyEditedFieldKeys: current[patientId].manuallyEditedFieldKeys.includes(
          key,
        )
          ? current[patientId].manuallyEditedFieldKeys
          : [...current[patientId].manuallyEditedFieldKeys, key],
        fields: current[patientId].fields.map((field) =>
          field.key === key ? { ...field, value, evidence: [] } : field,
        ),
      },
    }));
  }

  function addCustomHandoffField(patientId: string) {
    setHandoffs((current) => {
      const handoff = current[patientId];
      return {
        ...current,
        [patientId]: {
          ...handoff,
          reviewed: false,
          customFields: [
            ...handoff.customFields,
            {
              id: `custom-${Date.now()}`,
              label: `补充内容 ${handoff.customFields.length + 1}`,
              value: "",
            },
          ],
        },
      };
    });
  }

  function updateCustomHandoffField(
    patientId: string,
    fieldId: string,
    patch: Partial<Pick<CustomHandoffField, "label" | "value">>,
  ) {
    setHandoffs((current) => ({
      ...current,
      [patientId]: {
        ...current[patientId],
        reviewed: false,
        customFields: current[patientId].customFields.map((field) =>
          field.id === fieldId ? { ...field, ...patch } : field,
        ),
      },
    }));
  }

  function deleteCustomHandoffField(patientId: string, fieldId: string) {
    setHandoffs((current) => ({
      ...current,
      [patientId]: {
        ...current[patientId],
        reviewed: false,
        customFields: current[patientId].customFields.filter(
          (field) => field.id !== fieldId,
        ),
      },
    }));
  }

  function reviewHandoff(patientId: string) {
    setHandoffs((current) => ({
      ...current,
      [patientId]: { ...current[patientId], reviewed: true },
    }));
    setNotice("该患者交班内容已核对。全部患者核对后可统一打印。");
  }

  function requestUnifiedPrint() {
    if (totalHandoffCount === 0) return;
    if (reviewedCount !== totalHandoffCount) {
      setIsPrintGuardOpen(true);
      return;
    }
    window.print();
  }

  return (
    <>
      <main className={styles.screenApp}>
        <header className={styles.appHeader}>
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              {isEmr ? <BookOpenText /> : <Clock3 />}
              <i />
            </span>
            <span>
              <strong>{isEmr ? "院内电子病历" : "准点交班"}</strong>
              <small>{isEmr ? "HOSPITAL EMR" : "HANDOFF ASSIST"}</small>
            </span>
          </div>
          <div className={styles.departmentIdentity}>
            <Stethoscope aria-hidden="true" />
            <span>
              <strong>口腔颌面头颈肿瘤科</strong>
              <small>{isEmr ? "住院医生工作站 · 病历书写" : "院内侧边应用 · 病历一键导入"}</small>
            </span>
          </div>
          <div className={styles.headerActions}>
            <span>沈医生 · 白班</span>
            {!isEmr && (
              <Link href="/">
                返回电子病历
                <ExternalLink />
              </Link>
            )}
          </div>
        </header>

        <div className={styles.appShell}>
          <nav
            className={`${styles.moduleRail} ${styles.singleModuleRail}`}
            aria-label="主要功能"
          >
            {isEmr ? (
              <button
                type="button"
                className={module === "history" ? styles.activeModule : ""}
                onClick={() => switchModule("history")}
              >
                <BookOpenText aria-hidden="true" />
                <strong>病历管理</strong>
                <small>{charts.length} 人</small>
              </button>
            ) : (
              <button
                type="button"
                className={module === "handoff" ? styles.activeModule : ""}
                onClick={() => switchModule("handoff")}
              >
                <ClipboardList aria-hidden="true" />
                <strong>交班管理</strong>
                <small>
                  {Object.keys(handoffs).length
                    ? `${reviewedCount}/${Object.keys(handoffs).length}`
                    : "待导入"}
                </small>
              </button>
            )}
            <div className={styles.railClock}>
              <time>18:45</time>
              <span>08.29</span>
            </div>
          </nav>

          <section className={styles.mainPane}>
            {isEmr && module === "history" && !selectedHistory && (
              <PatientBoard
                title="住院病历工作台"
                eyebrow="MEDICAL RECORDS"
                description="在院内电子病历中完成患者文书，交班整理由独立的准点交班助手完成。"
                charts={visibleCharts}
                totalCount={charts.length}
                search={search}
                onSearch={setSearch}
                onOpen={openHistory}
                action={
                  <>
                    <button
                      type="button"
                      className={styles.secondaryTopAction}
                      onClick={() => setIsAddingPatient(true)}
                    >
                      <UserPlus /> 新增患者
                    </button>
                    <Link
                      href={
                        hasExistingHandoffs
                          ? "/handoff"
                          : "/handoff?import=1"
                      }
                      className={styles.primaryTopAction}
                    >
                      <ExternalLink />
                      <span>
                        <strong>
                          {hasExistingHandoffs
                            ? "返回交班核对"
                            : "一键导入交班"}
                        </strong>
                        <small>
                          {hasExistingHandoffs
                            ? "保留已有修改与核对状态"
                            : "按交班模板提取 · 医生核对"}
                        </small>
                      </span>
                    </Link>
                  </>
                }
              />
            )}

            {isEmr && module === "history" && selectedHistory && selectedDocument && (
              <HistoryEditor
                chart={selectedHistory}
                selectedKey={selectedDocument.key}
                onSelect={setSelectedDocumentKey}
                onBack={() => setSelectedHistoryId(null)}
                onChange={updateDocument}
                onAdd={() => addProgressDocument(selectedHistory.patient.id)}
                onRename={(key, title) =>
                  renameDocument(selectedHistory.patient.id, key, title)
                }
                onDelete={(key) =>
                  deleteDocument(selectedHistory.patient.id, key)
                }
                onSave={() => setNotice(`${selectedDocument.title}已在演示工作台保存。`)}
                hasExistingHandoffs={hasExistingHandoffs}
              />
            )}

            {!isEmr && module === "handoff" && !selectedHandoff && (
              <HandoffBoard
                charts={visibleCharts}
                handoffs={handoffs}
                reviewedCount={reviewedCount}
                search={search}
                onSearch={setSearch}
                onOpen={setSelectedHandoffId}
                onGenerate={generateAllHandoffs}
                isGenerating={isGenerating}
                autoImport={autoImport}
                isReady={isHydrated}
                changedPatientIds={changedPatientIds}
                onPrint={requestUnifiedPrint}
              />
            )}

            {!isEmr && module === "handoff" && selectedHandoff && selectedHandoffId && (
              <HandoffEditor
                editor={selectedHandoff}
                onBack={() => setSelectedHandoffId(null)}
                onFieldChange={(key, value) =>
                  updateHandoffField(selectedHandoffId, key, value)
                }
                onAddCustomField={() =>
                  addCustomHandoffField(selectedHandoffId)
                }
                onCustomFieldChange={(fieldId, patch) =>
                  updateCustomHandoffField(selectedHandoffId, fieldId, patch)
                }
                onDeleteCustomField={(fieldId) =>
                  deleteCustomHandoffField(selectedHandoffId, fieldId)
                }
                onRefresh={() => refreshPatientHandoff(selectedHandoffId)}
                isRefreshing={refreshingPatientId === selectedHandoffId}
                hasSourceChanges={changedPatientIds.includes(selectedHandoffId)}
                onReview={() => reviewHandoff(selectedHandoffId)}
                reviewedCount={reviewedCount}
                totalCount={totalHandoffCount}
                onPrint={requestUnifiedPrint}
                onEvidence={(fieldLabel, evidence) =>
                  setActiveEvidence({
                    patientId: selectedHandoffId,
                    fieldLabel,
                    evidence,
                  })
                }
              />
            )}
          </section>
        </div>

        {activeEvidence && evidenceRecord && (
          <aside className={styles.sourceDrawer}>
            <header>
              <span>
                <small>
                  {activeEvidence.fieldLabel === "需要注意的病情"
                    ? "AI 判断依据"
                    : "原文对照"}
                  {" · "}{activeEvidence.fieldLabel}
                </small>
                <strong>{evidenceRecord.label}</strong>
              </span>
              <button
                type="button"
                aria-label="关闭原文对照"
                onClick={() => setActiveEvidence(null)}
              >
                <X />
              </button>
            </header>
            <div className={styles.sourceMeta}>
              <span>{formatDate(evidenceRecord.recordedAt)}</span>
              <span>{evidenceRecord.id}</span>
            </div>
            <HighlightedSource
              content={evidenceRecord.content}
              quote={activeEvidence.evidence.quote}
            />
          </aside>
        )}

        {isEmr && isAddingPatient && (
          <NewPatientDialog
            onClose={() => setIsAddingPatient(false)}
            onCreate={addPatient}
          />
        )}

        {!isEmr && isPrintGuardOpen && (
          <PrintReviewGuardDialog
            reviewedCount={reviewedCount}
            totalCount={totalHandoffCount}
            onClose={() => setIsPrintGuardOpen(false)}
            onContinueReview={() => {
              setIsPrintGuardOpen(false);
              setSelectedHandoffId(null);
            }}
          />
        )}

        {notice && (
          <div className={styles.notice} role="status">
            <CheckCircle2 aria-hidden="true" />
            <span>{notice}</span>
            <button type="button" aria-label="关闭提示" onClick={() => setNotice(null)}>
              <X />
            </button>
          </div>
        )}
      </main>

      {!isEmr && <section className={styles.printBoard}>
        <header>
          <span>口腔颌面头颈肿瘤科</span>
          <h1>病区交班记录</h1>
          <p>2026年8月29日 · 白班转夜班 · 交班医生：沈医生</p>
        </header>
        <div className={styles.printList}>
          {orderedCharts.map((chart) => {
            const editor = handoffs[chart.patient.id];
            return (
              <article key={chart.patient.id}>
                <div>
                  <span>{String(chart.patient.wardOrder).padStart(2, "0")}</span>
                  <strong>{chart.patient.bedNo}床 · {chart.patient.name}</strong>
                  <small>
                    {chart.patient.gender} / {chart.patient.age}岁
                    {displayDiagnosis(chart.patient.diagnosis)
                      ? ` · ${displayDiagnosis(chart.patient.diagnosis)}`
                      : ""}
                  </small>
                </div>
                <p>
                  {editor
                    ? handoffParagraph(editor)
                    : "交班记录尚未生成，请返回工作台完成生成和核对。"}
                </p>
              </article>
            );
          })}
        </div>
        <footer>
          <span>交班医生签名：________________</span>
          <span>接班医生签名：________________</span>
          <span>打印时间：________________</span>
        </footer>
      </section>}
    </>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <header className={styles.pageHeader}>
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className={styles.pageActions}>{children}</div>
    </header>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className={styles.searchBar}>
      <Search aria-hidden="true" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="搜索床号、姓名、疾病或阶段"
        aria-label="搜索患者"
      />
    </label>
  );
}

function NewPatientDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: NewPatientInput) => string | null;
}) {
  const [form, setForm] = useState<NewPatientInput>({
    name: "",
    gender: "男",
    age: 40,
    bedNo: "",
    admissionDate: "2026-08-29",
  });
  const [error, setError] = useState("");

  function update<K extends keyof NewPatientInput>(
    key: K,
    value: NewPatientInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  return (
    <div className={styles.dialogBackdrop} onMouseDown={onClose}>
      <section
        className={styles.patientDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-patient-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <span>
            <small>NEW ADMISSION</small>
            <strong id="new-patient-title">新增入院患者</strong>
            <p>建立患者基本信息后，系统会直接打开预填框架的入院记录。</p>
          </span>
          <button type="button" aria-label="关闭新增患者窗口" onClick={onClose}>
            <X />
          </button>
        </header>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const message = onCreate(form);
            if (message) setError(message);
          }}
        >
          <div className={styles.patientFormGrid}>
            <label>
              <span>姓名</span>
              <input
                required
                autoFocus
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="请输入患者姓名"
              />
            </label>
            <label>
              <span>性别</span>
              <select
                value={form.gender}
                onChange={(event) =>
                  update("gender", event.target.value as "男" | "女")
                }
              >
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </label>
            <label>
              <span>年龄</span>
              <input
                required
                type="number"
                min={1}
                max={120}
                value={form.age}
                onChange={(event) => update("age", Number(event.target.value))}
              />
            </label>
            <label>
              <span>床号</span>
              <input
                required
                inputMode="numeric"
                maxLength={3}
                value={form.bedNo}
                onChange={(event) => update("bedNo", event.target.value)}
                placeholder="如 18"
              />
            </label>
            <label>
              <span>入院日期</span>
              <input
                required
                type="date"
                value={form.admissionDate}
                onChange={(event) => update("admissionDate", event.target.value)}
              />
            </label>
          </div>
          {error && <p className={styles.formError}>{error}</p>}
          <footer>
            <span><ShieldCheck /> 演示环境，请勿填写真实患者信息</span>
            <div>
              <button type="button" onClick={onClose}>取消</button>
              <button type="submit"><Plus /> 建立患者并书写病历</button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}

function PrintReviewGuardDialog({
  reviewedCount,
  totalCount,
  onClose,
  onContinueReview,
}: {
  reviewedCount: number;
  totalCount: number;
  onClose: () => void;
  onContinueReview: () => void;
}) {
  const pendingCount = Math.max(totalCount - reviewedCount, 0);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className={styles.dialogBackdrop} onMouseDown={onClose}>
      <section
        className={`${styles.patientDialog} ${styles.printGuardDialog}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-review-title"
        aria-describedby="print-review-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <span>
            <small>PRINT CHECK</small>
            <strong id="print-review-title">完成核对后再统一打印</strong>
            <p id="print-review-description">
              交班单包含全病区患者，打印前必须逐位确认交班内容。
            </p>
          </span>
          <button type="button" aria-label="关闭打印核对提示" onClick={onClose}>
            <X />
          </button>
        </header>
        <div className={styles.printGuardBody}>
          <span className={styles.printGuardIcon} aria-hidden="true">
            <FileCheck2 />
          </span>
          <div>
            <strong>还有 {pendingCount} 位患者待核对</strong>
            <p>
              当前已核对 {reviewedCount}/{totalCount} 位。请先打开待核对患者，检查并确认交班内容后再打印。
            </p>
            <div
              className={styles.printGuardProgress}
              role="progressbar"
              aria-label="患者交班核对进度"
              aria-valuemin={0}
              aria-valuemax={totalCount}
              aria-valuenow={reviewedCount}
            >
              <i
                style={{
                  width: `${totalCount > 0 ? (reviewedCount / totalCount) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
        <footer className={styles.printGuardFooter}>
          <button type="button" onClick={onClose}>暂不打印</button>
          <button type="button" autoFocus onClick={onContinueReview}>
            <ClipboardList /> 查看待核对患者
          </button>
        </footer>
      </section>
    </div>
  );
}

function PatientBoard({
  title,
  eyebrow,
  description,
  charts,
  totalCount,
  search,
  onSearch,
  onOpen,
  action,
}: {
  title: string;
  eyebrow: string;
  description: string;
  charts: SourceSystemChart[];
  totalCount: number;
  search: string;
  onSearch: (value: string) => void;
  onOpen: (chart: SourceSystemChart) => void;
  action: React.ReactNode;
}) {
  return (
    <div className={styles.page}>
      <PageHeader eyebrow={eyebrow} title={title} description={description}>
        {action}
      </PageHeader>
      <div className={styles.boardToolbar}>
        <SearchBar value={search} onChange={onSearch} />
        <div className={styles.boardStats}>
          <span><Users /> 共{totalCount}位患者</span>
          <span><FileCheck2 /> 文书阶段各不相同</span>
          <span><ShieldCheck /> 全部为虚构数据</span>
        </div>
      </div>
      <div className={styles.patientGrid}>
        {charts.map((chart) => {
          return (
            <button
              type="button"
              className={styles.patientCard}
              key={chart.patient.id}
              onClick={() => onOpen(chart)}
            >
              <header>
                <strong className={styles.compactBedNo}>{chart.patient.bedNo}床</strong>
                <span className={styles.stageBadge}>{chart.patient.stageLabel}</span>
              </header>
              <div className={styles.compactPatientInfo}>
                <span>
                  <b>{chart.patient.name}</b>
                  <small>{chart.patient.gender} · {chart.patient.age}岁</small>
                </span>
                {displayDiagnosis(chart.patient.diagnosis) && (
                  <h2>{displayDiagnosis(chart.patient.diagnosis)}</h2>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HistoryEditor({
  chart,
  selectedKey,
  onSelect,
  onBack,
  onChange,
  onAdd,
  onRename,
  onDelete,
  onSave,
  hasExistingHandoffs,
}: {
  chart: SourceSystemChart;
  selectedKey: MedicalDocumentKey;
  onSelect: (key: MedicalDocumentKey) => void;
  onBack: () => void;
  onChange: (value: string) => void;
  onAdd: () => void;
  onRename: (key: MedicalDocumentKey, title: string) => void;
  onDelete: (key: MedicalDocumentKey) => void;
  onSave: () => void;
  hasExistingHandoffs: boolean;
}) {
  const document = chart.documents.find((item) => item.key === selectedKey)!;
  const [renamingKey, setRenamingKey] = useState<MedicalDocumentKey | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [pendingDeleteKey, setPendingDeleteKey] =
    useState<MedicalDocumentKey | null>(null);

  function startRename(key: MedicalDocumentKey, title: string) {
    setPendingDeleteKey(null);
    setRenamingKey(key);
    setTitleDraft(title);
  }

  function finishRename() {
    if (!renamingKey || !titleDraft.trim()) return;
    onRename(renamingKey, titleDraft);
    setRenamingKey(null);
    setTitleDraft("");
  }

  function confirmDelete(key: MedicalDocumentKey) {
    onDelete(key);
    setPendingDeleteKey(null);
    if (renamingKey === key) {
      setRenamingKey(null);
      setTitleDraft("");
    }
  }

  return (
    <div className={styles.editorPage}>
      <header className={styles.editorTopbar}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          <ArrowLeft /> 返回患者列表
        </button>
        <div>
          <span>{chart.patient.bedNo}床</span>
          <strong>{chart.patient.name}</strong>
          <small>
            {chart.patient.gender} / {chart.patient.age}岁
            {displayDiagnosis(chart.patient.diagnosis)
              ? ` · ${displayDiagnosis(chart.patient.diagnosis)}`
              : ""}
          </small>
        </div>
        <Link
          href={hasExistingHandoffs ? "/handoff" : "/handoff?import=1"}
          className={styles.primaryTopAction}
        >
          <ExternalLink />
          <span>
            <strong>
              {hasExistingHandoffs ? "返回交班核对" : "一键导入交班"}
            </strong>
            <small>
              {hasExistingHandoffs
                ? "本次修改不会自动覆盖交班"
                : "按交班模板提取 · 医生核对"}
            </small>
          </span>
        </Link>
      </header>
      <div className={styles.editorShell}>
        <aside className={styles.documentTimeline}>
          <header>
            <span>
              <small>DYNAMIC RECORDS</small>
              <strong>动态病历时间线</strong>
            </span>
            <button type="button" className={styles.addDocumentButton} onClick={onAdd}>
              <Plus /> 新增病程
            </button>
          </header>
          <div>
            {chart.documents.map((item, index) => (
              <div
                key={item.key}
                className={`${styles.documentRow} ${selectedKey === item.key ? styles.activeDocument : ""} ${item.status === "not_started" ? styles.futureDocument : ""}`}
              >
                <button
                  type="button"
                  className={styles.documentSelect}
                  onClick={() => onSelect(item.key)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>
                      {item.status === "not_started"
                        ? "待书写"
                        : item.status === "current"
                          ? "今日文书"
                          : "已完成"}
                    </small>
                  </span>
                </button>
                <div className={styles.documentRowActions}>
                  {pendingDeleteKey === item.key ? (
                    <>
                      <button
                        type="button"
                        className={styles.confirmDeleteButton}
                        onClick={() => confirmDelete(item.key)}
                      >
                        确认删除
                      </button>
                      <button
                        type="button"
                        aria-label={`取消删除${item.title}`}
                        onClick={() => setPendingDeleteKey(null)}
                      >
                        <X />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-label={`修改${item.title}标题`}
                        title="修改标题"
                        onClick={() => startRename(item.key, item.title)}
                      >
                        <PenLine />
                      </button>
                      <button
                        type="button"
                        aria-label={`删除${item.title}`}
                        title="删除文书"
                        onClick={() => {
                          setRenamingKey(null);
                          setPendingDeleteKey(item.key);
                        }}
                      >
                        <Trash2 />
                      </button>
                    </>
                  )}
                </div>
                {renamingKey === item.key && (
                  <div className={styles.titleEditor}>
                    <input
                      value={titleDraft}
                      onChange={(event) => setTitleDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") finishRename();
                        if (event.key === "Escape") setRenamingKey(null);
                      }}
                      maxLength={40}
                      aria-label="文书标题"
                      autoFocus
                    />
                    <button type="button" onClick={finishRename}>
                      <Check /> 保存
                    </button>
                    <button type="button" onClick={() => setRenamingKey(null)}>
                      取消
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>
        <section className={styles.documentEditor}>
          <header>
            <div>
              <span>
                <PenLine /> {document.status === "not_started" ? "新建文书" : "编辑文书"}
              </span>
              <h1>{document.title}</h1>
              <p>
                {formatDate(document.recordedAt)} · {document.author ?? "未签名"} · 自动保存关闭
              </p>
              {document.status === "not_started" && (
                <small className={styles.frameworkHint}>科室框架已预填，可直接在下方补写。</small>
              )}
            </div>
            <span className={document.status === "not_started" ? styles.pendingDocument : styles.savedDocument}>
              {document.status === "not_started" ? "待书写" : "已保存草稿"}
            </span>
          </header>
          <div className={styles.patientStrip}>
            <span><small>姓名</small><strong>{chart.patient.name}</strong></span>
            <span><small>性别</small><strong>{chart.patient.gender}</strong></span>
            <span><small>年龄</small><strong>{chart.patient.age}岁</strong></span>
            <span><small>住院号</small><strong>{chart.patient.encounterId}</strong></span>
            <span><small>床号</small><strong>{chart.patient.bedNo}床</strong></span>
          </div>
          <textarea
            value={document.content}
            onChange={(event) => onChange(event.target.value)}
            placeholder={`按照科室模板书写${document.title}……`}
            aria-label={`${document.title}书写区`}
          />
          <footer>
            <span><ShieldCheck /> 演示病历，仅使用虚构患者信息</span>
            <div>
              <small>{document.content.length} 字</small>
              <button type="button" onClick={onSave}>
                <Save /> 保存当前文书
              </button>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}

function HandoffBoard({
  charts,
  handoffs,
  reviewedCount,
  search,
  onSearch,
  onOpen,
  onGenerate,
  isGenerating,
  autoImport,
  isReady,
  changedPatientIds,
  onPrint,
}: {
  charts: SourceSystemChart[];
  handoffs: Record<string, HandoffEditorState>;
  reviewedCount: number;
  search: string;
  onSearch: (value: string) => void;
  onOpen: (patientId: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  autoImport: boolean;
  isReady: boolean;
  changedPatientIds: string[];
  onPrint: () => void;
}) {
  const hasHandoffs = Object.keys(handoffs).length > 0;
  const importStarted = useRef(false);

  useEffect(() => {
    if (!isReady || !autoImport || hasHandoffs || importStarted.current) return;
    importStarted.current = true;
    void onGenerate();
  }, [autoImport, hasHandoffs, isReady, onGenerate]);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="HANDOFF TEMPLATE"
        title="交班核对"
        description="按入院概况、最新病程和必要的术前记录整理目前病情；AI 只提出本夜观察重点。"
      >
        {hasHandoffs && (
          <span className={styles.savedHandoffNotice}>
            <ShieldCheck /> 已保留本次交班草稿
          </span>
        )}
        <button
          type="button"
          className={styles.printTopAction}
          onClick={onPrint}
          disabled={!hasHandoffs}
        >
          <Printer />
          <span>
            <strong>统一打印交班</strong>
            <small>{hasHandoffs ? `${reviewedCount}/${Object.keys(handoffs).length} 已核对` : "请先生成"}</small>
          </span>
        </button>
      </PageHeader>

      <section className={styles.handoffTemplateBar}>
        <span><ClipboardList /></span>
        <div>
          <small>当前交班模板</small>
          <strong>患者基本信息 + 病情摘录 + AI 注意建议</strong>
        </div>
        <ul>
          {["姓名", "性别", "年龄", "床号", "诊断", "目前病情", "需要注意的病情"].map((field) => (
            <li key={field}>{field}</li>
          ))}
        </ul>
      </section>

      {!hasHandoffs ? (
        <div className={styles.handoffEmpty}>
          <span><ClipboardList /></span>
          <small>ONE-CLICK IMPORT</small>
          <h2>从病历直接生成交班</h2>
          <p>系统先整合入院概况、最新病程及必要的术前记录，再由 AI 单独判断今晚夜班观察重点，全部交由医生核对。</p>
          <button type="button" onClick={onGenerate} disabled={isGenerating}>
            {isGenerating ? <LoaderCircle className={styles.spin} /> : <Sparkles />}
            {isGenerating ? `正在提取 ${charts.length} 位患者` : "从病历一键导入交班"}
          </button>
        </div>
      ) : (
        <>
          <div className={styles.boardToolbar}>
            <SearchBar value={search} onChange={onSearch} />
            <div className={styles.reviewSummary}>
              <span>{reviewedCount}</span> / {Object.keys(handoffs).length} 位患者已核对
              <i><b style={{ width: `${(reviewedCount / Object.keys(handoffs).length) * 100}%` }} /></i>
            </div>
          </div>
          <div className={styles.patientGrid}>
            {charts.map((chart) => {
              const editor = handoffs[chart.patient.id];
              if (!editor) return null;
              const hasSourceChanges = changedPatientIds.includes(
                chart.patient.id,
              );
              const important = editor.fields
                .filter((field) => field.value)
                .map((field) => field.value.trim().replace(/[。；;]+$/, ""))
                .join("；");
              return (
                <button
                  type="button"
                  className={`${styles.patientCard} ${styles.handoffCard}`}
                  key={chart.patient.id}
                  onClick={() => onOpen(chart.patient.id)}
                >
                  <header>
                    <span className={styles.orderIndex}>{String(chart.patient.wardOrder).padStart(2, "0")}</span>
                    <span className={styles.handoffCardStatuses}>
                      {hasSourceChanges && (
                        <em className={styles.sourceChangedStatus}>
                          <RefreshCw /> 病历有更新
                        </em>
                      )}
                      <span className={editor.reviewed ? styles.reviewedStatus : styles.reviewStatus}>
                        {editor.reviewed ? <CheckCircle2 /> : <PenLine />}
                        {editor.reviewed ? "已核对" : "待核对"}
                      </span>
                    </span>
                  </header>
                  <div className={styles.patientTitle}>
                    <strong>{chart.patient.bedNo}床</strong>
                    <span><b>{chart.patient.name}</b><small>{chart.patient.gender} · {chart.patient.age}岁</small></span>
                  </div>
                  {displayDiagnosis(chart.patient.diagnosis) && (
                    <h2>{displayDiagnosis(chart.patient.diagnosis)}</h2>
                  )}
                  <p>{important || "病历中没有可提取的病情重点，待医生检查补充。"}</p>
                  <footer>
                    <span>
                      {[...editor.fields, ...editor.customFields].filter(
                        (field) => field.value.trim(),
                      ).length} 项内容
                    </span>
                    <strong>核对交班内容 <ChevronRight /></strong>
                  </footer>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function HandoffEditor({
  editor,
  onBack,
  onFieldChange,
  onAddCustomField,
  onCustomFieldChange,
  onDeleteCustomField,
  onRefresh,
  isRefreshing,
  hasSourceChanges,
  onReview,
  reviewedCount,
  totalCount,
  onPrint,
  onEvidence,
}: {
  editor: HandoffEditorState;
  onBack: () => void;
  onFieldChange: (key: ExtractionField["key"], value: string) => void;
  onAddCustomField: () => void;
  onCustomFieldChange: (
    fieldId: string,
    patch: Partial<Pick<CustomHandoffField, "label" | "value">>,
  ) => void;
  onDeleteCustomField: (fieldId: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  hasSourceChanges: boolean;
  onReview: () => void;
  reviewedCount: number;
  totalCount: number;
  onPrint: () => void;
  onEvidence: (fieldLabel: string, evidence: FieldEvidence) => void;
}) {
  const patient = editor.result.patient;
  return (
    <div className={styles.handoffEditorPage}>
      <header className={styles.editorTopbar}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          <ArrowLeft /> 返回交班患者列表
        </button>
        <div>
          <span>{patient.bedNo}床</span>
          <strong>{patient.name}</strong>
          <small>
            {patient.gender} / {patient.age}岁
            {displayDiagnosis(patient.diagnosis)
              ? ` · ${displayDiagnosis(patient.diagnosis)}`
              : ""}
          </small>
        </div>
        <button type="button" className={styles.printTopAction} onClick={onPrint}>
          <Printer />
          <span><strong>统一打印交班</strong><small>{reviewedCount}/{totalCount} 已核对</small></span>
        </button>
      </header>
      <div className={styles.handoffEditorShell}>
        <aside className={styles.handoffPatientInfo}>
          <span className={styles.largeOrder}>{String(patient.wardOrder).padStart(2, "0")}</span>
          <small>PATIENT HANDOFF</small>
          <h2>{patient.bedNo}床 · {patient.name}</h2>
          {displayDiagnosis(patient.diagnosis) && (
            <p>{displayDiagnosis(patient.diagnosis)}</p>
          )}
          <dl>
            <div><dt>性别 / 年龄</dt><dd>{patient.gender} / {patient.age}岁</dd></div>
            <div><dt>当前阶段</dt><dd>{patient.stageLabel}</dd></div>
            <div><dt>住院号</dt><dd>{patient.encounterId}</dd></div>
          </dl>
          <div className={styles.paragraphPreview}>
            <small>统一打印段落预览</small>
            <p>{handoffParagraph(editor)}</p>
          </div>
        </aside>
        <section className={styles.handoffForm}>
          <header>
            <span>
              <PenLine /> 医生核对与补充
              {hasSourceChanges && (
                <em className={styles.inlineSourceChanged}>
                  病历有新修改
                </em>
              )}
            </span>
            <div className={styles.handoffHeaderActions}>
              <button
                type="button"
                className={`${styles.refreshPatientButton} ${hasSourceChanges ? styles.refreshPatientButtonActive : ""}`}
                onClick={onRefresh}
                disabled={isRefreshing}
                title="只重新提取当前患者，其他患者及医生补充内容保持不变"
              >
                {isRefreshing ? (
                  <LoaderCircle className={styles.spin} />
                ) : (
                  <RefreshCw />
                )}
                <span>
                  <strong>{isRefreshing ? "正在刷新" : "刷新此患者"}</strong>
                  <small>仅更新受影响内容</small>
                </span>
              </button>
              <button
                type="button"
                className={styles.addHandoffFieldButton}
                onClick={onAddCustomField}
              >
                <Plus /> 添加内容
              </button>
              <strong className={editor.reviewed ? styles.reviewedStatus : styles.reviewStatus}>
                {editor.reviewed ? <CheckCircle2 /> : <PenLine />}
                {editor.reviewed ? "已核对" : "待核对"}
              </strong>
            </div>
          </header>
          <div className={styles.handoffFields}>
            {extractionFieldConfig.map((config, index) => {
              const field = editor.fields.find((item) => item.key === config.key)!;
              const isAiSuggestion = config.key === "attention";
              const isManuallyEdited = editor.manuallyEditedFieldKeys.includes(
                field.key,
              );
              return (
                <section
                  key={config.key}
                  className={`${!field.value ? styles.emptyHandoffField : ""} ${isAiSuggestion ? styles.aiSuggestionField : ""}`}
                >
                  <header>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div><strong>{config.label}</strong><small>{config.hint}</small></div>
                    {isManuallyEdited ? (
                      <em className={styles.manuallyProtectedField}>
                        医生已修改 · 刷新保护
                      </em>
                    ) : isAiSuggestion && field.value ? (
                      <em className={styles.aiSuggestionBadge}>
                        AI 建议 · 待医生确认
                      </em>
                    ) : (
                      !field.value && <em>待医生补充</em>
                    )}
                  </header>
                  <textarea
                    value={field.value}
                    onChange={(event) => onFieldChange(field.key, event.target.value)}
                    placeholder={
                      isAiSuggestion
                        ? "AI 未给出本夜观察建议，请医生根据病情补充"
                        : "病程原文未提供，保持空白或由医生补充"
                    }
                    aria-label={config.label}
                  />
                  {field.evidence.length > 0 && (
                    <div className={styles.evidenceRow}>
                      <small>{isAiSuggestion ? "判断依据" : "原文依据"}</small>
                      {field.evidence.map((evidence, evidenceIndex) => (
                        <button
                          type="button"
                          key={`${evidence.sourceRecordId}-${evidenceIndex}`}
                          onClick={() => onEvidence(field.label, evidence)}
                        >
                          {isAiSuggestion ? "依据" : "原文"}{" "}
                          {String(evidenceIndex + 1).padStart(2, "0")}
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
            {editor.customFields.map((field, index) => (
              <section
                key={field.id}
                className={`${styles.customHandoffField} ${!field.value ? styles.emptyHandoffField : ""}`}
              >
                <header>
                  <span>
                    {String(extractionFieldConfig.length + index + 1).padStart(
                      2,
                      "0",
                    )}
                  </span>
                  <div>
                    <input
                      value={field.label}
                      onChange={(event) =>
                        onCustomFieldChange(field.id, {
                          label: event.target.value,
                        })
                      }
                      aria-label="补充内容标题"
                      maxLength={20}
                    />
                    <small>医生自定义补充项，将进入交班段落和打印内容</small>
                  </div>
                  <button
                    type="button"
                    className={styles.deleteHandoffFieldButton}
                    onClick={() => onDeleteCustomField(field.id)}
                    aria-label={`删除${field.label || "补充内容"}`}
                    title="删除内容"
                  >
                    <Trash2 />
                  </button>
                </header>
                <textarea
                  value={field.value}
                  onChange={(event) =>
                    onCustomFieldChange(field.id, {
                      value: event.target.value,
                    })
                  }
                  placeholder="填写需要补充到本次交班的内容"
                  aria-label={`${field.label || "补充内容"}正文`}
                />
              </section>
            ))}
          </div>
          <footer className={styles.reviewFooter}>
            <span><ShieldCheck /> 目前病情来自分层原文摘录；注意事项仅限本夜观察，必须由医生核对。</span>
            <button type="button" onClick={onReview}>
              <CheckCircle2 /> {editor.reviewed ? "已确认无误" : "确认该患者交班"}
            </button>
          </footer>
        </section>
      </div>
    </div>
  );
}
