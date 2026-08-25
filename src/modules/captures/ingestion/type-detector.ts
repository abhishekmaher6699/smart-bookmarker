export type CaptureType =
    | "article"
    | "pdf"
    | "video"
    | "github"
    | "image";


export function detectTypeFromContentType(
    contentType: string | null
): CaptureType | null {

    if (!contentType) {return null}

    const type = contentType.split(";")[0]?.trim().toLowerCase()    
    if (!type) {return null;}

    if (type === "application/pdf") {
       return "pdf";
    }
 
    if (type.startsWith("image/")) {
        return "image";
    }

    if (type.startsWith("video/")) {
        return "video";
    }
    return null;   
}

export function detectTypeFromUrl(
    url: string,
): CaptureType | null {
    const hostname = new URL(url).hostname.toLowerCase();

    if (
        hostname === "github.com" ||
        hostname.endsWith(".github.com")
    ) {
        return "github";
    }

    return null;
}

export function detectTypeFromMetadata(
    ogType: string | null,
): CaptureType | null {
    if (!ogType) {
        return null;
    }

    const type = ogType.toLowerCase();

    if (type.startsWith("video")) {
        return "video";
    }

    if (type === "article") {
        return "article";
    }

    return null;
}

export function detectType(
    url: string,
    contentType: string | null,
    ogType: string | null,
): CaptureType | null {
    const mimeType = detectTypeFromContentType(contentType);

    if (mimeType) {
        return mimeType;
    }

    const urlType = detectTypeFromUrl(url);

    if (urlType) {
        return urlType;
    }

    const metadataType = detectTypeFromMetadata(ogType);

    if (metadataType) {
        return metadataType;
    }

    const normalizedContentType =
        contentType?.split(";")[0]?.trim().toLowerCase();

    if (normalizedContentType === "text/html") {
        return "article";
    }

    return null;
}