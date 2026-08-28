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
import { insertBrowserSource } from "./capture-source.repository.js";

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

    if (input.browserData) {
      await insertBrowserSource(
        {
          captureId: capture.id,
          html: input.browserData.html,
          title: input.browserData.title,
          type: input.browserData.type,
          content: input.browserData.content,
          description: input.browserData.description,
          thumbnailUrl: input.browserData.thumbnailUrl,
          selectedText: input.browserData.selectedText,
        },
        client,
      );
    }

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
    sort,
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
