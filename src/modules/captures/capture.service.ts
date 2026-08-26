import {
  insertCapture,
  findCapturesByUser,
  findCaptureById,
  updateCaptureById,
  deleteCaptureById,
  findCaptureByUrl,
} from "./capture.repository.js";
import type {
  CreateCaptureInput,
  UpdateCaptureInput,
} from "./capture.schema.js";
import {
  createEnrichmentJob,
  retryFailedEnrichmentJob,
} from "./enrichment/enrichment-job.repository.js";
import { pool } from "../../db/client.js";

export async function createCapture(userId: string, input: CreateCaptureInput) {
  const existingCapture = await findCaptureByUrl(userId, input.url);

  if (existingCapture) {
    return existingCapture;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const capture = await insertCapture(
      {
        userID: userId,
        url: input.url,
        title: input.title ?? null,
        type: input.type ?? null,
        categoryId: null,
        tags: null,
        description: null,
        thumbnailUrl: null,
        content: null,
      },
      client,
    );

    await createEnrichmentJob(capture.id, client);

    await client.query("COMMIT");

    return capture;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listCapturesByUser(
  userId: string,
  limit: number,
  offset: number,
  categoryIds?: string[],
  search?: string,
  type?: string,
  tag?: string,
  sort: "newest" | "oldest" = "newest",
) {
  return findCapturesByUser(
    userId,
    limit,
    offset,
    categoryIds,
    search,
    type,
    tag,
    sort
  );
}

export async function getCaptureById(captureId: string, userId: string) {
  return findCaptureById(captureId, userId);
}

export async function retryCaptureEnrichment(
  captureId: string,
  userId: string,
) {
  const capture = await findCaptureById(captureId, userId);

  if (!capture) {
    return { status: "not_found" as const };
  }

  const job = await retryFailedEnrichmentJob(captureId);

  if (!job) {
    return { status: "not_retryable" as const };
  }

  return { status: "queued" as const, job };
}

export async function updateCapture(
  captureId: string,
  userId: string,
  input: UpdateCaptureInput,
) {
  return updateCaptureById(captureId, userId, input);
}

export async function deleteCapture(captureId: string, userId: string) {
  return deleteCaptureById(captureId, userId);
}
