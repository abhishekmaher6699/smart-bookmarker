import type { ParsedMetadata } from "./metadata-parser.js";

export type NormalizedMetadata = {
    title: string | null;
    description: string | null;
    imageUrl: string | null;
    canonicalUrl: string | null;
};

export function normalizeMetadata(metadata: ParsedMetadata): NormalizedMetadata {
    
    return {
        title: metadata.ogTitle ?? metadata.title,
        description: metadata.ogDescription ?? metadata.description,
        imageUrl: metadata.ogImage,
        canonicalUrl: metadata.canonicalUrl,
    };
    
}