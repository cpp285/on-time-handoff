"use client";

import {
  ArrowLeft,
  BookOpenText,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileCheck2,
  LoaderCircle,
  PenLine,
  Plus,
  Printer,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

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

interface HandoffEditorState {
  result: ExtractionResult;
  fields: ExtractionField[];
  supplement: string;
  reviewed: boolean;
}

interface ExtractionWorkspaceProps {
  initialCharts: SourceSystemChart[];
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

function handoffParagraph(editor: HandoffEditorState) {
  const patient = editor.result.patient;
  const details = editor.fields
    .filter((field) => field.value.trim())
    .map((field) => `${field.label}：${field.value.trim()}`);
  if (editor.supplement.trim()) {
    details.push(`医生补充：${editor.supplement.trim()}`);
  }
  return `${patient.bedNo}床 ${patient.name}，${patient.gender}，${patient.age}岁，${patient.diagnosis}。${details.join("；")}。`;
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

export function ExtractionWorkspace({ initialCharts }: ExtractionWorkspaceProps) {
  const [charts, setCharts] = useState(initialCharts);
  const [module, setModule] = useState<MainModule>("history");
  const [search, setSearch] = useState("");
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [selectedDocumentKey, setSelectedDocumentKey] =
    useState<MedicalDocumentKey | null>(null);
  const [selectedHandoffId, setSelectedHandoffId] = useState<string | null>(null);
  const [handoffs, setHandoffs] = useState<Record<string, HandoffEditorState>>({});
  const [isGenerating, setIsGenerating] = useState(false);
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

  const evidenceRecord = activeEvidence
    ? handoffs[activeEvidence.patientId]?.result.sourceRecords.find(
        (record) => record.id === activeEvidence.evidence.sourceRecordId,
      )
    : null;

  function openHistory(chart: SourceSystemChart) {
    const document = currentDocument(chart);
    setSelectedHistoryId(chart.patient.id);
    setSelectedDocumentKey(document.key);
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
    setCharts((current) =>
      current.map((chart) =>
        chart.patient.id !== selectedHistoryId
          ? chart
          : {
              ...chart,
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
          ? { ...item, documents: remaining }
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
        orderedCharts.map((chart) => generateHandoffCard(chart.patient.id)),
      );
      setHandoffs(
        Object.fromEntries(
          results.map((result) => [
            result.patient.id,
            {
              result,
              fields: result.fields,
              supplement: "",
              reviewed: false,
            } satisfies HandoffEditorState,
          ]),
        ),
      );
      setModule("handoff");
      setSelectedHistoryId(null);
      setSelectedHandoffId(null);
      const usedFallback = results.some(
        (result) => result.mode === "demo_fallback",
      );
      setNotice(
        usedFallback
          ? "DeepSeek 暂时不可用，已加载明确标注的五位虚构患者演示交班。"
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
        fields: current[patientId].fields.map((field) =>
          field.key === key ? { ...field, value } : field,
        ),
      },
    }));
  }

  function updateSupplement(patientId: string, supplement: string) {
    setHandoffs((current) => ({
      ...current,
      [patientId]: {
        ...current[patientId],
        supplement,
        reviewed: false,
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

  return (
    <>
      <main className={styles.screenApp}>
        <header className={styles.appHeader}>
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              <Clock3 />
              <i />
            </span>
            <span>
              <strong>准点交班</strong>
              <small>EMR HANDOFF ASSIST</small>
            </span>
          </div>
          <div className={styles.departmentIdentity}>
            <Stethoscope aria-hidden="true" />
            <span>
              <strong>口腔颌面头颈肿瘤科</strong>
              <small>住院医生工作站 · 5位虚构患者</small>
            </span>
          </div>
          <div className={styles.headerActions}>
            <span>沈医生 · 白班</span>
            <Link href="/board">旧版实验看板</Link>
          </div>
        </header>

        <div className={styles.appShell}>
          <nav className={styles.moduleRail} aria-label="主要功能">
            <button
              type="button"
              className={module === "history" ? styles.activeModule : ""}
              onClick={() => switchModule("history")}
            >
              <BookOpenText aria-hidden="true" />
              <strong>病史</strong>
              <small>{charts.length} 人</small>
            </button>
            <button
              type="button"
              className={module === "handoff" ? styles.activeModule : ""}
              onClick={() => switchModule("handoff")}
            >
              <ClipboardList aria-hidden="true" />
              <strong>交班</strong>
              <small>
                {Object.keys(handoffs).length
                  ? `${reviewedCount}/${Object.keys(handoffs).length}`
                  : "待生成"}
              </small>
            </button>
            <div className={styles.railClock}>
              <time>18:45</time>
              <span>08.29</span>
            </div>
          </nav>

          <section className={styles.mainPane}>
            {module === "history" && !selectedHistory && (
              <PatientBoard
                title="病史工作台"
                eyebrow="MEDICAL RECORDS"
                description="先完成病历书写，再从已保存资料自动整理全病区交班。"
                charts={visibleCharts}
                search={search}
                onSearch={setSearch}
                onOpen={openHistory}
                action={
                  <button
                    type="button"
                    className={styles.primaryTopAction}
                    onClick={generateAllHandoffs}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <LoaderCircle className={styles.spin} />
                    ) : (
                      <Sparkles />
                    )}
                    <span>
                      <strong>
                        {isGenerating ? "正在整理全病区" : "一键生成全病区交班"}
                      </strong>
                      <small>按床位顺序 · 无需复制粘贴</small>
                    </span>
                  </button>
                }
              />
            )}

            {module === "history" && selectedHistory && selectedDocument && (
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
                onGenerate={generateAllHandoffs}
                isGenerating={isGenerating}
              />
            )}

            {module === "handoff" && !selectedHandoff && (
              <HandoffBoard
                charts={visibleCharts}
                handoffs={handoffs}
                reviewedCount={reviewedCount}
                search={search}
                onSearch={setSearch}
                onOpen={setSelectedHandoffId}
                onGenerate={generateAllHandoffs}
                isGenerating={isGenerating}
              />
            )}

            {module === "handoff" && selectedHandoff && selectedHandoffId && (
              <HandoffEditor
                editor={selectedHandoff}
                onBack={() => setSelectedHandoffId(null)}
                onFieldChange={(key, value) =>
                  updateHandoffField(selectedHandoffId, key, value)
                }
                onSupplementChange={(value) =>
                  updateSupplement(selectedHandoffId, value)
                }
                onReview={() => reviewHandoff(selectedHandoffId)}
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
                <small>原文对照 · {activeEvidence.fieldLabel}</small>
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

      <section className={styles.printBoard}>
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
                  <small>{chart.patient.gender} / {chart.patient.age}岁 · {chart.patient.diagnosis}</small>
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
      </section>
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

function PatientBoard({
  title,
  eyebrow,
  description,
  charts,
  search,
  onSearch,
  onOpen,
  action,
}: {
  title: string;
  eyebrow: string;
  description: string;
  charts: SourceSystemChart[];
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
          <span><Users /> 共5位患者</span>
          <span><FileCheck2 /> 文书阶段各不相同</span>
          <span><ShieldCheck /> 全部为虚构数据</span>
        </div>
      </div>
      <div className={styles.patientGrid}>
        {charts.map((chart) => {
          const completed = chart.documents.filter(
            (document) => document.status !== "not_started",
          ).length;
          const current = currentDocument(chart);
          return (
            <button
              type="button"
              className={styles.patientCard}
              key={chart.patient.id}
              onClick={() => onOpen(chart)}
            >
              <header>
                <span className={styles.orderIndex}>
                  {String(chart.patient.wardOrder).padStart(2, "0")}
                </span>
                <span className={styles.stageBadge}>{chart.patient.stageLabel}</span>
              </header>
              <div className={styles.patientTitle}>
                <strong>{chart.patient.bedNo}床</strong>
                <span>
                  <b>{chart.patient.name}</b>
                  <small>{chart.patient.gender} · {chart.patient.age}岁</small>
                </span>
              </div>
              <h2>{chart.patient.diagnosis}</h2>
              <p>{chart.patient.currentSituation}</p>
              <div className={styles.documentProgress}>
                <span>
                  <small>当前文书</small>
                  <strong>{current.title}</strong>
                </span>
                <span className={styles.progressCount}>已写 {completed} 篇</span>
                <small className={styles.continuousHint}>住院期间持续追加</small>
              </div>
              <footer>
                <span><CalendarDays /> 入院 {chart.patient.admissionDate.slice(5).replace("-", ".")}</span>
                <strong>进入病史书写 <ChevronRight /></strong>
              </footer>
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
  onGenerate,
  isGenerating,
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
  onGenerate: () => void;
  isGenerating: boolean;
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
          <small>{chart.patient.gender} / {chart.patient.age}岁 · {chart.patient.diagnosis}</small>
        </div>
        <button
          type="button"
          className={styles.primaryTopAction}
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? <LoaderCircle className={styles.spin} /> : <Sparkles />}
          <span>
            <strong>{isGenerating ? "正在生成" : "一键生成全病区交班"}</strong>
            <small>读取全部患者已保存病历</small>
          </span>
        </button>
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
}: {
  charts: SourceSystemChart[];
  handoffs: Record<string, HandoffEditorState>;
  reviewedCount: number;
  search: string;
  onSearch: (value: string) => void;
  onOpen: (patientId: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const hasHandoffs = Object.keys(handoffs).length > 0;
  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="HANDOFF RECORDS"
        title="交班记录"
        description="患者顺序与病史列表一致。逐人核对后，统一整理为连续段落打印。"
      >
        <button
          type="button"
          className={styles.secondaryTopAction}
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? <LoaderCircle className={styles.spin} /> : <Sparkles />}
          {hasHandoffs ? "重新生成" : "生成全病区交班"}
        </button>
        <button
          type="button"
          className={styles.printTopAction}
          onClick={() => window.print()}
          disabled={!hasHandoffs}
        >
          <Printer />
          <span>
            <strong>统一打印交班</strong>
            <small>{hasHandoffs ? `${reviewedCount}/${Object.keys(handoffs).length} 已核对` : "请先生成"}</small>
          </span>
        </button>
      </PageHeader>

      {!hasHandoffs ? (
        <div className={styles.handoffEmpty}>
          <span><ClipboardList /></span>
          <small>STEP 02</small>
          <h2>病史写完，不再手工摘抄</h2>
          <p>系统将按 03、07、12、16、21 床的顺序读取已保存病历，生成五位患者的交班重点。</p>
          <button type="button" onClick={onGenerate} disabled={isGenerating}>
            {isGenerating ? <LoaderCircle className={styles.spin} /> : <Sparkles />}
            {isGenerating ? "正在整理五位患者" : "一键生成全病区交班"}
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
              const important = editor.fields
                .filter((field) => ["current_condition", "shift_changes", "pending_results", "attention"].includes(field.key) && field.value)
                .map((field) => field.value)
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
                    <span className={editor.reviewed ? styles.reviewedStatus : styles.reviewStatus}>
                      {editor.reviewed ? <CheckCircle2 /> : <PenLine />}
                      {editor.reviewed ? "已核对" : "待核对"}
                    </span>
                  </header>
                  <div className={styles.patientTitle}>
                    <strong>{chart.patient.bedNo}床</strong>
                    <span><b>{chart.patient.name}</b><small>{chart.patient.gender} · {chart.patient.age}岁</small></span>
                  </div>
                  <h2>{chart.patient.diagnosis}</h2>
                  <p>{important || "原始资料没有可提取的交班重点，待医生补充。"}</p>
                  <footer>
                    <span>{editor.fields.filter((field) => field.value).length} 项已提取</span>
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
  onSupplementChange,
  onReview,
  onEvidence,
}: {
  editor: HandoffEditorState;
  onBack: () => void;
  onFieldChange: (key: ExtractionField["key"], value: string) => void;
  onSupplementChange: (value: string) => void;
  onReview: () => void;
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
          <small>{patient.gender} / {patient.age}岁 · {patient.diagnosis}</small>
        </div>
        <button type="button" className={styles.printTopAction} onClick={() => window.print()}>
          <Printer />
          <span><strong>统一打印交班</strong><small>按全部患者顺序合并</small></span>
        </button>
      </header>
      <div className={styles.handoffEditorShell}>
        <aside className={styles.handoffPatientInfo}>
          <span className={styles.largeOrder}>{String(patient.wardOrder).padStart(2, "0")}</span>
          <small>PATIENT HANDOFF</small>
          <h2>{patient.bedNo}床 · {patient.name}</h2>
          <p>{patient.diagnosis}</p>
          <dl>
            <div><dt>当前阶段</dt><dd>{patient.stageLabel}</dd></div>
            <div><dt>住院号</dt><dd>{patient.encounterId}</dd></div>
            <div><dt>生成模式</dt><dd>{editor.result.mode === "deepseek" ? "DeepSeek" : "虚构演示兜底"}</dd></div>
          </dl>
          <div className={styles.paragraphPreview}>
            <small>统一打印段落预览</small>
            <p>{handoffParagraph(editor)}</p>
          </div>
        </aside>
        <section className={styles.handoffForm}>
          <header>
            <span><PenLine /> 医生核对与补充</span>
            <strong className={editor.reviewed ? styles.reviewedStatus : styles.reviewStatus}>
              {editor.reviewed ? <CheckCircle2 /> : <PenLine />}
              {editor.reviewed ? "已核对" : "待核对"}
            </strong>
          </header>
          <div className={styles.handoffFields}>
            {extractionFieldConfig.map((config, index) => {
              const field = editor.fields.find((item) => item.key === config.key)!;
              return (
                <section key={config.key} className={!field.value ? styles.emptyHandoffField : ""}>
                  <header>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div><strong>{config.label}</strong><small>{config.hint}</small></div>
                    {!field.value && <em>待医生补充</em>}
                  </header>
                  <textarea
                    value={field.value}
                    onChange={(event) => onFieldChange(field.key, event.target.value)}
                    placeholder="源资料未提供，保持空白或由医生补充"
                    aria-label={config.label}
                  />
                  {field.evidence.length > 0 && (
                    <div className={styles.evidenceRow}>
                      <small>原文依据</small>
                      {field.evidence.map((evidence, evidenceIndex) => (
                        <button
                          type="button"
                          key={`${evidence.sourceRecordId}-${evidenceIndex}`}
                          onClick={() => onEvidence(field.label, evidence)}
                        >
                          原文 {String(evidenceIndex + 1).padStart(2, "0")}
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
            <section className={styles.supplementBlock}>
              <header>
                <span>＋</span>
                <div><strong>医生补充</strong><small>核对后补充模型未覆盖的交接内容</small></div>
              </header>
              <textarea
                value={editor.supplement}
                onChange={(event) => onSupplementChange(event.target.value)}
                placeholder="例如：家属电话已留，夜间如出现明显肿胀请及时联系……"
                aria-label="医生补充"
              />
            </section>
          </div>
          <footer className={styles.reviewFooter}>
            <span><ShieldCheck /> AI 只做原文摘录，交班内容由医生最终核对。</span>
            <button type="button" onClick={onReview}>
              <CheckCircle2 /> {editor.reviewed ? "已确认无误" : "确认该患者交班"}
            </button>
          </footer>
        </section>
      </div>
    </div>
  );
}
