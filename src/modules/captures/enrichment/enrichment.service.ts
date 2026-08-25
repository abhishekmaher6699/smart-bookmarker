import { ingestUrl } from "../ingestion/ingestion.service.js";

import { categorizeBookmark } from "../../../integrations/gemini/bookmark-categorizer.js";
import { summarizeCapture } from "../../../integrations/gemini/summarizer.js";

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

    console.log("🟢 Ingestion complete:", {
        captureId,
        title: metadata.title,
        type: metadata.type,
    });

    const existingCategories = await getCategories(userId);

    console.log(
        "🟢 Categories:",
        existingCategories,
    );

    const categorization = await categorizeBookmark({
        title: metadata.title ?? null,
        description: metadata.description ?? null,
        type: metadata.type ?? null,
        content: metadata.content ?? null,
        categories: existingCategories.map(
            (category) => category.name,
        ),
    });

    console.log(
        "🟢 Categorization:",
        categorization,
    );

    const category = await getOrCreateCategory(
        userId,
        categorization.category.trim(),
    );

    console.log(
        "🟢 Category:",
        category,
    );

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
        console.warn(
            `Summary generation failed for ${captureId}:`,
            error,
        );
    }

    console.log(
        "🟢 Enrichment complete:",
        captureId,
    );

    return updated;
}
