import "server-only";

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  CURRENT_SHIFT_ID,
  DEMO_WARD_ID,
  PREVIOUS_SHIFT_ID,
  demoCases,
} from "@/features/handoff/demo-data";

const DATABASE_VERSION = 1;

type GlobalWithDatabase = typeof globalThis & {
  __onTimeHandoffDb?: DatabaseSync;
};

const globalWithDatabase = globalThis as GlobalWithDatabase;

function createDatabase() {
  const dataDirectory = join(process.cwd(), "data");
  mkdirSync(dataDirectory, { recursive: true });

  const database = new DatabaseSync(
    join(dataDirectory, "on-time-handoff.sqlite"),
    {
      timeout: 5_000,
      enableForeignKeyConstraints: true,
      enableDoubleQuotedStringLiterals: false,
    },
  );

  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA synchronous = NORMAL;");
  migrate(database);
  seed(database);
  recoverInterruptedJobs(database);
  return database;
}

function migrate(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS wards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      ward_id TEXT NOT NULL REFERENCES wards(id),
      bed_no TEXT NOT NULL,
      display_name TEXT NOT NULL,
      age INTEGER NOT NULL,
      gender TEXT NOT NULL CHECK (gender IN ('男', '女')),
      diagnosis TEXT NOT NULL,
      basic_info TEXT NOT NULL,
      acuity TEXT NOT NULL CHECK (acuity IN ('critical', 'watch', 'stable')),
      sort_order INTEGER NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      shift_date TEXT NOT NULL,
      shift_type TEXT NOT NULL CHECK (shift_type IN ('day', 'night')),
      handover_to_type TEXT NOT NULL CHECK (handover_to_type IN ('day', 'night')),
      started_at TEXT NOT NULL,
      ended_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS source_records (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      shift_id TEXT NOT NULL REFERENCES shifts(id),
      record_type TEXT NOT NULL CHECK (record_type IN ('progress', 'order', 'lab', 'exam', 'doctor_note')),
      occurred_at TEXT NOT NULL,
      content TEXT NOT NULL,
      is_demo_data INTEGER NOT NULL DEFAULT 1 CHECK (is_demo_data IN (0, 1))
    ) STRICT;

    CREATE TABLE IF NOT EXISTS handoffs (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      shift_id TEXT NOT NULL REFERENCES shifts(id),
      previous_handoff_id TEXT REFERENCES handoffs(id),
      version INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL CHECK (status IN ('not_generated', 'generating', 'needs_review', 'confirmed', 'handed_over', 'failed')),
      condition_summary TEXT NOT NULL DEFAULT '',
      generated_at TEXT,
      confirmed_at TEXT,
      confirmed_by TEXT,
      received_at TEXT,
      received_by TEXT,
      UNIQUE (patient_id, shift_id, version)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS handoff_items (
      id TEXT PRIMARY KEY,
      handoff_id TEXT NOT NULL REFERENCES handoffs(id) ON DELETE CASCADE,
      category TEXT NOT NULL CHECK (category IN ('shift_change', 'pending_task', 'attention', 'confirmation')),
      content TEXT NOT NULL,
      is_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (is_confirmed IN (0, 1)),
      is_inherited INTEGER NOT NULL DEFAULT 0 CHECK (is_inherited IN (0, 1)),
      inherited_from_item_id TEXT REFERENCES handoff_items(id),
      sort_order INTEGER NOT NULL DEFAULT 0
    ) STRICT;

    CREATE TABLE IF NOT EXISTS item_sources (
      handoff_item_id TEXT NOT NULL REFERENCES handoff_items(id) ON DELETE CASCADE,
      source_record_id TEXT NOT NULL REFERENCES source_records(id),
      PRIMARY KEY (handoff_item_id, source_record_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS pending_tasks (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      content TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('open', 'completed', 'cancelled')),
      created_in_handoff_id TEXT NOT NULL REFERENCES handoffs(id),
      source_handoff_item_id TEXT REFERENCES handoff_items(id),
      completed_in_shift_id TEXT REFERENCES shifts(id),
      created_at TEXT NOT NULL,
      completed_at TEXT
    ) STRICT;

    CREATE TABLE IF NOT EXISTS generation_jobs (
      id TEXT PRIMARY KEY,
      shift_id TEXT NOT NULL REFERENCES shifts(id),
      idempotency_key TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'partial_failed', 'failed')),
      total_count INTEGER NOT NULL,
      completed_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      created_at TEXT NOT NULL,
      finished_at TEXT
    ) STRICT;

    CREATE TABLE IF NOT EXISTS generation_runs (
      id TEXT PRIMARY KEY,
      generation_job_id TEXT NOT NULL REFERENCES generation_jobs(id),
      patient_id TEXT NOT NULL REFERENCES patients(id),
      input_snapshot TEXT NOT NULL,
      model_provider TEXT NOT NULL,
      model_name TEXT NOT NULL,
      model_output TEXT,
      validation_result TEXT,
      status TEXT NOT NULL CHECK (status IN ('completed', 'failed')),
      error_message TEXT,
      created_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS handoff_versions (
      id TEXT PRIMARY KEY,
      handoff_id TEXT NOT NULL REFERENCES handoffs(id),
      version INTEGER NOT NULL,
      event_type TEXT NOT NULL CHECK (event_type IN ('confirmed', 'received')),
      snapshot TEXT NOT NULL,
      actor TEXT NOT NULL,
      created_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS action_idempotency (
      idempotency_key TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_handoffs_shift ON handoffs(shift_id, status);
    CREATE INDEX IF NOT EXISTS idx_handoffs_patient ON handoffs(patient_id, shift_id);
    CREATE INDEX IF NOT EXISTS idx_source_records_patient_shift ON source_records(patient_id, shift_id);
    CREATE INDEX IF NOT EXISTS idx_handoff_items_handoff ON handoff_items(handoff_id, category, sort_order);
    CREATE INDEX IF NOT EXISTS idx_pending_tasks_patient ON pending_tasks(patient_id, status);
    CREATE INDEX IF NOT EXISTS idx_generation_jobs_shift ON generation_jobs(shift_id, created_at);
  `);

  database.exec(`PRAGMA user_version = ${DATABASE_VERSION};`);
}

function seed(database: DatabaseSync) {
  const existing = database.prepare("SELECT COUNT(*) AS count FROM patients").get() as {
    count: number;
  };
  if (existing.count > 0) return;

  database.exec("BEGIN IMMEDIATE;");
  try {
    database
      .prepare("INSERT INTO wards (id, name, department) VALUES (?, ?, ?)")
      .run(DEMO_WARD_ID, "5A 病区", "呼吸与综合内科");

    const insertShift = database.prepare(`
      INSERT INTO shifts (id, shift_date, shift_type, handover_to_type, started_at, ended_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertShift.run(
      PREVIOUS_SHIFT_ID,
      "2026-08-27",
      "night",
      "day",
      "2026-08-27T20:00:00+08:00",
      "2026-08-28T08:00:00+08:00",
    );
    insertShift.run(
      CURRENT_SHIFT_ID,
      "2026-08-28",
      "day",
      "night",
      "2026-08-28T08:00:00+08:00",
      "2026-08-28T20:00:00+08:00",
    );

    const insertPatient = database.prepare(`
      INSERT INTO patients (
        id, ward_id, bed_no, display_name, age, gender,
        diagnosis, basic_info, acuity, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertRecord = database.prepare(`
      INSERT INTO source_records (
        id, patient_id, shift_id, record_type, occurred_at, content, is_demo_data
      ) VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    const insertHandoff = database.prepare(`
      INSERT INTO handoffs (
        id, patient_id, shift_id, previous_handoff_id, version, status,
        condition_summary, generated_at, confirmed_at, confirmed_by,
        received_at, received_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertItem = database.prepare(`
      INSERT INTO handoff_items (
        id, handoff_id, category, content, is_confirmed,
        is_inherited, inherited_from_item_id, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertItemSource = database.prepare(`
      INSERT INTO item_sources (handoff_item_id, source_record_id) VALUES (?, ?)
    `);
    const insertPendingTask = database.prepare(`
      INSERT INTO pending_tasks (
        id, patient_id, content, status, created_in_handoff_id,
        source_handoff_item_id, created_at
      ) VALUES (?, ?, ?, 'open', ?, ?, ?)
    `);

    demoCases.forEach((demoCase, index) => {
      const { patient } = demoCase;
      const previousHandoffId = `HANDOFF-${PREVIOUS_SHIFT_ID}-${patient.id}`;
      const currentHandoffId = `HANDOFF-${CURRENT_SHIFT_ID}-${patient.id}`;
      const previousSourceId = `SRC-PREV-${patient.id}`;
      const previousItemId = `ITEM-PREV-${patient.id}`;

      insertPatient.run(
        patient.id,
        DEMO_WARD_ID,
        patient.bedNo,
        patient.displayName,
        patient.age,
        patient.gender,
        patient.diagnosis,
        patient.basicInfo,
        patient.acuity,
        index + 1,
      );

      insertRecord.run(
        previousSourceId,
        patient.id,
        PREVIOUS_SHIFT_ID,
        "progress",
        "2026-08-28T06:30:00+08:00",
        demoCase.previousChange,
      );
      demoCase.records.forEach((record) => {
        insertRecord.run(
          record.id,
          patient.id,
          CURRENT_SHIFT_ID,
          record.type,
          record.occurredAt,
          record.content,
        );
      });

      insertHandoff.run(
        previousHandoffId,
        patient.id,
        PREVIOUS_SHIFT_ID,
        null,
        1,
        "handed_over",
        demoCase.previousSummary,
        "2026-08-28T07:10:00+08:00",
        "2026-08-28T07:25:00+08:00",
        "夜班·何医生",
        "2026-08-28T07:38:00+08:00",
        "白班·沈医生",
      );
      insertItem.run(
        previousItemId,
        previousHandoffId,
        "shift_change",
        demoCase.previousChange,
        1,
        0,
        null,
        0,
      );
      insertItemSource.run(previousItemId, previousSourceId);

      if (demoCase.previousPending) {
        const pendingItemId = `ITEM-PREV-PENDING-${patient.id}`;
        insertItem.run(
          pendingItemId,
          previousHandoffId,
          "pending_task",
          demoCase.previousPending,
          1,
          0,
          null,
          1,
        );
        insertItemSource.run(pendingItemId, previousSourceId);
        insertPendingTask.run(
          `TASK-PREV-${patient.id}`,
          patient.id,
          demoCase.previousPending,
          previousHandoffId,
          pendingItemId,
          "2026-08-28T07:25:00+08:00",
        );
      }

      insertHandoff.run(
        currentHandoffId,
        patient.id,
        CURRENT_SHIFT_ID,
        previousHandoffId,
        1,
        "not_generated",
        "",
        null,
        null,
        null,
        null,
        null,
      );
    });

    database.exec("COMMIT;");
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
}

function recoverInterruptedJobs(database: DatabaseSync) {
  const now = new Date().toISOString();
  database
    .prepare(`
      UPDATE generation_jobs
      SET status = 'failed',
          error_message = '本地服务在任务完成前重启，请重新生成。',
          finished_at = ?
      WHERE status = 'running'
    `)
    .run(now);
  database
    .prepare(`
      UPDATE handoffs
      SET status = 'failed'
      WHERE status = 'generating'
    `)
    .run();
}

export function getDatabase() {
  if (!globalWithDatabase.__onTimeHandoffDb) {
    globalWithDatabase.__onTimeHandoffDb = createDatabase();
  }
  return globalWithDatabase.__onTimeHandoffDb;
}
