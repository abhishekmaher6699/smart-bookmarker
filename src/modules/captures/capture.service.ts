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
  createEnrichmentJob
} from "./enrichment-job.repository.js";

export async function createCapture(userId: string, input: CreateCaptureInput) {
  const existingCapture = await findCaptureByUrl(userId, input.url);

  if (existingCapture) {
    return existingCapture;
  }

  const capture = await insertCapture({
    userID: userId,
    url: input.url,
    title: input.title ?? null,
    type: input.type ?? null,
    categoryId: null,
    tags: null,
    description: null,
    thumbnailUrl: null,
    content: null,
  });

  await createEnrichmentJob(capture.id)

  return capture;
}

export async function listCapturesByUser(
  userId: string,
  limit: number,
  offset: number,
  categoryIds?: string[],
) {
  return findCapturesByUser(userId, limit, offset, categoryIds);
}

export async function getCaptureById(captureId: string, userId: string) {
  return findCaptureById(captureId, userId);
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
