import {
  claimNextEnrichmentJob,
  completeEnrichmentJob,
  failEnrichmentJob,
  recoverStuckEnrichmentJobs,
} from "../modules/captures/enrichment/enrichment-job.repository.js";

import { enrichCapture } from "../modules/captures/enrichment/enrichment.service.js";
import { logger } from "../utils/logger.js";

const POLL_INTERVAL = 1000;
const RECOVERY_INTERVAL = 60_000;

let lastRecovery = 0;
let isShuttingDown = false;
let currentJobPromise: Promise<boolean> | null = null;

const JOB_TIMEOUT = 2 * 60 * 1000; // 2 minutes

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Enrichment timed out after ${timeoutMs / 1000}s`));
      }, timeoutMs);
    }),
  ]);
}

async function processNextJob() {
  const job = await claimNextEnrichmentJob();

  if (!job) {
    return false;
  }

  logger.info("Processing enrichment job", { jobId: job.id });

  try {
    await withTimeout(
      enrichCapture(job.capture_id, job.user_id, job.url),
      JOB_TIMEOUT,
    );

    await completeEnrichmentJob(job.id);

    logger.info("Enrichment job completed", { jobId: job.id });
  } catch (error) {
    logger.error("Enrichment job failed", {
      jobId: job.id,
      error: error instanceof Error ? error.message : String(error),
    });

    await failEnrichmentJob(
      job.id,
      error instanceof Error ? error.message : String(error),
      job.attempts,
    );
  }

  return true;
}

async function recoverStuckJobs() {
  const jobs = await recoverStuckEnrichmentJobs();

  if (jobs.length > 0) {
    logger.warn("Recovered stuck enrichment jobs", { count: jobs.length });
  }
}

async function shutdown(signal: string) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  logger.info("Worker shutdown requested", { signal });

  if (currentJobPromise) {
    logger.info("Waiting for current job to finish");

    await currentJobPromise;
  }

  logger.info("Worker stopped");

  process.exit(0);
}

async function startWorker() {
  logger.info("Enrichment worker started");

  while (!isShuttingDown) {
    try {
      if (Date.now() - lastRecovery >= RECOVERY_INTERVAL) {
        await recoverStuckJobs();
        lastRecovery = Date.now();
      }

      currentJobPromise = processNextJob();

      try {
        const processed = await currentJobPromise;

        if (!processed && !isShuttingDown) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        }
      } finally {
        currentJobPromise = null;
      }
    } catch (error) {
      logger.error("Worker error", {
        error: error instanceof Error ? error.message : String(error),
      });

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

startWorker();
