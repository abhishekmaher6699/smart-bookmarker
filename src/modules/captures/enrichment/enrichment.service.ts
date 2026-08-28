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

export async function enrichCapture(
  captureId: string,
  userId: string,
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

  
  if (metadata.type === "image") {
    logger.info("Image capture requires no enrichment", {
      captureId,
    });

    return await updateCaptureEnrichment(captureId, {
      title: metadata.title ?? null,
      type: metadata.type,
      description: metadata.description ?? null,
      thumbnailUrl: metadata.imageUrl ?? null,
      content: null,
      categoryId: null,
      tags: null,
    });
  }

  const existingCategories = await getCategories(userId);

  logger.info("Loaded categories for enrichment", {
    captureId,
    categoryCount: existingCategories.length,
  });

  const categorization = await categorizeBookmark({
    title: metadata.title ?? null,
    description: metadata.description ?? null,
    type: metadata.type ?? null,
    content: metadata.content ?? null,
    categories: existingCategories.map((category) => category.name),
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

  logger.info("Category assigned to capture", {
    captureId,
    categoryId: category.id,
    category: category.name,
  });

  const tags = [
    ...new Set(
      categorization.tags
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, 5);

  let updated = await updateCaptureEnrichment(captureId, {
    title: metadata.title ?? null,
    type: metadata.type ?? null,
    description: metadata.description ?? null,
    thumbnailUrl: metadata.imageUrl ?? null,
    content: metadata.content ?? null,
    categoryId: category.id,
    tags,
  });

  // Summary is secondary.
  try {
    const summary = await summarizeCapture({
      title: metadata.title ?? null,

      content: metadata.content ?? null,
    });

    const summaryUpdated = await updateCaptureSummary(captureId, summary);

    if (summaryUpdated) {
      updated = summaryUpdated;
    }
  } catch (error) {
    logger.warn("Summary generation failed", {
      captureId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  logger.info("Capture enrichment complete", {
    captureId,
  });

  return updated;
}
