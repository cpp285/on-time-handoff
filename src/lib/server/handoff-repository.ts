import "server-only";

import { randomUUID } from "node:crypto";

import {
  CURRENT_SHIFT_ID,
  DEMO_WARD_ID,
} from "@/features/handoff/demo-data";
import type { HandoffDraft } from "@/features/handoff/schema";
import type {
  Acuity,
  BoardData,
  GenerationJob,
  GenerationJobStatus,
  HandoffCategory,
  HandoffDetail,
  HandoffItemView,
  HandoffStatus,
  PendingTaskView,
  PatientCard,
  ShiftInfo,
  SourceRecord,
  SourceRecordType,
  TimelineEntry,
} from "@/features/handoff/types";

import { getDatabase } from "./db";

type SqlRow = Record<string, unknown>;

export interface GenerationContext {
  patient: {
    id: string;
    bedNo: string;
    displayName: string;
    age: number;
    gender: string;
    diagnosis: string;
    basicInfo: string;
  };
  previousHandoff: {
    summary: string;
    items: string[];
  } | null;
  openPendingTasks: string[];
  sourceRecords: SourceRecord[];
}

function bool(value: unknown) {
  return Number(value) === 1;
}

function text(value: unknown) {
  return value == null ? null : String(value);
}

function mapShift(row: SqlRow): ShiftInfo {
  return {
    id: String(row.id),
    date: String(row.shift_date),
    type: String(row.shift_type) as ShiftInfo["type"],
    handoverToType: String(row.handover_to_type) as ShiftInfo["handoverToType"],
    startedAt: String(row.started_at),
    endedAt: String(row.ended_at),
  };
}

function mapJob(row: SqlRow): GenerationJob {
  return {
    id: String(row.id),
    status: String(row.status) as GenerationJobStatus,
    totalCount: Number(row.total_count),
    completedCount: Number(row.completed_count),
    failedCount: Number(row.failed_count),
    createdAt: String(row.created_at),
    finishedAt: text(row.finished_at),
  };
}

function getShift() {
  const row = getDatabase()
    .prepare("SELECT * FROM shifts WHERE id = ?")
    .get(CURRENT_SHIFT_ID) as SqlRow | undefined;
  if (!row) throw new Error("Current demo shift was not found");
  return mapShift(row);
}

