"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Database,
  Filter,
  LoaderCircle,
  Moon,
  Radio,
  Search,
  Sparkles,
  Stethoscope,
  Sun,
  UserRoundCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createGenerationJob,
  fetchBoard,
  fetchGenerationJob,
  fetchHandoff,
  getErrorMessage,
} from "../api/client";
import type {
  BoardData,
  GenerationJob,
  HandoffDetail,
  PatientCard as PatientCardType,
} from "../types";
import { formatBusinessDate } from "../presentation";
import { HandoffDrawer } from "./handoff-drawer";
import { PatientCard } from "./patient-card";
import styles from "./handoff-workspace.module.css";

type FilterValue = "all" | "critical" | "pending" | "review";

interface HandoffWorkspaceProps {
  initialBoard: BoardData;
  initialPatientId?: string;
}

const terminalJobStatuses = new Set(["completed", "partial_failed", "failed"]);

export function HandoffWorkspace({
  initialBoard,
  initialPatientId,
}: HandoffWorkspaceProps) {
  const initialHandoffId = initialBoard.patients.find(
    (patient) => patient.id === initialPatientId,
  )?.handoffId;
  const [board, setBoard] = useState(initialBoard);
  const [role, setRole] = useState<"outgoing" | "incoming">("outgoing");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [search, setSearch] = useState("");
  const [job, setJob] = useState<GenerationJob | null>(initialBoard.activeJob);
  const [selectedHandoffId, setSelectedHandoffId] = useState<string | null>(
    initialHandoffId ?? null,
  );
  const [detail, setDetail] = useState<HandoffDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(Boolean(initialHandoffId));
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const refreshBoard = useCallback(async () => {
    const nextBoard = await fetchBoard(board.ward.id);
    setBoard(nextBoard);
  }, [board.ward.id]);

  const openPatient = useCallback(async (patient: PatientCardType) => {
    setSelectedHandoffId(patient.handoffId);
    setDetailLoading(true);
    setDetail(null);
    const url = new URL(window.location.href);
    url.searchParams.set("patient", patient.id);
    window.history.replaceState(null, "", url);
    try {
      setDetail(await fetchHandoff(patient.handoffId));
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
      setSelectedHandoffId(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closePatient = useCallback(() => {
    setSelectedHandoffId(null);
    setDetail(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("patient");
    window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    if (!initialHandoffId) return;
    let cancelled = false;
    fetchHandoff(initialHandoffId)
      .then((initialDetail) => {
        if (!cancelled) setDetail(initialDetail);
      })
      .catch((error) => {
        if (!cancelled) {
          setNotice({ type: "error", text: getErrorMessage(error) });
          setSelectedHandoffId(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialHandoffId]);

  useEffect(() => {
    if (!job || terminalJobStatuses.has(job.status)) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const nextJob = await fetchGenerationJob(job.id);
        if (cancelled) return;
        setJob(nextJob);
        await refreshBoard();
        if (terminalJobStatuses.has(nextJob.status)) {
          setNotice({
            type: nextJob.status === "completed" ? "success" : "error",
            text:
              nextJob.status === "completed"
                ? `已生成 ${nextJob.completedCount} 份交班草稿，请开始核对。`
                : `生成完成：${nextJob.completedCount} 份成功，${nextJob.failedCount} 份需要重试。`,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setNotice({ type: "error", text: getErrorMessage(error) });
        }
      }
    }, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [job, refreshBoard]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4_500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const visiblePatients = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return board.patients.filter((patient) => {
      const matchesSearch =
        !keyword ||
        patient.bedNo.includes(keyword) ||
        patient.displayName.toLowerCase().includes(keyword) ||
        patient.diagnosis.toLowerCase().includes(keyword);
      const matchesFilter =
        filter === "all" ||
        (filter === "critical" && patient.acuity === "critical") ||
        (filter === "pending" && patient.pendingCount > 0) ||
        (filter === "review" &&
          (patient.status === "needs_review" || patient.confirmationCount > 0));
      return matchesSearch && matchesFilter;
    });
  }, [board.patients, filter, search]);

  async function handleGenerate() {
    setNotice(null);
    try {
      const nextJob = await createGenerationJob(board.shift.id);
      setJob(nextJob);
      setNotice({
        type: "success",
        text:
          board.generationMode === "demo"
            ? "演示生成任务已开始，正在逐床整理记录。"
            : "DeepSeek 生成任务已开始，正在逐床整理记录。",
      });
      await refreshBoard();
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    }
  }

  const jobRunning = job && !terminalJobStatuses.has(job.status);
  const progress = job?.totalCount
    ? Math.round(((job.completedCount + job.failedCount) / job.totalCount) * 100)
    : 0;

  return (
    <main className={styles.workspace}>
      <header className={styles.appHeader}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <Clock3 />
            <span />
          </span>
          <div>
            <strong>准点交班</strong>
            <span>ON-TIME HANDOFF</span>
          </div>
        </div>

        <div className={styles.wardIdentity}>
          <span className={styles.liveDot} aria-hidden="true" />
          <div>
            <strong>{board.ward.name}</strong>
            <span>{board.ward.department}</span>
          </div>
          <ChevronDown aria-hidden="true" />
        </div>

        <div className={styles.roleSwitch} aria-label="切换演示医生身份">
          <button
            type="button"
            className={role === "outgoing" ? styles.activeRole : ""}
            onClick={() => setRole("outgoing")}
          >
            <Sun aria-hidden="true" />
            <span>
              <small>交班医生</small>
              沈医生
            </span>
          </button>
          <button
            type="button"
            className={role === "incoming" ? styles.activeRole : ""}
            onClick={() => setRole("incoming")}
          >
            <Moon aria-hidden="true" />
            <span>
              <small>接班医生</small>
              何医生
            </span>
          </button>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            <Radio aria-hidden="true" />
            {formatBusinessDate(board.shift.date)} · 本地演示
          </span>
          <h1>
            白班
            <span className={styles.shiftArrow}>
              <span />
              <ArrowRight aria-hidden="true" />
            </span>
            <em>夜班</em>
          </h1>
          <p>
            先看变化，再看待办。AI 负责整理，医生负责确认。
          </p>
        </div>

        <div className={styles.shiftTimeline} aria-label="当前班次时间">
          <span className={styles.timelineStart}>08:00</span>
          <span className={styles.timelineTrack}>
            <span className={styles.timelineElapsed} />
            <span className={styles.timelineNow}>现在 18:42</span>
          </span>
          <span className={styles.timelineEnd}>20:00</span>
        </div>

        <button
          type="button"
          className={styles.generateButton}
          onClick={handleGenerate}
          disabled={Boolean(jobRunning)}
        >
          <span className={styles.generateIcon}>
            {jobRunning ? (
              <LoaderCircle className={styles.spin} aria-hidden="true" />
            ) : (
              <Sparkles aria-hidden="true" />
            )}
          </span>
          <span>
            <strong>{jobRunning ? "正在生成交班" : "生成本班交班"}</strong>
            <small>
              {board.generationMode === "demo"
                ? "演示生成器 · 无真实患者数据"
                : "DeepSeek · 结构化提取"}
            </small>
          </span>
          <ArrowRight aria-hidden="true" />
        </button>
      </section>

      {jobRunning && job && (
        <section className={styles.jobBanner} aria-live="polite">
          <div className={styles.jobLabel}>
            <LoaderCircle className={styles.spin} aria-hidden="true" />
            <span>
              <strong>逐床整理中</strong>
              已完成 {job.completedCount + job.failedCount} / {job.totalCount}
            </span>
          </div>
          <div className={styles.jobProgress}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <strong>{progress}%</strong>
        </section>
      )}

      <section className={styles.statsStrip} aria-label="病区交班概览">
        <article>
          <span className={styles.statIcon}>
            <Stethoscope aria-hidden="true" />
          </span>
          <div>
            <strong>{board.stats.total}</strong>
            <span>在院患者</span>
          </div>
          <small>本班全部</small>
        </article>
        <article className={styles.attentionStat}>
          <span className={styles.statIcon}>
            <Activity aria-hidden="true" />
          </span>
          <div>
            <strong>{board.stats.needsAttention}</strong>
            <span>重点患者</span>
          </div>
          <small>优先核对</small>
        </article>
        <article>
          <span className={styles.statIcon}>
            <ClipboardCheck aria-hidden="true" />
          </span>
          <div>
            <strong>{board.stats.pendingTasks}</strong>
            <span>未完成事项</span>
          </div>
          <small>跨班延续</small>
        </article>
        <article>
          <span className={styles.statIcon}>
            <UserRoundCheck aria-hidden="true" />
          </span>
          <div>
            <strong>{board.stats.handedOver}</strong>
            <span>已接收交班</span>
          </div>
          <small>{board.stats.confirmed} 份待接收</small>
        </article>
      </section>

      <section className={styles.boardSection}>
        <header className={styles.boardHeader}>
          <div>
            <span className={styles.boardKicker}>WARD BOARD · 5A</span>
            <h2>病区交班看板</h2>
            <p>待确认、重要变化和未完成事项已自动前置。</p>
          </div>
          <div className={styles.boardTools}>
            <label className={styles.searchBox}>
              <Search aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索床号、患者或诊断"
                aria-label="搜索患者"
              />
            </label>
            <div className={styles.filterGroup} aria-label="筛选患者">
              <Filter aria-hidden="true" />
              {(
                [
                  ["all", "全部"],
                  ["critical", "重点"],
                  ["pending", "有待办"],
                  ["review", "待核对"],
                ] as Array<[FilterValue, string]>
              ).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={filter === value ? styles.activeFilter : ""}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {visiblePatients.length > 0 ? (
          <div className={styles.patientGrid}>
            {visiblePatients.map((patient, index) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                index={index}
                onOpen={openPatient}
              />
            ))}
          </div>
        ) : (
          <div className={styles.noResults}>
            <Search aria-hidden="true" />
            <h3>没有符合条件的患者</h3>
            <p>尝试清除搜索内容或切换筛选条件。</p>
          </div>
        )}
      </section>

      <footer className={styles.pageFooter}>
        <span>
          <Database aria-hidden="true" />
          SQLite 本地事实源
        </span>
        <span>
          <CheckCircle2 aria-hidden="true" />
          所有页面均为虚构演示数据
        </span>
        <span>
          <AlertTriangle aria-hidden="true" />
          AI 草稿必须经医生核对
        </span>
      </footer>

      {selectedHandoffId && (
        <HandoffDrawer
          detail={detail}
          loading={detailLoading}
          role={role}
          onClose={closePatient}
          onChange={setDetail}
          onBoardRefresh={refreshBoard}
        />
      )}

      {notice && (
        <div
          className={`${styles.toast} ${notice.type === "error" ? styles.errorToast : ""}`}
          role="status"
        >
          {notice.type === "error" ? (
            <AlertTriangle aria-hidden="true" />
          ) : (
            <CheckCircle2 aria-hidden="true" />
          )}
          {notice.text}
        </div>
      )}
    </main>
  );
}
