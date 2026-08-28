import "server-only";

import { generateDraft } from "./deepseek";
import {
  finishGenerationJob,
  getGenerationContexts,
  getGenerationJob,
  recordGenerationFailure,
  saveGeneratedDraft,
  startGenerationJob,
  updateGenerationProgress,
} from "./handoff-repository";

type GlobalWithGenerationJobs = typeof globalThis & {
  __onTimeHandoffRunningJobs?: Set<string>;
};

const globalWithGenerationJobs = globalThis as GlobalWithGenerationJobs;
const runningJobs =
  globalWithGenerationJobs.__onTimeHandoffRunningJobs ?? new Set<string>();
globalWithGenerationJobs.__onTimeHandoffRunningJobs = runningJobs;

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "未知生成错误";
  return message.slice(0, 500);
}

export function runGenerationJob(jobId: string) {
  if (runningJobs.has(jobId)) return;
  runningJobs.add(jobId);

  void (async () => {
    try {
      const job = getGenerationJob(jobId);
      if (!job || (job.status !== "queued" && job.status !== "running")) return;

      startGenerationJob(jobId);
      const contexts = getGenerationContexts();
      let cursor = 0;
      let completedCount = 0;
      let failedCount = 0;

      const worker = async () => {
        while (cursor < contexts.length) {
          const context = contexts[cursor++];
          try {
            const generated = await generateDraft(context);
            saveGeneratedDraft({
              jobId,
              context,
              draft: generated.draft,
              modelName: generated.modelName,
              mode: generated.mode,
            });
            completedCount += 1;
          } catch (error) {
            failedCount += 1;
            recordGenerationFailure({
              jobId,
              context,
              modelName: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
              errorMessage: safeErrorMessage(error),
            });
          }
          updateGenerationProgress(jobId, completedCount, failedCount);
        }
      };

      const workerCount = Math.min(3, Math.max(contexts.length, 1));
      await Promise.all(Array.from({ length: workerCount }, () => worker()));

      const finalStatus =
        failedCount === 0
          ? "completed"
          : completedCount === 0
            ? "failed"
            : "partial_failed";
      finishGenerationJob(jobId, finalStatus);
    } finally {
      runningJobs.delete(jobId);
    }
  })();
}