export function getBoard(): BoardData {
  const database = getDatabase();
  const ward = database
    .prepare("SELECT * FROM wards WHERE id = ?")
    .get(DEMO_WARD_ID) as SqlRow | undefined;
  if (!ward) throw new Error("Demo ward was not found");

  const patientRows = database
    .prepare(`
      SELECT
        p.*,
        h.id AS handoff_id,
        h.status,
        h.condition_summary,
        (
          SELECT COUNT(*) FROM pending_tasks pt
          WHERE pt.patient_id = p.id AND pt.status = 'open'
        ) AS pending_count,
        (
          SELECT COUNT(*) FROM handoff_items hi
          WHERE hi.handoff_id = h.id AND hi.category = 'confirmation'
        ) AS confirmation_count,
        (
          SELECT COUNT(*) FROM source_records sr
          WHERE sr.patient_id = p.id AND sr.shift_id = ?
        ) AS source_record_count
      FROM patients p
      JOIN handoffs h ON h.patient_id = p.id AND h.shift_id = ?
      WHERE p.ward_id = ?
      ORDER BY p.sort_order
    `)
    .all(CURRENT_SHIFT_ID, CURRENT_SHIFT_ID, DEMO_WARD_ID) as SqlRow[];

  const changeQuery = database.prepare(`
    SELECT content FROM handoff_items
    WHERE handoff_id = ? AND category = 'shift_change'
    ORDER BY sort_order
    LIMIT 2
  `);

  const priority: Record<Acuity, number> = {
    critical: 0,
    watch: 1,
    stable: 2,
  };

  const patients: PatientCard[] = patientRows
    .map((row) => {
      const changes = changeQuery.all(String(row.handoff_id)) as SqlRow[];
      return {
        id: String(row.id),
        handoffId: String(row.handoff_id),
        bedNo: String(row.bed_no),
        displayName: String(row.display_name),
        age: Number(row.age),
        gender: String(row.gender) as "男" | "女",
        diagnosis: String(row.diagnosis),
        acuity: String(row.acuity) as Acuity,
        status: String(row.status) as HandoffStatus,
        summary:
          String(row.condition_summary || "") ||
          `等待整理本班记录 · ${String(row.basic_info)}`,
        importantChanges: changes.map((item) => String(item.content)),
        pendingCount: Number(row.pending_count),
        confirmationCount: Number(row.confirmation_count),
        sourceRecordCount: Number(row.source_record_count),
      };
    })
    .sort((a, b) => {
      const attentionA = a.confirmationCount > 0 ? -2 : a.pendingCount > 0 ? -1 : 0;
      const attentionB = b.confirmationCount > 0 ? -2 : b.pendingCount > 0 ? -1 : 0;
      return attentionA - attentionB || priority[a.acuity] - priority[b.acuity] || a.bedNo.localeCompare(b.bedNo);
    });

  const activeJobRow = database
    .prepare(`
      SELECT * FROM generation_jobs
      WHERE shift_id = ? AND status IN ('queued', 'running')
      ORDER BY created_at DESC
      LIMIT 1
    `)
    .get(CURRENT_SHIFT_ID) as SqlRow | undefined;

  const stats = patients.reduce(
    (result, patient) => {
      if (patient.acuity === "critical" || patient.confirmationCount > 0) {
        result.needsAttention += 1;
      }
      result.pendingTasks += patient.pendingCount;
      if (patient.status === "confirmed") result.confirmed += 1;
      if (patient.status === "handed_over") result.handedOver += 1;
      return result;
    },
    {
      total: patients.length,
      needsAttention: 0,
      pendingTasks: 0,
      confirmed: 0,
      handedOver: 0,
    },
  );

  return {
    ward: {
      id: String(ward.id),
      name: String(ward.name),
      department: String(ward.department),
    },
    shift: getShift(),
    stats,
    patients,
    activeJob: activeJobRow ? mapJob(activeJobRow) : null,
    generationMode: process.env.DEEPSEEK_API_KEY ? "deepseek" : "demo",
  };
}

export function getHandoffDetail(handoffId: string): HandoffDetail | null {
  const database = getDatabase();
  const row = database
    .prepare(`
      SELECT h.*, p.bed_no, p.display_name, p.age, p.gender, p.diagnosis,
             p.basic_info, p.acuity, s.shift_date, s.shift_type,
             s.handover_to_type, s.started_at, s.ended_at
      FROM handoffs h
      JOIN patients p ON p.id = h.patient_id
      JOIN shifts s ON s.id = h.shift_id
      WHERE h.id = ?
    `)
    .get(handoffId) as SqlRow | undefined;
  if (!row) return null;

  const itemRows = database
    .prepare(`
      SELECT * FROM handoff_items
      WHERE handoff_id = ?
      ORDER BY
        CASE category
          WHEN 'shift_change' THEN 1
          WHEN 'pending_task' THEN 2
          WHEN 'attention' THEN 3
          ELSE 4
        END,
        sort_order
    `)
    .all(handoffId) as SqlRow[];
  const sourceQuery = database.prepare(`
    SELECT sr.* FROM source_records sr
    JOIN item_sources item_source ON item_source.source_record_id = sr.id
    WHERE item_source.handoff_item_id = ?
    ORDER BY sr.occurred_at
  `);

  const items: HandoffItemView[] = itemRows.map((item) => ({
    id: String(item.id),
    category: String(item.category) as HandoffCategory,
    content: String(item.content),
    isConfirmed: bool(item.is_confirmed),
    isInherited: bool(item.is_inherited),
    sources: (sourceQuery.all(String(item.id)) as SqlRow[]).map(mapSourceRecord),
  }));

  const patientId = String(row.patient_id);
  const pendingTasks = getPendingTasks(patientId);
  const timeline = getTimeline(patientId);
  const status = String(row.status) as HandoffStatus;

  return {
    id: String(row.id),
    version: Number(row.version),
    status,
    conditionSummary: String(row.condition_summary),
    generatedAt: text(row.generated_at),
    confirmedAt: text(row.confirmed_at),
    confirmedBy: text(row.confirmed_by),
    receivedAt: text(row.received_at),
    receivedBy: text(row.received_by),
    patient: {
      id: patientId,
      handoffId: String(row.id),
      bedNo: String(row.bed_no),
      displayName: String(row.display_name),
      age: Number(row.age),
      gender: String(row.gender) as "男" | "女",
      diagnosis: String(row.diagnosis),
      acuity: String(row.acuity) as Acuity,
      status,
    },
    shift: {
      id: String(row.shift_id),
      date: String(row.shift_date),
      type: String(row.shift_type) as ShiftInfo["type"],
      handoverToType: String(row.handover_to_type) as ShiftInfo["handoverToType"],
      startedAt: String(row.started_at),
      endedAt: String(row.ended_at),
    },
    items,
    pendingTasks,
    timeline,
  };
}

