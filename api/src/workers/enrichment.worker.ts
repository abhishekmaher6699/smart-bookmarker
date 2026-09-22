import {
  claimNextEnrichmentJob,
  completeEnrichmentJob,
  createEnrichmentJob,
  failEnrichmentJob,
  recoverStuckEnrichmentJobs,
} from "../modules/captures/enrichment/enrichment-job.repository.js";

import {
  runIngestionJob,
  runCategorizationJob,
  runSummaryJob,
  runEmbeddingJob,
} from "../modules/captures/enrichment/enrichment.service.js";

import { disconnectDatabase } from "../db/client.js";

import { isGeminiRateLimitError } from "../integrations/gemini/gemini.client.js";
import { logger } from "../utils/logger.js";
import { incrementMetric, recordJobDuration } from "../utils/metrics.js";
import {
  startWorkerMetricsServer,
  stopWorkerMetricsServer,
} from "./worker-metrics.js";

const POLL_INTERVAL = 1000;
const RECOVERY_INTERVAL = 60_000;

let lastRecovery = 0;
let isShuttingDown = false;
let currentJobPromise: Promise<boolean> | null = null;

const JOB_TIMEOUT = 2 * 60 * 1000;
const RATE_LIMIT_RETRY_DELAY = 60_000;

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

async function processEnrichmentJob(job: {
  type: "ingestion" | "categorization" | "summary" | "embedding";
  capture_id: string;
  user_id: string;
  url: string;
}) {
  switch (job.type) {
    case "ingestion": {
      const result = await runIngestionJob(job.capture_id, job.url);

      if (result.requiresAiEnrichment) {
        await createEnrichmentJob(job.capture_id, "categorization");
        await createEnrichmentJob(job.capture_id, "summary");
      }

      return result;
    }

    case "categorization":
      return runCategorizationJob(job.capture_id, job.user_id);

    case "summary":
      return runSummaryJob(job.capture_id);

    case "embedding":
      return runEmbeddingJob(job.capture_id);

    default:
      throw new Error(`Unknown enrichment job type: ${job.type}`);
  }
}

async function processNextJob() {
  const job = await claimNextEnrichmentJob();

  if (!job) {
    return false;
  }

  const jobStartedAt = Date.now();

  logger.info("Processing enrichment job", {
    jobId: job.id,
    type: job.type,
  });

  try {
    await withTimeout(processEnrichmentJob(job), JOB_TIMEOUT);

    const completedJob = await completeEnrichmentJob(job.id, job.lease_id);

    if (!completedJob) {
      logger.warn("Job completion rejected because lease was lost", {
        jobId: job.id,
        type: job.type,
      });

      return true;
    }

    logger.info("Enrichment job completed", {
      jobId: job.id,
      type: job.type,
    });

    incrementMetric("jobs_completed_total", 1, {
      type: job.type,
    });
  } catch (error) {
    const rateLimited = isGeminiRateLimitError(error);

    logger.error("Enrichment job failed", {
      jobId: job.id,
      type: job.type,
      rateLimited,
      error: error instanceof Error ? error.message : String(error),
    });

    const failedJob = await failEnrichmentJob(
      job.id,
      job.lease_id,
      error instanceof Error ? error.message : String(error),
      job.attempts,
      rateLimited ? RATE_LIMIT_RETRY_DELAY : undefined,
    );

    if (!failedJob) {
      logger.warn("Job failure update rejected because lease was lost", {
        jobId: job.id,
        type: job.type,
      });
    } else {
      incrementMetric("jobs_failed_total", 1, {
        type: job.type,
      });

      if (failedJob.status === "pending") {
        incrementMetric("jobs_retried_total", 1, {
          type: job.type,
        });
      }
    }
  } finally {
    recordJobDuration(Date.now() - jobStartedAt, {
      type: job.type,
    });
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

  try {
    if (currentJobPromise) {
      logger.info("Waiting for current job to finish");

      await currentJobPromise;
    }

    logger.info("Worker stopped");

    await stopWorkerMetricsServer();
    await disconnectDatabase();

    logger.info("Worker shutdown complete");

    process.exit(0);
  } catch (error) {
    logger.error("Worker shutdown failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    process.exit(1);
  }
}

async function startWorker() {
  startWorkerMetricsServer();
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

startWorker().catch((error) => {
  logger.error("Worker failed to start", {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exit(1);
});
