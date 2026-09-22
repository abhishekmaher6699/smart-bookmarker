import { beforeEach, describe, expect, it } from "vitest";
import { pool } from "../../src/db/client.js";
import { createUser } from "../../src/modules/auth/auth.repository.js";
import { insertCapture } from "../../src/modules/captures/capture.repository.js";
import {
  claimNextEnrichmentJob,
  completeEnrichmentJob,
  createEnrichmentJob,
  failEnrichmentJob,
  recoverStuckEnrichmentJobs,
  retryFailedEnrichmentJobs,
} from "../../src/modules/captures/enrichment/enrichment-job.repository.js";
import {
  updateCaptureEnrichment,
  updateCaptureSummary,
} from "../../src/modules/captures/enrichment/enrichment.repository.js";

describe("enrichment repository", () => {
  beforeEach(async () => {
    await pool.query("DELETE FROM users");
  });

  async function createTestCapture(email = "enrichment@example.com") {
    const user = await createUser(email, "hashed-password");

    const capture = await insertCapture({
      userID: user.id,
      url: `https://example.com/${email}`,
      title: "Original title",
      type: "article",
      content: "Original content",
    });

    return { user, capture };
  }

  it("should create an enrichment job", async () => {
    const { capture } = await createTestCapture();

    const job = await createEnrichmentJob(capture.id, "ingestion");

    expect(job).toMatchObject({
      capture_id: capture.id,
      type: "ingestion",
      status: "pending",
      attempts: 0,
    });

    expect(job?.id).toEqual(expect.any(String));
  });

  it("should not create a duplicate enrichment job", async () => {
    const { capture } = await createTestCapture("duplicate@example.com");

    const first = await createEnrichmentJob(capture.id, "summary");
    const second = await createEnrichmentJob(capture.id, "summary");

    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it("should retry failed enrichment jobs", async () => {
    const { capture } = await createTestCapture("retry@example.com");

    const job = await createEnrichmentJob(capture.id, "summary");

    await pool.query(
      `
      UPDATE enrichment_jobs
      SET
        status = 'failed',
        attempts = 3,
        last_error = 'previous error',
        started_at = NOW(),
        completed_at = NULL,
        lease_id = gen_random_uuid(),
        lease_until = NOW() + INTERVAL '5 minutes'
      WHERE id = $1
      `,
      [job!.id],
    );

    const retried = await retryFailedEnrichmentJobs(capture.id);

    expect(retried).toHaveLength(1);
    expect(retried[0]).toMatchObject({
      id: job!.id,
      status: "pending",
      attempts: 0,
      last_error: null,
      started_at: null,
      completed_at: null,
      lease_id: null,
      lease_until: null,
    });
  });

  it("should claim the next pending enrichment job", async () => {
    const { user, capture } = await createTestCapture("claim@example.com");

    const job = await createEnrichmentJob(capture.id, "embedding");

    const claimed = await claimNextEnrichmentJob();

    expect(claimed).toMatchObject({
      id: job!.id,
      capture_id: capture.id,
      type: "embedding",
      user_id: user.id,
      url: capture.url,
      status: "processing",
      attempts: 1,
    });

    expect(claimed.lease_id).toEqual(expect.any(String));
    expect(claimed.lease_until).toBeTruthy();
  });

  it("should return null when there are no pending jobs", async () => {
    const claimed = await claimNextEnrichmentJob();

    expect(claimed).toBeNull();
  });

  it("should complete a claimed job with the correct lease", async () => {
    const { capture } = await createTestCapture("complete@example.com");

    const job = await createEnrichmentJob(capture.id, "categorization");
    const claimed = await claimNextEnrichmentJob();

    const completed = await completeEnrichmentJob(job!.id, claimed!.lease_id);

    expect(completed).toMatchObject({
      id: job!.id,
      status: "completed",
      lease_id: null,
      lease_until: null,
    });

    expect(completed?.completed_at).toBeTruthy();
  });

  it("should not complete a job with the wrong lease", async () => {
    const { capture } = await createTestCapture("wrong-lease@example.com");

    const job = await createEnrichmentJob(capture.id, "categorization");
    await claimNextEnrichmentJob();

    const completed = await completeEnrichmentJob(
      job!.id,
      "00000000-0000-0000-0000-000000000000",
    );

    expect(completed).toBeNull();
  });

  it("should fail a job and schedule a retry", async () => {
    const { capture } = await createTestCapture("fail@example.com");

    const job = await createEnrichmentJob(capture.id, "summary");
    const claimed = await claimNextEnrichmentJob();

    const failed = await failEnrichmentJob(
      job!.id,
      claimed!.lease_id,
      "worker failed",
      1,
    );

    expect(failed).toMatchObject({
      id: job!.id,
      status: "pending",
      last_error: "worker failed",
      started_at: null,
      lease_id: null,
      lease_until: null,
    });

    expect(failed!.available_at).toBeTruthy();
  });

  it("should permanently fail a job after max attempts", async () => {
    const { capture } = await createTestCapture("permanent-fail@example.com");

    const job = await createEnrichmentJob(capture.id, "summary");
    const claimed = await claimNextEnrichmentJob();

    const failed = await failEnrichmentJob(
      job!.id,
      claimed!.lease_id,
      "final failure",
      4,
    );

    expect(failed).toMatchObject({
      id: job!.id,
      status: "failed",
      last_error: "final failure",
      started_at: null,
      lease_id: null,
      lease_until: null,
    });
  });

  it("should recover stuck processing jobs", async () => {
    const { capture } = await createTestCapture("recover@example.com");

    const job = await createEnrichmentJob(capture.id, "ingestion");
    await claimNextEnrichmentJob();

    await pool.query(
      `
      UPDATE enrichment_jobs
      SET lease_until = NOW() - INTERVAL '1 minute'
      WHERE id = $1
      `,
      [job!.id],
    );

    const recovered = await recoverStuckEnrichmentJobs();

    expect(recovered).toHaveLength(1);
    expect(recovered[0]).toMatchObject({
      id: job!.id,
      status: "pending",
      started_at: null,
      lease_id: null,
      lease_until: null,
    });
  });

  it("should update capture enrichment data", async () => {
    const { capture } = await createTestCapture(
      "capture-enrichment@example.com",
    );

    const updated = await updateCaptureEnrichment(capture.id, {
      title: "Enriched title",
      type: "article",
      description: "Enriched description",
      thumbnailUrl: "https://example.com/thumb.jpg",
      content: "Enriched content",
      categoryId: null,
      tags: ["testing", "backend"],
    });

    expect(updated).toMatchObject({
      id: capture.id,
      title: "Enriched title",
      type: "article",
      description: "Enriched description",
      thumbnail_url: "https://example.com/thumb.jpg",
      content: "Enriched content",
      tags: ["testing", "backend"],
    });
  });

  it("should update capture summary", async () => {
    const { capture } = await createTestCapture("summary@example.com");

    const updated = await updateCaptureSummary(
      capture.id,
      "This is the generated summary.",
    );

    expect(updated).toMatchObject({
      id: capture.id,
      summary: "This is the generated summary.",
    });
  });
});