function mapSourceRecord(row: SqlRow): SourceRecord {
  return {
    id: String(row.id),
    type: String(row.record_type) as SourceRecordType,
    occurredAt: String(row.occurred_at),
    content: String(row.content),
    isDemoData: bool(row.is_demo_data),
  };
}

export function getTimeline(patientId: string): TimelineEntry[] {
  const rows = getDatabase()
    .prepare(`
      SELECT h.*, s.shift_date, s.shift_type, s.handover_to_type
      FROM handoffs h
      JOIN shifts s ON s.id = h.shift_id
      WHERE h.patient_id = ? AND h.status != 'not_generated'
      ORDER BY s.started_at DESC, h.version DESC
    `)
    .all(patientId) as SqlRow[];
  return rows.map((row) => ({
    id: String(row.id),
    shiftDate: String(row.shift_date),
    shiftType: String(row.shift_type) as TimelineEntry["shiftType"],
    handoverToType: String(row.handover_to_type) as TimelineEntry["handoverToType"],
    status: String(row.status) as HandoffStatus,
    summary: String(row.condition_summary),
    confirmedAt: text(row.confirmed_at),
    confirmedBy: text(row.confirmed_by),
    receivedAt: text(row.received_at),
    receivedBy: text(row.received_by),
  }));
}

function getPendingTasks(patientId: string): PendingTaskView[] {
  const rows = getDatabase()
    .prepare(`
      SELECT * FROM pending_tasks
      WHERE patient_id = ?
      ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, created_at DESC
    `)
    .all(patientId) as SqlRow[];
  return rows.map((row) => ({
    id: String(row.id),
    content: String(row.content),
    status: String(row.status) as PendingTaskView["status"],
    createdAt: String(row.created_at),
    completedAt: text(row.completed_at),
  }));
}

export function createGenerationJob(idempotencyKey: string) {
  const database = getDatabase();
  const existing = database
    .prepare("SELECT * FROM generation_jobs WHERE idempotency_key = ?")
    .get(idempotencyKey) as SqlRow | undefined;
  if (existing) return { job: mapJob(existing), created: false };

  const countRow = database
    .prepare(`
      SELECT COUNT(*) AS count FROM handoffs
      WHERE shift_id = ? AND status IN ('not_generated', 'needs_review', 'failed')
    `)
    .get(CURRENT_SHIFT_ID) as { count: number };
  const id = randomUUID();
  const now = new Date().toISOString();
  database
    .prepare(`
      INSERT INTO generation_jobs (
        id, shift_id, idempotency_key, status, total_count,
        completed_count, failed_count, created_at
      ) VALUES (?, ?, ?, 'queued', ?, 0, 0, ?)
    `)
    .run(id, CURRENT_SHIFT_ID, idempotencyKey, countRow.count, now);

  return {
    job: getGenerationJob(id) as GenerationJob,
    created: true,
  };
}

