import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CircleDot,
  FileText,
} from "lucide-react";

import { acuityLabels, statusLabels } from "../presentation";
import type { PatientCard as PatientCardType } from "../types";
import styles from "./handoff-workspace.module.css";

interface PatientCardProps {
  patient: PatientCardType;
  index: number;
  onOpen: (patient: PatientCardType) => void;
}

export function PatientCard({ patient, index, onOpen }: PatientCardProps) {
  const statusIcon =
    patient.status === "handed_over" || patient.status === "confirmed" ? (
      <CheckCircle2 aria-hidden="true" />
    ) : patient.status === "failed" ? (
      <AlertTriangle aria-hidden="true" />
    ) : (
      <CircleDot aria-hidden="true" />
    );

  return (
    <button
      type="button"
      className={`${styles.patientCard} ${styles[patient.acuity]}`}
      style={{ "--card-index": index } as React.CSSProperties}
      onClick={() => onOpen(patient)}
      aria-label={`查看 ${patient.bedNo} 床 ${patient.displayName} 的交班卡`}
    >
      <span className={styles.cardAcuityLine} aria-hidden="true" />
      <span className={styles.cardHeader}>
        <span className={styles.bedBlock}>
          <span className={styles.bedNumber}>{patient.bedNo}</span>
          <span className={styles.bedLabel}>床</span>
        </span>
        <span className={styles.cardPatientMeta}>
          <strong>{patient.displayName}</strong>
          <span>
            {patient.gender} · {patient.age} 岁
          </span>
        </span>
        <span className={`${styles.acuityBadge} ${styles[`${patient.acuity}Badge`]}`}>
          {acuityLabels[patient.acuity]}
        </span>
      </span>

      <span className={styles.diagnosis}>{patient.diagnosis}</span>
      <span className={styles.summary}>{patient.summary}</span>

      {patient.importantChanges.length > 0 ? (
        <span className={styles.changePreview}>
          <span className={styles.changeMarker} aria-hidden="true" />
          {patient.importantChanges[0]}
        </span>
      ) : (
        <span className={styles.emptyChange}>
          <FileText aria-hidden="true" />
          本班有 {patient.sourceRecordCount} 条新增记录待整理
        </span>
      )}

      <span className={styles.cardFooter}>
        <span className={`${styles.statusBadge} ${styles[`status_${patient.status}`]}`}>
          {statusIcon}
          {statusLabels[patient.status]}
        </span>
        <span className={styles.cardSignals}>
          {patient.pendingCount > 0 && (
            <span>{patient.pendingCount} 项待办</span>
          )}
          {patient.confirmationCount > 0 && (
            <span className={styles.confirmSignal}>
              {patient.confirmationCount} 项待确认
            </span>
          )}
          <ArrowUpRight aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}
