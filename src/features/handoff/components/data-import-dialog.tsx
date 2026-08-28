"use client";

import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  FileUp,
  FlaskConical,
  LoaderCircle,
  ScanLine,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";

import type { ImportSourceMode } from "../types";
import styles from "./handoff-workspace.module.css";

interface DataImportDialogProps {
  loading: boolean;
  onClose: () => void;
  onImport: (input: {
    sourceMode: ImportSourceMode;
    fileName?: string | null;
  }) => Promise<void>;
}

const sourceSystems = [
  {
    icon: Building2,
    name: "HIS / EMR",
    detail: "患者、床位、完整病历与本班病程",
    count: "10 位患者",
  },
  {
    icon: ClipboardList,
    name: "CPOE / 医嘱",
    detail: "今日医嘱、执行状态与停止时间",
    count: "8 条医嘱",
  },
  {
    icon: FlaskConical,
    name: "LIS / RIS",
    detail: "检验检查、报告状态与待回结果",
    count: "13 条记录",
  },
];

const coverageRows = [
  ["身份与床位", "姓名、性别、年龄、床号", "10 / 10", "完整"],
  ["目前病情", "诊断、本班病程、生命体征", "9 / 10", "1 项待补"],
  ["今日医嘱", "临时医嘱、调整与执行状态", "10 / 10", "完整"],
  ["待回结果", "检验/检查申请及报告状态", "8 / 10", "2 项待补"],
] as const;

export function DataImportDialog({
  loading,
  onClose,
  onImport,
}: DataImportDialogProps) {
  const [sourceMode, setSourceMode] =
    useState<ImportSourceMode>("hospital_simulator");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  function selectFile(file: File | undefined) {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["json", "csv", "xlsx"].includes(extension)) {
      setFileError("演示入口仅接受 JSON、CSV 或 XLSX 文件。");
      setFileName(null);
      return;
    }
    setFileError(null);
    setFileName(file.name);
    setSourceMode("local_file_demo");
  }

  return (
    <div className={styles.importBackdrop} role="presentation">
      <section
        className={styles.importDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-dialog-title"
      >
        <header className={styles.importHeader}>
          <div>
            <span className={styles.importKicker}>SHIFT DATA INTAKE · 01</span>
            <h2 id="import-dialog-title">导入本班患者资料</h2>
            <p>先把医院现有系统的数据快照归一化，再生成交班卡。</p>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="关闭导入窗口"
            onClick={onClose}
            disabled={loading}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className={styles.importBody}>
          <div className={styles.integrationRail} aria-label="模拟医院数据来源">
            {sourceSystems.map((source, index) => {
              const Icon = source.icon;
              return (
                <div className={styles.sourceSystem} key={source.name}>
                  <span><Icon aria-hidden="true" /></span>
                  <div>
                    <strong>{source.name}</strong>
                    <p>{source.detail}</p>
                    <small>{source.count}</small>
                  </div>
                  {index < sourceSystems.length - 1 && (
                    <ArrowRight aria-hidden="true" />
                  )}
                </div>
              );
            })}
            <div className={styles.importDestination}>
              <ScanLine aria-hidden="true" />
              <span>字段映射</span>
              <strong>交班快照</strong>
            </div>
          </div>

          <div className={styles.importModeGrid}>
            <button
              type="button"
              className={sourceMode === "hospital_simulator" ? styles.activeImportMode : ""}
              onClick={() => setSourceMode("hospital_simulator")}
            >
              <Building2 aria-hidden="true" />
              <span>
                <strong>模拟医院系统</strong>
                <small>一键拉取虚构的 HIS / EMR / LIS 快照</small>
              </span>
              <CheckCircle2 aria-hidden="true" />
            </button>

            <label className={sourceMode === "local_file_demo" ? styles.activeFileMode : ""}>
              <FileUp aria-hidden="true" />
              <span>
                <strong>{fileName ?? "选择本地导出文件"}</strong>
                <small>JSON、CSV、XLSX · 演示版不读取正文</small>
              </span>
              <input
                type="file"
                accept=".json,.csv,.xlsx"
                onChange={(event) => selectFile(event.target.files?.[0])}
              />
              <FileSpreadsheet aria-hidden="true" />
            </label>
          </div>

          {fileError && (
            <div className={styles.importInlineError} role="alert">
              <AlertTriangle aria-hidden="true" />
              {fileError}
            </div>
          )}

          <section className={styles.coveragePanel}>
            <header>
              <div>
                <span>IMPORT PREVIEW</span>
                <h3>字段覆盖预览</h3>
              </div>
              <p><strong>10</strong> 位患者 · <strong>21</strong> 条本班记录</p>
            </header>
            <div className={styles.coverageTable}>
              {coverageRows.map(([name, fields, coverage, status]) => (
                <div key={name}>
                  <strong>{name}</strong>
                  <span>{fields}</span>
                  <b>{coverage}</b>
                  <small className={status === "完整" ? styles.coverageComplete : ""}>
                    {status}
                  </small>
                </div>
              ))}
            </div>
          </section>

          <div className={styles.importSafetyNote}>
            <ShieldCheck aria-hidden="true" />
            <div>
              <strong>缺失内容保持空白，不由 AI 补写</strong>
              <p>3 个缺失字段会在交班卡中标记为“待白班医生补充确认”。本地演示不会读取或保存所选文件正文。</p>
            </div>
          </div>
        </div>

        <footer className={styles.importFooter}>
          <span>虚构数据 · 只读导入 · 不回写医院系统</span>
          <div>
            <button type="button" onClick={onClose} disabled={loading}>取消</button>
            <button
              type="button"
              className={styles.importPrimaryButton}
              disabled={loading || (sourceMode === "local_file_demo" && !fileName)}
              onClick={() => onImport({ sourceMode, fileName })}
            >
              {loading ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : <FileUp aria-hidden="true" />}
              {loading ? "正在校验并导入" : "确认导入 10 位患者"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