export function getGenerationJob(id: string): GenerationJob | null {
  const row = getDatabase()
    .prepare("SELECT * FROM generation_jobs WHERE id = ?")
    .get(id) as SqlRow | undefined;
  return row ? mapJob(row) : null;
}

export function startGenerationJob(id: string) {
  const database = getDatabase();
  database
    .prepare("UPDATE generation_jobs SET status = 'running' WHERE id = ? AND status = 'queued'")
    .run(id);
  database
    .prepare(`
      UPDATE handoffs SET status = 'generating'
      WHERE shift_id = ? AND status IN ('not_generated', 'needs_review', 'failed')
    `)
    .run(CURRENT_SHIFT_ID);
}

export function getGenerationContexts(): GenerationContext[] {
  const database = getDatabase();
  const patientRows = database
    .prepare(`
      SELECT p.* FROM patients p
      JOIN handoffs h ON h.patient_id = p.id
      WHERE h.shift_id = ? AND h.status = 'generating'
      ORDER BY p.sort_order
    `)
    .all(CURRENT_SHIFT_ID) as SqlRow[];

  const recordsQuery = database.prepare(`
    SELECT * FROM source_records
    WHERE patient_id = ? AND shift_id = ?
    ORDER BY occurred_at
  `);
  const previousQuery = database.prepare(`
    SELECT h.* FROM handoffs h
    WHERE h.patient_id = ? AND h.shift_id != ? AND h.status = 'handed_over'
    ORDER BY h.received_at DESC LIMIT 1
  `);
  const previousItemsQuery = database.prepare(`
    SELECT content FROM handoff_items
    WHERE handoff_id = ?
    ORDER BY sort_order
  `);
  const pendingQuery = database.prepare(`
    SELECT content FROM pending_tasks
    WHERE patient_id = ? AND status = 'open'
    ORDER BY created_at
  `);

  return patientRows.map((patient) => {
    const previous = previousQuery.get(
      String(patient.id),
      CURRENT_SHIFT_ID,
    ) as SqlRow | undefined;
    return {
      patient: {
        id: String(patient.id),
        bedNo: String(patient.bed_no),
        displayName: String(patient.display_name),
        age: Number(patient.age),
        gender: String(patient.gender),
        diagnosis: String(patient.diagnosis),
        basicInfo: String(patient.basic_info),
      },
      previousHandoff: previous
        ? {
            summary: String(previous.condition_summary),
            items: (previousItemsQuery.all(String(previous.id)) as SqlRow[]).map(
              (item) => String(item.content),
            ),
          }
        : null,
      openPendingTasks: (
        pendingQuery.all(String(patient.id)) as SqlRow[]
      ).map((item) => String(item.content)),
      sourceRecords: (
        recordsQuery.all(String(patient.id), CURRENT_SHIFT_ID) as SqlRow[]
      ).map(mapSourceRecord),
    };
  });
}

