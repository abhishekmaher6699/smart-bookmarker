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

import { enrichCapture } from "./enrichment.service.js";

export async function createCapture(userId: string, input: CreateCaptureInput) {
  const existingCapture = await findCaptureByUrl(userId, input.url);

  if (existingCapture) {
    if (existingCapture.enrichment_status === "failed") {
      enrichCapture(existingCapture.id, userId, input.url).catch((error) => {
        console.error(
          `Capture enrichment retry failed for ${existingCapture.id}:`,
          error,
        );
      });
    }

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

  // Don't await this.
  enrichCapture(capture.id, userId, input.url).catch((error) => {
    console.error(`Capture enrichment failed for ${capture.id}:`, error);
  });

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
