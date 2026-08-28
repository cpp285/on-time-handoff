"use client";

import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileSearch,
  History,
  LoaderCircle,
  MessageSquarePlus,
  PenLine,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  addSupplement,
  confirmHandoff,
  getErrorMessage,
  receiveHandoff,
  saveHandoff,
  updatePendingTask,
} from "../api/client";
import {
  categoryLabels,
  formatDateTime,
  formatShiftType,
  sourceTypeLabels,
  statusLabels,
} from "../presentation";
import type {
  HandoffCategory,
  HandoffDetail,
  HandoffItemView,
  SourceRecord,
} from "../types";
import styles from "./handoff-workspace.module.css";

interface HandoffDrawerProps {
  detail: HandoffDetail | null;
  loading: boolean;
  role: "outgoing" | "incoming";
  onClose: () => void;
  onChange: (detail: HandoffDetail) => void;
  onBoardRefresh: () => Promise<void>;
}

const categories: HandoffCategory[] = [
  "shift_change",
  "pending_task",
  "attention",
  "confirmation",
];

const categoryIcons: Record<HandoffCategory, React.ReactNode> = {
  shift_change: <Clock3 aria-hidden="true" />,
  pending_task: <ClipboardCheck aria-hidden="true" />,
  attention: <ShieldCheck aria-hidden="true" />,
  confirmation: <AlertCircle aria-hidden="true" />,
};