export function saveGeneratedDraft(args: {
  jobId: string;
  context: GenerationContext;
  draft: HandoffDraft;
  modelName: string;
  mode: "deepseek" | "demo";
}) {
  const { context, draft } = args;
  if (draft.patient_id !== context.patient.id) {
    throw new Error("Model patient_id does not match the current patient");
  }
  const validSourceIds = new Set(context.sourceRecords.map((record) => record.id));
  const allDraftItems = [
    ...draft.shift_changes,
    ...draft.pending_tasks,
    ...draft.next_shift_attention,
    ...draft.needs_confirmation,
  ];
  for (const item of allDraftItems) {
    for (const sourceId of item.source_record_ids) {
      if (!validSourceIds.has(sourceId)) {
        throw new Error(`Unknown source record: ${sourceId}`);
      }
    }
  }

  const database = getDatabase();
  const handoff = database
    .prepare("SELECT id FROM handoffs WHERE patient_id = ? AND shift_id = ?")
    .get(context.patient.id, CURRENT_SHIFT_ID) as SqlRow | undefined;
  if (!handoff) throw new Error("Current handoff was not found");
  const handoffId = String(handoff.id);
  const now = new Date().toISOString();

  database.exec("BEGIN IMMEDIATE;");
  try {
    database
      .prepare("DELETE FROM pending_tasks WHERE created_in_handoff_id = ?")
      .run(handoffId);
    database
      .prepare("DELETE FROM handoff_items WHERE handoff_id = ?")
      .run(handoffId);
    database
      .prepare(`
        UPDATE handoffs
        SET status = 'needs_review', condition_summary = ?, generated_at = ?,
            confirmed_at = NULL, confirmed_by = NULL,
            received_at = NULL, received_by = NULL
        WHERE id = ?
      `)
      .run(draft.condition_summary, now, handoffId);

    const insertItem = database.prepare(`
      INSERT INTO handoff_items (
        id, handoff_id, category, content, is_confirmed,
        is_inherited, sort_order
      ) VALUES (?, ?, ?, ?, 0, ?, ?)
    `);
    const insertSource = database.prepare(`
      INSERT INTO item_sources (handoff_item_id, source_record_id) VALUES (?, ?)
    `);
    const categories: Array<[
      HandoffCategory,
      HandoffDraft["shift_changes"],
    ]> = [
      ["shift_change", draft.shift_changes],
      ["pending_task", draft.pending_tasks],
      ["attention", draft.next_shift_attention],
      ["confirmation", draft.needs_confirmation],
    ];
    let sortOrder = 0;
    categories.forEach(([category, entries]) => {
      entries.forEach((entry) => {
        const itemId = randomUUID();
        insertItem.run(
          itemId,
          handoffId,
          category,
          entry.content,
          entry.inherited ? 1 : 0,
          sortOrder++,
        );
        entry.source_record_ids.forEach((sourceId) => {
          insertSource.run(itemId, sourceId);
        });
        if (category === "pending_task") {
          const inherited = database
            .prepare(`
              SELECT id FROM pending_tasks
              WHERE patient_id = ? AND status = 'open' AND content = ?
              LIMIT 1
            `)
            .get(context.patient.id, entry.content) as SqlRow | undefined;
          if (!inherited) {
            database
              .prepare(`
                INSERT INTO pending_tasks (
                  id, patient_id, content, status, created_in_handoff_id,
                  source_handoff_item_id, created_at
                ) VALUES (?, ?, ?, 'open', ?, ?, ?)
              `)
              .run(
                randomUUID(),
                context.patient.id,
                entry.content,
                handoffId,
                itemId,
                now,
              );
          }
        }
      });
    });

    database
      .prepare(`
        INSERT INTO generation_runs (
          id, generation_job_id, patient_id, input_snapshot,
          model_provider, model_name, model_output, validation_result,
          status, created_at
        ) VALUES (?, ?, ?, ?, 'deepseek', ?, ?, ?, 'completed', ?)
      `)
      .run(
        randomUUID(),
        args.jobId,
        context.patient.id,
        JSON.stringify(context),
        args.modelName,
        JSON.stringify(draft),
        JSON.stringify({ valid: true, mode: args.mode }),
        now,
      );
    database.exec("COMMIT;");
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
}

export function recordGenerationFailure(args: {
  jobId: string;
  context: GenerationContext;
  modelName: string;
  errorMessage: string;
}) {
  const database = getDatabase();
  const now = new Date().toISOString();
  database
    .prepare(`
      UPDATE handoffs SET status = 'failed'
      WHERE patient_id = ? AND shift_id = ?
    `)
    .run(args.context.patient.id, CURRENT_SHIFT_ID);
  database
    .prepare(`
      INSERT INTO generation_runs (
        id, generation_job_id, patient_id, input_snapshot,
        model_provider, model_name, validation_result,
        status, error_message, created_at
      ) VALUES (?, ?, ?, ?, 'deepseek', ?, ?, 'failed', ?, ?)
    `)
    .run(
      randomUUID(),
      args.jobId,
      args.context.patient.id,
      JSON.stringify(args.context),
      args.modelName,
      JSON.stringify({ valid: false }),
      args.errorMessage,
      now,
    );
}

export function updateGenerationProgress(
  jobId: string,
  completedCount: number,
  failedCount: number,
) {
  getDatabase()
    .prepare(`
      UPDATE generation_jobs
      SET completed_count = ?, failed_count = ?
      WHERE id = ?
    `)
    .run(completedCount, failedCount, jobId);
}

export function finishGenerationJob(
  jobId: string,
  status: Extract<GenerationJobStatus, "completed" | "partial_failed" | "failed">,
) {
  getDatabase()
    .prepare(`
      UPDATE generation_jobs
      SET status = ?, finished_at = ?
      WHERE id = ?
    `)
    .run(status, new Date().toISOString(), jobId);
}

export function updateHandoff(
  handoffId: string,
  input: { conditionSummary: string; items: Array<{ id: string; content: string }> },
) {
  const database = getDatabase();
  const handoff = database
    .prepare("SELECT status FROM handoffs WHERE id = ?")
    .get(handoffId) as SqlRow | undefined;
  if (!handoff) return { kind: "not_found" as const };
  if (handoff.status !== "needs_review") {
    return { kind: "invalid_state" as const };
  }

  database.exec("BEGIN IMMEDIATE;");
  try {
    database
      .prepare("UPDATE handoffs SET condition_summary = ? WHERE id = ?")
      .run(input.conditionSummary, handoffId);
    const updateItem = database.prepare(`
      UPDATE handoff_items SET content = ? WHERE id = ? AND handoff_id = ?
    `);
    input.items.forEach((item) => {
      updateItem.run(item.content, item.id, handoffId);
    });
    database.exec("COMMIT;");
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
  return { kind: "ok" as const, detail: getHandoffDetail(handoffId) };
}

export function addSupplement(
  handoffId: string,
  input: { content: string; actor: string },
) {
  const database = getDatabase();
  const handoff = database
    .prepare("SELECT patient_id, shift_id, status FROM handoffs WHERE id = ?")
    .get(handoffId) as SqlRow | undefined;
  if (!handoff) return { kind: "not_found" as const };
  if (handoff.status !== "needs_review") {
    return { kind: "invalid_state" as const };
  }

  const now = new Date().toISOString();
  const sourceId = randomUUID();
  const itemId = randomUUID();
  database.exec("BEGIN IMMEDIATE;");
  try {
    database
      .prepare(`
        INSERT INTO source_records (
          id, patient_id, shift_id, record_type, occurred_at, content, is_demo_data
        ) VALUES (?, ?, ?, 'doctor_note', ?, ?, 1)
      `)
      .run(
        sourceId,
        String(handoff.patient_id),
        String(handoff.shift_id),
        now,
        `${input.actor}补充：${input.content}`,
      );
    database
      .prepare(`
        INSERT INTO handoff_items (
          id, handoff_id, category, content, is_confirmed, is_inherited, sort_order
        ) VALUES (?, ?, 'confirmation', ?, 0, 0, 999)
      `)
      .run(itemId, handoffId, input.content);
    database
      .prepare("INSERT INTO item_sources (handoff_item_id, source_record_id) VALUES (?, ?)")
      .run(itemId, sourceId);
    database.exec("COMMIT;");
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
  return { kind: "ok" as const, detail: getHandoffDetail(handoffId) };
}

function snapshotHandoff(handoffId: string) {
  const detail = getHandoffDetail(handoffId);
  if (!detail) throw new Error("Handoff not found for snapshot");
  return detail;
}

export function confirmHandoff(
  handoffId: string,
  input: { actor: string; idempotencyKey: string },
) {
  const database = getDatabase();
  const duplicate = database
    .prepare("SELECT resource_id FROM action_idempotency WHERE idempotency_key = ?")
    .get(input.idempotencyKey) as SqlRow | undefined;
  if (duplicate) {
    return { kind: "ok" as const, detail: getHandoffDetail(String(duplicate.resource_id)) };
  }
  const handoff = database
    .prepare("SELECT status, version FROM handoffs WHERE id = ?")
    .get(handoffId) as SqlRow | undefined;
  if (!handoff) return { kind: "not_found" as const };
  if (handoff.status !== "needs_review") {
    return { kind: "invalid_state" as const };
  }
  const now = new Date().toISOString();

  database.exec("BEGIN IMMEDIATE;");
  try {
    database
      .prepare(`
        UPDATE handoffs
        SET status = 'confirmed', confirmed_at = ?, confirmed_by = ?, version = version + 1
        WHERE id = ?
      `)
      .run(now, input.actor, handoffId);
    database
      .prepare("UPDATE handoff_items SET is_confirmed = 1 WHERE handoff_id = ?")
      .run(handoffId);
    const snapshot = snapshotHandoff(handoffId);
    database
      .prepare(`
        INSERT INTO handoff_versions (
          id, handoff_id, version, event_type, snapshot, actor, created_at
        ) VALUES (?, ?, ?, 'confirmed', ?, ?, ?)
      `)
      .run(
        randomUUID(),
        handoffId,
        snapshot.version,
        JSON.stringify(snapshot),
        input.actor,
        now,
      );
    database
      .prepare(`
        INSERT INTO action_idempotency (idempotency_key, action, resource_id, created_at)
        VALUES (?, 'confirm', ?, ?)
      `)
      .run(input.idempotencyKey, handoffId, now);
    database.exec("COMMIT;");
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
  return { kind: "ok" as const, detail: getHandoffDetail(handoffId) };
}

export function receiveHandoff(
  handoffId: string,
  input: { actor: string; idempotencyKey: string },
) {
  const database = getDatabase();
  const duplicate = database
    .prepare("SELECT resource_id FROM action_idempotency WHERE idempotency_key = ?")
    .get(input.idempotencyKey) as SqlRow | undefined;
  if (duplicate) {
    return { kind: "ok" as const, detail: getHandoffDetail(String(duplicate.resource_id)) };
  }
  const handoff = database
    .prepare("SELECT status, version FROM handoffs WHERE id = ?")
    .get(handoffId) as SqlRow | undefined;
  if (!handoff) return { kind: "not_found" as const };
  if (handoff.status !== "confirmed") {
    return { kind: "invalid_state" as const };
  }
  const now = new Date().toISOString();

  database.exec("BEGIN IMMEDIATE;");
  try {
    database
      .prepare(`
        UPDATE handoffs
        SET status = 'handed_over', received_at = ?, received_by = ?
        WHERE id = ?
      `)
      .run(now, input.actor, handoffId);
    const snapshot = snapshotHandoff(handoffId);
    database
      .prepare(`
        INSERT INTO handoff_versions (
          id, handoff_id, version, event_type, snapshot, actor, created_at
        ) VALUES (?, ?, ?, 'received', ?, ?, ?)
      `)
      .run(
        randomUUID(),
        handoffId,
        snapshot.version,
        JSON.stringify(snapshot),
        input.actor,
        now,
      );
    database
      .prepare(`
        INSERT INTO action_idempotency (idempotency_key, action, resource_id, created_at)
        VALUES (?, 'receive', ?, ?)
      `)
      .run(input.idempotencyKey, handoffId, now);
    database.exec("COMMIT;");
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
  return { kind: "ok" as const, detail: getHandoffDetail(handoffId) };
}

export function updatePendingTask(
  taskId: string,
  status: PendingTaskView["status"],
) {
  const database = getDatabase();
  const existing = database
    .prepare("SELECT patient_id FROM pending_tasks WHERE id = ?")
    .get(taskId) as SqlRow | undefined;
  if (!existing) return { kind: "not_found" as const };
  const now = new Date().toISOString();
  database
    .prepare(`
      UPDATE pending_tasks
      SET status = ?,
          completed_in_shift_id = CASE WHEN ? = 'completed' THEN ? ELSE NULL END,
          completed_at = CASE WHEN ? = 'completed' THEN ? ELSE NULL END
      WHERE id = ?
    `)
    .run(status, status, CURRENT_SHIFT_ID, status, now, taskId);
  return {
    kind: "ok" as const,
    pendingTasks: getPendingTasks(String(existing.patient_id)),
  };
}
