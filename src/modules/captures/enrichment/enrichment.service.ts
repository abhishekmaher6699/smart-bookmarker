import { ingestUrl } from "../ingestion/ingestion.service.js";

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






export async function enrichCapture(
    captureId: string,
    userId: string,
    url: string,
) {

    
    const metadata = await ingestUrl(url);

    logger.info("Capture ingestion complete", {
        captureId,
        title: metadata.title,
        type: metadata.type,
    });

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

    let updated = await updateCaptureEnrichment(
        captureId,
        {
            title: metadata.title ?? null,
            type: metadata.type ?? null,
            description: metadata.description ?? null,
            thumbnailUrl: metadata.imageUrl ?? null,
            content: metadata.content ?? null,
            categoryId: category.id,
            tags,
        },
    );

    // Summary is secondary.
    try {
        const summary = await summarizeCapture({
            title: metadata.title ?? null,
            content: metadata.content ?? null,
        });

        const summaryUpdated =
            await updateCaptureSummary(
                captureId,
                summary,
            );

        if (summaryUpdated) {
            updated = summaryUpdated;
        }
    } catch (error) {
        logger.warn("Summary generation failed", {
            captureId,
            error: error instanceof Error ? error.message : String(error),
        });
    }

    logger.info("Capture enrichment complete", { captureId });

    return updated;
}