export function HandoffDrawer({
  detail,
  loading,
  role,
  onClose,
  onChange,
  onBoardRefresh,
}: HandoffDrawerProps) {
  const [tab, setTab] = useState<"handoff" | "timeline">("handoff");
  const [source, setSource] = useState<SourceRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState("");
  const [itemValues, setItemValues] = useState<Record<string, string>>({});
  const [supplement, setSupplement] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (source) setSource(null);
      else onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, source]);

  const groupedItems = useMemo(() => {
    if (!detail) return {} as Record<HandoffCategory, HandoffItemView[]>;
    return Object.fromEntries(
      categories.map((category) => [
        category,
        detail.items.filter((item) => item.category === category),
      ]),
    ) as Record<HandoffCategory, HandoffItemView[]>;
  }, [detail]);

  async function runAction(name: string, action: () => Promise<HandoffDetail>) {
    setBusy(name);
    setError(null);
    try {
      const nextDetail = await action();
      onChange(nextDetail);
      await onBoardRefresh();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setBusy(null);
    }
  }

  if (loading && !detail) {
    return (
      <div className={styles.drawerBackdrop} role="presentation">
        <aside className={styles.drawer} aria-label="正在读取患者交班卡">
          <div className={styles.drawerLoading}>
            <LoaderCircle className={styles.spin} aria-hidden="true" />
            <strong>正在读取交班卡</strong>
            <span>同步患者、班次与原文记录…</span>
          </div>
        </aside>
      </div>
    );
  }

  if (!detail) return null;

  const editable = detail.status === "needs_review";
  const actor = role === "outgoing" ? "白班·沈医生" : "夜班·何医生";

  return (
    <div className={styles.drawerBackdrop} role="presentation" onMouseDown={onClose}>
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="handoff-drawer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.drawerHeader}>
          <div className={styles.drawerIdentity}>
            <span className={styles.drawerBed}>{detail.patient.bedNo}</span>
            <div>
              <span className={styles.eyebrow}>患者交班卡 · 演示数据</span>
              <h2 id="handoff-drawer-title">
                {detail.patient.displayName}
                <span>{detail.patient.diagnosis}</span>
              </h2>
            </div>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            aria-label="关闭交班卡"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className={styles.drawerMetaBar}>
          <span className={`${styles.statusBadge} ${styles[`status_${detail.status}`]}`}>
            <span className={styles.statusDot} aria-hidden="true" />
            {statusLabels[detail.status]}
          </span>
          <span>v{detail.version}</span>
          <span>
            {formatShiftType(detail.shift.type)}
            <ArrowRight aria-hidden="true" />
            {formatShiftType(detail.shift.handoverToType)}
          </span>
          {detail.generatedAt && <span>生成于 {formatDateTime(detail.generatedAt)}</span>}
        </div>

        <nav className={styles.drawerTabs} aria-label="交班详情标签">
          <button
            type="button"
            className={tab === "handoff" ? styles.activeTab : ""}
            onClick={() => setTab("handoff")}
          >
            <ClipboardCheck aria-hidden="true" />
            本次交班
          </button>
          <button
            type="button"
            className={tab === "timeline" ? styles.activeTab : ""}
            onClick={() => setTab("timeline")}
          >
            <History aria-hidden="true" />
            往期时间线
            <span>{detail.timeline.length}</span>
          </button>
        </nav>

        <div className={styles.drawerBody}>
          {error && (
            <div className={styles.inlineError} role="alert">
              <AlertCircle aria-hidden="true" />
              {error}
            </div>
          )}

          {tab === "timeline" ? (
            <Timeline detail={detail} />
          ) : detail.status === "not_generated" || detail.status === "generating" ? (
            <div className={styles.unreadyState}>
              <span className={styles.unreadyGlyph} aria-hidden="true">
                {detail.status === "generating" ? (
                  <LoaderCircle className={styles.spin} />
                ) : (
                  <FileSearch />
                )}
              </span>
              <h3>
                {detail.status === "generating"
                  ? "正在整理本班记录"
                  : "交班草稿尚未生成"}
              </h3>
              <p>
                {detail.status === "generating"
                  ? "生成完成后，这里会显示结构化交班内容与原文出处。"
                  : "关闭详情后点击病区看板上的“生成本班交班”。"}
              </p>
            </div>
          ) : (
            <>
              <section className={styles.summarySection}>
                <div className={styles.sectionHeading}>
                  <div>
                    <span className={styles.sectionIndex}>00</span>
                    <h3>当前病情概况</h3>
                  </div>
                  {editable && !editing && (
                    <button
                      type="button"
                      onClick={() => {
                        setSummary(detail.conditionSummary);
                        setItemValues(
                          Object.fromEntries(
                            detail.items.map((item) => [item.id, item.content]),
                          ),
                        );
                        setEditing(true);
                        setError(null);
                      }}
                    >
                      <PenLine aria-hidden="true" />
                      编辑草稿
                    </button>
                  )}
                </div>
                {editing ? (
                  <textarea
                    className={styles.summaryEditor}
                    value={summary}
                    onChange={(event) => setSummary(event.target.value)}
                    aria-label="编辑当前病情概况"
                  />
                ) : (
                  detail.conditionSummary ? (
                    <p>{detail.conditionSummary}</p>
                  ) : (
                    <div className={styles.emptyClinicalField}>
                      <AlertCircle aria-hidden="true" />
                      <span>
                        <strong>原始资料未包含当前病情概况</strong>
                        请白班医生点击“编辑草稿”后补充确认。
                      </span>
                    </div>
                  )
                )}
              </section>

              {categories.map((category, categoryIndex) => {
                const items = groupedItems[category] ?? [];
                return (
                  <section
                    className={`${styles.detailSection} ${styles[`section_${category}`]}`}
                    key={category}
                  >
                    <div className={styles.sectionHeading}>
                      <div>
                        <span className={styles.sectionIndex}>
                          {String(categoryIndex + 1).padStart(2, "0")}
                        </span>
                        <span className={styles.sectionIcon}>{categoryIcons[category]}</span>
                        <h3>{categoryLabels[category]}</h3>
                      </div>
                      <span className={styles.sectionCount}>{items.length}</span>
                    </div>
                    <div className={styles.detailItems}>
                      {items.length > 0 ? items.map((item) => (
                        <article className={styles.detailItem} key={item.id}>
                          <span className={styles.itemBullet} aria-hidden="true" />
                          <div>
                            {editing ? (
                              <textarea
                                value={itemValues[item.id] ?? item.content}
                                onChange={(event) =>
                                  setItemValues((current) => ({
                                    ...current,
                                    [item.id]: event.target.value,
                                  }))
                                }
                                aria-label={`编辑${categoryLabels[category]}`}
                              />
                            ) : (
                              <p>{item.content}</p>
                            )}
                            <div className={styles.itemMeta}>
                              {item.isInherited && <span>由上一班延续</span>}
                              {item.sources.map((record) => (
                                <button
                                  type="button"
                                  key={record.id}
                                  onClick={() => setSource(record)}
                                >
                                  <FileSearch aria-hidden="true" />
                                  查看原文 · {sourceTypeLabels[record.type]}
                                </button>
                              ))}
                            </div>
                          </div>
                        </article>
                      )) : (
                        <div className={styles.emptyStructuredField}>
                          <AlertCircle aria-hidden="true" />
                          <span>
                            原始资料中没有明确的{categoryLabels[category]}，保持空白，
                            待白班医生确认是否需要补充。
                          </span>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}

              {editing && (
                <div className={styles.editActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => {
                      setEditing(false);
                      setSummary(detail.conditionSummary);
                      setItemValues(
                        Object.fromEntries(
                          detail.items.map((item) => [item.id, item.content]),
                        ),
                      );
                    }}
                  >
                    取消编辑
                  </button>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={busy === "save"}
                    onClick={() =>
                      runAction("save", () =>
                        saveHandoff(detail.id, {
                          conditionSummary: summary,
                          items: detail.items.map((item) => ({
                            id: item.id,
                            content: itemValues[item.id] ?? item.content,
                          })),
                        }),
                      ).then(() => setEditing(false))
                    }
                  >
                    {busy === "save" ? (
                      <LoaderCircle className={styles.spin} aria-hidden="true" />
                    ) : (
                      <Save aria-hidden="true" />
                    )}
                    保存修改
                  </button>
                </div>
              )}

              {editable && !editing && (
                <section className={styles.supplementSection}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <MessageSquarePlus aria-hidden="true" />
                      <h3>补充交班事项</h3>
                    </div>
                  </div>
                  <div className={styles.supplementForm}>
                    <textarea
                      value={supplement}
                      onChange={(event) => setSupplement(event.target.value)}
                      placeholder="例如：18:00 体温 38.5℃，血培养结果未回…"
                      aria-label="补充交班事项"
                    />
                    <button
                      type="button"
                      disabled={supplement.trim().length < 2 || busy === "supplement"}
                      onClick={() =>
                        runAction("supplement", () =>
                          addSupplement(detail.id, supplement, actor),
                        ).then(() => setSupplement(""))
                      }
                    >
                      {busy === "supplement" ? (
                        <LoaderCircle className={styles.spin} aria-hidden="true" />
                      ) : (
                        <Check aria-hidden="true" />
                      )}
                      加入待确认
                    </button>
                  </div>
                </section>
              )}

              {detail.pendingTasks.length > 0 && (
                <section className={styles.taskSection}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <ClipboardCheck aria-hidden="true" />
                      <h3>跨班未完成事项</h3>
                    </div>
                  </div>
                  <div className={styles.taskList}>
                    {detail.pendingTasks.map((task) => (
                      <label key={task.id} className={styles.taskItem}>
                        <input
                          type="checkbox"
                          checked={task.status === "completed"}
                          disabled={
                            role !== "incoming" ||
                            detail.status !== "handed_over" ||
                            busy === `task-${task.id}`
                          }
                          onChange={(event) => {
                            const status = event.target.checked ? "completed" : "open";
                            setBusy(`task-${task.id}`);
                            setError(null);
                            updatePendingTask(task.id, status)
                              .then((pendingTasks) => {
                                onChange({ ...detail, pendingTasks });
                                return onBoardRefresh();
                              })
                              .catch((taskError) => setError(getErrorMessage(taskError)))
                              .finally(() => setBusy(null));
                          }}
                        />
                        <span className={styles.taskCheck} aria-hidden="true">
                          <Check />
                        </span>
                        <span>
                          <strong>{task.content}</strong>
                          <small>
                            {task.status === "completed"
                              ? `完成于 ${formatDateTime(task.completedAt)}`
                              : "等待下一班处理"}
                          </small>
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {tab === "handoff" && detail.status !== "not_generated" && detail.status !== "generating" && (
          <footer className={styles.drawerFooter}>
            <div className={styles.footerActor}>
              <span>当前操作身份</span>
              <strong>{actor}</strong>
            </div>
            {detail.status === "needs_review" ? (
              role === "outgoing" ? (
                <button
                  type="button"
                  className={styles.confirmButton}
                  disabled={busy === "confirm" || editing}
                  onClick={() =>
                    runAction("confirm", () => confirmHandoff(detail.id, actor))
                  }
                >
                  {busy === "confirm" ? (
                    <LoaderCircle className={styles.spin} aria-hidden="true" />
                  ) : (
                    <ShieldCheck aria-hidden="true" />
                  )}
                  核对无误，确认交班
                </button>
              ) : (
                <span className={styles.waitingAction}>等待交班医生确认内容</span>
              )
            ) : detail.status === "confirmed" ? (
              role === "incoming" ? (
                <button
                  type="button"
                  className={styles.receiveButton}
                  disabled={busy === "receive"}
                  onClick={() =>
                    runAction("receive", () => receiveHandoff(detail.id, actor))
                  }
                >
                  {busy === "receive" ? (
                    <LoaderCircle className={styles.spin} aria-hidden="true" />
                  ) : (
                    <CheckCircle2 aria-hidden="true" />
                  )}
                  接收本次交班
                </button>
              ) : (
                <span className={styles.waitingAction}>切换至接班医生视角后接收</span>
              )
            ) : detail.status === "handed_over" ? (
              <div className={styles.completedAction}>
                <CheckCircle2 aria-hidden="true" />
                <span>
                  已由 {detail.receivedBy} 接收
                  <small>{formatDateTime(detail.receivedAt, true)}</small>
                </span>
              </div>
            ) : null}
          </footer>
        )}

        {source && (
          <div className={styles.sourceBackdrop} role="presentation" onMouseDown={() => setSource(null)}>
            <section
              className={styles.sourcePanel}
              role="dialog"
              aria-modal="true"
              aria-labelledby="source-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <header>
                <div>
                  <span className={styles.eyebrow}>原文出处 · 演示记录</span>
                  <h3 id="source-title">{sourceTypeLabels[source.type]}</h3>
                </div>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => setSource(null)}
                  aria-label="关闭原文出处"
                >
                  <X aria-hidden="true" />
                </button>
              </header>
              <div className={styles.sourceMeta}>
                <span>{formatDateTime(source.occurredAt, true)}</span>
                <code>{source.id}</code>
              </div>
              <blockquote>{source.content}</blockquote>
              <p className={styles.sourceNotice}>
                <ShieldCheck aria-hidden="true" />
                本页面仅展示虚构演示数据，不含真实患者信息。
              </p>
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}

function Timeline({ detail }: { detail: HandoffDetail }) {
  return (
    <section className={styles.timelineSection}>
      <div className={styles.timelineIntro}>
        <span>连续交班记录</span>
        <strong>{detail.patient.displayName}</strong>
        <p>历史由软件保存和读取，不会重新调用模型生成。</p>
      </div>
      <ol className={styles.timelineList}>
        {detail.timeline.map((entry, index) => (
          <li key={`${entry.id}-${index}`}>
            <span className={styles.timelineRail} aria-hidden="true">
              <span />
            </span>
            <article>
              <header>
                <span>
                  {entry.shiftDate.slice(5).replace("-", "月")}日 · {formatShiftType(entry.shiftType)}
                </span>
                <span className={`${styles.statusBadge} ${styles[`status_${entry.status}`]}`}>
                  {statusLabels[entry.status]}
                </span>
              </header>
              <h3>
                {formatShiftType(entry.shiftType)}
                <ArrowRight aria-hidden="true" />
                {formatShiftType(entry.handoverToType)}
              </h3>
              <p>{entry.summary}</p>
              <footer>
                {entry.confirmedBy && (
                  <span>
                    确认：{entry.confirmedBy} · {formatDateTime(entry.confirmedAt)}
                  </span>
                )}
                {entry.receivedBy && (
                  <span>
                    接收：{entry.receivedBy} · {formatDateTime(entry.receivedAt)}
                  </span>
                )}
              </footer>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
