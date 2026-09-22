import { AppError } from "../../../errors/app-error.js";

export function validateUrl(rawUrl: string): URL {
    let url: URL;

    try {
        url = new URL(rawUrl);
    } catch {
        throw new AppError(400, "Invalid url");
    }

    if (
        url.protocol !== "http:" &&
        url.protocol !== "https:"
    ) {
        throw new AppError(400, "Only HTTP and HTTPS URLs are allowed");
    }

    return url;
}