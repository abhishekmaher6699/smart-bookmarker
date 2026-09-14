import {
  ingestUrl,
  ingestHtml,
  createBrowserMetadata,
} from "../ingestion/ingestion.service.js";

import { categorizeBookmark } from "../../../integrations/gemini/bookmark-categorizer.js";
import { summarizeCapture } from "../../../integrations/gemini/summarizer.js";
import { logger } from "../../../utils/logger.js";

import {
  getOrCreateCategory,
  getCategories,
} from "../../categories/category.service.js";

import {
  updateCaptureEnrichment,
  updateCaptureSummary,
} from "./enrichment.repository.js";

import { findBrowserSource } from "../capture-source.repository.js";

import { findCaptureForEnrichment } from "../capture.repository.js";
import { upsertSearchDocument } from "../../search/search-doc.repository.js";




export async function runIngestionJob(
  captureId: string,
  url: string,
) {
  const browserSource = await findBrowserSource(captureId);

  const hasBrowserContent = Boolean(browserSource?.content?.trim());
  const hasBrowserHtml = Boolean(browserSource?.html?.trim());

  let metadata;

  if (browserSource && hasBrowserHtml && hasBrowserContent) {
    logger.info("Using browser HTML", {
      captureId,
      contentLength: browserSource.content?.length ?? 0,
    });

    metadata = ingestHtml(browserSource.html, url);

    metadata = {
      ...metadata,
      title: browserSource.title ?? metadata.title,
      description: browserSource.description ?? metadata.description,
      imageUrl: browserSource.thumbnail_url ?? metadata.imageUrl,
      content: browserSource.content ?? metadata.content,
    };
  } else if (browserSource && hasBrowserContent) {
    logger.info("Using browser-extracted data", {
      captureId,
      contentLength: browserSource.content?.length ?? 0,
    });

    metadata = createBrowserMetadata(url, browserSource);
  } else {
    logger.info(
      "Browser data unavailable or unusable, falling back to URL ingestion",
      { captureId },
    );

    metadata = await ingestUrl(url);
  }

  logger.info("Capture ingestion complete", {
    captureId,
    title: metadata.title,
    type: metadata.type,
  });

  await updateCaptureEnrichment(captureId, {
    title: metadata.title ?? null,
    type: metadata.type ?? null,
    description: metadata.description ?? null,
    thumbnailUrl: metadata.imageUrl ?? null,

    // Images don't need textual content.
    content:
      metadata.type === "image"
        ? null
        : metadata.content ?? null,

    categoryId: null,
    tags: null,
  });

  return {
    type: metadata.type,
    requiresAiEnrichment: metadata.type !== "image",
  };
}



export async function runCategorizationJob(
  captureId: string,
  userId: string,
) {
  const capture = await findCaptureForEnrichment(captureId);

  if (!capture) {
    throw new Error(`Capture ${captureId} not found`);
  }

  logger.info("Starting capture categorization", {
    captureId,
  });

  const existingCategories = await getCategories(userId);

  logger.info("Loaded categories for categorization", {
    captureId,
    categoryCount: existingCategories.length,
  });

  const categorization = await categorizeBookmark({
    title: capture.title ?? null,
    description: capture.description ?? null,
    type: capture.type ?? null,
    content: capture.content ?? null,
    categories: existingCategories.map(
      (category) => category.name,
    ),
  });

  logger.info("Capture categorized", {
    captureId,
    category: categorization.category,
    tags: categorization.tags,
  });

  const category = await getOrCreateCategory(
    userId,
    categorization.category.trim(),
  );

  const tags = [
    ...new Set(
      categorization.tags
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, 5);

  const updated = await updateCaptureEnrichment(captureId, {
    title: capture.title ?? null,
    type: capture.type ?? null,
    description: capture.description ?? null,
    thumbnailUrl: capture.thumbnail_url ?? null,
    content: capture.content ?? null,
    categoryId: category.id,
    tags,
  });
  await upsertSearchDocument(captureId);

  logger.info("Capture categorization complete", {
    captureId,
    categoryId: category.id,
    category: category.name,
  });

  return updated;

}



export async function runSummaryJob(
  captureId: string,
) {
  const capture = await findCaptureForEnrichment(captureId);

  if (!capture) {
    throw new Error(`Capture ${captureId} not found`);
  }

  logger.info("Starting capture summarization", {
    captureId,
  });

  const summary = await summarizeCapture({
    title: capture.title ?? null,
    content: capture.content ?? null,
  });

  const updated = await updateCaptureSummary(
    captureId,
    summary,
  );

  logger.info("Capture summary complete", {
    captureId,
  });

  return updated;
}